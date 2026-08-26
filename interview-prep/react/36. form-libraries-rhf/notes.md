# Form Libraries — What They Actually Buy You (React Hook Form)

## What you need to know

Form libraries replace the hand-rolled boilerplate from [forms from scratch](../35.%20forms-from-scratch/notes.md): values/errors/touched/submit state, validation, field arrays — with a consistent API.

**React Hook Form (RHF)** is the common modern default in many React stacks. Core design: **uncontrolled inputs via refs**, so **typing does not re-render** the whole form on every keystroke. Re-renders happen when you subscribe to something that changed (`errors`, `isSubmitting`, watched fields, etc.).

Contrast: classic **Formik**-style controlled forms often re-render on every field change by default — fine for small forms, painful at scale.

For a 2-field login, hand-rolling is fine. For 10+ fields, conditionals, schemas, dynamic rows — a library pays for itself.

Prerequisites: [controlled vs uncontrolled](../34.%20controlled-vs-uncontrolled/notes.md), [forms from scratch](../35.%20forms-from-scratch/notes.md).

---

## React Hook Form — core idea (preserved)

```jsx
import { useForm } from 'react-hook-form';

function SignupForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  async function onSubmit(data) {
    await submitSignup(data);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input
        {...register('email', {
          required: 'Email is required',
          pattern: { value: /@/, message: 'Invalid email' },
        })}
      />
      {errors.email && <p role="alert">{errors.email.message}</p>}

      <input
        type="password"
        {...register('password', {
          minLength: { value: 8, message: 'Min 8 characters' },
        })}
      />
      {errors.password && <p role="alert">{errors.password.message}</p>}

      <button disabled={isSubmitting}>Submit</button>
    </form>
  );
}
```

| API | Role |
| --- | --- |
| `register('email', rules)` | Attaches name, ref, onChange/onBlur to the input; stores value in RHF’s internal store |
| `handleSubmit(onSubmit)` | Runs validation, then calls `onSubmit(data)` with values; wires `preventDefault` |
| `formState.errors` | Field errors after validation |
| `formState.isSubmitting` | True while `onSubmit` promise is in flight (double-submit help) |

Spreading `{...register('email')}` is how the DOM node gets registered — don’t forget it on custom inputs (may need `Controller` for fully controlled components).

---

## Why no re-render per keystroke?

```text
Controlled hand-roll: keystroke → setState → Form re-renders → all fields reconcile

RHF default: keystroke → DOM value updates → RHF reads via ref / internal sub
             → Form component re-renders only if subscribed state changes
```

You *can* force renders with `watch('email')` or `useWatch` when live UI needs the value (character count, conditional fields). That’s opt-in cost — same tradeoff as controlled, but localized.

**Mental model:** RHF keeps the “source of truth” outside React render state for field values; React state is for **form meta** you subscribe to.

---

## What libraries solve (preserved table)

| Problem | Hand-rolled cost | Library solution |
| --- | --- | --- |
| Per-keystroke re-renders on large forms | Real with controlled-at-scale | RHF ref-based tracking by default |
| Validation (sync/async, cross-field, schema) | Easy to get inconsistent | Resolvers (Zod/Yup), rule objects |
| Field arrays (add/remove rows) | Fiddly keys/indices | `useFieldArray` |
| Touched/dirty/submission per field | Manual bookkeeping | Built into `formState` |
| Accessibility wiring | Manual per field | Not fully automatic — still wire labels/`aria-*`; libs make patterns easier to standardize |

Libraries don’t remove a11y responsibility — they remove state/validation boilerplate.

---

## Schema validation with Zod (preserved)

```jsx
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Min 8 characters'),
});

const {
  register,
  handleSubmit,
  formState: { errors },
} = useForm({
  resolver: zodResolver(schema),
});
```

**Why schemas:**

- One source of rules instead of scattered `register` options  
- Type inference (`z.infer<typeof schema>`) for submit `data`  
- Potential share with API validation / OpenAPI-adjacent contracts  

Cross-field: `z.object({...}).refine((data) => data.password === data.confirm, { path: ['confirm'], ... })`.

---

## Field arrays (concept)

Dynamic “add another phone number” rows: `useFieldArray({ control, name: 'phones' })` gives `fields`, `append`, `remove` with stable RHF field ids — avoids the index bugs of hand-managed arrays.

Interview: name that dynamic rows are a first-class reason to use a library.

---

## `Controller` and controlled children

UI libraries (MUI Select, etc.) that don’t forward refs / native `register` props need:

```jsx
<Controller
  name="country"
  control={control}
  render={({ field }) => <Select {...field} options={...} />}
/>
```

Still one form store; that field may behave more “controlled” at the component edge.

---

## RHF vs hand-roll vs classic Formik (interview framing)

| Approach | Re-render on type | Best when |
| --- | --- | --- |
| Hand-roll controlled | Yes | Tiny forms, full control, learning |
| **RHF** | No (by default) | Medium/large forms, schemas, arrays |
| Classic Formik (controlled defaults) | Yes (typically) | Existing Formik codebases; know the cost |

Don’t trash Formik blindly in interviews — say RHF’s **uncontrolled-by-default** model is why many teams prefer it for perf; Formik remains widely used and has evolved.

---

## Interview answer (preserved)

**Q: Why would you reach for React Hook Form instead of hand-rolling a form?**

> “Mainly performance and reduced boilerplate at scale. RHF tracks inputs via refs rather than controlled state, so typing doesn’t trigger a re-render of the whole form component — that matters a lot on large forms. It also centralizes validation (including schema-based validation via Zod/Yup resolvers), touched/dirty/error state per field, and utilities like field arrays for dynamic rows, all of which I’d otherwise hand-roll and re-verify for consistency across every form in the app. For a two-field login form, hand-rolling is often fine; for anything with 10+ fields, conditional fields, or dynamic arrays, a library pays for itself quickly.”

---

## Common mistakes and misconceptions

1. Using RHF but `watch`ing everything → reintroduce per-keystroke renders.  
2. Forgetting `{...register('x')}` → field missing from submit data.  
3. Expecting RHF to add `aria-*` for you automatically.  
4. Mixing uncontrolled `register` with a competing `value`/`onChange` without `Controller`.  
5. Choosing a library for a 2-field form “for best practice.”  
6. Claiming Formik is “wrong” instead of explaining the re-render tradeoff.  
7. Putting async submit errors only in Zod — server errors still need `setError` / submit error UI.

---

## Connections to other concepts

```
uncontrolled + refs
  → RHF default performance model

hand-rolled values/errors/isSubmitting
  → same concepts, formState API

Zod resolver
  → single schema as validation source of truth

useFieldArray
  → dynamic lists without index hell

controlled chapter warning
  → still apply when hydrating defaults (defaultValues)
```

---

## Interview perspective

Be ready to:

1. Why RHF over hand-roll (perf + boilerplate + scale).  
2. Uncontrolled/refs vs controlled Formik default.  
3. `register` / `handleSubmit` / `formState` in one minute.  
4. Zod resolver pitch.  
5. When hand-roll is enough.  
6. `Controller` for design-system inputs.

---

# Self-test

## Core recall

1. What is RHF’s core performance idea?
2. What does `register('email', rules)` do?
3. What does `handleSubmit(onSubmit)` do for you?
4. When does an RHF form component typically re-render while typing?
5. What problem does `useFieldArray` solve?
6. What does `zodResolver(schema)` buy you?
7. When is hand-rolling still fine?
8. Why might you need `Controller`?

## Explain why

1. Why does avoiding per-keystroke setState matter on large forms?
2. Why do schemas beat scattering rules only in `register`?
3. Why is `watch('email')` a tradeoff?
4. Why don’t form libraries remove the need to know the hand-rolled mental model?
5. Why is a 2-field login a weak reason to add RHF?
6. Why might classic Formik feel slower on a 20-field form?

## Compare and contrast

1. RHF vs hand-rolled controlled form  
2. RHF vs classic Formik (default model)  
3. Inline `register` rules vs Zod schema  
4. `register` native input vs `Controller`  
5. `formState.isSubmitting` vs hand-rolled `isSubmitting`  

## Predict / choose

1. User types in RHF email field; parent Form has no `watch`. Re-render every key?  
2. Same but `const email = watch('email')` for a counter. Re-render?  
3. 12-field checkout + dynamic line items — hand-roll or RHF?  
4. Submit with missing `{...register('password')}` — password in `data`?

## Debugging

1. Submit `data` missing `email` though an email input is on screen. Likely cause?  
2. Form re-renders every keystroke after “optimizing” with RHF. What did you add?  
3. MUI Select doesn’t update RHF state with bare `register`. Direction?  
4. Zod says valid but server returns “email taken.” Where do you put that error?

## Application

1. Write a minimal RHF form with email required + Zod optional alternative description.  
2. Sketch `useForm({ resolver: zodResolver(schema) })` with email/password schema.  
3. Spoken: why RHF over hand-roll.  
4. Explain to an interviewer when you’d still hand-roll.

## Interview questions

1. Why would you reach for React Hook Form instead of hand-rolling a form?  
   - Follow-up: How does it avoid re-renders on type?  
   - Follow-up: How do you do schema validation?
2. RHF vs Formik — what’s the headline difference?  
3. What is `register`?  
4. How do you handle dynamic field arrays?

## Connections

1. How does RHF connect to uncontrolled inputs?
2. How does it implement the same submit pipeline as forms-from-scratch?
3. How do Zod schemas connect to shared API contracts / TypeScript?
4. How does `watch` reintroduce controlled-like costs?
