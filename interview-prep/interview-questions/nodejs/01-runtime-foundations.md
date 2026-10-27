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

An execution context is the record ECMAScript uses to track the code that is currently running. It holds the realm, the lexical environment, and, for function calls, the value of `this`. The spec defines global, module, function, and eval contexts. Node wraps each CommonJS file in a function, so the top of a CommonJS file is a function context, and a top-level `var` does not land on `globalThis`. An ES module runs in a module context, where `var` also stays local. The global context exists, but your file does not run in it.

**Code:**

```js
// .cjs: this === exports; var stays local. .mjs: top-level this is undefined.
```

**Follow-up:**

Why does `'use strict'` at the top of a CommonJS file make an undeclared assignment throw?

Answer: The wrapper function is sloppy mode unless the file opts in, and in sloppy mode assigning to an undeclared name creates a global. With `'use strict'`, the same assignment throws a `ReferenceError`. ES modules are strict by definition, so they always throw.

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

### NODE-004 — Closures capture bindings, and the bindings stay live

**Difficulty:** Senior

**Category:** Closures

**Question:**

Explain what a closure captures. A reviewer says the inner function "snapshots the value of `n` when created," so later increments should be invisible. Show ECMAScript behavior and where a real copy does happen (`let n` in an outer function; inners escape).

**Answer:**

A closure remembers the lexical environment where the function was created, and it looks up free variables there. A variable binding is a storage location, not a copied value. So when `n += 1` runs, every closure sharing that binding sees the new value. A real copy happens only when you make one, such as `const snapshot = n`. The outer function's frame disappears after it returns, but its environment stays alive as long as any closure that uses it is reachable.

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

Answer: Both read the current value of a binding at the moment you use it, so they see later writes. The mechanisms differ. A closure holds a lexical environment, while an ES module import is linked to the exporting module's binding by the loader.

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

`values` is `[3, 3, 3, 0, 1, 2]`. With `var i`, there is one binding for the whole loop, so all three arrows read the same location, which ends at 3. With `for (let j ...)`, each iteration gets its own fresh binding, and each arrow captures its own. So `let` is not copying a number; it creates three separate locations, each holding the value from its iteration. Timers are irrelevant here. What matters is whether the binding is shared.

**Follow-up:**

If the `let` body is `reads.push(() => j++)` and each function is called twice, what happens?

Answer: Each function owns its own `j`. On the first round they return 0, 1, and 2, and leave 1, 2, and 3 behind. The second round returns those. With `var`, all the functions would share one location and keep incrementing it.

### NODE-006 — A closure retained by module scope is a process-lifetime leak

**Difficulty:** Staff-Level

**Category:** Memory

**Question:**

A Node 22 HTTP service's `heapUsed` grows with traffic and does not fall after traffic stops; RSS stays high. The handler allocates a large `Buffer` per request and stores a function in a module-level array "for later audit." Diagnose the lifetime, name the retainer, and say what to measure—no invented sizes; do not "fix" with `global.gc()`.

**Answer:**

Garbage collection works on reachability: if something is still reachable, it stays. Here a module-level array holds functions, and each function's environment holds a large `Buffer`. The module lives for the whole process, so those buffers do too. The GC is not behind; it is correctly keeping reachable data, and `global.gc()` cannot help. Compare heap snapshots after quiet periods and look for the path from module to array to closure to `Buffer`, and watch `arrayBuffers` and `external`. The fix is to drop the references, for example with a bounded buffer or by logging instead of retaining.

**Trade-offs:**

Ring buffer caps diagnostic memory; a log stream moves retention to the transport. `WeakRef` does not fix a strong environment reference.

**Follow-up:**

The array was removed; snapshots still show request buffers. What next?

Answer: Look for other strong references: per-request listeners that were never removed, timers or sockets whose closures hold the payload, maps of pending promises, or logger and APM arguments. If the wrapper objects are gone but memory stays high, check the `arrayBuffers` number too.

### NODE-007 — Garbage collection at interview depth

**Difficulty:** Senior

**Category:** Memory

**Question:**

How should a senior talk about GC in Node 20/22 for a long-lived HTTP process? Cover reachability, generational strategy, what a pause means, and real knobs—no nursery sizes, invented generation names, or pause milliseconds.

**Answer:**

An object can be collected once nothing reachable points to it. Roots include the stack, globals, and Node's native handles such as sockets and timers. V8 is generational: most objects die young and are cleaned in frequent, cheap minor collections, while survivors move to the old generation, which is collected less often. Some of that work runs concurrently or incrementally, so major collections are not always one long pause. `--max-old-space-size` caps old space, and the default depends on version and machine. Hitting it is a fatal crash, not something `try/catch` can handle.

**Trade-offs:**

Raising the limit delays exhaustion and can lengthen majors; neither removes a retainer. Pooling without clearing fields retains request data.

**Follow-up:**

Is a multi-megabyte `Buffer` collected like a small object?

Answer: The `Buffer` wrapper is a small heap object, but its bytes live outside the V8 heap and are counted under `arrayBuffers`. They are freed once no view of them is reachable. That is why RSS can change without `heapUsed` changing, so check with `process.memoryUsage()` and heap snapshots.

### NODE-008 — What process.memoryUsage is actually counting

**Difficulty:** Senior

**Category:** Memory

**Question:**

`process.memoryUsage()` returns `rss`, `heapTotal`, `heapUsed`, `external`, and `arrayBuffers`. Define each for Node 20/22, which overlap, what one sample cannot prove, and the worker-thread caveat.

**Answer:**

All values are in bytes. `heapTotal` is the heap V8 has reserved, and `heapUsed` is the part holding live objects. `external` is native memory tied to JavaScript objects, and `arrayBuffers` is the buffer portion of that, so it is already included in `external`; do not add them. `rss` is the operating system's resident memory for the whole process, not a V8 figure, and it can stay high after the heap shrinks. One sample proves nothing about a leak; look at a series after idle time, then take snapshots. In a Worker, `rss` stays process-wide while the others describe that isolate.

**Follow-up:**

`heapUsed` and `arrayBuffers` returned to baseline after traffic; RSS did not. Conclude?

Answer: It means the JavaScript heap and tracked buffers were released, but the operating system still counts those pages as resident. Causes include allocator retention, a native addon, or the OS not reclaiming yet. It does not prove by itself that a closure is still holding the buffers.

### NODE-009 — Heap objects, small integers, and Buffer backing stores

**Difficulty:** Senior

**Category:** Memory

**Question:**

Where do values live in Node 20/22? Cover ordinary objects, numbers, strings, closures, and `Buffer`. Separate ECMAScript's value model from V8 representation and Node buffer allocation. No invented "large" byte threshold.

**Answer:**

Objects, arrays, functions, and closure environments live on the V8 heap. In the language, numbers are IEEE-754 doubles, but V8 stores small integers directly as Smis and other numbers as heap objects. Strings are heap objects too. A `Buffer` is a `Uint8Array`: a small wrapper on the heap with its bytes stored outside it. `Buffer.alloc` zeroes memory, while `allocUnsafe` may expose leftover bytes, and small unsafe allocations are cut from a shared 8 KiB pool by default.

**Trade-offs:**

Prefer `alloc`/`allocUnsafeSlow` when the buffer may leave partly unwritten or must not pin the pool. `allocUnsafe` only when you overwrite every byte before expose.

**Follow-up:**

Why can two closures from one call retain a multi-MB buffer when only one mentions it?

Answer: A closure's environment belongs to one call, not to individual variables. If two closures come from the same call, both keep that environment alive, so a closure that uses only `id` can still retain `payload`. Split the scopes or copy out the small field, and confirm with a heap snapshot.

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

### NODE-011 — The function Node wraps around every CommonJS file

**Difficulty:** Intermediate

**Category:** Modules

**Question:**

Where do `exports`, `require`, `module`, `__filename`, and `__dirname` come from in CommonJS? Why is top-level `var` not global, and why is top-level `return` legal? Separate Node's loader from ECMAScript. Node 20/22.

**Answer:**

ECMAScript does not define those names. Node wraps each CommonJS file in a function and passes `exports`, `require`, `module`, `__filename`, and `__dirname` as parameters, with `this` set to the original `module.exports`. That explains the behavior: a top-level `var` is local to the wrapper, and a top-level `return` is legal because you are inside a function. Top-level `await` is a syntax error. Also, `exports.foo = ...` adds to the shared object, but `module.exports = ...` replaces it, and callers receive the new one.

**Code:**

```js
module.exports = { label: 'replaced' }; // callers get this; exports/this stay on the old object
```

**Follow-up:**

What does `require.main === module` test?

Answer: It checks whether the current file is the entry point, because Node sets `require.main` to the entry module. The ES module counterpart, `import.meta.main`, exists only in newer releases such as Node 22.18 and 24.2, not on Node 20 or earlier Node 22 versions.

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

### NODE-014 — Cycles: partial CommonJS exports, ESM temporal dead zone, and the cross-boundary error

**Difficulty:** Advanced

**Category:** Modules

**Question:**

Two modules need each other. Describe observables for a pure CommonJS cycle, a pure ESM cycle that reads during evaluation vs only from a later function, and a cycle that crosses `require` into ESM. Node 22.12+ / 20.19+ with `require(esm)`.

**Answer:**

In CommonJS, the module is added to the cache before its code finishes, so a cyclic `require` returns the partially filled exports object without an error; you just see missing fields. In ES modules, bindings are linked first and evaluated afterward. A `let` or `const` export is uninitialized until its line runs, so reading it too early throws a `ReferenceError`, while functions called later work fine. A CommonJS file that requires an ES module that cycles back throws `ERR_REQUIRE_CYCLE_MODULE`. Break cycles by moving a `require` or `import()` into a function, or by merging the files.

**Follow-up:**

Can `export function` on both sides of an ESM cycle call each other from those bodies?

Answer: Yes, once both modules have finished evaluating, because function declarations are initialized at link time. A call during evaluation is still order-sensitive if the called function reads a `let` or `const` that has not been initialized yet.

### NODE-015 — How Node decides a file is CommonJS or ESM

**Difficulty:** Senior

**Category:** Modules

**Question:**

Given a path, how does Node 20/22 decide CommonJS vs ESM? Cover extensions, nearest `package.json` `"type"`, absent `"type"`, and resolution differences that bite when moving relative `require` to `import`.

**Answer:**

Node first looks at the extension: `.mjs` is ESM and `.cjs` is CommonJS. For `.js`, it uses the nearest `package.json`: `"type": "module"` means ESM, and `"commonjs"` or no field means CommonJS. When you move from `require` to `import`, resolution gets stricter. CommonJS lets you omit extensions and load a directory's `index`, but ESM relative imports need the full file name. Package entry points come from `exports` or `main`. JSON imports need `with { type: 'json' }`.

**Trade-offs:**

`"type": "module"` + `.cjs` for legacy, or default CJS + `.mjs` for new files. Prefer explicit extensions for files that must ignore parent `"type"`.

**Follow-up:**

Root `"type": "module"` and `tools/package.json` with `"type": "commonjs"`—both `.js` styles work. Why?

Answer: Node uses the nearest `package.json` above each file, not the working directory. The nested `tools/package.json` applies to files under `tools/`, and the root setting applies everywhere else. Neither overrides the other.

### NODE-016 — __dirname, import.meta.url, and import.meta.dirname

**Difficulty:** Intermediate

**Category:** Modules

**Question:**

A library needs the directory of the current file for `./templates/email.txt` beside the source (on-disk files). Show CommonJS, portable ESM, and the Node shortcut. Pin versions and the `file:` caveat. Node 20 and 22.

**Answer:**

In CommonJS, `__dirname` and `__filename` are wrapper parameters that give the file's own location, not the working directory. ES modules do not have them. Instead, `import.meta.url` is the module's URL, so `new URL('./templates/email.txt', import.meta.url)` works portably, or you can use `fileURLToPath` with `dirname`. Node also offers `import.meta.dirname` and `import.meta.filename`, available from 20.11 and 21.2, for `file:` modules only. Use the portable form if you support older Node, and avoid `process.cwd()` for package assets.

**Follow-up:**

If this helper is imported from three directories up, whose directory does `import.meta.url` use?

Answer: The helper's own file. `import.meta.url` always refers to the module that contains the expression, not the entry file or the importer. It works the same way as `__dirname`.

### NODE-017 — require() of an ES module on Node 20.19 and 22.12

**Difficulty:** Advanced

**Category:** Modules

**Question:**

On which Node 20/22 versions can CJS `require` an ES module, what does it return, which graphs throw, and how do you detect support? Distinguish experimental history from behavior you rely on. Cover top-level await and cross-boundary cycles.

**Answer:**

This is a Node feature, not part of ECMAScript. From Node 20.19 and 22.12, CommonJS can `require` an ES module without a flag; earlier versions throw `ERR_REQUIRE_ESM` or need a flag. It returns the module's namespace object. It throws `ERR_REQUIRE_ASYNC_MODULE` if the graph contains top-level await, and `ERR_REQUIRE_CYCLE_MODULE` for cycles that cross from CommonJS into ESM. You can detect support with `process.features.require_module`. The older fallback is dynamic `import()`, which returns a promise.

**Trade-offs:**

`import()` works on older Node and async graphs but forces promises. `require(esm)` keeps sync factories but needs the version floor and bans TLA.

**Follow-up:**

`require('./codec.mjs')` then `codec.encode`—module has `export function encode`, no `module.exports` interop export. What is `codec`?

Answer: `codec` is the module namespace object, so `codec.encode` works. A default export would be `codec.default`. If the ES module exports a name called `'module.exports'`, `require` returns that value instead, and `codec.encode` would stop working.

### NODE-018 — How this is chosen, including at the top of a Node module

**Difficulty:** Intermediate

**Category:** Language runtime

**Question:**

State ECMAScript rules that set `this` for a call, then apply to top-level CommonJS, top-level ESM, and a class method detached and passed to a timer. Node 20/22, no TS transforms.

**Answer:**

For a regular call, `this` is chosen by how you call the function. `obj.method()` sets `this` to `obj`. A bare `fn()` gives `undefined` in strict code and the global object in sloppy code. `call`, `apply`, `bind`, and `new` set it explicitly, and arrow functions use the surrounding `this`. Class bodies are always strict, so a detached method sees `undefined`. At the top of a CommonJS file, `this` is the original `module.exports` object, and at the top of an ES module it is `undefined`. Timers do not restore a receiver, so use an arrow function or `bind`.

**Follow-up:**

An arrow nested in a sloppy CJS function called as a bare call—what `this` does the arrow see?

Answer: The arrow uses the outer function's `this`. Since that sloppy function was called bare, its `this` is `globalThis`, so the arrow sees that too. If the outer function were strict, both would see `undefined`.

### NODE-019 — A vm context shares the isolate; a Worker does not

**Difficulty:** Advanced

**Category:** Runtime architecture

**Question:**

A plugin system must run user JS without host globals and without stalling the HTTP server forever. Compare `vm.createContext` and `worker_threads` on Node 20/22: what is shared, copied, and what neither is. Refuse a false sandbox.

**Answer:**

`vm.createContext` creates a new global object and a new set of built-ins, but it runs on the same isolate, with the same heap and thread. Node's docs say it is not a security boundary, and a synchronous infinite loop would still stall your server. A `Worker` is a separate thread with its own isolate, heap, and event loop, and it communicates through structured-clone messages. `resourceLimits` caps its V8 heap but does not stop infinite loops; `terminate()` does. Neither is a full sandbox, since CPU, network, and files still need operating-system controls.

**Trade-offs:**

Separate process for strongest blast radius; Worker for second isolate in-process; `vm` alone only for trusted templates.

**Follow-up:**

`resourceLimits` on a Worker you forgot to use—can `vm` on the main isolate still exhaust the heap?

Answer: Yes. `resourceLimits` applies only to a Worker. Code running in `vm` allocates on the main heap, so it can still exhaust the host's memory.

### NODE-020 — Object shapes: why two { id, status } objects are not the same to V8

**Difficulty:** Advanced

**Category:** V8

**Question:**

V8 uses hidden classes (maps/shapes) and inline caches. Explain at a level that changes how you write hot request records in Node 20/22. What can you say about speed, and what must you measure? No percentage claims.

**Answer:**

In the language, objects are just bags of properties. V8 tracks each object's layout with a hidden class, also called a shape, and uses inline caches to speed up property access for shapes it has seen. If a site sees many different shapes, V8 falls back to slower generic lookups. Different property order, conditionally added fields, or `delete` all produce different shapes. So create hot records in one place, with the same fields in the same order, and use `null` instead of deleting. Then profile; do not promise a specific speedup.

**Code:**

```js
function createRequestRecord(id) {
  return { id, status: 'open', retries: 0, error: null };
}
```

**Follow-up:**

Do TypeScript interfaces give V8 the shape?

Answer: No. TypeScript types are erased at compile time, so V8 only sees runtime objects. A shared constructor or factory function keeps shapes consistent, but an `as` cast does nothing.

### NODE-021 — Microtasks, process.nextTick, and the end of a turn

**Difficulty:** Senior

**Category:** Execution model

**Question:**

After the current JS stack unwinds on Node 20/22, in what order do promise reactions, `queueMicrotask`, and `process.nextTick` run? Why does top-of-ESM differ from top-of-CJS and from inside a timer? What does Node recommend instead of `nextTick`? No phase diagram.

**Answer:**

After the current JavaScript stack finishes, Node drains the `process.nextTick` queue first, then the microtask queue, which holds promise reactions and `queueMicrotask` callbacks in the order they were queued. That gives tick-before-promise order at the top of a CommonJS file or inside a timer callback. ES modules are the exception: module evaluation already runs inside microtask processing, so promises and microtasks come first, then `nextTick`. A recursive `nextTick` can starve I/O. Node 20.18 and 22.7 mark `nextTick` as legacy and recommend `queueMicrotask` for new code.

**Follow-up:**

Which queue does `await` use, and does top-level await change the nextTick story?

Answer: `await` continues as a promise reaction, so it is a microtask. Top-level await stays inside module-evaluation microtask processing, so a `nextTick` queued there still does not jump ahead of the microtasks that are draining.

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

An `async` function always returns a promise, and it runs synchronously until it hits `await`, a return, or a throw. At `await`, the operand is wrapped in a promise if it is not one, the rest of the function is scheduled as a reaction, and the function returns its promise to the caller. So the log is `start`, `A before`, `end`, then `A after` from a microtask. A throw before the first `await` rejects the promise rather than throwing to the caller. Work between awaits uses the one stack like any other function.

**Follow-up:**

Can `B after` run before `main`'s next line after `await label('B')`, and can a `readFile` callback run between `B before` and `B after`?

Answer: Yes, `B after` runs first, because `main` resumes only after `label`'s promise settles, which happens in a later microtask. And no, a file callback cannot run between `B before` and `B after`: it is an I/O callback, and the microtask queue drains first.

### NODE-023 — Stack overflow, --stack-size, and proper tail calls

**Difficulty:** Advanced

**Category:** Execution model

**Question:**

A recursive tree walk throws `RangeError: Maximum call stack size exceeded` on Node 22. Explain the limit, ECMAScript proper-tail-call vs V8, and what to change. Do not quote a frame count. Tree depth is user data.

**Answer:**

Each call adds a frame to a fixed-size V8 stack. When it fills up, you get `RangeError: Maximum call stack size exceeded`. The limit depends on stack size and frame size, not on a fixed ECMAScript number. The spec requires proper tail calls in strict mode, but V8 does not implement them, so tail recursion still grows the stack. `--stack-size` can raise the limit, but it does not fix unbounded depth. The real fix is an explicit stack stored in an array, or a trampoline, so call depth stays constant.

**Follow-up:**

Tail-position recursive call plus `'use strict'`—why still `RangeError`?

Answer: Strict mode and ES modules do not turn on tail-call optimization in V8. The call is in tail position, but V8 still pushes a new frame each time. Use an explicit array-based walk instead.

### NODE-024 — WeakRef and FinalizationRegistry do not close resources

**Difficulty:** Advanced

**Category:** Memory

**Question:**

Explain `WeakRef` and `FinalizationRegistry` for a Node 20/22 service. What is guaranteed, what is refused, and when is explicit `close()` required? Correctness must not depend on finalizer timing.

**Answer:**

A `WeakRef` points to an object without keeping it alive. `deref()` returns the object or `undefined`, with no promise about when. A `FinalizationRegistry` may call your callback after an object is collected, passing a held value rather than the object, and it also gives no timing guarantee. So never rely on a finalizer to close sockets, files, or locks. Use explicit `close()` or `try/finally`. Weak references suit caches that should not extend object lifetime, but remove dead entries from the map, or it keeps growing.

**Trade-offs:**

LRU with strong refs for predictable caches; `WeakRef` only when you must not keep the value alive. Prefer `try/finally` or `using`/`Symbol.dispose` for resources.

**Follow-up:**

Module `Map` of `WeakRef(Buffer)`; all other refs dropped. What about `arrayBuffers`, and can a finalizer use the buffer?

Answer: Once the last strong reference is gone, the buffer becomes eligible for collection and is freed later. The finalizer receives only the held token, never the buffer. If `arrayBuffers` stays flat, something still holds a strong reference, so take a heap snapshot.

### NODE-025 — One package, both import and require, without two copies of the state

**Difficulty:** Staff-Level

**Category:** Modules

**Question:**

A library has a process-wide connection counter and a class used with `instanceof`. Some Node 22 apps `import`; some Node 20 apps `require`. How do you publish one copy of that state, and what fails if `exports` points `import` and `require` at two stateful files?

**Answer:**

If `exports` points `import` and `require` at two different files, Node loads two separate modules, so you get two counters and `instanceof` fails across them. The state must live in one module record. On Node 20.19+ and 22.12+, publish a single synchronous ES module for both, with no top-level await, and set `engines`. On older versions, keep the state in one CommonJS file and have the ESM entry only re-export from it. Then test, in one process, that `import` and `require` share the same counter and class.

**Follow-up:**

Identity test passes, but `import { connections }` stays `0` after `require(...).opened()` where ESM re-exports a CJS number property. Why?

Answer: A named import of a CommonJS number copies it once, so later changes to the exports object are invisible. Re-export a function or getter and test that, rather than a copied primitive.

### NODE-026 — Strict mode is how an ES module is defined to run

**Difficulty:** Senior

**Category:** Language

**Question:**

A library author says strict mode is a linter setting, and CJS/ESM follow the same rules unless someone writes `'use strict'`. What does strict mode change, what is strict with no directive, and what stays sloppy inside an otherwise strict module? Node 20/22.

**Answer:**

Strict mode is a set of ECMAScript parsing and runtime rules, not a linter setting. ES modules and class bodies are always strict. CommonJS files are sloppy unless a `'use strict'` directive appears at the start of the file or function. The mode is lexical, so code created with `new Function` or indirect `eval` is parsed fresh and is sloppy unless it has its own directive. Strict mode rejects things like `with`, legacy octal literals, and duplicate parameters, and it makes undeclared assignment throw a `ReferenceError`. A bare function call gets `this` as `undefined`.

**Follow-up:**

`'use strict'` inside one function of a sloppy CJS file—what else changed?

Answer: Only that function, and the functions nested inside it, become strict. Sibling functions stay sloppy. A class in the same file is strict regardless.

### NODE-027 — The temporal dead zone is a ReferenceError at run time

**Difficulty:** Intermediate

**Category:** Language

**Question:**

A candidate says "`let` is not hoisted, so reading it early is a syntax error." Explain the TDZ as a runtime fact using `let`/`const`/`class`, a default parameter, and `typeof`. ECMAScript (Node or browser). Contrast with parse failures.

**Answer:**

When a scope is created, `var` and function bindings are initialized, but `let`, `const`, and `class` bindings exist uninitialized until their declaration runs. That gap is the temporal dead zone. Reading or writing a binding inside it throws a `ReferenceError` at run time, so earlier lines may already have executed. Even `typeof` throws there, unlike `typeof` on a name that was never declared, which returns the string `undefined`. Default parameters are evaluated left to right, so `f(a = b, b = 1)` throws. A syntax error is different: it stops the file from running at all.

**Follow-up:**

`switch (n) { case 1: let x = 1; case 2: let x = 2; }`—what fails?

Answer: That is a parse error, because both `let x` declarations are in the same switch block. Wrap each case in its own braces. Then reading `x` before its declaration becomes the runtime TDZ `ReferenceError`.

### NODE-028 — unhandledRejection and uncaughtException decide whether the process dies

**Difficulty:** Senior

**Category:** Process

**Question:**

On Node 20/22 (default flags), a floating `async` function throws and a `setTimeout` callback throws. Name each event, default process behavior with no listeners, and what installing a listener changes.

**Answer:**

An `async` function that throws gives you a rejected promise, not a synchronous throw. If nothing handles it by the end of that turn, Node emits `unhandledRejection`. Since Node 15, the default mode treats that as an uncaught exception and exits with code 1, unless you install a listener. A throw inside a `setTimeout` callback triggers `uncaughtException`, which also exits by default. Adding a listener suppresses the exit, but the process may be in an unknown state, so log, clean up, and exit. `uncaughtExceptionMonitor` observes without suppressing.

**Trade-offs:**

Crash-and-restart is the safe default. Log listeners should set non-zero `exitCode` and stop work—not swallow forever.

**Follow-up:**

Reject, then `.catch` inside `setTimeout(0)`. Events? Exit?

Answer: `unhandledRejection` fires at the end of the turn where the promise was created, and the later `.catch` triggers `rejectionHandled`. If you have an `unhandledRejection` listener, the process does not crash. Without one, the default behavior can exit the process before the timer ever runs.

### NODE-029 — process is one Node global, shared with node:process

**Difficulty:** Intermediate

**Category:** Process

**Question:**

A teammate says `process` is an ECMAScript built-in like `Math`, and an ES module must import it or get `ReferenceError`. What is `process`, where does the identifier resolve, and what does `import from 'node:process'` return? Node 20/22.

**Answer:**

`process` is a Node host object, not part of ECMAScript. It lives on the global object as `globalThis.process`, and the bare name `process` resolves there in both CommonJS and ES modules, so no import is needed. `import process from 'node:process'` gives you the same object; it just makes the dependency explicit. A local variable or parameter named `process` can shadow it without changing the global. Each Worker gets its own `process` object.

**Follow-up:**

Why is `pid` still readable after deleting a local named `process`, and what do `Object.keys(globalThis)` say?

Answer: A free `process` name resolves to the global object, so deleting a local does not matter. It is non-enumerable, so `Object.keys(globalThis)` omits it. Use `Object.getOwnPropertyDescriptor` to see the getter.

### NODE-030 — Buffer.alloc zeroes; allocUnsafe can expose leftover bytes

**Difficulty:** Senior

**Category:** Security

**Question:**

Review a helper that uses `Buffer.allocUnsafe` and sometimes returns before every byte is written. Explain the disclosure bug, the pool, and when `alloc`, `allocUnsafe`, and `allocUnsafeSlow` are right. Node 20/22, default `poolSize` 8192. No timings.

**Answer:**

`Buffer.alloc` zero-fills memory, so its contents are always defined. `Buffer.allocUnsafe` skips that, so the buffer can contain leftover data from earlier use, such as tokens or other requests. It is safe only if you overwrite every byte before exposing it; a short write leaves a dirty tail. Small unsafe allocations, below half the pool size (4096 bytes by default), are slices of a shared pool, so `.buffer` exposes neighboring data too. `allocUnsafeSlow` skips the pool but is still not zeroed. Prefer `alloc` for anything logged or sent.

**Follow-up:**

Why do `allocUnsafe(4096)` and `allocUnsafe(4095)` differ under default pool size for `.buffer` disclosure?

Answer: Under the default pool size, only allocations smaller than 4096 bytes come from the shared pool. So 4095 bytes is a view into the pool whose `.buffer` includes neighbors, while 4096 gets its own `ArrayBuffer`. Both are uninitialized. Read the live `Buffer.poolSize` value instead of assuming it.

### NODE-031 — JSON.parse allocates the whole value before it returns

**Difficulty:** Senior

**Category:** Memory

**Question:**

A handler `JSON.parse`s a large body on the main thread. What appears on the heap, what does peak include besides the finished object, and what does a reviver change or not? No invented byte ratios.

**Answer:**

`JSON.parse` is synchronous: it reads the whole input and builds the whole JavaScript value before returning. At peak, memory holds both the input text and the resulting object graph. Numbers become float64, so integers beyond `Number.MAX_SAFE_INTEGER` silently lose precision. A reviver runs afterward, bottom-up, on values that already exist, so it does not make parsing streaming; returning `undefined` just deletes a property after its children were allocated. Limit the body size before parsing, and do not catch an out-of-memory crash and keep serving.

**Follow-up:**

Success path keeps the original `Buffer` in a module-level debug array. What stays alive?

Answer: Every body buffer, with its backing memory, stays alive for the life of the process. The temporary string can be freed. A success-path debug array turns normal traffic into a leak, so keep bounded metadata or capture only failures.

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

On the non-`.tmp` path, `bus.on` stores `audit`, `audit` closes over the call's environment, which holds `copy`, and `bus` is module-level, so it lives for the whole process. That keeps `copy` reachable after the function returns. The chain is module, bus, listeners, `audit`, `copy`. On the `.tmp` path, the listener is removed before returning, so if the caller drops `bytes`, that `copy` can be collected. Each retained listener also counts toward the default limit of 10, which triggers a warning.

**Follow-up:**

`audit` only closes over `name`—is `copy` collectible?

Answer: Not safely. Closures from one call usually share a single environment, so `audit` can still keep `copy` alive. Create the listener in a separate scope that never sees `copy`, or avoid creating `copy`.

### NODE-033 — Which module body runs first

**Difficulty:** Senior

**Category:** Modules

**Question:**

For an acyclic graph on Node 20/22 (native loader), when do ESM module bodies run, and how does that differ from CJS `require`? The candidate thinks source order in the file is execution order.

**Answer:**

For ES modules, Node first links the whole graph, then evaluates dependencies depth-first in import order. A module's body runs only after its imports finish, and each module runs once. Imports are hoisted, so a log above an `import` line still runs after the imported module's body. CommonJS is different: `require` is an ordinary call in the middle of the file, so code before it has already run, then the dependency runs fully, and then your file continues. Source order matters in CommonJS, but not for ESM imports.

**Follow-up:**

Entry also imports `b` above `a`, and `a` imports `b`. What changes?

Answer: `b` still runs only once. The entry's first unfinished dependency goes first, so the order is `b`, then `a`, then the entry. The entry body cannot run in the middle of its dependencies.

### NODE-034 — Top-level await is an ES module syntax

**Difficulty:** Senior

**Category:** Modules

**Question:**

Someone wants `await fetchConfig()` at the top of a CommonJS file. Where is top-level await legal, what happens to static importers, and what does `require` do when the graph contains it? Node 20 and 22.

**Answer:**

Top-level await is valid only in ES modules. In a CommonJS file it is a parse error, and `'use strict'` does not help, though you can still use an `async` function there. When an ES module uses top-level await, its importers wait for it to finish before running their bodies, but the event loop is not frozen. A graph that contains top-level await cannot be loaded with `require`: on 20.19+ and 22.12+ it throws `ERR_REQUIRE_ASYNC_MODULE`. Libraries meant to be required should export an async `init()` instead.

**Follow-up:**

Importer has no await; it imports `config` which imports `plugin` with TLA. `require` of the importer on 22.12?

Answer: It throws `ERR_REQUIRE_ASYNC_MODULE`, because the whole graph counts as async if any dependency uses top-level await. The `--experimental-print-required-tla` flag shows where it comes from.

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

### NODE-036 — Where the event-loop phase diagram belongs

**Difficulty:** Intermediate

**Category:** Event loop

**Question:**

A candidate starts drawing libuv phases to answer which of `setTimeout(fn, 0)` and `setImmediate(fn)` runs first. Stop them. What can a foundations answer commit to, and where does the diagram belong? Node 20/22.

**Answer:**

A foundations answer should only commit to this: both calls schedule work for a later turn, so the current code finishes first, and promise reactions from the current turn run before either one. Neither is a microtask or `nextTick`. Which of the two runs first depends on where the event loop is when you schedule them, which is a question about event-loop phases, covered in the next section. It is not a universal language rule, and at the top level it can vary by machine because of timer rounding.

**Follow-up:**

Can a `queueMicrotask` scheduled just before these two run after either?

Answer: No. Microtasks drain as soon as the current turn finishes, and both timers belong to later turns. Phases decide how the timer and immediate are ordered relative to each other and to I/O, not relative to this turn's microtasks.

### NODE-037 — process.exit, exitCode, beforeExit, and the exit event

**Difficulty:** Senior

**Category:** Process

**Question:**

Explain how a Node 20/22 process finishes: natural end of the loop, `process.exitCode`, `process.exit`, `beforeExit`, and `exit`. Include unflushed writes. Note Node 20.0's `exitCode` typing.

**Answer:**

When the loop has no referenced work left, Node emits `beforeExit`, which can schedule more work and repeat, and then it emits `exit` and the process ends. `process.exitCode` sets the status for a graceful finish, and Node 20 accepts a number or an integer string. `process.exit(code)` skips `beforeExit`, runs `exit` listeners synchronously, and ends immediately, so pending async output such as the last stdout line can be lost. `exit` listeners must be synchronous, and assigning `exitCode` there changes the final status. The better pattern is to set `exitCode`, close servers, and let the loop drain.

**Follow-up:**

`exitCode = 3`, then in `exit` set `exitCode = 7` and schedule a timer. Print? OS status?

Answer: On the natural path, `beforeExit` sees 3 and `exit` sees 3. The timer scheduled in `exit` never runs, and the operating system gets status 7.

### NODE-038 — process.env values are strings

**Difficulty:** Intermediate

**Category:** Process

**Question:**

A service compares `process.env.PORT` to number `3000` and takes the wrong branch. What does `process.env` store, what does assignment do, how do you delete, and what about Windows case / workers? Node 20/22.

**Answer:**

`process.env` values are always strings, or `undefined` if unset, so `'3000' === 3000` is false. Read the value with a default, then convert and validate it, for example with `Number`. Assigning a value converts it to a string, and changes do not affect the parent shell. `delete process.env.NAME` unsets a variable, while an empty string means set but empty. On Windows, names are case-insensitive, but on POSIX they are case-sensitive. Workers get a copy of the environment unless you pass `SHARE_ENV`.

**Follow-up:**

Is `const snapshot = { ...process.env }` at startup the same as later reads? Safe to log?

Answer: No. The spread makes an ordinary object copy, and neither side tracks later changes. It may also contain secrets, so log only an allowlist of keys or just their lengths, not the whole object.

### NODE-039 — emit runs listeners on the current stack, and error is special

**Difficulty:** Senior

**Category:** Events

**Question:**

Explain `EventEmitter` on Node 20/22: when listeners run, what `'error'` does with no listener, and what an `async` listener does by default (`captureRejections` off). Tie retention to per-request listeners on a long-lived bus.

**Answer:**

`emit` calls listeners synchronously, in the order they were registered, and returns only after all of them have run. A synchronous throw propagates out of `emit`. If you emit `'error'` with no listener, the error is thrown. By default, an `async` listener's rejection is not sent to `'error'`; it follows the normal unhandled-rejection rules, unless you set `captureRejections: true`. Listeners are strong references, so adding one per request on a long-lived emitter without removing it retains each request's data. The default limit of 10 is a warning tripwire, not a budget.

**Follow-up:**

`{ captureRejections: true }` on one emitter—what changes for async throws, and for other emitters?

Answer: On that emitter, a rejected async listener is routed to `'error'`, and without an `'error'` listener it throws. Other emitters keep the default rejection behavior unless you change the module-wide default.

### NODE-040 — Which clock to use for a duration

**Difficulty:** Intermediate

**Category:** Process

**Question:**

You need handler duration on Node 20/22. Someone logs `Date.now()` at start and end. When is that wrong, and what should you call instead? No invented resolution numbers.

**Answer:**

`Date.now()` reads the wall clock, which NTP or the user can adjust, so the difference between two readings can be negative or inflated. Use it for timestamps meant for humans or other systems. To measure durations, use a monotonic clock, one that only moves forward. `performance.now()` returns milliseconds as a float, and `process.hrtime.bigint()` returns nanoseconds as a bigint. A good log line records the wall-clock time and a separate monotonic `durationMs`.

**Follow-up:**

Can `performance.now()` and `hrtime.bigint()` disagree which of two non-overlapping handlers was slower?

Answer: Each clock is valid for its own measurements, so the real risk is mixing them. Pick one clock per histogram and don't convert between them. Both include time spent waiting in `await`, so they show user-visible latency, not CPU time.

### NODE-041 — structuredClone copies a graph JSON cannot

**Difficulty:** Senior

**Category:** Language

**Question:**

A cache holds objects with `Date`s, `Map`s, cycles, and sometimes functions/class instances. Someone clones with `JSON.parse(JSON.stringify(value))`. What is lost, and what does `structuredClone` do on Node 20/22?

**Answer:**

JSON round-tripping loses a lot: functions and `undefined` values are dropped, `Date` becomes a string, `Map` and `Set` become empty objects, and cycles and `BigInt` throw. `structuredClone`, global since Node 17, preserves cycles, `Date`, `Map`, `Set`, `RegExp`, and typed arrays. It throws a `DOMException` for functions. Class instances become plain objects without methods, and a `Buffer` becomes a `Uint8Array`. The clone is a deep copy, so peak memory includes both graphs.

**Trade-offs:**

Hand-written copy when you need class/`Buffer` identity; JSON when the contract is JSON; `structuredClone` for data with dates/maps/cycles.

**Follow-up:**

Clone an object holding a small pooled `allocUnsafe` view—does the clone share the slab?

Answer: It creates a new `Uint8Array` containing only the view's own bytes, not the whole slab. The original still shares the pool. Cloning does not clean any uninitialized bytes in the source.

### NODE-042 — AbortController marks a signal; it does not unwind the stack

**Difficulty:** Senior

**Category:** Process

**Question:**

Explain `AbortController` on Node 20/22. A teammate expects `abort()` to stop a running function like a thread interrupt. Correct the model for a loop, a timer, and a promise. `AbortSignal.any` needs a version pin.

**Answer:**

`abort()` sets `signal.aborted`, stores a reason, and fires the `'abort'` event synchronously. A second call does nothing. It does not interrupt running code the way a thread interrupt would, so a loop must check `signal.aborted` or call `throwIfAborted()` between chunks. APIs that accept `{ signal }`, such as `fetch` and the `timers/promises` functions, reject when aborted. `AbortSignal.timeout(ms)` creates a signal that aborts after a delay, and `AbortSignal.any`, added in Node 20.3, combines signals. Abort listeners stay strongly referenced until they fire or you remove them.

**Follow-up:**

`abort('stopped')` then `throwIfAborted`; then `abort(new Error('other'))`?

Answer: `throwIfAborted()` throws the string `'stopped'` itself, not wrapped in an error. The second `abort` is ignored, so the reason stays the same and no second event fires.

### NODE-043 — node:fs and fs are one builtin, and some builtins require the prefix

**Difficulty:** Senior

**Category:** Modules

**Question:**

How does Node 20/22 load builtins? When are `fs` and `node:fs` the same? Which APIs load a builtin without a static `import`? Include `process.getBuiltinModule` and its version gate.

**Answer:**

Built-in modules are compiled into the Node binary. `fs` and `node:fs` resolve to the same module, but the `node:` prefix cannot be shadowed by a package in `node_modules`. A few modules, such as `node:test`, work only with the prefix. `process.getBuiltinModule(id)`, added in Node 20.16 and 22.3, loads a built-in synchronously and returns `undefined` if there is no such module. It ignores any stub placed in `require.cache`. `fs` and `fs/promises` are separate entries. In normal application code, prefer a static `import 'node:fs'`.

**Follow-up:**

Cache stub for `fs`, then `getBuiltinModule('fs')` vs `require('fs')` on 22.3?

Answer: `require('fs')` returns your stub, while `getBuiltinModule('fs')` returns the real built-in module.

### NODE-044 — dynamic import() loads on a later turn, once

**Difficulty:** Senior

**Category:** Modules

**Question:**

Explain dynamic `import()` on Node 20/22: when the body runs, what a second `import()` of the same URL does, how errors surface. Contrast with static evaluation order. Legal from CJS and ESM.

**Answer:**

`import()` returns a promise, and a module that has not been loaded yet runs on a later turn, not inside the call. The promise fulfills with the module namespace; if the module uses top-level await, it stays pending until that finishes. A second `import()` of the same resolved URL reuses the same module record, so the body runs once, and that record is shared with static imports. Failures reject the promise, so a `try/catch` without `await` misses them. From CommonJS, `import()` is how you load ES modules, or graphs with top-level await.

**Follow-up:**

Two back-to-back `import('./plugin.mjs')` without awaiting—how many body runs?

Answer: The body runs once. Both calls join the same in-flight module record.

### NODE-045 — error.code, error.cause, and AggregateError

**Difficulty:** Senior

**Category:** Errors

**Question:**

`readFileSync` fails on a missing path; a helper fails for two reasons; a wrapper adds context. Explain the error objects on Node 20/22 and which fields are language vs Node. Reject matching by message text.

**Answer:**

Operating-system failures are `Error` objects with Node-specific properties such as `code`, for example `'ENOENT'`, plus `syscall` and `path`. Branch on `code`, not on the message text. `cause` is part of ECMAScript: `new Error(msg, { cause })` links the original error and keeps its stack. `AggregateError` has an `errors` array, and `Promise.any` throws one when everything rejects; the codes are on the elements, not on the aggregate itself. Do not rethrow with `new Error(err.message)`, since that drops `code` and the original stack.

**Follow-up:**

Catch the `readConfig` wrapper—ENOENT vs permission without parsing strings?

Answer: Walk the `cause` chain until you find an error with a `code`, then compare it to `'ENOENT'` or `'EACCES'`. Or copy `code` onto the wrapper error and test that.

### NODE-046 — console.log writes to stdout, and the write may block

**Difficulty:** Senior

**Category:** Process

**Question:**

Explain `console.log` / `console.error` on Node 20/22: when writes are sync vs async, and how `process.exit` can lose a line. Cover files, TTYs, and pipes (POSIX vs Windows per Node docs).

**Answer:**

`console.log` and `console.info` write to stdout, while `console.error` and `console.warn` write to stderr. Whether the write is synchronous depends on the destination. Files are synchronous. TTYs are asynchronous on Windows but synchronous on POSIX. Pipes and sockets are synchronous on Windows but asynchronous on POSIX. Synchronous writes block the loop, while async writes may still be queued when you call `process.exit`, so the last line can be lost. Prefer setting `exitCode` and letting output drain, and keep diagnostics on stderr so redirecting stdout does not hide stack traces.

**Follow-up:**

Stdout redirected to a file; stderr on a POSIX TTY. Which can block? Which can be lost on `process.exit`?

Answer: Both are synchronous here, since stdout is a file and stderr is a POSIX TTY, so both can block, and neither can be lost on exit. The lost-line case applies to asynchronous pipes: if stderr were a pipe, the last `console.error` before `exit` could vanish.

### NODE-047 — Atomics.wait blocks the thread it is called on

**Difficulty:** Advanced

**Category:** Language

**Question:**

A teammate wants to pause the main thread of a Node 20/22 server until another thread signals, using `Atomics.wait`. What does it do, how do browsers differ, and what should a live server use instead?

**Answer:**

`Atomics.wait` blocks the thread that calls it until another thread notifies it, the value changes, or a timeout expires. It returns `'ok'`, `'not-equal'`, or `'timed-out'`. While blocked, that thread runs no JavaScript, timers, or I/O. Browsers forbid it on the main thread, but Node allows it, so a server that does this stops serving. A live server should use `Atomics.waitAsync` or promises, or do the blocking wait on a worker. It requires a `SharedArrayBuffer`.

**Follow-up:**

`Atomics.wait(view, 0, 0)` with no timeout inside an HTTP handler—next request?

Answer: The main JavaScript thread is stuck until a notification arrives. The operating system may accept connections, but no JavaScript handles the next request. Use `waitAsync`, or a worker and a message.

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

It prints `before 3`, then `exit 3`. `late` never prints, and the operating system sees status 7. Setting `exitCode` does not exit by itself; with no referenced work left, Node takes the natural path, so `beforeExit` runs with 3, then `exit` runs with 3. Inside `exit`, the code assigns 7 afterward, and Node uses the final `exitCode` for the process status. Timers scheduled in an `exit` listener never run, because the loop does not run again.

**Follow-up:**

`setTimeout(() => {}, 0)` at the top of `beforeExit`—output?

Answer: The first `beforeExit` prints 3, and the timer keeps the process alive. After it fires, `beforeExit` runs again with 3, then `exit` runs with 3, and the status is 7. `late` still never prints, because `beforeExit` may postpone exit, but `exit` cannot.

### NODE-049 — Error.stack is the stack from when the error was created

**Difficulty:** Senior

**Category:** Errors

**Question:**

A helper builds `new Error('early')`; a timer throws that object later. The log points at the helper, not the timer. When is the stack captured? What do `Error.stackTraceLimit` and `Error.captureStackTrace` change? What is V8 vs ECMAScript? Node 20/22.

**Answer:**

ECMAScript defines `Error` and `throw`, but not the format of `stack`. V8 captures the stack when the error object is constructed, not when it is thrown, so throwing the same object later from a timer does not add the timer's frames. `Error.stackTraceLimit` caps how many frames are captured, ten by default. `Error.captureStackTrace` writes a stack onto an object and can hide a helper frame. If you need the throw site, create the error there, or wrap it with `{ cause }`. `--enable-source-maps` only remaps the printed text.

**Follow-up:**

Subclass of `Error` forgets `super` / `captureStackTrace`—why empty/useless `stack`?

Answer: V8 records the stack only when `Error`'s constructor runs, or when you call `captureStackTrace`. Setting `this.message` alone does not do it. Call `super(message)`, and pass your subclass as the second argument to `captureStackTrace` to hide its constructor frame.

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

`({}).admin` becomes `true`, which is prototype pollution. `JSON.parse` alone is not the culprit: it creates an own data property literally named `__proto__` without calling the setter, so `({}).admin` is still undefined after parsing. The recursive walk causes the damage. `target['__proto__']` returns `Object.prototype`, and the recursive call then assigns `admin` onto it. Also block `constructor` and `prototype`. The fix is to skip those keys before any read or write, and consider `Object.create(null)` or `Object.hasOwn` checks. Ordinary keys like `user` still work.

**Follow-up:**

Change the walk to `Object.defineProperty(...)`—does `__proto__` still pollute?

Answer: That stops the direct assignment, because `defineProperty` creates an own data property without using the setter. But if the recursion first reads a blocked key like `__proto__`, it can still reach the prototype. Skip blocked keys before doing anything with them.
