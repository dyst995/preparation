# 13. Senior-Level Best Practices

> Source: `interview-prep/nestjs/01-nestjs-architecture.md`

### Decision framework: drawing module boundaries that survive growth

Module boundaries are the single highest-leverage architectural decision in a NestJS codebase - get them wrong and every later refactor fights the grain of the code. Work through these questions per candidate module:

1. **Does this concept change for a different reason than its neighbors?** (Appointments change for scheduling-rule reasons; Payments change for billing/compliance reasons - separate modules even if one engineer touches both today.)
2. **Would a second application ever need to reuse this in isolation?** If yes (e.g., a `NotificationsModule` that a future worker process or a different service could reuse), keep its public surface (what it `exports`) intentionally minimal and stable.
3. **Is the coupling between two modules inherent to the domain, or accidental?** Inherent coupling (an `Appointment` genuinely references a `Vet`) is fine and expected. Accidental coupling (an `AppointmentsService` reaching into `PaymentsService`'s internals because it was convenient) is a boundary violation - route it through an explicit, exported interface instead.
4. **Can this module be tested and reasoned about without spinning up half the app?** If a module's tests require importing five unrelated modules just to satisfy DI, that's a signal its boundary is drawn wrong or its dependencies are too broad.

### Module boundary anti-patterns (call these out unprompted)

- **The "god module."** A `SharedModule` or `CoreModule` that every other module imports and that itself imports half the app - it starts as `common` utilities and slowly becomes a dumping ground. Keep `common`/`shared` strictly to cross-cutting, domain-agnostic concerns (guards, filters, generic decorators); domain logic never belongs there.
- **Reaching into another module's repository directly.** If `NotificationsService` injects `Repository<Appointment>` directly instead of calling `AppointmentsService`'s public methods, you've broken encapsulation - now two modules both "own" writes to the same table with no single place enforcing invariants. Export a service method, not a repository, across module boundaries.
- **Circular dependencies as a chronic pattern, not a one-off.** One `forwardRef()` here and there is normal. If a codebase has a dozen of them, that's evidence the domain boundaries themselves are wrong, not that `forwardRef()` is being underused - the fix is usually introducing a third module (or an event-based decoupling) that both sides depend on instead of depending on each other directly.
- **Overusing `@Global()`.** Every global module is an invisible dependency - a consumer doesn't need to declare it in `imports`, which means the module graph (a real, useful artifact for onboarding and refactors) stops reflecting reality. Reserve it for true infrastructure (config, logging) that's genuinely needed everywhere.

### Module boundaries as team boundaries

- As a team grows past a couple of engineers, module boundaries become **ownership boundaries** whether or not you plan for it - assign rough ownership per feature module (even informally, via CODEOWNERS on the module's folder) so architectural decisions within it have an accountable reviewer.
- A module's `exports` array is its **public API contract with the rest of the team**, not just the framework. Changing what a module exports (removing a provider another team's module depends on) is a breaking change and deserves the same care as changing a REST API's response shape.
- When a legacy rewrite (VetApp-style) is in progress, module-by-module migration works specifically *because* Nest's module boundaries map onto deployable/testable units - each migrated module can be verified independently against the legacy system's behavior for that domain, rather than needing the whole rewrite to be correct before anything ships.

### Graceful shutdown in a real containerized deployment - beyond `enableShutdownHooks()`

Knowing `app.enableShutdownHooks()` exists is table stakes; the senior-level follow-up is knowing what a *correct* shutdown sequence actually does, end to end, in Kubernetes/Docker:

1. Orchestrator marks the pod/container for termination and sends `SIGTERM`.
2. The app should immediately stop accepting *new* work at the load-balancer level - this usually means failing the **readiness probe** first (a separate concern from the shutdown hook itself) so the orchestrator stops routing new traffic, while still allowing in-flight requests to finish.
3. `OnModuleDestroy`/`beforeApplicationShutdown`/`OnApplicationShutdown` hooks fire, in that order - this is where you drain a job queue (stop pulling new jobs, let in-flight ones finish or requeue safely), close the DB connection pool, flush logs/metrics, and deregister from service discovery.
4. If shutdown doesn't complete within the orchestrator's grace period (Kubernetes default 30s, configurable via `terminationGracePeriodSeconds`), `SIGKILL` follows - anything not finished is lost, so slow cleanup (a long-running job with no cancellation) needs its own timeout inside the shutdown hook rather than assuming unlimited time.
5. **A very common real bug:** the readiness probe keeps reporting healthy right up until the process actually exits, so the orchestrator keeps sending new traffic into a pod that's already mid-shutdown - correct behavior is to flip readiness to "not ready" as the *first* step of shutdown handling, before any hooks even run.

### Anti-patterns and failure modes

| Anti-pattern | Why it hurts | Fix |
|---|---|---|
| A `SharedModule` importing and re-exporting most of the app | Defeats module boundaries; hides real dependencies | Keep shared modules strictly to cross-cutting infra concerns |
| Injecting another domain's repository directly instead of calling its service | Breaks encapsulation; two places can now violate the same invariant | Export service methods across module boundaries, never repositories |
| Chronic `forwardRef()` usage across many module pairs | Symptom of wrong domain boundaries, not a tooling gap | Extract a shared module or use domain events to decouple |
| `enableShutdownHooks()` called but readiness probe never flips during shutdown | Orchestrator keeps routing traffic into a terminating pod | Fail the readiness check as the first step of the shutdown sequence |
| `REQUEST`-scoped provider high in the dependency graph "just in case" | Silently makes a large subtree request-scoped, tanking throughput | Scope narrowly; pass request-specific data explicitly where possible |
| No env validation at startup | A missing `JWT_SECRET` or DB URL surfaces as a confusing runtime error hours later instead of a failed deploy | Validate synchronously at bootstrap; fail fast |

### Observability for architecture-level health

- Track provider instantiation time/count in local dev if bootstrap feels slow - a bloated dependency graph (too many eager providers, unnecessary `forRootAsync` factories doing heavy work) shows up first as slow cold starts, which matters a lot for serverless/autoscaling deployments.
- Log lifecycle hook execution (module init, shutdown) at `debug` level in non-prod so a "why didn't my cleanup run" question has an immediate, greppable answer instead of requiring a fresh reproduction.
- Structured logging with request correlation IDs (injected via middleware or an interceptor) so a single request's path through guards/interceptors/services/repositories can be traced end to end - essential once a module graph is more than a handful of modules deep.

### Team/scalability practices

- Keep a living module dependency diagram (even a simple generated one) - it's the fastest way for a new engineer to understand "what can safely change without rippling everywhere," and it makes accidental new circular dependencies visible in review.
- Establish a lightweight ADR (architecture decision record) habit for module-boundary decisions that aren't obvious - "why is `Notifications` its own module instead of living inside `Appointments`" is exactly the kind of decision that gets silently re-litigated by someone new six months later without one.
- For a legacy rewrite specifically, keep a running compatibility checklist per migrated module (which legacy endpoints/behaviors have been verified equivalent) so "is this module done" has an objective answer instead of a feeling.

### Harder senior follow-up Q&A

**Q: Two modules, `Appointments` and `Billing`, both need to know when an appointment is cancelled - `Appointments` to update its own status, `Billing` to issue a refund. How do you wire this without a circular dependency?**
> "I wouldn't have `AppointmentsService` directly call into `BillingService` (or vice versa) - that's exactly the coupling that leads to `forwardRef()` sprawl. Instead I'd emit a domain event (`@nestjs/event-emitter`, or a lightweight internal event bus) from `AppointmentsService` when an appointment is cancelled, and have `BillingService` subscribe to that event independently. Neither module needs to import the other; `Appointments` doesn't even need to know `Billing` exists. This also makes it trivial to add a third subscriber (e.g., `Notifications`) later without touching `Appointments` at all."

**Q: Your readiness probe and liveness probe both just check 'is the HTTP server listening.' What's wrong with that, and what would you fix first?**
> "That conflates two different questions. Liveness should ask 'is the process healthy enough that restarting it would help' - a genuinely stuck/deadlocked process. Readiness should ask 'should traffic be routed here right now' - which needs to become false immediately on `SIGTERM` (before cleanup even starts) and also false if a critical dependency like the database is unreachable, even if the HTTP server itself is technically still listening. I'd split them: liveness stays simple (process responds at all), readiness checks actual dependency health and flips to not-ready as the very first step of graceful shutdown."

**Q: You're asked to extract a module (say, `Notifications`) into its own deployable microservice six months from now. How would today's module design decisions make that easier or harder?**
> "If `NotificationsModule` only communicates with the rest of the app through its exported service methods (or better, through emitted domain events) and never has other modules reaching into its repositories or internals directly, extraction is mostly a matter of standing up the same code behind a network boundary (HTTP, message queue) and replacing direct in-process calls with calls over that boundary - the domain logic itself doesn't need to change. If other modules have been injecting `NotificationsService`'s internals or its repository directly, extraction becomes a much larger refactor, because those callers have implicitly depended on it being in-process. This is the practical payoff of taking module boundaries seriously even in a monolith that has no near-term plan to split."

**Q: How do you decide whether a piece of cross-cutting logic belongs in Middleware, a Guard, or an Interceptor at the architecture level, not just 'what's the difference'?**
> "By what it needs access to and when it needs to run relative to routing. Middleware runs before Nest's routing/DI context is fully resolved - no access to `@Roles()`-style handler metadata - so it's for transport-level concerns (raw logging, CORS, body parsing) that don't need route awareness. Guards run with full execution context and decide yes/no before the handler - the right place for anything that can outright reject a request (auth, RBAC). Interceptors wrap the whole handler execution and can transform what goes in or out - the right place for cross-cutting concerns that aren't a yes/no gate (timing, response shaping, caching). If I catch myself putting an allow/deny decision in an interceptor, or trying to transform a response in a guard, that's a sign it's in the wrong layer."

**Q: A new engineer asks why you didn't just put everything in one big `AppModule` for a small project - isn't the module structure overkill at that size?**
> "For a genuinely tiny, short-lived project, it might be - I wouldn't over-engineer a throwaway prototype. But most 'small' projects don't stay small, and the cost of introducing feature modules from day one is low (a few extra files), while the cost of retrofitting boundaries onto an already-tangled `AppModule` later is high (untangling implicit dependencies nobody documented). I default to feature modules even early, treating it as cheap insurance rather than premature architecture."

**Q: How do you review a PR that adds a new module for a signal that its boundaries are drawn well, in under two minutes?**
> "I check three things fast: does `exports` look intentionally small (not exporting everything just in case), does `imports` only list modules it genuinely needs rather than importing broadly for convenience, and does the module's name describe a business capability rather than a technical layer. If any of those look off, I'll ask about it before approving, since boundary mistakes are far cheaper to fix at review time than after three other modules have started depending on the wrong shape."

---
