# Auth / session state — Answers

## Core recall

1. Secure storage; `queryClient.clear()`; Zustand/Redux auth; **nav** reset; cancel in-flight / headers; **notifications**.
2. **Multi-step reset:** tokens, server caches, client stores, navigation. **Boolean only → leak PII.**
3. **Memory:** `isAuthenticated` / `userId`. **Disk:** refresh (and often access) in **Keychain/Keystore**.
4. **Access:** short, headers. **Refresh:** longer, **secure** only, mints access.
5. Read **secure storage** into **memory** **before** choosing a stack.
6. **`!hydrated` splash** — don’t mount Auth/App until the read **finishes**.
7. **Balances/profile** stay in cache → **next user / Login** sees them.
8. **`isAuthenticated = false`** → **swap trees**; **don’t** push Login.
9. **`.env` / AsyncStorage / Zustand persist.**
10. **Full `resetSession()`** (after failed refresh).

## Explain why

1. **Caches, tokens on disk, nav, in-flight, push** still hold **A**.
2. Process death **wipes** memory; user expects **stay logged in**.
3. RQ **dies** with process / **clear**; session is **tokens**, then **refetch**.
4. Unknown ≠ logged in. Unknown ≠ logged out **UI** either — **splash**.
5. A’s **response** can **write** B’s cache / show A’s data.
6. **selectedAccountId** (and similar) is **A’s** client state.
7. **Taps / FCM** still **route** into A’s world.
8. **Half** checklists **diverge**; 401 **misses** a step.
9. **Invalidate** **refetches** — still **user A’s** queries if token still set. **Clear** **drops** the **data**.
10. So **back** cannot restore **A’s** screens.

## Compare and contrast

1. **Short header** vs **long-lived mint**.
2. **Gate** vs **restore across launches**.
3. **No wrong tree** vs **flash + extra history**.
4. **Same intent** — wipe **that** server cache.
5. **Same `resetSession()`**; 401 may **try refresh first**.
6. **Gate/tokens** vs **fetchable profile**.
7. **Theme** can persist **plain**; **tokens** cannot. §8 expands.
8. **This:** **where** tokens live + **reset**. **Networking:** **how** many 401s **share** one refresh.

## Predict the output

1. **RQ still has A** — B’s Home **reuses** cache (or shows A until refetch). **PII leak.**
2. **Login (or empty) flash**, then App — **or** App then Login. **No hydrate gate.**
3. **Still logged in** (refresh survives).
4. **A’s wallet** on a screen that **didn’t unmount** or **repopulated** from cache.
5. **Confirm (A)** — session **false** but **history** remains.
6. **A’s profile** in **B’s** cache.

## Debugging

1. **Notifications** not detached (or deep-link queue). Checklist #6.
2. **Nav mounted before hydrate** (or splash hidden early).
3. **Token in plain persist.** Move to **secure storage**; don’t persist that field.
4. **RTKQ cache remains.** `resetApiState()` too.
5. **[Nav architecture](../17.%20nav-architecture/notes.md)** + **reset nav / tree swap**.
6. **Flash** + **possible stale RQ** from **previous** user if logout was also incomplete.

## Application

1. Six ticks as curriculum.
2. Multi-step reset; boolean leaks cache.
3. `deleteTokens`; `queryClient.clear()`; `auth.reset()`; tree swap; `http.setToken(null)` + cancel; `notifications.detach()`.
4. `!hydrated` splash; else auth ? App : Auth.
5. **…only flip `isLoggedIn` — it must run the full reset.**
6. **userId:** memory session. **Refresh:** secure. **Profile:** RQ. **selectedAccountId:** Zustand — **reset on logout**.

## Interview questions

1. **Spoken:** Logout is a **multi-step reset**: delete tokens, **clear server caches**, reset **client stores**, **reset navigation**. Boolean only **leaks** cached personal data.  
   **Follow-up:** List the six ticks; in-flight + headers + push.

2. **Spoken:** Splash while **`hydrated` false**; read Keychain; then **Auth vs App**. Never mount Home first.

3. **Spoken:** **Refresh** (and typically access) in **secure storage**. Access in memory for the **header**. Not `.env`.

4. **Spoken:** Try **refresh** (networking). On **failure**, **same `resetSession()`**.

5. **Spoken:** Splash → crash reporting (shell) → **hydrate tokens** → analytics/consent → **mount correct stack** → **then** RQ **profile/balances**.

## Connections

1. **Hydrate flag + tree swap** **are** the nav pattern; this unit **owns** tokens and **logout reset**.
2. Boot **step 3** **is** this hydrate.
3. **Invalidate** = **same user**, new **server** truth. **Clear** = **user boundary**.
4. Reset **UI** store; **txs were never** in Zustand if you did RQ right — **still** reset **ids**.
5. **`.env` is the bundle.** Session secrets are **device vault**, not compile-time config.
