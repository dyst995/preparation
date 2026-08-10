# 05. Notification permissions and OEM quirks

> Source: `interview-prep/react-native/08-push-firebase-device.md`

### Topics to learn
- [ ] iOS: explicit `requestPermission()`, authorization status handling
- [ ] Android 13+: explicit `POST_NOTIFICATIONS` runtime permission
- [ ] Android ?12: notifications enabled by default, but users can disable per-app in settings
- [ ] OEM battery optimization / aggressive task killers (Xiaomi/MIUI, Huawei/EMUI, OnePlus, Samsung) suppressing background delivery
- [ ] Educating users to whitelist the app from battery optimization
- [ ] Requesting permission at the right UX moment (not immediately on first launch)

### OEM quirks table

| OEM / Skin | Common issue | Mitigation |
|---|---|---|
| Xiaomi (MIUI) | Aggressive "autostart" restrictions kill background processes, delaying/blocking push delivery | Prompt users to enable autostart / disable battery optimization for the app; document in onboarding/FAQ |
| Huawei (EMUI, no Google Play Services on newer devices) | FCM may not work at all without Google Play Services; needs Huawei Mobile Services (HMS) fallback for full support | Detect GMS availability; consider HMS push kit for Huawei-heavy markets |
| Samsung | Generally more compliant, but aggressive "Sleeping apps" list can delay delivery | Same battery-optimization guidance |
| OnePlus (OxygenOS) | Similar background-kill aggressiveness | Same guidance |
| iOS | No "OEM" issue, but background delivery of silent pushes is throttled/best-effort by the OS, never guaranteed timely | Don't rely on background pushes for time-critical logic; treat as best-effort |

### Interview question

**Q: A user says they stopped getting push notifications on their Xiaomi phone. What do you check?**

> "First I verify server-side that the token is valid and the send actually succeeded (not silently failing due to a stale/invalid token). Then I check notification permission status and channel settings on-device. If those look fine, I look at OEM-specific background restrictions � MIUI's autostart/battery optimization is a very common cause of silently dropped background delivery on Xiaomi devices. I'd guide the user to whitelist the app, and longer-term, document this as a known FAQ item since it's a recurring support issue across MIUI/EMUI-heavy markets."

---
