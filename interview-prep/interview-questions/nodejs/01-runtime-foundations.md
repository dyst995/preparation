# NODE01 — JavaScript runtime foundations

Node.js 20+. Questions NODE-001–NODE-050.

These questions cover the JavaScript execution model as Node hosts it: execution contexts, the call stack, closures, allocation and garbage collection at interview depth, V8's role, and CommonJS versus ECMAScript modules. libuv appears only as the boundary under V8. Event-loop phase order belongs in the next section.

Behavior that comes from ECMAScript is called out as the language. Behavior that comes from Node's host (the module loader, `process`, `vm`, workers, libuv) is called out as Node. V8 details are included only where they change how you design or diagnose a Node process.

### NODE-001 — What an execution context is, and which context a Node file runs in

**Difficulty:** Intermediate

**Category:** Execution model

**Question:**

A candidate says "everything in Node runs in the global scope, like a browser script." Walk through what an execution context actually is, which kinds ECMAScript defines, and which kind of context is active at the top of a CommonJS file versus an ES module. Use Node 20 or 22.

**Context and Constraints:**

- The process is a normal Node 20 or 22 process, main thread, no `vm` module and no worker threads.
- One file is CommonJS (`"type"` absent or `"commonjs"`, `.js` or `.cjs`). The other is an ES module (`.mjs` or `"type": "module"`).
- The interviewer wants the language mechanism, and the Node-specific part named separately.
- Do not draw the libuv phase diagram. The question is about the context that is running while JavaScript is evaluating.

**Senior Engineer's Answer:**

An execution context is the ECMAScript record for a piece of code that is currently evaluating. It identifies the realm (which global object and which built-in intrinsics, such as that realm's `Array`), the lexical environment used to resolve identifiers, and, for a function call, the `this` value for that call. The spec pushes a context when evaluation of a script, module, or function begins, and pops it when that evaluation returns or throws.

The language has a global execution context for a classic script, a module execution context for an ES module, a function execution context for each function call, and an eval execution context for direct `eval`. Creating the context and running it are separate steps. During creation, bindings are instantiated: `var` bindings and function declarations are created and `var` is initialized to `undefined`; `let`, `const`, and `class` bindings are created uninitialized and stay in the temporal dead zone until their initializer runs. That instantiation rule is ECMAScript. Node and browsers that implement the spec behave the same way.

Node changes the story for CommonJS, because CommonJS is not an ECMAScript module and not a classic script. Node wraps each CommonJS file in a function and calls that function. The top of a CommonJS file is therefore a function execution context. A top-level `var` lives in that function environment. It does not become a property of `globalThis`. An ES module is different: Node evaluates it as a module execution context, which is the spec path. Top-level `var` in an ES module is a binding in the module environment, and it also does not become a property of `globalThis`.

The global execution context still exists. It belongs to the realm Node created for the main thread, the one whose global object is `global` / `globalThis`. Your file does not run as that context. Code reaches it when you assign to `globalThis`, when a sloppy-mode function is called without a receiver, or when you evaluate a classic script in a `vm` context.

Direct `eval` is also spec behavior: it evaluates in a new eval context whose lexical environment is the caller's, so it can see the caller's locals. Indirect `eval` (`(0, eval)(source)`) and `new Function` evaluate against the global environment. Node does not special-case that rule inside a module.

**Practical Implementation:**

```js
// cjs-probe.cjs — Node wraps this file in a function before calling it.
var fromCjs = 1;
console.log('cjs var on globalThis', globalThis.fromCjs); // undefined
console.log('cjs this is the exports object', this === exports); // true
```

```js
// esm-probe.mjs — real module execution context. ECMAScript, hosted by Node.
var fromEsm = 1;
console.log('esm var on globalThis', globalThis.fromEsm); // undefined
console.log('esm top-level this', this); // undefined
```

A top-level `return` is legal in the CommonJS file because the wrapper is a function. The same `return` at the top of the ES module is a syntax error. That difference is Node's wrapper, not a difference in V8's compiler.

**Trade-offs and Alternatives:**

Putting shared state on `globalThis` makes it visible to every module in the realm, which is useful for a process-wide diagnostic hook and a liability for tests and libraries. Module scope (a `let` at the top of the file, or a CommonJS `module.exports`) keeps the binding in that module's environment. A `vm` context creates another realm-like global in the same isolate; that is a different tool and is covered with workers later in this file.

**Common Mistakes:**

- Describing Node as "one global scope" and treating a CommonJS file as a browser classic script. In a browser classic script, top-level `var` does become a property of the window. Node's wrapper prevents that.
- Saying `let` is "not hoisted." The binding is created when the environment is instantiated, and reading it before initialization throws. That is the temporal dead zone.
- Treating `this` at the top of a CommonJS file as `globalThis`. At the start of the wrapper, `this` is the `exports` object.
- Claiming the module environment and the global environment are the same object because both are "top level."

**Senior-Level Follow-up:**

The interviewer pastes a CommonJS file that starts with `'use strict'` and asks why an undeclared assignment now throws, while the same line without the directive created a global.

Answer: the wrapper is a sloppy-mode function unless the file itself opts into strict mode. In sloppy mode, assigning to an undeclared name creates a property on the global object. That is ECMAScript sloppy-mode behavior, and Node's wrapper gives CommonJS that behavior by default. `'use strict'` at the first statement of the file makes the wrapper strict, so the assignment is a `ReferenceError`. ES modules are strict by the language definition, with no directive required. Strict mode changes the rules of that execution context. It does not create a second context.

### NODE-002 — One call stack per isolate, and where an async callback actually runs

**Difficulty:** Intermediate

**Category:** Execution model

**Question:**

Explain the JavaScript call stack in a Node 20/22 process. A teammate says `fs.readFile` "runs the callback on the thread pool" so the server can parse JSON on that second JavaScript stack while the handler is still on the first. Correct the model. Say what is spec, what is V8, and what is Node.

**Context and Constraints:**

- One Node process, main thread only. No `worker_threads` yet.
- The handler does some synchronous work and then calls `fs.readFile`.
- The interviewer wants the relationship between the execution context stack, an isolate, and a callback.
- Leave timers, poll, and check for the event-loop section. You may name libuv as the boundary.

**Senior Engineer's Answer:**

The call stack is the execution context stack for one agent. Each push is a function, module, or eval context. Each return or throw pops it. A stack trace is V8's view of that stack, plus native frames Node adds for internal calls. `Error.stack` itself is a V8/Node property. ECMAScript does not specify the string format.

Node's main thread has one V8 isolate. That isolate has one JavaScript heap and one JavaScript call stack. Application code does not get a second JavaScript stack inside that isolate. A native addon can enter the isolate from another OS thread only by taking V8's isolate lock, and the lock means one thread at a time executes JavaScript there. That is still one stack, used serially.

`fs.readFile` returns while the handler is still on the stack. The operating-system read is arranged by libuv, and for filesystem APIs that cannot be done with a non-blocking call, the read runs on libuv's thread pool. Those pool threads execute native code. They have C stacks. They do not push JavaScript execution contexts, and they cannot see your lexical environments. When the read finishes, libuv queues a completion. Node runs your callback later, on the main isolate's single JavaScript stack, as a new turn: a fresh function execution context pushed when the stack is otherwise clear of your handler.

The language rule underneath is run-to-completion of a job. ECMAScript runs one job until it finishes. The host decides when the next job starts. Async work is another job on that same agent, scheduled by Node. It is a later turn on the same stack.

A second JavaScript stack exists when you create one. `worker_threads` starts another thread with its own isolate, its own heap, and its own stack. `fs.readFile` does not do that.

**Practical Implementation:**

```js
import { readFile } from 'node:fs';

function handler() {
  readFile(new URL('./package.json', import.meta.url), (err, buf) => {
    // This frame is pushed later, on the main thread's only JS stack.
    // It is not running beside handler(), and it is not on the libuv pool.
    if (err) throw err;
    JSON.parse(buf.toString());
  });
  // handler's frame is still here. The callback is not.
}

handler();
```

The callback's stack trace, if you throw inside it, shows the callback and Node's internal frames. It does not show `handler`, because `handler` has already returned.

**Trade-offs and Alternatives:**

If the JSON parse is large enough to matter, moving it off the main stack means a Worker with its own isolate, or a streaming parser that yields between chunks. The thread pool is the wrong place to put JavaScript: you cannot schedule a function onto it. `readFileSync` keeps the read on the current JavaScript frame and blocks that thread inside the call. That is a different mechanism from a callback, and it still uses the one main stack.

**Common Mistakes:**

- Saying "async means a background JavaScript thread." The callback is queued, then run on the same isolate that queued it.
- Reading a stack trace from inside a callback and expecting the original request handler to still be on it.
- Treating libuv pool threads as places where closures run. A closure runs only when some JavaScript frame on an isolate calls it.
- Assuming two `async` functions run their bodies in parallel because both were invoked. Each runs on the one stack until it hits an `await`, and the continuations are later turns.

**Senior-Level Follow-up:**

The interviewer asks what `new Promise(executor)` does with the stack, compared with a `.then` callback.

Answer: the executor is called synchronously on the current stack, before `new Promise` returns. That is ECMAScript. A reaction queued by `.then`, `.catch`, or `.finally` is a promise job. Node runs it later as a microtask, after the current stack unwinds. The reaction is another turn on the same stack. It is not a second stack, and it is not the libuv pool. `process.nextTick` is a separate Node queue and is covered with microtasks later in this file.

### NODE-003 — Why a synchronous loop stalls callbacks that are already finished

**Difficulty:** Intermediate

**Category:** Execution model

**Question:**

A request handler loads a small config with `fs.readFile` and then runs a tight synchronous loop for tens of milliseconds before returning. The file read completes during that loop. Why does the callback still wait, and what is the difference between this and `fs.readFileSync`? Node 20/22, main thread.

**Context and Constraints:**

- Single main isolate. No workers.
- The loop is pure JavaScript. It does not `await`.
- You may name libuv only to say where the completed read sits while the loop runs.
- Do not list event-loop phases. Do not invent a duration for "how long is too long."

**Senior Engineer's Answer:**

JavaScript on one agent runs a job to completion. The handler is that job. While its frame is on the stack, Node will not start another JavaScript turn on that isolate: not the file callback, not a promise reaction, not a timer. That scheduling rule is the host applying the language's job model.

`fs.readFile` returns quickly. libuv can finish the read while the loop is still running, because the filesystem work for this API is native work, off the JavaScript stack. The completion is queued. The callback stays queued until the handler returns and the stack is clear, at which point Node can take the next turn and push the callback's function context.

`fs.readFileSync` never leaves the current frame. The thread blocks inside that call until the bytes are in memory, and there is no completion callback at all. Both styles delay other JavaScript. The mechanisms differ: the synchronous API occupies the stack with the read itself; the asynchronous API frees the stack only after your own synchronous work finishes, and only then can the already-finished read be delivered as JavaScript.

Network sockets are a useful boundary check. Much of non-blocking socket I/O is polled by libuv on the main thread, not on the pool. A long JavaScript loop also delays that polling, because the loop and the poller share the thread. The pool can complete a blocking filesystem call during the loop. Either way, the JavaScript callback waits for the stack.

**Practical Implementation:**

```js
import { readFile, readFileSync } from 'node:fs';

const url = new URL('./package.json', import.meta.url);

function occupiesTheStack() {
  readFile(url, () => {
    console.log('callback turn');
  });
  const start = Date.now();
  while (Date.now() - start < 20) {
    // Pure JS. The read may finish in libuv during this loop.
    // The callback cannot start until this frame returns.
  }
  console.log('handler returned');
}

function blocksInsideTheCall() {
  const bytes = readFileSync(url); // still the one stack; no callback
  return bytes.length;
}
```

The 20 millisecond bound is only there to make the ordering observable in a demo. It is not a performance budget.

**Trade-offs and Alternatives:**

Break long CPU work into chunks that return to the host, move the CPU work to a Worker, or do the work in a native addon that was designed for it. Chunking keeps one isolate and adds scheduling overhead. A Worker gives you a second stack and a second heap, and you pay structured clone or `SharedArrayBuffer` to communicate. `readFileSync` is appropriate for small files during startup, when no request is waiting on this thread. It is a poor fit inside a live request handler, because the whole isolate stalls inside the frame, including for a cache hit you could have structured differently.

**Common Mistakes:**

- Believing a callback can preempt a running function the way an OS thread can preempt another thread. JavaScript on that isolate is not preempted by another JavaScript turn.
- Treating "the read already finished" as "the callback is running." Completion of the native operation and execution of the JavaScript callback are different events.
- Using `readFileSync` in a handler because "async made the stack confusing." The synchronous call is easier to read and blocks the isolate for the whole read.
- Reaching for a cluster or a Worker before measuring whether the stall is a long JavaScript turn on the main isolate.

**Senior-Level Follow-up:**

The interviewer asks whether `await` inside the loop would let the file callback run between iterations.

Answer: `await` suspends that async function and returns a promise to its caller, which lets the current stack unwind if the caller also returns. The file callback can run on a later turn before the async function resumes. A `while` loop with no `await` never suspends, so the callback still waits. Putting `await` on every iteration just to "be nice" to the event loop is a design you measure: each resume is another microtask, and the loop still occupies the stack between awaits. It does not create a second stack.

### NODE-004 — Closures capture bindings, and the bindings stay live

**Difficulty:** Senior

**Category:** Closures

**Question:**

Explain what a closure captures. A reviewer says the inner function "snapshots the value of `n` when it was created," so later increments of `n` should be invisible. Show the actual ECMAScript behavior, and show where a real copy does happen. This is language semantics, in Node or anywhere else.

**Context and Constraints:**

- Plain JavaScript. No module loader tricks.
- `n` is a `let` in the outer function. The inner functions escape the outer call.
- The interviewer wants the environment model, not a V8 optimization story.

**Senior Engineer's Answer:**

A function object saves a reference to the lexical environment that was active where the function was created. ECMAScript stores that environment on the function's `[[Environment]]` internal slot. When the function body evaluates a free identifier, resolution walks that environment chain, not the caller's chain. The call stack decides which context is running. The lexical environment decides which binding an identifier names. Those are different mechanisms, which is why a closure still sees `n` after the outer function has returned: the environment is reachable from the function object, so it stays alive.

A binding is a location in an environment record, not a copy of a JavaScript value. `let n = 0` creates one location. `n += 1` writes a new value into that same location. Every function that closed over that environment reads the current contents when it runs. Reassignment is visible. That is what "live binding" means for a closure.

Two different copies are often confused with this:

- Passing or returning a primitive copies the value at that moment. `const snapshot = n` creates a second binding, initialized with the number currently in `n`. Later writes to `n` do not write to `snapshot`.
- Mutating an object does not reassign the binding. `const box = { n: 0 }` and `box.n += 1` leave the binding `box` pointing at the same object. A closure that captured `box` sees the mutation because it reads the same object, and it would also see a later `box = other` if `box` had been declared with `let`.

The outer call can return. The environment remains as long as any captured function remains reachable. When the last of those functions becomes unreachable, the environment can be collected. That lifetime is ordinary reachability, covered with garbage collection later in this file.

**Practical Implementation:**

```js
function makeCounter() {
  let n = 0;
  const snapshot = n; // second binding, initialized with today's value
  const box = { n: 0 };

  return {
    inc() {
      n += 1;
      box.n += 1;
    },
    read() {
      return { n, snapshot, boxN: box.n };
    },
  };
}

const counter = makeCounter();
counter.inc();
console.log(counter.read()); // { n: 1, snapshot: 0, boxN: 1 }
```

`inc` and `read` share one `n`, one `snapshot`, and one `box`. `snapshot` stays 0 because nothing writes that binding.

**Trade-offs and Alternatives:**

Closing over a small binding is the normal way to keep private state. Closing over a large object when you needed one field keeps the whole object reachable; copy the field into a local if the object should be collectable. A class field stores state on the instance instead of in a hidden environment. Both are lexical. The class field is visible on the object, which makes it easier to inspect and easier to mutate from outside. A module-level `let` is a closure environment that lives as long as the module, which in Node means as long as that module record stays loaded.

**Common Mistakes:**

- Saying the closure copied `n` at creation time. It stored the environment. The read happens when the inner function runs.
- Expecting `const snapshot = n` and a closure over `n` to behave the same. One is a second binding. The other is a shared location.
- Thinking the outer function's stack frame still exists. The frame was popped. The environment record is a heap object retained by the closure.
- Using dynamic scope to explain it: "it sees `n` because of who called it." A function created in another environment and called from `makeCounter` does not see `makeCounter`'s `n`.

**Senior-Level Follow-up:**

The interviewer asks why an imported ESM name and this closure are described with the same words, "live binding."

Answer: both read a binding at the moment of the read, and both observe later writes to that binding. The mechanism is not the same object. A closure holds a lexical environment from the place it was created. An ESM import binding is linked, by the module loader, to the export binding in the exporting module. CommonJS does not create that import link. The comparison is developed in the module questions later in this file. For this question, the local `let` is enough: one location, many readers, writes are visible.

### NODE-005 — The loop closure is one binding or a binding per iteration

**Difficulty:** Intermediate

**Category:** Closures

**Question:**

This loop schedules no timers. Predict the values, explain the environment records, and say why `let` is not "snapshotting the number."

```js
const reads = [];
for (var i = 0; i < 3; i += 1) {
  reads.push(() => i);
}
for (let j = 0; j < 3; j += 1) {
  reads.push(() => j);
}
const values = reads.map((read) => read());
```

**Context and Constraints:**

- The functions are called after both loops finish, synchronously.
- The candidate must explain `var` and `let` from the spec, not from "var is function scoped" alone.
- Node does not change this. It is ECMAScript, so the same program in another engine is the same program.

**Senior Engineer's Answer:**

`values` is `[3, 3, 3, 0, 1, 2]`.

`var i` creates one binding in the function (or module, or CommonJS wrapper) environment that encloses the loop. Every arrow created in that loop has that same environment as its `[[Environment]]`. The loop writes `i` on each iteration. After the loop, the binding holds `3`, because the update `i += 1` ran when `i` was `2` and the test then failed. Each of the first three functions reads that one location and gets `3`.

`for (let j = ...)` is specified differently. Each iteration gets a fresh declarative environment and a fresh `j` binding. The new binding is initialized with the current value at the start of that iteration. The arrow created on that iteration captures that iteration's environment. Later updates write the next iteration's binding, not the previous one. After the loop, the three functions still hold the three environments, so they read `0`, `1`, and `2`. Nothing copied a number into the arrow. The loop created three locations, and each location was written once with that iteration's value and then left alone.

Calling the functions from a timer later would read the same locations. The delay is not what creates the sharing. The shared `var` binding is.

A `forEach` callback is yet another shape: each call to the callback is its own function execution context, with its own parameter binding. Closing over the parameter captures that call's binding. That is ordinary per-call environment instantiation, not the per-iteration rule the `for`/`let` loop adds.

**Practical Implementation:**

```js
function collect() {
  const reads = [];

  for (var i = 0; i < 3; i += 1) {
    reads.push(() => i);
  }
  for (let j = 0; j < 3; j += 1) {
    reads.push(() => j);
  }

  return reads.map((read) => read());
}

console.log(collect()); // [3, 3, 3, 0, 1, 2]
```

If the `var` loop needs a per-iteration location in old code, create one on purpose: `let current = i` inside the body, and close over `current`. Each iteration's block environment then has its own `current`, initialized from `i`. New code uses `let` on the loop head.

**Trade-offs and Alternatives:**

`let` on the loop head is the direct expression of "one binding per iteration." An IIFE around the body was the pre-`let` way to manufacture a new environment per iteration. It still works, and it allocates an extra function call per iteration for no benefit in modern Node. `for...of` with `const item of items` also creates a per-iteration binding, so a closure over `item` sees that element.

**Common Mistakes:**

- Memorizing "timeouts print 3" without being able to explain the same bug when the closures are called synchronously after the loop.
- Saying `let` snapshots. The spec creates a new binding and initializes it. The closure still reads a location.
- Claiming `var` inside the loop body is block scoped. `var` is scoped to the enclosing function, module, or CommonJS wrapper, so a `var` in a nested block is still the one binding.
- Fixing the bug by switching the callback to `async`. An `async` function closes over the same binding. `await` does not copy it.

**Senior-Level Follow-up:**

The interviewer changes the `let` loop body to `reads.push(() => j++)` and asks for the values if each function is called twice.

Answer: each function has its own `j`. The first round of calls returns `0`, `1`, `2` and leaves the bindings holding `1`, `2`, `3`. The second round returns those updated values. The increments are writes to the captured per-iteration bindings. They do not revive a shared counter. If it had been `var i` and the body did `i++`, every function would share the writes, and the results would step forward on one location.

### NODE-006 — A closure retained by module scope is a process-lifetime leak

**Difficulty:** Staff-Level

**Category:** Memory

**Question:**

A Node 22 HTTP service's `heapUsed` grows with request volume and does not fall after traffic stops. RSS stays high as well. The handler is short. Someone suggests the garbage collector is "behind" and proposes calling `global.gc()` on an interval. Diagnose the lifetime, name the likely retainer, and say what you would measure. No invented before/after sizes.

**Context and Constraints:**

- One process, main isolate, CommonJS or ESM. The handler module stays loaded for the life of the process.
- The handler allocates a large `Buffer` per request and stores a function in a module-level array "for later audit."
- You may take heap snapshots. You may not quote a leak size, a GC pause, or a percent improvement you did not measure on this process.
- Event-loop tuning is out of scope. The question is retention.

**Senior Engineer's Answer:**

Collection is reachability. If a module-level array holds a function, and that function's environment holds the `Buffer`, the buffer stays reachable for as long as the array does. Node keeps the module record alive for the process (CommonJS via `require.cache`, ESM via the loader's module map), so the array is a root for practical purposes. The collector is not behind. It is correctly keeping objects your module can still reach.

`global.gc()` exists only when the process is started with `--expose-gc`. It is a debug hook into V8. Calling it on an interval in production does not make a reachable buffer unreachable, and it adds extra collections. Leave it out of the service.

The staff-level diagnosis separates the graphs:

- `heapUsed` and `heapTotal` describe the V8 heap. A retained `Buffer` shows up here as a small wrapper, and the backing store shows up in `external` and `arrayBuffers` (those fields are defined in the next memory questions). Growth in `arrayBuffers` with a flat `heapUsed` is still a real retention if the wrappers are few and the stores are large.
- RSS is the operating system's resident set for the whole process. It can stay high after V8 has freed a heap region, because the allocator does not always return pages immediately. A rising RSS with a flat heap after traffic has stopped is a reason to look at native allocations and fragmentation, not a reason to skip the heap snapshot.
- Two heap snapshots, one after a quiet period and one after a known number of requests followed by another quiet period, show which constructors grew. The retainer path you expect is: module environment → array → closure → `Buffer` or its backing store. If the path instead runs through an `EventEmitter` listener list or a `setInterval`, the same logic applies: a long-lived host object is holding the environment.

The fix is to drop the reference. Keep a bounded audit structure with an explicit eviction, or write the audit line out and retain nothing. Then take the same pair of snapshots again. The result you report is the retainer you removed and the shape of the second comparison, not a percentage copied from another service.

**Practical Implementation:**

```js
import { createServer } from 'node:http';
import { writeHeapSnapshot } from 'node:v8';

const retained = [];

const server = createServer((req, res) => {
  const payload = Buffer.alloc(64 * 1024);
  retained.push(() => payload.byteLength); // environment keeps payload
  res.end('ok');
});

function dump(label) {
  const file = writeHeapSnapshot();
  console.log(label, file, 'retained fns', retained.length);
}

server.listen(0, () => dump('listen'));
```

The corrected handler ends the response with the length and does not push a function. If an audit trail is a real requirement, store a fixed-size summary (status code, byte length, request id) in a ring buffer of plain objects, or write it to the log stream and let that buffer be the logging library's problem, with a configured high-water mark.

**Trade-offs and Alternatives:**

A ring buffer caps memory and drops old entries. That is the right trade when the audit is diagnostic. A log stream moves retention into the transport, which can apply backpressure; it is the right trade when every line must leave the process. `WeakRef` does not fix this pattern: the closure's environment is a strong reference, and a cache that only holds weak refs is collected immediately if nothing else keeps the value. Workers do not fix a leak that is logical retention; they give you another heap with the same bug if the worker keeps the same array.

Removing the module from `require.cache` drops that module's exports only if nothing else retained them, and it does not exist as a public operation for an already-evaluated ES module. It is a test technique, not a production leak fix. Restarting the process hides the growth until the retainer fills the heap again.

**Common Mistakes:**

- Scheduling `global.gc()` and calling the leak solved because one sample of `heapUsed` dipped.
- Reading RSS alone and concluding the V8 heap is the same size as the process.
- Snapshotting during the request, while the buffer is still a local, and missing the retainer that remains after the function returns.
- "Fixing" it by switching the array to a `Map` with the same push-forever behavior. The collection type is not the lifetime.

**Senior-Level Follow-up:**

The interviewer says the array was already removed, and a snapshot still shows request buffers retained. What do you look at next?

Answer: any other strong reference that outlives the request. Typical ones on the main isolate are an `EventEmitter` listener registered per request and never removed, a timer or socket whose callback closed over the payload, a pending promise chain stored in a module-level `Map`, and a logger or APM agent that retained the arguments object. The snapshot's retainer path names the actual one. You also check `arrayBuffers`: if the heap objects are gone and the backing stores remain, something still holds a view (`Buffer`, `Uint8Array`) or an `ArrayBuffer`. Clearing the JavaScript array without dropping those views does not free the stores.

### NODE-007 — Garbage collection at interview depth

**Difficulty:** Senior

**Category:** Memory

**Question:**

Explain how a senior engineer should talk about garbage collection in Node 20/22. Cover reachability, the generational strategy, what a pause means for the process, and which knobs are real. Skip V8 source trivia: no nursery sizes, no invented generation names, no pause milliseconds.

**Context and Constraints:**

- Official Node 20 or 22, V8 as shipped with that binary.
- The service is a long-lived HTTP process on the main isolate.
- The interviewer will push on anything that sounds like a specific byte size or a guaranteed schedule.
- You may name `--max-old-space-size` as a flag whose default you refuse to quote from memory.

**Senior Engineer's Answer:**

An object is eligible for collection when it is not reachable from a root. Roots include the live JavaScript stack, the global object, and handles Node's C++ side keeps for host objects: open sockets, timers, requests, and module records. A local that has gone out of scope is collectable only if no environment, no property, and no host handle still points at it. `delete obj.field` removes a property. It does not schedule a collection, and it does not free the value if another binding still holds it.

V8's collector is generational. The useful statement of the policy is: most objects die young, so the young generation is collected more often (a minor collection), and objects that survive are promoted into the old generation, which is collected less often (a major collection). Sufficiently large allocations may go directly into the old generation. The size cutoff is a V8 parameter and has changed across engines, so it is not a number you recite. The same goes for the capacity of the young generation. If you need the number for a capacity plan, read it from the binary and the V8 flags you actually ship, and treat it as a measured input.

A collection has to agree with the program about which pointers exist. Parts of that work pause the JavaScript thread on that isolate. V8 also marks incrementally and concurrently, so a major collection is not one pause that covers the entire trace. You do not promise "GC is pause-free," and you do not promise a pause budget you have not measured on that version. A pause stalls the one JavaScript stack, which means that isolate cannot start another JavaScript turn and cannot progress libuv work that shares the thread, for the duration of the pause.

When V8 collects is an engine decision based on allocation and the heap limit. The language does not specify it. `--max-old-space-size` sets the old-generation limit in megabytes. The default depends on the Node version and the machine. Quote it from `node --v8-options` on the image you deploy, or from the process, not from a blog. Hitting the limit is a fatal heap exhaustion. The usual outcome is the process exits. A `try/catch` around an allocation is not an out-of-memory strategy.

Short-lived request objects that become unreachable at the end of the turn are what the young generation is for. A module-level cache promotes them, after which only a major collection could reclaim them, and only if the cache dropped the references. That is the link between this question and the closure-retention question.

**Practical Implementation:**

```js
import { memoryUsage } from 'node:process';

// Debug-only. Production code does not call this.
function debugCollect() {
  if (typeof global.gc !== 'function') {
    throw new Error('start node with --expose-gc to collect on demand');
  }
  const before = memoryUsage();
  global.gc();
  const after = memoryUsage();
  return { before, after };
}
```

Use that in a local investigation to see what is still reachable after a full collection. Ship the service without `--expose-gc`. For the old-space limit, set `--max-old-space-size` from the container memory budget on purpose, leaving room for the rest of the process (native memory, stacks, the young generation, the operating system), and validate the choice by running the process until it is either stable or it exhausts. The validation is a measurement you perform, not a ratio in this handbook.

**Trade-offs and Alternatives:**

Raising `--max-old-space-size` delays exhaustion and can lengthen major collections, because there is a larger heap to trace. Lowering it fails faster and can increase collection frequency. Neither setting removes a retainer. A process restart, or a worker recycle, bounds memory only if the leak is per-process lifetime and the recycle actually drops the isolate. It is an operational containment, not a fix for a module-level array.

Object pooling avoids allocation only when you have measured allocation as the cost and you can return objects to a known-empty state. A pool that forgets to clear a field retains whatever the last request left there, which is a lifetime bug wearing a performance costume.

**Common Mistakes:**

- Reciting generation names, nursery megabytes, or pause milliseconds from a conference talk about a different V8 version.
- Saying "Node frees memory when the function returns." The frame pops. Heap objects die later, if they are unreachable.
- Treating `delete` or assigning `null` as a call to the collector. Assigning `null` drops one reference. Collection happens when V8 decides, if that was the last reference.
- Describing GC as a second thread that runs your JavaScript. Collector work can run alongside the process in ways V8 documents as concurrent marking. Your JavaScript still runs on the isolate's one stack, and it still pauses when the collector needs it to.

**Senior-Level Follow-up:**

The interviewer asks whether a `Buffer` of several megabytes is collected like a small object.

Answer: the JavaScript wrapper is a heap object. The backing store is external memory, reported under `arrayBuffers`, and it is freed when the wrapper and every view become unreachable and the collector (or the buffer's own cleanup) runs. A large store can make RSS move without `heapUsed` moving by the same amount. A large object may also be allocated in the old generation immediately, so it may not show the "died in the young generation" pattern. You confirm which one you have with `memoryUsage()` over time and a snapshot, rather than by the byte size you hoped was the threshold.

### NODE-008 — What process.memoryUsage is actually counting

**Difficulty:** Senior

**Category:** Memory

**Question:**

`process.memoryUsage()` returns `rss`, `heapTotal`, `heapUsed`, `external`, and `arrayBuffers`. Define each field for Node 20/22, say which ones overlap, and say what a single sample cannot prove. Include the worker-thread caveat.

**Context and Constraints:**

- Node 20 or 22, documented `process.memoryUsage()` shape.
- The process may host `worker_threads`.
- No benchmark numbers. The sample values in the Node docs are illustrative; do not treat them as a healthy baseline.
- Diagnosis of a specific leak was the previous question. This one is the instrument.

**Senior Engineer's Answer:**

All five numbers are bytes.

`heapTotal` is memory V8 has reserved for the heap. `heapUsed` is the portion of that heap that currently holds JavaScript objects. `heapUsed` falls after a collection if objects were reclaimed. `heapTotal` falls only when V8 also releases reserved heap pages. A sawtooth in `heapUsed` between collections is normal allocation, not a leak.

`external` is memory for C++ objects bound to JavaScript objects managed by V8. `arrayBuffers` is the memory allocated for `ArrayBuffer`s and `SharedArrayBuffer`s, including every Node `Buffer`. `arrayBuffers` is included in `external`. Adding them together double-counts the buffers. When Node is embedded, `arrayBuffers` can be `0` because those allocations might not be tracked. In a normal `node` process they are tracked.

`rss` is the resident set size: physical memory the operating system associates with the whole process, including the heap, stacks, code, and native allocations. It is not a V8 number. On Linux, RSS can climb while `heapTotal` is stable because of allocator fragmentation. Node's own documentation calls that out for glibc `malloc`. A rising RSS is a signal to identify which allocator and which graph, not a signal that the JavaScript heap has the same slope.

`memoryUsage()` walks pages to compute this. Calling it on a hot path has a cost. It is a diagnostic, not a request metric you stamp on every response without a reason.

In a Worker, `rss` is process-wide. `heapTotal`, `heapUsed`, `external`, and `arrayBuffers` refer to that worker's isolate. Logging `heapUsed` inside a worker and calling it "the process heap" undercounts the main isolate and every other worker. Logging `rss` inside a worker and calling it "this worker" overstates that worker.

One sample cannot prove a leak. `heapUsed` depends on where you are between collections. Take a series, after comparable idle points, and pair it with a snapshot when the series climbs and stays climbed. `process.memoryUsage.rss()` is the same RSS figure with a faster path when RSS is the only field you need.

**Practical Implementation:**

```js
import { memoryUsage } from 'node:process';

function sample(label) {
  const m = memoryUsage();
  return {
    label,
    rss: m.rss,
    heapTotal: m.heapTotal,
    heapUsed: m.heapUsed,
    external: m.external,
    arrayBuffers: m.arrayBuffers,
    // external already includes arrayBuffers; this is the non-buffer remainder.
    externalNonBuffer: m.external - m.arrayBuffers,
  };
}
```

Log `sample()` on a slow interval or on a signal, not per request. Compare samples taken after the process has gone quiet, so you are not looking at in-flight request buffers that are about to become unreachable.

**Trade-offs and Alternatives:**

`process.resourceUsage()` and operating-system RSS from `ps` or cgroup stats answer different questions (CPU, page faults, the kernel's view of the cgroup). Heap snapshots answer "who retains this." `memoryUsage` answers "which bucket moved." V8's heap statistics APIs expose more of the heap layout for a profiler. You do not need them to explain these five fields.

Container limits apply to RSS-like usage (the cgroup), not to `heapUsed`. A process can be OOM-killed with a comfortable-looking `heapUsed` if `arrayBuffers`, native addons, or fragmentation pushed RSS to the limit. Setting `--max-old-space-size` bounds one V8 region and leaves the other buckets untouched.

**Common Mistakes:**

- Adding `heapUsed` and `rss`, or `external` and `arrayBuffers`, and reporting the sum as "total memory."
- Treating the example object in the Node docs as a baseline for a healthy server.
- Reading `heapUsed` inside a worker as the process total, or `rss` inside a worker as that worker alone.
- Declaring a leak from one sample taken at peak traffic, in the middle of a young-generation sawtooth.

**Senior-Level Follow-up:**

The interviewer says `heapUsed` returned to the baseline after traffic, `arrayBuffers` returned to the baseline, and RSS did not. What do you conclude?

Answer: the JavaScript heap and the tracked buffer stores were released. The process still holds resident pages. That pattern matches allocator retention and fragmentation, a native addon that did not return memory to the OS, or the operating system simply not reclaiming pages V8 already freed. It does not, by itself, mean the closure graph is still holding those buffers. Next you compare native allocations and, on Linux, the malloc implementation, which is the case Node's docs point at when RSS grows while `heapTotal` does not. You still take a snapshot if a later sample shows `heapUsed` or `arrayBuffers` failing to return.

### NODE-009 — Heap objects, small integers, and Buffer backing stores

**Difficulty:** Senior

**Category:** Memory

**Question:**

Where do values live in a Node 20/22 process? Cover ordinary objects, numbers, strings, closures, and `Buffer`. Separate ECMAScript's value model from V8's representation and from Node's buffer allocation. Do not invent a threshold in bytes for "large."

**Context and Constraints:**

- Official 64-bit Node, which ships V8 with pointer compression.
- The interviewer wants a useful allocation model for diagnosing memory and for writing APIs, not a V8 object-header diagram.
- `Buffer.alloc` versus `Buffer.allocUnsafe` is in scope. Security of leftover bytes matters here as an allocation fact.

**Senior Engineer's Answer:**

ECMAScript values are numbers, strings, objects, functions, and the rest of the language's types. The spec does not say which of them occupy a heap cell. V8 does.

Objects, arrays, functions, and environments are heap allocated. A closure is a function object on the heap plus the environment records it retains. Two closures created in the same call share one environment if they capture the same activation. That shared environment is why `inc` and `read` in the closure question see one `n`, and why retaining either function retains the environment's other slots too.

Numbers are IEEE-754 binary64 at the language level. V8 stores integers that fit in a small immediate range as tagged values called Smis, which are not heap objects. The range is a build option. With pointer compression, Smis are 31-bit signed, from `-(2 ** 30)` through `2 ** 30 - 1`. Without it, a 64-bit build uses 32-bit signed Smis, from `-(2 ** 31)` through `2 ** 31 - 1`. Official Node binaries are not a reason to assume pointer compression is on. `process.config.variables.v8_enable_pointer_compression` on the binary you run is the check. `2 ** 31` is outside both ranges, so it is a heap-allocated number either way, and any non-integer is a heap number too. Arithmetic that stays inside the Smi range can avoid that allocation. The value your program observes is still a Number. That representation is V8, not ECMAScript.

Strings are heap objects. V8 has used several internal representations, including representations that share storage between a string and a substring. Whether `s.slice(0, 8)` releases the rest of a multi-megabyte `s` is an engine detail that has changed across V8 versions. If a small derived string outlives a large input, a heap snapshot tells you whether the large string is still retained. Do not promise that `slice` copies.

A Node `Buffer` is a `Uint8Array`. The JavaScript wrapper is a small heap object. The backing store is an `ArrayBuffer` store outside the ordinary V8 heap and is counted in `arrayBuffers` and in `external`. Views (`Buffer`, `Uint8Array`, `DataView`) keep that store alive. `Buffer.alloc(n)` allocates and zeroes. `Buffer.allocUnsafe(n)` allocates without zeroing, so old bytes can remain visible until you overwrite them. For sizes below `Buffer.poolSize` (the documented default is 8192 bytes), `allocUnsafe` slices from a shared pool. That pool is a Node allocation policy, not a JavaScript semantic. Use `alloc` or `allocUnsafeSlow` when the buffer will be only partly overwritten and might leave the process, or when you need a distinct store that is not a slice of the pool.

**Practical Implementation:**

```js
import { Buffer } from 'node:buffer';

function ids(n) {
  // 2 ** 31 is outside both the 31-bit and the 32-bit Smi ranges: a heap number.
  const wide = 2 ** 31 + n;
  const small = n; // Smi on either build when n is an integer in -(2 ** 30) .. 2 ** 30 - 1
  return { wide, small };
}

function secret(bytes) {
  const buf = Buffer.alloc(bytes.length); // zeroed, then fully overwritten
  bytes.copy(buf);
  return buf;
}
```

`Buffer.allocUnsafe` is the right tool when the next step fills every byte before the buffer is read, and you have measured allocation as a cost. It is the wrong default for a request body you might log on error, because the uninitialized tail is leftover process memory.

**Trade-offs and Alternatives:**

A JavaScript array of numbers is an array of values, with Smi or heap-number elements. A `Uint8Array` over one `ArrayBuffer` is one backing store and is the right model for binary protocols. `Buffer.concat` on a list of chunks copies into a new store; holding the chunk list and the concatenation at the same time retains both. A stream that processes a chunk and drops it keeps one store in flight. Streams as an API are a later section; the allocation point belongs here.

Pooling buffers yourself reintroduces the `allocUnsafe` hazard if you forget to set `buf.length` / the filled region. Prefer the documented allocators unless a profile says the pool is the problem.

**Common Mistakes:**

- Teaching that "primitives live on the stack and objects live on the heap." A Smi can live in a register or a stack slot. A number outside that range is a heap object. A primitive stored in an object property is stored with the object. The spec does not have this split.
- Assuming every `string.slice` immediately frees the parent string.
- Using `Buffer.allocUnsafe` and sending the buffer before every index is overwritten.
- Adding `Buffer.byteLength` to `heapUsed` by hand. The store is already reported under `arrayBuffers`.

**Senior-Level Follow-up:**

The interviewer asks why two closures from the same call show up as retaining a multi-megabyte buffer when only one of them mentions the buffer by name.

Answer: the environment record is per activation, not per captured name. If the outer function has a local `payload` and a local `id`, and one returned function uses only `id`, a typical implementation still retains the whole environment, including `payload`, while that function lives. The fix is to split the functions into separate outer calls, or to copy `id` into a small inner function whose environment does not include `payload`. Confirm with the snapshot: the retainer edge runs from the function to the environment to the buffer. V8 can sometimes optimize an environment, and you do not depend on that optimization to drop a sensitive buffer.

### NODE-010 — What V8 does, what Node adds, and where libuv starts

**Difficulty:** Senior

**Category:** Runtime architecture

**Question:**

"Node is single-threaded because it uses V8." Unpick that sentence for Node 20/22. Name the isolate, what V8 is responsible for, what Node puts around it, and the two libuv paths (the loop on the main thread, and the thread pool). Stop before phase order.

**Context and Constraints:**

- Main thread plus the possibility of workers, named clearly.
- The interviewer does not want a list of timers, pending callbacks, poll, check, and close.
- You may name libraries Node links besides V8 and libuv, briefly, so "Node" is not treated as a synonym of V8.

**Senior Engineer's Answer:**

V8 is the JavaScript engine. It parses and compiles JavaScript, runs it, owns the heap, and collects garbage. An isolate is V8's instance of that engine: one heap, one set of execution state, one JavaScript stack while a thread is inside it. Node creates one isolate for the main thread. Each `worker_threads` Worker gets its own isolate. V8 does not know what a file descriptor is, and it does not implement `require`.

Node is the host. It embeds V8 and provides the platform objects: `process`, the module loaders, `Buffer`, `net`, `fs`, `http`, timers, and the C++ bindings those APIs use. Node also links libraries that are neither V8 nor your code: libuv, OpenSSL for TLS and crypto, c-ares for DNS resolution APIs, llhttp for HTTP parsing, zlib for compression. When an interview answer credits V8 for HTTP keep-alive or for `fs`, it has the boundary wrong.

libuv is the I/O library under those bindings. Two paths matter, and they are both boundaries rather than a phase tour:

- The libuv event loop runs on the same thread as the isolate that owns it. Non-blocking socket I/O is polled there. While your JavaScript occupies the stack, that loop does not progress.
- A thread pool (default size 4, override with the environment variable `UV_THREADPOOL_SIZE`) runs certain blocking native calls. Filesystem operations and `dns.lookup` are the usual examples. `dns.resolve` goes through c-ares and is not the same path as `dns.lookup`. Pool threads do not run JavaScript and do not share your lexical environments. They post a completion back to the isolate's thread, which later pushes a JavaScript callback on that isolate's one stack.

So the accurate sentence is: JavaScript on a given isolate is single-threaded. The Node process is not. It has the main thread, the libuv pool, any Workers you start, and helper threads inside native libraries. Async I/O does not add a JavaScript thread. `worker_threads` does.

**Practical Implementation:**

```js
import { readFile } from 'node:fs';
import { createConnection } from 'node:net';
import { lookup, resolve } from 'node:dns';

// Pool: blocking filesystem work, then a JS callback on the main isolate.
readFile(new URL('./package.json', import.meta.url), (_err, _buf) => {});

// Pool: getaddrinfo via dns.lookup. Not a JS thread.
lookup('localhost', (_err, _address) => {});

// c-ares, not the libuv pool. Still a JS callback later, on this isolate.
resolve('localhost', (_err, _addresses) => {});

// Non-blocking socket. Polled by libuv on the main thread, not on the pool.
const socket = createConnection({ host: '127.0.0.1', port: 9 });
socket.on('error', () => {});
```

None of these callbacks run beside the current function. All of them run later on the isolate that registered them.

**Trade-offs and Alternatives:**

CPU-bound JavaScript needs another isolate (`worker_threads`) or a smaller turn. I/O-bound work usually stays on the main isolate, because the point of non-blocking I/O is that the JavaScript turns stay short. Raising `UV_THREADPOOL_SIZE` adds operating-system threads for the blocking native calls. It does not add JavaScript stacks, and it does not make socket polling faster. Whether a larger pool helps is a measurement on a workload that actually uses the pool. The default of 4 is a libuv default, not a tuned value for every service.

Putting JavaScript in a native addon moves work off the language rules and onto you: you must not touch V8 objects from a pool thread without the isolate lock, and you must not block the main thread inside the addon if the rest of the process needs the loop.

**Common Mistakes:**

- "libuv runs JavaScript on four threads." The pool runs native work. The default size is 4. JavaScript stays on the isolate.
- "All async I/O uses the thread pool." Sockets are polled on the loop thread. `dns.lookup` and `dns.resolve` are different.
- Equating V8 with Node. The module system, `Buffer`, and the event loop are Node.
- Starting a Worker per request because the sentence "Node is single-threaded" sounded like a defect. The one stack is the model. A Worker is for a second heap and a second stack you are willing to pay for.

**Senior-Level Follow-up:**

The interviewer asks which thread runs a promise reaction queued from a `net` socket's `data` handler.

Answer: the `data` handler runs on the isolate that owns the socket, which for a server created on the main thread is the main thread. The handler runs as a JavaScript turn. A promise reaction queued there is a microtask of that same agent, so it runs on that same stack, after the current stack unwinds and after Node drains the microtask queue for that turn. It does not run on the libuv pool, and it does not hop to a Worker unless the handler posts a message there. Phase order between `data` and timers is the event-loop section.

### NODE-011 — The function Node wraps around every CommonJS file

**Difficulty:** Intermediate

**Category:** Modules

**Question:**

Where do `exports`, `require`, `module`, `__filename`, and `__dirname` come from in a CommonJS file? Why is a top-level `var` not global, and why is a top-level `return` legal? Separate Node's loader from ECMAScript.

**Context and Constraints:**

- Node 20 or 22, a `.cjs` file or a `.js` file in a package whose nearest `package.json` does not say `"type": "module"`.
- The interviewer wants the wrapper, the arguments, and `this`.
- ES module equivalents are a later question. Mention them only to mark the boundary.

**Senior Engineer's Answer:**

CommonJS is a Node host feature. ECMAScript does not define `require`, `module`, or `__dirname`. Before Node executes the file, it wraps the source in a function roughly of this shape and calls it:

```js
(function (exports, require, module, __filename, __dirname) {
  // the file's source is the body
});
```

The call sets `this` to the same object passed as `exports`. That object starts out as `module.exports`. `__filename` is the resolved absolute path of the file. `__dirname` is the directory of that path. `require` is the loader function, with `require.resolve`, `require.cache`, and `require.main` attached. Those names are parameters. They are local bindings of the wrapper, which is why a CommonJS file can read them without declaring them, and why an ES module cannot: an ES module has no wrapper and no such parameters.

Because the body is a function, top-level `var` and `function` declarations bind in the wrapper's variable environment. They are not properties of `globalThis`. Top-level `return` returns from the wrapper. It does not automatically assign `module.exports`. Top-level `await` is a syntax error in CommonJS, because this is not a module context and the wrapper is not an `async` function. Top-level `await` is an ES module feature, specified by the language.

The wrapper is sloppy mode unless the file begins with `'use strict'`. That is why an accidental implicit global is possible in CommonJS and impossible in an ES module, which is strict by spec.

`exports` and `module.exports` start as the same object. `exports.foo = 1` mutates that object. `module.exports = somethingElse` rebinds the module's export to a new value and leaves the parameter `exports`, and `this`, pointing at the original object. Callers of `require` receive `module.exports`, not the original object you orphaned. That aliasing rule is Node. It is the source of "I assigned `exports = ...` and the caller got an empty object."

**Practical Implementation:**

```js
// identity.cjs
console.log(this === exports && exports === module.exports); // true at start

exports.label = 'mutated';

const replacement = { label: 'replaced' };
module.exports = replacement;

console.log(this === module.exports); // false; this stayed on the original object
console.log(exports.label); // 'mutated'
// require('./identity.cjs') returns replacement, { label: 'replaced' }
```

Reassigning `module.exports` inside a factory is fine when the whole export is a function or a class. After that reassignment, further `exports.foo = ...` writes the orphan object and is invisible to callers. Set properties on `module.exports` after the reassignment, or mutate `exports` only when you never reassign.

**Trade-offs and Alternatives:**

Exporting a single function (`module.exports = function create() {}`) is the CommonJS pattern for a constructor or a factory. Exporting a bag of named properties (`exports.read = ...`) is the pattern for a namespace. Mixing them in one file is how the alias bug appears. An ES module replaces the bag with `export function read` and the single function with `export default`, and it has no `exports` alias. `import.meta.dirname` is the later question's replacement for `__dirname`.

**Common Mistakes:**

- Treating `__dirname` as a language keyword. It is a parameter Node injects. Shadowing it with a local `const __dirname` hides the parameter.
- Assigning `exports = { a: 1 }` and expecting callers to see `a`. That rebinds the parameter. `module.exports` is unchanged.
- Assuming top-level `var config` in CommonJS is shared with other files through the global object. Other files see it only if you put it on `module.exports` or `globalThis`.
- Putting top-level `await` in a CommonJS file because it worked in an `.mjs` file next door.

**Senior-Level Follow-up:**

The interviewer asks what `require.main === module` is testing, and whether the wrapper is involved.

Answer: Node sets `require.main` to the module object of the entry script. Inside that entry file, `module` is the same object, so the comparison is true. Inside a file that entry later `require`d, `module` is the dependency, so the comparison is false. People use it to run a CLI path only when the file is the process entry. The wrapper is what provides the `module` and `require` bindings the test uses. It is a Node convention, not an ECMAScript one. The ES module counterpart, `import.meta.main`, exists only on newer patch lines (added in Node 22.18 and 24.2). It is absent on Node 20 and on early Node 22, so a Node 20 library cannot call it.

### NODE-012 — require.cache is one module object, not a value snapshot

**Difficulty:** Senior

**Category:** Modules

**Question:**

Explain `require.cache` in Node 20/22. What is the key, what is stored, what do later `require` calls return, what does `delete require.cache[id]` actually reset, and what does the ES module loader refuse to do? A test suite reloads a module and still sees the old singleton. Why?

**Context and Constraints:**

- CommonJS modules you control, plus one consumer that already required them.
- Node 20 or 22. ESM is in the discussion only as the contrast: it has its own module map.
- No claim that deleting the cache is a production hot-reload strategy.

**Senior Engineer's Answer:**

The first time Node loads a CommonJS file, it creates a module object, puts that object in `require.cache`, and then runs the wrapper. The cache key is the resolved absolute filename, the same string `require.resolve` returns for that file. Core modules are cached too.

The cache stores the module record, including `module.exports`. A later `require` of the same resolved filename returns that same `exports` value and does not run the file again. If `exports` is an object and the module mutates it after the first load — a counter increment, a `push`, a property write — every caller that holds the object sees the mutation, because they share the object. That is cache identity. It is not an ECMAScript live binding. A caller that copied a field out (`const { n } = require(...)` when `n` is a number, or `const n = require(...).n`) has an ordinary JavaScript copy of the value at that moment. Later writes to the exports object's property do not update the copy.

The cache entry is inserted before the wrapper finishes, so a cycle can `require` the partial exports object. Cycles are the next module question. The point for this question is that the cache is what makes the cycle observe one object rather than two.

`delete require.cache[require.resolve('./store.cjs')]` removes the record. The next `require` creates a new module object and runs the file again. Any closure, object, or test that already captured the old `exports` keeps the old object. Deleting the cache does not walk the graph and does not update those holders. It also does not evict a different resolved path. Two paths that resolve to the same filename share one entry. Two filenames that happen to contain the same source, such as a file copied into another directory, are two entries.

ES modules do not use `require.cache`. Node documents that `import` has a separate module map. Loading the same module URL again returns the already evaluated module namespace. There is no supported `delete` for that map in Node 20/22. `import()` is not a reload API. A test that needs a fresh ES module graph needs a fresh process, or a loader hook you own and can justify. Query-string cache busting is not the contract of the default file loader.

**Practical Implementation:**

```js
// store.cjs
let hits = 0;
function hit() {
  hits += 1;
  return hits;
}
module.exports = { hit, get hits() { return hits; } };
```

```js
const id = require.resolve('./store.cjs');
const first = require('./store.cjs');
first.hit();

const second = require('./store.cjs');
console.log(second.hits); // 1, same module object
console.log(first === second); // true

delete require.cache[id];
const third = require('./store.cjs');
console.log(third.hits); // 0, the file ran again
console.log(first.hits); // 1, the old record is still alive in `first`
console.log(first === third); // false
```

A test that imported `first` at the top of the file, then deleted the cache, is still holding `first`. Reset the bindings the test actually uses, or require again after the delete and pass that object into the code under test.

**Trade-offs and Alternatives:**

A singleton in module scope is a reasonable process-wide cache when one instance is the point: a connection pool, a config object loaded at startup. It is the wrong place for per-test mutable state. Inject the dependency, or construct it in a function, and the test does not have to fight the cache.

`delete require.cache` in production, as a reload, leaves old listeners and old timers in place whenever anything retained the old exports. The process then runs two copies. A controlled restart, or a Worker you can terminate, has a defined lifetime. Native addons (`.node`) are also cached; deleting the JS cache entry does not unload native code.

**Common Mistakes:**

- Saying `require` returns a deep copy of the exports. It returns the cached `module.exports` value.
- Deleting one cache key and expecting every transitive dependency to re-run. Children stay cached until their own keys are deleted, and their order of deletion matters if they captured each other.
- Looking for `require.cache` inside an ES module test and concluding the module "isn't cached." It is cached in the ESM module map.
- Using the cache delete as a hot reload in a server and leaking the previous `module.exports`, which still holds sockets.

**Senior-Level Follow-up:**

The interviewer asks why two tests in one process see a shared connection count even though each test called `delete require.cache` on the service file.

Answer: the service file was re-executed, and the database module it requires was not. The service's new instance called `require('./db.cjs')` and received the cached db module, whose pool was created on the first test. The cache key to delete is the resolved id of the module that owns the state, and of anything that captured it, before the code under test runs. If the test file itself did `const db = require('./db.cjs')` at load time, that binding is the old object for the whole test file. In a large suite, a subprocess per test file is the boundary that actually resets both the CommonJS cache and the ESM module map. Deleting keys is a scalpel for one record you can name.

### NODE-013 — ESM live bindings and the CommonJS exports object are different mechanisms

**Difficulty:** Senior

**Category:** Modules

**Question:**

Show, with code the interviewer can run on Node 22, the difference between an ES module live binding, a CommonJS shared exports object, a destructured copy, and a named `import` of a CommonJS export. Say which piece is ECMAScript and which piece is Node's interop.

**Context and Constraints:**

- Node 20 or 22, native loader. No Babel, no Webpack, no TypeScript transpilation in the path.
- The ES module uses `export let`. The CommonJS module assigns `module.exports`.
- The answer must not claim that `require` "snapshots the module" or that a named CJS import is a live binding.

**Senior Engineer's Answer:**

An ES module export binding and an import binding are linked by the ECMAScript module loader. `export let n` creates a binding in the module environment. `import { n } from './counts.mjs'` creates a local binding that reads that export. When the exporter assigns `n`, the importer's next read sees the new value. The importer cannot assign to `n`. The import binding is immutable from the importer's side, like a `const` that someone else is allowed to write through the export. This link is the language feature people mean by "live bindings." It is not Node-specific. Browsers do the same thing.

CommonJS has no import binding. `require` returns the `module.exports` value stored on the cached module object. If that value is an object, later mutations of its properties are visible to anyone who still holds the object, because it is one object. If the CommonJS module does `let n = 0; module.exports = { n }`, the object property `n` received the number `0` at the moment of the object literal. Reassigning the local `n` does not write the property. A getter on the exports object (`get n() { return n; }`) is an ordinary JavaScript getter, and it can present a live view. That getter is your code, not a module link.

Destructuring is a copy at the time the destructuring pattern runs. `const { n } = require('./counts.cjs')` initializes a local `n` with the current property value. It does not track the property.

Node's ESM loader can also import a CommonJS module. The default import is `module.exports`. That part is reliable. Named imports are a Node interop heuristic: the loader statically analyzes the CommonJS source and, for the names it recognizes, copies those values onto the module namespace when the module is imported. Assignments of the form `exports.name = ...` and `module.exports.name = ...` are the shapes that analysis is built to see. A key that appears only inside `module.exports = { snapshot: n }`, or only on a getter, or only after a computed assignment, may be invisible to it. A named import of a name the analysis missed throws `SyntaxError` at load time. The default import of that same file still yields the object.

Node's documentation states that later writes to `module.exports`, and new properties added later, are not reflected in the named imports that were copied. So when `import { n } from './counts-named.cjs'` succeeds, `n` is a copy performed by the interop layer. `import counts from './counts-named.cjs'` followed by `counts.n` reads the object and does see later property writes. This analysis is Node. It is not the ECMAScript live-binding rule, and a bundler that honors a Babel `__esModule` flag is doing a third thing. Node's native loader does not unwrap `__esModule` to invent a default. The default is `module.exports`.

**Practical Implementation:**

```js
// counts.mjs
export let n = 0;
export function inc() {
  n += 1;
}
```

```js
// main.mjs
import { n, inc } from './counts.mjs';

inc();
console.log(n); // 1 — live binding to the export
// n = 2; // TypeError: the import binding is not assignable here
```

```js
// counts.cjs
let n = 0;
function inc() {
  n += 1;
}
module.exports = {
  inc,
  get n() {
    return n;
  },
  snapshot: n,
};
```

```js
const counts = require('./counts.cjs');
const { snapshot } = counts;
counts.inc();
console.log(counts.n); // 1, via the getter, shared exports object
console.log(snapshot); // 0, copied when the object literal ran
```

```js
// counts-named.cjs — assignments the CJS export analysis can see
function inc() {
  module.exports.n += 1;
}
exports.inc = inc;
exports.n = 0;
exports.snapshot = 0;
```

```js
// importer.mjs — Node interop, not a live binding
import pkg, { n, snapshot } from './counts-named.cjs';

pkg.inc();
console.log(pkg.n); // 1, property of the shared exports object
console.log(n); // 0, copied onto the namespace at import
console.log(snapshot); // 0, also copied; nothing writes it
```

**Trade-offs and Alternatives:**

If a library needs callers to observe a changing counter, an ES module should `export` a `let` or export a function that reads it. A CommonJS library should mutate a property of the exported object, or expose a getter or a function, and document that callers must use the object rather than a destructured primitive. Exporting an object and then replacing `module.exports` later breaks holders of the old object. Mutate in place if identity matters.

A getter that closes over a large structure keeps that structure alive for the life of the exports object, which for a cached module is the process. Export the function that computes the value if you do not want the module graph to retain the last input.

**Common Mistakes:**

- "CommonJS snapshots, ESM is live," said as if `require` deep-copies the exports. `require` returns one cached value. Property writes on that object are visible. Local reassignment inside the CommonJS file is not magically reflected.
- Treating `import { name } from './file.cjs'` as a live binding. When the name is detected, Node copies it onto the namespace once.
- Expecting every key of `module.exports = { ... }` to be a legal named import. Missed names throw `SyntaxError`. Use the default import unless you have loaded the named form with `node`.
- Destructuring `const { n } = require(...)` and expecting increments to show up.
- Assuming a transpiled `__esModule` default from a bundler tutorial matches `node ./file.mjs` loading a CommonJS dependency.

**Senior-Level Follow-up:**

The interviewer reassigns `module.exports.n = 5` after an ESM named import has already copied `n`, and also after another ESM file did `import { n } from './counts.mjs'` where `counts.mjs` later does `n = 5`. What does each importer read?

Answer: the ESM importer of the ESM file reads `5` on its next access, because the import binding is linked to the export binding. The ESM named importer of the CommonJS file keeps the number that was copied onto the namespace at import time. A default importer that does `pkg.n` after `pkg.n = 5`, or after the CommonJS module sets `module.exports.n = 5` on the same object, reads `5`, because that is a property read. Three mechanisms, three results. The one to name in the answer is which binding or object each syntax actually holds.

### NODE-014 — Cycles: partial CommonJS exports, ESM temporal dead zone, and the cross-boundary error

**Difficulty:** Advanced

**Category:** Modules

**Question:**

Two modules need each other. Describe the observable result for a pure CommonJS cycle, a pure ESM cycle that reads a binding during evaluation, a pure ESM cycle that reads it only from a function called later, and a cycle that crosses `require` into ESM. Node 22 with `require(esm)` available.

**Context and Constraints:**

- You control all four files. No bundler.
- Node 22.12 or newer, or Node 20.19 or newer, so `require` of synchronous ESM is on by default. The cross-boundary case is the one that throws.
- Do not propose "just merge the files" as the whole answer. Explain the linking rules, then how you would structure the code.

**Senior Engineer's Answer:**

CommonJS cycles work because of `require.cache`. Node inserts the module object before the wrapper returns. When the second file `require`s the first, it receives the same exports object, with whatever properties have been assigned so far. Functions that were attached before the recursive `require` can already be called. Properties assigned after the recursive `require` are still at their earlier values. The classic shape is `exports.ready = false`, then the other module reads `ready` and sees `false`, then the first module sets `ready = true`. No exception is thrown. The bug is a silent partial object. Callers that use the finished module after both wrappers return see the final properties. Callers that captured a field during the cycle captured the partial value.

ES module cycles are a different algorithm, and it is ECMAScript, not a Node invention. The loader links the bindings first, then evaluates modules in an order where a module evaluates its dependencies before its own body, except where a cycle forces a module to be observed mid-evaluation. The import binding exists as soon as the modules are linked. The export binding is in the temporal dead zone until its initializer runs. A top-level read of the other module's `let` or `const` during that window throws `ReferenceError`. A function that is only called after both modules have finished evaluating reads the initialized, live binding and does not throw. The safe cycle pattern is: top level may import and may define functions; top level does not read the other module's uninitialized bindings. `export function` is initialized earlier than a `const` that calls into the other module, which is why function cycles are the ones that survive.

Crossing the boundary is a Node rule on top of those two models. A cycle in which CommonJS `require`s an ES module that, through any path, is still loading and reaches back, throws `ERR_REQUIRE_CYCLE_MODULE` when `require(esm)` is how the ESM side was entered. Node rejects that cycle because it cannot keep both the synchronous `require` contract and the ESM linking rules. Pure cycles on one side remain allowed. The practical break is to make one direction lazy: a function that `require`s or `import()`s the other module when it is called, after both have finished evaluating, instead of at the top level.

**Practical Implementation:**

```js
// ledger.cjs
exports.ready = false;
const report = require('./report.cjs');
exports.ready = true;
exports.reportSaw = report.seen;

// report.cjs
const ledger = require('./ledger.cjs');
exports.seen = ledger.ready; // false: ledger's wrapper is still on the stack
```

```js
// a.mjs — entry point. b.mjs is evaluated while fromA is still uninitialized.
import { fromB } from './b.mjs';
export const fromA = 1;
void fromB;

// b.mjs
import { fromA } from './a.mjs';
export const fromB = fromA + 1; // ReferenceError: fromA is in the TDZ
```

```js
// a-safe.mjs
import { readA } from './b-safe.mjs';
export const fromA = 1;
console.log(readA()); // 1, both evaluations have finished

// b-safe.mjs — link now, read later
import { fromA } from './a-safe.mjs';
export function readA() {
  return fromA;
}
```

```js
// bridge.cjs — on Node 20.19+ / 22.12+, this cycle throws ERR_REQUIRE_CYCLE_MODULE
require('./bridge.mjs');

// bridge.mjs
import './bridge.cjs';
```

The safe bridge imports the dependency inside the function that needs it, so the top-level graphs do not point at each other while either is still evaluating.

**Trade-offs and Alternatives:**

Merging the two modules removes the cycle and is the right call when the split was artificial. Keeping two modules and moving the read into a function preserves the file split and requires discipline: nobody "cleans up" the code by hoisting the call back to the top level. Dynamic `import()` breaks a cycle by making one side asynchronous, which pushes the dependency to a later turn. That is appropriate when the dependency is genuinely optional or late. It is a poor way to paper over two modules that are really one initialization routine, because now initialization order depends on who awaited whom, and a cycle of top-level awaits can hang.

**Common Mistakes:**

- Saying cycles always throw. CommonJS cycles throw only if your own code throws on the partial object. ESM cycles throw on a top-level read of a binding still in the temporal dead zone. Cross-boundary cycles throw `ERR_REQUIRE_CYCLE_MODULE`.
- Logging the exports object inside the cycle, seeing `ready: false`, and concluding the finished module is broken. Read it again after both files have returned.
- Fixing an ESM `ReferenceError` by switching one file to CommonJS and creating a cross-boundary cycle that throws a different error.
- Describing the ESM failure as "the cache returned a copy." The binding is linked. It is uninitialized.

**Senior-Level Follow-up:**

The interviewer asks whether `export function` on both sides of an ESM cycle can call each other from those function bodies.

Answer: yes, if the calls happen after both modules have been evaluated. Function declarations are initialized when the module is instantiated, so each side can close over the other's function binding without reading a `const` that is still in the temporal dead zone. A top-level call, in the module body, to the other module's function is still order-sensitive: the other body may not have run, and if that function reads a `let` the other body has not initialized, you get the same temporal dead zone. The rule to say out loud is: linking makes the bindings exist, evaluation initializes them, and a cycle may observe a binding between those two steps.

### NODE-015 — How Node decides a file is CommonJS or ESM

**Difficulty:** Senior

**Category:** Modules

**Question:**

Given a path, how does Node 20/22 decide whether to parse it as CommonJS or as an ES module? Cover extensions, the nearest `package.json` `"type"` field, what happens when `"type"` is absent, and the resolution differences that bite people moving a relative import from `require` to `import`. JSON imports belong in the answer only as a format edge, not as a tour of attributes.

**Context and Constraints:**

- Node 20 or 22, default loader, no custom hooks.
- Packages in `node_modules` and your own source both count.
- The answer is about classification and resolution, not about live bindings (already covered) and not about publishing a dual package (a later question).

**Senior Engineer's Answer:**

The decision is Node's. ECMAScript defines how to parse a module once the host has decided the source is a module. The host decides.

For a file URL:

- `.mjs` is always an ES module.
- `.cjs` is always CommonJS.
- `.js` follows the nearest parent `package.json`. `"type": "module"` means ES module. `"type": "commonjs"` means CommonJS. If `"type"` is absent, Node treats `.js` as CommonJS. That default is why a file that is valid ESM syntax throws `Unexpected token 'export'` in a package that never opted in.
- The nearest `package.json` is the scope boundary. A dependency's own `package.json` decides that dependency. Your application's `package.json` does not reach into it. A nested folder with its own `package.json` can flip `.js` files under that folder.

`require` and `import` then differ in how a specifier becomes a file, which is also Node:

- CommonJS `require('./dir')` can resolve a directory to `index.js`, and `require('./file')` can add `.js`, `.json`, or `.node`. `require` of an ES module is a separate, versioned feature covered later.
- ESM relative imports do not add extensions and do not load `index.js` for a directory. `import './file.mjs'` is explicit. `import './file'` fails even if `file.js` exists. Package entry points go through the `exports` (or legacy `main`) field of that package, not through Node walking the filesystem the way `require` walks it.
- `NODE_PATH` affects CommonJS resolution. It is not part of ESM specifier resolution.
- `require.extensions` is a CommonJS hook. ESM loading does not consult it. Customization hooks (`module.register`) are the Node API for ESM loading, and they are a loader topic rather than a language topic.

An `import` keyword inside a file Node classified as CommonJS is a syntax error, because the file is parsed as a script. A free `require(...)` call inside a file classified as ESM is a `ReferenceError`, because `require` is not a parameter and not a global, unless you built one with `module.createRequire`. Dynamic `import()` is available in both: it is specified for modules and Node also allows it from CommonJS, where it returns a promise and can load ESM.

JSON: as of Node 20.18.3 and 22.12.0, importing JSON is stable, and the import attribute is required: `import data from './package.json' with { type: 'json' }`. The attribute syntax is the language's import-attribute syntax. The rule that JSON modules expose only a default export, and that Node also keeps a CommonJS cache entry so the same path is not loaded twice, is Node.

**Practical Implementation:**

```js
// package.json in this folder: { "type": "module" }
import { createRequire } from 'node:module';
import data from './package.json' with { type: 'json' };

const require = createRequire(import.meta.url);

console.log(data.type); // 'module' — this .js file is ESM because of "type"
const addonOrCjs = require('./legacy.cjs'); // explicit CommonJS neighbor
```

```js
// sibling folder with no "type", or "type": "commonjs"
// require('./util') resolves util.js / util.json / util.node / util/index.js
const util = require('./util');
```

A `.js` file with `export` moved under a `"type": "module"` package must gain its file extension on every relative import. That edit is the classification change showing up as resolution, not as a new JavaScript semantic.

**Trade-offs and Alternatives:**

`"type": "module"` for the application, with `.cjs` for the few CommonJS scripts, keeps the default aligned with new code. Leaving the package on the CommonJS default, with `.mjs` for new modules, keeps old `require` resolution working. Mixing `.js` meanings in one tree without a `package.json` boundary is how a file silently changes classification when someone adds `"type"` at the root. Prefer an explicit extension (`.mjs` or `.cjs`) for files that must not follow the parent `"type"`.

`createRequire(import.meta.url)` is the supported way for an ES module to load a CommonJS file, a JSON file via `require`, or a native addon. Native addons are not loaded by ESM `import`.

**Common Mistakes:**

- Quoting a blog that says "`.js` is ESM in Node." `.js` is ESM only when the nearest `package.json` says so. The default is CommonJS.
- Omitting the extension on a relative ESM import because CommonJS allowed it.
- Setting `"type": "module"` and expecting `require` to appear as a global. It does not.
- Importing JSON without `with { type: 'json' }` on a current Node 20/22, or expecting named exports from the JSON module.

**Senior-Level Follow-up:**

The interviewer has a `package.json` with `"type": "module"` at the repo root and a `tools/package.json` with `"type": "commonjs"`. A `.js` file in `tools` uses `module.exports`. A `.js` file in `src` uses `export`. Both work. Why?

Answer: each file's nearest parent `package.json` is the scope. `tools/package.json` classifies `tools/**/*.js` as CommonJS. The root `package.json` classifies `src/**/*.js` as ESM, because no closer `package.json` overrides it. The root `"type"` does not win over a nested one, and the nested one does not leak upward. A test runner started from the repo root does not change that. The file path decides the nearest package, not the current working directory of the `node` process.

### NODE-016 — __dirname, import.meta.url, and import.meta.dirname

**Difficulty:** Intermediate

**Category:** Modules

**Question:**

A library needs the directory of the current file so it can open `./templates/email.txt` next to the source. Show the CommonJS way, the portable ESM way, and the Node-only shortcut. State the versions and the `file:` caveat. Node 20 and 22 both matter.

**Context and Constraints:**

- The library is consumed as real files on disk, not as a bundled string and not as a `data:` URL.
- Node 20.11 is the floor for one of the shortcuts. Call that out.
- `import.meta.main` is easy to over-claim. Pin its version or leave it out of the primary answer.
- Path traversal and template security are out of scope except for using the file's own directory rather than `process.cwd()`.

**Senior Engineer's Answer:**

In CommonJS, `__dirname` and `__filename` are the wrapper parameters from the module question. `__filename` is the resolved absolute path. `__dirname` is its directory. They track the file, not `process.cwd()`, so the template path stays correct when the process was started from another directory.

In an ES module those parameters do not exist. `import.meta.url` is the module's absolute URL. That object, `import.meta`, is defined for modules by the language's host meta property; the URL identifying the current module is the same idea browsers use. On Node, for a file on disk, the URL uses the `file:` scheme. You turn it into a path with `fileURLToPath` from `node:url`, then `path.dirname` if you need the directory. That pair works on every Node version that has ESM, and it is the portable form inside the Node ecosystem. It also works as the base URL for `new URL('./templates/email.txt', import.meta.url)`, which avoids string-joining paths and is the better way to address a sibling file. `new URL` yields a `file:` URL that `fs` accepts in modern Node.

`import.meta.dirname` and `import.meta.filename` are Node additions, not ECMAScript. They were added in Node 20.11.0 and 21.2.0. They exist only for `file:` modules. A module loaded from another scheme does not get them. They were still marked experimental (stability 1.2, release candidate) when they landed. They are no longer experimental as of Node 22.16.0 and 24.0.0. On Node 20 they are available from 20.11.0 onward and were not promoted out of that experimental mark on the 20 line. On Node 22, treat 22.16.0 as the version where the stability mark flipped. A library whose `engines` field allows Node 20.0 through 20.10 cannot call them. `fileURLToPath(import.meta.url)` remains the form that does not depend on that shortcut.

`import.meta.main`, the stand-in for `require.main === module`, arrived later, in Node 22.18.0 and 24.2.0. It is the wrong API to recommend for a Node 20 library or for early Node 22.

**Practical Implementation:**

```js
// templates.cjs
const path = require('node:path');
const templatePath = path.join(__dirname, 'templates', 'email.txt');
```

```js
// templates.mjs — works on Node 20 and 22, including 20.0–20.10
import { readFileSync } from 'node:fs';

const templateUrl = new URL('./templates/email.txt', import.meta.url);
const template = readFileSync(templateUrl);
```

```js
// shortcut.mjs — Node >= 20.11 or >= 21.2, file: modules only
import path from 'node:path';

const templatePath = path.join(import.meta.dirname, 'templates', 'email.txt');
```

Prefer the `new URL` form when the consumer is `fs`, because you never drop into a bare relative string. Use `import.meta.dirname` when you must hand a directory string to an API that only accepts paths, and when `engines` allows it.

**Trade-offs and Alternatives:**

`process.cwd()` is the directory the user invoked, which is the right base for a CLI's input arguments and the wrong base for a package's own templates. `path.resolve('templates/email.txt')` also uses the current working directory. Bundlers often replace `__dirname` with a string at build time; Node's loader does not. If the same source is bundled for the browser, `import.meta.url` still exists and `node:url` / `node:fs` do not, so the file read has to sit behind a Node-only entry point.

`createRequire(import.meta.url)` gives you `require` and, with it, nothing new for the directory: you already have `import.meta.url`. Using `createRequire` only to recover `__dirname` is an extra module system for one path.

**Common Mistakes:**

- Copying `__dirname` into an ES module and treating the `ReferenceError` as a Node bug.
- Using `import.meta.dirname` in a package that still supports Node 18 or Node 20.10.
- Resolving templates from `process.cwd()` and watching the path break under systemd, pm2, or a test runner whose working directory is the repo root rather than the package.
- Expecting `import.meta.dirname` on a module that was not loaded from `file:`.

**Senior-Level Follow-up:**

The interviewer asks how you would open the template if this module is imported from another ESM file three directories up.

Answer: `import.meta.url` is the URL of the module that evaluated it, the one that contains the expression, not the URL of the entry script and not the URL of the importer. A helper in `src/templates.mjs` that does `new URL('./templates/email.txt', import.meta.url)` still points at `src/templates/email.txt` when `src/index.mjs` imported the helper. `__dirname` has the same per-file behavior in CommonJS. You do not pass the entry file's directory down unless the template is an application asset that lives next to the entry, in which case the entry should compute the URL and pass it in.

### NODE-017 — require() of an ES module on Node 20.19 and 22.12

**Difficulty:** Advanced

**Category:** Modules

**Question:**

On which Node 20 and Node 22 versions can CommonJS `require` an ES module, what does it return, which graphs throw, and how do you detect support at runtime? Distinguish the experimental history from the behavior you rely on.

**Context and Constraints:**

- The caller is CommonJS. The callee is ESM, possibly with its own static `import`s.
- One variant of the callee has top-level `await`. One variant cycles back into the caller.
- The code must behave deliberately on Node 20.11 (has `import.meta.dirname`, does not have `require(esm)` on by default) as well as on Node 22.12+.
- Do not tell the interviewer this has been stable since Node 20.0.

**Senior Engineer's Answer:**

`require` of an ES module is a Node loader feature, not an ECMAScript feature. The spec has no `require`.

It is enabled by default starting in Node 20.19.0 and Node 22.12.0. Before those versions, Node 20 and Node 22 exposed it only behind `--experimental-require-module`, and without the flag `require` of ESM threw `ERR_REQUIRE_ESM`. The 20.19 and 22.12 release notes still described the feature as experimental when they removed the flag. The warning went quiet by default in 20.19.0, 22.13.0, and 23.5.0 (`--trace-require-module` still prints it). The documentation marks the feature as no longer experimental in Node 25.4.0, which is outside the 20 and 22 lines. For a Node 20/22 interview the accurate claim is: on by default from 20.19.0 and 22.12.0, still officially experimental on those release lines, and safe to use when you have read the two failure modes and you detect support.

When the load succeeds, `require` returns a module namespace object, the same kind of object `import()` would hand you, synchronously. If the ES module itself exports a binding named `module.exports` (the interop name Node added for this path), `require` returns that exported value instead of the namespace. That interop is how an ESM file presents a single CommonJS-style value to `require`.

Two graphs fail, and both failures are deterministic:

- Top-level `await` anywhere in the required ESM graph throws `ERR_REQUIRE_ASYNC_MODULE`. `require` is synchronous. An async module graph is not. The caller uses `import()` for that graph, which returns a promise. Dynamic `import()` from CommonJS is the older, spec-backed escape hatch and it works on Node versions that cannot `require` ESM at all.
- A cycle that crosses the CommonJS/ESM boundary throws `ERR_REQUIRE_CYCLE_MODULE`. Pure CommonJS cycles and pure ESM cycles keep the rules from the cycle question.

`process.features.require_module` is the runtime check. It is true when this Node binary will `require` a synchronous ESM graph. The disable switch has been named `--no-experimental-require-module` and, in later docs, `--no-require-module`. Read `node --help` on the binary you ship rather than memorizing the flag across 20 and 22 patch releases.

**Practical Implementation:**

```js
// caller.cjs
async function loadCodec() {
  if (process.features.require_module) {
    return require('./codec.mjs'); // namespace, or the module.exports export
  }
  return import('./codec.mjs');
}

function loadCodecSync() {
  if (!process.features.require_module) {
    throw new Error('codec sync load needs Node >= 20.19 or >= 22.12');
  }
  return require('./codec.mjs');
}
```

```js
// codec.mjs — synchronous graph, legal for require()
export function encode(value) {
  return JSON.stringify(value);
}
```

```js
// codec-async.mjs — require() throws ERR_REQUIRE_ASYNC_MODULE
const table = await import('./table.mjs');
export const id = table.id;
```

A synchronous caller that might see the async module should `import()` it and be async itself, instead of catching `ERR_REQUIRE_ASYNC_MODULE` and retrying. The error is a classification of the graph, not a transient failure.

**Trade-offs and Alternatives:**

`import()` is the one API that loads an async module graph and also works on older Node. It forces the caller to handle a promise. `require(esm)` keeps a synchronous factory synchronous, which matters for CommonJS hooks that cannot be async (some plugin registration APIs). The cost is the version floor and the ban on top-level `await` in that subgraph.

Keeping the shared file as CommonJS avoids the feature entirely. Callers `require` it, and ESM callers `import` the default. You give up ESM live bindings in that file. For a leaf of pure functions, that is often the smaller risk. For a package published to both audiences, the exports-map question is the one that decides, not this loader detail alone.

**Common Mistakes:**

- Claiming every Node 20 accepts `require('./file.mjs')`. Node 20.0 through 20.18 does not, unless the process was started with the experimental flag.
- Catching `ERR_REQUIRE_ESM` and `ERR_REQUIRE_ASYNC_MODULE` as if they were the same problem. One means "this Node will not load ESM via `require`." The other means "this graph is asynchronous."
- Using top-level `await` in a module you also document as `require`-able.
- Ignoring `ERR_REQUIRE_CYCLE_MODULE` and wrapping the `require` in try/catch to "break" the cycle. The cycle is still a design bug. Lazy-load one direction after evaluation.

**Senior-Level Follow-up:**

The interviewer asks what `const codec = require('./codec.mjs'); codec.encode` depends on, if `codec.mjs` has `export function encode` and also `export { encode as 'module.exports' }` is absent.

Answer: `require` returns the namespace object, so `codec.encode` is the exported function, like a property of the namespace. It is not `codec.default.encode` unless you only have a default export. If the module used `export default function encode` and no named `encode`, the function is on `codec.default` for a namespace return. If a later edit adds `export { value as 'module.exports' }`, the return value of `require` stops being the namespace and becomes `value`, and `codec.encode` breaks. That interop export is a contract change. A synchronous CommonJS caller should be written against one of those two shapes and tested on 20.19 and 22.12, not against a memory of default-interop from a bundler.

### NODE-018 — How this is chosen, including at the top of a Node module

**Difficulty:** Intermediate

**Category:** Language runtime

**Question:**

State the ECMAScript rules that set `this` for a call, then apply them to three Node-specific situations: top-level CommonJS, top-level ESM, and a class method that was detached and passed to a timer. Node 20/22.

**Context and Constraints:**

- No TypeScript compilation and no arrow-function transform. The source runs as written.
- The class may live in a CommonJS file that does not say `'use strict'`.
- The interviewer wants call-site rules, not a framework's `bind` helper.

**Senior Engineer's Answer:**

`this` is set per call, by ECMAScript, from the way the call is made. The function's lexical environment does not choose it, except for arrow functions.

- `obj.method()` uses the reference: `this` is `obj`.
- A plain call `fn()` uses `undefined` if the function is strict, and the global object if the function is sloppy.
- `fn.call(receiver)`, `fn.apply(receiver)`, and a function produced by `fn.bind(receiver)` use the receiver you passed. `bind` returns a new function whose `this` is fixed.
- `new Fn()` allocates an object and calls `Fn` with that object as `this`. Arrow functions have no `[[Construct]]` and cannot be used with `new`.
- An arrow function does not get its own `this`. The identifier `this` inside an arrow resolves lexically, in the enclosing function environment, to whatever `this` that enclosure had. A later call cannot rebind it.

Class bodies are always strict, even when the surrounding CommonJS file is sloppy. A method extracted off the instance (`const fn = obj.method; fn()`) is a plain call of a strict function. `this` is `undefined`, and reading `this.name` throws `TypeError`. That throw happens in a `.cjs` file with no `'use strict'` because the class, not the file, supplied strict mode.

Node adds two top-level cases. In CommonJS, the wrapper is called with `this` set to the original `exports` object, so at the start of the file `this === exports` and `this === module.exports`. If the file later assigns `module.exports = function () {}`, `this` still points at the original exports object. Callers receive the replacement, not `this`. In an ES module, top-level `this` is `undefined`, because a module body is strict and is not called as a method. An arrow at the top of an ES module therefore also sees `this` as `undefined`.

A timer does not set `this` to the object that created the callback. `setTimeout(obj.method, 0)` is a plain call later, on the same isolate. Pass a closure that already captured the receiver (`() => obj.method()`), or pass `obj.method.bind(obj)`. The arrow closes over `obj`. `bind` fixes `this`. They differ if `obj` is reassigned later: the arrow sees the new value of the binding, and the bound function keeps the original receiver.

**Practical Implementation:**

```js
class Box {
  constructor(name) {
    this.name = name;
  }

  label() {
    return this.name;
  }

  delayed() {
    return () => this.name; // lexical this from the delayed() call
  }
}

const box = new Box('billing');
const label = box.label;
// label() throws TypeError in ESM and in CJS: strict method, no receiver

const bound = box.label.bind(box);
console.log(bound()); // 'billing'

console.log(box.delayed()()); // 'billing'
```

```js
// top.cjs
console.log(this === exports);
module.exports = class Service {};
console.log(this === module.exports); // false
```

**Trade-offs and Alternatives:**

An arrow as a method (`label = () => this.name` as a class field) captures the instance and survives extraction. It allocates a function per instance, and it is not on the prototype, so subclasses do not share it. A prototype method plus an explicit `bind` at the subscription site allocates one bound function per subscription and keeps the method shared. For a timer or an event listener, the explicit closure or `bind` at the call site is usually the smaller surprise. Unsubscribing requires the same function reference you subscribed, so you store the bound function if you need `removeListener` later.

**Common Mistakes:**

- Thinking `obj.method` "remembers" `obj` when you pass it somewhere. The receiver is decided at the call, from the reference used at the call.
- Expecting a class method in a sloppy CommonJS file to receive the global object when detached. Class bodies are strict. The call throws.
- Using an arrow for a method that should be inherited or that should read a subclass `this`, and then wondering why `this` is the outer instance.
- Checking `this === module.exports` after a reassignment in CommonJS and treating a false result as "strict mode broke `this`." The wrapper's `this` stayed on the original exports object.

**Senior-Level Follow-up:**

The interviewer nests an arrow inside a sloppy CommonJS function that was itself called as a plain function, and asks what `this` the arrow sees.

Answer: the sloppy plain call set the outer function's `this` to `globalThis`. The arrow resolves `this` lexically, so it also sees `globalThis`. If that outer function is edited to start with `'use strict'`, or the file is converted to ESM, the same plain call sets `this` to `undefined`, and the arrow starts throwing on `this.something`. The arrow did not change behavior on its own. The enclosing call's `this` changed. That is the bug people hit when they flip `"type": "module"` and a callback that used to see the global object now sees `undefined`.

### NODE-019 — A vm context shares the isolate; a Worker does not

**Difficulty:** Advanced

**Category:** Runtime architecture

**Question:**

A plugin system needs to run user-supplied JavaScript without letting it see the host's globals, and without letting a plugin stall the HTTP server forever. Compare `vm.createContext` and `worker_threads` on Node 20/22. Say what is shared, what is copied, and what neither one is.

**Context and Constraints:**

- The host process has secrets on `process.env` and an open database handle in a module-level variable.
- Plugins are JavaScript source, not native addons.
- You are not required to design a full sandbox. You are required to refuse a false one.
- `SharedArrayBuffer` may come up. `Atomics.wait` on the main thread is allowed by Node and blocks that thread. Browsers reject it on the window agent. Say so if you mention it.

**Senior Engineer's Answer:**

`vm.createContext` creates another V8 context: a separate global object and a separate set of intrinsics, which is the right mental model for a new realm. It runs in the current isolate. Same heap, same JavaScript thread, same process. Node's documentation states that `node:vm` is not a security mechanism and must not be used to run untrusted code. The reason is practical. If the context can reach a host function, that function closes over the host environment. If you pass `process`, the plugin has `process`. Even a carefully copied global is easy to escape if any host object with methods is visible, because those methods are host functions. A plugin that loops synchronously occupies the one call stack. The HTTP server on that isolate does not progress. `vm` did not add a stack and did not add a timeout unless you enforce one yourself with the `timeout` option on a single `runInContext` call, which interrupts that script and still is not a security boundary.

`new Worker` from `node:worker_threads` starts an operating-system thread with a new isolate, a new heap, a new global, and a new call stack, plus that thread's own libuv loop. The plugin's `var` and module records are not the host's. `process.env` is not a live shared object you get for free inside the worker unless you pass it. Message passing uses the structured clone algorithm: `postMessage` copies the data graph. The host's database handle is not cloneable into a usable connection. That is the isolation you actually have: two heaps, communication by messages (or by memory you explicitly share).

`SharedArrayBuffer` is the exception that is specified by ECMAScript and implemented by the host. The buffer is shared, not cloned. `Atomics` operates on it. `Atomics.wait` blocks the agent that calls it. On Node, calling it on the main thread blocks the main JavaScript stack and the libuv loop on that thread. Browsers throw if the window agent tries. A worker may wait. Sharing a buffer with a plugin is a deliberate hole in the "separate heaps" story: both sides can mutate those bytes, and a wait on the main thread stalls the server the worker was supposed to protect.

Neither tool is a complete sandbox. A Worker can still burn CPU, allocate until the cgroup kills the process, and read the network unless you also apply an operating-system or Node permission policy around it. `resourceLimits` on the Worker (`maxOldGenerationSizeMb` and the related fields) caps that worker's V8 heap. It does not cap RSS by itself, and it does not stop an infinite loop. An infinite loop needs a policy you enforce by terminating the worker (`worker.terminate()`), which you can do because it is a separate thread. You cannot terminate a `vm` script stuck in a tight loop except via the run timeout, and you cannot get the main isolate back until that returns.

**Practical Implementation:**

```js
import { Worker } from 'node:worker_threads';

const worker = new Worker(new URL('./plugin-runner.mjs', import.meta.url), {
  workerData: { source: pluginSource },
  resourceLimits: { maxOldGenerationSizeMb: 64 },
  stdout: true,
});

const timer = setTimeout(() => {
  worker.terminate();
}, 1000);

worker.once('message', (message) => {
  clearTimeout(timer);
  // `message` is a clone. It is not a live object from the worker heap.
});
worker.once('error', (err) => {
  clearTimeout(timer);
  throw err;
});
```

```js
// plugin-runner.mjs
import { parentPort, workerData } from 'node:worker_threads';
import vm from 'node:vm';

const context = vm.createContext({
  result: undefined,
  console: { log() {} },
});
vm.runInContext(workerData.source, context, { timeout: 500 });
parentPort.postMessage({ result: context.result });
```

The worker gives you the second stack and a process you can kill. The `vm` context inside the worker gives the plugin a small global, which is useful only because the worker's module scope did not pass `process` or the database into that context. The timeout applies to that `runInContext` call. The outer `terminate` covers a plugin that escapes into the worker's own module scope. The 64 megabyte figure and the 1000 millisecond figure are policy examples for this design, not measured recommendations.

**Trade-offs and Alternatives:**

Running plugins in a separate process (`child_process` or another container) is the stronger blast radius: a native crash in a plugin does not take the main isolate with it. You pay serialization over a pipe and operating-system scheduling. A Worker is the in-process version of a second isolate, cheaper to start and able to share an `ArrayBuffer` when you mean to. `vm` alone is appropriate for trusted template expressions where the author is you, the timeout is enough, and the goal is a fresh global object rather than a security boundary.

`AsyncContext` / `AsyncLocalStorage` does not isolate code. It propagates a value along asynchronous turns on one isolate. Mentioning it here is a category error: it is a context for tracing, not a realm.

**Common Mistakes:**

- Calling `vm` a sandbox because the plugin cannot see your `const` locals. It shares the heap and the thread. Locals are hidden only until a host object leaks in.
- Passing `workerData: { db }` and expecting the worker to query. Handles do not clone into a live connection. You pass ids and let the host do the query, or you open a new connection inside the worker on purpose.
- Using `Atomics.wait` on the main thread as a "simple signal" and stalling every request.
- Setting `resourceLimits` and believing RSS, file descriptors, and sockets are capped by the same number.

**Senior-Level Follow-up:**

The interviewer asks whether code in the `vm` context can exhaust the process heap even though you passed a small `resourceLimits` to a wrapper you forgot to actually put in a Worker.

Answer: if `runInContext` runs on the main isolate, the allocation comes out of the main heap. `resourceLimits` is a `Worker` constructor option. It does nothing for `vm`. A plugin that allocates in a loop on the main isolate grows the main old generation until `--max-old-space-size` or the cgroup stops the process, and the timeout option aborts only between V8's interrupt checks, which a tight allocation loop does hit, but the memory already retained by the host is still retained. The limit has to be on the isolate that executes the untrusted code. That is the Worker, or a separate process.

### NODE-020 — Object shapes: why two { id, status } objects are not the same to V8

**Difficulty:** Advanced

**Category:** V8

**Question:**

V8 uses hidden classes (also called maps or shapes) and inline caches for property access. Explain the model at a level that changes how you write hot objects in Node 20/22. What should you say about speed, and what must you measure instead of claiming?

**Context and Constraints:**

- This is engine behavior. ECMAScript does not specify shapes or inline caches. Another engine can be different and still run the same program.
- The hot path creates many request records.
- No percentage speedups, no "megamorphic is N times slower," no specific inline-cache slot count.

**Senior Engineer's Answer:**

ECMAScript objects are just property bags with a prototype. V8, in order to compile property access into something tighter than a dictionary lookup, assigns each object a shape that describes the property names, the order they were added, and where the values sit. Objects created the same way share a shape. An inline cache at a call site remembers the shape it saw last time and the offset of the property. When the next object has the same shape, the load hits. When the site sees a small variety of shapes, it stays polymorphic and still works, with more checks. When the site sees many shapes, the cache goes megamorphic and the access falls back toward a slower lookup. The number of shapes that still counts as "a few" is a V8 parameter. You do not memorize it. You recognize the pattern in a profile.

The transitions that create new shapes are ordinary source patterns:

- Adding properties in a different order (`{ a, b }` versus `{ b, a }` as separately built objects) yields different shapes.
- Adding a property only on some objects (`if (err) record.error = err`) splits the population into two shapes.
- Deleting a property changes the shape and can push the object off the fast path onto a dictionary representation. The spec still says the property is gone. V8 additionally pays for that with a less predictable layout. Assigning `undefined` or `null` keeps the property and the shape.

None of this changes observable JavaScript except performance and except `delete` actually removing the key from `Object.keys`. Two objects with the same properties in the same order and the same prototype are interchangeable to your program. They are also interchangeable to the inline cache. That is the whole design rule: construct records in one place, with a fixed set of fields, in a fixed order.

Prototypes matter because the shape includes the prototype. A class instance and a plain object with the same fields do not share a shape. A hot function that sometimes receives a class instance and sometimes a literal will see two shapes. That is fine. A hot function that receives a new ad-hoc shape per call site is the case that shows up in profiles.

You do not promise a speedup for "I initialized all fields." You make the shapes stable, then you look at a CPU profile or V8's logs if the path is hot. If it is not hot, stable shapes are still the clearer code and you stop there.

**Practical Implementation:**

```js
function createRequestRecord(id) {
  return {
    id,
    status: 'open',
    retries: 0,
    error: null, // present on every record, so the shape does not depend on failure
  };
}

function fail(record, error) {
  record.status = 'failed';
  record.error = error; // assignment, same shape
  return record;
}

function forget(record) {
  record.status = 'dropped';
  record.error = null; // keep the key; do not delete it
  return record;
}
```

A JSON payload parsed with `JSON.parse` gets a shape from the keys in the order they appear in that text. If upstream objects shuffle key order, parsed records will not share a shape. Mapping each payload through `createRequestRecord` gives the rest of the process one shape regardless of key order on the wire.

**Trade-offs and Alternatives:**

A `Map` is the right container for a genuinely dynamic set of keys, and it does not pretend to have one shape. A class with declared fields documents the shape in the syntax and allocates the fields on the instance. A dictionary-style object that grows arbitrary plugin keys is honest as a dictionary and should not be the object you read in a tight loop; copy the keys you need into a fixed record once.

Deleting keys is still correct when the set of keys is part of the data, such as a patch object you must not confuse with "set this field to `undefined`." On that path, semantic honesty beats the inline cache. The hot record and the patch object can be different types.

**Common Mistakes:**

- Quoting a multiple ("hidden classes make it 10x faster") with no profile on this Node version.
- Reciting an exact polymorphic limit. It is an implementation parameter.
- Using `delete` to clear a field on every request object in a hot list.
- Mixing property order in object literals that are meant to be the same type, then looking for the cost in the algorithm rather than in the shapes.

**Senior-Level Follow-up:**

The interviewer asks whether TypeScript interfaces give V8 the shape.

Answer: no. TypeScript erases interfaces and types before Node sees the file. V8 sees the objects you actually build at run time. A TypeScript type can help you keep one constructor in the source, and that constructor is what stabilizes the shape. An `as RequestRecord` cast on a loosely built object changes nothing about the shape V8 assigns. The engine never reads the `.ts` file.

### NODE-021 — Microtasks, process.nextTick, and the end of a turn

**Difficulty:** Senior

**Category:** Execution model

**Question:**

After the current JavaScript stack unwinds, in what order do promise reactions, `queueMicrotask`, and `process.nextTick` run on Node 20/22? Why is the order at the top of an ES module different from the order at the top of a CommonJS file and different again inside a timer? Do not draw libuv phases. Say what is spec and what is Node, and say what Node now recommends instead of `nextTick`.

**Context and Constraints:**

- Node 20.18+ and 22.7+ changed the stability of `process.nextTick`. Include that.
- The answer must match Node's documented queue rules, including the ESM evaluation case.
- `setTimeout` may appear only as "a later turn," not as a phase.
- No claim that `nextTick` always beats promises in every file.

**Senior Engineer's Answer:**

ECMAScript jobs for promises run to completion, one job at a time. A promise reaction (the function you passed to `.then`, `.catch`, or `.finally`) is one of those jobs. `queueMicrotask` is a host API, originally from the HTML spec and implemented by Node, that queues a function on the same microtask queue Node uses for those reactions. Relative order between a reaction and a `queueMicrotask` callback is the order they were queued. Neither runs while the current stack is still running. The executor passed to `new Promise` is the exception people forget: it runs now, on the current stack, before `new Promise` returns.

`process.nextTick` is not an ECMAScript job. It is a Node queue. Node drains that queue fully after the current operation on the JavaScript stack finishes, and then drains the microtask queue. A callback queued with `nextTick` from ordinary synchronous code therefore runs before promise reactions queued from that same synchronous code. If a `nextTick` callback queues another `nextTick`, the queue keeps draining. A recursive `nextTick` can postpone I/O indefinitely. That starvation warning is Node's, and it is the reason the API is a sharp tool.

There is a documented exception. If the current code is already running as part of microtask processing, Node does not interrupt that drain to jump back to `nextTick`. ESM module evaluation runs that way. At the top level of an ES module, a promise reaction and a `queueMicrotask` callback queued during evaluation run before a `process.nextTick` callback queued during the same evaluation. At the top level of a CommonJS module, evaluation is the synchronous wrapper call, so the usual order holds: `nextTick`, then the microtask queue. Inside a later timer callback, whether the file is ESM or CommonJS, the timer turn is the "current operation." After it returns, Node drains `nextTick`, then microtasks.

Node marked `process.nextTick` as Legacy in 20.18.0 and 22.7.0, and the docs say to use `queueMicrotask` instead for new code. `queueMicrotask` is the portable queue (Node and browsers). `nextTick` still has a use when you need the specific "before any I/O, and before microtasks, and allow the caller to attach listeners first" behavior that Node's own documentation shows for constructors. New application code that only means "after I return" should queue a microtask, or return a promise.

`setTimeout` and `setImmediate` schedule later turns. Their order relative to each other is an event-loop question and stays in that section. The fact used here is only that neither runs before the microtasks of the current turn.

**Practical Implementation:**

```js
// order.cjs — top level is a normal synchronous turn
const { nextTick } = require('node:process');

const out = [];
Promise.resolve().then(() => out.push('promise'));
queueMicrotask(() => out.push('microtask'));
nextTick(() => out.push('nextTick'));
queueMicrotask(() => console.log('cjs top', out.join(',')));
// cjs top nextTick,promise,microtask
```

```js
// order.mjs — evaluation itself runs during microtask processing
import { nextTick } from 'node:process';

const out = [];
Promise.resolve().then(() => out.push('promise'));
queueMicrotask(() => out.push('microtask'));
nextTick(() => out.push('nextTick'));
setTimeout(() => console.log('esm top', out.join(',')), 0);
// esm top promise,microtask,nextTick
```

```js
// later turn, either module format
import { nextTick } from 'node:process';

setTimeout(() => {
  const out = [];
  Promise.resolve().then(() => out.push('promise'));
  queueMicrotask(() => out.push('microtask'));
  nextTick(() => out.push('nextTick'));
  setTimeout(() => console.log('timer turn', out.join(',')), 0);
  // timer turn nextTick,promise,microtask
}, 0);
```

The `setTimeout` used to print is only a later turn that reads the array after the queues have drained. It is not a statement about timer phases.

**Trade-offs and Alternatives:**

A promise is the right signal when the caller needs a result or an error. `queueMicrotask` is the right signal when you must defer a side effect and you do not want a promise allocation or a Node-only API. `nextTick` remains in existing Node code and in APIs that must let the caller subscribe before the first event. Adding a new recursive `nextTick` pump is how a process stops reading sockets. If you need to yield so I/O can run, `nextTick` is the wrong yield: it is drained before the loop continues. That yield is `setImmediate` or a timer, and the choice between them belongs to the event-loop section.

**Common Mistakes:**

- Memorizing "nextTick, then promises" and applying it to the top of an ES module, where Node's documented order is the reverse.
- Treating `queueMicrotask` and `process.nextTick` as aliases. They are different queues. On current Node, `nextTick` is Legacy.
- Running work in a promise executor and believing it was deferred. The executor is synchronous.
- Using a recursive `nextTick` to "avoid blocking," and starving the isolate of I/O.

**Senior-Level Follow-up:**

The interviewer asks which queue `await` uses, and whether `await` inside an ES module top-level body changes the `nextTick` story.

Answer: `await` schedules the continuation as a promise reaction, so it is a microtask, specified by ECMAScript. Top-level `await` means the module's evaluation suspends and resumes as part of that same module-evaluation microtask processing. A `process.nextTick` queued before the `await` is still the ESM case: it does not jump ahead of microtasks that are already the current drain. A `nextTick` queued from a later timer still uses the normal "after this turn, nextTick, then microtasks" order. The module format does not brand every function in the file. The question is whether you are already inside the microtask drain.

### NODE-022 — What async and await do to the one call stack

**Difficulty:** Senior

**Category:** Execution model

**Question:**

Explain `async` / `await` as a control-flow transform on the single call stack. Predict the log order. Say what is allocated, when the continuation runs, and what `await` does with a non-promise. ECMAScript rules, hosted by Node 20/22. No libuv phases.

**Context and Constraints:**

```js
async function label(tag) {
  console.log(tag, 'before');
  await null;
  console.log(tag, 'after');
}

console.log('start');
const pending = label('A');
console.log('end');
```

- The interviewer may also ask where a `throw` before the first `await` goes, and what a long stretch of synchronous code inside the async function does to other callbacks.

**Senior Engineer's Answer:**

An `async` function is a function that always returns a promise. Calling it pushes a normal function execution context on the current stack. It runs synchronously until it returns, throws, or reaches an `await`. There is no second stack and no parallel body.

`await` evaluates its operand, then applies the promise-capability resolve operation (`PromiseResolve`), so a non-promise is wrapped as a fulfilled promise and a thenable is assimilated. The continuation — the rest of the function — is scheduled as a reaction on that promise. The async function then suspends and returns its own promise to the caller. The caller's frame continues. In the snippet, the order is `start`, `A before`, `end`, and then `A after`. `await null` still yields. The continuation does not run before `label` returns, and it does not run before `console.log('end')`. The reaction is a microtask, so it runs after the current stack unwinds, under the microtask rules from the previous question. Node does not special-case `await` to run the continuation synchronously for a fulfilled promise.

Each suspension drops the async function's frame. The locals live in the async function's state, retained by the promise machinery, not in a stack frame that stays pushed. When the reaction runs, a new turn pushes the continuation. A stack trace taken inside `A after` does not include the original caller, unless the caller awaited `label` and you are looking at an async stack that V8 stitched together. `Error.stack` async stitching is a V8 feature, not an ECMAScript guarantee. `Error.cause` and explicit context are the portable way to keep a request id.

A `throw` before the first `await`, or a rejected await, rejects the promise `label` returned. It does not throw synchronously out of the call to `label`. The caller sees a rejected promise. If nobody handles it, Node reports an unhandled rejection. `try/catch` around the call to `label()` does not catch that rejection. `try/catch` inside `label`, or `await` plus `try/catch` in the caller, or `.catch` on the returned promise, does.

Synchronous work inside `label`, before the first `await` or between awaits, occupies the one stack exactly like any other function. `await` is not a yield to the operating system. It is a yield to the host's microtask queue, and only at the `await` points.

**Practical Implementation:**

```js
async function label(tag) {
  console.log(tag, 'before');
  await null;
  console.log(tag, 'after');
}

console.log('start');
const pending = label('A');
console.log(pending instanceof Promise); // true
console.log('end');
// start / A before / true / end / A after

async function failFast() {
  throw new Error('sync-looking');
}

const rejected = failFast();
rejected.catch((err) => {
  console.log(err.message); // sync-looking, delivered as a rejection
});
```

If the caller needs the result before it continues, it must be async too and `await pending`, or use `.then`. That `await` in the caller is another suspension of the caller, not a nested thread.

**Trade-offs and Alternatives:**

`async`/`await` is the right default when the steps are sequential and the errors should be exceptions on that promise. `Promise.then` chains are the same microtask machinery with worse local control flow, useful when you are returning a thenable from a library that cannot be `async` for API reasons. A callback API is what Node's older `fs` functions use; wrapping them in `fs.promises` or `util.promisify` gives you a promise at the boundary so the rest of the function can `await`. Mixing a callback that throws with an async function that rejects is how errors bypass the `catch` you wrote. Pick one error channel per function.

A tight loop that `await`s a resolved promise every iteration yields every iteration and still does not move work off the isolate. It schedules a microtask per step. If the goal is to let I/O run, measure that pattern; if the goal is CPU throughput, remove the `await` or move the loop to a Worker.

**Common Mistakes:**

- Expecting `await null` or `await Promise.resolve()` to keep running synchronously. The continuation is always a later reaction.
- Wrapping `label()` in `try/catch` and missing the rejection.
- Describing `async` as "running in the background." The parts between awaits are ordinary stack frames on this isolate.
- Assuming `pending` is the return value of the `return` statement inside `label`. It is a promise for that value. The caller reads it with `await` or `.then`.

**Senior-Level Follow-up:**

The interviewer puts `await label('B')` inside an async `main` and asks whether `B after` can run before `main`'s next line, and whether a `readFile` callback can run between `B before` and `B after`.

Answer: `main` suspends at `await label('B')`. `label` runs until its own `await`, suspends, and returns a promise. `main`'s continuation waits on that promise. `B after` runs as `label`'s continuation, then settles `label`'s promise, which schedules `main`'s continuation. So `main`'s next line runs after `B after`, as a later microtask, still on the same stack, never overlapping. A `readFile` callback is not a microtask. It runs on a later I/O turn. It can run after the current stack has unwound and after the microtasks already queued, if the file completion is ready, including between `B before` and `B after` if `label` has suspended and no earlier microtask is `B after` itself. `B after` is already the microtask that follows `await null`, so it runs before I/O callbacks queued for a subsequent turn. The precise interleave with I/O is the event-loop section. The stack answer is the one to lock here: one frame at a time, continuations are later turns, `await` on `label` orders `main` after `label` without nesting their frames for the whole duration.

### NODE-023 — Stack overflow, --stack-size, and proper tail calls

**Difficulty:** Advanced

**Category:** Execution model

**Question:**

A recursive tree walk throws `RangeError: Maximum call stack size exceeded` on Node 22. Explain the limit, the relationship to the ECMAScript proper-tail-call rule, and what you change in the program. Do not quote a maximum frame count.

**Context and Constraints:**

- The walk is a plain synchronous function on the main isolate. It is not `async`.
- The tree can be deeper than any fixed recursion budget you would like to assume.
- V8 does not implement proper tail calls. The spec's rule and the engine's behavior both belong in the answer.
- `--stack-size` may be named. Its default is not to be recited.

**Senior Engineer's Answer:**

Each call pushes a function execution context. The stack is a finite region owned by V8 for that isolate's thread. When the next frame does not fit, V8 throws `RangeError: Maximum call stack size exceeded`. The limit is not an ECMAScript constant. It depends on the size of the stack and the size of each frame, and frame size depends on the function (locals, arguments, whether it is optimized). A recursion that survives on a small fixture can throw on a deep production tree. You do not publish "it handles 10,000 frames" unless you measured that build, and even then the number moves if the function changes.

ECMAScript specifies proper tail calls in strict mode: a call in tail position should reuse the current frame, so a tail-recursive function uses constant stack. That is a language requirement on paper. V8 does not implement it. Node, because it uses V8, does not give you tail-call elimination. Strict mode, ESM, and `'use strict'` do not switch it on. Safari's engine did implement the spec rule; behavior is engine-dependent in practice even though the spec text exists. Code you ship on Node must not rely on it.

`--stack-size` is a V8 flag, in kilobytes, which Node forwards. Raising it makes deeper recursion succeed and makes each thread reserve more stack. Workers have their own stacks; `resourceLimits.stackSizeMb` is the worker knob. Raising the limit is a containment for a bounded tree you understand. It is not the fix for a walk of untrusted depth, because the depth is data.

The program change is to stop using the call stack as the walk stack. An explicit heap-allocated stack (an array of nodes) keeps the JavaScript call depth constant and lets the walk be as deep as the heap allows. The heap limit is the one you already reason about with `--max-old-space-size`, and a too-deep tree then fails as memory exhaustion you can attribute, or you can reject a depth you refuse to process. Mutual recursion (`a` calls `b` calls `a`) consumes frames the same way. A trampoline (each step returns a thunk, an outer loop calls it) also keeps call depth constant. It is more machinery than a loop with an explicit stack, and it is justified when the control flow is a generated state machine rather than a tree walk.

`async` recursion is a different leak. Each `await` returns, so you may not blow the stack, and you may instead build a chain of promises as deep as the tree. That chain is heap. It is not a solution to a deep walk.

**Practical Implementation:**

```js
function walkRecursive(node, visit) {
  visit(node);
  for (const child of node.children) walkRecursive(child, visit);
}

function walkHeap(node, visit) {
  const stack = [node];
  while (stack.length > 0) {
    const current = stack.pop();
    visit(current);
    for (let i = current.children.length - 1; i >= 0; i -= 1) {
      stack.push(current.children[i]);
    }
  }
}
```

`walkHeap` uses a constant JavaScript call depth aside from `visit`. If `visit` itself recurses, the stack is back. Children are pushed in reverse so a preorder visit matches the recursive version's left-to-right order.

**Trade-offs and Alternatives:**

Recursion is the clearer code when the depth is structural and small: a parser of an expression you bounded, a directory walk you have already capped. The explicit stack is the clearer code when the depth is user data. Raising `--stack-size` is an operational patch while you rewrite, and it must be set on every process and worker that runs the recursive function. Splitting the walk across Workers does not help a single deep chain; the deep chain is inherently sequential. It helps independent subtrees, which is a concurrency question for a later section.

**Common Mistakes:**

- Saying "JavaScript engines optimize tail calls, so this recursion is safe." V8 does not. Node does not.
- Citing a frame count from another machine or another function.
- Rewriting the function as `async` to "clear the stack" and building a promise chain as deep as the tree.
- Catching the `RangeError` and retrying the same recursion. The shape of the data has not changed.

**Senior-Level Follow-up:**

The interviewer rewrites the recursive function so the recursive call is in tail position, adds `'use strict'`, and asks why the `RangeError` remains.

Answer: the call is in the position the spec would require a proper tail call, and the function is strict, so a conforming implementation of that spec rule would reuse the frame. V8 does not implement the rule, so the frame is still pushed and the same `RangeError` is still thrown once the stack region is full. ESM being strict does not change the engine limitation. The heap walk is the version that stays within the stack on Node. If you need evidence on a given binary, a small recursive tail call that counts until it throws is enough to show the frames are not being reused. You still do not treat that count as a budget.

### NODE-024 — WeakRef and FinalizationRegistry do not close resources

**Difficulty:** Advanced

**Category:** Memory

**Question:**

Explain `WeakRef` and `FinalizationRegistry` for a Node 20/22 service. What do they guarantee, what do they refuse to guarantee, and when is an explicit `close()` the design you want? The language feature and the Node lifetime both matter.

**Context and Constraints:**

- ECMAScript specifies both (they landed in the language with ES2021). Node implements them. They are not V8-only extensions.
- The object in question may be a cache value or a socket.
- The interviewer will reject any design whose correctness depends on a finalizer running at a particular time.
- No nursery sizes, no "finalizers run after N milliseconds."

**Senior Engineer's Answer:**

A normal binding is a strong reference. The collector cannot reclaim the object while a strong reference remains. `WeakRef` holds an object without keeping it alive. `deref()` returns the object if it has not been collected yet, and `undefined` if it has. `deref()` returning the object does not mean it will still be there on the next line after an `await`: a collection can happen on a later turn once no strong reference remains. `deref()` returning `undefined` means it is gone, or that it was collected. It does not tell you when.

`FinalizationRegistry` lets you register an object with a held value. After the object is collected, the host may call your callback with the held value. The callback does not receive the collected object. That is deliberate: handing it back would resurrect it. The callback runs on a later turn, if it runs. The language does not say when, and it does not say the callback runs before process exit. Node will not delay shutdown so your registry can flush. A finalizer that closes a socket, releases a lock, or flushes a file is a leak with extra steps.

The design that works for resources is an explicit lifetime: `open` returns an object with `close()`, the owner calls `close()` in a `finally`, and the finalizer is at most a diagnostic that notices you forgot. The diagnostic still cannot be the only closer, because it might not run.

`WeakRef` is for a cache that must not extend the lifetime of a value the application already holds. The caller holds the object strongly. The cache holds a `WeakRef` so that dropping the caller's reference allows collection, and the cache entry disappears. If the cache was the only reference, the value can be collected on the next cycle and the cache never hits. A `WeakMap` is the related structure: the key is weak, the value is strong as long as the key lives, and there is no enumeration, because enumeration would observe collection. Use a `WeakMap` when the value should die with the key object. Use a `Map` of `WeakRef`s when the key is a string and the value is the object that should be allowed to die — and delete the map entry when `deref()` returns `undefined`, or the map grows forever with empty refs.

Module scope and `require.cache` are strong. A `WeakRef` stored in a module does not keep the target alive, which is the point, and the module record itself stays alive. Do not confuse the two.

**Practical Implementation:**

```js
const cache = new Map();

function remember(key, value) {
  // `value` must be retained by the caller. The cache must not be the only owner.
  cache.set(key, new WeakRef(value));
}

function recall(key) {
  const ref = cache.get(key);
  if (!ref) return undefined;
  const value = ref.deref();
  if (value === undefined) cache.delete(key);
  return value;
}

function openSocket(name) {
  const socket = { name, closed: false };
  return {
    socket,
    close() {
      socket.closed = true; // the real release lives here
    },
  };
}
```

A registry used as a tripwire looks like this, and it is not the closer:

```js
const leaks = new FinalizationRegistry((name) => {
  console.error('socket collected without close', name);
});

function track(name, socket) {
  leaks.register(socket, name);
}
```

You `unregister` when `close()` runs, using the unregister token `FinalizationRegistry` accepts as the third argument to `register`, so a socket you closed does not later look like a leak. The log line is best-effort.

**Trade-offs and Alternatives:**

An LRU with strong refs and a maximum size has a predictable memory bound and a predictable hit rate. A `WeakRef` cache has a hit rate that depends on when V8 collects, which is a bad cache. Prefer the LRU for "remember the last N computed values" and the `WeakRef` only for "do not keep this alive on my account."

For sockets, files, and locks, `try/finally` plus `close()`, or the callback form `function withSocket(fn)` that closes after `fn` settles, is the design. `Symbol.dispose` and `using` are the language's explicit-lifetime syntax in newer ECMAScript. Where the Node version you target has them, they make the `finally` harder to forget. They still close at the end of the block, not when the collector feels like it. They are the opposite tool from `FinalizationRegistry`.

**Common Mistakes:**

- Closing sockets in a finalizer and calling that deterministic cleanup.
- Caching with `WeakRef` as the only reference and then debugging a 0% hit rate.
- Forgetting to delete `Map` entries whose `deref()` is `undefined`, and leaking the keys and the `WeakRef` objects themselves.
- Expecting a `WeakMap` to list its contents for a metrics endpoint. It is not enumerable, by design.

**Senior-Level Follow-up:**

The interviewer stores a `Buffer` in a `WeakRef` inside a module-level `Map`, drops every other reference, and asks why `arrayBuffers` might stay flat or might not, and whether the finalizer is allowed to use the buffer.

Answer: once the `Map` holds only a `WeakRef` and no strong reference remains, the buffer is eligible. It is collected on a later collection, not at the assignment. Until that collection, `deref()` can still return it and `arrayBuffers` still counts the store. After collection, `arrayBuffers` can fall and the finalizer, if it runs, receives the held value you registered — a name or an id — not the buffer. A finalizer that tries to read the buffer cannot, because it was not given the buffer. If `arrayBuffers` never falls, a strong reference remains somewhere. The snapshot, not the finalizer, tells you where.

### NODE-025 — One package, both import and require, without two copies of the state

**Difficulty:** Staff-Level

**Category:** Modules

**Question:**

You maintain a library that has a process-wide connection counter and a class callers use with `instanceof`. Some Node 22 apps `import` it. Some Node 20 apps `require` it. How do you publish it so there is one copy of that state, and what fails if the `exports` map points `import` and `require` at two different files that each keep their own counter?

**Context and Constraints:**

- Consumers run Node 20 or Node 22. You may set `engines`. You may require 20.19+ and 22.12+ if you say so.
- Native Node loader only. Bundler `__esModule` behavior is a contrast, not the target.
- No performance winner between CommonJS and ESM without a measurement on a named workload.
- The dual-package failure mode has to be concrete: two counters, `instanceof` false across the boundary.

**Senior Engineer's Answer:**

Node loads a module record per resolved URL and per loader. If `import 'lib'` resolves to `index.mjs` and `require('lib')` resolves to `index.cjs`, and those files each contain a `let connections = 0` and a `class Connection`, the process has two records. The counters increment independently. An instance created on the ESM path fails `instanceof Connection` on the CommonJS path, because they are different function objects. Static state, caches, and private symbols split the same way. That is the dual-package hazard. It shows up as soon as one process, or one test file, loads both entry points — including when your ESM entry `import`s a helper and a transitive CommonJS dependency `require`s the other entry.

The `exports` map is how Node chooses the entry. Conditions are matched in the order you wrote them, first match wins. `import` resolution considers the `import` condition. `require` resolution considers the `require` condition. Both consider `node` and fall through to `default`. Putting `"import"` and `"require"` on two files is exactly the split that duplicates state, unless those files are thin wrappers around one stateful module.

You want one module record for the stateful code.

On Node 20.19+, 22.12+, and current 22, `require` can load a synchronous ES module. A package with `"type": "module"` and an `exports` map that points both audiences at one `.js` file gives `import` and `require` the same module record, so there is one counter and one class. The graph under that file must not use top-level `await`, or `require` throws `ERR_REQUIRE_ASYNC_MODULE`. `process.features.require_module` is the check a consumer can use. State this floor in `engines`. Do not claim Node 20.0 can `require` the package.

If you still have to support Node 20.0–20.18 or Node 22.0–22.11, those binaries cannot `require` ESM without a flag. The pattern that preserves one copy of state on those versions is: put the counter and the class in one CommonJS file, and make the ESM entry import that file and re-export it. ESM `import` of CommonJS and CommonJS `require` of the same file share the CommonJS module object, so the counter is one object. The ESM file holds no state of its own. Named exports from that ESM file that are aliases of the CommonJS bindings are still the Node interop copies for the CJS named-export analysis; the default object and the class identity used via the shared exports object are what you test. The simpler long-term shape, once `engines` is 20.19 or 22.12, is the single ESM file.

The `module-sync` condition exists so a package can point synchronous consumers on a Node that implements `require(esm)` at the ESM file, and leave `default` as a CommonJS file for older Node. Use it when you are migrating and you still have the old file. Keep the mutable state in the one file both paths actually execute. A condition object that lists `module-sync` after `default` never sees it, because `default` matches first. Order is part of the contract.

Node's native loader does not implement the bundler `__esModule` convention. The default import of a CommonJS module is `module.exports`, not `module.exports.default`, even if a property named `__esModule` is present. Named imports are the static-analysis copies from the live-binding question. A test that only runs Webpack will pass a dual package that splits under `node`. Test with `node` on both an `import` entry and a `require` entry in one process, and assert counter identity and `instanceof`.

**Practical Implementation:**

```json
{
  "name": "connection-counter",
  "type": "module",
  "engines": { "node": "^20.19.0 || >=22.12.0" },
  "exports": {
    ".": "./index.js"
  }
}
```

```js
// index.js — one record, loaded by import and by require(esm)
export class Connection {}

let connections = 0;

export function opened() {
  connections += 1;
  return connections;
}

export function count() {
  return connections;
}
```

A consumer process that both imports and requires this package shares `count` and `Connection`. The test that locks the contract:

```js
// check.cjs
const viaRequire = require('connection-counter');

async function check() {
  const viaImport = await import('connection-counter');
  viaRequire.opened();
  if (viaImport.count() !== 1) {
    throw new Error('two module records: counter split');
  }
  if (!(new viaRequire.Connection() instanceof viaImport.Connection)) {
    throw new Error('two module records: class split');
  }
}

check();
```

On a current Node 22 this passes for the single-file package. The same test fails if `exports` maps `import` and `require` at two stateful files. That failure is the bug. The fix is one stateful record, not a custom `instanceof` helper that hides the split.

For a library that must still load on Node 20.11:

```json
{
  "exports": {
    ".": {
      "module-sync": "./index.js",
      "default": "./index.cjs"
    }
  }
}
```

`index.cjs` owns `Connection` and the counter. `index.js` does `import cjs from './index.cjs'` and re-exports `cjs.Connection` and wrappers that call `cjs.opened`. On old Node, `require` hits `default` and loads `index.cjs`. `import` hits `default` too if `module-sync` is not in that binary's condition set, and also loads `index.cjs`. On new Node, both hit `module-sync` only if that condition is actually consulted for both `import` and `require` on that version. Verify with the identity test above on the oldest and newest Node in `engines`. If a version's `import` condition set does not include `module-sync`, both paths still meet at `index.cjs` via `default`, which preserves the single counter. The failure mode to reject in review is an `index.js` that creates its own `class Connection` and its own `let connections`.

**Trade-offs and Alternatives:**

ESM-only with an `engines` floor is the smallest design once your consumers are on 20.19 and 22.12. You drop top-level `await` in the load path, or you accept that `require` cannot load you and you document `import()` only. CommonJS-only is the smallest design if every consumer is `require` and you do not need live bindings. A dual file with state in both is the design that looks like compatibility and fails `instanceof` in production when a logger loaded one entry and the app loaded the other.

`"exports"` also replaces the ability to `require` arbitrary files inside the package. Only the subpaths you list are public. That is a good boundary and a breaking change for consumers who reached into `lib/internal.js`. List the public subpaths. Do not add a second stateful entry "for tests."

No format is faster in this answer. Parse time, live bindings, and named-export copies are real differences. Which one dominates is a measurement on a workload, and a connection counter is not that workload.

**Common Mistakes:**

- Shipping `index.mjs` and `index.cjs` that each construct the class, and calling it dual support.
- Putting `"default"` above `"module-sync"` or `"import"` and never reaching the later keys.
- Trusting a bundler's `__esModule` default unwrap as Node's rule.
- Writing the identity test as two separate processes. Two processes should have two counters. The bug is two records in one process.

**Senior-Level Follow-up:**

The interviewer says the identity test passes, then a consumer reports that `import { connections } from 'connection-counter'` stays at `0` after `require('connection-counter').opened()` has run. The ESM file does `export { connections } from './index.cjs'`. The CommonJS file does `exports.connections = 0` and `exports.opened = function () { exports.connections += 1; return exports.connections; }`.

Answer: the class and `opened` are shared, which is why `instanceof` and the function identity passed. `connections` is a number. Node's named-export analysis copies that number onto the ESM namespace when the module is imported, and `export { connections } from './index.cjs'` re-exports that copy. `opened` writes the property on the exports object, so the next `require(...).connections` read is `1`, and the next read of the imported binding is still `0`. There is a second trap beside that one: if `opened` only increments a local `let` and the exports object was created with `connections: n`, then `require(...).connections` stays `0` too, because the property itself was a one-time copy. The live view is a function or a getter, or a property the function actually writes. Re-export a function from the ESM file, `export function connections() { return cjs.connections; }`, and extend the test to assert that its return value equals the required object's property. A passing `instanceof` does not prove a copied primitive stays coherent.

---

NODE-001 through NODE-025 are the first half of this section. The event-loop phase order, timers versus `setImmediate`, and the rest of the I/O scheduling model continue in the event-loop section, starting at NODE-051.

### NODE-026 — Strict mode is how an ES module is defined to run

**Difficulty:** Senior

**Category:** Language

**Question:**

A library author says strict mode is a linter setting, and that a CommonJS file and an ES module follow the same rules unless someone writes `'use strict'`. Explain what strict mode actually changes, which code is strict with no directive, and which code stays sloppy inside an otherwise strict module. Node 20 or 22.

**Context and Constraints:**

- One main-thread process. No bundler rewrite of the source.
- Cover language rules that are syntax errors and language rules that throw while the code is running.
- The CommonJS wrapper and top-level `this` already have their own questions. Use them only to say where the directive applies.
- The sample bindings to try are `implements`, a legacy octal, `with`, and `arguments` aliasing.

**Senior Engineer's Answer:**

Strict mode is a set of ECMAScript rules attached to a script, a module, or a function. It is in force while that code is parsed and while it runs. A linter can warn about it. The linter is not the implementation.

An ES module is strict because the language defines modules that way. No directive is required, and a nested function cannot opt back out. A class body is strict as well, including a class that appears in a sloppy CommonJS file. A CommonJS file is sloppy unless its directive prologue contains the literal `'use strict'`. The prologue is the leading string-literal statements. A `'use strict'` after any other statement is an ordinary expression, and the file stays sloppy.

Strictness is lexical. A function keeps the mode of the source it was parsed from, whichever module called it. `new Function` and indirect `eval` parse a fresh script. That script is sloppy unless the source string itself begins with the directive. Calling `new Function` from an ES module does not make the new function strict.

The rules that fail at parse time in strict code include `with`, legacy octal numeric literals such as `010`, duplicate parameter names, and future-reserved words used as bindings. `const implements = 1` is legal in a sloppy CommonJS file and a syntax error in an ES module. `0o10` is the strict-legal octal form.

The rules that throw while strict code runs include assigning to an undeclared name (`ReferenceError`, so no accidental global), `delete` of a non-configurable property such as `Object.prototype` (`TypeError`), and reading `arguments.callee` (`TypeError`). In a strict function, assigning to `arguments[0]` does not write the parameter. In a sloppy function those two are aliases: `arguments[0] = 9` changes the parameter. A strict function called with no receiver has `this` as `undefined`. That `this` rule is the one covered with call-site binding elsewhere in this set.

**Practical Implementation:**

```js
// strict-bits.mjs — the module is strict with no directive.
function strictArgs(a) {
  arguments[0] = 9;
  return a; // 1. The parameter and arguments[0] are not aliases.
}

const sloppy = new Function('a', 'arguments[0] = 9; return a;');

console.log(strictArgs(1)); // 1
console.log(sloppy(1)); // 9
```

```js
// sloppy.cjs — no directive prologue, so the wrapper stays sloppy.
function f() {
  undeclaredSloppy = 1;
}
f();
console.log(global.undeclaredSloppy); // 1

function g() {
  'use strict';
  undeclaredStrict = 1; // ReferenceError
}
```

`const implements = 1`, `with ({ a: 1 }) {}`, and `010` fail to parse in the `.mjs` file. The same `implements` binding parses and runs in the sloppy `.cjs` file.

**Trade-offs and Alternatives:**

Writing ES modules makes the strict rules the default, which removes a class of accidental globals. Shipping CommonJS means the file is sloppy until the prologue says otherwise, so a dependency that forgets the directive still creates globals when it assigns an undeclared name. `new Function` is the escape hatch that reintroduces sloppy rules inside an ES module. Use it only when you must compile a sloppy script, and put `'use strict'` in the generated source when the new function should follow module rules.

**Common Mistakes:**

- Treating `'use strict'` after a real statement as the prologue. The function or file stays sloppy.
- Expecting a nested function in an ES module to be sloppy because it has no directive. Containment in strict code makes it strict.
- Expecting `new Function('return this')()` in a module to return `undefined`. The created function is sloppy, and a sloppy call with no receiver uses the global object.
- Describing `implements` or `with` as runtime errors. In strict source they fail before any line of that file runs.

**Senior-Level Follow-up:**

The interviewer puts `'use strict'` inside one function of a sloppy CommonJS file and asks which of the file's other functions changed mode.

Answer: only that function, and functions nested inside it. The directive applies to the function whose prologue contains it. Sibling functions in the same sloppy file stay sloppy, and they can still create globals and alias `arguments`. A class declared in that same sloppy file is strict anyway, because class bodies are strict by the language definition.

### NODE-027 — The temporal dead zone is a ReferenceError at run time

**Difficulty:** Intermediate

**Category:** Language

**Question:**

A candidate says "`let` is not hoisted, so reading it early is a syntax error, like a missing brace." Explain the temporal dead zone as a runtime fact. Use `let`, `const`, `class`, a default parameter, and `typeof`. This is ECMAScript, in Node 20 or 22 or in a browser.

**Context and Constraints:**

- One file, no import cycle. Cycles that observe an uninitialized export are a separate question.
- Show a program that starts running and then throws, and a program that never starts because the source failed to parse.
- `var` and function declarations belong in the answer as the bindings that are initialized during environment creation.

**Senior Engineer's Answer:**

When an execution context is created, ECMAScript instantiates its bindings before evaluating the body. `var` bindings and function declarations are created and initialized: `var` to `undefined`, a function declaration to the function object. `let`, `const`, and `class` bindings are created and left uninitialized. From that moment until the initializer finishes, the binding is in the temporal dead zone. A read, or a write other than the initializer itself, throws `ReferenceError`.

That throw happens while the code is running. The source parsed. Lines before the read have already run. After the initializer completes, the same binding reads normally. The zone is temporal. `let x = x` throws, because the initializer's right-hand side reads `x` while it is still uninitialized. `typeof notYet` throws when `notYet` is a `let` in the temporal dead zone. `typeof` of a name that is not declared at all evaluates to `"undefined"`. Those are different lookups.

Default parameters are evaluated left to right in their own environment, and each parameter is in the temporal dead zone until its initializer finishes. `function f(a = b, b = 1) {}` throws `ReferenceError` when it is called without `a`, because `a`'s default reads `b` before `b` is initialized. The throw is at the call, not at the function's definition.

A `class` binding is in the zone until the class definition finishes evaluating. The syntax errors people confuse with this are a different step: a missing brace, a strict-mode `with`, or an illegal token means the file never runs. A temporal-dead-zone `ReferenceError` means evaluation reached that read.

**Practical Implementation:**

```js
console.log('started'); // runs

function f(a = b, b = 1) {
  return a;
}

try {
  console.log(typeof notYet); // ReferenceError, not "undefined"
} catch (err) {
  console.log(err.name);
}

let notYet = 1;
console.log(typeof notYet); // "number"

try {
  f();
} catch (err) {
  console.log('default', err.name); // ReferenceError
}
```

`var ready = ready` does not throw. The binding was initialized to `undefined`, and the initializer reads that `undefined`.

**Trade-offs and Alternatives:**

Declaring `let` and `const` at the top of the block, with the initializer on that same line, keeps the dead zone to the inside of the initializer expression. A `var` binding avoids the zone and reintroduces function-scoped leakage and the `undefined` window, which is a poor trade in a module. Splitting "declare now, assign later" is legitimate when a binding must be closed over before it is ready, and every early read has to be ready for the `ReferenceError`.

**Common Mistakes:**

- Calling the temporal dead zone a syntax error. The parser accepted the file.
- Saying `typeof` is safe for every name. It is safe for an undeclared name. It throws for an uninitialized `let`.
- Explaining a same-file `let` read with the cycle rule for ESM exports. The export cycle is the same uninitialized-binding rule applied across modules. This question is the single environment.
- Treating a `class` name as callable inside its own `extends` clause. The binding exists and is still uninitialized, so the extend expression throws if it reads the class.

**Senior-Level Follow-up:**

The interviewer writes `switch (n) { case 1: let x = 1; case 2: let x = 2; }` and asks what fails.

Answer: the parse fails, because both `let x` bindings are in one switch block and a lexical binding cannot be declared twice in the same environment. That is a syntax error, before the temporal dead zone exists. Wrapping each `case` body in its own block gives each `x` its own environment. Inside one of those blocks, a read of `x` before its initializer is the runtime `ReferenceError` from this question.

### NODE-028 — unhandledRejection and uncaughtException decide whether the process dies

**Difficulty:** Senior

**Category:** Process

**Question:**

On Node 20, a floating `async` function throws, and a `setTimeout` callback throws. Name the event each one produces, what the process does when nobody is listening, and what changes when a listener is installed. Keep this at the foundations of the process, not a framework's error middleware.

**Context and Constraints:**

- Node 20 or 22, default flags. `--unhandled-rejections` is left at its default.
- The process has no other `process.on` handlers until the answer adds one.
- Say what is ECMAScript (a rejected promise) and what is Node (the events and the exit).
- Do not draw event-loop phases. You may say "a later turn."

**Senior Engineer's Answer:**

A throw inside an `async` function rejects the promise that the function returned. The caller does not see a synchronous exception. Code after the call to that function still runs. If no handler is attached to that promise within the turn, Node emits `unhandledRejection` with the rejection reason and the promise. That event is Node. The rejection itself is ECMAScript.

Since Node 15, the default for `--unhandled-rejections` is `throw`, and Node 20 and 22 keep that default. If `unhandledRejection` is emitted and no listener is registered, Node raises the rejection as an uncaught exception and the process exits with status 1. A listener on `unhandledRejection` counts as handling for this default. An empty listener that only logs prevents the exit. The promise is still rejected. If something later attaches `.catch`, Node emits `rejectionHandled`. A `.catch` attached in the same turn as the rejection, before the turn ends, means `unhandledRejection` is not emitted at all.

A `throw` in a `setTimeout` callback, or in any other Node callback that is not inside a promise, is a synchronous exception on that turn. If it reaches the event loop, Node emits `uncaughtException` and, with no listener, prints the stack and exits with status 1. That exit overrides a `process.exitCode` you had set. A listener on `uncaughtException` suppresses that default exit. If the listener does not set `process.exitCode` and the loop later drains, the process can exit with status 0. If the loop still has work, the process stays up. The application is in an undefined state either way. The documented use of the event is synchronous cleanup and then termination. A throw from inside the `uncaughtException` listener terminates the process with a non-zero status so the handler cannot recurse forever.

`uncaughtExceptionMonitor` runs before `uncaughtException`, with an `origin` of `'uncaughtException'` or `'unhandledRejection'`. A monitor listener does not suppress the exit. `process.setUncaughtExceptionCaptureCallback` takes over the uncaught path, and while it is set the `uncaughtException` event is not emitted. The monitor still runs.

A throw in the body of an ES module, while that module is being evaluated, fails evaluation of the module. That is a load failure, not a later-turn `uncaughtException`.

**Practical Implementation:**

```js
// floating.mjs — Node 20+, default flags.
async function main() {
  throw new Error('async-boom');
}

main();
console.log('after call'); // prints. The throw rejected main()'s promise.
// No listener: unhandledRejection is raised, process status 1.
// 'after call' has already printed.
```

```js
process.on('uncaughtExceptionMonitor', (err, origin) => {
  console.error('monitor', origin, err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('rejection', reason);
  process.exitCode = 1; // this listener otherwise suppresses the default exit
});
```

Attaching `.catch` in the same turn consumes the rejection and neither event fires:

```js
const settled = Promise.reject(new Error('same-turn'));
settled.catch(() => {});
```

**Trade-offs and Alternatives:**

Letting the default `throw` mode crash the process is the right production default. A supervisor restarts a process that has left an unknown state. Installing `unhandledRejection` to log is reasonable when the listener sets a non-zero `process.exitCode` and stops accepting work. Installing it to ignore the reason keeps a known-bad process alive. `uncaughtExceptionMonitor` is the logging hook that preserves the crash. `--unhandled-rejections=warn` restores the pre-15 warning and is a migration flag, not the steady state for a Node 20 service.

**Common Mistakes:**

- Expecting `main()`'s caller to catch the `throw` with `try/catch` around the call. The caller needs `await` or `.catch` on the returned promise.
- Adding `process.on('unhandledRejection', () => {})` during debugging and leaving it there. On Node 20 that listener removes the default crash.
- Treating `uncaughtException` as a place to continue serving requests.
- Expecting `uncaughtExceptionMonitor` to replace a crash reporter that must not change process lifetime. That part is right, and it is easy to then also add `uncaughtException` and accidentally suppress the exit.

**Senior-Level Follow-up:**

The interviewer rejects a promise, attaches `.catch` inside a `setTimeout` of 0, and asks which events fire and whether the process exits.

Answer: the rejection is unhandled at the end of the turn that created it, so `unhandledRejection` fires. The later `.catch` makes Node emit `rejectionHandled`. With a listener on `unhandledRejection`, the default promotion to an uncaught exception does not happen, and the process can exit 0 once the timer has run. Without that listener, the default `throw` mode ends the process with status 1, and the timer's `.catch` may never attach.

### NODE-029 — process is one Node global, shared with node:process

**Difficulty:** Intermediate

**Category:** Process

**Question:**

A teammate says `process` is an ECMAScript built-in, like `Math`, and that an ES module must import it or the name is a `ReferenceError`. Say what `process` is, where the identifier resolves, and what the `node:process` import returns. Node 20 or 22.

**Context and Constraints:**

- Main thread. Worker copies of the environment are out of scope except as a single boundary statement.
- The question is the object identity and the global binding, not `nextTick`, signals, or the exit sequence.
- Show a shadowing example so "the name `process`" and "the global object" stay distinct.

**Senior Engineer's Answer:**

`process` is a Node host object. ECMAScript does not define it. Browsers do not have it unless some bundler inserted a shim. Node installs it on the global object of the main-thread realm. `globalThis.process` is that object, and in Node `global === globalThis`. The property is a non-enumerable accessor. Both CommonJS and ES modules resolve a free identifier `process` to that global property, so an ES module can read `process` with no import.

`import process from 'node:process'` evaluates to the same object. The named exports, such as `env`, are properties of that same object. Importing makes the host dependency visible to a reader and to a bundler. It does not create a second process object.

The identifier can be shadowed. A parameter or a local `let process` hides the global in that scope. The shadow is a different binding. The global object is unchanged. `process` exposes `on`, `once`, and `emit`: it is the process-wide event target for exit, rejections, and signals. Those events are the later questions. The object you hold is the one Node created for this process, not a copy of argv and env taken at startup.

A worker thread receives its own `process` object. That boundary matters for `process.env` and is not the main-thread identity this question is about.

**Practical Implementation:**

```js
import process from 'node:process';
import { env } from 'node:process';

console.log(process === globalThis.process); // true
console.log(env === process.env); // true

function take(process) {
  return process; // the parameter, not the global
}

console.log(take(1)); // 1
console.log(globalThis.process.pid); // still the real process
```

**Trade-offs and Alternatives:**

Relying on the free global is fine inside an application that only runs on Node. Importing from `node:process` is the better library shape, because the dependency is explicit and a non-Node test environment fails at the import instead of at a later bare `process` read. Replacing `globalThis.process` is not a supported way to fake the process. Tests that need a different pid or argv should call the functions they care about with those values passed in, or use Node's test runner facilities, rather than swapping the global.

**Common Mistakes:**

- Describing `process` as a language built-in that every JavaScript host provides.
- Importing `node:process` and expecting a snapshot of `env` or `argv`. The import is the live object.
- Shadowing `process` in a helper and then reading `process.env` inside that helper, which reads the parameter.
- Treating `global` and `globalThis` as two globals in Node. They are the same object.

**Senior-Level Follow-up:**

The interviewer deletes a local binding named `process` and asks why `pid` is still readable, then asks what `Object.keys(globalThis)` says about `process`.

Answer: a free read of `process` resolves on the global object, so `pid` is `globalThis.process.pid`. `process` is installed as a non-enumerable accessor, so `Object.keys(globalThis)` omits it. `Object.getOwnPropertyDescriptor(globalThis, 'process')` shows the getter. Enumerability and existence are different facts.

### NODE-030 — Buffer.alloc zeroes; allocUnsafe can expose leftover bytes

**Difficulty:** Senior

**Category:** Security

**Question:**

Review a helper that builds a response buffer with `Buffer.allocUnsafe` and sometimes returns it before every byte is written. Explain the security failure, the pool, and when `alloc`, `allocUnsafe`, and `allocUnsafeSlow` are each the right call. One question, Node 20 or 22. No timings.

**Context and Constraints:**

- Official Node, default `Buffer.poolSize` of 8192.
- The interviewer wants the disclosure bug and the slab sharing, not a general theory of the V8 heap.
- `new Buffer()` may appear only as the deprecated API this replaces.
- Do not quote a speedup. The Node docs say `alloc` can be measurably slower. That qualitative fact is enough.

**Senior Engineer's Answer:**

`Buffer.alloc(size)` allocates a buffer and fills it with zeroes, or with the fill value you passed. Those contents are defined. `Buffer.alloc(size, fill)` does not use the internal pool.

`Buffer.allocUnsafe(size)` allocates a buffer and does not initialize it. The bytes are unknown and may contain data from earlier use of the process: tokens, other requests, file contents. Node's own documentation states that, and it is why the method has `Unsafe` in the name. The safe use is to overwrite every index you will read or send, then expose only that filled range. `buf.write(string)` returns how many bytes it wrote and leaves the tail untouched. A short string in a longer unsafe buffer publishes that tail.

Small unsafe allocations share one slab. The pool size is `Buffer.poolSize`, 8192 by default. `Buffer.allocUnsafe`, `Buffer.from` of a small array or string, and `Buffer.concat` take their storage from that slab when `size` is less than `Buffer.poolSize >>> 1`. With the default pool size, that is a size below 4096. A 4096-byte `allocUnsafe` gets its own `ArrayBuffer`. A pooled buffer is a view: its `.buffer` is the whole slab, and `.byteOffset` is where this view starts. Reading `other.buffer` therefore reads neighboring views, including bytes another request just wrote. `Buffer.alloc` does not join this slab, so its `ArrayBuffer` is only the size you asked for.

`Buffer.allocUnsafeSlow(size)` skips the pool and still does not initialize the memory. It is the tool when a small buffer must be retained for a long time: a pooled view would keep the whole slab reachable. You still fill every byte before the buffer leaves the function.

`new Buffer(size)` is `DEP0005`. It still constructs on current Node and warns. The constructor mixed "allocate this many uninitialized bytes" with "copy this string," which is a second historical disclosure bug when the argument type varied. The supported APIs are `alloc`, `allocUnsafe`, and `from`.

**Practical Implementation:**

```js
import { Buffer } from 'node:buffer';

function frame(body) {
  const buf = Buffer.alloc(4 + body.length); // zeroed, not the pool
  buf.writeUInt32BE(body.length, 0);
  body.copy(buf, 4);
  return buf;
}

function fillAll(size, source) {
  const buf = Buffer.allocUnsafe(size);
  const written = buf.write(source); // may be less than size
  if (written !== size) {
    throw new Error('refusing to send an uninitialized tail');
  }
  return buf;
}
```

A pooled view is not a private allocation:

```js
const token = Buffer.allocUnsafe(16);
token.write('session-token!!'); // 16 bytes, this view is full
const other = Buffer.allocUnsafe(16);
const slab = Buffer.from(other.buffer); // the whole pool, not `other`'s 16 bytes
// slab contains the session token, because both views share one ArrayBuffer.
```

`Buffer.alloc(16).buffer` is a 16-byte `ArrayBuffer` and does not alias `token.buffer`.

**Trade-offs and Alternatives:**

`alloc` is the default for anything that might be logged, sent, or returned. `allocUnsafe` is justified when a profile of this process shows the zero-fill matters and the next lines overwrite the entire length. `allocUnsafeSlow` is justified when the buffer is small and long-lived and fully overwritten. Pooling buffers yourself reintroduces the same disclosure bug if a buffer is reused without a fill. `Buffer.from(string)` initializes the string's own bytes and can still be a view onto the pool, so passing `.buffer` onward has the slab problem even though the string bytes are defined.

**Common Mistakes:**

- Assuming `allocUnsafe` returns zeroes because one local run looked zero. Fresh pages often are zero. The contents are still unspecified.
- Sending `buf.buffer` from a small `allocUnsafe` or `Buffer.from` and thinking the `ArrayBuffer` is only `buf.length` bytes.
- Keeping a small pooled buffer in a cache and pinning the whole slab for the life of that cache.
- Calling `new Buffer(n)` because an old snippet did. It is deprecated, and it is the API that made this class of bug famous.

**Senior-Level Follow-up:**

The interviewer asks why `Buffer.allocUnsafe(4096)` and `Buffer.allocUnsafe(4095)` behave differently under the default pool size, and which one can reveal another buffer through `.buffer`.

Answer: the pool is used only when `size < Buffer.poolSize >>> 1`. Default `poolSize` is 8192, and `8192 >>> 1` is 4096, so 4095 is a view onto the shared slab and 4096 is a separate `ArrayBuffer`. The 4095-byte buffer is the one whose `.buffer` contains neighboring allocations. Both are uninitialized. The boundary changes if someone assigns `Buffer.poolSize` before the pool is created. Read `Buffer.poolSize` on the process you ship. Do not hard-code 4096 as a universal constant if the pool size is configurable.

### NODE-031 — JSON.parse allocates the whole value before it returns

**Difficulty:** Senior

**Category:** Memory

**Question:**

A request handler does `JSON.parse` on a large body. Describe what appears on the heap, what the peak includes besides the finished object, and what a reviver does and does not change. Node 20 or 22. No invented byte ratios.

**Context and Constraints:**

- The payload is one JSON value: an object or array large enough that allocation matters.
- `process.memoryUsage` field definitions are the earlier memory question. You may name which field moves. Do not re-teach the counters.
- The parse runs on the main thread.
- A streaming parser may be named as an alternative. Do not claim it is faster without a measurement.

**Senior Engineer's Answer:**

`JSON.parse` is a synchronous ECMAScript operation. It reads the whole input and builds the whole JavaScript value before it returns. The result is ordinary heap data: objects, arrays, strings, numbers, booleans, and `null`. It is not a `Buffer`, and it does not alias the input string's storage in any way the language lets you rely on.

Peak memory for the call includes the input and the output at the same time. If the body arrived as a `Buffer`, `JSON.parse` stringifies it (a `Buffer` is an object with `toString`, so `JSON.parse(buf)` parses the UTF-8 text). That creates a JavaScript string while the `Buffer`'s backing store is still alive, and then the object graph on top of both. After the function returns, the string and the buffer can be collected only when the caller drops them. The retained graph is whatever the caller kept. Object headers, pointers, and string representations make that graph a different size from the UTF-8 byte length. A heap snapshot is how you see the difference. There is no portable multiplier to quote.

JSON numbers are IEEE-754 binary64. Integers past `Number.MAX_SAFE_INTEGER` parse without throwing and lose precision: `JSON.parse('9007199254740993')` is `9007199254740992`. That is a correctness bug sitting next to the allocation, and it is still one number allocation, not a big-integer allocation. `JSON.parse` does not produce `BigInt`.

A reviver runs after each value has been built, children before parents, the root last. Returning `undefined` for a property deletes that property. The child value was still allocated. A reviver can make large subtrees unreachable before `parse` returns, which matters for what you retain. It does not turn the parse into a stream, and it does not avoid the peak of "input plus the values built so far."

If the graph cannot be allocated within the heap limit, treat that as a process-level failure. Do not write the handler to catch an out-of-memory condition and keep serving. Bound the body before calling `parse`, by a content-length limit or a counted buffer size chosen for this service.

**Practical Implementation:**

```js
const MAX_BODY = 1_000_000; // a product limit, not a universal constant

function parseBody(buf) {
  if (buf.length > MAX_BODY) {
    const err = new Error('body too large');
    err.statusCode = 413;
    throw err;
  }
  return JSON.parse(buf.toString('utf8'));
}
```

The reviver walks bottom-up. For `{"a":1,"b":{"c":2}}` the keys are `a`, then `c`, then `b`, then the empty string for the root. By the time the root reviver runs, the child objects exist.

**Trade-offs and Alternatives:**

Parsing one value is the right model when the handler needs the whole document and the size bound is small. A streaming parser that yields one array element and drops it is the right model when the document is a long array and the handler can work one element at a time. The win is the retained graph, not a slogan about speed. `JSON.parse` of a string you already hold is cheaper in complexity than a stream, and it is the wrong tool for an unbounded body. Rejecting over the limit before `toString` avoids the UTF-16 copy as well as the object graph.

**Common Mistakes:**

- Assuming the parsed object replaces the input string in memory while `parse` is still on the stack. Both are live until the string becomes unreachable.
- Using a reviver to "parse only two fields" and expecting the other fields never to be allocated.
- Treating a JSON number as an integer type. Values above `Number.MAX_SAFE_INTEGER` are silently imprecise.
- Catching a heap-limit failure, sending a 500, and continuing as if the isolate were healthy.

**Senior-Level Follow-up:**

The interviewer keeps the original `Buffer` in a module-level debug array "in case parse throws," including on the success path. What stays alive after a successful parse?

Answer: the buffer, because the array retains it, and therefore its backing store. The parsed object stays alive for as long as the handler retains it. The temporary UTF-16 string can be collected after `parse` returns if nothing else captured it. The debug array turns the success path into a process-lifetime copy of every body. Store a bounded hash or a length if you need a trace, or push the buffer only on the throw path and cap that list.

### NODE-032 — Read the upload handler and name what stays alive

**Difficulty:** Staff-Level

**Category:** Memory

**Question:**

Read `handleUpload`. After `handleUpload('report.bin', bytes)` returns, which objects from that call are still reachable, and which call in the same module does not retain them? The process keeps serving later uploads. Node 20 or 22.

**Context and Constraints:**

- The snippet is the entire relevant program. `bytes` is a `Buffer` the caller built for this request.
- Explain from the source. Do not invent a retained-size number, and do not recommend `global.gc()`.
- The earlier closure questions defined what a closure retains. This question is the retainer in this code.

**Senior Engineer's Answer:**

```js
import { EventEmitter } from 'node:events';

const bus = new EventEmitter();

export function handleUpload(name, bytes) {
  const copy = Buffer.from(bytes);
  function audit() {
    return copy.byteLength;
  }
  bus.on('report', audit);
  if (name.endsWith('.tmp')) {
    bus.off('report', audit);
    return 0;
  }
  return copy.byteLength;
}
```

`handleUpload('report.bin', bytes)` takes the path that never calls `bus.off`. `bus.on('report', audit)` stored `audit` in the emitter's listener list. `audit` closes over the environment of this call, and that environment holds `copy`, because `audit` reads `copy`. `bus` is a module binding. The module record stays loaded for the process, so `bus` stays reachable, so `audit` stays reachable, so `copy` stays reachable after `handleUpload` has returned.

`Buffer.from(bytes)` allocated a new initialized buffer. The leak is not uninitialized memory. The leak is that this new buffer outlived the request. Treat the rest of the activation, including `bytes` and `name`, as retained with that environment as well. V8 sometimes drops unreferenced locals. Do not depend on that optimization to release a request body. A heap snapshot is the confirmation: the path runs from the module environment to `bus` to the listener list to `audit` to `copy`.

`handleUpload('draft.tmp', bytes)` calls `bus.off('report', audit)` before returning. The listener list no longer holds `audit`. If the caller also drops `bytes`, nothing in this module keeps that call's `copy` alive, and it can be collected. The `.tmp` branch is the one that does not retain.

Each non-tmp call adds another listener. `EventEmitter`'s default max is 10. The eleventh call emits `MaxListenersExceededWarning`. That warning is a symptom of the growing listener list. Raising the max hides the symptom and keeps every `copy`.

`audit` only reads `byteLength`. The function object is still a strong reference to the environment that holds the whole buffer. `bus.once` would not fix a `'report'` event that might never fire: `once` retains the listener until the event.

**Practical Implementation:**

The handler that reports a length without retaining the body:

```js
import { EventEmitter } from 'node:events';

const bus = new EventEmitter();
const recent = [];
const RECENT_MAX = 100;

export function handleUpload(name, bytes) {
  const byteLength = bytes.byteLength;
  recent.push({ name, byteLength });
  if (recent.length > RECENT_MAX) recent.shift();
  bus.emit('report', { name, byteLength });
  return byteLength;
}
```

`emit` here is synchronous and the listener, if any, receives a small plain object. If a listener stores that object forever, the listener is the new retainer, and it retains a name and a number, not the upload.

**Trade-offs and Alternatives:**

Emitting a summary is enough for metrics. Writing the summary to a log stream moves retention into the logger, which has its own high-water mark. Subscribing per upload is the wrong shape when the subscriber is process-wide: subscribe once, at startup, to a stream of summaries. A ring buffer of summaries caps memory and drops old names. That is the right trade when the report is diagnostic. Holding `copy` is the right trade only when a later `'report'` must hash the actual bytes, and then the queue of copies needs a byte budget and a rejection path when the budget is full.

**Common Mistakes:**

- Seeing `return copy.byteLength` and concluding the buffer is gone because the function returned a number.
- Removing the `.tmp` branch and calling that the fix. That branch is the one that already drops the listener.
- Raising `setMaxListeners` and treating the warning as the bug.
- Switching `on` to `once` when `'report'` is optional. The closure lives until the event.

**Senior-Level Follow-up:**

The interviewer removes `audit`'s reference to `copy` so the function closes over `name` only, and asks whether `copy` is collectible.

Answer: not by inspection. `copy` is still a local of the same activation as `name`. Engines often keep the whole environment while any closure over that activation lives. Assume `copy` and `bytes` stay reachable until a snapshot shows the environment no longer points at them. The reliable fix is to build the listener in an inner function whose locals are only the name, after `copy` has gone out of scope, or to not allocate `copy` at all.

### NODE-033 — Which module body runs first

**Difficulty:** Senior

**Category:** Modules

**Question:**

Given an acyclic graph, when do module bodies run in an ES module program, and how does that differ from `require` in CommonJS? Node 20 or 22. The candidate believes source order in the file is execution order.

**Context and Constraints:**

- No cycles. A cycle's partial exports and temporal dead zone are the earlier module question.
- No bundler. Native Node loader.
- "Which format is this file?" is the earlier question. These files are already known: `.mjs` and `.cjs`.
- Live bindings and `require.cache` identity are earlier questions. Here the observable is side-effect order and "the body ran once."

**Senior Engineer's Answer:**

ES module evaluation is defined by the language and implemented by Node's loader. For an acyclic graph, Node links the modules, then evaluates dependencies depth-first in source order of the `import` declarations. A module body runs only after the modules it imports have finished evaluating. A module that has already been evaluated is not evaluated again, even if a second `import` names it.

`import` declarations are hoisted for this purpose. A `console.log` written above an `import` in the file still runs after the imported module's body. The text order in the file is not the evaluation order. The entry body's first statement runs after the whole imported graph has been evaluated.

CommonJS is a Node loading algorithm. `require` is a function call in the middle of the wrapper. Statements before the call have already run. The required module then runs to completion, and then the caller continues with the next statement. A second `require` of the same resolved file does not run the body again. The cache question explains that the module object is the same object. This question only needs the side effect: the body ran once.

Sibling imports are ordered. If the entry imports `a.mjs` and then `b.mjs`, and `a.mjs` imports `b.mjs`, `b`'s body runs once, then `a`'s body, then the entry body. The same shape in CommonJS prints the entry's "start" line first, because that line is above `require`.

`import()` is not part of this static order. It schedules a later load and is the next question.

**Practical Implementation:**

```js
// main.mjs
console.log('main body');
import './a.mjs';
```

```js
// a.mjs
console.log('a body');
import './b.mjs';
```

```js
// b.mjs
console.log('b body');
```

The process prints `b body`, then `a body`, then `main body`.

```js
// main.cjs
console.log('main start');
require('./a.cjs');
console.log('main end');
```

```js
// a.cjs
console.log('a start');
require('./b.cjs');
console.log('a end');
```

```js
// b.cjs
console.log('b');
```

The process prints `main start`, `a start`, `b`, `a end`, `main end`.

A second `import './b.mjs'` from anywhere in this graph does not print `b body` again.

**Trade-offs and Alternatives:**

Put initialization that must see a finished dependency inside the body, after the imports, or inside a function called from the body. In CommonJS, put that initialization after the `require` call that loads the dependency, and remember that code above the call has already run and can observe an unfinished program. Dynamic `import()` moves a branch of the graph onto a later turn, which is what you want for an optional plugin and the wrong tool for "please run this before my first line." Circular graphs are the earlier question. The fix for a surprise order in an acyclic graph is to make the dependency explicit, not to reorder `console.log` above an `import` and hope.

**Common Mistakes:**

- Predicting `main body` first because it is the entry file and the log is the first line of the text.
- Expecting a second `import` of the same URL to re-run side effects.
- Describing CommonJS order as "the same depth-first rule." `require` runs at the call site, so the caller's prefix has run.
- Using this order to explain a cycle. An acyclic graph finishes each dependency. A cycle is the case where that cannot happen.

**Senior-Level Follow-up:**

The interviewer adds `import './b.mjs'` to the entry, above the import of `a.mjs`, and asks what changes.

Answer: `b` is still evaluated once. It is now the entry's first dependency, so `b`'s body runs, then `a`'s body runs (its import of `b` is already done), then `main body`. The log `b body` does not appear twice. Source order of the entry's import list decides which unfinished dependency is evaluated first. It does not decide that the entry body can run in the middle.

### NODE-034 — Top-level await is an ES module syntax

**Difficulty:** Senior

**Category:** Modules

**Question:**

Someone wants `await fetchConfig()` at the top of a file that is currently CommonJS. Explain where top-level await is legal, what it does to modules that import that file, and what `require` does when the graph contains it. Node 20 and Node 22.

**Context and Constraints:**

- Native loader, no bundler down-leveling.
- Name the Node versions where `require` of ESM exists, because the error changes across the Node 20 line.
- A cycle of two modules that each await the other can hang. Say so, and leave the cycle mechanics to the earlier question.
- Do not describe top-level await as a second thread.

**Senior Engineer's Answer:**

Top-level `await` is legal only in an ES module. It has been unflagged since Node 14.8, so Node 20 and 22 parse it in `.mjs` and in `.js` under `"type": "module"`. In a CommonJS file the source fails to parse. `'use strict'` does not make `await` legal. An `async function` declared in CommonJS is legal, and `await` inside that function is legal. That is an ordinary function that returns a promise. It is not top-level await.

In an ES module, `await` at the top level suspends evaluation of that module until the promise settles. Modules that statically import it do not run their bodies until the awaited module finishes evaluating. The event loop is not frozen: a timer scheduled by a module that has already started can fire while the `await` is pending. What cannot run yet is the body of any module still waiting on that evaluation. If the awaited promise rejects, evaluation of that module rejects, and the modules waiting on it fail to evaluate.

A module with no `await` of its own still participates in an async graph when it imports a module that uses top-level await. The async-ness is a property of the graph being evaluated, not only of the file that contains the keyword.

`require` is synchronous. On Node 20.19.0+ and Node 22.12.0+, where `require` can load a synchronous ES module, requiring a graph that contains top-level await throws `ERR_REQUIRE_ASYNC_MODULE`. On Node 20.0 through 20.18, `require` of ESM fails earlier, because `require(esm)` is not available yet. The practical rule for a library is the one from the dual-package question: if callers must `require` you, do not put top-level await anywhere in the graph they load. Expose an async function instead.

Two modules that each top-level-await a binding from the other can deadlock. That is the cycle question applied to async evaluation. Break it by awaiting inside a function that runs after both bodies have started, or by removing the cycle.

**Practical Implementation:**

```js
// config.mjs
export const config = await readConfig();

async function readConfig() {
  return { port: 0 };
}
```

```js
// main.mjs
import { config } from './config.mjs';
console.log('main', config.port); // after readConfig's promise fulfills
```

```js
// load.cjs — legal CommonJS. This is not top-level await.
async function main() {
  const { config } = await import('./config.mjs');
  console.log(config.port);
}
main();
```

`require('./config.mjs')` from CommonJS, on Node 20.19+ or 22.12+, throws `ERR_REQUIRE_ASYNC_MODULE` because `config.mjs` is an async module. The same `require` on Node 20.11 fails because the file is ESM, before the await is the distinguishing fact.

**Trade-offs and Alternatives:**

Top-level await is the right tool for an application entry that must load config before any other body runs, and the entry is ESM. It is the wrong tool inside a library that CommonJS callers `require`. An exported `async function init()` keeps the module synchronous to load and moves the wait to the call. Dynamic `import()` from CommonJS is the bridge when the ESM file is yours and you can change the call site. Splitting "sync constants" and "async load" into two modules keeps the sync module `require`-able.

**Common Mistakes:**

- Putting `await` in a `.cjs` file and adding `'use strict'` to make it parse.
- Thinking importers run their bodies and then see a promise. Static importers wait, and their bodies have not started.
- Claiming the process does nothing else during the `await`. Timers from modules that have already begun evaluation can run.
- Advertising `require` support on Node 20.19 while the package's load path uses top-level await. That is `ERR_REQUIRE_ASYNC_MODULE`.

**Senior-Level Follow-up:**

The interviewer removes the `await` from `config.mjs` and leaves `import { config } from './config.mjs'` in a module that itself has no await. A different file, `plugin.mjs`, is imported by `config.mjs` and still contains a top-level await. What does `require` of the importer do on Node 22.12?

Answer: it throws `ERR_REQUIRE_ASYNC_MODULE`. The importer became part of an async graph by importing `config.mjs`, which imports `plugin.mjs`. The keyword does not have to appear in the file that was required. The error names the graph. `--experimental-print-required-tla` prints where the await sits.

### NODE-035 — What keeps the process from exiting

**Difficulty:** Senior

**Category:** Process

**Question:**

A script schedules a `setTimeout`, calls `.unref()` on it, and the process prints the line before the timer and then exits without firing it. A teammate removes `.unref()` and the timer fires. Explain what keeps a Node 20 or 22 process alive. Do not use a phase diagram.

**Context and Constraints:**

- Main thread, default loop. No `process.exit` in the program.
- You may use `process.getActiveResourcesInfo()`, which is in Node 20.
- The order of `setTimeout` and `setImmediate` is the next question and is not this one.
- No claim about how many milliseconds a timer waits.

**Senior Engineer's Answer:**

Node stays alive while the event loop has active, ref'd work: handles such as a listening server, an open socket, or a timer, and requests such as an in-flight filesystem or DNS operation. When that set is empty, Node emits `beforeExit` and, if the listener did not schedule new work, exits.

A timer from `setTimeout` or `setInterval` is ref'd by default. It keeps the process alive until it fires, or until the interval is cleared. `timeout.unref()` clears that vote. The callback still runs if some other ref'd handle keeps the process up. If the unref'd timer is the only thing left, the process exits and the callback does not run. `timeout.ref()` restores the vote. `setInterval(...).unref()` has the same trap: the interval will not keep the process alive, so it may never fire.

Servers and sockets use the same contract. `server.unref()` means "do not keep the process open only because this server is listening." `socket.unref()` is how a background client avoids pinning the process. `server.close()` drops the listening handle. Until it closes, a ref'd server is enough to keep the process up with no timers at all.

`process.getActiveResourcesInfo()` returns the type names of the active resources. Node's own example shows a ref'd `setTimeout` adding `'Timeout'` to that list. Use it to see why a script that "should have exited" is still running. The names are a clue. The handle you failed to `close` or `unref` is the cause.

Standard input can also keep a process alive once it is resumed, because the stream is a handle. A script that only writes a line and schedules an unref'd timer has nothing left ref'd, so it exits.

**Practical Implementation:**

```js
import { getActiveResourcesInfo } from 'node:process';

const timer = setTimeout(() => {
  console.log('fired');
}, 60_000);

console.log(getActiveResourcesInfo()); // includes 'Timeout' while the timer is ref'd
timer.unref();
console.log('scheduled');
// If nothing else is ref'd, the process exits and 'fired' does not print.
```

A keepalive probe that must not pin the process:

```js
import { connect } from 'node:net';

const socket = connect(9, '127.0.0.1');
socket.unref();
```

**Trade-offs and Alternatives:**

Leave servers and real work ref'd. `unref` is for auxiliary handles: a metrics timer, a probe socket, a heartbeat that should die with the process rather than keep it alive. Calling `unref` on the request-serving server makes the process exit while clients could still connect, which is a silent outage. `beforeExit` is the hook for "the loop is empty, schedule one more turn," and it is the wrong hook for cleanup that must run on `process.exit` and on crashes. That distinction is the exit question.

**Common Mistakes:**

- Calling `unref()` and then wondering why a health-check interval never runs in a short script.
- Assuming an empty JavaScript call stack means the process will exit. A listening server has an empty JavaScript stack and a live handle.
- Using `process._getActiveHandles()`. It is undocumented. `getActiveResourcesInfo()` is the supported list.
- Explaining this with timer-phase order. Ref is about lifetime. Phase order is about which callback runs first when the process stays up.

**Senior-Level Follow-up:**

The interviewer calls `server.listen(0)` and also schedules an unref'd `setInterval`. They then `server.close()`. When does the process exit?

Answer: `close` drops the listening handle. If no connection sockets remain ref'd and the interval is unref'd, the loop has no ref'd work left, so the process exits. The interval does not fire after that unless something else is keeping the loop alive. Pending `close` callbacks run as part of the close. A connection that was accepted and not unref'd or destroyed is still a handle, and the process stays up for that socket.

### NODE-036 — Where the event-loop phase diagram belongs

**Difficulty:** Intermediate

**Category:** Event loop

**Question:**

A candidate starts drawing the libuv phases to answer which of `setTimeout(fn, 0)` and `setImmediate(fn)` runs first. Stop the diagram. Say what a foundations answer can already commit to, and where the diagram belongs.

**Context and Constraints:**

- Node 20 or 22, main thread.
- Microtasks and `process.nextTick` already have their own question. Do not re-derive their order.
- Do not list or complete the phase cycle. One sentence may name the diagram as the next section's topic.
- No measured "always wins" claim from a single run.

**Senior Engineer's Answer:**

`setTimeout(fn, 0)` and `setImmediate(fn)` both schedule a callback for a later turn on the same JavaScript stack. The function that called them keeps running until it returns. A long synchronous stretch delays both callbacks. Neither callback is a microtask, and neither is `process.nextTick`. Those queues drain around the current turn and are already covered.

Which of the two callbacks runs first is a property of where the event loop is when they are scheduled. That ordering is the phase diagram, and it belongs in the event-loop section, not in this one. A single rule such as "immediate always runs first" is not a language rule and is not something to memorize from one process. Timer delays are also subject to clamping, so two runs of the same main-module script are a weak oracle.

What you can say here, without the diagram: both are host timers, the call stack is the one stack from the execution-model questions, and any promise reactions queued by the current turn run before either timer callback. If the interview needs the winner for a callback scheduled from inside I/O, open the event-loop section and use the diagram there. Do not sketch a partial wheel in a runtime-foundations answer.

**Practical Implementation:**

```js
import { readFile } from 'node:fs';

setTimeout(() => console.log('timeout'), 0);
setImmediate(() => console.log('immediate'));

readFile(new URL(import.meta.url), () => {
  setTimeout(() => console.log('timeout from read'), 0);
  setImmediate(() => console.log('immediate from read'));
});
```

This program is a prompt for the next section. Foundations stops at: both pairs are later turns, and the print order is the phase question.

**Trade-offs and Alternatives:**

If the product question is "run this after the current turn's promise reactions," `queueMicrotask` or a resolved promise is the ECMAScript tool, and `process.nextTick` is the Node tool from the earlier question. If the product question is "run this on a later loop turn, after I/O progress," either timer works, and correctness should not depend on which of the two runs first. When the order matters, the event-loop section is where you justify it, and a test should assert the order you depend on.

**Common Mistakes:**

- Completing a phase wheel from memory in this section and missing a phase.
- Stating a universal winner for `setTimeout(0)` versus `setImmediate` based on one laptop run.
- Putting these timers in the microtask queue.
- Blocking the main thread and expecting either callback to "run in parallel" with the loop. Both wait until the synchronous work returns.

**Senior-Level Follow-up:**

The interviewer asks whether a `queueMicrotask` callback scheduled just before these two timers can run after either of them.

Answer: no. The microtask is drained when the current turn finishes, and these two timers are later turns. That ordering is the microtask question, and it does not require the phase diagram. The diagram decides the order of the two timers relative to each other and to I/O. It does not put a timer ahead of a microtask queued on the current turn.

### NODE-037 — process.exit, exitCode, beforeExit, and the exit event

**Difficulty:** Senior

**Category:** Process

**Question:**

Explain the ways a Node 20 or 22 process finishes: the natural end of the loop, `process.exitCode`, `process.exit`, `beforeExit`, and `exit`. Include what happens to a write that has not flushed.

**Context and Constraints:**

- Main thread. The rejection and uncaught-exception exits are the earlier question. Refer to them. Do not repeat the listener matrix.
- Node 20.0 tightened the type of `process.exitCode`. Mention that.
- The phase diagram stays in the event-loop section.

**Senior Engineer's Answer:**

If the loop runs out of ref'd work, Node emits `beforeExit` with the code it would exit with. A listener may schedule more work, and the process stays up. When the loop is empty again, `beforeExit` can run again. When `beforeExit` schedules nothing, Node emits `exit` and the operating system sees the status.

`process.exitCode` is the code used for a graceful exit. The property's default is `undefined`, and an unset code means status 0. On Node 20.0 and later the property accepts a number, or a string that is an integer, and rejects other types. Set it and return. The loop drains, handles close, and `beforeExit` still runs.

`process.exit(code)` ends the process synchronously after the `exit` listeners run. It does not emit `beforeExit`. Pending I/O is abandoned, including a write to stdout that has not finished. If you omit `code`, `process.exit()` uses `process.exitCode` when that is set, and 0 otherwise. Passing a code overrides a previous `process.exitCode`.

The `exit` listener receives the code selected for this exit. It must be synchronous. A `setTimeout` inside it does not run. Assigning `process.exitCode` inside the listener changes the status the operating system observes. The argument the listener already received stays the value it was called with. There is no way to keep the process alive once `exit` listeners are running.

`beforeExit` is not emitted for `process.exit()` and not emitted for an uncaught exception. Cleanup that must run on a crash belongs with the uncaught-exception path, and it has to be synchronous there too. The reliable pattern for a normal shutdown is to stop accepting work, let in-flight handles finish, set `process.exitCode`, and allow the loop to empty.

**Practical Implementation:**

```js
import { createServer } from 'node:http';

const server = createServer((req, res) => {
  res.end('ok');
});

server.listen(0);

function shutdown(status) {
  process.exitCode = status; // Node 20+: a number or an integer string
  server.close(); // drop the listening handle; in-flight requests can finish
}

process.on('beforeExit', (code) => {
  // The loop is empty. Scheduling work here keeps the process up.
  console.log('beforeExit', code);
});

process.on('exit', (code) => {
  console.log('exit', code); // synchronous only
});
```

**Trade-offs and Alternatives:**

`process.exit(1)` is appropriate in a short CLI after a fatal usage error, when you accept losing a buffered stdout write. A long-running service should set `process.exitCode` and `server.close()` so keep-alive connections and logs can finish. Calling `process.exit` inside `server.close`'s callback is redundant if nothing else is ref'd: the process will exit on its own, and the code you set is the status. A supervisor that restarts on any exit cannot tell a graceful deploy from a crash unless the codes differ. Use 0 for a clean shutdown and a non-zero code for a failed startup.

**Common Mistakes:**

- Calling `process.exit(0)` in a request handler to "restart cleanly." In-flight responses are cut off.
- Doing asynchronous work in an `exit` listener and expecting the promise to run.
- Reading `process.exitCode` at startup and expecting `0`. The property is `undefined` until set. The status is 0 if you never set it.
- Using `beforeExit` as the crash hook. Uncaught exceptions skip it.

**Senior-Level Follow-up:**

The interviewer sets `process.exitCode = 3`, then inside the `exit` listener sets `process.exitCode = 7` and schedules a timer that logs. What does the listener print, what never prints, and what status does the OS see?

Answer: `beforeExit` runs first with 3, because this is a natural exit. The `exit` listener is called with 3. The timer never runs. The process status is 7, because Node uses the `process.exitCode` value after the `exit` listeners return. The argument `3` is not rewritten inside the listener.

### NODE-038 — process.env values are strings

**Difficulty:** Intermediate

**Category:** Process

**Question:**

A service reads `process.env.PORT` and compares it to the number `3000`. Startup takes the wrong branch. Explain what `process.env` stores, what assignment does, and how you delete a variable. Node 20 or 22.

**Context and Constraints:**

- Main thread. Mention workers in one sentence, because the copy semantics are a Node versioned fact, not the focus.
- Implicit string conversion has been deprecated since Node 10. Say what Node 20 still does, and do not invent a version that already throws.
- Windows case-insensitivity belongs in the answer.

**Senior Engineer's Answer:**

`process.env` is a Node object that reflects the process environment. Values you read are strings, or `undefined` when the name is absent. They are never numbers, booleans, or nulls on the way out. `process.env.PORT === 3000` is false when the variable is set, because `'3000' === 3000` is false. `process.env.PORT === '3000'` is the comparison that matches a set variable. An unset variable is `undefined`, so a default belongs in your own code: `const port = process.env.PORT ?? '3000'`, then `Number(port)` if you need a number, and a check for `Number.isNaN`.

Assignment converts the value with `ToString`. On Node 20 this still happens. The conversion has been deprecated since Node 10, and the docs say a future version may throw when the value is not a string, number, or boolean. Today, `process.env.X = null` stores `'null'`, `undefined` stores `'undefined'`, a number stores its decimal digits, and an object stores `'[object Object]'`. None of those assignments change the parent shell. The environment is per process. `node -e 'process.env.FOO=1'` does not export `FOO` to the shell that started Node.

Remove a variable with `delete process.env.NAME`. Assigning an empty string leaves the variable set to `''`, which is different from unset for every `??` default.

On Windows, environment names are case-insensitive in the main thread. `process.env.Port` and `process.env.PORT` are the same variable there, and they are different variables on POSIX. Since Node 11.14, a `Worker` gets its own copy of `process.env` unless it is constructed with `env: SHARE_ENV`. Main-thread code should not assume a worker sees later mutations.

**Practical Implementation:**

```js
const portText = process.env.PORT ?? '3000';
const port = Number(portText);
if (!Number.isInteger(port) || port < 0 || port > 65535) {
  throw new Error(`invalid PORT: ${portText}`);
}

function setForChild(name, value) {
  if (value == null) {
    delete process.env[name];
    return;
  }
  process.env[name] = String(value);
}
```

`setForChild` makes the string conversion explicit so a future Node that rejects non-strings still runs this call.

**Trade-offs and Alternatives:**

Reading `process.env` at the edge of the program and passing a typed config object inward keeps the stringly environment in one place. Passing `process.env` through every function spreads the coercion bugs. Schema validators (a small function like the port check, or a library) are justified at the boundary because the failure mode is a service that binds the wrong port and looks healthy. Child processes inherit a copy of the environment at `spawn` time. Mutations after `spawn` do not update the child. That is the same "not the parent shell" rule, one level down.

**Common Mistakes:**

- Comparing `process.env.PORT` to a number.
- Using `process.env.FLAG === true` or `if (process.env.FLAG)` without deciding what `'false'` and `''` mean. Both of those strings are set. `'false'` is truthy in JavaScript.
- "Unsetting" a variable by assigning `undefined`, which stores the string `'undefined'`.
- Assuming Windows and Linux agree on `process.env.path` versus `process.env.PATH`.

**Senior-Level Follow-up:**

The interviewer asks why `const snapshot = { ...process.env }` at startup is not the same thing as reading `process.env` later, and whether the snapshot is safe to log.

Answer: the spread copies the current string values into an ordinary object. Later assignments to `process.env` do not update the snapshot, and edits to the snapshot do not update the real environment or child processes. The snapshot is still a bag of secrets if the environment holds tokens. Log names and lengths, or an allowlist of non-secret keys, not the spread object.

### NODE-039 — emit runs listeners on the current stack, and error is special

**Difficulty:** Senior

**Category:** Events

**Question:**

Explain `EventEmitter` for a Node 20 or 22 service: when listeners run, what `'error'` does with no listener, and what an `async` listener does by default. Tie retention back to the upload-handler question without repeating that snippet.

**Context and Constraints:**

- `events.captureRejections` is at its default.
- One thread. Emitting from a listener is allowed and is synchronous too.
- Do not turn this into a phase diagram.

**Senior Engineer's Answer:**

`emit(name, ...args)` calls the listeners for `name` synchronously, on the stack that called `emit`, in registration order. `prependListener` inserts at the front. `once` removes the listener after it runs the first time. `emit` returns `true` when at least one listener ran. The listener runs before `emit` returns. An exception thrown by a non-async listener propagates out of `emit` to the caller.

`'error'` is the special name. If you `emit('error', err)` and the emitter has no `'error'` listener, Node throws `err`. If that throw escapes to the event loop, it is an `uncaughtException`. One listener is enough to stop the throw, and then your listener owns the error. This is why a readable stream or a child process without an `'error'` listener can take down the process.

An `async` listener that throws rejects the promise returned by that async function. With the default `events.captureRejections === false`, the emitter does not turn that rejection into an `'error'` event. The rejection follows the unhandled-rejection rules if nobody awaits the promise. The `async` keyword does not make `emit` wait. `emit` returns while the async function is still pending. Setting `captureRejections: true` on an emitter, or `events.captureRejections = true` as the default for new emitters, routes a rejected listener promise to `'error'`. That option is off unless you turn it on. Turning it on globally changes emitters you did not write.

Listeners are strong references. A long-lived emitter that `on`s a per-request function retains that function and its environment until `off` or `removeListener` with the same function reference. The upload question is that bug on a module-level bus. `once` still retains until the event fires. `setMaxListeners` only changes when `MaxListenersExceededWarning` is emitted. The default max is 10. The warning is not a leak detector with a real budget. It is a tripwire for "this list is growing."

**Practical Implementation:**

```js
import { EventEmitter } from 'node:events';

const bus = new EventEmitter();
const seen = [];

bus.on('data', (n) => {
  seen.push('a', n);
});
bus.prependListener('data', (n) => {
  seen.push('b', n);
});
bus.once('data', (n) => {
  seen.push('c', n);
});

bus.emit('data', 1);
bus.emit('data', 2);
// seen is ['b', 1, 'a', 1, 'c', 1, 'b', 2, 'a', 2]
// emit returned after each of those pushes. 'c' ran only once.
```

```js
const bare = new EventEmitter();
// bare.emit('error', new Error('boom')) throws boom synchronously.
bare.on('error', () => {});
bare.emit('error', new Error('boom')); // does not throw
```

**Trade-offs and Alternatives:**

`EventEmitter` fits a process-local, synchronous fan-out where listeners are registered at startup and removed with the same function identity. For a one-shot result, a promise is easier to await and harder to leak. For an async listener, wrap the call so the rejection hits your `'error'` path or your logs on purpose, instead of flipping the global `captureRejections` flag in a library. `AbortSignal` is the cancellation channel in the next questions. An emitter is a poor cancellation channel if listeners forget to unsubscribe.

**Common Mistakes:**

- Awaiting `emit`. It returns a boolean, not a promise, and async listeners are not joined.
- Adding an `async` listener and expecting a throw to hit `'error'` at the default settings.
- Calling `removeListener` with a different function than `on` received. The original stays, and so does its environment.
- Subscribing to `'data'` inside a request and never unsubscribing, then raising `setMaxListeners` when the warning appears.

**Senior-Level Follow-up:**

The interviewer turns on `{ captureRejections: true }` for one emitter and asks what changes for an async listener that throws, and what does not change for other emitters.

Answer: a rejection from a listener on that emitter is routed to its `'error'` event. If nobody is listening for `'error'`, that event throws, and you are back on the uncaught-exception path. Emitters constructed without the option, and the process-wide default while `events.captureRejections` stays false, keep today's behavior: the async throw is a rejected promise, not an `'error'` event. The option is per emitter unless you change the module-level default.

### NODE-040 — Which clock to use for a duration

**Difficulty:** Intermediate

**Category:** Process

**Question:**

You need the duration of a handler in a Node 20 or 22 service. Someone logs `Date.now()` at the start and at the end. When is that the wrong clock, and what do you call instead? No invented resolution numbers.

**Context and Constraints:**

- One process. No claim that a clock has a specific nanosecond precision on this machine.
- Wall-clock timestamps for logs are in scope as a different job from durations.
- Do not benchmark `performance.now` against `hrtime`.

**Senior Engineer's Answer:**

`Date.now()` is Unix epoch milliseconds. It is a wall clock. The operating system can step it with NTP, so the difference between two calls can be negative, zero, or much larger than the time the handler actually ran. Use it when a log line needs a timestamp a human or another system correlates with the outside world.

`performance.now()` is a monotonic clock in milliseconds, as a number, measured from `performance.timeOrigin`. Subtract two samples to get a duration. Node provides this global as part of the web performance API. The number is a float. It is the right default for application-level durations when milliseconds are the unit you will store.

`process.hrtime.bigint()` is Node's monotonic clock in nanoseconds, as a `bigint`. Subtract two samples. The subtraction is exact integer arithmetic, so you do not lose a count to float rounding while you accumulate. The older `process.hrtime()` returns a `[seconds, nanoseconds]` tuple and is easier to misuse. Prefer the bigint form. Neither hrtime nor `performance.now()` answers "what time is it in UTC."

A timeout budget and a metrics histogram should use a monotonic clock. A log line's `time` field should use the wall clock, and the `durationMs` field beside it should use the monotonic one. Mixing them produces negative latencies the first time the wall clock steps backward.

**Practical Implementation:**

```js
function startSpan() {
  const wall = new Date().toISOString();
  const t0 = process.hrtime.bigint();
  return () => ({
    wall,
    durationMs: Number(process.hrtime.bigint() - t0) / 1e6,
  });
}
```

`Number(bigint)` is safe here while the duration fits the safe-integer range, which a handler duration does. For a process uptime you intend to keep as an integer, leave the result a `bigint` and convert at the edge that requires JSON, remembering JSON cannot represent `bigint`.

**Trade-offs and Alternatives:**

`performance.now()` keeps the code on a web API, which is useful if the same helper is tested in a browser-like environment that does not have `process`. `hrtime.bigint` is the Node-native clock and stays exact longer. `Date` stays the wall clock either way. Wrapping the choice in `startSpan` prevents call sites from subtracting two `Date.now()` values. High-resolution tracing can record the bigint and convert in the exporter. Do not convert to a number and back if you care about the exact count.

**Common Mistakes:**

- Measuring latency with `Date.now()` and filing a bug when a sample is negative.
- Serializing a `bigint` duration with `JSON.stringify` and getting a `TypeError`.
- Quoting a nanosecond precision for `hrtime` that you did not measure on the host.
- Using `performance.now()` as a timestamp to compare with a log from another machine. It is an offset from this process's `timeOrigin`.

**Senior-Level Follow-up:**

The interviewer asks whether `performance.now()` and `process.hrtime.bigint()` can disagree about which of two non-overlapping handlers was slower.

Answer: both are monotonic on this process, so each one's own subtraction is a valid duration and the comparison of two durations taken from the same clock is stable. Comparing a `performance.now` delta to an `hrtime` delta mixes two clocks and two conversions. Pick one clock for the histogram. Neither clock protects you from the handler yielding at an `await`: the duration includes time the process spent on other turns, which is what you want for a user-visible latency and not what you want for a CPU profile.

### NODE-041 — structuredClone copies a graph JSON cannot

**Difficulty:** Senior

**Category:** Language

**Question:**

A cache stores objects that contain `Date`s, `Map`s, circular references, and occasionally a function or a class instance. Someone clones with `JSON.parse(JSON.stringify(value))`. Explain what that loses, and what `structuredClone` does instead, on Node 20 or 22.

**Context and Constraints:**

- `structuredClone` is the global, present since Node 17 and available here with no flag.
- The heap cost of `JSON.parse` is the earlier question. Here the question is which values survive the copy.
- No claim that one approach is faster.

**Senior Engineer's Answer:**

`JSON.stringify` walks enumerable own properties and produces text. `JSON.parse` builds a new graph from that text. Functions are dropped. `undefined` properties and object keys whose value is `undefined` are dropped. `Date` becomes an ISO string, not a `Date`. `Map`, `Set`, `RegExp`, and `BigInt` do not survive as themselves (`BigInt` throws in `stringify`). A circular reference throws. Non-enumerable properties and prototype methods are not in the text. What comes back is a tree of plain objects, arrays, strings, numbers, booleans, and nulls.

`structuredClone` implements the structured clone algorithm and returns a new graph. Cycles are preserved: a property that pointed at the root points at the clone's root, not at the original. `Date`, `Map`, `Set`, `RegExp`, `ArrayBuffer`, and typed arrays are cloned as those types. A `Buffer` arrives as a `Uint8Array` with the same bytes, not as a `Buffer` instance. Own properties whose value is `undefined` are kept. Functions and DOM nodes that the algorithm cannot clone throw `DOMException`. Symbols as property keys are not part of the cloned data model.

A class instance is cloned as a plain object. The clone's `constructor` is `Object`, and methods on the prototype are not copied. Structured clone copies data. It does not copy identity, and it does not copy behavior.

The clone does not share child objects with the input. Mutating a nested object on the clone does not mutate the original. The input remains alive until the caller drops it, so the peak is both graphs. That peak is the same shape of fact as the `JSON.parse` question, applied to a copy you asked for.

**Practical Implementation:**

```js
const box = {
  when: new Date(0),
  tags: new Map([['k', 1]]),
  skip: undefined,
  re: /a/i,
};
box.self = box;

const copy = structuredClone(box);
// copy.self === copy
// copy.when instanceof Date
// copy.tags instanceof Map
// 'skip' in copy
// copy.re instanceof RegExp

class Box {
  constructor() {
    this.n = 1;
  }
}
// structuredClone(new Box()).constructor.name === 'Object'

// structuredClone({ fn() {} }) throws DOMException
```

The JSON round trip throws on `box` because of the cycle, and it would turn `when` into a string if the cycle were removed.

**Trade-offs and Alternatives:**

Use `structuredClone` when the value is data and may contain dates, maps, or cycles. Use a hand-written copy when you need to preserve a class, drop secrets, or translate types (`Buffer` staying a `Buffer`). Use JSON when the contract is JSON: a network body, a log line, `postMessage` to a system that speaks JSON. A library that accepts user objects and stores them in a cache should clone at the boundary or it will alias the caller's graph. Refusing functions loudly is a feature. Silent dropping, which JSON does for functions, hides the bug until a method is missing.

**Common Mistakes:**

- Expecting `structuredClone` of a class instance to return `instanceof` that class.
- Expecting a cloned `Buffer` to pass `Buffer.isBuffer`. It is a `Uint8Array`.
- Using JSON because "it's a deep clone" on a graph that contains a `Date` or a cycle.
- Cloning as a substitute for freezing the original. The caller still holds the input and can mutate it.

**Senior-Level Follow-up:**

The interviewer puts a `Buffer` in a pooled, small `allocUnsafe` view and then `structuredClone`s an object that holds that buffer. Does the clone share the pool slab?

Answer: the clone receives a new `Uint8Array` with a copy of the view's own bytes, the `byteLength` of the view, not the whole slab. Neighboring bytes in the pool are not part of the view and are not cloned. The original view still shares the slab until you drop it. Cloning does not fix a disclosure bug in the source buffer. It copies whatever bytes the view currently exposes, including uninitialized bytes if the view was not filled.

### NODE-042 — AbortController marks a signal; it does not unwind the stack

**Difficulty:** Senior

**Category:** Process

**Question:**

Explain `AbortController` in Node 20 or 22. A teammate expects `controller.abort()` to stop a function that is already running, the way a thread interrupt would. Correct the model and show how a loop, a timer, and a promise actually observe the abort.

**Context and Constraints:**

- `AbortController` and `AbortSignal` are globals in Node 20. No import is required.
- Host APIs that accept a `signal` may be named. Their HTTP details belong elsewhere.
- `AbortSignal.any` landed in Node 20.3.0. Name that version if you use it.
- Do not draw event-loop phases.

**Senior Engineer's Answer:**

`AbortController` is a host object Node provides from the web platform. `controller.signal` is an `AbortSignal`. `abort(reason)` sets `signal.aborted` to true, stores `reason` (or an `AbortError` `DOMException` if you omit the reason), and dispatches the `'abort'` event synchronously to listeners registered on the signal. A second `abort` does nothing.

`abort` does not throw into a function that is already on the stack, and it does not cancel a JavaScript loop. The running function continues until it returns, unless that function itself checks the signal. `signal.throwIfAborted()` throws `signal.reason` when the signal is already aborted, and returns when it is not. A loop that never calls it will run to completion after `abort`.

Cooperative hosts check the signal at their own await points. `fetch` and the promise-based `fs` and `timers` APIs that accept `{ signal }` reject when the signal aborts. `AbortSignal.timeout(ms)` returns a signal that aborts after a delay, and that timer does not by itself keep your logic correct: your function still has to pass the signal to something that observes it, or poll it. `AbortSignal.any(signals)` returns a signal that aborts when the first input aborts. It is available in Node 20.3.0 and later, not in Node 20.0.0. On 20.0 through 20.2, build the combination yourself with listeners.

An `'abort'` listener is a strong reference until the abort happens or you remove it. `{ once: true }` drops it after it runs. Subscribing a request-scoped closure to a long-lived signal without removing it is the same retention shape as the upload-handler listener.

**Practical Implementation:**

```js
const ac = new AbortController();

function work(signal) {
  let steps = 0;
  signal.throwIfAborted();
  steps += 1;
  for (let i = 0; i < 1_000_000; i += 1) steps += 1; // abort during this loop is invisible
  signal.throwIfAborted();
  return steps;
}

ac.abort(new Error('stopped'));
// work(ac.signal) throws 'stopped' at the first throwIfAborted. The loop does not run.
```

```js
import { setTimeout as delay } from 'node:timers/promises';

const ac = new AbortController();
const pending = delay(60_000, null, { signal: ac.signal });
ac.abort();
await pending.catch((err) => {
  // rejected because the timer observed the signal
  return err.name;
});
```

**Trade-offs and Alternatives:**

Thread a single `AbortSignal` from the request boundary into every call that can wait, and check it between CPU chunks if the work is a long synchronous loop. A boolean `cancelled` flag is the same protocol with worse composition, because two callers cannot share a standard object and `AbortSignal.any` cannot combine flags. Aborting a parent signal to cancel children is the composition you want. Catching the abort and continuing the request hides a cancellation the client already gave up on.

**Common Mistakes:**

- Expecting `abort()` to reject a promise that was not given the signal and does not check it.
- Checking the signal once before a long loop and never again.
- Using `AbortSignal.any` in a package whose `engines` field still allows Node 20.0.
- Leaving an `'abort'` listener on a process-lifetime controller that rarely aborts, and retaining every request environment.

**Senior-Level Follow-up:**

The interviewer aborts a signal whose reason is the string `'stopped'`, then calls `throwIfAborted`. What is thrown, and what does a second `abort(new Error('other'))` do?

Answer: `throwIfAborted` throws the string `'stopped'`, because that is the stored reason. It does not wrap the reason in `Error`. A second `abort` leaves the first reason in place and does not emit `'abort'` again. Callers that want an `Error` should pass an `Error` as the reason, or omit the argument and accept the `DOMException` AbortError.

### NODE-043 — node:fs and fs are one builtin, and some builtins require the prefix

**Difficulty:** Senior

**Category:** Modules

**Question:**

How does a Node 20 or 22 program load a builtin module, when do `fs` and `node:fs` mean the same module, and which APIs exist so a library can load a builtin without a static `import`? Include `process.getBuiltinModule` and its version gate.

**Context and Constraints:**

- Native Node resolver. A bundler alias of `fs` is out of scope.
- `require.cache` identity is the earlier question. You may say what happens if someone replaces a cache entry. Do not re-explain the cache.
- Name versions. `process.getBuiltinModule` is not on Node 20.0.

**Senior Engineer's Answer:**

Node's builtin modules are part of the binary. `import fs from 'node:fs'` and `import fsBare from 'fs'` return the same module namespace. The same is true of `require('node:fs')` and `require('fs')`. The `node:` scheme tells the resolver this is a builtin and not a package in `node_modules`. For the historical bare names (`fs`, `path`, `http`, and the rest of that set), the bare specifier already resolves to the builtin, so a package named `fs` in `node_modules` does not win.

Some builtins are only addressable with the prefix. `import 'node:test'` loads the test runner. `import 'test'` looks for a user package named `test` and fails with `ERR_MODULE_NOT_FOUND` when there is none. The prefix is how you spell those modules, and it is the spelling to prefer for every builtin so a reader can see the dependency is Node itself.

`process.getBuiltinModule(id)` loads a builtin synchronously and returns `undefined` when `id` is not a builtin. It was added in Node 20.16.0 and Node 22.3.0. It accepts the ids `module.isBuiltin` accepts, including the `node:` form for modules that require the prefix. The object it returns is the builtin even if user code has replaced the `require.cache` entry for that id. On Node 20.0 through 20.15 the method is absent. Feature-detect with `globalThis.process?.getBuiltinModule` when the library still supports those versions. The method exists so an ES module that also runs in a browser can branch without a static `import 'node:fs'`, which non-Node environments fail to resolve, and without a dynamic `import()` that makes the module async.

`import 'node:fs/promises'` is the promise API. It is a different module entry from the callback `node:fs`, and it is the same object whether you use the prefix or the bare `fs/promises` form.

**Practical Implementation:**

```js
import * as prefixed from 'node:fs';
import * as bare from 'fs';

console.log(prefixed === bare); // true

export function loadFs() {
  const getBuiltin = globalThis.process?.getBuiltinModule;
  if (typeof getBuiltin !== 'function') {
    throw new Error('need Node 20.16+ or 22.3+ for process.getBuiltinModule');
  }
  return getBuiltin('node:fs');
}
```

A static `import 'node:test'` in a Node program loads the runner. A static `import 'test'` does not mean the runner.

**Trade-offs and Alternatives:**

Static `import` from `node:fs` is the right default in an application. The specifier is static, the module joins the evaluation order from the earlier question, and the dependency is obvious. `process.getBuiltinModule` is the right tool for a polyfill-style library that must touch `fs` only when the host is Node, and whose `engines` range includes 20.16 or 22.3. Dynamic `import('node:fs')` is the tool when you are on an older Node 20 that lacks `getBuiltinModule` and you can tolerate a promise. Creating a `require` with `module.createRequire` just to load `fs` is needless once `getBuiltinModule` is available.

**Common Mistakes:**

- Assuming every builtin has a bare name. `node:test` does not.
- Assuming `import 'fs'` might load `node_modules/fs` the way a browser bundler alias can. Node's resolver gives the builtin the bare name.
- Calling `process.getBuiltinModule` on Node 20.11 because the method is in a blog post. It arrived in 20.16.0.
- Treating `fs` and `fs/promises` as one module object. They are two entries. Importing either does not re-run the other's evaluation.

**Senior-Level Follow-up:**

The interviewer replaces the `require.cache` entry for `fs` with a stub and then calls `process.getBuiltinModule('fs')` and `require('fs')` on Node 22.3. What does each return?

Answer: `require('fs')` returns the stub, because `require` consults the cache. `process.getBuiltinModule('fs')` returns the real builtin. The cache question explains why the stub wins for `require`. `getBuiltinModule` is defined to ignore that replacement. A test that stubs `require('fs')` has not stubbed `getBuiltinModule` or a live ESM namespace that was linked to the real module.

### NODE-044 — dynamic import() loads on a later turn, once

**Difficulty:** Senior

**Category:** Modules

**Question:**

Explain dynamic `import()` in Node 20 or 22. When does the module body run, what does a second `import()` of the same URL do, and how do errors surface? Contrast it with the static evaluation order without repeating that question's graph.

**Context and Constraints:**

- `import()` is legal in CommonJS and in ES modules.
- The module may contain top-level await. Say what the promise does. The syntax restriction is the earlier question.
- No bundler code-splitting behavior. Native loader only.

**Senior Engineer's Answer:**

`import(specifier)` is an ECMAScript expression. It returns a promise. The specifier is resolved the same way as a static import, including `node:` and relative URLs, when the call runs. The module graph for that specifier is evaluated if it has not been evaluated yet. The promise fulfills with the module namespace object.

Because the operation is a promise, the body of a not-yet-evaluated module runs on a later turn, not inside the `import()` call. Code after the call, before an `await`, has already run. If that module's graph contains top-level await, the promise stays pending until that async evaluation finishes. A rejection of the top-level await rejects the `import()` promise.

A second `import()` of the same resolved URL reuses the module record. The body does not run again. The promise fulfills with the same namespace. Static `import` declarations and dynamic `import()` share that record: if the static graph already evaluated the file, the dynamic import does not evaluate it again, and the other way around.

Failures are rejections, not synchronous throws from the call: a missing file rejects with `ERR_MODULE_NOT_FOUND`, and an evaluation throw rejects with that error. The surrounding async function sees it at the `await`. A `try/catch` around the `import()` call, without `await`, does not catch the rejection.

In CommonJS, `import()` is how you load an ES module without `require(esm)`, and it is how you load a graph that uses top-level await. The call returns a promise either way. You cannot block the CommonJS wrapper on it.

**Practical Implementation:**

```js
console.log('start');

const first = import('./plugin.mjs');
console.log('after call'); // runs before plugin.mjs's body, if it was not already evaluated

const ns1 = await first;
const ns2 = await import('./plugin.mjs');
console.log(ns1 === ns2); // true, and the body ran once
```

```js
export async function loadOptional(url) {
  try {
    return await import(url);
  } catch (err) {
    if (err && err.code === 'ERR_MODULE_NOT_FOUND') return null;
    throw err;
  }
}
```

**Trade-offs and Alternatives:**

Static `import` belongs on the dependencies the program always needs. They run in the evaluation order you can read off the graph, and a missing file fails startup. Dynamic `import()` belongs on a branch: a plugin, a CLI command, a test double. The cost is that the dependency is invisible to a static reader and the failure happens at the call. `require` of a CommonJS file stays synchronous and throws inside the call. Use it when the caller is CommonJS and the dependency is CommonJS and you need the exports before the next line. Do not wrap `import()` in a deasync loop to fake that.

**Common Mistakes:**

- Writing `try { import('./missing.mjs'); } catch` and expecting the `catch` to run. The rejection is later.
- Expecting a second `import()` to re-execute side effects "because it is dynamic."
- Using dynamic import for every local file and losing the static order guarantees.
- Assuming `import()` of a top-level-await module resolves when the file is fetched. It resolves when evaluation finishes, including the await.

**Senior-Level Follow-up:**

The interviewer calls `import('./plugin.mjs')` twice without awaiting, back to back, before either promise resolves. How many times does the body run?

Answer: once. Both calls observe the same in-flight module record. The body starts with the first evaluation, and the second promise joins it. This is the same "evaluated once per resolved URL" rule as a static import that appears twice. The difference is only that the start of evaluation is the dynamic call, on a later turn, instead of the static graph before the entry body.

### NODE-045 — error.code, error.cause, and AggregateError

**Difficulty:** Senior

**Category:** Errors

**Question:**

Node's `readFileSync` fails because the path is missing. A promise helper fails for two reasons at once. A wrapper wants to add context without destroying the original. Explain the error objects you actually get on Node 20 or 22, and which fields are language versus Node.

**Context and Constraints:**

- Use `node:fs` `readFileSync` as the concrete system error. Do not claim every Node API throws a class named `SystemError`.
- `Error` `cause` is ECMAScript, in Node 20 with no flag.
- `AggregateError` should be tied to a real producer. `Promise.any` is enough.
- Matching errors by message text is the approach to reject.

**Senior Engineer's Answer:**

`throw` uses the language exception mechanism on the current stack. What Node adds for operating-system failures is properties on the `Error` object. `readFileSync` on a missing path throws an `Error` whose `name` is `'Error'`, with `code === 'ENOENT'`, `syscall === 'open'`, and a `path`. `code` is a Node convention, a string you can compare. It is not an ECMAScript field. Branch on `code`, not on `message`. The message is for humans and has changed between Node versions. A string `throw 'ENOENT'` does not have a `code` property. Throw `Error` objects.

`cause` is language. `new Error('read config', { cause: err })` sets `error.cause` to the original. The wrapper's stack is the wrapper's stack. The original stack remains on the cause. This is how you add "which config" without replacing `code`. Callers that understand system errors should walk `cause` until they find an object with a `code`, or you copy `code` onto the wrapper deliberately. Logging only `err.message` drops the cause chain unless the logger walks it.

`AggregateError` is an `Error` with an `errors` array. `Promise.any` rejects with one when every input promise rejects. The individual failures are the elements. A single `ENOENT` inside an `AggregateError` is not `err.code`. It is `err.errors[i].code`. `instanceof Error` is true for both `AggregateError` and the fs error.

A catch that retries should retry `ENOENT` or `EMFILE` on purpose, and should let a syntax error from `JSON.parse` (`SyntaxError`) through. Those are different classes of failure that both arrive as thrown or rejected values.

**Practical Implementation:**

```js
import { readFileSync } from 'node:fs';

export function readConfig(path) {
  try {
    return readFileSync(path, 'utf8');
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      throw new Error(`config not found: ${path}`, { cause: err });
    }
    throw err;
  }
}

export async function firstOk(promises) {
  try {
    return await Promise.any(promises);
  } catch (err) {
    if (err instanceof AggregateError) {
      const codes = err.errors.map((item) => item && item.code);
      throw new Error(`all failed: ${codes.join(',')}`, { cause: err });
    }
    throw err;
  }
}
```

**Trade-offs and Alternatives:**

Wrapping with `cause` preserves the chain and is the right default at a boundary. Re-throwing the original is the right default when you have no context to add. Copying `code` onto the wrapper helps callers that do not walk `cause`, and it can lie if the wrapper's meaning is broader than the original code. A custom `ConfigError` class is justified when callers need `instanceof` and a stable `code` of your own. Matching `message.includes('ENOENT')` breaks when Node localizes or rewords the text. `code` is the contract.

**Common Mistakes:**

- `catch (e) { if (e.message === 'ENOENT') }`. The message is a sentence. The code is `'ENOENT'`.
- Assuming `readFileSync` throws an object whose `name` is `'SystemError'`. On current Node the missing-file error is an `Error` with a `code`.
- Replacing the error with `new Error(err.message)` and dropping `code`, `path`, and the stack.
- Treating `AggregateError` as the rejection reason from `Promise.all`. `Promise.all` rejects with the first reason. `Promise.any` produces the `AggregateError`.

**Senior-Level Follow-up:**

The interviewer catches the wrapper from `readConfig` and asks for a reliable way to tell ENOENT from a permission error without parsing strings.

Answer: walk `cause` while the current object has no `code`, then compare `code` to `'ENOENT'` or `'EACCES'`. Both the wrapper and the fs error are `Error` instances. The fs error is the one with `syscall === 'open'` and a `path`. If you own `readConfig`, copying `code` onto the wrapper makes that walk unnecessary, and you should test both codes so a future edit does not collapse them into one `'failed'` message.

### NODE-046 — console.log writes to stdout, and the write may block

**Difficulty:** Senior

**Category:** Process

**Question:**

Explain `console.log` and `console.error` on Node 20 or 22. When is the write synchronous, when is it asynchronous, and how can `process.exit` lose a line? Use Node's rules for files, TTYs, and pipes. No timings.

**Context and Constraints:**

- POSIX and Windows differ. State both the way the Node docs state them.
- `process.exit` truncation is in scope. The rest of the exit sequence is the earlier question.
- A full logging library is an alternative, not the thing to design here.

**Senior Engineer's Answer:**

`console` is a Node global. `console.log` and `console.info` write to `process.stdout`. `console.error` and `console.warn` write to `process.stderr`. They format their arguments and call `write`. They are not ECMAScript language features, and they are not a second channel beside those streams.

`process.stdout` and `process.stderr` are special-cased. Node documents the write mode:

- Files: synchronous on Windows and POSIX.
- TTYs: asynchronous on Windows, synchronous on POSIX.
- Pipes and sockets: synchronous on Windows, asynchronous on POSIX.

`isTTY` is true when the stream is a terminal. A pipe makes `process.stdout.isTTY` falsy. Synchronous writes block the event loop until the write completes. That is invisible for a short line to a terminal and painful when a pipe's reader is stalled or the terminal is slow. The docs call out production logging to these streams for that reason. Asynchronous writes return before the bytes are consumed. `write` returns `false` when the buffer is full, and the `'drain'` event says there is room again.

`process.exit` ends the process before a pending asynchronous write finishes, so the last `console.log` can vanish when stdout is a POSIX pipe, which is the common case under a process supervisor. Setting `process.exitCode` and letting the loop drain gives that write a chance to finish. A synchronous destination (a file, a POSIX TTY) does not have this particular loss, and it pays for that by blocking the loop on the write.

`console.error` going to stderr is why a stack trace still appears when you redirect stdout to a file. Mixing diagnostic lines into stdout couples them to the program's real output.

**Practical Implementation:**

```js
import { createWriteStream } from 'node:fs';

function writeLine(stream, line) {
  const ok = stream.write(line + '\n');
  if (!ok) {
    return new Promise((resolve) => stream.once('drain', resolve));
  }
  return Promise.resolve();
}

const out = createWriteStream('./app.log');
await writeLine(out, 'started');
```

For the process streams, the same `write` return value applies, with the sync/async table above deciding whether `false` is likely. A CLI that must not lose the final error under a pipe should write stderr and set `process.exitCode`, or wait for `'drain'` before exiting.

**Trade-offs and Alternatives:**

`console.log` is appropriate for a short script and for local debugging. A service should log through one stream with levels, and should treat backpressure: if `write` returns `false`, slow the producers or drop debug lines on purpose. Writing every request line synchronously to a pipe couples your latency to the log consumer. A destination file is synchronous today and will block the loop if the disk stalls. Neither mode is free. The choice is whether a stalled consumer blocks the request path or risks a bounded buffer.

**Common Mistakes:**

- Treating `console.log` as always asynchronous, or always synchronous, on every OS and destination.
- Calling `process.exit(1)` immediately after `console.log` in a CLI whose stdout is piped, and losing the line.
- Logging request bodies to stdout in production and blocking the loop on a slow reader.
- Checking `process.stdout.isTTY` to decide if the process is "interactive" and forgetting stderr can be a TTY when stdout is piped.

**Senior-Level Follow-up:**

The interviewer redirects stdout to a file and leaves stderr on a POSIX terminal. Which of `console.log` and `console.error` can block the loop, and which can be lost on `process.exit`?

Answer: the file destination means `console.log` writes synchronously and can block. It is not the one `process.exit` drops for being asynchronous. `console.error` on a POSIX TTY is also synchronous, so it too blocks rather than getting lost. The loss case is the asynchronous one: a POSIX pipe or socket. Change stderr to a pipe and the last `console.error` before `process.exit` becomes the line that can disappear.

### NODE-047 — Atomics.wait blocks the thread it is called on

**Difficulty:** Advanced

**Category:** Language

**Question:**

A teammate wants to pause the main thread of a Node 20 or 22 server until another thread signals, and they reach for `Atomics.wait`. What does the call do, how does that differ from a browser's main thread, and what do you use when the server must keep running?

**Context and Constraints:**

- `SharedArrayBuffer` and `Atomics` are ECMAScript. The main-thread policy is the host.
- Workers are a separate question. You may say "a worker thread" as the place a blocking wait belongs. Do not re-explain isolates.
- No benchmark of wait versus a promise.
- Show a call that returns immediately, so the snippet is safe to run, and say what a non-zero timeout does.

**Senior Engineer's Answer:**

`Atomics.wait(typedArray, index, expectedValue, timeout)` is a synchronous ECMAScript operation on a shared `Int32Array` or `BigInt64Array`. If the index does not hold `expectedValue`, it returns `'not-equal'` immediately. If it does, the calling thread blocks until another agent does `Atomics.notify`, the value changes, or `timeout` milliseconds elapse. The return is `'ok'` or `'timed-out'`. A timeout of `0` returns `'timed-out'` without waiting when the value matches. A positive timeout, or an omitted timeout, does not return until the wait ends. While it has not returned, that thread runs no other JavaScript: timers, I/O callbacks, and promise reactions wait.

Browsers throw if you call `Atomics.wait` on the main thread. Node does not. On Node 20 and 22 the call is legal on the main thread, and a server that hits it stops accepting work for the duration. That is a host difference, not a different `Atomics` specification.

`Atomics.waitAsync` does not block. It returns an object whose `async` flag and `value` tell you whether the result is already known (`'not-equal'` or a zero timeout) or is a promise that settles when the wait would have returned. The main thread keeps running. `Atomics.notify` wakes waiters. `notify` on an index nobody waits on returns `0`.

The memory is a `SharedArrayBuffer`. Ordinary `ArrayBuffer` cannot be waited on. Sharing that buffer with another agent is the point of the API, and the other agent is a worker or another process-side agent you set up on purpose. The main thread of a request server should start work and return to the loop, using a promise, a timer, or `waitAsync`.

**Practical Implementation:**

```js
const shared = new SharedArrayBuffer(4);
const view = new Int32Array(shared);

// Returns 'timed-out' immediately. A positive timeout would block this thread.
const immediate = Atomics.wait(view, 0, 0, 0);

const pending = Atomics.waitAsync(view, 0, 0);
// pending.async is true when the wait is parked.
// Atomics.notify(view, 0, 1) settles it without blocking the caller.
```

Do not put `Atomics.wait(view, 0, 0)` with no timeout on the main thread of a server. That call returns only when some other agent notifies index 0.

**Trade-offs and Alternatives:**

`wait` / `notify` is the right protocol inside a worker that exists to block on shared memory. On the main thread, an `AbortSignal` plus a promise, or `waitAsync`, keeps the loop alive. A `SharedArrayBuffer` also requires the process to be allowed to use it. Current Node allows it. A browser page may not, depending on cross-origin isolation. Code you share between the two hosts has to handle both the block policy and the availability of the buffer. A mutex built on `wait` on the main thread will deadlock the process if the lock holder is a callback that cannot run until the wait returns.

**Common Mistakes:**

- Treating `Atomics.wait` as a promise-based sleep because the name says "wait."
- Porting a browser snippet that relies on the main-thread throw, and hanging Node instead.
- Waiting on a non-shared `Int32Array`. That throws.
- Notifying the wrong index or the wrong number of waiters and assuming the blocked main thread will time out, when the call omitted the timeout.

**Senior-Level Follow-up:**

The interviewer puts `Atomics.wait(view, 0, 0)` with no timeout inside an HTTP handler and asks what happens to the next request.

Answer: the handler's thread is the main thread. The call does not return until a notify. The listening socket can still be accepted by the operating system, and the JavaScript for the next request does not run, because the one JavaScript thread is inside `wait`. The event loop is stuck behind that call. The fix is `waitAsync` or moving the wait onto a worker and settling a promise when the worker messages back.

### NODE-048 — Read the shutdown script: what prints, and what status the OS sees

**Difficulty:** Senior

**Category:** Process

**Question:**

Read this Node 20 program. No other handles are ref'd. What does it print, in order? What never prints? What status does the operating system observe?

```js
process.on('beforeExit', (code) => {
  console.log('before', code);
});

process.on('exit', (code) => {
  console.log('exit', code);
  setTimeout(() => console.log('late'), 0);
  process.exitCode = 7;
});

process.exitCode = 3;
```

**Context and Constraints:**

- Default Node 20 or 22. No extra listeners, no open server, no timers outside this file.
- The exit rules are the earlier question. This one is the reading of this script.
- Do not draw phases to explain the timer.

**Senior Engineer's Answer:**

The program prints:

```text
before 3
exit 3
```

The operating system observes status 7. The line `late` never prints.

`process.exitCode = 3` does not exit by itself. The script schedules no ref'd handle, so the loop is empty and Node takes the natural-exit path. `beforeExit` runs with 3, the code currently selected. The listener does not schedule work, so Node proceeds to exit. `process.exit()` was not called, and nothing threw, so `beforeExit` is not skipped.

The `exit` listener is called with 3. That argument is the code selected when the exit sequence started. The listener then assigns `process.exitCode = 7`. Node uses that assigned value as the status after `exit` listeners return, which is why the OS sees 7 while the log says `exit 3`.

`setTimeout` inside the `exit` listener queues a timer that will not run. `exit` listeners are required to be synchronous, and the process terminates when they return. There is no later turn for `late`.

**Practical Implementation:**

The script above is the whole program. A graceful variant that keeps status 3 and still skips `beforeExit` only if you call `process.exit`:

```js
process.exitCode = 3;
process.on('exit', (code) => {
  console.log('exit', code);
});
// Natural end: beforeExit runs with 3, exit runs with 3, OS status is 3.
// process.exit() here would skip beforeExit and still run the exit listener.
```

Leave the assignment to `7` out unless a listener is deliberately translating the code.

**Trade-offs and Alternatives:**

Set the final code before the loop ends, not inside `exit`, so logs and the OS status match. Use the `exit` listener for synchronous last looks: a metric flush that is a function call, not a socket write you need to wait for. If the final code depends on cleanup, do that cleanup before `exit`, while `beforeExit` or the normal shutdown path can still schedule work. Translating code 3 into 7 inside `exit` works and is hard to see in a status dashboard that also scraped the log line `exit 3`.

**Common Mistakes:**

- Predicting status 3 because the listener printed 3.
- Predicting that `late` prints because `setTimeout` of 0 "runs next." There is no next turn after `exit`.
- Predicting that `before` is skipped. `beforeExit` is skipped for `process.exit` and for uncaught exceptions, neither of which this script hits.
- Predicting a second `beforeExit`. Nothing in that listener schedules work, so it runs once.

**Senior-Level Follow-up:**

The interviewer adds `setTimeout(() => {}, 0)` at the top of the `beforeExit` listener and asks what the output becomes.

Answer: `beforeExit` runs with 3, the timer is ref'd, and the process stays up. When the timer fires, the loop is empty again, so `beforeExit` runs a second time with 3. If that second call does not schedule more work, `exit` then runs with 3, the listener sets `process.exitCode` to 7, `late` still does not print, and the OS status is 7. `beforeExit` is allowed to postpone exit. `exit` is not.

### NODE-049 — Error.stack is the stack from when the error was created

**Difficulty:** Senior

**Category:** Errors

**Question:**

A helper builds `new Error('early')` and a timer throws that same object later. The log points at the helper, not at the timer. Explain when the stack string is captured, what `Error.stackTraceLimit` and `Error.captureStackTrace` change, and what is V8 rather than ECMAScript. Node 20 or 22.

**Context and Constraints:**

- One main-thread isolate.
- Async stack traces may be mentioned as a V8/Node printing behavior. Do not re-teach how `await` saves and restores the call stack.
- No claim about a specific source-map line beyond what the flag does.

**Senior Engineer's Answer:**

ECMAScript defines `Error` objects and `throw`. It does not define the format of `error.stack`. V8, which Node ships, captures a stack string when the `Error` is constructed, inside `new Error` or a subclass that calls `super`. The string names the frames that were live at that construction. Throwing the same object later does not capture a new stack. A timer that does `throw err` logs the creation site. The timer callback is absent from that string unless it was already on the stack when the error was constructed.

`Error.stackTraceLimit` is the V8 cap on how many frames are kept. Node's default is 10. Raising it keeps deeper frames and allocates more string. It is a process-wide number.

`Error.captureStackTrace(target, constructorOpt)` writes a stack onto `target`, which does not have to be an `Error`, and omits frames above `constructorOpt`, including `constructorOpt`. Library helpers use it so the public function appears as the top frame and the helper's internals do not. Calling it a second time replaces the string. It does not append the throw site.

Node's `--enable-source-maps` applies source maps when stacks are prepared for printing. The flag changes the text you log. It does not change when the stack is captured. A mapped stack is still the creation-time stack.

An error created at the bottom of a deep `async` chain can include async frames in the printed string on current Node, because V8 tracks those calls. That printing aid still describes the creation, not a later `throw` of the same object. If you need the throw site, construct the error there, or construct a new wrapper at the throw with `{ cause: original }`.

**Practical Implementation:**

```js
function make() {
  return new Error('early');
}

function later() {
  const err = make();
  setTimeout(() => {
    // err.stack names make and later. It does not name this callback.
    console.error(err.stack);
  }, 0);
}

later();

function publicApi() {
  const err = new Error('bad input');
  Error.captureStackTrace(err, publicApi);
  throw err; // the frame for publicApi is omitted; callers remain
}
```

`Error.stackTraceLimit` at the default of 10 drops frames beyond that depth. Set it at process start if a crash dump needs more, not per request.

**Trade-offs and Alternatives:**

Create the error at the throw site when the stack should identify the failure. Create it early and pass it when you are recording a caller to blame, which is the `captureStackTrace` pattern. Wrapping with `cause` keeps both sites and is the better log when a boundary crosses a timer or a promise. Raising `stackTraceLimit` helps a postmortem and costs allocations on every `new Error`, including the ones you throw on a hot invalid-input path. Source maps belong on in staging and in production only if you are willing to ship the maps and pay for the lookup.

**Common Mistakes:**

- Rethrowing the same `Error` across a timer and expecting the stack to move.
- Treating `error.stack` as an ECMAScript-standard string. It is V8's string, and Node formats it.
- Calling `captureStackTrace` and then also `new Error().stack` to "merge" sites. The second call does not merge. Use `cause`.
- Setting `stackTraceLimit` to a huge number on a process that constructs errors as control flow.

**Senior-Level Follow-up:**

The interviewer subclasses `Error`, forgets to call `Error.captureStackTrace` or `super`, and asks why `stack` is empty or useless.

Answer: the subclass constructor has to invoke `super(message)` so the `Error` constructor runs, or it has to call `Error.captureStackTrace(this, MyError)` itself. A class that assigns `this.message` and never touches V8's capture has no creation stack. `super(message)` is the usual fix. Passing `MyError` as `constructorOpt` hides the subclass constructor frame so callers see their own frame at the top.

### NODE-050 — Read the patch function: what JSON.parse changed, and what the assignment changed

**Difficulty:** Staff-Level

**Category:** Security

**Question:**

Read `applyPatch`. After `applyPatch({}, '{"user":"ada","__proto__":{"admin":true}}')`, what is `({}).admin`, and which step made it so? Node 20 or 22. The heap cost of `JSON.parse` is the earlier question. This one is the property update.

**Context and Constraints:**

- The snippet is the whole program. No library merge helper is involved unless the answer compares one.
- Separate what `JSON.parse` produces from what the recursive assignment does.
- The fix must still accept a JSON object whose keys are ordinary names, including the name `"user"`.

**Senior Engineer's Answer:**

```js
function applyPatch(target, json) {
  const patch = JSON.parse(json);
  for (const key of Object.keys(patch)) {
    const value = patch[key];
    if (value && typeof value === 'object') {
      if (target[key] == null || typeof target[key] !== 'object') {
        target[key] = {};
      }
      applyPatch(target[key], JSON.stringify(value));
    } else {
      target[key] = value;
    }
  }
  return target;
}
```

After that call, `({}).admin` is `true`. Every ordinary object then sees `admin`.

`JSON.parse` did not do that. Parsing `'{"__proto__":{"admin":true}}'` creates an object with an own data property whose name is the string `__proto__`. `Object.keys` lists that name. `({}).admin` is still `undefined` if you stop after the parse. The parse uses ordinary property creation. It does not call the `__proto__` setter.

The recursive assignment does. For the key `"__proto__"`, `value` is the object `{ admin: true }`. `target["__proto__"]` on a normal object `{}` runs `Object.prototype`'s getter and returns `Object.prototype` itself. That value is an object, so the function does not replace it. It calls `applyPatch(Object.prototype, '{"admin":true}')`, which evaluates `Object.prototype.admin = true`.

`user` is an ordinary key. The same function sets `target.user` to the string `'ada'`. The bug is not "JSON in general." The bug is a recursive `[[Set]]` / `[[Get]]` walk that honors inherited getters and setters for special names.

A second payload, `{"constructor":{"prototype":{"admin":true}}}`, reaches `Object.prototype` through `constructor` and `prototype` on a function. Blocking only the key `__proto__` leaves that path. The keys to refuse on every level are `__proto__`, `constructor`, and `prototype`.

**Practical Implementation:**

```js
const BLOCKED = new Set(['__proto__', 'constructor', 'prototype']);

function applyPatch(target, json) {
  const patch = JSON.parse(json);
  for (const key of Object.keys(patch)) {
    if (BLOCKED.has(key)) continue;
    const value = patch[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const current = Object.hasOwn(target, key) ? target[key] : undefined;
      const next =
        current !== null && typeof current === 'object' ? current : Object.create(null);
      target[key] = applyPatch(next, JSON.stringify(value));
    } else {
      target[key] = value;
    }
  }
  return target;
}
```

`Object.create(null)` has no `__proto__` setter. `Object.hasOwn` avoids a prototype lookup when deciding whether a child already exists. `JSON.parse` of the original payload, with no walk, remains safe. The walk is what made it unsafe.

**Trade-offs and Alternatives:**

Refusing the three keys loses a feature only if a caller genuinely needed a property with one of those names. That feature is not worth a prototype write. Storing the patch in a `Map` avoids object-key hazards entirely and is the better model when keys are untrusted strings. `structuredClone` copies data and does not assign through `Object.prototype`. A schema that lists allowed keys is stronger than a blocklist when the shape is known. A blocklist is the minimum repair for a free-form object merge.

**Common Mistakes:**

- Blaming `JSON.parse` for the pollution. The parsed object has an own property. The assignment publishes it onto `Object.prototype`.
- Deleting `__proto__` from the blocklist because "Node fixed JSON.parse." The parse was already using data properties. The merge is the bug.
- Blocking `__proto__` and allowing `constructor`.
- Testing `({}).admin` before the call and after a parse-only experiment, then declaring the function safe.

**Senior-Level Follow-up:**

The interviewer changes the walk to `Object.defineProperty(target, key, { enumerable: true, writable: true, value })` and asks whether `__proto__` still pollutes.

Answer: `defineProperty` installs an own data property named `__proto__` on the target. It does not invoke the setter, so this payload no longer writes `Object.prototype`. The target then has an own property that shadows the setter. That fixes this payload and still leaves a recursive walk unsafe if any level reads `target[key]` for a blocked name before defining it, because the read can return `Object.prototype` and the next recursion writes there. Skip the blocked keys before any read. `defineProperty` is not a substitute for that skip when the walk recurses through a get.
