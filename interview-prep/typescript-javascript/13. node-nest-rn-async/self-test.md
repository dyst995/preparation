# Node, NestJS, and React Native Async Notes — Self-test

## Core recall

1. Relative to Promise `.then`, when does `process.nextTick` run?
2. Name the major Node loop phases at awareness level (enough to place `setTimeout` and `setImmediate`).
3. Does RN’s JS thread use a different Promise/microtask model than the browser?
4. What is different about RN async if the JS loop is the same?
5. When Nest runs an `async` controller method, what does Nest do with the returned Promise?
6. What still can crash or destabilize a Nest/Node process despite Nest exception filters?
7. Is `setImmediate` a web standard?

## Explain why

1. Why can recursive `process.nextTick` starve I/O harder than you might expect?
2. Why is “Nest uses async handlers” not enough to claim all errors are handled?
3. Why does a CPU-heavy sync loop inside a Nest handler increase latency for unrelated requests?
4. Why is it correct to say RN has the same JS event loop as the browser but still talk about a UI thread?
5. Why shouldn’t production logic depend on `setTimeout(0)` vs `setImmediate` ordering?

## Compare and contrast

1. `process.nextTick` vs `queueMicrotask` / Promise microtasks.
2. `setTimeout` vs `setImmediate` in Node (high level).
3. Browser main thread jank vs Nest event-loop blocking (same mechanism, different symptom).
4. RN JS thread vs RN native UI thread.
5. Errors Nest exception filters see vs unhandled rejections from background Promises.
6. Portable async knowledge vs Node-only APIs.

## Predict the output

State the order **and explain why** (Node unless noted).

1.
```js
console.log('s');
process.nextTick(() => console.log('n'));
Promise.resolve().then(() => console.log('p'));
```

2.
```js
setTimeout(() => console.log('t'), 0);
process.nextTick(() => console.log('n'));
Promise.resolve().then(() => console.log('p'));
console.log('s');
```

3.
```js
// Conceptual Nest handler — what is dangerous?
async function create(dto) {
  this.repo.save(dto); // forgot await; returns Promise
  return { ok: true };
}
```

4.
```js
// RN JS (same as browser model)
console.log('a');
Promise.resolve().then(() => console.log('b'));
setTimeout(() => console.log('c'), 0);
console.log('d');
```

## Debugging

1. Node service: timers and incoming sockets feel delayed; profiling shows deep `process.nextTick` recursion in a library hook. What’s happening?

2. Nest endpoint returns 201 but the process logs `UnhandledPromiseRejection` from analytics. Walk the failure path.

3. Teammate says: “RN is multi-threaded so our JS `await` won’t block the UI thread.” What is confused? What *can* still jank?

4. Flaky test asserts `setImmediate` before `setTimeout(0)`. Why is this assertion brittle?

## Application

1. Rewrite a Node deferral from `process.nextTick` to `queueMicrotask` and state when that change is safer for portability.

2. Write a Nest controller snippet that (a) lets Nest handle a repository rejection and (b) safely fire-and-forgets a metrics call with logging.

3. Draft a 4-bullet answer comparing browser vs RN async for an interviewer who thinks RN “has a different event loop.”

4. Label each of these as portable / Node-only / RN-native-side: `setTimeout`, `process.nextTick`, Promise `.then`, bridge native module callback, Nest exception filter.

## Interview questions

1. Does React Native have a different event loop than the browser?  
   **Follow-ups:** Then why do people talk about the UI thread / bridge?

2. What is `process.nextTick` and how does it relate to Promises?  
   **Follow-ups:** Why can it be dangerous? What would you use instead in app code?

3. Explain Node’s event-loop phases at a high level.  
   **Follow-ups:** Where do `setTimeout` and `setImmediate` fit? Do you rely on their order?

4. How does Nest handle errors from `async` controllers?  
   **Follow-ups:** What errors does it *not* handle automatically?

5. Why can one heavy request slow down other requests in a Node/Nest process?

## Connections

1. How does this unit reuse the microtask-vs-macrotask rule from the event-loop unit?
2. How do Nest unhandled rejections connect to the concurrency-pitfalls unit?
3. How is RN’s “JS vs native” split analogous to “JS vs Web APIs/libuv” in the single-threaded unit?
4. When predicting output in Node, what’s the one Node-specific queue you should insert before Promises?
5. How would you explain to a mobile interviewer that learning browser async still pays off for RN?
