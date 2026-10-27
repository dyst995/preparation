# NEST05 — Database integration

NestJS 10 with TypeORM 0.3 (`@nestjs/typeorm`) and Prisma 5 (`PrismaService`); each question names its stack. Questions NEST-201–NEST-250.

Repository/module wiring, DataSource and PrismaService lifecycle, transactions (QueryRunner, `$transaction`, Unit of Work), request-scoped vs singleton repositories, connection pooling, migrations vs `synchronize`, soft delete, relation loading and N+1, DTO vs entity, repository vs Active Record, multi-tenancy, testing with a test DB, health checks, read replicas, outbox, idempotent writes, and optimistic locking. Raw SQL and indexing belong to the handbook DB track.

### NEST-201 — [TypeORM] forRoot vs forRootAsync

**Difficulty:** Junior

**Category:** Module wiring

**Question:**

[TypeORM] forRoot vs forRootAsync?

**Answer:**

`TypeOrmModule.forRoot()` takes a fixed set of options that you write directly in code. `forRootAsync({ inject: [ConfigService], useFactory })` builds the options later, after your configuration has been loaded. That means environment variables and secrets are already read and validated when the database connection is created. In a real application you almost always want the async version, because connection details usually come from the environment.

**Follow-up:**

Why not read `process.env` directly in `forRoot`?

Answer: `ConfigModule` may not have loaded the `.env` file yet, so you can get missing values. You also lose validation and make testing harder. Inject `ConfigService` instead.

### NEST-202 — [TypeORM] What do forFeature and @InjectRepository do

**Difficulty:** Intermediate

**Category:** Module wiring

**Question:**

[TypeORM] What do forFeature and @InjectRepository do?

**Answer:**

`TypeOrmModule.forFeature([User])` registers a repository provider for each entity you list, inside the module where you call it. `@InjectRepository(User)` then injects that repository into a class. Under the hood it uses a token created by `getRepositoryToken(User)`. So `forFeature` makes the repository available, and `@InjectRepository` asks for it. If you skip the first step, Nest has nothing to inject.

**Follow-up:**

Why do I get "Nest can't resolve dependencies of UserService (?)"?

Answer: Usually the module didn't import `TypeOrmModule.forFeature([User])`. Or another module needs the repository and the owning module never exported it.

### NEST-203 — [Prisma] How should PrismaService be defined

**Difficulty:** Intermediate

**Category:** Prisma lifecycle

**Question:**

[Prisma] How should PrismaService be defined?

**Answer:**

Create a class that extends `PrismaClient` and implements `OnModuleInit`. In `onModuleInit`, call `await this.$connect()`. Put it in a module, add it to `providers`, and export it so other modules can inject it. Nest creates providers as singletons by default, so the whole app shares one client and one connection pool. That is what you want, because each `PrismaClient` manages its own pool.

**Follow-up:**

Is `$connect()` required?

Answer: No, Prisma connects lazily on the first query. Calling it at startup is useful because the app fails fast if the database is unreachable, and startup is more predictable.

### NEST-204 — [Prisma] How do you disconnect cleanly on shutdown

**Difficulty:** Intermediate

**Category:** Prisma lifecycle

**Question:**

[Prisma] How do you disconnect cleanly on shutdown?

**Answer:**

First, call `app.enableShutdownHooks()` in `main.ts`, so Nest reacts to signals like SIGTERM. Then implement `OnModuleDestroy` in `PrismaService` and call `await this.$disconnect()` inside it. This closes database connections properly when the app stops. In older Prisma versions you might have used the `beforeExit` hook, but with Prisma 5 that hook is gone for the default engine, so Nest's lifecycle hooks are the right way.

**Follow-up:**

What breaks without shutdown hooks?

Answer: Connections can linger after the app stops. During rolling deployments this can waste connection slots, and queries that are still running may be cut off abruptly.

### NEST-205 — [TypeORM] How does the DataSource lifecycle work in Nest

**Difficulty:** Intermediate

**Category:** DataSource lifecycle

**Question:**

[TypeORM] How does the DataSource lifecycle work in Nest?

**Answer:**

`TypeOrmModule` creates the `DataSource` and initializes it as an async provider. Because of that, the app doesn't finish starting until the database connection is ready. When the app closes, the module calls `destroy()` to release connections. If you need transactions or query runners, you can inject `DataSource` directly into your service. So you rarely need to open or close the connection yourself.

**Follow-up:**

What if the database is down at startup?

Answer: By default TypeORM retries, controlled by `retryAttempts` and `retryDelay`, and then the app crashes. That is fine under an orchestrator such as Kubernetes, which restarts it.

### NEST-206 — [Both] Should the DB module be @Global()

**Difficulty:** Intermediate

**Category:** Module wiring

**Question:**

[Both] Should the DB module be @Global()?

**Answer:**

Usually not. The one exception is a module that only provides the database client, like a `PrismaModule` or `DatabaseModule`. Making that global is acceptable, because it is true infrastructure that nearly everything uses. Feature repositories, however, should stay inside their own feature modules and be imported or exported explicitly. That keeps module boundaries visible, and it is easy to see who depends on what.

**Follow-up:**

What is the cost of too many globals?

Answer: Dependencies become hidden, so modules are harder to extract or reuse. Tests can also end up depending on global state without anyone noticing.

### NEST-207 — [TypeORM] Repository pattern vs Active Record

**Difficulty:** Intermediate

**Category:** Repository pattern

**Question:**

[TypeORM] Repository pattern vs Active Record?

**Answer:**

With the repository pattern, also called Data Mapper, entities are plain classes and all database work happens in a separate `Repository<T>`. With Active Record, entities extend `BaseEntity` and have methods like `save()` and `find()` on themselves. That hides a static, global `DataSource`. In Nest, the repository approach is preferred, because repositories are injectable and easy to replace with mocks in tests.

**Follow-up:**

When is Active Record acceptable?

Answer: For small scripts or quick prototypes. In Nest services, avoid it: it is hard to test, and it ignores the injected `DataSource` and any transaction you opened.

### NEST-208 — [TypeORM] How do you write a custom repository in 0.3

**Difficulty:** Intermediate

**Category:** Repository pattern

**Question:**

[TypeORM] How do you write a custom repository in 0.3?

**Answer:**

The old `@EntityRepository` decorator was removed in TypeORM 0.3. Instead, create a normal `@Injectable()` class that injects `DataSource` or `Repository<User>`, and add methods that describe your domain, such as `findActiveByEmail`. Another option is to extend `Repository<User>` and call `super(User, dataSource.createEntityManager())` in the constructor. The first approach, wrapping, is usually simpler and cleaner to use in Nest.

**Follow-up:**

Why wrap instead of extend?

Answer: Wrapping hides the generic `Repository` methods you don't want to expose. You get a small, domain-focused API that is easy to mock.

### NEST-209 — [Both] DTO vs entity — why separate them

**Difficulty:** Intermediate

**Category:** DTO vs entity

**Question:**

[Both] DTO vs entity — why separate them?

**Answer:**

A DTO describes what the API accepts or returns, including validation and versioning. An entity describes how data is stored: columns, relations, and constraints. They change for different reasons, so they should be separate. If you use the entity as the DTO, you can accidentally expose fields like `passwordHash`, allow clients to set fields they shouldn't (mass assignment), and make every database change a breaking API change.

**Follow-up:**

Does Prisma need the same split?

Answer: Yes. Prisma's generated types describe database rows, not your API contract. Map them to response DTOs before returning them.

### NEST-210 — [TypeORM] How do you hide fields in responses

**Difficulty:** Intermediate

**Category:** DTO vs entity

**Question:**

[TypeORM] How do you hide fields in responses?

**Answer:**

The safest way is to map the entity to a response DTO yourself, so only the fields you choose are returned. Another option is `ClassSerializerInterceptor` together with `@Exclude()` and `@Expose()` on your classes. You can also limit the columns with `select` in the query. Explicit mapping is safer than relying on decorators placed on entities, because a new sensitive column won't leak by accident.

**Follow-up:**

Why does `@Exclude` sometimes silently fail?

Answer: The interceptor only works on class instances. If you return plain objects, such as raw query results or spread copies, there are no decorators to apply.

### NEST-211 — [TypeORM] How do you use a QueryRunner transaction

**Difficulty:** Intermediate

**Category:** Transactions

**Question:**

[TypeORM] How do you use a QueryRunner transaction?

**Answer:**

Create a query runner from the `DataSource`, connect, and start a transaction. Do your saves, then commit. If anything fails, roll back and rethrow. In a `finally` block, always release the runner so the connection returns to the pool. The important detail is to do all work through `qr.manager`. Repositories injected into your service use the default connection, so they would run outside this transaction.

**Code:**

```ts
const qr = ds.createQueryRunner(); await qr.connect(); await qr.startTransaction();
try { await qr.manager.save(a); await qr.manager.save(b); await qr.commitTransaction(); }
catch (e) { await qr.rollbackTransaction(); throw e; }
finally { await qr.release(); }
```

**Follow-up:**

What if you forget `release()`?

Answer: The connection never goes back to the pool. Eventually the pool runs out of connections and the app hangs.

### NEST-212 — [TypeORM] dataSource.transaction vs QueryRunner

**Difficulty:** Intermediate

**Category:** Transactions

**Question:**

[TypeORM] dataSource.transaction vs QueryRunner?

**Answer:**

`ds.transaction(async (em) => {...})` is the simple option. It starts the transaction, commits on success, rolls back on error, and releases the connection for you. Use it for most units of work. Choose a `QueryRunner` when you need more manual control, such as savepoints, or when the transaction must span several methods and steps. With either approach, all queries must go through the transaction's manager.

**Follow-up:**

Why does `this.repo.save()` inside the callback escape the transaction?

Answer: The injected repository uses the default manager and a different connection. Use `em.getRepository()` or `em.save()` so the query runs inside the transaction.

### NEST-213 — [Prisma] $transaction: array vs interactive

**Difficulty:** Senior

**Category:** Transactions

**Question:**

[Prisma] $transaction: array vs interactive?

**Answer:**

The array form, `$transaction([q1, q2])`, takes a list of prepared queries and runs them together atomically. It is simple, but you can't put your own logic between the queries. The interactive form, `$transaction(async (tx) => {...})`, lets you read results and make decisions in the middle. It has a default timeout of 5 seconds, adjustable with `maxWait` and `timeout`. Inside it, always use `tx`, never the outer client.

**Follow-up:**

Why avoid HTTP calls inside interactive transactions?

Answer: The transaction holds a database connection and possibly locks while it waits for the network. That risks timeouts and can use up the connection pool.

### NEST-214 — [Both] What is a Unit of Work in Nest

**Difficulty:** Intermediate

**Category:** Unit of Work

**Question:**

[Both] What is a Unit of Work in Nest?

**Answer:**

A Unit of Work means one business operation uses one transaction. A service method, or a use case, opens the transaction, and every repository call inside it takes part in that same transaction. Either everything succeeds, or everything is rolled back. In Nest, you can implement this with a small `TransactionManager` class that wraps `ds.transaction` for TypeORM or `prisma.$transaction` for Prisma.

**Follow-up:**

Where should the boundary be, controller or service?

Answer: In the service or use-case layer. Controllers stay thin, and repositories should not start their own transaction when they're called inside one.

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

### NEST-216 — [Both] Request-scoped repository vs singleton

**Difficulty:** Intermediate

**Category:** Scopes

**Question:**

[Both] Request-scoped repository vs singleton?

**Answer:**

Repositories and `PrismaClient` should be singletons. They hold no request data, and they own or share the connection pool, so creating many of them would waste connections. Request scope is meant for data that really belongs to one request, such as the current tenant or user. Instead of making repositories request-scoped, pass the tenant or transaction as an argument, or keep it in a context such as CLS.

**Follow-up:**

What does REQUEST scope cost?

Answer: Nest creates a new instance per request, and the scope spreads to every provider that depends on it. That hurts performance and breaks some features, such as cron jobs and gateways.

### NEST-217 — [Both] Why avoid creating a DB client per request

**Difficulty:** Intermediate

**Category:** Connection pooling

**Question:**

[Both] Why avoid creating a DB client per request?

**Answer:**

Each database client creates its own connection pool. If you create a new client for every request, you quickly open more connections than the database allows. You also pay the connection setup time again and again, which makes requests slower. The right approach is to create the client once at startup, reuse it for the whole application, and choose the pool size deliberately.

**Follow-up:**

How do you spot this problem?

Answer: You will see `too many connections` errors and a rising connection count in `pg_stat_activity`. Some requests will also be slow because they open a new connection.

### NEST-218 — [TypeORM] How do you configure the connection pool

**Difficulty:** Intermediate

**Category:** Connection pooling

**Question:**

[TypeORM] How do you configure the connection pool?

**Answer:**

With the `pg` driver, you pass pool settings through `extra`, for example `extra: { max: 10, idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000 }`. When you pick `max`, remember that every app instance has its own pool. The total, `instances × max`, must stay below the database's `max_connections`, and you should leave some room for migrations and admin tools.

**Follow-up:**

How do you size `max`?

Answer: Start small, around 5 to 10 per instance, and measure. Having far more connections than the database has CPU cores usually makes things slower, not faster.

### NEST-219 — [Prisma] How do you configure the pool

**Difficulty:** Intermediate

**Category:** Connection pooling

**Question:**

[Prisma] How do you configure the pool?

**Answer:**

Prisma reads pool settings from the connection URL. Use `connection_limit` for the maximum number of connections and `pool_timeout` for how long a query waits for a free one. The default `connection_limit` is based on your CPUs: roughly `num_physical_cpus * 2 + 1`. If you use PgBouncer in transaction mode, add `?pgbouncer=true` to the URL so Prisma avoids features that don't work with it.

**Follow-up:**

Why use PgBouncer or Prisma Accelerate with serverless?

Answer: Serverless runs many short-lived instances, and each one holds its own pool. An external pooler caps the total number of connections the database sees.

### NEST-220 — [Both] Migrations vs `synchronize: true`

**Difficulty:** Intermediate

**Category:** Migrations

**Question:**

[Both] Migrations vs `synchronize: true`?

**Answer:**

With `synchronize: true`, TypeORM automatically changes the database schema to match your entities every time the app starts. That is convenient for local prototypes. In production it is dangerous, because it can drop columns or data without warning. Migrations are better: each one is a versioned file, you can review it before it runs, and the same changes run the same way in every environment.

**Follow-up:**

What is the red flag in a config review?

Answer: `synchronize: true` in anything other than local development, for example when `NODE_ENV` isn't `development`.

### NEST-221 — [TypeORM] Migration workflow

**Difficulty:** Senior

**Category:** Migrations

**Question:**

[TypeORM] Migration workflow?

**Answer:**

Generate a migration with `typeorm migration:generate`, which compares your entities with the current database. Always read the generated SQL before committing it. Then run `migration:run` in CI/CD, before the new app version starts. Keep a separate `data-source.ts` file for the CLI, since the CLI can't use your Nest module configuration. This way the database schema is ready before any new code needs it.

**Follow-up:**

Is auto-running with `migrationsRun: true` a good idea?

Answer: It's acceptable for small apps. But when several replicas start at once, they can race to run the same migration. Run migrations as a single pre-deploy job instead.

### NEST-222 — [Prisma] migrate dev vs migrate deploy

**Difficulty:** Intermediate

**Category:** Migrations

**Question:**

[Prisma] migrate dev vs migrate deploy?

**Answer:**

`prisma migrate dev` is for your local machine. It creates new migrations from schema changes, applies them, and may reset a shadow database. `prisma migrate deploy` only applies migrations that are already committed and pending. It never creates or resets anything, so it's safe for CI and production. Don't use `db push` for production, because it changes the schema without recording a migration history.

**Follow-up:**

Where do you run `deploy`?

Answer: In a release job or an init container that runs before the rollout, not in the start command of each app replica.

### NEST-223 — [Both] How do you do zero-downtime schema changes

**Difficulty:** Senior

**Category:** Migrations

**Question:**

[Both] How do you do zero-downtime schema changes?

**Answer:**

Use the expand and contract approach, in small steps. First add the new column as nullable. Then deploy code that writes to both the old and new columns, and backfill existing rows. Next, switch reads to the new column. Only in a later release do you drop the old column. At every step, both the old and the new app versions must work with the current schema, because during a rolling deploy they run side by side.

**Follow-up:**

Why is renaming a column risky?

Answer: During a rolling deploy, old instances still query the old name and will fail. Instead add a new column, copy data, switch over, and drop the old one later.

### NEST-224 — [TypeORM] How is soft delete implemented

**Difficulty:** Senior

**Category:** Soft delete

**Question:**

[TypeORM] How is soft delete implemented?

**Answer:**

Add a `@DeleteDateColumn() deletedAt` field to the entity. Then call `repo.softDelete(id)` to mark a row as deleted, which sets the timestamp instead of removing the row, and `repo.restore(id)` to bring it back. The `find*` methods automatically skip soft-deleted rows. If you need to see them, for example in an admin view, pass `withDeleted: true`.

**Follow-up:**

Does QueryBuilder filter them automatically?

Answer: Yes for entity queries like `getMany` on entities with a delete-date column. Raw queries and some joins don't, so they need `withDeleted()` or a manual condition. Test these cases.

### NEST-225 — [Prisma] How do you implement soft delete

**Difficulty:** Intermediate

**Category:** Soft delete

**Question:**

[Prisma] How do you implement soft delete?

**Answer:**

Prisma has no built-in soft delete. The usual solution is a client extension using `$extends` with query hooks. It rewrites `delete` calls into updates that set `deletedAt`, and it adds `deletedAt: null` to read queries so deleted rows are hidden. Older examples use middleware with `$use`, but that is deprecated. Remember that the extension only covers what you hook into, so check your edge cases.

**Follow-up:**

What do extensions miss?

Answer: Nested relation reads and writes, and raw queries. They need explicit handling, so write tests for them.

### NEST-226 — [Both] How does soft delete interact with unique constraints

**Difficulty:** Intermediate

**Category:** Soft delete

**Question:**

[Both] How does soft delete interact with unique constraints?

**Answer:**

A soft-deleted row is still in the table, so it still holds its unique value. If a user deletes their account and later signs up again with the same email, the insert fails with a unique violation. In Postgres, fix this with a partial unique index, `WHERE deleted_at IS NULL`, so only active rows must be unique. Another option is to include `deletedAt` in the unique key.

**Follow-up:**

Should you soft delete at all?

Answer: Only when you need auditing, undo, or retention. For privacy laws like GDPR, you still need a way to hard delete or anonymize the data.

### NEST-227 — [TypeORM] What causes N+1 in Nest services

**Difficulty:** Intermediate

**Category:** Relations and N+1

**Question:**

[TypeORM] What causes N+1 in Nest services?

**Answer:**

The N+1 problem happens when you load a list with one query, and then load a related record separately for each item. For example, you fetch 100 users and then loop over them to fetch each user's orders. That's 1 query plus 100 more, so 101 in total. It often hides behind lazy relations or repository calls inside loops, and it makes endpoints slow as the list grows.

**Follow-up:**

How do you detect it?

Answer: Turn on query logging with `logging: ['query']`, or count queries in tests and in your APM tool. Compare the number of queries with the number of items returned.

### NEST-228 — [TypeORM] Eager vs lazy vs explicit relations

**Difficulty:** Intermediate

**Category:** Relations and N+1

**Question:**

[TypeORM] Eager vs lazy vs explicit relations?

**Answer:**

`eager: true` loads the relation on every `find*` call, which hides extra cost and doesn't apply in QueryBuilder. Lazy relations return Promises, and it's easy to trigger N+1 queries with them. The better habit is to load explicitly: use `relations: { orders: true }` or `leftJoinAndSelect` only where needed, and use `select` to fetch only the fields you need. Then every query shows exactly what it loads.

**Follow-up:**

Why is a join-based load not always better?

Answer: Joining a large one-to-many relation repeats the parent's data in every row, so the result gets huge. Sometimes separate queries with `relationLoadStrategy: 'query'` are faster.

### NEST-229 — [Prisma] How do you avoid N+1 with Prisma

**Difficulty:** Senior

**Category:** Relations and N+1

**Question:**

[Prisma] How do you avoid N+1 with Prisma?

**Answer:**

Load related data in the same call using `include` or `select`. Prisma combines these into a small number of queries. Avoid calling `findUnique` once per item inside a loop. Prisma does have an internal dataloader that batches `findUnique` calls made in the same tick, which helps, but you shouldn't depend on it. Planning the query shape up front is clearer and more predictable.

**Follow-up:**

What is the difference between `include` and `select`?

Answer: `include` returns all scalar fields plus the relations you list. `select` returns exactly the fields you name. Use `select` to shrink the payload and avoid leaking columns.

### NEST-230 — [Both] DataLoader in Nest

**Difficulty:** Intermediate

**Category:** Relations and N+1

**Question:**

[Both] DataLoader in Nest?

**Answer:**

DataLoader collects many small `load(id)` calls made around the same time and turns them into one query, like `WHERE id IN (...)`. It is especially useful in GraphQL field resolvers and in endpoints that combine data from many places. Create a new loader for each request, using a request-scoped provider or CLS. That way its cache only lives as long as one request, and data doesn't leak between users.

**Follow-up:**

Why create it per request?

Answer: DataLoader's cache is keyed by ID and knows nothing about permissions. A shared loader could return one user's data to another user.

### NEST-231 — [Both] Offset vs cursor pagination in Nest

**Difficulty:** Senior

**Category:** Pagination

**Question:**

[Both] Offset vs cursor pagination in Nest?

**Answer:**

Offset pagination, `skip` and `take`, is easy to build, but gets slow on deep pages and can show duplicates or skip items when rows are inserted. Cursor, or keyset, pagination asks for "rows after this one", for example `id > :cursor ORDER BY id LIMIT n`. In Prisma that's `cursor` plus `skip: 1`. It stays fast and stable. Return a DTO shaped like `{ items, nextCursor }`.

**Follow-up:**

How do you get a stable sort with a cursor?

Answer: Sort by a unique tiebreaker, such as `createdAt, id`, and put both values in an opaque cursor.

### NEST-232 — [Both] Multi-tenancy strategies

**Difficulty:** Intermediate

**Category:** Multi-tenancy

**Question:**

[Both] Multi-tenancy strategies?

**Answer:**

There are three common options. First, a shared schema where every table has a `tenant_id` column. Second, a separate schema for each tenant. Third, a separate database for each tenant. The trade-off is isolation against effort. Separate databases isolate tenants best and prevent noisy neighbors, but cost more to run and migrate. Most SaaS products start with the shared schema because it is the simplest.

**Follow-up:**

How do you choose?

Answer: Look at isolation and compliance needs, the number of tenants, and customization needs. Thousands of small tenants suit a shared schema. A few large or regulated tenants may justify dedicated databases.

### NEST-233 — [TypeORM] How do you route to a tenant DB per request

**Difficulty:** Intermediate

**Category:** Multi-tenancy

**Question:**

[TypeORM] How do you route to a tenant DB per request?

**Answer:**

Keep a cache that maps each tenant to its own `DataSource`. For each request, find the tenant from a header or a JWT claim, using a request-scoped `TenantConnectionProvider` or CLS, and fetch the matching connection from the cache. Create each connection lazily, the first time a tenant needs it. Put a limit on how many pools stay open, and close the least recently used ones.

**Follow-up:**

What is the main danger?

Answer: Pool explosion. If you have many tenants, each with its own pool, the total can exceed the database limits. Use small per-tenant pools or an external pooler.

### NEST-234 — [Prisma] How do you enforce tenant filters in shared schema

**Difficulty:** Senior

**Category:** Multi-tenancy

**Question:**

[Prisma] How do you enforce tenant filters in shared schema?

**Answer:**

Use a `$extends` query extension that adds `where: { tenantId }` to every operation, taking the tenant id from CLS. That way developers can't forget the filter. For defense in depth, add Postgres Row-Level Security too. Inside an interactive transaction, run `SET LOCAL app.tenant_id`, and the database itself will only return rows for that tenant, even if the application code has a bug.

**Follow-up:**

Why not trust only the app-layer filter?

Answer: A single missed `where` is a cross-tenant data leak. Row-Level Security enforces the rule in the database as a safety net.

### NEST-235 — [Both] How do you write e2e tests with a test DB

**Difficulty:** Intermediate

**Category:** Testing

**Question:**

[Both] How do you write e2e tests with a test DB?

**Answer:**

Use a separate test database, started with Docker or Testcontainers. Run your migrations in `beforeAll`, so the schema matches production. Then build the app with `Test.createTestingModule`, override the configuration to point at the test database, and call endpoints with Supertest. This tests the real stack, including queries, constraints, and transactions, instead of mocks that may hide problems.

**Follow-up:**

Why not use SQLite in tests while production uses Postgres?

Answer: The databases behave differently for JSON, enums, locking, and constraints, so tests can pass while production fails. Use the same engine in both.

### NEST-236 — [Both] How do you isolate tests from each other

**Difficulty:** Intermediate

**Category:** Testing

**Question:**

[Both] How do you isolate tests from each other?

**Answer:**

There are three common ways. You can truncate tables after each test. You can wrap each test in a transaction and roll it back at the end. Or, when tests run in parallel, you can give each worker its own schema. When truncating, use `RESTART IDENTITY CASCADE` so IDs reset and the results are predictable. Whatever you choose, each test should start from a known clean state.

**Follow-up:**

Why is transaction rollback tricky in Nest?

Answer: The app opens its own connections and transactions. To make rollback work, you need savepoint support or a shared connection, for example through CLS.

### NEST-237 — [TypeORM] How do you unit test a service with repositories

**Difficulty:** Senior

**Category:** Testing

**Question:**

[TypeORM] How do you unit test a service with repositories?

**Answer:**

In the testing module, replace the real repository with a fake: `{ provide: getRepositoryToken(User), useValue: mockRepo }`. The service then receives your mock and you can control its results and check how it was called. With Prisma, provide a mock `PrismaService` instead, for example using `mockDeep<PrismaClient>()` from `jest-mock-extended`. This keeps unit tests fast, because no database is needed.

**Follow-up:**

What do mocks not catch?

Answer: Query behavior, database constraints, and transaction handling. Cover those with integration tests against a real database.

### NEST-238 — [Both] Why Testcontainers

**Difficulty:** Intermediate

**Category:** Testing

**Question:**

[Both] Why Testcontainers?

**Answer:**

Testcontainers starts a real, temporary Postgres container for your tests. There is no shared database to get dirty, and tests behave the same on your laptop and in CI. Typically you start the container in `globalSetup`, pass its connection URL through an environment variable, run migrations, and stop the container during teardown. You get production-like behavior without managing a database by hand.

**Follow-up:**

How do you keep it fast?

Answer: Start one container per test run, not per test. Reset data between tests using truncation or a template database, and store the data on `tmpfs` (in memory).

### NEST-239 — [Both] How do you add DB health checks

**Difficulty:** Senior

**Category:** Health checks

**Question:**

[Both] How do you add DB health checks?

**Answer:**

Use `@nestjs/terminus`. For TypeORM, it has a ready-made `TypeOrmHealthIndicator.pingCheck('db')`. For Prisma, write a custom health indicator that runs a simple query such as `SELECT 1` through `$queryRaw`. Then expose a `/health` endpoint that calls `HealthCheckService.check([...])` with your indicators. Orchestrators and load balancers call this endpoint to decide whether the instance is working.

**Follow-up:**

Why set a timeout on the ping?

Answer: If the database hangs, the check should fail quickly. Otherwise the probe itself hangs, and the orchestrator may make misleading restart decisions.

### NEST-240 — [Both] Liveness vs readiness for the DB

**Difficulty:** Intermediate

**Category:** Health checks

**Question:**

[Both] Liveness vs readiness for the DB?

**Answer:**

Liveness asks, "is the process alive?" It should not depend on the database. Readiness asks, "can this instance serve traffic right now?" and it can include the database. This difference matters. If liveness fails whenever the database is down, the orchestrator restarts every pod, and the outage gets worse instead of simply pausing traffic until the database comes back.

**Follow-up:**

Should readiness fail on a brief DB blip?

Answer: Yes, so traffic is drained away. But use small thresholds, such as a few failures in a row, so one slow ping doesn't make the pod flap in and out.

### NEST-241 — [TypeORM] How do you configure read replicas

**Difficulty:** Senior

**Category:** Read replicas

**Question:**

[TypeORM] How do you configure read replicas?

**Answer:**

Add a `replication` option with one `master` and a list of `slaves`: `replication: { master: {...}, slaves: [{...}, {...}] }`. After that, TypeORM sends read queries, such as `find` and SELECT QueryBuilder calls, to the replicas in round-robin order. Writes and transactions always go to the master. So your code mostly stays the same, and the routing happens behind the scenes.

**Follow-up:**

How do you force a read to the master?

Answer: Create a query runner with `ds.createQueryRunner('master')`. Do this when a user must immediately see their own write.

### NEST-242 — [Prisma] How do you use read replicas

**Difficulty:** Intermediate

**Category:** Read replicas

**Question:**

[Prisma] How do you use read replicas?

**Answer:**

Use the official `@prisma/extension-read-replicas` client extension: `prisma.$extends(readReplicas({ url: [...] }))`. After that, read queries are sent to the replicas, and writes go to the primary. When you need to read from the primary, call `$primary()` explicitly. This gives you scaling for read-heavy traffic without changing most of your query code.

**Follow-up:**

What is the main risk?

Answer: Replication lag. A replica may be slightly behind, so a user might not see data they just saved. Send reads that immediately follow a write to the primary.

### NEST-243 — [Both] What is the outbox pattern in a Nest service

**Difficulty:** Senior

**Category:** Outbox

**Question:**

[Both] What is the outbox pattern in a Nest service?

**Answer:**

The outbox pattern solves the problem of saving data and sending an event reliably. In the same database transaction that saves your business row, you also insert a row into an `outbox_events` table with the event type, payload, and status. A separate worker later reads pending rows, publishes them to the message broker, and marks them as sent. This avoids the dual-write problem, where the database commit succeeds but the broker publish fails.

**Follow-up:**

Why not just publish after the commit?

Answer: If the process crashes between the commit and the publish, the event is lost forever. With an outbox, the event is stored in the database, so it can't be lost.

### NEST-244 — [Both] How do you run the outbox relay

**Difficulty:** Senior

**Category:** Outbox

**Question:**

[Both] How do you run the outbox relay?

**Answer:**

The relay is a background process, either a Nest `@Cron` or interval job, or a separate worker app. Each run it selects a batch of pending rows using `FOR UPDATE SKIP LOCKED`, so several workers don't take the same rows. It publishes them, marks them as sent, and retries failures with backoff. Delivery is at-least-once, which means an event may sometimes be published more than once.

**Follow-up:**

What do consumers need?

Answer: Idempotency. They should detect duplicates, for example by event ID, because retries or crashes can cause the same event to arrive twice.

### NEST-245 — [Both] How do you make a write endpoint idempotent

**Difficulty:** Intermediate

**Category:** Idempotent writes

**Question:**

[Both] How do you make a write endpoint idempotent?

**Answer:**

Require clients to send an `Idempotency-Key` header. Store the key, a hash of the request, and the response in a table with a unique constraint on the key. If the same key arrives again, return the stored response instead of doing the work again. If the same key comes with a different body, that's a client mistake, so reject it with 422 or 409. This makes retries safe.

**Follow-up:**

How do you handle two concurrent requests with the same key?

Answer: Insert the key first and let the unique constraint decide who goes first. The second request waits, or gets a 409, until the first one finishes.

### NEST-246 — [Both] Upsert and unique constraints for idempotency

**Difficulty:** Senior

**Category:** Idempotent writes

**Question:**

[Both] Upsert and unique constraints for idempotency?

**Answer:**

A unique constraint on a natural key, for example `(orderId, paymentRef)`, makes duplicates fail safely instead of creating a second row. You can then use `INSERT ... ON CONFLICT DO NOTHING` or `DO UPDATE`. In TypeORM, that's `upsert()` or the QueryBuilder's `orIgnore()`. In Prisma, use `upsert`, or `createMany({ skipDuplicates })`. The database enforces uniqueness, so even concurrent requests can't create duplicates.

**Follow-up:**

Is Prisma `upsert` atomic?

Answer: Only when it can use the database's native `ON CONFLICT`, which needs specific conditions, such as filtering on a unique field. Otherwise it reads first and then writes, which can race.

### NEST-247 — [TypeORM] How do you do optimistic locking

**Difficulty:** Intermediate

**Category:** Optimistic locking

**Question:**

[TypeORM] How do you do optimistic locking?

**Answer:**

Optimistic locking assumes conflicts are rare, and detects them using a version number. Add `@VersionColumn() version` to the entity, and TypeORM increments it on every `save()`. To check a version, use `repo.findOne(..., { lock: { mode: 'optimistic', version } })`, or write an `UPDATE ... WHERE id AND version` yourself. If the version no longer matches, TypeORM throws `OptimisticLockVersionMismatchError`, meaning someone else changed the row.

**Follow-up:**

What HTTP status do you return?

Answer: 409 Conflict, or 412 Precondition Failed when you use ETag and `If-Match`. The client should reload the latest data and try again.

### NEST-248 — [Prisma] How do you do optimistic locking

**Difficulty:** Senior

**Category:** Optimistic locking

**Question:**

[Prisma] How do you do optimistic locking?

**Answer:**

Prisma has no built-in support, so you add it yourself. Give the model an `Int version` field. When updating, use `updateMany({ where: { id, version }, data: { ..., version: { increment: 1 } } })`. This only updates the row if the version still matches. Afterwards, check `count`. If it is 0, another request changed the row first, so throw a conflict error.

**Follow-up:**

Why `updateMany` and not `update`?

Answer: `update` throws a `P2025` error when nothing matches, and before Prisma 5 it only allowed unique fields in `where`. `updateMany` simply returns a `count`, which is easy to check.

### NEST-249 — [Both] Pessimistic locking in Nest

**Difficulty:** Senior

**Category:** Locking

**Question:**

[Both] Pessimistic locking in Nest?

**Answer:**

Pessimistic locking locks a row while you work on it, so others must wait. In TypeORM, use `setLock('pessimistic_write')` or `lock: { mode: 'pessimistic_write' }` inside a transaction. In Prisma, run a raw `SELECT ... FOR UPDATE` with `$queryRaw` inside an interactive transaction. It suits hot rows where conflicts are likely, such as account balances or inventory counts. The lock only lasts until the transaction ends.

**Follow-up:**

How do you avoid deadlocks?

Answer: Lock rows in a consistent order, keep transactions short, and retry when the database reports a deadlock.

### NEST-250 — [Both] How do you map DB errors to HTTP errors

**Difficulty:** Senior

**Category:** Error mapping

**Question:**

[Both] How do you map DB errors to HTTP errors?

**Answer:**

Catch them in one global `ExceptionFilter` and translate them into HTTP responses. For Postgres, `23505` (unique violation) becomes 409, and `23503` (foreign key) becomes 409 or 422. TypeORM's `EntityNotFoundError` becomes 404. For Prisma, `P2002` becomes 409, `P2025` becomes 404, and `P2003` becomes 409. Never send raw SQL or constraint names to the client, since that exposes your schema.

**Follow-up:**

Where should the mapping live?

Answer: In a single filter, or in a repository layer that turns database errors into domain errors. Then services stay independent of the database, and responses stay consistent.
