# 13. Senior-Level Best Practices

> Source: `interview-prep/react-native/13-security.md`

### Decision framework: lightweight threat modeling for a mobile fintech feature

Before building any new feature that touches money, auth, or personal data, run it through this quickly:

```
1. What data does this feature touch, and what's the worst-case exposure if a device is compromised
   (lost phone, malware, rooted/jailbroken device)?
   -> Determines secure-storage and screenshot-protection requirements.

2. What data crosses the network, and what's the worst-case exposure if that traffic is intercepted
   or a backend endpoint is called with manipulated parameters?
   -> Determines transport security (pinning posture) and server-side validation requirements.

3. What action does this feature let a user take, and what's the worst-case impact if that action is
   triggered by something other than genuine user intent (a malicious deep link, a compromised
   WebView bridge, a replayed request)?
   -> Determines confirmation-step, re-auth, and idempotency requirements.

4. Who else could plausibly reach this code path that isn't the intended user
   (another app via a spoofable scheme, arbitrary WebView content, a different logged-in user on a
   shared device)?
   -> Determines input validation and auth-boundary requirements at that specific entry point.
```

This is "STRIDE-lite" adapted for mobile - you don't need a formal threat-modeling framework name to demonstrate you think this way; walking an interviewer through these four questions for a hypothetical new feature is exactly what a senior security-conscious answer looks like.

### Production checklist: defense in depth for mobile fintech

- [ ] No layer of defense is treated as sufficient alone - secure storage, transport security, deep link validation, and server-side validation are all present and independently would still contain damage if any single one failed.
- [ ] Every sensitive value (tokens, PINs, biometric-unlock flags) lives in Keychain/Keystore-backed storage, never `AsyncStorage`, with an explicit access-control policy (biometric-gated where risk warrants it).
- [ ] Transport security posture (pinning or not, and what's pinned - leaf/intermediate/public key) is a deliberate, documented decision with a rotation plan, not a default nobody revisited since setup.
- [ ] Jailbreak/root detection, if used, feeds a backend risk-scoring decision - it is never the sole gate for a sensitive action.
- [ ] Every deep link handler treats link parameters as untrusted input: validated against an allow-listed shape, and re-checks auth state before navigating to any protected screen.
- [ ] No sensitive action (transfer, payee change, limit change) can be triggered directly from a deep link or notification payload without an explicit in-app confirmation and appropriate step-up auth.
- [ ] Every permission request is scoped to the exact feature needing it, requested just-in-time, with an honest purpose string and graceful denial handling.
- [ ] No API key, signing secret, or long-lived credential is embedded in the JS bundle or native binary - the client only ever holds short-lived, scoped tokens.
- [ ] Any WebView with a JS bridge restricts navigation to an allow-list of domains, and no sensitive native capability (payments, secure storage, biometrics) is reachable from that bridge.
- [ ] Native modules validate input at the JS/native boundary defensively, not on the assumption that "it's our own JS, it's safe."
- [ ] Screenshot/screen-recording protection is explicitly decided per sensitive screen (Android `FLAG_SECURE`, iOS blur-on-background), not applied blanket or forgotten entirely.

### Anti-patterns seniors reject

- **Treating any single control as "the" security measure.** "We have SSL pinning so we're secure" or "we have root detection so we're covered" are both red flags - real security in fintech comes from layered, independent controls, none of which alone is sufficient.
- **Absolutist claims instead of honest tradeoffs.** "Pinning makes MITM impossible" and "obfuscation protects our secrets" are both false; a senior answer explains what a control actually raises the cost of, and what it doesn't stop.
- **Hard-blocking the entire app on a jailbreak/root signal.** It's bypassable by well-known tooling, has real UX/support cost, and gives false confidence while doing little against a motivated attacker; a risk-scored, backend-side response is more defensible.
- **Trusting deep link or native-bridge input because "it's from our own app."** A compromised dependency, a bug elsewhere in the same codebase, or (for WebViews) arbitrary loaded content can all reach that "trusted" path with unexpected input.
- **Embedding a third-party API secret client-side "to save a backend round trip."** The JS bundle and native binary both ship fully to the device and are inspectable; there's no place on the client that's actually secret.
- **Applying `FLAG_SECURE`/screenshot protection to the entire app.** Hurts legitimate use cases (sharing a receipt screenshot) without meaningfully improving security on non-sensitive screens; scope it deliberately.
- **Skipping a security pass on WebView-containing screens because "it's just a help center."** Any JS-bridge-exposed WebView is a larger attack surface than the app's own trusted JS, regardless of how innocuous the content looks today.

### Failure modes & debugging: security-incident runbook

| Symptom | Likely cause | Response |
|---|---|---|
| Sudden spike in TLS/connection-failure errors after a cert rotation | Pinned cert/key rotated without updating the app's pin set, or backup pins weren't shipped ahead of time | Roll back the server-side cert if possible; otherwise emergency-release an updated pin set; going forward, always test new pins against production before rotating |
| A user reports their account was accessed from an unfamiliar device | Possible token theft (compromised device, token exfiltrated via an insecure storage path) or credential reuse elsewhere | Force-invalidate all active sessions/tokens for that user server-side; audit whether the token was ever accessible outside secure storage in any historical app version |
| A secret is discovered in a public repo/fork or a decompiled build | Any embedded client-side secret, or an accidental commit | Rotate the secret immediately regardless of confirmed misuse; if it was a client-embedded "secret," treat the underlying architecture (not just this one key) as the real problem and migrate to backend-mediated calls |
| A deep link is found that bypasses a screen's intended auth gate | Missing auth re-check in that specific route handler | Audit every deep-linked/notification-routed screen for the same missing check, not just the one reported; add an automated test asserting auth-gated routes reject unauthenticated navigation |
| WebView-loaded content triggers an unexpected native action | Bridge exposed a sensitive method to WebView JS context, or navigation wasn't restricted to an allow-list | Immediately restrict WebView navigation and strip sensitive bridge methods from any WebView-reachable context; audit all WebView screens app-wide, not just the reported one |

### Observability / metrics that matter

- **TLS/pinning failure rate** (distinct from generic network error rate) - the earliest signal of a pin-rotation self-inflicted outage or a genuine MITM attempt.
- **Anomalous session/device count per user** - flags potential token theft or account-sharing patterns worth a closer look.
- **Deep link entry-point volume and failure rate** (how often a deep link fails validation) - both a security signal (spikes might indicate probing) and a UX signal (legitimate broken links).
- **Jailbreak/root detection flag rate**, tracked as a backend risk-scoring input and trended over time, not acted on client-side alone.
- **Permission grant/denial rates per permission** - a sudden drop in grant rate after a copy or timing change flags a UX regression that could also push users toward degraded, less secure fallback paths.
- **Secret rotation audit trail** - a log of when each production secret was last rotated, reviewed periodically so "we'll rotate if it leaks" doesn't quietly become "we've never rotated this."

### Scalability & team practices

- Run a lightweight threat-modeling pass (the four-question framework above) as a standing agenda item for design review on any feature touching money, auth, or PII - bake it into the process rather than relying on one security-minded engineer remembering to ask.
- Maintain a living inventory of "what data lives where" (secure storage vs regular storage vs server-only) reviewed whenever a new sensitive field is introduced, so classification decisions aren't made ad hoc per feature.
- Treat WebView additions as requiring explicit security sign-off (allow-list domains, bridge method audit) before merge, since they're a disproportionately high-risk surface relative to how casually they're sometimes added.
- Rotate secrets on a defined schedule (not only reactively on suspected leak) for anything with meaningful blast radius if compromised, and rehearse the rotation runbook at least once outside of a real incident.
- Keep a short "why we made this security tradeoff" doc for decisions like pinning strategy or root-detection response policy, so the reasoning survives team turnover and isn't relitigated from scratch by each new engineer.

### Tradeoffs table: layered defenses at a glance

| Layer | What it defends against | What it does NOT defend against | Bypassable by a sufficiently motivated attacker? |
|---|---|---|---|
| Keychain/Keystore secure storage | Casual on-device data extraction (backup tools, filesystem access) | An attacker with full runtime control of an unlocked, unlocked-and-authenticated app session | Harder, but a fully compromised unlocked device can still be misused |
| SSL/certificate pinning | Rogue/compromised CA, some network-level MITM | A rooted device with runtime instrumentation (e.g. Frida) hooking the app's own TLS stack | Yes, on a compromised device |
| Jailbreak/root detection | Casual attackers, provides a backend risk signal | Well-known, documented detection-evasion tooling | Yes, readily |
| Obfuscation | Casual static analysis / reverse engineering | Dynamic instrumentation of the running app; doesn't hide runtime values | Yes |
| Deep link/native-bridge input validation | Malformed/malicious input reaching protected code paths | A vulnerability in the validation logic itself (must be kept correct and tested) | Only if validation itself has a gap |
| Server-side validation/authorization | Any client-side control being bypassed entirely | A backend vulnerability (this must be the true source of truth, not a backstop) | This is the layer that must not be bypassable |

The senior framing: **no single layer is a hard guarantee; server-side validation and authorization is the one layer that must be treated as the actual security boundary**, with everything client-side as genuinely valuable but fundamentally best-effort, cost-raising defense in depth.

### Harder follow-up interview questions (with model answers)

**Q1: Design a threat model, in a few minutes, for a new "request money from a friend" feature that generates a shareable link.**
> "First, what data does the link expose - if it encodes an amount and a requester identity, I'd treat both as visible to anyone who gets the link, not just the intended recipient, so I wouldn't include anything more sensitive than necessary (no account numbers, no PII beyond a display name). Second, what happens if the link is intercepted or forwarded to someone else - since it's inherently shareable, I can't rely on 'only the intended person has it' as a security boundary, so the actual payment action still requires the recipient to authenticate and explicitly confirm, the link only pre-fills context. Third, could the link be used to trigger an unintended action - I'd make sure opening the link never auto-executes a payment, only navigates to a confirmation screen, and I'd expire the link after a reasonable window or after first use to limit replay. Fourth, who else could reach this endpoint - I'd rate-limit and validate the link token server-side so it can't be brute-forced or reused indefinitely."

**Q2: A pentest report comes back saying your app is vulnerable because an attacker with root access can bypass your SSL pinning using Frida. How do you respond to leadership, who's alarmed by this finding?**
> "I'd contextualize the finding rather than dismiss or over-react to it: this is a known, expected limitation of client-side pinning, not a implementation bug - any client-side control can be defeated on a device the attacker already fully controls at the OS level. The actual question is whether our security model relies on pinning alone to prevent damage from a rooted-and-instrumented device, and it shouldn't - the real backstop is server-side authorization, rate limiting, and anomaly detection that would catch and limit damage from a compromised client regardless of what client-side controls it bypassed. I'd use the finding as a prompt to verify our backend defenses are strong independent of client trust, not as evidence that pinning itself needs to be 'fixed' to be unbypassable, which isn't achievable for a client-side control."

**Q3: How would you evaluate whether to invest engineering time in device attestation (e.g. Play Integrity API / App Attest) versus improving server-side fraud detection, given limited time?**
> "I'd frame it as complementary rather than either/or, but if forced to prioritize with limited time, I'd lean toward server-side fraud detection first, because it protects against a broader range of attack vectors - including ones that don't require a compromised device at all, like credential stuffing or social engineering - and it's the layer that can't be bypassed by an attacker who fully controls the client. Device attestation adds real value specifically against automated/bot abuse and tampered-client scenarios, which is worth doing, but it's a narrower slice of the overall risk surface. I'd propose starting with basic device-attestation signals as one input to the existing (or newly built) server-side risk engine, rather than building a separate, siloed attestation gate - that way the investment compounds with whatever fraud-detection work already exists instead of duplicating logic."

**Q4: Your team is debating whether a new internal admin tool (used by support staff) needs the same secure-storage/pinning rigor as the customer-facing fintech app. How do you reason about this?**
> "I'd threat-model it on its own terms rather than assuming either 'it's internal so it's fine' or 'apply everything uniformly.' The key question is what damage is possible if this specific tool's client is compromised - if support staff can view or act on customer financial data through it, a compromised admin device could be just as damaging as a compromised customer device, arguably more so given the elevated privileges, so it deserves comparable or stricter rigor: secure token storage, short-lived scoped credentials, strong auth including step-up for high-privilege actions. What might differ is threat likelihood assumptions (managed, MDM-enrolled corporate devices vs arbitrary consumer devices), which could justify different specific controls (e.g. relying more on MDM-enforced device policy) - but 'internal' alone isn't a reason to skip rigor when the tool's blast radius is high."

**Q5: How do you balance security requirements against shipping speed when a product manager pushes back on adding step-up authentication to a new feature, calling it "unnecessary friction"?**
> "I'd bring data and a specific risk framing rather than a blanket security objection. I'd walk through what the feature actually allows (e.g. adding a new payee, which is a common vector for account-takeover-driven fraud once an attacker has a foothold) and quantify what's at stake if that specific action is taken by someone other than the genuine user versus the friction cost of one extra biometric prompt for that specific, infrequent action. Often the disagreement dissolves once we're specific about risk tier rather than arguing about 'security' as an abstract value versus 'UX' as another - I'd also offer a concrete middle ground where possible, like requiring step-up only above a risk threshold (large first-time payee, large amount) rather than universally, which usually addresses both the fraud risk and the friction concern."

### Staff-level interview monologue: "How do you reason about mobile security given that you can't fully trust the client?"

> "The single idea that reframes almost every mobile security question for me is: the client is running on hardware you don't control, in an environment you can't fully trust, so every client-side control is really about raising cost and providing signal, not about achieving an unbypassable guarantee - and that's true even for controls I strongly recommend using, like pinning, secure storage, and root detection. Once that's the mental model, a lot of security questions stop being 'should we use X' and become 'given that X is bypassable under some threat model, what's actually protecting us if it's bypassed, and is that backstop server-side, where it needs to be.' That's why I always come back to: secure storage protects casual extraction, but the session should still be time-boxed and step-up-gated for high-risk actions in case a token is ever exposed anyway; pinning raises the MITM bar, but the backend still validates and rate-limits every request as if the client could be lying; deep links and native bridges are validated as untrusted input regardless of whether they 'should' only ever come from our own trusted code. In a fintech context specifically, that discipline isn't paranoia, it's the actual job - the backend authorization and validation layer is the only layer I'd ever call a true security boundary, and everything else is valuable, real, layered defense in depth on top of it."

---
