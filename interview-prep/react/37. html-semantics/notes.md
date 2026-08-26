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

# Self-test

## Core recall

1. What does “semantic HTML” mean in practice?
2. Why is `<div onClick>` a poor button?
3. What does a real `<button>` give you for free?
4. Name three landmark-ish elements and their purpose.
5. Default `type` of `<button>` inside a `<form>`?
6. Why associate `<label>` with `<input>`?
7. Link vs button — rule of thumb?
8. What is the “first rule of ARIA” in one line?

## Explain why

1. Why is semantics “functional, not stylistic”?
2. Why do you need `tabIndex` and key handlers on a div-button?
3. Why does omitting button `type` cause accidental submits?
4. Why use CSS to style a `<button>` instead of swapping to a div?
5. Why do screen reader users care about `<nav>` / `<main>`?
6. Why is `href="#"` + preventDefault a weak “link”?

## Compare and contrast

1. `<button>` vs `<div role="button">`  
2. `<a href>` vs `<button>` for navigation  
3. Semantic `<nav>` vs `<div className="nav">`  
4. Heading for outline vs heading for visual size only  
5. Native semantics vs bolting on ARIA  

## Predict / choose

1. Cancel control inside `<form>` — `type`?  
2. “Read more” goes to `/article/1` — `a` or `button`?  
3. Custom open-modal control — `button` or `div`?  
4. Page primary content wrapper — `main` or `div`?

## Debugging

1. Pressing Enter in an input unexpectedly runs cancel’s onClick path that also submits. Cause?  
2. Keyboard users can’t reach “Save” styled as a div. Fix?  
3. SR user hears unlabeled edit fields. Missing what?  
4. SEO/outline tools show no structure — site is all divs with CSS headings. Issue?

## Application

1. Rewrite a div.nav + div.button soup into semantic HTML.  
2. Write a form footer with Cancel (`type="button"`) and Save (`type="submit"`).  
3. Spoken: why semantic HTML beyond cleanliness.  
4. List what you’d add if forced to keep a div as a button (and why you’d rather not).

## Interview questions

1. Why does semantic HTML matter beyond "it's cleaner"?  
   - Follow-up: div onClick vs button?  
   - Follow-up: button types in forms?
2. When is ARIA appropriate vs native HTML?  
3. How do labels improve both UX and a11y?  
4. Link or button for a card that opens a detail URL?

## Connections

1. How does this reinforce form label/`htmlFor` practice from forms-from-scratch?
2. How does accidental submit relate to double-submit / form handlers?
3. How does “restyle don’t replace” connect to design systems?
4. How do landmarks relate to perceived usability for AT users?
