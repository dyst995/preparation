# 17. Green flags / red flags

> Source: `interview-prep/react-native/05-networking.md`

**Green**

- Single-flight refresh
- Idempotency for payments
- Clear offline product decisions
- Distinguishes transport cache vs app cache

**Red**

- Refresh token in AsyncStorage + no race handling
- Automatic retry on all POSTs
- �We�ll just websocket everything�
- Passing tokens in query strings

---
