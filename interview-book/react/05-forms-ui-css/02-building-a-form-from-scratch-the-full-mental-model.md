# 02. Building a form from scratch - the full mental model

> Source: `interview-prep/react/05-forms-ui-css.md`

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
      {errors.email && <p id="email-error" role="alert">{errors.email}</p>}

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
      {errors.password && <p id="password-error" role="alert">{errors.password}</p>}

      {submitError && <p role="alert">{submitError}</p>}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Signing up...' : 'Sign up'}
      </button>
    </form>
  );
}
```

Notice what this hand-rolled example already needs: shared `handleChange` via `name` attribute, a validation function, error state per field, submission-in-flight state (to disable the button and prevent double-submits), submit-error state, and accessibility wiring (`htmlFor`/`id`, `aria-invalid`, `aria-describedby`, `role="alert"`). Scale this to 15 fields with cross-field validation and conditional fields, and the boilerplate becomes real - which is exactly the case for a form library.

### The double-submit bug (common, worth knowing by heart)

Without disabling the submit button (or otherwise guarding) during submission, a fast double-click fires `handleSubmit` twice, potentially creating duplicate server-side records. `disabled={isSubmitting}` above is the minimal fix; a more robust one also guards inside the handler itself (`if (isSubmitting) return;` at the top) in case disabling the button doesn't prevent the handler from being invoked via other paths (e.g., Enter key submission racing with a click).

### Interview question

**Q: How do you prevent a form from being submitted twice?**

> "Track an `isSubmitting` flag in state, set it true at the start of the submit handler, disable the submit button while it's true, and guard the top of the handler to bail out early if a submission is already in flight - covering both the disabled-button case and any other path that might trigger submission, like pressing Enter while a click is already processing. I reset it in a `finally` block so it clears whether the request succeeds or fails."

---
