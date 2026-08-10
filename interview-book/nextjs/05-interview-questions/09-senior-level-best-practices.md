# 09. Senior-Level Best Practices

> Source: `interview-prep/nextjs/05-interview-questions.md`

### Cross-cutting decision framework (the "how do you decide" meta-question)

Senior interviews increasingly ask a version of "how do you decide X" rather than "what is X." Every decision in this whole track collapses into the same four questions - rehearse applying this template live to a scenario you've never seen before:

1. **Who/what does this affect - one user, all users, or the whole system?** (per-user data vs shared data vs infra-wide config)
2. **What's the cost of getting it wrong in each direction?** (too much caching = stale/wrong data; too little = slow/expensive; too permissive auth = breach; too restrictive = broken UX)
3. **Who else depends on this, now or later?** (one client vs multiple clients, one team vs multiple teams, backward compatibility needs)
4. **What's the rollback/recovery story if this decision is wrong?** (is it a quick redeploy, a slow data-fix, or an unrecoverable leak/incident?)

Interviewers grade the *reasoning path* far more than the final answer - saying "it depends" and then actually working through these four questions out loud is a strong signal; saying "it depends" and stopping there is a red flag.

### Consolidated production checklist (say this out loud, unaided, as a single list)

- [ ] Every cached fetch has an explicit `cache`/`revalidate`/`tags` setting - nothing relies on an implicit version-dependent default.
- [ ] No per-user/authenticated data is ever cached in a shared Data Cache or public CDN layer.
- [ ] Every mutation that should invalidate a cache actually calls `revalidateTag`/`revalidatePath` - checked in code review, not assumed.
- [ ] `'use client'` boundaries are pushed to the smallest possible leaf components; providers are scoped, not global-by-default.
- [ ] Every protected route is checked in at least two layers (Middleware for UX + Server Component/backend for actual security) - Middleware is never the only gate.
- [ ] Secrets never carry the `NEXT_PUBLIC_` prefix; a rotation plan exists in case one ever does by accident.
- [ ] The Docker image uses `output: "standalone"`; Nginx (or equivalent) terminates SSL, compresses, and caches immutable static assets aggressively.
- [ ] A tested rollback path exists for both application deploys and database migrations, and they're decoupled from each other where possible (additive migrations, not destructive same-deploy renames).
- [ ] Dashboards/alerts exist for error rate, latency, and Core Web Vitals segmented by deploy version, not just aggregate numbers.

### Anti-patterns to name unprompted (green-flag behavior)

Volunteering these, even when not directly asked, signals depth:

- Defaulting everything to SSR/`no-store` "to be safe" instead of reasoning per-route.
- Letting a BFF Route Handler quietly grow real business logic that should live in the shared backend.
- Treating Middleware as a security boundary instead of a UX optimization.
- Storing tokens in `localStorage` without being able to discuss the XSS/CSRF tradeoff against `httpOnly` cookies.
- Never having thought about what happens to in-flight requests during a deploy (no graceful drain, no health-checked cutover).
- Assuming Lighthouse-in-CI is equivalent to real-user performance data.

### Harder senior/staff-level follow-up Q&A (beyond Parts A-F)

**Q: You're asked to justify, in a design review, why a given page should be ISR with a 5-minute window instead of on-demand revalidation only. What's the argument for keeping the time-based fallback even if on-demand covers every known mutation path?**
> "On-demand invalidation is only as reliable as every call site that's supposed to trigger it - a missed `revalidateTag` call in a new code path, a webhook that silently stops firing, or a direct DB write that bypasses the application layer entirely (a support engineer running a manual SQL fix) would all leave the cache stale forever without a time-based fallback. A 5-minute window costs almost nothing for content that changes infrequently, and it bounds the worst case for staleness to a known, acceptable number instead of an unbounded 'until someone notices and manually invalidates it.'"

**Q: A staff engineer asks you to estimate the blast radius of a proposed change: making the root layout a Client Component so it can use a new client-side feature flag library. What do you tell them?**
> "That's a significant blast radius, not a local change - the root layout wraps every route in the app, so making it (or anything it imports) a Client Component pulls the entire app's UI into the client bundle, eliminating the Server Component benefit everywhere at once, not just on the pages that actually need the feature flag. I'd push back and isolate the feature-flag logic into a small, narrowly-scoped Client Component used only where flags are actually read, or look for a feature-flag solution that can be evaluated server-side (many can, via a cookie or header check in a Server Component) instead of requiring a client-side provider at the root."

**Q: How do you evaluate whether a given Next.js + NestJS split is actually the right architecture for a project, versus cargo-culting a pattern you've used before?**
> "I'd look at the actual constraints: how many clients need the same backend logic, how complex the domain rules are, whether the team is large enough that module boundaries and DI actually pay off versus adding ceremony, and whether independent scaling/deployment is a real current need or a hypothetical future one. For a small project with one client and simple CRUD, a separate NestJS service can be pure overhead; for a project already serving web and mobile with real business logic, it's close to mandatory. I try not to default to 'the stack I know' without checking it against the project's actual shape."

**Q: If you had to remove one layer of defense-in-depth from the auth flow to hit a deadline, which would you cut and why, and what would you tell the team about the risk?**
> "I wouldn't cut the backend-level authorization check under any deadline pressure - that's the actual security boundary, and removing it turns a defense-in-depth model into a single point of failure. If forced to cut something, it would be the redundant Server Component/layout-level re-check, accepting that Middleware's coarse gate plus the backend's authoritative check still cover the real risk, just with a slightly worse UX (a user might briefly see a page shell before being redirected, rather than never seeing it at all) rather than a worse security posture. I'd document that as a known, deliberate short-term gap and put a ticket in to restore it, not just quietly drop it."

**Q: Describe a time (real or hypothetical, drawing on your Clean House/Travel2Georgia experience) where you chose the "boring," well-understood option over a more modern one, and why.**
> "On Travel2Georgia, I chose Docker + Nginx + Let's Encrypt over a more 'modern' serverless/edge-first deployment, partly because it gave me full control and predictable cost as a single owner of the whole stack, and partly because I could co-locate the backend and database on the same infrastructure without coordinating multiple managed platforms. The tradeoff was taking on operational responsibility (SSL renewal, process supervision, scaling) that a managed platform would have handled for me - a deliberate choice given the project's size and my role owning it end to end, not something I'd necessarily choose again for a much larger team or a project that needed to scale unpredictably fast."

**Q: An interviewer asks you to design the rendering/caching strategy for a brand-new page you've never discussed before - say, a public leaderboard that updates every few seconds. How do you structure your answer live?**
> "I'd walk the same four questions I use for any rendering decision, out loud: is it the same for every visitor (yes, it's public), how stale can it tolerate being (a few seconds, given it updates that often), does it need to be crawlable (probably not critical for a leaderboard), and is the data push- or pull-driven (likely pull, polled from a backend ranking service). That points to either very short-window ISR or, if 'a few seconds' really means near-real-time, a static shell with a client-side polling or WebSocket subscription taking over - and I'd say which one I'd pick by default and why, rather than listing options without committing."

**Q: How do you handle a question you're not fully certain about during a live technical interview?**
> "I state what I'm confident about first, then reason out loud toward the uncertain part rather than guessing silently and presenting it as fact - for example, 'I know Server Components can't use hooks, and I believe passing a function as a prop from server to client isn't allowed because it isn't serializable, though I'd want to double check the exact error Next.js throws for that case.' That's both more honest and, in my experience, better received than confidently stating something I'm not sure of."

### Quick-reference: senior distinctions across the whole Next.js track

- **Static vs dynamic rendering:** determined by whether the route uses a dynamic API/uncached fetch, not by a manual toggle you set and forget.
- **Time-based vs on-demand revalidation:** time-based covers sources you don't control the write path for; on-demand is precise and instant for mutations you do control.
- **`'use client'` on a page vs on a leaf component:** the former ships the whole subtree's JS; the latter isolates the cost to exactly what needs it.
- **Middleware vs backend authorization:** Middleware is a fast, coarse UX gate; the backend is the actual, non-negotiable security boundary.
- **Route Handler vs Server Action:** a stable HTTP contract for outside callers vs an RPC-style function for your own UI's mutations.
- **Edge vs Node runtime:** lightweight/latency-sensitive with a restricted API surface vs full Node API access at higher cold-start cost.
- **`next/image` `priority` vs default lazy loading:** above-the-fold hero content vs everything else.
- **Blue-green vs rolling deploy:** blue-green swaps two full environments atomically for zero-risk cutover; rolling replacement is simpler and proportionate for most small-team setups.
- **Additive vs destructive schema change:** additive changes keep old and new code deployable side by side; destructive changes need a staged, multi-deploy rollout to stay rollback-safe.
- **Redis cache in NestJS vs Next.js's own Data Cache:** the backend cache protects every consumer of that endpoint (web, mobile, third parties); the frontend cache only saves the frontend from re-fetching what it already has.
- **Deny-by-default guard vs per-route protection:** deny-by-default fails safe when someone forgets to annotate a new route; per-route protection fails open on the same mistake.
- **Ownership check in a guard vs in the service:** the guard has cheap access to the authenticated user and route params; the service already has the resource loaded, so data-dependent checks belong there to avoid a duplicate lookup.

---
