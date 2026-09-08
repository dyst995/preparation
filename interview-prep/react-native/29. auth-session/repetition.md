# Auth / session state — Next-day repetition

## How to use

1. Do **not** open `notes.md` first. The full question bank is `self-test.md`; this file is the next-day subset.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] Six logout ticks. Spoken stale-data answer. Memory vs Keychain. Access vs refresh. `!hydrated` ≠ authenticated.
- [ ] Why boolean-only leaks. Why `clear()` not `invalidate` on logout. Tree swap vs `navigate('Login')`. One `resetSession()` for 401.
- [ ] RQ profile ≠ persisted session. Cancel in-flight. Reset wallet UI store. Notifications. RTKQ `resetApiState`.
- [ ] Shell hydrate vs this reset. §8 theme vs tokens. Networking mutex is **not** this unit.

## Predict / debug

- [ ] Logout only `isLoggedIn: false`; B sees A’s balances. Splash skipped, 300ms unauthenticated. Tokens not deleted from Keychain; kill app.
- [ ] `clear()` skipped; Login child still `useQuery` wallet. `navigate('Login')` on Confirm; hardware back. A’s `GET /me` completes after B is set.
- [ ] Push opens A’s transfer after B login. Login flash though tokens exist. Zustand persist still has `accessToken`. Wizer: only `queryClient.clear()`.
- [ ] Hydrate **after** AppTabs mount. Confirm still in history after logout (one stack).

## Say it out loud

- [ ] How do you prevent stale user data after logout? Follow-up: boolean only?
- [ ] Hydrate without auth flash. Access vs refresh storage. 401 / refresh failure.
- [ ] Recite the six-tick checklist, then the spoken reset paragraph (30–60s).
