# Nested navigation architecture — Next-day repetition

## How to use

1. Do **not** open `notes.md` first. The full question bank is `self-test.md`; this file is the next-day subset.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] Production tree (Container → RootStack → Bootstrap / AuthStack / AppTabs+stacks / ModalStack). Four nesting rules.
- [ ] Gotcha: cross-tab without nested target → `action not handled` / wrong back. Tab first, then `screen`.
- [ ] Why ModalStack is a Root sibling. AuthStack sibling of AppTabs, not a tab. Bubble ≠ global names.
- [ ] Duplicate leaf names → nearest stack wins. Spoken nested-architecture answer.

## Predict / debug

- [ ] From Home: `navigate('Confirm')` (Confirm only on PaymentsStack). Correct `WalletStack` + `TxDetails` nested navigate; what does back do?
- [ ] `TxDetails` on **both** stacks; from Home `navigate('TxDetails')`. Notification `navigate('TransferDetails')` at the leaf. Receipt back to Login.
- [ ] `navigate('AppTabs', { screen: 'Confirm' })`. Help only on ProfileStack, opened from Home. Four tabs used as a transfer flow.

## Say it out loud

- [ ] Draw nested navigators for a wallet app. Follow-up: why not one stack? Home → Wallet TxDetails — how?
- [ ] What does “action not handled” mean? Where do Receipt modals live?
- [ ] Recite: tabs own sections; tab-then-screen; don’t flatten.
