# 08. Firebase Crashlytics workflow

> Source: `interview-prep/react-native/08-push-firebase-device.md`

### Topics to learn
- [ ] Setup: native SDK wiring, dSYM/mapping file upload for symbolication
- [ ] Fatal crash reporting vs `recordError` for handled/non-fatal exceptions
- [ ] Custom keys and user identifiers (careful with PII) for context
- [ ] Breadcrumb logging (`log()`) before a crash to reconstruct the path
- [ ] Crash-free users / crash-free sessions as the headline metric
- [ ] Symbolicated stack traces: turning obfuscated/minified traces back into readable file:line
- [ ] Triage loop: classify ? prioritize by impact ? reproduce ? fix ? verify in next release
- [ ] JS exceptions vs native crashes appearing in the same dashboard

### The triage workflow (use this narrative for your crash-rate stories)

1. **Classify** � Is the top crash JS (unhandled promise rejection, JS `TypeError`) or native (segfault, NPE, ANR-adjacent)? Crashlytics groups both, but the stack shape tells you which.
2. **Prioritize by impact** � Sort by number of affected users/sessions, not just occurrence count. A crash hitting 40% of sessions on one screen matters more than one hit rarely.
3. **Reproduce** � Match app version, OS version, device model from the crash report; reproduce on a release build (JS engine/minification differences from dev can hide/reveal issues).
4. **Root-cause** � Use breadcrumbs/custom keys to reconstruct the user's path; for native, symbolicate and read the actual native stack.
5. **Fix + guard** � Fix the root cause; add defensive guards (null checks, error boundaries, safe JSON parsing) so the same class of bug doesn't recur elsewhere.
6. **Verify** � Ship, monitor crash-free users trend on the new build specifically, don't just look at the aggregate which is diluted by old versions still in the wild.
7. **Staged rollout** � Use staged rollout percentages on Play Store (and phased release on App Store) so a regression only affects a fraction of users before you halt it.

### Your real numbers (be ready to narrate these fluently)

| Project | Crash rate before | Crash rate after |
|---|---|---|
| MyCreditInfo | ~20% | ~0.03% |
| Wizer | ~15% | ~0.09% |
| Online School | ~28% | ~0.15% |

### Interview question

**Q: Walk me through how you took MyCreditInfo's crash rate from ~20% to ~0.03%.**

**Strong answer sketch:**
> "The app had an outdated, unmaintained codebase, so crashes came from multiple angles � stale native dependencies, unguarded JS logic, and some patched-but-fragile native Android libraries. I started by wiring Crashlytics properly with symbolication so native stacks were actually readable, then sorted crashes by affected-users, not raw count, and tackled the top offenders first. A meaningful chunk came from a handful of native library incompatibilities I had to patch directly, and from unguarded JS paths � I added defensive checks and error boundaries around the worst offenders. I also modernized dependencies as part of the same effort, since several crashes traced back to outdated libraries with known native bugs. After each release I watched crash-free users specifically for that version, not the diluted aggregate, and used staged rollouts so a regression wouldn't blow up the whole user base at once. That iterative, impact-sorted loop is what got it from ~20% down to ~0.03%."

**Follow-up: How do you avoid regressing crash rate on the next release?**
> Staged rollouts, monitoring crash-free users per version immediately after release, keeping regression-prone areas covered by tests, and treating any crash-rate spike as a stop-the-line signal before continuing rollout.

---
