# Layering inside a feature — Self-test

## Core recall

1. Why isn’t a `features/payments/` folder enough by itself?
2. List the seven entries in the curriculum tree (`ui` through `index.ts`) and one-line each.
3. What does **presentational** `ui/` mean (what it takes in / must not do)?
4. What does **view-model-ish** `hooks/` mean?
5. What belongs in `model/` vs `api/` vs `native/`?
6. Write the dependency arrows: screens, hooks, api/model, ui, shared, features.
7. What must `shared/` **not** import?
8. What must features **not** freely import from other features?
9. List the three cross-feature communication options **in order**.
10. What is `index.ts` allowed to export vs what it should hide?

## Explain why

1. Why do screens exist separately from `ui/` if both render RN views?
2. Why should `model/` stay free of `fetch` and `Platform.OS`?
3. Why do hooks sit **between** screens and api/model?
4. Why is `ui/` importing a feature hook a layering smell?
5. Why must `shared/` not import `features/payments`?
6. Why does a public `index.ts` fail if you re-export every internal helper?
7. Why is a global event bus a weak **first** answer for feature communication?
8. Why can `model` importing `api` (the fetch module, not a DTO type) invert the DAG?
9. Why does mapping wire fields in three screens violate this unit even if folders look clean?
10. Why do circular imports between features show up as “I can’t move this file”?

## Compare and contrast

1. Feature-based **outer** tree vs **inner** layering — what problem each solves.
2. `screens/` vs `ui/` vs `hooks/`.
3. `model/` vs `api/` (including where mapping *starts*; DTO depth is later).
4. Feature `native/` vs putting `NativeModules` in `model/fees.ts`.
5. Import from `@features/wallet` vs `../../wallet/model/helpers`.
6. Lift to `shared/lib/money` vs duplicating `formatMinor` in two features vs deep-importing payments.
7. Navigation params vs Zustand/global store “for this confirm amount.”
8. Inner `hooks/` vs a top-level `src/hooks/` (type-based).

## Predict the output

1. `computeFee` in `model/fees.ts` adds `import { Platform } from 'react-native'`. Which layering rule broke, and what tests just got harder?

2. `ConfirmPaymentView` (in `ui/`) calls `useQuery`. What’s the smell? What should own the query?

3. Wallet does:

```ts
import { computeFee } from '../../payments/model/fees';
```

Payments later moves `fees.ts`. What happens, and which communication option was skipped?

4. `shared/ui/Button.tsx` imports `PaymentsNavigator` from `@features/payments` to “wrap a pay CTA.” What arrow did you reverse?

5. Two features both need `Money`. You export `Money` from payments `index.ts` and wallet imports it. Is that option 1 or should it have been option 2? Explain.

6. Confirm screen keeps `amount` in a global Zustand store “so any screen can read it.” Which option 3 idea did you skip, and what’s the cost?

## Debugging

1. `features/payments/` is one folder but `PaymentScreen.tsx` is 800 lines: fetch, fees, layout, `NativeModules`. Diagnose. Where does each concern go?

2. Review: `model/status.ts` imports `useConfirmPayment`. What’s wrong with the DAG?

3. `api/payments.ts` shows toasts and formats currency. Which layers leaked into api?

4. Metro warns about a cycle: `features/wallet/index.ts` → payments internals → wallet internals. What communication option fixes it without an event bus?

5. PR adds `index.ts` that `export * from './hooks'` and `export * from './model'`. What did they fail to do?

6. `ui/FeeRow.tsx` imports `../screens/ConfirmPaymentScreen` for a type. Fix?

## Application

1. Draw `features/payments/` from memory (seven entries) and the import arrows.

2. Sketch `ConfirmPaymentScreen` in 8–15 lines: hook + presentational view. No fee math in the screen.

3. Write a 4-line `index.ts` that exports a navigator and `formatPaymentStatus`, not `computeFee`.

4. Wallet needs a payment **status label**. Pick option 1 or 2 and write the import.

5. Write one sentence you’d put in a PR checklist for dependency direction.

6. `TransferAmountInput` needs IBAN validation (pure) and a generic `TextField`. Where does each piece live?

## Interview questions

1. Even inside `features/payments/`, how do you separate concerns?  
   **Follow-ups:** Draw the arrows. Where does fee math live?

2. How do features communicate?  
   **Follow-up:** Why not an event bus?

3. Where should business rules live vs native SDKs vs presentational UI?

4. How do you prevent architecture decay **inside** a feature (not only type-based soup)?

5. A teammate says “it’s all in the payments folder, imports don’t matter.” How do you answer?

## Connections

1. How does this unit **complete** type-vs-feature without replacing it?
2. How do the five “why architecture” tests show up **inside** one feature?
3. How does platform soup in `model/` violate both this DAG and [platform-specific](../8.%20platform-specific/notes.md)?
4. What will **app shell** (§4) import from a feature, and what must it not own?
5. How does §7 (DTO vs mappers) **extend** `api/` vs `model/` rather than invent a new top-level tree?
