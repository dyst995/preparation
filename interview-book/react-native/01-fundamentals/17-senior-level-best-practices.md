# 17. Senior-Level Best Practices

> Source: `interview-prep/react-native/01-fundamentals.md`

### Decision framework: is this actually a "fundamentals" problem?

Before reaching for a fix, a senior engineer classifies the report first. Use this triage order on any "app feels broken/slow/crashy" ticket:

| Question | If yes -> | If no -> |
|---|---|---|
| Does it reproduce on a release build? | Continue investigating as real | Stop - dev-mode overhead (warnings, non-optimized Hermes bytecode, Chrome remote debugger) is a common false alarm |
| Does it reproduce on more than one device/OS version? | Likely a JS/logic bug | Might be an OS-version-specific native quirk (permissions, WebView, keyboard behavior) |
| Is JS FPS low while UI FPS is fine? | JS-thread bound - profile React renders/computation | Check UI thread - native view tree, layout, or a blocking native call |
| Did it start after a dependency/RN upgrade? | Bisect via git/lockfile diff and changelog of the bumped libs first | Look at your own recent feature commits first |
| Is it New Architecture related (Turbo Module/Fabric)? | Check the library's New Architecture support matrix before assuming your code is wrong | Treat as ordinary JS/native bug |

### When to adopt New Architecture aggressively vs cautiously

| Situation | Recommendation |
|---|---|
| Green-field app, small dependency tree | Adopt New Architecture on day one - no legacy debt to carry |
| Mid-size app, most deps already migrated | Migrate now; budget 1-2 sprints for the stragglers and interop layer |
| Large legacy fintech app with many native SDKs (biometrics, hardware scanners, payment SDKs) | Migrate deliberately: audit every native dependency's New Architecture support first, migrate in a branch, keep a rollback plan, and do not couple the migration with unrelated feature work |
| A vendor SDK (payment/KYC provider) has no New Architecture support yet | Stay on the interop layer rather than blocking the whole app; track the vendor's roadmap and re-evaluate every release cycle |

### Production checklist (fundamentals-level, ship-ready)

- [ ] Hermes enabled and release build confirmed to ship precompiled bytecode (not just "Hermes is on" in config - verify with a bundle inspection)
- [ ] Crashlytics (or equivalent) wired for both JS exceptions and native crashes, with dSYMs/mapping files uploaded automatically in CI, not manually
- [ ] A documented, rehearsed process for reproducing "release-only" bugs (internal track / TestFlight build, matching app version and device tier)
- [ ] Metro cache and monorepo resolution issues have a one-command fix documented (`--reset-cache`, clean watchman) so nobody loses half a day to a stale cache
- [ ] At least one FlatList/long-list screen has been profiled on a real low-end Android device, not just a simulator/emulator
- [ ] Platform-specific code is isolated to `.ios`/`.android` files or `Platform.select`, never scattered `if (Platform.OS === 'ios')` checks inside business logic
- [ ] A written policy exists for "which RN version are we on, and what's the upgrade cadence" - not upgraded reactively only when something breaks

### Anti-patterns seniors reject in code review

- **"RN is just slow, ship it anyway"** - no measurement, no profiler evidence, treated as an unfalsifiable excuse instead of a bug to isolate.
- **Debugging perf exclusively in dev mode** - dev mode has extra invariant checks and un-optimized bytecode; conclusions drawn there routinely do not hold in release.
- **Reaching for a native module before checking if a maintained JS library already exists.** Every native module is a second codebase to maintain and a New Architecture compatibility liability.
- **Platform checks (`Platform.OS === 'android'`) sprinkled through business/domain code** instead of isolated at the UI/native boundary - makes the domain layer untestable and unreadable.
- **Ignoring `ANR`/native-crash-rate dashboards until a client complains.** Seniors treat crash-free-users % as a first-class, continuously watched metric, not a fire drill metric.
- **Blaming "the bridge" or "JS thread" reflexively without opening a profiler.** Legacy-bridge congestion is a real and specific failure mode, not a catch-all excuse for any sluggishness.

### Failure modes & how seniors debug them

| Symptom | Likely root cause | First tool | Typical fix |
|---|---|---|---|
| App works in Xcode/Android Studio debug run, crashes on TestFlight/internal track | Missing `Info.plist` string, ProGuard/R8 stripping a class, Hermes-only bug | Crashlytics symbolicated stack + release build repro | Add missing config, add ProGuard keep rule, or fix Hermes-incompatible code path |
| Taps feel unresponsive but the screen looks static (not animating) | JS thread blocked by synchronous work (huge JSON parse, unmemoized huge tree render) | Perf Monitor JS FPS, React DevTools Profiler | Move parsing off critical path, virtualize, memoize hot components |
| Native module works on one platform, silently `undefined` on the other | Missing `ReactPackage` registration (Android) or missing Objective-C bridging export (iOS) | `console.log(NativeModules)` + native build logs | Register package / fix bridging export, clean native rebuild |
| Everything is fine until a specific Android OS version | Target SDK behavior change (permissions, background limits) unrelated to RN itself | Device-tier/OS-version segmentation in Crashlytics | Patch the permission/behavior handling for that SDK level |
| Metro fails to resolve a module only in CI, not locally | Case-sensitivity, monorepo symlink resolution, stale lockfile | Clean CI cache, compare `yarn.lock`/`package-lock.json` diffs | Fix resolver config, pin the dependency, clear CI cache step |

### Observability / metrics a senior actually watches weekly

- **Crash-free users %** and **crash-free sessions %**, segmented by app version and OS version (a regression hiding in only one OS version is common and easy to miss in an aggregate number).
- **ANR rate** (Android) as a distinct signal from crash rate - ANRs point at main-thread/UI-thread blocking, not JS exceptions.
- **Cold start / TTI**, tracked as a real timestamp metric (native launch to first interactive frame), not just "feels fast in testing."
- **JS FPS / UI FPS distributions** on key heavy screens (main list/dashboard) across a device-tier sample, not just your own dev phone.
- **Hermes GC pause frequency/duration** on memory-heavy screens, if available via native profiling - correlates with jank on long list sessions.
- **Bundle size trend over time** - unmonitored growth quietly increases download time and TTI release over release.

### Scalability & team practices

- **RN/dependency upgrade cadence is a scheduled activity**, not an emergency response to a security advisory - e.g. evaluate every minor RN release, commit to a major upgrade every 1-2 quarters depending on team size.
- **Module boundary lint rules** (e.g. forbidding deep imports across feature folders) catch "fundamentals decay" - people re-implementing platform checks or list virtualization ad hoc in every feature instead of using a shared primitive.
- **Code review checklist item**: "does this new list use virtualization, and is `keyExtractor` stable?" catches the single most common junior mistake before it ships.
- **A living upgrade runbook** (what broke last time, what to re-test) turns institutional pain into a reusable checklist instead of relearning the same lessons every major RN bump.
- **ADR (Architecture Decision Record) for "why Hermes," "why New Architecture timing," "why this native module vs that JS library"** - so the next engineer doesn't relitigate settled decisions during a stressful incident.

### Tradeoffs table

| Choice | Pro | Con | When it bites you |
|---|---|---|---|
| Adopt New Architecture early | Future-proof, better perf ceiling | Some libraries may lag support | A payment/KYC SDK blocks your migration for months |
| Stay on legacy interop longer | Stability, less migration risk | Missing perf/typing wins, eventual forced migration | Forced to migrate under time pressure once RN drops legacy support |
| Aggressive `removeClippedSubviews` usage | Lower memory on long lists (esp. Android) | Occasional rendering glitches with overlays/sticky headers | Silent visual bug reported by users, hard to repro in dev |
| Splitting platform code into `.ios`/`.android` files early | Clean separation, easier long-term maintenance | More files, some duplication for small differences | Overkill for a one-line style difference - use `Platform.select` instead |

### Harder follow-up interview questions (with model answers)

**Q: Your crash-free rate looks great in the aggregate dashboard, but a specific Android OEM's users are complaining. How do you catch this before it becomes a support fire?**

> "Aggregate crash-free % hides device-tier and OEM-specific regressions. I segment Crashlytics by device manufacturer, OS version, and app version, and I set an alert threshold per segment, not just globally. OEM-specific issues are usually either a memory-constrained device choking on image-heavy screens, or an OEM's customized Android build behaving differently around background limits/permissions. I'd reproduce on a device from that OEM's tier before assuming it's a generic bug."

**Q: You're told 'just enable Hermes, it'll fix our performance problems.' How do you respond as the senior on the call?**

> "I'd ask what specific metric we're trying to move - TTI, JS FPS, memory - and whether we've already profiled where time is actually going. Hermes helps with parse/startup cost and often memory, but it doesn't fix a genuinely slow render tree, an unvirtualized list, or a blocking native call. I'd treat 'enable Hermes' as one likely-good change to make regardless, but I would not present it as the fix for an unmeasured problem."

**Q: A junior engineer wants to write a native module for something you suspect a JS library already solves well. How do you handle that in review?**

> "I'd ask them to show what capability the existing library is missing, concretely - not just 'it felt cleaner to write our own.' If there's a real gap (unsupported platform version, missing feature, performance requirement), native code is justified and I'd pair with them on the exposure pattern. If there's no real gap, I'd steer them to the library, because every native module we own is a second codebase we now maintain across every future RN upgrade."

**Q: How would you convince a skeptical stakeholder that a 2-sprint RN upgrade is worth doing now rather than later?**

> "I'd frame it in terms of compounding cost: the longer we wait, the more dependencies drift further from New Architecture/latest-RN support, and the bigger the eventual forced migration becomes. I'd also tie it to a concrete risk - e.g. a security patch or OS-level deprecation that only lands in a newer RN/Hermes version - and show the crash-rate or perf upside from similar upgrades we've done before, the way the MyCreditInfo and Wizer modernizations paid off."

**Q: What's the first thing you check when a "cannot reproduce" bug report comes in from production?**

> "Whether it's release-only. I ask for app version, OS version, device model, and whether it happened once or repeatedly. Then I try to reproduce on a matching release build and device tier before writing a single line of speculative code. Most 'unreproducible' bugs are actually 'not reproduced in the right environment yet.'"

### What I'd say in a staff/senior interview

> "My approach to RN fundamentals isn't about reciting what JSI or Fabric are - it's about using that mental model to triage fast under pressure. When something's wrong in production, I don't guess: I classify JS-thread vs UI-thread vs native, reproduce on a release build, and pick the right tool for that specific layer. I've done this at scale - taking crash rates from 15-28% down to under 0.2% on legacy apps wasn't one fix, it was a repeatable process: measure, isolate, fix the biggest offender, re-measure, and write down what we learned so the team didn't relearn it during the next incident. That process, more than any specific API knowledge, is what I think separates a senior RN engineer from someone who's just used the framework for a few years."

---
