# JavaScript Is Single-Threaded

## What you need to know

JavaScript (in one realm — one window, one Node isolate, one Worker) runs on **one call stack**: only one piece of your JS executes at any instant.

**Async does not mean multi-threaded JS.** It means: hand waiting work (timers, network, disk) to the **host**, keep the JS thread free, and run callbacks later when the stack is empty and the event loop picks them.

This unit is the foundation for the event loop, Promises, and `async/await`. If you get this wrong, every “predict the output” question becomes memorization instead of reasoning.

Curriculum checklist this unit completes:

- One call stack, one JS thread per realm/worker
- Async ≠ multi-threaded user JS; it is non-blocking delegation
- Where real concurrency lives: browser Web APIs / Node libuv (and friends), not the JS engine’s main thread
- Why long sync work freezes UI and delays pending callbacks
- Why `setTimeout(fn, 0)` is not “run immediately”

---

## What “single-threaded” means

### Precise claim

For a given **realm** (browser tab’s main world, a Web Worker, a Node worker thread, etc.):

- There is **one JS call stack**.
- The engine runs at most **one** JS turn of work at a time on that stack.
- Synchronous code runs to completion before any queued callback for that realm can start.

### What the claim does *not* mean

- It does **not** mean the whole browser or Node process has only one OS thread.
- It does **not** mean network/disk/crypto never use background threads.
- It does **not** mean you cannot have parallel JS — **Workers** are separate realms, each with their own single JS thread and stack (message-passing, not shared call stacks).

Interview phrasing:

> User JavaScript on the main thread is single-threaded. Concurrency of *waiting* and some *host* work happens outside that thread; concurrency of *JS computation* needs Workers (or multiple processes).

---

## The call stack

### What it is

The **call stack** is the LIFO structure of function frames currently executing.

```js
function c() {
  console.log('c');
}
function b() {
  c();
}
function a() {
  b();
}
a();
```

While `c` runs, the stack is roughly: `a → b → c`. When `c` returns, frames pop until the stack is empty (for that turn of work).

### Why it matters for async

Queued callbacks (timers, I/O, Promise jobs — details in the event-loop unit) only begin when the engine is ready to start a **new** turn — which requires the stack from the previous turn to be **empty**. Nothing “interleaves” into the middle of a running function unless that function itself yields (e.g. `await`), which schedules continuation for later rather than pausing the thread like an OS blocking wait inside the JS engine.

---

## Async means non-blocking delegation

### What happens when you call `setTimeout` / `fetch` / `fs.readFile`

You are **not** starting another JS thread that sits and waits.

Rough sequence:

1. Your JS calls a **host API** (`setTimeout`, `fetch`, Node `fs`, etc.).
2. The host registers work (timer, network request, file read).
3. Your JS call returns **immediately**; the stack continues with whatever is next.
4. Later, when the host finishes, it queues a **callback / task / microtask** for the JS runtime.
5. The **event loop** eventually runs that callback on the **same** single JS thread, when allowed.

```js
console.log('start');
setTimeout(() => console.log('timeout'), 0);
console.log('end');
// start, end, timeout
```

Causal story:

- `setTimeout` only *schedules* work with the timer host.
- `'end'` still runs in the same synchronous turn.
- The timeout callback runs in a **later** turn, after the stack is clear (and after microtasks for that phase — next unit).

### “Non-blocking” vs “parallel JS”

| Phrase | Accurate meaning |
|---|---|
| Non-blocking I/O | JS thread is not stuck waiting on slow I/O; host waits |
| Concurrent requests | Many host operations in flight at once |
| Parallel JS on main thread | **False** — still one stack |
| Parallel JS with Workers | Separate stacks; communicate via messages |

---

## Where concurrency actually happens

### Browser

- **Web APIs**: timers, `fetch`/networking, DOM events, `setTimeout`, encoding, some crypto, etc.
- Rendering and compositing use other browser machinery; a blocked main JS thread still **starves** input handlers and often janks painting because those compete for the main thread’s event loop turns.

### Node.js

- **libuv** (+ OS APIs): network I/O, timers, filesystem (often via thread pool for some ops), DNS, etc.
- Your JS callbacks still serialize on the Node event loop thread (unless you use `worker_threads`).

### Mental diagram

```
[ Your JS — one call stack ]
        │ schedule
        ▼
[ Host: Web APIs / libuv / OS ]
        │ when ready, enqueue callback
        ▼
[ Task / microtask queues ]
        │ event loop picks next work
        ▼
[ Your JS — same single stack again ]
```

The host may use threads. **Your callback still runs single-threaded JS** when it finally runs.

---

## Why long synchronous work freezes everything

### The mechanism

While a heavy loop (or huge JSON.parse, sync crypto, giant render computation) occupies the call stack:

- No other JS callback on that realm can run.
- Timer callbacks due “now” wait in queues.
- In the browser, event handlers, React updates scheduled as tasks, and often paint stay delayed → **frozen UI**.
- In Node, other request handlers on that loop wait → **latency spikes** under CPU-bound work.

```js
console.log('start');
setTimeout(() => console.log('timer'), 0);

const end = Date.now() + 3000;
while (Date.now() < end) {
  /* burn 3s on the JS thread */
}

console.log('end');
// start, end, then (after ~3s of blocking) timer
```

The timer’s delay elapsed long ago; the callback could not start until the stack emptied.

### Practical consequences

- Prefer async I/O over sync `readFileSync` on servers.
- Break huge CPU work: chunking, `requestIdleCallback` / scheduling, Workers, or native addons.
- In React/RN: expensive sync work in render/effects blocks interactions.
- In NestJS: CPU-heavy work in a request handler blocks the event loop for other requests on that process.

---

## `setTimeout(fn, 0)` is not “immediate”

### Preserved interview answer (still correct)

**Q: If `setTimeout(fn, 0)` has a 0ms delay, why doesn't `fn` run immediately?**

> `setTimeout` never runs its callback synchronously, even with a 0ms delay — the delay is a *minimum*, not a guarantee. The callback is handed to the timer facility, and once the delay elapses it's placed in the macrotask (task) queue. The event loop only pulls from that queue once the call stack is empty — so any currently running synchronous code, including code after the `setTimeout` call itself, runs first.

### Extra qualifications (interview-useful, not trivia piles)

- `0` means “as soon as the timer is eligible **and** the loop gets to that task,” not “next CPU instruction.”
- Browsers may clamp nested timers; Node has its own timer phases — still never “inline sync.”
- Microtasks (Promise `.then`, `queueMicrotask`) scheduled in the same turn run **before** the next timer macrotask (full rules in the event-loop unit). So `setTimeout(0)` is also not “before all Promise callbacks.”

```js
// What happens here?
setTimeout(() => console.log('timeout'), 0);
Promise.resolve().then(() => console.log('microtask'));
console.log('sync');
// sync, microtask, timeout
```

You only need that ordering preview here so “single-threaded + queues” connects cleanly to the next section.

---

## Workers: the intentional escape hatch

When you need **parallel JavaScript**:

- Browser: `Worker`, `SharedWorker`
- Node: `worker_threads`, or multiple processes/cluster

Each worker:

- Has its **own** JS thread and stack (still single-threaded *inside* the worker).
- Does not share lexical scope or `this` with the main thread.
- Talks via structured clone / transferable messages (or shared memory in advanced cases).

Do not say “JS is multi-threaded” because Workers exist. Say: **main-thread JS is single-threaded; parallelism is another realm.**

---

## Common mistakes and misconceptions

1. **“Async functions run on another thread.”** `async` functions still run on the same stack until they `await`; then they resume later on that same thread.
2. **“`setTimeout(0)` runs right after this line.”** It runs after the current turn (and after microtasks), at earliest.
3. **“Pending fetch means JS is waiting in the background as JS.”** The network stack waits; your `.then` waits in a queue.
4. **“Single-threaded means no concurrency.”** Many host operations can be in flight; JS callbacks are serialized.
5. **“A Promise makes work parallel.”** Creating a Promise only schedules async completion; CPU work before the first `await` is still sync and blocking.
6. **Blaming the event loop when the real bug is a long sync loop.** Queues cannot preempt running JS.

---

## Connections to other concepts

```
one call stack (this unit)
  → host APIs take waiting off-thread / off-loop
    → callbacks enter task / microtask queues
      → event loop chooses what runs next (next unit)

setTimeout(0)
  → still a later macrotask
    → after current sync + microtasks

long sync CPU
  → stack never empty
    → UI / other requests starve

Workers
  → extra realms, each still single-threaded JS
```

Closures still decide **which variables** a callback sees when it eventually runs. Single-threading decides **when** that callback is allowed to run relative to other JS. `await` does not invent threads; it schedules continuations on this same model.

---

## Interview perspective

You should be able to:

1. Define single-threaded JS per realm in one sentence.
2. Explain async as host delegation + later callbacks, not multi-threaded user JS.
3. Say where concurrency lives (Web APIs / libuv) vs where JS runs.
4. Explain UI freezes / Node latency under sync CPU.
5. Nail `setTimeout(fn, 0)` without confusing it with microtasks.
6. Mention Workers as parallel JS without undoing the single-thread story.

Strong one-liner:

> One JS stack runs at a time; async APIs ask the host to wait and queue callbacks for later, so a busy stack blocks every callback and the UI even if timers already fired.

---

# Self-test

## Core recall

1. What does it mean that JavaScript is single-threaded (precise version)?
2. What is the call stack’s role in async behavior?
3. If async isn’t multi-threaded JS, what is it?
4. Where does concurrent waiting / some heavy host work actually happen in browsers and in Node?
5. Why can a long `while` loop freeze the UI even if timers and fetches are “already done”?
6. Why doesn’t `setTimeout(fn, 0)` run `fn` immediately?
7. How do Web Workers / `worker_threads` change the story without making main-thread JS multi-threaded?

## Explain why

1. Why can many `fetch` requests be in flight at once if JS is single-threaded?
2. Why does `'end'` log before `'timeout'` in the classic `start` / `setTimeout(0)` / `end` example?
3. Why is “Promises run in parallel on another thread” wrong?
4. Why does sync file I/O on a Node server hurt more than async file I/O under load?
5. Why can’t a due timer callback interrupt a function that is mid-loop on the main thread?

## Compare and contrast

1. Concurrent host I/O vs parallel JS execution.
2. Main-thread JS vs a Worker’s JS.
3. Non-blocking I/O vs non-blocking CPU (are they the same?).
4. `setTimeout(fn, 0)` vs “run this as the very next line of sync code.”
5. Handing work to Web APIs/libuv vs spawning a JS thread yourself.

## Predict the output

State the result **and explain why**.

1.
```js
console.log('A');
setTimeout(() => console.log('B'), 0);
console.log('C');
```

2.
```js
setTimeout(() => console.log('timeout'), 0);
Promise.resolve().then(() => console.log('then'));
console.log('sync');
```

3.
```js
console.log('start');
setTimeout(() => console.log('timer'), 0);
for (let i = 0; i < 1e8; i++) {}
console.log('end');
```
(Describe ordering; you need not estimate duration.)

4.
```js
function block(ms) {
  const t = Date.now() + ms;
  while (Date.now() < t) {}
}
setTimeout(() => console.log('done'), 50);
block(200);
console.log('after block');
```

5.
```js
async function f() {
  console.log('1');
  await null;
  console.log('2');
}
console.log('0');
f();
console.log('3');
```
(Use only the single-thread + “await postpones continuation” idea; full microtask detail can be approximate if you state assumptions.)

## Debugging

1. Diagnose:
```js
button.onclick = () => {
  const t = Date.now() + 5000;
  while (Date.now() < t) {}
  console.log('finished');
};
```
The page ignores clicks and animations during the handler. Why? What directions could you take?

2. Diagnose a Node API:
```js
app.get('/report', (req, res) => {
  const data = fs.readFileSync(hugePath, 'utf8'); // intentional for the bug
  res.send(summarize(data));
});
```
Under concurrent traffic, latency spikes for unrelated routes. Mechanism?

3. A teammate says: “We used `async/await`, so this CPU-heavy parse won’t block the event loop.”
```js
async function handle() {
  const text = await fetch(url).then((r) => r.text());
  const data = JSON.parse(hugeText); // huge sync parse
  return data;
}
```
What is right/wrong in their statement?

4. Diagnose:
```js
setTimeout(() => console.log('scheduled'), 0);
console.log('now');
// Teammate expected: scheduled, now
```
Correct their model.

## Application

1. Rewrite a demo that uses a busy `while` loop so a `setTimeout(0)` log can run sooner **without** Workers — by chunking work across turns (`setTimeout`/`queueMicrotask`/`requestAnimationFrame` — pick one and justify).

2. Write a short comment block you could put above a Nest handler explaining why `bcrypt.compareSync` on large batches is dangerous on the request thread.

3. Sketch (bullets or tiny code) how you’d move a heavy image encode off the browser main thread using a Worker: what stays on main, what messages you send.

4. Given three operations — timer 0ms, sync CPU 2s, `fetch` — describe which can overlap in wall-clock time and which JS callbacks still cannot overlap on the main thread.

## Interview questions

1. JavaScript is single-threaded — what does that actually mean?  
   **Follow-ups:** Then how does async work? Where is the concurrency?

2. Why doesn’t `setTimeout(fn, 0)` run immediately?  
   **Follow-ups:** What runs before it? How do Promises fit?

3. Why does a long loop freeze the browser?  
   **Follow-ups:** How would you fix CPU-bound work in production?

4. Do `async` functions run on a different thread?  
   **Follow-ups:** What does `await` do to the call stack?

5. How are Web Workers different from `setTimeout`?  
   **Follow-ups:** Is code inside a Worker multi-threaded?

## Connections

1. How does this unit set up the event loop’s “stack must be empty” rule?
2. How do closures interact with single-threading when many callbacks finally run in order?
3. How does “await doesn’t block the thread” still leave room for blocking sync code after an await?
4. How would you connect main-thread blocking to React input lag or Nest request latency in one sentence each?
5. When predicting output, how do you separate “host finished early” from “JS was allowed to run the callback”?
