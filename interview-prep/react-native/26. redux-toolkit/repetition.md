# Redux Toolkit — Next-day repetition

## How to use

1. Do **not** open `notes.md` first. The full question bank is `self-test.md`; this file is the next-day subset.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] Spoken complexity-not-fashion answer. Four “still makes sense.” Three “unnecessary.” Overuse = stuffing everything (especially server data).
- [ ] Single store + slices. Immer mutative syntax but immutable result. Reducers stay pure. Listeners vs fetch-in-reducer.
- [ ] Time-travel is for **client** machines, not CRUD lists. Wizer: don’t rewrite. EasyPay: Zustand + RQ.
- [ ] `useSelector(s => s)` fan-out. RTK vs RTKQ (different jobs — don’t dump §6).

## Predict / debug

- [ ] `createAsyncThunk` fills `balances`; no RQ. EasyPay Redux for `isFilterOpen`. `state.step += 1` in a slice — illegal? `await api` inside `nextStep`.
- [ ] `useSelector(s => s)` when onboarding.step changes. Delete Redux on Wizer in week one. Every GET is a thunk into slices.
- [ ] Modal `open` in `uiSlice` for one screen. Immer mutate **and** return. Time-travel can’t reproduce a balance bug. 90% of store is server clones — first move?

## Say it out loud

- [ ] Recite the interview answer. Follow-up: when **would** you add RTK?
- [ ] You inherit Wizer (Redux-heavy). What do you do? Why not put server data in Redux?
- [ ] Explain RTK vs Zustand + RQ in 30–60 seconds (complexity, not fashion; Immer in one clause).
