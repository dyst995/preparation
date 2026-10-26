# NODE02 — Event loop and asynchronous execution

Node.js 20+. Questions NODE-051–NODE-100.

These questions cover libuv's phases and the checkpoint Node runs after each JavaScript callback: the `process.nextTick` queue, then promise jobs. `setTimeout`, `setImmediate`, `async`/`await`, and I/O callbacks are placed on that model. The libuv thread pool appears only where filesystem, `dns.lookup`, and crypto offload post a completion back to the poll phase. Worker threads are a later section.

The within-turn order of `nextTick` and promise reactions, including the ES module evaluation exception, is NODE-021. This section does not repeat that question. It says when that checkpoint runs relative to phases, what a recursive queue does to I/O, and which orders follow from the rules. Snippets are hypothetical. A printed order is the order those rules produce. A delay figure appears only when the question gives it as a constraint. Node's timer floor of 1 millisecond is that documented clamp, not a measured latency.

Phase order is version-sensitive. libuv 1.45.0, which Node 20 ships, runs timers at the end of each loop iteration and still runs timers once before the loop is entered. The older diagram that opens every iteration with timers is the pre-1.45 loop. Both diagrams use the same phase names.

### NODE-051 — The phases a Node 20 loop actually walks

**Difficulty:** Senior

**Category:** Event loop phases

**Question:**

Draw the event-loop phases for a Node 20 process and say what each one is for. A teammate draws timers at the start of every lap and then asks where `process.nextTick` sits in the drawing. Correct the lap, and leave `nextTick` out of the phase boxes.

**Context and Constraints:**

- Node 20 or later, main thread, default loop (`UV_RUN_DEFAULT`).
- One process, one isolate. Worker threads are out of scope.
- The answer must name timers, pending callbacks, idle, prepare, poll, check, and close callbacks.
- The libuv 1.45 reorder is in scope. Treat it as version-sensitive, not as a universal history of Node.
- Do not explain the microtask drain algorithm here. Say only that it is not a phase.

**Senior Engineer's Answer:**

libuv walks a fixed sequence of phases. Each phase has its own queue. Entering a phase runs the work that belongs to that phase, then runs callbacks until the queue is empty or a bound stops it. JavaScript still has one call stack. A phase callback is a later turn on that stack, after the code that scheduled it has returned.

On Node 20 the order is the libuv 1.45 order. If the loop is already alive, libuv runs timers once before it enters the loop, so a timer that is already due can run before the first poll. That pass exists to keep older programs from breaking. It is not the start of every lap. Each iteration then does this:

1. Pending callbacks. I/O callbacks libuv deferred out of poll, including some connection errors on Unix.
2. Idle handles, then prepare handles. Both are internal. Application code does not schedule either one.
3. Poll. The loop waits for kernel I/O when it is allowed to, then runs I/O callbacks. Timers, `setImmediate`, and close callbacks are the important exceptions: they are not this queue.
4. Pending callbacks again, a bounded number of times, so completions that became pending during poll cannot postpone the rest of the lap forever.
5. Check. This is where `setImmediate` callbacks run.
6. Close callbacks. Abrupt handle close, such as `socket.destroy()`, emits `'close'` here.
7. Timers. `setTimeout` and `setInterval` callbacks whose delay has elapsed run here.

Then the iteration repeats, starting at pending callbacks. The diagram that opens every lap with timers matches libuv before 1.45. It still teaches the right names. It teaches the wrong Node 20 lap. The Node guide's current picture matches the list above: a timers box before the cycle, and a timers box after close callbacks.

`process.nextTick` is not in any box. Node drains that queue, then V8's promise microtasks, when the current JavaScript callback returns to the host, before the loop continues. That checkpoint is the next question. Idle and prepare are real phases and still not where your callback went.

Windows and Unix do not share one kernel poller. The guide notes that discrepancy. It does not give JavaScript a second phase list.

**Practical Implementation:**

```js
// Hypothetical map of "where does this callback go?" on Node 20.
// Nothing here is a measurement.
import { readFile } from 'node:fs';

setTimeout(() => {
  // Timers phase, after the delay minimum has elapsed.
}, 0);

setImmediate(() => {
  // Check phase, after poll on the lap that reaches check.
});

readFile(new URL(import.meta.url), () => {
  // Poll phase, on the main isolate, after the pool read posts a completion.
});
```

A listening socket wakes poll. `setTimeout` does not wake the check phase. `setImmediate` does not join the timer heap.

**Trade-offs and Alternatives:**

Memorizing the six public names is enough to place an API. Reciting only the pre-20 wheel will mis-order a timer and a check callback on current Node. You rarely need idle and prepare in production code. You do need them in the drawing, because otherwise a candidate invents a home for them under `setImmediate`.

**Common Mistakes:**

- Drawing timers as the first box of every Node 20 iteration.
- Putting `process.nextTick` or promise reactions inside poll or check.
- Calling idle the place `setImmediate` runs.
- Describing phases as threads. They are queues on the thread that runs the isolate.

**Senior-Level Follow-up:**

The interviewer asks which of those boxes can block the thread inside the operating system, and which only run JavaScript that is already queued.

Answer: poll is the phase that may block in the kernel, and only when the loop has computed a non-zero wait. Every other phase runs callbacks that are already queued, or internal handles, and returns. A timers callback does not wait out its delay inside the callback. The delay was spent before that phase ran it, often inside an earlier poll. Once a callback starts, it occupies the stack until it returns, in every phase. That is JavaScript run-to-completion, not a property of timers alone.

### NODE-052 — One callback, then nextTick, then promise jobs

**Difficulty:** Senior

**Category:** Microtasks

**Question:**

State the checkpoint Node runs after one phase callback on Node 20. Include work that the checkpoint schedules while it is already draining. Then predict the log. This is not the question about ES module evaluation.

**Context and Constraints:**

- The function below is invoked as a timers, poll, or check callback. It is not the top-level body of an ES module. NODE-021 owns that exception.
- `setImmediate` is used only as a later turn that prints the array after the checkpoint. Its phase is not the question.
- Predict the printed order from the checkpoint rules. Hypothetical.

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

**Senior Engineer's Answer:**

Interviewers expect this model, and it is the one Node implements. The host runs one JavaScript callback from poll, timers, or check. When that callback returns, Node drains the checkpoint before the next callback in the phase and before the next phase:

1. Drain the `nextTick` queue until it is empty. A `nextTick` callback that calls `process.nextTick` is part of this same drain.
2. Then run V8 microtasks: promise reactions and `queueMicrotask`, in the order they were queued.
3. If that microtask drain queued another `nextTick`, drain `nextTick` again, then microtasks again. Repeat until both are empty.

Only then does the loop start the next callback or leave the phase. Promise jobs and `nextTick` callbacks scheduled during the drain run before the next phase. They do not wait for check or timers.

The promise executor is not part of this drain. `new Promise(fn)` runs `fn` on the current stack. `.then` and `queueMicrotask` only enqueue.

In `onTurn` the synchronous body only enqueues. The checkpoint then does this. Both `nextTick` callbacks run first, and `tick2` queues `micro-from-tick` before any microtask runs. Microtasks then run in queue order: `promise`, `micro`, `promise2`, `micro-from-tick`. `promise2` queues `tick-from-promise` while microtasks are still draining, so that `nextTick` waits until the microtask queue empties. The outer loop then runs `tick-from-promise`. The immediate callback prints after that, because check is a later turn.

Hypothetical print: `tick,tick2,promise,micro,promise2,micro-from-tick,tick-from-promise`.

NODE-021 is why this order is stated for a phase callback and not for the top of an ES module. During module evaluation Node is already inside microtask processing and does not jump back to `nextTick` first. A later timer does not inherit that exception.

**Practical Implementation:**

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

// Hypothetical, when onTurn is itself a phase callback:
// tick,tick2,promise,micro,promise2,micro-from-tick,tick-from-promise
```

`queueMicrotask` and `.then` share one queue. `tick` and `tick2` share the other. The print is one check-phase turn, so it reads the array after both drains.

**Trade-offs and Alternatives:**

The split queue is why Node code can let a caller attach a listener before a promise reaction from the same turn, and why that tool can also postpone every promise in the process. For "after this function returns, and I/O may proceed," a promise or `queueMicrotask` still finishes before the next phase. It does not yield to poll. Yielding is a later question.

**Common Mistakes:**

- Stopping the story at "nextTick, then promises" and forgetting that a `nextTick` queued from a reaction runs before the next phase.
- Interleaving `micro-from-tick` as if it jumped the `nextTick` drain. It was queued from `tick2`, so it joins the microtask queue before that queue starts.
- Running `tick-from-promise` in the middle of the other microtasks. V8 finishes the microtask queue, then Node notices the new `nextTick`.
- Applying this order to top-level ESM evaluation.

**Senior-Level Follow-up:**

The interviewer wraps the body of `promise2` in `queueMicrotask(() => out.push('inner'))` instead of `process.nextTick`, and asks where `inner` lands.

Answer: `inner` is another microtask, queued while microtasks are already draining, so it runs before the drain returns. It lands after `promise2` and after `micro-from-tick` only if `micro-from-tick` was already queued, which it was, before this microtask started. Order among microtasks is queue order. `inner` does not wait for a later phase, and it does not enter the `nextTick` queue. The immediate still prints after the whole checkpoint.

### NODE-053 — setTimeout(fn, 0) is a timer with a minimum, not "run next"

**Difficulty:** Intermediate

**Category:** Timers

**Question:**

A candidate writes `setTimeout(fn, 0)` and describes it as "run `fn` next, after this function." Say what Node 20 actually schedules, which phase runs it, and what the `0` becomes.

**Context and Constraints:**

- Node 20 timers API. The documented delay clamp is in scope.
- Do not claim a measured firing time for any real machine.
- The browser's nested-timer clamp is a contrast the interviewer may force. State whether Node applies it.
- `process.nextTick` may be named only to place it elsewhere.

**Senior Engineer's Answer:**

`setTimeout(fn, 0)` schedules a timers-phase callback. The `delay` is a minimum threshold, not a promise that the callback runs when the current function returns, and not a promise that it runs in a fixed number of milliseconds. Node's own timers documentation says the callback runs as close as it can to the threshold and that Node makes no guarantee about exact timing or ordering against other work.

On Node 20 the implementation clamps the delay. A delay less than 1, including `0`, a negative number, and a non-number that coerces below 1, is set to 1. A delay greater than `2147483647` is also set to 1, and Node emits a `TimeoutOverflowWarning`. A non-integer delay is truncated. So `setTimeout(fn, 0)` is a timer with a 1 millisecond minimum. The phrase in Node's timer implementation, "schedule on next tick," means the next timers opportunity after that minimum. It does not mean `process.nextTick`.

The callback runs when a timers phase finds the timer due. On Node 20 that phase is at the end of a loop iteration, after check and close, plus the single timers pass before the loop starts. If poll is in the middle of other callbacks, or your own callback is still on the stack, the timer waits, even if the clock has passed the threshold. A long synchronous stretch after the call pushes it further. The timer is ref'd by default, so it keeps the process alive until it fires or is cleared.

Node does not apply the HTML rule that nested timers clamp to 4 milliseconds. The floor you cite is Node's 1 millisecond floor. Quoting the browser nesting rule as Node behavior is a version and host mistake.

`clearTimeout` before the timers phase runs cancels the callback. The returned `Timeout` is a Node object. `timeout.unref()` drops the "keep the process alive" vote and does not change the phase. `timeout.refresh()` rewinds the start to now and uses the same delay again.

**Practical Implementation:**

```js
const handle = setTimeout((label) => {
  console.log(label);
}, 0, 'timer');

// `0` was clamped to 1. `label` is an argument, not a second delay.
// Hypothetical: 'timer' prints in a later timers phase, after this turn's
// nextTick queue and promise jobs. It does not print before the next line.
console.log('scheduled');

const overflowing = setTimeout(() => {}, 2 ** 31);
// Delay does not fit in a 32-bit signed integer. Node warns and uses 1.
clearTimeout(overflowing);
```

Hypothetical order for this much code: `scheduled`, then later `timer`, unless something cleared `handle` first.

**Trade-offs and Alternatives:**

Use `setTimeout` when you mean "after at least this much time." Use it for a 1 millisecond floor only when that floor is acceptable. It is the wrong tool for "before any I/O" and the wrong tool for "on the next check, after poll has had a turn." Those are `process.nextTick` and `setImmediate`. A promise is the right tool when the caller needs a value. `timers/promises` is still this timer. It adds a promise fulfillment on top of the same phase.

**Common Mistakes:**

- Saying `setTimeout(fn, 0)` runs `fn` immediately after the current call, ahead of I/O and ahead of microtasks.
- Treating `0` as a special "next tick" value that bypasses the 1 millisecond floor.
- Importing the browser 4 millisecond nested clamp into Node.
- Passing a delay as the second argument of `setImmediate`. That API has no delay parameter.

**Senior-Level Follow-up:**

The interviewer asks what `setTimeout(fn, 1.9)` stores, and whether two such timers are ordered by which `setTimeout` call happened first.

Answer: truncation makes `1.9` into `1`. Both timers share the one-millisecond list. That list is FIFO for timers of equal delay, because Node appends to the list for that duration. When the timers phase runs that due list, the earlier registration runs first, then the checkpoint, then the later one. "Earlier" means registration order, not a claim about sub-millisecond clocks. If one callback itself takes a long time, the second still waits for it and for the checkpoint. Neither runs on a pool thread.

### NODE-054 — setImmediate is the check phase

**Difficulty:** Intermediate

**Category:** Timers

**Question:**

What does `setImmediate` schedule, which phase runs it, and what happens to an immediate queued from inside an immediate that is already running?

**Context and Constraints:**

- Node 20, main thread.
- The comparison with `setTimeout(fn, 0)` at top level is the next question. Do not settle it here.
- You may say how several immediates queued before the phase relate to each other.

**Senior Engineer's Answer:**

`setImmediate(callback, ...args)` queues `callback` for the check phase. Check runs after poll in the same iteration. The extra arguments are passed to the callback. There is no delay parameter. `setImmediate(fn, 0)` does not mean "wait 0 milliseconds." It calls `fn(0)` when check runs.

Node's timers documentation describes this as execution after I/O events' callbacks. That sentence is the poll-then-check order. It does not mean the callback runs on the libuv pool, and it does not mean it runs before the current function returns.

Immediates queued before check begins run in that check phase, in registration order. Node's immediate queue takes the current list when the phase starts. An immediate queued from inside a running immediate joins the list for a later iteration. The documentation says that directly: an immediate queued from an executing immediate callback waits until the next event-loop iteration. It does not run later in the same check drain.

The returned `Immediate` is ref'd by default, so it keeps the process alive. `immediate.unref()` removes that vote. `clearImmediate` cancels it if check has not run it. `immediate[Symbol.dispose]` is the same cancel on Node 20, for `using`.

After each immediate callback returns, Node runs the checkpoint from NODE-052 before the next immediate in the same phase. A `nextTick` or promise reaction scheduled by the first immediate runs before the second immediate. That is the one-callback-then-checkpoint rule, applied to check.

**Practical Implementation:**

```js
setImmediate(() => {
  console.log('first');
  process.nextTick(() => console.log('tick'));
  setImmediate(() => console.log('nested'));
});
setImmediate(() => console.log('second'));

// Hypothetical, check phase of a later iteration, nothing else queued:
// first
// tick
// second
// nested prints in a later iteration's check, after this check has finished
```

`first` and `second` were both queued before check started, so they share a phase. `nested` missed that snapshot.

**Trade-offs and Alternatives:**

`setImmediate` is the Node tool for "after this turn, in check, so the loop can move." Node's guide prefers it to `process.nextTick` when the goal is to yield, because `nextTick` runs before the loop continues and can starve poll. `setImmediate` is not a web standard. Browsers do not have this phase. Portable "after this stack" code uses `queueMicrotask` or a promise, and that choice does not reach check.

**Common Mistakes:**

- Calling `setImmediate` a microtask, or a `nextTick`.
- Reading the second argument as a delay.
- Expecting `nested` to run before `second` because it was scheduled "sooner."
- Assuming check runs on another thread because the name says immediate.

**Senior-Level Follow-up:**

The interviewer clears the second immediate from inside the first, and asks whether `second` can still run.

Answer: `clearImmediate` on that handle, before the second callback starts, removes it from the list. Check will not call it. The checkpoint from `first` still runs. `nested`, if it was queued, remains scheduled for a later iteration. Clearing one immediate does not clear the phase.

### NODE-055 — Timeout versus immediate inside I/O, and at the top level

**Difficulty:** Senior

**Category:** Timers

**Question:**

Predict `setTimeout(fn, 0)` against `setImmediate(fn)` in two places: inside an I/O callback, and at the top level of the main module. Say which prediction the phase rules support, and which one you refuse to make.

**Context and Constraints:**

- Node 20 or later. The libuv 1.45 timers placement is part of the answer.
- Hypothetical snippets. Do not invent a timing measurement.
- The 1 millisecond floor from NODE-053 applies to the timeout.
- "Often" is the right strength for the I/O pattern. The top-level pattern is not a guarantee.

```js
import { readFile } from 'node:fs';

readFile(new URL(import.meta.url), () => {
  console.log('io');
  setTimeout(() => console.log('timeout'), 0);
  setImmediate(() => console.log('immediate'));
  process.nextTick(() => console.log('tick'));
  Promise.resolve().then(() => console.log('promise'));
});
```

```js
setTimeout(() => console.log('timeout'), 0);
setImmediate(() => console.log('immediate'));
```

**Senior Engineer's Answer:**

Both APIs schedule a later macrotask-style callback. `setImmediate` is check. `setTimeout(fn, 0)` is a timers-phase callback whose delay was clamped to 1 millisecond. Neither is `nextTick`, and neither runs before the checkpoint of the turn that scheduled it.

Inside the `readFile` callback the current phase is poll. The synchronous part of that callback runs first, so the first line is `io`. The callback then returns. The checkpoint drains `tick`, then `promise`. After poll, the lap reaches check, so `immediate` runs. Timers run after check and close on Node 20. The timeout also has to be due. The phase order still places that timeout after the immediate scheduled in the same poll callback: check is the next phase, and the timer cannot jump into it. Node's guide shows `immediate` then `timeout` for this I/O-cycle pattern and treats that order as stable. The careful statement is the one the question asked for: in an I/O callback, `setImmediate` often runs before `setTimeout(fn, 0)`. The reason is this phase order, not a race you measured.

Hypothetical order for the read callback: `io`, `tick`, `promise`, `immediate`, `timeout`.

At the top of the main module the same two calls are not a guarantee. The script runs, its checkpoint runs, and then the loop starts. libuv 1.45 may run timers once before the first poll. If that pre-loop pass already sees the timeout as due, `timeout` prints before check ever runs `immediate`. If the 1 millisecond floor has not elapsed, that pass skips it, the first iteration polls, check runs `immediate`, and a later timers phase runs `timeout`. Process startup time decides which of those happened. The Node guide prints both orders for this main-module script. One run is not a rule. Do not tell the interviewer which line wins at top level.

Scheduling both from inside a running immediate is a third case, and it is also not the I/O pattern. A nested `setImmediate` waits for the next iteration's check. A `setTimeout(fn, 0)` becomes eligible in a timers phase after its floor. On Node 20 the timers phase of the current iteration sits before the next iteration's check, but the floor means the timer might not be due yet. Refuse a universal winner there too.

**Practical Implementation:**

```js
import { readFile } from 'node:fs';

readFile(new URL(import.meta.url), () => {
  console.log('io');
  setTimeout(() => console.log('timeout'), 0);
  setImmediate(() => console.log('immediate'));
  process.nextTick(() => console.log('tick'));
  Promise.resolve().then(() => console.log('promise'));
});

// Hypothetical order from the phase rules:
// io
// tick
// promise
// immediate
// timeout
```

The top-level pair stays in a separate file in your head. You describe the race. You do not annotate a single winning log.

**Trade-offs and Alternatives:**

If product code needs one of these to run before the other, the I/O pattern is the case you can justify, and a test should own that assertion. Prefer not to need the order. If the work must happen after I/O callbacks have had a chance to run, `setImmediate` is the API whose phase is defined that way. If the work must wait a real minimum, `setTimeout` with an intentional delay is the API, and `0` is a confusing way to write "at least 1 millisecond."

**Common Mistakes:**

- Announcing a universal winner from one top-level execution.
- Putting `tick` and `promise` after `immediate`. They are the poll callback's checkpoint.
- Explaining the I/O order with "immediates are faster." The explanation is check before the timers phase.
- Forgetting the pre-loop timers pass and then being surprised that Node 20 can still run a due timer before the first check.

**Senior-Level Follow-up:**

The interviewer moves the `setTimeout` to before the `readFile`, with the same `0` delay, and leaves `setImmediate` inside the callback. They ask whether `timeout` can now print before `io`.

Answer: yes, that is a different schedule. The timer is eligible in any timers phase that finds it due, including the pre-loop pass and any lap that reaches timers before the read completion is in the poll queue. The read callback runs in whichever poll phase observes the completion. If the timer is already due before that completion is delivered, `timeout` prints first. If the completion is delivered first, `io` prints first and the timer waits for a later timers phase. You do not get the "immediate then timeout" rule, because the immediate is not even scheduled until `io` runs. State the dependency. Do not invent a duration for the read.

### NODE-056 — await resumes as a microtask on this same thread

**Difficulty:** Senior

**Category:** Microtasks

**Question:**

Predict the log. Then answer the claim that `await` blocks the thread, and the claim that the continuation runs on a new operating-system thread.

**Context and Constraints:**

- `onTimer` is the only due timers-phase callback. No I/O completion is pending. Hypothetical.
- Node 20. The continuation rules are ECMAScript. The phase that runs `onTimer` is Node.
- Do not re-teach the async-function transform from NODE-022. Place the continuation in the checkpoint and against check.

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

**Senior Engineer's Answer:**

`label()` runs on the timer's stack until `await`. `await null` wraps the value with the promise-resolve operation and schedules the rest of `label` as a promise reaction. That reaction is a microtask. It does not block the thread. It does not start an operating-system thread, a libuv pool thread, or a Worker. The timer callback keeps going: it schedules the immediate, prints `timer-end`, and returns. The stack is empty of `onTimer` before `after` runs.

The checkpoint then drains `nextTick` before promise jobs, so `tick` prints before `after`. `setImmediate` is check. This timer is running in the timers phase, which on Node 20 is at the end of the lap, so check has already passed. The immediate waits for a later iteration. That later iteration can poll before check. The constraint says nothing is pending, so no I/O line appears. `immediate` is still after the checkpoint.

Hypothetical order: `timer`, `before`, `timer-end`, `tick`, `after`, `immediate`.

The `await` yielded the async function. It did not yield the timer callback at that line. The yield of the timer callback is the return after `timer-end`. Between `before` and `timer-end` the isolate is busy, the same as any other synchronous call. A second request's poll callback cannot run there.

**Practical Implementation:**

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

// Hypothetical:
// timer
// before
// timer-end
// tick
// after
// immediate
```

`label()` returns a promise to `onTimer`. `onTimer` ignores it. That does not move `after` onto another thread. It means a rejection after the `await` is an unhandled rejection unless something attached a handler.

**Trade-offs and Alternatives:**

`await` is the right suspension when the next step depends on a promise and the error should reject that promise. It is not a yield to poll. A loop that `await`s an already resolved value on every iteration queues a microtask per step and still does not reach the next phase until that chain stops. `setImmediate` is the yield that reaches check. `worker_threads` is how you get another isolate and another operating-system thread. `await` never does that work for you.

**Common Mistakes:**

- Expecting `after` before `timer-end` because `await null` "completes immediately."
- Expecting `after` before `tick`. The continuation is a promise job. `tick` is the queue that drains first.
- Describing `await` as blocking the process, or as moving the function to the libuv pool.
- Putting `immediate` in the checkpoint. Check is a phase.

**Senior-Level Follow-up:**

The interviewer changes `await null` to `await new Promise(() => {})` and asks which of the five lines still print, and whether the thread is blocked.

Answer: `timer`, `before`, `timer-end`, and `tick` still print. `after` does not, because the promise never settles, so the reaction is never queued. `immediate` still runs in a later check phase. The timer callback already returned. The pending promise keeps state on the heap. It does not hold the stack, and it does not block the isolate. A never-settled promise also does not by itself keep the process alive. The ref'd immediate does, until it runs.

### NODE-057 — A tight nextTick loop starves I/O

**Difficulty:** Senior

**Category:** Starvation

**Question:**

This program schedules a check callback and a file read, then calls `starve`. What prints? Why does the file callback not run even if the operating system has already finished the read?

**Context and Constraints:**

- The call to `starve` happens from the synchronous body of a CommonJS file, or from a phase callback. It is not being used to re-derive the ESM evaluation order.
- Hypothetical. Do not attach a made-up time to the stall.
- The pool may complete the read. That fact is allowed. A wall-clock duration for the read is not given.

```js
const { readFile } = require('node:fs');

function starve() {
  process.nextTick(starve);
}

setImmediate(() => console.log('immediate'));
readFile(__filename, () => console.log('io'));
starve();
```

**Senior Engineer's Answer:**

`starve` queues a `nextTick` whose only work is to queue another `nextTick`. After the current turn returns, the checkpoint drains that queue. The queue never empties, so the checkpoint never finishes. Node's guide states the consequence directly: recursive `process.nextTick` prevents the event loop from reaching the poll phase.

`setImmediate` is check, which is after poll. `readFile`'s JavaScript callback is poll. Neither phase starts while the checkpoint is still draining. Hypothetical result: `immediate` does not print, and `io` does not print. If `starve` logged on each turn, those logs would continue. The other two lines stay absent.

The libuv pool is a separate fact. `readFile` may occupy a pool thread, finish the read, and post a completion. That completion sits until the loop thread enters poll and runs the callback. A stuck `nextTick` drain means the loop thread never does that. The bytes can be in memory and the JavaScript callback still will not run. The pool did not run the callback, and it cannot bypass the checkpoint.

The process stays alive. A ref'd immediate is enough to keep the loop referenced, and a `nextTick` queue that never empties never lets the loop go idle and exit. CPU time goes to the drain. This is not a deadlock of two locks. It is a queue that is defined to finish before I/O.

A recursive promise chain is the same shape with the other queue, covered later. The `nextTick` version is stricter in one sense: it also postpones promise jobs that are already queued, because promise jobs run only after the current `nextTick` drain empties.

**Practical Implementation:**

```js
const { readFile } = require('node:fs');

function starve() {
  process.nextTick(starve);
}

setImmediate(() => console.log('immediate'));
readFile(__filename, () => console.log('io'));
starve();

// Hypothetical: neither 'immediate' nor 'io' prints.
// The checkpoint never returns to poll or check.
```

The repair is to stop rescheduling `nextTick` unconditionally. A bounded number of `nextTick` callbacks, then a `setImmediate` for the rest of a batch, lets a later lap poll. The bound is a product decision. The phase fact is that only a finished checkpoint allows the lap to continue.

**Trade-offs and Alternatives:**

`nextTick` exists so a callback can run after the stack unwinds and before the loop proceeds. Node uses that for APIs that must let the caller attach listeners first. A pump that processes a whole queue via `nextTick` uses the same property against the process. `setImmediate` between chunks lets check and the following lap's poll run. `queueMicrotask` does not fix a `nextTick` flood if the flood is still in front of it. Removing the recursion fixes it.

Since Node 20.18 and 22.7, `process.nextTick` is marked Legacy, which NODE-021 already records. Legacy does not change the drain rules. New code that means "after I return" uses `queueMicrotask` or a promise, and new code that means "let I/O run" uses `setImmediate` or a timer.

**Common Mistakes:**

- Expecting the file callback to run because the pool finished.
- Expecting `setImmediate` to preempt `nextTick` because the name says immediate.
- Calling the stall a blocked thread. The thread is running JavaScript. The loop is not in poll.
- "Fixing" it with `await Promise.resolve()` inside `starve`. If `nextTick` never stops, that microtask never starts.

**Senior-Level Follow-up:**

The interviewer changes `starve` so it stops after a fixed count passed in from the caller, then asks whether `io` can print before `immediate`.

Answer: once the `nextTick` queue empties, the lap proceeds. `io` runs in a poll phase that observes the completion. `immediate` runs in check. If the completion is already pending when poll runs, `io` can print before `immediate`, because poll precedes check. If the read is not finished yet, check can run `immediate` first, and `io` prints on a later poll. Stopping the flood makes both callbacks reachable. It does not create a fixed order between them. You still do not quote a duration for the read.

### NODE-058 — What poll does, and when it waits

**Difficulty:** Senior

**Category:** I/O

**Question:**

Explain the poll phase in Node 20. What callbacks run there, when the thread blocks in the kernel, and what stops that wait? A colleague says poll runs every kind of asynchronous callback.

**Context and Constraints:**

- Main thread. The thread pool may be named only as the producer of some completions.
- No numeric "poll lasted N milliseconds" claim unless you are repeating a constraint, and this question gives none.
- The hard cap that keeps poll from spinning forever may be named as a bound. Do not invent its value.

**Senior Engineer's Answer:**

Poll has two jobs. It computes how long the loop may wait for I/O, and it runs the I/O callbacks that are ready. Almost all I/O callbacks land here, with the exceptions the guide lists: close callbacks, timer callbacks, and `setImmediate`. A TCP read, a completed filesystem operation, a DNS completion, and a crypto offload completion are poll callbacks when they reach JavaScript. The offload itself may have used the pool. The JavaScript does not.

The wait depends on what else is scheduled. If callbacks are already in the poll queue, the loop runs them and does not need to block first. If `setImmediate` callbacks are waiting, Node ends an otherwise idle poll and continues to check rather than sleeping. If a timer is scheduled, poll waits at most until that timer's threshold, then the lap can reach the timers phase. If the process has nothing but an open server handle, poll blocks until the kernel reports a connection or data. That block is the thread inside the poller, not a JavaScript function waiting in a loop you wrote.

A poll callback runs to completion on the isolate's stack. After it returns, the checkpoint drains `nextTick` and promise jobs before the next poll callback. The phase can run many I/O callbacks in one visit. libuv also stops the visit at a system-dependent hard maximum so a busy poll queue cannot starve check, close, and timers forever. The maximum is an internal bound. It is not a Node API, and it is not a number to recite from memory.

New events can arrive while callbacks are running. A slow callback keeps the phase in JavaScript, so those events wait even if the kernel already reported them. "Poll is non-blocking" describes socket operations that were started without a blocking `read`. It does not describe a 50-line JSON parse inside the callback. That parse blocks the loop.

**Practical Implementation:**

```js
import { createServer } from 'node:net';

const server = createServer((socket) => {
  // This function runs in poll, on the main isolate, when the connection is readable.
  socket.on('data', (chunk) => {
    // Also poll, a later turn. The checkpoint of the previous callback has finished.
    socket.write(chunk);
  });
});

server.listen(0);
```

While `socket.on('data')` is doing synchronous work, this process does not enter check, and it does not accept the next connection in JavaScript. The kernel may accept the TCP handshake into the backlog. The `connection` callback waits for a future poll.

**Trade-offs and Alternatives:**

Poll is the right place for I/O completions because the kernel, not a timer, knows when the descriptor is ready. Pulling that work into `setInterval` adds the timer floor and still runs on the same thread. Moving the parse to a Worker is a different chapter: it helps when the JavaScript is the cost. It is not how sockets are read.

**Common Mistakes:**

- Putting timer and `setImmediate` callbacks in the poll queue.
- Treating a blocking poll as a stuck JavaScript loop. An idle server is supposed to wait in poll.
- Assuming the hard maximum is a fairness guarantee you can configure from JavaScript. It only bounds one visit.
- Believing each socket has its own poll thread. One loop thread polls many descriptors.

**Senior-Level Follow-up:**

The interviewer asks why a process with only a ref'd `setImmediate` and no sockets still exits after the callback, instead of blocking forever in poll.

Answer: a queued immediate tells the loop not to sleep in an idle poll. The lap proceeds to check, runs the callback, and if nothing ref'd remains, the loop is done. Poll's wait is computed. It is not an unconditional block at the bottom of every script. An unref'd immediate would not keep the process alive long enough to rely on that callback. A ref'd server handle would keep poll able to block after the immediate has run.

### NODE-059 — Pending callbacks are not the poll queue

**Difficulty:** Intermediate

**Category:** Event loop phases

**Question:**

What runs in the pending-callbacks phase, and why does a connection error sometimes show up there instead of inside poll? Distinguish that queue from `process.nextTick` and from poll.

**Context and Constraints:**

- Node 20, the libuv 1.45 loop.
- You may mention the bounded re-run after poll. If you cite the iteration count, mark it as libuv's current loop bound, not as a Node API.
- Do not move `setImmediate` into this phase.

**Senior Engineer's Answer:**

Pending callbacks are a libuv queue for I/O callbacks that must run on a later turn of the loop, outside the poll visit that observed the event. Node's guide gives the example people remember: on some Unix systems a TCP connect that fails with `ECONNREFUSED` is reported through this phase rather than as an ordinary poll callback. The JavaScript you see is still the main isolate, usually as an `'error'` on the socket. The phase explains the deferral. It does not mean a second JavaScript thread.

That is the start-of-iteration pending phase. libuv also drains the same style of queue after poll returns. The comment in libuv's loop names write callbacks as an example of completions that become pending during poll. The drain is intentionally bounded so check still runs. In the libuv line Node 20 ships, that loop is a fixed 8 iterations. The number is an implementation cap in `uv_run`. It is not `setImmediate`, not a timer, and not something application code should depend on as a constant. If a future libuv changes the cap, the contract that remains is the bound, not the digit.

Pending work is not `process.nextTick`. `nextTick` is a Node queue drained at the checkpoint, before the loop continues, and it can starve poll if it never empties. Pending callbacks are inside the lap. They run when the lap reaches them, then the checkpoint runs after each of those callbacks, then the lap moves on. A flood of pending write completions is why the post-poll drain is capped. A flood of `nextTick` has no such cap.

`server.listen`'s `'listening'` event is also not this phase. Node emits that on `nextTick` so your script can attach the listener before the event. That is a Node API choice, covered with ordering guarantees later.

**Practical Implementation:**

```js
import { connect } from 'node:net';

const socket = connect(1, '127.0.0.1');
socket.on('error', (err) => {
  // Hypothetical placement: some Unix ECONNREFUSED reports arrive as a
  // pending-callback turn, not as the poll callback of a successful read.
  console.log(err.code);
});
```

The code does not choose the phase. libuv does, from the kind of completion. Your handler still must not throw on the assumption that nobody connects. `error` on a socket is a normal turn.

**Trade-offs and Alternatives:**

You almost never schedule pending callbacks yourself. You do have to handle `'error'`. Putting the handler on `nextTick` inside `connect` would delay your own bookkeeping and would not move the kernel's error into a different queue. Leave the phase to libuv. Attach the listener before the connect if you need it for a synchronous failure, and attach it immediately after for the deferred one. `net.connect` can also surface failure asynchronously either way, so the listener belongs on the socket before you assume the attempt is still pending.

**Common Mistakes:**

- Using "pending" as a synonym for every callback that has not run yet, including timers and immediates.
- Treating `ECONNREFUSED` as synchronous because the port is closed. On the systems the guide describes, the error is queued.
- Memorizing 8 as an application limit you can raise. It is libuv's bound.
- Confusing this queue with the ES module microtask state, which is also sometimes called pending in conversation.

**Senior-Level Follow-up:**

The interviewer asks whether a `'data'` handler can be starved by a socket that completes writes faster than check can run.

Answer: write completions that libuv places on the pending queue are drained after poll, and that drain is capped so the lap still reaches check. A single write callback that does a large synchronous computation is a different problem: the cap limits how many callbacks run, not how long one callback holds the stack. Split that work, or it stalls check the same way any long poll callback does. The cap is not a substitute for short callbacks.

### NODE-060 — Idle and prepare are real phases, and they are not your callback

**Difficulty:** Intermediate

**Category:** Event loop phases

**Question:**

The diagram has idle and prepare between pending callbacks and poll. A candidate says `setImmediate` is the idle phase, because the process runs it when it is idle. Correct the names.

**Context and Constraints:**

- Node 20, libuv 1.45 order: idle and prepare still run before poll, every iteration where the loop is in that lap.
- No claim that application code should create `uv_idle_t` handles.
- `setImmediate` is check. Do not move it.

**Senior Engineer's Answer:**

Idle and prepare are libuv phases for internal handles. They run after pending callbacks and before poll. Prepare handles run just before the loop polls. Idle handles run once per iteration, just before prepare, when they are active. "Once per iteration" is the important correction. An active idle handle does not mean "the process has nothing to do," and it does not mean "run this when the server is quiet." If the handle is active, the loop invokes it on that lap and then continues. A busy server still passes through these phases. They are not a bonus lap that appears only at night.

Node's public JavaScript APIs do not queue your callback there. `setImmediate` is check, after poll. `setTimeout` is timers, at the end of the Node 20 lap. `process.nextTick` is the checkpoint, which is not a phase. If a diagram has no box for your API, the right response is to place the API in check, timers, poll, close, or the checkpoint. It is not to reuse the idle box because the English word sounds close.

Node and native addons can register idle and prepare handles for bookkeeping. That registration is not a supported application scheduling API. You do not fix a starved poll by "scheduling an idle callback" from JavaScript. You stop holding the stack, and you stop refilling `nextTick` or promise jobs without a break.

**Practical Implementation:**

```js
import { createServer } from 'node:http';

createServer((req, res) => {
  res.end('ok');
}).listen(0);

setImmediate(() => {
  // Check, including while this server is busy enough to accept connections.
  // The server being alive does not retarget this callback at idle/prepare.
});
```

The listening server makes poll meaningful. It does not relocate check.

**Trade-offs and Alternatives:**

Knowing these two names stops you from inventing a seventh application queue. It does not give you a new tool. When you need a turn after poll, you already have check. When you need a turn after a delay, you already have timers. Native code that starts an idle handle and never stops it will spin the loop, because idle runs every iteration. That is a native-addon bug, and the JavaScript symptom is a hot process that never blocks in poll. The fix is in the addon, which stops the handle.

**Common Mistakes:**

- Defining `setImmediate` as "the idle phase."
- Skipping idle and prepare in the drawing and then having nowhere to put a mistaken answer.
- Treating prepare as `process.nextTick` because both happen "before poll."
- Assuming a quiet process skips to idle as a special state. An empty loop exits, or it blocks in poll. It does not camp on the idle phase.

**Senior-Level Follow-up:**

The interviewer asks whether an active idle handle can delay a due timer on Node 20.

Answer: idle and prepare run before poll, and timers run after close. A due timer waits until the lap reaches the timers phase. An idle callback that returns promptly only adds its own turn. An idle callback that runs for a long time holds the stack before poll, so the timers phase of this lap starts late. The delay is the synchronous work, the same as a long poll callback. The existence of the phase is not a timer penalty.

### NODE-061 — Which close runs in the close phase

**Difficulty:** Senior

**Category:** I/O

**Question:**

`socket.destroy()` and a graceful `socket.end()` can both end with a `'close'` event. Which one does Node attribute to the close-callbacks phase, and what does the other path use? Where does `server.close(callback)` sit relative to open connections?

**Context and Constraints:**

- Node 20, main thread, `node:net` or `node:http` sockets.
- The Node guide's rule for abrupt close versus `nextTick` is the one to state.
- Do not promise a wall-clock time for draining connections.

**Senior Engineer's Answer:**

The close-callbacks phase runs at the end of the lap on Node 20, after check and before timers. Node's guide assigns abrupt handle close to that phase. `socket.destroy()` is the example: the `'close'` event is emitted there. A close that is not abrupt is emitted through `process.nextTick` instead. A graceful `socket.end()` follows that second path when the guide's rule says "otherwise." The event name is the same. The queue is not. Listeners still run on the main isolate, one at a time, with the checkpoint after each callback.

`'close'` is not the poll callback of the last `'data'`. The last payload is a poll turn. The close notification is a later turn, either in the close phase or on `nextTick`, depending on how the handle was closed. Code that does cleanup in `'data'` because "the next event will be close on the same stack" is wrong. The `'data'` callback returns first. The checkpoint runs. Then a later turn delivers `'close'`.

`server.close(callback)` stops the listening handle from accepting new connections. The callback runs when that handle closes. Existing sockets keep the server open until they end or are destroyed. Those sockets are ordinary ref'd handles. Their `'close'` events follow the socket rule above. The server callback is not a timer, and it does not run while those sockets are still open. `server.close()` does not destroy them for you.

`close` here is also not `process.exit`. The process stays up while any ref'd socket remains. Destroying the sockets, or letting them finish, is what allows the loop to empty.

**Practical Implementation:**

```js
import { createServer } from 'node:net';

const server = createServer((socket) => {
  socket.on('close', () => {
    // Later turn: close phase after destroy, or nextTick after a graceful end.
  });
  socket.end('bye');
});

server.listen(0, () => {
  server.close(() => {
    // Runs when the listening handle has closed and open sockets are gone.
  });
});
```

`'bye'` is queued as a write. `end` returns immediately. The `'close'` listener is not running at the `end` call.

**Trade-offs and Alternatives:**

Graceful `end` lets the other side read the last bytes. `destroy` frees the handle. Shutdown code that must run for both paths belongs on `'close'`, not on a guess about which phase will deliver it. If you need that cleanup before the loop accepts more work, do the cleanup synchronously in the listener. `setImmediate` moves it to check. From the close phase, that check is the next lap, after that lap's poll. From a `nextTick` close during poll, check is still this lap, before the next poll. Either way it is the wrong place for "release this lock before any other connection runs."

**Common Mistakes:**

- Saying every `'close'` is the close phase. The guide splits abrupt close from the `nextTick` path.
- Doing final bookkeeping in the `'data'` callback that saw `end: true` and assuming `'close'` already ran.
- Calling `server.close()` and expecting open sockets to vanish, or the process to exit, on that line.
- Confusing the close phase with the `exit` event. `exit` listeners run when the process is finishing, and they cannot wait for a phase.

**Senior-Level Follow-up:**

The interviewer calls `destroy()` from inside a `'data'` handler and asks whether `'close'` can run before that handler returns, and whether a `nextTick` queued just before `destroy()` runs before `'close'`.

Answer: `destroy()` schedules the close. It does not emit `'close'` on the current stack. The `'data'` handler returns, its checkpoint drains the `nextTick`, and `'close'` runs in the close phase of this lap, which is after check. So that `nextTick` runs before `'close'`. A promise reaction queued in the same handler also runs in that checkpoint, still before the close phase. `'close'` is a later callback, with its own checkpoint after it.

### NODE-062 — The pool finishes off the loop; the callback still waits for poll

**Difficulty:** Senior

**Category:** Thread pool

**Question:**

`fs.readFile`, `dns.lookup`, and `crypto.pbkdf2` are all described as "async, so they use threads." Place the libuv pool relative to the phases. Say what runs on a pool thread, what runs in poll, and what `dns.resolve` and `pbkdf2Sync` do differently. This is not a worker-threads question.

**Context and Constraints:**

- Node 20, main isolate. You may say that a Worker has its own loop. Do not explain message passing.
- Default pool size is 4. `UV_THREADPOOL_SIZE` is the environment variable. libuv's absolute maximum is 1024.
- No invented benchmark for "pool size 16 was faster."
- The JavaScript callback is single-threaded. NODE-002 already said it is not on the pool. This question adds the phase.

**Senior Engineer's Answer:**

The pool is a set of operating-system threads libuv uses for work that does not have a non-blocking kernel interface. Filesystem operations, `dns.lookup` (which calls `getaddrinfo`), and CPU-heavy crypto such as `crypto.pbkdf2`, `crypto.scrypt`, and the callback form of `crypto.randomBytes` / `crypto.randomFill` are the usual occupants. The default size is 4. Set `UV_THREADPOOL_SIZE` in the environment before the process starts. libuv clamps the size to a maximum of 1024. Raising it adds pool threads. It does not add isolates, and it does not add pollers for sockets.

A pool thread runs native code. It does not run your callback, and it does not enter poll. When the native call finishes, libuv posts a completion. The loop thread runs the JavaScript in the poll phase, on the main isolate, as one callback, then the checkpoint. `fs.promises.readFile` and `crypto.pbkdf2` with no callback use the same pool and resolve a promise from that poll turn. The `await` continuation is a microtask after that callback. It is still the main isolate.

Two different waits get collapsed in conversation. If all pool threads are busy, the new `readFile` has not started, so there is no completion to poll. If the pool is finished and your isolate is inside a long JavaScript turn, the completion is posted and the callback still waits, because poll cannot run. A stuck `nextTick` loop is the second wait with an empty checkpoint that never ends. Adding pool threads does not fix it.

`dns.resolve` and the other resolver functions go through c-ares. That is network DNS on the loop, delivered as poll, and it does not take a pool thread. `dns.lookup` does. A saturated pool delays `lookup` and file and crypto offload. It does not explain a stuck `resolve`.

`fs.readFileSync` and `crypto.pbkdf2Sync` do not use the pool. They block the isolate until they return. No phase runs while they run. Sockets do not use the pool either. A TCP read is poll on the loop thread.

A Worker is a different instrument. It has its own isolate, its own loop, and its own pool. This question stops at the main thread's pool. Offloading JavaScript to a Worker is the concurrency section.

**Practical Implementation:**

```js
import { readFile, readFileSync } from 'node:fs';
import { lookup, resolve } from 'node:dns';
import { pbkdf2, pbkdf2Sync } from 'node:crypto';

readFile(new URL('./package.json', import.meta.url), (_err, buf) => {
  // Poll, after a pool thread read the file. `buf` is handled on the isolate.
});

lookup('localhost', () => {
  // Poll, after a pool thread ran getaddrinfo.
});

resolve('localhost', () => {
  // Poll, via c-ares. No pool thread required for the lookup.
});

pbkdf2('secret', 'salt', 100000, 32, 'sha256', () => {
  // Poll, after a pool thread did the KDF.
});

function blocksTheLoop() {
  readFileSync(new URL('./package.json', import.meta.url));
  pbkdf2Sync('secret', 'salt', 100000, 32, 'sha256');
  // No poll callback runs until this function returns.
}
```

The iteration counts and the filename are constraints of the snippet, not measurements of how long the KDF took.

**Trade-offs and Alternatives:**

The pool is how Node keeps those blocking native calls off the isolate. It is a small, shared resource. A service that does large file reads and password hashing on the same pool will delay both, and sockets will still be readable only after poll runs the completions. Split the cost with a queue, a lower hashing concurrency, or a Worker for the JavaScript around the crypto. Raising `UV_THREADPOOL_SIZE` helps when the pool is the bottleneck you measured on a workload that actually uses it. It does not make `JSON.parse` cheaper, and it does not make `pbkdf2Sync` asynchronous.

**Common Mistakes:**

- Saying the `readFile` callback runs on the pool thread.
- Saying every async Node API uses the pool. Sockets and `dns.resolve` do not.
- Setting `process.env.UV_THREADPOOL_SIZE` after another module has already touched the pool, and expecting the default of 4 to move.
- Treating `await readFile(...)` as proof the continuation is on a worker.

**Senior-Level Follow-up:**

The interviewer says four `pbkdf2` calls are in flight, a fifth `readFile` is issued, and a request arrives on an open socket. Which of those can the poll phase run while the four hashes still occupy the pool?

Answer: the socket read does not need the pool. Poll can run that connection's callback while the four pool threads stay inside `pbkdf2`. The fifth `readFile` waits for a pool thread before it has a completion, so its callback cannot run yet. When one hash finishes, that completion is also a poll callback, in whatever later poll visit sees it. The socket callback and the hash callback never share a stack. They also never run on the pool.

### NODE-063 — A nextTick queued from a promise job still beats the next phase

**Difficulty:** Senior

**Category:** Microtasks

**Question:**

Predict the log. The interesting line is the `process.nextTick` inside the promise reaction, and the promise scheduled from the `nextTick`.

**Context and Constraints:**

- `onTurn` is a poll, check, or timers callback. Not top-level ESM evaluation.
- Hypothetical. The immediate exists so the print cannot be mistaken for synchronous code.
- `queueMicrotask` and `.then` are one queue. Say so when you use both.

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

**Senior Engineer's Answer:**

The synchronous lines run first: `sync`, then `sync-end`. The executor of `Promise.resolve()` is synchronous and empty of logs. Reactions are queued, not run.

The checkpoint drains every `nextTick` before any microtask. `tick` runs and queues `promise-from-tick`. The `nextTick` queue is then empty. Microtasks run in the order they were queued: `promise` was queued during the synchronous body, `micro` was queued next, and `promise-from-tick` was queued during `tick`, which is still before `runMicrotasks`. So the microtask order is `promise`, `micro`, `promise-from-tick`.

`promise` queues `tick-from-promise`. That does not jump the microtask queue. V8 finishes the microtasks already queued, then Node's drain loop sees a non-empty `nextTick` queue and runs `tick-from-promise`. Then microtasks again, and they are empty. Check has not started. `immediate` prints last among these lines.

Hypothetical order: `sync`, `sync-end`, `tick`, `promise`, `micro`, `promise-from-tick`, `tick-from-promise`, `immediate`.

That last `nextTick` is the part candidates drop. The rule is not "nextTick once, then all promises, then the next phase." The rule is "both queues, including anything they schedule, drain before the next phase." `tick-from-promise` is still the checkpoint. It is not a check callback.

**Practical Implementation:**

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

// Hypothetical:
// sync
// sync-end
// tick
// promise
// micro
// promise-from-tick
// tick-from-promise
// immediate
```

**Trade-offs and Alternatives:**

Queueing a `nextTick` from a promise is how library code returns to "before the loop continues" after a reaction. It is also how a promise chain accidentally gains the starvation power of `nextTick`. If the work can wait until check, schedule `setImmediate` from the reaction instead. The immediate is visibly a later phase. The nested `nextTick` is not.

**Common Mistakes:**

- Printing `tick-from-promise` before `micro` because "nextTick always wins." It wins the next drain, after the microtask queue that queued it has finished.
- Printing `promise-from-tick` before `promise`. It was queued later.
- Treating `queueMicrotask` as a third priority between `nextTick` and promises. It is the promise queue.
- Thinking `immediate` can slip between `promise` and `tick-from-promise`. The checkpoint holds the loop.

**Senior-Level Follow-up:**

The interviewer adds `queueMicrotask(() => console.log('inner'))` as the first line of the `promise` reaction, before the `nextTick`. Where does `inner` print?

Answer: `inner` is queued during `promise`, so it joins the microtask queue behind the microtasks already waiting, which are `micro` and `promise-from-tick`. It runs after those two and before `tick-from-promise`, because it is a microtask queued before the checkpoint goes back to `nextTick`. Hypothetical insertion: `promise`, `micro`, `promise-from-tick`, `inner`, `tick-from-promise`. `immediate` stays last.

### NODE-064 — Which schedule actually lets poll run

**Difficulty:** Senior

**Category:** Scheduling

**Question:**

You have a large in-memory batch to process on the main isolate. You want other sockets' poll callbacks to run between chunks. Compare `process.nextTick`, a resolved promise, `setImmediate`, and `setTimeout(fn, 0)`. Which ones let the loop reach poll, and from which phase?

**Context and Constraints:**

- Node 20 lap order, including timers after close.
- The batch is JavaScript. It does not belong on the libuv pool. Do not propose a Worker as the answer to the ordering question. You may name a Worker as a different tool in the trade-offs.
- No measured chunk size.

**Senior Engineer's Answer:**

A yield is a return to the host that allows a later poll phase to run ready I/O callbacks before your next chunk. The checkpoint is not that yield.

`process.nextTick(nextChunk)` and `Promise.resolve().then(nextChunk)` schedule the next chunk inside the checkpoint. If every chunk does that again, poll never starts. A single `nextTick` still runs before any already-queued I/O callback. It is the opposite of giving sockets a turn.

`setImmediate(nextChunk)` schedules check. Whether a poll happens before that callback depends on where you schedule it.

- From a timers callback, or from the top-level script: the next lap runs pending, idle, prepare, and poll before check. Ready I/O callbacks in that poll run before your chunk. This is a real yield to poll.
- From a poll callback: the current poll visit finishes callbacks already queued, then check runs your chunk. New I/O becomes the following lap's poll, which is after that immediate, after close, and after timers. You left the stack, and other callbacks already in this poll queue can run. You did not insert a new poll in front of the immediate.

`setTimeout(nextChunk, 0)` schedules a timers callback with a 1 millisecond minimum. On Node 20 the timers phase is after check. If the timer is already due by the timers phase of this lap, a timeout scheduled from poll runs at the end of the lap, before the next poll. If the floor has not elapsed yet, that timers phase skips it, and the next lap polls before a later timers phase runs it. A timeout scheduled from check has the same floor in front of it. The floor means you also wait when the loop is empty. It is a yield off the stack. It is not "run next," and it is not a tighter yield than `setImmediate`.

The usual pattern for "between chunks, let the loop move" is `setImmediate`. It is the one Node documents as running after poll has completed its visit, and the one the guide recommends when the alternative is `nextTick`. It does not, by itself, mean "poll, then me" in every phase. Say the phase you are in.

**Practical Implementation:**

```js
function processBatch(items) {
  const chunk = items.splice(0, 100);
  for (const item of chunk) handle(item);
  if (items.length === 0) return;
  setImmediate(() => processBatch(items));
}

function handle(_item) {}
```

`100` is a bound you chose so each check callback returns. It is not a measured optimum. `handle` has to return. If `handle` blocks for the whole batch, the `setImmediate` never gets scheduled in time to matter.

**Trade-offs and Alternatives:**

`setImmediate` keeps the work on the isolate and gives the loop turns. The batch still competes with request handlers for that isolate. A Worker moves the JavaScript off this loop entirely, at the cost of transfer and a second heap. That is the concurrency section. A timer is appropriate when the gap should be at least N milliseconds. Writing `setTimeout(fn, 0)` to mean `setImmediate` adds the floor and a phase you did not want. `queueMicrotask` is appropriate when the caller must observe the result before I/O, which is the opposite requirement.

**Common Mistakes:**

- Using a recursive `nextTick` or `await Promise.resolve()` as the chunk break and calling it cooperative scheduling.
- Claiming `setImmediate` always runs after a fresh poll, including when you scheduled it from inside poll.
- Claiming `setTimeout(fn, 0)` is the same function as `setImmediate` with a different name.
- Picking a chunk size from a blog and treating it as a property of libuv.

**Senior-Level Follow-up:**

The interviewer schedules the next chunk with `setImmediate` from inside the poll callback that just read a request, and asks why the following request on the same server can still be delayed until after the chunk.

Answer: that immediate runs in check, before the next lap's poll. A connection that becomes readable only after you return still waits for the next poll, so your chunk is ahead of it. Callbacks already sitting in this poll queue run before check, so they are ahead of the chunk. "I called `setImmediate`" does not mean "every socket goes first." If the requirement is that newly ready sockets run before the next chunk, schedule the chunk from a phase that sits after a poll you have not consumed yet, or check the phase and accept one more lap. The stricter fix for a hot batch is to stop doing it on the request isolate.

### NODE-065 — The await inside an I/O callback still beats check

**Difficulty:** Senior

**Category:** Microtasks

**Question:**

Predict the log. The callback is `async`. Explain why `after` cannot trade places with `immediate`.

**Context and Constraints:**

- The `readFile` completion is what invokes the callback. You are predicting from that poll turn onward.
- No other poll callbacks are queued. Hypothetical.
- `await null` settles as a fulfilled promise. It does not touch the pool.

```js
import { readFile } from 'node:fs';

readFile(new URL(import.meta.url), async () => {
  console.log('io');
  process.nextTick(() => console.log('tick'));
  await null;
  console.log('after');
  setImmediate(() => console.log('immediate'));
});
```

**Senior Engineer's Answer:**

The poll callback is the async function. It runs synchronously until `await`. `io` prints, `tick` is queued, `await null` schedules the continuation as a promise job, and the function returns its promise to `readFile`, which ignores that promise. The poll turn's checkpoint then drains `tick` and then the continuation, so `after` prints before any later phase.

`setImmediate` is scheduled from that continuation, which is still the checkpoint, still before check. Check is the next phase after this poll visit. `immediate` prints after `after`. There is no pool thread for `await null`, so nothing races the continuation.

Hypothetical order: `io`, `tick`, `after`, `immediate`.

The continuation beat check because it is a microtask of the poll callback, not because async functions are prioritized over `setImmediate` as a special case. Any promise reaction queued before the checkpoint finishes has the same priority. If `after` itself awaited again, that further continuation would also be a microtask and would still finish before check, as long as each awaited promise is already settled. A chain of settled awaits is a microtask chain. It postpones `immediate` until the chain stops.

**Practical Implementation:**

```js
import { readFile } from 'node:fs';

readFile(new URL(import.meta.url), async () => {
  console.log('io');
  process.nextTick(() => console.log('tick'));
  await null;
  console.log('after');
  setImmediate(() => console.log('immediate'));
});

// Hypothetical:
// io
// tick
// after
// immediate
```

If the function throws after `after`'s line, or the awaited promise rejects, the promise returned to `readFile` rejects. `readFile` will not catch it. That is an unhandled rejection unless you attach a handler. The `try/catch` you want is inside the async function, or a wrapper that calls `.catch` on the promise.

**Trade-offs and Alternatives:**

An async I/O callback is reasonable when the steps after the byte buffer are promise-shaped. The cost is an extra promise and a continuation that runs before the loop reaches check. That is what you want for a short sequence. It is what you do not want for a loop of awaits that was meant to yield. Schedule `setImmediate` between real chunks of work, and `await` the things that are actually pending, such as the next `readFile`.

**Common Mistakes:**

- Thinking the async keyword moved the whole callback to the pool.
- Printing `immediate` before `after` because `setImmediate` was "the next line" in a mental model that ignores that `setImmediate` runs only after `await` resumes.
- Printing `after` before `tick`.
- Wrapping `readFile` in `try/catch` outside the callback and expecting it to catch a rejection inside the async callback. The outer function has already returned.

**Senior-Level Follow-up:**

The interviewer changes `await null` to `await readFile(otherUrl)` from `node:fs/promises` and asks whether `immediate`, which is still scheduled after that await, can run before the second read's callback.

Answer: the promise form uses the pool and fulfills from a future poll callback. The continuation after that await runs in the checkpoint of the poll turn that fulfills the promise, so it runs after that callback has started the fulfillment. `setImmediate` is only scheduled then, so `immediate` runs in a later check. It cannot run before the second read's poll callback, because the line that schedules it has not executed. Callback `readFile` from `node:fs` would not be awaitable for this; awaiting it would await `undefined` and would not wait for the file. Other poll callbacks may run while the second read is still on the pool. Those are different turns. They are not `immediate`.

### NODE-066 — Two callbacks in one phase do not share one checkpoint

**Difficulty:** Advanced

**Category:** Timers

**Question:**

Both timers below become due in the same timers phase. Predict the log. State the rule that puts `p1` between them. Then say what changes if the second `setImmediate` is scheduled from inside the first rather than before check starts.

**Context and Constraints:**

- Node 20. Both timeouts use delay `0`, so both are clamped to the same 1 millisecond list and become due together. That clamp is the constraint, not a measured fire time.
- No other timers are due. Hypothetical.
- You may use Node's behavior that the timers queue and the immediate queue run the checkpoint between callbacks.

```js
setTimeout(() => {
  console.log('t1');
  Promise.resolve().then(() => console.log('p1'));
}, 0);

setTimeout(() => {
  console.log('t2');
}, 0);

setImmediate(() => {
  console.log('i1');
  process.nextTick(() => console.log('tick'));
});

setImmediate(() => {
  console.log('i2');
});
```

**Senior Engineer's Answer:**

Equal delays share one timer list, in registration order. When the timers phase runs that due list, it runs one callback, then the checkpoint, then the next timer. Node's timers implementation does that between due timers, and the immediate queue does it between immediates that were already queued for this check. The interview model and the implementation match: one callback, then `nextTick`, then promise jobs, then the next callback. The phase does not run every JavaScript callback and only afterwards drain microtasks.

So `t1` prints, then `p1`, then `t2`. `p1` cannot slip behind `t2`. `t2` cannot start while `t1` is still on the stack.

The two immediates were both queued before check, so they share a check phase. `i1` prints, its checkpoint runs `tick`, then `i2` prints. A `setImmediate` scheduled from inside `i1` would not join this list. Node snapshots the immediate queue when check starts. The nested immediate waits for a later iteration. That is a different order from "I scheduled it before `i2` in the source." In this snippet the nested call is not there, so `i2` stays in this phase.

Which of the timer pair and the immediate pair runs first is the NODE-055 question. At top level it is not a guarantee. This question predicts the order inside each pair, which the checkpoint rule does fix. Do not staple the four callbacks into one global order.

Hypothetical, within the timers phase: `t1`, `p1`, `t2`. Within the check phase: `i1`, `tick`, `i2`.

**Practical Implementation:**

```js
setTimeout(() => {
  console.log('t1');
  Promise.resolve().then(() => console.log('p1'));
}, 0);

setTimeout(() => {
  console.log('t2');
}, 0);

// Hypothetical, when this due list runs:
// t1
// p1
// t2
```

If `t1` queues another `setTimeout(fn, 0)`, that new timer has its own 1 millisecond minimum from the time it was scheduled. It is not appended to the list entry that is already running as "also due right now" unless that minimum has already elapsed. Do not treat a timer scheduled during the phase as the next sibling the way a pre-queued `t2` is.

**Trade-offs and Alternatives:**

Depending on the checkpoint between two timers is reasonable when both are yours and you need a promise barrier between them. Depending on it as a public API between your timer and a library's timer is fragile, because you do not own registration order. One function that does both steps, and awaits the promise itself, is clearer than two timers. `setImmediate` between unrelated subsystems is the coarser yield.

**Common Mistakes:**

- Printing `t1`, `t2`, `p1` because "timers are one macrotask." Each callback is its own turn for the checkpoint.
- Assuming the nested immediate runs before `i2`.
- Gluing timers and immediates into one predicted sequence at top level.
- Forgetting that `t2`'s synchronous body, if it had one after the log, would delay later phases even though `p1` already ran.

**Senior-Level Follow-up:**

The interviewer adds `process.nextTick(() => console.log('tick-from-t1'))` inside `t1` and asks whether `tick-from-t1` can run after `t2`.

Answer: no. It is queued from `t1`, so it is part of `t1`'s checkpoint, together with `p1`. `nextTick` drains before `p1`. Both finish before `t2` starts. Hypothetical: `t1`, `tick-from-t1`, `p1`, `t2`. The only way it runs after `t2` is if it is scheduled from `t2` or from a later phase.

### NODE-067 — setInterval re-arms in the timers phase and does not overlap itself

**Difficulty:** Senior

**Category:** Timers

**Question:**

Explain `setInterval` on Node 20. When is the next firing scheduled, can two callbacks from the same interval be on the stack at once, and what does a callback longer than the interval do to the following fire? Do not quote a measured drift.

**Context and Constraints:**

- Node 20 timers. The delay clamp matches `setTimeout`: values below 1 become 1, values above `2147483647` become 1 with a warning, non-integers truncate.
- The interval is ref'd unless `unref` is called. Lifetime rules beyond that pointer stay in NODE-035.
- The interesting case is a callback that runs longer than its own delay. Treat "longer" as a given constraint, without a number.

**Senior Engineer's Answer:**

`setInterval(callback, delay, ...args)` stores a repeating timer. The callback runs in the timers phase when the delay has elapsed, same as `setTimeout`. The delay is a minimum. A busy loop shifts the firing later. Node does not promise a cadence.

The next arm is scheduled when Node is about to call the callback, from the clock it samples then, using the same delay. It is not a second timer already running in parallel. The callback is one turn on the one stack. The same interval cannot be inside two JavaScript calls at once. There is no pool thread for the timer.

Node samples the re-arm time when it is about to call the callback, then inserts that same timer with that start and the same delay. The timers visit walks a `now` captured at the start of the visit. Against that `now`, the timer it just re-armed is not due, so this visit does not call it again. A callback that runs longer than the interval still cannot overlap itself, and it does not get a second fire in the same visit.

If that callback consumed the delay, the re-arm time plus the delay can already be in the past when the callback returns. The next timers phase then sees one due firing. There is still one timer, so missed wall time is not replayed as a burst of catch-up callbacks. The delay is a minimum measured from the re-arm timestamp. It does not promise a full extra delay after a slow callback: once the callback itself used up the interval, the following timers phase may run the next fire without waiting the interval out again. Do not quote a drift figure. The mechanism is one timer, re-armed once per fire.

`clearInterval` before a fire removes it. `refresh()` on the `Timeout` rewinds the start to now without allocating a new object, including after a fire if you still hold the handle. `unref()` keeps the callback eligible while something else ref'd is keeping the loop alive, and lets the process exit if the interval is the last vote. An unref'd interval that never fires because the process exited is NODE-035's point. The phase point is that `unref` does not move the callback to check.

`setInterval` does not use the browser nesting clamp. A delay of `0` is a 1 millisecond repeating timer, which will spin the timers phase as fast as that floor and your callback allow. That is rarely what a health check meant.

**Practical Implementation:**

```js
import { setInterval } from 'node:timers';

let running = false;
const timer = setInterval(() => {
  if (running) return;
  running = true;
  try {
    doWork();
  } finally {
    running = false;
  }
}, 1000);

function doWork() {}

// `1000` is the minimum gap the timer asks for, not a measured period.
// The `running` flag is useful when doWork schedules async work that
// might still be in flight on the next fire. The sync body itself
// cannot overlap.
```

If `doWork` is synchronous and longer than the delay, the flag stays true only during that call, which has already returned before the next fire. The flag matters for a `doWork` that returns before its promise finishes.

**Trade-offs and Alternatives:**

`setInterval` is the right tool for "try again after this delay," such as a metrics flush, when a skipped overlap is acceptable. A chain of `setTimeout` calls, each scheduled at the end of the previous callback, makes the gap start when the work finishes. That is easier to explain and avoids a due timer sitting in the same phase. `timeout.refresh()` is how you debounce without allocating. A queue with an explicit next-run is better when the work must not be skipped and must not run twice. `unref` is for auxiliary intervals that must not pin the process.

**Common Mistakes:**

- Assuming the interval waits out the delay inside the callback, on a timer thread.
- Assuming a slow callback produces overlapping runs, or a burst that replays every missed tick.
- Using `setInterval(fn, 0)` as a render loop and then wondering why the process is busy.
- Clearing the interval from a `nextTick` and assuming the callback that already started will stop. `clearInterval` prevents a future fire. It does not unwind the current one.

**Senior-Level Follow-up:**

The interviewer puts `await doWork()` in an async interval callback, and `doWork` returns a promise that settles on a later poll. Can a second fire start before that promise settles?

Answer: yes. The async callback returns at the `await`, which returns a promise the timer does not await. The timers phase can re-arm and fire again while `doWork` is still pending. The two bodies do not share a stack at the `await` points, and they can interleave at every suspension. The `running` flag, or `clearInterval` until the promise settles and then a fresh `setTimeout`, is how you keep a single flight in the air. `await` did not subscribe the interval to the promise.

### NODE-068 — timers/promises and scheduler.yield are the same phases plus a microtask

**Difficulty:** Senior

**Category:** Timers

**Question:**

`await setTimeout(0)` from `node:timers/promises`, and `await scheduler.yield()`, look like language features. Which phase fulfills each promise, and when does the code after the `await` run? What does an aborted signal do?

**Context and Constraints:**

- Node 20. `timers/promises` is stable. `scheduler.wait` and `scheduler.yield` are the experimental Scheduling API in that same module. Say so.
- `scheduler.yield()` is defined as `setImmediate` with no arguments. `scheduler.wait(delay)` is defined as `setTimeout(delay)`.
- Hypothetical order, from inside a poll callback, with nothing else queued.

**Senior Engineer's Answer:**

`timers/promises` does not add a thread and does not add a phase. `setTimeout(delay, value, options)` from that module schedules the same timers-phase callback as `setTimeout`. When the timer fires, that callback fulfills the promise. The `await` continuation is a microtask in the checkpoint after that timer callback. With delay `0`, the delay is still clamped to 1 millisecond. The value you pass is the fulfillment value, not a second delay.

`scheduler.yield()` schedules `setImmediate`. The promise fulfills in the check phase. The continuation is a microtask after that immediate callback, before the next phase. `scheduler.wait` is the timer form. Node 20 documents both scheduler functions as experimental. The phase facts are the same as the stable timer APIs they wrap.

An `AbortSignal` passed in `options` cancels the underlying timer or immediate. If the signal is already aborted, the function returns a rejected promise. If you abort later, the abort listener rejects the promise. `abort()` dispatches synchronously, and `reject` queues the reaction as a microtask, so the `await` throws on the continuation after `abort()` returns, not as a synchronous exception from `abort()` itself. The timer callback does not also fulfill. The rejection name is `AbortError`.

`options.ref: false` is `unref` on that handle. The promise will not keep the process alive. If the loop exits first, the continuation does not run.

From a poll callback, `await scheduler.yield()` suspends, the poll callback returns, later check fulfills the promise, and the continuation runs in that check callback's checkpoint. `await setTimeout(0)` suspends until a timers phase. On Node 20 that timers phase is after check, once the floor has elapsed. The continuation is again a microtask, not the timer callback itself.

**Practical Implementation:**

```js
import { setTimeout } from 'node:timers/promises';
import { scheduler } from 'node:timers/promises';

async function fromPoll() {
  console.log('poll');
  await scheduler.yield();
  console.log('after-yield');
  await setTimeout(0);
  console.log('after-timeout');
}

// Hypothetical, when fromPoll runs as the poll callback and nothing else is queued:
// poll
// after-yield      (microtask after the check-phase fulfillment)
// after-timeout    (microtask after a later timers-phase fulfillment)
```

`scheduler.yield` is experimental in Node 20. The order above is the phase order, not a latency.

**Trade-offs and Alternatives:**

`await setTimeout(n)` is the readable form of a delay when the function is already async. `await scheduler.yield()` is the readable form of one check-phase turn, with the caveat that it is experimental and that its position relative to poll depends on the phase that awaited it, exactly like `setImmediate`. A bare promise does not yield to poll. `AbortSignal` is the cancellation path. Clearing a `Timeout` you do not hold is harder with the promise API, which is why the signal exists.

**Common Mistakes:**

- Treating `await setTimeout(0)` as `await null`. One is a timers-phase fulfillment. The other is a microtask of the current turn.
- Forgetting the experimental label and shipping `scheduler.yield` as a stable public dependency without checking the Node version.
- Expecting `abort()` to throw into the caller. The await sees the rejection as a microtask.
- Assuming `ref: false` still pins the process the way a normal timer does.

**Senior-Level Follow-up:**

The interviewer aborts the signal during `after-yield`, before the timeout fires, and asks whether `after-timeout` runs.

Answer: the timeout promise rejects with `AbortError`. `after-timeout` does not run. A `try/catch` around that `await` runs as the rejection continuation, in the checkpoint after the abort turn. The timers phase does not also call a fulfillment. If nothing else is ref'd, a timer that was aborted no longer keeps the process alive.

### NODE-069 — A long synchronous callback stalls every later phase

**Difficulty:** Senior

**Category:** Starvation

**Question:**

A poll callback parses a large payload with a synchronous loop before it schedules anything. Timers are already due, and another socket is already readable. Why do none of those callbacks run during the parse? What do you change so they can?

**Context and Constraints:**

- One isolate, Node 20. The payload is already in memory. The parse is JavaScript.
- "Large" is a given constraint. Do not invent a byte size or a millisecond profile.
- The pool is not holding the parse.

**Senior Engineer's Answer:**

A phase callback runs until it returns. Poll does not preempt it for a due timer, for check, or for another socket that the kernel has already marked readable. Those callbacks are queued behind the current stack. The timers phase of this lap has not started, because the lap is still inside poll. The other socket's JavaScript waits for a later poll callback. Due-ness and readability were conditions for enqueueing. They are not a second stack.

This is the same run-to-completion rule as a long timers callback or a long immediate. The phase name does not add a preemption point. `await` in the middle would, because it returns. A tight `for` loop does not await. `process.nextTick` scheduled after the loop runs only when the loop finishes. It does not slice the loop.

The change that lets other callbacks run is to return. Split the parse into chunks and schedule the next chunk with `setImmediate`, accepting the phase placement from NODE-064. If you are already in poll, that immediate runs in check, before the next fresh poll, so it is a partial yield: the current poll queue can finish, and a brand-new readability event waits one more lap. If the parse is the dominant cost, a Worker gives it another isolate. That is a different design, not a phase trick. `fs` and the pool do not help. The bytes are already on the heap.

Clearing a timer or destroying a socket from inside the parse also waits until the parse returns before any of those effects run as callbacks. The `destroy` call returns. The `'close'` turn is later.

**Practical Implementation:**

```js
function parseChunked(buffer, onDone) {
  let offset = 0;
  const step = 64 * 1024;

  function next() {
    const end = Math.min(offset + step, buffer.length);
    decode(buffer.subarray(offset, end));
    offset = end;
    if (offset < buffer.length) setImmediate(next);
    else onDone();
  }

  next();
}

function decode(_slice) {}
```

`64 * 1024` is a chunk bound you picked so `decode` returns. It is not a libuv constant. `decode` must stay synchronous-and-short, or the split is cosmetic.

**Trade-offs and Alternatives:**

Chunking keeps fairness on one isolate and adds checkpoint overhead between chunks. A Worker removes the cost from this loop and adds cloning or transfer. Raising the pool size does nothing for in-memory JavaScript. `setTimeout(next, 0)` also returns to the host, with the 1 millisecond floor and the timers phase. Use it when you want that floor. Do not use `nextTick` as the chunk scheduler.

**Common Mistakes:**

- Describing the event loop as preemptive multithreading.
- Expecting a due `setInterval` to fire in the middle of `JSON.parse`.
- Splitting with `process.nextTick` and believing poll ran between chunks.
- Moving the parse to `readFile` as if the pool parsed JSON. The pool would read bytes. `JSON.parse` would still be the poll callback.

**Senior-Level Follow-up:**

The interviewer says the other socket's `'data'` event is how a health check arrives, and the health check times out during the parse. Is the timeout a poll bug?

Answer: the health check timeout is a timer, and the health check bytes are poll. Both wait until the parse returns and the lap moves. The loop is behaving correctly. The callback is too long. Fix the callback or move the work. Staring at phase order will not insert a preemption point that JavaScript does not have.

### NODE-070 — A promise chain that never empties is starvation too

**Difficulty:** Senior

**Category:** Starvation

**Question:**

A request handler keeps scheduling the next step with `Promise.resolve().then(step)` and never stops. Timers and sockets stall. How is this different from a synchronous loop, and why is `await Promise.resolve()` in a `while` loop the same failure?

**Context and Constraints:**

- Node 20 checkpoint rules. The handler started from a poll callback and has already returned at the first `then`.
- Hypothetical. Do not assign a duration to the stall.
- The repair must let poll run. Name it.

**Senior Engineer's Answer:**

A synchronous loop never returns, so the checkpoint never starts. A promise pump returns, and then the checkpoint never finishes. Node runs promise jobs until that queue is empty, including jobs queued by jobs. `step` queues another `step`, so the queue stays non-empty. The next poll callback, the next check, and the next timers phase do not start. The symptom matches a `nextTick` flood. The queue is the microtask queue.

`async function` with `while (work) { await Promise.resolve(); doPiece(); }` is the same pump written as syntax. Each `await` of an already settled promise queues the continuation as a microtask. If the loop does not stop, the checkpoint does not end. It looks like cooperation. It postpones I/O the same way. It does not block the thread inside one frame, and it does not reach poll. Those are different sentences. Both matter.

The repair is a schedule that lives outside the checkpoint. `setImmediate(step)` lets the lap reach check and, on a later lap, poll. A timer is appropriate when the gap should include the delay floor. Stopping the loop because the queue of work is empty is the other half. An unbounded microtask pump of a finite array still finishes and then the loop continues. The bug is the pump that does not finish, or that is so long it might as well not.

`nextTick` inside `step` would be worse, not better. It would also hold off other promise jobs. Replacing `nextTick` with `then` removes the Legacy API and keeps the starvation if the chain is unbounded.

**Practical Implementation:**

```js
function pump(queue) {
  const item = queue.shift();
  if (item === undefined) return;
  handle(item);
  setImmediate(() => pump(queue));
}

function handle(_item) {}
```

Hypothetical contrast: the `then` version that always requeues never prints a log from a socket `'data'` handler scheduled after the pump starts. The `setImmediate` version does, on a later poll, subject to the phase you scheduled from.

**Trade-offs and Alternatives:**

Microtasks are the right queue for a short chain that must finish before I/O observes an intermediate state. They are the wrong queue for a job runner. A Worker is the right tool when `handle` is CPU-bound for longer than you are willing to share the isolate. Chunking with `setImmediate` is the right tool when you must stay on this heap and still serve sockets. Measure the chunk only when you have a real workload. The phase rule does not give you the chunk size.

**Common Mistakes:**

- Calling `await Promise.resolve()` a yield to the event loop. It yields to the microtask queue.
- Distinguishing it from `nextTick` starvation and then ignoring it. The user-visible stall is the same.
- Adding a `setTimeout` of `0` inside a chain that also requeues a promise every iteration. The timeout never gets a turn if the promise queue never empties.
- Catching the symptom with a larger thread pool.

**Senior-Level Follow-up:**

The interviewer asks whether a single `await Promise.resolve()` in an otherwise synchronous handler delays a timer that is already due.

Answer: it delays that timer by one checkpoint, not by a lap. The handler returns, the microtask runs, and then the lap can reach the timers phase. One settled await is cheap and often exactly what you want so a caller can attach a `.catch`. A loop of them is the starvation case. The difference is whether the queue becomes empty.

### NODE-071 — Predict the log from one poll callback

**Difficulty:** Advanced

**Category:** Prediction

**Question:**

`onRequest` runs as the poll callback for a connection. Predict the log. Show the checkpoint and the phases you used. Refuse any order the rules do not fix.

**Context and Constraints:**

- Node 20. `onRequest` is the poll callback. No other poll callback is already queued. No file or DNS call is in this snippet.
- The timeout uses delay `0` and therefore the 1 millisecond floor. You are not asked how many milliseconds separate the lines.
- Hypothetical. This is not top-level ESM evaluation.

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

**Senior Engineer's Answer:**

The poll callback runs to completion first. `sync` and `sync-end` print. Everything else is only queued. `Promise.resolve().then` does not run the reaction now.

The checkpoint drains `nextTick` before microtasks. `tick` runs and queues `promise-from-tick`. Microtasks then run in queue order. `promise` and `micro` were queued during the synchronous body, in that order. `promise-from-tick` was queued during `tick`, before the microtask drain started, so it follows them. `promise` queues `tick-from-promise` as a `nextTick`. That callback waits until the microtask queue empties, then the drain loop runs it. The checkpoint is then empty.

Check is next. `immediate` prints. Close callbacks, if any were scheduled, would be next. This snippet has none. The timers phase follows. `timeout` prints there once the 1 millisecond minimum has elapsed. The phase order puts it after `immediate`. The floor is why it is a timers callback at all. It is not a measured gap.

Hypothetical order:

```text
sync
sync-end
tick
promise
micro
promise-from-tick
tick-from-promise
immediate
timeout
```

Orders the rules do not fix, and that this snippet does not ask for: the top-level `setTimeout` versus `setImmediate` race, anything about another connection, and any claim that `timeout` shares a lap with `immediate` rather than a later timers phase if the floor has not elapsed yet. Even in that case `timeout` still follows `immediate`, because check runs first.

**Practical Implementation:**

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

// Hypothetical:
// sync, sync-end, tick, promise, micro, promise-from-tick,
// tick-from-promise, immediate, timeout
```

**Trade-offs and Alternatives:**

This order is a reasoning tool. Production handlers should not need a reader to simulate eight queues to know which side effect happens first. If two effects must be ordered, put them in one function, or return one promise. Use `setImmediate` only when you mean check. Use `nextTick` only when you mean the checkpoint and you accept the starvation risk.

**Common Mistakes:**

- Running `promise` before `tick`.
- Running `tick-from-promise` before `promise-from-tick`.
- Running `timeout` before `immediate` because timers are "usually first" in an old diagram. This callback is poll, on Node 20.
- Inserting a file-read line into the order without a completion constraint.

**Senior-Level Follow-up:**

The interviewer adds `readFile(url, () => console.log('file'))` as the first line of `onRequest` and asks where `file` goes.

Answer: you refuse a fixed slot against `immediate` and `timeout`. The read uses the pool. `file` is a later poll callback, after the checkpoint of whatever poll turn delivers it. It cannot print before `sync-end`, `tick`, `promise`, `micro`, `promise-from-tick`, or `tick-from-promise`, because those finish before this poll callback returns to the loop. It can print before `immediate` only if the completion is already queued and this same poll visit runs it before check, which the question does not grant. It can print after `timeout` if the pool finishes on a later lap. Say that. Do not pick one of those with a made-up duration.

### NODE-072 — A throw in a phase callback is that turn's exception

**Difficulty:** Senior

**Category:** Errors

**Question:**

A timer callback throws. The `setTimeout` call itself sits in a `try/catch`. A `nextTick` and a promise reaction were queued before the throw. What catches the throw, what happens to those queued callbacks, and how is a rejection different?

**Context and Constraints:**

- Node 20. The process-level `uncaughtException` and `unhandledRejection` policy is NODE-028. Refer to it. Do not redraw that matrix.
- The timer callback is the turn that throws. Hypothetical structure, no fake log of a crash dump.

**Senior Engineer's Answer:**

`setTimeout` only registers a timer. The `try/catch` around that call catches synchronous failures of the registration, such as a bad argument type. It does not catch the callback. The callback runs in a later timers phase, on a new turn. A throw leaves that turn. The `catch` that can see it is inside the callback, or the process `uncaughtException` handler. The default policy from NODE-028 prints the error and terminates. A handler that keeps the process alive is a deliberate override, with the caveats in that question.

Node drains the checkpoint when the callback returns to the host. A throw is not a normal return. Do not tell the interviewer that the `nextTick` queued earlier in that callback still ran. The throw unwinds the callback first. Whether any further queued work runs depends on the process staying up and on where the throw happened inside Node's drain. That is not a guarantee to design on. If the work must happen, do it before the risky call, or in a `finally` inside the callback.

A promise rejection is a different channel. `Promise.reject` or a rejected `await` does not throw into the timer callback unless the timer callback awaited it. The reaction runs in the checkpoint. If nobody handles it, Node reports `unhandledRejection`, again under NODE-028. `try/catch` around `setTimeout` does not handle it. `.catch`, or `try/catch` around an `await` in an async function that is actually awaiting that promise, does.

A throw inside a `nextTick` callback is the same shape as a throw inside a timer: it is that callback's turn, not the turn that called `process.nextTick`. A throw inside a poll callback aborts the rest of that callback and skips its normal checkpoint completion. Other sockets are not "protected" by a separate thread. They just have not run yet. If the process exits, they do not run.

**Practical Implementation:**

```js
try {
  setTimeout(() => {
    throw new Error('timer turn');
  }, 0);
} catch {
  // Does not run for 'timer turn'. The registration succeeded.
}

setTimeout(() => {
  try {
    throw new Error('caught inside the turn');
  } catch (err) {
    console.log(err.message);
  }
  process.nextTick(() => console.log('tick still queued'));
}, 0);

// Hypothetical, if this second timer is the one that runs:
// caught inside the turn
// tick still queued
```

The first timer is the case that becomes `uncaughtException`. The second returns normally, so its checkpoint runs.

**Trade-offs and Alternatives:**

Async code wants one error channel per function. A timer that throws and a timer that rejects will not meet in one `catch`. Wrap the body, or make the timer call an async function and attach `.catch` to the returned promise. `process.on('uncaughtException')` is the last resort NODE-028 describes, not the architecture of a handler.

**Common Mistakes:**

- Believing the `try/catch` around `setTimeout` covers the callback.
- Assuming a throw in one socket's `'data'` handler is isolated to that socket by the runtime. Isolation is "it is a separate callback," not "the process is fine."
- Treating a rejection as a throw that `uncaughtException` will see. The event is `unhandledRejection` unless something rethrows.
- Using an empty `catch` on `uncaughtException` to keep a half-broken process up. That policy belongs to NODE-028, and it is usually the wrong one.

**Senior-Level Follow-up:**

The interviewer asks whether a `finally` on an async poll callback runs before `setImmediate` callbacks that were scheduled before the `await`.

Answer: `finally` on the async function runs as part of settling that function's promise, which is a microtask continuation. If the `setImmediate` was scheduled before the `await`, it is already on the check queue. The continuation, including `finally`, runs in the checkpoint of the turn that resumes the async function, which is before check if that resumption is the poll callback's own checkpoint. So `finally` runs before that already-queued immediate. If the immediate was scheduled from a different, earlier callback in this poll visit, that immediate is also check, and this callback's `finally` still runs at this callback's checkpoint, which is before the phase ends. The precise interleaving with a different poll callback's immediate is "checkpoint of each callback before check completes." It is not "finally is a phase."

### NODE-073 — beforeExit is the empty-loop check, not a phase you schedule

**Difficulty:** Senior

**Category:** Process lifetime

**Question:**

Where does `beforeExit` sit relative to poll, check, and timers? What can a listener schedule that causes another lap, and what does the `exit` event refuse to wait for?

**Context and Constraints:**

- Node 20. `process.exit` and the status code are NODE-037. Refer to them. Do not repeat the flush behavior of stdout.
- Ref'd handles are NODE-035. You may use the rule. Do not re-prove it from scratch.
- The listener in the snippet schedules either a timer or only synchronous work. Hypothetical. No delay measurement.

**Senior Engineer's Answer:**

`beforeExit` is not a phase. libuv does not have a box for it. Node emits it when the loop has no more ref'd work: no ref'd timers or immediates, no ref'd sockets, no in-flight ref'd requests. The lap is not "in `beforeExit`" between check and timers. The loop is empty, and Node is about to finish.

A listener may schedule new ref'd work. A ref'd `setTimeout`, a ref'd `setImmediate`, or a new I/O request starts another lap, and that work runs in its normal phase. When that work is gone, `beforeExit` can run again. A listener that only logs, or only mutates memory, does not keep the process up. The checkpoint after the listener still drains `nextTick` and promise jobs. A `nextTick` that schedules a ref'd timer keeps the process alive because of the timer, not because `nextTick` is a phase. A `nextTick` that only queues another `nextTick` is the starvation case, which is a bad way to "stay alive."

`beforeExit` is not emitted for `process.exit()` and not for an uncaught exception. Those paths are NODE-037 and NODE-028.

The `exit` event runs after the decision to leave. Listeners are synchronous. A `setTimeout` or `setImmediate` from an `exit` listener does not get a lap. A promise reaction queued there does not get a later checkpoint you can rely on to do I/O. Cleanup on `exit` is synchronous or it does not happen.

**Practical Implementation:**

```js
import { setTimeout } from 'node:timers';

let extra = false;

process.on('beforeExit', (code) => {
  console.log('beforeExit', code);
  if (extra) return;
  extra = true;
  setTimeout(() => console.log('one more timers phase'), 10);
});

process.on('exit', () => {
  setImmediate(() => console.log('does not run'));
});

// Hypothetical, with nothing else ref'd:
// beforeExit <code>
// one more timers phase
// beforeExit <code>
// then exit, and the immediate never prints
```

`10` is the delay the snippet asked the timer to use. It is not a measurement of `beforeExit`.

**Trade-offs and Alternatives:**

`beforeExit` is for "the loop is empty, schedule one last piece of work," such as a final unref'd flush that you then wait for by scheduling something ref'd. It is a poor hook for resource cleanup, because it does not run on `process.exit` or on a crash. Explicit shutdown, `server.close`, and draining sockets are the lifecycle. `exit` is for last-millisecond synchronous state, such as a status code, not for `fs.writeFile`.

**Common Mistakes:**

- Drawing `beforeExit` between close and timers.
- Scheduling `setImmediate` inside `exit` and waiting for it in a test.
- Using a recursive `nextTick` in `beforeExit` to keep the process alive. That never lets the loop poll, and it never reaches a clean exit.
- Expecting `beforeExit` after `process.exit(1)`.

**Senior-Level Follow-up:**

The interviewer unrefs the timer scheduled from `beforeExit` and asks whether `one more timers phase` prints.

Answer: an unref'd timer does not keep the loop alive. If it was the only work the listener added, the process can exit without firing it. `beforeExit` does not special-case the timer into a phase that ignores `unref`. To get the callback, leave the timer ref'd, or keep some other ref'd handle until the work finishes.

### NODE-074 — Ordering guarantees you can promise, and the ones you cannot

**Difficulty:** Senior

**Category:** API design

**Question:**

You are publishing a function that takes a callback and sometimes fails synchronously on a bad argument. Which queue do you use so callers can attach listeners and so the callback is not synchronous? Which guarantees about two sockets, or about `setTimeout(fn, 0)` versus `setImmediate`, do you refuse to write into the docs?

**Context and Constraints:**

- Node 20. The `listening` event and the "always asynchronous" callback are the guide's examples. Use them as the pattern, not as a second copy of NODE-021's definition.
- The answer must mention starvation as the cost of the tool you pick.
- No invented SLA numbers.

**Senior Engineer's Answer:**

If the contract is "this callback runs after I return, and before the loop continues, so the caller can attach listeners or observe the error before any I/O," the queue is `process.nextTick`. Node does this for `'listening'` when `listen` binds immediately. A `setImmediate` would let a lap reach poll first, and a connection could arrive before `'listening'`. A synchronous callback is worse: the caller has not assigned `bar`, or has not attached the listener, when you already called them. `nextTick` is the tool that matches that contract. The cost is the one in NODE-057. A callback that queues another `nextTick` as its normal pump starves poll. Document `nextTick` for the error and the one event. Do not document it as the job queue.

If the contract is "after I/O callbacks have had a chance," document `setImmediate` and the check phase. If the contract is "after at least N milliseconds," document `setTimeout` with that N. Do not document `setTimeout(fn, 0)` as "next." On Node 20 it is a timers callback with a 1 millisecond floor, and at the top of a main module its order against `setImmediate` is not a guarantee.

Refuse these sentences in an API doc:

- "`setTimeout(fn, 0)` runs before `setImmediate`." False as a general rule.
- "Two sockets are delivered in a fair order you can sort on." Poll runs ready callbacks, with a checkpoint between them, until the queue or the internal bound stops the visit. There is no application-level fairness key.
- "A promise returned from the handler runs before any other connection." The continuation runs before the next phase only if it was queued on this callback's checkpoint and the chain finishes. Another connection already in the poll queue runs as another callback, with its own checkpoint, and it does not wait for your later awaits.
- "Async crypto runs next to the socket on a pool thread." The pool may run the native work. The JavaScript completion is poll, on the same isolate as the socket, and only one of those callbacks has the stack.

What you can promise: your function returns before the callback; a bad argument calls the callback once, asynchronously, with the error; you do not call the callback twice; you do not throw after returning. Implement the bad-argument path with `process.nextTick(callback, err)` so a `try/catch` around the call does not observe a different shape than a later failure. Callers write one error path.

**Practical Implementation:**

```js
import { nextTick } from 'node:process';

function loadConfig(path, callback) {
  if (typeof path !== 'string') {
    const err = new TypeError('path must be a string');
    nextTick(callback, err);
    return;
  }
  // Real I/O would complete in poll and then call `callback` once.
}

let seen;
loadConfig(null, (err) => {
  console.log(seen, err instanceof TypeError);
});
seen = true;

// Hypothetical: true true
// The callback did not run before `seen = true`.
```

**Trade-offs and Alternatives:**

A promise API makes the same contract with a rejection, and the caller attaches `.catch` before the checkpoint if you reject from a later turn. Rejecting synchronously from the executor is the sync-callback bug in promise form, because the executor runs now. `queueMicrotask` is the portable "before the next phase" queue when you do not need `nextTick`'s place in front of other microtasks. For a public Node callback API that must beat I/O, `nextTick` is still the documented match, Legacy status included. Tell callers not to re-enter it recursively.

**Common Mistakes:**

- Calling the error callback synchronously for the easy branch and asynchronously for the I/O branch.
- Documenting timer order you do not control.
- Using `setImmediate` for `'listening'` and then debugging a connection that arrived first.
- Promising fairness across sockets because "the event loop is fair." It is ordered. That is a different word.

**Senior-Level Follow-up:**

The interviewer asks whether `queueMicrotask(callback, err)` would satisfy the "before any I/O" part of this contract.

Answer: it satisfies "before the next phase," so no poll callback starts in the middle of it, on a normal turn. It does not satisfy "before other microtasks of this turn." A promise reaction queued by the caller before your function returns can run before that `queueMicrotask` if it was queued first, or after it if it was queued later. `nextTick` runs before those reactions on a phase callback. If your caller must attach a `.then` after the call and still see your error first, `queueMicrotask` is the wrong queue. If the API is "the error is a promise rejection," return a rejected promise from a later job and stop mixing in a callback.

### NODE-075 — Read the handler and name the turn each line belongs to

**Difficulty:** Advanced

**Category:** Prediction

**Question:**

This is the poll callback that handled one request. Name the turn for each log, predict the order the rules fix, and say what you will not order. Then answer the claim that `await cache()` ran the handler on a worker because the cache function is async.

**Context and Constraints:**

- Node 20. The poll turn's JavaScript is `onRequest`. The caller does not keep running synchronous work after that call returns at the `await`.
- `cache()` returns an already fulfilled promise. That is a constraint. It does not read the disk.
- `readFile` is included so you can refuse a slot. No duration is given for the read.
- Hypothetical.

```js
import { readFile } from 'node:fs';
import { nextTick } from 'node:process';

function cache() {
  return Promise.resolve('hit');
}

async function onRequest(res) {
  console.log('handler');
  nextTick(() => console.log('tick'));
  const value = await cache();
  console.log(value);
  setImmediate(() => console.log('immediate'));
  setTimeout(() => console.log('timeout'), 0);
  readFile(new URL(import.meta.url), () => console.log('file'));
  res.end('ok');
  console.log('handler-end');
}
```

**Senior Engineer's Answer:**

`onRequest` starts on the poll turn. `handler` prints there. `cache()` returns a fulfilled promise, and `await` schedules the rest of the function as a microtask. The poll callback returns at that `await`. It does not reach `setImmediate`, `setTimeout`, `readFile`, `res.end`, or `handler-end` yet.

The checkpoint of that poll turn drains `tick` first, then the continuation. `hit` prints as that microtask. The lines after `await` are still the checkpoint, not a new phase and not a pool thread. `immediate` is queued for check. `timeout` is queued for a timers phase with a 1 millisecond floor. `readFile` is handed to the pool. `res.end` queues the write and returns. `handler-end` prints before the continuation returns.

Then the lap can leave this callback. Check runs `immediate`. A later timers phase runs `timeout`, and the I/O pattern puts that timeout after the immediate. `file` is a poll callback whenever the pool completion is delivered. The rules do not place it before or after `immediate` or `timeout`. `res.end` does not print a log. The client's receipt is not a JavaScript turn in this process.

`await cache()` did not start an operating-system thread and did not move the handler onto a Worker. `cache` produced an already settled promise. The continuation is a microtask on the same isolate. The only pool work in the snippet is `readFile`, and its callback is still poll, later, on that same isolate.

Hypothetical order the rules fix:

```text
handler
tick
hit
handler-end
immediate
timeout
```

`file` is absent from that list on purpose.

**Practical Implementation:**

```js
import { readFile } from 'node:fs';
import { nextTick } from 'node:process';

function cache() {
  return Promise.resolve('hit');
}

async function onRequest(res) {
  console.log('handler');
  nextTick(() => console.log('tick'));
  const value = await cache();
  console.log(value);
  setImmediate(() => console.log('immediate'));
  setTimeout(() => console.log('timeout'), 0);
  readFile(new URL(import.meta.url), () => console.log('file'));
  res.end('ok');
  console.log('handler-end');
}

// Hypothetical, rules that apply:
// handler, tick, hit, handler-end, immediate, timeout
// 'file' is a later poll callback and is not given a fixed slot
```

**Trade-offs and Alternatives:**

The useful structure is the one a reader can order without a diagram: synchronous prefix, one await of a cache, then the response. `setImmediate` and `setTimeout(fn, 0)` in the same handler are a smell unless the phase is the feature. `readFile` of a static file inside the request, uncached, spends a pool thread per request and then a poll callback. A cache that is actually in memory, returned as a value rather than a fulfilled promise, removes the extra microtask. A cache that hits the disk should be explicit, and the log order should not be part of the product contract.

**Common Mistakes:**

- Printing `handler-end` before `hit` because the source lists it later and "async runs in the background." The lines after `await` do not start until the continuation.
- Printing `tick` after `hit`.
- Inserting `file` between `immediate` and `timeout` as if a pool completion had a known lap.
- Hearing `async function` and answering "worker thread."

**Senior-Level Follow-up:**

The interviewer changes `cache` so it sometimes `await`s `readFile` of a real file, and asks which prefix of the log survives.

Answer: `handler` still prints on the poll turn, and `tick` still prints in that turn's checkpoint before the continuation, but only if `cache`'s promise was already pending when `onRequest` awaited it and `cache` itself queued no earlier log. If `cache` reads a file, `hit` moves to the checkpoint of the poll callback that fulfills that read. `handler-end`, `immediate`, and `timeout` move with it, because they are after the `await`. `tick` does not move. It was queued before the `await`. The two `readFile` completions are both poll callbacks, and their order against each other is not fixed. The claim that does not survive is the six-line order. The claim that survives is the placement rule: code before the first real suspension is this poll turn, `nextTick` is its checkpoint, and code after `await` is the microtask that follows the settlement.

### NODE-076 — queueMicrotask and Promise.then share a queue and split on errors

**Difficulty:** Senior

**Category:** Microtasks

**Question:**

`queueMicrotask(fn)` and `promise.then(fn)` both look like "run this after I return." On Node 20, which queue does each one use, when does the job actually get queued, and what happens if the callback throws? This is not the ES module evaluation question.

**Context and Constraints:**

- The call site is a poll, check, or timers callback. NODE-021 owns the top of an ES module.
- `queueMicrotask` and promise reactions are one V8 queue. Say where they differ anyway.
- A throw's process event is NODE-028. Name the channel. Do not redraw the listener matrix.
- Hypothetical. No measured delay.

**Senior Engineer's Answer:**

Both APIs enqueue a V8 microtask. After a phase callback returns, Node drains `process.nextTick`, then that microtask queue, and repeats while either queue is non-empty. Relative order between a `queueMicrotask` callback and a promise reaction is the order the jobs were queued. There is no third priority between them.

The timing of the enqueue is the first split. `queueMicrotask(fn)` appends `fn` before it returns. `p.then(fn)` appends `fn` only when `p` is fulfilled. On an already fulfilled promise, `then` appends the reaction before `then` returns, still as a microtask, so the current stack finishes first. On a pending promise, `then` only stores the reaction. Nothing enters the microtask queue until `resolve` runs, and `resolve` itself only enqueues. It does not call `fn`.

Chaining is the second split. `p.then(a).then(b)` attaches `b` to the promise `then` returns. `b` is not in the queue beside `a`. If `a` returns a plain value, the job for `b` is appended when `a` finishes. Microtasks already sitting in the queue run before `b`. `queueMicrotask` has no chained promise. A second `queueMicrotask` inside the first is just another job appended at that moment.

The callback shape is the third split. A reaction receives the fulfillment value. `queueMicrotask` calls its function with no arguments. `then` returns a promise. `queueMicrotask` returns `undefined`.

The error channel is the fourth split. A throw inside a reaction rejects the promise that `then` returned. With a later `.catch`, or a second argument to `then`, that rejection is a normal settlement. With nobody attached before the turn ends, Node reports `unhandledRejection` under NODE-028. The throw does not leave the reaction as an exception on the phase callback. A throw inside `queueMicrotask` is not a promise rejection. Node's own documentation reports it as an uncaught exception. There is no promise to attach `.catch` to. `try/catch` around the `queueMicrotask` call does not see it, because the call only enqueued the function.

The promise executor is still synchronous. `new Promise(fn)` runs `fn` on this stack. That is neither `then` nor `queueMicrotask`.

**Practical Implementation:**

```js
function onTurn() {
  const out = [];
  Promise.resolve('value').then((v) => out.push(v));
  queueMicrotask(() => out.push('micro'));
  setImmediate(() => console.log(out.join(',')));
}

// Hypothetical, when onTurn is a phase callback:
// value,micro
// Same queue, registration order. The immediate prints after the checkpoint.
```

A pending promise does not join that print until something fulfills it. The fulfillment's reaction is a later job, still ahead of the next phase once it has been queued.

**Trade-offs and Alternatives:**

`queueMicrotask` is the tool for "run this function after this stack, before the next phase," with no value and no rejection channel. `then` is the tool when there is a value or an error to propagate. New code that only means "after I return" follows NODE-021 and prefers `queueMicrotask` or a promise over `process.nextTick`. Neither one yields to poll or check. A callback that must throw into `uncaughtException` on purpose is a poor fit for `then`, because `then` swallows the throw into a rejection. A callback that must be catchable with `.catch` is a poor fit for `queueMicrotask`.

**Common Mistakes:**

- Treating `queueMicrotask` as a priority between `nextTick` and promises.
- Expecting `pending.then(fn)` to run `fn` in this checkpoint when `pending` is still pending.
- Wrapping `queueMicrotask` in `try/catch` and believing the callback's throw was handled.
- Expecting a throw in `.then` to emit `uncaughtException` directly. The derived promise rejects.

**Senior-Level Follow-up:**

The interviewer writes `p.then(a).then(b)` and a `queueMicrotask` between the two `then` calls, and asks whether `b` can run before that microtask.

Answer: `b` is not queued by the second `then` call. It is queued when `a` settles the intermediate promise. The `queueMicrotask` was appended during the synchronous turn, so it is already in the queue before `a` runs, and `a` appends `b` behind it. `b` runs after that microtask, still inside the same checkpoint, still before the next phase. The full interleave is the next prediction that uses this rule.

### NODE-077 — setInterval drift is lateness the next arm does not pay back

**Difficulty:** Senior

**Category:** Timers

**Question:**

A metrics interval is created with `setInterval(fn, 1000)`. Under load, the fires move later than `start + n * 1000`. What does Node 20 do with that lateness, why is there no burst of catch-up callbacks, and which schedule avoids accumulating it? Do not quote a measured drift.

**Context and Constraints:**

- Node 20 timers. The delay is a minimum. Values below 1 become 1. That clamp is NODE-053.
- Overlap of one interval with itself is NODE-067. Use the re-arm fact. Do not rebuild the overlap proof.
- `1000` is the delay argument in the question, not a measurement of the gap you observed.
- The loop clock is monotonic. Wall-clock steps are NODE-040. Say what that means for the timer.

**Senior Engineer's Answer:**

`setInterval` arms one timer. The delay is the minimum time until the next fire, measured from the re-arm, not a contract that callback `n` runs at `start + n * delay`. NODE-067's re-arm uses the loop time sampled for that timers visit, then the same delay. libuv's loop time is monotonic. An NTP step of the wall clock does not by itself make this timer due, and it does not by itself postpone it. `Date.now()` can jump. The timer heap does not follow that jump. Durations in application code still belong on the monotonic clocks in NODE-040. The interval's own deadline is the loop's clock.

Lateness sticks because the next deadline is computed from the fire's loop time, not from the original series. If poll callbacks, a long JavaScript turn, or a slow previous timer push this visit later than the deadline, the callback runs late, and the following deadline is that later sample plus the delay. The missed slot is not retained as a debt. A self-correcting scheduler would compute `start + n * delay` and, if that instant is already past, fire once and aim at the next future slot. Node does not do that. One arm produces one callback. A visit that arrives after three nominal periods still runs the callback once. That is why a dashboard does not see a burst after a stall, and why the average gap grows past the delay while the process is busy.

The other slip is inside the callback. The re-arm is already in the heap before the callback body runs, against the visit's `now`, so this visit does not call it again. If the body itself runs longer than the delay, a later timers phase can find the re-armed timer already due. The gap after a slow body can be shorter than the delay. The gap after a busy loop, with a short body, tends to keep the lateness. Both are the same rule: one timer, a minimum delay from the re-arm sample, no replay.

A delay of `0` is a 1 millisecond repeating timer. On a quiet process it still wakes the timers phase as fast as that floor and the rest of the lap allow. That is a hot loop, not a precise 1 millisecond cadence.

**Practical Implementation:**

```js
import { setTimeout, clearTimeout } from 'node:timers';

let timer;
let expected = 0;

function start(intervalMs) {
  expected = 0;
  arm(intervalMs);
}

function arm(intervalMs) {
  const monotonicNow = Number(process.hrtime.bigint() / 1_000_000n);
  if (expected === 0) expected = monotonicNow;
  expected += intervalMs;
  const wait = Math.max(0, expected - monotonicNow);
  timer = setTimeout(() => {
    sample();
    arm(intervalMs);
  }, wait);
}

function sample() {}

function stop() {
  clearTimeout(timer);
}
```

The snippet's `wait` is the self-correcting shape: the next target stays on a fixed series, and a late fire does not push every future target by the same amount. `Math.max(0, wait)` still hits Node's floor, so a computed wait below 1 becomes 1. Correcting the schedule does not create a same-visit burst, and it does not make the fire time exact. `expected` in milliseconds from `hrtime` is an illustration of the anchor. It is not a claim about clock resolution.

**Trade-offs and Alternatives:**

`setInterval` is the right tool when a late fire should move the next one, and a missed slot should be skipped. A `setTimeout` chained at the end of the work measures the delay from the end of the callback, so the period becomes work plus delay. That is the right tool when the gap after the work is the requirement. The fixed-series arm above is the right tool when the product wants fires near a cadence and can tolerate a short wait after a late sample. `timeout.refresh()` rewinds one existing timer to "delay from now." It does not rebuild a fixed series. The async iterator from `timers/promises` `setInterval` is still this timers-phase timer under the iterator. It does not add a compensation policy.

**Common Mistakes:**

- Quoting a drift in milliseconds from one machine.
- Expecting three missed periods to produce three callbacks.
- Anchoring the schedule to `Date.now()` and treating an NTP step as timer drift.
- Describing `setInterval(fn, 0)` as idle-time work. It is a 1 millisecond timer.

**Senior-Level Follow-up:**

The interviewer clears the interval at the first line of the callback and asks whether a re-armed fire can still happen.

Answer: NODE-067's re-arm has already inserted the next deadline before the body runs. `clearInterval` on that same `Timeout` removes the pending arm. The body that is running finishes. No later fire comes from that timer. `clearInterval` does not rewind the stack, and it does not emit a catch-up callback for the time already missed.

### NODE-078 — unref and ref are a lifetime vote, and the callback stays in its phase

**Difficulty:** Senior

**Category:** Timers

**Question:**

What do `timeout.unref()`, `timeout.ref()`, and `timeout.hasRef()` change on Node 20? A teammate says `unref` moves the callback to check, or cancels it. A second teammate says an unref'd interval never fires even when the server is still listening.

**Context and Constraints:**

- Node 20, main thread. What keeps a process alive at all is NODE-035. Use that rule. The new part is the phase and the poll wait.
- `beforeExit` and `exit` are NODE-073. Refer to them. Do not redraw that diagram.
- No measured delay. The timer in the snippet uses a delay only as an argument.

**Senior Engineer's Answer:**

`setTimeout`, `setInterval`, and `setImmediate` return ref'd handles. A ref'd handle is a vote to keep the loop alive. `unref()` removes that vote. `ref()` puts it back. `hasRef()` reports the current vote. Calling `unref()` twice, or `ref()` twice, does not stack. The second call is a no-op.

The vote is not the schedule. An unref'd timeout stays a timers-phase callback. An unref'd immediate stays a check-phase callback. `unref` does not call `clearTimeout` or `clearImmediate`. The handle stays armed until it fires, until it is cleared, or until the process exits without it.

If some other ref'd work keeps the loop alive, the unref'd callback still runs when its phase reaches it. A listening server is enough. While that server is ref'd, an unref'd interval still occupies the timer heap, and the poll wait can still end at that interval's deadline so the lap can reach the timers phase. `unref` removed the keep-alive vote. It did not remove the deadline from a loop that is alive for another reason.

If the unref'd timer is the only armed work, the loop is allowed to finish. Node does not sleep until that deadline. `beforeExit` can run, and if nothing becomes ref'd, the process exits and the callback never runs. That is NODE-035's trap, placed on the phase model: there is no timers phase once the loop has stopped. `exit` listeners run too late to `ref()` a timer back into a lap. NODE-073 is that boundary.

`options.ref: false` on `timers/promises` is this same vote on the handle under the promise. `Immediate` objects expose `ref`, `unref`, and `hasRef` too. Unref'ing the immediate that was supposed to be the only turn has the same result as unref'ing the only timer: the process may leave before check runs it.

**Practical Implementation:**

```js
import { createServer } from 'node:net';
import { setInterval } from 'node:timers';

const server = createServer(() => {});
server.listen(0);

const heartbeat = setInterval(() => {
  record();
}, 10_000);

console.log(heartbeat.hasRef()); // true
heartbeat.unref();
console.log(heartbeat.hasRef()); // false

function record() {}

// The delay 10_000 is the argument, not a measured period.
// While `server` stays ref'd, `record` still runs in the timers phase.
// heartbeat.ref() restores the vote. clearInterval(heartbeat) cancels the arm.
```

Closing the server, with the interval still unref'd and no sockets left ref'd, lets the process exit without another `record`.

**Trade-offs and Alternatives:**

`unref` is for auxiliary work: a heartbeat, a cache sweep, a probe that should die with the process. Leave the listening server and in-flight request work ref'd. `clearTimeout` is the cancel. `refresh` is the postpone. Using `unref` as a cancel leaves an armed timer that will surprise you the next time some other handle keeps the process up. `server.unref()` is the same vote on the listening handle. It is a separate call from the timer's `unref`.

**Common Mistakes:**

- Saying `unref` moves the callback from timers to check.
- Saying an unref'd interval is skipped while a ref'd server is still keeping the loop alive.
- Calling `unref` and also expecting a short script's only timer to fire.
- Calling `ref()` inside an `exit` listener and waiting for the callback.

**Senior-Level Follow-up:**

The interviewer creates the timer, unrefs it immediately, and the process has nothing else ref'd. Inside `beforeExit` they call `heartbeat.ref()`. Does `record` run?

Answer: the unref'd timer is still armed. The loop did not wait for it, which is why `beforeExit` ran. `ref()` in that listener gives the handle its vote back, so the loop has ref'd work again and can reach a timers phase. `record` runs when that phase finds the timer due. `unref` had not cleared it. The same `ref()` call inside `exit` does not get another lap.

### NODE-079 — fs.readFile uses the pool because a file read can block; a TCP read does not

**Difficulty:** Senior

**Category:** Thread pool

**Question:**

Both `fs.readFile` and a TCP `'data'` handler are called asynchronous. Why does the file read take a libuv pool thread, and why does the socket read not? Where does each JavaScript callback run?

**Context and Constraints:**

- Node 20, main isolate. Pool size, `dns.lookup`, and `pbkdf2` are NODE-062. Do not re-teach them. One sentence may point at `dns.lookup` as the same kind of blocking call.
- Worker threads are out of scope.
- No benchmark. No claim that a particular disk finished in any number of milliseconds.
- Node 20's documented filesystem path is the thread pool. Do not switch the answer onto an optional kernel interface.

**Senior Engineer's Answer:**

A TCP socket is put in non-blocking mode. libuv registers the descriptor with the platform poller: epoll, kqueue, or IOCP. The loop thread waits in the poll phase. When the kernel says the socket is readable, that same thread reads bytes the kernel already has buffered and then runs the `'data'` callback. If nothing is readable, the thread is inside the poller, not inside a blocking read. There is no pool thread in that path. The JavaScript runs in poll, on the main isolate, and then the checkpoint runs.

A regular file does not offer that contract portably. `read` on a file can block the calling thread while the disk, or a network filesystem, does the I/O. On Linux, readiness on a regular file is not a signal that `read` will return without blocking. Windows file I/O is a different completion model again. libuv's filesystem API therefore runs the blocking call on the thread pool and, when it finishes, posts a completion back to the loop thread. `fs.readFile` is that path. The pool thread reads bytes. It does not run the JavaScript callback, and it does not enter poll. The callback runs in poll, on the main isolate, same as the socket's JavaScript, after the completion is delivered.

So "async" names two mechanisms. For the socket it means "non-blocking descriptor, wake the poller, run JavaScript on the isolate." For `fs.readFile` it means "blocking syscall off the isolate, then a poll callback on the isolate." The callback's phase is poll in both cases. The offload is not.

`fs.readFileSync` is a third path. It blocks the isolate inside the syscall. No poll callback runs until it returns. `dns.lookup` is the same kind of offload as the file read, because `getaddrinfo` can block. NODE-062 already placed it. A socket connect is not that offload.

**Practical Implementation:**

```js
import { readFile } from 'node:fs';
import { createServer } from 'node:net';

readFile(new URL(import.meta.url), () => {
  // Poll, on the main isolate, after a pool thread finished the read.
});

const server = createServer((socket) => {
  socket.on('data', () => {
    // Poll, on the main isolate. No pool thread read these bytes.
  });
});

server.listen(0);
```

Both arrows in a diagram of "who ran my function" point at the isolate. The diagram of "who blocked in the kernel" points at the pool only for the file.

**Trade-offs and Alternatives:**

The pool is how Node keeps a blocking filesystem call off the one JavaScript stack. It is shared and small. A slow disk occupies a pool thread until the syscall returns, which delays other pool work. It does not, by itself, stop the poller from delivering TCP `'data'` while the isolate is free. When the JavaScript of the file callback is the cost, the pool has already finished and the isolate is busy again. A Worker is a different isolate. It is not what makes `readFile` async.

**Common Mistakes:**

- Saying the `readFile` callback runs on the pool thread.
- Saying every asynchronous Node API uses the pool. A TCP read does not.
- Treating epoll readiness on a file as the same signal as epoll readiness on a socket.
- Replacing `readFile` with `readFileSync` to "avoid the pool" and then stalling every socket.

**Senior-Level Follow-up:**

The interviewer asks what `fs.readFileSync` does to a connection that becomes readable during the syscall, compared with an in-flight `fs.readFile`.

Answer: `readFileSync` holds the isolate. Poll does not run, so the connection's `'data'` callback does not run, even though the kernel may already have the bytes. An in-flight `readFile` holds a pool thread, not the isolate. Poll on the isolate can still deliver `'data'` while that pool thread is inside its read. The file's own JavaScript waits for a later poll, after the pool posts the completion.

### NODE-080 — An empty poll computes a wait; a due timer makes that wait zero

**Difficulty:** Senior

**Category:** I/O

**Question:**

When does the Node 20 poll phase block in the kernel, and when does it return immediately? Separate an empty poll queue, a timer that is already due, a timer that is not due yet, and a poll queue that already has callbacks. A due timer must not be described as running inside the poller.

**Context and Constraints:**

- Node 20, libuv 1.45 order. Timers run after close on each lap, plus the single pre-loop timers pass from NODE-051.
- The hard cap on one poll visit is NODE-058. Do not invent its value.
- Immediates and idle handles may be named as other reasons the wait is zero. Idle's identity is NODE-060.
- No measured sleep. "Due" means the timer's threshold has already been reached. "Not due" means it has not.

**Senior Engineer's Answer:**

Poll has a kernel wait and then a list of I/O callbacks. The wait is computed. It is not a fixed sleep at the bottom of every lap.

If JavaScript callbacks are already queued for this poll, the phase runs them. A timer that is already due does not preempt that list. Those callbacks run to completion, with the checkpoint after each one, until the queue is empty or the internal cap stops the visit. The due timer runs later, in the timers phase, after check and close. Due-ness got the timeout out of the way. It did not move the timer callback into poll.

If the poll queue is empty and a `setImmediate` is armed, the wait is zero. The lap proceeds to check. NODE-058's rule is this one. An active idle handle also keeps the wait at zero. Application code does not schedule idle. NODE-060 is why that fact is not a tool.

If the poll queue is empty and a timer is already due, the wait is zero too. The thread does not sleep until the timer callback. A zero wait can still observe descriptors that are already readable, so a ready socket can still produce a poll callback on this visit. If nothing is readable, poll returns without a socket callback, check and close run, and the timers phase runs the due callback. The callback's phase is timers. The zero wait is only how the lap avoids sleeping past a deadline it has already missed.

If the poll queue is empty and the next timer is not due yet, poll may block until that deadline, or until the kernel reports I/O, whichever comes first. An earlier socket event returns from the wait, runs in poll, and the timer still waits for a timers phase that finds it due. The timer callback does not run in the middle of the kernel wait.

If the poll queue is empty, nothing is scheduled with `setImmediate`, and the only ref'd work is a listening server, poll blocks until the kernel reports a connection or data. That block is the idle server. It is not a stuck JavaScript loop.

If the only armed timer is unref'd and nothing else is ref'd, the loop is finished rather than blocked. NODE-078 is that case. A ref'd timer is what makes the "wait until the deadline" path exist.

**Practical Implementation:**

```js
import { createServer } from 'node:net';
import { setTimeout } from 'node:timers';

const server = createServer((socket) => {
  socket.on('data', () => {
    // Poll callback. A timer that became due during an earlier wait
    // does not run on this stack.
  });
});

server.listen(0);

setTimeout(() => {
  // Timers phase, after the lap that stopped waiting for this deadline.
}, 50);

// `50` is the delay argument. It is not a measurement of the poll sleep.
```

While the server is the only I/O and this timer is the next deadline, an empty poll may block. When the delay's threshold has already passed, that block is skipped and the callback still runs in timers.

**Trade-offs and Alternatives:**

The computed wait is how one thread can serve sockets and still fire timers. A JavaScript loop that sleeps by spinning would also notice a due timer, and it would burn the core. Poll's sleep is the idle path. The cost is the one NODE-069 names: once a poll callback is on the stack, the due timer waits for the return, the checkpoint, and the rest of the lap. Short callbacks keep the computed wait meaningful. `setInterval` as a substitute for the poller adds the timer floor and still runs on this thread.

**Common Mistakes:**

- Saying a due timer runs inside the poll phase because the wait was zero.
- Saying poll always blocks. A non-empty callback queue, a queued immediate, and a due timer are all zero-wait cases.
- Saying a future timer is suspended inside its own callback. The thread is in the poller. The callback has not started.
- Forgetting that a zero wait can still pick up a socket that is already readable.

**Senior-Level Follow-up:**

The interviewer has one ready socket and one already-due timer. Which callback runs first, and can the timer run between two poll callbacks that were both already queued?

Answer: the ready socket's callback runs in this poll visit. The due timer runs in the timers phase after check and close. If two poll callbacks are already queued, the first runs, its checkpoint runs, then the second runs, and the timer is still waiting for the timers phase. The timer does not become the checkpoint between them. A visit that hits the internal cap can leave leftover I/O for a later poll, and the timers phase of this lap still happens before that later poll. The cap's value stays NODE-058's unnamed bound.

### NODE-081 — Microtasks that requeue hold an already queued immediate out of check

**Difficulty:** Senior

**Category:** Starvation

**Question:**

`setImmediate` has already been called. Then a function keeps scheduling itself with `queueMicrotask`. What prints for a pump that stops after a fixed count, and what prints for a pump that never stops? Why is check the phase that loses?

**Context and Constraints:**

- `onTurn` is a poll, check, or timers callback. Not top-level ESM evaluation.
- The bounded count is the literal `3` in the snippet. Do not describe it as a duration.
- NODE-070 is the unbounded promise pump in prose. This question places an already queued immediate against that rule.
- Hypothetical.

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

**Senior Engineer's Answer:**

The synchronous body prints `sync` and `sync-end` and only enqueues. The immediate is on the check queue. `pump` is a microtask.

The checkpoint drains `nextTick` first. That queue is empty. Microtasks then run. The first `pump` sees `n === 1` and queues another `pump`. The second sees `n === 2` and queues the third. The third sees `n === 3`, prints `pumped`, and does not queue again. The microtask queue is then empty. The checkpoint returns. The lap can reach check, and `immediate` prints.

Hypothetical order: `sync`, `sync-end`, `pumped`, `immediate`.

Replace the condition with `queueMicrotask(pump)` on every entry and the queue never empties. Node finishes every microtask already queued, including the one the current microtask just appended. Check does not start. `immediate` does not print. A timer that is already due does not print either. The immediate was queued first in the source, and it still waits, because check is a phase and the checkpoint sits in front of every phase transition.

If `onTurn` itself is a check callback, and a second immediate was queued before this check began, the second immediate is the next callback of this phase. It does not start until this callback's checkpoint finishes. An unbounded `pump` started from the first immediate holds that sibling out of the same check visit. The snapshot NODE-054 describes never gets its next turn.

A bounded pump is an ordinary checkpoint. The bug is the pump that does not end. The immediate's place in line is not a priority that can cut the microtask queue.

**Practical Implementation:**

```js
function onTurnBounded() {
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

// Hypothetical:
// sync
// sync-end
// pumped
// immediate
```

The unbounded function is the same body with the `if` removed. Its hypothetical result is `sync`, `sync-end`, and then only further microtasks. `immediate` stays queued.

**Trade-offs and Alternatives:**

Microtasks are the right queue for a fixed chain that must finish before I/O observes the intermediate state. They are the wrong queue for "keep going until the buffer is empty" unless that buffer is known to be short. `setImmediate(pump)` lets this check finish and lets a later lap poll. That repair is NODE-064's, applied to a pump that started as `queueMicrotask`. Stopping at a bound, as the snippet does, is the other repair. A Worker moves the bytes off this isolate. It is not required to explain why `immediate` waited.

**Common Mistakes:**

- Printing `immediate` before `pumped` because `setImmediate` was called first.
- Printing `immediate` in the unbounded case because the handle is already queued.
- Calling the stall a blocked poll. The thread is inside the checkpoint. Poll and check have not started.
- Raising the thread pool to unblock check. The pool is not holding this queue.

**Senior-Level Follow-up:**

The interviewer moves `setImmediate` to the last line of the third `pump`, instead of calling it before the pump starts. Does `immediate` still wait for `pumped`?

Answer: the third `pump` is the microtask that prints `pumped` and, in this variant, queues the immediate. The immediate is not in front of that microtask. `pumped` prints, the checkpoint ends, and check runs `immediate` on this lap if check has not already passed, or on the next lap's check if `onTurn` was itself running in check after the snapshot was taken. Either way it prints after `pumped`, and only because the pump stopped. An unbounded pump never reaches the line that would call `setImmediate`.

### NODE-082 — An async function that throws rejects; a non-async throw escapes the turn

**Difficulty:** Senior

**Category:** Errors

**Question:**

Compare three callbacks scheduled on the timers phase: a non-async function that throws, an `async` function that throws before its first `await`, and a function that only does `Promise.reject`. What does the caller catch, which process event is in play, and which of these callbacks still reach their later lines?

**Context and Constraints:**

- Node 20. The default fate of `unhandledRejection` and `uncaughtException` is NODE-028. Name the event. Do not repeat the listener matrix.
- A throw that escapes a phase callback is NODE-072. Refer to it for "does the rest of the checkpoint run?" Do not invent a guarantee NODE-072 refused.
- The timer registration itself succeeds. The `try/catch` under discussion is either around `setTimeout` or around the call inside the callback.
- Hypothetical structure. No crash-dump log.

**Senior Engineer's Answer:**

`setTimeout` registers a timer. A `try/catch` around that call sees registration failures only. The callback is a later timers turn.

A non-async callback that throws leaves that turn. Lines after the `throw` in that callback do not run. The `catch` that can see the exception is inside the callback. Otherwise the event is `uncaughtException`. NODE-072 is the rule for work that was queued earlier in the same callback: do not design on it running. The throw is an exception, not a rejected promise.

An `async` function always returns a promise. `throw` before its first `await` rejects that promise before the call returns to the timer callback. It does not throw into the timer callback. Lines in the timer after `boom()` still run. `try/catch` around `boom()` does not see the error. `try/catch` inside `boom`, or `.catch` on the promise `boom` returned, or `await` of that promise inside another async function, does. If nobody attaches a handler before this turn ends, the event is `unhandledRejection`, not `uncaughtException`. The timer callback returned normally, so its checkpoint still runs. The rejection check is part of finishing that turn. NODE-028 is the default after the event fires.

`return Promise.reject(err)` inside an async function is the rejected-promise form of the same end state. The async function adopts that promise, so its own promise rejects on a microtask rather than being rejected before the call returns. The timer still does not see a synchronous throw. Ignored, it is still `unhandledRejection`. The difference from `throw` before `await` is when the async function's promise becomes rejected: before the call returns, or as a job in the checkpoint. Neither one is a non-async `throw`.

`Promise.reject(err)` in a non-async timer is the same channel with no async function. The call returns a rejected promise. Later lines in the timer run. No `try/catch` around the call observes it. A `.catch` attached before the turn ends handles it.

A throw after `await` in an async timer callback happens in the microtask continuation. The timers callback already returned at the `await`. The continuation rejects the promise the timer never awaited. Again that is `unhandledRejection` unless a handler is attached. It is not an exception escaping the timers phase.

**Practical Implementation:**

```js
setTimeout(() => {
  console.log('timer');
  async function boom() {
    throw new Error('async');
  }
  const rejected = boom();
  rejected.catch(() => console.log('caught'));
  console.log('timer-end');
}, 0);

// Hypothetical, this timers turn:
// timer
// timer-end
// caught
```

`caught` is the microtask reaction on an already rejected promise. It runs in this callback's checkpoint, before the next phase. Remove `.catch` and the lines `timer` and `timer-end` still print, and NODE-028's rejection path applies. Replace `boom` with `throw new Error('sync')` and `timer-end` does not print.

**Trade-offs and Alternatives:**

One error channel per callback. If the timer calls an async function, attach `.catch` to the returned promise, or make the timer callback async and wrap the body in `try/catch` knowing that the timer itself will ignore the promise. A floating async call is how a timers turn looks successful and still crashes the process on the rejection default. `queueMicrotask` is the wrong wrapper if the goal is a rejection you can `.catch`: a throw there is the uncaught path from NODE-076, not `unhandledRejection`.

**Common Mistakes:**

- Wrapping `setTimeout` in `try/catch` and expecting to see any of the three failures.
- Treating `async function () { throw err }` as `uncaughtException` because the source contains `throw`.
- Treating `Promise.reject` as a throw that skips the rest of the timer.
- Assuming `return Promise.reject(err)` and `throw err` become rejected at the same instant. The `throw` before `await` has already rejected the promise when the call returns. The `return` of a rejected promise settles on a microtask.

**Senior-Level Follow-up:**

The interviewer puts `await boom()` inside an async timer callback, with `try/catch` around that `await`, and a `setImmediate` scheduled before the `await`. Where does the `catch` run relative to the immediate?

Answer: `boom()` rejects before the `await` continuation. The `await` throws into the async timer on that continuation, and the `catch` is part of the same microtask continuation. The immediate was queued before the `await`, so it is already on the check queue. The continuation runs in the timers callback's checkpoint, which is before the lap reaches check. The `catch` runs before that immediate. The immediate is not what handles the rejection. The `catch` is.

### NODE-083 — Multiple nextTick callbacks drain in queue order, nested ones at the tail

**Difficulty:** Senior

**Category:** Microtasks

**Question:**

Predict the log. The question is the order among several `process.nextTick` callbacks, including one queued from inside another.

**Context and Constraints:**

- `onTurn` is a poll, check, or timers callback. Not top-level ESM evaluation.
- The immediate exists so the print is a later turn. Its phase is not the puzzle.
- Hypothetical. The order is the drain rule.

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

**Senior Engineer's Answer:**

`process.nextTick` appends to one queue. The checkpoint drains it until it is empty, and only then starts microtasks. A callback queued with `nextTick` from inside the drain is appended, and the same drain will reach it. It does not jump in front of callbacks that were already queued.

The synchronous body queues `a`, then `c`, then `d`, then the microtask, then the immediate. When the callback returns, `a` runs and appends `b`. `c` and `d` are already in the queue, so they run next. Then `b` runs. The `nextTick` queue is empty. `micro` runs. Check has not started. The immediate prints the array.

Hypothetical print: `a,c,d,b,micro`.

`b` is still the checkpoint. It is not a check callback, and it is not a second lap. The mistake the order is built to catch is running `b` immediately after `a`, before `c` and `d`, as if `nextTick` meant "recurse now." The implementation is a queue, and the drain walks that queue. Recursion would also blow the stack. This does not.

If `b` queues another `nextTick`, that one runs after `b`, still before `micro`. The microtask queue stays closed until a whole drain finds `nextTick` empty.

**Practical Implementation:**

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

// Hypothetical: a,c,d,b,micro
```

**Trade-offs and Alternatives:**

FIFO is what makes "let the caller queue their `nextTick` first" a usable contract, and it is what makes a nested `nextTick` a poor way to mean "do this before the rest of the callbacks I already scheduled." If `b` must run before `c`, queue it before `c`, or call it from `a` synchronously. If the work can wait for check, `setImmediate` is outside this queue. Since Node 20.18, `nextTick` is Legacy. The drain order is unchanged. New code that does not need to precede other microtasks uses `queueMicrotask`, which has its own FIFO queue and does not sort ahead of `c`.

**Common Mistakes:**

- Printing `a,b,c,d` by treating the nested call as a synchronous recursion.
- Printing `micro` before `b`. `b` is still a `nextTick`, and microtasks wait for that queue to empty.
- Printing `b` in a later phase. The same drain reaches it.
- Applying this order to the top of an ES module. NODE-021 is that exception. This snippet is a phase callback.

**Senior-Level Follow-up:**

The interviewer adds `process.nextTick(() => out.push('e'))` as the first line of `c`, and asks where `e` lands.

Answer: `c` runs after `a` and before `d`. The append during `c` happens after `d` is already queued and before `b` has run, so `e` is behind `b` only if `b` was queued first. `b` was queued during `a`, which has already run. Queue at the start of `c`: `d`, `b`, then `e` is appended. Hypothetical order: `a`, `c`, `d`, `b`, `e`, `micro`. `e` is still before `micro`.

### NODE-084 — Predict the log when a chained then meets queueMicrotask

**Difficulty:** Advanced

**Category:** Prediction

**Question:**

Predict the printed array. Use the rule that `queueMicrotask` and promise reactions are one queue, and the rule that a chained `then` is not queued until the previous reaction settles.

**Context and Constraints:**

- `onTurn` is a phase callback. Not top-level ESM evaluation.
- Hypothetical.
- No `setTimeout`. Nothing in the snippet depends on the top-level timeout versus immediate race.

```js
function onTurn() {
  const out = [];
  Promise.resolve()
    .then(() => {
      out.push('a');
    })
    .then(() => {
      out.push('b');
    });
  queueMicrotask(() => out.push('m'));
  Promise.resolve().then(() => out.push('c'));
  setImmediate(() => console.log(out.join(',')));
}
```

**Senior Engineer's Answer:**

The synchronous turn only enqueues. `Promise.resolve().then(a)` appends `a` and returns a pending promise. The following `.then(b)` attaches `b` to that pending promise and does not append `b` yet. `queueMicrotask` appends `m`. The second `Promise.resolve().then(c)` appends `c`. The microtask queue is `a`, `m`, `c`.

`a` runs and fulfills the intermediate promise, which appends `b`. The queue is then `m`, `c`, `b`. Those three run in that order. The checkpoint ends. The immediate prints.

Hypothetical print: `a,m,c,b`.

`b` is still a microtask of this checkpoint. It does not wait for check. It also does not run beside `a` just because the source wrote `.then(b)` on the next line. The second `then` ran too early for `b` to be in the queue, while `a` was still pending.

No `nextTick` was queued, so the `nextTick` drain is empty and does not insert a line. The immediate is check, after the checkpoint.

**Practical Implementation:**

```js
function onTurn() {
  const out = [];
  Promise.resolve()
    .then(() => {
      out.push('a');
    })
    .then(() => {
      out.push('b');
    });
  queueMicrotask(() => out.push('m'));
  Promise.resolve().then(() => out.push('c'));
  setImmediate(() => console.log(out.join(',')));
}

// Hypothetical: a,m,c,b
```

**Trade-offs and Alternatives:**

Chaining is how you order two steps that share a value. It is a bad way to mean "run `b` before other microtasks that happen to be queued this turn," because those microtasks were queued first. If `b` must be the next microtask after `a` with nothing else between, do that work at the end of `a` or queue it yourself at the start of `a`, knowing that jobs already in the queue still come first. One async function with two awaits makes the same queue behavior easier to read and does not change it.

**Common Mistakes:**

- Printing `a,b,m,c` because the chain is written together.
- Printing `m` before `a` because `queueMicrotask` was the call you remember. `a` was queued first.
- Holding `b` until check. The intermediate promise is fulfilled from a microtask, so `b` joins the same drain.
- Splitting `m` onto a different queue from `c`.

**Senior-Level Follow-up:**

The interviewer changes `a` so it returns `new Promise(() => {})`, a promise that never settles, and asks which of `m`, `c`, and `b` still print before the immediate.

Answer: `a` still runs. `m` and `c` were already queued, so they still run, then the checkpoint ends and the immediate prints. `b` stays attached to a promise that does not settle, so `b` does not print. A chained `then` is not a `queueMicrotask`. It waits for settlement. Hypothetical print: `a,m,c`.

### NODE-085 — Predict the log when nextTick fulfills a pending promise

**Difficulty:** Advanced

**Category:** Prediction

**Question:**

Predict the log. The promise starts pending. `then` is attached before anyone fulfills it. A `nextTick` callback is what fulfills it.

**Context and Constraints:**

- `onTurn` is a phase callback. Not top-level ESM evaluation.
- The executor may be mentioned only to say it runs now and prints nothing.
- Hypothetical.

```js
function onTurn() {
  const out = [];
  let resolve;
  const pending = new Promise((r) => {
    resolve = r;
  });
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

**Senior Engineer's Answer:**

`new Promise` runs the executor on this stack and stores `resolve`. `pending.then` sees a pending promise and does not enqueue `then`. `queueMicrotask` enqueues `micro`. The two `nextTick` callbacks are queued in order. The synchronous body prints nothing.

The checkpoint drains `nextTick` first. `tick` runs. `resolve()` enqueues the `then` reaction as a microtask. It does not run it. The following `queueMicrotask` enqueues `micro-from-tick` behind that reaction. `tick2` was already queued, so it runs before any microtask. The `nextTick` queue is empty.

Microtasks then run in queue order. `micro` was queued during the synchronous body, before this drain, so it is first. `then` was queued during `tick`, then `micro-from-tick`. The order is `micro`, `then`, `micro-from-tick`. The checkpoint ends. The immediate prints.

Hypothetical print: `tick,tick2,micro,then,micro-from-tick`.

`then` did not run before `tick` just because `pending.then` appeared earlier in the source. A reaction on a pending promise waits for fulfillment, and fulfillment from a `nextTick` still produces a microtask, which waits for the `nextTick` queue to empty. `tick2` stays in that queue, so it stays in front of `then`.

**Practical Implementation:**

```js
function onTurn() {
  const out = [];
  let resolve;
  const pending = new Promise((r) => {
    resolve = r;
  });
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

// Hypothetical: tick,tick2,micro,then,micro-from-tick
```

**Trade-offs and Alternatives:**

Fulfilling from `nextTick` is how some Node APIs emit "after the caller returns, and before promise reactions of that fulfillment." The cost is the starvation cost of any `nextTick` that requeues itself. If the fulfillment can be a microtask, resolve from the current turn, or from `queueMicrotask`, and the reactions line up with other microtasks. If the caller must observe the settlement before I/O, both choices still finish before the next phase. Neither one is `setImmediate`.

**Common Mistakes:**

- Running `then` during the synchronous body because `then` was called before `nextTick`.
- Running `then` inside `tick`, immediately after `resolve()`. `resolve` enqueues.
- Running `micro-from-tick` before `then`. `resolve()` queued `then` first.
- Running `micro` before `tick`. `micro` is a microtask, and `tick` is still in the `nextTick` drain.

**Senior-Level Follow-up:**

The interviewer calls `resolve()` twice from `tick`, and asks whether `then` runs twice.

Answer: a promise settles once. The second `resolve()` is ignored. `then` was queued once, by the first `resolve()`. The log gains no second `then`. `micro-from-tick` is a separate `queueMicrotask` and still runs once. Settlement is not a second queue you can push again.

### NODE-086 — Predict the log when a poll callback calls an async function

**Difficulty:** Advanced

**Category:** Prediction

**Question:**

`onRequest` is the poll callback. Predict the log. Place `await null` on the checkpoint, and place the `queueMicrotask` that is called after `label()` relative to that continuation.

**Context and Constraints:**

- Node 20. `onRequest` is the only poll callback already queued. No file read in this snippet.
- `await null` schedules one continuation. Do not add extra laps for it.
- This is not NODE-056's timer snippet. The queue order here is the question.
- Hypothetical. Not top-level ESM evaluation.

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

**Senior Engineer's Answer:**

`onRequest` runs on the poll turn until it returns. `sync` prints. `tick` is queued. `label()` runs on this same stack until `await`. `before` prints. `await null` wraps a non-promise and queues `after` as a promise reaction, then `label` returns its promise, which `onRequest` ignores. `queueMicrotask` then appends `micro` behind `after`. The immediate is queued for check. `sync-end` prints. The poll callback returns.

The checkpoint drains `tick` first. Microtasks then run in queue order: `after`, then `micro`. Check runs `immediate` after that.

Hypothetical order:

```text
sync
before
sync-end
tick
after
micro
immediate
```

`after` is not a pool thread and not a later phase. It is the microtask `await` queued, and it was queued before `micro` because `label()` ran before `queueMicrotask`. `tick` is in front of both because the `nextTick` drain runs before microtasks. `sync-end` is in front of `after` because `await` returned to `onRequest`, and `onRequest` still had synchronous lines.

The ignored promise from `label()` fulfills after `after` prints. Nothing in the snippet rejects, so NODE-028 does not enter.

**Practical Implementation:**

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

// Hypothetical:
// sync, before, sync-end, tick, after, micro, immediate
```

**Trade-offs and Alternatives:**

Calling an async function and ignoring the promise is fine when the function cannot reject and the continuation is allowed to race the rest of the handler. In this snippet the continuation is still the same checkpoint, so it does not race `micro` or `immediate`: the queue fixes it. The dangerous form is the one that reaches a real `await` of I/O and still ignores the promise. Then `after` moves to the poll callback that fulfills that I/O, and a missing `.catch` is `unhandledRejection`. If the handler must finish `label` before it schedules the immediate, it should be async and `await label()`.

**Common Mistakes:**

- Printing `after` before `sync-end`. The lines after `label()` are still this poll turn.
- Printing `micro` before `after`. `micro` was queued second.
- Printing `tick` after `after`.
- Hearing `async function` and moving `before` onto a worker. `before` ran on the poll stack.

**Senior-Level Follow-up:**

The interviewer swaps the two calls so `queueMicrotask` runs before `label()`. Where does `micro` move?

Answer: `micro` is appended before `label()` reaches `await`, so it is queued before `after`. `tick` is unchanged. Hypothetical order: `sync`, `before`, `sync-end`, `tick`, `micro`, `after`, `immediate`. The continuation is still one microtask. Only its place in that queue changed.

### NODE-087 — A setImmediate scheduled from the timers phase waits for the next lap

**Difficulty:** Senior

**Category:** Timers

**Question:**

A callback is already running in the timers phase on Node 20. It schedules `process.nextTick`, `queueMicrotask`, `setImmediate`, and `setTimeout(fn, 0)`. Which of those orders follow from the lap, and which order is the top-level race you still refuse?

**Context and Constraints:**

- Node 20. This callback is the timers phase, not the top of the main module, and not the pre-loop timers pass.
- The new `setTimeout(fn, 0)` has the 1 millisecond floor. You are not asked for a duration.
- The pre-loop timers pass runs once, before the loop is entered. It does not run between laps.
- Hypothetical.

```js
function onTimer() {
  console.log('timer');
  process.nextTick(() => console.log('tick'));
  queueMicrotask(() => console.log('micro'));
  setImmediate(() => console.log('immediate'));
  setTimeout(() => console.log('timeout'), 0);
  console.log('timer-end');
}
```

**Senior Engineer's Answer:**

`timer` and `timer-end` print on this timers turn. The other four calls only enqueue.

This callback's checkpoint drains `tick`, then `micro`, before the timers phase continues to another callback or the lap ends. Both are ahead of `immediate` and ahead of `timeout`.

Check for this lap has already run. `setImmediate` joins the next iteration. That iteration starts at pending callbacks, then idle, prepare, and poll, and then check runs `immediate`. A ref'd socket that is already readable can therefore run in that poll before `immediate`. The snippet has no socket. The phase fact remains: this immediate is not a tail call inside the timers phase.

The `setTimeout(fn, 0)` is a new timer with a 1 millisecond floor. This timers visit will not run it. A timer scheduled during the visit is not another sibling of the list already being walked unless it is already due against that visit's time, and a fresh floor has not elapsed inside the visit. The next timers phase is after the next iteration's check. If the floor has elapsed by then, `timeout` runs there, which is after `immediate`. If the floor has not elapsed, that timers phase skips it and `timeout` runs on a later timers phase, which is also after the check that runs `immediate`. The floor can only push `timeout` later. It cannot put `timeout` ahead of this `immediate`, because there is no timers phase between the end of this visit and the next check. The pre-loop timers pass does not insert one. That pass already happened, before the loop started.

Hypothetical order: `timer`, `timer-end`, `tick`, `micro`, `immediate`, `timeout`.

The order this answer refuses is the one at the top of the main module, where `setTimeout(fn, 0)` and `setImmediate` are both scheduled before the loop and the pre-loop timers pass may or may not already see the timeout as due. NODE-055 is that race. Scheduling both from inside a timer that is already running is a different place on the lap. Do not cite a top-level run as evidence for this callback, and do not cite this callback as evidence for the top level.

**Practical Implementation:**

```js
function onTimer() {
  console.log('timer');
  process.nextTick(() => console.log('tick'));
  queueMicrotask(() => console.log('micro'));
  setImmediate(() => console.log('immediate'));
  setTimeout(() => console.log('timeout'), 0);
  console.log('timer-end');
}

// Hypothetical, onTimer already inside the timers phase:
// timer, timer-end, tick, micro, immediate, timeout
```

**Trade-offs and Alternatives:**

From a timer, `setImmediate` is a real yield: the next lap can poll before the continuation. That is the shape NODE-064 names for work scheduled from the timers phase. `setTimeout(fn, 0)` from the same place adds another floor and another timers phase after that check. Use it when the floor is the point. Use the immediate when the point is "after the next poll has had a chance." Use the checkpoint only when the continuation must beat that poll.

**Common Mistakes:**

- Running `immediate` before `tick` because the name says immediate.
- Running the new `timeout` in this same timers visit, as the next callback.
- Importing the top-level `setTimeout` versus `setImmediate` race into a callback that is already inside the timers phase.
- Forgetting the next lap's poll and promising that nothing can run between `micro` and `immediate` once a socket exists. This snippet has no socket. A readable socket can.

**Senior-Level Follow-up:**

The interviewer adds a second `setImmediate` that was queued before this lap's check began, and asks whether that older immediate can still run after `onTimer`.

Answer: no. That older immediate was in the check snapshot of this lap, and check has finished before the timers phase started. `onTimer` cannot put a callback in front of a check that already returned. The immediate scheduled inside `onTimer` is the next lap. The older one either ran before `onTimer` or was cleared. It does not run after `timer-end`.

### NODE-088 — A finished pool read wakes poll and still runs its callback on the isolate

**Difficulty:** Senior

**Category:** Thread pool

**Question:**

`fs.readFile` is in flight. The loop thread is blocked in an empty poll, waiting for a socket or for a timer that is not due yet. The pool thread finishes the read. Who runs the JavaScript callback, and how does the blocked poll find out?

**Context and Constraints:**

- Node 20, main isolate. Why the file read used the pool at all is NODE-079. What the callback's phase is, once the loop is free, is NODE-062.
- The new fact is the wakeup of a poll that is inside the kernel wait.
- A stuck `nextTick` drain is allowed as a contrast. No duration for the read.

**Senior Engineer's Answer:**

The pool thread runs the filesystem call. When the call returns, libuv posts the completion onto the loop with an async wakeup. That wakeup is a descriptor the poller is already watching, so a poll blocked in epoll, kqueue, or IOCP returns. The pool thread does not call the JavaScript callback, does not drain `nextTick`, and does not enter check.

The loop thread then delivers the completion as an I/O callback in poll, on the main isolate. The checkpoint after that callback is the usual one. If a timer was the reason for the wait and it is still not due, this lap can run the file callback and still leave the timer for a later timers phase. The wakeup ended the sleep early. It did not make the timer due.

The wakeup does not preempt JavaScript that is already on the stack. If the isolate is inside a long poll callback, or inside a `nextTick` drain that never empties, the completion stays posted until that work returns and the loop reaches poll. NODE-057 is the drain that never does. Extra pool threads do not run the callback around that drain. The signal is only a reason for a blocked poller to return.

A TCP read does not need this wakeup path for the bytes themselves. The socket descriptor is already in the poller. The file read needs it because the bytes arrived on a different thread.

**Practical Implementation:**

```js
import { readFile } from 'node:fs';
import { createServer } from 'node:net';

const server = createServer((socket) => {
  socket.on('data', () => {
    // Poll, if this socket wakes the wait first.
  });
});
server.listen(0);

readFile(new URL(import.meta.url), () => {
  // Poll, after the pool thread's wakeup makes a blocked poll return,
  // or on a later poll if the isolate was still busy.
});
```

Which of the two callbacks runs first is not fixed. The snippet gives no ordering constraint between the socket and the disk. Both are poll callbacks once they are delivered. Neither runs on the pool.

**Trade-offs and Alternatives:**

The wakeup is why an in-flight `readFile` does not wait for an unrelated timer's full delay before its callback can run. The isolate can notice the completion on the next return from the poller. The cost of the design shows up when every pool thread is blocked in a slow read: new filesystem work waits to start, while the wakeup for a read that has finished still depends on the isolate reaching poll. Splitting slow disks onto a Worker moves both the syscall and the JavaScript. Raising `UV_THREADPOOL_SIZE` adds threads for the syscall and does not add a second isolate to run the callback.

**Common Mistakes:**

- Saying the pool thread entered the isolate and called the callback.
- Saying a blocked poll ignores a finished read until the timer it was waiting for fires.
- Saying the wakeup cuts in front of a `nextTick` callback that is running. The wakeup is a poll event. The drain is JavaScript.
- Treating the file callback and the socket callback as different threads because they waited differently.

**Senior-Level Follow-up:**

The interviewer says the poll was blocked with a 60 second timer as its deadline, and the read finishes while that wait is in progress. Does the file callback wait out the rest of the 60 seconds?

Answer: no. The pool completion wakes the poller. Poll returns, and the file callback can run in that visit. `60` seconds is the timer's delay argument, not a minimum sleep once another watched descriptor is ready. The timer callback still runs only in a timers phase that finds it due, which is not this early return, unless the threshold has actually passed. The file callback did not become a timers callback by waking a timer-bounded poll.

### NODE-089 — Timer order follows expiry, and equal delays stay in registration order

**Difficulty:** Senior

**Category:** Timers

**Question:**

Explain the order Node 20 uses for two timers with the same delay and for two timers with different delays. Include the case where a long synchronous callback holds the stack until both deadlines have passed. Do not quote a measured fire time.

**Context and Constraints:**

- The delays below are the arguments passed to `setTimeout`. The 1 millisecond floor applies to values below 1. `10` and `50` are both above that floor.
- "The isolate was busy past both deadlines" is a constraint in the second case. Do not invent how long the busy work ran.
- Top-level `setTimeout` versus `setImmediate` is not this question.
- Hypothetical.

**Senior Engineer's Answer:**

Node stores timers so that equal delays share a list in registration order, and the timers phase runs a due list as callbacks. Two `setTimeout` calls with the same delay, made from the same synchronous turn, become due together. The earlier registration runs first, then its checkpoint, then the later registration. That is the FIFO rule NODE-053's follow-up names, applied to the whole due list. `setTimeout(fn, 0)` and `setTimeout(fn, 1)` land on the same list, because both delays clamp to 1. Their order is registration order, not the `0` versus `1` that the source wrote.

Different delays are different deadlines. `setTimeout(a, 10)` and `setTimeout(b, 50)`, scheduled from the same turn while the loop is free to reach timers between those thresholds, run in different timers phases. `a`'s threshold is first, so `a`'s phase is first. `b` waits for a later timers phase that finds `50` elapsed. The numbers are the arguments that order the thresholds. They are not a measurement of the gap between the prints.

If a synchronous callback holds the stack until both thresholds have passed, the next timers phase finds both due. The earlier deadline runs first, then its checkpoint, then the later deadline. Registration order does not put `b` ahead of `a` just because `b` was scheduled first. Expiry decides across different delays. The checkpoint between them is the same one-callback rule as a pair that shared a delay.

A timer scheduled from inside `a` with delay `10` is a new arm from that moment. It is not appended to the due list as an automatic sibling. NODE-066's caution is this case. Do not print it between `a` and `b` unless the rules say that new timer is already due, and a fresh delay of `10` is not already due against the visit that is running `a`.

**Practical Implementation:**

```js
setTimeout(() => console.log('a'), 10);
setTimeout(() => console.log('b'), 50);

setTimeout(() => console.log('c'), 10);
setTimeout(() => console.log('d'), 10);

// Hypothetical, loop free to reach timers between the thresholds:
// a runs in an earlier timers phase than b.
// c then d, in one due list, with the checkpoint between them.
// Where {a,c,d} sit against each other depends on registration
// and on equal delays. c and d share a delay with each other.
// b does not share theirs.
```

If the same process first runs a synchronous callback long enough that `10` and `50` are both already due, one timers phase runs the earlier deadline first. `b` still does not jump ahead of a callback whose delay was `10`.

**Trade-offs and Alternatives:**

Equal-delay FIFO is a reasonable order for two timers you scheduled yourself. It is a poor public contract across library timers you do not own, because you do not own registration order. Different delays express "not before this threshold," not "this many milliseconds after the previous callback." When the sequence matters, put the steps in one callback, or schedule the next `setTimeout` at the end of the previous step with the delay you mean. `refresh` postpones one handle. It does not sort two handles.

**Common Mistakes:**

- Sorting all timers by registration time and ignoring a shorter delay.
- Treating `setTimeout(fn, 0)` and `setTimeout(fn, 1)` as two different lists.
- Expecting a busy loop to preserve a 40 millisecond gap between the `10` and `50` callbacks. Once both are due, they run in one timers phase, checkpoint between them, with no extra sleep inserted by the phase.
- Promising that gap from a single run on an idle laptop. Idle behavior is the separate-phases case. The rule is the threshold, not the laptop.

**Senior-Level Follow-up:**

The interviewer schedules delay `50` first and delay `10` second, then holds the stack past both thresholds. Which callback runs first?

Answer: the delay `10` callback. Its expiry is earlier. The checkpoint after it runs before the delay `50` callback starts. Registration order would have mattered if both delays had been equal. They are not.

### NODE-090 — clearTimeout removes a future callback and does not unwind the one that is running

**Difficulty:** Senior

**Category:** Timers

**Question:**

What does `clearTimeout` do to a timer that has not fired, a timer whose callback is on the stack, and an interval that NODE-067 has already re-armed? Does `clearInterval` only work on `setInterval`?

**Context and Constraints:**

- Node 20. `setTimeout` and `setInterval` both return a `Timeout`.
- Re-arm-before-the-body is NODE-067. Use it.
- No measured delay. Clearing is a queue fact.

**Senior Engineer's Answer:**

`clearTimeout(handle)` and `clearInterval(handle)` cancel a `Timeout`. The two functions share that behavior. A handle from `setInterval` can be passed to `clearTimeout`, and a handle from `setTimeout` can be passed to `clearInterval`. The name does not have to match the call that created it. Clearing a handle that is already cleared, or already fired and not repeating, is a no-op.

Clearing before the timers phase runs the callback removes it from the list. That phase will not call it. A `nextTick` that clears the handle, queued from the turn that scheduled the timer, runs in that turn's checkpoint, which is before a later timers phase. The timer does not fire.

Clearing from inside the callback does not stop the invocation that is on the stack. Lines after `clearTimeout` in that callback still run. For a one-shot timer there is no further arm anyway. For an interval, NODE-067 has already inserted the next deadline before the body runs. `clearInterval` inside the body removes that arm. The running body finishes. The next period does not fire.

`unref` is not this cancel. An unref'd timer remains armed. `refresh` is not this cancel either. It rewinds the start. A cleared timer is gone until something schedules a new one, or until `refresh` is used on a one-shot that already fired and you intended to rearm it. Those are different calls. Do not describe `clearTimeout` as `refresh`.

The checkpoint of the running callback still runs if the callback returns normally. Clearing the handle does not skip `nextTick` callbacks that were queued before the clear, and it does not drain them early. They are the checkpoint, not the timer list.

**Practical Implementation:**

```js
import { setInterval, clearInterval } from 'node:timers';

const handle = setInterval(() => {
  clearInterval(handle);
  console.log('once');
}, 1000);

// Hypothetical: 'once' prints a single time.
// The re-armed deadline was removed during the body.
// `1000` is the delay argument, not a measured gap.
```

A second `clearInterval(handle)` after that body is a no-op. The process does not throw.

**Trade-offs and Alternatives:**

Clear from the code that owns the handle, as soon as the work should not run. Clearing inside the callback is the right stop for "this interval has finished its job." Clearing from `nextTick` is the right stop for "I changed my mind before the timers phase." `unref` is the right tool when the callback may still run if the process stays up, and must not be the reason it stays up. An abort signal on `timers/promises` is the promise-shaped cancel. It rejects the promise and drops the underlying arm. It does not unwind a callback that has already started.

**Common Mistakes:**

- Expecting `clearTimeout` inside the callback to skip the rest of the body.
- Expecting an interval to fire once more because the re-arm already happened, and not clearing that arm.
- Believing `clearInterval` ignores a `setTimeout` handle, or the reverse.
- Using `unref` when the requirement is that the callback must not run.

**Senior-Level Follow-up:**

The interviewer queues `process.nextTick(() => clearInterval(handle))` as the first line of the interval callback, after the re-arm has been inserted, and asks whether the next period can fire.

Answer: the callback returns, and its checkpoint runs that `nextTick` before the next phase and before the next timers visit. The clear removes the re-armed deadline in that checkpoint. The next period does not fire. The running body still finishes, including lines after the `nextTick` call. The clear is deferred to the checkpoint. It is not deferred to the next fire.

### NODE-091 — EventEmitter listeners share the current stack; the checkpoint starts after emit

**Difficulty:** Senior

**Category:** Scheduling

**Question:**

A poll callback emits an event with two listeners. The first queues `process.nextTick`. The second queues `queueMicrotask`. When do those callbacks run, relative to the second listener and relative to a line after `emit`?

**Context and Constraints:**

- Node 20. `emit` is synchronous. The `'error'` event with no listener is NODE-039. Do not repeat that special case.
- `onTurn` is a phase callback that calls `emit` once.
- Hypothetical.

```js
import { EventEmitter } from 'node:events';

function onTurn() {
  const ee = new EventEmitter();
  ee.on('go', () => {
    console.log('a');
    process.nextTick(() => console.log('tick'));
  });
  ee.on('go', () => {
    console.log('b');
    queueMicrotask(() => console.log('micro'));
  });
  ee.emit('go');
  console.log('emitted');
}
```

**Senior Engineer's Answer:**

`emit` calls every listener on the current stack, in registration order, and returns. It does not schedule the listeners on a phase, and it does not drain `nextTick` between them. `a` prints, queues `tick`, and returns. `b` prints, queues `micro`, and returns. `emit` returns. `emitted` prints. Then `onTurn` returns.

The checkpoint of `onTurn` drains `tick`, then `micro`. Both were queued by listeners, and both wait until the phase callback that called `emit` returns. `tick` does not run between `a` and `b`. `micro` does not run before `emitted`.

Hypothetical order: `a`, `b`, `emitted`, `tick`, `micro`.

A throw in `a` leaves `emit`. `b` does not run. That is ordinary stack unwinding, plus EventEmitter's listener loop. The `'error'` event with nobody listening is the separate path in NODE-039. A `nextTick` that `a` queued before the throw is the NODE-072 problem: do not design on the checkpoint of a turn that threw. A listener that returns normally does not have that problem. Its `nextTick` is part of `onTurn`'s checkpoint, even though the call to `nextTick` was lexically inside the listener.

Socket `'data'` listeners are this same `emit`, usually from a poll callback. Two `'data'` listeners on one socket run in the same poll turn. Their `nextTick` callbacks run after that poll callback returns, not between the two listeners, and not in a later phase of their own.

**Practical Implementation:**

```js
import { EventEmitter } from 'node:events';

function onTurn() {
  const ee = new EventEmitter();
  ee.on('go', () => {
    console.log('a');
    process.nextTick(() => console.log('tick'));
  });
  ee.on('go', () => {
    console.log('b');
    queueMicrotask(() => console.log('micro'));
  });
  ee.emit('go');
  console.log('emitted');
}

// Hypothetical: a, b, emitted, tick, micro
```

**Trade-offs and Alternatives:**

Synchronous listeners are why `emit` can offer "you are not re-entered, and both handlers have seen this event before I return." They are also why a slow listener stalls the phase that called `emit`. If a listener must do I/O, it should schedule that I/O and return. `setImmediate` inside the listener yields to check. `nextTick` inside the listener does not yield. It only defers work to this callback's checkpoint, which is what you want when the listener must let `emit` return before a follow-up runs, and what you do not want when the follow-up is a long pump.

**Common Mistakes:**

- Running `tick` between `a` and `b`.
- Running `micro` before `emitted`.
- Treating each listener as its own poll callback. They share the `emit` that the poll callback called.
- Believing a `nextTick` in a listener runs before listeners that were registered earlier. Registration order is the `emit` order. The queue runs after `emit` returns.

**Senior-Level Follow-up:**

The interviewer registers a third listener after `emit` has returned, from inside the `tick` callback, and emits again from that `tick`. Does the third listener see the first event?

Answer: no. The first `emit` already finished, with the listeners registered at that time. The third listener is registered in the checkpoint, and a second `emit` from that `tick` runs it synchronously inside `tick`, before `micro`, because `micro` is still waiting for the `nextTick` drain to finish. Hypothetical insertion: `tick` prints, the third listener prints, then `micro`. The first event's listener list is not edited retroactively.

### NODE-092 — Predict the log when destroy schedules close beside an immediate

**Difficulty:** Advanced

**Category:** Prediction

**Question:**

`onData` runs in poll. It queues a `nextTick`, a promise reaction, and a `setImmediate`, then calls `socket.destroy()`. The socket has a `'close'` listener. Predict the log.

**Context and Constraints:**

- Node 20. `destroy` is the abrupt close NODE-061 assigns to the close-callbacks phase. Do not re-derive graceful `end`.
- `onData` is the poll callback. No other poll callback is already queued.
- Hypothetical. No duration.

```js
function onData(socket) {
  console.log('data');
  process.nextTick(() => console.log('tick'));
  Promise.resolve().then(() => console.log('promise'));
  setImmediate(() => console.log('immediate'));
  socket.destroy();
}

function onClose() {
  console.log('close');
}
```

**Senior Engineer's Answer:**

`destroy` schedules the close. It does not emit `'close'` on this stack. `data` prints. `tick`, `promise`, and `immediate` are queued. `onData` returns.

The poll callback's checkpoint drains `tick`, then `promise`. Check runs `immediate`. The close-callbacks phase runs after check and before timers. `onClose` prints there. This lap has no timer in the snippet.

Hypothetical order: `data`, `tick`, `promise`, `immediate`, `close`.

`close` is a later callback with its own checkpoint after it. It is not a microtask of `onData`, and it is not the check phase. The immediate is ahead of it because check is ahead of close on the Node 20 lap. `tick` is ahead of the immediate because it is the poll callback's checkpoint.

A `nextTick` queued inside `onClose` runs in the close callback's checkpoint, still before the timers phase of this lap, and before the next iteration's poll. It does not run before `immediate`, because `onClose` has not started until after check.

**Practical Implementation:**

```js
function onData(socket) {
  console.log('data');
  process.nextTick(() => console.log('tick'));
  Promise.resolve().then(() => console.log('promise'));
  setImmediate(() => console.log('immediate'));
  socket.destroy();
}

function onClose() {
  console.log('close');
}

// Hypothetical:
// data
// tick
// promise
// immediate
// close
```

**Trade-offs and Alternatives:**

Cleanup that must see the socket die belongs on `'close'`, which covers `destroy` and the graceful path NODE-061 separates. Cleanup that must run before check belongs in `onData` or in its checkpoint, not in `'close'`. `setImmediate` from `onData` is the wrong hook for "before we fully drop the handle," because close is after that immediate. Doing the work synchronously in `onClose` is the hook that matches the phase you were given.

**Common Mistakes:**

- Printing `close` before `onData` returns, because `destroy` was called.
- Printing `close` before `tick`. The checkpoint of `onData` finishes first.
- Printing `close` before `immediate`. Close is after check.
- Using this order for `socket.end()`. NODE-061 puts a non-abrupt close on `nextTick`, which would move `close` into a checkpoint instead of the close phase.

**Senior-Level Follow-up:**

The interviewer adds `setTimeout(() => console.log('timeout'), 0)` as the first line of `onData` and asks where `timeout` sits relative to `close`.

Answer: both are after check. On Node 20 the close phase runs, then the timers phase. `close` prints before `timeout` once the timer is due. The 1 millisecond floor can push `timeout` to a later lap's timers phase, which is still after this lap's `close`. It cannot put `timeout` ahead of `close` in this lap, because timers follow close. This is not a top-level `setTimeout` versus `setImmediate` question. The immediate in the snippet stays ahead of both.

### NODE-093 — An in-flight file request keeps the loop alive after a timer is unref'd

**Difficulty:** Senior

**Category:** Process lifetime

**Question:**

A script unrefs its only timer and still does not exit. The other call in the script is `fs.readFile`. Why does the process stay up, and which phase runs the file callback? What would you call if you wanted the timer, rather than the read, to be the reason the process stayed up?

**Context and Constraints:**

- Node 20. Ref'd requests versus ref'd handles are NODE-035. The timer vote is NODE-078.
- The file callback's phase is poll, after the pool posts the completion. NODE-062.
- No duration for the read. Do not claim `getActiveResourcesInfo()` returns a particular string unless you are describing the kind of entry.

**Senior Engineer's Answer:**

`fs.readFile` starts a pool operation and a ref'd request on the loop. That request keeps the loop alive until the completion is delivered and the callback returns, the same way a ref'd handle does. `timer.unref()` removes the timer's vote only. It does not unref the filesystem request. There is no `unref` argument on `readFile`. While the request is in flight, an empty poll is allowed to block or to be woken by the pool, and the process does not take the `beforeExit` path.

The JavaScript callback runs in poll, on the main isolate, then the checkpoint. After that callback returns, if the timer is still unref'd and no other ref'd work remains, the loop can finish. The timer's callback is not required to have run. If the timer's deadline passed while the read kept the loop alive, the timers phase of a lap that reached it can still have run the unref'd timer, because the loop was alive for the request. `unref` does not mean "skip this callback while anything else is alive." It means "do not be the last vote."

`process.getActiveResourcesInfo()` lists the resources keeping the loop alive. During the read, that list can include the in-flight request. After `unref`, the timer is not a reason the loop is alive. The exact labels are the runtime's. The interview fact is the request, not a memorized string.

To make the timer the reason the process stays up, leave it ref'd, or call `ref()` again. To make the process exit without waiting for the file, you do not get that from the timer. You avoid starting the read, or you use a handle you can close. Clearing the timer does not cancel the request.

**Practical Implementation:**

```js
import { readFile } from 'node:fs';
import { setTimeout } from 'node:timers';
import { getActiveResourcesInfo } from 'node:process';

const timer = setTimeout(() => {
  console.log('timer');
}, 60_000);
timer.unref();

readFile(new URL(import.meta.url), () => {
  console.log('file');
});

// While the read is in flight, getActiveResourcesInfo() can show the request
// that is keeping the loop alive. 'file' prints in poll.
// 'timer' prints only if a timers phase finds it due before the loop ends.
// `60_000` is the delay argument, not a measurement.
```

**Trade-offs and Alternatives:**

In-flight I/O that must finish should stay ref'd. That is the default, and it is the right default for a request the user is waiting on. Background timers should be unref'd so they do not pin a process that has finished its requests. The combination in the question is easy to misread in a shutdown path: unref'ing the heartbeat does not cancel the upload, and waiting for the heartbeat does not happen just because the upload is running unless the heartbeat's deadline arrives first. Shutdown code should close servers, stop accepting work, and let requests finish, which is NODE-037's pattern. `unref` is not the shutdown.

**Common Mistakes:**

- Expecting `timer.unref()` to unref every other active resource.
- Expecting the process to exit at `unref()` while `readFile` is in flight.
- Putting the file callback on the pool thread because the request was what kept the process alive.
- Assuming the unref'd timer cannot run if a request happens to keep the loop alive past its deadline.

**Senior-Level Follow-up:**

The interviewer calls `timer.ref()` inside the file callback and asks whether the process can exit at the end of that callback.

Answer: `ref()` restores the timer's vote if the timer has not fired and has not been cleared. The file callback's request is done when the callback returns. The timer is then a reason to stay up, and its callback can run in a later timers phase. If the timer was already cleared, `ref()` does not create a new arm. The process can exit after the file callback's checkpoint if nothing ref'd remains.

### NODE-094 — A false return from socket.write means drain is a later turn

**Difficulty:** Senior

**Category:** I/O

**Question:**

`socket.write(chunk)` returns `false`. A teammate retries the write in a `while` loop until it returns `true`. Another teammate awaits a promise with `queueMicrotask` before writing more. When does Node 20 actually say the buffer has drained, and which phase is that callback allowed to be?

**Context and Constraints:**

- Node 20, `node:net` socket, byte mode. The high-water mark is the stream's documented threshold. Do not invent a benchmark of throughput.
- Write completions can run in poll, or in the pending-callback drain NODE-059 describes for some writes. You may name both. Do not collapse them into `nextTick`.
- The current callback is a poll `'data'` or `'drain'` handler. It returns.

**Senior Engineer's Answer:**

`socket.write` queues bytes and returns. `true` means the writable buffer stayed under its high-water mark. `false` means the buffer is at or over that mark. The bytes are still queued. `false` does not mean the kernel rejected them, and it does not mean the call blocked. The documented default high-water mark for a byte-mode writable is 16 KiB. A socket can set another. The return value is about that buffer, not about a phase.

`'drain'` is emitted later, when a write completion has flushed enough that the buffer is under the mark again. That completion is I/O on the loop thread. It may run as a poll callback, or as a pending callback in the bounded drain after poll that NODE-059 describes for some writes. It is not a microtask, and it is not `process.nextTick`. It does not run before the current handler returns. The handler's checkpoint runs first. Then a later I/O turn emits `'drain'`.

A `while` loop that writes until `write` returns `true` keeps queuing on this stack. Each `false` is a signal to stop. Ignoring it grows the buffer for as long as the loop runs. The kernel window and the peer are not consulted by that loop.

`queueMicrotask` before the next write yields to the microtask queue only. It does not wait for the kernel buffer, and it does not wait for `'drain'`. The next write in that microtask is still the same checkpoint, and it can push the same buffer further over the mark. `await` of a promise you resolved yourself has the same shape.

The pause that matches `false` is to stop writing, wait for `'drain'`, then continue from that listener. `'drain'` can be observed more than once over the life of the socket. Each one is a later turn. Backpressure toward the readable side, `socket.pause()` until drain and then `resume`, is how a proxy avoids reading faster than it writes. Those calls return immediately too. Their effect shows up on later poll turns.

**Practical Implementation:**

```js
import { createServer } from 'node:net';

const server = createServer((socket) => {
  socket.on('data', (chunk) => {
    const ok = socket.write(chunk);
    if (!ok) socket.pause();
  });
  socket.on('drain', () => {
    // Later I/O turn, after this write completion. Not a microtask.
    socket.resume();
  });
});

server.listen(0);
```

If `write` returns `true`, this snippet does not pause. If it returns `false`, reads wait until `'drain'`. The `'data'` callback has already returned before that `'drain'` listener runs.

**Trade-offs and Alternatives:**

Honoring `false` keeps memory bounded by the high-water mark plus whatever one callback queued. Ignoring it is simpler and will hold an unbounded buffer when the peer is slow. `cork` and `uncork` batch several writes into one kernel write. They do not change the meaning of `false`, and `uncork` still returns before `'drain'`. A `Writable` stream's `write` callback is the per-chunk completion. `'drain'` is the buffer-level signal. Use the callback to know that chunk finished. Use `'drain'` to know you may continue producing.

**Common Mistakes:**

- Spinning until `write` returns `true`.
- Awaiting `queueMicrotask` or `Promise.resolve()` and calling that backpressure.
- Treating `'drain'` as a `nextTick` of the `write` call. It waits for a write completion.
- Copying the chunk into an ever-growing array after `false`, which stores the same bytes the stream is already holding.

**Senior-Level Follow-up:**

The interviewer writes again inside the same `'data'` callback after `write` returned `false`, and asks whether that second write is refused.

Answer: it is accepted into the buffer and `write` returns `false` again if the buffer is still over the mark. The socket does not throw. `'drain'` still fires once the completions bring the buffer back under the mark, on a later I/O turn. The second write made the overrun larger. The phase rules did not insert a drain between the two calls, because both calls were on the same stack.

### NODE-095 — refresh rewinds the start time and leaves the phase and the delay value alone

**Difficulty:** Intermediate

**Category:** Timers

**Question:**

What does `timeout.refresh()` change on Node 20, and what does it leave alone? Include a one-shot that has already fired, and an interval that has not.

**Context and Constraints:**

- Node 20 `Timeout`. The delay clamp is unchanged.
- `unref` and `clearTimeout` are NODE-078 and NODE-090. Do not redefine them. Say whether `refresh` implies either one.
- No measured delay. "Now" means the loop time at the `refresh` call.

**Senior Engineer's Answer:**

`refresh()` keeps the same `Timeout` object and the same delay, and it sets the start to now. The callback is due after that delay measured from the refresh, with the usual rule that the delay is a minimum and the timers phase has to reach it. The phase stays timers. `refresh` does not move the callback to check, does not clear the handle, and does not change `hasRef()`. An unref'd timer stays unref'd. A ref'd timer stays ref'd.

On an interval that has not fired, `refresh` postpones the next fire to "delay from now" instead of leaving the previous arm in place. That is the debounce shape: each call slides the deadline, and one object is reused. It does not compensate drift. It intentionally forgets the previous deadline.

On a one-shot that has already called its callback, `refresh` arms it again with the same delay. That is a reschedule without allocating another `Timeout`. It is not a second concurrent callback. The previous invocation has returned. The new one waits for a later timers phase.

`refresh` during the running callback of an interval adjusts the arm NODE-067 already inserted, or rearms from now, so the next fire is delay from the refresh rather than delay from the visit's original sample. The running body still finishes. You do not get two stacks.

Calling `refresh` on a cleared timer does not undo `clearTimeout`. Clear removed the callback. Refresh is defined for a live `Timeout`, including one that has already fired and can be activated again. Do not use `refresh` as the opposite of `clear` unless you are holding the same object and it has not been cleared.

**Practical Implementation:**

```js
import { setTimeout } from 'node:timers';

const handle = setTimeout(() => {
  console.log('fired');
}, 1000);

function postpone() {
  handle.refresh();
}

// Each postpone() measures 1000 from that call.
// 1000 stays the delay argument. The phase stays timers.
// handle.unref() would still be a separate call.
```

**Trade-offs and Alternatives:**

`refresh` avoids allocating a new handle on a hot debounce path, and it preserves listeners' identity for the handle: anything that captured `handle` still sees the same object. A new `setTimeout` plus `clearTimeout` of the old one is easier to read and allocates. Prefer that when the path is cold. Prefer `refresh` when the profile says the allocation matters, or when an API must return one stable `Timeout`. A fixed-series schedule from NODE-077 is a different goal. `refresh` always means "from now," so repeated refreshes under load keep sliding and may never fire. That is correct for debounce and wrong for a metrics interval.

**Common Mistakes:**

- Expecting `refresh` to reset the delay to 0.
- Expecting `refresh` to ref an unref'd timer.
- Calling `refresh` in a loop on every request and then wondering why the callback never runs. Each call pushed the deadline.
- Treating `refresh` after `clearTimeout` as a guaranteed undo.

**Senior-Level Follow-up:**

The interviewer calls `refresh()` from a `nextTick` queued just before the timers phase, and asks whether the callback can still run in the timers phase that was about to fire it.

Answer: the `nextTick` runs in the previous turn's checkpoint, before that timers phase. `refresh` moves the deadline to delay-from-now. Unless that delay is already elapsed, the upcoming timers phase does not run this handle. The callback waits for a later timers phase. The checkpoint did not skip the timers phase for the whole process. It skipped this handle's due-ness.

### NODE-096 — Predict the check-phase log, and refuse to order a nested immediate against a timeout

**Difficulty:** Advanced

**Category:** Prediction

**Question:**

`onCheck` and `also` were both queued before this check phase started, `onCheck` first. Predict the order the rules fix. Say explicitly which pair you will not order.

**Context and Constraints:**

- Node 20. This function is already running in check. It is not the top of the main module.
- The nested `setImmediate` misses the snapshot NODE-054 describes.
- `setTimeout(fn, 0)` has the 1 millisecond floor. NODE-055 already refuses a universal winner for a timeout and an immediate scheduled together from inside a running immediate. Keep that refusal.
- Hypothetical.

```js
function onCheck() {
  console.log('i1');
  process.nextTick(() => console.log('tick'));
  queueMicrotask(() => console.log('micro'));
  setImmediate(() => console.log('nested'));
  setTimeout(() => console.log('timeout'), 0);
}

function also() {
  console.log('i2');
}
```

**Senior Engineer's Answer:**

`i1` prints. `tick` and `micro` are queued for this callback's checkpoint. `nested` misses the list check snapshotted when the phase began, so it waits for a later iteration's check. `timeout` is a timers-phase callback with a 1 millisecond floor. `onCheck` returns.

The checkpoint drains `tick`, then `micro`, before the next immediate in this same snapshot. `i2` prints. `timeout` cannot print between `i1` and `i2`. The timers phase is after the whole check phase. Whether the floor has elapsed yet can only make `timeout` later, not earlier than `i2`.

`nested` also cannot print between `i1` and `i2`. It is not in this snapshot.

The pair the rules do not fix is `nested` against `timeout`. On Node 20 the timers phase of this lap sits after this check and before the next iteration's check. If the new timer is already due there, `timeout` prints before `nested`. If the floor has not elapsed, this timers phase skips it, the next iteration can run `nested` in check, and `timeout` prints in a later timers phase. That is the refusal NODE-055 makes for a timeout and an immediate scheduled from inside a running immediate. State the dependency. Do not pick a winner from one run.

This refusal is not the top-level race either. Top-level `setTimeout(fn, 0)` versus `setImmediate` can go either way because of the pre-loop timers pass. Here both calls happen inside check, and the stable prefix does not need that pass.

Hypothetical order the rules fix: `i1`, `tick`, `micro`, `i2`. Then `nested` and `timeout` in an order this question does not decide.

**Practical Implementation:**

```js
function onCheck() {
  console.log('i1');
  process.nextTick(() => console.log('tick'));
  queueMicrotask(() => console.log('micro'));
  setImmediate(() => console.log('nested'));
  setTimeout(() => console.log('timeout'), 0);
}

function also() {
  console.log('i2');
}

// Hypothetical, both functions already queued for this check, onCheck first:
// i1
// tick
// micro
// i2
// nested and timeout: refuse a universal order
```

**Trade-offs and Alternatives:**

If `nested` must run before `timeout`, do not schedule them as a race. Call the nested work at the end of `also`, or schedule the timeout from inside the nested immediate so its timers phase is unambiguously after that check. If `timeout` must run before `nested`, the floor makes that a bad `setTimeout(fn, 0)` request. Schedule `nested` from the timeout callback. NODE-087 is the stable direction once you are already inside the timers phase. The fix for an unordered pair is to put one callback in the continuation of the other.

**Common Mistakes:**

- Printing `nested` before `i2` because it was scheduled from `i1`.
- Printing `timeout` before `micro` because an old diagram starts every lap on timers. This lap is inside check.
- Announcing that `timeout` beats `nested` because timers run before the next check, without the floor.
- Announcing that `nested` beats `timeout` because "immediate is faster," from one laptop run.

**Senior-Level Follow-up:**

The interviewer deletes the `setTimeout` line and asks for the full order, including `nested`.

Answer: with no timer, `nested` is the check phase of the next iteration, after this check finishes and after the intervening poll. Nothing else is queued in the snippet. Hypothetical order: `i1`, `tick`, `micro`, `i2`, `nested`. A readable socket could still run in that next poll before `nested`. The snippet does not have one. The order among these five lines is the snapshot rule plus the checkpoint.

### NODE-097 — A chain of setImmediate reaches later phases; a chain of microtasks does not

**Difficulty:** Senior

**Category:** Scheduling

**Question:**

A check callback wants to process a queue and also let a due timer run. Compare rescheduling the work with `setImmediate` against rescheduling it with `queueMicrotask`. Which one lets the Node 20 lap reach the timers phase, and where does poll fit?

**Context and Constraints:**

- The callback is already running in check. A timer is already due. That due-ness is a constraint, not a measured time.
- Nested immediates wait for the next iteration. NODE-054.
- The unbounded microtask case is NODE-081. Use it. The new point is the immediate chain, and poll on the laps in between.
- No chunk-size recommendation.

**Senior Engineer's Answer:**

A `queueMicrotask` that queues another `queueMicrotask` never empties the checkpoint of this check callback. The timers phase of this lap does not start, so the due timer does not run. The next iteration does not start, so poll does not run either. The due timer stays due. The isolate spends the stall inside microtasks.

A `setImmediate` from inside this check callback is not in the current snapshot. It runs in the next iteration's check. Before that check, the next iteration walks pending callbacks, idle, prepare, and poll. After this check returns, this lap still runs close callbacks and then the timers phase, so a timer that is already due can run before the nested immediate. The immediate chain therefore gives every following lap a poll and a timers phase. It does not run the whole queue inside one checkpoint.

Poll on those following laps sees sockets that are readable then. It does not see them during the current check callback's body. The yield starts when this callback returns and the nested immediate is left for the next lap. A single `setImmediate` yields once. A chain yields once per chunk. A microtask chain does not yield once.

`process.nextTick` that requeues itself is the stricter stall: it also holds off the microtasks. It does not reach the timers phase either. Replacing it with `queueMicrotask` removes the Legacy API and keeps the stall if the chain is unbounded.

**Practical Implementation:**

```js
function stepImmediate(queue) {
  const item = queue.shift();
  if (item === undefined) return;
  handle(item);
  setImmediate(() => stepImmediate(queue));
}

function stepMicro(queue) {
  const item = queue.shift();
  if (item === undefined) return;
  handle(item);
  queueMicrotask(() => stepMicro(queue));
}

function handle(_item) {}
```

`stepImmediate`, started from check, lets a due timer run in the timers phase after this check, and lets later chunks run after later polls. `stepMicro`, started from the same check, keeps the due timer waiting until the queue is drained. If `handle` itself never returns, neither schedule matters. The stack has not reached the reschedule line.

**Trade-offs and Alternatives:**

The immediate chain is the fairness tool on one isolate. It adds a check callback per chunk and still shares the thread with sockets. The microtask chain is the tool for a short sequence that must finish before any later phase observes a torn update. A timer between chunks adds the 1 millisecond floor, which is the right cost when the product wants a minimum gap and the wrong cost when it only wanted to reach poll. A Worker is the tool when `handle` is the CPU cost and fairness on this loop is not enough.

**Common Mistakes:**

- Saying `setImmediate` from check runs later in the same check visit, so the due timer at the end of the lap still waits for the whole queue.
- Saying `queueMicrotask` yields because the callback returned.
- Putting the due timer inside check because it was due "during" the immediate. Due timers run in the timers phase.
- Using a top-level `setTimeout` versus `setImmediate` anecdote to choose the chunk scheduler. The callback here is already in check.

**Senior-Level Follow-up:**

The interviewer starts `stepImmediate` from a poll callback instead of from check, and asks whether the due timer can run before the second chunk.

Answer: the nested immediate is queued during poll, so it is in this lap's check, before close and before timers. The second chunk runs in that check. The due timer runs after it, in the timers phase. Later chunks, queued from that check, wait for the next lap and therefore wait until after this timer. The first reschedule from poll does not yield past the timers phase. The reschedules after that do. Say which chunk you are on. NODE-064 is the same placement.

### NODE-098 — A rejection handler in this checkpoint still counts; one in check is a later turn

**Difficulty:** Senior

**Category:** Errors

**Question:**

A timers callback creates a rejected promise and does not attach `.catch` before it returns. You can attach `.catch` in a `process.nextTick` queued from that callback, in a microtask queued from that callback, or in a `setImmediate`. Which of those still prevent `unhandledRejection`, and which are too late?

**Context and Constraints:**

- Node 20, default `--unhandled-rejections`. The event and the default exit are NODE-028. Do not repeat the listener matrix.
- "The turn" matches NODE-028: a handler attached before the turn ends means the event is not emitted.
- Place that turn on the checkpoint and on check. No duration.
- The promise is rejected during the timers callback, not inside top-level ESM evaluation.

**Senior Engineer's Answer:**

Node decides `unhandledRejection` when the promise is still unhandled at the end of the turn. For a timers callback, that turn is the callback plus the checkpoint that drains `nextTick` and then microtasks, including work those callbacks queue, until both are empty. The rejection check is part of finishing that checkpoint. It is not a separate phase, and it is not check.

A `.catch` attached synchronously in the timers callback, before it returns, handles the rejection. The event is not emitted.

A `.catch` attached inside a `process.nextTick` queued from that callback runs during the same checkpoint, before the turn is finished. That still handles it. The event is not emitted.

A `.catch` attached inside a microtask queued from that callback also runs during the same checkpoint, after the `nextTick` drain and among the other microtasks. That still handles it, provided the microtask actually runs before the checkpoint ends. A microtask queued behind a chain that never empties is the starvation case, not a handling strategy.

A `.catch` attached inside `setImmediate` runs in check, after this callback's checkpoint has returned and the rejection has already been processed. `unhandledRejection` has been emitted. The later `.catch` can still observe the rejection, and Node can emit `rejectionHandled` for a promise that was already reported. It does not make the earlier event unhappen. NODE-028's follow-up is the same fact with `setTimeout`: a later turn is too late to be "the same turn." Check is that kind of later turn. It is not special because the name says immediate.

An async function that throws before `await` has the same clock. The promise is already rejected when the call returns. A `.catch` in that callback's `nextTick` is in time. A `.catch` in check is not. The non-async `throw` is not this question. That path is `uncaughtException`, and there is no promise to catch in check.

**Practical Implementation:**

```js
setTimeout(() => {
  const rejected = Promise.reject(new Error('x'));
  process.nextTick(() => {
    rejected.catch(() => {
      // Same checkpoint. unhandledRejection is not emitted.
    });
  });
}, 0);

setTimeout(() => {
  const rejected = Promise.reject(new Error('y'));
  setImmediate(() => {
    rejected.catch(() => {
      // Check is a later turn. The rejection event already happened
      // unless a listener on unhandledRejection changed NODE-028's default.
    });
  });
}, 0);
```

A rejection from `timers/promises` follows this same turn rule once the timer callback fulfills or rejects.

**Trade-offs and Alternatives:**

Attach the handler in the same function that created the promise, before returning. That is the structure that does not depend on checkpoint timing. `nextTick` is a valid "let the caller attach" window for a promise you return, which is why returning the promise is better than reporting it yourself: the caller attaches `.catch` or `await`s it in their own synchronous continuation, which is still this turn if you returned it from their callback. Scheduling the handler on `setImmediate` because "the rejection should be asynchronous" uses the wrong queue. The rejection is already asynchronous. Check is simply late.

**Common Mistakes:**

- Treating every later callback as still "the same turn."
- Attaching `.catch` in check and asserting that `unhandledRejection` will not fire.
- Using an empty `unhandledRejection` listener to paper over a handler that was scheduled on the wrong phase.
- Confusing this with a throw from `queueMicrotask`, which is the uncaught path and has no `.catch`.

**Senior-Level Follow-up:**

The interviewer attaches the `.catch` inside a microtask that is queued from the `nextTick`, not from the timers callback directly. Is that still the same turn?

Answer: yes. The `nextTick` runs in this checkpoint and queues a microtask. After the `nextTick` queue empties, that microtask runs, still before the checkpoint returns. The `.catch` lands before the rejection check. It is the same rule as a microtask queued from the timers callback itself. It stops being the same turn if that `nextTick` instead calls `setImmediate`.

### NODE-099 — Predict the log when the promise is queued from nextTick and the microtask was queued first

**Difficulty:** Advanced

**Category:** Prediction

**Question:**

Predict the log. `queueMicrotask` runs in the synchronous body. The only `Promise.then` is inside the `nextTick`.

**Context and Constraints:**

- `onTurn` is a phase callback. Not top-level ESM evaluation.
- Hypothetical.
- No `setTimeout`, so the top-level timeout versus immediate race is not involved.

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

**Senior Engineer's Answer:**

The synchronous lines print `sync` and `sync-end`. They queue one `nextTick`, one microtask, and one immediate. The promise reaction does not exist yet.

The checkpoint runs `tick`. That callback queues `promise`. The `nextTick` queue is empty, so microtasks start. `micro` was queued in the synchronous body, before `tick` ran, so it is already in the queue. `promise` was appended during `tick`. The microtask order is `micro`, then `promise`.

`promise` queues `tick-from-promise`. That `nextTick` waits until the microtask queue empties, then the drain loop runs it. The checkpoint ends. Check prints `immediate`.

Hypothetical order: `sync`, `sync-end`, `tick`, `micro`, `promise`, `tick-from-promise`, `immediate`.

`micro` is ahead of `promise` because of when each job was queued, not because `queueMicrotask` outranks `then`. The opposite source order, with `then` called during the synchronous body and `queueMicrotask` called after it, would put the reaction first. NODE-063 is a different interleave, with both jobs queued before the drain. This snippet's promise does not exist until `tick`.

`tick-from-promise` stays ahead of `immediate`. A `nextTick` queued from a microtask is still the checkpoint.

**Practical Implementation:**

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

// Hypothetical:
// sync
// sync-end
// tick
// micro
// promise
// tick-from-promise
// immediate
```

**Trade-offs and Alternatives:**

Queue the promise reaction in the synchronous body if it must sit in front of microtasks you have not queued yet, and you are willing to write that order down. Queue it from `nextTick` only when it must wait until other `nextTick` callbacks have run. Readers should not have to simulate both queues to use the function. Return one promise, or run one callback, if the product order matters.

**Common Mistakes:**

- Printing `promise` before `micro` because "the tick's work is more important."
- Printing `tick-from-promise` before `micro`. It is queued during `promise`, which is after `micro`.
- Printing `immediate` between `promise` and `tick-from-promise`.
- Importing the ESM top-level order, where a `nextTick` does not jump a microtask drain that is already running. This `onTurn` is a phase callback.

**Senior-Level Follow-up:**

The interviewer adds `process.nextTick(() => console.log('tick2'))` immediately after the first `process.nextTick` call, still in the synchronous body. Where does `tick2` print?

Answer: `tick2` is already queued behind `tick` before the drain starts. `tick` queues the promise and does not queue another `nextTick` in front of `tick2`. Hypothetical insertion: `tick`, `tick2`, `micro`, `promise`, `tick-from-promise`, `immediate`. `tick2` stays ahead of `micro` because the `nextTick` queue empties before microtasks begin.

### NODE-100 — Separate the orders the rules fix from the top-level timeout and immediate race

**Difficulty:** Advanced

**Category:** Prediction

**Question:**

Predict what you can. The snippet schedules `setTimeout(fn, 0)` and `setImmediate` at the top level, and a different pair inside a `readFile` callback, plus several checkpoint callbacks. Which lines have an order, and which pairs do you refuse?

**Context and Constraints:**

- Node 20. The top-level pair is the race NODE-055 refuses. Do not award a winner from the phase story or from a mental model of one laptop.
- The `readFile` callback is poll, once it runs. The read's duration is not given. Do not place `io` against `timeout-top` or `immediate-top`.
- Inside the poll callback, the phase order is the one this section has been using. The 1 millisecond floor applies to both timeouts.
- Hypothetical. Not top-level ESM evaluation of the `nextTick` versus promise rule. The top-level calls here are only the timer and the immediate. The `nextTick` calls are inside the poll callback.

```js
import { readFile } from 'node:fs';

setTimeout(() => console.log('timeout-top'), 0);
setImmediate(() => console.log('immediate-top'));

readFile(new URL(import.meta.url), () => {
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

**Senior Engineer's Answer:**

`timeout-top` and `immediate-top` are scheduled before the loop from the main module. The pre-loop timers pass may already see `timeout-top` as due, or it may not, because of the 1 millisecond floor and startup. NODE-055 stands: do not say which of those two prints first. Do not say that Node 20 "fixed" it by moving timers to the end of the lap. The pre-loop pass is why the top-level pair still has two legal orders.

`io` is a poll callback after the pool finishes the read. The snippet does not say whether that completion is delivered before `timeout-top`, before `immediate-top`, or after both. Refuse those slots. Once `io` is running, the rest of that callback is fixed.

`io` prints. The synchronous body queues `tick`, then `tick2`, then `micro`, then `promise`, then the check callback, then the timers callback. `tick-nested` does not exist until `tick2` runs.

The checkpoint drains `nextTick` until empty. `tick` runs. `tick2` runs and appends `tick-nested`. `tick-nested` runs after `tick2`, because it was appended behind an empty remainder. Then microtasks: `micro` was queued before `promise`, so `micro` then `promise`. Check runs `immediate-io`. The timers phase is after check. `timeout-io` was scheduled from this poll callback with the 1 millisecond floor. The floor can push it to a later timers phase. It cannot put it ahead of `immediate-io`, because check runs before timers on this lap, and the timer did not exist before `io`.

Hypothetical order once `io` runs:

```text
io
tick
tick2
tick-nested
micro
promise
immediate-io
timeout-io
```

Absent from that list, on purpose: `timeout-top`, `immediate-top`, and any interleaving of those two with `io`.

**Practical Implementation:**

```js
import { readFile } from 'node:fs';

setTimeout(() => console.log('timeout-top'), 0);
setImmediate(() => console.log('immediate-top'));

readFile(new URL(import.meta.url), () => {
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

// Fixed once `io` runs:
// io, tick, tick2, tick-nested, micro, promise, immediate-io, timeout-io
// Not fixed: timeout-top vs immediate-top, and either of those vs io
```

**Trade-offs and Alternatives:**

Production code should not depend on the refused pairs. If a continuation must follow the file callback, schedule it from inside that callback, as this snippet does for `immediate-io` and `timeout-io`. If two startups must be ordered, call one from the other. `readFile` of the current module is a fine interview device and a poor request path. The pool thread and the poll callback are real costs. The order inside `io` is a reasoning tool. The product contract should be the promise the handler returns.

**Common Mistakes:**

- Printing `timeout-top` before `immediate-top` because timers are "usually first," or the reverse because "Node 20 runs timers last."
- Inserting `io` between those two with a made-up read time.
- Printing `tick-nested` before `tick2`, or `promise` before `micro`.
- Printing `timeout-io` before `immediate-io` by extending the top-level race into a poll callback.

**Senior-Level Follow-up:**

The interviewer moves both `setImmediate` and `setTimeout(fn, 0)` of the `io` pair up to the top level, next to the existing top-level pair, and leaves only the checkpoint calls inside `readFile`. What remains ordered?

Answer: inside `io`, the order `io`, `tick`, `tick2`, `tick-nested`, `micro`, `promise` remains. All four timer and immediate callbacks are now top-level schedules, and their order against each other and against `io` is not fixed by the snippet. You still refuse `timeout-top` versus `immediate-top`. You also refuse to sort the moved pair, for the same reason: they are no longer scheduled from the poll callback, so the "check before the timers phase of this I/O lap" reason does not apply to them. The checkpoint order does not need that reason. It is the poll callback's own drain.
