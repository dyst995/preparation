# 03. Form libraries - what they actually buy you

> Source: `interview-prep/react/05-forms-ui-css.md`

### React Hook Form (most common pairing with your stack)

Core idea: uses **uncontrolled inputs internally via refs**, so typing does **not** trigger a re-render of the form component on every keystroke - a deliberate performance-first design, in contrast to older controlled-everything approaches (like classic Formik, which re-renders on every field change by default).

```jsx
import { useForm } from 'react-hook-form';

function SignupForm() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();

  async function onSubmit(data) {
    await submitSignup(data);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('email', { required: 'Email is required', pattern: { value: /@/, message: 'Invalid email' } })} />
      {errors.email && <p role="alert">{errors.email.message}</p>}

      <input type="password" {...register('password', { minLength: { value: 8, message: 'Min 8 characters' } })} />
      {errors.password && <p role="alert">{errors.password.message}</p>}

      <button disabled={isSubmitting}>Submit</button>
    </form>
  );
}
```

`register('email', {...})` wires the input to RHF's internal (ref-based) tracking and validation rules, without your component re-rendering per keystroke - only re-rendering when something you actually subscribe to (like `errors` or `isSubmitting`) changes.

### What form libraries solve in general

| Problem | Hand-rolled cost | Library solution |
|---|---|---|
| Per-keystroke re-renders on large forms | Real cost with controlled inputs at scale | Ref-based/uncontrolled tracking (RHF) avoids this by default |
| Validation (sync/async, cross-field, schema-based) | Hand-written, easy to get inconsistent across fields | Schema integration (Zod/Yup) plugged in via a resolver |
| Field arrays (dynamic add/remove rows) | Fiddly key/index management | `useFieldArray` and similar utilities |
| Touched/dirty/submission state per field | Manual bookkeeping per field | Built into `formState` |
| Accessibility wiring | Manual `aria-*`/`htmlFor` per field | Some libraries provide it or make it easy to standardize centrally |

### Schema validation integration (Zod example)

```jsx
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Min 8 characters'),
});

const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(schema),
});
```

This centralizes validation rules in one typed schema shared potentially with the backend/API contract, instead of scattering ad hoc rules across `register()` calls.

### Interview question

**Q: Why would you reach for React Hook Form instead of hand-rolling a form?**

> "Mainly performance and reduced boilerplate at scale. RHF tracks inputs via refs rather than controlled state, so typing doesn't trigger a re-render of the whole form component - that matters a lot on large forms. It also centralizes validation (including schema-based validation via Zod/Yup resolvers), touched/dirty/error state per field, and utilities like field arrays for dynamic rows, all of which I'd otherwise hand-roll and re-verify for consistency across every form in the app. For a two-field login form, hand-rolling is often fine; for anything with 10+ fields, conditional fields, or dynamic arrays, a library pays for itself quickly."

---
