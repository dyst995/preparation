# NEST02 — Request lifecycle

NestJS 10, Express adapter unless noted. Questions NEST-051–NEST-100.

Version pin: NestJS 10.4 (checked against 10.4.15). Enhancer APIs: `NestMiddleware`, `CanActivate`, `NestInterceptor`, `PipeTransform`, `ExceptionFilter`, `ExecutionContext`, `ArgumentsHost`, `createParamDecorator`, `ParseIntPipe`, `DefaultValuePipe`, `HttpException`, `Reflector`, `APP_GUARD`, `APP_PIPE`, `APP_INTERCEPTOR`, `APP_FILTER`. Per-request work starts after `init()`; module DI is the previous file.

### NEST-051 — The order one HTTP request walks

**Difficulty:** Intermediate

**Category:** Lifecycle

**Question:**

A `GET` has module middleware, a global guard, a route interceptor, a parameter pipe, and a global exception filter. The method returns a plain object and nothing throws. What runs, in what order, and what is skipped?

**Answer:**

Order: middleware → guards → interceptor code before `next.handle()` → pipes → controller → interceptor operators on that observable → adapter reply. Globals then controller then route for inbound enhancers; outbound interceptor operators reverse (route, then controller, then global). Exception filters are not on the success path—they run when an exception leaves the route proxy. There is no separate “service” stage.

**Trade-offs:**

One Express middleware collapses Nest context (no handler reference). Separate guards, pipes, and interceptors keep allow/deny, conversion, and response shape readable.

**Follow-up:**

The same request throws inside the controller. Which stages still ran?

Answer: Middleware, guards, inbound interceptor code, and inbound pipes already ran. Outbound `map` does not see a value. If the interceptor rethrows or has no `catchError`, the exception filter runs; normal `reply` of a return value does not.

### NEST-052 — What middleware is allowed to touch

**Difficulty:** Intermediate

**Category:** Middleware

**Question:**

`LoggerMiddleware.use(req, res, next)` should reject callers missing a role from `@Roles()` on the handler. Why is middleware wrong for that, and what must `use` do before it returns?

**Answer:**

Express middleware has no `ExecutionContext`—no `getHandler()` / `getClass()` for `Reflector`. Path matching has happened; the route proxy that knows the method has not. Role metadata belongs in a guard. `use` must either end the response or call `next()`; Nest does not call `next()` for you. Ending the response skips guards, interceptors, pipes, and the handler.

**Code:**

```typescript
use(req: Request, res: Response, next: NextFunction): void {
  res.setHeader('x-request-id', req.header('x-request-id') ?? crypto.randomUUID());
  next();
}
```

**Follow-up:**

Where do you log after the handler finishes if middleware already called `next()`?

Answer: `res.on('finish', ...)` for status Express eventually sent. For the controller return value before write, use an outbound interceptor.

### NEST-053 — forRoutes, exclude, and the global prefix

**Difficulty:** Senior

**Category:** Middleware

**Question:**

`configure` applies `RequestIdMiddleware` to `OrdersController`, excludes `GET health`, and bootstrap calls `app.setGlobalPrefix('api')` before `listen()`. Which requests run the middleware?

**Answer:**

`configure` runs once during `init()`. `forRoutes(OrdersController)` registers that controller’s paths—e.g. `GET /api/orders` and `GET /api/orders/:id`. `GET /api/health` never matched `forRoutes`, so exclude of `health` is a no-op. In 10.4.15 the extractor prefixes middleware paths with the global prefix already on config; prefix after `init()` is too late.

**Trade-offs:**

Controller class keeps middleware aligned with declared routes; string paths cover shared URL prefixes across controllers.

**Follow-up:**

`configure` is `async` and awaits a remote call before `apply`. When does that run?

Answer: During `init()`, before accept. Nest awaits async `configure`. Slow/failing calls delay or fail startup—not the first request.

### NEST-054 — app.use and the JSON parser

**Difficulty:** Senior

**Category:** Middleware

**Question:**

After `create(AppModule)`, bootstrap does `app.use(logger)` then `listen(3000)`. `logger` reads `req.body` and always sees `undefined` for JSON `POST`, while `configure()` middleware sees the body. Why?

**Answer:**

`create()` returns before `init()`. Early `app.use` appends to Express before `init()` registers JSON/urlencoded parsers (unless `bodyParser: false`), then module middleware, then routes. Early `logger` sits above the parser, so `req.body` is unset. Consumer middleware is registered after the parsers.

**Trade-offs:**

Early `app.use` fits wrapping the raw stack (including unmatched routes) when the body is not needed. Prefer `configure` or post-`init()` `app.use` when the body matters.

**Follow-up:**

`logger` is registered after a manual `await app.init()`, then `listen()`. Does it see `req.body`?

Answer: Yes—`app.use` after parsers appends below them; `listen()` skips a second `init()`. It also sits after module middleware and routes unless placed carefully.

### NEST-055 — Order when several modules bind middleware

**Difficulty:** Senior

**Category:** Middleware

**Question:**

`AppModule` imports `BillingModule`. Both `configure` with `forRoutes('*')`. Which `use` runs first, and what decides order inside one `apply()`?

**Answer:**

Inside `apply(First, Second)`, Express runs First then Second. Across modules, 10.4.15 registers by module distance (low first). Distance starts at 0; each import gets `max(current, parent+1)`. Root middleware runs before deeper feature modules.

**Trade-offs:**

One module with deliberate `apply` order is readable. Distance order is predictable (root then features) but surprising when a shared module is imported deep.

**Follow-up:**

`BillingModule` is imported by the root and also three levels deeper. Which distance wins?

Answer: The larger one. Distance only increases, so the deep import registers that middleware later.

### NEST-056 — Which filters see an exception thrown in middleware

**Difficulty:** Senior

**Category:** Middleware

**Question:**

`AuthMiddleware.use` throws `UnauthorizedException`. The route has `@UseFilters(OrdersExceptionFilter)` and a global filter exists. Which filter writes? What if the same throw is in `app.use`?

**Answer:**

Class middleware is wrapped in `RouterProxy`. Throws (or rejected `async use`) use an exceptions handler with undefined module key—global filters attach; method/controller filters on the route do not. `app.use` errors go through Nest’s Express error handler with the global list only.

**Trade-offs:**

Throwing `HttpException` from consumer middleware reuses global filter shape. `res.status(401).json(...)` skips filters entirely.

**Follow-up:**

Middleware calls `next(new UnauthorizedException())` instead of throwing. Does `OrdersExceptionFilter` run?

Answer: No. `next(err)` uses the Express error handler’s global filter list. Method filters are not selected.

### NEST-057 — What canActivate is allowed to return

**Difficulty:** Intermediate

**Category:** Guards

**Question:**

`canActivate` may return `boolean`, `Promise<boolean>`, or `Observable<boolean>`. What does Nest do with each, and when do interceptors and pipes start?

**Answer:**

Guards run after middleware, before interceptors. Each result is normalized: boolean as-is, Promise awaited, Observable via `lastValueFrom` (must complete; last value wins). Only after every guard yields truthy do interceptors and then pipes run. First non-true stops the chain.

**Trade-offs:**

Promise fits store lookups; Observable fits existing streams; sync boolean is simplest when no I/O is needed.

**Follow-up:**

`canActivate` returns `Promise.resolve(false)`. Do later guards run?

Answer: No. Nest throws `ForbiddenException` (`Forbidden resource`). Later `canActivate` calls are skipped.

### NEST-058 — return false and throw UnauthorizedException

**Difficulty:** Senior

**Category:** Guards

**Question:**

A guard throws `UnauthorizedException` if `Authorization` is missing, returns `false` for `Bearer expired`, else `true`. For each failure, what status/body does the client get, and does `getInvoice` run?

**Answer:**

Neither failure reaches the handler, pipes, or interceptors. Missing header → `UnauthorizedException` → 401, body `{ message: 'Unauthorized', statusCode: 401 }` (default empty-arg shape). `return false` → Nest throws `ForbiddenException` → 403 `Forbidden resource`. Method never runs.

**Trade-offs:**

`return false` is fine for uniform 403. Use explicit throws when 401 vs 403 (or custom bodies) matter.

**Follow-up:**

Method filter `@Catch(UnauthorizedException)` vs global `@Catch()`. Which runs for `Bearer expired`?

Answer: Global `@Catch()`. `false` becomes `ForbiddenException`, so the Unauthorized method filter does not match.

### NEST-059 — Several guards on one route

**Difficulty:** Senior

**Category:** Guards

**Question:**

`APP_GUARD` = `AuthGuard`, controller `@UseGuards(RolesGuard, AuditGuard)`, method `@UseGuards(FeatureGuard)`. All return `true`. Order? If `RolesGuard` returns `false`, who still runs?

**Answer:**

Order: global → controller → method; within a group, binding order. So Auth → Roles → Audit → Feature. First non-true stops: if Roles returns `false`, Audit and Feature never run; Nest throws `ForbiddenException`.

**Trade-offs:**

Small guards stay testable; one mega-guard hides short-circuit order. Controller guards apply to every method.

**Follow-up:**

`AuditGuard` must record Roles denials but never runs after `false`. Where to record?

Answer: Inside `RolesGuard` before returning `false`, or throw and record in a filter. Later guards are not denial hooks.

### NEST-060 — useGlobalGuards and APP_GUARD

**Difficulty:** Senior

**Category:** Guards

**Question:**

`RolesGuard` injects `Reflector`. Bootstrap `useGlobalGuards(new RolesGuard())` vs `{ provide: APP_GUARD, useClass: RolesGuard }`. Which constructs correctly, and if both exist, who runs first?

**Answer:**

`new RolesGuard()` outside the container gets no `Reflector`. `APP_GUARD` / `@UseGuards(RolesGuard)` class tokens are constructed by DI. `useGlobalGuards` appends after create. With both, DI-registered globals from module scan run first (import order), then bootstrap `useGlobalGuards` instances.

**Trade-offs:**

Prefer `APP_GUARD` when dependencies exist. Manual `new` is honest only for zero-dep guards.

**Follow-up:**

Imported `AuthModule` registers `APP_GUARD` Roles; root registers Feature; bootstrap `useGlobalGuards(HeaderPresent)`. Order?

Answer: Roles (imported first), then Feature, then HeaderPresent.

### NEST-061 — ExecutionContext and ArgumentsHost

**Difficulty:** Senior

**Category:** Execution context

**Question:**

A guard, interceptor, and exception filter need the Express request; the guard also needs the handler. What does each receive, and which methods are valid?

**Answer:**

Filters get `ArgumentsHost` (`getArgs`, `getType`, `switchToHttp` / Rpc / Ws). HTTP: `getRequest`/`getResponse`/`getNext` are args 0–2. Guards and interceptors get `ExecutionContext`, which extends that host with `getClass()` and `getHandler()`. Filter hosts often have null handler/class.

**Trade-offs:**

Helpers on `ArgumentsHost` reuse across filters and guards for request access; metadata helpers should take `ExecutionContext`.

**Follow-up:**

`Reflector.get('roles', context.getHandler())` when `@Roles()` is only on the class?

Answer: `undefined`. Class metadata is on `getClass()`. Use override/merge over both (NEST-062).

### NEST-062 — Role metadata on the method and on the class

**Difficulty:** Senior

**Category:** Guards

**Question:**

Class `@Roles('admin')`, one method `@Roles('billing')`, another with no `@Roles()`. How should `RolesGuard` resolve roles, and how do missing user vs wrong role differ?

**Answer:**

`getAllAndOverride('roles', [handler, class])`: first defined wins—billing method uses `['billing']`; undecorated method falls back to `['admin']`. Missing/unauthenticated user → 401; authenticated without required role → 403 (throw explicitly; do not blur with bare `false` unless 403 is always correct).

**Trade-offs:**

`createDecorator` / `SetMetadata` are the same mechanism; override vs merge changes whether method replaces or adds to class roles.

**Follow-up:**

Method `@Roles('billing')`, class `@Roles('admin','billing')`, switch to `getAllAndMerge`. What’s checked?

Answer: Concatenated arrays (handler then class). A user with only `admin` can pass `some`—override would have blocked that.

### NEST-063 — Interceptors on the way in and on the way out

**Difficulty:** Senior

**Category:** Interceptors

**Question:**

Global `G`, controller `C`, method `M` each log `in` before `next.handle()` and `out` in `map`. Handler returns `{ ok: true }`. Log order? Whose `map` sees the object first?

**Answer:**

Inbound: G → C → M → pipes → handler. Outbound FILO: M’s `map` first, then C, then G. So logs: G-in, C-in, M-in, M-out, C-out, G-out. M’s `map` sees `{ ok: true }` first.

**Trade-offs:**

One interceptor that times and wraps is simple but less reusable; separate map/tap compose if binding order is deliberate.

**Follow-up:**

M’s `map` returns `{ wrapped: true }`; C and G only `tap`. Client body?

Answer: `{ wrapped: true }`. `tap` does not replace; adapter writes M’s object.

### NEST-064 — An interceptor that never calls next.handle

**Difficulty:** Intermediate

**Category:** Interceptors

**Question:**

`CacheInterceptor` on a `GET`: hit returns `of(cached)` without `next.handle()`; miss calls it, stores, returns. What runs on a hit?

**Answer:**

Middleware and guards already finished. Hit skips inner interceptors, pipes, and the controller (no DB). Outer interceptors still see the cached emission on the return path if they wrapped this one and called `next.handle()`.

**Trade-offs:**

Short-circuit skips param re-validation on hit—acceptable if the cache key came from a prior validated request.

**Follow-up:**

Global cache interceptor; controller interceptor logs `in` before its `next.handle()`. On hit, does `in` appear?

Answer: No if global returns `of(cached)` without calling `next.handle()`—controller interceptor never starts. Bind logging outside/around cache if you need it.

### NEST-065 — catchError and the exception filter

**Difficulty:** Senior

**Category:** Interceptors

**Question:**

Handler throws `NotFoundException`. Interceptor `catchError` either returns `of({ missing: true })` or `throwError(() => err)`. Method filter `@Catch(NotFoundException)`. Which runs the filter, and what does the client get?

**Answer:**

`of(...)` recovers: success path, typically 200 + `{ missing: true }` (status already set); filter does not run. `throwError` keeps the error; method filter runs and writes its response. `map` never sees the throw.

**Trade-offs:**

Recovering with `of` hides failures from filters and HTTP error monitoring; rethrow preserves filter-owned error contracts.

**Follow-up:**

Interceptor rethrows; method filter only logs. Client receives?

Answer: Whatever that filter writes—or an unfinished response if it never `reply`s/`json`s. Log in `catchError` then write in the filter if needed.

### NEST-066 — How pipes are applied to arguments

**Difficulty:** Senior

**Category:** Pipes

**Question:**

Handler has `@Body() body`, `@Query('page') page`, `@Param('id', ParseIntPipe) id`. Global and method `@UsePipes` exist. What runs per argument, and can body wait on query?

**Answer:**

Pipes run inside `next.handle()` after inbound interceptors. Per argument: global → controller `@UsePipes` → method `@UsePipes` → parameter pipes, left to right, awaited. Arguments are resolved with `Promise.all`, so one argument’s pipes do not wait on another’s completion order for starting—do not rely on cross-argument sequencing.

**Trade-offs:**

Global pipes for shared policy; parameter pipes for one-off coercion; controller `@UsePipes` sits in between.

**Follow-up:**

Method pipe logs `method`, `ParseIntPipe` logs `param`, both on `id`. Which first?

Answer: `method`, then `param`. Parameter pipes append last for that argument.

### NEST-067 — DefaultValuePipe and ParseIntPipe

**Difficulty:** Intermediate

**Category:** Pipes

**Question:**

`@Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number`. Values for missing `page`, `page=4`, `page=4abc`? If the pipes are swapped?

**Answer:**

Left to right. Missing → `undefined` → DefaultValue `1` → ParseInt → `1`. `page=4` → `4`. `page=4abc` → ParseInt throws `BadRequestException`. Swapped: missing `undefined` fails ParseInt before default; default never helps.

**Trade-offs:**

This pair fits a single query; multi-field queries belong in a DTO + `ValidationPipe`.

**Follow-up:**

`page=` empty string. Handler value?

Answer: DefaultValue keeps `''`; ParseInt rejects → 400. Empty string is not replaced; custom pipe if empty should mean default.

### NEST-068 — A pipe that throws

**Difficulty:** Senior

**Category:** Pipes

**Question:**

`ParseIntPipe` throws `BadRequestException`. Route has a guard, interceptor with `catchError`, method `@Catch(BadRequestException)`, global `@Catch()`. What already ran, and which filter writes if the interceptor rethrows?

**Answer:**

Middleware, guard, inbound interceptor, and `next.handle()` started; handler has not. Throw is inside the observable—interceptor `catchError` sees it; on rethrow, method filter matches first (then controller/global). Handler log never runs.

**Trade-offs:**

Fixing status in `catchError` is convenient globally; a filter keeps HTTP error bodies in one place—usually better for shared `BadRequest` shape.

**Follow-up:**

Same exception thrown from the controller body instead. Does the interceptor still see it before the method filter?

Answer: Yes—method body is inside `next.handle()`. Difference: early method lines may already have run.

### NEST-069 — When a custom parameter decorator runs

**Difficulty:** Senior

**Category:** Execution context

**Question:**

`@CurrentUser()` via `createParamDecorator` reads `request.user` set by a guard. A pipe is also on the parameter. When does the factory run relative to guard, interceptor, pipe, and handler?

**Answer:**

Factory runs during argument resolution inside `next.handle()`—after middleware, guards, and inbound interceptor code; before pipes on that value and before the handler. Order: extract via factory → pipes → handler.

**Trade-offs:**

Custom decorators keep handlers free of `@Req()`; raw `@Req()` is clearer when many fields are needed.

**Follow-up:**

No AuthGuard; interceptor sets `request.user` in outbound `map`. What does `@CurrentUser()` see?

Answer: Whatever was already on the request (usually `undefined`). Factory runs before outbound `map`. Set user in middleware/guard.

### NEST-070 — Who writes the HTTP response

**Difficulty:** Senior

**Category:** Lifecycle

**Question:**

One `POST` returns `{ id: '1' }` with no `@Res()`. Another uses `@Res()` and `res.json(...)`. A third uses `@Res({ passthrough: true })`. Who writes, and when is status chosen?

**Answer:**

After guards succeed, Nest sets default status (POST 201, else 200, or `@HttpCode`) before interceptors. Returning a value: Nest `reply`s after outbound interceptors. Bare `@Res()`: you own the response; Nest does not `reply` the return. Passthrough: you may touch `res`, Nest still sends the return value.

**Trade-offs:**

Return values keep filters/interceptors/`@HttpCode` unified. Bare `@Res()` fits streams/downloads you pipe yourself.

**Follow-up:**

`@Sse()` handler returns `Promise.resolve({ data: 'ready' })`. Result?

Answer: After settle, SSE requires an `Observable`; a plain object throws `ReferenceError` about needing an Observable stream.

### NEST-071 — Which exception filter is selected

**Difficulty:** Senior

**Category:** Exception filters

**Question:**

Method `@Catch(NotFoundException)`, controller `@Catch(HttpException)`, global `@Catch()`. Handler throws `NotFoundException`. Which `catch` runs? If the method filter rethrows, does the controller filter run?

**Answer:**

List is built global → controller → method, then reversed—method first. First `@Catch` match by `instanceof` (empty list = all) wins: the method filter. Nest invokes only that selected filter. A rethrow inside it does not resume the walk to the controller filter.

**Trade-offs:**

Method filters for odd contracts; controller for resource-wide shape; global `@Catch()` for process fallback (including middleware).

**Follow-up:**

Method `@Catch(HttpException)`, throw plain `Error('disk full')`. Which filter?

Answer: Global `@Catch()` (empty metatypes). Method/controller `HttpException` filters skip. Else `BaseExceptionFilter` (NEST-072).

### NEST-072 — The default exceptions handler

**Difficulty:** Senior

**Category:** Exception filters

**Question:**

No custom filter matches. Client response for `NotFoundException`, `new Error('disk full')`, and JSON-parser `SyntaxError`? If headers already sent?

**Answer:**

`HttpException`: `getStatus()`/`getResponse()` as-is (default 404 Not Found body). Unknown/`Error`: 500 `{ statusCode: 500, message: 'Internal server error' }` (message not leaked). Parser `SyntaxError` often matches http-errors/`statusCode` path as 400. If `headersSent`, base filter skips `reply` and ends the response; still logs.

**Trade-offs:**

Built-in filter is enough for generic 500s; custom `APP_FILTER` when every 500 must include a request id.

**Follow-up:**

`@Res()` writes `res.json({ accepted: true })` then throws `Error('later')`. Client sees?

Answer: `{ accepted: true }`. Base filter sees headers sent, ends without a second JSON error body.

### NEST-073 — The same lifecycle on the Fastify adapter

**Difficulty:** Senior

**Category:** Platform

**Question:**

App uses `FastifyAdapter`. Guards/interceptors/pipes/filters unchanged. What stays the same, and what breaks in a filter calling `response.status(401).json(...)`?

**Answer:**

Core schedules the same order and contracts. `getHandler`/`getClass` still work. Fastify’s reply API is not Express `res.status().json()`—use `HttpAdapterHost.httpAdapter.reply(...)` or Fastify’s reply methods. Express-only request fields may also need adapters.

**Trade-offs:**

Stay on Express for familiar `res`/`middleware`. Fastify keeps Nest lifecycle but forces adapter-aware response writes.

**Follow-up:**

Guard reads `request.headers.authorization` via `switchToHttp().getRequest()`. Rewrite for Fastify?

Answer: Usually no—headers exist on Fastify’s request. Rewrite only Express-only fields; keep `CanActivate` return contract.

### NEST-074 — Read the log when a pipe fails

**Difficulty:** Advanced

**Category:** Lifecycle

**Question:**

`GET /orders?page=nope` with Trace middleware/guard/interceptor (`map` + `catchError` rethrow), method `@Catch(BadRequestException)` filter, global `@Catch()` filter, and `ParseIntPipe` on `page`. Which logs, order, and status?

**Answer:**

Logs: `middleware`, `guard`, `interceptor-in`, `interceptor-error`, `method-filter`. No `handler`, no `interceptor-out`, no `global-filter` (method filter matched). Client gets `ParseIntPipe`’s 400 `BadRequestException` body via the method filter’s `reply`.

**Trade-offs:**

Layer logs confirm real order; keep request-id tracing in production instead of permanent `console.log` per layer.

**Follow-up:**

Same route with `page=2`. Logs and body?

Answer: `middleware`, `guard`, `interceptor-in`, `handler`, `interceptor-out`. No filters. Body `{ page: 2 }`, status 200.

### NEST-075 — Choosing the layer

**Difficulty:** Advanced

**Category:** Lifecycle

**Question:**

Stamp `x-request-id`, reject missing `Authorization` with 401, require `@Roles('billing')` on `POST /orders`, coerce `?page` or 400, turn unhandled `Error` into generic 500. Which layer owns each, and why not one interceptor for all five?

**Answer:**

Middleware: request-id (no handler needed). Guard(s): auth 401 and roles 403 (need `ExecutionContext`/metadata). Pipe: page coercion. Exception filter: unknown → 500. One interceptor cannot see middleware failures, runs after guards (too late for auth short-circuit), lacks clean param binding, and recovering errors hides filter contracts.

**Trade-offs:**

Combining auth+roles in one guard is fine if 401 vs 403 stays explicit; splitting matches short-circuit order.

**Follow-up:**

Success bodies `{ data, requestId }` and errors include `requestId`. Which layers, and what must middleware do?

Answer: Interceptor `map` for success; global filter for errors. Middleware must store the id on `req` (and usually the response header) where both can read it.

### NEST-076 — What switchToHttp attaches to the host

**Difficulty:** Senior

**Category:** Execution context

**Question:**

A guard calls `context.switchToHttp()` then `context.switchToRpc()`. On an HTTP route, what do `getRequest()`, `getData()`, and `getType()` return, and did either call change the transport?

**Answer:**

`switchToHttp` assigns HTTP accessors onto the same host (args 0–2 = req/res/next). It does not change transport. `getType()` stays `'http'`. `getData()` is an RPC accessor—meaningful after `switchToRpc`, not the HTTP body. Switching adapters on the host does not retarget the request.

**Trade-offs:**

Prefer `switchToHttp().getRequest()` over raw `getArgByIndex(0)` for clarity in shared helpers.

**Follow-up:**

Filter `catch` host is `new ExecutionContextHost([req, res, next])`. `getResponse()`?

Answer: Express response (arg 1). `getHandler`/`getClass` are null; `getType()` defaults to `'http'`.

### NEST-077 — Status written through getResponse

**Difficulty:** Senior

**Category:** Execution context

**Question:**

`POST /orders` has no `@HttpCode()`. Guard sets `getResponse().status(202)`; alternatively an interceptor sets 202 before `next.handle()`. Handler returns `{ id: '1' }`. Client status in each case?

**Answer:**

After guards, Nest `setStatus` applies route default (POST → 201), overwriting the guard’s 202. Interceptor before/after `next.handle()` (and `map` before `reply`) can set 202 that sticks because `reply` keeps the response object’s status. Guard version → 201; interceptor version → 202.

**Trade-offs:**

Prefer `@HttpCode(202)` for fixed statuses; interceptor `res.status` when status depends on runtime.

**Follow-up:**

Interceptor sets 202 inside `map` after the handler. Still 202?

Answer: Yes—`map` runs before `reply`; status on the response object wins.

### NEST-078 — getNext and the Nest pipeline

**Difficulty:** Senior

**Category:** Execution context

**Question:**

A guard calls `context.switchToHttp().getNext()` then returns `true`. What did that continue, and what continues Nest’s guard→interceptor path?

**Answer:**

`getNext()` is Express `next` into the next Express layer—not Nest’s transition from `canActivate` to interceptors. Nest continues by awaiting guards, then `setStatus`, then `interceptorsConsumer.intercept`. Do not mix Express `next()` into guards.

**Trade-offs:**

Middleware owns `next()`; guards own boolean/Promise/Observable results. Mixing duplicates continuation and races the proxy.

**Follow-up:**

Handler takes `@Next() next` and calls `next()` without writing. What about the return value?

Answer: Bare `@Next()` marks response handled; Nest does not `reply` the return. Express continues; client gets whatever a later layer writes.

### NEST-079 — A parameter decorator that returns false

**Difficulty:** Senior

**Category:** Execution context

**Question:**

`@CurrentUser()` factory returns `false` when `request.user` is missing. No guard. Does the handler run, and what does it receive?

**Answer:**

Handler runs with argument `false`. Factories extract values; they do not authorize. Returning `false` is a normal value (then pipes see it). Only throwing (e.g. `UnauthorizedException`) stops the handler from inside argument resolution.

**Trade-offs:**

Throw from the factory to stop the route; return values never imply deny the way `canActivate` false does.

**Follow-up:**

Factory throws `UnauthorizedException` instead. Which stages already finished?

Answer: Middleware, guards, inbound interceptor code. Pipes for that arg and the handler have not started; interceptor `catchError` can see the error.

### NEST-080 — The data argument of createParamDecorator

**Difficulty:** Intermediate

**Category:** Execution context

**Question:**

`@CurrentUser('email')` vs `@CurrentUser(ParseIntPipe)`. What is `data` in the factory, and which registers a pipe?

**Answer:**

Nest uses `isPipe`: class/object with `transform` → pipe list; else → `data`. `'email'` is data (`factory('email', ctx)`), no pipe from that arg. `ParseIntPipe` registers as a pipe; `data` is `undefined`. Factory return then feeds that pipe.

**Trade-offs:**

Dedicated field decorators type cleanly; `data` suits many fields with one lookup. Put pipes in the pipe slot, not as fake data.

**Follow-up:**

`@CurrentUser('email', ParseIntPipe)`; email `'ada@example.com'`. What does ParseInt see?

Answer: The string email. Data selects the field; ParseInt then throws `BadRequestException`. Handler does not run.

### NEST-081 — A parameter factory that returns a Promise

**Difficulty:** Senior

**Category:** Execution context

**Question:**

`createParamDecorator` factory is `async` and resolves to `{ id: '1' }`. No pipes vs a no-op global pipe. Handler value? If the promise rejects?

**Answer:**

`createPipesFn` awaits `getParamValue`, which adopts the factory Promise—handler gets `{ id: '1' }` with or without a pass-through pipe. Rejection rejects argument resolution; handler does not run; interceptor/filters see the error.

**Trade-offs:**

Async factories load during argument binding (after guards, inside `next.handle()`). Prefer middleware/guard for auth identity used by many layers.

**Follow-up:**

Factory rejects with `UnauthorizedException`, no pipe. Handler runs?

Answer: No. `Promise.all` over params rejects; `catchError`/filters can see it without a pipe.

### NEST-082 — How Nest wraps the handler return for map

**Difficulty:** Senior

**Category:** Interceptors

**Question:**

Interceptor: `next.handle().pipe(map(data => ({ data })))`. Handlers return `{ ok: true }`, `Promise.resolve({ ok: true })`, or `of({ ok: true })`. What does `map` see, and the client?

**Answer:**

`next.handle()` is always an Observable. Plain values and Promises are normalized so `map` receives `{ ok: true }` in all three cases; client gets `{ data: { ok: true } }`. Returned Observables are flattened; emissions feed `map`.

**Trade-offs:**

Returning `of(...)` for one HTTP body adds nothing Nest doesn’t already wrap; use Observables when streaming is real.

**Follow-up:**

Handler observable emits `{ n: 1 }` then `{ n: 2 }` then completes. Body written?

Answer: `{ data: { n: 2 } }`—`lastValueFrom` keeps the last emission. Empty completion rejects into the exception path.

### NEST-083 — What intercept itself must return

**Difficulty:** Senior

**Category:** Interceptors

**Question:**

Versions: `return { cached: true }` (no `next.handle()`); `return Promise.resolve(next.handle())`; `return next.handle().pipe(map(...))`. Which satisfy 10.4.15, and what happens to the plain object?

**Answer:**

Must return `Observable` or `Promise<Observable>`. Pipe form is standard; `Promise.resolve(next.handle())` is valid and still runs the handler. Plain `{ cached: true }` is not an Observable—breaks the consumer/`mergeAll` contract. Cache hits should `return of(cached)`.

**Trade-offs:**

Await I/O then return `next.handle()` (or `of(...)`)—never await and return a bare body object.

**Follow-up:**

`async intercept` awaits cache then `return next.handle()`. Valid?

Answer: Yes—`Promise<Observable<...>>` is allowed. Handler runs only if that return executes after the await.

### NEST-084 — Where catchError sits relative to map

**Difficulty:** Senior

**Category:** Interceptors

**Question:**

Handler throws `NotFoundException`. Pipe A: `map` then `catchError`. Pipe B: `catchError` → `of({ missing: true })` then `map` → `{ data }`. What does each `map` see, and which can reach `@Catch(NotFoundException)`?

**Answer:**

`map` ignores errors. A: `map` skips; `catchError` runs—rethrow reaches the method filter. B: `catchError` recovers first; `map` sees `{ missing: true }` → `{ data: { missing: true } }`; filter never runs.

**Trade-offs:**

`catchError` before `map` envelopes recovered bodies; rethrow after `map` preserves filter-owned errors.

**Follow-up:**

`map` throws `BadRequestException` for `{ ok: false }`; later `catchError` rethrows. Filter sees?

Answer: `BadRequestException`. Handler succeeded; `@Catch(NotFoundException)` does not match.

### NEST-085 — APP_INTERCEPTOR and useGlobalInterceptors

**Difficulty:** Senior

**Category:** Interceptors

**Question:**

`LoggingInterceptor` needs `AuditService`. `useGlobalInterceptors(new LoggingInterceptor())` vs `{ provide: APP_INTERCEPTOR, useClass: LoggingInterceptor }`. Who gets DI, and inbound order if both exist?

**Answer:**

Only `APP_INTERCEPTOR`/`useClass` is constructed with the module injector. Manual `new` skips DI. Scan-registered globals run before bootstrap `useGlobalInterceptors` appends. Inbound: DI globals first, then manual instances.

**Trade-offs:**

`APP_INTERCEPTOR` for dependencies; manual `new` only for empty constructors.

**Follow-up:**

Request-scoped `APP_INTERCEPTOR`—where stored vs static global?

Answer: Request-interceptor / scoped enhancer path, not the static global list; resolved per request context, relative to static globals by enhancer wiring.

### NEST-086 — Two APP_INTERCEPTOR registrations

**Difficulty:** Senior

**Category:** Interceptors

**Question:**

`AppModule` registers `APP_INTERCEPTOR` Logging; imported `AuditModule` registers Audit. Bootstrap `useGlobalInterceptors(new TimingInterceptor())`. Inbound order? What does Audit’s `map` see if all three call `next.handle()` and `map`?

**Answer:**

In 10.4, `AppModule`’s `APP_INTERCEPTOR` providers are recorded before imported `AuditModule`’s; `useGlobalInterceptors` appends Timing last. Inbound: Logging → Audit → Timing → handler. Outbound maps reverse, so Timing’s `map` sees the handler value first; Audit’s `map` sees Timing’s mapped result.

**Trade-offs:**

One interceptor with ordered steps is clearer; separate `APP_INTERCEPTOR`s when modules own concerns—then scan order matters.

**Follow-up:**

Both in `AppModule.providers`, audit first, logging second; no `useGlobalInterceptors`. Whose `map` sees `{ ok: true }` first?

Answer: `LoggingInterceptor`—later registration is inner inbound, so its `map` is first outbound.

### NEST-087 — Functional middleware and class middleware

**Difficulty:** Senior

**Category:** Middleware

**Question:**

`apply(requestIdMiddleware, RequestIdMiddleware)`—function vs class with constructor DI. How does Nest register each, and which gets the injector?

**Answer:**

Functions stay functional middleware (wrapped). Classes matching `isMiddlewareClass` (`class` / uppercase `function` with `use`) are constructed from the middleware injector with DI. Only the class form receives constructor dependencies.

**Trade-offs:**

Close over an injected service from `configure` for functional middleware; class middleware is cleaner for multi-dep `use`.

**Follow-up:**

Request-scoped class middleware—when is a new instance created?

Answer: Per request when that middleware runs—not at `configure` time. Functional form has no Nest scope.

### NEST-088 — Why middleware has no ExecutionContext

**Difficulty:** Senior

**Category:** Middleware

**Question:**

`use` wants `Reflector.get('roles', handler)`. Why no `ExecutionContext`/`getHandler()`, and what does the middleware catch host contain if `use` throws?

**Answer:**

Middleware is Express `(req, res, next)` before the route proxy that knows the controller method. Success path never builds a full handler context. Catch host is typically `[req, res, next]`—HTTP accessors work; `getHandler`/`getClass` are null.

**Trade-offs:**

Building `ExecutionContextHost` yourself still won’t invent the handler. Use a guard for metadata.

**Follow-up:**

`req.params.id` on `forRoutes(OrdersController)` with `orders/:id`—same as `getHandler()`?

Answer: No. Params are URL data from Express; `getHandler()` is the method reference for metadata. Guards can read both.

### NEST-089 — A service inside class middleware

**Difficulty:** Intermediate

**Category:** Middleware

**Question:**

`RequestIdMiddleware` injects `IdService` from exported `CoreModule`. `OrdersModule.configure` applies it. What must `OrdersModule` import, and what does `use` still lack?

**Answer:**

Import `CoreModule` so the configuring module’s injector sees `IdService`. `apply(RequestIdMiddleware)` mounts and constructs it—listing it only in `providers` does not. Injection still does not provide `ExecutionContext`/handler metadata.

**Trade-offs:**

Inject loggers/id generators freely; Reflector without a handler still cannot read route roles.

**Follow-up:**

`IdService.next` throws `ServiceUnavailableException`. Which filters write?

Answer: Global filters (or default handler). Controller/method filters on the route are not used for the middleware proxy.

### NEST-090 — @Catch walks for the first match

**Difficulty:** Senior

**Category:** Exception filters

**Question:**

`@UseFilters(BroadFilter, NarrowFilter)`: Broad `@Catch(HttpException)`, Narrow `@Catch(NotFoundException)`. Throw `NotFoundException`. Which runs, and why isn’t the more specific class preferred?

**Answer:**

`@Catch` matches by `instanceof` (or empty list = all). Selection is first match on the reversed filter list—not “most specific subclass.” Metadata `[Broad, Narrow]` reverses to `[Narrow, Broad]`, so `NarrowFilter` runs for `NotFoundException`. If Broad were tried first, its `@Catch(HttpException)` would also match NotFound and win. Order beats specificity.

**Trade-offs:**

One `@Catch(HttpException)` with status branches avoids order traps; two filters need deliberate `@UseFilters` order.

**Follow-up:**

Add controller `@Catch(NotFoundException)`; method still Broad then Narrow. Who runs?

Answer: `NarrowFilter`—method filters before controller; Narrow matches and stops.

### NEST-091 — @Catch() and @Catch(Error)

**Difficulty:** Senior

**Category:** Exception filters

**Question:**

Method `@Catch(Error)`, global `@Catch()`. Throws: `NotFoundException`, `new Error('disk full')`, string `'disk full'`. Which filter for each?

**Answer:**

Method first. `NotFoundException instanceof Error` → method. Plain `Error` → method. String `'disk full'` is not `instanceof Error` → method skips → global `@Catch()` matches. Method filters that assume `HttpException` APIs can throw inside `catch` on non-HTTP Errors.

**Trade-offs:**

Method `@Catch()` owns all throws including strings; `@Catch(HttpException)` leaves unknowns to global/base.

**Follow-up:**

Only global `@Catch(HttpException)`; throw `'disk full'`. What runs?

Answer: No custom match → `BaseExceptionFilter` → 500 generic internal error body.

### NEST-092 — @UseFilters list order

**Difficulty:** Intermediate

**Category:** Exception filters

**Question:**

Only `@UseFilters(AlphaFilter, BetaFilter)`: Alpha `@Catch(BadRequestException)`, Beta `@Catch()`. Throw `BadRequestException`. Which runs?

**Answer:**

Reverse → `[Beta, Alpha]`. Beta’s empty `@Catch()` matches everything first → Beta runs; Alpha never called despite being “more specific.”

**Trade-offs:**

Single filter with internal `instanceof` makes order obvious; two filters require putting catch-all last in the reversed sense (catch-all first in `@UseFilters` is wrong).

**Follow-up:**

Also a global `@Catch()`; method still Alpha then Beta(`@Catch()`). Who runs?

Answer: Beta—method reversed pair still before global; Beta stops the walk.

### NEST-093 — HttpException getResponse as the body

**Difficulty:** Senior

**Category:** Exception filters

**Question:**

No custom filter. JSON for `new NotFoundException()`, `new HttpException('missing', 404)`, `new HttpException({ error: 'missing' }, 404)`?

**Answer:**

Uses `getResponse()` + `getStatus()`. Default NotFound object → `{ statusCode: 404, message: 'Not Found' }`. String response → typically wrapped/objectified with that message and status. Object response → sent as that object (`{ error: 'missing' }`) with status 404—`getResponse()` is the body contract.

**Trade-offs:**

Subclasses keep controllers clean; custom objects when the API isn’t `{ statusCode, message }`.

**Follow-up:**

Your filter always `json`s `{ statusCode, message: exception.message }`. What is lost for object responses?

Answer: Fields like `error` from `getResponse()`. Prefer sending `getResponse()` when the throw site chose the body.

### NEST-094 — Unknown errors and the http-errors shape

**Difficulty:** Senior

**Category:** Exception filters

**Question:**

`BaseExceptionFilter` for `new Error('disk full')`, `{ statusCode: 400, message: 'bad query' }`, and `{ statusCode: 400 }`. Status/body/logging?

**Answer:**

Plain Error → 500 generic body; log message/stack server-side. Object with truthy `statusCode` and `message` → http-errors path: that status/body. `{ statusCode: 400 }` alone lacks message → treated as unknown → 500 generic (not a client 400).

**Trade-offs:**

Prefer `HttpException` over duck-typed `{ statusCode, message }`. Custom `@Catch()` if you must normalize third-party shapes.

**Follow-up:**

`Object.assign(new Error('disk full'), { statusCode: 400 })`. Path?

Answer: http-errors (statusCode + message truthy) → 400 `{ statusCode: 400, message: 'disk full' }`. Attach `statusCode` only when the message is client-safe.

### NEST-095 — headersSent before the filter writes

**Difficulty:** Senior

**Category:** Exception filters

**Question:**

Handler `@Res()` (no passthrough) does `res.json({ accepted: true })` then throws `Error('later')`. No custom filter. Client receives? What does `BaseExceptionFilter` skip?

**Answer:**

Client keeps `{ accepted: true }`. Base filter sees `headersSent`, skips `reply`, calls `end`. No second error JSON.

**Trade-offs:**

Bare `@Res()` means the handler owns post-write failures—catch and write before sending, or accept end-only cleanup.

**Follow-up:**

Same sequence but `NotFoundException` after `res.json`. Does HttpException branch still `reply` 404?

Answer: No—headers check wraps both branches; client still has `{ accepted: true }`.

### NEST-096 — A filter that writes after the handler already did

**Difficulty:** Senior

**Category:** Exception filters

**Question:**

Method `@Catch()` logs then `response.json({ statusCode: 500, message: 'Internal server error' })` after handler already `res.json({ accepted: true })` and threw. What’s missing vs `BaseExceptionFilter`?

**Answer:**

Selected custom filter is Nest’s only writer—base filter’s `headersSent` guard is not applied. Second `json` on a finished response is rejected/erroneous in Express. Client already has `{ accepted: true }`.

**Trade-offs:**

Extend `BaseExceptionFilter` / call `super.catch` to reuse the headers check; hand `json` only when headers are clear.

**Follow-up:**

Handler sets `res.status(202)` then throws before any write. What does a careful `reply(500, ...)` send?

Answer: 500 and the error body—`reply` sets status; prior 202 is replaced unless your filter preserves it.

### NEST-097 — false and undefined in getAllAndOverride

**Difficulty:** Senior

**Category:** Guards

**Question:**

Global guard reads `isPublic` with `getAllAndOverride` (handler then class). Class `@SetMetadata('isPublic', true)`. One method `false`, another no metadata. What does each read, and who skips auth?

**Answer:**

First value not `undefined` wins—including `false`/`null`/`0`/`''`. Method with `false` → `false` (class ignored). Method with no metadata → class `true`. Skip auth only when result `=== true` (or your chosen truthy policy)—`false` means authenticate.

**Trade-offs:**

Default-private + `@Public()` fails closed; default-public + method `false` fits small internal controllers.

**Follow-up:**

Method metadata `null` instead of `false`. Override result and `=== true`?

Answer: Returns `null`; class not read; `null === true` is false → authenticate.

### NEST-098 — Two decorators writing one metadata key

**Difficulty:** Senior

**Category:** Guards

**Question:**

Two stacked method decorators each `SetMetadata('roles', someArray)`. Guard `Reflector.get('roles', getHandler())`. What is guaranteed?

**Answer:**

`defineMetadata` replaces—last writer wins; earlier array is gone. `getAllAndMerge` cannot recover two writes on the same target. Decorator evaluation order decides the survivor; do not stack two writers on one key/one target.

**Trade-offs:**

Merge across handler+class targets; never two method decorators sharing one key if both values must survive.

**Follow-up:**

Method `@Roles('billing')`, class `@Roles('audit')`, `getAllAndMerge`. Checked roles?

Answer: `['billing', 'audit']` (different targets). Use override when method should replace class.

### NEST-099 — The value transform returns is the argument

**Difficulty:** Senior

**Category:** Pipes

**Question:**

`@Body()` is `{ name: ' ada ' }`. `TrimNamePipe` returns new `{ name: 'ada' }`. Handler also logs `req.body`. Parameter vs `req.body`?

**Answer:**

Parameter is the pipe’s return `{ name: 'ada' }`. `req.body` stays the original extracted object unless you mutated it—Nest does not write pipe output back onto `req.body`.

**Trade-offs:**

New objects keep raw body for audit; in-place mutation is cheaper but shared with anything holding `req.body`.

**Follow-up:**

Second pipe returns `{ name: value.name, trimmed: true }`. Handler receives?

Answer: `{ name: 'ada', trimmed: true }`—only the last transform’s return is the argument.

### NEST-100 — A pipe that returns undefined

**Difficulty:** Senior

**Category:** Pipes

**Question:**

`TrimNamePipe` trims `value.name` in place and falls off with no `return`. Body was `{ name: ' ada ' }`. Handler argument? Did the handler run?

**Answer:**

Handler runs with `undefined`. Missing `return` yields `undefined`; Nest does not keep the previous value. In-place trim still mutated the original object on `req.body`, but the parameter is `undefined`.

**Trade-offs:**

Return `value` for “no-op” global pipes. Returning `undefined` looks like a missing body and is hard to debug.

**Follow-up:**

Pipe `return value.name.trim()` instead of the object. Handler receives?

Answer: String `'ada'`. Last return replaces the whole argument; TypeScript types are not enforced at runtime.
