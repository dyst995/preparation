# NestJS / Node.js Backend Interview Prep - Index

Detailed study guides split by topic, built around your backend stack and CV projects:
**NestJS, Node.js, REST APIs, WebSockets, JWT, Swagger/OpenAPI, TypeORM (MySQL/PostgreSQL)**.

Primary CV evidence you will lean on:

- **VetApp** - rebuilt an existing PHP backend in NestJS while preserving compatibility with the existing MySQL database. Designed backend architecture and REST APIs using NestJS, TypeORM, JWT, and Swagger. Implemented authentication, role-based access control, appointment scheduling, veterinary records, file uploads, and payment processing. Integrated Bank of Georgia payment APIs and background jobs for asynchronous processing.
- **Wizer Insurance** - integrated Flitt payments, Firebase Cloud Messaging, and backend administration features using NestJS on top of an existing app; reduced Google Play crash rate from ~15% to 0.09%.
- **Travel2Georgia** - designed and built the complete platform end to end: customer-facing website, admin dashboard, and backend services, plus production infrastructure (Docker, Nginx, SSL, domain management).
- **Clean House** - real-time delivery updates using WebSockets and Firebase Cloud Messaging, on a Next.js web platform + React Native mobile app.
- **Freelance** - full-stack apps using NestJS, PostgreSQL, MySQL, Socket.IO, Firebase, AWS, deployed on Docker/Nginx/VPS.

Mark progress in each file with `[ ]` -> `[x]`.

---

## Chapters

| # | File | Focus |
|---|---|---|
| 01 | [NestJS Architecture](./01-nestjs-architecture.md) | Modules, providers, DI, controllers, services, lifecycle hooks, ConfigModule, project structure |
| 02 | [REST, Validation & Swagger](./02-rest-validation-swagger.md) | REST design, DTOs, pipes, class-validator, interceptors, exception filters, Swagger/OpenAPI |
| 03 | [Auth: JWT & RBAC](./03-auth-jwt-rbac.md) | Access/refresh JWT, guards, Passport strategies, RBAC (VetApp), password security |
| 04 | [WebSockets & Realtime](./04-websockets-realtime.md) | Gateways, Socket.IO vs raw WS, socket auth, scaling, FCM vs sockets (Clean House) |
| 05 | [TypeORM & Persistence](./05-typeorm-persistence.md) | Entities, relations, migrations, N+1, transactions, repository pattern, MySQL/Postgres |
| 06 | [Node.js Runtime](./06-nodejs-runtime.md) | Event loop, streams, clustering/PM2, error handling, background jobs (VetApp) |
| 07 | [Interview Question Bank](./07-interview-questions.md) | Large Q&A bank + VetApp/Wizer/Travel2Georgia STAR stories |

**Total:** ~3,500+ lines across 7 chapters.

---

## Suggested study order (per day, ~2-3h on this track)

Given your CV, prioritize in this order:

1. **01 Architecture** - foundation; everything else builds on modules/DI/providers.
2. **02 REST/Validation/Swagger** - daily-driver NestJS interview core, and what most of VetApp's API surface is built from.
3. **03 Auth (JWT/RBAC)** - VetApp's RBAC and auth is a strong differentiator; rehearse it hard.
4. **05 TypeORM/Persistence** - MySQL legacy compatibility (VetApp) is a great "senior thinking" story.
5. **04 WebSockets** - smaller surface area, but the FCM vs sockets tie-in to Clean House is a strong cross-project story.
6. **06 Node runtime** - event loop / background jobs, mid-to-senior differentiator questions.
7. **07 Interview Questions** - rehearse daily, 20-30 minutes, mix technical + STAR.

---

## Daily drill (any day)

1. Pick one chapter.
2. Read topics and check off what you can already teach without notes.
3. Answer 5-8 interview questions out loud.
4. Rehearse one STAR story from chapter 07 tied to VetApp, Wizer, or Travel2Georgia.
5. Write down the 2-3 weakest spots for tomorrow's pass.

---

## How each chapter is structured

- **Learning objectives** - what you should be able to explain/do by the end.
- **Topic sections** - concept, why it matters, code sketch, gotchas.
- **Tables** - quick-reference comparisons (execution order, strategy trade-offs, etc.).
- **Interview questions with model answers** - phrased the way interviewers actually ask them.
- **CV tie-ins** - how to connect the concept to VetApp / Wizer / Travel2Georgia / Clean House.
- **Hands-on drills** - small exercises to actually do, not just read.
- **Red flags / green flags** - what separates a junior answer from a senior one.
- **Mastery checklist** - final self-check before moving on.

---

## Progress tracker

- [ ] 01 NestJS Architecture
- [ ] 02 REST, Validation & Swagger
- [ ] 03 Auth: JWT & RBAC
- [ ] 04 WebSockets & Realtime
- [ ] 05 TypeORM & Persistence
- [ ] 06 Node.js Runtime
- [ ] 07 Interview Question Bank

---

## The one-paragraph pitch (memorize a version of this)

> "I rebuilt VetApp's PHP backend in NestJS while keeping the existing MySQL database intact, so the migration was zero-downtime for the business. I designed the REST API layer with DTOs, class-validator, and Swagger documentation, built JWT-based auth with role-based access control for admin/vet/receptionist roles, modeled appointments, veterinary records, and payments with TypeORM, integrated Bank of Georgia's payment API, and used background jobs for asynchronous processing like payment webhooks and notifications. I've also built NestJS backend administration features for Wizer, and designed and shipped the full Travel2Georgia platform - website, admin dashboard, backend, and production infrastructure - end to end."
