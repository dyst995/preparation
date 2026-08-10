# 01. JavaScript is single-threaded - what that actually means

> Source: `interview-prep/typescript-javascript/02-async-event-loop.md`

### Topics to learn
- [ ] One call stack, one thread of JS execution (per realm/worker)
- [ ] "Async" doesn't mean "multi-threaded" for user JS code - it means non-blocking I/O delegation
- [ ] Where the *actual* concurrency happens: browser Web APIs / Node's libuv thread pool, not JS itself
- [ ] Why a long synchronous loop freezes everything, including UI and other pending callbacks

### Core idea

JavaScript executes on a single call stack - only one piece of JS code runs at any given instant. When you call `setTimeout`, `fetch`, or a file read, you're not spawning a JS thread to wait - you're handing the waiting work off to the **host environment** (the browser's Web APIs, or Node's libuv/C++ thread pool). The host notifies JS via callbacks queued for later, but the JS engine itself is still doing one thing at a time.

This is why a synchronous CPU-heavy loop "blocks everything": there's nothing else that can run on that one thread until the loop finishes, no matter how many pending network responses or timers are waiting - they just queue up.

```js
console.log('start');
setTimeout(() => console.log('timeout'), 0);
console.log('end');
// start, end, timeout - even with a 0ms delay, the callback waits for the current
// synchronous code to fully finish and the stack to empty
```

### Interview question

**Q: If `setTimeout(fn, 0)` has a 0ms delay, why doesn't `fn` run immediately?**

**Strong answer:**
> "`setTimeout` never runs its callback synchronously or immediately, even with a 0ms delay - the delay is a *minimum*, not a guarantee. The callback is handed to the timer facility, and once the delay elapses it's placed in the macrotask queue. The event loop only pulls from that queue once the call stack is completely empty - so any currently-running synchronous code, including code after the `setTimeout` call itself, runs first."

---
