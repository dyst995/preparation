# App shell responsibilities — Answers

## Core recall

1. **Composition + boot** of the running app. **Not** business screens (`PaymentConfirm`, wallet UI).
2. **Providers**; **root navigation container**; **global error boundaries**; **bootstrap** (fonts, remote config, auth hydrate); **env config access**; **global linking**.
3. Native min / **splash stays**; **crash reporting**; **auth hydrate** (secure storage); **analytics after consent**; **mount nav with correct auth**; **defer** prefetch/secondary SDKs.
4. `QueryClientProvider`, store/session providers, **SafeArea**, **theme** (and error boundary wrapping the tree).
5. Shell: **`NavigationContainer`**, linking, **gate** (hydrated/auth). Features: **screens** and feature navigators imported via public API.
6. A **typed** module owned by the shell (`app/config`) — not `process.env` inside domain.
7. Catch **React render** errors, show fallback, **report**. Does **not** catch **native** crashes or errors outside React.
8. **Async restore** of session/token from **secure storage** into memory **before** choosing a stack.
9. **After** consent is known (and don’t block first paint on the SDK).
10. **Prefetch, extra SDKs**, work that isn’t needed to show the right first screen — so **startup/TTI** aren’t wrecked.

## Explain why

1. `app/` becomes a **junk drawer**; payments isn’t a capability anymore; blast radius and ownership die.
2. Hydrate (and native/JS around it) **can throw**. If Crashlytics isn’t up, **boot crashes are invisible**.
3. First JS tick is often the **wrong** tree (empty or Login). Splash hides the **decision**; hide after the **gated** UI is ready.
4. Otherwise **Login flash**, extra history, deep link into a **forbidden** stack.
5. **Consent/GDPR/fintech**; also analytics mustn’t delay or run before identity policy is known.
6. They compete on the **JS thread** and stretch **time-to-interactive**. First frame > completeness of every SDK.
7. Features **consume** context. Duplicate/misordered providers = split caches, missing insets, theme holes.
8. Two containers = **split** navigation state, broken **linking**, undefined back behavior.
9. The **wrong** screen already **mounted** and maybe **recorded** in history. Bootstrap **doesn’t mount** it.
10. Network can **hang**. Users see forever splash. **Defaults + timeout**, then apply flags.

## Compare and contrast

1. **Auth feature:** storage helpers, session model, **Login screens**. **Shell:** **when** to call hydrate and **whether** to mount. Don’t put Login JSX in `app/` *or* skip calling hydrate from boot.
2. **Container** = one host + linking. **Stacks** = which tree. **Screens** = feature files.
3. **Boundary:** JS render UX. **Crashlytics:** records JS **and** native; must be **inited** regardless of React.
4. Query client is **app-wide cache**. Payments context is **local** to that navigator if only payments needs it.
5. **One door**, typed, flavor-aware. Scatter in `model/` = untestable domain + secret/URL drift.
6. **`await` chain** is an explicit state machine. Effects **race**, re-run in Strict Mode, no guaranteed order.
7. First is **TTI-friendly**. Second makes splash = **max(all SDKs)** — startup story dies.
8. **This unit:** sequence and **don’t mount early**. **§5:** AuthStack vs AppStack, back-to-Login, where session **lives**.

## Predict the output

1. **Login (or unauthenticated stack) then jump to Home.** Flash + possible **back** to Login. Hydrate was **after** mount.
2. **No Crashlytics report** for that throw (or a late/unreliable one). Blind boot.
3. **Step 4 / consent.** Legal/policy risk; events before user agreed; maybe events before user id is valid.
4. **Business screen in the shell.** Move to `features/wallet`; `app/` only composes the tab **navigator**.
5. **Unauthenticated or blank UI** for ~400ms, then the real stack — classic **login flash** / flicker.
6. **Step 6 (defer).** **Startup time / TTI** suffer; splash overstays.

## Debugging

1. **Crashlytics inited too late**; **no** JS error boundary (white screen) **and/or** splash hidden on a **thrown** first render. Init reporting **first**; boundary + don’t hide splash until a **successful** gated render (or fallback).
2. **Nav mounted before hydrate** (or splash hidden too early). Gate on `hydrated`; hide splash after.
3. **Nested containers** — linking, `goBack`, getCurrentRoute at root all lie. One container in `app/`.
4. **Auth vs analytics vs nav** interleaving: events before consent, nav before session, prefetch before QueryClient, fonts vs hide-splash races.
5. **Timeout + cached/default flags**; never `await` flags with no deadline before hide-splash / mount.
6. Boundary **swallowed** the error without `crashlytics.recordError` (or reporting not inited). Report **in** `componentDidCatch` / `onError`.

## Application

1. Splash; crashlytics (**see boot failures**); hydrate (**nav input**); analytics (**consent**); mount **right** stack; defer (**TTI**).
2. **providers:** wraps. **bootstrap:** ordered startup. **navigation:** container + gate. **config:** typed env access.
3. `initCrashReporting()` → `session = await hydrateSession()` → `consent = await readConsent()` → maybe `initAnalytics()` → return `{ session, consent }`.
4. `if (!hydrated) return <BootstrapSplash />`; else `isAuthenticated ? <AppStack /> : <AuthStack />`.
5. **`app/` must not contain business screens** (or: must not mount nav before hydrate).
6. **QueryClient:** `app/providers`. **ConfirmPayment:** `features/payments`. **NavigationContainer:** `app/navigation`. **getConfig:** `app/config`. **Linking prefixes:** shell linking config.

## Interview questions

1. **Spoken:** Shell = providers, root container, global boundary, boot sequence, config access, linking. Features own screens, domain, api. I import public navigators, I don’t drop Wallet into `app/`.  
   **Follow-up:** That’s how you keep capability cohesion; `app/` as `screens/` is type-based soup again.

2. **Spoken:** Splash up → crash reporting → hydrate from secure storage → analytics after consent → mount nav already knowing auth → defer the rest.  
   **Follow-ups:** Early Crashlytics = **visible** launch crashes. Analytics later = **consent + TTI**. Production: launch crash collapse and faster first frame because we **stopped** init-everything-before-paint.

3. **Spoken:** Don’t mount the auth stack until hydrate finishes; keep splash (or a bootstrap branch that isn’t Login) until `hydrated`. Then pick Auth vs App. No `useEffect` bounce.

4. **Spoken:** `app/providers` wraps the tree in a **defined** order (boundary, query, theme, safe area, then bootstrap+nav). Feature-only providers stay in that feature’s navigator.

5. **Spoken:** Typed `getConfig()` from the shell. Features don’t read raw env in domain. Secrets that must stay private don’t live in that JS config — that’s the flavors section; boot still needs **URLs and flag defaults**.

## Connections

1. Shell imports **`@features/payments` public navigator**, not `screens/Confirm` internals — same **index.ts** rule.
2. Splash is an **asset / native** surface; the **shell decides hide**. Assets unit is **what** the splash is; this unit is **when**.
3. You can’t improve **crash-free** launch if you **don’t record** launch. Step 2 is the instrumentation; then you fix hydrate/native races.
4. Deferred work = **don’t occupy the JS thread** (and native) during first navigation. Performance chapter is **lists/re-renders**; this is **when work is allowed**.
5. **§5:** conditional **AuthStack vs AppStack**, back-stack hygiene, where session **state** lives. This unit only **delivers a hydrated boolean** and **refuses to mount early**.
