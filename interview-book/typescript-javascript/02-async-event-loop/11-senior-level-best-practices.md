# 11. Senior-Level Best Practices

> Source: `interview-prep/typescript-javascript/02-async-event-loop.md`

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
