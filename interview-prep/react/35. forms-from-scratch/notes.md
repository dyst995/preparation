# Building a Form from Scratch — Full Mental Model

## What you need to know

A hand-rolled controlled form is more than `useState` + inputs. At minimum you usually track:

| State | Role |
| --- | --- |
| **values** | Field data (object keyed by `name`) |
| **errors** | Per-field validation messages |
| **isSubmitting** | In-flight submit (disable UI, block doubles) |
| **submitError** | Server/network failure message |

Plus: shared `handleChange`, `validate`, `preventDefault`, a11y wiring, and a clear submit pipeline.

This model is what form libraries automate. Knowing it explains *why* RHF/Formik exist and how to interview without a library.

Prerequisites: [controlled vs uncontrolled](../34.%20controlled-vs-uncontrolled/notes.md), [perceived performance — instant feedback](../33.%20perceived-performance/notes.md).

---

## The canonical example (preserved)

```jsx
function SignupForm() {
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  function validate(vals) {
    const errs = {};
    if (!vals.email.includes('@')) errs.email = 'Enter a valid email';
    if (vals.password.length < 8) errs.password = 'Password must be at least 8 characters';
    return errs;
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setValues((v) => ({ ...v, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validationErrors = validate(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await submitSignup(values);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <label htmlFor="email">Email</label>
      <input
        id="email"
        name="email"
        type="email"
        value={values.email}
        onChange={handleChange}
        aria-invalid={!!errors.email}
        aria-describedby={errors.email ? 'email-error' : undefined}
      />
      {errors.email && (
        <p id="email-error" role="alert">
          {errors.email}
        </p>
      )}

      <label htmlFor="password">Password</label>
      <input
        id="password"
        name="password"
        type="password"
        value={values.password}
        onChange={handleChange}
        aria-invalid={!!errors.password}
        aria-describedby={errors.password ? 'password-error' : undefined}
      />
      {errors.password && (
        <p id="password-error" role="alert">
          {errors.password}
        </p>
      )}

      {submitError && <p role="alert">{submitError}</p>}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Signing up...' : 'Sign up'}
      </button>
    </form>
  );
}
```

---

## Submit pipeline (mental model)

```text
submit event
  → preventDefault (no full page reload)
  → validate(values) → setErrors
  → if errors → stop
  → isSubmitting = true, clear submitError
  → await API
  → on failure → submitError
  → finally → isSubmitting = false
```

**Field errors** ≠ **submit errors**: one is client validation; the other is server/network. Keep them separate so a 500 doesn’t look like “invalid email.”

`noValidate` opts out of native browser validation bubbles when you own validation in JS (optional; some teams keep native + enhance).

---

## Shared `handleChange` via `name`

```jsx
function handleChange(e) {
  const { name, value } = e.target;
  setValues((v) => ({ ...v, [name]: value }));
}
```

Every input needs a matching **`name`** (and usually `id` + `htmlFor` for labels). One handler scales to N fields; avoid `onChange={(e) => setEmail(e.target.value)}` × 15 unless fields are special-cased (checkboxes use `checked`, files use `files`).

Functional update `{ ...v, [name]: value }` avoids stale state if updates batch oddly.

For checkboxes:

```jsx
setValues((v) => ({ ...v, [name]: e.target.checked }));
```

---

## Validation layers

| Layer | When | Example |
| --- | --- | --- |
| **On submit** | Canonical baseline | `validate(values)` before API |
| **On blur** | Better UX for long forms | Mark field touched, show that field’s error |
| **On change** | Live feedback | Debounce expensive checks; don’t yell on first keystroke always |
| **Server** | Source of truth for uniqueness etc. | Map API field errors into `errors` |

Cross-field rules (“password confirm matches”) live in `validate` reading multiple keys. Conditional fields: validate only if the section is active.

Libraries shine when you add touched maps, schemas (Zod/Yup), and async validators at scale.

---

## Accessibility wiring (don’t skip)

| Piece | Why |
| --- | --- |
| `<label htmlFor={id}>` + input `id` | Clickable label; SR association |
| `aria-invalid={!!errors.field}` | Exposes invalid state |
| `aria-describedby` → error `id` | Error message tied to control |
| `role="alert"` (or live region) | Announce errors when they appear |
| `disabled={isSubmitting}` + pending text | Clear busy state |

Interviewers notice a11y on forms — it’s free signal in a whiteboard form.

---

## Double-submit bug (preserved)

Fast double-click (or Enter + click race) can fire `handleSubmit` twice → duplicate records / charges.

**Minimal:** `disabled={isSubmitting}` on the submit button.

**Robust:** also guard the handler:

```jsx
async function handleSubmit(e) {
  e.preventDefault();
  if (isSubmitting) return; // bail if already in flight
  // ...
  setIsSubmitting(true);
  try {
    /* ... */
  } finally {
    setIsSubmitting(false);
  }
}
```

Caveat: `isSubmitting` from the closure might be stale in an edge race; a `useRef` lock is even tighter:

```jsx
const inFlight = useRef(false);
if (inFlight.current) return;
inFlight.current = true;
try {
  /* await ... */
} finally {
  inFlight.current = false;
  setIsSubmitting(false);
}
```

Reset in **`finally`** so success *and* failure clear the flag (preserved interview point).

---

## Why this becomes a library

Scale the example to 15 fields + cross-field rules + conditional sections + touched/dirty + schema → boilerplate explodes. Form libraries give:

- Field registration / less manual `name` wiring  
- Validation schemas  
- Fewer re-renders (often uncontrolled)  
- Submit helpers  

You still need the **same mental model** to debug them.

---

## Interview answer (preserved)

**Q: How do you prevent a form from being submitted twice?**

> “Track an `isSubmitting` flag in state, set it true at the start of the submit handler, disable the submit button while it’s true, and guard the top of the handler to bail out early if a submission is already in flight — covering both the disabled-button case and any other path that might trigger submission, like pressing Enter while a click is already processing. I reset it in a `finally` block so it clears whether the request succeeds or fails.”

---

## Common mistakes and misconceptions

1. Forgetting `preventDefault` → full page reload / lost SPA state.  
2. No double-submit guard.  
3. Putting server errors into the same bag without distinction.  
4. Missing `name` so shared `handleChange` writes `values.undefined`.  
5. Validating only with HTML5 while using `noValidate` inconsistently.  
6. Leaving `isSubmitting` true on error (no `finally`).  
7. No a11y link between errors and inputs.  
8. Rebuilding this for every 20-field form instead of a library when complexity warrants it.

---

## Connections to other concepts

```
controlled values object
  → single source of truth for fields

validate → errors
  → block submit / show field messages

isSubmitting
  → instant feedback + double-submit safety
  → perceived performance

label / aria-*
  → accessible forms

boilerplate growth
  → case for RHF / Formik
```

---

## Interview perspective

Be ready to:

1. List the state slices a real form needs.  
2. Walk submit pipeline aloud.  
3. Double-submit answer with `finally`.  
4. Sketch shared `handleChange` + `name`.  
5. Mention a11y attributes without being asked.  
6. Know when to stop hand-rolling.

---

# Self-test

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
