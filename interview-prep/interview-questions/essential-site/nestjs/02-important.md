# Essential NestJS — Important

3-day essential set. 30 questions in preparation order. Full handbook remains under `nestjs/`.

### NEST-015 — Interfaces, abstract classes, and tokens

**Difficulty:** Intermediate

**Category:** Dependency injection

**Question:**

`LoggerPort` is a TypeScript interface. `OrdersService` should depend on that shape; tests bind a fake without editing the service. Why can the interface not be the provider token, and what do you use instead?

**Answer:**

TypeScript interfaces are erased at compile time, so at runtime there is nothing for Nest to use as a token; the emitted parameter type is usually just `Object`. Instead, define a token that exists at runtime, such as a string, a symbol, or an abstract class. For example, register `{ provide: LOGGER, useClass: ConsoleLogger }` and inject it with `@Inject(LOGGER)`. The service depends on the token, and a test rebinds the same token to a fake. Abstract classes work as tokens because they exist at runtime, but interfaces never can.

**Code:**

```typescript
export const LOGGER = Symbol('LOGGER');
constructor(@Inject(LOGGER) private readonly log: LoggerPort) {}
```

**Trade-offs:**

Symbol or string tokens decouple the consumer from any implementation. Abstract-class tokens give you both a type and a runtime value, but they tie you to a class hierarchy.

**Follow-up:**

What goes wrong if you type the param as `LoggerPort` without `@Inject`?

Answer: The emitted metadata is useless, usually `Object`, so Nest cannot find the provider you intended. Startup fails or the wrong thing is injected.

### NEST-157 — Access and refresh tokens

**Difficulty:** Intermediate

**Category:** JWT

**Question:**

Explain the access token + refresh token pattern.

**Answer:**

You give the user two tokens. The access token lives for a short time, around 5 to 15 minutes. The client sends it on every request, and the server verifies it without a database lookup. The refresh token lives much longer, for days. The client uses it only on `/auth/refresh` to get a new access token. If an access token is stolen, it expires quickly. The server stores refresh tokens hashed, so it can revoke them.

**Follow-up:**

Why not issue one JWT valid for 30 days?

Answer: If it leaks, it works for 30 days, and you can't revoke it without extra state. Splitting into two tokens keeps the one sent on every request short-lived.

### NEST-016 — What a dynamic module returns

**Difficulty:** Advanced

**Category:** Modules

**Question:**

`FeatureFlagsModule.forRoot(flags)` is called from `AppModule`'s `imports`. What does that static method return, how does it combine with `@Module()` on the class, and what must still be true for injection to work?

**Answer:**

`forRoot` returns a plain object that describes a dynamic module: a `module` property pointing at the class, plus optional `providers`, `exports`, and `imports`. For that particular import, Nest merges the object with whatever `@Module()` already declares on the class. So the providers a caller receives are the ones in the dynamic object plus any static ones. Two things still apply: the class must be a module Nest can load, and the tokens other modules need to inject must be exported, because exports are still how visibility works.

**Code:**

```typescript
static forRoot(flags: Flags): DynamicModule {
  return {
    module: FeatureFlagsModule,
    providers: [{ provide: FLAGS, useValue: flags }],
    exports: [FLAGS],
  };
}
```

**Trade-offs:**

Dynamic modules let the composition root configure a feature without editing the class. Calling `forRoot` from many features duplicates registrations; see NEST-017.

**Follow-up:**

Is the `@Module()` on the class ignored when `forRoot` returns providers?

Answer: No. Nest merges both, so providers declared in the static `@Module()` still register. Only if you leave the decorator empty does everything come from `forRoot`.

### NEST-253 — What does `forbidNonWhitelisted` add on top of `whitelist`

**Difficulty:** Intermediate

**Category:** ValidationPipe

**Question:**

What does `forbidNonWhitelisted` add on top of `whitelist`?

**Answer:**

With `whitelist: true`, unknown properties are silently removed. With `forbidNonWhitelisted: true` added, the pipe instead rejects the request with a 400 error that says something like `property x should not exist`. It only works when `whitelist` is also on. This is useful for strict public APIs, because it exposes client typos early instead of ignoring them. The cost is that it is less forgiving.

**Follow-up:**

When would you avoid it?

Answer: When clients are old or built by third parties and might send extra fields. Strict rejection can turn a harmless client change into an outage, so many teams prefer to be tolerant of extra fields.

### NEST-107 — Accessing the request in a provider

**Difficulty:** Senior

**Category:** Scopes

**Question:**

How do you access the underlying request object inside a provider, and what does that do to the provider's scope?

**Answer:**

Inject the `REQUEST` token from `@nestjs/core`: `constructor(@Inject(REQUEST) private readonly req: Request) {}`. `REQUEST` is itself request-scoped, so this provider becomes request-scoped by bubbling, even if you never set `scope` on the class. Inside an HTTP application the value is the current request. In a GraphQL application the matching token is `CONTEXT`. In a microservice the `REQUEST` token carries the incoming message, including its pattern and data, rather than an HTTP request.

**Follow-up:**

How do you read request data from a singleton, or during bootstrap?

Answer: You cannot inject `REQUEST` there. Pass the data as an argument, store it in `AsyncLocalStorage`, or resolve a request-scoped provider with `ModuleRef.resolve()` and a `ContextId`.

### NEST-010 — Why a global module hides a dependency

**Difficulty:** Senior

**Category:** Modules

**Question:**

`ConfigModule` is `@Global()`, exports `ConfigService`, and is imported once by `AppModule`. Feature modules inject `ConfigService` without listing `ConfigModule` in `imports`. What does `@Global()` change, and what dependency information does it hide?

**Answer:**

`@Global()` makes a module's exports visible to every module without each one importing it. The container is the same; only the requirement to list the module in `imports` is waived. The module must still be imported once, usually at the root, or startup fails. What gets hidden is the dependency edge: when you read a feature module's `imports`, you cannot tell that it relies on `ConfigService`. So a global module is a convenience for the import list, not a second container, and it makes the dependency graph harder to read.

**Trade-offs:**

Globals reduce boilerplate for services used everywhere, like config and logging, but they hide the dependency graph. Prefer explicit imports for coupling between features, and keep `@Global()` for true cross-cutting infrastructure.

**Follow-up:**

A feature provides its own `ConfigService` while a global one exists. Which wins?

Answer: The local registration wins for injectors inside that module. Global visibility does not override a provider of the same token that the module declares itself.

### NEST-160 — localStorage vs httpOnly cookies

**Difficulty:** Intermediate

**Category:** Cookies

**Question:**

Where should a browser SPA keep tokens: localStorage or httpOnly cookies?

**Answer:**

Any script on the page can read localStorage, so a single XSS bug can leak the token. An `httpOnly` cookie can't be read by JavaScript, but the browser attaches it automatically, which opens the door to CSRF. A common compromise is to keep the access token in memory and put the refresh token in an `httpOnly; Secure; SameSite` cookie limited to the refresh path. Each option trades one risk for another.

**Follow-up:**

Does `httpOnly` fully protect against XSS?

Answer: No. It stops attackers from stealing the token, but injected script can still make authenticated requests from the victim's browser while the page is open.

### NEST-179 — RBAC, ABAC, permissions

**Difficulty:** Senior

**Category:** Authorization

**Question:**

Compare RBAC, permission-based, and ABAC authorization.

**Answer:**

RBAC (role-based) links users to roles and roles to actions. It's simple, but coarse, and can lead to "role explosion". Permission-based access assigns fine-grained permissions, like `post:update`, to roles or users. ABAC (attribute-based) decides using attributes of the user, the resource, and the context, such as owner, department, or time of day. It's the most flexible, but harder to audit. Many apps use roles for broad checks and attribute checks for specific resources.

**Follow-up:**

When does RBAC alone stop being enough?

Answer: When the rule depends on the specific resource or context, for example "only edit your own posts", "only during business hours", or "only within your own tenant".

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

### NEST-335 — The dual-write problem the outbox solves

**Difficulty:** Senior

**Category:** Outbox

**Question:**

What is the dual-write problem when a Nest service saves an order and publishes an event?

**Answer:**

You need two effects: a committed row, and a message other services can trust. They are not one transaction. If you commit and the process dies before publish, the order exists and nobody else hears about it. If you publish and the commit then fails, other services react to an order that never landed. The transactional outbox writes the message in the same database transaction as the order. A later publisher reads that table and sends what actually committed. You may still publish twice. What you gain is that the published message matches a row that committed.

**Follow-up:**

Why not a distributed transaction across Postgres and Kafka?

Answer: Nest and the usual drivers do not enroll Kafka and Postgres in one two-phase commit, and that coupling is brittle. The outbox keeps one local transaction and moves the rest to retries and idempotent consumers.

### NEST-344 — Why every replica fires the same cron

**Difficulty:** Senior

**Category:** Scheduling

**Question:**

You deploy three Nest replicas and a nightly `@Cron` sends the same invoices three times. Why, and what are sound fixes?

**Answer:**

Each replica loads `ScheduleModule` and runs the schedule on its own clock. Nothing in `@nestjs/schedule` elects a leader. Sticky sessions do not help, because there is no client connection to pin. Three fixes work. Run the scheduler as a single deployment, not on every API pod. Take a distributed lock, in Redis or with a Postgres advisory lock, and skip the run when you do not get it. Or use a BullMQ repeatable job so Redis adds one job per tick and one worker runs it. Keep the handler idempotent in case a lock expires and a second runner starts.

**Follow-up:**

What if two pods have clocks a minute apart?

Answer: Both can believe they own “midnight.” A lock with a clear expiry, or a BullMQ schedule stored in one place, is stronger than hoping the clocks match.

### NEST-085 — APP_INTERCEPTOR and useGlobalInterceptors

**Difficulty:** Senior

**Category:** Interceptors

**Question:**

`LoggingInterceptor` needs `AuditService`. Compare `useGlobalInterceptors(new LoggingInterceptor())` with `{ provide: APP_INTERCEPTOR, useClass: LoggingInterceptor }`. Which one gets dependency injection, and what is the inbound order if both exist?

**Answer:**

Only the `APP_INTERCEPTOR` registration is constructed by the module injector, so only that instance receives `AuditService`. `new LoggingInterceptor()` skips injection. During startup, Nest records static `APP_INTERCEPTOR` providers while it scans modules, and `useGlobalInterceptors` appends after that. On the way in, those injected globals run first and the manually constructed instances run after them. The same rule you use for guards applies here: `new` is only honest when the constructor has no dependencies.

**Trade-offs:**

`APP_INTERCEPTOR` is the right registration when the interceptor needs services. A manual `new` is limited to an empty constructor.

**Follow-up:**

The `APP_INTERCEPTOR` is request-scoped. Where is it stored, compared with a static global interceptor?

Answer: It is stored on the per-request interceptor list, not on the static global list. Each request resolves a new instance, and Nest places those instances after the static global interceptors.

### NEST-119 — ModuleRef.resolve() vs get()

**Difficulty:** Senior

**Category:** ModuleRef and ContextId

**Question:**

How does `ModuleRef.resolve()` differ from `get()`?

**Answer:**

`get()` is synchronous and returns the singleton already created at startup. `resolve()` returns a Promise and is how you obtain a transient or request-scoped instance, including the providers that had to bubble up with it. Each `resolve()` call creates a new instance unless you pass the same `ContextId`. Use `get()` when you know the provider is static. Use `resolve()` when the scope is per request or per consumer and you are outside the normal constructor injection path, such as in a cron job.

**Follow-up:**

How do you get the same transient instance from two `resolve()` calls?

Answer: Create one `ContextId` with `ContextIdFactory.create()` and pass it to both calls: `await moduleRef.resolve(Svc, contextId)`.

### NEST-028 — What forwardRef delays

**Difficulty:** Senior

**Category:** Dependency injection

**Question:**

`OrdersService` and `BillingService` each take the other in their constructors; module files import each other too. What does `forwardRef` from `@nestjs/common` actually postpone?

**Answer:**

`forwardRef(() => Token)` wraps the class in a function, so Nest reads the real class later, during dependency resolution, after both files have finished evaluating. That avoids the problem where circular ES imports leave an `undefined` token. Use it in module `imports` and with `@Inject(forwardRef(() => OtherService))` in provider constructors. It does not magically break a real construction loop: if both constructors immediately call each other, you still have a problem, so keep constructors light.

**Code:**

```typescript
constructor(
  @Inject(forwardRef(() => BillingService))
  private readonly billing: BillingService,
) {}
```

**Trade-offs:**

`forwardRef` lets the app boot, but extracting a mediator module removes the cycle. Prefer a redesign when both sides need each other at construction time.

**Follow-up:**

Module `forwardRef` only—services still fail. Why?

Answer: The injected service tokens can still be `undefined` when the decorators run, so the service parameters need `forwardRef` as well.

### NEST-052 — What middleware is allowed to touch

**Difficulty:** Intermediate

**Category:** Middleware

**Question:**

`LoggerMiddleware.use(req, res, next)` should reject callers missing a role from `@Roles()` on the handler. Why is middleware the wrong place for that, and what must `use` do before it returns?

**Answer:**

Middleware is an Express function of the request, the response, and `next`. It runs after the path has matched and before Nest's route proxy, which is the layer that knows the controller method. There is no `ExecutionContext`, so there is no `getHandler()` or `getClass()` for `Reflector` to read `@Roles()`. Role checks belong in a guard, where that context exists. Before `use` returns it must either finish the response or call `next()`. Nest does not call `next()` for you. Ending the response here skips guards, interceptors, pipes, and the handler.

**Code:**

```typescript
use(req: Request, res: Response, next: NextFunction): void {
  res.setHeader('x-request-id', req.header('x-request-id') ?? crypto.randomUUID());
  next();
}
```

**Follow-up:**

Where do you log after the handler finishes if middleware already called `next()`?

Answer: Listen for `res.on('finish')` if you want the status Express eventually sent. If you want the controller's return value before it is written, use an interceptor on the way out.

### NEST-164 — CSRF with cookie auth

**Difficulty:** Senior

**Category:** CSRF

**Question:**

When is CSRF a risk, and how do you mitigate it in Nest?

**Answer:**

CSRF is a risk when the browser sends credentials automatically, which is what happens with cookie-based auth. A bearer token in the `Authorization` header isn't sent automatically, so it isn't vulnerable. To protect cookie auth, use `SameSite=Lax` or `Strict`, add CSRF tokens (double-submit cookie or synchronizer token, for example with `csrf-csrf`, since `csurf` is deprecated), check `Origin` or `Referer`, or require a custom header. Never change state in GET handlers.

**Follow-up:**

Does `SameSite=Lax` alone make a cookie-authenticated API CSRF-safe?

Answer: It blocks most cross-site POSTs, but not same-site attacks (such as from a sibling subdomain), old browsers, or unsafe GET handlers. Treat it as one layer alongside tokens.

### NEST-182 — Ownership checks

**Difficulty:** Senior

**Category:** Authorization

**Question:**

Where should resource-ownership checks live: in a guard or in the service?

**Answer:**

Usually in the service. Guards run before the handler and don't have the entity, so loading it in the guard means querying twice. A question like "is this my order?" is best answered after loading the order, or directly in the query, for example `where: { id, userId }`. That also avoids revealing whether the record exists. Keep guards for coarse checks such as role, permission, or tenant membership.

**Follow-up:**

Should a resource that exists but isn't yours return 404 or 403?

Answer: Often 404, so you don't reveal that the id exists. Use 403 when the caller already knows about the resource and the distinction helps, such as with shared resources.

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

### NEST-256 — What are DTO design principles for a good API

**Difficulty:** Intermediate

**Category:** DTO design

**Question:**

What are DTO design principles for a good API?

**Answer:**

Treat DTOs as your public contract. Use separate DTOs for input and output, and one DTO per use case, such as `CreateUserDto` and `UpdateUserDto`. Never bind database entities directly to requests. Keep DTOs flat when you can, validate at the edge of the app, and name them by intent. Avoid exposing internal ids or fields clients don't need. Entities are your storage model, and they should be free to change without breaking clients.

**Follow-up:**

Why not reuse the TypeORM/Prisma entity as the DTO?

Answer: It ties your API to your database schema, so any schema change can break clients. It also risks mass assignment and leaking sensitive columns, and mixes persistence decorators with validation rules.

### NEST-304 — What a processor does and how concurrency works

**Difficulty:** Intermediate

**Category:** Background jobs

**Question:**

What does a BullMQ processor in Nest actually run, and what does concurrency change?

**Answer:**

A processor is the class that pulls jobs for one queue. With `@nestjs/bullmq` you extend `WorkerHost` and implement `process(job)`. Every named job on that queue comes through this one method, so you branch on `job.name`. The older Bull package is different: each name can have its own `@Process()` method. Concurrency on `@Processor()` is how many jobs this worker runs at once. That helps input and output, such as HTTP calls. It does not add CPU, because those jobs still share one Node thread.

**Follow-up:**

Where should CPU-heavy work go?

Answer: Move it to a separate worker process or to worker threads. Raising concurrency on the API process still blocks the same event loop that serves HTTP.

### NEST-368 — createNestApplication

**Difficulty:** Intermediate

**Category:** HTTP tests

**Question:**

How do you turn a TestingModule into an HTTP app?

**Answer:**

Call `moduleRef.createNestApplication()` to get an `INestApplication`, the same kind of object `main.ts` boots. Pass `{ logger: false }` when you want a quiet run. Apply the global prefix, versioning, pipes, and filters your real bootstrap applies, then `await app.init()`, and pass `app.getHttpServer()` to supertest. The default platform is Express. Pass a Fastify adapter when production uses Fastify, so the test hits the same adapter. The HTTP server is ready for in-process requests after `init()`.

**Follow-up:**

When would you call `createNestMicroservice` instead?

Answer: Use it for a transporter such as TCP, Redis, or NATS and for `@MessagePattern` handlers. A `@Get` controller test needs `createNestApplication` and `getHttpServer()`. The microservice app does not expose that HTTP server.

### NEST-021 — What is unsafe in a constructor

**Difficulty:** Senior

**Category:** Lifecycle

**Question:**

`PaymentsService` injects `ClientsService`. Its constructor calls `this.clients.ping()`, but `ping()` needs a socket opened in `ClientsService.onModuleInit`. Why is this unsafe?

**Answer:**

Constructors run during `create()`, which is before `init()` runs the lifecycle hooks. When `PaymentsService` is constructed, `ClientsService` exists as an object, but its `onModuleInit` has not run yet, so the socket is not open. Calling `ping()` in the constructor therefore races unfinished setup. Move the work to `onModuleInit` or `onApplicationBootstrap`, or do it lazily on first use after the hooks have run. A constructor should only store its dependencies.

**Trade-offs:**

Constructor work fails fast but cannot rely on hooks. Hooks give you ordering, at the cost of readiness being deferred.

**Follow-up:**

Is it safe if `ClientsService` opens the socket in its own constructor instead?

Answer: The ordering gets better, but async failures are hidden and `create()` becomes slower. Prefer hooks for async connections, and keep constructors synchronous and light.

### NEST-176 — `getAllAndOverride` vs `getAllAndMerge`

**Difficulty:** Intermediate

**Category:** Guards

**Question:**

What is the difference between `Reflector.getAllAndOverride` and `getAllAndMerge`?

**Answer:**

Both read metadata from several places, usually the handler and the class. `getAllAndOverride` returns the first value it finds, checking the handler before the class, so method-level metadata wins. `getAllAndMerge` combines the values from all targets into one array or object. Use override for simple flags like `@Public()`. Use merge when class-level and method-level values should add up, such as roles that accumulate.

**Follow-up:**

With `@Roles('admin')` on the class and `@Roles('editor')` on a method, which do you want?

Answer: It depends on your intent. Override means only `editor` can use that method, which narrows access. Merge means `admin` or `editor` can, which widens it. Pick one deliberately and document it.

### NEST-139 — @Global() modules

**Difficulty:** Senior

**Category:** Exports and global modules

**Question:**

What does `@Global()` do, and when is it appropriate?

**Answer:**

`@Global()` makes a module's exports injectable in every module without a further import. The global module still has to be imported once, almost always by the root module, so that Nest actually registers it. It fits infrastructure that truly is application-wide, such as configuration, logging, or the database connection. Feature services should stay behind a normal import, because an import is the documentation of the dependency.

**Trade-offs:**

A global module removes repeated imports and hides the dependency. A feature looks self-contained while it silently relies on the global provider, which makes the graph harder to test and to move.

**Follow-up:**

Is marking every shared module `@Global()` a good shortcut?

Answer: No. The dependency graph becomes implicit and harder to test. Keep `@Global()` for a few providers that really are application-wide.

### NEST-263 — How do you customize validation error responses

**Difficulty:** Senior

**Category:** Error shape

**Question:**

How do you customize validation error responses?

**Answer:**

Pass an `exceptionFactory` to `ValidationPipe`. It receives the list of `ValidationError` objects, and you return your own exception, such as `new BadRequestException({...})`. Inside, flatten the constraints into your standard error shape, for example field, code, and message. You can also use `errorHttpStatusCode` to change the status code, and `disableErrorMessages` to hide details in production.

**Follow-up:**

How do you flatten nested errors?

Answer: Walk through `ValidationError.children` recursively. Build dotted paths like `address.zip`, and collect the `constraints` at each level.

### NEST-267 — What's the difference between `app.useGlobalPipes()` and `APP_PIPE`

**Difficulty:** Intermediate

**Category:** Pipes

**Question:**

What's the difference between `app.useGlobalPipes()` and `APP_PIPE`?

**Answer:**

`app.useGlobalPipes()` is called in `main.ts`, outside Nest's dependency injection, so that pipe can't inject any providers. Registering `{ provide: APP_PIPE, useValue or useClass }` inside a module puts the pipe in the container, so it can use dependencies. It also applies whenever the app is built from the module, including in e2e tests. With `useGlobalPipes`, you must repeat the setup in every test.

**Follow-up:**

Why do e2e tests sometimes miss validation?

Answer: The global pipes in `main.ts` don't run when tests build the app with `Test.createTestingModule`. You have to call `app.useGlobalPipes` again in the test, or register the pipe with `APP_PIPE`.

### NEST-310 — Attempts and backoff

**Difficulty:** Intermediate

**Category:** Retries

**Question:**

How should you configure BullMQ attempts and backoff for a job that calls another service?

**Answer:**

A job is not retried unless you set `attempts`. Set it to the total number of tries you are willing to pay for, including the first run. Without backoff, the retries happen immediately and you hammer the same outage. Use `backoff: { type: 'exponential', delay: 1000 }` so the waits grow, or `fixed` when you want a steady gap. Add jitter if many jobs fail together, or they all wake up at once and recreate the outage. Retries help transient errors. They do not fix a bad payload.

**Follow-up:**

What do you lose if attempts is very high?

Answer: A broken dependency keeps a worker busy for a long time, and the queue grows behind it. Cap the tries, then park the job and alert someone.

### NEST-400 — A practical Nest test portfolio

**Difficulty:** Senior

**Category:** Test strategy

**Question:**

How would you describe the test portfolio for a NestJS 10 service?

**Answer:**

Most tests are unit tests of services, guards, pipes, interceptors, and processors. They use `Test.createTestingModule`, override Prisma or a repository, and call the subject directly. Close the module when a hook opens a resource. HTTP tests use `createNestApplication`, a shared `configureApp`, and supertest. One Postgres file, with migrations and truncation on a single worker, proves the SQL. Cron and queues are tested by calling the handler. The gateway gets a unit test and one Socket.IO round trip. Add Pact when another team consumes the API. Treat coverage as a map of what ran, and trust the assertions.

**Follow-up:**

What do you leave real, and what do you replace?

Answer: Leave the class under test real. Keep the real guard when the spec is about authorization, the real `ValidationPipe` when the spec is about the DTO, and real SQL when the spec is about a constraint or a migration. Replace the edges those units call: Prisma delegates, `HttpService`, `queue.add`, the mailer, and the clock.
