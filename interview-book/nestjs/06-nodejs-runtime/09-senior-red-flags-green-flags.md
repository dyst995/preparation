# 09. Senior red flags / green flags

> Source: `interview-prep/nestjs/06-nodejs-runtime.md`

### Green flags
- Explains the event loop with actual phase names and microtask/macrotask distinction, not just "it's async."
- Immediately reaches for background jobs/queues for slow or unreliable third-party calls, without being prompted.
- Knows background job processors must be idempotent, and gives a concrete mechanism (idempotency keys, existence checks).
- Understands clustering/horizontal scaling breaks in-memory shared state, and knows Redis is the standard fix.
- Treats `uncaughtException` as "log and exit," not "try to keep going."

### Red flags
- Thinks Node is "fully single-threaded end to end" with no nuance about libuv/thread pool.
- Puts slow third-party API calls or heavy synchronous work directly inline in a request handler with no plan to move it.
- No idempotency story for retried background jobs - assumes jobs run exactly once.
- Tries to "catch and continue" after an uncaught exception instead of restarting cleanly.
- No awareness of graceful shutdown / `enableShutdownHooks()` in a containerized deployment.

---
