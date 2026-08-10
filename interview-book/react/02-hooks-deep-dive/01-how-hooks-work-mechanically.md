# 01. How hooks work mechanically

> Source: `interview-prep/react/02-hooks-deep-dive.md`

### The linked-list mental model

Each function component instance has an associated **fiber**, and that fiber holds a **linked list of hook objects** in `memoizedState`. Every hook call (`useState`, `useEffect`, etc.) inside that component corresponds to one node in that list, **in the exact order they're called**.

```javascript
// Roughly what a fiber's hook list looks like after:
// const [a, setA] = useState(0);
// useEffect(() => {...}, [a]);
// const ref = useRef(null);

fiber.memoizedState = {
  memoizedState: 0,              // useState's value
  next: {
    memoizedState: { deps: [0], destroy: fn },  // useEffect's record
    next: {
      memoizedState: { current: null },          // useRef's record
      next: null,
    },
  },
};
```

On every re-render, React walks this list **in order** and matches each hook call to its corresponding slot by **position**, not by name or any other identifier. This is the entire reason the Rules of Hooks exist.

### Why hooks must be called unconditionally, in the same order, every render

If you conditionally skip a hook call:

```jsx
function Bad({ shouldTrack }) {
  const [name, setName] = useState('');
  if (shouldTrack) {
    useEffect(() => { track(name); }, [name]);  // BAD: conditional hook call
  }
  const ref = useRef(null);
  return <input value={name} onChange={e => setName(e.target.value)} ref={ref} />;
}
```

If `shouldTrack` changes between renders, the position of the `useRef` call in the list shifts - React would try to read `ref`'s value from whatever slot the `useEffect` used to occupy (or vice versa), silently corrupting hook state. React actually detects many such mismatches at the dev-mode "rendered fewer/more hooks than expected" error, but the underlying mechanism is exactly this positional linked list.

### Interview question

**Q: Why can't hooks be called conditionally or inside loops?**

> "React tracks hooks per component as an ordered linked list on the fiber, matched by call position across renders - not by name. If a hook call is skipped conditionally, every hook after it shifts position, and React reads the wrong hook's stored state for each subsequent slot. The rule exists because hooks have no other identity mechanism; call order *is* their identity."

---
