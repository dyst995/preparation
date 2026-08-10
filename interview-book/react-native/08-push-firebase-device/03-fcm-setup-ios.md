# 03. FCM setup  iOS

> Source: `interview-prep/react-native/08-push-firebase-device.md`

### Topics to learn
- [ ] APNs auth key vs certificate-based setup (auth key is preferred/modern)
- [ ] Push Notifications capability + Background Modes (remote notifications) in Xcode
- [ ] `GoogleService-Info.plist`
- [ ] Requesting permission via `messaging().requestPermission()` and mapping the authorization status
- [ ] APNs token vs FCM token relationship
- [ ] Silent/background push limitations on iOS (throttled by the OS, not guaranteed timely)

### Key setup pieces

| Piece | Purpose |
|---|---|
| APNs Auth Key (`.p8`) uploaded to Firebase | Lets Firebase relay pushes to APNs on your app's behalf |
| `GoogleService-Info.plist` | Ties the iOS app target to the Firebase project |
| Xcode capability: Push Notifications | Enables the entitlement required to receive pushes |
| Xcode capability: Background Modes ? Remote notifications | Allows background data messages to wake the app briefly |
| `requestPermission()` | Triggers the native iOS prompt; must be called explicitly � iOS never asks implicitly like older Android did |

### Authorization status handling

iOS permission isn't boolean � it can be `authorized`, `provisional` (quiet notifications, no prompt), `denied`, or `notDetermined`. A senior answer distinguishes these and explains **provisional authorization** as a way to start sending quiet, non-intrusive notifications before asking for full permission, which can improve opt-in rates when the user later sees value and upgrades.

### Interview question

**Q: Why do iOS push notifications require more moving pieces than Android?**

> "iOS push always ultimately routes through Apple's APNs, so even 'using FCM' on iOS means Firebase is forwarding to APNs using an auth key I uploaded. I need the Push Notifications and Background Modes capabilities enabled in Xcode, a proper provisioning profile, and to explicitly call `requestPermission()` since iOS never grants notification permission implicitly. I also handle the different authorization states � including provisional � rather than treating permission as a simple boolean."

---
