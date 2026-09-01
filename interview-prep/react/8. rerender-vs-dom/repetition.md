# Does a Re-render Always Touch the DOM? — Next-day repetition

## How to use

1. Do **not** open `notes.md` first.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] Does a re-render always mutate the DOM? What does “re-render” mean precisely?
- [ ] Without `memo`, does a child usually re-render when its parent does? If child output is identical after re-render, what does commit do for that subtree?
- [ ] What extra work does React still do if the function ran but DOM didn’t change? How does `React.memo` differ from “diff found no DOM changes”?
- [ ] Can React skip scheduling a re-render entirely? Give one case. Why does `setState` with the same number often cause no re-render?
- [ ] Compare re-render vs DOM mutation, and parent re-render cascading to child vs child `setState`.

## Predict / debug

- [ ] Parent increments count; `StaticChild` returns `<p>Hi</p>` always; no memo. Did `StaticChild`’s function run? Did `<p>`’s DOM text change? State the result and explain why.
- [ ] Same but `StaticChild = memo(() => <p>Hi</p>)`. Did the function run on Parent’s count update? State the result and explain why.
- [ ] `setCount(0)` when count is already `0`. Re-render scheduled? State the result and explain why.
- [ ] Memoized child still runs every parent click; parent passes `onClick={() => ...}`. Diagnose and fix.

## Say it out loud

- [ ] Explain re-render vs DOM update in 30–60 seconds as if an interviewer asked.
- [ ] If a child’s output doesn’t change, does the DOM update? Follow-ups: Does the child function still run? Role of `memo`?
- [ ] What’s the difference between `React.memo` and a re-render that produces no DOM change?
