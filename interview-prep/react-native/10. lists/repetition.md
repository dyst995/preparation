# Lists: FlatList, SectionList, FlashList — Next-day repetition

## How to use

1. Do **not** open `notes.md` first. The full question bank is `self-test.md`; this file is the next-day subset.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] Why `ScrollView` + `.map` fails. What windowing means. `keyExtractor` vs index.
- [ ] `getItemLayout` — requirement and what it skips. `windowSize` / `initialNumToRender` tradeoffs.
- [ ] SectionList vs FlatList. FlashList internal idea vs FlatList. Nested VirtualizedList problem.
- [ ] Why index keys break row state. Why inline `style`/`onPress` fight `memo`.
- [ ] `removeClippedSubviews` help vs glitch. Virtualization vs lazy images.

## Predict / debug

- [ ] 2,000 rows in `ScrollView` `.map` — how many host views? Explain why.
- [ ] Index `keyExtractor`, insert at top, focused TextInput — identity bug? `getItemLayout` length 72 vs 140px rows — `scrollToIndex`?
- [ ] Nested FlatList in ScrollView — fix direction? Checkmarks don’t update when `selectedIds` changes — which prop?
- [ ] `windowSize={1}` and white holes on fling — diagnosis? Android OOM on a photo feed — first list-shaped fix?

## Say it out loud

- [ ] Explain list virtualization in RN in 30–60 seconds.
- [ ] Use a virtualized list so only visible rows mount… (full curriculum answer). Follow-ups: `getItemLayout`? Nested lists? Index keys?
- [ ] FlashList vs FlatList — when to switch? Name three common list bugs.
