# Deep linking and universal links — Next-day repetition

## How to use

1. Do **not** open `notes.md` first. The full question bank is `self-test.md`; this file is the next-day subset.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] Mental map (`myapp://transfers/123` → tabs → stack → Details). Six auth+link steps. Both spoken Qs (how it works; how you test).
- [ ] Scheme vs universal/App Links. `linking` nests like the tree. Wait hydrate; queue if logged out; authorize on the server.
- [ ] Don’t trust `amount`. Fallback for bad paths. Cold / warm / logged-out tests. `adb` + `simctl`.
- [ ] HTTPS ≠ permission. `?next=` open-redirect.

## Predict / debug

- [ ] Flat `TransferDetails: 'transfers/:id'` vs nested screen. URL during `!hydrated` while logged out. No URL queue after login.
- [ ] 403 but UI shows `?name=` from the link. Typo path, no fallback. Pay link auto-submits `to` + `amount`.
- [ ] https emails open Safari (no AASA). Login flash then Details. Staging flavor host not in prefixes.

## Say it out loud

- [ ] How do deep links work in RN? Follow-up: nested navigators? Logged out?
- [ ] How do you test? Cold vs warm? Can you trust `amount` in the URL?
- [ ] Recite the six-step sequence as a 30–60s story from “user taps the email.”
