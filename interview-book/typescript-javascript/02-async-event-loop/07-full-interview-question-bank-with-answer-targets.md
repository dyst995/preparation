# 07. Full interview question bank (with answer targets)

> Source: `interview-prep/typescript-javascript/02-async-event-loop.md`

### Event loop mechanics
1. **What runs first: a `setTimeout(fn, 0)` or a `Promise.resolve().then(fn)` scheduled at the same time?** -> the Promise microtask always wins.
2. **What's the priority order of the event loop?** -> finish sync script -> drain all microtasks (including newly added ones) -> next single macrotask -> repeat.
3. **Can microtasks starve macrotasks?** -> yes, if they keep re-enqueueing themselves.
4. **What is `process.nextTick` and how does it relate to microtasks?** -> Node-only queue, higher priority than Promise microtasks.

### Promises
5. **What are the 3 Promise states, and can a settled Promise change state?** -> pending/fulfilled/rejected; no, settling is permanent.
6. **`Promise.all` vs `allSettled` vs `race` vs `any`?** -> fail-fast-all vs always-all-with-status vs first-settled vs first-fulfilled.
7. **What happens to a thrown error inside a `.then()`?** -> the chain's resulting Promise rejects, propagating to the next rejection handler/`.catch()`.

### async/await
8. **Does `async function` always return a Promise?** -> yes, even for a plain returned value.
9. **Does `await` block the thread?** -> no, it suspends the function and yields to the event loop.
10. **How do you run two independent awaited calls in parallel instead of sequentially?** -> start both Promises first (no await), then `Promise.all` them.
11. **How does `try/catch` interact with `await`?** -> catches Promise rejections exactly like synchronous throws.

### Concurrency pitfalls
12. **What causes a stale-response race condition, and how do you prevent it?** -> out-of-order network responses; fix with request-id tracking or `AbortController`.
13. **Why doesn't `.forEach(async fn)` wait for anything?** -> it ignores the returned Promises, firing all callbacks immediately.
14. **What's an unhandled Promise rejection, and why is it dangerous?** -> a rejected Promise with no `.catch()`/`try-catch`; can silently fail or crash depending on runtime/flags.

---
