# 08. Accessibility (a11y) basics

> Source: `interview-prep/react/05-forms-ui-css.md`

### The baseline checklist for any interactive UI

- [ ] Every `<img>` has meaningful `alt` text (or `alt=""` if purely decorative).
- [ ] Every form input has an associated `<label>` (via `htmlFor`/`id`, or wrapping).
- [ ] Interactive elements are real semantic elements (`<button>`, `<a href>`) wherever possible, not `<div onClick>`.
- [ ] Custom interactive components (built from `<div>`s because no native element fits) have the right `role`, are keyboard-operable (`tabIndex`, Enter/Space handling), and manage focus correctly.
- [ ] Color is never the *only* way information is conveyed (e.g., error states also have an icon/text, not just red color, for colorblind users).
- [ ] Sufficient color contrast between text and background (WCAG AA is the common baseline: 4.5:1 for normal text).
- [ ] Focus is visible (don't remove `outline` without providing a clear visible replacement focus style).
- [ ] Modals trap focus while open and return focus to the triggering element on close.
- [ ] Live regions (`aria-live`, `role="alert"`/`role="status"`) announce dynamic content changes (form errors, toast notifications) to screen readers without requiring focus to move there.

### ARIA - the first rule of ARIA

> "No ARIA is better than bad ARIA." Prefer native semantic HTML first; only add ARIA roles/attributes to fill gaps native HTML can't cover (e.g., a custom dropdown/combobox, a tab interface, a custom modal).

### Common ARIA attributes worth knowing

| Attribute | Purpose |
|---|---|
| `aria-label` | Accessible name for an element with no visible text (e.g., an icon-only button) |
| `aria-labelledby` | Points to another element's `id` to use as this element's accessible name |
| `aria-describedby` | Points to an element providing extra descriptive text (e.g., a field's error message) |
| `aria-invalid` | Marks a form field as currently invalid |
| `aria-hidden="true"` | Hides purely decorative content from assistive tech (e.g., a decorative icon next to a labeled button) |
| `aria-expanded` | Whether a collapsible/disclosure widget (accordion, dropdown) is currently open |
| `role="alert"` | Announces content immediately and assertively when it appears (form/submission errors) |
| `role="status"` | Announces content politely, without interrupting (e.g., "Saved" confirmation) |
| `role="dialog"` + `aria-modal="true"` | Identifies a custom modal for assistive tech, combined with manual focus trapping |

### Focus management example (custom modal)

```jsx
function Modal({ isOpen, onClose, children }) {
  const dialogRef = useRef(null);
  const previouslyFocused = useRef(null);

  useEffect(() => {
    if (isOpen) {
      previouslyFocused.current = document.activeElement;
      dialogRef.current?.focus();
    } else {
      previouslyFocused.current?.focus();   // return focus to the trigger on close
    }
  }, [isOpen]);

  if (!isOpen) return null;
  return (
    <div role="dialog" aria-modal="true" ref={dialogRef} tabIndex={-1} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}>
      {children}
    </div>
  );
}
```

### Interview question

**Q: A designer hands you a custom dropdown built entirely from `<div>`s. What accessibility work is needed?**

> "First I'd push back and check whether a native `<select>` (possibly styled) actually meets the design - native elements handle most of this for free. If a custom implementation is genuinely required, it needs a `role` matching its behavior (e.g., `listbox`/`combobox` patterns from the ARIA Authoring Practices), keyboard support (arrow keys to navigate options, Enter/Space to select, Escape to close), visible focus indicators, `aria-expanded` on the trigger, and correctly managed programmatic focus - moving focus into the option list when opened and back to the trigger when closed. This is meaningfully more work than a native element, which is exactly why I default to native HTML first and only build custom widgets when there's no equivalent."

---
