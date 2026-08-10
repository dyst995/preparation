# 10. Interview question bank (hooks)

> Source: `interview-prep/react/02-hooks-deep-dive.md`

1. **Mechanically, how does React know which `useState` call corresponds to which state across renders?**
2. **Why must hooks be called unconditionally, at the top level?**
3. **What's the difference between `useState(expensiveFn())` and `useState(() => expensiveFn())`?**
4. **Explain the stale closure problem with a `setInterval` inside `useEffect`.**
5. **When does an effect's cleanup function run?**
6. **What's the difference between `useEffect` and `useLayoutEffect`, mechanically and in timing?**
7. **Give an example where using `useLayoutEffect` fixes a visible bug that `useEffect` would cause.**
8. **What's the "effects vs events" mental model, and how does it prevent misuse of `useEffect`?**
9. **Why doesn't mutating `ref.current` cause a re-render, and when is that useful?**
10. **Do two components calling the same custom hook share state? Why or why not?**
11. **When would you reach for `useReducer` instead of multiple `useState` calls?**
12. **What does the `exhaustive-deps` ESLint rule check, and why shouldn't you casually disable it?**
13. **Explain a real bug you've hit from a missing dependency, and how you diagnosed/fixed it.**
14. **What is `useSyncExternalStore` for, and why do external store libraries need it instead of just `useState` + a subscription?**

---
