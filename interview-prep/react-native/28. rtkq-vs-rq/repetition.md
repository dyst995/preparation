# RTK Query vs React Query — Next-day repetition

## How to use

1. Do **not** open `notes.md` first. The full question bank is `self-test.md`; this file is the next-day subset.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] Recite the table (5 rows). Recite the spoken sketch. Both solve **server cache**; **ecosystem fit**. EasyPay RQ+Zustand; Wizer RTKQ.
- [ ] QueryClient vs API slice. Keys vs tags. Don’t dual-cache. Don’t add Redux just for RTKQ. Don’t rewrite Wizer in week one.
- [ ] RTKQ learning curve = Redux + RQ concepts. `createApi` vs `useQuery`. Wizard ≠ endpoints. Thunks + RTKQ for the same GET = overuse.
- [ ] This unit vs staleTime deep dive. Complexity not fashion.

## Predict / debug

- [ ] EasyPay: RQ **and** RTKQ `getBalances`. Wizer: new hire adds RQ for txs only. Green-field RTKQ “in case we need Redux.” Mutation `invalidatesTags: ['Wallet']` but query has no `providesTags`.
- [ ] You trash RTKQ in interview with Wizer on the CV. Store has thunk `fetchTxs` **and** `useGetTxsQuery`. `configureStore` added only for `createApi` on a Zustand+RQ app. Screens still use `amt_cents` — RQ vs RTKQ?

## Say it out loud

- [ ] React Query vs RTK Query? Follow-up: which did you use where?
- [ ] Migrate Wizer to RQ? Add Redux just to use RTKQ?
- [ ] Explain the choice in 30–60 seconds (fit, not winner; one cache).
