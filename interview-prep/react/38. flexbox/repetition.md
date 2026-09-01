# Flexbox — Next-day repetition

## How to use

1. Do **not** open `notes.md` first.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] What do main axis and cross axis depend on? Which property aligns along the main axis vs the cross axis?
- [ ] What does `flex: 1` roughly mean? What does `flex: 0 0 240px` mean? Default `flex-direction`?
- [ ] `justify-content` vs `align-items`; `align-items` vs `align-self`; `flex-grow` vs `flex-basis`.
- [ ] Why does `justify-content: center` center vertically when `flex-direction: column`? Why set `min-width: 0` on a `flex: 1` main pane with long content?
- [ ] Flexbox vs CSS Grid (one sentence each). Why isn’t a grandchild a flex item of the outer flex container?

## Predict / debug

- [ ] Row flex; three items; `justify-content: space-between`. Where do they sit? State the result and explain why.
- [ ] Two children: sidebar `flex: 0 0 200px`, main `flex: 1`. Who takes leftover width? Why?
- [ ] Column flex; `justify-content: center; align-items: flex-start`. Child position? Why?
- [ ] Tried to center with only `align-items: center` on a row; still left-aligned horizontally. What’s missing?
- [ ] Long word overflows flex main and blows the layout. Likely fix? Navbar items stacked vertically unexpectedly — check what?

## Say it out loud

- [ ] Explain Flexbox in 30–60 seconds as if an interviewer asked.
- [ ] How do you perfectly center a div both horizontally and vertically with Flexbox? Follow-up: what if `flex-direction` is `column`? Follow-up: sidebar + content layout?
- [ ] Explain `flex-grow`, `flex-shrink`, and `flex-basis`. When would you choose flex over grid?
