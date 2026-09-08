# Derived state and duplication traps — Next-day repetition

## How to use

1. Do **not** open `notes.md` first. The full question bank is `self-test.md`; this file is the next-day subset.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] Three anti-patterns. Three Better bullets. Golden rule. Spoken 30–60s answer.
- [ ] Derived = recompute, not `set(filtered)`. Zustand: ids/filters, not rows. Profile in RQ; `selectedUserId` in Zustand.
- [ ] Four `user` copies (auth, RQ, params, JWT). `useEffect` sync is still a second owner.
- [ ] Id vs document. RQ `select` vs a second Zustand array. Persist-of-txs is this trap too.

## Predict / debug

- [ ] Screen reads Zustand txs last synced from an unmounted screen; RQ invalidated. Optimistic prepend RQ-only; UI maps Zustand. Logout clears RQ, Zustand still has `user.name`.
- [ ] `visible` useState effect missing `filter` dep. PATCH name: RQ vs `authStore.user`. `select` pending filter then invalidate the tx key.
- [ ] Home vs header balances. `navigate` with full `user` plus `useProfileQuery`. Persist rehydrates txs after logout. `selectedAccount` object vs refetch.

## Say it out loud

- [ ] Selected account ID vs account balances? Follow-up: filtered txs? Where does `user` live?
- [ ] Why not copy React Query into Zustand for convenience?
- [ ] Recite the golden rule, then this unit’s Better bullets, as if they asked “how do you avoid duplication?”
