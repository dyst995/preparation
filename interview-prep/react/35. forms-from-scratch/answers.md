# Building a Form from Scratch — Answers

## Core recall

1. `values`, `errors`, `isSubmitting`, `submitError` (or equivalent).  
2. Stop native full-page form navigation; keep it an SPA async submit.  
3. Read `e.target.name` + `value` and update `values[name]`.  
4. An object of field → message for failures (empty object if valid).  
5. Field = client (or mapped field) validation; submitError = request/server failure for the whole submit.  
6. Disables browser’s built-in constraint validation UI so your JS owns it.  
7. `disabled={isSubmitting}` on the submit control.  
8. Clears the flag on both success and failure so the user can retry.

## Explain why

1. Different sources/meanings; conflating them confuses UX and retry logic.  
2. Disable covers clicks; guard covers Enter/races/other triggers; together they’re safer.  
3. Touched, schemas, cross-field, conditionals, re-renders — boilerplate and bugs multiply.  
4. Always merge from latest state; safer under batched/rapid updates.  
5. Assistive tech associates the message with the control.  
6. Without `name`, computed key is wrong/`undefined` and fields collide or don’t update.

## Compare and contrast

1. **Field error:** specific input. **submitError:** whole-form/API failure.  
2. **Submit:** one gate. **Change:** continuous feedback (can be noisy).  
3. **Hand-rolled:** you own all state/pipeline. **Library:** same model, less wiring/perf help.  
4. **Disabled:** UX + most doubles. **Ref lock:** synchronous mutex against stale state races.  
5. **Native:** browser messages/attributes. **JS + noValidate:** custom rules/UX/control.

## Predict / diagnose

1. Duplicate API calls / duplicate records.  
2. Updates `values['undefined']` or wrong key — email state won’t track.  
3. **Yes** — stuck disabled/pending if you only set false on success.  
4. **No** — early return after `setErrors`.

## Debugging

1. Missing submit lock / disable during in-flight.  
2. `preventDefault` missing on submit handler.  
3. No `role="alert"` / live region / `aria-describedby` link.  
4. Password input has `name`; email missing or mismatched `name`.

## Application

1. `values.confirmPassword`; in `validate`, if `vals.password !== vals.confirmPassword` set `errs.confirmPassword`.  
2. First lines after `preventDefault`: `if (isSubmitting) return;` then proceed.  
3. Paraphrase preserved answer — flag, disable, guard, `finally`.  
4. `aria-invalid="true"`, `aria-describedby="email-error"`, error `id="email-error"` `role="alert"`.

## Interview questions

1. **Spoken:** `isSubmitting` true at start, disable button, early return if already submitting, clear in `finally`. Production form: values/errors/submitting/submitError (+ touched as needed). Library when many fields/schemas/cross-field/perf.  
2. **Spoken:** preventDefault → validate → set errors → abort or set submitting → API → catch submitError → finally clear submitting.  
3. **Spoken:** Catch response; map field errors into `errors`; generic message into `submitError`; keep submitting cleared in `finally`.  
4. **Spoken:** labels with htmlFor/id; aria-invalid; aria-describedby to error id; role=alert or live region.

## Connections

1. `values` + `value`/`onChange` are the controlled pattern at form scale.  
2. Immediate disable/pending text = instant feedback while network runs.  
3. Same state machine; library removes repetitive wiring and often reduces re-renders.  
4. Optimistic UI still needs an in-flight lock so you don’t fire two optimistics; rollback must stay consistent with submit guards.
