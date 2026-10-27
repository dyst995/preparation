# Essential Node.js — Important

3-day essential set. 30 questions in preparation order. Full handbook remains under `nodejs/`.

### NODE-058 — What poll does, and when it waits

**Difficulty:** Senior

**Category:** I/O

**Question:**

Explain the poll phase in Node 20 and 22: what callbacks run there, when the thread blocks in the kernel, and what stops that wait. A colleague says poll runs every kind of asynchronous callback.

**Answer:**

Poll collects ready I/O and runs those callbacks: sockets, and completions from filesystem, DNS, and crypto work the thread pool finished. Timers, `setImmediate`, and close callbacks are other queues. If callbacks are already waiting, a `setImmediate` is queued, or a timer is already due, the wait is zero. Otherwise poll may block until the next timer deadline or until the kernel reports I/O. libuv limits one visit so check, close, and timers are not postponed forever. A long callback still holds the stack after the kernel is ready.

**Follow-up:**

Why does a process with only a ref'd `setImmediate` and no sockets exit after the callback instead of blocking forever in poll?

Answer: A queued immediate tells the loop not to sleep in an idle poll, so check runs the callback. If nothing else is keeping the process alive, the loop is finished. Poll's wait is a calculated timeout, not an unconditional block.

### NODE-070 — A promise chain that never empties is starvation too

**Difficulty:** Senior

**Category:** Starvation

**Question:**

A handler keeps scheduling with `Promise.resolve().then(step)` forever; timers and sockets stall. How does this differ from a synchronous loop, and why is `await Promise.resolve()` in a `while` the same failure?

**Answer:**

A synchronous loop never returns, so the checkpoint never starts and no callback of any kind can run. A promise pump does return, which looks cooperative, but the checkpoint never finishes because each microtask queues the next one. `while (work) { await Promise.resolve(); ... }` is that same pump: every turn is another microtask on this checkpoint. The repair is to schedule the next step with `setImmediate`, or with a timer, so the lap can reach check and later poll. One settled `await` is fine. A chain that never ends is not.

**Follow-up:**

Does a single `await Promise.resolve()` in an otherwise synchronous handler delay an already-due timer by a full lap?

Answer: It delays the timer only by one checkpoint. The handler returns, that microtask runs, and the lap can then continue to timers. A loop of those awaits is the starvation case.

### NODE-314 — Usual causes of loop lag

**Difficulty:** Intermediate

**Category:** Event loop

**Question:**

What are the usual causes of event loop lag in a Node service?

**Answer:**

The loop is one thread. Lag appears when a turn of that thread runs too long. Typical causes are large `JSON.parse` or `stringify`, synchronous filesystem or crypto, a hot loop over a big array, accidental regex backtracking, a major GC pause, or a native addon that blocks. A slow database does not by itself lag the loop if the driver is truly async. It becomes lag when responses pile up and a burst of callbacks then runs, or when the code waits synchronously. I rank causes with delay histograms plus a CPU profile, not by guessing from the framework.

**Follow-up:**

You removed a sync call and lag dropped, but p99 did not. Why is that plausible?

Answer: The loop can be healthy while the tail lives in a query, a lock, or a retry. If delay is a few milliseconds and request p99 is hundreds, the remaining time is outside this process. Keep the sync-call fix, and keep looking for the rest.

### NODE-176 — pipe error-handling pitfalls

**Difficulty:** Senior

**Category:** Error handling

**Question:**

What are the main error-handling pitfalls of `.pipe()`?

**Answer:**

First, errors do not propagate, so every stream needs its own `'error'` handler. Second, when the destination fails, the source is only unpiped, not destroyed, which leaks file descriptors and sockets. Third, in `a.pipe(b).pipe(c)` the return value is the last stream, so developers tend to attach a handler only there. A missing handler turns into an uncaught exception. `pipeline` avoids all of these problems.

**Code:**

```js
// before
a.pipe(b).pipe(c);

// after
try {
  await pipeline(a, b, c);
} catch (err) {
  if (!res.headersSent) res.statusCode = 500;
  res.end();
}
```

**Follow-up:**

What if headers were already sent?

Answer: You cannot change the status code any more. Destroy the response so the client sees a broken stream, rather than a truncated body that looks complete.

### NODE-358 — Path traversal with `path.join`

**Difficulty:** Junior

**Category:** Path traversal

**Question:**

You serve files with `path.join('/srv/uploads', req.query.name)` and `fs.readFile`. What is the bug?

**Answer:**

`path.join` and `path.resolve` normalize `.` and `..`, and they will climb out of `/srv/uploads`. A name of `../../etc/passwd` resolves outside the upload root, and `readFile` returns that file with the Node process's permissions. The same climb works with Windows backslashes. Encoding does not save a check on the raw string if you decode afterward. Express already decodes query parameters, so `%2e%2e%2f` arrives as `../`. Resolve the candidate, prove it is still inside the root, and only then open it. A prefix check on the raw user string is not that proof.

**Follow-up:**

Why is `target.startsWith(root)` still wrong after `path.resolve`?

Answer: If `root` is `/srv/uploads`, `/srv/uploads-secret/file` starts with those characters and is still outside the directory. Compare with `path.relative`, and reject `..`, a path that starts with `..` plus `path.sep`, or an absolute result. A file named `..hidden` stays allowed.

### NODE-054 — setImmediate is the check phase

**Difficulty:** Intermediate

**Category:** Timers

**Question:**

What does `setImmediate` schedule, which phase runs it, and what happens to an immediate queued from inside an immediate that is already running?

**Answer:**

`setImmediate(callback, ...args)` queues `callback` for the check phase, which runs after poll. There is no delay. Extra arguments are passed through to the callback. Immediates that were queued before check starts run in the order they were registered. When check begins, Node takes a snapshot of that queue. An immediate scheduled from inside one that is already running misses the snapshot and waits for a later lap. After each immediate returns, the checkpoint drains before the next immediate in the same phase starts.

**Code:**

```js
setImmediate(() => {
  console.log('first');
  process.nextTick(() => console.log('tick'));
  setImmediate(() => console.log('nested'));
});
setImmediate(() => console.log('second'));
// Hypothetical: first, tick, second; nested is a later check
```

**Follow-up:**

If the first immediate clears the second before it starts, can `second` still run?

Answer: No, `clearImmediate` removes `second` from the queue, so it does not run. The checkpoint from `first` still runs, and a nested immediate scheduled from `first` still waits for a later lap.

### NODE-035 — What keeps the process from exiting

**Difficulty:** Senior

**Category:** Process

**Question:**

A script schedules `setTimeout`, calls `.unref()`, prints, then exits without firing. Removing `.unref()` fires the timer. What keeps a Node 20/22 process alive? No phase diagram. You may cite `process.getActiveResourcesInfo()`.

**Answer:**

A Node process stays alive while the event loop has active referenced work, such as listening servers, open sockets, timers, and in-flight file or DNS requests. When there is none, Node emits `beforeExit` and then exits. Timers are referenced by default; calling `unref()` removes that vote, so the callback runs only if something else keeps the process alive. The same applies to servers and sockets. `process.getActiveResourcesInfo()` lists what is currently active. Use `unref` for background helpers like metrics, not for the main server.

**Trade-offs:**

`unref` for auxiliary probes/metrics—not the request-serving server.

**Follow-up:**

`server.listen(0)`, unref'd `setInterval`, then `server.close()`. When does the process exit?

Answer: After `close()` drops the listening handle, and no referenced connections remain, the loop has nothing left to wait for and the process exits. The unref'd interval may never fire.

### NODE-159 — destroy and error propagation

**Difficulty:** Intermediate

**Category:** Lifecycle

**Question:**

How do `destroy()` and error propagation work on a stream?

**Answer:**

`stream.destroy(err?)` shuts the stream down. It runs `_destroy`, releases resources, emits `'error'` if you passed an error, and then emits `'close'`. After that, writes fail and reads end. With `autoDestroy: true` (the default), a stream destroys itself after `'end'`, `'finish'`, or an error. Importantly, `destroy()` does not touch other streams you piped to; `pipeline` is what spreads the failure across the chain.

**Follow-up:**

What should `_destroy(err, cb)` do?

Answer: Close the underlying resource, such as a file descriptor, socket, or database cursor, then call `cb(err)` exactly once so the error keeps propagating.

### NODE-200 — Reading a body to JSON safely

**Difficulty:** Senior

**Category:** HTTP

**Question:**

How do you safely read a request body into JSON, and what is `node:stream/consumers`?

**Answer:**

`node:stream/consumers` provides `text`, `json`, `buffer`, `arrayBuffer`, and `blob`, which read a whole stream into one value: `const body = await json(req)`. Because they buffer everything, add a size limit first. Check `Content-Length`, and wrap the stream in a counting Transform that fails with 413 once the cap is exceeded. For very large payloads, use an incremental parser instead of building one huge value.

**Follow-up:**

How do you also defend against slow uploads?

Answer: Set the server-level `headersTimeout` and `requestTimeout`, plus an application timeout or an `AbortSignal` on the body read. Close connections that send bytes too slowly.

### NODE-131 — child_process versus workers

**Difficulty:** Intermediate

**Category:** child_process

**Question:**

When do you spawn a child process instead of a worker thread?

**Answer:**

Use a child process when you need a different program or language, a separate memory space, different environment variables or privileges, or the ability to kill and restart that work without touching the parent. You pay more startup time, more memory, and IPC that serializes over a pipe. A worker is lighter, and it can share an `ArrayBuffer` by transfer or a `SharedArrayBuffer` by mapping. A process is the stronger boundary. A segfault in a worker's native addon takes down the whole process. A crashed child ends only itself.

**Follow-up:**

Which one protects the parent from a crash in native code?

Answer: The child process. A segfault in a worker's addon is a fault in the shared process, so the parent dies with it. A crashed child ends only itself.

### NODE-207 — headersTimeout and requestTimeout

**Difficulty:** Senior

**Category:** Timeouts

**Question:**

Explain `headersTimeout`, `requestTimeout`, and their defaults.

**Answer:**

`headersTimeout` (default 60 s) limits how long the server waits for the complete request headers. `requestTimeout` (default 300 s since v18) limits how long it waits for the entire request, headers and body together. If either is exceeded, the server closes the connection (it may send a 408 first). `connectionsCheckingInterval` (default 30 s) controls how often these limits are checked.

**Follow-up:**

Which of these protects against Slowloris?

Answer: Both help, together with `maxConnections` and a front proxy. Lower `requestTimeout` if you have no large uploads. For slow-upload endpoints, raise it or use streaming with per-route logic.

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

### NODE-311 — `monitorEventLoopDelay`

**Difficulty:** Intermediate

**Category:** Event loop

**Question:**

What does `monitorEventLoopDelay` measure, in concrete terms?

**Answer:**

It schedules a timer and records how late that timer fired. The gap between the expected time and the actual time is event loop delay, reported as a histogram in nanoseconds. I enable it from `node:perf_hooks`, keep the resolution around ten or twenty milliseconds, and read the mean, the max, and a percentile such as the 99th. A quiet loop shows delay near the resolution. Delay of tens or hundreds of milliseconds means something occupied the thread: JavaScript, a synchronous call, or a long GC pause. It does not by itself name the culprit.

**Follow-up:**

Why is the mean a weak number to alert on?

Answer: The mean hides short stalls. One multi-second block in an hour of quiet delay barely moves the average, and it still wrecks the requests in flight. Alert on a percentile and the max, and reset the histogram after you scrape it.

### NODE-324 — Leak versus a large cache

**Difficulty:** Senior

**Category:** Leaks

**Question:**

How do you tell a memory leak from a cache that is simply large?

**Answer:**

A leak grows without a bound for the life of the process. A cache grows until it hits its working set or its cap, then the line flattens. I plot `heapUsed` and RSS for longer than the cache's TTL. If the line plateaus after warmup, I may still decide the plateau is too expensive, but I do not call it a leak. If the floor rises across every GC cycle, something is retaining new objects forever. The leak fix is to drop a reference. The fat-cache fix is a max size, a TTL, and a look at hit rate.

**Follow-up:**

The plateau is larger than the box. Is that still "not a leak"?

Answer: A bounded cache of an entire table still will not fit a small container, and it can OOM without being unbounded. The diagnosis is that a ceiling exists; the severity is that the ceiling is too high. Lower the cap or move the data.

### NODE-340 — `JSON.parse` and `JSON.stringify`

**Difficulty:** Intermediate

**Category:** Blocking work

**Question:**

Why can a large `JSON.parse` or `JSON.stringify` wreck a Node process that otherwise looks async?

**Answer:**

Both are synchronous JavaScript. `JSON.parse` walks the entire string and builds the object graph before it returns. `JSON.stringify` walks the graph and builds a string. Nothing else on the loop runs during that work. A multi-megabyte body is a multi-millisecond stall, sometimes much worse, and the new graph is a burst of allocation that shows up as scavenges or even promotion if you keep it. The event loop delay histogram moves for every request sharing the process. I treat unbounded JSON on the request path as a latency bug with a memory side effect.

**Follow-up:**

You already set a body-size limit of 1 MB. Why might parse still dominate the profile?

Answer: A megabyte is not cheap on every request, and parsing twice or building a wide object graph costs more than the wire size. A small hostile document can also burn CPU. The limit stopped the worst bodies; it did not make parse free.

### NODE-364 — SSRF and cloud metadata

**Difficulty:** Junior

**Category:** SSRF

**Question:**

What is server-side request forgery, and why can `fetch(req.body.url)` expose cloud credentials?

**Answer:**

SSRF is your server making a request to a URL the attacker chose. `fetch` on Node 20 and 22 is undici, and it will call addresses the attacker cannot reach directly: loopback, private ranges, and the link-local address `169.254.169.254`. On AWS that address serves instance metadata, including IAM role credentials. GCP and Azure have equivalent endpoints. A webhook feature that GETs the metadata URL and returns the body hands those credentials over. Block link-local and metadata addresses even if you believe the cloud requires a session token, because an app that forwards headers can still complete that handshake.

**Follow-up:**

Which URL schemes besides `http:` matter?

Answer: Allow only `http:` and `https:` after `new URL()`, and reject a username or password. `file:`, and on older clients `gopher:` and `dict:`, can reach local or cleartext services, so enforce the scheme even though Node's `fetch` is narrower than a vintage client.

### NODE-013 — ESM live bindings and the CommonJS exports object are different mechanisms

**Difficulty:** Senior

**Category:** Modules

**Question:**

On Node 22 with the native loader, show the difference between an ESM live binding (`export let`), a CommonJS shared exports object, a destructured copy, and a named `import` of a CommonJS export. Which pieces are ECMAScript vs Node interop?

**Answer:**

An ES module import is a live link to the exporter's binding. If the exporter reassigns an `export let`, importers see the change, though they cannot assign to it. That is language behavior. CommonJS `require` returns the cached `module.exports` object, so property changes are visible, but reassigning a local variable is not. Destructuring copies the value at that moment. A named ESM import of a CommonJS module is Node's interop: it copies the detected names once, so it is not live. The default import is the exports object itself.

**Follow-up:**

After ESM named import of CJS copied `n`, CJS does `module.exports.n = 5`; an ESM-to-ESM import does `n = 5`. What does each importer read?

Answer: The ESM-to-ESM import reads 5 because it is linked. The named import of the CommonJS export keeps the copied number. The default import, reading `pkg.n`, sees 5 because it reads the property each time.

### NODE-012 — require.cache is one module object, not a value snapshot

**Difficulty:** Senior

**Category:** Modules

**Question:**

Explain `require.cache` on Node 20/22: key, what is stored, what later `require` returns, what `delete require.cache[id]` resets, and what the ESM loader refuses. A test reloads a module and still sees the old singleton—why?

**Answer:**

The first `require` loads the file, runs its wrapper, and stores the module object in `require.cache`, keyed by the resolved absolute path. Later calls return the same `module.exports` without running the file again, so exported objects behave like singletons. The entry is cached before the wrapper finishes, which is why cycles see partial exports. Deleting the entry makes the next `require` run the file again, but anyone holding the old exports keeps the old object. ES modules use a separate module map with no supported way to delete from it.

**Follow-up:**

Two tests delete the service file's cache but still share a connection count. Why?

Answer: The database module that owns the pool was not deleted, so the new service file just requires the cached one. Delete the cache entry of the module that owns the state, plus anything holding a reference to it, or run each test file in its own process.

### NODE-115 — What a worker pool is for

**Difficulty:** Intermediate

**Category:** Pools

**Question:**

Why use a worker pool instead of creating a worker per task?

**Answer:**

Each worker pays for a new isolate and for loading its modules, in startup time and in memory. A pool keeps a fixed number of long-lived workers and a queue of tasks. Startup is paid once, CPU and memory stay bounded, and a full queue is natural backpressure when load exceeds the pool. Creating a worker per request removes that bound. Under a spike you can start workers until the process runs out of memory. The pool turns "how much parallelism" into a number you chose, instead of a number the traffic chooses.

**Follow-up:**

What happens to requests when every worker is busy?

Answer: They wait in the queue. Cap that queue and fail or shed load once it is full, instead of letting latency grow without a limit.

### NODE-141 — How cluster distributes connections

**Difficulty:** Senior

**Category:** cluster

**Question:**

How does cluster decide which worker receives a new connection?

**Answer:**

The default policy is `cluster.SCHED_RR` everywhere except Windows. The primary accepts the connection and hands the socket to workers in round-robin. `SCHED_NONE` lets the workers accept themselves, and the operating system can skew that heavily toward a few of them. Set the policy with `cluster.schedulingPolicy` or with `NODE_CLUSTER_SCHED_POLICY`. The unit of balancing is the connection, not the request. A handful of busy keep-alive clients pinned to one worker can still overload that worker while others sit idle.

**Follow-up:**

Why can CPU still look uneven when the policy is round-robin?

Answer: Round-robin assigns connections, not requests. A few busy keep-alive clients stuck on one worker can dominate that worker's CPU.

### NODE-221 — AbortSignal with fetch and http.request

**Difficulty:** Intermediate

**Category:** AbortSignal

**Question:**

How does `AbortSignal` work with `fetch` and with `http.request`?

**Answer:**

For `fetch`, pass `signal`: `fetch(url, { signal })`. Aborting rejects the promise with an `AbortError`, or with the signal's `reason`. `http.request(url, { signal })` also works, and it destroys the request with an `AbortError`. `AbortSignal.timeout(ms)` makes a signal that aborts with a `TimeoutError`, and `AbortSignal.any([a, b])` combines several signals.

**Follow-up:**

Does aborting cancel server-side work?

Answer: Only indirectly. The TCP connection or stream is closed, and a well-written server notices through `close` and stops. It is not an RPC-style cancel, so non-idempotent operations may still complete.

### NODE-231 — Trusting X-Forwarded headers

**Difficulty:** Senior

**Category:** Proxy

**Question:**

How should Node handle `X-Forwarded-*` headers behind a proxy?

**Answer:**

Behind a proxy, the address Node sees in `req.socket.remoteAddress` is the proxy's, not the client's. Proxies pass the client's details in `X-Forwarded-For`, `-Proto`, and `-Host`, or in the standardized `Forwarded` header. But these are ordinary headers that a client can set too. So trust them only when the direct peer is a known proxy.

**Follow-up:**

How do you pick the real client IP from `X-Forwarded-For`?

Answer: The list reads `client, proxy1, proxy2`, and the leftmost entry can be spoofed. Count the trusted hops from the right, or trust only configured proxy CIDR ranges, and take the first untrusted address.

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

### NODE-322 — Shallow size versus retained size

**Difficulty:** Intermediate

**Category:** Heap snapshots

**Question:**

In a heap snapshot, what is shallow size versus retained size?

**Answer:**

Shallow size is the memory of that object alone: its headers and fields, not the graph it points at. Retained size is how much would become unreachable if this object were dropped, including children nothing else keeps alive. A `Map` can have a tiny shallow size and a retained size of hundreds of megabytes because it owns the entries. I sort by retained size when I hunt a leak, and I use shallow size when the objects themselves are fat, such as long strings or big arrays. Chasing shallow size on a small root misses the graph underneath.

**Follow-up:**

Retained size is huge, but the object looks like an internal V8 string. What do you check next?

Answer: Follow the retainers back to a root. The big string is often the payload, and the bug is the array, cache, or closure that kept every body. The leaf is large because the data is large; the owner is whatever forgot to release it.

### NODE-373 — HttpOnly, Secure, and SameSite

**Difficulty:** Junior

**Category:** Cookies

**Question:**

Which flags do you set on a Node session cookie, and what does each one stop?

**Answer:**

Pass `httpOnly: true`, `secure: true`, `sameSite: 'lax'`, and `path: '/'` to `res.cookie`. `HttpOnly` keeps `document.cookie` from reading the session. It does not stop XSS from calling your API. `Secure` sends the cookie only over HTTPS, so a plain-HTTP observer does not collect it. `SameSite=Lax` cuts off a large class of cross-site POSTs. Leave `domain` unset so the cookie belongs to that host only. Set `maxAge` to the session length you actually want. Express does not apply these flags unless you pass them. Localhost has browser exceptions for `Secure` during development. Production responses still need the flag.

**Follow-up:**

TLS ends at the load balancer and Node sees HTTP. Does `Secure` still work?

Answer: The browser enforces `Secure` from the URL the user opened, so an `https://` site will store the cookie even when Node sees HTTP. Your app still has to emit the attribute, including when `req.secure` is false behind the proxy.

### NODE-429 — Metrics, logs, and traces

**Difficulty:** Junior

**Category:** Observability

**Question:**

Define metrics, logs, and traces, and say which you open first during an incident.

**Answer:**

Metrics are numbers over time: request count, errors, a latency histogram, event-loop lag, memory. They answer whether it is broken, since when, and how wide. Logs are events with fields, and they answer what happened on one case. Traces follow one request across spans, the handler, the query, and the outbound call, under one trace id. I open metrics first for the start, the error rate, and the route that moved. Then I open a trace from a slow or failed example, and I use logs for a domain code a span does not carry.

**Follow-up:**

Why can a high-cardinality label take down the metrics system?

Answer: Each unique combination of label values is its own series. A user id or a raw URL creates millions of series, the scrape blows up, and the store falls over during the incident. Keep labels bounded, such as route template and status class, and put the user id on the log or the span.

### NODE-442 — Liveness, readiness, and startup

**Difficulty:** Intermediate

**Category:** Health checks

**Question:**

Define liveness, readiness, and startup checks for a Node process, and say what each must not do.

**Answer:**

Liveness answers whether the platform should restart the process. It should succeed when the event loop can respond. Readiness answers whether the process should receive traffic. It fails while a required dependency is missing, and it fails as soon as shutdown starts. A startup probe holds liveness off until the first success, so a slow boot is not treated as a deadlock. Liveness must not call the database, or a blip restarts every pod and enlarges the outage. Readiness may check critical dependencies with a short timeout. Probes are frequent, so keep them cheap and free of side effects.

**Follow-up:**

Readiness fails on every pod because Redis is down. Is that better than failing liveness?

Answer: Yes, when Redis is required to serve. The load balancer has no healthy backends, and the processes stay up to recover, instead of restarting into the same outage. If Redis is optional, leave it out of readiness.

### NODE-448 — Graceful shutdown on SIGTERM

**Difficulty:** Senior

**Category:** Zero-downtime deploys

**Question:**

What does a Node 22 HTTP process do on SIGTERM so a deploy does not drop in-flight requests?

**Answer:**

You need more than one instance. On SIGTERM the process marks itself not ready, waits so the balancer stops sending work, then calls `server.close()`. In-flight requests finish. On Node 20 and 22, `closeIdleConnections()` drops keep-alive sockets that have no active request, which would otherwise hold close open until the platform kills the pod. Then close pools, flush telemetry, and exit 0. The grace period must exceed the longest request you promise. Calling `process.exit` at the top of the handler drops work the kernel already delivered. Workers stop taking jobs, finish or requeue the current one, then exit.

**Follow-up:**

Why do idle keep-alive connections stall `server.close()`?

Answer: `server.close()` waits until existing sockets end, and an idle keep-alive client never ends its socket. `closeIdleConnections()` drops those idle sockets and leaves an in-flight request alone until it finishes.

### NODE-466 — Backpressure across queues and HTTP

**Difficulty:** Senior

**Category:** backpressure

**Question:**

How do you design backpressure from an HTTP ingest path into an internal queue?

**Answer:**

If producers outrun consumers, unbounded queues explode memory. I size the queue, reject or slow accept when full, and propagate pressure: return 429/503 on HTTP, pause reads on streams, or stop pulling from upstream. Consumers should signal capacity—ack rates, free slots. In Node, pipe streams with respect for `drain`, and for job queues set max waiting jobs. Backpressure is a product decision too: drop, delay, or shed load with clear client semantics.

**Follow-up:**

What is wrong with “buffer everything in Redis”?

Answer: You moved the unbounded queue; failure just happens later and bigger.
