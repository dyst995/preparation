# Legacy modernization playbook — Next-day repetition

## How to use

1. Do **not** open `notes.md` first. The full question bank is `self-test.md`; this file is the next-day subset.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] Steps 0–4 by name. Step 0 list. Step 1 three seam moves. Step 2: vertical slice, weekly ship, characterization tests. Step 3 three. Step 4 three metrics.
- [ ] CV map: MyCreditInfo, Wizer, Online School, EasyPay (one phrase each). EasyPay is **not** a strangler. Online School deadline → strangler.
- [ ] Why big-bang is a weak first answer. Why “no new code in legacy” matters. Why lint > README. Crash numbers you can say (~20% → 0.03% MyCreditInfo, etc.).
- [ ] Vertical slice vs all-hooks. This playbook vs type-vs-feature (how vs target).

## Predict / debug

- [ ] Four-month rewrite freeze — skipped steps and merge outcome? `features/` exists but PRs still add `src/screens/` — what happens to soup?
- [ ] Weekend folder rename, crash rate unchanged. Extract `utils/` while 80% crashes are one god screen. EasyPay described as strangling `screens/`.
- [ ] Stakeholder wants a rewrite; 20% crashes; store train this week. Two squads still fighting in `components/` six months in. Crash-free up, pay conversion down.
- [ ] Dead native dep blocking New Architecture. No dSYMs. Fees wrong after extract, no characterization tests.

## Say it out loud

- [ ] Walk through modernizing a legacy RN app. Follow-ups: why not rewrite? how do you show it worked?
- [ ] 60–90s MyCreditInfo using 0→4 and the crash numbers. One sentence each: Wizer, Online School, EasyPay.
- [ ] Explain the playbook in 30–60 seconds as if they asked “how do you refactor a messy RN codebase?”
