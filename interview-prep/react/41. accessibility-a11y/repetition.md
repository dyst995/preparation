# Accessibility (a11y) — Next-day repetition

## How to use

1. Do **not** open `notes.md` first.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] What is the first rule of ARIA? Why is bad ARIA worse than no ARIA?
- [ ] Name five items from the interactive UI a11y checklist. What contrast ratio is the common WCAG AA baseline for normal text?
- [ ] What does `aria-describedby` do on a form field? `role="alert"` vs `role="status"`? `aria-label` vs `aria-labelledby`.
- [ ] What must a modal do with focus on open and close? Why restore focus to the trigger when a modal closes?
- [ ] Native `<button>` vs `div` + `role="button"`. Why push for native `<select>` before a div dropdown? Why can’t color alone indicate errors?

## Predict / debug

- [ ] Icon-only close control — what a11y attribute is essential? State the choice and explain why.
- [ ] “Saved successfully” toast — `alert` or `status` more often? Decorative divider image — `alt` value? Why?
- [ ] Keyboard users tab “behind” an open modal into the page. Missing what? Diagnose and fix.
- [ ] Icon button announced as “button” with no name. Diagnose and fix.
- [ ] Custom dropdown only works with mouse clicks. What’s incomplete?

## Say it out loud

- [ ] Explain accessibility (a11y) basics in 30–60 seconds as if an interviewer asked.
- [ ] A designer hands you a custom dropdown built entirely from `<div>`s. What accessibility work is needed? Follow-up: first rule of ARIA? Follow-up: how do you handle modal focus?
- [ ] How do you make forms accessible? How do you test a11y in a PR?
