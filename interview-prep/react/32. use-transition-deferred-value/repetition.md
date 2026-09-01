# useTransition and useDeferredValue — Next-day repetition

## How to use

1. Do **not** open `notes.md` first.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] What problem do `useTransition` and `useDeferredValue` solve? What does `startTransition` do to state updates inside its callback?
- [ ] What is `isPending`? What does `useDeferredValue(query)` return under load?
- [ ] Which update should stay **outside** the transition for a search input? When prefer `useDeferredValue` over `useTransition`?
- [ ] `useTransition` vs debounce; `useDeferredValue` vs `useMemo`. Does `useTransition` reduce how often you hit the network by itself?
- [ ] Why shouldn’t the controlled input’s value be the deferred one? Why still virtualize a huge list even if you use `useTransition`?

## Predict / debug

- [ ] User types fast; `query` in the input vs `results` state updated only inside `startTransition`. What feels instant? What may lag? State the result and explain why.
- [ ] You wrap `setQuery` in `startTransition` and leave the list sync. Typing feel? Why?
- [ ] Input lags; expensive filter and `setQuery` both inside `startTransition`. Diagnose and fix.
- [ ] Network fires every keystroke despite `useDeferredValue` on the list. Why? What’s the better tool for search-as-you-type API calls?
- [ ] Users think search is broken because old results show with no indicator while `isPending`. Diagnose and fix.

## Say it out loud

- [ ] Explain `useTransition` and `useDeferredValue` in 30–60 seconds as if an interviewer asked.
- [ ] When would you use `useTransition` over just debouncing an input? Follow-up: when is debounce better? Follow-up: `useDeferredValue` vs `useTransition`?
- [ ] Do these APIs make O(n²) work cheap? How does `isPending` help UX?
