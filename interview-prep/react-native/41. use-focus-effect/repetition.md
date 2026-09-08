# `useFocusEffect` — Next-day repetition

## How to use

1. Do **not** open `notes.md` first. The full question bank is `self-test.md`; this file is the next-day subset.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] Tab gotcha: stay mounted; `useEffect` misses return visits. `useFocusEffect` + `useCallback`. Cleanup on blur (unmount may never run).
- [ ] Mount vs focus. `useIsFocused` vs focus effect. `staleTime` ≠ tab refocus. AppState ≠ tab focus.
- [ ] Stack pop also often doesn’t remount. Duplicate listeners: unstable callback / two focus pipelines.
- [ ] Spoken: why `useEffect` is insufficient in tab navigators.

## Predict / debug

- [ ] Wallet `useEffect([])` refetch; Home → Wallet again. Same with `useFocusEffect`. Focus effect **without** `useCallback`, 10 parent re-renders.
- [ ] Invalidate while Wallet mounted vs first lazy open. Analytics once per session. Focus refetch **loops**.
- [ ] `eventBus` in `useEffect` no blur cleanup. `addListener('focus')` **and** `useFocusEffect`. Reset remount vs tab switch.

## Say it out loud

- [ ] Why might `useEffect` be insufficient in tab navigators? Follow-up: `useCallback`? Blur cleanup?
- [ ] How do you refresh Wallet when they come back to the tab? Mount vs focus with Home/Wallet.
- [ ] Recite the gotcha sentence (tabs stay mounted…).
