# Code Splitting — Next-day repetition

## How to use

1. Do **not** open `notes.md` first.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] What is code splitting? What does `React.lazy(() => import(...))` do, and what is `Suspense`’s role with lazy components?
- [ ] What is the highest-leverage default split strategy? Name three good component-level split candidates.
- [ ] Code splitting vs tree-shaking; route-based vs component-level splitting. What export shape does `React.lazy` expect?
- [ ] Why prefer route-based splits before splitting every widget? Why can too many Suspense boundaries feel worse than a bigger initial bundle?
- [ ] Why doesn’t code splitting replace list virtualization? What is preloading in this context?

## Predict / debug

- [ ] First visit `/` — is the Settings chunk downloaded if Settings is lazy and unused? State the result and explain why.
- [ ] Open a PDF modal the first time — what does the user see if Suspense wraps the lazy modal? Why?
- [ ] Chart library only used on `/analytics` — where should the split live? Why?
- [ ] Error: lazy component / suspended without Suspense. Diagnose and fix.
- [ ] `React.lazy(() => import('./X'))` fails; `X` only has `export function X`. Diagnose and fix.

## Say it out loud

- [ ] Explain code splitting in 30–60 seconds as if an interviewer asked.
- [ ] How would you reduce a React app's initial bundle size? Follow-up: what’s the downside of aggressive splitting? Follow-up: how do you hide lazy-route latency?
- [ ] Route-based vs component splitting — when each? How do you decide what to split?
