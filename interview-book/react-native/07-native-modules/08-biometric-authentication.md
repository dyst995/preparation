# 08. Biometric authentication

> Source: `interview-prep/react-native/07-native-modules.md`

### Topics to learn
- [ ] Face ID / Touch ID on iOS, BiometricPrompt on Android
- [ ] Library-level abstraction (e.g. common cross-platform biometrics packages) vs custom native work
- [ ] Fallback flows: biometrics unavailable/failed ? PIN/password fallback
- [ ] Security framing: biometrics unlock locally stored credentials/tokens, they don't replace backend auth
- [ ] Secure storage pairing (Keychain on iOS, Keystore-backed storage on Android) alongside biometric gating

### Interview question

**Q: Walk me through how you implemented biometric authentication in EasyPay/MyCreditInfo.**

**Strong answer (tailor with real specifics):**
> "The pattern is: after a normal successful login, we store a securely-encrypted token or flag (backed by Keychain on iOS / Keystore-backed secure storage on Android) rather than the raw password. On subsequent app opens, we prompt Face ID/Touch ID or Android's BiometricPrompt; success unlocks the locally stored credential/token to resume the session, and failure or unavailability falls back to standard PIN/password login. It's important to frame biometrics correctly in an interview ? it's a *local* unlock mechanism gating access to a securely stored token, not a replacement for backend authentication or a way to biometrically 'log in' to the server directly. For a fintech app like EasyPay, we also had to think about what happens on biometric hardware changes (e.g. re-enrolled fingerprint) invalidating stored credentials, which typically forces a fresh login rather than silently failing."

---
