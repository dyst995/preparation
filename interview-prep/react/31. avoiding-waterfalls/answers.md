# Avoiding Waterfalls — Answers

## Core recall

1. Requests that could run in parallel instead run one after another, often due to mount/render order.  
2. Child hooks don’t run until parent finishes and mounts them — fetch start is delayed.  
3. Network tab: staggered start times (staircase) instead of aligned starts.  
4. Start all independent queries together at a common point (parallel hooks / lift / prefetch).  
5. When a later request needs a value only available from an earlier **response**.  
6. Don’t run the org query until that id exists — real dependency.  
7. Repeated render → fetch → render cycles to discover more needed data for one view.  
8. Parent `prefetchQuery` warms cache so nested hooks don’t wait on mount to *start* the network.

## Explain why

1. Sequential: each waits for the previous; parallel: wall clock ≈ slowest of the set.  
2. `userId` was always available — waiting on `user` data was structure, not need.  
3. Org URL literally requires `organizationId` from user payload.  
4. Spinners are UI; if fetches still start late, staircase remains — must start requests earlier.  
5. Child chunk only downloads after parent renders the lazy child — sequential resource loads.  
6. One RTT + server join can beat three client RTTs even if those three are parallel.

## Compare and contrast

1. **Accidental:** could start with known params. **Necessary:** needs prior response field.  
2. **Request:** network start order. **Render:** multiple discover-and-fetch UI cycles.  
3. **Parent parallel:** all hooks first render. **Mount-gated:** child fetch delayed.  
4. **`enabled`:** query mounted but idle until ready. **Early return:** child not mounted → hook absent.  
5. Both staircase resources; one is JSON/API, one is JS chunks — same timing shape.

## Predict / interpret

1. **No** — parallel starts.  
2. **Accidental** — parallelize.  
3. **Necessary** — keep gated.  
4. Only after user resolves and Profile mounts.

## Debugging

1. Early `if (!data) return <Spinner />` before children with independent queries; nested fetch-on-mount.  
2. Wrong org / 404 / security bug — you didn’t have a real org id.  
3. Lift queries to parent; remove gating early return; prefetch; pass data down.  
4. Bulk details endpoint, or include details in list, or prefetch details as soon as ids exist (parallel), not per-row mount waterfalls.

## Application

1. Same as GOOD example in notes — three `useQuery` in `Page` without waiting to mount Profile/Posts.  
2.
```jsx
const { data: user } = useQuery({ queryKey: ['user', userId], queryFn: () => fetchUser(userId) });
const { data: org } = useQuery({
  queryKey: ['org', user?.organizationId],
  queryFn: () => fetchOrg(user.organizationId),
  enabled: !!user?.organizationId,
});
```

3. Paraphrase preserved interview answer.  
4. `queryClient.prefetchQuery({ queryKey: ['posts', userId], queryFn: () => fetchPosts(userId) })` in route effect/loader/link intent.

## Interview questions

1. **Spoken:** Sequential requests that could be parallel, often from nest+spinner mount order. Spot: Network staircase. Fix: parallelize on known params; use `enabled` only for real deps. Sequential OK when response field required. Render waterfall: repeated render-fetch discovery loops.  
2. **Spoken:** Multiple hooks fire together; `prefetchQuery`; `enabled` for real chains; shared cache.  
3. **Spoken:** Defers mounting children → defers their fetches → accidental waterfall.  
4. **Spoken:** Summed waits feel much slower than parallel max; users stare at chained spinners.

## Connections

1. RQ makes parallel queries and gated dependents explicit instead of ad-hoc mount timing.  
2. Lazy child JS waits on parent the way child JSON waits on parent data — preload/coarser boundaries.  
3. If the id is in the URL/props now, start now — don’t wait for unrelated parent payloads.  
4. Loaders/SSR can start all fetches before hydration/navigation paint so the client never staircases.
