# The Event Loop: Call Stack, Task Queue, Microtask Queue

## What you need to know

The **event loop** is how a single-threaded JS runtime decides **what runs next** after the current call stack empties.

You need three pieces:

1. **Call stack** — what is running right now (sync, LIFO).
2. **Macrotask queue** (task queue) — timers, I/O, script turns, many host callbacks.
3. **Microtask queue** — Promise jobs, `queueMicrotask`, `async/await` continuations, etc.

**Critical rule:** after a macrotask finishes, **drain the entire microtask queue** (including microtasks scheduled while draining) **before** the next macrotask. That one fact resolves most “predict the output” interview questions.

Prerequisite: [single-threaded](../single-threaded/notes.md) (one stack; host queues callbacks). This unit is the scheduler. Promises/`async` deep dives come next; here they matter only as **queue citizens**.

Curriculum checklist this unit completes:

- Call stack (sync, LIFO)
- Macrotasks: `setTimeout`, `setInterval`, I/O, UI-related tasks, `setImmediate` (Node)
- Microtasks: Promise `.then`/`.catch`/`.finally`, `queueMicrotask`, `async/await` continuations, `MutationObserver`
- Loop algorithm: one macrotask → drain all microtasks → (maybe render) → next macrotask
- Microtask starvation of macrotasks/rendering
- Node: `process.nextTick` before other microtasks

---

## The call stack

### What it is

The **call stack** holds active function frames. The engine runs the top frame. Synchronous work pushes/pops frames until that **turn** of work is done.

Nothing from the queues starts mid-function unless that function schedules work and later returns (or hits `await`, which exits the current sync portion and schedules a continuation).

### Why it matters

Queues are only eligible when the stack for the current turn is **empty**. A busy stack = delayed timers, I/O callbacks, Promise reactions, and UI work — even if the host already finished waiting.

---

## Two queues (really: two priorities)

### Macrotasks (tasks)

Typical sources:

| Source | Notes |
|---|---|
| Initial script evaluation | The whole classic script/module evaluation turn |
| `setTimeout` / `setInterval` | Delay is a **minimum**; callback is still a macrotask |
| I/O callbacks | Network, disk (host-dependent) |
| UI events / rendering-related tasks | Browser model (simplified) |
| `setImmediate` | **Node only** (not web standard) |
| `MessageChannel` / `postMessage` tricks | Sometimes used to schedule a macrotask sooner than timers |

Running a macrotask means: pull **one** task, run it to completion (stack fills and empties).

### Microtasks

Typical sources:

| Source | Notes |
|---|---|
| `promise.then` / `.catch` / `.finally` | Reaction jobs |
| `queueMicrotask(fn)` | Explicit microtask |
| `await` continuations | Resume after awaited value settles (Promise machinery) |
| `MutationObserver` callbacks | Browser |
| `process.nextTick` | **Node only** — runs even before “ordinary” microtasks |

Microtasks are for “finish related bookkeeping before yielding to timers/UI/I/O.”

### Why two levels exist

If every Promise `.then` waited behind every timer and paint, chains would feel randomly delayed. If everything were microtasks, a busy Promise chain could starve rendering forever (and that starvation is still possible if you abuse microtasks).

---

## The event loop algorithm (memorize)

Preserved priority order:

1. Run the current synchronous script / current **macrotask** to completion.
2. Drain the **entire microtask queue** — including any new microtasks **added while draining** — until empty.
3. (Browser) Perform pending **rendering/UI** updates if it’s time to paint.
4. Pull the **next single macrotask** from the task queue and run it to completion.
5. Go back to step 2.

**Critical rule (preserved):** microtasks always fully drain before the next macrotask — even when draining enqueues more microtasks.

Simplified loop:

```
while (runtime alive) {
  runNextMacrotask();          // one task
  while (microtasks pending) {
    runNextMicrotask();        // keep going; new ones included
  }
  maybeRender();               // browsers
}
```

Node’s internal phases (timers, poll, check, …) are a finer map of **macrotask kinds**. For interviews, the **microtask-vs-macrotask** rule above is the load-bearing model; mention Node phases only if asked.

---

## Worked example (preserved)

```js
console.log('1: sync start');

setTimeout(() => console.log('2: timeout'), 0);

Promise.resolve()
  .then(() => console.log('3: promise 1'))
  .then(() => console.log('4: promise 2'));

console.log('5: sync end');

// Output:
// 1: sync start
// 5: sync end
// 3: promise 1
// 4: promise 2
// 2: timeout
```

Walkthrough:

1. Whole script is the initial macrotask: logs `1`, schedules timer macrotask, schedules first Promise microtask, logs `5`. Stack empty.
2. Drain microtasks: `promise 1` runs; its `.then` schedules `promise 2` as another microtask; that runs too — **still before any timer**.
3. Microtask queue empty → next macrotask → `timeout`.

### Prediction variant

```js
// What happens here?
setTimeout(() => console.log('A'), 0);
Promise.resolve()
  .then(() => {
    console.log('B');
    return Promise.resolve();
  })
  .then(() => console.log('C'));
setTimeout(() => console.log('D'), 0);
console.log('E');
// E, B, C, A, D  (both timeouts after all microtasks from this turn)
```

`A` vs `D` order: both macrotasks scheduled in order during the script → `A` then `D` after microtasks.

---

## `async/await` as microtask continuations

```js
async function f() {
  console.log('f1');
  await null; // roughly: schedule continuation as Promise reaction
  console.log('f2');
}

console.log('s1');
f();
console.log('s2');
// s1, f1, s2, f2
```

Causal picture (enough for this unit):

- Code before the first `await` runs **synchronously** as part of the current turn.
- The rest is scheduled like a Promise `.then` (microtask) once the awaited value is settled.
- So `f2` loses to leftover sync work (`s2`), and beats later `setTimeout(0)` macrotasks.

Full Promise semantics (states, chaining) belong in the Promises unit; the loop only cares: **continuations are microtasks**.

---

## Microtask starvation

### Preserved interview answer

**Q: Can microtasks ever prevent macrotasks (like `setTimeout` or rendering) from running at all?**

> Yes — if a microtask keeps scheduling more microtasks (e.g. a `.then` that recursively queues another `.then`), the microtask queue never empties, so the event loop never reaches the next macrotask or, in a browser, the next paint. That starvation looks like a frozen UI even though timers are “scheduled.”

```js
function flood() {
  Promise.resolve().then(flood); // never yields to timers/paint
}
flood();
setTimeout(() => console.log('never — or very stuck'), 0);
```

### Practical takeaway

- Prefer bounded work per turn.
- Don’t implement tight “loops” only with Promise microtasks when UI responsiveness matters.
- Chunk CPU work across macrotasks (`setTimeout(0)`, `MessageChannel`, `requestAnimationFrame` for frames) when you need to yield.

---

## Node nuance: `process.nextTick` vs microtasks vs `setImmediate`

| API | Bucket (interview model) |
|---|---|
| `process.nextTick(fn)` | Node **nextTick queue** — drains **before** Promise microtasks |
| Promise `.then` / `queueMicrotask` | Microtasks |
| `setTimeout` / `setInterval` | Timers (macrotask-ish) |
| `setImmediate` | Check phase (macrotask-ish; Node) |

```js
setImmediate(() => console.log('immediate'));
setTimeout(() => console.log('timeout'), 0);
Promise.resolve().then(() => console.log('promise'));
process.nextTick(() => console.log('nextTick'));
// typical: nextTick, promise, then timeout/immediate order can vary with timing —
// but nextTick before promise is the stable teaching point
```

Do **not** treat `process.nextTick` as a web API. Prefer `queueMicrotask` / Promises for portable code. Know nextTick because Nest/Node interviews love it and because nextTick floods starve even sooner than Promise floods.

---

## Rendering (browser, simplified)

Between macrotasks, browsers may paint when appropriate. Because microtasks drain first:

- A microtask flood delays paint (starvation).
- Work scheduled only as `setTimeout(0)` yields more readily to rendering than endless `.then` chains.

You don’t need the full HTML event-loop spec — you need: **microtasks before paint opportunity before the next task**, in the simplified interview model.

---

## How to predict output (method)

For any mixed snippet:

1. Run all **sync** code in the current macrotask; note what gets queued where.
2. Drain **all microtasks** (and microtasks they spawn).
3. Run the **oldest / next** macrotask; repeat from step 2.

Classify each callback:

| Call | Queue |
|---|---|
| `setTimeout` / `setInterval` | Macrotask |
| `setImmediate` (Node) | Macrotask (check) |
| `promise.then/catch/finally` | Microtask |
| `queueMicrotask` | Microtask |
| `await` resume | Microtask |
| `process.nextTick` | Before microtasks (Node) |

---

## Common mistakes and misconceptions

1. **“`setTimeout(0)` runs before Promise `.then`.”** Opposite after the same sync turn.
2. **“Microtasks run in parallel.”** Still one stack; they run one after another.
3. **“The delay argument is exact.”** It’s a minimum until the callback is eligible; the loop may be busy.
4. **Ignoring nested `.then`.** Each schedules another microtask that still beats the next timer.
5. **Assuming Node === browser.** `nextTick` / `setImmediate` are Node-specific.
6. **Thinking `await` blocks the thread.** It schedules a continuation; other JS can run before resume.
7. **Confusing “host finished I/O” with “callback ran.”** Finished host work only enqueues; the loop decides when.

---

## Connections to other concepts

```
single JS thread + empty stack required
  → event loop picks queued work
    → one macrotask
      → drain all microtasks
        → (maybe render)
          → next macrotask

Promise / async await
  → microtask continuations
    → beat setTimeout(0)

recursive microtasks
  → queue never empty
    → starve macrotasks + paint

closures
  → which variables a callback sees when it finally runs
event loop
  → when that callback is allowed to run
```

This unit is the **scheduler**. The Promises unit explains **how jobs get into** the microtask queue and how values/errors propagate.

---

## Interview perspective

You should be able to:

1. Draw stack + macrotask queue + microtask queue and narrate one full cycle.
2. State the drain-all-microtasks rule without hesitation.
3. Predict ordering for sync + `setTimeout` + Promise + chained `.then`.
4. Explain microtask starvation and UI freeze.
5. Place `await` continuation in the microtask bucket.
6. Mention `process.nextTick` only as Node-before-microtasks, when relevant.

Strong closer:

> One task runs to completion; then every microtask — including ones scheduled during that drain — runs before the next timer or I/O task. That’s why Promise callbacks beat `setTimeout(0)`.

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
