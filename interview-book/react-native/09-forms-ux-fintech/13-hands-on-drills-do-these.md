# 13. Hands-on drills (do these)

> Source: `interview-prep/react-native/09-forms-ux-fintech.md`

- [ ] Build a small transfer-amount input using integer cents internally and `Intl.NumberFormat` for display; deliberately try `0.1 + 0.2` in floating point first to see the bug, then fix it.
- [ ] Implement a `TransferState` discriminated union and render a `switch` over it instead of boolean flags.
- [ ] Add a ref-based in-flight guard to a submit handler and try to break it with rapid double-tapping before and after.
- [ ] Wire up `FLAG_SECURE` on an Android screen (or explain exactly where you'd add it) and implement an iOS blur-on-background overlay.
- [ ] Write a validation schema (Zod) for a transfer form with amount, recipient, and note fields, with proper error messages.
- [ ] Design (on paper) the empty/error/offline/pending states for a "Transactions" list screen.
- [ ] Practice explaining idempotency keys out loud in under 90 seconds, distinguishing the client UX guard from the server-side guarantee.

---
