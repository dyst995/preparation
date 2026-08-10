# 09  Forms, UX Patterns & Fintech-Specific Flows — Introduction

> Source: `interview-prep/react-native/09-forms-ux-fintech.md`

> Goal: Be able to design and defend every UX decision in a money-moving flow � keyboard handling, validation, precision, QR payments, wallet/loan states, idempotency, session security, accessibility, and offline/empty/error states � using EasyPay as your running example.

Mark progress with `[x]` as you master each topic.

---

## Learning objectives

By the end of this section you should be able to:

1. Handle keyboard behavior correctly and consistently across iOS/Android without layout jumps.
2. Design a validation strategy that balances immediate feedback with not being annoying.
3. Explain why money must never be represented as floating-point and how to format currency correctly.
4. Design a full QR payment flow, including error paths.
5. Model transfer/wallet/loan screens as explicit states, not ad hoc booleans.
6. Prevent double-submission and design idempotent payment actions.
7. Implement session timeout and re-auth flows appropriate for a fintech app.
8. Apply core mobile accessibility practices.
9. Design empty/error/offline states that don't feel like dead ends.
10. Explain background screenshot/app-switcher protection and why it matters for fintech.
11. Walk through the entire EasyPay flow (auth ? QR payment ? transfer ? wallet ? loans) as a cohesive architecture story.

---
