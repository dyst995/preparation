# 03. useCallback - memoizing function references

> Source: `interview-prep/react/04-performance-patterns.md`

`useCallback(fn, deps)` is exactly `useMemo(() => fn, deps)` - it exists as a named convenience for the extremely common case of memoizing a function.

```jsx
const handleSelect = useCallback((id) => {
  setSelectedId(id);
}, []);   // stable reference forever, since it doesn't close over anything that changes
```

### The most common mistake: using `useCallback` without a `memo`-wrapped consumer

```jsx
// Pointless - Child isn't memoized, so it re-renders with Parent regardless of whether
// onClick's reference is stable. useCallback here adds overhead for zero benefit.
function Parent() {
  const onClick = useCallback(() => {...}, []);
  return <Child onClick={onClick} />;   // Child is a plain function component, not memo()
}
```

`useCallback` only pays off when the function is:
- Passed to a `memo`-wrapped component (to avoid defeating its shallow comparison), **or**
- Used as a dependency of another hook (`useEffect`, `useMemo`) where a fresh reference every render would cause that hook to re-run unnecessarily.

### Interview question

**Q: When does `useCallback` actually make a measurable difference?**

> "Only when the function's referential stability matters to something downstream - either it's passed as a prop to a `memo`-wrapped child, where a new reference every render would defeat that memoization, or it's a dependency of another hook like `useEffect`, where a fresh reference would cause that effect to re-run every render. If the function isn't consumed by anything reference-sensitive, `useCallback` just adds a dependency-array comparison for no benefit."

---
