# 12. Senior-Level Best Practices

> Source: `interview-prep/nextjs/04-performance-deployment.md`

### Decision framework: how much deployment sophistication does this project actually need

Not every project needs blue-green deploys and canary releases - matching infrastructure investment to actual risk/scale is itself a senior signal:

1. **Single small team, moderate traffic, tolerable brief downtime on rare bad deploys (early-stage Travel2Georgia-style project)?** A simple rolling container replacement behind Nginx with a health check before cutover is proportionate - full blue-green/canary is over-engineering for the risk profile.
2. **Multiple engineers deploying frequently, real revenue/user impact per incident?** Health-checked rolling restarts are the minimum; a staging environment that mirrors production config is close to mandatory.
3. **High-traffic, can't tolerate even brief error spikes during deploys?** Blue-green (two full environments, swap traffic atomically) or canary (route a small percentage of traffic to the new version, watch error rates, then ramp) becomes worth the added infrastructure complexity.
4. **Multiple services/teams deploying independently (Next.js frontend + NestJS backend as separate deployables)?** Deploy ordering and backward-compatibility matter - the backend generally needs to support both old and new frontend contracts during a rollout window, not require a synchronized flag-day deploy.

### Deploy and rollback mechanics for a self-hosted Next.js + Docker setup

- **Health checks before traffic cutover.** Whatever process manages the Docker container (Docker Compose, a custom script, Kubernetes) should wait for the new container to pass a real health check - hitting an actual route, not just "process started" - before routing traffic to it and killing the old one. A container that starts but immediately errors on every request is worse than one that's slow to start, because it looks "up" to a naive process check.
- **Rollback should be as fast as forward deploy.** If your deploy process is "build a new image, replace the running container," rollback needs to be exactly the mirror: keep the previous image tagged and ready so reverting is "run the previous image," not "revert the commit and rebuild from scratch" - the latter turns a 2-minute rollback into a 15-minute one under incident pressure.
- **Database migrations complicate rollback.** If a deploy included a schema migration (on the NestJS side) that the new frontend code depends on, rolling back the frontend alone without rolling back the migration can break in either direction. Prefer additive, backward-compatible migrations (add a column, don't rename/drop one in the same deploy that also changes the code reading it) so frontend and backend can be rolled back independently if needed.
- **Static asset immutability matters for safe rollback.** Because Next.js's `/_next/static/*` assets are content-hashed, an old container serving old HTML referencing old-hashed assets keeps working even if a newer container's assets are also present - this is why aggressive, long-lived caching (`immutable`, `max-age=31536000`) on those paths is safe, and why you generally should *not* delete old static asset directories immediately on deploy (keep at least the last 1-2 versions' assets available in case any client has an old HTML page cached and requests old asset URLs).
- **Nginx config changes deserve their own careful rollout.** A syntax error in an Nginx config change can take down the entire app, not just one feature - always `nginx -t` (config test) before reload, and reload (`nginx -s reload`, graceful) rather than restart, so in-flight connections aren't dropped.

### Anti-patterns and failure modes

| Anti-pattern | Why it hurts | Fix |
|---|---|---|
| Deploying by SSH-ing in and manually running commands | Not reproducible, no audit trail, easy to forget a step under pressure | Scripted/CI-driven deploy, even for a single-server setup |
| No health check before cutting traffic to a new container | A container that starts but errors immediately causes a full outage that looks like "the deploy succeeded" | Real health check hitting an actual route before routing traffic |
| Deleting old static assets immediately on deploy | Users with an old cached HTML page get 404s for `_next/static` chunks | Keep at least the last 1-2 builds' static assets available |
| Copying the full `node_modules` into the production Docker image | Bloated image size, slower deploys, larger attack surface | `output: "standalone"` + multi-stage build |
| One combined deploy for a backward-incompatible frontend+backend contract change | Any rollback of just one side breaks the other | Make the backend support both old and new contracts during the rollout window; deploy backend first, frontend second |
| Treating `next dev` performance/behavior as representative of production | Dev mode disables many production optimizations (this bit real teams: no minification, different caching) | Always validate performance claims against a production build (`next build && next start`, or the actual deployed environment) |

### Observability that catches deploy regressions early

- **Error rate and latency dashboards segmented by deploy version/timestamp** - the single fastest way to correlate "things got worse" with "we just shipped X," rather than debugging blind.
- **Synthetic health checks hitting a few key routes on a schedule**, independent of real user traffic, so a regression is caught even during low-traffic hours before real users report it.
- **Track Core Web Vitals via RUM (real user monitoring), not just Lighthouse**, since Lighthouse runs in a controlled environment that doesn't reflect real users' devices/networks - a regression that only shows up on slow mobile connections is invisible in a fast CI-run Lighthouse check.
- **Container restart counts and OOM kills** as an infrastructure-level signal - a memory leak or an unbounded in-memory cache introduced in a deploy often shows up first as periodic container restarts before anyone notices a user-facing symptom.
- **Nginx access/error logs for 5xx spikes right after a deploy window** - a fast, cheap signal that doesn't require any custom instrumentation.

### Team/scalability practices

- **Runbook for rollback** should exist and be tested *before* it's needed - "how do we roll back" is a bad question to be answering for the first time during an active incident.
- **Deploy during low-traffic windows** for anything higher-risk (a rendering-strategy change, a Nginx config change, a major dependency bump), and reserve the ability to deploy anytime for routine, low-risk changes - not every deploy needs the same ceremony.
- **Staging should mirror production configuration as closely as feasible** - env vars, Nginx config shape, container resource limits - because "worked in staging" is only meaningful if staging actually resembles the thing that can fail in production (a classic gap: staging running with more generous memory limits than production, hiding an OOM issue until it's live).
- **As the team grows past one person deploying, agree on a deploy/release process** (who can deploy, when, how rollback is communicated) rather than leaving it as one person's tribal knowledge - this is exactly the kind of thing that becomes a bottleneck or an incident multiplier as more engineers touch the same infrastructure.

### Harder senior follow-up Q&A

**Q: A deploy goes out and error rates spike immediately, but rolling back doesn't fix it - errors persist even on the old container. What's your hypothesis?**
> "That pattern suggests the actual regression isn't in the application code at all - it's in something shared and stateful that the rollback doesn't touch: a bad database migration that already ran and isn't backward-compatible with the old code, a config/env var change applied at the infrastructure level rather than per-deploy, or an external dependency (a third-party API, a DNS change) that changed independently around the same time. I'd check what actually changed outside the container image itself before assuming the rollback 'should have' worked."

**Q: How do you deploy a breaking database migration (e.g., renaming a column the NestJS backend and, indirectly, the frontend both depend on) without downtime?**
> "Never a single-step rename. I'd do it in stages: add the new column, write to both old and new columns from the application code (dual-write), backfill existing rows, switch reads to the new column once backfill is verified complete, stop writing to the old column, and only then drop it in a later migration. Each stage is independently deployable and rollback-safe, unlike a single migration that renames the column atomically and leaves no safe rollback path once any new code has run against it."

**Q: You're asked to add canary deployment to a single-server, self-hosted Next.js + Nginx + Docker setup. What's the minimal version of this you'd actually build, given the infra?**
> "Run two containers - the current version and the new version - on different internal ports, and use Nginx's `upstream` weighted load balancing to send a small percentage of traffic (e.g., 5-10%) to the new version while watching error rates/latency specifically for that upstream. If it looks healthy after a bake period, shift weight to 100% new and retire the old container; if not, shift weight back to 0% on the new version - no DNS changes, no separate infrastructure, just Nginx doing weighted routing between two containers on the same host. It's not as robust as a real load-balancer-managed canary across multiple hosts, but it's a proportionate, low-infra version of the same idea."

**Q: Your standalone Docker image size keeps growing every few months even though `output: standalone` is already configured. What would you check?**
> "First, whether a new dependency was added that itself pulls in a large native binary or isn't tree-shaken well - `standalone` only trims `node_modules` to what's actually referenced at runtime, it doesn't make a genuinely large dependency smaller. Second, whether the `public/` folder has accumulated large, uncompressed assets that should be served from a CDN/object storage instead of bundled into the app image. Third, I'd diff the image's layer sizes over time (`docker history`) to find exactly which layer grew, rather than guessing."

**Q: The team wants to move from a single self-hosted server to multiple instances behind a load balancer for the same Next.js app. What breaks first, and how do you prepare?**
> "Anything relying on in-memory state local to one process breaks first - an in-memory cache, an in-memory rate limiter, and (if the app has any Route Handler-based WebSocket or SSE logic) connection state. I'd move shared state to Redis before scaling out, verify session/auth cookies aren't tied to a specific instance in any way, and make sure the Nginx/load-balancer layer is configured for health-checked routing so a bad instance doesn't keep receiving traffic. I'd also double check that `output: standalone` images are truly stateless/interchangeable - no local file writes assumed to persist across requests - since with multiple instances, a request can land on a different container than the one that handled the previous request from the same user."

### Deploy-risk quick reference

| Change type | Risk level | Rollback approach |
|---|---|---|
| Application code only (no schema/config change) | Low | Redeploy previous image |
| `next.config.js` change (headers, redirects, images config) | Low-medium | Redeploy previous image; verify redirects/headers with a smoke test first |
| Nginx config change | Medium | `nginx -t` before reload; keep the previous config file ready to restore |
| Additive DB migration (new column/table) | Medium | Roll back application code independently; migration stays, unused |
| Destructive DB migration (rename/drop column) | High | Requires a multi-step, staged migration plan - not a simple single-step rollback |
| Env var / secret rotation | Medium | Keep the previous secret valid during a grace window until rollout is confirmed |

### Team/scalability practices, continued

- Treat the deploy pipeline itself as production code - version it, review changes to it, and test it in a lower environment before trusting it for a production release, the same discipline applied to application code.
- Keep a short, current "what our infra actually looks like" diagram (containers, Nginx, DB, any external services) - infra drifts from any doc that isn't actively maintained, and an out-of-date diagram is worse than none during an incident because it actively misleads.

---
