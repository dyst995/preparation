# 09. Native bridge security issues

> Source: `interview-prep/react-native/13-security.md`

### Topics to learn
- [ ] Overly broad native methods exposed to JS (e.g. a generic "run arbitrary native command" bridge)
- [ ] Validating input at the JS/native boundary, not just on the JS side
- [ ] WebView-specific risks (if the app embeds any WebView, especially with JS bridge exposure)
- [ ] Trusting native module return values without assuming JS-side validation already happened
- [ ] Principle: the native side should not assume JS input is safe just because it's "your own app's JS"

### Why this matters even in a "trusted" JS/native pair

Even though the JS bundle and native module are written by the same team, treating the native side as if it can blindly trust whatever JS sends is fragile: a bug elsewhere in JS, a compromised dependency, or (in WebView-containing apps) even untrusted web content with bridge access can end up calling a native method with unexpected input. Native modules should validate input defensively, the same as any API boundary.

### WebView-specific risk

If any screen embeds a `WebView` that exposes a JS bridge to the native layer, that bridge is now reachable by **whatever content loads in that WebView** - which is a much bigger attack surface than your own app's trusted JS bundle, especially if the WebView can navigate to arbitrary/external URLs. Rules:
- Restrict WebView navigation to a known allow-list of domains when a JS bridge is exposed.
- Never expose sensitive native bridge methods (payment actions, secure storage access, biometric triggers) to a WebView's JS context.
- Disable universal/file access flags on WebViews unless specifically required and understood.

### Interview question

**Q: What security concerns come up when bridging native code to JS?**

> "Two main ones. First, a native module shouldn't blindly trust whatever comes from JS just because it's 'our own code' - a bug elsewhere, a compromised dependency, or unexpected input can still call it with bad data, so native methods should validate input at the boundary like any API. Second, and more seriously, if any screen uses a WebView with a JS bridge exposed, that bridge is reachable by whatever content the WebView loads - which is a much larger, less trusted surface than your app's own JS. In that case I'd restrict WebView navigation to an allow-list of known domains and make sure sensitive native capabilities - payments, secure storage, biometrics - are never reachable from a WebView bridge at all."

---

## Fintech-focused interview question bank (with answer targets)

1. **Why is AsyncStorage unsafe for tokens?** - unencrypted plain storage, no OS-level protection.
2. **How do you store refresh tokens on mobile?** - Keychain/Keystore-backed secure storage, in-memory session cache for the access token.
3. **What client-side security measures matter most in a fintech RN app?** - secure storage, transport security/pinning tradeoffs, least-privilege permissions, deep link validation, no client-side secrets.
4. **How do you validate deep links so they cannot open unauthorized flows?** - treat as untrusted input, re-check auth, never trigger sensitive actions directly from link params.
5. **What security issues can appear when bridging native code?** - blind trust of JS input at the native boundary, WebView bridge exposure.
6. **Would you use SSL pinning, and what's the operational risk?** - yes with public key/intermediate pinning + backup pins, main risk is self-inflicted outage from unplanned rotation.
7. **How much do you rely on jailbreak/root detection?** - one signal for backend risk scoring, not a hard boundary; it's bypassable.
8. **Does obfuscation protect secrets?** - no, it raises reverse-engineering cost, doesn't achieve secrecy; real secrets belong server-side.
9. **How do you protect a screen showing full account/card details from screenshots?** - `FLAG_SECURE` on Android, screenshot-notification + background blur on iOS.
10. **How do you avoid leaking secrets in a JS bundle?** - never embed real secrets client-side; backend-mediated calls with short-lived scoped tokens.
11. **How do you scope permissions for a payments app with camera/document scanning?** - just-in-time requests, honest purpose strings, graceful denial handling, periodic audits.

---
