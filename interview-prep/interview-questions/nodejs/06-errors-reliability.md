# NODE06 — Errors and Reliability

Node.js 20/22. Questions NODE-251–NODE-300.

These questions cover error subclasses and `cause`, operational vs programmer errors, async error propagation, `unhandledRejection` and `uncaughtException`, `AbortError` and `AggregateError`, resource cleanup, retries with backoff and jitter, circuit breakers and bulkheads, timeouts, idempotency, graceful degradation, health probes, structured logging, correlation IDs and `AsyncLocalStorage`, crash-only design, why `domain` is deprecated, signals and draining, restart policies, poison messages, and delivery guarantees.

Expected failures are handled; bugs crash and restart. Bound every call with a timeout, retry only idempotent work with jitter, drain on SIGTERM, and assume messages arrive at least once.

### NODE-251 — Why subclass `Error`, and how do you do it correctly?

**Difficulty:** Junior

**Category:** Error design

**Question:**

Why subclass `Error`, and how do you do it correctly?

**Answer:**

Subclasses let callers react to the kind of error, using `instanceof` or a stable `code`, instead of parsing message text. To write one, use `class AppError extends Error` and call `super(message, { cause })`. Set `this.name = new.target.name`, and add useful fields such as `code`, `status`, and `isOperational`. In V8, `Error.captureStackTrace(this, new.target)` also removes the constructor frames from the stack trace.

**Follow-up:**

Why prefer `code` over `instanceof` across module boundaries?

Answer: Duplicate copies of a package, or separate realms such as `vm` and workers, create different class identities, so `instanceof` fails. A string `code` like `ERR_X` survives serialization and duplication. That is why Node's own errors expose `code`.

### NODE-252 — What is `error.cause` and why use it?

**Difficulty:** Junior

**Category:** Error design

**Question:**

What is `error.cause` and why use it?

**Answer:**

`error.cause` holds the original error that triggered a new one. You set it with `new Error('msg', { cause: err })`, which is supported since Node 16.9 and ES2022. As an error moves up through layers, each layer can add context while keeping the root error attached. That way, logs show the whole chain instead of losing the real cause.

**Follow-up:**

How do you log a cause chain?

Answer: Loggers like pino serialize `cause` recursively with their error serializer. Otherwise, walk `err.cause` in a loop. `util.inspect` already prints nested causes, but `JSON.stringify(err)` drops non-enumerable fields, so serialize explicitly.

### NODE-253 — Operational vs programmer errors?

**Difficulty:** Junior

**Category:** Error design

**Question:**

What is the difference between operational errors and programmer errors?

**Answer:**

Operational errors are expected runtime failures: `ECONNREFUSED`, timeouts, invalid user input, a full disk. You handle them by retrying, degrading, or returning a 4xx or 5xx. Programmer errors are bugs: a `TypeError` on `undefined`, wrong argument types, a broken invariant. You cannot reliably recover from them. Fix the code, and if one escapes, crash and restart.

**Follow-up:**

Why not catch programmer errors and continue?

Answer: State may be partly changed or inconsistent, for example a half-written cache or a leaked lock. Continuing risks corruption and hides the bug. Fail fast, log, and let the supervisor start a clean process.

### NODE-254 — How do you tell the two apart in code?

**Difficulty:** Intermediate

**Category:** Error design

**Question:**

How do you tell the two apart in code?

**Answer:**

Mark errors you create yourself with `isOperational: true`. Also treat known system error codes, such as `ECONNRESET`, `ETIMEDOUT`, and `ENOENT`, as operational. Anything you do not recognize defaults to "programmer error or unknown". A central error handler then decides what response to send and whether the process should exit.

**Follow-up:**

Danger of marking everything operational?

Answer: Real bugs get swallowed as "expected failures". The process stays up with corrupt state, and alerts never fire. Treat unknown errors as fatal by default.

### NODE-255 — Error handling patterns: callbacks, promises, async/await?

**Difficulty:** Junior

**Category:** Async propagation

**Question:**

How does error handling differ between callbacks, promises, and async/await?

**Answer:**

Callbacks use the error-first style `(err, data)`, and you must check `err` yourself. Throwing inside an async callback escapes any surrounding `try/catch`. Promises pass errors along as rejections, which you handle with `.catch`. With `async/await`, a normal `try/catch` handles rejections inside the same function. Pick one style per API, and always return or await your promises.

**Follow-up:**

Why does `try { setTimeout(() => { throw e }) } catch {}` not catch?

Answer: The callback runs later, on a fresh call stack, after the `try` block has already exited. The throw becomes an `uncaughtException`. Put the `try/catch` inside the callback, or use promisified timers with `await`.

### NODE-256 — Common async error propagation bugs?

**Difficulty:** Intermediate

**Category:** Async propagation

**Question:**

What are common async error propagation bugs?

**Answer:**

The usual ones are: forgetting `return` or `await`, which leaves a "floating" promise; writing `try { return promise } catch`, which does not catch without `await`; using `forEach(async ...)`, where nobody awaits the errors; and creating promises in event handlers with no `.catch`. In each case a rejection ends up with no handler.

**Follow-up:**

`return p` vs `return await p` inside try?

Answer: `return p` hands the promise to the caller, so its rejection bypasses your `catch`. `return await p` makes the rejection throw inside the `try` block, so your `catch` and `finally` logic applies. Outside a `try/catch`, the two are equivalent, apart from slightly different stack traces.

### NODE-257 — What triggers `unhandledRejection` and what does Node 15+ do?

**Difficulty:** Junior

**Category:** Process-level handlers

**Question:**

What triggers `unhandledRejection` and what does Node 15+ do?

**Answer:**

It fires when a promise is rejected and no handler is attached by the time the microtask queue and process ticks have drained. Since Node 15, the default mode is `--unhandled-rejections=throw`. The rejection is raised as an `uncaughtException`, and the process exits with code 1 unless you have installed a handler.

**Follow-up:**

Recommended handler?

Answer: Log with context, flush the logs, then exit with a non-zero code so the supervisor restarts the process. Treat it like `uncaughtException`; do not just log and carry on. Even better, fix the cause by always attaching handlers.

### NODE-258 — `rejectionHandled` and `PromiseRejectionEvent` — why care?

**Difficulty:** Intermediate

**Category:** Process-level handlers

**Question:**

What is `rejectionHandled`, and why should you care about it?

**Answer:**

`process.on('rejectionHandled')` fires when a handler is attached to a promise after `unhandledRejection` was already reported for it. It points to a late-attached handler, which is often an ordering bug: you create a promise now but only await it later. In the meantime, the rejection looks unhandled.

**Follow-up:**

How to avoid false positives with parallel promises?

Answer: Attach handlers right away. Use `Promise.all` or `allSettled`, or add `p.catch(() => {})` on a branch while keeping the original promise for later use.

### NODE-259 — What should you do on `uncaughtException`?

**Difficulty:** Senior

**Category:** Process-level handlers

**Question:**

What should you do on `uncaughtException`?

**Answer:**

Treat the process as unreliable. Log the error, making sure the log is flushed, and stop accepting new work. Then try a short graceful shutdown with a hard timeout, and exit with a non-zero code. Never go back to normal operation.

**Follow-up:**

`uncaughtExceptionMonitor`?

Answer: It lets you observe the event without changing the default crash behavior. That makes it a good fit for telemetry such as Sentry, because it cannot accidentally swallow the exception the way a regular handler can.

### NODE-260 — Why shouldn't you "recover" in `uncaughtException`?

**Difficulty:** Senior

**Category:** Process-level handlers

**Question:**

Why shouldn't you "recover" in `uncaughtException`?

**Answer:**

The exception unwound the stack at an arbitrary point. That leaves resources, invariants, and in-flight operations in an unknown state. The Node documentation says explicitly that resuming is unsafe. The handler is meant only for synchronous cleanup before the process exits.

**Follow-up:**

What cleanup is acceptable?

Answer: Short, synchronous work: flush the logger, close sockets quickly, release lock files, then call `process.exit(1)`. Avoid async chains that depend on subsystems that may be broken, and add a kill timer as a safety net.

### NODE-261 — `process.exit()` vs `process.exitCode`?

**Difficulty:** Junior

**Category:** Exit behavior

**Question:**

What is the difference between `process.exit()` and `process.exitCode`?

**Answer:**

`process.exit()` ends the process immediately, which can cut off pending async I/O such as writes to stdout pipes or logs. If you set `process.exitCode` and let the event loop finish naturally, the process exits cleanly with that code after pending work is done.

**Follow-up:**

When is `process.exit` acceptable?

Answer: On fatal paths after you have flushed logs, or after a graceful drain timeout. A typical sequence is `server.close()`, close the database, then set `exitCode`. Use a forced `exit` only as a timeout fallback.

### NODE-262 — What is `AbortController`/`AbortSignal` and how do errors surface?

**Difficulty:** Junior

**Category:** Cancellation

**Question:**

What is `AbortController`/`AbortSignal` and how do errors surface?

**Answer:**

They are the standard way to cancel async work. Calling `controller.abort()` sets `signal.aborted` to `true`. APIs that accept a `signal`, such as fetch, timers/promises, fs, `events.once`, and child_process, then reject with an `AbortError`, which has `name: 'AbortError'` and `code: 'ABORT_ERR'`.

**Follow-up:**

How do you distinguish abort from real failure?

Answer: Check `err.name === 'AbortError'` or `err.code === 'ABORT_ERR'`, and look at `signal.reason`. Treat it as an expected cancellation: do not alert, and do not retry blindly.

### NODE-263 — `AbortSignal.timeout()` and `AbortSignal.any()`?

**Difficulty:** Senior

**Category:** Cancellation

**Question:**

What do `AbortSignal.timeout()` and `AbortSignal.any()` do?

**Answer:**

`AbortSignal.timeout(ms)` creates a signal that aborts after `ms` milliseconds with a `TimeoutError` DOMException. It exists since Node 17.3 and 18. `AbortSignal.any([a, b])`, available from Node 20.3, combines several signals into one that aborts when the first of them does. A typical use is combining caller cancellation with a deadline.

**Follow-up:**

Difference in `reason` for timeout vs manual abort?

Answer: A timeout gives `reason.name === 'TimeoutError'`. A manual `abort()` with no argument gives an `AbortError` DOMException. If you pass your own reason, you can carry domain-specific information.

### NODE-264 — How do you make your own function cancellable?

**Difficulty:** Senior

**Category:** Cancellation

**Question:**

How do you make your own function cancellable?

**Answer:**

Accept an options object with `{ signal }`. Call `signal.throwIfAborted()` at the start and between steps. To cancel the underlying work, listen with `signal.addEventListener('abort', ..., { once: true })`. Finally, remove the listener in a `finally` block so it does not linger.

**Follow-up:**

Leak risk?

Answer: Adding a listener to a long-lived signal on every call, without removing it, makes listeners pile up and triggers a MaxListeners warning. Use `{ once: true }` and remove the listener in `finally`, or use `events.once` or `addAbortListener`.

### NODE-265 — What is `AggregateError`?

**Difficulty:** Intermediate

**Category:** Aggregation

**Question:**

What is `AggregateError`?

**Answer:**

`AggregateError` is an error that wraps several other errors in its `.errors` array. `Promise.any` throws one when all of its promises reject. You can also create one yourself to report multiple failures at once, for example when validating a batch of items.

**Follow-up:**

`Promise.all` vs `allSettled` vs `any` on errors?

Answer: `all` rejects on the first failure, while the other promises keep running. `allSettled` never rejects and reports each outcome. `any` resolves on the first success, and rejects with an `AggregateError` only if all of them fail.

### NODE-266 — Does `Promise.all` cancel the other tasks on failure?

**Difficulty:** Intermediate

**Category:** Aggregation

**Question:**

Does `Promise.all` cancel the other tasks on failure?

**Answer:**

No. `Promise.all` rejects as soon as one promise fails, but the remaining promises keep running. Their later rejections are handled silently by `all`, so you will not see them. If you want real cancellation, you need an `AbortController` and tasks that respect its signal.

**Follow-up:**

Pattern for fail-fast with cancellation?

Answer: Share one controller. On the first error, call `controller.abort()` in a catch, and pass the `signal` to every task. Then use `allSettled` to wait until the tasks have actually stopped before you clean up.

### NODE-267 — Resource cleanup with `try/finally`?

**Difficulty:** Junior

**Category:** Resource cleanup

**Question:**

How do you use `try/finally` for resource cleanup?

**Answer:**

A `finally` block runs whether the code succeeds, throws, or returns. That makes it the right place to close files, release database clients, unlock locks, and clear timers. If the cleanup is async, `await` it inside `finally`.

**Follow-up:**

What if `finally` throws?

Answer: The new error replaces the original one, and the original is lost. Wrap the cleanup in its own `try/catch`, log secondary failures, and rethrow the original error. You can also combine them with `AggregateError` or `cause`.

### NODE-268 — `using` / `Symbol.dispose` and explicit resource management?

**Difficulty:** Senior

**Category:** Resource cleanup

**Question:**

What are `using` and `Symbol.dispose`, and can you use them in Node 20/22?

**Answer:**

They come from the TC39 explicit resource management proposal. `using` and `await using`, together with `Symbol.dispose` and `Symbol.asyncDispose`, give you cleanup that runs automatically at the end of a scope. Node 20 and 22 provide the symbols (polyfilled or experimental), but the syntax needs TypeScript 5.2+ or Babel. Native syntax support depends on the V8 version and is not generally available in 20 or 22.

**Follow-up:**

Alternatives today?

Answer: Use `try/finally`, or a helper like `withResource(acquire, fn)` that guarantees release. `stream.pipeline` also handles cleanup, and `FileHandle` supports `asyncDispose` in newer Node versions.

### NODE-269 — Why do retries need backoff and jitter?

**Difficulty:** Junior

**Category:** Retries

**Question:**

Why do retries need backoff and jitter?

**Answer:**

Retrying immediately adds load to a dependency that is already struggling, which creates a retry storm. Exponential backoff spaces the attempts further apart each time. Jitter adds randomness to the delays, so many clients do not all retry at the same moment, which would cause a thundering herd.

**Follow-up:**

Which jitter strategy?

Answer: "Full jitter": `sleep = random(0, min(cap, base * 2^attempt))`. AWS's analysis found that it reduces contention and total completion time compared with equal jitter or no jitter.

### NODE-270 — What should be retried, and what not?

**Difficulty:** Intermediate

**Category:** Retries

**Question:**

What should be retried, and what not?

**Answer:**

Retry operations that are both transient and idempotent: network resets, timeouts, and 503 or 429 responses (respecting `Retry-After`). Do not retry validation errors (400 or 422) or authentication failures. Also do not retry non-idempotent calls unless they carry an idempotency key.

**Follow-up:**

Retry budgets?

Answer: Limit retries per request and as a share of total traffic, for example at most 10%, so retries cannot double the load during an outage. Combine this with a circuit breaker.

### NODE-271 — Implement a retry helper concisely.

**Difficulty:** Intermediate

**Category:** Retries

**Question:**

How would you implement a concise retry helper?

**Answer:**

Loop for up to N attempts. In each one, `await fn({ signal })` and catch errors that are retryable. Compute the delay with full jitter, then wait with `await timers/promises.setTimeout(delay, undefined, { signal })` so the wait can be cancelled. After the last attempt, rethrow the final error, with the attempt count included in its `cause`.

**Follow-up:**

Where does the overall deadline fit?

Answer: Pass one deadline signal, such as `AbortSignal.timeout(total)`, across all attempts, and stop retrying when it fires. Per-attempt timeouts alone do not bound the total time.

### NODE-272 — Circuit breaker concept?

**Difficulty:** Senior

**Category:** Resilience patterns

**Question:**

What is a circuit breaker?

**Answer:**

A circuit breaker wraps calls to a dependency and has three states. Closed is normal operation. Open means calls fail immediately after too many failures. Half-Open means that after a cooldown, a few probe calls are allowed through to test recovery. It protects callers from slow failures and gives the dependency time to recover.

**Follow-up:**

Common Node libraries and tuning?

Answer: `opossum` is the typical choice. Tune the error-percentage threshold, rolling window, minimum request volume, reset timeout, and per-call timeout. Provide a fallback, and emit metrics when the state changes.

### NODE-273 — Bulkhead pattern?

**Difficulty:** Senior

**Category:** Resilience patterns

**Question:**

What is the bulkhead pattern?

**Answer:**

The bulkhead pattern isolates resources for each dependency or tenant, using separate pools, concurrency limits, or queues. One slow component then cannot use up the capacity shared by everything else. The name comes from the sealed compartments in a ship.

**Follow-up:**

How in Node?

Answer: Use per-dependency concurrency limiters (`p-limit` or a semaphore), separate HTTP agents with `maxSockets`, and separate database pools. Add bounded queues that reject work when full, or use separate processes or workers.

### NODE-274 — Why set timeouts on everything?

**Difficulty:** Junior

**Category:** Timeouts

**Question:**

Why set timeouts on everything?

**Answer:**

Without a timeout, a hung dependency holds sockets, memory, and event-loop callbacks indefinitely, and one slow service can cascade into a wider outage. Set connect timeouts, request timeouts, and an overall deadline for HTTP, database, and queue operations.

**Follow-up:**

Node http server timeouts?

Answer: The main ones are `server.headersTimeout`, `requestTimeout` (default 300 s in Node 18+), `keepAliveTimeout` (5 s), and the legacy `server.timeout`. Set `keepAliveTimeout` above the load balancer's idle timeout to avoid 502s.

### NODE-275 — Deadline propagation?

**Difficulty:** Senior

**Category:** Timeouts

**Question:**

What is deadline propagation?

**Answer:**

You compute an absolute deadline at the edge of your system, then pass the remaining time downstream, for example in an `x-deadline` header or a gRPC deadline. Inner calls then use the time that is left, instead of each starting with a fresh full timeout.

**Follow-up:**

Why better than independent timeouts?

Answer: Independent per-hop timeouts can add up to more than the client is willing to wait, so you do work nobody is waiting for. With propagation, downstream services can stop early and save resources.

### NODE-276 — What is idempotency and why vital with retries?

**Difficulty:** Junior

**Category:** Idempotency

**Question:**

What is idempotency and why is it vital with retries?

**Answer:**

An operation is idempotent if doing it several times has the same effect as doing it once. Retries, message redeliveries, and double-clicks make duplicate requests unavoidable. If your handlers are idempotent, those duplicates are harmless.

**Follow-up:**

Which HTTP methods are idempotent?

Answer: By specification, GET, HEAD, PUT, DELETE, and OPTIONS. POST and PATCH are not idempotent by default, so use idempotency keys for them.

### NODE-277 — How do you implement idempotency keys?

**Difficulty:** Senior

**Category:** Idempotency

**Question:**

How do you implement idempotency keys?

**Answer:**

The client sends an `Idempotency-Key` header. The server stores the key, a fingerprint of the request, and the result in a durable store with a unique constraint. The first request runs normally. A duplicate gets the stored response back, or a 409 if the original is still in progress or the request does not match. Give the records a TTL.

**Follow-up:**

Race between two concurrent same-key requests?

Answer: Insert the key atomically with an "in-progress" status, using a unique index or `SET NX`. The loser waits or gets a 409. When possible, mark it "completed" with the response in the same transaction as the side effect.

### NODE-278 — Graceful degradation?

**Difficulty:** Intermediate

**Category:** Degradation

**Question:**

What is graceful degradation?

**Answer:**

When a dependency fails, you keep the core functionality working with fewer features, instead of failing completely. Examples are serving stale cache, showing default recommendations, hiding optional widgets, queueing writes for later, or returning a partial response.

**Follow-up:**

How to decide what's degradable?

Answer: Classify features as critical or optional, and define a fallback for each dependency. Use circuit breakers and feature flags, and test failure modes with chaos or fault injection.

### NODE-279 — Load shedding vs backpressure?

**Difficulty:** Senior

**Category:** Degradation

**Question:**

What is the difference between load shedding and backpressure?

**Answer:**

Backpressure slows the producers down when consumers fall behind, for example stream `highWaterMark` and `drain`. Load shedding rejects excess work, with 429 or 503, so that accepted requests keep a bounded latency. Backpressure makes work wait; shedding turns it away.

**Follow-up:**

Signal to shed in Node?

Answer: Common signals are event-loop delay (`perf_hooks.monitorEventLoopDelay`), queue depth, the number of in-flight requests, or memory use. Libraries like `under-pressure` return 503 with `Retry-After`.

### NODE-280 — Liveness vs readiness vs startup probes?

**Difficulty:** Junior

**Category:** Health checks

**Question:**

What is the difference between liveness, readiness, and startup probes?

**Answer:**

Liveness asks: is the process so unhealthy that restarting is the only fix? Readiness asks: can it serve traffic right now, with its dependencies ready and not draining? Startup asks: has slow initialization finished? A failing readiness probe removes the instance from load balancing, while a failing liveness probe restarts it.

**Follow-up:**

Common mistake?

Answer: Checking downstream dependencies in the liveness probe, so a database outage restarts every pod in a loop. Liveness should be cheap and local. Put dependency checks in readiness, and use them carefully.

### NODE-281 — What should a health endpoint do?

**Difficulty:** Intermediate

**Category:** Health checks

**Question:**

What should a health endpoint do?

**Answer:**

It should respond quickly, ideally in under 100 ms, with no authentication and very little work. Return 200 or 503, plus a small JSON body with the status, version, and uptime. Do not run heavy queries. If you check dependencies, cache the results for a short time.

**Follow-up:**

Readiness during shutdown?

Answer: Set a `shuttingDown` flag so `/ready` returns 503 as soon as SIGTERM arrives. This lets the load balancer drain traffic before the server stops accepting connections.

### NODE-282 — Structured logging principles?

**Difficulty:** Junior

**Category:** Logging

**Question:**

What are the principles of structured logging?

**Answer:**

Write logs as JSON with consistent fields: timestamp, level, message, service, version, `requestId` or `traceId`, and an error object with name, message, stack, and code. Machine-readable logs make it easy to search, aggregate, and set up alerts.

**Follow-up:**

Why pino over console.log?

Answer: Pino is fast, with minimal serialization overhead, and outputs JSON by default. It supports child loggers with bound context, redaction of secrets, and transports (`pino.transport`) that run off the main thread.

### NODE-283 — Log levels and what not to log?

**Difficulty:** Intermediate

**Category:** Logging

**Question:**

Which log levels should you use, and what should you never log?

**Answer:**

Use `error` for things that need action, `warn` for degraded behavior, `info` for lifecycle and business events, and `debug` or `trace` for details that stay off in production. Never log secrets, tokens, full personal data, or full request bodies. Redact sensitive paths.

**Follow-up:**

Log-and-throw anti-pattern?

Answer: Logging at every layer and then rethrowing creates duplicate noise. Log once, at the boundary that actually handles the error. Lower layers should add context through `cause`.

### NODE-284 — Correlation IDs?

**Difficulty:** Junior

**Category:** Request context

**Question:**

What is a correlation ID?

**Answer:**

A correlation ID is a unique ID for each request. Accept an incoming `x-request-id`, or generate one with `crypto.randomUUID()`. Attach it to every log line and forward it on downstream calls. Then you can follow one request across several services.

**Follow-up:**

Correlation ID vs trace ID?

Answer: A correlation ID is a simple opaque link. W3C Trace Context (`traceparent`) adds span hierarchy and sampling for distributed tracing, as used by OpenTelemetry. Prefer trace context where it is available, and log its IDs.

### NODE-285 — `AsyncLocalStorage` for request context?

**Difficulty:** Senior

**Category:** Request context

**Question:**

How do you use `AsyncLocalStorage` for request context?

**Answer:**

`AsyncLocalStorage`, from `node:async_hooks`, keeps context available across async continuations. In middleware, call `als.run(store, () => next())`. Any code that runs later in that request can call `als.getStore()` to read values like the request ID, without passing them as parameters.

**Follow-up:**

Gotchas?

Answer: Context can be lost with callback-based libraries, custom thenables, and connection pools; use `AsyncResource.bind` to fix that. It also has some overhead, which newer Node versions have been reducing. `enterWith` leaks the scope to code that follows, so prefer `run`.

### NODE-286 — Connecting ALS with logging?

**Difficulty:** Intermediate

**Category:** Request context

**Question:**

How do you connect `AsyncLocalStorage` with logging?

**Answer:**

Create a logger mixin, for example pino's `mixin()`, that reads `als.getStore()` and adds fields like `requestId` and `userId` to every log line. Then no code needs to pass a logger around just to include request context.

**Follow-up:**

Handling background jobs?

Answer: At the job's entry point, start a new `als.run` with a generated ID, or the one carried in the message. This keeps logs from workers traceable.

### NODE-287 — Crash-only design?

**Difficulty:** Senior

**Category:** Crash-only design

**Question:**

What is crash-only design?

**Answer:**

In crash-only design, the only way to stop the software is to crash it, and the only way to start it is to run recovery. Shutdown and crash use the same path, so recovery is always exercised. This means durable state, idempotent startup, and no reliance on a clean exit.

**Follow-up:**

Implications for Node services?

Answer: Keep state in external stores and make handlers idempotent. Persist queue offsets or acks only after the side effects are done. Keep startup fast and use a supervisor to restart the process. Graceful draining is an optimization, not a requirement.

### NODE-288 — Why were `domain` modules deprecated?

**Difficulty:** Senior

**Category:** Crash-only design

**Question:**

Why was the `domain` module deprecated?

**Answer:**

Domains tried to send uncaught errors to handlers by binding emitters and callbacks. But they worked implicitly and unreliably, lost context, could leak memory, and encouraged people to resume after an error. They also had performance and maintenance costs. The docs mark them as pending deprecation.

**Follow-up:**

Replacement?

Answer: Use explicit error handling with promises and `error` event listeners, `AsyncLocalStorage` for context, and a process-level crash and restart for unknown errors.

### NODE-289 — EventEmitter `'error'` event behavior?

**Difficulty:** Junior

**Category:** Emitters and streams

**Question:**

How does the `'error'` event behave on an EventEmitter?

**Answer:**

If an emitter emits `'error'` and no listener is attached, the error is thrown, and it crashes the process if nothing catches it. Streams, sockets, and servers all emit `'error'`, so each one needs an `error` handler.

**Follow-up:**

`captureRejections` option?

Answer: `new EventEmitter({ captureRejections: true })` sends rejected promises from async listeners to the `'error'` event, or to `Symbol.for('nodejs.rejection')`, instead of `unhandledRejection`.

### NODE-290 — Handling stream errors reliably?

**Difficulty:** Intermediate

**Category:** Emitters and streams

**Question:**

How do you handle stream errors reliably?

**Answer:**

Use `stream.pipeline`, or `pipeline` from `stream/promises`. It forwards errors, destroys all the streams, and cleans up. Plain `.pipe()` does not propagate errors and does not destroy the destination.

**Follow-up:**

What does a premature close look like?

Answer: You get `ERR_STREAM_PREMATURE_CLOSE` when a stream closes before it ends. In HTTP, a client disconnect triggers it. Handle it by aborting upstream work.

### NODE-291 — Handling process signals (SIGTERM, SIGINT)?

**Difficulty:** Junior

**Category:** Graceful shutdown

**Question:**

How do you handle process signals such as SIGTERM and SIGINT?

**Answer:**

Orchestrators send SIGTERM first, and then SIGKILL after a grace period. Register `process.once('SIGTERM', shutdown)` and the same for `SIGINT`. SIGKILL cannot be caught. Make the shutdown function idempotent, so that repeated signals do not run it again.

**Follow-up:**

PID 1 issue in containers?

Answer: When Node runs as PID 1, it does not get default signal handling and does not reap zombie processes. Use `--init` or tini, or add explicit handlers. Also run `node` directly rather than through `npm start`, which may not forward signals.

### NODE-292 — Graceful shutdown with connection draining?

**Difficulty:** Senior

**Category:** Graceful shutdown

**Question:**

How do you shut down gracefully while draining connections?

**Answer:**

On SIGTERM, mark the service not-ready and wait briefly for the load balancer to deregister it. Call `server.close()` to stop new connections, then `server.closeIdleConnections()` (Node 18.2+). Wait for in-flight requests to finish, close databases and queues, and exit. Force the exit after a timeout.

**Follow-up:**

Why doesn't `server.close()` finish with keep-alive?

Answer: It waits for existing connections to close, and idle keep-alive sockets stay open. Use `closeIdleConnections()`, and after a deadline `closeAllConnections()`. In Node 19+, `close()` already closes idle ones.

### NODE-293 — Choosing a shutdown timeout?

**Difficulty:** Senior

**Category:** Graceful shutdown

**Question:**

How do you choose a shutdown timeout?

**Answer:**

It must be shorter than the orchestrator's kill grace period, for example Kubernetes `terminationGracePeriodSeconds`, which defaults to 30 s. Set your application's drain budget slightly lower than that. Consider a `preStop` sleep to give the load balancer time to stop sending traffic.

**Follow-up:**

What if requests exceed the budget?

Answer: Abort them using a signal and return 503 where possible. Rely on client retries with idempotency. Never run past the hard kill.

### NODE-294 — Kubernetes restart policies and probe implications?

**Difficulty:** Senior

**Category:** Supervisors

**Question:**

How do Kubernetes restart policies and probes affect a Node service?

**Answer:**

Pods have a `restartPolicy`, which is `Always` for Deployments. When a container crashes, the kubelet restarts it with exponential backoff, known as CrashLoopBackOff, up to 5 minutes. A failing liveness probe kills the container, while a failing readiness probe only removes the pod from the service endpoints.

**Follow-up:**

Why is a crash loop dangerous?

Answer: Fatal startup errors, such as bad config or a dependency being down, cause repeated restarts, and the backoff delays recovery. Validate config early, fail with clear exit codes, and do not tie liveness checks to external dependencies.

### NODE-295 — supervisord / systemd / PM2 restart considerations?

**Difficulty:** Intermediate

**Category:** Supervisors

**Question:**

What should you consider when using supervisord, systemd, or PM2 to restart a service?

**Answer:**

They restart the process when it exits. To avoid tight restart loops, configure `autorestart`, `startretries`, and `startsecs` in supervisord, or `Restart=on-failure` and `RestartSec` in systemd. Also make sure the stop signal and timeout match your graceful shutdown.

**Follow-up:**

Exit codes matter how?

Answer: Use them to separate a clean exit (0), a failure (non-zero), and "do not restart" codes (`exitcodes` in supervisord, `RestartPreventExitStatus` in systemd). Fatal config errors should not restart forever.

### NODE-296 — Poison messages?

**Difficulty:** Senior

**Category:** Messaging reliability

**Question:**

What is a poison message?

**Answer:**

A poison message is one that always fails processing, for example because it is malformed or triggers a bug. It gets redelivered forever, blocking the queue or wasting resources. To handle it, set a maximum number of attempts, use dead-letter queues, and park the message together with error details.

**Follow-up:**

Handling in Kafka vs SQS/RabbitMQ?

Answer: In SQS, `maxReceiveCount` moves the message to a DLQ through a redrive policy. In RabbitMQ, reject with `requeue=false` to a dead-letter exchange. Kafka has no built-in DLQ, so publish failures to a retry or dead topic yourself so the partition keeps moving.

### NODE-297 — At-least-once vs at-most-once vs exactly-once?

**Difficulty:** Senior

**Category:** Messaging reliability

**Question:**

What is the difference between at-least-once, at-most-once, and exactly-once delivery?

**Answer:**

At-most-once may lose messages. At-least-once never loses them but may deliver duplicates. True exactly-once delivery is not achievable across arbitrary systems. What you can get is exactly-once *effects*, by combining at-least-once delivery with idempotent or transactional processing.

**Follow-up:**

What does Kafka's "exactly-once" actually cover?

Answer: An idempotent producer plus transactions across Kafka topics and offsets, meaning read-process-write inside Kafka. Side effects outside Kafka, such as a database or an HTTP call, still need idempotency or an outbox or transactional pattern.

### NODE-298 — Ack timing in a consumer?

**Difficulty:** Senior

**Category:** Messaging reliability

**Question:**

When should a consumer acknowledge a message?

**Answer:**

Acknowledge after the work is done. If the consumer crashes before the ack, the message is redelivered, which gives at-least-once delivery. Acknowledging before the work risks losing the message, which is at-most-once. Combine a late ack with idempotent processing, and set the visibility or ack timeout longer than your maximum processing time.

**Follow-up:**

Duplicate when ack fails after success?

Answer: Yes: the work was done, but the message is redelivered. Deduplicate with a processed-message-ID table, ideally with a unique constraint in the same transaction as the side effect, or use naturally idempotent writes such as upserts.

### NODE-299 — Outbox pattern?

**Difficulty:** Senior

**Category:** Messaging reliability

**Question:**

What is the outbox pattern?

**Answer:**

You write the business data and an outbox event in the same database transaction. A separate relay process then publishes the events to the broker and marks them as sent. This avoids the dual-write problem, where the database and the queue can disagree after a partial failure.

**Follow-up:**

Delivery guarantee?

Answer: At-least-once, because the relay may publish an event and then crash before marking it sent. Consumers must therefore be idempotent, and events should carry a stable ID for deduplication.

### NODE-300 — Build a minimal reliability checklist for a Node service.

**Difficulty:** Senior

**Category:** Checklist

**Question:**

What would a minimal reliability checklist for a Node service include?

**Answer:**

- Typed errors with `code` and `cause`, and a central error handler.
- Fatal handlers for `uncaughtException` and `unhandledRejection` that log and exit.
- Timeouts and `AbortSignal` everywhere.
- Bounded retries with jitter, plus circuit breakers and bulkheads.
- Idempotency keys.
- Health, readiness, and liveness endpoints.
- Structured logs with correlation IDs through `AsyncLocalStorage`.
- A SIGTERM drain shorter than the grace period.
- A dead-letter queue for poison messages.
- Chaos and failure testing.

**Follow-up:**

How do you verify it works?

Answer: Run fault-injection tests (kill dependencies, add latency, drop connections) and load tests that include failures. Do rolling-restart drills that check for zero 5xx responses. Set alerts on error rate and saturation, and keep runbooks tied to your SLOs.
