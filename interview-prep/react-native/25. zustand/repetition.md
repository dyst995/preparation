# Zustand — Next-day repetition

## How to use

1. Do **not** open `notes.md` first. The full question bank is `self-test.md`; this file is the next-day subset.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] Good `walletUiStore` vs txs in Zustand. Spoken: how selectors prevent re-renders. Spoken: one store vs many.
- [ ] Four RN fit reasons. Colocated actions. `getState` outside React. Three middleware. Feature folder for the store.
- [ ] Object selector vs shallow vs two primitive selectors. Selecting the whole store = Context-like. Persist ≠ tokens. Stable actions.
- [ ] Zustand vs Context vs RQ vs `useState` for a one-screen modal.

## Predict / debug

- [ ] `useWalletUiStore()` vs `(s) => s.selectedAccountId` when filter toggles. Object selector without shallow when `selectedAccountId` changes. RQ txs updated, Zustand still has old `transactions`.
- [ ] New setter function on every `set` — `memo` child. Twelve stores, one per modal. Rows re-render when filter opens because no selector.
- [ ] `persist` writes `accessToken`. Two stores both own `selectedAccountId` and desync. Whole-store `subscribe` fires analytics constantly.
- [ ] Review: `getState().transactions.filter` while RQ also fetches. Classify theme / selectedAccountId / balances / one-screen modal.

## Say it out loud

- [ ] How does Zustand prevent unnecessary re-renders? Follow-ups: whole store? object selector?
- [ ] One store or many? What belongs in walletUiStore vs React Query?
- [ ] Explain Zustand in 30–60 seconds (good store, selectors, no RQ lists, persist warning).
