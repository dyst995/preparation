# 01 — Android native

> Goal: Read an `android/` tree, explain Gradle/SDK versions, Manifest + runtime permissions, Activity lifecycle, main-thread/ANR, and intents — enough to debug RN host crashes and talk through EasyPay / MyCreditInfo native work.

Mark progress with `[x]`.

---

## Learning objectives

1. Sketch the `android/` project and say what `MainActivity` / `MainApplication` are for (including in RN).
2. Distinguish `compileSdk`, `minSdk`, `targetSdk`.
3. Explain Manifest vs runtime permissions and a denial UX.
4. Walk Activity lifecycle and why rotation / process death matter.
5. Explain why UI APIs belong on the main thread and what an ANR is.
6. Contrast explicit vs implicit intents (deep links, DataWedge-style broadcasts).
7. Know where flavors, signing, and ProGuard/R8 live without reciting Fastlane.
8. Pick the right **Context** (Application vs Activity) and not leak an Activity.
9. Name the four Manifest **component** types and when FileProvider / exported receivers matter.
10. Explain **networkSecurityConfig**, backup, AAB vs APK, ABI / `.so`, and 16KB page size at literacy depth.

---

## 1. Project shape (what you open in Android Studio)

### Topics to learn
- [ ] Gradle modules (`:app` vs libraries)
- [ ] `settings.gradle` / `settings.gradle.kts` includes modules
- [ ] Root `build.gradle` vs `app/build.gradle`
- [ ] `AndroidManifest.xml` (app + merge from libraries)
- [ ] `MainActivity` (the window the user sees) vs `Application` (process-wide)
- [ ] `src/main` vs `src/debug` vs product-flavor source sets
- [ ] Kotlin vs Java (both appear; CV “native Android” is usually Kotlin + Gradle)

Typical RN host:

```text
android/
  settings.gradle
  build.gradle                 # AGP, Kotlin plugin versions
  gradle.properties
  app/
    build.gradle               # applicationId, SDKs, flavors, signingConfigs
    src/main/
      AndroidManifest.xml
      java/.../MainActivity.kt
      java/.../MainApplication.kt
      res/                     # mipmap, strings, splash theme
```

**`MainApplication`:** process start — RN `ReactNativeHost` / `Application` subclasses, SoLoader, packages. **`MainActivity`:** the Activity that hosts the RN surface (`ReactActivity`). A crash “in Android” is often **here or a library Activity**, not `App.tsx`.

### Interview answer

> MainApplication is process-wide setup. MainActivity is the UI container. In RN, that’s the host that mounts the JS bundle. If Logcat shows an Activity/Application class, I open Android Studio, not Metro.

---

## 2. Gradle, AGP, and the three SDK numbers

### Topics to learn
- [ ] Gradle wrapper (`gradlew`) pins the **Gradle** version
- [ ] **Android Gradle Plugin (AGP)** version is a separate pin (must match Gradle)
- [ ] `compileSdk` — APIs you **compile against**
- [ ] `minSdk` — oldest device you **install** on
- [ ] `targetSdk` — which **behavior contract** you opted into (Play requires recent)
- [ ] Kotlin version vs library Kotlin (mismatch = classic build break)

| Number | Question it answers |
|---|---|
| **compileSdk** | “Can I call APIs from this SDK **in source**?” |
| **minSdk** | “Will Play/install allow this APK on API 24?” |
| **targetSdk** | “Which **runtime behavior** changes (permissions, background, notifications) apply to me?” |

Raising **targetSdk** is a **behavior** change, not just a store checkbox. Example: targeting 33+ without handling **POST_NOTIFICATIONS** → silent/missing notifications. Targeting 31+ without exported Activity flags → **install-time crash**.

**Build break only on Android** after an RN upgrade: first suspects are **AGP / Gradle / Kotlin / compileSdk** vs what a native library required. Clean: `cd android && ./gradlew clean` plus invalidate caches — stale Gradle is a **false** “upgrade broke us” ([RN upgrades](../react-native/12-upgrades-stability.md)).

### Interview answer

> compileSdk is the API I compile against. minSdk is the floor device. targetSdk is the behavior contract Google holds me to. I never bump targetSdk as a no-op — I read the behavior changes, especially permissions and exported components.

---

## 3. Manifest, components, and `exported`

### Topics to learn
- [ ] `<application>`, `<activity>`, `<service>`, `<receiver>`, `<provider>`
- [ ] Intent filters (`MAIN`/`LAUNCHER`, `VIEW` + `https` for App Links)
- [ ] `android:exported` (required explicit on Android 12+)
- [ ] Merge conflicts from AARs (`tools:replace`)
- [ ] Permissions listed here are **declared**; dangerous ones still need **runtime** grant

A **deep link** that never opens the app is often a **missing or wrong intent-filter**, not JS `linking` — confirm Manifest **and** [RN linking](../react-native/38.%20deep-linking/notes.md).

**Exported Activity** with a `VIEW` filter is an **entry point**. Don’t export debug-only Activities in release.

---

## 4. Permissions (declare vs ask)

### Topics to learn
- [ ] Normal permissions (install-time, e.g. `INTERNET`)
- [ ] Dangerous permissions (runtime dialog: camera, location, storage-legacy)
- [ ] Special / one-off (exact alarms, overlay, notification listener)
- [ ] Android 13+ `POST_NOTIFICATIONS`
- [ ] Scoped storage (you don’t get blanket `READ_EXTERNAL_STORAGE` on modern targetSdk)
- [ ] Denial: never crash; offer a **non-camera** path (fintech: manual reference)

Flow: **Manifest declare → runtime request at the moment of use → handle denied / never-ask-again (settings)**.

Missing Manifest entry: request **fails** or feature **no-ops**. Unlike iOS, you don’t always **instant-crash** for a missing usage string — Android can be **silent**. Still treat missing permission as a **release bug**.

```kotlin
// Interview-level shape — request at the tap, not in Application.onCreate
if (ContextCompat.checkSelfPermission(this, CAMERA) != PERMISSION_GRANTED) {
  requestPermissions(arrayOf(CAMERA), REQ)
} else {
  openScanner()
}
```

### Interview answer

> I declare in the Manifest and request dangerous permissions JIT when the user hits the feature. Denial has a fallback. I audit leftover permissions after we remove a feature — Play review and user trust both care.

---

## 5. Activity lifecycle (and why RN still cares)

### Topics to learn
- [ ] `onCreate` → `onStart` → `onResume` (visible + interactive)
- [ ] `onPause` → `onStop` (not interactive / not visible)
- [ ] `onDestroy` (finish or process death)
- [ ] `onSaveInstanceState` / restore after **process death** or **config change**
- [ ] Config change (rotation, dark mode) **recreates** the Activity unless you handle it
- [ ] `getCurrentActivity()` in RN modules can be **null** (paused / no Activity)

```text
created → started → resumed  ⇄  paused → stopped → (destroyed)
                         \ onSaveInstanceState /
```

**Foreground vs resumed:** `onResume` is “user can tap.” Camera / biometric prompts usually need a **resumed Activity**.

**Process death:** OS kills the app in background; user returns → **new** process, **new** Application, Activity restored from saved state if you persisted it. JS RN state is **gone** unless you **rehydrate** ([auth session](../react-native/29.%20auth-session/notes.md)). Don’t assume a singleton in `MainApplication` survived.

### Interview answer

> onResume is the interactive window. Rotation recreates the Activity. Process death wipes in-memory JS. Native modules that call UI APIs must tolerate a null current Activity.

---

## 6. Threads and ANRs

### Topics to learn
- [ ] **Main / UI thread** — view inflation, `startActivity`, most UI SDK calls
- [ ] Binder / RN native-module executor is **not** an excuse to block the UI thread
- [ ] **ANR** (~5s unresponsive) — don’t parse big JSON or hit disk on main
- [ ] `runOnUiThread` / `Handler(Looper.getMainLooper())` to hop **to** main
- [ ] Coroutines: `Dispatchers.Main` vs `IO` (read-level)

RN already has a [JS vs UI vs native](../react-native/4.%20threads/notes.md) story. On Android, **ANR traces** are Logcat / Play Console, not Metro.

### Interview answer

> UIKit/Android view APIs belong on main. Heavy work goes off main, then hop back to update UI. An ANR is the OS saying the main thread was stuck.

---

## 7. Intents, broadcasts, deep links

### Topics to learn
- [ ] **Explicit** intent — component class name (open our Receipt Activity)
- [ ] **Implicit** intent — action + data (`VIEW` `https://…`)
- [ ] `startActivity` vs `sendBroadcast` / `registerReceiver`
- [ ] DataWedge: **broadcast intents** → native module **events** to JS ([RN 07](../react-native/07-native-modules.md))
- [ ] App Links: `autoVerify` + `assetlinks.json` ([deep linking](../react-native/38.%20deep-linking/notes.md))

Don’t confuse **Intent extras** with JS route params. Extras are **OS**; still **don’t trust amounts** — fetch by id.

---

## 8. Flavors, signing, shrinker (pointers)

### Topics to learn
- [ ] `productFlavors` + `applicationIdSuffix` — side-by-side installs ([flavors](../react-native/20.%20flavors-config/notes.md))
- [ ] `signingConfigs` / upload key vs Play App Signing
- [ ] `minifyEnabled` / R8 — missing keep rules → **release-only** crashes
- [ ] `BuildConfig.DEBUG` vs JS `__DEV__` (not always the same in RN)

**Release-only crash:** first suspect **R8 stripped** a native/JS interface class, or **proguard** on a patched AAR (MyCreditInfo-shaped).

---

## 9. Debugging Android native

| Tool | Use |
|---|---|
| **Logcat** | Native + RN logs; filter by package / `ReactNative` / `AndroidRuntime` |
| **Android Studio debugger** | Breakpoints in Kotlin/Java |
| **Profiler** | CPU / memory; ANR adjacent |
| **Play / Crashlytics** | Tombstones, **fatal exceptions**, ANR groups |
| **`adb`** | Install, intents, `am start` for links |

JS redbox will **not** show a Kotlin `NullPointerException` in a receiver.

---

## 10. Context (the object everything hangs off)

### Topics to learn
- [ ] **Activity** is a Context — themed, can start Activities / show dialogs, **dies** on destroy
- [ ] **Application** is a Context — process-lifetime, **no** UI; safe for singletons / RN host
- [ ] `ReactApplicationContext` in modules is **application-scoped**, not “current screen”
- [ ] `getCurrentActivity()` is a **maybe** — never store it
- [ ] `this` in an Activity vs `applicationContext` when registering a receiver

Wrong Context: `Toast` / dialog with Application context (no theme / leak). Wrong lifetime: `static var activity: Activity?` survives rotation → leak **and** crash on next present.

```kotlin
// Safe: application context for a long-lived listener
val app = context.applicationContext
// Unsafe: module field holding Activity across onDestroy
```

### Interview answer

> Application context outlives screens. Activity context is for UI. RN modules usually get the application context, so anything that needs a window goes through getCurrentActivity and treats null as normal.

---

## 11. Components besides Activity

### Topics to learn
- [ ] **Service** — no UI; started or bound; **foreground service** if the user must see ongoing work
- [ ] FGS **types** (Android 14+: `dataSync`, `camera`, …) — Play rejects fake “keep-alive” FGS
- [ ] **BroadcastReceiver** — Manifest-registered (can wake you) vs **context-registered** (foreground only)
- [ ] Android 13+ `RECEIVER_EXPORTED` / `NOT_EXPORTED` on context-registered receivers
- [ ] **ContentProvider** — IPC + startup; FileProvider is the one you actually touch
- [ ] **FileProvider** — `content://` URIs to share files (camera capture, share sheet). `file://` to other apps is blocked
- [ ] **PendingIntent** — `FLAG_IMMUTABLE` default-correct on 12+; mutable only if the system must fill it

**DataWedge (Clean House):** the scanner **broadcasts**; your receiver is usually **registered while the app is focused**, not an exported Manifest receiver that any app can spoof. Parse extras natively, emit a JS **event**, don’t trust the barcode string as a payment amount.

**Don’t:** start a foreground service from JS “so the payment socket never dies.” Android background limits + Play policy will fight you. Use **FCM** / server truth ([RN push](../react-native/08-push-firebase-device.md)).

```xml
<!-- FileProvider — camera / share need this, not a raw file path -->
<provider
  android:name="androidx.core.content.FileProvider"
  android:authorities="${applicationId}.fileprovider"
  android:exported="false"
  android:grantUriPermissions="true" />
```

### Interview answer

> Four component types: Activity, Service, Receiver, Provider. For RN I almost never write a custom Service. I do register receivers for OEM hardware, and I use FileProvider when another app or the camera needs a URI. Exported + implicit is an attack surface.

---

## 12. Cleartext, backup, package visibility

### Topics to learn
- [ ] `networkSecurityConfig` — Android’s ATS analog; cleartext off by default on modern targetSdk
- [ ] Debug-only HTTP via `src/debug` config, **not** a release exception
- [ ] `android:allowBackup` — Auto Backup can exfiltrate SharedPreferences; fintech often **false** or excludes tokens
- [ ] `<queries>` — Android 11+ package visibility; implicit intents to other apps can **silently fail** without it
- [ ] Notification **channels** (API 26+) — importance is sticky; Notifee/FCM still create channels in native

Pointer for tokens: [RN security](../react-native/13-security.md) (Keystore / EncryptedSharedPreferences). This chapter: **OS backup and cleartext**, not pinning.

### Interview answer

> I treat networkSecurityConfig like iOS ATS — no cleartext in release. I turn off or tightly filter Auto Backup so a USB backup isn’t a token dump. If an implicit intent to Maps or a bank app does nothing on Android 11+, I check queries.

---

## 13. Artifacts, ABI, native `.so`, 16KB pages

### Topics to learn
- [ ] Play wants **AAB**; testers often need a universal APK via bundletool
- [ ] ABI splits: `arm64-v8a` is the real device fleet; missing `.so` → `UnsatisfiedLinkError` on **some** phones only
- [ ] **Build types** (debug/release) × **product flavors** (staging/prod) = variants (`stagingRelease`)
- [ ] `jniLibs` / packaged native libs inside an AAR you patched (MyCreditInfo)
- [ ] **16KB page size** (Android 15+ devices / Play): native libs must be aligned; old NDK/AARs crash or fail review
- [ ] NDK/JNI literacy: you don’t write JNI daily; `UnsatisfiedLinkError` and `dlopen` failures are **host** bugs
- [ ] R8 `mapping.txt` uploaded with the AAB or Crashlytics is unreadable

```text
stagingDebug     — local, debuggable, staging applicationId
prodRelease      — Play, minify, prod applicationId
```

### Interview answer

> A crash only on 64-bit Pixel with a patched AAR is an ABI or 16KB alignment problem until proven otherwise. I don’t start in JS. Play ships AABs; if QA sideloads a thin APK they’re not testing the same artifact.

---

## 14. Memory, leaks, back press

### Topics to learn
- [ ] Static reference to Activity / View / `this@MainActivity` → leak across rotation
- [ ] Anonymous listener / inner class holding Activity
- [ ] `onBackPressed` deprecated → `OnBackPressedDispatcher` / predictive back (Android 13+)
- [ ] RN already owns back in JS navigation; a native Activity on top must still pop correctly
- [ ] StrictMode in debug (disk/network on main) — catch ANRs before Play

LeakCanary in debug builds is a **green flag** to mention, not a requirement to have installed yesterday.

---

## Common mistakes

- Bumping **targetSdk** without reading behavior changes.
- Requesting camera **at launch**.
- UI work off main → random crashes / ANR.
- Holding an **Activity** in a singleton → leak after rotation.
- Forgetting **`exported`** on a launcher/deep-link Activity.
- Debugging a native crash in **Chrome/Metro** only.
- `file://` URIs to the camera / share sheet.
- Exported DataWedge (or payment) receiver anyone can broadcast to.
- Foreground service as a fake heartbeat.
- Shipping an AAR whose `.so` isn’t 16KB-aligned.

---

## CV tie-back

**EasyPay:** native Android host — flavors, `applicationId`, Manifest, store AAB. **MyCreditInfo:** patching native Android libraries — Gradle + AAR + R8 + ABI/`.so`. **Clean House:** DataWedge **broadcasts**, context-registered receiver, events to JS.

---

## Senior-Level Best Practices

### Decision: native module vs stay in JS
Stay in JS if a maintained library covers it. Go native for **vendor SDK / OEM / OS UI** (DataWedge, QuickLook, a dead AAR). Patch an AAR when the fork is unmaintained **and** the alternative is a months-long rewrite. Keep the Kotlin surface **thin** — no business rules in the receiver.

### Ship checklist (Android host)
- [ ] Merged Manifest reviewed (`exported`, permissions, receivers) — not only `src/main`
- [ ] Dangerous permissions requested at use; denial UX; leftover permissions removed
- [ ] `targetSdk` bump has a behavior-change note in the PR
- [ ] Release: R8 mapping + native symbols; 16KB / ABI smoke on a 64-bit device
- [ ] Backup + cleartext: fintech-safe
- [ ] Flavors: staging cannot talk to prod APIs via a wrong `applicationId` / `BuildConfig`

### Anti-patterns
| Anti-pattern | What happens | Fix |
|---|---|---|
| Debug with `minifyEnabled false` only | Release-only crash | StagingRelease in CI |
| Application-wide camera permission | Play + users | JIT + fallback |
| Static Activity | Leak + crash after rotate | WeakRef / getCurrentActivity |
| Trust intent extras as money | Fraud / bugs | Fetch by id |

### Failure modes
| Symptom | First check |
|---|---|
| Install parse / “exported” | Merged Manifest, target 31+ |
| `UnsatisfiedLinkError` | ABI + 16KB + the patched AAR’s `jniLibs` |
| Notifications died after target 33 | `POST_NOTIFICATIONS` + channel |
| Implicit intent no-ops on Android 11 | `<queries>` |
| ANR in `onResume` | Main-thread SDK / disk |

### Senior follow-ups
1. **Why can `ReactApplicationContext` not show a dialog?** → It’s not an Activity. Dialogs need a window token from a resumed Activity.
2. **How do you stop a spoofed scan broadcast?** → Don’t export the receiver; custom permission or package-restricted send; never treat scan payload as authorized payment.
3. **Play says 16KB incompatible.** → Native `.so` alignment; upgrade NDK/AGP; rebuild or replace the offending AAR (often a patched/old SDK).

---

## Mastery checklist

- [ ] I can walk `android/` and point at applicationId, three SDKs, flavors, Manifest, MainActivity.
- [ ] I can explain targetSdk as behavior, with POST_NOTIFICATIONS and exported as examples.
- [ ] I can draw Activity lifecycle and say where biometrics and `getCurrentActivity()` sit.
- [ ] I can explain ANR vs JS freeze.
- [ ] I can describe FileProvider, receiver export, and DataWedge as broadcasts.
- [ ] I can name AAB vs APK, ABI, R8, and 16KB as release-host issues.

## Drills

- [ ] Open a RN `android/app/build.gradle` and point at `applicationId`, three SDK numbers, flavors.
- [ ] Draw Activity lifecycle and mark where you’d show a biometric prompt.
- [ ] Explain `targetSdk 33` + notifications in two sentences.
- [ ] From Logcat `AndroidRuntime` FATAL, say the next three clicks in Android Studio.
- [ ] Explain why a patched AAR might crash only on a 16KB-page device.
