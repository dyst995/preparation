# Auth / session state (fintech)

## What you need to know

[Taxonomy](../23.%20state-taxonomy/notes.md) put **session** in a **dedicated auth store + secure storage**. This unit is the **fintech lifecycle**: **memory vs disk**, **access vs refresh**, **hydrate on boot**, **logout as a reset**, **no auth flash**.

**Learn:**

- In-memory session vs **persisted** session
- **Access** vs **refresh** token handling
- **Rehydration** on startup
- **Clearing** stores/caches on logout
- Preventing **UI flash** of authenticated routes

**Logout checklist (memorize):**

1. Clear **secure storage** tokens
2. Clear **React Query** cache (`queryClient.clear()`)
3. Reset **Zustand/Redux** auth slices
4. Reset **navigation** state
5. **Cancel** in-flight requests / drop **auth headers**
6. Stop **notification** listeners if needed

Preserve:

> Logout is a multi-step reset: delete tokens, clear server caches, reset client stores, and reset navigation. If you only flip an `isLoggedIn` boolean, you’ll leak cached personal data.

**Token refresh races** (single-flight 401) are [05-networking.md](../05-networking.md). **What else may persist** (theme vs PAN) is [§8](../03-state-management.md). Don’t dump those here.

---

## In-memory vs persisted session

| | **In-memory** | **Persisted (secure)** |
| --- | --- | --- |
| **What** | `hydrated`, `isAuthenticated`, `userId`, maybe **access** token for **this process** | **Refresh** token (and often **access** too) in **Keychain / Keystore** — [secure-storage](../22.%20easypay-structure/notes.md) |
| **Lifetime** | Dies with the process | Survives kill / reboot |
| **Why split** | Fast **gate** for [nav trees](../17.%20nav-architecture/notes.md) | Next launch can **restore** session **without** password |

**Persisted session ≠ RQ `me` query.** Profile is **server cache**. After kill, **memory RQ is empty**; you **hydrate tokens**, then **fetch** profile. Don’t treat **gcTime** as “still logged in.”

**Do not** persist tokens in Zustand `persist` / AsyncStorage ([Zustand persist](../25.%20zustand/notes.md) warning). That’s §8 in one line: **vault = secure storage**.

---

## Access vs refresh (session-level, not the mutex)

| | **Access** | **Refresh** |
| --- | --- | --- |
| **Life** | **Short** | **Longer** |
| **Use** | `Authorization` header | **Mint** a new access token |
| **Storage** | Memory **and/or** secure; **never** JS `.env` | **Secure storage only** |
| **Logout** | Drop from memory **and** disk | **Must** delete or the next launch **still** looks logged in |

**401:** don’t `navigate('Login')`. Run the **same logout reset** (or a **single-flight refresh** first — networking chapter). Failed refresh → **full checklist**.

---

## Rehydration on startup (no auth flash)

Same order as [app shell](../16.%20app-shell/notes.md):

1. Splash / **`!hydrated`**
2. Read **secure storage**
3. Set **in-memory** session (`isAuthenticated`)
4. **`hydrated = true`**
5. Mount **AuthStack or AppStack**

If you mount **AppStack** before hydrate, you get **Home flash** then Login — or **authenticated UI** with **empty** cache then **another user’s** leftover RQ if you **forgot to clear on last logout**.

**Flash of authenticated routes:** `hydrated === false` must **not** be treated as `isAuthenticated === true`.

```ts
if (!hydrated) return <BootstrapSplash />;
return isAuthenticated ? <AppStack /> : <AuthStack />;
```

---

## Logout is a **reset**, not a boolean

`setLoggedIn(false)` **leaves**:

- RQ **balances** for user A
- Zustand **selectedAccountId**
- **In-flight** GET with **A’s** header **completing** after B logs in
- **Push** listeners still bound to A
- **Nav** history **under** Login ([conditional trees](../17.%20nav-architecture/notes.md))

**Checklist, why each:**

| Step | Leak if skipped |
| --- | --- |
| Secure storage | Next launch **still A** |
| `queryClient.clear()` | **PII / balances** on Login or next user |
| Reset auth/UI stores | **selectedAccountId** / flags from A |
| Reset navigation | **Back** into A’s Confirm |
| Cancel in-flight / headers | **Response** for A **lands** in B’s cache |
| Notifications | **Toasts / taps** for A |

RTKQ: **`resetApiState()`** (or equivalent) — **same idea** as `queryClient.clear()`.

**401 / forced logout:** **one function** `resetSession()` used by **button**, **refresh failure**, and **interceptor**. Don’t three half-checklists.

```ts
async function resetSession() {
  await secureStorage.deleteTokens();
  queryClient.clear();
  useAuthStore.getState().reset();
  useWalletUiStore.getState().reset();
  // navigation: isAuthenticated false → trees swap; don’t navigate('Login')
  http.setAccessToken(null);
  await notifications.detach();
}
```

---

## Common mistakes and misconceptions

- **Only** `isLoggedIn = false`.
- **RQ cache survives** logout (“staleTime”).
- **Hydrate after** mounting Home.
- **Access in AsyncStorage**; refresh in memory only (killed app **loses** refresh **or** the reverse: refresh in **plain** persist).
- **Logout ≠ 401 path.**
- **`navigate('Login')`** instead of **tree swap**.
- Clearing RQ but **not** RTKQ (or the reverse) on Wizer.

---

## Connections to other concepts

`secure tokens → hydrate (shell) → gate (nav) → RQ profile → logout resets all four`

- **[Nav](../17.%20nav-architecture/notes.md):** **state** swaps trees; this unit **fills** hydrate + **logout reset**.
- **[Shell](../16.%20app-shell/notes.md):** **when** hydrate runs.
- **[RQ](../27.%20react-query/notes.md):** **`clear()`** is **user-boundary**, not `invalidateQueries`.
- **[RTKQ vs RQ](../28.%20rtkq-vs-rq/notes.md):** **whichever** cache you use, **wipe it**.
- **§8 Persistence:** theme **may** stay; **tokens must not** in plain storage.

---

## Interview perspective

Memorize the **six** logout ticks. Spoken answer **is** the leak story.

Follow-ups: **hydrate/splash**; **access vs refresh**; **in-flight** after logout.

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
