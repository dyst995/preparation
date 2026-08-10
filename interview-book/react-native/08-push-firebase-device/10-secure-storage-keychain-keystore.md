# 10. Secure storage: Keychain / Keystore

> Source: `interview-prep/react-native/08-push-firebase-device.md`

### Topics to learn
- [ ] Why `AsyncStorage` is unencrypted, plaintext-on-disk key-value storage � never for tokens/secrets
- [ ] iOS Keychain: hardware-backed encryption, access control levels (e.g. only-when-unlocked, biometry-required)
- [ ] Android Keystore: hardware-backed key storage; libraries like `react-native-keychain` wrap platform-specific secure storage uniformly
- [ ] What belongs in secure storage: refresh tokens, biometric-gated secrets, PINs (hashed, never plaintext)
- [ ] What does NOT need secure storage: non-sensitive UI preferences, feature flags, cached non-sensitive data
- [ ] Access-control tying: requiring biometric prompt to *read* the secret, not just to unlock the app UI

### Comparison table

| Storage | Encrypted at rest | Appropriate for |
|---|---|---|
| `AsyncStorage` | No (plain key-value, readable if device is compromised/rooted) | Non-sensitive prefs, cache, feature flags |
| iOS Keychain | Yes (hardware-backed, OS-managed) | Tokens, biometric-gated secrets |
| Android Keystore (via `react-native-keychain` etc.) | Yes (hardware-backed on supported devices) | Tokens, biometric-gated secrets |
| In-memory only (JS variable / Zustand, not persisted) | N/A, but gone on app restart | Short-lived access tokens if you accept re-fetch on cold start |

### Interview question

**Q: Where should you store a refresh token in a React Native fintech app, and why not `AsyncStorage`?**

> "`AsyncStorage` is unencrypted plaintext on disk � on a rooted or compromised device it's trivially readable. Refresh tokens should go into the platform's secure storage: Keychain on iOS, Keystore-backed storage on Android, typically via a library like `react-native-keychain` that abstracts both. I'd also tie access to biometric authentication where the sensitivity warrants it, so reading the token itself requires a biometric prompt, not just having the app open."

**Q: How do biometrics and secure storage work together for login?**

> "Biometric authentication (Face ID / fingerprint via the OS-level biometric API) acts as the gate to unlock access to a secret stored in Keychain/Keystore � it's not just a UI checkbox. On successful login, I store a refresh token (or a biometric-unlock flag plus an encrypted token) in secure storage with an access-control policy requiring biometric authentication to retrieve it. On subsequent app opens, the user authenticates with biometrics, which unlocks the secure read, and I use that token to silently refresh the session instead of asking for a password again."

---
