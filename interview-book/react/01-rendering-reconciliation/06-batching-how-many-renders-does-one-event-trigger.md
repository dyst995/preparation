# 06. Batching: how many renders does one event trigger?

> Source: `interview-prep/react/01-rendering-reconciliation.md`

### Legacy batching (React <=17, "automatic" only in React event handlers)

Before React 18, multiple `setState` calls inside a **React synthetic event handler** (like `onClick`) were batched into a single re-render. But calls inside **promises, `setTimeout`, native event handlers, or async/await code** were **not** batched - each `setState` triggered its own separate render.

```jsx
// React 17: inside onClick, both setStates batch into ONE render.
function handleClick() {
  setCount(c => c + 1);
  setFlag(f => !f);
}

// React 17: inside setTimeout, these cause TWO separate renders (no batching).
function handleClickAsync() {
  setTimeout(() => {
    setCount(c => c + 1);   // render #1
    setFlag(f => !f);       // render #2
  }, 0);
}
```

### Automatic batching (React 18+)

React 18's `createRoot` API introduced **automatic batching everywhere** - promises, timeouts, native event handlers, and any other context all batch multiple `setState` calls into a single re-render, not just inside React event handlers.

```jsx
// React 18 with createRoot: this now batches into ONE render, even in setTimeout.
function handleClickAsync() {
  setTimeout(() => {
    setCount(c => c + 1);
    setFlag(f => !f);
  }, 0);
}
```

If you truly need a synchronous, unbatched update (rare), you can opt out with `flushSync` from `react-dom`.

### Why batching matters for interviews

- It explains why `console.log(state)` **right after calling `setState`** still shows the old value - state updates are scheduled, not synchronous, and the component re-renders (with fresh closures) later.
- It explains why calling `setState` multiple times with the *same* new value only re-renders once, but calling it with a function updater form (`setCount(c => c + 1)`) is the safe way to base a new value on the latest pending state when you fire multiple updates in the same batch.

```jsx
// BUG: both reference the same stale `count` from this render's closure - net effect is +1, not +2.
setCount(count + 1);
setCount(count + 1);

// FIX: functional updater form reads the latest pending value each time - net effect is +2.
setCount(c => c + 1);
setCount(c => c + 1);
```

### Interview question

**Q: Why doesn't `console.log` right after `setState` show the new value?**

> "State updates are scheduled, not applied synchronously - React batches them and re-renders asynchronously (in React 18, batching happens across event handlers, promises, and timeouts by default). The variable you logged is from the current render's closure, which still holds the old value until the component re-renders with the new state."

**Q: What's the difference between `setCount(count + 1)` twice vs `setCount(c => c + 1)` twice in the same handler?**

> "The first form captures `count` from the closure at call time - calling it twice with the same stale value just schedules the 'same' update twice, netting +1. The functional updater form receives the latest pending state each time it's applied, so two calls correctly net +2."

---
