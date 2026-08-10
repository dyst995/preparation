# 10  Testing — Introduction

> Source: `interview-prep/react-native/10-testing.md`

> Goal: Be able to design a pragmatic testing strategy for a React Native fintech app � unit tests, component tests, mocked native modules, integration tests for critical money flows, and E2E awareness � and defend *why* you test what you test, not just *how*.

Mark progress with `[x]` as you master each topic.

---

## Learning objectives

By the end of this section you should be able to:

1. Explain the testing pyramid as it applies specifically to React Native.
2. Write and defend Jest unit tests for hooks, stores (Zustand), and pure utils (money formatting, validation).
3. Write React Native Testing Library (RNTL) tests that query like a user, not like an implementation detail.
4. Mock React Navigation, React Query, and native modules (Notifee, FCM, Keychain, biometrics) cleanly.
5. Identify which flows deserve integration-level coverage in a fintech app and why.
6. Speak intelligently about Detox and Maestro even without deep hands-on depth.
7. Prioritize what to test first under time pressure in a money-moving app.
8. Test deep linking logic without a full E2E harness.
9. Keep a test suite stable as UI changes frequently.

---
