# Redux Toolkit — Next-day repetition

## How to use

1. Do **not** open `notes.md` first.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] What core Redux ideas did RTK keep, and what does `createSlice` bundle?
- [ ] Why is “mutating” in a slice reducer safe? Hand-written immutable updates vs Immer drafts.
- [ ] When does a `useSelector` component re-render, and what problem does `createSelector` solve?
- [ ] Redux Toolkit vs Zustand, and RTK Query vs React Query.
- [ ] When prefer RTK over Zustand? Why isn’t listing three state libraries on a CV automatically redundant?

## Predict / debug

- [ ] Theme string that rarely changes — RTK, Zustand, or Context? State the choice and explain why.
- [ ] `GET /products` for a catalog page — lean tool? Why?
- [ ] Multi-slice checkout + payments + entitlements with an audit trail — lean? Why?
- [ ] UI doesn’t update after `const u = useSelector(s => s.user); u.name = 'x'`. Diagnose and explain why.
- [ ] Component re-renders on every store tick; selector returns `state.todos.items.map(...)` inline. Diagnose and fix.

## Say it out loud

- [ ] Explain Redux Toolkit in 30–60 seconds as if an interviewer asked.
- [ ] Your CV lists Redux, Zustand, and React Query — isn’t that redundant?
- [ ] What is Redux Toolkit and why use it over classic Redux? When is Redux overkill?
