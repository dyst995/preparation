# 04. Part 3 - STAR stories (rehearse these until fluent)

> Source: `interview-prep/nestjs/07-interview-questions.md`

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
