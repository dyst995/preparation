# Other Built-in Hooks (Working Knowledge) — Next-day repetition

## How to use

1. Do **not** open `notes.md` first.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] When prefer `useReducer` over multiple `useState`s? Is `dispatch` from `useReducer` typically stable?
- [ ] What does `useContext` read, and when does the consumer re-render? Why can Context cause large re-render subtrees?
- [ ] One-line difference: `useMemo` vs `useCallback`? Why aren’t they the default on every value/function?
- [ ] What does `useImperativeHandle` customize? What is `useId` for, and what is it not for?
- [ ] What problem does `useSyncExternalStore` address? Why is `useEffect` + `setState` a weaker external-store subscription under concurrent React?

## Predict / debug

- [ ] Choose the hook and explain why: wizard with many fields and named transitions (`NEXT`, `BACK`, `SET_EMAIL`); app theme needed in header and footer; memoized list row needs stable `onSelect`; design system `TextField` should allow parent `ref.current.focus()` without exposing DOM; two password fields on one page need unique label ids with SSR.
- [ ] All Context consumers re-render every parent keystroke; `value={{ theme, setTheme }}`. Diagnose and fix.
- [ ] Hydration warning on `id={Math.random()}`. Diagnose and give a better approach.
- [ ] UI tears reading a Zustand-like store with homemade effect subscription. Diagnose and say which API to use.

## Say it out loud

- [ ] Explain the other built-in hooks (when you’d reach for each) in 30–60 seconds as if an interviewer asked.
- [ ] When do you choose `useReducer` over `useState`?
- [ ] Why does `useId` exist? What is `useSyncExternalStore` and who uses it?
