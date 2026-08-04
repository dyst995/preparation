# 10 ù Testing

> Goal: Be able to design a pragmatic testing strategy for a React Native fintech app ù unit tests, component tests, mocked native modules, integration tests for critical money flows, and E2E awareness ù and defend *why* you test what you test, not just *how*.

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
- [ ] Why 100% coverage is not the goal ù coverage of *risk*, especially money-moving logic, is

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
| Component (RNTL) | Fast (msùlow s) | Medium | Rendering bugs, wrong text/state shown, broken interactions |
| Integration (RNTL + mocked backend/native) | Moderate | High for the flow tested | Multi-component flows breaking (e.g. form ? submit ? success screen) |
| E2E (Detox/Maestro) | Slow (secondsùminutes per test) | Highest (real app, real gestures) | Wiring issues across the whole real app, native integration bugs, regressions unit/integration tests can't see |

### Interview question

**Q: How do you decide how much to test at each layer for a React Native app?**

> "I lean heavily on unit tests for pure logic ù money formatting, validation schemas, Zustand store logic, React Query mutation logic ù because they're fast and pinpoint failures precisely. I use RNTL for component and integration-level tests on screens with real user-facing risk, especially anything touching money movement, auth, or navigation-critical flows, since those need to be verified as a whole, not just their parts in isolation. E2E via Detox or Maestro I reserve for a small number of true critical-path smoke tests ù login, one full payment flow ù because they're slow and flakier, so I don't want the bulk of my safety net depending on them. The goal isn't maximizing coverage percentage, it's covering risk: money-moving logic and auth get the most scrutiny."

---

## 2. Jest unit tests

### Topics to learn
- [ ] RN Jest preset (`preset: 'react-native'` or framework-specific preset e.g. Expo's) and why it's needed (mocks native bits automatically)
- [ ] Testing pure utility functions (money formatting, validation, date helpers) with no rendering involved
- [ ] Testing custom hooks with `renderHook` (from RNTL or `@testing-library/react-hooks` depending on version)
- [ ] Testing Zustand stores directly (they're just functions/objects ù test the store logic without rendering anything)
- [ ] Testing React Query mutations/queries logic in isolation vs testing them through components
- [ ] Snapshot tests ù when they're useful (rarely, for rarely-changing pure output) and when they're a trap (encourages "update snapshot" reflexively without reading the diff)

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

Key point: Zustand stores are plain JS state containers ù you don't need to render a component to test their logic. Reset state between tests (`setState(initialState)`) to avoid cross-test leakage, since the store is a singleton by default.

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

> "For Zustand, since the store is just a function-backed object, I test it directly ù call actions, assert on `getState()`, and reset state between tests since the store persists as a module-level singleton across test files otherwise. For React Query, I test the mutation function itself in isolation when the logic is complex enough to warrant it, and separately test how a component reacts to loading/success/error mutation states by wrapping it in a real `QueryClientProvider` with a fresh `QueryClient` per test and mocking the network layer (fetch/axios) rather than mocking React Query itself, so I'm testing real cache/retry/invalidation behavior, not a fake."

---

## 3. React Native Testing Library (RNTL) ù component tests

### Topics to learn
- [ ] Philosophy: test what the user sees/does, not internal implementation details
- [ ] Query priority: `getByRole` / `getByText` / `getByLabelText` (accessibility-driven) over `getByTestId` where possible; `testID` as a pragmatic fallback for RN where accessibility queries are sometimes awkward
- [ ] `render`, `screen`, `fireEvent` vs the more realistic `userEvent` API
- [ ] Async assertions: `findBy*`, `waitFor` for state that updates after a promise/microtask
- [ ] Avoiding testing implementation details (internal state, private functions) ù test observable behavior
- [ ] Custom render wrapper providing all app providers (theme, navigation, query client) so every test doesn't repeat boilerplate

### Query strategy priority

| Priority | Query | Why |
|---|---|---|
| 1 (best) | `getByRole`, `getByLabelText` | Matches how a real user/screen-reader identifies the element; resilient to internal refactors |
| 2 | `getByText` | Good for user-visible copy; brittle if copy changes often, which is a signal ù not always a flaw |
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

> "I prioritize queries that match how a real user or assistive technology finds an element ù `getByRole` and `getByLabelText` ù because they're resilient to internal refactors and they double-check accessibility is actually wired up correctly. `getByText` is fine for visible copy, though I accept that changing copy will break those tests, which is a reasonable signal, not a flaw. `getByTestId` I use pragmatically where RN's cross-platform accessibility tree makes role/label queries awkward, but I don't reach for it first, since it doesn't verify anything about how a real user or screen reader would actually interact with the element."

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
| Mock `useNavigation()` to return `{ navigate: jest.fn(), ... }` | Testing a single component in isolation ù assert it *calls* navigate with the right args, without needing a real navigator tree |
| Render inside a real `NavigationContainer` + actual navigator | Integration tests verifying an entire flow actually transitions screens correctly, not just that a function was called |

```tsx
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));
```

### Interview question

**Q: How do you test that tapping a transaction row navigates to the details screen?**

> "For a focused unit test, I mock `useNavigation` and assert `navigate` was called with `'TransactionDetails'` and the correct id param ù that's fast and isolates the component's responsibility. For a broader integration test, I'd render the actual navigator stack inside a real `NavigationContainer`, tap the row, and assert the details screen's content actually appears ù that catches wiring bugs (wrong screen name, missing param) that a pure mock-based test can't."

---

## 5. Mocking React Query

### Topics to learn
- [ ] Fresh `QueryClient` per test (disable retries and set short/zero cache times to avoid cross-test bleed and slow tests)
- [ ] Wrapping the component under test in a real `QueryClientProvider`
- [ ] Mocking the network layer (fetch/axios) rather than mocking React Query's internals ù keeps tests realistic
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

> "For React Query, I don't mock the library itself ù I give each test a fresh `QueryClient` with retries disabled so failing-request tests don't hang or retry needlessly, wrap the component in a real `QueryClientProvider`, and mock at the network layer instead, either manually mocking fetch/axios or using MSW to intercept requests. That way I'm testing real React Query cache/invalidation/mutation behavior, just with a fake backend response, which is much more representative than mocking the hooks themselves."

---

## 6. Mocking native modules (Notifee, FCM, Keychain, biometrics)

### Topics to learn
- [ ] Why native modules must be mocked in Jest ù there's no real native runtime in the JS test environment
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

> "There's no real native runtime under Jest, so any native module needs a JS-side mock ù either via `jest.mock` inline in a test, or a reusable mock in a `__mocks__` folder or global setup file for modules touched broadly, like Firebase messaging or Notifee. I mock the methods to return resolved or rejected promises that simulate the real range of outcomes ù permission granted vs denied, biometric success vs failure ù so I can actually test both my happy-path and my fallback UI, like showing a PIN entry screen when biometric auth fails, without needing a real device."

---

## 7. Integration tests for critical flows

### Topics to learn
- [ ] Definition: multiple units (components + hooks + query client + navigation) exercised together, network/native mocked at the boundary
- [ ] Choosing which flows deserve integration coverage (see section 9)
- [ ] Structuring an integration test: render the flow's entry screen, simulate real user actions end-to-end, assert on the final visible outcome
- [ ] Balancing realism vs speed/flakiness ù integration tests shouldn't hit a real backend

### Example shape (transfer flow, described)

1. Render the "New Transfer" screen wrapped in real navigation + real query client, with the network layer mocked to return a valid recipient lookup and a successful transfer response.
2. Simulate: select recipient ? type amount ? tap confirm ? tap biometric-confirm (mocked to succeed).
3. Assert: a success/receipt screen is now visible with the correct amount and reference number.
4. Add a second integration test where the mocked transfer response is a failure, asserting the error state renders with a retry option and no navigation to a false success screen.

### Interview question

**Q: What would you write an integration test for in a payments app, versus a unit test?**

> "Unit tests cover isolated logic ù does the money formatter produce the right string, does the validation schema reject a negative amount. An integration test covers the full user-observable flow ù can a user actually go from 'select recipient' through 'confirm' to 'see a receipt,' with the network and native layers mocked at the boundary but everything above that real. I'd write integration tests for the money-movement flows specifically because that's where a passing set of isolated unit tests can still hide a broken wiring bug between screens ù the failure mode I most want an early warning for."

---

## 8. Detox / Maestro ù E2E awareness

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

> "Both are E2E frameworks that run against a real app build on a simulator or device, which is a fundamentally different guarantee than RNTL's simulated environment. Detox is gray-box ù it hooks into the app's own event loop to reduce flakiness from timing issues ù but it has more setup overhead. Maestro is black-box and YAML-driven, much faster to get a smoke test running, which has made it popular for teams that want a thin layer of true E2E confidence without a heavy investment. I'd use either sparingly ù a handful of true critical-path flows like login and one full payment ù rather than trying to E2E-test everything, since they're the slowest and most environment-sensitive layer of the pyramid."

---

## 9. What to test first in a fintech app (priority framework)

### Topics to learn
- [ ] Risk-based prioritization: financial correctness > auth/security > core navigation > everything else
- [ ] Under time pressure, what's non-negotiable vs nice-to-have
- [ ] Regression-proofing the exact bugs that have bitten you before (crash-rate stories, precision bugs)

### Priority order

1. **Money math and formatting** ù smallest bug, largest consequence; unit test every formatting/rounding/precision edge case.
2. **Auth and session handling** ù login, token refresh, biometric gate, session timeout; a bug here is a security incident, not just a UX bug.
3. **Idempotency/double-submit logic** ù directly prevents duplicate financial transactions.
4. **Core money-movement flows end-to-end (integration)** ù transfer, QR payment, wallet balance display.
5. **Navigation-critical paths** ù deep link/notification routing to the correct screen, especially the killed-state cold-start path.
6. **Everything else** ù settings, profile, non-critical display screens; lighter coverage is acceptable.

### Interview question

**Q: Given limited time before a release, what would you test first in a fintech app?**

> "I'd start with money math ù formatting, rounding, precision ù since a subtle bug there is the highest-consequence, lowest-visibility class of bug. Next, auth and session handling, because a security gap is worse than a crash. Then idempotency and double-submit protection specifically, since that's the exact bug class that turns into duplicate real-money transactions. Only after those would I invest in broader integration coverage of the main money-movement flows end-to-end, and finally navigation-critical paths like deep link and notification routing. Everything else ù settings, static screens ù gets the lightest coverage since the blast radius of a bug there is low."

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

> "React Navigation exposes `getStateFromPath`, which lets me feed a raw URL into the linking config and assert on the resulting navigation state directly, as a fast unit test ù no simulator needed. Separately, I unit test the payload-validation/routing function itself with both valid and malformed inputs, since that's where security-relevant guarding happens. I reserve a real E2E test, via Detox or Maestro actually opening a URL against a running app, for the one or two highest-risk paths ù particularly the killed-state cold start, since that's the path most likely to silently regress and the one unit tests can't fully simulate."

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

> "First, I check if tests are asserting on brittle things ù exact copy via `getByText` for text that changes often, or snapshot tests on screens with frequent visual churn, both of which break for reasons unrelated to actual regressions. I shift toward role/label/testID queries and behavior-level assertions ù 'the success state is shown,' not 'this exact JSX tree matches.' I also make sure anything timer- or animation-driven uses fake timers and has animations disabled in the test environment, since real timing is a huge source of flakiness. The underlying principle is: tests should break when behavior actually changes, not when someone tweaks a class name or copy string."

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
13. **Detox vs Maestro ù key differences?**
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

- Your crash-rate reduction stories (MyCreditInfo ~20%?0.03%, Wizer ~15%?0.09%, Online School ~28%?0.15%) are strong evidence for "why do you prioritize tests around risk" ù you've lived the cost of untested/undertested legacy code and fixed it production-side; testing strategy is the proactive version of the same discipline.
- EasyPay's money-movement screens (QR payments, transfers, wallet, loans) are your best concrete example for "what would you integration-test first in a fintech app."
- Wizer's Flitt payments integration and Clean House's WebSocket + FCM real-time flow are good examples for discussing mocking external/native dependencies (payment gateway responses, socket events, push handlers) in tests.
- Fastlane-driven CI/CD pipelines (Orient Logic, Online School) pair naturally with "where do tests run in your pipeline" ù unit/integration on every PR, E2E smoke tests gating release builds.

---

## Senior-Level Best Practices

### Decision framework: should this get a test, and at what layer?

```
1. Is this pure logic with no rendering/native/network involvement (formatting, validation, reducers)?
   YES -> unit test, always, cheap and high-value
   NO  -> continue

2. Does a bug here have financial, security, or compliance consequences?
   YES -> integration test covering the full observable flow, in addition to unit tests of its pieces
   NO  -> continue

3. Is this a true cross-cutting critical path (login, one core payment flow) that must never silently break?
   YES -> one targeted E2E smoke test, kept deliberately small in number
   NO  -> continue

4. Is this UI that changes frequently for non-functional reasons (copy, styling, layout experiments)?
   YES -> light or no automated coverage; rely on manual/exploratory testing and accept some churn cost
   NO  -> standard component-level RNTL coverage is enough
```

The point of this framework in an interview is showing you don't test everything equally - you actively decide *not* to test some things, and can defend that decision.

### What NOT to test (say this explicitly, it signals seniority)

- **Third-party library internals.** Don't write tests that re-verify React Navigation routes correctly or that React Query caches - trust the library's own test suite; test *your* usage of it.
- **Pure styling/layout minutiae** (exact pixel values, exact color hex in a snapshot) - these churn constantly for non-functional reasons and produce a wall of noise, not signal.
- **Every possible prop combination of a generic, low-risk presentational component** - diminishing returns; cover the meaningful states (empty, populated, error) not the full cartesian product.
- **Trivial getters/setters or pass-through wrapper functions with no logic.**
- **Frequently-changing marketing/copy screens** with no business logic - a snapshot test here is pure maintenance tax with no bug-catching value.
- **Native module internals themselves** (you don't own that code) - test that *your* code calls them correctly and handles their failure modes, via mocks.

### Production checklist: risk-based test strategy

- [ ] Money formatting/rounding/precision utilities have unit tests covering at least one known floating-point edge case explicitly.
- [ ] Every validation schema (Zod/Yup) has tests for both valid and invalid inputs, including boundary values (zero, negative, max amount).
- [ ] Idempotency-key generation and double-submit guard logic has a dedicated test simulating rapid repeated calls.
- [ ] At least one integration test exists per money-movement flow covering both the success and a representative failure path.
- [ ] Native module mocks exist for every native dependency touched by tested code, including explicit failure-path mocks (permission denied, biometric failure), not just happy-path mocks.
- [ ] Deep link/notification routing has a fast unit test via `getStateFromPath` or equivalent, independent of any E2E harness.
- [ ] E2E suite is capped at a deliberately small number of true critical-path smoke tests, with an explicit owner and a documented list of what's covered and why.
- [ ] CI test run time is tracked as a metric; a test suite that silently creeps past an agreed threshold (e.g. 10 minutes for unit+integration) triggers investigation, not just tolerance.
- [ ] Flaky tests are quarantined (skipped with a tracked ticket) rather than left red-then-ignored or endlessly re-run until green.
- [ ] Test data/fixtures for money amounts are realistic (include cents, negative-adjacent boundary cases) not just round numbers like `100`.

### Anti-patterns seniors reject

- **Chasing a coverage percentage target with no risk weighting.** 100% coverage of low-risk settings screens while a money-formatting util has zero tests is a worse outcome than 70% coverage concentrated on the right things.
- **Mocking React Query's hooks directly instead of the network layer beneath them.** Produces tests that pass even when real cache/retry/invalidation behavior is broken, since you've mocked away the exact thing you'd want to verify.
- **Snapshot-testing screens that change frequently, then reflexively running "update snapshot" on every CI failure.** This turns a verification tool into a rubber stamp - the team stops reading diffs.
- **E2E as the primary safety net.** Slow, flaky, expensive to maintain; a suite that leans on E2E for basic logic verification is inverted-pyramid and will rot under time pressure since it's the first thing skipped when a deadline looms.
- **"We don't test native-module-dependent code at all."** There's no real native runtime under Jest, true, but that's an argument for mocking the native boundary, not for skipping coverage of the JS logic that surrounds and reacts to it.
- **Leaving a flaky test red-but-ignored ("that one always fails, just re-run it").** Trains the team to ignore CI failures generally, which is far more expensive than the ten minutes it takes to quarantine and ticket it properly.
- **Testing implementation details** (internal state shape, private function calls) instead of observable behavior - these tests break on refactors that don't change behavior at all, which is the opposite of what a test suite should protect.

### Failure modes & debugging: flaky test governance

| Symptom | Likely root cause | Fix |
|---|---|---|
| Test passes locally, fails intermittently in CI | Real timers/animations not mocked, or a race between an async assertion and a `waitFor` that's too short | Use fake timers, `findBy*`/`waitFor` with adequate timeout, disable animations in test config |
| Test fails only when run in the full suite, not in isolation | Cross-test state leakage (a singleton store, a module-level mock not reset) | Add explicit `beforeEach` reset for any module-level state (Zustand stores, mocked modules with persistent call counts) |
| Snapshot test fails on every minor unrelated change | Snapshot scope too broad (whole screen) instead of a focused, stable subtree | Narrow snapshot scope, or replace with targeted assertions on the specific behavior that matters |
| E2E test fails sporadically on CI but not locally | Environment timing differences (slower CI runner, network mocking gaps) | Add explicit wait conditions tied to app state, not fixed sleeps; verify test environment parity with local |
| A "fixed" flaky test starts failing again weeks later | Root cause was masked (increased timeout) rather than fixed (removed the actual race) | Re-investigate root cause instead of re-increasing timeouts a second time; treat repeat flakiness as a signal the fix was superficial |

### Observability / metrics that matter

- **CI test suite runtime trend** - creeping runtime is a leading indicator of test-suite health degrading, catch it before it becomes a 40-minute PR-blocking pipeline.
- **Flaky test rate** (tests that fail then pass on retry without code changes) - track as a first-class metric, not tribal knowledge ("oh yeah that one's just flaky").
- **Time-to-detect** for a real regression - are integration tests actually catching wiring bugs before manual QA/production does, or are they redundant with what QA already catches?
- **Mutation-testing-style spot checks** (occasionally verify a test actually fails when you deliberately break the code it claims to cover) - catches tests that pass regardless of the implementation, a subtle but real failure mode.
- **Coverage of the risk-tiered areas specifically** (money math, auth, idempotency) tracked separately from blanket coverage percentage, since blanket coverage hides risk concentration.

### Scalability & team practices

- Maintain a **flaky test quarantine process**: any test that fails without a corresponding code change gets skipped with a linked ticket within 24 hours, not left red blocking unrelated PRs indefinitely.
- Assign **test suite health** as an explicit, rotating ownership responsibility (not "whoever notices"), reviewed in a lightweight way each sprint - runtime trend, flaky count, newly-skipped tests.
- Write a short internal **"what we test and why"** doc mapping risk tiers to required coverage, so new engineers don't have to reverse-engineer the team's testing philosophy from inconsistent examples in the codebase.
- Require integration-level tests (not just unit tests) as part of PR review for any change touching a money-movement flow specifically - make this a lint/checklist item, not a suggestion.
- When adding a new native dependency, require a corresponding `__mocks__` entry as part of the same PR, so mocking debt doesn't silently accumulate.

### Tradeoffs table: Detox vs Maestro at team scale

| Aspect | Detox | Maestro |
|---|---|---|
| Onboarding cost for new engineers | Higher - native build config, more moving parts | Lower - YAML flows are readable by non-specialists |
| CI infrastructure cost | Higher (native build + simulator/emulator orchestration) | Comparable, generally simpler setup |
| Assertion power for complex flows | Stronger (gray-box synchronization, deep app-state hooks) | Simpler assertions, sufficient for smoke-level checks |
| Best fit | Teams with dedicated QA/test-infra investment | Teams wanting a thin, fast E2E safety net without heavy specialization |

### Harder follow-up interview questions (with model answers)

**Q1: Your integration test suite for the transfer flow passes, but a real production bug slipped through where the confirmation screen showed the wrong recipient name after a fast double-tap on 'select recipient.' Why didn't your tests catch it, and how do you close that gap?**
> "That's a race-condition bug tied to real timing between two rapid user actions, which is exactly the class of bug that a straightforward integration test - simulate one action, then the next, sequentially - won't catch, because test harnesses don't naturally introduce that race. I'd add a specific test that fires the two interactions with minimal or no artificial delay between them, using `userEvent` without awaiting between taps, to reproduce the race deterministically. More broadly, this tells me I should audit other multi-step flows for similar assumptions and consider a lightweight guideline: any handler that updates state based on a selection should be tested against rapid re-selection, not just single, well-spaced interactions."

**Q2: How do you decide when a flaky E2E test should be fixed versus removed entirely?**
> "I look at what unique risk it actually covers versus its maintenance cost and flake rate. If it's one of the small number of true critical-path smoke tests - login, core payment flow - I invest in fixing the root cause of the flakiness, because losing coverage there is a real risk. If it's a lower-value E2E test that duplicates coverage a faster, more reliable integration test already provides, I'd seriously consider removing it and moving that specific assertion down to the integration layer instead, since a flaky test that nobody trusts is worse than no test - it trains people to ignore red CI."

**Q3: A teammate says 'we should aim for 100% test coverage on this new payments module.' How do you respond?**

> "I'd reframe the goal rather than reject it outright - the intent behind '100%' is usually 'we want this to be bulletproof,' which I agree with for a payments module. But coverage percentage measures lines executed, not risk addressed - you can hit 100% while missing the one edge case (a negative amount, a race condition, a currency mismatch) that actually causes an incident. I'd propose instead: 100% coverage of the money-math and validation utilities specifically, mandatory integration tests for every success and failure path in the flow, and accept lighter coverage on purely presentational pieces - that gets us actual risk reduction instead of a vanity metric that could pass while a real gap remains."

**Q4: How do you approach testing a flow that depends on a third-party payment gateway's webhook callback, which you can't easily trigger in a test environment?**
> "I'd separate what's testable locally from what needs the real integration. The webhook handler's logic - parsing the payload, validating a signature, updating the transfer state, triggering the right UI/push notification - is all testable with a fake webhook payload matching the gateway's documented schema, so I'd write thorough unit/integration tests against realistic fixture payloads including malformed/unexpected ones. The actual end-to-end 'does the real gateway really call our real endpoint' path I'd cover with a small number of tests against the gateway's sandbox/test-mode environment if they provide one, treated as a lower-frequency integration check (maybe run in a nightly pipeline, not every PR) rather than part of the fast feedback loop."

**Q5: Your CI test suite runtime has crept from 4 minutes to 22 minutes over the last year with no single obvious offender. How do you investigate and fix this systematically?**
> "I wouldn't guess - I'd profile the suite to get a sorted list of slowest individual tests/files, since runtime creep is almost always a long tail of many small regressions rather than one big one. Common culprits I'd check first: real timers not faked (tests actually waiting out `setTimeout`s), tests re-rendering full provider trees unnecessarily instead of sharing setup, or integration tests that crept into doing E2E-style work without meaning to. I'd set a runtime budget per test file going forward, enforced lightly in CI (a warning, not a hard fail initially), so this doesn't silently recur - the goal is catching the next 4-to-22-minute creep after a few minutes of drift, not after another year."

### Staff-level interview monologue: "How do you build a testing culture that survives deadline pressure?"

> "The thing that actually breaks under deadline pressure isn't the tests that exist - it's the discipline to write new ones for new risk. So I focus less on any single testing technique and more on making the risk-based framework explicit and shared: everyone on the team can tell you, without asking me, that money math and auth get the heaviest coverage, that E2E is reserved for a small critical-path set, and that a flaky test gets quarantined within a day rather than living red for a month. That shared understanding is what survives a crunch, because when someone's cutting corners under pressure, they're cutting the corners we've agreed are lower-risk, not randomly skipping whatever's inconvenient that day. I also treat the test suite's own health - runtime, flake rate - as a first-class metric with an owner, the same way I'd treat crash-free rate, because an untested testing infrastructure degrades exactly the same way untested production code does: silently, until it's expensive to fix."

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
