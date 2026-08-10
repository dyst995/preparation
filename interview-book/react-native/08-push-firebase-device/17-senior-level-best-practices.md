# 17. Senior-Level Best Practices

> Source: `interview-prep/react-native/08-push-firebase-device.md`

### Decision framework: is this a push-delivery problem, a presentation problem, or a routing problem?

When someone reports "notifications aren't working," resist the urge to guess. Walk the pipeline in order and bisect:

```
1. Did the backend actually call FCM successfully (check backend logs/response, not assumptions)?
   NO  -> backend/API problem, not a mobile problem at all
   YES -> continue

2. Did FCM report a successful send (not "queued", an actual delivery receipt or non-error)?
   NO  -> invalid/stale token, unregistered app instance, or FCM-side throttling
   YES -> continue

3. Is the token on file for this user actually current (was it refreshed/re-synced after reinstall/token rotation)?
   NO  -> token lifecycle bug (see below)
   YES -> continue

4. Is this a specific OEM/device/OS combination, or everyone?
   SPECIFIC -> OEM battery/background-kill quirk, or an OS-version permission change
   EVERYONE -> continue

5. Does it fail in foreground, background, or killed state specifically?
   FOREGROUND ONLY -> missing manual Notifee display call (classic gap)
   KILLED ONLY -> navigation-container-not-ready race, or getInitialNotification not wired
   ALL STATES   -> permission not granted, or channel importance too low to show
```

This is the answer senior engineers give instead of "I'd check the FCM console" - a structured elimination process that narrows the failure to one of four distinct subsystems before touching code.

### Production checklist: push reliability

- [ ] Backend logs the FCM response per send (message id or explicit error), not just "we called the API."
- [ ] Token refresh listener (`onTokenRefresh` equivalent) is wired and re-syncs to the backend every time, not just at login.
- [ ] Token is dissociated from the user server-side on logout (shared-device leak prevention) and re-registered on next login even for the same device.
- [ ] Stale/invalid tokens returned by FCM (`UNREGISTERED`/`InvalidRegistration`-class errors) are pruned server-side, not retried forever.
- [ ] Every notification channel's importance level is deliberately chosen and documented - Payments/Security default to `HIGH`, marketing defaults to lower.
- [ ] Foreground handler (`onMessage`) always explicitly displays via Notifee - never assume the OS will show anything while the app is open.
- [ ] Killed-state cold start is manually tested every release, not just background-state delivery (QA scripts frequently skip this because it's tedious).
- [ ] A dashboard exists correlating push send volume vs. actual open/tap rate per notification type, so silent delivery failures show up as a metric, not just support tickets.
- [ ] OEM battery-optimization guidance is documented in-app (a one-time "why am I not getting notifications" help screen) for MIUI/EMUI-heavy markets.
- [ ] Notification payloads never include PII beyond an opaque id (see PII section below) - not even in the notification body text for lock-screen-visible content.

### Anti-patterns seniors reject

- **Using notification-type (not data-only) messages "because it's simpler."** It hands presentation control to the OS and silently breaks custom channels, actions, and foreground display the moment you need any of them.
- **Retrying a push send against a token that already errored as unregistered.** Wastes FCM quota and hides a real "user stopped receiving pushes" bug behind apparent "success."
- **Testing push exclusively in foreground during development.** The killed-state path is the one that regresses silently and is the hardest to catch without deliberate testing.
- **Storing the notification payload's raw content in `AsyncStorage` "for debugging."** Turns a delivery mechanism into an unintentional PII leak vector.
- **One giant notification channel called "General" for everything.** Removes the user's ability to tune importance, and it's a one-way door - you can't silently re-partition it later without the user recreating settings.
- **Assuming `getInitialNotification()` fired means navigation happened.** It resolves with data; navigation is a separate step that can still silently no-op if the navigator isn't ready.

### Failure modes & debugging: push-specific runbook

| Symptom | First suspects | How to confirm |
|---|---|---|
| No notifications at all for one user | Invalid/stale token, permission revoked, notifications disabled at OS level | Check backend's last FCM response for that token; check on-device permission state |
| Notifications work on Android, not iOS (or vice versa) | Platform-specific setup gap (APNs auth key, capability not enabled, provisioning profile missing push entitlement) | Reproduce with a debug build on a real device; check native console logs at token-registration time |
| Works in foreground testing, "broken" in QA sign-off | Missing manual Notifee display in `onMessage`, or QA only tested foreground | Explicitly test all three app states before every release, not just once at feature launch |
| Intermittent delivery on specific Android OEMs | Background/battery-optimization kill | Cross-reference device model against known OEM-quirk table; ask user to whitelist and re-test |
| Tap-to-open works from background, not from killed | `getInitialNotification` race with navigator readiness | Add explicit logging around notification-arrival timestamp vs. `onReady` timestamp |
| Sudden drop in delivery rate after a release | A regression in the background handler registration order in `index.js`, or an accidental permission-prompt regression | Diff `index.js` and permission-request code between the last-known-good and current release |

### Observability / metrics that matter

- **Push send success rate** (FCM accepted vs. errored) - a leading indicator, catches problems before users complain.
- **Push open rate per notification type** - a silent failure looks identical to "nobody cared" unless you also track delivery separately from opens.
- **Time from send to display** (if instrumented) - flags OEM throttling patterns over time.
- **Crash-free rate segmented by whether a session started from a push tap** - catches killed-state navigation regressions that only manifest on that specific entry path.
- **Token churn rate** (refreshes/re-registrations per day) - an unexpected spike often correlates with a bad release causing reinstalls or forced re-logins.

### Scalability & team practices

- Maintain a single, versioned **payload contract** (shared TypeScript types or a schema doc) between backend and mobile so a backend change to a notification's `type`/`id` shape doesn't silently break client-side routing - treat it like an API contract, because it is one.
- Put notification-channel taxonomy decisions in a short ADR (architecture decision record) so a future engineer doesn't casually add a 6th channel without understanding the existing importance/UX tradeoffs.
- When the team grows, assign explicit ownership of the "push health dashboard" - delivery/open-rate regressions otherwise get discovered by support tickets, weeks late.
- Bake OEM quirks into onboarding docs for new engineers - this is exactly the kind of tribal knowledge that gets relearned the hard way otherwise.

### Tradeoffs table: notification-type vs data-only messages, revisited at scale

| Concern | Notification-type message | Data-only message |
|---|---|---|
| Presentation control | None while app is backgrounded/killed - OS default | Full (via Notifee), consistent across all states |
| Implementation effort | Lower initially | Higher (you own display logic everywhere) |
| Risk of silent breakage | Low short-term, high once you need custom UX | Requires discipline (must always call `displayNotification`) but no OS-imposed ceiling |
| Fintech suitability | Poor - can't guarantee channel/branding/action consistency | Preferred |

### Harder follow-up interview questions (with model answers)

**Q1: Your push open rate drops 40% after a release, but send success rate from the backend looks unchanged. What's your hypothesis and how do you narrow it down?**
> "If sends are succeeding but opens drop, the break is somewhere between 'delivered to device' and 'user taps it' - so I'd suspect either a presentation regression (a channel accidentally created with lower importance, or a missing Notifee call introduced in a refactor) or a routing regression (tapping does something but doesn't land where the user expects, so they bounce without it registering as a meaningful open). I'd diff the notification-handling code between the last good release and the new one first, since that's cheap and often catches it immediately, then segment the drop by platform and app state to see if it's foreground-only, killed-only, or universal, which narrows it to a specific code path fast."

**Q2: A senior engineer on your team wants to put the user's full name and last-4 of their card number in the push notification body for a "personalized" transaction alert. How do you respond?**
> "I'd push back specifically on what's visible on a locked screen, not on personalization in general. Notification bodies render on the lock screen by default on both platforms, so anything in there is visible to anyone who picks up the phone, which is a real PII/compliance issue for a fintech app. I'd suggest a generic body ('You have a new transaction') with the specific details only visible after the user unlocks and opens the app, and where personalization is wanted, use the recipient's first name only, never account or card fragments, and make sure the underlying data payload used for deep-linking also excludes those fields, since payloads can be inspected on a compromised device."

**Q3: How would you design a system to detect that push delivery is silently degrading for a whole OEM segment before support tickets pile up?**
> "I'd instrument delivery funnel metrics server-side: sent, FCM-accepted, and then a client-side 'notification received' ping (a lightweight background event fired the moment the handler runs, decoupled from whether it displays) correlated by device model/OS from the token metadata. If a specific manufacturer's received-rate drops relative to its historical baseline while accepted-rate stays flat, that's a strong OEM-side signal, not a backend or FCM problem, and I could catch it as an automated alert rather than waiting for a support ticket pattern to become obvious."

**Q4: Walk me through triaging Crashlytics for a team of 15 engineers where everyone wants their own crash prioritized. How do you keep triage objective?**
> "I keep prioritization mechanical and visible: a shared dashboard ranked strictly by affected users/sessions, updated automatically, not by who's asking loudest. I'd set an explicit threshold - say, anything above 1% of sessions gets addressed before the next release, anything below goes into a backlog reviewed weekly - so the conversation shifts from 'my crash matters' to 'does this clear the threshold,' which is a much easier conversation to have fairly. I'd also tag crash clusters by root-cause category so if five 'different' reported crashes are actually the same underlying null-safety gap, one engineer fixes the class of bug instead of five people each fixing their own symptom."

**Q5: A crash only reproduces on a specific Android OEM and only after the device has been idle for a while. How do you approach root-causing something you can't easily reproduce in-office?**
> "That pattern - idle-then-crash, OEM-specific - points strongly at background-process/Doze-mode-adjacent behavior rather than a straightforward code bug, so I wouldn't spend much time trying to repro on a plugged-in, actively-used test device, since that's exactly the state that suppresses the bug. I'd add targeted, non-PII breadcrumbs around whatever background work runs on that screen, check whether a background task assumes it will complete without being suspended, and check that OEM's known Doze/App-Standby aggressiveness. If I still can't reproduce, I'd ask a real affected user for a screen-recording or timing details rather than guessing indefinitely, since guessing on an OEM-specific, timing-sensitive bug wastes more time than getting one real data point."

### Staff-level interview monologue: "How do you think about push notification reliability as a system, not a feature?"

> "I think about push in three layers that each have their own failure mode and their own metric. Delivery is a backend-and-FCM problem - is the token valid, did FCM accept it, and that's measurable independent of anything the client does. Presentation is a client problem - given a delivered payload, does it render consistently across foreground, background, and killed states, which is where Notifee earns its place and where most 'it doesn't work' bugs actually live, because teams test the easy state and assume the others behave the same. Routing is a third, separate problem - once tapped, does it land on the right screen with the right data, including the specific case of a cold start racing the navigator's readiness. Treating these as one blob called 'notifications' is why teams end up debugging by vibes. Once I split it into delivery/presentation/routing, I can put a metric on each layer, catch regressions at the layer where they actually happened, and onboard new engineers with a mental model that scales instead of a pile of tribal-knowledge OEM gotchas they have to relearn independently."

---
