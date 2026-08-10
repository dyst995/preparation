# 11. Senior red flags / green flags

> Source: `interview-prep/react-native/13-security.md`

### Green flags interviewers love
- Gives honest, mechanism-based tradeoffs (e.g. pinning's rotation risk) instead of absolutist "always/never" claims.
- Frames root detection and obfuscation correctly as defense-in-depth signals, not guarantees.
- Immediately identifies deep link params and native bridge input as untrusted, without being prompted.
- Has a clear, memorized answer for "why can't we just hide the secret better."
- Distinguishes platform differences precisely (Android `FLAG_SECURE` vs iOS's lack of an equivalent).

### Red flags
- "AsyncStorage is fine if we just don't tell anyone the key names."
- Treating SSL pinning or obfuscation as unbeatable security rather than raising attacker cost.
- Trusting deep link/native bridge input without validation "because it's our own app."
- Wanting to embed a real third-party secret key client-side to save a backend call.
- No opinion on permission scoping ("we just ask for everything upfront to be safe").

---
