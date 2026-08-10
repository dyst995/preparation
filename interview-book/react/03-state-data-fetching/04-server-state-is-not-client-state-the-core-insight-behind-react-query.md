# 04. Server state is not client state - the core insight behind React Query

> Source: `interview-prep/react/03-state-data-fetching.md`

### Why server state is fundamentally different

Client state (a modal being open, a form field's current value) is state **you own outright** - your app is the single source of truth, and it's synchronous and instantly "correct" the moment you set it.

Server state is **borrowed** - your app has a *copy* of something the server owns, and that copy can be:
- **Stale** the moment you receive it (another client, or a background job, might change it a second later).
- **Asynchronous to fetch**, with pending/error states that need consistent handling.
- **Shared** - the same data (e.g., "current user's profile") may be needed by many unrelated components, and re-fetching it independently in each is wasteful and can produce inconsistent views if requests race.
- In need of **background revalidation** - refetch on window refocus, on reconnect, on interval, or when you know it changed (e.g., after a mutation).

### What happens if you manage server state with plain `useState` + `useEffect` (the anti-pattern)

```jsx
// The "naive fetch" anti-pattern - reimplemented ad hoc in every component that needs data.
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/users/${userId}`)
      .then(res => res.json())
      .then(data => { if (!cancelled) { setUser(data); setLoading(false); } })
      .catch(err => { if (!cancelled) { setError(err); setLoading(false); } });
    return () => { cancelled = true; };  // guards against race conditions on fast userId changes
  }, [userId]);

  // ...
}
```

Problems this accumulates at scale:
- **No caching** - navigating away and back refetches from scratch every time, even if the data hasn't changed and was just fetched seconds ago.
- **No deduplication** - two components needing the same `userId` both fire independent requests.
- **No shared cache invalidation** - after a mutation (e.g., editing the profile), every component with a stale copy must be manually told to refetch.
- **Re-implementing race-condition guards, loading/error state, retry logic, and refetch-on-focus by hand, in every component** - this is exactly the boilerplate React Query eliminates.

### What React Query actually provides

React Query treats server state as a **cache keyed by query key**, with a background synchronization engine on top.

| Concept | What it means |
|---|---|
| **Query key** | An array (e.g., `['user', userId]`) that uniquely identifies a piece of cached server data - changing any part of the key is treated as "a different query" |
| **`staleTime`** | How long fetched data is considered "fresh" - within this window, refetches are skipped and cached data is served immediately |
| **`gcTime`/`cacheTime`** | How long *unused* (no active observers) cached data stays in memory before being garbage collected |
| **Background refetching** | Automatic refetch on window refocus, network reconnect, or a configured interval - keeps data eventually consistent without manual polling code |
| **Deduplication** | Multiple components calling `useQuery` with the same key share one in-flight request and one cache entry |
| **`isLoading` vs `isFetching`** | `isLoading` = no data yet at all (first fetch); `isFetching` = a fetch is happening right now, even if stale data is already being shown (background refetch) |
| **Mutations (`useMutation`)** | Encapsulate a write operation (POST/PUT/DELETE) with `onSuccess`/`onError`/`onSettled` hooks, typically used to invalidate or update related query cache entries afterward |
| **Invalidation** | `queryClient.invalidateQueries(['user', userId])` marks matching cached entries as stale, triggering a refetch for any currently-mounted observers |
| **Optimistic updates** | Update the cache immediately (before the server confirms) for instant UI feedback, with a rollback path if the mutation fails |

### Example: replacing the naive fetch with React Query

```jsx
function UserProfile({ userId }) {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetch(`/api/users/${userId}`).then(res => res.json()),
    staleTime: 60_000,   // treat as fresh for 1 minute - no refetch on remount within that window
  });

  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;
  return <ProfileView user={user} />;
}
```

Every concern from the naive version - dedup, caching, race conditions, loading/error state - is handled by the library, and any other component in the app calling `useQuery(['user', userId])` shares the same cache entry automatically.

### Example: mutation with cache invalidation

```jsx
function EditProfileForm({ userId }) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (updates) => fetch(`/api/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', userId] });  // triggers refetch of fresh data
    },
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(formData); }}>
      {/* ... */}
      <button disabled={mutation.isPending}>{mutation.isPending ? 'Saving...' : 'Save'}</button>
    </form>
  );
}
```

### Example: optimistic update

```jsx
const mutation = useMutation({
  mutationFn: updateTodo,
  onMutate: async (newTodo) => {
    await queryClient.cancelQueries({ queryKey: ['todos'] });
    const previousTodos = queryClient.getQueryData(['todos']);
    queryClient.setQueryData(['todos'], (old) =>
      old.map(t => t.id === newTodo.id ? newTodo : t)
    );
    return { previousTodos };   // context passed to onError for rollback
  },
  onError: (err, newTodo, context) => {
    queryClient.setQueryData(['todos'], context.previousTodos);   // rollback on failure
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['todos'] });   // reconcile with server truth either way
  },
});
```

### Interview question

**Q: Why not just put API responses into Redux/Zustand state?**

> "You *can*, but you end up manually rebuilding everything React Query gives you for free: cache keys, staleness rules, deduplication of concurrent requests for the same resource, background refetch on focus/reconnect, race-condition-safe request cancellation, and invalidation after mutations. Redux and Zustand are excellent for state your app owns and controls synchronously - they don't have an opinion about network lifecycle. Mixing concerns by hand-rolling server-state caching in a client-state store usually means reinventing React Query poorly. My default is: server data goes in React Query; genuinely client-owned data goes in Redux/Zustand."

**Follow-up: Isn't this over-engineering - why not one library for everything?**

> "It would be over-engineering if server state and client state had the same requirements, but they don't - server state needs caching, staleness, and background sync; client state needs none of that but does need synchronous, predictable updates. Using React Query for server state and Zustand/Redux for client state isn't three overlapping tools, it's the right tool for two genuinely different problems, and it actually *reduces* code versus reimplementing fetch lifecycle management inside a general-purpose store."

---
