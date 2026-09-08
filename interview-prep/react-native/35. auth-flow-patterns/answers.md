# Auth flow patterns — Answers

## Core recall

1. Splash while reading secure storage → set auth **once** → **xor** Auth/App → login **swaps trees** (no `navigate('Home')`) → logout **reset** + **clear app state**, Auth **fresh**.
2. Harder to **back** into Login; **single** source of truth; deep links **wait** until hydrated.
3. **Gate on hydrated auth state. Auth stack vs App stack. Switching by state, not navigating login↔home. Prevents back-stack leaks; simplifies deep linking.**
4. **Don’t decide** Auth vs App (don’t mount those trees as the **chosen** route) **until** vault rehydration **finishes**.
5. **Splash**; **AuthStack**; **AppStack**.
6. **Unmounts**. Login **not** in App history.
7. **`navigation.navigate('Home')`** (or `reset` to Home **on top of** Login).
8. **Clear session** (failed refresh) so the **root swaps**. Not a Login **push**.
9. **Refresh dead / refresh 401** — **swap**. Access expiry **alone** → **silent refresh**, stay on App.
10. `hydrated: true`, `isAuthenticated: false` (logged out, **leave splash**).

## Explain why

1. First paint assumes **logged out**; then tokens arrive → **swap to App**. That’s a **Login flash**.
2. First paint **Home**; vault empty → **Home flash** then Login (**auth flash** of **private** UI).
3. Home is **pushed on** Login; **history still has Login**.
4. Disabled gesture **doesn’t** remove Login from the **stack**; hardware/other paths can still **pop**. **Unmount** = **no** Login route.
5. Navigates can **race** hydrate and **disagree** with tokens. One boolean **drives** the tree.
6. Until hydrated you **don’t know which tree exists**. A link into Wallet while Login is showing **bounces** or **leaks**.
7. App **stays mounted** under Login; **back** returns to **Confirm** with **no** session (or **stale** tokens).
8. That’s a **new** session; old Confirm was **intent in a dead tree**. Auto-POST can **double-pay** or send **without** a fresh confirm.
9. Repeated sets → **flicker** (Auth/App/Auth) or **re-mount** stacks (lose tab state).
10. RQ/Zustand still hold **PII**; next user (or same user) **sees** leftover cache.

## Compare and contrast

1. **xor trees** vs **one stack + navigate**. Back/leak/links.
2. **Unknown**; **logged out**; **logged in**.
3. **Imperative history mutation** vs **state → render**.
4. **Stay on App**, new access token vs **full logout** + Auth tree.
5. **Unmount App** vs **Login overlay**.
6. 17 = **tree/IA**. This = **boot/login/401/expiry sequence**.
7. 29 = **what to delete**. This = **tree follows session**.
8. **Optional** resume **route** vs **must not** resurrect an **in-flight pay**.

## Predict the output

1. **Login (or Auth) first**, then **App** — **Login flash**.
2. **Login**. Session **still valid**.
3. **Confirm** (or Wallet). Tokens **maybe still there** if you didn’t clear — **worst** of both.
4. **AppStack stays**. User **shouldn’t** see Login.
5. Logout **didn’t** `queryClient.clear()` (and friends). Boolean **isn’t** a reset.
6. Link **targets App screens** while **Auth** is up (or vice versa) — **bounce**, **not handled**, or **wrong** tree.

## Debugging

1. **No `!hydrated` splash** (or `hydrated` true **before** vault). Gate **until** read completes.
2. **`navigate('Home')`** / Login **still in** history. **Swap trees**.
3. **Don’t push Login.** Failed refresh → **logout checklist** + `isAuthenticated false`.
4. **`hydrated = true`** in `finally`; treat error as logged out.
5. **`isAuthenticated` still true** or Root **not reading** it. **Clear session** so Root **re-renders Auth**.
6. **Don’t** keep that mutation **alive** across unmount; **don’t** auto-fire. New confirm = **new** user intent.

## Application

1. Pattern + three bullets + spoken paragraph.
2. `if (!hydrated) splash; return isAuthenticated ? <AppStack /> : <AuthStack />`.
3. `await saveSession(tokens); setAuthenticated(true);` (store/feature — **not** `navigate`).
4. **Failed refresh** → logout checklist → `isAuthenticated false` → **App unmounts**. Optional **queue URL**. **No** `navigate('Login')`.
5. **Do:** Auth copy “session expired”; unmount App. **Don’t:** Login overlay; auto-send money.
6. **…`hydrated` + `isAuthenticated` … never `navigate('Home'|'Login')` as the auth API.**

## Interview questions

1. **Spoken:** Gate on **hydrated** auth state. Logged out → **Auth stack**; logged in → **App stack**. Switch by **state**, not navigating login↔home. Prevents **back-stack leaks**; simplifies **deep linking**.  
   **Follow-up:** `navigate('Home')` **leaves Login underneath**.

2. **Spoken:** Auth **unmounts**. Login **isn’t** in the back stack. Not a disabled gesture.

3. **Spoken:** Don’t push Login on Confirm. **Refresh** if that’s the policy; on failure **logout reset**; **tree swaps**. Optional **queue** the URL.

4. **Spoken:** Splash until vault read. Skip it → **Login flash** or **Home flash**.

5. **Spoken:** **AuthStack** + short **copy**. App **unmounted** — **cannot** back into Wallet. **Not** a modal over Home.

## Connections

1. Shell **orders** hydrate **before** mounting the **chosen** navigator. This unit **is** that gate in the **root render**.
2. 17 **draws** the xor. This unit **runs** it through **login/logout/401/expiry**.
3. Siblings **help** only if you **don’t push** App onto Auth. **`navigate('Home')` still leaks** even with a pretty diagram.
4. Tokens, RQ, stores, in-flight, push listeners. This unit **assumes** that reset so Auth is **clean**.
5. Mutex **dedupes refresh HTTP**. Navigation answer is **still** “don’t push Login; **session** drives the **tree**.”
