# Params vs global / fetched state — Next-day repetition

## How to use

1. Do **not** open `notes.md` first. The full question bank is `self-test.md`; this file is the next-day subset.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] Do-list (ids, flow flags, small serializable). Don’t-list (models, secrets, changing data). Spoken answer.
- [ ] Params are a frozen snapshot; they don’t update on RQ invalidate. Id + fetch. Deep links want ids.
- [ ] `fromQr` vs status. Params vs Zustand `selectedAccountId`. Tokens never in params.
- [ ] Id in params + document in RQ is pointer vs document, not golden-rule duplication.

## Predict / debug

- [ ] List passes `{ transfer }`; list refreshes; Details still open. Deep link `/transfers/123` but screen requires `transfer.amount`.
- [ ] Status only from params while server marks failed. Zustand copy vs RQ rollback.
- [ ] `navigate('Profile', { user })`. Header `availableMinor` param after a transfer. Notification crash: params require `item: Tx`.

## Say it out loud

- [ ] Params vs React Query — what goes where? Follow-up: why not the list DTO? How do deep links stay simple?
- [ ] Resource changes while Details is open — what updates? Would you put a balance in params?
- [ ] Recite: identifiers and flow context as params, fetch with RQ, stale objects, simple links.
