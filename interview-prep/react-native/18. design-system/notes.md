# Shared UI / design system — when to extract

## What you need to know

[Feature-based `shared/`](../14.%20type-vs-feature/notes.md) is **not** a design system by itself. `shared/` can be `http` and `money` with **no** UI kit. This unit is **when visual language becomes a product cost**, and **what** to extract first.

**Don’t extract too early.** Two buttons with similar padding are **not** a design system. Premature `shared/ui` is an API that **fights** the next screen.

**Do extract when:**

- Multiple features repeat the **same visual language**
- Product has a **UI kit / Figma library**
- You need **accessibility and consistency** for **fintech trust**
- **Cross-squad** contribution needs **constraints**

**Practical contents:**

- **Tokens:** colors, spacing, typography, radii
- **Primitives:** Button, TextField, ListRow, Screen, InlineError
- **Patterns:** EmptyState, LoadingState, ErrorState
- **Rule:** no raw **hex** in features **if tokens exist**

**Feature-specific composites** (`TransferAmountInput`, `FeeBreakdown`) stay in **`features/<x>/ui`** until they are **actually reused**.

This unit is **extraction threshold + kit shape**. **DTO mapping** and **flavors/white-label** are later sections — tokens help white-label, they are not the full flavor playbook.

Preserve the spoken answer:

> I extract a shared UI kit when repetition and inconsistency become real costs. I keep it at primitives + tokens first, not a gigantic abstraction layer. Feature-specific composites stay in the feature until they’re reused.

---

## What “extract” means (and what it is not)

**Extract** = promote a **repeated visual contract** into `shared/ui` (often `shared/ui/tokens` + primitives) so features **compose** it instead of copy-pasting `padding: 16` and `'#0B5FFF'`.

It is **not**:

- Moving every `View` into `shared/` on day one
- A 200-prop `AppButton` that encodes every screen’s edge case
- Putting **payments-only** chrome in `shared/` because “it’s a component”

```text
shared/ui/
  tokens.ts          # color.primary, space.md, font.heading
  Button.tsx
  TextField.tsx
  ListRow.tsx
  Screen.tsx
  InlineError.tsx
  EmptyState.tsx     # pattern — later than Button
features/transfers/ui/
  TransferAmountInput.tsx   # knows IBAN / limits — not a primitive
```

A **token** is a **named value** (`color.danger`), not a comment next to a hex. A **primitive** has **no product meaning** (Button does not know “Pay”). A **pattern** is a **recurring layout** of primitives (empty wallet). A **composite** is **domain UI** (transfer amount + currency + error from **transfers** rules).

---

## Don’t extract too early — why two similar buttons are not a kit

The third screen will need a **ghost** button, a **full-width** CTA, or a **destructive** style. If you froze a `Button` after **two** screens, you either:

- **Fork** (`Button2`, `PrimaryButtonNew`), or
- Add **boolean soup** (`isPayments`, `isCompact`, `isWallet`)

That is **premature abstraction**: the shared API becomes the **hardest** place to change. Cost of **duplicating** 12 lines of padding once < cost of a **wrong** public API.

**Rule of thumb (interview-usable):** wait until **several features** (or a **Figma kit** the product already treats as law) share the language. A documented threshold like **“3+ features repeat a pattern”** beats arguing every PR. Two screens in **one** feature = still **feature `ui/`**.

---

## When extraction **is** the senior move

| Signal | Why it matters |
| --- | --- |
| **Same language across features** | Wallet, payments, profile all use the same CTA/field look — copy drift is **inconsistency**, not speed |
| **Figma / UI kit** | Engineering should not invent a second visual system; tokens map **kit → RN** |
| **Fintech trust + a11y** | Contrast, **min hit target**, focus, error text — fix **once** on `Button`/`TextField`, not in 40 screens. Users (and auditors) notice **uneven** buttons more than folder trees |
| **Cross-squad constraints** | Without primitives, every PR bikesheds `12` vs `16`. A kit is a **review contract**: “use `Button`, don’t add hex” |

Inconsistency in a **money** app reads as **untrustworthy**, not “we’ll clean styles later.” That’s why this is **architecture**, not “CSS preference.”

---

## Tokens first, then primitives, then patterns

**Tokens** are the **cheapest** shared layer. Features can still have **local** `StyleSheet`s that **only** reference tokens:

```ts
// shared/ui/tokens.ts
export const color = { primary: '#0B5FFF', danger: '#C62828', text: '#111' };
export const space = { sm: 8, md: 16, lg: 24 };
```

```ts
// features/wallet/ui/BalanceCard.tsx — OK: local layout, token values
padding: space.md,
backgroundColor: color.surface,
```

```ts
// Smell — tokens exist, feature still invents a palette
color: '#0B5FFF'
```

**Primitives** wrap RN host views with **tokens + a11y defaults** (`accessibilityRole`, `minHeight` ~44). They take **a small variant set** (`primary | secondary | destructive`), not a kitchen sink.

**Patterns** (`EmptyState`) come **after** you see the same empty/loading/error **chrome** in multiple features. Promoting them too early produces a pattern API that **none** of the real empties fit (illustration slot, CTA, legal line).

**Rule: no raw hex in features if tokens exist.** That’s enforceable in review (and later lint). Exceptions: **one-off** illustrations, or a feature **explicitly** on a branded campaign — rare; don’t make it the default.

---

## Feature composites stay until reused

`TransferAmountInput` that knows **IBAN, limits, currency** is **not** `shared/ui/TextField`. It **uses** `TextField`.

**Promote** when a **second** capability needs the **same** composite (not “similar”). If wallet needs a **generic** amount field and transfers need **IBAN**, you still have **two** composites; maybe they share `TextField` + `tokens`, not one `AmountInput` with `mode: 'iban' | 'wallet'`.

That last shape is how **shared/ui becomes `utils/`** — domain flags on a “primitive.”

---

## How it appears in real PRs

```tsx
// shared/ui/Button.tsx — primitive
export function Button({ variant = 'primary', ... }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      style={[styles.base, variant === 'destructive' && styles.destructive]}
    />
  );
}

// features/payments/ui/PayCta.tsx — still a composite if it wires amount + “Pay {x}”
<Button onPress={submit}>Pay {formatMinor(amount)}</Button>
```

**White-label / second brand (preview):** if tokens are the **only** color/spacing source, a later flavor is **token swap**, not a fork of every screen ([§8](../02-architecture.md)). If hex is everywhere, white-label is a **rewrite**. Don’t pretend you already have flavors; **do** say tokens are the **seam**.

---

## Common mistakes and misconceptions

- **Day-one “design system”** with 40 components and 2 screens.
- **`shared/ui` as the old `components/`** — every screen’s one-off dumped “for reuse someday.”
- **God Button** (`isWallet`, `showFee`, `Platform.OS` soup).
- **Extracting composites before primitives** — `WalletEmpty` in shared while `Button` is still copy-pasted.
- **Tokens file nobody uses** — hex still in features; the rule isn’t real.
- Answering **NativeBase / Paper** as the architecture. A library can **implement** primitives; the decision is still **threshold + ownership**.
- **“Folders don’t matter, we have a theme.”** Theme without **use** and **no-hex** is decoration.

---

## Connections to other concepts

`shared/ discipline (type vs feature) → this unit (visual language) → tokens as flavor seam (later)`

- **[Type vs feature](../14.%20type-vs-feature/notes.md):** `shared/` for **genuine** reuse; this unit is the **UI** slice of that rule.
- **[Feature layering](../15.%20feature-layering/notes.md):** presentational `ui/` in the feature; primitives imported **from** `shared/ui`; `shared` **must not** import features.
- **[StyleSheet / Yoga](../9.%20stylesheet-flexbox/notes.md):** tokens are **values**; Yoga still lays out. Don’t confuse a kit with “we don’t need Flexbox.”
- **[Assets](../11.%20assets/notes.md):** font **families** belong in token typography once extracted.
- **[§8 Flavors](../02-architecture.md):** brand swap **through tokens**, not a parallel hex universe.
- **[Accessibility](../09-forms-ux-fintech.md):** kit is **where** hit targets and error patterns **stick**.

---

## Interview perspective

They are scoring **judgment**: you can **delay** a kit **and** you know **when** inconsistency is **expensive** (fintech, multi-squad, Figma). Then **tokens + primitives first**, composites **in the feature**.

If they ask “where do reusable buttons go?”: **`shared/ui` if generic; feature `ui` if domain-specific.**

If they ask “what if `shared/ui` is 200 files?”: same as junk-drawer `shared/` — **move one-offs back**, keep named primitives, don’t freeze a mega-API.

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
