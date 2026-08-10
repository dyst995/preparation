# 07. Full interview question bank (rapid fire)

> Source: `interview-prep/nestjs/06-nodejs-runtime.md`

1. **Is Node.js single-threaded?** -> yes for JS execution; I/O uses libuv/OS async + a thread pool.
2. **Order: `process.nextTick`, Promise `.then()`, `setTimeout(0)`?** -> nextTick, then microtasks, then timer phase.
3. **What blocks the event loop?** -> synchronous CPU-heavy work in the JS thread.
4. **Why use streams for file uploads?** -> constant memory regardless of file size, avoids OOM under concurrent large uploads.
5. **`pipe()` vs `pipeline()`?** -> pipeline propagates errors and cleans up properly; pipe doesn't.
6. **How do you use multiple CPU cores in Node?** -> multiple processes (cluster module or PM2 cluster mode), not multiple threads for JS.
7. **What breaks with in-memory rate limiting under clustering/horizontal scaling?** -> inconsistent counts across processes; needs Redis.
8. **Should you recover from `uncaughtException`?** -> no, log and exit, let the process manager restart cleanly.
9. **Why use background jobs/queues instead of doing everything inline?** -> decouple request latency/reliability from slow or unreliable downstream work.
10. **Why must job processors be idempotent?** -> queues can redeliver jobs; retries must be safe to run more than once.
11. **How do you catch a missed payment webhook?** -> periodic reconciliation cron job as a safety net.
12. **Global latency degradation across all endpoints - what do you suspect first?** -> event loop blocking, not a single slow query.

---
