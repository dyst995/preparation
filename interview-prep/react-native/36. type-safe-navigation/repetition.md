# Type-safe navigation — Next-day repetition

## How to use

1. Do **not** open `notes.md` first. The full question bank is `self-test.md`; this file is the next-day subset.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] ParamList per navigator; `undefined` = no params. Why interviewers care. How to declare and how a screen reads (`NativeStackScreenProps`).
- [ ] `NavigatorScreenParams` for nested `{ screen, params }`. `CompositeScreenProps` when you navigate to tabs/root. No `any` on `route.params`.
- [ ] `ROUTES as const` aligned with `keyof ParamList`. `Home: undefined` vs `{}`. Types ≠ runtime “action not handled.”
- [ ] Spoken 30–60s typing answer.

## Predict / debug

- [ ] `navigate('TxDetails')` missing `id`. Tab payload when `WalletStack: undefined`. Home-only ScreenProps + `navigate('Receipt')`.
- [ ] `useRoute().params as any` and link omits `id`. `ROUTES` typo typed as `string`. Confirm from Home with `as never` — TS silent, runtime not handled.
- [ ] Linking `'TransferDetail'` vs ParamList `TransferDetails`. Two stacks, one shared ParamList, different TxDetails shapes.

## Say it out loud

- [ ] How do you type route params? Follow-up: how does a screen read them? Nested navigators — what do you do?
- [ ] `NativeStackScreenProps` vs `CompositeScreenProps`? Why not `any` on params?
- [ ] Recite: ParamList per navigator, composite for parents, NavigatorScreenParams, names in one module.
