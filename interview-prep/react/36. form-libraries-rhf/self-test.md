# Form Libraries — What They Actually Buy You (React Hook Form) — Self-test

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
