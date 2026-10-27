# NestJS — Essential (3-day)

Selected 90 of 500 NestJS handbook questions for a senior full-stack interview sprint. Ordered by preparation priority within each tier (not by original file order or difficulty label). Scores use interview relevance 30%, fundamental importance 25%, practical applicability 20%, knowledge coverage 15%, senior-level depth 10%.

## Must Know (40)

1. [NEST-002](../nestjs/01-fundamentals.md#nest-002) — The four @Module arrays
   Why: Module boundary literacy: imports/controllers/providers/exports is the Nest mental model every senior is expected to teach. Score: 4.90
2. [NEST-051](../nestjs/02-request-lifecycle.md#nest-051) — The order one HTTP request walks
   Why: Request pipeline order is the map for placing auth, validation, and response shaping correctly. Score: 4.90
3. [NEST-004](../nestjs/01-fundamentals.md#nest-004) — How constructor injection chooses a token
   Why: Explains how design:paramtypes becomes a token and when @Inject is mandatory—core DI fluency. Score: 4.85
4. [NEST-014](../nestjs/01-fundamentals.md#nest-014) — useClass, useValue, useFactory, and useExisting
   Why: All four custom-provider forms; interviewers use this to probe wiring and testability. Score: 4.90
5. [NEST-005](../nestjs/01-fundamentals.md#nest-005) — What the default scope actually guarantees
   Why: Singleton means per registration, not per process—prevents shared-state bugs and wrong scope choices. Score: 4.85
6. [NEST-173](../nestjs/04-auth.md#nest-173) — Guard vs middleware vs interceptor
   Why: Choosing the right enhancer for allow/deny vs parse vs wrap is a classic senior filter question. Score: 4.90
7. [NEST-013](../nestjs/01-fundamentals.md#nest-013) — Sharing one instance across modules
   Why: Exports + one providing module is how you share a true singleton across features. Score: 4.75
8. [NEST-151](../nestjs/04-auth.md#nest-151) — Authentication vs authorization in Nest
   Why: Separating authentication from authorization keeps guards composable and public routes clean. Score: 4.65
9. [NEST-252](../nestjs/06-validation-api.md#nest-252) — What does `whitelist: true` do in `ValidationPipe`
   Why: whitelist is the default mass-assignment defense; seniors must explain the silent-strip pitfall. Score: 4.65
10. [NEST-104](../nestjs/03-dependency-injection.md#nest-104) — Scope bubbling
   Why: Scope bubbling explains why injecting REQUEST scope rebuilds half the graph—performance and design. Score: 4.65
11. [NEST-060](../nestjs/02-request-lifecycle.md#nest-060) — useGlobalGuards and APP_GUARD
   Why: APP_GUARD gets DI; new RolesGuard() does not—and registration order matters. Score: 4.60
12. [NEST-209](../nestjs/05-database.md#nest-209) — [Both] DTO vs entity — why separate them
   Why: DTO/entity separation is the API boundary that stops leaking persistence and privileged fields. Score: 4.65
13. [NEST-063](../nestjs/02-request-lifecycle.md#nest-063) — Interceptors on the way in and on the way out
   Why: Inbound/outbound interceptor order is required for logging, timing, and response envelopes. Score: 4.50
14. [NEST-066](../nestjs/02-request-lifecycle.md#nest-066) — How pipes are applied to arguments
   Why: Pipes are per-argument and parallel across params—validation placement depends on this. Score: 4.50
15. [NEST-003](../nestjs/01-fundamentals.md#nest-003) — Why a class must be registered
   Why: Unregistered classes are invisible to the container; the most common Nest startup confusion. Score: 4.50
16. [NEST-110](../nestjs/03-dependency-injection.md#nest-110) — useFactory and inject
   Why: useFactory + inject is how ConfigService, clients, and conditional wiring actually get built. Score: 4.50
17. [NEST-155](../nestjs/04-auth.md#nest-155) — Configuring `JwtStrategy`
   Why: JwtStrategy validate/payload shape is the spine of Nest JWT auth interviews. Score: 4.50
18. [NEST-177](../nestjs/04-auth.md#nest-177) — `@Roles()` and `RolesGuard`
   Why: Roles metadata + RolesGuard is the baseline authorization pattern seniors implement. Score: 4.50
19. [NEST-211](../nestjs/05-database.md#nest-211) — [TypeORM] How do you use a QueryRunner transaction
   Why: QueryRunner + manager (not injected repos) is the TypeORM transaction gotcha interviews love. Score: 4.50
20. [NEST-356](../nestjs/08-testing.md#nest-356) — overrideProvider
   Why: overrideProvider is how Nest unit tests stay honest to the module graph. Score: 4.50
21. [NEST-414](../nestjs/09-security-performance.md#nest-414) — ValidationPipe as a security boundary
   Why: ValidationPipe is a security boundary—and still not authorization; critical nuance. Score: 4.50
22. [NEST-130](../nestjs/03-dependency-injection.md#nest-130) — forRootAsync()
   Why: forRootAsync is the standard seam for ConfigService-driven DB/queue/JWT modules. Score: 4.50
23. [NEST-006](../nestjs/01-fundamentals.md#nest-006) — What belongs on a controller, and what belongs on a service
   Why: Thin controllers / fat services is Nest architecture hygiene interviewers expect. Score: 4.50
24. [NEST-184](../nestjs/04-auth.md#nest-184) — 401 vs 403
   Why: 401 vs 403 proves you understand authn failure vs authz failure in HTTP terms. Score: 4.50
25. [NEST-220](../nestjs/05-database.md#nest-220) — [Both] Migrations vs `synchronize: true`
   Why: synchronize:true vs migrations is a production-safety litmus test. Score: 4.50
26. [NEST-071](../nestjs/02-request-lifecycle.md#nest-071) — Which exception filter is selected
   Why: Filter specificity selection drives consistent error envelopes across the app. Score: 4.30
27. [NEST-106](../nestjs/03-dependency-injection.md#nest-106) — Performance cost of request scope
   Why: Request-scope cost is the counterargument when juniors inject REQUEST everywhere. Score: 4.45
28. [NEST-175](../nestjs/04-auth.md#nest-175) — The `@Public()` decorator
   Why: @Public + reflector metadata is how global JWT guards stay usable. Score: 4.40
29. [NEST-202](../nestjs/05-database.md#nest-202) — [TypeORM] What do forFeature and @InjectRepository do
   Why: forFeature + @InjectRepository is TypeORM module wiring every Nest shop uses. Score: 4.40
30. [NEST-254](../nestjs/06-validation-api.md#nest-254) — What does `transform: true` do
   Why: transform:true makes DTO instances real—needed for nested validation and typed pipes. Score: 4.40
31. [NEST-301](../nestjs/07-async-distributed.md#nest-301) — Why a handler should queue slow work
   Why: Queue slow work / 202 Accepted is the default scalability answer for Nest HTTP handlers. Score: 4.40
32. [NEST-351](../nestjs/08-testing.md#nest-351) — What a TestingModule is
   Why: TestingModule is the Nest testing contract; new Service() skips the graph. Score: 4.40
33. [NEST-128](../nestjs/03-dependency-injection.md#nest-128) — Debugging "can't resolve dependencies"
   Why: Reading 'can't resolve dependencies' is daily Nest debugging skill. Score: 4.35
34. [NEST-041](../nestjs/01-fundamentals.md#nest-041) — Read the startup error: the provider is not exported
   Why: Not-exported provider errors teach module privacy better than theory alone. Score: 4.25
35. [NEST-058](../nestjs/02-request-lifecycle.md#nest-058) — return false and throw UnauthorizedException
   Why: return false vs throw UnauthorizedException changes status and client messaging. Score: 4.35
36. [NEST-162](../nestjs/04-auth.md#nest-162) — Sessions vs JWT
   Why: Sessions vs JWT trade-offs dominate auth architecture discussions. Score: 4.30
37. [NEST-008](../nestjs/01-fundamentals.md#nest-008) — onModuleInit versus onApplicationBootstrap
   Why: onModuleInit vs onApplicationBootstrap orders boot work correctly (clients, seeds). Score: 4.05
38. [NEST-297](../nestjs/06-validation-api.md#nest-297) — Why use response DTOs instead of returning entities
   Why: Response DTOs prevent entity leakage and accidental N+1 via serializers. Score: 4.35
39. [NEST-449](../nestjs/09-security-performance.md#nest-449) — What breaks when you add replicas
   Why: Multi-replica breakage (memory throttle/cache/cron/ws) is senior production Nest. Score: 4.60
40. [NEST-451](../nestjs/10-enterprise.md#nest-451) — Modular monolith vs microservices
   Why: Modular monolith first is the architecture default before microservices talk. Score: 4.30

## Important (30)

1. [NEST-015](../nestjs/01-fundamentals.md#nest-015) — Interfaces, abstract classes, and tokens
   Why: Interface erasure forces tokens—completes DI story after constructor injection. Score: 4.55
2. [NEST-157](../nestjs/04-auth.md#nest-157) — Access and refresh tokens
   Why: Access/refresh pairing is the practical JWT session design interviewers expect. Score: 4.50
3. [NEST-016](../nestjs/01-fundamentals.md#nest-016) — What a dynamic module returns
   Why: DynamicModule return shape is how libraries and forRoot patterns actually compose. Score: 4.40
4. [NEST-253](../nestjs/06-validation-api.md#nest-253) — What does `forbidNonWhitelisted` add on top of `whitelist`
   Why: forbidNonWhitelisted turns silent strip into a loud 400—team-policy choice. Score: 4.25
5. [NEST-107](../nestjs/03-dependency-injection.md#nest-107) — Accessing the request in a provider
   Why: REQUEST injection vs passing args—when per-request data belongs in a provider. Score: 4.35
6. [NEST-010](../nestjs/01-fundamentals.md#nest-010) — Why a global module hides a dependency
   Why: Global modules hide import edges; seniors know when that opacity hurts. Score: 4.25
7. [NEST-160](../nestjs/04-auth.md#nest-160) — localStorage vs httpOnly cookies
   Why: httpOnly cookies vs localStorage is the XSS/token-storage interview staple. Score: 4.25
8. [NEST-179](../nestjs/04-auth.md#nest-179) — RBAC, ABAC, permissions
   Why: RBAC vs ABAC/permissions frames how far RolesGuard should go. Score: 4.40
9. [NEST-227](../nestjs/05-database.md#nest-227) — [TypeORM] What causes N+1 in Nest services
   Why: N+1 in Nest services is the usual ORM performance failure mode. Score: 4.25
10. [NEST-335](../nestjs/07-async-distributed.md#nest-335) — The dual-write problem the outbox solves
   Why: Dual-write/outbox is the reliability answer when DB + emit must stay consistent. Score: 4.40
11. [NEST-344](../nestjs/07-async-distributed.md#nest-344) — Why every replica fires the same cron
   Why: Cron on every replica is the classic multi-instance footgun with Nest Schedule. Score: 4.35
12. [NEST-085](../nestjs/02-request-lifecycle.md#nest-085) — APP_INTERCEPTOR and useGlobalInterceptors
   Why: APP_INTERCEPTOR vs useGlobalInterceptors mirrors the DI lesson from guards. Score: 4.20
13. [NEST-119](../nestjs/03-dependency-injection.md#nest-119) — ModuleRef.resolve() vs get()
   Why: resolve vs get is how you correctly fetch scoped providers outside constructors. Score: 4.10
14. [NEST-028](../nestjs/01-fundamentals.md#nest-028) — What forwardRef delays
   Why: forwardRef delays token resolution—necessary but usually a design smell. Score: 3.85
15. [NEST-052](../nestjs/02-request-lifecycle.md#nest-052) — What middleware is allowed to touch
   Why: Middleware can touch raw req/res but not ExecutionContext/handler metadata. Score: 3.95
16. [NEST-164](../nestjs/04-auth.md#nest-164) — CSRF with cookie auth
   Why: Cookie auth without CSRF thinking is incomplete for browser clients. Score: 4.10
17. [NEST-182](../nestjs/04-auth.md#nest-182) — Ownership checks
   Why: Ownership checks are the resource-level authz gap RolesGuard does not cover. Score: 4.10
18. [NEST-203](../nestjs/05-database.md#nest-203) — [Prisma] How should PrismaService be defined
   Why: PrismaService as injectable lifecycle-aware client is the Nest+Prisma standard. Score: 4.10
19. [NEST-213](../nestjs/05-database.md#nest-213) — [Prisma] $transaction: array vs interactive
   Why: Array vs interactive $transaction—when you need intermediate reads. Score: 4.05
20. [NEST-250](../nestjs/05-database.md#nest-250) — [Both] How do you map DB errors to HTTP errors
   Why: Mapping unique violations to 409/400 is production API hygiene. Score: 4.10
21. [NEST-256](../nestjs/06-validation-api.md#nest-256) — What are DTO design principles for a good API
   Why: DTO design principles keep create/update/query shapes honest and documentable. Score: 4.10
22. [NEST-304](../nestjs/07-async-distributed.md#nest-304) — What a processor does and how concurrency works
   Why: Processor concurrency is how BullMQ throughput and ordering trade off. Score: 4.10
23. [NEST-368](../nestjs/08-testing.md#nest-368) — createNestApplication
   Why: createNestApplication is the bridge from TestingModule to HTTP e2e. Score: 3.95
24. [NEST-021](../nestjs/01-fundamentals.md#nest-021) — What is unsafe in a constructor
   Why: Async work in constructors races lifecycle—boot bugs seniors diagnose fast. Score: 4.05
25. [NEST-176](../nestjs/04-auth.md#nest-176) — `getAllAndOverride` vs `getAllAndMerge`
   Why: getAllAndOverride vs merge decides how @Public/@Roles compose on class+method. Score: 4.05
26. [NEST-139](../nestjs/03-dependency-injection.md#nest-139) — @Global() modules
   Why: @Global() is convenient and costly to the dependency graph—know both sides. Score: 3.75
27. [NEST-263](../nestjs/06-validation-api.md#nest-263) — How do you customize validation error responses
   Why: Custom validation error shape is what clients and FE teams actually need. Score: 3.80
28. [NEST-267](../nestjs/06-validation-api.md#nest-267) — What's the difference between `app.useGlobalPipes()` and `APP_PIPE`
   Why: APP_PIPE gets DI and module order; bootstrap useGlobalPipes does not. Score: 3.95
29. [NEST-310](../nestjs/07-async-distributed.md#nest-310) — Attempts and backoff
   Why: Attempts/backoff separates transient failures from poison messages. Score: 3.70
30. [NEST-400](../nestjs/08-testing.md#nest-400) — A practical Nest test portfolio
   Why: A practical Nest test portfolio beats chasing coverage percentage. Score: 3.75

## Advanced (20)

1. [NEST-120](../nestjs/03-dependency-injection.md#nest-120) — ContextId
   Why: ContextId is how request-scoped DI is keyed—needed for durable/resolve depth. Score: 3.35
2. [NEST-148](../nestjs/03-dependency-injection.md#nest-148) — Scope of global enhancers
   Why: Global enhancer scope bubbling surprises teams that inject REQUEST into APP_*. Score: 3.55
3. [NEST-158](../nestjs/04-auth.md#nest-158) — Refresh token rotation
   Why: Refresh rotation is the senior hardening of access/refresh token design. Score: 3.70
4. [NEST-215](../nestjs/05-database.md#nest-215) — [Both] How do you propagate a transaction without passing `tx` everywhere
   Why: Propagating a transaction without threading tx is Unit-of-Work/CLS senior territory. Score: 3.85
5. [NEST-287](../nestjs/06-validation-api.md#nest-287) — How do you implement idempotency keys in Nest
   Why: Idempotency keys for write APIs are production Nest patterns at scale. Score: 3.80
6. [NEST-307](../nestjs/07-async-distributed.md#nest-307) — What Redis stores for BullMQ, and what it does not promise
   Why: What Redis stores for BullMQ—and what it does not promise—avoids false durability. Score: 3.55
7. [NEST-314](../nestjs/07-async-distributed.md#nest-314) — Why queue concurrency breaks ordering
   Why: Concurrency vs ordering is the job-queue design question after 'just use Bull'. Score: 3.70
8. [NEST-338](../nestjs/07-async-distributed.md#nest-338) — At-least-once plus idempotency
   Why: At-least-once + idempotent consumers is the distributed messaging contract. Score: 3.85
9. [NEST-169](../nestjs/04-auth.md#nest-169) — Revocation and blacklist trade-offs
   Why: JWT revocation/blacklist trade-offs force stateful checks back into the design. Score: 3.70
10. [NEST-112](../nestjs/03-dependency-injection.md#nest-112) — Async providers
   Why: Async providers control boot ordering for connections that must be ready. Score: 3.55
11. [NEST-191](../nestjs/04-auth.md#nest-191) — Tenant isolation below the auth layer
   Why: Tenant isolation below auth is where multi-tenant Nest apps actually fail. Score: 3.55
12. [NEST-325](../nestjs/07-async-distributed.md#nest-325) — Two instances: a copy each, or shared work
   Why: Fan-out vs competing consumers when scaling Nest microservice instances. Score: 3.55
13. [NEST-330](../nestjs/07-async-distributed.md#nest-330) — When CQRS is unnecessary
   Why: Knowing when CQRS is unnecessary shows architectural judgment, not cargo cult. Score: 3.60
14. [NEST-367](../nestjs/08-testing.md#nest-367) — Request-scoped providers and resolve
   Why: Testing request-scoped providers needs resolve/ContextId—easy to get wrong. Score: 3.40
15. [NEST-382](../nestjs/08-testing.md#nest-382) — Globals that live only in main.ts
   Why: Globals registered only in main.ts vanish from TestingModule—common e2e trap. Score: 3.80
16. [NEST-413](../nestjs/09-security-performance.md#nest-413) — One limit across many pods
   Why: Per-pod throttling is wrong; shared store makes rate limits real under load. Score: 3.80
17. [NEST-441](../nestjs/09-security-performance.md#nest-441) — Stampede and invalidation
   Why: Cache stampede/invalidation is the hard part after CacheInterceptor demos. Score: 3.40
18. [NEST-468](../nestjs/10-enterprise.md#nest-468) — Request context and CLS
   Why: CLS/request context powers tenant, tx, and audit propagation without param drilling. Score: 3.55
19. [NEST-480](../nestjs/10-enterprise.md#nest-480) — Circuit breakers for HttpService
   Why: Circuit breaking HttpService is resilience beyond retries for dependent APIs. Score: 3.40
20. [NEST-490](../nestjs/10-enterprise.md#nest-490) — When NOT to split a Nest service
   Why: When NOT to split a Nest service—Staff-level antidote to premature microservices. Score: 3.65
