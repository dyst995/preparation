# 03. React Native Testing Library (RNTL)  component tests

> Source: `interview-prep/react-native/10-testing.md`

### Topics to learn
- [ ] Philosophy: test what the user sees/does, not internal implementation details
- [ ] Query priority: `getByRole` / `getByText` / `getByLabelText` (accessibility-driven) over `getByTestId` where possible; `testID` as a pragmatic fallback for RN where accessibility queries are sometimes awkward
- [ ] `render`, `screen`, `fireEvent` vs the more realistic `userEvent` API
- [ ] Async assertions: `findBy*`, `waitFor` for state that updates after a promise/microtask
- [ ] Avoiding testing implementation details (internal state, private functions) � test observable behavior
- [ ] Custom render wrapper providing all app providers (theme, navigation, query client) so every test doesn't repeat boilerplate

### Query strategy priority

| Priority | Query | Why |
|---|---|---|
| 1 (best) | `getByRole`, `getByLabelText` | Matches how a real user/screen-reader identifies the element; resilient to internal refactors |
| 2 | `getByText` | Good for user-visible copy; brittle if copy changes often, which is a signal � not always a flaw |
| 3 (pragmatic fallback) | `getByTestId` | Useful in RN where accessibility roles are sometimes inconsistent across platforms; use deliberately, not as a first reach |

### Example component test

```tsx
import { render, screen, userEvent } from '@testing-library/react-native';
import { AmountInput } from './AmountInput';

test('formats entered digits as currency', async () => {
  const user = userEvent.setup();
  render(<AmountInput currency="USD" />);

  await user.type(screen.getByLabelText('Amount'), '1050');

  expect(screen.getByText('$10.50')).toBeOnTheScreen();
});
```

### Interview question

**Q: What's your philosophy for choosing queries in RNTL tests?**

> "I prioritize queries that match how a real user or assistive technology finds an element � `getByRole` and `getByLabelText` � because they're resilient to internal refactors and they double-check accessibility is actually wired up correctly. `getByText` is fine for visible copy, though I accept that changing copy will break those tests, which is a reasonable signal, not a flaw. `getByTestId` I use pragmatically where RN's cross-platform accessibility tree makes role/label queries awkward, but I don't reach for it first, since it doesn't verify anything about how a real user or screen reader would actually interact with the element."

---
