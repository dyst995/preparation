# Accessibility (a11y) Basics

## What you need to know

**Accessibility** means people can use your UI regardless of ability — keyboard-only, screen reader, low vision, color vision deficiency, motor impairment, etc.

In React interviews, a11y is not a niche add-on: it’s how you choose **elements**, **names**, **focus**, **contrast**, and **ARIA** when native HTML isn’t enough.

**First principle:** prefer **semantic HTML**; ARIA fills gaps. Bad ARIA is worse than none.

Prerequisites: [HTML semantics](../37.%20html-semantics/notes.md), [forms from scratch](../35.%20forms-from-scratch/notes.md).

---

## Baseline checklist (preserved)

- [ ] Every `<img>` has meaningful `alt` (or `alt=""` if decorative).  
- [ ] Every form input has an associated `<label>` (`htmlFor`/`id` or wrap).  
- [ ] Interactive controls are `<button>` / `<a href>` when possible — not `<div onClick>`.  
- [ ] Custom widgets: correct `role`, keyboard operable (`tabIndex`, Enter/Space/arrows as required), focus managed.  
- [ ] Color is never the **only** cue (errors: text/icon too, not only red).  
- [ ] Contrast: WCAG AA common bar — **4.5:1** normal text.  
- [ ] Focus visible — don’t kill `outline` without a clear replacement.  
- [ ] Modals: **trap focus** while open; **return focus** to trigger on close.  
- [ ] Live regions (`aria-live`, `role="alert"` / `status`) announce dynamic updates (errors, toasts) without moving focus.

Treat this as a pre-PR mental checklist for interactive UI.

---

## Why each checklist item exists (mechanism)

| Item | Failure mode |
| --- | --- |
| `alt` | Blind users get no image meaning; empty decorative noise if undecorated images lack `alt=""` |
| Labels | SR announces “edit text” with no purpose; small click targets |
| Semantic controls | No keyboard path; wrong/missing role |
| Custom roles + keys | Div “widgets” that only work with a mouse |
| Color-only | Colorblind users miss state |
| Contrast | Low-vision users can’t read |
| Focus ring | Keyboard users lose their place |
| Modal focus | Tab escapes to background; focus lost on close |
| Live regions | Errors appear visually but SR never hears them |

---

## The first rule of ARIA (preserved)

> “No ARIA is better than bad ARIA.” Prefer native HTML; add ARIA only for gaps (custom combobox, tabs, modal pattern, etc.).

Bad ARIA examples: `role="button"` without keyboard support; wrong `role` that lies to AT; `aria-hidden` on focusable content.

**Native first** → less code and fewer bugs than hand-rolled APG patterns.

---

## Common ARIA attributes (preserved)

| Attribute | Purpose |
| --- | --- |
| `aria-label` | Accessible name when there’s no visible text (icon-only button) |
| `aria-labelledby` | Name comes from another element’s `id` |
| `aria-describedby` | Extra description (e.g. error message id) |
| `aria-invalid` | Field currently invalid |
| `aria-hidden="true"` | Hide decorative content from AT (not on focusable controls!) |
| `aria-expanded` | Disclosure/accordion/menu open state |
| `role="alert"` | Assertive announcement when content appears (errors) |
| `role="status"` | Polite announcement (“Saved”) |
| `role="dialog"` + `aria-modal="true"` | Custom modal identity (+ you still implement focus trap) |

**Accessible name** priority (simplified): visible label / `aria-labelledby` / `aria-label` / text content — know that icon buttons need an explicit name.

`alert` vs `status`: assertive vs polite — don’t `alert` every toast or you interrupt constantly.

---

## Focus management — custom modal (preserved)

```jsx
function Modal({ isOpen, onClose, children }) {
  const dialogRef = useRef(null);
  const previouslyFocused = useRef(null);

  useEffect(() => {
    if (isOpen) {
      previouslyFocused.current = document.activeElement;
      dialogRef.current?.focus();
    } else {
      previouslyFocused.current?.focus(); // return focus to trigger
    }
  }, [isOpen]);

  if (!isOpen) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      ref={dialogRef}
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      {children}
    </div>
  );
}
```

What this demonstrates:

1. Save **previously focused** element.  
2. Move focus **into** the dialog on open (`tabIndex={-1}` allows programmatic focus).  
3. **Escape** closes.  
4. On close, **restore** focus to the trigger.

**Still required for production:** a real **focus trap** (Tab cycles inside dialog; doesn’t leak to `body`), `aria-labelledby` for dialog title, inert/aria-hiding background. Prefer tested libraries (`react-aria`, Radix, Headless UI) for full APG compliance — interviews want you to **know the requirements**, not necessarily hand-roll a perfect trap cold.

---

## Custom dropdown interview answer (preserved)

**Q: A designer hands you a custom dropdown built entirely from `<div>`s. What accessibility work is needed?**

> “First I’d push back and check whether a native `<select>` (possibly styled) actually meets the design — native elements handle most of this for free. If a custom implementation is genuinely required, it needs a `role` matching its behavior (e.g., `listbox`/`combobox` patterns from the ARIA Authoring Practices), keyboard support (arrow keys to navigate options, Enter/Space to select, Escape to close), visible focus indicators, `aria-expanded` on the trigger, and correctly managed programmatic focus — moving focus into the option list when opened and back to the trigger when closed. This is meaningfully more work than a native element, which is exactly why I default to native HTML first and only build custom widgets when there’s no equivalent.”

---

## Testing habits (interview-level)

- Keyboard-only pass: Tab, Shift+Tab, Enter, Space, Escape, arrows where relevant.  
- Check focus visibility.  
- Spot-check with a screen reader on critical flows (form errors, modal).  
- Automated tools (axe, eslint-plugin-jsx-a11y) catch some issues — not keyboard logic or focus traps.

---

## Common mistakes and misconceptions

1. `outline: none` with no focus style.  
2. `div onClick` as a button.  
3. Icon button with no accessible name.  
4. `aria-hidden` on a focusable element.  
5. Red border only for errors.  
6. Modal without focus return / trap.  
7. Sprinkling ARIA to “make a11y pass” without matching behavior.  
8. Assuming axe green = fully accessible.

---

## Connections to other concepts

```
semantic HTML
  → free roles/keyboard for buttons/links/labels

forms
  → label, aria-invalid, aria-describedby, role="alert"

modals / custom widgets
  → focus store/restore + trap + APG roles

color / Tailwind
  → contrast tokens; don’t rely on color alone
```

---

## Interview perspective

Be ready to:

1. Recite the baseline checklist highlights.  
2. First rule of ARIA.  
3. Custom dropdown answer (native first + full keyboard/ARIA list).  
4. Modal focus open/close behavior.  
5. `aria-label` vs `labelledby` vs `describedby`.  
6. alert vs status.

---

# Self-test

## Core recall

1. What is the first rule of ARIA?
2. Name five items from the interactive UI a11y checklist.
3. What contrast ratio is the common WCAG AA baseline for normal text?
4. What does `aria-describedby` do on a form field?
5. `role="alert"` vs `role="status"`?
6. What must a modal do with focus on open and close?
7. When is `alt=""` correct?
8. What does `aria-expanded` communicate?

## Explain why

1. Why is bad ARIA worse than no ARIA?
2. Why push for native `<select>` before a div dropdown?
3. Why can’t color alone indicate errors?
4. Why restore focus to the trigger when a modal closes?
5. Why do live regions matter for form errors?
6. Why is removing outline without a replacement a keyboard bug?

## Compare and contrast

1. Native `<button>` vs `div` + `role="button"`  
2. `aria-label` vs `aria-labelledby`  
3. `aria-invalid` + visible error vs color-only error  
4. Assertive `alert` vs polite `status`  
5. Automated axe scan vs keyboard testing  

## Predict / choose

1. Icon-only close control — what a11y attribute is essential?  
2. “Saved successfully” toast — `alert` or `status` more often?  
3. Decorative divider image — `alt` value?  
4. Custom combobox required by design — where do you look for the interaction pattern?

## Debugging

1. Keyboard users tab “behind” an open modal into the page. Missing what?  
2. SR doesn’t announce submit error text that appeared visually. Likely gap?  
3. Icon button announced as “button” with no name. Fix?  
4. Custom dropdown only works with mouse clicks. What’s incomplete?

## Application

1. Wire an invalid email input with `aria-invalid` + `aria-describedby` + error id.  
2. List keyboard keys you’d implement for a custom listbox-style dropdown.  
3. Spoken: designer’s div dropdown — what a11y work?  
4. Extend the modal sketch: what else would you add beyond the sample?

## Interview questions

1. A designer hands you a custom dropdown built entirely from `<div>`s. What accessibility work is needed?  
   - Follow-up: First rule of ARIA?  
   - Follow-up: How do you handle modal focus?
2. How do you make forms accessible?  
3. What is an accessible name?  
4. How do you test a11y in a PR?

## Connections

1. How does this unit build on HTML semantics?
2. How do form `role="alert"` errors connect to forms-from-scratch?
3. How does focus management relate to React `useRef`/`useEffect`?
4. How do design-system components (Radix/react-aria) change the “build vs buy” a11y decision?
