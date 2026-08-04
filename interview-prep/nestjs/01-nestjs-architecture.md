# 01 - NestJS Architecture: Modules, Providers, DI, Controllers, Services, Lifecycle, Config

> Goal: explain how a NestJS application is put together and *why* it is structured that way, well enough to design a new module from scratch on a whiteboard and justify every decision.

Mark progress with `[x]` as you master each topic.

---

## Learning objectives

By the end of this section you should be able to:

1. Explain what NestJS is and why it exists on top of Express/Fastify.
2. Explain modules: what they are, what belongs in `imports`/`providers`/`controllers`/`exports`.
3. Explain dependency injection (DI) in Nest: tokens, providers, scopes, circular deps.
4. Explain controllers: routing, decorators, request/response handling.
5. Explain the role of services and where business logic should live.
6. Walk through the full request lifecycle and application lifecycle hooks.
7. Configure an app with `@nestjs/config`, including validation and typed config.
8. Justify a feature-based project structure, and describe how you structured the VetApp rewrite.

---

## 1. What is NestJS and why does it exist

### Core idea

NestJS is a Node.js framework that sits on top of an HTTP adapter (Express by default, or Fastify) and adds:

- **Opinionated architecture** inspired by Angular: modules, decorators, dependency injection.
- **TypeScript-first** design (though plain JS is supported).
- A **platform-agnostic core** - the same app can serve HTTP, run as a microservice (TCP/Redis/Kafka/gRPC), or run a hybrid of both.
- Built-in solutions for **cross-cutting concerns**: guards, interceptors, pipes, filters, middleware.

### Why not "just Express"

| Plain Express | NestJS |
|---|---|
| No enforced structure - grows into spaghetti as it scales | Enforced module/provider structure |
| DI is manual (or third-party) | DI is first-class, testable, mockable |
| Cross-cutting concerns hand-rolled per route | Guards/interceptors/pipes/filters as reusable, declarative building blocks |
| No built-in testing scaffolding | `@nestjs/testing` with `Test.createTestingModule` |
| Swagger/validation are DIY | First-class `@nestjs/swagger` + `class-validator` integration |

### Interview answer sketch

> "NestJS is a Node.js framework built on top of Express (or Fastify) that brings Angular-style architecture to the backend: modules, dependency injection, and decorators. It's opinionated on purpose - it gives teams a consistent way to structure controllers, services, and cross-cutting concerns like validation, auth, and logging, so a codebase stays maintainable as it grows past a handful of routes. On VetApp, that structure is exactly why we could rewrite a PHP monolith into NestJS module by module instead of a risky big-bang rewrite."

---

## 2. Modules

### Topics to learn
- [ ] `@Module()` metadata: `imports`, `controllers`, `providers`, `exports`
- [ ] Feature modules vs the root `AppModule`
- [ ] Shared modules (common utilities, exported providers)
- [ ] Global modules (`@Global()`) - when justified, when it's an anti-pattern
- [ ] Dynamic modules (`forRoot`, `forRootAsync`, `forFeature`)
- [ ] Re-exporting modules to expose their providers transitively
- [ ] Module boundaries and why "everything imports everything" is a smell

### Anatomy of a module

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([Appointment]), AuthModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
  exports: [AppointmentsService], // only if other modules need it
})
export class AppointmentsModule {}
```

- `imports`: other modules whose **exported** providers this module needs.
- `controllers`: HTTP entry points owned by this module.
- `providers`: things Nest can inject - services, repositories, guards, factories.
- `exports`: subset of `providers` (or re-exported modules) visible to modules that `import` this one. Anything not exported is private to the module.

### Global modules

`@Global()` makes a module's exports available everywhere without explicit imports. Useful for things like a `ConfigModule` or a `LoggerModule` used by nearly every feature. **Overusing it defeats the purpose of modular boundaries** - it becomes implicit coupling. Rule of thumb: global only for true cross-cutting infrastructure, not domain logic.

### Dynamic modules (`forRoot` / `forRootAsync` / `forFeature`)

Used when a module needs runtime configuration (connection strings, options) rather than static wiring.

```typescript
// Static config
TypeOrmModule.forRoot({ type: 'mysql', host: '...', ... })

// Async config (reads from ConfigService, which itself must resolve first)
TypeOrmModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    type: 'mysql',
    host: config.get('DB_HOST'),
    // ...
  }),
})

// forFeature registers entities/repositories scoped to a specific feature module
TypeOrmModule.forFeature([Appointment, Vet, Owner])
```

`forRoot*` is called once (usually in `AppModule`) to configure the whole integration; `forFeature` is called per feature module to register just what that module needs (e.g. specific entities/repositories).

### Interview questions

**Q: What's the difference between `imports` and `providers` in a module?**
> "`providers` are the things this module owns and can inject into its own controllers/services. `imports` bring in other modules so I can use *their exported* providers. A provider that isn't exported is effectively private to its module - other modules importing it won't see it."

**Q: When would you make a module global?**
> "Only for true infrastructure shared by almost every feature - configuration, logging, maybe a caching client. I wouldn't make a domain module like `AppointmentsModule` global; that hides dependencies and makes the module graph harder to reason about."

**Q: What problem do dynamic modules solve?**
> "They let a module accept configuration at import time instead of hardcoding it, and they let that configuration come from async sources - like reading DB credentials from `ConfigService` before `TypeOrmModule` connects. `forFeature` is the finer-grained version, scoping registration (like specific entities) to just the feature module that needs them, instead of re-declaring everything in the root."

---

## 3. Providers & Dependency Injection

### Topics to learn
- [ ] What a "provider" is (anything with an injection token: class, value, factory)
- [ ] Constructor injection and how Nest resolves the dependency graph
- [ ] Custom providers: `useClass`, `useValue`, `useFactory`, `useExisting`
- [ ] Injection tokens (string/Symbol) for non-class dependencies, `@Inject()`
- [ ] Provider scopes: `DEFAULT` (singleton), `REQUEST`, `TRANSIENT`
- [ ] Circular dependencies and `forwardRef()`
- [ ] Why DI makes testing easier (swap real providers for mocks)

### The four provider shapes

```typescript
// 1. useClass (most common) - Nest instantiates the class and injects its deps
{ provide: PaymentGateway, useClass: BogPaymentGateway }

// 2. useValue - inject a plain value/object (config, constants, mocks in tests)
{ provide: 'APP_CONFIG', useValue: { retries: 3 } }

// 3. useFactory - compute the provider, optionally injecting other providers
{
  provide: 'DB_CONNECTION',
  useFactory: (config: ConfigService) => createConnection(config.get('DB_URL')),
  inject: [ConfigService],
}

// 4. useExisting - alias one token to another existing provider
{ provide: 'LegacyLogger', useExisting: LoggerService }
```

`useClass` with an interface-like token is how you keep controllers/services decoupled from concrete implementations - e.g. inject an abstract `PaymentGateway` token and swap `BogPaymentGateway` for `FlittPaymentGateway` per module/environment (relevant: VetApp uses Bank of Georgia, Wizer integrates Flitt).

### Provider scopes

| Scope | Lifetime | When to use |
|---|---|---|
| `DEFAULT` (singleton) | One instance for the whole app | Almost everything - stateless services, repositories |
| `REQUEST` | New instance per incoming request | Need per-request state (e.g. current user context threaded through nested services) - has a perf cost, use sparingly |
| `TRANSIENT` | New instance every time it's injected | Rare - e.g. a provider that must never share state between consumers |

**Gotcha:** if a provider is `REQUEST`-scoped, everything that depends on it (directly or transitively) becomes request-scoped too - this can quietly tank performance if applied high in the graph. Prefer passing request-scoped data explicitly (e.g. via a param) over scoping a whole service tree.

### Circular dependencies

Two providers/modules depend on each other. Nest resolves this with `forwardRef()`:

```typescript
@Injectable()
export class AppointmentsService {
  constructor(@Inject(forwardRef(() => NotificationsService)) private notifications: NotificationsService) {}
}
```

**Senior take:** `forwardRef` is a valid escape hatch, but a circular dependency is often a sign the domain boundary is wrong - consider extracting shared logic into a third module both can depend on, rather than reaching for `forwardRef` reflexively.

### Interview questions

**Q: How does Nest resolve constructor dependencies?**
> "At bootstrap, Nest builds a dependency graph from providers and their constructor parameter types (or injection tokens for non-class deps). It instantiates providers in dependency order, wires singletons once, and injects them wherever they're requested. If it can't resolve a token - not provided, not exported from the right module - you get a clear runtime error identifying the missing provider."

**Q: Why use an injection token/interface instead of injecting a concrete class directly?**
> "It decouples consumers from implementation. On VetApp I'd define a `PaymentGateway` token and provide `BogPaymentGateway` for that binding; tests can swap in a fake gateway via `useValue`/`useClass` without touching business logic, and if we ever added a second processor, only the provider registration changes."

**Q: What's the risk of `REQUEST` scope?**
> "It creates a new instance per request for that provider *and* everything depending on it, which adds instantiation overhead and can silently make otherwise-stateless services request-scoped. I only reach for it when I genuinely need per-request state that's awkward to pass explicitly, e.g. deep request context/tracing."

---

## 4. Controllers

### Topics to learn
- [ ] `@Controller('path')` and route prefixes
- [ ] HTTP method decorators: `@Get`, `@Post`, `@Put`, `@Patch`, `@Delete`
- [ ] Param decorators: `@Param`, `@Query`, `@Body`, `@Headers`, `@Req`, `@Res`
- [ ] Status codes: `@HttpCode`, default codes per verb
- [ ] Route ordering (static routes before dynamic `:id` routes)
- [ ] API versioning (`URI`, `HEADER`, `MEDIA_TYPE` versioning types)
- [ ] Why controllers should stay thin (delegate to services)

### Example controller (VetApp-style)

```typescript
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get()
  findAll(@Query() query: FindAppointmentsDto) {
    return this.appointmentsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.appointmentsService.findOne(id);
  }

  @Post()
  @HttpCode(201)
  create(@Body() dto: CreateAppointmentDto, @CurrentUser() user: AuthUser) {
    return this.appointmentsService.create(dto, user);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAppointmentDto) {
    return this.appointmentsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.appointmentsService.remove(id);
  }
}
```

### Thin controllers, why it matters

Controllers should only:
1. Extract/validate input (via DTOs + pipes, decorators).
2. Call the appropriate service method.
3. Return the result (or let an interceptor/filter shape the response).

Business logic, transactions, and persistence access belong in services (and repositories). This keeps controllers trivially testable and keeps HTTP concerns (status codes, headers) separate from domain logic that might later be reused by a queue consumer, a CLI command, or a cron job.

### Interview questions

**Q: Why keep business logic out of controllers?**
> "Controllers are the HTTP adapter layer. If I put business logic there, I can't reuse it from a background job or a different transport (e.g. a message consumer), and testing requires spinning up HTTP concerns unnecessarily. On VetApp, appointment-creation logic lives in `AppointmentsService` so the same logic path also feeds a background job for confirmation emails without duplicating rules."

**Q: How do you handle route ordering pitfalls?**
> "Static segments must be declared before dynamic ones on the same prefix - e.g. `@Get('search')` before `@Get(':id')` - otherwise `search` gets swallowed as an `:id` param."

---

## 5. Services

### Topics to learn
- [ ] Services as the home for business logic
- [ ] `@Injectable()` and how services get registered as providers
- [ ] Composing services (a service can inject other services/repositories)
- [ ] Keeping services framework-agnostic where possible (easier to test, easier to reuse)
- [ ] Repository pattern preview (full detail in chapter 05)

### Example

```typescript
@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment) private readonly repo: Repository<Appointment>,
    private readonly notifications: NotificationsService,
  ) {}

  async create(dto: CreateAppointmentDto, user: AuthUser): Promise<Appointment> {
    const appointment = this.repo.create({ ...dto, createdBy: user.id });
    const saved = await this.repo.save(appointment);
    await this.notifications.queueAppointmentConfirmation(saved.id);
    return saved;
  }
}
```

### Interview question

**Q: What's the responsibility split between controller, service, and repository?**
> "Controller: HTTP in/out. Service: business rules, orchestration, transactions. Repository: persistence/query concerns. Each layer only knows about the one below it - the controller never talks to TypeORM directly, and the service doesn't know about HTTP status codes."

---

## 6. Application & request lifecycle

### Topics to learn
- [ ] Bootstrap sequence: `NestFactory.create()` -> module resolution -> `listen()`
- [ ] Lifecycle hooks: `OnModuleInit`, `OnApplicationBootstrap`, `OnModuleDestroy`, `beforeApplicationShutdown`, `OnApplicationShutdown`
- [ ] `app.enableShutdownHooks()` and why it matters for graceful shutdown
- [ ] Order of execution for guards -> interceptors (before) -> pipes -> controller -> interceptors (after) -> filters (on error)
- [ ] Middleware runs *before* guards, outside the Nest request pipeline proper

### Bootstrap

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks(); // required for OnApplicationShutdown to actually fire on SIGTERM
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(3000);
}
bootstrap();
```

### Lifecycle hooks, in order

| Hook | Fires when | Typical use |
|---|---|---|
| `OnModuleInit` | After the host module's dependencies are resolved | Warm caches, verify config, open non-critical connections |
| `OnApplicationBootstrap` | After the *entire* app's modules have initialized | Cross-module startup logic that needs everything ready |
| `OnModuleDestroy` | When shutdown begins, module-by-module | Close per-module resources |
| `beforeApplicationShutdown` | After destroy hooks, before the app stops accepting requests fully | Final cleanup with access to the shutdown signal |
| `OnApplicationShutdown(signal)` | Right before process exit | Close DB pools, flush logs, deregister from service discovery |

**Gotcha interviewers probe:** shutdown hooks do nothing unless `app.enableShutdownHooks()` was called - a very common "why doesn't my cleanup run on SIGTERM in Kubernetes/Docker" bug.

### The full request pipeline (memorize this order)

```
Incoming request
  -> Middleware (Express-level, no DI context awareness of route handler yet)
  -> Guards (can activate at controller or route level; auth/RBAC checks)
  -> Interceptors (before handler - e.g. start a timer, wrap in a transaction context)
  -> Pipes (validate/transform @Body/@Param/@Query)
  -> Route handler (controller method)
  -> Interceptors (after handler - transform response, cache, log)
  -> Exception filters (only if something threw)
  -> Response sent
```

### Interview questions

**Q: Walk me through what happens when a request hits a NestJS app, end to end.**
> "First it passes through any global/module middleware, then guards decide if the request is allowed to proceed - auth and RBAC live here. Interceptors then run their pre-handler logic, pipes validate and transform the incoming body/params/query against the DTO, and the controller method finally executes, usually delegating to a service. On the way out, interceptors get a second chance to transform the response, and if anything threw at any point, exception filters catch it and shape the error response."

**Q: Why did my `OnApplicationShutdown` hook never run in production?**
> "Almost certainly because `app.enableShutdownHooks()` was never called - Nest doesn't listen for termination signals by default, so shutdown hooks are dead code until you opt in."

---

## 7. ConfigModule

### Topics to learn
- [ ] `@nestjs/config`: `ConfigModule.forRoot()`, `.env` loading, multiple env files
- [ ] `ConfigService.get()` with typed generics
- [ ] Validation of env vars at startup (Joi schema, or class-validator + `plainToInstance`)
- [ ] Namespaced/registered config (`registerAs`) and `forFeature`
- [ ] Failing fast: crash on missing/invalid config instead of failing later at runtime
- [ ] Secrets management awareness (never commit `.env`, use secret managers in production)

### Setup with validation

```typescript
// config/env.validation.ts
import { plainToInstance } from 'class-transformer';
import { IsEnum, IsNumber, IsString, validateSync } from 'class-validator';

class EnvironmentVariables {
  @IsEnum(['development', 'production', 'test']) NODE_ENV: string;
  @IsNumber() PORT: number;
  @IsString() DATABASE_URL: string;
  @IsString() JWT_SECRET: string;
}

export function validate(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, { enableImplicitConversion: true });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) throw new Error(errors.toString());
  return validated;
}
```

```typescript
// app.module.ts
ConfigModule.forRoot({
  isGlobal: true,
  envFilePath: ['.env.local', '.env'],
  validate,
})
```

### Namespaced config with `registerAs`

```typescript
export default registerAs('database', () => ({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10) || 3306,
}));

// consume with strong typing
constructor(@Inject(databaseConfig.KEY) private dbConfig: ConfigType<typeof databaseConfig>) {}
```

### Interview questions

**Q: Why validate environment variables at startup instead of trusting them?**
> "Because a missing or malformed env var should fail the deploy immediately with a clear error, not surface three hours later as a cryptic runtime bug - e.g. a missing `JWT_SECRET` shouldn't silently sign tokens with `undefined`. I validate with a schema at bootstrap so the process refuses to start if config is invalid."

**Q: How do you keep config type-safe instead of stringly-typed `process.env.X` everywhere?**
> "Centralize access through `ConfigService` (or namespaced config via `registerAs`), typed with generics, so the rest of the app never touches `process.env` directly. That also makes it trivial to mock config in tests."

---

## 8. Project structure

### Topics to learn
- [ ] Feature-based structure vs layer-based structure
- [ ] Nest CLI module/controller/service generation conventions
- [ ] Shared/common module for cross-cutting pieces (filters, guards, decorators, pipes)
- [ ] Barrel files (`index.ts`) - convenience vs circular-import risk
- [ ] Monorepo awareness: Nest CLI "apps and libs" mode for multiple deployables sharing code
- [ ] Migration strategy for legacy rewrites (VetApp: PHP -> NestJS module by module)

### Feature-based structure (what I use)

```
src/
  main.ts
  app.module.ts
  config/
    env.validation.ts
    database.config.ts
  common/
    decorators/        (e.g. @CurrentUser, @Roles)
    filters/            (global exception filter)
    guards/              (JwtAuthGuard, RolesGuard)
    interceptors/        (logging, transform)
    pipes/
  modules/
    auth/
      auth.module.ts
      auth.controller.ts
      auth.service.ts
      strategies/
        jwt.strategy.ts
    appointments/
      appointments.module.ts
      appointments.controller.ts
      appointments.service.ts
      dto/
        create-appointment.dto.ts
        update-appointment.dto.ts
      entities/
        appointment.entity.ts
    vets/
    owners/
    payments/
    records/
    notifications/
```

Layer-based (`controllers/`, `services/`, `entities/` as top-level folders across the whole app) tends to fall apart once the app has more than a few domains - unrelated features end up mixed in the same folder, and it's harder to see or enforce module boundaries. Feature-based folders map directly onto Nest modules, which map onto business domains - easy to reason about, easy to eventually extract into a microservice if needed.

### VetApp rewrite structure story (use as a talking point)

> "The PHP backend had grown organically with logic spread across scripts. I rewrote it module-by-module in NestJS - auth, vets, owners, appointments, records, payments, notifications - each as its own feature module with its own controller/service/DTOs/entities, while pointing TypeORM at the *existing* MySQL schema so we didn't need a risky data migration. That let us cut over incrementally rather than a big-bang rewrite, and RBAC/validation/Swagger came for free at the framework level instead of being reimplemented per endpoint like in the PHP version."

### Interview questions

**Q: How do you decide module boundaries?**
> "Around business capabilities/domains, not technical layers. `Appointments`, `Payments`, `VetRecords` are separate modules because they change for different reasons and different people own them conceptually, even if one engineer touches all of them. Shared technical concerns - guards, filters, common decorators - live in a `common` module that everything can depend on."

**Q: What's your process for rewriting a legacy backend without a big-bang cutover?**
> "Map the legacy system's actual behavior (including undocumented quirks) domain by domain, keep the same database (or a compatible schema) so you're not doing a risky simultaneous data migration, stand up one NestJS module at a time behind the same routes/contracts the old system served, and use feature flags or a routing layer (e.g. Nginx path rules) to cut traffic over incrementally per-domain. VetApp is exactly this: rewritten in NestJS against the existing MySQL DB, module by module."

---

## Full interview question bank (rapid fire)

1. **What is NestJS built on top of?** -> Express/Fastify adapter, platform-agnostic core.
2. **What's in `@Module()` metadata?** -> imports, controllers, providers, exports.
3. **Difference between a provider and a controller?** -> provider = injectable logic; controller = HTTP entry point.
4. **What are the 4 custom provider types?** -> useClass, useValue, useFactory, useExisting.
5. **What is a circular dependency and how do you break it?** -> mutual imports; `forwardRef()`, or better, extract shared logic.
6. **What are the 3 provider scopes?** -> DEFAULT, REQUEST, TRANSIENT.
7. **Why is REQUEST scope risky?** -> propagates up the dependency graph, perf cost.
8. **What does `enableShutdownHooks()` do?** -> registers process signal listeners so lifecycle shutdown hooks actually fire.
9. **Order of guards vs pipes vs interceptors?** -> middleware -> guards -> interceptors(before) -> pipes -> handler -> interceptors(after) -> filters.
10. **Why validate env vars at startup?** -> fail fast with a clear error instead of a runtime surprise.
11. **Feature-based vs layer-based structure - which do you prefer and why?**
12. **How would you structure a rewrite of a legacy monolith into NestJS?**

---

## Hands-on drills

- [ ] Sketch a module diagram for a mini "Appointments" domain: module, controller, service, entity, DTOs - draw the arrows for imports/exports.
- [ ] Write a custom provider using `useFactory` that builds a payment gateway client based on `ConfigService`.
- [ ] Intentionally create a circular dependency between two services, hit the error, then fix it with `forwardRef()` and again by extracting a shared module - compare both fixes.
- [ ] Write env validation with `class-validator` that fails startup on a missing required var; run it and read the error.
- [ ] Draw the full request lifecycle pipeline from memory, then check it against this chapter.

---

## Senior red flags / green flags

### Green flags
- Explains DI in terms of *testability and decoupling*, not just "Nest does it automatically."
- Knows the exact request pipeline order without hand-waving.
- Has a real opinion on feature-based vs layer-based structure, backed by a project.
- Knows `enableShutdownHooks()` is required - a classic "gotcha" that separates people who've run this in production from people who haven't.
- Ties module boundaries to business domains, not files.

### Red flags
- "Modules are just folders."
- Can't explain the difference between a guard and an interceptor.
- Thinks `REQUEST` scope has no downside.
- Puts business logic and persistence access directly in controllers.
- No opinion on how they'd structure a legacy rewrite.

---

## Tie-backs to your experience

- **VetApp**: full PHP -> NestJS rewrite, module-by-module, against an existing MySQL schema - the single strongest architecture story you have.
- **Wizer**: added NestJS backend administration features on top of an existing system - speaks to integrating cleanly into an existing module graph, not just greenfield design.
- **Travel2Georgia**: designed the *entire* backend from scratch - speaks to root-level architecture decisions (module layout, config, infra) with no legacy constraints.

---

## Mastery checklist

- [ ] I can explain modules, providers, and DI to another engineer in 10 minutes with a whiteboard.
- [ ] I can name the 4 custom provider types and when to use each.
- [ ] I can recite the full request lifecycle pipeline without notes.
- [ ] I can justify feature-based structure with a real example (VetApp).
- [ ] I can explain provider scopes and their performance implications.
- [ ] I can explain why `enableShutdownHooks()` matters in a containerized deployment.
- [ ] I have a rehearsed 60-90 second story about the VetApp PHP -> NestJS rewrite.
