# 12. Full interview question bank (with answer targets)

> Source: `interview-prep/react-native/07-native-modules.md`

### Fundamentals of native modules

1. **When do you write a native module instead of using a JS library?** ? hardware/vendor SDKs, missing capability, patching/extending existing native code.
2. **Legacy Native Modules vs Turbo Modules ? difference?** ? async bridge/eager load/manual typing vs JSI/lazy load/Codegen typing.
3. **What does Codegen actually generate and why does it matter?** ? typed native scaffolding from a spec; catches mismatches at build time.
4. **Is JSI the same thing as a Turbo Module?** ? No ? JSI is the lower-level interface; Turbo Modules (and Fabric) are built on it.

### Platform exposure patterns

5. **How do you expose a Kotlin method to JS (legacy)?** ? `ReactContextBaseJavaModule`, `@ReactMethod`, register via `ReactPackage`.
6. **How do you expose a Swift method to JS (legacy)?** ? `@objc` class + Objective-C bridging file with `RCT_EXTERN_MODULE`/`RCT_EXTERN_METHOD`.
7. **Native module method not appearing in JS ? debugging steps?** ? check package registration, name match, clean native rebuild, Codegen output.
8. **What thread do native module methods run on, and why does it matter?** ? varies by implementation; UI work must marshal to main thread; heavy work should move off the calling thread.

### Communication patterns

9. **Promise vs callback vs event ? when do you use each?** ? one-shot result (Promise/callback) vs native-initiated repeated notifications (event).
10. **Example of an event-based native integration you built?** ? Zebra DataWedge scan broadcast ? native `BroadcastReceiver` ? JS event emitter.

### Permissions & platform quirks

11. **Android vs iOS permission model differences?** ? manifest + runtime request vs `Info.plist` string + automatic prompt on first use.
12. **Camera crashes instantly on iOS release build ? likely cause?** ? missing/incorrect `Info.plist` usage description string.

### Real integrations (your CV)

13. **Explain your Zebra DataWedge barcode integration.** ? intent-based broadcast receiver, profile config, debounced events.
14. **Explain your custom iOS file preview library (Wizer).** ? native module wrapping platform preview APIs, promise-based open call, main-thread presentation.
15. **Explain patching a native Android library (MyCreditInfo).** ? security/compatibility gap, direct native patch, documented and version-pinned.
16. **How did native Android work fit into building EasyPay from scratch?** ? architectural decisions requiring native integration (biometrics, possibly payment/security-related native work) baked in from day one, not retrofitted.

### Upgrades & maintenance

17. **What tends to break on an RN upgrade?** ? native module compatibility, New Architecture support lag, OS-level SDK/deprecation changes.
18. **How do you validate native modules after an RN upgrade?** ? explicit manual/automated re-test of every native integration point, not just a successful build.

---
