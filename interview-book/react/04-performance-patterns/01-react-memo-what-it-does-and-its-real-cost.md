# 01. React.memo - what it does and its real cost

> Source: `interview-prep/react/04-performance-patterns.md`

### What it does

Wraps a component so React **skips calling its render function entirely** if its props are shallow-equal to the previous render (or equal per a custom comparator you supply as the second argument).

```jsx
const ExpensiveRow = React.memo(function ExpensiveRow({ item }) {
  // expensive rendering logic
  return <li>{item.name}</li>;
});
```

### The shallow-equality trap

`memo`'s default comparison is **shallow** - it compares each prop with `Object.is`. A new object/array/function reference (even with identical contents) counts as "different," defeating the memoization.

```jsx
function Parent() {
  const [count, setCount] = useState(0);
  // New object literal + new arrow function on EVERY Parent render -> memo is defeated every time.
  return <ExpensiveRow item={{ name: 'Static' }} onClick={() => console.log('click')} />;
}
```

Fixing this requires the *parent* to keep those references stable (`useMemo` for the object, `useCallback` for the function) - **`memo` on the child alone accomplishes nothing** if the parent keeps recreating its props from scratch. This is a very common "why doesn't `memo` work" bug.

### When `memo` is worth it

- The component is **expensive to render** (large subtree, expensive computation in render) AND
- It **re-renders often with unchanged props** (e.g., a list row when the parent re-renders for unrelated reasons, or a sibling of frequently-changing state).

### When `memo` is a waste (or actively harmful)

- The component is cheap to render (a `<span>{text}</span>`) - the shallow comparison itself costs more than just re-rendering would.
- Its props change on every render anyway (memoization can never pay off).
- It leads developers to "fix" a `memo` that isn't working by memoizing unrelated things upstream, spreading complexity for no measured benefit.

### Interview question

**Q: You wrapped a component in `React.memo` but it still re-renders every time. Why?**

> "Almost always because at least one prop is a new reference every render - an inline object, array, or arrow function created in the parent's render body. `memo`'s default comparison is shallow, so a new reference is 'different' even with identical contents. The fix is making the parent pass stable references via `useMemo`/`useCallback`, or restructuring so that prop isn't necessary at all - for example, moving state closer to where it's used instead of passing a callback down."

---
