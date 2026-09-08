# Layering inside a feature — Next-day repetition

## How to use

1. Do **not** open `notes.md` first. The full question bank is `self-test.md`; this file is the next-day subset.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] Seven entries under `features/payments/` (ui → index). Why a feature folder isn’t enough. `screens/` vs `ui/` vs `hooks/` vs `model/` vs `api/` vs `native/`.
- [ ] Dependency arrows: screens → hooks → api/model; screens → ui; features → shared; no other features’ internals. What `shared/` must not import.
- [ ] Three cross-feature options **in order**. Why a global event bus is a weak first answer. Why a fat `export *` `index.ts` fails.
- [ ] `model/` vs `api/` (and why mapping doesn’t belong in JSX). Feature `native/` vs `NativeModules` in `computeFee`. Inner `hooks/` vs top-level `src/hooks/`.

## Predict / debug

- [ ] `computeFee` imports `Platform`. What broke, and what tests got harder? `ConfirmPaymentView` calls `useQuery` — smell and fix?
- [ ] `import { computeFee } from '../../payments/model/fees'` — what happens when payments moves the file? `shared/ui/Button` imports `PaymentsNavigator` — which arrow reversed?
- [ ] 800-line `PaymentScreen` with fetch, fees, layout, `NativeModules`. Where does each concern go? `index.ts` is `export * from './model'` — what failed?
- [ ] `model/status.ts` imports `useConfirmPayment`. DAG diagnosis. Confirm `amount` in global Zustand instead of route params — cost?

## Say it out loud

- [ ] Even inside `features/payments/`, how do you separate concerns? Follow-ups: draw the arrows; where does fee math live?
- [ ] How do features communicate? Follow-up: why not an event bus?
- [ ] Explain inner layering in 30–60 seconds (DAG + three communication options).
