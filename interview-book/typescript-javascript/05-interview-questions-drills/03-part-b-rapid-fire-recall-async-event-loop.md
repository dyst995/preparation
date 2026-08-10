# 03. Part B - Rapid-fire recall (Async & Event Loop)

> Source: `interview-prep/typescript-javascript/05-interview-questions-drills.md`

11. **What's the event loop's priority order?**
    Finish the current synchronous script -> drain the entire microtask queue (including newly added microtasks) -> run exactly one macrotask -> repeat.

12. **Microtask vs macrotask - name 2 examples of each.**
    Microtasks: `Promise.then/.catch/.finally` callbacks, `queueMicrotask`. Macrotasks: `setTimeout`/`setInterval` callbacks, I/O callbacks, `setImmediate` (Node).

13. **Does `await` block the thread?**
    No - it suspends the `async` function and returns control to the event loop; the rest of the function resumes as a microtask once the awaited Promise settles.

14. **`Promise.all` vs `Promise.allSettled` - core difference?**
    `all` rejects immediately if any input rejects (fail-fast); `allSettled` always resolves once every input has settled, giving a per-item status/value/reason.

15. **`Promise.race` vs `Promise.any`?**
    `race` settles as soon as the first input settles, whether fulfilled or rejected. `any` resolves with the first *fulfillment* and only rejects (with an `AggregateError`) if every input rejects.

16. **Why doesn't `array.forEach(async fn)` actually wait for anything?**
    `forEach` ignores the return value of its callback entirely, so the Promises returned by each `async` invocation are fired off but never awaited - the loop itself completes synchronously and immediately.

17. **How do you run two independent `await` calls in parallel instead of sequentially?**
    Start both async calls without awaiting immediately, then await them together: `const [a, b] = await Promise.all([callA(), callB()]);`.

18. **What causes a "stale response wins" race condition, and how do you fix it?**
    Two async requests can resolve out of send order; an older request's response can arrive after a newer one and overwrite it. Fix with `AbortController` cancellation of the previous request, or by tracking a request id and ignoring responses that don't match the latest one.

19. **What is an unhandled Promise rejection, and why does it matter?**
    A rejected Promise with no `.catch()` or enclosing `try/catch` around its `await`. It can fail silently, log unhelpful warnings, or in Node (depending on version/flags) crash the process - "fire and forget" async calls should always have an explicit `.catch(logError)`.

---
