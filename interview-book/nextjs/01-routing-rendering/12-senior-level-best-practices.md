# 12. Senior-Level Best Practices

> Source: `interview-prep/nextjs/01-routing-rendering.md`

### Decision framework: choosing a rendering strategy at the route level, for real

Don't start from "which Next.js feature should I use." Start from four questions, in this order, and let the answers fall out into SSG/ISR/SSR/CSR:

1. **Is the output the same for every visitor?** If no (per-user, per-role, per-tenant), you cannot statically render or cache it publicly - full stop. That alone rules out SSG/ISR and pushes you to SSR or CSR-after-shell.
2. **How stale can it be and still be correct?** "Never stale" (account balance, live inventory count at checkout) forces `no-store`/dynamic. "A minute or two is fine" is ISR territory. "Hours/days is fine" is SSG with a long revalidate window or on-demand invalidation.
3. **Does it need to be crawlable/indexed fast?** If SEO matters and the page is dynamic-only, you still want the *shell* to render server-side (SSR, not CSR-only) so crawlers see content without executing JS.
4. **Is the data push-driven or pull-driven?** Push-driven (WebSocket/SSE feed, delivery GPS ticks) has no "static" version at all - server-render a skeleton, let a client subscription own it from there.

Route this decision at the **layout/segment** level, not the whole app - a dashboard `layout.tsx` can be dynamic while a marketing `(marketing)/` route group next to it stays fully static. Mixing strategies within one app is normal and expected in a mature Next.js codebase; treating the whole app as "all SSR" or "all static" is itself a smell.

### Server/Client boundary - production discipline, not just the rule

Knowing the rule ("Server by default, `'use client'` marks a boundary") is table stakes. What separates a senior answer is how you *enforce* it at scale:

- **Push the boundary down, not up.** Every `'use client'` at a page or layout level is a decision to ship that entire subtree's JS to every visitor of every route under it, forever, even after the page grows features that didn't need client interactivity. Audit `'use client'` placement in code review the same way you'd audit a new DB migration.
- **Treat context providers as the main leak vector.** A `ThemeProvider`/`AuthProvider`/`QueryClientProvider` wrapping the whole app in the root layout is a common, easy-to-miss reason an entire app is more "client" than it needs to be. Keep provider wrappers as thin, isolated Client Components and compose them narrowly (e.g., only around the dashboard segment that actually needs `QueryClientProvider`, not the marketing pages).
- **Watch for "client leakage through props."** Passing a Server Component's fetched data through several layers of Client Components as props is fine; passing a *function* (event handler, callback) from a Server Component into a Client Component is not serializable and will error at build/runtime - a frequent junior mistake that reveals a misunderstanding of what actually crosses the boundary.
- **Bundle-audit boundaries, don't just trust intuition.** Run `@next/bundle-analyzer` after any refactor that touches shared layout/provider code; a boundary regression (something that used to be server-only becoming client-bundled) is invisible in a diff but very visible in a treemap.

### Next.js + NestJS coexistence - where routing/rendering decisions bite

Given a NestJS backend is almost always in the picture on real projects (Clean House, Travel2Georgia, VetApp-adjacent patterns), rendering-strategy choices interact with the backend split:

- A **Server Component fetching directly from a NestJS backend** (server-to-server, not through the browser) is the common, fast path for SSR/SSG/ISR pages - no CORS concerns, backend URL/secrets never reach the client, and Next.js's own Data Cache can wrap the response.
- A **Client Component talking to NestJS directly from the browser** needs CORS configured on the Nest side, and the backend's auth model (JWT in a header, or a cookie) has to work across origins if the two aren't same-domain - this is where a thin Next.js Route Handler as a same-origin proxy earns its keep (sets/reads the httpOnly cookie, forwards to Nest with the bearer token attached server-side).
- **Don't duplicate caching logic between the two layers uncoordinated.** If NestJS already caches a response (Redis, HTTP cache headers) and Next.js also caches the same `fetch` with its own `revalidate`, you now have two independent staleness windows to reason about. Pick one system as the source of truth for a given piece of data's freshness and have the other respect it (e.g., Next.js's `revalidate` window should be >= the backend's own cache TTL, not fighting it).

### Deploy/rollback considerations tied to routing changes

- **Route/layout structural changes are effectively schema changes for URLs.** Renaming a folder segment changes the URL; if that route was indexed or bookmarked, you need a redirect (`next.config.js` `redirects()`, or Middleware) shipped in the *same* deploy as the rename, not a follow-up.
- **A bad rendering-strategy change can silently spike server load.** Flipping a previously-static page to `force-dynamic` (e.g., by adding a `cookies()` call somewhere in its tree) moves it from "served from cache/CDN" to "rendered on every request" - watch server response time and instance CPU immediately after any deploy that touches shared layout code, since the regression can be in a component nobody thought was on that page's critical path.
- **Rollback plan for rendering regressions:** because static/ISR output is content-addressable per build, a bad ISR/ISR-invalidation deploy is usually safe to roll back by redeploying the previous build - the Full Route Cache regenerates from the reverted code. A bad ISR *on-demand revalidation* bug (over-invalidating, causing thundering-herd regeneration) is harder to roll back cleanly and is worth a feature flag around new `revalidateTag`/`revalidatePath` call sites until proven safe in production.

### Anti-patterns and failure modes

| Anti-pattern | Why it hurts | Fix |
|---|---|---|
| `'use client'` at the top of a whole page "to be safe" | Ships unnecessary JS for every visitor, defeats RSC's main benefit | Isolate the interactive piece; keep the page itself server-rendered |
| Wrapping the entire app in every context provider at the root layout | Forces client bundle on routes that never use that context | Scope providers to the segment that needs them |
| Treating every dashboard-style page as SSR "to be safe about freshness" | Pays full per-request render cost even for content that's fine cached for seconds | Use short `revalidate` windows or tag-based invalidation instead of blanket dynamic rendering |
| Adding `cookies()`/`headers()` deep in a shared utility used by many pages | Silently makes every page that imports it dynamic, without an obvious reason in that page's own code | Keep dynamic-API usage isolated and visible near the top of the specific route that needs it |
| No redirect plan when renaming/moving routes | Breaks indexed URLs, bookmarks, and inbound links (including from the NestJS-issued email/notification links) | Ship `redirects()`/Middleware redirects in the same PR as the route move |

### Observability for routing/rendering

- Check `next build` output after every deploy - it prints static, SSG-with-revalidate, and dynamic per route; a route that flipped category unexpectedly is your earliest, cheapest signal of a caching/rendering regression.
- Track Core Web Vitals (LCP, CLS, INP) via real-user monitoring (RUM), not just Lighthouse locally - synthetic scores don't reflect actual users' devices/networks, especially relevant for a broad customer base like Travel2Georgia's.
- Log hydration mismatches in production (they throw a specific, greppable error) rather than only noticing them via user reports - a recurring hydration warning on one route is a leading indicator of a data-shape bug, not just cosmetic noise.
- Server response time percentiles (p50/p95/p99) per route, segmented by static vs dynamic, tell you quickly whether a "should be fast" page regressed into paying dynamic-render cost.

### Team/scalability practices

- For a codebase with multiple engineers, agree on a rule for where new `'use client'` boundaries are allowed to be introduced (e.g., only in leaf components under a `*-client.tsx` naming convention) so code review has a fast visual check.
- Route ownership: as an app grows past a handful of route groups, assign rough ownership per route group (e.g., `(dashboard)` vs `(marketing)`) so rendering-strategy decisions for a segment have one accountable owner instead of drifting inconsistently PR by PR.
- Document the rendering-strategy decision per route group in a short README or ADR (why is `(marketing)` SSG/ISR, why is `(dashboard)` SSR) - this is exactly the kind of decision that gets silently violated six months later by someone adding a `cookies()` call without realizing the consequence.

### Harder senior follow-up Q&A

**Q: You inherit a Next.js app where every single page is `force-dynamic`. The team says "we didn't trust the cache." How do you fix this without breaking anything?**
> "I wouldn't flip everything back to static in one PR - that's how you reintroduce a bug that made someone add `force-dynamic` in the first place. Instead, I'd go route by route, starting with the highest-traffic, least-personalized pages (marketing, listing pages), verify what data they actually depend on, remove `force-dynamic`, and let Next.js's own static/dynamic detection do its job - then watch server response time and correctness in staging before touching the next route. I'd also ask what specifically broke trust in the cache; if it was a real stale-data incident from a missing `revalidateTag` call, the fix is fixing that invalidation path, not disabling caching everywhere."

**Q: A Server Component and a Client Component both need the "current user." How do you avoid fetching it twice, once on the server and once on the client?**
> "Fetch it once on the server - in a layout or page - and pass it down as a prop to the Client Component that needs it, rather than having the Client Component independently call an API on mount. If the client-side piece also needs to *react* to changes (e.g., after a profile edit), I'd seed a client-side cache (React Query) with that server-fetched value as `initialData` so it doesn't do a redundant fetch on mount, but can still refetch/invalidate later."

**Q: How would you migrate a route from the Pages Router to the App Router without a flag day, on a project where both currently coexist?**
> "Next.js supports both routers side by side by design, so I'd migrate one route at a time, verify parity (same URL, same behavior, same auth checks) in a preview deployment, and only remove the old `pages/` file once the new `app/` route has been live and monitored for a deploy cycle. I would not do a bulk migration in one PR - each route can carry its own subtle behavior (a `getServerSideProps` side effect, a specific caching header) that's easy to lose in translation."

**Q: Your team wants to add a third-party analytics/chat widget script to every page. Where does it go, and what's the risk if you get it wrong?**
> "It goes in the root layout, but as an isolated Client Component loaded via `next/script` with an appropriate loading strategy (`strategy=\"afterInteractive\"` or `\"lazyOnload\"` depending on priority), not inline in a Server Component. The risk of getting it wrong is twofold: putting it too early/synchronously blocks or delays meaningful rendering (hurts LCP/INP), and putting `'use client'` on something that wraps more than the widget itself needlessly pulls unrelated code into the client bundle."

**Q: How do you decide whether a slow widget on an otherwise-fast page should get its own `<Suspense>` boundary or just be optimized to be faster?**
> "Suspense buys you perceived performance, not actual speed - it doesn't make the slow query faster, it just stops it from blocking everything else. I'd add a boundary immediately as a cheap, safe win regardless, then separately investigate whether the underlying query/API call can actually be sped up (index, cache, smaller payload). If it's a third-party API I don't control, Suspense plus a sensible timeout/fallback is often the ceiling of what I can do; if it's my own NestJS endpoint, I'd push on fixing the root cause too, since Suspense is a mitigation, not a fix."

---
