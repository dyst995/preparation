# Navigation architecture (auth stack vs app stack) — Next-day repetition

## How to use

1. Do **not** open `notes.md` first. The full question bank is `self-test.md`; this file is the next-day subset.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] Three-way root: `!hydrated` / `!authenticated` / `AppStack`. Three reasons it matters. Where session lives vs what navigation reads. Tokens at rest.
- [ ] Conditional trees vs redirect hacks. Login success and 401/logout: **state**, not `navigate('Home'|'Login')`. Why `!hydrated` isn’t Login.
- [ ] Why nested `PaymentsStack` (not Confirm as a tab). Modal vs push; why Login modal on Home is still a hack.
- [ ] Shell “when” vs this unit “which tree.” What 04-navigation can wait on.

## Predict / debug

- [ ] `saveSession(); navigation.navigate('Home')` then hardware back — what do they see, and why? 401 then `navigate('Login')` while on Confirm — what’s on the back stack?
- [ ] `AppTabs` always mounted; `Home` `useEffect` navigates to Login if no token. Cold start, no token — flash/history? `isAuthenticated` true but `hydrated` false — which branch wins?
- [ ] After login, Android back shows Login with a valid token. Wallet deep link: Login then Home, link lost — two bugs? Session only in `route.params.user`, kill app — what happens?
- [ ] Confirm as two tabs — what does Back do wrong? Receipt pushed, back to Confirm, double-submit — presentation vs reset? “Action not handled” opening Confirm from Home.

## Say it out loud

- [ ] How do you structure logged-out vs logged-in navigation? Follow-ups: back to Login? where session lives?
- [ ] Recite the spoken gate-on-hydrated answer (state swap, not navigate).
- [ ] Explain auth vs app stacks in 30–60 seconds (include nested payments + modal vs push in one line).
