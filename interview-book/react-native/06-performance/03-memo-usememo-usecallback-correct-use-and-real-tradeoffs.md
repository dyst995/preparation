# 03. memo, useMemo, useCallback  correct use and real tradeoffs

> Source: `interview-prep/react-native/06-performance.md`

### Topics to learn
- [ ] `React.memo` shallow prop comparison and when it helps
- [ ] `useMemo` for expensive computations vs referential stability
- [ ] `useCallback` for stable function identity (mainly to satisfy memoized children or dependency arrays)
- [ ] The cost of memoization itself (comparison cost, memory retained)
- [ ] Why memoizing everything is an anti-pattern
- [ ] Context re-render traps and how memoization does/doesn't help
- [ ] `useMemo`/`useCallback` are not guarantees (React can discard the cache) � mental model correction

### When each actually helps

| Tool | Helps when | Doesn't help / hurts when |
|---|---|---|
| `React.memo` | Component is expensive to render and receives the same props often (e.g. list rows) | Props change almost every render anyway (comparison cost wasted); props include new object/array/function literals each render (breaks memoization silently) |
| `useMemo` | Computation is genuinely expensive (sorting/filtering large arrays, derived heavy objects) | Trivial computations � the memoization bookkeeping can cost more than recomputing |
| `useCallback` | Function is passed to a memoized child, or is a dependency of another hook (`useEffect`) that must stay stable | Used everywhere "just in case" � adds cognitive and runtime overhead with no measured benefit |

### The classic silent-break pattern

```jsx
// BAD: new object literal every render defeats React.memo on Row
<Row style={{ marginVertical: 8 }} onPress={() => onPress(item.id)} />

// BETTER: stable references
const rowStyle = useMemo(() => ({ marginVertical: 8 }), []);
const handlePress = useCallback(() => onPress(item.id), [item.id, onPress]);
<Row style={rowStyle} onPress={handlePress} />
```

Interviewers love asking about this because it's the #1 reason "I already used `React.memo` but it's still slow."

### Context re-render trap

Any component consuming a Context re-renders whenever the Context value changes � regardless of `memo` on that component, because `memo` only checks *props*, and Context isn't a prop. Fixes:
- Split Context into smaller, more granular providers (state vs dispatch, or per-domain slices).
- Memoize the Context value object itself so it doesn't get a new reference every parent render.
- Consider a selector-based state library (Zustand, Redux with selectors) for hot paths instead of Context for frequently-changing data.

### Interview question

**Q: When would `useMemo` make performance worse?**

**Strong answer:**
> "If the computation is cheap � like a simple arithmetic derivation or short array of a few items � the memoization machinery (dependency comparison, cache storage) can cost more than just recomputing every render. `useMemo` is also not a semantic guarantee in React; the cache can be dropped for memory reasons, so you shouldn't rely on it for correctness, only for performance. I reserve it for measurably expensive derivations � large list transforms, heavy formatting, or expensive selectors � and I verify with the profiler that it actually reduced render time before keeping it."

**Q: `React.memo` isn't working � why?**

**Strong answer:**
> "Usually because a prop is a new reference every render � inline object/array/style literals or inline arrow functions passed down without `useMemo`/`useCallback`, or a Context value changing underneath. `React.memo` only does a shallow prop comparison, so any of those defeats it silently with no warning. I check with React DevTools' 'why did this render' or a manual `console.log` of prop identities before assuming memoization failed for another reason."

---
