# 08 — Push Notifications, Firebase & Device Features

> Goal: Be able to explain the full push notification pipeline end-to-end (backend ? FCM ? device ? UI), justify Notifee usage, handle every app-lifecycle state correctly, run a real Crashlytics triage workflow, and defend your secure-storage and deep-linking decisions — all backed by concrete stories from EasyPay, Wizer, and Clean House.

Mark progress with `[x]` as you master each topic.

---

## Learning objectives

By the end of this section you should be able to:

1. Draw the full push notification pipeline from your backend to a rendered notification on a locked device.
2. Explain the difference between FCM (delivery transport) and Notifee (notification presentation/local scheduling).
3. Correctly wire notification handling for foreground, background, and killed app states on both platforms.
4. Route a tapped notification to the correct screen, including on cold start.
5. Run a Crashlytics-driven crash-rate reduction workflow and narrate it like you did at MyCreditInfo, Wizer, and Online School.
6. Justify Keychain/Keystore over AsyncStorage for sensitive data.
7. Explain `AppState`, background execution limits, and why mobile OSes throttle background work.
8. Set up and validate deep links and universal/app links, and explain deferred deep linking at a high level.

---

## 1. The push notification pipeline end-to-end

### Topics to learn
- [ ] Actors involved: your backend, FCM, APNs (iOS under the hood), the OS notification tray, and your app
- [ ] Push token lifecycle: generation, refresh, registration with backend
- [ ] Data messages vs notification messages
- [ ] Why iOS pushes technically flow through APNs even when you "use FCM"
- [ ] Silent/background data-only pushes vs user-visible notifications

### Mental model

```
[Your backend]
     |  (1) sends payload to
     v
[Firebase Cloud Messaging (FCM)]
     |                       \
     | (Android: direct)      \ (iOS: FCM forwards to APNs)
     v                         v
[Google Play Services /        [Apple Push Notification
 FCM SDK on device]              service (APNs)]
     |                         |
     v                         v
        [Your RN app's native FCM/Notifee layer]
                     |
                     v
        [JS side: onMessage / background handler]
                     |
                     v
        [Notifee displays / updates the notification]
                     |
                     v
        [User taps] -> [onNotificationOpenedApp / getInitialNotification]
                     |
                     v
        [Navigation ref pushes the right screen]
```

Key point for interviews: **FCM is the transport/delivery layer**; it does not give you rich, styled, or channel-based local notification UI out of the box on its own — that's why teams pair it with **Notifee** (or `notifee` replaced the older `react-native-push-notification` in most modern stacks) for presentation, actions, and channel management.

### Push token lifecycle

1. App requests permission (iOS explicit prompt; Android 13+ explicit runtime permission; Android ?12 implicit).
2. FCM SDK generates a device/registration token.
3. App sends that token to your backend and associates it with the logged-in user (and ideally device id, platform, app version).
4. Token can rotate (app reinstall, data clear, token refresh events) — you must listen for refresh and re-sync it, or the user silently stops receiving pushes.
5. On logout, you should **unregister/dissociate the token** from that user server-side (and optionally delete the FCM instance token) so a shared device doesn't leak notifications to the wrong account.

### Interview question

**Q: Walk me through what happens between your backend sending a push and the user seeing it.**

**Strong answer:**
> "The backend sends a message to FCM with the device's registration token and a payload. On Android, FCM delivers directly to Google Play Services on the device. On iOS, FCM actually forwards the message to APNs, which delivers it to the device — Firebase is a convenience layer on top of APNs, not a replacement for it. Once on-device, our RN app's native FCM handlers receive it. If it's a data-only message, our JS background/foreground handlers decide what to do — often calling Notifee to display a styled local notification with the correct Android channel. If it's a notification-type message and the app is backgrounded/killed, the OS shows it directly from the system tray using default styling, which is why we prefer data-only messages when we need full control over presentation."

**Follow-up:** Why prefer data-only (data) messages over notification messages in a fintech app?
> Because notification-type messages are displayed by the OS automatically when the app isn't foregrounded, bypassing your custom Notifee channel, icon, sound, grouping, and action buttons. Data-only messages always route through your JS handler, so you get consistent presentation and can attach navigation payloads reliably.

---

## 2. FCM setup — Android

### Topics to learn
- [ ] `google-services.json` and the Gradle plugin
- [ ] Manifest permissions and default notification channel/icon meta-data
- [ ] Notification channels (mandatory on Android 8+/API 26+)
- [ ] `POST_NOTIFICATIONS` runtime permission (Android 13 / API 33+)
- [ ] Background message handler registration (`setBackgroundMessageHandler`, must be set outside of any component, at the top level of `index.js`)
- [ ] Foreground service considerations for high-priority/ongoing notifications (e.g. VoIP-style, high-priority delivery-updates)

### Key setup pieces (conceptual, config-level)

| Piece | Purpose |
|---|---|
| `google-services.json` | Ties the Android app to the Firebase project; consumed by the Google Services Gradle plugin |
| Google Services Gradle plugin | Injects Firebase config into the build, wires FCM |
| Default notification channel meta-data in `AndroidManifest.xml` | Defines fallback channel/icon/color when a payload doesn't specify one |
| `POST_NOTIFICATIONS` permission | Required at runtime on Android 13+, or notifications silently never show |
| `messaging().setBackgroundMessageHandler(...)` in `index.js` (top-level, before `AppRegistry.registerComponent`) | Handles data messages when app is backgrounded/killed — this is where you'd call Notifee to display something |

### Notification channels (Android 8+)

Channels group notifications by category (e.g. "Payments", "Promotions", "Chat") and let the **user** control importance/sound/vibration per category from system settings — you cannot override a user's channel-level choice once the channel is created with certain settings, only create new channels.

```ts
await notifee.createChannel({
  id: 'payments',
  name: 'Payment Alerts',
  importance: AndroidImportance.HIGH,
  sound: 'default',
});
```

Design implication: **decide your channel taxonomy up front** (e.g. Payments, Security, Marketing, Chat/Delivery updates for Clean House) because users get annoyed by too many, and changing importance later requires the user to manually update settings — apps can't silently escalate importance of an existing channel.

### Interview question

**Q: Why do notification channels matter on Android, and what happens if you don't define one?**

> "Since Android 8, every notification must belong to a channel, and channel settings (sound, vibration, importance) are user-controlled once created — my app can't silently override them later. If I don't explicitly create/target a channel, the notification either falls back to a default channel with generic behavior or, on some OEM skins, may not show consistently. So I define a small, deliberate set of channels — e.g. Payments (high importance), Security alerts, and general/marketing (lower importance) — so users can tune notification behavior without missing critical payment alerts."

---

## 3. FCM setup — iOS

### Topics to learn
- [ ] APNs auth key vs certificate-based setup (auth key is preferred/modern)
- [ ] Push Notifications capability + Background Modes (remote notifications) in Xcode
- [ ] `GoogleService-Info.plist`
- [ ] Requesting permission via `messaging().requestPermission()` and mapping the authorization status
- [ ] APNs token vs FCM token relationship
- [ ] Silent/background push limitations on iOS (throttled by the OS, not guaranteed timely)

### Key setup pieces

| Piece | Purpose |
|---|---|
| APNs Auth Key (`.p8`) uploaded to Firebase | Lets Firebase relay pushes to APNs on your app's behalf |
| `GoogleService-Info.plist` | Ties the iOS app target to the Firebase project |
| Xcode capability: Push Notifications | Enables the entitlement required to receive pushes |
| Xcode capability: Background Modes ? Remote notifications | Allows background data messages to wake the app briefly |
| `requestPermission()` | Triggers the native iOS prompt; must be called explicitly — iOS never asks implicitly like older Android did |

### Authorization status handling

iOS permission isn't boolean — it can be `authorized`, `provisional` (quiet notifications, no prompt), `denied`, or `notDetermined`. A senior answer distinguishes these and explains **provisional authorization** as a way to start sending quiet, non-intrusive notifications before asking for full permission, which can improve opt-in rates when the user later sees value and upgrades.

### Interview question

**Q: Why do iOS push notifications require more moving pieces than Android?**

> "iOS push always ultimately routes through Apple's APNs, so even 'using FCM' on iOS means Firebase is forwarding to APNs using an auth key I uploaded. I need the Push Notifications and Background Modes capabilities enabled in Xcode, a proper provisioning profile, and to explicitly call `requestPermission()` since iOS never grants notification permission implicitly. I also handle the different authorization states — including provisional — rather than treating permission as a simple boolean."

---

## 4. Notifee — channels, local notifications, foreground handling

### Topics to learn
- [ ] What Notifee is for vs what FCM is for (presentation vs delivery)
- [ ] Displaying a notification from a foreground FCM message
- [ ] Android channels API (`createChannel`, `createChannelGroup`)
- [ ] iOS categories and actions
- [ ] Foreground event listeners (`onForegroundEvent`) vs background events (`onBackgroundEvent`, registered outside component tree)
- [ ] Action buttons, quick reply, images/big-picture style
- [ ] Badge counts
- [ ] Scheduling local/triggered notifications (time-based triggers) — useful for reminders unrelated to push (e.g. "loan payment due")

### Why pair Notifee with FCM at all

FCM's job stops at *delivering a payload to the device*. It does not give you:
- Consistent notification styling when the app is foregrounded (by default, nothing shows automatically while the app is open)
- Rich media (big picture / big text styles)
- Action buttons
- Fine-grained channel management APIs from JS
- Local/scheduled notifications independent of any server push

Notifee fills exactly that gap: **it's a full local-notification and channel-management library**, and it plays nicely with FCM by letting you call `notifee.displayNotification(...)` right from your `onMessage` / background handler.

### Foreground handling (the classic gotcha)

By default, if the app is in the **foreground**, a plain FCM "notification" payload does **not** show a system tray notification on either platform — you have to explicitly display it yourself. This is one of the most common early bugs teams hit:

> "It worked when the app was backgrounded, but nothing shows when the app is open!"

The fix is standard: listen to `messaging().onMessage(...)`, and inside it call `notifee.displayNotification(...)` manually so foreground pushes are visible, styled, and channel-correct just like background ones.

### Interview question

**Q: What's the difference between FCM and Notifee, and why use both?**

> "FCM is the delivery/transport mechanism — it gets a payload from my backend onto the device across platforms. Notifee is a local notification and channel-management library that controls how that payload is actually presented — styling, channels, action buttons, foreground display, badge counts, and even fully local/scheduled notifications with no server round-trip. I use FCM to get data to the device reliably, and Notifee to render it consistently across every app state, especially foreground, where neither platform shows anything automatically for a raw FCM payload."

**Q: How did you use Notifee at Wizer / EasyPay specifically?**

> "At Wizer, I used FCM plus Notifee for delivery status and account notifications — Notifee handled channel setup so payment-related alerts were high-importance while general updates were lower-importance, and it displayed styled foreground notifications since FCM alone wouldn't render anything while the app was open. At EasyPay, push notifications combined with Notifee were used for transaction and security alerts feeding into deep links that opened the exact transaction or screen."

---

## 5. Notification permissions and OEM quirks

### Topics to learn
- [ ] iOS: explicit `requestPermission()`, authorization status handling
- [ ] Android 13+: explicit `POST_NOTIFICATIONS` runtime permission
- [ ] Android ?12: notifications enabled by default, but users can disable per-app in settings
- [ ] OEM battery optimization / aggressive task killers (Xiaomi/MIUI, Huawei/EMUI, OnePlus, Samsung) suppressing background delivery
- [ ] Educating users to whitelist the app from battery optimization
- [ ] Requesting permission at the right UX moment (not immediately on first launch)

### OEM quirks table

| OEM / Skin | Common issue | Mitigation |
|---|---|---|
| Xiaomi (MIUI) | Aggressive "autostart" restrictions kill background processes, delaying/blocking push delivery | Prompt users to enable autostart / disable battery optimization for the app; document in onboarding/FAQ |
| Huawei (EMUI, no Google Play Services on newer devices) | FCM may not work at all without Google Play Services; needs Huawei Mobile Services (HMS) fallback for full support | Detect GMS availability; consider HMS push kit for Huawei-heavy markets |
| Samsung | Generally more compliant, but aggressive "Sleeping apps" list can delay delivery | Same battery-optimization guidance |
| OnePlus (OxygenOS) | Similar background-kill aggressiveness | Same guidance |
| iOS | No "OEM" issue, but background delivery of silent pushes is throttled/best-effort by the OS, never guaranteed timely | Don't rely on background pushes for time-critical logic; treat as best-effort |

### Interview question

**Q: A user says they stopped getting push notifications on their Xiaomi phone. What do you check?**

> "First I verify server-side that the token is valid and the send actually succeeded (not silently failing due to a stale/invalid token). Then I check notification permission status and channel settings on-device. If those look fine, I look at OEM-specific background restrictions — MIUI's autostart/battery optimization is a very common cause of silently dropped background delivery on Xiaomi devices. I'd guide the user to whitelist the app, and longer-term, document this as a known FAQ item since it's a recurring support issue across MIUI/EMUI-heavy markets."

---

## 6. Handling every app state: foreground, background, killed

### Topics to learn
- [ ] `messaging().onMessage()` — foreground
- [ ] `messaging().setBackgroundMessageHandler()` — background/killed, registered at top level of `index.js`
- [ ] `messaging().onNotificationOpenedApp()` — app was backgrounded, user tapped notification, app resumes
- [ ] `messaging().getInitialNotification()` — app was **killed**, user tapped notification, app cold-starts
- [ ] Notifee equivalents: `onForegroundEvent`, `onBackgroundEvent`, `getInitialNotification`
- [ ] Why the killed-state path is the one teams forget and QA catches late

### The state matrix

| App state | FCM/Notifee entry point | Typical responsibility |
|---|---|---|
| Foreground | `onMessage` (FCM) / `onForegroundEvent` (Notifee) | Manually display the notification (Notifee), or update in-app UI/badges directly without a tray notification at all |
| Background (app alive, not visible) | `setBackgroundMessageHandler` (FCM) / `onBackgroundEvent` (Notifee) | Display notification via Notifee; can do limited async work (fetch small data) before OS suspends |
| Killed (app fully terminated) | OS handles initial display natively; on tap: `getInitialNotification()` (FCM) or Notifee's initial notification API | On app cold start, check for an initial notification and navigate once the navigator is ready |
| Tap while backgrounded | `onNotificationOpenedApp` | Navigate immediately since app + navigator are already alive |

### The classic bug: killed-state navigation race

`getInitialNotification()` resolves with data, but if you call it before your navigation container/ref is mounted and ready, the navigation call silently no-ops. The fix pattern:

1. Store the pending notification payload in a ref/state as soon as it's available.
2. Only attempt navigation once `onReady` (React Navigation) has fired on the `NavigationContainer`.
3. Clear the pending payload after successful navigation so it doesn't re-fire on a later re-render.

### Interview question

**Q: Your team says "opening the app from a notification works, but only sometimes on a fully-closed app." What's your hypothesis?**

> "That symptom screams a killed-state navigation race. My first hypothesis is that `getInitialNotification()` is resolving before the navigation container is ready, so the navigate call is silently dropped. I'd verify by logging both the notification payload arrival and the navigator's `onReady` timing, then fix it by holding the pending deep-link target in state and only firing navigation once the navigator reports ready — which is the same pattern I'd use for cold-start deep links in general, not just notifications."

---

## 7. Notification ? navigation (deep-link-style routing)

### Topics to learn
- [ ] Designing a consistent notification data payload contract (e.g. `{ type: 'TRANSACTION', transactionId: '...' }`)
- [ ] Central notification-routing function mapping payload ? navigation action
- [ ] Reusing the same routing logic for real deep links and for notification taps (DRY)
- [ ] Auth-gating: what if the target screen requires login and the user is logged out?
- [ ] Validating the payload before trusting it (never navigate blindly on untrusted/malformed data)

### Payload contract example

```ts
type NotificationData = {
  type: 'TRANSACTION' | 'CHAT' | 'PROMO' | 'SECURITY_ALERT';
  id?: string;
};

function routeFromNotification(data: NotificationData, navigationRef: NavigationRef) {
  if (!isAuthenticated()) {
    // queue it, send to login, resume after auth
    pendingDeepLink.set(data);
    navigationRef.navigate('Login');
    return;
  }

  switch (data.type) {
    case 'TRANSACTION':
      if (!data.id) return; // guard against malformed payload
      navigationRef.navigate('TransactionDetails', { id: data.id });
      break;
    case 'CHAT':
      navigationRef.navigate('ChatThread', { threadId: data.id });
      break;
    // ...
  }
}
```

### Interview question

**Q: How do you open a specific screen from a push notification?**

> "I standardize a small typed payload contract from the backend — a `type` plus an id. I have one central routing function that maps that payload to a navigation action, and I reuse the same function whether the trigger was a real deep link URL or a tapped notification, so the logic isn't duplicated. I validate the payload before navigating — malformed or missing ids just no-op rather than crash. If the user isn't authenticated, I stash the intended destination, send them through login, and resume navigation after auth succeeds instead of losing their intent."

---

## 8. Firebase Crashlytics workflow

### Topics to learn
- [ ] Setup: native SDK wiring, dSYM/mapping file upload for symbolication
- [ ] Fatal crash reporting vs `recordError` for handled/non-fatal exceptions
- [ ] Custom keys and user identifiers (careful with PII) for context
- [ ] Breadcrumb logging (`log()`) before a crash to reconstruct the path
- [ ] Crash-free users / crash-free sessions as the headline metric
- [ ] Symbolicated stack traces: turning obfuscated/minified traces back into readable file:line
- [ ] Triage loop: classify ? prioritize by impact ? reproduce ? fix ? verify in next release
- [ ] JS exceptions vs native crashes appearing in the same dashboard

### The triage workflow (use this narrative for your crash-rate stories)

1. **Classify** — Is the top crash JS (unhandled promise rejection, JS `TypeError`) or native (segfault, NPE, ANR-adjacent)? Crashlytics groups both, but the stack shape tells you which.
2. **Prioritize by impact** — Sort by number of affected users/sessions, not just occurrence count. A crash hitting 40% of sessions on one screen matters more than one hit rarely.
3. **Reproduce** — Match app version, OS version, device model from the crash report; reproduce on a release build (JS engine/minification differences from dev can hide/reveal issues).
4. **Root-cause** — Use breadcrumbs/custom keys to reconstruct the user's path; for native, symbolicate and read the actual native stack.
5. **Fix + guard** — Fix the root cause; add defensive guards (null checks, error boundaries, safe JSON parsing) so the same class of bug doesn't recur elsewhere.
6. **Verify** — Ship, monitor crash-free users trend on the new build specifically, don't just look at the aggregate which is diluted by old versions still in the wild.
7. **Staged rollout** — Use staged rollout percentages on Play Store (and phased release on App Store) so a regression only affects a fraction of users before you halt it.

### Your real numbers (be ready to narrate these fluently)

| Project | Crash rate before | Crash rate after |
|---|---|---|
| MyCreditInfo | ~20% | ~0.03% |
| Wizer | ~15% | ~0.09% |
| Online School | ~28% | ~0.15% |

### Interview question

**Q: Walk me through how you took MyCreditInfo's crash rate from ~20% to ~0.03%.**

**Strong answer sketch:**
> "The app had an outdated, unmaintained codebase, so crashes came from multiple angles — stale native dependencies, unguarded JS logic, and some patched-but-fragile native Android libraries. I started by wiring Crashlytics properly with symbolication so native stacks were actually readable, then sorted crashes by affected-users, not raw count, and tackled the top offenders first. A meaningful chunk came from a handful of native library incompatibilities I had to patch directly, and from unguarded JS paths — I added defensive checks and error boundaries around the worst offenders. I also modernized dependencies as part of the same effort, since several crashes traced back to outdated libraries with known native bugs. After each release I watched crash-free users specifically for that version, not the diluted aggregate, and used staged rollouts so a regression wouldn't blow up the whole user base at once. That iterative, impact-sorted loop is what got it from ~20% down to ~0.03%."

**Follow-up: How do you avoid regressing crash rate on the next release?**
> Staged rollouts, monitoring crash-free users per version immediately after release, keeping regression-prone areas covered by tests, and treating any crash-rate spike as a stop-the-line signal before continuing rollout.

---

## 9. Analytics events (high level)

### Topics to learn
- [ ] Screen view tracking vs custom events
- [ ] Naming conventions for events (consistent, low-cardinality, documented)
- [ ] Funnel thinking: signup ? KYC ? first transaction, etc.
- [ ] Avoiding PII in event properties
- [ ] Correlating crash spikes with recent feature/analytics events for root-causing regressions

### Interview question

**Q: How would you instrument analytics for a money-transfer funnel?**

> "I'd define discrete funnel steps — transfer initiated, recipient selected, amount entered, confirmation viewed, biometric/PIN confirmed, transfer succeeded/failed — each as a consistently named event with minimal, non-PII properties like amount bucket or currency, not exact recipient identity. That funnel tells product where users drop off, and pairing it with Crashlytics breadcrumbs helps correlate a spike in abandonment with an actual bug versus a UX friction point."

---

## 10. Secure storage: Keychain / Keystore

### Topics to learn
- [ ] Why `AsyncStorage` is unencrypted, plaintext-on-disk key-value storage — never for tokens/secrets
- [ ] iOS Keychain: hardware-backed encryption, access control levels (e.g. only-when-unlocked, biometry-required)
- [ ] Android Keystore: hardware-backed key storage; libraries like `react-native-keychain` wrap platform-specific secure storage uniformly
- [ ] What belongs in secure storage: refresh tokens, biometric-gated secrets, PINs (hashed, never plaintext)
- [ ] What does NOT need secure storage: non-sensitive UI preferences, feature flags, cached non-sensitive data
- [ ] Access-control tying: requiring biometric prompt to *read* the secret, not just to unlock the app UI

### Comparison table

| Storage | Encrypted at rest | Appropriate for |
|---|---|---|
| `AsyncStorage` | No (plain key-value, readable if device is compromised/rooted) | Non-sensitive prefs, cache, feature flags |
| iOS Keychain | Yes (hardware-backed, OS-managed) | Tokens, biometric-gated secrets |
| Android Keystore (via `react-native-keychain` etc.) | Yes (hardware-backed on supported devices) | Tokens, biometric-gated secrets |
| In-memory only (JS variable / Zustand, not persisted) | N/A, but gone on app restart | Short-lived access tokens if you accept re-fetch on cold start |

### Interview question

**Q: Where should you store a refresh token in a React Native fintech app, and why not `AsyncStorage`?**

> "`AsyncStorage` is unencrypted plaintext on disk — on a rooted or compromised device it's trivially readable. Refresh tokens should go into the platform's secure storage: Keychain on iOS, Keystore-backed storage on Android, typically via a library like `react-native-keychain` that abstracts both. I'd also tie access to biometric authentication where the sensitivity warrants it, so reading the token itself requires a biometric prompt, not just having the app open."

**Q: How do biometrics and secure storage work together for login?**

> "Biometric authentication (Face ID / fingerprint via the OS-level biometric API) acts as the gate to unlock access to a secret stored in Keychain/Keystore — it's not just a UI checkbox. On successful login, I store a refresh token (or a biometric-unlock flag plus an encrypted token) in secure storage with an access-control policy requiring biometric authentication to retrieve it. On subsequent app opens, the user authenticates with biometrics, which unlocks the secure read, and I use that token to silently refresh the session instead of asking for a password again."

---

## 11. AppState and background execution limits

### Topics to learn
- [ ] `AppState` API: `active`, `background`, `inactive` (iOS transitional state)
- [ ] Listening to `AppState` changes for session-timeout timers, screenshot protection, and pausing/resuming polling
- [ ] Why mobile OSes aggressively limit background CPU/network time (battery life)
- [ ] iOS background modes: only specific declared modes (remote notifications, background fetch/processing, audio, etc.) get meaningful background time
- [ ] Android Doze mode / App Standby buckets throttling background work over time
- [ ] Why you can't rely on background timers ("wake me up in 10 minutes") without OS-level scheduling APIs

### Interview question

**Q: How would you implement a session timeout that logs the user out after 5 minutes in the background?**

> "I listen to `AppState` changes. When the app transitions to `background`, I record a timestamp. When it transitions back to `active`, I compare the current time against that timestamp — if it exceeds the timeout threshold, I force re-authentication (biometric or credentials) before showing any sensitive screen again, rather than relying on a background timer actually firing, since the OS can suspend JS execution in the background and a `setTimeout` isn't guaranteed to run on schedule."

**Follow-up:** Why not just use `setTimeout` while backgrounded?
> Because JS execution is typically suspended when the app backgrounds; timers don't reliably fire. Comparing wall-clock timestamps on resume is the standard, reliable pattern.

---

## 12. Deep links, universal links, and deferred deep links

### Topics to learn
- [ ] Custom URL schemes (`myapp://...`) — simple but spoofable/hijackable by other apps
- [ ] iOS Universal Links (`applinks:` associated domain, `apple-app-site-association` file hosted on your domain)
- [ ] Android App Links (`autoVerify` intent filter, `assetlinks.json` hosted on your domain)
- [ ] Why Universal/App Links are preferred for security-sensitive flows — they're domain-verified, so a malicious app can't claim your scheme
- [ ] React Navigation linking config mapping URL patterns to screens/params
- [ ] Validating deep link parameters before navigating (never trust the URL blindly)
- [ ] Deferred deep linking (install ? open ? still land on the intended content) — high-level awareness, usually via a third-party attribution SDK

### Custom scheme vs Universal/App Links

| Aspect | Custom scheme (`myapp://`) | Universal Link / App Link |
|---|---|---|
| Setup complexity | Low | Higher (domain file hosting + verification) |
| Security | Any app can register the same scheme — spoofable | Domain-verified; OS confirms your app owns the domain |
| Fallback if app not installed | Fails / does nothing | Opens a normal web URL (great fallback UX) |
| Fintech suitability | Risky for sensitive actions (e.g. auth callbacks, payment confirmations) | Preferred for anything security-sensitive |

### Interview question

**Q: How do deep links work in React Native, and how do you test them?**

> "There are two flavors: custom URL schemes, which are simple but can technically be claimed by other apps since they're not domain-verified, and Universal Links (iOS) / App Links (Android), which are tied to a domain via a hosted verification file so the OS confirms only my app can handle them. I use React Navigation's linking config to map URL patterns to screens and params, and I always validate params before navigating — a malformed or malicious URL shouldn't be trusted blindly. To test, I use `npx uri-scheme open` or `adb shell am start` with an intent for the URL on Android, and `xcrun simctl openurl` on iOS simulators, plus real-device testing for Universal/App Link domain verification since simulators don't always exercise that path faithfully."

**Q: How do you validate deep links so they can't open unauthorized flows?**

> "I whitelist expected URL patterns and params server-side/client-side, reject anything that doesn't match a known route shape, require re-authentication for sensitive destinations even if the link itself doesn't carry credentials, and never let a deep link directly trigger a state-changing action (like confirming a payment) without an explicit in-app confirmation step."

---

## Full interview question bank (with answer targets)

### FCM & delivery
1. **Walk through the push pipeline from backend to device.** ? backend ? FCM ? (APNs on iOS) ? device ? app handlers ? Notifee display.
2. **Data messages vs notification messages — why prefer data-only?** ? full control over presentation via your own handler + Notifee.
3. **How does the push token lifecycle work, and what happens on logout?** ? generate, sync to backend, refresh, dissociate on logout.
4. **What OEM-specific issues have you hit with push delivery?** ? MIUI autostart/battery optimization, Huawei GMS absence.

### Notifee & presentation
5. **What's the difference between FCM and Notifee?** ? transport vs presentation/local scheduling.
6. **Why do foreground notifications need manual handling?** ? neither platform auto-displays a raw FCM payload while the app is open.
7. **What are Android notification channels and why can't you change them silently later?** ? user-controlled importance/sound once created.

### App-state handling
8. **How do you handle notifications in foreground / background / killed states?** ? `onMessage` / `setBackgroundMessageHandler` / `getInitialNotification`.
9. **Why does "open from killed app" sometimes silently fail?** ? navigation-container-not-ready race.
10. **How do you route a tapped notification to the correct screen?** ? shared payload contract + central routing function + auth gating.

### Crashlytics & stability
11. **How do you triage crashes systematically?** ? classify ? prioritize by impact ? reproduce ? root-cause ? fix + guard ? verify ? staged rollout.
12. **Walk me through your MyCreditInfo / Wizer / Online School crash-rate reduction.** ? have all three numbers ready.
13. **JS exception vs native crash — how do you tell from the stack?**
14. **What's crash-free users, and why prefer it over raw crash count?**

### Security & storage
15. **Why is `AsyncStorage` unsafe for tokens?** ? unencrypted plaintext on disk.
16. **How do biometrics integrate with secure storage?** ? biometric gate on secure-storage read, not just app-open.
17. **What's the difference between Keychain and Keystore conceptually?** ? both are hardware-backed secure secret stores, per-platform.

### Background & lifecycle
18. **How do you implement a background-based session timeout?** ? `AppState` + timestamp comparison on resume, not a background timer.
19. **Why can't you rely on JS timers while backgrounded?** ? OS suspends JS execution; use OS scheduling APIs or timestamp diffing instead.

### Deep/universal links
20. **Custom scheme vs Universal/App Link — which for a fintech auth callback, and why?** ? Universal/App Link, domain-verified, not spoofable.
21. **How do you validate a deep link before navigating?** ? whitelist route shapes, validate params, require re-auth for sensitive targets.

---

## Hands-on drills (do these)

- [ ] Draw the full push pipeline (backend ? FCM ? APNs (iOS) ? device ? Notifee ? nav) on paper from memory.
- [ ] Implement a background FCM handler that calls `notifee.displayNotification` with a custom channel.
- [ ] Deliberately kill the app, tap a notification from a cold start, and trace the exact code path that navigates to the target screen.
- [ ] Write the central `routeFromNotification` function and reuse it for both notification taps and a real deep link URL.
- [ ] Record a fake non-fatal error with `crashlytics().recordError()` plus two breadcrumb logs, and find it in a fake/local Crashlytics-style setup or at least explain exactly what you'd see in the dashboard.
- [ ] Store a fake token in `react-native-keychain` gated by biometric access control, and read it back only after a biometric prompt.
- [ ] Set up a custom URL scheme deep link locally and open it via `adb shell am start` (Android) or `xcrun simctl openurl` (iOS simulator).
- [ ] Explain out loud, in under 3 minutes and without notes, all three of your crash-rate reduction stories with numbers.

---

## Senior red flags / green flags

### Green flags interviewers love
- You clearly separate "FCM = transport" from "Notifee = presentation" instead of conflating them.
- You know the killed-state navigation race and how to fix it, not just the happy path.
- Your crash-rate stories include a *method* (triage loop, staged rollout), not just "we fixed some bugs."
- You justify Keychain/Keystore with the actual security reasoning, not just "AsyncStorage is bad."
- You distinguish Universal/App Links from custom schemes on security grounds, unprompted.

### Red flags
- "We just used AsyncStorage for the token, it was fine."
- Treating iOS push as "the same as Android, just simpler" (ignoring APNs, authorization states, capabilities).
- No answer for "what if the app is fully killed" beyond "it just works."
- Crash-rate story with no numbers, no method, no before/after.
- Believing a background `setTimeout` reliably fires for session timeouts.

---

## Tie-backs to your experience (use in answers)

- **EasyPay**: push notifications + Notifee for transaction/security alerts, deep links into specific screens, biometric-gated secure storage for auth — you built this from the ground up, so you own every architectural decision here.
- **Wizer**: FCM + Notifee integration for account/payment notifications, layered on top of a Flitt payments integration where notification-driven status updates matter for UX; crash rate reduced ~15% ? ~0.09%, partly via better production debugging discipline.
- **Clean House**: WebSockets **and** FCM together for real-time delivery updates — a great story for "when do you use WebSockets vs push notifications" (WebSockets for while-app-is-open live updates; FCM for reaching the user when the app isn't in the foreground/killed).
- **MyCreditInfo**: Crashlytics-driven crash rate reduction from ~20% to ~0.03%, plus biometric authentication feature — ties storage security directly to a feature you shipped.
- **Online School**: Crashlytics-driven crash rate reduction from ~28% to ~0.15% under a tight deadline — good STAR story combining stability work with delivery pressure.

---

## Mastery checklist

- [ ] I can draw and narrate the full push pipeline from memory, including the iOS-goes-through-APNs detail.
- [ ] I can explain exactly why Notifee is needed alongside FCM.
- [ ] I can correctly describe all four notification-handling entry points and when each fires.
- [ ] I can explain and demonstrate fixing the killed-state navigation race.
- [ ] I can narrate all three crash-rate reduction stories fluently with numbers and method.
- [ ] I can justify Keychain/Keystore over AsyncStorage with real security reasoning.
- [ ] I can explain AppState-based session timeout without relying on background timers.
- [ ] I can compare custom URL schemes vs Universal/App Links and pick correctly for a sensitive flow.
