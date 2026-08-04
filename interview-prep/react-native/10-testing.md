# 10 — Testing

> Goal: Be able to design a pragmatic testing strategy for a React Native fintech app — unit tests, component tests, mocked native modules, integration tests for critical money flows, and E2E awareness — and defend *why* you test what you test, not just *how*.

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

## 1. The testing pyramid, applied to React Native

### Topics to learn
- [ ] Classic pyramid: many unit tests, fewer integration tests, few E2E tests
- [ ] Why RN adds an extra axis: JS-only tests vs tests that need native module mocking
- [ ] Cost/speed/confidence tradeoffs at each layer
- [ ] Why 100% coverage is not the goal — coverage of *risk*, especially money-moving logic, is

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
| Component (RNTL) | Fast (ms–low s) | Medium | Rendering bugs, wrong text/state shown, broken interactions |
| Integration (RNTL + mocked backend/native) | Moderate | High for the flow tested | Multi-component flows breaking (e.g. form ? submit ? success screen) |
| E2E (Detox/Maestro) | Slow (seconds–minutes per test) | Highest (real app, real gestures) | Wiring issues across the whole real app, native integration bugs, regressions unit/integration tests can't see |

### Interview question

**Q: How do you decide how much to test at each layer for a React Native app?**

> "I lean heavily on unit tests for pure logic — money formatting, validation schemas, Zustand store logic, React Query mutation logic — because they're fast and pinpoint failures precisely. I use RNTL for component and integration-level tests on screens with real user-facing risk, especially anything touching money movement, auth, or navigation-critical flows, since those need to be verified as a whole, not just their parts in isolation. E2E via Detox or Maestro I reserve for a small number of true critical-path smoke tests — login, one full payment flow — because they're slow and flakier, so I don't want the bulk of my safety net depending on them. The goal isn't maximizing coverage percentage, it's covering risk: money-moving logic and auth get the most scrutiny."

---

## 2. Jest unit tests

### Topics to learn
- [ ] RN Jest preset (`preset: 'react-native'` or framework-specific preset e.g. Expo's) and why it's needed (mocks native bits automatically)
- [ ] Testing pure utility functions (money formatting, validation, date helpers) with no rendering involved
- [ ] Testing custom hooks with `renderHook` (from RNTL or `@testing-library/react-hooks` depending on version)
- [ ] Testing Zustand stores directly (they're just functions/objects — test the store logic without rendering anything)
- [ ] Testing React Query mutations/queries logic in isolation vs testing them through components
- [ ] Snapshot tests — when they're useful (rarely, for rarely-changing pure output) and when they're a trap (encourages "update snapshot" reflexively without reading the diff)

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

Key point: Zustand stores are plain JS state containers — you don't need to render a component to test their logic. Reset state between tests (`setState(initialState)`) to avoid cross-test leakage, since the store is a singleton by default.

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

> "For Zustand, since the store is just a function-backed object, I test it directly — call actions, assert on `getState()`, and reset state between tests since the store persists as a module-level singleton across test files otherwise. For React Query, I test the mutation function itself in isolation when the logic is complex enough to warrant it, and separately test how a component reacts to loading/success/error mutation states by wrapping it in a real `QueryClientProvider` with a fresh `QueryClient` per test and mocking the network layer (fetch/axios) rather than mocking React Query itself, so I'm testing real cache/retry/invalidation behavior, not a fake."

---

## 3. React Native Testing Library (RNTL) — component tests

### Topics to learn
- [ ] Philosophy: test what the user sees/does, not internal implementation details
- [ ] Query priority: `getByRole` / `getByText` / `getByLabelText` (accessibility-driven) over `getByTestId` where possible; `testID` as a pragmatic fallback for RN where accessibility queries are sometimes awkward
- [ ] `render`, `screen`, `fireEvent` vs the more realistic `userEvent` API
- [ ] Async assertions: `findBy*`, `waitFor` for state that updates after a promise/microtask
- [ ] Avoiding testing implementation details (internal state, private functions) — test observable behavior
- [ ] Custom render wrapper providing all app providers (theme, navigation, query client) so every test doesn't repeat boilerplate

### Query strategy priority

| Priority | Query | Why |
|---|---|---|
| 1 (best) | `getByRole`, `getByLabelText` | Matches how a real user/screen-reader identifies the element; resilient to internal refactors |
| 2 | `getByText` | Good for user-visible copy; brittle if copy changes often, which is a signal — not always a flaw |
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

> "I prioritize queries that match how a real user or assistive technology finds an element — `getByRole` and `getByLabelText` — because they're resilient to internal refactors and they double-check accessibility is actually wired up correctly. `getByText` is fine for visible copy, though I accept that changing copy will break those tests, which is a reasonable signal, not a flaw. `getByTestId` I use pragmatically where RN's cross-platform accessibility tree makes role/label queries awkward, but I don't reach for it first, since it doesn't verify anything about how a real user or screen reader would actually interact with the element."

---

## 4. Mocking React Navigation

### Topics to learn
- [ ] Wrapping components under test in a real `NavigationContainer` for integration-style tests vs mocking `useNavigation`/`useRoute` for pure unit-style component tests
- [ ] Asserting navigation calls with `jest.fn()` mocks on `navigate`/`goBack`
- [ ] Testing screens that consume route params
- [ ] Testing linking/deep-link config without a full E2E harness (see section 10)

### Two approaches compared

| Approach | When to use |
|---|---|
| Mock `useNavigation()` to return `{ navigate: jest.fn(), ... }` | Testing a single component in isolation — assert it *calls* navigate with the right args, without needing a real navigator tree |
| Render inside a real `NavigationContainer` + actual navigator | Integration tests verifying an entire flow actually transitions screens correctly, not just that a function was called |

```tsx
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));
```

### Interview question

**Q: How do you test that tapping a transaction row navigates to the details screen?**

> "For a focused unit test, I mock `useNavigation` and assert `navigate` was called with `'TransactionDetails'` and the correct id param — that's fast and isolates the component's responsibility. For a broader integration test, I'd render the actual navigator stack inside a real `NavigationContainer`, tap the row, and assert the details screen's content actually appears — that catches wiring bugs (wrong screen name, missing param) that a pure mock-based test can't."

---

## 5. Mocking React Query

### Topics to learn
- [ ] Fresh `QueryClient` per test (disable retries and set short/zero cache times to avoid cross-test bleed and slow tests)
- [ ] Wrapping the component under test in a real `QueryClientProvider`
- [ ] Mocking the network layer (fetch/axios) rather than mocking React Query's internals — keeps tests realistic
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

> "For React Query, I don't mock the library itself — I give each test a fresh `QueryClient` with retries disabled so failing-request tests don't hang or retry needlessly, wrap the component in a real `QueryClientProvider`, and mock at the network layer instead, either manually mocking fetch/axios or using MSW to intercept requests. That way I'm testing real React Query cache/invalidation/mutation behavior, just with a fake backend response, which is much more representative than mocking the hooks themselves."

---

## 6. Mocking native modules (Notifee, FCM, Keychain, biometrics)

### Topics to learn
- [ ] Why native modules must be mocked in Jest — there's no real native runtime in the JS test environment
- [ ] Manual mocks via `jest.mock('module-name', () => ({ ... }))`
- [ ] `__mocks__` folder convention for reusable mocks across the suite
- [ ] Setup files (`jest.config.js` ? `setupFiles`/`setupFilesAfterEach`) for globally mocking modules that nearly every test tree touches (e.g. Firebase messaging, Notifee)
- [ ] Mocking native module methods to return resolved/rejected promises to simulate permission grants/denials, biometric success/failure, etc.
- [ ] Community-maintained mocks (e.g. official Jest mocks shipped by some native libraries) vs writing your own

### Example: mocking Notifee and FCM

```ts
// __mocks__/@notifee/react-native.ts
export default {
  createChannel: jest.fn().mockResolvedValue('payments'),
  displayNotification: jest.fn().mockResolvedValue(undefined),
  onForegroundEvent: jest.fn(),
  onBackgroundEvent: jest.fn(),
};

// __mocks__/@react-native-firebase/messaging.ts
const messaging = () => ({
  requestPermission: jest.fn().mockResolvedValue(1), // AUTHORIZED
  getToken: jest.fn().mockResolvedValue('fake-token'),
  onMessage: jest.fn(),
  setBackgroundMessageHandler: jest.fn(),
});
export default messaging;
```

### Example: mocking biometrics for both success and failure paths

```ts
jest.mock('react-native-biometrics', () => ({
  simplePrompt: jest.fn(),
}));

test('shows fallback PIN entry when biometric auth fails', async () => {
  (simplePrompt as jest.Mock).mockResolvedValueOnce({ success: false });
  render(<AuthGate />);
  await user.press(screen.getByRole('button', { name: 'Unlock' }));
  expect(await screen.findByText('Enter PIN')).toBeOnTheScreen();
});
```

### Interview question

**Q: How do you mock native modules like Notifee, FCM, or a biometrics library in Jest?**

> "There's no real native runtime under Jest, so any native module needs a JS-side mock — either via `jest.mock` inline in a test, or a reusable mock in a `__mocks__` folder or global setup file for modules touched broadly, like Firebase messaging or Notifee. I mock the methods to return resolved or rejected promises that simulate the real range of outcomes — permission granted vs denied, biometric success vs failure — so I can actually test both my happy-path and my fallback UI, like showing a PIN entry screen when biometric auth fails, without needing a real device."

---

## 7. Integration tests for critical flows

### Topics to learn
- [ ] Definition: multiple units (components + hooks + query client + navigation) exercised together, network/native mocked at the boundary
- [ ] Choosing which flows deserve integration coverage (see section 9)
- [ ] Structuring an integration test: render the flow's entry screen, simulate real user actions end-to-end, assert on the final visible outcome
- [ ] Balancing realism vs speed/flakiness — integration tests shouldn't hit a real backend

### Example shape (transfer flow, described)

1. Render the "New Transfer" screen wrapped in real navigation + real query client, with the network layer mocked to return a valid recipient lookup and a successful transfer response.
2. Simulate: select recipient ? type amount ? tap confirm ? tap biometric-confirm (mocked to succeed).
3. Assert: a success/receipt screen is now visible with the correct amount and reference number.
4. Add a second integration test where the mocked transfer response is a failure, asserting the error state renders with a retry option and no navigation to a false success screen.

### Interview question

**Q: What would you write an integration test for in a payments app, versus a unit test?**

> "Unit tests cover isolated logic — does the money formatter produce the right string, does the validation schema reject a negative amount. An integration test covers the full user-observable flow — can a user actually go from 'select recipient' through 'confirm' to 'see a receipt,' with the network and native layers mocked at the boundary but everything above that real. I'd write integration tests for the money-movement flows specifically because that's where a passing set of isolated unit tests can still hide a broken wiring bug between screens — the failure mode I most want an early warning for."

---

## 8. Detox / Maestro — E2E awareness

### Topics to learn
- [ ] Detox: gray-box E2E framework, synchronizes with the app's native/JS event loop to reduce flakiness, requires more setup (native build config)
- [ ] Maestro: black-box E2E framework, simpler YAML-based test flows, faster to write, growing popularity for its low setup friction
- [ ] Both run against a real (or near-real) app build on a simulator/emulator/device, unlike RNTL which runs in a Node/JSDOM-like environment
- [ ] Tradeoffs: E2E tests are the most realistic but slowest and most prone to environmental flakiness (timing, animations, network)
- [ ] Where E2E fits: a small number of true critical-path smoke tests (login, one full payment), not exhaustive coverage
- [ ] CI implications: E2E needs real device/simulator infrastructure, adds significant pipeline time

### Comparison table

| Aspect | Detox | Maestro |
|---|---|---|
| Approach | Gray-box, synchronizes with app internals to reduce race conditions | Black-box, interacts purely via UI like a real user |
| Setup complexity | Higher (native-level config, build variants) | Lower (YAML flow files, quicker to start) |
| Authoring speed | Slower to write, more powerful assertions | Very fast to write simple flows |
| Typical use | Teams wanting tight synchronization and mature CI integration | Teams wanting quick smoke-test coverage without heavy setup |

### Interview question

**Q: What's your awareness of Detox vs Maestro, even without deep hands-on depth?**

> "Both are E2E frameworks that run against a real app build on a simulator or device, which is a fundamentally different guarantee than RNTL's simulated environment. Detox is gray-box — it hooks into the app's own event loop to reduce flakiness from timing issues — but it has more setup overhead. Maestro is black-box and YAML-driven, much faster to get a smoke test running, which has made it popular for teams that want a thin layer of true E2E confidence without a heavy investment. I'd use either sparingly — a handful of true critical-path flows like login and one full payment — rather than trying to E2E-test everything, since they're the slowest and most environment-sensitive layer of the pyramid."

---

## 9. What to test first in a fintech app (priority framework)

### Topics to learn
- [ ] Risk-based prioritization: financial correctness > auth/security > core navigation > everything else
- [ ] Under time pressure, what's non-negotiable vs nice-to-have
- [ ] Regression-proofing the exact bugs that have bitten you before (crash-rate stories, precision bugs)

### Priority order

1. **Money math and formatting** — smallest bug, largest consequence; unit test every formatting/rounding/precision edge case.
2. **Auth and session handling** — login, token refresh, biometric gate, session timeout; a bug here is a security incident, not just a UX bug.
3. **Idempotency/double-submit logic** — directly prevents duplicate financial transactions.
4. **Core money-movement flows end-to-end (integration)** — transfer, QR payment, wallet balance display.
5. **Navigation-critical paths** — deep link/notification routing to the correct screen, especially the killed-state cold-start path.
6. **Everything else** — settings, profile, non-critical display screens; lighter coverage is acceptable.

### Interview question

**Q: Given limited time before a release, what would you test first in a fintech app?**

> "I'd start with money math — formatting, rounding, precision — since a subtle bug there is the highest-consequence, lowest-visibility class of bug. Next, auth and session handling, because a security gap is worse than a crash. Then idempotency and double-submit protection specifically, since that's the exact bug class that turns into duplicate real-money transactions. Only after those would I invest in broader integration coverage of the main money-movement flows end-to-end, and finally navigation-critical paths like deep link and notification routing. Everything else — settings, static screens — gets the lightest coverage since the blast radius of a bug there is low."

---

## 10. Testing deep links

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

> "React Navigation exposes `getStateFromPath`, which lets me feed a raw URL into the linking config and assert on the resulting navigation state directly, as a fast unit test — no simulator needed. Separately, I unit test the payload-validation/routing function itself with both valid and malformed inputs, since that's where security-relevant guarding happens. I reserve a real E2E test, via Detox or Maestro actually opening a URL against a running app, for the one or two highest-risk paths — particularly the killed-state cold start, since that's the path most likely to silently regress and the one unit tests can't fully simulate."

---

## 11. Keeping tests stable as UI changes frequently

### Topics to learn
- [ ] Querying by role/label/testID instead of exact text/structure where copy or layout churns often
- [ ] Avoiding brittle snapshot tests on frequently-changing UI (snapshots on rapidly evolving screens become "update snapshot" reflexes, not real verification)
- [ ] Testing behavior/outcomes ("the success screen shows the reference number"), not implementation details ("the component's internal state is X")
- [ ] Isolating flaky sources: fake timers for anything timer-based, deterministic mocked responses, disabling animations in tests
- [ ] Test IDs as a deliberate, stable contract between design/dev, not an afterthought sprinkled randomly

### Interview question

**Q: The UI on your team changes constantly and tests keep breaking for unrelated reasons. How do you fix that?**

> "First, I check if tests are asserting on brittle things — exact copy via `getByText` for text that changes often, or snapshot tests on screens with frequent visual churn, both of which break for reasons unrelated to actual regressions. I shift toward role/label/testID queries and behavior-level assertions — 'the success state is shown,' not 'this exact JSX tree matches.' I also make sure anything timer- or animation-driven uses fake timers and has animations disabled in the test environment, since real timing is a huge source of flakiness. The underlying principle is: tests should break when behavior actually changes, not when someone tweaks a class name or copy string."

---

## Full interview question bank (with answer targets)

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
13. **Detox vs Maestro — key differences?**
14. **Why keep E2E tests few and targeted?**

### Deep links
15. **How do you test deep linking without full E2E?** ? `getStateFromPath` unit tests + payload validation unit tests + a couple of E2E smoke tests for killed-state cold start.

### Stability
16. **How do you keep tests stable when UI changes often?** ? behavior/role-based queries, avoid brittle snapshots, fake timers, disabled animations.

---

## Hands-on drills (do these)

- [ ] Write a Jest test for a money-formatting util covering at least one floating-point edge case.
- [ ] Write a Zustand store test that resets state in `beforeEach` and verifies an action mutates state correctly.
- [ ] Write an RNTL test for a form component using `getByLabelText` and `userEvent.type`.
- [ ] Write and run a mocked Notifee `__mocks__` file and a test asserting `displayNotification` is called with the right channel id.
- [ ] Write an integration test for a transfer flow: mock the network layer, simulate the full happy path, then write a second test for the failure path.
- [ ] Write a `getStateFromPath` test for at least one deep link route with valid and invalid params.
- [ ] Convert one brittle `getByText`-based test into a `getByRole`/`getByLabelText`-based test and explain why it's now more resilient.
- [ ] Sketch (on paper) 3 Detox/Maestro smoke-test scenarios you'd pick for a fintech app if you could only have 3.

---

## Senior red flags / green flags

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

## Tie-backs to your experience (use in answers)

- Your crash-rate reduction stories (MyCreditInfo ~20%?0.03%, Wizer ~15%?0.09%, Online School ~28%?0.15%) are strong evidence for "why do you prioritize tests around risk" — you've lived the cost of untested/undertested legacy code and fixed it production-side; testing strategy is the proactive version of the same discipline.
- EasyPay's money-movement screens (QR payments, transfers, wallet, loans) are your best concrete example for "what would you integration-test first in a fintech app."
- Wizer's Flitt payments integration and Clean House's WebSocket + FCM real-time flow are good examples for discussing mocking external/native dependencies (payment gateway responses, socket events, push handlers) in tests.
- Fastlane-driven CI/CD pipelines (Orient Logic, Online School) pair naturally with "where do tests run in your pipeline" — unit/integration on every PR, E2E smoke tests gating release builds.

---

## Mastery checklist

- [ ] I can explain the RN-flavored testing pyramid and justify effort allocation across layers.
- [ ] I can unit test a Zustand store and a custom hook correctly, including timer-based hooks.
- [ ] I can write RNTL tests using accessibility-first queries and explain why over `testID`-first.
- [ ] I can mock React Navigation for both isolated and integration-style tests.
- [ ] I can mock React Query by faking the network layer, not the library.
- [ ] I can mock native modules (Notifee, FCM, biometrics, Keychain) including their failure paths.
- [ ] I can articulate what deserves integration coverage vs unit coverage in a payments app.
- [ ] I can compare Detox and Maestro accurately and explain where E2E fits in the pyramid.
- [ ] I can prioritize what to test first under time pressure with a clear risk-based rationale.
- [ ] I can test deep link resolution without a full E2E harness.
- [ ] I can diagnose and fix a flaky/brittle test suite systematically.
