# App shell responsibilities — Next-day repetition

## How to use

1. Do **not** open `notes.md` first. The full question bank is `self-test.md`; this file is the next-day subset.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] Six shell responsibilities. What must **not** live in `app/`? Shell vs `features/auth` vs a business screen.
- [ ] Six boot steps **in order**. Why crash reporting before hydrate? Why splash stays up? Why analytics after consent? Why defer step 6?
- [ ] Root `NavigationContainer` vs feature screens vs a second container in a feature. Typed `app/config` vs `process.env` in `model/`.
- [ ] Ordered `await runStartup()` vs unordered `useEffect`s. Global error boundary vs Crashlytics (JS vs native). This unit vs §5 stacks.

## Predict / debug

- [ ] Nav mounts immediately; `useEffect` hydrates then `reset`s to Home. What does the user see, and why? Splash hides on first `App` `useEffect` while hydrate takes 400ms — flash?
- [ ] Crashlytics inited **after** `await hydrateSession()`; hydrate throws. What don’t you have? `logEvent('app_open')` in `index.js` before consent — which step and risk?
- [ ] `app/screens/WalletScreen.tsx` because tabs are in `app/`. Nested `NavigationContainer` in payments. Infinite splash, remote config with no timeout.
- [ ] Six unordered `useEffect`s in `App.tsx`. Error boundary fallback but Crashlytics never sees the error. Awaiting maps/chat/prefetch before `hideSplash` — which step and which metric?

## Say it out loud

- [ ] Walk through a safe fintech startup sequence. Follow-ups: crash reporting so early? analytics not immediately? crash-rate / startup stories?
- [ ] What belongs in the shell vs features? How do you avoid a login flash?
- [ ] Explain the app shell in 30–60 seconds (no business screens; six-step boot).
