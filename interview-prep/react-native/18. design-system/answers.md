# Shared UI / design system — when to extract — Answers

## Core recall

1. **Two buttons with similar padding** — not a design system yet.
2. **Repeated visual language** across features; **Figma/UI kit**; **a11y + fintech consistency**; **cross-squad constraints**.
3. **Tokens:** colors/spacing/type/radii. **Primitives:** Button, TextField, ListRow, Screen, InlineError. **Patterns:** EmptyState, LoadingState, ErrorState.
4. **No raw hex in features** **once tokens exist**. Features consume named tokens.
5. In **`features/<capability>/ui`** until a **second** capability actually needs the same composite.
6. Extract when **repetition and inconsistency are real costs**. **Primitives + tokens first**, not a giant abstraction. **Composites stay in the feature** until reused.
7. Button, TextField, ListRow, Screen, InlineError.
8. Stops **ad-hoc** extract-or-not debates; a **repeatable** bar (e.g. 3+ features).

## Explain why

1. The **third** use will differ. A kit frozen at two screens becomes **forks** or **boolean soup**. Duplication is cheaper until the language **stabilizes**.
2. The shared API is now the **bottleneck**. Every new screen **fights** the Button instead of composing tokens.
3. Uneven CTAs/fields read as **unsafe** (money). Trust is a **product** requirement, not polish.
4. Constraints **reduce review bikeshedding** and accidental palettes. DRY is secondary; **coordination** is the cost.
5. Tokens are a **small, stable** contract. A 40-component catalog **without** tokens still has hex drift.
6. It encodes **domain** (IBAN, limits). `TextField` is the primitive; the composite **owns** product rules in the feature.
7. Speculative reuse **hides ownership**. `shared/ui` becomes unowned `components/`.
8. Product already **standardized** visually. Engineering inventing a second system is **inconsistency** even at small feature count.
9. One primitive = **one** place for role, min size, contrast, error association. Screens will **forget**.
10. **`shared` must not import features** — you’d drag payments into “primitives” and invert the DAG.

## Compare and contrast

1. **`shared/lib`:** non-UI reuse. **`shared/ui`:** visual language. You can have the first **without** a kit.
2. **Button:** no product meaning. **PayCta / TransferAmountInput:** product copy, amounts, validation wiring.
3. **Token:** change once, rebrand/theme. **Hex:** 90-file grep; white-label fails.
4. **EmptyState:** generic slots (title, action). **WalletEmpty:** wallet-only art/copy — feature until reused.
5. Library **implements** primitives; you still decide **threshold, tokens, what stays in features**. NativeBase ≠ architecture.
6. **Early:** wrong API, churn. **Late:** drift, hex, a11y holes. Extract at **real** repetition/Figma/squads.
7. Same **genuine reuse** rule; this unit is **visual** assets. Junk-drawer `utils` ≈ junk-drawer `Button2`.
8. **Tokens** = seam for brand. **§8:** flavors, bundle ids, secrets, flags — don’t dump that here.

## Predict the output

1. **God Button** / `isX` flags. Next: more flags or `Button2`. Should have stayed **feature `ui/`** or a **tiny** primitive **without** `isWallet`.
2. **No-hex rule.** White-label must **hunt hex**; tokens wouldn’t have been a single swap.
3. **Domain on a shared composite** — `shared/ui` as fake primitive. Split: `TextField` shared; IBAN vs wallet inputs in **features**.
4. **Patterns** (Empty/Loading/Error) still missing; you’re stuck at primitives only.
5. New screen **doesn’t fit** the 40 APIs → wrap/override hell or fork. Classic premature kit.
6. **Figma kit ignored.** Two visual systems; design-dev **thrash**; trust/a11y uneven.

## Debugging

1. **God primitive.** Split variants that are **real** (`primary | destructive`); move payments-only UI back to **feature**; don’t add `isPayments`.
2. **Move single-feature files back** as you touch them; keep tokens + true primitives. Lint/review: no new one-offs in `shared/ui`.
3. **Cross-squad constraints.** Add **spacing/color tokens** first (maybe `Button` next) — cheapest coordination.
4. Screens using **raw `Pressable`**, bypassing `Button`. Rule: **interactive** chrome goes through primitives (or you accept a11y drift).
5. **Pattern parameterized by feature names** — it’s three composites pretending to be one. Feature empties **or** a **generic** EmptyState **without** feature enums.
6. **Radius (and probably color/space) not in tokens**, or tokens unused. Tokenize; replace magic numbers.

## Application

1. Extract when repetition/inconsistency **cost**. Tokens + primitives **first**. Composites stay in the feature until **reused**.
2. **TextField:** `shared/ui`. **TransferAmountInput:** `features/transfers/ui`. **color.danger:** tokens. **WalletEmpty:** `features/wallet/ui`. **EmptyState:** `shared/ui` patterns.
3.

```ts
export const color = { primary: '#0B5FFF', danger: '#C62828' };
export const space = { md: 16 };
// feature: padding: space.md, color: color.primary
```

4. **…must not use raw hex (or magic radii/space) — use tokens.**
5. **2 buttons:** don’t extract. **5 features same CTA:** extract **Button + tokens**.
6. `shared/ui/{tokens, Button, TextField, …}`; `features/transfers/ui/TransferAmountInput`.

## Interview questions

1. **Spoken:** Generic Button/TextField → `shared/ui`. Domain fields (TransferAmountInput) → **feature ui** until reused.  
   **Follow-up:** Composites stay in the feature; they **compose** primitives.

2. **Spoken:** When repetition and inconsistency are **real costs** — several features, Figma kit, fintech a11y/trust, squads need constraints.  
   **Follow-up:** **Tokens + primitives first**, not a giant layer.

3. **Spoken:** Small variant sets, no `isWallet` flags, don’t promote one-offs, don’t extract at two buttons. Composites stay put until a **second** consumer.

4. **Spoken:** One Button/TextField owns contrast, hit size, roles, error patterns. Money UIs that **look** different feel **unsafe**; the kit is how you keep them **even**.

5. **Spoken:** Don’t rewrite `shared/ui` in one PR. Move single-feature components **back**; keep tokens/primitives; stop new dumps. Same incremental idea as strangling `utils/`.

## Connections

1. Promote to `shared/ui` only when **multiple** features (or a product kit) **share** the language — not “it’s a `.tsx`.”
2. If **all** color/type/space go through tokens, a second brand is **token + assets**, not 90 hex edits. Flavors/schemes still §8.
3. Feature `ui/` is presentational **domain** chrome; it **imports** `Button`/`tokens`. Domain **rules** stay in feature `model/`, not in `shared/ui`.
4. Structure is **capabilities + layers**. A kit **plugs into** `shared/ui`. “We use Paper” does not replace feature folders.
5. You still write **StyleSheet / Yoga**; tokens are the **numbers and colors**, not a different layout engine.
