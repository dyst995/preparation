# Platform-specific code — Next-day repetition

## How to use

1. Do **not** open `notes.md` first. The full question bank is `self-test.md`; this file is the next-day subset.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] Four-row table: `select` vs `Platform.OS` if vs platform files vs native module.
- [ ] What is platform soup? Should domain (e.g. fees) use `Platform.OS`?
- [ ] `.ios` vs `.native`. Who picks `Button.ios.tsx` — React or Metro?
- [ ] Why isolate OS at the UI/native boundary? Why not split files for 8px padding?
- [ ] `Platform.OS` vs `Platform.Version`. Why not `Platform.OS` for tablet layout?

## Predict / debug

- [ ] iOS `import './Sheet'` with `Sheet.ios.tsx` and `Sheet.android.tsx` — which loads? Explain why.
- [ ] `Platform.select({ android: 8, default: 12 })` on iOS — value? Explain why.
- [ ] 12 `Platform.OS` checks in `usePayment.ts` — what do you ask in review?
- [ ] Only `Camera.ios.tsx` exists; Android can’t resolve `./Camera`. What’s missing?

## Say it out loud

- [ ] Explain platform-specific code in 30–60 seconds as if an interviewer asked.
- [ ] `Platform.OS` vs separate files? Follow-ups: `select` vs `if`? Native module? Platform in domain?
- [ ] How do `.ios` files get chosen?
