# Essential NestJS — Advanced

3-day essential set. 20 questions in preparation order. Full handbook remains under `nestjs/`.

### NEST-120 — ContextId

**Difficulty:** Senior

**Category:** ModuleRef and ContextId

**Question:**

What is a `ContextId`, and who creates it?

**Answer:**

A `ContextId` identifies one dependency-injection sub-tree. Providers resolved under the same id share their scoped instances. A different id gets a separate set of instances. Nest creates one id for each HTTP request and uses it for the request-scoped graph of that request. You create your own with `ContextIdFactory.create()` when there is no HTTP request to borrow. The id is the unit of sharing. It is not a scope by itself.

**Follow-up:**

When do you create a `ContextId` yourself?

Answer: When you resolve request-scoped providers outside an HTTP request, such as in a cron job, a queue consumer, or an event handler.

### NEST-148 — Scope of global enhancers

**Difficulty:** Staff

**Category:** Enhancers and lifecycle

**Question:**

What does scope mean for `APP_GUARD`, `APP_INTERCEPTOR`, and the other global enhancers?

**Answer:**

A global enhancer registered with `useClass` or `useFactory` follows ordinary scope rules. If that provider is request-scoped, or if it depends on a request-scoped provider, Nest constructs it per request and stores it on the per-request enhancer list. Otherwise it is one singleton on the static global list, created at startup and reused for every route. A request-scoped global guard does not pull controllers into request scope. Bubbling follows who injects whom, and a controller does not inject the guard.

**Trade-offs:**

A request-scoped global guard can hold per-request collaborators, and it pays construction cost on every route. Reading the `ExecutionContext`, or looking up context from a singleton, keeps the guard shared.

**Follow-up:**

Does a request-scoped global guard make every controller request-scoped?

Answer: No. The guard is created per request. A controller stays a singleton unless it depends on a request-scoped provider itself.

### NEST-158 — Refresh token rotation

**Difficulty:** Senior

**Category:** JWT

**Question:**

What is refresh token rotation, and how does reuse detection work?

**Answer:**

With rotation, every refresh gives you a new refresh token and invalidates the old one. If an old token shows up again, someone is replaying it, either an attacker or the real user with stale state. At that point the server revokes the whole token family, meaning all tokens from that login, and forces a fresh sign-in. To implement it, store a `family` id and fields like `usedAt` or `revokedAt` on each token record.

**Trade-offs:**

Rotation reduces the value of a stolen refresh token, but it adds a database write on every refresh. Flaky networks or multiple browser tabs can also trigger false alarms.

**Follow-up:**

How do you handle two parallel refresh calls from the same legitimate client?

Answer: On the client, share a single in-flight refresh request. On the server, you can also allow a short grace window where the just-rotated token is accepted once more.

### NEST-215 — [Both] How do you propagate a transaction without passing `tx` everywhere

**Difficulty:** Senior

**Category:** Unit of Work

**Question:**

[Both] How do you propagate a transaction without passing `tx` everywhere?

**Answer:**

Use `AsyncLocalStorage`, which keeps context that follows a request through async calls. In Nest, the `nestjs-cls` package does this, and `@nestjs-cls/transactional` provides adapters for TypeORM and Prisma. Another option is the `typeorm-transactional` package. You start the transaction once, and repositories read the current transaction from that context. This avoids adding a `tx` parameter to every method between your service and your repositories.

**Follow-up:**

What is the downside?

Answer: It is implicit magic. Code that runs outside the context silently runs without a transaction. Add tests, and keep the boundary visible with a `@Transactional()` decorator.

### NEST-287 — How do you implement idempotency keys in Nest

**Difficulty:** Senior

**Category:** Idempotency

**Question:**

How do you implement idempotency keys in Nest?

**Answer:**

Use an interceptor or guard that reads the header. It atomically inserts a record such as `(key, userId, requestHash, status = in_progress)`, using a unique constraint or Redis `SET NX`. Then it runs the handler and saves the status and response body. On a repeat, it returns the stored response. If the same key arrives with a different payload hash, reject it with 422 or 409. Give records a TTL, such as 24 hours.

**Follow-up:**

What about concurrent duplicate requests?

Answer: The atomic insert or lock lets only one request run. The others either wait, or receive `409 Conflict` for "in progress", ideally with a `Retry-After` header.

### NEST-307 — What Redis stores for BullMQ, and what it does not promise

**Difficulty:** Senior

**Category:** Queues

**Question:**

What is Redis responsible for in a BullMQ setup, and which failure still loses jobs?

**Answer:**

BullMQ keeps payloads, wait lists, locks, and retry state in Redis. The Nest process can die, and another worker can continue, because the queue is not in memory. Redis is not an infinite archive. Flushing a database, losing a primary with no replica, or turning on eviction under memory pressure can delete job keys. Use a Redis dedicated to queues, with eviction off, and persistence that matches how much in-flight work you can afford to lose. The business record still belongs in your main database. The queue is only the in-flight copy.

**Follow-up:**

How is this different from Nest’s Redis microservice transporter?

Answer: BullMQ uses Redis as a data store for job lists. The Redis transporter uses pub/sub to pass messages and does not keep them. Same product, different use, and one does not replace the other.

### NEST-314 — Why queue concurrency breaks ordering

**Difficulty:** Senior

**Category:** Ordering

**Question:**

Why is “the queue is FIFO” not enough once a Nest BullMQ worker runs more than one job at a time?

**Answer:**

A single worker with concurrency 1 takes jobs in queue order and finishes them in that order. As soon as several jobs run at once, a later short job can finish before an earlier slow one. Retries make this worse: a failed job goes to the back, or waits on backoff, while newer jobs pass it. Delays and priorities reorder work on purpose. If two events for the same order must happen in sequence, do not rely on global queue order. Serialize work for that id, or use a system that orders by key. Parallelism across unrelated ids is fine.

**Follow-up:**

Does priority restore correctness?

Answer: No. Priority only changes who runs first. It does not wait for an earlier job on the same entity to finish, and retries still jump the line.

### NEST-338 — At-least-once plus idempotency

**Difficulty:** Staff

**Category:** Idempotency

**Question:**

Why do senior Nest teams aim for at-least-once delivery plus an idempotent consumer, instead of exactly-once?

**Answer:**

Exactly-once would mean the real effect happens one time across crashes: one charge, one email, one row. A broker can dedupe its own log, but the effect usually sits outside that log, in Postgres, a payment API, or a mail provider. Those systems do not share one atomic commit with the message ack. If you ack first, you can lose the message. If you ack after the effect and crash before the ack, the next delivery repeats it. The workable contract is at-least-once transport plus a handler that makes a repeat a no-op.

**Follow-up:**

When is at-most-once acceptable?

Answer: When dropping a message is cheap and repeating it is not, such as a live metrics ping. Do not use it for money or for state the user was promised.

### NEST-169 — Revocation and blacklist trade-offs

**Difficulty:** Senior

**Category:** Revocation

**Question:**

What are the trade-offs of a token blacklist versus other revocation strategies?

**Answer:**

A denylist, for example a Redis set of token `jti` values that expires when the token would, revokes tokens immediately. The price is a lookup on every request. Alternatives include very short access token lifetimes, a per-user `tokenVersion` or "valid after" timestamp, and token introspection. Most apps only revoke refresh tokens and accept that an access token may stay valid for a few more minutes.

**Trade-offs:**

Immediate revocation costs a lookup, and a new failure point, on every request. Short lifetimes avoid that but mean more refresh traffic.

**Follow-up:**

Why is a per-user `tokenVersion` often cheaper than a per-token blacklist?

Answer: It's one small value per user that you can cache, and changing it invalidates all of that user's tokens at once. A blacklist needs an entry for every revoked token.

### NEST-112 — Async providers

**Difficulty:** Senior

**Category:** Custom providers

**Question:**

How do async providers work, and how do they affect application startup?

**Answer:**

An async provider is a `useFactory` that returns a Promise. Nest awaits that Promise before it hands the value to anything that depends on the token, so consumers see the resolved client rather than the Promise itself. Startup does not finish until every async provider has settled. A database connection or a remote config load belongs here when the rest of the graph cannot run without it. The cost is that a slow factory delays `listen()`.

**Follow-up:**

What happens if the factory rejects?

Answer: Application startup fails. Put a timeout and any retry inside the factory if a slow or flaky dependency should not take the process down immediately.

### NEST-191 — Tenant isolation below the auth layer

**Difficulty:** Staff

**Category:** Multi-tenant

**Question:**

How do you enforce tenant isolation beyond the auth layer?

**Answer:**

Enforce it where the data lives. Always scope queries by `tenantId`, for example through a base repository or ORM global filters. Or use Postgres Row-Level Security, setting `SET LOCAL app.tenant_id` inside each transaction. Request-scoped providers can carry the tenant, but scope spreads up the dependency chain. `AsyncLocalStorage`, for example through `nestjs-cls`, is lighter. Also write tests that deliberately try cross-tenant access.

**Trade-offs:**

Application-level filtering is easy, but one forgotten `where` leaks data. Row-Level Security is safer, but adds database complexity and needs careful connection and transaction handling.

**Follow-up:**

What are the performance implications of request-scoped providers carrying the tenant?

Answer: Every request creates a new instance of the provider and everything that depends on it. That adds allocation and garbage collection cost, and those providers lose singleton behavior.

### NEST-325 — Two instances: a copy each, or shared work

**Difficulty:** Senior

**Category:** Messaging patterns

**Question:**

If you run two copies of a Nest consumer, which transporters give both a copy of each message, and which make them share the work?

**Answer:**

Redis pub/sub gives every subscriber a copy. If both pods send the welcome email, you send it twice. Kafka does the opposite inside one consumer group: partitions are split, so each record is handled by one member. A second group gets its own copy, which is what you want for a separate service. NATS depends on the queue group. Members of the same group share messages. TCP does not broadcast. It calls the address you configured. Decide this before you scale. “It worked with one pod” hides whether you are duplicating side effects or dropping subscribers.

**Follow-up:**

How should two replicas of the same email consumer be set up on Kafka?

Answer: Give them the same `groupId` so only one sends each message. A new service that also needs the event gets a different group id and its own copy.

### NEST-330 — When CQRS is unnecessary

**Difficulty:** Intermediate

**Category:** CQRS

**Question:**

When is adding `@nestjs/cqrs` the wrong simplification for a Nest service?

**Answer:**

Skip it when one service method can read and write a single model clearly. A CRUD screen does not become easier as a command class, a handler, a query class, and an event. You add files and an in-process bus without a second read model or a real domain split. Use the module when write rules are rich, when the view is shaped differently from the tables, or when several handlers must react to one local outcome. Starting with the buses on day one often hides a simple flow behind indirection.

**Follow-up:**

What is a smaller first step?

Answer: A plain service method with a clear name. If the same outcome later needs extra reactions, introduce an event then, and only across a process boundary if another app must see it.

### NEST-367 — Request-scoped providers and resolve

**Difficulty:** Senior

**Category:** TestingModule

**Question:**

How do you test a request-scoped provider?

**Answer:**

`moduleRef.get()` will not hand you a request-scoped provider. Nest expects `await moduleRef.resolve(ReportService)`. Each `resolve()` without a context id builds a new context, so you get a new instance and new request-scoped dependencies. That matches production, where each HTTP request gets its own subgraph. Register the scope the same way you do in the app, with `@Injectable({ scope: Scope.REQUEST })`, so the test is about the real wiring and not a singleton copy you created only for the spec.

**Follow-up:**

How do you share one fake request between a scoped service and a scoped repository?

Answer: Create a context id with `ContextIdFactory.create()`, register a request object with `registerRequestByContextId`, then `resolve` both tokens with that same id. They then share one request. A bare `resolve()` would build a second request and hide bugs that depend on shared request state.

### NEST-382 — Globals that live only in main.ts

**Difficulty:** Senior

**Category:** HTTP tests

**Question:**

Why do global pipes and filters disappear in tests that boot `AppModule`?

**Answer:**

`NestFactory.create` returns an app, and the lines after it in `main.ts` call `useGlobalPipes`, `useGlobalFilters`, `setGlobalPrefix`, and `enableVersioning`. `Test.createTestingModule({ imports: [AppModule] })` compiles the module graph only. `createNestApplication()` does not replay `main.ts`. The test app has your controllers and lacks those globals, so requests skip validation or hit unprefixed paths. The suite then passes against a different application than production. Move those calls into one function both bootstraps invoke.

**Follow-up:**

How do you test the global prefix without copying it into every spec?

Answer: Export `configureApp(app)` and call it from `main.ts` and from the e2e helper before `init()`. One spec requests `/api/cats` and expects 200, and requests `/cats` and expects 404, when the prefix is `api`. A new global filter then has a single place to live.

### NEST-413 — One limit across many pods

**Difficulty:** Senior

**Category:** Rate limiting

**Question:**

Four Nest pods use the default Throttler storage. The limit is 100 per minute. Why does a client get far more than that through, and what storage fixes it?

**Answer:**

The default storage is a `Map` in the process. Each pod counts to 100 on its own, so four pods allow about 400 requests as the load balancer spreads them. Implement `ThrottlerStorage` with Redis and pass it to `forRoot`. `increment` has to be atomic: one key, one increment, one TTL, one round trip. A GET followed by a SET lets two pods both read 99 and both allow the request. Decide what happens when Redis is down. Failing open on a password route drops the control you added it for.

**Follow-up:**

Is an application lock around the guard required if Redis `INCR` is atomic?

Answer: No. One Lua script or a transaction that increments and sets the expiry is enough. You do need the TTL to match the window you designed, and you should test two processes against one Redis before trusting the limit.

### NEST-441 — Stampede and invalidation

**Difficulty:** Staff

**Category:** Caching

**Question:**

A popular cache key expires and fifty Nest requests rebuild it at once. How do you stop that, and how do you invalidate on write?

**Answer:**

That herd is a stampede: many misses and many identical queries. Let one request compute while the others wait, or serve a slightly stale value while one worker refreshes. A Redis `SET key lock NX` with a short expiry picks the winner, and the expiry matters so a crashed winner does not block the key. On update or delete, remove keys you can name, such as `user:${id}:profile`. Caching whole search pages makes deletion a guess, so use a short TTL when you cannot name the keys. `cache.reset()` on every write clears the store and starts a new stampede.

**Follow-up:**

The refresh throws and you cache nothing. What should callers get?

Answer: If you drop the last good value, every waiter misses again and the database takes the hit you were avoiding. Keep the stale DTO, set a short backoff, and log the failure. Return `503` only when you have nothing stale and the dependency is down.

### NEST-468 — Request context and CLS

**Difficulty:** Intermediate

**Category:** multi-tenancy / context

**Question:**

How does Nest request context with CLS support enterprise cross-cutting concerns?

**Answer:**

A CLS middleware or interceptor stores tenant id, user id, and correlation id for the request lifetime. Downstream services, repositories, and loggers read the store instead of prop-drilling. That enables silent tenant filtering and consistent logs. Trade-off: hidden globals hurt readability and testing if overused; also CLS must be initialized correctly for queues and cron, or background jobs inherit empty or wrong context.

**Follow-up:**

Does CLS automatically propagate into Bull processors?

Answer: Not by default—you must copy correlation/tenant fields into job data and re-enter CLS in the processor.

### NEST-480 — Circuit breakers for HttpService

**Difficulty:** Senior

**Category:** resilience

**Question:**

How would you add circuit breaking around Nest `HttpService` calls to dependencies?

**Answer:**

Wrap outbound calls with a library like opossum or a resilience interceptor that opens the circuit after error thresholds, then fails fast or serves fallback. Pair with timeouts so hung sockets do not exhaust the pool. Result protects your Nest process from cascading latency. Trade-off: open circuits cause user-visible degradation—define fallbacks and alert on open state, or operators discover outages only when SLOs burn.

**Follow-up:**

Is a global circuit for all hosts wise?

Answer: No—isolate per dependency; one bad host must not trip calls to healthy services.

### NEST-490 — When NOT to split a Nest service

**Difficulty:** Staff

**Category:** architecture boundaries

**Question:**

When should a Staff engineer argue against splitting a Nest service?

**Answer:**

Do not split when the only pain is code organization, when teams still share one database schema, or when call volume does not justify network cost. Prefer modular monolith boundaries first. Splits multiply failure domains, versioning, and on-call. Argue for split when independent scale, regulatory isolation, or separate team deploy cadence are proven. The wrong split creates a distributed monolith—worst of both worlds—visible as cascading timeouts and shared DB locks across “services.”

**Follow-up:**

What signal suggests a module should become a service?

Answer: Independent scaling needs, divergent SLOs, or a team boundary that must deploy without coordinating the whole monolith.
