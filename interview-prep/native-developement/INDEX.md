# Native development (Android + iOS)

> Goal: Speak about **the host OS and native project** — Gradle/Xcode, lifecycle, permissions, threading, signing, storage/backup, and debugging — at a level a senior RN/fullstack interviewer expects, without pretending you are a full-time platform specialist.

This track is **platform literacy**. React Native still ships **two native apps**. [RN native modules](../react-native/07-native-modules.md), [legacy modules](../react-native/16-native-modules.md), [Turbo Modules](../react-native/17-turbo-modules.md), [CI signing](../react-native/11-cicd-releases.md), [flavors](../react-native/20.%20flavors-config/notes.md), and [RN security](../react-native/13-security.md) assume you can open Android Studio / Xcode and not get lost.

**Not this track:** Bridge serialization, Codegen specs, DataWedge event *design* — those stay in the RN chapters. **This track:** what those modules **run inside**, plus the OS rules that make cameras crash, AARs fail on 16KB devices, and Keychain outlive uninstall.

CV hooks: EasyPay **native Android**, Wizer **iOS file preview**, MyCreditInfo **patched Android libraries**, Clean House **DataWedge**.

---

## Files

| File | What |
|---|---|
| [01-android.md](./01-android.md) | Gradle, Manifest, Activity, Context, components, ANR, ABI / 16KB, R8 |
| [02-ios.md](./02-ios.md) | Xcode, plist/entitlements, VC lifecycle, CocoaPods, signing, QuickLook, jetsam |
| [03-android-vs-ios.md](./03-android-vs-ios.md) | Side-by-side tables (the interview gold) |
| [04-interview-questions.md](./04-interview-questions.md) | Spoken Q&A + follow-ups |
| [05-storage-background-security.md](./05-storage-background-security.md) | Vault vs disk, backup, ATS/NSC, background truth, biometrics, FileProvider |
| [06-debug-playbook.md](./06-debug-playbook.md) | 30s triage + incident scripts (ANR, AAR, preview, DataWedge, codesign) |

---

## How to study

1. Android chapter out loud (Gradle + lifecycle + Context + 16KB).
2. iOS chapter out loud (plist + signing trio + main thread + QuickLook).
3. Storage/background chapter — vault, backup, no payment sockets in BG.
4. Comparison tables until you can fill them from memory.
5. Debug playbook — one incident with notes closed.
6. Q&A file with notes closed.

You do **not** need to live-code a full Activity or UIViewController in a RN interview. You **do** need to: open the right file, name the crash class, and know **main thread / permission / signing / SDK version / ABI / vault** as first hypotheses.

---

## Spoken 30-second framing

> I treat RN as two native hosts. Android is Gradle + Manifest + Activity lifecycle + runtime permissions; iOS is Xcode + Info.plist + AppDelegate/scene + usage strings and code signing. UI work and most SDK prompts belong on the main thread. Tokens go in Keychain/Keystore, not AsyncStorage. I keep native surface small, but I can read Kotlin/Swift well enough to register a module, fix a permission crash, patch an AAR without shipping the wrong ABI, and not ship the wrong applicationId or bundle ID.

---

## Spoken 60-second extra (if they lean in)

> On Android I distinguish Application vs Activity context, I read the merged Manifest for exported receivers, and I treat 16KB page size and R8 as release-host bugs. On iOS I open the workspace, I don’t trust the simulator for camera or push, and file preview is a sandbox URL presented on main — that’s the Wizer work. DataWedge is a foreground broadcast bound to applicationId, not a JS barcode widget. If the stack is Kotlin or a usage-string SIGABRT, I don’t debug it in Chrome.
