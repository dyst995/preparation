# 02. Jest unit tests

> Source: `interview-prep/react-native/10-testing.md`

### Topics to learn
- [ ] RN Jest preset (`preset: 'react-native'` or framework-specific preset e.g. Expo's) and why it's needed (mocks native bits automatically)
- [ ] Testing pure utility functions (money formatting, validation, date helpers) with no rendering involved
- [ ] Testing custom hooks with `renderHook` (from RNTL or `@testing-library/react-hooks` depending on version)
- [ ] Testing Zustand stores directly (they're just functions/objects � test the store logic without rendering anything)
- [ ] Testing React Query mutations/queries logic in isolation vs testing them through components
- [ ] Snapshot tests � when they're useful (rarely, for rarely-changing pure output) and when they're a trap (encourages "update snapshot" reflexively without reading the diff)

### Testing a Zustand store directly

```ts
import { useWalletStore } from './walletStore';

beforeEach(() => {
  useWalletStore.setState(useWalletStore.getInitialState());
});

test('debits the wallet balance after a successful transfer', () => {
  useWalletStore.getState().setBalance(10000); // cents
  useWalletStore.getState().applyTransfer(2500);
  expect(useWalletStore.getState().balance).toBe(7500);
});
```

Key point: Zustand stores are plain JS state containers � you don't need to render a component to test their logic. Reset state between tests (`setState(initialState)`) to avoid cross-test leakage, since the store is a singleton by default.

### Testing a custom hook

```ts
import { renderHook, act } from '@testing-library/react-native';
import { useCountdown } from './useCountdown';

test('counts down to zero and calls onComplete', () => {
  const onComplete = jest.fn();
  const { result } = renderHook(() => useCountdown(3, onComplete));

  act(() => jest.advanceTimersByTime(3000));

  expect(result.current.value).toBe(0);
  expect(onComplete).toHaveBeenCalledTimes(1);
});
```

### Interview question

**Q: How do you unit test a Zustand store or a React Query mutation?**

> "For Zustand, since the store is just a function-backed object, I test it directly � call actions, assert on `getState()`, and reset state between tests since the store persists as a module-level singleton across test files otherwise. For React Query, I test the mutation function itself in isolation when the logic is complex enough to warrant it, and separately test how a component reacts to loading/success/error mutation states by wrapping it in a real `QueryClientProvider` with a fresh `QueryClient` per test and mocking the network layer (fetch/axios) rather than mocking React Query itself, so I'm testing real cache/retry/invalidation behavior, not a fake."

---
