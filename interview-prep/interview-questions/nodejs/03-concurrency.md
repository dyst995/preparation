# NODE03 — Concurrency, workers, and processes

Node.js 20 and 22. Questions NODE-101–NODE-150.

These questions cover running work in parallel: `worker_threads`, structured clone and transfer lists, `SharedArrayBuffer` and `Atomics`, worker pools, `child_process`, `cluster`, `MessageChannel`, graceful shutdown, and what `vm` does not isolate. Event-loop phases and microtask order are NODE02. This section assumes that model.

`async`/`await` is not parallel. It interleaves work on one JavaScript thread. Workers, child processes, and the libuv pool run work on other operating-system threads or in other processes. `UV_THREADPOOL_SIZE` sizes libuv's native pool, and that pool does not run your JavaScript. Workers never share JavaScript objects. The only memory they share is a `SharedArrayBuffer`.

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

### NODE-105 — Minimal worker_threads program

**Difficulty:** Intermediate

**Category:** worker_threads

**Question:**

Write the smallest ESM file that runs a computation in a worker and returns the result to the main thread.

**Answer:**

The same file is both the parent and the worker. `isMainThread` tells you which side is running. The parent starts a `Worker` pointed at this module and passes `workerData`, which Node clones once at startup. The worker reads that value and sends the result with `parentPort.postMessage`. Later inputs also go through `postMessage`, not through `workerData`. Listen for `'error'` as well as `'message'`, or a thrown exception in the worker can surface as an unhandled error in the parent.

**Code:**

```js
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';

if (isMainThread) {
  const worker = new Worker(new URL(import.meta.url), { workerData: 21 });
  worker.on('message', (n) => console.log(n));
  worker.on('error', console.error);
} else {
  parentPort.postMessage(workerData * 2);
}
```

**Follow-up:**

How do you await a one-shot result?

Answer: Wrap the worker in a promise that resolves on `'message'`. Reject on `'error'`, and on `'exit'` when the code is non-zero, then remove the listeners so the worker can be collected.

### NODE-106 — What postMessage does to its payload

**Difficulty:** Intermediate

**Category:** Structured clone

**Question:**

What happens to an object passed to `worker.postMessage()`, and what can it not carry?

**Answer:**

`postMessage` copies the value with the structured clone algorithm, then delivers that copy to the other side. The copy can hold primitives, plain objects, arrays, `Map`, `Set`, `Date`, `RegExp`, `BigInt`, typed arrays, `ArrayBuffer`, and `Error`, with some limits on error fields. It cannot hold functions, and passing one throws `DataCloneError`. A symbol used as a value is not cloned. A class instance arrives as a plain object, without its prototype or methods. The copy takes time and memory proportional to the size, so a huge payload can cost more than the work you hoped to move.

**Follow-up:**

Does mutating the object after `postMessage` affect the receiver?

Answer: No. The clone is taken when you send. After that, each side has its own object, and later writes stay on the side that made them.

### NODE-107 — Transferables and when to use them

**Difficulty:** Senior

**Category:** Transferables

**Question:**

What is a transferable object, and when does using one beat a normal `postMessage`?

**Answer:**

A transferable moves ownership of a resource instead of copying its bytes. `ArrayBuffer` and `MessagePort` are the common cases. Some handle types, such as a file handle, can be transferred too. You pass the objects in the transfer list: `postMessage(buffer, [buffer])`. That move is effectively constant time, whatever the buffer's size, which is why it beats a clone for image frames, audio, or other large binary payloads. The sender gives the memory up. After the send, the sender's buffer is detached and no longer usable.

**Follow-up:**

What do you put in the transfer list for a typed array?

Answer: The underlying `ArrayBuffer`, as in `postMessage(view, [view.buffer])`. Putting only the view in the list does not detach the buffer.

### NODE-108 — State of a transferred ArrayBuffer

**Difficulty:** Senior

**Category:** Transferables

**Question:**

After `postMessage(buf, [buf])`, what is the state of `buf` on the sender, and what happens if you transfer it again?

**Answer:**

The sender's buffer is detached. `byteLength` becomes 0, and any view over that buffer also reports length 0, so reads no longer see the old bytes. Only the receiver owns the memory. Transferring a buffer that is already detached throws `DataCloneError`. Design the protocol so each buffer has one clear owner at a time. Either the receiver keeps it, sends a replacement, or transfers it back when the work is done.

**Follow-up:**

How do pools reuse buffers without allocating a new one every task?

Answer: Transfer the buffer back to the parent when the worker finishes, and hand that same buffer out again, like a ring. Or share one `SharedArrayBuffer` and synchronize access explicitly.

### NODE-109 — What SharedArrayBuffer is

**Difficulty:** Senior

**Category:** SharedArrayBuffer

**Question:**

What is a `SharedArrayBuffer`, and how does it differ from transferring an `ArrayBuffer`?

**Answer:**

A `SharedArrayBuffer` is one fixed block of bytes that several threads map at the same time. Each thread wraps it in its own typed array, such as `new Int32Array(shared)`, and those views see the same memory. Posting the buffer shares it. Nothing is copied, and nothing is detached. An ordinary `ArrayBuffer` transfer moves the memory so the sender loses it. A shared buffer is the only mutable memory workers share. Because both sides can write at once, you synchronize with `Atomics`, or you accept data races.

**Follow-up:**

Can a `SharedArrayBuffer` hold JavaScript objects?

Answer: No. It holds bytes, which you read through a typed array or a `DataView`. Structured values need a layout you define yourself.

### NODE-110 — Why Atomics are needed

**Difficulty:** Senior

**Category:** SharedArrayBuffer

**Question:**

Two workers each run `counter[0]++` on a shared `Int32Array` 100,000 times. Why is the result wrong, and what fixes it?

**Answer:**

`counter[0]++` is three steps: read the cell, add one, and write it back. Two threads can read the same value and both write that value plus one, so one increment disappears. A plain load or store also does not give you ordering against other memory. `Atomics.add(counter, 0, 1)` does the add as one indivisible operation, with sequentially consistent ordering, so both workers' increments survive. The same family includes `load`, `store`, `exchange`, `compareExchange`, and the bitwise and arithmetic updates `and`, `or`, `xor`, and `sub`.

**Follow-up:**

Which typed arrays work with `Atomics`?

Answer: Integer arrays backed by a buffer, such as `Int32Array`, `Uint32Array`, and `BigInt64Array`. Float arrays and `Uint8ClampedArray` do not.

### NODE-111 — Atomics.wait and notify

**Difficulty:** Senior

**Category:** SharedArrayBuffer

**Question:**

How do `Atomics.wait`, `Atomics.notify`, and `Atomics.waitAsync` work, and where should each be used?

**Answer:**

`Atomics.wait` puts the calling thread to sleep while an `Int32Array` cell still equals the value you expected, until another thread notifies that index or the timeout elapses. `Atomics.notify` wakes one or more of those waiters. `Atomics.waitAsync` does not block. It returns a promise that settles when the wait ends, so the thread can keep running its event loop. Node allows blocking `wait` on the main thread, but that freezes every callback, so use it only inside a worker. Use `waitAsync` where the loop must stay responsive. Always re-check the condition in a loop, because a wake can be spurious.

**Follow-up:**

What does `wait` return?

Answer: `"ok"` when another thread notified you, `"not-equal"` when the cell did not match at the call, and `"timed-out"` when the timeout elapsed first.

### NODE-112 — A mutex built on Atomics

**Difficulty:** Staff

**Category:** SharedArrayBuffer

**Question:**

Sketch a mutex using one shared `Int32Array` cell, and name its failure modes.

**Answer:**

Use one cell: 0 means unlocked, 1 means locked. To lock, loop on `Atomics.compareExchange`, swapping 0 for 1. If it returns anything other than 0, someone else holds the lock, so `Atomics.wait` until the cell is 1 and then try again. To unlock, `Atomics.store` writes 0 and `Atomics.notify` wakes one waiter. This fails in ordinary ways. A worker that dies while holding the lock leaves it stuck. There is no fairness. Two locks taken in opposite orders deadlock. Blocking `wait` on the main thread freezes the process. Use a timeout, and keep the critical section tiny.

**Follow-up:**

When would you avoid a mutex entirely?

Answer: When one owner worker can serialize the updates through messages. Message passing avoids lock bugs, and you add shared memory only when a profile shows the copies are the cost that matters.

### NODE-113 — Pitfalls of shared memory

**Difficulty:** Senior

**Category:** SharedArrayBuffer

**Question:**

What are the main risks of using `SharedArrayBuffer` in a Node service, compared with message passing?

**Answer:**

Shared memory is fast because nothing is copied, which is why the risks are worth naming. Without `Atomics`, concurrent reads and writes race. Only one integer cell is atomic, so two fields can tear. You own the binary layout. Locks deadlock if threads take them in opposite orders, and a worker that dies mid-update leaves inconsistent bytes, with no rollback. The buffer cannot grow. Those bugs are hard to reproduce. Zero-copy latency matters for large or very frequent data. For occasional messages, a clone is simpler.

**Follow-up:**

How do you update several fields so a reader never sees a mix of old and new values?

Answer: Guard the fields with one lock. Or use a sequence counter that makes readers retry when a write is in progress. Or write a new version into another slot and publish the index with one atomic store.

### NODE-114 — No shared JavaScript objects

**Difficulty:** Intermediate

**Category:** Isolation

**Question:**

Can two workers share a JavaScript object, such as a `Map` of cache entries?

**Answer:**

No. Each worker has its own V8 heap. Sending a `Map` clones it, and later `set` or `delete` calls stay on the side that made them. If both workers must see the same cache, pick an owner. Either one worker holds the `Map` and the others send messages, or you put the entries in Redis or another store outside the process. A `SharedArrayBuffer` can share bytes, not objects, and only with a layout you invent. Module-level variables are per worker too, so an in-memory cache is duplicated across workers and across cluster processes.

**Follow-up:**

Why can't the engine simply share one heap between workers?

Answer: A V8 isolate assumes one thread mutates objects, garbage collection state, and hidden classes. Sharing that heap would need a lock on essentially every access.

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

### NODE-117 — Use a library or write a pool

**Difficulty:** Intermediate

**Category:** Pools

**Question:**

Which pool libraries are the usual choices, and why prefer one over a pool you write yourself?

**Answer:**

`piscina` is the common choice. It queues tasks, supports `AbortSignal` cancellation, idle timeouts, resource limits, and transfer lists. `workerpool` and `threads.js` are the usual alternatives. A library already handles the parts hand-rolled pools get wrong: respawning after a crash, task timeouts, and shutdown order. Those are where workers leak or the process hangs on exit. A pool you write is reasonable for one task type with simple needs. The moment you need cancellation, crashes, and a bounded queue together, the library is the smaller risk.

**Follow-up:**

What do you still own when a library runs the pool?

Answer: How many workers, how long the queue may grow, whether payloads are cloned or transferred, how errors map to your API, and how shutdown hooks into the process lifecycle.

### NODE-118 — Sizing a pool

**Difficulty:** Senior

**Category:** Pools

**Question:**

How many workers should a CPU-bound pool have in a container limited to 2 CPUs?

**Answer:**

Start from the CPU the process may use, often that quota, or one less so the main thread can run the loop. `os.availableParallelism()` is the right call. `os.cpus().length` reports host cores, which in a container overshoots your limit. `availableParallelism()` may still miss the cgroup quota on some libuv versions, so confirm it. Workers past the quota add switches and memory without throughput. If the tasks are mostly I/O, measure instead of using the CPU-bound rule.

**Follow-up:**

How do you validate the size?

Answer: Load-test throughput and tail latency as the pool size changes. Watch container CPU throttling and the queue depth, not just whether the process looks busy.

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

### NODE-122 — Misconceptions about UV_THREADPOOL_SIZE

**Difficulty:** Intermediate

**Category:** Threadpool vs workers

**Question:**

Does raising `UV_THREADPOOL_SIZE` speed up a hot path that is JSON parsing or ordinary business logic?

**Answer:**

No. That code is JavaScript on the main thread, and it never enters the libuv pool. The setting only adds threads for native tasks libuv chooses to offload, such as filesystem calls and `pbkdf2`. A CPU profile full of JavaScript frames is a main-thread or worker problem. Time spent waiting on `fs`, crypto, or `dns.lookup` while the loop itself is idle is a pool problem. For CPU-bound JavaScript, move the work to workers or do less of it. Applying this knob to a JavaScript hot path is a common miss, in interviews and in production.

**Follow-up:**

How do you tell which bottleneck you have?

Answer: JavaScript frames in a CPU profile point at the main thread or at workers. Waiting on `fs`, crypto, or DNS while the event loop is idle points at the pool.

### NODE-123 — What MessageChannel provides

**Difficulty:** Intermediate

**Category:** MessageChannel

**Question:**

What is a `MessageChannel`, and what does it give you that `worker.postMessage` on the worker object does not?

**Answer:**

A `MessageChannel` creates two linked `MessagePort` objects. A message posted on one is delivered to the other, using structured clone. Ports are transferable, so you can hand one end to a worker and keep the other, or hand an end to each of two workers. That gives you a private channel per request or per feature, and it lets two workers talk without the parent relaying every message. `worker.postMessage` always goes through that one worker's `parentPort`. A dedicated port keeps that traffic off the main thread's single parent channel.

**Follow-up:**

Are messages on a port ordered?

Answer: Yes, on one port, in the order they were sent. Two different ports have no order relative to each other.

### NODE-124 — Connecting two workers directly

**Difficulty:** Senior

**Category:** MessageChannel

**Question:**

How do you let worker A and worker B exchange messages without the main thread relaying each one?

**Answer:**

Create a `MessageChannel` in the parent and transfer one port to each worker. Each worker then listens on the port it received. After that handoff, data moves between the workers and the parent is no longer on the path. The ports must be in the transfer list. Trying to clone a port throws, because a port is transferred, not copied. Each side treats the received port like any other emitter: `'message'` for data, and `'close'` when the other end goes away.

**Code:**

```js
const { port1, port2 } = new MessageChannel();
workerA.postMessage({ peer: port1 }, [port1]);
workerB.postMessage({ peer: port2 }, [port2]);
```

**Follow-up:**

What happens to the surviving worker if the other one dies?

Answer: The remaining port does not crash the process by itself, but further messages have nowhere to go. Listen for `'close'` on the port and handle the lost peer explicitly.

### NODE-125 — Ports and workers keeping the process alive

**Difficulty:** Intermediate

**Category:** MessageChannel

**Question:**

A script that uses a `MessagePort` never exits. Why, and how do you fix it?

**Answer:**

A port is an active handle once it has a `'message'` listener, or after you call `start` or `ref`. Active handles keep the event loop running, so the process stays up even when your script looks finished. Call `port.close()` when the conversation is over, or `port.unref()` when this port should not be a reason to stay alive. A running `Worker` is the same kind of handle. It keeps the parent alive until the worker exits, unless you call `worker.unref()`.

**Follow-up:**

What does `unref` change about correctness?

Answer: The process may exit while messages are still queued. Use `unref` only for background work that is allowed to be dropped. If the message must be delivered, leave the handle ref'd until you are done.

### NODE-126 — How worker errors surface

**Difficulty:** Senior

**Category:** Worker errors

**Question:**

What happens in the parent when a worker throws an exception that nobody catches?

**Answer:**

The worker stops. The parent gets an `'error'` event on that `Worker`, carrying the error, then `'exit'` with a non-zero code. If nobody listened for `'error'`, EventEmitter throws it in the parent, which can take the process down. `'messageerror'` fires when a received message cannot be deserialized. Register `'error'`, `'messageerror'`, and `'exit'` on every worker. An unhandled rejection in the worker follows Node's normal rules and, by default, becomes an uncaught exception on this same path.

**Follow-up:**

Does a rejected promise inside the worker emit `'error'` on the parent?

Answer: An unhandled rejection in the worker follows normal Node rules. By default it becomes an uncaught exception and then takes the same `'error'` and `'exit'` path. Handle it in the worker as well.

### NODE-127 — Can a worker crash the whole process

**Difficulty:** Senior

**Category:** Worker errors

**Question:**

Can a worker bring down the main process, and in which cases?

**Answer:**

A JavaScript exception or a V8 heap limit kills only that worker. The parent hears it through `'error'` and `'exit'`. `resourceLimits` makes a runaway worker fail with `ERR_WORKER_OUT_OF_MEMORY` instead of consuming the machine. The parent can still die if it has no `'error'` listener, because that event then throws, or if the OS kills the process for memory. A segfault in an addon is the process's memory, so every thread dies. To keep a native crash contained, use a child process.

**Follow-up:**

Where should `process.on('uncaughtException')` live for worker failures?

Answer: Inside the worker, if you want to log and exit there. The parent's `uncaughtException` handler does not see exceptions that originated in a worker thread.

### NODE-128 — Limiting a worker's resources

**Difficulty:** Senior

**Category:** Worker errors

**Question:**

How do you cap memory for a worker, and what happens when the cap is hit?

**Answer:**

Pass `resourceLimits` to the `Worker` constructor. The fields are `maxOldGenerationSizeMb`, `maxYoungGenerationSizeMb`, `codeRangeSizeMb`, and `stackSizeMb`. When the old-generation limit is exceeded, V8 terminates that worker. The parent receives an `'error'` whose code is `ERR_WORKER_OUT_OF_MEMORY`, then `'exit'`. These numbers bound the V8 heap. They do not bound memory outside the heap, such as `Buffer` and `ArrayBuffer` allocations, so resident memory can still grow past them. Treat the limits as a heap fuse, and still watch process memory.

**Follow-up:**

What should the pool do after that exit?

Answer: Reject the task that was in flight, log it with the task id, and spawn a replacement worker so the pool's capacity comes back.

### NODE-129 — Stopping a worker

**Difficulty:** Intermediate

**Category:** worker_threads

**Question:**

Compare `worker.terminate()` with asking the worker to shut down by message.

**Answer:**

`worker.terminate()` returns a promise and stops the worker's JavaScript as soon as it can. The worker does not get to flush buffers or close its own resources. A cooperative shutdown sends a message. The worker finishes the current task, closes handles, and exits on its own. Prefer that path first, then call `terminate()` if it has not exited by a timeout, and wait for `'exit'` either way. `terminate()` can drop messages that have not been delivered, and in-flight tasks will never resolve, so the parent has to reject those promises itself.

**Follow-up:**

What does `terminate()` do to messages that are already in flight?

Answer: They may be dropped, and the task that was running never resolves. The parent has to reject its outstanding promises itself.

### NODE-130 — When workers do not help

**Difficulty:** Intermediate

**Category:** worker_threads

**Question:**

Should you move an HTTP client or database queries into worker threads to raise throughput?

**Answer:**

Usually no. The main thread already waits on many sockets at once, and the operating system does the waiting. A worker adds a private heap, startup, and a copy of every message, which is overhead on work that was not using the CPU. Workers pay off when the JavaScript itself is the cost: hashing, compression written in JavaScript, images, PDFs, or parsing a very large document. Two exceptions are worth it even for I/O-shaped calls. You may want to isolate code that crashes, or you may be stuck with a native library whose API blocks.

**Follow-up:**

How do you prove a worker is worth adding?

Answer: Compare end-to-end latency and throughput with and without it, and include the cost of cloning or transferring the payload. Timing only the compute step leaves that cost out.

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

### NODE-132 — spawn, exec, execFile, and fork

**Difficulty:** Intermediate

**Category:** child_process

**Question:**

Compare `spawn`, `exec`, `execFile`, and `fork`.

**Answer:**

`spawn` starts a program with an argument array, skips the shell by default, and streams stdio with no output cap. That fits long-running commands. `exec` runs a shell string, buffers output, and stops at `maxBuffer`. `execFile` buffers the same way but skips the shell, which removes shell injection. `fork` starts another Node process and opens an IPC channel for `send` and `'message'`. Default to `execFile` or `spawn` with an argument array. Use `exec` only when you truly need a shell.

**Follow-up:**

Which do you use for a long-running `ffmpeg` job that prints progress?

Answer: `spawn`. Read stdout and stderr as streams, use the `'close'` event to know it finished, and cancel with an `AbortSignal` or `kill`.

### NODE-133 — Shell injection with exec

**Difficulty:** Intermediate

**Category:** child_process

**Question:**

Why is ``exec(`convert ${userFile} out.png`)`` dangerous, and what is the fix?

**Answer:**

`exec` joins your string and asks a shell to parse it. A file name such as `a.png; rm -rf ~`, or one that contains `$(...)`, is more commands, not one argument. `execFile('convert', [userFile, 'out.png'])`, or `spawn` with an argument array and without `shell: true`, passes those strings as arguments. The shell never sees them. Still validate the path, and allow only the binaries you intend to run. An argument that starts with `-` can still be read as a flag by the program itself. Where the program supports it, put `--` before user input.

**Follow-up:**

Does `execFile` remove injection risk completely?

Answer: It removes shell injection. The target program can still treat a user string as an option. Use `--` where the program supports it, and validate the input.

### NODE-134 — exec maxBuffer overflow

**Difficulty:** Intermediate

**Category:** child_process

**Question:**

What happens when a command started with `exec` prints more than `maxBuffer`?

**Answer:**

Node kills the child and calls your callback with an error whose code is `ERR_CHILD_PROCESS_STDIO_MAXBUFFER`. Output captured before the limit can be truncated, so you should not treat it as complete. The default limit is 1 MiB. If you know the output is small and bounded, you can raise `maxBuffer`. If you do not know the size, do not buffer it. `spawn` and consume the streams as they arrive, or write them to a file, so memory stays proportional to what you process rather than to the whole output.

**Follow-up:**

Which approach is safer when you do not know how large the output will be?

Answer: `spawn`, and consume the streams as they arrive, or write them to a file. Memory then stays bounded by what you process, not by the whole output.

### NODE-135 — IPC with fork

**Difficulty:** Senior

**Category:** child_process

**Question:**

How does messaging work between a parent and a `fork`ed child, and what serialization does it use?

**Answer:**

The parent calls `child.send` and listens for `'message'`. The child uses `process.send` and `process.on('message')`. The default `serialization` is `'json'`, so the message is JSON. `Map`, `BigInt`, and `undefined` do not round-trip. `'advanced'` uses structured clone instead, which keeps those values. You can also pass handles, such as a socket or a server, as the second argument to `send`, and Node moves that handle to the child. Call `child.disconnect()`, or let the child exit, so the IPC channel does not keep both processes alive after the work is done.

**Follow-up:**

How do you know the channel is closed before you send?

Answer: Listen for `'disconnect'`, and check `child.connected` before `send`. Sending on a closed channel throws `ERR_IPC_CHANNEL_CLOSED`.

### NODE-136 — Handling child exit correctly

**Difficulty:** Senior

**Category:** child_process

**Question:**

What is the difference between the `'error'`, `'exit'`, and `'close'` events on a child process?

**Answer:**

`'error'` means spawn failed, such as `ENOENT`, or a kill or an IPC send failed. It does not mean the child exited. `'exit'` means the process ended, with a `code` or a `signal`, while stdout and stderr may still be flushing. `'close'` fires after the process and those streams have closed, so collected output is complete. Check both `code` and `signal`. Some failures emit both `'error'` and `'exit'`, so make completion idempotent.

**Follow-up:**

Can `'error'` and `'exit'` both fire for one child?

Answer: Yes, in some failure paths. Handle completion once, so a second event does not settle the same promise twice or run cleanup twice.

### NODE-137 — Killing a child and its tree

**Difficulty:** Senior

**Category:** child_process

**Question:**

`child.kill()` does not stop grandchildren that the command started. How do you terminate the whole tree?

**Answer:**

`kill` signals only the direct child. Grandchildren keep running. On POSIX, start the child with `detached: true` so it becomes the leader of a new process group, then `process.kill(-child.pid, 'SIGTERM')` signals that group, because a negative pid means the group. A helper such as `tree-kill` walks the tree for you. The `signal` option, an `AbortSignal`, cancels the direct child only. `shell: true` adds a shell that can outlive the program you meant to stop, which is another reason to skip the shell. If the group is still alive after a timeout, escalate to `SIGKILL`.

**Follow-up:**

What changes on Windows?

Answer: Process groups and POSIX signals do not work the same way. `taskkill /T /F /PID` is the usual way to kill a process and the children it started.

### NODE-138 — stdio options and a child that blocks

**Difficulty:** Senior

**Category:** child_process

**Question:**

A spawned child hangs forever after printing a lot of output, and the parent looks idle. What is a likely cause?

**Answer:**

The default `stdio` is `'pipe'`. The parent must read both stdout and stderr. If it does not, the operating-system pipe buffer fills, and the child's next write blocks. The child looks hung, and the parent looks idle, because both are waiting. Read or pipe both streams, or set the ones you do not need to `'ignore'`. `'inherit'` connects the child to the parent's terminal, which fits a CLI or a dev tool and gives you no programmatic access to the bytes. Forgetting stderr is enough to cause the hang, even when you are reading stdout.

**Follow-up:**

When is `'inherit'` the right choice?

Answer: For a CLI or a dev tool, when the child should write straight to the parent's terminal. You then cannot read that output as a stream in the parent.

### NODE-139 — What cluster does

**Difficulty:** Intermediate

**Category:** cluster

**Question:**

What does the `cluster` module do, and which problem does it solve?

**Answer:**

The primary process forks several worker processes, and each worker runs a copy of the application. Workers that call `listen` on the same port share that port through the primary, so accepted connections are spread across cores. That is how one Node program uses more than one core for request handling, and a crashed worker does not have to take the others down. These workers are processes from `child_process.fork`, not `worker_threads`. Each has its own memory. An in-memory cache or session map in one worker is invisible to the others.

**Follow-up:**

Is cluster built on worker threads or on processes?

Answer: On processes. The primary uses `child_process.fork`. It does not use `worker_threads`.

### NODE-140 — Basic cluster usage

**Difficulty:** Intermediate

**Category:** cluster

**Question:**

Write a minimal cluster server that forks one worker per available core and replaces a worker that dies.

**Answer:**

In the primary, `isPrimary` is the current check. `isMaster` is the old name. Fork once per `availableParallelism()`, not per `os.cpus().length`, so a container is less likely to overshoot its CPU limit. Each worker runs the HTTP server and listens on the same port. The primary's `'exit'` handler forks a replacement so a dead worker does not permanently shrink capacity. Respawn without a limit turns a startup crash into a hot loop. Add backoff, or a maximum restart rate, and alert, because a worker that dies immediately will otherwise burn CPU forever.

**Code:**

```js
import cluster from 'node:cluster';
import http from 'node:http';
import { availableParallelism } from 'node:os';

if (cluster.isPrimary) {
  for (let i = 0; i < availableParallelism(); i++) cluster.fork();
  cluster.on('exit', (worker, code, signal) => {
    console.error('worker died', worker.process.pid, code, signal);
    cluster.fork();
  });
} else {
  http.createServer((_, res) => res.end('ok')).listen(3000);
}
```

**Follow-up:**

What stops that replacement from becoming a crash loop?

Answer: Back off, or cap how often you restart, and alert. A worker that fails during startup will otherwise be forked again immediately and burn CPU.

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

### NODE-143 — Limits of cluster

**Difficulty:** Senior

**Category:** cluster

**Question:**

What gets harder, or simply breaks, when you move an application onto cluster?

**Answer:**

Anything you kept in process memory now differs per worker. Sessions, caches, rate-limit counters, and WebSocket rooms need Redis, or another shared store, or sticky sessions so one client stays on one worker. Memory and startup cost are multiplied by the number of workers. At very high connection rates the primary's accept-and-hand-off path becomes a ceiling. A cron job in the app runs once per worker unless you guard it. Logs from several processes need a worker id or you cannot tell which process handled a request.

**Follow-up:**

How do you run a scheduled job only once?

Answer: Run it only in the primary, or in one worker you designate. An external scheduler, or a distributed lock, is the other way to keep the rest from doing the same work.

### NODE-144 — Zero-downtime restart with cluster

**Difficulty:** Staff

**Category:** cluster

**Question:**

Describe a rolling restart of cluster workers that does not drop in-flight requests.

**Answer:**

On a signal such as `SIGUSR2`, the primary replaces workers one at a time. It forks a new worker, waits for `'listening'`, then `disconnect`s the old one. The old worker stops accepting, finishes in-flight requests, and exits. If it misses a deadline, the primary kills it. One at a time keeps you about one worker below full capacity, and you can stop if a new worker never listens. Long-lived connections hold the old worker until they close, so set a drain deadline and tell clients to reconnect.

**Follow-up:**

What do long-lived connections do during the drain?

Answer: They keep the old worker alive until they close. Set a deadline and tell clients to reconnect, or the restart waits on those sockets.

### NODE-145 — Why graceful shutdown matters

**Difficulty:** Intermediate

**Category:** Graceful shutdown

**Question:**

What is a graceful shutdown, and why does it matter during a deploy?

**Answer:**

On `SIGTERM` or `SIGINT`, the process stops taking new work, lets requests and jobs that are already running finish, closes database and queue connections, flushes logs, and exits 0. Without that sequence, a deploy cuts off in-flight requests and can leave a job or a transaction half done. Kubernetes sends `SIGTERM`, waits for the pod's grace period, then sends `SIGKILL`, which cannot be handled. Your own drain timeout has to finish before that grace period ends, or the platform kills you mid-drain. Fail the readiness check first, so the load balancer stops sending new traffic while you close.

**Follow-up:**

Why fail the readiness check at the start of shutdown?

Answer: The load balancer uses readiness to decide where to send traffic. If you close first, new requests still arrive while sockets and pools are going away.

### NODE-146 — Graceful shutdown for an HTTP server

**Difficulty:** Senior

**Category:** Graceful shutdown

**Question:**

Sketch a shutdown handler for an `http.Server` that includes a hard timeout.

**Answer:**

A `closing` flag makes shutdown idempotent, so a second signal does not close the database twice. `server.close` stops new connections and waits for open ones. On Node 20 and 22 it also closes idle keep-alive connections. `closeIdleConnections` has existed since Node 18.2, and `closeAllConnections` forces the rest. The hard timeout is unref'd so it does not keep the process alive, and it exits 1 if drain runs long. After `close`, end the pool and exit 0, or 1 if `close` failed. Keep that budget inside the orchestrator's grace period.

**Code:**

```js
let closing = false;
function shutdown(signal) {
  if (closing) return;
  closing = true;
  const timer = setTimeout(() => process.exit(1), 10_000);
  timer.unref();
  server.close(async (err) => {
    try { await db.end(); } finally { process.exit(err ? 1 : 0); }
  });
  server.closeIdleConnections();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
```

**Follow-up:**

Why ignore a second signal instead of running shutdown again?

Answer: A second `SIGTERM` would close pools and call `server.close` again. The flag makes shutdown run once, so cleanup is not repeated.

### NODE-147 — Shutdown with workers and children

**Difficulty:** Senior

**Category:** Graceful shutdown

**Question:**

How do worker pools, child processes, and cluster workers fit into the same graceful shutdown?

**Answer:**

Stop intake, then drain, then release resources, then exit. For a pool, finish or reject queued tasks, wait for in-flight ones, and `terminate` anything still running after the timeout. For children, send `SIGTERM`, wait for `'close'`, then `SIGKILL`. In cluster, the primary `disconnect`s each worker and waits for `'exit'`. Children do not stop just because the parent got `SIGTERM`, so forward it. `SIGKILL` runs none of this and can orphan children. Use a process group, a supervisor, or an IPC `'disconnect'` handler so the child exits when the parent is gone.

**Follow-up:**

What runs if the parent is killed with `SIGKILL`?

Answer: Nothing in the parent. Children can be left running. A process group, a supervisor, or an IPC `'disconnect'` handler in the child is what makes them exit.

### NODE-148 — vm versus worker isolation

**Difficulty:** Staff

**Category:** Isolation

**Question:**

Compare `node:vm`, worker threads, and child processes as ways to isolate code.

**Answer:**

`vm` gives the script a separate global object, but it shares the thread, the heap, and the event loop, so it is not a security boundary. `timeout` interrupts synchronous code only. A worker has its own isolate, heap, and event loop. `resourceLimits` and `terminate` contain a JavaScript failure, but a native crash or a process-wide out-of-memory kill still hits the host. A child process is an OS boundary: separate memory, a separate crash, and privileges you can drop. Use `vm` for trusted code, workers for CPU and heap, and a process or container for anything you do not trust.

**Follow-up:**

Why does `vm` not isolate memory?

Answer: Objects from the context and from the host live on the same V8 heap. Allocation inside the script counts against the host process and can force its garbage collection or run it out of memory.

### NODE-149 — Running untrusted code with vm

**Difficulty:** Staff

**Category:** Isolation

**Question:**

Can `vm.runInNewContext` safely run user-supplied code if you pass a timeout?

**Answer:**

No. Node's docs say `node:vm` is not a security mechanism. Objects in the context can expose host constructors, and `this.constructor.constructor('return process')()` reaches the host `process`. `timeout` only interrupts a synchronous run. Async loops, promise chains, and allocating until memory runs out are not contained. Put untrusted code in another process or container: an OS sandbox such as seccomp or gVisor, dropped privileges, CPU and memory limits, and no network or filesystem unless you grant them. `isolated-vm` is stronger than `node:vm`, and it still has limits of its own.

**Follow-up:**

Is a worker thread enough isolation for untrusted code?

Answer: No. It can limit the heap and it can be terminated, but it shares the process, the filesystem, the network, and the host's credentials.

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
