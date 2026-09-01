# React.memo — Next-day repetition

## How to use

1. Do **not** open `notes.md` first.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] What does `React.memo` do, and what equality check does the default use?
- [ ] Name three prop shapes that commonly defeat `memo`. When is `memo` worth applying vs a waste?
- [ ] Why can `memo` on the child alone accomplish nothing? Why does a new object literal with the same fields defeat shallow memo?
- [ ] `React.memo` vs `useMemo` vs `useCallback`. Does `memo` block re-renders from the component’s own `useState`?
- [ ] Why might colocating state beat adding `memo` + `useCallback`?

## Predict / debug

- [ ] `memo` Child with `n={5}` (number from parent state that doesn’t change when a sibling counter updates). Does Child re-render when the sibling counter ticks? State the result and explain why.
- [ ] Same Child but `style={{ color: 'red' }}` inline every time. Child re-render on parent update? Why?
- [ ] Memoized Child reads `theme` from Context; Provider value changes; props unchanged. Child re-render? Why?
- [ ] `React.memo(Row)` still profiles as rendering whenever the list parent’s search box types. `Row` gets `onSelect={() => select(id)}`. Diagnose and fix.
- [ ] Developer memoizes Child but mutates `item` in place in the parent then setStates something else. Child doesn’t update. Why?

## Say it out loud

- [ ] Explain `React.memo` in 30–60 seconds as if an interviewer asked.
- [ ] You wrapped a component in `React.memo` but it still re-renders every time. Why? Follow-up: how do you fix it? Follow-up: when would you *not* bother?
- [ ] `memo` vs `useMemo` — when each? What’s the cost of `React.memo`?
