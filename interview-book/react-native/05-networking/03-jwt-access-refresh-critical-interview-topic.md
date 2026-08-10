# 03. JWT access + refresh (critical interview topic)

> Source: `interview-prep/react-native/05-networking.md`

### Topics to learn

- [ ] Short-lived access tokens
- [ ] Longer-lived refresh tokens in secure storage
- [ ] Single-flight refresh (mutex/queue)
- [ ] Retry original requests after refresh
- [ ] Forced logout on refresh failure
- [ ] Avoid infinite 401 loops

### The race condition

Many parallel API calls get 401 simultaneously. Naive code refreshes N times and overwrites tokens chaotically.

### Correct approach (conceptual)

1. First 401 triggers refresh
2. Later 401s wait on the same refresh promise
3. On success: update token, retry queued requests
4. On failure: logout and reject all

### Interview answer

> �I attach access tokens in a request interceptor. On 401, a shared refresh flow runs once; concurrent callers await the same promise. If refresh succeeds, failed requests retry with the new token. If refresh fails, I clear session and force re-auth. Refresh tokens live in secure storage, not AsyncStorage.�

---
