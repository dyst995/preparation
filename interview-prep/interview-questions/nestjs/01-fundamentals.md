# NEST01 — Fundamentals and architecture

NestJS 10. Questions NEST-001–NEST-050.

Bootstrap and hook order follow NestJS 10.4. Decorators and lifecycle cover `@Module`, `@Controller`, `@Injectable`, `@Inject`, `@Optional`, `@Global`, `forwardRef`, and `OnModuleInit` / `OnApplicationBootstrap` / shutdown hooks. This section is the DI container, module graph, and composition root—not the HTTP request pipeline.


### NEST-001 — What create() builds, and what listen() still has to do

**Difficulty:** Intermediate

**Category:** Architecture

**Question:**

A Nest 10 process calls `NestFactory.create(AppModule)` then `app.listen(3000)` without calling `app.init()` itself. Default Express platform, default scopes. What has finished when `create()` resolves, and what still runs before the process accepts connections?

**Answer:**

`create()` builds the DI container, scans the module graph from `AppModule`, and constructs providers. Constructor injection is done; `app.get()` works. Lifecycle hooks have not run, routes are unbound, and the port is closed. `listen()` sees `isInitialized === false`, awaits `init()` (options, adapter, middleware, route binding, `onModuleInit`, exception handlers, `onApplicationBootstrap`), then binds the TCP port. Decorators only wrote metadata at class evaluation; the scanner and route resolver turn that into a server.

**Trade-offs:**

Call `app.init()` yourself when something must see a fully initialized graph before the port opens; `listen()` then skips a second init. Use `createApplicationContext()` when you need the container without HTTP (NEST-019).

**Follow-up:**

If a provider constructor throws during `NestFactory.create()`, what does the default `abortOnError` path do?

Answer: With `abortOnError: true` (default), the init error handler calls `process.abort()`. The `create()` promise is not the failure channel. Pass `{ abortOnError: false }` so tests or a supervisor get a thrown error instead of `SIGABRT`.

### NEST-002 — The four @Module arrays

**Difficulty:** Intermediate

**Category:** Modules

**Question:**

In NestJS 10, `@Module()` takes `imports`, `controllers`, `providers`, and `exports`. What does each array contribute, and which of them crosses a module boundary?

**Answer:**

`imports` lists modules whose exports become visible here and pulls those modules into the graph. `controllers` lists classes whose route metadata is bound in this module. `providers` registers this module's injectables (a class is `{ provide: Class, useClass: Class }`), visible only inside the module. `exports` is the public surface: a provided or imported token, or a re-exported module. Encapsulation is `providers` creates the instance; `exports` grants other modules the right to inject it.

**Code:**

```typescript
@Module({
  imports: [PricingModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
```

**Trade-offs:**

Wide exports ease reuse but widen the contract. Narrow exports keep the module replaceable. Re-exporting an imported module fits a composition root better than a feature module.

**Follow-up:**

Can `exports` name a provider the module neither provides nor imports?

Answer: No. Nest rejects that export while building the module. The token must already be in this module's context via `providers` or `imports`.

### NEST-003 — Why a class must be registered

**Difficulty:** Intermediate

**Category:** Providers

**Question:**

`OrdersService` has `@Injectable()` and is imported by `OrdersController`, but it is omitted from every `providers` array and no global module exports it. Nest fails with an unknown-dependency error. Why is the import plus the decorator not enough?

**Answer:**

`@Injectable()` triggers `design:paramtypes` emit; the file import gives the controller a runtime token. Neither registers the class in the container. Registration is a `providers` entry (or an export from an imported module). The instance loader looks up `OrdersService` in the controller's module context; a miss fails startup. Discovery of every `@Injectable()` file would erase ownership, export boundaries, and test doubles.

**Code:**

```typescript
@Module({
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
```

**Trade-offs:**

`@Optional()` injects `undefined` on a miss—useful for plugins, not for a required service. `new OrdersService()` leaves the container: no further DI and no lifecycle hooks.

**Follow-up:**

The class is listed in `providers` and the controller still fails. What do you check next?

Answer: Confirm the controller's module provides the class or imports a module that exports it. Confirm a runtime value import (not `import type`) and that `reflect-metadata` loaded before the module was evaluated—import `NestFactory` before `AppModule`.

### NEST-004 — How constructor injection chooses a token

**Difficulty:** Senior

**Category:** Dependency injection

**Question:**

With Nest 10's legacy decorator emit (`experimentalDecorators` + `emitDecoratorMetadata`), how does `constructor(private readonly orders: OrdersService)` become a container lookup, and when must `@Inject()` replace that?

**Answer:**

A decorated class emits `design:paramtypes`: runtime values Nest treats as tokens (the class constructor for a class parameter). Lookup is local providers, then imported exports. The parameter name is irrelevant. `@Injectable()` / `@Controller()` drive that emit; a plain class often has none. `@Inject(Token)` stores an explicit Nest token and wins—required for strings/symbols and interfaces (interfaces erase to `Object`). Factories use an `inject` array, not `design:paramtypes`.

**Code:**

```typescript
constructor(
  private readonly orders: OrdersService,
  @Inject(AUDIT) private readonly audit: AuditTrail,
  @Optional() private readonly extra?: OrdersService,
) {}
```

**Trade-offs:**

Type-based injection is short but breaks on `import type`, interfaces, unions, or missing decorator metadata. Explicit `@Inject()` survives those cases. Plain JS uses `@Dependencies(...)`.

**Follow-up:**

Both `OrdersService` and `{ provide: OrdersService, useClass: CachedOrdersService }` exist. Which class is constructed?

Answer: The constructor token is `OrdersService`. The registration's `useClass` is `CachedOrdersService`, so that class is constructed. The TypeScript type is a compile-time claim; runtime is the token binding.

### NEST-005 — What the default scope actually guarantees

**Difficulty:** Senior

**Category:** Dependency injection

**Question:**

Nest's default provider scope is singleton (`Scope.DEFAULT`). For one `providers: [OrdersService]` registration exported to every injector that needs it, what is the lifetime and identity of that instance, and what does "singleton" not mean?

**Answer:**

One registration yields one eagerly constructed instance during `create()`, cached and returned to every legal injector of that token until the container closes—even with no HTTP traffic. "Singleton" means one instance per registration, not one per realm across duplicate registrations, and not per request. A second `providers: [OrdersService]` elsewhere is a second registration; sharing requires one provide/export and imports. `REQUEST` and `TRANSIENT` change instance count and are covered later.

**Trade-offs:**

Eager singletons pay construction at startup and share mutable state with every caller—right for shared clients, wrong for per-request data. Prefer method arguments over stuffing request data into default-scope fields.

**Follow-up:**

Two controllers in different modules inject `OrdersService`. When same object vs two?

Answer: Same object when both reach one registration (one module provides/exports; the other imports it). Two objects when each module lists `OrdersService` in its own `providers`. Default scope does not deduplicate.

### NEST-006 — What belongs on a controller, and what belongs on a service

**Difficulty:** Intermediate

**Category:** Architecture

**Question:**

Someone puts order-total calculation, a database call, and response-header logic in `OrdersController`. In Nest 10 HTTP, what is the controller's job, what is the provider's job, and what does the framework actually enforce?

**Answer:**

A controller is the HTTP adapter: route metadata is bound during `init()`, params come from decorators, and the return value is serialized (unless `@Res()` takes over). A service is a container provider with no routes—the place for calculation and persistence. The controller should translate HTTP ↔ service. Nest does not enforce the split; a fat controller still binds. The cost appears when a non-HTTP caller needs the same rule: controllers are tied to the HTTP pipeline; services inject cleanly into an application context.

**Code:**

```typescript
@Post()
create(@Body() body: CreateOrderDto) {
  return this.orders.create(body);
}
```

**Trade-offs:**

Logic in the controller is fewer classes but unusable from CLI/jobs without HTTP. Throwing `HttpException` from the service couples domain to HTTP types—prefer domain results and map status at the boundary.

**Follow-up:**

The service needs the authenticated user id. Where is that value read?

Answer: At the HTTP boundary: a param decorator or guard produces the id; the controller passes it as an argument. The service stays a function of its arguments and injected providers.

### NEST-007 — Decorators are metadata, not the behavior

**Difficulty:** Senior

**Category:** Decorators

**Question:**

`@Controller()`, `@Get()`, `@Injectable()`, and a custom `@Roles('admin')` via `SetMetadata` are on a Nest 10 module. At class definition time, what does each decorator do, and what later reads that metadata?

**Answer:**

Decorators run at file evaluation and only write `reflect-metadata`. `@Module` / `@Controller` / `@Get` store module and route metadata; `@Injectable()` marks the provider and drives `design:paramtypes`. `@Roles` is `SetMetadata(ROLES_KEY, ...)`. None open ports or check roles. The scanner and route resolver read framework metadata during `create()`/`init()`. Application metadata matters only when something (e.g. a guard via `Reflector`) reads it—without a reader, `@Roles` is inert.

**Code:**

```typescript
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
```

**Trade-offs:**

Metadata keeps cross-cutting marks next to handlers but is easy to assume "works" because the annotation is present. Use decorators when a shared reader must discover the mark; use ordinary code for local behavior.

**Follow-up:**

How do you confirm `@Roles()` is recorded without an HTTP request?

Answer: Read with `Reflector` or `Reflect.getMetadata(ROLES_KEY, …)` in a unit test after `reflect-metadata` loads. A recorded decorator without a guard is still a product bug—different from "wrote nothing."

### NEST-008 — onModuleInit versus onApplicationBootstrap

**Difficulty:** Senior

**Category:** Lifecycle

**Question:**

`OrdersService` opens a client, and a root scheduler should start only after every feature module has initialized. Nest 10.4 HTTP, default scopes. Which hook on each, and what has / has not happened when they run?

**Answer:**

`onModuleInit` runs during `init()` after the host module's deps resolve; Nest awaits promises. Walk is by import distance (dependents after dependencies; root last). Use it on `OrdersService` to open its client—imported modules' `onModuleInit` finished; sibling modules may not have. `onApplicationBootstrap` is a second pass after every `onModuleInit`; put the scheduler there for "all features ready." Port is still closed. Hooks are detected by method presence; interfaces are TypeScript-only. `NestModule.configure()` registers middleware earlier and is not "module ready."

**Trade-offs:**

`onModuleInit` keeps setup with the owning module. `onApplicationBootstrap` is the graph-ready gate but becomes hidden coupling if everything dumps there. Post-accept work belongs after `listen()` resolves.

**Follow-up:**

Your `onModuleInit` promise rejects. Does `listen()` bind the port?

Answer: No. Nest awaits the hook; rejection fails `init()`, so `listen()` rejects before bind. The port is not left half-open.

### NEST-009 — Shutdown hooks and enableShutdownHooks()

**Difficulty:** Senior

**Category:** Lifecycle

**Question:**

The process receives `SIGTERM`. `OrdersService` must stop taking work and close a client. What do you call at bootstrap, which methods run, and what does `app.close()` do that a bare signal handler does not? Nest 10.4 HTTP.

**Answer:**

Call `app.enableShutdownHooks()` so Nest listens for process signals (off by default). Shutdown order is `onModuleDestroy`, then `beforeApplicationShutdown(signal)`, then adapter disposal, then `onApplicationShutdown(signal)`—promises awaited. `app.close()` always runs that sequence without exiting the process. On a signal after hooks are enabled, Nest runs the same phases, then re-sends the signal so the process can terminate. Without `enableShutdownHooks()`, signals do not drive Nest lifecycle hooks.

**Trade-offs:**

Hooks give orderly teardown; a hanging hook blocks exit—use supervisor timeouts. Several Nest apps in one process can trip Node's listener warning if each enables hooks.

**Follow-up:**

Where do you close a connection pool if in-flight HTTP handlers must finish queries first?

Answer: Close it in `onApplicationShutdown`, after adapter disposal between `beforeApplicationShutdown` and `onApplicationShutdown`. Stop intake earlier (`onModuleDestroy` or `beforeApplicationShutdown`).

### NEST-010 — Why a global module hides a dependency

**Difficulty:** Senior

**Category:** Modules

**Question:**

`ConfigModule` is `@Global()`, exports `ConfigService`, and is imported once by `AppModule`. Feature modules inject `ConfigService` without listing `ConfigModule` in `imports`. What does `@Global()` change, and what dependency information does it hide?

**Answer:**

`@Global()` makes the module's exports visible to every module without each importing it. Injection still uses the same container; only the import requirement is waived. What disappears from feature `imports` arrays is the explicit edge: readers of the module graph cannot see that features depend on `ConfigService`. Startup still fails if the global was never imported at the root. Globals are a convenience, not a second container.

**Trade-offs:**

Globals reduce boilerplate for ubiquitous services (config, logging) and hide the dependency graph. Prefer explicit imports for feature-to-feature coupling; reserve `@Global()` for true cross-cutting kernels.

**Follow-up:**

A feature provides its own `ConfigService` while a global one exists. Which wins?

Answer: The local registration in that module's context wins for injectors in that module. Global visibility does not override a local provider of the same token.

### NEST-011 — Circular module imports

**Difficulty:** Senior

**Category:** Modules

**Question:**

`OrdersModule` imports `BillingModule` and `BillingModule` imports `OrdersModule`. Startup fails or sees `undefined` in an `imports` array. What is circular, when does `forwardRef` help, and what remains a design smell?

**Answer:**

Two cycles exist: ES module evaluation (one file gets `undefined` for the other class) and Nest's module graph. Wrap the import with `forwardRef(() => OtherModule)` (and often `forwardRef` on the provider side too) so Nest delays resolving the token until both classes exist. That fixes bootstrap; it does not fix the design—bidirectional module coupling still means unclear ownership. Prefer extracting a shared module or inverting one dependency.

**Code:**

```typescript
@Module({
  imports: [forwardRef(() => BillingModule)],
})
export class OrdersModule {}
```

**Trade-offs:**

`forwardRef` unblocks boot; extracting a third module or events/API boundary removes the cycle. Prefer fixing the graph over proliferating `forwardRef`.

**Follow-up:**

Is `forwardRef` on modules enough when services also inject each other?

Answer: No. Provider constructors need `forwardRef(() => OtherService)` with `@Inject` as well, or the injector still sees an unresolved circular provider dependency.

### NEST-012 — A file on disk is not in the application

**Difficulty:** Intermediate

**Category:** Project structure

**Question:**

`src/shipping/shipping.module.ts` defines `ShippingModule` with a controller and provider. No other file mentions `ShippingModule`. `nest start` boots, and `GET /shipping` 404s. Why?

**Answer:**

Nest only loads modules reachable from the root via `imports`. A file on disk is irrelevant until some loaded module imports it. `ShippingModule` was never imported, so its controllers were never scanned or bound—hence 404, not a Nest "unknown module" for an unused file. Add `ShippingModule` to `AppModule` (or another loaded module's) `imports`.

**Follow-up:**

The module is imported but the route still 404s. What next?

Answer: Confirm the controller is in that module's `controllers` array (not only `providers`), the path metadata matches, and no global prefix/versioning changed the URL.

### NEST-013 — Sharing one instance across modules

**Difficulty:** Senior

**Category:** Providers

**Question:**

`OrdersModule` and `BillingModule` both need the same `TaxService` instance—one cache, one config. How do you register it so both share one object in Nest 10?

**Answer:**

Provide `TaxService` once in a dedicated module (e.g. `TaxModule`), export it, and import `TaxModule` from both features. Default scope then yields one instance for that registration. Do not list `TaxService` in both features' `providers`—that creates two registrations and two instances. `@Global()` on `TaxModule` can omit repeated imports but still must be imported once at the root.

**Code:**

```typescript
@Module({ providers: [TaxService], exports: [TaxService] })
export class TaxModule {}
```

**Trade-offs:**

A shared module makes ownership clear. Duplicating providers "for convenience" silently forks state. Globals hide the import edge.

**Follow-up:**

Both modules already provide `TaxService` locally. How do you merge to one instance without breaking injectors?

Answer: Remove local `providers` entries, export from one module, import that module (or re-export) everywhere that injects the token.

### NEST-014 — useClass, useValue, useFactory, and useExisting

**Difficulty:** Senior

**Category:** Providers

**Question:**

When do you write `useClass`, `useValue`, `useFactory`, and `useExisting` instead of `providers: [TaxService]`, and what does each bind?

**Answer:**

`useClass` binds a token to a different constructible class. `useValue` binds a ready instance/constant (no construction). `useFactory` runs a function (sync/async) whose `inject` array supplies args—best for conditional wiring. `useExisting` aliases a token to another already-registered token (same instance). Shorthand `providers: [TaxService]` is only `provide`+`useClass` of the same class.

**Code:**

```typescript
{ provide: TaxService, useClass: CachedTaxService },
{ provide: RATES, useValue: { vat: 0.2 } },
{ provide: Client, useFactory: (c: Config) => new Client(c.url), inject: [Config] },
{ provide: AbstractTax, useExisting: TaxService },
```

**Trade-offs:**

`useValue` is simplest but starts work at module evaluation if you pass a live Promise/IO. Factories delay until instantiation and can be async. Aliases avoid duplicate instances.

**Follow-up:**

Does `useExisting` create a second object?

Answer: No. It publishes another token that resolves to the existing provider's instance.

### NEST-015 — Interfaces, abstract classes, and tokens

**Difficulty:** Intermediate

**Category:** Dependency injection

**Question:**

`LoggerPort` is a TypeScript interface. `OrdersService` should depend on that shape; tests bind a fake without editing the service. Why can the interface not be the provider token, and what do you use instead?

**Answer:**

Interfaces erase at compile time—no runtime value for `design:paramtypes` (often `Object`). Use a string/symbol/class token: `@Inject(LOGGER)` with `{ provide: LOGGER, useClass: ConsoleLogger }`. Abstract classes exist at runtime and can be tokens, but interfaces cannot. The service depends on the token; tests rebind the same token to a fake.

**Code:**

```typescript
export const LOGGER = Symbol('LOGGER');
constructor(@Inject(LOGGER) private readonly log: LoggerPort) {}
```

**Trade-offs:**

Symbol/string tokens decouple from implementations. Abstract-class tokens give type+runtime value but couple to a class hierarchy.

**Follow-up:**

What goes wrong if you type the param as `LoggerPort` without `@Inject`?

Answer: Emitted metadata is useless (`Object`/empty). Nest cannot resolve the intended provider; startup fails or injects the wrong thing.

### NEST-016 — What a dynamic module returns

**Difficulty:** Advanced

**Category:** Modules

**Question:**

`FeatureFlagsModule.forRoot(flags)` is called from `AppModule`'s `imports`. What does that static method return, how does it combine with `@Module()` on the class, and what must still be true for injection to work?

**Answer:**

`forRoot` returns a dynamic module object: `{ module: FeatureFlagsModule, providers, exports, imports? }`. Nest merges that with the class's `@Module()` metadata for this import edge. Providers registered only in the dynamic object are what callers get. The class must still be a module Nest can load; exporting the tokens you need remains required for other modules to inject them.

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

Dynamic modules configure at the composition root without editing the feature class. Overusing `forRoot` from every feature duplicates registrations (see NEST-017).

**Follow-up:**

Is the `@Module()` on the class ignored when `forRoot` returns providers?

Answer: No. Nest merges both. Static `@Module` providers still register unless you keep the class empty and put everything in `forRoot`.

### NEST-017 — When a dynamic module is the wrong seam

**Difficulty:** Advanced

**Category:** Modules

**Question:**

A reviewer sees `DatabaseModule.forRoot(options)` imported from `OrdersModule`, `BillingModule`, and `AppModule`, each with slightly different `options`. Why is a dynamic module the wrong seam here?

**Answer:**

Each `forRoot` import can register another copy of the "root" providers—multiple clients, pools, or configs—instead of one shared connection. `forRoot` belongs once at the composition root (`AppModule`). Features should import a thin `forFeature` (or the already-configured module) that adds feature-local providers without re-running root registration. Different options per feature usually mean you wanted named connections or feature config, not three roots.

**Trade-offs:**

One `forRoot` + many `forFeature` keeps a single shared client. Multiple `forRoot` calls are only justified for truly separate connections with distinct tokens.

**Follow-up:**

How do you spot accidental double registration at runtime?

Answer: Log/construct counters in the provider factory, or inspect duplicate custom tokens. Two pools for one DB usually means `forRoot` was imported twice.

### NEST-018 — main.ts and the composition root

**Difficulty:** Intermediate

**Category:** Project structure

**Question:**

What belongs in `main.ts`, what belongs in `AppModule`, and which HTTP settings must be applied before `listen()` because of when `init()` reads them?

**Answer:**

`main.ts` is the composition root for process wiring: `NestFactory.create`, global prefix/pipes/filters/CORS/`enableShutdownHooks`, then `listen`. `AppModule` owns the module graph—imports, root providers, not HTTP server options. Settings like `setGlobalPrefix` must run before routes are registered inside `init()`; calling them after `listen()` resolves is too late for that bind. Keep business modules out of `main.ts`.

**Trade-offs:**

Fat `main.ts` hides the graph; fat `AppModule` with Express calls breaks non-HTTP entry points. Split process bootstrap vs module composition.

**Follow-up:**

Why can `app.use(middleware)` after `await app.listen()` miss routes?

Answer: Route registration already happened in `init()` during `listen()`. Late middleware may not wrap already-bound handlers as you expect—configure before listen/init completes.

### NEST-019 — create() versus createApplicationContext()

**Difficulty:** Senior

**Category:** Lifecycle

**Question:**

A worker should run `OrdersService.rebuild()` once and exit with no port. Compare `NestFactory.create()` + `listen()` with `NestFactory.createApplicationContext()`. Which lifecycle still runs?

**Answer:**

`create()` builds an HTTP application; `listen()` runs `init()` and binds a port—unnecessary for a one-shot worker. `createApplicationContext()` builds the same DI module graph without an HTTP adapter/listener. You still get provider construction and can `init()`/lifecycle hooks as applicable, call the service, then `close()`. Prefer application context for CLI/workers; use `create()` when you need HTTP.

**Trade-offs:**

HTTP `create`+`listen` unifies codepaths but opens a port and adapter overhead. Application context is leaner for jobs.

**Follow-up:**

Do you need `listen()` for `onModuleInit` to run in a worker?

Answer: No. Initialize the context (`init` if required by your Nest version/path) without listening; then run work and `close()`.

### NEST-020 — What the HTTP adapter owns

**Difficulty:** Advanced

**Category:** Architecture

**Question:**

The service runs on Express. A proposal passes `new FastifyAdapter()` into `NestFactory.create` for throughput. What stays the same, and what must you re-check?

**Answer:**

Module graph, DI, controllers, pipes/guards/interceptors at the Nest layer stay the same. The HTTP adapter owns request/response types, raw middleware, body parser, and platform plugins. Express-specific `req`/`res` usage, Express middleware, and libraries assuming Node Server Response must be revalidated for Fastify. Nest's portable surface is decorators + DI; the adapter is the platform boundary.

**Trade-offs:**

Fastify can win throughput; Express ecosystem middleware may not port. Choose adapters for platform needs, not only benchmarks.

**Follow-up:**

Does switching adapters change provider scopes?

Answer: No. Scopes and the module graph are container concerns. Only HTTP integration details change.

### NEST-021 — What is unsafe in a constructor

**Difficulty:** Senior

**Category:** Lifecycle

**Question:**

`PaymentsService` injects `ClientsService`. Its constructor calls `this.clients.ping()`, but `ping()` needs a socket opened in `ClientsService.onModuleInit`. Why is this unsafe?

**Answer:**

Constructors run during `create()`, before `init()` runs lifecycle hooks. Injected dependencies exist as objects, but their `onModuleInit` has not run. Calling `ping()` in the constructor races unfinished setup. Open sockets and "ready" logic belong in `onModuleInit`/`onApplicationBootstrap`, or lazy on first use after hooks. Constructors should only assign dependencies.

**Trade-offs:**

Constructor work fails fast but cannot rely on hooks. Hooks preserve order at the cost of deferred readiness.

**Follow-up:**

Is it safe if `ClientsService` opens the socket in its own constructor instead?

Answer: Safer for ordering vs dependents' constructors, but still hides async failures and slows `create()`. Prefer hooks for async connect; keep constructors sync and light.

### NEST-022 — Exports, re-exports, and the boundary

**Difficulty:** Advanced

**Category:** Modules

**Question:**

`CommerceModule` imports `TaxModule` and `OrdersModule`. `ReportsModule` should inject `TaxService` without importing `TaxModule` itself—the team wants one commerce façade. How do exports/re-exports work?

**Answer:**

Importing `TaxModule` into `CommerceModule` does not automatically re-export `TaxService`. `CommerceModule` must list `TaxService` or `TaxModule` in its `exports`. Re-exporting `TaxModule` publishes that module's exports to importers of `CommerceModule`. `ReportsModule` then imports `CommerceModule` only. Encapsulation is deliberate: visibility is export lists, not transitive imports.

**Code:**

```typescript
@Module({
  imports: [TaxModule, OrdersModule],
  exports: [TaxModule], // re-export
})
export class CommerceModule {}
```

**Trade-offs:**

Façade re-exports simplify importers and couple them to commerce's public surface. Direct `TaxModule` imports keep the edge explicit.

**Follow-up:**

Does exporting `TaxService` from `CommerceModule` require providing it there?

Answer: Commerce must either provide it or import a module that exports it—then re-export the token or module. You cannot export a token unknown to the module.

### NEST-023 — Barrel files and undefined modules

**Difficulty:** Advanced

**Category:** Project structure

**Question:**

`orders/index.ts` re-exports the controller, service, and `OrdersModule`. `BillingModule` imports `{ OrdersModule }` from `../orders`. Startup says an `imports` entry is undefined. Why can barrel files break Nest modules?

**Answer:**

Barrel re-exports often create circular evaluation: `orders/index` loads module → module loads billing → billing loads `orders/index` while `OrdersModule` is still uninitialized → `undefined` in `imports`. Nest then fails validating modules. Import module classes from concrete files (`orders.module.ts`), not barrels that pull the whole folder. Keep barrels for public leaf APIs if needed, not for Nest module graphs.

**Trade-offs:**

Barrels shorten import paths but risk cycles with Nest's class decorators. Direct file imports are verbose and cycle-safe.

**Follow-up:**

How do you confirm the undefined import is a cycle?

Answer: Log the imported binding at module evaluation, or break the barrel path to a direct import. If the direct path fixes it, the barrel cycle was the cause.

### NEST-024 — The module graph is the dependency manifest

**Difficulty:** Staff-Level

**Category:** Architecture

**Question:**

You review a Nest 10 service with ~forty modules. Teams want more `@Global()` modules "so imports stop breaking builds." What do you look at, and what do you push back on?

**Answer:**

Treat the module graph as the dependency manifest: who provides, who exports, who imports. Mass `@Global()` removes compile/startup friction by hiding edges—features no longer declare what they need, ownership blurs, and test modules must recreate hidden globals. Prefer fixing missing exports/imports, shared kernels with explicit imports, and narrow exports. Globals only for true process-wide singletons imported once at the root. Ask which token each feature needs and which module owns it.

**Trade-offs:**

Globals scale boilerplate down and architecture clarity down. Explicit imports scale verbosity up and make boundaries reviewable.

**Follow-up:**

What is a healthier alternative to "make it global" when many features need `TaxService`?

Answer: One `TaxModule` that exports `TaxService`, imported by each feature (or a small shared façade that re-exports it)—still explicit, still one instance.

### NEST-025 — How a multi-feature codebase should be laid out

**Difficulty:** Staff-Level

**Category:** Project structure

**Question:**

Propose source layout and composition root for a Nest 10 product with orders, billing, and a small shared kernel. What changes when a second deployable (a worker) needs the same domain services?

**Answer:**

Layout by feature: `orders/`, `billing/`, `shared/` (or `kernel/`) each with module, controllers/providers as appropriate. `AppModule` imports feature modules and shared config—composition root for HTTP. Shared kernel holds cross-feature tokens without depending on features. For a worker, add another entrypoint (`main.worker.ts`) that imports a `WorkerModule` composing the same feature/domain modules via `createApplicationContext()`, without HTTP controllers. Share libraries/modules; do not share `main.ts`.

**Trade-offs:**

Feature folders clarify ownership. A shared "utils" dumping ground recreates globals. Multiple entrypoints share modules, not one mega-AppModule with unused HTTP.

**Follow-up:**

Should the worker import `OrdersController`?

Answer: No. Import the module that exports domain providers, or a worker-specific module that lists providers without controllers.

### NEST-026 — Why @Injectable() exists

**Difficulty:** Intermediate

**Category:** Providers

**Question:**

`OrdersService` is in `providers` and injects `TaxService` (same module). Someone removes `@Injectable()` from `OrdersService` and startup fails resolving its constructor deps. Why does the decorator matter if the class is already registered?

**Answer:**

Registration puts the token in the container; `@Injectable()` (with `emitDecoratorMetadata`) is what causes TypeScript to emit `design:paramtypes` for that class. Without it, Nest often has no parameter tokens to resolve—unknown dependencies. `@Controller()` plays the same role for controllers. The decorator is not discovery; it is metadata emission (and Nest's injectable marker).

**Follow-up:**

Could `@Inject()` on each parameter replace `@Injectable()`?

Answer: Explicit `@Inject()` supplies tokens per param, but you still need a decorator context that Nest/TS treat correctly; Nest docs still expect `@Injectable()` on providers. Prefer keeping `@Injectable()`.

### NEST-027 — What @Optional() changes, and what it leaves alone

**Difficulty:** Intermediate

**Category:** Dependency injection

**Question:**

A payments module should use an audit sink when another module exports one, and keep booting when none does. How do you express that on a constructor and on a `useFactory` `inject` list?

**Answer:**

On a constructor: `@Optional() @Inject(AUDIT) private readonly audit?: AuditTrail`. A missing token injects `undefined` instead of failing startup; the class must handle that. On a factory: put `{ token: AUDIT, optional: true }` in `inject`—same semantics for that argument. `@Optional()` does not register a provider or change exports; it only softens resolution.

**Code:**

```typescript
constructor(@Optional() @Inject(AUDIT) private readonly audit?: AuditTrail) {}
// factory inject: [{ token: AUDIT, optional: true }]
```

**Trade-offs:**

Optional deps enable plugins; they also hide missing wiring as silent `undefined`. Use for truly optional collaborators, not forgotten exports.

**Follow-up:**

Does `@Optional()` fix a circular dependency?

Answer: No. It only allows a missing token. Cycles need `forwardRef` or a graph redesign.

### NEST-028 — What forwardRef delays

**Difficulty:** Senior

**Category:** Dependency injection

**Question:**

`OrdersService` and `BillingService` each take the other in their constructors; module files import each other too. What does `forwardRef` from `@nestjs/common` actually postpone?

**Answer:**

`forwardRef(() => Token)` postpones reading the class value until Nest resolves dependencies—after both modules/classes have finished evaluating—so ES circular imports do not leave `undefined` tokens. Use it on module `imports` and on `@Inject(forwardRef(() => OtherService))` for providers. It does not create proxies that magically break infinite construction loops if both constructors immediately call each other; keep constructors light.

**Code:**

```typescript
constructor(
  @Inject(forwardRef(() => BillingService))
  private readonly billing: BillingService,
) {}
```

**Trade-offs:**

`forwardRef` unblocks boot; extracting a mediator module removes the cycle. Prefer redesign when calls need both directions at construct time.

**Follow-up:**

Module `forwardRef` only—services still fail. Why?

Answer: Provider tokens still resolved to `undefined` at decorator time. Add `forwardRef` on the injected services too.

### NEST-029 — How a list of providers is registered

**Difficulty:** Senior

**Category:** Providers

**Question:**

Orders pricing needs every tax rule the process implements (VAT, duty, regional). The author wants one injected array. How do you register that list in NestJS 10.4, and why is repeating `provide: TAX_RULES` not enough?

**Answer:**

A module's provider map is keyed by token—two `provide: TAX_RULES` entries collapse to the last wrapper; there is no `multi: true` collector. Build the list with a factory: each rule is its own provider, then `{ provide: TAX_RULES, useFactory: (vat, duty, regional) => [vat, duty, regional], inject: [VatRule, DutyRule, RegionalRule] }`. Rules from other modules must be exported and imported. Array order is `inject` order. `APP_GUARD` and friends are a special scanner gather, not a pattern for domain lists.

**Code:**

```typescript
{
  provide: TAX_RULES,
  useFactory: (vat: VatRule, duty: DutyRule) => [vat, duty],
  inject: [VatRule, DutyRule],
}
```

**Trade-offs:**

An explicit factory makes order and ownership visible. A factory that `new`s rules hides DI (NEST-050). Do not copy `APP_GUARD` aggregation for domain tokens.

**Follow-up:**

VAT must run before duty, and a future rule should declare “after VAT.” What does this factory give you?

Answer: Only the order of the `inject` array. There is no priority field. Keep order explicit there, or sort inside the factory from a property each rule exposes.

### NEST-030 — When property injection runs

**Difficulty:** Senior

**Category:** Dependency injection

**Question:**

A class sets `@Inject(TaxService) private tax: TaxService` on a field and reads `this.tax` in the constructor. The field is `undefined` even though `TaxService` is provided. When does property injection run?

**Answer:**

Nest resolves constructor params, runs `new`, then assigns `@Inject()` properties. The constructor body runs in that gap, so `this.tax` is still `undefined`. After the instance is fully wired, methods including `onModuleInit` see the assigned value. Prefer constructor injection for required deps; property injection is for awkward signatures, not a fix for circular constructors.

**Trade-offs:**

Constructor params are visible in the signature and present for the whole constructor. Properties are shorter but invisible to a hand-rolled `new` in a unit test that bypasses the container.

**Follow-up:**

The property is `@Optional() @Inject(AUDIT_SINK)`, the sink is unregistered, and the constructor logs `undefined`. After `onModuleInit`, what is the field?

Answer: Still `undefined`. Optional absence is the value, not a delay. `onModuleInit` does not re-lookup a provider registered later—registration finished before constructors ran.

### NEST-031 — Why the module class can take constructor arguments

**Difficulty:** Intermediate

**Category:** Modules

**Question:**

`OrdersModule` wants a startup check that needs `OrdersService` via the module class constructor rather than on the service. Is that valid in Nest 10, and when do those deps resolve?

**Answer:**

Yes. Nest can construct the module class and inject providers visible in that module's context into its constructor, like any provider. The module instance is created with the container graph. Prefer lifecycle hooks on providers for async startup work; the module constructor still runs at construction time (before hooks), so keep it light. Listing the service only for the module constructor still requires it in `providers`/`imports`.

**Trade-offs:**

Module constructor injection couples bootstrap to the module class. `onModuleInit` on a provider is usually clearer for async checks.

**Follow-up:**

Can the module constructor inject a token only exported by a module it did not import?

Answer: No. Same visibility rules as any injector in that module.

### NEST-032 — What ModuleRef.get guarantees inside a feature

**Difficulty:** Senior

**Category:** Dependency injection

**Question:**

`OrdersService` injects `ModuleRef` and calls `this.moduleRef.get(TaxService)` with no second argument. `TaxService` is exported by `TaxModule`; `OrdersModule` does not import `TaxModule`, but `AppModule` imports both. What does `get` guarantee?

**Answer:**

Without options, `ModuleRef.get` resolves from the calling module's context—not the whole app. If `OrdersModule` cannot see `TaxService` through its imports/exports, `get` fails even if another module registered it. Pass `{ strict: false }` only when you intentionally search beyond strict module scope (know the coupling cost). Prefer injecting `TaxService` normally after importing `TaxModule`.

**Trade-offs:**

`ModuleRef` enables lazy/lookup patterns and bypasses clear constructor deps—useful sparingly, harmful as a service locator.

**Follow-up:**

Does `app.get(TaxService)` from `main.ts` use the same rules?

Answer: `app.get` uses the application/root context and can retrieve exported providers more broadly than a feature module's strict `ModuleRef.get`.

### NEST-033 — What order sibling providers actually have

**Difficulty:** Senior

**Category:** Lifecycle

**Question:**

`providers: [CacheService, WarmupService]` with neither injecting the other. `WarmupService`'s constructor assumes `CacheService`'s constructor has finished. What order do sibling providers actually have?

**Answer:**

Do not rely on array order for constructor completion among independent siblings. Nest instantiates based on the dependency graph. Without an injection edge, order is undefined for your purposes. If Warmup needs Cache ready, inject `CacheService` (or use `onModuleInit` ordering with an explicit dependency). Provider array order is not a supported lifecycle contract.

**Follow-up:**

Will putting `CacheService` first in the array fix it?

Answer: Not as a guarantee. Introduce a real DI edge or a lifecycle hook that awaits the dependency.

### NEST-034 — How far a re-export chain carries a token

**Difficulty:** Advanced

**Category:** Modules

**Question:**

`TaxModule` provides `TaxService` and `TaxRepository`, exports only `TaxService`. `BillingModule` imports `TaxModule`. `CommerceModule` imports `BillingModule`. `ReportsModule` imports `CommerceModule`. Who can inject what?

**Answer:**

Importers of `TaxModule` can inject `TaxService`, not `TaxRepository` (not exported). Importing `TaxModule` into `BillingModule` does not re-export `TaxService` to `CommerceModule` unless `BillingModule` exports the token or `TaxModule`. Chains do not transitive-export automatically. Each hop must re-export for the next importer to see the token. Encapsulation is intentional at every boundary.

**Trade-offs:**

Re-export chains build façades; they also obscure the owning module. Prefer short export paths.

**Follow-up:**

Billing injects `TaxRepository` successfully after importing `TaxModule`. Can Commerce inject it by importing Billing only?

Answer: Only if Billing re-exports `TaxRepository` (or TaxModule). Otherwise Commerce must import TaxModule (or another exporter).

### NEST-035 — When forRoot is enough, and when the factory has to be async

**Difficulty:** Advanced

**Category:** Modules

**Question:**

`PaymentsModule` needs merchant id and timeout—literals in one deployable, from `ConfigService` in another. When is sync `forRoot` enough, and when must the factory be async?

**Answer:**

Sync `forRoot(options)` / `useValue` is enough when values are already known at module evaluation. When values come from async sources (async config load, secrets manager), use `forRootAsync` with `useFactory` returning a Promise and `inject: [ConfigService]` (and `imports` for ConfigModule). Async factories run during provider instantiation and Nest awaits them. Don't block module files with top-level await IO.

**Trade-offs:**

Sync root is simple and testable. Async root couples boot to config availability—fail fast on missing secrets.

**Follow-up:**

Can `useFactory` be async without `forRootAsync`?

Answer: A provider `useFactory` may return a Promise; Nest resolves it. `forRootAsync` is the dynamic-module helper that wires that pattern cleanly with imports/inject.

### NEST-036 — What forFeature is allowed to add

**Difficulty:** Advanced

**Category:** Modules

**Question:**

`PaymentsModule.forRoot(options)` is imported once from `AppModule` and builds one `PaymentsClient`. `OrdersModule` and `BillingModule` need merchant-bound handles. What is `forFeature` allowed to add?

**Answer:**

`forFeature` should register feature-local providers (named tokens, repositories, merchant-scoped wrappers) that depend on the root client—without calling `forRoot` again or creating a second client. Import `forRoot` once at the composition root; features import `forFeature(...)` or the configured module's exports. Feature modules add to the graph; they must not re-bind the singleton root with different options.

**Trade-offs:**

forFeature scales multi-tenant handles; stuffing everything in forRoot forces one shape for all callers.

**Follow-up:**

What happens if a feature calls `forRoot` with different options?

Answer: You risk a second root registration/client. Keep `forRoot` unique; pass feature options into `forFeature`.

### NEST-037 — Why configuration is a provider

**Difficulty:** Intermediate

**Category:** Configuration

**Question:**

Feature services read `process.env.PAYMENTS_MERCHANT_ID` directly. The team adds `@nestjs/config` and `ConfigModule.forRoot()`. What should a feature inject, and what does `forRoot` establish?

**Answer:**

Inject `ConfigService` (from a module that imports `ConfigModule`, or after global config setup) and call `config.get('PAYMENTS_MERCHANT_ID')` (or typed/namespaced getters). `forRoot` loads env files / process env into the config pipeline and registers `ConfigService` once. Features stop touching `process.env` so tests can override providers and validation can centralize. Direct `process.env` bypasses that pipeline.

**Trade-offs:**

ConfigService enables testing and validation; it adds indirection versus raw env. Worth it once multiple modules share settings.

**Follow-up:**

Is `ConfigModule.forRoot()` required in every feature module?

Answer: No. Once at the root (often `isGlobal: true`). Features import ConfigModule only if not global, or rely on the global export.

### NEST-038 — How a namespaced config object is injected

**Difficulty:** Senior

**Category:** Configuration

**Question:**

Database settings are host, port, and name. You do not want `config.get('DATABASE_HOST')` string keys everywhere. How does `@nestjs/config` expose a namespaced object for injection?

**Answer:**

Use `registerAs('database', () => ({ host, port, name }))` and load that partial in `ConfigModule`. Inject with `@Inject(databaseConfig.KEY)` or `ConfigService.get('database')` typed to the factory's return type. The namespace is a single object token/key rather than scattered env strings. Validate the object shape in `validate` or Joi/Zod schemas as configured.

**Code:**

```typescript
export default registerAs('database', () => ({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
}));
```

**Trade-offs:**

Namespaces group settings and improve typing; over-fragmenting namespaces recreates stringly keys.

**Follow-up:**

Does `registerAs` read the file automatically?

Answer: Only if that config is listed in `load`/`forRoot` configuration. Defining `registerAs` alone does not register it.

### NEST-039 — When the .env file is read relative to your service file

**Difficulty:** Senior

**Category:** Configuration

**Question:**

`orders.service.ts` reads `process.env.PAYMENTS_MERCHANT_ID` at module top level. `ConfigModule.forRoot()` makes `ConfigService.get` see `.env`, but the service field is still undefined. Why?

**Answer:**

Top-level `process.env` reads run when the service file is first evaluated—often before `ConfigModule.forRoot()` loads `.env` into `process.env`. `ConfigService` reads through the config module's loaded store after forRoot runs. Move reads into constructors/`onModuleInit` via `ConfigService`, or ensure env is loaded before any feature file evaluates (e.g. preloaded env). File-relative mental models are wrong: evaluation order vs forRoot timing matters.

**Follow-up:**

Will importing ConfigModule at the top of the service file fix the top-level read?

Answer: No. Importing the class does not run `forRoot`. Only the dynamic `forRoot` import in a loaded Nest module loads the env pipeline.

### NEST-040 — Where a failing config validate() throws

**Difficulty:** Senior

**Category:** Configuration

**Question:**

`ConfigModule.forRoot({ validate })` throws `Error('PAYMENTS_MERCHANT_ID is required')`. Operators expect `NestFactory.create`'s `abortOnError` handling and Nest lifecycle logs. Where does this throw relative to that?

**Answer:**

Validation runs while the dynamic config module is being initialized as part of building the application—during `create()`'s module/provider init path for ConfigModule—not inside a later HTTP `listen` failure. The error surfaces as provider/module initialization failure. With default `abortOnError`, you may get `process.abort()` rather than a clean rejected promise. It is not an `onModuleInit` business hook failure after a healthy create.

**Follow-up:**

How do you make the failure a thrown/rejected error for tests?

Answer: Pass `{ abortOnError: false }` to `NestFactory.create` so initialization errors reject/throw instead of aborting the process.

### NEST-041 — Read the startup error: the provider is not exported

**Difficulty:** Intermediate

**Category:** Modules

**Question:**

Startup fails resolving a dependency in `OrdersModule` context. `TaxModule` provides `TaxService` but does not export it; `OrdersModule` imports `TaxModule` and the controller injects `TaxService`. Which line is wrong?

**Answer:**

The missing `exports: [TaxService]` (or exporting the module's public tokens) on `TaxModule`. Importing a module only exposes what it exports. Providing `TaxService` without exporting keeps it private to `TaxModule`. Add `TaxService` to `exports`, or move the provider. The controller/service files are fine if they simply inject the token.

**Code:**

```typescript
@Module({
  providers: [TaxService],
  exports: [TaxService], // was missing
})
export class TaxModule {}
```

**Follow-up:**

The error says the argument is unavailable in `OrdersModule` context. Why not `TaxModule`?

Answer: Resolution is from the consuming module's context. Nest names where the injector looked, not where you forgot the export.

### NEST-042 — Which token exports actually publish

**Difficulty:** Senior

**Category:** Providers

**Question:**

`TaxModule` registers `{ provide: TAX_RULES, useClass: VatRule }` but `exports: [VatRule]`. `OrdersModule` imports `TaxModule` and injects `TAX_RULES`. Startup cannot resolve `TAX_RULES`. Why?

**Answer:**

Exports publish tokens, not class identities you wish were equivalent. Exporting `VatRule` does not export `TAX_RULES`. Consumers injecting `TAX_RULES` need `exports: [TAX_RULES]`. The provide token and the export token must match what injectors ask for.

**Code:**

```typescript
providers: [{ provide: TAX_RULES, useClass: VatRule }],
exports: [TAX_RULES],
```

**Follow-up:**

Would exporting both `TAX_RULES` and `VatRule` change the injected instance for `TAX_RULES`?

Answer: Exporting `VatRule` only helps injectors of `VatRule`. `TAX_RULES` still needs to be exported for that token to resolve.

### NEST-043 — What a request uses from the module that owns the controller

**Difficulty:** Senior

**Category:** Architecture

**Question:**

`GET /orders/42` hits Nest 10 HTTP. `OrdersController` is on `OrdersModule`, which provides `OrdersService` and imports `TaxModule`. `BillingModule` is unrelated. What module graph does that request use?

**Answer:**

The handler runs on the controller instance from `OrdersModule`'s context. It injects providers visible there: local providers plus exports of imported modules (e.g. `TaxService`). `BillingModule` is irrelevant unless imported into that chain. HTTP does not "enter" every module—routing picked a controller owned by one module; DI visibility is that module's. Global modules also visible if registered.

**Follow-up:**

Can the controller inject a provider that only `BillingModule` provides and exports?

Answer: Only if `OrdersModule` imports `BillingModule` (or another module that re-exports it), or the provider is global.

### NEST-044 — What Test.createTestingModule compiles

**Difficulty:** Senior

**Category:** Testing

**Question:**

You want a test that constructs `OrdersService` with a fake `TaxService`, runs `onModuleInit` if present, and opens no port. What does `Test.createTestingModule` compile, and how do you drive lifecycle?

**Answer:**

`Test.createTestingModule({...}).compile()` builds an isolated testing module/container with your declared imports/providers/overrides—not the full HTTP server. `module.get(OrdersService)` retrieves instances. Call `module.init()` to run lifecycle hooks like `onModuleInit`. Do not `listen`. Use `overrideProvider` for fakes. Close with `module.close()` for destroy hooks.

**Code:**

```typescript
const module = await Test.createTestingModule({
  providers: [OrdersService, { provide: TaxService, useValue: fakeTax }],
}).compile();
await module.init();
```

**Trade-offs:**

Unit testing modules are fast and narrow; e2e `create`+supertest is heavier and closer to production HTTP.

**Follow-up:**

Does `compile()` alone run `onModuleInit`?

Answer: No. You need `init()` (or a helper that initializes) for those hooks.

### NEST-045 — When a useValue promise starts, versus a factory

**Difficulty:** Advanced

**Category:** Providers

**Question:**

Both snippets provide `MERCHANT_ID` from an async source. One starts work while `AppModule` is still evaluating; the other starts when the instance loader runs. Contrast `useValue: fetchId()` with `useFactory: () => fetchId()`.

**Answer:**

`useValue: fetchId()` calls `fetchId` when the module file evaluates—Nest later marks a Promise `useValue` async and awaits that same promise during `create()`, but the network call already started at import time (and can become an unhandled rejection in the gap). `useFactory` is not called at evaluation; the loader invokes it during instantiation (awaiting its promise) in `inject` order. Prefer the factory for I/O.

**Trade-offs:**

`useValue` suits a value you already hold. A factory participates in instantiation order, can `inject` config, and does not start work merely because a test imported the file.

**Follow-up:**

The async factory `inject`s `ConfigService` from a non-global `ConfigModule`. `AppModule` imports both modules, but the factory fails. Why?

Answer: The factory resolves in the module that registered it, not via `AppModule` sibling imports. Import `ConfigModule` into the payments module, or make config global.

### NEST-046 — What LazyModuleLoader.load adds to the graph

**Difficulty:** Advanced

**Category:** Modules

**Question:**

`ReportsModule` is large and some operators want it out of the startup scan, loaded only when a user opens a report. What does `LazyModuleLoader.load` add to the graph in Nest 10.4, and what does it not do?

**Answer:**

`load(() => import(...).then(m => m.ReportsModule))` delays evaluating the file, then scans the module, links deps, and instantiates providers, returning that module's `ModuleRef`. If the module is already in the container, load does not rebuild it. It does not run the HTTP routes resolver—controllers are not mounted by `load`—and it does not call `onModuleInit`. For HTTP surfaces, import at the root so `init()` binds routes. Lazy load is deferred provider instantiation, not first-use routing.

**Trade-offs:**

Deferring evaluation can shrink startup; first `load` pays scan/construct cost, and hooks/routes need a separate plan. Prefer eager import when the feature is an HTTP surface.

**Follow-up:**

`ReportsModule` is also in `AppModule.imports`, and a request calls `load(() => ReportsModule)`. What does `get(ReportsService)` return?

Answer: The instance from startup. `load` sees the module already present and returns a ref to it—you gained nothing. Remove one of the two paths.

### NEST-047 — How a custom logger sees bootstrap logs

**Difficulty:** Intermediate

**Category:** Lifecycle

**Question:**

`AppLogger` is an `@Injectable()` `LoggerService` writing to the company drain. Logs emitted while `NestFactory.create` constructs providers never reach it. How do you wire a custom logger so bootstrap messages are captured?

**Answer:**

Pass `{ logger: instance }` into `create` for an immediate logger outside DI, or use `{ bufferLogs: true }`, then after `create` resolves call `app.useLogger(app.get(AppLogger))` to install the DI instance and flush the buffer. Without buffering, create-time lines already went to the default logger before `useLogger`. Registering `AppLogger` only as a provider is too late for early bootstrap lines. Keep `AppLogger`'s constructor light—it is constructed during the graph being logged.

**Trade-offs:**

`logger: new AppLogger()` sees early lines but skips DI. `bufferLogs` + `useLogger(app.get(...))` keeps one DI logger. `logger: false` silences Nest; buffering will not invent those lines later.

**Follow-up:**

`create` uses `{ logger: false, bufferLogs: true }`, then `useLogger(app.get(AppLogger))`. Which messages does `AppLogger` still miss?

Answer: Ones Nest never recorded because `logger: false` turned logging off. Buffering does not recreate unrecorded messages. Omit `logger: false` when the goal is to flush bootstrap into `AppLogger`.

### NEST-048 — What INQUIRER refers to

**Difficulty:** Advanced

**Category:** Dependency injection

**Question:**

A factory wants the name of the class it is being injected into so a logger can say `OrdersService`. Nest 10.4 exports `INQUIRER` from `@nestjs/core`. What does it refer to?

**Answer:**

`INQUIRER` is a transient injection token resolving to the class/instance that requested the current provider—the parent dependent being constructed. A factory `inject: [INQUIRER]` receives that host type/instance to customize per consumer (e.g. child logger categories). It is not the HTTP request and not the module class unless that module is the dependent. Transient scope of the provided logger is typically required so each host gets its own instance.

**Trade-offs:**

INQUIRER enables contextual factories; overuse recreates service-locator patterns. Prefer explicit constructor params when possible.

**Follow-up:**

If the factory provider is singleton-scoped, what goes wrong with INQUIRER?

Answer: One shared instance is created for the first inquirer; later hosts reuse it. Use transient (or factory-per-inject) for per-host loggers.

### NEST-049 — How an undefined dependency differs from a missing provider

**Difficulty:** Advanced

**Category:** Dependency injection

**Question:**

Boot A: Nest reports an undefined dependency (possibly circular import / missing declaration). Boot B: classic "can't resolve dependencies … available in the X context." How do these differ?

**Answer:**

Undefined dependency usually means the token value was `undefined` at decoration/scan time—often a circular file import, `import type`, or forward reference without `forwardRef`. The metadata literally holds undefined. Missing provider means the token was a real value but no registration/`export` made it visible in the consuming module's context. Fix cycles/metadata for A; fix `providers`/`exports`/`imports` for B. `NEST_DEBUG=true` helps trace resolution.

**Follow-up:**

Which failure does `forwardRef` address?

Answer: Undefined tokens from circular evaluation—not a forgotten `exports` entry for a well-defined token.

### NEST-050 — Why new inside a factory hides a dependency

**Difficulty:** Staff-Level

**Category:** Architecture

**Question:**

`PricingModule` exports `TAX_RULES` from a factory: `return [new VatRule(), new DutyRule(process.env.DUTY_RATE)]`. The graph shows one provider. Why is `new` inside the factory a design problem at staff level?

**Answer:**

The factory hides real dependencies: `VatRule`/`DutyRule` and env are invisible to the module graph, unswappable in tests without replacing the whole factory, and skip Nest DI (no injection into those classes, no lifecycle). The export looks like one token while ownership of rules lives in opaque code. Prefer registering rules as providers (optionally multi) Nest can inject, override, and graph. Factories should assemble injected deps, not silently `new` a dependency tree.

**Trade-offs:**

Inline `new` is fast to write and opaque to operate. Provider graphs are verbose and testable/replaceable.

**Follow-up:**

What is the smallest refactor that surfaces `DutyRule`'s env dependency?

Answer: Provide `DutyRule` with a factory/`useFactory` that injects `ConfigService`, and inject `DutyRule` into the `TAX_RULES` factory—or export multi providers Nest aggregates.
