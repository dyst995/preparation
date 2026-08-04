# 02 - Async & the Event Loop

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

## 1. JavaScript is single-threaded - what that actually means

### Topics to learn
- [ ] One call stack, one thread of JS execution (per realm/worker)
- [ ] "Async" doesn't mean "multi-threaded" for user JS code - it means non-blocking I/O delegation
- [ ] Where the *actual* concurrency happens: browser Web APIs / Node's libuv thread pool, not JS itself
- [ ] Why a long synchronous loop freezes everything, including UI and other pending callbacks

### Core idea

JavaScript executes on a single call stack - only one piece of JS code runs at any given instant. When you call `setTimeout`, `fetch`, or a file read, you're not spawning a JS thread to wait - you're handing the waiting work off to the **host environment** (the browser's Web APIs, or Node's libuv/C++ thread pool). The host notifies JS via callbacks queued for later, but the JS engine itself is still doing one thing at a time.

This is why a synchronous CPU-heavy loop "blocks everything": there's nothing else that can run on that one thread until the loop finishes, no matter how many pending network responses or timers are waiting - they just queue up.

```js
console.log('start');
setTimeout(() => console.log('timeout'), 0);
console.log('end');
// start, end, timeout - even with a 0ms delay, the callback waits for the current
// synchronous code to fully finish and the stack to empty
```

### Interview question

**Q: If `setTimeout(fn, 0)` has a 0ms delay, why doesn't `fn` run immediately?**

**Strong answer:**
> "`setTimeout` never runs its callback synchronously or immediately, even with a 0ms delay - the delay is a *minimum*, not a guarantee. The callback is handed to the timer facility, and once the delay elapses it's placed in the macrotask queue. The event loop only pulls from that queue once the call stack is completely empty - so any currently-running synchronous code, including code after the `setTimeout` call itself, runs first."

---

## 2. The event loop: call stack, task queue, microtask queue

### Topics to learn
- [ ] Call stack - synchronous execution, LIFO
- [ ] Macrotasks (a.k.a. "tasks"): `setTimeout`, `setInterval`, I/O callbacks, UI rendering steps, `setImmediate` (Node)
- [ ] Microtasks: Promise `.then`/`.catch`/`.finally` callbacks, `queueMicrotask`, `async/await` continuations, `MutationObserver`
- [ ] The event loop algorithm: run one macrotask, then drain the **entire** microtask queue, then repeat
- [ ] Microtasks can starve macrotasks if they keep enqueueing more microtasks
- [ ] Node-specific nuance: `process.nextTick` runs before other microtasks (Node only, not a web standard)

### The priority order (memorize this)

1. Run the current synchronous script to completion (the initial macrotask).
2. Drain the **entire microtask queue** - including any new microtasks *added while draining* - until it's empty.
3. (Browser) Perform any pending rendering/UI updates if it's time to paint.
4. Pull the **next single macrotask** from the task queue and run it to completion.
5. Go back to step 2.

**The critical rule: microtasks always fully drain before the next macrotask runs - even if new microtasks keep getting added.** This is the single fact that resolves 90% of "predict the output" questions.

### Worked example

```js
console.log('1: sync start');

setTimeout(() => console.log('2: timeout'), 0);

Promise.resolve()
  .then(() => console.log('3: promise 1'))
  .then(() => console.log('4: promise 2'));

console.log('5: sync end');

// Output:
// 1: sync start
// 5: sync end
// 3: promise 1
// 4: promise 2
// 2: timeout
```

Walkthrough:
- Lines 1 and 5 run synchronously first - the whole script is the initial macrotask and must finish.
- `setTimeout`'s callback is queued as a **macrotask**, even at 0ms.
- `.then()` callbacks are queued as **microtasks**.
- Once the sync script finishes, the microtask queue is drained: "promise 1" logs, which synchronously enqueues another microtask ("promise 2" `.then`), which also runs before moving on - **new microtasks jump the line ahead of any macrotask**.
- Only after the microtask queue is completely empty does the event loop pull the next macrotask: the timeout callback.

### Interview question

**Q: Can microtasks ever prevent macrotasks (like `setTimeout` or rendering) from running at all?**

**Strong answer:**
> "Yes - if a microtask callback keeps scheduling more microtasks (for example, a `.then()` that calls itself recursively via another `.then()`), the microtask queue never empties, so the event loop never reaches the next macrotask or, in a browser, the next paint. This is a real starvation bug, sometimes seen with runaway recursive Promise chains, and it manifests as a frozen UI even though `setTimeout` callbacks are technically 'scheduled.'"

---

## 3. Promises

### Topics to learn
- [ ] Three states: pending, fulfilled, rejected - and that a settled Promise never changes state again
- [ ] `.then(onFulfilled, onRejected)`, `.catch()`, `.finally()`
- [ ] Promise chaining and value/error propagation through the chain
- [ ] Returning a Promise from `.then()` flattens it (no nested Promises) - this is why chains don't need manual unwrapping
- [ ] `Promise.resolve()` / `Promise.reject()` for wrapping values
- [ ] `Promise.all`, `Promise.allSettled`, `Promise.race`, `Promise.any` - differences and use cases
- [ ] Errors thrown inside a `.then()` callback become a rejection of the resulting Promise, caught by the next `.catch()`

### States and settling

A Promise starts **pending** and can transition exactly once to either **fulfilled** (with a value) or **rejected** (with a reason). Once settled, it's immutable - calling `resolve`/`reject` again does nothing.

### Combinators comparison table

| Method | Resolves when | Rejects when | Result shape | Typical use |
|---|---|---|---|---|
| `Promise.all` | all fulfill | **any one** rejects (fails fast) | array of values, same order | "I need everything, and any failure is fatal" |
| `Promise.allSettled` | always, once all settle | never | array of `{status, value/reason}` | "I need all results, failures are OK / handled individually" |
| `Promise.race` | first one settles (fulfilled or rejected) | first one settles as rejected | the first settled value/reason | timeouts, "whichever finishes first wins" |
| `Promise.any` | first one **fulfills** | only if **all** reject (`AggregateError`) | first fulfilled value | "any success is enough, ignore individual failures" |

### Interview question

**Q: You need to fetch a user's profile and their settings in parallel, and the screen should render if either succeeds, showing partial data if one fails. Which combinator, and why?**

**Strong answer:**
> "`Promise.allSettled` - I need to know the outcome of *both* requests regardless of individual failure, so I can render whichever data actually came back and show a fallback or error state for the other. `Promise.all` would be wrong here because a single rejection would reject the whole thing and I'd lose the successful result. If I only needed 'at least one succeeded, don't care which,' `Promise.any` would fit instead."

### Common bug: swallowed errors mid-chain

```js
fetchUser()
  .then(user => {
    throw new Error('transform failed');
  })
  .then(user => console.log(user)) // skipped - error propagates past .then without onRejected
  .catch(err => console.error(err)); // catches it here
```

A thrown error (or a rejected Promise) skips forward past any `.then()` calls that only supply `onFulfilled`, landing at the next `.catch()` (or a `.then(onFulfilled, onRejected)` with a rejection handler). This propagation is exactly like synchronous `try/catch` skipping to the nearest `catch` block.

---

## 4. `async`/`await`

### Topics to learn
- [ ] `async function` always returns a Promise, even if you `return` a plain value
- [ ] `await` pauses the `async` function's execution and yields control back to the caller - it does NOT block the thread
- [ ] Under the hood, `await` is sugar over `.then()` - the rest of the function becomes a microtask callback
- [ ] `try/catch` around `await` catches rejected Promises the same way it catches thrown synchronous errors
- [ ] Sequential vs parallel `await` - the #1 real-world performance bug
- [ ] `for await...of` for async iterables (awareness level)
- [ ] Top-level `await` (module-level, awareness of environment support)

### `async`/`await` is sugar over Promises

```js
async function getUser(id) {
  const res = await fetch(`/users/${id}`);
  const user = await res.json();
  return user;
}

// Roughly desugars to:
function getUser(id) {
  return fetch(`/users/${id}`)
    .then(res => res.json())
    .then(user => user);
}
```

Every `await` point is a place where the function suspends and control returns to the event loop; when the awaited Promise settles, the rest of the function body resumes as a **microtask**. This is why `async/await` doesn't block other code from running - it's just chained `.then()` calls with better readability and native `try/catch` support.

### The #1 real bug: accidental sequential awaits

```js
// BAD - sequential, ~2x slower than necessary
async function loadDashboard() {
  const user = await fetchUser();       // waits fully...
  const settings = await fetchSettings(); // ...before even starting this one
  return { user, settings };
}

// GOOD - parallel, both requests start immediately
async function loadDashboard() {
  const [user, settings] = await Promise.all([fetchUser(), fetchSettings()]);
  return { user, settings };
}
```

If the second request doesn't depend on the first request's result, awaiting them one at a time serializes two independent network calls for no reason. This is a frequent, easy-to-miss performance issue in real codebases (React data-fetching, NestJS service methods that call multiple independent repositories/APIs).

### Error handling with `async/await`

```js
async function safeLoad() {
  try {
    const data = await fetchData();
    return data;
  } catch (err) {
    // catches: fetch() rejecting, OR any synchronous throw in this try block
    logError(err);
    throw err; // re-throw if the caller needs to know
  } finally {
    setLoading(false); // always runs, success or failure
  }
}
```

`try/catch` around `await` works exactly like synchronous error handling, which is the main ergonomic win over raw `.then()/.catch()` chains for multi-step logic with branching.

### Interview question

**Q: Does `await` block the JavaScript thread while waiting?**

**Strong answer:**
> "No. `await` pauses execution of the current `async` function and immediately returns control to the caller / event loop - other code, other timers, other event handlers can run in the meantime. When the awaited Promise settles, the remainder of the function is scheduled as a microtask and resumes from where it left off. It *looks* synchronous in the code, but it never blocks the thread the way a synchronous loop would."

### Interview question

**Q: What's wrong with this, and how would you fix it?**

```js
async function loadAll(ids) {
  const results = [];
  for (const id of ids) {
    const item = await fetchItem(id);
    results.push(item);
  }
  return results;
}
```

**Strong answer:**
> "Each `fetchItem` call waits for the previous one to fully finish before starting the next, so N independent requests take N times as long as they need to. Since the fetches don't depend on each other, I'd map to an array of Promises and `Promise.all` them: `const results = await Promise.all(ids.map(fetchItem));`. If there were a concern about overwhelming the server with too many concurrent requests, I'd consider a concurrency-limited batch approach instead of full sequential or full parallel."

---

## 5. Concurrency pitfalls in real apps

### Topics to learn
- [ ] Race conditions from out-of-order async responses (stale response overwriting fresh state)
- [ ] Unhandled Promise rejections and why they matter (process crash in Node with strict flags, silent failures in browsers/RN)
- [ ] Cancellation: `AbortController` for `fetch`, manual "ignore stale response" flags in React effects
- [ ] Debounce vs throttle as concurrency-shaping tools, not just "performance tricks"
- [ ] Why `.forEach` cannot `await` correctly (it ignores returned Promises entirely)

### Race condition: stale response wins

```js
// BUG: if the user types "a" then quickly "ab", the "a" response might arrive
// AFTER the "ab" response, overwriting the correct result with stale data.
function onSearchChange(query) {
  fetchResults(query).then(results => setResults(results));
}
```

Fix patterns:
- **Ignore-stale-response flag**: capture a request id/ref, only apply the response if it matches the latest request.
- **`AbortController`**: cancel the previous in-flight request when a new one starts.

```js
let currentController;

async function onSearchChange(query) {
  currentController?.abort();
  currentController = new AbortController();
  try {
    const res = await fetch(`/search?q=${query}`, { signal: currentController.signal });
    setResults(await res.json());
  } catch (err) {
    if (err.name !== 'AbortError') throw err;
  }
}
```

This exact pattern is what React Query / SWR / RTK Query automate for you - knowing the manual version proves you understand *why* those libraries exist, not just that you can install them.

### `.forEach` does not await

```js
// BUG: forEach doesn't wait for the async callback's Promise - it fires all
// callbacks immediately and ignores the returned Promises entirely.
items.forEach(async (item) => {
  await save(item);
});
console.log('done'); // logs before any save() actually resolves
```

Fix: use a `for...of` loop with `await` inside (sequential), or `Promise.all(items.map(save))` (parallel), depending on whether order/concurrency matters.

### Unhandled rejections

```js
async function risky() {
  throw new Error('boom');
}
risky(); // no .catch(), no try/catch around a caller await
// -> "UnhandledPromiseRejection" - silently swallowed in some environments,
//    can crash a Node process depending on version/flags, and is a top source
//    of "it fails silently in production" bugs.
```

**Rule of thumb:** every Promise you create or call should end up either `await`-ed inside a `try/catch`, or have an explicit `.catch()` attached - "fire and forget" async calls are a code smell unless deliberately and visibly chosen (and even then, attach a `.catch(logError)`).

### Interview question

**Q: A user types quickly in a search box and occasionally sees results for an earlier, shorter query flash in after the correct results. What's happening and how do you fix it?**

**Strong answer:**
> "That's a classic race condition - multiple requests are in flight, and network timing doesn't guarantee they resolve in the order they were sent, so an older request's response can arrive after a newer one and overwrite it. I'd fix it either by tracking a request id or ref and only committing a response if it matches the latest request issued, or more cleanly with `AbortController`, cancelling the previous in-flight fetch whenever a new search starts. This is exactly the problem libraries like React Query solve automatically via query keys and cancellation."

---

## 6. Node/Nest and RN-specific notes

### Topics to learn
- [ ] `process.nextTick` (Node) runs before Promise microtasks, in its own even-higher-priority queue
- [ ] Node's macrotask phases (timers, pending callbacks, poll, check/`setImmediate`, close callbacks) - awareness level, not memorization-critical
- [ ] React Native's JS thread runs the same single-threaded event-loop model (via Hermes/JSC), so this entire chapter transfers directly - no special RN async model
- [ ] NestJS request handlers are `async` by convention; unhandled rejections in a controller/service can crash the process if not caught by Nest's exception handling layer or your own try/catch

### Interview question

**Q: Does React Native have a different event loop than the browser?**

**Strong answer:**
> "No - the JS thread in RN runs on a standard JS engine, Hermes or JSC, which implements the same single-threaded event loop, call stack, and micro/macrotask model as any other JS runtime. What's different in RN is the *native* side - a separate UI thread handles native rendering, and native module calls cross a bridge/JSI boundary - but from the perspective of my JS code's async behavior, Promises, `async/await`, and `setTimeout` all behave exactly as they would in a browser or Node."

---

## Full interview question bank (with answer targets)

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

## Hands-on drills (do these)

- [ ] Write a script mixing `console.log`, `setTimeout`, and 2-3 chained `.then()` calls; predict the exact output order on paper, then run it and check.
- [ ] Implement a `delay(ms)` helper using `new Promise` + `setTimeout`, then use it with `async/await` in a loop to log values 1 second apart.
- [ ] Take a sequential-`await` function fetching two independent resources and refactor it to `Promise.all`; measure/reason about the time difference.
- [ ] Implement debounced search with an `AbortController` that cancels the previous in-flight request.
- [ ] Write a function using `Promise.allSettled` that fetches from 3 endpoints and returns `{ succeeded: [...], failed: [...] }`.
- [ ] Intentionally create an unhandled rejection (`async function` that throws, called without `await`/`catch`) and observe the runtime's warning/behavior in Node and in a browser console.
- [ ] Implement a tiny concurrency-limited batch runner: given an array of async tasks and a `limit`, never run more than `limit` at once (a common "hard mode" interview follow-up to `Promise.all`).

---

## Senior red flags / green flags

### Green flags interviewers love
- You immediately mention "microtask queue fully drains before the next macrotask" without prompting.
- You explain `async/await` as sugar over Promises/`.then()`, not a separate magic mechanism.
- You catch the sequential-`await` performance bug on sight and fix it with `Promise.all`.
- You bring up `AbortController`/race conditions unprompted when discussing search-as-you-type or fast navigation.
- You treat "fire and forget" async calls as a smell requiring an explicit `.catch()`.

### Red flags
- Says `setTimeout(fn, 0)` "runs immediately" or "runs before Promises."
- Believes `async/await` makes code "actually run in parallel" by default.
- Cannot explain why `.forEach` with an `async` callback doesn't wait.
- No mental model for what happens to an error thrown inside a `.then()` with no matching `.catch()`.
- Thinks React Native has a fundamentally different async/event-loop model than the browser.

---

## Tie-backs to your experience

- Search-as-you-type, tab-switching data fetches, and pull-to-refresh in RN apps are classic race-condition surfaces - describing a real fix (abort/ignore-stale-response) is a strong, concrete story.
- NestJS service/controller methods being `async` by convention means every unhandled rejection risk in this chapter applies directly to backend request handling - global exception filters are the safety net, but understanding *why* you still need try/catch in services matters.
- Parallelizing independent `await` calls is a cheap, real performance win you can point to in dashboard/profile-loading screens.

---

## Senior-Level Best Practices

### Decision frameworks & tradeoffs

**`Promise.all` vs. concurrency-limited batching - the real decision criteria.** Don't default to "always limit concurrency, it's safer." Ask: (1) Does the target system have a known rate limit or connection cap? (2) Is the number of concurrent items bounded and small (tens) or unbounded/large (hundreds+)? (3) Is partial-failure-is-fatal acceptable? For a small, bounded, internal set of calls, `Promise.all` is simpler and faster to ship; for anything hitting a third-party API, writing to a database with connection pool limits, or processing a user-uploaded file of unknown size, a concurrency limiter (`p-limit`, or a hand-rolled semaphore) is the senior default, not an afterthought added after a production incident.

**Retry logic: exponential backoff vs. fixed delay vs. no retry.** A transient network blip warrants a retry; a `4xx` client error (bad request, unauthorized) does not - retrying it just repeats the same failure and wastes time/quota. The decision framework: retry only on `5xx`/network-level failures, use exponential backoff with jitter (not fixed delay, which causes retry storms when many clients fail simultaneously and all retry at the same fixed interval), and always cap the total retry count/time budget so a persistently down dependency fails fast rather than hanging a request indefinitely.

**Sequential vs. parallel awaits - beyond the obvious case.** The chapter's `Promise.all` fix is correct when calls are truly independent, but sometimes "looks independent" isn't quite true - e.g., two calls that both write to the same resource need ordering even if they don't read each other's return value, to avoid a write-write race at the data layer. Senior-level judgment means checking for *side-effect* dependencies, not just *data* dependencies, before parallelizing.

### Production checklists

- [ ] Every `fetch`/network call has a timeout - `AbortController` combined with `setTimeout(() => controller.abort(), ms)` - since browsers/Node don't apply a sane default timeout, and a hung request can block a user-facing flow indefinitely.
- [ ] Every "fire and forget" async call has an explicit `.catch(logError)` or is wrapped in `try/catch` with logging - no bare `asyncFn()` calls with no rejection handling anywhere in the codebase (enforced via `no-floating-promises` from `@typescript-eslint/eslint-plugin`, which is one of the highest-value lint rules for async-heavy codebases).
- [ ] Search-as-you-type, tab-switching, and any "latest request wins" UI flow uses `AbortController` or a request-id guard - verified with a manual slow-3G-throttled test, not just happy-path testing.
- [ ] NestJS global exception filter is confirmed to actually catch rejected Promises from controllers/services (not just synchronous throws) - test with a deliberately rejecting async route handler.
- [ ] Long-running batch/background jobs use a concurrency limiter with a sane cap (tuned to the downstream system's actual limits), not raw `Promise.all` over an unbounded array.
- [ ] Unhandled rejection and uncaught exception handlers (`process.on('unhandledRejection', ...)`, `process.on('uncaughtException', ...)`) are wired to logging/alerting in every Node service - silent process crashes with no log line are a common on-call nightmare.

### Anti-patterns

- **Wrapping every `await` in its own isolated `try/catch` that just logs and swallows the error, letting execution continue with an undefined value.** This turns real failures into silent `undefined`-propagation bugs downstream, often worse than the original error. Catch where you can meaningfully recover or need to add context, then re-throw or return an explicit error result - don't catch-and-continue by default.
- **Using `setTimeout(fn, 0)` as a manual "yield to the event loop" hack sprinkled through a codebase** instead of understanding *why* the yield is needed. This usually signals someone patched a symptom (a frozen UI, a starved macrotask) without understanding the underlying blocking synchronous code, which is the actual bug.
- **Chaining `.then()` many levels deep instead of `async/await`** in new code - not wrong, but a readability regression once a codebase has both styles; pick one as a team convention (most teams: `async/await` for all new code, `.then()` reserved for genuinely fluent one-liners).
- **Polling with `setInterval` for something that has a proper event-driven or Promise-based API available** (e.g., polling a flag instead of `await`-ing a Promise that resolves when the condition is met, or polling for a DOM state change instead of `MutationObserver`). Polling wastes CPU and adds latency up to the poll interval; use it only when no push-based mechanism exists.

### Failure modes

- **Retry storms** - many clients simultaneously hit a failing dependency, all retry with the same fixed delay, and the resulting synchronized retry wave overwhelms the dependency again right as it's recovering. Fixed by jittered exponential backoff (randomizing the delay slightly per client).
- **Cascading timeouts in a service chain** - service A calls B calls C; if C is slow and A's timeout is shorter than B's, A gives up and returns an error to its caller while B and C are still working, potentially completing a write that A's caller thinks failed (a "successful failure" - the operation actually succeeded server-side but the caller believes it didn't, leading to duplicate submission on retry).
- **Node process crash from an uncaught async error** with no diagnostic trace - if `unhandledRejection` handling isn't wired to a logger, the process can silently restart (under a process manager like PM2) with zero record of what happened, making the incident nearly undiagnosable after the fact.
- **Memory growth from an unresolved Promise chain that never settles** - e.g., a Promise waiting on an event that never fires, holding closures and their captured variables alive indefinitely; commonly found via heap snapshots showing many pending Promise objects that should have long since settled.

### Observability

- Log at both the "request initiated" and "request settled" points for any significant async operation, including a correlation/request ID, so a stuck or slow request is traceable in aggregate logs (not just visible as a generic timeout to the end user).
- Track P50/P95/P99 latency for any `Promise.all`-parallelized batch of calls, not just the average - a single slow outlier call in the batch determines the whole batch's completion time (`Promise.all` is only as fast as its slowest member), which average latency can hide.
- Use `async_hooks` (Node) or APM tooling (Datadog APM, OpenTelemetry) to trace an async call chain across service boundaries when debugging a request that "hangs" - manual `console.log` timestamps don't scale past a couple of services.

### Team/scale practices

- Standardize on one HTTP client (or a thin wrapper around `fetch`) with built-in timeout, retry-with-backoff, and abort support baked in by default, so individual engineers don't each reinvent (or forget) these concerns per call site.
- Add `no-floating-promises` and `require-await` ESLint rules as CI gates once a team has been burned by even one silent unhandled-rejection production incident - this is a cheap, high-leverage rule to adopt.
- Establish a team convention for "does this NestJS service method retry internally, or does the caller decide retry policy?" - mixing both leads to either double-retries (wasteful/dangerous for non-idempotent operations) or no retries at all (assumed elsewhere, implemented nowhere).

### Senior follow-up Q&A

**Q1: You're seeing intermittent 502s from a downstream service, and naive retries seem to make the outage worse, not better. Walk through your diagnosis and fix.**
> "First I'd check whether all clients are retrying with the same fixed delay - if so, that's a retry storm: every client fails together, waits the same fixed interval, then hammers the service again in sync, right as it's trying to recover, creating a self-sustaining overload cycle. The fix is exponential backoff with jitter - each client's retry delay grows on each attempt and includes randomness, spreading retries out over time instead of synchronizing them. I'd also add a circuit breaker so that once failures cross a threshold, clients stop hammering the dependency entirely for a cooldown window, giving it room to recover, rather than continuing to retry into a service that's already failing."

**Q2: How would you implement a `withTimeout(promise, ms)` utility, and what's the subtlety around the original Promise if it times out?**
> Sketch: `Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new TimeoutError()), ms))])`. "The subtlety: `Promise.race` losing doesn't cancel the original Promise - if it's a `fetch`, the network request keeps running in the background even after `withTimeout` has already rejected to the caller, wasting bandwidth and potentially still mutating state when it eventually resolves. For real cancellation, I'd pass an `AbortController`'s signal into the underlying operation and call `abort()` in the timeout branch, not just race against it."

**Q3: A NestJS controller method is `async` and throws inside a `.map(async item => ...)` callback used to build a response array. What actually happens, and how do you fix it?**
> "`.map` with an `async` callback returns an array of Promises, not resolved values - if you don't `await Promise.all(...)` on that array, you'd return an array of pending Promises directly, which is almost certainly not the intended response shape (it would likely serialize oddly or hang, depending on the framework's handling). If one of those Promises rejects and you did correctly `await Promise.all(...)`, the whole `Promise.all` rejects immediately with that one error, discarding the other results - if partial success matters here, `Promise.allSettled` plus explicit per-item error handling is the correct fix, not `Promise.all`."

**Q4: Explain how you'd design cancellation for a multi-step async workflow (e.g., a wizard that fetches step 2's data based on step 1's answer, and the user can navigate back before step 2 finishes).**
> "I'd create one `AbortController` per 'workflow attempt' rather than per individual fetch, and thread its `signal` through every async call in that attempt. Navigating back or changing an earlier answer calls `abort()` on the current controller and creates a fresh one for the new attempt - this cancels every in-flight step-2+ request tied to the abandoned path in one call, rather than needing to track and cancel each request individually. Each fetch's `catch` checks `err.name === 'AbortError'` and treats it as an expected cancellation, not a real error to surface to the user."

**Q5: What's the risk of using `Promise.any` in a fallback/failover scenario across multiple redundant API endpoints, and how would you harden it?**
> "`Promise.any` resolves on the first fulfillment and doesn't wait for or care about the others - if the 'fastest' endpoint returns a fulfilled but semantically wrong or stale response (not a rejection, just wrong data), `Promise.any` happily accepts it since it only distinguishes fulfilled from rejected, not 'good' from 'bad' data. Hardening it means validating the response shape/freshness inside each endpoint's Promise chain and explicitly rejecting on invalid data (so `Promise.any` correctly skips it), rather than trusting 'it resolved' as a proxy for 'it's correct.'"

**Q6: How does `process.nextTick` interacting with Promise microtasks create a starvation risk specific to Node, and when would this matter in a NestJS app?**
> "`process.nextTick`'s queue is drained completely before the Promise microtask queue even starts, and critically, if a `nextTick` callback schedules another `nextTick` callback, Node keeps draining that queue before moving on - so recursive or chained `process.nextTick` calls can starve not just macrotasks but Promise resolutions too, which is a stricter starvation risk than the microtask-starves-macrotask case. In a NestJS app this would matter if a library or piece of legacy code uses `process.nextTick` recursively (rare, but exists in some older Node patterns) - `async/await`-based Nest request handling would appear to hang even though nothing is technically deadlocked, just perpetually deprioritized."

---

## Mastery checklist

- [ ] I can state the event loop priority order from memory and explain "why" for each step.
- [ ] I can predict the output of any mix of sync code, `setTimeout`, and Promise chains.
- [ ] I can explain `async/await` as sugar over `.then()` and why `await` doesn't block.
- [ ] I can correctly choose between `Promise.all`, `allSettled`, `race`, and `any` for a given scenario.
- [ ] I can identify and fix a sequential-await performance bug.
- [ ] I can identify and fix a stale-response race condition using `AbortController` or request-id tracking.
- [ ] I can explain why unhandled rejections are dangerous and how to avoid them.
