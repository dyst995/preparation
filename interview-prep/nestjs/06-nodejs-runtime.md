# 06 - Node.js Runtime: Event Loop, Streams, Clustering, Error Handling, Background Jobs

> Goal: explain what's actually happening under a NestJS app at the Node.js level - the event loop, async model, process management, and background job processing (VetApp's payment/notification pipeline) - deeply enough to reason about performance and reliability, not just framework APIs.

Mark progress with `[x]` as you master each topic.

---

## Learning objectives

By the end of this section you should be able to:

1. Explain the Node.js event loop phases and the microtask/macrotask distinction.
2. Explain streams and backpressure, and identify where they matter in a typical backend (file uploads).
3. Explain clustering/PM2 and why/when to use multiple processes despite Node being single-threaded.
4. Design correct error handling at the process, framework, and async level.
5. Design a background job system (queues) and justify it with the VetApp payment/notification use case.
6. Recognize symptoms of a blocked event loop and know how to fix them.

---

## 1. The event loop

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

## 2. Streams

### Topics to learn
- [ ] Four stream types: Readable, Writable, Duplex, Transform
- [ ] Why streams exist: process data incrementally instead of loading everything into memory
- [ ] Backpressure: what it is, why `.pipe()` handles it automatically, what happens if you ignore it
- [ ] Real backend use case: file uploads (VetApp file uploads, e.g. veterinary records/documents) without buffering entire files in memory
- [ ] Piping (`readable.pipe(writable)`) and error propagation gotchas (`pipe()` does NOT forward errors automatically - must handle on each stream or use `pipeline()`)
- [ ] `stream.pipeline()` / `stream/promises` for safer composition with proper cleanup

### Why streams matter for file uploads

```typescript
// Naive - loads the entire file into memory before doing anything with it
const buffer = await fs.promises.readFile(uploadedFilePath);
await uploadToS3(buffer);

// Streamed - constant memory regardless of file size
const readStream = fs.createReadStream(uploadedFilePath);
await pipeline(readStream, s3UploadStream);
```

For VetApp-style file uploads (veterinary records, documents, images), streaming avoids the classic failure mode of large uploads spiking memory and potentially crashing the process under concurrent load - a 50MB file buffered fully in memory for 20 concurrent uploads is 1GB+ of RAM just sitting there.

### Backpressure

If a writable destination is slower than the readable source (e.g. writing to a slow disk/network vs reading a fast local file), naive manual piping without respecting backpressure signals can balloon memory as unconsumed data queues up. `.pipe()` and `stream.pipeline()` handle this automatically by pausing the readable side when the writable side's internal buffer is full.

### `pipe()` vs `pipeline()`

```typescript
// pipe() - errors on either stream do NOT automatically propagate/cleanup the other side
readStream.pipe(writeStream); // must manually listen for 'error' on both

// pipeline() - properly propagates errors and cleans up (destroys) all streams on failure
import { pipeline } from 'node:stream/promises';
await pipeline(readStream, transformStream, writeStream);
```

### Interview questions

**Q: Why use streams for file uploads instead of just reading the whole file into a buffer?**
> "Memory. Buffering a whole file means memory usage scales with file size times concurrent uploads - a handful of large concurrent uploads can spike memory dramatically and risk an OOM crash. Streaming processes data in chunks with constant memory overhead regardless of file size, and it lets you start forwarding data (e.g. to S3) before the whole file has even finished uploading."

**Q: What's wrong with `readStream.pipe(writeStream)` on its own, error-handling-wise?**
> "`pipe()` doesn't automatically forward errors between the streams or clean up (destroy) the other side if one errors - you can end up with dangling file handles or a hung process if you don't attach your own `error` listeners on each stream. `stream.pipeline()` (or its promise-based version) handles error propagation and cleanup correctly out of the box, which is why I prefer it for anything beyond a quick script."

---

## 3. Clustering & PM2

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

## 4. Error handling

### Topics to learn
- [ ] `try/catch` with `async/await` - the modern default, but every `await` needs to be inside a `try` (or handled by an outer boundary) or it becomes an unhandled rejection
- [ ] `process.on('uncaughtException', ...)` and `process.on('unhandledRejection', ...)` as last-resort safety nets, not a substitute for real handling
- [ ] Why you generally should NOT try to "recover and continue" after an uncaught exception - process state may be corrupted; log and exit, let the process manager (PM2/Kubernetes) restart it
- [ ] NestJS's global exception filter as the framework-level safety net for HTTP request errors specifically (doesn't catch things outside the request lifecycle, e.g. errors in a raw `setInterval` callback or a queue consumer)
- [ ] Graceful shutdown: stop accepting new requests, finish in-flight ones, close DB/queue connections, then exit
- [ ] Domain-specific error classes (e.g. `PaymentDeclinedError`, `AppointmentConflictError`) mapped to appropriate HTTP status in filters, rather than throwing generic errors everywhere

### Global safety nets

```typescript
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', reason);
  // log and let it be visible; don't silently swallow
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception - shutting down', err);
  process.exit(1); // let the process manager restart with a clean state
});
```

### Graceful shutdown

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  await app.listen(3000);
}
```

```typescript
@Injectable()
export class DatabaseCleanup implements OnApplicationShutdown {
  constructor(private dataSource: DataSource) {}
  async onApplicationShutdown(signal?: string) {
    await this.dataSource.destroy(); // close pool cleanly before process exits
  }
}
```

In a containerized deployment (Docker/Kubernetes), the orchestrator sends `SIGTERM` before force-killing with `SIGKILL` after a grace period - if the app doesn't stop accepting new connections and drain in-flight requests during that window, you get dropped requests on every deploy/scale-down event.

### Interview questions

**Q: Should you try to recover from an `uncaughtException` and keep the process running?**
> "Generally no - by the time an exception reaches that top-level handler, something escaped every other layer of handling, and the process's internal state could be inconsistent in ways that are hard to reason about. The safer pattern is log it with full context, then exit, and let the process manager (PM2, Kubernetes) restart a fresh process. Trying to 'limp along' risks subtle corruption or repeated failures that are much harder to debug than a clean restart."

**Q: How do you make sure in-flight requests aren't dropped during a deploy?**
> "Graceful shutdown: the process needs to stop accepting *new* connections on `SIGTERM`, let in-flight requests finish within a grace period, close DB/queue connections cleanly, and only then exit. In Nest that's `app.enableShutdownHooks()` plus lifecycle hooks like `OnApplicationShutdown`, combined with the orchestrator (Kubernetes readiness/liveness probes, or PM2's reload) giving the process enough grace time before a hard kill."

---

## 5. Background jobs (VetApp)

### Topics to learn
- [ ] Why some work doesn't belong inline in the HTTP request/response cycle (slow, unreliable, or fire-and-forget work)
- [ ] Queue-based processing: BullMQ (Redis-backed) as the standard NestJS choice (`@nestjs/bullmq` / `@nestjs/bull`)
- [ ] Job producers (enqueue) vs consumers/processors (dequeue and execute)
- [ ] Retries with backoff, dead-letter handling for jobs that keep failing
- [ ] Idempotency in job processors (a job might run more than once - must be safe to retry)
- [ ] Scheduled/cron jobs with `@nestjs/schedule` (`@Cron()`, `@Interval()`, `@Timeout()`) for periodic tasks
- [ ] VetApp use case: asynchronous payment processing/webhooks, appointment confirmation notifications

### Why background jobs, concretely

Two VetApp scenarios that shouldn't block the HTTP response:
1. **Payment processing follow-up**: after initiating a payment with Bank of Georgia's API, reconciling the final status (via webhook or polling) and updating records shouldn't hold the original request open.
2. **Notifications**: sending an appointment confirmation email/SMS/push after booking shouldn't make the booking request wait on a third-party notification provider's latency - if that provider is slow or briefly down, appointment creation shouldn't fail because of it.

### BullMQ setup (concept)

```typescript
// Producer - enqueue a job from the service handling the HTTP request
@Injectable()
export class AppointmentsService {
  constructor(@InjectQueue('notifications') private notificationsQueue: Queue) {}

  async create(dto: CreateAppointmentDto) {
    const appointment = await this.repo.save(dto);
    await this.notificationsQueue.add(
      'appointment-confirmation',
      { appointmentId: appointment.id },
      { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
    );
    return appointment; // HTTP response returns immediately, notification sends async
  }
}
```

```typescript
// Consumer - processes jobs from the queue, in a separate concern from the HTTP request lifecycle
@Processor('notifications')
export class NotificationsProcessor extends WorkerHost {
  async process(job: Job<{ appointmentId: number }>) {
    const appointment = await this.appointmentsService.findOne(job.data.appointmentId);
    await this.emailService.sendConfirmation(appointment); // safe to retry - idempotent by appointment id
  }
}
```

### Idempotency matters

Because a queue can redeliver a job (consumer crashes mid-processing, network blip acking the job, etc.), job processors must be safe to run more than once for the same input - e.g. checking "has a confirmation already been sent for this appointment" before sending again, or using the payment gateway's own idempotency key so a retried "authorize payment" job doesn't double-charge.

### Cron/scheduled jobs

```typescript
@Injectable()
export class PaymentReconciliationJob {
  @Cron('0 */15 * * * *') // every 15 minutes
  async reconcilePendingPayments() {
    const pending = await this.paymentsService.findStalePending();
    for (const payment of pending) {
      await this.paymentsService.reconcileWithGateway(payment);
    }
  }
}
```

Useful as a safety net even when webhooks are the primary mechanism - webhooks can be missed/delayed, so a periodic reconciliation job catches anything that fell through.

### Interview questions

**Q: Why not just send the confirmation email synchronously inside the appointment-creation request?**
> "Because it couples the success of booking an appointment to the availability and latency of a third-party email/SMS provider. If that provider is slow or briefly down, the user's booking request would hang or fail for a reason that has nothing to do with whether the appointment itself was successfully created. Queuing it lets the booking succeed immediately and the notification retry independently with backoff if it fails."

**Q: How do you handle a background job that fails halfway through, gets retried, and might run twice?**
> "Design the job to be idempotent - checking existing state before acting (e.g. 'has a confirmation already been recorded for this appointment') or using an idempotency key with any external API involved (many payment gateways support this explicitly, so a retried authorize call doesn't double-charge). I also configure limited retries with exponential backoff, and route jobs that exhaust retries to a dead-letter/failed state that's visible for manual investigation rather than silently disappearing."

**Q: For VetApp's payment flow, would you rely purely on the payment provider's webhook, or something else too?**
> "Primarily the webhook for near-real-time reconciliation, but webhooks can be delayed, missed, or received out of order, so I'd back it with a periodic reconciliation job - a cron task that polls the gateway's status for any payment stuck in a pending state past a reasonable window. That way a missed webhook doesn't leave a payment permanently unreconciled."

---

## 6. Recognizing a blocked/degraded event loop in production

### Topics to learn
- [ ] Symptoms: increasing request latency across the board (not just one endpoint), health checks timing out, WebSocket heartbeats missed
- [ ] Event loop lag / delay metrics (measuring the gap between scheduling and executing a trivial timer, as a proxy for how busy the loop is)
- [ ] Common culprits: synchronous JSON parsing of huge payloads, synchronous crypto/compression, large synchronous loops/sorts, blocking `fs` calls (`readFileSync`) in a hot path
- [ ] Fixes: move heavy CPU work to worker threads or a separate service, use async/streaming APIs, paginate/limit payload sizes, offload to background jobs

### Interview question

**Q: Production API latency has degraded across *every* endpoint, not just one - how do you investigate?**
> "That pattern - latency degrading globally rather than on one route - points at something blocking the shared event loop rather than a single slow query. I'd check for event loop lag metrics, look for recently deployed code doing synchronous heavy lifting (large JSON parsing, synchronous crypto, blocking `fs` calls), and check whether a burst of traffic triggered a code path that's CPU-heavy per request under load in a way it wasn't under light testing. The fix is almost always moving that work off the main thread - a worker thread, a queue/background job, or an external service - rather than trying to make the blocking code marginally faster."

---

## Full interview question bank (rapid fire)

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

## Hands-on drills

- [ ] Write a script that logs the order of `process.nextTick`, `Promise.resolve().then()`, `setTimeout(fn, 0)`, and `setImmediate(fn)` - run it and confirm the ordering matches your mental model.
- [ ] Implement a streamed file upload handler using `pipeline()` and verify memory stays flat for a large file.
- [ ] Configure PM2 in cluster mode locally (`pm2 start dist/main.js -i max`) and confirm requests are load-balanced across workers.
- [ ] Implement `app.enableShutdownHooks()` + an `OnApplicationShutdown` hook that closes a DB connection; send `SIGTERM` and confirm it fires.
- [ ] Set up a BullMQ queue + processor for a fake "send confirmation" job with retries and backoff; force a failure and watch the retry behavior.
- [ ] Write a `@Cron()` reconciliation job skeleton and explain out loud why it exists alongside webhooks.

---

## Senior red flags / green flags

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

## Tie-backs to your experience

- **VetApp**: background jobs for asynchronous processing (payment reconciliation, notifications) - your primary, concrete story for this entire chapter, explicitly called out on your CV.
- **Freelance / Travel2Georgia**: Docker/Nginx/VPS deployments imply direct exposure to process management, graceful restarts, and production reliability concerns beyond just application code.
- **Wizer / EasyPay crash-rate work**: while mobile-side, the debugging discipline (classify -> reproduce -> fix -> prevent) transfers directly to diagnosing backend production issues like event loop stalls.

---

## Mastery checklist

- [ ] I can explain the event loop phases and microtask ordering without notes.
- [ ] I can explain streams/backpressure and why they matter for file uploads.
- [ ] I can explain clustering/PM2 and the shared-state gotcha it introduces.
- [ ] I can design correct process-level and request-level error handling, including graceful shutdown.
- [ ] I can design an idempotent background job system and justify it with the VetApp payment/notification story.
- [ ] I can diagnose "global latency degradation" as a likely event-loop-blocking issue.
