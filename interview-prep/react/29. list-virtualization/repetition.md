# List Virtualization — Next-day repetition

## How to use

1. Do **not** open `notes.md` first.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] What problem does list virtualization solve? What is a “window,” and what is overscan?
- [ ] Why doesn’t `React.memo` on each row replace virtualization? Full `.map()` vs virtualized list; virtualization vs pagination / infinite scroll.
- [ ] Roughly when is virtualization worth it vs not? Does virtualization mean the data array isn’t held in memory?
- [ ] Why do variable-height rows make virtualization harder? Why can find-in-page break under virtualization?
- [ ] Why can local state inside a row “jump” to another item on scroll? How does this relate to RN `FlatList`?

## Predict / debug

- [ ] 25 static settings rows — virtualize? State the choice and explain why.
- [ ] Profiler: list mount 400ms, 2,000 row components. First structural fix? Why?
- [ ] Virtual list shows overlapping rows; `itemSize={40}` but rows are ~72px tall. Diagnose the cause.
- [ ] Row component omits spreading/applying `style`. Symptom? Why?
- [ ] Controlled input in a row loses typed text when the user scrolls away and back. Diagnose the likely cause.

## Say it out loud

- [ ] Explain list virtualization in 30–60 seconds as if an interviewer asked.
- [ ] When would you virtualize a list, and what's the tradeoff? Follow-up: which library would you pick and why? Follow-up: how is this like FlatList?
- [ ] Virtualization vs just paginating the API — same thing? What breaks or gets harder when you virtualize?
