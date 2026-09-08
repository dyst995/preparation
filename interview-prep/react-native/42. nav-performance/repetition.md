# Navigation performance and UX — Next-day repetition

## How to use

1. Do **not** open `notes.md` first. The full question bank is `self-test.md`; this file is the next-day subset.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] Interview point: jank is screen weight; profile first. Lazy vs unmountOnBlur. Freeze vs unmount. Native vs custom header.
- [ ] First paint: don’t mount every tab tree. Lazy does not unmount on blur. JS stack is not the jank fix.
- [ ] Spoken 30–60s (lazy, freeze/detach, native headers, profile Wallet).
- [ ] After freeze, `useEffect([])` still won’t refetch on return — need `useFocusEffect`.

## Predict / debug

- [ ] `lazy: false`, four tabs at login. `lazy: true`, Wallet effect before first visit. Return to Wallet without unmountOnBlur. `unmountOnBlur` then return.
- [ ] Custom live-balance header during push. JS stack + 500-row ScrollView.
- [ ] TTI 4s all tabs eager. Scroll lost (`unmountOnBlur`). Freeze + only `useEffect` refetch — stale on return.

## Say it out loud

- [ ] Navigation feels janky — navigator or screen? How do you keep first paint fast? Freeze vs unmount?
- [ ] Reconcile `lazy` with “tabs stay mounted.”
- [ ] Recite: “Navigation jank is often from screen render weight…”
