# 08. Full interview question bank (with answer targets)

> Source: `interview-prep/nextjs/02-data-fetching-caching.md`

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
