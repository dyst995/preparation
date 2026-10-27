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

Subclasses let callers branch on type (`instanceof`) or a stable `code` instead of parsing messages. Use `class AppError extends Error`, call `super(message, { cause })`, set `this.name = new.target.name`, and add fields like `code`, `status`, `isOperational`. `Error.captureStackTrace(this, new.target)` trims constructor frames in V8.

**Follow-up:**

Why prefer `code` over `instanceof` across module boundaries?

Answer: Duplicate package copies or realms (vm, workers) create different class identities, so `instanceof` fails. A string `code` such as `ERR_X` survives serialization and duplication, which is why Node's own errors expose `code`.

### NODE-252 — What is `error.cause` and why use it?

**Difficulty:** Junior

**Category:** Error design

**Question:**

What is `error.cause` and why use it?

**Answer:**

Node 16.9+/ES2022 supports `new Error('msg', { cause: err })`. It preserves the original failure while adding context at each layer, so logs show the full chain instead of losing the root error.

**Follow-up:**

How do you log a cause chain?

Answer: Loggers like pino serialize `cause` recursively with its error serializer; otherwise walk `err.cause` in a loop. `util.inspect` already prints nested causes, but `JSON.stringify(err)` drops non-enumerable fields, so serialize explicitly.

### NODE-253 — Operational vs programmer errors?

**Difficulty:** Junior

**Category:** Error design

**Question:**

Operational vs programmer errors?

**Answer:**

Operational errors are expected runtime failures: ECONNREFUSED, timeouts, invalid input, disk full. Handle them: retry, degrade, return 4xx/5xx. Programmer errors are bugs: TypeError on undefined, wrong argument types, broken invariants. You can't recover reliably; fix the code and, if one escapes, crash and restart.

**Follow-up:**

Why not catch programmer errors and continue?

Answer: State may be partially mutated or inconsistent (half-written caches, leaked locks). Continuing risks corruption and hides bugs. Fail fast, log, and let the supervisor restart a clean process.

### NODE-254 — How do you tell the two apart in code?

**Difficulty:** Intermediate

**Category:** Error design

**Question:**

How do you tell the two apart in code?

**Answer:**

Tag errors you create (`isOperational: true`) and map known system codes (`ECONNRESET`, `ETIMEDOUT`, `ENOENT`) as operational. Anything unrecognized defaults to "programmer/unknown". Central error handler decides response and whether to exit.

**Follow-up:**

Danger of marking everything operational?

Answer: Real bugs get swallowed as "expected failures", process stays up with corrupt state, and alerts never fire. Default to unknown-is-fatal.

### NODE-255 — Error handling patterns: callbacks, promises, async/await?

**Difficulty:** Junior

**Category:** Async propagation

**Question:**

Error handling patterns: callbacks, promises, async/await?

**Answer:**

Callbacks use error-first `(err, data)` and must be checked; throwing inside async callbacks escapes `try/catch`. Promises propagate via rejection to `.catch`. `async/await` lets `try/catch` handle rejections in the same function. Pick one style per API and always return/await promises.

**Follow-up:**

Why does `try { setTimeout(() => { throw e }) } catch {}` not catch?

Answer: The callback runs later on a fresh stack after the try block exited. The throw becomes an `uncaughtException`. Wrap inside the callback or use promisified timers with `await`.

### NODE-256 — Common async error propagation bugs?

**Difficulty:** Intermediate

**Category:** Async propagation

**Question:**

Common async error propagation bugs?

**Answer:**

Forgetting `return`/`await` (floating promises), `try { return promise } catch` (doesn't catch without `await`), `forEach(async ...)` (errors not awaited), and creating promises inside event handlers with no `.catch`.

**Follow-up:**

`return p` vs `return await p` inside try?

Answer: `return p` hands off the promise; its rejection bypasses the catch. `return await p` makes rejection throw inside the try block so the catch/finally logic applies. Outside try/catch, they're equivalent (except stack traces slightly).

### NODE-257 — What triggers `unhandledRejection` and what does Node 15+ do?

**Difficulty:** Junior

**Category:** Process-level handlers

**Question:**

What triggers `unhandledRejection` and what does Node 15+ do?

**Answer:**

A promise rejects with no handler by the time microtasks drain/process ticks. Since Node 15 default `--unhandled-rejections=throw`: it's raised as an `uncaughtException` and the process exits with code 1 unless a handler exists.

**Follow-up:**

Recommended handler?

Answer: Log with context, flush logs, then exit non-zero (let supervisor restart). Treat it like uncaughtException; don't just log and continue. Better yet, fix by always attaching handlers.

### NODE-258 — `rejectionHandled` and `PromiseRejectionEvent` — why care?

**Difficulty:** Intermediate

**Category:** Process-level handlers

**Question:**

`rejectionHandled` and `PromiseRejectionEvent` — why care?

**Answer:**

`process.on('rejectionHandled')` fires if a handler attaches after `unhandledRejection` was reported. It signals late-attached handlers, often an ordering bug like creating a promise now and awaiting it later.

**Follow-up:**

How to avoid false positives with parallel promises?

Answer: Attach handlers immediately: use `Promise.all`/`allSettled`, or `p.catch(() => {})` on a branch while keeping the original for later consumption.

### NODE-259 — What should you do on `uncaughtException`?

**Difficulty:** Senior

**Category:** Process-level handlers

**Question:**

What should you do on `uncaughtException`?

**Answer:**

Treat the process as unreliable. Log synchronously/with flush, stop accepting new work, attempt short graceful shutdown with a hard timeout, and exit non-zero. Never resume normal operation.

**Follow-up:**

`uncaughtExceptionMonitor`?

Answer: It observes the event without changing the default crash behavior, so it's ideal for telemetry (e.g., Sentry) without accidentally swallowing the exception like a regular handler would.

### NODE-260 — Why shouldn't you "recover" in `uncaughtException`?

**Difficulty:** Senior

**Category:** Process-level handlers

**Question:**

Why shouldn't you "recover" in `uncaughtException`?

**Answer:**

The stack was unwound at an arbitrary point, leaving resources, invariants, and in-flight operations undefined. The Node docs explicitly say it's unsafe to resume; it's only for synchronous cleanup before exit.

**Follow-up:**

What cleanup is acceptable?

Answer: Synchronous, bounded work: flush logger, close sockets quickly, release lock files, then `process.exit(1)`. Avoid async chains that depend on possibly broken subsystems; add a kill timer.

### NODE-261 — `process.exit()` vs `process.exitCode`?

**Difficulty:** Junior

**Category:** Exit behavior

**Question:**

`process.exit()` vs `process.exitCode`?

**Answer:**

`process.exit()` terminates immediately, potentially truncating pending async I/O (stdout pipes, logs). Setting `process.exitCode` and letting the loop drain naturally gives a clean exit with that code.

**Follow-up:**

When is `process.exit` acceptable?

Answer: In fatal paths after flushing, or after a graceful drain timeout. Typical: `server.close()`, close DB, then set exitCode; force `exit` only via a timeout fallback.

### NODE-262 — What is `AbortController`/`AbortSignal` and how do errors surface?

**Difficulty:** Junior

**Category:** Cancellation

**Question:**

What is `AbortController`/`AbortSignal` and how do errors surface?

**Answer:**

A cancellation primitive. `controller.abort()` sets `signal.aborted`; APIs accepting `signal` (fetch, timers/promises, fs, events.once, child_process) reject with `AbortError` (`name: 'AbortError'`, `code: 'ABORT_ERR'`).

**Follow-up:**

How do you distinguish abort from real failure?

Answer: Check `err.name === 'AbortError'` or `err.code === 'ABORT_ERR'`, and inspect `signal.reason`. Treat it as expected cancellation: don't alert or retry blindly.

### NODE-263 — `AbortSignal.timeout()` and `AbortSignal.any()`?

**Difficulty:** Senior

**Category:** Cancellation

**Question:**

`AbortSignal.timeout()` and `AbortSignal.any()`?

**Answer:**

`AbortSignal.timeout(ms)` (Node 17.3+/18) aborts with a `TimeoutError` DOMException after ms. `AbortSignal.any([a, b])` (Node 20.3+) combines signals, e.g., caller cancellation plus a deadline.

**Follow-up:**

Difference in `reason` for timeout vs manual abort?

Answer: Timeout produces `reason.name === 'TimeoutError'`; manual `abort()` without args yields `AbortError` DOMException. Passing a custom reason lets you carry domain info.

### NODE-264 — How do you make your own function cancellable?

**Difficulty:** Senior

**Category:** Cancellation

**Question:**

How do you make your own function cancellable?

**Answer:**

Accept `{ signal }`, check `signal.throwIfAborted()` at start and between steps, listen with `signal.addEventListener('abort', ..., { once: true })` to cancel underlying work, and remove listeners in `finally`.

**Follow-up:**

Leak risk?

Answer: Adding listeners to a long-lived signal per call without removal accumulates them (MaxListeners warning). Use `{ once: true }` and remove in `finally`, or use `events.once`/`addAbortListener`.

### NODE-265 — What is `AggregateError`?

**Difficulty:** Intermediate

**Category:** Aggregation

**Question:**

What is `AggregateError`?

**Answer:**

An error wrapping many errors in `.errors`, thrown by `Promise.any` when all reject. You can create it manually to report multiple failures (e.g., validating batches).

**Follow-up:**

`Promise.all` vs `allSettled` vs `any` on errors?

Answer: `all` rejects on first failure (others continue running); `allSettled` never rejects and reports each outcome; `any` resolves on first success, rejects with `AggregateError` if all fail.

### NODE-266 — Does `Promise.all` cancel the other tasks on failure?

**Difficulty:** Intermediate

**Category:** Aggregation

**Question:**

Does `Promise.all` cancel the other tasks on failure?

**Answer:**

No. It rejects immediately but remaining promises keep running; their later rejections are handled silently by `all`. You must use `AbortController` for real cancellation.

**Follow-up:**

Pattern for fail-fast with cancellation?

Answer: Share a controller; on first error call `controller.abort()` in a catch, pass `signal` to all tasks, and use `allSettled` to wait for them to actually stop before cleanup.

### NODE-267 — Resource cleanup with `try/finally`?

**Difficulty:** Junior

**Category:** Resource cleanup

**Question:**

Resource cleanup with `try/finally`?

**Answer:**

`finally` runs on success, throw, or return, so use it to close files, release DB clients, unlock, and clear timers. Await async cleanup inside `finally`.

**Follow-up:**

What if `finally` throws?

Answer: It replaces the original error, losing it. Wrap cleanup in its own try/catch, log secondary failures, and rethrow the original (or use `AggregateError`/`cause`).

### NODE-268 — `using` / `Symbol.dispose` and explicit resource management?

**Difficulty:** Senior

**Category:** Resource cleanup

**Question:**

`using` / `Symbol.dispose` and explicit resource management?

**Answer:**

The TC39 `using`/`await using` proposal with `Symbol.dispose`/`asyncDispose` gives scoped cleanup. Node 20/22 have the symbols (polyfilled/experimental), but syntax needs TypeScript 5.2+ or Babel; native syntax support depends on V8 version (not general in 20/22).

**Follow-up:**

Alternatives today?

Answer: `try/finally`, helper `withResource(acquire, fn)` that guarantees release, `stream.pipeline`, and `FileHandle` (supports `asyncDispose` in newer Node).

### NODE-269 — Why do retries need backoff and jitter?

**Difficulty:** Junior

**Category:** Retries

**Question:**

Why do retries need backoff and jitter?

**Answer:**

Immediate retries amplify load on a struggling dependency (retry storm). Exponential backoff spaces attempts; jitter randomizes delays so clients don't synchronize (thundering herd).

**Follow-up:**

Which jitter strategy?

Answer: "Full jitter": `sleep = random(0, min(cap, base * 2^attempt))` — AWS analysis shows it minimizes contention and completion time versus equal or no jitter.

### NODE-270 — What should be retried, and what not?

**Difficulty:** Intermediate

**Category:** Retries

**Question:**

What should be retried, and what not?

**Answer:**

Retry transient, idempotent operations: network resets, timeouts, 503/429 (respect `Retry-After`). Don't retry validation errors (400/422), auth failures, or non-idempotent calls without idempotency keys.

**Follow-up:**

Retry budgets?

Answer: Cap retries per request and as a percentage of total traffic (e.g., ≤10%) so retries can't double load during outages; combine with circuit breaker.

### NODE-271 — Implement a retry helper concisely.

**Difficulty:** Intermediate

**Category:** Retries

**Question:**

Implement a retry helper concisely.

**Answer:**

Loop up to N attempts, `await fn({ signal })`, catch retryable errors, compute delay with full jitter, `await timers/promises.setTimeout(delay, undefined, { signal })`, rethrow last error with attempt count in `cause`.

**Follow-up:**

Where does the overall deadline fit?

Answer: Pass a single deadline signal (`AbortSignal.timeout(total)`) across attempts; stop retrying when it fires instead of per-attempt timeouts alone.

### NODE-272 — Circuit breaker concept?

**Difficulty:** Senior

**Category:** Resilience patterns

**Question:**

Circuit breaker concept?

**Answer:**

Wraps calls to a dependency with states: Closed (normal), Open (fail fast after threshold failures), Half-Open (probe a few calls after cooldown). Protects callers from slow failures and gives the dependency time to recover.

**Follow-up:**

Common Node libraries and tuning?

Answer: `opossum` is typical. Tune error percentage threshold, rolling window, minimum volume, reset timeout, and per-call timeout; provide a fallback and emit metrics on state changes.

### NODE-273 — Bulkhead pattern?

**Difficulty:** Senior

**Category:** Resilience patterns

**Question:**

Bulkhead pattern?

**Answer:**

Isolate resources per dependency/tenant (separate pools, concurrency limits, queues) so one slow component can't exhaust shared capacity, like ship compartments.

**Follow-up:**

How in Node?

Answer: Per-dependency concurrency limiters (`p-limit`, semaphore), separate HTTP agents with `maxSockets`, separate DB pools, bounded queues that reject (shed) when full, or separate processes/workers.

### NODE-274 — Why set timeouts on everything?

**Difficulty:** Junior

**Category:** Timeouts

**Question:**

Why set timeouts on everything?

**Answer:**

Without timeouts, a hung dependency holds sockets, memory, and event-loop callbacks indefinitely, cascading into outages. Set connect, request, and overall deadlines for HTTP, DB, and queue operations.

**Follow-up:**

Node http server timeouts?

Answer: `server.headersTimeout`, `requestTimeout` (default 300s in 18+), `keepAliveTimeout` (5s), and `server.timeout` (legacy). Tune keepAliveTimeout above the load balancer's idle timeout to avoid 502s.

### NODE-275 — Deadline propagation?

**Difficulty:** Senior

**Category:** Timeouts

**Question:**

Deadline propagation?

**Answer:**

Compute an absolute deadline at the edge and pass remaining time downstream (header like `x-deadline` or gRPC deadline) so inner calls use remaining budget rather than fresh full timeouts.

**Follow-up:**

Why better than independent timeouts?

Answer: Independent per-hop timeouts can sum beyond the client's patience, doing work no one waits for. Propagation lets downstream abort early and save resources.

### NODE-276 — What is idempotency and why vital with retries?

**Difficulty:** Junior

**Category:** Idempotency

**Question:**

What is idempotency and why vital with retries?

**Answer:**

An operation is idempotent if repeating it yields the same effect as once. Retries, redeliveries, and client double-clicks make duplicates inevitable; idempotent handlers make them safe.

**Follow-up:**

Which HTTP methods are idempotent?

Answer: GET, HEAD, PUT, DELETE, OPTIONS (by spec); POST and PATCH are not by default, so use idempotency keys for them.

### NODE-277 — How do you implement idempotency keys?

**Difficulty:** Senior

**Category:** Idempotency

**Question:**

How do you implement idempotency keys?

**Answer:**

Client sends `Idempotency-Key`. Server stores key + request fingerprint + result in a durable store with a unique constraint; first request executes, duplicates return the stored response (or 409 if in-flight/mismatch). Set TTL.

**Follow-up:**

Race between two concurrent same-key requests?

Answer: Atomically insert the key with "in-progress" status (unique index / `SET NX`); the loser waits or gets 409. Update to "completed" with the response in the same transaction as the side effect when possible.

### NODE-278 — Graceful degradation?

**Difficulty:** Intermediate

**Category:** Degradation

**Question:**

Graceful degradation?

**Answer:**

When a dependency fails, keep core functionality with reduced features: serve stale cache, default recommendations, disable optional widgets, queue writes, or return partial responses.

**Follow-up:**

How to decide what's degradable?

Answer: Classify features as critical vs optional, define fallbacks per dependency, use circuit breakers/feature flags, and test failure modes (chaos/fault injection).

### NODE-279 — Load shedding vs backpressure?

**Difficulty:** Senior

**Category:** Degradation

**Question:**

Load shedding vs backpressure?

**Answer:**

Backpressure slows producers when consumers lag (streams `highWaterMark`, `drain`). Load shedding rejects excess work (429/503) to keep latency bounded for accepted requests.

**Follow-up:**

Signal to shed in Node?

Answer: Event-loop delay (`perf_hooks.monitorEventLoopDelay`), queue depth, in-flight count, or memory; libraries like `under-pressure` return 503 with `Retry-After`.

### NODE-280 — Liveness vs readiness vs startup probes?

**Difficulty:** Junior

**Category:** Health checks

**Question:**

Liveness vs readiness vs startup probes?

**Answer:**

Liveness: is the process healthy enough that restart is the only fix? Readiness: can it serve traffic now (deps ready, not draining)? Startup: has slow initialization finished? Failing readiness removes from load balancing; failing liveness restarts.

**Follow-up:**

Common mistake?

Answer: Checking downstream dependencies in liveness, so a DB outage restarts every pod in a loop. Liveness should be cheap and local; put dependency checks in readiness (and with care).

### NODE-281 — What should a health endpoint do?

**Difficulty:** Intermediate

**Category:** Health checks

**Question:**

What should a health endpoint do?

**Answer:**

Respond fast (<100ms), no auth, minimal work, return 200/503 plus small JSON (status, version, uptime). Don't run heavy queries; cache dependency check results briefly.

**Follow-up:**

Readiness during shutdown?

Answer: Flip a `shuttingDown` flag so `/ready` returns 503 immediately on SIGTERM, letting the load balancer drain before the server stops accepting connections.

### NODE-282 — Structured logging principles?

**Difficulty:** Junior

**Category:** Logging

**Question:**

Structured logging principles?

**Answer:**

Emit JSON with consistent fields: timestamp, level, message, service, version, requestId/traceId, error {name, message, stack, code}. Machine-parsable logs enable search, aggregation, and alerts.

**Follow-up:**

Why pino over console.log?

Answer: Pino is fast (async-ish, minimal serialization overhead), JSON by default, supports child loggers with bound context and redaction of secrets, with separate transports (`pino.transport`) off the main thread.

### NODE-283 — Log levels and what not to log?

**Difficulty:** Intermediate

**Category:** Logging

**Question:**

Log levels and what not to log?

**Answer:**

Use error (needs action), warn (degraded), info (lifecycle/business events), debug/trace (off in prod). Never log secrets, tokens, full PII, or full request bodies; redact paths.

**Follow-up:**

Log-and-throw anti-pattern?

Answer: Logging at every layer and rethrowing produces duplicate noise. Log once at the boundary that handles the error; lower layers add context via `cause`.

### NODE-284 — Correlation IDs?

**Difficulty:** Junior

**Category:** Request context

**Question:**

Correlation IDs?

**Answer:**

A unique ID per request (accept incoming `x-request-id` or generate with `crypto.randomUUID()`), attached to all logs and forwarded to downstream calls, so you can trace a request across services.

**Follow-up:**

Correlation ID vs trace ID?

Answer: Correlation IDs are simple opaque links; W3C Trace Context (`traceparent`) adds span hierarchy and sampling for distributed tracing (OpenTelemetry). Prefer trace context where available and log its IDs.

### NODE-285 — `AsyncLocalStorage` for request context?

**Difficulty:** Senior

**Category:** Request context

**Question:**

`AsyncLocalStorage` for request context?

**Answer:**

`AsyncLocalStorage` (`node:async_hooks`) keeps context across async continuations. `als.run(store, () => next())` in middleware; any code later calls `als.getStore()` to read requestId without passing parameters.

**Follow-up:**

Gotchas?

Answer: Context can be lost with callback-based libraries/custom thenables/pools (use `AsyncResource.bind`), and has some overhead (improved in Node 22 via AsyncContextFrame work). `enterWith` leaks scope; prefer `run`.

### NODE-286 — Connecting ALS with logging?

**Difficulty:** Intermediate

**Category:** Request context

**Question:**

Connecting ALS with logging?

**Answer:**

Create a logger mixin (pino `mixin()`) that reads `als.getStore()` and adds `requestId`, `userId` to each log line, so no code needs to pass a logger around.

**Follow-up:**

Handling background jobs?

Answer: Start a new `als.run` with a generated job/correlation ID (or the one carried in the message) at the job entry so logs from workers remain traceable.

### NODE-287 — Crash-only design?

**Difficulty:** Senior

**Category:** Crash-only design

**Question:**

Crash-only design?

**Answer:**

Design software so the only way to stop is crashing and the only way to start is recovery. Shutdown paths equal crash paths, so recovery is always exercised: durable state, idempotent startup, no reliance on clean exit.

**Follow-up:**

Implications for Node services?

Answer: Keep state in external stores, make handlers idempotent, persist queue offsets/acks after side effects, keep startup fast, and use a supervisor to restart. Graceful drain is an optimization, not a requirement.

### NODE-288 — Why were `domain` modules deprecated?

**Difficulty:** Senior

**Category:** Crash-only design

**Question:**

Why were `domain` modules deprecated?

**Answer:**

Domains tried to route uncaught errors to handlers by binding emitters/callbacks, but they were implicit, unreliable (lost context, memory leaks), encouraged resuming after errors, and had performance/maintenance costs. Docs mark them pending deprecation.

**Follow-up:**

Replacement?

Answer: Explicit error handling (promises, `error` event listeners), `AsyncLocalStorage` for context, and process-level crash + restart for unknown errors.

### NODE-289 — EventEmitter `'error'` event behavior?

**Difficulty:** Junior

**Category:** Emitters and streams

**Question:**

EventEmitter `'error'` event behavior?

**Answer:**

Emitting `'error'` with no listener throws the error (crashing the process if uncaught). Streams, sockets, and servers emit it, so each must have an `error` handler.

**Follow-up:**

`captureRejections` option?

Answer: `new EventEmitter({ captureRejections: true })` routes rejected async listener promises to the `'error'` event (or `Symbol.for('nodejs.rejection')`) instead of unhandledRejection.

### NODE-290 — Handling stream errors reliably?

**Difficulty:** Intermediate

**Category:** Emitters and streams

**Question:**

Handling stream errors reliably?

**Answer:**

Use `stream.pipeline` / `stream/promises.pipeline`, which forwards errors, destroys all streams, and cleans up. Bare `.pipe()` doesn't propagate errors or destroy the destination.

**Follow-up:**

What does a premature close look like?

Answer: `ERR_STREAM_PREMATURE_CLOSE` when a stream closes before ending. For HTTP, client disconnects trigger it; handle by aborting upstream work.

### NODE-291 — Handling process signals (SIGTERM, SIGINT)?

**Difficulty:** Junior

**Category:** Graceful shutdown

**Question:**

Handling process signals (SIGTERM, SIGINT)?

**Answer:**

Orchestrators send SIGTERM then SIGKILL after a grace period. Register `process.once('SIGTERM', shutdown)` and `SIGINT`; SIGKILL can't be caught. Make shutdown idempotent so repeated signals don't re-enter.

**Follow-up:**

PID 1 issue in containers?

Answer: Node as PID 1 doesn't get default signal handling and doesn't reap zombies; use `--init`/tini, or ensure explicit handlers. Also run `node` directly, not via `npm start`, which may not forward signals.

### NODE-292 — Graceful shutdown with connection draining?

**Difficulty:** Senior

**Category:** Graceful shutdown

**Question:**

Graceful shutdown with connection draining?

**Answer:**

On SIGTERM: mark not-ready, wait briefly for LB deregistration, `server.close()` (stop new connections), call `server.closeIdleConnections()` (Node 18.2+), wait for in-flight requests, close DB/queues, exit; force-exit after a timeout.

**Follow-up:**

Why doesn't `server.close()` finish with keep-alive?

Answer: It waits for existing connections to close; idle keep-alive sockets stay open. Use `closeIdleConnections()` and after a deadline `closeAllConnections()`; Node 19+ `close()` already closes idle ones.

### NODE-293 — Choosing a shutdown timeout?

**Difficulty:** Senior

**Category:** Graceful shutdown

**Question:**

Choosing a shutdown timeout?

**Answer:**

Must be less than the orchestrator's kill grace (k8s `terminationGracePeriodSeconds`, default 30s). Set app drain budget slightly lower and consider `preStop` sleep for LB propagation.

**Follow-up:**

What if requests exceed the budget?

Answer: Abort them (via signal), return 503 where possible, and rely on client retries with idempotency; never exceed the hard kill.

### NODE-294 — Kubernetes restart policies and probe implications?

**Difficulty:** Senior

**Category:** Supervisors

**Question:**

Kubernetes restart policies and probe implications?

**Answer:**

Pods use `restartPolicy` (Always for Deployments); crash causes kubelet restarts with exponential backoff (CrashLoopBackOff up to 5 min). Liveness failures kill containers; readiness failures only remove from endpoints.

**Follow-up:**

Why is a crash loop dangerous?

Answer: Fatal startup errors (bad config, dependency down) cause repeated restarts and flapping; backoff delays recovery. Validate config early, fail with clear exit codes, and avoid liveness checks tied to external dependencies.

### NODE-295 — supervisord / systemd / PM2 restart considerations?

**Difficulty:** Intermediate

**Category:** Supervisors

**Question:**

supervisord / systemd / PM2 restart considerations?

**Answer:**

They restart on exit; configure `autorestart`, `startretries`, `startsecs` (supervisord) or `Restart=on-failure`, `RestartSec` (systemd) to avoid tight loops. Ensure stop signals and timeouts match graceful shutdown.

**Follow-up:**

Exit codes matter how?

Answer: Distinguish clean (0) from failure (non-zero) and from "do not restart" codes (`exitcodes`/`RestartPreventExitStatus`). Fatal config errors should not infinitely restart.

### NODE-296 — Poison messages?

**Difficulty:** Senior

**Category:** Messaging reliability

**Question:**

Poison messages?

**Answer:**

A message that always fails processing (malformed, triggers a bug) and gets redelivered forever, blocking the queue or burning resources. Mitigate with max attempts, dead-letter queues, and parking with error metadata.

**Follow-up:**

Handling in Kafka vs SQS/RabbitMQ?

Answer: SQS: `maxReceiveCount` → DLQ via redrive policy. RabbitMQ: reject with `requeue=false` to a DLX. Kafka has no built-in DLQ: publish failures to a retry/dead topic yourself so the partition keeps advancing.

### NODE-297 — At-least-once vs at-most-once vs exactly-once?

**Difficulty:** Senior

**Category:** Messaging reliability

**Question:**

At-least-once vs at-most-once vs exactly-once?

**Answer:**

At-most-once may lose messages; at-least-once never loses but may duplicate; "exactly-once" delivery is not achievable across arbitrary systems — you get exactly-once *effects* via at-least-once plus idempotent/transactional processing.

**Follow-up:**

What does Kafka's "exactly-once" actually cover?

Answer: Idempotent producer plus transactions across Kafka topics and offsets (read-process-write within Kafka). Side effects outside Kafka (DB, HTTP) still need idempotency or outbox/transactional patterns.

### NODE-298 — Ack timing in a consumer?

**Difficulty:** Senior

**Category:** Messaging reliability

**Question:**

Ack timing in a consumer?

**Answer:**

Ack after the work completes: crashes before ack cause redelivery (at-least-once). Ack before work risks loss (at-most-once). Pair late ack with idempotent processing and a visibility/ack timeout longer than max processing time.

**Follow-up:**

Duplicate when ack fails after success?

Answer: Yes, work done but redelivered. Dedupe via processed-message-ID table (unique constraint, ideally in the same transaction as the side effect) or naturally idempotent writes (upserts).

### NODE-299 — Outbox pattern?

**Difficulty:** Senior

**Category:** Messaging reliability

**Question:**

Outbox pattern?

**Answer:**

Write business data and an outbox event in one DB transaction; a separate relay publishes events to the broker and marks them sent. This avoids dual-write inconsistency between DB and queue.

**Follow-up:**

Delivery guarantee?

Answer: At-least-once (relay may publish then crash before marking sent), so consumers must be idempotent; events carry a stable ID for dedupe.

### NODE-300 — Build a minimal reliability checklist for a Node service.

**Difficulty:** Senior

**Category:** Checklist

**Question:**

Build a minimal reliability checklist for a Node service.

**Answer:**

Typed errors with `code`/`cause`; central error handler; fatal handlers (`uncaughtException`/`unhandledRejection`) that log and exit; timeouts and `AbortSignal` everywhere; bounded retries with jitter; circuit breaker and bulkheads; idempotency keys; health/readiness/liveness; structured logs with correlation IDs via ALS; SIGTERM drain shorter than grace period; DLQ for poison messages; chaos/failure testing.

**Follow-up:**

How do you verify it works?

Answer: Fault-injection tests (kill dependencies, add latency, drop connections), load tests with failure, rolling-restart drills checking zero 5xx, alerts on error rate/saturation, and runbooks tied to SLOs.
