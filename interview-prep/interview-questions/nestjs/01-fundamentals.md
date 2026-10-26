# NEST01 — Fundamentals and architecture

NestJS 10. Questions NEST-001–NEST-050.

Version pin: observable bootstrap and hook order below follows NestJS 10.4 (checked against 10.4.15). Decorator APIs are the `@nestjs/common` surface used by that line: `@Module`, `@Controller`, `@Injectable`, `@Inject`, `@Optional`, `@Global`, `@SetMetadata`, `@Dependencies`, `forwardRef`, and the lifecycle interfaces `OnModuleInit`, `OnApplicationBootstrap`, `OnModuleDestroy`, `BeforeApplicationShutdown`, and `OnApplicationShutdown`.

### NEST-001 — What create() builds, and what listen() still has to do

**Difficulty:** Intermediate

**Category:** Architecture

**Question:**

A Nest 10 process calls `NestFactory.create(AppModule)` and then `app.listen(3000)`. The root module imports two feature modules. Nothing calls `app.init()` on its own. What has the framework actually done when `create()` resolves, and what still happens before the process accepts connections?

**Context and Constraints:**

Default HTTP platform (Express via `@nestjs/platform-express`). Providers use the default scope. `abortOnError` is left at its default. No microservice or WebSocket adapter is connected.

**Senior Engineer's Answer:**

`NestFactory.create()` constructs a container, scans the root module, and instantiates providers. The scanner starts at `AppModule`, reads the metadata stored by `@Module()` (and by every imported module), and registers controllers and providers that are reachable from that root. The instance loader then constructs those classes. When the `create()` promise resolves, constructor injection for those instances has already finished, and `app.get(SomeService)` can return the instance. Lifecycle hooks have not run. Controller routes have not been bound to the adapter. The TCP port is not open.

`listen()` checks `isInitialized`. On the object returned by `create()`, that flag is still false, so `listen()` awaits `init()` and only then binds the port. Inside `init()`, Nest applies application options such as CORS, initializes the HTTP adapter, registers the body parser (unless `bodyParser: false`), registers module middleware, and resolves controller metadata onto the adapter. It then awaits `onModuleInit` across modules, registers the not-found and exception handlers, awaits `onApplicationBootstrap`, and only after that marks the application initialized. The startup log emitted at the end of `init()` is therefore earlier than a successful bind. A connection can still fail if the port is taken.

Decorators did their work earlier, when Node evaluated the class. `@Controller()` and `@Get()` stored metadata on the class and method. They did not subscribe to HTTP. The scan during `create()`, and the route resolver during `init()`, are what turn that metadata into a running server. Nest at this layer is a metadata reader plus a DI container plus a thin adapter over Express or Fastify.

**Practical Implementation:**

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  // Constructors have run. onModuleInit has not.
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();
  await app.listen(3000);
}

void bootstrap();
```

**Trade-offs and Alternatives:**

Call `app.init()` yourself when something in the same process must observe a fully initialized graph before the port opens. `listen()` will then skip the second initialization because `isInitialized` is already true. `NestFactory.createApplicationContext()` is the path that builds the same container without an HTTP listener; that split is covered in NEST-019. Dropping Nest and constructing Express routes by hand removes the module graph and the container, which is reasonable only for a process that does not need them.

**Common Mistakes:**

- Treating the resolution of `create()` as proof that `onModuleInit` and `onApplicationBootstrap` have finished.
- Treating the "application successfully started" log as proof that the port is accepting connections.
- Calling `setGlobalPrefix` after `listen()` has already resolved routes. The prefix is read when the router is registered during `init()`.
- Catching a failed bootstrap as a rejected promise from `create()` while leaving `abortOnError` at its default.

**Senior-Level Follow-up:**

If a provider constructor throws during `NestFactory.create()`, what does the default `abortOnError` path do?

The initialization error handler calls `process.abort()` when `abortOnError` is true, which is the default. The `create()` promise is not the failure channel in that mode. Pass `{ abortOnError: false }` when a test runner or a supervisor must see a thrown error instead of `SIGABRT`.

### NEST-002 — The four @Module arrays

**Difficulty:** Intermediate

**Category:** Modules

**Question:**

`@Module()` takes `imports`, `controllers`, `providers`, and `exports`. What does each array contribute to the container, and which of them crosses a module boundary?

**Context and Constraints:**

NestJS 10, TypeScript, one root module and a feature module. No `@Global()`. All providers use the default scope.

**Senior Engineer's Answer:**

`imports` is the list of other modules whose exported providers become visible here. Each entry is a module class. The scanner walks this array from the root, so this is also how a feature module enters the application graph.

`controllers` is the list of classes whose route metadata should be bound in this module. Nest instantiates them and can inject providers into their constructors. Listing a class here is what makes it a controller. Listing it only in `providers` instantiates it and does not bind routes.

`providers` is the registration list for this module's own injectables. A class in that array is shorthand for `{ provide: Class, useClass: Class }`. The token is visible to constructors in this module: its controllers, its other providers, and the module class itself. It is not visible to any other module until it also appears in `exports`, or until the exporting module is re-exported.

`exports` is the public surface. It may contain a provider token this module provides, a provider token this module already imported, or an entire imported module (which re-exports that module's exports). Encapsulation in Nest is this pair of lists: `providers` creates the instance, `exports` grants other modules the right to inject it.

**Practical Implementation:**

```typescript
import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { PricingModule } from '../pricing/pricing.module';

@Module({
  imports: [PricingModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
```

**Trade-offs and Alternatives:**

A wide `exports` array makes a feature easy to reuse and makes its internals part of other modules' contract. A narrow one keeps the module replaceable and forces callers to depend on a small token set. Re-exporting an imported module is convenient at a composition root and noisy inside a feature module, because the feature then publishes another module's API as its own.

**Common Mistakes:**

- Putting a service class in `imports`. That slot expects a module.
- Registering a provider and forgetting `exports`, then injecting it from a module that only imported the feature.
- Expecting a controller to become available to other modules through `exports`. Share the service. Leave routing in the module that owns the controller.
- Duplicating the same provider class in several `providers` arrays in order to "make it visible." That creates separate registrations.

**Senior-Level Follow-up:**

Can `exports` name a provider the module neither provides nor imports?

No. Nest rejects that export while it is building the module. The exported token has to already be part of this module's context: declared in `providers`, or brought in through `imports`.

### NEST-003 — Why a class must be registered

**Difficulty:** Intermediate

**Category:** Providers

**Question:**

`OrdersService` is decorated with `@Injectable()` and its file is imported by `OrdersController`. The controller constructor asks for `OrdersService`. Nest fails at startup with an unknown-dependency error. Why is the import plus the decorator not enough?

**Context and Constraints:**

NestJS 10. `OrdersService` is a concrete class, not an interface. It is omitted from every `providers` array. No global module exports it. `emitDecoratorMetadata` is on, so the constructor type is present in metadata.

**Senior Engineer's Answer:**

`@Injectable()` marks the class and, under TypeScript's experimental decorators, is what causes `design:paramtypes` to be emitted for that class. It does not add the class to the container. The file import only gives the controller a runtime reference to the constructor so the emitted metadata has a real token. The container still has no registration that says "when something asks for `OrdersService`, here is how to build it, and here is the module that owns the instance."

Registration is the `providers` entry (or a custom provider object, or a provider exported by an imported module). During the scan, Nest records that token inside a specific module. When the instance loader builds `OrdersController`, it reads the constructor token and looks for it in `OrdersModule`'s context: local providers first, then providers exported by imported modules. If that lookup fails, startup stops. The usual message names the class being constructed, the missing argument, its index, and the module context, in the form "Nest can't resolve dependencies of the OrdersController (?). Please make sure that the argument OrdersService at index [0] is available in the OrdersModule context."

That failure is intentional. A filesystem walk that instantiated every `@Injectable()` class would have no owner, no export boundary, and no way to bind one token to a test double in one module. The module graph is the registry.

**Practical Implementation:**

```typescript
@Module({
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
```

**Trade-offs and Alternatives:**

`@Optional()` changes the miss into an injected `undefined` so bootstrap can continue. That is a real choice for a plugin-style dependency, and it still requires the call site to handle the missing case. It is a poor fix for a service the controller always needs. `new OrdersService()` inside the controller also "fixes" the error by leaving the container: that instance is invisible to other injectors, receives no further constructor injection, and does not participate in lifecycle hooks.

**Common Mistakes:**

- Adding `@Injectable()` and assuming Nest discovers the file.
- Importing the service file only as a type (`import type`), so the value the decorator would have recorded is erased. That is a metadata problem, distinct from forgetting `providers`.
- Registering the provider in a module that the current module never imports.
- Reading the unknown-dependency error as a circular dependency. Set `NEST_DEBUG=true` for the scanner's own resolution trace before rearranging imports.

**Senior-Level Follow-up:**

The same class is listed in `providers` and the controller still fails. What do you check next?

Confirm the module that declares the controller is the module that provides the class, or that it imports a module which exports that token. Then confirm the constructor parameter is a runtime value import of the class, and that `reflect-metadata` was loaded before the module file was evaluated. `@nestjs/core` loads `reflect-metadata` as a side effect, which is why the generated `main.ts` imports `NestFactory` before `AppModule`. A test file that imports the feature module first can record empty metadata.

### NEST-004 — How constructor injection chooses a token

**Difficulty:** Senior

**Category:** Dependency injection

**Question:**

Explain how Nest 10 turns `constructor(private readonly orders: OrdersService)` into a container lookup. What does TypeScript have to emit, and where does `@Inject()` replace that mechanism?

**Context and Constraints:**

`experimentalDecorators` and `emitDecoratorMetadata` are enabled, which is what the Nest 10 CLI puts in `tsconfig`. The project uses TypeScript's legacy decorator emit, which is the emit Nest 10 reads. Stage 3 decorators are not the mechanism this version uses. The provider is a class token registered in the same module.

**Senior Engineer's Answer:**

When the class is decorated, TypeScript emits `design:paramtypes` on the constructor if `emitDecoratorMetadata` is on. That metadata is an array of runtime values, one per parameter. For a class parameter it is the constructor function itself. Nest's injector reads that array while it is creating the instance and treats each entry as a provider token. The lookup is the same one used for any other token: the current module's providers, then the exports of imported modules. The parameter name is irrelevant. Only the emitted runtime value matters.

`@Injectable()` on a provider, and `@Controller()` on a controller, are the decorators that make TypeScript emit those parameter types. A plain class with no decorator often has no `design:paramtypes` at all, so there is nothing for Nest to read. `@Inject(Token)` stores an explicit token in Nest's own metadata and wins for that parameter. That is required for string and symbol tokens, and it is the way to inject an interface-shaped value, because an interface has no runtime existence and shows up as `Object` if it shows up at all.

Factory providers do not use `design:paramtypes` for the factory function. The `inject` array is the entire argument list, in order, including `{ token, optional: true }` when an argument may be missing. `@Optional()` on a constructor parameter is the corresponding switch for class injection: a missing token becomes `undefined` instead of an unknown-dependency failure.

**Practical Implementation:**

```typescript
import { Inject, Injectable, Optional } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { AUDIT } from './audit.token';
import type { AuditTrail } from './audit.types';

@Injectable()
export class CheckoutService {
  constructor(
    private readonly orders: OrdersService,
    @Inject(AUDIT) private readonly audit: AuditTrail,
    @Optional() private readonly extra?: OrdersService,
  ) {}
}
```

**Trade-offs and Alternatives:**

Type-based injection is short and stays aligned with the TypeScript type. It breaks as soon as the runtime value disappears: `import type`, an interface, a union, or a compiler that does not emit decorator metadata. Explicit `@Inject()` is noisier and survives those cases. `@Dependencies(OrdersService)` from `@nestjs/common` is the documented form for a class that must declare tokens without `design:paramtypes`, which is the usual style in plain JavaScript. A hand-rolled SWC or Babel build that strips legacy decorator metadata fails the same way as `emitDecoratorMetadata: false`: every type-based parameter becomes unresolvable. The Nest CLI `swc` builder is expected to keep that metadata; a custom SWC config has to do the same on purpose.

**Common Mistakes:**

- Using `import type` for a class that is an injection token. The type-only import is erased, and the parameter is no longer the class.
- Assuming a factory's parameter types are read automatically. They are not. Fill in `inject`.
- Turning off `emitDecoratorMetadata` and expecting `@Injectable()` alone to preserve class tokens. Explicit `@Inject()` still works because it writes its own metadata.
- Decorating a property with `@Inject()` and reading that property inside the constructor. Constructor parameters are the dependencies that exist for the constructor body.

**Senior-Level Follow-up:**

Both `OrdersService` and a custom `{ provide: OrdersService, useClass: CachedOrdersService }` exist. Which class is constructed for a `constructor(orders: OrdersService)` parameter?

The token in the constructor is `OrdersService`. The registration for that token says `useClass: CachedOrdersService`, so the injector constructs `CachedOrdersService` and passes that instance. The TypeScript type of the parameter is a compile-time claim. The object at runtime is whatever the token is bound to.

### NEST-005 — What the default scope actually guarantees

**Difficulty:** Senior

**Category:** Dependency injection

**Question:**

Nest's default provider scope is singleton. In one Nest 10 process, what is the lifetime and identity of that instance, and which questions about scope does this fact leave unanswered?

**Context and Constraints:**

The provider is registered once, with the shorthand `providers: [OrdersService]`, and exported to every module that injects it. No `@Scope()` decorator is present. Assume NestJS 10's `Scope.DEFAULT`.

**Senior Engineer's Answer:**

`providers: [OrdersService]` is `{ provide: OrdersService, useClass: OrdersService }` with the default scope. For that single registration, the container constructs one instance while `NestFactory.create()` is instantiating dependencies, caches it, and returns the same object to every constructor that resolves that token through a module allowed to see it. The instance lives until the application container is closed. It is shared. It is created even if no HTTP request ever arrives.

"Singleton" here means one instance per registration in the container, not "one instance per JavaScript realm no matter how many times the class was registered," and not "one instance per request." A second `providers: [OrdersService]` entry in another module is a second registration. Scope does not merge those. Sharing is an export/import relationship on one registration.

Two other scopes exist, `REQUEST` and `TRANSIENT`. They change how many instances are created and how that choice propagates to dependents. Request-scoped instances are also outside the application lifecycle hooks, because those hooks run against the long-lived graph. How bubbling works, and how `ModuleRef.resolve()` fits in, belongs in the dependency-injection chapter. The fundamentals constraint is narrower: if you did not set a scope, you have one eagerly created instance for that provider entry, shared by every legal injector of that token.

**Practical Implementation:**

```typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class OrdersService {
  private readonly createdAt = Date.now();

  age(): number {
    return this.createdAt;
  }
}
```

**Trade-offs and Alternatives:**

An eager singleton makes startup the moment you pay for construction, and it makes accidental mutable state visible to every caller. That is the right trade for a stateless domain service or a shared client. It is the wrong trade for data that must not leak across requests. The fix for that leak is a different scope or, more often, passing the request data as method arguments. Choosing a scope is a later design discussion; hiding per-request data in fields of a default-scope service is a bug in this one.

**Common Mistakes:**

- Describing the default as "a new instance on every injection."
- Describing the default as "a new instance per request."
- Storing request-specific data on a default-scope service because the class is `@Injectable()`.
- Expecting `onModuleInit` on a request-scoped class to run at bootstrap. It will not. Leave the mechanism for the scope chapter; do not "fix" it by switching the class to singleton just to see the hook fire.

**Senior-Level Follow-up:**

Two controllers in different modules inject `OrdersService` and log a field set in the constructor. When do you expect the same object, and when do you expect two objects?

You expect the same object when both modules reach one registration, which means one module provides and exports it and the other imports that module. You expect two objects when each module lists `OrdersService` in its own `providers` array. Default scope does not deduplicate those lists.

### NEST-006 — What belongs on a controller, and what belongs on a service

**Difficulty:** Intermediate

**Category:** Architecture

**Question:**

A classmate puts order-total calculation, a database call, and response-header logic in `OrdersController`. The interview prompt is: what is the controller's job in Nest, what is the provider's job, and what does the framework actually enforce?

**Context and Constraints:**

HTTP application, Nest 10, one `OrdersModule` with one controller and one `@Injectable()` service. No queues, no microservices. The team wants the service callable from a test and from a non-HTTP entry point later.

**Senior Engineer's Answer:**

A controller is the adapter between HTTP and the application. `@Controller('orders')` stores a path prefix. Method decorators such as `@Get(':id')`, `@Post()`, and parameter decorators such as `@Param()` and `@Body()` store more metadata. During `init()`, the routes resolver reads that metadata and registers handlers on the HTTP adapter. The handler Nest invokes is the controller method. Its inputs are request data the parameter decorators selected. Its return value is what the framework serializes, unless the method has taken over the response with `@Res()`.

A service is a provider registered in the container. It has no route metadata. It is the place for the calculation and the persistence call, because those operations are not properties of HTTP. The controller method should be a thin translation: read params, call the service, return the result or throw an `HttpException` that describes the HTTP outcome.

Nest does not enforce the split. A controller method may open a database client and compute a total, and the route will still bind. The cost shows up when a second caller appears. The controller is tied to the HTTP application: middleware, guards, interceptors, and pipes do not run when some other code calls the method directly. A service registered in the module can be injected into a controller today and retrieved from an application context later without dragging in route decorators.

**Practical Implementation:**

```typescript
import { Body, Controller, Post } from '@nestjs/common';
import { CreateOrderDto } from './create-order.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  create(@Body() body: CreateOrderDto) {
    return this.orders.create(body);
  }
}
```

**Trade-offs and Alternatives:**

Putting orchestration in the controller is fewer classes for a one-route module, and it keeps the HTTP status decisions next to the route. It also makes the rule unusable from a CLI or a job without standing up HTTP. Putting HTTP status codes inside the service (`throw new HttpException`) couples the domain to `@nestjs/common`'s HTTP types. A practical line is: the service returns a result or a domain error; the controller (or an exception filter, which is a later chapter) decides the status code.

**Common Mistakes:**

- Injecting `@Req()` and passing the whole request into the service, so the service depends on Express types.
- Instantiating the service with `new` inside the handler, which skips the container.
- Treating "controller" as "anything with business logic" because the class is in the `controllers` array. The array only controls route registration and instantiation.
- Adding the controller class to `providers` in the hope of sharing it. Share the service.

**Senior-Level Follow-up:**

The service needs the authenticated user id. Where is that value read?

Read it at the HTTP boundary. A param decorator or a guard (guards are part of the request pipeline, not this chapter) produces a user id, and the controller passes that id as an argument: `this.orders.create(body, userId)`. The service stays a function of its arguments and its injected providers.

### NEST-007 — Decorators are metadata, not the behavior

**Difficulty:** Senior

**Category:** Decorators

**Question:**

`@Controller()`, `@Get()`, `@Injectable()`, and a custom `@Roles('admin')` are all present on a small module. At runtime, what does each decorator do at the moment the class is defined, and what later reads that information?

**Context and Constraints:**

NestJS 10, `experimentalDecorators` enabled. `@Roles()` is implemented with `SetMetadata` from `@nestjs/common`. No custom reflection library. The question stops at metadata; guard execution is out of scope except as the reader of that metadata.

**Senior Engineer's Answer:**

A Nest decorator runs when the class or method is defined, which is when the file is first evaluated. Its job is to write metadata onto the target with `reflect-metadata`. `@Module()` writes the `imports`, `controllers`, `providers`, and `exports` arrays onto the module class. `@Controller('orders')` writes the path prefix onto the controller class. `@Get(':id')` writes the path and the HTTP method onto the handler. `@Injectable()` marks the provider and is the decorator that prompts TypeScript to emit constructor parameter types. None of these calls `app.get`, opens a port, or checks a role.

`SetMetadata(key, value)` is the public helper for application metadata. A `@Roles('admin')` decorator is a function that returns `SetMetadata(ROLES_KEY, ['admin'])`. After evaluation, the method has a metadata entry. The process is unchanged until some Nest component asks the `Reflector` for `ROLES_KEY` on that handler. The guard that would do so belongs to the request-lifecycle material; the fundamentals point is that the decorator and the enforcer are different pieces. You can attach `@Roles()` and, with no reader, it has no effect.

The scanner and the routes resolver are the readers for framework metadata. They run during `create()` and `init()`, long after the decorator functions returned. If an import cycle leaves the class `undefined` at evaluation time, the decorator records that `undefined`, and the scanner fails later. The decorator does not retry.

**Practical Implementation:**

```typescript
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
```

**Trade-offs and Alternatives:**

Metadata decorators keep cross-cutting marks next to the handler and out of the method body. They are invisible in stack traces and easy to assume are "working" because the annotation is present. An explicit method call inside the handler is easier to follow and harder to forget. Use a decorator when a framework or a single application-wide reader must discover the mark without every method remembering to call it. Use ordinary code when the behavior is local to one service.

**Common Mistakes:**

- Describing `@Get()` as "registering the route" at import time. It stores metadata. Route registration happens in `init()`.
- Writing a decorator that performs the authorization check itself, closing over `process.env` or a database client at class-evaluation time. The check then runs once, at import, against no request.
- Using a fresh `Symbol` as the metadata key in the writer and a second `Symbol('roles')` in the reader. They are different keys. Export one constant and use it in both places.
- Depending on decorator order for application logic. Nest's contract is the metadata map, not the order in which several decorators on one method happened to run.

**Senior-Level Follow-up:**

How do you confirm `@Roles()` is recorded without sending an HTTP request?

Read it with `Reflector` from `@nestjs/core`, or with `Reflect.getMetadata(ROLES_KEY, Handler.prototype.method)`, in a unit test that imports the controller file after `reflect-metadata` is loaded. A passing test of the decorator plus a missing guard is still a product bug, and it is a different bug from "the decorator wrote nothing."

### NEST-008 — onModuleInit versus onApplicationBootstrap

**Difficulty:** Senior

**Category:** Lifecycle

**Question:**

`OrdersService` opens a client, and `AppModule` should start a scheduler only after every feature module has initialized. Which hook do you implement on each, what has already happened when the hook runs, and what has not?

**Context and Constraints:**

NestJS 10.4 HTTP application. Both classes use the default scope. Initialization is the `init()` that `listen()` performs. `OrdersModule` is imported by `AppModule`. A sibling `BillingModule` is also imported by `AppModule` and is not imported by `OrdersModule`.

**Senior Engineer's Answer:**

`onModuleInit` runs once the host module's dependencies have been resolved, during `init()`, and Nest awaits a returned promise before it moves on. In Nest 10.4 the walk is by import distance: modules farther from the root, including the position the docs give to global modules, run before the modules that import them, and the root runs last in that pass. Inside one module, provider and controller hooks are started together and awaited as a group; the module class's own `onModuleInit` runs after that group. `OrdersService.onModuleInit` is the right place to open a client that this module owns. Imported modules have already finished their `onModuleInit`. `BillingModule` has not necessarily finished, because it is a sibling, not a dependency.

`onApplicationBootstrap` is a second pass over the same distance order. It starts only after every module's `onModuleInit` has been awaited, and it finishes before `listen()` binds the port. The scheduler on the root module belongs here when "every feature has initialized" is the real requirement. It is still too early for "the port is open" and for "a peer process can already call us."

Both hooks are methods Nest detects by presence: `typeof instance.onModuleInit === 'function'`. The `OnModuleInit` and `OnApplicationBootstrap` interfaces are erased at compile time and exist so TypeScript can check the signature. Implementing the interface with a misspelled method does nothing. Declaring the method without the interface still runs. Constructors have already finished during `create()`, so a hook may call methods on injected services, with the caveat in NEST-021 about whether those services' hooks have run.

`NestModule.configure()` is not this mechanism. A module that implements `NestModule` gets `configure(consumer)` so it can register middleware. That call happens inside `init()` while middleware is registered, which is before the `onModuleInit` pass. It is not "the module is ready" and it is not a shutdown hook.

**Practical Implementation:**

```typescript
import { Injectable, OnApplicationBootstrap, OnModuleInit } from '@nestjs/common';

@Injectable()
export class OrdersService implements OnModuleInit {
  async onModuleInit(): Promise<void> {
    await this.connect();
  }

  private async connect(): Promise<void> {
    // Open the client this module owns.
  }
}

@Injectable()
export class Scheduler implements OnApplicationBootstrap {
  onApplicationBootstrap(): void {
    this.start();
  }

  private start(): void {
    // Every module's onModuleInit has been awaited.
  }
}
```

**Trade-offs and Alternatives:**

`onModuleInit` keeps setup next to the module that owns the resource and fails startup before sibling work begins if this module's promise rejects. `onApplicationBootstrap` is the single "graph is ready" gate and becomes a hidden coupling if every feature dumps its setup there. Work that must happen after the server is accepting connections belongs after `listen()` resolves, in `bootstrap()`, not in either hook.

**Common Mistakes:**

- Opening the client in the constructor with a floating promise. The constructor cannot be awaited, and `init()` will not wait for it.
- Starting a consumer in `onModuleInit` that immediately calls into a sibling module's service. That sibling's `onModuleInit` may still be pending.
- Assuming hooks run when `NestFactory.create()` resolves. On the HTTP application they run on `init()` / `listen()`. `createApplicationContext()` is the API that calls `init()` itself.
- Expecting these hooks on request-scoped providers. They are not part of this bootstrap walk; scope lifetime is a later chapter.

**Senior-Level Follow-up:**

Your `onModuleInit` returns a promise that rejects. Does `listen()` bind the port?

No. Nest awaits the hook. A rejection fails `init()`, and `listen()` therefore rejects before the bind. The port is not left half-open by that hook failure.

### NEST-009 — Shutdown hooks and enableShutdownHooks()

**Difficulty:** Senior

**Category:** Lifecycle

**Question:**

The process receives `SIGTERM`. `OrdersService` must stop taking work and close a client. What do you call at bootstrap, which methods run, and what does `app.close()` do that a signal does not?

**Context and Constraints:**

NestJS 10.4. The application is an HTTP server started with `listen()`. Providers are default scope. The operating system is Linux, where `SIGTERM` is delivered. The team also runs the same binary on Windows in development.

**Senior Engineer's Answer:**

Shutdown methods are `onModuleDestroy()`, then `beforeApplicationShutdown(signal)`, then `onApplicationShutdown(signal)`. Nest detects them the same way as the startup hooks: the method exists. `onModuleDestroy` takes no signal argument. The other two receive the signal string when a signal started the sequence, and that argument is undefined when application code called `app.close()` with no signal. Returned promises are awaited before the next phase.

`app.close()` always runs that sequence: destroy hooks, `beforeApplicationShutdown`, disposal of the HTTP adapter (connections close here), then `onApplicationShutdown`. It does not exit the Node process. Timers and open handles keep the process alive, which is what you want in a test that closes the app and then asserts.

Signal delivery is off unless `app.enableShutdownHooks()` was called. The listeners are omitted by default because each call registers process listeners, and several Nest applications in one process (a common test shape) can trip Node's listener warning. On a signal, Nest 10.4 runs the same phase order, removes its listeners, and re-sends the signal with `process.kill` so the default action can terminate the process. A second signal while the first shutdown is in progress is ignored. `enableShutdownHooks()` does not make `app.close()` exit the process.

In Nest 10.4.15 the module walk for these three shutdown phases uses the same distance ordering as startup: greater import distance first, root last. Sibling providers inside a module are not ordered against each other. The current lifecycle guide's sentence about a reverse shutdown walk matches later framework code, not 10.4.15. If teardown of module A must happen before module B, write that sequence explicitly. Do not encode it as "whichever module is closer to the root."

Windows will not deliver `SIGTERM` to the process the way Linux does. `SIGINT` is the signal that development on Windows can exercise. A handler that was only tested via `SIGTERM` on a developer laptop has not been tested.

**Practical Implementation:**

```typescript
import { Injectable, OnModuleDestroy } from '@nestjs/common';

@Injectable()
export class OrdersService implements OnModuleDestroy {
  async onModuleDestroy(): Promise<void> {
    await this.client.close();
  }
}
```

```typescript
const app = await NestFactory.create(AppModule);
app.enableShutdownHooks();
await app.listen(3000);
```

**Trade-offs and Alternatives:**

`onModuleDestroy` is the module-local place to stop background work this provider started. `beforeApplicationShutdown` still has connections open, so it is the place for "drain, then allow the server to close." `onApplicationShutdown` runs after `dispose()`, so the HTTP server is already closed; use it for resources that must outlive the listener, such as flushing a client after requests have stopped. Closing the database in `onModuleDestroy` while requests are still in flight is the failure mode of picking the earliest hook by habit.

**Common Mistakes:**

- Implementing `onApplicationShutdown` and assuming `SIGTERM` will call it. Without `enableShutdownHooks()`, a signal does not enter this path. `app.close()` does.
- Calling `process.exit()` inside a hook. Nest is still walking the remaining phases, and other modules lose their shutdown.
- Assuming `app.close()` ends the process. It does not. Clear intervals in a hook if the process should be allowed to exit naturally.
- Relying on root-versus-leaf order during shutdown on Nest 10.4. Pin the version, and sequence anything that matters yourself.

**Senior-Level Follow-up:**

Where do you close a connection pool if in-flight HTTP handlers must be allowed to finish their queries first?

Close it in `onApplicationShutdown`, after the adapter disposal that sits between `beforeApplicationShutdown` and `onApplicationShutdown`. Stopping intake belongs earlier, in `onModuleDestroy` or `beforeApplicationShutdown`. Those are different moments.

### NEST-010 — Why a global module hides a dependency

**Difficulty:** Senior

**Category:** Modules

**Question:**

`ConfigModule` is decorated with `@Global()`, exports `ConfigService`, and is imported once by `AppModule`. Feature modules inject `ConfigService` and do not list `ConfigModule` in `imports`. What did `@Global()` change, and why do teams regret using it for ordinary features?

**Context and Constraints:**

NestJS 10. One process, one root module. `ConfigService` is a default-scope provider. The global module is imported exactly once.

**Senior Engineer's Answer:**

`@Global()` changes visibility, not registration. The module still has to be imported by some scanned module, almost always the root, or it is never scanned at all. Its providers are still private unless they are listed in `exports`. After that single import, any module in the same application may inject the exported tokens without adding `ConfigModule` to its own `imports`. Nest's own description of the feature is that this cuts repetition for true cross-cutting providers, and that making everything global removes the controlled surface the `imports` array was for.

The cost is that the feature module's metadata no longer names a real dependency. A reader of `OrdersModule` cannot see that the module requires `ConfigService`. A test that builds `OrdersModule` alone still needs the global module to have been imported somewhere in that testing module, or the lookup fails in a way the production graph hides. A later refactor that splits the process into two applications discovers the hidden edges only at startup of the second process.

Use a global module for a small, process-wide set that nearly every module would otherwise import: configuration, and maybe a logger. Keep feature services on explicit imports. Global is not a way to skip designing `exports`.

**Practical Implementation:**

```typescript
import { Global, Module } from '@nestjs/common';
import { ConfigService } from './config.service';

@Global()
@Module({
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {}
```

```typescript
@Module({
  imports: [ConfigModule],
})
export class AppModule {}
```

**Trade-offs and Alternatives:**

Explicit `imports: [ConfigModule]` on each feature is verbose and makes the dependency obvious in review and in tests. `@Global()` removes that line and also removes the signal. A shared module that is not global sits between them: one import per feature, a name you can search for, and no ambient availability. That is the better default for anything you can imagine a feature *not* needing.

**Common Mistakes:**

- Decorating a module with `@Global()` and never importing it. The decorator does not self-register.
- Forgetting `exports` and concluding that `@Global()` is broken. The provider is still encapsulated.
- Marking each feature module global to avoid cycles. The cycle remains; the graph is now implicit.
- Importing the global module in every feature "just in case." One import is the registration. The extra imports are noise, not extra instances, for a static module.

**Senior-Level Follow-up:**

A feature test calls `Test.createTestingModule({ imports: [OrdersModule] })` and fails to resolve `ConfigService`, while the real application boots. What is the likely shape of the graph?

`OrdersModule` injects `ConfigService` and does not import the module that provides it. Production works because `AppModule` imports `@Global() ConfigModule`. The testing module never imported `ConfigModule`, so the token is absent in that compilation. Add the import to the test, or stop using a global for this dependency and import `ConfigModule` from `OrdersModule` directly.

### NEST-011 — Circular module imports

**Difficulty:** Senior

**Category:** Modules

**Question:**

`OrdersModule` imports `BillingModule`, and `BillingModule` imports `OrdersModule`. Startup fails or sees `undefined` in an `imports` array. What is actually circular, when does `forwardRef` apply, and what design removes the cycle?

**Context and Constraints:**

NestJS 10. Both files are value-imported, not through a barrel. Providers are default scope. You may change the module graph. Provider-level cycles may exist between `OrdersService` and `BillingService` as well.

**Senior Engineer's Answer:**

There are two different cycles that show the same symptom. The first is a JavaScript cycle: evaluating `orders.module.ts` starts evaluating `billing.module.ts`, which asks for `OrdersModule` before its class finishes initializing, so the binding is `undefined` while `@Module({ imports: [...] })` runs. Nest then reports that an `imports` entry is undefined. The second is a real module-graph cycle: both classes exist, and each module context needs the other's exports. Nest can construct that graph only if both `imports` arrays defer the reference.

`forwardRef(() => OtherModule)` from `@nestjs/common` is that deferral. Both sides use it. The callback runs later, when both classes have been initialized, and the scanner records a real module. A provider cycle is the same idea at token level: each constructor uses `@Inject(forwardRef(() => OtherService))`. One side is not enough, because the other side still captures an unfinished binding. The docs are explicit that construction order across a provider cycle is indeterminate, so neither constructor may assume the other constructor has run.

`forwardRef` makes a legal graph. It does not make a healthy one. The usual extraction is a third module that owns the shared provider, with `OrdersModule` and `BillingModule` both importing that module and neither importing the other. If the cycle is only "each service calls the other," one direction can become an event or a narrower interface living in the third module, so the dependency arrow points one way.

**Practical Implementation:**

```typescript
import { forwardRef, Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [forwardRef(() => BillingModule)],
})
export class OrdersModule {}
```

```typescript
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { BillingService } from '../billing/billing.service';

@Injectable()
export class OrdersService {
  constructor(
    @Inject(forwardRef(() => BillingService))
    private readonly billing: BillingService,
  ) {}
}
```

**Trade-offs and Alternatives:**

`forwardRef` is the smallest code change and preserves the current call directions. Initialization order stays unspecified, and the next person to add a third participant inherits the knot. A third module is more files and a stable direction of dependency. `ModuleRef` can look a provider up after both exist; that is a DI-chapter tool, and it still leaves the design cycle in place. Prefer the third module unless the domain truly is mutually recursive.

**Common Mistakes:**

- Wrapping only one of the two modules in `forwardRef`.
- Using `forwardRef` on the module import and forgetting `@Inject(forwardRef(() => ...))` on the provider cycle, or the reverse.
- Calling the injected collaborator from the constructor. With a cycle, that collaborator may not be constructed yet.
- "Fixing" an `undefined` import by reordering files. Evaluation order is not a module design.

**Senior-Level Follow-up:**

After `forwardRef` is in place, `OrdersService`'s constructor reads `this.billing.ready`, and `ready` is set at the end of `BillingService`'s constructor. What do you tell the author?

The framework does not promise which constructor runs first. Move the read out of both constructors into a method that runs after startup, or remove the cycle so `BillingService` is a normal dependency whose constructor has finished before `OrdersService` is constructed.

### NEST-012 — A file on disk is not in the application

**Difficulty:** Intermediate

**Category:** Project structure

**Question:**

`src/shipping/shipping.module.ts` defines `ShippingModule` with a controller and a provider. No other file mentions `ShippingModule`. `nest start` boots, and `GET /shipping` 404s. The class is compiled. Why is the route absent?

**Context and Constraints:**

NestJS 10 CLI layout. `main.ts` bootstraps `AppModule` only. TypeScript includes `src/**/*.ts`. There is no global module.

**Senior Engineer's Answer:**

The scanner starts at the module passed to `NestFactory.create()` and follows `imports`. A class file that TypeScript emitted is still ordinary JavaScript until some scanned module names it. `ShippingModule` is never visited, so its `controllers` metadata is never read, its providers are never instantiated, and its lifecycle hooks never run. The 404 is the HTTP adapter having no route, which is the expected result of an empty registration, not a routing bug inside `ShippingController`.

The fix is an import edge from a module that is already reachable, usually `AppModule` for a top-level feature. After that edge exists, the controller prefix and the method decorators are picked up on the next boot because they were always on the class; they simply had no reader.

Tests can hide this. A spec that imports `ShippingModule` directly into `Test.createTestingModule` compiles a private graph that production never builds. The spec passes and the process still has no route. The production graph is whatever `AppModule` reaches.

**Practical Implementation:**

```typescript
import { Module } from '@nestjs/common';
import { ShippingModule } from './shipping/shipping.module';

@Module({
  imports: [ShippingModule],
})
export class AppModule {}
```

**Trade-offs and Alternatives:**

Importing every feature from `AppModule` makes the composition root a table of contents, which is what you want for a single deployable. Importing a feature only from the feature that uses it is better when the feature is an implementation detail. Both are explicit. A convention of "any file matching `*.module.ts` is auto-loaded" is not something Nest does, and adding a custom directory scan would be a second registry beside `imports`.

**Common Mistakes:**

- Assuming the CLI compiles a module into the running graph because the file sits under `src/`.
- Registering the controller in `ShippingModule` and also in `AppModule`'s `controllers` while leaving `ShippingModule` unimported. The duplicate registration is a different structure and still leaves `ShippingModule`'s providers out.
- Debugging the 404 by changing the `@Controller()` path before checking `AppModule.imports`.

**Senior-Level Follow-up:**

How do you list the modules the running process actually contains?

After `create()`, the application container holds the modules the scanner visited. `app.get` / `app.select` can resolve tokens only from that set. A practical check in review is to read `AppModule` and walk `imports` until every feature you expect has a path from the root. A module with no such path is not part of this process.

### NEST-013 — Sharing one instance across modules

**Difficulty:** Senior

**Category:** Providers

**Question:**

`OrdersModule` and `BillingModule` both need the same `TaxService` instance: one cache, one configuration, one set of in-memory rates loaded at startup. How do you register it so both modules share that instance, and what registration accidentally gives them two?

**Context and Constraints:**

NestJS 10, default scope, no global module. `TaxService` has mutable cache fields. Both feature modules are imported by `AppModule`. They do not import each other.

**Senior Engineer's Answer:**

One registration, then exports, then imports. Put `TaxService` in a module that owns tax, `providers` and `exports`. Import that module from `OrdersModule` and from `BillingModule`. Both constructors receive the cached instance that belongs to the exporting module. This is the same rule as NEST-005, applied to a graph: default scope shares an instance across modules only when those modules resolve the same registration.

A second `providers: [TaxService]` inside `OrdersModule` is a new registration owned by `OrdersModule`. Its constructor runs too. Its cache is a different object. Calls through `OrdersService` and `BillingService` diverge, and a bug report that "tax rates randomly differ by endpoint" is often this split. Deleting the extra `providers` entry and importing the owning module is the fix. `@Global()` would also share the one instance, and it would hide the edge; NEST-010 is why that is the wrong fix for a domain service.

If `OrdersModule` must re-publish `TaxService` to its own children, it can name `TaxService` in its `exports` after importing the owning module, or it can re-export the whole module. It still should not list `TaxService` in its own `providers`.

**Practical Implementation:**

```typescript
@Module({
  providers: [TaxService],
  exports: [TaxService],
})
export class TaxModule {}

@Module({
  imports: [TaxModule],
  providers: [OrdersService],
})
export class OrdersModule {}

@Module({
  imports: [TaxModule],
  providers: [BillingService],
})
export class BillingModule {}
```

**Trade-offs and Alternatives:**

A dedicated `TaxModule` is another folder and an obvious owner. Colocating `TaxService` inside `OrdersModule` and exporting it creates an owner, and it also forces billing to depend on the orders module, which is how cycles start. Duplicating the class with two registrations is acceptable only when the two instances are supposed to differ (two clients, two configs), and then they should be two tokens so the difference is visible.

**Common Mistakes:**

- Copying the class into both `providers` arrays because both services fail injection.
- Exporting `TaxService` from `OrdersModule` without providing or importing it.
- Making `TaxModule` global to avoid two import lines.
- Assuming a TypeScript `new TaxService()` in one of the services participates in the cache. It is a third object, outside the container.

**Senior-Level Follow-up:**

`TaxService.onModuleInit` loads rates from the database. With the shared registration, how many times does that load run?

Once. There is one instance, and `onModuleInit` is invoked on that instance during the tax module's initialization. Two registrations would load twice, back to back, into two caches.

### NEST-014 — useClass, useValue, useFactory, and useExisting

**Difficulty:** Senior

**Category:** Providers

**Question:**

The shorthand `providers: [TaxService]` only covers "this token constructs this class." When do you write `useClass`, `useValue`, `useFactory`, and `useExisting` instead, what does the container store for each, and how are dependencies declared?

**Context and Constraints:**

NestJS 10. Registrations live in a `@Module()` `providers` array. Default scope. A factory may be asynchronous. `ConfigService` is already exported by a `ConfigModule` imported into this module.

**Senior Engineer's Answer:**

`providers: [TaxService]` is exactly `{ provide: TaxService, useClass: TaxService }`. You write `useClass` out when the token and the constructed class differ. `{ provide: TaxService, useClass: DbTaxService }` means a constructor that asks for `TaxService` receives an instance of `DbTaxService`. Nest still builds `DbTaxService` through its own constructor metadata, so that class's dependencies are registered in the usual way. This is the form for an environment-specific implementation or a test double that should still be constructed by the container.

`useValue` stores the value you already hold. Nest does not call a constructor and does not inject dependencies into that value. The expression is evaluated when the module file is evaluated. Use it for a constant, a mock object, or a client a third-party function has already created. If producing the value requires other providers, it is a factory, not a value captured at import time.

`useFactory` calls your function and uses the return value as the provider. A returned promise is awaited before anyone can inject the result, so an async factory can open a client during `NestFactory.create()`, which is when providers are instantiated. Parameter types on the factory function are not read from `design:paramtypes`. The `inject` array is the full argument list, in order. An optional argument is `{ token, optional: true }` in that array. This is the form for "build this from other providers" when a class constructor is the wrong shape.

`useExisting` adds a second token for a provider that already exists. `{ provide: 'TAX_PORT', useExisting: TaxService }` and a direct `TaxService` injection share one default-scope instance. The same shape with `useClass: TaxService` would construct another instance under the new token. Export a custom provider by its token (`exports: ['RATES_URL']`) or by listing the same provider object. The token is the name other modules are allowed to see.

**Practical Implementation:**

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '../config/config.module';
import { ConfigService } from '../config/config.service';
import { DbTaxService } from './db-tax.service';
import { TaxService } from './tax.service';

@Module({
  imports: [ConfigModule],
  providers: [
    { provide: TaxService, useClass: DbTaxService },
    {
      provide: 'RATES_URL',
      useFactory: async (config: ConfigService) => config.ratesUrl(),
      inject: [ConfigService],
    },
    { provide: 'BUILD_STAMP', useValue: 'dev' },
    { provide: 'TAX_PORT', useExisting: TaxService },
  ],
  exports: [TaxService, 'RATES_URL', 'TAX_PORT'],
})
export class TaxModule {}
```

**Trade-offs and Alternatives:**

A class with constructor injection stays the easiest thing to read and to replace in a test module. A factory is justified when construction is a sequence: read config, await a handshake, return an object the container should cache. `useValue` is justified when the object already exists and has no dependencies left to resolve. `useExisting` is justified when two tokens must be one instance; `useClass` is justified when two tokens must be two instances. String tokens need `@Inject('RATES_URL')` at the consumer. A class token does not.

**Common Mistakes:**

- Omitting `inject` and expecting the factory's TypeScript parameters to be filled in. They stay empty, or they are `undefined`.
- Using `useClass` to "alias" a token and then discovering a second instance with a second cache.
- Putting a `new Client(config)` call in `useValue` while `config` is itself a provider. That call runs at import time, before the container exists. Move it to `useFactory`.
- Exporting the class `DbTaxService` when the public token is `TaxService`. Consumers inject the token you exported.

**Senior-Level Follow-up:**

A factory's second dependency is optional. How is that declared, and what is injected when the token was never registered?

Add `{ token: SOME_TOKEN, optional: true }` as an `inject` entry. Nest passes `undefined` for that argument and still awaits the factory. `@Optional()` is the constructor-parameter equivalent; it does not apply to factory parameters. The factory has to handle the missing value itself.

### NEST-015 — Interfaces, abstract classes, and tokens

**Difficulty:** Intermediate

**Category:** Dependency injection

**Question:**

`LoggerPort` is a TypeScript interface. `OrdersService` wants to depend on that shape, and a test should bind a fake without editing the service. Why can the interface not be the provider token, and which two runtime tokens do people actually use?

**Context and Constraints:**

NestJS 10 with `emitDecoratorMetadata` enabled. `LoggerPort` has one method, `log(message: string): void`. Production binds a pino-backed class. Tests bind an in-memory fake.

**Senior Engineer's Answer:**

Nest resolves providers by values that exist when the process is running: a class (a function), a string, a symbol, or an enum. A TypeScript interface is erased. It cannot appear in `design:paramtypes`, and it cannot appear as `provide: LoggerPort`. If the constructor parameter is typed only as the interface, the emitted design type is `Object`, and the unknown-dependency error names `Object` or fails to name a real token. The interface remains useful as the compile-time shape of the parameter. It is not the lookup key.

A symbol (or a string constant) is a runtime token that is decoupled from any class. Register `{ provide: LOGGER_PORT, useClass: PinoLogger }`, and inject with `@Inject(LOGGER_PORT) private readonly logger: LoggerPort`. Export the same symbol from one module. Two `Symbol('LOGGER_PORT')` calls are two keys; the writer and the reader must share one binding. Symbols are the safer library token because a string `'LOGGER_PORT'` collides if another module uses the same string.

An abstract class exists at runtime as a constructor function, so it can be both the TypeScript type and the token: `{ provide: LoggerPort, useClass: PinoLogger }` where `abstract class LoggerPort` declares `log`. The consumer then writes `constructor(private readonly logger: LoggerPort)` with no `@Inject()`. Nest reads the abstract constructor from `design:paramtypes` and constructs the `useClass` target. A test module rebinds the same token with `useClass: FakeLogger` or `useValue`.

**Practical Implementation:**

```typescript
import { Inject, Injectable, Module } from '@nestjs/common';

export interface LoggerPort {
  log(message: string): void;
}

export const LOGGER_PORT = Symbol('LOGGER_PORT');

@Injectable()
export class PinoLogger implements LoggerPort {
  log(message: string): void {
    // Hand off to the logging library.
    void message;
  }
}

@Module({
  providers: [{ provide: LOGGER_PORT, useClass: PinoLogger }],
  exports: [LOGGER_PORT],
})
export class LoggerModule {}

@Injectable()
export class OrdersService {
  constructor(@Inject(LOGGER_PORT) private readonly logger: LoggerPort) {}
}
```

**Trade-offs and Alternatives:**

An abstract class token keeps constructor injection looking like ordinary TypeScript and couples you to a real base type that every implementation extends or implements. A symbol plus an interface keeps the contract as a type-only surface and forces `@Inject()` at every consumer. Depending on the concrete `PinoLogger` class is shorter and makes the logging library part of every service's signature. Choose the symbol or the abstract class when more than one implementation must satisfy the same constructor.

**Common Mistakes:**

- Listing the interface in `providers`. It is not a value. The file will not compile, or the token will be `undefined`.
- Creating the symbol in the module file and again in the service file. They do not match.
- Using a string token inline in one file and a slightly different string in another (`'LoggerPort'` versus `'LOGGER_PORT'`).
- Importing the abstract class with `import type`. The token is erased the same way a concrete class token is erased.

**Senior-Level Follow-up:**

The test module supplies `{ provide: LOGGER_PORT, useValue: fake }`, and production uses `useClass: PinoLogger`. What does `OrdersService`'s constructor look like in both processes?

The constructor is unchanged. It asks for `LOGGER_PORT`. Each module graph binds that token differently. The test compiles a module that registers the fake; the application module registers `PinoLogger`. The service file does not branch on `NODE_ENV`.

### NEST-016 — What a dynamic module returns

**Difficulty:** Advanced

**Category:** Modules

**Question:**

`FeatureFlagsModule.forRoot(flags)` is called from `AppModule`'s `imports`. What does that static method return, how does it combine with the `@Module()` decorator on the class, and how does `FeatureFlagsService` receive `flags`?

**Context and Constraints:**

NestJS 10. `flags` is a `Record<string, boolean>` already in memory at startup. One call site, the root module. `forRoot` is an ordinary static method; the name is a convention, not a framework keyword. This is one of two questions in this set about dynamic modules.

**Senior Engineer's Answer:**

`forRoot` returns a `DynamicModule`: an object with the same fields as `@Module()` metadata, plus a required `module` property pointing at the module class. Nest accepts that object anywhere `imports` accepts a module. An optional `global: true` on the object is the dynamic-module equivalent of `@Global()`. The method may be `async` and return `Promise<DynamicModule>`; the scanner awaits it.

The properties on the returned object extend the metadata already stored by `@Module()` on the class. They do not replace it. If the class declares `providers: [FeatureFlagsService]` and `exports: [FeatureFlagsService]`, and `forRoot` adds `{ provide: FEATURE_FLAGS, useValue: flags }`, the resulting module has both the service and the flags token. Because they belong to the same module, `FeatureFlagsService` can `@Inject(FEATURE_FLAGS)` in its constructor. `FEATURE_FLAGS` is a string or symbol constant. It has to be, because the flags record is not a class.

That is the whole mechanism. There is no separate dynamic-module runtime. The static method is plain TypeScript that builds the provider list from arguments, and the scanner reads the object the same way it reads decorator metadata. Calling `forRoot` from a feature that is never imported still leaves the object unused. The returned module has to sit in a reachable `imports` array.

**Practical Implementation:**

```typescript
import { DynamicModule, Inject, Injectable, Module } from '@nestjs/common';

export const FEATURE_FLAGS = Symbol('FEATURE_FLAGS');

@Injectable()
export class FeatureFlagsService {
  constructor(@Inject(FEATURE_FLAGS) private readonly flags: Record<string, boolean>) {}

  isEnabled(flag: string): boolean {
    return this.flags[flag] ?? false;
  }
}

@Module({
  providers: [FeatureFlagsService],
  exports: [FeatureFlagsService],
})
export class FeatureFlagsModule {
  static forRoot(flags: Record<string, boolean>): DynamicModule {
    return {
      module: FeatureFlagsModule,
      providers: [{ provide: FEATURE_FLAGS, useValue: flags }],
    };
  }
}
```

**Trade-offs and Alternatives:**

A dynamic module is how an importing module passes values into providers without a global mutable config object. A static module that reads `process.env` inside `useFactory` is enough when the only input is the environment, and it avoids a `forRoot` ceremony. Passing flags through `forRoot` keeps the values in the composition root, where they can be reviewed, and it keeps `FeatureFlagsService` free of `process.env`. Library authors use this shape so application code can supply options without the library importing the application's files.

**Common Mistakes:**

- Forgetting `module: FeatureFlagsModule` on the returned object. The scanner then has no class to attach the metadata to.
- Assuming `forRoot`'s `providers` replace the `@Module()` providers. The service declared on the class is still registered, which is why it can inject `FEATURE_FLAGS`.
- Injecting `flags` by its TypeScript type. The record has no runtime token. Inject `FEATURE_FLAGS`.
- Treating the method name `forRoot` as something Nest discovers. Any static method that returns a `DynamicModule` works; the call site has to actually call it.

**Senior-Level Follow-up:**

`forRoot` needs a database connection that is itself a provider. Can the static method `@Inject()` that connection?

No. A static method is not a provider and has no constructor for Nest to fill. If the options depend on other providers, register an async `useFactory` in the returned `providers` array and list those providers in `inject`. The `forRootAsync` name used by some libraries is that pattern, not a separate framework hook. The container awaits the factory while it instantiates providers. A `flags` object the caller already holds does not need it.

### NEST-017 — When a dynamic module is the wrong seam

**Difficulty:** Advanced

**Category:** Modules

**Question:**

A reviewer sees `DatabaseModule.forRoot(options)` imported from `OrdersModule`, `BillingModule`, and `AppModule`, each with a slightly different `options` object. The author says each feature needs its own configuration. What is the framework actually set up to do here, and what shape should the review ask for instead?

**Context and Constraints:**

NestJS 10. `options` includes a connection string and a pool size. The process has one database. Features need to register their own entities or repositories later. This is the second, and last, dynamic-module question in this set. `@nestjs/typeorm`'s `forFeature` may be named as a library convention; it is not a Nest core primitive.

**Senior Engineer's Answer:**

A dynamic module exists so an importer can pass values into that module's providers. The Nest guide's shape is one configured import, usually from the composition root, for process-wide options. The module token Nest uses for deduplication includes the dynamic metadata, so "call `forRoot` again" is not a documented per-feature isolation feature. Two call sites with different option objects are a guess about which module instance and which pool you will get. One call site with one options object is the arrangement you can explain on a whiteboard.

Feature-specific registration is a second API that returns its own `DynamicModule` and adds feature-local providers, while the shared connection stays the one `forRoot` registered. `@nestjs/typeorm` documents this split as `forRoot` / `forFeature`. `forFeature` is that library's method, not a hook Nest calls. If this codebase needs the split, `DatabaseModule` should grow an explicit second method that registers repositories for one feature and imports cleanly beside a single `forRoot` in `AppModule`.

If the options never vary and never come from the importer, a static `@Module()` with a `useFactory` that reads configuration is the smaller design. Dynamic modules add a static method, a token for the options, and a merge rule between decorator metadata and the returned object. Pay for that only when the importing module must supply values.

**Practical Implementation:**

```typescript
@Module({
  imports: [
    DatabaseModule.forRoot({ connectionString: process.env.DATABASE_URL ?? '' }),
    OrdersModule,
    BillingModule,
  ],
})
export class AppModule {}

@Module({
  imports: [DatabaseModule.forFeature([Order])],
  providers: [OrdersService],
})
export class OrdersModule {}
```

**Trade-offs and Alternatives:**

One `forRoot` at the root makes the pool size and the connection string a process decision, which matches one database. It forces features to receive the connection through exports, which is the point of the module graph. Per-feature `forRoot` looks flexible and produces connection lifetime questions that the framework will not answer for you in review. Separate processes with separate roots are the real way to get two pools, each with its own `forRoot`, each in its own `NestFactory.create()`.

**Common Mistakes:**

- Copying `forRoot` into every feature module because each feature imports the database.
- Inventing a `forFeature` that re-supplies the connection string, so the string now lives in every feature.
- Using a dynamic module to publish a constant that could have been `useValue` on a static module.
- Changing option object identity on every import (`forRoot({ ...defaults })` inline in several files) and then debugging why startup built more than one module.

**Senior-Level Follow-up:**

The options are only known after an async config load that depends on `ConfigService`. Where does that async work go?

Inside the dynamic module, as a `useFactory` (or the library's `forRootAsync` convention) whose `inject` array includes `ConfigService`, with the factory declared `async`. The static `forRoot(options)` caller should not `await` a provider. The container awaits the factory while it instantiates providers during `create()`.

### NEST-018 — main.ts and the composition root

**Difficulty:** Intermediate

**Category:** Project structure

**Question:**

What belongs in `main.ts`, what belongs in `AppModule`, and which HTTP settings have to be applied before `listen()` because of when `init()` reads them?

**Context and Constraints:**

NestJS 10 HTTP application, Express adapter, single process. The team wants a global prefix `api`, shutdown hooks, and CORS. Domain code for orders already exists in `OrdersModule`. Validation pipes and guards are out of scope except as a boundary: they are not domain rules.

**Senior Engineer's Answer:**

`main.ts` is the process entry. It imports `NestFactory` first so `@nestjs/core` loads `reflect-metadata` before `AppModule` is evaluated, calls `NestFactory.create(AppModule)`, applies process-wide server settings, and `listen`s. Those settings include `setGlobalPrefix('api')`, `enableShutdownHooks()`, and `enableCors()`. The prefix is read when `init()` resolves routes, and `listen()` calls `init()` if it has not run, so the prefix is set on the object before `listen()`. Shutdown listeners have to be registered before a signal can arrive; the usual place is immediately after `create()` and before `listen()`.

`AppModule` is the composition root of the module graph. Its `imports` array is the list of feature modules and infrastructure modules this process contains. It should not declare route handlers or order-total calculations. Those stay in feature controllers and services. A provider registered directly on `AppModule` is process-wide by location, which is appropriate for almost nothing; infrastructure belongs in a named module the root imports, so the root stays a table of contents.

Domain branches do not belong in `bootstrap()`. An `if (process.env.NODE_ENV === ...)` that chooses which feature module to import is a composition decision and can live in `AppModule`'s `imports` expression, evaluated when the file loads, after the environment is already set. Connection retries, cache warming, and "wait until the sibling service is up" belong in lifecycle hooks on the module that owns the resource, where a rejected promise fails `init()` cleanly.

**Practical Implementation:**

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();
  app.enableCors();
  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
```

```typescript
import { Module } from '@nestjs/common';
import { BillingModule } from './billing/billing.module';
import { ConfigModule } from './config/config.module';
import { OrdersModule } from './orders/orders.module';

@Module({
  imports: [ConfigModule, OrdersModule, BillingModule],
})
export class AppModule {}
```

**Trade-offs and Alternatives:**

Keeping HTTP adapter calls in `main.ts` leaves `AppModule` free of Express/Fastify details, which keeps the same root usable from `createApplicationContext()` later. Moving `enableCors` into a middleware `configure()` method colocates it with other middleware and scatters process policy. Either is workable if there is one obvious place. What does not work is constructing `OrdersService` in `bootstrap()` and calling it before `listen()`: hooks have not run, and the call site is outside the composition root's module list.

**Common Mistakes:**

- Calling `setGlobalPrefix` after `await app.listen(...)`. Routes were already resolved inside that `listen()`.
- Importing `AppModule` before `@nestjs/core` in a custom entry file, then debugging empty `design:paramtypes`.
- Growing `AppModule.providers` into a list of every service in the product. The root becomes a second, undocumented module graph.
- Starting background work in `bootstrap()` with a floating promise so that `listen()` is not sequenced behind it.

**Senior-Level Follow-up:**

Global pipes and global guards can be registered with `app.useGlobalPipes` and `app.useGlobalGuards` in `main.ts`. Why might a module-level registration be easier to test?

`useGlobalPipes` and `useGlobalGuards` attach enhancers to the application object in `bootstrap()`, outside any `@Module()`. A testing module that imports `OrdersModule` does not replay `main.ts`, so those globals silently disappear in tests. Registering them through a module (the `APP_PIPE` / `APP_GUARD` tokens, which the later pipeline chapters cover) keeps them inside the graph a test can import. `main.ts` stays the place for prefix, CORS, shutdown, and `listen()`.

### NEST-019 — create() versus createApplicationContext()

**Difficulty:** Senior

**Category:** Lifecycle

**Question:**

A worker process should run `OrdersService.rebuild()` once and exit. It has no port. Compare `NestFactory.create()` plus `listen()` with `NestFactory.createApplicationContext()`. What is initialized in each case, and what does not run when you call a controller method yourself?

**Context and Constraints:**

NestJS 10.4. The worker uses the same `AppModule` as the HTTP service, including `OrdersModule`. Providers are default scope. The worker must wait until `onModuleInit` has finished before calling `rebuild()`. It must `close()` when the job ends so shutdown hooks run.

**Senior Engineer's Answer:**

`NestFactory.create()` returns an HTTP application after the scan and after provider construction, and it does not call `init()`. Hooks and route binding wait for `app.init()` or `app.listen()`. `NestFactory.createApplicationContext(AppModule)` builds the same kind of container and then calls `context.init()` before it resolves. When that promise resolves, `onModuleInit` and `onApplicationBootstrap` have already been awaited. There is no HTTP adapter, no route table, and no port.

`context.get(OrdersService)` returns the singleton. `await orders.rebuild()` is an ordinary method call. Guards, interceptors, pipes, and middleware do not wrap it. The standalone-application guide states this directly: those features are tied to request handling, and calling a controller method retrieved from the context does not execute them. Put the work you need in the service. Use the controller only in the HTTP process.

Shutdown is `await context.close()`. That runs `onModuleDestroy`, `beforeApplicationShutdown`, and `onApplicationShutdown`, and it does not exit the process by itself. If `rebuild()` started timers, close them in a hook or the worker stays alive after `close()`. Signal handling is still opt-in through `enableShutdownHooks()` if the worker should also stop on `SIGTERM` mid-job.

**Practical Implementation:**

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { OrdersService } from './orders/orders.service';

async function main(): Promise<void> {
  const ctx = await NestFactory.createApplicationContext(AppModule);
  try {
    await ctx.get(OrdersService).rebuild();
  } finally {
    await ctx.close();
  }
}

void main();
```

**Trade-offs and Alternatives:**

Reusing `AppModule` in the worker reuses registrations and hooks, and it also boots every imported feature, including HTTP-only controllers' providers. A slimmer `WorkerModule` that imports only the modules `rebuild()` needs starts faster and makes the worker's graph honest. Calling `NestFactory.create()` and never `listen()` leaves hooks unrun, so `rebuild()` would observe half-initialized clients. Calling `listen(0)` just to force `init()` opens a port the worker does not want.

**Common Mistakes:**

- Assuming `create()` and `createApplicationContext()` both run lifecycle hooks before they resolve. Only the application context calls `init()` for you.
- Invoking a controller method from the worker and expecting its guards to authorize the call. They will not run.
- Forgetting `close()`, so client connections and the "dependencies initialized" process remain until the supervisor kills it.
- Booting the HTTP `main.ts` with a `WORKER=1` branch inside a controller. The entry file is the branch. The module graph can be the smaller one.

**Senior-Level Follow-up:**

`createApplicationContext` resolves, and a provider's `onApplicationBootstrap` starts a `setInterval`. The job finishes and `close()` resolves, but the process does not exit. Why?

`close()` runs shutdown hooks and does not call `process.exit()`. The interval is still a ref'd handle. Clear it in `onModuleDestroy` or `onApplicationShutdown`. After the last handle is gone, Node can exit on its own.

### NEST-020 — What the HTTP adapter owns

**Difficulty:** Advanced

**Category:** Architecture

**Question:**

The service runs on Express today. A proposal is to pass `new FastifyAdapter()` into `NestFactory.create` for the throughput. Which parts of the application stay the same, which parts are adapter-owned, and what would you refuse to rewrite under time pressure?

**Context and Constraints:**

NestJS 10. The alternative package is `@nestjs/platform-fastify`, and the class is `FastifyAdapter`. Controllers use `@Get` / `@Post` and return plain values. A few filters and middleware call `res.setHeader` and import `Request` from `express`. No microservices.

**Senior Engineer's Answer:**

If `create` is given one argument, Nest loads `ExpressAdapter` from `@nestjs/platform-express` and builds the HTTP server itself. The two-argument form `NestFactory.create(AppModule, new FastifyAdapter())` uses that adapter instead. The module scanner, the container, provider scope, lifecycle hooks, and `@Module` metadata do not change with the adapter. `@Controller` and `@Get` still store metadata. During `init()`, the routes resolver asks the adapter to register those routes. The adapter owns the server, the body parser, CORS implementation, and the request and response objects.

Code that stays on the Nest side is safe to move: modules, providers, controllers that return values (so Nest writes the response), and lifecycle hooks. Code that reaches through the adapter is not. `app.use(...)` forwards to `httpAdapter.use`. Express middleware and `express.Request` typings do not become Fastify hooks by passing the adapter. A filter that calls Express `res.setHeader` is coupled to Express types. Fastify's reply object has a different surface. Those call sites are the migration, not the module graph.

The framework's application object also proxies unknown methods to the adapter in Nest 10.4, which is why some Express response helpers appear to exist on `app`. That proxy is convenient and hides the boundary. Treat it as an adapter escape hatch. A method you cannot find on `INestApplication` is not a Nest API, and it is not portable.

**Practical Implementation:**

```typescript
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, new FastifyAdapter());
  await app.listen(3000, '0.0.0.0');
}

void bootstrap();
```

**Trade-offs and Alternatives:**

Staying on Express keeps the middleware ecosystem and the current filters. Moving the adapter is a deployment change with a real compatibility audit, not a constructor flag you flip on a Friday. If the goal is less framework overhead on a hot JSON route, measure that route on the current adapter before introducing a second HTTP implementation. Returning plain objects from controllers, and keeping Express types out of services, is the portable subset you can do before any adapter decision.

**Common Mistakes:**

- Expecting `@nestjs/platform-express` types to compile against Fastify because the controller decorators look the same.
- Injecting the Express response into a service via `@Res()` and threading it into domain code. The service is then an adapter client.
- Importing `FastifyAdapter` without adding `@nestjs/platform-fastify`. Nest does not bundle that adapter inside `@nestjs/core`.
- Calling an Express-only helper that happened to work through the method proxy, and describing it as a Nest API in a design review.

**Senior-Level Follow-up:**

Where should a raw body for webhook signature checks be enabled, and why is that an adapter concern?

It is a parser option on the HTTP adapter (`rawBody: true` in the Nest application options is the supported switch so the adapter keeps the unparsed buffer). The signature comparison stays in a guard or controller after the parser has stored that buffer. Re-implementing the body parser inside a service forks the adapter and will disagree with whatever Express or Fastify already consumed.

### NEST-021 — What is unsafe in a constructor

**Difficulty:** Senior

**Category:** Lifecycle

**Question:**

`PaymentsService` injects `ClientsService`. Its constructor calls `this.clients.ping()`, and `ping()` depends on a socket that `ClientsService` opens inside `onModuleInit`. The bug is intermittent at startup. Explain the ordering the container actually gives you, and where the ping should move.

**Context and Constraints:**

NestJS 10.4 HTTP application. Both services are default-scope singletons. `ClientsModule` is imported by `PaymentsModule`, and `ClientsService` is exported. There is no provider cycle. Startup must fail if the client cannot connect.

**Senior Engineer's Answer:**

During `NestFactory.create()`, the instance loader constructs providers. For a given class, each constructor argument is created before that class's constructor runs. So `ClientsService`'s constructor has finished before `PaymentsService`'s constructor body runs. That is the entire guarantee. `onModuleInit` has not run on either instance, because hooks run later, inside `init()`, which `listen()` calls. `this.clients.ping()` in the payments constructor observes a `ClientsService` that exists and is not yet connected. When the socket happens to be ready for another reason, the bug disappears. That is an ordering accident, not a contract.

`ClientsService.onModuleInit` is where the socket is opened, and it should return the promise of that open so Nest awaits it before finishing the clients module. `PaymentsService` can ping in its own `onModuleInit`. Because `ClientsModule` is an import of `PaymentsModule`, Nest 10.4 runs the imported module's `onModuleInit` pass, and awaits it, before the payments module's pass. The ping then sees a connected client. If the ping throws or the returned promise rejects, `init()` fails and `listen()` does not bind.

Do not "fix" this by moving the connect call into the `ClientsService` constructor as a floating promise. Constructors are synchronous from Nest's point of view. A promise started there is not part of the hook sequence, so `PaymentsService.onModuleInit` can still win the race, and a rejection becomes an unhandled rejection instead of a failed boot.

**Practical Implementation:**

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ClientsService } from '../clients/clients.service';

@Injectable()
export class PaymentsService implements OnModuleInit {
  constructor(private readonly clients: ClientsService) {}

  async onModuleInit(): Promise<void> {
    await this.clients.ping();
  }
}
```

**Trade-offs and Alternatives:**

Hook-based startup makes boot slower and makes a downed dependency a failed deployment, which is what you want for a required client. Lazy connect on the first request boots faster and turns the first user into the integration test. For a required dependency, fail in `onModuleInit`. Use `onApplicationBootstrap` only if the ping must wait for sibling modules that `PaymentsModule` does not import. NEST-008 is that distinction.

**Common Mistakes:**

- Treating "the dependency is in the constructor" as "the dependency has finished `onModuleInit`."
- Starting I/O in the constructor because the method is `async`. The constructor still returns the instance immediately. Nest does not await it.
- Catching the connection error in the constructor and logging it, so the process listens while the client is dead.
- Calling the collaborator from a constructor that is part of a `forwardRef` cycle. Even the "constructor has finished" guarantee is gone in that case. NEST-011.

**Senior-Level Follow-up:**

`ClientsService` is provided by a global module imported only from `AppModule`, and `PaymentsModule` does not import it. Does `PaymentsService.onModuleInit` still run after `ClientsService.onModuleInit`?

It does in the distance walk Nest 10.4 uses: global modules are initialized with the modules farthest from the root, and the root's own hooks are last. That is a weak guarantee to build a design on, because the payments module never declared the edge. Import `ClientsModule` from `PaymentsModule` (and keep the global decorator off if NEST-010 applies). The import edge is what makes the order a property of the graph rather than a property of distance numbers.

### NEST-022 — Exports, re-exports, and the boundary

**Difficulty:** Advanced

**Category:** Modules

**Question:**

`CommerceModule` imports `TaxModule` and `OrdersModule`. A new `ReportsModule` should inject `TaxService` and should not import `TaxModule` itself, because the team wants a single "commerce" facade. How do re-exports work, and what does `ReportsModule` still not get?

**Context and Constraints:**

NestJS 10. `TaxModule` provides and exports `TaxService` and also provides `TaxRepository`, which it does not export. `OrdersModule` has `OrdersController`. No global module. Default scope. Reports must share the existing `TaxService` instance.

**Senior Engineer's Answer:**

`exports` is the only list other modules can inject. `TaxRepository` stays invisible outside `TaxModule` because it is absent from `exports`. `TaxService` is visible to any module that imports `TaxModule`, including `CommerceModule`. A module may also export a provider it only imported, or export the imported module itself. `exports: [TaxModule]` on `CommerceModule` re-publishes whatever `TaxModule` exports. `exports: [TaxService]` publishes that one token, and only if `CommerceModule` imported a module that exports it (or provided it). `ReportsModule` then imports `CommerceModule` and injects `TaxService`. It receives the same instance `TaxModule` constructed. It does not gain `TaxRepository`.

Re-exporting does not copy providers into a new registration. The token still resolves to the owning module's instance. That is why this facade preserves the cache from NEST-013. It also means `ReportsModule`'s metadata claims it depends on `CommerceModule`, while the class it actually needs is `TaxService`. The facade is honest only if commerce is a real boundary. If reports and orders have nothing in common except tax, both should import `TaxModule` and the facade is an extra hop that hides the owner.

Controllers are not part of this surface. Exporting `OrdersModule` does not let `ReportsModule` "mount" or inject the controller as a way to reuse HTTP behavior. Routes are registered from the module that lists the controller, once that module is reachable from the root. Shared behavior is a provider both modules import.

**Practical Implementation:**

```typescript
@Module({
  imports: [TaxModule, OrdersModule],
  exports: [TaxModule],
})
export class CommerceModule {}

@Module({
  imports: [CommerceModule],
  providers: [ReportsService],
})
export class ReportsModule {}
```

**Trade-offs and Alternatives:**

A facade module shortens the imports of many downstream modules and becomes a junk drawer the moment it re-exports everything to spare people a decision. Direct imports of `TaxModule` are noisier and point at the owner. Prefer the direct import until at least two features need the same curated subset, and make that subset an explicit `exports` list rather than `exports: [TaxModule, OrdersModule, BillingModule]`.

**Common Mistakes:**

- Adding `TaxRepository` to `CommerceModule`'s `exports` without importing a module that exports it. Nest refuses the export because the token is not part of this module.
- Re-providing `TaxService` in `CommerceModule` "so the export is local." That is a second instance.
- Expecting `ReportsModule` to see providers that `TaxModule` never exported, because a higher module re-exported `TaxModule`. Re-export forwards the public surface only.
- Trying to share `OrdersController` so a report can return the same HTTP payload. Extract the query into a provider.

**Senior-Level Follow-up:**

`ReportsService` injects `TaxRepository` and the author adds `TaxModule` to `ReportsModule.imports` while also importing `CommerceModule`. How many `TaxService` instances exist?

Still one, as long as neither module lists `TaxService` in its own `providers`. Importing `TaxModule` twice in the graph reuses that module. The extra import makes `TaxRepository` visible only if `TaxModule` exports it. If it does not, the repository injection still fails, which is the encapsulation working.

### NEST-023 — Barrel files and undefined modules

**Difficulty:** Advanced

**Category:** Project structure

**Question:**

`orders/index.ts` re-exports the controller, the service, and `OrdersModule`. `BillingModule` imports `{ OrdersModule }` from `../orders`. Startup says an `imports` entry is undefined, sometimes only after a "clean" compile. What is the evaluation order doing, and what is the durable fix?

**Context and Constraints:**

NestJS 10, TypeScript, Node CommonJS or ESM as the Nest CLI emits it. The cycle is between barrel files, not an intentional domain cycle between orders and billing. `forwardRef` is available and is not the preferred fix. The Nest circular-dependency guide calls out this case.

**Senior Engineer's Answer:**

A barrel is a second module graph, the JavaScript one, laid over Nest's. Evaluating `billing.module.ts` evaluates `orders/index.ts`, which evaluates `orders.module.ts` and the service, which imports something that comes back through the billing barrel before `OrdersModule`'s class initializer has finished. The binding `OrdersModule` is then `undefined` at the moment `@Module({ imports: [OrdersModule] })` runs. Nest stores that `undefined` in the imports metadata and fails while creating the module, typically reporting that the module at a given index of the `imports` array is undefined. A clean compile changes evaluation order enough to flip the symptom. That is a property of the cycle, not a flaky compiler.

`forwardRef(() => OrdersModule)` often papers over it, because the callback runs after both files have finished evaluating. The Nest docs still say to avoid barrels for module and provider classes, and in particular to avoid importing a barrel from inside the directory that barrel represents. The durable fix is a direct file import: `import { OrdersModule } from '../orders/orders.module'`. Delete the barrel, or stop exporting Nest classes from it. Values that are only types can stay on `import type` and do not create a runtime cycle.

This is distinct from NEST-011. There, both classes exist and the module graph is genuinely cyclic, so `forwardRef` on both sides is the framework feature. Here the domain graph may be acyclic and the file graph is not. Adding `forwardRef` without deleting the barrel leaves the next circular import one re-export away.

**Practical Implementation:**

```typescript
import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { BillingService } from './billing.service';

@Module({
  imports: [OrdersModule],
  providers: [BillingService],
})
export class BillingModule {}
```

**Trade-offs and Alternatives:**

Direct imports are longer paths and they survive barrels being deleted. Barrels make `import { OrdersModule, OrdersService } from '../orders'` pleasant and make decorator evaluation order part of the design. Path aliases (`@app/orders/...`) do not fix a cycle; they only rename it. If a public package needs a barrel, keep Nest module classes out of it and export a dedicated `orders.module.ts` entry that application code imports by file.

**Common Mistakes:**

- Reordering export lines in `index.ts` until the error disappears, and checking that in as the fix.
- Wrapping the undefined import in `forwardRef` and keeping the barrel. The undefined value is a file-order bug.
- Switching the import to `import type`. The module class disappears at runtime and the imports entry is undefined for a new reason.
- Describing the failure as "Nest cannot handle circular dependencies." The framework has `forwardRef`. This failure is the module graph receiving `undefined` because the file graph has not finished.

**Senior-Level Follow-up:**

How do you prove the barrel is the cause before editing half the repo?

Replace the barrel import with a direct file import in the module that logs the undefined entry. If the error moves or disappears, the barrel cycle is implicated. Then search for `from '../orders'` and `from './'` inside `orders/` that resolve to `orders/index.ts`. The Nest guide's concrete rule: a file next to the barrel should not import that barrel to reach its sibling.

### NEST-024 — The module graph is the dependency manifest

**Difficulty:** Staff-Level

**Category:** Architecture

**Question:**

You are reviewing a Nest 10 service that has grown to about forty modules. Feature teams want more `@Global()` modules "so imports stop breaking builds." What do you look at, what do you insist stays explicit, and how can you demonstrate that a token is or is not part of a feature's context?

**Context and Constraints:**

One deployable, `AppModule` at the root, NestJS 10.4. `app.get(Token)` defaults to `strict: false` and searches the whole container. `app.select(SomeModule).get(Token, { strict: true })` looks only in the selected module context and throws `UnknownModuleException` if that module was never scanned. No dynamic-module redesign in this question. Request and transient scopes are out of scope.

**Senior Engineer's Answer:**

The review artifact is the module graph, starting at `AppModule.imports` and walking each feature's `imports` and `exports`. A feature module should name the tokens it is allowed to use by importing the module that exports them. `providers` that are missing from `exports` are implementation details. That pair of lists is the dependency manifest. It is what a new process, a test's `Test.createTestingModule`, and a future split into two deployables will honor. A build that "stops breaking" because everything is global has stopped expressing dependencies. The failures move from compile-time metadata to runtime resolution in whatever entry point forgot the one magical import.

Keep `@Global()` for a short, reviewed list of process-wide ports (configuration is the usual member). Each one is imported once from the root and still has an `exports` list. Feature services, repositories, and HTTP clients stay off that list. When two features share an instance, introduce the owning module and import it. When a cycle appears, extract the shared token instead of marking both sides global. NEST-010 and NEST-011 are the local rules; the staff-level rule is that the set of exceptions fits on a page and has an owner.

`app.get(TaxService)` with the default `strict: false` answers "does this process contain some registration of this token?" It will find a provider buried in a module the feature never imported, and it will find a global. That is the wrong question in review. `app.select(OrdersModule).get(TaxService, { strict: true })` answers "can this module's context see this token?" A failure there is an encapsulation result you can discuss. A success that depends on `@Global()` is a result you can see only by also reading the global list, which is why that list must stay short. `select` on a module that is not reachable from the root throws, which is the NEST-012 failure mode showing up in the review harness.

**Practical Implementation:**

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { OrdersModule } from './orders/orders.module';
import { TaxService } from './tax/tax.service';

async function assertOrdersCanSeeTax(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.select(OrdersModule).get(TaxService, { strict: true });
  await app.close();
}
```

**Trade-offs and Alternatives:**

Explicit imports add lines to every feature module and make ownership obvious in code review. Global modules remove lines and make ownership tribal. A generated dependency diagram is useful as a picture of the same metadata; it is not a second source of truth. If the diagram and `imports` disagree, the scanner is right and the diagram is stale. Tooling that auto-imports tokens into whatever module injects them erases the manifest on purpose. Prefer a failing boot over a tool that papers over a missing import.

**Common Mistakes:**

- Using a green `app.get(Service)` as evidence a feature is allowed to use `Service`.
- Growing `@Global()` every time an unknown-dependency error names a service another team owns.
- Maintaining a spreadsheet of module dependencies beside `AppModule` and letting the spreadsheet drift. The metadata is the spreadsheet.
- Calling `select` with a module the root never imports, then treating `UnknownModuleException` as a missing provider. The module is absent from the container. Walk `imports` from `AppModule` before changing the token.

**Senior-Level Follow-up:**

Two teams want to split the process into an orders service and a billing service. What in today's graph predicts the extraction cost?

Every `imports` edge from an orders module to a billing module, every provider both sides construct by duplicating a registration instead of sharing an owner, and every `@Global()` token both sides inject without an import. Those are the hidden runtime couplings. A graph where orders imports a small exported `TaxModule`, and billing does the same, splits by copying that module and choosing a new process boundary. A graph where both inject a global `CommerceContext` that holds repositories for every aggregate does not split; it has to be redesigned first.

### NEST-025 — How a multi-feature codebase should be laid out

**Difficulty:** Staff-Level

**Category:** Project structure

**Question:**

Propose the source layout and composition root for a Nest 10 product with orders, billing, and a small shared kernel. Then say what changes when a second deployable (a worker) needs the orders domain, and what you will not do to get there.

**Context and Constraints:**

TypeScript, NestJS 10 CLI. One HTTP application today. The worker from NEST-019 is planned: it needs `OrdersService` and configuration, and it must not open a port. Shared code is a logging port and a clock, not a grab bag. Default scope throughout.

**Senior Engineer's Answer:**

The HTTP process has one composition root, `AppModule`, imported by `main.ts`. `AppModule` imports feature modules and one infrastructure module. It does not declare controllers, and it does not accumulate a `providers` list of the whole product. Each feature is a directory with `*.module.ts`, a controller, and providers. The feature module's `exports` list is the only thing another feature may import. `shared/` holds the logging port and the clock, exported by `SharedModule`, imported explicitly by the features that use them. It is not `@Global()`. Configuration can be the one global module, imported once from `AppModule`, because NEST-010's cost is acceptable for a token every module would name anyway.

```text
src/
  main.ts
  app.module.ts
  config/
    config.module.ts
    config.service.ts
  orders/
    orders.module.ts
    orders.controller.ts
    orders.service.ts
  billing/
    billing.module.ts
    billing.controller.ts
    billing.service.ts
  shared/
    shared.module.ts
    logger.port.ts
    clock.ts
```

When the worker arrives, the wrong move is a `WORKER` branch inside `OrdersController` or a relative import from `apps/worker` into `apps/api/src`. The Nest CLI monorepo splits projects in `nest-cli.json`: an application project per process (`type: "application"`, its own `main.ts`, its own root module) and a library project (`type: "library"`) for the orders module and the shared kernel. Each application root imports the library's module. The HTTP root also imports `OrdersController`'s module. The worker root imports a module that provides `OrdersService` and does not register the controller. `createApplicationContext` is the worker entry, as in NEST-019. The library still uses `exports`; moving a folder into `libs/` does not make its providers global.

What you do not do: mark `OrdersModule` global so the worker "just sees it," duplicate `OrdersService` in the worker's `providers`, or point TypeScript path aliases at another application's `src`. Those keep one codebase and two divergent graphs. The layout above keeps one registration of `OrdersService`, two thin roots, and a shared kernel small enough that its `exports` can be reviewed in one screen.

**Practical Implementation:**

```json
{
  "monorepo": true,
  "root": "apps/api",
  "projects": {
    "api": {
      "type": "application",
      "root": "apps/api",
      "entryFile": "main",
      "sourceRoot": "apps/api/src",
      "compilerOptions": { "tsConfigPath": "apps/api/tsconfig.app.json" }
    },
    "worker": {
      "type": "application",
      "root": "apps/worker",
      "entryFile": "main",
      "sourceRoot": "apps/worker/src",
      "compilerOptions": { "tsConfigPath": "apps/worker/tsconfig.app.json" }
    },
    "orders": {
      "type": "library",
      "root": "libs/orders",
      "entryFile": "index",
      "sourceRoot": "libs/orders/src",
      "compilerOptions": { "tsConfigPath": "libs/orders/tsconfig.lib.json" }
    }
  }
}
```

**Trade-offs and Alternatives:**

A single `src/` tree is the right shape while there is one process. A monorepo is more CLI and more tsconfig, and it pays off when the second entry point is real. Publishing the orders library to a private npm registry is a further step you take when another repository must consume it, not when a second app in the same repo appears. Keeping the worker inside the HTTP process behind a queue listener avoids the split entirely; do that if the "worker" is just a schedule in the same failure domain. Split processes when you need an independent deploy and an independent graph.

**Common Mistakes:**

- A `shared/` module that exports every provider anyone might want, imported by `AppModule` with `@Global()`. The manifest from NEST-024 is gone.
- Putting the HTTP controller in the shared library so the worker can "reuse the route." The worker needs the service.
- Two `AppModule` files that copy-paste provider registrations instead of importing one library module.
- Using the monorepo flag and continuing to deep-import `apps/api/src/...` from the worker. The library boundary is the point of the move.

**Senior-Level Follow-up:**

The shared kernel starts attracting `OrdersRepository` because both the HTTP app and the worker need it. What do you do with the next pull request that adds it to `SharedModule`?

Reject the move into `shared/`. The repository belongs to the orders library, exported by the orders module, imported by both roots. `SharedModule` stays the logging port and the clock. The moment a domain type lands in the kernel, every future service depends on that domain, and the kernel can no longer be reviewed as a port list.

### NEST-026 — Why @Injectable() exists

**Difficulty:** Intermediate

**Category:** Providers

**Question:**

`OrdersService` is listed in `providers` and its constructor asks for `TaxService`, which is registered in the same module. Someone deletes `@Injectable()` from `OrdersService` and the process still boots. `this.tax` is `undefined` at the first call. Why does the decorator exist, and why was there no unknown-dependency error?

**Context and Constraints:**

NestJS 10.4, `experimentalDecorators` and `emitDecoratorMetadata` on, which is the Nest 10 CLI TypeScript setup. `TaxService` is a concrete class in the same `providers` array. Nothing uses `@Inject()`. Scope options are left unset. Registration itself is NEST-003; this question is only why the decorator is on the class Nest constructs.

**Senior Engineer's Answer:**

`@Injectable()` runs when the class is evaluated. In Nest 10.4 it writes two pieces of metadata onto the class: a watermark marking it as a provider, and the scope options object you passed, if any. It does not add the class to a module. The `providers` array does that.

The behavior you feel in the constructor comes from TypeScript, not from a Nest scan of the filesystem. With `emitDecoratorMetadata`, TypeScript emits `design:paramtypes` only for a class that has at least one decorator. `@Injectable()` is the decorator Nest documents for providers, the same role `@Controller()` plays for controllers. The injector reads `design:paramtypes` and treats each entry as a token. If that metadata is missing, the reflector gets an empty list and calls the constructor with no arguments. JavaScript does not refuse the call. The parameter is `undefined`, and startup continues, because Nest had no token to look up.

That is why deleting the decorator is quieter than forgetting `providers`. A missing registration, with the decorator still present, fails in `NestFactory.create()` with an unknown-dependency error that names the class, the argument, its index, and the module. A missing decorator on a class that still has constructor parameters skips injection. `@Injectable()` is what makes the dependency list visible so a mistake fails the boot.

The class that needs the decorator is the class Nest constructs. For `{ provide: TaxPort, useClass: TaxService }`, that class is `TaxService`. Decorating only the token class does nothing when the token is a string or a symbol. Passing no options means the default scope from NEST-005. `{ scope: Scope.REQUEST }` and `{ durable: true }` are the same decorator's options object; what those scopes do to the graph belongs to the dependency-injection chapter.

**Practical Implementation:**

```typescript
import { Injectable } from '@nestjs/common';
import { TaxService } from './tax.service';

@Injectable()
export class OrdersService {
  constructor(private readonly tax: TaxService) {}
}
```

**Trade-offs and Alternatives:**

Leaving the decorator off a class with an empty constructor still instantiates it, because there is nothing to inject. The convention is to put `@Injectable()` on every provider so the next constructor parameter does not silently disappear. `@Inject(TaxService)` on each parameter writes Nest's own token metadata and does not rely on `design:paramtypes` for that argument. `@Dependencies(TaxService)` from `@nestjs/common` is the documented form when the file is plain JavaScript and there is no decorator metadata at all. Both are noisier than a decorated constructor, and both still require the class to be registered.

**Common Mistakes:**

- Treating `@Injectable()` as registration. The module's `providers` array is the registration. NEST-003.
- Expecting an unknown-dependency error after removing the decorator. The error requires a token. No emitted parameter types means no lookup.
- Decorating the interface or the token class, while `useClass` points at an undecorated implementation whose constructor Nest actually calls.
- Turning off `emitDecoratorMetadata` and expecting `@Injectable()` alone to record class tokens. Explicit `@Inject()` still works, because it writes its own metadata. Type-based parameters do not.

**Senior-Level Follow-up:**

`OrdersService` has `@Injectable()`, and the first parameter is still `undefined`, with an error that says Nest encountered an undefined dependency. What changed?

The parameter metadata is present and the token at that index is `undefined`. The usual cause is a circular import: the file that should have supplied the class had not finished initializing, so `design:paramtypes` stored `undefined`. Nest then logs that this may be a circular import or a missing dependency declaration and throws `UndefinedDependencyException`. That is a different failure from a real class the module does not provide. NEST-049 separates the two messages. `forwardRef` is the wrapper for a true cycle; NEST-028. A barrel that evaluates to `undefined` is NEST-023, and `forwardRef` is the wrong fix there.

### NEST-027 — What @Optional() changes, and what it leaves alone

**Difficulty:** Intermediate

**Category:** Dependency injection

**Question:**

A payments module should use an audit sink when some other module exports one, and should keep booting when no module does. How do you express that on a constructor and on a `useFactory` `inject` array, and which failures still abort startup?

**Context and Constraints:**

NestJS 10.4. The sink's token is a string constant, `AUDIT_SINK`. Default scope. The payments module must not `@Global()` itself to find the sink. No `multi` flag exists on Nest 10.4 providers; a list of sinks is NEST-029.

**Senior Engineer's Answer:**

`@Optional()` from `@nestjs/common` is a parameter decorator and a property decorator. On a constructor parameter it records that index as optional. If the token is not in this module's context, the injector passes `undefined` and continues. If the token is in context, you receive the real instance. The documented shape for a non-class token is both decorators on the parameter: `@Optional()` and `@Inject(AUDIT_SINK)`. `@Optional()` does not choose the token. `@Inject()` does. A class token can rely on `design:paramtypes` and needs only `@Optional()` plus `@Injectable()` on the class being constructed.

A factory does not read `@Optional()` or `design:paramtypes`. The `inject` array is the entire argument list. An entry `{ token: AUDIT_SINK, optional: true }` is the factory form. Nest still awaits the factory. The matching argument is `undefined` when that token is absent, and the factory has to branch on that itself.

Optional means "absent from this context," not "never throw." A provider that is registered and whose constructor throws still fails `create()`. A provider that is registered and whose own dependency is missing still fails, unless that inner dependency is optional too. `@Optional()` also does not create a provider, does not import a module, and does not turn a `useValue: undefined` registration into a special state. If the token is registered, you get whatever it is bound to, including a value that happens to be `undefined`.

The context rule is unchanged. An `AuditModule` that provides the sink and does not export it, or a payments module that never imports the module that exports it, is an absent token. `@Optional()` will hide that mistake and boot. Use it for a plugin the process is allowed to lack. For a sink payments always needs, leave it required so the missing export fails startup.

**Practical Implementation:**

```typescript
import { Inject, Injectable, Optional } from '@nestjs/common';

export const AUDIT_SINK = 'AUDIT_SINK';

@Injectable()
export class PaymentsService {
  constructor(
    @Optional() @Inject(AUDIT_SINK) private readonly audit?: { record(event: string): void },
  ) {}

  charge(id: string): void {
    this.audit?.record(id);
  }
}
```

```typescript
{
  provide: PAYMENTS_CLIENT,
  useFactory: (audit?: { record(event: string): void }) => createClient(audit),
  inject: [{ token: AUDIT_SINK, optional: true }],
}
```

**Trade-offs and Alternatives:**

An optional constructor parameter keeps the plugin off the required import list and moves the null check into every method. A required token with a `useClass` no-op sink, exported by a module the composition root always imports, keeps call sites unconditional and makes "no audit" an explicit binding you can see in `AppModule`. Prefer the no-op when forgetting the audit module should be a review comment. Prefer `@Optional()` when a separate deployable genuinely omits the plugin and the service is specified to no-op.

**Common Mistakes:**

- Putting `@Optional()` on a dependency the handler always calls, then debugging a `TypeError` on the first request instead of a failed boot.
- Using `@Optional()` without `@Inject()` on a string or symbol token. Optional does not supply the token.
- Expecting `@Optional()` on the factory function's parameter to be read. The `inject` entry `{ token, optional: true }` is the switch.
- Assuming an optional provider's dependencies are optional too. Only the marked parameter is.

**Senior-Level Follow-up:**

The sink is provided and exported, payments imports that module, and the constructor parameter is still `undefined` under `@Optional()`. What do you check?

Confirm the `@Inject()` token and the `provide` token are the same value, not two string literals that look alike, and not a symbol that was constructed twice. `@Optional()` only substitutes `undefined` when the lookup misses. A hit returns the bound value, so the next place to look is a `useValue` that is actually `undefined`, or a factory that returned `undefined`. The decorator is not swallowing a successful lookup.

### NEST-028 — What forwardRef delays

**Difficulty:** Senior

**Category:** Dependency injection

**Question:**

`OrdersService` and `BillingService` each take the other in their constructor. Module files import each other the same way. What does `forwardRef` from `@nestjs/common` actually postpone, where do you have to put it, and what order are you still not allowed to assume?

**Context and Constraints:**

NestJS 10.4. The cycle is a real constructor cycle between two classes that both exist, which is the case NEST-011 names. This question is the wrapper, not the redesign. Barrel files that evaluate to `undefined` stay NEST-023. Default scope. No `ModuleRef`.

**Senior Engineer's Answer:**

`forwardRef` is a function that returns `{ forwardRef: fn }`. Nest stores that object in the metadata and calls `fn` later, while it is scanning, after both modules have been evaluated. The class identifier inside the arrow function is read then, so it is the real constructor instead of the `undefined` binding a circular `import` would have captured while the file was still initializing.

A module cycle and a provider cycle are the same helper at two layers, and one layer does not cover the other. Each module's `imports` entry has to be `forwardRef(() => OtherModule)`. Each constructor parameter has to be `@Inject(forwardRef(() => OtherService))`. The side you leave as a plain reference is still evaluated immediately. If that side runs first, Nest records `undefined` and fails while creating the module, or it hits an undefined dependency while instantiating the provider. The error text for an undefined module import tells you to use `forwardRef`. That hint is accurate for this cycle. It is a bad hint for a barrel, which NEST-023 already separated.

The argument is a zero-argument function. `forwardRef(OtherModule)` passes the class itself. Nest will call that value later as a function, which is not what a class is for. `forwardRef(() => OtherModule)` is the form.

Once both wrappers are in place, Nest can construct the cycle. It does not promise which constructor body runs first. A field assigned at the end of `BillingService`'s constructor may still be unset when `OrdersService`'s constructor reads it. Keep those constructors free of calls into the other instance. If one side must observe a finished collaborator, that observation belongs in `onModuleInit` only when there is a real import edge and no cycle; a cycle has no such edge. NEST-011 is the design question: a third module that both sides import, so `forwardRef` can go away.

**Practical Implementation:**

```typescript
import { forwardRef, Inject, Injectable, Module } from '@nestjs/common';

@Module({
  imports: [forwardRef(() => BillingModule)],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}

@Injectable()
export class OrdersService {
  constructor(
    @Inject(forwardRef(() => BillingService))
    private readonly billing: BillingService,
  ) {}
}
```

`BillingModule` and `BillingService` carry the same wrappers in the other direction.

**Trade-offs and Alternatives:**

`forwardRef` is a small edit and leaves both call directions in place. Initialization order stays unspecified, and the next collaborator added to the cycle inherits it. Extracting the shared token into a module both already import removes the wrapper and restores the rule that a constructor argument's constructor has finished. An event from one side to the other, with neither importing the other, removes the edge entirely. Prefer the extraction unless the domain is actually mutually recursive.

**Common Mistakes:**

- Wrapping only the module import, or only the constructor, when both layers are cyclic.
- Writing `forwardRef(BillingModule)` without the arrow function.
- Calling the other service from the constructor and treating an intermittent `undefined` field as a race in `listen()`. The constructors ran during `create()`, and the cycle has no winner.
- Pasting `forwardRef` onto a barrel import that is `undefined` for file-order reasons. NEST-023.

**Senior-Level Follow-up:**

After both `forwardRef` wrappers, `OrdersService`'s constructor reads `this.billing.ready`, and `ready` is set on the last line of `BillingService`'s constructor. What do you tell the author?

Construction order across the cycle is not a contract. `ready` may still be unset. Move the read to a method that runs after both constructors have returned, or remove the cycle so billing is an ordinary dependency whose constructor has finished before orders starts. Do not "fix" it by assigning `ready` earlier and hoping the other order is the one production hits.

### NEST-029 — How a list of providers is registered

**Difficulty:** Senior

**Category:** Providers

**Question:**

Orders pricing needs every tax rule the process implements: VAT, duty, and a regional rule owned by another module. The author wants one injected array. NestJS 10.4 provider objects have `provide`, `useClass`, `useValue`, `useFactory`, and `useExisting`. How do you register the list, and what happens if two objects in one module share a token?

**Context and Constraints:**

NestJS 10.4.15. `ClassProvider`, `ValueProvider`, `FactoryProvider`, and `ExistingProvider` in that release have no `multi` field. Default scope. Rules are stateless. Global guards and the request pipeline are out of scope except where a well-known token is easy to confuse with this mechanism.

**Senior Engineer's Answer:**

A module stores providers in a map keyed by token. `addCustomProvider` replaces the wrapper for that token. Two entries with `provide: TAX_RULES` in the same module do not become an array. The second registration is the one that remains. Injecting `TAX_RULES` returns that one value.

The list is an ordinary factory whose `inject` array names each rule, and whose function returns the array:

```typescript
{
  provide: TAX_RULES,
  useFactory: (vat: VatRule, duty: DutyRule, regional: RegionalRule) => [vat, duty, regional],
  inject: [VatRule, DutyRule, RegionalRule],
}
```

Each rule is its own provider, with its own class token, so each can have its own constructor dependencies. A rule that lives in another module has to be exported there, and the module that declares this factory has to import that module. The array order is the `inject` order, which you write down. Nest does not sort it. The factory may be `async`; the container awaits it while it instantiates providers during `create()`.

This is the pattern the framework's maintainer left in place when a `multi: true` flag was proposed and not merged. There is no hidden collector that groups same-token providers for an arbitrary token.

`APP_GUARD`, `APP_PIPE`, `APP_INTERCEPTOR`, and `APP_FILTER` from `@nestjs/core` look similar and are not this mechanism. The scanner walks modules and gathers those specific tokens so the application can run them as global enhancers. Inside one module the map still holds one wrapper per token, so two `{ provide: APP_GUARD }` entries in the same `providers` array collapse to the last. Two modules can each contribute one. How those enhancers run is the request-lifecycle chapter. Do not copy `APP_GUARD` as the way to inject a domain list.

**Practical Implementation:**

```typescript
import { Inject, Injectable, Module } from '@nestjs/common';
import { RegionalTaxModule } from '../regional/regional-tax.module';
import { RegionalRule } from '../regional/regional.rule';
import { DutyRule } from './duty.rule';
import { VatRule } from './vat.rule';

export const TAX_RULES = Symbol('TAX_RULES');

@Injectable()
export class PricingService {
  constructor(@Inject(TAX_RULES) private readonly rules: Array<{ apply(amount: number): number }>) {}
}

@Module({
  imports: [RegionalTaxModule],
  providers: [
    VatRule,
    DutyRule,
    {
      provide: TAX_RULES,
      useFactory: (vat: VatRule, duty: DutyRule, regional: RegionalRule) => [vat, duty, regional],
      inject: [VatRule, DutyRule, RegionalRule],
    },
    PricingService,
  ],
  exports: [PricingService],
})
export class PricingModule {}
```

`RegionalTaxModule` exports `RegionalRule`. The factory module imports that class as a value so `inject` and the parameter use the same token.

**Trade-offs and Alternatives:**

The factory fails startup when a rule is missing, which is what you want for a closed set the pricing code always iterates. A new rule is a new `inject` entry, so the list cannot grow by dropping a file in a folder. That edit is the point: the module graph shows the set. Discovering every provider with `DiscoveryService` from `@nestjs/core` is a different tool, for decorators you scan after the graph exists, and a missing rule does not fail `compile()`. Use discovery for optional plugins. Use the factory for rules pricing cannot boot without.

**Common Mistakes:**

- Adding `multi: true` because another framework has it. Nest 10.4 ignores unknown fields in the sense that the public provider types do not define it, and the map still stores one wrapper per token. The second entry replaces the first.
- Registering two `APP_GUARD` providers in one module and expecting both to run.
- `new VatRule()` inside the factory. Those objects are outside the container, so a test cannot `overrideProvider(VatRule)`, and their constructors receive no injection. NEST-050.
- Exporting `TAX_RULES` from a module that did not provide it and did not import a module that exports it. Nest throws `UnknownExportException`.

**Senior-Level Follow-up:**

VAT must run before duty, and a future rule should be able to declare "after VAT." What does this factory give you?

It gives you the order of the `inject` array and nothing else. There is no priority field. If the order is a product rule, keep it explicit in that array, or sort inside the factory from a property each rule exposes, using a comparison you wrote. Do not expect module import order to be a priority system.

### NEST-030 — When property injection runs

**Difficulty:** Senior

**Category:** Dependency injection

**Question:**

A class sets `@Inject(TaxService) private tax: TaxService` on a field and reads `this.tax` in the constructor. The field is `undefined`, even though `TaxService` is provided in the same module and constructor injection of the same token works. When does Nest assign injected properties?

**Context and Constraints:**

NestJS 10.4. Default scope. `@Injectable()` is present, so this is not NEST-026. No `forwardRef`. The property is not read from a method that runs later; the read is in the constructor body.

**Senior Engineer's Answer:**

Nest resolves constructor parameters, constructs the instance with `new`, and only then assigns properties decorated with `@Inject()`. The constructor body runs in that gap. `this.tax` is still the ordinary instance field, which is `undefined` until `applyProperties` writes it. A method called after the instance has been returned to the container, including `onModuleInit` and any request handler, sees the assigned value.

`@Optional()` is also a property decorator. A missing optional property is left unset, so it stays `undefined`. A required property that cannot be resolved fails startup. The message for a property differs from a constructor index: Nest reports that the named property must be available in the current context, because there is no parameter index.

Constructor parameters remain the default. They exist before the constructor body, they show up in the signature, and they are the dependencies a reader sees without hunting fields. Property injection is for a generated subclass or a field that a constructor signature cannot express cleanly. It is a poor way to "avoid a circular constructor," because the other object is still not assigned during `new`, and a real cycle still wants the treatment in NEST-028.

**Practical Implementation:**

```typescript
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { TaxService } from './tax.service';

@Injectable()
export class OrdersService implements OnModuleInit {
  @Inject(TaxService)
  private tax: TaxService;

  onModuleInit(): void {
    this.tax.warmup();
  }
}
```

**Trade-offs and Alternatives:**

A constructor parameter is checked by TypeScript as a required argument and is present for the whole constructor. A property is shorter on a class that already has a long constructor and is invisible to `new OrdersService()` in a unit test that bypasses the container. Tests that use `Test.createTestingModule` still populate the property, because they use the same injector. Prefer the constructor unless a code generator or a mixin is producing the class.

**Common Mistakes:**

- Reading the field in the constructor and concluding the provider was not registered.
- Assuming property injection and constructor injection happen in one step because both use `@Inject()`.
- Forgetting `@Inject()` on a string or symbol field and expecting `design:type` to be the token you meant. Pass the token.
- Using property injection to paper over a `forwardRef` cycle, then calling the collaborator from the constructor anyway.

**Senior-Level Follow-up:**

The property is `@Optional() @Inject(AUDIT_SINK)`, the sink is not registered, and a log line in the constructor says the field is `undefined`. After `onModuleInit`, what is the field?

Still `undefined`. Optional absence is the value, not a delay. `onModuleInit` is when a present property is safe to use. It does not cause a second lookup that might find a provider registered later. Registration is finished before any constructor runs.

### NEST-031 — Why the module class can take constructor arguments

**Difficulty:** Intermediate

**Category:** Modules

**Question:**

`OrdersModule` implements a startup check that needs `OrdersService`. The author wants the module class's constructor to receive that service, rather than moving the check onto the service. Does Nest instantiate the module class, and which tokens is that constructor allowed to ask for?

**Context and Constraints:**

NestJS 10.4. `OrdersService` is in `OrdersModule`'s `providers` and uses the default scope. No other module needs to inject `OrdersModule`. Hook ordering between the module and its providers is NEST-008; this question is whether the module class is in the container.

**Senior Engineer's Answer:**

When Nest creates a module, it registers the module class as a provider of that same module, under the module class as the token. The instance loader constructs it the way it constructs any other provider. The constructor may ask for tokens in that module's context: its own providers, and providers exported by modules it imports. `@Injectable()` is not required on the module class for this to work; `@Module()` is already a decorator, so TypeScript emits `design:paramtypes`.

Other modules do not inject `OrdersModule` to "get the module." Importing it is the edge. Exporting the module class from `exports` re-exports the module, which is the NEST-034 mechanism, and is not the same as handing someone the module instance to call. Keep the module class free of domain methods. If a check belongs to the domain, it belongs on `OrdersService`. The module constructor is reasonable for wiring that truly is about the module, such as asserting a provider the module owns is configured, and even then `onModuleInit` on the service is usually clearer.

A provider in `OrdersModule` that injects `OrdersModule` forms a cycle: the module provider depends on the service, and the service depends on the module. That cycle needs the same care as NEST-028, and it is a sign the service should not know the module exists.

**Practical Implementation:**

```typescript
import { Module, OnModuleInit } from '@nestjs/common';
import { OrdersService } from './orders.service';

@Module({
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule implements OnModuleInit {
  constructor(private readonly orders: OrdersService) {}

  onModuleInit(): void {
    this.orders.assertReady();
  }
}
```

**Trade-offs and Alternatives:**

Putting `assertReady` on the module class keeps "this module failed its own boot check" next to the metadata. It also hides a domain rule on a type most readers open only to see `imports` and `exports`. Putting it on `OrdersService.onModuleInit` is one less constructor and the usual place. Use the module constructor when the check is about composition, for example that an imported options token is present, and the service should stay unaware of how the module was built.

**Common Mistakes:**

- Assuming the module class is metadata only and that a constructor on it is never called. It is called, and a thrown error fails startup.
- Injecting a token the module does not provide and does not import. The module class has no special visibility. Encapsulation is the same as for a service in that module.
- Listing `OrdersModule` in some other module's `providers` in order to inject it. Import the module.
- Injecting `OrdersModule` into `OrdersService` to call back into the module. Pass the collaborator the service actually needs.

**Senior-Level Follow-up:**

`OrdersModule` injects `TaxService`, and `TaxModule` exports it. `OrdersModule` does not import `TaxModule`. `AppModule` imports both. Does the module constructor receive `TaxService`?

No. Sibling imports under `AppModule` do not widen `OrdersModule`'s context. Add `TaxModule` to `OrdersModule`'s `imports`, or inject `TaxService` only in a module that already imports `TaxModule`. A global `TaxModule` would change that, with the cost in NEST-010.

### NEST-032 — What ModuleRef.get guarantees inside a feature

**Difficulty:** Senior

**Category:** Dependency injection

**Question:**

`OrdersService` injects `ModuleRef` and calls `this.moduleRef.get(TaxService)` without a second argument. `TaxService` is registered and exported by `TaxModule`. `AppModule` imports both feature modules. `OrdersModule` does not import `TaxModule`. What does this `get` do in Nest 10.4, and how is that different from `app.get` and from `ModuleRef.create`?

**Context and Constraints:**

NestJS 10.4. Default scope only. `ModuleRef` is imported from `@nestjs/core`. Request and transient lookup via `resolve()` is the dependency-injection chapter. `app.select().get(..., { strict: true })` as a review tool is NEST-024.

**Senior Engineer's Answer:**

Every module receives a `ModuleRef` as a core provider. The object injected into `OrdersService` is that module's reference. Its `get` defaults `strict` to `true`, so the lookup stays in `OrdersModule`'s context: local providers, plus exports of imported modules, plus globals. `TaxService` is not in that context. `get` throws. The missing import is still a bug. `ModuleRef` does not punch through it.

`app.get(TaxService)` on the object `NestFactory.create` returns defaults `strict` to `false` and will find `TaxService` anywhere in the container. That answer means the process contains the token. It does not mean orders is allowed to use it. NEST-024 uses `select` plus `strict: true` when the question is permission. Injected `ModuleRef.get` is already that stricter question for the host module.

`get` returns the cached default-scope instance. It is the wrong method for a request-scoped or transient provider; Nest's own error tells you to use `resolve()` instead. Leave `resolve()`, context ids, and scope bubbling to the dependency-injection chapter.

`moduleRef.create(SomeClass)` is different again. It is asynchronous. It instantiates a class that is not registered, injecting constructor dependencies from the host module's context, and it does not store the instance under `SomeClass` in the providers map. The next `create` builds another object. A non-constructable value throws an invalid-class error (`ModuleRef cannot instantiate class ... is not constructable`). `create` is for a short-lived object whose dependencies are already visible to this module. It is not how you publish a provider, and it will not reach a token this module cannot see. If `SomeClass` itself depends on `TaxService` and orders never imports tax, `create` fails for the same encapsulation reason `get` does.

**Practical Implementation:**

```typescript
import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { OrdersService } from './orders.service';

@Injectable()
export class OrderDraftFactory {
  constructor(private readonly moduleRef: ModuleRef) {}

  draft(): Promise<OrdersService> {
    return this.moduleRef.create(OrdersService);
  }
}
```

Use this only when a second `OrdersService` is actually required. The registered singleton is `moduleRef.get(OrdersService)` if this module provides or imports it.

**Trade-offs and Alternatives:**

Constructor injection fails fast at `create()` and names the missing argument. `ModuleRef.get` moves the lookup to the line you call it, which is useful when a token is chosen at runtime from a closed set this module already imported. It is a bad default for a known collaborator, because the compiler no longer shows the edge and a typo becomes a throw on the first call. `create` gives you a fresh object and skips lifecycle hooks and the singleton cache. If the class must be one shared instance, register it and `get` it.

**Common Mistakes:**

- Treating `moduleRef.get(TaxService)` as proof the feature imported `TaxModule`. With the default `strict: true`, a success means the token is in context. A call that passes `{ strict: false }` is a different, wider search.
- Using `app.get` in a service by injecting the application. That search is process-wide.
- Calling `create` to avoid adding a class to `providers`, then expecting `onModuleInit` and a shared cache.
- Calling `get` on a request-scoped token and reading the failure as "the provider is missing." The error is telling you to use `resolve()`.

**Senior-Level Follow-up:**

You pass `{ strict: false }` and `get(TaxService)` starts returning the instance. What did you change about the design?

You turned off the context check. Orders still does not declare the dependency. Any later test that compiles `OrdersModule` alone, and any later split of the process, loses `TaxService` while this call keeps working only in the full application container. Import `TaxModule` and leave `strict` at its default, or inject `TaxService` in the constructor and delete the lookup.

### NEST-033 — What order sibling providers actually have

**Difficulty:** Senior

**Category:** Lifecycle

**Question:**

`providers: [CacheService, WarmupService]` and neither constructor injects the other. `WarmupService`'s constructor calls a function that assumes `CacheService`'s constructor has finished and filled the cache. Sometimes the cache is full, sometimes it is empty. What order does Nest 10.4 actually guarantee?

**Context and Constraints:**

NestJS 10.4 HTTP application. Both classes are default scope, in one module, with `@Injectable()`. There is no `forwardRef`. `onModuleInit` behavior is NEST-008. The unsafe part of calling a collaborator from a constructor when you do inject it is NEST-021. This question is the missing edge.

**Senior Engineer's Answer:**

The instance loader constructs a provider's constructor arguments before it runs that provider's constructor. If `WarmupService` injected `CacheService`, `CacheService`'s constructor would have finished first. That is the guarantee. Listing `CacheService` earlier in the `providers` array is not a second guarantee. Two providers with no dependency edge are both in the module, and the relative order of their constructors is an artifact of the internal walk. It can look stable until a new provider or a new import changes the walk. Code that passes on a laptop and fails in another test order is using an accident.

If warmup truly cannot run until the cache object exists, inject `CacheService`. Then the constructor order is fixed. If warmup must also wait until the cache has finished asynchronous fill, the fill belongs in `CacheService.onModuleInit`, returning that promise, and the warmup belongs in `WarmupService.onModuleInit`. Import edges, not array position, decide which module's hooks have been awaited. Inside one module, provider hooks are started together; do not use two `onModuleInit` methods in the same module as a secret sequence. Put the sequence in one method that can `await` the other service, after injection has made the call legal.

**Practical Implementation:**

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { CacheService } from './cache.service';

@Injectable()
export class WarmupService implements OnModuleInit {
  constructor(private readonly cache: CacheService) {}

  async onModuleInit(): Promise<void> {
    await this.cache.ready();
    await this.warm();
  }

  private async warm(): Promise<void> {
    // Reads a cache whose fill has been awaited.
  }
}
```

`CacheService.ready()` resolves when that service's own `onModuleInit` has finished its fill. If both hooks are in the same module, have `CacheService` expose a promise that its hook assigns, and have warmup await that promise, or do both steps in one provider so there is a single sequence.

**Trade-offs and Alternatives:**

Injection makes the edge visible and the constructor order real. It also forces warmup to depend on the cache type. A single `StartupService` that injects both and performs fill then warm in one `onModuleInit` is fewer ordering puzzles and one place to read. Array order is the worst of the three: it looks like documentation and the container does not honor it.

**Common Mistakes:**

- Reordering the `providers` array until the flaky test passes, and committing that order.
- Assuming providers are constructed in `imports` order of unrelated modules. Module hook order follows import distance; sibling provider constructors inside one module still need an injection edge if one must exist first.
- Starting the cache fill in the `CacheService` constructor without returning a handle warmup can await. NEST-021.
- Adding `forwardRef` between the two services to "allow either order." That removes the "constructor has finished" guarantee. NEST-028.

**Senior-Level Follow-up:**

`WarmupService` injects `CacheService`, and `CacheService` fills in `onModuleInit`. `WarmupService` fills nothing and only reads the cache from its constructor. Is the read safe?

The `CacheService` instance exists, and its constructor has finished. Its `onModuleInit` has not run, because hooks run later, during `init()`. The read in the warmup constructor sees an empty cache whenever the fill is in the hook. Move the read to `WarmupService.onModuleInit` and await the fill there. Injection fixed object identity. It did not move hook time into `create()`.

### NEST-034 — How far a re-export chain carries a token

**Difficulty:** Advanced

**Category:** Modules

**Question:**

`TaxModule` provides `TaxService` and `TaxRepository`, and exports only `TaxService`. `BillingModule` imports `TaxModule`. `CommerceModule` imports `BillingModule`. `ReportsModule` imports `CommerceModule` and wants `TaxService`. Who can inject `TaxService`, who can inject `TaxRepository`, and what does each middle module have to write for the next module to keep seeing the service?

**Context and Constraints:**

NestJS 10.4. No `@Global()`. Default scope. One registration of `TaxService`. A single facade hop is NEST-022. This question is the chain: visibility stops at the first module that does not re-export.

**Senior Engineer's Answer:**

Import is not transitive. `BillingModule` can inject `TaxService` because it imports `TaxModule` and `TaxModule` exports that token. `CommerceModule` can inject `TaxService` only if `BillingModule` re-exports it. `ReportsModule` can inject it only if `CommerceModule` re-exports it as well. A module re-exports either the provider token, if that token is already in its own context, or the imported module:

```typescript
exports: [TaxService] // token already provided or imported
exports: [TaxModule]  // forwards TaxModule's exports
```

`exports: [TaxModule]` forwards `TaxModule`'s export list, not `TaxModule`'s private providers. `TaxRepository` stays invisible at every hop, including to a module that imports `TaxModule` directly, because it was never exported. Re-exporting does not copy the provider. Every legal injector shares the one `TaxService` instance `TaxModule` constructed.

If `BillingModule` imports `TaxModule` and its `exports` array omits both `TaxService` and `TaxModule`, the chain ends in billing. Commerce and reports fail at startup if they inject `TaxService`, with an unknown-dependency error in their own module context. Billing itself still works. The error names the module that tried to inject, which is why a long chain is easy to misread as "tax is broken" when the broken link is a middle `exports` array.

Putting `TaxService` in some module's `imports` is not a re-export. Nest refuses provider and controller classes in `imports`. The message says classes annotated with `@Injectable()`, `@Catch()`, and `@Controller()` must not appear in the `imports` array. The `imports` entry has to be a module, a dynamic module, or `forwardRef` of a module.

**Practical Implementation:**

```typescript
@Module({
  imports: [TaxModule],
  exports: [TaxModule],
})
export class BillingModule {}

@Module({
  imports: [BillingModule],
  exports: [BillingModule],
})
export class CommerceModule {}

@Module({
  imports: [CommerceModule],
  providers: [ReportsService],
})
export class ReportsModule {}
```

`ReportsService` may inject `TaxService`. It may not inject `TaxRepository`.

**Trade-offs and Alternatives:**

A chain lets reports depend on a commerce facade and stay unaware of tax's path. It also means deleting `exports: [TaxModule]` from billing breaks reports, a module billing's author may not run. Direct `imports: [TaxModule]` on every consumer is noisier and makes the owner obvious. Prefer the direct import until a real facade has more than one token worth curating. When you do re-export, re-export the token list you mean (`TaxService`) rather than the whole module, so a later export added to `TaxModule` does not silently become part of commerce's public surface.

**Common Mistakes:**

- Assuming `AppModule` importing all three features lets them see each other. Siblings do not share contexts.
- Re-exporting `TaxModule` and expecting `TaxRepository` to come along. Only `TaxModule.exports` travels.
- Adding `TaxRepository` to `CommerceModule.exports` without importing a module that exports it. `UnknownExportException`: Nest cannot export a provider that is not part of the currently processed module.
- Re-providing `TaxService` in each middle module "so the export is local." That is a new registration and a new instance.

**Senior-Level Follow-up:**

`ReportsModule` imports both `CommerceModule` and `TaxModule`. `CommerceModule` already re-exports `TaxModule`. How many `TaxService` instances exist, and which import made `TaxRepository` visible?

One `TaxService`, as long as nobody lists it in a second `providers` array. Importing `TaxModule` twice does not construct it twice. `TaxRepository` becomes visible only to modules that import `TaxModule` itself and only if `TaxModule` exports the repository. The commerce re-export never publishes it. If the repository is still unexported, reports' extra import does not reveal it.

### NEST-035 — When forRoot is enough, and when the factory has to be async

**Difficulty:** Advanced

**Category:** Modules

**Question:**

`PaymentsModule` needs a merchant id and a timeout. In one deployable those two values are literals in `AppModule`. In another they come from `ConfigService`. What is the practical difference between `forRoot` and `forRootAsync`, and what must the async form import?

**Context and Constraints:**

NestJS 10.4. `forRoot` and `forRootAsync` are static methods you write that return a `DynamicModule`. The shape of that object is NEST-016. When a dynamic module is the wrong seam is NEST-017. This question is only the choice and the wiring. `@nestjs/config`'s `ConfigModule` may be global or not; say which case you are in. The options object is plain data, not a database connection of its own.

**Senior Engineer's Answer:**

Use `forRoot` when the caller already has the values. The method receives a plain object and the returned providers bind it with `useValue`. Nothing in that method can inject `ConfigService`. A static method is not a provider. If the literals are in `AppModule`, `forRoot({ merchantId, timeoutMs })` is the whole mechanism.

Use `forRootAsync` when a provider must produce the options. The conventional method accepts `imports`, `inject`, and `useFactory`, and registers one factory provider. The container calls `useFactory` while it instantiates providers during `create()`, and it awaits a promise. `inject` is the argument list, in order, the same rule as any other factory. `imports` is required when `ConfigModule` is not global: the dynamic module has its own context, and `AppModule` importing `ConfigModule` does not make `ConfigService` visible inside `PaymentsModule`. A non-global config module has to appear in that `imports` array, and `ConfigService` has to be exported by it, which `ConfigModule.forRoot()` does. If `ConfigModule.forRoot({ isGlobal: true })` was imported by the root, the factory can inject `ConfigService` without listing the import. Prefer listing it anyway when you want the dynamic module's metadata to show the edge.

Do not `await` a provider inside `forRoot`, and do not read `ConfigService` from a closure you captured by constructing it with `new`. The async factory is the await point Nest already has.

**Practical Implementation:**

```typescript
import { DynamicModule, Module, ModuleMetadata } from '@nestjs/common';

export const PAYMENTS_OPTIONS = Symbol('PAYMENTS_OPTIONS');

export interface PaymentsOptions {
  merchantId: string;
  timeoutMs: number;
}

@Module({
  providers: [PaymentsClient],
  exports: [PaymentsClient],
})
export class PaymentsModule {
  static forRoot(options: PaymentsOptions): DynamicModule {
    return {
      module: PaymentsModule,
      providers: [{ provide: PAYMENTS_OPTIONS, useValue: options }],
    };
  }

  static forRootAsync(options: {
    imports?: ModuleMetadata['imports'];
    inject?: any[];
    useFactory: (...args: any[]) => PaymentsOptions | Promise<PaymentsOptions>;
  }): DynamicModule {
    return {
      module: PaymentsModule,
      imports: options.imports ?? [],
      providers: [
        {
          provide: PAYMENTS_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject ?? [],
        },
      ],
    };
  }
}
```

```typescript
PaymentsModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    merchantId: config.getOrThrow<string>('PAYMENTS_MERCHANT_ID'),
    timeoutMs: Number(config.getOrThrow<string>('PAYMENTS_TIMEOUT_MS')),
  }),
})
```

`PaymentsClient` injects `PAYMENTS_OPTIONS` in the same module, so the token does not have to be exported for that client. Export it only if another module must inject the options object itself.

**Trade-offs and Alternatives:**

`forRoot` is readable in the composition root and cannot drift from a config provider, because there is no provider in the path. `forRootAsync` is the one that stays correct when the value is environment-specific, and it costs an `imports`/`inject` pair people forget. A third approach, a static `PaymentsModule` that injects `ConfigService` directly and has no `forRoot`, is better when payments has no literals worth passing and the only source is config. Dynamic modules are the wrong tool for that. NEST-017.

**Common Mistakes:**

- Calling `ConfigService` methods inside `forRoot` by importing the service class and using `new`.
- Omitting `imports: [ConfigModule]` when config is not global, then reading the unknown-dependency error as a `ConfigModule` bug.
- Awaiting `forRootAsync(...)` from `AppModule`. The static method returns a plain object or a promise of a `DynamicModule`. Nest awaits a promised dynamic module. The factory's promise is awaited later, during instantiation.
- Putting the factory on the class as a random method Nest is supposed to discover. The name `forRootAsync` is convention. The `imports` array has to call it.

**Senior-Level Follow-up:**

`forRootAsync`'s factory injects `ConfigService`, and `ConfigModule.forRoot({ isGlobal: true })` is on `AppModule`. Someone removes `imports: [ConfigModule]` from the async options and the boot still works. Why, and why might you put the import back?

`isGlobal: true` publishes `ConfigModule`'s exports to every module, so the factory's context can see `ConfigService` without a local import. The boot passing does not prove the dynamic module declared its dependency. Put the import back if you want that edge to survive someone later removing `isGlobal`, which is the trade-off NEST-010 describes.

### NEST-036 — What forFeature is allowed to add

**Difficulty:** Advanced

**Category:** Modules

**Question:**

`PaymentsModule.forRoot(options)` is imported once from `AppModule` and constructs one `PaymentsClient`. `OrdersModule` needs a handle bound to the `orders` merchant, and `BillingModule` needs one bound to `billing`. What should `forFeature` return, and why is a second `forRoot` with a different merchant id the wrong call?

**Context and Constraints:**

NestJS 10.4. Both methods return a `DynamicModule` whose `module` property is `PaymentsModule`. TypeORM's `forFeature` is a later chapter; this is the same convention on a module you own. NEST-017 already covers three disagreeing `forRoot` calls. Default scope.

**Senior Engineer's Answer:**

`forRoot` registers the shared client and the options token once, on `PaymentsModule`. `forFeature('orders')` registers an additional token, distinct from the client token, whose factory injects `PaymentsClient` and returns the per-merchant handle. It exports that token. `OrdersModule` imports `forFeature('orders')` and injects the handle. `BillingModule` imports `forFeature('billing')` under a different token.

Both methods name `module: PaymentsModule`. Nest deduplicates by that class, so these calls add providers to one module. They do not create a private container per feature. That is why `forFeature` must not pass a second connection or a second options object under the same token as `forRoot`. A second `forRoot({ merchantId: 'orders' })` from `OrdersModule` targets the same module and the same options token. The map keeps one wrapper. Which options object survives is an overwrite, not an isolation. NEST-017 is that bug. `forFeature` avoids it by using a new token per merchant and by taking the merchant name only as an argument to a factory that closes over the string, while the client stays the single `forRoot` instance.

The feature factory can inject `PaymentsClient` only because `forRoot` and `forFeature` ended up on one module, or because the client is exported and `forFeature`'s returned module imports a module that exports it. With one shared module class, the providers land together. The feature still has to import the `forFeature(...)` dynamic module. Importing `PaymentsModule` the class, without calling `forFeature`, does not register the merchant token.

**Practical Implementation:**

```typescript
export const merchantToken = (name: string) => Symbol.for(`payments:${name}`);

static forFeature(merchant: string): DynamicModule {
  const token = merchantToken(merchant);
  return {
    module: PaymentsModule,
    providers: [
      {
        provide: token,
        useFactory: (client: PaymentsClient) => client.forMerchant(merchant),
        inject: [PaymentsClient],
      },
    ],
    exports: [token],
  };
}
```

`Symbol.for` is deliberate so the token in `OrdersModule`'s `@Inject(merchantToken('orders'))` is the same symbol the provider used. A fresh `Symbol('orders')` on each call would be a different token.

**Trade-offs and Alternatives:**

One client plus thin per-merchant handles shares connection state and keeps credentials in `forRoot`. It is the wrong split if two merchants need different endpoints or different secrets: those are different options, and they need different tokens or different module classes, not two `forRoot` calls on one class. Passing the merchant into each method (`client.charge(merchant, amount)`) needs no `forFeature` at all and is better when the handle would only store a string. Use `forFeature` when the handle is a real object other providers inject, with its own type, and the merchant must not be repeated at every call site.

**Common Mistakes:**

- Calling `forRoot` from each feature with that feature's merchant id.
- Using `Symbol('orders')` inside `forFeature` and again at the inject site. Each call allocates a new symbol, so the lookup misses.
- Expecting `forFeature` to scope the handle so orders cannot inject billing's token. The providers sit on the shared module and are exported to whoever imports that dynamic module. Import only the `forFeature` you need. The token name is not a security boundary.
- Re-providing `PaymentsClient` inside `forFeature`. That replaces or duplicates the client token depending on how the registrations merge. Leave the client to `forRoot`.

**Senior-Level Follow-up:**

`OrdersModule` imports `PaymentsModule.forFeature('orders')` and never imports `forRoot`. `AppModule` imports `forRoot` and does not import `OrdersModule`'s handle. The feature factory injects `PaymentsClient`. Why does that injection resolve?

Because both dynamic modules use the class `PaymentsModule`, so the client provider and the merchant provider are registered on the same module. The factory sees a sibling provider. This stops working if `forFeature` is changed to return a different `module` class that neither provides `PaymentsClient` nor imports a module that exports it. The injection would then be a normal missing dependency, which is the more honest graph. Sharing one module class is convenient and easy to break by "splitting the file" without adding an import.

### NEST-037 — Why configuration is a provider

**Difficulty:** Intermediate

**Category:** Configuration

**Question:**

Feature services read `process.env.PAYMENTS_MERCHANT_ID` directly. The team adds `@nestjs/config` and `ConfigModule.forRoot()`. What should a feature inject instead, what does `forRoot` make available, and how do you refuse to boot when a required variable is missing?

**Context and Constraints:**

NestJS 10.4 with `@nestjs/config` 3.2, the config package line that matches that Nest generation. Default `.env` loading. One HTTP application. `isGlobal` is a choice you must state. Validation here is the `validate` option on `forRoot`, not a `ValidationPipe`. When the file is read relative to service-file evaluation is NEST-039. Where a thrown `validate` surfaces is NEST-040.

**Senior Engineer's Answer:**

`ConfigModule.forRoot()` returns a dynamic module that provides and exports `ConfigService`. Feature code injects `ConfigService` and reads `get` or `getOrThrow`. `get('PAYMENTS_MERCHANT_ID')` returns `undefined` when the key is missing. `get('PAYMENTS_MERCHANT_ID', 'demo')` supplies a default. `getOrThrow('PAYMENTS_MERCHANT_ID')` throws a `TypeError` whose message is `Configuration key "PAYMENTS_MERCHANT_ID" does not exist` when the value is `undefined`. The generic on `get<string>` is a TypeScript claim. It does not parse or check the runtime value.

`forRoot` loads configuration when that static method runs. By default it reads `process.cwd()/.env` if the file exists, then lets existing environment variables win, because the current `process.env` is applied over the file. A missing `.env` is skipped. `ignoreEnvFile: true` skips the file entirely, which is what you want when the platform injects the environment and a stray file should not matter. `envFilePath` may be a string or an array. When it is an array, the first existing file wins on conflicting keys. `isGlobal: true` sets the dynamic module's `global` flag so other modules can inject `ConfigService` without importing `ConfigModule`. The root still imports `forRoot` once. That global is the usual exception NEST-010 allows, and it is still an exception: the dependency is no longer written on the feature.

Required variables belong in `validate`. The function receives the merged record and either returns the record the module will store or throws. A throw means the process does not proceed into a listening server. NEST-040 is the exact channel of that throw. Domain services then call `getOrThrow` for values they cannot operate without, so a key added later also fails at first use if it was left out of `validate`. Prefer `validate` for the closed set, so the failure stays at startup.

**Practical Implementation:**

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: process.env.NODE_ENV === 'production',
      validate: (config: Record<string, unknown>) => {
        if (typeof config.PAYMENTS_MERCHANT_ID !== 'string' || config.PAYMENTS_MERCHANT_ID.length === 0) {
          throw new Error('PAYMENTS_MERCHANT_ID is required');
        }
        return config;
      },
    }),
  ],
})
export class AppModule {}

export class PaymentsService {
  constructor(private readonly config: ConfigService) {}

  merchantId(): string {
    return this.config.getOrThrow<string>('PAYMENTS_MERCHANT_ID');
  }
}
```

**Trade-offs and Alternatives:**

A global `ConfigService` is one import at the root and an invisible dependency everywhere, which is acceptable for process configuration and a bad habit for domain services. Importing `ConfigModule` on each feature that reads config removes `isGlobal` and makes the edge local. Passing already-read strings through `forRoot` into a feature, as in NEST-035, keeps `ConfigService` out of the feature entirely. That is the better boundary when a library module should not depend on `@nestjs/config`. `get` with a default is convenient and hides a missing production variable. Use a default only when the default is a correct behavior, not a placeholder.

**Common Mistakes:**

- Injecting `ConfigService` without `forRoot` on the root and without a local import. The class existing in `node_modules` is not a registration.
- Treating `get<number>('PORT')` as a parser. The value is still a string unless `validate` or your own code converted it.
- Calling `set` on `ConfigService` as a way to configure the app from a feature. `set` mutates the in-memory config and, for a string path, writes `process.env`. Configuration at runtime is a different design. Startup config should be immutable from the feature's point of view.
- Reading `config.get('merchantId')` when the environment key is `PAYMENTS_MERCHANT_ID`. Dot paths address nested objects from `load` / `registerAs`, which is NEST-038, not a rename of environment variables.

**Senior-Level Follow-up:**

`validate` returns `{ PAYMENTS_MERCHANT_ID: 'm_1' }`, and a service still calls `process.env.PAYMENTS_MERCHANT_ID` from a request handler. Will it see `m_1`?

If that key was not already set on `process.env`, `forRoot` copies primitive validated values onto `process.env`. A handler that reads `process.env` later can observe it. Do not use that as the design. The copy is a compatibility side effect of `forRoot`, it only applies to top-level string, number, and boolean keys that were absent, and it keeps the service coupled to the global object. Inject `ConfigService`.

### NEST-038 — How a namespaced config object is injected

**Difficulty:** Senior

**Category:** Configuration

**Question:**

Database settings are a group: host, port, and name. You do not want every service to call `config.get('DATABASE_HOST')` with a stringly key. How does `@nestjs/config` 3.2 expose that group as a provider token, and what does a feature import?

**Context and Constraints:**

NestJS 10.4, `@nestjs/config` 3.2. `registerAs`, `ConfigModule.forFeature`, `ConfigType`, and the `KEY` property on the factory are the public surface. No second configuration library. `ConfigService.get('database.host')` may be mentioned only as the alternative you are replacing for this group.

**Senior Engineer's Answer:**

`registerAs('database', () => ({ host, port, name }))` returns the factory and defines a `KEY` property on it. That `KEY` is the injection token for the object the factory returns. You do not rebuild the token string by hand. `ConfigType<typeof databaseConfig>` is the TypeScript type of the factory's return value. It is a compile-time type. The runtime object is whatever the factory returned.

Load the factory in one of two documented places. `ConfigModule.forRoot({ load: [databaseConfig] })` registers it with the root configuration module and, if that module is global, the token is available without a further import. `ConfigModule.forFeature(databaseConfig)` is the partial registration: the feature module imports that dynamic module and then injects `@Inject(databaseConfig.KEY)`. `forFeature` does not replace `forRoot`. The process still needs `forRoot` for the env load and for `ConfigService`. `forFeature` adds this namespace to the module that imports it.

Inside the `registerAs` factory, `process.env` is the merged environment `forRoot` already produced, as long as `forRoot` has run. That is the documented place where reading `process.env` is still appropriate: at the edge that builds the config object. Services inject the object and do not read `process.env`.

`config.get('database.host')` remains valid if the namespace was loaded, because `ConfigService` addresses nested values with dot paths. Prefer the injected `ConfigType` object when the group has several fields and you want a rename to be a TypeScript error. Prefer `getOrThrow` when there is one key and a token would be ceremony.

**Practical Implementation:**

```typescript
import { Inject, Injectable, Module } from '@nestjs/common';
import { ConfigModule, ConfigType, registerAs } from '@nestjs/config';

export const databaseConfig = registerAs('database', () => ({
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: Number(process.env.DATABASE_PORT ?? 5432),
  name: process.env.DATABASE_NAME ?? 'app',
}));

@Injectable()
export class DatabaseClient {
  constructor(
    @Inject(databaseConfig.KEY)
    private readonly database: ConfigType<typeof databaseConfig>,
  ) {}
}

@Module({
  imports: [ConfigModule.forFeature(databaseConfig)],
  providers: [DatabaseClient],
  exports: [DatabaseClient],
})
export class DatabaseModule {}
```

The defaults in the factory are real behavior only if those defaults are acceptable. A required host should throw inside the factory or be covered by `validate` in NEST-037, not fall back to `localhost` in production.

**Trade-offs and Alternatives:**

`forFeature` makes the namespace an explicit import of `DatabaseModule` and keeps unrelated features from injecting it by accident when config is not global. `load` on `forRoot` is one list in the composition root and is easier to audit. Using both for the same `registerAs` factory is unnecessary. Injecting `ConfigService` and calling `get('database.host')` avoids a token and loses the grouped type. A hand-rolled options token via `forRoot`, NEST-035, avoids `@nestjs/config` inside a library. Use `registerAs` for application composition, not for a library that should receive an options object from the host.

**Common Mistakes:**

- Injecting the factory function instead of `databaseConfig.KEY`. The factory is not the provider token.
- Writing `@Inject('database')` or a guessed `CONFIGURATION(database)` string. Use the `KEY` property the helper defined.
- Importing `forFeature` and forgetting `forRoot` in the process. Partial registration does not load `.env` by itself.
- Computing `port` with `Number('')` or `Number(undefined)` and storing `0` or `NaN`. `validate` should reject a missing port before the factory coerces it, or the factory should throw.

**Senior-Level Follow-up:**

`DatabaseModule` imports `forFeature(databaseConfig)`, and `ConfigModule.forRoot({ isGlobal: true })` does not include `load: [databaseConfig]`. A different feature never imports `DatabaseModule` and injects `databaseConfig.KEY`. What happens?

The token is provided by the `forFeature` dynamic module, which exports it to importers of that dynamic module. A feature that never imports it, and that does not see it through a global `forRoot` `load`, cannot resolve the token. Global `ConfigService` is not the same thing as a global namespace token. Either add the factory to `forRoot({ load })` or import the module that calls `forFeature`.

### NEST-039 — When the .env file is read relative to your service file

**Difficulty:** Senior

**Category:** Configuration

**Question:**

`orders.service.ts` starts with `const merchantId = process.env.PAYMENTS_MERCHANT_ID`. `AppModule` calls `ConfigModule.forRoot()` and `ConfigService.get` sees the value from `.env`. The constant is `undefined`. Walk the evaluation order that produces both observations.

**Context and Constraints:**

NestJS 10.4, `@nestjs/config` 3.2.3. Default `main.ts`: import `NestFactory`, import `AppModule`, then inside `bootstrap` call `NestFactory.create(AppModule)`. `OrdersModule` is imported by `AppModule`'s file. `forRoot` uses the default path `process.cwd()/.env`. The variable is not set in the shell. No `validate` yet.

**Senior Engineer's Answer:**

`ConfigModule.forRoot()` loads the file inside that static method. The method runs when the `@Module()` decorator on `AppModule` is evaluated, because that is the expression in `imports`. Decorator evaluation happens while `app.module.ts` is being evaluated, after the files it imports have been evaluated.

`app.module.ts` imports `OrdersModule`. That import evaluates `orders.module.ts` and, through it, `orders.service.ts`, before the `AppModule` class decorator runs. The top-level `const merchantId = process.env.PAYMENTS_MERCHANT_ID` therefore runs before `forRoot` reads `.env` and before `forRoot` copies any missing primitive keys onto `process.env`. The constant captures `undefined`. Later reads of `process.env.PAYMENTS_MERCHANT_ID` in a method body can see the value, because those reads happen after `forRoot` has assigned it. `ConfigService.get` sees it because `get` reads the store `forRoot` built, not the constant your file captured.

This is independent of dependency injection. Moving the constant into a constructor without `ConfigService` still loses if you close over the top-level binding. The fix is to delete the top-level read and inject `ConfigService`, or to read `process.env` inside a `registerAs` factory that runs as part of configuration after `forRoot` has loaded the file.

A missing `.env` does not throw. `forRoot` checks that the path exists and skips it. The default path is `process.cwd()/.env`, not the directory of the service file. Starting the process from another working directory looks like a missing file even when the file is beside `package.json`.

**Practical Implementation:**

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OrdersService {
  constructor(private readonly config: ConfigService) {}

  merchantId(): string {
    return this.config.getOrThrow<string>('PAYMENTS_MERCHANT_ID');
  }
}
```

**Trade-offs and Alternatives:**

Injecting `ConfigService` ties the service to `@nestjs/config`. Passing `merchantId` as a `forRoot` option, NEST-035, keeps the service free of both `process.env` and `ConfigService`. Both are valid. The top-level constant is valid only for variables that are already in the environment before any application file is imported, which is true for real platform environment variables and false for a `.env` file `forRoot` has not loaded yet.

**Common Mistakes:**

- Moving the `const` into the constructor by writing `this.merchantId = merchantId` where `merchantId` is still the top-level binding. The capture already happened.
- Assuming `forRoot` runs at `listen()` or inside `onModuleInit`. It runs while `AppModule` is being defined.
- Expecting a `.env` next to `orders.service.ts` to be found. The default lookup is `process.cwd()/.env`.
- Importing `OrdersService` from `main.ts` before `AppModule` for a "quick script" and reading `process.env` at import. That import is even earlier.

**Senior-Level Follow-up:**

The shell exports `PAYMENTS_MERCHANT_ID=from-the-shell`, and `.env` contains `PAYMENTS_MERCHANT_ID=from-the-file`. Which value does `ConfigService.get` return with the default `forRoot` options in 3.2?

`from-the-shell`. `forRoot` merges the file first and then applies `process.env` over it, unless `ignoreEnvVars` is set. The top-level constant in the service file would also see `from-the-shell`, because it was already on `process.env` before any file loaded. The bug in this question requires the key to be absent until `.env` is loaded.

### NEST-040 — Where a failing config validate() throws

**Difficulty:** Senior

**Category:** Configuration

**Question:**

`ConfigModule.forRoot({ validate })` throws `Error('PAYMENTS_MERCHANT_ID is required')`. Operators expect `NestFactory.create` to handle it via `abortOnError`, and they expect the "application successfully started" log not to appear. What actually throws, and which of those mechanisms are involved?

**Context and Constraints:**

`@nestjs/config` 3.2.3, NestJS 10.4. Default `main.ts` imports `AppModule` at the top of the file, then calls `NestFactory.create(AppModule)` and `app.listen(3000)`. `abortOnError` is left at its default. `validate` throws synchronously. No custom exception filter.

**Senior Engineer's Answer:**

In 3.2.3, `forRoot` calls `validate` synchronously while it builds the dynamic module, before it returns. That call happens when the `AppModule` decorator runs, which happens when Node evaluates `app.module.ts`. The default `main.ts` evaluates that import before `bootstrap` runs. The throw is therefore a synchronous exception during module load. `NestFactory.create` has not been entered. `abortOnError` is a `create` option and is not on this path. `listen` is not called. There is no startup log from `init()`, because `init()` never starts.

The stack points at `ConfigModule.forRoot` and the `validate` function, not at an unknown-dependency error and not at `SIGABRT`. A process supervisor sees a non-zero exit from an uncaught exception if nothing catches it. That is the failure you want for a bad environment. It is easy to miss in a test that imports `AppModule` inside an assertion and attributes the throw to "Nest failed to create."

If `validate` returns a record instead of throwing, `forRoot` stores it and copies missing primitive keys onto `process.env`. Returning a "corrected" empty string is a successful boot. Throw, or return only after the record is actually valid.

**Practical Implementation:**

```typescript
import { ConfigModule } from '@nestjs/config';

ConfigModule.forRoot({
  isGlobal: true,
  validate: (config: Record<string, unknown>) => {
    if (typeof config.PAYMENTS_MERCHANT_ID !== 'string' || config.PAYMENTS_MERCHANT_ID.length === 0) {
      throw new Error('PAYMENTS_MERCHANT_ID is required');
    }
    return config;
  },
});
```

This call site is the `imports` array of `AppModule`, as in NEST-037. The snippet is the option that decides whether evaluation of that file succeeds.

**Trade-offs and Alternatives:**

Throwing from `validate` fails the process in one place, before providers are constructed, so a half-open database client is not a concern yet. Checking again with `getOrThrow` in a service catches keys `validate` forgot, at the cost of a later failure, possibly after other modules have started work in their constructors. Keep the closed set in `validate`. A Joi `validationSchema` on the same options object is the other 3.2 hook: on error, `forRoot` throws `Error` with the schema message prefixed by `Config validation error:`. One of the two is enough. Running both is easy to make disagree.

**Common Mistakes:**

- Wrapping only `NestFactory.create` in `try/catch` and logging "create failed" for a throw that happened on the import line above the `try`.
- Expecting `abortOnError: false` to turn this into a rejected `create()` promise. `create` is not the caller.
- Returning `config` from `validate` after `console.error` of the problem. The boot succeeds.
- Assuming `listen`'s port binding is the first side effect. Module evaluation is earlier, and `forRoot` has already read the environment.

**Senior-Level Follow-up:**

A test does `await import('./app.module')` inside a `try`, and only then calls `NestFactory.create`. How do you assert a missing variable?

Expect the import itself to reject or throw, depending on how you dynamic-import, because that is when `forRoot` runs. Asserting that `create` rejects will not see this failure if the import already threw outside that assertion. Set the environment for the test before importing `AppModule`, not after `create` and not after the import line. Top-level imports in the test file have the same eagerness as `main.ts`.

### NEST-041 — Read the startup error: the provider is not exported

**Difficulty:** Intermediate

**Category:** Modules

**Question:**

Startup fails. Read the module files and the error, and name the line that is wrong. The service file and the controller file are not the defect.

```typescript
// tax.module.ts
@Module({
  providers: [TaxService, TaxRepository],
  exports: [TaxRepository],
})
export class TaxModule {}

// orders.module.ts
@Module({
  imports: [TaxModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}

// orders.controller.ts
@Controller('orders')
export class OrdersController {
  constructor(private readonly tax: TaxService) {}
}
```

`TaxService` and `OrdersController` both have the decorators Nest needs for constructor metadata. `TaxService` is a value import in the controller file. The controller constructor takes only `TaxService`. The error is:

`Nest can't resolve dependencies of the OrdersController (?). Please make sure that the argument TaxService at index [0] is available in the OrdersModule context.`

**Context and Constraints:**

NestJS 10.4. No `@Global()`. `TaxRepository` is not what the controller injects. `OrdersService` is provided in `OrdersModule` and is not the failing token. Default scope.

**Senior Engineer's Answer:**

The failing lookup is `TaxService` at index 0 of `OrdersController`, in the `OrdersModule` context. Nest already knows the token. This is not an undefined import and not a missing `@Injectable()`. Those failures look different: a missing decorator skips injection, and an undefined token is the undefined-dependency path in NEST-049.

`OrdersModule` imports `TaxModule`, so the import edge exists. `TaxModule`'s `providers` includes `TaxService`, so the instance will be constructed for tax's own context. `exports` lists `TaxRepository` only. Exporting a different provider does not publish `TaxService`. `OrdersModule` cannot see `TaxService`, so the controller's constructor cannot be satisfied. `TaxRepository` being exported is a distraction unless something in orders injects it.

The fix is to export the token the other module injects:

```typescript
exports: [TaxService]
```

Export `TaxRepository` as well only if a different module is supposed to inject the repository. The controller should keep injecting the service. Leave the repository private to `TaxModule` if orders has no business with it.

The error names `OrdersModule` because that is the module whose context failed. Changing `TaxModule` while watching an orders-only mental model is still correct here, because the token's owner is tax and the visibility flag is `exports`. Adding `TaxService` to `OrdersModule.providers` would also silence the error by constructing a second instance, which orders does not want if tax owns the rate table.

**Practical Implementation:**

```typescript
@Module({
  providers: [TaxService, TaxRepository],
  exports: [TaxService],
})
export class TaxModule {}
```

**Trade-offs and Alternatives:**

Exporting `TaxService` widens the module's public surface by one token and preserves one instance. Re-providing the class in orders hides the missing export and splits the instance. `@Optional()` on the controller parameter would boot with `tax === undefined` and fail on the first order. Making `TaxModule` global would also silence the error for every feature, which is the coupling NEST-010 rejects for a domain service.

**Common Mistakes:**

- Adding `@Injectable()` again, or rewriting the constructor import, because those are the usual causes of a dependency error. Here the message names a real class and a real module context.
- Exporting `TaxModule` from `OrdersModule` and expecting that to change tax's export list. Re-export forwards what tax already exports. It does not edit tax.
- Reading the `?` as "Nest does not know the type." In this message the following sentence names `TaxService`. The `?` marks which argument in the printed list failed.
- "Fixing" it by putting `TaxService` in `OrdersModule.imports`. Provider classes are illegal in `imports`.

**Senior-Level Follow-up:**

You export `TaxService`, and the next boot says Nest cannot export `TaxRepository` from `OrdersModule`. What did someone change?

They added `TaxRepository` to `OrdersModule`'s `exports` without providing it there and without importing a module that exports it. `UnknownExportException` says Nest cannot export a provider/module that is not a part of the currently processed module (`OrdersModule`), and tells you to verify whether the exported `TaxRepository` is available in that context. `TaxModule` still does not export the repository, so orders cannot re-export it. Remove it from orders' `exports`. If a caller truly needs the repository, export it from `TaxModule` and accept that the persistence type is now public.

### NEST-042 — Which token exports actually publish

**Difficulty:** Senior

**Category:** Providers

**Question:**

`TaxModule` contains this registration and export. `OrdersModule` imports `TaxModule` and injects `TAX_RULES`. Startup says it cannot resolve `TAX_RULES` in the `OrdersModule` context. A second experiment deletes `TAX_RULES` from `exports` and instead exports the class `VatRule`. That boot fails while creating `TaxModule`, before orders is wired. What is each failure?

```typescript
export const TAX_RULES = Symbol('TAX_RULES');

@Module({
  providers: [
    VatRule,
    { provide: TAX_RULES, useClass: VatRule },
  ],
  exports: [VatRule],
})
export class TaxModule {}
```

**Context and Constraints:**

NestJS 10.4. `VatRule` is `@Injectable()` and has no constructor dependencies. `OrdersModule` does `@Inject(TAX_RULES)`. Default scope. One module registration. The "forgot to export anything" case is NEST-041. This question is exporting a different token than the one consumers inject.

**Senior Engineer's Answer:**

`provide` chooses the token. `useClass` chooses the class Nest constructs for that token. They are equal only in the shorthand `providers: [VatRule]`, which means `{ provide: VatRule, useClass: VatRule }`. In the object above, `TAX_RULES` is the token and `VatRule` is the implementation. The shorthand also registers `VatRule` as its own token, because the class appears alone in `providers`. So this module has two tokens.

`exports: [VatRule]` publishes the class token. It does not publish `TAX_RULES`. Orders injects `TAX_RULES`, so orders fails with the usual unknown-dependency error even though a `VatRule` instance exists and is exported. Consumers that inject `VatRule` succeed. Consumers that inject `TAX_RULES` need `exports: [TAX_RULES]`.

If `VatRule` were not also listed as a class provider, `exports: [VatRule]` would fail earlier, inside `TaxModule`, with `UnknownExportException`: Nest cannot export a provider that is not part of the currently processed module. The symbol would still be the token that must be exported for orders. Export the token you inject. Export the class as well only if some constructor asks for `VatRule` by class.

`useExisting` does not change the rule. `{ provide: TAX_RULES, useExisting: VatRule }` still means callers of `TAX_RULES` need that token exported. `useExisting` only aliases the instance. It does not make the two tokens the same string in the export list.

**Practical Implementation:**

```typescript
@Module({
  providers: [
    VatRule,
    { provide: TAX_RULES, useClass: VatRule },
  ],
  exports: [TAX_RULES],
})
export class TaxModule {}
```

Drop `VatRule` from `providers` if nobody injects the class. Then the only token is `TAX_RULES`, and it is the only export.

**Trade-offs and Alternatives:**

Exporting the symbol keeps the implementation class private, so orders can depend on a port and the module can swap `useClass` later. Exporting both tokens is useful in tests that want to retrieve `VatRule` directly, and it widens the public surface. Exporting only `VatRule` while injecting the symbol is the bug in the question. A string token `'TAX_RULES'` has the same rule and is easier to mistype twice. The symbol constant, defined once and imported in both files, keeps `provide`, `exports`, and `@Inject` on one value.

**Common Mistakes:**

- Assuming `useClass: VatRule` implies `exports` understands `VatRule` as "the TAX_RULES provider."
- Creating the symbol twice, once in the module and once at `@Inject(Symbol('TAX_RULES'))`. Two `Symbol()` calls are two tokens. Export and inject the same constant. `Symbol.for` is the alternative when the key must be shared by string, and it is global in the realm, so the string must be specific.
- Exporting the custom provider object from `exports` by pasting a second `{ provide, useClass }` that is not the registration. Export the token: `exports: [TAX_RULES]`.
- Re-providing `{ provide: TAX_RULES, useClass: VatRule }` in orders so the export "is not needed." Second registration, second instance.

**Senior-Level Follow-up:**

Orders injects `VatRule` by class, and the export list is `[TAX_RULES]` only. `VatRule` remains in `providers` as a class entry. Does the injection resolve?

Yes. The class token is registered in `TaxModule` by the shorthand entry, and it is a different token from `TAX_RULES`. It is not exported, so orders still cannot see it. Export `[TAX_RULES, VatRule]` if both injection styles are intentional. If only the symbol is intentional, delete the shorthand `VatRule` entry and inject `TAX_RULES` from orders. Two tokens that happen to construct the same class are two map entries. Default scope does not merge them.

### NEST-043 — What a request uses from the module that owns the controller

**Difficulty:** Senior

**Category:** Architecture

**Question:**

`GET /orders/42` hits a running Nest 10 HTTP process. `OrdersController` is listed on `OrdersModule`, which provides `OrdersService` and imports `TaxModule` for `TaxService`. `BillingModule` is a sibling under `AppModule` and has its own controller. At the moment the handler runs, what has the module graph already done, what does this request look up, and what is explicitly not part of this answer?

**Context and Constraints:**

NestJS 10.4, default HTTP adapter, default scope. `app.setGlobalPrefix` is not used. Middleware, guards, interceptors, pipes, and exception filters exist in the framework and are the request-lifecycle chapter. Do not describe their order here. No request-scoped providers.

**Senior Engineer's Answer:**

The module graph was sealed at startup. `create()` constructed `OrdersController`, `OrdersService`, and `TaxService`. `init()`, which `listen()` runs, bound routes from each module's `controllers` array onto the adapter. The controller instance that serves `/orders/42` is the one `OrdersModule` constructed. Its `OrdersService` and `TaxService` are the singletons resolved in `OrdersModule`'s context when that instance was built. The request does not import modules, does not re-run the scanner, and does not construct another `OrdersService`.

The path is not the module's name or its folder. `@Controller('orders')` plus `@Get(':id')` is the route. `BillingModule` does not participate in this request because its controller did not own the matched handler. Sibling modules do not share a request-local context. There is no per-request module activation for default-scope providers.

If `BillingController` also declares `@Controller('orders')` and `@Get(':id')`, both handlers are registered. Nest does not treat that as a module-graph error. The adapter has two registrations, and which function runs depends on match order. Do not depend on that order. Give the controllers different paths. Within one controller, a static path such as `@Get('search')` and a parameter path `@Get(':id')` are the same kind of collision if the parameter route is matched first and captures `search`. Define the static route so a literal path is not swallowed. That is route metadata, still not a module import.

Module-scoped middleware, registered from a class that implements `NestModule` and `configure`, is real and is part of the request-lifecycle chapter. It does not change the ownership rule above: the handler that runs is the controller method on the instance the module registered. Guards, pipes, interceptors, and filters are that same chapter. This answer stops at instance identity and module context.

**Practical Implementation:**

```typescript
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly orders: OrdersService,
    private readonly tax: TaxService,
  ) {}

  @Get('search')
  search(): string[] {
    return this.orders.search();
  }

  @Get(':id')
  find(@Param('id') id: string): string {
    return this.orders.find(id, this.tax.rate());
  }
}
```

`search` is declared before `:id` so the literal path is the one you intend to keep distinct. Both methods use the same constructed controller.

**Trade-offs and Alternatives:**

Default scope makes the request path a function call on objects you can reason about at boot. It is the wrong tool when the handler must hold data that belongs to one caller. Pass that data as method arguments from the controller. Changing the service to request scope is a different lifetime, with costs the dependency-injection chapter covers, and it is not required to explain this request. Splitting `search` onto another controller in another module is fine; the path still comes from the decorators, and the new module must provide or import what that controller injects.

**Common Mistakes:**

- Describing the request as "entering `OrdersModule`" as if Nest constructed a module per call. The module was a startup structure. The call hits an instance.
- Expecting `BillingService` to be injectable inside `OrdersController` because the request "goes through the app." It is injectable only if orders' context includes it.
- Assuming the folder name `orders/` prefixes the URL. Only the decorator paths do, plus an application `setGlobalPrefix` if one was set before routes were bound.
- Debugging a duplicate `GET /orders/:id` as a failed import. The graph can be valid while the adapter has two handlers.

**Senior-Level Follow-up:**

`OrdersService` is default scope and stores `this.lastId = id` inside `find`. Two overlapping requests call `find`. What do they share?

They share the one `OrdersService` instance, so `this.lastId` is a race between those calls. The module system does not isolate it. Keep per-request data in local variables or in the return value. A field on a default-scope provider is process state.

### NEST-044 — What Test.createTestingModule compiles

**Difficulty:** Senior

**Category:** Testing

**Question:**

You want a test that constructs `OrdersService` with a fake `TaxService`, runs `onModuleInit` if the service has it, and does not open a port. What does `Test.createTestingModule` from `@nestjs/testing` actually build in Nest 10.4, and which calls run hooks?

**Context and Constraints:**

NestJS 10.4.15. `@nestjs/testing` is the package under test. Default scope. One question on the testing module: no Supertest, no e2e harness, no `createNestApplication` walkthrough. HTTP tests are the testing chapter. `TaxService` is provided by `TaxModule`, which `OrdersModule` imports, and `TaxModule` exports `TaxService`.

**Senior Engineer's Answer:**

`Test.createTestingModule(metadata)` returns a builder. The metadata object is the same kind of object `@Module()` takes: `imports`, `controllers`, `providers`, `exports`. The builder applies it to a generated root module and, on `compile()`, scans that graph and instantiates providers. `compile()` does not bind a port and does not run lifecycle hooks. It returns a `TestingModule`, which is an application context. `moduleRef.get(OrdersService)` returns the default-scope instance. On this object, `get` defaults `strict` to `false`, so it searches the compiled container, not only the generated root's private providers. That is wider than an injected `ModuleRef` inside a feature, NEST-032. A token that resolved only because the test imported an extra module is not evidence the production feature can see that token.

`overrideProvider(TaxService).useValue(fake)` and `.useClass(...)` replace that token before instances are created, including a `TaxService` that arrived through `imports: [OrdersModule]`. Call it before `compile()`. Re-listing `providers: [TaxService]` on the testing root while also importing `OrdersModule` is a second registration on the root, not a replacement of tax's registration. The service orders injected still uses the graph it was wired to. The override is the replacement.

`await moduleRef.init()` runs `onModuleInit` and `onApplicationBootstrap`. `await moduleRef.close()` runs `onModuleDestroy`, `beforeApplicationShutdown`, and `onApplicationShutdown` on the instances that were constructed. `enableShutdownHooks()` is about process signals in a running server, not about whether an explicit `close()` invokes those methods. A test that asserts a connection opened in `onModuleInit` must `init()`. A test that asserts it closed must `close()`. `compile()` alone leaves both undone.

`{ providers: [OrdersService], controllers: [OrdersController] }` does not load `OrdersModule`'s imports. `{ imports: [OrdersModule] }` does. Pass the module under test when the export and import edges are part of what you are proving. Pass a hand-built provider list when you are proving one class and you will override or supply every constructor token yourself.

The builder also replaces the logger with a testing logger unless you pass one, so Nest's own logs stay quiet. `createNestApplication()` is how you obtain an HTTP application from this module. Stop there for this question.

**Practical Implementation:**

```typescript
import { Test } from '@nestjs/testing';
import { OrdersModule } from './orders.module';
import { OrdersService } from './orders.service';
import { TaxService } from '../tax/tax.service';

const tax = { rate: () => 0.2 };

const moduleRef = await Test.createTestingModule({
  imports: [OrdersModule],
})
  .overrideProvider(TaxService)
  .useValue(tax)
  .compile();

const orders = moduleRef.get(OrdersService);
await moduleRef.init();
try {
  orders.place('42');
} finally {
  await moduleRef.close();
}
```

**Trade-offs and Alternatives:**

Compiling `OrdersModule` exercises the real export and import metadata and catches a missing export the way production `create()` would. It is slower and pulls in whatever `OrdersModule` imports. Supplying `providers: [OrdersService, { provide: TaxService, useValue: tax }]` is a smaller container and will not notice that `TaxModule` forgot to export `TaxService`. Use the small container for a pure unit of `OrdersService`. Use `imports: [OrdersModule]` when the question is whether the module graph wires. Overriding at the token is the point of registering `TaxService` in the container rather than constructing it with `new` inside orders.

**Common Mistakes:**

- Expecting `compile()` to call `onModuleInit`. The cache or the socket is still uninitialized. Call `init()`.
- Forgetting `close()` and leaving timers or handles from `onModuleInit` alive so the test runner never exits.
- Asserting `moduleRef.get(TaxRepository)` succeeded in a test that imported a global module, and concluding `OrdersModule` exports the repository. `get` with default `strict: false` searched the whole testing container.
- Calling `overrideProvider` after `compile()`. The instances already exist. Build a new testing module.

**Senior-Level Follow-up:**

`get(TaxService)` in this test returns the fake, and `OrdersModule` in production imports `TaxModule`. A second test compiles only `{ providers: [OrdersService] }` and fails with an unknown dependency on `TaxService`. Is that second failure a production bug?

Not by itself. That metadata never imported `TaxModule` and never provided a stand-in, so the generated root's context has no `TaxService`. Production `OrdersModule` may be fine. Look at the first test, which imports `OrdersModule`, to see the production wiring. Look at the second test to see that `OrdersService`'s constructor requires a token you must supply when you lift the class out of its module.

### NEST-045 — When a useValue promise starts, versus a factory

**Difficulty:** Advanced

**Category:** Providers

**Question:**

Both snippets are meant to provide `MERCHANT_ID` from an async source. One of them starts the work while `AppModule` is still being evaluated. The other starts it when the instance loader constructs providers. Which is which, and what does a rejection do?

```typescript
{ provide: MERCHANT_ID, useValue: readMerchantId() }

{
  provide: MERCHANT_ID,
  useFactory: () => readMerchantId(),
}
```

`readMerchantId(): Promise<string>` hits the network.

**Context and Constraints:**

NestJS 10.4. `readMerchantId` returns a promise and does not throw synchronously. `AppModule`'s decorator is the call site that contains these objects. Default scope. No `forRoot` discussion beyond the evaluation timing you already use for decorators. Config loading is NEST-039.

**Senior Engineer's Answer:**

The `useValue` expression is an argument to an object literal that is evaluated when the decorator runs, which is when the module file is evaluated. `readMerchantId()` is called then. Nest stores the promise as the value. A `useValue` whose value is a promise is marked async, and the instance loader awaits that same promise during `create()` before dependents are constructed. The await is later. The network call already started at evaluation time. A rejection becomes a failed instance creation during `create()`, and it can also surface as an unhandled rejection if nothing else observes the promise in the gap before the loader awaits it.

The `useFactory` function is not called at evaluation time. The instance loader calls it while instantiating providers, during `create()`, and awaits the promise it returns. The network call starts then, after the module graph has been scanned and in dependency order relative to `inject`. A rejection fails `create()`. Dependents are not given a merchant id. `listen()` does not run if `create()` throws, subject to `abortOnError` on the `create()` path, which is the path from NEST-001. This factory has no `inject`, so it still must not expect other providers unless they are listed.

Prefer the factory for I/O. It participates in instantiation order, it can `inject` `ConfigService`, and it does not start work because a test imported the module file and never called `compile()`. `useValue` is for a value you already hold.

**Practical Implementation:**

```typescript
{
  provide: MERCHANT_ID,
  useFactory: (config: ConfigService) => config.getOrThrow<string>('PAYMENTS_MERCHANT_ID'),
  inject: [ConfigService],
}
```

If the id truly requires a network call, that call belongs in this factory, not in the object literal, and a rejection should be allowed to fail `create()`.

**Trade-offs and Alternatives:**

A factory that performs I/O makes startup depend on the network, which is the right failure for a required merchant id and a slow boot for a flaky one. `useValue: process.env.PAYMENTS_MERCHANT_ID` avoids the promise and still has the evaluation-time read from NEST-039. `onModuleInit` on a client that already received a synchronous id is the place for a connection, when the id itself is not async. Hiding the promise in `useValue` so the module "looks sync" moves the start time to import and makes tests pay for the call by importing the file.

**Common Mistakes:**

- Describing both snippets as "Nest calls this when the provider is created." Only the factory is a call Nest makes.
- Catching the factory error and returning `undefined`, so dependents boot with a missing id.
- Importing `AppModule` in a unit test that never compiles the container, and being surprised the `useValue: readMerchantId()` call already ran.
- Listing `ConfigService` as a factory parameter and omitting `inject`. The parameter is `undefined`. NEST-004.

**Senior-Level Follow-up:**

The factory is `async` and its `inject` list includes a token from a non-global `ConfigModule`. `AppModule` imports `ConfigModule` and this payments module. The factory still fails with an unknown dependency. Why?

The factory's module context is the module that registered it, not `AppModule`. Import `ConfigModule` from the payments module, or mark config global and accept NEST-010. `AppModule` importing both siblings does not put `ConfigService` in the factory's parameter list.

### NEST-046 — What LazyModuleLoader.load adds to the graph

**Difficulty:** Advanced

**Category:** Modules

**Question:**

`ReportsModule` is large and some operators want it out of the startup scan, loaded only when a user opens a report. `LazyModuleLoader` from `@nestjs/core` is available in Nest 10.4. What does `load` do, what does a second `load` of the same module do, and what does this call not do for HTTP?

**Context and Constraints:**

NestJS 10.4.15. `ReportsModule` is not in `AppModule.imports`. The loader is injected into a default-scope service that is part of the startup graph. No microservice adapter. Route binding and middleware stay out of scope except to say whether `load` performs them.

**Senior Engineer's Answer:**

`LazyModuleLoader.load` takes a function that returns a module class, a dynamic module, or a promise of either. The function is the delay: `() => import('./reports.module').then(m => m.ReportsModule)` keeps the file out of the startup evaluation. `load` scans that module, links its dependencies, and instantiates its providers. It returns the module's `ModuleRef`, so the caller can `get` an exported or local provider.

In 10.4.15, if the module is already in the container, `load` does not build a second copy. It returns a `ModuleRef` for the module that is already there. A second call is not a second instance of a default-scope provider.

`load` uses the dependencies scanner and the instance loader. It does not run the HTTP routes resolver. A controller listed on `ReportsModule` is not added to the adapter by this call, so `GET /reports` does not start existing because a user opened a screen. Lazy loading in this API is a way to instantiate providers later, then retrieve them from the returned `ModuleRef`. It is not a way to mount a feature's routes on first use. If reports must be an HTTP surface, import `ReportsModule` from the root so `init()` binds those controllers before `listen()`.

`load` also does not call `onModuleInit`. The instance loader constructs instances. Hooks are an application-context `init()` concern. A reports client that opens a socket in `onModuleInit` will not open it merely because `load` returned. If the service needs that hook, keep the module in the startup graph, or run the setup from an explicit method you call after `get`.

`load` accepts `{ logger: false }` when you need the loader's own log silenced. That flag does not change the graph.

**Practical Implementation:**

```typescript
import { Injectable } from '@nestjs/common';
import { LazyModuleLoader } from '@nestjs/core';

@Injectable()
export class ReportsGateway {
  constructor(private readonly lazy: LazyModuleLoader) {}

  async total(): Promise<number> {
    const moduleRef = await this.lazy.load(() =>
      import('./reports.module').then(m => m.ReportsModule),
    );
    const reports = moduleRef.get(ReportsService);
    return reports.total();
  }
}
```

`ReportsService` has to be visible to that module ref: provided by `ReportsModule`. `get` here is the module ref `load` returned. Pass `{ strict: false }` only if you intend the wider search from NEST-032, and do not use it to reach into unrelated modules.

**Trade-offs and Alternatives:**

Lazy load shortens startup and moves the import cost, and the failure, onto the first caller. A missing export then becomes a request error instead of a failed deploy. Importing `ReportsModule` from `AppModule` does the opposite: slower boot, faster first request, and a graph you can read in `imports`. Prefer the eager import unless the module is optional for this process. A separate worker with `createApplicationContext`, NEST-019, is the right split when reports should not be in the HTTP process at all. Lazy load is not that split. It stays in-process.

**Common Mistakes:**

- Putting `ReportsController` on the lazy module and expecting `load` to register `GET /reports`.
- Expecting `onModuleInit` to run inside `load` and wondering why the client is unconnected.
- Calling `load` on a path that throws, catching the error, and continuing with a stale `ModuleRef` from a previous call that loaded a different module.
- Importing `./reports.module` at the top of the gateway file. The static import evaluates the module during startup and gives up the reason you used a function.

**Senior-Level Follow-up:**

`ReportsModule` is also listed in `AppModule.imports`, and a request calls `load(() => ReportsModule)`. What instance does `get(ReportsService)` return?

The instance constructed at startup. `load` sees that the module is already in the container and returns a reference to it. You paid for the module at boot and gained nothing from `load`. Remove it from `AppModule` if the lazy path is real, or remove `load` if the eager import is real. Keeping both is how the "lazy" feature silently stops being lazy.

### NEST-047 — How a custom logger sees bootstrap logs

**Difficulty:** Intermediate

**Category:** Lifecycle

**Question:**

`AppLogger` is an `@Injectable()` provider that implements `LoggerService` and writes to the company's log drain. Logs emitted while `NestFactory.create` is constructing providers never reach the drain. Logs after `listen` do, but only if the team remembers a second line. What is the Nest 10 sequence that attaches this logger early enough?

**Context and Constraints:**

NestJS 10.4. `LoggerService` from `@nestjs/common` requires `log`, `error`, and `warn`. `debug` and `verbose` may be omitted. `AppLogger` is constructed by the container and may inject `ConfigService`. No custom transport library. `bufferLogs` and `useLogger` are the application APIs in play.

**Senior Engineer's Answer:**

`NestFactory.create(AppModule)` accepts an options object. `logger` can be `false`, a log-level list such as `['error', 'warn']`, or a `LoggerService` instance. An instance you pass there is not the DI-managed `AppLogger`, because the container does not exist until `create` has started, and you cannot `app.get` a logger before `create` returns.

`bufferLogs: true` tells Nest to hold bootstrap messages instead of writing them only to the default logger. After `create` resolves, providers exist, so `app.get(AppLogger)` returns the instance whose constructor already ran. `app.useLogger(app.get(AppLogger))` installs it and flushes the buffer into that logger. Messages from the rest of `init()` and from `listen` then use `AppLogger`. If you omit `bufferLogs`, the lines emitted during `create` have already gone to the default logger before `useLogger` runs. `useLogger` does not replay them.

`AppLogger` itself must not require the flushed buffer in its constructor. It is constructed during `create`, as part of the graph being logged. Keep its constructor limited to other providers, and write to the drain from `log` / `error` / `warn`.

Levels passed as `logger: ['log', 'error', 'warn']` filter Nest's logger. They are not a `LoggerService`. Use one or the other. `logger: false` silences Nest's logger entirely, which is a blunt way to keep tests quiet and a bad production setting if you still need the drain.

**Practical Implementation:**

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppLogger } from './app.logger';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(AppLogger));
  await app.listen(3000);
}
```

```typescript
import { Injectable, LoggerService } from '@nestjs/common';

@Injectable()
export class AppLogger implements LoggerService {
  log(message: unknown): void {
    this.write('log', message);
  }
  error(message: unknown): void {
    this.write('error', message);
  }
  warn(message: unknown): void {
    this.write('warn', message);
  }
  private write(level: string, message: unknown): void {
    // Send level and message to the drain.
    void level;
    void message;
  }
}
```

Register `AppLogger` in a module the root imports, and export it if `app.get` would otherwise be relying on a non-strict search you do not want. `app.get` defaults `strict` to `false`, so a provided logger is found. Prefer also exporting it from a module you can name.

**Trade-offs and Alternatives:**

Buffering keeps one drain for bootstrap and for request logs, and it means a broken `AppLogger` constructor fails `create` before the buffer is flushed, so the earliest lines may exist only in the buffer that never flushed. Passing a logger you construct yourself, such as `new ConsoleLogger()` from `@nestjs/common`, in the `create` options attaches earlier and cannot inject `ConfigService`. Use the options instance when the drain needs no DI. Use `bufferLogs` plus `useLogger` when it does. Tests can `overrideProvider(AppLogger)` with a spy, or leave the testing module's default quiet logger alone. NEST-044.

**Common Mistakes:**

- Calling `app.useLogger` after `listen()` and expecting creation logs to move to the drain.
- `new AppLogger()` inside `bootstrap` and passing it to `useLogger`, while the class's real dependencies are never injected.
- Implementing only `log` and omitting `error` or `warn`. The interface requires those three.
- Injecting `Logger` from `@nestjs/common` into `AppLogger`'s constructor and writing there. You are inside the construction `bufferLogs` is trying to capture, and you can recurse if that write uses `AppLogger` again.

**Senior-Level Follow-up:**

`create` is called with `{ logger: false, bufferLogs: true }`, then `useLogger(app.get(AppLogger))`. Which messages does `AppLogger` still miss?

`logger: false` turns Nest's logger off. Buffering does not by itself recreate messages that logger never recorded. Use `{ bufferLogs: true }` without `logger: false` when the goal is to flush bootstrap into `AppLogger`. Use `logger: false` when the goal is silence, and do not expect a later `useLogger` to invent the missing lines.

### NEST-048 — What INQUIRER refers to

**Difficulty:** Advanced

**Category:** Dependency injection

**Question:**

A factory provider wants the name of the class it is being injected into, so a logger can say `OrdersService` rather than `App`. Nest 10.4 exports `INQUIRER` from `@nestjs/core`. What does that token resolve to, and why is a default-scope factory a bad place to read it?

**Context and Constraints:**

NestJS 10.4.15. `INQUIRER` is the string constant `'INQUIRER'` exported from `@nestjs/core`. Import the constant. Default scope unless the answer says otherwise. Full transient and request scope rules stay in the dependency-injection chapter. This question is only what the token points at during construction.

**Senior Engineer's Answer:**

When Nest constructs a class, a factory that lists `INQUIRER` in `inject` receives the wrapper of the class currently being constructed, the inquirer. In a factory used the way the logger example is written, that value is how you learn the consumer's name at the moment the dependency is created. It is not the object that later calls a method. It is not `ModuleRef`. It is not the module class unless the module class is what is being constructed.

A default-scope provider is instantiated once. The factory runs once, during that instantiation. `INQUIRER` is whoever Nest was constructing on that single run. Every later consumer of the cached logger shares that first inquirer. The log line will name one class forever, which is why it looks "right" in a tiny app and wrong as soon as a second service injects the same provider.

The documented pairing is a transient provider: a new instance per consumer, so the factory runs again for each consumer and `INQUIRER` is that consumer. Transient scope changes instance counts for the dependents that inject it. Do not enable it just to fix a label until you have read the scope rules. If all you need is a category string, pass the string at the call site (`logger.log(message)` with the service name in the message) or construct a tiny wrapper with `useFactory` per feature module under a feature-specific token. Both keep default scope.

Do not compare against the raw string `'INQUIRER'` sprinkled through the code when the constant is already exported. Use the constant, so a typo is an import error.

**Practical Implementation:**

```typescript
import { Inject, Injectable, Scope } from '@nestjs/common';
import { INQUIRER } from '@nestjs/core';

@Injectable({ scope: Scope.TRANSIENT })
export class NamedLogger {
  constructor(@Inject(INQUIRER) private readonly inquirer: object | undefined) {}

  log(message: string): void {
    const name = this.inquirer?.constructor?.name ?? 'unknown';
    // write name and message
    void name;
    void message;
  }
}
```

The factory form Nest's own examples use is `{ provide: NamedLogger, scope: Scope.TRANSIENT, useFactory: (inquirer) => new NamedLogger(inquirer), inject: [INQUIRER] }`. The class form above depends on Nest supplying `INQUIRER` when the parameter metadata matches. If the parameter type is `object`, metadata will not be the `INQUIRER` token. Use `@Inject(INQUIRER)` on that parameter, or the factory form, so the token is explicit.

**Trade-offs and Alternatives:**

Transient loggers give you a true per-consumer name and multiply instances. A single default-scope logger with the category passed as an argument is one object and honest call sites. A per-module `useFactory` that closes over a string `'OrdersModule'` is static and cannot drift when a second service in the module logs. Prefer the argument or the per-module string unless you have a real need for the consumer's class name and you accept transient scope.

**Common Mistakes:**

- Injecting `INQUIRER` into a default-scope singleton and logging "the current caller" on each request. The value was fixed at construction.
- Forgetting `@Inject(INQUIRER)` when the TypeScript type is `object` or a custom interface. Emitted metadata will not be the constant.
- Using `INQUIRER` to reach the other class's fields during construction. You are inside the cycle of "who is being built," and those fields may not be assigned. It is an identity hook, not a service locator.
- Requesting `INQUIRER` from `moduleRef.get(INQUIRER)` later. It is meaningful in the factory or constructor that is running while a parent is being created, not as a process-wide provider you look up from a handler.

**Senior-Level Follow-up:**

`NamedLogger` is transient and injects `INQUIRER`. `OrdersService` is default scope and injects `NamedLogger`. How many loggers exist, and whose name do they carry?

One logger for that `OrdersService` instance, named for `OrdersService`, because the service is constructed once and asks for one transient logger. A second default-scope service that also injects `NamedLogger` gets a different logger instance, named for the second service. If `OrdersService` were itself transient, each `OrdersService` instance would get its own logger. The inquirer is the class being constructed at that moment, which is `OrdersService`, not the controller that will later call `orders.find`.

### NEST-049 — How an undefined dependency differs from a missing provider

**Difficulty:** Advanced

**Category:** Dependency injection

**Question:**

Two boots fail. Boot A prints that Nest encountered an undefined dependency and that this may be a circular import or a missing dependency declaration, then a dependencies error whose argument name is not a class. Boot B prints `Nest can't resolve dependencies of the OrdersController (?)` and then `Please make sure that the argument TaxService at index [0] is available in the OrdersModule context.` Both mention index 0. How do you tell the causes apart in Nest 10.4?

**Context and Constraints:**

NestJS 10.4.15 message text. No source dive through the injector. `forwardRef` mechanics are NEST-028. Barrels are NEST-023. A provider that exists but is not exported is NEST-041. This question is the triage.

**Senior Engineer's Answer:**

Boot B has a real token. The sentence names `TaxService` and the module context `OrdersModule`. Nest looked up `TaxService` in that context and did not find it. The fixes are the context fixes: add it to `providers` in `OrdersModule`, or import a module that `exports` it, or export it from the module already imported. `@Optional()` would hide the miss. A second `providers: [TaxService]` in orders would create a second instance. The message is the one NEST-041 walks line by line. The `?` in the parenthesized list marks which parameter failed. The following sentence still names the class when the class was emitted.

Boot A is the branch that runs when the parameter value itself is `undefined`. Nest logs `Nest encountered an undefined dependency. This may be due to a circular import or a missing dependency declaration.` and throws `UndefinedDependencyException`. The user-facing dependency text cannot name a class, because the metadata slot is empty. Something in the cycle of file evaluation stored `undefined` in `design:paramtypes` or in an `imports` entry. Typical causes are a circular `import` between the two class files, or a barrel that re-enters a file before the class binding exists. `forwardRef(() => OtherClass)` is the tool when both classes exist and the graph is genuinely cyclic. It is not the tool when the barrel is the cycle. NEST-023.

A third message appears before either of these when `imports` holds `undefined`: Nest cannot create the module instance, the module at a given index of the `imports` array is undefined, and the hint lists circular imports and bad import statements. That one is file evaluation of a module token, not a constructor parameter. Read the first sentence before editing `providers`.

`UnknownExportException` is a fourth failure, during module creation rather than during the controller's construction: Nest cannot export a provider that is not part of the currently processed module. You asked to export a token you never provided and never imported. NEST-042.

**Practical Implementation:**

```typescript
// Boot B, after the message names TaxService in OrdersModule.
@Module({
  imports: [TaxModule], // TaxModule's exports include TaxService
  controllers: [OrdersController],
})
export class OrdersModule {}
```

```typescript
// Boot A, when orders and billing construct each other and both classes exist.
constructor(
  @Inject(forwardRef(() => BillingService))
  private readonly billing: BillingService,
) {}
```

Apply the matching fix, not both. Wrapping a missing export in `forwardRef` does not put the token in the module context.

**Trade-offs and Alternatives:**

`NEST_DEBUG=true` prints the scanner's resolution trace when the message is not enough to see which file produced `undefined`. It is noisy, and it is cheaper than rearranging imports at random. A minimal reproduction that imports only the two modules named in the error distinguishes Boot B, which reproduces without any cycle, from Boot A, which reproduces only when both files load. Fix the case you reproduced.

**Common Mistakes:**

- Treating every `?` as a circular import. Boot B's `?` can sit beside a named `TaxService` argument. Read the sentence after the parenthesis.
- Adding `@Injectable()` for Boot B when the decorator is already present and the token is named. The class is known. The context is missing the registration or the export.
- Adding the provider to `exports` in the consuming module. Exports publish a token the module already has. They do not pull a token in. Imports do.
- Using `forwardRef` for Boot B. The class is defined. The module graph never exported it.

**Senior-Level Follow-up:**

The message is `Please make sure that the "tax" property is available in the current context.` There is no index. What style of injection failed, and which boot is it?

Property injection. Nest had a property key (`tax`) rather than a constructor index, so the index branch of the message is skipped. The token lookup is still Boot B's kind of failure if the property's `@Inject()` token is a real class the module cannot see: export or import it. If the property metadata itself is `undefined`, you are back on Boot A's branch, and the log line about an undefined dependency will be there too. NEST-030 is why this shows up as a property name.

### NEST-050 — Why new inside a factory hides a dependency

**Difficulty:** Staff-Level

**Category:** Architecture

**Question:**

`PricingModule` exports one token, `TAX_RULES`, from a factory. The factory body is `return [new VatRule(), new DutyRule(process.env.DUTY_RATE)]`. The module graph shows a single provider with no imports. Tests that `overrideProvider(VatRule)` do nothing. A missing `DUTY_RATE` throws on the first price, not at boot. What is the container actually managing, and what registration makes the graph tell the truth?

**Context and Constraints:**

NestJS 10.4. Default scope. `VatRule` and `DutyRule` are `@Injectable()` classes. `DutyRule` should receive a number, not read the environment. The list-shaped provider is NEST-029. Configuration as a provider is NEST-037. No new framework API. One process.

**Senior Engineer's Answer:**

The container manages `TAX_RULES` and nothing else in this factory. `new VatRule()` allocates an object the injector did not construct. Nest will not call its `onModuleInit`, will not inject its constructor, and will not replace it when a test overrides the `VatRule` token, because that token was never consulted. `overrideProvider` replaces a registration. There is no registration. `process.env.DUTY_RATE` is read when the factory runs, during `create()`, which is better than a top-level read and still worse than a config provider: a missing rate throws only if this line throws, the key is invisible to `validate`, and a second module that also news up `DutyRule` can read the environment differently.

The graph should name every rule the array can contain. Register `VatRule` and `DutyRule` as providers. Inject them into the factory. Pass the rate from `ConfigService` or from a `PAYMENTS`-style options token, not from `process.env` inside the rule. Export `TAX_RULES` if other modules inject the list. Leave the rule classes unexported if callers must go through the list. Then a missing rule fails `create()` with an unknown-dependency error, `validate` or `getOrThrow` fails a missing rate before pricing runs, and `overrideProvider(VatRule)` replaces the instance the factory receives.

That is the staff-level reading of a small factory. The module metadata is the dependency manifest, the same claim as NEST-024, applied to objects created inside functions rather than to `@Global()`. A factory is allowed to compute a value. It is not allowed to become a second, unlisted composition root. If a rule is optional, put `@Optional()` or `{ token, optional: true }` on that inject entry so the absence is written down. An unlisted `new` is an absence nobody can see.

**Practical Implementation:**

```typescript
@Module({
  imports: [ConfigModule],
  providers: [
    VatRule,
    DutyRule,
    {
      provide: DUTY_RATE,
      useFactory: (config: ConfigService) => Number(config.getOrThrow<string>('DUTY_RATE')),
      inject: [ConfigService],
    },
    {
      provide: TAX_RULES,
      useFactory: (vat: VatRule, duty: DutyRule) => [vat, duty],
      inject: [VatRule, DutyRule],
    },
  ],
  exports: [TAX_RULES],
})
export class PricingModule {}
```

`DutyRule` takes `@Inject(DUTY_RATE) private readonly rate: number` in its constructor. `ConfigModule` in `imports` assumes it is not global. If it is global, the import is the explicit edge from NEST-035's follow-up, and you may still keep it.

**Trade-offs and Alternatives:**

Registering each rule is more metadata and is the list a reviewer can approve. Constructing rules with `new` is fewer tokens and an invisible graph, which is acceptable only for a pure value with no dependencies and no lifecycle, such as a constant configuration object you already hold. A rule class with a rate, a client, or a hook does not qualify. Discovery-based plugin loading is the other honest design: the set is open, missing plugins do not fail boot, and the product accepts that. Pricing rules that must all run are a closed set. Closed sets are `inject` arrays.

**Common Mistakes:**

- Overriding `TAX_RULES` in a test and believing that also replaced `VatRule`. The override replaces the array. The classes inside the old factory are still unregistered if the factory still uses `new`. After the fix, override `VatRule` and let the real factory build the array, or override `TAX_RULES` with a ready-made array. Do not expect one override to imply the other.
- Keeping `new DutyRule(config.getOrThrow('DUTY_RATE'))` inside the factory. The rate is now required, which is an improvement, and `DutyRule` is still invisible to `overrideProvider` and to hooks.
- Exporting only `TAX_RULES` and also injecting `VatRule` from another module. The class token is not exported. Export it if that injection is real, or stop injecting the class from outside.
- Marking the factory `@Optional()` by omitting a rule when `get` returns `undefined`. Optional is a property of an `inject` entry. A missing environment variable should throw in `validate` or `getOrThrow`, not become a shorter array.

**Senior-Level Follow-up:**

The corrected factory injects `VatRule` and `DutyRule`. A test compiles `PricingModule` and `overrideProvider(VatRule).useValue({ apply: () => 0 })`. `moduleRef.get(TAX_RULES)` returns an array whose first element is that fake. Why did this start working, and what would still return a real `VatRule`?

The factory now receives whatever the `VatRule` token is bound to, and the override replaced that binding before `compile()` instantiated providers. A real `VatRule` comes back if the override was registered after `compile()`, if it targeted a different token than `VatRule`, or if some other function still executes `new VatRule()` and ignores the container. `get(TAX_RULES)` returning the fake is the check that the array is a function of the registrations, which is the property the `new` version did not have.
