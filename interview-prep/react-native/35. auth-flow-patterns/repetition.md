# Auth flow patterns — Next-day repetition

## How to use

1. Do **not** open `notes.md` first. The full question bank is `self-test.md`; this file is the next-day subset.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] Five pattern steps. Three reasons trees beat redirects. Spoken logged-out vs logged-in answer.
- [ ] Hydration gate: splash until vault read; set session **once**. `navigate('Home')` vs swap trees. 401 → clear session, don’t push Login.
- [ ] Access expiry (refresh, stay on App) vs refresh dead (forced logout + Auth copy). Logout clears app state, not only a boolean.
- [ ] Deep links wait until hydrated. Don’t auto-replay a transfer after re-login.

## Predict / debug

- [ ] No splash, tokens in vault: first paint? `saveTokens(); navigate('Home')` then swipe back. 401 `navigate('Login')` on Confirm then hardware back.
- [ ] Refresh succeeds vs fails (RQ leftover). Deep link before `hydrated`.
- [ ] Login flash every cold start. Splash forever. Failed refresh but Wallet still showing. Old `mutate(transfer)` after re-login.

## Say it out loud

- [ ] How do you structure logged-out vs logged-in navigation? Follow-up: why not `navigate('Home')`? 401 on Confirm?
- [ ] What is the hydration gate? Session expired — what does the user see and what happened to the back stack?
- [ ] Recite the five-step recommended pattern as a 30–60s launch story.
