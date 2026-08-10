# 04. Mocking React Navigation

> Source: `interview-prep/react-native/10-testing.md`

### Topics to learn
- [ ] Wrapping components under test in a real `NavigationContainer` for integration-style tests vs mocking `useNavigation`/`useRoute` for pure unit-style component tests
- [ ] Asserting navigation calls with `jest.fn()` mocks on `navigate`/`goBack`
- [ ] Testing screens that consume route params
- [ ] Testing linking/deep-link config without a full E2E harness (see section 10)

### Two approaches compared

| Approach | When to use |
|---|---|
| Mock `useNavigation()` to return `{ navigate: jest.fn(), ... }` | Testing a single component in isolation � assert it *calls* navigate with the right args, without needing a real navigator tree |
| Render inside a real `NavigationContainer` + actual navigator | Integration tests verifying an entire flow actually transitions screens correctly, not just that a function was called |

```tsx
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));
```

### Interview question

**Q: How do you test that tapping a transaction row navigates to the details screen?**

> "For a focused unit test, I mock `useNavigation` and assert `navigate` was called with `'TransactionDetails'` and the correct id param � that's fast and isolates the component's responsibility. For a broader integration test, I'd render the actual navigator stack inside a real `NavigationContainer`, tap the row, and assert the details screen's content actually appears � that catches wiring bugs (wrong screen name, missing param) that a pure mock-based test can't."

---
