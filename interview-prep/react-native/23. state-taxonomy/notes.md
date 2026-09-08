# The state taxonomy

## What you need to know

Interviewers who ask “Redux or Zustand?” are usually testing whether you can **classify the data** first. The tool is a **home** for a **kind** of state. Memorize this table:

| Kind of state | Examples | Preferred home |
| --- | --- | --- |
| **Local UI** | modal open, tab index, input focus | `useState` / `useReducer` |
| **Server state** | balances, transactions, profile from API | React Query / RTK Query |
| **Global client state** | selected account, UI theme, onboarding flags | Zustand (or Redux if complex) |
| **Session/auth** | access token presence, user id | dedicated auth store + secure storage |
| **Form state** | large multi-step forms | form library or local reducer |
| **Navigation state** | current route, params | React Navigation |
| **Derived state** | filtered list from cached data | compute/select, don’t duplicate |

**Golden rule:**

> The biggest state bug is putting the same data in two places and letting them drift.

This unit is **taxonomy + drift**. **Context vs Zustand**, **selectors**, **RQ cache (`staleTime`)**, and **optimistic updates** are later sections of [03-state-management.md](../03-state-management.md). Don’t recite middleware if you still copy **balances into Zustand**.

---

## Why a taxonomy exists

RN apps mix **ephemeral UI**, **remote money**, **which account is selected**, **tokens**, **wizard fields**, and **which screen you’re on**. One global store for all of that is how you get:

- A **stale balance** next to a **fresh** React Query cache
- **Back to Login** because session lived in a random slice
- Filters that **don’t match** the list because you **saved** the filtered copy

**Classify → pick a home → one owner.** A second copy is allowed only if it is **clearly derived** (and you **recompute**, not **sync by hand**).

---

## Local UI

**What:** state that **one** screen (or a small tree) needs: modal open, segmented control, `TextInput` focus, “is the filter sheet expanded.”

**Why `useState` / `useReducer`:** it **dies with the screen**. No persistence, no cross-feature subscribers, no “forgot to reset on blur.”

**Not local:** `selectedAccountId` used by **wallet home and transfer** — that’s **global client** (or a **route param** if it is **this journey** only).

Putting modal-open in Zustand “for architecture” is **noise** and extra re-renders.

---

## Server state

**What:** the **server is the source of truth**: balances, tx lists, profile. It is **stale**, **refetchable**, **shared across screens**, and **invalidated** after mutations.

**Why React Query / RTK Query:** caching, dedupe, retries, `invalidateQueries` — a Redux slice **reimplements** that badly. Duplicating the list in Zustand is the **textbook drift** bug (next units prove the cache; here you only need **don’t copy it**).

```ts
// Home and Wallet both:
const { data: balance } = useQuery({ queryKey: walletKeys.balances(), queryFn });

// Drift: also
useWalletStore.setState({ balance: dto.amount }); // second owner
```

After a transfer, RQ **invalidates**; the Zustand copy **lies** until you remember to update it.

**Not server state:** “which account is **selected** in the UI” — the server didn’t tell you that (unless you persist **preference** as its **own** resource).

---

## Global client state

**What:** **client-only** facts many screens need: `selectedAccountId`, theme, “onboarding checklist dismissed.” **Not** the transaction array.

**Home:** Zustand (your default) or **Redux** if **complex coordinated** workflows — **complexity**, not fashion. Details later.

**Good:** `walletUiStore.selectedAccountId`. **Bad:** `walletUiStore.transactions`.

Theme can also be **Context** (low-frequency DI) — that’s the **next** section. Taxonomy: it is **global client**, not server.

---

## Session / auth

**What:** **are we logged in**, **user id**, **token presence**. Navigation **reads** `hydrated` / `isAuthenticated` ([nav architecture](../17.%20nav-architecture/notes.md)).

**Home:** **dedicated auth store** (or auth feature module) + **secure storage** for tokens **at rest**. Memory holds **presence**; the **token string** is **not** a React Query cache key’s payload as the **only** copy, and **not** AsyncStorage-as-default.

**Drift:** token in secure storage **and** a Zustand `accessToken` that **isn’t** updated on refresh **and** an RQ `user` with an **embedded** token. **One** write path on login/logout/refresh.

`user` **profile** (name, KYC status from API) is **server state**. **user id** used to **gate the tree** is **session**. Don’t mash them into one “user blob” in Redux that you **never refetch**.

---

## Form state

**What:** fields, errors, dirty, step index of a **wizard** (transfer amount → confirm).

**Home:** **RHF / similar** or a **local reducer** for a **large** machine. A **two-field** modal is **`useState`**.

**Not:** every keystroke in **Zustand** (re-renders the app) or **route params** for the **full** form (stale, huge, secrets). [Nav](../17.%20nav-architecture/notes.md): params are **ids and flow flags**, then **fetch**. Draft amount can be **local** until submit.

---

## Navigation state

**What:** current route, params, history. **Owned by React Navigation.**

**Don’t** mirror `currentRouteName` in Zustand so you can “read it anywhere.” You’ll **desync** on deep links and `reset`. Read **`useRoute()` / `navigation`**. Cross-feature: **navigate** with **params**, or **session** for auth — not a second router.

**`transferId` in params** vs **transfer entity in RQ:** param is the **id**; **server state** is the **resource**. That’s **not** duplication of the **same** data — id vs **document**.

---

## Derived state

**What:** `visibleTxs = txs.filter(t => t.accountId === selectedId)`.

**Home:** **compute** in the render/selector (`useMemo`, RQ `select`, Zustand selector). **Don’t** `setState(filtered)` on every filter change **and** keep the **full** list.

**Drift:** full list in RQ, **filtered copy** in Zustand, user **pulls to refresh** — list updates, **filter copy doesn’t**.

---

## The golden rule as a checklist

Ask: **who is allowed to change this, and who is the authority if they disagree?**

| If two copies are… | You probably mixed |
| --- | --- |
| RQ balance + Zustand balance | **Server** + **global client** |
| `route.params.user` + auth store | **Nav** + **session** |
| Filtered array in state + cache | **Derived** + **server** |
| Form values in Redux + RHF | **Form** + **global** |

One owner. The other is **derived** or **deleted**.

---

## How it appears in EasyPay-shaped code

```text
features/wallet/
  hooks/useBalances.ts      # server — React Query
  model/                    # domain after mapper
features/auth/              # session + secure storage
app/navigation              # reads isAuthenticated — does not store balances
walletUiStore               # selectedAccountId only
Confirm screen              # local: submitting boolean
```

---

## Common mistakes and misconceptions

- **“All important data goes in Redux.”** That’s **no taxonomy**.
- **Server lists in Zustand** “so I can use it offline” — RQ **is** the cache; persistence is a **later** topic, still **not** a second list.
- **Auth token only in RQ** `data` — kill app, cache gone; session **must** hydrate from **secure storage**.
- **Navigation in the store** to “simplify.”
- **Derived snapshots** as source of truth.
- Answering **Zustand vs Redux** before **classifying** the example they gave (a **balance** vs a **selected id**).

---

## Connections to other concepts

`kind of data → one home → later: how RQ/Zustand/Context implement that home`

- **[Nav architecture](../17.%20nav-architecture/notes.md):** session **flags** vs **route params**; trees **swap**, they don’t store balances.
- **[App shell](../16.%20app-shell/notes.md):** hydrate **session** before mount; QueryClient is **server-state** host.
- **[Data/domain](../19.%20data-domain/notes.md):** RQ holds **mapped domain** (or DTO then map in the hook) — still **one** server cache, not a third Zustand clone.
- **[Feature layering](../15.%20feature-layering/notes.md):** UI local state in **screens**; server in **hooks**; don’t lift everything to `app/`.
- **§2 Context / §3 Zustand / §5 RQ:** **implementations** of rows in **this** table.

---

## Interview perspective

They put a **balance**, a **modal**, and a **selected account** on the board. You **sort** into three homes, then say the **golden rule**.

Spoken (30–60s):

> I classify first. Local UI is useState. Server data — balances, transactions — React Query, not Redux. Client-only global — selected account, theme — Zustand. Session is an auth store plus secure storage. Navigation stays in React Navigation. Forms stay in a form lib or a local reducer. Derived data is computed, not copied. The biggest bug is the same data in two places drifting.

If they ask Redux vs Zustand **immediately**: “Depends whether this is **server** or **complex client**. A balance isn’t a Redux problem.”

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
