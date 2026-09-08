# Zustand

## What you need to know

[Context](../24.%20context-api/notes.md) has **no selectors** — one `value` wakes **all** consumers. Zustand is the default **global client** home from the [taxonomy](../23.%20state-taxonomy/notes.md): **selector-based** subscriptions, **actions next to state**, small **feature** stores.

**Curriculum checklist:**

- Creating stores
- Selectors and **shallow** comparison
- Actions **colocated** with state
- **Slices** for larger stores
- Middleware: `persist`, `devtools`, `subscribeWithSelector`
- One store vs many
- **Do not** store **server lists** in Zustand

**Good:**

```text
walletUiStore: { selectedAccountId, isFilterOpen, setSelectedAccountId }
```

**Bad:** duplicating the **transactions** list already in React Query.

**Why it fits RN:** little boilerplate; **selectors**; `getState()` **outside React** (rare); maps to **feature** folders.

This unit is **Zustand as a client UI store**. **Redux/RTK**, **RQ `staleTime`**, and **encrypted persist** are later sections. Don’t persist **tokens** with `persist` and call it fintech-safe.

---

## Creating a store (actions colocated)

```ts
import { create } from 'zustand';

type WalletUi = {
  selectedAccountId: string | null;
  isFilterOpen: boolean;
  setSelectedAccountId: (id: string | null) => void;
  setFilterOpen: (open: boolean) => void;
};

export const useWalletUiStore = create<WalletUi>((set) => ({
  selectedAccountId: null,
  isFilterOpen: false,
  setSelectedAccountId: (id) => set({ selectedAccountId: id }),
  setFilterOpen: (open) => set({ isFilterOpen: open }),
}));
```

**Colocated actions:** `setSelectedAccountId` **is** the store. No separate `types` / `reducers` / `action creators` file for a **toggle**. That’s the **boilerplate** win vs classic Redux.

`set` **merges** the patch (like `setState`). `get()` reads **current** state inside an action when you need **both** fields.

**Outside React** (navigation helper, native callback — **rare**):

```ts
useWalletUiStore.getState().selectedAccountId;
useWalletUiStore.setState({ isFilterOpen: false });
```

That’s why RN teams like it: a **DataWedge** or linking handler can set **client** UI without a React tree. Still **not** where **balances** live.

Put the store in **`features/wallet/`** (or `features/wallet/store.ts`), not a global `src/store/everything.ts`, unless it is truly **app-wide** UI (theme might still be Context).

---

## Selectors: the whole point vs Context

```ts
// Re-renders only when selectedAccountId changes
const id = useWalletUiStore((s) => s.selectedAccountId);

// Lost the benefit — any store field wakes this component
const everything = useWalletUiStore();
```

**Default compare:** `Object.is` on the **selected** value. A **primitive** `id` is cheap.

**Object selector pitfall:**

```ts
const { selectedAccountId, isFilterOpen } = useWalletUiStore((s) => ({
  selectedAccountId: s.selectedAccountId,
  isFilterOpen: s.isFilterOpen,
}));
```

Every store update (even **unrelated** if you had more fields) produces a **new object** → `Object.is` fails → **re-render anyway**. Use **`shallow`** (`useShallow` / `zustand/shallow`) **or** two **small** selectors (curriculum: prefer **multiple small selectors**).

```ts
const id = useWalletUiStore((s) => s.selectedAccountId);
const open = useWalletUiStore((s) => s.isFilterOpen);
```

**Keep actions stable:** define them **once** in `create` (`(id) => set(...)`). Don’t `set({ setSelectedAccountId: newFn })` each time. Selecting `(s) => s.setSelectedAccountId` then stays **referentially stable**.

---

## Slices vs many stores

**Slices:** one `create` **composed** from functions (`...createWalletUiSlice(set, get)`) when **one** store is getting large but fields **coordinate** (same transaction of client state).

**Many stores:** `useAuthSessionStore` vs `useWalletUiStore` — **default**. Merge when **two** stores must **always** update together and you’re **tired of wiring**.

**Don’t** create a store per **component** (`useThisModalStore`) — that’s **`useState`**.

Preserve:

> I start with small domain stores (auth, wallet UI). I merge only when coordination costs dominate. I don’t create a dozen toy stores for no reason.

**Auth store** here is **session presence / userId** in memory — **tokens** still **secure storage** ([taxonomy](../23.%20state-taxonomy/notes.md)). Don’t `persist` the access token through Zustand as the **vault**.

---

## Middleware (what each is for)

| Middleware | Role | Interview caution |
| --- | --- | --- |
| **`devtools`** | Redux-DevTools-style inspect | Fine in **dev** |
| **`persist`** | Rehydrate client UI from storage | **Not** for secrets; **not** a second copy of RQ lists. Onboarding flags / `selectedAccountId` maybe. Full persist strategy is a **later** section. |
| **`subscribeWithSelector`** | `store.subscribe(selector, listener)` with **slice** equality | **Outside** React: log `selectedAccountId` without waking components |

```ts
useWalletUiStore.subscribe(
  (s) => s.selectedAccountId,
  (id) => { /* analytics */ },
);
```

(Exact API depends on `subscribeWithSelector` being applied — know the **idea**: subscribe to a **slice**, not the whole store.)

---

## Never duplicate React Query lists

```ts
// Bad
set({ transactions: data });

// Good
const { data: txs } = useTransactionsQuery(accountId);
const selectedId = useWalletUiStore((s) => s.selectedAccountId);
const visible = useMemo(() => txs?.filter(...), [txs, selectedId]);
```

After a transfer, RQ **invalidates**. A Zustand **copy** **drifts**. That’s the [golden rule](../23.%20state-taxonomy/notes.md).

---

## Common mistakes and misconceptions

- **`useStore()` without a selector.**
- **Object selector** without **shallow** / split.
- **Transactions / balances** in the store.
- **`persist` the token.**
- **One mega-store** “like Redux” with no slices **and** no selectors.
- **A store per button.**
- Unstable actions recreated in `set`.
- Answering **Redux vs Zustand** without **selectors vs Context**.

---

## Connections to other concepts

`Context (no select) → Zustand (select client slice) → RQ (server) → Redux if client machine is huge`

- **[Taxonomy](../23.%20state-taxonomy/notes.md):** this is **global client** done right.
- **[Context](../24.%20context-api/notes.md):** **why** you left theme in Context (rare) but **account id** here (many readers, **select**).
- **[Feature folders](../22.%20easypay-structure/notes.md):** `features/wallet` **owns** `walletUiStore`.
- **§4 Redux:** when **coordination** across the **whole** app is a **real** state machine — not because Zustand “isn’t enterprise.”
- **§5 RQ:** **invalidation**, not `set({ txs })`.

---

## Interview perspective

Preserve:

> Components select slices of state. They re-render only when the selected value changes. If you select the entire store, you lose that benefit.

Then: **good `walletUiStore`**, **bad txs copy**, **one vs many** spoken answer, **shallow** if they pick an **object** selector.

Spoken (30–60s):

> Zustand is my default for global client UI — selected account, filter open — with actions in the store. Components select one field so they don’t re-render on unrelated updates. I don’t put React Query lists in Zustand; that’s how balances drift. I start with small feature stores and only merge when coordination is painful. Persist is for non-secrets, not the token vault.

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
