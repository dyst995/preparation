# 03. Clustering & PM2

> Source: `interview-prep/nestjs/06-nodejs-runtime.md`

### Topics to learn
- [ ] Node's `cluster` module: fork multiple worker processes sharing a listening port, each with its own event loop/memory
- [ ] Why: utilize multiple CPU cores despite each Node process being single-threaded
- [ ] PM2 as a production process manager: clustering mode, auto-restart on crash, zero-downtime reloads
- [ ] Load balancing across workers (round-robin, OS-level for cluster module)
- [ ] Shared state problem: workers don't share memory - in-memory caches/rate limiters need an external store (Redis) if running clustered
- [ ] Sticky sessions matter again here for WebSockets in a clustered single-host setup (see chapter 04)

### `cluster` module (concept)

```typescript
if (cluster.isPrimary) {
  const cpuCount = os.cpus().length;
  for (let i = 0; i < cpuCount; i++) cluster.fork();
  cluster.on('exit', (worker) => {
    console.log(`Worker ${worker.process.pid} died, restarting`);
    cluster.fork();
  });
} else {
  bootstrap(); // each worker runs its own full NestJS app instance
}
```

### PM2 in production

```bash
pm2 start dist/main.js -i max --name vetapp-api   # -i max = one worker per CPU core
pm2 reload vetapp-api                              # zero-downtime reload (rolling restart of workers)
```

PM2's cluster mode wraps the same underlying idea as Node's `cluster` module but adds process supervision: auto-restart on crash, log management, zero-downtime reloads (`pm2 reload` restarts workers one at a time so there's always capacity serving traffic), and monitoring.

### The shared-state gotcha

Because each clustered worker is a **separate process with its own memory**, an in-memory cache, an in-memory rate-limit counter, or in-memory WebSocket room tracking won't be consistent across workers. Anything that needs to be shared across workers (or across horizontally scaled containers) needs an external store - Redis being the standard choice - exactly the same problem and same fix as scaling WebSockets across multiple containers (chapter 04).

### Interview questions

**Q: Node is single-threaded - so how do you use all the CPU cores on a server?**
> "Run multiple Node processes, one per core, each handling its own share of incoming connections - either via the built-in `cluster` module or, more commonly in production, PM2's cluster mode, which adds process supervision, auto-restart, and zero-downtime reloads on top of the same idea. Each worker is a fully separate process with its own event loop and memory, so it doesn't violate Node's single-threaded execution model per process - it's process-level parallelism, not thread-level."

**Q: What breaks if you naively add an in-memory rate limiter to a clustered/multi-instance deployment?**
> "It becomes inconsistent - each worker/instance has its own counter, so a client could get 5x the intended rate limit by having requests spread across 5 workers, each unaware of the others' counts. Anything that needs a single source of truth across processes - rate limits, caches, WebSocket room membership - needs to move to a shared external store like Redis."

---
