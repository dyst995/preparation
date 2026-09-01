# useCallback — Next-day repetition

## How to use

1. Do **not** open `notes.md` first.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] What does `useCallback(fn, deps)` return when deps are unchanged? Express `useCallback` in terms of `useMemo`.
- [ ] What are the two situations where `useCallback` pays off? Why is it pointless for a non-memoized child that only receives that handler?
- [ ] Does `useCallback` make the function body run faster when clicked? Are `useState` setters safe to omit from deps / use with `[]`?
- [ ] `useCallback` vs `useMemo`; `useCallback` without `memo` vs with `memo`. Why is “wrap all handlers in `useCallback`” a weak senior answer?
- [ ] What goes wrong with empty deps when the callback reads `count` from state? Why is functional `setCount(c => c + 1)` useful inside `useCallback` with `[]`?

## Predict / debug

- [ ] Memo child + `useCallback(..., [])` handler; parent state unrelated to handler deps updates. Child re-render? State the result and explain why.
- [ ] Same but the handler is inline `() => {}`. Child? Why?
- [ ] Non-memo child + `useCallback`. Parent updates. Child? Why?
- [ ] `useCallback(() => console.log(count), [])`; click after `count` became 5. What logs, and why?
- [ ] List rows all re-render on parent keypress; each gets `onSelect={() => select(item.id)}`. Diagnose and fix.

## Say it out loud

- [ ] Explain `useCallback` in 30–60 seconds as if an interviewer asked.
- [ ] When does `useCallback` actually make a measurable difference? Follow-up: show a case where it’s useless. Follow-up: how do stale closures show up?
- [ ] Do you use `useCallback` by default for every event handler? Why/why not? How do `memo`, `useMemo`, and `useCallback` work together?
