# Accessibility (a11y) Basics — Self-test

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
