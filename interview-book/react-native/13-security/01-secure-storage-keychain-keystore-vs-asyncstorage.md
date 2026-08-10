# 01. Secure storage: Keychain/Keystore vs AsyncStorage

> Source: `interview-prep/react-native/13-security.md`

### Topics to learn
- [ ] What AsyncStorage actually is (unencrypted, plain key-value on disk)
- [ ] iOS Keychain: hardware-backed encryption, access control classes
- [ ] Android Keystore: hardware-backed key storage, EncryptedSharedPreferences layered on top
- [ ] What belongs in secure storage vs regular storage
- [ ] Biometric-gated secure storage access
- [ ] Migration risk (moving existing AsyncStorage secrets to secure storage)

### Why AsyncStorage is unsafe for sensitive data

AsyncStorage persists data as **plain, unencrypted files** on the device (SQLite on Android historically, plist-backed on iOS). Anyone with:
- physical device access + basic tooling on a rooted/jailbroken device, or
- a backup extraction tool, or
- filesystem access via a compromised app on an insecure device

...can read AsyncStorage contents directly. It was never designed as a security boundary - it's a convenience cache for non-sensitive UI state (theme preference, onboarding-seen flags, non-sensitive cached data).

### Keychain (iOS) / Keystore (Android) comparison

| Aspect | AsyncStorage | iOS Keychain | Android Keystore |
|---|---|---|---|
| Encryption at rest | None | OS-managed, hardware-backed on modern devices | Hardware-backed key storage; typically paired with EncryptedSharedPreferences/Jetpack Security for values |
| Access control | None | Access control classes (e.g. only when unlocked, biometric-required) | Key-level access control, can require biometric/lock-screen auth to use the key |
| Survives app deletion | N/A (deleted with app) | Can persist across reinstall depending on config (an important nuance to know) | Deleted with app data by default |
| Appropriate for | UI prefs, non-sensitive cache | Auth tokens, refresh tokens, biometric keys | Auth tokens, refresh tokens, biometric keys |
| Common RN library | `@react-native-async-storage/async-storage` | `react-native-keychain` or similar | `react-native-keychain` (uses Keystore-backed encryption underneath) |

### Interview question

**Q: Why is AsyncStorage unsafe for tokens?**

> "AsyncStorage is unencrypted plain storage on disk - it was designed for convenience, not as a security boundary. On a rooted or jailbroken device, or via a backup extraction tool, that data is trivially readable. For anything sensitive - auth tokens, refresh tokens, PII - I use the platform secure storage: iOS Keychain or Android Keystore-backed encrypted storage, both of which are hardware-backed on modern devices and support access control like requiring the device to be unlocked or biometrics to actually use the stored value. In a fintech app this isn't optional - it's table stakes."

**Follow-up: what about performance - Keychain/Keystore access is slower, does that matter?**
> Yes, slightly - it's not meant for high-frequency reads. Practical pattern: read the token once into memory at app start/auth, keep it in memory for the session, and only touch secure storage on write or explicit refresh, not on every request.

### Green flags
- Knows AsyncStorage is a cache, not a vault, and can explain *why* mechanically.
- Knows Keychain items can survive app deletion depending on configuration - a real gotcha for logout/reinstall testing.
- Has an actual in-memory caching strategy instead of hitting secure storage on every request.

---
