# NEST03 — Dependency injection

NestJS 10, Express adapter unless noted. Questions NEST-101–NEST-150.

Scopes and bubbling, custom providers, tokens, `ModuleRef`/`ContextId`, durable providers, circular dependencies, dynamic modules and `ConfigurableModuleBuilder`, exports/`@Global`, test overrides, DI in enhancers, and `LazyModuleLoader`. Request pipeline order is NEST02.

### NEST-101 — The DEFAULT provider scope

**Difficulty:** Junior

**Category:** Scopes

**Question:**

What is the default provider scope in NestJS, and what does it imply for how you write the class?

**Answer:**

`Scope.DEFAULT` is a singleton: Nest creates one instance at bootstrap and shares it with every consumer and every request. It is the cheapest option, but the class must not keep per-request mutable state in fields.

**Follow-up:**

If a provider is exported to five modules, how many instances exist?

Answer: One. Module boundaries control visibility, not instance count; every importing module receives the same singleton.

### NEST-102 — Declaring a REQUEST-scoped provider

**Difficulty:** Junior

**Category:** Scopes

**Question:**

What is `Scope.REQUEST`, and how do you declare it on a class and on a custom provider?

**Answer:**

A new instance is created for each incoming request and discarded afterwards. Use `@Injectable({ scope: Scope.REQUEST })`, or `{ provide: X, useClass: X, scope: Scope.REQUEST }` for a custom provider. It fits per-request state such as tenant, user, or correlation id.

**Follow-up:**

Is `onModuleInit` called for each request-scoped instance?

Answer: No. Lifecycle hooks are not triggered for request-scoped providers, so per-instance setup belongs in the constructor or an explicit method.

### NEST-103 — TRANSIENT scope

**Difficulty:** Junior

**Category:** Scopes

**Question:**

What is `Scope.TRANSIENT`, and how does it differ from `Scope.REQUEST`?

**Answer:**

Each consumer that injects a transient provider gets its own private instance. It is not tied to the HTTP request lifecycle, so a singleton consumer holds its transient instance for the lifetime of the app. Typical use: a logger that stores the consumer's class name as context.

**Follow-up:**

Is a transient instance re-created on every method call?

Answer: No. It is created once per consuming provider and is then stable for that consumer's lifetime.

### NEST-104 — Scope bubbling

**Difficulty:** Senior

**Category:** Scopes

**Question:**

Explain scope bubbling. What happens to a controller that injects a request-scoped service, and how does transient scope behave differently?

**Answer:**

Request scope bubbles up the injection chain: any provider or controller that depends on a request-scoped provider becomes request-scoped itself. Transient scope does not bubble; a singleton that injects a transient provider stays a singleton and just holds a dedicated transient instance.

**Follow-up:**

Why can one small request-scoped service be dangerous in a large app?

Answer: Everything that depends on it, directly or transitively, is re-instantiated per request. A leaf service injected into a core service can silently make most of the graph request-scoped.

### NEST-105 — Making a controller request-scoped

**Difficulty:** Intermediate

**Category:** Scopes

**Question:**

How can a controller end up request-scoped, and what else in the pipeline is affected?

**Answer:**

Either implicitly through bubbling (it injects a request-scoped provider) or explicitly with `@Controller({ path: 'cats', scope: Scope.REQUEST })`. A new controller instance then handles each request.

**Follow-up:**

Do guards, interceptors, and pipes follow the same rule?

Answer: Yes. If an enhancer depends on a request-scoped provider, it is also instantiated per request.

### NEST-106 — Performance cost of request scope

**Difficulty:** Senior

**Category:** Scopes

**Question:**

What is the performance cost of request-scoped providers, and how do you reduce it?

**Answer:**

Nest has to instantiate the dependency subtree on every request, which adds latency, allocations, and GC pressure. Keep the request-scoped subtree tiny, avoid bubbling into large services, and consider `AsyncLocalStorage` (for example `nestjs-cls`) or durable providers instead.

**Trade-offs:**

Request scope gives clean, explicit per-request state through DI, but costs throughput. `AsyncLocalStorage` keeps services as singletons but makes the request context implicit and harder to test.

**Follow-up:**

What is your default scope choice, and when do you deviate?

Answer: Default to singleton. Use request scope only when the instance really needs per-request state that cannot be passed as a method argument or kept in async local storage.

### NEST-107 — Accessing the request in a provider

**Difficulty:** Senior

**Category:** Scopes

**Question:**

How do you access the underlying request object inside a provider, and what does that do to the provider's scope?

**Answer:**

Inject the `REQUEST` token from `@nestjs/core`: `constructor(@Inject(REQUEST) private req: Request) {}`. The provider becomes request-scoped automatically. For GraphQL use the `CONTEXT` token; for microservices `REQUEST` holds the pattern and data of the message.

**Follow-up:**

How do you get request data in a singleton provider or at bootstrap?

Answer: You cannot inject it there. Pass it as an argument, use `AsyncLocalStorage`, or resolve a request-scoped provider through `ModuleRef.resolve()` with a `ContextId`.

### NEST-108 — `useClass`

**Difficulty:** Junior

**Category:** Custom providers

**Question:**

What does `useClass` do in a custom provider, and when is it useful?

**Answer:**

`{ provide: TOKEN, useClass: Impl }` makes the container instantiate `Impl`, with its own dependencies injected, whenever `TOKEN` is requested. It is useful for swapping implementations, such as `useClass: isProd ? SmtpMailer : FakeMailer`.

**Follow-up:**

Are the class's constructor dependencies still injected?

Answer: Yes. `useClass` goes through the normal instantiation path, so `Impl` resolves its dependencies like any other provider.

### NEST-109 — `useValue`

**Difficulty:** Junior

**Category:** Custom providers

**Question:**

What does `useValue` do, and what is it typically used for?

**Answer:**

It binds a token to an existing value, such as a constant, config object, or test mock: `{ provide: 'CONFIG', useValue: { retries: 3 } }`. Nest does not instantiate or inject anything into it.

**Follow-up:**

What risk comes from sharing a `useValue` object?

Answer: Every consumer gets the same reference, so mutation by one consumer is visible to all. Freeze it or treat it as read-only.

### NEST-110 — `useFactory` and `inject`

**Difficulty:** Senior

**Category:** Custom providers

**Question:**

How does `useFactory` work, and how do you give the factory its dependencies?

**Answer:**

`{ provide: DB, useFactory: (cfg: ConfigService) => new Client(cfg.get('DB_URL')), inject: [ConfigService] }`. Nest calls the factory with the `inject` entries in order, and the factory may return a value or a Promise. Use it for conditional creation or for wrapping third-party objects.

**Follow-up:**

What happens if you forget `inject`, and how do you mark a dependency optional?

Answer: The factory parameters are `undefined`. For an optional dependency use `inject: [{ token: X, optional: true }]`.

### NEST-111 — `useExisting`

**Difficulty:** Junior

**Category:** Custom providers

**Question:**

What does `useExisting` do, and how does it differ from `useClass`?

**Answer:**

It creates an alias: `{ provide: 'AliasedService', useExisting: RealService }` resolves to the same instance as `RealService`. `useClass` would build a second instance. It is useful for exposing one provider under an alternative token.

**Follow-up:**

What breaks if you used `useClass: RealService` instead of `useExisting`?

Answer: Two separate instances would exist, so state, caches, and connections are no longer shared between the two tokens.

### NEST-112 — Async providers

**Difficulty:** Senior

**Category:** Custom providers

**Question:**

How do async providers work, and how do they affect application startup?

**Answer:**

An async `useFactory` returns a Promise, and Nest awaits it before resolving dependents, so consumers receive the resolved value. Bootstrap does not finish until every async provider has settled.

**Follow-up:**

What happens if the factory rejects?

Answer: Application startup fails. Put timeouts and retries inside the factory if you want it to tolerate a slow or flaky dependency.

### NEST-113 — Injection tokens

**Difficulty:** Intermediate

**Category:** Tokens and injection

**Question:**

What can be used as an injection token, and when do you need `@Inject()`?

**Answer:**

A class, a string, or a `Symbol`. Classes carry constructor type metadata, so no `@Inject()` is required; string and symbol tokens need `@Inject(TOKEN)` because there is no runtime type to infer.

**Follow-up:**

Why prefer exported constants or symbols over inline strings?

Answer: They prevent typos and collisions between modules, and give you a single symbol to find usages of.

### NEST-114 — Injecting an interface

**Difficulty:** Senior

**Category:** Tokens and injection

**Question:**

How do you inject something typed as an interface, and why can't you do it directly?

**Answer:**

Interfaces are erased at runtime, and `emitDecoratorMetadata` emits `Object` for them. Register a token, `{ provide: MAILER, useClass: SmtpMailer }`, and inject with `@Inject(MAILER) private mailer: IMailer`.

**Trade-offs:**

A symbol token plus interface keeps contracts lightweight but needs `@Inject` everywhere. An abstract class works as both type and token with no `@Inject`, at the cost of a runtime class.

**Follow-up:**

Can an abstract class replace the token?

Answer: Yes. Provide `{ provide: AbstractMailer, useClass: SmtpMailer }` and type the constructor parameter as `AbstractMailer`.

### NEST-115 — Constructor vs property injection

**Difficulty:** Intermediate

**Category:** Tokens and injection

**Question:**

When would you use property injection instead of constructor injection?

**Answer:**

Constructor injection is the default: explicit, easy to test, and fields can be `readonly`. Property injection (`@Inject(TOKEN) private dep: Dep`) helps when a subclass extends a provider and you do not want to thread dependencies through `super(...)`.

**Trade-offs:**

Property injection hides dependencies from the constructor signature and makes manual instantiation in unit tests harder.

**Follow-up:**

Is a property-injected dependency available inside the constructor?

Answer: No. Properties are assigned after construction, so use them only in methods or lifecycle hooks.

### NEST-116 — `@Optional()`

**Difficulty:** Junior

**Category:** Tokens and injection

**Question:**

What does `@Optional()` do on a constructor parameter?

**Answer:**

If no provider is registered for the dependency, Nest injects `undefined` instead of throwing at bootstrap: `constructor(@Optional() @Inject('HTTP_OPTIONS') private opts?: Opts) {}`. It suits library code where host applications may not supply configuration.

**Follow-up:**

Does `@Optional()` also swallow errors thrown while creating the provider?

Answer: No. It only covers a missing provider; if the provider exists and its factory throws, bootstrap still fails.

### NEST-117 — Defaults with `@Optional()`

**Difficulty:** Intermediate

**Category:** Tokens and injection

**Question:**

How do you provide a default value when an optional dependency is absent?

**Answer:**

Fall back in code: `this.opts = opts ?? DEFAULTS`, or use a default parameter value. In a dynamic module you can also register a default provider that the host can override.

**Follow-up:**

Which approach is safer for a reusable library?

Answer: Registering a default provider in the module, because the fallback is visible in the module definition and replaceable via DI rather than hidden in one class.

### NEST-118 — `ModuleRef.get()`

**Difficulty:** Intermediate

**Category:** ModuleRef and ContextId

**Question:**

What does `ModuleRef.get()` return, and what does the `strict` option control?

**Answer:**

It synchronously returns an existing static (singleton) provider instance: `this.moduleRef.get(Service)`. By default `strict` is `true`, so lookup is limited to the current module; `{ strict: false }` searches the whole application.

**Follow-up:**

What happens if you call `get()` on a request-scoped or transient provider?

Answer: Nest throws an error saying the provider is scoped. Use `ModuleRef.resolve()` instead.

### NEST-119 — `ModuleRef.resolve()` vs `get()`

**Difficulty:** Senior

**Category:** ModuleRef and ContextId

**Question:**

How does `ModuleRef.resolve()` differ from `get()`?

**Answer:**

`get()` is synchronous and returns static instances. `resolve()` returns a Promise of an instance of a scoped (transient or request) provider. Each call creates a new instance unless you pass the same `contextId`.

**Follow-up:**

How do you get the same transient instance from two `resolve()` calls?

Answer: Create one `ContextId` with `ContextIdFactory.create()` and pass it to both calls: `await moduleRef.resolve(Svc, contextId)`.

### NEST-120 — `ContextId`

**Difficulty:** Senior

**Category:** ModuleRef and ContextId

**Question:**

What is a `ContextId`, and who creates it?

**Answer:**

It identifies one DI sub-tree. Providers resolved under the same `ContextId` share their scoped instances; different ids get separate instances. Nest creates one per HTTP request internally, and you create your own with `ContextIdFactory.create()`.

**Follow-up:**

When do you create a `ContextId` yourself?

Answer: When resolving request-scoped providers outside an HTTP request, such as in cron jobs, queue consumers, or event handlers.

### NEST-121 — Reusing the request's context

**Difficulty:** Senior

**Category:** ModuleRef and ContextId

**Question:**

How do you reuse the current request's DI context when calling `resolve()` manually?

**Answer:**

Use `const contextId = ContextIdFactory.getByRequest(request)`, then `moduleRef.resolve(Svc, contextId)`. To make the real request object available to injected `REQUEST` in that sub-tree, call `moduleRef.registerRequestByContextId(request, contextId)`.

**Follow-up:**

What is injected as `REQUEST` if you skip `registerRequestByContextId`?

Answer: With a manually created context, `REQUEST` is `undefined`, because Nest has no request object bound to that id.

### NEST-122 — `ModuleRef.create()`

**Difficulty:** Senior

**Category:** ModuleRef and ContextId

**Question:**

What does `ModuleRef.create()` do, and when would you use it?

**Answer:**

It instantiates a class with DI at runtime without registering it in the module: `const inst = await moduleRef.create(MyClass)`. It suits plugin or factory patterns where classes are chosen dynamically.

**Follow-up:**

Does Nest manage the created instance's lifecycle?

Answer: No. The class is not part of the module graph, so lifecycle hooks are not managed for it and you own its disposal.

### NEST-123 — Durable providers

**Difficulty:** Staff

**Category:** Durable providers

**Question:**

What are durable providers, and what problem do they solve?

**Answer:**

With `durable: true` on a request-scoped provider, Nest reuses one instance for every request that maps to the same durable sub-tree (for example one tenant) instead of creating one per request. A custom `ContextIdStrategy` decides the mapping, which removes per-request DI cost in multi-tenant apps.

**Trade-offs:**

You trade the isolation of a fresh instance per request for lower overhead. The instance is now shared by all requests of that tenant.

**Follow-up:**

What must never be stored on a durable provider?

Answer: Request-specific data such as the current user or a request id, because concurrent requests of the same tenant share the instance.

### NEST-124 — Registering a durable provider

**Difficulty:** Staff

**Category:** Durable providers

**Question:**

How do you wire up a durable provider with a `ContextIdStrategy`?

**Answer:**

Mark the provider `@Injectable({ scope: Scope.REQUEST, durable: true })`. Implement `ContextIdStrategy.attach(contextId, request)` to return `{ resolve: (info) => info.isTreeDurable ? tenantSubTreeId : contextId, payload: { tenantId } }`, caching one sub-tree id per tenant. Register it once with `ContextIdFactory.apply(new TenantStrategy())` in `main.ts`.

**Follow-up:**

What does the injected `REQUEST` contain for a durable provider?

Answer: The `payload` returned from `attach()`, not the raw HTTP request, because the instance outlives any single request.

### NEST-125 — Circular provider dependencies

**Difficulty:** Senior

**Category:** Circular dependencies

**Question:**

What is a circular provider dependency, and how does `forwardRef()` address it?

**Answer:**

A needs B and B needs A, so one class is `undefined` while the other is being constructed. Use `@Inject(forwardRef(() => B)) private b: B` on both sides to defer resolution until both providers exist.

**Trade-offs:**

`forwardRef` is a quick fix that keeps tight coupling. Extracting shared logic or using events removes the cycle but needs a design change.

**Follow-up:**

Can you put `forwardRef` on only one side?

Answer: No. Both sides of the cycle need it; otherwise the side without it can still receive `undefined`.

### NEST-126 — Circular module imports

**Difficulty:** Senior

**Category:** Circular dependencies

**Question:**

How do you resolve circular imports between two modules?

**Answer:**

Use `forwardRef` in both modules: `imports: [forwardRef(() => CatsModule)]`. Separate from DI, circular TypeScript file imports can also leave a class `undefined` at decoration time.

**Follow-up:**

Which file-level pattern commonly causes accidental cycles?

Answer: Barrel files (`index.ts`) that re-export everything. Importing from a barrel inside the same feature can create a file-level cycle; import directly from the source file instead.

### NEST-127 — Alternatives to `forwardRef`

**Difficulty:** Senior

**Category:** Circular dependencies

**Question:**

What alternatives to `forwardRef` would you consider for a circular dependency?

**Answer:**

Extract the shared logic into a third service or module that both depend on, communicate through events (`EventEmitter2` or CQRS), merge tightly coupled providers, or look up one side lazily with `ModuleRef.get()`.

**Trade-offs:**

Events decouple modules but make control flow harder to trace. A shared third module is explicit, but adds another unit to maintain.

**Follow-up:**

Why treat a circular dependency as a design smell?

Answer: It usually means two units share responsibilities that belong in a third, and cycles make initialization order and testing fragile.

### NEST-128 — Debugging "can't resolve dependencies"

**Difficulty:** Senior

**Category:** Circular dependencies

**Question:**

How do you debug "Nest can't resolve dependencies of X (?)"?

**Answer:**

The `?` marks the failing parameter index. Check that the provider is in `providers`, that the owning module exports it and the consumer's module imports that module, that the `@Inject` token matches, that no circular import yields `undefined`, and that scopes are consistent.

**Follow-up:**

What tooling helps visualize the module graph?

Answer: Nest Devtools (`@nestjs/devtools-integration`) shows modules, providers, and their dependencies as a graph.

### NEST-129 — The `forRoot()` convention

**Difficulty:** Junior

**Category:** Dynamic modules

**Question:**

What is the `forRoot()` convention for dynamic modules?

**Answer:**

A static method returning a `DynamicModule` that configures the module once at the application root, for example `ConfigModule.forRoot({ isGlobal: true })` or `TypeOrmModule.forRoot(...)`.

**Follow-up:**

How does it differ from `register()`?

Answer: `register()` configures the module per importing module, so different consumers can have different options. `forRoot()` is meant for a single app-wide configuration.

### NEST-130 — `forRootAsync()`

**Difficulty:** Senior

**Category:** Dynamic modules

**Question:**

What is `forRootAsync()`, and why does it exist?

**Answer:**

It is the async variant of `forRoot` supporting `useFactory`, `useClass`, and `useExisting`, plus `imports` and `inject`. Options can then depend on other providers such as `ConfigService`: `forRootAsync({ imports: [ConfigModule], inject: [ConfigService], useFactory: (cfg) => ({ url: cfg.get('DB') }) })`.

**Follow-up:**

Why can't you just pass `ConfigService` values to `forRoot()`?

Answer: `forRoot()` runs when the module metadata is evaluated, before the DI container exists, so providers like `ConfigService` are not available yet.

### NEST-131 — `forFeature()`

**Difficulty:** Junior

**Category:** Dynamic modules

**Question:**

What does `forFeature()` conventionally do?

**Answer:**

It registers feature-scoped providers on top of a root configuration, such as `TypeOrmModule.forFeature([User])` creating the `User` repository or `MongooseModule.forFeature([...])` creating models.

**Follow-up:**

How do `forRoot` and `forFeature` usually split responsibility?

Answer: `forRoot` sets up the shared resource, like the connection, once. `forFeature` adds per-feature slices that use it.

### NEST-132 — `register` vs `forRoot` vs `forFeature`

**Difficulty:** Intermediate

**Category:** Dynamic modules

**Question:**

What naming conventions distinguish `register`, `forRoot`, and `forFeature` on dynamic modules?

**Answer:**

`register*` configures the module separately for each consumer, `forRoot*` configures it once app-wide, and `forFeature*` adds feature-specific providers. These are conventions, not enforced by Nest, and each has an `*Async` form.

**Follow-up:**

Which would you pick for an HTTP client module with different base URLs per feature?

Answer: `register()` (as with `HttpModule.register`), because each importing module needs its own options.

### NEST-133 — Shape of a `DynamicModule`

**Difficulty:** Senior

**Category:** Dynamic modules

**Question:**

What does a `DynamicModule` object contain, and how does it combine with `@Module()` metadata?

**Answer:**

It has a required `module` class and optional `imports`, `providers`, `controllers`, `exports`, and `global`. The dynamic metadata extends, not overrides, whatever the `@Module()` decorator already declares.

**Follow-up:**

How do you re-export a dynamic module from another module?

Answer: Export the module class itself, for example `exports: [DatabaseModule]`, not the `DatabaseModule.forRoot(...)` call.

### NEST-134 — `ConfigurableModuleBuilder`

**Difficulty:** Senior

**Category:** ConfigurableModuleBuilder

**Question:**

What does `ConfigurableModuleBuilder` generate, and why use it?

**Answer:**

`new ConfigurableModuleBuilder<Opts>().build()` returns `ConfigurableModuleClass`, `MODULE_OPTIONS_TOKEN`, `OPTIONS_TYPE`, and `ASYNC_OPTIONS_TYPE`. Your module extends the class and gets `register` and `registerAsync` (with `useFactory`, `useClass`, `useExisting`) without hand-written boilerplate.

**Follow-up:**

How does a service read the options?

Answer: Inject them with `@Inject(MODULE_OPTIONS_TOKEN) private options: typeof OPTIONS_TYPE`.

### NEST-135 — Customizing the builder

**Difficulty:** Senior

**Category:** ConfigurableModuleBuilder

**Question:**

How do you change the generated method names or add extra module-level options such as `isGlobal`?

**Answer:**

Use `.setClassMethodName('forRoot')` to get `forRoot`/`forRootAsync`, and `.setFactoryMethodName('createOptions')` to rename the factory method for `useClass`. `.setExtras({ isGlobal: false }, (def, extras) => ({ ...def, global: extras.isGlobal }))` adds options that shape the module definition rather than the injected options.

**Follow-up:**

Are extras part of `MODULE_OPTIONS_TOKEN`?

Answer: No. Extras only feed the transform function that builds the dynamic module and are excluded from the injected options.

### NEST-136 — Sync and async options with one token

**Difficulty:** Senior

**Category:** ConfigurableModuleBuilder

**Question:**

How does the builder-generated module support both `register()` and `registerAsync()` with a single injection token?

**Answer:**

Both paths provide `MODULE_OPTIONS_TOKEN`. `register({...})` registers a `useValue`; `registerAsync({ useFactory | useClass | useExisting, inject, imports })` registers a factory-based provider. Consumers inject the same token either way.

**Follow-up:**

Which types give you typed options in each case?

Answer: `typeof OPTIONS_TYPE` for sync options and `typeof ASYNC_OPTIONS_TYPE` for the async registration shape.

### NEST-137 — `exports`

**Difficulty:** Junior

**Category:** Exports and global modules

**Question:**

What does the `exports` array in `@Module()` do?

**Answer:**

It makes the module's providers, or re-exported modules, visible to any module that imports it. Providers are encapsulated by default, so non-exported providers stay private to their module.

**Follow-up:**

What exactly do you put in `exports`?

Answer: The provider token you registered (class, symbol, or string), not an instance.

### NEST-138 — Re-exporting modules

**Difficulty:** Intermediate

**Category:** Exports and global modules

**Question:**

Can a module re-export a module it imports, and why would you?

**Answer:**

Yes: `exports: [CommonModule]` passes through everything `CommonModule` exports to modules that import this one. It is used for shared or barrel modules such as `CoreModule`.

**Follow-up:**

Does re-exporting expose the inner module's private providers?

Answer: No. Only what the inner module itself exports is re-exported.

### NEST-139 — `@Global()` modules

**Difficulty:** Senior

**Category:** Exports and global modules

**Question:**

What does `@Global()` do, and when is it appropriate?

**Answer:**

A global module's exports are injectable everywhere without importing the module in each consumer. The module must still be imported once, usually in the root module. It fits cross-cutting infrastructure such as config, logging, or database access.

**Trade-offs:**

Global modules cut import boilerplate but hide dependencies and weaken encapsulation, so features appear to need nothing yet silently rely on the global.

**Follow-up:**

Is making every shared module global a good shortcut?

Answer: No. It makes the dependency graph implicit and harder to reason about and test. Keep `@Global()` for a small number of truly app-wide providers.

### NEST-140 — Global dynamic modules

**Difficulty:** Intermediate

**Category:** Exports and global modules

**Question:**

How do you make a dynamic module global?

**Answer:**

Return `global: true` in the `DynamicModule`, which is equivalent to `@Global()`. With `ConfigurableModuleBuilder`, expose it via `setExtras({ isGlobal })`, giving the familiar `ConfigModule.forRoot({ isGlobal: true })`.

**Follow-up:**

Where do you import a global module?

Answer: Once, typically in `AppModule`. After that its exports are available application-wide.

### NEST-141 — Provider visibility across modules

**Difficulty:** Senior

**Category:** Exports and global modules

**Question:**

How does Nest decide whether a provider is visible to a consumer in another module?

**Answer:**

A provider is injectable inside its declaring module and in any module that imports a module exporting it. Controllers and providers resolve dependencies from their own module's scope; global modules are the exception.

**Follow-up:**

What are the two most common causes of "can't resolve" across modules?

Answer: The providing module does not export the provider, or the consuming module does not import the providing module.

### NEST-142 — Overriding providers in tests

**Difficulty:** Senior

**Category:** Testing overrides

**Question:**

How do you replace a provider with a mock in an integration test?

**Answer:**

`Test.createTestingModule({ imports: [AppModule] }).overrideProvider(CatsService).useValue(mock).compile()`. You can also chain `.useClass(Fake)` or `.useFactory({ factory, inject })`.

**Follow-up:**

When must the override be declared?

Answer: Before `compile()`. The rest of the graph is real, so only the overridden token is replaced.

### NEST-143 — Overriding guards, modules, and global enhancers

**Difficulty:** Staff

**Category:** Testing overrides

**Question:**

Beyond providers, what can you override in a testing module, and how do you handle a global guard?

**Answer:**

`overrideGuard`, `overrideInterceptor`, `overridePipe`, and `overrideFilter` (each with `useValue`, `useClass`, or `useFactory`), plus `overrideModule(M).useModule(Fake)`. For a global guard, register `{ provide: APP_GUARD, useExisting: AuthGuard }` with `AuthGuard` as a normal provider, then override `AuthGuard`.

**Follow-up:**

Can you override a guard added with `app.useGlobalGuards(new G())`?

Answer: No. It is created outside DI, so the testing module has no token to replace; use the `APP_GUARD` provider approach instead.

### NEST-144 — Testing request-scoped providers

**Difficulty:** Senior

**Category:** Testing overrides

**Question:**

How do you obtain a request-scoped provider in a unit test?

**Answer:**

`get()` does not work for scoped providers; use `await moduleRef.resolve(Service)`, optionally with a `contextId`. To supply a fake request, call `moduleRef.registerRequestByContextId({ headers }, contextId)` before resolving.

**Follow-up:**

What error do you get if you call `get()` anyway?

Answer: Nest throws that the provider is marked as scoped and cannot be retrieved with `get()`, pointing you to `resolve()`.

### NEST-145 — DI in middleware

**Difficulty:** Senior

**Category:** Enhancers and lifecycle

**Question:**

How does dependency injection work for middleware?

**Answer:**

Class middleware implementing `NestMiddleware` is `@Injectable()` and receives constructor dependencies from its module when applied with `consumer.apply(LoggerMiddleware).forRoutes(...)`. Functional middleware has no DI.

**Follow-up:**

Does middleware registered with `app.use()` get DI?

Answer: No. `app.use()` registers a plain function or instance outside the container; use `consumer.apply()` in a module for DI.

### NEST-146 — Guards and `APP_GUARD`

**Difficulty:** Senior

**Category:** Enhancers and lifecycle

**Question:**

How do guards receive dependencies, and how do you make a global guard injectable?

**Answer:**

With `@UseGuards(AuthGuard)` Nest instantiates the guard in the module context, so constructor DI works. `app.useGlobalGuards(new G())` bypasses DI; instead register `{ provide: APP_GUARD, useClass: AuthGuard }` in any module.

**Follow-up:**

Do other enhancers have equivalent tokens?

Answer: Yes: `APP_INTERCEPTOR`, `APP_PIPE`, and `APP_FILTER`.

### NEST-147 — DI in interceptors, pipes, and filters

**Difficulty:** Senior

**Category:** Enhancers and lifecycle

**Question:**

How do interceptors, pipes, and exception filters use DI?

**Answer:**

When referenced by class in decorators they are instantiated by the container with dependencies from the declaring module. Instances created with `new X()` skip DI. Global versions need the `APP_*` provider tokens.

**Follow-up:**

What happens if an interceptor depends on a request-scoped provider?

Answer: The interceptor becomes request-scoped and is created for each request that uses it.

### NEST-148 — Scope of global enhancers

**Difficulty:** Staff

**Category:** Enhancers and lifecycle

**Question:**

How does scope affect `APP_GUARD`, `APP_INTERCEPTOR`, and similar global enhancers?

**Answer:**

If the enhancer provider is request-scoped, or depends on a request-scoped provider, Nest instantiates it per request. Otherwise it is a singleton.

**Trade-offs:**

Per-request access to context in a global guard is convenient, but it adds instantiation cost to every route, so it is better to read from the `ExecutionContext` or a singleton lookup.

**Follow-up:**

Does a request-scoped global guard make every controller request-scoped?

Answer: No. The guard is created per request, but controllers stay singletons unless they depend on request-scoped providers themselves.

### NEST-149 — Lifecycle hooks and scoped providers

**Difficulty:** Senior

**Category:** Enhancers and lifecycle

**Question:**

What lifecycle-hook caveat applies to request-scoped providers?

**Answer:**

`onModuleInit`, `onApplicationBootstrap`, and `onModuleDestroy` are not invoked for request-scoped providers, because those instances are not created during bootstrap. Do initialization in the constructor or an explicit method.

**Follow-up:**

Where do you release resources held by a request-scoped provider?

Answer: Call an explicit cleanup from the code that owns the request flow (for example an interceptor's `finalize`) or hook into the response `close` event, since no destroy hook runs.

### NEST-150 — `LazyModuleLoader`

**Difficulty:** Senior

**Category:** LazyModuleLoader

**Question:**

What is `LazyModuleLoader`, and what are its limitations?

**Answer:**

It loads a module on demand at runtime, which helps cold starts in serverless or for rarely used features: `const { LazyModule } = await import('./lazy.module'); const ref = await this.lazyModuleLoader.load(() => LazyModule); const svc = ref.get(LazyService);`. Controllers, gateways, and resolvers cannot be lazy-loaded, global enhancers from lazy modules are not applied, and lifecycle hooks are not invoked.

**Trade-offs:**

Lazy loading shortens startup but moves the module's initialization cost to its first use, so that first call is slower.

**Follow-up:**

Is the module loaded again on every `load()` call?

Answer: No. Nest caches the loaded module, so later calls return the existing `ModuleRef`.
