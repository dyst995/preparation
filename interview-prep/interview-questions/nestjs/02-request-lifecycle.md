# NEST02 — Request lifecycle

NestJS 10, Express adapter unless noted. Questions NEST-051–NEST-100.

Version pin: the order below follows NestJS 10.4 (checked against 10.4.15). Enhancer APIs are the `@nestjs/common` and `@nestjs/core` surface of that line: `NestMiddleware`, `CanActivate`, `NestInterceptor`, `PipeTransform`, `ExceptionFilter`, `ExecutionContext`, `ArgumentsHost`, `createParamDecorator`, `ParseIntPipe`, `DefaultValuePipe`, `HttpException`, `Reflector`, `APP_GUARD`, `APP_PIPE`, `APP_INTERCEPTOR`, and `APP_FILTER`.

`NestFactory.create()` has already built the container before any of this runs. `listen()` calls `init()` when the application is not initialized yet. `init()` registers the Express JSON and urlencoded parsers (unless `bodyParser: false`), then module middleware, then routes, then `onModuleInit`, then the not-found handler and the Express error handler, then `onApplicationBootstrap`. Per-request work starts after that. Module `imports` / `providers` / `exports` are the previous file.

### NEST-051 — The order one HTTP request walks

**Difficulty:** Intermediate

**Category:** Lifecycle

**Question:**

A `GET` reaches a controller method that has module middleware, a global guard, a route interceptor, a parameter pipe, and a global exception filter. The method returns a plain object and nothing throws. What runs, in what order, and which of those pieces does Nest skip on this request?

**Context and Constraints:**

NestJS 10.4.15, Express adapter. One route. Middleware was bound with `MiddlewareConsumer`. The guard returns `true`. The interceptor calls `next.handle()` and maps the result. The pipe returns the value it received. Default provider scope. No `@Res()` and no `@Sse()`.

**Senior Engineer's Answer:**

Nest's own summary, which matches the 10.4.15 router, is: middleware, then guards, then the interceptor code that runs before `next.handle()`, then pipes, then the controller method, then the interceptor operators subscribed to the observable `next.handle()` returns, then the adapter writes the response. Exception filters are not in that success path. They run when an exception leaves the route proxy.

On this request the Express stack hits the module middleware first. The middleware calls `next()`. The route proxy then runs guards. Global guards run, then controller guards, then route guards. This route has one global guard, it returns `true`, and the method is still eligible.

The interceptor consumer then builds an `ExecutionContext` that carries the controller class and the method. Inbound interceptor code runs global, then controller, then route. This route has a route interceptor. The statements before `next.handle()` run here. `next.handle()` is the inner call that applies pipes and then invokes the controller method. Pipes for that call are global, then controller, then route, then the pipes listed on that parameter. The method body runs only after those pipes resolve. A service call inside the method is ordinary TypeScript. Nest does not have a separate service stage.

The method's return value is normalized into an RxJS observable. Operators on `next.handle()` run route, then controller, then global, because each outer interceptor subscribed around the inner one. The route interceptor's `map` sees the object the method returned. After the observable settles, the route proxy writes the body. `GET` was given status 200 after the guard succeeded and before the interceptor ran, unless `@HttpCode()` said otherwise. The global exception filter's `catch` is not called.

**Practical Implementation:**

```typescript
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class EnvelopeInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map(data => ({ data })));
  }
}
```

Bind `EnvelopeInterceptor` on the handler that should wrap successful bodies. The object the client receives is `{ data: <method return> }` when the method returns a plain value and nothing throws.

**Trade-offs and Alternatives:**

Putting the same steps in one Express middleware function is possible and collapses the context Nest gives you later: the middleware does not receive the controller method. Keeping guards, pipes, and interceptors separate makes the allow-or-deny decision, the argument conversion, and the response shape readable at the handler. A filter still belongs on the failure path, so a success-only wrapper stays an interceptor.

**Common Mistakes:**

- Describing filters as a stage that runs after every response. On a normal return they do not run.
- Putting pipes before guards, or the handler before pipes.
- Treating the interceptor as inbound-only. The `map` on `next.handle()` runs after the method returns.
- Expecting Nest to call a service by itself because a diagram drew a service box between the handler and the response.

**Senior-Level Follow-up:**

The same request throws inside the controller method. Which of the stages above still run?

Middleware, the guards, and the interceptor code before `next.handle()` have already run. The pipe on the way in has already run. The rest of the method does not. The interceptor's `map` does not see a value. If that interceptor has `catchError` and it rethrows, or it has no `catchError`, the exception leaves the route proxy and the exception filter runs. The adapter's normal `reply` of the return value does not run.

### NEST-052 — What middleware is allowed to touch

**Difficulty:** Intermediate

**Category:** Middleware

**Question:**

`LoggerMiddleware` implements `NestMiddleware` and its `use` method receives `req`, `res`, and `next`. The team wants it to reject callers who lack a role declared by `@Roles()` on the handler. Why is middleware the wrong place for that check, and what must `use` do before it returns?

**Context and Constraints:**

NestJS 10.4.15, Express adapter. The middleware is a class applied from `configure()`. `@Roles()` stores metadata on the route handler. No guard is bound.

**Senior Engineer's Answer:**

Middleware on the Express adapter is Express middleware. `use(req, res, next)` can read and write the request and the response, end the response, or call `next()` to continue the stack. It does not receive an `ExecutionContext`. It does not receive the controller class or the handler reference that `Reflector` needs in a guard. By the time module middleware runs, Express has matched a path pattern, and Nest has not yet entered the route proxy that knows which controller method will run. A role check that reads handler metadata belongs in a guard, which runs inside that proxy and is given `getHandler()` and `getClass()`.

If `use` neither ends the response nor calls `next()`, the request sits until the client or the platform times out. Nest does not insert a `next()` for you. Ending the response from middleware, for example `res.status(401).json(...)`, stops the stack. Guards, interceptors, pipes, and the handler do not run, because their proxy is later in the stack.

Class middleware is constructed by the container when the consumer registers the class, so a constructor dependency from that module can be injected. That does not add an `ExecutionContext`. Functional middleware registered with `consumer.apply(logger)` is a function. Use a function when there is nothing to inject. Use a class when `use` needs a service the module can see.

**Practical Implementation:**

```typescript
import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const incoming = req.header('x-request-id');
    const requestId = incoming && incoming.length > 0 ? incoming : crypto.randomUUID();
    res.setHeader('x-request-id', requestId);
    next();
  }
}
```

This middleware stamps a header and always continues. It does not try to read route metadata.

**Trade-offs and Alternatives:**

Attaching `req.user` in middleware is reasonable when every route behind that path needs the same authentication result and the check does not depend on handler metadata. The guard then only decides authorization. Doing both authentication and a per-handler role check in middleware splits the role rules away from the handlers that declare them. A guard keeps the declaration and the decision in one place.

**Common Mistakes:**

- Calling `Reflect.getMetadata` on a controller inside `use` and assuming the matched handler is known. The middleware was bound to a path, which may cover several methods.
- Forgetting `next()` after a successful check.
- Writing the response and also calling `next()`, so the handler runs and tries to write a second response.
- Expecting `use` to receive `ExecutionContext` the way `canActivate` does.

**Senior-Level Follow-up:**

The middleware calls `next()` and also wants a log line after the handler finishes. Where does that line go?

Register a listener such as `res.on('finish', ...)` inside `use` if the log only needs the status code Express eventually sends. That callback is response completion, not a Nest interceptor. If the log must see the value the controller returned, before the adapter writes it, that observation is the outbound side of an interceptor.

### NEST-053 — forRoutes, exclude, and the global prefix

**Difficulty:** Senior

**Category:** Middleware

**Question:**

`AppModule` implements `NestModule`. `configure` applies `RequestIdMiddleware` to `OrdersController`, excludes `GET health`, and the bootstrap calls `app.setGlobalPrefix('api')` before `listen()`. Which requests run the middleware?

**Context and Constraints:**

NestJS 10.4.15, Express adapter. `OrdersController` is `@Controller('orders')` with `GET /` and `GET :id`. A separate `@Controller('health')` has `GET /`. Global prefix exclude list is empty. Path syntax is the 10.4 Express 4 form. The `*splat` and `{*splat}` wildcard spellings belong to the Express 5 line and are outside this pin.

**Senior Engineer's Answer:**

`configure(consumer)` runs during `init()`, once, when Nest is binding the application. It does not run per request. `consumer.apply(RequestIdMiddleware).forRoutes(OrdersController)` asks the routes mapper for every path that controller declares and registers the middleware on those paths. `GET /api/orders` and `GET /api/orders/:id` run it. `GET /api/health` does not, because that controller was not passed to `forRoutes`.

`exclude` removes routes from that registration. The exclusion is compiled with `path-to-regexp` and compared to the request pathname, with the query string stripped. An exclusion of `{ path: 'health', method: RequestMethod.GET }` does nothing for this binding, because `health` was never in `forRoutes`. Exclude only punches holes in the routes you just selected.

In 10.4.15 `RouteInfoPathExtractor` prefixes middleware paths with the global prefix that is already on `ApplicationConfig` when middleware is registered. `setGlobalPrefix('api')` before `listen()` means the bound paths are `/api/orders` and `/api/orders/:id`. A prefix applied after `init()` has already run is too late for this registration. Routes listed in `setGlobalPrefix('api', { exclude: [...] })` stay unprefixed, and the extractor leaves those middleware paths unprefixed too.

A wildcard registered as `forRoutes('*')` is one of the 10.4 special cases (`*`, `/*`, `(.*)`, and the slash-prefixed forms of those). That registration is mounted broadly and the prefix is applied. A pattern such as `orders/(.*)` is an ordinary `path-to-regexp` path, also prefixed.

**Practical Implementation:**

```typescript
import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { RequestIdMiddleware } from './request-id.middleware';

@Module({
  controllers: [OrdersController],
})
export class OrdersModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(RequestIdMiddleware)
      .exclude({ path: 'orders/:id', method: RequestMethod.GET })
      .forRoutes(OrdersController);
  }
}
```

With prefix `api`, `GET /api/orders` runs the middleware. `GET /api/orders/15` matches the exclusion and skips it. Other controllers are untouched.

**Trade-offs and Alternatives:**

Passing a controller class keeps the middleware aligned with the routes the controller actually declares. Passing a string path is better when the middleware should cover several controllers that share a URL prefix. Excluding inside `configure` is local and visible. A global prefix exclude is a different list: it changes the public URL, not the middleware hole.

**Common Mistakes:**

- Treating `exclude('health')` as an application-wide bypass when the `forRoutes` list never included `health`.
- Using a Nest 11 wildcard token such as `*splat` on a 10.4 Express 4 app and expecting the 10.4 wildcard branch to recognize it.
- Calling `setGlobalPrefix` after `listen()` and expecting middleware paths to gain `api`.
- Forgetting that `forRoutes(OrdersController)` follows the controller prefix. The middleware path is `orders`, not every route in the process.

**Senior-Level Follow-up:**

`configure` is declared `async` and awaits a remote call before `apply`. When does that call happen?

During `init()`, before the server accepts connections. `configure` may be async, and Nest awaits it while loading middleware configuration. A slow or failing remote call delays or fails startup. It does not run on the first request.

### NEST-054 — app.use and the JSON parser

**Difficulty:** Senior

**Category:** Middleware

**Question:**

Bootstrap does `const app = await NestFactory.create(AppModule)`, then `app.use(logger)`, then `await app.listen(3000)`. `logger` reads `req.body`. The body is always `undefined` for a JSON `POST`, while a middleware bound in `configure()` sees the parsed body. Why?

**Context and Constraints:**

NestJS 10.4.15, Express adapter. `bodyParser` is left at its default. `logger` is a function `(req, res, next) => { ... }`. No manual `express.json()`.

**Senior Engineer's Answer:**

`create()` returns before `NestApplication.init()`. `app.use(logger)` appends to the Express stack at that moment. `listen()` then calls `init()`. `init()` registers the JSON and urlencoded parsers first, unless `bodyParser: false` was passed to `create()`. After the parsers, `init()` registers middleware that `configure()` collected, then the routes, then the not-found handler and the error handler.

Express runs middleware in registration order. `logger` was registered before the parser, so it runs while `req.body` is still unset, then the parser runs, then module middleware, then the route. The middleware from `configure()` sits after `express.json()`, so it sees the parsed body.

`app.use` also has no access to the Nest container. A class that needs a constructor dependency is bound from `configure()`, or you accept a function that closes over values you already have. `app.use` after `listen()` appends after the routes. A matched route has already ended the cycle, so that late middleware does not run for it.

**Practical Implementation:**

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RequestIdMiddleware } from './request-id.middleware';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  await app.listen(3000);
}

void bootstrap();
```

```typescript
consumer.apply(RequestIdMiddleware).forRoutes('*');
```

The request-id middleware is registered in `init()` after the body parser. It can read `req.body` on a JSON `POST`. `setGlobalPrefix` stays before `listen()`, which is the same `init()` pass that prefixes middleware paths.

**Trade-offs and Alternatives:**

`app.use` is the right hook for a tiny Express integration that must wrap the entire raw socket, including requests that never match a controller, and that does not need the body. When the function needs the parsed body, register it from `configure()`, or set `bodyParser: false` and `app.use(express.json())` yourself before any middleware that reads `req.body`. Owning the parser is the right choice when the limit or the `verify` callback must change. Leaving the default parser is the right choice when Nest's registration order is acceptable.

**Common Mistakes:**

- Reading `req.body` inside `app.use` registered between `create()` and `listen()` and concluding that Nest failed to parse JSON.
- Disabling the default parser and forgetting to register a replacement, so every later middleware also sees an empty body.
- Registering `app.use` after `listen()` and expecting it to run in front of controllers.
- Using `app.use` for a class that expects constructor injection.

**Senior-Level Follow-up:**

The same `logger` is moved below a manual `await app.init()`, and `listen()` comes after that. Does `logger` see `req.body`?

Yes, if `app.use(logger)` happens after `init()` has registered the parser and before a route handles the request. `init()` inside `listen()` is skipped once `isInitialized` is true, so the parser is already on the stack and `app.use` appends after it. It also appends after module middleware and after routes that `init()` already bound. Place it where that stack position is what you want, or keep body-reading middleware in `configure()`.

### NEST-055 — Order when several modules bind middleware

**Difficulty:** Senior

**Category:** Middleware

**Question:**

`AppModule` imports `BillingModule`. Both implement `NestModule` and each `configure` applies its own middleware with `forRoutes('*')`. A request matches both. Which `use` runs first, and what decides the order inside a single `apply()`?

**Context and Constraints:**

NestJS 10.4.15, Express adapter. Neither module is excluded from middleware. Global prefix is empty. `AppModule.configure` applies `RootMiddleware`. `BillingModule.configure` applies `BillingMiddleware`. No `app.use`.

**Senior Engineer's Answer:**

Within one `apply(First, Second).forRoutes(...)`, Express runs `First` and then `Second`. That is registration order inside that configuration.

Across modules, 10.4.15 sorts middleware configuration by module distance, low distance first, and registers in that order. Distance starts at 0. The scanner walks the root and sets each imported module's distance to the larger of its current distance and the distance of that walk. The root stays at 0. A module imported directly by the root is at least 1. A module imported deeper can be pushed higher, and the distance never moves back down when another import is closer to the root.

`AppModule` therefore registers `RootMiddleware` before `BillingModule` registers `BillingMiddleware`. The request runs `RootMiddleware`, then `BillingMiddleware`, then guards. `@Global()` does not create a separate middleware pass in this version. A global module still takes its distance from the import walk.

Two modules with the same distance keep a stable sort of the container's insertion order. That tie is an implementation detail of the scan. When two middleware functions must run in a fixed order, put them in one `apply(First, Second)` in the module that should own that sequence.

**Practical Implementation:**

```typescript
consumer.apply(CorrelationMiddleware, AuditMiddleware).forRoutes('*');
```

`CorrelationMiddleware.use` runs, calls `next()`, and only then `AuditMiddleware.use` runs. Reversing the arguments reverses the request.

**Trade-offs and Alternatives:**

One module that applies middleware in a deliberate order is easy to read. Distance-based order across feature modules is predictable for "root first, then features" and surprising when a shared module is also imported deep in the graph, because that second import can raise its distance and move its middleware later. If a shared module's middleware must be early, bind that middleware from the root module's `configure`, which stays at distance 0.

**Common Mistakes:**

- Assuming `@Global()` middleware runs before the root module on 10.4.15.
- Assuming the `imports` array order is a documented cross-module middleware sequence when distances differ.
- Splitting two ordered steps across two feature modules and debugging the distance walk when a single `apply` would state the order.
- Expecting a later module's middleware to run before an earlier one because its `configure` method is alphabetically first.

**Senior-Level Follow-up:**

`BillingModule` is imported by `AppModule` and also by a module three imports below the root. Which distance does `BillingMiddleware` keep?

The larger one. `calculateModulesDistance` assigns a distance only when the new value is greater. The deep import raises `BillingModule`. Its middleware is registered with that later group, after modules that stayed closer to the root.

### NEST-056 — Which filters see an exception thrown in middleware

**Difficulty:** Senior

**Category:** Middleware

**Question:**

`AuthMiddleware.use` throws `UnauthorizedException` when the header is missing. The route method has `@UseFilters(OrdersExceptionFilter)`. A global filter is registered as well. Which filter writes the response, and what changes if the same throw happens in a function passed to `app.use`?

**Context and Constraints:**

NestJS 10.4.15, Express adapter. `AuthMiddleware` is a class bound with `MiddlewareConsumer`. `OrdersExceptionFilter` is bound only on the order route. The global filter was registered with `APP_FILTER` or `useGlobalFilters`. Express 4 is the adapter's platform. The route handler would return 200 if it ran.

**Senior Engineer's Answer:**

Class middleware is wrapped in `RouterProxy`. A throw, or a rejection from `async use`, is caught by that proxy. The proxy builds an arguments host from `[req, res, next]` and calls the exceptions handler that was created for the middleware. That handler is created with an undefined module key. Global filters are still attached, because they come from application config. The route's method filter and the controller filter are not in this handler. They were created later, for the route proxy, and this request never enters that proxy. `@UseFilters` on the middleware class itself is not resolved from the container on this path, because the module key is missing. `OrdersExceptionFilter` does not run. The global filter does.

`next(err)` from `use` does not throw, so the middleware proxy does not catch it. Express skips to the error-handling layer Nest registers at the end of `init()`. That layer also builds its filter list with an undefined module, so again only global filters apply. `SyntaxError` and `URIError` are turned into `BadRequestException` before that global handler sees them. `UnauthorizedException` is passed through as itself.

A function passed to `app.use` is not wrapped by `MiddlewareModule`. On Express 4 a rejected promise from an `async` function in `app.use` is not forwarded to Nest's error handler. `next(err)` from that function does reach the global error handler. A throw inside class middleware bound with the consumer is the path the proxy already awaits.

**Practical Implementation:**

```typescript
import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    const header = req.headers.authorization;
    if (!header) {
      throw new UnauthorizedException();
    }
    next();
  }
}
```

Register it with `consumer.apply(AuthMiddleware).forRoutes('*')`, and handle `UnauthorizedException` in a global filter. A filter on `OrdersController` never sees this throw.

**Trade-offs and Alternatives:**

Throwing `HttpException` from consumer-bound middleware reuses the global exception shape. Calling `res.status(401).json(...)` in the middleware writes the response immediately and skips filters, which is useful when this path must not depend on a filter being registered. Authentication in a guard instead of middleware means method and controller filters can see the exception, because the throw happens inside the route proxy. Use that when the failure is specific to one controller and should use that controller's filter.

**Common Mistakes:**

- Expecting `@UseFilters` on the route to catch a middleware throw. The route proxy has not started.
- Using `async` `app.use` on Express 4, throwing, and expecting the global Nest filter to run.
- Putting `@UseFilters(SomeFilterClass)` on the middleware class and expecting the container to construct it.
- Calling `next(err)` and also throwing, then debugging two responses.

**Senior-Level Follow-up:**

The middleware calls `next(new UnauthorizedException())` and does not throw. Does `OrdersExceptionFilter` run?

No. `next(err)` enters Nest's Express error handler, whose filter list is the global list. The route method is not selected as the filter target. The global filter still runs, provided it is registered.

### NEST-057 — What canActivate is allowed to return

**Difficulty:** Intermediate

**Category:** Guards

**Question:**

A guard implements `CanActivate`. `canActivate` can return a `boolean`, a `Promise<boolean>`, or an `Observable<boolean>`. What does Nest do with each, and when do interceptors and pipes start?

**Context and Constraints:**

NestJS 10.4.15, Express adapter. The guard is the only guard on the route. It is bound with `@UseGuards`. The route has an interceptor and a pipe. The handler returns a string.

**Senior Engineer's Answer:**

Guards run inside the route proxy, after middleware and before interceptors. `GuardsConsumer` walks the guard list one by one. For each guard it calls `canActivate` with an `ExecutionContext` and then normalizes the result. A `boolean` is used as it is. A `Promise` is awaited. An `Observable` is passed to `lastValueFrom`, which uses the last value and requires the observable to complete. `of(true)` completes. An observable that emits `true` and never completes leaves the request waiting.

`true` continues the loop. When every guard passes, Nest sets the response status from `@HttpCode()` or from the method default, then runs interceptors. Pipes run only when an interceptor calls `next.handle()`, which is the default if the interceptor does. The handler runs after the pipes for that invocation.

`false` stops the loop immediately. Later guards on that route are not called. Interceptors, pipes, and the handler are not called. The consumer's `false` is turned into a thrown `ForbiddenException` by the route execution context. That throw is the subject of NEST-058.

A throw from `canActivate` also stops the loop. It is not converted into `ForbiddenException`. The exception that was thrown is what leaves the proxy. `lastValueFrom` on an empty observable throws `EmptyError`. That error is a thrown exception, so the result is the exceptions layer, not the `false` path.

**Practical Implementation:**

```typescript
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class HeaderPresentGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string | undefined> }>();
    return typeof request.headers['x-api-key'] === 'string';
  }
}
```

A missing key returns `false`. A present key returns `true` and the rest of the route continues. The class is what `@UseGuards(HeaderPresentGuard)` should receive so Nest can construct it.

**Trade-offs and Alternatives:**

A `Promise` fits a guard that must read a session store. An `Observable` fits when the check is already an observable pipeline that completes. A synchronous `boolean` is easier to test and is the right return when the request already carries everything the guard needs. Ending the response inside the guard with `res.status(403).json(...)` and then returning `true` writes a body and still lets the handler run. Return `false` or throw, and leave the body to the exceptions layer.

**Common Mistakes:**

- Returning `of(true)` from RxJS and forgetting that a non-completing observable never finishes `lastValueFrom`.
- Treating an empty observable as `false`. It throws `EmptyError`.
- Starting work that belongs in a pipe, such as coercing `req.params.id`, inside the guard. The guard's job is the allow-or-deny decision.
- Assuming interceptors can `catchError` a guard failure. The interceptor has not started.

**Senior-Level Follow-up:**

`canActivate` returns `Promise.resolve(false)`. Do later guards on the same handler run?

No. The awaited value is `false`, and `tryActivate` returns immediately. Nest then throws `ForbiddenException` with the message `Forbidden resource`. The following guard's `canActivate` is not called.

### NEST-058 — return false and throw UnauthorizedException

**Difficulty:** Senior

**Category:** Guards

**Question:**

Read the guard and the route. For each branch, what status and JSON body does the client get, and does `getInvoice` run?

```typescript
@Injectable()
export class SessionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ headers: { authorization?: string } }>();
    if (!request.headers.authorization) {
      throw new UnauthorizedException();
    }
    if (request.headers.authorization === 'Bearer expired') {
      return false;
    }
    return true;
  }
}

@Controller('invoices')
@UseGuards(SessionGuard)
export class InvoicesController {
  @Get(':id')
  getInvoice(@Param('id') id: string): { id: string } {
    return { id };
  }
}
```

**Context and Constraints:**

NestJS 10.4.15, Express adapter. `SessionGuard` is the only guard. No interceptor writes the response first. The global exceptions handler is Nest's default `BaseExceptionFilter`. No custom filter is bound. `UnauthorizedException` is constructed with no arguments. The `false` branch is a normal return, not a thrown exception from user code.

**Senior Engineer's Answer:**

Both failing branches stop the route before `getInvoice`. The method does not run. Pipes and interceptors do not run either, because guards are still in front of them.

The missing header throws `new UnauthorizedException()`. The constructor is called with no message argument, so `HttpException.createBody` takes the empty branch. The response status is 401. The body is `{ message: 'Unauthorized', statusCode: 401 }`. There is no `error` field on that body. The default filter sees an `HttpException`, reads `getStatus()` and `getResponse()`, and sends that body.

`return false` is not an exception yet. After `tryActivate` finishes, the route execution context does `throw new ForbiddenException('Forbidden resource')`. The string message makes `createBody` include the description. The status is 403. The body is `{ message: 'Forbidden resource', error: 'Forbidden', statusCode: 403 }`. The handler still does not run.

A present header other than `Bearer expired` returns `true`. `getInvoice` runs and the client receives `200` and `{ id }` for a `GET`.

The two failures are different exceptions. A filter decorated `@Catch(UnauthorizedException)` matches the missing-header branch only. A filter decorated `@Catch(ForbiddenException)` matches the `false` branch only. `@Catch(HttpException)` matches both, because both classes extend `HttpException` and the filter test is `instanceof`.

**Practical Implementation:**

```typescript
if (!request.headers.authorization) {
  throw new UnauthorizedException();
}
if (request.headers.authorization === 'Bearer expired') {
  throw new ForbiddenException('Session expired');
}
return true;
```

Throw when the status must be 401 or a specific 403 message. Reserve `return false` for the framework's generic 403, `Forbidden resource`.

**Trade-offs and Alternatives:**

`return false` is short when every denial on that guard really is a generic 403. It becomes a bug the moment one branch means "not authenticated" and another means "authenticated, not allowed". Throwing `UnauthorizedException` or `ForbiddenException` makes the status part of the guard's contract and gives filters a type to match. Building the JSON inside the guard with `response.status(401).json(...)` skips the filter and is easy to get wrong on the Fastify adapter.

**Common Mistakes:**

- Saying both branches produce 401.
- Saying `return false` sends an empty 403 with no body. The body is the `ForbiddenException` for `Forbidden resource`.
- Saying `new UnauthorizedException()` includes `error: 'Unauthorized'`. The no-argument constructor omits `error`.
- Claiming `getInvoice` still runs after `false` because the guard "only logged".

**Senior-Level Follow-up:**

A method filter is `@Catch(UnauthorizedException)` and logs `unauthorized`. A global filter is `@Catch()` and logs `fallback`. Which log appears for `Bearer expired`?

`Bearer expired` returns `false`, so the exception is `ForbiddenException`, not `UnauthorizedException`. The method filter's metatypes do not match, so it is skipped. The global `@Catch()` filter matches any exception and logs `fallback`. The handler does not run. The client still receives the 403 body from NEST-058, if that global filter delegates to `BaseExceptionFilter` or writes the `HttpException` response itself. A filter that only logs and never writes leaves the response unfinished.

### NEST-059 — Several guards on one route

**Difficulty:** Senior

**Category:** Guards

**Question:**

A route has `APP_GUARD` bound to `AuthGuard`, `@UseGuards(RolesGuard, AuditGuard)` on the controller class, and `@UseGuards(FeatureGuard)` on the method. All four return `true` today. What is their order, and which ones run if `RolesGuard` starts returning `false`?

**Context and Constraints:**

NestJS 10.4.15. `AuthGuard` is the only global guard. No `useGlobalGuards` call. Every guard returns a plain `boolean`. The method is `POST`.

**Senior Engineer's Answer:**

The guard list for a handler is built as global, then controller, then method. Inside each of those groups, guards stay in binding order. `AuthGuard` runs first. `RolesGuard` runs before `AuditGuard` because that is the order in `@UseGuards(RolesGuard, AuditGuard)`. `FeatureGuard` runs last.

`tryActivate` stops at the first result that is not `true`. If `RolesGuard` returns `false`, `AuditGuard` and `FeatureGuard` do not run. `AuthGuard` has already run. Nest throws `ForbiddenException` with message `Forbidden resource`. The interceptor, the pipes, and the handler do not run. The `POST` default status of 201 is applied only after every guard returns `true`, so this denied `POST` does not go out as 201. The exception filter sets 403.

A throw inside `RolesGuard` also skips `AuditGuard` and `FeatureGuard`. The thrown exception is the one filters match, rather than a framework `ForbiddenException`, unless `RolesGuard` itself threw `ForbiddenException`.

**Practical Implementation:**

```typescript
@Controller('reports')
@UseGuards(RolesGuard, AuditGuard)
export class ReportsController {
  @Post()
  @UseGuards(FeatureGuard)
  create(): { ok: true } {
    return { ok: true };
  }
}
```

With a passing global `AuthGuard`, a passing request runs `AuthGuard`, `RolesGuard`, `AuditGuard`, `FeatureGuard`, then the rest of the route.

**Trade-offs and Alternatives:**

Several small guards keep authentication, role checks, and a feature flag independently testable. One guard that does all three hides the short-circuit order inside a method. Controller-level guards are the right default when every method on that controller shares the rule. Method-level guards add a stricter rule for one handler. They do not replace the controller guards. Both run, controller first.

**Common Mistakes:**

- Reversing the groups and expecting the method guard to run before the global guard.
- Expecting `@UseGuards(FeatureGuard)` on the method to remove `RolesGuard`.
- Thinking a `false` from `RolesGuard` still runs `AuditGuard` "for logging".
- Expecting the `POST` to answer 201 on a guard failure because 201 is the method default.

**Senior-Level Follow-up:**

`AuditGuard` must record denials from `RolesGuard`. It currently does not run when `RolesGuard` returns `false`. Where do you record them?

Record inside `RolesGuard` before it returns `false`, or throw an exception and record in a filter that is bound where that exception is visible. A later guard is not a denial hook. Nest does not call it after `false`.

### NEST-060 — useGlobalGuards and APP_GUARD

**Difficulty:** Senior

**Category:** Guards

**Question:**

`RolesGuard` injects `Reflector`. One bootstrap uses `app.useGlobalGuards(new RolesGuard())`. Another registers `{ provide: APP_GUARD, useClass: RolesGuard }` in a module. Which registration can construct the guard, and if both are present, which instance runs first?

**Context and Constraints:**

NestJS 10.4.15. `Reflector` comes from `@nestjs/core`. `useGlobalGuards` is called in `bootstrap` after `NestFactory.create()` resolves and before `listen()`. `APP_GUARD` is a provider on `AppModule`. Default scope. `app.get(APP_GUARD)` is not part of the design.

**Senior Engineer's Answer:**

`new RolesGuard()` runs the constructor in `bootstrap`. Nest will not fill in `Reflector`, because that object was created outside the container. `useGlobalGuards` only appends the object you pass. The same rule applies to `@UseGuards(new RolesGuard())`: an instance is used as-is. Passing the class, `@UseGuards(RolesGuard)`, is different. The scanner registers that class as an injectable on the controller's module, and the guard context loads the instance, so constructor dependencies that the module can see are injected. The class does not also need a `providers` entry for that to happen.

`APP_GUARD` is recorded while `create()` scans and instantiates providers. `applyApplicationProviders` then pushes the finished instance onto the global guard list. `useClass: RolesGuard` is constructed by the container, so `Reflector` is injected. The token is not a normal provider you can `app.get` later. Registering `APP_GUARD` twice, in one module or in several, registers every guard. Insertion order follows the scanner: imported modules are recorded before the module that imports them, and inside a module the `providers` array order is the order of those entries. `useGlobalGuards` after `create()` concatenates onto the end of that list. So the `APP_GUARD` instance runs before the `useGlobalGuards` instance.

A request-scoped `APP_GUARD` is stored on the request-guard list and is appended after the static global guards when the route context is request-scoped. That is a scope decision, and it still does not make `app.get(APP_GUARD)` work.

**Practical Implementation:**

```typescript
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AuthModule {}
```

`RolesGuard` can `constructor(private readonly reflector: Reflector) {}`. Every route runs it, in front of controller and method guards.

**Trade-offs and Alternatives:**

`APP_GUARD` is the registration to use when the guard has dependencies and must cover the process. `useGlobalGuards(new HeaderPresentGuard())` is honest when the guard has no dependencies and you want it obvious in `bootstrap`. Method `@UseGuards` is the better scope when only some routes need the check. A global guard that returns `true` when metadata is absent keeps public routes working. A global guard that denies when metadata is absent locks the whole API, including health checks.

**Common Mistakes:**

- Writing `app.useGlobalGuards(new RolesGuard())` and expecting `Reflector` to be non-null inside `canActivate`.
- Injecting `APP_GUARD` into a service to "reuse the guard". The token is consumed at bootstrap.
- Registering two `APP_GUARD` providers and assuming only the last one runs.
- Listing `RolesGuard` in `providers` and also forgetting `@UseGuards` or `APP_GUARD`. A `providers` entry alone does not put it on the request path.

**Senior-Level Follow-up:**

`AuthModule` is imported by `AppModule`. `AuthModule` registers `APP_GUARD` as `RolesGuard`. `AppModule` registers `APP_GUARD` as `FeatureGuard`. After `create()`, bootstrap calls `useGlobalGuards(new HeaderPresentGuard())`. What runs first?

`RolesGuard`, then `FeatureGuard`, then `HeaderPresentGuard`. The imported module is scanned before the root module's own providers, so `RolesGuard` is applied first. `FeatureGuard` is next. `useGlobalGuards` appends after `create()` returns.

### NEST-061 — ExecutionContext and ArgumentsHost

**Difficulty:** Senior

**Category:** Execution context

**Question:**

A guard, an interceptor, and an exception filter all need the Express request, and the guard also needs the handler that will run. What object does each one receive, and which methods are valid on it?

**Context and Constraints:**

NestJS 10.4.15, Express adapter, HTTP application. No RPC and no WebSocket gateway on this route. The filter is bound to the route. The question is the context object, not the filter selection order.

**Senior Engineer's Answer:**

`ArgumentsHost` is the common surface: `getArgs`, `getArgByIndex`, `getType`, `switchToHttp`, `switchToRpc`, and `switchToWs`. For an HTTP route, `switchToHttp().getRequest()` is argument 0, `getResponse()` is argument 1, and `getNext()` is argument 2. On the Express adapter those are the Express request, the Express response, and `next`. `getType()` for this route is `'http'`.

`ExecutionContext` extends that surface with `getClass()` and `getHandler()`. Guards and interceptors receive an `ExecutionContext`. Nest builds it from the controller instance's constructor and the route method, so `getHandler()` is the method you can pass to `Reflector`, and `getClass()` is the controller class. That is why a guard can see `@Roles()` and middleware cannot.

An exception filter's `catch(exception, host)` is typed as `ArgumentsHost`. In 10.4.15 the route proxy does pass an `ExecutionContextHost`, but it constructs it as `new ExecutionContextHost([req, res, next])`. The controller and the method are not arguments to that constructor, so `getClass()` and `getHandler()` on the filter host are null. Filter selection still used the real method: the filter list was built when the route was registered, from the controller and the callback. The host inside `catch` is for reading the request and the response. Read handler metadata in the guard or the interceptor, where the context was built with the class and the method.

`switchToRpc()` and `switchToWs()` only reinterpret the same argument array. Calling `switchToRpc().getData()` on this HTTP route returns the Express request, because that is argument 0. The call does not prove the app is an RPC app. Branch on `getType()` first.

**Practical Implementation:**

```typescript
canActivate(context: ExecutionContext): boolean {
  if (context.getType() !== 'http') {
    return true;
  }
  const request = context.switchToHttp().getRequest<Request>();
  const handler = context.getHandler();
  const controller = context.getClass();
  return this.isAllowed(request, handler, controller);
}
```

`handler` and `controller` are the metadata targets. `request` is the Express request on this adapter.

**Trade-offs and Alternatives:**

A helper that only accepts `ArgumentsHost` is reusable from a filter and from a guard, and it can read the request. A helper that needs metadata should accept `ExecutionContext` and be called from the guard or the interceptor. Casting the filter host to `ExecutionContext` and calling `getHandler()` compiles and returns null on this version. Passing `HttpAdapterHost` into a filter is the portable way to write the response when the same filter must run on more than one adapter. NEST-073.

**Common Mistakes:**

- Describing the filter parameter as a full `ExecutionContext` with a usable `getHandler()`.
- Calling `switchToHttp()` without checking `getType()` in a guard that is also registered as `APP_GUARD` in a hybrid app.
- Using `getArgByIndex(0)` in a filter and assuming it is always the request. For HTTP it is. For RPC it is the payload.
- Reading role metadata from the filter host's handler and treating a null handler as "no roles required", which allows the request.

**Senior-Level Follow-up:**

`getHandler()` inside the guard returns the method reference. What does `Reflector.get('roles', context.getHandler())` return when `@Roles()` was applied only to the class?

`undefined`. `get` reads one target. Class metadata is on `context.getClass()`, not on the method. NEST-062 is the lookup that consults both.

### NEST-062 — Role metadata on the method and on the class

**Difficulty:** Senior

**Category:** Guards

**Question:**

`@Roles('admin')` is on the controller class. `@Roles('billing')` is on one method. A second method has no `@Roles()`. `RolesGuard` injects `Reflector`. How should `canActivate` decide the required roles, and what does a missing user mean compared with a user who lacks the role?

**Context and Constraints:**

NestJS 10.4.15. The decorator is `SetMetadata('roles', roles)` via a `Roles` helper. The guard is registered with `APP_GUARD` and `useClass`, so `Reflector` is injected. The request user, when present, is `req.user.roles: string[]`, attached earlier by middleware or by an auth guard that already returned `true`. This guard does not parse tokens.

**Senior Engineer's Answer:**

`Reflector.getAllAndOverride` walks the targets you pass and returns the first value that is not `undefined`. Pass the handler first and the class second. On the billing method the handler's `['billing']` is used and the class's `['admin']` is ignored. On the method with no `@Roles()`, the handler value is `undefined`, so the class value `['admin']` is used. `get` on the handler alone would allow that second method through, because it never sees the class metadata.

`getAllAndMerge` concatenates arrays instead of stopping. Handler roles would be followed by class roles, so the billing method would require a check against `['billing', 'admin']`. Use merge when the method adds roles. Use override when the method replaces the class rule. An empty array is not `undefined`. Override returns `[]`, and `if (!roles)` does not treat `[]` as missing. Decide what an empty list means. The usual guard treats `undefined` as "this route adds no role rule" and returns `true`.

This guard is authorization. If `req.user` is missing, the caller is not authenticated. Throw `UnauthorizedException` so the status is 401. If the user exists and none of the required roles match, throw `ForbiddenException` or return `false`. `return false` becomes the generic 403 from NEST-058. A missing user that returns `false` publishes 403 for a failure that is 401.

**Practical Implementation:**

```typescript
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles || roles.length === 0) {
      return true;
    }
    const request = context.switchToHttp().getRequest<{ user?: { roles?: string[] } }>();
    if (!request.user) {
      throw new UnauthorizedException();
    }
    const userRoles = request.user.roles ?? [];
    if (!roles.some(role => userRoles.includes(role))) {
      throw new ForbiddenException();
    }
    return true;
  }
}
```

`@Roles('billing')` on the method replaces `@Roles('admin')` on the class. A method with no decorator inherits `admin`.

**Trade-offs and Alternatives:**

`Reflector.createDecorator<string[]>()` on Nest 10 builds a typed decorator and can be passed to `reflector.getAllAndOverride` directly. `SetMetadata` with an explicit key is the same mechanism and is obvious at the call site. A dedicated `BillingGuard` per route avoids metadata and duplicates the allow-or-deny shape. Metadata wins when many routes share one guard and differ only by the role list.

**Common Mistakes:**

- Reading only `getHandler()`, so class-level `@Roles('admin')` never applies.
- Passing `[getClass(), getHandler()]` to `getAllAndOverride`, so the class always wins and the method decorator is dead.
- Treating `[]` as "no role rule". `getAllAndOverride` returns an empty array because it is not `undefined`, and `[].some(...)` is false, so every authenticated user is denied. Handle `roles.length === 0` on purpose.
- Returning `false` when `req.user` is missing, and shipping 403 for anonymous callers.

**Senior-Level Follow-up:**

The method is decorated `@Roles('billing')` and the class is `@Roles('admin', 'billing')`. You switch the guard to `getAllAndMerge` and keep the rest of the method. Which roles are checked?

Both lists, handler first. `getAllAndMerge` filters out `undefined` and concatenates arrays, so the check sees `['billing', 'admin', 'billing']`. `some` still passes a user who has `billing`. A user who has only `admin` also passes, which is exactly what override would have prevented. Stay on `getAllAndOverride` when the method is meant to replace the class.

### NEST-063 — Interceptors on the way in and on the way out

**Difficulty:** Senior

**Category:** Interceptors

**Question:**

A route has a global interceptor `G`, a controller interceptor `C`, and a method interceptor `M`. Each logs `in` before `next.handle()` and logs `out` inside `map`. The handler returns `{ ok: true }`. What is the log order, and which interceptor's `map` sees the handler's object first?

**Context and Constraints:**

NestJS 10.4.15. Every interceptor returns `next.handle().pipe(map(...))`. No interceptor throws. No pipe throws. The handler returns a plain object, not an observable.

**Senior Engineer's Answer:**

Inbound order matches guards: global, then controller, then route. `G` logs `in`, calls `next.handle()`, which runs `C`. `C` logs `in` and calls `next.handle()`, which runs `M`. `M` logs `in` and calls `next.handle()`. That innermost call is pipes, then the controller method.

The return path is first-in, last-out because each `handle()` is an observable wrapped around the next one. `M`'s `map` receives `{ ok: true }` first. `C`'s `map` receives whatever `M` returned. `G`'s `map` receives whatever `C` returned. The log order is `G in`, `C in`, `M in`, handler, `M out`, `C out`, `G out`.

Nest converts the handler result when the observable chain subscribes. A plain object becomes a resolved value. A `Promise` is awaited. An `Observable` is flattened. `intercept` itself returns an `Observable`. Returning a bare object from `intercept` breaks the chain the consumer flattens with `mergeAll`.

The response status for the route has already been set from `@HttpCode()` or the method default before `intercept` runs. `map` can replace the body. It does not by itself replace that status. A later `res.status(...)` inside the interceptor does, because the final `reply` on the Express adapter does not pass a status code of its own.

**Practical Implementation:**

```typescript
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';

@Injectable()
export class TimingInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const started = Date.now();
    return next.handle().pipe(
      map(data => ({ data })),
      tap(() => {
        const elapsedMs = Date.now() - started;
        void elapsedMs;
      }),
    );
  }
}
```

`map` changes the value the outer interceptor and the client see. `tap` observes the value after that `map` and leaves it alone. `elapsedMs` is a local measurement for this request. It is not a capacity number.

**Trade-offs and Alternatives:**

One interceptor that both times the call and wraps the body is easy to attach and harder to reuse. Two interceptors, one mapping and one tapping, compose in a defined order as long as you bind them deliberately. Logging with `res.on('finish')` in middleware sees the final status after the write. It does not see the object `map` produced before serialization. Use the interceptor when the object matters. Use the finish listener when the status line matters.

**Common Mistakes:**

- Describing outbound order as global, then controller, then route. That is the inbound order.
- Returning `{ data }` from `intercept` instead of `next.handle().pipe(map(() => ({ data })))`.
- Expecting `tap` to change the JSON body.
- Assuming `@HttpCode(200)` on a `POST` is applied after `map`. The status is set before the interceptor runs, and `map` does not clear it.

**Senior-Level Follow-up:**

`M`'s `map` returns `{ wrapped: true }`. `C` and `G` only `tap`. What does the client receive?

`{ wrapped: true }`. `M` is the first `map` on the return path. `tap` does not replace the value, so `C` and `G` forward it. The adapter writes that object.

### NEST-064 — An interceptor that never calls next.handle

**Difficulty:** Intermediate

**Category:** Interceptors

**Question:**

`CacheInterceptor` is bound on a `GET` method. On a hit it returns `of(cached)` and does not call `next.handle()`. On a miss it calls `next.handle()`, stores the result, and returns it. What runs on a hit?

**Context and Constraints:**

NestJS 10.4.15. The cache lookup is synchronous and in memory. A guard in front of the interceptor returns `true`. The method has a `ParseIntPipe` on `@Param('id')`. The handler reads a database. `of` is imported from `rxjs`.

**Senior Engineer's Answer:**

Middleware and guards have already finished before any interceptor runs. On a hit, `CacheInterceptor` returns an observable of the cached value and never calls `next.handle()`. The inner interceptors, the pipes, and the controller method are inside that call, so they do not run. The database is not read. Outer interceptors, bound globally or on the controller, still see the cached value on their return path if they wrapped this interceptor and called `next.handle()` themselves. Their `map` runs on `cached`.

On a miss, `next.handle()` runs the pipe, then the handler. The value that comes back is the value to store. Store it in `map` or `tap` on that observable so a thrown pipe or a thrown handler does not fill the cache.

The `GET` status was set to 200 before the interceptor ran, unless `@HttpCode()` changed it. Returning `of(cached)` still goes through the normal reply path. The client receives the cached body and that status.

**Practical Implementation:**

```typescript
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly store = new Map<string, unknown>();

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{ originalUrl?: string; url: string }>();
    const key = request.originalUrl ?? request.url;
    const hit = this.store.get(key);
    if (hit !== undefined) {
      return of(hit);
    }
    return next.handle().pipe(
      tap(value => {
        this.store.set(key, value);
      }),
    );
  }
}
```

This store lives on one instance. A global singleton cache shares entries across requests. That is the point of the hit path, and it is also why a per-user response must use a key that includes the user.

**Trade-offs and Alternatives:**

Skipping the handler is the reason to short-circuit. It also skips pipes, so a hit never re-validates the param. That is acceptable when the cache key was produced by a request that already passed the pipes, and unacceptable when the interceptor is in front of a pipe that rejects malformed ids and the key is taken from the raw URL. Put the cache interceptor inside the route, after you accept that a hit bypasses the handler, or call `next.handle()` unconditionally when validation must run.

An HTTP cache header set in middleware lets the client or a proxy skip your process entirely. An in-process interceptor cache still spends a request on your event loop and can see the returned object.

**Common Mistakes:**

- Returning `of(cached)` and also calling `next.handle()`, which runs the handler on a hit.
- Caching inside the guard. The guard's `false` path throws `ForbiddenException` and does not return a body to the client as a successful payload.
- Using one global key for a response that depends on the caller.
- Expecting the pipe's exception to run on a hit. `next.handle()` was not called.

**Senior-Level Follow-up:**

The cache interceptor is global, and a controller interceptor logs `in` before its own `next.handle()`. On a hit, does that log appear?

It depends on binding order. Global runs before controller on the way in. If the global cache interceptor returns `of(cached)` without calling `next.handle()`, the controller interceptor never starts, so `in` does not appear. Bind the logging interceptor globally, outside the cache interceptor, if the log must include hits. Inbound order would then be log first, then cache.

### NEST-065 — catchError and the exception filter

**Difficulty:** Senior

**Category:** Interceptors

**Question:**

The handler throws `NotFoundException`. The route interceptor uses `catchError`. In one version it returns `of({ missing: true })`. In another it returns `throwError(() => err)`. A method filter is `@Catch(NotFoundException)`. Which version runs the filter, and what does the client receive in each version?

**Context and Constraints:**

NestJS 10.4.15. `NotFoundException` is thrown from the controller method, after pipes have succeeded. The interceptor is the only one. The filter writes the exception with `BaseExceptionFilter` behavior: `HttpException` status and response body. `of` and `throwError` are from `rxjs`.

**Senior Engineer's Answer:**

The throw happens inside `next.handle()`, so the observable errors. `map` does not run. `catchError` does.

Returning `of({ missing: true })` replaces the error with a next notification. The observable completes successfully. The route proxy treats that as the handler result and writes `{ missing: true }` with the status already set on the response. For a `GET`, that status is 200 unless `@HttpCode()` or a later `res.status()` changed it. The exception never leaves the proxy. `@Catch(NotFoundException)` does not run.

Returning `throwError(() => err)` fails the observable again. `intercept`'s observable errors, the awaited intercept rejects, and `RouterProxy` catches it. The method filter matches `NotFoundException` because the test is `instanceof`. The filter writes 404 and the `NotFoundException` body. The success `reply` does not run.

A `try/catch` inside the controller that swallows the error is the same idea as `of(...)`: the filter sees exceptions that leave the proxy, not exceptions the application already handled.

Guard failures and middleware failures are outside this `catchError`. Guards run before `intercept`. Middleware runs before the route proxy. A pipe failure is inside `next.handle()`, so this `catchError` does see it. NEST-068.

**Practical Implementation:**

```typescript
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class RethrowInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      catchError(err => {
        return throwError(() => err);
      }),
    );
  }
}
```

This version records the failure point and still lets the method filter write the 404. Delete the interceptor if it only rethrows.

**Trade-offs and Alternatives:**

`catchError` plus `of(...)` is a compatibility shim when a client must receive 200 and a sentinel body. It hides the failure from filters and from any status-based monitoring at the HTTP layer. `throwError` keeps one error shape, owned by the filter. Translating `NotFoundException` into a different `HttpException` inside `catchError` is useful when the interceptor is the boundary that knows the public contract. Doing that translation in both the interceptor and the filter produces two competing bodies. Pick one layer.

**Common Mistakes:**

- Expecting the filter to run after `catchError` returned `of({ missing: true })`.
- Using `catchError` to handle a guard's `UnauthorizedException`. The interceptor is not on the stack yet.
- Forgetting that a recovered observable still uses the status set before the interceptor, so a swallowed `NotFoundException` can become HTTP 200.
- Swallowing the error in `catchError` with an empty `tap` and returning nothing. `catchError` must return an observable.

**Senior-Level Follow-up:**

The interceptor returns `throwError(() => err)`, and the method filter's `catch` only logs. What does the client receive?

Whatever that filter writes. Nest invokes the first matching filter and does not call the next one. A filter that logs and returns without `reply` or `response.status().json()` leaves the HTTP response unfinished. Logging in `catchError` and rethrowing, then writing the body in the filter, gives the client the 404.

### NEST-066 — How pipes are applied to arguments

**Difficulty:** Senior

**Category:** Pipes

**Question:**

A handler has `@Body() body`, `@Query('page') page`, and `@Param('id', ParseIntPipe) id`, in that order. A global pipe and a method `@UsePipes` pipe are also bound. What runs for each argument, and can the body pipe rely on the query pipe having finished?

**Context and Constraints:**

NestJS 10.4.15, Express adapter. All three parameters are present. No custom parameter decorator. `ValidationPipe` options such as `whitelist` and `transform` are a later topic. This question is only the order in which pipes are invoked.

**Senior Engineer's Answer:**

Pipes run inside `next.handle()`, after guards and after inbound interceptor code. For a single argument, `PipesConsumer` reduces the pipe list from left to right and awaits each `transform`. The list is the global pipes, then the controller `@UsePipes` pipes, then the method `@UsePipes` pipes, then the pipes on that parameter. `ParseIntPipe` on `id` therefore runs after the global pipe and the method pipe, and only for `id`.

Each pipe receives the value returned by the previous pipe and an `ArgumentMetadata`. In 10.4.15 the metadata `type` is `'body'`, `'query'`, or `'param'` for those three decorators. Other pipeable values, including a custom decorator, are reported as `'custom'`. `metatype` is the design-time parameter type when `emitDecoratorMetadata` emitted one. `data` is the name passed to the decorator: `'page'`, `'id'`, or `undefined` for a bare `@Body()`.

`@Req()`, `@Res()`, `@Next()`, `@Headers()`, `@Session()`, `@Ip()`, and `@Host()` are not in the pipeable set. A global pipe does not see them. A global pipe that only understands bodies must look at `metadata.type` and return the value unchanged for `'query'` and `'param'`. Nest still invokes it for every pipeable argument.

Across arguments, 10.4.15 does not sequence the parameters. `createPipesFn` maps every parameter and `await`s `Promise.all`. The body pipe and the query pipe start together. A side effect in the body pipe must not assume the query pipe has completed, and it must not assume the reverse. The public diagram that says the last parameter's pipes finish before the first parameter's pipes is not what this version's `Promise.all` does. Within one parameter the reduce is still ordered.

If any parameter's pipe throws, `Promise.all` rejects and the controller method is not called. Sibling pipes may already be running.

**Practical Implementation:**

```typescript
import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class TrimBodyNamePipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    if (metadata.type !== 'body' || !value || typeof value !== 'object') {
      return value;
    }
    const record = value as { name?: unknown };
    if (typeof record.name !== 'string') {
      return value;
    }
    return { ...record, name: record.name.trim() };
  }
}
```

Bound globally, this pipe still runs for `page` and `id`. For those it returns the original value because `type` is not `'body'`.

**Trade-offs and Alternatives:**

A global pipe gives every route the same argument policy. A parameter pipe is clearer when one query needs `ParseIntPipe` and the next does not. Controller `@UsePipes` sits in between and is easy to forget when reading a single method. Prefer the narrowest binding that states the rule. Cross-parameter ordering is not a feature in 10.4.15. If `page` must be known before the body is accepted, read both inside the handler or inside one pipe that receives one object you assembled yourself.

**Common Mistakes:**

- Teaching a last-parameter-first sequence for 10.4.15. The parameters are started together.
- Expecting a global pipe to skip `@Query()` automatically.
- Putting a pipe on `@Req()` and expecting `transform` to run.
- Assuming a throw from the body pipe cancels a query pipe that has already started. The handler is skipped. The in-flight pipe still runs to its own completion or throw.

**Senior-Level Follow-up:**

The method pipe logs `method` and `ParseIntPipe` logs `param`. Both are on the `id` argument only. Which log is first?

`method`, then `param`. Parameter pipes are appended after the global, controller, and method pipes for that argument. The other arguments do not change the order inside `id`.

### NEST-067 — DefaultValuePipe and ParseIntPipe

**Difficulty:** Intermediate

**Category:** Pipes

**Question:**

`GET /search` has `@Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number`. What does the handler receive for a missing `page`, for `page=4`, and for `page=4abc`? What happens if the two pipes are swapped?

**Context and Constraints:**

NestJS 10.4.15. No global pipe. `ParseIntPipe` uses its default error status, 400. `DefaultValuePipe` is constructed with `1`. The query parser leaves a missing key as `undefined`. This is not a DTO or `ValidationPipe` question.

**Senior Engineer's Answer:**

Parameter pipes run left to right. `DefaultValuePipe` runs first. Its `transform` replaces `null`, `undefined`, and `NaN`. It leaves every other value, including `''`, alone. `ParseIntPipe` then runs on that result.

A missing `page` is `undefined`. `DefaultValuePipe` returns `1`. `ParseIntPipe` accepts it, because the value is a finite integer, and the handler receives the number `1`.

`page=4` is the string `'4'`. `DefaultValuePipe` returns `'4'`. `ParseIntPipe` returns the number `4`.

`page=4abc` stays `'4abc'`. `ParseIntPipe` requires the whole string to match `^-?\d+$`. `'4abc'` fails. The pipe throws a `BadRequestException` whose message is `Validation failed (numeric string is expected)`. The handler does not run.

Swapping to `ParseIntPipe` then `DefaultValuePipe` changes the missing-key case. `ParseIntPipe` receives `undefined`, `optional` is not set, and it throws the same 400 before `DefaultValuePipe` can substitute `1`. `page=4` still works. `page=4abc` still throws.

`new DefaultValuePipe(1)` has to be an instance. The class alone has no default to apply. `ParseIntPipe` can be passed as a class when the default options are enough, or as `new ParseIntPipe({ optional: true })` when a missing value should pass through as `undefined` instead of throwing.

**Practical Implementation:**

```typescript
@Get('search')
search(
  @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
): { page: number } {
  return { page };
}
```

Missing query, `?page=4`, and a non-integer are the three cases above. The handler sees a number only when both pipes return.

**Trade-offs and Alternatives:**

`DefaultValuePipe` plus `ParseIntPipe` is the right pair for a small query. A DTO with validation is the right pair when the query has several fields and a shared error shape. That DTO path is the later file. Handling the default inside the handler (`page ?? 1`) skips the 400 for `4abc` unless something else rejects it. The pipes reject it before the method.

**Common Mistakes:**

- Putting `ParseIntPipe` first and expecting the default to save a missing query.
- Expecting `DefaultValuePipe` to replace `''`. It replaces `null`, `undefined`, and `NaN`.
- Expecting `parseInt` truncation. `ParseIntPipe` rejects `'4abc'` and `'4.2'`.
- Passing `DefaultValuePipe` as a class token and losing the `1`.

**Senior-Level Follow-up:**

`page=` is present and empty. What does this decorator order return to the handler?

`DefaultValuePipe` keeps `''`. `ParseIntPipe` rejects it and throws `BadRequestException`. The handler does not receive `1`. If an empty string should mean "use the default", branch on `value === ''` in a pipe of your own before `ParseIntPipe`.

### NEST-068 — A pipe that throws

**Difficulty:** Senior

**Category:** Pipes

**Question:**

`ParseIntPipe` throws `BadRequestException` for `page=nope`. The route has a guard, an interceptor with `catchError`, a method filter `@Catch(BadRequestException)`, and a global filter `@Catch()`. What has already run, and which filter writes the response if the interceptor rethrows?

**Context and Constraints:**

NestJS 10.4.15, Express adapter. The guard returns `true`. The interceptor calls `next.handle()` and its `catchError` returns `throwError(() => err)`. The method filter and the global filter both write a response if they are the one selected. The controller method logs `handler` as its first line.

**Senior Engineer's Answer:**

Middleware has run. The guard has run and returned `true`. Inbound interceptor code has run, and `next.handle()` has started. `ParseIntPipe.transform` throws. The controller method has not started, so `handler` is not logged. Other parameter pipes may already be in flight because of `Promise.all` in NEST-066. Their completion does not call the method after this rejection.

The throw is inside the observable `next.handle()` returned. The interceptor's `catchError` runs. `throwError` fails that observable, the route proxy catches the rejection, and filter selection starts. Selection order is covered in NEST-071: the method filter is tried before the global filter. `@Catch(BadRequestException)` matches, because `BadRequestException` is the object `ParseIntPipe` throws by default. The method filter writes the response. The global `@Catch()` is not called.

If `catchError` returns `of({ page: 1 })` instead, the proxy sees a successful value. Neither filter runs, and the client gets that object with the status set before the interceptor. If the interceptor has no `catchError`, the method filter still runs, because the exception still leaves the proxy.

A guard exception would not enter this interceptor. A middleware exception would not enter this method filter. The pipe sits in the window where both the interceptor and the route's filters can see the failure, and the interceptor sees it first.

**Practical Implementation:**

```typescript
@Get('search')
@UseFilters(BadRequestFilter)
search(
  @Query('page', ParseIntPipe) page: number,
): { page: number } {
  return { page };
}
```

`BadRequestFilter` is the writer for this pipe failure when it is bound on the method or the controller and its `@Catch` list includes `BadRequestException` or `HttpException`. Leave the invalid string out of the handler.

**Trade-offs and Alternatives:**

Fixing the status inside `catchError` keeps pipe errors in the interceptor layer and is easy to apply globally. A filter keeps HTTP error bodies in one place, which is the better default when every `BadRequestException` should look the same. Swallowing the pipe error and substituting a page number hides client bugs. Prefer the 400.

**Common Mistakes:**

- Logging `handler` and concluding the pipe ran after the method. The method does not start.
- Expecting the global filter to run because it is `@Catch()`. The method filter matched first and was invoked.
- Handling the pipe error in the guard. The guard has already returned.
- Assuming a second parameter's pipe is cancelled. It may already be running.

**Senior-Level Follow-up:**

The same `BadRequestException` is thrown from the controller method instead of the pipe. Does the interceptor still see it before the method filter?

Yes. The method body is also inside `next.handle()`. `catchError` runs, and a rethrow still reaches the method filter. The difference from the pipe case is that the first line of the method did run.

### NEST-069 — When a custom parameter decorator runs

**Difficulty:** Senior

**Category:** Execution context

**Question:**

`@CurrentUser()` is built with `createParamDecorator`. The factory reads `request.user`. A guard put `user` on the request. The parameter also has a pipe. When does the factory run relative to the guard, the interceptor, the pipe, and the handler?

**Context and Constraints:**

NestJS 10.4.15, Express adapter. The decorator is `@CurrentUser() user: User` on a controller method. `request.user` is set only by `AuthGuard`, which returns `true`. One route interceptor calls `next.handle()`. The pipe is `new ParseUserPipe()` on that parameter. No `ValidationPipe` discussion beyond the fact that a pipe on this parameter does run.

**Senior Engineer's Answer:**

`createParamDecorator` stores a factory on the route-argument metadata. Nest calls it while resolving arguments, from the same `fnApplyPipes` path as `@Body()` and `@Query()`. That path is the body of `next.handle()`. Order for this request: middleware, `AuthGuard` (user is now on the request), interceptor code before `next.handle()`, then argument resolution.

The factory is `(data, ctx) => ...`. `data` is the value passed to the decorator, such as `'email'` in `@CurrentUser('email')`, or `undefined` when the decorator is used as `@CurrentUser()`. `ctx` is an `ExecutionContext` built with the controller class and the method, unlike the host a filter receives in NEST-061. `ctx.switchToHttp().getRequest()` is valid here. The factory's return value becomes the pipe input.

Pipes on that parameter run after the factory returns, in the same per-argument order as NEST-066: global, controller, method, then the pipes listed after the decorator data. `ParseUserPipe` therefore sees the `User` object, not the raw request. The handler is called with whatever the last pipe returns. If the factory throws, the handler does not run, and the throw is inside `next.handle()`, so an interceptor `catchError` and the route filters can see it.

The metadata type for this argument is `'custom'`. A global pipe still runs for it when the argument is pipeable, which a custom decorator is. Whether a particular pipe chooses to ignore `type === 'custom'` is that pipe's own code.

**Practical Implementation:**

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface User {
  id: string;
  email: string;
}

export const CurrentUser = createParamDecorator(
  (data: keyof User | undefined, ctx: ExecutionContext): User | string | undefined => {
    const request = ctx.switchToHttp().getRequest<{ user?: User }>();
    const user = request.user;
    if (!user || !data) {
      return user;
    }
    return user[data];
  },
);
```

`@CurrentUser()` returns the user object. `@CurrentUser('email')` returns the string. Both run only after the guard that set `request.user`.

**Trade-offs and Alternatives:**

A parameter decorator keeps the handler signature free of `@Req()`. `@Req() request: Request` is clearer when the handler needs several request fields and you do not want a decorator per field. A pipe is the right follow-up when the factory's value must be checked or converted. Doing that check inside the factory mixes extraction with policy and skips the pipe list the rest of the codebase expects to read.

**Common Mistakes:**

- Expecting the factory to run in middleware, before the guard sets `request.user`. The user is still missing, and the factory returns `undefined`.
- Expecting the pipe to run before the factory and to receive the Express request. The pipe receives the factory's return value.
- Reading `getHandler()` from a filter and expecting the same context the decorator received.
- Treating `@CurrentUser()` as a guard. It does not stop the request. A missing user becomes `undefined` unless the factory or a pipe throws.

**Senior-Level Follow-up:**

`AuthGuard` is removed. The interceptor sets `request.user` inside `map`, after `next.handle()`. What does `@CurrentUser()` see?

`undefined`, or whatever was already on the request. The factory runs during argument resolution, before the handler, which is before the outbound `map`. Set `request.user` in middleware or in a guard. The outbound interceptor is too late.

### NEST-070 — Who writes the HTTP response

**Difficulty:** Senior

**Category:** Lifecycle

**Question:**

One `POST` handler returns `{ id: '1' }` and has no `@Res()`. Another injects `@Res() res: Response` and calls `res.json(...)` itself. A third uses `@Res({ passthrough: true })`. Who writes the body in each case, and when is the status code chosen?

**Context and Constraints:**

NestJS 10.4.15, Express adapter. No interceptor short-circuit. No exception. `@HttpCode` is absent unless the answer is describing its effect. `Response` is the Express type.

**Senior Engineer's Answer:**

After guards return `true`, and before interceptors, the route sets the status on the response. A `POST` becomes 201. Every other method becomes 200. `@HttpCode(200)` replaces that default for this handler. `@Header()` values are set in the same moment. The final Express `reply` does not pass a status code, so it keeps whatever is already on the response. An interceptor or the handler can still call `res.status` later and replace it.

The handler return value is then taken through interceptors. Nest awaits a `Promise` and subscribes to an `Observable`. For the first handler, `isResponseHandled` is false. The adapter's `reply` sends the value. `{ id: '1' }` goes out as JSON with status 201.

`@Res()` or `@Next()` without `{ passthrough: true }` sets `isResponseHandled`. Nest does not call `reply`. The return value is ignored by the response controller, even if interceptors mapped it. The handler must write the response. If it returns without writing, the request waits until a timeout. Interceptors still run. Their `map` cannot send a body Nest has been told not to send.

`@Res({ passthrough: true })` leaves `isResponseHandled` false. The handler may set headers or status on `res`, and Nest still sends the return value. That is the combination to use when the handler needs the response object and still wants interceptors' mapped values to be the body.

`@Redirect()` selects a different writer: the response controller redirects instead of `reply`. `@Sse()` requires the settled result to be an `Observable`. A plain object there throws `ReferenceError` from the SSE writer.

**Practical Implementation:**

```typescript
@Post()
@HttpCode(200)
create(@Body() body: { sku: string }): { sku: string } {
  return { sku: body.sku };
}
```

The client receives status 200 and `{ sku }`. Nest writes both. Leave `@Res()` out unless the handler must own the stream.

**Trade-offs and Alternatives:**

Returning a value keeps filters, interceptors, and `@HttpCode()` in one path and is the default to teach. `@Res()` is justified for a stream, a file download you want to pipe yourself, or a legacy API that writes the response in several steps. `passthrough: true` is the middle: touch headers, return the body. Mixing `res.json` with a returned object on a non-passthrough `@Res()` drops the returned object and surprises the next reader.

**Common Mistakes:**

- Injecting `@Res()` to set one header, forgetting `passthrough`, and wondering why the returned object never arrives.
- Expecting a `POST` to default to 200. The default in `getStatusByMethod` is 201.
- Setting `@HttpCode(204)` and also returning a body. The status is 204, and `reply` still sends the body. Pick a status that matches the payload.
- Assuming an interceptor `map` runs after Nest has already written. `map` runs before `reply`, unless `@Res()` without passthrough made `reply` a no-op.

**Senior-Level Follow-up:**

The handler is `@Sse()` and returns `Promise.resolve({ data: 'ready' })`. What is the result?

The SSE writer requires an `Observable` after Nest settles the promise. A settled plain object fails that check with `ReferenceError`: `You must return an Observable stream to use Server-Sent Events (SSE).` Return an observable of message events. The rest of the lifecycle still ran up to the response writer.

### NEST-071 — Which exception filter is selected

**Difficulty:** Senior

**Category:** Exception filters

**Question:**

A route has a method filter `@Catch(NotFoundException)`, a controller filter `@Catch(HttpException)`, and a global filter `@Catch()`. The handler throws `NotFoundException`. Which `catch` runs? If that method filter rethrows, does the controller filter run?

**Context and Constraints:**

NestJS 10.4.15, Express adapter. The exception is thrown from the handler and is not swallowed by an interceptor. All three filters are classes Nest constructed. No filter is bound on middleware.

**Senior Engineer's Answer:**

The route proxy catches the exception and hands it to the exceptions handler built for that route. The filter list was assembled as global, then controller, then method, and then reversed, so the method filter is considered first, then the controller filter, then the global filter. `selectExceptionFilterMetadata` walks that reversed list and keeps the first filter whose `@Catch` list is empty or whose metatypes include a class the exception `instanceof`.

`NotFoundException` is an `HttpException`. The method filter's `@Catch(NotFoundException)` matches on the first test. That filter's `catch` is called. The controller filter and the global filter are not called. Nest does not pass an exception from one filter to the next.

A method filter that does not match is skipped during selection, before `catch`. If the method filter were `@Catch(BadRequestException)` only, `NotFoundException` would fail that `instanceof` test, the controller `@Catch(HttpException)` would match, and the global filter would still not run. The global `@Catch()` with an empty metatype list matches whatever is left. It is the fallback for this route, not a second writer.

Rethrowing inside `catch`, or rejecting the promise `catch` returns, does not continue the walk. `invokeCustomFilters` already chose one function. `RouterProxy` does not await `exceptionsHandler.next`, so a later rejection is not a handoff to the controller filter. Share behavior by inheritance: extend `BaseExceptionFilter` and call `super.catch` to write the default body. That call stays inside the selected filter.

The host in `catch` is the arguments host from NEST-061. Use `switchToHttp()` to get the response. The method and controller used for selection were fixed when the route was registered. They are not recovered by calling `getHandler()` on this host.

Global registration follows the same bootstrap rule as guards. `APP_FILTER` is applied during `create()` and can inject. `useGlobalFilters(new SomeFilter())` after `create()` appends an instance and does not inject. A filter on the route still wins selection when its `@Catch` matches.

**Practical Implementation:**

```typescript
import { ArgumentsHost, Catch, ExceptionFilter, NotFoundException } from '@nestjs/common';
import { Response } from 'express';

@Catch(NotFoundException)
export class NotFoundFilter implements ExceptionFilter {
  catch(exception: NotFoundException, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    response.status(exception.getStatus()).json({
      statusCode: exception.getStatus(),
      message: exception.message,
    });
  }
}
```

Bind it with `@UseFilters(NotFoundFilter)` on the method or the controller that should own this body. A `BadRequestException` from the same method does not enter this class.

**Trade-offs and Alternatives:**

A method filter is the right scope when one route has a strange contract. A controller filter fits a resource-wide body. A global `@Catch()` fits the process-wide fallback, including middleware throws from NEST-056, which never consult method filters. Inheritance from `BaseExceptionFilter` reuses the default writer. Copying that writer into every filter drifts. Two filters that both "almost" match are not a pipeline. The first match owns the response.

**Common Mistakes:**

- Describing filter order as global, then controller, then method. That is the guard order. Filters are tried from the method outward.
- Rethrowing in the method filter and expecting the global filter to clean up.
- Binding a filter only on the controller and expecting it to see middleware exceptions.
- Calling `getHandler()` on the filter host to decide the message, and treating null as a successful lookup.

**Senior-Level Follow-up:**

The method filter is changed to `@Catch(HttpException)`, and the handler throws a plain `Error` with message `disk full`. Which filter runs?

`Error` is not an `instanceof HttpException`, so the method filter and the controller `@Catch(HttpException)` are skipped. The global `@Catch()` matches because its metatype list is empty. If no global filter exists, `BaseExceptionFilter` handles it. NEST-072.

### NEST-072 — The default exceptions handler

**Difficulty:** Senior

**Category:** Exception filters

**Question:**

No custom filter matches. What does the client receive for `NotFoundException`, for `new Error('disk full')`, and for a `SyntaxError` thrown by the JSON parser on a malformed body? What happens if the handler already started writing the response?

**Context and Constraints:**

NestJS 10.4.15, Express adapter. `BaseExceptionFilter` is the default. The process is not in production-log disguise: the client body and the server log are different. The malformed JSON case is the default body parser, before the route method.

**Senior Engineer's Answer:**

`BaseExceptionFilter.catch` treats `HttpException` by reading `getResponse()` and `getStatus()`. `NotFoundException` therefore keeps the status and body that exception already carries. The default no-argument body has `statusCode` 404 and `message` `'Not Found'`. The filter sends that. It does not replace it with 500.

Anything else goes to `handleUnknownError`. A plain `Error` is not an `HttpException`. The client receives status 500 and `{ statusCode: 500, message: 'Internal server error' }`. The message `disk full` is not copied into that JSON. If the thrown value is an object with a `message`, the filter logs `exception.message` and `exception.stack` through the `ExceptionsHandler` logger. The stack stays on the server.

Values that look like `http-errors` (`statusCode` and `message` both set) use those fields instead of the generic 500. A `SyntaxError` from `express.json()` is handled one step earlier. The error middleware Nest registers in `registerExceptionHandler` passes the error through `mapExternalException`, which wraps `SyntaxError` and `URIError` in `BadRequestException`. The client receives a 400 whose message is the parser message, not a 500. That path is the global error handler, so only global filters can replace it. A method filter never sees a body that failed to parse, because the route method was not entered.

If headers were already sent, `reply` is skipped and the adapter ends the response. A second JSON body is not written. That is the situation when a handler used `@Res()` and already called `res.write`, then threw.

**Practical Implementation:**

```typescript
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

@Catch()
export class FallbackFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const response = host.switchToHttp().getResponse();
    if (exception instanceof HttpException) {
      httpAdapter.reply(response, exception.getResponse(), exception.getStatus());
      return;
    }
    httpAdapter.reply(
      response,
      { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Internal server error' },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
```

Register it as `APP_FILTER` so it is global and so `HttpAdapterHost` is injected. `reply` keeps the Express and Fastify adapters on one code path.

**Trade-offs and Alternatives:**

The built-in filter is enough when 500 bodies should stay generic and `HttpException` should pass through. A global `APP_FILTER` is worth it when every 500 must include a request id. Include an id you generated. Do not include `exception.stack` or `disk full` in the client JSON. Logging the stack on the server is the default filter's split, and a custom filter should keep that split.

**Common Mistakes:**

- Returning `exception.message` to the client for every non-HTTP error.
- Expecting malformed JSON to hit a controller `@Catch(SyntaxError)`. The parser fails before the route filter list exists.
- Sending a second body after headers are sent. The base filter ends the response instead.
- Forgetting that `HttpException` subclasses keep their own status. A custom `@Catch()` that always writes 500 erases `NotFoundException`.

**Senior-Level Follow-up:**

The route writes `res.json({ accepted: true })` through `@Res()` without passthrough, then throws `new Error('later')`. What does the client receive?

The bytes already written: `{ accepted: true }`. The default filter sees headers sent and ends the response instead of `reply`. It still logs the error. There is no second JSON body with `Internal server error`. Avoid throwing after you have taken over the response, or write the error yourself before the first byte.

### NEST-073 — The same lifecycle on the Fastify adapter

**Difficulty:** Senior

**Category:** Platform

**Question:**

The application is created with `new FastifyAdapter()` instead of the default Express adapter. Guards, interceptors, pipes, and filters stay as they are. What stays the same, and what breaks in a filter that calls `response.status(401).json(...)`?

**Context and Constraints:**

NestJS 10.4.15. `@nestjs/platform-fastify` and `FastifyAdapter`. The filter uses `host.switchToHttp().getResponse()` and then Express methods. Middleware is still a `NestMiddleware` with `use(req, res, next)`. No second HTTP adapter is mounted.

**Senior Engineer's Answer:**

Guards, interceptors, pipes, and exception filters are scheduled by `@nestjs/core`, not by the HTTP library. Their order is unchanged: middleware, guards, inbound interceptors, pipes, handler, outbound interceptors, and filters when an exception escapes. `canActivate`, `intercept`, `transform`, and `catch` keep the same contracts. `ExecutionContext.getHandler()` and `getClass()` still refer to the controller method. `getType()` is still `'http'`.

`switchToHttp().getRequest()` returns the Fastify request. `getResponse()` returns the Fastify reply. Fastify's reply writes with `status` and `send`. A filter that calls `response.status(401).json(...)` is using the Express response API. The Fastify reply does not implement that pair, so the filter throws while reporting the original exception.

The adapter's `reply(response, body, statusCode)` is the shared writer. `BaseExceptionFilter` and `HttpAdapterHost.httpAdapter.reply` use it. On Fastify, `reply` sets the status when a code was passed and sends the body. A filter that must run on both adapters should call that method. A filter that is intentionally Express-only should stay on the Express adapter.

Middleware is the sharp edge. Nest's Fastify adapter registers `@fastify/middie` so a `use(req, res, next)` function can run, and the lifecycle docs still describe middleware as platform middleware. Express `res.setHeader` and Fastify `reply.header` are not interchangeable inside `use`. The JSON parser is Fastify's content-type parser, not `express.json()`, so the `app.use`-before-parser ordering in NEST-054 is an Express-adapter fact. On Fastify, read the body only after Fastify has parsed it, and prefer `configure()` for Nest middleware rather than assuming the Express stack.

**Practical Implementation:**

```typescript
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

@Catch()
export class PlatformFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const response = host.switchToHttp().getResponse();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const body =
      exception instanceof HttpException
        ? exception.getResponse()
        : { statusCode: status, message: 'Internal server error' };
    httpAdapter.reply(response, body, status);
  }
}
```

This `catch` does not mention Express or Fastify. The adapter that created the application performs the write.

**Trade-offs and Alternatives:**

Staying on Express keeps `res.status().json()` and the middleware stack you already know. Moving the adapter to Fastify keeps the Nest lifecycle and requires the response path to go through the HTTP adapter. Rewriting every guard to branch on the library is unnecessary. Guards that only read `request.headers` usually survive. Code that touches `req.socket` or `res.setHeader` needs a pass.

**Common Mistakes:**

- Reordering guards and pipes because the adapter changed. The core order did not change.
- Porting an Express filter method-for-method onto the Fastify reply.
- Assuming NEST-054's `express.json()` position applies verbatim on Fastify.
- Using `getResponse<Response>()` from `@types/express` on a Fastify app and trusting the type. The runtime object is the reply.

**Senior-Level Follow-up:**

A guard calls `context.switchToHttp().getRequest()` and reads `request.headers.authorization`. Does this guard need a rewrite on Fastify?

The header read is on the request object both libraries give you, and `headers` is present on the Fastify request. The guard's allow-or-deny result does not change. Rewrite it if it also uses Express-only request fields. Keep the `CanActivate` return contract either way.

### NEST-074 — Read the log when a pipe fails

**Difficulty:** Advanced

**Category:** Lifecycle

**Question:**

This route is hit with `GET /orders?page=nope`. Which log lines appear, in what order, and what status does the client receive?

```typescript
@Injectable()
export class TraceMiddleware implements NestMiddleware {
  use(_req: Request, _res: Response, next: NextFunction): void {
    console.log('middleware');
    next();
  }
}

@Injectable()
export class TraceGuard implements CanActivate {
  canActivate(): boolean {
    console.log('guard');
    return true;
  }
}

@Injectable()
export class TraceInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    console.log('interceptor-in');
    return next.handle().pipe(
      map(data => {
        console.log('interceptor-out');
        return data;
      }),
      catchError(err => {
        console.log('interceptor-error');
        return throwError(() => err);
      }),
    );
  }
}

@Catch(BadRequestException)
export class TraceFilter implements ExceptionFilter {
  constructor(private readonly adapterHost: HttpAdapterHost) {}

  catch(exception: BadRequestException, host: ArgumentsHost): void {
    console.log('method-filter');
    this.adapterHost.httpAdapter.reply(
      host.switchToHttp().getResponse(),
      exception.getResponse(),
      exception.getStatus(),
    );
  }
}

@Catch()
export class GlobalTraceFilter implements ExceptionFilter {
  catch(): void {
    console.log('global-filter');
  }
}

@Controller('orders')
@UseGuards(TraceGuard)
@UseInterceptors(TraceInterceptor)
export class OrdersController {
  @Get()
  @UseFilters(TraceFilter)
  list(@Query('page', ParseIntPipe) page: number): { page: number } {
    console.log('handler');
    return { page };
  }
}
```

`TraceMiddleware` is bound with `forRoutes(OrdersController)`. `GlobalTraceFilter` is an `APP_FILTER`. `ParseIntPipe` is the default pipe.

**Context and Constraints:**

NestJS 10.4.15, Express adapter. No other guards, interceptors, pipes, or filters. `page=nope` fails `ParseIntPipe`. `map` and `catchError` come from `rxjs/operators`, `throwError` from `rxjs`, and `map` is registered before `catchError`. `Request`, `Response`, and `NextFunction` are the Express types. The other symbols are the Nest 10.4 exports of those names. Import lines are omitted from the listing. The global filter does not call `super`.

**Senior Engineer's Answer:**

`page=nope` fails `ParseIntPipe` with `BadRequestException` before the method body. The lines that print are:

`middleware`, `guard`, `interceptor-in`, `interceptor-error`, `method-filter`.

`handler` does not print. `interceptor-out` does not print, because `map` does not see an error. `global-filter` does not print, because `TraceFilter` is on the method, its `@Catch(BadRequestException)` matches, and selection stops.

The client receives the `ParseIntPipe` error response, status 400, body carrying the message `Validation failed (numeric string is expected)`. `TraceFilter` writes that by passing `exception.getResponse()` and `exception.getStatus()` to the adapter. The global filter would have printed and then written nothing, because its `catch` only logs. It is not given the chance.

The order is the lifecycle in NEST-051 applied to a pipe failure. Middleware, then the guard, then inbound interceptor code, then the pipe inside `next.handle()`, then `catchError`, then the method filter. Outbound `map` and the handler are on the success path.

**Practical Implementation:**

Keep `TraceFilter` as the writer for this route, and delete the `console.log` calls once the order is understood. A production filter returns the `HttpException` body and leaves the pipe message intact. A production interceptor that only rethrows can be removed so the filter is obviously the writer.

**Trade-offs and Alternatives:**

This tracing style is how you confirm a real route when a diagram and a process disagree. Permanent `console.log` in each layer is noisy. A single request id set in middleware and copied by the filter is the operational version of the same trace. The id lets you correlate logs without pinning every stage.

**Common Mistakes:**

- Including `handler` because the query "reached the controller". The controller method starts after the pipe returns.
- Including `interceptor-out` because the interceptor is bound. `map` is skipped when the source errors.
- Including `global-filter` because `@Catch()` sounds broader than `@Catch(BadRequestException)`. Broader loses when a narrower filter is tried first and matches.
- Predicting 500. `ParseIntPipe` throws `BadRequestException`, and `TraceFilter` forwards its status.

**Senior-Level Follow-up:**

The same request is sent as `GET /orders?page=2`. Which lines print, and what is the body?

`middleware`, `guard`, `interceptor-in`, `handler`, `interceptor-out`. Neither filter prints. `ParseIntPipe` returns the number `2`. The handler returns `{ page: 2 }`. `map` returns that same object. The client receives `200` and `{ page: 2 }`.

### NEST-075 — Choosing the layer

**Difficulty:** Advanced

**Category:** Lifecycle

**Question:**

An orders API needs five behaviors: stamp `x-request-id` on every response, reject missing `Authorization` with 401, require `@Roles('billing')` on `POST /orders`, coerce `?page` to a number or return 400, and turn an unhandled `Error` into a generic 500 body. Which Nest layer owns each behavior, and what is wrong with putting all five in one interceptor?

**Context and Constraints:**

NestJS 10.4.15, Express adapter. One global exception filter may be added. `Roles` metadata is the decorator from NEST-062. `page` is a single query field, not a DTO. The 401 and the 403 must stay distinct, as in NEST-058.

**Senior Engineer's Answer:**

Stamp `x-request-id` in middleware. Every matched route should get it, including routes that later fail a guard, and the work does not need the handler reference. Set the header and call `next()`. If the id must also appear on middleware failures, the global filter has to copy it onto error responses, because a middleware throw never enters the route interceptor.

Reject a missing `Authorization` header in a guard that throws `UnauthorizedException`. If every route requires it and the check does not depend on handler metadata, middleware may throw `UnauthorizedException` instead, and only a global filter will see it. Prefer the guard when controller filters must be able to shape the 401.

Require `@Roles('billing')` in a guard that reads `Reflector` from `getHandler()` then `getClass()`. Throw `ForbiddenException` when the user is present and lacks the role. Throw `UnauthorizedException` when the user is absent, so a missing session stays 401. `return false` would collapse that case into the generic 403.

Coerce `page` with `DefaultValuePipe` only if a missing page has a default, then `ParseIntPipe`, in that order, on the query parameter. The pipe's 400 is the contract. The handler receives a number or does not run.

Turn an unhandled `Error` into `{ statusCode: 500, message: 'Internal server error' }` in a global `@Catch()` filter, or leave it to `BaseExceptionFilter`, which already does that and logs the stack on the server. Bind it globally so middleware failures and routes that forgot a method filter still have a writer.

One interceptor cannot own all five. It runs after guards, so it cannot be the thing that stops an unauthenticated request before pipes, unless you also put the auth check in the interceptor and skip the guard model. It does not run at all when a guard throws. It is inside `next.handle()` for pipes, so it can observe a pipe error, and it should not be the only 500 writer, because middleware and guards throw outside it. Filters do not run on success, so the request id on a 200 response is not a filter's job. The layers are the sequence in NEST-051. Each behavior sits where it can see the data it needs and where its failure is visible to the filter that should write it.

**Practical Implementation:**

```typescript
consumer.apply(RequestIdMiddleware).forRoutes('*');

@Post()
@Roles('billing')
@UseGuards(AuthGuard, RolesGuard)
create(): { ok: true } {
  return { ok: true };
}

@Get()
list(@Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number): { page: number } {
  return { page };
}
```

`AuthGuard` throws `UnauthorizedException` when the header is missing. `RolesGuard` is NEST-062. The global fallback filter is NEST-072. `RequestIdMiddleware` is NEST-052.

**Trade-offs and Alternatives:**

Collapsing authentication and the role check into one guard is reasonable when both always run together and the 401 versus 403 branch is still explicit. Splitting them matches the short-circuit order in NEST-059 and keeps each class testable. A DTO plus `ValidationPipe` replaces `ParseIntPipe` when `page` grows into a query object. That is the next file, and it is still a pipe in this same slot. An interceptor remains the right layer for a response envelope around successful bodies, which this list deliberately does not ask for.

**Common Mistakes:**

- Doing the role check in middleware because "it runs first". It cannot see `@Roles()` on the method.
- Doing the integer coercion in the guard. A bad `page` would become 403 or 401 instead of 400, and the handler would not receive a number.
- Using one `@Catch()` filter on the controller for the generic 500 and expecting malformed JSON and middleware throws to reach it.
- Short-circuiting the interceptor with `of({ error: 'nope' })` for the 401 and returning HTTP 200.

**Senior-Level Follow-up:**

Product asks for every successful body to become `{ data, requestId }` and for error bodies to include the same `requestId`. Which two layers do you add, and what must the middleware already have done?

Add an interceptor that `map`s successful values to `{ data, requestId }`. Add the request id to the global exception filter's JSON. The middleware must have stored the id where both can read it, usually `req` and the response header. The interceptor never sees guard and middleware failures. The filter never sees the successful return value. Both write `requestId` only if middleware saved it before either path diverged.

### NEST-076 — What switchToHttp attaches to the host

**Difficulty:** Senior

**Category:** Execution context

**Question:**

A guard calls `context.switchToHttp()` and then `context.switchToRpc()`. What do `getRequest()`, `getData()`, and `getType()` return on an HTTP route, and did either call change the transport?

**Context and Constraints:**

NestJS 10.4.15, Express adapter. The guard runs on an HTTP controller method. `ExecutionContextHost` is the host Nest built for that guard. No microservice listener is connected.

**Senior Engineer's Answer:**

`switchToHttp()` returns the same host. In 10.4.15 it `Object.assign`s three methods onto that object: `getRequest` reads argument 0, `getResponse` reads argument 1, and `getNext` reads argument 2. For this route those arguments are the Express request, the Express response, and Express `next`. `getType()` is left alone. The interceptor and guard paths set it to `'http'` before `canActivate` or `intercept` runs.

`switchToRpc()` assigns `getData` to argument 0 and `getContext` to argument 1 on that same object. It does not remove the HTTP methods, and it does not change `getType()`. After both calls, `getRequest()` and `getData()` are the Express request. `getType()` is still `'http'`. The call selects an accessor for the argument array Nest already passed. It does not attach the process to a different adapter.

A later `switchToWs()` would add WebSocket accessors the same way. Branch on `getType()` before trusting an accessor. The accessor names stay on the object once assigned.

**Practical Implementation:**

```typescript
canActivate(context: ExecutionContext): boolean {
  if (context.getType() !== 'http') {
    return true;
  }
  const request = context.switchToHttp().getRequest<{ headers: Record<string, string> }>();
  return typeof request.headers.authorization === 'string';
}
```

The generic on `getRequest` is a compile-time claim. The runtime value is still argument 0.

**Trade-offs and Alternatives:**

`getArgByIndex(0)` is the same read as `getRequest()` on this HTTP host. `switchToHttp()` is the name that stays correct if the same helper is later called from a filter, which also receives `[req, res, next]`. `getType()` is the check that stops an `APP_GUARD` from treating an RPC payload as an Express request when that guard is also registered on a hybrid app.

**Common Mistakes:**

- Treating `switchToHttp()` as a runtime conversion of an RPC call into HTTP.
- Assuming `switchToRpc()` clears `getRequest`. Both sets of methods remain.
- Using `getData()` after `switchToRpc()` as proof the route is a microservice. On this route it is the request object.
- Checking `getType()` after `switchToHttp()` and expecting the switch to have written `'http'`. The type was already set, or it is the host default. The switch does not write it.

**Senior-Level Follow-up:**

The exception filter's `catch` receives the host built in `RouterProxy` as `new ExecutionContextHost([req, res, next])`. What does `switchToHttp().getResponse()` return there?

The Express response. Argument 1 is still the response, so the HTTP accessors work. `getHandler()` and `getClass()` are null because that constructor was not given the controller method. `getType()` is `'http'` because that is the field default on `ExecutionContextHost` and this catch path does not call `setType`. Use the response. Read route metadata in the guard, where the host was built with the class and the method.

### NEST-077 — Status written through getResponse

**Difficulty:** Senior

**Category:** Execution context

**Question:**

`POST /orders` has no `@HttpCode()`. One version calls `switchToHttp().getResponse().status(202)` in a guard. The other calls `status(202)` in an interceptor before returning `next.handle()`. The handler returns `{ id: '1' }`. What status does the client receive in each version?

**Context and Constraints:**

NestJS 10.4.15, Express adapter. One version sets the status only in the guard. The other sets it only in the interceptor, before `next.handle()`. Nothing else calls `res.status`. The handler does not use `@Res()`.

**Senior Engineer's Answer:**

`getResponse()` is the Express response Nest will later pass to `reply`. It is one object for the whole route proxy.

Guards finish first. `RouterExecutionContext` then calls `responseController.setStatus` with the status chosen for the handler: `@HttpCode()` when present, otherwise 201 for `POST` and 200 for every other method. That call is `response.status(201)` on the Express adapter. The guard's 202 is replaced. The client receives 201.

The interceptor runs after that `setStatus`. Its `res.status(202)` replaces 201. The success writer calls `reply(response, body, httpStatusCode)` where `httpStatusCode` is the fourth argument of `createHandleResponseFn`. The call site passes only the callback, the handled flag, and the redirect metadata, so that argument is `undefined`. Express `reply` sets a status only when the status argument is truthy. It does not put 201 back. The client receives 202 and `{ id: '1' }`.

The body still comes from the handler return, through the interceptor observable, because `@Res()` was not used.

**Practical Implementation:**

```typescript
intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
  const response = context.switchToHttp().getResponse<{ status: (code: number) => void }>();
  response.status(202);
  return next.handle();
}
```

Put this interceptor on the `POST` that must answer 202. A guard is the wrong place for that status: Nest writes the route status after `canActivate` returns.

**Trade-offs and Alternatives:**

`@HttpCode(202)` records the status with the route and `setStatus` applies it before interceptors. Prefer that when the status is fixed. `res.status` inside an interceptor is the path that depends on a value computed during the request. Doing both means the later `res.status` is the one `reply` leaves in place.

**Common Mistakes:**

- Setting 202 in the guard and telling the client to expect 202. The following `setStatus` writes 201 for this `POST`.
- Expecting the final `reply` to force 201 again. On 10.4.15 the success `reply` is called without a status code.
- Using `@HttpCode(202)` and also assuming an earlier guard status survives. `@HttpCode` is what `setStatus` writes.

**Senior-Level Follow-up:**

The interceptor calls `res.status(202)` inside `map`, after the handler returned. Does that 202 still win?

Yes. `map` runs before `reply`, and `reply` still receives no status code. The status on the response object at write time is 202. The body is whatever `map` returned.

### NEST-078 — getNext and the Nest pipeline

**Difficulty:** Senior

**Category:** Execution context

**Question:**

A guard calls `context.switchToHttp().getNext()` and invokes the function, then returns `true`. What did that call continue, and what continues the Nest guard-to-interceptor path?

**Context and Constraints:**

NestJS 10.4.15, Express adapter. The guard is the only guard. An interceptor and a controller method are bound. The question is the meaning of argument 2, not authorization.

**Senior Engineer's Answer:**

`getNext()` is argument 2 of the host, the `next` Express passed into the route proxy. Invoking it tells Express to enter the next matching layer. That is Express's stack, not Nest's call from `canActivate` to `intercept`.

`RouterExecutionContext` continues the Nest path by awaiting the guards and, when the picked result is true, calling `setStatus` and then `interceptorsConsumer.intercept`. It does not call `next` to get there. A guard that invokes `getNext()` and also returns `true` starts that Express continuation and still lets Nest run pipes, the handler, and the response writer. Two layers can write the response.

Return `true` to continue Nest's path. Throw an `HttpException`, or return `false`, to stop it. `false` becomes `ForbiddenException` from the guards runner. Leave `getNext()` for code that is intentionally handing the request back to Express, and return a result that does not also continue the handler. `@Next()` on a parameter is the same callback, exposed to the method, and using it without `{ passthrough: true }` marks the response as handled by the route.

**Practical Implementation:**

```typescript
canActivate(context: ExecutionContext): boolean {
  const request = context.switchToHttp().getRequest<{ header: (name: string) => string | undefined }>();
  if (!request.header('authorization')) {
    throw new UnauthorizedException();
  }
  return true;
}
```

This guard either throws or returns `true`. It does not call `getNext()`.

**Trade-offs and Alternatives:**

Express middleware is the layer whose contract is `next()`. A guard's contract is the boolean, promise, or observable `canActivate` returns. Mixing `getNext()` into the guard duplicates the continuation. If a request must skip Nest and fall through to a later Express route, that decision belongs in middleware registered for that path, where `next()` is the only continuation.

**Common Mistakes:**

- Describing `getNext()` as the function that starts interceptors.
- Calling it and returning `true`, then debugging a response that was written twice.
- Calling it and returning `false`. Express moves on, and Nest also throws `ForbiddenException` from the failed guard.
- Treating a missing `next` on a non-HTTP host as an empty function. On this HTTP route it is present. On a host whose argument array is shorter, argument 2 is `undefined`.

**Senior-Level Follow-up:**

The handler takes `@Next() next: NextFunction` and calls `next()` without writing a body. What does Nest do with the return value?

`@Next()` marks the response handled unless `{ passthrough: true }` was set. The route proxy does not `reply` the return value. Express continues from that `next()`. The client gets whatever the later Express layer writes. If nothing writes, the request waits.

### NEST-079 — A parameter decorator that returns false

**Difficulty:** Senior

**Category:** Execution context

**Question:**

`@CurrentUser()` is `createParamDecorator`. The factory returns `false` when `request.user` is missing. No guard is bound. Does the handler run, and what value does it receive?

**Context and Constraints:**

NestJS 10.4.15, Express adapter. The decorator is the only custom parameter decorator. No pipe is attached. The factory does not throw. The method is `GET` and returns `{ user }`.

**Senior Engineer's Answer:**

The handler runs. It receives `false` as that argument.

`createParamDecorator` stores a factory on the route-argument metadata. Nest calls it from `getCustomFactory` while `createPipesFn` fills the method arguments. That function is the body of `next.handle()`, so it runs after guards and after inbound interceptor code. The factory's return value is the extracted argument. Pipes then see that value. With no pipes, the argument array keeps the factory result, and `callback.apply` passes it to the method.

`false` is a value. The guards runner is the code that turns a failed `canActivate` into `ForbiddenException`. Nothing in argument resolution inspects the factory result and denies the request. A missing user stays a missing user unless the factory throws or a later pipe throws.

The factory does receive an `ExecutionContext`. `getCustomFactory` calls `factory(data, contextFactory(args))`, and `contextFactory` builds a host with the controller class, the method, and type `'http'`. `switchToHttp().getRequest()` is valid there. Having that context is why the factory can read `request.user`. It does not give the factory the guard contract.

**Practical Implementation:**

```typescript
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user?: { id: string } }>();
    return request.user;
  },
);
```

Pair it with a guard that throws `UnauthorizedException` when `request.user` is missing. The decorator only copies the value the guard already accepted.

**Trade-offs and Alternatives:**

Throwing `UnauthorizedException` from the factory does stop the handler. The throw happens inside `next.handle()`, so an interceptor `catchError` sees it and, if it rethrows, the route filters see it. That is an exception path that runs after inbound interceptors, not a guard. Keep the allow-or-deny decision in `canActivate` so a failed login never starts interceptors or pipes.

**Common Mistakes:**

- Returning `false` or `null` from the factory and expecting the 403 Nest builds for a guard.
- Describing the decorator as a guard because the factory was given `ExecutionContext`.
- Expecting the factory to run before guards. The user object is still unset if the guard is what sets it, and the factory has not run yet when the guard runs.
- Putting `@UseGuards` logic in the factory and skipping a real guard, so every consumer of the decorator has to remember to throw.

**Senior-Level Follow-up:**

The factory throws `UnauthorizedException` instead of returning `false`. Which earlier stages have already finished?

Middleware, every guard, and interceptor code before `next.handle()` have finished. Pipes on this argument have not started, because the factory throws before the pipe list reduces. The handler does not run. The observable errors, so `catchError` on that interceptor can see the exception.

### NEST-080 — The data argument of createParamDecorator

**Difficulty:** Intermediate

**Category:** Execution context

**Question:**

`@CurrentUser('email')` and `@CurrentUser(ParseIntPipe)` are two different call shapes. What is `data` inside the factory in each case, and which one actually registers a pipe?

**Context and Constraints:**

NestJS 10.4.15. `CurrentUser` is `createParamDecorator` with the default factory `(data, ctx)`. `ParseIntPipe` is the built-in class. No global pipe.

**Senior Engineer's Answer:**

The decorator factory distinguishes the first argument with `isPipe`. A pipe is a class whose prototype has `transform`, or an object whose `transform` is a function. Anything else is parameter data.

`@CurrentUser('email')` stores `data` as `'email'` and stores no pipes from that argument. The factory is later called as `factory('email', ctx)`. `ctx.switchToHttp().getRequest()` is how the factory reaches the user. The usual body returns `user.email` when `data` is that key, and the whole user when `data` is `undefined`.

`@CurrentUser(ParseIntPipe)` treats the first argument as a pipe. `data` passed to the factory is `undefined`. `ParseIntPipe` is appended to that parameter's pipe list and runs after the factory returns, global and controller and method pipes first, then the pipes declared on the decorator. `ParseIntPipe` therefore receives the factory's return value, not the string `'email'`.

Further arguments after a data value are pipes: `@CurrentUser('id', SomePipe)` keeps `data === 'id'` and runs `SomePipe` on the factory result.

**Practical Implementation:**

```typescript
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user?: Record<string, unknown> }>();
    const user = request.user;
    if (!user || data === undefined) {
      return user;
    }
    return user[data];
  },
);
```

`@CurrentUser('email')` extracts a field. `@CurrentUser(ParseIntPipe)` does not name a field. It parses whatever the factory returned with `data === undefined`.

**Trade-offs and Alternatives:**

A dedicated `@CurrentUserEmail()` decorator avoids the data union and is easier to type. A data argument is the better shape when many fields share one lookup. Pipes belong in the decorator's pipe list, or in `@CurrentUser('email', SomePipe)`, when the extracted value must be converted. Parsing inside the factory skips the pipe order the rest of the route uses.

**Common Mistakes:**

- Assuming the first argument is always `data`. A pipe class in that position is removed from `data` and registered as a pipe.
- Expecting `ParseIntPipe` to see `'email'`. It sees the factory return, and `data` is `undefined`.
- Typing the factory as `(ctx)` with one parameter. The first runtime argument is `data`. The context is the second.

**Senior-Level Follow-up:**

`@CurrentUser('email', ParseIntPipe)` runs. The user email is `'ada@example.com'`. What does `ParseIntPipe` receive?

The string `'ada@example.com'`. `data` is `'email'`, the factory returns that field, and `ParseIntPipe` then rejects it with `BadRequestException` because it is not a numeric string. The handler does not run.

### NEST-081 — A parameter factory that returns a Promise

**Difficulty:** Senior

**Category:** Execution context

**Question:**

The `createParamDecorator` factory is `async` and resolves to `{ id: '1' }`. One version has no pipes. Another has a global pipe that returns its input unchanged. What does the handler receive, and what changes if the promise rejects?

**Context and Constraints:**

NestJS 10.4.15, Express adapter. The decorator argument is custom metadata. Custom metadata is pipeable because its type key is a string, so `createPipesFn` uses `getParamValue` even when the pipe list is empty. `getParamValue` is `async`. The factory fulfills in the first two versions.

**Senior Engineer's Answer:**

`getCustomFactory` returns whatever the factory returns. It does not await that call itself. For this pipeable argument, `createPipesFn` then `await`s `getParamValue`. `getParamValue` is `async`, and returning a Promise from an `async` function adopts that Promise. The `await` therefore receives `{ id: '1' }` when the pipe list is empty. The handler is called with that object.

When a pipe is present, `applyPipes` starts from `Promise.resolve(value)`, which also adopts the factory Promise. The first `transform` receives `{ id: '1' }`, not the Promise. The handler receives the last pipe's resolved return. A global pipe that returns its input leaves the object unchanged. Both versions call the handler with `{ id: '1' }`.

A rejection fails that `await` before `callback.apply`. The handler does not run in either version. The error is inside the function `next.handle()` runs, so an interceptor `catchError` can see it, and a rethrow can reach the route filters. The status is the exception's status when it is an `HttpException`.

Fulfillment with `false` still calls the handler, with `false`. The Promise is how the argument is produced. It is not a `canActivate` result, and Nest does not turn `false` into `ForbiddenException` on this path.

**Practical Implementation:**

```typescript
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user?: { id: string } }>();
    return request.user;
  },
);
```

Keep the factory synchronous when `request.user` is already set. An `async` factory is for a value that is actually pending, and the handler parameter is the fulfilled value.

**Trade-offs and Alternatives:**

An `async` factory can load a user during argument binding. That I/O sits after guards and inside `next.handle()`, so a failure looks like a pipe or handler failure. A guard or middleware that writes `request.user` keeps the factory synchronous and keeps authentication on the guard path. A pipe remains the place to validate the object after the factory returns it.

**Common Mistakes:**

- Telling the handler to expect a Promise when the pipe list is empty. `getParamValue` is `async`, so the empty list still adopts a returned Promise.
- Expecting the first pipe to receive the Promise object. `Promise.resolve` inside the reduce adopts it before `transform`.
- Rejecting with `UnauthorizedException` and expecting the generic guard 403. The handler is skipped, and the thrown exception is the one filters match.
- Resolving `false` and expecting the request to stop. The handler runs and the argument is `false`.

**Senior-Level Follow-up:**

The factory Promise rejects with `UnauthorizedException`. No pipe is registered. Does the handler run?

No. The `await` on `getParamValue` adopts the rejection, `Promise.all` over the parameters rejects, and the method is not called. The interceptor `catchError` and the route filters can see `UnauthorizedException`. A pipe is not required for that rejection to skip the handler.

### NEST-082 — How Nest wraps the handler return for map

**Difficulty:** Senior

**Category:** Interceptors

**Question:**

An interceptor returns `next.handle().pipe(map(data => ({ data })))`. One handler `return { ok: true }`. Another `return Promise.resolve({ ok: true })`. A third `return of({ ok: true })`. What does `map` receive in each case, and what does the client receive?

**Context and Constraints:**

NestJS 10.4.15, Express adapter. `of` is imported from `rxjs`. One interceptor. No `catchError`. The handler does not throw. `@Res()` is absent. `GET`, so the status set before the interceptor is 200.

**Senior Engineer's Answer:**

`next.handle()` is an observable even when the controller method returns a plain value. The innermost deferred calls `transformDeferred`. That reads the handler result and, in 10.4.15, treats a `Promise` or an `Observable` (`instanceof`) as already deferred. Any other result is passed on as `Promise.resolve(res)`. `switchMap` then emits the plain object, the resolved promise value, or the observable's emissions.

`map` receives `{ ok: true }` in all three cases. It returns `{ data: { ok: true } }`. The route's result observable is then reduced with `lastValueFrom` in `RouterResponseController.transformToResult` when that result is an observable, which it is once an interceptor is in the chain. One emission becomes the body. The client receives 200 and `{ data: { ok: true } }`.

The controller method is not required to return an `Observable`. Nest's wrap is what makes `map` and `catchError` apply to a plain return and to a promise. Returning an `Observable` from the method is optional and means `switchMap` subscribes to it.

**Practical Implementation:**

```typescript
intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
  return next.handle().pipe(map(data => ({ data })));
}
```

Leave the handler as `return { ok: true }`. The client body is `{ data: { ok: true } }`.

**Trade-offs and Alternatives:**

Returning `of({ ok: true })` from the handler is useful when the method genuinely has a stream. For one HTTP body it adds nothing, because Nest already wraps the plain return. A promise is the right return when the method awaits I/O and still wants `async`/`await`. `map` sees the same value either way.

**Common Mistakes:**

- Requiring every controller method to `return of(value)` before an interceptor `map` can run.
- Expecting `map` to receive the Promise object. `switchMap` emits the resolved value.
- Wrapping the value again inside the handler and also in `map`, so the client sees two envelopes.

**Senior-Level Follow-up:**

The handler returns an observable that emits `{ n: 1 }` and then `{ n: 2 }`, then completes. What body is written?

`{ data: { n: 2 } }`. `map` runs for both emissions. `lastValueFrom` keeps the last one and that value is what `reply` sends. An observable that completes with no emission rejects `lastValueFrom`, and that rejection enters the exception path.

### NEST-083 — What intercept itself must return

**Difficulty:** Senior

**Category:** Interceptors

**Question:**

`intercept` computes a cache hit and `return { cached: true }` without calling `next.handle()`. A second version `return Promise.resolve(next.handle())`. A third `return next.handle().pipe(map(...))`. Which versions satisfy the 10.4.15 interceptor contract, and what happens to the plain object?

**Context and Constraints:**

NestJS 10.4.15. `NestInterceptor.intercept` is typed `Observable<R> | Promise<Observable<R>>`. The consumer in `InterceptorsConsumer` is the one that flattens interceptor results with `defer` and `mergeAll`. The handler would have returned `{ ok: true }` if it had run.

**Senior Engineer's Answer:**

The third version is the ordinary contract: `next.handle()` is already an `Observable`, and `pipe` returns an `Observable`. The second version is also allowed. `intercept` may return `Promise<Observable<R>>`. The consumer's `nextFn` is `async` and returns whatever `intercept` returns, so that promise is adopted and `mergeAll` subscribes to the observable it resolves to. The handler still runs, because `next.handle()` was called.

The first version returns a plain object. That is outside the interface. The consumer does not run that object through `transformDeferred`. `transformDeferred` wraps the controller result. The interceptor result is flattened as an observable stream. A plain object is not a stream `mergeAll` can subscribe to, so the chain errors and the handler's `{ ok: true }` is not the body. The client does not receive `{ cached: true }` as a successful Nest reply.

A cache hit that must skip the handler returns `of({ cached: true })`. `of` is an `Observable`, the inner `next.handle()` is never called, and `lastValueFrom` resolves to that object.

**Practical Implementation:**

```typescript
intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
  if (this.hit) {
    return of({ cached: true });
  }
  return next.handle().pipe(map(data => ({ data })));
}
```

Both branches return an `Observable`. The hit branch does not call `next.handle()`.

**Trade-offs and Alternatives:**

`Promise.resolve(next.handle())` is legal and useful when the decision to build the stream awaits I/O first. Awaiting and then returning a plain body is the version that breaks the chain. Do the I/O, then return `of(body)` or `next.handle()`.

**Common Mistakes:**

- Returning the response object from `intercept` because the handler is allowed to return a plain object. Those are different return contracts.
- `return await next.handle()` inside an `async intercept` and expecting the awaited value to be the body. `handle()` returns an observable immediately. It does not wait for the handler.
- Forgetting `of(...)` on the short-circuit path.

**Senior-Level Follow-up:**

`intercept` is `async`, awaits a cache lookup, and then `return next.handle()`. Is the return type still valid?

Yes. An `async` function returns a Promise, and this one resolves to the observable `next.handle()` returns. That is `Promise<Observable<unknown>>`, which the 10.4.15 interface allows. The handler runs only after the await, and only if this return is actually executed.

### NEST-084 — Where catchError sits relative to map

**Difficulty:** Senior

**Category:** Interceptors

**Question:**

The handler throws `NotFoundException`. One interceptor pipes `map` first and `catchError` second. Another pipes `catchError` first, returning `of({ missing: true })`, and `map` second, wrapping the value as `{ data }`. What does each `map` see, and which version can still reach a method `@Catch(NotFoundException)`?

**Context and Constraints:**

NestJS 10.4.15. Operators are the RxJS `pipe` order the interceptor wrote. Nest does not reorder that `pipe`. The method filter writes the exception body when it is selected. `GET` status was set to 200 before the interceptor.

**Senior Engineer's Answer:**

The throw becomes an error notification on the observable `transformDeferred` built. `map` handles next notifications. It does not handle that error.

In the first pipe, `map` does not run for the handler throw. `catchError` runs because it is later in the same `pipe`. If it returns `throwError(() => err)`, the interceptor observable errors, `lastValueFrom` rejects, and the method filter is selected. The client receives the filter's 404 body. If that `catchError` returns `of({ missing: true })`, the error is gone, `map` has already been skipped, and the client receives `{ missing: true }` with status 200. The filter does not run.

In the second pipe, `catchError` recovers first. `map` then sees `{ missing: true }` as a normal value and returns `{ data: { missing: true } }`. The filter does not run. A `map` that throws after that recovery is a new error. A `catchError` placed only before `map` does not see the throw from `map`.

`catchError` must return an `ObservableInput`. Returning a bare object from the callback is an error inside `catchError` itself.

**Practical Implementation:**

```typescript
return next.handle().pipe(
  map(data => ({ data })),
  catchError(err => throwError(() => err)),
);
```

This `map` wraps successes. Failures skip it and still reach the method filter when `catchError` rethrows.

**Trade-offs and Alternatives:**

`catchError` before `map` is how a recovered error becomes a body that the same interceptor then envelopes. That is useful for a compatibility payload and hides the failure from filters. Rethrowing after `map` keeps one writer, the filter. Put the envelope `map` outside the recovery only when the recovered object must use the same shape as a success.

**Common Mistakes:**

- Expecting the first `map` to see `NotFoundException`. The source errored, so `map` is skipped.
- Putting `catchError` only before `map` and expecting it to handle a throw inside `map`.
- Recovering with `of({ missing: true })` and expecting the method filter, or expecting status 404. The status is still 200 unless something sets it.
- Returning `{ missing: true }` directly from `catchError` instead of `of({ missing: true })`.

**Senior-Level Follow-up:**

`map` throws `BadRequestException` for a successful handler return of `{ ok: false }`, and `catchError` is after `map` and rethrows. Which exception does the method filter see?

`BadRequestException`. The handler succeeded, `map` created a new error, and the later `catchError` forwarded it. `NotFoundException` was not thrown. The filter's `@Catch(NotFoundException)` does not match. A `@Catch(BadRequestException)` or `@Catch()` filter can match.

### NEST-085 — APP_INTERCEPTOR and useGlobalInterceptors

**Difficulty:** Senior

**Category:** Interceptors

**Question:**

`LoggingInterceptor` needs `AuditService` in its constructor. One bootstrap calls `app.useGlobalInterceptors(new LoggingInterceptor())`. Another registers `{ provide: APP_INTERCEPTOR, useClass: LoggingInterceptor }` on `AppModule`. Which instance receives `AuditService`, and if both are registered, which runs first on the way in?

**Context and Constraints:**

NestJS 10.4.15. `useGlobalInterceptors` is called after `NestFactory.create()` resolves and before `listen()`. `APP_INTERCEPTOR` is imported from `@nestjs/core`. Default scope. No controller interceptor. `AuditService` is a provider on `AppModule`.

**Senior Engineer's Answer:**

`new LoggingInterceptor()` runs the constructor in `bootstrap`. Nest does not pass `AuditService`. `useGlobalInterceptors` appends the object you hand it to `ApplicationConfig`'s global interceptor list.

`APP_INTERCEPTOR` is recorded while the scanner inserts providers. The token is rewritten to a unique provider key, the class is constructed with the module's injector, and `applyApplicationProviders()` runs inside `create()`, after instances exist. `useClass` therefore receives `AuditService`. The original `APP_INTERCEPTOR` string is not a token you can `app.get` afterwards.

On the way in, static global interceptors run in the order they were added to that list, then controller interceptors, then method interceptors. The `APP_INTERCEPTOR` instance is already on the list when `create()` returns. `useGlobalInterceptors` concatenates after it. `LoggingInterceptor` from the provider runs before the `bootstrap` instance.

Both run. The second registration does not replace the first. Each `intercept` must return an observable or a promise of one, and each that calls `next.handle()` wraps the next.

**Practical Implementation:**

```typescript
@Module({
  providers: [
    AuditService,
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
```

`LoggingInterceptor` can `constructor(private readonly audit: AuditService) {}`. Every route enters it before controller and method interceptors.

**Trade-offs and Alternatives:**

`APP_INTERCEPTOR` is the registration that can take dependencies and cover the process. `useGlobalInterceptors(new TimingInterceptor())` is honest when the class has an empty constructor and you want it visible in `bootstrap`. `@UseInterceptors` on one controller is the better scope when only that resource needs the wrap. A singleton interceptor shares its fields across requests. Keep per-request data on the request or in local variables inside `intercept`.

**Common Mistakes:**

- `new LoggingInterceptor()` in `useGlobalInterceptors` and expecting `AuditService` to be defined.
- Registering the class only in `providers` and expecting it to wrap every route. The `APP_INTERCEPTOR` token, or `@UseInterceptors`, is what binds it.
- Assuming the `bootstrap` registration replaces the provider. It appends.
- Storing `request` on `this` inside a global interceptor. The next request overwrites it.

**Senior-Level Follow-up:**

`LoggingInterceptor` is request-scoped and provided as `APP_INTERCEPTOR`. Where is it stored, and when is it appended relative to a static global interceptor?

It is stored on the request-interceptor list. `applyApplicationProviders` does not push that wrapper's instance into the static list. `addScopedEnhancersMetadata` attaches the wrapper to controllers, and a controller whose enhancer tree is request-scoped is handled with a per-request context. `getGlobalMetadata` appends the scoped instances after the static global interceptors on that context. A static `useGlobalInterceptors` instance stays in the static list, ahead of this scoped interceptor.

### NEST-086 — Two APP_INTERCEPTOR registrations

**Difficulty:** Senior

**Category:** Interceptors

**Question:**

`AppModule` imports `AuditModule`. `AppModule`'s `providers` register `APP_INTERCEPTOR` with `LoggingInterceptor`. `AuditModule`'s `providers` register `APP_INTERCEPTOR` with `AuditInterceptor`. After `create()`, `bootstrap` calls `useGlobalInterceptors(new TimingInterceptor())`. What is the inbound order, and what does `AuditInterceptor`'s `map` see if all three call `next.handle()` and `map` the value?

**Context and Constraints:**

NestJS 10.4.15. Default scope. No other interceptors. `scanForModules` inserts a module, then inserts that module's imports. `scanModulesForDependencies` walks `ModulesContainer` in insertion order. `reflectProviders` walks each module's `providers` array from left to right. The handler returns `{ ok: true }`. Each `map` wraps once: `data => ({ wrappedBy, data })` with its own name.

**Senior Engineer's Answer:**

`registerCoreModule` inserts `InternalCoreModule` first. `scanForModules` then inserts `AppModule` before it inserts `AuditModule`, because imports are scanned after the current module is inserted. Dependency reflection walks that map. `AppModule`'s provider list is recorded before `AuditModule`'s. Inside each list, array order is the order of `APP_INTERCEPTOR` entries. `applyApplicationProviders` pushes the constructed instances in that recorded order.

`useGlobalInterceptors` after `create()` appends `TimingInterceptor`.

Inbound order is `LoggingInterceptor`, then `AuditInterceptor`, then `TimingInterceptor`. Each calls `next.handle()`, so the handler runs inside the innermost one. `map` runs innermost first. `TimingInterceptor`'s `map` sees `{ ok: true }`. `AuditInterceptor`'s `map` sees `{ wrappedBy: 'timing', data: { ok: true } }`. `LoggingInterceptor`'s `map` sees the audit wrapper around that. The client receives the logging wrapper, three levels deep.

That cross-module order is the 10.4.15 scanner walk above. It is the insertion order of the modules container, not a sort by module distance.

**Practical Implementation:**

```typescript
@Module({
  imports: [AuditModule],
  providers: [{ provide: APP_INTERCEPTOR, useClass: LoggingInterceptor }],
})
export class AppModule {}
```

If `AuditInterceptor` must see the handler value before `LoggingInterceptor` wraps it, register `AuditInterceptor` first in the same `providers` array, or give it the outer position on purpose and let its `map` run later.

**Trade-offs and Alternatives:**

One interceptor with two ordered steps is easier to read than three global wrappers. Separate `APP_INTERCEPTOR` providers are justified when different modules own different concerns. Then the scan order is part of the contract, and a test that asserts the envelope is the way you lock it. `@UseInterceptors(AuditInterceptor, LoggingInterceptor)` on one controller makes the order local and leaves other routes alone.

**Common Mistakes:**

- Claiming the imported module's interceptor always runs before the root module's. On this scanner the root module is inserted, and reflected, before its imports.
- Expecting `useGlobalInterceptors` to run first because it is global. It appends after `create()`.
- Describing all three `map` callbacks as seeing `{ ok: true }`. Only the innermost one does.
- Registering two `APP_INTERCEPTOR` providers and assuming the second replaces the first.

**Senior-Level Follow-up:**

Both interceptors are declared in `AppModule.providers`, audit first, logging second. No `useGlobalInterceptors`. Which `map` sees `{ ok: true }`?

`LoggingInterceptor`. Same-module order follows the `providers` array, and the later global interceptor is the inner one on the way in, so its `map` is the first on the way out.

### NEST-087 — Functional middleware and class middleware

**Difficulty:** Senior

**Category:** Middleware

**Question:**

`configure` does `consumer.apply(requestIdMiddleware, RequestIdMiddleware).forRoutes(OrdersController)`. `requestIdMiddleware` is a function `(req, res, next) => void`. `RequestIdMiddleware` is a class with `use` and a constructor dependency. How does Nest register each, and which one can receive that dependency from the injector?

**Context and Constraints:**

NestJS 10.4.15, Express adapter. The class is decorated with `@Injectable()`. Its dependency is provided by the module that implements `configure`. The function's name starts with a lowercase letter and its prototype has no `use`. Default scope.

**Senior Engineer's Answer:**

`apply` accepts classes and functions. `filterMiddleware` keeps functions and passes each through `mapToClass`.

`isMiddlewareClass` treats a value as a class when `toString()` starts with `class`, or when it is a `function` whose name starts with an uppercase letter and whose prototype has `use`. `RequestIdMiddleware` matches. Nest keeps that class and later `new`s it from the middleware injector, so the constructor dependency is resolved from the module that registered it. A missing provider fails while middleware instances are created, during startup, for a static tree.

`requestIdMiddleware` does not match `isMiddlewareClass`. Nest wraps it in a generated class whose `use` calls the function with the same arguments, after the exclude check. That generated class has no constructor parameters. The injector cannot inject into the function. The function sees `(req, res, next)` only.

Both end up as `use(req, res, next)` on the Express stack for the `OrdersController` routes. `forRoutes` and `exclude` apply to both. The function form is the one to use when there is nothing to inject. The class form is the one the container constructs.

**Practical Implementation:**

```typescript
consumer
  .apply(RequestIdMiddleware)
  .forRoutes(OrdersController);
```

```typescript
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  res.setHeader('x-request-id', req.header('x-request-id') ?? crypto.randomUUID());
  next();
}
```

Use the function when a header stamp is the whole job. Use the class when `use` needs a service.

**Trade-offs and Alternatives:**

Closing over a service from `configure` is possible because the module instance can inject that service and pass a function that calls `this.service`. That closure is still functional middleware: Nest does not treat the captured service as a constructor param of the function. A class is clearer when the dependency list should be visible to the injector and to tests that construct the middleware directly.

**Common Mistakes:**

- Adding a constructor to the function by wrapping it in an ad hoc object and expecting `apply` to inject it. Injection is for the class path.
- Naming a function `RequestId` and also putting `use` on its prototype, which makes `isMiddlewareClass` treat it as a class.
- Forgetting `@Injectable()` and emitted design metadata on the class, then wondering why constructor parameters are empty.
- Expecting either form to receive `ExecutionContext` as a fourth argument. Both are mounted as `(req, res, next)`.

**Senior-Level Follow-up:**

The class is request-scoped. When is a new instance created?

Not at `configure` time. A static middleware tree is constructed while instances are resolved. A request-scoped middleware is loaded per context inside the handler Nest registers, on the request that reached that route. The function form has no scope. The wrapper class is a singleton function holder.

### NEST-088 — Why middleware has no ExecutionContext

**Difficulty:** Senior

**Category:** Middleware

**Question:**

`RequestIdMiddleware.use` wants `Reflector.get('roles', handler)` for the controller method that will run. Why is there no `ExecutionContext` to call `getHandler()` on, and what does the host in the middleware `catch` path contain if `use` throws?

**Context and Constraints:**

NestJS 10.4.15, Express adapter. The middleware was applied with `forRoutes(OrdersController)`. `OrdersController` has two methods. The question is the context object, not `exclude`.

**Senior Engineer's Answer:**

Module middleware is registered as Express middleware. `MiddlewareModule` binds `instance.use` and the proxy calls it as `(req, res, next)`. The success path has those three parameters. Nest does not build an `ExecutionContextHost` before `use`, and it does not pass one in.

The route proxy that knows the controller method runs later, after this middleware calls `next()`. Until then Nest has a path pattern, not a chosen method. `OrdersController` has two methods. `getHandler()` would be ambiguous even if you wanted the class, and the middleware host is not given either method.

If `use` throws, the proxy catch builds `new ExecutionContextHost([req, res, next])`. That host supports `switchToHttp()` because arguments 0, 1, and 2 are present. The constructor was not given a class or a handler, so `getClass()` and `getHandler()` are null. `Reflector.get` on a null target is a thrown `TypeError`, not "no roles". Global filters can see the original throw. Method filters are not the ones selected for a middleware exception.

Read `req` and `res` in middleware. Read handler metadata in a guard, whose host is built with `instance.constructor` and the route callback.

**Practical Implementation:**

```typescript
use(req: Request, res: Response, next: NextFunction): void {
  res.setHeader('x-request-id', req.header('x-request-id') ?? crypto.randomUUID());
  next();
}
```

The role check stays in a guard that can call `context.getHandler()` and `context.getClass()`.

**Trade-offs and Alternatives:**

Building `new ExecutionContextHost([req, res, next])` inside `use` reproduces the catch host. It gives you `switchToHttp()` and a null handler. It does not discover the controller method. If every route on the path shares one rule that does not depend on metadata, express the rule with `req` and a service. If the rule is `@Roles()` on a method, the guard is the layer that can see that method.

**Common Mistakes:**

- Adding a fourth `context: ExecutionContext` parameter to `use` and expecting Nest to fill it in.
- Calling `Reflector.get` with a handler guessed from the controller prototype. The request may be either method, or a path that matched the middleware and failed the route later.
- Using the catch-path host's null `getHandler()` as "public route".
- Expecting a method `@Catch()` to handle the throw from `use`.

**Senior-Level Follow-up:**

The middleware reads `req.params.id` on `forRoutes(OrdersController)` where the controller path is `orders/:id`. Is that param the same fact as `getHandler()`?

No. Express can populate `req.params` from the middleware path. That is URL data. `getHandler()` is the controller function reference Nest uses for metadata. The param can be present while the handler reference is still unavailable. A guard can read both.

### NEST-089 — A service inside class middleware

**Difficulty:** Intermediate

**Category:** Middleware

**Question:**

`RequestIdMiddleware` injects `IdService` and calls it from `use` before `next()`. `IdService` is provided by `CoreModule` and exported. `OrdersModule` implements `configure` and applies the middleware. What must `OrdersModule`'s imports contain, and what context does `use` still lack after injection works?

**Context and Constraints:**

NestJS 10.4.15, Express adapter. The middleware class is `@Injectable()` and is not listed in `providers`. It is only passed to `consumer.apply`. Default scope. `IdService` has no request scope.

**Senior Engineer's Answer:**

`OrdersModule` must import `CoreModule`, because the middleware instance is created in the module that called `configure`. Constructor injection uses that module's visibility. An export from `CoreModule` is visible after the import. Declaring `RequestIdMiddleware` in `providers` is not what mounts it. `apply(RequestIdMiddleware)` is what mounts it and what causes the injector to construct it.

Once injection works, `use(req, res, next)` can call `this.idService`. It still has no `ExecutionContext`, no `getHandler()`, and no `getClass()`. `IdService` can mint an id. It cannot read `@Roles()` for the method. The service is a normal singleton in this default scope, so mutable fields on `IdService` are shared by every request that enters the middleware.

Call `next()` after the service returns. A throw from the service rejects the middleware and enters the global exception path, not the method filters on `OrdersController`.

**Practical Implementation:**

```typescript
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  constructor(private readonly ids: IdService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    res.setHeader('x-request-id', this.ids.next(req.header('x-request-id')));
    next();
  }
}
```

`OrdersModule` imports `CoreModule` and applies `RequestIdMiddleware` in `configure`.

**Trade-offs and Alternatives:**

Injecting a logger or an id generator keeps middleware free of global singletons you construct by hand. Injecting a `Reflector` still does not supply a handler to read. If the service must know the route name, set that name in a guard and let middleware do only the work that is valid for every method on the path.

**Common Mistakes:**

- Listing the middleware in `providers` and omitting `consumer.apply`. The service can be injected and the middleware never runs.
- Importing `CoreModule` into a different module from the one that calls `configure`, and expecting that import to satisfy this constructor.
- Using the injected service to decide roles from a string the middleware guessed.
- Forgetting `next()` after `this.ids.next(...)` succeeds.

**Senior-Level Follow-up:**

`IdService.next` throws `ServiceUnavailableException`. Which filters can write the response?

Global filters, and the default exceptions handler if none match. The throw leaves the middleware proxy. Controller and method filters on `OrdersController` are not consulted for that proxy. `switchToHttp()` on the catch host can still write the Express response.

### NEST-090 — @Catch walks for the first match

**Difficulty:** Senior

**Category:** Exception filters

**Question:**

The method has `@UseFilters(BroadFilter, NarrowFilter)`. `BroadFilter` is `@Catch(HttpException)`. `NarrowFilter` is `@Catch(NotFoundException)`. The handler throws `NotFoundException`. Which `catch` runs, and why is the more specific class not chosen?

**Context and Constraints:**

NestJS 10.4.15, Express adapter. Those are the only filters. `NotFoundException` extends `HttpException`. The handler throw is not swallowed by an interceptor. One `@UseFilters` call passes `BroadFilter` and then `NarrowFilter`.

**Senior Engineer's Answer:**

`@Catch` stores the exception classes on the filter. An empty list means "match everything". A non-empty list matches when `exception instanceof` any listed class. `selectExceptionFilterMetadata` returns the first filter in the list for which that test passes. It does not rank subclasses.

The route's filter list is built as global, then controller, then method, and then reversed, so method filters are considered before controller filters and those before global filters. `@UseFilters(BroadFilter, NarrowFilter)` stores `[BroadFilter, NarrowFilter]`. After the reverse, `NarrowFilter` is considered first and `BroadFilter` second.

`NotFoundException instanceof NotFoundException` succeeds. `NarrowFilter.catch` runs. `BroadFilter` is not called. Nest does not fall through to the next filter.

Swap the decorator to `@UseFilters(NarrowFilter, BroadFilter)` and the reverse considers `BroadFilter` first. `NotFoundException instanceof HttpException` succeeds, so `BroadFilter` runs and the narrower class never sees the exception. Specificity is the walk order, not an inheritance sort.

**Practical Implementation:**

```typescript
@Catch(NotFoundException)
export class NarrowFilter implements ExceptionFilter {
  catch(exception: NotFoundException, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<{ status: (n: number) => { json: (b: unknown) => void } }>();
    response.status(exception.getStatus()).json(exception.getResponse());
  }
}
```

Bind the narrow filter in the position the reverse will try first when it must beat a broader filter on the same method: `@UseFilters(BroadFilter, NarrowFilter)`.

**Trade-offs and Alternatives:**

One `@Catch(HttpException)` filter that branches on `getStatus()` keeps a single writer and removes the order trap. Two classes are justified when the bodies are maintained separately. Then the `@UseFilters` argument order is part of the behavior and should be covered by a test that throws `NotFoundException`.

**Common Mistakes:**

- Expecting Nest to pick `NotFoundException` because it is the subclass, regardless of list order.
- Rethrowing inside `NarrowFilter` and expecting `BroadFilter` to run. The walk already finished.
- Describing the unreversed order, global then controller then method, as the try order. The handler tries the reversed list.
- Putting both classes in one `@Catch(HttpException, NotFoundException)`. That is one filter, and `some` matches `HttpException` first for a `NotFoundException`. There is no second filter.

**Senior-Level Follow-up:**

A controller filter `@Catch(NotFoundException)` is added, and the method stays `@UseFilters(BroadFilter, NarrowFilter)`. The throw is still `NotFoundException`. Which filter runs?

`NarrowFilter`. Method filters are tried before the controller filter. `NarrowFilter` matches and the walk stops. The controller filter would run only if both method filters failed the `instanceof` test.

### NEST-091 — @Catch() and @Catch(Error)

**Difficulty:** Senior

**Category:** Exception filters

**Question:**

A method filter is `@Catch(Error)`. A global filter is `@Catch()`. Consider three throws from the handler: `NotFoundException`, `new Error('disk full')`, and the string `'disk full'`. Which filter runs for each?

**Context and Constraints:**

NestJS 10.4.15, Express adapter. No interceptor swallows the error. No other filters. `HttpException` extends `Error`. `@Catch()` with no arguments stores an empty metatype list. The string is thrown as a string, not wrapped.

**Senior Engineer's Answer:**

The method filter is tried first. `@Catch(Error)` matches when `exception instanceof Error`.

`NotFoundException` is an `Error`. The method filter runs. The global `@Catch()` is not called.

`new Error('disk full')` is an `Error`. The method filter runs. The client body is whatever that filter writes. If the filter assumes `HttpException` and calls `getStatus()`, that is a separate fault inside `catch`. The selection itself matched.

The string `'disk full'` is not an `instanceof Error`. The method filter is skipped. `@Catch()` has an empty metatype list, and `!exceptionMetatypes.length` matches, so the global filter runs. `@Catch(Error)` does not mean "everything". `@Catch()` does.

`@Catch(HttpException)` would have matched only the first throw. The plain `Error` and the string would both fall through to `@Catch()`.

**Practical Implementation:**

```typescript
@Catch(Error)
export class ErrorFilter implements ExceptionFilter {
  catch(exception: Error, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<{ status: (n: number) => { json: (b: unknown) => void } }>();
    if (exception instanceof HttpException) {
      response.status(exception.getStatus()).json(exception.getResponse());
      return;
    }
    response.status(500).json({ statusCode: 500, message: 'Internal server error' });
  }
}
```

This method filter owns both `NotFoundException` and `new Error('disk full')`. The string `'disk full'` still reaches the global `@Catch()`.

**Trade-offs and Alternatives:**

`@Catch()` on the method owns all three throws, including strings, and is the right method filter when this route must not leak to the global writer. `@Catch(HttpException)` is the right method filter when unknown errors should stay on the global fallback. `@Catch(Error)` is the middle: objects that are errors, including HTTP exceptions, and not thrown primitives.

**Common Mistakes:**

- Treating `@Catch()` and `@Catch(Error)` as the same registration.
- Expecting a thrown string to match `@Catch(Error)`.
- Letting `@Catch(Error)` call `exception.getStatus()` for every `Error`. Only `HttpException` has that method.
- Assuming `NotFoundException` skips `@Catch(Error)` because a more specific class exists. `instanceof Error` is true, and this filter is first.

**Senior-Level Follow-up:**

The global filter is changed to `@Catch(HttpException)` and the method filter is removed. The handler throws `'disk full'`. What runs?

No custom filter. The string matches neither `HttpException` nor, in this version, an empty `@Catch()`. `ExceptionsHandler.next` calls `BaseExceptionFilter`, which treats a non-`HttpException` as an unknown error. The client receives 500 and `{ statusCode: 500, message: 'Internal server error' }`.

### NEST-092 — @UseFilters list order

**Difficulty:** Intermediate

**Category:** Exception filters

**Question:**

`@UseFilters(AlphaFilter, BetaFilter)` is the only filter metadata on the method. There are no controller or global filters. `AlphaFilter` is `@Catch(BadRequestException)` and `BetaFilter` is `@Catch()`. The handler throws `BadRequestException`. Which filter runs?

**Context and Constraints:**

NestJS 10.4.15. One decorator call, with `AlphaFilter` as the first argument and `BetaFilter` as the second. `extendArrayMetadata` appends the argument list in that order. The exceptions handler reverses the built list before `find`.

**Senior Engineer's Answer:**

The metadata array is `[AlphaFilter, BetaFilter]`. With no controller or global filters, the built list is that array, and the reverse is `[BetaFilter, AlphaFilter]`.

`BetaFilter` is `@Catch()`, so its metatype list is empty and the first-match test succeeds for every exception, including `BadRequestException`. `BetaFilter.catch` runs. `AlphaFilter` is not called, even though its class is the one the throw constructed.

Put the empty `@Catch()` first in `@UseFilters(BetaFilter, AlphaFilter)` if `AlphaFilter` must be tried first. After the reverse, `AlphaFilter` is ahead of `BetaFilter` and the `BadRequestException` matches it. `BetaFilter` remains the fallback for throws that fail `instanceof BadRequestException`.

Stacked `@UseFilters` decorators append in the order those decorator functions run. That order depends on the compiler's decorator transform. The guaranteed part is the reverse of whatever array was stored, not a specificity sort. A single `@UseFilters(...)` call has a known argument order.

**Practical Implementation:**

```typescript
@Get()
@UseFilters(BetaFilter, AlphaFilter)
load(@Query('page', ParseIntPipe) page: number): { page: number } {
  return { page };
}
```

`ParseIntPipe` throws `BadRequestException`. `AlphaFilter` is tried first because it is the second argument and the list is reversed. It writes the 400. `BetaFilter` writes other exceptions from this method.

**Trade-offs and Alternatives:**

One filter with an internal `instanceof` branch makes the order obvious in source. Two filters match Nest's selection model and need the argument order to be deliberate. Prefer the single filter when both bodies are small. Prefer two when a framework filter and a route filter are owned by different modules, and test the throw you care about.

**Common Mistakes:**

- Reading `@UseFilters(AlphaFilter, BetaFilter)` left to right as the try order.
- Assuming `@Catch(BadRequestException)` beats `@Catch()` because it names the class. The empty catch wins when it is earlier in the reversed list.
- Adding a third filter between them and keeping the old assumption about which one is first.

**Senior-Level Follow-up:**

A global `@Catch()` is also registered, and the method stays `@UseFilters(AlphaFilter, BetaFilter)` with `BetaFilter` as `@Catch()`. The throw is `BadRequestException`. Which filter runs?

`BetaFilter`. The reversed method pair is still tried before global filters. `BetaFilter` matches everything and stops the walk. The global filter runs only when every method and controller filter declines.

### NEST-093 — HttpException getResponse as the body

**Difficulty:** Senior

**Category:** Exception filters

**Question:**

No custom filter matches. What JSON does `BaseExceptionFilter` write for `new NotFoundException()`, for `new HttpException('missing', 404)`, and for `new HttpException({ error: 'missing' }, 404)`?

**Context and Constraints:**

NestJS 10.4.15, Express adapter. The exception reaches `BaseExceptionFilter.catch`. Headers have not been sent. The question is the `instanceof HttpException` branch, not the unknown-error branch.

**Senior Engineer's Answer:**

`catch` uses `getResponse()` and `getStatus()`. It does not recompute the status from the class name.

`new NotFoundException()` stores a response object. `getResponse()` is that object, `isObject` is true, and the object is sent as the body with status `getStatus()`, 404. The default object is `{ statusCode: 404, message: 'Not Found' }`.

`new HttpException('missing', 404)` stores the string `'missing'`. A string is not an object, so the filter builds `{ statusCode: 404, message: 'missing' }` and sends that with status 404.

`new HttpException({ error: 'missing' }, 404)` stores an object. The filter sends `{ error: 'missing' }` as the body and status 404. It does not add `statusCode` or `message`. The object you passed is the body.

Subclasses are still this branch. `BadRequestException` and `ForbiddenException` keep their own status and response. They are not rewritten as 500.

**Practical Implementation:**

```typescript
throw new HttpException({ error: 'missing', id }, HttpStatus.NOT_FOUND);
```

The client receives status 404 and `{ error: 'missing', id }` when the base filter handles it. Use a string response when the standard `{ statusCode, message }` wrapper is what the client should see.

**Trade-offs and Alternatives:**

A small set of `HttpException` subclasses keeps controllers free of response shapes. A custom object response is justified when the contract is not `{ statusCode, message }`. A custom filter is justified when every status must share one extra field, such as a request id. That filter should still branch on `instanceof HttpException` and call `getResponse()`, or it will flatten these three cases into one body.

**Common Mistakes:**

- Expecting the object form to gain `statusCode` inside `BaseExceptionFilter`. The object is sent unchanged.
- Expecting the string form to be sent as a raw string. The filter wraps it.
- Treating every `HttpException` as status 500 because it extends `Error`. The `instanceof HttpException` branch runs first and keeps `getStatus()`.
- Reading `exception.message` as the JSON. The JSON comes from `getResponse()`, which may differ from `message`.

**Senior-Level Follow-up:**

`new HttpException({ error: 'missing' }, 404)` is handled by your filter, which always `json`s `{ statusCode: exception.getStatus(), message: exception.message }`. What does the client lose?

The `error` field. `getResponse()` was the contract body. `exception.message` for an object response is not a substitute for that object. Send `exception.getResponse()` when the throw site chose the body.

### NEST-094 — Unknown errors and the http-errors shape

**Difficulty:** Senior

**Category:** Exception filters

**Question:**

`BaseExceptionFilter` handles three non-`HttpException` values thrown from the handler: `new Error('disk full')`, the object `{ statusCode: 400, message: 'bad query' }`, and `{ statusCode: 400 }`. What status and body does the client receive for each, and what is logged?

**Context and Constraints:**

NestJS 10.4.15, Express adapter. No custom filter matches, so `handleUnknownError` runs. Headers have not been sent. `isHttpError` is the base filter's check `err?.statusCode && err?.message`. The process logger is the `ExceptionsHandler` logger.

**Senior Engineer's Answer:**

`new Error('disk full')` fails `instanceof HttpException` and fails the http-errors check because it has no `statusCode`. The client receives status 500 and `{ statusCode: 500, message: 'Internal server error' }`. The string `disk full` is not that JSON. The object has a `message`, so the filter logs `exception.message` and `exception.stack`. The stack stays on the server.

`{ statusCode: 400, message: 'bad query' }` is not an `HttpException`. Both `statusCode` and `message` are truthy, so `isHttpError` passes. The client receives status 400 and `{ statusCode: 400, message: 'bad query' }`. The message is exposed because this shape is the http-errors path, not the generic 500 path. The object also has `message`, so the logger logs that message. There is no `stack` unless the object has one.

`{ statusCode: 400 }` has a truthy status and no `message`. The `&&` check fails. The client receives the generic 500 body. A `statusCode` of `0` would also fail the check, because `0` is falsy. The check is truthiness, not "property in the object".

A thrown string `'disk full'` is also the generic 500. It is not an object with `message`, so the logger receives the thrown value rather than a stack.

**Practical Implementation:**

```typescript
throw new ServiceUnavailableException();
```

Prefer an `HttpException` when the client should see a non-500 status. Throw a plain `Error` when the failure is internal and the client should see `Internal server error` while the server log keeps `disk full`.

**Trade-offs and Alternatives:**

Relying on the `{ statusCode, message }` shape couples you to `isHttpError`. An `HttpException` is the explicit contract and keeps `getResponse()` available to custom filters. A global `@Catch()` that copies `exception.message` into the JSON undoes the split the base filter makes for `Error`. Log the message. Send a stable sentence.

**Common Mistakes:**

- Putting `disk full` in the client JSON because the log showed it.
- Expecting `{ statusCode: 400 }` alone to produce HTTP 400. `message` must also be truthy.
- Assuming every plain object becomes 500. The http-errors shape is a real exception to that.
- Wrapping library errors that already have `statusCode` and `message` and being surprised when the client sees the library message.

**Senior-Level Follow-up:**

The thrown value is `Object.assign(new Error('disk full'), { statusCode: 400 })`. Which path handles it?

`isHttpError`, because `statusCode` and `message` are both truthy. The client receives 400 and `{ statusCode: 400, message: 'disk full' }`. It is still not an `HttpException`. The generic 500 path does not run. Attach `statusCode` only when that message is safe for the client.

### NEST-095 — headersSent before the filter writes

**Difficulty:** Senior

**Category:** Exception filters

**Question:**

The handler uses `@Res()` without passthrough, calls `res.json({ accepted: true })`, and then throws `new Error('later')`. No custom filter matches. What does the client receive, and which writer did `BaseExceptionFilter` skip?

**Context and Constraints:**

NestJS 10.4.15, Express adapter. `res.json` has already flushed the response, so Express `headersSent` is true. The exception reaches `BaseExceptionFilter`. The adapter is `ExpressAdapter`.

**Senior Engineer's Answer:**

`catch` takes the response from `host.getArgByIndex(1)`, the same Express response. `ExpressAdapter.isHeadersSent` returns `response.headersSent`. That is true after `res.json` wrote the body.

Both the `HttpException` branch and `handleUnknownError` share the guard: when headers are not sent, `reply` writes the body and status; when they are sent, `reply` is not called and `applicationRef.end(response)` runs. This throw is an unknown error, so the skipped writer is `reply` of `{ statusCode: 500, message: 'Internal server error' }`. The client keeps `{ accepted: true }`. A second JSON body is not produced by the base filter.

The error is still logged when the thrown value is an object with `message`. `later`'s stack stays on the server. `end` is still invoked. The guaranteed part is that `reply` does not run. Avoid depending on a second `end` after `res.json` already finished the response.

Setting `res.status(202)` or `res.set('x-request-id', ...)` without writing a body does not by itself make `headersSent` true. The filter would still `reply` in that case, and the 202 could be replaced by the status `reply` passes.

**Practical Implementation:**

```typescript
@Post()
create(@Res({ passthrough: true }) res: Response): { accepted: true } {
  res.setHeader('x-request-id', res.getHeader('x-request-id') ?? crypto.randomUUID());
  return { accepted: true };
}
```

Passthrough lets Nest write the return value. Throw before that write if the client should see the error body instead.

**Trade-offs and Alternatives:**

`@Res()` without passthrough is for streams and for responses the handler fully owns. Then the handler also owns failures after the first byte: catch them and write the error before sending, or accept that the base filter will not send a second body. Returning a value and letting the filter write errors is the path that stays consistent.

**Common Mistakes:**

- Expecting `{ statusCode: 500, message: 'Internal server error' }` after a successful `res.json`.
- Calling `res.json` in the handler and `reply` again in a custom filter without reading `headersSent`.
- Treating a header-only mutation as "response already sent". `headersSent` follows the first write.
- Using `@Res()` to set one header, omitting `passthrough`, and then throwing. The success body was never Nest's to send, and the error body is skipped once you have written.

**Senior-Level Follow-up:**

The same sequence throws `NotFoundException` after `res.json({ accepted: true })`. Does the `HttpException` branch still `reply` the 404 body?

No. The headers check surrounds both branches. `reply` is skipped and `end` runs. The client still has `{ accepted: true }`. The 404 object in `getResponse()` is not written.

### NEST-096 — A filter that writes after the handler already did

**Difficulty:** Senior

**Category:** Exception filters

**Question:**

A method `@Catch()` filter logs and then calls `response.json({ statusCode: 500, message: 'Internal server error' })`. The handler has already called `res.json({ accepted: true })` and then thrown `new Error('later')`. What is missing compared with `BaseExceptionFilter`, and what does the client still have?

**Context and Constraints:**

NestJS 10.4.15, Express adapter. The method filter matches and is the selected filter. It does not check `headersSent` and does not call `HttpAdapterHost`. `res.json` completed before the throw. Express will refuse a second write once headers are sent.

**Senior Engineer's Answer:**

The selected filter is the only writer Nest invokes. `BaseExceptionFilter` is not called afterward. The check that skips `reply` when `headersSent` is true lives inside the base filter. A method filter that always `json`s does not inherit that check.

The client already has `{ accepted: true }`. The filter's `response.json(...)` starts another write on a response whose headers are sent. Express rejects that write. The client does not get a well-formed second body. The first body remains the one that was completed.

The filter can log `later` safely. Logging does not require the response. A write requires the headers check, or a path that has not written yet. `HttpAdapterHost.httpAdapter` exposes `isHeadersSent` and `end` for that branch, which is what the base filter uses: `reply` when headers are clear, `end` when they are not.

**Practical Implementation:**

```typescript
@Catch()
export class FallbackFilter implements ExceptionFilter {
  constructor(private readonly adapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse();
    const { httpAdapter } = this.adapterHost;
    if (httpAdapter.isHeadersSent(response)) {
      httpAdapter.end(response);
      return;
    }
    httpAdapter.reply(
      response,
      { statusCode: 500, message: 'Internal server error' },
      500,
    );
  }
}
```

When this filter is the one selected after a finished `res.json`, it ends the response and does not call `reply`.

**Trade-offs and Alternatives:**

Extending `BaseExceptionFilter` and calling `super.catch` reuses the headers check and the `HttpException` split. A hand-written `response.json` is appropriate when headers are still clear and the body must differ. After the handler has taken over the response with `@Res()`, the safer design is to finish the body in the handler and not throw.

**Common Mistakes:**

- Assuming every `@Catch()` filter gained the base filter's `headersSent` guard.
- Ignoring the error from the second `json` and reporting that the client received the 500 body.
- Calling `super.catch` and also `response.json`, which writes twice when headers were still clear.
- Forgetting that selection of this filter suppresses the base filter entirely.

**Senior-Level Follow-up:**

The handler sets `res.status(202)` and throws before any write. `headersSent` is false. What does the practical filter above send?

Status 500 and `{ statusCode: 500, message: 'Internal server error' }`, because `reply` passes 500. The earlier `res.status(202)` is replaced by that `reply`. The headers check does not preserve 202. Preserve it only if your filter reads the current status and you have a reason to keep it.

### NEST-097 — false and undefined in getAllAndOverride

**Difficulty:** Senior

**Category:** Guards

**Question:**

A global guard reads `isPublic` with `Reflector.getAllAndOverride`, handler first and class second. The class has `@SetMetadata('isPublic', true)`. One method has `@SetMetadata('isPublic', false)`. Another method has no `isPublic` metadata. What does the guard read on each method, and which requests skip authentication?

**Context and Constraints:**

NestJS 10.4.15. `Reflector` is injected. The key is the string `'isPublic'`. `getAllAndOverride` returns the first value that is not `undefined`. The guard's only public signal is the boolean `true`.

**Senior Engineer's Answer:**

`getAllAndOverride` walks the targets you pass. For each one, `Reflector.get` is `Reflect.getMetadata`. The first result that is not `undefined` is returned. `false`, `null`, `0`, and `''` are returned. They stop the walk. If every target is `undefined`, the method returns `undefined`.

On the method decorated with `false`, the handler value is `false`. The class value `true` is not consulted. On the method with no metadata, the handler value is `undefined`, so the class value `true` is used.

Skip authentication only when the value is `true`. The undecorated method inherits the class and skips. The method with `false` does not skip, even though metadata is present. A check of `isPublic !== undefined` would treat `false` as public and skip authentication on the method that opted out.

`SetMetadata('isPublic', false)` is a real write. It is not a deletion. Removing the class rule for one method is either `false` plus a strict `=== true` check, or a different key. An absent decorator is the inheritance path.

**Practical Implementation:**

```typescript
canActivate(context: ExecutionContext): boolean {
  const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
    context.getHandler(),
    context.getClass(),
  ]);
  if (isPublic === true) {
    return true;
  }
  return this.authenticate(context.switchToHttp().getRequest());
}
```

`@SetMetadata('isPublic', true)` on the class makes undecorated methods public. `@SetMetadata('isPublic', false)` on a method requires `authenticate`.

**Trade-offs and Alternatives:**

Default-public with method-level `false` matches a small internal controller. Default-private, with `@Public()` only on the routes that skip, fails closed when a method forgets its decorator. `false` as an override is the tool for the default-public controller. Prefer default-private on an API that is mostly authenticated.

**Common Mistakes:**

- Using `if (isPublic)` and then being surprised that the class `true` applies to a method that never declared it. That part is inheritance. The bug is using `if (isPublic !== undefined)` and treating `false` as public.
- Passing `[getClass(), getHandler()]`, so the class `true` wins even on the method that set `false`.
- Expecting `getAllAndOverride` to skip `false` the way it skips `undefined`.
- Reading only `getHandler()` and losing the class default on the undecorated method.

**Senior-Level Follow-up:**

The method metadata is `null` instead of `false`. What does `getAllAndOverride` return, and does `=== true` skip authentication?

It returns `null`. `null !== undefined`, so the class `true` is not read. `null === true` is false, so the guard authenticates. `null` is an explicit value with the same walk behavior as `false`.

### NEST-098 — Two decorators writing one metadata key

**Difficulty:** Senior

**Category:** Guards

**Question:**

A method has two decorators that each call `SetMetadata('roles', someArray)`. A guard uses `Reflector.get('roles', context.getHandler())`. What value is guaranteed to be visible, and what is not guaranteed when both decorators are stacked on the same method?

**Context and Constraints:**

NestJS 10.4.15. `SetMetadata` writes with `Reflect.defineMetadata` on the method when it is used as a method decorator. The guard does not call `getAllAndMerge`. No class-level `roles` metadata. Decorator evaluation order may differ between TypeScript `experimentalDecorators` and the standard decorator transform.

**Senior Engineer's Answer:**

`defineMetadata` replaces the previous value for that key on that target. It does not append arrays. After both decorators have run, `Reflect.getMetadata('roles', handler)` is whichever value was written last. The earlier array is gone. `getAllAndMerge` cannot recover it, because merge reads the one remaining value on the handler and the class, and the class has no `roles` metadata.

Which stacked decorator runs last is the compiler's decorator order. That order is not a Nest guarantee. What Nest guarantees is that `SetMetadata` stores one value per key per target, and `Reflector.get` returns that value.

If both role lists must apply, write them in one decorator that sets `['billing', 'audit']`, or use two keys and have the guard read both. `getAllAndOverride` across handler and class is for two targets, not for two writes on the handler.

**Practical Implementation:**

```typescript
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

@Roles('billing', 'audit')
@Post()
create(): { ok: true } {
  return { ok: true };
}
```

The guard sees `['billing', 'audit']` on the handler. One write holds the whole list.

**Trade-offs and Alternatives:**

`getAllAndMerge` is the right reader when the method adds roles and the class adds different roles, because those are two targets. It is the wrong tool for two decorators on the method that share a key. A dedicated decorator that reads the current metadata and concatenates before writing would make a second decorator append, and that helper must itself define the order. The plain `SetMetadata` helper does not.

**Common Mistakes:**

- Stacking `@Roles('billing')` and `@Roles('audit')` and expecting `['billing', 'audit']`.
- Assuming the decorator closer to the method always wins, on every TypeScript version this repo might use.
- Calling `getAllAndMerge` to repair a key that was overwritten on the same function.
- Using one key for roles and another feature's list, so the second feature replaces the roles.

**Senior-Level Follow-up:**

`@Roles('billing')` stays on the method and `@Roles('audit')` moves to the class. The guard calls `getAllAndMerge('roles', [handler, class])`. What is checked?

Both, if both writes remain. They are different targets, so neither `defineMetadata` replaces the other. Merge concatenates defined arrays, handler first: `['billing', 'audit']`. A user who has either role passes a `some` check. Use `getAllAndOverride` when the method list should replace the class list instead of joining it.

### NEST-099 — The value transform returns is the argument

**Difficulty:** Senior

**Category:** Pipes

**Question:**

`@Body() body` is `{ name: ' ada ' }`. `TrimNamePipe.transform` returns `{ name: 'ada' }`, a new object. The handler also logs `req.body` from an injected request. What does the handler parameter contain, and what does `req.body` contain?

**Context and Constraints:**

NestJS 10.4.15, Express adapter. The pipe is the only pipe on that parameter. It does not mutate its input. It returns a new object. No `@Res()`. The handler runs only if `transform` returns or resolves.

**Senior Engineer's Answer:**

`PipesConsumer.applyPipes` reduces the pipe list. Each `transform` receives the previous result, and the value it returns becomes the next result. `createPipesFn` assigns that final result to `args[index]`. The handler is `callback.apply(instance, args)`. The parameter is `{ name: 'ada' }`.

The body argument was extracted once, from `req.body`, before the pipes ran. Nest does not assign the pipe result back onto `req.body`. The request still has `{ name: ' ada ' }`. Code that reads `req.body` later, including a later interceptor that looks at the request instead of the `map` value, sees the untrimmed name. The handler parameter and `req.body` are different objects after this pipe.

If the pipe mutates `value.name` and returns that same `value`, both the parameter and `req.body` show the trim, because they are the same reference. Replacement and mutation are different. The contract Nest enforces is the return value. Sharing the reference is a consequence of returning the input object.

A returned `Promise` is awaited by the next step of the reduce. The handler receives the resolved value, not the Promise, when the pipe list is non-empty. This pipe list is non-empty.

**Practical Implementation:**

```typescript
@Injectable()
export class TrimNamePipe implements PipeTransform {
  transform(value: unknown): unknown {
    if (!value || typeof value !== 'object' || !('name' in value)) {
      return value;
    }
    const record = value as { name?: unknown };
    if (typeof record.name !== 'string') {
      return value;
    }
    return { ...record, name: record.name.trim() };
  }
}
```

Use the handler parameter for the trimmed name. Read `req.body` only when you intentionally want the original payload.

**Trade-offs and Alternatives:**

Returning a new object keeps the raw body available for an audit log. Mutating in place is fewer allocations and surprises anyone still holding `req.body`. For a DTO, `ValidationPipe` with `transform: true` also replaces the argument, with a class instance. The handler's type and the runtime value then follow that instance, and `req.body` stays the plain object unless the pipe mutated it.

**Common Mistakes:**

- Logging `req.body.name` in the handler and concluding the pipe did not run.
- Mutating `value` and also returning a new object, then expecting `req.body` to match the parameter.
- Expecting Nest to deep-merge the return value into the old body. The return value replaces the argument.
- Reading the parameter from a middleware that ran before the pipe. Middleware saw the raw body. That is the correct time for raw body work, and it will not see the trimmed object.

**Senior-Level Follow-up:**

A second pipe is listed after `TrimNamePipe` and returns `{ name: value.name, trimmed: true }`. What does the handler receive?

`{ name: 'ada', trimmed: true }`. The second `transform` receives the first pipe's object, and only the last return is assigned to the argument. The first return does not reach the handler.

### NEST-100 — A pipe that returns undefined

**Difficulty:** Senior

**Category:** Pipes

**Question:**

`TrimNamePipe.transform` trims `value.name` in place and then falls off the end with no `return`. The client sent `{ name: ' ada ' }`. What argument does the handler receive, and did the handler run?

**Context and Constraints:**

NestJS 10.4.15, Express adapter. This is the only pipe on `@Body() body`. It does not throw. The method signature says `body: { name: string }` and the method logs `body`.

**Senior Engineer's Answer:**

The handler runs. The argument is `undefined`.

The reduce returns whatever `transform` returns. A function that ends without `return` returns `undefined`. That `undefined` is written to `args[index]`. Nest does not substitute the previous value when the result is `undefined`. The original `{ name: ' ada ' }` is discarded as the handler argument.

The in-place trim still happened on the input object before the function returned. That object is `req.body`, so `req.body.name` is `'ada'` if something else reads the request. The handler parameter is not that object. It is `undefined`, and `body.name` in the method throws if the method touches it. That throw is a handler throw, after the pipe returned.

Throw from the pipe when the payload is invalid. Return the value, original or replacement, when the handler should see a body. `undefined` is a successful pipe result and it still invokes the method.

**Practical Implementation:**

```typescript
transform(value: unknown): unknown {
  if (!value || typeof value !== 'object') {
    return value;
  }
  const record = value as { name?: unknown };
  if (typeof record.name !== 'string') {
    return value;
  }
  record.name = record.name.trim();
  return record;
}
```

The handler receives the same object, with `name` trimmed. Omitting `return record` is the bug in the question.

**Trade-offs and Alternatives:**

Returning `value` unchanged is the correct "this pipe does not apply" path for a global pipe on query and param arguments. Returning `undefined` looks like a missing body and is hard to distinguish from a client that sent no JSON. A validation failure belongs in `BadRequestException`, where the handler does not run and a filter can write 400.

**Common Mistakes:**

- Treating a missing `return` as "leave the argument alone".
- Assuming the handler is skipped because the body became `undefined`.
- Mutating `req.body` and returning `undefined`, then reading the mutation from the parameter.
- Using `return` only on the success branch and falling off the end on the ignore branch, so non-body arguments become `undefined` under a global pipe.

**Senior-Level Follow-up:**

The pipe `return value.name.trim()` instead of returning the body object. What does the handler receive?

The string `'ada'`. The last return replaces the whole argument. The handler does not receive `{ name: 'ada' }` unless that is the value the pipe returned. The parameter type `{ name: string }` is not enforced at runtime.
