# React.memo — What It Does and Its Real Cost

## What you need to know

`React.memo` is a **higher-order component** that wraps a function component so React can **skip calling that component’s render function** when its props are equal to the previous render’s props.

Default equality is **shallow**: each prop compared with `Object.is`. New object / array / function references defeat memo even if contents look the same.

`memo` is an optimization with a **real cost** (prop comparison every time the parent renders). Use it when a component is **expensive** and often re-renders with **unchanged** props — not by default on every component.

Prerequisites: [re-render vs DOM](../8.%20rerender-vs-dom/notes.md), [pure components](../5.%20pure-components/notes.md), [batching](../6.%20batching/notes.md). Related upcoming: `useMemo` / `useCallback` (same chapter — parent must stabilize references for `memo` to win).

---

## What `React.memo` does (preserved)

```jsx
const ExpensiveRow = React.memo(function ExpensiveRow({ item }) {
  // expensive rendering logic
  return <li>{item.name}</li>;
});
```

When the parent re-renders:

1. React prepares new props for `ExpensiveRow`.
2. `memo` compares new props vs previous props (shallow, or custom `arePropsEqual`).
3. If equal → **skip** calling `ExpensiveRow` (bail out of that subtree’s render work from this component down, as long as children aren’t forced another way).
4. If not equal → render normally.

**Important:** Skipping *render* is not the same as skipping *commit* of the whole app. Parent still rendered; siblings may still render. `memo` only protects **this** wrapped component (and what it would have rendered) from that parent-driven update.

---

## Shallow equality and `Object.is`

Default: for each prop key, `Object.is(prevProp, nextProp)`.

| Compared | Equal? |
| --- | --- |
| `1` and `1` | yes |
| `NaN` and `NaN` | yes (`Object.is`) |
| `{}` and `{}` (two literals) | **no** — different references |
| `() => {}` and `() => {}` | **no** |
| same state value / same memoized ref | yes |

So “same looking” props are not enough — **identity** matters for objects, arrays, and functions.

---

## The shallow-equality trap (preserved)

```jsx
function Parent() {
  const [count, setCount] = useState(0);
  // New object + new function every Parent render → memo always loses
  return (
    <ExpensiveRow
      item={{ name: 'Static' }}
      onClick={() => console.log('click')}
    />
  );
}
```

Every `Parent` render creates new `item` and `onClick` references → shallow compare fails → `ExpensiveRow` re-renders anyway.

**Fix on the parent** (stabilize references), or remove the prop:

```jsx
function Parent() {
  const [count, setCount] = useState(0);
  const item = useMemo(() => ({ name: 'Static' }), []);
  const onClick = useCallback(() => console.log('click'), []);
  return <ExpensiveRow item={item} onClick={onClick} />;
}
```

Or better structurally: don’t pass a callback if the child can own the handler / use a stable context action / colocate state so parent doesn’t re-render the list for unrelated `count`.

**`memo` on the child alone accomplishes nothing** if the parent keeps recreating props. Classic “why doesn’t memo work?” bug.

---

## Custom comparator (second argument)

```jsx
const Row = React.memo(
  function Row({ item }) {
    return <li>{item.name}</li>;
  },
  (prev, next) => prev.item.id === next.item.id && prev.item.name === next.item.name,
);
```

Return **`true` if props are equal** (skip render) — same sense as `shouldComponentUpdate` inverted from “did change”. Easy to get wrong; prefer fixing prop stability over deep custom compares unless measured.

Custom comparators that deep-equal large trees can **cost more** than rendering.

---

## When `memo` is worth it (preserved)

Both usually required:

1. Component is **expensive to render** (large subtree, heavy work in render), **and**
2. It **often re-renders with unchanged props** (list row while parent updates for unrelated reasons; sibling of hot state).

Examples: virtualized-adjacent heavy rows, chart widgets next to a typing input in the same parent, static sidebar sections under a frequently updating shell.

---

## When `memo` is a waste or harmful (preserved)

- Component is **cheap** (`<span>{text}</span>`) — comparison ≥ render cost.
- Props **always** change when parent renders — memo never hits.
- Cargo-cult: wrap everything, then “fix” broken memo by spraying `useMemo`/`useCallback` upstream with **no profile** — complexity, stale-closure risk, no measured win.

Golden rule from this chapter: **measure first**.

---

## What `memo` does *not* do

- Does **not** stop the component from rendering when **its own** state or context value changes.
- Does **not** deep-compare props by default.
- Does **not** replace fixing **over-broad state** (lifting too high so parents re-render constantly). Often the better fix is colocation / splitting state, not memo walls.
- Does **not** make impure render safe — if you mutate props/state during render, bailouts become wrong.

---

## `children` and memo

```jsx
const Frame = React.memo(function Frame({ children }) {
  return <div className="frame">{children}</div>;
});

function Parent() {
  const [n, setN] = useState(0);
  return (
    <Frame>
      <p>static</p> {/* new element object every Parent render */}
    </Frame>
  );
}
```

`children` is usually a **new React element reference** each parent render → `Frame`’s memo often **fails** unless `children` is stabilized or the pattern changes. Don’t assume wrapping a layout shell in `memo` helps when it always receives fresh `children`.

---

## Prediction example

```jsx
const Child = React.memo(function Child({ label }) {
  console.log('Child render', label);
  return <span>{label}</span>;
});

function Parent() {
  const [count, setCount] = useState(0);
  return (
    <>
      <button onClick={() => setCount((c) => c + 1)}>{count}</button>
      <Child label="hi" />
    </>
  );
}
```

Clicking the button: `Parent` re-renders; `label` is the same primitive `'hi'` → `Child` **skipped** (no `Child render` log). Change to `label={{ text: 'hi' }}` inline → Child logs every click.

---

## Interview answer (preserved)

**Q: You wrapped a component in `React.memo` but it still re-renders every time. Why?**

> “Almost always because at least one prop is a new reference every render — an inline object, array, or arrow function created in the parent’s render body. `memo`’s default comparison is shallow, so a new reference is ‘different’ even with identical contents. The fix is making the parent pass stable references via `useMemo`/`useCallback`, or restructuring so that prop isn’t necessary at all — for example, moving state closer to where it’s used instead of passing a callback down.”

---

## Common mistakes and misconceptions

1. `memo` = “never re-renders” (own state/context still update).  
2. Expecting deep equality by default.  
3. Memoizing cheap leaves.  
4. Fixing the child only while parent recreates props.  
5. Confusing `memo` (component) with `useMemo` (value) / `useCallback` (function).  
6. Custom comparator returning the wrong boolean sense.  
7. Using `memo` to paper over a parent that should not own hot state.

---

## Connections to other concepts

```
parent re-renders
  → children re-render by default
  → React.memo can bail out if props shallow-equal

unstable props (inline {} / () => {})
  → defeat memo
  → useMemo / useCallback on parent OR restructure

PureComponent (class) ≈ memo (function)
  → same shallow prop idea

measure first
  → only memo when Profiler shows wasteful re-renders of expensive subtrees
```

---

## Interview perspective

Be ready to:

1. Exact bailout condition (shallow / custom).  
2. Why inline objects/functions defeat it.  
3. When memo helps vs wastes.  
4. `memo` vs `useMemo` vs `useCallback`.  
5. Prefer structural fixes (colocate state) over memo walls.  
6. Tie answers to **profiling**, not guesswork.

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
