# 16. Tie-backs to your experience (use in answers)

> Source: `interview-prep/react-native/08-push-firebase-device.md`

- **EasyPay**: push notifications + Notifee for transaction/security alerts, deep links into specific screens, biometric-gated secure storage for auth � you built this from the ground up, so you own every architectural decision here.
- **Wizer**: FCM + Notifee integration for account/payment notifications, layered on top of a Flitt payments integration where notification-driven status updates matter for UX; crash rate reduced ~15% ? ~0.09%, partly via better production debugging discipline.
- **Clean House**: WebSockets **and** FCM together for real-time delivery updates � a great story for "when do you use WebSockets vs push notifications" (WebSockets for while-app-is-open live updates; FCM for reaching the user when the app isn't in the foreground/killed).
- **MyCreditInfo**: Crashlytics-driven crash rate reduction from ~20% to ~0.03%, plus biometric authentication feature � ties storage security directly to a feature you shipped.
- **Online School**: Crashlytics-driven crash rate reduction from ~28% to ~0.15% under a tight deadline � good STAR story combining stability work with delivery pressure.

---
