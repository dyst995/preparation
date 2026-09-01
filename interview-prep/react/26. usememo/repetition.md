# useMemo — Next-day repetition

## How to use

1. Do **not** open `notes.md` first.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] What does `useMemo` return when dependencies are unchanged, and when does it recompute?
- [ ] What are the two distinct reasons to use `useMemo`? Why might a cheap `.filter()` still use it?
- [ ] Should you put side effects in `useMemo`? What’s a safer pattern for expensive *initial* state than `useMemo`?
- [ ] `useMemo` vs `React.memo`; `useMemo` vs `useCallback`. Why doesn’t `useMemo` by itself stop a child from re-rendering?
- [ ] Why does a missing dependency cause stale UI?

## Predict / debug

- [ ] `useMemo(() => items.map(...), [items])`; parent re-renders; `items` is the same reference. Does `map` run? State the result and explain why.
- [ ] Same, but the factory closes over `query` omitted from deps; `query` changes. What value do you see, and why?
- [ ] Without `useMemo`, `const v = { x }` each render; effect deps `[v]`. Effect frequency? Why?
- [ ] Sorted list doesn’t update when sort-key state changes; `useMemo(..., [items])` only. Diagnose and fix.
- [ ] Developer puts `fetch` inside `useMemo`. What’s wrong?

## Say it out loud

- [ ] Explain `useMemo` in 30–60 seconds as if an interviewer asked.
- [ ] Is `useMemo` only for expensive computations? Follow-up: give an example of the second reason. Follow-up: when would you skip `useMemo`?
- [ ] Can overusing `useMemo` hurt? How? What’s the relationship between `useMemo` and `React.memo`?
