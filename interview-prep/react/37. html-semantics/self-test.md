# HTML Semantics — Why It’s Not Just “Best Practice” — Self-test

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
