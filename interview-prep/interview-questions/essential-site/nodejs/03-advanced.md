# Essential Node.js — Advanced

3-day essential set. 20 questions in preparation order. Full handbook remains under `nodejs/`.

### NODE-063 — A nextTick queued from a promise job still beats the next phase

**Difficulty:** Senior

**Category:** Microtasks

**Question:**

Predict the log. Focus on `process.nextTick` inside a promise reaction and the promise scheduled from a `nextTick`. `onTurn` is a phase callback, not top-level ESM.

```js
function onTurn() {
  console.log('sync');
  process.nextTick(() => {
    console.log('tick');
    Promise.resolve().then(() => console.log('promise-from-tick'));
  });
  Promise.resolve().then(() => {
    console.log('promise');
    process.nextTick(() => console.log('tick-from-promise'));
  });
  queueMicrotask(() => console.log('micro'));
  setImmediate(() => console.log('immediate'));
  console.log('sync-end');
}
```

**Answer:**

Node drains every `nextTick`, then the microtasks, and if a microtask queued a new `nextTick` it drains that too, all before the next phase. The order is `sync`, `sync-end`, `tick`, `promise`, `micro`, `promise-from-tick`, `tick-from-promise`, `immediate`. `promise-from-tick` was queued during the `nextTick` drain, so it is already waiting when microtasks start. `tick-from-promise` is queued during `promise`, so it runs only after the microtask queue empties, and it still runs before check. The rule is not "run `nextTick` once, then let promises run forever."

**Follow-up:**

Add `queueMicrotask(() => console.log('inner'))` as the first line of the `promise` reaction. Where does `inner` print?

Answer: It prints after `promise`, and after `micro` and `promise-from-tick`, which were already queued, and before `tick-from-promise`. The sequence through that part is `promise`, `micro`, `promise-from-tick`, `inner`, `tick-from-promise`.

### NODE-097 — A chain of setImmediate reaches later phases; a chain of microtasks does not

**Difficulty:** Senior

**Category:** Scheduling

**Question:**

A check callback must process a queue and also let a due timer run. Compare rescheduling the next chunk with `setImmediate` versus `queueMicrotask`. Which one lets the Node 20 or 22 lap reach timers, and where does poll fit?

**Answer:**

An unbounded `queueMicrotask` chain never finishes this checkpoint, so the due timer and poll stay blocked. A nested `setImmediate` from inside check waits for the next iteration, because it misses the current snapshot. This lap can still reach close and then timers before that nested immediate runs, so a timer that is already due can run first. Later laps get a poll visit before the following check. Rescheduling with `process.nextTick` is stricter than microtasks: it holds off the microtask queue as well, and poll still never starts.

**Follow-up:**

Start the `setImmediate` chain from poll instead of from check. Can the due timer run before the second chunk?

Answer: The first nested immediate is this lap's check, which is before timers, so that second chunk runs before the due timer. Later chunks, scheduled from inside check, wait for following laps that come after this timer. Which chunk you mean changes the answer, as NODE-064 describes.

### NODE-150 — Choosing a concurrency tool

**Difficulty:** Staff

**Category:** Synthesis

**Question:**

Give a decision guide for `async`/`await`, workers, child processes, cluster, and the libuv thread pool.

**Answer:**

Use `async`/`await` when the work is waiting on I/O. Use a worker pool for JavaScript CPU in one process, and transfer or share buffers when the payload is large. If `fs`, DNS, or crypto is slow while the loop is idle, tune `UV_THREADPOOL_SIZE` before adding workers. Use `child_process` for another language or a crash boundary. Use cluster or replicas to spread requests across cores. Untrusted code belongs in a process or container, never in `vm` alone. Measure loop delay before and after, and include every worker and child in shutdown.

**Follow-up:**

What is the clearest signal that the main thread is the bottleneck?

Answer: Event-loop delay stays high, or event-loop utilization stays near 1, and a CPU profile shows the time inside JavaScript frames. `perf_hooks.monitorEventLoopDelay()` is the usual way to see the delay.

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

### NODE-484 — Exactly-once illusions

**Difficulty:** Senior

**Category:** event-driven

**Question:**

Why do you say “exactly-once” delivery is usually an illusion across Node services?

**Answer:**

Brokers may offer exactly-once within a closed ecosystem, but end-to-end you still have producer retries, consumer crashes after side effects, and multi-system writes. Practically you design for at-least-once plus idempotent consumers—inbox keys, upserts, conditional writes. Claiming exactly-once without stating the boundary misleads the team. Interview strength: name the boundary (Kafka transactions to Kafka consumers) and what still requires idempotency outside it.

**Follow-up:**

What is your default consumer assumption?

Answer: At-least-once; make handlers idempotent by design.

### NODE-121 — Diagnosing threadpool saturation

**Difficulty:** Senior

**Category:** Threadpool vs workers

**Question:**

Event-loop delay is low, CPU is not saturated, and yet file reads and password hashing are slow under load. What do you suspect, and what do you change?

**Answer:**

Suspect a full libuv thread pool. With four threads, a fifth concurrent `pbkdf2` or a slow `fs` call waits even though the JavaScript thread is idle and the cores are not busy. Time the call alone and under concurrency, and see whether latency grows with in-flight native calls. Then raise `UV_THREADPOOL_SIZE`, cap how many of those calls you start, or move the work to workers or another service. More threads are not automatically better. Too many add contention and memory, so size the pool from the concurrency you measured and the cores you have.

**Follow-up:**

Is a larger pool always faster?

Answer: No. Past the useful concurrency, extra threads contend and use memory. Size the pool from the native work you measured and from the cores available.

### NODE-116 — Designing a worker pool

**Difficulty:** Senior

**Category:** Pools

**Question:**

Outline the core mechanics of a promise-based worker pool.

**Answer:**

Keep three structures: a list of idle workers, a FIFO queue of tasks, and a map from task id to the promise's resolve and reject. `run` returns a promise. If a worker is idle, mark it busy and `postMessage` the id and payload. Otherwise enqueue the task. On `'message'`, settle the promise for that id, mark the worker idle, and pull the next queued task. On `'error'` or `'exit'`, reject the in-flight task and start a replacement worker. Add a queue limit, a per-task timeout, and a `destroy` that stops intake, waits or abandons in-flight work, and terminates the workers.

**Follow-up:**

How do you cancel a task that is already running?

Answer: You cannot cooperatively pause synchronous JavaScript inside the worker. Terminate that worker and replace it, or have long tasks periodically check a shared flag or an incoming message.

### NODE-142 — Cluster versus worker_threads

**Difficulty:** Senior

**Category:** cluster

**Question:**

When do you choose cluster, and when do you choose worker threads?

**Answer:**

Cluster scales a network server across cores. Each process has its own event loop and memory, so one crash stays in that process. Worker threads move CPU-bound JavaScript off one loop, inside a single process, with cheaper messages and an optional `SharedArrayBuffer`. They solve different problems, and you can use both: cluster or replicas for requests, and a worker pool in each process for heavy tasks. On Kubernetes, several single-process replicas often replace cluster, because the orchestrator already restarts pods, checks health, scales, and sets limits.

**Follow-up:**

Why might one process per pod beat cluster on Kubernetes?

Answer: The orchestrator already restarts the pod, checks health, scales, and applies resource limits. A cluster primary inside the container repeats that supervision.

### NODE-250 — Defending against slow and abusive clients

**Difficulty:** Senior

**Category:** Hardening

**Question:**

How do you defend a bare Node HTTP server against slow or abusive clients?

**Answer:**

Combine several layers: `headersTimeout`, `requestTimeout`, `keepAliveTimeout`, `server.maxConnections`, and `maxRequestsPerSocket` (to rotate connections). Add body size limits, and put a proxy or WAF with rate limiting in front. Handle backpressure and cancel work on `close`. Keep Node updated for parser and HTTP/2 security fixes.

**Follow-up:**

What does `maxRequestsPerSocket` do?

Answer: After N requests on one keep-alive connection, Node sends `Connection: close`, which forces the client to reconnect. This helps rebalance load and bound per-connection state. The default `0` means unlimited.

### NODE-194 — Gzip with streams and the libuv pool

**Difficulty:** Senior

**Category:** zlib

**Question:**

How do you gzip a file with streams, and what happens under heavy parallel use?

**Answer:**

Use `await pipeline(createReadStream(src), zlib.createGzip(), createWriteStream(dst))`, and `createGunzip()` to decompress. Memory stays bounded. Async zlib work runs on libuv's threadpool, which has four threads by default (`UV_THREADPOOL_SIZE`). Under heavy parallel use, compressions queue up and can also delay `fs` calls and `dns.lookup`. Also note that `zlib.createZstdCompress` was added only in later 22.x releases (22.15) as experimental, so check your exact release.

**Follow-up:**

Where does a corrupt gzip input fail?

Answer: The Gunzip stream emits an error such as `Z_DATA_ERROR`. `pipeline` destroys the other streams and rejects, so the descriptors are closed.

### NODE-328 — Buffer slices that retain a slab

**Difficulty:** Senior

**Category:** Leaks

**Question:**

How can a small `Buffer` slice keep a large slab alive?

**Answer:**

`Buffer.allocUnsafe` of a small size is often carved out of a shared pool slab, historically eight kilobytes, via `Buffer.poolSize`. The slice is a view onto that slab. If I stash the slice in a cache, the whole slab stays reachable, including bytes that belonged to other requests. Separately, `buf.subarray` or a view over a large `ArrayBuffer` retains the underlying block. The snapshot shows a small view with a large retained backing store. The fix is to copy the bytes I intend to keep, with `Buffer.from(slice)` or an explicit copy, and let the temporary slab die.

**Follow-up:**

When is the copy the wrong fix?

Answer: Copying is the wrong fix when you meant to keep the whole buffer and the slice was only a temporary view of it. Copying every chunk of a huge upload doubles memory traffic. Copy at the boundary between a short-lived I/O buffer and the few bytes you actually store.

### NODE-350 — Investigating a latency regression

**Difficulty:** Staff

**Category:** Production metrics

**Question:**

Walk through how you investigate a production latency regression on Node 20 or 22.

**Answer:**

I start with the histogram: which route, and when it started. I compare p99 with event loop delay and utilization. If the loop is busy, I take a CPU profile and look for a new wide frame. If the loop is idle, I look at downstream spans and pool checkout time. If delay lines up with GC, I read `heapUsed`, RSS, and `arrayBuffers`, and I take one snapshot if memory is climbing. I change one thing, then I re-read the same graphs. I do not tune flags, add workers, and grow the pool in the same deploy.

**Follow-up:**

Staging cannot reproduce the p99. What do you refuse to conclude?

Answer: Staging is missing something production has: cardinality, a noisy neighbor, a bigger cache, or a pathological payload. Do not call the code innocent, and do not rewrite the service because the lab was clean. Sample the bad production window and name the ingredient the lab did not match.

### NODE-305 — Why a public inspector is RCE

**Difficulty:** Senior

**Category:** Inspector

**Question:**

Why is a publicly reachable inspector a security incident, not just a performance footgun?

**Answer:**

The inspector can evaluate JavaScript inside the process. Anyone who can open that WebSocket can read secrets, change behavior, or dump memory. Binding `--inspect=0.0.0.0` on a reachable host is remote code execution with extra steps. Node binds localhost by default for that reason. I also watch for `NODE_OPTIONS=--inspect` leaking into a task definition. In production I do not leave the inspector on. If I need a snapshot, I trigger it from inside the process on a signal, on a network that is already private.

**Follow-up:**

How can an operator still get a profile without opening the inspector port?

Answer: Start with `--cpu-prof` or `--heap-prof` and let the process write a file, or call `v8.writeHeapSnapshot()` from an admin signal. Do not treat `SIGUSR1` as harmless, because it can start the inspector. The port itself should never be routed.

### NODE-365 — DNS rebinding and redirects

**Difficulty:** Senior

**Category:** SSRF

**Question:**

You resolve the hostname, reject private IPs, then call `fetch(url)`. How does the attacker still reach `127.0.0.1`?

**Answer:**

There are two gaps. DNS rebinding: your check resolves `evil.example` to a public address, then the HTTP client resolves it again and receives `127.0.0.1` because the TTL was one second. Redirects: `fetch` follows them by default, and `Location` can point at metadata or at `[::1]`. Resolve once, refuse private, loopback, link-local, and IPv4-mapped IPv6 addresses, and connect to the address you already approved. Set `redirect: 'manual'` and run the same checks on every `Location`. A custom undici lookup is how you pin that address so the client does not resolve a second time.

**Follow-up:**

Which addresses do you reject after `dns.lookup`?

Answer: Reject IPv4 loopback, `0.0.0.0/8`, RFC1918 private space, link-local `169.254.0.0/16`, and CGNAT `100.64.0.0/10`. Reject IPv6 `::1`, unspecified `::`, link-local `fe80::/10`, and unique-local `fc00::/7`, plus mapped forms such as `::ffff:127.0.0.1`. If the product only calls a fixed partner list, skip the range math and allowlist the exact hostname instead.

### NODE-386 — Typosquatting and dependency confusion

**Difficulty:** Senior

**Category:** Supply chain

**Question:**

What are typosquatting and dependency confusion for a Node app that also uses a private registry?

**Answer:**

Typosquatting publishes a public package one character off a real name and waits for a bad import. Dependency confusion is sharper. Your manifest depends on `internal-logger`, the build talks to both a private registry and the public npm registry, and npm selects the public package when its version is higher. The attacker publishes that name at a high version, CI runs their `postinstall`, and they are inside the build. Scope private packages as `@company/internal-logger`, and map that scope to the private registry only in `.npmrc`. Commit the lockfile so a surprise tarball fails the integrity check.

**Follow-up:**

What limits the damage if one maintainer account is phished?

Answer: Require publish 2FA, use a token that can publish only one package, and expire CI tokens with the job. A long-lived `NPM_TOKEN` in a world-readable environment is the prize. Provenance on your own publishes, plus a proxy that delays brand-new public packages, gives you time to hear about a hijack before CI installs it.

### NODE-449 — The race with the load balancer

**Difficulty:** Staff

**Category:** Zero-downtime deploys

**Question:**

The app handles SIGTERM and clients still see 502s during deploy. Where is the race, and how do you close it?

**Answer:**

The platform sends SIGTERM while proxies may still list the pod, so a new request hits a process that has stopped accepting, or hits nothing. Readiness updates are polled, not instant. Fail readiness first, wait a few seconds in a preStop hook or at the start of the handler, and only then stop accepting. During that wait the process still serves stragglers. Add the wait to the grace period so the pause plus the drain finish before SIGKILL. Prove it with a deploy under light synthetic load and a count of 502s. Also confirm the signal actually reaches Node.

**Follow-up:**

Why does `exec node server.js` matter in the container entrypoint?

Answer: `exec` replaces the shell, so Node becomes PID 1 and receives SIGTERM. A shell that starts Node as a child and does not forward the signal lets Node keep running until SIGKILL, mid-request. Use `exec`, or a small init that forwards signals and reaps zombies.

### NODE-450 — Container memory limits and the V8 heap

**Difficulty:** Staff

**Category:** Capacity

**Question:**

A Node 22 container has a 512 MiB limit and no heap flag. It dies with exit 137 and no stack trace. What happened, and how do you size the heap?

**Answer:**

Exit 137 means SIGKILL. On Kubernetes that is usually the memory limit: resident set crossed 512 MiB and the kernel killed the process before JavaScript could throw. V8’s heap is only part of that resident set. Code, stacks, native addons, and `Buffer` memory sit outside it. With no flag, V8 may grow the old space until the limit kills it. Setting `--max-old-space-size` equal to the container limit fails the same way, because off-heap memory still counts. I set the heap lower, leaving about a quarter of the limit for everything else, then confirm with a soak.

**Follow-up:**

`heapUsed` is well under the limit and the container still dies. Where did the rest go?

Answer: Compare resident memory with `heapUsed`, then look at `external` and `arrayBuffers`. Large buffers or a native library sit outside the old space and still count against the limit, so a heap snapshot will not show all of it. Lower the heap flag or raise the limit, and find what retains those buffers.

### NODE-460 — Transactional outbox

**Difficulty:** Senior

**Category:** messaging

**Question:**

What problem does the transactional outbox solve, and how do you implement it simply?

**Answer:**

Dual-write races happen when you commit a DB row then fail before publishing an event. The outbox writes the business change and an outbox row in the same database transaction; a poller or CDC process publishes outbox rows to the bus and marks them sent. Consumers see at-least-once delivery, so they must be idempotent. In Node the publisher is usually a small worker using the same Postgres client. This is the standard way to make “state change plus event” reliable without distributed 2PC.

**Follow-up:**

Can the outbox live in Redis instead of the DB?

Answer: Prefer the same transactional store as the business write; Redis loses that atomicity.
