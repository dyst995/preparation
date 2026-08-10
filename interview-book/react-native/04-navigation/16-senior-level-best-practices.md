# 16. Senior-Level Best Practices

> Source: `interview-prep/react-native/04-navigation.md`

### Decision framework: choosing navigation patterns deliberately

| Situation | Decision |
|---|---|
| Screen belongs to a primary product section (Home, Wallet, Payments, Profile) | Own tab + nested native stack |
| Screen is a short, focused flow launched from anywhere (Help, Receipt, Filters) | Modal stack at the root, not nested inside a tab's stack |
| Multi-step flow with irreversible completion (transfer, KYC submission) | Dedicated nested stack with an explicit reset on completion, never a plain push chain |
| Screen needs data that could change while the user is on it | Fetch by ID via React Query using a route param, never pass the full object as a param |
| Deep link targets a screen behind auth | Queue/store the intended destination, resolve only after hydration and authorization checks pass |
| Notification payload needs to open a specific screen | Route through the same central, typed router used for deep links - never call `navigate` ad hoc inside the push handler |

### Production checklist (navigation, ship-ready)

- [ ] Auth state gates the navigator tree (conditional `AuthStack`/`AppStack`), never an imperative `navigate('Login')`/`navigate('Home')` call used as the auth mechanism
- [ ] Deep links and notification payloads share one central, typed router/validator - not duplicated logic in multiple handlers
- [ ] Every route param type is declared (no `any` on `route.params`); nested navigator composite types are set up so params can't silently go untyped
- [ ] Irreversible flows (payment success, onboarding completion) call `CommonActions.reset` or an equivalent replace, so back button cannot return to a stale intermediate step
- [ ] Deep links are tested cold-start, warm-start, and logged-out on both platforms - not just the happy warm, logged-in path
- [ ] No sensitive data (tokens, full account numbers) ever travels in a URL or deep-link param
- [ ] `useFocusEffect` (not bare `useEffect`) is used for any tab-nested screen that needs to refresh on refocus

### Anti-patterns seniors reject in code review

- **Using `navigate('Home')` after login as the auth strategy** instead of conditionally rendering `AuthStack` vs `AppStack` from state - creates back-stack leaks where a user can navigate back into the login screen after authenticating.
- **Passing full API response objects as route params** "to save a fetch" - creates stale-data bugs the moment the underlying resource changes while the screen is open, and breaks deep-linking to that same screen from elsewhere.
- **Scattering `navigation.navigate(...)` calls inside individual push-notification handlers** across the codebase instead of a single typed router keyed by notification type - impossible to audit or test comprehensively.
- **Trusting deep-link params blindly** (navigating straight to a resource by ID from a URL with no authorization check) - a classic way to leak another user's data if IDs are guessable or the link is forwarded.
- **Forgetting to reset navigation after logout**, leaving the previous session's screen stack (with cached component state) underneath the fresh auth stack.
- **Treating "the navigator is janky" as a navigation-library problem** before profiling the screen itself - most navigation jank is heavy screen render weight, not the navigator.

### Failure modes & how seniors debug them

| Symptom | Likely root cause | Diagnose with | Fix |
|---|---|---|---|
| User can swipe/press back into Login after successfully authenticating | Imperative navigate-based auth instead of conditional tree swap | Reproduce the back gesture right after login | Swap to state-driven conditional `AuthStack`/`AppStack` rendering |
| Deep link opens the wrong screen or crashes when the app was killed | Navigation container not ready / auth not hydrated when the link is processed | Add logging around link receipt timestamp vs hydration-complete timestamp | Queue the intended link/notification action until hydration and container are ready |
| Tapping a notification while the app is backgrounded does nothing or double-navigates | No dedup/queueing of navigation intents; container not mounted yet, or handler fires twice (foreground + background listener both firing) | Log every navigation action with a source tag (deep link vs notification vs manual) | Centralize into one router, dedupe by a request id or debounce identical rapid actions |
| Screen inside a tab shows stale data after switching tabs and back | Screen stayed mounted; refetch logic lives in `useEffect` (mount-only) instead of `useFocusEffect` | Add a log line in both hooks to see which actually fires on tab switch | Move refetch/refresh logic to `useFocusEffect` |
| "Action not handled" navigation warning | Navigating to a screen name that exists in a different nested navigator without targeting it properly | Inspect the navigator tree vs the navigate call's target | Use nested navigation actions correctly (navigate to the tab first, then the screen) |

### Observability / metrics to watch

- **Deep link resolution success rate** (opened vs successfully routed to the intended screen) - segmented by cold/warm start and logged-in/out.
- **Time from notification tap to correct screen rendered** - a proxy for whether the queueing/hydration-wait logic is working, not just "does it eventually work."
- **Navigation-related crash/ANR rate** specifically (filter Crashlytics by navigation-related stack frames) - nested navigator misconfiguration is a common, distinct crash cluster.
- **Funnel drop-off at each step of a critical multi-step flow** (transfer amount -> review -> confirm -> success) - navigation/UX friction often hides here before it shows up as a "bug."
- **Rate of users reporting "I ended up back at login"** via support tickets - a leading indicator of an auth-gating regression before it shows in crash dashboards.

### Scalability & team practices

- **One typed, centrally-owned router module** for both deep links and notification payloads - code-reviewed as carefully as any auth code, since it's a security boundary too.
- **Route param types are part of the PR review checklist** for any new screen - "does this pass an ID or a whole object?" catches the stale-param anti-pattern early.
- **A shared "irreversible flow" pattern/helper** (reset-after-completion) so every squad implements payment/onboarding completion the same way instead of reinventing it per feature.
- **Deep link test matrix lives in the repo** (cold start / warm start / logged out / invalid id / expired session) and is run manually or via E2E before every release that touches linking config.
- **Navigation architecture changes get an ADR** when the top-level tree shape changes (e.g. adding a new tab, changing modal strategy) since it affects every squad's screens.

### Tradeoffs table

| Choice | Pro | Con |
|---|---|---|
| Conditional auth-gated navigator tree | No back-stack leaks, single source of truth | Slightly more setup than imperative navigate calls |
| Route params as IDs only | No staleness, works cleanly with deep links | Requires an extra fetch on screen mount (usually cheap with React Query cache) |
| Centralized notification/deep-link router | Testable, auditable, consistent behavior | Requires upfront design; tempting to bypass for "just this one quick case" |
| Native Stack navigator | Better platform feel and performance | Slightly less flexible for some custom transition edge cases than JS stack |
| Resetting stack after irreversible flows | Prevents confusing/duplicate submissions via back button | Must be applied consistently - easy to forget on a new flow |

### Harder follow-up interview questions (with model answers)

**Q: A deep link to a transfer details screen is forwarded between two users. How do you make sure the second user can't see the first user's transfer?**

> "Deep links should carry an identifier, not implicit trust. On the screen, I still fetch the resource by ID through the normal authenticated API call, and the backend enforces that the currently authenticated user actually owns or has access to that transfer id, returning a 403/404 otherwise. The navigation layer's job is just parsing the URL and routing; the authorization check must happen at the data-fetching/API layer regardless of how the user arrived at the screen."

**Q: How do you handle a notification that arrives while the user is already on the exact screen it wants to open?**

> "The central router should be idempotent - if the target screen is already the top of the stack with matching params, it should no-op or just refresh the data rather than pushing a duplicate screen instance. I'd compare the current route state against the intended navigation action before dispatching it."

**Q: Your app supports both a URL scheme and universal/app links for the same routes. What's a subtle bug this setup introduces?**

> "Universal/app links can fail silently and fall back to opening a browser if the associated domain/app-links configuration is misconfigured on either platform, while the custom URL scheme always opens the app directly if installed - so testing only the custom scheme can hide a broken universal link setup that real users hit from emails/SMS/marketing links. I test both explicitly, on real devices, not just simulators, since some of this configuration only manifests correctly on-device."

**Q: How would you design navigation for a feature that needs to work both as a full screen flow and as a modal, depending on entry point?**

> "I'd keep the screen components themselves presentation-agnostic - they shouldn't know if they're in a modal or a stack - and control presentation purely through the navigator configuration (screen options / group) at the point where each entry route is registered. That way the same screen can be pushed in a modal stack from one entry point and in a full stack from another without duplicating the screen's logic."

**Q: What's your strategy for navigation state after a forced logout mid-session (e.g. a 401 from an expired token)?**

> "A 401 that indicates true session expiry should trigger the same centralized logout/reset function used for manual logout - clearing stores and caches - and then let the auth-gated navigator tree naturally swap to `AuthStack`. I avoid trying to imperatively navigate to a login screen from deep inside an API interceptor; state-driven navigation swap keeps this consistent with every other logout path and avoids duplicate/racing navigation actions."

### What I'd say in a staff/senior interview

> "I think about navigation architecture the same way I think about auth architecture, because in a fintech app they're deeply coupled - a navigation bug can become a data-exposure bug if you're not careful about what triggers a route and what's trusted once you're there. The pattern I always reach for is: auth state drives the tree (not imperative navigation calls), route params carry identifiers not payloads, and every external entry point - deep link or push notification - goes through one auditable router with the same hydration and authorization guarantees. That consistency is what let me ship EasyPay's QR payments, transfers, and notification-driven flows without back-stack or stale-data bugs, and it's the first thing I check when debugging someone else's 'weird navigation' report."

---
