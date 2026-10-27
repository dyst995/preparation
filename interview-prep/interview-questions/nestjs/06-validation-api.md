# NEST06 — Validation & API design

NestJS 10 with `class-validator`/`class-transformer`, `@nestjs/swagger`, and the built-in versioning; each question names its stack where relevant. Questions NEST-251–NEST-300.

ValidationPipe options (whitelist, forbidNonWhitelisted, transform), DTO design and mapped types, custom validators, Parse* pipes, URI/header/media-type versioning, OpenAPI/Swagger decorators, pagination/filter/sort query DTOs, idempotency keys, light HATEOAS, problem+json and consistent error shapes, content negotiation, rate-limit headers, gateway vs Nest concerns, serialization (`@Exclude`/`@Expose`, `ClassSerializerInterceptor`), multipart uploads, GraphQL vs REST, and breaking-change strategy.

### NEST-251 — What are the roles of `class-validator` and `class-transformer` in a Nest app

**Difficulty:** Junior

**Category:** ValidationPipe

**Question:**

What are the roles of `class-validator` and `class-transformer` in a Nest app?

**Answer:**

They do two different jobs. `class-transformer` turns plain JSON into real class instances with `plainToInstance`, and turns instances back into plain objects with `instanceToPlain`. It also handles decorators like `@Type`, `@Transform`, `@Exclude`, and `@Expose`. `class-validator` reads decorators such as `@IsEmail` or `@Min` on those instances and reports errors. `ValidationPipe` uses both: it transforms first, then validates. A plain object has no decorators, so there is nothing to validate.

**Follow-up:**

Why must DTOs be classes, not interfaces or types?

Answer: Interfaces and types disappear when TypeScript compiles, so nothing exists at runtime. Decorators and `emitDecoratorMetadata` only work on classes, so the pipe can't find your rules or the parameter type from an interface.

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

### NEST-253 — What does `forbidNonWhitelisted` add on top of `whitelist`

**Difficulty:** Intermediate

**Category:** ValidationPipe

**Question:**

What does `forbidNonWhitelisted` add on top of `whitelist`?

**Answer:**

With `whitelist: true`, unknown properties are silently removed. With `forbidNonWhitelisted: true` added, the pipe instead rejects the request with a 400 error that says something like `property x should not exist`. It only works when `whitelist` is also on. This is useful for strict public APIs, because it exposes client typos early instead of ignoring them. The cost is that it is less forgiving.

**Follow-up:**

When would you avoid it?

Answer: When clients are old or built by third parties and might send extra fields. Strict rejection can turn a harmless client change into an outage, so many teams prefer to be tolerant of extra fields.

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

### NEST-255 — What are the risks of `enableImplicitConversion`

**Difficulty:** Senior

**Category:** ValidationPipe

**Question:**

What are the risks of `enableImplicitConversion`?

**Answer:**

It converts values automatically based on the TypeScript types. That's convenient for query DTOs, but the conversion can be wrong. For booleans, `Boolean("false")` is `true`, because any non-empty string is truthy. It can also turn bad input into valid-looking values, such as `Number("")` becoming 0. It hides what is happening. Prefer explicit `@Type(() => Number)`, and write a custom `@Transform` for booleans.

**Follow-up:**

How do you correctly parse `?active=false`?

Answer: Use `@Transform(({ value }) => value === 'true' || value === true)` together with `@IsBoolean()`. For a single parameter, `ParseBoolPipe` works too. Don't rely on implicit conversion for booleans.

### NEST-256 — What are DTO design principles for a good API

**Difficulty:** Intermediate

**Category:** DTO design

**Question:**

What are DTO design principles for a good API?

**Answer:**

Treat DTOs as your public contract. Use separate DTOs for input and output, and one DTO per use case, such as `CreateUserDto` and `UpdateUserDto`. Never bind database entities directly to requests. Keep DTOs flat when you can, validate at the edge of the app, and name them by intent. Avoid exposing internal ids or fields clients don't need. Entities are your storage model, and they should be free to change without breaking clients.

**Follow-up:**

Why not reuse the TypeORM/Prisma entity as the DTO?

Answer: It ties your API to your database schema, so any schema change can break clients. It also risks mass assignment and leaking sensitive columns, and mixes persistence decorators with validation rules.

### NEST-257 — What are mapped types (`PartialType`, `PickType`, `OmitType`, `IntersectionType`)

**Difficulty:** Intermediate

**Category:** DTO design

**Question:**

What are mapped types (`PartialType`, `PickType`, `OmitType`, `IntersectionType`)?

**Answer:**

They are helper functions that build a new DTO class from an existing one, so you don't copy and paste fields. The new class inherits the validation rules, and the Swagger metadata too if you import them from `@nestjs/swagger`. `PartialType` makes everything optional, `PickType` keeps selected fields, `OmitType` removes some, and `IntersectionType` combines two classes. A common example is `UpdateDto = PartialType(CreateDto)`.

**Follow-up:**

Why import from `@nestjs/swagger` instead of `@nestjs/mapped-types` when using Swagger?

Answer: The Swagger version also copies `@ApiProperty` metadata. The `@nestjs/mapped-types` version copies only validation and transform metadata, so your OpenAPI schema would be incomplete.

### NEST-258 — How do you validate nested objects

**Difficulty:** Intermediate

**Category:** DTO design

**Question:**

How do you validate nested objects?

**Answer:**

Use two decorators together: `@ValidateNested()` and `@Type(() => ChildDto)`. The `@Type` decorator tells class-transformer to create a real `ChildDto` instance, and `@ValidateNested()` tells class-validator to check it. For arrays of objects, add `{ each: true }`. If you leave out `@Type`, the child stays a plain object with no decorators, so nothing inside it gets validated.

**Follow-up:**

What happens with `@ValidateNested()` on a property whose value is `undefined`?

Answer: It passes. `@ValidateNested` only checks values that exist. For a required nested object, add `@IsDefined()` or `@IsNotEmpty()` as well.

### NEST-259 — How do you validate each element of an array

**Difficulty:** Intermediate

**Category:** DTO design

**Question:**

How do you validate each element of an array?

**Answer:**

First add `@IsArray()`. Then put `{ each: true }` on the element validators, for example `@IsInt({ each: true })`. You can limit the array with `@ArrayMinSize`, `@ArrayMaxSize`, and `@ArrayUnique`. If the elements are objects, use `@ValidateNested({ each: true })` with `@Type`. When the whole request body is an array, use `ParseArrayPipe({ items: Dto })`, because a top-level array can't carry decorators.

**Follow-up:**

Why put a max size on arrays?

Answer: To prevent abuse. Huge arrays mean big payloads, expensive validation, and large database `IN` clauses. Combine it with a body-size limit on the HTTP adapter.

### NEST-260 — How do you write a custom validation decorator

**Difficulty:** Intermediate

**Category:** Custom validators

**Question:**

How do you write a custom validation decorator?

**Answer:**

Write a class that implements `ValidatorConstraintInterface`, with a `validate` method and a `defaultMessage` method. Then either wrap it in your own decorator using `registerDecorator`, or use it directly with `@ValidatorConstraint({ name })` and `@Validate(MyConstraint)`. Custom validators are useful for cross-field checks like "password and confirmation match", domain rules, and special formats that built-in decorators don't cover.

**Follow-up:**

How do you do a cross-field validation like `endDate > startDate`?

Answer: In the constraint's `validate(value, args)`, read the whole object from `args.object` and compare against the other property named in `args.constraints[0]`. If the rule is really a business rule, validate it in the service instead.

### NEST-261 — How do you use dependency injection in a custom validator (e.g., unique email)

**Difficulty:** Senior

**Category:** Custom validators

**Question:**

How do you use dependency injection in a custom validator (e.g., unique email)?

**Answer:**

By default class-validator creates its own validator instances, so injection doesn't work. To fix that, mark the constraint class `@Injectable()` and `@ValidatorConstraint({ async: true })`, and register it as a provider in a module. Then, in `main.ts`, call `useContainer(app.select(AppModule), { fallbackOnErrors: true })`. This tells class-validator to get its validators from Nest's container, so your constraint can inject, for example, a users service.

**Follow-up:**

Is a uniqueness validator a good idea?

Answer: It gives users a friendlier 400 error, but it can race: two requests can pass the check at the same time. You still need a database unique constraint and should map its violation to a 409. Treat the validator as a convenience, and the constraint as the truth.

### NEST-262 — How do you handle conditional validation

**Difficulty:** Intermediate

**Category:** Custom validators

**Question:**

How do you handle conditional validation?

**Answer:**

Use `@ValidateIf((o) => o.type === 'card')`. When the condition returns false, all other validators on that property are skipped. Another option is validation groups: mark rules with `@IsString({ groups: ['create'] })` and pass `groups` to `ValidationPipe`. Groups work, but they hide the real contract inside decorators. In most cases, separate DTOs for separate situations are clearer.

**Follow-up:**

Why prefer separate DTOs over groups?

Answer: Groups bury the rules in decorators and make Swagger docs and TypeScript types less precise. Separate DTOs, or discriminated unions, are explicit and easier to document and test.

### NEST-263 — How do you customize validation error responses

**Difficulty:** Senior

**Category:** Error shape

**Question:**

How do you customize validation error responses?

**Answer:**

Pass an `exceptionFactory` to `ValidationPipe`. It receives the list of `ValidationError` objects, and you return your own exception, such as `new BadRequestException({...})`. Inside, flatten the constraints into your standard error shape, for example field, code, and message. You can also use `errorHttpStatusCode` to change the status code, and `disableErrorMessages` to hide details in production.

**Follow-up:**

How do you flatten nested errors?

Answer: Walk through `ValidationError.children` recursively. Build dotted paths like `address.zip`, and collect the `constraints` at each level.

### NEST-264 — What do `ParseIntPipe` and `ParseUUIDPipe` do

**Difficulty:** Junior

**Category:** Pipes

**Question:**

What do `ParseIntPipe` and `ParseUUIDPipe` do?

**Answer:**

They are built-in pipes that you attach to a single route or query parameter. `ParseIntPipe` converts the value to an integer, and throws a 400 error if it isn't one. `ParseUUIDPipe`, optionally with `{ version: '4' }`, checks that the value is a valid UUID. Both stop bad input early, before it reaches your service or database. So `@Param('id', ParseIntPipe) id: number` gives you a real number.

**Follow-up:**

How do you change the error status or message?

Answer: Pass `{ errorHttpStatusCode }` or an `exceptionFactory` to the pipe. In practice, keep 400 for malformed input and use 404 inside the service when the record isn't found.

### NEST-265 — What other built-in Parse* pipes exist and what's `DefaultValuePipe` for

**Difficulty:** Junior

**Category:** Pipes

**Question:**

What other built-in Parse* pipes exist and what's `DefaultValuePipe` for?

**Answer:**

Nest also has `ParseFloatPipe`, `ParseBoolPipe`, `ParseArrayPipe`, `ParseEnumPipe`, `ParseFilePipe`, and, in newer 10.x versions, `ParseDatePipe`. `DefaultValuePipe` provides a value when the parameter is missing. You chain it before the parse pipe, like this: `@Query('limit', new DefaultValuePipe(10), ParseIntPipe)`. Then a request without `limit` gets 10, and a request with `limit=abc` still fails.

**Follow-up:**

Why must `DefaultValuePipe` come first?

Answer: Pipes run from left to right. `ParseIntPipe` would throw on `undefined`, so the default has to fill in the value before parsing happens.

### NEST-266 — How do you write a custom pipe

**Difficulty:** Intermediate

**Category:** Pipes

**Question:**

How do you write a custom pipe?

**Answer:**

Create an `@Injectable()` class that implements `PipeTransform` with a `transform(value, metadata)` method. If the value is bad, throw an HTTP exception. Otherwise return the value, possibly changed, and the request continues. The `metadata` tells you where the value came from (`type`: body, query, param, or custom), plus the `metatype` and `data`. Pipes are good for trimming, sanitizing, parsing, or schema validation with libraries such as Zod or Joi.

**Follow-up:**

How would you use Zod instead of class-validator?

Answer: Write a `ZodValidationPipe(schema)` that calls `schema.safeParse` and throws if it fails. You infer TypeScript types from the schema with `z.infer`, so you don't need a class plus decorators. A library like `nestjs-zod` adds Swagger support.

### NEST-267 — What's the difference between `app.useGlobalPipes()` and `APP_PIPE`

**Difficulty:** Intermediate

**Category:** Pipes

**Question:**

What's the difference between `app.useGlobalPipes()` and `APP_PIPE`?

**Answer:**

`app.useGlobalPipes()` is called in `main.ts`, outside Nest's dependency injection, so that pipe can't inject any providers. Registering `{ provide: APP_PIPE, useValue or useClass }` inside a module puts the pipe in the container, so it can use dependencies. It also applies whenever the app is built from the module, including in e2e tests. With `useGlobalPipes`, you must repeat the setup in every test.

**Follow-up:**

Why do e2e tests sometimes miss validation?

Answer: The global pipes in `main.ts` don't run when tests build the app with `Test.createTestingModule`. You have to call `app.useGlobalPipes` again in the test, or register the pipe with `APP_PIPE`.

### NEST-268 — In what order do middleware, guards, interceptors, and pipes run, and where does validation fit

**Difficulty:** Intermediate

**Category:** Request lifecycle

**Question:**

In what order do middleware, guards, interceptors, and pipes run, and where does validation fit?

**Answer:**

The order is: middleware, then guards, then the "before" part of interceptors, then pipes, then your handler. After the handler, the "after" part of interceptors runs, and exception filters handle any errors. Validation lives in pipes, so it happens late. That's useful: an unauthenticated request is rejected by the guard first, before the app spends time validating the body.

**Follow-up:**

Why does that order matter for security?

Answer: Validation errors reveal details about your schema. Running guards first stops unauthenticated users from probing your contract, and avoids parsing work for requests that would be rejected anyway.

### NEST-269 — How does URI versioning work in Nest 10

**Difficulty:** Junior

**Category:** Versioning

**Question:**

How does URI versioning work in Nest 10?

**Answer:**

First enable it with `app.enableVersioning({ type: VersioningType.URI })`. Then declare the version on the controller: `@Controller({ path: 'users', version: '1' })`. That serves the routes under `/v1/users`, since the default prefix is `v`. It's the simplest style to understand. The version is visible in the URL, so it's easy to route, cache, test in a browser, and document.

**Follow-up:**

What are the trade-offs of URI versioning?

Answer: Pros: it's explicit and easy to route, cache, and document. Cons: a URL is meant to identify a resource, not a version of it, and clients must change URLs to upgrade. It also encourages bumping the whole API at once.

### NEST-270 — How does header versioning work

**Difficulty:** Senior

**Category:** Versioning

**Question:**

How does header versioning work?

**Answer:**

You enable it with `enableVersioning({ type: VersioningType.HEADER, header: 'X-API-Version' })`. Clients send the version in that header, and Nest picks the handler that matches the value. The advantage is that URLs never change. The disadvantages are that it's harder to discover, and you can't simply paste a URL into a browser to try a version. Tools and documentation also need to mention the header.

**Follow-up:**

What must you set for caches?

Answer: Send `Vary: X-API-Version`. Without it, a shared cache may return the response for one version to a client that asked for another.

### NEST-271 — How does media type versioning work

**Difficulty:** Intermediate

**Category:** Versioning

**Question:**

How does media type versioning work?

**Answer:**

Nest reads the version from the `Accept` header. You configure it with `type: VersioningType.MEDIA_TYPE, key: 'v='`, and a client sends something like `Accept: application/json;v=2`. This matches how HTTP content negotiation is meant to work: the same URL, but different representations. However, it's the hardest style for clients and tools to use, because many tools don't make it easy to control the `Accept` header.

**Follow-up:**

When would you pick it?

Answer: For hypermedia-style REST, or when the same URL must serve several representations. Most teams choose URI versioning because it's simpler.

### NEST-272 — What are custom versioning and `VERSION_NEUTRAL`

**Difficulty:** Senior

**Category:** Versioning

**Question:**

What are custom versioning and `VERSION_NEUTRAL`?

**Answer:**

Custom versioning uses `type: VersioningType.CUSTOM` and an `extractor: (req) => string | string[]` function that you write. It can read the version from anything, such as a query parameter, subdomain, or JWT claim, and returns an ordered list of preferred versions. `VERSION_NEUTRAL` marks a route that should match regardless of the requested version. A health endpoint like `/health` is a common example.

**Follow-up:**

Can a route support multiple versions?

Answer: Yes. Use `@Version(['1', '2'])` on a method, or `version: ['1', '2']` on a controller. That's handy when v2 changes only some endpoints.

### NEST-273 — How do you apply versions at controller vs route level

**Difficulty:** Intermediate

**Category:** Versioning

**Question:**

How do you apply versions at controller vs route level?

**Answer:**

A `version` set on the controller applies to all its routes. Putting `@Version('2')` on a method overrides it for just that route. A practical approach is to leave the v1 controller untouched and add a v2 controller, or only a v2 handler, that calls the same service. Each version has its own DTOs and mappers, but the business logic stays in one place.

**Follow-up:**

How do you avoid duplicating business logic across versions?

Answer: Keep versions in the transport layer: separate controllers, DTOs, and mappers per version, all calling one domain service. Only fork the service if behavior truly differs.

### NEST-274 — What counts as a breaking change in an API

**Difficulty:** Senior

**Category:** Breaking changes

**Question:**

What counts as a breaking change in an API?

**Answer:**

A change is breaking if existing clients can stop working without any code change on their side. Examples: removing or renaming fields or endpoints, changing a field's type, making an optional field required, and making validation stricter. Changing status codes, error shapes, pagination defaults, authentication requirements, or the meaning of a field also breaks clients. Adding new optional fields or new endpoints is usually safe.

**Follow-up:**

Is adding an enum value breaking?

Answer: It can be, for clients that handle every known value in a strict switch. Document that clients must tolerate unknown values, or release it as a new version.

### NEST-275 — What's a sound versioning and deprecation strategy

**Difficulty:** Senior

**Category:** Breaking changes

**Question:**

What's a sound versioning and deprecation strategy?

**Answer:**

Prefer changes that don't break anyone. Use expand and contract: add the new behavior, migrate clients, then remove the old one. Only create a new version when a breaking change is unavoidable, and support the current and previous versions. When deprecating, announce it with `Deprecation` and `Sunset` headers and a changelog. Watch usage per version before removing anything, and use contract tests to catch accidental breaks.

**Follow-up:**

How do you know it's safe to remove v1?

Answer: Track traffic per version and per client in logs or metrics. When usage is zero, or affected clients have agreed, and the sunset date has passed, remove it. A period of `410 Gone` responses can help.

### NEST-276 — How do you set up Swagger/OpenAPI in Nest

**Difficulty:** Junior

**Category:** OpenAPI / Swagger

**Question:**

How do you set up Swagger/OpenAPI in Nest?

**Answer:**

Build a config with `new DocumentBuilder().setTitle(...).setVersion(...).addBearerAuth().build()`. Then call `SwaggerModule.createDocument(app, config)` to generate the document, and `SwaggerModule.setup('docs', app, document)` to serve it. Nest inspects your routes and DTO metadata to produce the spec, so the docs stay close to the code. You get an interactive UI at `/docs` and the raw JSON at `/docs-json`, which other tools can consume.

**Follow-up:**

How do you export the spec for client generation?

Answer: Write `JSON.stringify(document)` to a file in a build script, or fetch `/docs-json`. Then feed it to a generator like `openapi-generator`, `orval`, or `openapi-typescript` in CI.

### NEST-277 — What are `@ApiProperty` and the Swagger CLI plugin

**Difficulty:** Intermediate

**Category:** OpenAPI / Swagger

**Question:**

What are `@ApiProperty` and the Swagger CLI plugin?

**Answer:**

`@ApiProperty({ description, example, enum, required })` documents a DTO field in the OpenAPI schema. Writing it on every field gets repetitive, so Nest offers a CLI plugin. Add `'@nestjs/swagger'` to `plugins` in `nest-cli.json`. At build time it infers properties from TypeScript types, class-validator decorators, and JSDoc comments in files named `*.dto.ts` or `*.entity.ts`. That removes most of the boilerplate.

**Follow-up:**

What are the plugin's limitations?

Answer: It only works when the Nest CLI compiler builds your code, so plain `ts-node` or some Jest setups need extra configuration. Complex types, such as generics and unions, still need an explicit `@ApiProperty({ type })`.

### NEST-278 — Which decorators document controllers

**Difficulty:** Junior

**Category:** OpenAPI / Swagger

**Question:**

Which decorators document controllers?

**Answer:**

Several decorators from `@nestjs/swagger` describe a controller. `@ApiTags` groups endpoints, and `@ApiOperation({ summary })` describes one. For responses, use `@ApiResponse` or shortcuts like `@ApiOkResponse`, `@ApiCreatedResponse`, and `@ApiBadRequestResponse`. For inputs, use `@ApiQuery`, `@ApiParam`, `@ApiBody`, `@ApiHeader`, and `@ApiConsumes('multipart/form-data')`. `@ApiBearerAuth` documents authentication, and `@ApiExcludeEndpoint` hides a route. Together they turn your controllers into a clear, usable API reference.

**Follow-up:**

Why document error responses?

Answer: Clients and generated SDKs need to know what failures look like, such as the 401, 403, 404, 409, and 422 shapes, not only the success case.

### NEST-279 — How do Swagger mapped types differ from plain TS utility types

**Difficulty:** Intermediate

**Category:** OpenAPI / Swagger

**Question:**

How do Swagger mapped types differ from plain TS utility types?

**Answer:**

TypeScript's `Partial<T>` exists only at compile time. After compilation it disappears, so it carries no runtime information that validation or Swagger can use. `PartialType`, `PickType`, and `OmitType` from `@nestjs/swagger` are real functions that create real classes at runtime. They copy the validation, transform, and OpenAPI metadata from the original class, so the new DTO validates and documents itself correctly.

**Follow-up:**

Do they inherit `@Exclude`/`@Expose`?

Answer: Yes, class-transformer metadata is inherited too. That's why something like `OmitType(User, ['password'])` can be useful for response types.

### NEST-280 — How do you document generic responses like `Paginated<T>`

**Difficulty:** Senior

**Category:** OpenAPI / Swagger

**Question:**

How do you document generic responses like `Paginated<T>`?

**Answer:**

Swagger can't see TypeScript generics, so you describe the shape manually. Register both models with `@ApiExtraModels(PaginatedDto, ItemDto)`. Then, in `@ApiOkResponse`, write a schema using `allOf`: reference `PaginatedDto` with `getSchemaPath`, and override the `data` property as an array of `ItemDto`. To avoid repeating this, wrap it in a custom decorator built with `applyDecorators`, such as `@ApiPaginatedResponse(ItemDto)`.

**Follow-up:**

Why not just use a generic class?

Answer: TypeScript generics are erased at compile time, so Swagger can't know what `T` is at runtime. You have to give it the concrete model explicitly.

### NEST-281 — Should Swagger UI be exposed in production

**Difficulty:** Intermediate

**Category:** OpenAPI / Swagger

**Question:**

Should Swagger UI be exposed in production?

**Answer:**

Usually not to the public. A public Swagger UI shows every endpoint, including internal ones, and makes it easier for attackers to explore your API. Better options are to turn it off based on the environment, protect it with basic auth or network rules, or publish only the static spec to a developer portal. The right choice depends on whether your API is meant to be used publicly.

**Follow-up:**

How do you hide internal endpoints but keep the docs?

Answer: Use `@ApiExcludeController` or `@ApiExcludeEndpoint`. Or create separate documents, using `include: [PublicModule]`, for public and internal specs.

### NEST-282 — Offset vs cursor pagination: when to choose which

**Difficulty:** Senior

**Category:** Pagination & filtering

**Question:**

Offset vs cursor pagination: when to choose which?

**Answer:**

Offset pagination uses `page` and `limit`, or `limit` and `offset`. It's simple and lets users jump to any page, but it gets slow with large offsets, and results can shift when rows are inserted or deleted. Cursor, or keyset, pagination uses an opaque marker built from the last item's sort values, such as `(createdAt, id)`. It's stable and fast, but you can't jump to a random page. Choose offset for admin tables, cursor for feeds and large datasets.

**Follow-up:**

How do you make a cursor opaque and safe?

Answer: Base64-encode the sort values, and optionally sign or encrypt them. Validate the cursor when decoding it, and always include a unique tiebreaker like `id` in the ordering.

### NEST-283 — How do you design a pagination query DTO

**Difficulty:** Intermediate

**Category:** Pagination & filtering

**Question:**

How do you design a pagination query DTO?

**Answer:**

Create a `PaginationQueryDto` with validated fields, such as `@Type(() => Number) @IsInt() @Min(1) @Max(100) @IsOptional() limit = 20`, plus `page` or `cursor`. The `@Type` converts the query string to a number, and `@Max` caps how expensive one request can be. Reuse the DTO through inheritance or `IntersectionType`. Enable `transform: true` in `ValidationPipe`, so the default values actually apply.

**Follow-up:**

Why do defaults on DTO properties sometimes not apply?

Answer: Property defaults only exist when the pipe creates a class instance, which needs `transform: true` or `plainToInstance`. With a plain object, use `DefaultValuePipe` instead.

### NEST-284 — How do you design safe filtering and sorting

**Difficulty:** Senior

**Category:** Pagination & filtering

**Question:**

How do you design safe filtering and sorting?

**Answer:**

Only allow fields you choose. Validate sort and filter fields with `@IsIn([...])` or an enum. Accept a clear format, such as `sort=-createdAt,name`, and parse it into a typed structure. Then translate it into ORM calls through an allowlist. Never pass raw query strings directly into `where`, `orderBy`, or raw SQL, because the client then controls your query.

**Follow-up:**

What's the risk of arbitrary filter keys?

Answer: Clients could inject operators, like `?role[$ne]=x`, read hidden columns, or trigger slow queries on unindexed fields. An allowlist prevents all three.

### NEST-285 — What should a paginated response look like

**Difficulty:** Intermediate

**Category:** Pagination & filtering

**Question:**

What should a paginated response look like?

**Answer:**

Wrap the results in an envelope, for example `{ data: [...], meta: { total?, limit, nextCursor } }`. You can also use `Link` headers with `rel="next"` and `rel="prev"`, and an `X-Total-Count` header when counting is cheap. The most important thing is consistency: every list endpoint should return the same shape, so clients can reuse one pagination helper everywhere.

**Follow-up:**

Why can `total` be problematic?

Answer: `COUNT(*)` can be expensive on large tables, and the number can be out of date when rows change at the same time. Make it optional, or return an approximate value.

### NEST-286 — What are idempotency keys and why are they used

**Difficulty:** Intermediate

**Category:** Idempotency

**Question:**

What are idempotency keys and why are they used?

**Answer:**

An idempotency key is a unique value, sent by the client in an `Idempotency-Key` header, for operations that aren't naturally safe to repeat, like a POST that creates a payment or order. The server saves the key together with the response. If the client retries with the same key, the server returns the saved response instead of running the operation again. This protects against double charges after timeouts or network retries.

**Follow-up:**

Which HTTP methods are idempotent by definition?

Answer: GET, PUT, DELETE, HEAD, and OPTIONS (and TRACE). POST and PATCH are not, which is why keys are used for them.

### NEST-287 — How do you implement idempotency keys in Nest

**Difficulty:** Senior

**Category:** Idempotency

**Question:**

How do you implement idempotency keys in Nest?

**Answer:**

Use an interceptor or guard that reads the header. It atomically inserts a record such as `(key, userId, requestHash, status = in_progress)`, using a unique constraint or Redis `SET NX`. Then it runs the handler and saves the status and response body. On a repeat, it returns the stored response. If the same key arrives with a different payload hash, reject it with 422 or 409. Give records a TTL, such as 24 hours.

**Follow-up:**

What about concurrent duplicate requests?

Answer: The atomic insert or lock lets only one request run. The others either wait, or receive `409 Conflict` for "in progress", ideally with a `Retry-After` header.

### NEST-288 — What is HATEOAS and how much should you do in Nest

**Difficulty:** Intermediate

**Category:** HATEOAS

**Question:**

What is HATEOAS and how much should you do in Nest?

**Answer:**

HATEOAS means responses include links to related resources and the actions available next, such as `_links: { self, next, cancel }`. Clients follow those links instead of hardcoding URLs. In Nest you usually add the links in your response DTO mappers. Full HATEOAS is rarely worth the effort. Most practical APIs include only a few useful links, like `self`, pagination links, and perhaps key actions.

**Follow-up:**

Why do many teams skip full HATEOAS?

Answer: Few clients actually use the links, it makes payloads bigger and code more complex, and OpenAPI-generated clients already provide a clear contract.

### NEST-289 — What is `application/problem+json` (RFC 9457) and why use it

**Difficulty:** Intermediate

**Category:** Error shape

**Question:**

What is `application/problem+json` (RFC 9457) and why use it?

**Answer:**

It's a standard format for API errors. A response has fields like `type`, `title`, `status`, `detail`, and `instance`, and you can add your own extension fields, such as an `errors` list for validation problems. It's sent with `Content-Type: application/problem+json`. Because the format is standard, clients can handle all errors in one consistent, machine-readable way, instead of learning a different shape for each endpoint.

**Follow-up:**

What's the default Nest error shape?

Answer: `{ statusCode, message, error }`, where `message` can be a string or an array. It varies depending on where the error came from, so normalize it with an exception filter.

### NEST-290 — How do you enforce a consistent error shape

**Difficulty:** Senior

**Category:** Error shape

**Question:**

How do you enforce a consistent error shape?

**Answer:**

Create a global exception filter with `@Catch()` that handles every kind of error. It maps `HttpException`, validation errors, and ORM errors, such as a unique violation to 409, and treats anything unknown as a 500. All of them are turned into one format, including a `traceId` or correlation ID. In production, never send stack traces or SQL to the client. Log those on the server instead.

**Follow-up:**

Why catch non-HTTP exceptions too?

Answer: Otherwise unexpected errors fall through to Nest's default 500 response, which breaks your format. Catching them also lets you log them and attach correlation IDs in one place.

### NEST-291 — 400 vs 422 for validation failures

**Difficulty:** Intermediate

**Category:** Error shape

**Question:**

400 vs 422 for validation failures?

**Answer:**

Nest uses 400 by default, and it's widely used for requests that are invalid. 422 Unprocessable Entity says the request was well formed, but the data doesn't make sense. Both are acceptable, and consistency matters more than which you pick. Keep the other codes distinct: use 409 for conflicts with the current state, such as duplicates, and 404 when the resource doesn't exist.

**Follow-up:**

How do you switch to 422 in Nest?

Answer: Use `new ValidationPipe({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY })`, or a custom `exceptionFactory`.

### NEST-292 — How do you handle content negotiation in Nest

**Difficulty:** Intermediate

**Category:** HTTP semantics

**Question:**

How do you handle content negotiation in Nest?

**Answer:**

Nest returns JSON by default. If you need several formats, inspect the request's `Accept` header, using `req.headers.accept` or `req.accepts()`. Then set the response type with `@Header('Content-Type', ...)`, or with `@Res({ passthrough: true })`. Return `406 Not Acceptable` when you can't produce the requested format, and `415 Unsupported Media Type` when you can't read the request's format. Add `Vary: Accept` so caches behave correctly.

**Follow-up:**

What's the downside of `@Res()`?

Answer: Using `@Res()` without `passthrough` turns off Nest's response handling, including interceptors, serialization, and `@HttpCode`. You must then send the response yourself.

### NEST-293 — How do you expose rate-limit information

**Difficulty:** Intermediate

**Category:** HTTP semantics

**Question:**

How do you expose rate-limit information?

**Answer:**

With `@nestjs/throttler`, you use `ThrottlerGuard`, `@Throttle`, and `@SkipThrottle`. When a client goes over the limit, it gets a `429` response with a `Retry-After` header. To help clients slow down before that happens, also send `RateLimit-Limit`, `RateLimit-Remaining`, and `RateLimit-Reset` headers, following the IETF draft. In production with several instances, use Redis storage for the counters.

**Follow-up:**

Why is in-memory throttling insufficient in production?

Answer: Each instance keeps its own counters, so the real limit multiplies with the number of replicas, and counters reset on every deploy. Shared storage gives accurate global limits.

### NEST-294 — Which concerns belong in an API gateway vs the Nest service

**Difficulty:** Senior

**Category:** API gateway

**Question:**

Which concerns belong in an API gateway vs the Nest service?

**Answer:**

The gateway handles general, edge-level concerns: TLS termination, coarse rate limiting, a web application firewall, routing, token verification, request size limits, caching, edge CORS, and observability. The Nest service handles anything tied to your business: detailed validation, fine-grained authorization, domain rules, idempotency, and response shaping. Don't depend only on the gateway for validation or authorization, because the service must stay safe by itself.

**Follow-up:**

Should Nest still validate if the gateway validates schemas?

Answer: Yes, as defense in depth. Services can be called internally or bypass the gateway, and gateway schemas can drift out of sync with the code.

### NEST-295 — How does `ClassSerializerInterceptor` work with `@Exclude` and `@Expose`

**Difficulty:** Intermediate

**Category:** Serialization

**Question:**

How does `ClassSerializerInterceptor` work with `@Exclude` and `@Expose`?

**Answer:**

The interceptor takes the class instances your handler returns and runs `instanceToPlain` on them. During that step, `@Exclude()` hides a property, such as `password`, and `@Expose()` includes, renames, or computes properties. `@Transform` also applies. Register it globally with `APP_INTERCEPTOR`, since it needs `Reflector`. For an allowlist approach, add `@SerializeOptions({ strategy: 'excludeAll' })`, so only `@Expose()` fields appear.

**Follow-up:**

Why doesn't it work when I return a plain object from a query builder or raw query?

Answer: The interceptor only transforms class instances, and plain objects carry no decorator metadata. Convert results to class instances with `plainToInstance`, or map them to response DTOs.

### NEST-296 — What are `@Transform`, serialization groups, and `@SerializeOptions`

**Difficulty:** Intermediate

**Category:** Serialization

**Question:**

What are `@Transform`, serialization groups, and `@SerializeOptions`?

**Answer:**

`@Transform(({ value }) => ...)` changes a property's value during conversion, and you can limit it with `toClassOnly` or `toPlainOnly`. Groups let one class produce different views: mark a field with `@Expose({ groups: ['admin'] })`, and apply `@SerializeOptions({ groups: ['admin'] })` on a handler to include it. `@SerializeOptions` also accepts other options, such as `excludeExtraneousValues`, to require explicit exposure.

**Follow-up:**

Is group-based serialization a good authorization mechanism?

Answer: No. It's a presentation tool and easy to get wrong. Enforce real authorization earlier, and prefer separate response DTOs for different audiences.

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

### NEST-298 — How do you handle file uploads with `FileInterceptor`

**Difficulty:** Senior

**Category:** File upload

**Question:**

How do you handle file uploads with `FileInterceptor`?

**Answer:**

Add `@UseInterceptors(FileInterceptor('file', { limits, storage }))` to the route and read the file with `@UploadedFile()`. Under Express, this uses Multer. To check the upload, use `ParseFilePipe` with `MaxFileSizeValidator` and `FileTypeValidator`. For Swagger, add `@ApiConsumes('multipart/form-data')`. For several files, use `FilesInterceptor` or `FileFieldsInterceptor`. Remember that uploads are untrusted input, so validate carefully.

**Follow-up:**

What are the security concerns?

Answer: Don't trust the `mimetype` or file extension; check the file's magic bytes. Enforce size limits, give stored files random names, prevent path traversal, and scan for malware. For large files, use pre-signed direct uploads to S3.

### NEST-299 — When would you choose GraphQL over REST in a Nest project

**Difficulty:** Intermediate

**Category:** GraphQL vs REST

**Question:**

When would you choose GraphQL over REST in a Nest project?

**Answer:**

GraphQL fits when many different clients need to choose exactly which fields they get, when you combine data from several backends as a backend-for-frontend, when UIs change quickly, or when you want a strongly typed schema. REST fits simple CRUD, public APIs, cases that benefit from HTTP caching and CDNs, file uploads, webhooks, and teams that want simpler operations. Pick based on your clients and team, not on trends.

**Follow-up:**

What costs does GraphQL bring?

Answer: N+1 queries that need DataLoader, query depth and complexity limits, harder HTTP caching, more complex error handling and authorization per field, and a steeper operational learning curve.

### NEST-300 — How does API evolution differ between GraphQL and REST, and how do validation concerns carry over

**Difficulty:** Senior

**Category:** GraphQL vs REST

**Question:**

How does API evolution differ between GraphQL and REST, and how do validation concerns carry over?

**Answer:**

GraphQL usually keeps one schema and evolves it by adding fields and marking old ones with `@deprecated`, instead of using version numbers. REST commonly versions endpoints. Validation carries over: in Nest GraphQL, `ValidationPipe` still checks `@Args()` input classes defined with `@InputType` and class-validator. The difference is how errors appear. They go into the `errors` array of a response that is usually HTTP 200, so standardize them with `formatError` or error extensions.

**Follow-up:**

Why can a GraphQL response be 200 with errors?

Answer: The request itself succeeded, but part of the execution failed. Clients must check `errors` and any partial `data`. Use `extensions.code` for machine-readable error types, and don't rely on the HTTP status.
