# 16 - Native Modules (Legacy Bridge Modules)

> Goal: Implement and explain classic React Native Native Modules on Android and iOS - registration, exported methods, promises/callbacks/events, threading, and packaging - at senior interview depth.

Your CV explicitly includes **Native Android Integrations** and **Native iOS Integrations**. This chapter is the legacy-module deep dive. For transport theory see [15-bridge.md](./15-bridge.md). For modern Turbo Modules see [17-turbo-modules.md](./17-turbo-modules.md). For product integrations (DataWedge, biometrics, patches) see [07-native-modules.md](./07-native-modules.md). For Gradle / Xcode / lifecycle / permissions (the host those modules run in) see [native-developement](../native-developement/INDEX.md).

Mark progress with `[x]`.

---

## Learning objectives

1. Explain when to write a Native Module vs use a community library.
2. Describe Android and iOS legacy module anatomy.
3. Export methods with promises, callbacks, and events correctly.
4. Reason about threading (main/UI vs background) when calling native APIs.
5. Handle constants, enums, and argument types safely across the Bridge.
6. Package and register modules so JS can import them.
7. Debug native crashes and "method not found" / null argument issues.
8. Discuss maintenance cost and New Architecture migration pressure.

---

## 1. What a Native Module is

A **Native Module** exposes native platform capabilities to JavaScript through RN's native-module system.

In the **legacy architecture**, that exposure goes through the **Bridge**:
- JS calls `NativeModules.MyModule.doSomething(...)`
- Bridge serializes the call
- Native implementation runs
- Result returns via promise/callback/event

### Topics to learn
- [ ] `NativeModules` JS API
- [ ] Module name must match what native registers
- [ ] Method argument type limitations over the Bridge
- [ ] One module can expose many methods
- [ ] Modules are traditionally eagerly initialized (startup cost)

---

## 2. When you write one (decision framework)

| Need | Write Native Module? | Notes |
|---|---|---|
| REST, async storage, basic UI | No | JS/RN enough |
| Biometrics / camera / secure storage | Usually wrap existing lib | Write custom only for gaps |
| Vendor hardware SDK (Zebra DataWedge) | Yes | Often no perfect RN wrapper |
| Custom iOS QuickLook-style preview | Yes | Wizer-style gap fill |
| Patch buggy native dependency behavior | Yes / patch | MyCreditInfo-style |
| Hot path needing sync native read | Legacy modules weak here | Prefer Turbo/JSI |

### Interview answer

> "I only write native modules when JS cannot access the capability cleanly - vendor SDKs, missing library features, or native bugfixes. On Clean House that was DataWedge. On Wizer I built a native iOS file preview capability beyond third-party options. On MyCreditInfo I patched native Android libraries for security/compatibility. Otherwise I prefer maintained libraries and keep native surface area small."

---

## 3. Android legacy Native Module anatomy

### Topics to learn
- [ ] `ReactPackage` registers modules
- [ ] Module class extends `ReactContextBaseJavaModule` (classic)
- [ ] `getName()` must match JS module name
- [ ] `@ReactMethod` exports functions
- [ ] `Promise` parameter for async results
- [ ] `Callback` parameters (less preferred than Promise today)
- [ ] `DeviceEventManagerModule` / RCTDeviceEventEmitter for events
- [ ] `getConstants()` for static constants
- [ ] Kotlin vs Java (both appear in real codebases)
- [ ] UI thread requirements for UI APIs (`runOnUiQueueThread`)

### Conceptual shape (interview-level)

```text
MyAppPackage
  └─ creates MyModule(reactContext)

MyModule
  ├─ getName() => "MyModule"
  ├─ @ReactMethod doWork(options, promise)
  ├─ @ReactMethod addListener / removeListeners (if events; RN expectations)
  └─ helper methods calling Android APIs
```

### Android pitfalls seniors watch
- Calling UI APIs off the main thread
- Holding Activity references -> leaks
- Forgetting null-safe Activity (`getCurrentActivity()` can be null)
- Blocking the native module thread with heavy disk/network work
- Mismatch between `getName()` and JS import name
- Crashing on unexpected JS argument types (Bridge delivers limited types)

---

## 4. iOS legacy Native Module anatomy

### Topics to learn
- [ ] `RCT_EXPORT_MODULE()` / module name
- [ ] `RCT_EXPORT_METHOD` / `RCT_REMAP_METHOD`
- [ ] Promises via RCTPromiseResolveBlock / RejectBlock
- [ ] Events via `RCTEventEmitter` subclass
- [ ] Constants via `constantsToExport` + `requiresMainQueueSetup`
- [ ] Swift vs Objective-C bridging header realities
- [ ] Main queue vs background queue method scheduling

### Conceptual shape

```text
MyModule : NSObject <RCTBridgeModule>
  ├─ RCT_EXPORT_MODULE(MyModule)
  ├─ RCT_EXPORT_METHOD(doWork:(NSDictionary *)options
  │     resolver:(RCTPromiseResolveBlock)resolve
  │     rejecter:(RCTPromiseRejectBlock)reject)
  └─ native UIKit/QuickLook/etc calls
```

Or event emitter:

```text
MyEmitter : RCTEventEmitter
  ├─ supportedEvents
  └─ sendEventWithName...
```

### iOS pitfalls seniors watch
- Forgetting to implement `supportedEvents` correctly
- Wrong queue: UIKit must be main thread
- Swift optionals / NSNull mismatches from JS
- Missing privacy usage strings in Info.plist for camera/photos/biometrics
- Rejecting promises without stable error codes

---

## 5. Communication patterns: Promise vs Callback vs Event

### Topics to learn
- [ ] Promise: one-shot async request/response (preferred for commands)
- [ ] Callback: older style, error-first or multi-callback pitfalls
- [ ] Event: stream of notifications (hardware scans, progress, broadcast intents)
- [ ] Don't use events where a promise belongs (and vice versa)

### Decision table

| Situation | Prefer |
|---|---|
| "Do this and tell me success/failure once" | Promise |
| Continuous barcode scans from DataWedge | Event emitter |
| Progress of a long native task | Events + final Promise (or events only) |
| Legacy API already callback-based | Wrap into Promise at JS edge |

### DataWedge example framing (Clean House)

> "DataWedge delivers scan data through Android intents/broadcasts. That is naturally an event stream. I wrap the native receiver in a module that emits scan events to JS, and keep configuration/commands as promise-based methods."

---

## 6. Types that cross the Bridge safely

### Typically supported-ish values
- booleans, numbers, strings
- arrays / maps of those
- null / undefined mapped carefully (NSNull on iOS)

### Avoid / be careful
- functions (not as free-form JS functions over Bridge)
- class instances
- huge binary blobs (use file URIs)
- platform objects without conversion

### Senior practice
Define a tiny typed JS facade over `NativeModules.X` so the rest of the app never touches raw `NativeModules`. Validate inputs before crossing.

---

## 7. Threading rules (say this in interviews)

### Android
- Bridge calls arrive on RN's native module threading model; UI work needs main/UI thread.
- Heavy I/O should be offloaded; resolve promise when done.
- Never assume `getCurrentActivity()` is non-null.

### iOS
- Explicitly choose method queue; UIKit on main.
- Long work: background queue, then resolve on appropriate thread.

### Interview question

**Q: Your native method updates UI and also writes a file. How do you structure it?**

> "Split responsibilities. Dispatch UI updates on the main thread. Do file I/O off the main thread. Resolve the promise after both succeed or with a clear partial-failure policy. I never block the UI thread on disk."

---

## 8. JS-side usage pattern (clean architecture)

```text
features/scanning/native/dataWedge.ts
  - typed wrappers
  - subscribe/unsubscribe helpers
  - maps native events -> domain models

features/scanning/hooks/useBarcodeScanner.ts
  - React lifecycle
  - permission gates
  - connects to UI
```

Do not scatter `NativeModules.Whatever` through screens.

---

## 9. Packaging, linking, and autolinking

### Topics to learn
- [ ] App-local modules vs separate native package
- [ ] Autolinking in modern RN for libraries
- [ ] Manual package registration in older apps / custom cases
- [ ] Gradle / Podfile native dependency declaration for vendor SDKs

### Interview answer

> "If the module is app-specific, I keep it in the Android/iOS project and register it in the app package. If it's reusable, I extract a package with autolinking. Vendor SDKs still need Gradle/CocoaPods dependencies declared correctly."

---

## 10. Debugging Native Modules

### Topics to learn
- [ ] JS: method undefined -> name mismatch / not registered
- [ ] Promise never resolves -> native forgot resolve/reject
- [ ] Android Logcat stack traces
- [ ] Xcode exception breakpoints / device logs
- [ ] Crashlytics native stacks symbolication
- [ ] Reproducing on release builds

### Failure table

| Bug | Typical cause |
|---|---|
| `undefined is not a function` | Wrong module/method name; not linked |
| App crash on method call | Native NPE / force unwrap / wrong thread |
| Event not received | Emitter not subclassed correctly; no listeners; wrong event name |
| Works in debug only | Proguard/R8 stripping; missing keep rules |
| Flaky Activity null | Calling too early / after teardown |

---

## 11. Testing Native Modules

### Topics to learn
- [ ] Mock `NativeModules` in Jest
- [ ] Native unit tests for pure native logic where feasible
- [ ] Manual device tests for hardware (DataWedge needs real device)
- [ ] Do not pretend emulator covers all OEM hardware paths

---

## 12. Migration pressure: legacy modules in a Turbo Module world

### Topics to learn
- [ ] Interop with New Architecture
- [ ] Library support matrix
- [ ] When to rewrite as Turbo Module vs leave behind interop
- [ ] Spec-first Codegen migration path

Rule of thumb:
- New modules on New Arch apps -> Turbo Module ([17-turbo-modules.md](./17-turbo-modules.md))
- Existing stable legacy modules -> migrate when touching heavily or when perf/startup requires it

---

## Interview question bank

1. What is a Native Module in React Native?
2. How do you register a module on Android? On iOS?
3. Promise vs event emitter - when each?
4. Why can `getCurrentActivity()` be null?
5. How do you pass errors back to JS?
6. How do you prevent memory leaks in native modules?
7. How do you expose constants?
8. How do you test modules without hardware?
9. What breaks under Proguard/R8?
10. How do legacy Native Modules relate to the Bridge?
11. Walk through your DataWedge module design.
12. Walk through your iOS file preview module (Wizer).

### Model answer - Wizer iOS preview

> "Third-party preview components didn't meet product needs, so I built a native iOS module wrapping platform preview capabilities, exported a clean JS API, and kept rendering/file concerns on the native side. JS orchestrated when to open preview and handled fallbacks."

### Model answer - MyCreditInfo patch

> "A native Android dependency had a security/compatibility issue we couldn't wait on upstream for. I patched the native layer, bridged the fixed behavior to JS, and added regression checks around the affected flow. Native patches are last resorts - but production stability required it."

---

## Hands-on drills

- [ ] Write on paper: Android module skeleton + `getName` + one `@ReactMethod` promise method
- [ ] Write on paper: iOS `RCT_EXPORT_METHOD` with resolve/reject
- [ ] Design DataWedge event subscription API (JS facade)
- [ ] List 10 native crash causes and mitigations
- [ ] Explain legacy Native Module vs Turbo Module in 2 minutes

---

## Senior-Level Best Practices

### Decision framework
1. Can a maintained library do it? Use it.
2. Can we isolate a thin native wrapper with a tiny API? Do that.
3. Prefer promises for commands, events for streams.
4. Keep domain mapping in JS; keep platform details native.
5. Plan New Arch compatibility the day you add a module.

### Production checklist
- [ ] Typed JS facade (no raw NativeModules in UI)
- [ ] Stable error codes
- [ ] Main-thread UI discipline documented
- [ ] Listener cleanup on unmount
- [ ] Proguard keep rules if needed
- [ ] Crashlytics breadcrumbs around native calls
- [ ] README for the module (inputs/outputs/events)

### Anti-patterns
- God module exposing entire platform SDK surface
- Emitting events at insane frequency without coalescing
- Blocking UI thread on network/disk
- Silent catch on native side (JS hangs forever)
- Duplicating business rules in Kotlin/Swift and TS

### Observability
- Native success/failure counters
- Time-to-resolve for promise methods
- Event rate metrics for scanners/sensors
- Crash-free sessions attributed to module versions

### Harder follow-ups

**Q: How do you version a native module API without breaking old app releases?**
> "Additive methods first, feature-detect on JS side, avoid renaming exported module names, and gate new behavior with app version checks or capability flags."

**Q: Native module works on Pixel but fails on a Zebra device. What now?**
> "Treat it as device capability matrix work. Log model/OS, verify DataWedge profile config, reproduce on hardware, isolate intent extras differences, and add defensive parsing. Emulators won't save you."

### Staff monologue
> "A good native module is a boring, tiny contract. The seniority is in what you refuse to expose, how you handle threading and lifecycle, and how you keep JS features from rotting into platform soup. My production integrations succeeded because the native edge was narrow and well-tested on real devices."

---

## Mastery checklist

- [ ] I can sketch Android and iOS legacy module skeletons
- [ ] I can choose promise vs event correctly
- [ ] I can debug registration and threading failures
- [ ] I can tell Clean House / Wizer / MyCreditInfo native stories crisply
- [ ] I know when to migrate a module to Turbo Modules
