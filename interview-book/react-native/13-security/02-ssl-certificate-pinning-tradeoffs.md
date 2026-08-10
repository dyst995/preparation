# 02. SSL/certificate pinning tradeoffs

> Source: `interview-prep/react-native/13-security.md`

### Topics to learn
- [ ] What pinning protects against (MITM via rogue/compromised CA certs)
- [ ] Public key pinning vs certificate pinning
- [ ] The operational risk: pin rotation and outages
- [ ] Backup pins strategy
- [ ] Why pinning doesn't protect against a compromised/rooted client itself
- [ ] When teams choose not to pin (or use it selectively)

### What pinning actually protects against

Without pinning, your app trusts any certificate signed by any CA in the OS trust store. Pinning says: "only trust *this specific* certificate or public key for this domain," which defends against:
- A compromised or coerced Certificate Authority issuing a fraudulent cert for your domain.
- Some forms of network-level MITM (e.g. malicious/compromised network infrastructure, some corporate/government-level interception setups).

### What pinning does NOT protect against

- A rooted/jailbroken device where the attacker can hook the app's own SSL stack (e.g. via Frida) and bypass pinning at runtime - pinning raises the bar, it doesn't make this impossible.
- Server-side vulnerabilities.
- Anything once the attacker already controls the client device at a level that lets them instrument the running app.

### The real operational risk: cert rotation

Pinning's biggest practical danger is an **outage from your own cert rotation**: if you pin a leaf certificate and it expires/rotates and the app hasn't been updated with the new pin, users on old app versions get hard connection failures until they update - which, given app store review times, could be days.

### Mitigation strategies

| Strategy | Tradeoff |
|---|---|
| Pin the public key instead of the leaf cert | Public key can be reused across cert renewals if you keep the same key pair, reducing rotation risk |
| Pin an intermediate CA instead of the leaf | Less strict, but far more resilient to rotation, still meaningfully narrows trust |
| Ship backup pins | Requires planning ahead of the actual rotation, but avoids a hard outage |
| Remote-configurable pin set | Lets you react without an app store release, at the cost of some of pinning's own security guarantee if the config channel itself isn't well protected |
| Don't pin, rely on TLS + strong backend security posture | Simpler operationally, less defense-in-depth against CA-level compromise |

### Interview question

**Q: What's the tradeoff with SSL pinning, and would you recommend it for a fintech app?**

> "Pinning protects against a compromised CA issuing a fraudulent certificate for your domain and some network-level MITM scenarios - real threats worth defending against in fintech. The real operational risk is self-inflicted: if you pin too narrowly (a leaf cert) and don't plan pin rotation, your own cert renewal can hard-break connectivity for users stuck on an old app version until they update, which given app store review times can be a real outage. I'd pin the public key or an intermediate rather than the leaf cert specifically to survive rotation, always ship backup pins ahead of a planned rotation, and be clear with the team that pinning is defense-in-depth, not a replacement for server-side security - it also doesn't stop an attacker who's already instrumented a rooted device at runtime."

**Follow-up: how would you detect a pinning failure in production before it becomes a full outage?**
> Alert on a spike in TLS/connection-failure error rates specifically (distinct from generic network errors), and always test the new pin set against production before a cert rotation actually happens, not after.

---
