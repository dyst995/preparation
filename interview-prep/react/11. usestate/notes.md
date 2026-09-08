# `useState` in Depth

## What you need to know

```jsx
const [state, setState] = useState(initialValue);
```

Core contract:

- **`initialValue`** (or lazy init function) applies only on the **first render** of that fiber hook slot; ignored later.  
- **`setState`** schedules an update → usually a re-render.  
- **Bail-out:** if next state is `Object.is`-equal to current, React **skips** re-rendering.  
- Prefer **functional updaters** when next state depends on previous (batching + stale closures).  
- Use **lazy init** `useState(() => …)` when initialization is expensive.

Prerequisites: [hooks mechanics](../9.%20hooks-mechanics/notes.md), [batching](../6.%20batching/notes.md).

---

## Basic contract

`useState` reserves one hook list slot holding the current value. The setter is stable for that slot (same function identity across renders in practice — safe as a dep when that’s the only dependency concern).

```jsx
const [count, setCount] = useState(0);
setCount(1);           // schedule: next state is 1
setCount((c) => c + 1); // schedule: updater fn applied to pending state
```

After `setState`, the `count` variable **in this render** does not change — see batching / closures. The next render gets the new value.

---

## Initial value vs every render

```jsx
const [data, setData] = useState(expensiveComputation()); // BAD pattern
```

`expensiveComputation()` runs **every time** the component function runs, because it’s a normal JS argument expression. `useState` **ignores** that result after mount — you still paid the cost.

### Lazy initialization (preserved)

```jsx
const [data, setData] = useState(() => expensiveComputation()); // GOOD
```

React calls the function **once** on mount (for that hook slot) and uses its return value as initial state.

Also useful for: `useState(() => Math.random())`, reading `localStorage` once, building a large initial structure.

**Note:** If you pass a **function** as state *value* (rare), wrap it: `useState(() => fn)` would treat `fn` as lazy init — use `useState(() => () => actualFn)` or store differently. Edge case; know it exists.

---

## Functional updates (preserved)

```jsx
// WRONG for cumulative +2 in one batch — both see same closed-over count
setCount(count + 1);
setCount(count + 1); // net +1

// RIGHT
setCount((c) => c + 1);
setCount((c) => c + 1); // net +2
```

**Rule:** If new state depends on previous state, use `setState(prev => next)`.

Also safer in `setTimeout` / promises / event handlers that close over an old render:

```jsx
setTimeout(() => {
  setCount((c) => c + 1); // not setCount(count + 1) from a stale render
}, 1000);
```

When the next value **doesn’t** depend on previous (`setTitle('Hello')`), the value form is fine and clear.

---

## `Object.is` bail-out (preserved)

React compares previous and next state with **`Object.is`** (like `===` but `NaN` equals `NaN`, and `+0` ≠ `-0`).

```jsx
setCount(5); // if count already 5 → no re-render

function Bad() {
  const [obj, setObj] = useState({ count: 0 });
  return (
    <button onClick={() => setObj(obj)}> {/* same reference → bail out */}
      Click
    </button>
  );
}
```

| Next state | Re-render? |
| --- | --- |
| Same primitive (`5` → `5`) | No |
| Same object **reference** | No |
| New object `{ ...obj }` even if fields equal | **Yes** |
| New array with same elements | **Yes** |

Immutability discipline (“always copy when changing”) ensures React **sees** the update. Mutating `obj.count++` then `setObj(obj)` → **bail-out**, UI stale — classic bug.

```jsx
// BAD
obj.count++;
setObj(obj);

// GOOD
setObj({ ...obj, count: obj.count + 1 });
// or setObj(o => ({ ...o, count: o.count + 1 }));
```

---

## Updating based on props (mount vs sync)

`useState(props.value)` only seeds **initial** state. If `props.value` changes later, state does **not** auto-sync.

Patterns:

- Controlled: use the prop directly (no local state), or  
- Sync intentionally: `useEffect(() => setX(props.value), [props.value])` (know the extra render), or  
- `key={props.id}` remount to reset state when identity changes.

Don’t expect `initialValue` to track props.

---

## Multiple state variables vs one object

Several `useState` calls ⇒ several hook slots (fine). One `useState({…})` ⇒ update carefully with copies / functional form so you don’t wipe fields or bail out on mutation.

Prefer separate state when fields update independently and you’re not fighting prop drilling — judgment call, not dogma.

---

## Common mistakes and misconceptions

1. Expecting `setState` to change the local variable immediately.  
2. `useState(expensive())` instead of lazy init.  
3. Double `setCount(count + 1)` expecting +2.  
4. Mutating state objects then setting the same reference.  
5. Assuming `useState(props.x)` stays in sync with props.  
6. Confusing bail-out (“no re-render”) with “setState was ignored forever” — a later different value still updates.

---

## Connections to other concepts

```
hook slot on fiber
  → useState stores current value there

batching
  → functional updaters compose in one flush

closures
  → value-form setState can be stale

Object.is bail-out
  → immutability required for object/array updates

re-render vs DOM
  → bail-out skips the whole re-render pipeline
```

---

## Interview perspective

**Q: Why use the functional updater form of `setState`?**

Preserved answer:

> Updates can be batched; the value form captures `state` from the closure when the handler ran — multiple calls with the same stale value collapse. `setState(s => …)` always uses the latest pending state, so sequential updates compose, and it’s safer in async callbacks with stale closures.

Also ready: lazy init; `Object.is` bail-out; same-reference object bug.

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
