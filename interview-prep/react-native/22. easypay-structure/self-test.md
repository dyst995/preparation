# EasyPay-like target structure — Self-test

## Core recall

1. Recite the **four** top-level boxes under `src/`.
2. Recite `app/`’s three subfolders.
3. Recite `shared/` paths from the curriculum (`ui`, three `lib/`s, `hooks`).
4. List the **eight** feature names in order (or any stable order).
5. What is `src/native/` for (curriculum comment)?
6. What must you be able to do with this tree in **60 seconds**?
7. Where does **Login** live vs the **root navigator**?
8. Where does a generic **Button** live vs **TransferAmountInput**?
9. `lib/http` vs `lib/money` vs `lib/secure-storage` — one job each.
10. Feature `native/` vs `src/native/` — decision rule.

## Explain why

1. Why draw **four boxes first**, not every inner `model/` file?
2. Why **qr-payments** and **transfers** are separate features?
3. Why **wallet** is not the same slice as **transfers**?
4. Why **onboarding** is not inside **auth** by default?
5. Why **money** is `shared/lib` but **fee policy** might stay in a feature `model/`?
6. Why `shared/hooks` is dangerous if you put `useWallet` there?
7. Why `app/` must not grow `wallet/` screens?
8. Why **named** `lib/http` beats `shared/utils.ts`?
9. Why **notifications** is a feature, not `shared/lib/push` only?
10. Why EasyPay **starts** with this tree instead of strangling?

## Compare and contrast

1. This tree vs type-based `screens/` + `components/`.
2. `app/navigation` vs `features/auth` vs `features/transfers` stacks.
3. `shared/ui` vs `features/transfers/ui`.
4. `src/native/` vs `features/qr-payments/native/`.
5. `lib/secure-storage` vs session **model** in `features/auth`.
6. EasyPay target vs [strangler playbook](../21.%20legacy-modernization/notes.md).
7. `lib/http` vs feature `api/` (DTO/mappers).
8. This unit vs the **from-scratch 8-bullet** Q1 (what you draw vs what you **also say**).

## Predict the output

1. You put `WalletScreen.tsx` in `app/navigation/`. What’s wrong?

2. `shared/lib/utils.ts` contains `formatIban`, `computeLoanApr`, `parseQr`. What decay is this?

3. `features/payments/` contains QR, IBAN transfers, and loans. What did you lose?

4. `shared/ui/Button` imports `QrScanner` from `features/qr-payments`. Which arrow broke?

5. Biometrics used by **auth** and **transfer confirm**. Where does the **wrapper** live vs the **“Pay”** UI?

6. You spend the 60s drawing every file under `auth/screens/`. What did the interviewer not get?

## Debugging

1. Whiteboard: candidate draws `src/components`, `src/screens`, `src/services`. How do you redirect to this unit?

2. Review: new `features/home/` that reimplements wallet balance + QR entry + profile avatar. Smell?

3. `lib/money` imports `features/loans/model/rates`. DAG?

4. Every feature has its own `axios.create` and its own `AsyncStorage` token key. What’s missing from the tree?

5. `src/native/` has 15 SDKs including unused ones. Which playbook/step does that violate, and how should the tree look?

6. Deep import `features/wallet/model/helpers` from transfers. Tree **looks** EasyPay; what’s still wrong?

## Application

1. Draw the curriculum tree from memory (no looking). Time yourself (~60s).

2. Place: `ConfirmTransferScreen`, `getConfig` consumer in http, `formatMinor`, `LoginScreen`, `BiometricModule` used in two features, `EmptyState`.

3. Write the three import arrows you’d label on the board.

4. 15-second placement: “Where does QR scan live?”

5. Group the eight features into **three** clusters you’d say if you were rushing.

6. One-line PR: “New code must land in …”

## Interview questions

1. Draw a mid-size fintech RN architecture (EasyPay).  
   **Follow-ups:** Where does Login live? Where does TransferAmountInput go?

2. How would you structure a fintech RN app from scratch? (Use the **tree**; mention shell/shared/features/native. Defer Query/flavors to a clause, not a new diagram.)

3. Why these feature names and not one `payments/` folder?

4. What’s in `shared/` for a fintech app, and what must stay out?

5. App-wide native vs feature native — how do you choose?

## Connections

1. How does this tree **instantiate** [type vs feature](../14.%20type-vs-feature/notes.md)?
2. How do [shell](../16.%20app-shell/notes.md) three folders map to `app/` here?
3. How does [money DTO/domain](../19.%20data-domain/notes.md) use `lib/money` without putting DTOs in shared?
4. How does [flavors](../20.%20flavors-config/notes.md) show up **without** a `flavors/` folder on the board?
5. How would [MyCreditInfo strangler](../21.%20legacy-modernization/notes.md) **grow toward** this diagram?
