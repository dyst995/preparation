# 16. Senior-Level Best Practices

> Source: `interview-prep/react-native/07-native-modules.md`

### Decision framework: build native, wrap a library, or patch upstream?

| Situation | Decision |
|---|---|
| A well-maintained JS/RN library already covers the capability | Use it - don't rebuild what's already solved and battle-tested |
| A vendor SDK (payment provider, hardware scanner, KYC) ships native-only integration docs | Write a thin native module wrapping the vendor SDK, keep the JS surface minimal and typed |
| An existing native dependency has a bug or missing feature blocking a release, and upstream has no timely fix | Patch it directly, document the patch thoroughly, pin the version until resolved |
| A capability is genuinely hardware-specific (barcode trigger, biometric sensor) | Native module using the event pattern for hardware-initiated data, promise pattern for one-shot commands |
| The team is about to write native code "because it feels more robust" with no concrete gap identified | Push back - every native module doubles the QA surface and adds New Architecture migration risk |

### Production checklist (native modules, ship-ready)

- [ ] Every native module has a documented reason it exists (which JS library was insufficient, and why) - reviewable in a PR description or ADR, not tribal memory
- [ ] All native module methods that touch UI dispatch to the main thread explicitly (iOS `DispatchQueue.main.async`, Android main-looper equivalent) - audited, not assumed
- [ ] Every native module is registered correctly and covered by a smoke test that fails loudly if `NativeModules.X` is `undefined` after a build
- [ ] Any patched native dependency has a comment documenting the bug, the fix, the upstream issue/PR link if one exists, and the version it's pinned to
- [ ] Native module New Architecture (Turbo Module) support status is tracked per dependency, reviewed before every RN major/minor upgrade
- [ ] Event-based native integrations (hardware scan triggers, push-related listeners) have de-duplication/debounce logic and are unregistered on unmount/backgrounding
- [ ] `Info.plist` usage-description strings and Android manifest permission entries are covered by a release checklist item - not discovered missing on TestFlight

### Anti-patterns seniors reject in code review

- **Writing a native module for a capability a maintained JS library already handles well**, purely out of preference or unfamiliarity with the ecosystem - doubles the maintenance and upgrade surface for no functional gain.
- **Patching a native dependency with no documentation of what was changed or why** - turns the patch into an invisible landmine for whoever upgrades that dependency next.
- **UI-presenting native code not dispatched to the main thread** - causes intermittent, hard-to-reproduce crashes that only show up under certain timing conditions.
- **Treating "Turbo Module" as a buzzword** in an interview or design doc without being able to explain what JSI/lazy-loading/Codegen actually buys you - signals surface-level familiarity.
- **Assuming permission handling is symmetric across Android and iOS** - the request timing, denial UX, and re-prompt rules are fundamentally different and need platform-specific handling, not one shared code path.
- **Using a Promise for a hardware-initiated, potentially-repeated event** (like a barcode scan trigger) instead of an event emitter - either misses subsequent scans or requires ugly workarounds to "re-await."

### Failure modes & how seniors debug them

| Symptom | Likely root cause | Diagnose with | Fix |
|---|---|---|---|
| `NativeModules.MyModule` is `undefined` in JS | Missing `ReactPackage` registration (Android) or missing bridging export (iOS), or a stale native build | `console.log(NativeModules)` + confirm clean native rebuild | Register the package/export correctly, do a clean native rebuild before assuming code is wrong |
| Native module works in debug, crashes in release only | ProGuard/R8 stripping a class needed via reflection, or a Hermes-specific incompatibility | Crashlytics symbolicated release-build stack trace | Add ProGuard keep rules, or fix the Hermes-incompatible code path |
| Camera/biometric/location feature crashes instantly on first real-device use | Missing `Info.plist` usage-description string (iOS) or missing runtime permission request (Android) | Reproduce on a clean install, check `Info.plist`/manifest | Add the missing usage string or permission request/manifest entry, clean rebuild |
| Barcode scanner fires the same scan multiple times per physical trigger pull | No debounce/dedup on the native `BroadcastReceiver`/event emission | Log every emitted scan event with a timestamp during a single trigger pull | Add a debounce window or dedupe by scan payload + short time threshold |
| App crashes only after an RN or OS upgrade, in a third-party native dependency | Library hasn't been updated for the new RN/New Architecture or OS SDK level | Check the library's changelog/compatibility matrix against your target RN/OS version | Upgrade the library, patch it directly, or find a maintained alternative before shipping the upgrade |

### Observability / metrics you'd watch

- **Native-crash rate specifically attributable to a given native module or dependency** (via Crashlytics stack-frame filtering), not just an aggregate crash number.
- **Permission grant/denial rates** for camera, location, biometrics, notifications - a spike in denials after a copy/UX change is a real product signal, not just a technical one.
- **Event volume/dedup-rate for hardware-triggered integrations** (e.g. barcode scans emitted vs. actually processed) - catches a debounce regression before it becomes a warehouse-floor complaint.
- **Native module New Architecture compatibility status per dependency**, tracked in a simple table, reviewed before each RN upgrade cycle - not rediscovered painfully mid-upgrade.
- **Biometric auth success/fallback rate** - a rising fallback-to-PIN rate can indicate a hardware/OS-version-specific regression in the biometric integration.

### Scalability & team practices

- **A native-module registry/README lives in the repo**: what each native module does, why it exists instead of a JS library, which platforms it covers, and its New Architecture status - a huge time-saver for onboarding and upgrade planning.
- **Patch documentation is a required PR checklist item** whenever a native dependency is directly modified - the reason, the upstream issue link if any, and what to re-check on the next version bump.
- **Native code changes get reviewed by whoever owns platform expertise (Kotlin/Swift) on the team**, not rubber-stamped by JS-focused reviewers who can't meaningfully evaluate main-thread/threading correctness.
- **Every RN upgrade has a mandatory "re-test every native integration point" step** (camera, biometrics, push, custom native modules) in the release checklist - a successful build is not evidence that native functionality still works.
- **New native module proposals get a brief written justification** (which library was evaluated and rejected, and why) before implementation starts - keeps the "build vs use a library" decision deliberate and reviewable, not a default reflex.

### Tradeoffs table

| Choice | Pro | Con |
|---|---|---|
| Use an existing maintained JS library | Less code to own, faster to ship, community-tested | May not cover a specific edge case or hardware SDK |
| Build a custom native module | Full control, can integrate hardware/vendor SDKs with no RN wrapper | Second codebase (per platform) to maintain and upgrade forever |
| Patch a native dependency in place | Fast, unblocks release now | Drifts from upstream; can silently break on the next version bump if undocumented |
| Fork a native dependency entirely | More control than a patch | Higher long-term maintenance burden; loses upstream security/bug fixes automatically |
| Legacy Native Module interop during migration | Keeps unmigrated libraries working | Extra complexity/perf cost carried until full New Architecture migration completes |

### Harder follow-up interview questions (with model answers)

**Q: You need to integrate a new payment SDK that only ships native (Android/iOS) integration guides, no RN wrapper. Walk me through your approach.**

> "First I'd check if a community RN wrapper already exists for that specific SDK, even an unofficial one, and evaluate its maintenance status and New Architecture support. If nothing suitable exists, I'd write a thin native module per platform that exposes only the specific methods/events the app actually needs - not a full pass-through of the entire vendor SDK surface - using Promises for one-shot calls like 'initialize payment session' and events for anything the SDK reports asynchronously, like a webhook-style status callback. I'd keep the JS-facing API intentionally minimal and well-typed via Codegen if on New Architecture, so the rest of the app doesn't need to know it's talking to a vendor SDK underneath."

**Q: How do you decide whether to patch a native dependency or fork it entirely?**

> "A patch is right when the change is small, targeted, and I expect to eventually drop it once upstream fixes the issue or we migrate away - like the security/compatibility patch on MyCreditInfo. A fork is more appropriate when the divergence from upstream is going to be substantial and long-lived, or when the upstream project is effectively abandoned and we need to take on ongoing ownership deliberately. I default to a patch first because it's cheaper to maintain and easier to drop later; forking is a bigger commitment I only make when the patch approach would require so many changes that it's really a fork in disguise."

**Q: A Turbo Module's native implementation does a genuinely expensive synchronous computation. Is that safe just because JSI supports synchronous calls?**

> "No - JSI making synchronous calls technically possible doesn't mean every synchronous call is safe. If that computation runs on the thread the call was dispatched from and that happens to be the UI/main thread, a slow synchronous call will block rendering and gesture handling exactly like a slow JS computation blocks the JS thread. I'd move genuinely expensive native work to a background thread and expose it via a Promise, reserving synchronous JSI calls for genuinely fast, simple reads."

**Q: How would you validate that a critical native module (say, biometric auth) still works correctly immediately after a major RN upgrade, beyond 'the app builds'?**

> "A successful build only proves the native project compiles against the new RN version - it says nothing about runtime behavior. I'd manually (or via an automated E2E pass, if available) exercise every native integration point end to end: trigger biometric auth on both platforms, confirm fallback to PIN works, confirm the success path stores/retrieves the token correctly. For hardware-dependent integrations like Zebra DataWedge, I'd test on the actual rugged device, not just an emulator, since emulators can't replicate hardware scanner behavior at all."

**Q: What's your process for evaluating whether a native dependency has real New Architecture support versus just claiming it in its README?**

> "I check the library's actual changelog and open issues for New Architecture-specific bug reports, not just a README badge, since 'supports New Architecture' claims sometimes lag real stability. I'd also do a quick spike - integrate it in a branch with New Architecture enabled and exercise its core functionality - before committing to the upgrade in the main branch, rather than trusting the claim and finding out the hard way during a release."

### What I'd say in a staff/senior interview

> "The native boundary is where I've seen the most expensive production bugs live, because it's where two very different runtime models - JS's garbage-collected, mostly-single-threaded world and native's manual-threading, platform-API-constrained world - actually touch. My rule is: default to an existing library, go native only when there's a concrete, nameable gap - a vendor SDK like Zebra's DataWedge with no RN wrapper, a missing capability like the iOS file preview library I built for Wizer, or a bug in a dependency I had to patch directly on MyCreditInfo under real security and time pressure. Every one of those decisions came with a documented reason and a plan for what happens on the next upgrade, because the worst version of native module ownership is an undocumented patch or a mystery module nobody remembers the purpose of, discovered only when it breaks during a New Architecture migration."

---
