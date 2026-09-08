# Data and domain boundaries — Self-test

## Core recall

1. What is a **DTO** vs a **domain/UI model** (one sentence each)?
2. Recite the three-line example rule (`api/` / mappers / screens).
3. Where should **inbound** mapping live?
4. What must **screens** never do with wire fields?
5. Why is this especially critical in **fintech** (three curriculum nouns)?
6. What belongs in **pure** `model/` math vs `api/`?
7. What is a **god** API/service file?
8. Inbound vs **outbound** mapping — what does each convert?
9. Should a **global** axios interceptor map every feature’s DTOs? Why?
10. Preferred representation for **money** in domain logic (not a formatted string)?

## Explain why

1. Why is the wire shape a poor UI/product language?
2. Why does ad-hoc renaming in three screens fail when the API changes?
3. Why map **lists** in one function rather than in `renderItem`?
4. Why keep **fee math** free of `fetch` and `Platform`?
5. Why are **IEEE floats** a trap for currency?
6. Why shouldn’t formatted `"12.50 GEL"` be the **only** amount you store in domain?
7. Why is TypeScript-on-the-DTO not enough to “have a domain”?
8. Why do **status codes** (`PND`, `OK`) need a mapper + enum, not `if (st === 'PND')` in JSX?
9. Why does a god `PaymentService` make DTO changes expensive?
10. Why parse/validate DTOs at the boundary (e.g. missing `amt_cents`) instead of in `Text`?

## Compare and contrast

1. `PaymentDto` vs `Payment` (fields you’d expect).
2. Feature `api/` returning DTO vs mapper vs hook vs screen.
3. `computeFee` vs `formatMinor` (rule vs display).
4. God `payments.ts` vs split api / model / hooks.
5. Mapping in feature `mappers.ts` vs mapping in a **shared** HTTP interceptor.
6. Domain **status machine** vs passing `dto.st` into `Button` color.
7. This unit vs [feature layering](../15.%20feature-layering/notes.md) (what was already said vs what’s new).
8. This unit vs [05-networking.md](../05-networking.md) (boundary types vs interceptors/refresh).

## Predict the output

1. Wallet, Confirm, and Receipt each do `dto.amt_cents / 100`. Backend switches to `amount_minor` as a **string**. What happens, and why is it uneven?

2. `computeFee` uses `amount * 0.019` with JS floats. What’s the risk? What representation would you want instead?

3. Screen:

```tsx
<Text>{payment.st === 'PND' ? 'Pending' : payment.st}</Text>
```

`payment` is supposed to be domain. What leaked?

4. `http` interceptor maps **all** `/payments` JSON to a `Payment` type. Transfers add a different payment shape. What decays?

5. `getPayment()` returns domain `Payment` **and** shows a toast on error **and** computes fee. Which smell, and what breaks in tests?

6. Mapper:

```ts
amountMinor: dto.amt_cents / 100
```

and `computeFee` also assumes minor units. What bug class is this?

## Debugging

1. Two screens show **different** “pending” for the same payment. Diagnose.

2. Review: `ConfirmScreen` uses `route.params.amt_cents`. List and details use mapper. What’s wrong?

3. `model/fees.ts` imports `axios`. DAG + testability?

4. `api/types.ts` is copy-pasted into three features with slightly different `st` unions. Fix direction?

5. Production: `NaN` on the balance label after an API deploy. Where should you have failed?

6. `formatMoney` in `api/getWallet.ts` after fetch. Next, i18n and a second screen need unformatted add. What’s tangled?

## Application

1. Write `PaymentDto`, `Payment`, and `paymentFromDto` (status map included) in ~15 lines.

2. Write `computeFee(amountMinor, bps)` as integer math (`Math.round`).

3. Sketch hook flow: `getPaymentDto` → mapper → screen prop type.

4. Outbound: `createPaymentBody(paymentDraft)` — what type goes on the wire vs what the form holds.

5. One-line PR rule: “Screens must not …”

6. Split a god `PaymentService` into three bullets: what goes api / model / hooks.

## Interview questions

1. How do you keep API JSON from leaking into RN screens?  
   **Follow-up:** What happens when a field is renamed?

2. How do you handle money and balances in the client?

3. DTO vs domain model — what’s the difference, and where do mappers live?

4. How do you avoid a god API service file?

5. Payment states from the backend are messy (`PND`, `pending_review`). How do you model them?

## Connections

1. How does this **complete** `api/` vs `model/` from layering?
2. How does **pure model** still forbid `Platform.OS`?
3. How should React Query / [networking](../05-networking.md) **consume** this boundary (what does `queryFn` return)?
4. How do **design-system** formatters relate without replacing minor units?
5. Why is this the same **anti-corruption** idea as not deep-importing another feature’s internals?
