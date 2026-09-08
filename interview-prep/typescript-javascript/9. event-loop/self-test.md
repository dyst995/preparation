# The Event Loop: Call Stack, Task Queue, Microtask Queue — Self-test

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
