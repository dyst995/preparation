# 04. Profiling with React DevTools

> Source: `interview-prep/react/04-performance-patterns.md`

### The Profiler tab workflow

1. Open React DevTools -> Profiler tab.
2. Click record, perform the interaction you're investigating (a click, a scroll, a keystroke), stop recording.
3. Inspect the **flame graph** / **ranked chart**:
   - Each bar is a component that rendered during that commit.
   - Bar width/color intensity indicates render duration.
   - Gray bars = component **did not re-render** in that commit (bailed out, e.g. via `memo`).
4. Click a component to see **why it rendered** (React DevTools can show "props changed," "state changed," "hooks changed," or "parent re-rendered" as the reason, depending on version).
5. Look for: components rendering far more often than expected, components taking disproportionate time, or a cascade where one state update re-renders a huge subtree unnecessarily.

### What to look for specifically

| Symptom in Profiler | Likely cause | Typical fix |
|---|---|---|
| A component renders on every keystroke in an unrelated input | State is too high in the tree (search input state lives in a shared parent above unrelated siblings) | Move state down; colocate it closer to where it's used |
| A large subtree re-renders every time a single leaf's local counter changes | No memoization boundary + non-memoized intermediate components pass through re-renders | Add `React.memo` at a strategic boundary; verify props passed are stable |
| One commit takes a long time in a single component | Expensive synchronous computation in render (no memoization) or a huge unvirtualized list | `useMemo` the computation; virtualize the list |
| Many small commits in rapid succession | Multiple `setState` calls not batching as expected (e.g., across microtask boundaries in older React, or from multiple independent sources) | Investigate batching; consolidate state updates or verify React 18's automatic batching applies to the context you're in |

### Interview question

**Q: Walk me through how you'd investigate "this page feels slow" using React DevTools.**

> "First I reproduce the specific interaction that feels slow with the Profiler recording. I look at the flame graph for that commit - which components rendered, how long each took, and whether components that shouldn't have re-rendered did. If I see a big subtree re-rendering because of an unrelated state change, I look at where that state lives and whether it should be colocated lower in the tree, or whether a `memo` boundary with stable props would stop the cascade. If instead one component itself is slow (not a re-render count problem, but a duration problem), I look inside it for expensive unmemoized computation, or check the Chrome Performance tab for layout thrashing or a huge unvirtualized list."

---
