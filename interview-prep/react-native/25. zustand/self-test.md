# Zustand — Self-test

## Core recall

1. Recite the **good** `walletUiStore` shape vs the **bad** pattern.
2. How does Zustand prevent unnecessary re-renders? (curriculum spoken answer)
3. One store or many? (curriculum spoken answer)
4. List four reasons Zustand fits RN (curriculum).
5. What does **colocate actions** mean?
6. When do you need **shallow** (or `useShallow`)?
7. Name the three middleware from the curriculum.
8. Where should a wallet UI store **live** in a feature-based app?
9. How do you read the store **outside** React?
10. Selector discipline: three bullets from the curriculum.

## Explain why

1. Why is selecting the **entire** store like using Context?
2. Why does an **inline object** selector re-render even if fields didn’t change?
3. Why prefer **two primitive selectors** over one object selector?
4. Why colocate `setSelectedAccountId` instead of a separate Redux-style action file for this store?
5. Why is `getState()` useful in RN even if rare?
6. Why must transactions **not** live in Zustand if RQ already has them?
7. Why start with **auth + wallet UI** stores rather than one god store **or** twelve toy stores?
8. Why is `persist` dangerous for **access tokens**?
9. Why keep **actions referentially stable**?
10. Why merge stores only when **coordination costs dominate**?

## Compare and contrast

1. Zustand selector vs Context `useContext`.
2. `useWalletUiStore((s) => s.id)` vs `useWalletUiStore()`.
3. Slices **inside** one store vs **multiple** `create()` stores.
4. Zustand UI store vs React Query list.
5. Zustand vs `useState` for `isFilterOpen` on **one** screen.
6. `persist` for `selectedAccountId` vs persist for **txs**.
7. This unit vs [taxonomy](../23.%20state-taxonomy/notes.md) **global client**.
8. This unit vs [§4 Redux](../03-state-management.md) (when you still might pick RTK).

## Predict the output

1. Store has `selectedAccountId` and `isFilterOpen`. Component uses `useWalletUiStore()`. Filter toggles. Does a component that **displays only the id** re-render? Why?

2. Same component uses `(s) => s.selectedAccountId`. Filter toggles. Re-render?

3.

```ts
useWalletUiStore((s) => ({ id: s.selectedAccountId, open: s.isFilterOpen }));
```

`isFilterOpen` unchanged; you `set({ selectedAccountId })`. Re-render? What if you add **shallow**?

4. After transfer, RQ cache updates txs. Zustand still has `transactions` from before. What does a screen that maps Zustand txs show?

5. You `create()` a new `setFilterOpen` function inside `set` on every toggle. A child `memo`’d on `setFilterOpen`. What happens?

6. Twelve stores, one per modal. What’s the taxonomy smell?

## Debugging

1. Wallet rows re-render when the filter sheet opens. They `useWalletUiStore()` with no selector. Fix?

2. Object selector without shallow; DevTools shows **unrelated** field changes waking the screen. Diagnose.

3. Review: `useWalletStore.getState().transactions.filter(...)`. RQ also fetches txs. Drift?

4. `persist` middleware writes `accessToken` to AsyncStorage. What’s wrong?

5. Two features must set `selectedAccountId` and you duplicated it in **two** stores that **desync**. One store or selectors?

6. `subscribe` on the whole store fires analytics 60× while scrolling a **client** field. What middleware/selector idea did they skip?

## Application

1. Write a ~15-line `useWalletUiStore` (fields + actions) matching the good pattern.

2. Write a component that reads **only** `selectedAccountId`.

3. Recite both interview answers (re-renders; one vs many).

4. Sketch where RQ `useTransactions` and the Zustand store meet on a wallet screen (derived filter).

5. One-line PR: “Zustand must not …”

6. Decide: theme (Context vs Zustand); selectedAccountId; balances; modal on one screen.

## Interview questions

1. How does Zustand prevent unnecessary re-renders?  
   **Follow-up:** What if I select the whole store? Object selector?

2. One store or many?

3. Why Zustand in RN vs Context vs putting lists in the store?

4. What belongs in `walletUiStore` vs React Query?

5. When would you still choose Redux over Zustand? (One sentence — §4 is later.)

## Connections

1. How do selectors **fix** what [Context](../24.%20context-api/notes.md) cannot?
2. How does this **implement** the taxonomy’s **global client** row without breaking the **golden rule**?
3. How does a **feature store** fit [EasyPay folders](../22.%20easypay-structure/notes.md)?
4. How should [DTO/domain](../19.%20data-domain/notes.md) data reach the UI **without** Zustand?
5. What will **persist** in §6 add that this unit only **warns** about?
