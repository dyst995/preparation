# Derived state and duplication traps

## What you need to know

The [taxonomy](../23.%20state-taxonomy/notes.md) already said **derived = compute, don’t duplicate**, and the **golden rule**: the biggest state bug is the **same data in two places** drifting. This unit is the **trap list** — how that bug actually lands in a wallet app.

**Anti-patterns (preserve):**

- Copying React Query data into Zustand “for convenience”
- Storing **filtered lists** separately instead of deriving
- **Multiple sources** for `user`

**Better (preserve):**

- Select/filter from query data in **render** or via **memoized selectors**
- Keep **canonical** user **profile** in React Query
- Keep **`selectedUserId`** (client choice) in Zustand if needed

That’s also the **spoken** shape: **ids and flags** in Zustand; **documents** in RQ; **filters** are **functions**, not arrays you `set`.

The chapter **question bank** (Zustand vs Redux vs RQ, logout, …) is a **recap of the whole file**. This unit is **one** of those answers: *selected account id vs balances*.

---

## What “derived” means

**Canonical data:** one owner. Server lists/profile → **React Query**. Client choice (`selectedAccountId`, `statusFilter`) → **Zustand** (or `useState` if one screen).

**Derived data:** a **pure function** of canonical inputs.

```ts
visibleTxs = txs.filter((t) => t.status === statusFilter);
selectedAccount = accounts.find((a) => a.id === selectedAccountId);
```

You **recompute** when inputs change. You do **not** `setFilteredTxs` and then hope the next **invalidate** updates that copy.

**Why it exists:** screens need **views** (pending only, selected account). The mistake is treating the **view** as a **store**.

**Not derived:** a **new** client fact the server doesn’t own (`theme`, `hasSeenTip`). Those are **stored**, not computed from RQ.

**Id vs document** is the same split as [nav params vs entity](../23.%20state-taxonomy/notes.md): `selectedUserId` is a **pointer**; `user` is the **resource**. Storing both **full objects** is how you get two `user`s.

---

## Trap 1 — Copying RQ into Zustand “for convenience”

**What people do:**

```ts
const { data } = useTransactionsQuery(accountId);
useEffect(() => {
  setTxs(data ?? []); // walletUiStore.transactions
}, [data]);
```

**Why it feels convenient:** the store is **easy to read** from a non-hook helper; persist middleware; “one object for the screen.”

**What happens internally:** two owners. RQ **invalidates** after a transfer ([optimistic UI](../31.%20optimistic-ui/notes.md) rolls back **the cache**). The Zustand copy **does not move** unless this `useEffect` runs **and** you didn’t **persist** a stale blob. Logout can **`queryClient.clear()`** and leave **`store.txs`**. Screens that read the store show **yesterday’s ledger**.

**`getState()` outside React** is **not** an excuse to copy the list. Pass **`accountId`**, call the **API**, or use `queryClient.getQueryData(key)` **at the call site** if you truly need cache **once** — still **one** cache, not a **second** array you keep.

```ts
// Good — one owner
const { data: txs } = useTransactionsQuery(accountId);
const statusFilter = useWalletUiStore((s) => s.statusFilter);
const visible = useMemo(
  () => (txs ?? []).filter((t) => statusFilter === 'all' || t.status === statusFilter),
  [txs, statusFilter],
);
```

---

## Trap 2 — Storing the filtered list

Even **without** Zustand, this is duplication:

```ts
const [visible, setVisible] = useState<Tx[]>([]);
useEffect(() => {
  setVisible((txs ?? []).filter((t) => t.status === filter));
}, [txs, filter]);
```

Now you have **`txs` and `visible`**. A bug in the effect (missing dep, early return, stale `filter`) → **list on screen ≠ cache**.

**Better:** derive in render / `useMemo`. If the filter is **RQ-side** and **cheap enough**, `useQuery({ select: (data) => data.filter(...) })` — observers can subscribe to the **selected** slice; the **cache** still holds the **canonical** list (unless you design otherwise). You did **not** create a **second store**.

**Zustand holds the filter, not the rows:** `statusFilter: 'pending' | 'all'`. Same for search query string.

**When `useMemo`:** expensive filter or you pass the array to a **memoized child** that **===** checks. Cheap `.filter` in render is **fine**; the bug is **`setState(filtered)`**, not the lack of `useMemo`.

---

## Trap 3 — Multiple sources for `user`

Typical drift:

| Copy | Where it came from | Goes stale when |
| --- | --- | --- |
| Auth store `user: Profile` | Login DTO | Profile **PATCH** invalidates RQ, store forgotten |
| RQ `['profile']` | GET /me | **Canonical** — this is the one |
| `route.params.user` | Navigate with **object** | Deep link / other tab has **no** param object |
| JWT payload `name` | Access token | Token **doesn’t** refresh when they change display name |

**Better split:**

- **Session:** `userId` / “is authenticated” + **tokens in the vault** ([auth-session](../29.%20auth-session/notes.md))
- **Profile document:** React Query
- **Which user/account the UI is pointing at:** `selectedUserId` / `selectedAccountId` in Zustand **if** the user can **choose** among several (or you persist last-used). Not a second `User`.

```ts
const userId = useAuthStore((s) => s.userId);
const { data: profile } = useProfileQuery(userId);
const selectedAccountId = useWalletUiStore((s) => s.selectedAccountId);
```

**Don’t** put `profile` in Zustand **and** RQ. **Don’t** navigate with a **full user object** when an **id** + fetch will do.

---

## How it appears with optimistic updates

[Optimistic UI](../31.%20optimistic-ui/notes.md) patches **`queryClient.setQueryData`**. If the screen reads **Zustand `txs`**, the pending row **never shows** (or you patch **both** and **rollback one**). Derived-from-RQ is what makes **one** rollback work.

---

## Common mistakes and misconceptions

- **“We’ll sync in `useEffect`.”** That’s a **second** write path you’ll **forget** on logout, rollback, and persist rehydrate.
- **Filtered array in state** “because FlatList needs an array” — it needs an array **this render**, not a **stored** one.
- **`user` everywhere** (auth, RQ, params, JWT).
- **`select` on the query** thought to be a **second cache** of a **different** list you must **invalidate separately** — you still invalidate the **key**; `select` is a **view**.
- **Copying so persist can save txs** — [persistence](../30.%20persistence/notes.md) already forbids that PII; it’s also **this** trap.
- Taxonomy **derived row** recited without being able to **point at the copy** in a PR.

---

## Connections to other concepts

`canonical (RQ profile / txs) + client id/filter (Zustand) → derive in render → one owner`

- **[Taxonomy](../23.%20state-taxonomy/notes.md):** this unit **is** the golden rule **in code**.
- **[Zustand](../25.%20zustand/notes.md):** selectors **read a slice**; they are **not** a reason to **store** the list.
- **[React Query](../27.%20react-query/notes.md):** invalidate the **key**; derived UI **follows**.
- **[Optimistic UI](../31.%20optimistic-ui/notes.md):** patch **one** cache; copies **break** rollback.
- **[Auth session](../29.%20auth-session/notes.md):** logout clears **RQ**; a **copied `user`** in Zustand is how **ghost session** UI survives.
- **[Persistence](../30.%20persistence/notes.md):** persist **`selectedAccountId`**, not **balances**.

---

## Interview perspective

Board: **balances** vs **selected account id**. You say **RQ vs Zustand**, then **don’t copy**. Follow-up: **filtered txs** — derive. Follow-up: **user** — profile in RQ, **id** in session/selection.

Spoken (30–60s):

> I don’t copy React Query into Zustand for convenience. Filtered lists are derived in render or a memoized selector. Canonical profile lives in React Query. Client choice — selectedUserId or selectedAccountId — can live in Zustand. Two copies of user or of a tx list will drift on invalidate, rollback, and logout.

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
