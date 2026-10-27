# NODE10 — Advanced design

Node.js 20/22 advanced application design and architecture. Leave event-loop micro-details in NODE02, raw streams API in NODE04, HTTP server basics in NODE05, error taxonomy in NODE06, heap/GC tuning in NODE07, crypto/XSS/SSRF in NODE08, test runners/ops tooling in NODE09.

### NODE-451 — Controllers, use-cases, and domain layers

**Difficulty:** Junior

**Category:** layering

**Question:**

How do you structure a Node.js HTTP app into controllers, use-cases, and domain without Nest or Express “fat routes”?

**Answer:**

I keep HTTP adapters thin: a controller parses the request, calls one use-case, and maps the result to status and body. Use-cases orchestrate application rules—load aggregates, enforce policies, call ports. Domain holds entities and pure business rules with no Express or database imports. Infrastructure implements repositories and clients behind interfaces. That split lets me test use-cases with fakes and swap Postgres for an in-memory store without rewriting business logic.

**Follow-up:**

Where does validation of query params belong?

Answer: Prefer controller or a dedicated request DTO mapper; keep domain free of HTTP shape.

### NODE-452 — Dependency inversion with factories

**Difficulty:** Intermediate

**Category:** dependency inversion

**Question:**

How do you wire dependency inversion in plain Node.js without a DI container?

**Answer:**

I define ports as TypeScript interfaces in the application layer, then implement adapters in infrastructure. At the composition root—usually `main.ts` or a `createApp` factory—I construct concrete clients, repositories, and use-cases and inject them as constructor arguments. Factories like `createOrderService({ db, bus, clock })` make dependencies explicit and keep modules free of `new Postgres()` imports. Tests pass fakes into the same factory. Avoid service locators that hide what a module needs.

**Follow-up:**

Why prefer constructor injection over importing singletons?

Answer: Explicit deps, easier testing, and clearer lifetime control per process or request.

### NODE-453 — Strategy pattern for pricing or auth

**Difficulty:** Intermediate

**Category:** design patterns

**Question:**

When would you use the Strategy pattern in a Node service?

**Answer:**

Strategy fits when one use-case has interchangeable algorithms selected at runtime—pricing rules by region, payment providers, or auth verifiers for JWT versus session cookies. I define a narrow interface like `PriceCalculator.calculate(cart)`, inject the chosen strategy into the use-case, and keep the orchestration path stable. New variants become new modules without editing a giant switch. In interviews I stress that Strategy is about swapping behavior, not about inventing classes for every if-statement.

**Follow-up:**

How do you choose the strategy at request time?

Answer: Map tenant, header, or config to a registry of strategies in the composition root.

### NODE-454 — Adapter around HTTP clients

**Difficulty:** Junior

**Category:** design patterns

**Question:**

Why wrap `fetch` or a third-party SDK behind an Adapter?

**Answer:**

An adapter translates our port—`PaymentsClient.charge(orderId, amount)`—into vendor-specific URLs, payloads, and error codes. The rest of the app never imports Stripe types or raw status parsing. When the vendor changes or we dual-run a mock in tests, only the adapter file moves. Adapters also normalize timeouts, retries policy hooks, and map vendor failures into our domain errors so use-cases stay readable.

**Follow-up:**

Should adapters throw vendor errors unchanged?

Answer: No—map to stable domain or application errors your callers understand.

### NODE-455 — Decorator for cross-cutting HTTP concerns

**Difficulty:** Intermediate

**Category:** design patterns

**Question:**

How do Decorators show up around clients or handlers in Node?

**Answer:**

A decorator wraps an existing port implementation and adds behavior—metrics, logging, caching, or auth headers—without changing the core adapter. For example `withTimeout(client, 2_000)` or `withMetrics(handler)` returns the same interface. Composition stays linear and testable: decorate in the factory, not inside business logic. It is the object-oriented cousin of middleware; I use it when I need the same interface after wrapping, not when I only need pipeline ordering for HTTP.

**Follow-up:**

Decorator versus middleware—when pick which?

Answer: Middleware for request pipelines; decorators when wrapping a typed port or client.

### NODE-456 — Circuit breaker basics

**Difficulty:** Intermediate

**Category:** resilience

**Question:**

Explain a circuit breaker around a downstream HTTP dependency.

**Answer:**

A circuit breaker tracks failures to a dependency. After a threshold, it opens and fails fast instead of waiting on timeouts that exhaust the event loop’s connection pool. After a cool-down it half-opens, allows a probe, and closes again on success. In Node I wrap the client adapter with open/half-open/closed state and short-circuit with a typed error so the use-case can degrade. It protects latency budgets when a neighbor is dying, not when your own code is buggy.

**Follow-up:**

What metric usually trips open?

Answer: Error rate or consecutive failures within a sliding window, plus timeout counts.

### NODE-457 — Retry with jitter

**Difficulty:** Intermediate

**Category:** resilience

**Question:**

How should retries be designed for idempotent outbound calls?

**Answer:**

Retry only when the operation is safe to repeat—GETs, or POSTs with an idempotency key. Use exponential backoff so you do not stampede a recovering service, and add full jitter so many instances do not retry in lockstep. Cap attempts and total budget so the user-facing request still meets its SLA. Log attempt count and classify which errors are retryable—429 and 503 yes, 400 usually no. Non-idempotent charges without a key should not blind-retry.

**Follow-up:**

Why is jitter important in multi-instance Node fleets?

Answer: Synchronized retries amplify load; jitter spreads the retry storm.

### NODE-458 — Bulkhead isolation

**Difficulty:** Senior

**Category:** resilience

**Question:**

What is a bulkhead in a Node application, and where do you apply it?

**Answer:**

A bulkhead partitions capacity so one slow dependency cannot starve everything else. In Node that often means separate connection pools, separate queues, or concurrency limits per downstream—for example at most twenty in-flight calls to payments and fifty to catalog. When payments saturates its bulkhead, catalog traffic still proceeds. I implement this with semaphores or pool size caps around adapters, not with vague “try harder” retries. Bulkheads complement circuit breakers: one limits concurrency, the other trips on failure patterns.

**Follow-up:**

How does this interact with the single-threaded event loop?

Answer: Caps pending I/O and memory; CPU work still needs workers if it is heavy.

### NODE-459 — Saga orchestration versus choreography

**Difficulty:** Senior

**Category:** distributed design

**Question:**

Compare saga orchestration and choreography for a multi-step order flow in Node.

**Answer:**

Orchestration uses a central coordinator that tells each step what to do and runs compensating actions on failure—clear visibility, easier timeouts, one place to reason. Choreography has services react to each other’s events—“PaymentSucceeded” triggers “ReserveInventory”—with less central coupling but harder tracing and compensation ownership. In a Node shop I lean orchestration for complex money paths and choreography for simple fan-out when teams own clear event contracts. Either way, document compensations; there is no free distributed transaction.

**Follow-up:**

Where do you put the orchestrator process?

Answer: Often a dedicated worker or use-case service, not inside every HTTP handler.

### NODE-460 — Transactional outbox

**Difficulty:** Senior

**Category:** messaging

**Question:**

What problem does the transactional outbox solve, and how do you implement it simply?

**Answer:**

Dual-write races happen when you commit a DB row then fail before publishing an event. The outbox writes the business change and an outbox row in the same database transaction; a poller or CDC process publishes outbox rows to the bus and marks them sent. Consumers see at-least-once delivery, so they must be idempotent. In Node the publisher is usually a small worker using the same Postgres client. This is the standard way to make “state change plus event” reliable without distributed 2PC.

**Follow-up:**

Can the outbox live in Redis instead of the DB?

Answer: Prefer the same transactional store as the business write; Redis loses that atomicity.

### NODE-461 — Inbox for idempotent consumers

**Difficulty:** Senior

**Category:** messaging

**Question:**

How does an inbox pattern give you consumer-side idempotency?

**Answer:**

An inbox table records processed message IDs. Before handling, the consumer inserts the ID with a unique constraint; if the insert conflicts, it skips or acknowledges as already done. Handling and the inbox mark should share a transaction with side effects when possible. That turns at-least-once delivery into effectively-once processing for that consumer’s side effects. I always design consumers assuming duplicates—exactly-once brokers are still an illusion across systems.

**Follow-up:**

What key do you store in the inbox?

Answer: Producer message ID or a deterministic hash of business keys plus event type.

### NODE-462 — worker_threads for CPU work

**Difficulty:** Intermediate

**Category:** concurrency

**Question:**

When should a Node service use `worker_threads` instead of staying on the main thread?

**Answer:**

Use workers for CPU-bound work that would block the event loop—image transforms, heavy crypto, large JSON parse/transform, compression of big payloads. Offload via `postMessage`, keep I/O and orchestration on the main thread, and size a small pool. Do not use workers for everyday DB awaits; that adds complexity for no gain. I mention that workers share the process, so a native crash can still take the whole service down compared to a separate process.

**Follow-up:**

How do you avoid cloning huge objects into workers?

Answer: Prefer transferable ArrayBuffers or SharedArrayBuffer with careful synchronization.

### NODE-463 — child_process for isolation

**Difficulty:** Intermediate

**Category:** concurrency

**Question:**

When prefer `child_process` over `worker_threads`?

**Answer:**

Choose a child process when you need stronger isolation—untrusted plugins, flaky native addons, or a hard memory ceiling per task. A crash kills the child, not necessarily the parent’s event loop. IPC is message-based over stdio or IPC channels, which is slower than workers but safer for containment. For PDF renderers or shell-adjacent tools that already expect a process boundary, `fork` or `spawn` is the honest design. Workers win when you need lower latency shared memory inside one trust domain.

**Follow-up:**

How do you bound runaway children?

Answer: Timeouts, kill signals, and cgroup/container memory limits around the child.

### NODE-464 — SharedArrayBuffer caution

**Difficulty:** Senior

**Category:** concurrency

**Question:**

What should interviewers hear about SharedArrayBuffer in Node design?

**Answer:**

SharedArrayBuffer lets workers share memory without structured clone, which is powerful for high-throughput pipelines and dangerous for races. You need Atomics for coordination; forgotten fences create heisenbugs. Security-wise, browsers restricted SAB due to Spectre; in Node you still must treat shared mutable state as a last resort. Prefer message-passing for most app architectures—clear ownership, easier reasoning. Reach for SAB only when profiling proves copy cost dominates and you can own the synchronization protocol.

**Follow-up:**

Default concurrency model you recommend?

Answer: Message-passing with immutable or owned payloads; SAB only when measured necessary.

### NODE-465 — Message-passing over shared mutable state

**Difficulty:** Junior

**Category:** concurrency

**Question:**

Why design Node concurrency around message-passing rather than shared mutable objects?

**Answer:**

Message-passing keeps ownership clear: one actor mutates its state, others send commands or events. That matches how workers, child processes, and external queues already work. Shared mutable globals across async handlers invite race conditions even on one thread when awaits interleave. Interview answer: design as if everything is eventually distributed—pass data, do not share pointers—unless you are inside a carefully locked worker pool with SharedArrayBuffer.

**Follow-up:**

Does single-threaded JS remove race conditions?

Answer: No—interleaved awaits still race on shared in-memory structures.

### NODE-466 — Backpressure across queues and HTTP

**Difficulty:** Senior

**Category:** backpressure

**Question:**

How do you design backpressure from an HTTP ingest path into an internal queue?

**Answer:**

If producers outrun consumers, unbounded queues explode memory. I size the queue, reject or slow accept when full, and propagate pressure: return 429/503 on HTTP, pause reads on streams, or stop pulling from upstream. Consumers should signal capacity—ack rates, free slots. In Node, pipe streams with respect for `drain`, and for job queues set max waiting jobs. Backpressure is a product decision too: drop, delay, or shed load with clear client semantics.

**Follow-up:**

What is wrong with “buffer everything in Redis”?

Answer: You moved the unbounded queue; failure just happens later and bigger.

### NODE-467 — Load shedding

**Difficulty:** Intermediate

**Category:** backpressure

**Question:**

What is load shedding, and when do you shed in a Node API?

**Answer:**

Load shedding deliberately drops or rejects work so the service stays healthy for critical traffic. When event-loop lag, queue depth, or in-flight count crosses a threshold, return fast failures for low-priority routes—search suggestions before checkout—and keep capacity for payments. Shedding beats serving everyone slowly until timeouts cascade. Implement checks at the edge middleware using cheap signals, not deep in domain code after expensive work has started.

**Follow-up:**

Shed before or after auth?

Answer: Cheap checks first; do not burn auth or DB on work you will discard.

### NODE-468 — Admission control

**Difficulty:** Senior

**Category:** backpressure

**Question:**

How does admission control differ from a simple rate limit?

**Answer:**

Rate limits often cap requests per key for fairness or abuse. Admission control decides whether the system has capacity to accept more work at all—based on concurrency tokens, queue depth, or latency SLO burn. A healthy system may still rate-limit one noisy tenant while admitting others; an overloaded system should refuse new admissions globally. In Node I use a semaphore of in-flight requests and reject when empty, combining tenant quotas with global concurrency caps.

**Follow-up:**

Where place admission control in the stack?

Answer: As early middleware after minimal routing, before heavy parsing or DB.

### NODE-469 — Idempotent POST design

**Difficulty:** Intermediate

**Category:** API design

**Question:**

How do you design an idempotent POST for creating a charge or order?

**Answer:**

Clients send an `Idempotency-Key` header; the server stores the key with the request hash and response. Replays with the same key return the same result without double-charging. Mismatched body for the same key should fail clearly. Persist the key in the same transaction as the side effect, with a TTL appropriate to your client retry window. This is how payment APIs stay safe under mobile retries and network timeouts.

**Follow-up:**

What if two different bodies share a key?

Answer: Reject as a client error; keys must bind to one payload intent.

### NODE-470 — Cursor pagination

**Difficulty:** Junior

**Category:** API design

**Question:**

Why prefer cursor pagination over `page=3&limit=20` for large Node APIs?

**Answer:**

Offset pagination skips rows with `OFFSET`, which gets slower and unstable when inserts shift pages. Cursor pagination returns an opaque cursor encoding a sort key—`created_at` plus `id`—and the next request continues from that point. Results stay consistent under append-heavy workloads and scale better. Teach clients that cursors are opaque; do not let them invent offsets. For admin UIs that need “jump to page 50,” offsets may still be fine on smaller datasets.

**Follow-up:**

What belongs inside the opaque cursor?

Answer: Stable sort fields, usually signed or encrypted to prevent tampering.

### NODE-471 — problem+json error responses

**Difficulty:** Junior

**Category:** API design

**Question:**

How do you shape API errors with `application/problem+json`?

**Answer:**

Problem Details gives a consistent JSON body: `type` URI, `title`, `status`, `detail`, and optional extensions like `traceId` or field errors. Clients branch on status and stable `type`, not on free-text messages. In Node, a central error mapper turns domain failures into problem documents so controllers stay thin. Avoid leaking stack traces; keep `detail` actionable for legitimate clients. This beats ad-hoc `{ error: "oops" }` shapes that drift per endpoint.

**Follow-up:**

Should `type` be a random string?

Answer: Prefer stable URIs or documented codes clients can rely on long-term.

### NODE-472 — API versioning without breaking clients

**Difficulty:** Intermediate

**Category:** API design

**Question:**

How do you version a Node HTTP API without breaking existing clients?

**Answer:**

Prefer additive evolution—new optional fields, new endpoints—before hard cuts. When you must break, version explicitly via URL prefix `/v2` or a negotiated header, keep old versions running with a deprecation window, and document migration. Avoid silent meaning changes to existing fields. Internally, share domain use-cases across versions and isolate only the HTTP mapping layer. Measure traffic per version so you know when v1 can die.

**Follow-up:**

Header versus path versioning—your default?

Answer: Path for public clarity and caching; headers when many media types already negotiate.

### NODE-473 — Workspace package boundaries

**Difficulty:** Intermediate

**Category:** package architecture

**Question:**

How do you draw workspace boundaries in a Node monorepo?

**Answer:**

Each package owns a clear responsibility—`domain-orders`, `infra-postgres`, `app-api`—with dependencies pointing inward toward domain, never the reverse. Apps compose packages; libraries do not import the HTTP server. Enforce with lint boundaries or dependency-cruiser so UI packages cannot reach DB clients. Publish only packages that need independent versioning; keep the rest private workspace packages. Boundaries exist to control coupling, not to create a folder per file.

**Follow-up:**

What is a smell in workspace graphs?

Answer: Cycles, or every package depending on a kitchen-sink `shared` blob.

### NODE-474 — Public exports map

**Difficulty:** Intermediate

**Category:** package architecture

**Question:**

Why define a package `exports` map carefully on modern Node?

**Answer:**

The `exports` field is the public API surface: only listed entry points are importable. That prevents consumers from reaching `dist/internal/foo.js` and coupling to private paths. You can expose `./package.json` and deep exports intentionally, and block the rest. For TypeScript, pair with `types` conditions so editors resolve correctly. Treat changing an export path as a breaking change. Deep imports without `exports` were an accidental API; close that door.

**Follow-up:**

Can consumers still require deep files?

Answer: On modern Node with `exports`, undeclared paths should fail—by design.

### NODE-475 — Dual CJS/ESM on Node 22

**Difficulty:** Senior

**Category:** package architecture

**Question:**

How do you approach dual CJS/ESM publishing carefully on Node 22?

**Answer:**

Prefer shipping native ESM with a clear `"type": "module"` when your audience is modern Node, or CJS-only if the ecosystem still requires it—dual packages are costly. If dual is required, use conditional `exports` with `import` and `require` pointing at separate builds, avoid dual-package hazard by not making the same module graph resolve to two copies, and test both loaders. Do not naively re-export CJS from ESM without checking `default` interop. Many teams now ESM-first with a thin CJS wrapper only when forced.

**Follow-up:**

What is the dual-package hazard?

Answer: Two instances of the same module break `instanceof` and singleton state.

### NODE-476 — When to publish internal packages

**Difficulty:** Junior

**Category:** package architecture

**Question:**

When should an internal Node library be published to a registry versus staying a workspace package?

**Answer:**

Publish when multiple repos need a versioned artifact—platform HTTP clients, auth middleware, logging—or when release cadence differs from the app. Stay private in the monorepo when only this repo consumes it and you want atomic changes. Publishing adds semver, changelogs, and CI; do not publish for vanity. Internal packages still need ownership, deprecation policy, and a clear public export surface.

**Follow-up:**

First consumer of a new platform package?

Answer: Usually your own apps in the same org before external teams.

### NODE-477 — Plugin and extension points

**Difficulty:** Intermediate

**Category:** extensibility

**Question:**

How do you design plugin extension points in a Node application?

**Answer:**

Define a narrow lifecycle interface—`register(app)`, `onStart`, `onStop`—and load plugins from config, not random `require` of user code mid-request. Pass only the ports plugins need; do not hand the whole DI container. Validate plugin contracts at boot. For untrusted plugins, isolate in child processes. Good extension points are intentional seams—auth strategies, payment providers—not “hook anywhere” that becomes an untestable spaghetti of order-dependent side effects.

**Follow-up:**

Where must plugins not run?

Answer: Avoid loading new plugin code per request on the hot path.

### NODE-478 — Middleware composition order

**Difficulty:** Junior

**Category:** extensibility

**Question:**

Why is middleware composition order an architectural decision?

**Answer:**

Order decides security and correctness: CORS and body size limits before parsers; authentication before authorization; request IDs early so logs correlate; error handlers last. Wrong order can parse huge bodies before rejecting, or authorize before authenticating. Document the pipeline as a designed sequence in one composition module. Treat middleware as a linear state machine of cross-cutting concerns, not a grab bag of random `app.use` calls scattered across files.

**Follow-up:**

Where put rate limiting relative to auth?

Answer: Often IP limits first, then stricter per-user limits after identity is known.

### NODE-479 — Branded types in TypeScript domain models

**Difficulty:** Intermediate

**Category:** domain modeling

**Question:**

How do branded types help domain modeling in TypeScript without Nest?

**Answer:**

Branded types make `UserId` and `OrderId` distinct at compile time even though both are strings at runtime. You define a nominal brand intersection and factory functions that validate format. That prevents accidentally passing an order id into `findUser`. They cost nothing at runtime and document intent. Pair with parsing at the boundary so untrusted strings become branded values once, then flow through pure domain functions safely.

**Follow-up:**

Do brands replace runtime validation?

Answer: No—factories still validate; brands preserve the proof afterward.

### NODE-480 — Result types versus throw

**Difficulty:** Intermediate

**Category:** domain modeling

**Question:**

When do you prefer Result types over throwing in Node/TS domain code?

**Answer:**

I use Result or Either for expected domain outcomes—validation failures, insufficient funds—so control flow stays explicit and typed. I throw or reject for truly exceptional infrastructure failures—DB down, programmer bugs—or map them at the edge. Mixing both is fine: domain returns `Err("OUT_OF_STOCK")`, adapters throw on socket errors which the use-case catches and converts. The interview point is intentionality: expected business paths should not rely on try/catch archaeology.

**Follow-up:**

How do Results interact with async?

Answer: `Promise<Result<T, E>>` or Result of awaitables; keep one convention per layer.

### NODE-481 — Transactional boundaries

**Difficulty:** Senior

**Category:** domain modeling

**Question:**

How do you define transactional boundaries in a use-case without an ORM “unit of work” framework?

**Answer:**

A use-case decides what must commit atomically—usually one aggregate write plus outbox rows. I open a transaction at the use-case start via a `UnitOfWork` or `db.transaction` port, pass the transactional client into repositories, and commit on success. Avoid transactions that span external HTTP calls; those need sagas. Keep boundaries small to reduce lock time. Infrastructure owns begin/commit/rollback; domain entities stay persistence-ignorant.

**Follow-up:**

Can two use-cases share one transaction?

Answer: Rarely—prefer composing in one use-case that owns the boundary.

### NODE-482 — EventEmitter versus external bus

**Difficulty:** Intermediate

**Category:** event-driven

**Question:**

When is Node’s EventEmitter enough, and when do you need an external bus?

**Answer:**

EventEmitter is in-process: great for decoupling modules inside one runtime—request lifecycle hooks, domain events handled before the response. It vanishes on crash, does not cross instances, and has no persistence. An external bus—Kafka, SQS, NATS—is for multi-instance, multi-service, durable workflows. Emitting “OrderPaid” only on EventEmitter in a horizontally scaled API will miss other pods. Use in-process for local reactions; use a bus when other processes must reliably observe the fact.

**Follow-up:**

Can you dual-publish to both?

Answer: Yes—local sync handlers plus outbox to the bus for remote consumers.

### NODE-483 — Poison messages

**Difficulty:** Intermediate

**Category:** event-driven

**Question:**

What is a poison message, and how should a Node consumer handle it?

**Answer:**

A poison message repeatedly fails processing—bad payload, bug, or permanent business rejection. Blind retries block the partition or queue. Design a max-attempt policy, then route to a dead-letter queue with the error context, alert, and stop retrying infinitely. Fix the consumer or data, then replay intentionally. Distinguish transient errors (retry with backoff) from permanent ones (DLQ immediately). Never ack success for failed side effects just to unblock the queue.

**Follow-up:**

Who owns replaying the DLQ?

Answer: Operators or a controlled replay tool after a fix, not automatic forever loops.

### NODE-484 — Exactly-once illusions

**Difficulty:** Senior

**Category:** event-driven

**Question:**

Why do you say “exactly-once” delivery is usually an illusion across Node services?

**Answer:**

Brokers may offer exactly-once within a closed ecosystem, but end-to-end you still have producer retries, consumer crashes after side effects, and multi-system writes. Practically you design for at-least-once plus idempotent consumers—inbox keys, upserts, conditional writes. Claiming exactly-once without stating the boundary misleads the team. Interview strength: name the boundary (Kafka transactions to Kafka consumers) and what still requires idempotency outside it.

**Follow-up:**

What is your default consumer assumption?

Answer: At-least-once; make handlers idempotent by design.

### NODE-485 — Avoiding sticky sessions

**Difficulty:** Junior

**Category:** multi-instance

**Question:**

Why avoid sticky sessions for a multi-instance Node API?

**Answer:**

Sticky sessions pin a user to one instance so in-memory session state works, but they hurt failover, autoscaling, and uneven load. Prefer external session stores or JWTs so any instance can serve any request. Sticky is a crutch for server-side memory you should not need. Design for cattle instances: lose one pod without logging users out. If WebSockets need affinity, isolate that concern and keep the REST tier stateless.

**Follow-up:**

Where do you put session data instead?

Answer: Redis or encrypted cookies/JWTs with short TTLs and refresh strategy.

### NODE-486 — Consistent hashing for in-memory caches

**Difficulty:** Senior

**Category:** multi-instance

**Question:**

How might consistent hashing help an in-memory cache across Node instances?

**Answer:**

If each instance caches hot keys in memory, random routing causes misses and stampedes. Consistent hashing maps keys to a preferred instance so related traffic shares a cache warmer. When nodes join or leave, only a fraction of keys remaps. It is a light coordination trick—not a full distributed cache like Redis. Use it carefully: still treat memory as a best-effort optimization, and keep Redis or the DB as source of truth for correctness.

**Follow-up:**

Why not always use Redis instead?

Answer: Local memory is cheaper and lower latency; hashing reduces duplication when you keep a local tier.

### NODE-487 — Multi-region request routing

**Difficulty:** Senior

**Category:** multi-region

**Question:**

What design constraints appear when a Node app runs in multiple regions?

**Answer:**

Latency, data residency, and conflict rules dominate. Prefer region-local reads with careful write affinity; avoid assuming a single global in-memory cache. Sessions and idempotency keys must live in stores replicated or routed correctly. Clocks skew—use server times carefully. Failover across regions needs health checks and degraded modes. Start with active-passive or regional primary for writes unless you truly need multi-primary and can own conflict resolution.

**Follow-up:**

What breaks first in naive multi-region?

Answer: Sticky assumptions, single-region Redis, and non-idempotent cross-region retries.

### NODE-488 — Evolutionary architecture mindset

**Difficulty:** Staff

**Category:** evolutionary architecture

**Question:**

What does evolutionary architecture mean for a Node platform, and how do you practice it?

**Answer:**

Evolutionary architecture plans for change: keep options open with clear module boundaries, automated checks that protect characteristics you care about, and incremental migration paths instead of big-bang rewrites. In a Node shop I invest in package seams, API compatibility tests, and fitness functions that fail CI when coupling or latency budgets regress. You choose reversible decisions—monolith first with extractable domains—over premature microservices. Staff-level answer ties structure to business change rate, not fashion.

**Follow-up:**

Give one concrete evolutionary tactic.

Answer: Strangler-fig a legacy Express app behind a facade while extracting one domain at a time.

### NODE-489 — Architecture fitness functions

**Difficulty:** Staff

**Category:** evolutionary architecture

**Question:**

What is an architecture fitness function, and give Node-relevant examples?

**Answer:**

A fitness function is an automated test that verifies an architectural characteristic continuously—dependency direction, max response time for a critical route, no imports from `infra` into `domain`, bundle size of a package, or event schema compatibility. They run in CI like unit tests but guard design, not just behavior. Examples: dependency-cruiser rules, contract tests between services, and a canary SLO check. Staff engineers define which characteristics matter and wire them so entropy cannot silently win.

**Follow-up:**

Who owns fitness function failures?

Answer: The team owning the characteristic—platform or product—with clear SLAs to fix.

### NODE-490 — Monolith versus services for a Node shop

**Difficulty:** Staff

**Category:** organizational architecture

**Question:**

How do you decide monolith versus services for a Node organization?

**Answer:**

Start from team boundaries, change frequency, and failure isolation needs—not from “Node scales out.” A modular monolith is often right: one deployable, clear packages, shared transaction story, simpler ops. Split a service when a domain needs independent scale, a different SLO, or a separate team release train, and when you can afford distributed failure modes. Avoid nanoservices that chat over HTTP for every screen. Staff judgment: optimize for cognitive load and operability, extract with a strangler when pain is proven.

**Follow-up:**

What false reason do you reject?

Answer: “We will microservices for performance” when the bottleneck is a query or N+1.

### NODE-491 — Owning platform libraries

**Difficulty:** Staff

**Category:** platform ownership

**Question:**

How should a Node platform team own shared libraries without becoming a bottleneck?

**Answer:**

Own a small set of high-leverage libraries—logging, HTTP client defaults, auth middleware, telemetry—with semver, migration guides, and a support channel. Prefer open contribution with CODEOWNERS over gatekeeping every PR. Deprecate ruthlessly; do not let three generations of clients live forever. Measure adoption and breakages. Platform success is paved roads that product teams prefer, not mandatory frameworks that freeze innovation. Document extension points so teams customize without forking.

**Follow-up:**

When refuse to put logic in a platform lib?

Answer: When it is product-specific business rules that would couple every app.

### NODE-492 — Composition root clarity

**Difficulty:** Junior

**Category:** layering

**Question:**

What is a composition root in a Node app, and why keep it dumb?

**Answer:**

The composition root is where you construct the object graph—read config, create DB pools, wire adapters into use-cases, start the HTTP server. Keeping it free of business rules makes dependencies obvious and startup failures early. Feature folders should not new up infrastructure; they receive ports. In serverless, each handler may have a tiny composition root, still avoiding hidden singletons initialized lazily mid-request when possible.

**Follow-up:**

Can use-cases import `process.env`?

Answer: Prefer injected config objects so tests and edges stay explicit.

### NODE-493 — Hexagonal ports and adapters naming

**Difficulty:** Junior

**Category:** layering

**Question:**

How do ports and adapters show up in everyday Node naming?

**Answer:**

A port is an interface the application needs—`OrderRepository`, `Clock`, `Mailer`. An adapter is a concrete implementation—`PostgresOrderRepository`, `SystemClock`, `SendGridMailer`. Driving adapters call in (HTTP controllers); driven adapters are called out (DB, queues). Naming ports by intent and adapters by technology keeps the hexagonal idea practical without ceremony. Interviews care that you can point to folders and say which way dependencies point.

**Follow-up:**

May domain import an adapter?

Answer: No—dependency rule forbids domain depending on infrastructure.

### NODE-494 — Retry budgets and deadlines

**Difficulty:** Senior

**Category:** resilience

**Question:**

How do retry policies interact with overall request deadlines?

**Answer:**

Every inbound request should carry a deadline or remaining time budget. Retries must fit inside that budget; otherwise you retry after the client has already given up and waste capacity. Propagate cancellation with `AbortSignal` through adapters. Cap attempts so worst-case latency stays under the SLO. Nested services each retrying multiply work—prefer retry at one layer with clear ownership. Staff-adjacent senior answer: budgets beat infinite resilience settings copied from blogs.

**Follow-up:**

What do you pass downstream?

Answer: Remaining timeout or deadline timestamp plus correlation IDs.

### NODE-495 — Queue workers as first-class design

**Difficulty:** Intermediate

**Category:** concurrency

**Question:**

Why treat background workers as part of the same design as the HTTP API?

**Answer:**

Workers run the same use-cases and domain rules with a different driving adapter—queue message instead of HTTP. Sharing packages avoids duplicating business logic. Design visibility: metrics, poison handling, and concurrency limits belong in the worker composition root. Splitting “API repo” and “random scripts” causes drift. Deploy workers with the same version of domain code as the API that enqueued the job.

**Follow-up:**

Should workers call the HTTP API of the same service?

Answer: Prefer in-process use-cases; HTTP-to-self adds failure modes.

### NODE-496 — Graceful degradation strategies

**Difficulty:** Intermediate

**Category:** resilience

**Question:**

Give an example of graceful degradation in a Node feature design.

**Answer:**

If recommendations are down, return the product page without the carousel and a flag that personalization is unavailable, instead of failing the whole GET. Circuit-break the recommendations client, serve cached or empty secondary data, and keep checkout intact. Degradation is designed product behavior plus technical fallbacks—not an accident of try/catch swallowing. Document which dependencies are mandatory versus optional in the use-case.

**Follow-up:**

How do clients learn about degradation?

Answer: Partial responses, headers, or problem extensions—never silent wrong data.

### NODE-497 — Anti-corruption layer

**Difficulty:** Senior

**Category:** design patterns

**Question:**

When do you introduce an anti-corruption layer in a Node integration?

**Answer:**

When a legacy or vendor model would pollute your domain—weird enums, shared mutable DTOs, or CRUD shapes that do not match your aggregates—you place an ACL that translates inbound and outbound. Your domain speaks clean types; the ACL maps to the foreign language. This is Adapter at the bounded-context boundary. Without it, every use-case starts depending on vendor quirks and you can never replace the integration cleanly.

**Follow-up:**

ACL versus simple adapter—difference?

Answer: ACL protects a whole bounded context’s model, not just one client call.

### NODE-498 — Feature flags as design seams

**Difficulty:** Intermediate

**Category:** evolutionary architecture

**Question:**

How do feature flags act as architectural seams in Node services?

**Answer:**

Flags let you ship dark code, toggle strategies, and migrate gradually—new pricing Strategy behind a flag, or dual-run old and new paths with comparison. Keep flag checks at composition or use-case edges, not sprinkled through deep domain internals. Flags need ownership, cleanup dates, and defaults for failure of the flag service. They support evolutionary change when combined with metrics. Untended flags become permanent complexity debt.

**Follow-up:**

Where evaluate flags—edge or domain?

Answer: Prefer edge or use-case; keep core domain rules flag-free when possible.

### NODE-499 — Contract testing between packages

**Difficulty:** Senior

**Category:** package architecture

**Question:**

How do contract tests support package architecture in a monorepo?

**Answer:**

Contract tests assert that a provider package honors the shape consumers rely on—exported functions, event payloads, OpenAPI routes—without requiring a full end-to-end environment every time. In workspaces, consumer-driven contracts catch breaking export or schema changes before release. They complement fitness functions: one guards dependency direction, the other guards behavioral compatibility across package boundaries. Publish or merge only when contracts stay green.

**Follow-up:**

Are unit tests enough for public exports?

Answer: Not always—contracts capture cross-package expectations unit tests miss.

### NODE-500 — Designing for operability from day one

**Difficulty:** Staff

**Category:** platform ownership

**Question:**

As a staff engineer, what operability concerns must advanced Node design include from the start?

**Answer:**

Design for diagnosis: correlation IDs through HTTP and queues, structured logs, RED metrics on use-cases, explicit SLOs, and safe config rollout. Prefer stateless instances, clear backpressure, and documented failure modes over clever in-memory tricks. Platform libraries should bake in timeouts, telemetry hooks, and sane defaults so product teams inherit operability. Architecture that cannot be operated is incomplete. Staff ownership means paved roads for these concerns, not bolting dashboards on after the first outage.

**Follow-up:**

Name one non-negotiable default in platform HTTP clients.

Answer: Mandatory timeouts and abort propagation—no infinite hangs.
