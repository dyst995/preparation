# 09 — Forms, UX Patterns & Fintech-Specific Flows

> Goal: Be able to design and defend every UX decision in a money-moving flow — keyboard handling, validation, precision, QR payments, wallet/loan states, idempotency, session security, accessibility, and offline/empty/error states — using EasyPay as your running example.

Mark progress with `[x]` as you master each topic.

---

## Learning objectives

By the end of this section you should be able to:

1. Handle keyboard behavior correctly and consistently across iOS/Android without layout jumps.
2. Design a validation strategy that balances immediate feedback with not being annoying.
3. Explain why money must never be represented as floating-point and how to format currency correctly.
4. Design a full QR payment flow, including error paths.
5. Model transfer/wallet/loan screens as explicit states, not ad hoc booleans.
6. Prevent double-submission and design idempotent payment actions.
7. Implement session timeout and re-auth flows appropriate for a fintech app.
8. Apply core mobile accessibility practices.
9. Design empty/error/offline states that don't feel like dead ends.
10. Explain background screenshot/app-switcher protection and why it matters for fintech.
11. Walk through the entire EasyPay flow (auth ? QR payment ? transfer ? wallet ? loans) as a cohesive architecture story.

---

## 1. Keyboard handling

### Topics to learn
- [ ] `KeyboardAvoidingView` and its platform-specific `behavior` prop (`padding` on iOS, `height`/`position` considerations on Android)
- [ ] `keyboardVerticalOffset` and header/safe-area interactions
- [ ] Modern alternatives: `react-native-keyboard-controller` (`KeyboardAvoidingView`/`KeyboardStickyView` replacements with smoother, native-driven animations)
- [ ] `ScrollView` + `keyboardShouldPersistTaps` for forms with buttons below inputs
- [ ] Avoiding layout jumps when the keyboard opens/closes
- [ ] Auto-scrolling to the focused input (`scrollToFocusedInput` patterns)
- [ ] `returnKeyType`, `onSubmitEditing`, and chaining focus between inputs (ref-based `focus()` calls)
- [ ] Numeric keypad types for money inputs (`keyboardType="decimal-pad"` / `numeric`) and their platform quirks (e.g. decimal separator differences by locale)

### Why this is harder than it looks

RN doesn't reflow the whole page like a web browser resizing its viewport. You explicitly own:
- Whether content pushes up (`padding`) or the view resizes to fit above the keyboard.
- Whether taps on buttons rendered above the keyboard are swallowed before the keyboard dismisses (`keyboardShouldPersistTaps="handled"` fixes this classic bug).
- Whether the focused input is visible at all once the keyboard opens (a bottom-of-screen input can end up hidden unless you scroll to it manually).

### Platform behavior differences

| Aspect | iOS | Android |
|---|---|---|
| Keyboard covers content by default | Yes, needs `KeyboardAvoidingView` | Usually handled by `windowSoftInputMode="adjustResize"` in the manifest, but can conflict with `KeyboardAvoidingView` if both fight over resizing |
| Recommended `behavior` | `padding` | Often `undefined`/`height`, or rely on manifest `adjustResize` and skip `KeyboardAvoidingView` entirely |
| Decimal keypad separator | Respects device locale automatically | Same, but older Android versions have had inconsistent `decimal-pad` support — test on real low-end devices |

### Interview question

**Q: A form's submit button gets hidden behind the keyboard on iOS but works fine on Android. Why, and how do you fix it?**

> "iOS doesn't automatically resize the view when the keyboard appears — Android often does via `adjustResize` in the manifest. On iOS I wrap the screen in `KeyboardAvoidingView` with `behavior=\"padding\"` (and a `keyboardVerticalOffset` accounting for the header/safe area), or migrate to `react-native-keyboard-controller` for a smoother native-driven experience. I also make sure the scroll container uses `keyboardShouldPersistTaps=\"handled\"` so the first tap on the button actually registers instead of just dismissing the keyboard."

---

## 2. Validation strategies

### Topics to learn
- [ ] Schema-based validation (Zod/Yup) paired with `react-hook-form` for RN forms
- [ ] Validation timing: on blur vs on change vs on submit, and why timing affects perceived friction
- [ ] Async validation (e.g. checking if a recipient account number exists) with debouncing
- [ ] Field-level vs form-level error display
- [ ] Server-driven validation errors mapped back onto specific fields
- [ ] Disabling submit vs allowing submit-then-show-errors (accessibility and UX tradeoffs)

### Timing strategy table

| Strategy | Feels like | Best for |
|---|---|---|
| Validate on every keystroke | Naggy if done for length/format errors early | Real-time formatting feedback (e.g. card number spacing), not error shaming |
| Validate on blur | Balanced — user gets feedback after finishing a field | Most form fields (email format, required fields) |
| Validate only on submit | Least naggy, but user finds all errors at once, at the end | Simple/short forms, or as a fallback with field-level on-blur layered on top |
| Debounced async validation | Necessary for anything requiring a network round trip | Recipient/account lookups, username availability |

### Interview question

**Q: How do you validate a money-transfer form without annoying the user?**

> "I use a schema (Zod) with `react-hook-form`, validating most fields on blur so errors appear once the user's done with a field, not mid-keystroke. For anything numeric like amount, I do live formatting rather than live error-shaming — reformat as they type, don't flag 'invalid' until they've stopped. For anything requiring a server round trip, like validating a recipient account number, I debounce the check and show a lightweight inline spinner rather than blocking the whole form. On submit, I re-run full validation and map any server-side errors (e.g. 'insufficient funds') back onto the relevant field or a form-level banner, since some errors can only be known server-side."

---

## 3. Money formatting, precision, and currencies

### Topics to learn
- [ ] Why floating-point (`number` in JS) is unsafe for money math (binary floating-point can't represent many decimal fractions exactly)
- [ ] Representing money as integer minor units (cents/tetri) for arithmetic, formatting only at display time
- [ ] `Intl.NumberFormat` for locale-correct currency display
- [ ] Rounding strategy consistency (always round the same way, ideally server-authoritative)
- [ ] Multi-currency display and conversion-rate staleness warnings
- [ ] Never trust client-computed totals for anything that gets submitted — server must re-validate/re-compute

### The core rule

> **Never do money arithmetic in floating-point `number`.** Store and compute in integer minor units (e.g. cents), and only convert to a decimal string at the final display step. If you need arbitrary precision or currency-safe math libraries, use a dedicated decimal library rather than raw `+`/`-`/`*` on floats.

```ts
// BAD — floating point drift
const total = 0.1 + 0.2; // 0.30000000000000004

// BETTER — integer minor units, format only for display
const amountInCents = 1050; // 10.50
const formatted = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
}).format(amountInCents / 100);
```

### Interview question

**Q: Why shouldn't you store money as a JS `number` and do direct arithmetic on it?**

> "Binary floating-point can't exactly represent many decimal fractions, so repeated arithmetic accumulates rounding drift — `0.1 + 0.2` isn't exactly `0.3` in floating point. In a fintech context that's unacceptable; a fraction of a cent of drift compounding across thousands of transactions is a real liability. I represent amounts as integer minor units (cents) for all arithmetic and comparisons, and only convert to a formatted decimal string at the final display layer using something like `Intl.NumberFormat` for locale-correct currency symbols and separators. And critically, the client never has final authority over a computed total — the server recomputes and validates it before committing any transaction."

**Follow-up:** How do you handle displaying amounts in multiple currencies?
> Store the amount and its currency together, format with `Intl.NumberFormat` per-currency, and if you show converted estimates, clearly label them as estimates with the rate's timestamp — never let a stale conversion rate look authoritative on a confirmation screen.

---

## 4. QR payment flows

### Topics to learn
- [ ] Camera permission request UX (contextual priming before the OS prompt)
- [ ] Scanning library integration (`react-native-vision-camera` + a barcode/QR frame processor, or a dedicated scanner library)
- [ ] Parsing and validating the scanned payload before acting on it (never trust raw QR content blindly)
- [ ] Handling malformed/unsupported QR codes gracefully
- [ ] Torch/flashlight toggle, focus/tap-to-focus UX
- [ ] Confirmation screen before committing the payment (never pay directly on scan)
- [ ] Receipt/success screen with clear transaction reference

### The QR payment flow (state by state)

```
[Scan screen]
   -> camera permission granted? -- no --> [Permission rationale + settings deep link]
   -> yes
   -> scan QR
   -> parse payload
      -> invalid/unsupported format --> [Inline error, allow rescan]
      -> valid
   -> [Confirmation screen: recipient, amount, fee, editable? clarify]
   -> user confirms (biometric/PIN step if required)
   -> [Processing state]
      -> success --> [Receipt screen with reference id, share/save option]
      -> failure --> [Error screen with retry, clear reason, no silent charge]
```

### Interview question

**Q: Walk me through a QR payment flow end-to-end, including error handling.**

> "First, I request camera permission with a short contextual explanation before the system prompt so the user understands why, which improves grant rates. Once scanning, I never act directly on raw QR content — I parse and validate the payload against an expected schema (e.g. merchant id, amount, reference), and if it doesn't match, I show an inline error and let them rescan rather than crashing or guessing. On a valid scan, I always route to a confirmation screen showing recipient, amount, and any fee — I never auto-submit a payment straight from a scan. Confirmation may require a biometric or PIN step depending on amount thresholds. During submission I show an explicit processing state, and on completion I show a receipt with a transaction reference; on failure, a clear reason and a retry path that doesn't risk a duplicate charge — which ties directly into idempotency."

---

## 5. Transfer / wallet / loan UI states

### Topics to learn
- [ ] Modeling screen state as an explicit finite set (`idle | loading | success | error | empty`) instead of multiple independent booleans
- [ ] Why `isLoading` + `isError` + `data` as three separate booleans invites impossible states (loading AND error both true)
- [ ] Pending/processing states unique to money movement (e.g. a transfer that's accepted but not yet settled)
- [ ] Optimistic UI vs pessimistic UI for financial actions (usually pessimistic for state-changing money actions; optimistic acceptable for reversible/non-critical UI)
- [ ] Retry vs "contact support" fallback thresholds
- [ ] Partial failure handling in multi-step flows (e.g. transfer initiated but confirmation step times out — did it go through or not?)

### State machine over boolean soup

```ts
type TransferState =
  | { status: 'idle' }
  | { status: 'validating' }
  | { status: 'confirming'; details: TransferDetails }
  | { status: 'submitting' }
  | { status: 'pending'; reference: string } // accepted, not yet settled
  | { status: 'success'; reference: string }
  | { status: 'failed'; reason: string; retryable: boolean };
```

Modeling it this way means the UI can render a single `switch` and it's impossible to be simultaneously "loading" and "showing stale success data," which is a very common real bug class with boolean-flag state.

### The "did it actually go through?" problem

The scariest UX bug in fintech: a request times out client-side, but the server actually processed it. If the UI just shows "failed, tap to retry" and the user retries, you may create a duplicate transfer. Mitigations:
- Idempotency keys (see next section) so a retried request is safely deduplicated server-side.
- A distinct "pending / unknown, checking status" state instead of collapsing timeouts into "failed."
- A status-polling or push-notification-driven confirmation once the true outcome is known.

### Interview question

**Q: How do you handle a network timeout on a money transfer where you don't know if it succeeded?**

> "I don't collapse a timeout into a hard 'failed' state, because the request may have actually succeeded server-side. I show a distinct 'pending / confirming' state, and either poll a status endpoint or wait for a push notification/websocket event that tells us the true outcome. Critically, the original request carries an idempotency key, so even if the user does end up retrying, the server recognizes it as the same logical operation and doesn't double-process it. Only once I have a definitive success or failure from the server do I show a final receipt or error screen."

---

## 6. Idempotency UX

### Topics to learn
- [ ] What an idempotency key is and why it's generated client-side per logical action (e.g. UUID at "confirm" tap, not regenerated on retry)
- [ ] Client-side guard: disabling the action immediately on tap, before the network call even resolves
- [ ] Server-side guard: the actual safety net — dedupe requests with the same idempotency key within a time window
- [ ] Why client-side disabling alone is not sufficient (double-tap races, app backgrounding mid-request, network retries at lower layers)
- [ ] Communicating "already processed" gracefully instead of erroring confusingly

### The two-layer defense

| Layer | Mechanism | Protects against |
|---|---|---|
| Client (UX) | Disable button / show spinner immediately on tap; ignore further taps until response | Accidental double-taps, impatient re-tapping |
| Client (correctness) | Generate one idempotency key when the user confirms; reuse the *same* key if retrying the *same* logical action | Network retries, app relaunch mid-flight, ambiguous timeouts |
| Server (source of truth) | Store/check idempotency key; if seen before, return the original result instead of reprocessing | The actual guarantee — client-side alone can't be trusted |

### Interview question

**Q: How do you prevent double-submit on a payment button, and why isn't disabling the button alone enough?**

> "Disabling the button on first tap is the UX-level guard — it prevents an impatient double-tap from firing two requests. But it's not sufient on its own: the app could background and resume mid-request, a lower-level network retry could resend the request, or the response could time out while the server actually processed it. The real safety net is an idempotency key generated once when the user confirms the action, sent with the request, and reused if that same logical action needs to be retried. The server treats any repeated request with the same key as the same operation and returns the original result instead of processing it again. So it's a two-layer defense: UX-level button disabling for immediate feedback, and idempotency-key deduplication for actual correctness."

---

## 7. Session timeout and re-auth

### Topics to learn
- [ ] Inactivity-based timeout vs fixed-duration token expiry
- [ ] `AppState`-driven background timer (see file 08) combined with an in-foreground inactivity timer (touch/gesture activity resets it)
- [ ] Step-up authentication: low-risk actions need nothing extra; high-risk actions (large transfer, adding a new payee) require a fresh biometric/PIN check even mid-session
- [ ] Silent token refresh vs forcing full re-login
- [ ] Graceful UX: warn before forced logout (e.g. "You'll be logged out in 30 seconds") vs abrupt logout

### Interview question

**Q: How do you design an auth flow with biometrics, PIN, and password fallback?**

> "Password/credentials establish the initial session and issue tokens. After that, biometrics become the fast-path re-entry method, gated by secure storage as covered in file 08 — successful biometric auth unlocks the stored refresh token silently. PIN is typically the fallback when biometrics fail or aren't enrolled, since it doesn't require server round-trips to verify quickly and works when Face ID/fingerprint is unavailable. For sensitive step-up actions — say, a transfer above a threshold, or adding a new payee — I require a fresh biometric or PIN check even within an already-authenticated session, independent of the general session timeout, since a stolen unlocked phone shouldn't grant unlimited financial actions."

---

## 8. Accessibility

### Topics to learn
- [ ] `accessible`, `accessibilityLabel`, `accessibilityRole`, `accessibilityHint`
- [ ] `accessibilityState` (`disabled`, `selected`, `busy`) for custom controls
- [ ] Minimum touch target size (roughly 44×44pt iOS / 48×48dp Android guidance)
- [ ] Dynamic type / font scaling support (`allowFontScaling`, avoiding fixed-height text containers that clip scaled text)
- [ ] Color contrast for critical text (amounts, error states)
- [ ] Screen reader flow order (grouping related elements, avoiding a chaotic reading order)
- [ ] Announcing dynamic changes (e.g. `AccessibilityInfo.announceForAccessibility` for a payment result)

### Interview question

**Q: What accessibility basics do you apply by default in a fintech screen?**

> "Every interactive element gets a meaningful `accessibilityLabel` and correct `accessibilityRole` — a custom `Pressable` styled as a button still needs `role=\"button\"` for screen readers. I keep touch targets at least ~44pt/48dp even if the visual design is smaller, using hit-slop if needed. I avoid fixed-height text containers for amounts and labels so they don't clip when a user has larger system font sizes enabled, and I make sure error and success states aren't conveyed by color alone — there's always an icon or text label too. For state changes that aren't visually obvious to a screen reader user, like a payment completing, I announce it explicitly rather than relying on them to notice a visual change."

---

## 9. Empty / error / offline states

### Topics to learn
- [ ] Designing each of: empty (no data yet, not an error), error (something broke), offline (no connectivity), loading/skeleton
- [ ] Giving each state a clear next action, not a dead end (retry button, "add your first X" CTA, explanation)
- [ ] Distinguishing "no results for this filter" from "no data exists yet" from "failed to load"
- [ ] Offline-first considerations: cached last-known data with a "showing offline data" indicator vs a hard blocking screen
- [ ] Skeleton loaders vs spinners for perceived performance

### State design table

| State | What the user sees | What they can do next |
|---|---|---|
| Empty (no data yet) | Friendly illustration/text: "No transactions yet" | CTA relevant to the screen (e.g. "Make your first transfer") |
| Empty (filtered) | "No results match your filters" | Clear/reset filters action |
| Error (request failed) | Clear, non-technical message + reason if safe to show | Retry button; support contact for repeated failures |
| Offline | Banner indicating offline + cached data still shown if available | Auto-retry on reconnect; manual retry option |
| Loading (first load) | Skeleton matching the eventual layout | N/A, but avoid layout shift once data arrives |

### Interview question

**Q: What UX states must every fintech action screen support, at minimum?**

> "At minimum: idle/initial, loading, success, error (with retry), empty (when applicable, distinguished from an error), and offline. For anything involving money movement specifically, I also add a pending/processing state that's distinct from both loading and error, because a request in flight or awaiting server confirmation isn't the same as either — collapsing them causes exactly the 'did it go through?' problem we discussed with idempotency."

---

## 10. Double-submit prevention (deeper pattern)

### Topics to learn
- [ ] Disabling the trigger element synchronously in the same event handler tick, before any `await`
- [ ] Using a ref-based in-flight guard rather than relying purely on state (state updates can lag a frame)
- [ ] Debouncing rapid re-taps distinctly from disabling (debounce for accidental double-taps, disable for the full request duration)
- [ ] Combining client guard + idempotency key (see section 6) as the full solution

### Interview question

**Q: In code, how exactly do you prevent a double network call from a fast double-tap, beyond just an idempotency key?**

> "I use a ref (not state) as an in-flight guard, because state updates can be asynchronous and a very fast double-tap can fire before a re-render disables the button. The handler checks and sets the ref synchronously at the very top, before any `await`, so the second tap is rejected immediately regardless of render timing. The button's disabled *visual* state can lag slightly behind, but the actual guard against firing two requests is the synchronous ref check plus the idempotency key as the ultimate server-side backstop."

---

## 11. Background screenshot / app-switcher protection

### Topics to learn
- [ ] Android: `FLAG_SECURE` window flag blocks both screenshots/screen recording and hides content in the recent-apps thumbnail
- [ ] iOS: no equivalent flag to block screenshots (Apple doesn't allow apps to prevent OS-level screenshots), but you can react to the app entering background/inactive by rendering a blur/cover overlay so the app-switcher snapshot doesn't expose sensitive content
- [ ] Detecting screenshot events on iOS (`UIApplicationUserDidTakeScreenshotNotification` equivalent) to react after the fact, since you can't block it
- [ ] Why this matters specifically for fintech: balances, account numbers, and transaction details showing up in the OS task switcher or in an accidentally-shared screenshot
- [ ] Scoping protection to sensitive screens only (balance, transfer, card details) rather than the whole app, to avoid hurting normal UX (e.g. support screenshots for bug reports on non-sensitive screens)

### Platform comparison

| Platform | Can you block screenshots? | Can you hide app-switcher thumbnail? | Typical approach |
|---|---|---|---|
| Android | Yes — `FLAG_SECURE` | Yes — same flag | Set `FLAG_SECURE` on sensitive activities/screens |
| iOS | No — OS doesn't allow blocking screenshots | Not directly, but you can render a cover/blur view the instant the app resigns active, which also happens to obscure the app-switcher snapshot | Listen for `willResignActive` / `AppState` change to `inactive`/`background`, show a blur/branding overlay, remove it on `active` |

### Interview question

**Q: How would you protect sensitive screens (like an account balance) when the app goes to the background?**

> "On Android, I'd apply `FLAG_SECURE` on sensitive screens, which both blocks screenshots/screen recording and blanks the thumbnail in the recent-apps switcher. iOS doesn't let apps block screenshots at the OS level, so the practical approach there is listening for the app resigning active — via `AppState` or the native `willResignActive` lifecycle — and immediately rendering a blur or branded cover view over the sensitive content, removing it once the app is active again. That at least prevents the balance or account details from being visible in the iOS app-switcher snapshot, even though a deliberate screenshot on iOS can't technically be blocked."

---

## 12. Full interview question bank (with answer targets)

### Keyboard & input UX
1. **iOS vs Android keyboard-avoidance differences?** ? `KeyboardAvoidingView` behavior, manifest `adjustResize`.
2. **How do you avoid a hidden submit button behind the keyboard?** ? padding behavior + offset + `keyboardShouldPersistTaps`.

### Validation
3. **On-blur vs on-change vs on-submit — when each?**
4. **How do you show server-side validation errors on specific fields?**

### Money & precision
5. **Why never use floating point for money?** ? binary fraction imprecision; use integer minor units.
6. **How do you format currency correctly for multiple locales?** ? `Intl.NumberFormat`.

### QR & scanning
7. **Full QR payment flow with error handling?**
8. **Why never auto-submit directly from a scan?** ? always confirm first.

### State modeling
9. **Why model screen state as a union/state machine instead of booleans?** ? prevents impossible states.
10. **How do you handle "network timed out, unknown outcome" for a transfer?** ? pending state + status check/poll + idempotency key.

### Idempotency
11. **How do you prevent double-submit, and why isn't disabling the button alone enough?**
12. **What is an idempotency key and where is it generated?** ? client, once per logical action, reused on retry.

### Session & auth
13. **How do you implement session timeout after backgrounding?**
14. **What is step-up authentication and when do you require it?**

### Accessibility
15. **What accessibility props matter most for a custom pressable component?**
16. **How do you support dynamic type without breaking layout?**

### Empty/error/offline
17. **What states must a fintech action screen support at minimum?**
18. **How do you differentiate "empty" from "error" in the UI?**

### Screenshot protection
19. **How do you protect a balance screen from appearing in the app switcher?**
20. **Why can't you block screenshots on iOS the way you can on Android?**

---

## 13. Hands-on drills (do these)

- [ ] Build a small transfer-amount input using integer cents internally and `Intl.NumberFormat` for display; deliberately try `0.1 + 0.2` in floating point first to see the bug, then fix it.
- [ ] Implement a `TransferState` discriminated union and render a `switch` over it instead of boolean flags.
- [ ] Add a ref-based in-flight guard to a submit handler and try to break it with rapid double-tapping before and after.
- [ ] Wire up `FLAG_SECURE` on an Android screen (or explain exactly where you'd add it) and implement an iOS blur-on-background overlay.
- [ ] Write a validation schema (Zod) for a transfer form with amount, recipient, and note fields, with proper error messages.
- [ ] Design (on paper) the empty/error/offline/pending states for a "Transactions" list screen.
- [ ] Practice explaining idempotency keys out loud in under 90 seconds, distinguishing the client UX guard from the server-side guarantee.

---

## 14. EasyPay flow walkthrough (use this as your flagship story)

You designed EasyPay's architecture, navigation, and tech stack from scratch — this is your strongest end-to-end narrative. Structure it like this when asked "walk me through a project you built":

1. **Auth**: Login with credentials issues tokens; refresh token stored in secure storage (Keychain/Keystore); biometric login layered on top for fast re-entry; step-up biometric/PIN required again for high-risk actions.
2. **Home / Wallet**: Balance and recent activity, wallet state modeled explicitly (loading/empty/error/loaded), sensitive balance screen protected with `FLAG_SECURE` (Android) / blur-on-background (iOS).
3. **QR Payment**: Camera permission ? scan ? validate payload ? confirmation screen (recipient, amount, fee) ? biometric/PIN confirm for step-up ? idempotent submit ? pending/processing state ? success receipt or clear failure with retry.
4. **Transfers**: Recipient selection, amount entry with integer-cents formatting, validation (Zod + react-hook-form), confirmation, idempotent submit, same pending/success/failure state machine as QR payments.
5. **Loans**: Multi-step application flow reusing the same form validation and state-machine patterns; clear application-status states (submitted, under review, approved, rejected) distinct from simple loading/error.
6. **Notifications**: Push (FCM) + Notifee for transaction/security alerts; tapping a notification deep-links into the exact transaction via the same central routing function used for real deep links (see file 08).
7. **Releases**: Fastlane-driven Android/iOS release pipeline, staged rollouts so any regression in a payment flow is caught on a small percentage of users first (ties back to file 08's Crashlytics + staged rollout discipline).

### Interview framing

> "EasyPay is the project I can speak to most completely because I owned the architecture end-to-end. I designed the auth flow with biometric-gated secure storage, all money-movement screens as explicit state machines rather than boolean soup, idempotency keys on every payment-type action, and step-up authentication for sensitive actions independent of the general session timeout. Notifications and deep links share one routing function so behavior is consistent whether the user taps a push notification or opens a link. And releases go out through a Fastlane pipeline with staged rollout, so if something regresses in a payment flow, it's caught on a small slice of users, not everyone."

---

## Senior red flags / green flags

### Green flags interviewers love
- Modeling state as a discriminated union instead of independent booleans, unprompted.
- Distinguishing the client-side UX guard from the server-side idempotency guarantee for double-submit prevention.
- Knowing money must be integer minor units, with a concrete floating-point example ready.
- Treating a network timeout as "unknown outcome," not "failure."
- Knowing iOS can't block screenshots but Android can, and having a real mitigation for each.

### Red flags
- "We just disable the button, that's enough" for double-submit prevention.
- Doing money math directly on floats with no minor-units strategy.
- No distinct "pending/unknown" state — timeouts always shown as hard failures.
- Accessibility treated as "add `accessibilityLabel` sometimes" with no touch-target or dynamic-type awareness.
- Believing iOS screenshots can be blocked like Android's `FLAG_SECURE`.

---

## Mastery checklist

- [ ] I can explain iOS vs Android keyboard-avoidance differences and fix a hidden-submit-button bug live.
- [ ] I can justify a validation-timing strategy (blur vs change vs submit) for a real form.
- [ ] I can explain and demonstrate integer-minor-units money handling with `Intl.NumberFormat`.
- [ ] I can design a full QR payment flow including every failure path.
- [ ] I can model a money-movement screen as a discriminated-union state machine.
- [ ] I can explain the two-layer idempotency defense (client guard + server dedupe key) precisely.
- [ ] I can design a session-timeout + step-up-auth strategy for sensitive actions.
- [ ] I can list core accessibility practices and apply them without prompting.
- [ ] I can design empty/error/offline/pending states for any list or action screen.
- [ ] I can explain Android `FLAG_SECURE` vs the iOS blur-on-background approach to screenshot protection.
- [ ] I can narrate the full EasyPay flow end-to-end as one cohesive architecture story.
