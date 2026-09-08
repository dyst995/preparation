# New Architecture: JSI, Fabric, Turbo Modules, Codegen — Next-day repetition

## How to use

1. Do **not** open `notes.md` first. The full question bank is `self-test.md`; this file is the next-day subset.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] Four pieces and one-line roles: JSI, Fabric, Turbo Modules, Codegen. Why is “New Architecture is Fabric” weak?
- [ ] Three legacy taxes Turbo Modules reduce. What does Codegen take in and emit?
- [ ] JSI vs Bridge MessageQueue; Fabric vs Turbo Modules; New Architecture vs Hermes.
- [ ] Why can JSI sync still be dangerous? Why lazy Turbo Module load matters at startup?
- [ ] Interop / dual support. Is New Architecture “just faster”? What else is the point?

## Predict / debug

- [ ] First Turbo Module call in a session — one-time cost vs eager Bridge modules. Explain why.
- [ ] `sync getBattery()` does heavy I/O natively. What happens to the JS thread? Explain why.
- [ ] Fabric on, but `onScroll` → `setState` every tick with large objects. Does Fabric erase that? Explain why.
- [ ] Interviewer: “You use Fabric for native modules.” Correct the mix-up. Payment SDK has no New Arch support — what do you flag?

## Say it out loud

- [ ] Explain New Architecture in 30–60 seconds (JSI → Turbo Modules → Fabric → Codegen → interop).
- [ ] Explain JSI, Fabric, and Turbo Modules simply. Follow-ups: Codegen? Just faster?
- [ ] You listed Turbo Modules on your CV — when did you actually need them?
