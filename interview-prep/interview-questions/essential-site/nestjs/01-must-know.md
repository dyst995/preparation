# Essential NestJS — Must Know

3-day essential set. 40 questions in preparation order. Full handbook remains under `nestjs/`.

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

### NEST-051 — The order one HTTP request walks

**Difficulty:** Intermediate

**Category:** Lifecycle

**Question:**

A `GET` has module middleware, a global guard, a route interceptor, a parameter pipe, and a global exception filter. The method returns a plain object and nothing throws. What runs, in what order, and what is skipped?

**Answer:**

One HTTP request walks a fixed pipeline, and each stage has one job. Express middleware runs first, then guards. Each interceptor then runs the code placed before `next.handle()`. Pipes run next, and only then the controller method. After the method returns, interceptor operators on the way out run in reverse: the route interceptor, then the controller interceptor, then the global one. Nest writes the response after that. Nothing threw, so exception filters stay idle. There is no separate service stage. A service runs only because the controller calls it.

**Trade-offs:**

One Express middleware can stamp a header, but it cannot see the handler. Separate guards, pipes, and interceptors keep allow-or-deny, conversion, and response shape easy to read.

**Follow-up:**

The same request throws inside the controller. Which stages still ran?

Answer: Middleware, guards, the inbound interceptor code, and the pipes already finished. The outbound `map` does not receive a value, and if the interceptor rethrows or has no `catchError`, the exception filter runs instead of a normal reply.

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

### NEST-173 — Guard vs middleware vs interceptor

**Difficulty:** Intermediate

**Category:** Guards

**Question:**

Why are guards the right place for auth, rather than middleware or interceptors?

**Answer:**

Middleware runs before routing, so it has no `ExecutionContext` and doesn't know which handler will run. That means it can't tell whether a route is public or needs a certain role. Guards run after middleware and know exactly which handler is about to execute, so they can read decorators and metadata. Interceptors run after guards and wrap the handler for things like logging or response mapping. They aren't meant for access control.

**Follow-up:**

Is any auth-related work reasonable in middleware?

Answer: Yes, cheap work that doesn't depend on the route, such as parsing cookies, adding a request id, or loosely decoding a token. The actual allow or deny decision still belongs in a guard.

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

### NEST-151 — Authentication vs authorization in Nest

**Difficulty:** Junior

**Category:** Architecture

**Question:**

What is the difference between authentication and authorization, and where does each live in a Nest app?

**Answer:**

Authentication answers "who are you?" and ends with an identity attached to the request, usually `req.user`. Authorization answers "what are you allowed to do?" and uses that identity to make a decision. In Nest, authentication is typically a Passport strategy plus `AuthGuard`. Authorization is a separate guard, such as roles, permissions, or policies, plus ownership checks inside services. Keeping them separate means each can change without breaking the other.

**Follow-up:**

Why shouldn't the authentication guard also check roles?

Answer: Mixing them ties "how we log in" to "what the rules are". If they're separate, you can swap JWT for sessions or an external identity provider without touching permission logic, and public routes can skip the role check cleanly.

### NEST-252 — What does `whitelist: true` do in `ValidationPipe`

**Difficulty:** Junior

**Category:** ValidationPipe

**Question:**

What does `whitelist: true` do in `ValidationPipe`?

**Answer:**

It removes any property that has no validation decorator from the validated object. This protects against mass assignment. For example, if a client adds `isAdmin: true` to a signup request, and your DTO doesn't declare it, it is dropped before it reaches your code. The flip side is that every legitimate property needs at least one decorator. If a field has no real rules but should be kept, mark it with `@Allow()`.

**Follow-up:**

What is the common gotcha with whitelisting?

Answer: If you forget a decorator on a field, it is silently removed, and you get "my field is always undefined" bugs. Nested objects also need `@ValidateNested()` and `@Type()`, or they are stripped or left unchecked.

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

### NEST-060 — useGlobalGuards and APP_GUARD

**Difficulty:** Senior

**Category:** Guards

**Question:**

`RolesGuard` injects `Reflector`. Bootstrap calls `useGlobalGuards(new RolesGuard())`. Another module registers `{ provide: APP_GUARD, useClass: RolesGuard }`. Which one is constructed correctly, and if both exist, which runs first?

**Answer:**

`new RolesGuard()` happens outside the container, so that instance never receives `Reflector`. `APP_GUARD` with `useClass`, and `@UseGuards(RolesGuard)` when you pass the class, are constructed by dependency injection and do receive it. `useGlobalGuards` appends its instances after `create()` has already registered the `APP_GUARD` providers. When both exist, the injected globals run first, in module-scan order, and the bootstrap instances run after them.

**Trade-offs:**

Prefer `APP_GUARD` whenever the guard has dependencies. `new` is honest only for a guard whose constructor needs nothing.

**Follow-up:**

Imported `AuthModule` registers an `APP_GUARD` for Roles. The root module registers Feature. Bootstrap then calls `useGlobalGuards(HeaderPresent)`. What is the order?

Answer: Feature, then Roles, then HeaderPresent. During the scan the root module is recorded before the modules it imports, and `useGlobalGuards` appends after that scan.

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

### NEST-063 — Interceptors on the way in and on the way out

**Difficulty:** Senior

**Category:** Interceptors

**Question:**

Global interceptor `G`, controller interceptor `C`, and method interceptor `M` each log `in` before `next.handle()` and `out` inside `map`. The handler returns `{ ok: true }`. What is the log order, and whose `map` sees the object first?

**Answer:**

On the way in, Nest calls interceptors from the outside inward: global, then controller, then method. Pipes and the handler run inside the innermost `next.handle()`. On the way out, RxJS operators run in reverse, so the method interceptor's `map` runs first, then the controller's, then the global's. The log is G-in, C-in, M-in, M-out, C-out, G-out. `M`'s `map` is the first to see `{ ok: true }`. Later maps see whatever the inner map returned.

**Trade-offs:**

One interceptor that both times the call and wraps the body is simple, and it is less reusable. Separate `map` and `tap` interceptors compose cleanly when you bind them in a deliberate order.

**Follow-up:**

`M`'s `map` returns `{ wrapped: true }`. `C` and `G` only `tap`. What body does the client get?

Answer: `{ wrapped: true }`. `tap` looks at the value and does not replace it, so the adapter writes the object `M` returned.

### NEST-066 — How pipes are applied to arguments

**Difficulty:** Senior

**Category:** Pipes

**Question:**

A handler has `@Body() body`, `@Query('page') page`, and `@Param('id', ParseIntPipe) id`. A global pipe and a method `@UsePipes()` also exist. What runs for each argument, and can the body pipe wait for the query pipe?

**Answer:**

Pipes run inside `next.handle()`, after the inbound interceptor code and before the controller method. For one argument, Nest runs the global pipes, then controller `@UsePipes()`, then method `@UsePipes()`, then the pipes declared on that parameter. Each of those is awaited, left to right. Separate arguments do not wait for each other. Nest resolves them with `Promise.all`, so a body pipe and a query pipe start together. Do not rely on one argument's pipe finishing before another argument's pipe starts.

**Trade-offs:**

A global pipe is the place for a shared rule. A parameter pipe is the place for one-off coercion. Controller `@UsePipes()` sits between those two.

**Follow-up:**

A method pipe logs `method` and `ParseIntPipe` logs `param`, both on `id`. Which runs first?

Answer: `method`, then `param`. Parameter pipes are appended after the method pipes for that argument.

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

### NEST-155 — Configuring `JwtStrategy`

**Difficulty:** Intermediate

**Category:** JWT

**Question:**

How do you configure `JwtStrategy` with `passport-jwt`, and what does `validate` receive?

**Answer:**

In the constructor you call `super()` with three main options: `jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken()` to find the token, `ignoreExpiration: false` to reject expired tokens, and `secretOrKey` from your config. Passport checks the signature and expiry first. Only then does it call `validate(payload)` with the decoded payload. You return the object you want on `req.user`, for example `{ userId: payload.sub, roles: payload.roles }`.

**Follow-up:**

Should `validate` hit the database on every request?

Answer: Only if you need fresh data, such as "is this user still active?". It costs a query per request but catches deactivated users immediately. Otherwise, trust the signed payload and keep token lifetimes short.

### NEST-177 — `@Roles()` and `RolesGuard`

**Difficulty:** Intermediate

**Category:** Authorization

**Question:**

How do you build a `@Roles()` decorator and `RolesGuard`?

**Answer:**

The decorator just stores metadata: `export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);`. The `RolesGuard` reads it with `reflector.getAllAndOverride<Role[]>('roles', [handler, class])`. If no roles are set, it lets the request through. Otherwise it checks that the user has at least one required role: `req.user.roles.some(r => required.includes(r))`. The authentication guard must run first, so that `req.user` exists.

**Follow-up:**

What should the guard do when `req.user` is missing?

Answer: Deny the request, by throwing `UnauthorizedException` or returning false, rather than crashing on `undefined`. A missing user on a protected route means authentication didn't run or failed.

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

### NEST-356 — overrideProvider

**Difficulty:** Intermediate

**Category:** Overrides

**Question:**

What does `overrideProvider` do, and when do you call it?

**Answer:**

`overrideProvider(token)` replaces one provider in the test graph before Nest constructs anything. You call it on the builder, then `useValue`, `useClass`, or `useFactory`, then `compile()`. The token is the class, string, or symbol the production module provides. A typical case is to import the real feature module and replace only `PrismaService`, a repository, or `HttpService`. The service under test still runs its real methods. The override has to happen before `compile()`. After that, the instances already exist.

**Follow-up:**

Why can an override appear to do nothing?

Answer: The token has to be the same one the constructor injects. Overriding a class does nothing when the code injects a string token, or when a method calls `new PrismaClient()` itself and never asks Nest for it.

### NEST-414 — ValidationPipe as a security boundary

**Difficulty:** Intermediate

**Category:** Validation

**Question:**

How does a global `ValidationPipe` reduce attacks, and what does it refuse to decide?

**Answer:**

The pipe runs class-validator on the DTO before your method body. Wrong types, missing fields, and unknown fields never reach the service when you turn on `whitelist` and `forbidNonWhitelisted`. That cuts mass assignment and a lot of “this string is actually an object” bugs. It does not decide that this user may update that row, and it does not make a raw SQL string safe. A field you declare, such as `@IsBoolean() isAdmin`, is accepted from anyone who can call the route. Leave privileged fields off the public DTO and set them on the server.

**Follow-up:**

The pipe is registered on one controller only. What is the practical result?

Answer: Every other controller still accepts raw objects, and new routes usually forget the decorator. A global pipe in `main.ts` or `APP_PIPE` makes the strict behavior the default. Loosen a single webhook with a local pipe if you must.

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

### NEST-184 — 401 vs 403

**Difficulty:** Junior

**Category:** Guards

**Question:**

When do you use 401 and when 403, and which Nest exceptions map to them?

**Answer:**

Use 401, `UnauthorizedException`, when credentials are missing, invalid, or expired. It tells the client to log in again. Use 403, `ForbiddenException`, when the user is logged in but isn't allowed to do this. Remember that a guard returning `false` gives 403 by default, so throw 401 yourself for authentication failures. Keep error messages generic, so you don't reveal whether a user or resource exists.

**Follow-up:**

What header should accompany a 401?

Answer: `WWW-Authenticate`, for example `Bearer`, according to HTTP rules. Many APIs skip it, but it's correct for standards-compliant clients.

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

### NEST-071 — Which exception filter is selected

**Difficulty:** Senior

**Category:** Exception filters

**Question:**

The method has `@Catch(NotFoundException)`, the controller has `@Catch(HttpException)`, and a global filter has `@Catch()`. The handler throws `NotFoundException`. Which `catch` runs? If the method filter rethrows, does the controller filter run?

**Answer:**

Nest builds the filter list as global, then controller, then method, and then searches from the method end. The method filter is considered first. `@Catch()` matches with `instanceof`, and an empty `@Catch()` matches every value. `NotFoundException` matches the method filter, so that filter is the one Nest calls. Nest invokes only the selected filter. A rethrow inside it does not continue the walk to the controller filter or the global filter.

**Trade-offs:**

A method filter is for a route with an odd contract. A controller filter is for one resource's shape. A global `@Catch()` is the process-wide fallback, and it is also the filter that can see middleware errors.

**Follow-up:**

The method filter is `@Catch(HttpException)`, and the handler throws `new Error('disk full')`. Which filter runs?

Answer: The global `@Catch()`, because its metatype list is empty and it matches everything. The method and controller filters that name `HttpException` skip a plain `Error`. If nothing matches, `BaseExceptionFilter` handles it, as in NEST-072.

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

### NEST-175 — The `@Public()` decorator

**Difficulty:** Intermediate

**Category:** Guards

**Question:**

How do you implement `@Public()` to opt a route out of the global auth guard?

**Answer:**

First, create the decorator: `export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);`. Then, in the global guard's `canActivate`, read it with `reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()])`. If the value is truthy, return `true`. Otherwise call `super.canActivate(context)` to run the normal authentication. Use it on routes such as login, register, health checks, and webhooks.

**Follow-up:**

How do you make a `@Public()` route still fill `req.user` when a token is sent?

Answer: Still try to authenticate, but ignore failures. Wrap `super.canActivate` in a try/catch, or override `handleRequest` to return `null`, and always return `true`.

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

### NEST-254 — What does `transform: true` do

**Difficulty:** Intermediate

**Category:** ValidationPipe

**Question:**

What does `transform: true` do?

**Answer:**

With `transform: true`, the pipe gives your handler the transformed class instance, not the raw plain object from the request. It also converts simple route parameters to their declared type, so `@Param('id') id: number` really is a number. Without it, validation still runs on an instance internally, but your handler receives the original raw payload. That means DTO methods and default values don't work, and parameters stay strings.

**Follow-up:**

Does `transform: true` make `@Query('page') page: number` a number automatically?

Answer: For a single primitive parameter, yes. For properties inside a DTO, you also need `@Type(() => Number)` or `transformOptions: { enableImplicitConversion: true }`. Otherwise they stay strings.

### NEST-301 — Why a handler should queue slow work

**Difficulty:** Junior

**Category:** Queues

**Question:**

Why would a Nest HTTP handler put work on a queue instead of finishing it before the response?

**Answer:**

The request should return before slow work finishes. Mail, a payment partner, or a report can take seconds. Doing that inside the handler keeps the user waiting, holds the connection, and a spike can exhaust the process. A queue stores the job, and a worker runs it afterward. You also get retries and a record of failures. The response can only say the work was accepted, so the product needs a status the user can check later.

**Follow-up:**

What HTTP status fits a job that was only queued?

Answer: Use 202 Accepted. A 200 reads as if the email was already sent or the report was already built, and that is not true yet.

### NEST-351 — What a TestingModule is

**Difficulty:** Junior

**Category:** TestingModule

**Question:**

What is a TestingModule, and why do Nest tests build one?

**Answer:**

A TestingModule is a Nest dependency-injection container built for one test. You list the controllers and providers you need, Nest constructs them, and you either call a method or send HTTP through an application created from that module. It follows the same wiring rules as production, so a custom provider, a request scope, or an imported module still behaves the way it will in the app. Constructing the service with `new` skips that metadata. The test can then pass while the real module is wired wrong.

**Follow-up:**

Why is `compile()` asynchronous?

Answer: Dynamic modules and async factories may return promises, and `compile()` waits until they finish. If you forget to await it, you still hold a promise, so `get` is missing and the test throws before any assertion.

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

### NEST-058 — return false and throw UnauthorizedException

**Difficulty:** Senior

**Category:** Guards

**Question:**

A guard throws `UnauthorizedException` when `Authorization` is missing, returns `false` for `Bearer expired`, and returns `true` otherwise. For each failure, what status and body does the client get, and does `getInvoice` run?

**Answer:**

Both failures stop the request before the handler, the pipes, and the interceptors. A missing header is your `UnauthorizedException`. The default filter turns that into status 401 and a body of `{ message: 'Unauthorized', statusCode: 401 }`, which is the shape of `UnauthorizedException` constructed with no arguments. Returning `false` is different. Nest itself throws `ForbiddenException`, so the client gets 403 and the message `Forbidden resource`. `getInvoice` does not run in either case.

**Trade-offs:**

Returning `false` is enough when every denial should be the same 403. Throw an explicit exception when the client must be able to tell 401 from 403, or when the body must be custom.

**Follow-up:**

The method has `@Catch(UnauthorizedException)` and a global filter has `@Catch()`. Which one runs for `Bearer expired`?

Answer: The global `@Catch()`. Returning `false` becomes `ForbiddenException`, so the method filter that only catches `UnauthorizedException` does not match.

### NEST-162 — Sessions vs JWT

**Difficulty:** Senior

**Category:** Sessions vs JWT

**Question:**

How do you choose between server-side sessions and JWTs?

**Answer:**

With sessions, the server keeps the state and the browser holds only an opaque id in a cookie. You get instant revocation and a private payload, but you need shared storage once you run several instances. JWTs carry their own data and can be verified without a lookup, which suits many services and clients, but they are hard to revoke. For a classic web app with one backend, sessions are often simpler and safer. For APIs with many clients, JWT with refresh fits better.

**Trade-offs:**

Sessions give you revocation and control but need shared state. JWTs scale without state but are hard to revoke.

**Follow-up:**

Is "JWT is stateless" still true once you add a revocation list?

Answer: Not completely. A denylist or per-user version check adds a lookup on each request. You keep the JWT format, but lose part of the stateless benefit.

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

### NEST-297 — Why use response DTOs instead of returning entities

**Difficulty:** Senior

**Category:** Serialization

**Question:**

Why use response DTOs instead of returning entities?

**Answer:**

A response DTO separates your public contract from your database schema. It prevents sensitive fields from leaking, lets you reshape data, for example by flattening relations or adding computed fields, and gives Swagger accurate types. A simple way to build one is `plainToInstance(ResponseDto, entity, { excludeExtraneousValues: true })`, with `@Expose()` on every field you want to return. Anything you didn't expose is left out.

**Follow-up:**

What does `excludeExtraneousValues` do?

Answer: Only properties marked with `@Expose()` appear in the output. This turns serialization into an allowlist, so a new database column can't leak by accident.

### NEST-449 — What breaks when you add replicas

**Difficulty:** Staff

**Category:** Scaling

**Question:**

You scale Nest to three replicas. Which in-memory behavior breaks, and when is a sticky cookie the wrong fix?

**Answer:**

Each process keeps its own Throttler map, memory cache, sessions, WebSocket adapter, and queue, and `@Cron()` runs on every replica. Clients then see multiplied limits, lost sessions, and socket events that never leave the publishing pod. A sticky cookie hides the session bug until that pod dies. Put sessions, throttles, cache, and the socket adapter in Redis, and use a lock so cron runs once. Stickiness still fits the WebSocket connection, together with Redis so any pod can reach the socket. Bearer-token HTTP does not need a sticky cookie.

**Follow-up:**

Users get random `401`s after login. Sessions are in memory and the balancer is not sticky. What is the smallest correct change?

Answer: Store the session in Redis or the database and keep only the session id in the cookie. Stickiness hides the bug until a pod dies, and it does not fix cron or sockets. If the credential is a signed JWT, compare `JWT_SECRET` across pods and check whether revocation state lives in memory.

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
