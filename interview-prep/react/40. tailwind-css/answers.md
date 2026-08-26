# Tailwind CSS — Answers

## Core recall

1. Compose small utility classes in markup instead of bespoke CSS class names per UI piece.  
2. Co-location, no naming tax, token consistency, purged unused CSS (any three).  
3. Unprefixed = all sizes; `md:` applies from that breakpoint **upward**.  
4. When the combo repeats or the string hurts readability.  
5. When you need a reusable class outside practical component wrapping.  
6. Centralize tokens for consistency and one-place rebranding.  
7. Variants (hover/focus/responsive), real CSS cascade, purge — inline styles lack those.  
8. Scanner may not see full class names → missing CSS in production.

## Explain why

1. Style lives with the element — no hunt through stylesheets for “what styles this?”  
2. Preserves co-location; `@apply` reintroduces CSS-file indirection.  
3. Everyone picks from the same scale instead of random px/hex.  
4. Base = mobile column; from `md` up override to row.  
5. Verbosity is encapsulated once; call sites stay clean.  
6. Production CSS stays small — only referenced utilities ship.

## Compare and contrast

1. **Utilities:** compose in JSX. **BEM:** name + maintain separate CSS rules.  
2. **Component:** co-located reuse. **`@apply`:** named CSS class, more indirection.  
3. **Tokens:** systemized. **Arbitrary:** one-offs that drift.  
4. **Variants/purge/cascade** vs limited inline declarations.  
5. **Unprefixed:** always-on. **`lg:`:** from large breakpoint up.

## Predict / interpret

1. **`text-lg`** (md override wins).  
2. **`text-sm`**.  
3. **Not as cleanly** — need CSS or other mechanisms for pseudo-states.  
4. Extract `<PrimaryButton>` (or similar).

## Debugging

1. Dynamic construction — purge didn’t emit those classes; use full names / safelist.  
2. Put brand colors in `tailwind.config` theme.  
3. Extract shared button/input components.  
4. Overuse of `@apply` fights utility-first; prefer components.

## Application

1. As in notes — `px-4 py-2 bg-blue-600 … hover:… disabled:…`.  
2. `flex flex-col md:flex-row gap-4`.  
3. `extend.colors.brand = { 500: '…', … }`.  
4. Paraphrase preserved interview answer.

## Interview questions

1. **Spoken:** Extract component when repeated or too long; prefer that over `@apply`; tokens in config. Follow-ups: `@apply` only when components aren’t practical; not inline styles because variants + purge.  
2. **Spoken:** Base styles mobile; `md:`/`lg:` min-width media upward.  
3. **Spoken:** Theme tokens, shared components, limited arbitrary values.  
4. **Spoken:** Pros — speed, consistency, purge. Cons — verbose class strings, learning utilities, discipline for extraction/tokens.

## Connections

1. `flex`, `grid`, `gap-*`, `items-center` are the same layout concepts as class APIs.  
2. Reusable styled primitives are just React components.  
3. Config tokens = design system source of truth for rebrand/theme.  
4. Same cascade: mobile defaults, then wider breakpoints override.
