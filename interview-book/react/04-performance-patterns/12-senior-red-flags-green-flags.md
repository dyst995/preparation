# 12. Senior red flags / green flags

> Source: `interview-prep/react/04-performance-patterns.md`

### Green flags interviewers love
- "I profile before optimizing" stated and demonstrated with a concrete methodology, not just as a slogan.
- Correctly diagnosing that `memo` failed because of an unstable prop reference from the parent, not blaming `memo` itself.
- Distinguishing accidental (structural) waterfalls from necessary (data-dependent) ones.
- Bringing up perceived performance techniques unprompted (skeletons, optimistic UI, avoiding layout shift).

### Red flags
- Wrapping every component in `memo`/`useMemo`/`useCallback` "just in case," with no measurement.
- Treating virtualization as something every list needs by default.
- Not knowing the difference between route-based and component-level code splitting.
- Confusing debouncing with `useTransition` as interchangeable solutions to the same problem.

---
