# `useState` in Depth — Next-day repetition

## How to use

1. Do **not** open `notes.md` first.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] When is `useState`’s initial value used? Does `setState` update the `state` variable in the current render?
- [ ] What happens if you `setState` to a value `Object.is`-equal to the current state? Same object reference vs new object with identical contents — re-render?
- [ ] How do you lazy-initialize expensive state? Why is `useState(expensive())` still costly after mount?
- [ ] When should you prefer `setState(prev => …)`? Why do two `setCount(count + 1)` in one click often net +1?
- [ ] Why doesn’t `useState(props.id)` update when `props.id` changes? Compare seeding from props once vs a controlled prop.
- [ ] Why does mutating state in place then `setState(sameRef)` fail to update UI?

## Predict / debug

- [ ] `count` is 0; `setCount(count + 1); setCount(count + 1);` next `count`? State the result and explain why.
- [ ] Same with functional updaters twice? State the result and explain why.
- [ ] `useState(() => buildBigArray())` — how many times does `buildBigArray` run on 10 re-renders after mount? `useState(buildBigArray())` — how many times on those 10 re-renders (plus mount)? State the result and explain why.
- [ ] State `{ n: 0 }`; click does `setState(s => { s.n++; return s; })` — re-render? UI? Diagnose and fix.
- [ ] Parent passes new `initialItems`; child’s `useState(initialItems)` never refreshes. Diagnose and give options.

## Say it out loud

- [ ] Explain `useState` in 30–60 seconds as if an interviewer asked.
- [ ] Why should you use the functional updater form of `setState`? Follow-ups: Batching? Async?
- [ ] What is lazy initialization of `useState` and when do you need it?
