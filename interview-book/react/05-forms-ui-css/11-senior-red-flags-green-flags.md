# 11. Senior red flags / green flags

> Source: `interview-prep/react/05-forms-ui-css.md`

### Green flags interviewers love
- Precisely explaining *why* `<div onClick>` is worse than `<button>`, not just citing "best practice."
- Knowing the mechanism behind the controlled/uncontrolled warning, not just how to silence it.
- Reaching for Grid vs Flexbox based on dimensionality, not habit.
- Bringing up focus management/keyboard operability unprompted when discussing custom components.

### Red flags
- Using `<div onClick>` for all interactive elements without any keyboard/ARIA consideration.
- Not knowing why a "cancel" button inside a `<form>` needs `type="button"`.
- Treating accessibility as "add `alt` text and you're done."
- Writing Tailwind utility soup with no extraction strategy as forms/components grow, with no articulated opinion on when to extract.

---
