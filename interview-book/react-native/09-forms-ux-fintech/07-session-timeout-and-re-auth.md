# 07. Session timeout and re-auth

> Source: `interview-prep/react-native/09-forms-ux-fintech.md`

### Topics to learn
- [ ] Inactivity-based timeout vs fixed-duration token expiry
- [ ] `AppState`-driven background timer (see file 08) combined with an in-foreground inactivity timer (touch/gesture activity resets it)
- [ ] Step-up authentication: low-risk actions need nothing extra; high-risk actions (large transfer, adding a new payee) require a fresh biometric/PIN check even mid-session
- [ ] Silent token refresh vs forcing full re-login
- [ ] Graceful UX: warn before forced logout (e.g. "You'll be logged out in 30 seconds") vs abrupt logout

### Interview question

**Q: How do you design an auth flow with biometrics, PIN, and password fallback?**

> "Password/credentials establish the initial session and issue tokens. After that, biometrics become the fast-path re-entry method, gated by secure storage as covered in file 08 � successful biometric auth unlocks the stored refresh token silently. PIN is typically the fallback when biometrics fail or aren't enrolled, since it doesn't require server round-trips to verify quickly and works when Face ID/fingerprint is unavailable. For sensitive step-up actions � say, a transfer above a threshold, or adding a new payee � I require a fresh biometric or PIN check even within an already-authenticated session, independent of the general session timeout, since a stolen unlocked phone shouldn't grant unlimited financial actions."

---
