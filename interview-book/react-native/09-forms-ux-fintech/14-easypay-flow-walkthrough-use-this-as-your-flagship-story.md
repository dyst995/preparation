# 14. EasyPay flow walkthrough (use this as your flagship story)

> Source: `interview-prep/react-native/09-forms-ux-fintech.md`

You designed EasyPay's architecture, navigation, and tech stack from scratch � this is your strongest end-to-end narrative. Structure it like this when asked "walk me through a project you built":

1. **Auth**: Login with credentials issues tokens; refresh token stored in secure storage (Keychain/Keystore); biometric login layered on top for fast re-entry; step-up biometric/PIN required again for high-risk actions.
2. **Home / Wallet**: Balance and recent activity, wallet state modeled explicitly (loading/empty/error/loaded), sensitive balance screen protected with `FLAG_SECURE` (Android) / blur-on-background (iOS).
3. **QR Payment**: Camera permission ? scan ? validate payload ? confirmation screen (recipient, amount, fee) ? biometric/PIN confirm for step-up ? idempotent submit ? pending/processing state ? success receipt or clear failure with retry.
4. **Transfers**: Recipient selection, amount entry with integer-cents formatting, validation (Zod + react-hook-form), confirmation, idempotent submit, same pending/success/failure state machine as QR payments.
5. **Loans**: Multi-step application flow reusing the same form validation and state-machine patterns; clear application-status states (submitted, under review, approved, rejected) distinct from simple loading/error.
6. **Notifications**: Push (FCM) + Notifee for transaction/security alerts; tapping a notification deep-links into the exact transaction via the same central routing function used for real deep links (see file 08).
7. **Releases**: Fastlane-driven Android/iOS release pipeline, staged rollouts so any regression in a payment flow is caught on a small percentage of users first (ties back to file 08's Crashlytics + staged rollout discipline).

### Interview framing

> "EasyPay is the project I can speak to most completely because I owned the architecture end-to-end. I designed the auth flow with biometric-gated secure storage, all money-movement screens as explicit state machines rather than boolean soup, idempotency keys on every payment-type action, and step-up authentication for sensitive actions independent of the general session timeout. Notifications and deep links share one routing function so behavior is consistent whether the user taps a push notification or opens a link. And releases go out through a Fastlane pipeline with staged rollout, so if something regresses in a payment flow, it's caught on a small slice of users, not everyone."

---

## Senior red flags / green flags

### Green flags interviewers love
- Modeling state as a discriminated union instead of independent booleans, unprompted.
- Distinguishing the client-side UX guard from the server-side idempotency guarantee for double-submit prevention.
- Knowing money must be integer minor units, with a concrete floating-point example ready.
- Treating a network timeout as "unknown outcome," not "failure."
- Knowing iOS can't block screenshots but Android can, and having a real mitigation for each.

### Red flags
- "We just disable the button, that's enough" for double-submit prevention.
- Doing money math directly on floats with no minor-units strategy.
- No distinct "pending/unknown" state � timeouts always shown as hard failures.
- Accessibility treated as "add `accessibilityLabel` sometimes" with no touch-target or dynamic-type awareness.
- Believing iOS screenshots can be blocked like Android's `FLAG_SECURE`.

---
