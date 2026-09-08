# App shell responsibilities — Self-test

## Core recall

1. What is `app/` for, in one sentence? What must **not** live there?
2. List the six curriculum shell responsibilities (providers through linking).
3. Recite the six-step startup sequence in order.
4. Name typical providers the shell composes.
5. What does the shell own in navigation vs what a feature owns?
6. Where should typed env/config be **read from** by features?
7. What is a global error boundary for (and what does it **not** catch)?
8. What does “hydrate auth/session” mean here?
9. When should analytics be initialized relative to consent?
10. What is deferred in step 6, and why?

## Explain why

1. Why does dumping `PaymentConfirm` into `app/` defeat feature-based architecture?
2. Why init **crash reporting before** session hydrate?
3. Why keep the **native splash up** until after hydrate (not hide on first JS tick)?
4. Why mount navigation only with **known** auth state?
5. Why analytics **after** consent, not at JS startup?
6. Why defer prefetch and secondary SDKs?
7. Why is provider **order** the shell’s job, not each feature’s?
8. Why shouldn’t each feature create its own `NavigationContainer`?
9. Why is a `useEffect` in `HomeScreen` that `reset`s to Login a weak substitute for bootstrap?
10. Why must remote config not be an **infinite** gate on splash?

## Compare and contrast

1. `app/` vs `features/auth` (session vs screens vs when hydrate is **called**).
2. Root `NavigationContainer` vs `AuthStack` / `AppStack` vs a business screen.
3. Global error boundary vs Crashlytics (JS vs native).
4. Global `QueryClientProvider` vs a payments-only React context.
5. Typed `app/config` access vs scattering `process.env` in `model/`.
6. Ordered `await runStartup()` vs several unordered `useEffect`s in `App.tsx`.
7. Hide splash after gated first paint vs awaiting every SDK before hide.
8. This unit (when to mount) vs §5 (which stacks / back-to-Login) — don’t mix.

## Predict the output

1. `App.tsx` mounts `NavigationContainer` immediately; `useEffect` hydrates then `reset`s to Home. What does the user see, and why?

2. Crashlytics `init` is the last line after `await hydrateSession()`. A throw in hydrate — what don’t you have?

3. Analytics `logEvent('app_open')` runs in `index.js` before consent is read. Which step did you skip, and what’s the risk?

4. `src/app/screens/WalletScreen.tsx` exists because “the tab navigator is in `app/`.” What’s wrong?

5. Splash hides in `useEffect(() => {}, [])` on `App`. Hydrate takes 400ms. What flash can appear?

6. You `await` maps SDK, chat, and three prefetches **before** `hideSplash`. Which step was violated, and what metric suffers?

## Debugging

1. Launch crash rate is high; Crashlytics shows almost **no** boot errors, but users report white screen on start. Name two shell bugs that fit.

2. Users see Login for 200ms every cold start even when logged in. Diagnose.

3. Review: `features/payments/PaymentApp.tsx` wraps another `NavigationContainer`. What breaks?

4. `App.tsx` has six `useEffect`s: fonts, crashlytics, auth, analytics, remote config, prefetch — no `await` chain. What can race?

5. Infinite splash. Remote config fetch has no timeout. Fix in shell terms.

6. Error boundary shows fallback, but Crashlytics never got the error. What’s missing?

## Application

1. Recite the six boot steps from memory with one “why” each.

2. Sketch `app/` folders: `providers/`, `bootstrap/`, `navigation/`, `config.ts`. One line each.

3. Write a `runStartup()` outline (ordered calls, return session/consent).

4. Write a 10-line `RootNavigator` that branches on `!hydrated` vs auth (no full stack files).

5. Write a one-line PR rule: “`app/` must not …”

6. Place: `QueryClientProvider`, `ConfirmPaymentScreen`, `NavigationContainer`, `getConfig()`, linking prefixes.

## Interview questions

1. What belongs in the RN app shell vs in features?  
   **Follow-up:** Why not business screens in `app/`?

2. Walk through a safe startup sequence for a fintech app.  
   **Follow-ups:** Why crash reporting so early? Why not analytics immediately? How does this help crash-rate / startup stories?

3. How do you avoid a login flash on cold start?

4. How do providers get composed, and who owns that?

5. Where does environment config live at boot time? (Stay on **access**, not the full secrets/flavors lecture.)

## Connections

1. How does the shell **import** features without breaking [inner layering](../15.%20feature-layering/notes.md)?
2. How does splash staying up connect to [assets](../11.%20assets/notes.md)?
3. How does step 2 connect to [debugging](../12.%20debugging/notes.md) / crash-free users?
4. How does deferring SDKs connect to [threads](../4.%20threads/notes.md) / [performance](../06-performance.md)?
5. What does §5 add that this unit deliberately leaves as “mount the right tree”?
