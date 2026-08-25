# Event Loop — Answers

## Core recall

1. **Call stack:** what’s executing now (sync frames, LIFO). **Macrotask queue:** timers, I/O, script turns, many host callbacks — one task per turn. **Microtask queue:** Promise jobs, `queueMicrotask`, `await` continuations, etc. — drain fully after each macrotask.
   - **Why:** Two priorities let related Promise bookkeeping finish before yielding to timers/UI.

2. **Priority order:** Current sync/macrotask finishes → **drain all microtasks** (including newly scheduled ones) → (browser: maybe render) → **next one macrotask** → repeat.
   - **Why:** This is the load-bearing interview algorithm.

3. **Macrotasks:** e.g. `setTimeout`/`setInterval`, I/O callbacks, UI/event tasks, `setImmediate` (Node). **Microtasks:** e.g. Promise `.then`/`.catch`/`.finally`, `queueMicrotask`, `async`/`await` continuations (`MutationObserver` in browsers).
   - **Why:** Classify the call, then apply the drain rule.

4. **Critical rule:** After a macrotask, **empty the entire microtask queue** before the next macrotask — even if draining enqueues more microtasks.
   - **Why:** Explains why chained `.then`s beat `setTimeout(0)`.

5. **Microtask starvation:** Microtasks keep scheduling more microtasks so the queue never empties → next macrotask/paint never runs → frozen UI / delayed timers.
   - **Why:** The loop won’t proceed to macrotasks until microtasks are done.

6. **`process.nextTick` (Node):** Runs in the **nextTick queue**, typically **before** Promise/`queueMicrotask` microtasks.
   - **Why:** Node-specific; floods starve even earlier than Promise floods.

7. **`setImmediate`:** **Not** a standard browser API — **Node-only** (check phase). Don’t assume it in web code.

---

## Explain why

1. **Chained `.then`s before earlier `setTimeout(0)`:** Script schedules a timer macrotask and Promise microtasks. After sync, **all** microtasks drain — including the second `.then` scheduled by the first — before any timer runs.

2. **Microtasks delay rendering:** Browsers paint between tasks in the simplified model; microtasks must drain first. A busy microtask queue postpones paint even if timers are due.

3. **`0` delay ≠ microtask:** `setTimeout` always queues a **macrotask**; delay only controls earliest eligibility. Queue type is fixed by the API, not the number `0`.

4. **Code before `await` vs after:** Pre-`await` runs sync in the current turn; post-`await` is a **microtask continuation**. Other sync logs in that turn (e.g. after calling the async function) run before the continuation.

5. **Recursive `Promise.then` more dangerous than repeated `setTimeout(0)`:** Endless microtasks never yield to the next macrotask/paint. Repeated `setTimeout(0)` yields each iteration as a new macrotask so timers/UI can breathe.

---

## Compare and contrast

1. **Macrotasks vs microtasks:** Macrotasks = coarser turns (timers/I/O/script). Microtasks = higher-priority “finish related work” jobs after each macrotask. One macrotask, then **all** microtasks, then next macrotask.

2. **`setTimeout(fn, 0)` vs `queueMicrotask(fn)`:** Both defer past current sync; microtask runs in the same turn’s drain phase; timeout is a later macrotask (after that drain).

3. **`process.nextTick` vs `queueMicrotask` (Node):** nextTick drains **before** ordinary microtasks; both can starve macrotasks if abused. Prefer `queueMicrotask`/Promises for portable code.

4. **`setTimeout` vs `setImmediate` (Node):** Both macrotask-ish; different phases (timers vs check). Relative order of `setTimeout(0)` vs `setImmediate` can vary with context; don’t treat either as a microtask.

5. **“Host finished” vs “JS callback executed”:** Host done only **enqueues**. The event loop runs the callback when stack is empty and that queue is selected — often later than “finished.”

6. **Call stack vs task queues:** Stack = running now. Queues = waiting to run. Nothing from queues starts mid-stack unless the current code returns/`await`s.

---

## Predict the output

1. **Order:** `1`, `4`, `3`, `2`
   - **Why:** Sync `1`/`4`; microtask `3`; then timer macrotask `2`.

2. **Order:** `D`, `B`, `C`, `A`
   - **Why:** Sync `D`; drain microtasks `B` then chained `C`; then timer `A`.

3. **Order:** `start`, `end`, `then`, `timeout`, `then inside timeout`
   - **Why:** Sync; microtask `then`; timer macrotask logs `timeout` and schedules another microtask; that microtask runs before the next macrotask.

4. **Order:** `m1`, `t0`, `m2`, `t1`
   - **Why:** Script schedules microtask (`m1`) and timer `t0`. Drain: `m1` runs and schedules timer `t1`. Next macrotask: `t0` (queued first), which schedules microtask `m2`; drain `m2` before the next timer; then `t1`.

5. **Order:** `a`, `x1`, `b`, `x2`
   - **Why:** Sync through `x` until `await`; `b` finishes the turn; `x2` is microtask continuation.

6. **Order:** `S`, `M1`, `M2`, `M3`, `T1`, `T2`
   - **Why:** Sync `S`; drain M1, M2, then M3 (scheduled while draining); then timer macrotasks in order.

7. **Stable:** `sync`, then `nextTick`, then `promise`, then timeout (and vs `setImmediate` if present — timeout/immediate order may vary).
   - **Why:** Sync first; Node nextTick before Promise microtasks; macrotasks after. Teach **nextTick before promise** as the stable point.

8. **Order:** `1`, `7`, `5`, `2`, `4`, `3`, `6`
   - **Why:** Sync `1`/`7`; microtask `5` (schedules timer 6); macrotask timeout logs `2`, schedules microtask `3`, logs `4`; drain `3`; next macrotask `6`.

---

## Debugging

1. **Diagnosis:** `paintSoon` recursively queues microtasks → queue never empties → timers/paint starved → UI frozen.
   - **Fix:** Yield with macrotasks (`setTimeout(0)`, `MessageChannel`, rAF for frames); bound work per turn; don’t implement tight loops only with `.then`.

2. **Helpful vs harmful wrapping in `setTimeout(0)`:** **Helpful** when you need to yield to paint/timers/I/O between chunks. **Harmful** as a blanket “fix” — adds latency, obscures real ordering, doesn’t make CPU parallel, and can reorder logic incorrectly if you needed microtask semantics (e.g. consistent state before paint).

3. **Nest/Node nextTick flood:** Massive `process.nextTick` chains drain before Promises and keep delaying timers/I/O phases → latency. Same starvation family, earlier than Promise floods.
   - **Fix:** Bound nextTick use; prefer Promises/`setImmediate`/queues for deferred app work.

4. **Who’s right:** The **microtask-drain** engineer. Same-turn `setTimeout(0)` vs `.then`: after sync, **all** `.then` microtasks (including chained) run before any of those timeouts. Timeouts are not interleaved with Promises from that turn.

---

## Application

1. **Enqueue helpers:**
```js
const enqueueMacrotask = (fn) => setTimeout(fn, 0);
const enqueueMicrotask = (fn) => queueMicrotask(fn);

enqueueMacrotask(() => console.log('macro'));
enqueueMicrotask(() => console.log('micro'));
console.log('sync');
// sync, micro, macro
```

2. **Chunk with macrotask yield:**
```js
function processChunk(arr, i, size) {
  const end = Math.min(i + size, arr.length);
  for (let j = i; j < end; j++) {
    /* process arr[j] */
  }
  if (end < arr.length) setTimeout(() => processChunk(arr, end, size), 0);
}
```
   - Use macrotasks so the browser can paint between chunks.

3. **Yield between iterations:**
```js
function step(i) {
  if (i <= 0) return;
  setTimeout(() => step(i - 1), 0); // was Promise.resolve().then(...)
}
step(1e6);
```

4. **Peer quiz (authoring sample):**
```js
console.log('S');
setTimeout(() => console.log('T1'), 0);
setTimeout(() => console.log('T2'), 0);
Promise.resolve()
  .then(() => console.log('P1'))
  .then(() => console.log('P2'));
```
   **Intended order:** `S`, `P1`, `P2`, `T1`, `T2`.

---

## Interview questions

1. **Spoken:** “The event loop is how single-threaded JS picks what runs next. One macrotask runs to completion on the call stack; then every microtask drains, including ones scheduled during that drain; then the browser may paint; then the next macrotask. Promises are microtasks; `setTimeout` is a macrotask.”
   - **Follow-ups:** Promises/`.then`/`await` → microtask queue. `setTimeout` → macrotask queue after microtasks.

2. **Spoken:** “After the script’s sync work, the loop empties the microtask queue before taking the next timer. So `.then` runs first even if `setTimeout(0)` was registered earlier. A `.then` that schedules another `.then` still runs in that same drain — still before the timer.”
   - **Follow-ups:** Nested/chained `.then` still beats the next macrotask.

3. **Spoken:** “Yes — if microtasks keep enqueueing microtasks, the queue never empties, so timers and paint don’t run. Structure long work in bounded chunks scheduled as macrotasks so the loop can breathe.”
   - **Follow-ups:** Prefer `setTimeout(0)` / MessageChannel / rAF chunking over recursive Promise loops for UI work.

4. **Spoken (method):** “Run all sync and note queues; drain all microtasks; run next macrotask; repeat.” For a pasted sync+timeout+promise: sync logs, then promise, then timeout. Adding `await`: code before await stays sync; after await becomes a microtask continuation interleaved by the same rules.
   - **Follow-ups:** `await` doesn’t invent a thread; it reschedules on the microtask path.

5. **Spoken:** “`process.nextTick` is Node-only and runs before Promise microtasks. `setImmediate` is a Node macrotask-ish check-phase API. I avoid nextTick in app code except deliberate framework-style deferral — floods starve the loop early.”
   - **Follow-ups:** Prefer Promises/`queueMicrotask` for portable deferral; know nextTick for Nest/Node interviews.

---

## Connections

1. **Single-threaded → event loop:** One stack can’t run two things at once, so finished host work must be queued and a scheduler (the event loop) must pick the next turn when the stack is empty.

2. **`await` ↔ microtasks ↔ one stack:** `await` schedules a Promise-style continuation (microtask) so readable async doesn’t need a second thread — still one stack when the continuation runs.

3. **Closures vs event loop:** Closures decide **what** values a callback sees; the event loop decides **when** that callback is allowed to run.

4. **`fetch` finished:** Host/network done → enqueues your reaction (often via Promise microtasks for `.then`). “Host done” ≠ “your `.then` already ran.”

5. **Starvation appearance:** React UI — frozen interactions/paint, timers stuck. NestJS — delayed timers/I/O/other request turns on that process even though work was “scheduled,” because microtasks/nextTicks never yield.
