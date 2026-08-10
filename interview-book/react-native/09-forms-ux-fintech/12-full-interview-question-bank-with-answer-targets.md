# 12. Full interview question bank (with answer targets)

> Source: `interview-prep/react-native/09-forms-ux-fintech.md`

### Keyboard & input UX
1. **iOS vs Android keyboard-avoidance differences?** ? `KeyboardAvoidingView` behavior, manifest `adjustResize`.
2. **How do you avoid a hidden submit button behind the keyboard?** ? padding behavior + offset + `keyboardShouldPersistTaps`.

### Validation
3. **On-blur vs on-change vs on-submit � when each?**
4. **How do you show server-side validation errors on specific fields?**

### Money & precision
5. **Why never use floating point for money?** ? binary fraction imprecision; use integer minor units.
6. **How do you format currency correctly for multiple locales?** ? `Intl.NumberFormat`.

### QR & scanning
7. **Full QR payment flow with error handling?**
8. **Why never auto-submit directly from a scan?** ? always confirm first.

### State modeling
9. **Why model screen state as a union/state machine instead of booleans?** ? prevents impossible states.
10. **How do you handle "network timed out, unknown outcome" for a transfer?** ? pending state + status check/poll + idempotency key.

### Idempotency
11. **How do you prevent double-submit, and why isn't disabling the button alone enough?**
12. **What is an idempotency key and where is it generated?** ? client, once per logical action, reused on retry.

### Session & auth
13. **How do you implement session timeout after backgrounding?**
14. **What is step-up authentication and when do you require it?**

### Accessibility
15. **What accessibility props matter most for a custom pressable component?**
16. **How do you support dynamic type without breaking layout?**

### Empty/error/offline
17. **What states must a fintech action screen support at minimum?**
18. **How do you differentiate "empty" from "error" in the UI?**

### Screenshot protection
19. **How do you protect a balance screen from appearing in the app switcher?**
20. **Why can't you block screenshots on iOS the way you can on Android?**

---
