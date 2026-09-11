# 06 — Native debug playbook

> Goal: A **method** for host failures so you don’t open Metro by reflex. Interviewers care about the **first three checks**, not a 40-tool list.

Mark progress with `[x]`.

---

## Learning objectives

1. Split **JS vs native vs build vs signing vs OS policy** in under 30 seconds.
2. Name the right window: Logcat, merged Manifest, Xcode console, plist, `pod install`, mapping/dSYM.
3. Walk five CV-shaped incidents out loud.
4. Know what you will **not** do (regenerate certs on CI, “clean for luck” as the only step).

---

## 1. 30-second triage

Ask, in order:

1. **Is there a JS stack / Redbox?** → Metro / RN. Stop this playbook.
2. **Does it fail to compile?** → Gradle/Pods/Xcode, not runtime.
3. **Does it fail to install / codesign?** → identity, profile, exported, targetSdk.
4. **Does it crash with `AndroidRuntime` / SIGABRT / native frames?** → Studio/Xcode.
5. **Does it only fail in release / one ABI / one OS version?** → R8, ABI, 16KB, targetSdk behavior, usage strings.

```text
JS Redbox ────────────── Metro
Gradle / Kotlin error ── Android Studio + `./gradlew :app:assembleDebug --stacktrace`
Pod / module not found ─ workspace + `pod install` + Derived Data
codesign / provision ── Xcode signing / match logs
FATAL EXCEPTION ─────── Logcat (tag AndroidRuntime) + tombstone
SIGABRT on API use ──── Info.plist usage key
ANR ─────────────────── Play traces / `traces.txt` — main thread
```

### How to say it

> If the stack is Kotlin or Obj-C, I don’t debug it in Chrome. If it’s a permission or signing failure, I don’t add JS try/catch.

---

## 2. Android: first clicks

| You see | You do |
|---|---|
| `ActivityNotFoundException` | Merged Manifest intent-filter / `queries` |
| `SecurityException` permission | Manifest + runtime grant |
| `IllegalStateException: exported` at install | Component with filter missing `exported` |
| `UnsatisfiedLinkError` | ABI folder + 16KB + the AAR you patched |
| `ClassNotFoundException` **release only** | R8 keep + mapping.txt |
| ANR `main` in `onResume` | What SDK runs on resume; StrictMode |
| Receiver never fires | Exported flag, action string, **foreground** register (DataWedge) |
| Deep link opens Play Store / browser | `assetlinks.json`, `autoVerify`, scheme mismatch |
| Gradle “compileSdk” / AGP | Wrapper + library release notes, not npm |

**Merged Manifest:** Android Studio **App → manifests → merged**. Libraries add permissions and receivers you didn’t write.

```bash
cd android && ./gradlew :app:assembleStagingDebug --stacktrace
adb logcat -s AndroidRuntime:E ReactNative:V
adb shell am start -W -a android.intent.action.VIEW -d "https://app.example.com/tx/1"
```

---

## 3. iOS: first clicks

| You see | You do |
|---|---|
| `module map not found` / `No such module` | Open **workspace**, `pod install`, clean Derived Data |
| SIGABRT at camera / Face ID / photos | Usage string; reset Privacy on device |
| `This app has crashed because it attempted to access privacy-sensitive data` | Same |
| codesign `errSecInternalComponent` / profile | Team, expired profile, capability not on App ID |
| Universal link → Safari | Associated domains **entitlement**, AASA HTTPS, `applinks:` exact |
| QuickLook blank / crash | File URL in sandbox, **main** thread, VC still alive |
| Crashlytics unsymbolicated | dSYM of **that** build number |
| Works Run, fails Archive | Generated plist, signing, `RELEASE` unwraps |
| Purple Main Thread Checker | Hop to `DispatchQueue.main` |

```bash
cd ios && pod install
xcrun simctl openurl booted "https://app.example.com/tx/1"
# Device Console in Xcode → filter process name
```

**Plist you edited vs plist you shipped:** Build Settings `GENERATE_INFOPLIST_FILE` and `INFOPLIST_KEY_*` can override the file in the navigator.

---

## 4. Incident scripts (speak these)

### A. Play ANR cluster in `MainActivity`

1. Open the ANR trace — confirm **main**.
2. Identify the frame: our Kotlin vs RN vs vendor SDK.
3. If vendor: don’t call it on resume; defer off main.
4. If us: disk/JSON/biometric prompt without Activity check.
5. Ship: StrictMode on staging, reproduce with “Don’t keep activities.”

Not a FlatList issue. JS freeze ≠ ANR ([threads](../react-native/4.%20threads/notes.md)).

### B. MyCreditInfo-shaped: crash only on some devices after a native patch

1. ABI: does the AAR pack `arm64-v8a` (and 16KB alignment)?
2. R8: does release strip the patched class?
3. `targetSdk` behavior inside the AAR (exported, file URIs).
4. Keep a **device matrix** note in the PR, not “works on my Pixel.”

### C. Wizer-shaped: preview crash on device, simulator fine

1. Main thread.
2. File actually copied (simulator home paths ≠ device sandbox).
3. Usage / file-access plist if the picker was involved.
4. VC retain cycle / dismiss.
5. Large PDF memory → jetsam; stream or page, don’t mmap a 200MB file on main.

### D. Clean House: scans work in Zebra demo app, not in ours

1. DataWedge **profile** associated with **our** `applicationId`.
2. Intent action/category **strings** match the receiver.
3. Receiver registered in **resumed** Activity; unregistered `onPause`.
4. Not exported for the world.
5. JS subscribed to the event **before** the first scan (focus vs mount).

### E. CI: iOS codesign / Android wrong keystore

1. Confirm **which** identity CI used (not yours locally).
2. iOS: `match` **readonly**; profile contains the capability.
3. Android: store file + alias + passwords from CI secrets; Play **upload** key not the old app signing key.
4. Do **not** “Create new certificate” on the runner.

Lanes: [RN 11](../react-native/11-cicd-releases.md).

### F. Notifications died after a targetSdk bump

Android 13 `POST_NOTIFICATIONS` + channel existence + FCM token. iOS: entitlement + capability on the **new** App ID if you changed bundle ID for a flavor.

---

## 5. “Don’t keep activities” and process death drills

Android developer option **Don’t keep activities** approximates **Activity destroy** while process may live. Combined with killing the process from Recents, you test:

- `getCurrentActivity() == null`
- JS store empty → session rehydrate
- Native singleton pointing at a dead Activity

Say this in interviews: **I test native modules with Don’t keep activities before I trust a scanner or biometric.**

iOS analog: background the app, wait, or use Jetsam sim; plus **kill from app switcher**.

---

## 6. Observability you actually use

| Signal | Why |
|---|---|
| Crashlytics **native** + JS | Two worlds; mapping/dSYM must match version |
| Play ANR / vitals | Main-thread budget |
| Logcat / Xcode with **build fingerprint** | “Can’t repro” is often a different flavor |
| `versionCode` / `CFBundleVersion` on the crash | dSYM mismatch otherwise |
| Breadcrumb: permission result, Activity resume | Native failures are often “denied” not “threw” |

---

## Green / red flags

**Green:** Merged Manifest, usage strings, dSYM, ABI, “that’s an ANR not a JS freeze,” Don’t keep activities.

**Red:** “I’ll add a timeout in JS.” “Clean build” as the whole diagnosis. Regenerating certs. Ignoring flavor/`applicationId` when DataWedge “doesn’t see us.”

---

## Senior follow-ups

1. **How do you know a crash is R8?** → Debug/minify-off fine; mapping shows stripped class; keep rule fixes release.
2. **JS caught an error but Play still shows native crash.** → Different thread / later frame; or `FatalException` in native after a rejected promise. Look at the **native** cluster.
3. **Teammate: “Let’s disable minify to ship.”** → You hide the bug and grow the APK. Fix keeps, don’t disable R8 in prod.
4. **Universal links work on the staging app, not prod.** → Different bundle ID needs its **own** AASA paths / associated domains. Copy-paste entitlements miss the prod app ID.

---

## Mastery checklist

- [ ] I triage JS vs compile vs signing vs native crash in 30 seconds.
- [ ] I can drive merged Manifest + Logcat + usage-string checks without notes.
- [ ] I can talk through ANR, patched AAR, QuickLook, DataWedge, and codesign incidents.
- [ ] I test native UI with Don’t keep activities / process death.
- [ ] I never debug Kotlin NPEs in Chrome.
