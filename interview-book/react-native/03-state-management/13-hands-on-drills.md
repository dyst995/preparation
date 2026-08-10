# 13. Hands-on drills

> Source: `interview-prep/react-native/03-state-management.md`

- [ ] Build a tiny screen: React Query list + Zustand filter flag.
- [ ] Implement mutation with optimistic add + rollback.
- [ ] Write an auth logout function that clears everything.
- [ ] Draw a diagram: which state goes where for EasyPay.
- [ ] Explain staleTime settings you�d choose for: profile, balances, static config.

Suggested defaults to discuss (not dogma):
- Static config: long `staleTime` (hours+)
- Profile: medium (minutes)
- Balances: short (seconds�minute) depending on product needs
- Always be ready to justify with product freshness requirements

---
