# 03. useState in depth

> Source: `interview-prep/react/02-hooks-deep-dive.md`

### Basic contract

```jsx
const [state, setState] = useState(initialValue);
```

- `initialValue` is only used on the **first render** for that fiber; ignored on every subsequent render.
- `setState` schedules a re-render (unless the new value is `Object.is`-equal to the current value, in which case React bails out and does not re-render - a lesser-known but interview-relevant optimization).

### Lazy initialization - avoid expensive work on every render

```jsx
// BAD: expensiveComputation() runs on every render, even though only the first result is used
const [data, setData] = useState(expensiveComputation());

// GOOD: pass a function - React only calls it once, on mount
const [data, setData] = useState(() => expensiveComputation());
```

This matters because the *expression* `expensiveComputation()` is evaluated every time the component function runs (every render), even though `useState` only *uses* that value on the very first call. Passing a function defers evaluation to only the initial mount.

### Functional updates - avoiding stale closures when batching

```jsx
// Given multiple updates in the same batch/handler, this is WRONG if you want cumulative +2:
setCount(count + 1);
setCount(count + 1);   // both read the same stale `count` from this render's closure -> net +1

// RIGHT: functional form always receives the latest pending value:
setCount(c => c + 1);
setCount(c => c + 1);  // net +2
```

**Rule of thumb:** if the new state depends on the previous state, always use the functional updater form - it's correct regardless of batching behavior and protects against subtle async bugs (e.g., updating state inside a `setTimeout` or a promise resolution where the closure may be stale).

### `Object.is` bail-out

```jsx
function Bad() {
  const [obj, setObj] = useState({ count: 0 });
  return (
    <button onClick={() => setObj(obj)}>  {/* same reference -> React bails out, NO re-render */}
      Click
    </button>
  );
}
```

For objects/arrays, passing the *same reference* back skips the re-render (`Object.is(prevState, nextState)` is `true`), but passing a **new object with identical values** (`{...obj}`) still triggers a re-render, because references differ even if shallowly "equal" in content. This is a frequent point of confusion - immutability discipline (always create new references for changed data) directly interacts with this bail-out mechanism.

### Interview question

**Q: Why should you use the functional updater form of `setState`?**

> "Because state updates can be batched, and the plain-value form captures whatever `state` was in the closure at the time the handler ran - calling it multiple times with the same stale value collapses into effectively one update. The functional form `setState(s => ...)` always operates on the most recent pending state, so sequential updates compose correctly, and it's also safer inside async callbacks where the closure might be stale by the time it runs."

---
