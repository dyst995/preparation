# 03. Jailbreak/root detection awareness

> Source: `interview-prep/react-native/13-security.md`

### Topics to learn
- [ ] Why jailbreak/root detection is a signal, not a hard security boundary
- [ ] Common detection techniques (file system markers, suspicious installed apps, sandbox integrity checks)
- [ ] Detection evasion is well-documented - don't overweight it
- [ ] Risk-based response (warn, restrict sensitive features, or block) vs hard-blocking everyone
- [ ] Defense-in-depth framing: combine with pinning, secure storage, server-side risk scoring

### Realistic framing for interviews

Root/jailbreak detection can always be bypassed by a sufficiently motivated attacker (well-known tools exist specifically to hide root/jailbreak status from apps). The honest, senior framing is: **it raises the cost for casual attackers and provides a signal for risk-based decisions**, not a guarantee.

### Practical response options when detected

| Response | When appropriate |
|---|---|
| Silent flag sent to backend for risk scoring | Good default - lets backend combine signals (device, behavior, transaction pattern) rather than a blunt client-side block |
| Warn user, allow continued use | Lower-risk apps, or non-financial actions |
| Block high-risk actions only (e.g. large transfers) while allowing browsing | Balanced approach for fintech |
| Hard block entire app | Highest risk apps, but has real UX/support cost and can be bypassed anyway - use sparingly and never as your *only* defense |

### Interview question

**Q: How much do you rely on jailbreak/root detection in a fintech app?**

> "As one signal among many, not as the security boundary itself. Detection can be bypassed by well-known tools, so I don't treat it as guaranteed truth. In practice I'd send the signal to the backend as part of a broader risk assessment - combined with transaction patterns, device fingerprinting, behavioral signals - and let the backend make a risk-based decision, potentially restricting high-risk actions like large transfers rather than hard-blocking the whole app on a signal that's inherently gameable. The real security has to live in secure storage, transport security, and backend validation - root detection is a helpful extra layer, not a foundation."

---
