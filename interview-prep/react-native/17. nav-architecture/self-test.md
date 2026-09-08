# Navigation architecture (auth stack vs app stack) — Self-test

## Core recall

1. Draw the three-way `RootNavigator` (`hydrated` / `authenticated`).
2. What three problems does this pattern solve (curriculum “why this matters”)?
3. What is a **conditional navigator** vs a **redirect hack** (one sentence each)?
4. Where should session state live? What does navigation do with it?
5. Where do tokens **at rest** belong?
6. Why do payment (transfer, KYC) flows get a **nested stack**?
7. Modal vs push: one line each. Does a modal replace AuthStack?
8. What should login **success** do instead of `navigate('Home')`?
9. What should **logout / 401** do instead of `navigate('Login')`?
10. What is the `!hydrated` branch **for** (if not Login and not Home)?

## Explain why

1. Why does `navigate('Home')` after login cause “go back to Login”?
2. Why does swapping trees on session change fix that?
3. Why are deep links easier when Auth and App are **separate** trees?
4. Why must deep links **wait** for `hydrated`?
5. Why is session **not** “just a route param”?
6. Why is Login as a **modal over Home** still a redirect-shaped design?
7. Why shouldn’t Confirm Payment be a **tab**?
8. Why is a single giant stack a poor `AppStack`?
9. Why can hydrate **failure** still set `hydrated: true`?
10. Why doesn’t changing navigator **type** (native vs JS stack) answer this architecture question?

## Compare and contrast

1. App shell “when to mount” vs this unit’s “which tree.”
2. Conditional trees vs `reset`/`navigate` after hydrate.
3. `AuthStack` vs `AppStack` vs Bootstrap splash — what’s in history?
4. `features/auth` vs `RootNavigator` vs `app/` screens.
5. Nested `PaymentsStack` vs pushing Confirm onto the **tab** navigator.
6. Modal receipt vs push Confirm vs modal Login on Home.
7. 401: `navigate('Login')` vs clearing session.
8. This unit vs [04-navigation.md](../04-navigation.md) (what you defer).

## Predict the output

1. Login screen: `saveSession(); navigation.navigate('Home')`. User then hardware-backs. What do they see, and why?

2. Root always renders `AppTabs`; `useEffect` in `Home` does `if (!token) nav.navigate('Login')`. Cold start, no token. What happens (flash, history)?

3. Cold start with `myapp://wallet/123` while `hydrated === false`. If you **don’t** gate, what can go wrong?

4. User is in `PaymentsStack` Confirm. 401. You `navigation.navigate('Login')`. What’s on the back stack?

5. Transfer Amount → Confirm implemented as two **tabs**. What does Back do that’s wrong?

6. `isAuthenticated` flips true but `hydrated` is still false. Which branch should win, and why?

## Debugging

1. After login, Android back shows Login with a **valid** token. Diagnose.

2. Logged-in user opens a wallet deep link and lands on Login, then Home, then the link is **lost**. Name two architecture bugs.

3. Review: `AuthStack` and `AppTabs` are **siblings** in **one** stack; login `replace`s to Home. What still goes wrong on logout?

4. “Action not handled” when opening Confirm from Home tab. Likely targeting problem?

5. Session is only in `route.params.user` after login. Kill and reopen. What happens?

6. Receipt is `push`ed onto PaymentsStack; user completes pay, taps back, sees Confirm again and can **double-submit**. Presentation vs reset?

## Application

1. Write a ~12-line `RootNavigator` with the three branches.

2. Recite the spoken answer: logged-out vs logged-in navigation.

3. Sketch `AppStack`: tabs + one nested `PaymentsStack` (three screen names).

4. Write the login-success and logout **state** updates (no `navigate` to Home/Login).

5. One sentence: when you choose **modal** vs **push** for a PIN sheet vs Amount→Confirm.

6. PR checklist line: “Login/logout must not …”

## Interview questions

1. How do you structure logged-out vs logged-in navigation?  
   **Follow-ups:** Back to Login? Where does session live?

2. Conditional navigators vs redirecting in `useEffect` — why does it matter?

3. How do payment flows fit in the navigator tree?

4. How does this pattern help deep links? (Architecture only — not `adb`.)

5. Modal vs push — when do you use each in a fintech app?

## Connections

1. How does this **complete** the shell’s “mount with correct auth”?
2. How do feature **public navigators** (`AuthStack`, `PaymentsNavigator`) plug into the root?
3. How does 401 handling connect to **auth feature** vs **navigation hacks**?
4. What will 04-navigation add that you should **not** dump into this answer?
5. How do route **params** (amount id) vs session **token** stay in different layers ([feature layering](../15.%20feature-layering/notes.md))?
