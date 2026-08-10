# 16. Senior-Level Best Practices

> Source: `interview-prep/react-native/10-testing.md`

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
