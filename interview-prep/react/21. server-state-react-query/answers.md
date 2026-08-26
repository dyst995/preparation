# Server State Is Not Client State — React Query — Answers

## Core recall

1. Client: you own it, sync, instantly correct. Server: borrowed copy — stale, async, shared, needs revalidation.  
2. No cache, no dedupe, no shared invalidation, hand-rolled races/loading/retry/refocus.  
3. Array (etc.) that uniquely identifies a cache entry / query.  
4. **`staleTime`:** freshness before refetch. **`gcTime`:** how long unused entries stay in memory.  
5. Same key shares one in-flight request and one cache entry.  
6. **`isLoading`:** no data yet (initial). **`isFetching`:** a fetch is running (maybe with existing data).  
7. Marks matching queries stale and refetches active observers.  
8. Cancel queries → snapshot → `setQueryData` → onError rollback → onSettled invalidate.

## Explain why

1. Server is source of truth; client cache can be wrong any time.  
2. Different timings / races → different data on screen for the “same” resource.  
3. Redux doesn’t give staleness/dedupe/refetch/invalidation policies for free.  
4. Different ids are different resources — must be different cache entries.  
5. Cache must learn the server changed (or apply the new data) so readers update.  
6. Two different problem domains; splitting tools usually deletes boilerplate, not adds ceremony.

## Compare and contrast

1. Owned sync UI vs borrowed remote data.  
2. **RQ:** server cache engine. **Redux:** client domain store (unless you rebuild cache).  
3. Freshness vs garbage collection of unused entries.  
4. **Invalidate:** refetch truth. **Optimistic set:** instant UI, then reconcile.  
5. Manual `cancelled` flags per component vs library-wide race/cache handling.  
6. **Query:** read/cache. **Mutation:** write + sync cache afterward.

## Predict the behavior

1. **Typically no** refetch if still fresh (within `staleTime`).  
2. **One** (deduped).  
3. Active queries refetch → UI updates to fresh data.  
4. Rolled back to `previousTodos` (then settled invalidate may refetch).

## Debugging

1. Race: older response wins — need cancel/ignore (RQ handles; naive needs `cancelled`).  
2. Didn’t invalidate (or update) `['user', id]` / header query key.  
3. Raise `staleTime` or disable/configure `refetchOnWindowFocus`.  
4. Put filters in the key: `['products', { status, page }]`.  
5. Duplicating server state into a client store — drop the mirror; read RQ.

## Application

1.
```jsx
useQuery({
  queryKey: ['posts', postId],
  queryFn: () => fetch(`/api/posts/${postId}`).then((r) => r.json()),
});
```

2.
```jsx
useMutation({
  mutationFn: createPost,
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['posts'] }),
});
```

3. onMutate patch todo → onError restore → onSettled invalidate `['todos']`.  
4. Remote/cached/shared → RQ; modal/input/theme-like → client state tools.  
5. e.g. `['todos', { status, page }]`.

## Interview questions

1. **Spoken:** You’d rebuild RQ features by hand; Redux/Zustand aren’t network caches. Server → RQ; client → those stores.  
   **Follow-ups:** Different requirements → two tools reduce code vs one overloaded store.

2. **Spoken:** Borrowed, stale-able, async, shared, needs revalidation — not like a boolean you set.

3. **Spoken:** Keys identify cache entries; `staleTime` defines freshness window before background/mount refetch.

4. **Spoken:** After write, invalidate (or update) related keys so observers refetch/show new data.

5. **Spoken:** Snapshot → optimistic cache write → rollback on error → invalidate to sync with server.

## Connections

1. Operationalizes the server-state row of the four-kinds table.  
2. Naive effect fetch is the anti-pattern RQ productizes.  
3. `mutate` in submit handler; cache sync in mutation callbacks — event vs effect model.  
4. Context sharing one `user` state still lacks cache policy; RQ shares by key with sync rules.  
5. One cache entry → same data for all observers → fewer divergent sibling UIs.
