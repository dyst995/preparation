# Batching: How Many Renders Does One Event Trigger?

## What you need to know

**Batching** means React groups multiple state updates and applies them in **one** re-render (one render→commit pass) instead of re-rendering after each `setState`.

| Era | Where batching happens |
| --- | --- |
| **React ≤17** | Mostly inside **React synthetic event handlers** (`onClick`, etc.). **Not** in `setTimeout`, promises, native handlers, or most async paths — each `setState` often → its own render |
| **React 18+ `createRoot`** | **Automatic batching everywhere** — timeouts, promises, native events, etc. |

Also know: `setState` is **async/scheduled** (logged state right after `setState` is still old); prefer **functional updaters** when multiple updates in one batch depend on previous state; rare opt-out with **`flushSync`**.

Prerequisites: [render vs commit](../2.%20render-vs-commit/notes.md), closures (stale values).

---

## What batching is and why it exists

Without batching:

```text
setA → render → commit
setB → render → commit
```

With batching:

```text
setA, setB (same tick / same batch) → one render with both updates → one commit
```

Fewer renders ⇒ less work, no intermediate UI that only applied half the intended updates (e.g. count updated but flag not yet).

Mental model: `setState` **schedules** an update; React **flushes** the batch later and re-renders with the combined result.

---

## Legacy batching (React ≤17)

Preserved behavior:

```jsx
// React 17: inside onClick → ONE render
function handleClick() {
  setCount((c) => c + 1);
  setFlag((f) => !f);
}

// React 17: inside setTimeout → TWO renders
function handleClickAsync() {
  setTimeout(() => {
    setCount((c) => c + 1); // render #1
    setFlag((f) => !f); // render #2
  }, 0);
}
```

**Why interviews still ask:** many codebases upgraded versions but people remember “async setState isn’t batched.” Under React 18 `createRoot`, that mental model is outdated.

---

## Automatic batching (React 18+)

With **`createRoot`** (not the old `ReactDOM.render` legacy root), React batches updates **across** almost all contexts:

```jsx
// React 18 createRoot: ONE render even in setTimeout
function handleClickAsync() {
  setTimeout(() => {
    setCount((c) => c + 1);
    setFlag((f) => !f);
  }, 0);
}
```

Same for `fetch().then`, `async` functions after `await`, native `addEventListener` callbacks, etc.

**Note:** Apps still on legacy `ReactDOM.render` may not get the full automatic-batching story — interview default assume React 18 + `createRoot`.

### Opting out: `flushSync`

```jsx
import { flushSync } from 'react-dom';

flushSync(() => {
  setCount((c) => c + 1);
});
// DOM updated for this update before continuing
setFlag((f) => !f);
```

Use rarely: need to read layout from the DOM immediately after an update, or force paint before more work. Forces synchronous flush — can hurt performance if overused.

---

## Why `console.log` after `setState` shows the old value

Preserved interview answer:

> State updates are **scheduled**, not applied in-place. React batches and re-renders later. The `count` (or `state`) variable you close over is from the **current render**; it doesn’t change until the next render produces a new closure.

```jsx
function handleClick() {
  setCount(count + 1);
  console.log(count); // still old value
}
```

To run logic **after** the update is committed, use `useEffect` depending on that state, or the updater/callback patterns appropriate to your API — not a sync read right after `setState`.

---

## Object vs functional updates in the same batch

```jsx
// BUG: both use same stale `count` from this render → net +1
setCount(count + 1);
setCount(count + 1);

// FIX: each updater receives latest pending state → net +2
setCount((c) => c + 1);
setCount((c) => c + 1);
```

### Why

In one batch, React queues updates. For the **value** form `setCount(count + 1)`, both calls compute `count + 1` from the **same** render’s `count` (e.g. both schedule “set to 6” if `count` was 5). React may collapse to one result → **+1**.

For **`setCount(c => c + 1)`**, React applies updaters **in order** on the pending state: 5→6, then 6→7 → **+2**.

**Rule:** If the next state depends on the previous state — especially with multiple updates in one event/batch — use the **functional updater**.

Setting state to the **same** primitive value React already has can bail out of re-rendering (Object.is); functional form that returns a new value still matters when you intend increments.

---

## Batching vs async timing (mental picture)

```text
Click handler runs (sync)
  setCount(...)  ─┐
  setFlag(...)   ─┴─ queued in same batch
handler returns
  → React re-renders once with both

setTimeout callback (React 18)
  setCount(...)  ─┐
  setFlag(...)   ─┴─ still one batch (automatic)
  → one re-render

React 17 setTimeout
  setCount → render
  setFlag  → render
```

Batching does **not** make `setState` return the new value synchronously; it only reduces how many times you render when multiple updates fire close together.

---

## Common mistakes and misconceptions

1. Expecting `setState` to mutate state before the next line.  
2. Double `setCount(count + 1)` expecting +2.  
3. Assuming React 17 async-path behavior still applies on React 18 `createRoot`.  
4. Overusing `flushSync` “to make state sync.”  
5. Confusing batching (merge updates into one render) with React 18 transitions (priority) — related scheduling world, different API.  
6. Thinking batching means “only one setState allowed per event.”

---

## Connections to other concepts

```
setState schedules update
  → batching merges multiple schedules
    → one render phase → one commit

closures from current render
  → stale count in value-form setState
    → functional updaters

React 18 createRoot
  → automatic batching
    → fewer surprise double renders in async code

render vs commit
  → batching reduces how often that pipeline runs
```

---

## Interview perspective

Be ready for:

1. **Why doesn’t `console.log` after `setState` show the new value?** (scheduled + closure)  
2. **`setCount(count+1)` twice vs functional twice** (+1 vs +2)  
3. **React 17 vs 18 batching** (handlers only vs everywhere with `createRoot`)  
4. When you’d use **`flushSync`** (rare)

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
