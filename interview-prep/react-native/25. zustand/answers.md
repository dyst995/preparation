# Zustand — Answers

## Core recall

1. **Good:** `selectedAccountId`, `isFilterOpen`, setters. **Bad:** copy **transactions** from RQ.
2. **Components select slices. They re-render only when the selected value changes. Select the entire store and you lose that.**
3. **Small domain stores (auth, wallet UI). Merge when coordination costs dominate. Not a dozen toy stores.**
4. **Minimal boilerplate; selector subscriptions; use outside React; feature-based stores.**
5. **Setters live in `create((set) => ({ ... }))`**, not a separate action layer for this size.
6. When the selector returns a **new object/array** each time.
7. **`persist`, `devtools`, `subscribeWithSelector`.**
8. **`features/wallet/`** (feature store), not a junk `src/store`.
9. **`useWalletUiStore.getState()` / `setState`.**
10. **Subscribe to the slice you need; multiple small selectors > whole store; keep actions stable.**

## Explain why

1. **Any** field change notifies you — **same fan-out** as a fat Context value.
2. Selector result is a **new `{}`** every time → `Object.is` **false**.
3. Each hook **`Object.is`s a primitive**; no extra identity; no shallow needed.
4. **Boilerplate** isn’t buying you safety at this size; colocation is **readable** and **stable** functions.
5. **Native/linking** callbacks aren’t always in a component. Client UI can still **update**.
6. **Two owners** → **drift** after invalidate. RQ is the **server** home.
7. **Domains** match features. God store = **Context-like** if you select poorly. Toy stores = **useState**.
8. **Bundle/storage** isn’t a vault; token **refresh** also **won’t** stay in sync. **Secure storage** + auth flow.
9. **`memo` children** and `useCallback` deps; selecting the action **shouldn’t** re-render.
10. Two stores that **must** update **atomically** become **bugs**; **then** merge/slices.

## Compare and contrast

1. Context: **all consumers** of that provider. Zustand: **only** if **selected** value changed.
2. **Narrow** vs **any change**.
3. **Slices:** one `getState`, coordinated `set`. **Multiple creates:** separate subscriptions; **cross-store** transactions are **manual**.
4. UI **selection** vs **server list**.
5. One screen → **`useState`**. Many screens → Zustand.
6. **selectedAccountId** is client; **txs** is server — persist **rehydrates a clone** of RQ → drift.
7. Zustand **is** that row’s **default tool**.
8. **Huge shared client machines**, team **already** on RTK, entity adapters — **not** for a filter boolean.

## Predict the output

1. **Yes** — no selector; `isFilterOpen` change **is** a store update.
2. **No** — selected primitive **unchanged**.
3. **Yes** without shallow (new object). **With shallow:** re-render **only if** `id`/`open` **contents** change — here **id** changed → **yes** (correct). Unrelated third field wouldn’t matter if you didn’t select it.
4. **Stale txs** — golden rule.
5. **New function** each time → **memo child re-renders**; “unstable actions.”
6. **Local UI** pretending to be global. Use **`useState`**.

## Debugging

1. **`(s) => s.selectedAccountId)`** (and don’t subscribe to `isFilterOpen` in the row).
2. **Object selector** / missing **shallow**. Split selectors or `useShallow`.
3. **Delete Zustand txs.** `useQuery` + derive.
4. **Secrets in persist.** Token → **secure storage**; Zustand at most **presence**.
5. **One** `selectedAccountId` owner (wallet UI store) that both import; don’t duplicate.
6. **`subscribeWithSelector`** (or subscribe to **`(s) => s.selectedAccountId`**) so **unrelated** updates don’t fire.

## Application

1. Match notes `create` example.
2. `const id = useWalletUiStore((s) => s.selectedAccountId);`
3. Re-renders + one-vs-many as curriculum.
4. `useTransactionsQuery(id)` + `useWalletUiStore(s => s.selectedAccountId)` + `useMemo` filter.
5. **…store server lists (or tokens) — RQ / secure storage.**
6. Theme → Context (or Zustand if you **select**). Account id → Zustand. Balances → RQ. One-screen modal → `useState`.

## Interview questions

1. **Spoken:** Components select slices; re-render only when **that** value changes; whole store → lose the benefit.  
   **Follow-up:** Object selector needs **shallow** or **split**; else new `{}` every time.

2. **Spoken:** Small domain stores (auth, wallet UI). Merge when coordination **hurts**. No dozen toy stores.

3. **Spoken:** RN: low boilerplate, **selectors**, `getState` outside React, **feature** stores. Context = **no** select. Lists = **RQ**.

4. **Spoken:** **selectedAccountId**, **isFilterOpen**, setters. **Not** txs/balances.

5. **Spoken:** **Complex** cross-feature **client** workflows / existing RTK team — not for a UI toggle.

## Connections

1. **Subscribe to a slice**; Context **cannot**.
2. **One** client owner; **don’t** clone server data.
3. **`features/wallet/store`** public via feature if needed; not `shared/hooks` junk.
4. **Hook:** query + mapper → **domain** in cache; Zustand only **ids/flags**.
5. **§6:** MMKV/encryption, **what** to persist. This unit: **persist ≠ token vault**, **≠ RQ**.
