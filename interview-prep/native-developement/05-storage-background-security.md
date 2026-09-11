# 05 — Storage, background, and host security

> Goal: Talk about **where bytes live**, **what runs after the user leaves**, and **OS security knobs** (ATS / networkSecurityConfig, backup, biometrics APIs, URI sharing) without rewriting [RN 13](../react-native/13-security.md) or [RN 08](../react-native/08-push-firebase-device.md).

This chapter is the **host**. Pinning, obfuscation, and bridge-surface design stay in RN security.

Mark progress with `[x]`.

---

## Learning objectives

1. Contrast sandbox files, UserDefaults/SharedPreferences, and Keychain/Keystore.
2. Explain backup / reinstall surprises (especially Keychain surviving delete).
3. Reject “background JS forever”; name the real tools (FCM/APNs, WorkManager, BG tasks).
4. Name native biometric APIs and what they **do not** prove to the server.
5. Share files via **FileProvider / security-scoped URLs**, not `file://`.
6. Apply least-privilege permissions and fintech-shaped backup/cleartext defaults.

---

## 1. Where state actually lives

| Place | Survives process death | Survives uninstall | Encrypted by OS | Use for |
|---|---|---|---|---|
| JS memory / Zustand | No | No | N/A | Session UI |
| RN AsyncStorage | Yes | No | **No** | Theme, flags |
| SharedPreferences / UserDefaults | Yes | No (usually) | No | Same |
| App sandbox files | Yes | No | Disk encryption at rest (device) | Caches, Wizer copies |
| EncryptedSharedPreferences | Yes | No | Yes (Keystore-wrapped) | Tokens on Android |
| **Keychain / Keystore** | Yes | **Maybe** (iOS Keychain) | Yes | Tokens, secrets |

**Interview cut:** AsyncStorage is a **file**. Keychain is a **vault**. Don’t mix them.

iOS Keychain items can remain after delete if accessibility / iCloud Keychain / access group says so. **Logout must delete the item.** Reinstall-as-logout is a false test.

More mechanism: [RN 13](../react-native/13-security.md).

```kotlin
// Android — not interview-perfect crypto, the *idea*
val prefs = EncryptedSharedPreferences.create(
  context, "secure", masterKey,
  PrefKeyEncryptionScheme.AES256_SIV,
  PrefValueEncryptionScheme.AES256_GCM
)
```

```swift
// iOS — Keychain is an API, not a plist you grep
let query: [String: Any] = [
  kSecClass as String: kSecClassGenericPassword,
  kSecAttrAccount as String: "refresh",
]
SecItemDelete(query as CFDictionary) // logout
```

### How to say it

> Tokens go in Keychain or Keystore-backed storage, read once into memory for the session. Caches and file previews go in the sandbox and we delete on logout if they contain PII. I never treat AsyncStorage as confidential.

---

## 2. Backup and device transfer

### Topics to learn
- [ ] Android Auto Backup (`allowBackup`) — SharedPreferences and files can leave the device
- [ ] `backup_rules.xml` / `dataExtractionRules` to **exclude** token files
- [ ] Fintech default: **disable** backup or exclude everything sensitive
- [ ] iOS iCloud / unencrypted computer backups may include app container files; Keychain has its own rules
- [ ] USB debugging + backup extraction is a **real** threat model on a stolen unlocked laptop + phone backup

EasyPay/Wizer: assume a support laptop should **not** be able to open `refresh_token` from a backup.

### Interview answer

> I treat backup as an exfil path. Android: allowBackup false or explicit exclude. iOS: don’t put secrets in documents; put them in Keychain and delete on logout.

---

## 3. Transport: ATS and networkSecurityConfig

| | iOS ATS | Android NSC |
|---|---|---|
| Default (modern) | HTTPS only | Cleartext blocked |
| Exception location | Info.plist `NSExceptionDomains` | `res/xml/network_security_config.xml` |
| Debug HTTP | Rarely; use a **debug** plist/source set | `src/debug` overlay |
| Fintech release | **No** `NSAllowsArbitraryLoads` | **No** cleartext true |
| User certs / proxies | ATS still applies; pinning is extra ([RN 13](../react-native/13-security.md)) | Debug trust user CAs only in debug config |

Charles/Proxyman “doesn’t see traffic” is often **expected** (pinning or no user CA in release), not a broken app.

---

## 4. Background: what you may claim

### Topics to learn
- [ ] Foreground: you run. Background: **budgeted**. Killed: **nothing**
- [ ] Android: Doze, app standby, **FGS types**, WorkManager for deferrable work, FCM high-priority for “user must see it”
- [ ] iOS: declared **background modes**, BGTaskScheduler, silent push **best-effort**
- [ ] RN `AppState` tells JS you **left** — it does not grant CPU
- [ ] Headless JS on Android exists; it is **not** a payment-socket strategy

| Need | Honest tool |
|---|---|
| New transfer while app is dead | Push → tap → cold start → fetch by id |
| Sync later | WorkManager / BG processing |
| Scan while warehouse app focused | Foreground receiver (DataWedge) |
| Music / nav | Real background modes you **use** |

### How to say it

> I don’t keep a JS interval alive for money movement. If the user backgrounds the app, the server is source of truth and we notify with push. Native background APIs are declared, reviewable, and easy to lie about — I only enable modes we exercise.

---

## 5. Biometrics (device-local)

### Topics to learn
- [ ] Android: `BiometricPrompt` (not deprecated FingerprintManager)
- [ ] iOS: `LocalAuthentication` / `LAContext` (Face ID usage string)
- [ ] Success means **this device unlocked a key or confirmed presence** — not “the bank knows it’s Nika”
- [ ] Server still has tokens / step-up; biometric is a **local gate**
- [ ] Must run on a **resumed Activity** / main-thread VC
- [ ] Fallback: device passcode; denial: don’t lock the user out of **read-only** balances without a story

Tie to [RN 07](../react-native/07-native-modules.md) / [09 fintech](../react-native/09-forms-ux-fintech.md).

### Interview answer

> Biometrics gate a Keychain/Keystore item or a local prompt before a sensitive screen. I still refresh tokens and re-auth with the backend when the session policy says so. I never send a ‘face id boolean’ to the API as proof.

---

## 6. Sharing files and URIs

| Job | Android | iOS |
|---|---|---|
| Give camera an output path | `FileProvider` `content://` + grant | `UIImagePicker` / PHPicker; no raw path games |
| Preview a statement PDF | Copy to cache, optional native viewer | Copy to tmp, **QuickLook** on main (Wizer) |
| Share sheet | `ACTION_SEND` + content URI | `UIActivityViewController` |
| User-picked iCloud file | — | Security-scoped URL; `startAccessing…` |

`file://` across apps is the 2010s. Interviewers listen for **content URI / sandbox copy**.

---

## 7. Permissions, privacy forms, and leftover grants

### Topics to learn
- [ ] Least privilege: if we drop QR camera, **remove** Manifest/plist keys the same PR
- [ ] Play Data safety / Apple privacy nutrition must **match** what the binary does
- [ ] Privacy Manifest required-reason APIs (UserDefaults, file timestamp, etc.) — Apple reject class
- [ ] Don’t request location for a feature that only needs coarse “country”
- [ ] Microphone unused but still in Manifest → review question + user distrust

### Interview answer

> Permissions are product surface. I audit Manifest and plist when a feature dies. Stores already ask me to describe data collection — lying there is worse than a crash.

---

## Common mistakes

- Tokens in AsyncStorage “until we add Keychain.”
- `allowBackup=true` with prefs that hold a JWT.
- ATS exception copied from a blog into EasyPay.
- Background WebSocket for payments.
- Treating biometric success as server identity.
- Passing a remote URL into QuickLook.
- Exported FileProvider (`exported=true`).

---

## CV tie-back

**EasyPay / Wizer / MyCreditInfo:** fintech — vault storage, no cleartext, no joke backup. **Wizer:** sandbox copy + native preview. **Clean House:** foreground hardware, not a background scan daemon. **MyCreditInfo:** patched libs can also mean **crypto/TLS** inside an AAR — still a host artifact you ship.

---

## Senior-Level Best Practices

### Decision framework
| Data | Store |
|---|---|
| Refresh token, PIN-adjacent secrets | Keychain / Keystore-backed |
| Account list cache | Encrypted or short TTL sandbox; wipe on logout |
| Theme, onboarding | AsyncStorage / prefs |
| PDF for preview | Temp sandbox; delete after dismiss |

### Ship checklist
- [ ] Logout deletes vault items **and** sandbox PII
- [ ] Backup rules reviewed
- [ ] Release ATS/NSC has no HTTP
- [ ] Biometric + session policy written down (local vs step-up)
- [ ] File sharing via FileProvider / security scope
- [ ] Unused permissions gone

### Anti-patterns / failures
| Symptom | Cause |
|---|---|
| Reinstall still logged in on iOS | Keychain not cleared |
| Charles sees prod HTTP | Accidental cleartext exception |
| Play “data shared” mismatch | Backup + prefs + SDK telemetry |
| Preview white screen | File not in sandbox / off-main |

### Senior follow-ups
1. **Why not encrypt AsyncStorage yourself?** → You will mis-handle keys. Use the OS vault or a maintained Keystore wrapper.
2. **Can WorkManager replace push for “payment completed”?** → No. Deferrable ≠ user-visible realtime. Push (or polling while foreground).
3. **FileProvider exported true “so share works”?** → Grant URI permissions per intent instead. Exported provider is a read-any-file bug.

---

## Mastery checklist

- [ ] I can table memory vs disk vs vault vs Keychain-survives-delete.
- [ ] I can explain backup as an attack path.
- [ ] I can refuse background-JS payment sockets and name the alternative.
- [ ] I can say what biometric success is **not**.
- [ ] I can describe Wizer preview as a sandbox file + main-thread VC.
