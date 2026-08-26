# useCallback — Answers

## Core recall

1. The same function reference as last time.  
2. `useMemo(() => fn, deps)`.  
3. Prop to a `memo` child, or dependency of another hook that cares about identity.  
4. Child re-renders with Parent anyway — stable prop doesn’t skip render.  
5. Stale closure — always sees the initial `count`.  
6. Yes — React guarantees setter identity is stable.  
7. No — only stabilizes the function **reference**, not click cost.  
8. `Object.is` on each dependency (same as other hooks).

## Explain why

1. New reference → shallow prop compare fails → memo child renders.  
2. Without memo bailout, children always render when parent does; identity unused.  
3. Stable `cb` → effect deps unchanged → effect doesn’t re-fire every render.  
4. Correctness: when `user.id` changes you *want* a new function that closes over the new id.  
5. Most handlers aren’t reference-sensitive; default wrapping is noise/cost without payoff.  
6. Setter form doesn’t read current `count` from the closure — safe with empty deps.

## Compare and contrast

1. **`useCallback`:** memoize a function. **`useMemo`:** memoize any computed value (objects, arrays, numbers…).  
2. Inline: new identity every render. `useCallback`: stable until deps change.  
3. Without memo: usually useless for render skipping. With memo: can enable bailout.  
4. **`useCallback` + deps:** new fn when data changes. **Ref:** one stable fn reading `ref.current` for latest.  
5. **`useCallback`:** stable prop/value. **`memo`:** component-level bailout that *consumes* stable props.

## Predict the output

1. **Skip** (if other props equal) — same `onClick` reference.  
2. **Re-render** — new function prop each time.  
3. **Re-render** — no memo bailout.  
4. **`0`** (or initial count) — stale closure.

## Debugging

1. Wrap in `useCallback` with correct deps, or move logic into the effect and depend on primitives.  
2. Inline per-row lambdas defeat memo — shared `useCallback` + pass `id`, or don’t memo rows, or other patterns.  
3. Callback identity changes every time → behaves like no memoization; stabilize `filters` (`useMemo`) or depend on contents.  
4. Empty deps captured old state/props — add deps or use ref/functional updates.

## Application

1.
```jsx
const save = useCallback(async () => {
  await api.save(draft);
}, [draft]);
```

2.
```jsx
const increment = useCallback(() => {
  setCount((c) => c + 1);
}, []);
```

3.
```jsx
const Child = React.memo(function Child({ onClick }) {
  return <button onClick={onClick}>Go</button>;
});
function Parent() {
  const onClick = useCallback(() => {}, []);
  return <Child onClick={onClick} />;
}
```

4. Paraphrase preserved answer: only when something downstream is reference-sensitive (`memo` or hook deps).

## Interview questions

1. **Spoken:** When stability matters to a `memo` child or a hook dependency. Useless: plain child, no effect/memo deps. Stale closures: omitted reactive values in deps while reading them inside.  
2. **Spoken:** Same mechanism; `useCallback` is sugar for memoizing a function.  
3. **Spoken:** No — only when a consumer cares about identity; otherwise overhead without benefit.  
4. **Spoken:** `useMemo`/`useCallback` stabilize props; `memo` skips child render when those props shallow-equal — chain only as needed after measuring.

## Connections

1. `useMemo` stabilizes data; `useCallback` stabilizes functions — both about `===`.  
2. Functions are props too; inline handlers are the classic shallow-compare defeat.  
3. Dep arrays + `Object.is`; missing ⇒ stale; unstable ⇒ thrash.  
4. Profile or identify a real reference-sensitive consumer before wrapping handlers.
