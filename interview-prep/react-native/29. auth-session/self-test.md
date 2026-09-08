# Auth / session state — Self-test

## Core recall

1. Recite the six **logout checklist** items.
2. Recite “how do you prevent stale user data after logout?”
3. In-memory session vs **persisted** session — one example each.
4. Access token vs **refresh** token (lifetime + where stored).
5. What does **rehydration** mean on startup?
6. What prevents **flash** of authenticated routes?
7. Why `queryClient.clear()` not only `setLoggedIn(false)`?
8. What is the nav move on logout (trees vs `navigate('Login')`)?
9. Where must refresh tokens **not** live?
10. 401 after failed refresh should run **what**?

## Explain why

1. Why is flipping `isLoggedIn` not enough?
2. Why persist **refresh** in secure storage, not only memory?
3. Why is RQ `me` **not** the persisted session?
4. Why `!hydrated` is not `isAuthenticated`?
5. Why cancel **in-flight** requests on logout?
6. Why reset **wallet UI** Zustand, not only auth store?
7. Why stop **notification** listeners?
8. Why **one** `resetSession()` for button and interceptor?
9. Why `queryClient.clear()` vs `invalidateQueries` on logout?
10. Why AuthStack must **unmount** AppStack?

## Compare and contrast

1. Access vs refresh.
2. In-memory `isAuthenticated` vs Keychain tokens.
3. Hydrate-then-mount vs Home-then-redirect.
4. `queryClient.clear()` vs `resetApiState()` (RTKQ).
5. Logout vs 401-forced logout.
6. Session vs [server profile](../23.%20state-taxonomy/notes.md).
7. This unit vs [§8 persist theme](../03-state-management.md).
8. This unit vs [refresh mutex](../05-networking.md).

## Predict the output

1. Logout only sets `isLoggedIn: false`. User B logs in. Home briefly shows A’s **balances**. Why?

2. Splash skipped; `isAuthenticated` still false for 300ms. What flash?

3. Tokens cleared from memory, **not** Keychain. Kill app. Next launch?

4. `queryClient.clear()` skipped. Login screen’s child still had `useQuery` wallet. What leaks?

5. Logout `navigate('Login')` on top of Confirm. Hardware back?

6. In-flight `GET /me` for A completes **after** B’s session is set; no cancel. Cache?

## Debugging

1. User A logs out, B logs in, **push** opens A’s transfer. Which checklist item?

2. Login flash every cold start though tokens exist. Diagnose.

3. `persist` middleware still has `accessToken`. Smell?

4. Wizer RTKQ: `queryClient.clear()` only. Symptom?

5. Confirm still in history after logout because **one** stack. Which architecture unit + this checklist?

6. Hydrate reads storage **after** mounting AppTabs. Two bugs?

## Application

1. Recite the checklist from memory.

2. Recite the stale-data spoken answer.

3. Write `resetSession()` as 6 calls matching the checklist.

4. Sketch RootNavigator `hydrated` / `isAuthenticated` branches.

5. PR rule: “Logout must not …”

6. Classify: `userId` in Zustand; refresh token; RQ profile; `selectedAccountId`.

## Interview questions

1. How do you prevent stale user data after logout?  
   **Follow-up:** What if you only flip a boolean?

2. How do you hydrate session on startup without an auth flash?

3. Where do access and refresh tokens live?

4. What happens on 401 / refresh failure?

5. Walk through cold start for a logged-in fintech user (session only).

## Connections

1. How does this **complete** [nav trees](../17.%20nav-architecture/notes.md)?
2. How does [shell boot](../16.%20app-shell/notes.md) **call** hydrate?
3. How does [RQ](../27.%20react-query/notes.md) **clear** differ from transfer **invalidate**?
4. How does [Zustand](../25.%20zustand/notes.md) **reset** relate to **not** storing txs?
5. Why [flavors](../20.%20flavors-config/notes.md) still don’t put tokens in `.env`?
