# Push notification → screen routing — Next-day repetition

## How to use

1. Do **not** open `notes.md` first. The full question bank is `self-test.md`; this file is the next-day subset.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] `type` + `entityId`. Four robust bullets. Spoken open-from-notification answer.
- [ ] Foreground receive ≠ tap. Killed = `getInitialNotification` + queue. Ready + hydrated before navigate.
- [ ] FCM = delivery; Notifee = foreground display/press. Dedupe `messageId`. Reuse deep-link validation.
- [ ] Don’t trust amount/DTO. Logout drops token. Unknown `type` → fallback.

## Predict / debug

- [ ] `onMessage` + Notifee `onPress` both navigate, no dedupe. Navigate before `onReady`, no queue. Payload amount submitted on mount.
- [ ] Logged-out killed tap, no queue. Warm-only `onNotificationOpenedApp` — cold fails. `onMessage` steals Confirm.
- [ ] Leaf `navigate('TransferDetails')` from HomeStack. FCM + Notifee initial both fire. Logout still opens Wallet from pushes.

## Say it out loud

- [ ] How do you open a specific screen from a notification? Follow-up: killed? Foreground? FCM vs Notifee?
- [ ] What goes in the payload? How is this the same as deep links?
- [ ] Recite: type + id, central wait, nested action, same validation as links.
