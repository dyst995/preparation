# 10. Senior red flags / green flags

> Source: `interview-prep/react/03-state-data-fetching.md`

### Green flags interviewers love
- Classifying state (local/client-shared/global/server) before naming a tool - shows judgment, not tool-first thinking.
- Precisely explaining *why* React Query exists instead of "it's for fetching data" (staleness, cache, dedup, background sync).
- Knowing Context's all-or-nothing re-render behavior cold, with a concrete mitigation.
- Giving a crisp, non-defensive answer to "why 3 state libraries" that frames it as separation of concerns, not accumulated tech debt.

### Red flags
- Storing fetched API responses directly in Redux/Zustand as the primary pattern, with manual loading/error booleans everywhere.
- "Context is basically Redux" (no - no selectors, no middleware, all-or-nothing re-renders).
- Not knowing the difference between `isLoading` and `isFetching` in React Query.
- Defaulting to Redux for every shared value "because that's what we always use," without being able to justify it against Zustand/Context for the specific case.

---
