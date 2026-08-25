# Single-Threaded — Answers

## Core recall

1. **Precise meaning:** In one realm (main window, one Worker, one Node isolate), there is **one JS call stack** — at most one piece of that realm’s JS runs at a time; sync work runs to completion before other queued callbacks for that realm start.
   - **Why:** “Single-threaded” is per realm, not “the whole browser/OS has one thread.”

2. **Call stack’s role:** Callbacks from timers/I/O/Promises only start on a **new turn** when the previous turn’s stack is empty (or after a yield like `await` schedules a continuation). Mid-function work is not preempted by other JS on that stack.
   - **Why:** Queues cannot interrupt a running frame.

3. **Async ≠ multi-threaded JS.** It is **non-blocking delegation**: hand waiting to the host, return immediately, run the callback later on the same JS thread.
   - **Why:** The host waits; your stack stays free for other sync work until the callback’s turn.

4. **Where concurrency lives:** Browsers — Web APIs (network, timers, etc.) and other browser threads. Node — **libuv**/OS (I/O, timers, some FS via thread pool). Callbacks still serialize on the JS event-loop thread unless you use Workers.
   - **Why:** Host may use threads; user JS on one realm still has one stack.

5. **Long `while` freezes UI even if timers/fetches “done”:** The stack never empties, so due callbacks cannot start; input/paint compete for the same main-thread turns.
   - **Why:** Host finished waiting ≠ JS was allowed to run the callback.

6. **`setTimeout(fn, 0)` isn’t immediate:** Delay is a **minimum**; the callback is queued as a later **macrotask**. Current sync (and microtasks) run first.
   - **Why:** Scheduling ≠ inline execution.

7. **Workers:** Separate realms, each with their **own** single JS stack; message-passing (not shared call stack). Parallel JS exists across workers; main-thread JS stays single-threaded.
   - **Why:** Escape hatch for CPU parallelism without making one stack multi-threaded.

---

## Explain why

1. **Many `fetch`es at once:** The network stack holds many in-flight requests; JS only schedules them and later runs `.then`s one at a time on one stack. Concurrent **waiting**, serialized **JS callbacks**.

2. **`'end'` before `'timeout'`:** `setTimeout` only registers with the timer host and returns; `'end'` is still in the same sync turn. The timeout callback runs after the stack clears (later turn).

3. **“Promises run in parallel on another thread” is wrong:** Promise machinery schedules reactions/microtasks on the **same** JS thread. Creating a Promise doesn’t move CPU work off-thread; work before the first `await` is still sync and blocking.

4. **Sync file I/O hurts more under load:** `readFileSync` occupies the event-loop thread until the read finishes — other request handlers wait. Async I/O lets the host wait while the loop serves other work; only the completion callback needs a turn.

5. **Due timer can’t interrupt a mid-loop function:** No preemption of running JS on that realm. The timer callback sits in a queue until the stack empties.

---

## Compare and contrast

1. **Concurrent host I/O vs parallel JS:** Many host ops can be in flight at once. Parallel **JS computation** on one realm does not happen — only one stack. Parallel JS needs Workers/processes.

2. **Main-thread JS vs Worker JS:** Both are single-threaded **inside** their realm. Workers don’t share lexical scope/`this` with main; they communicate via messages. Main freeze ≠ Worker freeze (and vice versa), until you join on messages.

3. **Non-blocking I/O vs non-blocking CPU:** Not the same. Async I/O frees the JS thread while waiting. Heavy CPU on the JS thread still blocks regardless of `async` keywords.

4. **`setTimeout(fn, 0)` vs “next sync line”:** Next sync line runs now on the stack. `setTimeout(0)` runs in a later macrotask turn (after current sync + microtasks), never as the next statement.

5. **Host APIs/libuv vs spawning a JS thread:** Host APIs take **waiting**/some work off the JS thread and queue callbacks. Spawning a Worker gives another **JS** stack for parallel computation; you own messaging and no shared locals.

---

## Predict the output

1. **Output:** `A`, `C`, `B`
   - **Why:** Sync logs first; timer callback is a later turn after the stack empties.

2. **Output:** `sync`, `then`, `timeout`
   - **Why:** Sync first; Promise microtask drains before the next timer macrotask (preview of event-loop priority).

3. **Order:** `start`, then long loop, then `end`, then `timer`
   - **Why:** Timer is due during the loop but cannot run until the stack empties after `end`.

4. **Output:** (after ~200ms busy wait) `after block`, then `done`
   - **Why:** `block(200)` holds the stack; the 50ms timer fires in the host but the callback waits; then sync log; then timer macrotask.

5. **Output:** `0`, `1`, `3`, `2` (assuming `await null` schedules a microtask continuation)
   - **Why:** Sync through `f` until `await`; `3` finishes the current turn; continuation `2` runs later on the same thread — not another thread.

---

## Debugging

1. **Diagnosis:** Sync 5s busy-wait on the main thread — no other handlers/animations get turns → frozen UI.
   - **Directions:** Chunk work across macrotasks; use `requestIdleCallback` / rAF; move CPU to a Worker; never burn the stack in click handlers.

2. **Mechanism:** `readFileSync` blocks the Node event-loop thread for the whole read+summarize. Concurrent requests on that process wait → latency spikes on unrelated routes.
   - **Fix direction:** `fs.promises.readFile` / streams; offload huge CPU to worker threads if summarize is heavy.

3. **Right/wrong:** `await fetch…` correctly yields during network wait. **Wrong:** `JSON.parse(hugeText)` is still **sync CPU** on the same thread after resume — `async` does not parallelize that parse.
   - **Fix:** Stream/parse in chunks, Worker, or smaller payloads.

4. **Correct model:** Expect `now`, then `scheduled`. `setTimeout(0)` never runs before remaining sync in the same turn.

---

## Application

1. **Chunk with `setTimeout` (macrotask yield):**
```js
function work(i, n) {
  // do a slice of CPU here
  if (i < n) setTimeout(() => work(i + 1, n), 0); // yields so timer/UI can run
}
```
   - **Why pick macrotask:** Microtasks (`queueMicrotask`) can starve paint/timers if you chain endlessly; `setTimeout(0)` yields to the next task (and browser paint opportunity).

2. **Comment for Nest:**
```js
// DANGER: bcrypt.compareSync is sync CPU on the event-loop thread.
// Large batches block ALL other requests on this process until done.
// Prefer bcrypt.compare (async) or a worker_thread / queue job for bulk work.
```

3. **Worker sketch:** Main: load file/UI, `postMessage` ArrayBuffer/blob to Worker, show progress/result from `onmessage`. Worker: decode/encode CPU, `postMessage` result (transferables). No DOM in Worker; no shared closures.

4. **Overlap:**
   - **Wall-clock overlap:** `fetch` waiting and the 2s sync CPU can overlap with host network wait only if fetch was started **before** the sync burn; timer host counting can also elapse during sync — but…
   - **JS callbacks cannot overlap** on the main thread: timer callback, fetch `.then`, and any other JS still serialize. Sync 2s delays all of them until the stack empties.

---

## Interview questions

1. **Spoken:** “On one realm, JavaScript has one call stack — only one piece of that JS runs at a time. The browser or Node process can use other OS threads for I/O and host work, but my callbacks still run single-threaded on that realm.”
   - **Follow-ups:** Async = host waits + queue callback later. Concurrency of waiting is in Web APIs/libuv; parallel JS needs Workers.

2. **Spoken:** “Zero is a minimum delay, not ‘run now.’ The callback is queued as a macrotask; current synchronous code finishes first, and microtasks run before that timer.”
   - **Follow-ups:** Sync after `setTimeout` runs first; Promises/microtasks beat the timeout.

3. **Spoken:** “A long loop never empties the stack, so timer, input, and paint callbacks can’t run — the UI looks frozen even if work was ‘scheduled.’”
   - **Follow-ups:** Chunk, idle callbacks, or Workers for production CPU-bound work.

4. **Spoken:** “No. `async` functions run on the same thread until `await`; then the continuation is scheduled later on that same thread. CPU before the first await still blocks.”
   - **Follow-ups:** `await` clears the current sync portion and schedules a continuation — it doesn’t pause an OS thread inside the engine like a blocking wait.

5. **Spoken:** “`setTimeout` schedules work back onto the same main stack later. A Worker is another JS realm with its own stack for parallel computation, talking via messages.”
   - **Follow-ups:** Inside a Worker, JS is still single-threaded; you get parallelism across realms, not multi-threaded code inside one worker.

---

## Connections

1. **Sets up event loop:** Because only one stack runs, something must choose the next queued callback when the stack is empty — that’s the event loop’s job (“stack must be empty” before the next turn).

2. **Closures + single-threading:** Closures decide **which** variables a callback sees; single-threading/serialization decides **when** each callback runs relative to others (in order, never overlapping on that stack).

3. **`await` doesn’t block the thread** for the wait, but **sync code after resume** (or before the first await) still blocks — async syntax ≠ free CPU.

4. **One sentence each:** React input lag — main-thread sync work delays event/update turns. Nest latency — sync CPU/I/O in a handler delays other requests on the same loop.

5. **Predict method:** Separate “host finished early” (timer fired, fetch done) from “JS ran the callback” (stack empty + event loop picked that queue entry).
