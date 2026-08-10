# 06. Handling every app state: foreground, background, killed

> Source: `interview-prep/react-native/08-push-firebase-device.md`

### Topics to learn
- [ ] `messaging().onMessage()` � foreground
- [ ] `messaging().setBackgroundMessageHandler()` � background/killed, registered at top level of `index.js`
- [ ] `messaging().onNotificationOpenedApp()` � app was backgrounded, user tapped notification, app resumes
- [ ] `messaging().getInitialNotification()` � app was **killed**, user tapped notification, app cold-starts
- [ ] Notifee equivalents: `onForegroundEvent`, `onBackgroundEvent`, `getInitialNotification`
- [ ] Why the killed-state path is the one teams forget and QA catches late

### The state matrix

| App state | FCM/Notifee entry point | Typical responsibility |
|---|---|---|
| Foreground | `onMessage` (FCM) / `onForegroundEvent` (Notifee) | Manually display the notification (Notifee), or update in-app UI/badges directly without a tray notification at all |
| Background (app alive, not visible) | `setBackgroundMessageHandler` (FCM) / `onBackgroundEvent` (Notifee) | Display notification via Notifee; can do limited async work (fetch small data) before OS suspends |
| Killed (app fully terminated) | OS handles initial display natively; on tap: `getInitialNotification()` (FCM) or Notifee's initial notification API | On app cold start, check for an initial notification and navigate once the navigator is ready |
| Tap while backgrounded | `onNotificationOpenedApp` | Navigate immediately since app + navigator are already alive |

### The classic bug: killed-state navigation race

`getInitialNotification()` resolves with data, but if you call it before your navigation container/ref is mounted and ready, the navigation call silently no-ops. The fix pattern:

1. Store the pending notification payload in a ref/state as soon as it's available.
2. Only attempt navigation once `onReady` (React Navigation) has fired on the `NavigationContainer`.
3. Clear the pending payload after successful navigation so it doesn't re-fire on a later re-render.

### Interview question

**Q: Your team says "opening the app from a notification works, but only sometimes on a fully-closed app." What's your hypothesis?**

> "That symptom screams a killed-state navigation race. My first hypothesis is that `getInitialNotification()` is resolving before the navigation container is ready, so the navigate call is silently dropped. I'd verify by logging both the notification payload arrival and the navigator's `onReady` timing, then fix it by holding the pending deep-link target in state and only firing navigation once the navigator reports ready � which is the same pattern I'd use for cold-start deep links in general, not just notifications."

---
