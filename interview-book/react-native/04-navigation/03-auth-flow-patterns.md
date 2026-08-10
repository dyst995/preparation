# 03. Auth flow patterns

> Source: `interview-prep/react-native/04-navigation.md`

### Topics to learn
- [ ] Hydration gate (don�t decide auth route before rehydration)
- [ ] Conditional trees vs imperative redirects
- [ ] Preventing back navigation to auth after login
- [ ] Handling forced logout (401) mid-session
- [ ] Session expiry UX

### Recommended pattern

1. On launch, show bootstrap/splash while reading secure storage.
2. Set auth state once.
3. Render either `AuthStack` or `AppStack`.
4. On login success, auth state change swaps trees (no `navigate('Home')` hacks required).
5. On logout, reset auth state and clear app state; auth tree mounts fresh.

### Why conditional trees beat redirect soup

- Harder to �back� into Login after entering app
- Single source of truth
- Deep links can wait until hydrated

### Interview question

**Q: How do you structure logged-out vs logged-in navigation?**

> �I gate on hydrated auth state. Unauthenticated users get an Auth stack; authenticated users get the App stack. Switching is driven by state, not by manually navigating between login and home. That prevents back-stack leaks and simplifies deep linking.�

---
