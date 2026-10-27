# NEST02 — Request lifecycle

NestJS 10, Express adapter unless a question says otherwise. Questions NEST-051–NEST-100.

The order below matches NestJS 10.4 (checked against 10.4.15). Per-request work starts after `init()`. Module dependency injection is the previous file. Enhancers here are middleware, guards, interceptors, pipes, and exception filters, plus `ExecutionContext`, `ArgumentsHost`, and `createParamDecorator`. Global registration uses `APP_GUARD`, `APP_PIPE`, `APP_INTERCEPTOR`, and `APP_FILTER`.


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

### NEST-053 — forRoutes, exclude, and the global prefix

**Difficulty:** Senior

**Category:** Middleware

**Question:**

`configure` applies `RequestIdMiddleware` to `OrdersController`, excludes `GET health`, and bootstrap calls `app.setGlobalPrefix('api')` before `listen()`. Which requests run the middleware?

**Answer:**

`configure` runs once during `init()`, while Nest is binding middleware, not on the first request. `forRoutes(OrdersController)` takes the paths that controller declares. With the prefix already set, those become paths such as `GET /api/orders` and `GET /api/orders/:id`, and only those run this middleware. `GET /api/health` was never one of those paths, so excluding `health` changes nothing. In 10.4.15 the path extractor copies the global prefix that is already on the config when `init()` builds it. Calling `setGlobalPrefix` after `init()` is too late for that copy.

**Trade-offs:**

Passing the controller class keeps middleware aligned with the routes that class declares. A string path is better when one URL prefix is shared by several controllers.

**Follow-up:**

`configure` is `async` and awaits a remote call before `apply`. When does that run?

Answer: It runs during `init()`, before the process accepts connections. Nest awaits an async `configure`. A slow or failing call delays or fails startup, rather than the first request.

### NEST-054 — app.use and the JSON parser

**Difficulty:** Senior

**Category:** Middleware

**Question:**

After `create(AppModule)`, bootstrap does `app.use(logger)` then `listen(3000)`. `logger` reads `req.body` and always sees `undefined` for a JSON `POST`, while middleware registered in `configure()` sees the body. Why?

**Answer:**

`NestFactory.create()` returns before `init()`. The JSON and urlencoded parsers are registered inside `init()`, unless you passed `bodyParser: false`. Module middleware from `configure()` is registered after those parsers, and routes come after that. An `app.use` call made before `listen()` is appended to Express immediately, so this logger sits above the parsers. The body has not been read yet, and `req.body` is still unset. Middleware from `configure()` sits below the parsers, so it sees the parsed object.

**Trade-offs:**

An early `app.use` is the right place to wrap the raw stack, including unmatched routes, when you do not need the body. Prefer `configure`, or `app.use` placed with the parsers already installed, when the body matters.

**Follow-up:**

`logger` is registered after a manual `await app.init()`, then `listen()`. Does it see `req.body`?

Answer: `listen()` skips a second `init()`, and this `app.use` is appended after the parsers, the module middleware, and the routes. A normal Nest route writes the response and does not call `next()`, so the logger usually never runs for a handled request. If an earlier layer does call `next()`, `req.body` is already parsed.

### NEST-055 — Order when several modules bind middleware

**Difficulty:** Senior

**Category:** Middleware

**Question:**

`AppModule` imports `BillingModule`. Both call `configure` with `forRoutes('*')`. Which `use` runs first, and what decides the order inside one `apply()`?

**Answer:**

Inside a single `apply(First, Second)`, Express runs `First` and then `Second`. That order is just the order you passed. Across modules, NestJS 10.4.15 registers middleware by module distance, smallest distance first. Distance starts at 0 on the root module. Each import is given the larger of its current distance and one more than its parent's distance. The root module's middleware is therefore registered before a feature module imported underneath it, and it runs first on the request.

**Trade-offs:**

One module with a deliberate `apply` order is easy to read. Distance order is predictable, root then features, and it surprises people when a shared module is imported deep in the graph and therefore runs late.

**Follow-up:**

`BillingModule` is imported by the root and also three levels deeper. Which distance wins?

Answer: The larger one. The scanner only raises a module's distance, so the deep import is the distance that is kept, and that middleware is registered later.

### NEST-056 — Which filters see an exception thrown in middleware

**Difficulty:** Senior

**Category:** Middleware

**Question:**

`AuthMiddleware.use` throws `UnauthorizedException`. The route has `@UseFilters(OrdersExceptionFilter)` and a global filter exists. Which filter writes the response? What if the same throw is in `app.use`?

**Answer:**

Class middleware is wrapped so that a throw, or a rejected async `use`, is passed to an exceptions handler. That handler is created with no module key, which means it only has the global filter list. The method filter and the controller filter are attached to the route proxy, and this request has not reached that proxy, so `OrdersExceptionFilter` does not run. A throw from `app.use` takes the same kind of path: Nest's Express error handler, again with the global list only.

**Trade-offs:**

Throwing an `HttpException` from consumer middleware reuses the global filter's response shape. Calling `res.status(401).json(...)` yourself ends the response and skips filters entirely.

**Follow-up:**

Middleware calls `next(new UnauthorizedException())` instead of throwing. Does `OrdersExceptionFilter` run?

Answer: No. `next(err)` enters the Express error handler, which uses the global filter list. Method filters are not selected for that error.

### NEST-057 — What canActivate is allowed to return

**Difficulty:** Intermediate

**Category:** Guards

**Question:**

`canActivate` may return a `boolean`, a `Promise<boolean>`, or an `Observable<boolean>`. What does Nest do with each, and when do interceptors and pipes start?

**Answer:**

Guards run after middleware and before interceptors. Nest turns every return value into one boolean decision. A plain boolean is used as it is. A Promise is awaited. An Observable is consumed with `lastValueFrom`, so it must complete, and the last value is the decision. Interceptors start only after every guard has produced a truthy result, and pipes start after those interceptors call `next.handle()`. The first non-true result stops the chain, and later guards are not called.

**Trade-offs:**

A Promise fits a store lookup. An Observable fits a stream you already have. A synchronous boolean is the simplest choice when the decision needs no I/O.

**Follow-up:**

`canActivate` returns `Promise.resolve(false)`. Do later guards run?

Answer: No. Nest throws `ForbiddenException` with the message `Forbidden resource`, and it does not call the later guards.

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

### NEST-059 — Several guards on one route

**Difficulty:** Senior

**Category:** Guards

**Question:**

`APP_GUARD` is `AuthGuard`. The controller has `@UseGuards(RolesGuard, AuditGuard)`. The method has `@UseGuards(FeatureGuard)`. All of them return `true`. What is the order? If `RolesGuard` returns `false`, which guards still run?

**Answer:**

Nest runs global guards, then controller guards, then method guards. Inside one `@UseGuards()` list, it keeps the order you wrote. This route is therefore Auth, then Roles, then Audit, then Feature. A guard that returns a non-true value stops the chain immediately. If `RolesGuard` returns `false`, `AuditGuard` and `FeatureGuard` are never called, and Nest throws `ForbiddenException`. Later guards are not a place to record that denial.

**Trade-offs:**

Small guards stay easy to test, and the short-circuit order stays visible. One large guard hides that order. A controller guard applies to every method on that controller.

**Follow-up:**

`AuditGuard` must record Roles denials, but it never runs after `false`. Where do you record them?

Answer: Record the denial inside `RolesGuard` before it returns `false`, or throw and record it in an exception filter. A later guard is not a denial hook.

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

### NEST-061 — ExecutionContext and ArgumentsHost

**Difficulty:** Senior

**Category:** Execution context

**Question:**

A guard, an interceptor, and an exception filter all need the Express request. The guard also needs the handler. What does each one receive, and which methods are valid?

**Answer:**

An exception filter receives an `ArgumentsHost`. That host can `getArgs()`, report `getType()`, and switch to HTTP, RPC, or WebSockets. On HTTP, `getRequest()`, `getResponse()`, and `getNext()` are arguments 0, 1, and 2. A guard and an interceptor receive an `ExecutionContext`, which is that same host plus `getClass()` and `getHandler()`. Those two methods are how you read route metadata. A filter's host often has a null handler and a null class, because the filter is not always attached to a method.

**Trade-offs:**

A helper written against `ArgumentsHost` can read the request from both filters and guards. A helper that reads metadata should require an `ExecutionContext`, because a filter host may not have a handler.

**Follow-up:**

`Reflector.get('roles', context.getHandler())` when `@Roles()` is only on the class. What do you get?

Answer: `undefined`. Class metadata lives on `getClass()`. Read both targets and decide whether the method overrides the class or merges with it, as in NEST-062.

### NEST-062 — Role metadata on the method and on the class

**Difficulty:** Senior

**Category:** Guards

**Question:**

The class has `@Roles('admin')`. One method has `@Roles('billing')`. Another method has no `@Roles()`. How should `RolesGuard` resolve the roles, and how should a missing user differ from a wrong role?

**Answer:**

`Reflector.getAllAndOverride('roles', [handler, class])` walks those two targets and returns the first value that is not `undefined`. The billing method therefore uses `['billing']`, and the undecorated method falls back to the class list `['admin']`. Treat a missing or unauthenticated user as 401. Treat an authenticated user who lacks the required role as 403, and throw that exception yourself. A bare `return false` is always 403, so it cannot express the 401 case.

**Trade-offs:**

`SetMetadata` and a small `createDecorator` helper are the same storage mechanism. Override means the method replaces the class. Merge means the method adds to the class. Pick the one the product rule actually wants.

**Follow-up:**

The method has `@Roles('billing')` and the class has `@Roles('admin', 'billing')`. You switch to `getAllAndMerge`. What is checked?

Answer: The concatenated arrays, handler first and then class. A user who has only `admin` can pass a `some` check. Override would have required `billing` and blocked that user.

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

### NEST-064 — An interceptor that never calls next.handle

**Difficulty:** Intermediate

**Category:** Interceptors

**Question:**

A `CacheInterceptor` on a `GET` returns `of(cached)` on a hit and does not call `next.handle()`. On a miss it calls `next.handle()`, stores the result, and returns it. What runs on a hit?

**Answer:**

Middleware and guards have already finished before any interceptor runs. On a hit, this interceptor returns a cached observable and never calls `next.handle()`, so everything inside that call is skipped: later interceptors, pipes, and the controller. The database is not touched. Interceptors wrapped outside this one still run. If they called `next.handle()`, they see the cached value on the way back out, because that value is what this interceptor emitted.

**Trade-offs:**

The short-circuit also skips parameter validation on the hit. That is acceptable when the cache key came from a request you already validated.

**Follow-up:**

The cache interceptor is global, and a controller interceptor logs `in` before its own `next.handle()`. On a hit, does `in` appear?

Answer: No, when the global interceptor returns `of(cached)` without calling `next.handle()`. The controller interceptor never starts. Bind the log outside the cache interceptor if you still need that line.

### NEST-065 — catchError and the exception filter

**Difficulty:** Senior

**Category:** Interceptors

**Question:**

The handler throws `NotFoundException`. An interceptor's `catchError` either returns `of({ missing: true })` or `throwError(() => err)`. The method has `@Catch(NotFoundException)`. Which choice runs the filter, and what does the client get?

**Answer:**

`next.handle()` is an observable, and a throw from the handler is an error notification on that observable. `map` ignores errors, so it never sees this throw. `catchError` does. Returning `of({ missing: true })` turns the error into a successful value. The client typically gets 200 and that object, and the exception filter does not run. Returning `throwError` keeps the error on the stream. The method filter then matches `NotFoundException` and writes its own response.

**Trade-offs:**

Recovering with `of` hides the failure from filters and from HTTP error monitoring. Rethrowing keeps the error contract in the filter, which is usually where the status and body are owned.

**Follow-up:**

The interceptor rethrows, and the method filter only logs. What does the client receive?

Answer: Whatever that filter writes. If it never calls `reply` or `json`, the response stays unfinished. Log in `catchError` and write the body in the filter when both are required.

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

### NEST-067 — DefaultValuePipe and ParseIntPipe

**Difficulty:** Intermediate

**Category:** Pipes

**Question:**

The parameter is `@Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number`. What does the handler receive when `page` is missing, when it is `4`, and when it is `4abc`? What changes if the two pipes are swapped?

**Answer:**

Pipes on one parameter run from left to right, and each pipe receives the previous pipe's return value. A missing query parameter arrives as `undefined`. `DefaultValuePipe` replaces only `null` and `undefined`, so it supplies `1`, and `ParseIntPipe` turns that into the number `1`. `page=4` is already a string `'4'`, and `ParseIntPipe` returns `4`. `page=4abc` is not an integer, so `ParseIntPipe` throws `BadRequestException`. Swap the pipes and the missing value hits `ParseIntPipe` while it is still `undefined`, so the request is 400 and the default never runs.

**Trade-offs:**

This pair is a good fit for one query field. A query with several fields belongs in a DTO validated by `ValidationPipe`.

**Follow-up:**

The query is `page=` , an empty string. What does the handler receive?

Answer: The handler does not run, because the request fails with 400. `DefaultValuePipe` keeps the empty string, `ParseIntPipe` rejects it, and a custom pipe is required if an empty string should become the default.

### NEST-068 — A pipe that throws

**Difficulty:** Senior

**Category:** Pipes

**Question:**

`ParseIntPipe` throws `BadRequestException`. The route has a guard, an interceptor with `catchError`, a method `@Catch(BadRequestException)`, and a global `@Catch()`. What has already run, and which filter writes the response if the interceptor rethrows?

**Answer:**

Middleware, the guard, and the interceptor code before `next.handle()` have already run. Argument pipes run inside that `next.handle()`, so the throw happens on the observable the interceptor is watching, and the controller method has not started. The interceptor's `catchError` therefore sees the `BadRequestException`. If it rethrows, Nest picks a filter from the method outward. The method filter matches this exception and is the one that writes. The handler log never runs.

**Trade-offs:**

Changing the status inside `catchError` is convenient when every route should share one recovery. A filter keeps the HTTP error body in one place, which is usually better for a shared `BadRequest` shape.

**Follow-up:**

The same exception is thrown from the controller body instead. Does the interceptor still see it before the method filter?

Answer: Yes. The method body runs inside `next.handle()`, so `catchError` still sees the error before the filter. The difference is that lines above the throw in the method have already run.

### NEST-069 — When a custom parameter decorator runs

**Difficulty:** Senior

**Category:** Execution context

**Question:**

`@CurrentUser()` is built with `createParamDecorator` and reads `request.user`, which a guard set. A pipe is also declared on that parameter. When does the factory run, relative to the guard, the interceptor, the pipe, and the handler?

**Answer:**

The factory runs while Nest is resolving handler arguments, which happens inside `next.handle()`. By then middleware, guards, and the inbound interceptor code have finished. The factory's return value is then passed through the pipes on that parameter, and the handler receives whatever the last pipe returns. So the order for this value is: guard sets `request.user`, interceptor calls `next.handle()`, factory reads it, pipes transform it, handler runs. The factory is an extractor. It is not a second guard.

**Trade-offs:**

A custom decorator keeps `@Req()` out of handlers that only need one field. Raw `@Req()` is clearer when the handler needs many fields from the request.

**Follow-up:**

There is no auth guard, and an interceptor sets `request.user` inside an outbound `map`. What does `@CurrentUser()` see?

Answer: Whatever was already on the request, usually `undefined`. The factory runs before the outbound `map`. Set the user in middleware or in a guard.

### NEST-070 — Who writes the HTTP response

**Difficulty:** Senior

**Category:** Lifecycle

**Question:**

One `POST` returns `{ id: '1' }` and does not use `@Res()`. Another uses `@Res()` and calls `res.json(...)`. A third uses `@Res({ passthrough: true })`. Who writes the body in each case, and when is the status chosen?

**Answer:**

After the guards succeed, Nest sets the default status before interceptors run. A `POST` is 201, other successful methods are 200, and `@HttpCode()` replaces that default. If the handler returns a value and does not take over the response, Nest sends that value after the outbound interceptors. A bare `@Res()` means you own the response: Nest will not send the return value. `@Res({ passthrough: true })` lets you touch `res`, and Nest still sends the returned value.

**Trade-offs:**

Returning a value keeps filters, interceptors, and `@HttpCode()` on one path. A bare `@Res()` fits a stream or a download that you pipe yourself.

**Follow-up:**

An `@Sse()` handler returns `Promise.resolve({ data: 'ready' })`. What is the result?

Answer: After the promise settles, SSE still requires an Observable. A plain object throws a `ReferenceError` saying the handler must return an Observable stream.

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

### NEST-072 — The default exceptions handler

**Difficulty:** Senior

**Category:** Exception filters

**Question:**

No custom filter matches. What does the client receive for `NotFoundException`, for `new Error('disk full')`, and for a JSON-parser `SyntaxError`? What happens if the headers were already sent?

**Answer:**

`BaseExceptionFilter` is the fallback when no custom `@Catch()` matches. For an `HttpException` it sends `getStatus()` and `getResponse()` as they are, so a default `NotFoundException` is 404 with the Not Found body. An unknown `Error` becomes 500 with `{ statusCode: 500, message: 'Internal server error' }`, and the original message stays in the server log. A JSON parser `SyntaxError` usually has both a status code and a message, so the filter replies 400. If headers were already sent, the filter skips `reply`, ends the response, and still logs.

**Trade-offs:**

The built-in filter is enough for a generic 500. Add an `APP_FILTER` when every 500 must also carry a request id.

**Follow-up:**

The handler uses `@Res()`, writes `res.json({ accepted: true })`, and then throws `Error('later')`. What does the client see?

Answer: `{ accepted: true }`. The base filter sees that headers were sent and ends the response without a second JSON error body.

### NEST-073 — The same lifecycle on the Fastify adapter

**Difficulty:** Senior

**Category:** Platform

**Question:**

The app uses `FastifyAdapter`. Guards, interceptors, pipes, and filters are unchanged. What stays the same, and what breaks in a filter that calls `response.status(401).json(...)`?

**Answer:**

The Nest pipeline stays the same. Middleware, guards, interceptors, pipes, the handler, and filters still run in the same order, and `getHandler()` and `getClass()` still work. What changes is the object behind `getResponse()`. Fastify's reply is not Express's `res`, so `response.status(401).json(...)` is an Express call and fails or does nothing useful on Fastify. Write through `HttpAdapterHost.httpAdapter.reply(...)`, or call the Fastify reply methods. Fields that exist only on the Express request need the same kind of adapter.

**Trade-offs:**

Express is the familiar choice when you want `res` and Express middleware. Fastify keeps the Nest lifecycle and requires every response write to go through the adapter or Fastify's own reply.

**Follow-up:**

A guard reads `request.headers.authorization` through `switchToHttp().getRequest()`. Do you rewrite that for Fastify?

Answer: Usually no. Fastify's request has `headers` too. Rewrite only fields that are Express-specific, and keep the `CanActivate` return contract the same.

### NEST-074 — Read the log when a pipe fails

**Difficulty:** Advanced

**Category:** Lifecycle

**Question:**

`GET /orders?page=nope` has trace logs in middleware, a guard, and an interceptor (`map` plus `catchError` that rethrows). The method has `@Catch(BadRequestException)`, a global filter has `@Catch()`, and `page` uses `ParseIntPipe`. Which logs appear, in what order, and what status is returned?

**Answer:**

The request gets as far as argument binding and then fails. The log order is `middleware`, `guard`, `interceptor-in`, `interceptor-error`, and `method-filter`. `ParseIntPipe` throws `BadRequestException` inside `next.handle()`, so the handler never logs and the outbound `map` never logs. The interceptor rethrows, and the method filter matches, so the global filter does not run. The client receives the pipe's 400 body, written by that method filter's `reply`.

**Trade-offs:**

Layer logs are useful while you are confirming the real order. In production, keep a request id on the request and drop the permanent `console.log` on every layer.

**Follow-up:**

The same route is called with `page=2`. What are the logs and the body?

Answer: The logs are `middleware`, `guard`, `interceptor-in`, `handler`, and `interceptor-out`. No filter runs. The body is `{ page: 2 }` and the status is 200.

### NEST-075 — Choosing the layer

**Difficulty:** Advanced

**Category:** Lifecycle

**Question:**

You need to stamp `x-request-id`, reject a missing `Authorization` header with 401, require `@Roles('billing')` on `POST /orders`, coerce `?page` or return 400, and turn an unhandled `Error` into a generic 500. Which layer owns each job, and why not one interceptor for all five?

**Answer:**

Put the request id in middleware, because that work does not need the handler. Put authentication and roles in guards, because a guard can return 401 or 403 and can read handler metadata through `ExecutionContext`. Put page coercion in a pipe, because pipes own one argument. Put the unknown-error 500 in an exception filter, because filters own the error response. One interceptor cannot cover this. It does not see failures that happen in middleware, it runs too late to replace the auth short-circuit, it is a poor place to bind one parameter, and swallowing errors there hides the filter's contract.

**Trade-offs:**

Auth and roles can live in one guard when 401 and 403 stay explicit. Splitting them matches the short-circuit order: identity first, then the role.

**Follow-up:**

Success bodies should be `{ data, requestId }`, and errors should include `requestId` too. Which layers do that, and what must the middleware do?

Answer: An interceptor `map` wraps the success body. A global filter adds the id to errors. Middleware must store the id on the request, and usually set the response header, so both of those layers can read the same value.

### NEST-076 — What switchToHttp attaches to the host

**Difficulty:** Senior

**Category:** Execution context

**Question:**

A guard calls `context.switchToHttp()` and then `context.switchToRpc()`. On an HTTP route, what do `getRequest()`, `getData()`, and `getType()` return, and did either call change the transport?

**Answer:**

`switchToHttp()` does not change the transport. It attaches HTTP accessors to the same host, where arguments 0, 1, and 2 are the request, the response, and `next`. `getType()` stays `'http'` because the route really is HTTP. `getData()` is an RPC accessor. It is meaningful after `switchToRpc()`, and it is not the HTTP body. Switching the host to another adapter only changes which getters you are using. It does not retarget the request onto another transport.

**Trade-offs:**

`switchToHttp().getRequest()` is clearer than `getArgByIndex(0)` in a helper shared by several enhancers. The index form is easy to get wrong when the argument list changes.

**Follow-up:**

A filter's `catch` host is `new ExecutionContextHost([req, res, next])`. What does `getResponse()` return?

Answer: The Express response, which is argument 1. `getHandler()` and `getClass()` are null, and `getType()` defaults to `'http'`.

### NEST-077 — Status written through getResponse

**Difficulty:** Senior

**Category:** Execution context

**Question:**

`POST /orders` has no `@HttpCode()`. A guard sets `getResponse().status(202)`. In a second version, an interceptor sets 202 before `next.handle()`. The handler returns `{ id: '1' }`. What status does the client get in each case?

**Answer:**

After the guards succeed, Nest applies the route's default status. A `POST` with no `@HttpCode()` is 201, and that assignment overwrites the 202 the guard just set. Interceptors run after that assignment. An interceptor that sets 202 before `next.handle()`, or inside `map` before Nest replies, writes onto the response object that `reply` later uses. The guard version therefore ends as 201. The interceptor version ends as 202.

**Trade-offs:**

Use `@HttpCode(202)` when the status is fixed for the route. Set `res.status` in an interceptor when the status depends on something you only know at runtime.

**Follow-up:**

The interceptor sets 202 inside `map`, after the handler has returned. Is the status still 202?

Answer: Yes. `map` runs before Nest replies, and the status on the response object is the one that is sent.

### NEST-078 — getNext and the Nest pipeline

**Difficulty:** Senior

**Category:** Execution context

**Question:**

A guard calls `context.switchToHttp().getNext()` and then returns `true`. What did that call continue, and what continues Nest's path from the guard to the interceptors?

**Answer:**

`getNext()` is Express `next`. Calling it continues the next Express layer. It does not move Nest from `canActivate` to interceptors. Nest continues on its own: it awaits every guard, sets the route status, and then calls the interceptor chain. A guard should return a boolean, a Promise, or an Observable, and leave Express `next()` to middleware. Calling both continues two pipelines for one request.

**Trade-offs:**

Middleware owns `next()`. Guards own the boolean result. Mixing them duplicates the continuation and can race the route proxy.

**Follow-up:**

The handler takes `@Next() next` and calls `next()` without writing a body. What happens to the return value?

Answer: A bare `@Next()` marks the response as handled, so Nest does not send the return value. Express continues, and the client receives whatever a later layer writes.

### NEST-079 — A parameter decorator that returns false

**Difficulty:** Senior

**Category:** Execution context

**Question:**

The `@CurrentUser()` factory returns `false` when `request.user` is missing. There is no guard. Does the handler run, and what argument does it receive?

**Answer:**

The handler runs, and the argument is `false`. A parameter factory extracts a value. It does not authorize the request. `false` is an ordinary value, and any pipes on that parameter see `false` too. The handler is stopped from inside argument resolution only when the factory throws, for example an `UnauthorizedException`. Returning `false` here does not mean what `canActivate` returning `false` means.

**Trade-offs:**

Throw from the factory when a missing user must stop the route. Return a value when the handler is allowed to decide what that value means.

**Follow-up:**

The factory throws `UnauthorizedException` instead. Which stages have already finished?

Answer: Middleware, guards, and the inbound interceptor code have finished. The pipes for that argument and the handler have not started. An interceptor `catchError` can still see the error.

### NEST-080 — The data argument of createParamDecorator

**Difficulty:** Intermediate

**Category:** Execution context

**Question:**

Compare `@CurrentUser('email')` with `@CurrentUser(ParseIntPipe)`. What is `data` inside the factory, and which of those two registers a pipe?

**Answer:**

`createParamDecorator` looks at each extra argument and asks whether it is a pipe. A class or object with a `transform` method is added to that parameter's pipe list. Anything else is passed to the factory as `data`. The string `'email'` is data, so the factory is called as `factory('email', ctx)` and that argument adds no pipe. `ParseIntPipe` is a pipe, so it is registered and `data` is `undefined`. The factory's return value is what that pipe then receives.

**Trade-offs:**

A dedicated decorator per field is easier to type. One decorator plus `data` is better when many fields share one lookup. Put pipes in the pipe position, not in `data`.

**Follow-up:**

The parameter is `@CurrentUser('email', ParseIntPipe)` and the email is `'ada@example.com'`. What does `ParseIntPipe` see?

Answer: The email string. `data` selects the field, and `ParseIntPipe` then runs on that string and throws `BadRequestException`. The handler does not run.

### NEST-081 — A parameter factory that returns a Promise

**Difficulty:** Senior

**Category:** Execution context

**Question:**

A `createParamDecorator` factory is `async` and resolves to `{ id: '1' }`. What does the handler receive when there are no pipes, and when a no-op global pipe is present? What happens if the promise rejects?

**Answer:**

Nest awaits the factory while it is building the argument. The handler receives `{ id: '1' }` whether or not a pass-through pipe is also attached, because the pipe runs on the resolved value. If the promise rejects, argument resolution rejects. The handler does not run, and the error is visible to an interceptor's `catchError` and to the exception filters. An async factory is still just an extractor. It runs after guards and inside `next.handle()`.

**Trade-offs:**

An async factory loads data during argument binding. Prefer middleware or a guard when many layers need the same identity, so you do not repeat that lookup inside the parameter.

**Follow-up:**

The factory rejects with `UnauthorizedException` and there is no pipe. Does the handler run?

Answer: No. `Promise.all` over the parameters rejects, so the handler is skipped. `catchError` and the filters can see the error without any pipe being involved.

### NEST-082 — How Nest wraps the handler return for map

**Difficulty:** Senior

**Category:** Interceptors

**Question:**

An interceptor does `next.handle().pipe(map(data => ({ data })))`. Three handlers return `{ ok: true }`, `Promise.resolve({ ok: true })`, and `of({ ok: true })`. What does `map` see, and what does the client receive?

**Answer:**

`next.handle()` is always an Observable, even when the handler did not return one. Nest wraps a plain value and a Promise so that `map` receives the settled value. In all three cases `map` sees `{ ok: true }`, and the client receives `{ data: { ok: true } }`. A returned Observable is flattened, and its emissions are what `map` sees. You do not need to return `of(...)` yourself unless you are actually streaming.

**Trade-offs:**

Returning `of(...)` for a single HTTP body adds nothing Nest does not already wrap. Return an Observable when the handler really streams more than one value.

**Follow-up:**

The handler observable emits `{ n: 1 }`, then `{ n: 2 }`, then completes. What body is written?

Answer: `{ data: { n: 2 } }`. Nest uses `lastValueFrom`, which keeps the last emission. An observable that completes with no emission rejects, and that rejection takes the exception path.

### NEST-083 — What intercept itself must return

**Difficulty:** Senior

**Category:** Interceptors

**Question:**

Three versions of `intercept`: `return { cached: true }` with no `next.handle()`; `return Promise.resolve(next.handle())`; and `return next.handle().pipe(map(...))`. Which of these satisfy NestJS 10.4.15, and what happens to the plain object?

**Answer:**

`intercept` must return an Observable, or a Promise that resolves to an Observable. The `pipe(map(...))` form is the normal one. `Promise.resolve(next.handle())` is also valid, and the handler still runs because that observable is subscribed later. A plain `{ cached: true }` is not an observable, so the interceptor consumer cannot merge it and the pipeline breaks. A cache hit should `return of(cached)`. Await any I/O you need, then return either `next.handle()` or `of(...)`.

**Trade-offs:**

Awaiting a cache lookup and then returning `next.handle()` keeps the method async and still legal. Returning the cached body as a plain object looks similar and is rejected by the pipeline.

**Follow-up:**

`async intercept` awaits the cache and then `return next.handle()`. Is that valid?

Answer: Yes. The return type is `Promise<Observable<...>>`, which Nest accepts. The handler runs only if that return is actually executed after the await.

### NEST-084 — Where catchError sits relative to map

**Difficulty:** Senior

**Category:** Interceptors

**Question:**

The handler throws `NotFoundException`. Pipe A is `map` and then `catchError`. Pipe B is `catchError` returning `of({ missing: true })` and then `map` wrapping `{ data }`. What does each `map` see, and which pipe can still reach `@Catch(NotFoundException)`?

**Answer:**

`map` only sees next notifications. An error skips it. In pipe A, `map` is skipped, `catchError` runs, and a rethrow still reaches the method filter. In pipe B, `catchError` turns the error into `{ missing: true }` before `map` runs, so `map` sees that object and the client receives `{ data: { missing: true } }`. The filter never runs, because the stream is successful again. Operator order is the whole decision.

**Trade-offs:**

`catchError` before `map` lets you wrap a recovered body in the same envelope as a success. `catchError` after `map`, rethrowing, keeps the original error for the filter.

**Follow-up:**

`map` throws `BadRequestException` when the value is `{ ok: false }`, and a later `catchError` rethrows. What does the filter see?

Answer: `BadRequestException`. The handler itself succeeded. A method filter written as `@Catch(NotFoundException)` does not match this error.

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

### NEST-086 — Two APP_INTERCEPTOR registrations

**Difficulty:** Senior

**Category:** Interceptors

**Question:**

`AppModule` registers an `APP_INTERCEPTOR` for logging. Imported `AuditModule` registers one for audit. Bootstrap calls `useGlobalInterceptors(new TimingInterceptor())`. What is the inbound order? If all three call `next.handle()` and `map`, what does Audit's `map` see?

**Answer:**

In NestJS 10.4 the root module's providers are recorded before the providers of modules it imports, because the root is inserted into the module map first. `useGlobalInterceptors` appends Timing after both of those. The inbound order is Logging, then Audit, then Timing, then the handler. Outbound `map` operators run in reverse, so Timing's `map` sees the handler value first. Audit's `map` sees whatever Timing's `map` returned, not the raw handler value.

**Trade-offs:**

One interceptor with ordered steps is easier to follow. Separate `APP_INTERCEPTOR` registrations make sense when each module owns its own concern, and then the scan order becomes part of the contract.

**Follow-up:**

Both interceptors are in `AppModule.providers`, audit first and logging second, with no `useGlobalInterceptors`. Whose `map` sees `{ ok: true }` first?

Answer: `LoggingInterceptor`. The later registration is the inner one on the way in, so its `map` is the first on the way out.

### NEST-087 — Functional middleware and class middleware

**Difficulty:** Senior

**Category:** Middleware

**Question:**

`apply` receives both `requestIdMiddleware`, a function, and `RequestIdMiddleware`, a class whose constructor needs injection. How does Nest register each, and which one gets the injector?

**Answer:**

A plain function stays a function. Nest wraps it and registers it as middleware, and there is no constructor to inject into. A class, or a function whose name starts with a capital letter and that has a `use` method, is treated as class middleware. Nest constructs that one from the middleware injector of the module that called `apply`, so constructor dependencies are resolved. Only the class form receives those dependencies. The function form can still close over a service that `configure` itself injected.

**Trade-offs:**

Closing over a service from `configure` is enough for a small function. A class is easier to read when `use` needs several dependencies.

**Follow-up:**

When is a new instance created for request-scoped class middleware?

Answer: When that middleware runs for a request, not when `configure` is called. The function form has no Nest scope at all.

### NEST-088 — Why middleware has no ExecutionContext

**Difficulty:** Senior

**Category:** Middleware

**Question:**

`use` wants to call `Reflector.get('roles', handler)`. Why is there no `ExecutionContext` and no `getHandler()`, and what is in the host if `use` throws?

**Answer:**

Middleware is Express `(req, res, next)`. It runs before the route proxy, and the route proxy is the layer that knows which controller method was selected. On the success path Nest never builds a full handler context for middleware, so there is nothing for `getHandler()` to return. If `use` throws, the catch host is typically `[req, res, next]`. HTTP accessors work on that host. `getHandler()` and `getClass()` are null, so `Reflector` cannot read route roles from it.

**Trade-offs:**

You can build an `ExecutionContextHost` yourself and still have no handler to put in it. A guard is the layer that has both the request and the method.

**Follow-up:**

On `forRoutes(OrdersController)` for `orders/:id`, is `req.params.id` the same thing as `getHandler()`?

Answer: `req.params.id` is the URL value Express parsed, and `getHandler()` is the method reference used to read metadata. A guard can read both.

### NEST-089 — A service inside class middleware

**Difficulty:** Intermediate

**Category:** Middleware

**Question:**

`RequestIdMiddleware` injects `IdService`, which is exported by `CoreModule`. `OrdersModule.configure` applies the middleware. What must `OrdersModule` import, and what does `use` still not have?

**Answer:**

`OrdersModule` must import `CoreModule`, so the module that calls `configure` can see `IdService` in its injector. `apply(RequestIdMiddleware)` is what mounts the class and causes Nest to construct it. Listing the class only in `providers` does not attach it to any route. Constructor injection still does not supply an `ExecutionContext` or the handler. `use` can call `IdService`, and it still cannot read `@Roles()` metadata.

**Trade-offs:**

Inject loggers and id generators freely. `Reflector` without a handler still cannot read the roles declared on the route.

**Follow-up:**

`IdService.next` throws `ServiceUnavailableException`. Which filters write the response?

Answer: Global filters, or the default exception handler if no global filter matches. Controller and method filters on the route are not used for the middleware proxy.

### NEST-090 — @Catch walks for the first match

**Difficulty:** Senior

**Category:** Exception filters

**Question:**

`@UseFilters(BroadFilter, NarrowFilter)`: Broad is `@Catch(HttpException)` and Narrow is `@Catch(NotFoundException)`. The handler throws `NotFoundException`. Which filter runs, and why is the more specific class not chosen automatically?

**Answer:**

`@Catch()` matches with `instanceof`. An empty list matches everything. Nest does not pick the most specific subclass. It walks the filter list from the method end and stops at the first match. The metadata order `[Broad, Narrow]` is searched as `[Narrow, Broad]`, so `NarrowFilter` runs for `NotFoundException`. If Broad were tried first, its `@Catch(HttpException)` would also match `NotFoundException`, because `NotFoundException` extends `HttpException`, and Broad would win. The order you wrote decides the winner.

**Trade-offs:**

One `@Catch(HttpException)` that branches on status avoids this trap. Two filters are fine when the `@UseFilters` order is deliberate.

**Follow-up:**

You add a controller filter `@Catch(NotFoundException)`. The method still lists Broad then Narrow. Which one runs?

Answer: `NarrowFilter`. Method filters are considered before controller filters, Narrow matches, and the walk stops.

### NEST-091 — @Catch() and @Catch(Error)

**Difficulty:** Senior

**Category:** Exception filters

**Question:**

The method filter is `@Catch(Error)` and the global filter is `@Catch()`. The handler throws `NotFoundException`, then `new Error('disk full')`, then the string `'disk full'`. Which filter runs for each?

**Answer:**

The method filter is tried first. `NotFoundException` is an `Error`, so the method filter matches. A plain `Error` matches it too. The string `'disk full'` is not `instanceof Error`, so the method filter skips it and the global `@Catch()` matches, because an empty catch list accepts every value. A method filter that then calls `HttpException` methods on a plain `Error` can throw again inside `catch`. Check the type before you call `getStatus()` or `getResponse()`.

**Trade-offs:**

A method `@Catch()` with no arguments owns every throw from that route, including strings. `@Catch(HttpException)` leaves unknown values for the global filter or the base filter.

**Follow-up:**

The only custom filter is a global `@Catch(HttpException)`, and the code throws the string `'disk full'`. What runs?

Answer: No custom filter matches, so `BaseExceptionFilter` runs and the client receives the generic 500 body.

### NEST-092 — @UseFilters list order

**Difficulty:** Intermediate

**Category:** Exception filters

**Question:**

The only binding is `@UseFilters(AlphaFilter, BetaFilter)`. Alpha is `@Catch(BadRequestException)` and Beta is `@Catch()`. The handler throws `BadRequestException`. Which filter runs?

**Answer:**

Nest searches the method list from the end, so `[Alpha, Beta]` is tried as Beta and then Alpha. Beta's empty `@Catch()` matches every value, including this `BadRequestException`, so Beta runs and Alpha is never called. Alpha being "more specific" does not matter. Specificity is not the selection rule. If you want Alpha to see `BadRequestException`, it has to be the filter that the walk reaches first, which means it has to sit at the end of the `@UseFilters` list.

**Trade-offs:**

One filter that branches with `instanceof` makes the order obvious. Two filters require you to remember that a catch-all listed last in `@UseFilters` is actually tried first.

**Follow-up:**

A global `@Catch()` is added as well. The method list is still Alpha, then Beta with `@Catch()`. Which one runs?

Answer: Beta. The reversed method pair is still considered before the global filter, and Beta matches and stops the walk.

### NEST-093 — HttpException getResponse as the body

**Difficulty:** Senior

**Category:** Exception filters

**Question:**

No custom filter is registered. What JSON is sent for `new NotFoundException()`, for `new HttpException('missing', 404)`, and for `new HttpException({ error: 'missing' }, 404)`?

**Answer:**

The base filter uses `getStatus()` for the status and `getResponse()` for the body. A default `NotFoundException` already stores an object, so the client receives `{ statusCode: 404, message: 'Not Found' }`. When `getResponse()` is a string, the filter wraps it as `{ statusCode, message }` with that string and the exception's status. When `getResponse()` is an object, that object is the body. `new HttpException({ error: 'missing' }, 404)` is sent as `{ error: 'missing' }` with status 404. The object you passed is the contract.

**Trade-offs:**

Built-in subclasses keep controller code small and the body consistent. Pass your own object when the API body is not `{ statusCode, message }`.

**Follow-up:**

Your filter always sends `{ statusCode, message: exception.message }`. What is lost for an object response?

Answer: Fields such as `error` that lived on `getResponse()`. Send `getResponse()` when the throw site chose the body.

### NEST-094 — Unknown errors and the http-errors shape

**Difficulty:** Senior

**Category:** Exception filters

**Question:**

What does `BaseExceptionFilter` do with `new Error('disk full')`, with `{ statusCode: 400, message: 'bad query' }`, and with `{ statusCode: 400 }`? Include status, body, and logging.

**Answer:**

A plain `Error` is an unknown exception. The client gets 500 and the generic internal-error body, and the message and stack are logged on the server. An object is treated as an HTTP error only when both `statusCode` and `message` are truthy. `{ statusCode: 400, message: 'bad query' }` therefore goes out as 400 with that body. `{ statusCode: 400 }` has no message, so it fails that check and becomes a generic 500. The filter is not guessing. Both fields have to be present.

**Trade-offs:**

Prefer `HttpException` over a plain object that happens to have `statusCode` and `message`. Use a custom `@Catch()` when you must normalize a third-party error shape.

**Follow-up:**

The thrown value is `Object.assign(new Error('disk full'), { statusCode: 400 })`. Which path does it take?

Answer: The HTTP-error path, because both `statusCode` and `message` are truthy. The client gets 400 and `{ statusCode: 400, message: 'disk full' }`. Attach `statusCode` only when that message is safe to show.

### NEST-095 — headersSent before the filter writes

**Difficulty:** Senior

**Category:** Exception filters

**Question:**

A handler with `@Res()` and no passthrough calls `res.json({ accepted: true })` and then throws `Error('later')`. There is no custom filter. What does the client receive, and what does `BaseExceptionFilter` skip?

**Answer:**

The client keeps `{ accepted: true }`. By the time the filter runs, Express has already sent that JSON and the headers. `BaseExceptionFilter` checks `headersSent` before it writes. The check covers both the `HttpException` branch and the unknown-error branch. When the headers are already gone, the filter skips `reply` and calls `end`. It does not send a second error body. The throw is still logged.

**Trade-offs:**

A bare `@Res()` means the handler owns failures that happen after the write. Catch them and write the error before you send, or accept that the filter can only end the response.

**Follow-up:**

The same sequence throws `NotFoundException` after `res.json`. Does the `HttpException` branch still reply with 404?

Answer: No. The headers check wraps both branches. The client still has `{ accepted: true }`.

### NEST-096 — A filter that writes after the handler already did

**Difficulty:** Senior

**Category:** Exception filters

**Question:**

A method `@Catch()` logs and then calls `response.json({ statusCode: 500, message: 'Internal server error' })`. The handler already called `res.json({ accepted: true })` and then threw. What is missing compared with `BaseExceptionFilter`?

**Answer:**

Once Nest selects your filter, that filter is the only writer. The base filter's `headersSent` guard is not applied for you. A second `json` on a response Express has already finished is rejected, and the client already has `{ accepted: true }`. The log line still runs. The safe pattern is to extend `BaseExceptionFilter` and call `super.catch`, or to check the headers yourself and call `json` only when they have not been sent.

**Trade-offs:**

Extending the base filter reuses the headers check. Hand-written `json` is fine only when you know the handler did not already write.

**Follow-up:**

The handler sets `res.status(202)` and then throws before any write. What does a careful `reply(500, ...)` send?

Answer: Status 500 and the error body. `reply` sets the status, so the earlier 202 is replaced unless your filter deliberately keeps it.

### NEST-097 — false and undefined in getAllAndOverride

**Difficulty:** Senior

**Category:** Guards

**Question:**

A global guard reads `isPublic` with `getAllAndOverride`, handler first and then class. The class has `@SetMetadata('isPublic', true)`. One method sets `false`. Another method sets no metadata. What does each method read, and which requests skip auth?

**Answer:**

`getAllAndOverride` returns the first value that is not `undefined`. `false`, `null`, `0`, and `''` all count as real values and stop the walk. The method that set `false` reads `false`, and the class value is ignored. The method with no metadata falls through to the class and reads `true`. Skip authentication only when the result is exactly `true`, or whatever truthy policy you documented. `false` means the request must still be authenticated.

**Trade-offs:**

Default-private plus a `@Public()` decorator fails closed, which is the safer product rule. Default-public plus a method-level `false` fits a small internal controller.

**Follow-up:**

The method metadata is `null` instead of `false`. What does override return, and what does `=== true` do?

Answer: It returns `null`. The class value is not read. `null === true` is false, so the guard still authenticates.

### NEST-098 — Two decorators writing one metadata key

**Difficulty:** Senior

**Category:** Guards

**Question:**

Two decorators stacked on one method each call `SetMetadata('roles', someArray)`. The guard calls `Reflector.get('roles', getHandler())`. What is guaranteed?

**Answer:**

`SetMetadata` uses `defineMetadata`, which replaces the previous value for that key on that target. The earlier array is gone. `getAllAndMerge` cannot bring it back, because merge reads different targets, and both writes hit the same method. TypeScript evaluates stacked decorators from the one closest to the method upward, so the outermost decorator is the value that remains. Do not stack two writers on one key of one target if both arrays must survive.

**Trade-offs:**

Merge across the handler and the class when both targets should contribute. Keep a single writer on the method when the method should replace the class.

**Follow-up:**

The method has `@Roles('billing')` and the class has `@Roles('audit')`. `getAllAndMerge` is used. Which roles are checked?

Answer: `['billing', 'audit']`, because those are different targets. Use override when the method should replace the class list.

### NEST-099 — The value transform returns is the argument

**Difficulty:** Senior

**Category:** Pipes

**Question:**

`@Body()` is `{ name: ' ada ' }`. `TrimNamePipe` returns a new object `{ name: 'ada' }`. The handler also logs `req.body`. What does the parameter receive, and what does `req.body` still hold?

**Answer:**

The handler parameter is whatever the last pipe returned, here `{ name: 'ada' }`. Nest does not write that object back onto `req.body`. The request keeps the object that was originally extracted, unless the pipe mutated that same object. Anything else in the request that reads `req.body` still sees `{ name: ' ada ' }`. If you need the raw body for an audit log and the trimmed body for the handler, return a new object and leave the request alone.

**Trade-offs:**

A new object keeps the raw body available for audit. Mutating in place is cheaper, and every holder of `req.body` then sees the mutation.

**Follow-up:**

A second pipe returns `{ name: value.name, trimmed: true }`. What does the handler receive?

Answer: `{ name: 'ada', trimmed: true }`. Only the last `transform` return value becomes the argument.

### NEST-100 — A pipe that returns undefined

**Difficulty:** Senior

**Category:** Pipes

**Question:**

`TrimNamePipe` trims `value.name` in place and then falls off the end of `transform` with no `return`. The body was `{ name: ' ada ' }`. What argument does the handler receive, and did the handler run?

**Answer:**

The handler runs, and the argument is `undefined`. A function with no `return` produces `undefined`, and Nest uses that return value as the argument. It does not keep the previous value when you forget to return it. The in-place trim still mutated the original object, so `req.body.name` is `'ada'`, while the parameter the handler was given is `undefined`. That split is easy to misread as a missing body.

**Trade-offs:**

Return `value` from a global pipe that sometimes has nothing to change. Returning `undefined` looks like a missing body and is painful to debug.

**Follow-up:**

The pipe does `return value.name.trim()` instead of returning the object. What does the handler receive?

Answer: The string `'ada'`. The last return value replaces the whole argument. TypeScript's parameter type is not enforced at runtime.
