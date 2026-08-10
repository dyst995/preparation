# 05. Section D - Performance

> Source: `interview-prep/react/06-interview-questions.md`

**D1. What's your methodology for a performance problem?**
> Reproduce the specific symptom, profile (React DevTools Profiler / Chrome Performance tab) to find the actual bottleneck, form a hypothesis, apply the smallest targeted fix, re-measure to confirm - never guess-and-memoize upfront.

**D2. Why might `React.memo` fail to prevent a re-render even when applied correctly on the child?**
> `memo`'s comparison is shallow; if the parent passes a new object/array/function reference every render (inline literals), the child sees "different" props every time regardless of content equality, defeating memoization. The parent must keep those references stable via `useMemo`/`useCallback`.

**D3. Give two distinct reasons to use `useMemo`.**
> (1) Avoid recomputing a genuinely expensive calculation; (2) preserve referential identity of a resulting object/array so a `memo`-wrapped child or another hook's dependency array doesn't see a "new" value every render, even for a cheap computation.

**D4. When does `useCallback` provide zero benefit?**
> When the function isn't consumed by anything reference-sensitive - i.e., not passed to a `memo`-wrapped component and not used as another hook's dependency. Wrapping it still costs a dependency comparison for no payoff.

**D5. When do you actually need list virtualization?**
> When list size (hundreds-to-thousands+ of rows, especially with non-trivial row content) makes rendering every row measurably expensive - confirmed by profiling, not assumed. Tradeoffs: often needs known/estimated row heights, complicates native find-in-page/scrollbar behaviors, and adds implementation complexity.

**D6. Route-based splitting vs component-level splitting - which is higher leverage by default?**
> Route-based splitting is usually the highest-leverage default since users only download code for the page they're visiting. Component-level splitting is valuable for heavy, conditionally-shown UI (rich editors, charting libraries, rarely-used admin panels) layered on top of route splitting.

**D7. What's a request waterfall, and how do you tell accidental from necessary?**
> Requests that could run in parallel run sequentially instead. Accidental waterfalls come from component nesting/mount order with no real data dependency between the requests (fix: fetch in parallel using params already available). Necessary ones exist when one query genuinely needs another's result (fix: explicit gating, e.g., React Query's `enabled`, not blind restructuring).

**D8. What problem does `useTransition` solve that plain debouncing doesn't?**
> Debouncing delays work by a fixed timer regardless of device capability. `useTransition` marks an update as low priority so React's scheduler can interleave it with more urgent work and abandon a stale transition entirely if superseded - adapting to actual rendering cost rather than a guessed delay.

**D9. Is a faster raw computation always the right performance fix?**
> No - perceived performance (skeleton screens, optimistic UI, instant click feedback, avoiding layout shift) often matters more to users than shaving milliseconds off actual computation; both are worth measuring and addressing.

---
