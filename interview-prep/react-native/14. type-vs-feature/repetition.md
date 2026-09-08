# Type-based vs feature-based architecture — Next-day repetition

## How to use

1. Do **not** open `notes.md` first. The full question bank is `self-test.md`; this file is the next-day subset.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] Type-based vs feature-based: what is the grouping key? Usual type-based folders. What do `app/`, `shared/`, and `features/` own?
- [ ] Four type-based cons. Five feature-based pros. Three feature-based cons. What is `index.ts` for?
- [ ] Why do `utils/` and `components/` become junk drawers? Why is “used twice” not enough for `shared/`?
- [ ] Cohesion vs coupling. Deep import of `wallet/model/helpers` vs public `index.ts`. Generic `Button` vs `TransferAmountInput`.
- [ ] When is feature-based the wrong call? EasyPay day-one vs strangling Wizer/MyCreditInfo soup.

## Predict / debug

- [ ] A payments bugfix in type-based `screens/` + `hooks/` + `services/` + `utils/` + `components/` — which folders, and why is that a problem? After a feature move, where should the diff live?
- [ ] `import { computeFee } from '../../payments/model/fees'` — what breaks on the next payments refactor? `shared/paymentsHelpers.ts` used only by payments — what should you do?
- [ ] Every wallet PR touches `components/`/`screens/`/`hooks/`/`utils/`. Diagnose and first move. `app/screens/PaymentConfirm.tsx` “because the navigator is in `app/`” — what’s wrong?
- [ ] `features/icon-row/` for one component — which con? `shared/utils.ts` with 40 functions — how do you fix it without a big rewrite?

## Say it out loud

- [ ] Recite the production spoken answer (feature owns screens/UI/hooks/API/domain; shared only if genuine; soup → capability boundaries).
- [ ] Why feature-based over `components/` + `screens/`? Follow-ups: legacy pain; tradeoff.
- [ ] Explain type-based vs feature-based in 30–60 seconds as if an interviewer asked (include when not to force it).
