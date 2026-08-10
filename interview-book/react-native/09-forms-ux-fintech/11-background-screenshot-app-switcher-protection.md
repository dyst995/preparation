# 11. Background screenshot / app-switcher protection

> Source: `interview-prep/react-native/09-forms-ux-fintech.md`

### Topics to learn
- [ ] Android: `FLAG_SECURE` window flag blocks both screenshots/screen recording and hides content in the recent-apps thumbnail
- [ ] iOS: no equivalent flag to block screenshots (Apple doesn't allow apps to prevent OS-level screenshots), but you can react to the app entering background/inactive by rendering a blur/cover overlay so the app-switcher snapshot doesn't expose sensitive content
- [ ] Detecting screenshot events on iOS (`UIApplicationUserDidTakeScreenshotNotification` equivalent) to react after the fact, since you can't block it
- [ ] Why this matters specifically for fintech: balances, account numbers, and transaction details showing up in the OS task switcher or in an accidentally-shared screenshot
- [ ] Scoping protection to sensitive screens only (balance, transfer, card details) rather than the whole app, to avoid hurting normal UX (e.g. support screenshots for bug reports on non-sensitive screens)

### Platform comparison

| Platform | Can you block screenshots? | Can you hide app-switcher thumbnail? | Typical approach |
|---|---|---|---|
| Android | Yes � `FLAG_SECURE` | Yes � same flag | Set `FLAG_SECURE` on sensitive activities/screens |
| iOS | No � OS doesn't allow blocking screenshots | Not directly, but you can render a cover/blur view the instant the app resigns active, which also happens to obscure the app-switcher snapshot | Listen for `willResignActive` / `AppState` change to `inactive`/`background`, show a blur/branding overlay, remove it on `active` |

### Interview question

**Q: How would you protect sensitive screens (like an account balance) when the app goes to the background?**

> "On Android, I'd apply `FLAG_SECURE` on sensitive screens, which both blocks screenshots/screen recording and blanks the thumbnail in the recent-apps switcher. iOS doesn't let apps block screenshots at the OS level, so the practical approach there is listening for the app resigning active � via `AppState` or the native `willResignActive` lifecycle � and immediately rendering a blur or branded cover view over the sensitive content, removing it once the app is active again. That at least prevents the balance or account details from being visible in the iOS app-switcher snapshot, even though a deliberate screenshot on iOS can't technically be blocked."

---
