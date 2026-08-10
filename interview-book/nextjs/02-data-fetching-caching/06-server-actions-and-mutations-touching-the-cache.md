# 06. Server Actions and mutations touching the cache

> Source: `interview-prep/nextjs/02-data-fetching-caching.md`

*(Full auth/Route Handler treatment is in chapter 03 - this section is specifically the caching angle.)*

### Topics to learn

- [ ] A Server Action that mutates data should call `revalidatePath` / `revalidateTag` so the UI reflects the change without a manual refresh
- [ ] `useOptimistic` (React) for instant UI feedback on the client while a Server Action is in flight
- [ ] `router.refresh()` forces the current route's Server Components to re-render/re-fetch fresh data without a full page reload or losing client state that lives above it

### Interview question

**Q: A manager marks a delivery as "completed" in the dashboard. Walk through the data flow.**

> "The button triggers a Server Action (or a client mutation hitting a Route Handler/NestJS endpoint). On success, the action calls `revalidateTag('deliveries')` so the Data Cache for that data is invalidated. If I want instant feedback rather than waiting for the round trip, I'd use `useOptimistic` on the client to flip that delivery's status immediately, then reconcile with the server response. If the list is also managed by React Query, I'd instead (or additionally) call `queryClient.invalidateQueries(['deliveries'])` or update the cache optimistically via `setQueryData`."

---
