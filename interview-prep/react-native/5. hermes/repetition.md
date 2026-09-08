# Hermes — Next-day repetition

## How to use

1. Do **not** open `notes.md` first. The full question bank is `self-test.md`; this file is the next-day subset.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] What is Hermes (not New Architecture)? Bytecode in release vs parse-on-device? What is TTI?
- [ ] Hermes vs Metro vs JSC vs New Architecture — one line each.
- [ ] Metrics after enable/upgrade. Why verify a release binary, not only a config flag?
- [ ] Why bytecode helps cold start more than list FPS. Why “Hermes makes everything faster” is weak.
- [ ] Parse/compile cost vs React render cost. “Better memory” vs fixing a leak.

## Predict / debug

- [ ] Config enables Hermes but release still ships a plain JS bundle. What TTI win might you miss? Explain why.
- [ ] Debug TTI looks worse than a competitor’s store app. Proof Hermes is slow? Explain why.
- [ ] “Enable Hermes to fix unvirtualized ScrollView `.map` jank.” What happens to jank? Explain why.
- [ ] “Just enable Hermes, it’ll fix performance.” How do you respond? Memory still climbs after Hermes — what’s the misconception?

## Say it out loud

- [ ] Explain Hermes in 30–60 seconds as if an interviewer asked.
- [ ] What is Hermes and why do teams use it? Follow-ups: metrics? Is it New Architecture?
- [ ] You’re told to enable Hermes to fix FPS. How do you respond?
