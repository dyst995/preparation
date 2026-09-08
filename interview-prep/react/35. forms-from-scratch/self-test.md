# Building a Form from Scratch — Full Mental Model — Self-test

## Core recall

1. Name four pieces of state a typical hand-rolled form tracks.
2. Why call `e.preventDefault()` on submit?
3. How does one `handleChange` serve many fields?
4. What does `validate` return in the example pattern?
5. Field errors vs `submitError` — difference?
6. What does `noValidate` do on `<form>`?
7. Minimal double-submit UI fix?
8. Why reset `isSubmitting` in `finally`?

## Explain why

1. Why separate client validation errors from server submit errors?
2. Why disable the button *and* guard the handler?
3. Why does scaling to 15 fields push teams to libraries?
4. Why use functional `setValues(v => ({...v, [name]: value}))`?
5. Why wire `aria-describedby` to the error paragraph’s `id`?
6. Why is `name` required for the shared change handler pattern?

## Compare and contrast

1. `errors.email` vs `submitError`  
2. Validate on submit vs on change  
3. Hand-rolled form vs form library (responsibility split)  
4. `disabled={isSubmitting}` vs `useRef` in-flight lock  
5. Native HTML validation vs JS `validate` + `noValidate`  

## Predict / diagnose

1. Double-click submit with no `isSubmitting` — risk?  
2. `handleChange` but input missing `name="email"` — what happens to state?  
3. API throws; no `finally` — button stuck?  
4. Validation fails; do you still call `submitSignup` in the example?

## Debugging

1. Duplicate user accounts from one signup form. Likely cause?  
2. Form full-page refreshes on submit. Missing what?  
3. Screen reader doesn’t announce password error. What’s likely missing?  
4. `values.password` updates but email never changes; both use shared handler. Check what?

## Application

1. Add a `confirmPassword` field and cross-field validation to the mental model.  
2. Extend `handleSubmit` with an early `if (isSubmitting) return`.  
3. Spoken: prevent double submit.  
4. List a11y attributes you’d put on an invalid email input + its error.

## Interview questions

1. How do you prevent a form from being submitted twice?  
   - Follow-up: What state does a production signup form need?  
   - Follow-up: When do you reach for a form library?
2. Walk through your submit handler step by step.  
3. How do you handle server-side validation errors in the UI?  
4. How do you make field errors accessible?

## Connections

1. How does this build on controlled inputs?
2. How does `isSubmitting` relate to perceived performance?
3. How does this section motivate React Hook Form?
4. How do optimistic UI patterns interact with submit locking? (careful)
