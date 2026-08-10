# 02 - Async & the Event Loop — Introduction

> Source: `interview-prep/typescript-javascript/02-async-event-loop.md`

> Goal: Predict execution order of any mix of synchronous code, Promises, `async/await`, `setTimeout`, and I/O callbacks - and explain *why*, using the call stack, task queue, and microtask queue as first-class concepts. This is the single most common "predict the output" category in JS/TS interviews.

Mark progress with `[x]` as you master each topic.

---

## Learning objectives

By the end of this chapter you should be able to:

1. Draw and explain the relationship between the call stack, Web APIs / libuv, the macrotask (task) queue, and the microtask queue.
2. State the exact priority order the event loop uses to decide what runs next.
3. Predict output ordering for any interleaving of `console.log`, `setTimeout`, `Promise.then`, and `async/await`.
4. Explain how `async/await` desugars to Promises and why `await` doesn't block the thread.
5. Handle async errors correctly with `try/catch`, `.catch()`, and `Promise.allSettled`, and explain unhandled rejection risks.
6. Compare `Promise.all`, `allSettled`, `race`, and `any`, and choose correctly for a scenario.
7. Identify and fix common concurrency bugs: request race conditions, sequential-when-should-be-parallel awaits, and missing cancellation.
8. Tie this model to real bugs in React effects, RN network calls, and NestJS request handling.

---
