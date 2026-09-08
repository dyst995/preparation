# Data and domain boundaries — Next-day repetition

## How to use

1. Do **not** open `notes.md` first. The full question bank is `self-test.md`; this file is the next-day subset.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] DTO vs domain/UI model. Three-line rule: `api/` DTO, `mappers.ts`, screens never ad-hoc rename. Fintech: balances, statuses, payment states.
- [ ] Where inbound/outbound mapping lives. Money as integer minor units. God API file vs api/model/hooks. Why not map all features in a global interceptor.
- [ ] Why floats are a currency trap. Why formatted strings aren’t the ledger. Why TS-on-DTO isn’t a domain. `computeFee` vs `formatMinor`.
- [ ] This unit vs feature layering vs 05-networking. `queryFn` vs mapper vs screen.

## Predict / debug

- [ ] Three screens do `dto.amt_cents / 100`; API switches to string `amount_minor`. What happens and why uneven? Mapper does `/ 100` while `computeFee` still uses minor units — bug class?
- [ ] `<Text>{payment.st === 'PND' ? 'Pending' : payment.st}</Text>` — what leaked? `computeFee` with `amount * 0.019` floats — risk?
- [ ] Two screens, two “pending” meanings. `ConfirmScreen` uses `route.params.amt_cents`. `model/fees.ts` imports `axios`. `NaN` on balance after API deploy — where should it have failed?
- [ ] Interceptor maps all `/payments` to `Payment`; transfers differ. `getPayment()` toasts + computes fee. `formatMoney` inside `getWallet.ts`.

## Say it out loud

- [ ] How do you keep API JSON from leaking into screens? Follow-up: field rename.
- [ ] DTO vs domain; where mappers live. How do you handle money/balances? Messy payment states (`PND`)?
- [ ] Explain the data/domain boundary in 30–60 seconds (fintech + no god service).
