# How React Native differs from React on the web — Next-day repetition

## How to use

1. Do **not** open `notes.md` first. The full question bank is `self-test.md`; this file is the next-day subset.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] What stays the same between React web and React Native, and what changes? What does “host” mean?
- [ ] What do `View` and `Text` map to on iOS and Android? Is RN a WebView?
- [ ] Name three browser things you do not have in RN the same way. Why do many “works with React” npm packages fail?
- [ ] Styling vs web CSS (cascade / Yoga) and navigation vs URL-first — one sentence each.
- [ ] `react-dom` commit vs RN renderer commit; optional `WebView` vs “the app is a WebView.”

## Predict / debug

- [ ] `return <View>Hello</View>` — does this run in RN? State the result and explain why.
- [ ] `style={{ color: 'gray' }}` on a `View` wrapping `<Text>Hi</Text>` — does the text go gray like CSS? Explain why.
- [ ] A web engineer says RN is slower because the virtual DOM goes through a WebView. Diagnose the misconception.
- [ ] Same flex mental model, no `flexDirection` — stacked on RN, row-like on web. What’s the default trap?

## Say it out loud

- [ ] Explain how RN differs from React on the web in 30–60 seconds as if an interviewer asked.
- [ ] How does React Native render UI compared to React on the web? Follow-ups: WebView? `View`/`Text`? Why don’t DOM libraries work?
- [ ] What web skills transfer, and what do you have to relearn?
