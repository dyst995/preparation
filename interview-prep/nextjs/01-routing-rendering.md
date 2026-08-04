# 01 - Routing & Rendering

> Goal: Explain how Next.js turns files into routes, what actually renders where (server vs client), and confidently justify SSR/SSG/ISR/CSR choices per page - at a depth that survives senior follow-ups.

Mark progress with `[x]` as you master each topic.

---

## Learning objectives

By the end of this section you should be able to:

1. Contrast the App Router (`app/`) with the Pages Router (`pages/`) and explain why Next.js moved to App Router.
2. Explain file-based routing conventions: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, route groups, dynamic segments, catch-all segments, parallel and intercepting routes.
3. Explain what a Server Component is, what a Client Component is, and where the boundary between them actually lives.
4. Draw the render lifecycle for SSR, SSG, ISR, and CSR and say when each is the right default.
5. Explain streaming SSR and `<Suspense>` in the App Router, and why they matter for perceived performance.
6. Justify layouts and nested layouts vs re-fetching shared UI on every page.
7. Explain hydration, and what "hydration mismatch" errors actually mean.
8. Map Clean House (existing App/Pages Router platform) and Travel2Georgia (greenfield) onto concrete rendering decisions you made or would defend.

---

## 1. App Router vs Pages Router

### Topics to learn

- [ ] `pages/` conventions: `pages/index.tsx`, `pages/[id].tsx`, `_app.tsx`, `_document.tsx`, `getServerSideProps`, `getStaticProps`, `getStaticPaths`
- [ ] `app/` conventions: `app/page.tsx`, `app/layout.tsx`, colocated `loading.tsx` / `error.tsx` / `not-found.tsx`
- [ ] Why React Server Components (RSC) needed a new router (data-fetching model, streaming, layouts)
- [ ] Can both routers coexist in one project? (yes - incremental migration is supported)
- [ ] What Pages Router cannot do that App Router can (nested layouts without full remount, granular streaming, Server Components, colocated loading/error UI)
- [ ] Why some teams stay on Pages Router (maturity, simpler mental model, third-party library compatibility, migration cost)

### Core idea

Pages Router treats **every file in `pages/` as a route** rendered by one function you write (`getServerSideProps`, `getStaticProps`, or nothing = static by default). Data fetching and page component are tightly coupled per page, and everything below `_app.tsx` re-renders as one client tree after hydration.

App Router treats **routing as a folder tree** where each folder segment can contribute a `layout.tsx` (persists across navigations within it), a `page.tsx` (the leaf UI), and optional `loading.tsx` / `error.tsx` / `not-found.tsx` boundaries. Crucially, **components are Server Components by default** - they render on the server (or at build time) and never ship their JS to the client unless you opt in with `"use client"`.

### Why the change happened (be ready to explain "why")

| Problem with Pages Router | How App Router addresses it |
|---|---|
| Whole page is one client-side React tree after hydration - even static parts ship JS | Server Components render to HTML/RSC payload, zero JS shipped for non-interactive parts |
| Shared layout (nav, sidebar) re-renders/remounts on every route change unless manually hoisted into `_app.tsx` (losing per-route data) | Nested `layout.tsx` persists across child route navigation, doesn't refetch/remount |
| One data-fetching function per page (`getServerSideProps`), hard to fetch at multiple levels in parallel | Any Server Component (page, layout, or nested component) can `fetch`/query independently; Next.js dedupes and parallelizes |
| No built-in streaming; the whole page waits for the slowest data before responding | Streaming + `<Suspense>` boundaries let fast parts render immediately, slow parts stream in |
| Loading/error states are manual (state in the component) | `loading.tsx` / `error.tsx` are framework-level conventions per route segment |

### Interview answer sketch

> "Pages Router gives you one file, one route, one data-fetching function, and a fully client-hydrated tree. App Router restructures routing around nested folders where each segment can own a layout, loading state, and error boundary, and where components are Server Components by default - meaning they render on the server and don't ship JS unless marked `'use client'`. That unlocks per-segment streaming, parallel data fetching at multiple levels of the tree, and layouts that don't remount on navigation. I've worked on an existing Next.js platform (Clean House) and built one from scratch (Travel2Georgia), so I've seen both the migration-constrained reality and the greenfield App Router setup."

**Follow-up to expect:** "Would you migrate an existing Pages Router app to App Router?"
> "Only incrementally and only if there's a concrete win - e.g., a slow, JS-heavy page that would benefit from Server Components, or a layout that's awkward to manage in `_app.tsx`. Next.js supports both routers side by side, so I'd migrate route-by-route starting with the highest-traffic or worst-performing pages, not do a big-bang rewrite."

---

## 2. File-based routing conventions (App Router)

### Topics to learn

- [ ] `page.tsx` = publicly reachable route UI for that segment
- [ ] `layout.tsx` = shared UI that wraps `page.tsx` and all children; persists across navigation
- [ ] `template.tsx` = like layout but remounts on navigation (rare; e.g. re-run enter animations)
- [ ] `loading.tsx` = automatic `<Suspense>` fallback for that segment while it (and its data) loads
- [ ] `error.tsx` = client error boundary for that segment (`"use client"` required)
- [ ] `not-found.tsx` = rendered on `notFound()` call or unmatched route
- [ ] Dynamic segments: `[id]`, catch-all `[...slug]`, optional catch-all `[[...slug]]`
- [ ] Route groups `(marketing)` - organize without affecting the URL
- [ ] Parallel routes `@slot` and intercepting routes `(.)folder` - advanced, know they exist and roughly why (modals that also work as full pages, dashboards with independent sections)
- [ ] `route.ts` = Route Handler (API endpoint) for that segment, not a page

### File tree example

```text
app/
  layout.tsx              # root layout - <html>, <body>, global providers
  page.tsx                # "/"
  loading.tsx             # loading UI for "/"
  (marketing)/
    about/
      page.tsx             # "/about" - group doesn't affect URL
  dashboard/
    layout.tsx             # persists across all /dashboard/* routes
    page.tsx                # "/dashboard"
    loading.tsx
    orders/
      [orderId]/
        page.tsx            # "/dashboard/orders/123"
        error.tsx
  api/
    orders/
      route.ts              # GET/POST /api/orders
```

### Interview question

**Q: What is the difference between `layout.tsx` and `template.tsx`?**

> "A layout persists its state and DOM across navigations within that segment - it doesn't remount when you move between sibling pages. A template remounts on every navigation, so local state resets and effects rerun. I'd reach for a template only when I specifically need per-navigation behavior, like re-triggering an enter animation - layouts are the default for shared nav, sidebars, and providers."

**Q: How would you build a dashboard with a persistent sidebar and independently loading content panels?**

> "A `layout.tsx` at the `dashboard` segment renders the sidebar once, and `{children}` is the routed content. Each nested route gets its own `loading.tsx`, so navigating between dashboard sections shows a local skeleton for the panel while the sidebar stays mounted and interactive. If two independent panels needed to load and navigate independently on the same URL, that's what parallel routes (`@slot`) are for."

---

## 3. Layouts and nested layouts in depth

### Topics to learn

- [ ] Root layout is mandatory in App Router and must render `<html>` and `<body>`
- [ ] Layouts receive `{ children }` and (for the root) can't access route params directly unless declared
- [ ] Layouts can be Server Components and fetch their own data (e.g. nav data) independent of the page
- [ ] Layouts do **not** re-render on navigation between children - this is a deliberate performance feature, not a bug
- [ ] Metadata API (`export const metadata` / `generateMetadata`) is layout/page-scoped and merges up the tree

### Why this matters for real apps (Clean House framing)

> "On Clean House, the manager dashboard has a persistent shell - sidebar navigation, warehouse selector, user menu - while the content area swaps between warehouse management, delivery workflows, and reporting views. Structuring that as a `layout.tsx` around nested `page.tsx` routes means the shell doesn't remount or refetch when a manager clicks between sections, which was a real, noticeable UX improvement over an approach that treats every route as a fully separate client tree."

### Interview question

**Q: If a layout fetches data, and I navigate to a child page, does the layout refetch?**

> "No - by design, a layout instance persists across navigations to its children, so it does not remount or re-run its data fetching. If the layout's data actually needs to change (e.g. it depends on something in the URL that changed), Next.js will re-render it, but if nothing it depends on changed, it stays put. That's part of why nested layouts are more efficient than re-rendering a shared header/sidebar from scratch on every route in Pages Router."

---

## 4. Server Components vs Client Components

### Topics to learn

- [ ] Default: everything in `app/` is a **Server Component** unless the file (or a file it imports) has `"use client"` at the top
- [ ] Server Components can: read files, query databases directly, use secrets/env vars safely, `await` data - none of that code or its dependencies ship to the browser
- [ ] Server Components cannot: use `useState`, `useEffect`, `useContext`, browser-only APIs, event handlers (`onClick`, etc.)
- [ ] Client Components can: use hooks, state, effects, browser APIs, event handlers - but their code (and everything they import) ships as JS to the browser
- [ ] `"use client"` marks a **boundary**, not just one file - everything imported below it in the tree also becomes part of the client bundle
- [ ] Server Components can import and render Client Components; Client Components **cannot** import Server Components directly (but can receive them as `children`/props - the "passing Server Components as children into Client Components" pattern)
- [ ] Passing data from Server to Client Components: props must be serializable (no functions, no class instances, no Dates without conversion consideration)
- [ ] `"use server"` (Server Actions) is a different, related concept - a function callable from the client that always runs on the server (covered more in chapter 03)

### Decision table

| Need | Component type |
|---|---|
| Fetch data directly from DB/API with secrets | Server |
| Render static or server-derived markup, no interactivity | Server |
| `onClick`, `onChange`, form local state | Client |
| `useState`, `useEffect`, `useRef` | Client |
| Browser APIs (`window`, `localStorage`, `IntersectionObserver`) | Client |
| Third-party library that assumes a browser (charts, rich text editors, maps) | Client |
| Context providers (theme, auth session on client, React Query provider) | Client (but can be a thin wrapper used near the root) |

### The "leaf client component" pattern

Push `"use client"` as far down the tree as possible so the minimum amount of JS ships to the browser.

```tsx
// app/dashboard/page.tsx  (Server Component - no directive)
import OrdersTable from "./orders-table"; // Server Component - fetches data
import RefreshButton from "./refresh-button"; // Client Component - just a button

export default async function DashboardPage() {
  const orders = await getOrders(); // runs on the server, no client JS for this
  return (
    <div>
      <RefreshButton />
      <OrdersTable orders={orders} />
    </div>
  );
}
```

```tsx
// app/dashboard/refresh-button.tsx
"use client";
import { useRouter } from "next/navigation";

export default function RefreshButton() {
  const router = useRouter();
  return <button onClick={() => router.refresh()}>Refresh</button>;
}
```

`OrdersTable` stays a Server Component (renders on the server, zero JS), while only the tiny `RefreshButton` ships interactive JS.

### Common mistake to call out in interviews

> "A common mistake is putting `'use client'` at the top of a big page or layout file just because *one* small piece needs interactivity - that pulls the entire subtree (and everything it imports) into the client bundle. The fix is to isolate the interactive piece into its own small Client Component and keep everything else, including data fetching, on the server."

### Interview questions

**Q: Can a Server Component import a Client Component?**

> "Yes, that's the normal, expected direction - a Server Component renders the shell and imports Client Components for the interactive leaves. What you can't do is import a Server Component from inside a Client Component file, because once you're in client code, everything below it in that import graph is client code too. If a Client Component needs to render a Server Component, the pattern is to accept it as `children` (or another prop) passed down from a Server Component parent, not import it directly."

**Q: What can and can't cross the Server-to-Client boundary as props?**

> "Only serializable values - plain objects, arrays, strings, numbers, booleans. Functions, class instances, Symbols, and things like raw Date objects need care (dates usually get passed as ISO strings and re-parsed, or serialized structures are used). You can't pass a server-only function as a prop for the client to call directly unless it's wrapped as a Server Action."

---

## 5. Rendering strategies: SSR, SSG, ISR, CSR

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

## 6. Streaming and Suspense

### Topics to learn

- [ ] Streaming SSR: the server can send HTML in chunks as it becomes ready, instead of waiting for the entire page
- [ ] `loading.tsx` is sugar for wrapping a route segment in `<Suspense>` automatically
- [ ] You can add your own `<Suspense>` boundaries around slow components for more granular streaming than a whole-route `loading.tsx`
- [ ] Why streaming improves perceived performance: fast shell (nav, layout) shows immediately; slow parts (a report widget hitting a slow DB query) stream in later without blocking the rest
- [ ] Streaming requires the slow work to be inside an `async` Server Component so React can suspend on it
- [ ] Interaction with SEO/crawlers: search engine crawlers generally wait for the full response, but real users see progressive rendering

### Example: granular streaming

```tsx
// app/dashboard/page.tsx
import { Suspense } from "react";
import OrdersSummary from "./orders-summary"; // fast
import RevenueChart from "./revenue-chart";   // slow query

export default function DashboardPage() {
  return (
    <div>
      <OrdersSummary />
      <Suspense fallback={<ChartSkeleton />}>
        <RevenueChart />
      </Suspense>
    </div>
  );
}
```

`OrdersSummary` and the page shell render immediately; `RevenueChart`'s slow `await` doesn't block the rest of the page - a skeleton shows until it resolves and streams in.

### Interview question

**Q: What's the difference between `loading.tsx` and a manual `<Suspense>` boundary?**

> "`loading.tsx` is a route-level convention - Next.js automatically wraps the entire page segment in a Suspense boundary using that file as the fallback, so the whole route shows a skeleton until everything in it resolves. A manual `<Suspense>` boundary lets me be more granular - I can let the fast 80% of a page render immediately and only show a fallback around the one slow widget, which usually gives a better perceived-performance result than an all-or-nothing route-level loading state."

**Q: Does streaming help SEO?**

> "Not directly for crawlers that wait for the full response, but it massively helps real users' perceived load time (Time to First Byte and meaningful paint), and Core Web Vitals like it because content becomes visible and interactive sooner even if total load time is similar."

---

## 7. Client-side navigation, prefetching, and hydration

### Topics to learn

- [ ] `<Link>` prefetches linked routes in the viewport by default (production only) for instant navigation
- [ ] `useRouter()` (from `next/navigation` in App Router, not `next/router`) for programmatic navigation
- [ ] Soft navigation: App Router reuses layouts and only re-renders/fetches the changed segment
- [ ] Hydration: the client "attaches" React to server-rendered HTML, matching the DOM instead of re-creating it
- [ ] Hydration mismatch errors: caused by rendering something different on server vs first client render (e.g. `Date.now()`, `Math.random()`, browser-only checks like `typeof window` used inside render, locale/timezone differences)
- [ ] `suppressHydrationWarning` as a narrow escape hatch, not a general fix

### Interview question

**Q: You see "Hydration failed because the initial UI does not match what was rendered on the server." How do you debug it?**

> "First I look for anything non-deterministic or environment-dependent in the render path - current time/date formatting, random IDs, `window`/`navigator` checks that run during render instead of in `useEffect`, or browser extensions injecting markup. The fix is usually to move client-only logic into `useEffect` so it runs after hydration, or to render a stable placeholder on the server and swap it in after mount. I treat `suppressHydrationWarning` as a last resort for truly unavoidable cases like third-party timestamp widgets, not a general fix."

---

## Full interview question bank (with answer targets)

### Routing fundamentals

1. **App Router vs Pages Router - what changed and why?** -> RSC-first, nested layouts, streaming, per-segment conventions.
2. **What files does a route segment support and what does each do?** -> `page`, `layout`, `template`, `loading`, `error`, `not-found`, `route`.
3. **How do dynamic segments and catch-all routes work?** -> `[id]`, `[...slug]`, `[[...slug]]`.
4. **What's a route group and why would you use one?** -> `(name)` folders organize routes/layouts without affecting the URL.
5. **What are parallel and intercepting routes, at a high level?** -> `@slot` for independent sections; `(.)folder` to render a route as an overlay/modal while preserving the URL.

### Rendering model

6. **Server Component vs Client Component - the actual rule?** -> default server; `"use client"` marks a boundary that pulls the subtree into the client bundle.
7. **Can a Client Component import a Server Component? Why/why not?**
8. **How does Next.js decide whether a route is static or dynamic?** -> presence of dynamic APIs/uncached fetch/`force-dynamic`.
9. **Explain SSR/SSG/ISR/CSR in App Router terms, not Pages Router terms.**
10. **What triggers ISR regeneration - time-based and on-demand?** -> `revalidate`, `revalidateTag`, `revalidatePath`.
11. **What is streaming SSR and what does `<Suspense>` do here?**
12. **Why do layouts not re-render on child navigation, and why is that useful?**

### Debugging / practical

13. **A page that should be static is rendering dynamically - how do you find out why?** -> check for `cookies()/headers()`, uncached `fetch`, `dynamic` export, build output logs (Next prints static/dynamic per route).
14. **You have a slow third-party API call on a page - how do you stop it blocking the whole page?** -> isolate in its own async Server Component + `<Suspense>`.
15. **What causes a hydration mismatch and how do you fix it?**

---

## Hands-on drills (do these)

- [ ] Sketch the `app/` folder tree for a small e-commerce admin (dashboard layout, orders list, order detail, settings) with the right `page.tsx`/`layout.tsx`/`loading.tsx`/`error.tsx` placement.
- [ ] Take a component that unnecessarily has `"use client"` at the top and refactor it to push the directive down to just the interactive leaf.
- [ ] Write out, from memory, the rule for when a route is statically vs dynamically rendered.
- [ ] Explain out loud, in under 3 minutes, "why does App Router have Server Components and Pages Router doesn't."
- [ ] Pick one Clean House feature you built (manager dashboard, warehouse management, or delivery workflow) and describe out loud which rendering strategy the page used and why.
- [ ] Pick one Travel2Georgia page (public site vs admin dashboard) and justify SSG/ISR vs SSR for it.

---

## Senior red flags / green flags

### Green flags interviewers love

- Explaining Server/Client Components in terms of *where code runs and what ships*, not just "some are server, some are client."
- Being able to say "this page should be dynamic because X" instead of defaulting everything to SSR out of caution.
- Knowing that layouts persisting across navigation is a deliberate performance feature.
- Connecting rendering strategy choices to real product requirements (auth, freshness, SEO) instead of reciting definitions.

### Red flags

- "Next.js is just React with file-based routing" (misses RSC, caching, streaming entirely).
- Treating SSR as always the "better" or "more modern" choice regardless of the page's needs.
- Not knowing that `"use client"` affects the whole subtree, not just one file.
- Confusing `getServerSideProps`/`getStaticProps` (Pages Router) with App Router's actual mental model when asked about App Router specifically.

---

## Tie-backs to your experience (use in answers)

- Clean House: extending an *existing* Next.js platform means you had to work within already-established routing/rendering decisions - a good story about reading and respecting existing architecture instead of rewriting it.
- Clean House manager dashboards/warehouse management are a natural example of SSR-or-client-fetched, per-user, frequently-changing data.
- Clean House real-time delivery updates (WebSockets + FCM on the mobile side) pair well with a CSR-after-shell explanation on any web-facing delivery tracking view.
- Travel2Georgia is your best example of owning rendering strategy decisions end-to-end, since you built the whole platform, including the database and deployment.

---

## Senior-Level Best Practices

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

## Mastery checklist

- [ ] I can explain App Router vs Pages Router without reciting a feature list - I can explain *why* the change happened.
- [ ] I can state the Server/Client Component rule precisely, including what crosses the boundary and what doesn't.
- [ ] I can map any page requirement to SSR/SSG/ISR/CSR and justify it in one or two sentences.
- [ ] I can explain streaming and Suspense with a concrete example of a slow widget not blocking a fast page.
- [ ] I can debug a hydration mismatch from the error message alone.
- [ ] I can describe, specifically, how routing/rendering worked on Clean House and Travel2Georgia.
