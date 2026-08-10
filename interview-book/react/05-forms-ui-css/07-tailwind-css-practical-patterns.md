# 07. Tailwind CSS - practical patterns

> Source: `interview-prep/react/05-forms-ui-css.md`

### The utility-first philosophy

Instead of writing custom CSS classes and switching files/context to style something, Tailwind provides small, composable utility classes applied directly in markup.

```jsx
<button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
  Save
</button>
```

**Why teams choose this:** no context-switching between CSS files and markup, no naming struggles (no more inventing `.btn-primary-outline-small-v2`), a constrained design-token system (spacing/color scales) that keeps a large team's UI visually consistent by default, and unused styles are automatically purged from the production build (no growing dead CSS file over time).

### State and responsive variants

```jsx
<input className="border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 invalid:border-red-500" />

<div className="text-sm md:text-base lg:text-lg">
  {/* mobile-first: base styles apply first, then overridden at each breakpoint and up */}
</div>

<div className="flex flex-col md:flex-row gap-4">
  {/* stacked on mobile, side-by-side from md breakpoint up */}
</div>
```

Tailwind is **mobile-first**: unprefixed utilities apply at all sizes; prefixed ones (`md:`, `lg:`) apply from that breakpoint **upward**, not as isolated ranges.

### Avoiding class-name soup: extraction strategies

When a utility string grows unwieldy and repeats across many places, two common fixes:

**1. Extract a React component** (usually preferred in a component-based codebase - keeps logic and style together, supports props/variants cleanly):

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

**2. `@apply` in a CSS file** (useful when you want a reusable class name outside JSX, e.g., shared with server-rendered/non-component markup):

```css
.btn-primary {
  @apply px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700;
}
```

**Interview-level nuance:** most modern Tailwind teams prefer **component extraction over `@apply`** as the default, because `@apply` reintroduces a layer of indirection (you have to jump to a CSS file to see what a class means) that utility-first CSS was designed to avoid; `@apply` is best reserved for cases where a component wrapper genuinely isn't practical.

### Design tokens / theming via `tailwind.config.js`

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

Extending the theme (rather than hardcoding arbitrary hex values inline) keeps the design system centralized and consistent - `bg-brand-500` instead of `bg-[#3b82f6]` scattered everywhere, which also makes rebranding/theming a config change instead of a codebase-wide find/replace.

### Common Tailwind criticisms and your response

**"Tailwind makes markup unreadable/verbose."** Fair critique for very long class strings; mitigated by component extraction (encapsulate the verbosity once, reuse the clean component everywhere) and editor tooling (class sorting, IntelliSense).

**"It's inline styles with extra steps."** Not quite - unlike inline styles, Tailwind utilities support pseudo-classes (`hover:`, `focus:`, `disabled:`), responsive variants, dark mode variants, and are subject to CSS specificity/cascade rules and purge/tree-shaking - inline styles can do none of this.

### Interview question

**Q: What's your philosophy on when to extract a Tailwind utility string into something reusable?**

> "Once a utility combination repeats across multiple places, or a single string gets long enough to hurt readability, I extract a component - like `<PrimaryButton>` - rather than reaching for `@apply`, because keeping the style co-located with the component preserves Tailwind's core benefit of not context-switching between files. I reserve `@apply` for cases where a component wrapper isn't practical, like shared markup outside the component tree. For design consistency, I push colors/spacing into `tailwind.config.js` as theme tokens rather than hardcoding arbitrary values, so the whole app pulls from one source of truth."

---
