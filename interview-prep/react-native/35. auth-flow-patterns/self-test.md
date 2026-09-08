# Auth flow patterns — Self-test

## Core recall

1. Recite the five recommended pattern steps.
2. Recite the three reasons conditional trees beat redirect soup.
3. Recite the spoken answer to “logged-out vs logged-in navigation.”
4. What is the **hydration gate** (what you must **not** do before rehydration)?
5. What are the **three** root UIs (`!hydrated` / logged out / logged in)?
6. What happens to **AuthStack** on login if you **swap trees**?
7. What must **not** be the login-success API?
8. 401 mid-Confirm: **navigate('Login')** or **clear session**?
9. Access token expired vs **refresh token dead** — which **swaps** to Auth?
10. On vault read **failure**, what should `hydrated` / `isAuthenticated` be?

## Explain why

1. Why is mounting Login while `hydrated === false` a **flash**?
2. Why is defaulting `isAuthenticated` to **true** before the vault read worse for a logged-out user?
3. Why does `navigate('Home')` after login allow **back to Login**?
4. Why is **unmounting** Auth stronger than `gestureEnabled: false` on Home?
5. Why is session **one** source of truth better than a pile of `navigate` calls?
6. Why must deep links **wait** until hydrated?
7. Why is 401 → **push Login** on Confirm **redirect soup**?
8. Why shouldn’t re-login **auto-retry** a transfer mutation?
9. Why “set auth state **once**” on boot?
10. Why logout must **clear app state**, not only flip `isAuthenticated`?

## Compare and contrast

1. Conditional trees vs redirect soup.
2. Splash vs AuthStack vs AppStack.
3. `navigate('Home')` vs `isAuthenticated = true`.
4. Access expiry (refresh) vs session expiry (forced logout).
5. 401 handler as **session clear** vs **navigate('Login')**.
6. This unit vs [nav architecture](../17.%20nav-architecture/notes.md).
7. This unit vs [auth-session](../29.%20auth-session/notes.md) logout checklist.
8. Queued deep link after re-login vs replaying the **old** Confirm screen.

## Predict the output

1. `hydrated` starts false, you render `isAuthenticated ? App : Auth` **without** a splash. Vault has tokens. First paint?

2. Login success: `saveTokens(); navigation.navigate('Home')`. User swipes back. Screen? Session?

3. User on Confirm. Interceptor `navigation.navigate('Login')`. Hardware back. Where? Tokens?

4. Refresh **succeeds** after access 401. Root `isAuthenticated` still true. Tree?

5. Refresh **fails**. You only `setIsAuthenticated(false)` and leave RQ cache. Next login, Home shows **previous user’s** balances until refetch. Why?

6. Deep link cold start; linking resolves **before** `hydrated`. Logged out. What race?

## Debugging

1. Users see Login for 200ms every cold start even when logged in. Diagnose.

2. After login, Android back shows Login; tokens are valid. Diagnose.

3. 401: Login modal on top of Wallet. Back returns to Wallet **without** tokens. Fix?

4. Splash **forever**. Hydrate catch doesn’t set `hydrated`. Fix?

5. “Session expired” toast on **Wallet** while still on AppStack after **failed** refresh. Tree didn’t swap. What was missed?

6. Re-login after expiry **immediately** fires the **old** `mutate(transfer)` from an unmounted Confirm’s closure. What’s wrong?

## Application

1. Recite five steps, three why-bullets, spoken Q answer.

2. Write the RootNavigator three-way render.

3. Login `onSuccess` in **one line** (session, not navigate).

4. 401-after-failed-refresh: list **nav** + **session** actions (not the mutex).

5. Session-expiry UX: two **Do**s and two **Don’t**s.

6. PR rule: “Auth routing is driven by … never …”

## Interview questions

1. How do you structure logged-out vs logged-in navigation?  
   **Follow-up:** Why not `navigate('Home')`?

2. How do you prevent returning to Login after authentication?

3. How do you handle 401 mid-session (user is on Confirm)?

4. What is the hydration gate? What flash if you skip it?

5. Session expired — what does the user **see**, and what happens to the **back stack**?

## Connections

1. How does [shell](../16.%20app-shell/notes.md) **when** relate to this **gate**?
2. How does [unit 17](../17.%20nav-architecture/notes.md) **which tree** relate without replacing this sequence?
3. How does [nested tree](../34.%20nested-nav-architecture/notes.md) **sibling** Auth/App prevent Login-under-Home **if you still `navigate`**?
4. What does [auth-session](../29.%20auth-session/notes.md) add on logout that this unit **assumes**?
5. Why is the **refresh mutex** [networking](../05-networking.md) and **not** this unit’s 401 **navigation** answer?
