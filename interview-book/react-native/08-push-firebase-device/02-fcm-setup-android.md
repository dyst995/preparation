# 02. FCM setup  Android

> Source: `interview-prep/react-native/08-push-firebase-device.md`

### Topics to learn
- [ ] `google-services.json` and the Gradle plugin
- [ ] Manifest permissions and default notification channel/icon meta-data
- [ ] Notification channels (mandatory on Android 8+/API 26+)
- [ ] `POST_NOTIFICATIONS` runtime permission (Android 13 / API 33+)
- [ ] Background message handler registration (`setBackgroundMessageHandler`, must be set outside of any component, at the top level of `index.js`)
- [ ] Foreground service considerations for high-priority/ongoing notifications (e.g. VoIP-style, high-priority delivery-updates)

### Key setup pieces (conceptual, config-level)

| Piece | Purpose |
|---|---|
| `google-services.json` | Ties the Android app to the Firebase project; consumed by the Google Services Gradle plugin |
| Google Services Gradle plugin | Injects Firebase config into the build, wires FCM |
| Default notification channel meta-data in `AndroidManifest.xml` | Defines fallback channel/icon/color when a payload doesn't specify one |
| `POST_NOTIFICATIONS` permission | Required at runtime on Android 13+, or notifications silently never show |
| `messaging().setBackgroundMessageHandler(...)` in `index.js` (top-level, before `AppRegistry.registerComponent`) | Handles data messages when app is backgrounded/killed � this is where you'd call Notifee to display something |

### Notification channels (Android 8+)

Channels group notifications by category (e.g. "Payments", "Promotions", "Chat") and let the **user** control importance/sound/vibration per category from system settings � you cannot override a user's channel-level choice once the channel is created with certain settings, only create new channels.

```ts
await notifee.createChannel({
  id: 'payments',
  name: 'Payment Alerts',
  importance: AndroidImportance.HIGH,
  sound: 'default',
});
```

Design implication: **decide your channel taxonomy up front** (e.g. Payments, Security, Marketing, Chat/Delivery updates for Clean House) because users get annoyed by too many, and changing importance later requires the user to manually update settings � apps can't silently escalate importance of an existing channel.

### Interview question

**Q: Why do notification channels matter on Android, and what happens if you don't define one?**

> "Since Android 8, every notification must belong to a channel, and channel settings (sound, vibration, importance) are user-controlled once created � my app can't silently override them later. If I don't explicitly create/target a channel, the notification either falls back to a default channel with generic behavior or, on some OEM skins, may not show consistently. So I define a small, deliberate set of channels � e.g. Payments (high importance), Security alerts, and general/marketing (lower importance) � so users can tune notification behavior without missing critical payment alerts."

---
