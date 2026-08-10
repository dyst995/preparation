# 10. Testing deep links

> Source: `interview-prep/react-native/10-testing.md`

### Topics to learn
- [ ] Testing React Navigation's `linking` config directly by feeding it a URL and asserting the resulting navigation state, without spinning up a full E2E test
- [ ] Testing the payload-validation logic (from file 09/08's routing function) as a pure unit test, independent of navigation
- [ ] E2E-level deep link testing via Detox/Maestro opening a URL against the real app (higher confidence, slower)
- [ ] Testing the killed-state cold-start path specifically, since that's the highest-risk path (see file 08)

### Example: unit-testing linking config resolution

```ts
import { getStateFromPath } from '@react-navigation/native';
import { linking } from './linking';

test('resolves a transaction deep link to the correct screen and params', () => {
  const state = getStateFromPath('myapp://transactions/abc123', linking.config);
  expect(state?.routes[0].name).toBe('TransactionDetails');
  expect(state?.routes[0].params).toEqual({ id: 'abc123' });
});
```

### Interview question

**Q: How do you test deep linking without running a full E2E suite every time?**

> "React Navigation exposes `getStateFromPath`, which lets me feed a raw URL into the linking config and assert on the resulting navigation state directly, as a fast unit test � no simulator needed. Separately, I unit test the payload-validation/routing function itself with both valid and malformed inputs, since that's where security-relevant guarding happens. I reserve a real E2E test, via Detox or Maestro actually opening a URL against a running app, for the one or two highest-risk paths � particularly the killed-state cold start, since that's the path most likely to silently regress and the one unit tests can't fully simulate."

---
