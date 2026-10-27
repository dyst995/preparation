# NEST03 — Dependency injection

NestJS 10, Express adapter unless a question says otherwise. Questions NEST-101–NEST-150.

Scopes, custom providers, tokens, `ModuleRef` and `ContextId`, durable providers, circular dependencies, dynamic modules, exports, test overrides, dependency injection in enhancers, and `LazyModuleLoader`. Request pipeline order is the previous file.


### NEST-101 — The DEFAULT provider scope

**Difficulty:** Junior

**Category:** Scopes

**Question:**

What is the default provider scope in NestJS, and what does that imply for how you write the class?

**Answer:**

`Scope.DEFAULT` means one shared instance. Nest creates that instance while the application is starting and hands the same object to every consumer, on every request, for the life of the process. It is the cheapest scope because nothing is constructed again per request. The class has to be safe to share, so fields must not hold data that belongs to one request, such as the current user or a request id. Pass that kind of data as a method argument, or choose a different scope on purpose.

**Follow-up:**

If a provider is exported and imported by five modules, how many instances exist?

Answer: One. A module boundary decides who may inject the provider, and every importer receives that same singleton.

### NEST-102 — Declaring a REQUEST-scoped provider

**Difficulty:** Junior

**Category:** Scopes

**Question:**

What is `Scope.REQUEST`, and how do you declare it on a class and on a custom provider?

**Answer:**

`Scope.REQUEST` means Nest creates a new instance for each incoming request and drops it when that request is finished. Declare it on the class with `@Injectable({ scope: Scope.REQUEST })`. On a custom provider, set the same field on the provider object: `{ provide: X, useClass: X, scope: Scope.REQUEST }`. Use it when the instance itself must remember something about this request, such as the tenant, the user, or a correlation id. A singleton that merely receives those values as method arguments does not need this scope.

**Follow-up:**

Is `onModuleInit` called for each request-scoped instance?

Answer: No. Lifecycle hooks run for instances created at startup. A request-scoped instance does not exist yet, so put per-instance setup in the constructor or in a method you call yourself.

### NEST-103 — TRANSIENT scope

**Difficulty:** Junior

**Category:** Scopes

**Question:**

What is `Scope.TRANSIENT`, and how does it differ from `Scope.REQUEST`?

**Answer:**

`Scope.TRANSIENT` gives each consumer its own private instance of the provider. The instance is not tied to an HTTP request. If a singleton injects a transient logger, Nest creates that logger once, when the singleton is created, and the singleton holds it until the application shuts down. A second singleton gets a second logger. The usual reason is a logger that stores the consumer's class name as its context. Unlike request scope, transient scope does not follow the request and does not force the consumer to become request-scoped.

**Follow-up:**

Is a transient instance created again on every method call?

Answer: No. It is created once for that consumer and then stays stable for the consumer's lifetime.

### NEST-104 — Scope bubbling

**Difficulty:** Senior

**Category:** Scopes

**Question:**

Explain scope bubbling. What happens to a controller that injects a request-scoped service, and how does transient scope behave differently?

**Answer:**

Request scope travels up the injection chain. If a provider or a controller depends on a request-scoped provider, directly or through another provider, Nest treats that consumer as request-scoped too and constructs it again for each request. Otherwise one singleton would hold a service that is supposed to change per request. Transient scope does not travel up. A singleton that injects a transient provider stays a singleton and simply keeps its own dedicated instance. The bubble is why a small request-scoped leaf can change the cost of a large part of the graph.

**Follow-up:**

Why can one small request-scoped service be dangerous in a large application?

Answer: Every provider that depends on it, directly or through other providers, is created again per request. A leaf injected into a core service can quietly make most of the graph request-scoped.

### NEST-105 — Making a controller request-scoped

**Difficulty:** Intermediate

**Category:** Scopes

**Question:**

How can a controller end up request-scoped, and what else in the pipeline is affected?

**Answer:**

A controller becomes request-scoped in two ways. It happens implicitly when the controller injects a request-scoped provider, because request scope bubbles up to the controller. It happens explicitly when you set the scope on the controller itself: `@Controller({ path: 'cats', scope: Scope.REQUEST })`. In both cases Nest constructs a new controller instance for each request, and that instance's injected subtree is built with it. The route registration does not change. What changes is that the object handling the route is no longer the one singleton created at startup.

**Follow-up:**

Do guards, interceptors, and pipes follow the same rule?

Answer: Yes. An enhancer that depends on a request-scoped provider is instantiated per request as well.

### NEST-106 — Performance cost of request scope

**Difficulty:** Senior

**Category:** Scopes

**Question:**

What is the performance cost of request-scoped providers, and how do you reduce it?

**Answer:**

On every request Nest walks the request-scoped part of the graph and constructs it. That adds latency, allocations, and garbage-collection pressure, and the cost grows with the size of the bubbled subtree rather than with the one class you marked. Keep that subtree small. Do not inject a request-scoped leaf into a large shared service. Pass per-request data as a method argument where you can. When many services only need to read the same request context, `AsyncLocalStorage` (for example `nestjs-cls`) or a durable provider avoids rebuilding the whole graph.

**Trade-offs:**

Request scope makes per-request state explicit in the constructor, which is easy to test and expensive under load. Async local storage keeps the services as singletons and makes the context implicit, so tests have to set it up.

**Follow-up:**

What is your default scope, and when do you leave it?

Answer: Singleton. Use request scope only when the instance itself must hold per-request state that you cannot pass as an argument or keep in async local storage.

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

### NEST-108 — useClass

**Difficulty:** Junior

**Category:** Custom providers

**Question:**

What does `useClass` do in a custom provider, and when is it useful?

**Answer:**

`useClass` tells Nest which class to construct when someone injects a token. You write `{ provide: TOKEN, useClass: Impl }`. Nest instantiates `Impl` through the normal path, so `Impl`'s own constructor dependencies are injected too. The useful case is swapping the implementation behind a stable token, for example `useClass: isProd ? SmtpMailer : FakeMailer`. Callers depend on `TOKEN`. They do not need to change when the class behind it changes.

**Follow-up:**

Are the class's constructor dependencies still injected?

Answer: Yes. `useClass` uses the same instantiation path as a provider listed by its class, so `Impl` resolves its dependencies normally.

### NEST-109 — useValue

**Difficulty:** Junior

**Category:** Custom providers

**Question:**

What does `useValue` do, and what is it typically used for?

**Answer:**

`useValue` binds a token to an object you already have. Nest does not construct it and does not inject anything into it. `{ provide: 'CONFIG', useValue: { retries: 3 } }` is the usual shape. It fits a constant, a configuration object, or a mock you built in a test. Because the value is stored as-is, every consumer receives that same reference for the life of the process.

**Follow-up:**

What risk comes from sharing a `useValue` object?

Answer: Mutation is shared. If one consumer changes a field, every other consumer sees the change. Freeze the object, or treat it as read-only.

### NEST-110 — useFactory and inject

**Difficulty:** Senior

**Category:** Custom providers

**Question:**

How does `useFactory` work, and how do you give the factory its dependencies?

**Answer:**

`useFactory` is a function Nest calls to produce the provider. Dependencies are listed separately in `inject`, in the same order as the function's parameters, because a factory function has no class metadata for Nest to read. A typical registration is `{ provide: DB, useFactory: (cfg: ConfigService) => new Client(cfg.get('DB_URL')), inject: [ConfigService] }`. The function may return a value or a Promise. Use it when creation is conditional, or when you are wrapping a third-party client that is not an `@Injectable()` class.

**Follow-up:**

What happens if you forget `inject`, and how do you mark a dependency optional?

Answer: The factory parameters are `undefined`. Mark one dependency optional with `inject: [{ token: X, optional: true }]`.

### NEST-111 — useExisting

**Difficulty:** Junior

**Category:** Custom providers

**Question:**

What does `useExisting` do, and how does it differ from `useClass`?

**Answer:**

`useExisting` creates an alias. `{ provide: 'AliasedService', useExisting: RealService }` means a lookup of `AliasedService` returns the same instance Nest already created for `RealService`. Nothing new is constructed. `useClass: RealService` would construct a second instance, with its own state and its own connections. The alias is how you expose one provider under a second token, often so a library token and your concrete class stay in sync.

**Follow-up:**

What breaks if you write `useClass: RealService` where you meant `useExisting`?

Answer: Two instances exist. State, caches, and connections are no longer shared between the two tokens.

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

### NEST-113 — Injection tokens

**Difficulty:** Intermediate

**Category:** Tokens and injection

**Question:**

What can be used as an injection token, and when do you need `@Inject()`?

**Answer:**

A token is a class, a string, or a symbol. Nest matches the token a consumer asks for with the token a provider registered. A class parameter usually needs no `@Inject()`, because with `emitDecoratorMetadata` TypeScript records the class as `design:paramtypes` and Nest reads that list. A string or a symbol has no runtime type, so the parameter must be marked `@Inject(TOKEN)`. An explicit `@Inject()` also wins when you want a different token than the emitted class.

**Follow-up:**

Why prefer an exported constant or a symbol over a string written at each injection site?

Answer: One exported token prevents typos and collisions between modules, and it gives you a single place to find every usage.

### NEST-114 — Injecting an interface

**Difficulty:** Senior

**Category:** Tokens and injection

**Question:**

How do you inject something typed as an interface, and why can you not use the interface itself as the token?

**Answer:**

A TypeScript interface is erased when the code is compiled. With `emitDecoratorMetadata`, the emitted type for an interface parameter is `Object`, so Nest cannot tell which provider you meant. Define a token, register the implementation against it with `{ provide: MAILER, useClass: SmtpMailer }`, and inject with `@Inject(MAILER) private readonly mailer: IMailer`. The interface remains the compile-time type. The token is what exists at runtime. Callers stay decoupled from `SmtpMailer`.

**Trade-offs:**

A symbol plus an interface stays a light contract, and every injection site needs `@Inject()`. An abstract class can be both the type and the token, so `@Inject()` is unnecessary, at the cost of a real runtime class.

**Follow-up:**

Can an abstract class replace the token?

Answer: Yes. Register `{ provide: AbstractMailer, useClass: SmtpMailer }` and type the constructor parameter as `AbstractMailer`.

### NEST-115 — Constructor vs property injection

**Difficulty:** Intermediate

**Category:** Tokens and injection

**Question:**

When would you use property injection instead of constructor injection?

**Answer:**

Constructor injection is the default. The dependencies are visible, the fields can be `readonly`, and a unit test can pass them to `new`. Property injection assigns the dependency to a field after the object is constructed: `@Inject(TOKEN) private dep: Dep`. It is useful when a subclass extends a provider and you do not want to thread every base dependency through `super(...)`. The dependency is not available inside the constructor, because Nest assigns properties only after construction finishes.

**Trade-offs:**

Property injection hides the dependency from the constructor signature. A unit test that does `new Subclass()` then has to remember that the field is still unset.

**Follow-up:**

Is a property-injected dependency available inside the constructor?

Answer: No. Properties are assigned after the constructor returns. Use them in methods or in lifecycle hooks.

### NEST-116 — @Optional()

**Difficulty:** Junior

**Category:** Tokens and injection

**Question:**

What does `@Optional()` do on a constructor parameter?

**Answer:**

`@Optional()` tells Nest that a missing provider is allowed. If nothing is registered for that token, Nest injects `undefined` instead of failing startup. The usual form is `constructor(@Optional() @Inject('HTTP_OPTIONS') private readonly opts?: Opts) {}`. It belongs in library code, where the host application might not supply a configuration object. Your class then has to handle `undefined`. It does not make a required application service optional just to hide a wiring mistake.

**Follow-up:**

Does `@Optional()` also swallow an error thrown while the provider is being created?

Answer: No. It only covers a token that was never registered. If the provider exists and its factory throws, startup still fails.

### NEST-117 — Defaults with @Optional()

**Difficulty:** Intermediate

**Category:** Tokens and injection

**Question:**

How do you provide a default value when an optional dependency is absent?

**Answer:**

You can fall back at the use site: `this.opts = opts ?? DEFAULTS`, or give the constructor parameter a default value. You can also register a default provider inside a dynamic module, and let the host replace that provider when it wants different options. The class-level fallback is local and easy to miss. The module-level default is visible in the module definition, and a test or a host application can override the token through dependency injection instead of editing the class.

**Follow-up:**

Which approach is safer for a reusable library?

Answer: Register the default provider in the module. The fallback is visible in the module definition and can be replaced through dependency injection.

### NEST-118 — ModuleRef.get()

**Difficulty:** Intermediate

**Category:** ModuleRef and ContextId

**Question:**

What does `ModuleRef.get()` return, and what does the `strict` option control?

**Answer:**

`ModuleRef.get()` synchronously returns a provider that already exists as a singleton: `this.moduleRef.get(Service)`. It does not create a request-scoped or transient instance. `strict` defaults to `true`, which limits the lookup to the module that owns this `ModuleRef`. Pass `{ strict: false }` when the provider lives in another module and you intentionally want an application-wide search. Strict mode is the safer default, because a wide search can hide a missing import.

**Follow-up:**

What happens if you call `get()` on a request-scoped or transient provider?

Answer: Nest throws and tells you the provider is scoped. Use `ModuleRef.resolve()` for those.

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

### NEST-121 — Reusing the request's context

**Difficulty:** Senior

**Category:** ModuleRef and ContextId

**Question:**

How do you reuse the current request's dependency-injection context when you call `resolve()` yourself?

**Answer:**

Take the id Nest already attached to this request with `ContextIdFactory.getByRequest(request)`, then pass it to `moduleRef.resolve(Svc, contextId)`. Scoped providers resolved with that id are the same instances the rest of this request is using. If something in that sub-tree injects `REQUEST`, also call `moduleRef.registerRequestByContextId(request, contextId)` so the request object is registered for that id. Skipping the resolve-time id and calling `resolve()` with a fresh id builds a second, unrelated sub-tree.

**Follow-up:**

What is injected as `REQUEST` if you skip `registerRequestByContextId` on a context you created yourself?

Answer: `undefined`. A manually created context has no request object until you register one.

### NEST-122 — ModuleRef.create()

**Difficulty:** Senior

**Category:** ModuleRef and ContextId

**Question:**

What does `ModuleRef.create()` do, and when would you use it?

**Answer:**

`ModuleRef.create()` constructs a class through dependency injection without registering that class as a provider. `const inst = await moduleRef.create(MyClass)` resolves the constructor's dependencies from the module and returns the instance. It fits a plugin or a strategy that you choose at runtime, when the class is not known at module-definition time. The instance is not part of the module graph. Nest will not call its lifecycle hooks, and disposal is yours.

**Follow-up:**

Does Nest manage the lifecycle of the instance `create()` returned?

Answer: No. The class is outside the module graph, so lifecycle hooks are not called for it and you own disposal.

### NEST-123 — Durable providers

**Difficulty:** Staff

**Category:** Durable providers

**Question:**

What are durable providers, and what problem do they solve?

**Answer:**

A durable provider is request-scoped and marked `durable: true`. Nest does not build a new instance for every request. It reuses one instance for every request that your strategy maps onto the same sub-tree, typically one tenant. A `ContextIdStrategy` performs that mapping. Multi-tenant applications use this when a per-tenant cache or connection would be far too expensive to rebuild on every request, and a single process-wide singleton would mix tenants. The instance is shared by concurrent requests of that tenant.

**Trade-offs:**

You give up the isolation of a fresh instance per request and gain a much smaller construction cost. Anything stored on the instance is visible to every request in that tenant.

**Follow-up:**

What must never be stored on a durable provider?

Answer: Data that belongs to one request, such as the current user or a request id. Concurrent requests of the same tenant share the instance.

### NEST-124 — Registering a durable provider

**Difficulty:** Staff

**Category:** Durable providers

**Question:**

How do you register a durable provider and a `ContextIdStrategy`?

**Answer:**

Mark the class with `@Injectable({ scope: Scope.REQUEST, durable: true })`. Implement `ContextIdStrategy.attach(contextId, request)` so it returns a `resolve` function and a `payload`. `resolve` receives info about the provider being looked up. When `info.isTreeDurable` is true, return the sub-tree id you cached for that tenant. Otherwise return the per-request `contextId`. Register the strategy once, before the application handles traffic, with `ContextIdFactory.apply(new TenantStrategy())` in `main.ts`.

**Follow-up:**

What does the injected `REQUEST` contain for a durable provider?

Answer: The `payload` returned from `attach()`, not the raw HTTP request. The instance outlives any single request, so Nest will not inject one request object into it.

### NEST-125 — Circular provider dependencies

**Difficulty:** Senior

**Category:** Circular dependencies

**Question:**

What is a circular provider dependency, and how does `forwardRef()` address it?

**Answer:**

A circular provider dependency means A needs B in its constructor and B needs A. While the first class is being constructed, the other class can still be `undefined`, because JavaScript has not finished evaluating the module. `forwardRef` delays reading the class until both providers exist: `@Inject(forwardRef(() => B)) private readonly b: B`. Nest then resolves the pair after both registrations are in the container. The cycle still couples the two classes. `forwardRef` only makes construction possible.

**Trade-offs:**

`forwardRef` is a small change and leaves the coupling in place. Extracting the shared work, or publishing an event, removes the cycle and requires a design change.

**Follow-up:**

Can you put `forwardRef` on only one side of the cycle?

Answer: No. Both sides need it. The side without it can still receive `undefined`.

### NEST-126 — Circular module imports

**Difficulty:** Senior

**Category:** Circular dependencies

**Question:**

How do you resolve a circular import between two modules?

**Answer:**

Wrap each side's import in `forwardRef`: `imports: [forwardRef(() => CatsModule)]` in one module and the same pattern pointing back from the other. Nest then finishes registering both modules before it wires the imports. That is separate from a cycle between files. If two TypeScript files import each other, the class can be `undefined` at the moment a decorator runs, and `forwardRef` in `@Module()` does not fix a class that was never initialized.

**Follow-up:**

Which file-level pattern commonly creates an accidental cycle?

Answer: A barrel file, `index.ts`, that re-exports everything in the feature. Importing that barrel from inside the same feature can cycle. Import the source file directly.

### NEST-127 — Alternatives to forwardRef

**Difficulty:** Senior

**Category:** Circular dependencies

**Question:**

What alternatives to `forwardRef` would you consider for a circular dependency?

**Answer:**

Move the shared behavior into a third provider or module that both sides depend on, so the arrow points one way. Or stop calling each other and publish an event through `EventEmitter2` or a CQRS bus. If the two classes are always used together, merge them. A last resort is to inject `ModuleRef` and call `get()` at the moment you need the other side, so the constructor does not require it. Each option removes the cycle from construction. The right one depends on whether the two sides actually need a direct call.

**Trade-offs:**

Events remove the constructor cycle and make the flow harder to follow in a debugger. A third module is explicit and adds another unit to maintain.

**Follow-up:**

Why treat a circular dependency as a design smell?

Answer: It usually means two units share a responsibility that belongs in a third. Cycles also make initialization order and tests fragile.

### NEST-128 — Debugging "can't resolve dependencies"

**Difficulty:** Senior

**Category:** Circular dependencies

**Question:**

How do you debug Nest's "can't resolve dependencies of X (?)" error?

**Answer:**

The `?` is the constructor parameter Nest could not resolve, counted from the left. Check that parameter's token in order. The class or custom provider must appear in some `providers` array. If it is provided by another module, that module must export it and this module must import that module. The `@Inject()` token must be the same value that was registered. A circular file import can make the token `undefined` at decoration time. A request-scoped dependency also changes the consumer's scope, which is worth confirming when the graph is large.

**Follow-up:**

What tooling shows the module graph?

Answer: Nest Devtools, through `@nestjs/devtools-integration`, draws modules, providers, and their dependencies as a graph.

### NEST-129 — The forRoot() convention

**Difficulty:** Junior

**Category:** Dynamic modules

**Question:**

What is the `forRoot()` convention for dynamic modules?

**Answer:**

`forRoot()` is a static method that returns a `DynamicModule` and is called once from the application root. `ConfigModule.forRoot({ isGlobal: true })` and `TypeOrmModule.forRoot(...)` are the familiar examples. The method closes over the options and registers the providers those options imply. The name is a convention, not a Nest feature. It tells the next reader that this configuration is application-wide and should appear in one place, usually `AppModule`.

**Follow-up:**

How does `forRoot()` differ from `register()`?

Answer: `register()` is meant to be called by each feature that imports the module, so those features can pass different options. `forRoot()` is meant to run once for the whole application.

### NEST-130 — forRootAsync()

**Difficulty:** Senior

**Category:** Dynamic modules

**Question:**

What is `forRootAsync()`, and why does it exist?

**Answer:**

`forRootAsync()` is the form of `forRoot()` that can wait for other providers. It accepts `useFactory`, `useClass`, or `useExisting`, plus `imports` and `inject`, and returns a dynamic module whose options provider is async. A factory can then read `ConfigService`: `forRootAsync({ imports: [ConfigModule], inject: [ConfigService], useFactory: (cfg) => ({ url: cfg.get('DB') }) })`. It exists because the options are often not known as literals in `AppModule`. They come from the environment through a provider that Nest has to construct first.

**Follow-up:**

Why can you not pass `ConfigService` values into the synchronous `forRoot()`?

Answer: `forRoot()` runs while the module metadata is being evaluated, before the container has created any providers. `ConfigService` does not exist yet.

### NEST-131 — forFeature()

**Difficulty:** Junior

**Category:** Dynamic modules

**Question:**

What does `forFeature()` conventionally do?

**Answer:**

`forFeature()` registers the providers a single feature needs on top of a connection or client that `forRoot()` already configured. `TypeOrmModule.forFeature([User])` creates the `User` repository provider. `MongooseModule.forFeature([...])` does the same for models. The feature module imports that dynamic module and injects the repository. It does not open another database connection. The split keeps connection setup in one root module and lets each feature declare only the entities it uses.

**Follow-up:**

How do `forRoot` and `forFeature` usually split the work?

Answer: `forRoot` creates the shared resource, such as the connection, once. `forFeature` adds the per-feature pieces that use it.

### NEST-132 — register vs forRoot vs forFeature

**Difficulty:** Intermediate

**Category:** Dynamic modules

**Question:**

What naming conventions distinguish `register`, `forRoot`, and `forFeature` on a dynamic module?

**Answer:**

These names are conventions Nest does not enforce. `register` and `registerAsync` mean each importing module can pass its own options. `forRoot` and `forRootAsync` mean the module is configured once for the application. `forFeature` and `forFeatureAsync` mean "add the providers this feature needs," usually after a root configuration. The `Async` suffix means the options come from `useFactory`, `useClass`, or `useExisting` rather than from a literal object. Pick the name that matches how many times the method should be called.

**Follow-up:**

Which would you pick for an HTTP client used with a different base URL in each feature?

Answer: `register()`, the same idea as `HttpModule.register`. Each importing module needs its own options.

### NEST-133 — Shape of a DynamicModule

**Difficulty:** Senior

**Category:** Dynamic modules

**Question:**

What does a `DynamicModule` object contain, and how does it combine with the metadata already on `@Module()`?

**Answer:**

A `DynamicModule` must include `module`, the module class, and it may include `imports`, `providers`, `controllers`, `exports`, and `global`. Nest merges that object with the metadata already declared by `@Module()` on the class. The dynamic fields extend the static ones. They do not wipe them out. A provider listed on the class and a provider returned from `forRoot()` are both registered. `global: true` is the dynamic equivalent of `@Global()`.

**Follow-up:**

How do you re-export a dynamic module from another module?

Answer: Put the module class in `exports`, for example `exports: [DatabaseModule]`. Do not call `DatabaseModule.forRoot(...)` again in the exports array.

### NEST-134 — ConfigurableModuleBuilder

**Difficulty:** Senior

**Category:** ConfigurableModuleBuilder

**Question:**

What does `ConfigurableModuleBuilder` generate, and why would you use it?

**Answer:**

`ConfigurableModuleBuilder` writes the dynamic-module boilerplate for you. `new ConfigurableModuleBuilder<Options>().build()` returns a `ConfigurableModuleClass`, a `MODULE_OPTIONS_TOKEN`, and the types `OPTIONS_TYPE` and `ASYNC_OPTIONS_TYPE`. Your module class extends `ConfigurableModuleClass`. Callers then get `register` and `registerAsync`, including `useFactory`, `useClass`, and `useExisting`, without you hand-writing those methods. Use it when you are publishing a module that other applications configure. The builder keeps the options token and the method names consistent.

**Follow-up:**

How does a service read the options the caller passed?

Answer: Inject the generated token: `@Inject(MODULE_OPTIONS_TOKEN) private readonly options: typeof OPTIONS_TYPE`.

### NEST-135 — Customizing the builder

**Difficulty:** Senior

**Category:** ConfigurableModuleBuilder

**Question:**

How do you change the generated method names, or add an extra module-level option such as `isGlobal`?

**Answer:**

`.setClassMethodName('forRoot')` renames the generated methods to `forRoot` and `forRootAsync`. `.setFactoryMethodName('createOptions')` renames the method `useClass` will call when building options. `.setExtras({ isGlobal: false }, (definition, extras) => ({ ...definition, global: extras.isGlobal }))` adds fields that change the module definition itself. `isGlobal` is a common extra because it belongs on the dynamic module, as `global: true`, and not inside the options object your service injects.

**Follow-up:**

Are extras part of `MODULE_OPTIONS_TOKEN`?

Answer: No. Extras are passed only to the transform that builds the dynamic module. They are left out of the injected options.

### NEST-136 — Sync and async options with one token

**Difficulty:** Senior

**Category:** ConfigurableModuleBuilder

**Question:**

How does a module generated by the builder support both `register()` and `registerAsync()` with a single injection token?

**Answer:**

Both methods provide the same `MODULE_OPTIONS_TOKEN`. `register({ ... })` registers that token with `useValue` set to the object the caller passed. `registerAsync({ useFactory, useClass, or useExisting, plus inject and imports })` registers a factory-based provider for the same token and awaits it during startup. A service injects `MODULE_OPTIONS_TOKEN` and does not care which method the host used. That is why one constructor works for both the sync and the async setup.

**Follow-up:**

Which types describe the options in each case?

Answer: `typeof OPTIONS_TYPE` is the synchronous options object. `typeof ASYNC_OPTIONS_TYPE` is the shape of the async registration, not the resolved options.

### NEST-137 — exports

**Difficulty:** Junior

**Category:** Exports and global modules

**Question:**

What does the `exports` array in `@Module()` do?

**Answer:**

Providers are private to the module that declares them. `exports` is the public list. Anything you name there, a provider token or a module you are re-exporting, becomes injectable in modules that import this one. A provider that is not exported can still be injected by controllers and providers inside its own module. It stays invisible outside. Export the token you registered, the class, symbol, or string, rather than an instance you constructed yourself.

**Follow-up:**

What exactly do you put in `exports`?

Answer: The provider token you registered, a class, a symbol, or a string. Not an instance.

### NEST-138 — Re-exporting modules

**Difficulty:** Intermediate

**Category:** Exports and global modules

**Question:**

Can a module re-export another module it imports, and why would you?

**Answer:**

Yes. `exports: [CommonModule]` forwards everything `CommonModule` exports to any module that imports yours. Your module does not have to re-list those providers. This is how a shared module such as `CoreModule` gathers logging, config, and similar imports and presents them as one import. The consumer depends on `CoreModule`. It does not need to know which inner module provided each token.

**Follow-up:**

Does re-exporting expose providers that the inner module kept private?

Answer: No. Only the tokens the inner module itself exports are forwarded.

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

### NEST-140 — Global dynamic modules

**Difficulty:** Intermediate

**Category:** Exports and global modules

**Question:**

How do you make a dynamic module global?

**Answer:**

Return `global: true` on the `DynamicModule`. That flag is the dynamic form of `@Global()`. With `ConfigurableModuleBuilder`, you usually expose it through `setExtras`, so the caller writes `ConfigModule.forRoot({ isGlobal: true })` and the extras transform copies that flag onto the module definition. The module is still imported once. After that, its exports can be injected anywhere without another import.

**Follow-up:**

Where do you import a global module?

Answer: Once, typically in `AppModule`. After that import, its exports are available across the application.

### NEST-141 — Provider visibility across modules

**Difficulty:** Senior

**Category:** Exports and global modules

**Question:**

How does Nest decide whether a provider is visible to a consumer in another module?

**Answer:**

A provider is visible in the module that declares it. It is also visible in a module that imports some module which exports that provider. Controllers and providers look up dependencies in their own module's context, so a provider that exists somewhere else in the process is still invisible until that chain is in place. `@Global()` is the exception: after the global module is imported once, its exports skip the per-module import. Visibility is about the module graph, not about whether the class file was imported in TypeScript.

**Follow-up:**

What are the two most common causes of "can't resolve dependencies" across modules?

Answer: The providing module never exported the token, or the consuming module never imported the providing module.

### NEST-142 — Overriding providers in tests

**Difficulty:** Senior

**Category:** Testing overrides

**Question:**

How do you replace a provider with a mock in an integration test?

**Answer:**

Build the testing module, override the token, and compile: `Test.createTestingModule({ imports: [AppModule] }).overrideProvider(CatsService).useValue(mock).compile()`. The same override accepts `.useClass(Fake)` or `.useFactory({ factory, inject })` when the fake needs real dependencies. The rest of the graph is the real application. Only that token is replaced, wherever it was provided. The override has to be registered before `compile()`, because compile is when Nest builds the container.

**Follow-up:**

When must the override be declared?

Answer: Before `compile()`. After that the container is already built. Everything except the overridden token stays real.

### NEST-143 — Overriding guards and modules

**Difficulty:** Staff

**Category:** Testing overrides

**Question:**

Beyond providers, what can a testing module override, and how do you replace a global guard?

**Answer:**

`overrideGuard`, `overrideInterceptor`, `overridePipe`, and `overrideFilter` each accept `useValue`, `useClass`, or `useFactory`. `overrideModule(RealModule).useModule(FakeModule)` swaps a whole module. A global guard is harder, because `APP_GUARD` is the token Nest actually registered. Provide `{ provide: APP_GUARD, useExisting: AuthGuard }` and list `AuthGuard` as a normal provider, then `overrideProvider(AuthGuard)`. Overriding the class replaces the instance the global token points at.

**Follow-up:**

Can you override a guard that was added with `app.useGlobalGuards(new Guard())`?

Answer: No. That instance was created outside the container, so the testing module has no token to replace. Register `APP_GUARD` instead.

### NEST-144 — Testing request-scoped providers

**Difficulty:** Senior

**Category:** Testing overrides

**Question:**

How do you obtain a request-scoped provider inside a unit test?

**Answer:**

`moduleRef.get()` only returns singletons, so a request-scoped provider has to be loaded with `await moduleRef.resolve(Service)`. Pass a `ContextId` when several resolves must share one sub-tree. If the provider injects `REQUEST`, create an id, register a fake request with `moduleRef.registerRequestByContextId({ headers }, contextId)`, and then resolve with that id. The fake request is what `@Inject(REQUEST)` receives. Without it, a context you created yourself has no request object.

**Follow-up:**

What error do you get if you call `get()` anyway?

Answer: Nest throws that the provider is marked as scoped and cannot be retrieved with `get()`, and it points you at `resolve()`.

### NEST-145 — Dependency injection in middleware

**Difficulty:** Senior

**Category:** Enhancers and lifecycle

**Question:**

How does dependency injection work for middleware?

**Answer:**

Class middleware that implements `NestMiddleware` is marked `@Injectable()`. When a module applies it with `consumer.apply(LoggerMiddleware).forRoutes(...)`, Nest constructs it from that module's injector, so constructor dependencies are resolved the same way as any other provider. The module that calls `apply` must be able to see those dependencies, which means it provides them or imports a module that exports them. A function passed to `apply` has no constructor, so it receives no injection. It can close over a service that `configure` already injected.

**Follow-up:**

Does middleware registered with `app.use()` get dependency injection?

Answer: No. `app.use()` registers a function or an instance you already constructed, outside the container. Use `consumer.apply()` when the middleware needs injection.

### NEST-146 — Guards and APP_GUARD

**Difficulty:** Senior

**Category:** Enhancers and lifecycle

**Question:**

How do guards receive their dependencies, and how do you register a global guard that still gets dependency injection?

**Answer:**

`@UseGuards(AuthGuard)` passes the class. Nest instantiates that class in the module that declared the controller or the method, so constructor injection works, including `Reflector`. `app.useGlobalGuards(new AuthGuard())` passes an instance you built, and that instance never enters the container. To keep a global guard injectable, register `{ provide: APP_GUARD, useClass: AuthGuard }` in any module. Nest constructs it during startup and runs it for every route.

**Follow-up:**

Do interceptors, pipes, and exception filters have the same kind of token?

Answer: Yes. The tokens are `APP_INTERCEPTOR`, `APP_PIPE`, and `APP_FILTER`.

### NEST-147 — Dependency injection in interceptors, pipes, and filters

**Difficulty:** Senior

**Category:** Enhancers and lifecycle

**Question:**

How do interceptors, pipes, and exception filters receive dependencies?

**Answer:**

When a decorator names the class, `@UseInterceptors(LoggingInterceptor)` and the equivalent for pipes and filters, Nest constructs that class from the module that declared the controller. Constructor dependencies are resolved there. An object you pass in, or an instance you create with `new`, is used as-is and receives nothing. The same split applies globally. `APP_INTERCEPTOR`, `APP_PIPE`, and `APP_FILTER` are constructed by the container. `useGlobalInterceptors(new LoggingInterceptor())` and its pipe and filter equivalents are not.

**Follow-up:**

What happens if an interceptor depends on a request-scoped provider?

Answer: The interceptor becomes request-scoped and is created again for each request that uses it.

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

### NEST-149 — Lifecycle hooks and scoped providers

**Difficulty:** Senior

**Category:** Enhancers and lifecycle

**Question:**

Which lifecycle hooks run for a request-scoped provider, and which do not?

**Answer:**

`onModuleInit`, `onApplicationBootstrap`, and `onModuleDestroy` run for providers Nest creates while the application is starting and shutting down. A request-scoped instance does not exist at startup, so those hooks are not called on it, and there is no per-request destroy hook either. Put work that must happen for each instance in the constructor, or in a method the owner of the request calls. A singleton that collaborates with request-scoped services can still use the normal hooks, because the singleton itself is created at startup.

**Follow-up:**

Where do you release a resource held by a request-scoped provider?

Answer: Call a cleanup method from the code that owns the request, such as an interceptor's `finalize`, or listen for the response `close` event. No destroy hook runs for that instance.

### NEST-150 — LazyModuleLoader

**Difficulty:** Senior

**Category:** LazyModuleLoader

**Question:**

What is `LazyModuleLoader`, and what can it not do?

**Answer:**

`LazyModuleLoader` loads a module when you ask, instead of during bootstrap. That shortens a cold start in serverless, or defers a feature that most requests never touch. The call is `const { LazyModule } = await import('./lazy.module')`, then `const ref = await this.loader.load(() => LazyModule)`, then `ref.get(LazyService)`. Controllers, gateways, and resolvers inside the lazy module are not registered as entry points. Global enhancers from that module are not applied. Lifecycle hooks on its providers are not invoked. You get a `ModuleRef` and the providers you can look up from it.

**Trade-offs:**

Startup gets shorter, and the first call pays the initialization cost that bootstrap would have paid. That first call is slower than the ones after it.

**Follow-up:**

Is the module loaded again on every `load()` call?

Answer: No. Nest caches the loaded module. Later calls return the existing `ModuleRef`.
