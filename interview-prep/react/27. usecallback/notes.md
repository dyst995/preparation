# useCallback — Memoizing Function References

## What you need to know

`useCallback(fn, deps)` returns a **stable function reference** until one of `deps` changes. It is exactly:

```js
useMemo(() => fn, deps)
```

…a named convenience for the common case of memoizing a **function**.

It pays off only when **referential stability matters downstream**:

1. Prop to a **`React.memo`** child (avoid defeating shallow compare), or  
2. Dependency of **`useEffect` / `useMemo` / another `useCallback`** (avoid retriggering).

Wrapping every handler “for performance” when nothing is reference-sensitive adds overhead for **zero** benefit.

Prerequisites: [React.memo](../25.%20react-memo/notes.md), [useMemo](../26.%20usememo/notes.md).

---

## What it does (preserved)

```jsx
const handleSelect = useCallback((id) => {
  setSelectedId(id);
}, []); // stable forever if it doesn't close over changing values
```

Every render without `useCallback`:

```jsx
const handleSelect = (id) => setSelectedId(id); // NEW function identity each render
```

With `useCallback` and unchanged deps → **same function object** as last time.

---

## Equivalence to `useMemo`

| API | Memoizes |
| --- | --- |
| `useMemo(() => compute(), deps)` | A **value** (often object/array) |
| `useCallback(fn, deps)` | A **function** (the `fn` itself) |

Prefer `useCallback` for handlers — clearer intent than `useMemo(() => () => {...}, deps)`.

---

## When it actually helps (preserved)

### A. Passed into `React.memo` child

```jsx
const Row = React.memo(function Row({ onSelect, id, label }) {
  return <button onClick={() => onSelect(id)}>{label}</button>;
});

function Parent({ items }) {
  const [q, setQ] = useState('');
  const onSelect = useCallback((id) => {
    /* ... */
  }, []);
  return items.map((item) => (
    <Row key={item.id} id={item.id} label={item.name} onSelect={onSelect} />
  ));
}
```

Typing in `q` re-renders `Parent`. Stable `onSelect` + unchanged row props → `Row` can bail out. Inline `onSelect={(id) => ...}` → every row’s memo fails.

### B. Dependency of another hook

```jsx
const load = useCallback(async () => {
  const data = await fetchUser(userId);
  setUser(data);
}, [userId]);

useEffect(() => {
  load();
}, [load]);
```

Without stabilizing `load` (or inlining fetch in the effect), a fresh `load` every render → effect runs every render.

---

## The most common mistake (preserved)

```jsx
function Parent() {
  const onClick = useCallback(() => {
    /* ... */
  }, []);
  return <Child onClick={onClick} />; // Child is NOT memoized
}
```

Plain `Child` **re-renders whenever Parent re-renders** anyway. Stable `onClick` does not skip `Child`’s render. You paid for a dep comparison for **no** render savings.

`useCallback` is not a magical “make child faster” switch — the **consumer** must care about identity.

---

## Closures and dependency arrays

The cached function **closes over** values from the render that created it. Wrong deps → **stale closure**.

```jsx
const [count, setCount] = useState(0);

// Bug: empty deps, reads count
const log = useCallback(() => {
  console.log(count); // always 0
}, []);
```

Fixes:

```jsx
const log = useCallback(() => {
  console.log(count);
}, [count]); // new function when count changes — correct, less stable

// Or functional updates when only setters matter:
const increment = useCallback(() => {
  setCount((c) => c + 1);
}, []); // setters from useState are stable
```

**Empty deps are correct** only when the callback doesn’t read changing reactive values (or only uses stable refs/setters).

`useRef` for latest value is another pattern when you need a **stable** callback that reads fresh data (e.g. event subscriptions) — know it exists; don’t overuse.

---

## Prediction examples

```jsx
const Child = React.memo(function Child({ onClick }) {
  console.log('Child');
  return <button onClick={onClick}>x</button>;
});

function Parent() {
  const [n, setN] = useState(0);
  const onClick = useCallback(() => setN((x) => x + 1), []);
  return (
    <>
      <button onClick={() => setN((x) => x + 1)}>{n}</button>
      <Child onClick={onClick} />
    </>
  );
}
```

Updating `n` via the first button: Parent re-renders; `onClick` same reference → **`Child` skipped** (no log).

Replace with `const onClick = () => setN((x) => x + 1)` → **`Child` logs** every time.

Remove `React.memo` from Child but keep `useCallback` → **Child always logs** with Parent — callback stability irrelevant.

---

## Interview answer (preserved)

**Q: When does `useCallback` actually make a measurable difference?**

> “Only when the function’s referential stability matters to something downstream — either it’s passed as a prop to a `memo`-wrapped child, where a new reference every render would defeat that memoization, or it’s a dependency of another hook like `useEffect`, where a fresh reference would cause that effect to re-run every render. If the function isn’t consumed by anything reference-sensitive, `useCallback` just adds a dependency-array comparison for no benefit.”

---

## Common mistakes and misconceptions

1. `useCallback` on every handler by habit.  
2. Using it **without** `memo` / reference-sensitive deps.  
3. Empty deps + closed-over state → stale bugs.  
4. Confusing “stable function” with “child won’t re-render” (need `memo` too).  
5. Thinking `useCallback` makes the function’s *body* cheaper to run (it doesn’t — only identity).  
6. Listing unstable object deps → new callback every render → pointless.  
7. Forgetting `useCallback` ≡ `useMemo(() => fn, deps)`.

---

## Connections to other concepts

```
new function every render (default)
  → defeats React.memo shallow compare
  → retriggers useEffect([fn])

useCallback
  → stable fn when deps unchanged
  → only valuable if something uses === on that fn

useMemo
  → same mechanism for non-function values

measure first / don’t cargo-cult
  → same chapter theme as memo / useMemo
```

---

## Interview perspective

Be ready to:

1. Define `useCallback` as `useMemo` for functions.  
2. Name the **two** payoff cases.  
3. Call out the “callback without memo” anti-pattern.  
4. Explain stale closures vs empty deps.  
5. Contrast with `useMemo` for objects/arrays.

---

# Self-test

## Core recall

1. What does `useCallback(fn, deps)` return when deps are unchanged?
2. Express `useCallback` in terms of `useMemo`.
3. What are the two situations where `useCallback` pays off?
4. Why is `useCallback` pointless for a non-memoized child that only receives that handler?
5. What goes wrong with empty deps when the callback reads `count` from state?
6. Are `useState` setters safe to omit from deps / use with `[]`?
7. Does `useCallback` make the function body run faster when clicked?
8. What compares the dependency array between renders?

## Explain why

1. Why does a new inline arrow function defeat `React.memo`?
2. Why doesn’t stable `onClick` help a plain function child?
3. Why can `useCallback` + `useEffect([cb])` stop an infinite effect loop?
4. Why might you still recreate the callback when deps include `user.id`?
5. Why is “wrap all handlers in useCallback” a weak senior answer?
6. Why is functional `setCount(c => c + 1)` useful inside `useCallback` with `[]`?

## Compare and contrast

1. `useCallback` vs `useMemo`  
2. `useCallback` vs inline function in JSX  
3. `useCallback` without `memo` vs with `memo`  
4. Stable callback via `useCallback` vs reading latest state via ref  
5. `useCallback` vs `React.memo`  

## Predict the output

1. Memo child + `useCallback(..., [])` handler; parent state unrelated to handler deps updates. Child re-render?  
2. Same but handler is inline `() => {}`. Child?  
3. Non-memo child + `useCallback`. Parent updates. Child?  
4. `useCallback(() => console.log(count), [])`; click after `count` became 5. What logs?

## Debugging

1. Effect runs every render; deps `[onSearch]` where `onSearch` is not wrapped / has changing deps. Fix directions?  
2. List rows all re-render on parent keypress; each gets `onSelect={() => select(item.id)}`. Diagnose.  
3. Callback has `[filters]` but `filters` is a new object every render from parent. Symptom?  
4. Stale UI in a memoized subscription callback with `[]` deps. Cause?

## Application

1. Write a `useCallback` save handler that depends on `draft` and posts it.  
2. Write a stable increment callback with functional updates and `[]`.  
3. Show Parent + `React.memo(Child)` correctly using `useCallback`.  
4. Spoken answer: when does `useCallback` matter?

## Interview questions

1. When does `useCallback` actually make a measurable difference?  
   - Follow-up: Show a case where it’s useless.  
   - Follow-up: How do stale closures show up?
2. Is `useCallback` the same as `useMemo`?  
3. Do you use `useCallback` by default for every event handler? Why/why not?  
4. How do `memo`, `useMemo`, and `useCallback` work together?

## Connections

1. How does this complete the “identity” story from `useMemo`?
2. How does the shallow-equality trap in `React.memo` motivate `useCallback`?
3. How do effect dependency rules apply equally here?
4. How does “measure first” apply to callback memoization?
