# 11. Senior-Level Best Practices

> Source: `interview-prep/devops-cloud/04-git-ci-basics.md`

### Rapid-fire scenario responses (say these in one breath)
- "A test passes locally but fails in CI." -> Check for environment/version drift (Node version, lockfile mismatch) before assuming the test itself is wrong.
- "A teammate wants to force-push over main to 'clean up' history." -> No - main is shared history; use revert for undoing changes, never rewrite shared history.
- "iOS build fails in CI but works on a local Mac." -> Check the CI runner's Xcode version and whether it has access to the same signing certs via `match`.
- "A release needs to go out faster than the usual review process allows." -> Use the documented emergency-bypass path with mandatory follow-up review, not a quiet skip of branch protection.
- "CI takes 25 minutes and engineers have started skipping it locally before pushing." -> Treat pipeline duration as a real productivity metric; investigate caching, parallelization, or splitting slow stages.

### Decision framework: how strict should branch protection and required checks be?
- Small team, low risk tolerance for velocity loss -> require passing lint+test CI before merge, require at least one review, allow direct pushes to main only for genuine emergencies with a documented follow-up PR.
- Team scaling past a handful of engineers, or a regulated/high-stakes domain (payments, health data) -> add required status checks per protected branch, disallow force-push to main entirely, require a fresh review after new commits (dismiss stale approvals), and consider requiring a specific reviewer/team for sensitive paths (e.g. migrations, payment code).
- Mobile release branches specifically -> protect release branches the same as main, since a bad merge into a release branch can ship straight to app store review with real user-facing consequences and a slow feedback loop to fix.

### CI as a product - a checklist, not just "pipeline exists"
- [ ] Pipeline feedback time is treated as a product metric with a target (e.g. "lint+test feedback under 5 minutes") - slow CI quietly erodes team velocity and gets bypassed under pressure.
- [ ] Flaky tests are tracked and fixed or quarantined, not just re-run until green - a team that habitually clicks "retry" has already lost trust in its own CI signal.
- [ ] Failure messages are actionable - a failing job's output should tell the next engineer what broke and roughly why, not just "exit code 1."
- [ ] Secrets used by CI are least-privilege and rotated on a schedule (or on any suspected exposure), and audited periodically for unused/over-broad ones.
- [ ] Production deploy jobs require an explicit manual gate (`when: manual` or equivalent) - auto-deploying every merge to production is a deliberate choice, not a default, and should be a team decision with rollback readiness in place first.
- [ ] The pipeline itself is version-controlled and reviewed like code (`.gitlab-ci.yml` changes go through PR review, not edited ad hoc in project settings).
- [ ] Runner tags are documented so it's clear why a job routes to a specific runner (e.g. macOS for iOS), avoiding "mystery tag" configuration nobody understands months later.
- [ ] A dependency-update strategy exists (scheduled update PRs reviewed on their own) rather than dependency bumps riding along silently inside unrelated feature PRs.

### Incident-ready deploy checklist
- [ ] Every deploy produces a traceable artifact (image tag/commit SHA) so "what's running right now" and "what was running an hour ago" are both instantly answerable.
- [ ] Rollback is a rehearsed, one-command (or one-click) action - redeploy the previous artifact - not an improvised git revert + rebuild under pressure.
- [ ] Database migrations that accompany a deploy are backward-compatible with the previous code version for at least one deploy cycle, so a rollback of the app code doesn't leave the schema in an incompatible state.
- [ ] A recent, successful deploy is a precondition checked before starting any risky change - don't ship a risky feature on top of a pipeline that's been red for days.
- [ ] On-call/whoever deploys has a clear "how do I know this deploy is healthy" signal (health check, error rate dashboard) within minutes of deploy, not "we'll find out if support tickets come in."

### Worked scenario: a bad merge to main just triggered an auto-deploy
1. **Confirm impact first**: check the health check/error-rate dashboard to see if this is actually causing user-facing harm right now, not just "looks risky in the diff."
2. **Roll back the deploy immediately if impact is confirmed**: redeploy the previous artifact tag - this is why immutable, traceable builds matter, since it's a redeploy, not an emergency rebuild.
3. **Revert the merge commit on main** (`git revert`, not `git reset --hard` + force-push, since main is shared history) so the next deploy doesn't reintroduce the bug.
4. **Root-cause after service is restored**: why did CI not catch this - missing test coverage, a flaky test that was ignored, a required check that wasn't actually required on this branch?
5. **Close the gap**: add the missing test/check, and consider whether this specific class of change (e.g. anything touching the payment path) should require a second reviewer or a stricter required-check going forward.
6. **Write a short postmortem**: what broke, why CI didn't catch it, what changed as a result - treating the pipeline itself as something that improves after every incident, not just the code.

### Anti-patterns and failure modes
| Anti-pattern | Failure mode | Fix |
|---|---|---|
| Auto-deploying every merge straight to production, no gate | A bad merge ships immediately with no chance to catch it | Manual approval gate, or at minimum a canary/staged rollout step |
| Rebuilding the artifact separately for each environment | What was tested in staging isn't provably what's in production | Build once, promote the same artifact through environments |
| Ignoring/retrying flaky tests instead of fixing them | CI's pass/fail signal becomes meaningless, real failures get missed in the noise | Quarantine and prioritize fixing flaky tests; track flakiness as a metric |
| Secrets hardcoded in `.gitlab-ci.yml` "temporarily" | Committed to git history permanently, visible to anyone with repo access | CI/CD protected, masked variables only |
| No rollback plan tested until an actual incident | Improvised recovery under pressure takes longer and is more error-prone | Rehearse rollback as a routine drill, not a crisis-only procedure |

### Common production incidents mapped to root cause
| Symptom | Likely root cause | First check |
|---|---|---|
| CI is green but production is broken | Missing test coverage for the actual failure path | Identify the gap, add the missing test/check |
| Same test fails intermittently across unrelated PRs | Flaky test (timing/order dependency), not the code under test | Quarantine it, root-cause separately, don't just retry forever |
| iOS build fails only in CI | CI runner's Xcode/cert access differs from local machine | Compare tool versions and `match` access between CI and local |
| Secret suddenly stops working in CI | Rotated at the source but not updated in CI/CD variables | Confirm the CI/CD variable was updated after rotation |
| Deploy took down the site with no easy rollback | No traceable, immutable artifact tagging | Confirm images are tagged by commit SHA, not `latest` |

### Observability for the delivery pipeline itself
- Track deploy frequency, lead time for changes, and change failure rate (the core delivery metrics) - not as vanity numbers, but as an early signal that process friction is growing.
- Alert on pipeline duration regressions the same way you'd alert on API latency regressions - a pipeline that silently crept from 5 to 25 minutes over a year is a real productivity cost.
- Track post-deploy error rate/health check status automatically for a window after every deploy, so a bad deploy is flagged by the system, not by whoever happens to notice user complaints first.
- Log and review deploy-to-incident correlation over time - if a disproportionate share of incidents follow deploys, that's a signal to invest in better pre-merge checks or staged rollouts, not just "be more careful."

### Scalability and team practices
- As the team grows, move from "anyone can approve any PR" to path-based required reviewers for sensitive areas (migrations, CI config, payment/auth code) without over-bureaucratizing everything else.
- Keep the CI pipeline's own configuration under the same review bar as application code - a change to `.gitlab-ci.yml` that weakens a required check is exactly as risky as a change to business logic.
- Periodically audit CI/CD variables and runner access for staleness - a departed contractor's still-valid deploy credentials, or a runner tag nobody remembers the purpose of, are real, recurring findings in security reviews.
- Make "how do I roll back" and "how do I check if the last deploy is healthy" answerable by any team member from documentation, not just tribal knowledge held by whoever set up the pipeline originally.

### Senior follow-up Q&A
1. **Your team ships several times a day. How do you keep that safe without slowing everyone down?** -> Fast, reliable CI (fail-fast staged checks, no tolerance for flaky tests), small/focused PRs that are easy to review quickly, an immutable build-once-promote-everywhere artifact strategy, automated post-deploy health checks, and a fast, rehearsed rollback path - speed and safety aren't in tension when the pipeline and artifact strategy are solid; they're only in tension when either is weak.
2. **A production deploy just went out and error rates are spiking. What do you do in the first two minutes, and how does your CI/CD setup make that fast?** -> Check the automated post-deploy health/error-rate signal first (it should already be flagging this), confirm it correlates with the deploy timestamp, and roll back immediately by redeploying the previous known-good artifact tag - because the artifact is immutable and already built, this is a redeploy, not a rebuild, so it's fast. Investigate root cause after service is restored, not before.
3. **How do you handle a database migration that needs to ship alongside a backward-incompatible code change?** -> Split it into multiple deploys: first ship code that works with both old and new schema (backward-compatible), then run the migration, then ship code that requires the new schema, then (optionally, later) clean up any compatibility shims - never ship a migration and a hard-incompatible code change in the same atomic deploy, since a rollback of the code would then be incompatible with the already-migrated schema.
4. **A flaky test has been "usually passing on retry" for months. What's actually wrong with leaving it that way?** -> Every retry erodes trust in the CI signal - engineers start assuming red is probably flaky rather than investigating, which means a real failure eventually gets waved through as "probably just flaky again." It also silently increases pipeline duration and CI cost. The fix is to invest time in root-causing or quarantining it, treating "unexplained flakiness" as a bug in its own right, not background noise.
5. **How would you design CI/CD for a monorepo with a backend, a frontend, and a mobile app, without every change triggering every pipeline?** -> Use path-based `rules`/`only:changes` so a change under `backend/` triggers only backend lint/test/build/deploy, `mobile/` triggers only Fastlane lanes, etc., with a shared/common path triggering everything relevant as a safety net. This keeps feedback fast and specific instead of paying the cost of the slowest pipeline on every single commit regardless of what changed.
6. **What's the actual argument for a manual approval gate before production deploy, given it slows things down?** -> It's a deliberate, cheap checkpoint against exactly the highest-cost failure mode - shipping a broken change to real users - and it costs a few seconds of a human's attention versus the cost of an incident. The right framing isn't "manual gates vs speed," it's "which specific deploys are risky enough to warrant a human glance before they go live," which can be scoped narrowly (e.g. only production, only certain services) rather than applied everywhere uniformly.
7. **A hotfix needs to go out immediately, but it would normally require two reviewer approvals per your branch protection rules. What do you do?** -> Most platforms support a documented emergency-bypass process (e.g. an admin override with mandatory follow-up review) rather than quietly disabling branch protection - use that, get at least one review even if abbreviated, deploy, and then require a full retroactive review and a written note on why the exception was needed, so the bypass path itself stays auditable and rare rather than becoming a habit.

---
