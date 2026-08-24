# Node, NestJS, and React Native Async Notes

## What you need to know

The **core JS model is portable**: one call stack, microtasks vs macrotasks, Promises, `async/await`. What changes by platform is **host scheduling details** (Node phases, `nextTick`) and **what sits beside the JS thread** (RN native UI / bridge, Nest’s HTTP lifecycle and exception filters).

This unit is **awareness + interview framing**, not a second full event-loop course. Keep [event-loop](../event-loop/notes.md) as the primary model; use this for Node/Nest/RN deltas.

Curriculum checklist this unit completes:

- `process.nextTick` runs before Promise microtasks (Node-only, higher priority)
- Node macrotask phases (timers → … → poll → check/`setImmediate` → close) — awareness, not memorization-critical
- RN JS thread = same event-loop model (Hermes/JSC); native UI is separate
- Nest `async` handlers: unhandled rejections vs Nest exception handling

---

## Shared baseline (do not unlearn)

Across browser, Node, and RN JS:

- Single JS thread per realm/worker
- Sync code runs to stack empty
- Promise reactions / `await` resumes → **microtasks**
- `setTimeout` → **task/timer** style macrotask
- Long sync work blocks that JS thread’s callbacks

Platform notes **add** APIs and host threads; they do not replace that story for your JS.

---

## Node: `process.nextTick`

### What it is

`process.nextTick(fn)` schedules `fn` on Node’s **nextTick queue**, which drains **before** ordinary Promise microtasks (`queueMicrotask` / `.then`).

```js
setTimeout(() => console.log('timeout'), 0);
Promise.resolve().then(() => console.log('promise'));
process.nextTick(() => console.log('nextTick'));
console.log('sync');
// sync, nextTick, promise, then timeout (typical)
```

### Why it exists / why it matters

Historically used to run something “immediately after this operation, before I/O.” Libraries and older patterns still use it. Flooding `nextTick` starves I/O and timers **even harder** than a Promise microtask flood — the queue never yields to the rest of the loop.

### Practical rule

Prefer **`queueMicrotask`** or Promises in application code for portable intent. Know `nextTick` for interviews and Nest/Node debugging. Do not build recursive `nextTick` pumps.

### Not a browser API

There is no `process.nextTick` on web/RN JS globals (unless polyfilled). RN does not give you Node’s nextTick semantics on the JS thread.

---

## Node: event-loop phases (awareness)

Node’s loop is often taught as phases (simplified):

```
timers          → setTimeout / setInterval due callbacks
pending callbacks → some system callbacks
idle / prepare  → internal
poll            → retrieve new I/O events; wait for connections/data
check           → setImmediate callbacks
close callbacks → e.g. socket.on('close')
```

Between phases (and when appropriate), Node drains **nextTick** then **microtasks** — exact interleaving details are deeper than most interviews require.

### What is interview-enough

| API | Bucket to say out loud |
|---|---|
| `process.nextTick` | Before Promise microtasks |
| Promise / `queueMicrotask` | Microtasks |
| `setTimeout` / `setInterval` | Timers phase |
| `setImmediate` | Check phase (Node) |
| I/O callbacks | Mostly poll-related |

### `setImmediate` vs `setTimeout(0)`

Both are “soon, not sync.” Relative order can depend on how you entered the loop (timers vs check). Do **not** memorize fragile ordering puzzles; say:

> Both defer to a later macrotask-like turn; `setImmediate` is Node-specific check-phase; prefer clear APIs and avoid relying on `timeout(0)` vs `immediate` races.

Browsers: no `setImmediate` (legacy prefixes don’t count as your model).

---

## NestJS: async handlers and failures

### Convention

Controllers/services are often `async`. Nest will `await` the handler Promise in the request pipeline when you return a Promise / use `async`.

```ts
@Get(':id')
async findOne(@Param('id') id: string) {
  return this.users.findById(id); // Promise → Nest waits
}
```

### What Nest catches vs what crashes you

| Situation | Typical outcome |
|---|---|
| `throw` / rejected Promise **inside** the handler Nest is awaiting | Nest exception filters → HTTP error response (if configured) |
| Fire-and-forget Promise inside the handler with **no** catch | **Unhandled rejection** — may log/crash Node depending on flags; response may already be “success” |
| Error in a background task after you already sent the response | Same unhandled risk; client won’t see it unless you wire logging/monitoring |

```ts
@Post()
async create(@Body() dto: Dto) {
  void this.analytics.track(dto).catch((err) => this.logger.error(err));
  return this.service.create(dto);
}
```

If you omit `.catch` on `track`, you reinvent the concurrency-pitfalls unhandled-rejection bug on the server.

### Sync CPU in Nest

`async` does not move CPU off the event loop. Heavy sync work in a handler blocks **other requests** on that Node process — same single-thread lesson as the browser UI freeze, different symptom (latency).

### Practical Nest checklist

1. Let Nest await the main handler Promise; throw domain/HTTP exceptions intentionally.
2. Never leave stray Promises without `.catch` / supervised background jobs.
3. Use queues/workers for heavy or slow side work when it must not block the loop.
4. Know your Node unhandledRejection policy in production.

---

## React Native: same JS loop, different native world

### Interview answer (preserved)

**Q: Does React Native have a different event loop than the browser?**

> No — the JS thread in RN runs on a standard JS engine (Hermes or JSC) with the same single-threaded event loop, call stack, and micro/macrotask model. What’s different is the **native** side: a separate UI thread handles native rendering, and native module work crosses a bridge/JSI boundary. From **JS** async behavior, Promises, `async/await`, and `setTimeout` behave as in browser or Node.

### What that means in practice

| Layer | Role |
|---|---|
| JS thread | Your React tree, Promises, timers, most app logic |
| UI / native threads | Native views, layout, many platform APIs |
| Bridge / JSI | Crossing between JS and native |

Implications:

- A busy JS loop (large JS work) still janks interaction/logic scheduling — same as web main thread.
- Some native work is truly parallel to JS waiting; your `.then` still runs on the JS thread when the message comes back.
- RN does **not** invent a special Promise runtime. This whole async chapter transfers.

### What not to claim

- “RN is multi-threaded JS” — native is multi-threaded; **your JS** is still one stack per runtime.
- “Hermes has a different await model” — engine differences exist (perf, GC); the async **programming model** matches.

---

## Side-by-side cheat sheet

| Topic | Browser | Node / Nest | React Native (JS) |
|---|---|---|---|
| Single JS thread | Yes (per tab/worker) | Yes (per isolate / worker_thread) | Yes (JS thread) |
| Promise microtasks | Yes | Yes | Yes |
| `process.nextTick` | No | Yes (before microtasks) | No (unless polyfill) |
| `setImmediate` | No (standard) | Yes (check phase) | No |
| `setTimeout` | Yes | Yes (timers phase) | Yes |
| Extra UI thread | Browser compositor/etc. | N/A (HTTP server) | Native UI thread |
| Unhandled rejection risk | Silent/noisy failures | Can crash process | App instability / noisy logs |
| Framework await | N/A | Nest awaits controller Promises | React doesn’t auto-catch async handlers |

---

## Common mistakes and misconceptions

1. **Treating Node phases as more important than microtask-vs-macrotask** for day-to-day predict-the-output.
2. **Using `nextTick` for app-level “defer”** and starving I/O.
3. **Assuming Nest makes all async safe** — only the Promise it awaits is in the happy path; stray Promises are yours.
4. **Believing RN has a different Promise/event-loop semantics** because of the native bridge.
5. **Confusing native parallelism with parallel JS** on the RN JS thread.
6. **Relying on `setTimeout(0)` vs `setImmediate` order** in production logic.

---

## Connections to other concepts

```
portable JS async model (event loop + Promises + async/await)
  → Node adds nextTick + phases + setImmediate
  → Nest adds HTTP lifecycle awaiting handler Promises
  → RN adds native UI/bridge beside the same JS loop

nextTick / microtask floods
  → starve timers/I/O (Node) or paint (browser)
    → same starvation family

unhandled rejection
  → concurrency-pitfalls unit
    → Nest/Node production severity

long sync in Nest handler
  → single-threaded unit
    → blocks other requests on that process
```

---

## Interview perspective

You should be able to:

1. Say RN’s JS event loop matches browser/Node JS semantics; native is the difference.
2. Place `process.nextTick` before Promises; warn about starvation.
3. Sketch Node phases at awareness level; not recite every edge.
4. Explain Nest: awaited handler errors vs fire-and-forget rejections.
5. Tie server latency under CPU load to the same single-thread story as UI freeze.

---

# Self-test

## Core recall

1. Relative to Promise `.then`, when does `process.nextTick` run?
2. Name the major Node loop phases at awareness level (enough to place `setTimeout` and `setImmediate`).
3. Does RN’s JS thread use a different Promise/microtask model than the browser?
4. What is different about RN async if the JS loop is the same?
5. When Nest runs an `async` controller method, what does Nest do with the returned Promise?
6. What still can crash or destabilize a Nest/Node process despite Nest exception filters?
7. Is `setImmediate` a web standard?

## Explain why

1. Why can recursive `process.nextTick` starve I/O harder than you might expect?
2. Why is “Nest uses async handlers” not enough to claim all errors are handled?
3. Why does a CPU-heavy sync loop inside a Nest handler increase latency for unrelated requests?
4. Why is it correct to say RN has the same JS event loop as the browser but still talk about a UI thread?
5. Why shouldn’t production logic depend on `setTimeout(0)` vs `setImmediate` ordering?

## Compare and contrast

1. `process.nextTick` vs `queueMicrotask` / Promise microtasks.
2. `setTimeout` vs `setImmediate` in Node (high level).
3. Browser main thread jank vs Nest event-loop blocking (same mechanism, different symptom).
4. RN JS thread vs RN native UI thread.
5. Errors Nest exception filters see vs unhandled rejections from background Promises.
6. Portable async knowledge vs Node-only APIs.

## Predict the output

State the order **and explain why** (Node unless noted).

1.
```js
console.log('s');
process.nextTick(() => console.log('n'));
Promise.resolve().then(() => console.log('p'));
```

2.
```js
setTimeout(() => console.log('t'), 0);
process.nextTick(() => console.log('n'));
Promise.resolve().then(() => console.log('p'));
console.log('s');
```

3.
```js
// Conceptual Nest handler — what is dangerous?
async function create(dto) {
  this.repo.save(dto); // forgot await; returns Promise
  return { ok: true };
}
```

4.
```js
// RN JS (same as browser model)
console.log('a');
Promise.resolve().then(() => console.log('b'));
setTimeout(() => console.log('c'), 0);
console.log('d');
```

## Debugging

1. Node service: timers and incoming sockets feel delayed; profiling shows deep `process.nextTick` recursion in a library hook. What’s happening?

2. Nest endpoint returns 201 but the process logs `UnhandledPromiseRejection` from analytics. Walk the failure path.

3. Teammate says: “RN is multi-threaded so our JS `await` won’t block the UI thread.” What is confused? What *can* still jank?

4. Flaky test asserts `setImmediate` before `setTimeout(0)`. Why is this assertion brittle?

## Application

1. Rewrite a Node deferral from `process.nextTick` to `queueMicrotask` and state when that change is safer for portability.

2. Write a Nest controller snippet that (a) lets Nest handle a repository rejection and (b) safely fire-and-forgets a metrics call with logging.

3. Draft a 4-bullet answer comparing browser vs RN async for an interviewer who thinks RN “has a different event loop.”

4. Label each of these as portable / Node-only / RN-native-side: `setTimeout`, `process.nextTick`, Promise `.then`, bridge native module callback, Nest exception filter.

## Interview questions

1. Does React Native have a different event loop than the browser?  
   **Follow-ups:** Then why do people talk about the UI thread / bridge?

2. What is `process.nextTick` and how does it relate to Promises?  
   **Follow-ups:** Why can it be dangerous? What would you use instead in app code?

3. Explain Node’s event-loop phases at a high level.  
   **Follow-ups:** Where do `setTimeout` and `setImmediate` fit? Do you rely on their order?

4. How does Nest handle errors from `async` controllers?  
   **Follow-ups:** What errors does it *not* handle automatically?

5. Why can one heavy request slow down other requests in a Node/Nest process?

## Connections

1. How does this unit reuse the microtask-vs-macrotask rule from the event-loop unit?
2. How do Nest unhandled rejections connect to the concurrency-pitfalls unit?
3. How is RN’s “JS vs native” split analogous to “JS vs Web APIs/libuv” in the single-threaded unit?
4. When predicting output in Node, what’s the one Node-specific queue you should insert before Promises?
5. How would you explain to a mobile interviewer that learning browser async still pays off for RN?
