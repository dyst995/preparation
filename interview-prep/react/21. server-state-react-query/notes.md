# Server State Is Not Client State — React Query

## What you need to know

**Client state** — you own it; set it and it’s correct now (modal open, input text).

**Server state** — you hold a **borrowed copy** of data the server owns. That copy can be stale, async, shared, and in need of background sync.

**TanStack Query (React Query)** is a **cache + synchronization engine** keyed by **query keys** — not a general client store. Default: **server data → React Query**; **client-owned data → useState / Context / Zustand / Redux**.

Prerequisites: [four kinds of state](../18.%20four-kinds-of-state/notes.md), [useEffect](../12.%20useeffect/notes.md) (naive fetch), [effects vs events](../14.%20effects-vs-events/notes.md) (mutations often in handlers).

---

## Why server state is fundamentally different (preserved)

Server state copies can be:

| Property | Meaning |
| --- | --- |
| **Stale** | Wrong a moment after fetch (other clients, jobs, admins) |
| **Async** | Pending / error / success need consistent UX |
| **Shared** | Many components need the same resource; independent fetches waste work and race |
| **Revalidatable** | Refetch on focus, reconnect, interval, or after you know it changed (mutation) |

Client state needs none of that machinery — which is why stuffing `/users` into Redux forces you to rebuild it by hand.

---

## The naive `useState` + `useEffect` anti-pattern (preserved)

```jsx
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/users/${userId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setUser(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);
}
```

At scale you re-implement:

- **No caching** — remount refetches even if data is seconds old  
- **No dedupe** — two components → two requests for the same id  
- **No shared invalidation** — after PATCH, every stale copy needs a manual nudge  
- **Race guards, retries, refetch-on-focus** copied everywhere  

That boilerplate **is** React Query’s product.

---

## What React Query provides (preserved table)

| Concept | Meaning |
| --- | --- |
| **Query key** | Array identity for a cache entry, e.g. `['user', userId]` — change a part → different query |
| **`staleTime`** | How long data is **fresh** (no refetch; serve cache) |
| **`gcTime`** (formerly `cacheTime`) | How long **unused** cache (no observers) stays before GC |
| **Background refetch** | Refocus, reconnect, interval — eventual consistency without hand-rolled polls |
| **Deduplication** | Same key → one in-flight request + one cache entry |
| **`isLoading` vs `isFetching`** | No data yet vs a fetch in progress (maybe showing stale data) |
| **`useMutation`** | Writes with lifecycle callbacks; usually invalidate/update cache after |
| **Invalidation** | Mark queries stale → refetch active observers |
| **Optimistic updates** | Update cache before server confirms; rollback on error |

Mental model:

```text
queryKey → cache entry
observers (useQuery) ←→ sync engine (fetch / refetch / invalidate)
mutations → invalidate or setQueryData
```

---

## Example: `useQuery` (preserved)

```jsx
function UserProfile({ userId }) {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetch(`/api/users/${userId}`).then((res) => res.json()),
    staleTime: 60_000,
  });

  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;
  return <ProfileView user={user} />;
}
```

Any other `useQuery({ queryKey: ['user', userId], … })` shares the cache. Race handling and caching are library concerns.

**Query key design:** include every variable the fetch depends on (`['todos', { status, page }]`); keep keys stable and serializable.

---

## Example: mutation + invalidation (preserved)

```jsx
function EditProfileForm({ userId }) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (updates) =>
      fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate(formData);
      }}
    >
      <button disabled={mutation.isPending}>
        {mutation.isPending ? 'Saving...' : 'Save'}
      </button>
    </form>
  );
}
```

Write stays in the **submit handler** (`mutate`); RQ manages cache sync after. Fits [effects vs events](../14.%20effects-vs-events/notes.md).

---

## Example: optimistic update (preserved)

```jsx
const mutation = useMutation({
  mutationFn: updateTodo,
  onMutate: async (newTodo) => {
    await queryClient.cancelQueries({ queryKey: ['todos'] });
    const previousTodos = queryClient.getQueryData(['todos']);
    queryClient.setQueryData(['todos'], (old) =>
      old.map((t) => (t.id === newTodo.id ? newTodo : t)),
    );
    return { previousTodos };
  },
  onError: (_err, _newTodo, context) => {
    queryClient.setQueryData(['todos'], context.previousTodos);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['todos'] });
  },
});
```

Flow: snapshot → patch cache → on failure restore → always revalidate to match server.

---

## `staleTime` vs `gcTime` (don’t conflate)

| | Controls |
| --- | --- |
| **`staleTime`** | When data becomes **stale** (eligible to refetch) |
| **`gcTime`** | When **unused** cache entries are **thrown away** |

Fresh → show cache, skip refetch. Stale but present → can show data **and** `isFetching` in background. GC’d → next mount behaves like cold cache.

---

## Why not Redux/Zustand for API data? (preserved)

You *can* — then you rebuild: keys, staleness, dedupe, refetch-on-focus, cancellation, invalidation. Those libraries excel at **synchronous client-owned** state; they don’t own network lifecycle.

**Follow-up — isn’t two libraries overkill?**

> Only if server and client state had the same requirements. They don’t. RQ + Zustand/Redux is two tools for two problems, usually **less** code than fake-caching inside a client store.

---

## Common mistakes and misconceptions

1. Duplicating RQ cache into Redux “so we have one store.”  
2. Query keys missing variables → wrong cache hits / missed refetches.  
3. `staleTime: 0` everywhere → refetch thrash (defaults may be aggressive; tune intentionally).  
4. Confusing `isLoading` with `isFetching`.  
5. Putting POST in a `useEffect` on a flag instead of `mutate` in a handler.  
6. Optimistic updates without rollback / cancel in-flight queries.  
7. Using RQ for pure client UI flags.

---

## Connections to other concepts

```
four kinds → server state
  → React Query

naive useEffect fetch
  → races, no cache → RQ replaces

mutation in handler
  → invalidateQueries

client store (Zustand/Redux)
  → not a substitute for server cache

dedupe / shared key
  → consistent views across the tree
```

---

## Interview perspective

Be ready to:

1. Contrast client vs server state.  
2. List naive-fetch failure modes.  
3. Explain query key, staleTime, invalidation, optimistic updates.  
4. Defend RQ + client store instead of “API in Redux.”  
5. Distinguish `isLoading` / `isFetching`.

---

# Self-test

## Core recall

1. How does server state differ from client state?
2. Name four problems with naive `useState`+`useEffect` fetch at scale.
3. What is a query key?
4. What is `staleTime` vs `gcTime`?
5. What is request deduplication in RQ?
6. `isLoading` vs `isFetching`?
7. What does `invalidateQueries` do?
8. What are the steps of a typical optimistic update?

## Explain why

1. Why is a server copy “borrowed”?
2. Why do two components fetching the same user without a shared cache cause inconsistency risk?
3. Why isn’t putting `users` in Redux enough?
4. Why include `userId` in the query key?
5. Why invalidate (or setQueryData) after a mutation?
6. Why is RQ + Zustand not automatically over-engineering?

## Compare and contrast

1. Client state vs server state  
2. React Query vs Redux for API lists  
3. `staleTime` vs `gcTime`  
4. Invalidation vs optimistic `setQueryData`  
5. Naive cancelled fetch flag vs RQ  
6. `useQuery` vs `useMutation`  

## Predict the behavior

1. `staleTime: 60_000`; remount same key after 10s — network refetch?  
2. Two mounts with `['user', 1]` at once — how many network requests typically?  
3. After PATCH, `invalidateQueries(['user', id])` with an active observer — what happens?  
4. Optimistic update fails — what should UI show if rollback is implemented?

## Debugging

1. UI shows user A after fast navigation to user B (naive fetch). Cause?  
2. Profile edit saves but header still shows old name. Missing piece?  
3. Every window focus hammering the API. What to tune?  
4. Cache hit for wrong filters because key was only `['products']`. Fix?  
5. Team syncs RQ data into Zustand on every success. Smell?

## Application

1. Write a `useQuery` for `['posts', postId]`.  
2. Write a `useMutation` that invalidates `['posts']` on success.  
3. Sketch optimistic toggle for a todo’s `done` with rollback.  
4. Explain to a junior when to use RQ vs `useState`.  
5. Design query keys for paginated `status` + `page` todo list.

## Interview questions

1. Why not put API responses in Redux/Zustand?  
   **Follow-ups:** Over-engineering to use two libraries?

2. What makes server state different from client state?

3. Explain query keys and `staleTime`.

4. How do mutations and invalidation keep the UI consistent?

5. Walk through an optimistic update and failure path.

## Connections

1. How does this complete the “server state” bucket in four-kinds?
2. How does the naive pattern misuse effects for data sync (and what RQ replaces)?
3. How do mutations belong in event handlers while still updating server cache?
4. How does shared query cache differ from Context sharing a fetched `user`?
5. How does dedupe relate to avoiding inconsistent sibling views?
