# 02 - Data Fetching & Caching

> Goal: Explain exactly what Next.js caches, why, and how to control it - this is the single topic where interviewers separate "used Next.js" candidates from "understands Next.js" candidates.

Mark progress with `[x]` as you master each topic.

---

## Learning objectives

By the end of this section you should be able to:

1. Name the four distinct caches in Next.js (Request Memoization, Data Cache, Full Route Cache, Router/Client Cache) and what each one solves.
2. Control `fetch` caching explicitly with `cache` and `next.revalidate`/`next.tags` options.
3. Explain time-based revalidation (ISR) vs on-demand revalidation (`revalidateTag`, `revalidatePath`).
4. Explain why reading `cookies()`/`headers()` opts a route out of static rendering.
5. Fetch data in parallel instead of accidentally creating request waterfalls.
6. Decide when to fetch on the server vs use React Query (or SWR) on the client, and explain how the two coexist.
7. Debug "why is my data stale" and "why is my page suddenly dynamic" - two of the most common real-world Next.js bugs.
8. Tie this to Clean House (dashboards needing fresh, per-manager data) and Travel2Georgia (content that can tolerate a cache window).

---

## 1. The four Next.js caches (App Router)

This is the mental model interviewers actually want. Most candidates only know "fetch caches by default" - knowing there are **four separate caching layers** is a strong signal of depth.

| Cache | What it caches | Lifetime | Where |
|---|---|---|---|
| **Request Memoization** | De-dupes identical `fetch` calls (same URL + options) made multiple times *during a single render pass* | Single request/render only | Server, per-request |
| **Data Cache** | The actual data returned by `fetch` (or wrapped DB calls via `unstable_cache`) | Persists across requests and deployments until revalidated/invalidated | Server, persistent |
| **Full Route Cache** | The rendered HTML + RSC payload for statically rendered routes | Persists until revalidation or redeploy | Server, persistent |
| **Router Cache (client-side)** | Visited route segments' RSC payload, so back/forward and revisits feel instant | Session-based, short-lived, per-browser-tab | Client, in-memory |

### Why this matters

> "A lot of confusion I've seen (and had to debug myself) comes from mixing these up. If data looks stale, the question isn't 'is Next.js caching?' - it's 'which of the four caches is holding the old value, and what invalidates that specific one?' Request Memoization only matters within one render, so it's never the cause of stale data across requests. It's almost always the Data Cache (fetch not revalidating) or the Router Cache (client showing a stale visited segment) that's the actual culprit."

### Interview question

**Q: Why doesn't my mutation immediately show updated data on the page I navigate back to?**

> "Most likely the Router Cache still has the previously visited segment cached client-side, or the Data Cache still holds the old fetch result because I didn't revalidate it after the mutation. The fix is usually calling `revalidatePath()` or `revalidateTag()` in the Server Action/Route Handler that performs the mutation, and/or calling `router.refresh()` on the client to force Next.js to re-request the current route's data."

---

## 2. `fetch` caching in the App Router

### Topics to learn

- [ ] Next.js extends the native `fetch` with caching semantics via a second `options` argument
- [ ] `cache: "force-cache"` - cache indefinitely (default behavior for `fetch` in a static context, historically the pre-Next.js-15 default)
- [ ] `cache: "no-store"` - never cache; always fetch fresh, forces the route to render dynamically
- [ ] `next: { revalidate: <seconds> }` - time-based revalidation, this is ISR at the fetch level
- [ ] `next: { tags: ["orders"] }` - tag the cache entry so it can be invalidated on-demand with `revalidateTag("orders")`
- [ ] **Important recent change**: Next.js 15 changed the *default* `fetch` caching behavior to `no-store` (uncached) unless you explicitly opt in - know this exists even if you learned on an older default, and always mention "check the version" in interviews
- [ ] Non-`fetch` data sources (ORMs, raw DB clients) don't get automatic caching - use `unstable_cache` (or the newer `"use cache"` directive in canary/15+) to opt them into the Data Cache manually

### Example: three different caching strategies on one page

```tsx
// Cached indefinitely until manually revalidated - good for rarely-changing content
const staticData = await fetch("https://api.example.com/countries", {
  cache: "force-cache",
});

// ISR - revalidate in the background at most once every 60 seconds
const listings = await fetch("https://api.example.com/tours", {
  next: { revalidate: 60 },
});

// Always fresh, forces this route to render dynamically (SSR-like)
const liveOrders = await fetch("https://api.example.com/orders", {
  cache: "no-store",
});
```

Mixing an uncached (`no-store`) fetch into a page automatically makes the **whole route** render dynamically, even if other fetches on the same page are cached - this trips people up constantly.

### On-demand revalidation with tags

```tsx
// app/tours/page.tsx
const tours = await fetch("https://api.example.com/tours", {
  next: { tags: ["tours"] },
});
```

```ts
// app/admin/tours/actions.ts
"use server";
import { revalidateTag } from "next/cache";

export async function updateTour(id: string, data: TourInput) {
  await db.tours.update(id, data);
  revalidateTag("tours"); // invalidates every fetch tagged "tours", anywhere
}
```

> "Tag-based revalidation is what I'd use on something like Travel2Georgia's tour listings - the public page is cached and fast (ISR-style), but the moment an admin updates a tour in the dashboard, I call `revalidateTag('tours')` in that Server Action so the change shows up immediately instead of waiting for the timer, without needing a full rebuild or losing the caching benefit for everyone else."

### Interview question

**Q: What's the difference between `revalidate: 60` and `revalidateTag`?**

> "`revalidate: 60` is time-based - the cache is considered stale after 60 seconds, and the *next* request after that triggers a background regeneration (stale-while-revalidate), so users might see slightly old data for up to 60 seconds. `revalidateTag` (or `revalidatePath`) is event-based and immediate - I call it explicitly, usually right after a mutation, and it invalidates the cache the moment the write happens, regardless of any timer. I often use both together: a time-based fallback in case something is missed, plus on-demand invalidation for the common mutation paths."

---

## 3. `cookies()` and `headers()` - the dynamic APIs

### Topics to learn

- [ ] `cookies()` and `headers()` (from `next/headers`) read request-specific data
- [ ] Calling either of these inside a Server Component **opts that route out of static rendering** - it becomes dynamic (rendered per request), because the output can now legitimately differ per request
- [ ] This is one of the most common causes of "why is my page suddenly SSR instead of static" bugs
- [ ] `cookies().set(...)` for writing cookies is only allowed in Server Actions and Route Handlers, not in a plain Server Component render
- [ ] `NextRequest`/`NextResponse` give the same cookie/header access inside Middleware and Route Handlers

### Example

```tsx
import { cookies } from "next/headers";

export default async function AccountPage() {
  const sessionToken = cookies().get("session")?.value;
  const user = await getUser(sessionToken); // per-user, can't be statically cached
  return <Profile user={user} />;
}
```

The moment `cookies()` is called here, Next.js marks this route as dynamic - it will render fresh on every request rather than being cached in the Full Route Cache.

### Interview question

**Q: I added a personalization feature (read a cookie for locale/theme) and now my formerly-static marketing page is slow. Why?**

> "Reading `cookies()` or `headers()` anywhere in that route's render path opts the whole route out of static rendering, because Next.js can no longer guarantee the output is the same for every visitor. If I still want most of the page static, I'd isolate the cookie-dependent part into its own small Server Component (or even push it to the client), and wrap it in `<Suspense>` so only that slice is dynamic/streamed while the rest of the page stays statically cached."

---

## 4. Avoiding waterfalls - parallel vs sequential data fetching

### Topics to learn

- [ ] A waterfall happens when one `await` blocks the start of the next, unrelated fetch
- [ ] Fix: start independent fetches without awaiting immediately, then `await Promise.all([...])`
- [ ] Fix (component-level): let sibling Server Components each do their own `await fetch` - React can start them in parallel since they're independent branches of the tree (with Request Memoization dedupe if they hit the same URL)
- [ ] Sequential fetching is sometimes *necessary* (fetch a user, then fetch that user's orders using the user's id) - not every waterfall is a bug, but unnecessary ones are
- [ ] `Promise.all` failure behavior: one rejection rejects the whole batch - decide if you want `Promise.allSettled` for partial-failure tolerance

### Example: waterfall (bad) vs parallel (good)

```tsx
// BAD - sequential waterfall, these two calls don't depend on each other
async function Page() {
  const user = await getUser();      // waits ~200ms
  const settings = await getSettings(); // then waits another ~150ms
  // total: ~350ms, even though these could overlap
}
```

```tsx
// GOOD - parallel
async function Page() {
  const userPromise = getUser();
  const settingsPromise = getSettings();
  const [user, settings] = await Promise.all([userPromise, settingsPromise]);
  // total: ~200ms (the slower of the two)
}
```

```tsx
// ALSO GOOD - component-level parallelism
async function Page() {
  return (
    <>
      <UserPanel />      {/* awaits getUser() internally */}
      <SettingsPanel />  {/* awaits getSettings() internally, runs concurrently */}
    </>
  );
}
```

### Interview question

**Q: How do you detect a data-fetching waterfall in an existing Next.js app?**

> "I look at the Next.js dev overlay / server timing, or add temporary console timestamps around fetches, to see if calls that don't depend on each other are still happening back-to-back instead of overlapping. In production, I'd look at server response time traces (APM, or even just logging fetch start/end) for a page and check if the total time is roughly the sum of all fetches (waterfall) versus the max of the slowest one (parallel). The fix is almost always either `Promise.all` at one level, or restructuring so independent data lives in separate Server Components that each fetch on their own."

---

## 5. React Query (and SWR) on the client - how they coexist with App Router caching

### Topics to learn

- [ ] Server-side caching (fetch cache, Data Cache) solves *initial render* freshness/performance
- [ ] Client-side caching (React Query, SWR) solves *ongoing interactivity*: refetch on focus/reconnect, polling, optimistic mutations, pagination/infinite scroll, dependent queries triggered by user actions
- [ ] Pattern: fetch initial data on the server (fast first paint, good SEO if relevant), pass it as `initialData`/`initialDataUpdatedAt` into a client-side React Query hook so the client doesn't immediately refetch on mount
- [ ] `QueryClientProvider` must live in a Client Component (it uses Context + state internally)
- [ ] Server Components cannot use React Query hooks directly - hooks require the client
- [ ] Don't fight the framework: it's fine (and common in real apps) to have some pages purely Server-Component-fetched and other, more interactive dashboard sections use React Query on the client

### Example: server-fetched initial data + client-side React Query for live updates

```tsx
// app/dashboard/orders/page.tsx  (Server Component)
import OrdersClient from "./orders-client";

export default async function OrdersPage() {
  const initialOrders = await getOrders(); // fast first paint, SSR/ISR as appropriate
  return <OrdersClient initialOrders={initialOrders} />;
}
```

```tsx
// app/dashboard/orders/orders-client.tsx
"use client";
import { useQuery } from "@tanstack/react-query";

export default function OrdersClient({ initialOrders }: { initialOrders: Order[] }) {
  const { data: orders } = useQuery({
    queryKey: ["orders"],
    queryFn: fetchOrdersFromApi,
    initialData: initialOrders,
    refetchInterval: 15_000, // poll for live warehouse/delivery updates
  });
  return <OrdersTable orders={orders} />;
}
```

> "This is close to what I'd do on a Clean House-style warehouse/delivery dashboard: server-render the initial snapshot so the page is fast and doesn't flash a loading spinner, then hand it to React Query on the client so it can poll or refetch on focus, handle optimistic updates when a manager marks a delivery complete, and manage per-widget loading/error state without me hand-rolling all of that."

### Interview question

**Q: Isn't fetching on the server with the App Router redundant if you're also using React Query on the client?**

> "They solve different problems, not the same one. Server fetching gets you a fast, meaningful first paint and lets Next.js cache/ISR the initial HTML. React Query on the client handles what happens *after* that - background refetching, polling, mutation-driven cache updates, retry/error UI, pagination state. I pass the server-fetched data in as `initialData` so React Query doesn't do a redundant refetch on mount, and then let it own the client-side lifecycle from there. For a page that's read-once and rarely changes, I might skip React Query entirely and just use Server Component fetching plus `revalidateTag` on mutation."

---

## 6. Server Actions and mutations touching the cache

*(Full auth/Route Handler treatment is in chapter 03 - this section is specifically the caching angle.)*

### Topics to learn

- [ ] A Server Action that mutates data should call `revalidatePath` / `revalidateTag` so the UI reflects the change without a manual refresh
- [ ] `useOptimistic` (React) for instant UI feedback on the client while a Server Action is in flight
- [ ] `router.refresh()` forces the current route's Server Components to re-render/re-fetch fresh data without a full page reload or losing client state that lives above it

### Interview question

**Q: A manager marks a delivery as "completed" in the dashboard. Walk through the data flow.**

> "The button triggers a Server Action (or a client mutation hitting a Route Handler/NestJS endpoint). On success, the action calls `revalidateTag('deliveries')` so the Data Cache for that data is invalidated. If I want instant feedback rather than waiting for the round trip, I'd use `useOptimistic` on the client to flip that delivery's status immediately, then reconcile with the server response. If the list is also managed by React Query, I'd instead (or additionally) call `queryClient.invalidateQueries(['deliveries'])` or update the cache optimistically via `setQueryData`."

---

## 7. Common data-fetching bugs and how to reason about them

| Symptom | Likely cause | Fix |
|---|---|---|
| Page that should be static is rendering on every request | `cookies()`/`headers()` used, or a `no-store` fetch, somewhere in the render path | Isolate the dynamic part into its own component/Suspense boundary, or accept it's dynamic and cache elsewhere (CDN, edge) |
| Data never updates after a mutation | Missing `revalidatePath`/`revalidateTag` after the write | Add explicit revalidation in the Server Action/Route Handler that performs the write |
| Data updates for one user but shows stale for others behind a CDN | Confusing per-user data with a public/shared cache | Never cache per-user/authenticated data in the shared Data Cache/CDN; use `no-store` or per-user cache keys |
| Page takes far longer to load than any single query should | Sequential waterfall of independent fetches | `Promise.all`, or split into parallel Server Components |
| "Dynamic server usage" build/runtime error | Using `cookies()`/`headers()` in a route also marked for static generation, or used somewhere unexpected (e.g. a shared utility called from multiple places) | Trace which fetch/API call forced dynamic rendering; decide if that's actually required for that route |

---

## Full interview question bank (with answer targets)

### Caching model

1. **Name the four Next.js caches and what each is for.**
2. **What's the default `fetch` caching behavior, and has it changed between major versions?** -> mention the Next.js 15 default flip to uncached; always sanity-check per-project.
3. **Difference between `cache: "no-store"` and `next: { revalidate: 0 }`?** -> both avoid caching, but framed slightly differently: `no-store` never caches; `revalidate: 0` is treated like "always revalidate," effectively no cache either - in practice similar outcome, know both exist.
4. **What does tagging a fetch with `next: { tags: [...] }` let you do that time-based revalidation doesn't?** -> immediate, event-driven invalidation.
5. **Why does calling `cookies()` make a route dynamic?**

### Practical fetching

6. **How do you avoid a data-fetching waterfall?** -> `Promise.all`, or parallel sibling Server Components.
7. **How do you cache a raw DB call (not `fetch`) in the App Router?** -> `unstable_cache` / `"use cache"`.
8. **When would you deliberately choose `no-store` even though it hurts performance?** -> live/per-user/highly sensitive data, e.g. account balances, real-time order status.
9. **How does React Query coexist with server-side fetching?** -> server fetch = fast first paint + `initialData`; client query = ongoing lifecycle (polling, refetch-on-focus, optimistic updates).

### Debugging

10. **A dashboard page shows stale data one minute after a change - what do you check first?** -> which cache, is revalidation wired up, is it time-based or on-demand, is the client Router Cache involved.
11. **Users are seeing each other's cached account data - what went wrong?** -> per-user data cached in a shared/public cache; must use `no-store` or per-user keys and never cache at the CDN for authenticated responses.

---

## Hands-on drills (do these)

- [ ] Write a page with two independent `fetch` calls as a sequential waterfall, then rewrite it with `Promise.all`, and describe the expected timing difference out loud.
- [ ] Write a Server Action that mutates data and correctly calls `revalidateTag`; explain what breaks if you forget that line.
- [ ] Explain, without notes, the four Next.js caches and one concrete bug each one can cause if misunderstood.
- [ ] Sketch how you'd wire a Clean House-style delivery dashboard: which parts are Server Component fetches, which parts use React Query, and why.
- [ ] Explain how you'd design caching for Travel2Georgia's public tour listing page vs its admin tour-editing page.

---

## Senior red flags / green flags

### Green flags

- Says "which of the caches" instead of just "the cache" when debugging staleness.
- Knows caching defaults can change between Next.js versions and checks rather than assumes.
- Distinguishes public/shared cacheable data from per-user data that must never sit in a shared cache.
- Has a real, concrete story pairing server fetching with React Query rather than treating them as competitors.

### Red flags

- Believes "Next.js just caches everything automatically, don't worry about it."
- Doesn't know `cookies()`/`headers()` affect static vs dynamic rendering.
- Uses `no-store`/`force-dynamic` everywhere "to be safe," defeating the point of the framework.
- Can't explain the difference between time-based and on-demand revalidation.

---

## Tie-backs to your experience (use in answers)

- Clean House's manager dashboards and delivery workflows are naturally per-user/near-real-time data - a strong example for explaining `no-store`/dynamic rendering and pairing server fetching with React Query for live updates, echoing the WebSockets/FCM real-time approach you used on the mobile side.
- Travel2Georgia's public-facing content (tours, pages) is a strong example for ISR and tag-based revalidation triggered from the admin dashboard you also built.
- Owning both the Next.js frontend and the database/backend (NestJS, PostgreSQL/MySQL) on Travel2Georgia means you can speak to *both* sides of a mutation-then-revalidate flow, not just the frontend half.

---

## Mastery checklist

- [ ] I can name and explain all four Next.js caches without hesitation.
- [ ] I can write a `fetch` call with the correct `cache`/`revalidate`/`tags` options for a given scenario.
- [ ] I can explain why `cookies()`/`headers()` force dynamic rendering.
- [ ] I can spot and fix a data-fetching waterfall.
- [ ] I can explain exactly how server fetching and React Query divide responsibilities on the same page.
- [ ] I can walk through a full mutation -> revalidate -> UI-update flow end to end.
