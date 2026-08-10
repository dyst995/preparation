# 09. Interview question bank (rendering & reconciliation)

> Source: `interview-prep/react/01-rendering-reconciliation.md`

1. **What is the virtual DOM and why does it exist?**
2. **Walk me through render phase vs commit phase.**
3. **What is Fiber, and what problem did it solve versus the old reconciler?**
4. **What are the two core heuristics that make React's diffing O(n) instead of O(n^3)?**
5. **Why do keys matter in lists? What's the failure mode with index-as-key?**
6. **When is index-as-key actually acceptable?**
7. **What does it mean for a component to be "pure," and why does React care?**
8. **What's the difference between `React.memo` and a re-render that produces no DOM change?**
9. **What is automatic batching in React 18, and how is it different from React 17?**
10. **Why doesn't `console.log` show the updated state right after calling `setState`?**
11. **What does `React.StrictMode` actually do, and why do effects fire twice in dev?**
12. **If a `<div>` becomes a `<span>` at the same tree position, what does React do?**
13. **What is the `alternate` fiber, and why does React keep two trees (current/work-in-progress)?**
14. **Does calling `setState` with the same value trigger a re-render?** (For primitives, React bails out via `Object.is` comparison if the state is exactly equal to the current value - no re-render is scheduled. For objects/arrays, a new reference always differs even with identical contents.)

---
