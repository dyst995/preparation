# 15. Senior-Level Best Practices

> Source: `interview-prep/react-native/09-forms-ux-fintech.md`

### Decision framework: how much friction does this action deserve?

Not every action in a fintech app should feel the same. Seniors calibrate friction to risk, explicitly:

```
1. Is this action reversible within a short window (e.g. edit a saved recipient nickname)?
   YES -> minimal friction, optimistic UI acceptable
   NO  -> continue

2. Does this action move money or change security-relevant state (new payee, changed limits, password change)?
   NO  -> standard validation, pessimistic UI, no step-up auth needed
   YES -> continue

3. Is the amount/impact above a risk threshold (large transfer, new payee, unusual pattern)?
   NO  -> require confirmation screen + normal session auth
   YES -> require step-up auth (fresh biometric/PIN) regardless of how recently the user last authenticated
```

This is the answer to "how do you decide when to ask for biometrics again mid-session" - it's not a fixed timer, it's a per-action risk decision, and being able to say that explicitly is what separates a senior UX conversation from a junior one.

### Production checklist: fintech UX risk

- [ ] Every money-moving action has an explicit confirmation step showing recipient, amount, and fee before submission - never submit directly from an input or scan.
- [ ] Every money-moving action carries a client-generated idempotency key, reused verbatim on retry of the same logical action.
- [ ] Network timeouts on money-moving requests render a distinct "pending/confirming" state, never a hard "failed" that invites an unsafe retry.
- [ ] All monetary values are integer minor units end-to-end (client state, API payloads, comparisons) - formatting to decimal happens only at the render boundary.
- [ ] The server is the final authority on any computed total, fee, or exchange rate - the client never submits a client-computed total as truth.
- [ ] Step-up authentication is required for a defined set of high-risk actions, documented and reviewed, not decided ad hoc per screen by whichever engineer builds it.
- [ ] Every screen touching balances/account numbers/card details has an explicit screenshot-protection decision (yes/no), not a default no one thought about.
- [ ] Session timeout uses wall-clock timestamp comparison on resume, not a background timer.
- [ ] Every list/action screen has a defined empty, error, offline, and (where relevant) pending state - "just a spinner forever" is not an acceptable fourth state.
- [ ] Currency conversion estimates are labeled as estimates with a rate timestamp wherever shown, never presented as final without a re-confirmation at execution time.

### Anti-patterns seniors reject

- **Disabling the submit button as the entire double-submit defense.** It's a UX nicety, not a correctness guarantee - app backgrounding, network-layer retries, and ambiguous timeouts all bypass a client-only guard.
- **Collapsing "timed out" and "failed" into the same UI state for a money-moving action.** This is the single most dangerous fintech UX bug class - it invites a user to retry an already-successful transfer.
- **Doing money arithmetic in floating point anywhere, even "just for display math."** Display-only drift still surfaces as a visibly wrong number to the user, which erodes trust even if the real ledger is correct server-side.
- **Auto-submitting a payment directly from a QR scan or deep link "to reduce friction."** Removes the one human checkpoint that catches a malformed/malicious payload before money moves.
- **Validating aggressively on every keystroke for format-only fields (email, name).** Trains users to feel attacked by the form; reserve on-change validation for live reformatting (money, card numbers), not error-shaming.
- **Treating accessibility as a post-launch pass.** Retrofitting `accessibilityLabel`/roles after a screen ships is 3-5x the effort of building it in, and screen-reader users on a balance screen are a real compliance and reputational risk, not an edge case.
- **Using color alone to convey success/failure/risk.** Fails both accessibility and colorblind users, and fintech confirmation screens are exactly where a missed error signal is costliest.

### Failure modes & debugging: fintech UX runbook

| Symptom | Likely root cause | Investigation approach |
|---|---|---|
| Users report "I got charged twice" | Idempotency key not reused on retry, or server-side dedupe window too short | Check whether the client regenerates a new key per tap vs per logical action; check server dedupe TTL against realistic retry timing |
| Displayed balance briefly shows wrong amount, self-corrects | Optimistic UI update using a client-computed value that's later overwritten by server truth | Audit whether a pessimistic update (wait for server confirmation) is more appropriate for that specific field |
| "0.1 + 0.2"-style penny discrepancies in a summary screen | Floating-point arithmetic snuck into a formatting/summary helper | Grep for direct arithmetic on values coming from an API that aren't first converted to integer minor units |
| Users abandon a form mid-flow at a specific field | Validation timing too aggressive (on-change error-shaming) or unclear error copy | Instrument field-level abandonment via analytics; test on-blur vs on-change against the abandonment metric directly |
| Support tickets: "I don't know if my transfer went through" | Missing pending/unknown state; timeout collapsed into a generic error | Verify the state machine has a distinct pending status wired to a real status-check mechanism (poll or push) |
| Screen reader users report confusing flow | Missing/incorrect `accessibilityRole`, chaotic reading order, unannounced dynamic changes | Manual VoiceOver/TalkBack pass on the specific screen; check for `AccessibilityInfo.announceForAccessibility` on state transitions |

### Observability / metrics that matter

- **Funnel drop-off rate per step** in money-movement flows (initiate -> confirm -> auth -> success) - the earliest signal that a UX friction point, not a bug, is costing conversions.
- **"Unknown outcome" rate** - what fraction of money-moving requests end in a timeout/ambiguous state rather than a definitive success/failure. This should trend toward zero; a rising trend is a reliability regression, not just a UX annoyance.
- **Idempotency key collision rate** (server-side) - a healthy signal it's actually being exercised by real retries, not just implemented and never hit.
- **Step-up auth abandonment rate** - if users frequently bail at the biometric/PIN re-check for high-risk actions, that's a signal the threshold or UX copy needs revisiting, not necessarily a signal to remove the check.
- **Accessibility-specific crash/error reports** (screen reader users hitting dead ends) - track separately since they're invisible in aggregate funnel metrics if screen-reader usage is a small percentage of overall users.

### Scalability & team practices

- Define the money-formatting and validation utilities **once**, in a shared package, and ban direct arithmetic on API-sourced amounts anywhere else via lint rule or code review checklist - this is the single highest-leverage guardrail against precision bugs at scale.
- Maintain a living **"risk tier" table** for actions (low/medium/high) mapped to required friction level (none/confirm/step-up-auth), reviewed whenever a new money-moving feature is designed, so friction decisions aren't reinvented per feature by whoever happens to build it.
- Run periodic (quarterly) accessibility audits on the top 5 money-moving screens specifically, not just at initial launch - regressions creep in silently as screens get restyled.
- Keep a shared "state machine template" (the `TransferState`-style discriminated union) as a documented pattern so new money-moving features don't reinvent boolean-soup state independently.

### Tradeoffs table: optimistic vs pessimistic UI for financial actions

| Aspect | Optimistic UI | Pessimistic UI |
|---|---|---|
| Perceived speed | Instant | Waits for server confirmation |
| Correctness risk | Can show a state that later gets rolled back (confusing/scary for money) | Always reflects confirmed server truth |
| Best for | Reversible, low-risk UI actions (marking a notification read, toggling a favorite) | Anything that moves money or changes security state |
| Fintech default | Rare - only for genuinely non-critical, easily-reversible interactions | Standard for transfers, payments, limit changes |

### Harder follow-up interview questions (with model answers)

**Q1: A PM wants to remove the confirmation screen on QR payments under $10 "to reduce friction since it's low risk." How do you respond?**
> "I'd separate two different things: reducing friction on the confirmation screen's design, and removing the confirmation step entirely. I'd push back specifically on removing it, because the confirmation screen isn't just a friction cost - it's the one point where a malformed or malicious QR payload gets caught by a human before money moves, regardless of amount. A low amount reduces financial blast radius per incident but doesn't reduce the chance of a parsing bug or a maliciously crafted code, and a bad UX pattern that ships for 'under $10' has a way of getting requested for higher thresholds later. I'd instead suggest streamlining the confirmation UI itself - fewer taps, clearer summary, maybe skip biometric step-up below the threshold - while keeping the explicit human confirmation step non-negotiable."

**Q2: How do you handle the case where a currency conversion rate changes between when a user views a transfer estimate and when they actually confirm it?**
> "I treat the initially-displayed rate as an estimate, explicitly labeled with a timestamp, and I re-fetch and re-display the current rate at the confirmation step itself, requiring the user to confirm the actual rate they'll get, not the one they saw a few screens back. If the rate moved meaningfully between estimate and confirm, I'd surface that difference explicitly rather than silently updating the number, since a silently changed total right before someone taps 'confirm' is exactly the kind of thing that erodes trust or triggers a support complaint even if it's technically correct."

**Q3: Your team wants to add a 'quick send' feature that skips the transfer form for frequent recipients, going straight from recipient tap to a pre-filled confirmation. Where's the line between good UX and cutting a corner?**
> "The line for me is: I can pre-fill and streamline everything up to and including the confirmation screen, but the confirmation screen itself - showing exact recipient, amount, and requiring an explicit confirm tap plus any step-up auth the amount warrants - has to stay. 'Quick send' should mean fewer taps to get to that checkpoint, not fewer checkpoints. I'd also make sure the pre-filled amount defaults to something safe (like the last amount, clearly editable) rather than silently reusing a stale value the user might not notice."

**Q4: How would you design idempotency for a multi-step flow where a transfer requires both an amount-confirmation step and a separate biometric step, and the app can be killed between those two steps?**
> "I'd generate the idempotency key once, at the point the user confirms the amount - not at the final biometric step - and persist it (in memory is fine if the flow is expected to complete quickly, but I'd persist it to secure storage if I want to survive an app kill) alongside the pending transfer's details. If the app is killed and reopened mid-flow, I'd detect the persisted pending state on launch, and either resume the flow with the same key or explicitly ask the user to confirm whether they want to resume or discard - critically, I never generate a fresh key for what's logically the same attempted transfer, because that defeats the entire purpose of having one."

**Q5: A user says a transfer amount displayed as $10.00 on the confirmation screen but $9.99 was actually charged. How do you approach root-causing this?**
> "This screams a formatting/rounding inconsistency between two code paths computing the same logical value differently - possibly one path doing float arithmetic and rounding at display time, another doing integer-cents arithmetic with a different rounding rule, or a fee calculation applied at a different point in one path than the other. I'd trace both the confirmation-screen amount and the actual charged amount back to their respective computation call sites, check whether both are working in integer minor units consistently, and check for any place a raw float divide/multiply snuck in - this exact bug class is why the 'never do money math in floating point, anywhere' rule has to be enforced everywhere, not just in the 'main' calculation function."

### Staff-level interview monologue: "How do you think about risk and UX friction together in a fintech app?"

> "I don't think about UX and risk as competing goals - I think about friction as a resource you spend deliberately, proportional to what's actually at stake in that specific action. A screen showing account settings gets almost zero friction. A one-time recipient lookup gets light friction - basic validation, maybe a debounced async check. A transfer gets a confirmation screen and an idempotency key, because the cost of getting it wrong is a duplicate real-money transaction. A large or first-time transfer gets step-up authentication on top of that, because the risk profile changed even though the general session is still 'authenticated.' The mistake I see teams make is applying a single friction policy everywhere - either annoying users on low-risk actions, or worse, being too lax on high-risk ones because 'the user already logged in.' Being explicit about that risk tiering, documenting it, and revisiting it as the product evolves is what actually scales - not a gut feeling per screen from whoever builds it that week."

---
