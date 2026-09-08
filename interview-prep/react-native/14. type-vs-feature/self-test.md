# Type-based vs feature-based architecture — Self-test

## Core recall

1. What does **type-based** grouping mean (one sentence)? Name the usual top-level folders.
2. What does **feature-based** grouping mean (one sentence)?
3. What are the two real **pros** of type-based structure?
4. List the four **cons** of type-based structure from the curriculum.
5. What do `app/`, `shared/`, and `features/` each own at a high level?
6. What is a feature’s `index.ts` for?
7. List the five **pros** of feature-based architecture from the curriculum.
8. List the three **cons** of feature-based architecture from the curriculum.
9. Inside a feature, do `screens/`, `hooks/`, and `api/` still exist? Why does that not make the app type-based?
10. What belongs in `shared/` vs a feature’s own `ui/`?

## Explain why

1. Why does type-based structure appear so often in early RN apps?
2. Why does grouping by file type **scatter** a single capability?
3. Why is deleting “payments” dangerous in a type-based tree?
4. Why do `utils/` and `components/` become junk drawers under type-based structure?
5. Why does high **cohesion** shrink blast radius?
6. Why does a public `index.ts` make refactors safer?
7. Why can you lazy-load or isolate a feature more easily than a type-based `screens/` pile?
8. Why is “two screens used it” not a sufficient rule for putting code in `shared/`?
9. Why can over-segmentation make feature-based worse than a coarse type-based tree?
10. Why do you still need **cross-feature import rules** if you already have feature folders?

## Compare and contrast

1. Type-based vs feature-based: what is the **grouping key**?
2. Cohesion vs coupling in this debate (one pair of sentences).
3. `src/components/AmountField.tsx` vs `features/transfers/ui/TransferAmountInput.tsx` — how do you decide?
4. `app/` vs `features/payments/screens/` — what must not leak where?
5. Deep import of `features/wallet/model/helpers` vs `import { … } from '@features/wallet'`.
6. Greenfield EasyPay (feature-based from day one) vs migrating Wizer/MyCreditInfo soup.
7. Feature-based for a mid-size fintech vs type-based for a pivoting MVP.
8. This unit’s tree vs **layering inside** a feature (what is *not* this unit)?

## Predict the output

1. A payments bugfix in a type-based app. Which folders are you likely to touch? Why is that a problem?

```text
src/screens/  src/hooks/  src/services/  src/utils/  src/components/
```

2. Same bugfix after a feature-based move. Where should almost all of the diff live? What would a diff that also rewrites `features/auth/screens/` suggest?

3. You add `shared/paymentsHelpers.ts` used only by `features/payments`. What happened, and what should you do?

4. `SendScreen` does:

```ts
import { computeFee } from '../../payments/model/fees';
```

What rule did you break, and what happens on the next payments refactor?

5. A weekend prototype with four screens and one developer uses `screens/` + `components/`. Is that automatically a senior red flag? Explain.

6. You create `features/icon-row/`, `features/padding-box/`, and `features/tiny-badge/` each with one component. Which feature-based **con** is this?

## Debugging

1. Every “small” wallet PR touches `components/`, `screens/`, `hooks/`, and `utils/`. Diagnose the structure. First move?

2. New hire cannot find login: files are `screens/Login.tsx`, `hooks/useAuth.ts`, `services/auth.ts`, `utils/token.ts`. What’s the smell in one sentence?

3. Review comment: `import { formatBalance } from '../../wallet/model/helpers'`. What do you ask the author to do instead?

4. `shared/utils.ts` has 40 unrelated functions. What’s the decay pattern? How do you fix it **without** a big-bang rewrite of `shared/`?

5. `app/screens/PaymentConfirm.tsx` exists “because the navigator is in `app/`.” What’s wrong?

6. CV: “we moved to feature-based” but PRs still deep-import internals and `shared/` is the old `utils/` renamed. What did they actually fail to do?

## Application

1. Draw the type-based tree and the feature-based tree from memory (no looking). Label `index.ts` on one feature.

2. Recite the curriculum spoken answer on preferring feature-based for production (legacy soup → capabilities).

3. Write a 4-line `features/payments/index.ts` that exports a navigator and a status helper, and does **not** export an internal fee table.

4. Given `TransferAmountInput` (IBAN, limits) and `Button` (generic). Write one sentence each for where they live.

5. You inherit type-based soup, high merge conflict in `components/`. Write three bullets: what you do **not** do, what you do first, what “done” looks like for **one** slice (not the full strangler playbook).

6. Write the one-line rule you’d put in a PR checklist: “features must not …”

## Interview questions

1. Why feature-based over `components/` + `screens/`?  
   **Follow-ups:** Give a legacy pain example. What’s the tradeoff?

2. How would you structure a mid-size fintech RN app from scratch? (Stay on **tree**, not flavors/boot — those are later.)  
   **Follow-up:** Where do reusable buttons go?

3. How do features communicate without a tangled graph?

4. What’s a case where feature-based architecture is the wrong call?

5. You inherit `shared/` as a 200-file junk drawer. How do you fix it without a big rewrite? (Keep this at **shared discipline**, not the full modernization playbook.)

6. How do you decide when one feature should split into two?

## Connections

1. How does this tree **implement** the five tests from [why architecture](../13.%20why-architecture/notes.md)?
2. How does type-based scatter make crash-rate fixes fragile (debugging / blast radius)?
3. How will **inner** `screens → hooks → api/model` (next section) sit *inside* this tree rather than replace it?
4. How does platform soup relate: where should `Platform.OS` **not** live even in a feature-based app?
5. How is “move boundaries around wallet, auth, feed” both this unit and a preview of the strangler playbook — without mixing the two answers?
