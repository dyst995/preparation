# 06. Idempotency UX

> Source: `interview-prep/react-native/09-forms-ux-fintech.md`

### Topics to learn
- [ ] What an idempotency key is and why it's generated client-side per logical action (e.g. UUID at "confirm" tap, not regenerated on retry)
- [ ] Client-side guard: disabling the action immediately on tap, before the network call even resolves
- [ ] Server-side guard: the actual safety net � dedupe requests with the same idempotency key within a time window
- [ ] Why client-side disabling alone is not sufficient (double-tap races, app backgrounding mid-request, network retries at lower layers)
- [ ] Communicating "already processed" gracefully instead of erroring confusingly

### The two-layer defense

| Layer | Mechanism | Protects against |
|---|---|---|
| Client (UX) | Disable button / show spinner immediately on tap; ignore further taps until response | Accidental double-taps, impatient re-tapping |
| Client (correctness) | Generate one idempotency key when the user confirms; reuse the *same* key if retrying the *same* logical action | Network retries, app relaunch mid-flight, ambiguous timeouts |
| Server (source of truth) | Store/check idempotency key; if seen before, return the original result instead of reprocessing | The actual guarantee � client-side alone can't be trusted |

### Interview question

**Q: How do you prevent double-submit on a payment button, and why isn't disabling the button alone enough?**

> "Disabling the button on first tap is the UX-level guard � it prevents an impatient double-tap from firing two requests. But it's not sufient on its own: the app could background and resume mid-request, a lower-level network retry could resend the request, or the response could time out while the server actually processed it. The real safety net is an idempotency key generated once when the user confirms the action, sent with the request, and reused if that same logical action needs to be retried. The server treats any repeated request with the same key as the same operation and returns the original result instead of processing it again. So it's a two-layer defense: UX-level button disabling for immediate feedback, and idempotency-key deduplication for actual correctness."

---
