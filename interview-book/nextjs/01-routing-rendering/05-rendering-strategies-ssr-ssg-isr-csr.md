# 05. Rendering strategies: SSR, SSG, ISR, CSR

> Source: `interview-prep/nextjs/01-routing-rendering.md`

### Topics to learn

- [ ] SSR (Server-Side Rendering) - render on every request
- [ ] SSG (Static Site Generation) - render once at build time, serve the same HTML to everyone
- [ ] ISR (Incremental Static Regeneration) - static, but revalidated on a schedule or on-demand without a full rebuild
- [ ] CSR (Client-Side Rendering) - render on the client, typically after an initial fast shell, common for highly interactive/authenticated dashboards
- [ ] In the App Router, these aren't separate APIs like Pages Router - they emerge from **how you fetch data** and **route segment config** (`dynamic`, `revalidate`, `fetchCache`)
- [ ] Static vs dynamic rendering decision: Next.js statically renders a route at build time by default unless it detects something that requires per-request data (uncached `fetch`, reading cookies/headers, `dynamic = "force-dynamic"`, etc.)

### Mapping App Router config to classic rendering strategies

| Classic term | App Router equivalent |
|---|---|
| SSG | Static rendering (default) - no dynamic APIs used, `fetch` cached indefinitely (`cache: "force-cache"` / default) |
| SSR | `export const dynamic = "force-dynamic"`, or usage of `cookies()`/`headers()`/uncached `fetch`, forces per-request rendering |
| ISR | Static rendering + `export const revalidate = <seconds>` (time-based) or `revalidateTag` / `revalidatePath` (on-demand) |
| CSR | Server renders a minimal/loading shell (or nothing meaningful), a Client Component fetches and renders data in the browser (e.g. via React Query, `useEffect`, or client `fetch`) |

### Decision guide - which one for which page

| Page type | Recommended strategy | Why |
|---|---|---|
| Marketing/landing page | SSG | Content rarely changes; fastest possible TTFB via CDN cache |
| Blog / docs | SSG or ISR | Content changes occasionally; ISR avoids full rebuilds per content update |
| Product listing (e-commerce, Travel2Georgia tour listings) | ISR | Prices/availability change periodically; revalidate every N seconds or on webhook from CMS/admin |
| User dashboard (Clean House manager dashboard) | SSR or CSR-after-shell | Data is per-user, sensitive, and must be fresh; often behind auth, so caching publicly makes no sense |
| Real-time delivery status | CSR + WebSocket/polling | Data changes continuously; server rendering the initial state, then client takes over for live updates |
| Admin settings form | SSR for initial data + client interactivity for the form | Needs fresh data per load but full interactivity for editing |

### ISR mechanics worth knowing cold

- **Time-based**: `export const revalidate = 60` on a page/layout, or `{ next: { revalidate: 60 } }` on a `fetch` call - after 60s, the next request triggers a background regeneration; the *stale* page is served instantly while the new one builds (stale-while-revalidate model), then swaps in.
- **On-demand**: `revalidateTag("orders")` or `revalidatePath("/dashboard/orders")` called from a Server Action or Route Handler (e.g. after a mutation, or from a webhook) - immediately invalidates the cache instead of waiting for the timer.
- ISR gives you "mostly static, mostly fast" without stale-forever content, and without paying full SSR cost on every request.

### Interview answer sketch

> "In the App Router, SSR/SSG/ISR aren't separate modes you pick from a dropdown - they fall out of how a route fetches data and what its segment config says. If nothing in the route reads request-specific data and fetches are cached, Next.js renders it statically at build time - that's effectively SSG. Add `revalidate: 60` and it becomes ISR - Next.js serves the cached version and regenerates in the background after it goes stale. If the route reads cookies, headers, or does an uncached fetch, or you explicitly set `dynamic = 'force-dynamic'`, it renders per-request - that's SSR. And CSR is what happens inside any Client Component that fetches after mount, which I still reach for on things like a live delivery-tracking widget where the data has to be pushed continuously anyway."

**Follow-up:** "How would you decide for a new page you've never seen?"
> "I ask: is this content the same for every visitor? Can it be cached publicly and for how long? Does it need to be indexed by search engines fast? Does it depend on the logged-in user or request headers? For Travel2Georgia's public tour pages, that's SSG/ISR since content is shared and mostly stable. For an authenticated admin dashboard, that's SSR or client-fetched, since it's per-user and shouldn't be cached publicly."

---
