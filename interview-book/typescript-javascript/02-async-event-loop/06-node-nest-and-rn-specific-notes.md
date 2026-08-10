# 06. Node/Nest and RN-specific notes

> Source: `interview-prep/typescript-javascript/02-async-event-loop.md`

### Topics to learn
- [ ] `process.nextTick` (Node) runs before Promise microtasks, in its own even-higher-priority queue
- [ ] Node's macrotask phases (timers, pending callbacks, poll, check/`setImmediate`, close callbacks) - awareness level, not memorization-critical
- [ ] React Native's JS thread runs the same single-threaded event-loop model (via Hermes/JSC), so this entire chapter transfers directly - no special RN async model
- [ ] NestJS request handlers are `async` by convention; unhandled rejections in a controller/service can crash the process if not caught by Nest's exception handling layer or your own try/catch

### Interview question

**Q: Does React Native have a different event loop than the browser?**

**Strong answer:**
> "No - the JS thread in RN runs on a standard JS engine, Hermes or JSC, which implements the same single-threaded event loop, call stack, and micro/macrotask model as any other JS runtime. What's different in RN is the *native* side - a separate UI thread handles native rendering, and native module calls cross a bridge/JSI boundary - but from the perspective of my JS code's async behavior, Promises, `async/await`, and `setTimeout` all behave exactly as they would in a browser or Node."

---
