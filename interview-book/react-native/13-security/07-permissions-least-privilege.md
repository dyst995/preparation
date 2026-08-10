# 07. Permissions: least privilege

> Source: `interview-prep/react-native/13-security.md`

### Topics to learn
- [ ] Runtime permission model differences (Android vs iOS)
- [ ] Requesting permissions just-in-time vs upfront
- [ ] Purpose strings (`NSCameraUsageDescription`, etc.) that are honest and specific
- [ ] Graceful degradation when a permission is denied
- [ ] Avoiding over-asking (a common App Store/Play review rejection reason, and a trust/security smell)

### Practical rules

- Request each permission **only right before the feature that needs it**, not all at app launch - this improves both grant rates and trust.
- Write purpose strings that describe the *actual* use ("used to scan QR payment codes"), not vague boilerplate - vague strings are a review rejection risk and a red flag to security-conscious users.
- Always handle the denied case gracefully - a feature being unavailable is fine; the app crashing or becoming unusable because a permission was denied is not.
- Periodically audit the permission list in the manifest/Info.plist - unused permissions from removed features are a real, common, and easily-fixed security smell.

### Interview question

**Q: How do you approach permissions in a fintech app with camera-based QR payments and document scanning?**

> "Just-in-time requests scoped to the exact feature - camera permission is requested right when the user taps 'scan QR code,' not at app launch. Purpose strings describe the actual use case specifically rather than generic boilerplate, which also matters for store review. I always handle denial gracefully - if camera access is denied, the user can still enter a payment reference manually rather than the app breaking. And periodically I audit the manifest/Info.plist permission list against what the app actually still uses, since unused permissions from removed features are an easy, avoidable trust and security smell in a review."

---
