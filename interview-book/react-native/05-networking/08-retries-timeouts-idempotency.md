# 08. Retries, timeouts, idempotency

> Source: `interview-prep/react-native/05-networking.md`

### Retries

- Safe on idempotent GETs
- Dangerous on non-idempotent POSTs unless server supports idempotency keys
- React Query retries should be configured thoughtfully for mutations (often 0)

### Idempotency for fintech

For transfers/payments:

- Client generates idempotency key per user intent
- Server deduplicates by key
- UI disables submit and ties key to the attempt

### Interview answer

> �Retries are not free. I retry transient GETs carefully. For payments I rely on idempotency keys and explicit user-driven retries, not blind automatic POSTs.�

---
