# Profiling with React DevTools — Next-day repetition

## How to use

1. Do **not** open `notes.md` first.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] What does the React DevTools Profiler record? What does a bar in the flame graph represent, and what do gray bars typically mean?
- [ ] Flame graph vs ranked chart — when each? Name four “why did this render” reasons DevTools might show.
- [ ] React Profiler vs Chrome Performance panel. When should you open Chrome Performance instead of (or after) the React Profiler?
- [ ] High render **count** vs high render **duration**. Colocating state vs adding `React.memo` for sibling re-renders.
- [ ] Why profile a single interaction instead of browsing for minutes? Why re-measure after adding `memo`? Why can the Profiler look fine while the page still feels janky?

## Predict / debug

- [ ] Typing in search: SearchBox + ProductGrid + UnrelatedSidebar all colored. Likely state placement? State the interpretation and explain why.
- [ ] Same typing: only SearchBox colored; ProductGrid gray. Interpretation? Why?
- [ ] Ranked chart: `VirtualList` tiny, `HeavyChart` 40ms every parent update. Direction? Why?
- [ ] Profiler shows `Row` “props changed” on every parent keystroke; `onClick` is inline. Diagnose and fix.
- [ ] User says scroll is janky; React commit bars are ~1ms. Next tool/hypothesis?

## Say it out loud

- [ ] Explain how you’d use the React DevTools Profiler in 30–60 seconds as if an interviewer asked.
- [ ] Walk me through how you'd investigate "this page feels slow" using React DevTools. Follow-up: what if the expensive work isn’t in React? Follow-up: how do you know `memo` helped?
- [ ] How do you tell wasted re-renders from expensive render work in the Profiler?
