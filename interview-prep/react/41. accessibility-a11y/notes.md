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

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
