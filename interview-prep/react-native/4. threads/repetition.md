# Threads: JS, UI/main, native modules — Next-day repetition

## How to use

1. Do **not** open `notes.md` first. The full question bank is `self-test.md`; this file is the next-day subset.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] JS vs UI/main vs native module threads — typical work. Does “native module” guarantee off-thread work?
- [ ] Four symptoms and three causes of a blocked JS thread. Can the process be alive while the app feels frozen?
- [ ] Why native `ScrollView` can pan when JS is busy — and what still janks. Where high-frequency animations should run.
- [ ] JS blocked vs UI thread busy vs Bridge congestion. Native-driven animation vs `setState` every frame.
- [ ] Why `async` doesn’t free JS during a CPU loop. Why sync JSI feels like JS blocked.

## Predict / debug

- [ ] 3-second `while` on press; native `ScrollView` on screen. JS `Pressable` taps vs scroll physics? Explain why.
- [ ] `onScroll` every tick `setState`s a large object. Smooth vs hitchy? Explain why.
- [ ] “RN froze” but you can fling the list; taps do nothing. First hypothesis?
- [ ] Scroll itself stutters; JS FPS high, UI FPS low. Which thread? They `memo` everything because startup `JSON.parse`s 8MB — why wrong first fix?

## Say it out loud

- [ ] Explain what runs where in 30–60 seconds as if an interviewer asked.
- [ ] What runs where? What if JS is blocked? Follow-ups: smooth scroll? JS vs UI jank?
- [ ] What’s the difference between Bridge congestion and a blocked JS thread?
