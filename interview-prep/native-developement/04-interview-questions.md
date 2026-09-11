# 04 — Interview questions (native Android + iOS)

> Goal: Spoken answers at RN/fullstack depth. Notes closed. If you drift into Bridge serialization or Codegen, that’s [RN 15–17](../react-native/15-bridge.md) — this file is the **host**.

Answer out loud, then read the model. Follow-ups are what seniors get next.

---

## Rapid-fire (one breath)

1. **What is React Native, platform-wise?** → Two native apps with a JS runtime. Crashes and permissions live in the host.
2. **compileSdk vs minSdk vs targetSdk?** → Compile-against API / install floor / **behavior contract** you opted into.
3. **Why isn’t bumping targetSdk a no-op?** → Play wants it, but behavior changes (exported, notifications, storage) start applying.
4. **Manifest vs runtime permission?** → Declare always; dangerous (and POST_NOTIFICATIONS) must be **asked** at use.
5. **iOS usage string missing?** → Crash on first API use (`NSCameraUsageDescription`, etc.).
6. **Why open `.xcworkspace`?** → CocoaPods. The `.xcodeproj` alone doesn’t see Pods.
7. **Target vs scheme?** → Target is the product; scheme is how you run it (config + env).
8. **ANR?** → Main thread stuck (~5s). Logcat / Play, not Metro.
9. **Why hop to main in a native module?** → RN method queues often aren’t main; UIKit/Android view APIs must be.
10. **applicationId vs Java package?** → Install identity vs code namespace. Flavors change applicationId.
11. **iOS signing trio?** → Certificate + App ID (bundle ID + capabilities) + provisioning profile.
12. **Play App Signing in one line?** → Upload key signs what you send; Google holds the **app signing** key users verify.
13. **getCurrentActivity() null?** → No resumed Activity (background, process edge). Don’t NPE; don’t leak the Activity.
14. **Intent explicit vs implicit?** → Named component vs action/data (VIEW, broadcasts).
15. **Custom scheme vs universal / App Links?** → `myapp://` vs verified **https** (AASA / assetlinks).
16. **When Android Studio vs Metro?** → Native stack / Gradle / Manifest / Logcat FATAL → Studio. JS Redbox → Metro.
17. **When Xcode vs Metro?** → Plist, signing, Pods, UIKit, SIGABRT → Xcode.
18. **R8 release-only crash?** → Shrinker stripped a class the JS/native bridge still names. Keep rules.
19. **Process death?** → OS killed the process; new Application; JS heap gone; restore or re-auth.
20. **ATS?** → iOS defaults to HTTPS; cleartext needs an exception you should almost never ship in fintech.
21. **Android ATS analog?** → `networkSecurityConfig`; debug overlay, not a release HTTP hole.
22. **allowBackup in fintech?** → Off or exclude tokens; backup is exfil.
23. **FileProvider why?** → Other apps can’t take `file://`; grant `content://`.
24. **16KB pages?** → Native `.so` alignment on Android 15+; old AARs crash or fail Play.
25. **Jetsam?** → iOS memory kill; looks like a crash; JS gone.
26. **Keychain after uninstall?** → Can remain; logout must `SecItemDelete`.
27. **BiometricPrompt / LAContext proves what?** → Local presence / key unlock — **not** server identity.
28. **Don’t keep activities?** → Forces Activity destroy; tests null `getCurrentActivity()` and leaks.
29. **Merged Manifest?** → What actually ships after AAR merge — permissions, receivers, `exported`.
30. **GENERATE_INFOPLIST_FILE?** → Build Settings may override the plist file you edited.

---

## Spoken answers (90 seconds max)

### Q1. Walk the Android project you actually open in an RN app.

> `settings.gradle` includes `:app`. App `build.gradle` has `applicationId`, compile/min/target SDK, flavors, signing. Manifest declares components and permissions. `MainApplication` is process setup including the RN host. `MainActivity` is the window that mounts RN. If Logcat names those classes, I debug in Android Studio.

**Follow-up:** Where do product flavors live? → `app/build.gradle` `productFlavors`; they can suffix `applicationId` so staging sits beside prod. Detail: [flavors unit](../react-native/20.%20flavors-config/notes.md).

---

### Q2. `targetSdk` is 33 and notifications vanished. What happened?

> Targeting 13+ makes `POST_NOTIFICATIONS` a runtime permission. If we never request it, the OS can drop notifications. I’d confirm Manifest declare, the runtime prompt at a sensible moment, and that we’re not only testing on an old targetSdk debug build.

**Follow-up:** Is that an FCM bug? → Unlikely first. Permission + channel + token, in that order ([RN push](../react-native/08-push-firebase-device.md)).

---

### Q3. Camera works on your phone and crashes on a teammate’s iOS device.

> First: missing `NSCameraUsageDescription` — their clean install hits the API; yours might be a simulator or an old grant. Second: they opened `.xcodeproj` so the plist in the built app is wrong. Third: permission denied with no fallback. I don’t start in JS.

**Follow-up:** Android equivalent? → Missing Manifest permission or never requesting; more often a **silent** fail than a crash.

---

### Q4. What is an ANR and how do you prevent it in a native module?

> The main thread didn’t process input for too long. I keep disk, JSON, and SDK warmup off main, then `runOnUiThread` / `DispatchQueue.main` only to present UI or start an Activity. I don’t treat the RN module thread as “background enough” if I still touch views there.

**Follow-up:** JS `InteractionManager` fix an ANR? → No. ANR is **native main**, not the JS queue ([threads](../react-native/4.%20threads/notes.md)).

---

### Q5. Explain iOS code signing like I’m a web engineer.

> A certificate is who we are. An App ID is the bundle ID plus capabilities (push, associated domains). A profile binds that cert to that App ID and to devices or to App Store distribution. If any piece disagrees, `codesign` fails or a capability silently doesn’t work. CI should consume certs (`match` readonly), not mint new ones.

**Follow-up:** Why did TestFlight work and Ad Hoc QA fail? → Different **profile** class and device UDID registration. [RN CI](../react-native/11-cicd-releases.md).

---

### Q6. Activity lifecycle — where do you show biometrics?

> When the Activity is resumed — user is looking at it. `onCreate` is too early if we’re mid-restore; `onPause` means we’re leaving. Rotation recreates the Activity, so I must not keep a stale Activity reference in a singleton. Process death means the JS prompt state is gone unless we persist a flag.

**Follow-up:** iOS analog? → Present from a visible view controller, typically `viewDidAppear` / after launch, always on main. `viewDidLoad` is once, not every visit.

---

### Q7. Deep link opens Safari instead of the app.

> Native claim is wrong or unverified. Android: intent-filter + `assetlinks.json` / `autoVerify`. iOS: associated **domains entitlement** + AASA, not only a custom scheme. JS linking config can’t fix a missing OS claim. Cold start still has to queue the URL until navigation is ready.

**Follow-up:** DataWedge? → That’s a **broadcast**, not a https link. Native receiver → event to JS ([RN 07](../react-native/07-native-modules.md)).

---

### Q8. When do you write native code vs a JS library?

> When the OS or a vendor SDK has no sound JS API — DataWedge, a patched AAR, QuickLook-style preview. I keep the module thin: native owns the SDK, JS owns product UX. I don’t rewrite the app in Kotlin/Swift.

**Follow-up:** EasyPay / Wizer / MyCreditInfo one-liners? → EasyPay: native Android host and flavors. Wizer: iOS preview VC on main. MyCreditInfo: patch Android libraries rather than wait on a dead fork.

---

### Q9. Gradle vs CocoaPods — what breaks after `git pull`?

> Android: AGP/Gradle/Kotlin mismatch or a library needing a higher `compileSdk`. Fix with wrapper + Studio sync, not npm. iOS: someone changed the Podfile; I need `pod install` and the **workspace**. “Module not found” is Pods until proven otherwise.

**Follow-up:** RN upgrade only failed on iOS? → Xcode / Pods / Folly first, then the JS. [Upgrades](../react-native/12-upgrades-stability.md).

---

### Q10. `exported` and Android 12. Why did a release crash at install?

> Components with intent-filters must set `android:exported` explicitly when targeting 31+. A library merge can add a receiver you didn’t notice. I read the merged Manifest, not only `app/src/main`.

---

### Q11. Why did a patched Android library crash only on some phones?

> ABI: the AAR didn’t package `arm64-v8a`, or the `.so` isn’t 16KB-aligned for newer Pixels. Second: R8 stripped a class only in release. I check `jniLibs`, Play 16KB, and mapping.txt before I blame JS. That’s the MyCreditInfo shape.

**Follow-up:** Would you disable minify to ship? → No. Keep rules. Disabling R8 hides the next crash and bloats the AAB.

---

### Q12. Walk Wizer file preview as native iOS, not as “I used a library.”

> JS asks the module for a preview. Native copies the file into the sandbox, hops to the main queue, presents QuickLook (or PDFKit), dismisses, and reports back. I handle security-scoped URLs if it came from the picker, and I use weak self so the VC doesn’t leak. Simulator success is not device success.

**Follow-up:** Why not `react-native-pdf` only? → Product wanted system preview (share, markup, multi-type). Native UI is the point.

---

### Q13. DataWedge works in Zebra’s app, not ours.

> DataWedge profiles bind to **applicationId**. Flavors mean staging might not be in the profile. Our receiver action strings must match, registered while resumed, not an exported Manifest receiver every app can spoof. JS must subscribe on focus, not only on first mount.

---

### Q14. Tokens in AsyncStorage “just for a week.”

> No. AsyncStorage is a file. Fintech tokens go in Keychain/Keystore-backed storage. A week becomes production. Pair on the vault instead of blocking with no path ([RN 13](../react-native/13-security.md)).

**Follow-up:** Reinstall logged me in on iOS? → Keychain survived. Logout deletes items.

---

### Q15. Can we keep a payment WebSocket in the background?

> Not honestly. Android will Doze/kill; iOS will suspend. Enable a background mode only if we **use** it and can defend it in review. Otherwise: server is source of truth, FCM/APNs notifies, tap rehydrates and fetches by id.

---

### Q16. What is Context on Android and why do modules get it wrong?

> Application context is process-wide and cannot show dialogs. Activity context has a window and dies. RN’s ReactApplicationContext is application-scoped, so UI needs getCurrentActivity() and must tolerate null. Storing Activity statically leaks across rotation.

---

### Q17. SceneDelegate vs AppDelegate — why did a cold-start link drop?

> Newer templates deliver URLs on the **scene**. If we only implemented AppDelegate `openURL`, the event never reaches JS. I queue the URL until navigation is ready either way.

---

## Debugging prompts (talk through, don’t guess JS)

**“Play Console ANR cluster in `MainActivity.onResume`.”**  
Main-thread work on resume — maybe a native SDK, maybe `runOnUiThread` flood. Android Studio CPU + the ANR trace. Not a Redux selector.

**“CI failed at codesign.”**  
Profile expired, wrong team, capability not on App ID, `match` wrote certs on CI. Don’t “regenerate everything” on the runner.

**“Release APK crashes, debug doesn’t.”**  
R8. Compare mapping, add keep for the native/JS interface. Second: `BuildConfig` / flavor mix-up, wrong applicationId talking to the wrong API.

**“Simulator fine, device crash on file preview.”**  
Main thread, file URL permissions, QuickLook item, plist for the access class. Wizer-shaped.

**“Notifications work on Android 12 test phone, not on Android 14.”**  
`POST_NOTIFICATIONS` + targetSdk. Then channels.

**“UnsatisfiedLinkError after we patched an AAR.”**  
ABI folders + 16KB alignment + load before JS. [06](./06-debug-playbook.md).

**“Reinstall still authenticated on iPhone.”**  
Keychain not deleted on logout.

**“Share/camera capture crashes with FileUriExposedException.”**  
FileProvider.

Full playbooks: [06](./06-debug-playbook.md).

---

## STAR crumbs (keep short; full scripts in [RN 14](../react-native/14-behavioral-stories.md))

**DataWedge:** OEM broadcasts on Android → native module events → JS. Intent literacy, not a barcode npm package.

**Wizer preview:** Native iOS UI from a module; main queue; system preview APIs.

**MyCreditInfo patch:** Android library didn’t meet security/SDK needs; patched at Gradle/AAR layer; regression-test the native path after every RN bump.

**EasyPay Android:** Host project, flavors, store identity — `applicationId` is a product decision.

**Backup / vault:** Fintech default deny Auto Backup; tokens not in prefs; logout clears Keychain.

---

## Green flags / red flags

**Green:** Opens Studio/Xcode for native stacks. Names targetSdk behavior. Says usage strings crash. Signing trio without mixing it up with Fastlane lanes. Null Activity / main thread unprompted. FileProvider / QuickLook sandbox. 16KB + ABI. Don’t keep activities. Keychain-survives-delete.

**Red:** “Permissions are just a JS package.” “I’ll debug the Kotlin crash in Chrome.” “targetSdk is only for Play listing.” “I open the xcodeproj.” “Background JS timers keep the payment socket alive.” “Disable R8 to ship.” “AsyncStorage is fine if we minify.”

---

## Closed-notes drill

Record yourself:

1. 30-second host framing ([INDEX](./INDEX.md)).
2. Three SDK numbers.
3. Permission crash vs silent fail.
4. Signing trio + upload key.
5. One CV story that **requires** a native sentence.

Then fill the tables in [03](./03-android-vs-ios.md) from memory. Walk one incident from [06](./06-debug-playbook.md).
