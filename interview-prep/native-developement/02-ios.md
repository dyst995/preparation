# 02 — iOS native

> Goal: Read an Xcode project, explain Info.plist / entitlements, AppDelegate and view-controller lifecycle, CocoaPods vs SPM, ATS, and the signing trio — enough to debug RN host crashes and talk through Wizer-style native iOS work.

Mark progress with `[x]`.

---

## Learning objectives

1. Distinguish **project vs workspace**, **target vs scheme**.
2. Know what lives in **Info.plist** vs **entitlements** vs **Privacy Manifest**.
3. Walk **UIApplication** / **scene** lifecycle and **UIViewController** appear/disappear.
4. Explain why **UIKit** is main-thread and what happens if you don’t.
5. Contrast **CocoaPods** and **SPM**; know why `pod install` exists in RN.
6. Recite the **certificate / App ID / profile** model (detail + CI is [RN CI](../react-native/11-cicd-releases.md)).
7. Explain usage-description crashes and ATS.
8. Contrast **AppDelegate vs scenes**, **UIApplicationState**, and VC load vs appear.
9. Explain **ARC / retain cycles / jetsam** at literacy depth.
10. Recite background modes, Keychain-vs-disk, simulator-vs-device, and Archive/dSYM without turning this into Fastlane.

---

## 1. Xcode project shape

### Topics to learn
- [ ] `.xcodeproj` — project, targets, build settings
- [ ] `.xcworkspace` — CocoaPods (RN iOS almost always: **open the workspace**, not the proj)
- [ ] **Target** — what you **build** (app, tests, extensions)
- [ ] **Scheme** — what you **run** (target + configuration + env)
- [ ] Configurations: Debug / Release (plus Staging if you added one)
- [ ] `ios/Podfile` + `Podfile.lock` — native deps (including RN)
- [ ] `AppDelegate` (Obj-C `.mm` or Swift) — process + RN bootstrap
- [ ] `Info.plist` — keys the OS reads **before** your code runs

RN:

```text
ios/
  Podfile
  MyApp.xcworkspace      # open this
  MyApp/
    AppDelegate.swift    # or AppDelegate.mm
    Info.plist
    PrivacyInfo.xcprivacy
  MyApp.xcodeproj
```

**Wrong window:** editing `.xcodeproj` while the team builds via **workspace** → missing Pods, “module not found.”

### Interview answer

> I open the xcworkspace because CocoaPods injects a Pods project. A target is the product; a scheme is how I run it. AppDelegate is process bootstrap; Info.plist is the OS contract.

---

## 2. Info.plist, entitlements, privacy manifest

### Topics to learn
- [ ] Bundle ID (`CFBundleIdentifier`) — identity; must match App ID + signing
- [ ] Display name, version, build (`CFBundleShortVersionString` / `CFBundleVersion`)
- [ ] **Usage descriptions** — `NSCameraUsageDescription`, Face ID, photo library, location, Bluetooth, etc.
- [ ] **URL types** — custom scheme `myapp://`
- [ ] ATS — `NSAppTransportSecurity` (HTTPS default; exceptions are reviewed)
- [ ] **Entitlements** — push, associated domains, keychain groups, Apple Pay (capabilities)
- [ ] **PrivacyInfo.xcprivacy** — required reason APIs (Apple privacy manifests)

**Usage string missing:** touch camera/Face ID → **immediate crash**. This is the classic “works on my simulator, dies on a clean device/build” ([RN 07](../react-native/07-native-modules.md)). Simulator or a **stale plist** hides it.

**Plist vs entitlements:** plist is mostly **declarative copy and URL/ATS**. Entitlements are **capabilities** Apple must allow on the App ID. Associated domains (universal links) are **entitlements**, not just a plist URL type.

### Interview answer

> If we crash touching camera, I look at NSCameraUsageDescription first. If universal links don’t open the app, I look at associated domains entitlements and AASA, not only JS linking. ATS means cleartext HTTP fails unless we explicitly except it — we shouldn’t, in fintech.

---

## 3. AppDelegate, scenes, and VC lifecycle

### Topics to learn
- [ ] `application:didFinishLaunchingWithOptions:` — cold start (RN bridge/host setup)
- [ ] Open URL / universal link callbacks (may also be **scene** APIs on newer templates)
- [ ] Push registration callbacks
- [ ] **UIViewController:** `viewDidLoad` (once per instance) vs `viewWillAppear` / `viewDidAppear` (every show)
- [ ] `viewWillDisappear` / `viewDidDisappear`
- [ ] Modal vs push (nav stack) — same as [RN modal vs card](../react-native/17.%20nav-architecture/notes.md), but UIKit-native

**`viewDidLoad` ≠ every visit.** That’s the same insight as RN [`useFocusEffect`](../react-native/41.%20use-focus-effect/notes.md): **appear** is the visit.

**RN:** most “screens” are JS. Native VCs still appear for **SafariView**, **QuickLook**, **biometric** system UI, **image picker**. Wizer file preview is **a native VC** you present from a module.

Cold start + URL: AppDelegate/scene gets the URL **before** JS hydrate — queue it ([deep links](../react-native/38.%20deep-linking/notes.md)).

### Interview answer

> didFinishLaunching is process start. View controllers load once and appear many times — I don’t put refetch-only-once work in viewDidLoad if it must run every show. RN still presents real UIKit controllers for system and custom native UI.

---

## 4. Main thread and GCD

### Topics to learn
- [ ] **Main thread** — all UIKit / most AVFoundation session setup that touches UI
- [ ] `DispatchQueue.main.async { }` to hop back
- [ ] Background queue for disk / crypto / large decode
- [ ] Hitting UIKit off-main → **crashes or purple warnings** (Main Thread Checker)

RN native methods may run on a **background** method queue (`requiresMainQueueSetup`, Turbo threading). **Presenting QuickLook** must hop to **main**.

### Interview answer

> UIKit is main-thread-only. Native modules that show UI dispatch to the main queue. If Xcode Main Thread Checker fires, I treat it as a crash waiting to happen.

---

## 5. CocoaPods, SPM, and the RN install loop

### Topics to learn
- [ ] `pod install` after changing `Podfile` or RN version
- [ ] `Podfile.lock` — commit it (reproducible CI)
- [ ] New Architecture / Folly — pods are **why** iOS CI is heavy
- [ ] **SPM** (Swift Package Manager) — Xcode-native; many SDKs offer both
- [ ] Mixing SPM + Pods is possible but a **conflict** magnet
- [ ] Clean: delete `Pods`, `build`, Derived Data; reinstall — **before** blaming the upgrade

**“Module X not found”** after git pull: teammate added a pod; you didn’t `pod install`.

### Interview answer

> RN iOS dependencies are CocoaPods. I commit Podfile.lock, run pod install on a clean machine, and I don’t debug a missing native module in Metro until the workspace actually contains the pod.

---

## 6. Signing (the pieces; CI elsewhere)

Mental model — three parts **must agree**:

1. **Certificate** — who signed (team identity)
2. **App ID** — bundle ID + **capabilities**
3. **Provisioning profile** — cert + App ID + devices/distribution type

| Profile | Who can run it |
|---|---|
| Development | Registered devices, local debug |
| Ad Hoc | Registered UDIDs (QA IPA) |
| App Store | TestFlight / App Store |
| Enterprise | Org-internal (separate program) |

**Capabilities mismatch:** you enabled Associated Domains in Xcode but the **profile** wasn’t regenerated → build or **link open** fails.

Expiry: certs/profiles **die**; CI fails at **codesign**, not in Jest. Full Fastlane `match` story: [11-cicd-releases](../react-native/11-cicd-releases.md).

**dSYMs:** crash symbolication for that **exact** build. Missing dSYM → unreadable Crashlytics.

---

## 7. Swift vs Objective-C (RN reality)

### Topics to learn
- [ ] Many RN templates and older modules are **Obj-C++** (`.mm`)
- [ ] Swift modules need a **bridging header** or are **Swift-only** with extras
- [ ] JS `null` → `NSNull` — Swift optionals bite
- [ ] Wizer-style preview: Swift/Obj-C wrapping **QuickLook** / PDFKit

You don’t need to write SwiftUI for a RN interview. You **do** need to **read** a `RCT_EXPORT_METHOD` and a Swift `QLPreviewController` present.

---

## 8. Debugging iOS native

| Tool | Use |
|---|---|
| **Xcode console** | Native + some RN logs |
| **Breakpoints** | AppDelegate, module, VC |
| **Main Thread Checker** | Off-main UIKit |
| **Instruments** | Leaks, time profiler |
| **Devices and Simulators** | Provisioning, crash logs |
| **`xcrun simctl openurl`** | Scheme / universal-link tests |

A **fatal SIGABRT** on camera with no JS stack → **plist**, not Redux.

---

## 9. App state, scenes, and memory

### Topics to learn
- [ ] `UIApplication` states: active / inactive / background / suspended / not running
- [ ] **SceneDelegate** (multi-window iPad) vs classic AppDelegate-only templates — RN templates vary; **URL/open** may arrive on the scene
- [ ] **ARC** — you don’t `free`; you still create **retain cycles** (closure + `self`, delegate not `weak`)
- [ ] **Jetsam** — OS kills for memory; looks like a crash with little JS stack
- [ ] Instruments Leaks / Allocations for native VC you presented and never dismissed
- [ ] Autorelease pools in tight native loops (read-level)

Suspended ≠ your JS timers still run. Assume **death**. Rehydrate like Android process death ([auth session](../react-native/29.%20auth-session/notes.md)).

```swift
// Cycle: VC owns module, module closure captures VC strongly
preview.completion = { self.dismiss(animated: true) } // retain cycle risk
preview.completion = { [weak self] in self?.dismiss(animated: true) }
```

### Interview answer

> iOS can suspend or jetsam me. I don’t promise background JS. If I present a native preview controller, I dismiss it and break retain cycles — Wizer-style UI is a real UIKit object with a real lifetime, not a React unmount.

---

## 10. Files, QuickLook, and sandbox (Wizer)

### Topics to learn
- [ ] App **sandbox** — you don’t read arbitrary paths
- [ ] `QLPreviewController` / `UIDocumentInteractionController` / PDFKit — present **on main**, need a file URL you **own** (copied into tmp/cache)
- [ ] Security-scoped URLs if the user picked via document picker (`startAccessingSecurityScopedResource`)
- [ ] Photo library: `NSPhotoLibraryUsageDescription` vs **Add Only**; iOS 14 **limited** library
- [ ] Don’t pass a remote HTTP URL into QuickLook and hope

Wizer interview sentence: **native module copies/opens the file, hops to main, presents system preview, dismisses, emits result to JS.** JS never talks to QuickLook.

---

## 11. Background modes and push (host only)

### Topics to learn
- [ ] `UIBackgroundModes` in plist — each bit is **reviewable** (audio, location, `remote-notification`, fetch, processing)
- [ ] Silent push (`content-available`) is **best-effort**, not a socket
- [ ] **Notification Service Extension** — rewrite payload / attach image **before** display (separate target, own signing)
- [ ] APNs entitlement must be on the **App ID + profile**, not only an npm package
- [ ] BGTaskScheduler — literacy; you won’t implement it in a RN interview

**Red:** “We keep a WebSocket alive in the background for payments.” Apple will suspend you. Server + push is the truth.

Full FCM/Notifee: [RN 08](../react-native/08-push-firebase-device.md).

---

## 12. Keychain, App Groups, ATT (host pointers)

### Topics to learn
- [ ] Keychain is **not** UserDefaults — hardware-backed, access-control; can **survive reinstall** depending on accessibility
- [ ] **Keychain access groups** / **App Groups** — share with an extension (NSE, widgets) or a sister app
- [ ] UserDefaults / files are sandbox disk; backups may include them
- [ ] **App Tracking Transparency** (`NSUserTrackingUsageDescription`) if you use IDFA — fintech often **doesn’t**
- [ ] Face ID: `NSFaceIDUsageDescription` + `LAContext` (local auth is **not** server auth)

Mechanism depth: [RN 13](../react-native/13-security.md). Here: **which plist/entitlement** and “Keychain ≠ AsyncStorage.”

---

## 13. Build settings, Archive, device vs simulator

### Topics to learn
- [ ] **Automatic vs Manual** signing — CI is Manual + `match`; local Automatic hides profile pain
- [ ] `GENERATE_INFOPLIST_FILE` — keys in Build Settings can **override** the plist you edited
- [ ] `.xcconfig` — flavor-like values without duplicating the project
- [ ] **Derived Data** / Clean Build Folder — first clean when Xcode is “haunted”
- [ ] **Archive** produces the IPA + **dSYMs**; Run Debug is not what you shipped
- [ ] Simulator: different binary (often arm64 Mac); **no** real camera/APNs/Keychain-cloud; privacy grants persist
- [ ] Device: provisioning, real sensors, jetsam
- [ ] Architecture: `arm64` required; `x86_64` simulator leftovers bite Apple Silicon / App Store validation

**“Works in simulator”** is not evidence for camera, push, IAP, or file providers.

---

## Common mistakes

- Opening `.xcodeproj` instead of `.xcworkspace`.
- Forgetting usage strings; testing only on a simulator that already granted privacy.
- UIKit off main.
- Custom scheme only, then wondering why **https** emails open Safari (need **universal links** + AASA).
- Letting CI **mint** new certs (`match` should be **readonly** on CI).
- Shipping without **dSYMs**.
- Editing Info.plist while `GENERATE_INFOPLIST_FILE` silently wins.
- Presenting QuickLook off-main or on a deallocated VC.
- Background mode bits you don’t use (review risk).
- Strong `self` in a preview completion handler.

---

## CV tie-back

**Wizer:** custom **native iOS** file preview — sandbox file URL, **main** queue, `QLPreviewController` (or equivalent), dismiss + no retain cycle, plist if the picker path needs usage strings. **Online School / Orient Logic:** signing trio + macOS runner — this chapter’s mental model, lanes in [RN 11](../react-native/11-cicd-releases.md).

---

## Senior-Level Best Practices

### Decision: present native UI vs JS modal
If Apple already has the viewer (QuickLook, document picker, Face ID chrome), **present the system VC**. Don’t fake PDF pixels in JS. Keep JS as the product shell.

### Ship checklist (iOS host)
- [ ] Workspace + committed `Podfile.lock`
- [ ] Usage strings for every API you touch; privacy manifest for required-reason APIs
- [ ] Entitlements match App ID (push, associated domains, keychain groups)
- [ ] Archive dSYMs uploaded (Crashlytics / App Store)
- [ ] No ATS exceptions in fintech release
- [ ] Device smoke: camera, Face ID, universal link, cold-start URL

### Anti-patterns
| Anti-pattern | Failure | Fix |
|---|---|---|
| Simulator-only permission testing | Device crash | Clean device / reset privacy |
| Background socket | Suspend / reject | Push + server |
| Strong cycle on preview VC | Jetsam / leaked window | `[weak self]`, dismiss |
| Automatic signing on CI | Cert spam | `match` readonly |

### Failure modes
| Symptom | First check |
|---|---|
| SIGABRT on camera / Face ID | Usage string + clean install |
| Universal link → Safari | Entitlement + AASA + HTTPS |
| Module not found | `pod install` + workspace |
| Unreadable crash | dSYM for **that** build number |
| Works Debug, fails Archive | Bitcode gone now; usually signing, plist generation, or Swift optimization + unwrap |

### Senior follow-ups
1. **Why can Keychain outlive uninstall?** → Accessibility + iCloud Keychain / group; logout must **delete items**, not assume filesystem wipe. That’s why reinstall tests lie.
2. **Scene vs AppDelegate URL?** → Multi-scene templates deliver `openURLContexts` on the scene. If you only implement AppDelegate, cold-start links drop.
3. **Would you add `remote-notification` background mode for a chat badge?** → Only if you actually do silent processing. Badges via normal APNs don’t need that bit. Extra modes attract review questions.

---

## Mastery checklist

- [ ] I open the workspace, not the proj, and can point at target vs scheme vs plist vs entitlements.
- [ ] I can recite the signing trio and who Ad Hoc vs App Store vs TestFlight may run.
- [ ] I can map viewDidLoad vs appear to RN mount vs focus.
- [ ] I can explain ATS, usage-string crashes, and Main Thread Checker.
- [ ] I can describe Wizer preview as present-on-main + sandbox URL.
- [ ] I know simulator is not device for camera, push, or provisioning.

## Drills

- [ ] Point at workspace vs project, target vs scheme, Info.plist usage key.
- [ ] Draw VC load vs appear; map to RN focus vs mount.
- [ ] Recite signing trio in 20 seconds.
- [ ] Name three reasons a clean device crashes and a debug phone doesn’t.
- [ ] Explain why a QuickLook module must copy the file and hop to main.
