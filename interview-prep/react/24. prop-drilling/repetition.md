# Prop Drilling — Next-day repetition

## How to use

1. Do **not** open `notes.md` first.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] What is prop drilling, and when is shallow drilling often preferable?
- [ ] Name three signals that drilling has become a smell, and the preferred fix order.
- [ ] How does composition remove the need to drill a prop through a shell? Why prefer composition before Context?
- [ ] Prop drilling vs normal prop passing; colocating state vs lifting then drilling.
- [ ] Context vs Zustand as a drilling escape hatch — when is each the right fix?

## Predict / debug

- [ ] `App → Page → Button` passes `onClick` used only by Button. Smell? First move? State the result and explain why.
- [ ] Auth user needed in header, sidebar, and 12 feature leaves. Lean tool? Why?
- [ ] Theme string used app-wide, changes rarely — Context or drill 6 levels? Why?
- [ ] Every layout file lists `user`, `theme`, `locale`, `flags` unused except at leaves. What’s wrong, and what’s the first fix?
- [ ] State lives in `App` because “two siblings might need it someday”; only one child uses it via 4 hops. Diagnose.

## Say it out loud

- [ ] Explain prop drilling in 30–60 seconds as if an interviewer asked.
- [ ] Is prop drilling always bad? Follow-up: what’s your first fix? Follow-up: when do you reach for Context vs a store?
- [ ] How do you decide between props, Context, and Zustand?
