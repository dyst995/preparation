# 01. The event loop

> Source: `interview-prep/nestjs/06-nodejs-runtime.md`

### Topics to learn
- [ ] Node is single-threaded for JS execution, but I/O is handled by libuv's thread pool + OS async primitives
- [ ] Event loop phases (in order): timers -> pending callbacks -> idle/prepare -> poll -> check -> close callbacks
- [ ] Microtasks (Promises, `queueMicrotask`) drain *between* every phase transition, not just at the end
- [ ] `process.nextTick()` runs even before microtasks (highest priority, Node-specific, not part of the "standard" event loop phases)
- [ ] `setTimeout(fn, 0)` vs `setImmediate(fn)` ordering nuance
- [ ] Why CPU-bound synchronous work blocks *everything* - no request can be served while a heavy loop runs

### Mental model

```
process.nextTick queue    (drains first, always, before microtasks)
     v
microtask queue (Promises)  (drains completely between every macrotask/phase)
     v
Event loop phases (macrotasks):
  1. timers        - setTimeout/setInterval callbacks whose time has elapsed
  2. pending callbacks - some system-level callbacks deferred from previous loop
  3. poll           - retrieve new I/O events; execute I/O callbacks; this is where most work happens
  4. check          - setImmediate() callbacks
  5. close callbacks - e.g. socket.on('close', ...)
```

After **every single callback**, Node drains `process.nextTick` then the microtask queue before moving on - this is why a chain of `.then()`s or `async/await` continuations can "starve" the event loop from reaching I/O callbacks if you're not careful (a real, if less common, performance bug).

### `setTimeout(0)` vs `setImmediate()`

- Inside a plain top-level script, their relative order isn't guaranteed (depends on process performance).
- **Inside an I/O callback**, `setImmediate()` always fires before `setTimeout(fn, 0)`, because you're already in/near the poll phase and `check` (setImmediate's phase) comes right after poll, before looping back to timers.

### Why this matters for a NestJS API

Every request handler that does synchronous, CPU-heavy work (e.g. hashing something expensive without using a worker, parsing a huge JSON blob synchronously, a large in-memory sort) blocks the single JS thread - **no other request, health check, or timer fires until it's done.** This is the single most common Node.js production incident category: "the app looked hung/unresponsive under load" traced back to one blocking code path.

### Interview questions

**Q: Explain the Node.js event loop in your own words.**
> "Node runs JavaScript on a single thread, but I/O - file system, network, DNS, some crypto - is handled asynchronously via libuv, either through OS-level async APIs or a background thread pool, and results come back as callbacks scheduled onto the event loop. The loop itself has phases - timers, I/O callbacks, `setImmediate`, close callbacks - and after every individual callback, Node drains `process.nextTick` and then the Promise microtask queue completely before continuing. So the illusion of concurrency comes from non-blocking I/O plus this callback/microtask scheduling, not from actual parallel JS execution."

**Q: What happens if I run a synchronous `for` loop that takes 5 seconds inside a request handler?**
> "The entire process is blocked for those 5 seconds - no other incoming request is processed, no timers fire, health checks fail, WebSocket pings stop, everything stalls, because there's only one JS thread. That's why genuinely CPU-heavy work needs to move off the main thread - worker threads, a separate process/service, or a background job queue - rather than running inline in a request handler."

**Q: `process.nextTick()` vs a resolved Promise's `.then()` - which runs first?**
> "`process.nextTick()` callbacks run first - Node drains the entire `nextTick` queue before touching the microtask (Promise) queue, on every iteration. It's a Node-specific mechanism that predates the microtask queue being standardized alongside Promises."

---
