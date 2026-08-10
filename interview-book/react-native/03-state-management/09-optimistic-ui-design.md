# 09. Optimistic UI design

> Source: `interview-prep/react-native/03-state-management.md`

### Example: send money

1. User confirms transfer
2. Disable submit / show pending row
3. Optimistically deduct available balance in cache (carefully)
4. Send mutation
5. Success: invalidate balances + transactions
6. Failure: rollback + show actionable error

### Risks

- Over-optimistic updates on irreversible financial actions
- Double spend UI if button not locked
- Server-side idempotency still required

### Interview nuance

> �Optimistic UI is a UX tool, not a source of truth. The server remains authoritative, and payment APIs should be idempotent.�

---
