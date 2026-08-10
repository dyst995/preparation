# 05. Transfer / wallet / loan UI states

> Source: `interview-prep/react-native/09-forms-ux-fintech.md`

### Topics to learn
- [ ] Modeling screen state as an explicit finite set (`idle | loading | success | error | empty`) instead of multiple independent booleans
- [ ] Why `isLoading` + `isError` + `data` as three separate booleans invites impossible states (loading AND error both true)
- [ ] Pending/processing states unique to money movement (e.g. a transfer that's accepted but not yet settled)
- [ ] Optimistic UI vs pessimistic UI for financial actions (usually pessimistic for state-changing money actions; optimistic acceptable for reversible/non-critical UI)
- [ ] Retry vs "contact support" fallback thresholds
- [ ] Partial failure handling in multi-step flows (e.g. transfer initiated but confirmation step times out � did it go through or not?)

### State machine over boolean soup

```ts
type TransferState =
  | { status: 'idle' }
  | { status: 'validating' }
  | { status: 'confirming'; details: TransferDetails }
  | { status: 'submitting' }
  | { status: 'pending'; reference: string } // accepted, not yet settled
  | { status: 'success'; reference: string }
  | { status: 'failed'; reason: string; retryable: boolean };
```

Modeling it this way means the UI can render a single `switch` and it's impossible to be simultaneously "loading" and "showing stale success data," which is a very common real bug class with boolean-flag state.

### The "did it actually go through?" problem

The scariest UX bug in fintech: a request times out client-side, but the server actually processed it. If the UI just shows "failed, tap to retry" and the user retries, you may create a duplicate transfer. Mitigations:
- Idempotency keys (see next section) so a retried request is safely deduplicated server-side.
- A distinct "pending / unknown, checking status" state instead of collapsing timeouts into "failed."
- A status-polling or push-notification-driven confirmation once the true outcome is known.

### Interview question

**Q: How do you handle a network timeout on a money transfer where you don't know if it succeeded?**

> "I don't collapse a timeout into a hard 'failed' state, because the request may have actually succeeded server-side. I show a distinct 'pending / confirming' state, and either poll a status endpoint or wait for a push notification/websocket event that tells us the true outcome. Critically, the original request carries an idempotency key, so even if the user does end up retrying, the server recognizes it as the same logical operation and doesn't double-process it. Only once I have a definitive success or failure from the server do I show a final receipt or error screen."

---
