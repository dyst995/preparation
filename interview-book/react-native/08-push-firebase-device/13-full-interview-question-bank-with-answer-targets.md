# 13. Full interview question bank (with answer targets)

> Source: `interview-prep/react-native/08-push-firebase-device.md`

### FCM & delivery
1. **Walk through the push pipeline from backend to device.** ? backend ? FCM ? (APNs on iOS) ? device ? app handlers ? Notifee display.
2. **Data messages vs notification messages � why prefer data-only?** ? full control over presentation via your own handler + Notifee.
3. **How does the push token lifecycle work, and what happens on logout?** ? generate, sync to backend, refresh, dissociate on logout.
4. **What OEM-specific issues have you hit with push delivery?** ? MIUI autostart/battery optimization, Huawei GMS absence.

### Notifee & presentation
5. **What's the difference between FCM and Notifee?** ? transport vs presentation/local scheduling.
6. **Why do foreground notifications need manual handling?** ? neither platform auto-displays a raw FCM payload while the app is open.
7. **What are Android notification channels and why can't you change them silently later?** ? user-controlled importance/sound once created.

### App-state handling
8. **How do you handle notifications in foreground / background / killed states?** ? `onMessage` / `setBackgroundMessageHandler` / `getInitialNotification`.
9. **Why does "open from killed app" sometimes silently fail?** ? navigation-container-not-ready race.
10. **How do you route a tapped notification to the correct screen?** ? shared payload contract + central routing function + auth gating.

### Crashlytics & stability
11. **How do you triage crashes systematically?** ? classify ? prioritize by impact ? reproduce ? root-cause ? fix + guard ? verify ? staged rollout.
12. **Walk me through your MyCreditInfo / Wizer / Online School crash-rate reduction.** ? have all three numbers ready.
13. **JS exception vs native crash � how do you tell from the stack?**
14. **What's crash-free users, and why prefer it over raw crash count?**

### Security & storage
15. **Why is `AsyncStorage` unsafe for tokens?** ? unencrypted plaintext on disk.
16. **How do biometrics integrate with secure storage?** ? biometric gate on secure-storage read, not just app-open.
17. **What's the difference between Keychain and Keystore conceptually?** ? both are hardware-backed secure secret stores, per-platform.

### Background & lifecycle
18. **How do you implement a background-based session timeout?** ? `AppState` + timestamp comparison on resume, not a background timer.
19. **Why can't you rely on JS timers while backgrounded?** ? OS suspends JS execution; use OS scheduling APIs or timestamp diffing instead.

### Deep/universal links
20. **Custom scheme vs Universal/App Link � which for a fintech auth callback, and why?** ? Universal/App Link, domain-verified, not spoofable.
21. **How do you validate a deep link before navigating?** ? whitelist route shapes, validate params, require re-auth for sensitive targets.

---
