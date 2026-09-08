# Context API — Next-day repetition

## How to use

1. Do **not** open `notes.md` first. The full question bank is `self-test.md`; this file is the next-day subset.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] Use vs avoid lists. Spoken sketch (Context / Zustand / RQ). Context = DI; no selectors; `Object.is` on the whole value re-renders all consumers.
- [ ] Why QueryClient is a good use. Why scroll/keystroke is not. Split contexts. Coarse auth presence vs full profile. `React.memo` does not skip Context.
- [ ] Why `value={{ theme }}` every render is a bug. Why `useMemo` on `{ y }` doesn’t save scroll-in-Context. Fat AppContext vs split.
- [ ] Theme vs selectedAccountId (Context vs Zustand). Taxonomy kind vs this unit’s **frequency** test.

## Predict / debug

- [ ] `value={{ theme }}` vs `useMemo(() => ({ theme }), [theme])` when parent re-renders. `ThemeButton` on a split theme ctx vs fat ctx that includes `y`.
- [ ] Auth context `user` from `useQuery(['me'])` every 30s. Search string in Context janks the tab bar. `value={{ isAuthenticated, login }}` without useMemo, App setStates often.
- [ ] `React.memo(WalletScreen)` still re-renders on theme change. i18n `t` new function every render. Token in Context updated on every refresh.
- [ ] Dark mode re-renders every wallet row; context holds `theme` + `transactions`. Split `theme, isAuthenticated, selectedAccountId` into the right tools.

## Say it out loud

- [ ] Recite the answer sketch. Where does Context fit / fail? Follow-up: why not the global store?
- [ ] Redux vs Zustand vs Context (plus RQ in one clause). Can auth live in Context — when?
- [ ] Explain Context vs a store in 30–60 seconds (fan-out + split + memo realities).
