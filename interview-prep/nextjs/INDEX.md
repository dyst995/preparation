# Next.js Interview Prep - Index

Detailed study guides split by topic, built around your stack and CV: Next.js, React, NestJS, TypeScript, PostgreSQL/MySQL, Docker, Nginx, AWS. Anchored on two real projects you shipped Next.js on:

- **Clean House Web & Mobile System** - you developed major features on an *existing* Next.js platform (manager dashboards, warehouse management, delivery workflows, customer-facing improvements), plus built the React Native app from scratch and wired it to the same backend (WebSockets + Firebase Cloud Messaging for real-time delivery updates).
- **Travel2Georgia** - you designed and built the *entire* platform yourself: customer-facing website, admin dashboard, and backend services, including database design, Docker/Nginx/SSL deployment, and domain management.

That combination is a strong interview story: "I've maintained someone else's Next.js codebase under real constraints, and I've also built one from zero, including the infra it runs on."

**Total:** 5 chapters, deep enough to survive senior / full-stack follow-up questions.

Mark progress in each file with `[ ]` -> `[x]`.

---

## Chapters

| # | File | Focus |
|---|---|---|
| 01 | [Routing & Rendering](./01-routing-rendering.md) | App Router vs Pages Router, file-based routing, layouts, Server vs Client Components, SSR/SSG/ISR/CSR, streaming & Suspense |
| 02 | [Data Fetching & Caching](./02-data-fetching-caching.md) | `fetch` caching in App Router, `revalidate`, cookies/headers, React Query on the client, waterfalls, parallel fetching |
| 03 | [Middleware, Auth & APIs](./03-middleware-auth-apis.md) | Middleware, Route Handlers, JWT/session auth patterns, protected routes, Next.js API routes vs a separate NestJS backend |
| 04 | [Performance & Deployment](./04-performance-deployment.md) | `next/image`, `next/font`, bundle analysis, Edge vs Node runtime, Docker/Nginx deployment (Travel2Georgia), env config |
| 05 | [Interview Questions](./05-interview-questions.md) | Full Q&A bank, Clean House / Travel2Georgia STAR story prompts, rapid-fire drills |

---

## Why this track is shaped this way

Your CV lists **Next.js** as a frontend skill alongside React, and both projects that use it are on your CV as headline projects. Interviewers will assume:

1. You can explain **why** App Router exists and what problem RSCs solve (not just "I used Next.js").
2. You understand the **rendering strategy tradeoffs** (SSR/SSG/ISR/CSR) well enough to justify a choice per page/route.
3. You can talk concretely about **caching** - this is where most mid-level Next.js developers fall apart in interviews.
4. Since you pair Next.js with **NestJS** constantly, you need a crisp answer for "why not just use Next.js API routes for everything?" - this is an extremely common senior full-stack question.
5. You can connect Next.js to **real infrastructure** (Docker, Nginx, SSL, env vars, domains) because you actually deployed Travel2Georgia yourself - most candidates have only used Vercel and go blank here.

---

## Suggested study order (matches your CV strengths)

1. **01 Routing & Rendering** - foundation; App Router mental model must be rock solid.
2. **02 Data Fetching & Caching** - the single most-tested "do they actually get it" topic in Next.js interviews.
3. **03 Middleware, Auth & APIs** - your NestJS pairing is a differentiator; prep the "Next.js API routes vs NestJS" question deeply.
4. **04 Performance & Deployment** - your Travel2Georgia Docker/Nginx deployment story lives here; also covers images/fonts which come up in every frontend interview.
5. **05 Interview Questions** - rehearse Clean House and Travel2Georgia stories out loud daily.

---

## Daily drill (any day)

1. Pick one chapter.
2. Read topics, check off what you can already teach without notes.
3. Answer 5 interview questions out loud, unaided.
4. Rehearse one Clean House or Travel2Georgia story from chapter 05.
5. Write down weak spots and revisit them the next day.

---

## How to talk about your two Next.js projects (quick reference)

| Angle | Clean House | Travel2Georgia |
|---|---|---|
| Codebase state | Existing platform, you extended it | Greenfield, you built it end-to-end |
| Your scope | Manager dashboards, warehouse management, delivery workflows, customer-facing features | Customer site + admin dashboard + backend, from architecture to deployment |
| Real-time | WebSockets + Firebase Cloud Messaging for delivery updates (mobile side) | N/A (typical CRUD/content platform) |
| Infra | Likely inherited/shared infra | Docker, Nginx, SSL, domain management - owned end-to-end |
| Best story for | Working in an existing codebase, legacy constraints, cross-team collaboration, dashboards with complex state | Architecture decisions, rendering strategy choices, deployment/DevOps, database design |

---

## Progress tracker

- [ ] 01 Routing & Rendering
- [ ] 02 Data Fetching & Caching
- [ ] 03 Middleware, Auth & APIs
- [ ] 04 Performance & Deployment
- [ ] 05 Interview Questions
