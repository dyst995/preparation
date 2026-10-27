# NEST10 — Enterprise

NestJS 10 enterprise architecture. Leave Passport/JWT deep dive in NEST04, TypeORM/Prisma CRUD in NEST05, BullMQ basics in NEST07, TestingModule in NEST08, Helmet/throttle in NEST09.

### NEST-451 — Modular monolith vs microservices

**Difficulty:** Junior

**Category:** architecture boundaries

**Question:**

When is a Nest modular monolith the better default than jumping to microservices?

**Answer:**

At interview I say start with a Nest modular monolith when one team owns the product and deploy cadence is shared. Nest modules are your bounded-context seams; you still get clear ownership without network tax. Microservices help when independent scale, failure isolation, or separate release trains are real requirements. The production failure mode of splitting early is distributed debugging, duplicated auth, and chatty HTTP where a module import would have been enough.

**Follow-up:**

What Nest feature marks a context boundary without a network hop?

Answer: A Nest module’s `exports` array is the public API of that context; other modules import it instead of reaching into internal providers.

### NEST-452 — Bounded contexts as Nest modules

**Difficulty:** Junior

**Category:** modular design

**Question:**

How do you map DDD bounded contexts onto Nest modules in a large codebase?

**Answer:**

Each bounded context becomes one Nest feature module—or a small folder of modules under one domain folder—owning its controllers, application services, and persistence. Cross-context calls go through the module’s exported providers or application events, not direct entity imports. That keeps language and invariants local. The trade-off is discipline: without review, people import private repositories across modules and the “boundary” becomes fiction, which shows up as tangled migrations and unclear ownership when incidents hit.

**Follow-up:**

Should two contexts share the same TypeORM entity class?

Answer: Prefer not; shared entities couple schemas. Duplicate read models or map at the boundary if contexts diverge.

### NEST-453 — Public API via module exports

**Difficulty:** Junior

**Category:** modular design

**Question:**

What does Nest’s `exports` array mean for enterprise module design?

**Answer:**

`exports` is the only intentional surface other modules may inject. Everything else in the module stays private. That is how you encode a public API without inventing a framework. In production, leaking a repository by exporting it “just once” creates hidden coupling: a distant feature starts writing to your tables, then a schema change breaks unrelated services. Treat exports like a versioned interface and review every addition.

**Follow-up:**

Can you export a module to re-export its providers?

Answer: Yes—exporting an imported module re-exports that module’s exported providers, useful for facade or shared kernel modules.

### NEST-454 — Feature folder layout

**Difficulty:** Junior

**Category:** project structure

**Question:**

How would you organize folders for an enterprise Nest app with several domains?

**Answer:**

Group by domain feature, not by technical layer alone: `orders/`, `billing/`, each with module, controllers, application, domain, and infrastructure. Shared cross-cutting concerns live in `common/` or `platform/`. Layer-only trees (`controllers/`, `services/` globally) scale poorly because related code scatters. The trade-off of feature folders is occasional duplication of helpers; that is usually cheaper than a shared-everything folder that becomes a junk drawer.

**Follow-up:**

Where do global filters and interceptors belong?

Answer: In a platform or core module imported once in `AppModule`, not copied into every feature.

### NEST-455 — When Nest is the service boundary

**Difficulty:** Junior

**Category:** architecture boundaries

**Question:**

What does it mean that “Nest is the boundary” in an enterprise landscape?

**Answer:**

It means the deployable Nest application is the unit of scaling, ownership, and SLOs—not each module. Modules organize code inside that boundary. Teams often confuse module boundaries with service boundaries and over-split. Production pain appears as many tiny Nest apps with shared databases still coupled at the data layer. Be explicit: modules for cohesion inside one process; network boundaries only when you need independent deployability for real.

**Follow-up:**

Can two Nest apps share one database safely?

Answer: Only with clear ownership of tables; shared DB without contracts recreates a distributed monolith.

### NEST-456 — Hexagonal ports in Nest

**Difficulty:** Intermediate

**Category:** hexagonal architecture

**Question:**

How do you implement ports and adapters with Nest dependency injection?

**Answer:**

Define a port as an abstract class or interface token, bind it with a custom provider (`useClass` / `useFactory`) in the infrastructure module, and inject the token into application services. Controllers and messaging adapters sit outside the domain core. Nest’s DI makes swapping adapters for tests or vendors natural. The ceremony trade-off is more files and tokens; skip full hexagonal for CRUD-heavy modules where a simple service and repository are enough, or you drown juniors in indirection.

**Follow-up:**

Why prefer an abstract class over a TypeScript interface as a token?

Answer: Interfaces erase at compile time; abstract classes remain as runtime tokens Nest can inject without extra string symbols.

### NEST-457 — Injection tokens for adapters

**Difficulty:** Intermediate

**Category:** hexagonal architecture

**Question:**

How do string or Symbol tokens help when multiple adapters implement the same port?

**Answer:**

You register `PAYMENT_GATEWAY` as a Symbol token and provide Stripe or a mock via `useClass`. Application code never imports Stripe types. That keeps vendor SDKs at the edge. Failure mode in production is forgetting to provide the token in a feature module that imports the use case, which surfaces as a cryptic Nest DI error at bootstrap—catch it with module tests that compile the graph.

**Follow-up:**

Where should the token constant live?

Answer: Next to the port definition in the domain or application layer, not inside the Stripe adapter package.

### NEST-458 — Anti-corruption layer between modules

**Difficulty:** Intermediate

**Category:** modular design

**Question:**

What is an anti-corruption layer between Nest modules, and when do you need one?

**Answer:**

An ACL is a thin adapter that translates another context’s models and IDs into your language before your domain sees them. In Nest, that is often a facade service in your module that calls the other module’s exported API and maps DTOs. You need it when languages diverge—billing “Invoice” vs sales “Order.” Without it, foreign enums leak and every rename ripples. Trade-off: mapping cost and possible stale fields if you over-cache translated views.

**Follow-up:**

Is importing another module’s entity an ACL?

Answer: No—that’s coupling. An ACL maps at the boundary and keeps foreign types out of your domain.

### NEST-459 — CQRS CommandBus basics

**Difficulty:** Intermediate

**Category:** CQRS

**Question:**

When does `@nestjs/cqrs` CommandBus help in Nest, and when is it ceremony?

**Answer:**

CommandBus helps when write use cases need clear handlers, middleware-like behaviors, and separation from reads—especially with many side effects. Each command maps to one handler; controllers become thin. It is ceremony for simple CRUD where a service method is clearer. Production failure: fire-and-forget commands without knowing sync vs async, so API returns 200 before persistence finishes and clients retry into duplicates unless you design idempotency.

**Follow-up:**

Does CommandBus replace Nest providers?

Answer: No—handlers are still providers registered via `CqrsModule`; the bus is a dispatch mechanism, not a replacement for DI.

### NEST-460 — QueryBus and read models

**Difficulty:** Intermediate

**Category:** CQRS

**Question:**

How should QueryBus usage differ from CommandBus in an enterprise Nest service?

**Answer:**

Queries should be side-effect free and often hit optimized read models or projections rather than the write aggregate. QueryBus organizes those handlers the same way as commands. Keep commands and queries in separate folders so teams do not sneak writes into query handlers. Trade-off: dual models mean sync lag; if you promise strong consistency on the UI after a write, either read your own write carefully or accept eventual consistency with clear UX.

**Follow-up:**

Can a query handler call the CommandBus?

Answer: Avoid it—queries must not mutate. Trigger commands from the application API or controllers instead.

### NEST-461 — Domain events with EventBus

**Difficulty:** Intermediate

**Category:** CQRS / events

**Question:**

How do Nest CQRS domain events differ from calling services directly after a write?

**Answer:**

After a successful command, you publish domain events on the in-process EventBus so multiple handlers can react without the aggregate knowing them. That decouples “order placed” from email, inventory, and analytics. Mechanism is `@EventsHandler` providers. Failure mode: handlers throw and leave partial side effects if you treated in-process events as a transaction—pair critical reactions with outbox or explicit unit-of-work, not fire-and-forget EventBus alone.

**Follow-up:**

Are CQRS EventBus events durable across process restarts?

Answer: No—by default they are in-memory; use a broker or outbox for durability across instances.

### NEST-462 — Sagas vs process managers

**Difficulty:** Senior

**Category:** CQRS / orchestration

**Question:**

In Nest CQRS, when would you use a saga versus a simpler process manager style?

**Answer:**

A Nest `@Saga` listens to event streams and maps them to new commands—useful for long-running workflows spanning aggregates. A process manager is the same idea with more explicit state stored in the DB. Prefer explicit state when workflows must resume after deploy or crash. Pure RxJS sagas are easy to lose on restart if state lives only in memory. Trade-off: sagas add indirection; for two-step flows, a command handler calling another command or emitting one integration event is often enough.

**Follow-up:**

Should sagas call repositories directly?

Answer: Prefer emitting commands so write rules stay in command handlers; sagas orchestrate, they should not become a second domain layer.

### NEST-463 — Domain vs integration events

**Difficulty:** Intermediate

**Category:** events

**Question:**

What is the difference between domain events and integration events in a Nest enterprise app?

**Answer:**

Domain events are internal, fine-grained, and speak ubiquitous language inside a module. Integration events are stable contracts for other services or modules over a bus—often coarser and versioned. You translate domain “LineItemReserved” into integration “InventoryReservationConfirmed” at the boundary. Mixing them leaks internal names onto the wire; consumers break when you refactor private details. Always version integration payloads and keep domain events free to change.

**Follow-up:**

Who owns the integration event schema?

Answer: The producing bounded context, published as a versioned contract; consumers adapt, they do not dictate private domain names.

### NEST-464 — Outbox pattern with Nest and DB

**Difficulty:** Senior

**Category:** reliability / events

**Question:**

How do you implement the transactional outbox pattern with Nest and a relational database?

**Answer:**

In the same DB transaction as the business write, insert an outbox row. A Nest worker or scheduled poller reads unpublished rows and publishes to the broker, then marks them sent. That avoids “DB committed, Kafka publish failed.” Result is at-least-once delivery, so consumers must be idempotent. Trade-off: lag and operational load of the relay; skipping outbox for “just publish after save” causes silent lost messages under broker blips—the classic dual-write failure.

**Follow-up:**

Where does the outbox writer live in hexagonal Nest?

Answer: In the infrastructure adapter that participates in the unit of work / transaction with the repository.

### NEST-465 — Multi-tenancy: db-per-tenant

**Difficulty:** Intermediate

**Category:** multi-tenancy

**Question:**

When is database-per-tenant a good Nest multi-tenancy strategy?

**Answer:**

DB-per-tenant fits strong isolation, per-tenant backups, and noisy-neighbor control for enterprise customers. Nest resolves tenant from the request, then a connection factory or DataSource map selects that tenant’s DB. Cost is connection sprawl, migration fleets, and ops complexity. Production failure: connection pools exhaust when many tenants are hot, or a bug routes Tenant A’s request to Tenant B’s DataSource—guard with assertions on tenant id after resolve.

**Follow-up:**

How do you run migrations for hundreds of tenant databases?

Answer: Automate a migration runner that iterates tenant registry entries; never migrate only “the default” DB in prod.

### NEST-466 — Schema-per-tenant

**Difficulty:** Intermediate

**Category:** multi-tenancy

**Question:**

How does schema-per-tenant compare to db-per-tenant in Nest apps?

**Answer:**

Schema-per-tenant keeps one server but isolates tables per schema, often via `SET search_path` or qualified names after resolving tenant in middleware. It balances isolation and ops cost better than fully separate databases. Limits appear with connection pooling (search_path sticky state) and engine support. Failure mode: pooled connections leak the previous tenant’s search_path—always set and reset schema per request or use dedicated connections carefully.

**Follow-up:**

Is schema-per-tenant portable across MySQL and Postgres?

Answer: Postgres schemas map cleanly; MySQL “schema” equals database, so the model blurs toward db-per-tenant.

### NEST-467 — tenant_id column strategy

**Difficulty:** Intermediate

**Category:** multi-tenancy

**Question:**

How do you safely implement shared-schema multi-tenancy with a tenant_id column in Nest?

**Answer:**

Resolve tenant into request context (CLS or AsyncLocalStorage), and enforce tenant_id on every query via repository helpers or ORM filters. It is cheapest operationally and fine for many SaaS apps. The catastrophic failure is a missing WHERE clause that leaks rows across tenants. Mitigate with automated tests, row-level security if the DB supports it, and forbid raw queries without tenant predicates in code review.

**Follow-up:**

Why is CLS useful here?

Answer: Continuation-local storage carries tenant id through async Nest handlers without threading it through every method signature.

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

### NEST-469 — URI vs header API versioning

**Difficulty:** Intermediate

**Category:** API versioning

**Question:**

At scale, when do you prefer URI versioning versus header versioning in Nest?

**Answer:**

URI versioning (`/v1/...`) is explicit, cache-friendly, and easy for gateways and docs—Nest supports it natively. Header or media-type versioning keeps URLs stable and suits hypermedia-heavy APIs, but is harder to debug in browsers and CDNs. Enterprises often standardize on URI for public APIs. Failure mode: forever supporting every version without a deprecation policy, so the codebase accumulates dead controllers—pair versioning with sunset headers and a kill schedule.

**Follow-up:**

Can Nest run multiple versions in one app?

Answer: Yes—enable versioning and annotate controllers or routes with version metadata so v1 and v2 coexist.

### NEST-470 — BFF with Nest

**Difficulty:** Intermediate

**Category:** BFF / composition

**Question:**

What role does a Nest BFF play in an enterprise frontend landscape?

**Answer:**

A Backend-for-Frontend is a Nest app tailored to one client experience—web or mobile—aggregating downstream services into page-shaped DTOs. It owns auth cookie bridging, payload shaping, and UI-specific caching. That protects core domain services from UI churn. Trade-off: BFFs can become god aggregators; keep them thin and avoid putting core business invariants only in the BFF, or mobile and web diverge on critical rules.

**Follow-up:**

Should the BFF own the source of truth for orders?

Answer: No—domain services own writes; the BFF composes reads and adapts for the client.

### NEST-471 — GraphQL federation vs REST modules

**Difficulty:** Senior

**Category:** API composition

**Question:**

When would you lightly prefer GraphQL federation over a REST modular Nest monolith?

**Answer:**

Federation helps when many teams expose subgraphs and clients need flexible graphs across ownership boundaries. Nest can host a subgraph; a gateway composes them. Prefer REST modular monolith when one team owns the surface and predictability matters more than client-driven queries. Federation’s failure modes are N+1 across services, shared types drift, and hard latency SLOs. Do not federate just because GraphQL is fashionable—start with Nest modules and REST/BFF until team topology demands subgraphs.

**Follow-up:**

Does federation remove the need for bounded contexts?

Answer: No—subgraphs should still align to contexts; federation is a composition layer, not a substitute for domain boundaries.

### NEST-472 — Nest CLI monorepo apps and libs

**Difficulty:** Intermediate

**Category:** monorepo

**Question:**

How does the Nest CLI monorepo (`apps/` + `libs/`) support enterprise multi-app setups?

**Answer:**

You keep multiple Nest applications and shared libraries in one workspace with path aliases and a single toolchain. Shared libs hold DTOs, auth utilities, and config schemas. Apps stay deployable units. Benefit is consistent upgrades; risk is a shared kernel that every app imports for everything, creating a rewrite blast radius. Treat libs as versioned products with clear owners, not a dumping ground.

**Follow-up:**

When should a lib become its own npm package?

Answer: When release cadence or consumers outside the monorepo diverge enough that workspace coupling slows you down.

### NEST-473 — Shared kernel risks

**Difficulty:** Senior

**Category:** monorepo

**Question:**

What goes wrong when Nest monorepo “shared” libraries become a shared kernel?

**Answer:**

A shared kernel that holds domain entities, enums, and business rules for all apps forces lockstep deploys and spreads breaking changes everywhere. Result is fear of refactoring and giant PRs. Keep shared libs for truly generic platform code—logging, config, openapi helpers—and duplicate or publish versioned contracts for domain language. Trade-off of duplication is temporary inconsistency; that beats a kernel nobody can change safely.

**Follow-up:**

How do you version internal packages inside a monorepo?

Answer: Use workspace versioning or changesets; consumers pin ranges and CI fails on breaking type changes intentionally.

### NEST-474 — Versioning internal packages

**Difficulty:** Intermediate

**Category:** monorepo / contracts

**Question:**

How should Nest teams version internal API contract packages?

**Answer:**

Publish OpenAPI-generated or hand-written DTO packages with semver. Breaking response changes bump major; additive fields bump minor. Consumers upgrade deliberately. Nest apps import the contract package instead of copying interfaces. Failure mode: “always latest” floating tags in CI so a silent major breaks production overnight—pin versions and run contract tests in the consumer pipeline.

**Follow-up:**

Should entities be in the contract package?

Answer: No—export DTOs/events only; persistence entities stay private to the owning service.

### NEST-475 — Configuration hierarchies and 12-factor

**Difficulty:** Junior

**Category:** configuration

**Question:**

How do you apply 12-factor config in an enterprise Nest app?

**Answer:**

Store config in environment variables, load them through `ConfigModule`, and never bake secrets into images. Use namespaced config objects validated with Joi or Zod at bootstrap so bad deploys fail fast. Hierarchies can layer defaults, env-specific files for local only, then env vars winning in prod. Production failure: optional config with silent defaults that differ per environment—“works in staging” because a feature flag defaulted on.

**Follow-up:**

Why validate config at bootstrap?

Answer: Invalid or missing keys crash immediately instead of failing on the first request in production traffic.

### NEST-476 — ConfigModule per environment

**Difficulty:** Junior

**Category:** configuration

**Question:**

How should Nest ConfigModule differ across local, staging, and production?

**Answer:**

Local may load `.env` for convenience; staging and production should rely on the platform’s secret store injected as env vars, with `.env` disabled or ignored. Same `ConfigModule.forRoot` schema, different sources. Feature toggles come from config or a flag service, not hard-coded branches. Trade-off: developers want easy local files—document required vars and provide an example env, not committed secrets.

**Follow-up:**

Is `NODE_ENV=production` enough to secure config?

Answer: No—it only hints behavior; secrets, TLS, and flag sources still need explicit platform wiring.

### NEST-477 — Feature modules toggled by config

**Difficulty:** Intermediate

**Category:** configuration / modularity

**Question:**

How can Nest feature modules be toggled by configuration in enterprise deployments?

**Answer:**

Dynamically import modules in `AppModule` based on config flags, or register controllers conditionally. That lets one codebase ship regional or tier-specific capabilities. Mechanism: `ConfigService` in a dynamic module’s `forRoot`. Failure mode: half-enabled graphs where Module A is off but Module B still calls its exports—validate combinations at bootstrap and keep flags coarse. Prefer flags for capabilities, not for hiding incomplete features in production without kill switches tested.

**Follow-up:**

Can you toggle modules at runtime without restart?

Answer: Usually no for Nest module graphs; use in-process feature flags for behavior, and redeploy for module membership changes.

### NEST-478 — OpenTelemetry instrumentation

**Difficulty:** Intermediate

**Category:** observability

**Question:**

How do you instrument a Nest enterprise app with OpenTelemetry?

**Answer:**

Bootstrap the OTEL SDK before NestFactory, enable HTTP and Nest instrumentation, and export traces/metrics to your collector. Annotate critical handlers with custom spans for commands and DB calls if auto-instrumentation is thin. Result is end-to-end traces across services. Trade-off: high-cardinality attributes blow up cost; never put raw PII or unbounded IDs into span attributes without redaction policy.

**Follow-up:**

Where should the tracer be initialized relative to Nest?

Answer: Before creating the Nest application so early bootstrap and incoming requests are already in context.

### NEST-479 — Correlation ids HTTP to queue

**Difficulty:** Intermediate

**Category:** observability

**Question:**

How do you propagate correlation ids from Nest HTTP requests into queue jobs?

**Answer:**

Accept or generate a correlation id in middleware, store it in CLS and response headers, and when enqueueing, put it in job data or message headers. The consumer restores CLS and logging MDC from that field. That ties user-facing requests to async work in logs and traces. Failure mode: workers generate new ids and you cannot reconstruct the path after a payment webhook—make propagation a platform interceptor, not optional per call site.

**Follow-up:**

What header name do teams commonly use?

Answer: Often `x-correlation-id` or `traceparent` when aligning with W3C Trace Context.

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

### NEST-481 — Bulkheads and timeouts

**Difficulty:** Senior

**Category:** resilience

**Question:**

What are bulkheads in the context of Nest microservice or HTTP clients?

**Answer:**

Bulkheads limit concurrency or connection pools per dependency so one slow downstream cannot consume all event-loop capacity or sockets. In Nest, that means dedicated `HttpModule` registers, separate agents, or queue concurrency caps per processor. Timeouts bound wait time. Together they preserve partial availability. Production failure without them: a single SaaS API stall saturates your Nest instances and every unrelated route dies—classic noisy neighbor inside one process.

**Follow-up:**

How do timeouts interact with retries?

Answer: Retries multiply load; combine short timeouts with bounded retries and jitter, or you amplify outages.

### NEST-482 — Idempotency keys for commands

**Difficulty:** Senior

**Category:** resilience / APIs

**Question:**

How do idempotency keys protect Nest command APIs at enterprise scale?

**Answer:**

Clients send an Idempotency-Key header; your Nest layer stores the key with request hash and response in Redis or DB before executing the command. Retries return the same result instead of double-charging. Essential for payments and anywhere at-least-once delivery exists. Trade-off: storage TTL and conflict handling when the same key arrives with a different body—reject mismatches. Skipping keys and “trusting the client once” fails under mobile retries and gateway timeouts.

**Follow-up:**

Where should the idempotency record be written relative to the business transaction?

Answer: Reserve or insert the key in the same transactional boundary when possible; otherwise use a compare-and-set store carefully to avoid races.

### NEST-483 — RBAC beyond a single JWT guard

**Difficulty:** Intermediate

**Category:** authorization

**Question:**

Why is a single Nest JWT AuthGuard not enough for enterprise authorization?

**Answer:**

Authentication proves identity; enterprise authz needs roles, permissions, tenants, and resource ownership checks. A global JWT guard only blocks anonymous access. Layer guards or interceptors that load roles from token claims or a policy service, and enforce per-route permissions. Failure mode: trusting a `role` string in an unverified claim shape, or checking roles only on the BFF while internal services trust any caller on the network.

**Follow-up:**

Where should permission metadata live?

Answer: Prefer decorators on handlers plus a central guard that interprets them, so routes declare intent explicitly.

### NEST-484 — ABAC and policy engines

**Difficulty:** Senior

**Category:** authorization

**Question:**

When do you introduce ABAC or an external policy engine with Nest?

**Answer:**

Attribute-based access control fits when decisions depend on resource attributes, relationships, and context—not just roles. Nest calls OPA, Cedar, or a custom policy service with subject, action, resource. That centralizes rules across BFFs and services. Trade-off: latency and another critical dependency; cache carefully and fail closed. Jumping to ABAC for a ten-endpoint app is ceremony—start with RBAC until rule complexity forces it.

**Follow-up:**

Should policy evaluation happen only in the API gateway?

Answer: No—defense in depth; each service should enforce for its own resources even if the gateway pre-filters.

### NEST-485 — Service-to-service mTLS and JWT

**Difficulty:** Senior

**Category:** service auth

**Question:**

How do Nest services authenticate to each other in an enterprise mesh?

**Answer:**

Common patterns are mesh mTLS for transport identity plus short-lived JWTs or SPIFFE IDs for application-level principal. Nest middleware validates the peer identity and scopes. User JWTs may be exchanged for service tokens rather than forwarded forever. Failure mode: trusting internal network alone (“flat VPC”) after a single pod compromise; or propagating end-user tokens to every hop with over-broad claims.

**Follow-up:**

Does mTLS replace authorization?

Answer: No—mTLS authenticates the caller service; you still authorize which actions that identity may perform.

### NEST-486 — Audit logging interceptors

**Difficulty:** Intermediate

**Category:** audit / compliance

**Question:**

How do Nest interceptors support enterprise audit logging of changes?

**Answer:**

An interceptor captures user, tenant, route, and outcome around mutations, then writes an append-only audit record asynchronously. Prefer structured events with before/after snapshots for critical entities. Keep audit writers resilient so logging failure does not silently drop compliance data—outbox or durable queue helps. Trade-off: verbose audits cost storage and can log PII if you dump entire bodies; scope fields deliberately.

**Follow-up:**

Why not only rely on database triggers for audit?

Answer: Triggers miss actor identity from HTTP context unless you pass session vars; Nest-layer audit usually has richer who/why.

### NEST-487 — PII redaction in logs

**Difficulty:** Intermediate

**Category:** privacy / observability

**Question:**

How should a Nest platform approach PII redaction in logs and traces?

**Answer:**

Define a denylist of fields—tokens, emails, card data—and run serializers in the logger and OTEL attribute filters. Never log raw request bodies by default in production. Result reduces GDPR/CCPA blast radius when log stores are breached. Trade-off: over-redaction hurts debugging; provide secure break-glass tooling with access control rather than turning redaction off globally.

**Follow-up:**

Where is redaction enforced most reliably?

Answer: In central logging/tracing formatters used by all apps, not ad-hoc `console.log` in feature code.

### NEST-488 — Change data capture awareness

**Difficulty:** Senior

**Category:** data / integration

**Question:**

How does change data capture relate to Nest services that own a database?

**Answer:**

CDC streams row changes from the DB log to consumers, useful when Nest cannot emit every integration event reliably from app code. Nest still owns writes; CDC is another integration path. Prefer outbox when you need business-level events; CDC shines for search indexes and analytics. Failure mode: consumers treating raw CDC as domain events and coupling to table shapes—introduce an anti-corruption translator before other Nest services consume.

**Follow-up:**

Can CDC replace the transactional outbox?

Answer: Sometimes for technical projections; for business semantics and explicit contracts, outbox is usually clearer.

### NEST-489 — Platform SLOs for Nest teams

**Difficulty:** Staff

**Category:** platform ownership

**Question:**

As a Nest platform team, what SLOs should you own versus leave to product services?

**Answer:**

Own SLOs for shared platform capabilities: auth library correctness, config schema startup, golden-path CI templates, telemetry pipeline availability, and baseline latency budgets for shared gateways. Product teams own business endpoint SLOs. Clarify error budgets so platform pages do not hide behind product burn. Failure mode: platform team without SLOs becomes a ticket farm with no prioritization—define availability and upgrade-success metrics for the Nest baseline.

**Follow-up:**

What is a practical Nest platform SLO example?

Answer: “95% of services adopt the shared telemetry SDK within one quarter” or “config validation fails closed on 100% of bad deploys in staging gates.”

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

### NEST-491 — Strangler fig from Express to Nest

**Difficulty:** Staff

**Category:** migration

**Question:**

How do you strangler-fig a legacy Express app into Nest modules safely?

**Answer:**

Put a reverse proxy or Nest as the facade; migrate routes incrementally into Nest modules while Express still handles the rest. Share session/auth carefully, migrate persistence last if needed, and use contract tests per route. Keep dual-running short. Failure mode: big-bang rewrite that freezes features for months, or two stacks mutating the same tables without locks—sequence by bounded context and retire Express handlers as Nest proves parity.

**Follow-up:**

Should you migrate middleware or domain first?

Answer: Migrate vertical slices (route + use case + data access) so each cutover delivers user-visible parity, not all middleware alone.

### NEST-492 — Nest as facade during migration

**Difficulty:** Senior

**Category:** migration

**Question:**

Why might Nest sit as a facade in front of legacy Express during a strangler migration?

**Answer:**

Nest can terminate HTTP, apply modern authz, logging, and versioning, then proxy remaining paths to Express. New features land in Nest modules only. That gives one public entry while legacy shrinks. Trade-off: extra hop and dual config until cutover completes. Production risk is inconsistent auth between facade and legacy—centralize identity validation at the facade and treat Express as an internal adapter.

**Follow-up:**

How do you avoid endless dual-stack ownership?

Answer: Track migrated route percentage as a KPI and schedule Express shutdown; without a deadline the strangler never finishes.

### NEST-493 — Resilience at microservice clients

**Difficulty:** Senior

**Category:** resilience

**Question:**

How do Nest microservice clients (`ClientProxy`) need the same resilience as HTTP clients?

**Answer:**

TCP/Redis/NATS clients still hang, partition, and retry storms. Apply timeouts, circuit breakers, and bulkheads around `send`/`emit`, and prefer ack patterns that match delivery guarantees. Idempotent consumers remain mandatory. Teams often harden Axios but leave ClientProxy naive—then a broker blip threads up Nest request workers. Mirror the HTTP resilience policy in a shared platform wrapper for all outbound messaging.

**Follow-up:**

Is `emit` safer than `send` under failure?

Answer: `emit` is fire-and-forget and can lose messages without outbox; `send` waits for response but can timeout—choose based on consistency needs, not convenience.

### NEST-494 — Policy as code in Nest guards

**Difficulty:** Senior

**Category:** authorization

**Question:**

How do you keep Nest guards from becoming an unmaintainable forest of if-statements?

**Answer:**

Encode decisions in a policy module or external engine; guards become thin adapters that build the authorization input and interpret allow/deny. Share policies across GraphQL and REST. Result is testable rules without duplicating conditionals in every controller. Trade-off: indirection—document the policy API well. Unstructured guard growth is a Staff-level smell when every feature invents a new guard class with copy-pasted tenant checks.

**Follow-up:**

How do you test policies effectively?

Answer: Table-driven unit tests on the policy pure function, plus a few Nest e2e cases proving the guard wiring.

### NEST-495 — Correlation across BFF and domains

**Difficulty:** Intermediate

**Category:** observability

**Question:**

How should correlation work when a Nest BFF calls multiple domain Nest services?

**Answer:**

The BFF creates or accepts a correlation/trace context and injects it into every outbound call. Domain services continue the same trace. Users and support can paste one id and see the full fan-out. Without this, each service logs islands and MTTR explodes. Enforce propagation in a shared HTTP interceptor so feature developers cannot forget headers on one of five calls.

**Follow-up:**

What if a downstream service strips unknown headers?

Answer: Standardize on W3C `traceparent` / agreed correlation headers in the platform contract and reject non-compliant services in review.

### NEST-496 — Feature toggles vs module splits

**Difficulty:** Junior

**Category:** configuration / architecture

**Question:**

How do feature toggles in Nest differ from splitting a capability into another service?

**Answer:**

Toggles change behavior inside one deployable without new network boundaries—config or FlagService decides. Splitting creates a new Nest app with independent lifecycle. Use toggles for gradual rollout and experiments; use splits for true isolation needs. Mixing them poorly means a toggle that assumes a service exists which is not deployed—validate flag and topology together or you ship dark paths that 500 in production.

**Follow-up:**

Who owns killing old toggles?

Answer: Product and engineering jointly; stale toggles are permanent complexity—track them like tech debt with expiry dates.

### NEST-497 — Read your own writes after CQRS

**Difficulty:** Senior

**Category:** CQRS

**Question:**

How do you handle “read your own writes” when Nest CQRS uses async projections?

**Answer:**

After a command, either read from the write model for that user’s next GET, wait on a projection version, or return enough state in the command response. Blindly reading a eventually-consistent query store causes UI flicker and support tickets. Trade-off: special-casing the write path slightly breaks pure CQRS purity—accept it for UX-critical flows. Document consistency expectations per endpoint so mobile clients do not poll forever.

**Follow-up:**

Is synchronous projection update in the command handler okay?

Answer: For small systems yes; at scale prefer messaging and explicit consistency tokens over blocking the write on every consumer.

### NEST-498 — Audit vs product analytics events

**Difficulty:** Junior

**Category:** audit / events

**Question:**

Should Nest audit logs and product analytics share the same event pipeline?

**Answer:**

Prefer separate pipelines or clearly separated streams. Audit is compliance-grade, tamper-evident, and long-retained; analytics is lossy and product-owned. Sharing one “events” topic tempts people to drop “noisy” audit under load. In Nest, emit audit via dedicated interceptor/outbox and analytics via a different publisher. Trade-off is more moving parts; correctness for audit outweighs convenience.

**Follow-up:**

Can analytics handlers listen to domain events?

Answer: Yes, but treat them as best-effort consumers, never as the system of record for security audit.

### NEST-499 — Platform golden paths

**Difficulty:** Staff

**Category:** platform ownership

**Question:**

What “golden path” should a Nest platform team provide to product squads?

**Answer:**

A paved road: Nest app template with ConfigModule validation, auth guards, OTEL, correlation middleware, lint/test CI, and approved resilience wrappers for HttpService. Squads start from the template rather than reinventing. Measure adoption. Failure mode: platform only publishes Slack advice while every service has a different logging story—then incidents cannot be correlated and upgrades stall. Golden paths beat mandatory frameworks if they are genuinely easier than going rogue.

**Follow-up:**

How do you handle exceptions to the golden path?

Answer: Document escape hatches with owners and review; untracked exceptions become the new permanent standard.

### NEST-500 — Enterprise Nest decision checklist

**Difficulty:** Staff

**Category:** architecture boundaries

**Question:**

What checklist do you use before proposing a new Nest microservice in an enterprise?

**Answer:**

Ask: Is the bounded context clear? Do we need independent deploy or scale? Who owns the data store alone? Can modular monolith exports solve it first? What are SLOs, authz, and observability on day one? If answers are fuzzy, keep it a Nest module. Result is fewer accidental distributions. The trade-off of discipline is saying no to fashionable splits—that is Staff work: optimize for operability, not diagram aesthetics.

**Follow-up:**

What is the cheapest reversible step if uncertainty remains?

Answer: Extract a well-exported Nest module with ACL boundaries inside the monolith; split to a service only after the seam proves stable.
