# 06. Section E - Forms, UI & CSS

> Source: `interview-prep/react/06-interview-questions.md`

**E1. Controlled vs uncontrolled inputs - when to choose each?**
> Controlled: need live validation/formatting/derived UI per keystroke, single source of truth in state. Uncontrolled: only need final values at submit time, want to minimize re-renders on large forms, or working with inputs React can't control anyway (file inputs).

**E2. What causes the "changing an uncontrolled input to controlled" warning?**
> The input's `value` prop is `undefined` on an early render (uncontrolled) and becomes a defined value later (controlled) - usually from initializing state with data that hasn't loaded yet. Fix: initialize state to a defined default (`?? ''`).

**E3. How do you prevent double form submission?**
> Track `isSubmitting` state, disable the submit button while true, and additionally guard the top of the submit handler to bail out if already submitting, resetting the flag in a `finally` block regardless of success/failure.

**E4. Why does React Hook Form avoid per-keystroke re-renders?**
> It tracks inputs via refs (uncontrolled internally) rather than controlled state, only triggering re-renders for state you actually subscribe to (like `errors` or `isSubmitting`), not on every keystroke.

**E5. Why is `<div onClick>` worse than `<button>` for a clickable action?**
> `<div>` isn't keyboard-focusable or operable via Enter/Space by default and announces no meaningful role to screen readers - all of that would need to be manually re-implemented (`tabIndex`, key handlers, `role="button"`), whereas `<button>` provides it natively.

**E6. What's the default `type` of a `<button>` inside a `<form>`, and what bug results from forgetting it?**
> Defaults to `type="submit"`. A "cancel" or "toggle" button without an explicit `type="button"` will unintentionally submit the form when clicked.

**E7. `justify-content` vs `align-items` in Flexbox?**
> `justify-content` aligns children along the main axis (defined by `flex-direction`); `align-items` aligns them along the cross axis.

**E8. When would you choose Grid over Flexbox?**
> When the layout is genuinely two-dimensional - coordinating rows and columns together (page shells, dashboards, card grids) - versus Flexbox's one-dimensional row-or-column model.

**E9. How do you keep Tailwind utility strings maintainable as components grow?**
> Extract a React component once a utility combination repeats or grows unwieldy (preferred, keeps style co-located with the component); reserve `@apply` for cases where a component wrapper isn't practical, like shared non-component markup.

**E10. What's the "first rule of ARIA"?**
> No ARIA is better than bad ARIA - prefer native semantic HTML first, and only add ARIA roles/attributes to fill gaps native elements can't cover, since incorrect ARIA can actively make an experience worse for assistive technology users than having none at all.

---
