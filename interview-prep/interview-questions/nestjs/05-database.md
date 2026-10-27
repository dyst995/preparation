# NEST05 — Database integration

NestJS 10 with TypeORM 0.3 (`@nestjs/typeorm`) and Prisma 5 (`PrismaService`); each question names its stack. Questions NEST-201–NEST-250.

Repository/module wiring, DataSource and PrismaService lifecycle, transactions (QueryRunner, `$transaction`, Unit of Work), request-scoped vs singleton repositories, connection pooling, migrations vs `synchronize`, soft delete, relation loading and N+1, DTO vs entity, repository vs Active Record, multi-tenancy, testing with a test DB, health checks, read replicas, outbox, idempotent writes, and optimistic locking. Raw SQL and indexing belong to the handbook DB track.

### NEST-201 — [TypeORM] forRoot vs forRootAsync

**Difficulty:** Junior

**Category:** Module wiring

**Question:**

[TypeORM] forRoot vs forRootAsync?

**Answer:**

`TypeOrmModule.forRoot()` takes static options. `forRootAsync({ inject: [ConfigService], useFactory })` builds options after config is loaded, so env vars and secrets are validated and available. Use async in any real app.

**Follow-up:**

Why not read `process.env` directly in `forRoot`?

Answer: `ConfigModule` may not have loaded `.env` yet, and you lose validation and testability. Inject `ConfigService`.

### NEST-202 — [TypeORM] What do forFeature and @InjectRepository do

**Difficulty:** Intermediate

**Category:** Module wiring

**Question:**

[TypeORM] What do forFeature and @InjectRepository do?

**Answer:**

`forFeature([User])` registers a repository provider for each entity in that module. `@InjectRepository(User)` injects it by token `getRepositoryToken(User)`.

**Follow-up:**

Why do I get "Nest can't resolve dependencies of UserService (?)"?

Answer: the module did not import `TypeOrmModule.forFeature([User])`, or a different module needs the repo and you did not export it.

### NEST-203 — [Prisma] How should PrismaService be defined

**Difficulty:** Intermediate

**Category:** Prisma lifecycle

**Question:**

[Prisma] How should PrismaService be defined?

**Answer:**

`class PrismaService extends PrismaClient implements OnModuleInit { async onModuleInit() { await this.$connect(); } }`, provided in a module and exported. Share one instance (singleton).

**Follow-up:**

Is `$connect()` required?

Answer: no, Prisma connects lazily on the first query. Explicit connect gives fail-fast at boot and predictable startup.

### NEST-204 — [Prisma] How do you disconnect cleanly on shutdown

**Difficulty:** Intermediate

**Category:** Prisma lifecycle

**Question:**

[Prisma] How do you disconnect cleanly on shutdown?

**Answer:**

Call `app.enableShutdownHooks()` in `main.ts` and implement `OnModuleDestroy` with `await this.$disconnect()`. Since Prisma 5 the `beforeExit` hook is gone, so Nest hooks are the right path.

**Follow-up:**

What breaks without shutdown hooks?

Answer: open connections linger, rolling deploys can leak pool slots, and in-flight queries can be cut off.

### NEST-205 — [TypeORM] How does the DataSource lifecycle work in Nest

**Difficulty:** Intermediate

**Category:** DataSource lifecycle

**Question:**

[TypeORM] How does the DataSource lifecycle work in Nest?

**Answer:**

`TypeOrmModule` creates and initializes the `DataSource` as an async provider, so the app does not finish bootstrapping until the DB connects. On app close, it calls `destroy()`. Inject `DataSource` directly for transactions and query runners.

**Follow-up:**

What if the DB is down at boot?

Answer: by default it retries (`retryAttempts`, `retryDelay`) and then crashes. That is good under an orchestrator that restarts it.

### NEST-206 — [Both] Should the DB module be @Global()

**Difficulty:** Intermediate

**Category:** Module wiring

**Question:**

[Both] Should the DB module be @Global()?

**Answer:**

Usually no. A `DatabaseModule` or `PrismaModule` exporting the client is acceptable as global because it is true infrastructure. Feature repositories should stay in their feature modules to keep boundaries explicit.

**Follow-up:**

What is the cost of too many globals?

Answer: hidden dependencies, harder module extraction, and tests that quietly depend on global state.

### NEST-207 — [TypeORM] Repository pattern vs Active Record

**Difficulty:** Intermediate

**Category:** Repository pattern

**Question:**

[TypeORM] Repository pattern vs Active Record?

**Answer:**

Data Mapper (repository) keeps entities as plain classes and puts persistence in `Repository<T>`. Active Record (`BaseEntity`) puts `save()` and `find()` on the entity, which hides a static global DataSource. Nest favors the repository because it is injectable and mockable.

**Follow-up:**

When is Active Record acceptable?

Answer: small scripts or prototypes. Avoid it in Nest services because it is hard to test and ignores DI-scoped DataSources and transactions.

### NEST-208 — [TypeORM] How do you write a custom repository in 0.3

**Difficulty:** Intermediate

**Category:** Repository pattern

**Question:**

[TypeORM] How do you write a custom repository in 0.3?

**Answer:**

`@EntityRepository` is removed. Create an `@Injectable()` class that injects `DataSource` or `Repository<User>` and adds domain methods (`findActiveByEmail`). Alternatively extend `Repository<User>` and call `super(User, dataSource.createEntityManager())`.

**Follow-up:**

Why wrap instead of extend?

Answer: composition hides generic `Repository` methods you do not want exposed and gives a narrow, domain-shaped, mockable API.

### NEST-209 — [Both] DTO vs entity — why separate them

**Difficulty:** Intermediate

**Category:** DTO vs entity

**Question:**

[Both] DTO vs entity — why separate them?

**Answer:**

DTOs are the API contract (validation, versioning). Entities model persistence (columns, relations). Coupling them leaks columns like `passwordHash`, enables mass assignment, and ties API changes to schema changes.

**Follow-up:**

Does Prisma need the same split?

Answer: yes. Prisma types are generated DB shapes, not API contracts. Map to response DTOs.

### NEST-210 — [TypeORM] How do you hide fields in responses

**Difficulty:** Intermediate

**Category:** DTO vs entity

**Question:**

[TypeORM] How do you hide fields in responses?

**Answer:**

Map to a response DTO explicitly, or use `ClassSerializerInterceptor` with `@Exclude()` / `@Expose()` on classes. Explicit mapping or `select` is safer than relying on decorators on entities.

**Follow-up:**

Why does `@Exclude` silently fail?

Answer: the interceptor only works on class instances, not plain objects from `.lean()`-style queries or spread results.

### NEST-211 — [TypeORM] How do you use a QueryRunner transaction

**Difficulty:** Intermediate

**Category:** Transactions

**Question:**

[TypeORM] How do you use a QueryRunner transaction?

**Answer:**

```ts
const qr = ds.createQueryRunner(); await qr.connect(); await qr.startTransaction();
try { await qr.manager.save(a); await qr.manager.save(b); await qr.commitTransaction(); }
catch (e) { await qr.rollbackTransaction(); throw e; }
finally { await qr.release(); }
```
Use `qr.manager`, not injected repos.

**Follow-up:**

What if you forget `release()`?

Answer: the connection never returns to the pool, so the pool exhausts and the app hangs.

### NEST-212 — [TypeORM] dataSource.transaction vs QueryRunner

**Difficulty:** Intermediate

**Category:** Transactions

**Question:**

[TypeORM] dataSource.transaction vs QueryRunner?

**Answer:**

`ds.transaction(async (em) => {...})` handles begin, commit, rollback, and release for you. Use it for simple units. Use QueryRunner when you need manual savepoints or control across multiple steps and methods.

**Follow-up:**

Why does `this.repo.save()` inside the callback escape the transaction?

Answer: the injected repo uses the default manager and a different connection. Use `em.getRepository()` or `em.save()`.

### NEST-213 — [Prisma] $transaction: array vs interactive

**Difficulty:** Senior

**Category:** Transactions

**Question:**

[Prisma] $transaction: array vs interactive?

**Answer:**

Array form `$transaction([q1, q2])` runs prepared operations atomically. Interactive `$transaction(async (tx) => {...})` allows logic between queries. Interactive has a default timeout of 5s (`maxWait`, `timeout` options) and must use `tx`, not the outer client.

**Follow-up:**

Why avoid HTTP calls inside interactive transactions?

Answer: they hold a connection and locks while waiting, risking timeouts and pool starvation.

### NEST-214 — [Both] What is a Unit of Work in Nest

**Difficulty:** Intermediate

**Category:** Unit of Work

**Question:**

[Both] What is a Unit of Work in Nest?

**Answer:**

One business operation, one transaction boundary: a service method (or use-case) opens the transaction and all repository calls participate. Implement it with a `TransactionManager` that wraps `ds.transaction` or `prisma.$transaction`.

**Follow-up:**

Where should the boundary be, controller or service?

Answer: the application or service layer (use case). Controllers stay thin, and repositories never open their own transactions when called inside one.

### NEST-215 — [Both] How do you propagate a transaction without passing `tx` everywhere

**Difficulty:** Senior

**Category:** Unit of Work

**Question:**

[Both] How do you propagate a transaction without passing `tx` everywhere?

**Answer:**

Use `AsyncLocalStorage` through `nestjs-cls` (with `@nestjs-cls/transactional` adapters for TypeORM or Prisma) or `typeorm-transactional`. Repositories read the current transaction from the CLS context.

**Follow-up:**

Downside?

Answer: implicit magic. Code outside a context silently runs without a transaction. Test it and keep boundaries visible with a `@Transactional()` decorator.

### NEST-216 — [Both] Request-scoped repository vs singleton

**Difficulty:** Intermediate

**Category:** Scopes

**Question:**

[Both] Request-scoped repository vs singleton?

**Answer:**

Repositories and PrismaClient should be singletons: they are stateless and own the pool. Request scope is only for request data (tenant, user). Prefer passing tenant or transaction context as an argument or through CLS instead of scoping the repository.

**Follow-up:**

What does REQUEST scope cost?

Answer: a new instance per request and bubbling up to every dependent provider, which hurts performance and breaks some features (for example, cron and gateways).

### NEST-217 — [Both] Why avoid creating a DB client per request

**Difficulty:** Intermediate

**Category:** Connection pooling

**Question:**

[Both] Why avoid creating a DB client per request?

**Answer:**

Each client has its own pool. Creating one per request exhausts DB connections and adds connect latency. Create once, reuse, and size the pool deliberately.

**Follow-up:**

How do you spot it?

Answer: `too many connections` errors, rising connection count in `pg_stat_activity`, and slow cold paths.

### NEST-218 — [TypeORM] How do you configure the connection pool

**Difficulty:** Intermediate

**Category:** Connection pooling

**Question:**

[TypeORM] How do you configure the connection pool?

**Answer:**

Use driver options: `extra: { max: 10, idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000 }` for `pg`. Rule: `instances × max ≤ DB max_connections` minus headroom for migrations and admin tools.

**Follow-up:**

How do you size `max`?

Answer: start small (5–10) per instance, then measure. More connections than DB cores usually slows things down.

### NEST-219 — [Prisma] How do you configure the pool

**Difficulty:** Intermediate

**Category:** Connection pooling

**Question:**

[Prisma] How do you configure the pool?

**Answer:**

Set `connection_limit` and `pool_timeout` in the connection URL. Default `connection_limit` is `num_cpus * 2 + 1`. With PgBouncer in transaction mode add `?pgbouncer=true`.

**Follow-up:**

Why use PgBouncer or Prisma Accelerate with serverless?

Answer: many short-lived instances each hold a pool, so you need an external pooler to cap total DB connections.

### NEST-220 — [Both] Migrations vs `synchronize: true`

**Difficulty:** Intermediate

**Category:** Migrations

**Question:**

[Both] Migrations vs `synchronize: true`?

**Answer:**

`synchronize` auto-alters schema from entities. It is fine for local prototypes but can drop columns or data in production. Use migrations everywhere else: versioned, reviewable, and repeatable.

**Follow-up:**

What is the red flag in a config review?

Answer: `synchronize: true` outside `NODE_ENV=development`.

### NEST-221 — [TypeORM] Migration workflow

**Difficulty:** Senior

**Category:** Migrations

**Question:**

[TypeORM] Migration workflow?

**Answer:**

Generate with `typeorm migration:generate` (diff of entities vs DB), review the SQL, then run `migration:run` in CI/CD before the new app version starts. Keep a separate `data-source.ts` for the CLI.

**Follow-up:**

Auto-run with `migrationsRun: true`?

Answer: acceptable for small apps, but with several replicas starting at once it can race. Run it as a single pre-deploy job.

### NEST-222 — [Prisma] migrate dev vs migrate deploy

**Difficulty:** Intermediate

**Category:** Migrations

**Question:**

[Prisma] migrate dev vs migrate deploy?

**Answer:**

`prisma migrate dev` creates and applies migrations locally and may reset a shadow DB. `prisma migrate deploy` only applies pending committed migrations, and is safe for CI and production. Never use `db push` for production history.

**Follow-up:**

Where do you run `deploy`?

Answer: a release job or init container before rollout, not in each app replica's start command.

### NEST-223 — [Both] How do you do zero-downtime schema changes

**Difficulty:** Senior

**Category:** Migrations

**Question:**

[Both] How do you do zero-downtime schema changes?

**Answer:**

Expand/contract: add nullable column, deploy code that writes both, backfill, switch reads, then drop the old column in a later release. The old and new app versions must both work against the intermediate schema.

**Follow-up:**

Why is renaming a column risky?

Answer: during rolling deploy old pods still query the old name. Use add, copy, switch, and drop.

### NEST-224 — [TypeORM] How is soft delete implemented

**Difficulty:** Senior

**Category:** Soft delete

**Question:**

[TypeORM] How is soft delete implemented?

**Answer:**

Add `@DeleteDateColumn() deletedAt`. Use `repo.softDelete(id)` and `restore(id)`. `find*` methods exclude soft-deleted rows by default. Pass `withDeleted: true` to include them.

**Follow-up:**

Does QueryBuilder auto-filter?

Answer: yes for `getMany` on entities with a delete-date column, but raw queries and some joins need `withDeleted()` or manual conditions. Test it.

### NEST-225 — [Prisma] How do you implement soft delete

**Difficulty:** Intermediate

**Category:** Soft delete

**Question:**

[Prisma] How do you implement soft delete?

**Answer:**

Prisma has no native support. Use a client extension (`$extends` query hooks) that rewrites `delete` into an update of `deletedAt` and adds `deletedAt: null` to reads. Middleware (`$use`) is deprecated.

**Follow-up:**

What do extensions miss?

Answer: nested relation reads/writes and raw queries need explicit handling, so test them.

### NEST-226 — [Both] How does soft delete interact with unique constraints

**Difficulty:** Intermediate

**Category:** Soft delete

**Question:**

[Both] How does soft delete interact with unique constraints?

**Answer:**

A deleted row still holds its unique value, so re-creating the same email fails. Use a partial unique index (`WHERE deleted_at IS NULL`) in Postgres, or include `deletedAt` in the unique key.

**Follow-up:**

Should you soft delete at all?

Answer: only if audit, undo, or retention is required. For GDPR you still need a hard delete or anonymization path.

### NEST-227 — [TypeORM] What causes N+1 in Nest services

**Difficulty:** Intermediate

**Category:** Relations and N+1

**Question:**

[TypeORM] What causes N+1 in Nest services?

**Answer:**

Loading a list, then accessing a relation per item (lazy relations or a repo call in a loop) produces 1 + N queries.

**Follow-up:**

How do you detect it?

Answer: enable `logging: ['query']` or a query count in tests and APM, then compare the count to the item count.

### NEST-228 — [TypeORM] Eager vs lazy vs explicit relations

**Difficulty:** Intermediate

**Category:** Relations and N+1

**Question:**

[TypeORM] Eager vs lazy vs explicit relations?

**Answer:**

`eager: true` loads relations on every `find*` (hidden cost, not in QueryBuilder). Lazy relations return Promises and are easy to N+1 on. Prefer explicit `relations: { orders: true }` or `leftJoinAndSelect` where needed, plus `select` for narrow fields.

**Follow-up:**

Why is a join-based load not always better?

Answer: large one-to-many joins multiply rows. `relationLoadStrategy: 'query'` (separate queries) is sometimes faster.

### NEST-229 — [Prisma] How do you avoid N+1 with Prisma

**Difficulty:** Senior

**Category:** Relations and N+1

**Question:**

[Prisma] How do you avoid N+1 with Prisma?

**Answer:**

Use `include` / `select` (batched into a few queries) and avoid per-item `findUnique` in loops. Prisma batches `findUnique` calls in the same tick via its DataLoader-style dataloader internally.

**Follow-up:**

`include` vs `select`?

Answer: `include` adds relations to all scalar fields, `select` picks exact fields. Use `select` to reduce payload and avoid leaking columns.

### NEST-230 — [Both] DataLoader in Nest

**Difficulty:** Intermediate

**Category:** Relations and N+1

**Question:**

[Both] DataLoader in Nest?

**Answer:**

Use for GraphQL field resolvers or aggregate endpoints: batch `load(id)` calls into one `WHERE id IN (...)`. Create loaders per request (request-scoped provider or CLS) so cache does not leak across users.

**Follow-up:**

Why per request?

Answer: the DataLoader cache is keyed by ID and ignores authorization, so a shared one would leak data between users.

### NEST-231 — [Both] Offset vs cursor pagination in Nest

**Difficulty:** Senior

**Category:** Pagination

**Question:**

[Both] Offset vs cursor pagination in Nest?

**Answer:**

Offset (`skip/take`) is simple but slow on deep pages and unstable under inserts. Cursor (keyset: `id > :cursor ORDER BY id LIMIT n`, or Prisma `cursor` + `skip: 1`) is stable and fast. Expose a `{ items, nextCursor }` DTO.

**Follow-up:**

How do you do a stable sort with cursor?

Answer: sort by a unique tiebreaker (for example `createdAt, id`) and encode both in an opaque cursor.

### NEST-232 — [Both] Multi-tenancy strategies

**Difficulty:** Intermediate

**Category:** Multi-tenancy

**Question:**

[Both] Multi-tenancy strategies?

**Answer:**

(1) Shared schema with `tenant_id` column, (2) schema per tenant, (3) database per tenant. Trade-offs: isolation and noisy-neighbor risk vs ops cost and migration complexity. Most SaaS start with shared schema.

**Follow-up:**

How do you choose?

Answer: by isolation and compliance needs, tenant count, and customization. Thousands of small tenants point to shared schema, a few large or regulated tenants to a dedicated DB.

### NEST-233 — [TypeORM] How do you route to a tenant DB per request

**Difficulty:** Intermediate

**Category:** Multi-tenancy

**Question:**

[TypeORM] How do you route to a tenant DB per request?

**Answer:**

Keep a map (cache) of `DataSource` per tenant, resolved from a header or JWT claim in a request-scoped `TenantConnectionProvider` or CLS. Initialize lazily and cap the number of open pools (LRU eviction).

**Follow-up:**

Main danger?

Answer: pool explosion. N tenants × pool size can exceed DB limits, so use small per-tenant pools or an external pooler.

### NEST-234 — [Prisma] How do you enforce tenant filters in shared schema

**Difficulty:** Senior

**Category:** Multi-tenancy

**Question:**

[Prisma] How do you enforce tenant filters in shared schema?

**Answer:**

Use `$extends` query extensions to inject `where: { tenantId }` on every operation, with the tenant ID from CLS. For defense in depth, use Postgres RLS with `SET LOCAL app.tenant_id` inside an interactive transaction.

**Follow-up:**

Why not trust only the app-layer filter?

Answer: one missed `where` is a cross-tenant leak. RLS enforces it in the DB.

### NEST-235 — [Both] How do you write e2e tests with a test DB

**Difficulty:** Intermediate

**Category:** Testing

**Question:**

[Both] How do you write e2e tests with a test DB?

**Answer:**

Use a separate DB (docker or Testcontainers), run migrations in `beforeAll`, bootstrap the app with `Test.createTestingModule` and Supertest, and override config to point at the test DB.

**Follow-up:**

Why not SQLite in tests while prod is Postgres?

Answer: dialect differences (JSON, enums, locking, constraints) hide real bugs. Use the same engine.

### NEST-236 — [Both] How do you isolate tests from each other

**Difficulty:** Intermediate

**Category:** Testing

**Question:**

[Both] How do you isolate tests from each other?

**Answer:**

Options: truncate tables in `afterEach`, wrap each test in a rolled-back transaction, or create a fresh schema per worker for parallelism. Truncate with `RESTART IDENTITY CASCADE` for determinism.

**Follow-up:**

Why is transaction rollback tricky in Nest?

Answer: the app opens its own transactions and connections, so you need nested/savepoint support or a shared connection through CLS.

### NEST-237 — [TypeORM] How do you unit test a service with repositories

**Difficulty:** Senior

**Category:** Testing

**Question:**

[TypeORM] How do you unit test a service with repositories?

**Answer:**

Provide `{ provide: getRepositoryToken(User), useValue: mockRepo }` in the testing module. For Prisma, provide a mock `PrismaService` (for example with `jest-mock-extended` `mockDeep<PrismaClient>()`).

**Follow-up:**

What do mocks not catch?

Answer: query semantics, constraints, and transaction behavior. Cover those with integration tests on a real DB.

### NEST-238 — [Both] Why Testcontainers

**Difficulty:** Intermediate

**Category:** Testing

**Question:**

[Both] Why Testcontainers?

**Answer:**

It spins up a throwaway real Postgres per test run, with no shared state and identical CI and local behavior. Start in `globalSetup`, pass the URL via env, run migrations, and stop on teardown.

**Follow-up:**

How do you keep it fast?

Answer: one container per suite run (not per test), template DB or truncation between tests, and `tmpfs` for data.

### NEST-239 — [Both] How do you add DB health checks

**Difficulty:** Senior

**Category:** Health checks

**Question:**

[Both] How do you add DB health checks?

**Answer:**

Use `@nestjs/terminus`: `TypeOrmHealthIndicator.pingCheck('db')` for TypeORM. For Prisma, write a custom indicator that runs `$queryRaw\`SELECT 1\``. Expose `/health` through `HealthCheckService.check([...])`.

**Follow-up:**

Why set a timeout on the ping?

Answer: a hung DB should fail the check fast instead of hanging the probe and causing misleading restarts.

### NEST-240 — [Both] Liveness vs readiness for the DB

**Difficulty:** Intermediate

**Category:** Health checks

**Question:**

[Both] Liveness vs readiness for the DB?

**Answer:**

Liveness answers "is the process alive?" and should not depend on the DB. Readiness answers "can I serve traffic?" and may include the DB. If liveness fails on DB outage, the orchestrator restarts all pods and makes the outage worse.

**Follow-up:**

Should readiness fail on a brief DB blip?

Answer: yes, to drain traffic, but add small thresholds so one slow ping does not flap the pod.

### NEST-241 — [TypeORM] How do you configure read replicas

**Difficulty:** Senior

**Category:** Read replicas

**Question:**

[TypeORM] How do you configure read replicas?

**Answer:**

Use `replication: { master: {...}, slaves: [{...}, {...}] }` in options. Reads (`find`, `SELECT` QueryBuilder) go to slaves round-robin, and writes and transactions go to master.

**Follow-up:**

How do you force a read to master?

Answer: `queryRunner = ds.createQueryRunner('master')`. Do it for read-your-own-writes flows.

### NEST-242 — [Prisma] How do you use read replicas

**Difficulty:** Intermediate

**Category:** Read replicas

**Question:**

[Prisma] How do you use read replicas?

**Answer:**

Use the `@prisma/extension-read-replicas` client extension: `prisma.$extends(readReplicas({ url: [...] }))`. Reads go to replicas, and `$primary()` forces the primary.

**Follow-up:**

What is the main risk?

Answer: replication lag, so a user may not see their own write. Route immediate follow-up reads to the primary.

### NEST-243 — [Both] What is the outbox pattern in a Nest service

**Difficulty:** Senior

**Category:** Outbox

**Question:**

[Both] What is the outbox pattern in a Nest service?

**Answer:**

In the same DB transaction that saves the business row, insert an `outbox_events` row (type, payload, status). A separate worker publishes it to the broker, then marks it sent. This avoids the dual-write problem (DB committed, broker publish failed).

**Follow-up:**

Why not publish after commit?

Answer: if the process crashes between commit and publish, the event is lost. Outbox makes it durable.

### NEST-244 — [Both] How do you run the outbox relay

**Difficulty:** Senior

**Category:** Outbox

**Question:**

[Both] How do you run the outbox relay?

**Answer:**

Use a Nest `@Cron`/interval poller or a dedicated worker app. Select pending rows with `FOR UPDATE SKIP LOCKED` in batches, publish, mark sent, and retry with backoff. Delivery is at-least-once.

**Follow-up:**

What do consumers need?

Answer: idempotency (dedupe by event ID), because duplicates are possible on retry or crash.

### NEST-245 — [Both] How do you make a write endpoint idempotent

**Difficulty:** Intermediate

**Category:** Idempotent writes

**Question:**

[Both] How do you make a write endpoint idempotent?

**Answer:**

Require an `Idempotency-Key` header. Store key plus request hash and response in a table with a unique constraint on the key. On a repeat, return the stored response, and on the same key with a different body, return 422/409.

**Follow-up:**

How do you handle two concurrent requests with the same key?

Answer: insert the key first and let the unique constraint serialize them. The loser waits or gets 409 until the first finishes.

### NEST-246 — [Both] Upsert and unique constraints for idempotency

**Difficulty:** Senior

**Category:** Idempotent writes

**Question:**

[Both] Upsert and unique constraints for idempotency?

**Answer:**

Natural-key uniqueness (for example `(orderId, paymentRef)`) lets duplicates fail safely. Use `INSERT ... ON CONFLICT DO NOTHING/UPDATE` through TypeORM `upsert()` / QueryBuilder `orIgnore()`, or Prisma `upsert` / `createMany({ skipDuplicates })`.

**Follow-up:**

Is Prisma `upsert` atomic?

Answer: it uses native `ON CONFLICT` only when conditions are met (unique where, same fields). Otherwise it is read-then-write and can race.

### NEST-247 — [TypeORM] How do you do optimistic locking

**Difficulty:** Intermediate

**Category:** Optimistic locking

**Question:**

[TypeORM] How do you do optimistic locking?

**Answer:**

Add `@VersionColumn() version`. `save()` increments it. For checks, use `repo.findOne(..., { lock: { mode: 'optimistic', version } })` or compare the version in an `UPDATE ... WHERE id AND version`. A mismatch throws `OptimisticLockVersionMismatchError`.

**Follow-up:**

What HTTP status do you return?

Answer: 409 Conflict (or 412 with ETag/`If-Match`), and let the client refetch and retry.

### NEST-248 — [Prisma] How do you do optimistic locking

**Difficulty:** Senior

**Category:** Optimistic locking

**Question:**

[Prisma] How do you do optimistic locking?

**Answer:**

Prisma has no built-in support. Add an `Int version` field and use `updateMany({ where: { id, version }, data: { ..., version: { increment: 1 } } })`. If `count === 0`, throw a conflict.

**Follow-up:**

Why `updateMany` and not `update`?

Answer: `update` requires a unique `where` and throws `P2025` on miss. In older versions `version` was not allowed in `where`, so `updateMany` returns a clean `count`.

### NEST-249 — [Both] Pessimistic locking in Nest

**Difficulty:** Senior

**Category:** Locking

**Question:**

[Both] Pessimistic locking in Nest?

**Answer:**

TypeORM: `setLock('pessimistic_write')` or `lock: { mode: 'pessimistic_write' }` inside a transaction. Prisma: `$queryRaw\`SELECT ... FOR UPDATE\`` in an interactive transaction. Use it for hot rows like balances and inventory.

**Follow-up:**

How do you avoid deadlocks?

Answer: lock rows in a consistent order, keep transactions short, and retry on deadlock errors.

### NEST-250 — [Both] How do you map DB errors to HTTP errors

**Difficulty:** Senior

**Category:** Error mapping

**Question:**

[Both] How do you map DB errors to HTTP errors?

**Answer:**

Catch in a global `ExceptionFilter`: Postgres `23505` (unique) → 409, `23503` (FK) → 409/422, TypeORM `EntityNotFoundError` → 404; Prisma `P2002` → 409, `P2025` → 404, `P2003` → 409. Do not leak raw SQL or constraint names to clients.

**Follow-up:**

Where should the mapping live?

Answer: a single filter (or repository-layer translation to domain errors) so services stay DB-agnostic and the responses stay consistent.
