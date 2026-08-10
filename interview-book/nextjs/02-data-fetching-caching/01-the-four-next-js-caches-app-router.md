# 01. The four Next.js caches (App Router)

> Source: `interview-prep/nextjs/02-data-fetching-caching.md`

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
