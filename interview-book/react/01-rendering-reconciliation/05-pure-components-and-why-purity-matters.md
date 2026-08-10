# 05. Pure components and why purity matters

> Source: `interview-prep/react/01-rendering-reconciliation.md`

### What "pure" means for a component

A component is **pure** if, given the same props (and same context/state it reads), it always renders the same output and produces **no observable side effects during render** (no mutating external variables, no network calls, no DOM writes, no `Math.random()`/`Date.now()` used to change output non-deterministically without being derived from props/state, no relying on shared mutable module-level state written elsewhere).

### Why this matters mechanically, not just stylistically

1. **Correctness under Strict Mode / concurrent rendering** - React may invoke your render function multiple times for one commit (double-invoking in dev `StrictMode`, or throwing away a paused render mid-way in concurrent mode). Impure renders produce different results or duplicate side effects across those extra invocations.
2. **Enables safe bail-out optimizations** - `React.memo`, `PureComponent`, and `useMemo`/`useCallback` all rely on the assumption that "same inputs -> same output" to safely skip re-rendering or recomputation. If a component secretly depends on something outside its props/state (a module-level mutable variable, a ref read during render, etc.), memoization can produce **stale UI** - a real, hard-to-debug class of bug.
3. **Predictability for testing** - pure render functions are trivially testable (input -> output, no mocking side effects needed).

### Common purity violations (call these out - real interview gotchas)

```jsx
// VIOLATION 1: mutating a variable outside the component during render
let renderCount = 0;
function Bad() {
  renderCount++;              // side effect during render - breaks under StrictMode double-invoke
  return <div>{renderCount}</div>;
}

// VIOLATION 2: reading and mutating a ref's value directly in render logic
function Bad2({ items }) {
  const cache = useRef({});
  cache.current[items.length] = items;   // mutation during render - not observably safe
  return <List items={items} />;
}

// VIOLATION 3: non-deterministic output not derived from props/state
function Bad3() {
  return <div>{Math.random()}</div>;      // different output every render call, even with same props
}
```

**Fixes:** move `renderCount`-like tracking into `useEffect` (or `useRef` incremented in an effect, not render); compute derived values with `useMemo` instead of mutating a ref during render; generate random values once via `useState(() => Math.random())` or `useRef` initialized lazily so it's stable across re-renders unless intentionally regenerated.

### `PureComponent` and `React.memo` - what they actually do

- **`class extends React.PureComponent`** - implements `shouldComponentUpdate` with a **shallow prop and state comparison**; skips re-render if all props/state are shallow-equal to the previous render.
- **`React.memo(Component)`** - the function-component equivalent; wraps a component so React skips re-rendering it if its props are shallow-equal to last time (you can pass a custom comparator as the second argument).

**Both only compare shallowly** - a new object/array/function reference passed as a prop (even with identical contents) will be considered "different," defeating the memoization. This is why `useMemo`/`useCallback` exist alongside `memo` (see chapter 04).

```jsx
const Row = React.memo(function Row({ item, onSelect }) {
  return <li onClick={() => onSelect(item.id)}>{item.text}</li>;
});

// Parent must keep `onSelect` reference stable (useCallback) or memo is defeated:
const onSelect = useCallback((id) => setSelectedId(id), []);
```

### Interview question

**Q: What does it mean for a component to be pure, and why does React care?**

> "Pure means the same props/state always produce the same rendered output, with no observable side effects during the render call itself. React relies on this to safely re-invoke render functions multiple times - for `StrictMode` dev checks, or when concurrent rendering pauses and resumes work - without producing inconsistent results or duplicated side effects. It's also the precondition for `memo`/`PureComponent` and `useMemo` to safely skip work: if a component secretly reads something outside props/state, memoization can serve stale output."

---
