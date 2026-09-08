# Shared UI / design system — when to extract — Self-test

## Core recall

1. When should you **not** extract a design system (curriculum example)?
2. List the four “do extract when” signals.
3. What are **tokens**, **primitives**, and **patterns** (one example each from the curriculum)?
4. What is the **no raw hex** rule, and when does it apply?
5. Where do feature-specific composites live until they’re reused?
6. Recite the curriculum spoken answer (repetition, primitives+tokens, composites).
7. Name five practical primitives from the curriculum.
8. What problem does a “3+ features” threshold solve in review?

## Explain why

1. Why are two similar buttons **not** enough to justify a kit?
2. Why is premature `Button` with 20 booleans worse than duplication?
3. Why is visual inconsistency a **trust** issue in fintech, not just taste?
4. Why extract for **cross-squad** work, not only for DRY?
5. Why **tokens before** a large component catalog?
6. Why keep `TransferAmountInput` in the feature even after you have `TextField`?
7. Why “we’ll reuse it someday” is how `shared/ui` becomes `components/` soup?
8. Why a Figma kit is a reason to extract **even** if only two features exist so far?
9. Why a11y belongs in primitives (hit target, role, error text) rather than each screen?
10. Why `shared/ui` importing `features/payments` would break the DAG?

## Compare and contrast

1. `shared/` as `http`/`money` vs `shared/ui` as a design system.
2. Primitive `Button` vs composite `PayCta` / `TransferAmountInput`.
3. Token `color.primary` vs hex `'#0B5FFF'` in a feature `StyleSheet`.
4. Pattern `EmptyState` vs a one-off `WalletEmpty` illustration.
5. Extracting a kit vs adopting NativeBase/Paper (library vs decision).
6. Early extraction vs extracting after real repetition (costs of each).
7. This unit vs [type-vs-feature](../14.%20type-vs-feature/notes.md) `shared/` junk-drawer rule — same idea, different asset.
8. Tokens as a **flavor seam** vs the full [§8](../02-architecture.md) environment lecture.

## Predict the output

1. Two screens in **wallet** share a blue CTA. A teammate adds `shared/ui/Button` with `isWallet`. What’s the likely next step of decay?

2. Tokens exist. A payments screen uses `color: '#0B5FFF'`. What rule broke, and what happens at white-label time?

3. `shared/ui/TransferAmountInput` with `mode: 'iban' | 'wallet'`. Which mistake is this?

4. Empty/loading/error still copy-pasted in four features; you only extracted `Button`. What’s missing from the kit **ladder**?

5. You extract 40 components on a 3-screen MVP. What failure mode hits the fourth screen?

6. Figma has a full kit; RN still has ad-hoc hex. Which “do extract” signal is ignored, and what’s the product cost?

## Debugging

1. PR review: `Button` grows `isPayments`, `compact`, `showSpinner`, `androidRippleOverride`. What’s the diagnosis and first fix?

2. `shared/ui` has 80 files; 60 are used by **one** feature. How do you shrink it without a rewrite?

3. Every PR comment is “padding 12 or 16?” Squad of 6. Which extract signal fired, and what do you add first?

4. Contrast failures on `Pressable`s in half the app; `Button` in shared is fine. What’s the missing rule?

5. `shared/ui/EmptyState` requires `variant: 'wallet' | 'payments' | 'profile'`. Smell?

6. Designers ship a new radius. You grep 90 files of `borderRadius: 8`. What wasn’t tokenized?

## Application

1. Recite the spoken interview answer from memory.

2. Place: generic `TextField`; `TransferAmountInput`; `color.danger`; `WalletEmpty` used only in wallet; `EmptyState` used in four features.

3. Write a 5-line `tokens` sketch (`color` + `space`) and a feature style that **uses** them (no hex).

4. Write the one-line PR rule: “If tokens exist, features must not …”

5. Given 2 similar buttons vs 5 features copying the same CTA: extract or not? One sentence each.

6. Sketch `shared/ui/` vs `features/transfers/ui/` from memory.

## Interview questions

1. Where do you put reusable buttons and form controls?  
   **Follow-up:** What stays in the feature?

2. When do you extract a design system in RN?  
   **Follow-up:** What do you extract **first**?

3. How do you keep the kit from becoming a gigantic abstraction?

4. How does a shared UI kit help fintech accessibility/trust?

5. `shared/ui` has become a 200-file junk drawer. How do you fix it incrementally? (UI kit angle, not the whole strangler playbook.)

## Connections

1. How does this **implement** “shared only if genuinely reused”?
2. How do tokens connect to a future **white-label** without doing §8?
3. How does presentational feature `ui/` [layering](../15.%20feature-layering/notes.md) **use** primitives without putting domain in `shared/`?
4. How is this **not** an answer to “how do you structure the app?” (type vs feature)?
5. How does [StyleSheet](../9.%20stylesheet-flexbox/notes.md) still apply after you have tokens?
