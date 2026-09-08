# EasyPay-like target structure — Next-day repetition

## How to use

1. Do **not** open `notes.md` first. The full question bank is `self-test.md`; this file is the next-day subset.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] Four boxes. `app/` three subfolders. `shared/` ui + http + secure-storage + money + hooks. Eight feature names. `src/native/` = app-wide thin wrappers.
- [ ] Login vs root nav. Button vs TransferAmountInput. Feature native vs `src/native/`. Three import arrows.
- [ ] Why QR ≠ transfers vs wallet. Why named libs ≠ `utils.ts`. EasyPay starts here; strangler **walks toward** it.
- [ ] 60s script: four boxes → fill → arrows → stop (don’t draw every `model/` file).

## Predict / debug

- [ ] `WalletScreen` in `app/navigation/`. `shared/lib/utils.ts` with `formatIban`, `computeLoanApr`, `parseQr`. One `features/payments/` for QR + IBAN + loans.
- [ ] `shared/ui/Button` imports `QrScanner`. Biometrics used by auth and transfer confirm — wrapper vs Pay UI? 60s spent on every `auth/screens` file — what did they miss?
- [ ] Whiteboard is `components/` + `screens/` + `services`. `lib/money` imports loans rates. Every feature has its own axios + token key.
- [ ] `src/native/` with 15 SDKs, some unused. transfers deep-imports `wallet/model/helpers`.

## Say it out loud

- [ ] Draw EasyPay in 60 seconds (paper or from memory). Follow-ups: Login? TransferAmountInput?
- [ ] How would you structure a fintech RN app from scratch? (Tree first; Query/flavors one clause.)
- [ ] Narrate the four boxes and arrows in 30–60 seconds.
