# 10. Senior-Level Best Practices

> Source: `interview-prep/nextjs/03-middleware-auth-apis.md`

### Decision framework: Next.js Route Handlers vs NestJS, applied concretely

Beyond the general "BFF vs backend" framing in chapter 4, apply this checklist to any *specific* endpoint decision:

1. **Who else calls this logic?** If the answer is "only this Next.js app's own UI," a Server Action or thin Route Handler is fine. If it's "web + mobile" or "web + a partner/webhook," it belongs in NestJS as the single source of truth.
2. **Does it need a database transaction spanning multiple writes, or business rules that will grow?** Complex, evolving domain logic belongs in NestJS's service layer where it has DI, guards, and a real testing setup - not accreting inside a Route Handler that has none of that structure by default.
3. **Does it need to hide something from the browser?** A third-party API key, an internal service URL, or the shape of an httpOnly cookie - these are legitimate reasons for a thin Next.js proxy layer even when the real logic lives in NestJS.
4. **Does it need independent scaling or deploy cadence?** If API load and frontend traffic scale very differently (e.g., a mobile app hammering the API while web traffic is comparatively light), a separate NestJS deployment can scale independently; co-locating everything in Next.js couples their infrastructure.

### The BFF layer in production - what it should and shouldn't do

- **Should:** set/read httpOnly cookies, attach the bearer token to outbound requests to NestJS server-side, aggregate 2-3 backend calls into one page-shaped response, translate a backend error shape into whatever the frontend's error-handling convention expects.
- **Should not:** contain business rules that would need to be duplicated if a second client (mobile) needed the same behavior, hold long-lived state, or become a second place authorization decisions are made independently of the backend's own checks (the backend must always re-verify authorization itself - a BFF proxy is not a security boundary on its own).
- **Watch for scope creep.** A BFF Route Handler that starts as "just forward this request and add a cookie" can slowly accumulate business logic over many small PRs until it's effectively a second, undocumented backend. Periodically audit BFF routes for logic that should have been pushed into NestJS instead.

### Auth threat model - the questions a security-minded interviewer actually asks

Walk through these explicitly rather than just describing the happy path:

| Threat | Mitigation |
|---|---|
| XSS steals a token from `localStorage`/client-readable state | Store tokens in `httpOnly` cookies so client JS can't read them at all |
| CSRF exploits a browser auto-attaching a cookie to a cross-site request | `sameSite=lax`/`strict` on the auth cookie; for state-changing requests, consider a CSRF token or double-submit cookie pattern if `sameSite` alone isn't sufficient for the app's cross-site needs |
| Stolen refresh token used indefinitely | Refresh token rotation with reuse detection (see NestJS auth chapter) - the frontend's job is just to always send the current token and handle a forced logout gracefully when the backend revokes |
| Token replay after logout | Backend must actually invalidate the refresh token server-side on logout, not just have the frontend delete its local cookie - a stolen-before-logout token would otherwise still work |
| Open redirect via a `?from=` or `?returnTo=` query param used in login redirects | Validate the redirect target is a same-origin relative path before using it in `NextResponse.redirect()` - never redirect to an arbitrary attacker-supplied absolute URL |
| Privilege escalation via a role baked into an old JWT after a demotion | Keep access tokens short-lived; for urgent revocation, the backend needs a way to invalidate sessions faster than natural expiry (denylist check on sensitive routes) |
| Direct access to a Route Handler bypassing Middleware's redirect | Middleware is UX, not security - the Route Handler/Server Component/backend must independently verify auth regardless of whether Middleware ran |

### Middleware in production - performance and deploy considerations

- **Middleware runs on every matched request, including prefetches from `<Link>`.** A slow or synchronous-feeling check in Middleware adds latency to every navigation across the app, not just the page being protected - profile it like a hot path, because it is one.
- **`config.matcher` mistakes are a common source of both over-protection and under-protection.** Too broad, and Middleware runs (and adds latency) on static assets or public routes it shouldn't touch; too narrow, and a new route under a protected prefix silently isn't covered. Treat the matcher list as something that needs updating whenever new top-level route segments are added, and consider a broader matcher plus an internal allowlist check if precision matters more than a slightly wider net.
- **Middleware changes are risky to deploy without staging verification** because a bug here can lock out every user of a protected section at once (fails closed, ironically the "safe" failure mode from a security standpoint, but a full outage from a UX standpoint) - or, worse, fail open and expose a protected route. Always verify both the "denied" and "allowed" paths in a preview deployment before merging a Middleware change.
- **Rollback for a bad Middleware deploy is usually just redeploying the previous version** - Middleware has no persistent state of its own, so there's no data migration concern, which makes it one of the lower-risk things to roll back quickly if a deploy goes wrong.

### Anti-patterns and failure modes

| Anti-pattern | Why it hurts | Fix |
|---|---|---|
| Full JWT verification against a remote auth service inside Middleware | Adds a network round trip to every matched navigation | Verify signature/expiry locally (fast, no network call); do remote/DB-backed checks in the Route Handler/backend |
| Relying on Middleware alone to protect a route | A directly-hit Route Handler or a misconfigured matcher bypasses it entirely | Defense in depth: re-check auth in the Server Component/layout and authoritatively in the backend |
| Storing the access token in `localStorage` for a web app "for simplicity" | Readable by any injected/XSS'd script | `httpOnly` cookie, with a BFF proxy to attach it server-side to backend calls |
| A BFF Route Handler accumulating real business logic over time | Duplicated/drifted logic if a second client (mobile) needs the same behavior later | Push business rules into the shared backend; keep the BFF a thin translation layer |
| Using an absolute, user-controlled URL in a post-login redirect | Open redirect vulnerability | Validate the redirect target is a relative, same-origin path |

### Observability for auth/middleware/APIs

- Log Middleware redirect decisions (denied vs allowed, matched path) at a sampled rate in production - a spike in denied-redirects on a route that shouldn't be seeing many can indicate either a bug (legitimate users being locked out) or a probing attacker.
- Track 401 vs 403 rates on Route Handlers/backend endpoints separately - a sudden spike in 401s often points to a token refresh bug shipped in a recent deploy; a spike in 403s often points to a permissions/role regression.
- Alert on refresh-endpoint error rates specifically - since a broken refresh flow silently logs out every active user over the following minutes-to-hours as their access tokens expire, it's a slow-burning incident that's easy to miss without a dedicated alert.

### Team/scalability practices

- Document the auth flow (token storage, refresh trigger, BFF proxy responsibilities) in one diagram/README that both frontend and backend engineers reference - this is exactly the kind of cross-cutting system that drifts out of sync between teams if only tribal-known.
- Establish a convention for where a new endpoint's logic should live (Next.js Route Handler vs NestJS) as an explicit team guideline, not a case-by-case debate every time - reduces inconsistent architecture as more engineers join.
- Version the contract between the BFF layer and the backend deliberately if they can deploy independently - a backend response-shape change breaking an already-deployed BFF proxy is a real, avoidable class of incident in a multi-service setup.

### Harder senior follow-up Q&A

**Q: Your NestJS backend and Next.js frontend are on different subdomains (api.example.com vs example.com). How does auth actually work end to end, and what changes versus same-origin?**
> "Cookies aren't automatically shared across subdomains unless the cookie's `Domain` attribute is explicitly set to the parent domain (`.example.com`), and `sameSite` needs to allow the cross-subdomain request pattern being used - `lax` still allows top-level navigation but blocks some cross-subdomain fetches depending on the exact flow, so I'd evaluate whether `none` with `secure` is actually needed, understanding that's a wider CSRF surface I'd need to mitigate explicitly. In practice, I often prefer routing browser-to-backend calls through a same-origin Next.js Route Handler proxy specifically to avoid needing cross-subdomain cookie complexity at all - the browser only ever talks to its own origin, and the proxy attaches the token server-side when calling the backend."

**Q: A teammate proposes putting the JWT verification logic directly in Middleware using the same library NestJS uses (`jsonwebtoken`). What's your concern?**
> "The concern isn't that it can't work technically - it's making sure Middleware, which runs on the Edge runtime by default, doesn't end up needing a Node-specific crypto dependency that isn't Edge-compatible, and making sure the *secret* used to verify is consistent between the two services without duplicating a source of truth insecurely. I'd rather centralize the actual signing secret/key management in one place (ideally the backend, with the frontend only doing lightweight signature verification using a shared, securely-distributed key), and keep Middleware's check intentionally coarse - valid signature and not expired - leaving the backend as the authority for anything more nuanced."

**Q: How would you design zero-downtime rotation of the JWT signing secret without logging every user out at once?**
> "Support two active secrets during a rotation window: the backend signs new tokens with the new secret but accepts verification against either the new or the old secret for a bounded grace period (long enough to cover the maximum access token lifetime), then drops the old secret once you're confident nothing still relies on it. Refresh tokens would go through the same pattern on their own (longer) timeline. This avoids a flag-day where every currently-logged-in user is suddenly invalidated."

**Q: A Route Handler is meant to be internal-only (called by a cron job or another service), not by browsers. How do you protect it, given it's still a public URL?**
> "A user session/cookie check doesn't make sense here since there's no browser session. I'd protect it with a separate mechanism - a shared secret in a header, or IP allowlisting if the calling infrastructure has stable IPs, or ideally moving genuinely internal-only logic out of a publicly routable Next.js endpoint entirely and into the NestJS backend where it can sit behind the same network boundary as other internal services. A Next.js Route Handler is, by definition, public-facing infrastructure, so anything that shouldn't be internet-reachable at all is a signal it's in the wrong layer."

**Q: Someone reports that after a deploy, logged-in users are randomly getting logged out. How do you investigate?**
> "First I'd check whether the deploy touched anything related to cookies - domain, path, `sameSite`, or secure flag changes can silently invalidate existing sessions for some subset of users/browsers. Second, I'd check the JWT secret/config didn't change or get misconfigured in one environment (a missing env var falling back to a different default value between instances would cause verification to fail intermittently depending on which instance handles the request). Third, I'd check if a refresh-token rotation or reuse-detection bug is over-aggressively revoking sessions - that would look exactly like 'random' logouts correlated with users who happened to trigger a refresh around the deploy."

---
