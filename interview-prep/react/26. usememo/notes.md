# useMemo — Memoizing Computed Values

## What you need to know

`useMemo` caches the **result of a computation** between renders. React recomputes only when a value in the **dependency array** changes (compared with `Object.is`); otherwise it returns the **same cached reference/value** from the previous render.

Two reasons people use it — often conflated:

1. **Skip expensive work** when deps are unchanged.  
2. **Preserve referential identity** of an object/array (even if cheap to build) so `React.memo` children or other hook deps don’t see a “new” value every render.

Not a default for every expression. Measure / justify — especially for (1).

Prerequisites: [React.memo](../25.%20react-memo/notes.md), dependency-array discipline from [useEffect](../12.%20useeffect/notes.md).

---

## What it does (preserved)

```jsx
const sortedItems = useMemo(() => {
  return [...items].sort((a, b) => a.value - b.value);
}, [items]);
```

Mental model:

```text
render N: deps same as last time? → return cached value
render N: deps changed?         → run factory, store result, return it
```

The factory should be **pure** relative to rendering: compute and return a value. Don’t put side effects in `useMemo` (that’s `useEffect` territory).

---

## Reason 1: Avoid expensive recomputation (preserved)

Only pays off if the work is **actually** expensive (sort/filter large lists, heavy derived structures, costly formatting).

For `a + b` or mapping ten items, `useMemo`’s dependency checks and bookkeeping can **exceed** just recomputing. Premature memoization adds noise and can hide stale-deps bugs.

**Interview habit:** say “I’d profile or reason about input size before wrapping.”

---

## Reason 2: Preserve referential identity (preserved)

Even a **cheap** `.filter()` allocates a **new array** every render. That new reference:

- Defeats `React.memo` on a child that receives it as a prop  
- Retriggers `useEffect` / other hooks that list it as a dependency  
- Breaks `useMemo`/`useCallback` chains that depend on it  

```jsx
// Not about filter cost — about SAME array reference for memoized <List />
const visibleItems = useMemo(
  () => items.filter((i) => i.visible),
  [items],
);

return <List items={visibleItems} />; // List = React.memo(...)
```

Without `useMemo`, every parent re-render passes a new `items` array into `List` → shallow memo fails even when filtered contents are logically identical *and* `items` source was unchanged… wait: if you filter without useMemo, you always get a new array even when `items` is unchanged. With useMemo and `[items]`, when `items` is unchanged you keep the same filtered array reference.

That second reason is **often more impactful in UI code** than raw CPU savings.

---

## Dependencies — the contract

- Include **every value from the outer scope** that the factory reads and that can change.  
- Missing deps → **stale** memoized value (classic bug).  
- Extra / unstable deps → recompute every time → memo never hits.

```jsx
// Bug: uses `filter` but deps only [items]
const visible = useMemo(
  () => items.filter((i) => i.status === filter),
  [items], // missing filter → stale when filter changes
);
```

Same eslint rules mindset as `useEffect`.

Unstable dependency:

```jsx
useMemo(() => match(options), [{ verbose: true }]); // new options object every render
```

Stabilize options or depend on primitives (`verbose`).

---

## What `useMemo` does *not* guarantee

React docs historically note memoization is an **optimization**, not a semantic guarantee that the factory never runs extra times (especially in Strict Mode double-invoking pure renders in dev). Treat the factory as safe to run more than once; don’t use `useMemo` for “run exactly once” side effects.

For **one-time lazy init** of expensive state, prefer `useState(() => initial)` rather than `useMemo`.

---

## Prediction examples

```jsx
function Parent({ items }) {
  const [count, setCount] = useState(0);
  const sorted = useMemo(() => {
    console.log('sort');
    return [...items].sort((a, b) => a.value - b.value);
  }, [items]);
  return (
    <>
      <button onClick={() => setCount((c) => c + 1)}>{count}</button>
      <List items={sorted} />
    </>
  );
}
```

- Click count with **same** `items` reference → no `'sort'` (cached).  
- `items` replaced with new array → `'sort'` runs again.

```jsx
const opts = useMemo(() => ({ page: 1 }), []);
useEffect(() => {
  fetchPage(opts);
}, [opts]);
```

Empty deps on `useMemo` → stable `opts` → effect runs once (plus Strict Mode remount caveats). Inline `{ page: 1 }` in the effect deps instead → effect every render.

---

## Interview answer (preserved)

**Q: Is `useMemo` only for expensive computations?**

> “No — there are two separate reasons. One is avoiding recomputation cost for genuinely expensive work. The other, often more impactful in practice, is preserving referential equality so a memoized child component or another hook’s dependency array doesn’t see a ‘new’ value every render even when the underlying data hasn’t logically changed. A cheap `.filter()` call might still deserve `useMemo` purely to keep the resulting array’s reference stable for a `memo`-wrapped consumer.”

---

## Common mistakes and misconceptions

1. Wrapping every derived value “for performance.”  
2. Thinking `useMemo` replaces `React.memo` (different layers).  
3. Missing dependencies → stale UI.  
4. Putting side effects inside `useMemo`.  
5. Depending on inline objects → cache always cold.  
6. Using `useMemo` for event handlers — that’s `useCallback` (or memoize a function value with `useMemo`, but `useCallback` is the idiom).  
7. Expecting deep equality of contents when deps are array references that change every fetch.

---

## Connections to other concepts

```
derived value every render
  → new object/array identity by default
  → useMemo can keep identity when deps unchanged

React.memo child
  → needs stable props
  → useMemo / useCallback on parent often required

useEffect([derived])
  → unstable derived → effect thrash
  → memoize derived or depend on primitives

useCallback(fn)
  → special case of memoizing a function value
```

---

## Interview perspective

Be ready to:

1. State **both** reasons for `useMemo`.  
2. Contrast with `React.memo` and `useCallback`.  
3. Diagnose stale deps and unstable deps.  
4. Say when *not* to use it (trivial math, no consumers that care about identity).  
5. Tie to measure-first performance culture.

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
