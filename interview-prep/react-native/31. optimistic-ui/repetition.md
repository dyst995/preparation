# Optimistic UI design — Next-day repetition

## How to use

1. Do **not** open `notes.md` first. The full question bank is `self-test.md`; this file is the next-day subset.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] Six send-money steps. Three risks. Spoken nuance (UX tool / server / idempotent).
- [ ] Pending row vs completed / “Sent ✓”. What “carefully” on available balance means (double-count; not settled).
- [ ] Button lock vs server idempotency. Same key on retry vs new key on new confirm. Timeout ≠ fail.
- [ ] Success: invalidate balances + txs. Failure: rollback + actionable error. Optimistic ≠ persist.

## Predict / debug

- [ ] Double-tap, no lock, no idempotency. Deduct **and** pending in a header that already subtracts pending. Timeout → unlock + new UUID.
- [ ] No `cancelQueries`; old GET completes after prepend. 500 with no rollback. `onMutate` fires “Money sent.”
- [ ] Two charges: retries mint a new key. Header jumps down twice. Confirm + `useEffect` retry with a new key.

## Say it out loud

- [ ] Walk me through send-money optimistic UI. Follow-up: what does “carefully” mean?
- [ ] Why isn’t a locked button enough? What do you do on timeout?
- [ ] Recite: “Optimistic UI is a UX tool, not a source of truth…”
