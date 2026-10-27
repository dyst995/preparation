# NODE02 — Event loop and asynchronous execution

Node.js 20 and 22. Questions NODE-051–NODE-100.

These questions are about how Node decides which callback runs next. libuv walks a fixed sequence of phases. After every JavaScript callback, Node runs a checkpoint: it drains the `process.nextTick` queue, then promise jobs. `setTimeout`, `setImmediate`, `async`/`await`, and I/O callbacks all sit on that model. The libuv thread pool shows up only when filesystem work, `dns.lookup`, or crypto finishes away from the loop and posts a completion back to poll. Worker threads are a later section.

Phase order depends on the libuv version. libuv 1.45.0, which shipped with Node 20 and is still the model in Node 22, runs timers at the end of each lap, and also runs timers once before the loop is entered. The older diagram that opens every lap with timers is the pre-1.45 loop. The special `nextTick` and promise order at the top of an ES module is NODE-021, not this file.

### NODE-051 — The phases a Node 20 loop actually walks

**Difficulty:** Senior

**Category:** Event loop phases

**Question:**

Draw the event-loop phases for a Node 20 or 22 process and say what each one is for. A teammate draws timers at the start of every lap and asks where `process.nextTick` sits. Correct the lap, and leave `nextTick` out of the phase boxes.

**Answer:**

The event loop is the cycle Node uses to run queued callbacks. On Node 20 and 22, libuv 1.45 and later runs due timers once before the loop if the loop is already alive. Each lap is then pending callbacks, idle, prepare, poll, a bounded second pending pass, check, close, and timers. Poll runs ready I/O and may wait in the kernel. Check is `setImmediate`, close is an abrupt socket close, and timers are `setTimeout` and `setInterval`. Idle and prepare are internal. Opening every lap with timers is the older loop. `process.nextTick` is not a phase.

**Follow-up:**

Which phase can block in the OS, and which only run already-queued JavaScript?

Answer: Poll is the phase that can block, and only when its computed wait is greater than zero. Every other phase runs callbacks or internal handles that are already queued, then returns. Once any callback has started, it holds the JavaScript stack until it returns, in every phase.

### NODE-052 — One callback, then nextTick, then promise jobs

**Difficulty:** Senior

**Category:** Microtasks

**Question:**

State the checkpoint Node runs after one phase callback on Node 20 or 22, including work scheduled while draining. Predict the log when `onTurn` is a timers, poll, or check callback, not top-level ESM. This is not NODE-021.

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

After one phase callback returns, Node empties the `process.nextTick` queue, then runs promise jobs and `queueMicrotask` callbacks. If one of those jobs queues another `nextTick`, Node repeats until both queues are empty. Only then does the next callback or phase start. In this snippet the log is `tick,tick2,promise,micro,promise2,micro-from-tick,tick-from-promise`. `tick2` still belongs to the first `nextTick` drain, so it runs before any promise. `tick-from-promise` waits until that microtask queue is empty. This is an ordinary phase callback, not the ES module case in NODE-021.

**Follow-up:**

If `promise2` queues `queueMicrotask(() => out.push('inner'))` instead of `nextTick`, where does `inner` land?

Answer: `inner` is another microtask, so it runs before the checkpoint finishes. It is queued while `promise2` is running, after `micro-from-tick` was already waiting, so it prints after `promise2` and after `micro-from-tick`. It does not enter the `nextTick` queue, and it does not wait for a later phase.

### NODE-053 — setTimeout(fn, 0) is a timer with a minimum, not "run next"

**Difficulty:** Intermediate

**Category:** Timers

**Question:**

A candidate writes `setTimeout(fn, 0)` and calls it "run `fn` next, after this function." Say what Node 20 or 22 schedules, which phase runs it, and what the `0` becomes. Does Node apply the browser nested-timer clamp?

**Answer:**

`setTimeout(fn, 0)` schedules a timers-phase callback. It does not run as soon as the current function returns. Node raises any delay below 1 millisecond, including 0, to 1 millisecond. A delay above 2,147,483,647 is also forced to 1, with a warning. The delay is a minimum. The callback runs when a later timers phase finds it due, which on Node 20 and 22 is the end of a lap, plus one timers pass before the loop starts. Node does not apply the browser's 4 millisecond nested-timer clamp, and this is not `process.nextTick`.

**Follow-up:**

What does `setTimeout(fn, 1.9)` store, and how are two such timers ordered?

Answer: `1.9` stays `1.9`. It is already at least 1 and within the 32-bit range, so Node does not chop it down to 1. Two timers with that same delay run in registration order: the one created first runs, then its checkpoint, then the later one.

### NODE-054 — setImmediate is the check phase

**Difficulty:** Intermediate

**Category:** Timers

**Question:**

What does `setImmediate` schedule, which phase runs it, and what happens to an immediate queued from inside an immediate that is already running?

**Answer:**

`setImmediate(callback, ...args)` queues `callback` for the check phase, which runs after poll. There is no delay. Extra arguments are passed through to the callback. Immediates that were queued before check starts run in the order they were registered. When check begins, Node takes a snapshot of that queue. An immediate scheduled from inside one that is already running misses the snapshot and waits for a later lap. After each immediate returns, the checkpoint drains before the next immediate in the same phase starts.

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

Answer: No, `clearImmediate` removes `second` from the queue, so it does not run. The checkpoint from `first` still runs, and a nested immediate scheduled from `first` still waits for a later lap.

### NODE-055 — Timeout versus immediate inside I/O, and at the top level

**Difficulty:** Senior

**Category:** Timers

**Question:**

Predict `setTimeout(fn, 0)` against `setImmediate(fn)` inside an I/O callback and at the top level of the main module. Which prediction do the phase rules support, and which do you refuse?

**Answer:**

Inside a poll I/O callback the order is fixed. The callback finishes its synchronous work, the checkpoint runs `nextTick` and then promises, check runs the immediate, and timers run the timeout after its 1 millisecond floor. In that situation the hypothetical log is `io`, `tick`, `promise`, `immediate`, `timeout`. At the top level of the main module, refuse to name a winner. The timers pass before the loop may or may not see the timeout as due before the first check. Startup timing decides, and Node's own guide shows both orders.

**Trade-offs:**

Prefer not to need this order. When the intent is "after I/O callbacks may run," use `setImmediate`. When you need a real minimum delay, pass that delay to `setTimeout`. Do not use `0` as slang for "next."

**Follow-up:**

If `setTimeout(fn, 0)` is scheduled before `readFile`, and `setImmediate` stays inside the read callback, can `timeout` print before `io`?

Answer: Yes. The timer can fire in any timers phase that finds it due before the thread-pool completion reaches poll. Once `io` runs, the immediate is only then scheduled, so you no longer have the stable "immediate, then timeout" pattern from inside I/O.

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

`await` does not block the thread, and it does not move the rest of the function onto a pool thread or a worker. `label` runs until `await null`, then the continuation is queued as a promise microtask on this same isolate. `onTimer` keeps going and prints `timer-end` before `after`. The checkpoint runs `tick` before that microtask. On Node 20 and 22 the timers phase is at the end of the lap, so `immediate` waits for a later check. The order is `timer`, `before`, `timer-end`, `tick`, `after`, `immediate`.

**Follow-up:**

Change to `await new Promise(() => {})`. Which lines still print, and is the thread blocked?

Answer: `timer`, `before`, `timer-end`, and `tick` still print, and `after` never does, because that promise never settles. `immediate` still runs on a later lap. The pending promise holds memory, not the stack, and by itself it does not keep the process alive.

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

Nothing prints. `starve` queues another `nextTick` every time it runs, so the checkpoint never becomes empty. The loop therefore never reaches poll or check, and neither `immediate` nor `io` can run. The thread pool may finish the file read and post a completion, but the JavaScript callback still has to wait for a poll turn on the main isolate. This is a queue that never drains, not a lock deadlock. A promise chain that keeps scheduling itself has the same shape on the microtask queue.

**Follow-up:**

If `starve` stops after a fixed count, can `io` print before `immediate`?

Answer: Once `nextTick` empties, both callbacks can be reached. If the read has already completed, poll can run `io` before check runs `immediate`; if it is still in flight, `immediate` can win. Stopping the flood does not create one fixed order between them.

### NODE-058 — What poll does, and when it waits

**Difficulty:** Senior

**Category:** I/O

**Question:**

Explain the poll phase in Node 20 and 22: what callbacks run there, when the thread blocks in the kernel, and what stops that wait. A colleague says poll runs every kind of asynchronous callback.

**Answer:**

Poll collects ready I/O and runs those callbacks: sockets, and completions from filesystem, DNS, and crypto work the thread pool finished. Timers, `setImmediate`, and close callbacks are other queues. If callbacks are already waiting, a `setImmediate` is queued, or a timer is already due, the wait is zero. Otherwise poll may block until the next timer deadline or until the kernel reports I/O. libuv limits one visit so check, close, and timers are not postponed forever. A long callback still holds the stack after the kernel is ready.

**Follow-up:**

Why does a process with only a ref'd `setImmediate` and no sockets exit after the callback instead of blocking forever in poll?

Answer: A queued immediate tells the loop not to sleep in an idle poll, so check runs the callback. If nothing else is keeping the process alive, the loop is finished. Poll's wait is a calculated timeout, not an unconditional block.

### NODE-059 — Pending callbacks are not the poll queue

**Difficulty:** Intermediate

**Category:** Event loop phases

**Question:**

What runs in the pending-callbacks phase, and why does a connection error sometimes show up there instead of inside poll? Distinguish that queue from `process.nextTick` and from poll.

**Answer:**

Pending callbacks are libuv's queue for I/O that was deferred, such as some Unix `ECONNREFUSED` errors. They run at the start of the lap and again after poll, with a fixed cap on that second pass. The cap is a libuv detail, not a Node API. This queue is not `process.nextTick`, which is the checkpoint and can starve poll if it never empties. It is also not the poll queue. A server's `'listening'` event is usually emitted from `nextTick`.

**Follow-up:**

Can a `'data'` handler be starved by write completions that outpace check?

Answer: The pending pass after poll is capped, so check still gets a turn even if more deferred callbacks remain. The cap limits how many callbacks run, not how long one of them may take. A single long write callback still holds the stack until it returns.

### NODE-060 — Idle and prepare are real phases, and they are not your callback

**Difficulty:** Intermediate

**Category:** Event loop phases

**Question:**

The diagram has idle and prepare between pending callbacks and poll. A candidate says `setImmediate` is the idle phase because the process runs it when idle. Correct the names.

**Answer:**

Idle and prepare are real libuv phases. When they have active handles, they run after pending callbacks and before poll, on every lap. The name "idle" does not mean "run this when the process is quiet." Node's public APIs do not put your callbacks there. `setImmediate` belongs to check, which is after poll. `setTimeout` belongs to timers. `process.nextTick` is the checkpoint after a callback, not a phase at all. The English word "idle" is a bad reason to reuse that box.

**Follow-up:**

Can an active idle handle delay a due timer on Node 20 or 22?

Answer: Idle and prepare run before poll, and timers run after close, so a long idle callback holds the stack and pushes the timers phase of that lap later. That is the same delay any long synchronous turn causes. The phase existing is not an extra penalty on timers.

### NODE-061 — Which close runs in the close phase

**Difficulty:** Senior

**Category:** I/O

**Question:**

`socket.destroy()` and a graceful `socket.end()` can both end with `'close'`. Which path does Node attribute to the close-callbacks phase, and what does the other use? Where does `server.close(callback)` sit relative to open connections?

**Answer:**

The close phase runs after check and before timers. `socket.destroy()` is an abrupt close, and its `'close'` event is emitted in that phase. A graceful `socket.end()` can emit the same event name, but Node schedules that one with `process.nextTick` instead. Either way, `'close'` is a later turn than the last `'data'`. `server.close(callback)` only stops the server from accepting new connections. The callback runs when the listening handle has closed and existing sockets are gone. It does not destroy those sockets for you.

**Follow-up:**

Calling `destroy()` from a `'data'` handler: can `'close'` run before that handler returns, and does a `nextTick` queued just before `destroy()` run before `'close'`?

Answer: `destroy` only schedules the close and does not emit `'close'` on the current stack, so the handler returns first. Its checkpoint then drains the `nextTick`, and the close phase runs after check. That `nextTick` therefore runs before `'close'`.

### NODE-062 — The pool finishes off the loop; the callback still waits for poll

**Difficulty:** Senior

**Category:** Thread pool

**Question:**

`fs.readFile`, `dns.lookup`, and `crypto.pbkdf2` are called "async, so they use threads." Place the libuv pool relative to the phases. What runs on a pool thread versus poll? How do `dns.resolve` and `pbkdf2Sync` differ? This is not a worker-threads question.

**Answer:**

The libuv pool is a small set of threads for blocking native work. Your JavaScript never runs there. The default size is 4, set by `UV_THREADPOOL_SIZE`, with a maximum of 1024. Pool threads run file operations, `dns.lookup` via `getaddrinfo`, and heavy crypto. When one finishes, it posts a completion, and your callback runs later on the main isolate during poll. `dns.resolve` uses c-ares on the loop and skips the pool. `pbkdf2Sync` blocks the isolate directly. Sockets do not use the pool. A checkpoint that never drains still delays a finished completion.

**Follow-up:**

Four `pbkdf2` calls occupy the pool; a fifth `readFile` is issued; a socket request arrives. What can poll run while the hashes continue?

Answer: The socket callback can run, because a socket does not need a pool thread. The fifth `readFile` waits until a pool thread is free before it even has a completion to deliver. Hash callbacks and socket callbacks never share a stack, and neither kind of JavaScript runs on the pool.

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

Node drains every `nextTick`, then the microtasks, and if a microtask queued a new `nextTick` it drains that too, all before the next phase. The order is `sync`, `sync-end`, `tick`, `promise`, `micro`, `promise-from-tick`, `tick-from-promise`, `immediate`. `promise-from-tick` was queued during the `nextTick` drain, so it is already waiting when microtasks start. `tick-from-promise` is queued during `promise`, so it runs only after the microtask queue empties, and it still runs before check. The rule is not "run `nextTick` once, then let promises run forever."

**Follow-up:**

Add `queueMicrotask(() => console.log('inner'))` as the first line of the `promise` reaction. Where does `inner` print?

Answer: It prints after `promise`, and after `micro` and `promise-from-tick`, which were already queued, and before `tick-from-promise`. The sequence through that part is `promise`, `micro`, `promise-from-tick`, `inner`, `tick-from-promise`.

### NODE-064 — Which schedule actually lets poll run

**Difficulty:** Senior

**Category:** Scheduling

**Question:**

You have a large in-memory batch on the main isolate and want other sockets' poll callbacks between chunks. Compare `process.nextTick`, a resolved promise, `setImmediate`, and `setTimeout(fn, 0)`. Which let the loop reach poll?

**Answer:**

`process.nextTick` and `Promise.then` stay inside the checkpoint. If you reschedule the next chunk that way, poll never starts. `setImmediate` schedules check, which does let the loop move on. From the timers phase or from top-level code, the next lap reaches poll before that immediate. From inside poll, check runs after the callbacks already queued for this visit, and new I/O waits for the following lap. `setTimeout(fn, 0)` also gives up the stack, but it is a timers callback with a 1 millisecond floor, so it is not a tighter yield than `setImmediate`. The usual choice between chunks is `setImmediate`.

**Trade-offs:**

`setImmediate` keeps the CPU work on this isolate and only yields between chunks. A worker thread moves the CPU work off the loop entirely. `setTimeout(fn, 0)` is not a synonym for `setImmediate`.

**Follow-up:**

Why can a following request still wait until after a chunk scheduled with `setImmediate` from a poll handler?

Answer: An immediate scheduled from poll runs in check, and check happens before the next lap's poll. Sockets that become readable after this visit wait for that next poll, so the chunk runs ahead of them. Callbacks that were already queued for this poll visit still run before check.

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

The order is `io`, `tick`, `after`, `immediate`. The async poll callback returns at `await null`, and the rest of the function is a microtask in that same checkpoint. `tick` runs first because `nextTick` drains before promise jobs. `after` then runs and only then calls `setImmediate`, which is still before check starts. A chain of already settled `await`s is a chain of microtasks, so check waits until that chain stops. `await null` does not involve the thread pool, so there is no pool race to reorder `after` and `immediate`.

**Follow-up:**

Change to `await readFile(otherUrl)` from `fs/promises`. Can `immediate`, still written after that await, run before the second read's poll callback?

Answer: No. The promise fulfills on a future poll turn, and `setImmediate` is scheduled only in that turn's continuation, so it cannot run before the second read's callback. Other poll callbacks may run while the second read is still on the pool, but those callbacks are not `immediate`.

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

Node runs one callback, drains that callback's checkpoint, and only then starts the next callback in the phase. It does not run every callback in the phase and then drain microtasks once at the end. Inside timers the order is `t1`, `p1`, `t2`. Inside check the order is `i1`, `tick`, `i2`. A `setImmediate` scheduled from inside `i1` misses this check's snapshot and waits for a later lap. Do not glue the timer lines and the immediate lines into one global order. That top-level race is NODE-055.

**Follow-up:**

Add `process.nextTick(() => console.log('tick-from-t1'))` inside `t1`. Can it run after `t2`?

Answer: No. It is part of `t1`'s checkpoint, and `nextTick` runs before `p1`. The order is `t1`, `tick-from-t1`, `p1`, `t2`.

### NODE-067 — setInterval re-arms in the timers phase and does not overlap itself

**Difficulty:** Senior

**Category:** Timers

**Question:**

Explain `setInterval` on Node 20 and 22: when the next firing is scheduled, whether two callbacks can share the stack, and what a callback longer than the interval does to the next fire. Do not quote measured drift.

**Answer:**

`setInterval` uses the same timers phase and delay clamp as `setTimeout`. Just before the callback, Node samples the loop time and arms the next fire from that sample plus the delay. One timer means one stack, so a second fire cannot overlap the first, and missed ticks are not replayed as a burst. If the body runs longer than the interval, the next visit can find the timer already due, so the gap can be shorter than the delay. A delay of 0 repeats every 1 millisecond. `clearInterval`, `refresh`, and `unref` leave it in timers.

**Follow-up:**

An async interval callback `await`s work that settles on a later poll. Can a second fire start before that promise settles?

Answer: Yes. The async function returns at the `await`, and the timer does not wait for that promise, so a second fire can start on a later timers turn. If the work must not overlap, keep an in-flight flag, or clear the interval until it settles and then schedule again.

### NODE-068 — timers/promises and scheduler.yield are the same phases plus a microtask

**Difficulty:** Senior

**Category:** Timers

**Question:**

`await setTimeout(0)` from `timers/promises` and `await scheduler.yield()` look like language features. Which phase fulfills each promise, when does code after `await` run, and what does an aborted signal do?

**Answer:**

`timers/promises` `setTimeout` is still a timers-phase callback. A delay of 0 is raised to 1 millisecond, the same floor as the callback form. When that timer fires, it fulfills the promise, and the code after `await` runs as a microtask in that checkpoint. `scheduler.yield()` is experimental on Node 20 and 22. It wraps `setImmediate`, so the promise fulfills in check. `scheduler.wait` wraps the promise form of `setTimeout`. If the signal aborts, the promise rejects with `AbortError` as a microtask after `abort()`. `abort()` itself does not throw synchronously. Passing `ref: false` removes the keep-alive vote from the underlying handle.

**Follow-up:**

Abort during the code after `yield`, before the timeout fires. Does the code after the timeout await run?

Answer: No. The timeout promise rejects with `AbortError`, so the success path after that `await` does not run. A `try/catch` around the `await` is the rejection continuation, and the timers phase does not also fulfill the same promise.

### NODE-069 — A long synchronous callback stalls every later phase

**Difficulty:** Senior

**Category:** Starvation

**Question:**

A poll callback parses a large in-memory payload with a synchronous loop before scheduling anything. Timers are already due and another socket is readable. Why do none run during the parse, and what do you change?

**Answer:**

JavaScript runs a callback to completion. While the parse is on the stack, poll will not start a due timer, a check callback, or another socket's `'data'` handler, even if the kernel already knows that socket is readable. Split the work into chunks and schedule the next chunk with `setImmediate`, using the phase placement from NODE-064, or move the CPU work to a worker. The libuv pool does not help, because the bytes are already on the heap and the loop is JavaScript. Scheduling the next chunk with `process.nextTick` does not yield to poll.

**Follow-up:**

A health-check `'data'` handler and its timeout both miss during the parse. Is that a poll bug?

Answer: No. Both are waiting for the parse to return, because the callback is too long. Phase order cannot insert a pause that JavaScript does not take.

### NODE-070 — A promise chain that never empties is starvation too

**Difficulty:** Senior

**Category:** Starvation

**Question:**

A handler keeps scheduling with `Promise.resolve().then(step)` forever; timers and sockets stall. How does this differ from a synchronous loop, and why is `await Promise.resolve()` in a `while` the same failure?

**Answer:**

A synchronous loop never returns, so the checkpoint never starts and no callback of any kind can run. A promise pump does return, which looks cooperative, but the checkpoint never finishes because each microtask queues the next one. `while (work) { await Promise.resolve(); ... }` is that same pump: every turn is another microtask on this checkpoint. The repair is to schedule the next step with `setImmediate`, or with a timer, so the lap can reach check and later poll. One settled `await` is fine. A chain that never ends is not.

**Follow-up:**

Does a single `await Promise.resolve()` in an otherwise synchronous handler delay an already-due timer by a full lap?

Answer: It delays the timer only by one checkpoint. The handler returns, that microtask runs, and the lap can then continue to timers. A loop of those awaits is the starvation case.

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

The checkpoint finishes before check, and on Node 20 and 22 timers run after check once the 1 millisecond floor has elapsed. The fixed order is `sync`, `sync-end`, `tick`, `promise`, `micro`, `promise-from-tick`, `tick-from-promise`, `immediate`, `timeout`. `tick` drains before the promise jobs. `tick-from-promise` is a `nextTick` queued from a microtask, so it still runs before `immediate`. Refuse to order an unrelated connection, and refuse to invent how many milliseconds anything took.

**Follow-up:**

Add `readFile(url, () => console.log('file'))` as the first line of `onRequest`. Where does `file` go?

Answer: Refuse a fixed slot against `immediate` or `timeout`. The file callback is a later poll turn after the pool posts the completion, and it cannot run before this callback's checkpoint. Whether it lands before check and timers depends on when that completion arrives.

### NODE-072 — A throw in a phase callback is that turn's exception

**Difficulty:** Senior

**Category:** Errors

**Question:**

A timer callback throws. The `setTimeout` call sits in a `try/catch`. A `nextTick` and a promise reaction were queued before the throw. What catches the throw, what happens to those queued callbacks, and how is a rejection different?

**Answer:**

The `try/catch` around `setTimeout` only covers the call that registers the timer. The callback runs on a later turn, so a throw there is an uncaught exception unless you catch it inside the callback or handle `uncaughtException` (NODE-028). Do not build a design that depends on a `nextTick` or promise job queued earlier in that same callback still running after the throw. A rejection is a different channel. If nobody handles it, Node emits `unhandledRejection`. A `try/catch` around the `setTimeout` registration does not catch that either.

**Follow-up:**

Does `finally` on an async poll callback run before `setImmediate` callbacks that were scheduled before the `await`?

Answer: Yes, when that `finally` belongs to this callback's checkpoint. Settling the async function, including `finally`, is a microtask, and microtasks finish before check. `finally` is not its own phase.

### NODE-073 — beforeExit is the empty-loop check, not a phase you schedule

**Difficulty:** Senior

**Category:** Process lifetime

**Question:**

Where does `beforeExit` sit relative to poll, check, and timers? What can a listener schedule that causes another lap, and what does `exit` refuse to wait for?

**Answer:**

`beforeExit` is not a libuv phase. Node emits it when the loop has no more ref'd work and is about to finish, after the phases have nothing left to run. A listener can schedule something that keeps the process alive, such as a ref'd timer, a ref'd immediate, or I/O, and that starts another lap. Purely synchronous work in the listener does not keep the process up. Node does not emit `beforeExit` for `process.exit()` or for an uncaught exception. `exit` listeners must be synchronous. Timers, immediates, and promises scheduled from `exit` do not get another lap.

**Follow-up:**

If the timer scheduled from `beforeExit` is unref'd, does it still print?

Answer: Not when that timer was the only work you added. An unref'd timer does not keep the loop alive, so the process can exit without firing it. Leave the timer ref'd if you need the callback to run.

### NODE-074 — Ordering guarantees you can promise, and the ones you cannot

**Difficulty:** Senior

**Category:** API design

**Question:**

You publish a function that takes a callback and sometimes fails synchronously on a bad argument. Which queue lets callers attach listeners and still keeps the callback asynchronous? Which guarantees about two sockets, or about `setTimeout(fn, 0)` versus `setImmediate`, do you refuse to put in the docs?

**Answer:**

Use `process.nextTick` to call the callback after your function returns and before the loop continues. That is the same pattern Node uses for `'listening'`, so callers can attach listeners and still see the error. A recursive `nextTick` starves poll, so this queue delivers an error asynchronously. It is not for chunking work. Refuse a universal winner between `setTimeout(fn, 0)` and `setImmediate`, a fair order between sockets, and any claim that one handler's promises beat other connections. You return before the callback, a bad argument invokes it once, and you never call it twice or throw after returning.

**Code:**

```js
function loadConfig(path, callback) {
  if (typeof path !== 'string') {
    process.nextTick(callback, new TypeError('path must be a string'));
    return;
  }
}
```

**Follow-up:**

Would `queueMicrotask(callback)` satisfy a contract of "before any I/O"?

Answer: It runs before the next phase, so it does run before later I/O. It does not run before microtasks that were already queued on this turn. If the caller must attach a `.then` after your call and still observe your error first, `process.nextTick` is the queue that matches that contract.

### NODE-075 — Read the handler and name the turn each line belongs to

**Difficulty:** Advanced

**Category:** Prediction

**Question:**

Name the turn for each log, predict the order the rules fix, and refuse what you will not order. Answer the claim that `await cache()` ran the handler on a worker. `cache()` returns an already fulfilled promise.

```js
async function onRequest(res) {
  console.log('handler');
  process.nextTick(() => console.log('tick'));
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

The fixed order is `handler`, `tick`, `hit`, `handler-end`, `immediate`, `timeout`. The async poll callback returns at `await`. `tick` is the `nextTick` drain, and `hit` through `handler-end` are the microtask continuation of that same checkpoint, still on this isolate. Check then runs `immediate`, and timers run `timeout`. `file` has no fixed place relative to check or timers, because it depends on when the pool posts the completion. `await cache()` did not start an OS thread or a worker. The promise was already fulfilled.

**Follow-up:**

If `cache` sometimes awaits a real file read, which prefix of that order survives?

Answer: `handler` and `tick` stay on the first poll turn, with `tick` in the `nextTick` drain before the real suspension. `hit`, `handler-end`, `immediate`, and `timeout` move to the checkpoint of the turn that fulfills the read. The six-line order does not survive, but the placement rule does.

### NODE-076 — queueMicrotask and Promise.then share a queue and split on errors

**Difficulty:** Senior

**Category:** Microtasks

**Question:**

On Node 20 and 22, which queue do `queueMicrotask(fn)` and `promise.then(fn)` use, when does each job get queued, and what happens if the callback throws? This is not the ES module evaluation question.

**Answer:**

Both use the same V8 microtask queue, which runs after `process.nextTick` at the checkpoint, in enqueue order. `queueMicrotask` appends during the call. `then` appends only when the promise fulfills. If it is already fulfilled, that append happens before `then` returns, but the job still runs later as a microtask. A chained `.then(b)` waits until `a` settles before `b` is queued. A throw inside `then` rejects the derived promise, and that becomes `unhandledRejection` if nobody handles it. A throw inside `queueMicrotask` is an uncaught exception, because there is no promise to catch. The executor passed to `new Promise` still runs synchronously.

**Follow-up:**

With `p.then(a).then(b)` and a `queueMicrotask` between the two `then` calls, can `b` run before that microtask?

Answer: No. `b` is queued only when `a` settles, and the intervening `queueMicrotask` was already waiting, so `b` runs after it. Both still belong to the same checkpoint.

### NODE-077 — setInterval drift is lateness the next arm does not pay back

**Difficulty:** Senior

**Category:** Timers

**Question:**

A metrics interval uses `setInterval(fn, 1000)`. Under load, fires move later than `start + n * 1000`. What does Node do with that lateness, why is there no catch-up burst, and which schedule avoids accumulating it? Do not quote a measured drift number.

**Answer:**

There is one timer. The next deadline is the loop time sampled just before the callback, plus the delay, not `start + n * delay`. A late fire pushes every future deadline later, and missed slots are not replayed as a burst. That is why the interval slips under load and never catches up. A chain of `setTimeout` calls aimed at a fixed series, or a delay measured from the end of the work, avoids accumulating that slip. `Date.now()` can jump when NTP steps the clock. Node's timer clock is the loop's monotonic time.

**Follow-up:**

Clear the interval as the first line of the callback. Can a re-armed fire still happen?

Answer: No. Node inserts the next deadline before the body runs, and `clearInterval` removes that arm. The body that is already running finishes, and there is no later fire or catch-up callback.

### NODE-078 — unref and ref are a lifetime vote, and the callback stays in its phase

**Difficulty:** Senior

**Category:** Timers

**Question:**

What do `timeout.unref()`, `ref()`, and `hasRef()` change? Correct teammates who say `unref` moves the callback to check, cancels it, or means an unref'd interval never fires while a server is listening.

**Answer:**

`unref`, `ref`, and `hasRef` only change whether this handle votes to keep the process alive. They do not change the phase, and they do not cancel the callback. An unref'd timeout stays in timers. An unref'd immediate stays in check. If something else still votes to stay up, such as a listening server, the unref'd callback still runs when its phase finds it due. If that unref'd handle is the only armed work, the loop may exit without firing it. That exit is the `beforeExit` and `exit` boundary, not a skipped phase.

**Follow-up:**

Unref an immediate while nothing else is ref'd, then call `heartbeat.ref()` inside `beforeExit`. Does the callback run?

Answer: Yes, if it is still armed. `ref()` restores the keep-alive vote, so a later timers or check phase can run it. The same `ref()` call inside an `exit` listener does not get another lap.

### NODE-079 — fs.readFile uses the pool because a file read can block; a TCP read does not

**Difficulty:** Senior

**Category:** Thread pool

**Question:**

Both `fs.readFile` and a TCP `'data'` handler are "asynchronous." Why does the file read take a pool thread and the socket read not? Where does each JavaScript callback run?

**Answer:**

"Asynchronous" covers two mechanisms. A TCP socket is non-blocking. The poller watches it, and the isolate reads ready bytes during poll, with no pool thread. A regular file read can block in the kernel, so libuv runs it on the pool and later posts a completion. The JavaScript callback still runs on the main isolate, in poll. Synchronous file APIs block the isolate for the whole call and have no callback. `dns.lookup` is the same kind of offload as the file read.

**Follow-up:**

What does `readFileSync` do to a connection that becomes readable during the syscall, compared with an in-flight `readFile`?

Answer: `readFileSync` holds the isolate, so poll cannot deliver `'data'` until the syscall returns. An in-flight `readFile` holds a pool thread instead, and poll can still deliver TCP data while that read continues. The file's own JavaScript callback waits for a later poll turn after the completion is posted.

### NODE-080 — An empty poll computes a wait; a due timer makes that wait zero

**Difficulty:** Senior

**Category:** I/O

**Question:**

When does Node 20 or 22 poll block in the kernel, and when does it return immediately? Separate an empty poll queue, a due timer, a timer that is not yet due, and a non-empty poll queue. A due timer must not be described as running inside the poller.

**Answer:**

Poll runs callbacks already queued and does not pause them for a due timer. That timer waits for the timers phase, after check and close. An empty queue with a queued `setImmediate`, or a timer already due, uses a zero wait. The due timer still runs later in timers, not inside poll. A future timer may block poll until that deadline or until I/O arrives. A listening server alone blocks until the kernel reports activity. An unref'd timer with nothing else ref'd lets the loop finish. A zero wait can still collect sockets that are already readable.

**Follow-up:**

One socket is ready and one timer is already due. Which runs first, and can the timer run between two poll callbacks that are already queued?

Answer: The socket runs first, in poll, and the timer runs after check and close. Between two already queued poll callbacks the timer cannot run. Those callbacks get a checkpoint between them, and the timer still waits for the timers phase.

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

Check is a phase, and a phase cannot start until the checkpoint is empty. The bounded pump prints `sync`, `sync-end`, `pumped`, `immediate`. The third `pump` does not queue another microtask, so the checkpoint ends and check can run. An unbounded pump prints `sync` and `sync-end`, then only microtasks. `immediate` never prints, even though it was queued first, because the checkpoint never finishes. A second immediate that was already in this check's snapshot waits on that same unfinished checkpoint.

**Follow-up:**

Move `setImmediate` to the last line of the third `pump`. Does `immediate` still wait for `pumped`?

Answer: Yes. `pumped` prints, then the immediate is queued, then check runs it after the checkpoint returns. An unbounded pump never reaches the `setImmediate` line at all.

### NODE-082 — An async function that throws rejects; a non-async throw escapes the turn

**Difficulty:** Senior

**Category:** Errors

**Question:**

Compare three timer callbacks: a non-async function that throws, an `async` function that throws before its first `await`, and a function that only does `return Promise.reject()`. What does the caller of `setTimeout` catch, which process event applies, and which callbacks still reach later lines in the timer?

**Answer:**

A `try/catch` around `setTimeout` catches none of these, because the callback is a later turn. A non-async throw skips the rest of that callback and becomes `uncaughtException` unless you catch it inside. An `async` throw before the first `await` rejects the returned promise before that call returns, and later lines in the timer still run. If nobody handles it, the event is `unhandledRejection`. `return Promise.reject()` uses that same channel, and the timer continues. A throw after `await` rejects in a microtask the timer has already left.

**Follow-up:**

`await boom()` inside an async timer, with `try/catch` around it, and `setImmediate` scheduled before the `await`. Where does `catch` run relative to the immediate?

Answer: `catch` is part of the timer callback's microtask continuation, so it runs in that checkpoint, before check. The immediate was already queued, and `catch` still runs first.

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

The `nextTick` queue drains in order, and a `nextTick` scheduled from inside another one is appended at the tail. It does not jump ahead of callbacks that were already queued. The log is `a,c,d,b,micro`. `a` runs first and queues `b` behind `c` and `d`, which were already waiting. Microtasks, including this `queueMicrotask`, wait until the `nextTick` queue is empty. This is an ordinary phase callback, not the ES module top-level exception.

**Follow-up:**

Add `process.nextTick(() => out.push('e'))` as the first line of the `c` callback. Where does `e` land?

Answer: After `a` and `c`. When `e` is appended, `d` and `b` are already ahead of it. The log is `a,c,d,b,e,micro`.

### NODE-084 — Predict the log when a chained then meets queueMicrotask

**Difficulty:** Advanced

**Category:** Prediction

**Question:**

Predict the printed array. `queueMicrotask` and promise reactions share one queue. A chained `then` is not queued until the previous reaction settles.

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

The synchronous turn queues `a`, then `m`, then `c`. `b` is not queued yet. It is attached to the promise that `a`'s reaction returns, so it is appended only when `a` fulfills, which puts it behind `m` and `c`. All of that is still this checkpoint, before check. The log is `a,m,c,b`.

**Follow-up:**

If the `a` callback returns `new Promise(() => {})`, which never settles, which of `m`, `c`, and `b` still print before the immediate?

Answer: `a`, `m`, and `c` still run. `b` never prints, because its promise never settles. The hypothetical log is `a,m,c`.

### NODE-085 — Predict the log when nextTick fulfills a pending promise

**Difficulty:** Advanced

**Category:** Prediction

**Question:**

Predict the log. The promise starts pending. `then` is attached before fulfillment, and a `nextTick` fulfills it.

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

`then` does not run when you attach it, because the promise is still pending. `resolve()` only enqueues that reaction. It does not run it immediately. `tick2` is already in the `nextTick` queue, so it finishes that drain before any microtask. `micro` was queued in the synchronous body, before `resolve()`, so it precedes `then`. `micro-from-tick` was queued during `tick`, after `resolve()`, so it follows `then`. The log is `tick,tick2,micro,then,micro-from-tick`.

**Follow-up:**

Calling `resolve()` twice from `tick`: does `then` run twice?

Answer: No. A promise settles once. The second `resolve` is ignored, and `then` was queued only once.

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

`label()` runs on the current stack until `await null`, then returns, so `onRequest` still prints `sync-end`. The lines after `await` are a promise microtask queued at that moment. The `queueMicrotask` call comes later, so `micro` lines up behind `after`. `tick` is a `nextTick`, and that queue drains before either microtask. Check has not started, so `immediate` is last. The order is `sync`, `before`, `sync-end`, `tick`, `after`, `micro`, `immediate`.

**Follow-up:**

Swap the calls so `queueMicrotask` runs before `label()`. Where does `micro` move?

Answer: It moves ahead of `after`, because it was queued first. The order becomes `sync`, `before`, `sync-end`, `tick`, `micro`, `after`, `immediate`.

### NODE-087 — A setImmediate scheduled from the timers phase waits for the next lap

**Difficulty:** Senior

**Category:** Timers

**Question:**

A callback already running in the timers phase schedules `nextTick`, `queueMicrotask`, `setImmediate`, and `setTimeout(fn, 0)`. Which orders follow from the lap, and which top-level race do you still refuse?

**Answer:**

The order is `timer`, `timer-end`, `tick`, `micro`, `immediate`, `timeout`. Check for this lap has already finished, because timers run after check on Node 20 and 22. The new immediate therefore waits for the next lap, and poll can run first if sockets are ready. The new timeout has a 1 millisecond floor, so it cannot beat that next check. Do not import the top-level race between `setTimeout(fn, 0)` and `setImmediate` from NODE-055 as evidence here. This callback is already inside timers, so the lap order is fixed.

**Follow-up:**

Can a second `setImmediate`, queued before this lap's check began, still run after `onTimer`?

Answer: No. That older immediate was in this lap's check snapshot, and check finished before timers. The immediate scheduled from `onTimer` belongs to the next lap.

### NODE-088 — A finished pool read wakes poll and still runs its callback on the isolate

**Difficulty:** Senior

**Category:** Thread pool

**Question:**

`fs.readFile` is in flight. The loop thread is blocked in an empty poll. The pool finishes the read. Who runs the JavaScript callback, and how does the blocked poll find out?

**Answer:**

The pool thread does not run your callback. It posts a completion and wakes the poller through an async handle the poller is already watching. The loop thread then runs the JavaScript in poll, on the main isolate. That wakeup can end a wait early, including a wait that was bounded by a timer, without making that timer due. It cannot preempt a long JavaScript turn, and it cannot break into a `nextTick` drain that never empties. The callback still waits until the isolate is free and poll actually runs.

**Follow-up:**

Poll was waiting with a 60 second timer deadline, and the read finishes in the middle of that wait. Does the file callback wait out the rest of the 60 seconds?

Answer: No. The completion wakes the poller, and the file callback can run in that visit. The timer still runs only in a timers phase that finds it due.

### NODE-089 — Timer order follows expiry, and equal delays stay in registration order

**Difficulty:** Senior

**Category:** Timers

**Question:**

Explain the order for two timers with the same delay and for two timers with different delays, including when a long synchronous callback holds the stack until both deadlines have passed. Do not quote measured fire times.

**Answer:**

Timers with the same delay share one list and run in registration order. A delay of 0 and a delay of 1 both become 1 millisecond, so the one registered first runs first. Different delays follow expiry: the earlier deadline runs first. If a long callback holds the stack until both are due, the earlier expiry still wins, then its checkpoint, then the later timer. The wall-clock gap is not preserved. A timer scheduled from inside a running callback is a new arm, not a sibling of the list that is due right now.

**Follow-up:**

Schedule a delay of 50 first and a delay of 10 second, then hold the stack past both deadlines. Which runs first?

Answer: The delay of 10 runs first. When the delays differ, expiry beats registration order.

### NODE-090 — clearTimeout removes a future callback and does not unwind the one that is running

**Difficulty:** Senior

**Category:** Timers

**Question:**

What does `clearTimeout` do to a timer that has not fired, one whose callback is on the stack, and an interval that NODE-067 has already re-armed? Does `clearInterval` only work on `setInterval` handles?

**Answer:**

`clearTimeout` and `clearInterval` are interchangeable on a `Timeout` handle. Either one can clear a timeout or an interval. Clearing a timer before it fires removes it, so the callback never runs. Clearing it from inside the callback that is already on the stack does not unwind that body. The rest of the function still runs. For an interval, Node has already inserted the next arm before the body starts, and clearing the handle removes that next arm. `unref` and `refresh` are not cancellation. Checkpoint work that was queued before the clear still runs if the callback returns normally.

**Follow-up:**

Queue `process.nextTick(() => clearInterval(handle))` as the first line of an interval callback, after re-arm. Can the next period still fire?

Answer: No. The checkpoint clears the re-armed deadline before the next timers visit. The body that is already running still finishes.

### NODE-091 — EventEmitter listeners share the current stack; the checkpoint starts after emit

**Difficulty:** Senior

**Category:** Scheduling

**Question:**

A poll callback emits with two listeners. The first queues `nextTick`, and the second queues `queueMicrotask`. When do those run relative to the second listener and relative to a line after `emit`?

```js
ee.on('go', () => { console.log('a'); process.nextTick(() => console.log('tick')); });
ee.on('go', () => { console.log('b'); queueMicrotask(() => console.log('micro')); });
ee.emit('go');
console.log('emitted');
```

**Answer:**

`emit` is synchronous. Node calls the listeners on the current stack, in registration order, and it does not run a checkpoint between them. The order is `a`, `b`, `emitted`, `tick`, `micro`. The `nextTick` and the microtask were only queued. They drain after the phase callback that called `emit` returns, with `nextTick` before the microtask. A socket `'data'` event uses this same model: every listener runs before the checkpoint.

**Follow-up:**

Register a third listener from inside `tick`, and emit again from that `tick`. Does the third listener see the first event?

Answer: No. The first `emit` already finished with the listener list it had at the time. A second `emit` from inside `tick` runs the new listener synchronously, still inside `tick`, and that happens before `micro`.

### NODE-092 — Predict the log when destroy schedules close beside an immediate

**Difficulty:** Advanced

**Category:** Prediction

**Question:**

`onData` runs in poll. It queues `nextTick`, a promise, and `setImmediate`, then calls `socket.destroy()`. Predict the log, with a `'close'` listener. Abrupt close goes to the close phase.

**Answer:**

`destroy` schedules the close. It does not emit `'close'` on this stack. The poll callback returns, its checkpoint runs, then check, then the close phase, which is before timers on Node 20 and 22. The order is `data`, `tick`, `promise`, `immediate`, `close`. A graceful `end()` would schedule `'close'` with `nextTick` instead, which is NODE-061. Do not reuse this order for that path.

**Follow-up:**

Add `setTimeout(() => console.log('timeout'), 0)` as the first line of `onData`. Where does `timeout` sit relative to `close`?

Answer: Close runs before timers on this lap, so `close` prints before `timeout` once the timeout is due. The 1 millisecond floor can only push `timeout` later, not ahead of this lap's close. `immediate` stays ahead of both.

### NODE-093 — An in-flight file request keeps the loop alive after a timer is unref'd

**Difficulty:** Senior

**Category:** Process lifetime

**Question:**

A script unrefs its only timer and still does not exit. The other call is `fs.readFile`. Why does the process stay up, which phase runs the file callback, and how would you make the timer the reason the process stays alive instead?

**Answer:**

`fs.readFile` holds a ref'd request until the read completes, and `timer.unref()` does not remove that request's vote. The process stays up because of the file request. The JavaScript callback runs later in poll, on the main isolate. While that request keeps the loop alive, the unref'd timer can still fire if a timers phase finds it due. `unref` means "this handle is not the last vote," not "skip this callback while anything else is alive." Leave the timer ref'd if the timer itself should pin the process. Clearing the timer does not cancel the read.

**Follow-up:**

Call `timer.ref()` inside the file callback. Can the process exit at the end of that callback?

Answer: Not if the timer is still armed. `ref()` restores its vote, so after the request completes the timer still keeps the loop alive. If the timer was already cleared, `ref()` does not create a new arm.

### NODE-094 — A false return from socket.write means drain is a later turn

**Difficulty:** Senior

**Category:** I/O

**Question:**

`socket.write(chunk)` returns `false`. One teammate retries in a `while` loop until it returns `true`. Another awaits `queueMicrotask` before writing more. When does Node say the buffer has drained, and which phase may that be?

**Answer:**

`false` means the writable buffer is at or over the high-water mark, which defaults to 16 KiB for a byte stream. The bytes are still queued. The call did not block, and it did not refuse the chunk. `'drain'` fires on a later turn, when a write completion brings the buffered amount back under that mark. That turn is poll, or the bounded pending pass after poll. It is not a microtask and it is not `process.nextTick`. Stop writing, wait for `'drain'`, then continue. A spin loop or a microtask yield is not backpressure.

**Code:**

```js
socket.on('data', (chunk) => {
  if (!socket.write(chunk)) socket.pause();
});
socket.on('drain', () => socket.resume());
```

**Follow-up:**

If you write again in the same `'data'` callback after `false`, is the second write refused?

Answer: No. Node accepts the second write, and it may return `false` again. `'drain'` still arrives on a later I/O turn, and the second write only made the buffered overrun larger.

### NODE-095 — refresh rewinds the start time and leaves the phase and the delay value alone

**Difficulty:** Intermediate

**Category:** Timers

**Question:**

What does `timeout.refresh()` change on Node 20 and 22, and what does it leave alone? Include a one-shot that has already fired and an interval that has not.

**Answer:**

`refresh()` keeps the same `Timeout` and the same delay, and sets the start time to now. The phase stays timers, and `hasRef()` is unchanged. On an interval that has not fired, that postpones the next fire, which is what a debounce wants. On a one-shot that has already fired, it arms that same object again without allocating a new timer. It does not clear the timer, undo `clearTimeout`, or change `ref`. Repeated refresh can slide the deadline forever, which is right for debounce and wrong for a fixed cadence.

**Follow-up:**

You call `refresh()` from a `nextTick` just before the timers phase that was about to fire the timer. Can the callback still run in that phase?

Answer: Usually no. The checkpoint runs first and moves the deadline to one full delay from now, so the upcoming timers visit typically skips this handle. It would still run only if that delay had already elapsed.

### NODE-096 — Predict the check-phase log, and refuse to order a nested immediate against a timeout

**Difficulty:** Advanced

**Category:** Prediction

**Question:**

`onCheck` and `also` were both queued before this check started, with `onCheck` first. Predict what the rules fix, and name the pair you will not order.

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

The fixed order is `i1`, `tick`, `micro`, `i2`. `tick` and `micro` are the checkpoint between the two immediates that were already in this snapshot. The nested immediate misses that snapshot. The timeout cannot slip between `i1` and `i2`, because timers are a later phase. Refuse a universal order between `nested` and `timeout`. This lap's timers phase may run before the next check if the 1 millisecond floor has elapsed, or the timeout may land after that next check if it has not. That is the same refusal as NODE-055 when both are scheduled from an immediate that is already running.

**Follow-up:**

Delete the `setTimeout` line. What is the full order, including `nested`?

Answer: `i1`, `tick`, `micro`, `i2`, then `nested` on the next lap's check, after the poll in between. A readable socket could still run in that poll. This snippet has none.

### NODE-097 — A chain of setImmediate reaches later phases; a chain of microtasks does not

**Difficulty:** Senior

**Category:** Scheduling

**Question:**

A check callback must process a queue and also let a due timer run. Compare rescheduling the next chunk with `setImmediate` versus `queueMicrotask`. Which one lets the Node 20 or 22 lap reach timers, and where does poll fit?

**Answer:**

An unbounded `queueMicrotask` chain never finishes this checkpoint, so the due timer and poll stay blocked. A nested `setImmediate` from inside check waits for the next iteration, because it misses the current snapshot. This lap can still reach close and then timers before that nested immediate runs, so a timer that is already due can run first. Later laps get a poll visit before the following check. Rescheduling with `process.nextTick` is stricter than microtasks: it holds off the microtask queue as well, and poll still never starts.

**Follow-up:**

Start the `setImmediate` chain from poll instead of from check. Can the due timer run before the second chunk?

Answer: The first nested immediate is this lap's check, which is before timers, so that second chunk runs before the due timer. Later chunks, scheduled from inside check, wait for following laps that come after this timer. Which chunk you mean changes the answer, as NODE-064 describes.

### NODE-098 — A rejection handler in this checkpoint still counts; one in check is a later turn

**Difficulty:** Senior

**Category:** Errors

**Question:**

A timers callback creates a rejected promise and does not attach `.catch` before it returns. You can attach `.catch` from a `nextTick` in that callback, from a microtask in that callback, or from `setImmediate`. Which of those prevent `unhandledRejection`, and which are too late?

**Answer:**

Node decides whether a rejection is unhandled at the end of the turn, after this checkpoint. A handler attached synchronously, from a `nextTick`, or from a microtask in that same checkpoint still counts, and `unhandledRejection` does not fire under the default policy. `setImmediate` is check, which is the next phase, so the turn has already ended and the event has already fired. A later `.catch` can still handle the rejection, and `rejectionHandled` may follow. Check is not special because the name says "immediate." A throw from a non-async callback is `uncaughtException`, which is a different question.

**Follow-up:**

Attach `.catch` in a microtask that was queued from the `nextTick`, not directly from the timer. Is that still the same turn?

Answer: Yes. That microtask still runs before the checkpoint returns, so it prevents `unhandledRejection`. It stops being the same turn if that `nextTick` calls `setImmediate` to attach the handler instead.

### NODE-099 — Predict the log when the promise is queued from nextTick and the microtask was queued first

**Difficulty:** Advanced

**Category:** Prediction

**Question:**

Predict the log. `queueMicrotask` runs in the synchronous body. The only `Promise.then` is inside the `nextTick`.

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

The order is `sync`, `sync-end`, `tick`, `micro`, `promise`, `tick-from-promise`, `immediate`. `micro` was queued in the synchronous body, before `promise` existed, so it runs before `promise` once `nextTick` has drained. `tick-from-promise` is queued from that promise job and still runs before check. This is an ordinary phase callback, not the ES module top-level exception.

**Follow-up:**

Add `process.nextTick(() => console.log('tick2'))` immediately after the first `nextTick` registration in the synchronous body. Where does `tick2` print?

Answer: After `tick` and before the microtasks. The order is `tick`, `tick2`, `micro`, `promise`, `tick-from-promise`, `immediate`, with `sync` and `sync-end` still first.

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

Refuse to order `timeout-top` against `immediate-top`, and refuse to order either of them against `io`. The read's duration is unknown, and the timers pass before the loop races the first check. Once `io` runs, the rest is fixed: `io`, `tick`, `tick2`, `tick-nested`, `micro`, `promise`, `immediate-io`, `timeout-io`. Nested `nextTick` callbacks append at the tail of the same drain, and microtasks wait until that queue is empty. Inside this poll callback, check runs before timers. The 1 millisecond floor cannot put `timeout-io` ahead of `immediate-io`.

**Follow-up:**

Move both of the timer and immediate calls that were inside the read callback up to top level. Leave only the checkpoint calls inside `readFile`. What remains ordered?

Answer: Inside `io`, the order is `io`, `tick`, `tick2`, `tick-nested`, `micro`, `promise`. All four timer and immediate callbacks are now top-level races. Refuse to order them against each other, and refuse to order them against `io`.
