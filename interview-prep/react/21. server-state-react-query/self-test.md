# Server State Is Not Client State — React Query — Self-test

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
