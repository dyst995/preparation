# HTML Semantics — Next-day repetition

## How to use

1. Do **not** open `notes.md` first.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] What does “semantic HTML” mean in practice? Why is it “functional, not stylistic”?
- [ ] Why is `<div onClick>` a poor button? What does a real `<button>` give you for free? `<button>` vs `<div role="button">`.
- [ ] Default `type` of `<button>` inside a `<form>`? Why does omitting button `type` cause accidental submits?
- [ ] Link vs button — rule of thumb. `<a href>` vs `<button>` for navigation. Why associate `<label>` with `<input>`?
- [ ] What is the “first rule of ARIA” in one line? Native semantics vs bolting on ARIA.

## Predict / debug

- [ ] Cancel control inside `<form>` — `type`? State the choice and explain why.
- [ ] “Read more” goes to `/article/1` — `a` or `button`? Custom open-modal control — `button` or `div`? Why?
- [ ] Pressing Enter in an input unexpectedly runs cancel’s onClick path that also submits. Diagnose the cause.
- [ ] Keyboard users can’t reach “Save” styled as a div. Diagnose and fix.
- [ ] SR user hears unlabeled edit fields. Missing what?

## Say it out loud

- [ ] Explain HTML semantics in 30–60 seconds as if an interviewer asked.
- [ ] Why does semantic HTML matter beyond "it's cleaner"? Follow-up: div onClick vs button? Follow-up: button types in forms?
- [ ] When is ARIA appropriate vs native HTML? Link or button for a card that opens a detail URL?
