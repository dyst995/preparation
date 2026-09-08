# React Query — Next-day repetition

## How to use

1. Do **not** open `notes.md` first. The full question bank is `self-test.md`; this file is the next-day subset.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] Query = cached server state + key. `walletKeys` factory. Invalidation of `all` vs one `transactions(id)`. Dedupe on same key.
- [ ] Recite staleTime vs gcTime (`cacheTime` rename). Default staleTime 0. Fresh vs in-memory. `isPending` vs `isFetching`.
- [ ] Four-step mutation. `onSuccess` vs `onSettled` vs `onError`. Why cancel in `onMutate`. Why invalidate balances **and** txs.
- [ ] placeholder vs initialData. Redux/Zustand lists? Unmount abort `signal`.

## Predict / debug

- [ ] `staleTime: 60s`, remount at 10s — network? `staleTime: 0` with cache — network **and** what does the user see? Observer gone, `gcTime: 5s`, reopen at 6s.
- [ ] `invalidateQueries(['wallet'])` with balances + `tx` keys. Optimistic prepend; old fetch completes without cancel. `keepPreviousData` when `accountId` changes.
- [ ] Invalidate `['transactions']` but observers use `['wallet','tx', id]`. Zustand **and** RQ txs. Optimistic stuck after 500, no rollback. `isLoading` on pull-to-refresh.
- [ ] Keys `'1'` vs `1` — two GETs. `initialData: 0` + `staleTime: Infinity` on balances.

## Say it out loud

- [ ] staleTime vs gcTime. Should API data live in Redux? How do you update txs after a transfer?
- [ ] Key factory why. Optimistic + settle in 30–60 seconds (include balances + rollback).
- [ ] Explain a query in 30 seconds (key, stale vs gc, invalidate).
