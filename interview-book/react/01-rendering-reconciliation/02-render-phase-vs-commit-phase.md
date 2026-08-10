# 02. Render phase vs commit phase

> Source: `interview-prep/react/01-rendering-reconciliation.md`

React's work per update splits into two phases:

| Phase | What happens | Can it be interrupted / thrown away? | Side effects allowed? |
|---|---|---|---|
| **Render phase** | Call component functions, compute new element tree, run the diffing algorithm to build a list of effects ("what changed") | Yes (concurrent features can pause, abandon, or restart it) | No - must be pure |
| **Commit phase** | Apply DOM mutations, run layout effects synchronously, run passive effects (`useEffect`) asynchronously after paint | No - runs synchronously to completion once started | Yes - this is where the real world is touched |

### Why this split matters

- **Render phase must be pure** (no DOM mutation, no subscriptions, no logging side effects intended to run once) because React may call your component function multiple times, throw away the result, or interleave it with other work in concurrent mode. If you mutate something during render, you can get double-mutations, stale mutations, or invisible bugs that only show up in `StrictMode` or concurrent features.
- **Commit phase is where `useLayoutEffect` and DOM mutations happen synchronously**, followed by the browser paint, followed by `useEffect` callbacks (passive effects) asynchronously.

### Mental timeline for a state update

1. `setState` is called (an event handler, effect, etc.).
2. React schedules a render (may batch with other updates - see Section 6).
3. **Render phase**: component function(s) re-execute, produce new element tree, React diffs old vs new fiber trees, builds a list of DOM mutations ("effect list").
4. **Commit phase**: 
   a. DOM mutations applied.
   b. `useLayoutEffect` cleanup + effects run synchronously, **before the browser paints**.
   c. Browser paints.
   d. `useEffect` cleanup + effects run asynchronously, **after paint**.

### Interview question

**Q: Why can't you do side effects during render?**

> "Render must be pure because React can call it more than once for the same update - in `StrictMode` for dev-time safety checks, or during concurrent rendering where React may start rendering, pause for a higher-priority update, and either resume or discard the work. If a component mutates external state or the DOM during render, you get bugs like double-fired analytics events, duplicated subscriptions, or stale writes that only appear under specific timing - often invisible until you turn on `StrictMode` or hit concurrent mode in production."

---
