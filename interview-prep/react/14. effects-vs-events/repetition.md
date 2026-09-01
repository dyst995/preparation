# Effects vs Events — Next-day repetition

## How to use

1. Do **not** open `notes.md` first.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] What question does an effect answer vs an event handler? What is the decision checklist sentence for choosing an effect?
- [ ] Sketch the `submitted` flag anti-pattern in one sentence. Why can that anti-pattern double-fire analytics in development?
- [ ] Classify: click → toast; `roomId` changes → resubscribe WebSocket; form POST on Save click; keep `document.title` in sync with `post.title`.
- [ ] Why is “when the user clicks” a hint against `useEffect`? Why might fetch-on-`id`-change be a legitimate effect while fetch-on-submit is not?
- [ ] Compare sync-with-external-system vs respond-to-interaction, and `setSubmitted(true)` indirection vs calling `sendAnalytics` in `handleSubmit`.

## Predict / debug

- [ ] BAD Form with `submitted` effect + StrictMode initial remount while `submitted` somehow true — risk? State the result and explain why.
- [ ] GOOD handler `sendAnalytics` on submit — how many times per click (normally)? State the result and explain why.
- [ ] Effect `[userId]` loads user; user clicks nothing but `userId` prop changes — does load run? Should it? State the result and explain why.
- [ ] Duplicate `purchase` analytics in React 18 StrictMode only. Code uses flag + effect. Diagnose and fix.

## Say it out loud

- [ ] Explain effects vs events in 30–60 seconds as if an interviewer asked.
- [ ] How do you decide between an effect and an event handler?
- [ ] Give an example of using `useEffect` when a handler was correct — and why that’s a problem. Follow-ups: StrictMode? Fix?
