# Navigation architecture (auth stack vs app stack) — Answers

## Core recall

1. `if !hydrated → Splash/Bootstrap`; `if !authenticated → AuthStack`; **else** `AppStack` (tabs/drawer + nested stacks).
2. **No back-to-Login**; **deep links** easier to reason about; **session ownership** is clear.
3. **Conditional:** which navigator **renders** depends on session. **Hack:** same tree, **imperative** `navigate`/`reset` to Login/Home.
4. **`features/auth` + secure storage.** Navigation **reads** `hydrated` / `isAuthenticated`; it does not own tokens.
5. **Secure storage** (not navigator params, not a JS-only store as the sole copy of refresh tokens).
6. Multi-step **flow**: back = previous **step**; can reset that stack on complete; deep links map into the flow.
7. **Push:** deeper in a flow. **Modal:** overlay/dismiss. **No** — Login is a **tree**, not a modal on Home.
8. **Persist session / set `isAuthenticated`.** Root remounts `AppStack`.
9. **Clear session** (and app cache as needed). Root remounts `AuthStack`.
10. You **don’t know** yet — don’t pick Auth or App; avoid flash and premature links.

## Explain why

1. Home is **pushed on** Login, so Login **stays in history**. Back **pops** to Login.
2. `AuthStack` **unmounts**; it is **not** under App. Back cannot reach it.
3. Only **one** of Auth/App exists. Linking maps to screens that **are** in the mounted tree (or you queue until login).
4. Before hydrate you might mount **Login** (or empty) and **consume** the URL against the wrong tree, or bounce and **drop** the link.
5. Params die with the screen/process. Session must **survive** relaunch via secure storage.
6. Home (app) is still **mounted**; Login is a **layer**, history and “am I in the app?” diverge; back/dismiss is messy.
7. Tabs are **sections** you switch between, not wizard **steps**. Back from Confirm would not mean Amount.
8. No tab state, terrible back, every screen fights for the same history; sections aren’t modeled.
9. Otherwise **infinite splash**. Failed read = **logged out**, but the **decision is done**.
10. That’s **presentation/performance** of a stack. This question is **which trees exist** given session.

## Compare and contrast

1. Shell: **crashlytics, splash, hydrate, then mount**. This unit: **Auth vs App vs bootstrap** as the mounted tree.
2. Trees **replace** each other vs **commands** that can leave the old route **under** you.
3. Bootstrap: **no** auth/app history. Auth: only auth screens. App: **no** Login in that history.
4. **Auth feature:** storage + session API + Login **screens**. **Root:** switch. **`app/`:** container/gate — **not** Wallet.tsx.
5. Nested stack: Confirm is **inside** payments flow. Tab `navigate('Confirm')`: often **wrong navigator** / “action not handled.”
6. Receipt **modal** = overlay. Confirm **push** = next step. Login **modal** on Home = hack.
7. `navigate('Login')` **pushes** Login onto App. Clearing session **destroys** App history.
8. **This:** trees, session owner, nested flows, modal vs push. **04:** native vs JS, TS params, linking config, push notifications, test commands.

## Predict the output

1. **Login** (still in stack). Token is valid — UX/security bug: they think they logged out or the session looks inconsistent.
2. **Home (or tabs) flash**, then Login **on top**. Back may return to an **unauthenticated Home**. Classic redirect hack + no hydrate gate.
3. Link resolved against **Bootstrap/Auth** or a **not-yet-auth** tree — wrong screen, error, or **lost** URL. Gate: wait, then Auth or App.
4. **Login on top of Confirm** (and the rest of App). Back → Confirm while **401** — broken session + back-to-app.
5. Back **switches tab** (or exits) instead of returning to Amount. Flow isn’t a stack.
6. **`!hydrated` wins.** You must not mount App/Auth until the session read **finished**. `isAuthenticated` is meaningless until then.

## Debugging

1. **Login left in history** — used `navigate('Home')` (or one shared stack). Switch to **conditional** trees.
2. **No hydrate wait**; **no queued link** after Auth. Also possible: link handled while still on Auth. Wait → then target App tree (or store URL).
3. Logout `replace` might miss **nested** state; **back** can still find Auth/App siblings. Prefer **unmounting** App by session flag, not a one-shot `replace`.
4. You dispatched to the **tab** (or root) navigator, not **PaymentsStack**. Nesting: navigate **into** the stack that **registers** Confirm.
5. **Logged out** (or empty user). Params weren’t persistence. Hydrate from **secure storage**.
6. Confirm still **under** receipt. **Reset** the payments stack (or `replace` the flow root) on success; or show receipt as **modal** then pop the flow. Don’t leave Confirm underneath a completed pay.

## Application

1.

```tsx
if (!hydrated) return <BootstrapSplash />;
return isAuthenticated ? <AppStack /> : <AuthStack />;
```

2. Gate on **hydrated** auth. Logged-out → Auth stack; logged-in → App stack. Switch by **state**, not navigate Login↔Home. Prevents back-stack leaks; simplifies deep links.

3. `AppTabs`: HomeStack, WalletStack, **PaymentsStack** (`Amount`, `Confirm`, `Status`), ProfileStack.

4. Login: `setSession(tokens)` / `isAuthenticated = true`. Logout: `clearSession()` / `isAuthenticated = false`. No `navigate('Home'|'Login')`.

5. **PIN sheet:** modal. **Amount→Confirm:** push on `PaymentsStack`.

6. **Login/logout must not `navigate` to Home/Login** — they **change session** so the root **swaps trees**.

## Interview questions

1. **Spoken:** I gate on hydrated auth. Unauthenticated → Auth stack; authenticated → App stack. Switching is **state**, not navigating Login to Home. That prevents back-stack leaks and simplifies deep linking.  
   **Follow-ups:** Back-to-Login = Login was **under** Home. Session = **auth feature + secure storage**; root **reads** flags.

2. **Spoken:** Redirects leave the old screen in **history** and desync from session. Conditional trees **unmount** the other world. Deep links hit a **known** tree after hydrate.

3. **Spoken:** Payments is a **nested stack** under the app (from a tab or root): steps push; complete **resets** that stack. Not a tab per step.

4. **Spoken:** Bootstrap until hydrated; then either Auth (maybe **queue** the URL) or App where the path **exists**. No race against Login still being current.

5. **Spoken:** Push = next **step** in a flow. Modal = **overlay** (receipt, help, PIN). Don’t present Login as a modal on the authenticated tree.

## Connections

1. Shell **refuses** to mount until hydrate; this unit **defines** the three children of that mount.
2. Root imports **`AuthStack` / `AppStack` / `PaymentsNavigator` from feature `index.ts`**, not `screens/Login` internals.
3. 401 is an **auth/session** event (clear tokens). Navigation **reacts**. A `navigate('Login')` in the API layer is the hack.
4. Native vs JS stack, param **types**, linking **config**, notification **router**, `adb`/`simctl`. This answer stays on **trees + session**.
5. **Token / hydrated:** auth **model** + storage. **`transferId`:** route **params** on the payments screen. Screens don’t store refresh tokens in params; `model/` doesn’t import `useNavigation`.
