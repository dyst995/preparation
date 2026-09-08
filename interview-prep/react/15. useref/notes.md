# `useRef` in Depth

## What you need to know

`useRef(initialValue)` returns a stable object `{ current: initialValue }` for the lifetime of that fiber hook slot.

Two main uses:

1. **Mutable box** that persists across renders **without** scheduling a re-render when you change `current`.  
2. **DOM / imperative handle** — attach via `ref={…}` (or `forwardRef`) for focus, scroll, media, measure, selection.

If the value should appear on screen, use **`useState`** (or derived render). If it’s bookkeeping the UI doesn’t display, a **ref** is often right.

Prerequisites: [hooks mechanics](../9.%20hooks-mechanics/notes.md), [pure components](../5.%20pure-components/notes.md), [useEffect](../12.%20useeffect/notes.md).

---

## The ref object

```jsx
const ref = useRef(null);
// ref === same object every render
// ref.current is mutable
```

- Changing `ref.current` does **not** notify React.  
- Reading `ref.current` during render is allowed for some patterns but **writing** during render for display purposes breaks purity (StrictMode / concurrent). Prefer read/write in events, effects, or layout effects.  
- Initial value is set once (like `useState` init — not reapplied every render).

---

## Use 1 — Mutable values without re-renders

State drives **what’s rendered**. Refs hold values the instance must **remember** that aren’t themselves UI:

- Timer / interval IDs  
- Previous props/state for comparison  
- “Has this already run?” flags  
- Latest callback (see below)  
- Imperative caches that aren’t displayed  

```jsx
function usePolling(callback, delay) {
  const savedCallback = useRef(callback);
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    const id = setInterval(() => savedCallback.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}
```

**Why this pattern:** deps on `[callback]` would recreate the interval whenever the parent passes a new function identity. The ref always points at the **latest** callback; the interval effect only depends on `delay`. Classic refs + effects combo.

---

## Use 2 — DOM access

```jsx
function SearchBox() {
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return <input ref={inputRef} />;
}
```

React sets `inputRef.current` to the DOM node on mount (and `null` on unmount). Use for imperative APIs React doesn’t express as props: `focus()`, `scrollIntoView()`, `play()`, `select()`, `getBoundingClientRect()` (often in `useLayoutEffect`).

**Callback refs** (`ref={(node) => …}`) exist when you need to run logic on attach/detach; `useRef` covers most cases.

**`forwardRef`:** let a parent pass a ref through to an inner DOM node (or `useImperativeHandle` for a custom handle).

---

## Why refs don’t re-render (feature, not bug)

Preserved interview idea: refs sit **outside** the render/diff cycle. Mutating them is intentionally invisible to reconciliation — correct for bookkeeping; wrong for anything the user should see update.

```jsx
// MISTAKE: UI won't update
function Bad() {
  const countRef = useRef(0);
  return (
    <button
      onClick={() => {
        countRef.current++;
      }}
    >
      {countRef.current}
    </button>
  );
}
```

Click mutates the ref; React doesn’t re-render; button text stays at the last rendered value (usually `0`).

---

## Mutation during render (preserved caution)

```jsx
function Bad2() {
  const ref = useRef(0);
  ref.current = ref.current + 1; // write during render — unsafe under StrictMode / concurrent
  return <div>{ref.current}</div>;
}
```

Display depending on render-time ref writes → double-invoke doubles counts; discarded concurrent renders can leave confusing values. Prefer:

- **State** if it affects UI, or  
- Increment in an **effect** / event if it’s diagnostics, or  
- Lazy init patterns that only write when `current` is still the sentinel.

Debugging `renderCountRef.current++` in render is a common shortcut — know it’s impure; don’t ship UI that depends on it.

---

## Refs vs state (decision table)

| Need | Prefer |
| --- | --- |
| Value shown in JSX / drives children | `useState` |
| Change should re-render | `useState` |
| Timer id, latest callback, DOM node | `useRef` |
| Previous value for compare-in-effect | `useRef` |
| Form field the user types (controlled) | usually state |
| Uncontrolled input + read on submit | ref (or uncontrolled + FormData) |

You can keep state for UI and a ref mirror of the latest value for stable event listeners — advanced pattern; don’t default to dual sources without need.

---

## Common mistakes and misconceptions

1. Using a ref for a counter displayed on screen.  
2. Expecting `ref.current = x` to refresh UI.  
3. Writing `ref.current` during render to compute displayed output.  
4. Forgetting `inputRef.current` may be `null` before mount / after unmount — optional chain.  
5. Putting `ref` objects in effect deps expecting updates when `.current` changes — **`.current` changes don’t change the ref object identity**, so deps won’t re-fire.  
6. Confusing `useRef` with React Router “ref” or Redux — different meanings.

---

## Connections to other concepts

```
useState → UI + re-render
useRef  → memory without re-render

savedCallback ref
  → stable interval + latest function
    → avoids effect churn from unstable callbacks

DOM ref
  → useLayoutEffect measure / focus in useEffect

purity
  → don’t write refs during render for display

hook list
  → useRef is one slot; object identity stable
```

---

## Interview perspective

**Q: Why doesn’t updating `ref.current` re-render — and when is that a feature?**

Preserved answer:

> Refs hold mutable values outside React’s render/diff cycle — mutating them doesn’t participate in VDOM comparison, so no re-render. That’s right for bookkeeping (timer ids, previous-value caches, flags, DOM nodes). If the value should show on screen, it belongs in **state**, not a ref.

Follow-ups: `savedCallback` pattern; Bad counter example; render-time mutation danger.

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
