# 02. Part 1 - Cross-topic technical Q&A

> Source: `interview-prep/nestjs/07-interview-questions.md`

### Architecture & fundamentals

**Q1: What problem does NestJS solve that plain Express doesn't?**
> Structure at scale: enforced module boundaries, first-class dependency injection, and declarative cross-cutting concerns (guards/pipes/interceptors/filters) instead of hand-rolled middleware chains per route.

**Q2: Explain dependency injection in one sentence a non-engineer would understand.**
> Instead of a class creating its own dependencies, something else hands them to it - which means you can swap what's handed in (a real database vs a fake one in tests) without changing the class itself.

**Q3: What's the difference between a module being imported vs a provider being exported?**
> A module's `exports` array decides which of its own providers other modules can use; `imports` is how a module pulls in another module's exported providers. A provider not listed in `exports` is private to its module even if another module imports it.

**Q4: When would two services end up in a circular dependency, and how do you actually fix it (not just paper over it)?**
> When two domains each need something from the other - e.g. `AppointmentsService` wants to trigger `NotificationsService`, and `NotificationsService` wants appointment details back. `forwardRef()` works but the more durable fix is usually extracting the shared concern (e.g. an `AppointmentEvents` module both can depend on, or emitting a domain event instead of a direct call) so neither service needs to know about the other directly.

### REST, validation, Swagger

**Q5: Your API needs to accept a bulk create of 50 appointments in one request - how does that change your DTO/validation design?**
> Wrap it in a DTO with an array property validated with `@ValidateNested({ each: true })` and `@Type(() => CreateAppointmentDto)`, plus `@ArrayMinSize`/`@ArrayMaxSize` to bound the batch size. I'd also think about partial failure semantics - does one invalid item fail the whole batch, or do valid ones still get created with a per-item result array back to the client?

**Q6: How do you avoid duplicating validation logic between "create" and "update" DTOs?**
> `PartialType(CreateDto)` for update DTOs that just make everything optional, or `PickType`/`OmitType`/`IntersectionType` when the relationship between create/update isn't a clean subset - e.g. update DTO omits an immutable field entirely rather than just making it optional.

**Q7: A client complains your API silently ignores a field they're sending - what's likely configured, and is that necessarily wrong?**
> `whitelist: true` on the global `ValidationPipe` strips undeclared fields silently rather than rejecting the request. It's not necessarily wrong - it's a deliberate tolerance choice for public APIs - but if this is an internal/admin client, I'd consider `forbidNonWhitelisted: true` so a mismatch is caught as a loud 400 instead of a silent no-op that looks like a bug.

**Q8: How would you design consistent error responses across a whole API?**
> A global exception filter producing one shape (`statusCode`, `message`, `path`, `timestamp`, maybe an internal `errorCode` for programmatic handling by clients) for every thrown exception, with specific filters/mappings for known infrastructure errors (like DB constraint violations) rather than letting them leak through as generic 500s.

### Auth, JWT, RBAC

**Q9: A user reports they're still logged in on an old device after you "revoked" their account - what went wrong?**
> Most likely the access token is still valid (stateless, verified by signature/expiry alone) and only expires naturally - revocation only killed their *refresh* token, so they can't get a *new* access token, but their current one works until it expires. Fix: keep access token lifetimes short enough that this window is acceptable, or, for truly urgent revocation (compromised account), maintain a short-lived denylist/check that critical endpoints consult.

**Q10: How do you test RBAC logic without spinning up real HTTP requests for every role/permission combination?**
> Unit test the `RolesGuard` directly by constructing a fake `ExecutionContext` (or using Nest's testing utilities) with different `user.role` values and asserting `canActivate()` returns the right boolean - much faster and more exhaustive than integration-testing every role against every route through real HTTP.

**Q11: Why is `403 Forbidden` sometimes the wrong status code for "you can't do that," and what would you use instead?**
> If the resource genuinely shouldn't be visible to exist for this user at all (not just "you can't act on it"), some APIs deliberately return `404 Not Found` instead of `403` to avoid confirming the resource's existence to an unauthorized caller - a common pattern for multi-tenant data isolation. Context-dependent: for VetApp's role model this distinction mattered less since roles are broad (admin/vet/receptionist) rather than per-tenant isolation.

### WebSockets

**Q12: A customer says their live delivery tracking screen "freezes" after a few minutes even though the driver is still moving - what do you check first?**
> Whether the socket actually disconnected (network blip, backgrounding, or a token expiring mid-connection without a refresh path) and whether the client silently failed to reconnect/rejoin the order's room. I'd check server-side connection/disconnection logs for that client around the freeze time, and confirm the client rejoins its room automatically on reconnect rather than assuming state persisted.

**Q13: How would you add a "typing indicator" feature to a chat feature without hammering the server?**
> Debounce the "user is typing" emit client-side (e.g. only emit if it's been >2s since the last emit, and emit a "stopped typing" after a pause), and treat these events as fire-and-forget/ephemeral - not persisted, not requiring ack, since losing one is harmless.

### TypeORM

**Q14: A dashboard query counting "appointments per vet this month" is slow - what do you check first?**
> Whether it's doing the aggregation in the database (a single `GROUP BY` query) or fetching all rows and counting in application code (which also risks N+1 if it then loops per vet), and whether there's an index supporting the date range + vet filter combination being queried.

**Q15: Your migration adds a `NOT NULL` column to a table with 2 million existing rows - what's the risk and how do you handle it?**
> Adding a `NOT NULL` column without a default can fail outright or lock the table for a long time on some engines/versions. Safer pattern: add the column as nullable first, backfill existing rows in batches (a data migration, ideally off-peak), then add the `NOT NULL` constraint in a follow-up migration once backfill is confirmed complete.

### Node runtime

**Q16: Your health check endpoint starts timing out intermittently under load - what's your first hypothesis?**
> Event loop contention - something else running on the same process is hogging the JS thread long enough that even a trivial health check handler can't get scheduled in time. I'd check for recently added synchronous/CPU-heavy code paths and event loop lag metrics before assuming it's a networking or infra issue.

**Q17: How do you make an idempotent HTTP endpoint for "retry this payment," where retrying shouldn't double-charge?**
> Accept an idempotency key from the client (or generate one server-side tied to the specific attempt), store it with the payment record, and if a request arrives with a key that's already been processed, return the original result instead of re-executing the charge - this is the same pattern most payment gateways expose natively for exactly this reason.

---
