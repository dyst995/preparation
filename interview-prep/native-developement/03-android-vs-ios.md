# 03 — Android vs iOS (fill from memory)

> Goal: Recite the host differences an RN interviewer actually asks. If a row is fuzzy, go back to [01](./01-android.md) or [02](./02-ios.md). Module/Bridge detail stays in [RN 07](../react-native/07-native-modules.md) / [16](../react-native/16-native-modules.md).

Cover the tables, then say each row out loud in one sentence.

---

## 1. Project and build

| | **Android** | **iOS** |
|---|---|---|
| IDE | Android Studio | Xcode |
| Open this | `android/` Gradle project | **`.xcworkspace`** (Pods), not only `.xcodeproj` |
| Build system | Gradle + AGP + wrapper | Xcode build settings + CocoaPods / SPM |
| App entry | `MainApplication` + `MainActivity` | `AppDelegate` (+ scenes) |
| OS contract file | `AndroidManifest.xml` | `Info.plist` + entitlements + privacy manifest |
| Native language you read | Kotlin (some Java) | Swift (some Obj-C / `.mm`) |
| RN install extra | `./gradlew` / Studio sync | `pod install` |
| Flavor analog | `productFlavors` | Xcode **configurations / schemes** (+ extra bundle IDs) |

**One sentence:** Android is a Gradle module tree; iOS is an Xcode workspace that CocoaPods mutates.

---

## 2. Identity (what the store and OS think you are)

| | **Android** | **iOS** |
|---|---|---|
| Install identity | `applicationId` | Bundle ID (`CFBundleIdentifier`) |
| Code namespace | `namespace` / Java package — **can differ** from applicationId | Product module name ≠ bundle ID |
| Side-by-side installs | `applicationIdSuffix` per flavor | Distinct bundle IDs per target/config |
| Version user sees | `versionName` | `CFBundleShortVersionString` |
| Store monotonic | `versionCode` (int) | `CFBundleVersion` (build) |
| Deep-link host claim | Intent filters + Digital Asset Links | Associated domains + AASA |

Wrong ID = **can’t update** the store listing, or QA installs **beside** prod and thinks the build is missing. Full flavor story: [RN flavors](../react-native/20.%20flavors-config/notes.md).

---

## 3. Permissions and privacy copy

| | **Android** | **iOS** |
|---|---|---|
| Declare | Manifest `<uses-permission>` | Usage **strings** in Info.plist |
| Ask | Runtime for **dangerous** (and `POST_NOTIFICATIONS` on 33+) | System dialog when the API is first used |
| Missing declare | Feature often **silently fails** | Missing usage string → **crash** on first use |
| Normal / install-time | e.g. `INTERNET` | N/A in the same way (entitlements instead for capabilities) |
| Capabilities (push, associated domains, wallet) | Manifest + Play / FCM setup | **Entitlements** must match App ID + profile |
| Privacy extra | Play Data safety form | Privacy Manifest (`PrivacyInfo.xcprivacy`) |
| Denial UX | Settings deep-link + fallback | Same idea; don’t crash |

**Interview trap:** “I added the JS permission library.” Neither OS cares until Manifest/plist (and iOS entitlements) match.

---

## 4. Lifecycle (process vs screen)

| Event | **Android** | **iOS** |
|---|---|---|
| Process start | `Application.onCreate` | `didFinishLaunching` |
| UI container created | `Activity.onCreate` | VC `viewDidLoad` (once per instance) |
| Interactive / focused | `onResume` | `viewDidAppear` / scene active |
| Going away | `onPause` / `onStop` | `viewWillDisappear` / resign active |
| Config change (rotation) | Activity **recreated** by default | Trait/size change; VC usually **not** destroyed |
| Process death | New process; restore from `savedInstanceState` | New process; no JS heap; state restoration APIs exist but RN rarely uses them fully |
| RN `getCurrentActivity()` analog | Can be **null** | No Activity; presenting UI needs a **visible** VC / window |

Map to JS: mount ≠ focus. Same lesson as [`useFocusEffect`](../react-native/41.%20use-focus-effect/notes.md).

---

## 5. Threads

| | **Android** | **iOS** |
|---|---|---|
| UI thread name | Main / UI thread | Main thread |
| Block it and you get | **ANR** (~5s) + jank | Hang, watchdog-ish kills, Main Thread Checker |
| Hop **to** UI | `runOnUiThread` / main `Looper` / `Dispatchers.Main` | `DispatchQueue.main.async` |
| RN module queue | Often **not** main (`@ReactMethod` background) | Same — **present UI on main** |
| First log to open | Logcat `ANR` / `AndroidRuntime` | Xcode + crash dialog / Devices logs |

Both: camera, biometric, QuickLook, `startActivity` / `present` → **main**. Parse / disk / crypto → **off** main.

---

## 6. Signing and distribution

| | **Android** | **iOS** |
|---|---|---|
| What signs the artifact | Keystore / upload key | Certificate |
| What the OS/store binds | `applicationId` | App ID (bundle ID + capabilities) |
| Who may install this build | Anyone with the APK/AAB (plus Play App Signing) | **Profile** type: dev / Ad Hoc devices / App Store / Enterprise |
| Play vs App Store extra | Play App Signing: **upload key ≠ app signing key** | Profiles expire; capabilities must be on the App ID |
| CI classic fail | Wrong keystore / alias / password | Expired profile, `match` not readonly, capability mismatch |
| Crash symbolication | mapping.txt (R8) + native symbols | **dSYMs** for that exact build |

iOS signing **detail + Fastlane:** [RN 11](../react-native/11-cicd-releases.md). This table is the **mental model** only.

---

## 7. Navigation into the app (links)

| | **Android** | **iOS** |
|---|---|---|
| Custom scheme | Intent filter `myapp://` | URL types in plist |
| HTTPS app open | App Links (`autoVerify` + `assetlinks.json`) | Universal links (associated domains + AASA) |
| Cold start | Intent extras on launcher Activity | AppDelegate / scene URL **before** JS |
| Hardware / OEM | Broadcasts (DataWedge) | Less common; accessories via native APIs |

JS `linking` config is **necessary but not sufficient**. Native claim files must be right ([RN deep linking](../react-native/38.%20deep-linking/notes.md)).

---

## 8. Debugging: which window?

| Symptom | Open |
|---|---|
| Redbox / `console.log` / JS exception | Metro / Flipper / RN debugger |
| `AndroidRuntime` FATAL / ANR in Play | **Logcat** + Android Studio |
| SIGABRT on camera, no JS stack | **Info.plist** in Xcode |
| `Module X not found` after pull | `pod install` / Gradle sync |
| Codesign / provisioning | Xcode signing / Fastlane match logs |
| Release-only crash, debug fine | R8 keep rules (Android) or bitcode/dSYM/optimization (iOS) |
| UI from a native module crashes randomly | Main-thread hop |

**Rule:** JS tools don’t show Kotlin NPEs or missing usage strings.

---

## 9. Stores and background (interview-short)

| | **Android** | **iOS** |
|---|---|---|
| Artifact | AAB (Play) / APK (sideload, some stores) | IPA |
| Review extras | Data safety, targetSdk floor | Privacy nutrition, usage strings, ATS |
| Background work | WorkManager / FCM; restrictions by targetSdk | BG modes in plist; Apple is stricter |
| Kill in background | Process death common | Jetsam / memory; assume JS is gone |
| Push | FCM (+ `POST_NOTIFICATIONS`) | APNs + push entitlement |

Don’t claim you “run a JS interval in background forever” on either OS.

---

## 10. Storage, files, backup

| | **Android** | **iOS** |
|---|---|---|
| Vault | Keystore + EncryptedSharedPreferences | Keychain |
| Insecure cache | SharedPreferences / AsyncStorage | UserDefaults / AsyncStorage |
| Uninstall wipes vault? | Usually yes | **Not always** (Keychain) |
| Backup risk | `allowBackup` / Auto Backup | iCloud + computer backups of container |
| Share a file | FileProvider `content://` | Sandbox copy + security-scoped URL |
| Preview PDF | Native viewer or JS; still a file in cache | **QuickLook** on main (Wizer) |
| Cleartext knob | `networkSecurityConfig` | ATS |

Detail: [05](./05-storage-background-security.md).

---

## 11. Memory and leaks

| | **Android** | **iOS** |
|---|---|---|
| Classic leak | Static **Activity** / inner class | Retain cycle (`self` in closure), undismissed VC |
| OS kill | Process death, LMK | **Jetsam** |
| Rotation | New Activity instance | Same VC typically |
| Test knob | Don’t keep activities | Kill from switcher; memory warning |

---

## 12. Native artifacts (release engineering)

| | **Android** | **iOS** |
|---|---|---|
| Store artifact | **AAB** (Play) | **IPA** (Archive / Transporter) |
| Shrinker | R8 + mapping.txt | Strip + Swift optimization (no Bitcode) |
| Native crash glue | ABI `.so`, **16KB pages** | arm64, missing dSYM |
| Variant matrix | buildType × flavor | configuration × scheme × bundle ID |
| Clean “haunted IDE” | `gradlew clean` + invalidate caches | Derived Data + `pod install` |

---

## 13. CV mapping (say this pairing)

| Story | Platform literacy they hear |
|---|---|
| **EasyPay** native Android | Gradle, flavors/`applicationId`, Manifest, store signing |
| **MyCreditInfo** patched Android libs | AAR / Gradle, R8, ABI / **16KB**, `targetSdk` |
| **Wizer** iOS file preview | Sandbox file, **main**, QuickLook, no retain cycle |
| **Clean House** DataWedge | Android **broadcasts/intents**, not a JS barcode widget |
| **Online School** Fastlane CI | Signing trio + keystore; macOS runner for Xcode |

---

## Drill (closed notes)

Fill blanks:

1. compileSdk vs targetSdk vs minSdk.
2. Why iOS camera crashes and Android camera no-ops.
3. Activity recreate vs VC `viewDidLoad`.
4. applicationId vs bundle ID.
5. Three signing pieces on iOS; upload key vs app signing key on Android.
6. First tool for ANR vs first tool for missing `NSCameraUsageDescription`.
7. FileProvider vs `file://`; QuickLook sandbox copy.
8. Why iOS reinstall might still be logged in.
9. 16KB page size / `UnsatisfiedLinkError` after patching an AAR.
10. DataWedge: profile `applicationId` + non-exported receiver.

Answers live in [01](./01-android.md), [02](./02-ios.md), [05](./05-storage-background-security.md), [06](./06-debug-playbook.md), and [04](./04-interview-questions.md).
