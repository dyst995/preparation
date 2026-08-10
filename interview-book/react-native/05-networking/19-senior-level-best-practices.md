# 19. Senior-Level Best Practices

> Source: `interview-prep/react-native/05-networking.md`

### Decision framework: networking choices under real constraints

| Question | Answer points to |
|---|---|
| Does the action move money or is otherwise non-idempotent? | Client-generated idempotency key, no automatic retry, explicit user-driven retry only |
| Is data needed live only while the screen/app is in the foreground? | WebSockets for that session, not push |
| Does the user need to know about an event when the app is backgrounded/killed? | FCM/APNs push, not a socket kept alive artificially in the background |
| Is the dataset large and frequently appended to (feed/transactions)? | Cursor-based pagination with infinite queries, not offset/limit |
| Does the response rarely change between polls (static config, reference data)? | ETags/conditional requests + a long React Query `staleTime` |
| Is the call a GET with no side effects? | Safe to retry with backoff | 
| Is it a POST/PUT with side effects and no idempotency key support from backend? | Push to add idempotency key support before relying on any retry, including React Query defaults |

### Production checklist (networking, ship-ready)

- [ ] A single-flight refresh mechanism exists for token refresh - concurrent 401s share one refresh promise, never trigger N parallel refreshes
- [ ] Every money-moving mutation has a client-generated idempotency key tied to the user's specific attempt, and the backend deduplicates by that key
- [ ] React Query mutation retries are explicitly configured (usually 0 for writes) rather than left at defaults meant for reads
- [ ] Refresh tokens and access tokens live in secure storage (Keychain/Keystore-backed), never AsyncStorage or plain persisted state
- [ ] Correlation/request IDs are attached to every request and surfaced in error messages/support tooling, so a user's "it failed" ticket can be traced to a specific backend log line
- [ ] Certificate pinning tradeoffs have been discussed and a rotation/break-glass plan exists (pinning without a rotation plan turns a cert renewal into an outage)
- [ ] Offline behavior is a deliberate product decision per action (browse cached data OK, initiate a payment offline is blocked or explicitly queued with clear UX) - not an accidental crash or silent failure

### Anti-patterns seniors reject in code review

- **Automatic retry on all POST requests "for reliability."** Without idempotency keys, this risks duplicate financial transactions - one of the most damaging classes of bug in a fintech app.
- **Refresh-token race conditions left unhandled** - N parallel 401s trigger N parallel refresh calls, corrupting the token state or logging the user out incorrectly.
- **Passing tokens or PII in query strings** - they end up in server access logs, browser history (for web views), and crash/analytics breadcrumbs.
- **"We'll just websocket everything"** - using a persistent connection for data that's naturally request/response or infrequent wastes battery and adds a whole new failure/reconnection surface for no product benefit.
- **Treating React Query cache and HTTP cache (ETags) as the same concern** - conflating them leads to confused invalidation logic; they solve different layers (app memory vs transport).
- **Silently swallowing network errors into a generic "something went wrong"** with no correlation ID - makes production support nearly impossible; every fintech support ticket needs a traceable request.

### Failure modes & how seniors debug them

| Symptom | Likely root cause | Diagnose with | Fix |
|---|---|---|---|
| User reports a transfer happened twice | Missing idempotency key, or a naive automatic retry on a POST | Backend logs for duplicate requests within a short window, same user/amount | Add/verify client idempotency key, disable automatic retry on write mutations |
| User gets logged out randomly under poor network conditions | Refresh race: a 401 from a flaky request triggers logout without waiting for a possibly-successful refresh in flight | Reproduce with throttled network + multiple concurrent authenticated calls | Implement single-flight refresh with a shared promise/mutex |
| Screen shows stale data that doesn't match what a colleague sees seconds later | `staleTime` too long for that data's freshness requirement, or a missed invalidation after a related mutation | Check the query's `staleTime` and whether the mutation calls `invalidateQueries` | Tune `staleTime` per data type, add the missing invalidation |
| App uses excessive data/battery on a poor connection | Aggressive polling or a websocket reconnect loop with no backoff | Network inspector / native network usage stats over a session | Add exponential backoff to reconnects, prefer ETags/conditional requests over polling |
| Certificate pinning update causes a full outage after a backend cert rotation | No coordinated pin-rotation process between mobile release cadence and backend cert renewal | Correlate outage start with the cert renewal date | Establish a pin-rotation runbook with overlap windows (old + new pin both valid before rotation) |

### Observability / metrics to watch

- **401/refresh rate and refresh success rate** - a rising refresh-failure rate often precedes a wave of "randomly logged out" tickets.
- **P50/P95/P99 latency per critical endpoint** (login, balance, transfer) - segmented by network type (wifi/cellular) and region if available.
- **Retry count and duplicate-request rate** on write endpoints - should be near zero; any nonzero baseline needs investigating.
- **Correlation-ID coverage** - percentage of client errors that actually have a traceable request ID reaching support/logs.
- **Certificate pin failure rate** post-deploy - an early warning for a botched pin rotation before it becomes a full outage.
- **Offline-state duration and action-blocked counts** - tells you whether your offline UX decisions match real usage patterns.

### Scalability & team practices

- **The HTTP client, interceptors, and refresh logic live in one shared module**, code-reviewed with the same rigor as auth code - every feature team consumes it, nobody hand-rolls their own axios instance.
- **Idempotency key generation is a shared utility**, not something each feature reinvents slightly differently for each payment-adjacent mutation.
- **Query key factories per feature** are a required pattern (see `03-state-management.md`) so invalidation after network mutations is consistent team-wide.
- **API versioning and min-app-version enforcement policy is documented and owned jointly with backend** - mobile releases lag deploys, so backwards-compatible, additive API changes are the default contract, and breaking changes require an explicit coordinated rollout.
- **A "network failure mid-payment" playbook is written down and rehearsed** - status-check-before-retry, not blind resubmission - so support and engineering respond consistently to the highest-stakes failure mode in the app.

### Tradeoffs table

| Choice | Pro | Con |
|---|---|---|
| Cursor-based pagination | Stable under concurrent inserts, great for infinite scroll | Can't jump to an arbitrary page number; slightly more backend complexity |
| Certificate pinning | Strong protection against MITM/rogue CAs | Operationally risky without a rotation plan; can brick connectivity on cert renewal if mismanaged |
| WebSockets for live updates | Instant, bi-directional, great in-session UX | Battery/connection overhead, reconnection complexity, not reliable when backgrounded/killed |
| Idempotency keys for payments | Prevents duplicate financial transactions definitively | Requires backend support and careful key lifecycle (generation, expiry) |
| Long `staleTime` for static/reference data | Fewer redundant requests, better perceived speed | Risk of showing outdated config if invalidation is forgotten after a rare update |

### Harder follow-up interview questions (with model answers)

**Q: A user says a payment failed on their end, but the backend shows it succeeded. How do you design the client to prevent this class of confusion?**

> "The client should never treat 'request timed out' as equivalent to 'request failed' for a payment. On any ambiguous network outcome, instead of retrying the mutation, I query a status/idempotency-key lookup endpoint to get the authoritative outcome before showing anything to the user or allowing another attempt. This turns 'did it work?' from a guess into a definite answer, and it's the same idempotency key the original attempt used, so the backend can tell me exactly what happened to that specific attempt."

**Q: How do you handle certificate pinning across a mobile release cadence that's slower than your backend's cert rotation cadence?**

> "I pin to a set that includes the current and the next planned certificate (or pin to an intermediate/CA level with a longer validity window, if pinning to leaf certs is too brittle for the release cadence), and I coordinate with backend/infra on a rotation calendar so a new pin ships in an app release well before the old certificate expires, with overlap. I also keep a kill-switch/remote-config fallback to loosen pinning in a genuine emergency, because an outage from a botched pin rotation is worse than the marginal security loss of a short unpinned window."

**Q: Why might you choose NOT to add automatic retries to your React Query setup for mutations, even though it's easy to enable?**

> "Because 'easy to enable' and 'safe to enable' are different questions for writes. GETs are naturally safe to retry since they don't change state. Mutations often aren't idempotent unless the backend explicitly supports it, so blind automatic retries risk duplicate side effects - duplicate transfers, duplicate account creations. I'd rather have a mutation fail visibly and let the user retry deliberately (or automate retry only where the backend guarantees idempotency) than silently double-submit."

**Q: How would you design the API contract and client behavior for an app that must work acceptably on 2G/3G in some markets?**

> "I'd minimize payload size aggressively (avoid over-fetching, use field selection or dedicated lightweight endpoints for list views), lean hard on ETags/conditional requests so unchanged data costs almost nothing to 'refresh,' set realistic timeouts instead of leaving default long ones that leave the UI hanging, and design the UI to show cached/last-known data immediately while a background refresh happens, rather than blocking on the network for every screen transition."

**Q: Your API team wants to introduce a breaking change to a response shape used across many screens. How do you handle this as the mobile lead?**

> "I'd push for an additive, versioned rollout instead - a new field or a new endpoint version alongside the old one - specifically because mobile clients can't force-update instantly the way a web deploy can. I'd also want minimum-supported-app-version enforcement on the backend so once the breaking change truly needs to land, users on unsupported old versions are prompted to update rather than silently breaking in production."

### What I'd say in a staff/senior interview

> "In fintech networking code, I treat every write request as a potential financial event, which changes the calculus completely compared to a typical CRUD app - retries, timeouts, and caching all need to be re-derived from 'what happens if this request is duplicated or lost,' not just 'what's convenient with React Query defaults.' The token refresh race condition is a good example: it looks like a small edge case, but under real mobile network conditions with several screens firing parallel requests, it happens constantly, and getting it wrong either logs users out randomly or corrupts their session. I design for the failure case first - idempotency keys, single-flight refresh, status-check-before-retry - and the happy path falls out of that naturally, which is the opposite order most junior implementations approach it in."

---
