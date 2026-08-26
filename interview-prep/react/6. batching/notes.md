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

# Self-test

## Core recall

1. What is batching in React?
2. Where did React ≤17 batch updates? Where did it often not?
3. What changed with React 18 automatic batching?
4. Which root API is associated with automatic batching?
5. Why does `console.log(state)` right after `setState` show the old value?
6. What’s the net effect of two `setCount(count + 1)` in one handler vs two functional updaters?
7. What does `flushSync` do?
8. Does batching make reading state synchronous after `setState`?

## Explain why

1. Why does batching improve performance / UX?
2. Why do two value-form increments in one batch often net +1?
3. Why do functional updaters net +2 in the same situation?
4. Why was unbatched async `setState` in React 17 surprising in apps?
5. Why is `flushSync` discouraged as a default habit?
6. Why can’t you “fix” the `count` variable by calling `setCount`?

## Compare and contrast

1. React 17 handler batching vs React 18 automatic batching  
2. Value update (`setCount(count + 1)`) vs functional updater (`setCount(c => c + 1)`)  
3. Batching vs `flushSync`  
4. Multiple `setState` in one click vs sequential updates in two separate clicks  
5. Scheduling an update vs applying it in a re-render  
6. Batching vs concurrent transitions (`startTransition`) at a high level  

## Predict the behavior

1. React 18 `createRoot`; in `setTimeout`, `setA(1); setB(2)`. How many re-renders expected from those two calls?

2. React 17; same `setTimeout` with two `setState`s. How many re-renders typically?

3.
```jsx
// count is 0
setCount(count + 1);
setCount(count + 1);
// count after next render?
```

4.
```jsx
setCount((c) => c + 1);
setCount((c) => c + 1);
// count was 0; after next render?
```

5.
```jsx
setCount(5);
console.log(count); // count was 0 in this render
// what logs?
```

## Debugging

1. User increments twice quickly in one handler using `setCount(count + 1)` twice; UI only +1. Fix?

2. After `await fetch()`, two `setState`s cause two renders on React 17; product wants one. What do you say on React 18?

3. Code uses `flushSync` around every `setState` “so logs work.” What’s wrong?

4. Mid-handler `document.querySelector` expects DOM from `setState` just called — still old DOM. Options?

5. Team claims “setState is synchronous in event handlers.” Clarify.

## Application

1. Write a click handler that increments count twice safely in one batch.

2. Show a React 18 `setTimeout` example that relies on automatic batching for two states.

3. Sketch when you’d wrap an update in `flushSync` (one sentence + tiny code).

4. Explain to a junior why their `console.log` after `setState` “proves setState is broken.”

## Interview questions

1. Why doesn’t `console.log` right after `setState` show the new value?  
2. `setCount(count + 1)` twice vs `setCount(c => c + 1)` twice?  
3. How does batching differ between React 17 and React 18?  
4. What is automatic batching?  
5. When would you use `flushSync`?

## Connections

1. How does batching reduce work in the render→commit pipeline?
2. How do stale closures here relate to the closures unit in JS?
3. How does this interact with “re-render ≠ DOM update”?
4. Why do functional updaters matter more once batching queues multiple updates?
5. How might StrictMode double-rendering still interact with handlers that set state once?
