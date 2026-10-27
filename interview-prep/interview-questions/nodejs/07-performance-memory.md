# NODE07 — Performance and memory

Node.js 20/22. Questions NODE-301–NODE-350.

These questions go past the runtime basics: CPU and heap profiles, `--inspect`, Clinic and 0x at a high level, how to read a flamegraph, event loop delay and utilization, the cost of `async_hooks` and `AsyncLocalStorage`, scavenge versus mark-sweep, heap snapshots and retained size, leak shapes, RSS versus `heapUsed`, `external` and `arrayBuffers`, V8 flags, backpressure, synchronous I/O, large `JSON.parse`, pools, N-API, hot paths, workers, and p99.

Profile before you tune. A wide flame frame, a rising heap floor, and a delay spike are different problems, and a flag does not fix the one you have not named.

### NODE-301 — What a CPU profile measures

**Difficulty:** Intermediate

**Category:** Profiling

**Question:**

How do you capture a CPU profile on Node 20 or 22, and what does it actually measure?

**Answer:**

A CPU profile is a series of stack samples taken while code is on the CPU. It is not a diary of time spent waiting on the network. On Node 20 or 22 I use `node --cpu-prof`, which writes a `.cpuprofile` when the process exits, or I attach Chrome DevTools with `--inspect` and record. Wide frames were running often. Idle time parked inside libuv barely appears. I open a profile when CPU or latency climbs, name the hot functions, and only then decide whether the code should change.

**Follow-up:**

Why can a slow route look almost empty in that profile?

Answer: The route is waiting, not computing. While the database or HTTP call is in flight, the thread sits inside libuv, so the sampler records little JavaScript. An empty profile plus high latency points at I/O; a wide profile points at CPU.

### NODE-302 — Choosing a sample interval

**Difficulty:** Senior

**Category:** Profiling

**Question:**

What does the CPU profiler sampling interval change, and how do you pick one?

**Answer:**

`--cpu-prof-interval` is how often V8 takes a stack sample, in microseconds. The default is about one millisecond. A tighter interval shows short functions that a coarse sample can miss, but the act of sampling steals CPU and can distort a hot path. A wider interval is cheaper and blurrier. I keep the default for a first look in staging. I tighten it only when a suspect function is shorter than the sample window, and I never compare a tight-interval profile with a default one as if they were the same run.

**Follow-up:**

A function you know is hot is missing from the profile. What are the usual reasons?

Answer: The function may have been inlined, so its time was charged to the caller, or it may be shorter than the sample interval. Native time can also hide inside a binding the V8 profiler barely names. Check the parent's self time, then take one tighter sample before you call the function free.

### NODE-303 — Allocation profile versus snapshot

**Difficulty:** Senior

**Category:** Profiling

**Question:**

When do you want a heap allocation profile instead of a heap snapshot?

**Answer:**

A snapshot answers what is alive right now and who retains it. An allocation profile answers who allocated during a window, including objects that already died. On Node 20 or 22, `node --heap-prof` writes a `.heapprofile` you can open in DevTools. I use that when allocation rate is high, young-generation GC is constant, and a snapshot looks innocent because garbage was collected before I dumped it. The snapshot is for retainers. The allocation profile is for churn. Most memory incidents need one of those stories, and serious ones need both.

**Follow-up:**

You see heavy allocation from a function that is not in the retainer tree. Is that still a problem?

Answer: Yes, if that churn sits on the latency path. Short-lived objects make scavenges more frequent even when retained size stays flat. Cut the allocations when GC time shows up, and leave them when latency is fine.

### NODE-304 — `--inspect` and `--inspect-brk`

**Difficulty:** Intermediate

**Category:** Inspector

**Question:**

How do `--inspect` and `--inspect-brk` differ, and what should you remember while a debugger is attached?

**Answer:**

`--inspect` opens the V8 inspector, by default on `127.0.0.1:9229`, and the process keeps running. `--inspect-brk` opens it and pauses before user code, which is how I catch a startup race or a crash that happens before I can click Record. Chrome DevTools speaks the same inspector protocol. A connected session is not free. Breakpoints, the heap walker, and even an open profiler change timing, so I treat numbers taken under a live debugger as a map, not as the production measurement.

**Follow-up:**

The bug disappears as soon as you attach DevTools. What do you tell the interviewer?

Answer: A connected debugger changes timing, so a race that depends on speed can vanish while you watch. Stop trusting that session and switch to a profile written to disk, event loop delay, and logs. Attach again only to inspect one specific suspect.

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

### NODE-306 — Clinic Doctor, Flame, and Bubbleprof

**Difficulty:** Intermediate

**Category:** Profiling

**Question:**

What do Clinic Doctor, Clinic Flame, and Clinic Bubbleprof each tell you, at a high level?

**Answer:**

Clinic is a lab toolkit, not a production agent. Doctor runs the app under load, collects loop and I/O signals, and writes a recommendation such as a blocked loop or slow I/O. Flame builds a CPU flamegraph so you can see which functions were on stack. Bubbleprof draws async delays as bubbles, which is how you see time spent waiting between callbacks rather than time spent burning CPU. I pick Doctor when I do not yet know the shape of the problem, Flame when CPU is the suspect, and Bubbleprof when latency is high and the CPU profile is quiet.

**Follow-up:**

Why would you not leave Clinic running in production?

Answer: Clinic is a bounded lab run: start, apply load, stop, and read a report. The wrappers have overhead, and production wants cheap continuous histograms instead. Reproduce the traffic in staging, then take one finding back.

### NODE-307 — When 0x beats the V8 profiler

**Difficulty:** Senior

**Category:** Flamegraphs

**Question:**

What is 0x for, and when is it a better picture than the built-in V8 profile?

**Answer:**

0x produces an interactive flamegraph of stack samples. You run something like `0x app.js`, apply load, and it writes an HTML graph. On Linux it can sit on `perf`, so frames from native addons, OpenSSL, or syscalls show up next to JavaScript. The V8 profiler is excellent at JavaScript and can attribute native time poorly, often as a blob inside a binding. I reach for 0x when the hot frame is a native module, TLS, compression, or anything where the JavaScript caller looks guilty only because it called C++.

**Follow-up:**

The flamegraph is dominated by a native frame you do not own. What is the next move?

Answer: Do not rewrite that library first. Ask why your code calls it so often, with such large inputs, or synchronously. The graph shows where time went; the design mistake is often the caller.

### NODE-308 — How to read a flamegraph

**Difficulty:** Intermediate

**Category:** Flamegraphs

**Question:**

How do you read a flamegraph in an interview without hand-waving?

**Answer:**

The horizontal axis is not time. Width is the share of samples that included that frame, so a wider bar was on stack more often. The vertical axis is stack depth. The bottom bar is usually the root, and callees sit on top. I read bottom-up only far enough to see the path, then I stare at the widest bars in our code. Color is often arbitrary, so I search by function name. I describe a bar as a share of samples, never as a timeline.

**Follow-up:**

Why is it a mistake to read left-to-right as "this happened first"?

Answer: Samples are aggregated and then clustered so matching stacks line up. Two calls minutes apart become one bar, and left-to-right order is layout, not chronology. Width means share of CPU samples.

### NODE-309 — Plateaus versus towers

**Difficulty:** Senior

**Category:** Flamegraphs

**Question:**

On a flamegraph, what is a plateau, and how is that different from a tower?

**Answer:**

A plateau is a wide frame whose children are much narrower. Most samples sat in that function itself, so the work is in its body: a loop, a parse, a regex, a copy. A tower is a stack of frames with similar width. The time is not really in the thin parents; it falls through to the wide leaf, or the parents are just wrappers. I optimize a plateau by changing that function. I optimize a tower by looking at the top wide frame and asking why it is called, not by micro-optimizing every wrapper on the way down.

**Follow-up:**

DevTools shows high total time and low self time for a handler. Where do you look?

Answer: Total time includes callees, so a handler with low self time is only coordinating. Sort by self time and open the heaviest child. Do not rewrite a parent just because its total is large.

### NODE-310 — Inverted flamegraphs

**Difficulty:** Senior

**Category:** Flamegraphs

**Question:**

When is an inverted flamegraph more useful than the normal one?

**Answer:**

A normal flamegraph groups by caller, so one helper called from twenty places is split into twenty thin bars and looks unimportant. An inverted graph puts the leaf at the root of the merge, so those samples add up. I flip it when I suspect a shared utility: a logger, a schema validator, a date parser, a permissions check. If the inverted view shows that helper as a wide bar, the cost is real even though no single caller looked hot. I then decide whether to make the helper cheaper or call it less.

**Follow-up:**

The inverted graph says `JSON.parse` is hot, but no single route dominates. What do you conclude?

Answer: The cost is spread across routes, so no single endpoint looks guilty. Cap body size, parse once, and check middleware that parses JSON nobody uses. A rare huge payload still shows up if you filter the normal graph to that route.

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

### NODE-312 — Reading delay without fooling yourself

**Difficulty:** Senior

**Category:** Event loop

**Question:**

How do you interpret event loop delay numbers without fooling yourself?

**Answer:**

The histogram's resolution is the floor. With a ten millisecond resolution I cannot honestly talk about two milliseconds of lag. Values are nanoseconds, so I divide before I compare them to a latency budget. A p99 delay of twenty milliseconds on an API whose budget is fifty is already serious, because that stall hits every request on that process, not one unlucky handler. I correlate delay spikes with GC entries, CPU profiles, and deploys. A delay that tracks a single downstream call is usually queueing behind a blocked loop, not the downstream call itself.

**Follow-up:**

Delay is high on one worker process and flat on the others. What does that suggest?

Answer: A shared dependency would have slowed every worker together. One hot process points at a local stall, a heap that grew into GC pauses, or a noisy neighbor on that CPU. Capture delay, heap, and a CPU profile before you restart.

### NODE-313 — Utilization versus delay

**Difficulty:** Senior

**Category:** Event loop

**Question:**

How does event loop utilization differ from event loop delay, and when do you want both?

**Answer:**

Delay says the loop failed to run a timer on time. Utilization, from `performance.eventLoopUtilization()`, says what fraction of wall time the loop spent active versus idle. High delay plus high utilization means the thread is busy: CPU, sync work, or GC. High delay with low utilization is rarer, so I check the histogram resolution and confirm with a profile. Low delay and low utilization means the process is waiting, so a slow API is downstream. I graph both, because either one alone can send me to the wrong fix.

**Follow-up:**

Utilization is near one, but a CPU profile is flat. Where else can the time be?

Answer: The loop is active inside native code, a long GC, or a binding the JavaScript sampler explains poorly. Check GC pauses, RSS, and a native-aware flamegraph, and look for sync crypto or filesystem calls. Utilization already said the thread was not idle.

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

### NODE-315 — Why a custom `async_hooks` hook is expensive

**Difficulty:** Senior

**Category:** Async context

**Question:**

Why can a hand-rolled `async_hooks` hook dominate CPU?

**Answer:**

`async_hooks.createHook` with an `init` callback runs JavaScript for every async resource the runtime creates. That includes promises, timers, nextTick, TCP wraps, and many internal handles. On a busy service those resources are created constantly, so the hook's bookkeeping becomes the hot path. `before`, `after`, and `destroy` add more calls, and retaining state until `destroy` can keep objects alive longer. I treat a custom hook as a debugging tool with a measured cost. If I need context to flow across async hops, I use `AsyncLocalStorage`, which has a dedicated path, and I still measure it.

**Follow-up:**

You only wanted request IDs. Why is a full hook the wrong tool?

Answer: A request ID does not require observing every async resource. `AsyncLocalStorage.run` at the request boundary stores the ID, and Node propagates that store. A hook that logs `init` for every promise will cost more than the handler.

### NODE-316 — What AsyncLocalStorage costs

**Difficulty:** Senior

**Category:** Async context

**Question:**

What does AsyncLocalStorage cost on Node 20 and 22, and how do you keep that cost boring?

**Answer:**

AsyncLocalStorage is the supported way to keep context across callbacks and promises. It is much cheaper than a user `async_hooks` logger, because it does not call your JavaScript on every resource. It is not free. Each `run` or `enterWith` attaches a store that has to follow the async tree, and a hot path that opens a fresh store for millions of tiny promises will show that bookkeeping. On Node 20 and 22 I put one store on the request, not on every helper, and I check CPU before and after. Context I do not need is a tax.

**Follow-up:**

`enterWith` fixed a context bug and created another. What is the lifetime issue?

Answer: `enterWith` applies the store to the current execution and what it schedules, so the store can outlive the request or stick to a pooled resource. `run` scopes the store to a callback, which is what I want at the boundary. I use `enterWith` only when that resource's lifetime matches the store.

### NODE-317 — Generational GC in one explanation

**Difficulty:** Intermediate

**Category:** Garbage collection

**Question:**

How do you explain V8's generational garbage collector without sliding into engine folklore?

**Answer:**

Most objects die young, so V8 splits the heap. New objects land in a small young generation. A frequent minor collection reclaims them cheaply. Objects that survive are promoted into old space, which is collected less often and more expensively. The practical version is: allocation rate drives minor GC, and retained data drives major GC. If I create a lot of short-lived objects, I pay in scavenges. If I keep a growing cache, I pay in mark-sweep pauses and in RSS. I do not need the whole V8 source to make that decision under load.

**Follow-up:**

Why is "we should just call GC more often" a weak plan?

Answer: Collecting early does not free objects that are still referenced, and `global.gc()` stops the process. It also hides leaks during a benchmark. Cut allocations or drop the retainer, and do not call GC on a timer in production.

### NODE-318 — What a scavenge copies

**Difficulty:** Senior

**Category:** Garbage collection

**Question:**

What is a scavenge, and why does its cost track survivors rather than garbage?

**Answer:**

The young generation is split into two semi-spaces, from-space and to-space. New objects are allocated in from-space. A scavenge copies the live ones into to-space, or promotes them to old space if they have survived enough rounds or do not fit. Dead objects are not visited; they are abandoned when the spaces flip. A nursery full of garbage is cheap. A nursery full of survivors is expensive, because every survivor is copied. A loop that allocates and drops objects can be healthier than one that keeps every result.

**Follow-up:**

Your GC log shows scavenges every few milliseconds, and pauses are short. What do you optimize?

Answer: Frequent short scavenges mean the nursery is filling constantly, so look at who is allocating. If the pauses stay tiny and latency is fine, leave them. Do not reach for a major-GC flag to treat a minor-GC symptom.

### NODE-319 — Major GC and the latency tail

**Difficulty:** Senior

**Category:** Garbage collection

**Question:**

What happens in a major GC, and why can it show up in p99?

**Answer:**

A major collection is mark-sweep-compact on the old space. V8 walks from roots, marks what is still reachable, sweeps what is not, and compacts to fight fragmentation. Incremental and concurrent marking spread much of that work across background threads and between turns of the event loop, so the final pause is smaller than in old V8. Compaction and the last part of the mark can still stop the world. A large old space can pause long enough to miss the latency budget for every in-flight request. That pause is event loop delay, and it lands in the tail.

**Follow-up:**

How do you tell a healthy major GC from one that means a leak?

Answer: After warmup, old-space size should rise and fall back to a similar floor. A leak is a floor that climbs across cycles until the heap limit. One mark-sweep after a cache fills is normal; a rising floor all day is a retainer.

### NODE-320 — Telling scavenge from mark-sweep

**Difficulty:** Senior

**Category:** Garbage collection

**Question:**

How do you see scavenge versus mark-sweep without guessing from RSS?

**Answer:**

`--trace-gc` prints a line per collection. Scavenge lines are the minor collections. Mark-compact lines are the major ones. The log includes the heap before and after and the pause time, which is enough to see whether you are churning the nursery or stalling on old space. For a running service I prefer `PerformanceObserver` on the `gc` entry type and the constants in `node:perf_hooks` that distinguish minor and major. I record duration and kind next to event loop delay. A delay spike that lines up with a major GC entry is a memory problem expressing itself as latency.

**Follow-up:**

Why might RSS barely move while these logs show constant GC?

Answer: The process can recycle the same young generation, so RSS stays flat while CPU is spent scavenging. RSS is a stock and GC count is a flow. Flat memory plus rising GC time is churn, not a clean bill of health.

### NODE-321 — Taking a heap snapshot safely

**Difficulty:** Intermediate

**Category:** Heap snapshots

**Question:**

How do you take a heap snapshot on Node 20 or 22 without making the incident worse?

**Answer:**

Locally I use DevTools while attached, or I call `v8.writeHeapSnapshot()` and open the file in the Memory panel. The walk is stop-the-world relative to the process: it is heavy, and on a large heap it will stall requests. I do not hook it to a request handler or a short interval. In production I trigger one snapshot when `heapUsed` crosses a threshold I have already decided, or from an admin signal, and I write it to a disk that has room. One good snapshot beats a process that is now down because I dumped five of them during the peak.

**Follow-up:**

What is the three-snapshot habit, and why does it beat a single dump?

Answer: Snapshot after warmup, exercise the action, snapshot again, and compare constructors whose retained size grew by the same amount each round. A single dump always looks large because the framework is large. In a local session, collect garbage before the second snapshot so dead objects are not counted as growth.

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

### NODE-323 — Who owns the memory

**Difficulty:** Senior

**Category:** Heap snapshots

**Question:**

How do retainers and the dominator idea tell you who actually owns the memory?

**Answer:**

A retainer is an object that points at this one and helps keep it alive. DevTools shows the chain from the object up to a GC root, such as a global, a closure scope, or a handle the event loop still has. The useful owner dominates the graph: remove it, and the rest would fall. I click up the chain until I hit application code I recognize, usually a module-level `Map`, an emitter, or a cache. System frames at the top are normal. The first of our frames on that path is where I start the fix.

**Follow-up:**

Two caches point at the same huge buffer. How do you avoid blaming the wrong one?

Answer: Neither cache fully owns that buffer while the other reference remains, so retained size will not charge the whole thing to both. Freeing it means dropping every strong reference. Removing one cache can disappoint you until the second owner lets go.

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

### NODE-325 — Closure leaks

**Difficulty:** Intermediate

**Category:** Leaks

**Question:**

How does a closure leak memory in a long-running Node process?

**Answer:**

A function closes over the variables where it was created, and those bindings stay alive as long as the function is reachable. The usual accident is a small callback on a long-lived object, such as a cache, a global emitter, or a timer, that captured a request body, a buffer, or a row. The callback looks tiny in the snapshot. The scope behind it retains the payload. I find the closure in the retainer chain and the variable it captured. The fix is to close over the two fields I need, not the whole request.

**Follow-up:**

Why can wrapping a handler in middleware make this worse?

Answer: Middleware often builds a closure per request and registers it on a logger, socket, or in-flight map that outlives the response. If you never remove it, every request leaves a closure behind, sometimes with the body. Tear it down on `finish` or `close`.

### NODE-326 — Unbounded caches

**Difficulty:** Intermediate

**Category:** Leaks

**Question:**

What does an unbounded in-memory cache look like, and what do you put in its place?

**Answer:**

It is usually a module-level `Map` from id to record, filled on every read, with no `delete`, no TTL, and no max length. A long tail of keys grows until old space is mostly cache. Memoizing a pure function has the same ending when the arguments vary without limit. I replace it with a cache that has a ceiling and an eviction policy, or I move it out of process. Key cardinality is part of the design. A few hundred config objects is fine. Every URL the edge has seen is a leak with a polite name.

**Follow-up:**

Would a `WeakMap` solve a cache of user records?

Answer: Only if the key is an object something else already owns and will drop. A `WeakMap` does not evict by size or time, and it cannot use a string id. If the app still holds every user object, the values stay too.

### NODE-327 — Listener leaks

**Difficulty:** Intermediate

**Category:** Leaks

**Question:**

How do event listeners leak, and what warning is an early signal?

**Answer:**

`EventEmitter` keeps a strong reference to every listener. If each request does `emitter.on('data', handler)` and never `off` or `removeListener`, the array grows, and each handler may close over that request. The early signal is `MaxListenersExceededWarning`. The default limit is ten, which is a smell detector, not a fix. Raising `setMaxListeners` silences the warning and keeps the leak. I add the listener once at startup, or I remove it in the matching teardown. For streams I prefer `pipeline` or `once` so the subscription ends when the operation ends.

**Follow-up:**

Listeners are removed, but memory still climbs. What similar pattern do you check?

Answer: Check the other lists: uncleared intervals, in-flight promise arrays, socket sets, and library subscriptions. `process.getActiveResourcesInfo()` is a cheap census of resource types when a process will not go idle. The snapshot then shows which list is the root.

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

### NODE-329 — Handles that stay GC roots

**Difficulty:** Senior

**Category:** Leaks

**Question:**

Which ordinary Node handles act as GC roots and keep "finished" work alive?

**Answer:**

Anything the event loop still knows about is a root. An uncleared `setInterval`, a listening server, a socket never destroyed, a stream paused and never resumed or destroyed, and a retry timer all keep their callbacks and closed-over state. The application thinks the request ended. V8 still sees a scheduled handle, so the graph stays. I destroy streams on error. I `unref` only when I truly do not want that handle to keep the process alive, and I follow retainers back to the handle.

**Follow-up:**

Why is `unref` not a memory-leak fix?

Answer: `unref` only lets the process exit when that handle is the last thing keeping it open. It does not drop the callback, and it does not make an active handle collectable. Clear the timer, remove the listener, or destroy the socket.

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

### NODE-331 — `external` and `arrayBuffers`

**Difficulty:** Intermediate

**Category:** Process memory

**Question:**

What do `external` and `arrayBuffers` mean in `process.memoryUsage()`?

**Answer:**

`external` is memory for C++ objects bound to JavaScript, managed alongside V8 but not inside the JavaScript heap. `arrayBuffers` is the part of that picture allocated for `ArrayBuffer`s and `SharedArrayBuffer`s, and it includes Node `Buffer` backing stores. Those bytes are also counted in `external`. A service that proxies large bodies can show a modest `heapUsed` and a huge `arrayBuffers`. I alert on both. If I only watch the heap, I will miss the buffers until the cgroup killer arrives. This split is the one I want on the production memory panel in Node 20 and 22.

**Follow-up:**

You call `Buffer.alloc` in a loop and free the references. Why can `arrayBuffers` lag behind?

Answer: The backing store is freed when GC actually collects the `Buffer`, and the OS may keep those pages in RSS afterward. If a view is still held, the number never falls. If it does not return to baseline after an idle period, something still owns the store.

### NODE-332 — Why RSS stays high after GC

**Difficulty:** Senior

**Category:** Process memory

**Question:**

Why does RSS stay high after a major GC that dropped `heapUsed` sharply?

**Answer:**

V8 and the system allocator can keep freed pages so the next allocation is cheap, and the operating system does not immediately reclaim lazy memory. Compaction moves objects, but that does not mean RSS shrinks by the same amount you saw in the GC log. Fragmentation in the native allocator has a similar shape. I care about the trend across hours and about whether the process is approaching its limit. A single GC that frees heap while RSS stays put is normal. RSS that ratchets up after every cycle, and never steps down during idle, is the behavior I investigate.

**Follow-up:**

Is it reasonable to restart processes on a memory schedule?

Answer: A scheduled restart is a safety rail while the retainer is unknown, not the design. It caps damage, and it also wipes caches and hides the bug. Snapshot just before the kill, fix the growth, then widen or remove the rail.

### NODE-333 — What `--max-old-space-size` limits

**Difficulty:** Senior

**Category:** V8 flags

**Question:**

What does `--max-old-space-size` actually limit, and what can still kill the process?

**Answer:**

It caps V8's old-space heap, in megabytes. When live JavaScript objects cannot fit, Node throws a heap out of memory error and exits. It does not cap RSS. Buffers, `ArrayBuffer`s, native addons, thread stacks, and code sit outside that budget, so the container can kill the process while it is still under the cap. The default scales with machine memory, so I do not assume a universal 1.5 GB. I set the flag to fit the cgroup, and I leave headroom for everything that is not old space.

**Follow-up:**

You raised the flag and the OOM went away for a week, then came back worse. What happened?

Answer: A larger heap gave the leak a longer runway, so pauses grew and the crash simply moved later. The flag changed the shape of the failure, not the retainer. Put the limit back near the container budget and snapshot while memory is still climbing.

### NODE-334 — `--max-semi-space-size`

**Difficulty:** Staff

**Category:** V8 flags

**Question:**

What is the tradeoff of changing `--max-semi-space-size`?

**Answer:**

Semi-space is one half of the young generation. A larger semi-space means fewer scavenges, because there is more room to allocate before a copy, and each scavenge may copy more survivors, so the pause can grow. A smaller one scavenges more often, with shorter copies, and medium-lived objects get promoted sooner, which can make old space dirtier. I touch this only after `--trace-gc` shows nursery behavior that matches a real latency problem. I change one flag, on one canary, and I compare scavenge time, promotion, and p99. A blog's semi-space value is not a setting.

**Follow-up:**

Promotion is high even though objects die within a second. Why would a larger nursery help, and when would it not?

Answer: If objects die just after a scavenge, a slightly larger nursery can collect them as garbage instead of promoting them. If they live for minutes, a bigger nursery only copies more on each scavenge. You need the lifetime before you pick a direction.

### NODE-335 — Flags you should not copy

**Difficulty:** Staff

**Category:** V8 flags

**Question:**

Which V8 flags do you refuse to cargo-cult, and how do you experiment when you do change one?

**Answer:**

I refuse flags copied from an old post: GC schedules I cannot explain, `--expose-gc` with a timer that calls `global.gc()`, and anything sold as "make Node faster" with no workload. `--optimize-for-size` trades speed for a smaller footprint and can hurt a hot service. Flags are version-sensitive. I read `node --v8-options` on the exact Node 20 or 22 build we run, change one flag, and record throughput, p99, RSS, and GC pauses on the same load. If I cannot say what it limits and how it fails, I do not ship it.

**Follow-up:**

A benchmark got faster with a flag and production p99 got worse. How is that possible?

Answer: The benchmark bought average throughput with memory, on a box with no memory cap. Production pays that back as GC pauses and p99, often beside other processes. Roll the flag back and retest with the real limit and a latency histogram.

### NODE-336 — Backpressure as a performance control

**Difficulty:** Intermediate

**Category:** Backpressure

**Question:**

How does backpressure show up as a performance problem, not just a correctness one?

**Answer:**

Backpressure is the consumer telling the producer to slow down. In streams, `write` returns `false` once the buffer passes `highWaterMark`, and the producer should wait for `drain`. `pipeline` does that for you. If I ignore it, the unread data accumulates in memory. That allocation becomes GC work, and the extra queueing becomes latency. So a missed `drain` is not only a correctness bug about a huge queue. It is a p99 bug and a memory bug that share a cause. On Node 20 and 22 I treat unbounded buffers on the hot path as a performance defect.

**Follow-up:**

`highWaterMark` is in object mode and you set it to 16. Why can that still exhaust memory?

Answer: Object mode counts objects, not bytes, so sixteen entries can be sixteen huge payloads. The stream looks inside its budget while RSS climbs. Keep a separate byte budget, or stay in buffer mode and think in bytes.

### NODE-337 — What unbounded buffering does

**Difficulty:** Senior

**Category:** Backpressure

**Question:**

What happens to GC and latency when a fast producer ignores a slow consumer?

**Answer:**

The data has to sit somewhere: the stream buffer, a promise chain, or an array the application keeps pushing to. Those are often large `Buffer`s, so `arrayBuffers` and RSS rise first. Then GC runs more often because the heap is full of wrappers around that data. The loop spends turns allocating, copying, and collecting instead of serving. Later requests wait behind that work, so p99 moves even for routes that never touched the stream. The fix is to wait for `drain`, shed load, or use a bounded queue that fails when it is full.

**Follow-up:**

Why is "we will just add more pods" a weak answer to this?

Answer: Each pod still has one loop and one memory limit. A single slow client, or a read that buffers without a bound, can pin a pod no matter how many siblings you add. Bound the buffer, then scale for real concurrency.

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

### NODE-339 — `readFile` versus `readFileSync`

**Difficulty:** Senior

**Category:** Blocking work

**Question:**

How do `fs.readFile` and `fs.readFileSync` differ in where they spend the wait?

**Answer:**

`readFileSync` occupies the event loop until the kernel returns. Nothing else on that loop runs. `fs.readFile` hands the work to libuv's threadpool, so the loop can serve other requests while a pool thread blocks in the kernel. That is better, and it is not infinite. The pool defaults to four threads and is shared with `dns.lookup`, some crypto, and zlib. A flood of large reads fills it, and then file and DNS work queue behind it. I still prefer the async form. I raise `UV_THREADPOOL_SIZE` only with a measurement, because those threads compete for CPU.

**Follow-up:**

DNS lookups got slow after you added image thumbnailing. What is the shared resource?

Answer: Thumbnailing, `dns.lookup`, and filesystem work share libuv's threadpool, which defaults to four threads. `dns.lookup` can block one of those threads on the system resolver. Cap the thumbnail work, and do not add threads until the cores are actually free.

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

### NODE-341 — JSON that is too big for the loop

**Difficulty:** Senior

**Category:** Blocking work

**Question:**

How do you handle JSON that is too big to parse on the main thread?

**Answer:**

First I ask whether the service should accept it. A cap and a 413 beat a clever parser. If the data is legitimately large, I avoid holding the raw string and the object tree together. NDJSON or a streaming parser can handle a record and drop it. If one document must be parsed whole, I can move `JSON.parse` to a worker and transfer an `ArrayBuffer` so the bytes are not copied twice. The worker still spends CPU, and cloning the result back has a cost. Streaming wins for incremental work. A worker wins when the loop must stay responsive.

**Follow-up:**

The worker returns the parsed object and the main thread stalls anyway. Why?

Answer: The parsed object still has to be cloned back, which is synchronous work and a second copy on the main heap. Have the worker return a small summary, or transfer only the bytes you still need. If the main thread needs the whole tree, the worker did not remove the memory cost.

### NODE-342 — Where pooling helps

**Difficulty:** Intermediate

**Category:** Pooling

**Question:**

Where does pooling actually improve performance in a Node service?

**Answer:**

A pool reuses an expensive resource instead of building it per request. Database connections, HTTP keep-alive sockets in undici, and TLS sessions are the usual wins, because the handshake dominates the work. Node 20 and 22 `fetch` sits on undici, which pools connections per origin. A pool also caps concurrency so a traffic spike becomes queueing in our process instead of a stampede against the database. The interview line is: reuse what is expensive to create, and bound how many exist. An unbounded pool is just a leak that speaks the connection protocol.

**Follow-up:**

When is a pool slower than opening a connection when you need it?

Answer: A pool is slower when the resource is cheap, when idle members fail their health check, or when it is larger than the database allows. Extra connections just move the queue into the database. Measure checkout wait separately from query time.

### NODE-343 — How to size a pool

**Difficulty:** Senior

**Category:** Pooling

**Question:**

How do you size a pool, and what failure mode belongs to a pool that is too big?

**Answer:**

I start from the scarce side. If Postgres allows two hundred connections and I run ten pods, each pool should sit well under twenty, with room for admin. Too small, and requests wait on checkout, which shows up as queue time before the query. Too big, and I exhaust the server, add memory per connection, and increase context switching. I set a checkout timeout so a stuck pool fails the request instead of parking it. I would rather shed load than accept work I cannot run. Pool size is a capacity contract, not a copy of the example.

**Follow-up:**

Checkout time is low and query time is high. Will a larger pool help?

Answer: Low checkout time means a connection was already free, so the wait is the query, the plan, or a lock. More connections give the database more concurrent work and often make that worse. Grow the pool only when checkout wait is the pain and the database still has headroom.

### NODE-344 — N-API in one answer

**Difficulty:** Senior

**Category:** Native addons

**Question:**

What is N-API, and when is a native addon a reasonable performance tool?

**Answer:**

Node-API, still called N-API in conversation, is the stable C ABI for native addons. Addons built against it survive Node majors without a rebuild for every V8 change, which matters when we run Node 20 and 22 side by side. I consider native code when a measured hot path is numeric, or when we must wrap an existing C or C++ library. I do not start there. JavaScript that does less work usually beats C++ that crosses the boundary on every call. Heavy work should use an async work queue so the native method does not hold the event loop.

**Follow-up:**

Why can moving a tiny function to N-API make the profile worse?

Answer: Marshaling into C++ and back can dwarf a few operations V8 would have inlined. A native loop over a large buffer can win; a native call per row usually loses. Profile both sides, and use an async work queue so the binding does not block the loop.

### NODE-345 — Optimizing a hot path

**Difficulty:** Senior

**Category:** Hot paths

**Question:**

What do you want a senior to say about optimizing a hot path?

**Answer:**

Measure first, and optimize the function the profile actually charges. I separate self time from time in callees. I prefer an algorithm change or fewer allocations over a clever micro-tweak. On a confirmed hot path I keep object shapes stable, avoid mixing types at one call site, and stop building temporary objects in the tightest loop if allocation shows up there. I leave cold code readable. I re-profile after the change. A real win moves CPU or p99 on the same workload. If I cannot show the number, I revert it.

**Follow-up:**

A micro-benchmark of the function got twice as fast and the service did not. Why do you trust the service?

Answer: The micro-benchmark is a warm tight loop, without the service's I/O or GC. In the request that function may be a small slice, so cutting it in half does not move what users feel. Judge the change by the service histogram and the CPU share.

### NODE-346 — Hidden classes and megamorphic sites

**Difficulty:** Staff

**Category:** Hot paths

**Question:**

What do hidden classes and megamorphic call sites mean at interview depth on modern V8?

**Answer:**

V8 speeds up property access when objects have a stable shape: the same fields, added in the same order. A constructor that always assigns fields in one order gets a fast path. Objects that grow unpredictably, or a line that sees many shapes, fall off that path. Megamorphic means the site has seen so many shapes that V8 stops specializing. I use this as a reason to initialize objects consistently in hot code, not as something I hunt without a profile. Modern V8 is better than old posts claim. `try/catch` is not an automatic deoptimization.

**Follow-up:**

Someone proposes rewriting a hot function to avoid `try/catch`. How do you respond?

Answer: Ask for a profile on the Node version you run, not a memory of old V8. If the heat is the work inside the `try`, removing it will not move the number. Do not trade away error handling for that superstition.

### NODE-347 — Workers versus the main thread

**Difficulty:** Senior

**Category:** Workers

**Question:**

When do you move work to `worker_threads` instead of optimizing the main thread?

**Answer:**

I optimize the main thread when the profile shows waste: duplicate parses, sync I/O, a quadratic loop, unbounded allocation. I use workers when the remaining work is genuinely CPU-bound, long enough to blow the latency budget, and the loop must stay responsive for other requests. Image transforms, a large indivisible parse, or a burst of pure computation fit. Workers do not make database calls faster. I check whether the libuv threadpool already covers the case, as it does for many crypto and zlib APIs. A worker per request is not the plan. A small fixed pool is.

**Follow-up:**

How do you decide the cutoff in milliseconds?

Answer: Start from the latency budget. A long CPU task does not belong inline if the loop must stay near a few milliseconds, but posting a tiny task can cost more than running it. Measure both ways, including clone time, and keep whichever meets the budget.

### NODE-348 — What a worker costs

**Difficulty:** Senior

**Category:** Workers

**Question:**

What does a worker actually cost on Node 20 or 22?

**Answer:**

Each worker is a separate V8 isolate with its own heap, its own GC, and a startup cost, often tens of megabytes before your code allocates. Messages are structured-cloned by default, so a large payload is copied in and the result is copied out. That copy is CPU and memory. A transferred `ArrayBuffer`, or a `SharedArrayBuffer` with a clear owner, avoids the copy for binary data. I size the pool for cores and memory, not for concurrent requests. Four fat workers on a one-core container only add isolates.

**Follow-up:**

Why can sharing memory be harder than cloning it?

Answer: A `SharedArrayBuffer` is real shared memory, so two threads can race and you need `Atomics` or a single owner. A transfer is simpler: the sender gives up the buffer and the receiver takes it. Share only when the copy shows up in the profile and the ownership story is easy to review.

### NODE-349 — Production metrics and p99

**Difficulty:** Senior

**Category:** Production metrics

**Question:**

Which production metrics do you want for a Node process, and why is p99 the one you defend?

**Answer:**

I want a latency histogram per route, not an average: p50, p95, and p99. I want event loop delay percentiles, utilization, `heapUsed`, RSS, and `arrayBuffers`, plus GC pause time split by minor and major. Rate and errors sit beside latency so a fast p99 is not just traffic failing. The average hides the tail users hit. At a few hundred requests per second, a bad p99 is a steady stream of pain, not a rarity. I defend p99 because that is the experience, and I split it across the loop and downstream so the tail has an owner.

**Follow-up:**

p50 is flat and p99 doubled after a deploy. How do you talk about that graph?

Answer: The typical request is fine and the slow ones got worse, which an average dashboard misses. Check whether the tail shares a route, a payload size, or a tenant, and line p99 up with event loop delay and major GC. If delay is flat, the new code is waiting somewhere else.

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
