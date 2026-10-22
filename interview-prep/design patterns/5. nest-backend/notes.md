# Design patterns in NestJS / backend

## What you need to know

This unit **maps GoF / SOLID names onto Nest**, not Nest architecture from scratch. Modules, providers, controllers, TypeORM, JWT/RBAC, and the request lifecycle are assumed from the Nest chapters. Here the job is: **name the pattern, point at the Nest construct, say when you would not use it.**

Nest is already a pattern kit:

| Nest construct | Pattern it is applying |
|---|---|
| IoC container + constructor args | **Dependency Injection**, implementing **DIP** |
| Default provider | **Singleton** (app lifetime) |
| `exports` vs unexported `providers` | **Facade** / module boundary |
| Middleware → guards → interceptors → pipes → handler → filters | **Chain of Responsibility** |
| `@InjectRepository(User)` | **Repository** (TypeORM already gives you one) |
| DTO at HTTP, `PaymentGateway` at a vendor SDK | **Adapter** at the edges |

You do not “add DI to Nest.” You **use** Nest’s DI. Extra classes earn their keep only when they hide a real change of shape or a real query/invariant — not because a blog post had a `use-cases/` folder.

CV flavor (no invented numbers): VetApp was a PHP → Nest rewrite against existing MySQL. Feature modules were the migration boundaries. JWT + RBAC (admin / vet / receptionist) sat in the pipeline as guards. Bank of Georgia payments sat behind an adapter; Wizer’s Flitt integration is the same idea with a different SDK.

---

## Dependency Injection is how Nest applies DIP

**DIP** (Dependency Inversion Principle): high-level code depends on an **abstraction**, not on a concrete class. **DI** (Dependency Injection) is the **technique** that supplies that abstraction from the outside. Nest’s container is DI. DIP is the reason you bother.

**Constructor injection** is the Nest default. The class **declares** what it needs; the container **constructs** the graph at bootstrap from `providers` / `exports`. TypeScript `emitDecoratorMetadata` records constructor param types; for interfaces (erased) you use an explicit token + `@Inject()`.

```ts
export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');

export interface PaymentGateway {
  charge(input: ChargeInput): Promise<ChargeResult>;
}

@Injectable()
export class PaymentsService {
  constructor(
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
  ) {}
}

// module: bind the abstraction (DIP) via the container (DI)
{ provide: PAYMENT_GATEWAY, useClass: BogPaymentGateway }
```

**Why it exists:** swap implementations without rewriting callers. Tests pass a fake. VetApp production binds Bank of Georgia; a unit test binds `{ charge: jest.fn() }`. Same `PaymentsService`.

```ts
const moduleRef = await Test.createTestingModule({
  providers: [
    PaymentsService,
    { provide: PAYMENT_GATEWAY, useValue: { charge: jest.fn().mockResolvedValue({ ok: true }) } },
  ],
}).compile();
```

**Not Service Locator, not a module singleton.**

| | Constructor injection (Nest) | Service Locator | Global singleton import |
|---|---|---|---|
| How the dep appears | Constructor parameter | `moduleRef.get(X)` / `app.get(X)` inside the method | `import { payments } from './payments.singleton'` |
| Dependencies | **Declared**, visible | **Hidden** until the line runs | Hidden, and one shared instance forever |
| Tests | Replace the provider | Must fake the locator / boot the app | `jest.mock` the module or you share real state |

`ModuleRef.get()` exists for genuine late resolution (dynamic plugins, breaking a cycle you cannot extract yet). Reaching for it in every service is Service Locator wearing a Nest badge.

**Interview:** “Nest is built on DI, which is how we apply DIP. I inject constructors, bind tokens in the module, and mock providers in `Test.createTestingModule`. I do not `new` services, and I do not import a global `paymentsService`.”

---

## Provider scopes: singleton is the default, and that is a feature

| Scope | Lifetime | Use |
|---|---|---|
| `DEFAULT` (singleton) | **One instance** for the process | Almost everything. Stateless services, TypeORM repos, config. |
| `REQUEST` | **One instance per incoming request** (then GC) | Per-request context that is awkward to pass as a parameter. Costs allocations; **bubbles** to consumers. |
| `TRANSIENT` | **New instance every injection** | Rare. A helper that must not share mutable fields even inside one request. |

Default singleton is **not** “I forgot to set a scope.” It is the correct choice when the service is **stateless** (methods take input, talk to DB/other services, return). Node is concurrent: many requests share that one object.

**Classic bug — request user on a singleton:**

```ts
@Injectable() // DEFAULT singleton
export class RequestContext {
  user?: AuthUser;

  setUser(user: AuthUser) {
    this.user = user; // shared field, many in-flight requests
  }
}
```

Request A sets `receptionist`. Request B (overlapping) sets `admin`. A’s later `this.user` is **admin**. Identity leak / wrong RBAC. Same bug with `this.tenantId`, `this.locale`, a cached JWT payload, anything request-shaped stored on a default-scoped provider.

**Fix, in order of preference:**

1. Pass `user` as a **method argument** from the controller (`@CurrentUser()` → service method). No shared mutable field.
2. `Scope.REQUEST` only if a deep call stack cannot thread the argument without turning every signature into noise — accept that **every consumer of that provider becomes request-scoped too** (scope bubbles to the narrower lifetime). Throughput cost is real; do not “just in case” a whole module.
3. Do not “fix” it by making a **TRANSIENT** context service and still writing `this.user` from a singleton caller — the singleton still holds one field.

`REQUEST` vs `TRANSIENT` in one request: inject a REQUEST provider twice → **same instance**. Inject a TRANSIENT twice → **two instances**.

**Interview:** “Default is singleton and that’s what I want for stateless services. I never stash the JWT user on a service field. I pass it in, or I use REQUEST scope deliberately and know it poisons the subtree.”

---

## Repository vs TypeORM Active Record

**Repository:** persistence operations live on a **separate object**. The entity is data (+ maybe domain methods that do not talk to the DB). Callers ask the repository to find/save.

**Active Record:** the **entity class** is also the persistence API (`user.save()`, `User.find()`). TypeORM supports this via `BaseEntity`.

Nest’s default TypeORM integration **is already Repository**:

```ts
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  findByEmail(email: string) {
    return this.users.findOne({ where: { email } });
  }
}
```

That `Repository<User>` **is** the pattern. You do **not** need a `UsersRepository` class for `find` / `save` / `delete`. A custom class is justified when the **query language of the domain** is richer than CRUD: conflicting appointment slots, “active vets at clinic X,” a QueryBuilder that must not leak into three services.

```ts
@Injectable()
export class AppointmentsRepository {
  constructor(
    @InjectRepository(Appointment) private readonly repo: Repository<Appointment>,
  ) {}

  findConflict(vetId: number, at: Date) {
    return this.repo
      .createQueryBuilder('a')
      .where('a.vet_id = :vetId', { vetId })
      .andWhere('a.scheduled_at = :at', { at })
      .andWhere('a.status IN (:...open)', { open: ['pending', 'confirmed'] })
      .getOne();
  }
}
```

Active Record in the same codebase usually **fights Nest DI**: `User.find()` is a static call, not an injected collaborator, so tests mock TypeORM globals instead of a provider. Fine in a small script; awkward in a Nest module graph.

**Do not claim:** every project needs a custom repo wrapping `Repository<T>`. That wrapper with `findAll()` delegating to `this.repo.find()` is an extra file, not architecture.

VetApp: entities mapped onto **existing** MySQL tables; services injected `Repository<Appointment>` (or a custom repo where slot/conflict queries were real). The rewrite was not “introduce Active Record,” and it was not “a repo class per table.”

---

## Module as a boundary / Facade

GoF **Facade**: a **small public surface** in front of a subsystem. A Nest `@Module()` is that boundary.

- `providers` — what this module **owns** (Nest can inject them **inside** the module).
- `exports` — the **public API** other modules may inject after they `import` this one.
- Unexported providers are **internal**. That is the point.

```ts
@Module({
  imports: [TypeOrmModule.forFeature([Appointment])],
  controllers: [AppointmentsController],
  providers: [AppointmentsService, SlotPolicy], // SlotPolicy stays private
  exports: [AppointmentsService],               // facade
})
export class AppointmentsModule {}
```

Another module that needs appointments **imports `AppointmentsModule` and injects `AppointmentsService`**. It does **not** inject `Repository<Appointment>` or `SlotPolicy`. Exporting the repository lets a second module write rows while bypassing invariants (double-booking, status machine). Facade broken.

`@Global()` is a facade with **invisible** imports — fine for `ConfigModule`, a lie for `AppointmentsModule`. Chronic `forwardRef()` is usually a bad boundary, not a missing pattern.

VetApp rewrite: one PHP blob → Nest **feature modules** (appointments, records, payments, auth). Each module’s `exports` was the contract the next migrated feature could depend on.

---

## Request pipeline as Chain of Responsibility

GoF **Chain of Responsibility**: a request travels a sequence of handlers; each hop **handles**, **transforms**, or **passes on** (or **stops** the chain). Nest’s HTTP pipeline is that chain. You do not reimplement it; you **place** a class on the right hop.

| Order | Hop | What this hop is for |
|---|---|---|
| 1 | **Middleware** | Express/Fastify level: CORS, raw body, request id. Weak Nest DI; runs before the route handler is bound. |
| 2 | **Guards** | **Allow or deny** (`canActivate`). JWT authentication, RBAC (`admin` / `vet` / `receptionist`). |
| 3 | **Interceptors** (before) | Wrap the handler stream: start a timer, bind CLS, open a span. |
| 4 | **Pipes** | **Validate / transform** params, query, body (`ValidationPipe`, `ParseIntPipe`). |
| 5 | **Controller** | Thin HTTP adapter: extract, call service, return. |
| 6 | **Interceptors** (after) | Map the result, cache, log duration. |
| 7 | **Filters** | Only if something **threw**: shape the error body. Not a substitute for a guard. |

**Spoken line (rehearse):** “The Nest pipeline is Chain of Responsibility. Middleware runs first at the HTTP adapter. Guards decide if the request is allowed — that’s JWT and RBAC. Interceptors wrap the handler. Pipes validate and transform the DTO. The controller runs. Interceptors can reshape the response. If anything threw, filters format the error.”

A guard that returns `false` / throws `UnauthorizedException` **stops the chain** — pipes and the controller never run. A pipe that throws `400` never hits the service. That short-circuit **is** the pattern.

Wrong hop: RBAC in an interceptor (the handler may already have started work in mental models; guards are the allow/deny hop). Validation in the service that should have been a pipe (HTTP concern leaking inward). Business rules in a filter (filters map exceptions, they do not decide slot conflicts).

---

## Adapter at the edges: HTTP DTO vs domain vs payment SDK

GoF **Adapter**: a wrapper that makes **one interface look like another** the rest of the app already speaks.

Three edges, three shapes — **do not use one TypeScript type for all three**:

| Edge | Shape | Job |
|---|---|---|
| HTTP | **DTO class** (`CreateAppointmentDto`) | Untrusted JSON → validated input. `class-validator` metadata. |
| Domain / application | Service args, entities, domain types | Rules: who may book, status transitions, money in **your** units. |
| Vendor | SDK / bank payload (`order_id`, tetri, Flitt’s field names) | Talk to Bank of Georgia or Flitt **only inside the adapter**. |

```ts
// HTTP edge (Adapter: wire JSON → our input)
export class CreatePaymentDto {
  @IsInt() appointmentId: number;
  @IsInt() amountCents: number;
}

// Domain port (what PaymentsService speaks)
export interface PaymentGateway {
  charge(input: { amountCents: number; metadata: Record<string, string> }): Promise<{ providerRef: string }>;
}

// Vendor edge (Adapter: our port → Bank of Georgia SDK)
@Injectable()
export class BogPaymentAdapter implements PaymentGateway {
  constructor(private readonly sdk: BogSdk) {}

  async charge(input: { amountCents: number; metadata: Record<string, string> }) {
    const raw = await this.sdk.createPayment({
      amountTetri: input.amountCents,
      extra: input.metadata,
    });
    return { providerRef: raw.order_id };
  }
}
```

`PaymentsService` never mentions `order_id` or `amountTetri`. Controllers never import `BogSdk`. Tests fake `PaymentGateway`. Wizer’s Flitt adapter is another `useClass` on the **same token**.

HTTP DTO ≠ entity. Returning a TypeORM `User` from a controller is **skipping** the outbound adapter (password hashes leak; see the typing-Nest unit). Inbound DTO ≠ `gateway.charge` input.

The controller **is** an HTTP adapter (transport). The payment class **is** a vendor adapter. Same pattern, different edge. Nest’s Express/Fastify platform is also an adapter — mention only if asked; do not derail into HTTP adapters.

---

## When NOT to add a pattern in Nest

Nest **already** gave you DI, a module facade, a CoR pipeline, and `Repository<T>`. Senior judgment is **not adding another named layer** on top of a CRUD module.

**Smell — anemic 15-file “clean architecture” for `PATCH /users/:id`:**

`users.controller.ts`, `users.service.ts`, `users.module.ts`, `create-user.dto.ts`, plus `user.entity.ts`, `user.repository.ts`, `user.repository.impl.ts`, `create-user.use-case.ts`, `update-user.use-case.ts`, `user.mapper.ts`, `user.response.mapper.ts`, `user.domain.ts`, `ports/in/create-user.port.ts`, `ports/out/user-repo.port.ts`, `adapters/user-repo.adapter.ts`.

Every file delegates to the next. The use-case calls the port calls the repo calls `repository.save`. No extra invariant. That is **ceremony**, not DIP. Interviewers who have shipped Nest will push: “What problem did the use-case class solve that `UsersService.update` did not?”

**Add a named pattern when a real seam exists:**

- **Custom repository** — domain query that would otherwise be copy-pasted QueryBuilder.
- **Adapter** — third-party SDK or a DTO/entity mismatch that can leak secrets or vendor types.
- **Strategy / token binding** — two payment providers, two hashers, test vs prod.
- **REQUEST scope** — proven need for per-request state, not a default.

**Do not add** a pattern because the previous unit named it. Composition over a new class: a function `mapBogStatus(raw)` inside the adapter file is enough until a second provider appears.

VetApp: rewrite **module by module**, thin controllers, services with injected repositories, guards for JWT/RBAC, a payment adapter because BoG’s API is not your domain. That is the bar. A use-case folder for `findAll` appointments would have slowed the migration without making the PHP replacement safer.

---

## Common mistakes and misconceptions

- Treating **DI and DIP as the same word**. DIP is the principle (depend on abstractions). DI is Nest’s constructor wiring.
- Storing **request user / tenant** on a **singleton** service. Concurrent requests share the field.
- Using **REQUEST** scope “for safety” on `UsersService`, bubbling half the graph, then wondering why latency jumped.
- Calling a **custom `UsersRepository`** mandatory. `Repository<User>` is already the pattern.
- Using TypeORM **Active Record** (`user.save()`) and then struggling to mock persistence in `TestingModule`.
- **Exporting repositories** (or making the module `@Global()`) so every feature writes the same table.
- Reciting pipeline hops **out of order**, or putting **auth in an interceptor** and **validation in a filter**.
- Letting **BoG/Flitt types** leak into controllers “because it’s faster.”
- Equating **more files** with senior architecture. Empty use-cases are a red flag, not a green one.
- `new PaymentsService()` inside a controller — you just opted out of the container.

---

## Connections to other concepts

`DIP → constructor DI → test doubles` is one chain. `DIP → PaymentGateway token → Adapter` is the same chain at a vendor edge.

`Module exports → Facade` is how DIP stays **local**: other modules depend on `AppointmentsService`, not on `Repository<Appointment>`.

`Pipeline CoR → Guard` is where VetApp JWT/RBAC lives. `Pipeline CoR → Pipe` is where HTTP DTOs become safe input. `Pipe output → service` should already be domain-shaped enough; leftover vendor fields mean the Adapter is in the wrong place.

`Singleton scope + mutable field` is the creational Singleton **misused as a request cache**. Default Nest singleton is fine; **stateful** singleton is the bug.

`Repository` (persistence) is not `Adapter` (shape change) and not `Facade` (module exports). People mash all three into “I have a repository layer.”

---

## Interview perspective

**30–60 seconds:**

> “Nest is already designed around a few patterns. The container is dependency injection, which is how we apply DIP — I constructor-inject abstractions and bind them in the module, so tests swap mocks and production can swap a Bank of Georgia adapter for Flitt without touching `PaymentsService`. Modules are facades: I export the service, not the TypeORM repository. Persistence is the repository pattern; injecting `Repository<User>` is enough unless I have a real domain query. The request pipeline is Chain of Responsibility: middleware, guards for JWT and RBAC, interceptors, pipes, handler, filters. Adapters sit at the edges — HTTP DTOs inbound, payment SDKs outbound. I don’t add a 15-file clean-architecture stack on a CRUD module; Nest already gave me the useful layers.”

**If they ask for a project:** VetApp PHP → Nest, feature modules as rewrite boundaries, guards for roles, `Repository<T>` on existing MySQL entities, payment adapter for Bank of Georgia. No metrics theater.

**Green:** names DIP vs DI; default singleton + the user-on-service bug; `Repository<T>` without a mandatory wrapper; pipeline table in order; adapter at payments; an explicit “I would not.”

**Red:** “Nest is just Express with decorators”; “I always use REQUEST scope for user”; “every table gets a custom repository and a use-case”; pipeline hops shuffled; SDK types in the controller.

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
