# 12. Senior red flags / green flags

> Source: `interview-prep/react/02-hooks-deep-dive.md`

### Green flags interviewers love
- Explaining hooks via the "linked list matched by call order" model, not just "it's magic React does."
- Immediately reframing a "why is my effect firing twice/looping" bug in terms of dependency array + closure correctness.
- Applying the effects-vs-events distinction unprompted when reviewing a `useEffect`-heavy code sample.
- Knowing exactly when `useLayoutEffect` is *necessary* (not just "it's the sync version").

### Red flags
- "I just add `// eslint-disable-next-line react-hooks/exhaustive-deps` when it complains."
- Treating `useEffect` as a general "do this after render" hook for any logic, including direct responses to clicks/submits.
- Not knowing that refs don't trigger re-renders, or using state where a ref was clearly correct (e.g., storing a timer ID in `useState`).
- Believing custom hooks share state across call sites by default.

---
