# Form Libraries — React Hook Form — Next-day repetition

## How to use

1. Do **not** open `notes.md` first.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] What is RHF’s core performance idea? When does an RHF form component typically re-render while typing?
- [ ] What does `register('email', rules)` do? What does `handleSubmit(onSubmit)` do for you?
- [ ] RHF vs a hand-rolled controlled form; RHF vs classic Formik (default model). Why might you need `Controller`?
- [ ] What problem does `useFieldArray` solve? What does `zodResolver(schema)` buy you vs inline `register` rules?
- [ ] When is hand-rolling still fine? Why don’t form libraries remove the need to know the hand-rolled mental model?

## Predict / debug

- [ ] User types in an RHF email field; parent Form has no `watch`. Re-render every key? State the result and explain why.
- [ ] Same but `const email = watch('email')` for a counter. Re-render? Why is `watch('email')` a tradeoff?
- [ ] 12-field checkout + dynamic line items — hand-roll or RHF? Why?
- [ ] Submit `data` missing `email` though an email input is on screen. Likely cause? Diagnose and fix.
- [ ] MUI Select doesn’t update RHF state with bare `register`. Direction? Zod says valid but server returns “email taken” — where do you put that error?

## Say it out loud

- [ ] Explain React Hook Form in 30–60 seconds as if an interviewer asked.
- [ ] Why would you reach for React Hook Form instead of hand-rolling a form? Follow-up: how does it avoid re-renders on type? Follow-up: how do you do schema validation?
- [ ] RHF vs Formik — what’s the headline difference? What is `register`?
