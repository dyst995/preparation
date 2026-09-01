# Zustand — Next-day repetition

## How to use

1. Do **not** open `notes.md` first.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] Where does Zustand store state relative to React, and why doesn’t it need a Provider?
- [ ] What does a selector do, and how does Zustand decide whether to re-render a subscriber?
- [ ] Why is returning `{ a, b }` from a selector often a footgun?
- [ ] Why isn’t “put the fetch result in Zustand” a complete server-state strategy?
- [ ] Zustand vs Context, Zustand vs Redux Toolkit, and Zustand vs React Query.

## Predict / debug

- [ ] Store updates `filters.search`; a component selected only `isSidebarOpen`. Re-render? State the result and explain why.
- [ ] Component calls `useUiStore()` with no selector; `filters` change. Re-render? Explain why.
- [ ] Selector returns a new object `{ search: s.filters.search }` every time; only `isSidebarOpen` changes in the store. Does this component re-render? Why?
- [ ] UI doesn’t update after `state.filters.search = x` inside `set`. Diagnose and fix.
- [ ] Team moved `/orders` into Zustand and hand-rolls loading. What’s the better home, and why?

## Say it out loud

- [ ] Explain Zustand in 30–60 seconds as if an interviewer asked.
- [ ] How does Zustand avoid Context’s re-render problems? Follow-ups: `useSyncExternalStore`? No Provider?
- [ ] When do you choose Zustand vs Redux Toolkit, and how does Zustand sit next to React Query?
