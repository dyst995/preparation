# 07. Senior-Level Best Practices

> Source: `interview-prep/nestjs/07-interview-questions.md`

### Cross-cutting decision framework (tie every chapter together)

Staff/senior-level backend interviews increasingly probe *how* you decide, not just *what* the right answer is for a known scenario. Every decision across this whole track reduces to the same four questions - practice applying this out loud to a system-design prompt you've never seen:

1. **What's the blast radius if this is wrong?** (one request vs one user vs every user vs a data-integrity/security incident)
2. **Who else depends on this, now and later?** (one module vs the whole app; one client vs web+mobile; one team vs multiple teams)
3. **Is this reversible, and how fast?** (a bad cache TTL is a redeploy; a bad migration on a huge table is hours of remediation; a leaked secret is a rotation-and-audit project)
4. **What's the actual cost of the "correct but paranoid" version versus the pragmatic version, given this project's real scale and risk?** (VetApp's medical/payment data justifies more ceremony than a low-stakes internal tool would)

### Consolidated production checklist (recite this as one list, unaided)

- [ ] Module boundaries map to business domains; nothing reaches into another module's repository directly; `exports` is treated as a real API contract.
- [ ] Every route is protected by a deny-by-default global guard with an explicit opt-out - a forgotten annotation fails safe.
- [ ] RBAC (role) and ownership (data) checks live in different layers and both exist wherever "can this user act on this resource" matters.
- [ ] Refresh tokens are hashed at rest, rotated on use, with reuse detection triggering full revocation.
- [ ] `enableShutdownHooks()` is called, and the readiness probe flips to not-ready as the *first* step of shutdown, before any cleanup hooks run.
- [ ] No relation is `eager: true` without a deliberate, documented reason; list endpoints with relations have a query-count regression test.
- [ ] `synchronize: true` is off everywhere except local prototyping; every migration's `down()` is actually tested.
- [ ] Slow/unreliable third-party calls (payment, email, SMS) are queued, not inline; job processors are idempotent and have a visible dead-letter path.
- [ ] WebSocket gateways have their own handshake-based auth (never inherited from HTTP guards); multi-instance deployments have sticky sessions plus the Redis adapter.
- [ ] Breaking API changes go through explicit versioning with a stated, communicated deprecation window - especially for any mobile-consumed endpoint.

### Anti-patterns to name unprompted (green-flag behavior)

- Letting a "shared" or "common" module quietly become a dumping ground every other module imports.
- RBAC without ownership checks ("any vet can edit any appointment" because only the role was checked).
- Assuming an HTTP `AuthGuard` protects a WebSocket gateway automatically.
- `eager: true` relations used for convenience instead of explicit per-query loading.
- Business logic accreting inside a "thin" BFF/proxy layer that was only ever supposed to translate, not decide.
- No idempotency story for a job or endpoint that can plausibly be retried/duplicated (payments, confirmations).
- Treating `uncaughtException` as something to "recover from" instead of log-and-exit-and-let-the-orchestrator-restart.

### Harder senior/staff-level follow-up Q&A (beyond Parts 1-4)

**Q: You're the tech lead reviewing a PR that adds `forwardRef()` to resolve a new circular dependency between two existing modules. Do you approve it?**
> "Not without a follow-up conversation. `forwardRef()` isn't wrong, but a *new* circular dependency between two modules that didn't have one before is worth understanding the root cause of first - did a boundary get violated (one module reaching into logic that should have stayed encapsulated), or is this a genuine, inherent bidirectional relationship in the domain? If it's the former, I'd ask for the coupling to be resolved via an event or a shared extracted module instead. If it's genuinely inherent and rare, I'd approve the `forwardRef()` as a pragmatic fix, but I'd want it to be the exception, not something that becomes a pattern every future coupling problem defaults to."

**Q: Design an approach for a NestJS backend to support 'soft launch' a new feature to 5% of users, tied into what you know about auth, caching, and feature flags.**
> "I'd resolve the flag server-side, keyed off something stable per user (their user ID hashed into a bucket, not random per-request, so the same user consistently gets the same experience) rather than client-side, since server-side evaluation means the backend's own behavior (which endpoints exist, what a response contains) can differ per bucket without trusting the client to self-report which group it's in. I'd keep flag evaluation cheap - an in-memory or Redis-backed lookup, not a DB round trip per request - and make sure anything cached (Next.js ISR, a Nest-side response cache) is bucketed into the cache key if the response actually differs per flag value, otherwise one bucket's response could leak into another's cache."

**Q: A staff engineer asks you to estimate the risk of combining two currently-separate NestJS services into one monolith to reduce operational overhead. What do you actually evaluate before answering?**
> "I'd look at whether they're separate because of genuinely different scaling needs (one is CPU-heavy and needs to scale independently) or because of team ownership boundaries (different teams, different release cadences) - either of those is a real reason to keep them separate regardless of operational overhead. If they're separate mostly by historical accident with no real scaling or ownership divergence, merging can genuinely reduce complexity - fewer deploys to coordinate, one shared module graph, simpler local development - but I'd want to verify their data stores and failure domains don't get entangled in a way that makes a bug in one now able to take down the other, which is the real risk of merging services that were meant to be independently resilient."

**Q: How do you approach an interview question you genuinely don't know the answer to, live?**
> "I say what I do know that's adjacent, state my reasoning process out loud, and make a best-effort educated guess while being explicit that it's a guess rather than presenting it as certain fact - that's a far stronger signal than confidently answering something wrong, and it's also just honest about what I'd actually do on the job: reason from first principles and verify against documentation/testing rather than assume. I'd rather say 'I haven't used X directly, but based on how Y works, I'd expect Z, and here's how I'd confirm that' than either bluff or freeze."

**Q: Across VetApp, Wizer, and Travel2Georgia, what's one architectural decision you'd make differently if you were starting fresh today, and why?**
> "I'd invest earlier in structured observability - correlation IDs, per-endpoint latency/error dashboards, query-count tracking - rather than adding it reactively once something was already slow or broken in production. On a legacy rewrite like VetApp, that instrumentation is especially valuable early because it gives you an objective way to compare the new system's behavior against the old one during the migration, instead of relying on manual spot-checks to build confidence that the rewrite is actually equivalent."

**Q: You're handed a NestJS codebase with no tests, no Swagger docs, and a single 2,000-line `AppModule`. You have two weeks before you're expected to ship features in it. What's your actual first move?**
> "Not a rewrite, and not writing tests for everything - two weeks isn't enough for either, and both would delay the first real feature. I'd first read enough to understand the domain boundaries that *should* exist (even though the code doesn't reflect them), then extract just the module I'm about to touch into its own proper feature module with a controller/service split, adding tests only for the code path I'm changing. That gives me a safety net for my own change without pretending I can fix the whole codebase's structure in two weeks - and it starts the incremental-extraction pattern other engineers can follow on their own future changes."

**Q: How do you distinguish, in an interview answer, between something you've done personally and something you understand conceptually but haven't shipped?**
> "I say so directly - 'I've done X in production on VetApp, but Y I understand from documentation/study and would want to validate with a spike before committing to it in a real system.' Interviewers generally trust a candidate more, not less, for drawing that line clearly, because it shows the same honesty I'd want from someone estimating a task on my team - overclaiming experience is the kind of thing that surfaces badly on the job, not just in the interview."

### Quick-reference: senior distinctions across the whole backend track

- **Module boundary vs file organization:** boundaries are about what's exported/hidden and why; folders alone don't enforce anything.
- **RBAC vs ownership:** role answers "can this kind of user do this kind of thing"; ownership answers "can this specific user act on this specific resource."
- **Guard vs interceptor:** guard is a yes/no gate before the handler; interceptor wraps the whole execution and can transform input/output on both sides.
- **Time-based vs on-demand cache invalidation:** time-based is a safety net for sources you don't control; on-demand is precise and instant for mutations you do control.
- **N+1 fixed with a join vs `eager: true`:** a join fixes the one query that needed it; `eager: true` silently taxes every query against that entity forever.
- **Sticky sessions vs the Redis adapter:** sticky sessions keep one client on one instance; the Redis adapter lets any instance's emit reach any other instance's clients - you need both, not either.
- **Retryable vs non-retryable job failures:** retryable is a transient condition (network blip, rate limit) worth backing off and retrying; non-retryable is a deterministic failure (bad data) that should fail fast to dead-letter instead of wasting retry budget.
- **Liveness vs readiness:** liveness asks "should this process be restarted"; readiness asks "should traffic be routed here right now" - conflating them causes traffic to keep hitting a pod that's mid-shutdown.
- **Additive migration vs destructive migration:** additive (new column, new table) is safely rollback-compatible with the previous code version; destructive (rename, drop) requires a multi-step, staged rollout to stay rollback-safe.
- **BFF proxy vs backend service:** a BFF translates/aggregates for one client's convenience; a backend service owns business rules multiple clients depend on.
- **Worker thread vs background job:** worker threads offload CPU-bound work the caller is still waiting on; background jobs decouple work the caller doesn't need to wait for at all.
- **API versioning vs a bug fix:** a version bump is for a deliberate, breaking contract change for the general consumer base; a genuinely broken/undocumented behavior is a bug fix, not a reason to permanently version-lock around it.
- **Raw SQL vs QueryBuilder:** QueryBuilder by default for portability and type safety; raw SQL only when the ORM's declarative layer genuinely can't express the query efficiently, isolated and commented.
- **Deny-by-default guard vs per-route protection:** deny-by-default fails safe when a new route is added without an annotation; per-route protection fails open on the same mistake.
- **Draining connections vs a hard kill on deploy:** draining lets in-flight requests/jobs finish within a grace period; a hard kill interrupts them mid-work and relies entirely on idempotency to recover cleanly.

---
