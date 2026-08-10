# 09. Hands-on drills (do these)

> Source: `interview-prep/react/03-state-data-fetching.md`

- [ ] Build the "naive fetch" `useEffect` + `useState` data-fetching anti-pattern, deliberately trigger a race condition (fast-changing `userId` prop with variable-latency mock fetches), then replace it with `useQuery` and show the race condition is gone for free.
- [ ] Build a Context-based theme + user provider with a single combined value object; add a render counter to a component that only reads `theme`; change `user` and observe the unnecessary re-render; fix it by splitting into two contexts.
- [ ] Build the same shared state (e.g., sidebar open + filters) with Zustand using per-field selectors; add render counters to prove only the relevant component re-renders per field change.
- [ ] Write a `createSlice` with `createAsyncThunk` for a fetch-user flow, including pending/fulfilled/rejected cases; log the resulting actions in Redux DevTools.
- [ ] Implement an optimistic `useMutation` for toggling a todo's completed state, including rollback on a simulated failure.
- [ ] Write `createSelector` for a filtered+sorted list and prove (via a render counter) that recomputation only happens when the actual inputs change, not on unrelated store updates.

---
