# 06. Deep link validation

> Source: `interview-prep/react-native/13-security.md`

### Topics to learn
- [ ] Custom URL schemes vs Universal Links (iOS) / App Links (Android) - trust differences
- [ ] Why custom schemes are more spoofable
- [ ] Validating parameters before acting (never trust deep link params blindly)
- [ ] Requiring auth/re-auth before sensitive actions triggered by a link
- [ ] Preventing deep links from bypassing navigation guards (e.g. jumping straight to an authenticated screen while logged out)

### Why validation matters

A deep link is untrusted input, no different from a query parameter from the internet. Any app can (in principle) attempt to invoke another app's custom URL scheme; Universal/App Links are more trustworthy because they require domain association files verified by the OS, but even then, the *parameters* inside the link are still attacker-controllable and must be validated like any other untrusted input.

### Practical rules

| Rule | Reason |
|---|---|
| Prefer Universal Links/App Links over custom schemes for anything sensitive | Domain-verified, harder to spoof than an arbitrary custom scheme |
| Never perform a sensitive action (transfer, account change) directly from link params without a confirm/re-auth step | Link params are attacker-controllable input |
| Re-check auth state before navigating to an authenticated deep-linked screen | Prevents a link crafted to jump into a protected screen state while logged out or as another user |
| Validate/allow-list the target route from the link, don't dynamically construct navigation from raw input | Prevents open-redirect-style navigation abuse |
| Log deep link entry points for audit/debugging | Helps investigate abuse patterns later |

### Interview question

**Q: How do you make sure a deep link can't be used to bypass authentication or trigger an unauthorized action?**

> "I treat deep link parameters as untrusted input, the same as any external data. I prefer Universal Links/App Links over custom URL schemes for anything sensitive since they're domain-verified and harder to spoof. Regardless of link type, I re-check auth state before navigating into any protected screen from a link, so a crafted link can't jump straight into authenticated content while logged out. And I never let a deep link directly trigger a sensitive action like a transfer - at most it can pre-fill a confirmation screen that still requires explicit user action and, for money movement, re-authentication."

---
