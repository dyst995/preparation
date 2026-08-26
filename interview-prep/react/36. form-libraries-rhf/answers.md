# Form Libraries / React Hook Form — Answers

## Core recall

1. Track fields via refs/uncontrolled internals so typing doesn’t re-render the whole form by default.  
2. Registers the input (ref, name, handlers) and optional validation rules with RHF’s store.  
3. Validates, prevents default, then calls your `onSubmit` with collected values (and handles submit lifecycle).  
4. When subscribed form state changes — not on every keystroke unless you `watch` / similar.  
5. Dynamic add/remove field rows with stable field management.  
6. Centralized, typed schema validation plugged into `useForm`.  
7. Tiny forms (e.g. 2-field login) with little validation complexity.  
8. Components that don’t work with native `register` ref/props (many design-system controls).

## Explain why

1. Controlled updates re-render large trees repeatedly — jank and wasted work.  
2. Single source of truth, reuse, TypeScript inference, consistency across app/API.  
3. `watch` subscribes to value changes → renders on those updates — intentional when needed.  
4. Debugging still maps to values/errors/submitting; libs are an implementation of that model.  
5. Dependency + API surface without enough boilerplate/perf pain to justify it.  
6. Default controlled updates re-render often as each field changes.

## Compare and contrast

1. **RHF:** internal store + less render churn + helpers. **Hand-roll:** full control, more code, easy re-render cost.  
2. **RHF:** uncontrolled-first. **Classic Formik:** controlled-first re-renders (headline interview contrast).  
3. **Inline:** quick local rules. **Zod:** centralized/shareable/typed.  
4. **register:** native inputs. **Controller:** bridge for controlled UI components.  
5. Same role (in-flight submit); RHF provides it via `formState` when using async `handleSubmit`.

## Predict / choose

1. **No** (typically).  
2. **Yes** — watch subscription.  
3. **RHF** (arrays + scale).  
4. **No** — unregistered field omitted.

## Debugging

1. Missing `{...register('email')}` or wrong name / Controller not connected.  
2. Broad `watch()`, or controlled `value` state fighting RHF, or parent state on each change.  
3. Use `Controller` (or supported adapter) to bind `field` props.  
4. `setError('email', { message: '...' })` or submit-level error UI — not only Zod.

## Application

1. Minimal: `useForm` + `register('email', { required: '...' })` + `handleSubmit` + errors display.  
2. As in notes — `z.object({ email: z.string().email(), password: z.string().min(8) })` + `zodResolver`.  
3. Paraphrase preserved interview answer.  
4. Two fields, trivial validation, no arrays — keep it simple without a dependency.

## Interview questions

1. **Spoken:** Perf (refs, no per-keystroke form re-render) + less boilerplate (validation, formState, field arrays, schemas). Tiny forms can stay hand-rolled. Follow-ups: uncontrolled/refs; `zodResolver` / Yup.  
2. **Spoken:** RHF uncontrolled-by-default vs Formik’s classic controlled re-render model — pick by team/legacy, explain the tradeoff.  
3. **Spoken:** API to connect an input into RHF’s store via props/ref and optional rules.  
4. **Spoken:** `useFieldArray` for append/remove with library-managed field ids.

## Connections

1. Same DOM-owned values idea as uncontrolled chapter — RHF systematizes it.  
2. `handleSubmit` ≈ preventDefault → validate → onSubmit with isSubmitting — same pipeline.  
3. `z.infer` types submit payloads; schema can align with server validation rules.  
4. Subscribing to values brings render-on-change back — use sparingly for live UI only.
