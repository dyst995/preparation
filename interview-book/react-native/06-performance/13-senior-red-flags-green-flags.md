# 13. Senior red flags / green flags

> Source: `interview-prep/react-native/06-performance.md`

### Green flags interviewers love
- Every optimization claim is paired with a measurement method and a before/after
- Can explain *why* a specific FlatList prop helps, not just recite the prop names
- Knows memoization is not free and can hurt
- Distinguishes "the app feels slow" (needs triage) from "I know exactly which frame budget is blown"
- Ties fixes to real production crash/perf numbers (your 20%?0.03%, 15%?0.09%, 28%?0.15% reductions)

### Red flags
- "Just wrap everything in `useMemo`/`React.memo`" with no measurement
- Confusing FlatList virtualization with lazy-loading images (different concerns)
- Claiming Reanimated is "always better" than `Animated` without explaining the worklet/UI-thread reason
- No mention of profiling tools at all � pure guesswork answers
- Optimizing without ever discussing tradeoffs (memory vs CPU vs code complexity)

---
