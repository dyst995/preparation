# Auth flow patterns

## What you need to know

[Nested architecture](../34.%20nested-nav-architecture/notes.md) placed **AuthStack** and **AppTabs** as **Root siblings**. [Unit 17](../17.%20nav-architecture/notes.md) is **which tree**. This unit is the **sequence**: **hydrate → set session once → swap trees on login/logout/401**, plus **session-expiry UX**.

**Learn:**

- **Hydration gate** (don’t pick Auth vs App **before** rehydration)
- **Conditional trees** vs **imperative redirects**
- Preventing **back** to auth after login
- **Forced logout (401)** mid-session
- **Session expiry UX**

**Recommended pattern (preserve):**

1. On launch, show bootstrap/splash while reading **secure storage**.
2. Set auth state **once**.
3. Render **either** `AuthStack` **or** `AppStack`.
4. On login success, auth state change **swaps trees** (no `navigate('Home')`).
5. On logout, **reset** auth state and **clear app state**; auth tree mounts **fresh**.

**Why conditional trees beat redirect soup (preserve):**

- Harder to **back** into Login after entering the app
- **Single** source of truth
- **Deep links** can wait until **hydrated**

**Q: How do you structure logged-out vs logged-in navigation?**

> I gate on hydrated auth state. Unauthenticated users get an Auth stack; authenticated users get the App stack. Switching is driven by state, not by manually navigating between login and home. That prevents back-stack leaks and simplifies deep linking.

**TypeScript param lists** are next. **Logout checklist** (tokens, RQ, stores) is [auth-session](../29.%20auth-session/notes.md). **401 refresh mutex** is [networking](../05-networking.md).

---

## Hydration gate

Until Keychain/Keystore is **read**, you **do not know** `isAuthenticated`. Defaulting it to `false` and mounting **Login** → then flipping to App is a **Login flash**. Defaulting to `true` is a **Home flash** then Login.

**Gate:** a **third** UI: splash / Bootstrap. `hydrated === false` means **no stack chosen**.

```tsx
function RootNavigator() {
  const { hydrated, isAuthenticated } = useSession();

  if (!hydrated) return <BootstrapSplash />;
  return isAuthenticated ? <AppStack /> : <AuthStack />;
}
```

**Set auth state once:** one boot read → `{ hydrated: true, isAuthenticated }`. Don’t `setHydrated(true)` **before** the vault read **finishes**. Don’t toggle `hydrated` on every focus.

Hydrate **fails:** treat as **logged out**, still **`hydrated = true`** or splash **never ends**.

[Shell](../16.%20app-shell/notes.md) **when** (crashlytics, then vault). This unit: **don’t navigate** until that flag is set.

---

## Conditional trees vs redirect soup

**Conditional:** the **JSX tree** is `AuthStack` **xor** `AppStack`. Login **sets session**. React **unmounts** Auth; App **mounts**. Login is **not** under Home.

**Redirect soup:** one stack with **both** worlds; `useEffect` + `navigate('Home')` / `navigate('Login')` / `reset`.

| | Conditional | Redirect soup |
| --- | --- | --- |
| Back after login | Login **unmounted** | Login **under** Home → **back to Login** with a **valid** session |
| Truth | `isAuthenticated` | A pile of **navigate** calls that **desync** |
| Deep link | Wait until **hydrated**, then **one** tree | Link fires on **Login** then **bounces**, or hits Home **while logged out** |
| Logout | App **unmounts** | Must **reset** every nested navigator; easy to miss |

```tsx
// Soup — do not
async function onLoginOk() {
  await saveTokens();
  navigation.navigate('Home');
}
```

**Preventing back to auth** is **not** `gestureEnabled: false` on Home. It is **Login not in history**.

---

## Login, logout, 401 — same mechanism

**Login:** persist tokens → **in-memory** `isAuthenticated = true` → **tree swap**. No `navigate('Home')`.

**Logout / failed refresh:** [checklist](../29.%20auth-session/notes.md) (vault, RQ, stores, cancel in-flight) → `isAuthenticated = false` → **App unmounts**, **fresh AuthStack**. You **cannot** `goBack()` into ConfirmPayment.

**401 mid-session:** do **not** `navigate('Login')` **on top of** Confirm. That **is** redirect soup: Wallet **still underneath**. **Clear session** (after refresh **fails** — mutex is networking). The **root** swaps.

**Queue (optional):** remember **intended URL** / last private route for **after** re-login. Still **not** a Login **push**. Don’t **auto-replay** a **transfer** POST after re-login without a **new** user confirm ([optimistic UI](../31.%20optimistic-ui/notes.md) + **new** confirm = **new** idempotency key **only** if it’s a **new** intent).

---

## Session expiry UX

**Access expired** ≠ logged out. **Silent refresh**; user **stays** on AppStack.

**Refresh token dead / refresh 401:** **forced logout**. UX, not just a boolean:

| Do | Don’t |
| --- | --- |
| Swap to **AuthStack**; **copy** they can understand (“Session expired — sign in again”) | Silent Login with **Wallet still mounted** under it |
| Keep **Confirm** from **surviving** (tree **unmounted**) | Leave a **zombie** Confirm they can submit **without** a token |
| After re-login, **land on App** (tabs); optional **queued** deep link | Auto-send **money** from the **old** screen |
| Foreground: **re-validate** session; if dead, **same** swap | Wait until the **next** 401 on a **button** |

Expiry is **session state**, then **navigation follows**. Toast **on Auth** is enough; don’t **modal Login over App**.

---

## Deep links wait until hydrated

Cold start `myapp://wallet/...`: **Bootstrap** until vault read. Then **either** Auth (optionally **queue** the URL) **or** App (**tree exists**, linking can resolve). Full prefixes/security: [§6](../04-navigation.md). **This** unit: **gate first**, or the link **races** Login vs Home.

---

## Common mistakes and misconceptions

- **`navigate('Home')` / `navigate('Login')`** as the auth API.
- **No splash:** Login flash or Home flash.
- **`hydrated` true too early**; or **never** true on vault error.
- **401 → push Login** on the **current** stack.
- **`gestureEnabled: false`** instead of **unmounting** Auth.
- **Logout** only flips a boolean — RQ **PII** remains ([auth-session](../29.%20auth-session/notes.md)).
- **Session expired** = **access** TTL, skipping **refresh**.
- Answering **native stack vs JS** when they asked **logged-out vs logged-in**.

---

## Connections to other concepts

`splash (!hydrated) → vault read (once) → xor Auth|App → 401/expiry clears session → App unmounts`

- **[Nav architecture](../17.%20nav-architecture/notes.md):** **same** three-way root; this unit is the **launch/401/expiry** playbook.
- **[Nested tree](../34.%20nested-nav-architecture/notes.md):** **where** Auth vs AppTabs **sit**; **don’t push** App onto Auth.
- **[Shell](../16.%20app-shell/notes.md):** **when** hydrate runs.
- **[Auth session](../29.%20auth-session/notes.md):** **what** you clear; this unit **how the tree follows**.
- Next: **typed** routes — still **don’t** put tokens in **params**.

---

## Interview perspective

They want the **five steps**, **why not navigate**, **401 ≠ push Login**. Spoken answer **is** the Q.

Follow-up: **flash** → `!hydrated`. **Back to Login** → Login was **under** Home. **Expiry** → refresh vs **full reset** + **copy**.

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
