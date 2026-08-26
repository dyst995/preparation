# useMemo — Answers

## Core recall

1. The cached value from the previous render (same reference if it was an object/array).  
2. When at least one dependency fails `Object.is` vs last time.  
3. (1) Avoid expensive recomputation. (2) Preserve referential identity for memo/deps.  
4. To keep a stable array reference for a memoized child or hook dependency.  
5. Every reactive value the factory reads that can change between renders.  
6. No — use `useEffect` for effects.  
7. Stable object/array prop → shallow compare can succeed → child may skip render.  
8. `useState(() => expensiveInitial)` lazy initializer.

## Explain why

1. Both “cache something”; people only remember CPU and miss identity for children/effects.  
2. Hook bookkeeping/compare can cost more than the math.  
3. Factory doesn’t re-run when that input changes → returns old result.  
4. Empty deps → one object instance forever (until unmount) → effect sees same dep.  
5. React may remount/re-run pure render paths in dev (Strict Mode); treat as optimization.  
6. It only stabilizes a value; the child still re-renders unless the child is memoized (or doesn’t care) and other props/state/context allow a bailout.

## Compare and contrast

1. **`useMemo`:** cache a **value** inside a component. **`React.memo`:** maybe skip a **child component** render.  
2. **`useCallback(fn, deps)`** ≡ **`useMemo(() => fn, deps)`** for functions; `useCallback` is the clear idiom for handlers.  
3. Inline always new identity (for objects) + always pays compute; `useMemo` can reuse.  
4. CPU: skip heavy work. Identity: same reference for consumers that use `===`.  
5. Lazy `useState` init runs for initial state setup; `useMemo` recalculates when deps change across life.

## Predict the output

1. **No** — deps unchanged → cached array returned.  
2. **Stale** — still filtered/mapped with old `query` until `items` changes.  
3. When `x` changes (new `v`) — not on unrelated parent state if `x` same.  
4. **Every render** — new object identity each time.

## Debugging

1. Wrap filter in `useMemo(..., [data])` (and any filter predicates’ deps), or memoize differently / pass stable data.  
2. Missing `sortKey` in deps — add it.  
3. Recomputes every render — cold cache; stabilize `options` or depend on fields.  
4. Side effect in render path / wrong API — move to `useEffect` or data library.

## Application

1.
```jsx
const sorted = useMemo(() => {
  return [...rows].sort((a, b) => compare(a, b, sortKey));
}, [rows, sortKey]);
```

2.
```jsx
const value = useMemo(() => ({ user, logout }), [user, logout]);
```

3. Paraphrase preserved answer: two reasons — expensive work **and** referential stability for memo/deps.  
4. `const filtered = useMemo(() => items.filter(...), [items, ...]); useEffect(() => {...}, [filtered]);` or depend on `items` + primitives and filter inside the effect once.

## Interview questions

1. **Spoken:** No — expensive recomputation *and* preserving referential equality for memoized children / hook deps. Example: cheap `filter` wrapped so `memo` List doesn’t re-render. Skip when compute is trivial *and* nothing cares about identity.  
2. **Spoken:** Everything the factory reads that can change; same correctness rules as effects; prefer stable primitives when possible.  
3. **Spoken:** `useMemo` stabilizes props/values; `React.memo` consumes that stability to bail out — often used together.  
4. **Spoken:** Yes — noise, stale-deps bugs, wasted comparisons, false sense of performance without profiling.

## Connections

1. New derived arrays/objects each render are exactly what defeat shallow `memo` — `useMemo` is a common fix.  
2. Both use dep arrays + `Object.is`; missing deps ⇒ staleness; unstable deps ⇒ thrash.  
3. Reselect/`createSelector` also memoize derived data by input identity — same “don’t recompute / keep reference” idea at store level.  
4. Reason 1 needs evidence of cost; reason 2 can be justified by a known memo/effect consumer even when CPU is small — still avoid cargo-culting every line.
