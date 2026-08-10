# 08. Interview question bank (state & data fetching)

> Source: `interview-prep/react/03-state-data-fetching.md`

1. **How do you classify a new piece of state before deciding where it lives?**
2. **Why is server state fundamentally different from client state?**
3. **Walk me through what goes wrong if you manage server data with `useState` + `useEffect` at scale.**
4. **Explain `staleTime` vs `gcTime` (cache time) in React Query.**
5. **How does React Query prevent duplicate network requests for the same data?**
6. **What is an optimistic update, and how do you roll it back on failure?**
7. **Why does Context re-render every consumer on any value change, and how do you mitigate it?**
8. **How does Zustand achieve selective re-rendering without a Provider?**
9. **What does Immer let you do inside `createSlice`, and why is it still safe/immutable underneath?**
10. **When would you choose Redux Toolkit over Zustand for a new feature?**
11. **What is `createSelector`/Reselect for, and what problem does memoized selection solve?**
12. **RTK Query vs React Query - what's the actual difference in philosophy?**
13. **Why might putting fetched API data directly into Redux/Zustand be an anti-pattern?**
14. **When is prop drilling actually fine, and when does it become a real problem?**
15. **How would you architect state for a dashboard with: user session, a data table with filters/sort/pagination, and a live list of products fetched from an API?** (Model answer: session -> Redux (or Context if simple/rare), filters/sort/pagination -> Zustand or local state depending on scope, products -> React Query keyed by the filter/sort/pagination params so changing them naturally produces a new cached query.)

---
