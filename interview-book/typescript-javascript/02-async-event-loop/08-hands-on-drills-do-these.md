# 08. Hands-on drills (do these)

> Source: `interview-prep/typescript-javascript/02-async-event-loop.md`

- [ ] Write a script mixing `console.log`, `setTimeout`, and 2-3 chained `.then()` calls; predict the exact output order on paper, then run it and check.
- [ ] Implement a `delay(ms)` helper using `new Promise` + `setTimeout`, then use it with `async/await` in a loop to log values 1 second apart.
- [ ] Take a sequential-`await` function fetching two independent resources and refactor it to `Promise.all`; measure/reason about the time difference.
- [ ] Implement debounced search with an `AbortController` that cancels the previous in-flight request.
- [ ] Write a function using `Promise.allSettled` that fetches from 3 endpoints and returns `{ succeeded: [...], failed: [...] }`.
- [ ] Intentionally create an unhandled rejection (`async function` that throws, called without `await`/`catch`) and observe the runtime's warning/behavior in Node and in a browser console.
- [ ] Implement a tiny concurrency-limited batch runner: given an array of async tasks and a `limit`, never run more than `limit` at once (a common "hard mode" interview follow-up to `Promise.all`).

---
