# `useLayoutEffect` vs `useEffect` — Next-day repetition

## How to use

1. Do **not** open `notes.md` first.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] When does `useEffect` run relative to paint? `useLayoutEffect`? Which one can block the browser from painting?
- [ ] Default choice for data fetching / subscriptions? Classic UI reason to use `useLayoutEffect`?
- [ ] What SSR issue does `useLayoutEffect` have? Does `useLayoutEffect` run during the render phase?
- [ ] Why does measuring a tooltip in `useEffect` often flicker? Why can `setState` inside `useLayoutEffect` avoid flicker?
- [ ] Name one cost of overusing `useLayoutEffect`. Compare blocking paint vs flickering.

## Predict / debug

- [ ] Tooltip positioned in `useEffect` from `(0,0)` initial state — what can the user see? Same in `useLayoutEffect` — first painted frame? State the result and explain why.
- [ ] `useLayoutEffect` runs a 200ms busy loop — what happens to paint? State the result and explain why.
- [ ] Fetch in `useLayoutEffect` vs `useEffect` — does data arrive meaningfully sooner? State the result and explain why.
- [ ] Popover flashes at wrong place then jumps. Diagnose and say which hook to try. App feels sluggish on navigation; many components use `useLayoutEffect` for logging. Diagnose and fix.

## Say it out loud

- [ ] Explain `useLayoutEffect` vs `useEffect` in 30–60 seconds as if an interviewer asked.
- [ ] When would you use `useLayoutEffect` instead of `useEffect`? Follow-ups: Performance? SSR? Tooltip with `useEffect`?
- [ ] Walk through the timeline including both hooks.
