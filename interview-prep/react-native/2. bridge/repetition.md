# The old Bridge architecture — Next-day repetition

## How to use

1. Do **not** open `notes.md` first. The full question bank is `self-test.md`; this file is the next-day subset.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] What is the legacy Bridge? Async, serialize, batch — what does each mean? Is the Bridge a native module?
- [ ] Why serialize? Why were true synchronous native reads painful?
- [ ] What is bridge congestion? Where should high-frequency animations run relative to the Bridge?
- [ ] Congestion vs JS thread blocked; native-driven vs JS-driven animation.
- [ ] Occasional native command vs per-scroll-tick traffic. What tax do JSI/Turbo Modules drop (high level)?

## Predict / debug

- [ ] JS calls `NativeModules.Foo.getId()` and on the next line reads a variable it expected native to have set. What’s wrong? Explain why.
- [ ] Native `ScrollView` plus `onScroll` → `setState` every event with a large object. What feels smooth vs hitchy? Explain why.
- [ ] Animate `marginTop` from JS every `requestAnimationFrame` without a native driver. Which layer gets chatty? Explain why.
- [ ] Profiler: native scroll FPS fine, JS busy on every scroll event. Someone said “RN is slow.” Diagnose and first fix direction.

## Say it out loud

- [ ] Explain the old Bridge in 30–60 seconds as if an interviewer asked.
- [ ] What is the bridge, and what problems does it cause? Follow-ups: congestion example? Did animations belong on the JS thread?
- [ ] If Fabric and Turbo Modules exist, why interview the Bridge at all?
