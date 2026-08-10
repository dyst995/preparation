# 14. Hands-on drills (do these)

> Source: `interview-prep/react-native/08-push-firebase-device.md`

- [ ] Draw the full push pipeline (backend ? FCM ? APNs (iOS) ? device ? Notifee ? nav) on paper from memory.
- [ ] Implement a background FCM handler that calls `notifee.displayNotification` with a custom channel.
- [ ] Deliberately kill the app, tap a notification from a cold start, and trace the exact code path that navigates to the target screen.
- [ ] Write the central `routeFromNotification` function and reuse it for both notification taps and a real deep link URL.
- [ ] Record a fake non-fatal error with `crashlytics().recordError()` plus two breadcrumb logs, and find it in a fake/local Crashlytics-style setup or at least explain exactly what you'd see in the dashboard.
- [ ] Store a fake token in `react-native-keychain` gated by biometric access control, and read it back only after a biometric prompt.
- [ ] Set up a custom URL scheme deep link locally and open it via `adb shell am start` (Android) or `xcrun simctl openurl` (iOS simulator).
- [ ] Explain out loud, in under 3 minutes and without notes, all three of your crash-rate reduction stories with numbers.

---
