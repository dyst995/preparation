# The state taxonomy — Next-day repetition

## How to use

1. Do **not** open `notes.md` first. The full question bank is `self-test.md`; this file is the next-day subset.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] Seven kinds + preferred homes (table). Golden rule. Balances vs selectedAccountId. Modal vs current route. Session = auth store + secure storage.
- [ ] Why server lists don’t belong in Zustand/Redux. Why tokens can’t live only in RQ cache. Why not mirror `currentRoute` in Zustand. Derived = compute, don’t snapshot.
- [ ] Profile (server) vs user id / `isAuthenticated` (session). `transferId` param vs transfer query. Taxonomy first vs Zustand vs Redux dogma.
- [ ] EasyPay sketch: RQ / Zustand UI / auth+storage / useState / React Navigation.

## Predict / debug

- [ ] Transfer invalidates RQ; Home reads Zustand `balance` from 10 minutes ago. What shows, and why? `navigate` with `fullProfile` + RQ profile; KYC updates — Confirm stale?
- [ ] `useState(txs)` filled from `query.data.filter`; user mutates filter; RQ refetches. Token in Zustand, refresh only writes secure storage. `currentRoute` in Zustand vs a deep link.
- [ ] Wallet store holds `selectedId`, `balances`, `txs`, `isModalOpen` — split. Offline wallet wrong; lists in Zustand **and** RQ. `isAuthenticated` in Context, Zustand, **and** RQ `me`.
- [ ] Confirm uses `params.amount` as the ledger. Filter chips in useState **and** `setFilteredTxs` in Redux.

## Say it out loud

- [ ] How do you decide where state lives? Follow-ups: golden rule; where do balances go?
- [ ] Why not put API data in Redux/Zustand? Session vs profile from the API?
- [ ] Recite the golden rule and classify a balance, a modal, and a selected account in 30–60 seconds.
