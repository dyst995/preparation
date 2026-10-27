# NODE02 — Event loop and asynchronous execution

Node.js 20+. Questions NODE-051–NODE-100.

These questions cover libuv's phases and the checkpoint Node runs after each JavaScript callback: the `process.nextTick` queue, then promise jobs. `setTimeout`, `setImmediate`, `async`/`await`, and I/O callbacks are placed on that model. The libuv thread pool appears only where filesystem, `dns.lookup`, and crypto offload post a completion back to the poll phase. Worker threads are a later section.

Phase order is version-sensitive. libuv 1.45.0 (Node 20) runs timers at the end of each loop iteration and still runs timers once before the loop is entered. The older diagram that opens every iteration with timers is the pre-1.45 loop. Within-turn `nextTick`/promise order, including the ES module exception, is NODE-021.

### NODE-051 — The phases a Node 20 loop actually walks

**Difficulty:** Senior

**Category:** Event loop phases

**Question:**

Draw the event-loop phases for a Node 20 process and say what each one is for. A teammate draws timers at the start of every lap and asks where `process.nextTick` sits. Correct the lap, and leave `nextTick` out of the phase boxes.

**Answer:**

On Node 20 (libuv 1.45), if the loop is already alive, libuv runs timers once before entering, then each iteration: pending callbacks → idle → prepare → poll → pending again (bounded) → check (`setImmediate`) → close → timers (`setTimeout`/`setInterval`). Timers are not the first box of every lap; that diagram is pre-1.45. `process.nextTick` is not a phase: Node drains it, then V8 microtasks, when the current callback returns. Idle/prepare are internal. Poll may block in the kernel; other phases run already-queued work.

**Follow-up:**

Which phase can block in the OS, and which only run already-queued JavaScript?

Answer: Poll may block when the wait is non-zero. Every other phase runs queued callbacks or internal handles and returns. Once a callback starts, it holds the stack until it returns in every phase.

### NODE-052 — One callback, then nextTick, then promise jobs

**Difficulty:** Senior

**Category:** Microtasks

**Question:**

State the checkpoint Node runs after one phase callback on Node 20, including work scheduled while draining. Predict the log when `onTurn` is a timers/poll/check callback (not top-level ESM). This is not NODE-021.

```js
function onTurn() {
  const out = [];
  process.nextTick(() => out.push('tick'));
  Promise.resolve().then(() => out.push('promise'));
  queueMicrotask(() => out.push('micro'));
  process.nextTick(() => {
    out.push('tick2');
    queueMicrotask(() => out.push('micro-from-tick'));
  });
  Promise.resolve().then(() => {
    out.push('promise2');
    process.nextTick(() => out.push('tick-from-promise'));
  });
  setImmediate(() => console.log(out.join(',')));
}
```

**Answer:**

After one phase callback returns: drain `nextTick` until empty, then V8 microtasks; if a microtask queues another `nextTick`, repeat until both are empty. Only then does the next callback or phase start. Hypothetical print: `tick,tick2,promise,micro,promise2,micro-from-tick,tick-from-promise`. `tick-from-promise` waits until the microtask queue empties. Not the ESM top-level exception (NODE-021).

**Follow-up:**

If `promise2` queues `queueMicrotask(() => out.push('inner'))` instead of `nextTick`, where does `inner` land?

Answer: `inner` is another microtask, so it runs before the drain returns—after `promise2` and after already-queued `micro-from-tick`. It does not enter the `nextTick` queue or wait for a later phase.

### NODE-053 — setTimeout(fn, 0) is a timer with a minimum, not "run next"

**Difficulty:** Intermediate

**Category:** Timers

**Question:**

A candidate writes `setTimeout(fn, 0)` and calls it "run `fn` next, after this function." Say what Node 20 schedules, which phase runs it, and what the `0` becomes. Does Node apply the browser nested-timer clamp?

**Answer:**

`setTimeout(fn, 0)` schedules a timers-phase callback. Delays below 1 (including `0`) clamp to 1 ms; above `2147483647` also become 1 with a warning. The delay is a minimum, not "after this return." The callback runs when a timers phase finds it due (end of lap on Node 20, plus the pre-loop pass). Node does not apply the HTML 4 ms nested-timer clamp. It is not `process.nextTick`.

**Follow-up:**

What does `setTimeout(fn, 1.9)` store, and how are two such timers ordered?

Answer: Truncation makes `1.9` into `1`. Equal-delay timers are FIFO by registration. The earlier registration runs first, then its checkpoint, then the later one.

### NODE-054 — setImmediate is the check phase

**Difficulty:** Intermediate

**Category:** Timers

**Question:**

What does `setImmediate` schedule, which phase runs it, and what happens to an immediate queued from inside an immediate that is already running?

**Answer:**

`setImmediate(callback, ...args)` queues `callback` for check (after poll). There is no delay; a second argument is passed to the callback. Immediates queued before check starts run in registration order. An immediate queued from a running immediate waits for a later iteration—Node snapshots the queue when check begins. After each immediate, the checkpoint drains before the next one in the same phase.

**Code:**

```js
setImmediate(() => {
  console.log('first');
  process.nextTick(() => console.log('tick'));
  setImmediate(() => console.log('nested'));
});
setImmediate(() => console.log('second'));
// Hypothetical: first, tick, second; nested is a later check
```

**Follow-up:**

If the first immediate clears the second before it starts, can `second` still run?

Answer: No. `clearImmediate` removes it from the list. The checkpoint from `first` still runs; a nested immediate scheduled from `first` remains for a later iteration.

### NODE-055 — Timeout versus immediate inside I/O, and at the top level

**Difficulty:** Senior

**Category:** Timers

**Question:**

Predict `setTimeout(fn, 0)` against `setImmediate(fn)` inside an I/O callback and at the top level of the main module. Which prediction do the phase rules support, and which do you refuse?

**Answer:**

Inside a poll I/O callback: sync work, then checkpoint (`nextTick`, then promises), then check (`immediate`), then timers (`timeout` with 1 ms floor). Hypothetical: `io`, `tick`, `promise`, `immediate`, `timeout`. At top level, refuse a winner—the pre-loop timers pass may or may not see the timeout as due before the first check. Process startup decides; Node's guide shows both orders.

**Trade-offs:**

Prefer not to need the order. For "after I/O may run," use `setImmediate`. For a real minimum delay, use an intentional `setTimeout` delay—not `0` as slang for "next."

**Follow-up:**

If `setTimeout(fn, 0)` is scheduled before `readFile`, and `setImmediate` stays inside the read callback, can `timeout` print before `io`?

Answer: Yes. The timer can fire in any timers phase that finds it due before the pool completion reaches poll. Once `io` runs, the immediate is scheduled; you no longer get the stable "immediate then timeout" I/O pattern.

### NODE-056 — await resumes as a microtask on this same thread

**Difficulty:** Senior

**Category:** Microtasks

**Question:**

Predict the log for `onTimer` below. Then answer claims that `await` blocks the thread or that the continuation runs on a new OS thread.

```js
async function label() {
  console.log('before');
  await null;
  console.log('after');
}
function onTimer() {
  console.log('timer');
  process.nextTick(() => console.log('tick'));
  label();
  setImmediate(() => console.log('immediate'));
  console.log('timer-end');
}
```

**Answer:**

`label()` runs until `await`; the continuation is a promise microtask on the same isolate—not a pool/Worker thread and not a block. `onTimer` finishes (`timer-end`) before `after`. Checkpoint: `tick` before `after`. On Node 20 timers is end-of-lap, so `immediate` waits for a later check. Order: `timer`, `before`, `timer-end`, `tick`, `after`, `immediate`.

**Follow-up:**

Change to `await new Promise(() => {})`. Which lines still print, and is the thread blocked?

Answer: `timer`, `before`, `timer-end`, `tick` print; `after` does not. `immediate` still runs later. The pending promise holds heap state, not the stack, and does not by itself keep the process alive.

### NODE-057 — A tight nextTick loop starves I/O

**Difficulty:** Senior

**Category:** Starvation

**Question:**

This program schedules a check callback and a file read, then calls `starve`. What prints? Why does the file callback not run even if the OS has finished the read?

```js
function starve() { process.nextTick(starve); }
setImmediate(() => console.log('immediate'));
readFile(__filename, () => console.log('io'));
starve();
```

**Answer:**

Neither `immediate` nor `io` prints. The checkpoint never empties, so the loop never reaches poll or check. The pool may finish the read and post a completion; the JavaScript callback still waits for poll on the isolate. This is a non-empty `nextTick` queue, not a lock deadlock. A recursive promise chain is the same shape on the other queue.

**Follow-up:**

If `starve` stops after a fixed count, can `io` print before `immediate`?

Answer: Once `nextTick` empties, both become reachable. If the completion is already pending, poll can run `io` before check's `immediate`. If the read is still in flight, `immediate` can win. Stopping the flood does not fix a universal order between them.

### NODE-058 — What poll does, and when it waits

**Difficulty:** Senior

**Category:** I/O

**Question:**

Explain the poll phase in Node 20: what callbacks run there, when the thread blocks in the kernel, and what stops that wait. A colleague says poll runs every kind of asynchronous callback.

**Answer:**

Poll computes an I/O wait and runs ready I/O callbacks (TCP, completed fs/DNS/crypto offloads). Timers, `setImmediate`, and close are not this queue. Wait is zero if poll callbacks are already queued, if `setImmediate` is waiting, or if a timer is already due; otherwise it may wait until the next timer threshold or until the kernel reports I/O. libuv caps one visit so check/close/timers are not starved forever. A long callback still holds the stack even if the kernel is ready.

**Follow-up:**

Why does a process with only a ref'd `setImmediate` and no sockets exit after the callback instead of blocking forever in poll?

Answer: A queued immediate tells the loop not to sleep in idle poll. Check runs, then if nothing ref'd remains, the loop is done. Poll's wait is computed, not an unconditional block.

### NODE-059 — Pending callbacks are not the poll queue

**Difficulty:** Intermediate

**Category:** Event loop phases

**Question:**

What runs in the pending-callbacks phase, and why does a connection error sometimes show up there instead of inside poll? Distinguish that queue from `process.nextTick` and from poll.

**Answer:**

Pending callbacks are libuv's deferred I/O queue (e.g. some Unix `ECONNREFUSED` connects). They run at the start of the iteration and again after poll, bounded (Node 20's libuv uses a fixed iteration cap—an implementation detail, not a Node API). They are not `nextTick` (checkpoint, can starve poll) and not the poll queue itself. `'listening'` is also not this phase—Node often emits it on `nextTick`.

**Follow-up:**

Can a `'data'` handler be starved by write completions that outpace check?

Answer: Post-poll pending drains are capped so check still runs. A single long write callback still holds the stack; the cap limits callback count, not callback duration.

### NODE-060 — Idle and prepare are real phases, and they are not your callback

**Difficulty:** Intermediate

**Category:** Event loop phases

**Question:**

The diagram has idle and prepare between pending callbacks and poll. A candidate says `setImmediate` is the idle phase because the process runs it when idle. Correct the names.

**Answer:**

Idle and prepare are libuv phases for internal handles, after pending and before poll every iteration when active. They are not "run when quiet," and Node's public APIs do not schedule your callbacks there. `setImmediate` is check; `setTimeout` is timers; `nextTick` is the checkpoint. Do not reuse the idle box because the English word sounds close.

**Follow-up:**

Can an active idle handle delay a due timer on Node 20?

Answer: Idle/prepare run before poll; timers run after close. A long idle callback holds the stack and delays the timers phase of that lap—the same as any long synchronous turn, not a special timer penalty from the phase existing.

### NODE-061 — Which close runs in the close phase

**Difficulty:** Senior

**Category:** I/O

**Question:**

`socket.destroy()` and a graceful `socket.end()` can both end with `'close'`. Which path does Node attribute to the close-callbacks phase, and what does the other use? Where does `server.close(callback)` sit relative to open connections?

**Answer:**

Close phase runs after check and before timers. Abrupt close (`socket.destroy()`) emits `'close'` there. Non-abrupt close uses `process.nextTick` instead—same event name, different queue. `'close'` is a later turn than the last `'data'`. `server.close(callback)` stops accepting; the callback runs when the listening handle closes and open sockets are gone—it does not destroy them for you.

**Follow-up:**

Calling `destroy()` from a `'data'` handler: can `'close'` run before that handler returns, and does a `nextTick` queued just before `destroy()` run before `'close'`?

Answer: `destroy` schedules close; it does not emit on the current stack. The handler returns, its checkpoint drains the `nextTick`, then close runs after check. So that `nextTick` runs before `'close'`.

### NODE-062 — The pool finishes off the loop; the callback still waits for poll

**Difficulty:** Senior

**Category:** Thread pool

**Question:**

`fs.readFile`, `dns.lookup`, and `crypto.pbkdf2` are called "async, so they use threads." Place the libuv pool relative to the phases. What runs on a pool thread vs poll? How do `dns.resolve` and `pbkdf2Sync` differ? Not a worker-threads question.

**Answer:**

Default pool size is 4 (`UV_THREADPOOL_SIZE`, max 1024). Pool threads run blocking native work (fs, `getaddrinfo`/`dns.lookup`, heavy crypto); they do not run your JS. Completions become poll callbacks on the main isolate. `dns.resolve` uses c-ares on the loop (no pool). Sync APIs block the isolate. Sockets do not use the pool. A stuck checkpoint still delays a finished completion.

**Follow-up:**

Four `pbkdf2` calls occupy the pool; a fifth `readFile` is issued; a socket request arrives. What can poll run while the hashes continue?

Answer: The socket callback—no pool needed. The fifth `readFile` waits for a free pool thread before it has a completion. Hash and socket callbacks never share a stack and never run on the pool.

### NODE-063 — A nextTick queued from a promise job still beats the next phase

**Difficulty:** Senior

**Category:** Microtasks

**Question:**

Predict the log. Focus on `process.nextTick` inside a promise reaction and the promise scheduled from a `nextTick`. `onTurn` is a phase callback, not top-level ESM.

```js
function onTurn() {
  console.log('sync');
  process.nextTick(() => {
    console.log('tick');
    Promise.resolve().then(() => console.log('promise-from-tick'));
  });
  Promise.resolve().then(() => {
    console.log('promise');
    process.nextTick(() => console.log('tick-from-promise'));
  });
  queueMicrotask(() => console.log('micro'));
  setImmediate(() => console.log('immediate'));
  console.log('sync-end');
}
```

**Answer:**

Order: `sync`, `sync-end`, `tick`, `promise`, `micro`, `promise-from-tick`, `tick-from-promise`, `immediate`. Drain every `nextTick`, then microtasks; a `nextTick` queued from a reaction runs after that microtask queue empties, still before check. Both queues drain before the next phase—not "nextTick once, then forever promises."

**Follow-up:**

Add `queueMicrotask(() => console.log('inner'))` as the first line of the `promise` reaction. Where does `inner` print?

Answer: After `promise`, behind already-waiting `micro` and `promise-from-tick`, before `tick-from-promise`. Insertion: `promise`, `micro`, `promise-from-tick`, `inner`, `tick-from-promise`.

### NODE-064 — Which schedule actually lets poll run

**Difficulty:** Senior

**Category:** Scheduling

**Question:**

You have a large in-memory batch on the main isolate and want other sockets' poll callbacks between chunks. Compare `process.nextTick`, a resolved promise, `setImmediate`, and `setTimeout(fn, 0)`. Which let the loop reach poll?

**Answer:**

`nextTick` / `Promise.then` stay in the checkpoint—recursive use never reaches poll. `setImmediate` schedules check: from timers/top-level, the next lap polls first (real yield); from poll, check runs after this visit's remaining callbacks, and new I/O waits for the following lap. `setTimeout(fn, 0)` is timers with a 1 ms floor—yields the stack but is not tighter than `setImmediate`. Usual pattern: `setImmediate` between chunks.

**Trade-offs:**

`setImmediate` keeps work on this isolate. A Worker moves CPU off the loop. Do not use `setTimeout(fn, 0)` as a synonym for `setImmediate`.

**Follow-up:**

Why can a following request still wait until after a chunk scheduled with `setImmediate` from a poll handler?

Answer: That immediate runs in check before the next lap's poll. Newly readable sockets wait for that next poll, so the chunk is ahead of them. Already-queued poll callbacks still run before check.

### NODE-065 — The await inside an I/O callback still beats check

**Difficulty:** Senior

**Category:** Microtasks

**Question:**

Predict the log. The `readFile` callback is `async`. Explain why `after` cannot trade places with `immediate`.

```js
readFile(url, async () => {
  console.log('io');
  process.nextTick(() => console.log('tick'));
  await null;
  console.log('after');
  setImmediate(() => console.log('immediate'));
});
```

**Answer:**

Order: `io`, `tick`, `after`, `immediate`. The async poll callback returns at `await`; its checkpoint runs `tick` then the continuation (`after`), which schedules `setImmediate` still before check. Settled-await chains are microtask chains and postpone check until they stop. No pool race for `await null`.

**Follow-up:**

Change to `await readFile(otherUrl)` from `fs/promises`. Can `immediate` (still after that await) run before the second read's poll callback?

Answer: No. The promise fulfills from a future poll turn; `setImmediate` is only scheduled in that turn's continuation, so check is later. Other poll callbacks may run while the second read is on the pool—those are not `immediate`.

### NODE-066 — Two callbacks in one phase do not share one checkpoint

**Difficulty:** Advanced

**Category:** Timers

**Question:**

Both timeouts below become due in the same timers phase. Predict the log and the rule that puts `p1` between them. What changes if the second `setImmediate` is scheduled from inside the first?

```js
setTimeout(() => {
  console.log('t1');
  Promise.resolve().then(() => console.log('p1'));
}, 0);
setTimeout(() => console.log('t2'), 0);
setImmediate(() => {
  console.log('i1');
  process.nextTick(() => console.log('tick'));
});
setImmediate(() => console.log('i2'));
```

**Answer:**

Within timers: `t1`, `p1`, `t2`. Within check: `i1`, `tick`, `i2`. One callback, then checkpoint, then the next—phases do not batch all JS then drain microtasks once. A nested `setImmediate` from `i1` misses this snapshot and waits for a later iteration. Do not staple timers and immediates into one top-level global order (NODE-055).

**Follow-up:**

Add `process.nextTick(() => console.log('tick-from-t1'))` inside `t1`. Can it run after `t2`?

Answer: No. It is part of `t1`'s checkpoint with `p1` (`nextTick` before `p1`). Order: `t1`, `tick-from-t1`, `p1`, `t2`.

### NODE-067 — setInterval re-arms in the timers phase and does not overlap itself

**Difficulty:** Senior

**Category:** Timers

**Question:**

Explain `setInterval` on Node 20: when the next firing is scheduled, whether two callbacks can share the stack, and what a callback longer than the interval does to the next fire. Do not quote measured drift.

**Answer:**

Same timers phase and delay clamp as `setTimeout`. Node re-arms from the loop time sampled when about to call the callback; one timer, one stack—no overlap, no catch-up burst of missed ticks. A slow body can make the next visit find the timer already due (gap shorter than the delay). Delay `0` is a 1 ms repeating timer. `clearInterval` / `refresh` / `unref` do not move it to check.

**Follow-up:**

An async interval callback `await`s work that settles on a later poll. Can a second fire start before that promise settles?

Answer: Yes. The async callback returns at `await`; the timer does not await that promise. Use a flight flag or clear until settled, then reschedule.

### NODE-068 — timers/promises and scheduler.yield are the same phases plus a microtask

**Difficulty:** Senior

**Category:** Timers

**Question:**

`await setTimeout(0)` from `timers/promises` and `await scheduler.yield()` look like language features. Which phase fulfills each promise, when does code after `await` run, and what does an aborted signal do?

**Answer:**

`timers/promises.setTimeout` is still the timers phase (0 → 1 ms floor); fulfillment's `await` continuation is a microtask after that timer callback. `scheduler.yield()` is experimental and wraps `setImmediate` (check); `scheduler.wait` wraps `setTimeout`. `AbortSignal` rejects with `AbortError` (microtask after `abort()`, not a sync throw from `abort`). `ref: false` unrefs the underlying handle.

**Follow-up:**

Abort during `after-yield`, before the timeout fires. Does `after-timeout` run?

Answer: No. The timeout promise rejects with `AbortError`. A `try/catch` around that `await` runs as the rejection continuation; the timers phase does not also fulfill.

### NODE-069 — A long synchronous callback stalls every later phase

**Difficulty:** Senior

**Category:** Starvation

**Question:**

A poll callback parses a large in-memory payload with a synchronous loop before scheduling anything. Timers are already due and another socket is readable. Why do none run during the parse, and what do you change?

**Answer:**

Run-to-completion: poll does not preempt for due timers, check, or other ready sockets. Split into chunks with `setImmediate` (phase placement per NODE-064), or move CPU to a Worker. The pool does not help—bytes are already on the heap. `nextTick` between chunks does not yield to poll.

**Follow-up:**

A health-check `'data'` and its timeout both miss during the parse. Is that a poll bug?

Answer: No. Both wait until the parse returns. The callback is too long; phase order cannot insert a preemption JavaScript does not have.

### NODE-070 — A promise chain that never empties is starvation too

**Difficulty:** Senior

**Category:** Starvation

**Question:**

A handler keeps scheduling with `Promise.resolve().then(step)` forever; timers and sockets stall. How does this differ from a synchronous loop, and why is `await Promise.resolve()` in a `while` the same failure?

**Answer:**

A sync loop never returns, so the checkpoint never starts. A promise pump returns, then the checkpoint never finishes—microtasks keep requeueing. `while (work) { await Promise.resolve(); ... }` is the same pump. Repair: `setImmediate(step)` (or a timer) so the lap can reach check and later poll. One settled `await` is fine; an unbounded chain is not.

**Follow-up:**

Does a single `await Promise.resolve()` in an otherwise sync handler delay an already-due timer by a full lap?

Answer: Only by one checkpoint: handler returns, microtask runs, then the lap can reach timers. A loop of them is the starvation case.

### NODE-071 — Predict the log from one poll callback

**Difficulty:** Advanced

**Category:** Prediction

**Question:**

`onRequest` is a poll callback. Predict the log. Refuse orders the rules do not fix.

```js
function onRequest() {
  console.log('sync');
  setTimeout(() => console.log('timeout'), 0);
  setImmediate(() => console.log('immediate'));
  Promise.resolve().then(() => {
    console.log('promise');
    process.nextTick(() => console.log('tick-from-promise'));
  });
  queueMicrotask(() => console.log('micro'));
  process.nextTick(() => {
    console.log('tick');
    Promise.resolve().then(() => console.log('promise-from-tick'));
  });
  console.log('sync-end');
}
```

**Answer:**

Fixed order: `sync`, `sync-end`, `tick`, `promise`, `micro`, `promise-from-tick`, `tick-from-promise`, `immediate`, `timeout`. Checkpoint before check; timers after check once the 1 ms floor elapses. Refuse unrelated connections and inventing durations.

**Follow-up:**

Add `readFile(url, () => console.log('file'))` first in `onRequest`. Where does `file` go?

Answer: Refuse a fixed slot vs `immediate`/`timeout`. It is a later poll after the pool posts. It cannot precede this callback's checkpoint; relative to check/timers depends on when the completion arrives.

### NODE-072 — A throw in a phase callback is that turn's exception

**Difficulty:** Senior

**Category:** Errors

**Question:**

A timer callback throws. `setTimeout` sits in a `try/catch`. A `nextTick` and a promise reaction were queued before the throw. What catches the throw, what happens to those queued callbacks, and how is a rejection different?

**Answer:**

`try/catch` around `setTimeout` only catches registration failures. The callback's throw is that later turn—handle inside the callback or via `uncaughtException` (NODE-028). Do not design on earlier-queued `nextTick` still running after a throw. Rejections are a different channel (`unhandledRejection` unless handled); they are not caught by `try/catch` around registration.

**Follow-up:**

Does `finally` on an async poll callback run before `setImmediate`s scheduled before the `await`?

Answer: Yes when that continuation is this callback's checkpoint: `finally` is part of settling the async function (microtask) before check. `finally` is not its own phase.

### NODE-073 — beforeExit is the empty-loop check, not a phase you schedule

**Difficulty:** Senior

**Category:** Process lifetime

**Question:**

Where does `beforeExit` sit relative to poll, check, and timers? What can a listener schedule that causes another lap, and what does `exit` refuse to wait for?

**Answer:**

`beforeExit` is not a libuv phase. Node emits it when the loop has no ref'd work and is about to finish. A listener may schedule ref'd work (timer/immediate/I/O) and get another lap; pure sync work does not keep the process up. Not emitted for `process.exit()` or uncaught exceptions. `exit` listeners are sync only—timers/immediates/promises from `exit` do not get another lap.

**Follow-up:**

If the timer scheduled from `beforeExit` is unref'd, does it still print?

Answer: Not if it was the only added work—an unref'd timer does not keep the loop alive, so the process can exit without firing it. Leave it ref'd to get the callback.

### NODE-074 — Ordering guarantees you can promise, and the ones you cannot

**Difficulty:** Senior

**Category:** API design

**Question:**

You publish a function that takes a callback and sometimes fails synchronously on a bad argument. Which queue lets callers attach listeners and keeps the callback async? Which guarantees about two sockets or `setTimeout(fn, 0)` vs `setImmediate` do you refuse in the docs?

**Answer:**

Use `process.nextTick(callback, err)` for "after I return, before the loop continues" (same pattern as `'listening'`). Cost: recursive `nextTick` starves poll. Refuse documenting universal `setTimeout(0)` vs `setImmediate` winners, fair socket ordering, or "handler promises beat other connections." Promise: return before the callback; bad args call once asynchronously; never double-call or throw after return.

**Code:**

```js
function loadConfig(path, callback) {
  if (typeof path !== 'string') {
    nextTick(callback, new TypeError('path must be a string'));
    return;
  }
}
```

**Follow-up:**

Would `queueMicrotask(callback)` satisfy the "before any I/O" contract?

Answer: It runs before the next phase, but not before other microtasks already queued this turn. If the caller must attach `.then` after the call and still see your error first, `nextTick` is the match.

### NODE-075 — Read the handler and name the turn each line belongs to

**Difficulty:** Advanced

**Category:** Prediction

**Question:**

Name the turn for each log, predict the order the rules fix, and refuse what you will not order. Answer the claim that `await cache()` ran the handler on a worker (`cache()` returns an already fulfilled promise).

```js
async function onRequest(res) {
  console.log('handler');
  nextTick(() => console.log('tick'));
  const value = await cache(); // Promise.resolve('hit')
  console.log(value);
  setImmediate(() => console.log('immediate'));
  setTimeout(() => console.log('timeout'), 0);
  readFile(url, () => console.log('file'));
  res.end('ok');
  console.log('handler-end');
}
```

**Answer:**

Fixed: `handler`, `tick`, `hit`, `handler-end`, `immediate`, `timeout`. Poll returns at `await`; continuation is still that checkpoint on the same isolate—not a Worker. `file` has no fixed slot vs check/timers. `await cache()` did not start an OS thread.

**Follow-up:**

If `cache` sometimes awaits a real file read, which prefix survives?

Answer: `handler` and `tick` stay on the first poll turn/`nextTick` before the first real suspension. `hit`, `handler-end`, `immediate`, and `timeout` move to the fulfillment's checkpoint. The six-line order does not survive; the placement rule does.

### NODE-076 — queueMicrotask and Promise.then share a queue and split on errors

**Difficulty:** Senior

**Category:** Microtasks

**Question:**

On Node 20, which queue do `queueMicrotask(fn)` and `promise.then(fn)` use, when does each job get queued, and what happens if the callback throws? Not the ESM evaluation question.

**Answer:**

Same V8 microtask queue after `nextTick`; order is enqueue order. `queueMicrotask` appends immediately; `then` appends only when the promise fulfills (already-fulfilled: before `then` returns, still as a microtask). Chained `.then(b)` waits for `a` to settle. Throw in `then` rejects the derived promise (`unhandledRejection` if unhandled). Throw in `queueMicrotask` is an uncaught exception—no `.catch` target. Executors are still synchronous.

**Follow-up:**

With `p.then(a).then(b)` and a `queueMicrotask` between the two `then` calls, can `b` run before that microtask?

Answer: No. `b` is queued when `a` settles; the intervening `queueMicrotask` was already in the queue, so `b` runs after it, still in the same checkpoint.

### NODE-077 — setInterval drift is lateness the next arm does not pay back

**Difficulty:** Senior

**Category:** Timers

**Question:**

A metrics interval uses `setInterval(fn, 1000)`. Under load, fires move later than `start + n * 1000`. What does Node do with that lateness, why is there no catch-up burst, and which schedule avoids accumulating it? No measured drift.

**Answer:**

One timer; next deadline is re-arm sample + delay (monotonic loop time), not `start + n * delay`. Late fires push future deadlines; missed slots are not replayed as a burst. A self-correcting chain of `setTimeout` toward a fixed series (or delay-from-end-of-work) avoids accumulating that slip. `Date.now()` NTP steps are not this timer's clock.

**Follow-up:**

Clear the interval at the first line of the callback. Can a re-armed fire still happen?

Answer: Re-arm already inserted the next deadline before the body; `clearInterval` on that handle removes it. The running body finishes; no later fire and no catch-up callback.

### NODE-078 — unref and ref are a lifetime vote, and the callback stays in its phase

**Difficulty:** Senior

**Category:** Timers

**Question:**

What do `timeout.unref()`, `ref()`, and `hasRef()` change? Correct teammates who say `unref` moves the callback to check/cancels it, or that an unref'd interval never fires while a server is listening.

**Answer:**

`unref`/`ref` change the keep-alive vote only—not the phase, and not cancel. An unref'd timeout stays timers; an unref'd immediate stays check. If other ref'd work (e.g. a listening server) keeps the loop alive, the unref'd callback still runs when due. If it is the only armed work, the loop may exit without firing it (`beforeExit`/`exit` boundary).

**Follow-up:**

Unref immediately with nothing else ref'd; in `beforeExit` call `heartbeat.ref()`. Does `record` run?

Answer: Yes if still armed—`ref()` restores the vote so a timers phase can run it. The same `ref()` inside `exit` does not get another lap.

### NODE-079 — fs.readFile uses the pool because a file read can block; a TCP read does not

**Difficulty:** Senior

**Category:** Thread pool

**Question:**

Both `fs.readFile` and a TCP `'data'` handler are "asynchronous." Why does the file read take a pool thread and the socket read not? Where does each JavaScript callback run?

**Answer:**

Sockets are non-blocking and watched by the poller; the isolate reads buffered bytes in poll—no pool. Regular file `read` can block, so libuv runs it on the pool and posts a completion; JS still runs in poll on the main isolate. "Async" means two mechanisms. Sync fs blocks the isolate. `dns.lookup` is the same kind of offload as the file read.

**Follow-up:**

What does `readFileSync` do to a connection that becomes readable during the syscall, vs an in-flight `readFile`?

Answer: Sync holds the isolate—poll cannot deliver `'data'`. In-flight async holds a pool thread; poll can still deliver TCP while the pool reads. The file's JS waits for a later poll after completion.

### NODE-080 — An empty poll computes a wait; a due timer makes that wait zero

**Difficulty:** Senior

**Category:** I/O

**Question:**

When does Node 20 poll block in the kernel, and when does it return immediately? Separate an empty poll queue, a due timer, a not-yet-due timer, and a non-empty poll queue. A due timer must not be described as running inside the poller.

**Answer:**

Non-empty poll queue → run callbacks (due timers do not preempt). Empty + queued immediate or due timer → wait zero; due timer still runs in the timers phase after check/close. Empty + future timer → may block until that deadline or I/O. Empty + only a listening server → block until kernel activity. Unref'd-only timer → loop finishes rather than waits. Zero wait can still pick up already-readable sockets.

**Follow-up:**

One ready socket and one already-due timer: which runs first, and can the timer run between two already-queued poll callbacks?

Answer: Socket first (poll). Timer after check/close. Between two queued poll callbacks: no—checkpoint between them, timer still waits for the timers phase.

### NODE-081 — Microtasks that requeue hold an already queued immediate out of check

**Difficulty:** Senior

**Category:** Starvation

**Question:**

`setImmediate` was already called. Then a function keeps scheduling itself with `queueMicrotask`. What prints for a pump that stops after count `3`, and for one that never stops? Why does check lose?

```js
function onTurn() {
  console.log('sync');
  setImmediate(() => console.log('immediate'));
  let n = 0;
  function pump() {
    n += 1;
    if (n < 3) queueMicrotask(pump);
    else console.log('pumped');
  }
  queueMicrotask(pump);
  console.log('sync-end');
}
```

**Answer:**

Bounded: `sync`, `sync-end`, `pumped`, `immediate`. Unbounded: `sync`, `sync-end`, then only microtasks—`immediate` never prints even though it was queued first, because check is a phase after the checkpoint. A sibling immediate in the same check snapshot also waits for this checkpoint to finish.

**Follow-up:**

Move `setImmediate` to the last line of the third `pump`. Does `immediate` still wait for `pumped`?

Answer: Yes—`pumped` prints, then the immediate is queued, then check runs it after the checkpoint. An unbounded pump never reaches the `setImmediate` line.

### NODE-082 — An async function that throws rejects; a non-async throw escapes the turn

**Difficulty:** Senior

**Category:** Errors

**Question:**

Compare three timers callbacks: a non-async throw, an `async` function that throws before its first `await`, and a function that only does `Promise.reject`. What does the caller catch, which process event applies, and which still reach later lines?

**Answer:**

Non-async throw: later lines skip; `uncaughtException` unless caught inside. Async throw before `await`: rejects the returned promise before the call returns—timer continues; channel is `unhandledRejection` if unhandled. `Promise.reject` / `return Promise.reject`: timer continues; same rejection channel. `try/catch` around `setTimeout` sees none of these. Throw after `await` rejects in a microtask continuation the timer already left.

**Follow-up:**

`await boom()` inside an async timer with `try/catch`, and `setImmediate` scheduled before the `await`. Where does `catch` run relative to the immediate?

Answer: `catch` is part of the timers callback's microtask continuation (checkpoint), before check. The immediate was already queued; `catch` still runs first.

### NODE-083 — Multiple nextTick callbacks drain in queue order, nested ones at the tail

**Difficulty:** Senior

**Category:** Microtasks

**Question:**

Predict the log among several `process.nextTick` callbacks, including one queued from inside another. `onTurn` is a phase callback.

```js
function onTurn() {
  const out = [];
  process.nextTick(() => {
    out.push('a');
    process.nextTick(() => out.push('b'));
  });
  process.nextTick(() => out.push('c'));
  process.nextTick(() => out.push('d'));
  queueMicrotask(() => out.push('micro'));
  setImmediate(() => console.log(out.join(',')));
}
```

**Answer:**

Print: `a,c,d,b,micro`. Nested `nextTick` appends at the tail of the same drain—it does not recurse ahead of already-queued `c`/`d`. Microtasks wait until `nextTick` is empty. Not the ESM top-level exception.

**Follow-up:**

Add `process.nextTick(() => out.push('e'))` as the first line of `c`. Where does `e` land?

Answer: After `a` and `c`, with queue `d`, `b` already ahead when `e` is appended: `a`, `c`, `d`, `b`, `e`, `micro`.

### NODE-084 — Predict the log when a chained then meets queueMicrotask

**Difficulty:** Advanced

**Category:** Prediction

**Question:**

Predict the printed array. `queueMicrotask` and promise reactions share one queue; a chained `then` is not queued until the previous reaction settles.

```js
function onTurn() {
  const out = [];
  Promise.resolve().then(() => out.push('a')).then(() => out.push('b'));
  queueMicrotask(() => out.push('m'));
  Promise.resolve().then(() => out.push('c'));
  setImmediate(() => console.log(out.join(',')));
}
```

**Answer:**

Print: `a,m,c,b`. Sync turn queues `a`, then `m`, then `c`; `b` attaches to a pending intermediate and is appended only when `a` fulfills—behind `m` and `c`. Still this checkpoint, before check.

**Follow-up:**

If `a` returns `new Promise(() => {})` (never settles), which of `m`, `c`, and `b` still print before the immediate?

Answer: `a`, `m`, and `c` still run; `b` never prints. Hypothetical: `a,m,c`.

### NODE-085 — Predict the log when nextTick fulfills a pending promise

**Difficulty:** Advanced

**Category:** Prediction

**Question:**

Predict the log. The promise starts pending; `then` is attached before fulfillment; a `nextTick` fulfills it.

```js
function onTurn() {
  const out = [];
  let resolve;
  const pending = new Promise((r) => { resolve = r; });
  pending.then(() => out.push('then'));
  queueMicrotask(() => out.push('micro'));
  process.nextTick(() => {
    out.push('tick');
    resolve();
    queueMicrotask(() => out.push('micro-from-tick'));
  });
  process.nextTick(() => out.push('tick2'));
  setImmediate(() => console.log(out.join(',')));
}
```

**Answer:**

Print: `tick,tick2,micro,then,micro-from-tick`. `resolve()` only enqueues `then`; `tick2` finishes the `nextTick` drain first. `micro` was queued in the sync body before fulfillment, so it precedes `then`.

**Follow-up:**

Calling `resolve()` twice from `tick`—does `then` run twice?

Answer: No. A promise settles once; the second `resolve` is ignored. `then` was queued once.

### NODE-086 — Predict the log when a poll callback calls an async function

**Difficulty:** Advanced

**Category:** Prediction

**Question:**

`onRequest` is the poll callback. Predict the log. Place `await null` on the checkpoint, and place a `queueMicrotask` called after `label()` relative to that continuation.

```js
async function label() {
  console.log('before');
  await null;
  console.log('after');
}
function onRequest() {
  console.log('sync');
  process.nextTick(() => console.log('tick'));
  label();
  queueMicrotask(() => console.log('micro'));
  setImmediate(() => console.log('immediate'));
  console.log('sync-end');
}
```

**Answer:**

Order: `sync`, `before`, `sync-end`, `tick`, `after`, `micro`, `immediate`. `await` returns to `onRequest` before `sync-end`; `after` is queued before `micro` because `label()` ran first; `tick` precedes both microtasks.

**Follow-up:**

Swap so `queueMicrotask` runs before `label()`. Where does `micro` move?

Answer: Ahead of `after`: `sync`, `before`, `sync-end`, `tick`, `micro`, `after`, `immediate`.

### NODE-087 — A setImmediate scheduled from the timers phase waits for the next lap

**Difficulty:** Senior

**Category:** Timers

**Question:**

A callback already running in the timers phase schedules `nextTick`, `queueMicrotask`, `setImmediate`, and `setTimeout(fn, 0)`. Which orders follow from the lap, and which top-level race do you still refuse?

**Answer:**

Order: `timer`, `timer-end`, `tick`, `micro`, `immediate`, `timeout`. Check for this lap already passed, so the immediate is the next lap (poll can run first if sockets are ready). The new timeout has a 1 ms floor and cannot beat that next check. Refuse importing the top-level `setTimeout(0)` vs `setImmediate` race (NODE-055) as evidence for this case.

**Follow-up:**

Can a second `setImmediate` queued before this lap's check began still run after `onTimer`?

Answer: No. That older immediate was in this lap's check snapshot, which finished before timers. The immediate from `onTimer` is the next lap.

### NODE-088 — A finished pool read wakes poll and still runs its callback on the isolate

**Difficulty:** Senior

**Category:** Thread pool

**Question:**

`fs.readFile` is in flight. The loop thread is blocked in empty poll. The pool finishes the read. Who runs the JavaScript callback, and how does the blocked poll find out?

**Answer:**

The pool posts a completion and wakes the poller (async handle the poller already watches). The loop thread runs the JS in poll on the main isolate—not the pool thread. Wakeup does not preempt a long JS turn or a stuck `nextTick` drain. It can end a timer-bounded wait early without making that timer due.

**Follow-up:**

Poll was waiting with a 60 s timer deadline; the read finishes mid-wait. Does the file callback wait out the rest of the 60 s?

Answer: No. The completion wakes the poller; the file callback can run in that visit. The timer still runs only in a timers phase that finds it due.

### NODE-089 — Timer order follows expiry, and equal delays stay in registration order

**Difficulty:** Senior

**Category:** Timers

**Question:**

Explain order for two timers with the same delay and with different delays, including when a long sync callback holds the stack until both deadlines have passed. No measured fire times.

**Answer:**

Equal delays share a FIFO list by registration (`0` and `1` both clamp to 1). Different delays follow expiry: earlier threshold first. If both are already due when timers runs, earlier expiry still wins, then checkpoint, then the later one—no preserved wall gap. A timer scheduled from inside a running due callback is a new arm, not an automatic sibling of the current due list.

**Follow-up:**

Schedule delay `50` first and `10` second, then hold the stack past both. Which runs first?

Answer: Delay `10`. Expiry beats registration order when delays differ.

### NODE-090 — clearTimeout removes a future callback and does not unwind the one that is running

**Difficulty:** Senior

**Category:** Timers

**Question:**

What does `clearTimeout` do to a timer that has not fired, one whose callback is on the stack, and an interval that NODE-067 has already re-armed? Does `clearInterval` only work on `setInterval`?

**Answer:**

`clearTimeout`/`clearInterval` are interchangeable on a `Timeout`. Clearing before fire removes it. Clearing inside the running callback does not unwind the body; for an interval it removes the already-inserted next arm. `unref`/`refresh` are not cancel. Checkpoint work queued before clear still runs if the callback returns normally.

**Follow-up:**

Queue `nextTick(() => clearInterval(handle))` as the first line of an interval callback after re-arm. Can the next period fire?

Answer: No. The checkpoint clears the re-armed deadline before the next timers visit. The running body still finishes.

### NODE-091 — EventEmitter listeners share the current stack; the checkpoint starts after emit

**Difficulty:** Senior

**Category:** Scheduling

**Question:**

A poll callback emits with two listeners: the first queues `nextTick`, the second queues `queueMicrotask`. When do those run relative to the second listener and a line after `emit`?

```js
ee.on('go', () => { console.log('a'); process.nextTick(() => console.log('tick')); });
ee.on('go', () => { console.log('b'); queueMicrotask(() => console.log('micro')); });
ee.emit('go');
console.log('emitted');
```

**Answer:**

Order: `a`, `b`, `emitted`, `tick`, `micro`. `emit` is synchronous—no checkpoint between listeners. Queued work drains after the phase callback that called `emit` returns. Socket `'data'` listeners share this same model.

**Follow-up:**

Register a third listener from inside `tick` and emit again from that `tick`. Does the third listener see the first event?

Answer: No. The first `emit` already finished with its then-current list. A second `emit` from `tick` runs the new listener synchronously inside `tick`, before `micro`.

### NODE-092 — Predict the log when destroy schedules close beside an immediate

**Difficulty:** Advanced

**Category:** Prediction

**Question:**

`onData` runs in poll, queues `nextTick`, a promise, and `setImmediate`, then `socket.destroy()`. Predict the log with a `'close'` listener (abrupt close → close phase).

**Answer:**

Order: `data`, `tick`, `promise`, `immediate`, `close`. `destroy` schedules close; it does not emit on this stack. Checkpoint of poll, then check, then close (before timers). Graceful `end` would use `nextTick` instead (NODE-061)—do not reuse this order for that path.

**Follow-up:**

Add `setTimeout(() => console.log('timeout'), 0)` first in `onData`. Where does `timeout` sit vs `close`?

Answer: Close before timers on Node 20, so `close` before `timeout` once due. The floor can only push `timeout` later, not ahead of this lap's close. Immediate stays ahead of both.

### NODE-093 — An in-flight file request keeps the loop alive after a timer is unref'd

**Difficulty:** Senior

**Category:** Process lifetime

**Question:**

A script unrefs its only timer and still does not exit; the other call is `fs.readFile`. Why does the process stay up, which phase runs the file callback, and how would you make the timer the keep-alive reason instead?

**Answer:**

`readFile` holds a ref'd request until completion; `timer.unref()` does not unref that request. The JS callback runs in poll. While the request keeps the loop alive, an unref'd timer can still fire if a timers phase finds it due—`unref` means "not the last vote," not "skip while anything else is alive." Leave the timer ref'd to pin the process; clearing the timer does not cancel the read.

**Follow-up:**

Call `timer.ref()` inside the file callback. Can the process exit at the end of that callback?

Answer: Not if the timer is still armed—`ref()` restores its vote after the request completes. If already cleared, `ref()` does not create a new arm.

### NODE-094 — A false return from socket.write means drain is a later turn

**Difficulty:** Senior

**Category:** I/O

**Question:**

`socket.write(chunk)` returns `false`. A teammate retries in a `while` until `true`; another awaits `queueMicrotask` before writing more. When does Node say the buffer has drained, and which phase may that be?

**Answer:**

`false` means the writable buffer is at/over the high-water mark (default 16 KiB for byte mode)—bytes are still queued; the call did not block. `'drain'` fires later when a write completion brings the buffer under the mark—poll or the bounded pending drain after poll, not a microtask/`nextTick`. Stop writing, wait for `'drain'`, then continue. Spinning or microtask-yielding is not backpressure.

**Code:**

```js
socket.on('data', (chunk) => {
  if (!socket.write(chunk)) socket.pause();
});
socket.on('drain', () => socket.resume());
```

**Follow-up:**

Writing again in the same `'data'` callback after `false`—is the second write refused?

Answer: No. It is accepted and may return `false` again. `'drain'` still comes on a later I/O turn; the second write only made the overrun larger.

### NODE-095 — refresh rewinds the start time and leaves the phase and the delay value alone

**Difficulty:** Intermediate

**Category:** Timers

**Question:**

What does `timeout.refresh()` change on Node 20, and what does it leave alone? Include a one-shot that has already fired and an interval that has not.

**Answer:**

Same object, same delay, start set to now; phase stays timers; `hasRef()` unchanged. Postpones an unfired interval (debounce). Rearms a fired one-shot without allocating. Does not clear, does not undo `clearTimeout`, and does not imply `ref`/`unref`. Repeated refresh under load can slide forever—correct for debounce, wrong for a fixed cadence.

**Follow-up:**

`refresh()` from a `nextTick` just before the timers phase that was about to fire it—can the callback still run in that phase?

Answer: Usually no. The checkpoint runs first and moves the deadline to delay-from-now, so that upcoming timers visit typically skips this handle unless the delay is already elapsed.

### NODE-096 — Predict the check-phase log, and refuse to order a nested immediate against a timeout

**Difficulty:** Advanced

**Category:** Prediction

**Question:**

`onCheck` and `also` were both queued before this check started (`onCheck` first). Predict what the rules fix, and name the pair you will not order.

```js
function onCheck() {
  console.log('i1');
  process.nextTick(() => console.log('tick'));
  queueMicrotask(() => console.log('micro'));
  setImmediate(() => console.log('nested'));
  setTimeout(() => console.log('timeout'), 0);
}
function also() { console.log('i2'); }
```

**Answer:**

Fixed: `i1`, `tick`, `micro`, `i2`. Nested immediate misses this snapshot; timeout cannot slip between `i1` and `i2`. Refuse a universal `nested` vs `timeout` order—timers of this lap may run before the next check if the floor has elapsed, or after if not (NODE-055 refusal for scheduling both from a running immediate).

**Follow-up:**

Delete the `setTimeout` line. What is the full order including `nested`?

Answer: `i1`, `tick`, `micro`, `i2`, `nested` (next iteration's check after intervening poll). A readable socket could still run in that poll; this snippet has none.

### NODE-097 — A chain of setImmediate reaches later phases; a chain of microtasks does not

**Difficulty:** Senior

**Category:** Scheduling

**Question:**

A check callback must process a queue and also let a due timer run. Compare rescheduling with `setImmediate` vs `queueMicrotask`. Which lets the Node 20 lap reach timers, and where does poll fit?

**Answer:**

Unbounded `queueMicrotask` never finishes this checkpoint—due timer and poll stay blocked. Nested `setImmediate` from check waits for the next iteration; this lap still reaches close and timers first, so a due timer can run before the nested immediate, and following laps get poll. `nextTick` requeue is stricter (also holds off microtasks).

**Follow-up:**

Start `stepImmediate` from poll instead of check. Can the due timer run before the second chunk?

Answer: The first nested immediate is this lap's check—before timers—so the second chunk runs before that due timer. Later chunks, scheduled from check, wait for following laps after this timer. Placement depends on which chunk you mean (NODE-064).

### NODE-098 — A rejection handler in this checkpoint still counts; one in check is a later turn

**Difficulty:** Senior

**Category:** Errors

**Question:**

A timers callback creates a rejected promise with no `.catch` before return. You can attach `.catch` in a `nextTick` from that callback, in a microtask from that callback, or in `setImmediate`. Which prevent `unhandledRejection`, and which are too late?

**Answer:**

Same-turn handlers (sync, `nextTick`, or microtask in this checkpoint) prevent `unhandledRejection` under default policy. `setImmediate` is check—after the turn ended—so the event already fired (`rejectionHandled` may follow). Check is not special because the name says immediate. Non-async throws are `uncaughtException`, not this question.

**Follow-up:**

Attach `.catch` in a microtask queued from the `nextTick` (not directly from the timer). Same turn?

Answer: Yes. That microtask still runs before the checkpoint returns. It stops being the same turn if the `nextTick` instead calls `setImmediate`.

### NODE-099 — Predict the log when the promise is queued from nextTick and the microtask was queued first

**Difficulty:** Advanced

**Category:** Prediction

**Question:**

Predict the log. `queueMicrotask` runs in the synchronous body; the only `Promise.then` is inside the `nextTick`.

```js
function onTurn() {
  console.log('sync');
  process.nextTick(() => {
    console.log('tick');
    Promise.resolve().then(() => {
      console.log('promise');
      process.nextTick(() => console.log('tick-from-promise'));
    });
  });
  queueMicrotask(() => console.log('micro'));
  setImmediate(() => console.log('immediate'));
  console.log('sync-end');
}
```

**Answer:**

Order: `sync`, `sync-end`, `tick`, `micro`, `promise`, `tick-from-promise`, `immediate`. `micro` was queued before `promise` existed; `tick-from-promise` still beats check. Not the ESM top-level exception.

**Follow-up:**

Add `process.nextTick(() => console.log('tick2'))` right after the first `nextTick` in the sync body. Where does `tick2` print?

Answer: After `tick`, before microtasks: `tick`, `tick2`, `micro`, `promise`, `tick-from-promise`, `immediate`.

### NODE-100 — Separate the orders the rules fix from the top-level timeout and immediate race

**Difficulty:** Advanced

**Category:** Prediction

**Question:**

Predict what you can. The snippet schedules `setTimeout(fn, 0)` and `setImmediate` at top level, and a different pair inside a `readFile` callback, plus checkpoint work. Which lines have an order, and which pairs do you refuse?

```js
setTimeout(() => console.log('timeout-top'), 0);
setImmediate(() => console.log('immediate-top'));
readFile(url, () => {
  console.log('io');
  process.nextTick(() => console.log('tick'));
  process.nextTick(() => {
    console.log('tick2');
    process.nextTick(() => console.log('tick-nested'));
  });
  queueMicrotask(() => console.log('micro'));
  Promise.resolve().then(() => console.log('promise'));
  setImmediate(() => console.log('immediate-io'));
  setTimeout(() => console.log('timeout-io'), 0);
});
```

**Answer:**

Refuse `timeout-top` vs `immediate-top`, and either vs `io` (read duration unknown; pre-loop timers race). Once `io` runs, fixed: `io`, `tick`, `tick2`, `tick-nested`, `micro`, `promise`, `immediate-io`, `timeout-io`. Inside that poll callback, check before timers; the floor cannot put `timeout-io` ahead of `immediate-io`.

**Follow-up:**

Move both I/O-scheduled timer/immediate calls to top level; leave only checkpoint calls inside `readFile`. What remains ordered?

Answer: Inside `io`: `io`, `tick`, `tick2`, `tick-nested`, `micro`, `promise`. All four timer/immediate callbacks become top-level races—refuse ordering them against each other and against `io`.
