# Debugging toolkit — Next-day repetition

## How to use

1. Do **not** open `notes.md` first. The full question bank is `self-test.md`; this file is the next-day subset.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] Six-row problem → tool table. RN DevTools vs Flipper. React DevTools vs LogBox.
- [ ] Android vs iOS native crash tools. Why symbolicate / upload dSYMs?
- [ ] Prod-only → reproduce on what? Perf → Perf Monitor first, not LogBox.
- [ ] Why classify JS vs native first? Why debug isn’t a TestFlight repro?
- [ ] JS exception vs native crash vs ANR. Why segment Crashlytics by OEM?

## Predict / debug

- [ ] Stack is `libsomething.so` + abort — JS or native? `FooScreen.tsx` with source maps — next step? Explain why.
- [ ] Works in Metro, dies on Play internal. Two release-only causes? JS FPS ~0, UI FPS high, scroll still moves — which tool next?
- [ ] iOS crash is only `0x102ab…` — what’s missing? “Can’t reproduce” — four facts before code?
- [ ] They profiled FPS in debug and shipped `memo` everywhere. What’s wrong with the process?

## Say it out loud

- [ ] Explain your RN debugging playbook in 30–60 seconds.
- [ ] How do you debug a production-only crash? Follow-ups: JS vs native? Release build? Flipper?
- [ ] Walk the tool table: wrong UI vs Android crash vs jank.
