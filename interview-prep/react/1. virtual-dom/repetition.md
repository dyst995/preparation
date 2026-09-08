# Virtual DOM — Next-day repetition

## How to use

1. Do **not** open `notes.md` first. The full question bank is `self-test.md`; this file is the next-day subset.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] What is the virtual DOM, without saying “it’s faster”? What three element fields matter in an interview?
- [ ] Is a React element a DOM node? JSX vs the element tree — which is the VDOM?
- [ ] Host `type: 'button'` vs composite `type: SaveButton` — what does React do with each?
- [ ] What does React 16+ compare the new element tree against? How is that different from “two VDOM trees”?
- [ ] Why is “virtual DOM is always faster than the real DOM” a bad claim? What *is* the real value?
- [ ] Element vs Fiber vs DOM — one line each.

## Predict / debug

- [ ] `const el = <button className="btn">Save</button>` — DOM node or React element? Explain why.
- [ ] Parent returns `<SaveButton onSave={fn} />`. What is `type` before React runs `SaveButton`? After it returns `<button>Save</button>`?
- [ ] Same `<p>` text across two parent re-renders. Must commit rewrite the DOM? Explain at the description layer.
- [ ] Candidate: “VDOM means React is always faster than vanilla.” Correct them without a Fiber lecture.

## Say it out loud

- [ ] Explain the virtual DOM in 30–60 seconds as if an interviewer asked.
- [ ] What is the virtual DOM and why does it exist? Follow-ups: always faster? Is JSX the VDOM?
- [ ] If they say “React diffs two virtual DOM trees,” agree, then tighten the wording (elements vs Fiber).
