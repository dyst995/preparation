# 12. Full interview question bank (with answer targets)

> Source: `interview-prep/react-native/10-testing.md`

### Strategy
1. **How do you decide how much to test at each layer?** ? risk-based, not coverage-percentage-based.
2. **What's your testing pyramid for a React Native fintech app?**
3. **What would you test first under time pressure?** ? money math ? auth ? idempotency ? core flows ? navigation ? everything else.

### Jest/unit
4. **How do you unit test a Zustand store?** ? test directly, reset state between tests.
5. **How do you test a custom hook?** ? `renderHook` + `act` for timers/state updates.
6. **When are snapshot tests useful vs a trap?**

### RNTL/component
7. **What's your query priority in RNTL, and why?** ? role/label first, testID as pragmatic fallback.
8. **How do you test async UI updates (e.g. after a promise resolves)?** ? `findBy*` / `waitFor`.

### Mocking
9. **How do you mock React Navigation for a unit test vs an integration test?**
10. **How do you mock React Query without mocking React Query itself?** ? mock the network layer, use a real `QueryClient`.
11. **How do you mock Notifee/FCM/biometrics in Jest?** ? `jest.mock` / `__mocks__`, simulate success and failure paths.

### Integration & E2E
12. **What deserves integration-level coverage in a payments app?**
13. **Detox vs Maestro � key differences?**
14. **Why keep E2E tests few and targeted?**

### Deep links
15. **How do you test deep linking without full E2E?** ? `getStateFromPath` unit tests + payload validation unit tests + a couple of E2E smoke tests for killed-state cold start.

### Stability
16. **How do you keep tests stable when UI changes often?** ? behavior/role-based queries, avoid brittle snapshots, fake timers, disabled animations.

---
