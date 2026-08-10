# 04. HTML semantics - why it's not just "best practice"

> Source: `interview-prep/react/05-forms-ui-css.md`

### Semantic vs non-semantic elements

```html
<!-- Non-semantic: a div soup that LOOKS like a button/nav but isn't one to assistive tech or the browser -->
<div class="button" onclick="submit()">Submit</div>
<div class="nav">...</div>

<!-- Semantic: conveys meaning and behavior for free -->
<button onclick="submit()">Submit</button>
<nav>...</nav>
```

### Concrete costs of non-semantic markup

- **`<div onClick>` is not keyboard-accessible by default** - it doesn't receive focus via Tab, doesn't respond to Enter/Space, and has no default `role` announced to screen readers. A real `<button>` gets all of this natively, free, with zero extra code.
- **Screen readers rely on semantics** to announce element purpose ("button," "navigation landmark," "heading level 2") - a `<div>` announces as nothing meaningful.
- **SEO and browser features** - `<nav>`, `<main>`, `<header>`, `<footer>`, heading hierarchy (`<h1>`-`<h6>`) inform search engines and browser "reader mode"/outline features.
- **Form semantics** - `<label>`/`<input>` association (via `htmlFor`/`id`, or wrapping) lets clicking the label focus the input and lets screen readers announce the field's purpose; a `<button type="submit">` inside a `<form>` gets Enter-to-submit behavior for free.

### `<button type="button">` vs default

Inside a `<form>`, a `<button>` with no `type` attribute defaults to `type="submit"` - a very common bug source where a "cancel" or "toggle" button inside a form accidentally submits it. Always be explicit: `type="button"` for non-submit buttons inside forms.

### Interview question

**Q: Why does semantic HTML matter beyond "it's cleaner"?**

> "It's functional, not just stylistic. A `<div onClick>` isn't keyboard-focusable or operable via Enter/Space by default, and announces nothing meaningful to screen readers - you'd have to manually re-implement `tabIndex`, keyboard handlers, and ARIA roles to match what a real `<button>` gives you for free. Semantic elements like `<nav>`, `<main>`, heading hierarchy, and proper `<label>`/`<input>` association also drive assistive technology navigation, browser reader modes, and SEO. Defaulting to semantic elements first, and only reaching for `<div>`/`<span>` plus ARIA when there's genuinely no matching native element, avoids re-implementing browser behavior worse than the browser already does it."

---
