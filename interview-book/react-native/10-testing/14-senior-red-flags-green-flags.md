# 14. Senior red flags / green flags

> Source: `interview-prep/react-native/10-testing.md`

### Green flags interviewers love
- Framing testing decisions around *risk*, not coverage percentage.
- Knowing to mock the network layer for React Query tests rather than mocking the library itself.
- Distinguishing gray-box (Detox) from black-box (Maestro) E2E approaches correctly.
- Prioritizing money-math and idempotency tests first, unprompted, when asked "what would you test first."
- Knowing `getStateFromPath` exists for fast deep-link unit testing instead of "you'd need full E2E for that."

### Red flags
- "We aim for 100% coverage" with no mention of risk prioritization.
- Mocking React Query's hooks directly instead of the network layer beneath them.
- No plan for testing native-module-dependent code at all ("we just don't test that part").
- Treating E2E as the primary testing strategy (slow, flaky, expensive to maintain at scale).
- Brittle snapshot tests everywhere, with "just update the snapshot" as the default fix reflex.

---
