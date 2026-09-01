# Building a Form from Scratch — Next-day repetition

## How to use

1. Do **not** open `notes.md` first.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] Name four pieces of state a typical hand-rolled form tracks. Field errors vs `submitError` — difference?
- [ ] Why call `e.preventDefault()` on submit? How does one `handleChange` serve many fields, and why is `name` required for that pattern?
- [ ] Why disable the button *and* guard the handler? Why reset `isSubmitting` in `finally`?
- [ ] Validate on submit vs on change; native HTML validation vs JS `validate` + `noValidate`.
- [ ] Why wire `aria-describedby` to the error paragraph’s `id`? Why does scaling to 15 fields push teams to libraries?

## Predict / debug

- [ ] Double-click submit with no `isSubmitting`. Risk? State the result and explain why.
- [ ] `handleChange` but the input is missing `name="email"`. What happens to state, and why?
- [ ] API throws; no `finally`. Button stuck? Why?
- [ ] Form full-page refreshes on submit. Missing what? Diagnose and fix.
- [ ] Duplicate user accounts from one signup form. Likely cause? Screen reader doesn’t announce a password error — what’s likely missing?

## Say it out loud

- [ ] Explain building a form from scratch in 30–60 seconds as if an interviewer asked.
- [ ] How do you prevent a form from being submitted twice? Follow-up: what state does a production signup form need? Follow-up: when do you reach for a form library?
- [ ] Walk through your submit handler step by step. How do you make field errors accessible?
