# 05. Screenshot / screen recording protection

> Source: `interview-prep/react-native/13-security.md`

### Topics to learn
- [ ] Android `FLAG_SECURE` (blocks screenshots and appearing in the recent-apps switcher thumbnail)
- [ ] iOS limitations (no equivalent OS-level flag to block screenshots; can detect and react, e.g. blur on screenshot event or app-switcher snapshot)
- [ ] Which screens need this (balances, card numbers, PINs, sensitive documents)
- [ ] UX tradeoff: don't overuse it on non-sensitive screens

### Practical pattern

| Platform | Mechanism | Behavior |
|---|---|---|
| Android | `FLAG_SECURE` on the window | Screenshots blocked entirely; recent-apps thumbnail shows blank/black |
| iOS | No true screenshot-block API | Can detect `UIApplication.userDidTakeScreenshotNotification` to react (e.g. warn, log) after the fact; can blur content in the app-switcher snapshot via `applicationDidEnterBackground`/`willResignActive` hooks so sensitive data isn't visible in the OS task switcher |

### Interview question

**Q: How do you protect a sensitive screen (like showing a full card number) from screenshots?**

> "On Android I'd apply `FLAG_SECURE` to that screen's window, which blocks screenshots and screen recording entirely and blanks the recent-apps thumbnail. iOS doesn't give you a true block API, so the pattern there is to detect the screenshot notification and react - warn the user or log it for audit purposes - and, separately, blur or hide sensitive content when the app moves to the background so it's not visible as a snapshot in the iOS app switcher. I'd scope this to genuinely sensitive screens only - applying it everywhere hurts legitimate use cases like sharing a receipt screenshot."

---
