# HTML Semantics — Why It’s Not Just “Best Practice”

## What you need to know

**Semantic HTML** means choosing elements for their **meaning and built-in behavior**, not only their default look. A `<button>` is a button to the browser, keyboard, and assistive tech. A `<div className="button">` is a generic box that *looks* like a button only if CSS says so.

This is **functional**: accessibility, keyboard UX, forms, SEO/reader mode — not aesthetics.

Rule of thumb: **native element first**; use `<div>`/`<span>` + ARIA only when no suitable native element exists (and then you must re-implement focus, keys, and roles carefully).

Prerequisites: [forms from scratch — a11y wiring](../35.%20forms-from-scratch/notes.md).

---

## Semantic vs non-semantic (preserved)

```html
<!-- Non-semantic: looks interactive; isn’t, to AT / keyboard / browser -->
<div class="button" onclick="submit()">Submit</div>
<div class="nav">...</div>

<!-- Semantic: meaning + behavior for free -->
<button type="submit">Submit</button>
<nav>...</nav>
```

| Non-semantic | Prefer |
| --- | --- |
| `<div onClick>` “button” | `<button>` |
| `<div class="nav">` | `<nav>` |
| `<div class="title">` as page title | `<h1>`–`<h6>` hierarchy |
| `<span onClick>` link | `<a href>` |
| Naked text “label” | `<label htmlFor>` |

In React: same idea — `<button onClick={...}>`, not `<div onClick={...}>`, unless you have a rare custom widget and full ARIA keyboard support.

---

## Concrete costs of non-semantic markup (preserved)

### 1. Keyboard accessibility

`<div onClick>` by default:

- Not in **Tab** order  
- No **Enter/Space** activation  
- No button **role** for free  

A real `<button>` gets focus, Enter/Space, and disabled semantics. To fake it you need at least `role="button"`, `tabIndex={0}`, key handlers, and often more — easy to get wrong.

### 2. Screen readers

AT announces roles/names: “button, Submit”, “navigation”, “heading level 2”. A `<div>` is often silence or “group” with no purpose. Landmarks (`<main>`, `<nav>`, `<header>`, `<footer>`) let users jump by region.

### 3. SEO and browser features

`<nav>`, `<main>`, headings feed outlines, reader modes, and search understanding. Div soup gives crawlers and outlines less structure.

### 4. Form semantics

- `<label>` + `htmlFor`/`id` (or wrap control): click label focuses input; SR announces name.  
- `<button type="submit">` inside `<form>`: **Enter** in a field submits.  
- `<input type="submit">` / proper submit control participates in form behavior.  

Fake buttons outside this model break expectations.

---

## Landmarks and document outline (interview depth)

Common landmarks:

| Element | Role |
| --- | --- |
| `<header>` | Banner / intro for page or section |
| `<nav>` | Navigation links |
| `<main>` | Primary content (one per page) |
| `<aside>` | Complementary |
| `<footer>` | Footer info |

Headings should nest meaningfully (`h1` → `h2` → …), not skip levels for visual size (use CSS for size). Multiple `h1`s are debated; a clear outline matters more than dogma — don’t use `h3` only because it’s “the small bold style.”

---

## `<button type="button">` vs default (preserved)

Inside a `<form>`, `<button>` with **no `type`** defaults to **`type="submit"`**.

```jsx
<form onSubmit={handleSave}>
  <button type="button" onClick={toggleAdvanced}>
    Advanced
  </button>
  <button type="submit">Save</button>
</form>
```

Cancel / icon / toggle buttons that omit `type` accidentally submit → validate/API fire. **Always be explicit:** `type="button"` for non-submit controls inside forms; `type="submit"` for the real submit.

---

## Links vs buttons

| Use | Element |
| --- | --- |
| Navigate to a URL / route | `<a href>` (or router `Link` that renders an anchor) |
| Perform an action on this page | `<button>` |

`<a onClick={doAction} href="#">` and `<div role="link">` are common anti-patterns. Wrong element → wrong expectations (middle-click, copy URL, AT announcement).

---

## First rule of ARIA (related)

> Don’t use ARIA to fix bad HTML if a native element already does the job.

`role="button"` on a div is a fallback, not a preferred architecture. Semantic HTML prevents a class of a11y bugs.

---

## Interview answer (preserved)

**Q: Why does semantic HTML matter beyond "it's cleaner"?**

> “It’s functional, not just stylistic. A `<div onClick>` isn’t keyboard-focusable or operable via Enter/Space by default, and announces nothing meaningful to screen readers — you’d have to manually re-implement `tabIndex`, keyboard handlers, and ARIA roles to match what a real `<button>` gives you for free. Semantic elements like `<nav>`, `<main>`, heading hierarchy, and proper `<label>`/`<input>` association also drive assistive technology navigation, browser reader modes, and SEO. Defaulting to semantic elements first, and only reaching for `<div>`/`<span>` plus ARIA when there’s genuinely no matching native element, avoids re-implementing browser behavior worse than the browser already does it.”

---

## Common mistakes and misconceptions

1. Div/span click handlers as buttons.  
2. Omitting `type` on buttons inside forms.  
3. Using heading levels for font size only.  
4. “ARIA makes any div accessible” without keyboard support.  
5. Clickable cards that aren’t links or buttons and aren’t keyboard operable.  
6. Label text not associated with inputs.  
7. Treating semantics as optional polish for “a11y phase later.”

---

## Connections to other concepts

```
native <button> / <a> / <label>
  → free keyboard + AT behavior

div onClick
  → must rebuild that behavior (usually worse)

form submit defaults
  → button type matters

forms-from-scratch a11y
  → labels, aria-invalid sit on top of good semantics

CSS
  → restyle buttons/links; don’t replace the element
```

---

## Interview perspective

Be ready to:

1. Functional case for semantics (keyboard, AT, SEO, forms).  
2. Why div-buttons are insufficient.  
3. `type="button"` gotcha.  
4. Link vs button.  
5. Native first, ARIA second.

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
