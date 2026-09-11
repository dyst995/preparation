# 13 - Security (Mobile)

> Goal: Speak with fintech-grade rigor about mobile client security - secure storage, transport security, anti-tampering awareness, deep link validation, permissions, and native bridge risks - at a depth that matches having shipped real fintech and government-adjacent apps (Orient Logic) plus payment flows (Wizer, EasyPay, MyCreditInfo).

Host knobs (ATS / networkSecurityConfig, backup, FileProvider, background limits): [native-developement/05](../native-developement/05-storage-background-security.md).

Mark progress with `[x]` as you master each topic.

---

## Learning objectives

By the end of this section you should be able to:

1. Justify Keychain/Keystore over AsyncStorage for anything sensitive, with mechanism-level detail.
2. Explain SSL/certificate pinning tradeoffs honestly, including its real-world limitations.
3. Discuss jailbreak/root detection as one layer of defense-in-depth, not a silver bullet.
4. Explain obfuscation's actual purpose and limits (raising cost, not achieving secrecy).
5. Implement and justify screenshot/screen-recording protection on sensitive screens.
6. Validate deep links so they can't be used to bypass auth or trigger unauthorized actions.
7. Apply least-privilege permission requests and explain the reasoning.
8. Explain why secrets should never ship inside the JS bundle, with a concrete mechanism.
9. Identify native bridge security risks (overly permissive exposed methods, unvalidated input crossing the JS/native boundary).
10. Answer fintech-focused security questions with concrete, defensible tradeoffs rather than absolutist claims.

---

## 1. Secure storage: Keychain/Keystore vs AsyncStorage

### Topics to learn
- [ ] What AsyncStorage actually is (unencrypted, plain key-value on disk)
- [ ] iOS Keychain: hardware-backed encryption, access control classes
- [ ] Android Keystore: hardware-backed key storage, EncryptedSharedPreferences layered on top
- [ ] What belongs in secure storage vs regular storage
- [ ] Biometric-gated secure storage access
- [ ] Migration risk (moving existing AsyncStorage secrets to secure storage)

### Why AsyncStorage is unsafe for sensitive data

AsyncStorage persists data as **plain, unencrypted files** on the device (SQLite on Android historically, plist-backed on iOS). Anyone with:
- physical device access + basic tooling on a rooted/jailbroken device, or
- a backup extraction tool, or
- filesystem access via a compromised app on an insecure device

...can read AsyncStorage contents directly. It was never designed as a security boundary - it's a convenience cache for non-sensitive UI state (theme preference, onboarding-seen flags, non-sensitive cached data).

### Keychain (iOS) / Keystore (Android) comparison

| Aspect | AsyncStorage | iOS Keychain | Android Keystore |
|---|---|---|---|
| Encryption at rest | None | OS-managed, hardware-backed on modern devices | Hardware-backed key storage; typically paired with EncryptedSharedPreferences/Jetpack Security for values |
| Access control | None | Access control classes (e.g. only when unlocked, biometric-required) | Key-level access control, can require biometric/lock-screen auth to use the key |
| Survives app deletion | N/A (deleted with app) | Can persist across reinstall depending on config (an important nuance to know) | Deleted with app data by default |
| Appropriate for | UI prefs, non-sensitive cache | Auth tokens, refresh tokens, biometric keys | Auth tokens, refresh tokens, biometric keys |
| Common RN library | `@react-native-async-storage/async-storage` | `react-native-keychain` or similar | `react-native-keychain` (uses Keystore-backed encryption underneath) |

### Interview question

**Q: Why is AsyncStorage unsafe for tokens?**

> "AsyncStorage is unencrypted plain storage on disk - it was designed for convenience, not as a security boundary. On a rooted or jailbroken device, or via a backup extraction tool, that data is trivially readable. For anything sensitive - auth tokens, refresh tokens, PII - I use the platform secure storage: iOS Keychain or Android Keystore-backed encrypted storage, both of which are hardware-backed on modern devices and support access control like requiring the device to be unlocked or biometrics to actually use the stored value. In a fintech app this isn't optional - it's table stakes."

**Follow-up: what about performance - Keychain/Keystore access is slower, does that matter?**
> Yes, slightly - it's not meant for high-frequency reads. Practical pattern: read the token once into memory at app start/auth, keep it in memory for the session, and only touch secure storage on write or explicit refresh, not on every request.

### Green flags
- Knows AsyncStorage is a cache, not a vault, and can explain *why* mechanically.
- Knows Keychain items can survive app deletion depending on configuration - a real gotcha for logout/reinstall testing.
- Has an actual in-memory caching strategy instead of hitting secure storage on every request.

---

## 2. SSL/certificate pinning tradeoffs

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

## 3. Jailbreak/root detection awareness

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

## 4. Obfuscation (reducing reverse engineering risk)

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

## 5. Screenshot / screen recording protection

### Topics to learn
- [ ] Android `FLAG_SECURE` (blocks screenshots and appearing in the recent-apps switcher thumbnail)
- [ ] iOS limitations (no equivalent OS-level flag to block screenshots; can detect and react, e.g. blur on screenshot event or app-switcher snapshot)
- [ ] Which screens need this (balances, card numbers, PINs, sensitive documents)
- [ ] UX tradeoff: don't overuse it on non-sensitive screens

### Practical pattern

| Platform | Mechanism | Behavior |
|---|---|---|
| Android | `FLAG_SECURE` on the window | Screenshots blocked entirely; recent-apps thumbnail shows blank/black |
| iOS | No true screenshot-block API | Can detect `UIApplication.userDidTakeScreenshotNotification` to react (e.g. warn, log) after the fact; can blur content in the app-switcher snapshot via `applicationDidEnterBackground`/`willResignActive` hooks so sensitive data isn't visible in the OS task switcher |

### Interview question

**Q: How do you protect a sensitive screen (like showing a full card number) from screenshots?**

> "On Android I'd apply `FLAG_SECURE` to that screen's window, which blocks screenshots and screen recording entirely and blanks the recent-apps thumbnail. iOS doesn't give you a true block API, so the pattern there is to detect the screenshot notification and react - warn the user or log it for audit purposes - and, separately, blur or hide sensitive content when the app moves to the background so it's not visible as a snapshot in the iOS app switcher. I'd scope this to genuinely sensitive screens only - applying it everywhere hurts legitimate use cases like sharing a receipt screenshot."

---

## 6. Deep link validation

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

## 7. Permissions: least privilege

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

## 8. Secrets never in the bundle

### Topics to learn
- [ ] Why the JS bundle is fully inspectable (it's just JS shipped to the device)
- [ ] Native binary "secrets" are also extractable, just with more effort
- [ ] The correct model: secrets live server-side, client gets short-lived, scoped credentials
- [ ] Environment config vs secrets (a base URL is not a secret; an API signing key is)
- [ ] Backend-mediated third-party API calls instead of embedding third-party secret keys client-side

### The core mechanism to explain

Your JS bundle - even minified/obfuscated - ships to every user's device and can be unpacked and read. Any string embedded in it, "secret" or not, is recoverable by a motivated party. The same is largely true, with more effort, for strings embedded in the compiled native binary. **There is no truly secure place to hide a static secret on the client.**

### The correct architecture

| Client has | Client does NOT have |
|---|---|
| Short-lived, scoped access tokens obtained after authenticating with your backend | Long-lived API keys for third-party services |
| Public, non-sensitive config (API base URLs, feature flag identifiers) | Signing keys, private keys, database credentials |
| Ability to call your own backend, which then calls third parties server-side | Direct third-party secret keys embedded to call a paid API directly from the device |

### Interview question

**Q: A teammate wants to embed a third-party API secret key directly in the app to save a backend round trip. What do you tell them?**

> "That the JS bundle - and to a lesser extent the compiled native binary - is fully inspectable by anyone with the shipped app, obfuscation or not, so any embedded secret is effectively public once released. The correct pattern is to proxy that call through our own backend: the client authenticates with us using short-lived, scoped tokens, and the backend holds the real third-party secret and makes that call server-side. It's a bit more latency and infrastructure, but it's the only version of this that's actually secure rather than just harder to find."

---

## 9. Native bridge security issues

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

## Hands-on drills (do these)

- [ ] Write a one-paragraph justification for Keychain/Keystore over AsyncStorage as if explaining it to a junior engineer.
- [ ] Explain SSL pinning's rotation risk out loud, including your specific mitigation (public key/intermediate + backup pins).
- [ ] Draw the deep link validation flow: link received -> parse -> validate params -> check auth -> navigate/confirm.
- [ ] List every sensitive screen in a hypothetical fintech app and decide screenshot-protection policy for each.
- [ ] Explain, without notes, why a bundle-embedded API key is never actually secret.
- [ ] Design the WebView allow-list policy for a hypothetical "help center" WebView screen that also needs a JS bridge for basic navigation events.
- [ ] Practice the "teammate wants to embed a secret key" scenario as a live roleplay answer.

---

## Senior red flags / green flags

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

## Tie-backs to your experience (use in answers)

- Working across **fintech and government-adjacent applications at Orient Logic** means you can speak to security expectations that go beyond a typical consumer app - a strong differentiator to mention explicitly.
- Payment-related work at **Wizer and EasyPay** gives you concrete grounding for token storage, transport security, and sensitive-screen protection questions - don't answer these only in the abstract, reference the real context.
- Legacy modernization (**MyCreditInfo**) likely meant inheriting insecure patterns (e.g. tokens in AsyncStorage) and having to migrate them safely - a great concrete story if asked "tell me about improving security in an existing app."
- Your crash-reduction discipline (Chapter 12) pairs naturally with a security answer: defensive input validation at boundaries reduces both crashes *and* the native-bridge/API-boundary risks discussed here - a good way to connect chapters if asked a broader "how do you think about robustness" question.

---

## Senior-Level Best Practices

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

## Mastery checklist

- [ ] I can justify Keychain/Keystore over AsyncStorage mechanically, not just "it's more secure."
- [ ] I can explain SSL pinning's benefits and its real operational risk (rotation) with a mitigation plan.
- [ ] I can frame jailbreak/root detection and obfuscation honestly as defense-in-depth, not guarantees.
- [ ] I can explain platform differences in screenshot protection precisely.
- [ ] I can explain deep link validation end-to-end, including the auth re-check step.
- [ ] I can articulate least-privilege permission practices with a concrete example.
- [ ] I can explain, mechanically, why client-side secrets are never truly secret.
- [ ] I can identify native bridge and WebView bridge risks unprompted.
- [ ] I can tie every answer back to real fintech/government-adjacent work I've shipped.
