# Node.js — Essential (3-day)

Selected 90 of 500. Ordered by preparation priority within each tier.

## Must Know (40)

1. [NODE-052](../nodejs/02-event-loop.md#node-052) — One callback, then nextTick, then promise jobs
   Why: The after-callback checkpoint (nextTick then promise jobs) is the most-tested Node mental model. Score: 4.90

2. [NODE-051](../nodejs/02-event-loop.md#node-051) — The phases a Node 20 loop actually walks
   Why: Phase order (timers → pending → poll → check → close) is the scaffold for every scheduling question. Score: 4.85

3. [NODE-002](../nodejs/01-runtime-foundations.md#node-002) — One call stack per isolate, and where an async callback actually runs
   Why: One JS call stack per isolate; libuv pool never runs your JavaScript callbacks. Score: 4.85

4. [NODE-102](../nodejs/03-concurrency.md#node-102) — Why I/O scales on one thread and CPU does not
   Why: Why Node scales I/O on one thread but CPU work stalls everyone—core senior framing. Score: 4.85

5. [NODE-003](../nodejs/01-runtime-foundations.md#node-003) — Why a synchronous loop stalls callbacks that are already finished
   Why: Sync work blocks already-finished async callbacks until the stack clears. Score: 4.80

6. [NODE-257](../nodejs/06-errors-reliability.md#node-257) — What triggers `unhandledRejection` and what does Node 15+ do?
   Why: Unhandled rejections crash by default on modern Node—must know process-level behavior. Score: 4.80

7. [NODE-056](../nodejs/02-event-loop.md#node-056) — await resumes as a microtask on this same thread
   Why: await resumes as a microtask on the same thread, not a later phase. Score: 4.75

8. [NODE-253](../nodejs/06-errors-reliability.md#node-253) — Operational vs programmer errors?
   Why: Operational vs programmer errors drives whether you retry, fail the request, or crash. Score: 4.75

9. [NODE-155](../nodejs/04-streams.md#node-155) — Backpressure
   Why: Backpressure is how Node services stay memory-safe under load. Score: 4.70

10. [NODE-069](../nodejs/02-event-loop.md#node-069) — A long synchronous callback stalls every later phase
   Why: A long synchronous callback stalls every later phase—classic production outage pattern. Score: 4.70

11. [NODE-079](../nodejs/02-event-loop.md#node-079) — fs.readFile uses the pool because a file read can block; a TCP read does not
   Why: fs/dns.lookup/crypto use the pool; TCP sockets do not—explains mysterious latency. Score: 4.70

12. [NODE-292](../nodejs/06-errors-reliability.md#node-292) — Graceful shutdown with connection draining?
   Why: SIGTERM + drain in-flight work is expected senior production knowledge. Score: 4.70

13. [NODE-101](../nodejs/03-concurrency.md#node-101) — Why async is not parallel
   Why: Async concurrency is interleaving, not parallel JS—clears the biggest misconception. Score: 4.65

14. [NODE-057](../nodejs/02-event-loop.md#node-057) — A tight nextTick loop starves I/O
   Why: Tight nextTick loops starve I/O and timers; shows microtask/nextTick danger. Score: 4.65

15. [NODE-082](../nodejs/02-event-loop.md#node-082) — An async function that throws rejects; a non-async throw escapes the turn
   Why: Throw in async rejects; throw in a plain callback escapes the turn—error-handling trap. Score: 4.65

16. [NODE-262](../nodejs/06-errors-reliability.md#node-262) — What is `AbortController`/`AbortSignal` and how do errors surface?
   Why: AbortController/AbortSignal is the standard cancellation story across fetch, HTTP, and timers. Score: 4.65

17. [NODE-259](../nodejs/06-errors-reliability.md#node-259) — What should you do on `uncaughtException`?
   Why: uncaughtException means process state is unknown—log and exit, do not recover. Score: 4.65

18. [NODE-103](../nodejs/03-concurrency.md#node-103) — Options for CPU-heavy work
   Why: Workers, child processes, or offload—interviewers expect a clear CPU-work menu. Score: 4.60

19. [NODE-055](../nodejs/02-event-loop.md#node-055) — Timeout versus immediate inside I/O, and at the top level
   Why: Timeout vs immediate ordering depends on I/O vs top-level—classic gotcha. Score: 4.60

20. [NODE-156](../nodejs/04-streams.md#node-156) — pipe vs pipeline
   Why: pipeline cleans up and forwards errors; pipe does not—prefer pipeline in production. Score: 4.60

21. [NODE-289](../nodejs/06-errors-reliability.md#node-289) — EventEmitter `'error'` event behavior?
   Why: Missing 'error' listener crashes; emit is sync on the current stack. Score: 4.60

22. [NODE-119](../nodejs/03-concurrency.md#node-119) — UV_THREADPOOL_SIZE versus worker threads
   Why: UV_THREADPOOL_SIZE vs worker_threads—different tools for different bottlenecks. Score: 4.55

23. [NODE-053](../nodejs/02-event-loop.md#node-053) — setTimeout(fn, 0) is a timer with a minimum, not "run next"
   Why: setTimeout(fn,0) is a timer with a minimum delay, not 'run next'. Score: 4.55

24. [NODE-274](../nodejs/06-errors-reliability.md#node-274) — Why set timeouts on everything?
   Why: Timeouts on every outbound call prevent cascading hangs. Score: 4.55

25. [NODE-276](../nodejs/06-errors-reliability.md#node-276) — What is idempotency and why vital with retries?
   Why: Idempotency is required once you add retries in distributed APIs. Score: 4.55

26. [NODE-178](../nodejs/04-streams.md#node-178) — Memory blowup from wrong buffering
   Why: Wrong stream buffering OOMs the process—high-signal streams failure mode. Score: 4.55

27. [NODE-338](../nodejs/07-performance-memory.md#node-338) — Sync I/O on the request path
   Why: Sync fs/crypto/JSON on the request path destroys p99 for everyone. Score: 4.55

28. [NODE-399](../nodejs/08-security.md#node-399) — Event-loop denial of service and JSON bombs
   Why: ReDoS/JSON bombs as event-loop DoS—security meets the single-threaded model. Score: 4.55

29. [NODE-239](../nodejs/05-http.md#node-239) — Graceful HTTP shutdown
   Why: server.close + idle connection cleanup for zero-downtime deploys. Score: 4.55

30. [NODE-355](../nodejs/08-security.md#node-355) — ReDoS on the event loop
   Why: Catastrophic regex on user input freezes the event loop—top Node security ask. Score: 4.55

31. [NODE-120](../nodejs/03-concurrency.md#node-120) — What uses the libuv threadpool
   Why: Know what shares the default 4-thread pool so you can diagnose saturation. Score: 4.50

32. [NODE-104](../nodejs/03-concurrency.md#node-104) — What a worker thread is
   Why: Worker threads = separate isolates for true parallel JS CPU work. Score: 4.50

33. [NODE-269](../nodejs/06-errors-reliability.md#node-269) — Why do retries need backoff and jitter?
   Why: Backoff + jitter prevents retry storms after outages. Score: 4.50

34. [NODE-179](../nodejs/04-streams.md#node-179) — Ignoring write() return value
   Why: Ignoring write() false means you ignore backpressure and buffer forever. Score: 4.50

35. [NODE-010](../nodejs/01-runtime-foundations.md#node-010) — What V8 does, what Node adds, and where libuv starts
   Why: V8 vs Node APIs vs libuv boundary is the architecture diagram seniors sketch. Score: 4.50

36. [NODE-361](../nodejs/08-security.md#node-361) — Command injection through `exec`
   Why: exec with shell interpolation is classic RCE—prefer execFile/spawn without shell. Score: 4.50

37. [NODE-351](../nodejs/08-security.md#node-351) — What prototype pollution is
   Why: Prototype pollution via unsafe merges is a recurring Node library vulnerability. Score: 4.50

38. [NODE-255](../nodejs/06-errors-reliability.md#node-255) — Error handling patterns: callbacks, promises, async/await?
   Why: Callbacks vs promises vs async/await error propagation must be fluent. Score: 4.45

39. [NODE-209](../nodejs/05-http.md#node-209) — Request body size limits
   Why: Unbounded request bodies are an easy memory/DoS footgun. Score: 4.45

40. [NODE-330](../nodejs/07-performance-memory.md#node-330) — RSS, heapTotal, and heapUsed
   Why: RSS vs heapTotal vs heapUsed is the baseline for any memory discussion. Score: 4.40

## Important (30)

1. [NODE-058](../nodejs/02-event-loop.md#node-058) — What poll does, and when it waits
   Why: Poll waits for I/O and runs completions—where most async callbacks land. Score: 4.40

2. [NODE-070](../nodejs/02-event-loop.md#node-070) — A promise chain that never empties is starvation too
   Why: Never-ending promise/microtask chains starve the loop as badly as nextTick. Score: 4.40

3. [NODE-314](../nodejs/07-performance-memory.md#node-314) — Usual causes of loop lag
   Why: Usual causes of event-loop lag: sync CPU, GC, saturated pool, huge JSON. Score: 4.40

4. [NODE-176](../nodejs/04-streams.md#node-176) — pipe error-handling pitfalls
   Why: pipe error-handling pitfalls explain many half-closed stream bugs. Score: 4.40

5. [NODE-358](../nodejs/08-security.md#node-358) — Path traversal with `path.join`
   Why: path.join with user segments enables traversal unless you resolve and root-check. Score: 4.40

6. [NODE-054](../nodejs/02-event-loop.md#node-054) — setImmediate is the check phase
   Why: setImmediate is the check phase—needed to reason about post-I/O work. Score: 4.35

7. [NODE-035](../nodejs/01-runtime-foundations.md#node-035) — What keeps the process from exiting
   Why: Handles, timers, servers, and workers vote to keep the process alive. Score: 4.35

8. [NODE-159](../nodejs/04-streams.md#node-159) — destroy and error propagation
   Why: destroy and error propagation determine whether pipelines tear down cleanly. Score: 4.35

9. [NODE-200](../nodejs/04-streams.md#node-200) — Reading a body to JSON safely
   Why: Reading a body to JSON safely needs size limits and stream error handling. Score: 4.35

10. [NODE-131](../nodejs/03-concurrency.md#node-131) — child_process versus workers
   Why: child_process for OS tools/isolation vs workers for in-process CPU. Score: 4.35

11. [NODE-207](../nodejs/05-http.md#node-207) — headersTimeout and requestTimeout
   Why: headersTimeout/requestTimeout harden servers against slowloris-style clients. Score: 4.35

12. [NODE-270](../nodejs/06-errors-reliability.md#node-270) — What should be retried, and what not?
   Why: Retry only idempotent/transient failures—avoids duplicate side effects. Score: 4.35

13. [NODE-285](../nodejs/06-errors-reliability.md#node-285) — `AsyncLocalStorage` for request context?
   Why: AsyncLocalStorage is the Node way to carry request context across awaits. Score: 4.35

14. [NODE-311](../nodejs/07-performance-memory.md#node-311) — `monitorEventLoopDelay`
   Why: monitorEventLoopDelay is the production signal for loop health. Score: 4.35

15. [NODE-324](../nodejs/07-performance-memory.md#node-324) — Leak versus a large cache
   Why: Distinguish a growing cache from a true leak before you chase ghosts. Score: 4.35

16. [NODE-340](../nodejs/07-performance-memory.md#node-340) — `JSON.parse` and `JSON.stringify`
   Why: Large JSON.parse/stringify blocks the loop—stream or worker when huge. Score: 4.35

17. [NODE-364](../nodejs/08-security.md#node-364) — SSRF and cloud metadata
   Why: SSRF to cloud metadata is a high-severity Node service risk. Score: 4.35

18. [NODE-013](../nodejs/01-runtime-foundations.md#node-013) — ESM live bindings and the CommonJS exports object are different mechanisms
   Why: ESM live bindings vs CJS exports object—module-system interview staple. Score: 4.30

19. [NODE-012](../nodejs/01-runtime-foundations.md#node-012) — require.cache is one module object, not a value snapshot
   Why: require.cache holds one module object; mutations and singletons follow. Score: 4.30

20. [NODE-115](../nodejs/03-concurrency.md#node-115) — What a worker pool is for
   Why: A worker pool bounds CPU parallelism without unbounded thread spawn. Score: 4.30

21. [NODE-141](../nodejs/03-concurrency.md#node-141) — How cluster distributes connections
   Why: How cluster shares the listen socket and distributes connections. Score: 4.30

22. [NODE-221](../nodejs/05-http.md#node-221) — AbortSignal with fetch and http.request
   Why: AbortSignal with fetch/http.request is practical cancellation wiring. Score: 4.30

23. [NODE-231](../nodejs/05-http.md#node-231) — Trusting X-Forwarded headers
   Why: Trusting X-Forwarded-* only behind a known proxy prevents IP spoofing. Score: 4.30

24. [NODE-272](../nodejs/06-errors-reliability.md#node-272) — Circuit breaker concept?
   Why: Circuit breakers stop retry amplification against a failing dependency. Score: 4.30

25. [NODE-322](../nodejs/07-performance-memory.md#node-322) — Shallow size versus retained size
   Why: Shallow vs retained size is how you read heap snapshots usefully. Score: 4.30

26. [NODE-373](../nodejs/08-security.md#node-373) — HttpOnly, Secure, and SameSite
   Why: HttpOnly, Secure, SameSite are table-stakes cookie hardening. Score: 4.30

27. [NODE-429](../nodejs/09-testing-ops.md#node-429) — Metrics, logs, and traces
   Why: Metrics, logs, and traces—what each is for in a Node service. Score: 4.30

28. [NODE-442](../nodejs/09-testing-ops.md#node-442) — Liveness, readiness, and startup
   Why: Liveness vs readiness vs startup probes—wrong probes cause flapping. Score: 4.25

29. [NODE-448](../nodejs/09-testing-ops.md#node-448) — Graceful shutdown on SIGTERM
   Why: Graceful shutdown on SIGTERM for rolling/K8s deploys. Score: 4.25

30. [NODE-466](../nodejs/10-advanced-design.md#node-466) — Backpressure across queues and HTTP
   Why: Backpressure must span HTTP, queues, and workers—not just streams. Score: 4.25

## Advanced (20)

1. [NODE-063](../nodejs/02-event-loop.md#node-063) — A nextTick queued from a promise job still beats the next phase
   Why: nextTick queued from a promise job still beats the next phase—deep ordering. Score: 4.20

2. [NODE-097](../nodejs/02-event-loop.md#node-097) — A chain of setImmediate reaches later phases; a chain of microtasks does not
   Why: Immediate chains yield to later phases; microtask chains never do. Score: 4.20

3. [NODE-150](../nodejs/03-concurrency.md#node-150) — Choosing a concurrency tool
   Why: Synthesis: pick workers, pool, child_process, or cluster for the bottleneck. Score: 4.20

4. [NODE-275](../nodejs/06-errors-reliability.md#node-275) — Deadline propagation?
   Why: Deadline propagation across service calls prevents zombie work. Score: 4.15

5. [NODE-279](../nodejs/06-errors-reliability.md#node-279) — Load shedding vs backpressure?
   Why: Load shedding vs backpressure—when to refuse work vs slow producers. Score: 4.15

6. [NODE-297](../nodejs/06-errors-reliability.md#node-297) — At-least-once vs at-most-once vs exactly-once?
   Why: At-least-once vs at-most-once vs exactly-once for messaging design. Score: 4.15

7. [NODE-484](../nodejs/10-advanced-design.md#node-484) — Exactly-once illusions
   Why: Exactly-once is usually an illusion—design for idempotent consumers. Score: 4.15

8. [NODE-121](../nodejs/03-concurrency.md#node-121) — Diagnosing threadpool saturation
   Why: Diagnosing threadpool saturation (fs/dns/crypto contention). Score: 4.10

9. [NODE-116](../nodejs/03-concurrency.md#node-116) — Designing a worker pool
   Why: Designing a worker pool: queue, sizing, backpressure, failure handling. Score: 4.10

10. [NODE-142](../nodejs/03-concurrency.md#node-142) — Cluster versus worker_threads
   Why: Cluster for multi-process scaling vs workers for parallel CPU in-process. Score: 4.10

11. [NODE-250](../nodejs/05-http.md#node-250) — Defending against slow and abusive clients
   Why: Defending against slow and abusive HTTP clients end-to-end. Score: 4.10

12. [NODE-194](../nodejs/04-streams.md#node-194) — Gzip with streams and the libuv pool
   Why: zlib streams and the libuv pool—compression can saturate the pool. Score: 4.05

13. [NODE-328](../nodejs/07-performance-memory.md#node-328) — Buffer slices that retain a slab
   Why: Buffer slices retaining a large slab is a subtle leak pattern. Score: 4.05

14. [NODE-350](../nodejs/07-performance-memory.md#node-350) — Investigating a latency regression
   Why: Investigating a p99 latency regression with profiles and loop metrics. Score: 4.05

15. [NODE-305](../nodejs/07-performance-memory.md#node-305) — Why a public inspector is RCE
   Why: A public --inspect port is remote code execution—ops security. Score: 4.00

16. [NODE-365](../nodejs/08-security.md#node-365) — DNS rebinding and redirects
   Why: DNS rebinding and redirects defeat naive SSRF URL allowlists. Score: 4.00

17. [NODE-386](../nodejs/08-security.md#node-386) — Typosquatting and dependency confusion
   Why: Typosquatting and dependency confusion in the npm supply chain. Score: 4.00

18. [NODE-449](../nodejs/09-testing-ops.md#node-449) — The race with the load balancer
   Why: Load-balancer race with shutdown—readiness before SIGTERM handling. Score: 3.95

19. [NODE-450](../nodejs/09-testing-ops.md#node-450) — Container memory limits and the V8 heap
   Why: Container memory limits vs V8 heap—OOMKilled without heap pressure. Score: 3.95

20. [NODE-460](../nodejs/10-advanced-design.md#node-460) — Transactional outbox
   Why: Transactional outbox reliably publishes after DB commits. Score: 3.95
