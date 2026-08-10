# 17. Senior-Level Best Practices

> Source: `interview-prep/react-native/11-cicd-releases.md`

### Decision framework: release train, hotfix, or OTA?

```
1. Is production actively broken/losing money right now (payment flow down, crash on launch)?
   YES -> hotfix path (see hotfix SLA below), skip the normal train
   NO  -> continue

2. Is the fix JS-only and within OTA policy limits (no native/permission/icon changes)?
   YES -> OTA now, but still land it in the next regular release too so it isn't a permanent divergence
   NO  -> continue

3. Does it need to reach users faster than the next scheduled train allows?
   YES -> cut an out-of-band release following full CI/signing/rollout discipline, just prioritized
   NO  -> queue it for the next regular release train
```

Being able to draw this decision tree unprompted - rather than treating every fix as "just ship it" - is what separates someone who's run a real release process from someone who's only ever pushed a button someone else built.

### Production checklist: release trains & staged rollout

- [ ] A fixed release cadence exists (e.g. weekly or biweekly train) so "when does this ship" has a default answer without a meeting.
- [ ] Every release has a named owner responsible for watching post-release metrics for the first 24-48 hours, not "whoever happens to notice."
- [ ] Staged rollout percentage and ramp schedule (10% -> 50% -> 100%) is decided *before* the release goes out, not improvised mid-rollout.
- [ ] A documented, one-command halt/rollback procedure exists and has been rehearsed at least once outside of a real incident.
- [ ] Release notes/changelog are generated from the actual merged PRs/commits, not written from memory after the fact.
- [ ] Every release's Proguard mapping file / dSYM is uploaded and verifiably retrievable for that exact build, indefinitely or per a defined retention policy.
- [ ] Signing secrets (keystore, `match` passphrase, App Store Connect API key) are rotated on a schedule or immediately on any suspected exposure, with a documented rotation runbook, not "we've never had to do that."
- [ ] A hotfix SLA is written down (e.g. "critical payment-flow incidents get a fix shipped within N hours") and known by the whole team, not just the person who usually handles it.
- [ ] CI pipeline fails loudly (not silently skips) if a mapping file/dSYM upload step fails - a release without symbolication is a release you can't debug later.
- [ ] Branch protection prevents a production release lane from being triggered by anything other than a protected tag/branch, closing the "accidental deploy from a feature branch" failure mode.

### Anti-patterns seniors reject

- **Shipping to 100% by default "because the last few releases were fine."** Staged rollout exists precisely for the release that isn't fine; treating it as optional erases the entire safety benefit.
- **Storing the release keystore or signing certs in the repo "because it's private."** Private repos leak via forks, laptops, ex-employees, and misconfigured CI - keystores belong in a secrets manager or protected CI variables, full stop.
- **Skipping tests "because it's just a hotfix."** A bad hotfix under pressure is a worse outcome than a slightly slower correct one; the incident is already bad enough without adding a second, self-inflicted one.
- **Manually incrementing build numbers/versionCode from a local counter.** Guarantees a collision the moment two people (or two CI retries) run close together; always derive from the store's live latest value.
- **Treating OTA as a way to sneak a feature past App Store review.** Violates platform policy and, if caught, risks the entire app's review standing, not just the one update.
- **No rotation plan for a leaked secret** beyond "we'll deal with it if it happens." If you can't answer "what do we do if this API key leaks" in one sentence, you don't actually have a secrets policy.
- **Letting certs/profiles expire silently.** A CI pipeline that fails with a cryptic provisioning error the day of a planned release, with no advance warning, is a process gap, not bad luck - expiry dates are known in advance.

### Failure modes & debugging: release-pipeline runbook

| Symptom | Likely cause | Fix |
|---|---|---|
| iOS build fails in CI with a provisioning/codesign error | Expired certificate/profile, or `match` out of sync | Run `match` to refresh (read-only in CI); check cert/profile expiry dates proactively going forward |
| Android upload fails with a versionCode conflict | Stale local counter, or two pipelines raced | Switch to querying the store's live latest versionCode via Fastlane action instead of a local counter |
| Crash reports post-release are unreadable/unsymbolicated | Mapping file/dSYM upload step silently failed or was skipped | Make the upload step a hard CI failure, not a best-effort step; verify per-release in the release checklist |
| Staged rollout shows a crash spike at 10% | A real regression in the release | Halt the rollout immediately, do not proceed to 50%; begin triage using the Crashlytics workflow from file 08/12 |
| A secret appears in CI job logs | A script echoed an environment variable, or a masked-variable setting was misconfigured | Rotate the secret immediately regardless of whether misuse is confirmed; fix the logging leak; audit other jobs for the same pattern |
| Hotfix ships but the underlying bug reappears next regular release | Hotfix branch was never backported/merged into main | Add a hard checklist/CI gate requiring the hotfix branch to merge back before the next train ships |

### Observability / metrics that matter

- **Time from tag to production availability** - your actual release lead time; track it to know if your pipeline is a bottleneck or genuinely fast.
- **Rollout halt rate** - what fraction of releases get halted mid-rollout due to a metrics regression; a rising trend means quality is slipping earlier in the pipeline (tests, code review) not just at rollout.
- **Hotfix frequency and time-to-ship** - a rising hotfix rate is a leading indicator of declining release quality upstream, worth investigating even if each individual hotfix ships fast.
- **Secret rotation compliance** - are scheduled rotations actually happening on schedule, or is "we rotate on a schedule" aspirational in practice.
- **Cert/profile expiry lead time** - are you finding out about an expiring cert from a calendar reminder (good) or from a failed CI run the day of a release (bad)?

### Scalability & team practices

- As the team grows, move from "one person knows the release process" to a **documented, rehearsed runbook** anyone on-call can execute - including the halt/rollback procedure specifically, since that's the one you need to run under stress.
- Introduce a **release captain rotation** so release-day ownership doesn't always fall on the same person, and so knowledge of the pipeline is distributed rather than a single point of failure.
- Automate secret-expiry alerts (cert/profile expiry dates, keystore review dates) rather than relying on someone remembering - a calendar reminder 30 days out is cheap insurance against a same-day CI failure.
- Keep the `Fastfile` and CI config under the same code-review bar as application code - a change to the production-promote lane deserves at least the scrutiny of a payment-flow PR, since a mistake there ships to every user.
- Write a short incident postmortem (blameless, focused on process gaps) after every rollback/halted rollout, even a minor one - this is how the runbook actually improves over time instead of staying static.

### Tradeoffs table: rollout speed vs safety

| Approach | Speed to 100% | Safety | Best for |
|---|---|---|---|
| Immediate 100% rollout | Fastest | Lowest - full blast radius on any regression | Trivial, low-risk changes only (rare in fintech) |
| Standard staged rollout (10% -> 50% -> 100% over days) | Moderate | High - regression caught at small scale | Default for regular release trains |
| Aggressive hotfix rollout (20% -> 100% within hours) | Fast | Moderate - some safety retained, but compressed monitoring window | Genuine production incidents where speed matters more than the full multi-day ramp |
| Feature-flag-gated rollout (binary ships dark, flag ramps independently) | Fastest rollback (no new binary needed) | Highest for the specific feature, decoupled from build risk | Any risky new feature within an otherwise-safe release |

### Harder follow-up interview questions (with model answers)

**Q1: Your production payment flow is broken for 15% of users on a specific Android OS version, discovered 2 hours after a staged rollout hit 50%. Walk me through your next 30 minutes.**
> "First action, before any investigation: halt the rollout immediately - that's a one-click action and there's no reason to let more users receive a build I already suspect is bad while I investigate. Second, I check whether this is a native issue tied to that specific OS version (an API behavior change, a permission model shift) or something broader that just happens to correlate with that version's user segment. Third, I decide fix path: if it's isolable to a feature-flag-gated code path, I disable that flag remotely as an immediate mitigation, which doesn't require a new build. If it's not flag-gated, I start a hotfix branch off the current production tag in parallel with confirming root cause, so I'm not blocked on full diagnosis before starting the fix. Throughout, I'm communicating status to the team/stakeholders at a defined cadence rather than going quiet while heads-down, since a payment-flow incident needs visibility."

**Q2: How do you decide the exact percentage and ramp schedule for a staged rollout, rather than just using a fixed 10/50/100 every time?**
> "I calibrate to blast radius and confidence, not a fixed default. A release that only touches a low-traffic settings screen might go 25% -> 100% over a day since the downside of a bug is small. A release touching the core payment flow, or including a risky dependency upgrade, gets a more conservative ramp - maybe 5% -> 15% -> 50% -> 100% over several days - specifically so the monitoring window at each stage is long enough to catch a slower-burning issue, not just an immediate crash spike. I also factor in traffic volume: a 5% stage on a high-traffic app might give you statistically meaningful signal in an hour, while the same 5% on a lower-traffic app might need a full day to be confident."

**Q3: A cert used for `fastlane match` accidentally gets committed to a public fork of your private repo by a contractor. What's your response, step by step?**
> "Immediate: treat the signing identity as fully compromised regardless of how quickly it was removed from the fork - git history and forks make 'we deleted it' insufficient. I'd revoke the compromised certificate in the Apple Developer portal, generate a new one via `match`, and force every team member and CI to re-sync (`match` with the `force` flag) to the new identity. I'd also audit whether that certificate was used to sign any build currently live in the App Store, since existing users' installed apps aren't affected by a revoked cert but any *in-flight* build depending on it would need re-signing. Finally, I'd review why a contractor had write access to a repo containing signing material at all, and tighten access scope going forward - this is as much an access-control gap as a one-time mistake."

**Q4: How would you design a hotfix SLA that's realistic rather than aspirational?**
> "I'd tier it by severity rather than one blanket number: a full outage of a core money-moving flow gets the tightest SLA - say, a fix shipped or at minimum a mitigating feature flag flipped within an hour or two, since that's genuinely achievable with a pre-rehearsed runbook and pre-existing feature flags around risky code paths. A significant-but-non-blocking bug (wrong copy on a confirmation screen, a non-critical crash affecting a small user segment) gets a same-day-to-next-train SLA, since rushing that doesn't buy much and skipping normal review for it isn't worth the risk. The key to making it realistic rather than aspirational is tying each tier to an actual rehearsed capability - if the team has never actually practiced the one-hour path, committing to it in a doc is fiction, not an SLA."

**Q5: Your `versionCode`/build-number auto-increment logic queries the store for the "latest" value, but the store API call itself fails intermittently in CI. How do you make this pipeline step reliably resilient?**
> "I'd add a retry with backoff on the store API query itself, since transient API failures shouldn't fail the whole build. But more importantly, I'd fail loudly and stop the pipeline rather than silently falling back to a local counter or a stale cached value if the query genuinely can't succeed after retries - a wrong-but-successful build number is a worse failure mode than a red pipeline, because it can silently create a collision or a downgrade-looking version further down the line. I'd also alert on this specific failure distinctly from a generic build failure, since 'can't reach the store API' is an actionable, different signal than 'the code doesn't compile.'"

### Staff-level interview monologue: "How do you think about release engineering as a risk-management discipline, not just automation?"

> "Early in my career I thought of CI/CD purely as automation - turning manual steps into a script. What changed my thinking is realizing the actual value is risk management: every stage of the pipeline exists to catch or contain a specific failure mode. Tests catch logic regressions before build. Signing discipline and `match` prevent a whole class of 'works on my machine' and cert-chaos failures. Staged rollout contains the blast radius of whatever slips past tests. Mapping file/dSYM uploads ensure that when something does go wrong in production, I can actually read the crash instead of staring at hex addresses. A hotfix SLA and rehearsed rollback procedure ensure that when the worst happens, response time is measured in minutes of a known runbook, not hours of improvisation. When I explain the pipeline to a new engineer, I don't walk them through the YAML - I walk them through which failure mode each stage exists to prevent, because that's the version of the knowledge that actually transfers when they have to modify or debug it later, under pressure, without me in the room."

---
