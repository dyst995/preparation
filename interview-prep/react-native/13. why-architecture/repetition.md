# Why architecture matters in RN interviews — Next-day repetition

## How to use

1. Do **not** open `notes.md` first. The full question bank is `self-test.md`; this file is the next-day subset.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] Five interview tests: scale, ship without breaking neighbors, modernize without big-bang, UI/domain/native, onboard/review. What are they *not* scoring?
- [ ] EasyPay vs Wizer/MyCreditInfo — greenfield vs modernization. Blast radius in one sentence.
- [ ] Big-bang vs strangler. Mid vs senior answer to “how do you structure the app?”
- [ ] Why domain must not use `Platform.OS`. Why “we’ll rewrite next quarter” is weak.
- [ ] `shared/` as primitives vs second `utils/`. Feature tree is next section — this unit is why.

## Predict / debug

- [ ] Payments bugfix also edits `App.tsx`, `helpers.js`, Profile. What failed? Explain why.
- [ ] `calculateFee()` imports `Platform`. Which test fails? Four-month rewrite freeze — which bullet?
- [ ] “Small wallet tweak” PR, 40 files across `hooks/`/`screens/`/`utils/`. What do you say? New hire can’t find login — smell?
- [ ] `shared/paymentsHelpers.ts` only used by payments. Smell? CV “modernized” = renamed folders in a weekend — what’s missing?

## Say it out loud

- [ ] Explain why architecture matters in RN interviews in 30–60 seconds (CV names included).
- [ ] Why does architecture matter in an RN interview? Follow-ups: CV? Folders vs this?
- [ ] How do you modernize a legacy RN app without a rewrite freeze?
