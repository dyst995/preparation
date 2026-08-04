# 02 - REST Design, Validation & Swagger: DTOs, Pipes, Interceptors, Filters, OpenAPI

> Goal: design a clean REST API surface, enforce input correctness at the edge, shape consistent responses/errors, and document all of it automatically - the daily bread-and-butter of NestJS interviews.

Mark progress with `[x]` as you master each topic.

---

## Learning objectives

By the end of this section you should be able to:

1. Design REST resources with correct verbs, status codes, and URL structure.
2. Write DTOs with `class-validator`/`class-transformer` and explain the validation pipeline.
3. Explain and write custom pipes, and configure the global `ValidationPipe` correctly.
4. Explain interceptors and use them for response shaping, logging, and timeouts.
5. Explain the exception hierarchy and write custom exception filters.
6. Wire up Swagger/OpenAPI so DTOs generate accurate, browsable API docs.
7. Recite the exact execution order of middleware/guards/interceptors/pipes/filters.

---

## 1. REST API design

### Topics to learn
- [ ] Resource-oriented URLs (nouns, not verbs)
- [ ] HTTP verb semantics: GET/POST/PUT/PATCH/DELETE
- [ ] Status code discipline (2xx/4xx/5xx meaning)
- [ ] Pagination, filtering, sorting conventions
- [ ] Idempotency (which verbs must be idempotent, and why POST usually isn't)
- [ ] Versioning strategies (URI `/v1/`, header, media type)
- [ ] Nested resources vs flat resources with query filters

### Resource naming

| Good | Bad | Why |
|---|---|---|
| `GET /appointments/:id` | `GET /getAppointment?id=1` | Resource is a noun, not an RPC-style verb |
| `POST /appointments` | `POST /appointments/create` | The verb is already `POST` |
| `GET /vets/:id/appointments` | `GET /getVetAppointments/:id` | Nesting expresses the relationship |
| `PATCH /appointments/:id` | `POST /appointments/:id/update` | Partial update maps to PATCH |

### HTTP verbs

| Verb | Semantics | Idempotent? | Typical status |
|---|---|---|---|
| GET | Read, no side effects | Yes | 200 |
| POST | Create, or trigger a non-idempotent action | No | 201 (created) / 200 |
| PUT | Full replace of a resource | Yes | 200 / 204 |
| PATCH | Partial update | Not guaranteed, usually treated as yes | 200 |
| DELETE | Remove a resource | Yes (deleting twice = still gone) | 204 / 200 |

### Status codes worth knowing cold

| Code | Meaning | Example |
|---|---|---|
| 200 | OK | Successful GET/PATCH |
| 201 | Created | Successful POST creating a resource |
| 204 | No Content | Successful DELETE, no body |
| 400 | Bad Request | Failed validation |
| 401 | Unauthorized | Missing/invalid credentials (not authenticated) |
| 403 | Forbidden | Authenticated but not allowed (RBAC failure) |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate resource, optimistic lock conflict |
| 422 | Unprocessable Entity | Semantically invalid though syntactically valid (some teams use this instead of 400 for validation) |
| 429 | Too Many Requests | Rate limiting |
| 500 | Internal Server Error | Unhandled exception |

### Pagination/filtering/sorting

```
GET /appointments?page=2&limit=20&status=confirmed&sort=-createdAt
```

- Offset pagination (`page`/`limit`) is simple but has consistency issues under heavy writes.
- Cursor pagination (`?cursor=<opaque_id>`) is more scalable for large, frequently-changing datasets - worth mentioning as the "senior" alternative even if you mostly used offset pagination in practice.
- Always return pagination metadata: `{ data: [...], meta: { total, page, limit, totalPages } }`.

### Versioning

Nest supports built-in versioning:

```typescript
app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

@Controller({ path: 'appointments', version: '1' })
```

URI versioning (`/v1/appointments`) is the most common and cache/proxy-friendly; header versioning is more "RESTfully pure" but harder to explore/debug manually.

### Interview questions

**Q: How do you decide between PUT and PATCH?**
> "PUT replaces the whole resource - the client sends the full representation. PATCH is a partial update - only the fields being changed. In practice I use PATCH for almost all updates because clients rarely have (or want to resend) the full resource state, and it's more forgiving for concurrent partial edits."

**Q: 401 vs 403 - what's the difference and do you always get this right?**
> "401 means the request isn't authenticated at all - no token, or an invalid/expired one. 403 means the caller *is* authenticated but the RBAC/ownership check says they're not allowed to do this specific thing. On VetApp, a receptionist hitting an admin-only endpoint gets 403, not 401 - the JWT is perfectly valid, they're just not authorized for that action."

---

## 2. DTOs: class-validator & class-transformer

### Topics to learn
- [ ] DTO = Data Transfer Object; separate from entities
- [ ] `class-validator` decorators: `@IsString`, `@IsEmail`, `@IsInt`, `@IsEnum`, `@IsOptional`, `@ValidateNested`, `@ArrayMinSize`, etc.
- [ ] `class-transformer`: `@Type()` for nested objects, `plainToInstance`
- [ ] Mapped types: `PartialType`, `PickType`, `OmitType`, `IntersectionType` (from `@nestjs/mapped-types` / `@nestjs/swagger`)
- [ ] Response serialization: `@Exclude()`, `@Expose()`, `ClassSerializerInterceptor`
- [ ] Why DTOs should never be your TypeORM entities directly

### Why DTOs, not entities, at the boundary

Entities describe the *database shape*. DTOs describe the *wire contract* for a specific operation. Reusing entities as request/response bodies:
- Leaks internal columns (password hash, internal flags) into responses.
- Makes it impossible to have different validation rules for create vs update.
- Couples your API contract to your schema - a column rename breaks clients.

### Example DTOs

```typescript
export class CreateAppointmentDto {
  @IsInt()
  vetId: number;

  @IsInt()
  ownerId: number;

  @IsDateString()
  scheduledAt: string;

  @IsEnum(AppointmentType)
  type: AppointmentType;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;
}

// Update DTO - all fields optional, reusing the create DTO's validation rules
export class UpdateAppointmentDto extends PartialType(CreateAppointmentDto) {}

// Nested validation
export class CreateOwnerWithPetsDto {
  @IsString() name: string;

  @ValidateNested({ each: true })
  @Type(() => CreatePetDto)
  pets: CreatePetDto[];
}
```

### Response shaping with `class-transformer`

```typescript
export class UserResponseDto {
  id: number;
  email: string;

  @Exclude()
  passwordHash: string; // never leaves the server, even if accidentally spread onto the DTO
}
```

`ClassSerializerInterceptor` (global or per-controller) applies `@Exclude`/`@Expose` rules automatically when returning class instances, so a developer forgetting to manually strip a field doesn't leak sensitive data.

### Interview questions

**Q: Why not just validate against your TypeORM entity directly?**
> "Entities represent storage, not the API contract. They often carry fields that should never be client-writable (id, timestamps, internal flags) or client-visible (password hash). DTOs give me a purpose-built, per-operation shape - `CreateAppointmentDto` has different required fields than `UpdateAppointmentDto` - and keep the API contract stable even if the schema changes."

**Q: How do you make sure a password hash never accidentally gets returned in a response?**
> "Two layers: the query itself should avoid selecting sensitive columns when not needed, and at the serialization layer I mark sensitive entity fields `@Exclude()` and rely on `ClassSerializerInterceptor` globally, so even if a service accidentally returns the full entity, the interceptor strips it before it reaches the client."

---

## 3. Pipes

### Topics to learn
- [ ] What a pipe does: transform and/or validate arguments before the handler runs
- [ ] Built-in pipes: `ValidationPipe`, `ParseIntPipe`, `ParseUUIDPipe`, `ParseBoolPipe`, `ParseEnumPipe`, `DefaultValuePipe`
- [ ] `ValidationPipe` options: `whitelist`, `forbidNonWhitelisted`, `transform`, `transformOptions`
- [ ] Global vs controller-level vs parameter-level pipes
- [ ] Writing a custom pipe (`PipeTransform` interface)

### Global ValidationPipe (the config you should know cold)

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,              // strips properties not declared in the DTO
    forbidNonWhitelisted: true,   // throws 400 instead of silently stripping unknown props
    transform: true,              // auto-transforms payloads into DTO class instances (and query/param strings into numbers/booleans per @Type)
    transformOptions: { enableImplicitConversion: true },
  }),
);
```

- `whitelist: true` alone silently drops unexpected fields - good for tolerance, but can hide client bugs.
- `forbidNonWhitelisted: true` makes unexpected fields a hard 400 error - stricter, catches integration bugs early. Many teams (and I'd argue VetApp's admin APIs) prefer this for internal/admin clients, and the more tolerant mode for public-facing APIs with many third-party consumers.
- `transform: true` is what makes `@Param('id', ParseIntPipe)`-style number coercion and nested `@Type()` DTOs actually work end to end.

### Custom pipe example

```typescript
@Injectable()
export class ParseAppointmentStatusPipe implements PipeTransform {
  transform(value: string): AppointmentStatus {
    if (!Object.values(AppointmentStatus).includes(value as AppointmentStatus)) {
      throw new BadRequestException(`Invalid status: ${value}`);
    }
    return value as AppointmentStatus;
  }
}
```

### Interview questions

**Q: What's the difference between `whitelist` and `forbidNonWhitelisted`?**
> "`whitelist` silently strips any property not defined in the DTO - safe by default. `forbidNonWhitelisted` goes further and rejects the request with a 400 if it contains extra properties at all. I use the stricter option for internal/admin APIs where I want to catch client bugs fast, and the lenient one for public APIs where I don't want to break every client on a minor extra field."

**Q: Where do pipes run in the request lifecycle, and why does that matter?**
> "After guards, before the route handler. That ordering matters because by the time validation runs, we already know the caller is authenticated/authorized - so validation errors don't leak information to unauthenticated callers, and we don't waste validation work on requests that would be rejected anyway."

---

## 4. Interceptors

### Topics to learn
- [ ] `NestInterceptor` interface, `intercept(context, next)`
- [ ] RxJS `next.handle()` returns an `Observable` - `pipe(map(...))` to transform responses
- [ ] Common use cases: logging, response transformation/wrapping, timeout, caching, `ClassSerializerInterceptor`
- [ ] Global vs controller vs route-level interceptors
- [ ] Interceptors run *around* the handler (before AND after) - unlike guards/pipes which only run before

### Logging interceptor example

```typescript
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const start = Date.now();
    return next.handle().pipe(
      tap(() => this.logger.log(`${req.method} ${req.url} ${Date.now() - start}ms`)),
    );
  }
}
```

### Response transform interceptor (consistent envelope)

```typescript
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, { data: T }> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<{ data: T }> {
    return next.handle().pipe(map((data) => ({ data })));
  }
}
```

### Timeout interceptor

```typescript
@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      timeout(10000),
      catchError((err) => err instanceof TimeoutError
        ? throwError(() => new RequestTimeoutException())
        : throwError(() => err)),
    );
  }
}
```

### Interview questions

**Q: How is an interceptor different from a pipe or a guard?**
> "A guard decides yes/no before the handler runs (auth/RBAC). A pipe transforms/validates specific arguments before the handler runs. An interceptor wraps the *entire* handler execution - it can run logic before *and* after, transform the response, catch and remap errors, or short-circuit and never call the handler at all (e.g. a caching interceptor returning a cached response). It's the only one of the three built around RxJS streams."

**Q: How would you add a consistent response envelope (`{ data, meta }`) across every endpoint without touching every controller?**
> "A global interceptor with `next.handle().pipe(map(...))` that wraps whatever the handler returns. That's also where I'd centralize things like stripping `null`/`undefined` fields or adding a `requestId` for tracing, without polluting every service with cross-cutting formatting."

---

## 5. Exception filters

### Topics to learn
- [ ] `HttpException` and its subclasses (`BadRequestException`, `NotFoundException`, `ForbiddenException`, `UnauthorizedException`, `ConflictException`, etc.)
- [ ] Default global exception filter behavior (what Nest does if you throw nothing custom)
- [ ] `@Catch()` decorator, `ExceptionFilter` interface
- [ ] Global filters (`app.useGlobalFilters`) vs controller/route-scoped filters
- [ ] Catching specific exception types vs a catch-all filter
- [ ] Mapping unexpected errors (e.g. TypeORM `QueryFailedError`) to safe, consistent HTTP responses
- [ ] Never leaking stack traces / internal details to clients in production

### Custom global exception filter

```typescript
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = exception instanceof HttpException
      ? exception.getResponse()
      : 'Internal server error';

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(exception instanceof Error ? exception.stack : exception);
    }

    response.status(status).json({
      statusCode: status,
      path: request.url,
      timestamp: new Date().toISOString(),
      message,
    });
  }
}
```

```typescript
app.useGlobalFilters(new GlobalExceptionFilter());
```

### Mapping database errors

```typescript
@Catch(QueryFailedError)
export class DatabaseExceptionFilter implements ExceptionFilter {
  catch(exception: QueryFailedError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const driverError = (exception as any).driverError;
    if (driverError?.code === 'ER_DUP_ENTRY' || driverError?.code === '23505') {
      return response.status(409).json({ statusCode: 409, message: 'Resource already exists' });
    }
    response.status(500).json({ statusCode: 500, message: 'Database error' });
  }
}
```

(`ER_DUP_ENTRY` is MySQL's duplicate-key error code, `23505` is Postgres's unique-violation code - worth knowing both given your MySQL/Postgres exposure.)

### Interview questions

**Q: What happens if you don't write any exception filter at all?**
> "Nest's built-in global filter catches everything: known `HttpException`s are serialized with their status and message, and anything else becomes a generic 500 with a safe message - it won't leak stack traces by default. I usually still add my own global filter to get consistent response shape, logging, and to translate infrastructure errors like duplicate-key DB errors into proper 409s instead of raw 500s."

**Q: Why catch `QueryFailedError` specifically instead of letting it become a generic 500?**
> "Because some DB errors map cleanly to a client-meaningful HTTP status - a unique constraint violation is a 409 Conflict, not a server failure. Translating that at the filter layer keeps services from needing try/catch boilerplate around every write, while still giving clients an actionable response."

---

## 6. Swagger / OpenAPI

### Topics to learn
- [ ] `@nestjs/swagger` setup: `DocumentBuilder`, `SwaggerModule.setup()`
- [ ] `@ApiTags`, `@ApiOperation`, `@ApiResponse`, `@ApiParam`, `@ApiQuery`
- [ ] `@ApiProperty()` on DTOs (and `@ApiPropertyOptional`)
- [ ] Auto-generating schemas from DTOs (`CLI plugin` for zero-decorator inference, or explicit decorators)
- [ ] Bearer auth in Swagger UI (`@ApiBearerAuth()`, `addBearerAuth()`)
- [ ] Versioned/grouped docs, hiding internal endpoints (`@ApiExcludeEndpoint`)
- [ ] Why accurate docs matter for frontend/mobile teams and third-party integrators

### Setup

```typescript
const config = new DocumentBuilder()
  .setTitle('VetApp API')
  .setDescription('Veterinary clinic management API')
  .setVersion('1.0')
  .addBearerAuth()
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document);
```

### DTO decorated for Swagger

```typescript
export class CreateAppointmentDto {
  @ApiProperty({ example: 42, description: 'ID of the vet' })
  @IsInt()
  vetId: number;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsString()
  @IsOptional()
  notes?: string;
}
```

### Controller documentation

```typescript
@ApiTags('appointments')
@ApiBearerAuth()
@Controller('appointments')
export class AppointmentsController {
  @ApiOperation({ summary: 'Create a new appointment' })
  @ApiResponse({ status: 201, description: 'Appointment created', type: AppointmentResponseDto })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @Post()
  create(@Body() dto: CreateAppointmentDto) { /* ... */ }
}
```

### Interview questions

**Q: How does Swagger stay in sync with your actual validation rules instead of drifting out of date?**
> "Because the same DTO classes drive both `class-validator` validation and `@ApiProperty` documentation - I'm not maintaining a separate OpenAPI YAML by hand. There's still discipline required to keep `@ApiProperty` metadata accurate, but the *shape* (required fields, types) can't silently diverge since it's the same class Nest actually validates against."

**Q: How do you document authenticated endpoints in Swagger so someone can actually try them from the UI?**
> "`addBearerAuth()` on the `DocumentBuilder`, then `@ApiBearerAuth()` on protected controllers/routes - that adds an 'Authorize' button in Swagger UI where you paste a JWT, and it gets sent as the `Authorization` header on 'Try it out' requests."

---

## 7. The full pipeline, in order (memorize this table)

| Stage | Runs | Can short-circuit? | Typical responsibility |
|---|---|---|---|
| Middleware | Before Nest's request context is fully built | Yes (e.g. reject early) | Logging, CORS, raw body parsing, request ID injection |
| Guards | Before route handler | Yes (deny -> 403/401) | Auth, RBAC |
| Interceptors (pre) | Before route handler | Yes (e.g. serve from cache) | Timing, context setup, caching |
| Pipes | Just before handler args are bound | Yes (throw -> 400) | Validation, transformation of `@Body/@Param/@Query` |
| Route handler | The controller method | - | Delegate to service |
| Interceptors (post) | After handler resolves | - | Transform/wrap response, logging |
| Exception filters | Only if something threw, anywhere in the chain | - | Shape error response, logging |

### Interview question

**Q: If I want to reject unauthenticated requests as early and cheaply as possible, where does that logic belong?**
> "A guard, not a pipe or an interceptor before it in the after-handler sense - guards run before interceptors and pipes, so an unauthenticated request never even reaches validation logic or handler-adjacent interceptor work. Middleware runs even earlier but doesn't have access to the Nest execution context (route handler metadata, e.g. `@Roles()`), so RBAC in particular has to be a guard, not middleware."

---

## Full interview question bank (rapid fire)

1. **PUT vs PATCH?** -> full replace vs partial update.
2. **401 vs 403?** -> not authenticated vs authenticated-but-not-allowed.
3. **Why DTOs instead of validating entities directly?** -> separate wire contract from storage shape; avoid leaking sensitive fields.
4. **`whitelist` vs `forbidNonWhitelisted`?** -> silently strip vs hard-reject unexpected fields.
5. **What does `transform: true` unlock?** -> DTO class-instance construction + primitive coercion for params/query.
6. **Guard vs pipe vs interceptor vs filter - one-line each.**
7. **What's the default behavior if you throw a plain `Error` instead of `HttpException`?** -> becomes a generic 500, message hidden from client by default.
8. **How do you keep Swagger docs accurate without hand-writing OpenAPI YAML?** -> decorate the same DTOs/controllers used for validation/routing.
9. **How would you version a breaking API change?** -> URI versioning (`/v2/...`), keep `/v1` running until clients migrate.
10. **How do you avoid leaking a password hash in an API response?** -> `@Exclude()` + `ClassSerializerInterceptor`, and avoid over-fetching sensitive columns.

---

## Hands-on drills

- [ ] Write `CreateAppointmentDto` and `UpdateAppointmentDto` (via `PartialType`) with full `class-validator` decorators.
- [ ] Configure a global `ValidationPipe` with `whitelist`, `forbidNonWhitelisted`, and `transform`, and verify an extra unexpected field actually gets rejected.
- [ ] Write a `TransformInterceptor` that wraps every response in `{ data, timestamp }`.
- [ ] Write a global exception filter that returns a consistent JSON error shape and maps a MySQL duplicate-key error to 409.
- [ ] Set up Swagger with `addBearerAuth()`, decorate one controller fully, and manually try an authenticated request from the Swagger UI.
- [ ] Draw the full request pipeline table from memory and check it against this chapter.

---

## Senior red flags / green flags

### Green flags
- Distinguishes 401 vs 403 correctly and consistently, without prompting.
- Knows exactly why `whitelist`/`forbidNonWhitelisted`/`transform` each exist, not just "I turn on ValidationPipe."
- Can explain why DTOs != entities with a concrete leak scenario.
- Knows guards run before pipes/interceptors, and *why* that ordering is deliberate (cheap rejection first).
- Ties Swagger docs directly to the DTOs that drive real validation, not a hand-maintained spec.

### Red flags
- Uses entities directly as request bodies "to save time."
- Can't explain the difference between a guard and an interceptor.
- Doesn't know what `ValidationPipe` options actually do beyond "it validates."
- Returns raw stack traces / internal error messages to API clients.
- No opinion on pagination strategy beyond "we send everything back."

---

## Tie-backs to your experience

- **VetApp**: REST API layer built with DTOs, class-validator, and Swagger from the ground up during the PHP rewrite - a great story for "designing an API contract that didn't exist cleanly before."
- **Travel2Georgia**: full backend services designed from scratch - good story for REST resource design decisions made with no legacy constraints (versioning, pagination, response shape).
- **Wizer**: added NestJS backend administration endpoints on top of an existing mobile app - good story for designing an admin-facing API surface with different validation strictness than a public one.

---

## Senior-Level Best Practices

### Decision framework: API versioning strategy

Versioning is one of those topics where "we'll deal with it when we need it" is a decision that gets more expensive the longer it's deferred. Work through this before the first breaking change is needed, not after:

1. **How many external/uncontrolled consumers exist?** An internal-only API consumed solely by a frontend you also deploy in lockstep can often get away with no formal versioning - deploy both sides together. The moment a mobile app, a third party, or any client with an independent release cycle depends on the API, versioning stops being optional.
2. **URI (`/v1/...`) vs header vs media-type versioning - which fits the consumers?** URI versioning is the pragmatic default: cache/proxy-friendly, trivially explorable/debuggable (you can see the version in any log line or curl command), and what most consumers expect. Header versioning is "more correct" REST purism but harder to debug and easy for a client to get wrong silently (forgetting a header defaults to some version, possibly not the one they meant).
3. **What's the deprecation policy?** Decide and publish it before you need it: how long does `/v1` stay live after `/v2` ships, what's the communication channel to consumers, and what's the actual mechanism (a `Deprecation`/`Sunset` HTTP header, a changelog, direct outreach for known consumers like a mobile app team).
4. **Can this specific change be additive instead of breaking?** Adding an optional field, a new endpoint, or a new enum value is almost never worth a version bump. Removing/renaming a field, changing a field's type or meaning, or changing status code semantics is. Bias hard toward additive changes to avoid needing a version bump at all.

### API versioning in practice

```typescript
app.enableVersioning({
  type: VersioningType.URI,
  defaultVersion: '1',
});

@Controller({ path: 'appointments', version: '1' })
export class AppointmentsControllerV1 { /* ... */ }

@Controller({ path: 'appointments', version: '2' })
export class AppointmentsControllerV2 { /* ... */ }
```

- Keep `v1` and `v2` controllers thin and delegate to a shared service where the underlying logic hasn't actually changed - don't duplicate business logic across version boundaries just because the controller/DTO shape changed. Version the contract, not necessarily the whole implementation.
- A version bump is a good forcing function to also revisit whether old fields/endpoints can finally be removed from the *previous* version once its deprecation window has passed - track this explicitly (a ticket, a changelog entry with a removal date) rather than letting old versions live forever by default.
- For a mobile client specifically (relevant given Clean House/Wizer/EasyPay-style apps in this CV), version compatibility windows need to account for **users who don't update immediately** - app store review delays, users who disable auto-update, users on old OS versions that can't run the latest app build. A backend deprecation timeline should be measured in months for mobile-consumed APIs, not weeks.

### REST/validation anti-patterns beyond the basics

- **Returning 200 with an error payload instead of the correct status code** ("soft errors") - breaks HTTP semantics, breaks generic client error-handling (retry logic, monitoring that keys off status codes), and is a very common legacy-API smell worth calling out and fixing during a rewrite.
- **Validating on the way in but never re-validating business invariants at the point of persistence.** DTO validation catches shape/type errors; it doesn't catch "this would create a double-booking" - that check has to happen in the service, often inside the same transaction as the write, or a race condition slips through.
- **Swagger docs that drift from reality because `@ApiProperty` metadata (example values, descriptions) isn't kept current**, even though the underlying validation shape can't drift (same DTO). Treat inaccurate examples/descriptions as a real bug, not cosmetic - they actively mislead consumers building against the docs.
- **Pagination without a stated upper bound on `limit`.** A client (or an attacker) requesting `?limit=1000000` against an unguarded endpoint is a straightforward, easy-to-miss denial-of-service vector - always clamp/validate `limit` server-side regardless of what the client asks for.
- **Exposing internal error details (stack traces, ORM error messages, SQL fragments) in production error responses** - a classic and severe leak of implementation detail that also often leaks column/table names useful to an attacker.

### Observability for a REST API surface

- **Structured, consistent error logging at the exception filter level** - log the full internal error server-side (stack trace, request context) while returning a sanitized response to the client; without this, production 500s are unstressed guesswork.
- **Per-endpoint latency and status-code-rate dashboards**, not just an aggregate - a single slow or error-prone endpoint can hide in an aggregate p95 that looks fine overall.
- **Track validation failure rates (400s) per endpoint over time** - a sudden spike after a client-side deploy (web or mobile) often indicates a contract mismatch between what the client sends and what the API now expects, especially valuable to catch early in a multi-client setup.
- **Version usage metrics** (how much traffic is still hitting `/v1` vs `/v2`) - the actual data needed to decide when it's safe to sunset an old version, rather than guessing.

### Team/scalability practices

- Maintain a single source of truth for the API contract that both the backend team and any consuming teams (frontend, mobile) can reference - Swagger/OpenAPI generated from the real DTOs, published somewhere accessible, ideally with generated client types consumed by the frontend/mobile codebases so contract drift becomes a compile-time error instead of a runtime surprise.
- Establish a lightweight review gate for anything that changes an existing endpoint's request/response shape - even a "harmless-looking" field rename can break a mobile client that's already in app-store review and can't be hotfixed for days.
- Decide, as a team convention, the default error response shape and status-code-to-error-type mapping once, and enforce it via the global exception filter - inconsistent ad-hoc error shapes across endpoints (some `{error: string}`, others `{message: string}`) is a common, avoidable source of client-side bugs.

### Harder senior follow-up Q&A

**Q: You need to remove a field from an API response that's used by both a web frontend and a mobile app you don't control the release cadence of. Walk through how you'd actually do this safely.**
> "I wouldn't remove it outright. First I'd confirm nothing actually reads it anymore on the side(s) I control (the web frontend), and reach out to whoever owns the mobile client to confirm the same, since I can't grep their codebase directly. I'd stop the field from being *required* or relied upon first - keep sending it, deprecated, for a window long enough to cover slow-to-update mobile users (often months, not weeks, given app store review and users who delay updates), track whether it's still being read via API analytics if that's feasible, and only remove it once I'm confident, or once it's covered by a version bump that mobile has explicitly migrated to."

**Q: How would you design an idempotent `POST /appointments` endpoint so retrying a request due to a network timeout doesn't create a duplicate appointment?**
> "Accept an idempotency key from the client - either generated client-side per attempt or derived deterministically from the request's meaningful content - and store it alongside the created resource. On a retry with the same key, look up whether that key has already been processed and return the original result instead of creating a second resource. This matters a lot for mobile clients specifically, where a request can time out client-side while it actually succeeded server-side, and a naive retry would otherwise double-book."

**Q: A client says your paginated endpoint returns inconsistent results - items appear twice or get skipped between pages - during periods of frequent writes. What's happening and how do you fix it?**
> "That's the classic offset-pagination-under-writes problem: if rows are inserted or deleted between page requests, the same `LIMIT/OFFSET` window can now point at different rows than it did on the previous request, causing skips or duplicates. The fix is cursor-based pagination - paginate by a stable, monotonically ordered value (like `id` or `createdAt` plus `id` as a tiebreaker) rather than a positional offset, so a cursor always points at 'everything after this specific row' regardless of what's been inserted or deleted elsewhere in the set."

**Q: How do you handle a breaking change that only affects one specific client's edge case, not the general contract - is that still a version bump?**
> "Not necessarily. If the change genuinely only affects behavior that one client depends on in a way no other client should reasonably rely on (an undocumented quirk being relied upon), I'd treat that as a bug in the client's assumption, communicate directly with that team, and fix the API to be correct rather than permanently version-locking the whole API around one client's workaround. A version bump is for a deliberate, intentional contract change affecting the general consumer base - not a tool for avoiding an awkward conversation about a client depending on unspecified behavior."

**Q: How would you design a rate limit that's fair across a small number of very active API consumers without punishing everyone else?**
> "Per-key (per API client/user, not just global or per-IP) rate limiting, with limits proportional to the consumer's actual tier/contract rather than one blanket number - a mobile app making many small requests per user session has a different reasonable ceiling than an admin dashboard used by a handful of internal staff. I'd also return the standard `429` with `Retry-After` and rate-limit headers (`X-RateLimit-Remaining`, etc.) so well-behaved clients can back off gracefully instead of hammering the endpoint on every rejection."

### Quick reference: status code and layer decisions

| Situation | Status code | Layer that decides |
|---|---|---|
| No token / expired token | 401 | Guard |
| Valid token, wrong role/ownership | 403 (or 404 to hide existence, context-dependent) | Guard (role) / Service (ownership) |
| Malformed request body | 400 | Pipe (`ValidationPipe`) |
| Resource doesn't exist | 404 | Service / Controller |
| Unique constraint violation | 409 | Exception filter mapping a DB error |
| Rate limit exceeded | 429 | Guard (`ThrottlerGuard`) |
| Unhandled exception | 500 | Global exception filter (sanitized) |

---

## Mastery checklist

- [ ] I can design a REST resource (verbs, status codes, pagination) for a new domain in under 5 minutes.
- [ ] I can write a fully validated DTO pair (create/update) from memory.
- [ ] I can configure and justify every `ValidationPipe` option.
- [ ] I can explain and implement a custom interceptor and a custom exception filter.
- [ ] I can recite the full middleware -> guard -> interceptor -> pipe -> handler -> filter pipeline.
- [ ] I can set up Swagger with bearer auth and explain why docs stay accurate.
