# 01. React Native upgrade strategy

> Source: `interview-prep/react-native/12-upgrades-stability.md`

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
