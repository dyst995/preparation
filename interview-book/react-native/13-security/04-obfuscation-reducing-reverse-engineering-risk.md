# 04. Obfuscation (reducing reverse engineering risk)

> Source: `interview-prep/react-native/13-security.md`

### Topics to learn
- [ ] Proguard/R8 obfuscation on Android (see also Chapter 11)
- [ ] iOS symbol stripping / limited obfuscation options
- [ ] JS bundle obfuscation tools (aware of options, understand limits)
- [ ] Why obfuscation raises cost, doesn't achieve secrecy
- [ ] What obfuscation cannot protect (hardcoded secrets are still extractable, just annoying)

### Honest framing

Obfuscation makes static analysis slower and more annoying for an attacker - it does not make your code secret. A determined attacker with the compiled artifact can still dynamically instrument the running app (Frida, debuggers) regardless of how obfuscated the static code is. This matters because some engineers over-trust obfuscation as if it were encryption - it isn't.

### Interview question

**Q: Does obfuscating your JS bundle protect API secrets?**

> "No - obfuscation raises the effort to statically read the code, but the bundle still executes on the device, so a motivated attacker can extract strings or hook the running app dynamically to observe values at runtime regardless of how obfuscated the source looks. I treat obfuscation as raising the cost of casual reverse engineering, not as a way to keep secrets in the app - real secrets simply shouldn't be shipped in the client at all, they belong server-side (see Section 8)."

---
