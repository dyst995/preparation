# 10. Hands-on drills (do these)

> Source: `interview-prep/react/01-rendering-reconciliation.md`

- [ ] Build a small list with a "shuffle" button and a per-row uncontrolled `<input>`. Use `index` as key first and observe the bug when shuffling (typed text jumps to the wrong row). Fix it with a stable `id` key and confirm text stays attached to the correct row.
- [ ] Add a `console.log` inside a component's render body (not in an effect) and wrap the app in `StrictMode` - observe it logging twice on mount in development.
- [ ] Write a component that intentionally mutates a module-level variable during render, and explain out loud why this is unsafe under concurrent rendering / StrictMode, even if it "seems to work."
- [ ] Build two `setCount(count + 1)` calls in one handler vs two `setCount(c => c + 1)` calls; log final state to prove the closure-staleness bug and its fix.
- [ ] Wrap a child in `React.memo` and pass it an inline arrow function prop from the parent; verify it re-renders every time despite `memo`. Fix with `useCallback` and verify the child stops re-rendering.
- [ ] Use React DevTools Profiler to record a click that updates parent state, and inspect which children actually re-rendered vs which ones bailed out.

---
