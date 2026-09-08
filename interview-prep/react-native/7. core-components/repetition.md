# Components map to native views — Next-day repetition

## How to use

1. Do **not** open `notes.md` first. The full question bank is `self-test.md`; this file is the next-day subset.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] Host/core vs composite. `View` vs `Text` — can `View` hold a raw string?
- [ ] Why nest `Text` in `Text`? `ScrollView` vs `FlatList` with children?
- [ ] Local vs remote `Image`. Why prefer `Pressable`? `onChangeText` vs `onChange`?
- [ ] Why `ScrollView` + 500-row `.map` is a problem. Why View `color` doesn’t CSS-inherit to `Text`.
- [ ] Web `div`/`onClick`/`<button>` vs RN primitives.

## Predict / debug

- [ ] `<View>Hello</View>` — does it run? Explain why.
- [ ] 200 feed items in `ScrollView` `.map` — what mounts? Failure mode?
- [ ] `View` with `color: 'gray'` wrapping `Text` — gray like CSS? Explain why.
- [ ] Redbox: text child of `View`. Fix? Feed stutters; they memoized `Row` but still use `ScrollView` — real issue?

## Say it out loud

- [ ] Explain RN core components mapping to native views in 30–60 seconds.
- [ ] How do RN core components map to native views? Follow-ups: why `Text`? ScrollView vs FlatList? Pressable?
- [ ] Why doesn’t every web HTML element have an RN twin?
