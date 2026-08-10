# 09. Offline & flaky network UX

> Source: `interview-prep/react-native/05-networking.md`

### Topics to learn

- [ ] Detecting offline state
- [ ] Queueing non-critical actions vs blocking critical ones
- [ ] Showing cached data with stale indicators
- [ ] What must never be silently queued (payments) without clear UX
- [ ] Conflict resolution awareness

### Practical product stance

- Browse cached transactions offline: usually OK with clear �offline� indicator
- Initiate money movement offline: usually block or require explicit �will send when online� design with care

---
