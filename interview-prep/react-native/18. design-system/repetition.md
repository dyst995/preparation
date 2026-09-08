# Shared UI / design system — when to extract — Next-day repetition

## How to use

1. Do **not** open `notes.md` first. The full question bank is `self-test.md`; this file is the next-day subset.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] Don’t extract at two similar buttons. Four “do extract” signals. Tokens vs primitives vs patterns (curriculum examples). No-hex rule.
- [ ] Spoken answer: repetition/inconsistency; primitives+tokens first; composites stay until reused. Where `TransferAmountInput` vs `Button` live.
- [ ] Why premature Button flags are worse than duplication. Why fintech consistency is trust. Why tokens before a 40-component catalog.
- [ ] `shared/lib` vs `shared/ui`. Tokens as a flavor **seam** vs full §8. Feature `ui/` composing primitives without putting domain in `shared/`.

## Predict / debug

- [ ] Two wallet screens → `shared/ui/Button` with `isWallet`. Decay path? Tokens exist but payments uses `'#0B5FFF'` — white-label cost?
- [ ] `shared/ui/TransferAmountInput` with `mode: 'iban' | 'wallet'`. 40 components on a 3-screen MVP — what happens on screen four?
- [ ] God `Button` (`isPayments`, `compact`, …). `shared/ui` 80 files, 60 single-feature. Every PR is “padding 12 or 16?” — what do you add first?
- [ ] `EmptyState` with `variant: 'wallet' | 'payments'`. `borderRadius: 8` in 90 files after designers change radius.

## Say it out loud

- [ ] Recite the curriculum spoken answer.
- [ ] When do you extract a design system? Follow-up: what first? Where do buttons vs TransferAmountInput go?
- [ ] Explain the extraction threshold in 30–60 seconds (include fintech trust + don’t freeze a mega-API).
