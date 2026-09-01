# Context — What It’s Good For, and Its Sharp Edges — Next-day repetition

## How to use

1. Do **not** open `notes.md` first.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] What problem does Context solve? When does a `useContext` consumer re-render? Does Context provide selector-based subscriptions? What is the nearest Provider rule?
- [ ] Why is `value={{ user, theme }}` without memo dangerous? Why doesn’t memoizing one big context value fully fix “I only read theme”?
- [ ] What is the most common structural fix for mixed update rates? When should you avoid Context entirely for shared state?
- [ ] Why is mouse position a bad Context fit? Why might `React.memo` on a child still re-render when context it reads updates?
- [ ] Compare Context vs prop drilling, Context vs Zustand selectors, and one AppContext vs split contexts.

## Predict / debug

- [ ] Provider `value={{ theme }}` new each parent render; 20 theme consumers — what happens on unrelated parent state update? State the result and explain why.
- [ ] After `useMemo` on `{ user, theme }` deps `[user, theme]`; only `user` changes — does a theme-only consumer re-render? State the result and explain why.
- [ ] Separate ThemeContext; only `user` changes — theme consumer re-render? Consumer uses `useContext`; wrapped in `memo`; context value changes — re-render? State the result and explain why.
- [ ] Profiler: whole tree under Provider re-renders on every keystroke in a search box held in Context. Diagnose and fix.
- [ ] `value={useMemo(() => ({…}), [])}` with stale user forever. Diagnose and fix.

## Say it out loud

- [ ] Explain Context in 30–60 seconds as if an interviewer asked.
- [ ] Why is Context a poor fit for frequently-changing, widely-consumed state? Follow-ups: Mitigations? Zustand difference?
- [ ] Explain the Context re-render rule precisely.
