# 05 - Interview Questions & Stories

> Goal: One consolidated Q&A bank across all four prior chapters, plus rehearsed STAR stories anchored to Clean House and Travel2Georgia, plus rapid-fire drills you can run daily.

Mark progress with `[x]` as you master each section.

---

## Learning objectives

By the end of this section you should be able to:

1. Answer any question from the consolidated bank in under 60-90 seconds, unaided.
2. Tell at least 4 distinct STAR stories from Clean House and Travel2Georgia without notes.
3. Handle "why did you choose X" architecture questions with a tradeoff-first answer, not a definition-recital.
4. Run a full mock interview against yourself using this file alone.

---

## How to use this chapter

1. Cover the answer, read only the question, answer out loud.
2. Compare against the model answer - look for gaps in *reasoning*, not just missing keywords.
3. For story prompts, actually say the STAR structure out loud (Situation, Task, Action, Result) - don't just think it.
4. Time yourself. Most answers should land at 45-90 seconds; STAR stories at 90-150 seconds.

---

## Part A - Consolidated Q&A bank

### A1. Routing & rendering

**Q1. What's the core difference between the App Router and Pages Router?**
> App Router is Server-Components-first with nested layouts, streaming, and per-segment conventions (`loading`/`error`/`not-found`); Pages Router is one file per route with a single data-fetching function and a fully client-hydrated tree.

**Q2. When is a route statically rendered vs dynamically rendered in App Router?**
> Static by default, unless it uses a dynamic API (`cookies()`, `headers()`, `searchParams` in some contexts), does an uncached (`no-store`) fetch, or explicitly sets `dynamic = "force-dynamic"`.

**Q3. Explain ISR in one sentence.**
> Serve a cached, statically-rendered page instantly while regenerating it in the background after it goes stale (time-based via `revalidate`, or immediately via `revalidateTag`/`revalidatePath`).

**Q4. What's the rule for Server vs Client Components?**
> Server by default; `"use client"` marks a boundary that pulls that file and everything it imports into the client bundle; Client Components can use hooks/state/events/browser APIs, Server Components cannot.

**Q5. Why doesn't a layout re-render when navigating between its child routes?**
> By design - layouts persist across navigation within their segment for performance; only the changed segment re-renders/refetches.

**Q6. What's a hydration mismatch and a common cause?**
> Server-rendered HTML doesn't match the client's first render - commonly caused by non-deterministic values (`Date.now()`, `Math.random()`) or browser-only checks run during render instead of in `useEffect`.

### A2. Data fetching & caching

**Q7. Name the four Next.js caches.**
> Request Memoization, Data Cache, Full Route Cache, Router (client) Cache.

**Q8. Difference between `cache: "no-store"` and `next: { revalidate: 60 }`?**
> `no-store` never caches (always fresh, forces dynamic rendering); `revalidate: 60` caches and serves stale-while-revalidating in the background at most once every 60 seconds.

**Q9. How do you invalidate a cached fetch immediately after a mutation?**
> Tag the fetch with `next: { tags: [...] }` and call `revalidateTag(...)` (or `revalidatePath(...)`) in the Server Action/Route Handler performing the mutation.

**Q10. Why does calling `cookies()` in a Server Component force dynamic rendering?**
> Because the response can now legitimately differ per request/user, Next.js can't safely serve one cached HTML output to everyone.

**Q11. How do you avoid a data-fetching waterfall?**
> Kick off independent fetches without awaiting immediately and `Promise.all` them, or split independent data into separate Server Components that each fetch concurrently.

**Q12. How does React Query coexist with server-rendered data in App Router?**
> Server fetch provides a fast first paint and can seed React Query's cache via `initialData`; React Query then owns the client-side lifecycle - polling, refetch-on-focus, optimistic updates, pagination.

### A3. Middleware, auth & APIs

**Q13. What can't Middleware safely do?**
> Heavy/arbitrary Node APIs, direct DB queries for fine-grained checks, expensive crypto - it runs on the Edge runtime on every matched request and should stay fast and coarse-grained.

**Q14. Route Handler vs Server Action - when do you use each?**
> Route Handler for a stable HTTP endpoint callable from outside your app (webhooks, mobile clients, third parties); Server Action for RPC-style mutations called directly from your own React UI/forms.

**Q15. JWT vs session-based auth - core tradeoff?**
> JWT is stateless and easy to verify across services/clients but hard to revoke early; sessions are easy to revoke (delete server-side) but need shared server-side storage.

**Q16. Where should an access token live on the web, and why?**
> An `httpOnly`, `secure`, `sameSite` cookie - not readable by client JS, mitigating XSS-based token theft (with a CSRF tradeoff to manage via `sameSite`/tokens).

**Q17. Why pair Next.js with a separate NestJS backend instead of using Next.js API routes for everything?**
> When the same logic must be reused by multiple clients (web + mobile), when the domain logic is complex enough to benefit from NestJS's module/DI/guard structure, or when independent scaling/deployment of API vs frontend is needed. Next.js Route Handlers still make sense as a thin BFF layer for cookie handling or page-specific data shaping.

**Q18. What's "defense in depth" for protected routes?**
> Middleware does a fast, coarse redirect; the Server Component/layout re-checks the session; the backend does the final, authoritative authorization check - never rely on just one layer.

### A4. Performance & deployment

**Q19. What does `next/image` give you over a plain `<img>`?**
> Automatic resizing/format conversion, lazy loading by default, and enforced width/height (or `fill`) to prevent layout shift (CLS).

**Q20. Why is `next/font` preferred over linking Google Fonts?**
> Fonts are self-hosted at build time (no third-party network request blocking render), with automatic preloading and `font-display` handling to reduce layout shift.

**Q21. How do you diagnose a bloated JS bundle on one route?**
> Run `@next/bundle-analyzer`, look for large third-party libraries without tree-shaking, unnecessarily high `"use client"` boundaries, and widgets that should be lazy-loaded via `next/dynamic`.

**Q22. Edge vs Node.js runtime - when do you pick each?**
> Edge for lightweight, latency-sensitive logic with a restricted API surface (auth checks, redirects); Node.js when you need full library support, native DB drivers, or heavier compute.

**Q23. Walk through deploying Next.js with Docker in one breath.**
> `output: "standalone"` for a minimal server bundle, multi-stage Docker build, run `node server.js` in the final slim image, put Nginx in front for SSL termination, reverse proxying, and static asset caching, and manage certs via Let's Encrypt with auto-renewal.

**Q24. Why is `NEXT_PUBLIC_` dangerous for secrets?**
> It gets inlined into the client JS bundle at build time - publicly visible to anyone, and fixing it requires rotating the secret and rebuilding, not just removing the env var at runtime.

**Q25. Name the Core Web Vitals and one Next.js lever for each.**
> LCP - `next/image priority` + caching/fast TTFB; CLS - `next/image` dimensions + `next/font`; INP - smaller client bundles, less hydration cost, avoiding long synchronous work in handlers.

---

## Part B - Rapid-fire drill (answer in 15-20 seconds each)

Run through these fast, out loud, no notes. If you hesitate more than a few seconds, mark it and revisit the relevant chapter.

- [ ] Server Component or Client Component: a page that only displays a list fetched from a database?
- [ ] Server Component or Client Component: a search input with live filtering as you type?
- [ ] Static, ISR, or SSR: a public blog post page?
- [ ] Static, ISR, or SSR: a logged-in user's account settings page?
- [ ] Static, ISR, or SSR: a public product listing that changes prices twice a day?
- [ ] Middleware or backend check: "does this request have any session cookie at all"?
- [ ] Middleware or backend check: "can this specific user edit this specific order"?
- [ ] `revalidate: 60` or `revalidateTag`: "show updated content within a minute, no manual trigger needed"?
- [ ] `revalidate: 60` or `revalidateTag`: "show updated content the instant an admin publishes"?
- [ ] Route Handler or Server Action: a Stripe webhook endpoint?
- [ ] Route Handler or Server Action: a "save profile" form on your own dashboard?
- [ ] `next/image priority` or default lazy loading: a hero banner above the fold?
- [ ] Edge or Node.js runtime: a Route Handler using a Postgres client library with native bindings?
- [ ] `NEXT_PUBLIC_` or plain env var: a Stripe secret key?
- [ ] `NEXT_PUBLIC_` or plain env var: a public analytics site ID?

<details>
<summary>Answers (click to check)</summary>

Server; Client; Static (maybe ISR if it can be edited); SSR (or client-fetched); ISR; Middleware; Backend; `revalidate: 60`; `revalidateTag`; Route Handler; Server Action; `priority`; Node.js; plain env var; `NEXT_PUBLIC_`.

</details>

---

## Part C - Clean House STAR stories

Use these when asked "tell me about a time you..." or "walk me through a feature you built." Rehearse out loud until fluent - don't read them verbatim in an interview.

### Story 1 - Building major features on an existing Next.js platform

**Situation:** Clean House already had a Next.js platform in production when you joined the work - an existing codebase with its own conventions, not a greenfield build.

**Task:** Develop major new features - manager dashboards, warehouse management, delivery workflows, and customer-facing improvements - without breaking existing functionality or fighting the established architecture.

**Action:**
> "I spent time understanding the existing routing structure, data-fetching patterns, and component conventions before writing new code, so new features matched the codebase's existing rendering strategy and caching approach rather than introducing inconsistent patterns. For the manager dashboard and warehouse management screens, I structured them around persistent layouts so the navigation shell didn't remount as managers moved between sections, and made sure per-user, frequently-changing data (like warehouse state) was fetched in a way that stayed fresh rather than being cached as if it were static content."

**Result:**
> "The new features shipped without destabilizing the existing platform, and the dashboard felt noticeably faster to navigate because of how the shared layout and data-fetching were structured. It also taught me how to be productive extending someone else's architectural decisions instead of always working from a blank slate."

**Likely follow-ups:**
- "What was the hardest part of working in an existing codebase?" -> Answer honestly: understanding *why* prior decisions were made before changing them, and not assuming inconsistency was accidental.
- "Did you refactor anything, or purely add features?" -> Be honest about scope; if you refactored parts, describe what and why.

### Story 2 - Building the React Native mobile app from scratch and connecting it to the same backend

**Situation:** Clean House needed a mobile app; none existed yet, while the Next.js web platform and its backend were already live.

**Task:** Design and build the React Native app's architecture from scratch, and integrate it with the existing backend so both clients shared consistent business logic and data.

**Action:**
> "I defined the mobile app's architecture and made sure it consumed the same backend the Next.js web app used, rather than duplicating business logic on the client. For the delivery workflow specifically, I implemented real-time updates using WebSockets and Firebase Cloud Messaging, so warehouse and delivery status changes propagated to the mobile app live instead of requiring manual refreshes. I also built barcode scanning workflows for Zebra devices using native Android and DataWedge integration for the warehouse side of the operation."

**Result:**
> "The mobile app and the existing Next.js platform ended up sharing one source of truth for delivery and warehouse data, with real-time updates keeping both in sync, which is exactly the kind of multi-client backend reuse that shapes how I think about splitting logic between a framework's own API routes and a dedicated backend."

**Likely follow-ups:**
- "How did you keep the mobile and web clients consistent?" -> Shared backend, shared contracts/DTOs where applicable, no duplicated business rules on the client.
- "Why WebSockets instead of polling?" -> Lower latency for delivery status changes, fewer wasted requests, and it matches how time-sensitive the data is.

---

## Part D - Travel2Georgia STAR stories

### Story 3 - Owning architecture and rendering strategy end-to-end

**Situation:** Travel2Georgia needed a complete platform built from nothing - customer-facing website, admin dashboard, and backend services.

**Task:** Design the whole system: database, backend, frontend rendering strategy, and deployment - with no existing codebase or team decisions to inherit.

**Action:**
> "I made deliberate rendering choices per section of the app rather than defaulting everything to one strategy. The public-facing tour/content pages were built to be cached and fast - static or ISR-style, since that content doesn't change per visitor and can tolerate a short revalidation window. The admin dashboard, in contrast, needed fresh, per-session data and full interactivity for editing, so it used dynamic rendering with proper auth gating. I also designed the database schema and backend services to support both sides cleanly, and set up tag-based cache invalidation so that when an admin updated a tour, the public page reflected it quickly without waiting for a timer or doing a full rebuild."

**Result:**
> "The public site stayed fast and cheap to serve because most of it was cacheable, while the admin experience stayed fresh and responsive, and I could reason clearly about which parts of the system needed which rendering strategy because I'd made those calls deliberately rather than inheriting them."

**Likely follow-ups:**
- "How did you decide what should be static vs dynamic?" -> Point to the decision heuristic from chapter 01: is content shared across visitors, does it need to be indexed fast, does it depend on the logged-in user.
- "What would you do differently if you rebuilt it today?" -> Have a genuine answer ready - e.g., "I'd introduce tag-based revalidation earlier instead of relying purely on time-based ISR," or similar honest reflection.

### Story 4 - Docker, Nginx, SSL deployment ownership

**Situation:** Travel2Georgia needed production infrastructure, not just application code - and you were responsible for all of it.

**Task:** Deploy and maintain the platform reliably, including SSL, domain management, and a repeatable deployment process.

**Action:**
> "I configured the Next.js build with standalone output to keep the Docker image lean, wrote a multi-stage Dockerfile so the final runtime image only contained what was needed to actually run the app, and put Nginx in front as a reverse proxy to terminate SSL, handle the HTTP-to-HTTPS redirect, and cache static assets aggressively since Next.js ships immutable, hashed filenames for those. I set up SSL certificates and domain/DNS configuration, and made sure the container would restart automatically if it crashed or the host rebooted."

**Result:**
> "The platform ran reliably in production without needing a managed platform, and going through that process gave me a much deeper, hands-on understanding of what platforms like Vercel actually automate - which makes me faster at diagnosing production issues regardless of where an app is hosted."

**Likely follow-ups:**
- "What would break this setup at higher scale?" -> Single server as a bottleneck/single point of failure; you'd introduce load balancing across multiple app instances, and possibly separate the DB onto its own managed service.
- "How did you handle zero-downtime deploys?" -> Be honest about your actual setup; if you didn't have one, describe how you'd add it (rolling container replacement behind Nginx, health checks before switching traffic).

---

## Part E - Architecture / opinion questions (tradeoff-first answers expected)

These are the questions where interviewers are testing judgment, not recall. Never answer with just a definition - always state the tradeoff and your actual decision.

**Q: When would you NOT use the App Router for a new project?**
> "If the team has deep existing investment in Pages Router patterns and libraries that don't yet support Server Components well, or if the project is small enough that the migration/learning cost outweighs the benefits. I wouldn't avoid App Router by default in a new project today, but I wouldn't force a mid-migration on an unrelated deadline either."

**Q: When is client-side rendering (CSR) actually the right choice in Next.js, not a fallback?**
> "When the data is inherently live/continuously changing and per-user, like a real-time delivery tracker or a chat feed - there's no meaningful 'static' version of that content to server-render, so I server-render a shell/skeleton and let a client-side data layer (React Query, WebSocket subscription) own it from there."

**Q: How do you decide between time-based ISR and on-demand revalidation for a given piece of content?**
> "If updates are unpredictable and I control the mutation path (an admin dashboard I also built), on-demand `revalidateTag` gives instant consistency with no wasted regenerations. If updates come from a source I don't control the write path for (a third-party feed, or I just want a safety net), time-based `revalidate` is simpler and doesn't require wiring invalidation into every possible write path. In practice I often use both - on-demand as the primary path, time-based as a fallback."

**Q: Your Next.js app and NestJS backend are both yours to design - would you ever put business logic in a Next.js Route Handler?**
> "For something genuinely page-specific - reshaping or combining a couple of backend calls into one response tailored to a dashboard's needs - yes, that's a reasonable BFF responsibility. I wouldn't put core domain rules there, like order-state transitions or payment logic, because that needs to be consistent across every client that touches it, not just the web frontend."

**Q: How would you convince a team to migrate part of a Pages Router app to App Router?**
> "I wouldn't propose a wholesale rewrite. I'd pick one concrete, measurable pain point - e.g. a slow, JS-heavy page or an awkward shared layout - migrate just that route, measure the actual improvement (bundle size, load time), and use that as the case for incremental, route-by-route migration rather than a big-bang change."

---

## Part F - Weak-spot tracker

Use this to track what to revisit. Update honestly after each mock run.

- [ ] Four Next.js caches - can I explain all four without notes?
- [ ] `cookies()`/`headers()` forcing dynamic rendering - can I explain why, not just that it happens?
- [ ] Server vs Client Component boundary - can I explain what crosses it and what doesn't?
- [ ] JWT refresh race condition - can I explain the fix, not just the problem?
- [ ] Next.js API routes vs NestJS - is my answer decisive and under 60 seconds?
- [ ] Docker/Nginx/SSL flow - can I walk through it from memory in under 90 seconds?
- [ ] Core Web Vitals - can I name all three and tie each to a concrete Next.js feature?
- [ ] Clean House stories - fluent without reading?
- [ ] Travel2Georgia stories - fluent without reading?

---

## Mastery checklist (track track track)

- [ ] I can answer all 25 questions in Part A without hesitation.
- [ ] I can complete the rapid-fire drill in Part B in under 5 minutes total.
- [ ] I can tell all 4 STAR stories fluently, out loud, unaided.
- [ ] I can answer every Part E architecture question with a tradeoff, not a definition.
- [ ] I have run at least 2 full mock passes through this file end-to-end.
- [ ] My weak-spot tracker (Part F) is fully checked off.
