# 03. Part A - Consolidated Q&A bank

> Source: `interview-prep/nextjs/05-interview-questions.md`

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
