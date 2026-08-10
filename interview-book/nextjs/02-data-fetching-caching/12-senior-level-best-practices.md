# 12. Senior-Level Best Practices

> Source: `interview-prep/nextjs/02-data-fetching-caching.md`

### Decision framework: which cache, which invalidation strategy

For any new piece of fetched data, work through this in order:

1. **Is it per-user or shared?** Per-user/authenticated data never belongs in a shared Data Cache or a public CDN cache - use `no-store` (or fetch it in a way that's inherently request-scoped) regardless of how "expensive" that feels. A cache-scoping bug here is a data-leak incident, not a performance regression.
2. **Who controls the write path?** If you own the mutation (an admin dashboard you also built calling your own Server Action/Route Handler), prefer **on-demand** invalidation (`revalidateTag`/`revalidatePath`) - it's precise and instant. If the data changes from a source you don't control the write path for (a third-party feed, a webhook you don't fully trust to always fire), keep a **time-based** `revalidate` as a safety net even if on-demand is the primary path.
3. **What's the cost of a cache miss vs the cost of staleness?** High-cost-to-compute, low-cost-to-be-stale data (an expensive aggregation report) wants a longer `revalidate` window and/or `stale-while-revalidate` behavior. Low-cost-to-compute, zero-tolerance-for-staleness data (a live order status) wants `no-store` even though it's "wasteful" by caching standards - correctness wins.
4. **Does staleness need to be visible to the user, or silently tolerated?** If staleness would be actively misleading (a price that changed), lean toward on-demand invalidation or shorter windows; if staleness is cosmetic (a blog post's view count), a long time-based window is fine.

### Caching pitfalls that actually bite in production

- **Mixing one `no-store` fetch into an otherwise-cacheable page makes the *whole route* dynamic.** This is the single most common "why did our fast page get slow" bug. The fix is almost always isolating the uncached data into its own Server Component wrapped in `<Suspense>`, not making everything dynamic to "be consistent."
- **Forgetting to tag a fetch means `revalidateTag` silently does nothing for it.** There's no error - the call just doesn't invalidate anything if the tag doesn't match. Treat "does this fetch have the right tag" as a required review item on any PR that adds a new cached fetch a mutation is supposed to affect.
- **Revalidating too broadly.** `revalidatePath('/dashboard')` might invalidate far more than the one card that actually changed, causing more regeneration work than necessary under load. Prefer the most specific tag/path that covers the actual change; broad invalidation on a high-traffic route can create a regeneration thundering herd right after a popular mutation.
- **Version-to-version default drift.** Next.js has changed the default `fetch` caching behavior across major versions (notably the 15 default flipping to uncached-by-default). Code that "worked" on one version can silently behave differently after an upgrade if caching options were left implicit. Always be explicit (`cache: ...`, `next: { revalidate, tags }`) on fetches where the caching behavior actually matters, rather than relying on whatever the current default happens to be.
- **Caching a response that depends on `Authorization`/cookies without partitioning by that identity.** If a Route Handler both reads a per-user token *and* is cached publicly (e.g., accidentally marked cacheable at a CDN layer), different users can receive each other's cached responses - one of the more severe classes of bug possible here.
- **Non-`fetch` data sources (raw DB clients, ORMs, direct calls to a NestJS backend via a non-`fetch` client) get zero automatic caching.** Teams sometimes assume "Next.js caches my data" broadly, then are surprised a Prisma/TypeORM-backed call re-runs every time - `unstable_cache`/`"use cache"` has to be applied explicitly.

### Server-side caching and a separate NestJS backend

- If NestJS already has response caching (e.g., an interceptor caching to Redis, or HTTP `Cache-Control` headers), decide **one layer as authoritative** for a given resource's freshness window. A common, clean split: NestJS caches/optimizes its own expensive queries internally and doesn't worry about Next.js at all; Next.js's fetch-level cache/ISR is a second, independent layer on top, with its own `revalidate` set to be greater than or equal to the backend's TTL so Next.js isn't "more real-time" than the backend can actually guarantee.
- When a mutation happens via a Server Action that calls the NestJS backend, the **revalidation call belongs in the Server Action**, not in NestJS - Nest has no way to reach into Next.js's Data Cache. This means the frontend has to know which tags/paths a given backend mutation affects, which is worth documenting explicitly (e.g., a small mapping table: "PATCH /tours/:id invalidates tag `tours` and `tours:{id}`") so it's not tribal knowledge.
- For webhook-driven invalidation (e.g., a CMS or payment webhook hits a NestJS endpoint, and the *Next.js* page needs to reflect it), the NestJS webhook handler needs a way to trigger Next.js's revalidation - typically by calling a dedicated, secret-protected Next.js Route Handler (`/api/revalidate?tag=tours&secret=...`) that itself calls `revalidateTag`. This is a cross-service call that's easy to forget to secure - always require a shared secret or signed request, since an open revalidation endpoint is a cheap denial-of-service vector (attacker triggers expensive regeneration repeatedly).

### Rollback and safety nets for cache/revalidation bugs

- **A bad `revalidate` value (too long) is a low-severity, easy rollback** - redeploy with a shorter window or trigger an on-demand `revalidateTag` manually to force a refresh without a full redeploy.
- **A bad on-demand invalidation bug (over-invalidating or firing on the wrong event) is higher severity** because it can cause a regeneration storm under load. Feature-flag new `revalidateTag`/`revalidatePath` call sites when introducing them on high-traffic routes, and consider rate-limiting/debouncing revalidation calls per tag if a mutation type is high-frequency (e.g., don't call `revalidateTag('tours')` on every single field edit if edits can be rapid-fire from an admin UI - debounce or batch).
- **Missing invalidation (data never updates)** is the most common bug but the safest to have, functionally - it's a staleness problem, not a correctness/security one, and is fixed by adding the missing `revalidateTag` call without needing a rollback, just a forward fix plus (if needed) one manual `revalidateTag` call to clear the currently-stale cache.

### Anti-patterns and failure modes

| Anti-pattern | Why it hurts | Fix |
|---|---|---|
| `no-store`/`force-dynamic` everywhere "to be safe" | Defeats caching entirely, pays full render cost on every request even for cacheable content | Default to cached; opt into `no-store` deliberately per-fetch with a stated reason |
| Caching per-user data in a way that's shared across users | Data leak between users | Never cache authenticated/personalized responses in a shared/public layer |
| Tagging fetches inconsistently (typo'd tag names, tags defined in two different files) | `revalidateTag` silently misses the fetch | Centralize tag name constants in one shared file, imported everywhere |
| Wrapping an external payment/API call's result in a long-lived cache without an invalidation path | Stale financial/critical data with no way to force a refresh | Keep a manual, secret-protected admin revalidation endpoint as an escape hatch |
| Assuming `fetch` caching defaults are the same across Next.js versions | Silent behavior change on upgrade | Be explicit about `cache`/`revalidate` on every fetch where it matters |

### Observability for caching

- Log cache hit/miss at the Data Cache and CDN layer if your hosting exposes it (self-hosted Nginx can expose `X-Cache-Status`-style headers from a caching layer; managed platforms expose their own headers) - without this, "is caching working" is a guess.
- Instrument revalidation call sites (log `revalidateTag`/`revalidatePath` calls with the tag/path and triggering mutation) so a staleness bug report can be traced to "was invalidation even called" vs "was it called but ineffective."
- Track regeneration frequency per tag/path in high-traffic routes; a spike right after a popular mutation is the signature of an invalidation-storm problem before it becomes a full incident.

### Team/scalability practices

- Maintain a small, explicit "cache tag registry" (even just a `cacheTags.ts` constants file) so every fetch and every `revalidateTag` call references the same source of truth - prevents the classic "tag typo means the mutation silently doesn't invalidate anything" bug.
- Document, per major data type, which system owns its freshness guarantee (Next.js ISR window vs NestJS internal cache vs "always fresh, no-store") so new engineers don't have to reverse-engineer the caching model from behavior.
- Treat "add `revalidateTag`" as a required checklist item in PR templates for any change to a Server Action/Route Handler that mutates cached data - this is the single most common thing to forget under review pressure.

### Harder senior follow-up Q&A

**Q: An admin dashboard lets someone bulk-edit 200 tours at once. Each edit calls `revalidateTag('tours')`. What breaks under load, and how do you fix it?**
> "200 rapid `revalidateTag` calls for the same tag can trigger 200 regeneration cycles for anything depending on that tag, which is wasteful and can spike server load right when the admin is trying to get work done. I'd debounce or batch the invalidation - either collect the mutation IDs during the bulk operation and call `revalidateTag` once at the end, or use a more granular per-tour tag (`tour:{id}`) for the individual edit views while reserving the broader `tours` tag invalidation for actual changes to the listing itself, so a single tour edit doesn't necessarily have to invalidate the whole listing cache at all."

**Q: How do you handle caching for a page that's 90% public/cacheable content and 10% personalized (e.g., a 'recommended for you' widget)?**
> "I isolate the personalized 10% into its own Server Component that reads `cookies()`/calls the personalized endpoint, wrapped in its own `<Suspense>` boundary - that component (and only that component) becomes dynamic, while the rest of the page stays statically cached/ISR. This is exactly the pattern for avoiding the 'one dynamic API call makes the whole route dynamic' trap, and it keeps the expensive, cacheable 90% cheap to serve."

**Q: You suspect a `revalidateTag` call isn't actually invalidating anything. How do you debug it without guessing?**
> "First I'd verify the tag string matches exactly what's on the fetch - a constants file would have prevented this, but if there isn't one, I diff the literal strings. Then I'd check whether the mutation code path is actually being hit at all (log at the top of the Server Action/Route Handler) versus a client-side path bypassing it entirely (e.g., a client mutation hitting the backend directly instead of through the Server Action that has the revalidation call). Finally I'd check whether the fetch in question is even going through Next.js's extended `fetch` (an ORM/raw DB call wouldn't be affected by `revalidateTag` at all unless wrapped in `unstable_cache` with matching tags)."

**Q: Your NestJS backend and Next.js frontend disagree about how fresh some data is - the backend says it's real-time, the frontend shows it 30 seconds stale. Whose 'fault' is it and how do you fix the mismatch?**
> "Neither is wrong in isolation - it's an uncoordinated layering problem. The frontend's `revalidate: 30` (or similar) is adding its own staleness window on top of whatever the backend already guarantees. I'd either drop the frontend's time-based revalidate for that specific fetch and rely on on-demand `revalidateTag` triggered by the same event that makes the backend 'real-time' (a webhook, an event bus message), or explicitly document and accept the combined staleness window if sub-second freshness genuinely isn't required for that UI, so it's a deliberate decision rather than an accidental one."

**Q: You need to expose an on-demand revalidation endpoint that a third-party webhook can call. What do you need to get right that isn't obvious from the happy path?**
> "Authentication first - an unauthenticated revalidation endpoint is a free way for anyone to force expensive regeneration on your site repeatedly, a real denial-of-service vector, so I'd require a shared secret or a signed payload the webhook provider supports. Second, idempotency and rate limiting - webhooks can retry or duplicate, so the endpoint should tolerate being called multiple times for the same event without issue, and I'd rate-limit it per source to blunt a misbehaving or compromised sender. Third, I'd log every call (tag/path, source, timestamp) since this endpoint sits outside the normal request flow and is exactly the kind of thing that's invisible until something goes wrong."

**Q: How would you cache the response of a Server Component that calls a NestJS endpoint requiring a fresh, short-lived internal service token on every call?**
> "I'd separate the two concerns: the token-fetching/attachment is a per-request mechanical detail, not something to cache, while the actual data returned by the backend call is what I want Next.js's Data Cache to hold, keyed by the meaningful request parameters, not by the token. Practically, that means generating/attaching the internal token fresh on every outgoing fetch, but still passing `next: { revalidate, tags }` on that fetch so Next.js caches the *response body* according to the data's own freshness needs, independent of the token's own short lifetime."

**Q: Your team debates putting a Redis cache in front of NestJS versus relying entirely on Next.js's own Data Cache. When would you actually want both layers?**
> "When more than one consumer needs the expensive data - if only the Next.js frontend ever calls this endpoint, one caching layer is enough and two is just added complexity to keep in sync. But if a mobile app or another service also hits the same NestJS endpoint directly, bypassing Next.js entirely, then Next.js's Data Cache does nothing for those callers - a Redis cache inside NestJS protects the expensive underlying work (a slow query, an aggregation) for every consumer, while Next.js's cache is purely about not re-fetching from NestJS unnecessarily for the frontend's own rendering."

---
