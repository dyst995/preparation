# 02. The event loop: call stack, task queue, microtask queue

> Source: `interview-prep/typescript-javascript/02-async-event-loop.md`

### Topics to learn
- [ ] Call stack - synchronous execution, LIFO
- [ ] Macrotasks (a.k.a. "tasks"): `setTimeout`, `setInterval`, I/O callbacks, UI rendering steps, `setImmediate` (Node)
- [ ] Microtasks: Promise `.then`/`.catch`/`.finally` callbacks, `queueMicrotask`, `async/await` continuations, `MutationObserver`
- [ ] The event loop algorithm: run one macrotask, then drain the **entire** microtask queue, then repeat
- [ ] Microtasks can starve macrotasks if they keep enqueueing more microtasks
- [ ] Node-specific nuance: `process.nextTick` runs before other microtasks (Node only, not a web standard)

### The priority order (memorize this)

1. Run the current synchronous script to completion (the initial macrotask).
2. Drain the **entire microtask queue** - including any new microtasks *added while draining* - until it's empty.
3. (Browser) Perform any pending rendering/UI updates if it's time to paint.
4. Pull the **next single macrotask** from the task queue and run it to completion.
5. Go back to step 2.

**The critical rule: microtasks always fully drain before the next macrotask runs - even if new microtasks keep getting added.** This is the single fact that resolves 90% of "predict the output" questions.

### Worked example

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
- Lines 1 and 5 run synchronously first - the whole script is the initial macrotask and must finish.
- `setTimeout`'s callback is queued as a **macrotask**, even at 0ms.
- `.then()` callbacks are queued as **microtasks**.
- Once the sync script finishes, the microtask queue is drained: "promise 1" logs, which synchronously enqueues another microtask ("promise 2" `.then`), which also runs before moving on - **new microtasks jump the line ahead of any macrotask**.
- Only after the microtask queue is completely empty does the event loop pull the next macrotask: the timeout callback.

### Interview question

**Q: Can microtasks ever prevent macrotasks (like `setTimeout` or rendering) from running at all?**

**Strong answer:**
> "Yes - if a microtask callback keeps scheduling more microtasks (for example, a `.then()` that calls itself recursively via another `.then()`), the microtask queue never empties, so the event loop never reaches the next macrotask or, in a browser, the next paint. This is a real starvation bug, sometimes seen with runaway recursive Promise chains, and it manifests as a frozen UI even though `setTimeout` callbacks are technically 'scheduled.'"

---
