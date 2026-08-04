# 07 - Interview Question Bank: NestJS/Node + VetApp/Wizer/Travel2Georgia STAR Stories

> Goal: one consolidated rehearsal chapter - a large cross-topic Q&A bank, plus fully worked STAR stories for your three flagship backend projects, plus a mock-interview flow to run yourself through before the real thing.

Mark progress with `[x]` as you master each section.

---

## How to use this chapter

1. Do a pass reading every question and answering out loud before checking the model answer.
2. For STAR stories, don't memorize word-for-word - internalize the structure (Situation/Task/Action/Result) and the *numbers*.
3. Time yourself: most answers should land in 60-90 seconds; STAR stories in 90-120 seconds unless asked to go deeper.
4. Always be ready for one layer of follow-up on every answer - each STAR story below includes likely follow-ups.

---

## Part 1 - Cross-topic technical Q&A

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

## Part 2 - System-design-flavored questions (backend-scoped)

**Q18: Design the appointment-booking flow for VetApp end to end - what are the moving pieces?**
> Model answer structure:
> 1. `POST /appointments` - validated DTO (vetId, ownerId, scheduledAt, type), guarded by auth + RBAC (receptionist/admin can book on behalf of others; a vet might only book for themself depending on rules).
> 2. Service layer checks for scheduling conflicts (vet double-booking) - likely a DB constraint or an explicit query inside a transaction to avoid a race between two simultaneous bookings for the same slot.
> 3. Persist the appointment, return 201.
> 4. Enqueue a background job for confirmation notification (email/SMS/push) - doesn't block the response.
> 5. If payment is required upfront, authorize payment via Bank of Georgia's API (ideally outside/around the DB transaction, not nested inside it - chapter 05), persist the result, reconcile asynchronously if needed.
> 6. Swagger-documented, versioned if this is a public-facing booking API consumed by a separate client app.

**Q19: How would you prevent two receptionists from double-booking the same vet slot at the exact same time?**
> A unique constraint at the DB level on (vetId, scheduledAt) if slots are fixed-size, or a transaction that re-checks for conflicts immediately before insert with appropriate row locking (`SELECT ... FOR UPDATE` scoped to that vet/time window) so a concurrent request can't slip through the check-then-insert race. The unique constraint is the more robust guarantee since application-level checks alone are still racy without locking.

**Q20: You need to add "clinic" as a new concept to VetApp - vets and appointments now belong to a specific clinic, and clinics shouldn't see each other's data. What changes?**
> Add a `Clinic` entity, a `clinicId` FK on relevant entities (vets, appointments, owners if clinic-scoped), extend the JWT payload or user record with the caller's clinic, and add a scoping check (either a global query filter/interceptor or explicit `WHERE clinicId = :clinicId` on every relevant query) so RBAC (role) and clinic scoping (tenant isolation) are enforced as two separate, composable checks rather than conflated into one.

---

## Part 3 - STAR stories (rehearse these until fluent)

### STAR: VetApp - PHP to NestJS rewrite (flagship story)

**Situation:** VetApp had an existing production backend written in PHP, backing a live veterinary clinic management system with real appointment, patient record, and payment data in a MySQL database. The codebase had grown without a consistent structure, making it increasingly hard to add features safely.

**Task:** Rebuild the backend in NestJS - a modern, maintainable, well-typed stack - without a risky big-bang cutover, and without a data migration project, since the business needed the database to keep working the whole time.

**Action:**
- Modeled TypeORM entities to match the *existing* MySQL schema exactly, rather than redesigning it, so no data migration was needed.
- Designed the module structure around business domains: auth, vets, owners, appointments, veterinary records, payments, notifications - each with its own controller/service/DTOs.
- Built JWT-based authentication with access/refresh tokens, and role-based access control for admin, vet, and receptionist roles using a custom `@Roles()` decorator and guard.
- Documented the entire API with Swagger as it was built, so the DTO-driven validation and the docs never drifted apart.
- Integrated Bank of Georgia's payment API for processing, and used background jobs for asynchronous work - payment reconciliation and notification sending - so those slower/less-reliable steps never blocked the core request flow.
- Wrote explicit migrations for any genuinely new schema needs introduced during the rewrite, never relying on auto-sync against a live production database.

**Result:** A modern, typed, well-documented backend that preserved full compatibility with the existing data, replacing an unstructured PHP codebase with a maintainable NestJS application covering auth, RBAC, scheduling, records, and payments.

**Likely follow-ups and short answers:**
- *"How did you validate the rewrite behaved identically to the PHP system?"* -> Compared endpoint behavior/response shapes against the legacy system for the same inputs, prioritized comprehensive testing of the highest-risk flows (payments, auth) first.
- *"What was the hardest part of keeping the legacy schema compatible?"* -> Legacy schema quirks (nullable columns that conceptually shouldn't be, naming inconsistencies) had to be respected as constraints in the entity definitions rather than "fixed," since fixing them would risk breaking assumptions elsewhere or require an actual migration.
- *"Why background jobs specifically for payments?"* -> Payment authorization/reconciliation involves an external, sometimes-slow third-party API; decoupling it from the request/response cycle kept the booking flow fast and resilient to gateway latency or transient failures.

---

### STAR: Wizer - NestJS backend administration features

**Situation:** Wizer Insurance had an existing React Native application (which you also took ownership of and refactored). The business needed backend administration capabilities to support and manage the app's operation.

**Task:** Build backend administration features using NestJS, integrating with payment processing (Flitt) and push notifications (Firebase Cloud Messaging), on top of/alongside an existing production mobile app.

**Action:**
- Designed and implemented NestJS backend administration functionality to support the mobile app's operational needs.
- Integrated Flitt payment processing on the backend to support in-app payment flows.
- Integrated Firebase Cloud Messaging so the backend could trigger push notifications to users.
- Worked within the context of an app that was simultaneously being refactored into a feature-based architecture on the mobile side, requiring coordination between backend contract changes and mobile consumption of those APIs.

**Result:** Backend administration capability that supported the app's payment and notification needs, contributing to the broader effort that (alongside architecture and UX improvements) helped reduce the Google Play crash rate from approximately 15% to 0.09%.

**Likely follow-ups:**
- *"How is this different from the VetApp backend work?"* -> VetApp was a full backend rewrite/greenfield-within-a-legacy-constraint; Wizer's backend work was adding administration capability to support and extend an existing app's operations, more scoped and admin-facing rather than a full public API surface.
- *"Why Flitt specifically, and how does that compare to Bank of Georgia's API on VetApp?"* -> Different payment providers with different API shapes/webhook conventions, but the same underlying principles apply: authorize/capture flows, webhook-driven reconciliation, and treating payment state transitions carefully (idempotency, not trusting client-reported success blindly).

---

### STAR: Travel2Georgia - full platform ownership

**Situation:** Travel2Georgia needed a complete platform: a customer-facing website, an administration dashboard, and the backend services powering both - essentially greenfield, with you owning the whole thing.

**Task:** Design and build the entire platform end to end, including database design, backend services, both frontend surfaces, and the production infrastructure to run it reliably.

**Action:**
- Designed the backend services and database schema from scratch, with no legacy constraints, giving full freedom over resource modeling, naming, and structure compared to VetApp's constrained rewrite.
- Built the customer-facing website and the administration dashboard, both consuming the same backend services.
- Configured and deployed production infrastructure: Docker for containerization, Nginx as a reverse proxy, SSL for secure connections, and domain management.
- Owned the full project lifecycle - architecture, implementation, deployment, and ongoing production infrastructure maintenance - end to end, without a team dividing these responsibilities.

**Result:** A fully functioning platform live in production, with a customer website, an admin dashboard, and a backend, all built and deployed independently.

**Likely follow-ups:**
- *"Since this was greenfield, what would you do differently if you rebuilt it today?"* -> Good place to mention something concrete: e.g. earlier investment in Swagger docs, or introducing background job infrastructure sooner for anything email/notification-related, based on lessons carried from VetApp.
- *"How did you decide on Docker/Nginx/SSL as your infra choices?"* -> Standard, well-understood, portable stack for a single/small-team-owned deployment - containerization for consistency between environments, Nginx as a reverse proxy/TLS terminator in front of the Node process, SSL for basic security hygiene and browser trust.
- *"What database did you choose and why?"* -> Frame this around your general MySQL/PostgreSQL comfort (chapter 05) - pick whichever you actually used and justify it with the JSON/full-text-search/tooling reasoning from that chapter if it was Postgres, or team/hosting familiarity if MySQL.

---

### STAR: Clean House - realtime delivery updates (cross-reference to chapter 04)

**Situation:** Clean House needed real-time delivery tracking so customers and drivers could see live status/location updates, across both the existing Next.js web platform and a React Native mobile app you built from scratch.

**Task:** Implement real-time delivery updates that work whether the app is actively open or backgrounded/closed.

**Action:**
- Implemented WebSocket-based live updates for the in-app experience - order status changes and location updates delivered instantly to anyone actively viewing that delivery.
- Implemented Firebase Cloud Messaging for updates that need to reach the user regardless of app state - assigned, arrived, completed - since sockets don't survive the app being backgrounded or killed on mobile.
- Also built the barcode scanning workflow for Zebra devices using native Android and DataWedge integration, which fed into the same delivery status pipeline.

**Result:** A delivery tracking experience that felt instant while the app was open, and reliably notified users even when it wasn't - the two technologies covering each other's gaps rather than one alone trying to do both jobs.

**Likely follow-ups:**
- *"Why not just poll the server every few seconds instead of WebSockets?"* -> Polling adds latency (average half the poll interval, worst case a full interval), wastes requests/battery when nothing has changed, and doesn't scale well with more concurrent viewers - sockets push only when there's an actual update.
- *"How did you decide which events go over sockets vs FCM?"* -> Frequency and audience: high-frequency, low-stakes-if-missed updates (location ticks) for actively-open sockets; discrete, important state transitions that must reach the user regardless of app state, via FCM.

---

## Part 4 - Rapid-fire drill (answer all, no notes, then check yourself against the chapters)

1. What's the difference between a guard and a pipe?
2. What are the four custom provider types in Nest?
3. Why is `synchronize: true` dangerous?
4. Access token vs refresh token - why both?
5. What's RBAC missing that ownership checks provide?
6. Socket.IO vs raw `ws` - one key difference.
7. WebSockets vs FCM - what's the deciding factor?
8. What is the N+1 problem?
9. Why avoid external API calls inside a DB transaction?
10. What does `enableShutdownHooks()` actually enable?
11. Why hash refresh tokens like passwords?
12. What's the event loop phase order?
13. Why use streams for file uploads?
14. How do you scale WebSockets across multiple instances?
15. Why must background job processors be idempotent?
16. 401 vs 403 - give a VetApp example of each.
17. `whitelist` vs `forbidNonWhitelisted` on `ValidationPipe`?
18. MySQL vs Postgres - name two real differences.
19. Why background jobs for VetApp's payment/notification flow specifically?
20. What breaks with in-memory rate limiting under clustering?

---

## Part 5 - Mock interview flow (run this the day before)

1. **5 min:** Deliver the one-paragraph pitch from `INDEX.md` cold, out loud, timed.
2. **15 min:** Pick 8 random questions from Part 1/2 above (have someone else pick, or shuffle a list) - answer out loud, no notes.
3. **15 min:** Deliver all four STAR stories back to back, timed at 90-120 seconds each, including at least one follow-up per story.
4. **10 min:** Whiteboard (or just talk through) the VetApp appointment-booking system design question (Q18) from scratch.
5. **5 min:** Write down every question you hesitated on - that's tomorrow's first pass.

---

## Cross-chapter mastery tracker

- [ ] I can deliver the one-paragraph pitch in under 30 seconds without notes.
- [ ] I can answer all 20 rapid-fire questions correctly without notes.
- [ ] I can deliver all 4 STAR stories fluently within time, including follow-ups.
- [ ] I can whiteboard the VetApp appointment-booking system design end to end.
- [ ] I can whiteboard the multi-tenant "clinic" extension question (Q20) end to end.
- [ ] I've done a full mock interview run-through (Part 5) at least twice.
