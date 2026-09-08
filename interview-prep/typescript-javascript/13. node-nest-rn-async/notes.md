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

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
