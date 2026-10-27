# NEST06 — Validation & API design

NestJS 10 with `class-validator`/`class-transformer`, `@nestjs/swagger`, and the built-in versioning; each question names its stack where relevant. Questions NEST-251–NEST-300.

ValidationPipe options (whitelist, forbidNonWhitelisted, transform), DTO design and mapped types, custom validators, Parse* pipes, URI/header/media-type versioning, OpenAPI/Swagger decorators, pagination/filter/sort query DTOs, idempotency keys, light HATEOAS, problem+json and consistent error shapes, content negotiation, rate-limit headers, gateway vs Nest concerns, serialization (`@Exclude`/`@Expose`, `ClassSerializerInterceptor`), multipart uploads, GraphQL vs REST, and breaking-change strategy.

### NEST-251 — What are the roles of `class-validator` and `class-transformer` in a Nest app

**Difficulty:** Junior

**Category:** ValidationPipe

**Question:**

What are the roles of `class-validator` and `class-transformer` in a Nest app?

**Answer:**

`class-transformer` converts plain JSON into class instances (`plainToInstance`) and back (`instanceToPlain`), applying `@Type`, `@Transform`, `@Exclude`, `@Expose`. `class-validator` reads decorators (`@IsEmail`, `@Min`) on those instances and returns constraint errors. `ValidationPipe` chains them: transform first, then validate. Without a class instance (plain object), decorators have nothing to read.

**Follow-up:**

Why must DTOs be classes, not interfaces or types?

Answer: Interfaces/types are erased at compile time, so there's no runtime metadata. Decorators and `emitDecoratorMetadata` only work on classes, so the pipe can't discover rules or the parameter type from an interface.

### NEST-252 — What does `whitelist: true` do in `ValidationPipe`

**Difficulty:** Junior

**Category:** ValidationPipe

**Question:**

What does `whitelist: true` do in `ValidationPipe`?

**Answer:**

It strips properties that have no validation decorator from the validated object. It's a defense against mass assignment (e.g., client sends `isAdmin: true`). Every legit property needs at least one decorator (use `@Allow()` for "no rules but keep").

**Follow-up:**

What's the common gotcha with whitelisting?

Answer: Forgetting a decorator on a field silently drops it from `body`, leading to "my field is always undefined" bugs. Nested objects also need `@ValidateNested()` + `@Type()` or they're stripped/unchecked.

### NEST-253 — What does `forbidNonWhitelisted` add on top of `whitelist`

**Difficulty:** Intermediate

**Category:** ValidationPipe

**Question:**

What does `forbidNonWhitelisted` add on top of `whitelist`?

**Answer:**

Instead of silently stripping unknown properties, it throws a 400 listing them (`property x should not exist`). It requires `whitelist: true` to take effect. Good for strict public APIs and catching client typos; stricter than silent stripping.

**Follow-up:**

When would you avoid it?

Answer: When clients are old/third-party and may send extra fields (forward/backward compatibility), or when you follow the robustness principle. Strict rejection can turn harmless additive client changes into outages.

### NEST-254 — What does `transform: true` do

**Difficulty:** Intermediate

**Category:** ValidationPipe

**Question:**

What does `transform: true` do?

**Answer:**

The pipe returns the transformed class instance (not the raw plain object) to the handler, and also converts primitive params to the declared type (`@Param('id') id: number`). Without it, validation runs on an instance but the handler still receives the raw payload.

**Follow-up:**

Does `transform: true` make `@Query('page') page: number` a number automatically?

Answer: For primitive-typed params, yes, using the metatype. For DTO properties it needs `@Type(() => Number)` or `transformOptions: { enableImplicitConversion: true }`; otherwise they stay strings.

### NEST-255 — What are the risks of `enableImplicitConversion`

**Difficulty:** Senior

**Category:** ValidationPipe

**Question:**

What are the risks of `enableImplicitConversion`?

**Answer:**

It converts using TS metadata, which is convenient for query DTOs but dangerous for booleans: `Boolean("false") === true`. It also hides conversions and can coerce garbage (`Number("")` → 0). Prefer explicit `@Type(() => Number)` and a custom `@Transform` for booleans.

**Follow-up:**

How do you correctly parse `?active=false`?

Answer: `@Transform(({ value }) => value === 'true' || value === true)` with `@IsBoolean()`, or `ParseBoolPipe` for single params. Never rely on implicit conversion for booleans.

### NEST-256 — What are DTO design principles for a good API

**Difficulty:** Intermediate

**Category:** DTO design

**Question:**

What are DTO design principles for a good API?

**Answer:**

Separate input and output DTOs; one DTO per use case (`CreateUserDto`, `UpdateUserDto`); never bind entities directly to requests; keep DTOs flat where possible; validate at the edge; name by intent; avoid leaking internal IDs/fields. DTOs are your public contract, entities are your storage.

**Follow-up:**

Why not reuse the TypeORM/Prisma entity as the DTO?

Answer: It couples API to schema (any DB change is a breaking change), risks mass assignment and leaking sensitive columns, and mixes persistence decorators with validation concerns.

### NEST-257 — What are mapped types (`PartialType`, `PickType`, `OmitType`, `IntersectionType`)

**Difficulty:** Intermediate

**Category:** DTO design

**Question:**

What are mapped types (`PartialType`, `PickType`, `OmitType`, `IntersectionType`)?

**Answer:**

Helpers from `@nestjs/mapped-types` (or `@nestjs/swagger`) that derive new DTO classes from existing ones while inheriting validation (and Swagger) metadata. `UpdateDto = PartialType(CreateDto)` makes all fields optional but keeps their rules.

**Follow-up:**

Why import from `@nestjs/swagger` instead of `@nestjs/mapped-types` when using Swagger?

Answer: The swagger version also copies `@ApiProperty` metadata; the mapped-types version only copies validation/transform metadata, leaving the OpenAPI schema incomplete.

### NEST-258 — How do you validate nested objects

**Difficulty:** Intermediate

**Category:** DTO design

**Question:**

How do you validate nested objects?

**Answer:**

Use `@ValidateNested()` plus `@Type(() => ChildDto)` so class-transformer instantiates the child class. For arrays add `{ each: true }`. Without `@Type`, the child remains a plain object and nothing is validated.

**Follow-up:**

What happens with `@ValidateNested()` on a property whose value is `undefined`?

Answer: It passes unless you also add `@IsDefined()`/`@IsNotEmpty()`. `@ValidateNested` only validates when a value exists; use `@IsDefined()` for required nested objects.

### NEST-259 — How do you validate each element of an array

**Difficulty:** Intermediate

**Category:** DTO design

**Question:**

How do you validate each element of an array?

**Answer:**

`@IsArray()` plus `{ each: true }` on element validators (`@IsInt({ each: true })`), with `@ArrayMinSize`, `@ArrayMaxSize`, `@ArrayUnique`. For object elements use `@ValidateNested({ each: true })` + `@Type`. For top-level array bodies use `ParseArrayPipe({ items: Dto })`.

**Follow-up:**

Why put a max size on arrays?

Answer: To prevent resource abuse (huge payloads, expensive validation, DB `IN` clauses). Combine with body-size limits in the adapter.

### NEST-260 — How do you write a custom validation decorator

**Difficulty:** Intermediate

**Category:** Custom validators

**Question:**

How do you write a custom validation decorator?

**Answer:**

Implement a `ValidatorConstraintInterface` (`validate`, `defaultMessage`) and expose a decorator through `registerDecorator`, or use `@ValidatorConstraint({ name })` with `@Validate(MyConstraint)`. Use it for cross-field checks (password match), domain rules, or format checks.

**Follow-up:**

How do you do a cross-field validation like `endDate > startDate`?

Answer: The constraint's `validate(value, args)` can read `args.object` and compare with `args.constraints[0]` property. Alternatively validate in the service/domain layer when rules are business-level.

### NEST-261 — How do you use dependency injection in a custom validator (e.g., unique email)

**Difficulty:** Senior

**Category:** Custom validators

**Question:**

How do you use dependency injection in a custom validator (e.g., unique email)?

**Answer:**

Mark the constraint `@Injectable()` and `@ValidatorConstraint({ async: true })`, register it as a provider, and call `useContainer(app.select(AppModule), { fallbackOnErrors: true })` in `main.ts` so class-validator resolves from Nest's container.

**Follow-up:**

Is a uniqueness validator a good idea?

Answer: It gives a nicer 400 but is racy (TOCTOU). You still need a DB unique constraint and to map its violation error (409) in the service. Treat the validator as UX, the constraint as truth.

### NEST-262 — How do you handle conditional validation

**Difficulty:** Intermediate

**Category:** Custom validators

**Question:**

How do you handle conditional validation?

**Answer:**

`@ValidateIf((o) => o.type === 'card')` skips all validators on a property when the condition is false. Validation `groups` (`@IsString({ groups: ['create'] })` with `ValidationPipe({ groups })`) is another option, though separate DTOs are usually clearer.

**Follow-up:**

Why prefer separate DTOs over groups?

Answer: Groups hide the contract in decorators and make Swagger and types less precise. Separate DTOs (or discriminated unions) are explicit and easier to document and test.

### NEST-263 — How do you customize validation error responses

**Difficulty:** Senior

**Category:** Error shape

**Question:**

How do you customize validation error responses?

**Answer:**

Pass `exceptionFactory: (errors: ValidationError[]) => new BadRequestException({...})` to `ValidationPipe`, flattening constraints into your standard error shape (field, code, message). Also `errorHttpStatusCode` to change the status, and `disableErrorMessages` for production.

**Follow-up:**

How do you flatten nested errors?

Answer: Recursively walk `ValidationError.children`, building dotted paths (`address.zip`) and collecting `constraints` at each level.

### NEST-264 — What do `ParseIntPipe` and `ParseUUIDPipe` do

**Difficulty:** Junior

**Category:** Pipes

**Question:**

What do `ParseIntPipe` and `ParseUUIDPipe` do?

**Answer:**

Parameter-level pipes that transform and validate route/query params: `ParseIntPipe` converts to an integer or throws 400, `ParseUUIDPipe({ version: '4' })` validates UUID format. They fail fast before hitting the service/DB.

**Follow-up:**

How do you change the error status or message?

Answer: Pass `{ errorHttpStatusCode: HttpStatus.NOT_ACCEPTABLE }` or `exceptionFactory`. Often you keep 400 for malformed and use 404 in service for "not found".

### NEST-265 — What other built-in Parse* pipes exist and what's `DefaultValuePipe` for

**Difficulty:** Junior

**Category:** Pipes

**Question:**

What other built-in Parse* pipes exist and what's `DefaultValuePipe` for?

**Answer:**

`ParseFloatPipe`, `ParseBoolPipe`, `ParseArrayPipe`, `ParseEnumPipe`, `ParseFilePipe`, `ParseDatePipe` (newer 10.x). `DefaultValuePipe(10)` supplies a value when the param is `undefined`; chain it before others: `@Query('limit', new DefaultValuePipe(10), ParseIntPipe)`.

**Follow-up:**

Why must `DefaultValuePipe` come first?

Answer: Pipes run left to right; `ParseIntPipe` on `undefined` would throw, so default must fill the value before parsing.

### NEST-266 — How do you write a custom pipe

**Difficulty:** Intermediate

**Category:** Pipes

**Question:**

How do you write a custom pipe?

**Answer:**

Implement `PipeTransform<T, R>` with `transform(value, metadata)`; throw an HTTP exception to reject, return a value to continue. `metadata` includes `type` (`body|query|param|custom`), `metatype`, and `data`. Use for trimming, sanitization, parsing, or Zod/Joi schema validation.

**Follow-up:**

How would you use Zod instead of class-validator?

Answer: Write a `ZodValidationPipe(schema)` calling `schema.safeParse` and throwing on failure; infer TS types from the schema (`z.infer`), which avoids duplicate class+decorators. Libraries like `nestjs-zod` add Swagger integration.

### NEST-267 — What's the difference between `app.useGlobalPipes()` and `APP_PIPE`

**Difficulty:** Intermediate

**Category:** Pipes

**Question:**

What's the difference between `app.useGlobalPipes()` and `APP_PIPE`?

**Answer:**

`useGlobalPipes` is registered outside the DI context, so the pipe can't inject providers. `{ provide: APP_PIPE, useValue/useClass }` in a module is registered within DI and can inject dependencies. It's also applied in e2e tests that bootstrap via the module only, while `useGlobalPipes` must be repeated in the test setup.

**Follow-up:**

Why do e2e tests sometimes miss validation?

Answer: Because `main.ts` global pipes aren't applied when tests create the app from `Test.createTestingModule`; you must call `app.useGlobalPipes` again or use `APP_PIPE`.

### NEST-268 — In what order do middleware, guards, interceptors, and pipes run, and where does validation fit

**Difficulty:** Intermediate

**Category:** Request lifecycle

**Question:**

In what order do middleware, guards, interceptors, and pipes run, and where does validation fit?

**Answer:**

Middleware → guards → interceptors (before) → pipes → handler → interceptors (after) → exception filters (on error). Validation is in pipes, so auth guards reject unauthenticated requests before validating bodies, avoiding wasted work and information leaks.

**Follow-up:**

Why does that order matter for security?

Answer: Validation errors reveal schema details; running guards first prevents unauthenticated users from probing your contract, and avoids costly parsing for rejected requests.

### NEST-269 — How does URI versioning work in Nest 10

**Difficulty:** Junior

**Category:** Versioning

**Question:**

How does URI versioning work in Nest 10?

**Answer:**

`app.enableVersioning({ type: VersioningType.URI })` and `@Controller({ path: 'users', version: '1' })` yields `/v1/users`. Simple, visible, cache and gateway friendly; the default prefix is `v`.

**Follow-up:**

Trade-offs of URI versioning?

Answer: Pro: explicit, easy to route/cache/document. Con: URL is supposed to identify a resource, not a representation; clients must change URLs to upgrade, and it encourages whole-API version bumps.

### NEST-270 — How does header versioning work

**Difficulty:** Senior

**Category:** Versioning

**Question:**

How does header versioning work?

**Answer:**

`enableVersioning({ type: VersioningType.HEADER, header: 'X-API-Version' })`; Nest picks the handler matching the header value. URLs stay stable, but it's less discoverable and harder to test in a browser.

**Follow-up:**

What must you set for caches?

Answer: `Vary: X-API-Version`, otherwise a shared cache may serve the wrong version's response.

### NEST-271 — How does media type versioning work

**Difficulty:** Intermediate

**Category:** Versioning

**Question:**

How does media type versioning work?

**Answer:**

`type: VersioningType.MEDIA_TYPE, key: 'v='` reads the `Accept` header, e.g. `Accept: application/json;v=2`. It follows HTTP content negotiation semantics best, but is the least ergonomic for clients and tooling.

**Follow-up:**

When would you pick it?

Answer: For hypermedia/purist REST or when the same URL must serve multiple representations. Most teams choose URI versioning for simplicity.

### NEST-272 — What are custom versioning and `VERSION_NEUTRAL`

**Difficulty:** Senior

**Category:** Versioning

**Question:**

What are custom versioning and `VERSION_NEUTRAL`?

**Answer:**

`type: VersioningType.CUSTOM` with `extractor: (req) => string | string[]` lets you derive versions from anything (query, subdomain, JWT claim), returning an ordered list of preferred versions. `VERSION_NEUTRAL` makes a route match regardless of version (e.g., `/health`).

**Follow-up:**

Can a route support multiple versions?

Answer: Yes: `@Version(['1', '2'])` or `version: ['1','2']` on the controller, useful when v2 changes only some endpoints.

### NEST-273 — How do you apply versions at controller vs route level

**Difficulty:** Intermediate

**Category:** Versioning

**Question:**

How do you apply versions at controller vs route level?

**Answer:**

Controller-level `version` applies to all routes; `@Version('2')` on a method overrides it. You can keep a v1 controller untouched and add a v2 controller/handler that reuses the same service, delegating to different mappers/DTOs.

**Follow-up:**

How do you avoid duplicating business logic across versions?

Answer: Keep versions in the transport layer: v1/v2 controllers + DTOs + mappers call one domain service. Never fork services per version unless behavior truly diverges.

### NEST-274 — What counts as a breaking change in an API

**Difficulty:** Senior

**Category:** Breaking changes

**Question:**

What counts as a breaking change in an API?

**Answer:**

Removing/renaming fields or endpoints, changing types, making optional fields required, tightening validation, changing status codes/error shapes, changing semantic meaning, altering pagination defaults or auth requirements. Adding optional fields/endpoints is typically non-breaking.

**Follow-up:**

Is adding an enum value breaking?

Answer: It can be for clients with exhaustive switches. Document that clients must tolerate unknown values (tolerant reader), or version it.

### NEST-275 — What's a sound versioning and deprecation strategy

**Difficulty:** Senior

**Category:** Breaking changes

**Question:**

What's a sound versioning and deprecation strategy?

**Answer:**

Prefer additive, backward-compatible evolution; use expand/contract (add new, migrate, remove old); version only when breaking; support N and N-1; announce deprecations with `Deprecation` and `Sunset` headers plus changelog; monitor usage per version before removal; use contract tests.

**Follow-up:**

How do you know it's safe to remove v1?

Answer: Track per-version/per-client traffic via logs/metrics; reach zero (or contacted-and-agreed) usage past the sunset date, then remove with a `410 Gone` period if needed.

### NEST-276 — How do you set up Swagger/OpenAPI in Nest

**Difficulty:** Junior

**Category:** OpenAPI / Swagger

**Question:**

How do you set up Swagger/OpenAPI in Nest?

**Answer:**

`new DocumentBuilder().setTitle().setVersion().addBearerAuth().build()`, then `SwaggerModule.createDocument(app, config)` and `SwaggerModule.setup('docs', app, document)`. It reflects routes and DTO metadata and serves UI plus JSON at `/docs-json`.

**Follow-up:**

How do you export the spec for client generation?

Answer: Write `JSON.stringify(document)` to a file in a build script (or fetch `/docs-json`), then feed it to `openapi-generator`/`orval`/`openapi-typescript` in CI.

### NEST-277 — What are `@ApiProperty` and the Swagger CLI plugin

**Difficulty:** Intermediate

**Category:** OpenAPI / Swagger

**Question:**

What are `@ApiProperty` and the Swagger CLI plugin?

**Answer:**

`@ApiProperty({ description, example, enum, required })` documents DTO fields. The CLI plugin (`nest-cli.json` → `plugins: ['@nestjs/swagger']`) auto-infers properties from TS types, class-validator decorators, and JSDoc comments for files named `*.dto.ts`/`*.entity.ts`, reducing boilerplate.

**Follow-up:**

What are the plugin's limitations?

Answer: It only works with the Nest CLI compiler (not plain `ts-node`/some Jest setups without config), and complex types (generics, unions) still need explicit `@ApiProperty({ type })`.

### NEST-278 — Which decorators document controllers

**Difficulty:** Junior

**Category:** OpenAPI / Swagger

**Question:**

Which decorators document controllers?

**Answer:**

`@ApiTags`, `@ApiOperation({ summary })`, `@ApiResponse`/`@ApiOkResponse`/`@ApiCreatedResponse`, `@ApiBadRequestResponse`, `@ApiBearerAuth`, `@ApiQuery`, `@ApiParam`, `@ApiBody`, `@ApiConsumes('multipart/form-data')`, `@ApiHeader`, `@ApiExcludeEndpoint`.

**Follow-up:**

Why document error responses?

Answer: Clients and generated SDKs need to know the failure contract (401/403/404/409/422 shapes), not only the happy path.

### NEST-279 — How do Swagger mapped types differ from plain TS utility types

**Difficulty:** Intermediate

**Category:** OpenAPI / Swagger

**Question:**

How do Swagger mapped types differ from plain TS utility types?

**Answer:**

TS `Partial<T>` exists only at compile time and carries no runtime metadata. `PartialType`, `PickType`, `OmitType` from `@nestjs/swagger` create real classes copying validation, transform, and OpenAPI metadata.

**Follow-up:**

Do they inherit `@Exclude`/`@Expose`?

Answer: Yes, class-transformer metadata is inherited by the mapped types, which is why `OmitType(User, ['password'])` can be useful for response types.

### NEST-280 — How do you document generic responses like `Paginated<T>`

**Difficulty:** Senior

**Category:** OpenAPI / Swagger

**Question:**

How do you document generic responses like `Paginated<T>`?

**Answer:**

Use `@ApiExtraModels(PaginatedDto, ItemDto)` and a schema with `allOf: [{ $ref: getSchemaPath(PaginatedDto) }, { properties: { data: { type: 'array', items: { $ref: getSchemaPath(ItemDto) } } } }]` in `@ApiOkResponse`. Wrap it in a custom `applyDecorators` helper like `@ApiPaginatedResponse(ItemDto)`.

**Follow-up:**

Why not just use a generic class?

Answer: TypeScript generics are erased, so Swagger can't see `T` at runtime. You need to give it the concrete model explicitly.

### NEST-281 — Should Swagger UI be exposed in production

**Difficulty:** Intermediate

**Category:** OpenAPI / Swagger

**Question:**

Should Swagger UI be exposed in production?

**Answer:**

Usually not publicly. Options: disable by environment, protect with basic auth or network rules, or publish the static spec to a developer portal. Exposing it enlarges the attack surface and reveals internal endpoints.

**Follow-up:**

How do you hide internal endpoints but keep the docs?

Answer: `@ApiExcludeController`/`@ApiExcludeEndpoint`, or create separate documents with `include: [PublicModule]` for public vs internal specs.

### NEST-282 — Offset vs cursor pagination: when to choose which

**Difficulty:** Senior

**Category:** Pagination & filtering

**Question:**

Offset vs cursor pagination: when to choose which?

**Answer:**

Offset (`page/limit` or `limit/offset`) is simple, supports jumping to pages, but is slow on large offsets and unstable under inserts/deletes. Cursor (keyset) uses an opaque cursor like `(createdAt, id)`; it's stable and fast, but no random page access.

**Follow-up:**

How do you make a cursor opaque and safe?

Answer: Base64-encode (optionally sign/encrypt) the sort key tuple, validate on decode, and always add a unique tiebreaker (`id`) to the ordering.

### NEST-283 — How do you design a pagination query DTO

**Difficulty:** Intermediate

**Category:** Pagination & filtering

**Question:**

How do you design a pagination query DTO?

**Answer:**

A `PaginationQueryDto` with `@Type(() => Number) @IsInt() @Min(1) @Max(100) @IsOptional() limit = 20` and `page`/`cursor`. Add `@Max` to cap cost, reuse via inheritance or `IntersectionType`, and use `transform: true` so defaults apply.

**Follow-up:**

Why do defaults on DTO properties sometimes not apply?

Answer: Defaults only exist when the pipe instantiates the class (`transform: true` or `plainToInstance`); with a plain object you must use `DefaultValuePipe`.

### NEST-284 — How do you design safe filtering and sorting

**Difficulty:** Senior

**Category:** Pagination & filtering

**Question:**

How do you design safe filtering and sorting?

**Answer:**

Whitelist sortable/filterable fields with `@IsIn([...])`/enum, accept a format like `sort=-createdAt,name`, parse into a typed structure, and map to ORM calls through an allowlist. Never pass raw query strings into `where`/`orderBy`/raw SQL.

**Follow-up:**

What's the risk of arbitrary filter keys?

Answer: Injection/NoSQL operator abuse (`?role[$ne]=x`), exposing hidden columns, and unindexed expensive queries. An allowlist prevents all three.

### NEST-285 — What should a paginated response look like

**Difficulty:** Intermediate

**Category:** Pagination & filtering

**Question:**

What should a paginated response look like?

**Answer:**

An envelope like `{ data: [...], meta: { total?, limit, nextCursor } }` and/or `Link` headers (`rel="next"`, `rel="prev"`), plus `X-Total-Count` when counts are cheap. Keep it consistent across endpoints.

**Follow-up:**

Why can `total` be problematic?

Answer: `COUNT(*)` can be expensive on large tables and inconsistent with concurrent writes; make it optional or approximate.

### NEST-286 — What are idempotency keys and why are they used

**Difficulty:** Intermediate

**Category:** Idempotency

**Question:**

What are idempotency keys and why are they used?

**Answer:**

A client-supplied unique `Idempotency-Key` header for non-idempotent operations (POST payments/orders). The server stores the key with the response so retries return the same result without repeating side effects. Handles network timeouts and client retries safely.

**Follow-up:**

Which HTTP methods are idempotent by definition?

Answer: GET, PUT, DELETE, HEAD, OPTIONS (and TRACE). POST and PATCH aren't, hence keys.

### NEST-287 — How do you implement idempotency keys in Nest

**Difficulty:** Senior

**Category:** Idempotency

**Question:**

How do you implement idempotency keys in Nest?

**Answer:**

An interceptor/guard reads the header, atomically inserts `(key, userId, requestHash, status=in_progress)` (unique constraint or Redis `SET NX`), runs the handler, stores status/body, and on repeat returns the stored response. If the same key arrives with a different payload hash, return 422/409. Add a TTL (e.g., 24h).

**Follow-up:**

What about concurrent duplicate requests?

Answer: The atomic insert/lock ensures only one executes; others either wait or receive `409 Conflict` (in-progress) with `Retry-After`.

### NEST-288 — What is HATEOAS and how much should you do in Nest

**Difficulty:** Intermediate

**Category:** HATEOAS

**Question:**

What is HATEOAS and how much should you do in Nest?

**Answer:**

Responses include links to related actions/resources (`_links: { self, next, cancel }`) so clients discover transitions instead of hardcoding URLs. In Nest you add links in response DTO mappers. Most pragmatic APIs only include light links (pagination, `self`, key actions).

**Follow-up:**

Why do many teams skip full HATEOAS?

Answer: Tooling and clients rarely consume it, it increases payload and complexity, and OpenAPI-generated clients already provide a contract.

### NEST-289 — What is `application/problem+json` (RFC 9457) and why use it

**Difficulty:** Intermediate

**Category:** Error shape

**Question:**

What is `application/problem+json` (RFC 9457) and why use it?

**Answer:**

A standard error format with `type`, `title`, `status`, `detail`, `instance`, plus extension members (e.g., `errors`). It gives clients a consistent, machine-readable shape across all errors, with `Content-Type: application/problem+json`.

**Follow-up:**

What's the default Nest error shape?

Answer: `{ statusCode, message, error }`, where `message` may be a string or array. It's inconsistent across sources, so you normalize it via a filter.

### NEST-290 — How do you enforce a consistent error shape

**Difficulty:** Senior

**Category:** Error shape

**Question:**

How do you enforce a consistent error shape?

**Answer:**

A global `@Catch()` exception filter mapping `HttpException`, validation errors, ORM errors (unique violation → 409), and unknown errors (→ 500) into one format with a `traceId`/correlation ID. Never leak stack traces or SQL in production; log them server-side.

**Follow-up:**

Why catch non-HTTP exceptions too?

Answer: Otherwise unhandled errors fall to Nest's default 500 shape and break consistency; also lets you log and attach correlation IDs centrally.

### NEST-291 — 400 vs 422 for validation failures

**Difficulty:** Intermediate

**Category:** Error shape

**Question:**

400 vs 422 for validation failures?

**Answer:**

400 is the Nest default and widely used for malformed requests. 422 Unprocessable Entity signals syntactically valid but semantically invalid data. Either is acceptable; consistency matters. Use 409 for state conflicts, and 404 for missing resources.

**Follow-up:**

How do you switch to 422 in Nest?

Answer: `new ValidationPipe({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY })` or a custom `exceptionFactory`.

### NEST-292 — How do you handle content negotiation in Nest

**Difficulty:** Intermediate

**Category:** HTTP semantics

**Question:**

How do you handle content negotiation in Nest?

**Answer:**

Express/Fastify parse `Accept`; Nest returns JSON by default. For multiple formats, inspect `req.headers.accept` (or `req.accepts()`), set `@Header('Content-Type', ...)` or use `@Res({ passthrough: true })`, and return `406 Not Acceptable` / `415 Unsupported Media Type` when appropriate. Add `Vary: Accept` for caching.

**Follow-up:**

What's the downside of `@Res()`?

Answer: Using `@Res()` without `passthrough` disables Nest's response handling (interceptors, serialization, `@HttpCode`), so you must send the response manually.

### NEST-293 — How do you expose rate-limit information

**Difficulty:** Intermediate

**Category:** HTTP semantics

**Question:**

How do you expose rate-limit information?

**Answer:**

With `@nestjs/throttler` (`ThrottlerGuard`, `@Throttle`, `@SkipThrottle`) you get `429` and `Retry-After`. Add `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` headers (IETF draft) so clients can back off. Use a Redis storage for multi-instance deployments.

**Follow-up:**

Why is in-memory throttling insufficient in production?

Answer: Each instance has its own counters, so the effective limit multiplies with replicas and resets on deploys; shared storage gives accurate global limits.

### NEST-294 — Which concerns belong in an API gateway vs the Nest service

**Difficulty:** Senior

**Category:** API gateway

**Question:**

Which concerns belong in an API gateway vs the Nest service?

**Answer:**

Gateway: TLS termination, coarse rate limiting, WAF, routing, auth token verification/offloading, request size limits, caching, CORS at the edge, observability. Nest: business validation, authorization (fine-grained), domain rules, idempotency, response shaping. Don't rely solely on the gateway for validation or authz.

**Follow-up:**

Should Nest still validate if the gateway validates schemas?

Answer: Yes. Defense in depth: services can be called internally or bypass the gateway, and gateway schemas can drift from the code.

### NEST-295 — How does `ClassSerializerInterceptor` work with `@Exclude` and `@Expose`

**Difficulty:** Intermediate

**Category:** Serialization

**Question:**

How does `ClassSerializerInterceptor` work with `@Exclude` and `@Expose`?

**Answer:**

The interceptor runs `instanceToPlain` on returned class instances, applying `@Exclude()` (hide, e.g., `password`), `@Expose()` (include/rename/getters), and `@Transform`. Register globally with `APP_INTERCEPTOR` and `Reflector`. Use `strategy: 'excludeAll'` via `@SerializeOptions` for an allowlist.

**Follow-up:**

Why doesn't it work when I return a plain object from a query builder or `.lean()`?

Answer: It only transforms class instances; plain objects have no metadata. Map results into class instances (`plainToInstance`) or use response DTOs.

### NEST-296 — What are `@Transform`, serialization groups, and `@SerializeOptions`

**Difficulty:** Intermediate

**Category:** Serialization

**Question:**

What are `@Transform`, serialization groups, and `@SerializeOptions`?

**Answer:**

`@Transform(({ value }) => ...)` customizes a property at serialization/deserialization (`toClassOnly`/`toPlainOnly`). `@Expose({ groups: ['admin'] })` with `@SerializeOptions({ groups: ['admin'] })` returns role-specific views. `@SerializeOptions({ excludeExtraneousValues })` enforces explicit exposure.

**Follow-up:**

Is group-based serialization a good authorization mechanism?

Answer: It's a presentation concern and error-prone; real authorization should be enforced earlier. Prefer separate response DTOs per audience.

### NEST-297 — Why use response DTOs instead of returning entities

**Difficulty:** Senior

**Category:** Serialization

**Question:**

Why use response DTOs instead of returning entities?

**Answer:**

They decouple the public contract from the schema, prevent leaking fields, allow shape changes (flattened, computed fields), and give accurate Swagger types. Map with `plainToInstance(ResponseDto, entity, { excludeExtraneousValues: true })` and `@Expose()` on exposed fields.

**Follow-up:**

What does `excludeExtraneousValues` do?

Answer: Only properties decorated with `@Expose()` appear in the output, turning serialization into an allowlist and preventing accidental leaks of new columns.

### NEST-298 — How do you handle file uploads with `FileInterceptor`

**Difficulty:** Senior

**Category:** File upload

**Question:**

How do you handle file uploads with `FileInterceptor`?

**Answer:**

`@UseInterceptors(FileInterceptor('file', { limits, storage }))` with `@UploadedFile()` (Multer under Express). Validate with `ParseFilePipe` using `MaxFileSizeValidator` and `FileTypeValidator`; use `@ApiConsumes('multipart/form-data')` for Swagger. `FilesInterceptor`/`FileFieldsInterceptor` handle multiples.

**Follow-up:**

What are the security concerns?

Answer: Don't trust `mimetype`/extension (check magic bytes), enforce size limits, randomize stored names, avoid path traversal, scan for malware, and prefer streaming/pre-signed direct uploads to S3 for large files.

### NEST-299 — When would you choose GraphQL over REST in a Nest project

**Difficulty:** Intermediate

**Category:** GraphQL vs REST

**Question:**

When would you choose GraphQL over REST in a Nest project?

**Answer:**

GraphQL fits many diverse clients needing flexible field selection, aggregating multiple backends (BFF), rapidly evolving UIs, and strongly typed schemas. REST fits simple CRUD, public APIs, HTTP caching/CDN needs, file uploads, webhooks, and teams wanting operational simplicity.

**Follow-up:**

What costs does GraphQL bring?

Answer: N+1 queries (need DataLoader), query complexity/depth limiting, harder HTTP caching, more complex error and auth handling per field, and a steeper operational learning curve.

### NEST-300 — How does API evolution differ between GraphQL and REST, and how do validation concerns carry over

**Difficulty:** Senior

**Category:** GraphQL vs REST

**Question:**

How does API evolution differ between GraphQL and REST, and how do validation concerns carry over?

**Answer:**

GraphQL typically evolves a single schema additively using `@deprecated` and field-level deprecation instead of version numbers; REST commonly versions endpoints. In Nest GraphQL, `ValidationPipe` still validates `@Args()` input classes (`@InputType` + class-validator), but errors surface in the `errors` array with HTTP 200, so you must standardize via `formatError` / error extensions.

**Follow-up:**

Why can a GraphQL response be 200 with errors?

Answer: The transport succeeded while execution partially failed; clients must inspect `errors` and partial `data`. Use `extensions.code` for machine-readable failure types and do not rely on HTTP status.
