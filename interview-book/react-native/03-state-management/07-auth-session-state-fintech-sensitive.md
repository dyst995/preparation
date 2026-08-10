# 07. Auth/session state (fintech-sensitive)

> Source: `interview-prep/react-native/03-state-management.md`

### Topics to learn
- [ ] In-memory session vs persisted session
- [ ] Access token vs refresh token handling
- [ ] Rehydration on startup
- [ ] Clearing all stores/caches on logout
- [ ] Preventing UI flash of authenticated routes

### Logout checklist (memorize)

- [ ] Clear secure storage tokens
- [ ] Clear React Query cache (`queryClient.clear()`)
- [ ] Reset Zustand/Redux auth slices
- [ ] Reset navigation state
- [ ] Cancel in-flight requests / invalidate auth headers
- [ ] Stop notification listeners if needed

### Interview question

**Q: How do you prevent stale user data after logout?**

> �Logout is a multi-step reset: delete tokens, clear server caches, reset client stores, and reset navigation. If you only flip an `isLoggedIn` boolean, you�ll leak cached personal data.�

---
