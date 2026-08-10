# 01. The push notification pipeline end-to-end

> Source: `interview-prep/react-native/08-push-firebase-device.md`

### Topics to learn
- [ ] Actors involved: your backend, FCM, APNs (iOS under the hood), the OS notification tray, and your app
- [ ] Push token lifecycle: generation, refresh, registration with backend
- [ ] Data messages vs notification messages
- [ ] Why iOS pushes technically flow through APNs even when you "use FCM"
- [ ] Silent/background data-only pushes vs user-visible notifications

### Mental model

```
[Your backend]
     |  (1) sends payload to
     v
[Firebase Cloud Messaging (FCM)]
     |                       \
     | (Android: direct)      \ (iOS: FCM forwards to APNs)
     v                         v
[Google Play Services /        [Apple Push Notification
 FCM SDK on device]              service (APNs)]
     |                         |
     v                         v
        [Your RN app's native FCM/Notifee layer]
                     |
                     v
        [JS side: onMessage / background handler]
                     |
                     v
        [Notifee displays / updates the notification]
                     |
                     v
        [User taps] -> [onNotificationOpenedApp / getInitialNotification]
                     |
                     v
        [Navigation ref pushes the right screen]
```

Key point for interviews: **FCM is the transport/delivery layer**; it does not give you rich, styled, or channel-based local notification UI out of the box on its own � that's why teams pair it with **Notifee** (or `notifee` replaced the older `react-native-push-notification` in most modern stacks) for presentation, actions, and channel management.

### Push token lifecycle

1. App requests permission (iOS explicit prompt; Android 13+ explicit runtime permission; Android ?12 implicit).
2. FCM SDK generates a device/registration token.
3. App sends that token to your backend and associates it with the logged-in user (and ideally device id, platform, app version).
4. Token can rotate (app reinstall, data clear, token refresh events) � you must listen for refresh and re-sync it, or the user silently stops receiving pushes.
5. On logout, you should **unregister/dissociate the token** from that user server-side (and optionally delete the FCM instance token) so a shared device doesn't leak notifications to the wrong account.

### Interview question

**Q: Walk me through what happens between your backend sending a push and the user seeing it.**

**Strong answer:**
> "The backend sends a message to FCM with the device's registration token and a payload. On Android, FCM delivers directly to Google Play Services on the device. On iOS, FCM actually forwards the message to APNs, which delivers it to the device � Firebase is a convenience layer on top of APNs, not a replacement for it. Once on-device, our RN app's native FCM handlers receive it. If it's a data-only message, our JS background/foreground handlers decide what to do � often calling Notifee to display a styled local notification with the correct Android channel. If it's a notification-type message and the app is backgrounded/killed, the OS shows it directly from the system tray using default styling, which is why we prefer data-only messages when we need full control over presentation."

**Follow-up:** Why prefer data-only (data) messages over notification messages in a fintech app?
> Because notification-type messages are displayed by the OS automatically when the app isn't foregrounded, bypassing your custom Notifee channel, icon, sound, grouping, and action buttons. Data-only messages always route through your JS handler, so you get consistent presentation and can attach navigation payloads reliably.

---
