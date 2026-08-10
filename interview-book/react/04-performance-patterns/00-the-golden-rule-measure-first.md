# 00. The golden rule: measure first

> Source: `interview-prep/react/04-performance-patterns.md`

Every senior-level answer about performance should start here. Premature memoization is a real cost (it adds code complexity, an extra comparison on every render, and can silently mask correctness bugs like stale closures inside a wrongly-scoped `useMemo`), and it very often optimizes something that was never the bottleneck.

### The methodology

1. **Identify a real, observed symptom** - janky scroll, slow typing, slow navigation, high Time to Interactive - not a hypothetical.
2. **Profile** (React DevTools Profiler, Chrome Performance tab) to find *which* component/work is actually expensive.
3. **Form a hypothesis** about the cause (unnecessary re-renders? expensive computation? too much DOM? network waterfall?).
4. **Apply the smallest targeted fix.**
5. **Re-measure** to confirm the fix actually helped - and didn't just move the problem.

### Interview question

**Q: How do you approach a performance problem in a React app?**

> "I don't guess - I profile first. I reproduce the specific symptom, use the React DevTools Profiler or the browser's Performance tab to see what's actually expensive - excessive re-renders, a slow computation, layout thrashing, or a network waterfall - and only then apply a targeted fix. Then I re-measure to confirm it actually helped. Sprinkling `useMemo`/`useCallback` everywhere upfront usually adds complexity without addressing the real bottleneck, and can even hurt readability and introduce stale-closure bugs."

---
