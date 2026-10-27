# NEST01 — Fundamentals and architecture

NestJS 10. Questions NEST-001–NEST-050.

Bootstrap and hook order follow NestJS 10.4. Decorators and lifecycle cover `@Module`, `@Controller`, `@Injectable`, `@Inject`, `@Optional`, `@Global`, `forwardRef`, and `OnModuleInit` / `OnApplicationBootstrap` / shutdown hooks. This section is the DI container, module graph, and composition root—not the HTTP request pipeline.


### NEST-001 — What create() builds, and what listen() still has to do

**Difficulty:** Intermediate

**Category:** Architecture

**Question:**

A Nest 10 process calls `NestFactory.create(AppModule)` then `app.listen(3000)` without calling `app.init()` itself. Default Express platform, default scopes. What has finished when `create()` resolves, and what still runs before the process accepts connections?

**Answer:**

When `create()` resolves, Nest has built the dependency injection container, scanned the module graph starting from `AppModule`, and constructed every provider. So constructor injection is done and `app.get()` already works. What has not happened yet is initialization: lifecycle hooks have not run, routes are not bound, and the port is closed. When you call `listen()`, Nest sees the app is not initialized, awaits `init()`, which sets up middleware, binds routes, and runs `onModuleInit` and `onApplicationBootstrap`, and only then opens the TCP port.

**Trade-offs:**

Call `app.init()` yourself when something needs a fully initialized app before the port opens; `listen()` then skips a second init. Use `createApplicationContext()` when you need the container without HTTP (see NEST-019).

**Follow-up:**

If a provider constructor throws during `NestFactory.create()`, what does the default `abortOnError` setting do?

Answer: With `abortOnError: true`, which is the default, Nest calls `process.abort()` on the startup error, so the `create()` promise is not where the failure shows up. Pass `{ abortOnError: false }` so tests or a supervisor get a thrown error instead of a `SIGABRT`.

### NEST-002 — The four @Module arrays

**Difficulty:** Intermediate

**Category:** Modules

**Question:**

In NestJS 10, `@Module()` takes `imports`, `controllers`, `providers`, and `exports`. What does each array contribute, and which of them crosses a module boundary?

**Answer:**

The four arrays describe what a module owns and what it shares. `imports` lists other modules whose exported providers this module can use. `controllers` lists the classes whose routes are registered for this module. `providers` lists the injectable classes and values the module creates, and they are private to the module by default. `exports` is the public surface: only tokens listed there, or modules re-exported there, can be injected by modules that import this one. So `exports` is the array that crosses a module boundary.

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

Wide exports make reuse easy but widen the contract other modules depend on. Narrow exports keep the module easy to replace. Re-exporting an imported module suits a composition-root module better than an ordinary feature module.

**Follow-up:**

Can `exports` name a provider the module neither provides nor imports?

Answer: No. Nest rejects the export while building the module, because the token must already be available in that module, either through its own `providers` or through an import.

### NEST-003 — Why a class must be registered

**Difficulty:** Intermediate

**Category:** Providers

**Question:**

`OrdersService` has `@Injectable()` and is imported by `OrdersController`, but it is omitted from every `providers` array and no global module exports it. Nest fails with an unknown-dependency error. Why is the import plus the decorator not enough?

**Answer:**

Importing the file and adding `@Injectable()` are not the same as registering the class. The import only gives the controller a runtime class reference to use as a token, and `@Injectable()` only makes TypeScript emit the constructor parameter types. The container learns about a class only when it appears in a `providers` array, or when an imported module exports it. When the controller asks for `OrdersService`, Nest looks in that module's context, finds nothing, and fails at startup. Automatic discovery of every injectable file would erase module ownership, export boundaries, and easy test doubles.

**Code:**

```typescript
@Module({
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
```

**Trade-offs:**

`@Optional()` would inject `undefined` instead of failing, which suits plugins but not a required service. Calling `new OrdersService()` yourself bypasses the container, so you lose injection and lifecycle hooks.

**Follow-up:**

The class is listed in `providers` and the controller still fails. What do you check next?

Answer: Check that the controller's module provides the class, or imports a module that exports it. Also make sure the import is a real value import, not `import type`, and that `reflect-metadata` loads before the modules are evaluated, for example by importing `NestFactory` before `AppModule`.

### NEST-004 — How constructor injection chooses a token

**Difficulty:** Senior

**Category:** Dependency injection

**Question:**

With Nest 10's legacy decorator emit (`experimentalDecorators` + `emitDecoratorMetadata`), how does `constructor(private readonly orders: OrdersService)` become a container lookup, and when must `@Inject()` replace that?

**Answer:**

For a decorated class, TypeScript emits a `design:paramtypes` list, and Nest reads that list as the injection tokens. So a parameter typed as a class uses that class as its token. Nest looks in the module's own providers first, then in the exports of imported modules. The parameter name does not matter. Use `@Inject(Token)` when there is no usable runtime type: string or symbol tokens, and interfaces, which erase to `Object`. An explicit `@Inject()` always wins over the emitted type. Factory providers do not use this metadata; they list their dependencies in `inject`.

**Code:**

```typescript
constructor(
  private readonly orders: OrdersService,
  @Inject(AUDIT) private readonly audit: AuditTrail,
  @Optional() private readonly extra?: OrdersService,
) {}
```

**Trade-offs:**

Type-based injection is short, but it breaks with `import type`, interfaces, unions, or missing decorator metadata. An explicit `@Inject()` works in all of those cases. Plain JavaScript projects use `@Dependencies(...)` instead.

**Follow-up:**

Both `OrdersService` and `{ provide: OrdersService, useClass: CachedOrdersService }` exist. Which class is constructed?

Answer: `CachedOrdersService` is constructed. The constructor asks for the token `OrdersService`, and the registration binds that token to `useClass: CachedOrdersService`. The TypeScript type is only a compile-time label; what runs is the token binding.

### NEST-005 — What the default scope actually guarantees

**Difficulty:** Senior

**Category:** Dependency injection

**Question:**

Nest's default provider scope is singleton (`Scope.DEFAULT`). For one `providers: [OrdersService]` registration exported to every injector that needs it, what is the lifetime and identity of that instance, and what does "singleton" not mean?

**Answer:**

The default scope means one instance per registration. Nest builds it during `create()`, even if no HTTP request ever arrives, caches it, and gives that same object to every injector that can see the token until the container closes. Singleton here does not mean one per application, and it does not mean one per request. A second `providers: [OrdersService]` in another module is a separate registration with its own instance, so sharing requires one module that provides and exports it. `REQUEST` and `TRANSIENT` scopes change this and are covered later.

**Trade-offs:**

Eager singletons pay their construction cost at startup and share mutable state with every caller. That is right for shared clients and wrong for per-request data, which is better passed as method arguments.

**Follow-up:**

Two controllers in different modules inject `OrdersService`. When do they get the same object, and when two?

Answer: They get the same object when both modules reach one registration, meaning one module provides and exports it and the other imports it. They get two objects when each module lists `OrdersService` in its own `providers`, because the default scope does not deduplicate.

### NEST-006 — What belongs on a controller, and what belongs on a service

**Difficulty:** Intermediate

**Category:** Architecture

**Question:**

Someone puts order-total calculation, a database call, and response-header logic in `OrdersController`. In Nest 10 HTTP, what is the controller's job, what is the provider's job, and what does the framework actually enforce?

**Answer:**

A controller is the HTTP adapter. Nest binds its route metadata during `init()`, reads parameters through decorators, and serializes the return value unless you take over with `@Res()`. A service is an ordinary provider with no routes, so it is the right home for calculations and database access. The controller should translate between HTTP and the service. Nest does not enforce this split, so a fat controller still works. The cost shows up when a job or CLI command needs the same rule: controllers are tied to HTTP, while services can be injected anywhere.

**Code:**

```typescript
@Post()
create(@Body() body: CreateOrderDto) {
  return this.orders.create(body);
}
```

**Trade-offs:**

Keeping logic in the controller means fewer classes, but a CLI or background job cannot reuse it without HTTP. Throwing `HttpException` from a service also ties domain code to HTTP; prefer returning domain results and mapping them to a status at the boundary.

**Follow-up:**

The service needs the authenticated user id. Where is that value read?

Answer: At the HTTP boundary. A param decorator or guard produces the id, and the controller passes it to the service as an argument. The service then depends only on its arguments and its injected providers.

### NEST-007 — Decorators are metadata, not the behavior

**Difficulty:** Senior

**Category:** Decorators

**Question:**

`@Controller()`, `@Get()`, `@Injectable()`, and a custom `@Roles('admin')` via `SetMetadata` are on a Nest 10 module. At class definition time, what does each decorator do, and what later reads that metadata?

**Answer:**

Decorators run when the file is evaluated, and all they do is write metadata with `reflect-metadata`. `@Module`, `@Controller`, and `@Get` store module and route information. `@Injectable()` marks a provider and lets TypeScript emit constructor types. `@Roles('admin')`, built with `SetMetadata`, just stores a value under a key. None of them open ports or check roles. Nest's scanner and route resolver read the framework metadata during `create()` and `init()`. Your own metadata does something only when a reader, such as a guard using `Reflector`, looks it up; otherwise `@Roles` is inert.

**Code:**

```typescript
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
```

**Trade-offs:**

Metadata keeps cross-cutting marks next to the handler, but it is easy to assume the annotation alone enforces something. Use a decorator when a shared reader will discover the mark, and plain code for behavior that is local.

**Follow-up:**

How do you confirm `@Roles()` is recorded without an HTTP request?

Answer: In a unit test, read it with `Reflector` or `Reflect.getMetadata(ROLES_KEY, ...)` after `reflect-metadata` has loaded. Remember that metadata which is recorded but never read by a guard is still a product bug; it is just a different problem from metadata that was never written.

### NEST-008 — onModuleInit versus onApplicationBootstrap

**Difficulty:** Senior

**Category:** Lifecycle

**Question:**

`OrdersService` opens a client, and a root scheduler should start only after every feature module has initialized. Nest 10.4 HTTP, default scopes. Which hook on each, and what has / has not happened when they run?

**Answer:**

`onModuleInit` runs during `init()` once the module's dependencies are resolved, and Nest awaits any promise it returns. Modules are visited so that dependencies initialize before their dependents, with the root last. So open the client in `OrdersService.onModuleInit`: imported modules have finished theirs, though sibling modules may not have. `onApplicationBootstrap` is a second pass that starts after every `onModuleInit` has finished, so the scheduler belongs there. The port is still closed in both. Nest detects hooks by method name; the interfaces are TypeScript only.

**Trade-offs:**

`onModuleInit` keeps setup next to the module that owns it. `onApplicationBootstrap` is the gate for when the whole graph is ready, but it can become hidden coupling if everything is dumped there. Work that should start after connections are accepted belongs after `listen()` resolves.

**Follow-up:**

Your `onModuleInit` promise rejects. Does `listen()` bind the port?

Answer: No. Nest awaits the hook, so the rejection fails `init()`, and `listen()` rejects before it binds. The port is never left half-open.

### NEST-009 — Shutdown hooks and enableShutdownHooks()

**Difficulty:** Senior

**Category:** Lifecycle

**Question:**

The process receives `SIGTERM`. `OrdersService` must stop taking work and close a client. What do you call at bootstrap, which methods run, and what does `app.close()` do that a bare signal handler does not? Nest 10.4 HTTP.

**Answer:**

Call `app.enableShutdownHooks()` at bootstrap. It is off by default, and without it Nest does not react to process signals. Shutdown then runs in order: `onModuleDestroy`, `beforeApplicationShutdown(signal)`, closing the HTTP adapter, and finally `onApplicationShutdown(signal)`, with promises awaited. Calling `app.close()` runs the same sequence but does not exit the process. When a signal arrives and hooks are enabled, Nest runs those phases and then re-sends the signal so the process can end. A bare signal handler would skip all of these hooks.

**Trade-offs:**

Hooks give orderly teardown, but a hook that hangs blocks exit, so pair them with supervisor timeouts. Several Nest apps in one process can trigger Node's listener warning if each one enables hooks.

**Follow-up:**

Where do you close a connection pool if in-flight HTTP handlers must finish their queries first?

Answer: In `onApplicationShutdown`, because it runs after the HTTP adapter has been closed. Stop taking new work earlier, in `onModuleDestroy` or `beforeApplicationShutdown`.

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

### NEST-011 — Circular module imports

**Difficulty:** Senior

**Category:** Modules

**Question:**

`OrdersModule` imports `BillingModule` and `BillingModule` imports `OrdersModule`. Startup fails or sees `undefined` in an `imports` array. What is circular, when does `forwardRef` help, and what remains a design smell?

**Answer:**

There are two separate cycles. One is at the JavaScript level: when two files import each other, one of them sees `undefined` instead of the class. The other is in Nest's module graph. Wrapping the import as `forwardRef(() => OtherModule)` delays reading the class until both exist, and you often need it on both sides, including on providers. That fixes bootstrap but not the design: two modules that depend on each other still have unclear ownership. A better fix is to extract a shared module or invert one dependency.

**Code:**

```typescript
@Module({
  imports: [forwardRef(() => BillingModule)],
})
export class OrdersModule {}
```

**Trade-offs:**

`forwardRef` gets the app booting, while extracting a third module or using an event or API boundary removes the cycle itself. Prefer fixing the graph over adding more `forwardRef` calls.

**Follow-up:**

Is `forwardRef` on modules enough when services also inject each other?

Answer: No. The service constructors also need `@Inject(forwardRef(() => OtherService))`. Otherwise the injector still sees an unresolved circular provider dependency.

### NEST-012 — A file on disk is not in the application

**Difficulty:** Intermediate

**Category:** Project structure

**Question:**

`src/shipping/shipping.module.ts` defines `ShippingModule` with a controller and provider. No other file mentions `ShippingModule`. `nest start` boots, and `GET /shipping` 404s. Why?

**Answer:**

Nest only loads modules that are reachable from the root module through `imports`. A file sitting on disk does nothing until some loaded module imports it. Since nothing imports `ShippingModule`, Nest never scans its controller or binds its routes, so `GET /shipping` returns 404. Nest does not complain about the unused file because it never looks at it. The fix is to add `ShippingModule` to the `imports` of `AppModule`, or of another module that is already loaded.

**Follow-up:**

The module is imported but the route still 404s. What next?

Answer: Check that the controller is listed in that module's `controllers` array, not only in `providers`. Then check that the path in the decorators is what you expect, and that a global prefix or versioning has not changed the URL.

### NEST-013 — Sharing one instance across modules

**Difficulty:** Senior

**Category:** Providers

**Question:**

`OrdersModule` and `BillingModule` both need the same `TaxService` instance—one cache, one config. How do you register it so both share one object in Nest 10?

**Answer:**

Register `TaxService` once, in a dedicated module such as `TaxModule`, and export it. Then import `TaxModule` from both `OrdersModule` and `BillingModule`. With the default scope, one registration produces one instance, so both features share the same cache and config. Do not list `TaxService` in both features' `providers`, because that creates two registrations and two instances. You can mark `TaxModule` as `@Global()` to skip repeated imports, but it still has to be imported once at the root.

**Code:**

```typescript
@Module({ providers: [TaxService], exports: [TaxService] })
export class TaxModule {}
```

**Trade-offs:**

A shared module makes ownership clear. Duplicating providers for convenience quietly splits state into separate copies. Globals hide the import edge.

**Follow-up:**

Both modules already provide `TaxService` locally. How do you merge to one instance without breaking injectors?

Answer: Remove the local `providers` entries, provide and export the class from one module, and import that module, or a module that re-exports it, wherever the token is injected.

### NEST-014 — useClass, useValue, useFactory, and useExisting

**Difficulty:** Senior

**Category:** Providers

**Question:**

When do you write `useClass`, `useValue`, `useFactory`, and `useExisting` instead of `providers: [TaxService]`, and what does each bind?

**Answer:**

All four tell Nest what a token should resolve to. `useClass` binds a token to a class that Nest will construct, often a different implementation. `useValue` binds a ready-made value, such as a constant or a mock; Nest does not construct it. `useFactory` runs a function, sync or async, and passes it the providers listed in `inject`, which is good for conditional wiring. `useExisting` makes an alias that resolves to an already registered provider's instance. The shorthand `providers: [TaxService]` is just `provide` and `useClass` with the same class.

**Code:**

```typescript
{ provide: TaxService, useClass: CachedTaxService },
{ provide: RATES, useValue: { vat: 0.2 } },
{ provide: Client, useFactory: (c: Config) => new Client(c.url), inject: [Config] },
{ provide: AbstractTax, useExisting: TaxService },
```

**Trade-offs:**

`useValue` is the simplest, but if you pass something that already started I/O, that work begins when the module is evaluated. Factories wait until Nest instantiates them and can be async. Aliases avoid creating duplicate instances.

**Follow-up:**

Does `useExisting` create a second object?

Answer: No. It adds another token that resolves to the existing provider's instance.

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

### NEST-017 — When a dynamic module is the wrong seam

**Difficulty:** Advanced

**Category:** Modules

**Question:**

A reviewer sees `DatabaseModule.forRoot(options)` imported from `OrdersModule`, `BillingModule`, and `AppModule`, each with slightly different `options`. Why is a dynamic module the wrong seam here?

**Answer:**

Each import of `DatabaseModule.forRoot(options)` can register its own copy of the root providers, so you may end up with several clients or connection pools instead of one shared connection. `forRoot` belongs once, in the composition root, which is `AppModule`. Feature modules should import a lighter `forFeature`, or the already configured module, which adds only feature-specific providers. If the options really differ per feature, you usually want named connections or per-feature config, not three separate roots.

**Trade-offs:**

One `forRoot` with many `forFeature` calls keeps a single shared client. Multiple `forRoot` calls are justified only when you truly need separate connections with distinct tokens.

**Follow-up:**

How do you spot accidental double registration at runtime?

Answer: Add a log line or a construction counter in the provider factory, or look for duplicate custom tokens. Two pools for one database usually mean `forRoot` was imported twice.

### NEST-018 — main.ts and the composition root

**Difficulty:** Intermediate

**Category:** Project structure

**Question:**

What belongs in `main.ts`, what belongs in `AppModule`, and which HTTP settings must be applied before `listen()` because of when `init()` reads them?

**Answer:**

`main.ts` is where you wire up the process: create the app, set the global prefix, pipes, filters, and CORS, enable shutdown hooks, and finally call `listen`. `AppModule` owns the module graph, meaning imports and root providers, not HTTP server options. Settings such as `setGlobalPrefix` must run before `init()` registers the routes, because routes are bound with the prefix at that point. Calling them after `listen()` resolves is too late. Keep business modules and logic out of `main.ts`.

**Trade-offs:**

A fat `main.ts` hides the module graph, and a fat `AppModule` full of Express calls breaks non-HTTP entry points. Keep process bootstrap and module composition separate.

**Follow-up:**

Why can `app.use(middleware)` after `await app.listen()` miss routes?

Answer: Routes were already registered during `init()` inside `listen()`. Middleware added later may not wrap those handlers the way you expect, so configure it before `listen`.

### NEST-019 — create() versus createApplicationContext()

**Difficulty:** Senior

**Category:** Lifecycle

**Question:**

A worker should run `OrdersService.rebuild()` once and exit with no port. Compare `NestFactory.create()` + `listen()` with `NestFactory.createApplicationContext()`. Which lifecycle still runs?

**Answer:**

`create()` builds an HTTP application, and `listen()` initializes it and opens a port, which a one-shot worker does not need. `createApplicationContext()` builds the same module graph and providers but with no HTTP adapter and no listener. Nest 10 initializes that context for you, so lifecycle hooks such as `onModuleInit` still run. You then call `OrdersService.rebuild()` and finish with `close()`. Prefer the application context for CLI tools and workers, and use `create()` when you actually serve HTTP.

**Trade-offs:**

Using `create` and `listen` everywhere keeps one code path but opens a port and loads the HTTP adapter. An application context is leaner for jobs.

**Follow-up:**

Do you need `listen()` for `onModuleInit` to run in a worker?

Answer: No. Creating the application context initializes it, so the hooks run without opening a port. Run the work and then call `close()`.

### NEST-020 — What the HTTP adapter owns

**Difficulty:** Advanced

**Category:** Architecture

**Question:**

The service runs on Express. A proposal passes `new FastifyAdapter()` into `NestFactory.create` for throughput. What stays the same, and what must you re-check?

**Answer:**

The module graph, dependency injection, controllers, and the Nest-level guards, pipes, and interceptors all stay the same. The HTTP adapter owns the platform details: request and response objects, raw middleware, body parsing, and platform plugins. So anything that touches Express specifics, such as `req` and `res` methods, Express middleware, or libraries that assume Node's `ServerResponse`, must be revalidated on Fastify. Nest's portable surface is its decorators and DI, and the adapter is the platform boundary.

**Trade-offs:**

Fastify can improve throughput, but some Express middleware will not port. Choose an adapter for platform needs, and measure instead of relying only on benchmarks.

**Follow-up:**

Does switching adapters change provider scopes?

Answer: No. Scopes and the module graph belong to the container; only the HTTP integration details change.

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

### NEST-022 — Exports, re-exports, and the boundary

**Difficulty:** Advanced

**Category:** Modules

**Question:**

`CommerceModule` imports `TaxModule` and `OrdersModule`. `ReportsModule` should inject `TaxService` without importing `TaxModule` itself—the team wants one commerce façade. How do exports/re-exports work?

**Answer:**

Importing `TaxModule` into `CommerceModule` does not automatically pass `TaxService` along. `CommerceModule` must list either `TaxService` or the whole `TaxModule` in its own `exports`. Re-exporting `TaxModule` publishes whatever that module exports to anyone who imports `CommerceModule`, so `ReportsModule` can import just `CommerceModule`. This is deliberate encapsulation: visibility comes from explicit export lists, not from transitive imports.

**Code:**

```typescript
@Module({
  imports: [TaxModule, OrdersModule],
  exports: [TaxModule], // re-export
})
export class CommerceModule {}
```

**Trade-offs:**

A façade with re-exports simplifies importers but couples them to commerce's public surface. Importing `TaxModule` directly keeps the dependency explicit.

**Follow-up:**

Does exporting `TaxService` from `CommerceModule` require providing it there?

Answer: The module must either provide it or import a module that exports it, and only then can it export that token or module. You cannot export a token the module does not know.

### NEST-023 — Barrel files and undefined modules

**Difficulty:** Advanced

**Category:** Project structure

**Question:**

`orders/index.ts` re-exports the controller, service, and `OrdersModule`. `BillingModule` imports `{ OrdersModule }` from `../orders`. Startup says an `imports` entry is undefined. Why can barrel files break Nest modules?

**Answer:**

Barrel files can create circular file imports. `orders/index.ts` loads the module, the module loads billing, and billing imports `orders/index` while `OrdersModule` is still being defined. At that moment the import is `undefined`, so Nest sees an undefined entry in `imports` and rejects it. To avoid this, import module classes from their concrete files, such as `orders.module.ts`, rather than from barrels that pull in the whole folder. Barrels are fine for public leaf APIs, but not for wiring Nest modules.

**Trade-offs:**

Barrels shorten import paths but risk cycles with decorator-evaluated classes. Direct file imports are longer but safe from those cycles.

**Follow-up:**

How do you confirm the undefined import is a cycle?

Answer: Log the imported binding when the module file evaluates, or switch to a direct file import. If the direct import fixes it, the barrel cycle was the cause.

### NEST-024 — The module graph is the dependency manifest

**Difficulty:** Staff-Level

**Category:** Architecture

**Question:**

You review a Nest 10 service with ~forty modules. Teams want more `@Global()` modules "so imports stop breaking builds." What do you look at, and what do you push back on?

**Answer:**

I treat the module graph as the application's dependency manifest: who provides what, who exports it, and who imports it. Making modules global removes the startup friction by hiding those edges. Features stop declaring what they need, ownership blurs, and test setups must recreate the hidden globals. I would push back and fix the missing imports and exports instead, use shared kernel modules with explicit imports, and keep exports narrow. Globals should be limited to true process-wide singletons that are imported once at the root.

**Trade-offs:**

Globals reduce boilerplate but also reduce architectural clarity. Explicit imports cost some verbosity but keep boundaries reviewable.

**Follow-up:**

What is a healthier alternative to "make it global" when many features need `TaxService`?

Answer: One `TaxModule` that exports `TaxService`, imported by each feature or by a small shared façade that re-exports it. It stays explicit and still gives you one instance.

### NEST-025 — How a multi-feature codebase should be laid out

**Difficulty:** Staff-Level

**Category:** Project structure

**Question:**

Propose source layout and composition root for a Nest 10 product with orders, billing, and a small shared kernel. What changes when a second deployable (a worker) needs the same domain services?

**Answer:**

I would organize by feature: `orders/`, `billing/`, and a small `shared/` kernel, each with its own module, controllers, and providers. `AppModule` imports the feature modules and shared config, and it is the composition root for HTTP. The shared kernel holds cross-feature tokens and must not depend on features. For a worker, add a second entry point, such as `main.worker.ts`, that builds a `WorkerModule` composing the same domain modules through `createApplicationContext()`, with no HTTP controllers. Share modules between entry points, not `main.ts`.

**Trade-offs:**

Feature folders clarify ownership. A shared utils dumping ground recreates the problems of globals. Multiple entry points should share modules rather than use one giant `AppModule` with unused HTTP parts.

**Follow-up:**

Should the worker import `OrdersController`?

Answer: No. Import the module that exports the domain providers, or a worker-specific module that lists the providers without the controllers.

### NEST-026 — Why @Injectable() exists

**Difficulty:** Intermediate

**Category:** Providers

**Question:**

`OrdersService` is in `providers` and injects `TaxService` (same module). Someone removes `@Injectable()` from `OrdersService` and startup fails resolving its constructor deps. Why does the decorator matter if the class is already registered?

**Answer:**

Registration and metadata are separate jobs. Putting the class in `providers` tells the container that the token exists. `@Injectable()`, together with `emitDecoratorMetadata`, makes TypeScript emit the constructor parameter types for that class. Without it, Nest often has no parameter tokens to resolve, so it reports unknown dependencies. `@Controller()` plays the same role for controllers. So the decorator is not discovery; it is what makes the constructor types available, and it is also Nest's marker for injectable classes.

**Follow-up:**

Could `@Inject()` on each parameter replace `@Injectable()`?

Answer: Explicit `@Inject()` gives Nest the tokens, but the Nest docs still expect `@Injectable()` on providers. Keep it as standard practice.

### NEST-027 — What @Optional() changes, and what it leaves alone

**Difficulty:** Intermediate

**Category:** Dependency injection

**Question:**

A payments module should use an audit sink when another module exports one, and keep booting when none does. How do you express that on a constructor and on a `useFactory` `inject` list?

**Answer:**

On a constructor, combine `@Optional()` with `@Inject(AUDIT)` and mark the parameter optional, so a missing token gives `undefined` instead of failing startup. Your class must then handle that `undefined`. On a factory provider, write the entry in `inject` as `{ token: AUDIT, optional: true }`, which has the same meaning for that argument. `@Optional()` does not register a provider or change any exports; it only relaxes how the dependency is resolved.

**Code:**

```typescript
constructor(@Optional() @Inject(AUDIT) private readonly audit?: AuditTrail) {}
// factory inject: [{ token: AUDIT, optional: true }]
```

**Trade-offs:**

Optional dependencies enable plugin-style designs, but they also turn missing wiring into a silent `undefined`. Use them for truly optional collaborators, not for forgotten exports.

**Follow-up:**

Does `@Optional()` fix a circular dependency?

Answer: No. It only tolerates a missing token. Cycles need `forwardRef` or a redesign of the graph.

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

### NEST-029 — How a list of providers is registered

**Difficulty:** Senior

**Category:** Providers

**Question:**

Orders pricing needs every tax rule the process implements (VAT, duty, regional). The author wants one injected array. How do you register that list in NestJS 10.4, and why is repeating `provide: TAX_RULES` not enough?

**Answer:**

A module's providers are stored in a map keyed by token, so two entries with `provide: TAX_RULES` collapse into the last one. Nest has no `multi: true` option to collect them. Instead, register each rule as its own provider, then build the list with a factory: `useFactory` receives the rules and returns an array, and `inject` lists them. Rules from other modules must be exported and imported. The array order is the `inject` order. `APP_GUARD` and similar tokens are special cases that Nest gathers itself, not a pattern for your domain lists.

**Code:**

```typescript
{
  provide: TAX_RULES,
  useFactory: (vat: VatRule, duty: DutyRule) => [vat, duty],
  inject: [VatRule, DutyRule],
}
```

**Trade-offs:**

An explicit factory makes order and ownership visible. A factory that creates the rules with `new` hides them from DI (see NEST-050). Do not copy the `APP_GUARD` aggregation behavior for domain tokens.

**Follow-up:**

VAT must run before duty, and a future rule should declare "after VAT." What does this factory give you?

Answer: Only the order of the `inject` array. There is no priority field, so keep the order explicit there, or sort inside the factory using a property that each rule exposes.

### NEST-030 — When property injection runs

**Difficulty:** Senior

**Category:** Dependency injection

**Question:**

A class sets `@Inject(TaxService) private tax: TaxService` on a field and reads `this.tax` in the constructor. The field is `undefined` even though `TaxService` is provided. When does property injection run?

**Answer:**

Nest first resolves the constructor parameters and calls `new`, and only afterwards assigns the properties decorated with `@Inject()`. The constructor body runs in that gap, so `this.tax` is still `undefined` there. Once the instance is fully wired, methods and hooks such as `onModuleInit` see the assigned value. For required dependencies, prefer constructor injection. Property injection is meant for awkward cases like subclass signatures, not as a fix for circular constructors.

**Trade-offs:**

Constructor parameters are visible in the signature and available for the whole constructor. Properties are shorter, but a hand-written `new` in a unit test that bypasses the container will not set them.

**Follow-up:**

The property is `@Optional() @Inject(AUDIT_SINK)`, the sink is unregistered, and the constructor logs `undefined`. After `onModuleInit`, what is the field?

Answer: Still `undefined`. The absence is the result, not a delay. Nest does not look up a provider registered later, because registration finished before any constructor ran.

### NEST-031 — Why the module class can take constructor arguments

**Difficulty:** Intermediate

**Category:** Modules

**Question:**

`OrdersModule` wants a startup check that needs `OrdersService` via the module class constructor rather than on the service. Is that valid in Nest 10, and when do those deps resolve?

**Answer:**

Yes. Nest constructs a module class just like a provider, and it can inject any provider that is visible in that module's context. The module instance is created as part of building the container graph, before lifecycle hooks run, so its constructor should stay light. For async startup checks, prefer a lifecycle hook on a provider. If you inject `OrdersService` into the module constructor, it still has to be available through `providers` or `imports`, as with any other injector.

**Trade-offs:**

Injecting into the module class couples bootstrap logic to the module. `onModuleInit` on a provider is usually clearer for async checks.

**Follow-up:**

Can the module constructor inject a token only exported by a module it did not import?

Answer: No. The same visibility rules apply as for any injector in that module.

### NEST-032 — What ModuleRef.get guarantees inside a feature

**Difficulty:** Senior

**Category:** Dependency injection

**Question:**

`OrdersService` injects `ModuleRef` and calls `this.moduleRef.get(TaxService)` with no second argument. `TaxService` is exported by `TaxModule`; `OrdersModule` does not import `TaxModule`, but `AppModule` imports both. What does `get` guarantee?

**Answer:**

With no options, `ModuleRef.get` searches only from the calling module's context, not the whole app. Here `OrdersModule` does not import `TaxModule`, so it cannot see `TaxService`, and `get` fails even though `AppModule` imports both. Pass `{ strict: false }` only when you intentionally want to search the whole application, and accept the coupling that brings. Normally you should import `TaxModule` and inject `TaxService` directly in the constructor.

**Trade-offs:**

`ModuleRef` is useful for lazy lookups, but it bypasses clear constructor dependencies. Use it sparingly; as a general service locator it makes the code harder to follow.

**Follow-up:**

Does `app.get(TaxService)` from `main.ts` use the same rules?

Answer: It uses the application's root context and is not strict by default, so it can retrieve providers more broadly than a feature module's strict `ModuleRef.get`.

### NEST-033 — What order sibling providers actually have

**Difficulty:** Senior

**Category:** Lifecycle

**Question:**

`providers: [CacheService, WarmupService]` with neither injecting the other. `WarmupService`'s constructor assumes `CacheService`'s constructor has finished. What order do sibling providers actually have?

**Answer:**

You should not rely on array order for independent siblings. Nest creates providers according to the dependency graph, and when there is no injection edge between `CacheService` and `WarmupService`, their relative order is not something you can depend on. The order of the `providers` array is not a supported lifecycle contract. If Warmup needs Cache to be ready, inject `CacheService` into it so that a real dependency edge exists, or use `onModuleInit` together with that explicit dependency.

**Follow-up:**

Will putting `CacheService` first in the array fix it?

Answer: Not as a guarantee. Add a real dependency injection edge, or use a lifecycle hook that waits for the dependency.

### NEST-034 — How far a re-export chain carries a token

**Difficulty:** Advanced

**Category:** Modules

**Question:**

`TaxModule` provides `TaxService` and `TaxRepository`, exports only `TaxService`. `BillingModule` imports `TaxModule`. `CommerceModule` imports `BillingModule`. `ReportsModule` imports `CommerceModule`. Who can inject what?

**Answer:**

Modules that import `TaxModule` can inject `TaxService`, but not `TaxRepository`, because it is not exported. Importing `TaxModule` into `BillingModule` does not pass `TaxService` on to `CommerceModule`, unless `BillingModule` exports that token or `TaxModule`. Exports do not chain automatically: every hop must re-export for the next importer to see the token. So `CommerceModule` and `ReportsModule` cannot inject `TaxService` unless each previous module re-exports it. Encapsulation is intentional at every boundary.

**Trade-offs:**

Re-export chains build façades but obscure which module owns the provider. Prefer short export paths.

**Follow-up:**

Suppose `TaxModule` also exports `TaxRepository`, and Billing injects it after importing `TaxModule`. Can Commerce inject it by importing Billing only?

Answer: Only if Billing re-exports `TaxRepository` or `TaxModule`. Otherwise Commerce must import `TaxModule`, or another module that exports it, itself.

### NEST-035 — When forRoot is enough, and when the factory has to be async

**Difficulty:** Advanced

**Category:** Modules

**Question:**

`PaymentsModule` needs merchant id and timeout—literals in one deployable, from `ConfigService` in another. When is sync `forRoot` enough, and when must the factory be async?

**Answer:**

Sync `forRoot(options)` or `useValue` is enough when the values are known as soon as the module file is evaluated, such as literals. When values come from something async, like a config service, a secrets manager, or a file load, use `forRootAsync` with a `useFactory` that returns a Promise, plus `inject: [ConfigService]` and `imports` for the config module. Nest awaits async factories while instantiating providers. Do not do I/O with top-level await in module files to work around this.

**Trade-offs:**

A sync root is simple and easy to test. An async root ties startup to config availability, so fail fast when a secret is missing.

**Follow-up:**

Can `useFactory` be async without `forRootAsync`?

Answer: Yes. A plain provider's `useFactory` may return a Promise, and Nest awaits it. `forRootAsync` is just the dynamic-module helper that wires that pattern together with `imports` and `inject`.

### NEST-036 — What forFeature is allowed to add

**Difficulty:** Advanced

**Category:** Modules

**Question:**

`PaymentsModule.forRoot(options)` is imported once from `AppModule` and builds one `PaymentsClient`. `OrdersModule` and `BillingModule` need merchant-bound handles. What is `forFeature` allowed to add?

**Answer:**

`forFeature` should register feature-local providers, such as named tokens, repositories, or merchant-bound wrappers, that build on the root client. It should not call `forRoot` again or create a second client. The root is imported once at the composition root, and each feature imports `forFeature(...)`, or simply uses the exports of the configured module. Features add to the graph; they should never re-bind the singleton root with different options.

**Trade-offs:**

`forFeature` scales to many merchant-bound handles. Putting everything in `forRoot` would force one shape on every caller.

**Follow-up:**

What happens if a feature calls `forRoot` with different options?

Answer: You risk a second root registration and a second client. Keep `forRoot` unique, and pass feature-specific options through `forFeature`.

### NEST-037 — Why configuration is a provider

**Difficulty:** Intermediate

**Category:** Configuration

**Question:**

Feature services read `process.env.PAYMENTS_MERCHANT_ID` directly. The team adds `@nestjs/config` and `ConfigModule.forRoot()`. What should a feature inject, and what does `forRoot` establish?

**Answer:**

Features should inject `ConfigService` and call `config.get('PAYMENTS_MERCHANT_ID')`, or use typed or namespaced getters. `ConfigModule.forRoot()` loads the `.env` files and the process environment into Nest's config system and registers `ConfigService` once. Reading through the service means tests can override the provider and validation can be centralized. Reading `process.env` directly bypasses all of that. A feature module needs to import `ConfigModule`, unless config was registered as global.

**Trade-offs:**

`ConfigService` makes testing and validation easier but adds indirection compared to raw environment variables. It is worth it once several modules share settings.

**Follow-up:**

Is `ConfigModule.forRoot()` required in every feature module?

Answer: No. Call it once at the root, often with `isGlobal: true`. Features import `ConfigModule` only if it is not global.

### NEST-038 — How a namespaced config object is injected

**Difficulty:** Senior

**Category:** Configuration

**Question:**

Database settings are host, port, and name. You do not want `config.get('DATABASE_HOST')` string keys everywhere. How does `@nestjs/config` expose a namespaced object for injection?

**Answer:**

Use `registerAs('database', () => ({ host, port, name }))` to create a namespaced config factory, and list it in the `load` option of `ConfigModule`. Then inject the object with `@Inject(databaseConfig.KEY)`, or read it with `ConfigService.get('database')`. The namespace becomes one typed object instead of many scattered string keys. You can validate its shape with a `validate` function, or with a Joi or Zod schema, in the config setup.

**Code:**

```typescript
export default registerAs('database', () => ({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
}));
```

**Trade-offs:**

Namespaces group related settings and improve typing. Splitting config into too many namespaces brings back the string-key problem.

**Follow-up:**

Does `registerAs` read the file automatically?

Answer: No. The config only takes effect if it is listed in `load` in the `forRoot` options. Defining `registerAs` alone does not register it.

### NEST-039 — When the .env file is read relative to your service file

**Difficulty:** Senior

**Category:** Configuration

**Question:**

`orders.service.ts` reads `process.env.PAYMENTS_MERCHANT_ID` at module top level. `ConfigModule.forRoot()` makes `ConfigService.get` see `.env`, but the service field is still undefined. Why?

**Answer:**

A top-level read of `process.env` runs when the service file is first evaluated, which is often before `ConfigModule.forRoot()` has loaded `.env` into the environment. So the value is still undefined at that moment. `ConfigService` reads from the store that `forRoot` filled, so it sees the value later. The fix is to read configuration inside the constructor or `onModuleInit` through `ConfigService`, or to make sure the environment is loaded before any feature file is evaluated. What matters is evaluation order versus when `forRoot` runs, not file location.

**Follow-up:**

Will importing `ConfigModule` at the top of the service file fix the top-level read?

Answer: No. Importing the class does not call `forRoot`. Only the `forRoot` import inside a loaded Nest module starts loading the environment.

### NEST-040 — Where a failing config validate() throws

**Difficulty:** Senior

**Category:** Configuration

**Question:**

`ConfigModule.forRoot({ validate })` throws `Error('PAYMENTS_MERCHANT_ID is required')`. Operators expect `NestFactory.create`'s `abortOnError` handling and Nest lifecycle logs. Where does this throw relative to that?

**Answer:**

The validation runs while Nest builds the application, as the dynamic config module is initialized during `create()`. It is not a later failure at `listen`, and it is not a business failure inside an `onModuleInit` hook of an otherwise healthy app. It surfaces as a module or provider initialization failure. With the default `abortOnError`, that can end in `process.abort()` rather than a neat rejected promise, which surprises people who expect a normal exception.

**Follow-up:**

How do you make the failure a thrown or rejected error for tests?

Answer: Pass `{ abortOnError: false }` to `NestFactory.create`, so initialization errors reject instead of aborting the process.

### NEST-041 — Read the startup error: the provider is not exported

**Difficulty:** Intermediate

**Category:** Modules

**Question:**

Startup fails resolving a dependency in `OrdersModule` context. `TaxModule` provides `TaxService` but does not export it; `OrdersModule` imports `TaxModule` and the controller injects `TaxService`. Which line is wrong?

**Answer:**

The problem is the missing `exports: [TaxService]` in `TaxModule`. Importing a module only exposes what that module exports. Because `TaxModule` provides `TaxService` without exporting it, the provider stays private to `TaxModule`, and `OrdersModule` cannot see it. Add `TaxService` to `exports`, or move the provider into the consuming module. The controller and service code are fine, since they simply inject the token.

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

Answer: Resolution always happens from the consuming module's context. Nest names the place where the lookup failed, not the place where you forgot the export.

### NEST-042 — Which token exports actually publish

**Difficulty:** Senior

**Category:** Providers

**Question:**

`TaxModule` registers `{ provide: TAX_RULES, useClass: VatRule }` but `exports: [VatRule]`. `OrdersModule` imports `TaxModule` and injects `TAX_RULES`. Startup cannot resolve `TAX_RULES`. Why?

**Answer:**

Exports publish tokens, not classes that you consider equivalent. `TaxModule` registered the provider under the token `TAX_RULES` but exported `VatRule`, which is a different token. So `OrdersModule` could inject `VatRule`, but it cannot resolve `TAX_RULES`. The fix is to export `TAX_RULES`. The token you provide and the token you export must match what injectors actually ask for.

**Code:**

```typescript
providers: [{ provide: TAX_RULES, useClass: VatRule }],
exports: [TAX_RULES],
```

**Follow-up:**

Would exporting both `TAX_RULES` and `VatRule` change the injected instance for `TAX_RULES`?

Answer: No. Exporting `VatRule` only helps code that injects `VatRule`. `TAX_RULES` must be exported on its own for that token to resolve.

### NEST-043 — What a request uses from the module that owns the controller

**Difficulty:** Senior

**Category:** Architecture

**Question:**

`GET /orders/42` hits Nest 10 HTTP. `OrdersController` is on `OrdersModule`, which provides `OrdersService` and imports `TaxModule`. `BillingModule` is unrelated. What module graph does that request use?

**Answer:**

The request is handled by the controller instance that belongs to `OrdersModule`. That controller can inject whatever is visible in that module's context: the module's own providers, the exports of the modules it imports, such as `TaxService`, and any global providers. `BillingModule` is irrelevant unless something in that import chain brings it in. HTTP does not walk through every module; routing selects one controller, and dependency injection visibility is decided by that controller's module.

**Follow-up:**

Can the controller inject a provider that only `BillingModule` provides and exports?

Answer: Only if `OrdersModule` imports `BillingModule`, or another module that re-exports it, or if the provider is global.

### NEST-044 — What Test.createTestingModule compiles

**Difficulty:** Senior

**Category:** Testing

**Question:**

You want a test that constructs `OrdersService` with a fake `TaxService`, runs `onModuleInit` if present, and opens no port. What does `Test.createTestingModule` compile, and how do you drive lifecycle?

**Answer:**

`Test.createTestingModule({...}).compile()` builds an isolated container from the imports, providers, and overrides you declare. It is not the full HTTP server. Use `module.get(OrdersService)` to fetch instances, and `overrideProvider` to substitute fakes. Compiling alone does not run lifecycle hooks, so call `module.init()` to trigger `onModuleInit`. Never call `listen`. When you are finished, call `module.close()` so the destroy hooks run.

**Code:**

```typescript
const module = await Test.createTestingModule({
  providers: [OrdersService, { provide: TaxService, useValue: fakeTax }],
}).compile();
await module.init();
```

**Trade-offs:**

Unit-style testing modules are fast and narrow. End-to-end tests with `create` and supertest are heavier but closer to production HTTP.

**Follow-up:**

Does `compile()` alone run `onModuleInit`?

Answer: No. You need to call `init()`, or use a helper that initializes the app, for those hooks to run.

### NEST-045 — When a useValue promise starts, versus a factory

**Difficulty:** Advanced

**Category:** Providers

**Question:**

Both snippets provide `MERCHANT_ID` from an async source. One starts work while `AppModule` is still evaluating; the other starts when the instance loader runs. Contrast `useValue: fetchId()` with `useFactory: () => fetchId()`.

**Answer:**

`useValue: fetchId()` calls `fetchId` immediately, when the module file is evaluated, because that is plain JavaScript. Nest later notices the Promise and awaits it during `create()`, but the network call has already started, and a rejection in the gap can become an unhandled rejection. `useFactory: () => fetchId()` is only a function reference, so Nest calls it later, when the loader instantiates the provider, awaits its promise, and respects `inject` order. Prefer the factory for I/O.

**Trade-offs:**

`useValue` suits a value you already hold. A factory takes part in instantiation order, can inject config, and does not start work just because a test imported the file.

**Follow-up:**

The async factory `inject`s `ConfigService` from a non-global `ConfigModule`. `AppModule` imports both modules, but the factory fails. Why?

Answer: The factory resolves in the module that registered it, not through `AppModule`'s other imports. Import `ConfigModule` into the payments module, or make config global.

### NEST-046 — What LazyModuleLoader.load adds to the graph

**Difficulty:** Advanced

**Category:** Modules

**Question:**

`ReportsModule` is large and some operators want it out of the startup scan, loaded only when a user opens a report. What does `LazyModuleLoader.load` add to the graph in Nest 10.4, and what does it not do?

**Answer:**

`LazyModuleLoader.load` takes a function that imports the module, such as `() => import(...).then(m => m.ReportsModule)`, which delays evaluating the file. When called, Nest scans the module, links its dependencies, instantiates its providers, and returns that module's `ModuleRef`. If the module is already in the container, nothing is rebuilt. It does not mount HTTP routes, so controllers do not become reachable, and it does not call `onModuleInit`. So lazy loading is deferred provider instantiation, not on-demand routing; import HTTP modules at the root.

**Trade-offs:**

Deferring evaluation can shrink startup, but the first load pays the scan and construction cost, and hooks or routes need a separate plan. Prefer an eager import for a feature that serves HTTP.

**Follow-up:**

`ReportsModule` is also in `AppModule.imports`, and a request calls `load(() => ReportsModule)`. What does `get(ReportsService)` return?

Answer: The instance created at startup. `load` sees that the module is already present and returns a reference to it, so you gained nothing. Remove one of the two paths.

### NEST-047 — How a custom logger sees bootstrap logs

**Difficulty:** Intermediate

**Category:** Lifecycle

**Question:**

`AppLogger` is an `@Injectable()` `LoggerService` writing to the company drain. Logs emitted while `NestFactory.create` constructs providers never reach it. How do you wire a custom logger so bootstrap messages are captured?

**Answer:**

There are two ways. Pass `{ logger: instance }` to `create` to give Nest a logger immediately, outside dependency injection. Or use `{ bufferLogs: true }`, and after `create` resolves call `app.useLogger(app.get(AppLogger))`, which installs the injected logger and flushes the buffered messages to it. Without buffering, lines logged during `create` have already gone to the default logger. Registering `AppLogger` only as a provider is too late for early messages. Keep its constructor light, since it is built while the graph it logs about is being built.

**Trade-offs:**

`logger: new AppLogger()` sees early lines but skips DI. `bufferLogs` plus `useLogger(app.get(...))` keeps a single injected logger. `logger: false` silences Nest, and buffering cannot recreate those lines later.

**Follow-up:**

`create` uses `{ logger: false, bufferLogs: true }`, then `useLogger(app.get(AppLogger))`. Which messages does `AppLogger` still miss?

Answer: Messages that Nest never recorded, because `logger: false` turned logging off. Buffering cannot recreate them, so drop `logger: false` if you want bootstrap logs to reach `AppLogger`.

### NEST-048 — What INQUIRER refers to

**Difficulty:** Advanced

**Category:** Dependency injection

**Question:**

A factory wants the name of the class it is being injected into so a logger can say `OrdersService`. Nest 10.4 exports `INQUIRER` from `@nestjs/core`. What does it refer to?

**Answer:**

`INQUIRER` is a token that resolves to the class, or instance, that is asking for the current provider, meaning the parent that is being constructed. A factory with `inject: [INQUIRER]` can use it to customize the result for each consumer, for example to give a logger the right category name. It is not the HTTP request, and it is not the module. Because each consumer needs its own result, the provider that uses it should be transient, so every host gets a separate instance.

**Trade-offs:**

`INQUIRER` enables contextual factories, but overusing it recreates the service locator pattern. Prefer plain constructor parameters when possible.

**Follow-up:**

If the factory provider is singleton-scoped, what goes wrong with INQUIRER?

Answer: A singleton is built only once and then shared, so it cannot reflect each consumer. Later hosts just reuse that one instance. Use transient scope for per-host loggers.

### NEST-049 — How an undefined dependency differs from a missing provider

**Difficulty:** Advanced

**Category:** Dependency injection

**Question:**

Boot A: Nest reports an undefined dependency (possibly circular import / missing declaration). Boot B: classic "can't resolve dependencies … available in the X context." How do these differ?

**Answer:**

They are different failures. An undefined dependency means the token value was literally `undefined` when the decorators or the scanner read it, usually because of circular file imports, `import type`, or a forward reference without `forwardRef`. The metadata holds `undefined`. A missing provider means the token is a real value, but nothing registered it or exported it into the consuming module's context. For the first, fix the cycles and metadata; for the second, fix `providers`, `exports`, and `imports`. Setting `NEST_DEBUG=true` helps trace resolution.

**Follow-up:**

Which failure does `forwardRef` address?

Answer: The undefined-token case caused by circular evaluation. It does not help when a well-defined token was simply never exported.

### NEST-050 — Why new inside a factory hides a dependency

**Difficulty:** Staff-Level

**Category:** Architecture

**Question:**

`PricingModule` exports `TAX_RULES` from a factory: `return [new VatRule(), new DutyRule(process.env.DUTY_RATE)]`. The graph shows one provider. Why is `new` inside the factory a design problem at staff level?

**Answer:**

A factory that builds rules with `new` hides the real dependencies. `VatRule`, `DutyRule`, and the environment variable are invisible to the module graph, cannot be swapped in tests without replacing the whole factory, and miss out on Nest DI, so they get no injection and no lifecycle hooks. The module looks like it exports one token, while the ownership of the rules lives in opaque code. It is better to register each rule as a provider that Nest can inject, override, and show in the graph. A factory should assemble injected dependencies, not quietly construct them.

**Trade-offs:**

Inline `new` is quick to write but opaque to operate. A provider graph is more verbose but testable and replaceable.

**Follow-up:**

What is the smallest refactor that surfaces `DutyRule`'s env dependency?

Answer: Register `DutyRule` with its own factory that injects `ConfigService`, then inject `DutyRule` into the `TAX_RULES` factory. That makes the config dependency visible and replaceable.
