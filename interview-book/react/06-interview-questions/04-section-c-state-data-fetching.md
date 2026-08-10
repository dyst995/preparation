# 04. Section C - State & Data Fetching

> Source: `interview-prep/react/06-interview-questions.md`

**C1. How do you decide where a new piece of state should live?**
> Classify it first: local-to-one-component -> `useState`; server-owned/fetched data -> React Query regardless of sharing scope; client-only and rarely changing/shared -> Context; client-only and more frequently changing/shared -> Zustand or Redux depending on complexity and team conventions.

**C2. Why is server state fundamentally different from client state?**
> Server state is borrowed, can be stale the instant it arrives, may be updated by other clients, and benefits from background revalidation/caching/deduplication - properties client-owned synchronous state doesn't have. Treating server data like plain client state means hand-rebuilding caching/dedup/staleness logic ad hoc.

**C3. What goes wrong with `useState` + `useEffect` for data fetching at scale?**
> No caching (refetch every mount even if fresh), no deduplication across components needing the same data, manual race-condition guarding, and manual reimplementation of loading/error/retry/refetch-on-focus logic in every component that fetches.

**C4. Explain `staleTime` vs `gcTime`/`cacheTime` in React Query.**
> `staleTime` is how long data is considered fresh - within that window, no refetch happens on remount/refocus. `gcTime` is how long unused (no active observers) cached data is kept in memory before being garbage collected, independent of freshness.

**C5. How does React Query prevent duplicate requests?**
> Requests are deduplicated by query key - multiple components calling `useQuery` with the same key share one in-flight request and one cache entry rather than firing independent network calls.

**C6. What is an optimistic update, and how do you roll it back?**
> Updating the cache immediately with the expected result before the server confirms, for instant UI feedback. In React Query, `onMutate` snapshots the previous cache value and applies the optimistic change; `onError` restores the snapshot if the mutation fails; `onSettled` typically re-invalidates to reconcile with server truth either way.

**C7. Why does Context re-render every consumer on any value change?**
> Context has no built-in selector mechanism - any change to the Provider's `value` reference notifies every consuming component, regardless of which part of that value it actually reads. Mitigations: memoize the value, split into multiple contexts by update frequency/concern, or use a selector-based store (Zustand) for frequently-changing widely-consumed state.

**C8. How does Zustand achieve selective re-rendering without a Provider?**
> Stores live outside React as a plain object; components subscribe via a selector function and only re-render when their specific selected slice changes (built on `useSyncExternalStore` under the hood), and no Provider wrapping is needed since the store is just an importable hook.

**C9. What does Immer let you do inside `createSlice`, and is it actually safe?**
> Write code that looks like direct mutation (`state.field = value`) against a special draft proxy; Immer produces a correctly immutable new state under the hood by recording the changes and applying them structurally. The store's actual state remains immutable - Immer just removes manual spread-boilerplate for deep updates.

**C10. When would you choose Redux Toolkit over Zustand?**
> When the domain is large/cross-cutting with many interacting slices, the team has established Redux conventions, you need strict action-based auditing/logging, deep DevTools time-travel debugging, or a bigger middleware ecosystem - versus Zustand for smaller, feature-scoped shared state without that overhead.

**C11. RTK Query vs React Query - what's the actual difference?**
> Same core problem (server-state caching/sync) with different integration points - RTK Query lives inside the Redux store (server cache visible alongside client state in Redux DevTools), React Query is standalone and state-library-agnostic. Choice often comes down to whether you want server-state logic coupled to Redux or independent of whichever client-state library is in use.

**C12. Why might putting fetched API data directly into Redux/Zustand be an anti-pattern?**
> It reimplements caching, staleness, deduplication, and invalidation by hand inside a general-purpose store not designed for network lifecycle concerns - usually resulting in more code and more bugs (stale data, race conditions) than delegating that responsibility to React Query.

**C13. When is prop drilling actually fine?**
> For 1-2 levels, when it keeps data flow explicit and traceable via simple prop search - often preferable to introducing global state machinery for a narrow, shallow need. It becomes a problem past ~3 levels or when many unrelated branches need the same prop, forcing intermediate components to carry data they don't use.

**C14. Architect state for a dashboard with: user session, a filterable/sortable data table, and a live product list.**
> Session -> Redux (or Context if simple and app-wide but rarely changes) since it's genuinely global and cross-cutting. Table filters/sort/pagination -> Zustand or local component state depending on how widely those controls are shared. Product list -> React Query, with the query key including the current filter/sort/pagination params so changing them naturally produces a distinct, cacheable query.

---
