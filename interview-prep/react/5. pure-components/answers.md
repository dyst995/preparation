# Pure Components and Why Purity Matters — Answers

## Core recall

1. Same props/state/context → same UI output; **no observable side effects** during the render call.
2. Examples: network calls, DOM writes, mutating external/module state, subscriptions, non-deterministic UI not stored in state.
3. Render may run **twice** or be **discarded/restarted** — impure work duplicates or leaves wrong external state.
4. Bail-outs assume same inputs ⇒ same output; hidden inputs break that and can yield **stale** skipped updates.
5. **Shallow** equality of props (`memo`) or props+state (`PureComponent`).
6. Inline function is a **new reference** each parent render → shallow compare fails → child re-renders.
7. `useState(() => Math.random())` or lazy init in `useRef` / state — not `Math.random()` directly in JSX each render.
8. **No** — purity is for everyone; `PureComponent`/`memo` are optional optimizations.

## Explain why

1. Each invoke runs `fetch` again; StrictMode intentionally double-invokes in dev → duplicate requests.
2. Props unchanged ⇒ memo skips render while module variable changed ⇒ UI doesn’t update.
3. Mutates parent-owned data; other consumers see reordered/mutated array; breaks “inputs in → output out” and sharing.
4. `memo` only skips sometimes; when it does render, impurity still breaks StrictMode/concurrent; also doesn’t fix hidden dependencies.
5. Counting is an external write; double-render double-counts; effects run in a lifecycle meant for side effects.
6. Children receive function props; unstable identity defeats shallow memo — `useCallback` keeps reference stable when deps allow.

## Compare and contrast

1. **Concept:** always aim for pure render. **APIs:** skip re-render on shallow equal props/state.
2. **Render:** unsafe / may redo. **`useEffect`:** after commit/paint, with cleanup — correct place for external sync.
3. **Copy then sort:** local ephemeral data. **In-place prop sort:** mutates shared input.
4. **`PureComponent`:** shallow bail-out built in. **`Component`:** always re-renders when parent/owner updates (unless custom `shouldComponentUpdate`).
5. **In JSX:** new value every call. **In state init:** stable until you setState a new one.
6. **Defeat:** new references every time. **Skip:** stable props + pure child ⇒ safe skip.

## Predict the behavior

1. `n` can jump by **2** per update in StrictMode; displayed count ≠ “logical” renders; impure.
2. **Usually no skip** — new `onClick` function each time ⇒ props not shallow-equal.
3. **No** — `Date.now()` differs between invocations.
4. Child may **not re-render** when `theme` changes ⇒ **stale** theme on screen.

## Debugging

1. Side effect in **render** + StrictMode double-invoke — move to `useEffect`/event.
2. Unstable props (inline objects/functions), custom compare wrong, or parent always passing new `item` references; verify with Profiler why props change.
3. Hidden dependency outside props + memo skip — pass `theme` as prop or don’t memo that way; avoid module mutable UI source.
4. Compute with `useMemo` / derive in render without writing ref; or update ref in effect if needed.
5. `Date.now`/`Math.random`/external mutable read during render.

## Application

1.
```jsx
function Good() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    /* track or setCount if needed */
  });
  return <div>...</div>;
}
```
(Or don’t surface render counts in UI from module mutation.)

2.
```jsx
const [id] = useState(() => Math.random());
return <div>{id}</div>;
```

3. `export default React.memo(Avatar)` — helps when parent re-renders often but `url`/`name` unchanged.

4.
```jsx
const sorted = [...items].sort(...);
```

5. “Purity is a correctness rule for render; `memo` is an optional shallow bail-out that assumes purity.”

## Interview questions

1. **Spoken:** Same inputs → same output, no render-time side effects. Needed so React can re-run or discard render safely, and so memoization isn’t wrong.  
   **Follow-ups:** e.g. fetch in body; memo + external mutable → stale.

2. **Spoken:** Skips re-render if props shallow-equal; doesn’t deep-compare; unstable props defeat it; doesn’t fix impure render.

3. **Spoken:** Pure render = behavioral rule for all components. `PureComponent` = class helper with shallow `shouldComponentUpdate`.

4. **Spoken:** Component depends on something not in compared props/state; React skips render; UI stale.

5. **Spoken:** Event handlers and effect hooks (commit/after paint), not the render body.

## Connections

1. Same rule as render-vs-commit: render calculates UI; effects touch the world.
2. Fiber may restart render units — only safe if redo is idempotent/pure.
3. Performance chapter: stabilize props (`useCallback`/`useMemo`) so shallow memo works.
4. StrictMode double-render is a deliberate purity/effect-cleanup probe.
5. Pure components ⇒ deterministic snapshots for unit tests without mocking render-time I/O.
