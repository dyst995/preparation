# Accessibility (a11y) Basics — Answers

## Core recall

1. Prefer native HTML; no ARIA is better than bad ARIA; use ARIA only for gaps.  
2. Any five: alt, labels, semantic controls, custom role/keyboard/focus, not color-only, contrast, visible focus, modal trap/return, live regions.  
3. 4.5:1.  
4. Points AT to extra descriptive content (often the error message element).  
5. **alert:** assertive/interrupt. **status:** polite/non-interrupt.  
6. Move focus into dialog on open; return focus to trigger on close (+ trap while open).  
7. Purely decorative images.  
8. Whether a collapsible/disclosure control is currently expanded/open.

## Explain why

1. Wrong roles/states lie to AT and can make UI less usable than plain HTML.  
2. Native gives keyboard, roles, and mobile UX for free; custom is a full APG project.  
3. Colorblind / low-vision users may not perceive the cue.  
4. Keyboard/SR users continue where they were; focus isn’t lost to `body`.  
5. Visual DOM updates aren’t automatically spoken without live regions/alerts.  
6. Keyboard users can’t see which control is active.

## Compare and contrast

1. **Native:** free behavior. **div+role:** you must implement keys/focus/states completely.  
2. **label:** string name on the element. **labelledby:** name from another node’s text.  
3. **Described invalid:** AT + everyone get the message. **Color-only:** excludes many users.  
4. **alert** urgent; **status** quiet updates.  
5. **axe:** quick automated gaps. **Keyboard:** real interaction/focus logic.

## Predict / choose

1. `aria-label` (or visually hidden text) — accessible name.  
2. **`status`** (usually).  
3. `alt=""`.  
4. ARIA Authoring Practices (APG) combobox/listbox pattern (or a compliant library).

## Debugging

1. Focus trap (and/or inert background).  
2. No live region / `role="alert"` / focus not moved to error.  
3. Add `aria-label` or visible/sr-only text.  
4. Keyboard handlers, roles, focus move, `aria-expanded`, etc.

## Application

1.
```jsx
<input
  id="email"
  aria-invalid={!!errors.email}
  aria-describedby={errors.email ? 'email-error' : undefined}
/>
{errors.email && <p id="email-error" role="alert">{errors.email}</p>}
```

2. Arrows between options, Enter/Space select, Escape close, typeahead optional; Tab per pattern.  
3. Paraphrase preserved dropdown answer — native first, then full APG work.  
4. Focus trap, labelled dialog title, hide background, initial focus to sensible control, restore trigger focus (sample already starts restore/escape).

## Interview questions

1. **Spoken:** Prefer native `<select>`; if custom — correct roles (listbox/combobox), arrows/Enter/Space/Escape, focus visible, `aria-expanded`, focus into list and back to trigger. First rule: native > ARIA. Modal: save focus, focus dialog, trap, escape, restore.  
2. **Spoken:** Labels, errors via describedby + invalid, semantic submit, announce errors, keyboard operable.  
3. **Spoken:** What AT reads as the control’s name — label text, aria-label, labelledby, or content.  
4. **Spoken:** Keyboard pass, focus visibility, critical SR check, eslint/axe — not only automation.

## Connections

1. Semantics supply the baseline roles/behavior a11y builds on.  
2. Same error wiring pattern from hand-rolled forms.  
3. Refs store dialog/trigger nodes; effects run focus moves on open/close.  
4. Buy compliant primitives when custom widgets are required — still must verify integration (labels, focus).
