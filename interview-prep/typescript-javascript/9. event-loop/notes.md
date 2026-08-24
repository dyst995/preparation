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

# Self-test

## Core recall

1. What are the call stack, macrotask queue, and microtask queue each responsible for?
2. State the event loop priority order from “current sync/macrotask finishes” to “next macrotask.”
3. Name three macrotask sources and three microtask sources.
4. What is the critical microtask rule that unlocks most predict-the-output questions?
5. What is microtask starvation?
6. Where does `process.nextTick` fit relative to Promise microtasks in Node?
7. Is `setImmediate` available in browsers as a standard API?

## Explain why

1. Why do chained `.then` callbacks both run before a `setTimeout(0)` scheduled earlier in the same script?
2. Why can microtasks delay rendering even when timers are already due?
3. Why doesn’t a `0` delay make `setTimeout` a microtask?
4. Why does code before an `await` often log before code after an `await`, interleaved with other sync logs?
5. Why is a recursive `Promise.resolve().then(fn)` more dangerous for UI than scheduling the same work with `setTimeout(0)` repeatedly?

## Compare and contrast

1. Macrotasks vs microtasks.
2. `setTimeout(fn, 0)` vs `queueMicrotask(fn)`.
3. `process.nextTick` vs `queueMicrotask` (Node).
4. `setTimeout` vs `setImmediate` (Node) at a high level.
5. “Host operation finished” vs “JS callback executed.”
6. Call stack vs task queues.

## Predict the output

State the order **and explain why**.

1.
```js
console.log('1');
setTimeout(() => console.log('2'), 0);
Promise.resolve().then(() => console.log('3'));
console.log('4');
```

2.
```js
setTimeout(() => console.log('A'), 0);
Promise.resolve()
  .then(() => console.log('B'))
  .then(() => console.log('C'));
console.log('D');
```

3.
```js
console.log('start');
setTimeout(() => {
  console.log('timeout');
  Promise.resolve().then(() => console.log('then inside timeout'));
}, 0);
Promise.resolve().then(() => console.log('then'));
console.log('end');
```

4.
```js
Promise.resolve().then(() => {
  console.log('m1');
  setTimeout(() => console.log('t1'), 0);
});
setTimeout(() => {
  console.log('t0');
  Promise.resolve().then(() => console.log('m2'));
}, 0);
```

5.
```js
async function x() {
  console.log('x1');
  await Promise.resolve();
  console.log('x2');
}
console.log('a');
x();
console.log('b');
```

6.
```js
setTimeout(() => console.log('T1'), 0);
setTimeout(() => console.log('T2'), 0);
queueMicrotask(() => console.log('M1'));
queueMicrotask(() => {
  console.log('M2');
  queueMicrotask(() => console.log('M3'));
});
console.log('S');
```

7.
```js
// Node-flavored — say what is stable vs what might vary
process.nextTick(() => console.log('nextTick'));
Promise.resolve().then(() => console.log('promise'));
setTimeout(() => console.log('timeout'), 0);
console.log('sync');
```

8.
```js
console.log(1);
setTimeout(() => {
  console.log(2);
  Promise.resolve().then(() => console.log(3));
  console.log(4);
}, 0);
Promise.resolve().then(() => {
  console.log(5);
  setTimeout(() => console.log(6), 0);
});
console.log(7);
```

## Debugging

1. Diagnose:
```js
function paintSoon() {
  Promise.resolve().then(paintSoon);
}
paintSoon();
// UI frozen; setTimeout logs never appear
```
What’s happening? How do you fix the scheduling strategy?

2. A teammate “fixes” ordering by wrapping Promise work in `setTimeout(0)` everywhere “so it doesn’t block.” When is that helpful vs harmful?

3. Diagnose Nest/Node latency:
Handlers schedule massive chains of `process.nextTick` work. Timers and incoming I/O feel delayed. Mechanism?

4. Predict-the-output disagreement:
One engineer says timeouts always run in registration order interleaved with Promises; another uses the microtask-drain rule. Who is right for same-turn `setTimeout(0)` vs `.then`?

## Application

1. Write a tiny `enqueueMacrotask(fn)` and `enqueueMicrotask(fn)` using standard APIs (`setTimeout` / `queueMicrotask`) and demonstrate order with logs.

2. Given a large array to process without freezing the browser, sketch a chunking loop that yields with macrotasks (not microtasks) between chunks.

3. Convert this microtask flood into a version that yields to timers between iterations:
```js
function step(i) {
  if (i <= 0) return;
  Promise.resolve().then(() => step(i - 1));
}
step(1e6);
```

4. Write a quiz snippet for a peer with sync + two timeouts + two chained `.then`s, and separately write the intended output order (keep answer in a different private place — not in the study unit’s self-test style; this is for you to author).

## Interview questions

1. Explain the JavaScript event loop.  
   **Follow-ups:** Where do Promises fit? Where does `setTimeout` fit?

2. Why does `Promise.then` run before `setTimeout(0)`?  
   **Follow-ups:** What if the `.then` schedules another `.then`?

3. Can microtasks starve the UI? How?  
   **Follow-ups:** How would you structure long work instead?

4. Walk through this snippet’s output (interviewer pastes sync + timeout + promise).  
   **Follow-ups:** Change it by adding `await` — what changes?

5. What is `process.nextTick` and how is it different from `setImmediate` / Promises?  
   **Follow-ups:** Would you use it in application code?

## Connections

1. How does the single-threaded model force the existence of an event loop?
2. How does `await` connect Promise microtasks to readable async code without changing the one-stack rule?
3. How do closures determine *what* a queued callback sees, while the event loop determines *when* it runs?
4. When a `fetch` finishes, which part is “host done” vs “microtask/macrotask runs your `.then`”?
5. How would microtask starvation show up differently in a React UI vs a NestJS server process?
