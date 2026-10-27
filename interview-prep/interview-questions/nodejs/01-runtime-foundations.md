# NODE01 — JavaScript runtime foundations

Node.js 20+. Questions NODE-001–NODE-050.

These questions cover the JavaScript execution model as Node hosts it: execution contexts, the call stack, closures, allocation and garbage collection at interview depth, V8's role, and CommonJS versus ECMAScript modules. libuv appears only as the boundary under V8. Event-loop phase order belongs in the next section.

Behavior that comes from ECMAScript is called out as the language. Behavior that comes from Node's host (the module loader, `process`, `vm`, workers, libuv) is called out as Node. V8 details are included only where they change how you design or diagnose a Node process.

### NODE-001 — What an execution context is, and which context a Node file runs in

**Difficulty:** Intermediate

**Category:** Execution model

**Question:**

A candidate says "everything in Node runs in the global scope, like a browser script." What is an execution context, which kinds ECMAScript defines, and which kind is active at the top of a CommonJS file versus an ES module on Node 20/22 (main thread, no `vm`/workers)?

**Answer:**

An execution context is the ECMAScript record for code under evaluation: realm, lexical environment, and (for calls) `this`. Spec kinds: global, module, function, and eval. Node wraps CommonJS in a function, so the file top is a function context—top-level `var` is not on `globalThis`. An ES module runs as a module context; top-level `var` stays in the module environment. The realm's global context still exists (`globalThis`); your file is not that context. Direct `eval` uses the caller's environment; indirect `eval` / `new Function` use the global.

**Code:**

```js
// .cjs: this === exports; var stays local. .mjs: top-level this is undefined.
```

**Follow-up:**

Why does `'use strict'` at the top of a CommonJS file make an undeclared assignment throw?

Answer: the wrapper is sloppy unless the file opts in; sloppy undeclared assignment creates a global. The directive makes the wrapper strict (`ReferenceError`). ES modules are strict by definition.

### NODE-002 — One call stack per isolate, and where an async callback actually runs

**Difficulty:** Intermediate

**Category:** Execution model

**Question:**

Explain the JavaScript call stack in Node 20/22 (main thread only). A teammate says `fs.readFile` "runs the callback on the thread pool" so JSON can parse on a second JS stack. Correct the model: what is spec, V8, and Node?

**Answer:**

One agent has one execution-context stack; one V8 isolate has one JS heap and one JS stack. `fs.readFile` returns while the handler is still on the stack; libuv may run the OS read on the thread pool (native C stacks, no JS). The callback is queued and later pushed as a new turn on the main isolate's single stack when it is clear. ECMAScript runs one job to completion; the host schedules the next. A second JS stack needs `worker_threads` (new isolate). The pool never runs your closures.

**Code:**

```js
readFile(url, () => JSON.parse(/* later, main stack only */));
// handler frame is still running; callback is not
```

**Follow-up:**

What does `new Promise(executor)` do with the stack versus a `.then` callback?

Answer: the executor runs synchronously on the current stack before `new Promise` returns. A `.then` reaction is a promise job (microtask) on a later turn of the same stack—not the libuv pool.

### NODE-003 — Why a synchronous loop stalls callbacks that are already finished

**Difficulty:** Intermediate

**Category:** Execution model

**Question:**

A handler calls `fs.readFile`, then runs a tight synchronous loop for tens of ms with no `await`. The read finishes during the loop. Why does the callback wait, and how does that differ from `fs.readFileSync`? Node 20/22, main isolate.

**Answer:**

One agent runs a job to completion. While the handler frame is on the stack, Node starts no other JS turn—not the file callback, not promise reactions. libuv can finish the native read and queue the completion during the loop; the callback still waits until the stack clears. `readFileSync` never leaves the current frame: the thread blocks inside the call with no callback. Both delay other JS; async frees the stack only after your sync work ends, then delivers the already-finished read.

**Trade-offs:**

Chunk CPU work, use a Worker, or keep `readFileSync` for small startup reads—not inside a live request handler.

**Follow-up:**

Would `await` inside the loop let the file callback run between iterations?

Answer: yes if the async function suspends and the caller returns so the stack can unwind. A bare `while` never suspends. Awaiting every iteration yields microtasks; it does not create a second stack.

### NODE-004 — Closures capture bindings, and the bindings stay live

**Difficulty:** Senior

**Category:** Closures

**Question:**

Explain what a closure captures. A reviewer says the inner function "snapshots the value of `n` when created," so later increments should be invisible. Show ECMAScript behavior and where a real copy does happen (`let n` in an outer function; inners escape).

**Answer:**

A function stores `[[Environment]]`—the lexical environment where it was created—and resolves free identifiers there, not on the caller's chain. A binding is a location, not a copied value: `n += 1` mutates that location; every closure that closed over it sees the write. A real copy is `const snapshot = n` (second binding) or passing a primitive. Object mutation through a shared reference is visible without reassigning the binding. The outer frame pops; the environment stays while any capturing function remains reachable.

**Code:**

```js
function makeCounter() {
  let n = 0;
  const snapshot = n;
  return { inc() { n += 1; }, read() { return { n, snapshot }; } };
}
```

**Follow-up:**

Why are ESM imports and closures both called "live bindings"?

Answer: both read a binding at use time and see later writes. Mechanisms differ: closures hold a lexical environment; ESM imports are linked to the export binding by the loader.

### NODE-005 — The loop closure is one binding or a binding per iteration

**Difficulty:** Intermediate

**Category:** Closures

**Question:**

This loop schedules no timers. Predict `values` after both loops, explain the environment records, and say why `let` is not "snapshotting." Functions are called after both loops finish (ECMAScript; Node does not change it).

```js
const reads = [];
for (var i = 0; i < 3; i += 1) reads.push(() => i);
for (let j = 0; j < 3; j += 1) reads.push(() => j);
const values = reads.map((read) => read());
```

**Answer:**

`values` is `[3, 3, 3, 0, 1, 2]`. `var i` is one binding in the enclosing function/module/wrapper; every arrow shares it, so after the loop all read `3`. `for (let j)` creates a fresh declarative environment and `j` per iteration; each arrow captures that iteration's environment, so they read `0`, `1`, `2`. Nothing copied a number into the arrow—three locations, each left at that iteration's value. Delay (timers) is irrelevant; the shared `var` binding is.

**Follow-up:**

If the `let` body is `reads.push(() => j++)` and each function is called twice, what happens?

Answer: each function has its own `j`. First round returns `0,1,2` leaving `1,2,3`; second round returns those. With `var`, every function would share one location's writes.

### NODE-006 — A closure retained by module scope is a process-lifetime leak

**Difficulty:** Staff-Level

**Category:** Memory

**Question:**

A Node 22 HTTP service's `heapUsed` grows with traffic and does not fall after traffic stops; RSS stays high. The handler allocates a large `Buffer` per request and stores a function in a module-level array "for later audit." Diagnose the lifetime, name the retainer, and say what to measure—no invented sizes; do not "fix" with `global.gc()`.

**Answer:**

Collection is reachability. A module-level array holding functions whose environments hold buffers keeps those buffers alive for the process (`require.cache` / ESM module map). The GC is not behind—it correctly retains reachable objects. `global.gc()` (only with `--expose-gc`) cannot make reachable buffers unreachable. Compare heap snapshots after quiet periods; expect module → array → closure → `Buffer`/backing store. Also watch `arrayBuffers`/`external`. Fix: drop references (bounded ring buffer or log and retain nothing), then re-snapshot.

**Trade-offs:**

Ring buffer caps diagnostic memory; a log stream moves retention to the transport. `WeakRef` does not fix a strong environment reference.

**Follow-up:**

The array was removed; snapshots still show request buffers. What next?

Answer: other strong retainers—per-request listeners never removed, timers/sockets closing over the payload, pending promise maps, APM/logger args. Check `arrayBuffers` if wrappers are gone but stores remain.

### NODE-007 — Garbage collection at interview depth

**Difficulty:** Senior

**Category:** Memory

**Question:**

How should a senior talk about GC in Node 20/22 for a long-lived HTTP process? Cover reachability, generational strategy, what a pause means, and real knobs—no nursery sizes, invented generation names, or pause milliseconds.

**Answer:**

An object is collectable when unreachable from roots (stack, global, Node C++ handles: sockets, timers, modules). V8 is generational: most objects die young (minor collections); survivors promote to the old generation (major, less often). Large allocations may go old immediately—thresholds are versioned; measure, don't recite. Collection work can pause the isolate's JS thread; concurrent/incremental marking means majors aren't one giant pause. `--max-old-space-size` caps old space (MB); default depends on version/machine—quote from the binary you ship. Hitting the limit is fatal heap exhaustion; `try/catch` is not an OOM strategy.

**Trade-offs:**

Raising the limit delays exhaustion and can lengthen majors; neither removes a retainer. Pooling without clearing fields retains request data.

**Follow-up:**

Is a multi-megabyte `Buffer` collected like a small object?

Answer: the wrapper is a heap object; the backing store is external (`arrayBuffers`) and frees when all views are unreachable. RSS can move without matching `heapUsed`. Confirm with `memoryUsage()` and snapshots.

### NODE-008 — What process.memoryUsage is actually counting

**Difficulty:** Senior

**Category:** Memory

**Question:**

`process.memoryUsage()` returns `rss`, `heapTotal`, `heapUsed`, `external`, and `arrayBuffers`. Define each for Node 20/22, which overlap, what one sample cannot prove, and the worker-thread caveat.

**Answer:**

All five are bytes. `heapTotal` is V8-reserved heap; `heapUsed` is live JS objects (falls after reclaim). `external` is C++ memory bound to JS objects; `arrayBuffers` (buffers/SABs) is included in `external`—don't add them. `rss` is OS resident set for the whole process, not a V8 number; it can stay high after heap free (fragmentation). One sample cannot prove a leak—series after idle, then snapshots. In a Worker, `rss` is process-wide; heap/external/arrayBuffers are that isolate only.

**Follow-up:**

`heapUsed` and `arrayBuffers` returned to baseline after traffic; RSS did not. Conclude?

Answer: JS heap and tracked buffer stores were released; resident pages remain (allocator retention, native addon, or OS not reclaiming). Not by itself proof of a closure graph still holding those buffers.

### NODE-009 — Heap objects, small integers, and Buffer backing stores

**Difficulty:** Senior

**Category:** Memory

**Question:**

Where do values live in Node 20/22? Cover ordinary objects, numbers, strings, closures, and `Buffer`. Separate ECMAScript's value model from V8 representation and Node buffer allocation. No invented "large" byte threshold.

**Answer:**

Objects, arrays, functions, and environments are heap-allocated; closures retain environments (shared activation ⇒ shared slots). Numbers are IEEE-754; V8 stores small integers as Smis (immediate)—range depends on pointer compression (`process.config.variables.v8_enable_pointer_compression`). Outside that range or non-integers → heap numbers. Strings are heap objects; whether `slice` frees the parent is engine-dependent—snapshot if unsure. A `Buffer` is a `Uint8Array`: small wrapper + external backing (`arrayBuffers`). `alloc` zeroes; `allocUnsafe` may expose leftover bytes; small unsafe allocs can slice a shared pool (`poolSize` default 8192).

**Trade-offs:**

Prefer `alloc`/`allocUnsafeSlow` when the buffer may leave partly unwritten or must not pin the pool. `allocUnsafe` only when you overwrite every byte before expose.

**Follow-up:**

Why can two closures from one call retain a multi-MB buffer when only one mentions it?

Answer: the environment is per activation, not per name. One function using only `id` typically still retains `payload` in the same environment—split scopes or copy the small field; confirm with a snapshot.

### NODE-010 — What V8 does, what Node adds, and where libuv starts

**Difficulty:** Senior

**Category:** Runtime architecture

**Question:**

"Node is single-threaded because it uses V8." Unpick for Node 20/22: isolate, V8's job, what Node wraps, and the two libuv paths (main-thread loop vs thread pool). Stop before phase order.

**Answer:**

V8 parses/compiles/runs JS, owns the heap and GC. An isolate is one engine instance: one heap, one JS stack while a thread is inside it. Node embeds V8 and adds host APIs (`process`, loaders, `Buffer`, `net`/`fs`/`http`), plus OpenSSL, c-ares, llhttp, zlib. libuv: (1) event loop on the isolate's thread for non-blocking sockets—blocked while JS occupies the stack; (2) thread pool (default 4, `UV_THREADPOOL_SIZE`) for blocking native work (many fs ops, `dns.lookup`)—no JS, posts completions back. Accurate claim: JS per isolate is single-threaded; the process is not (main, pool, Workers, native helpers).

**Follow-up:**

Which thread runs a promise reaction queued from a `net` socket `data` handler?

Answer: the isolate that owns the socket (main for a main-thread server). The reaction is a microtask of that agent on that same stack—not the pool, not a Worker unless you message one.

### NODE-011 — The function Node wraps around every CommonJS file

**Difficulty:** Intermediate

**Category:** Modules

**Question:**

Where do `exports`, `require`, `module`, `__filename`, and `__dirname` come from in CommonJS? Why is top-level `var` not global, and why is top-level `return` legal? Separate Node's loader from ECMAScript. Node 20/22.

**Answer:**

ECMAScript does not define those names. Node wraps the file and calls roughly `(function (exports, require, module, __filename, __dirname) { … })` with `this === exports` (initially `module.exports`). They are wrapper parameters—local bindings. Top-level `var` lives in the wrapper; top-level `return` returns from it. Top-level `await` is a syntax error (not a module context). Sloppy unless `'use strict'`. `exports.foo =` mutates; `module.exports =` rebinds the export and orphans the `exports`/`this` object—callers get `module.exports`.

**Code:**

```js
module.exports = { label: 'replaced' }; // callers get this; exports/this stay on the old object
```

**Follow-up:**

What does `require.main === module` test?

Answer: Node sets `require.main` to the entry module object; true only in the entry file. ES module counterpart `import.meta.main` is Node 22.18+/24.2+—absent on Node 20 / early 22.

### NODE-012 — require.cache is one module object, not a value snapshot

**Difficulty:** Senior

**Category:** Modules

**Question:**

Explain `require.cache` on Node 20/22: key, what is stored, what later `require` returns, what `delete require.cache[id]` resets, and what the ESM loader refuses. A test reloads a module and still sees the old singleton—why?

**Answer:**

First load creates a module object keyed by resolved absolute path, runs the wrapper, caches the record. Later `require` returns the same `module.exports` without re-running. Mutations of an exported object are shared; destructuring a primitive copies that moment's value. Cache is inserted before the wrapper finishes (cycles see partial exports). `delete` removes the record so the next `require` re-executes; holders of the old exports keep the old object. ESM uses a separate module map with no supported delete—fresh graph needs a new process (or owned loader hooks).

**Follow-up:**

Two tests delete the service file's cache but still share a connection count. Why?

Answer: the db module that owns the pool was not deleted; the new service `require`s the cached db. Delete the state owner's id (and anything that captured it), or use a subprocess per file.

### NODE-013 — ESM live bindings and the CommonJS exports object are different mechanisms

**Difficulty:** Senior

**Category:** Modules

**Question:**

On Node 22 with the native loader, show the difference between an ESM live binding (`export let`), a CommonJS shared exports object, a destructured copy, and a named `import` of a CommonJS export. Which pieces are ECMAScript vs Node interop?

**Answer:**

ESM links import bindings to export bindings (language): exporter writes, importer reads; importer cannot assign. CommonJS `require` returns cached `module.exports`—object property mutations are visible; local `let` reassignment is not unless you expose a getter. Destructuring copies at that moment. Named ESM import of CJS is Node analysis that copies detected export names onto the namespace once—not live bindings. Default import is the exports object and sees later property writes. Missed names → `SyntaxError`; prefer default import unless you've verified named form.

**Follow-up:**

After ESM named import of CJS copied `n`, CJS does `module.exports.n = 5`; an ESM-to-ESM import does `n = 5`. What does each importer read?

Answer: ESM←ESM reads `5` (linked). Named CJS import keeps the copied number. Default `pkg.n` reads `5` (property). Three mechanisms, three results.

### NODE-014 — Cycles: partial CommonJS exports, ESM temporal dead zone, and the cross-boundary error

**Difficulty:** Advanced

**Category:** Modules

**Question:**

Two modules need each other. Describe observables for a pure CommonJS cycle, a pure ESM cycle that reads during evaluation vs only from a later function, and a cycle that crosses `require` into ESM. Node 22.12+ / 20.19+ with `require(esm)`.

**Answer:**

CJS: cache inserts before the wrapper returns, so recursive `require` gets the same partial exports object—no throw, silent stale fields until after both return. ESM: link then evaluate; import bindings exist, export `let`/`const` are in TDZ until initialized—top-level read throws `ReferenceError`; functions called after both evaluate are fine. Cross-boundary: CJS `require` of ESM that cycles back throws `ERR_REQUIRE_CYCLE_MODULE`. Break with lazy `require`/`import()` inside a function after evaluation, or merge files.

**Follow-up:**

Can `export function` on both sides of an ESM cycle call each other from those bodies?

Answer: yes after both modules evaluated—function bindings initialize at instantiation. A top-level call during evaluation is still order-sensitive if the callee reads an uninitialized `let`.

### NODE-015 — How Node decides a file is CommonJS or ESM

**Difficulty:** Senior

**Category:** Modules

**Question:**

Given a path, how does Node 20/22 decide CommonJS vs ESM? Cover extensions, nearest `package.json` `"type"`, absent `"type"`, and resolution differences that bite when moving relative `require` to `import`.

**Answer:**

Host classification: `.mjs` → ESM, `.cjs` → CJS, `.js` → nearest `package.json` (`"module"` / `"commonjs"`; absent ⇒ CJS). Nested `package.json` scopes that tree. CJS `require` can omit extensions and resolve directories/`index`; ESM relative imports need extensions and no directory index; package entry uses `exports`/`main`. `NODE_PATH` / `require.extensions` are CJS-only. JSON import (stable on current 20/22) needs `with { type: 'json' }` and exposes a default export.

**Trade-offs:**

`"type": "module"` + `.cjs` for legacy, or default CJS + `.mjs` for new files. Prefer explicit extensions for files that must ignore parent `"type"`.

**Follow-up:**

Root `"type": "module"` and `tools/package.json` with `"type": "commonjs"`—both `.js` styles work. Why?

Answer: nearest parent `package.json` wins per file path, not `cwd`. Nested scope does not leak upward; root does not override nested.

### NODE-016 — __dirname, import.meta.url, and import.meta.dirname

**Difficulty:** Intermediate

**Category:** Modules

**Question:**

A library needs the directory of the current file for `./templates/email.txt` beside the source (on-disk files). Show CommonJS, portable ESM, and the Node shortcut. Pin versions and the `file:` caveat. Node 20 and 22.

**Answer:**

CJS: `__dirname` / `__filename` are wrapper params—file path, not `cwd`. ESM: no those params; `import.meta.url` is the module URL (`file:` on disk). Portable: `new URL('./templates/email.txt', import.meta.url)` or `fileURLToPath` + `dirname`. `import.meta.dirname` / `.filename` are Node-only from 20.11.0 / 21.2.0, `file:` only; no longer experimental as of 22.16.0 / 24.0.0 (still experimental mark on 20 line). Prefer `fileURLToPath` when engines include pre-20.11. Avoid `process.cwd()` for package assets.

**Follow-up:**

If this helper is imported from three directories up, whose directory does `import.meta.url` use?

Answer: the module that contains the expression (the helper's file), not the entry or importer—same per-file idea as `__dirname`.

### NODE-017 — require() of an ES module on Node 20.19 and 22.12

**Difficulty:** Advanced

**Category:** Modules

**Question:**

On which Node 20/22 versions can CJS `require` an ES module, what does it return, which graphs throw, and how do you detect support? Distinguish experimental history from behavior you rely on. Cover top-level await and cross-boundary cycles.

**Answer:**

Node feature, not ECMAScript. On by default from 20.19.0 and 22.12.0 (earlier: flag or `ERR_REQUIRE_ESM`). Still experimental on those lines; stable in docs from 25.4.0. Success returns the namespace (or the `module.exports` interop export if present). Throws `ERR_REQUIRE_ASYNC_MODULE` if the graph has top-level await; `ERR_REQUIRE_CYCLE_MODULE` on CJS↔ESM cycles. Detect with `process.features.require_module`. Older escape hatch: dynamic `import()`.

**Trade-offs:**

`import()` works on older Node and async graphs but forces promises. `require(esm)` keeps sync factories but needs the version floor and bans TLA.

**Follow-up:**

`require('./codec.mjs')` then `codec.encode`—module has `export function encode`, no `module.exports` interop export. What is `codec`?

Answer: the namespace object, so `codec.encode` works. Default-only export would be `codec.default`. Adding `export { value as 'module.exports' }` changes `require` to return `value` and breaks `codec.encode`.

### NODE-018 — How this is chosen, including at the top of a Node module

**Difficulty:** Intermediate

**Category:** Language runtime

**Question:**

State ECMAScript rules that set `this` for a call, then apply to top-level CommonJS, top-level ESM, and a class method detached and passed to a timer. Node 20/22, no TS transforms.

**Answer:**

Call-site rules: `obj.method()` → `this` is `obj`; bare `fn()` → `undefined` (strict) or global (sloppy); `call`/`apply`/`bind`/`new` as usual; arrows take lexical `this`. Class bodies are always strict—detached method → `this === undefined` even in sloppy CJS. CJS top-level: wrapper `this === exports` (original object even after `module.exports =`). ESM top-level `this` is `undefined`. Timers do not restore a receiver—use `() => obj.method()` or `bind`.

**Follow-up:**

An arrow nested in a sloppy CJS function called as a bare call—what `this` does the arrow see?

Answer: the outer sloppy call set `this` to `globalThis`; the arrow sees that lexically. Making the outer strict/ESM makes both see `undefined`.

### NODE-019 — A vm context shares the isolate; a Worker does not

**Difficulty:** Advanced

**Category:** Runtime architecture

**Question:**

A plugin system must run user JS without host globals and without stalling the HTTP server forever. Compare `vm.createContext` and `worker_threads` on Node 20/22: what is shared, copied, and what neither is. Refuse a false sandbox.

**Answer:**

`vm.createContext` is another realm (new global/intrinsics) in the same isolate: same heap, same JS thread. Docs: not a security boundary—leaked host objects escape; a sync loop stalls the server. `timeout` on `runInContext` is not a sandbox. `Worker` is a new OS thread, isolate, heap, stack, and libuv loop; communicate via structured clone (`postMessage`). `SharedArrayBuffer` + `Atomics.wait` on the main thread blocks that thread (browsers reject on the window agent). Neither is a complete sandbox—CPU, RSS, network still need OS/policy; `resourceLimits` caps worker old space, not RSS, and does not stop infinite loops (`terminate()` does).

**Trade-offs:**

Separate process for strongest blast radius; Worker for second isolate in-process; `vm` alone only for trusted templates.

**Follow-up:**

`resourceLimits` on a Worker you forgot to use—can `vm` on the main isolate still exhaust the heap?

Answer: yes—allocation is on the main heap; `resourceLimits` is a Worker option only.

### NODE-020 — Object shapes: why two { id, status } objects are not the same to V8

**Difficulty:** Advanced

**Category:** V8

**Question:**

V8 uses hidden classes (maps/shapes) and inline caches. Explain at a level that changes how you write hot request records in Node 20/22. What can you say about speed, and what must you measure? No percentage claims.

**Answer:**

ECMAScript objects are property bags; V8 assigns shapes (names, add order, value offsets). Inline caches specialize on seen shapes; many shapes → megamorphic fallback. Different add order, conditional properties, or `delete` create new shapes / dictionary mode. Same fields, order, prototype ⇒ same shape for the cache. Construct records in one place with fixed fields (assign `null` instead of deleting). Class instances and literals do not share shapes. Stabilize shapes, then profile—don't promise speedups.

**Code:**

```js
function createRequestRecord(id) {
  return { id, status: 'open', retries: 0, error: null };
}
```

**Follow-up:**

Do TypeScript interfaces give V8 the shape?

Answer: no—types erase. V8 sees runtime objects. A shared constructor helps; an `as` cast does not.

### NODE-021 — Microtasks, process.nextTick, and the end of a turn

**Difficulty:** Senior

**Category:** Execution model

**Question:**

After the current JS stack unwinds on Node 20/22, in what order do promise reactions, `queueMicrotask`, and `process.nextTick` run? Why does top-of-ESM differ from top-of-CJS and from inside a timer? What does Node recommend instead of `nextTick`? No phase diagram.

**Answer:**

Promise reactions and `queueMicrotask` share the microtask queue (queue order). `process.nextTick` is a separate Node queue drained fully after the current operation, then microtasks—so from ordinary sync/CJS top/`setTimeout` turns: nextTick before promises. Exception: during microtask processing (including ESM evaluation), Node does not jump back to nextTick first—so ESM top-level order is promise/microtask then nextTick. Recursive nextTick can starve I/O. Marked Legacy in 20.18.0 / 22.7.0—prefer `queueMicrotask` for new "after I return" code; keep nextTick when you need its specific before-I/O/before-microtasks constructor pattern.

**Follow-up:**

Which queue does `await` use, and does top-level await change the nextTick story?

Answer: continuation is a promise reaction (microtask). Top-level await stays in module-evaluation microtask processing, so nextTick queued there still doesn't jump ahead of that drain.

### NODE-022 — What async and await do to the one call stack

**Difficulty:** Senior

**Category:** Execution model

**Question:**

Explain `async`/`await` on the single stack. Predict the log for this snippet. What is allocated, when the continuation runs, and what `await` does with a non-promise? Node 20/22, no phases.

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

**Answer:**

An `async` function always returns a promise and runs synchronously until return/throw/`await`. `await` PromiseResolves the operand (wraps non-promises), schedules the continuation as a reaction, suspends, and returns the function's promise. Order: `start`, `A before`, `end`, then `A after` (microtask). Throw before first `await` rejects that promise—not a sync throw to the caller. Sync work between awaits occupies the one stack like any function.

**Follow-up:**

Can `B after` run before `main`'s next line after `await label('B')`, and can a `readFile` callback run between `B before` and `B after`?

Answer: `main`'s next line runs after `B after` settles `label`'s promise (later microtasks, no overlapping frames). A file callback is an I/O turn, not a microtask—it runs after already-queued microtasks of the current checkpoint; `B after` (from `await null`) runs before later I/O turns.

### NODE-023 — Stack overflow, --stack-size, and proper tail calls

**Difficulty:** Advanced

**Category:** Execution model

**Question:**

A recursive tree walk throws `RangeError: Maximum call stack size exceeded` on Node 22. Explain the limit, ECMAScript proper-tail-call vs V8, and what to change. Do not quote a frame count. Tree depth is user data.

**Answer:**

Each call pushes a frame into a finite V8 stack region; overflow throws `RangeError`. Limit depends on stack size and frame size—not an ECMAScript constant. Spec requires proper tail calls in strict mode; V8 does not implement them—Node will not eliminate tail recursion. `--stack-size` (KB) / worker `stackSizeMb` raise the ceiling for bounded depth; they are not a fix for unbounded data. Fix: explicit heap stack (array) or trampoline so JS call depth stays constant. `async` recursion may avoid stack overflow but can build a promise chain as deep as the tree.

**Follow-up:**

Tail-position recursive call plus `'use strict'`—why still `RangeError`?

Answer: the call is in the position the spec would reuse; V8 still pushes a frame. ESM strictness does not enable PTC. Use the heap walk.

### NODE-024 — WeakRef and FinalizationRegistry do not close resources

**Difficulty:** Advanced

**Category:** Memory

**Question:**

Explain `WeakRef` and `FinalizationRegistry` for a Node 20/22 service. What is guaranteed, what is refused, and when is explicit `close()` required? Correctness must not depend on finalizer timing.

**Answer:**

`WeakRef` holds without keeping alive; `deref()` returns the object or `undefined`—no timing promise, and a later turn can collect after an `await`. `FinalizationRegistry` may call your callback with the held value after collection—not the object; no when; Node won't delay exit for it. Never close sockets/locks/files only in a finalizer. Use explicit `open`/`close`/`finally`; finalizers are at most diagnostics. `WeakRef`/`WeakMap` for caches that must not extend lifetime; delete dead `Map`+`WeakRef` entries or the map grows. Module scope remains a strong root for the map itself.

**Trade-offs:**

LRU with strong refs for predictable caches; `WeakRef` only when you must not keep the value alive. Prefer `try/finally` or `using`/`Symbol.dispose` for resources.

**Follow-up:**

Module `Map` of `WeakRef(Buffer)`; all other refs dropped. What about `arrayBuffers`, and can a finalizer use the buffer?

Answer: eligible after last strong ref; collected later. Finalizer gets the held token, not the buffer. Flat `arrayBuffers` means a strong ref remains—snapshot it.

### NODE-025 — One package, both import and require, without two copies of the state

**Difficulty:** Staff-Level

**Category:** Modules

**Question:**

A library has a process-wide connection counter and a class used with `instanceof`. Some Node 22 apps `import`; some Node 20 apps `require`. How do you publish one copy of that state, and what fails if `exports` points `import` and `require` at two stateful files?

**Answer:**

Two resolved files ⇒ two module records: two counters, `instanceof` false across paths. Put state in one record. On 20.19+/22.12+, `"type": "module"` with one sync ESM file for both (no TLA); set `engines`. Older Node: state in one CJS file; ESM entry only re-exports that object—no second class/counter. `module-sync` before `default` helps migrate; never put state in both wrappers. Test `import` and `require` in one process for counter/`instanceof` identity. Node does not unwrap bundler `__esModule`.

**Follow-up:**

Identity test passes, but `import { connections }` stays `0` after `require(...).opened()` where ESM re-exports a CJS number property. Why?

Answer: named CJS→ESM interop copied the number once; `opened` mutates the exports object. Re-export a function/getter and assert that, not a copied primitive.

### NODE-026 — Strict mode is how an ES module is defined to run

**Difficulty:** Senior

**Category:** Language

**Question:**

A library author says strict mode is a linter setting, and CJS/ESM follow the same rules unless someone writes `'use strict'`. What does strict mode change, what is strict with no directive, and what stays sloppy inside an otherwise strict module? Node 20/22.

**Answer:**

Strict mode is ECMAScript parse/runtime rules for a script, module, or function—not a linter. ES modules and class bodies are always strict; nested functions cannot opt out. CJS is sloppy unless the directive prologue (leading string literals) contains `'use strict'`. Mode is lexical; `new Function` / indirect `eval` parse fresh (sloppy unless their source has the directive). Strict parse failures: `with`, legacy octals (`010`), duplicate params, future-reserved bindings. Runtime: undeclared assignment → `ReferenceError`; no `arguments`/parameter aliasing; bare call → `this === undefined`.

**Follow-up:**

`'use strict'` inside one function of a sloppy CJS file—what else changed?

Answer: only that function and nests. Sibling functions stay sloppy. A class in the same file is strict anyway.

### NODE-027 — The temporal dead zone is a ReferenceError at run time

**Difficulty:** Intermediate

**Category:** Language

**Question:**

A candidate says "`let` is not hoisted, so reading it early is a syntax error." Explain the TDZ as a runtime fact using `let`/`const`/`class`, a default parameter, and `typeof`. ECMAScript (Node or browser). Contrast with parse failures.

**Answer:**

On context creation, `var`/function bindings are initialized; `let`/`const`/`class` are created uninitialized—TDZ until the initializer finishes. Reading/writing early throws `ReferenceError` while the program is already running (lines before may have run). `typeof notYet` throws in the TDZ; `typeof` of a truly undeclared name is `"undefined"`. Default params evaluate L→R in their own environment (`f(a = b, b = 1)` throws at call). Syntax errors (missing brace, illegal token) prevent the file from running at all.

**Follow-up:**

`switch (n) { case 1: let x = 1; case 2: let x = 2; }`—what fails?

Answer: parse error—duplicate lexical binding in one switch block. Wrap cases in blocks; then early read is the runtime TDZ `ReferenceError`.

### NODE-028 — unhandledRejection and uncaughtException decide whether the process dies

**Difficulty:** Senior

**Category:** Process

**Question:**

On Node 20/22 (default flags), a floating `async` function throws and a `setTimeout` callback throws. Name each event, default process behavior with no listeners, and what installing a listener changes.

**Answer:**

Async throw rejects the returned promise (ECMAScript). Unhandled after the turn → Node `unhandledRejection`. Default `--unhandled-rejections=throw` (since Node 15): no listener ⇒ raised as uncaught, exit 1. A listener counts as handling (even empty—still rejected; later `.catch` → `rejectionHandled`). Same-turn `.catch` prevents the event. Sync throw in a timer → `uncaughtException`; no listener ⇒ print and exit 1. A listener suppresses default exit—document cleanup then terminate; undefined state if you keep serving. `uncaughtExceptionMonitor` observes without suppressing. Module-eval throw is load failure, not later-turn uncaught.

**Trade-offs:**

Crash-and-restart is the safe default. Log listeners should set non-zero `exitCode` and stop work—not swallow forever.

**Follow-up:**

Reject, then `.catch` inside `setTimeout(0)`. Events? Exit?

Answer: `unhandledRejection` at end of create turn; later `.catch` → `rejectionHandled`. With a rejection listener, no default crash; without it, default throw may exit 1 before the timer runs.

### NODE-029 — process is one Node global, shared with node:process

**Difficulty:** Intermediate

**Category:** Process

**Question:**

A teammate says `process` is an ECMAScript built-in like `Math`, and an ES module must import it or get `ReferenceError`. What is `process`, where does the identifier resolve, and what does `import from 'node:process'` return? Node 20/22.

**Answer:**

`process` is a Node host object on the realm's global (`globalThis.process` / `global`), a non-enumerable accessor. Free identifier `process` resolves there in CJS and ESM—no import required. `import process from 'node:process'` (and named `env`, etc.) is the same live object—makes the dependency explicit. Locals/parameters can shadow the name without changing the global. Workers get their own `process` object.

**Follow-up:**

Why is `pid` still readable after deleting a local named `process`, and what do `Object.keys(globalThis)` say?

Answer: free `process` resolves on `globalThis`. It is non-enumerable, so `Object.keys` omits it; get the descriptor to see the getter.

### NODE-030 — Buffer.alloc zeroes; allocUnsafe can expose leftover bytes

**Difficulty:** Senior

**Category:** Security

**Question:**

Review a helper that uses `Buffer.allocUnsafe` and sometimes returns before every byte is written. Explain the disclosure bug, the pool, and when `alloc`, `allocUnsafe`, and `allocUnsafeSlow` are right. Node 20/22, default `poolSize` 8192. No timings.

**Answer:**

`alloc` zeroes (or fills)—defined contents, not pooled. `allocUnsafe` leaves memory uninitialized—may contain prior process data (tokens, other requests). Safe only if you overwrite every byte you expose; short `write` leaves a dirty tail. Small unsafe sizes (`size < poolSize >>> 1`, default < 4096) share a slab; `.buffer` is the whole pool—neighboring views leak. `allocUnsafeSlow` skips the pool but still doesn't zero—use for small long-lived buffers you fully fill. Prefer `alloc` for anything logged/sent. `new Buffer` is deprecated (`DEP0005`).

**Follow-up:**

Why do `allocUnsafe(4096)` and `allocUnsafe(4095)` differ under default pool size for `.buffer` disclosure?

Answer: pool only when `size < poolSize >>> 1` (4096). 4095 is a pooled view whose `.buffer` includes neighbors; 4096 is its own `ArrayBuffer`. Both uninitialized. Read live `Buffer.poolSize`.

### NODE-031 — JSON.parse allocates the whole value before it returns

**Difficulty:** Senior

**Category:** Memory

**Question:**

A handler `JSON.parse`s a large body on the main thread. What appears on the heap, what does peak include besides the finished object, and what does a reviver change or not? No invented byte ratios.

**Answer:**

`JSON.parse` is synchronous: whole input → whole JS value before return (objects/arrays/strings/numbers—not a Buffer alias). Peak includes input and output together; `JSON.parse(buf)` effectively needs UTF-8 text while the buffer lives, then the graph. Numbers are float64—beyond `MAX_SAFE_INTEGER` silently lose precision; no `BigInt`. Reviver runs bottom-up after values exist; returning `undefined` deletes a property but children were still allocated—it is not streaming. Bound body size before parse; don't catch OOM and keep serving.

**Follow-up:**

Success path keeps the original `Buffer` in a module-level debug array. What stays alive?

Answer: every body buffer (and backing store) for the process. The temp string can go if uncaptured; the array turns success into a lifetime leak—store bounded metadata or only on throw.

### NODE-032 — Read the upload handler and name what stays alive

**Difficulty:** Staff-Level

**Category:** Memory

**Question:**

After `handleUpload('report.bin', bytes)` returns, which objects from that call stay reachable? Which call in the same module does not retain them? Process keeps serving. Explain from the source—no sizes, no `global.gc()`.

```js
const bus = new EventEmitter();
export function handleUpload(name, bytes) {
  const copy = Buffer.from(bytes);
  function audit() { return copy.byteLength; }
  bus.on('report', audit);
  if (name.endsWith('.tmp')) { bus.off('report', audit); return 0; }
  return copy.byteLength;
}
```

**Answer:**

Non-`.tmp` path: `bus.on` stores `audit`; `audit` closes over `copy`; module-level `bus` is a process root ⇒ `copy` (and treat activation locals as retained) stays after return. Snapshot path: module → bus → listeners → audit → copy. `.tmp` path `off`s before return—if the caller drops `bytes`, that call's `copy` can be collected. Each non-tmp adds a listener (default max 10 warning). `once` still retains until the event fires.

**Follow-up:**

`audit` only closes over `name`—is `copy` collectible?

Answer: not by inspection—same activation environment often retains all locals. Build the listener in an inner scope without `copy`, or don't allocate `copy`.

### NODE-033 — Which module body runs first

**Difficulty:** Senior

**Category:** Modules

**Question:**

For an acyclic graph on Node 20/22 (native loader), when do ESM module bodies run, and how does that differ from CJS `require`? The candidate thinks source order in the file is execution order.

**Answer:**

ESM: link, then evaluate dependencies depth-first in `import` source order; a body runs only after its imports finish; already-evaluated modules don't re-run. `import` declarations are hoisted for evaluation—a log above an `import` still runs after the imported body. CJS: `require` is a call mid-wrapper—statements before it already ran; the dependency runs to completion, then the caller continues; body runs once (cache). Sibling order: ESM finishes deps before the entry body; CJS prints the entry prefix first.

**Follow-up:**

Entry also imports `b` above `a`, and `a` imports `b`. What changes?

Answer: `b` still once. Entry's first unfinished dep runs first (`b`, then `a`, then entry). Entry body still cannot run in the middle.

### NODE-034 — Top-level await is an ES module syntax

**Difficulty:** Senior

**Category:** Modules

**Question:**

Someone wants `await fetchConfig()` at the top of a CommonJS file. Where is top-level await legal, what happens to static importers, and what does `require` do when the graph contains it? Node 20 and 22.

**Answer:**

TLA is ESM-only (unflagged since 14.8)—parse error in CJS; `'use strict'` doesn't help. `async function` + inner `await` in CJS is fine (returns a promise). Top-level `await` suspends that module's evaluation; static importers wait before their bodies. The loop isn't frozen—already-started modules' timers can fire. Async-ness is a graph property. `require` of a TLA graph: `ERR_REQUIRE_ASYNC_MODULE` on 20.19+/22.12+; older 20 throws `ERR_REQUIRE_ESM` earlier. Libraries that must be `require`d should export `async function init()` instead. Mutual TLA can deadlock.

**Follow-up:**

Importer has no await; it imports `config` which imports `plugin` with TLA. `require` of the importer on 22.12?

Answer: `ERR_REQUIRE_ASYNC_MODULE`—the whole graph is async. `--experimental-print-required-tla` shows where.

### NODE-035 — What keeps the process from exiting

**Difficulty:** Senior

**Category:** Process

**Question:**

A script schedules `setTimeout`, calls `.unref()`, prints, then exits without firing. Removing `.unref()` fires the timer. What keeps a Node 20/22 process alive? No phase diagram. You may cite `process.getActiveResourcesInfo()`.

**Answer:**

The process stays up while the loop has active ref'd work (listening servers, sockets, timers, in-flight fs/DNS). Empty ⇒ `beforeExit`, then exit if nothing new is scheduled. Timers are ref'd by default; `unref()` clears that vote—callback runs only if something else keeps the process up. Same for `server.unref()` / `socket.unref()`. `getActiveResourcesInfo()` lists active resource type names (e.g. `'Timeout'`). Stdin resumed is also a handle.

**Trade-offs:**

`unref` for auxiliary probes/metrics—not the request-serving server.

**Follow-up:**

`server.listen(0)`, unref'd `setInterval`, then `server.close()`. When does the process exit?

Answer: after close drops the listen handle, if no ref'd connections remain and the interval is unref'd, the loop is empty and the process exits—interval may never fire.

### NODE-036 — Where the event-loop phase diagram belongs

**Difficulty:** Intermediate

**Category:** Event loop

**Question:**

A candidate starts drawing libuv phases to answer which of `setTimeout(fn, 0)` and `setImmediate(fn)` runs first. Stop them. What can a foundations answer commit to, and where does the diagram belong? Node 20/22.

**Answer:**

Both schedule a later turn on the same stack; the caller runs to completion first. Neither is a microtask or `nextTick`. Which wins depends on where the loop is when they are scheduled—that is the phase diagram in the event-loop section, not a universal language rule or a one-laptop claim (timer clamping). Foundations: both are host timers; current-turn promise reactions run before either. For I/O-scheduled ordering, open the next section.

**Follow-up:**

Can a `queueMicrotask` scheduled just before these two run after either?

Answer: no—microtasks drain when the current turn finishes; both timers are later turns. Phases order the timers relative to each other/I/O, not ahead of this turn's microtasks.

### NODE-037 — process.exit, exitCode, beforeExit, and the exit event

**Difficulty:** Senior

**Category:** Process

**Question:**

Explain how a Node 20/22 process finishes: natural end of the loop, `process.exitCode`, `process.exit`, `beforeExit`, and `exit`. Include unflushed writes. Note Node 20.0's `exitCode` typing.

**Answer:**

Empty ref'd work ⇒ `beforeExit` (may schedule more and repeat) ⇒ `exit` ⇒ OS status. `exitCode` sets graceful status (`undefined` ⇒ 0); Node 20+ accepts number or integer string. `process.exit(code)` runs `exit` listeners synchronously and ends immediately—no `beforeExit`; abandons pending async I/O (stdout may lose a line). `exit` listeners must be sync; assigning `exitCode` there changes OS status; the listener's `code` argument stays the start value. Uncaught/`process.exit` skip `beforeExit`. Prefer set `exitCode`, close servers, drain the loop.

**Follow-up:**

`exitCode = 3`, then in `exit` set `exitCode = 7` and schedule a timer. Print? OS status?

Answer: natural path: `beforeExit` with 3, `exit` with 3, timer never runs, OS status 7.

### NODE-038 — process.env values are strings

**Difficulty:** Intermediate

**Category:** Process

**Question:**

A service compares `process.env.PORT` to number `3000` and takes the wrong branch. What does `process.env` store, what does assignment do, how do you delete, and what about Windows case / workers? Node 20/22.

**Answer:**

Reads are strings or `undefined`—never numbers/booleans. `'3000' === 3000` is false. Default with `??`, then `Number` + validate. Assignment `ToString`s (still on Node 20; deprecated since 10—may throw later for non-string/number/boolean). Changes don't affect the parent shell. `delete process.env.NAME` unsets; `''` is set-but-empty. Windows env names are case-insensitive on the main thread; POSIX is case-sensitive. Workers get a copy unless `SHARE_ENV` (since 11.14).

**Follow-up:**

Is `const snapshot = { ...process.env }` at startup the same as later reads? Safe to log?

Answer: ordinary object copy—neither side tracks the other later. Still may hold secrets; log allowlisted keys or lengths, not the whole bag.

### NODE-039 — emit runs listeners on the current stack, and error is special

**Difficulty:** Senior

**Category:** Events

**Question:**

Explain `EventEmitter` on Node 20/22: when listeners run, what `'error'` does with no listener, and what an `async` listener does by default (`captureRejections` off). Tie retention to per-request listeners on a long-lived bus.

**Answer:**

`emit` calls listeners synchronously in registration order (`prependListener` front; `once` removes after first) and returns before async work finishes. Sync throw propagates from `emit`. `'error'` with no listener throws the error (→ uncaught if it escapes). Default: async listener rejection is not routed to `'error'`—unhandled-rejection rules apply; `captureRejections: true` routes to `'error'`. Listeners are strong refs—`on` per request without `off` retains environments (upload-handler pattern). MaxListeners (default 10) is a tripwire, not a budget.

**Follow-up:**

`{ captureRejections: true }` on one emitter—what changes for async throws, and for other emitters?

Answer: that emitter's rejected listeners become `'error'` (no listener ⇒ throw). Others stay on promise-rejection behavior unless the module default is flipped.

### NODE-040 — Which clock to use for a duration

**Difficulty:** Intermediate

**Category:** Process

**Question:**

You need handler duration on Node 20/22. Someone logs `Date.now()` at start and end. When is that wrong, and what should you call instead? No invented resolution numbers.

**Answer:**

`Date.now()` is a wall clock—NTP can step it; deltas can be negative or inflated. Use it for human/external timestamps. Durations need a monotonic clock: `performance.now()` (ms float from `timeOrigin`) or `process.hrtime.bigint()` (ns bigint; prefer over the tuple form). Timeout budgets and histograms use monotonic; log `time` as wall and `durationMs` as monotonic.

**Follow-up:**

Can `performance.now()` and `hrtime.bigint()` disagree which of two non-overlapping handlers was slower?

Answer: each clock's own deltas are valid; don't mix clocks/conversions in one histogram. Both include await wait time—user latency, not CPU time.

### NODE-041 — structuredClone copies a graph JSON cannot

**Difficulty:** Senior

**Category:** Language

**Question:**

A cache holds objects with `Date`s, `Map`s, cycles, and sometimes functions/class instances. Someone clones with `JSON.parse(JSON.stringify(value))`. What is lost, and what does `structuredClone` do on Node 20/22?

**Answer:**

JSON drops functions/`undefined` keys, stringifies `Date`, fails on cycles/`BigInt`, loses `Map`/`Set`/`RegExp` as themselves—returns plain JSON types. `structuredClone` (global since 17) preserves cycles, `Date`/`Map`/`Set`/`RegExp`/typed arrays; keeps `undefined` own props; throws `DOMException` on functions. `Buffer` becomes `Uint8Array` (bytes copied, not `Buffer`). Class instances become plain objects (no methods). Clone does not share children—peak is both graphs.

**Trade-offs:**

Hand-written copy when you need class/`Buffer` identity; JSON when the contract is JSON; `structuredClone` for data with dates/maps/cycles.

**Follow-up:**

Clone an object holding a small pooled `allocUnsafe` view—does the clone share the slab?

Answer: new `Uint8Array` with a copy of the view's own bytes only—not the whole slab. Original still shares the pool; cloning doesn't sanitize uninitialized source bytes.

### NODE-042 — AbortController marks a signal; it does not unwind the stack

**Difficulty:** Senior

**Category:** Process

**Question:**

Explain `AbortController` on Node 20/22. A teammate expects `abort()` to stop a running function like a thread interrupt. Correct the model for a loop, a timer, and a promise. `AbortSignal.any` needs a version pin.

**Answer:**

`abort(reason)` sets `signal.aborted`, stores reason (or AbortError `DOMException`), fires `'abort'` sync; second abort is a no-op. It does not throw into or preempt a running stack—callers must `throwIfAborted()` / check between chunks. Host APIs that take `{ signal }` (`fetch`, timers/promises, etc.) reject on abort. `AbortSignal.timeout(ms)` / `AbortSignal.any` (20.3+) compose signals. Abort listeners are strong until fire/remove—same retention risk as other long-lived subscriptions.

**Follow-up:**

`abort('stopped')` then `throwIfAborted`; then `abort(new Error('other'))`?

Answer: throws the string `'stopped'` (not wrapped). Second abort ignored—reason unchanged, no second `'abort'`.

### NODE-043 — node:fs and fs are one builtin, and some builtins require the prefix

**Difficulty:** Senior

**Category:** Modules

**Question:**

How does Node 20/22 load builtins? When are `fs` and `node:fs` the same? Which APIs load a builtin without a static `import`? Include `process.getBuiltinModule` and its version gate.

**Answer:**

Builtins live in the binary. Bare historical names (`fs`, `path`, …) and `node:` forms resolve to the same module; `node:` cannot be shadowed by `node_modules`. Some modules are prefix-only (`node:test` ≠ `test`). `process.getBuiltinModule(id)` (20.16.0 / 22.3.0) sync-loads a builtin or returns `undefined`, ignoring a stubbed `require.cache` entry. Feature-detect for older 20. `fs` vs `fs/promises` are different entries. Prefer static `import 'node:…'` in apps; `getBuiltinModule` for Node-only optional deps without async `import()`.

**Follow-up:**

Cache stub for `fs`, then `getBuiltinModule('fs')` vs `require('fs')` on 22.3?

Answer: `require` returns the stub; `getBuiltinModule` returns the real builtin.

### NODE-044 — dynamic import() loads on a later turn, once

**Difficulty:** Senior

**Category:** Modules

**Question:**

Explain dynamic `import()` on Node 20/22: when the body runs, what a second `import()` of the same URL does, how errors surface. Contrast with static evaluation order. Legal from CJS and ESM.

**Answer:**

`import(specifier)` returns a promise; evaluation of a not-yet-loaded graph happens on a later turn—not inside the call. Fulfills with the namespace; TLA keeps it pending until async evaluation finishes. Same resolved URL reuses the record (body once)—shared with static imports. Failures reject (`ERR_MODULE_NOT_FOUND`, eval errors)—`try/catch` without `await` misses them. From CJS, this is how you load ESM/TLA graphs without sync `require(esm)`.

**Follow-up:**

Two back-to-back `import('./plugin.mjs')` without awaiting—how many body runs?

Answer: once; both join the same in-flight module record.

### NODE-045 — error.code, error.cause, and AggregateError

**Difficulty:** Senior

**Category:** Errors

**Question:**

`readFileSync` fails on a missing path; a helper fails for two reasons; a wrapper adds context. Explain the error objects on Node 20/22 and which fields are language vs Node. Reject matching by message text.

**Answer:**

OS failures are `Error`s with Node properties: `code` (e.g. `'ENOENT'`), `syscall`, `path`—branch on `code`, not `message`. `cause` is ECMAScript (`new Error(msg, { cause })`)—keeps the original stack/code chain. `AggregateError` has `errors[]` (`Promise.any` when all reject)—codes live on elements, not the aggregate. Retry intentional codes; let `SyntaxError` from `JSON.parse` through. Don't rethrow `new Error(err.message)` and drop `code`.

**Follow-up:**

Catch the `readConfig` wrapper—ENOENT vs permission without parsing strings?

Answer: walk `cause` until `code` appears; compare `'ENOENT'` vs `'EACCES'`. Or copy `code` onto the wrapper and test both.

### NODE-046 — console.log writes to stdout, and the write may block

**Difficulty:** Senior

**Category:** Process

**Question:**

Explain `console.log` / `console.error` on Node 20/22: when writes are sync vs async, and how `process.exit` can lose a line. Cover files, TTYs, and pipes (POSIX vs Windows per Node docs).

**Answer:**

`console.log`/`info` → stdout; `error`/`warn` → stderr. Write mode: files sync (both OS); TTYs async on Windows / sync on POSIX; pipes/sockets sync on Windows / async on POSIX. Sync writes block the loop; async may return before consume (`write` false → wait `'drain'`). `process.exit` can drop a pending async stdout line (common under supervisors/pipes)—prefer `exitCode` and drain. Keep diagnostics on stderr so redirecting stdout doesn't hide stacks.

**Follow-up:**

Stdout redirected to a file; stderr on a POSIX TTY. Which can block? Which can be lost on `process.exit`?

Answer: both sync here (file + POSIX TTY)—both can block; neither is the async-pipe loss case. Pipe stderr and the last `console.error` before `exit` can vanish.

### NODE-047 — Atomics.wait blocks the thread it is called on

**Difficulty:** Advanced

**Category:** Language

**Question:**

A teammate wants to pause the main thread of a Node 20/22 server until another thread signals, using `Atomics.wait`. What does it do, how do browsers differ, and what should a live server use instead?

**Answer:**

`Atomics.wait` on a shared `Int32Array`/`BigInt64Array` blocks the calling thread until notify/value change/timeout (`'ok'`/`'timed-out'`/`'not-equal'`). Timeout `0` returns immediately when matched. While blocked, that thread runs no JS/timers/I/O. Browsers throw on the main/window agent; Node allows main-thread wait—and a server that does it stops serving. Use `Atomics.waitAsync`, promises, or wait on a worker. Needs `SharedArrayBuffer`.

**Follow-up:**

`Atomics.wait(view, 0, 0)` with no timeout inside an HTTP handler—next request?

Answer: main JS thread is stuck; OS may accept the socket, but the next request's JS doesn't run until notify. Use `waitAsync` or a worker + message.

### NODE-048 — Read the shutdown script: what prints, and what status the OS sees

**Difficulty:** Senior

**Category:** Process

**Question:**

Read this Node 20 program. No other ref'd handles. What prints, in order? What never prints? What status does the OS observe?

```js
process.on('beforeExit', (code) => { console.log('before', code); });
process.on('exit', (code) => {
  console.log('exit', code);
  setTimeout(() => console.log('late'), 0);
  process.exitCode = 7;
});
process.exitCode = 3;
```

**Answer:**

Prints `before 3` then `exit 3`. `late` never prints. OS status is 7. Setting `exitCode` alone doesn't exit; with no ref'd work Node takes the natural path so `beforeExit` runs. The `exit` listener receives 3 but assigns 7 afterward—Node uses the final `exitCode` for the OS. Timers scheduled in `exit` never run.

**Follow-up:**

`setTimeout(() => {}, 0)` at the top of `beforeExit`—output?

Answer: first `beforeExit` 3 keeps the process; after the timer, second `beforeExit` 3, then `exit` 3, status 7; `late` still never prints. `beforeExit` may postpone; `exit` may not.

### NODE-049 — Error.stack is the stack from when the error was created

**Difficulty:** Senior

**Category:** Errors

**Question:**

A helper builds `new Error('early')`; a timer throws that object later. The log points at the helper, not the timer. When is the stack captured? What do `Error.stackTraceLimit` and `Error.captureStackTrace` change? What is V8 vs ECMAScript? Node 20/22.

**Answer:**

ECMAScript defines `Error`/`throw`, not `stack` format. V8 captures the stack string at construction; later `throw` of the same object does not recapture—timer frames are missing. `stackTraceLimit` caps frames (Node default 10), process-wide. `captureStackTrace(target, constructorOpt)` writes a stack and can omit the helper frame. `--enable-source-maps` remaps printed text, not capture time. Need the throw site → construct there or wrap with `{ cause }`.

**Follow-up:**

Subclass of `Error` forgets `super` / `captureStackTrace`—why empty/useless `stack`?

Answer: V8 capture runs via `Error` constructor or explicit `captureStackTrace`. Assigning only `this.message` skips it. Call `super(message)`; pass the subclass as `constructorOpt` to hide its frame.

### NODE-050 — Read the patch function: what JSON.parse changed, and what the assignment changed

**Difficulty:** Staff-Level

**Category:** Security

**Question:**

After `applyPatch({}, '{"user":"ada","__proto__":{"admin":true}}')`, what is `({}).admin`, and which step made it so? Separate parse from recursive assignment. Fix must still accept ordinary keys like `"user"`.

```js
function applyPatch(target, json) {
  const patch = JSON.parse(json);
  for (const key of Object.keys(patch)) {
    const value = patch[key];
    if (value && typeof value === 'object') {
      if (target[key] == null || typeof target[key] !== 'object') target[key] = {};
      applyPatch(target[key], JSON.stringify(value));
    } else target[key] = value;
  }
  return target;
}
```

**Answer:**

`({}).admin` is `true`—prototype pollution for ordinary objects. `JSON.parse` creates an own data property named `__proto__`; it does not invoke the setter—`({}).admin` is still undefined after parse alone. The walk does: `target['__proto__']` returns `Object.prototype`, recursion assigns `admin` there. Also block `constructor`/`prototype` paths. Fix: skip those keys before any get/set; prefer `Object.create(null)` / `Object.hasOwn` / `defineProperty` carefully—still skip blocked keys before recursing through a get.

**Follow-up:**

Change the walk to `Object.defineProperty(...)`—does `__proto__` still pollute?

Answer: `defineProperty` installs an own data property without the setter—this payload stops writing `Object.prototype`. Recursion that `get`s a blocked key before defining can still reach the prototype—skip blocked keys first.
