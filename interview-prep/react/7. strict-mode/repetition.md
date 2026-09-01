# `React.StrictMode` — What It Actually Does — Next-day repetition

## How to use

1. Do **not** open `notes.md` first.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] Does StrictMode’s double-invoke behavior run in production? Name three things StrictMode does in development.
- [ ] What is the React 18 initial-mount effect sequence under StrictMode? What bug class is that remount cycle designed to catch?
- [ ] What does double-invoking render help catch? Compare StrictMode double **render** vs double **effect** cycle.
- [ ] If an effect “breaks” under double-fire, what should you fix first? Why isn’t removing StrictMode a good first fix for duplicate fetches in an effect?
- [ ] Does StrictMode render any UI of its own? Name one legacy API it warns about.

## Predict / debug

- [ ] Dev + StrictMode; `useEffect(() => { console.log('setup'); return () => console.log('cleanup'); }, []);` on first mount — rough log order? State the result and explain why.
- [ ] Same effect in **production** on first mount — how many setups? State the result and explain why.
- [ ] `useEffect` fetches without abort; StrictMode remount — what can go wrong? State the result and explain why.
- [ ] “My effect runs twice only locally, not in prod build.” Diagnose. WebSocket opens two connections in dev; one remains after “fixing” by ignoring StrictMode. Diagnose the real issue and fix.

## Say it out loud

- [ ] Explain `React.StrictMode` in 30–60 seconds as if an interviewer asked.
- [ ] Why does `useEffect` run twice in development, and should you worry in production? Follow-ups: What should you fix if it breaks? What else does StrictMode do?
- [ ] Mount → cleanup → remount — why is that a good stress test?
