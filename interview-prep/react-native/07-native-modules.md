# 07 ? Native Modules, Turbo Modules & Integrations

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

## 1. When do you actually need native code?

### Topics to learn
- [ ] Capabilities not exposed by RN core or any maintained JS/RN library
- [ ] Performance-critical work unsuitable for JS (heavy computation, real-time hardware I/O)
- [ ] Deep OS integration (background services, widgets, specific hardware SDKs like barcode scanners)
- [ ] Vendor SDKs that only ship native (Android/iOS) integration guides (payment SDKs, hardware SDKs)
- [ ] The cost side: native code means two codebases to maintain, more QA surface, and New Architecture compatibility work

### Decision framework

| Situation | Native needed? | Why |
|---|---|---|
| Need a REST call, some local storage, standard UI | No | RN core + JS ecosystem covers it |
| Need biometric prompt (Face ID/Touch ID/Android biometric) | Usually a well-maintained library wraps native for you | Still "native," but you don't necessarily write it yourself unless you need custom behavior |
| Need a hardware vendor SDK (e.g. Zebra DataWedge barcode scanner) | Yes | Vendor ships native Android SDK/broadcast intents only; no first-class RN wrapper exists for your exact use case |
| Need a capability third-party RN libraries don't support well (custom file preview rendering) | Yes | You build a small native module wrapping platform APIs (`QuickLook`/`PDFKit`-equivalent on iOS) |
| Need to patch a bug or add a missing feature in a native Android dependency | Yes (patch and fork/override) | The library's JS surface doesn't expose what you need, or has a native bug blocking your use case |
| Need background location/push token handling tied to platform lifecycle events | Often yes | These are OS-level lifecycle concerns, not portable JS concepts |

### Interview question

**Q: How do you decide whether to write a native module vs finding a JS library?**

**Strong answer:**
> "I start by checking if there's a well-maintained community library that already wraps the native capability ? most common needs (camera, biometrics, push notifications, file system) have solid options. I go native myself when: the capability is hardware/vendor-specific with no RN wrapper ? like Zebra's DataWedge barcode scanning on Clean House, which only ships Android SDK/intent-based integration; when I need to extend or fix behavior a third-party library doesn't support, like the file preview library I built for Wizer beyond what existing packages offered; or when I need to patch a bug directly in a native dependency, like I did with a native Android library on MyCreditInfo. I weigh that against the maintenance cost ? native code needs updating for OS/New Architecture changes and doubles the platforms I need to test."

---

## 2. Legacy Native Modules vs Turbo Modules vs raw JSI

### Topics to learn
- [ ] Legacy Native Modules: bridge-based, async-only in practice, all modules loaded eagerly at startup
- [ ] Turbo Modules: JSI-based, lazily loaded, typed via Codegen
- [ ] Raw JSI: the lowest-level interface Turbo Modules (and Fabric) are built on
- [ ] Backward compatibility layer (interop) during migration periods
- [ ] Why "legacy modules still exist" is a normal, expected interview answer during a New Architecture transition

### Comparison table

| Aspect | Legacy Native Modules | Turbo Modules | Raw JSI |
|---|---|---|---|
| Transport | Async bridge (serialized messages) | JSI (direct references, no serialization round-trip for the call itself) | JSI directly |
| Loading | All native modules instantiated eagerly at app startup | Lazy ? only instantiated when first accessed from JS | N/A (you control it) |
| Typing | Manual, easy to get JS/native signatures out of sync | Generated from a typed spec via Codegen ? compile-time-checked contract | Whatever you build |
| Sync calls | Not really supported cleanly | Possible where appropriate | Fully possible (with care) |
| Who writes it | You implement a `ReactContextBaseJavaModule`/`RCTBridgeModule` conforming class | You implement against a Codegen-generated interface/spec | You write raw C++/JSI bindings (rare for app-level work; more common for library authors) |
| Typical use today | Legacy codebases, libraries not yet migrated | New modules on New Architecture apps | Library/SDK-level performance-critical work |

### Interview questions

**Q: What's the practical difference between a legacy Native Module and a Turbo Module?**

**Strong answer:**
> "Legacy Native Modules go through the async bridge ? every call is serialized, sent across, and deserialized, and all modules are instantiated eagerly at app startup whether you use them or not. Turbo Modules are built on JSI, so calls avoid that serialization overhead, and modules are lazily instantiated only when first accessed ? better startup cost when you have many modules. Turbo Modules are also defined through a typed Codegen spec, so the JS and native signatures can't silently drift out of sync the way they can with legacy modules where you hand-write both sides independently."

**Q: Is JSI the same as a Turbo Module?**

**Strong answer:**
> "No ? JSI is the underlying interface that lets JS and native hold direct references to each other's objects/functions. Turbo Modules are a specific system built on top of JSI for exposing native modules to JS, with lazy loading and Codegen-generated typing. JSI itself is lower-level; Fabric (the renderer) is also built on it. Think of JSI as the foundation, Turbo Modules and Fabric as the two major systems built on that foundation."

---

## 3. Codegen ? typed contracts between JS and native

### Topics to learn
- [ ] Defining a spec (TypeScript/Flow-style types describing the native interface)
- [ ] Codegen generating native interface stubs (Java/Kotlin interface, Objective-C++/Swift-compatible protocol) from that spec
- [ ] Compile-time safety: mismatched types fail to build rather than crash/misbehave at runtime
- [ ] Reduced boilerplate vs hand-writing bridging code on both platforms
- [ ] Codegen as part of the build pipeline (runs during build, not something you hand-invoke constantly)

### Why this matters for interviews

Before Codegen, a common bug class was: JS calls a native method expecting a `string`, but the native implementation was changed to expect a `number`, and nothing catches it until a runtime crash or silent misbehavior in production. Codegen makes the spec the single source of truth, generating matching native scaffolding, so mismatches surface at build time.

### Interview question

**Q: Why does Codegen matter beyond "less boilerplate"?**

**Strong answer:**
> "The bigger win is correctness. Without Codegen, you hand-write the JS-side declaration and the native-side implementation separately, and nothing stops them from drifting apart ? a changed parameter type on one side becomes a runtime bug, sometimes only in production edge cases. Codegen generates the native interface from a single typed spec, so the contract is enforced at build time. Given how many crash-rate issues I've had to chase down to their root cause ? like on MyCreditInfo ? I care a lot about anything that turns a runtime crash into a compile-time error."

---

## 4. Android native module exposure pattern (Kotlin/Java) ? interview depth

### Topics to learn
- [ ] `ReactContextBaseJavaModule` (legacy) ? `getName()`, `@ReactMethod` annotated methods
- [ ] `ReactPackage` registration so RN discovers your module
- [ ] Turbo Module equivalent: implementing the Codegen-generated spec interface
- [ ] Threading: which thread native methods run on by default, and moving heavy work off it
- [ ] Emitting events to JS via `DeviceEventManagerModule.RCTDeviceEventEmitter` (legacy) or the Turbo Module event equivalent
- [ ] Returning results via callback vs Promise
- [ ] Working knowledge level expected: Kotlin (per your CV) ? comfortable reading/writing module code, not necessarily deep Android platform internals

### Conceptual shape (legacy-style, for discussion ? you don't need to recite exact code)

```kotlin
class BarcodeScannerModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "BarcodeScannerModule"

    @ReactMethod
    fun startScan(promise: Promise) {
        try {
            // interact with Zebra DataWedge intents / SDK here
            promise.resolve(scanResult)
        } catch (e: Exception) {
            promise.reject("SCAN_ERROR", e)
        }
    }

    fun emitScanEvent(payload: WritableMap) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("onBarcodeScanned", payload)
    }
}
```

### Key talking points

- Native methods can be async (`Promise`/`Callback`) or fire events for things that happen outside a direct JS call (like a hardware scan trigger).
- Heavy work should not block the thread RN dispatches the call on ? offload to a background thread/coroutine and resolve the promise when done.
- Registering the module requires a `ReactPackage` that RN's package list picks up ? a very common "why isn't my native module showing up in JS" debugging question traces back to a missed registration.

### Interview question

**Q: You added a Kotlin native module but `NativeModules.MyModule` is `undefined` in JS. What do you check?**

**Strong answer:**
> "First, that the module's `ReactPackage` is actually registered in the app's package list ? the most common cause. Second, that `getName()` matches exactly what I'm calling from JS. Third, for Turbo Modules, that Codegen actually ran and picked up the spec, and that the native build actually rebuilt (a stale native build after adding a module is a very common false alarm ? I'd do a clean native rebuild before assuming code is wrong). Fourth, on New Architecture, whether the module needs to be registered differently than legacy."

---

## 5. iOS native module exposure pattern (Swift/Objective-C) ? interview depth

### Topics to learn
- [ ] Objective-C bridging header / `RCT_EXPORT_MODULE()` and `RCT_EXPORT_METHOD()` (legacy pattern)
- [ ] Swift native modules requiring an Objective-C bridge file to expose them to RN (legacy architecture nuance)
- [ ] Turbo Module equivalent: conforming to the Codegen-generated protocol/spec
- [ ] Threading: main thread vs background ? UI-touching code (e.g. presenting a `QuickLook` preview controller) must run on main thread
- [ ] Emitting events via `RCTEventEmitter` subclass (legacy) or Turbo Module event equivalent
- [ ] Working knowledge level expected: Swift/Objective-C (per your CV) ? comfortable implementing and integrating, not necessarily deep iOS internals expert

### Conceptual shape (legacy-style, for discussion)

```swift
@objc(FilePreviewModule)
class FilePreviewModule: NSObject {

  @objc
  func previewFile(_ path: String,
                    resolver resolve: @escaping RCTPromiseResolveBlock,
                    rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      // present a QuickLook-based preview controller here
      resolve(true)
    }
  }
}
```

```objc
// Bridging file so RN can see the Swift class
@interface RCT_EXTERN_MODULE(FilePreviewModule, NSObject)
RCT_EXTERN_METHOD(previewFile:(NSString *)path
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
@end
```

### Key talking points

- Any UI presentation (file preview controllers, camera view controllers, custom alerts) must be dispatched to the main thread ? a classic iOS-specific bug for RN developers coming from a JS-only background.
- Swift modules historically need an Objective-C shim to be visible to the legacy RN bridge; Turbo Modules/Codegen streamline this with generated protocols.
- Promises map naturally to Swift's resolve/reject blocks; events map to `RCTEventEmitter` subclasses with `supportedEvents()`.

### Interview question

**Q: Tell me about the native iOS file preview library you built for Wizer. Why not use an existing library?**

**Strong answer (adapt to your real specifics):**
> "Wizer needed to preview various document types (PDFs, images, possibly other formats) attached to insurance records, and the existing third-party RN libraries either didn't cover all the formats we needed or had UX/performance limitations. I built a native iOS module wrapping platform preview APIs (QuickLook-style) directly, exposed through a promise-based method to open a file by path/URL, with the actual view controller presentation dispatched to the main thread. This gave us full control over supported formats and presentation behavior instead of being constrained by a general-purpose third-party package, and it was one of the pieces of ownership work that came with taking over and modernizing that app's architecture."

---

## 6. Promises vs Callbacks vs Events ? choosing the right pattern

### Topics to learn
- [ ] Promises: one-shot async result, resolve/reject, natural fit for `async/await` on the JS side
- [ ] Callbacks: legacy pattern, still seen, less ergonomic than promises for one-shot results
- [ ] Events: for native-initiated, potentially repeated/unsolicited notifications (hardware triggers, push notification arrival, scan events)

### Decision table

| Pattern | Use when | Example |
|---|---|---|
| Promise | JS calls native, expects exactly one result (success or failure) | "Read this file and give me its contents", "Authenticate with biometrics" |
| Callback | Legacy code, or APIs predating promise convention | Older third-party native modules |
| Event (emitter) | Native side originates the notification, possibly multiple times, not tied to a specific JS call | Barcode scan trigger from a hardware button, push notification received in foreground, DataWedge broadcast intent result |

### Interview question

**Q: You need to integrate a hardware barcode scanner (like Zebra's DataWedge). Would you use a Promise or an event?**

**Strong answer:**
> "An event. The scan is triggered by the user pressing a hardware trigger or the scanner firing independently of any specific JS call ? it's not something JS is 'awaiting' a single response to. On Android, DataWedge broadcasts scan results as intents; the native module listens for that broadcast and emits a JS event (`onBarcodeScanned` or similar) that the app subscribes to, potentially receiving many events over the component's lifetime. I'd only use a Promise for something like an explicit 'start a scan session' one-shot setup call, not for the actual scan results themselves."

---

## 7. Permissions ? Android vs iOS differences

### Topics to learn
- [ ] Android runtime permissions model (declare in manifest + request at runtime for dangerous permissions)
- [ ] iOS `Info.plist` usage-description strings + system prompt on first API use
- [ ] Permission states: granted, denied, "don't ask again" (Android) / permanently denied requiring Settings deep link (iOS)
- [ ] Camera, location, biometrics, notifications, storage ? each has its own quirks per platform
- [ ] Handling permission denial gracefully in UX (not just crashing or silently failing)
- [ ] Libraries like `react-native-permissions` abstracting some of this, but understanding the underlying platform model is still expected

### Comparison table

| Aspect | Android | iOS |
|---|---|---|
| Declaration | `AndroidManifest.xml` permission entries | `Info.plist` usage description strings (e.g. `NSCameraUsageDescription`) |
| Request timing | Requested at runtime for "dangerous" permission groups (camera, location, etc.) | System prompt fires automatically on first actual API use if description string is present |
| Denial UX | Can ask again, or user selects "don't ask again" | If denied, app can't re-prompt ? must direct user to Settings |
| Granular control | Some permissions are grouped | Some permissions have "while using app" vs "always" nuances (location) |
| Missing config symptom | Crash or silent failure if manifest entry missing | Instant crash if `Info.plist` usage string missing when API is touched |

### Interview question

**Q: A camera feature works in dev but crashes instantly on iOS TestFlight. What's your first guess?**

**Strong answer:**
> "Missing or incorrect `Info.plist` usage description string, like `NSCameraUsageDescription`. iOS crashes immediately if you touch a permission-gated API without the corresponding usage string present ? this is one of the most common 'works in dev, crashes in a real build' issues, especially if the dev build was run with a cached/different plist or the entry was added after the last clean build. I'd check the `Info.plist`, do a clean rebuild, and verify on a real device before looking anywhere else."

---

## 8. Biometric authentication

### Topics to learn
- [ ] Face ID / Touch ID on iOS, BiometricPrompt on Android
- [ ] Library-level abstraction (e.g. common cross-platform biometrics packages) vs custom native work
- [ ] Fallback flows: biometrics unavailable/failed ? PIN/password fallback
- [ ] Security framing: biometrics unlock locally stored credentials/tokens, they don't replace backend auth
- [ ] Secure storage pairing (Keychain on iOS, Keystore-backed storage on Android) alongside biometric gating

### Interview question

**Q: Walk me through how you implemented biometric authentication in EasyPay/MyCreditInfo.**

**Strong answer (tailor with real specifics):**
> "The pattern is: after a normal successful login, we store a securely-encrypted token or flag (backed by Keychain on iOS / Keystore-backed secure storage on Android) rather than the raw password. On subsequent app opens, we prompt Face ID/Touch ID or Android's BiometricPrompt; success unlocks the locally stored credential/token to resume the session, and failure or unavailability falls back to standard PIN/password login. It's important to frame biometrics correctly in an interview ? it's a *local* unlock mechanism gating access to a securely stored token, not a replacement for backend authentication or a way to biometrically 'log in' to the server directly. For a fintech app like EasyPay, we also had to think about what happens on biometric hardware changes (e.g. re-enrolled fingerprint) invalidating stored credentials, which typically forces a fresh login rather than silently failing."

---

## 9. Camera & barcode scanning integrations

### Topics to learn
- [ ] Standard camera capture (photo/video) via community libraries vs custom native camera views
- [ ] Barcode/QR scanning via camera-based libraries vs dedicated hardware scanners
- [ ] Zebra DataWedge specifically: intent-based broadcast integration on Android rugged devices (Clean House warehouse context)
- [ ] Performance consideration: scan event frequency and debouncing to avoid flooding JS with duplicate scans
- [ ] Permission + lifecycle handling (camera must release resources properly on screen unmount/backgrounding)

### Zebra DataWedge deep dive (your Clean House project)

DataWedge is Zebra's data capture service that runs on their rugged Android devices (used heavily in warehouse/logistics). Instead of the app driving the camera/scanner hardware directly, DataWedge is configured (via profiles) to capture a scan (hardware trigger or camera-based) and broadcast the result as an Android intent that your app's native module registers a `BroadcastReceiver` for.

**Why this needed native Android work, not a generic RN barcode library:**
- Generic camera-based barcode-scanning RN libraries don't talk to a dedicated hardware scanner engine at all ? they'd have you re-implement scanning via the phone/tablet's camera, ignoring the device's purpose-built, faster, more reliable hardware scanner.
- DataWedge integration is Android-specific, intent-based, and requires configuring a DataWedge profile (package name, intent action/category/key) matched by a native `BroadcastReceiver` that then forwards the decoded barcode data to JS via an event emitter.

### Interview question

**Q: Tell me about the barcode scanning integration you built for Clean House.**

**Strong answer:**
> "Clean House ran on rugged Android devices used by warehouse staff with dedicated hardware barcode scanners, so instead of a generic camera-based JS barcode library, I integrated with Zebra's DataWedge service. That meant configuring a DataWedge profile to associate scan intents with our app package, and writing a native Android module with a `BroadcastReceiver` that listens for those scan intents, extracts the decoded barcode payload, and emits it to JS as an event the delivery/warehouse workflow screens subscribe to. I also had to debounce/de-duplicate rapid repeated scans so a single physical trigger pull didn't fire the same barcode-handling logic multiple times, and make sure the receiver was properly registered/unregistered with screen lifecycle to avoid leaks or stale listeners firing on the wrong screen."

---

## 10. Patching native Android libraries

### Topics to learn
- [ ] Why you sometimes can't just "wait for upstream" (blocking bug, abandoned library, security fix needed now)
- [ ] Patch strategies: `patch-package` (JS-level file patches) vs directly editing vendored/forked native Android source
- [ ] Forking a library vs patching in place ? tradeoffs (forks drift from upstream; patches can break on version bumps)
- [ ] Documenting the patch clearly (why, what upstream issue/PR it relates to, what to re-check on library upgrade)
- [ ] Security/compatibility framing ? this is exactly what your MyCreditInfo bullet describes ("patched native Android libraries and bridged native code to improve security and platform compatibility")

### Interview question

**Q: Tell me about patching a native Android library on MyCreditInfo. Why not just wait for an upstream fix or switch libraries?**

**Strong answer (tailor with real specifics):**
> "MyCreditInfo was a legacy codebase with an outdated dependency that had a security or platform-compatibility gap ? newer Android OS versions had tightened behavior the library hadn't been updated for, and switching libraries entirely would have meant a larger, riskier rewrite under time pressure while we were also chasing a 20% crash rate down. So I patched the native Android source directly ? understanding the library's Kotlin/Java implementation well enough to fix the specific incompatibility or security gap ? and bridged/adjusted native code where the JS-level API needed to keep working unchanged for the rest of the app. I documented exactly what was changed and why, so it could be re-evaluated cleanly if we ever upgraded or replaced the dependency later, rather than becoming an invisible landmine for the next engineer."

**Follow-up: How do you keep a patch from silently breaking on the next dependency upgrade?**
> "Pin the dependency version until the patch is either upstreamed or the underlying issue is otherwise resolved, document the patch with a clear comment referencing the reason, and treat any future version bump of that dependency as requiring a deliberate re-check of whether the patch is still needed or needs to be reapplied/rewritten."

---

## 11. Upgrade compatibility for native modules

### Topics to learn
- [ ] React Native version upgrades can break native module APIs (deprecated bridge methods, New Architecture requirements)
- [ ] Third-party libraries lagging behind on New Architecture support
- [ ] Native OS-level changes (Android target SDK bumps, iOS API deprecations) independent of RN itself
- [ ] Strategy: check library New Architecture/RN-version support matrices before upgrading; test native modules explicitly after any RN upgrade, not just JS behavior
- [ ] Interop layer allowing legacy modules to keep working temporarily during New Architecture migration

### Interview question

**Q: What breaks most often when you upgrade React Native in a real production app?**

**Strong answer:**
> "In my experience it's rarely the pure-JS code ? it's the native layer: third-party libraries with native modules that haven't been updated for the new RN version or New Architecture, Android target SDK requirement bumps forcing permission or manifest changes, and iOS API deprecations tied to a new Xcode/SDK requirement. My upgrade process is to check each native-module-dependent library's compatibility with the target RN version first, upgrade in a branch, and specifically re-test every native integration point ? camera, biometrics, push notifications, any custom native modules ? rather than assuming 'the app builds' means everything native still works correctly."

---

## Full interview question bank (with answer targets)

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

## Hands-on drills (do these)

- [ ] Sketch (on paper or in a scratch file) a minimal Kotlin native module with one `@ReactMethod` promise-based method and its `ReactPackage` registration.
- [ ] Sketch the equivalent Swift + Objective-C bridging file for the same capability.
- [ ] Write out, from memory, the difference between how you'd implement a "read battery level once" feature (Promise) vs "notify me every time the charger is plugged/unplugged" feature (Event).
- [ ] Explain out loud, in under 3 minutes, why Zebra DataWedge needed a native Android integration instead of a generic barcode-scanning JS library.
- [ ] Write a one-paragraph explanation (as if documenting it for a teammate) of a native Android library patch you made ? the bug, the fix, the risk if the dependency is upgraded later.
- [ ] List every place `Info.plist` usage strings would be required for an app with camera, location, and biometrics features.
- [ ] Draw the legacy bridge call path and the Turbo Module/JSI call path side by side for a single native method call.

---

## Senior red flags / green flags

### Green flags interviewers love
- Clearly separates "I'd use an existing library" from "this genuinely needs custom native code," with real criteria
- Can explain Promise vs Event choice based on *who initiates* the communication, not just habit
- Knows permission model differences between platforms cold
- Has real, specific stories of native work (not vague "I touched some Kotlin once")
- Talks about upgrade risk and documentation discipline around patches, not just "I fixed it"

### Red flags
- Treating "Turbo Module" as a buzzword without explaining JSI/lazy-loading/Codegen underneath it
- Assuming permissions work identically on Android and iOS
- No mention of thread-safety/main-thread requirements for native UI work
- Patching a native dependency with no plan for what happens on the next upgrade
- Can't explain why a hardware-specific integration (like a dedicated barcode scanner) isn't just "a camera library problem"

---

## Tie-backs to your experience (use in answers)

- **EasyPay**: Native Android integrations were part of building a fintech app from the ground up ? biometric authentication, QR payments, and security-sensitive flows likely required native-level work beyond pure JS, reinforcing that you made architecture-level native/JS boundary decisions early, not as an afterthought.
- **Clean House**: Zebra DataWedge barcode scanning integration is a strong, specific event-driven native Android story ? intent broadcasts, `BroadcastReceiver`, debounced JS events ? for a warehouse/logistics hardware context.
- **Wizer**: Custom native iOS file preview library shows you can build native functionality when third-party options are insufficient, plus main-thread UI presentation discipline on iOS.
- **MyCreditInfo**: Patching native Android libraries and bridging native code for security/compatibility is a mature, senior-level story about working inside someone else's legacy native code safely and documenting risk.
- **Across all four**: Turbo Modules and native Android/iOS integrations on your CV are backed by real production stories tied to your headline crash-rate reductions ? native-boundary bugs were very likely part of what you fixed to get from 15-28% crash rates down to under 0.2%.

---

## Senior-Level Best Practices

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

## Mastery checklist

- [ ] I can explain legacy Native Modules vs Turbo Modules vs JSI without conflating them
- [ ] I can describe Codegen's role and why it prevents a specific class of production bug
- [ ] I can sketch a native module exposure pattern on both Android (Kotlin) and iOS (Swift/Obj-C bridge)
- [ ] I can choose correctly between Promise, callback, and event patterns and justify why
- [ ] I know the Android vs iOS permission model differences cold
- [ ] I can tell the Zebra DataWedge, Wizer file preview, and MyCreditInfo native-patch stories fluently and specifically
- [ ] I have a clear answer for how native modules complicate RN upgrades and how I mitigate that risk
