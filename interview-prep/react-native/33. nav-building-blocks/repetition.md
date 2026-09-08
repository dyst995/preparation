# React Navigation building blocks — Next-day repetition

## How to use

1. Do **not** open `notes.md` first. The full question bank is `self-test.md`; this file is the next-day subset.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] Native vs JS stack (default native). Spoken answer: tabs for sections, feature stacks for transfer/KYC, nesting deliberate.
- [ ] Navigator owns active-child state. Tabs vs stack job. One `NavigationContainer` + nested `linking` config.
- [ ] `useNavigation` / `useRoute` / `useFocusEffect`. Focus ≠ mount. `card` vs `modal`. `useCallback` on focus effect.
- [ ] `navigate` is the **nearest** navigator. Presentation ≠ Auth tree.

## Predict / debug

- [ ] One flat stack of Login+Home+Amount+Confirm; back several times. Wallet `useEffect([])` refetch; switch tabs and back.
- [ ] Two containers; link into App. Confirm as `presentation: 'modal'`. `useFocusEffect` without `useCallback`.
- [ ] Transfer as four tabs. `navigate('Receipt')` not on this navigator. Analytics once per session. Linking map flat vs nested tree.

## Say it out loud

- [ ] Native stack vs stack — which and why? Follow-up: when JS? How do you nest in a fintech app?
- [ ] `useEffect` vs `useFocusEffect`? What is `NavigationContainer` for?
- [ ] Recite the spoken building-blocks answer (native / tabs / feature stacks / deliberate nesting).
