# 12 - Upgrades, Stability & Production Debugging

> Goal: Own the story of taking real production apps from double-digit crash rates down to near-zero (MyCreditInfo ~20% -> 0.03%, Wizer ~15% -> 0.09%, Online School ~28% -> 0.15%), and speak with total confidence about RN upgrades, dependency conflicts, and systematic production debugging.

Mark progress with `[x]` as you master each topic.

---

## Learning objectives

By the end of this section you should be able to:

1. Run a React Native version upgrade methodically, including native project regeneration and conflict resolution.
2. Diagnose and resolve dependency/peer-dependency conflicts without guessing.
3. Read a Crashlytics stack trace and correctly classify JS vs native, and know what's needed to symbolicate each.
4. Distinguish ANR, crash, and freeze precisely, with detection strategy for each.
5. Execute a systematic, repeatable crash-reduction playbook - not one-off fixes.
6. Use feature flags/remote config to de-risk releases and stop bleeding without a new binary.
7. Log safely in production without leaking PII.
8. Reproduce device-specific bugs (OEM, OS version, screen density) systematically.
9. Tell your three flagship crash-reduction stories fluently, with numbers, in interview format.

---

## 1. React Native upgrade strategy

### Topics to learn
- [ ] React Native Upgrade Helper (diffing native project files between versions)
- [ ] Incremental vs "big bang" upgrades
- [ ] Native project regeneration (`react-native upgrade`, or reinitializing native folders)
- [ ] Autolinking changes across versions
- [ ] New Architecture opt-in considerations during an upgrade
- [ ] Library compatibility auditing before upgrading
- [ ] Testing matrix after an upgrade (devices, OS versions, critical flows)

### Practical upgrade playbook

1. **Audit dependencies first.** Check every native-touching library (navigation, gesture handler, reanimated, native modules, push/Crashlytics SDKs) for compatibility with the target RN version *before* touching anything. This is where most upgrade pain actually lives, not in RN's own JS APIs.
2. **Read the RN Upgrade Helper diff** for your current -> target version, focusing on native file changes (`AppDelegate`, `MainApplication`, Gradle files, `Podfile`, `Info.plist`, `AndroidManifest.xml`).
3. **Upgrade in small hops when the gap is large** (e.g. don't jump 3 major versions at once) - each hop is independently testable and bisectable if something breaks.
4. **Apply native diffs manually or via the upgrade tool**, resolving conflicts file by file rather than blindly overwriting custom native code.
5. **Regenerate/clean native builds**: clear Gradle/CocoaPods caches, reinstall pods, clean derived data - stale caches cause misleading "upgrade" bugs that are really cache bugs.
6. **Run the full manual test matrix** on both platforms: cold start, navigation, camera/biometrics/push (anything native), and the app's most business-critical flow (for fintech: login, transfer/payment).
7. **Ship to internal/staged rollout first**, exactly like any release - an RN upgrade is not exempt from the staged rollout discipline in Section 9 of the CI/CD chapter.

### Interview question

**Q: How do you approach a major React Native version upgrade on a production app?**

> "I start with a dependency audit, not the RN version itself - every native-touching library needs to support the target version, and that's usually where an upgrade actually breaks. I read the official upgrade diff for native project files and apply it deliberately rather than blindly, especially where we have custom native code. For a large version gap, I hop through intermediate versions instead of jumping straight to the latest, so each step is bisectable if something regresses. After the native diff is applied, I do a clean rebuild - stale Gradle/CocoaPods caches cause a lot of false 'upgrade broke this' reports. Then I run a full manual pass on both platforms covering cold start and every native-touching flow, and ship through the same staged rollout process as any other release, watching Crashlytics closely for the first days after."

### Common upgrade failure modes

| Symptom | Likely cause |
|---|---|
| Build fails only on iOS after upgrade | Pod version mismatch, stale `Podfile.lock`, missing `pod install` |
| Build fails only on Android | Gradle/AGP version mismatch, Kotlin version conflicts between libraries |
| App builds but crashes on launch | Native module ABI mismatch, autolinking picked up an incompatible native module version |
| Random new TypeScript errors | Upgraded type definitions no longer match usage; not actually a runtime bug |
| Works on emulator, fails on real device | Architecture (arm64 vs x86) build config gaps, Hermes bytecode mismatch |

---

## 2. Dependency conflicts & "dependency hell"

### Topics to learn
- [ ] Peer dependency mismatches (React version conflicts between RN and libraries)
- [ ] Native version mismatches (a JS library version expecting a newer/older native counterpart)
- [ ] Autolinking picking up multiple versions of a native dependency transitively
- [ ] Lockfile discipline (`yarn.lock`/`package-lock.json` committed and respected)
- [ ] Resolutions/overrides to force a single version of a transitive dependency
- [ ] CocoaPods `Podfile.lock` and Gradle dependency resolution conflicts

### Systematic conflict resolution approach

1. Reproduce cleanly: delete `node_modules`, lockfile-respecting reinstall, delete native caches (`Pods`, `Podfile.lock` only if intentional, Gradle cache).
2. Identify the actual conflicting versions via `yarn why <package>` / `npm ls <package>` rather than guessing.
3. Check whether it's a **peer dependency warning** (often survivable) vs an actual **runtime/native mismatch** (usually not survivable).
4. Force resolution with `resolutions` (Yarn) or `overrides` (npm) when you need a single version of a deeply nested transitive dependency, and document *why* with a comment - future you (or a teammate) needs the context.
5. For native-level conflicts (two libraries requiring different native SDK versions), check each library's changelog/compatibility table before forcing anything - some conflicts genuinely require picking a different library version pairing, not a forced override.

### Interview question

**Q: You add a new library and the app won't build. How do you debug it?**

> "First I check whether it's a JS-level peer dependency conflict or a native build failure - the error message and which platform fails usually tells me immediately. For JS conflicts, I use `yarn why` to see the actual dependency tree instead of guessing, and consider a `resolutions` override if it's a transitive version fight. For native failures, I check the library's required native SDK/Kotlin/Xcode version against what the project currently has, and check autolinking isn't pulling in two versions of the same native dependency transitively. I always reproduce from a clean install first, because a huge share of 'dependency hell' reports are actually stale cache issues, not real conflicts."

---

## 3. Crashlytics: JS vs native stacks

### Topics to learn
- [ ] Where JS exceptions show up in Crashlytics (via the Crashlytics RN SDK's JS error handler)
- [ ] Native Android crash stacks (Java/Kotlin, plus NDK/native crashes)
- [ ] Native iOS crash stacks (Swift/Obj-C, plus native crash symbolication)
- [ ] Symbolication requirements: Proguard/R8 mapping files (Android), dSYMs (iOS)
- [ ] Source maps for readable JS stacks in Crashlytics
- [ ] Distinguishing "caught and reported" errors vs actual fatal crashes
- [ ] Breadcrumbs/custom logs/keys attached before a crash for context

### Classification table

| Signal | JS crash | Native crash |
|---|---|---|
| Stack trace content | File/function names from your JS/TS source (or minified names without source maps) | Java/Kotlin class names (Android) or Swift/Obj-C/framework names (iOS) |
| Symbolication needed | JS source maps uploaded, or readable if unminified | Proguard/R8 mapping file (Android) or dSYM (iOS) |
| Common causes | Unhandled promise rejection, null/undefined access, bad JSON parsing, unguarded array access | Native module misuse, memory issues, OS-level API misuse, ANR-adjacent issues, native library bugs |
| Where it's caught | RN's JS error handler / ErrorBoundary / Crashlytics JS SDK hook | OS-level crash reporter hooked by the native Crashlytics SDK |
| Typical fix location | Your JS/TS code, or a JS wrapper around a native call passing bad data | Native module code, native SDK version, or platform-specific native config |

### Why symbolication matters so much

An unsymbolicated stack trace is often just memory addresses or minified/obfuscated names - effectively useless. Every release must upload:
- **Android**: the R8/Proguard `mapping.txt` for that exact build (Fastlane can automate this upload to Crashlytics).
- **iOS**: dSYMs for that exact build (also automatable via Fastlane's `upload_symbols_to_crashlytics` or the Crashlytics Gradle/Cocoapods build phase).

Without matching mapping files/dSYMs for the *exact version* that crashed, you cannot reliably read the stack - this is a common trap when debugging "an old crash" after multiple releases without keeping historical mapping files.

### Interview question

**Q: How do you tell if a Crashlytics report is a JS bug or a native bug, and what do you need to actually read it?**

> "The stack shape tells you immediately - JS stacks show your source file/function names (or minified bundle positions without source maps), native stacks show Java/Kotlin or Swift/Obj-C frames and OS/framework symbols. To actually read either one reliably you need the right artifact for that exact build: a source map for JS, a Proguard/R8 mapping file for Android native, or a dSYM for iOS native. I automated uploading all of these as part of the Fastlane release lane, because a crash report you can't symbolicate is close to useless, and doing it manually after the fact means finding the exact build's artifacts later, which is often a mess."

---

## 4. ANR vs crash vs freeze

### Topics to learn
- [ ] ANR (Application Not Responding) - Android-specific, main thread blocked past a timeout
- [ ] Crash - process terminates due to an unhandled exception/signal
- [ ] Freeze/jank - UI unresponsive but not killed, no formal OS report
- [ ] Detection tools for each
- [ ] Common causes for each in an RN app specifically

### Definitions table

| Term | What happens | Platform | How it's detected |
|---|---|---|---|
| **Crash** | Process terminates due to unhandled exception (JS) or unhandled native exception/signal | Both | Crashlytics fatal report, app closes/restarts |
| **ANR** | Android declares the app unresponsive because the main thread didn't respond to input/a broadcast within a timeout (~5s for input) | Android only (formal OS concept) | Play Console ANR rate, Crashlytics/Play vitals ANR reports with a native-looking stack of the blocked thread |
| **Freeze / jank** | UI stops responding or drops frames but the process is alive and eventually recovers | Both | No formal system report; detected via user complaints, performance monitoring, frame drop metrics, or JS thread stall instrumentation |

### RN-specific causes

| Issue | Typical cause in RN |
|---|---|
| ANR | Long synchronous native module call on the main/UI thread, heavy synchronous bridge work, blocking I/O on main thread |
| Freeze/jank | JS thread blocked by a large synchronous loop, huge unmemoized re-render tree, unvirtualized long list |
| Crash (JS) | Unhandled promise rejection, accessing properties on `null`/`undefined`, bad type assumptions on API responses |
| Crash (native) | Native module passed unexpected types/nulls from JS, OS-level API misuse, memory pressure crash on lower-end devices |

### Interview question

**Q: What's the difference between an ANR, a crash, and a freeze, and how do you investigate each?**

> "A crash means the process actually terminates from an unhandled exception - I'd check Crashlytics and classify JS vs native from the stack. An ANR is Android-specific: the OS itself declares the app unresponsive because the main thread didn't process input within its timeout, usually from a blocking native call or heavy synchronous bridge work - I'd check Play Console's ANR rate and vitals, since it's a different bucket from Crashlytics fatal crashes. A freeze or jank is UI unresponsiveness the app eventually recovers from, with no formal OS report - normally a blocked JS thread from a heavy synchronous computation or an unoptimized long list, which I'd catch through performance profiling or user reports rather than a crash dashboard."

---

## 5. Systematic crash reduction playbook

This is the playbook you actually ran to get MyCreditInfo, Wizer, and Online School from double-digit crash rates down to fractions of a percent. Learn it as a repeatable process, not a one-time fix, because that's what makes the story credible to a senior interviewer.

### The playbook

1. **Baseline and instrument.** Confirm Crashlytics is correctly wired with symbolication (mapping files/dSYMs) for the current release - you cannot fix what you can't read. Establish the actual crash-free users % baseline, not a guess.
2. **Rank by impact, not by ease.** Sort crash clusters by number of affected users/sessions, not by which is easiest to fix. A rare-but-easy fix is a distraction if a top-3 crash affects 40% of crashing sessions.
3. **Bucket each top crash: JS or native, and by root cause category** (null/undefined access, bad API response shape, native module misuse, OS/device-specific, memory pressure, third-party SDK bug).
4. **Fix the top offenders first, ship behind staged rollout, and re-measure** - don't batch 20 unrelated fixes into one release where you can't tell which fix worked.
5. **Add defensive guards, not just point fixes.** If a crash was "accessing `.length` on an undefined API field," the real fix is validating/normalizing API responses at the boundary (schema validation or defensive parsing), not just one null check in one screen - so a whole class of similar future crashes is prevented.
6. **Add breadcrumbs/non-fatal logging** around risky flows so that if a similar crash appears again, you have context (last screen, last action, feature flag state) instead of a bare stack trace.
7. **Repeat the loop** - re-baseline crash-free % after each release, and keep working down the ranked list until you hit a healthy floor (fractions of a percent, matching your CV numbers).
8. **Lock in prevention**: add TypeScript strictness/schema validation at API boundaries, add ErrorBoundaries around risky feature areas so one screen's failure doesn't kill the whole app, and keep dependency versions current so you're not accumulating known-fixed bugs from stale native SDKs.

### Why this reads as senior in an interview

Most candidates say "I fixed some crashes." You can say you ran a **measurement -> triage-by-impact -> fix -> defend-the-class-of-bug -> re-measure** loop across three different apps with different tech debt profiles, and quote the before/after numbers each time. That is a process story, which is what distinguishes senior engineers from "I closed some Jira tickets."

### Interview question (core STAR prompt - also see Chapter 14)

**Q: Walk me through how you reduced crash rate from ~20% to ~0.03% on MyCreditInfo.**

> "The app was a legacy codebase with essentially no crash visibility beyond raw Play Console numbers, so step one was making sure Crashlytics was correctly wired with proper mapping file uploads so stacks were actually readable. Once I had real data, I ranked crash clusters by how many users/sessions they affected, not by how easy each looked. The top clusters were a mix of unguarded assumptions about API response shape and a few native module calls receiving unexpected null values from legacy JS code. I fixed the highest-impact clusters first, added defensive validation at the API boundary so entire categories of 'undefined property access' crashes stopped recurring, and shipped each batch through a staged rollout while watching the crash-free rate. I repeated that loop release after release until crash-free users landed around 99.97%, then kept it there by adding ErrorBoundaries around risky screens and keeping the crash triage habit going for every future release."

---

## 6. Feature flags / remote config for risky releases

### Topics to learn
- [ ] Remote config as a kill switch for a risky feature
- [ ] Percentage rollout of a feature independent of the binary rollout
- [ ] Combining feature flags with staged binary rollouts for layered safety
- [ ] Avoiding "flag debt" (flags that never get cleaned up)

### Why this matters for stability

A staged binary rollout protects against a bad *build*. A feature flag protects against a bad *feature* without needing a new build at all - you can disable just the risky code path remotely, often faster than any hotfix release.

### Practical pattern

```text
if (remoteConfig.isEnabled('new_transfer_flow')) {
  return <NewTransferFlow />;
}
return <LegacyTransferFlow />;
```

- Ship the new flow dark (flag off) in a normal release.
- Enable for a small % of users via remote config, watch Crashlytics/analytics for that cohort specifically.
- Ramp or roll back the flag directly - no new binary/review cycle needed for the rollback.
- Remove the flag and the legacy path once the new flow is proven stable, to avoid flag debt.

### Interview question

**Q: How do feature flags help with production stability?**

> "They decouple 'code is deployed' from 'code is active.' I can ship a risky change dark, ramp it to a small percentage of users via remote config, and if something goes wrong, disable it instantly without waiting on a new build, review, or rollout - which is much faster than any hotfix pipeline. It's a second, independent safety layer on top of staged binary rollouts: one protects against a bad build, the other protects against a bad feature inside an otherwise fine build."

---

## 7. PII-safe logging

### Topics to learn
- [ ] What counts as PII in a fintech app (names, IDs, account/card numbers, balances, auth tokens)
- [ ] Redaction/scrubbing before logging
- [ ] Structured logging with allow-listed fields instead of dumping raw objects
- [ ] Crashlytics custom keys/breadcrumbs discipline (don't attach raw user data)
- [ ] Regulatory/compliance angle for fintech specifically

### Rules of thumb

| Do | Don't |
|---|---|
| Log user IDs (opaque, non-guessable) for correlation | Log full names, card numbers, balances, tokens |
| Log request IDs/correlation IDs | Log full request/response bodies containing sensitive fields |
| Use allow-listed structured fields | `console.log(JSON.stringify(response))` on a payments payload |
| Scrub known-sensitive keys centrally (one logging wrapper) | Trust every call site to remember to redact manually |
| Attach non-sensitive breadcrumbs (screen name, action type, flag state) to crash reports | Attach account numbers or auth tokens as Crashlytics custom keys |

### Interview question

**Q: How do you make sure debugging logs don't leak sensitive data in a fintech app?**

> "I centralize logging through one wrapper instead of trusting every call site to remember to redact, and that wrapper scrubs or blocks known-sensitive keys - tokens, card numbers, balances, personal identifiers - by default rather than by exception. For Crashlytics breadcrumbs and custom keys, I only attach non-sensitive context like screen name, action type, or feature flag state, correlated by an opaque user ID rather than any real identifying data. This isn't just good practice, it's a real compliance requirement in fintech, so I treat it as a hard rule, not a style preference."

---

## 8. Reproducing device-specific bugs

### Topics to learn
- [ ] OEM Android skins affecting behavior (notifications, background task killing, permission dialogs)
- [ ] Screen size/density edge cases
- [ ] OS-version-specific API behavior changes
- [ ] Low-end device performance/memory constraints
- [ ] Using Play Console/Crashlytics device segmentation to spot patterns
- [ ] Remote debugging / requesting logs from affected users when you can't reproduce locally

### Practical approach

1. Check Crashlytics/Play vitals device and OS-version breakdown for the crash - patterns often jump out immediately (e.g. 90% on one manufacturer, or all on one specific OS version).
2. Check that manufacturer's known quirks (many Android OEMs aggressively kill background apps/services, affecting things like background location or notification delivery).
3. If it's a screen-density/layout bug, test against the actual reported density/resolution rather than the nearest emulator default.
4. If it's OS-version-specific, check platform release notes for the exact version - permission model changes, background execution limits, and API deprecations are common culprits.
5. If local reproduction fails entirely, add targeted non-PII breadcrumbs/logging around the suspected area and wait for the next occurrence with richer data, rather than guessing indefinitely.

### Interview question

**Q: A crash only happens on a specific Android manufacturer's devices. How do you approach it?**

> "I start with the Crashlytics/Play vitals device breakdown to confirm the pattern is real and not just where our user base happens to be concentrated. Then I check that manufacturer's known OS behavior quirks - many Android OEMs have custom background-process killing or permission dialog behavior that differs from stock Android. If I can't reproduce locally on a similar device/emulator profile, I add targeted, non-PII breadcrumbs around the suspected code path so the next occurrence gives me the context I need, rather than shipping speculative fixes."

---

## Full interview question bank (with answer targets)

### Upgrades
1. **How do you approach a major RN version upgrade?** - dependency audit first, incremental hops, native diff, clean rebuild, full test matrix, staged rollout.
2. **What usually breaks during an RN upgrade?** - native-touching libraries, not RN's JS APIs themselves.
3. **How do you resolve a peer dependency conflict?** - `yarn why`, distinguish warning vs real native mismatch, `resolutions`/`overrides` with documented reasoning.

### Crashlytics & classification
4. **How do you tell JS vs native crashes apart?** - stack shape + which symbolication artifact you need.
5. **Why do you need mapping files/dSYMs?** - without them, stacks are unreadable memory addresses/minified names.
6. **ANR vs crash vs freeze?** - see Section 4 table.

### The crash reduction story
7. **Walk through your MyCreditInfo crash reduction (~20% -> 0.03%).**
8. **Walk through Wizer (~15% -> 0.09%).**
9. **Walk through Online School (~28% -> 0.15%), and how CI/CD/deadline pressure factored in.**
10. **How do you prioritize which crash to fix first?** - impact (affected users/sessions), not ease.
11. **How do you prevent a whole class of crash, not just one instance?** - defensive validation at boundaries, ErrorBoundaries, schema checks.

### Safety mechanisms
12. **How do feature flags help stability independent of releases?** - instant kill switch without a new build.
13. **How do you log safely in a fintech app?** - centralized redaction wrapper, allow-listed fields, opaque IDs.
14. **How do you debug a device-specific bug you can't reproduce locally?** - segmentation data, OEM quirks, targeted breadcrumbs.

---

## Hands-on drills (do these)

- [ ] Write out, from memory, the exact 8-step crash reduction playbook from Section 5.
- [ ] Practice the MyCreditInfo, Wizer, and Online School crash stories out loud, each under 90 seconds, each with the exact before/after numbers.
- [ ] Take a real (or hypothetical) Crashlytics stack trace and practice classifying it JS vs native in under 10 seconds.
- [ ] Explain ANR vs crash vs freeze to a non-technical PM in plain language.
- [ ] Design a feature-flag rollback plan for a hypothetical risky "new payment flow" launch.
- [ ] Write a one-paragraph PII logging policy for a fintech app as if onboarding a new engineer.
- [ ] Simulate: "This crash only happens on Samsung devices on Android 12" - talk through your full investigation out loud.

---

## Senior red flags / green flags

### Green flags interviewers love
- Describes crash reduction as a *repeatable process*, not a single fix.
- Prioritizes by user impact, not by which bug looks interesting.
- Distinguishes point fixes from "preventing a whole class of bug."
- Has real numbers memorized and can explain *how* they were achieved, not just that they happened.
- Treats PII/logging safety as a hard rule in fintech, unprompted.

### Red flags
- "I just kept fixing crashes until Crashlytics looked better" (no system, no prioritization).
- Confusing ANR with a generic crash.
- No answer for "how do you know a fix actually worked" (should mention re-measuring crash-free % after staged rollout).
- Logging raw API responses/objects without a redaction strategy.
- Treating an RN upgrade as "just bump the version number."

---

## Tie-backs to your experience (use in answers)

- Your three headline numbers - **MyCreditInfo ~20% -> 0.03%**, **Wizer ~15% -> 0.09%**, **Online School ~28% -> 0.15%** - are the single strongest proof points on your CV. Know them cold, and know the *mechanism* behind each, not just the numbers.
- Legacy modernization work (MyCreditInfo, Wizer, Online School) means you've lived through real dependency hell and RN upgrades on codebases you didn't originally design - a much stronger story than greenfield-only experience.
- Online School specifically combines crash reduction *under a hard deadline*, which is a great answer to "tell me about improving quality under time pressure."
- EasyPay being built from scratch gives you a contrasting story: what you did differently architecturally *because* of lessons learned fixing crashes elsewhere.

---

## Mastery checklist

- [ ] I can explain RN upgrade strategy end-to-end without notes.
- [ ] I can systematically resolve a dependency conflict, not just try random fixes.
- [ ] I can classify any crash stack as JS or native and state what I need to symbolicate it.
- [ ] I can precisely define ANR vs crash vs freeze with detection strategy for each.
- [ ] I can recite my 8-step crash reduction playbook from memory.
- [ ] I can tell all three crash-reduction stories fluently in under 90 seconds each, with numbers.
- [ ] I can explain feature flags as a stability tool distinct from staged rollouts.
- [ ] I have a clear, confident PII-safe logging policy memorized.
- [ ] I have a systematic approach to device-specific bugs I can't reproduce locally.
