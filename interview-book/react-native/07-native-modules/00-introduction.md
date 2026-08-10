# 07 ? Native Modules, Turbo Modules & Integrations — Introduction

> Source: `interview-prep/react-native/07-native-modules.md`

> Goal: Speak with authority about crossing the JS?native boundary ? legacy Native Modules, Turbo Modules, JSI, Codegen, Android (Kotlin/Java) and iOS (Swift/Obj-C) exposure patterns ? and back every claim with a real integration from your CV (Zebra DataWedge, native iOS file preview, patched native Android libraries, biometrics, EasyPay's native Android work).

Mark progress with `[x]` as you master each topic.

> Deep architecture chapters (study with this file):
> - [15 - Bridge](./15-bridge.md)
> - [16 - Native Modules (legacy)](./16-native-modules.md)
> - [17 - Turbo Modules](./17-turbo-modules.md)

---

## Learning objectives

By the end of this section you should be able to:

1. Explain precisely when a problem requires native code vs pure JS/RN APIs.
2. Contrast legacy Native Modules, Turbo Modules, and raw JSI ? architecture, performance, and typing differences.
3. Explain Codegen's role and what a typed spec buys you.
4. Describe how to expose a native API on Android (Kotlin/Java) and iOS (Swift/Objective-C) at a level that survives senior follow-ups, even without live-coding it.
5. Explain the three native?JS communication patterns: promises, callbacks, events ? and when to use each.
6. Discuss platform differences in permissions handling (Android runtime permissions vs iOS `Info.plist` + prompts).
7. Talk through biometric authentication integration end-to-end.
8. Explain camera/barcode scanning integration, including hardware-specific SDKs like Zebra DataWedge.
9. Explain patching a third-party native Android library and why/when that's necessary.
10. Explain building a custom native iOS library (file preview) when third-party options fall short.
11. Reason about React Native upgrade compatibility for native modules (breaking native API changes, New Architecture support lag).
12. Tie every concept to a concrete CV story: EasyPay (native Android), Clean House (Zebra DataWedge), Wizer (iOS file preview library), MyCreditInfo (patched native Android libraries).

---
