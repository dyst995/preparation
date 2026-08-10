# 02. useMemo - memoizing computed values

> Source: `interview-prep/react/04-performance-patterns.md`

### What it does

Recomputes a value only when its dependency array changes; otherwise returns the cached value from the previous render.

```jsx
const sortedItems = useMemo(() => {
  return [...items].sort((a, b) => a.value - b.value);
}, [items]);
```

### Two distinct reasons to use `useMemo` (know both - they're often conflated)

1. **Avoid expensive recomputation** - the naive reason most people learn first. Only matters if the computation is *actually* expensive (sorting/filtering thousands of items, heavy math) - for trivial computations, `useMemo`'s own bookkeeping overhead can exceed the cost of just recomputing.
2. **Preserve referential identity** - even for a *cheap* computation, if the resulting object/array is passed as a prop to a `memo`-wrapped child (or used as another hook's dependency), a new reference every render defeats that downstream memoization regardless of how "expensive" the computation itself is.

```jsx
// Here, `useMemo` isn't about computation cost (trivial) - it's about keeping the SAME array
// reference across renders so <List items={visibleItems} /> (wrapped in memo) doesn't
// re-render every time Parent re-renders for unrelated reasons.
const visibleItems = useMemo(() => items.filter(i => i.visible), [items]);
```

### Interview question

**Q: Is `useMemo` only for expensive computations?**

> "No - there are two separate reasons. One is avoiding recomputation cost for genuinely expensive work. The other, often more impactful in practice, is preserving referential equality so a memoized child component or another hook's dependency array doesn't see a 'new' value every render even when the underlying data hasn't logically changed. A cheap `.filter()` call might still deserve `useMemo` purely to keep the resulting array's reference stable for a `memo`-wrapped consumer."

---
