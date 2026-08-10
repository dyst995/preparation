# 01. The testing pyramid, applied to React Native

> Source: `interview-prep/react-native/10-testing.md`

### Topics to learn
- [ ] Classic pyramid: many unit tests, fewer integration tests, few E2E tests
- [ ] Why RN adds an extra axis: JS-only tests vs tests that need native module mocking
- [ ] Cost/speed/confidence tradeoffs at each layer
- [ ] Why 100% coverage is not the goal � coverage of *risk*, especially money-moving logic, is

### The RN-flavored pyramid

```
        /\
       /  \        E2E (Detox / Maestro)
      /----\        - few, slow, highest confidence, run on real/simulated devices
     /      \
    /--------\      Integration (RNTL + mocked network/native)
   /          \      - moderate count, test full screens/flows together
  /------------\
 /              \    Unit (Jest)
/________________\    - many, fast, test pure logic: utils, hooks, stores
```

| Layer | Speed | Confidence | What it catches |
|---|---|---|---|
| Unit (Jest) | Very fast (ms) | Low-to-medium alone | Logic bugs in isolated functions/hooks/stores |
| Component (RNTL) | Fast (ms�low s) | Medium | Rendering bugs, wrong text/state shown, broken interactions |
| Integration (RNTL + mocked backend/native) | Moderate | High for the flow tested | Multi-component flows breaking (e.g. form ? submit ? success screen) |
| E2E (Detox/Maestro) | Slow (seconds�minutes per test) | Highest (real app, real gestures) | Wiring issues across the whole real app, native integration bugs, regressions unit/integration tests can't see |

### Interview question

**Q: How do you decide how much to test at each layer for a React Native app?**

> "I lean heavily on unit tests for pure logic � money formatting, validation schemas, Zustand store logic, React Query mutation logic � because they're fast and pinpoint failures precisely. I use RNTL for component and integration-level tests on screens with real user-facing risk, especially anything touching money movement, auth, or navigation-critical flows, since those need to be verified as a whole, not just their parts in isolation. E2E via Detox or Maestro I reserve for a small number of true critical-path smoke tests � login, one full payment flow � because they're slow and flakier, so I don't want the bulk of my safety net depending on them. The goal isn't maximizing coverage percentage, it's covering risk: money-moving logic and auth get the most scrutiny."

---
