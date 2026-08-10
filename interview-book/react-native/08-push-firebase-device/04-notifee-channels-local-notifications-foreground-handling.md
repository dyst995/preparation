# 04. Notifee  channels, local notifications, foreground handling

> Source: `interview-prep/react-native/08-push-firebase-device.md`

### Topics to learn
- [ ] What Notifee is for vs what FCM is for (presentation vs delivery)
- [ ] Displaying a notification from a foreground FCM message
- [ ] Android channels API (`createChannel`, `createChannelGroup`)
- [ ] iOS categories and actions
- [ ] Foreground event listeners (`onForegroundEvent`) vs background events (`onBackgroundEvent`, registered outside component tree)
- [ ] Action buttons, quick reply, images/big-picture style
- [ ] Badge counts
- [ ] Scheduling local/triggered notifications (time-based triggers) � useful for reminders unrelated to push (e.g. "loan payment due")

### Why pair Notifee with FCM at all

FCM's job stops at *delivering a payload to the device*. It does not give you:
- Consistent notification styling when the app is foregrounded (by default, nothing shows automatically while the app is open)
- Rich media (big picture / big text styles)
- Action buttons
- Fine-grained channel management APIs from JS
- Local/scheduled notifications independent of any server push

Notifee fills exactly that gap: **it's a full local-notification and channel-management library**, and it plays nicely with FCM by letting you call `notifee.displayNotification(...)` right from your `onMessage` / background handler.

### Foreground handling (the classic gotcha)

By default, if the app is in the **foreground**, a plain FCM "notification" payload does **not** show a system tray notification on either platform � you have to explicitly display it yourself. This is one of the most common early bugs teams hit:

> "It worked when the app was backgrounded, but nothing shows when the app is open!"

The fix is standard: listen to `messaging().onMessage(...)`, and inside it call `notifee.displayNotification(...)` manually so foreground pushes are visible, styled, and channel-correct just like background ones.

### Interview question

**Q: What's the difference between FCM and Notifee, and why use both?**

> "FCM is the delivery/transport mechanism � it gets a payload from my backend onto the device across platforms. Notifee is a local notification and channel-management library that controls how that payload is actually presented � styling, channels, action buttons, foreground display, badge counts, and even fully local/scheduled notifications with no server round-trip. I use FCM to get data to the device reliably, and Notifee to render it consistently across every app state, especially foreground, where neither platform shows anything automatically for a raw FCM payload."

**Q: How did you use Notifee at Wizer / EasyPay specifically?**

> "At Wizer, I used FCM plus Notifee for delivery status and account notifications � Notifee handled channel setup so payment-related alerts were high-importance while general updates were lower-importance, and it displayed styled foreground notifications since FCM alone wouldn't render anything while the app was open. At EasyPay, push notifications combined with Notifee were used for transaction and security alerts feeding into deep links that opened the exact transaction or screen."

---
