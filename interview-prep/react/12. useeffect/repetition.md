# `useEffect` in Depth — Next-day repetition

## How to use

1. Do **not** open `notes.md` first.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] What is `useEffect` primarily for? When does it run relative to paint?
- [ ] What do `[]`, `[a]`, and omitted deps mean? When does an effect’s cleanup run, and why abort fetch in cleanup when `url` changes?
- [ ] Why does `setCount(count + 1)` inside a `[]` interval get stuck? Why prefer a functional updater over `[count]` for a ticking interval?
- [ ] What does exhaustive-deps push you to do? Why is silencing it dangerous? Why can `options={{}}` in JSX cause effect churn?
- [ ] Compare `useEffect` vs event handler, and derive in render vs sync with effect.

## Predict / debug

- [ ] `[]` interval with `setCount(count + 1)`, start 0 — what does UI tend to show after several seconds? Same with `setCount(c => c + 1)`? State the result and explain why.
- [ ] Effect depends on `user`; `user` is a new object every parent render with same fields — how often does the effect run? State the result and explain why.
- [ ] Fetch effect without abort; slow request A then fast B for new url — what can happen to `data`? State the result and explain why.
- [ ] Timer stuck at 1 with empty deps. Diagnose and fix.
- [ ] Effect refetches forever; dep is `filters` object from parent inline. Diagnose and fix.

## Say it out loud

- [ ] Explain `useEffect` in 30–60 seconds as if an interviewer asked.
- [ ] Empty-deps effect + interval reads state and looks stuck — why and how to fix?
- [ ] When do effect cleanups run, and why do they matter for fetch?
