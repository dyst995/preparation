# `useRef` in Depth — Next-day repetition

## How to use

1. Do **not** open `notes.md` first.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] What does `useRef` return, and what is special about its identity across renders? Does changing `ref.current` schedule a re-render?
- [ ] What are the two main uses of refs? When should a value be state instead of a ref?
- [ ] What is the `savedCallback` ref pattern for? Why won’t listing `someRef` in an effect dep array re-run when `.current` changes?
- [ ] When does React set a DOM ref’s `current`? Why is displaying `countRef.current` in JSX after only mutating the ref broken?
- [ ] Compare `useRef` vs `useState`, and reading ref in an event handler vs using state in render.

## Predict / debug

- [ ] `Bad` counter with only `countRef.current++` on click — what does the button show after 5 clicks? State the result and explain why.
- [ ] `const r = useRef(0);` log `r === r` across two renders — same object? State the result and explain why.
- [ ] `<input ref={inputRef} />` — `inputRef.current` during first render before commit? State the result and explain why.
- [ ] Focus on mount: `inputRef.current.focus()` in render body throws / is null. Diagnose and fix. Effect should run when “latest id” in a ref changes — never re-runs. Diagnose.

## Say it out loud

- [ ] Explain `useRef` in 30–60 seconds as if an interviewer asked.
- [ ] Why doesn’t updating `ref.current` re-render — when is that a feature? Follow-ups: Counter mistake? DOM use?
- [ ] When do you use `useRef` vs `useState`?
