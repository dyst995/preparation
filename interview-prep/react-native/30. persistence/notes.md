# Persistence

## What you need to know

[Auth/session](../29.%20auth-session/notes.md) said **tokens live in the vault**. This unit is the **rest of disk**: **what may sit in plain storage**, **Zustand persist caveats**, **when rehydrate vs splash**, **schema versions**.

**Learn:**

- What is **safe** to persist
- What **must** use **Keychain / Keystore**
- **Zustand persist** caveats
- **Rehydration timing** and splash/bootstrap
- **Migrating** persisted schemas (**versioning**)

**Table (preserve):**

| Persist OK (usually) | Do not persist in **plain** storage |
| --- | --- |
| Theme preference | Access/refresh tokens |
| Language | PANs / CVV / secrets |
| Non-sensitive UI flags | Raw **personal financial** payloads if avoidable |

Preserve:

> I persist non-sensitive UI preferences casually. Tokens and secrets go to secure storage. I version persisted state and handle rehydration explicitly during bootstrap so navigation doesn’t race.

**Optimistic UI** is next. This unit is **disk**, not mutation UX.

---

## Two disks, not one “local storage”

**Plain storage** (AsyncStorage, MMKV **without** encryption, Zustand `persist` default): convenient, **backed up**, **readable** on a rooted/jailbroken device, **not** a vault.

**Secure storage** (iOS **Keychain**, Android **Keystore**-backed): OS-protected; still **not** immune to a **compromised** device, but the **correct** home for **tokens**.

**Rule:** if **extraction from the backup/app sandbox** would be **catastrophic**, it does **not** go in plain persist — same spirit as [`.env` ≠ secret](../20.%20flavors-config/notes.md).

**RQ cache** of **balances/txs** is **memory** by default. Persisting **that** JSON to disk is “**raw personal financial payloads**” — **avoid**. Refetch after hydrate. **Theme** can survive logout; **ledger cache** should not.

---

## Zustand `persist` caveats

`persist` **serializes** the store to **whatever storage you pass** (often AsyncStorage).

| Caveat | Why it bites |
| --- | --- |
| **Rehydrate is async** | First paint may see **initialState** (`isAuthenticated: false`, `theme: light`) **then** snap. **Nav races.** |
| **Whole store** | If the store **also** has `accessToken`, it **lands on disk**. **`partialize`** |
| **No version** | You add a field, old JSON **crashes** or **mis-reads**. **`version` + `migrate`** |
| **PII** | `selectedAccountId` is mild; **cached txs** in the same store is **not** |

```ts
persist(
  (set) => ({ theme: 'light', hasSeenOnboarding: false, /* NOT tokens */ }),
  {
    name: 'ui-prefs',
    version: 1,
    partialize: (s) => ({ theme: s.theme, hasSeenOnboarding: s.hasSeenOnboarding }),
    migrate: (persisted, version) => { /* map v0 → v1 */ return persisted; },
  },
);
```

**Skip** persisting **until** `onRehydrateStorage` / persist **hasHydrated** — or **don’t** drive **Auth vs App** off this store at all: **session hydrate** is **secure storage**, **separate** from **theme persist**.

---

## Rehydration vs bootstrap (no nav race)

**Two** async reads can finish in **either** order:

1. **Secure** tokens → `isAuthenticated`
2. **Plain** theme persist → `theme`

**Navigation** must wait on **(1)** — [shell](../16.%20app-shell/notes.md) **`!hydrated`**. Theme can apply **late** (one flash of wrong theme is **ugly**; **wrong stack** is a **bug**).

**Don’t** treat Zustand persist `hasHydrated` as **session** hydrated. **Don’t** mount **AppStack** because **theme** finished.

**Logout:** [clear tokens + RQ](../29.%20auth-session/notes.md); **theme persist can stay**. Don’t `AsyncStorage.clear()` **everything** unless you **intend** to wipe language too.

---

## Versioning persisted schemas

JSON on disk **outlives** the app version. Add `hasSeenNewKyc` without **`version`/`migrate`**: old users get **undefined** flags, **wrong** onboarding, or **parse throws** → **white screen**.

**Migrate** is a **pure** function: `v0 { dark: true }` → `v1 { theme: 'dark' }`. **Bump version** in the same PR as the **shape** change.

If migrate **fails**: **drop** the blob, **fall back** to defaults — **don’t** crash bootstrap.

---

## Common mistakes and misconceptions

- **Zustand persist = secure.**
- **Tokens in the same persist blob** as theme.
- **Persisting RQ** balances for “offline.”
- **Nav** gated on **persist** hydrate, **not** token hydrate — or the **reverse** (theme wait **blocks** splash **forever**).
- **No `version`** after a store reshape.
- **`AsyncStorage.clear()`** on logout wiping **language** accidentally — or **not** clearing **token** persist because it was a **different** key.
- PAN in **MMKV** “because it’s fast.”

---

## Connections to other concepts

`plain persist (theme) ≠ vault (tokens) → bootstrap waits on vault → version migrate`

- **[Auth session](../29.%20auth-session/notes.md):** **what** to reset vs **what** may remain (theme).
- **[Zustand](../25.%20zustand/notes.md):** **`persist` middleware** named; this unit **how not to** persist secrets.
- **[Shell](../16.%20app-shell/notes.md):** splash until **session** read, not until **every** persist.
- **[Flavors](../20.%20flavors-config/notes.md):** compile-time **≠** device vault.
- **[Security](../13-security.md):** Keychain/Keystore **why**; this unit **what** we put there.

---

## Interview perspective

They want the **table**, **partialize**, **version**, **bootstrap race**. Spoken answer **is** the unit.

Follow-up: **MMKV vs Keystore** — speed ≠ security. **Logout** — wipe vault + RQ, **keep** theme.

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
