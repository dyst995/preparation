# Tailwind CSS — Practical Patterns

## What you need to know

**Tailwind** is a **utility-first** CSS framework: you compose small classes in markup (`px-4`, `bg-blue-600`, `md:flex`) instead of inventing custom class names in separate stylesheets for every UI piece.

Teams adopt it for: less context-switching, no naming bikesheds, a **constrained token scale** (spacing/colors), and **purged** production CSS (only used utilities ship).

Interview fluency: utility-first why, mobile-first breakpoints, when to extract components vs `@apply`, theme `extend`, and how to answer “isn’t this just inline styles?”

Prerequisites: [Flexbox](../38.%20flexbox/notes.md), [CSS Grid](../39.%20css-grid/notes.md) (Tailwind is often those ideas as classes: `flex`, `grid`, `gap-4`).

---

## Utility-first philosophy (preserved)

```jsx
<button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
  Save
</button>
```

| Benefit | Meaning |
| --- | --- |
| Co-location | Style next to structure — no jump to `.btn-…` CSS |
| No naming tax | Avoid `.btn-primary-outline-small-v2` debates |
| Design tokens | Scales (`p-4`, `blue-600`) keep UI consistent |
| Purge / content scan | Unused utilities dropped from prod CSS |

You still write CSS for rare one-offs; Tailwind is the default path for app UI chrome.

---

## State and responsive variants (preserved)

```jsx
<input className="border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 invalid:border-red-500" />

<div className="text-sm md:text-base lg:text-lg">
  {/* mobile-first */}
</div>

<div className="flex flex-col md:flex-row gap-4">
  {/* stack mobile, row from md up */}
</div>
```

**Variants** prefix utilities: `hover:`, `focus:`, `disabled:`, `dark:`, `md:`, …

**Mobile-first:** unprefixed = all sizes; `md:` / `lg:` = that breakpoint **and up**, not an isolated band. To style “only mobile,” set the mobile base, then override at `md:`.

```text
text-sm          → all viewports
md:text-base     → md and larger (overrides text-sm there)
lg:text-lg       → lg and larger
```

Same stacking idea as classic mobile-first media queries.

---

## Avoiding class soup (preserved)

### 1. Extract a React component (preferred default)

```jsx
function PrimaryButton({ children, ...props }) {
  return (
    <button
      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
      {...props}
    >
      {children}
    </button>
  );
}
```

Repeating or huge strings → one component; callers stay clean. Variants via props + `clsx`/`cn` is a common next step (interview-aware, not required by curriculum).

### 2. `@apply` in CSS (use sparingly)

```css
.btn-primary {
  @apply px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700;
}
```

Useful when a **class name** must exist outside the React tree. **Default preference: components over `@apply`** — `@apply` brings back file-jumping that utility-first tried to remove.

---

## Design tokens via config (preserved)

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: { 50: '#eff6ff', 500: '#3b82f6', 900: '#1e3a8a' },
      },
      spacing: { 18: '4.5rem' },
    },
  },
};
```

Prefer `bg-brand-500` over scattering `bg-[#3b82f6]`. **`extend`** adds tokens without wiping Tailwind defaults; replacing entire `theme.colors` is a bigger, rarer move.

Rebrand ≈ config change, not repo-wide hex hunt.

---

## Criticisms and responses (preserved)

**“Markup is unreadable.”** Long strings hurt — extract components; use IntelliSense / class sorting.

**“Inline styles with extra steps.”** No: utilities support **pseudo-classes**, **responsive/dark variants**, cascade/specificity as CSS, and **purge**. Inline `style={{}}` cannot do `hover:` / `md:` as CSS classes do.

---

## Build/purge mental model (interview depth)

Tailwind generates CSS for utilities it finds in **content paths** (JSX/TSX/HTML). Prod builds keep only detected classes — dynamic string concatenation can **miss purge** (`className={'bg-' + color}` may not emit `bg-red-500`). Prefer complete class names in source or safelist.

---

## Interview answer (preserved)

**Q: What's your philosophy on when to extract a Tailwind utility string into something reusable?**

> “Once a utility combination repeats across multiple places, or a single string gets long enough to hurt readability, I extract a component — like `<PrimaryButton>` — rather than reaching for `@apply`, because keeping the style co-located with the component preserves Tailwind’s core benefit of not context-switching between files. I reserve `@apply` for cases where a component wrapper isn’t practical, like shared markup outside the component tree. For design consistency, I push colors/spacing into `tailwind.config.js` as theme tokens rather than hardcoding arbitrary values, so the whole app pulls from one source of truth.”

---

## Common mistakes and misconceptions

1. Treating Tailwind as inline styles.  
2. Reaching for `@apply` for every repetition.  
3. Desktop-first breakpoint thinking (`md:` as “only tablet”).  
4. Arbitrary values everywhere instead of theme tokens.  
5. Dynamic class name construction that purge can’t see.  
6. Huge unextracted strings copied 12 times.  
7. Fighting the design scale with one-off spacing that breaks consistency.

---

## Connections to other concepts

```
flex / grid / gap utilities
  ← same layout models as prior sections

utility co-location
  ← React component extraction

theme.extend
  ← design system single source of truth

mobile-first variants
  ← responsive stacking (flex-col md:flex-row)
```

---

## Interview perspective

Be ready to:

1. Why utility-first / why teams use Tailwind.  
2. Mobile-first breakpoints.  
3. Extract component vs `@apply`.  
4. Theme tokens vs arbitrary hex.  
5. Rebut “just inline styles.”  
6. Extraction philosophy answer.

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
