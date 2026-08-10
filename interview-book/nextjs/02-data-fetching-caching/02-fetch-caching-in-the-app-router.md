# 02. fetch caching in the App Router

> Source: `interview-prep/nextjs/02-data-fetching-caching.md`

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
