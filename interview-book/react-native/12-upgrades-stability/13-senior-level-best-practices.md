# 13. Senior-Level Best Practices

> Source: `interview-prep/react-native/12-upgrades-stability.md`

### Decision framework: crash budgets as a release gate

A crash budget turns "is this stable enough to ship/keep rolling out" from a gut feeling into a number everyone agrees on in advance.

```
1. Define the budget before the release: e.g. crash-free users must stay >= 99.5% for this version.
2. At each rollout stage, compare actual crash-free rate for THIS version specifically (not the diluted aggregate across all versions) against the budget.
   ABOVE budget -> proceed to next rollout stage
   AT budget (borderline) -> hold at current percentage, gather more data before deciding
   BELOW budget -> halt rollout immediately, begin triage, do not proceed regardless of schedule pressure
3. If a specific crash cluster alone would consume more than, say, 20% of the acceptable budget, treat it as a release blocker even if the aggregate rate is still technically within budget.
```

The senior-level insight here: a crash budget isn't just "watch the number" - it's a pre-committed decision rule that removes the temptation to rationalize a borderline number under schedule pressure, because the threshold was agreed before anyone had a deadline-driven incentive to lower the bar.

### Production checklist: upgrade risk & incident response

- [ ] Before any RN version upgrade, every native-touching dependency is checked against the target version's compatibility, with a written go/no-go per library, not just "let's try it and see."
- [ ] Large version gaps are upgraded in intermediate hops, each independently tested and independently revertible.
- [ ] A defined crash-free-rate budget exists per release, agreed before the release ships, not decided reactively during rollout.
- [ ] Crash clusters are ranked and triaged by affected-users/sessions, with a documented threshold for what counts as release-blocking.
- [ ] Every fix addresses the *class* of bug (defensive validation at a boundary, an ErrorBoundary around a risky area), not only the one reported instance.
- [ ] Feature flags exist around any risky new code path shipped as part of an upgrade, so a regression can be disabled remotely without a new build.
- [ ] A written incident-response runbook exists for "crash-free rate drops below budget mid-rollout," including who has authority to halt a rollout without needing approval first.
- [ ] Logging is centralized through one wrapper that redacts/blocks known-sensitive fields by default, audited periodically for new sensitive fields that crept in.
- [ ] Post-incident, a blameless retro identifies whether the root cause could have been caught earlier (better test coverage, better upgrade audit, better staged rollout discipline) and results in a concrete process change, not just "we fixed the bug."
- [ ] Historical mapping files/dSYMs are retained long enough to debug a crash reported against an older-but-still-live app version, not only the latest release.

### Anti-patterns seniors reject

- **Treating an RN upgrade as "just bump the version number."** Most upgrade pain lives in native-touching dependencies and native project file diffs, not RN's own JS API surface - skipping the dependency audit is where upgrades go wrong.
- **Fixing crashes in ranked-by-ease order instead of ranked-by-impact order.** A satisfying quick fix for a rare crash is a worse use of time than a harder fix for a crash hitting 30% of sessions.
- **Point-fixing instead of class-fixing.** Patching one null-check for one crash instance while the same unguarded pattern exists in ten other places is treating a symptom, not the disease.
- **Looking at aggregate crash-free rate instead of per-version rate after a release.** The aggregate is diluted by old, stable versions still in the wild and can mask a serious regression in the newest build.
- **Logging raw API request/response bodies "for debugging" in a fintech app.** A convenience today is a compliance incident tomorrow; centralized redaction should be the default, not an opt-in.
- **No rollback/feature-flag plan for a risky change, relying solely on "we tested it well."** Testing reduces risk, it doesn't eliminate it; senior engineers plan for the case where testing missed something.
- **Confusing ANR with a generic crash**, or treating "freeze/jank" as not worth tracking because it doesn't generate a formal OS report - all three are real user-facing failure modes with different detection strategies and deserve distinct handling.

### Failure modes & debugging: incident response runbook

| Symptom | Immediate action | Root-cause investigation |
|---|---|---|
| Crash-free rate drops sharply right after a release | Halt/pause the staged rollout immediately, before deep investigation | Compare the new release's diff against the previous known-good build; check for a newly introduced native dependency or config change |
| Crash-free rate degrades slowly over days, not immediately | Do not assume it's unrelated to the release just because it wasn't instant | Check for a slow-accumulating issue (memory leak, a background task that degrades with app uptime, a cache growing unbounded) |
| ANR rate spikes on Android specifically | Check Play Console vitals for the blocked-thread stack | Look for a newly introduced synchronous native module call or blocking I/O on the main thread |
| A crash reappears after being "fixed" in a prior release | The original fix was a point-fix, not a class-fix | Search the codebase for the same unguarded pattern elsewhere; add a defensive boundary/validation layer instead of another point patch |
| Crash only affects users who upgraded from a specific old version | A migration/data-shape mismatch between old persisted state and new code's expectations | Test the upgrade path specifically (old app data + new binary), not just fresh installs |
| Incident postmortem finds "we should have caught this in testing" repeatedly | A systemic test-strategy gap, not a one-off miss | Feed findings back into the risk-based test strategy (file 10) rather than treating each incident as isolated |

### Observability / metrics that matter

- **Crash-free users % per version** (not aggregate) - the single most important stability metric, tracked from the moment a version starts rolling out.
- **ANR rate** (Android-specific, tracked separately from crash rate) - a different failure mode with different causes, deserves its own dashboard line.
- **Time-to-detect** a regression (how long between a bad release starting rollout and the team noticing) - directly determines how many users are affected before you halt.
- **Time-to-mitigate** (halt/flag-disable) versus **time-to-fix** (actual code fix shipped) - tracked separately, since the fast lever (halt/flag) should be much faster than the slow one (a proper fix).
- **Crash cluster concentration** (what % of total crashes come from the top 3 clusters) - a high concentration means impact-ranked triage will be very effective; a flat long tail means you're closer to a stability floor and need broader defensive measures instead of chasing individual clusters.
- **Dependency freshness** (how far behind latest stable versions your native-touching libraries are) - a leading indicator of upgrade risk and accumulating exposure to already-fixed bugs in old dependency versions.

### Scalability & team practices

- Publish the crash-free-rate budget and current status somewhere visible to the whole team (not just engineering leadership), so "should we halt this rollout" is a shared, fast decision, not a single person's judgment call under pressure.
- Rotate "on-call for post-release monitoring" across the team for the first 24-48 hours after each release, so watching stability metrics isn't quietly the same one person's job forever.
- Require an upgrade risk audit (dependency compatibility table) as a lightweight written artifact before starting any major RN version upgrade, reviewed by at least one other engineer - upgrades done solo by one person with no review are where subtle regressions hide longest.
- Feed every incident postmortem into a living "known upgrade/dependency gotchas" doc so the next engineer doing a similar upgrade doesn't rediscover the same OEM/library quirk from scratch.
- Treat PII-safe logging as a lint-enforced or code-review-enforced rule (a banned-pattern check for things like `console.log(JSON.stringify(response))` on payment payloads) rather than trusting every engineer to remember it under deadline pressure.

### Tradeoffs table: upgrade cadence

| Approach | Risk per upgrade | Effort per upgrade | Cumulative risk over time |
|---|---|---|---|
| Upgrade immediately on every RN release | Low per-hop (small diffs) | High frequency, but each hop is small | Low - never accumulates large gaps |
| Upgrade once or twice a year in big jumps | High per-hop (large diffs, many dependency changes at once) | Lower frequency, but each hop is a major project | High - accumulates dependency staleness and security exposure between hops |
| Upgrade reactively only when forced (a dependency requires it) | Highest per-hop (often multiple major versions behind) | Unpredictable, often under external time pressure | Highest - combines large diffs with lack of control over timing |

### Harder follow-up interview questions (with model answers)

**Q1: Crash-free rate for a new release sits exactly at your budget threshold - not clearly above, not clearly below. Do you proceed with the rollout? How do you decide?**
> "I wouldn't treat 'at the threshold' the same as 'above it' - borderline is a signal to gather more data before deciding, not to round in either direction based on schedule pressure. I'd check whether the sample size at the current rollout percentage is large enough to trust the number statistically, since a small percentage rollout on a lower-traffic app can show a noisy rate that isn't really borderline once more users are in the sample. I'd also check whether the crashes contributing to that rate are concentrated in one fixable cluster or spread thin - a concentrated cluster with a clear fix might justify holding at the current percentage while shipping a targeted fix, rather than either fully halting or fully proceeding on an ambiguous signal."

**Q2: You're mid-way through a major RN upgrade and discover a critical native dependency has no compatible version for your target RN release. What are your options and how do you choose?**
> "First I'd check if there's a fork, a patch, or an actively-discussed upstream PR that resolves it, since sometimes the fix exists but isn't released yet - I could patch the dependency locally via a patch-package-style approach as a stopgap. Second, I'd evaluate whether an alternative library covers the same functionality and is compatible, weighing migration cost against how core that dependency is to the app. Third, if neither is viable, I'd reconsider the upgrade target - maybe an intermediate RN version is compatible with the current dependency set while still being a meaningful step forward, letting me upgrade in two smaller hops instead of one blocked big one. I would not silently skip the upgrade indefinitely just because of one blocker without documenting why and revisiting on a schedule, since indefinite deferral is exactly how a team ends up several major versions behind."

**Q3: How do you distinguish 'this crash reduction effort is done' from 'we should keep pushing the rate lower'?**
> "I look at concentration and cost-benefit rather than chasing zero unconditionally. Once the top clusters are gone and what remains is a long tail of rare, unrelated one-off crashes, the cost of chasing each one individually rises while the benefit per fix shrinks - that's a signal to shift from active crash-hunting to a steady-state discipline (keep dependencies current, keep defensive validation at boundaries, keep monitoring) rather than continuing an intensive sprint. I'd also set the bar relative to the budget/SLA, not to an abstract 'as low as possible' - if crash-free rate comfortably and consistently clears the agreed budget release after release, that's the signal the active effort achieved its goal, and resources are better spent elsewhere."

**Q4: A production incident happens, you fix it fast, and the postmortem concludes 'better test coverage would have caught this.' Six months later, a very similar bug ships again. What went wrong, and how do you prevent this pattern?**
> "The recurrence usually means the postmortem action item was too vague to actually change behavior - 'better test coverage' isn't specific enough to act on, so it likely didn't translate into an actual enforced practice. I'd go back and make the follow-up concrete: a specific test added for that exact scenario, plus a category-level rule (e.g. 'any change to the transfer confirmation flow requires an integration test covering both success and timeout paths') enforced via PR review checklist or CI, not just a one-time fix. I'd also check whether the original incident's root cause was ever generalized into a defensive pattern applied elsewhere in the codebase, since a recurring 'similar' bug often means the first fix was a point-fix rather than addressing the underlying class."

**Q5: How would you build a case to leadership that investing a full sprint in dependency upgrades is worth delaying a feature, when the app isn't currently visibly broken?**
> "I'd frame it in terms of accumulating risk and cost curve, not abstract hygiene. I'd show how far behind the current dependencies are, cross-reference known security advisories or bug fixes in the versions we're missing, and estimate how the upgrade difficulty grows non-linearly with the gap - a 2-version-behind upgrade this quarter is a fraction of the effort of a 6-version-behind upgrade next year, plus the risk of hitting an unsupported/abandoned library entirely if we wait too long. I'd tie it to a concrete, business-relevant risk framing: 'if we need an emergency security patch next quarter and we're 6 versions behind, that becomes an emergency multi-week project instead of a routine one' - leadership responds better to a cost-of-delay argument than a purity argument about keeping dependencies current for its own sake."

### Staff-level interview monologue: "How do you think about stability as an ongoing system, not a one-time cleanup project?"

> "The three crash-reduction numbers on my CV look like one-time turnarounds, but the actual lesson I took from all three is that stability isn't a project with an end date - it's a system with inputs and a budget, like reliability engineering in any domain. The inputs are: how disciplined the upgrade process is, how much defensive validation exists at API and native boundaries, how fast the team detects and halts a bad rollout, and how well symbolication and logging are maintained so a crash is actually diagnosable when it happens. The budget is an agreed crash-free-rate threshold that triggers a halt, not a suggestion. Once I got each of those three apps to a stable floor, the real work was making sure the system that got them there kept running without me personally driving it - staged rollouts as the default, not a special step; defensive validation as a code-review expectation, not a one-time sweep; dependency upgrades on a cadence, not reactive panic. That's the difference between 'I fixed the crashes' and 'I built the thing that keeps crashes fixed after I've moved on to the next problem,' and it's the framing I'd bring to any team's stability work, not just repeat the same one-time cleanup on a new codebase."

---
