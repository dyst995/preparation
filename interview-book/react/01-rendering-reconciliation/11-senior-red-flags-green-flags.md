# 11. Senior red flags / green flags

> Source: `interview-prep/react/01-rendering-reconciliation.md`

### Green flags interviewers love
- Distinguishing "re-render" (function called) from "DOM update" (commit changed something) precisely.
- Explaining *why* keys matter via the state-attachment failure mode, not just "React said to add one."
- Knowing render phase must be pure and *why* (multiple invocation possibility), not just "don't put side effects in render."
- Connecting Fiber to interruptibility/concurrency, not describing it as "just a rewrite."

### Red flags
- "Virtual DOM is always faster than real DOM" with no nuance.
- "Keys are just to make the warning go away."
- Describing `useEffect` running twice in `StrictMode` as a bug to work around instead of a signal to fix cleanup.
- Confusing reconciliation (the algorithm) with the virtual DOM (the data structure) as if they're the same thing.

---
