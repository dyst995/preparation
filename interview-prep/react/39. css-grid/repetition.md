# CSS Grid — Next-day repetition

## How to use

1. Do **not** open `notes.md` first.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] How is Grid’s dimensionality different from Flexbox? What does `display: grid` do?
- [ ] What is `1fr`? What does `grid-template-areas` give you, and how do you assign an element to a named area?
- [ ] What does `repeat(auto-fill, minmax(200px, 1fr))` achieve? When is Flex still the better tool?
- [ ] CSS Grid vs Flexbox; fixed `240px` track vs `1fr` track; `auto-fill` vs hard-coded `repeat(3, 1fr)`.
- [ ] Why is a page with header/sidebar/main/footer a Grid problem? Why compose Grid (page) + Flex (toolbar)?

## Predict / debug

- [ ] Two columns `240px 1fr`. Which grows when the window widens? State the result and explain why.
- [ ] Areas row `"header header"` with two columns. How wide is header? Why?
- [ ] Card grid `auto-fill minmax(200px, 1fr)` at ~450px wide container. About how many columns? Why?
- [ ] `grid-template-areas` ignored / broken layout; strings have 3 then 2 names. Diagnose the cause.
- [ ] Cards stay one column forever despite a wide screen; used `repeat(3, 200px)` only. Better pattern?

## Say it out loud

- [ ] Explain CSS Grid in 30–60 seconds as if an interviewer asked.
- [ ] When would you reach for Grid instead of Flexbox? Follow-up: show a `grid-template-areas` example. Follow-up: explain `auto-fill` + `minmax`.
- [ ] How do you make a responsive card grid without breakpoints? Can you use Grid and Flex together?
