# 05. Mocking React Query

> Source: `interview-prep/react-native/10-testing.md`

### Topics to learn
- [ ] Fresh `QueryClient` per test (disable retries and set short/zero cache times to avoid cross-test bleed and slow tests)
- [ ] Wrapping the component under test in a real `QueryClientProvider`
- [ ] Mocking the network layer (fetch/axios) rather than mocking React Query's internals � keeps tests realistic
- [ ] Using MSW (Mock Service Worker) for request-level mocking as an alternative to manually mocking fetch/axios
- [ ] Testing loading/error/success states by controlling what the mocked network call resolves/rejects with
- [ ] Testing mutation + cache invalidation together (e.g. after a transfer mutation succeeds, does the balance query refetch/update?)

```tsx
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function renderWithProviders(ui: React.ReactElement) {
  const client = createTestQueryClient();
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}
```

### Interview question

**Q: How do you mock native modules in Jest, and separately, how do you mock React Query?**

> "For React Query, I don't mock the library itself � I give each test a fresh `QueryClient` with retries disabled so failing-request tests don't hang or retry needlessly, wrap the component in a real `QueryClientProvider`, and mock at the network layer instead, either manually mocking fetch/axios or using MSW to intercept requests. That way I'm testing real React Query cache/invalidation/mutation behavior, just with a fake backend response, which is much more representative than mocking the hooks themselves."

---
