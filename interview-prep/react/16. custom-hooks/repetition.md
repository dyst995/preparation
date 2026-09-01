# Custom Hooks — Encapsulating Reusable Stateful Logic — Next-day repetition

## How to use

1. Do **not** open `notes.md` first.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] What is a custom hook? Do two components calling the same custom hook share state? Where do a custom hook’s `useState` slots live?
- [ ] Why isn’t a custom hook a global store? Why must custom hooks follow the Rules of Hooks internally? Why is the `use` prefix important?
- [ ] What does `useDebouncedValue` return and why clear the timeout in cleanup? Why does `usePrevious` return the previous value during render?
- [ ] Does `useLocalStorage` synchronize two components’ in-memory state automatically? Why can two `useLocalStorage('theme')` diverge in the UI?
- [ ] Compare custom hook vs shared Context value, and two `useToggle()` in one component vs one in each of two components.

## Predict / debug

- [ ] `A` and `B` both `useToggle()` — toggling `A` affects `B`? State the result and explain why.
- [ ] One component calls `useDebouncedValue(query, 300)` twice for two queries — shared debounce state? State the result and explain why.
- [ ] First render of `usePrevious(5)` — typical return value? After `count` goes 1 → 2, during the render where `count === 2`, what does `usePrevious(count)` return? State the result and explain why.
- [ ] Engineer expects all tabs using `useLocalStorage('tab')` to update together in memory — they don’t. Diagnose and give fix approaches. Debounced search still fires every keypress — consumer effect depends on `query` not `debouncedQuery`. Diagnose and fix.

## Say it out loud

- [ ] Explain custom hooks in 30–60 seconds as if an interviewer asked.
- [ ] If two components both call `useLocalStorage('theme', 'light')`, do they share state? Follow-ups: How would you share? What does a custom hook reuse?
- [ ] How do custom hooks relate to the fiber hook list?
