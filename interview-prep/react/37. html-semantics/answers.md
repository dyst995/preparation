# HTML Semantics — Answers

## Core recall

1. Choose elements for meaning/built-in behavior, not only appearance.  
2. Not focusable/operable by keyboard by default; weak/no button semantics for AT.  
3. Tab focus, Enter/Space, button role/name pattern, disabled behavior, form participation when typed correctly.  
4. e.g. `nav` navigation, `main` primary content, `header`/`footer` page regions (any three).  
5. `submit`.  
6. Clicking label focuses field; AT announces the accessible name.  
7. Navigate → link; in-page action → button.  
8. Prefer native elements over ARIA on generic elements when a native exists.

## Explain why

1. It changes keyboard, AT, SEO, and form behavior — not just markup taste.  
2. Div isn’t focusable or key-activatable as a button without those additions.  
3. Default submit type → button activates form submit.  
4. Keep free behavior; visuals are CSS’s job.  
5. Landmark navigation / skip to regions; divs don’t expose that structure.  
6. Fake navigation — poor AT/URL/middle-click semantics; usually should be a button or real href.

## Compare and contrast

1. **button:** native behavior. **div+role:** you must supply focus/keys/states — fragile.  
2. **a:** navigation semantics/URL. **button:** actions, no href navigation model.  
3. **nav:** landmark. **div:** generic container.  
4. **Outline:** document structure for AT/SEO. **Visual-only:** wrong level harms outline.  
5. **Native:** free correct defaults. **ARIA:** additive/repair — easy to incomplete.

## Predict / choose

1. `type="button"`.  
2. `<a href>` / router Link.  
3. `<button type="button">`.  
4. `<main>`.

## Debugging

1. Cancel button defaulted to `type="submit"` (or shares submit path).  
2. Use `<button>` (or full ARIA keyboard button pattern).  
3. Proper `<label>` association (`htmlFor`/wrap).  
4. Use real headings/landmarks instead of styled divs only.

## Application

1. `<nav>…</nav>`, `<button type="submit">` or appropriate button.  
2.
```jsx
<button type="button" onClick={onCancel}>Cancel</button>
<button type="submit">Save</button>
```

3. Paraphrase preserved interview answer.  
4. `role="button"`, `tabIndex={0}`, onKeyDown Enter/Space, accessible name — still worse than `<button>`.

## Interview questions

1. **Spoken:** Functional — keyboard, AT, SEO/reader, forms. Div-click isn’t a button; native first. Explicit `type="button"` vs submit in forms.  
2. **Spoken:** ARIA when no native element fits; never as first choice to replace button/link/label.  
3. **Spoken:** Larger hit target + accessible name binding for inputs.  
4. **Spoken:** Link (card as link or link inside card) so URL/open-in-new-tab work.

## Connections

1. Labels are semantic association — same “use the platform” theme.  
2. Accidental submit fires handlers/validation/API like a real submit — same class of bugs as missing submit guards.  
3. Design systems should export styled `Button`/`Link` primitives, not divs with click handlers.  
4. Landmarks make large pages navigable without hunting through all content linearly.
