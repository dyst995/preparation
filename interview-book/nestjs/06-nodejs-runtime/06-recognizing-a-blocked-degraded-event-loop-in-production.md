# 06. Recognizing a blocked/degraded event loop in production

> Source: `interview-prep/nestjs/06-nodejs-runtime.md`

### Topics to learn
- [ ] Symptoms: increasing request latency across the board (not just one endpoint), health checks timing out, WebSocket heartbeats missed
- [ ] Event loop lag / delay metrics (measuring the gap between scheduling and executing a trivial timer, as a proxy for how busy the loop is)
- [ ] Common culprits: synchronous JSON parsing of huge payloads, synchronous crypto/compression, large synchronous loops/sorts, blocking `fs` calls (`readFileSync`) in a hot path
- [ ] Fixes: move heavy CPU work to worker threads or a separate service, use async/streaming APIs, paginate/limit payload sizes, offload to background jobs

### Interview question

**Q: Production API latency has degraded across *every* endpoint, not just one - how do you investigate?**
> "That pattern - latency degrading globally rather than on one route - points at something blocking the shared event loop rather than a single slow query. I'd check for event loop lag metrics, look for recently deployed code doing synchronous heavy lifting (large JSON parsing, synchronous crypto, blocking `fs` calls), and check whether a burst of traffic triggered a code path that's CPU-heavy per request under load in a way it wasn't under light testing. The fix is almost always moving that work off the main thread - a worker thread, a queue/background job, or an external service - rather than trying to make the blocking code marginally faster."

---
