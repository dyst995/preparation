# 05 � Networking & Data

> Goal: Design reliable mobile networking: auth headers, refresh races, caching, pagination, realtime, and offline-tolerant UX � with fintech-grade caution.

---

## Learning objectives

1. Build an HTTP client with interceptors for auth and errors.
2. Solve token refresh race conditions correctly.
3. Design pagination (offset vs cursor) for mobile lists.
4. Explain ETags/HTTP caching and when you used them.
5. Choose WebSockets vs push notifications appropriately.
6. Handle flaky networks, retries, and idempotency.
7. Model API errors for consistent UI.
8. Discuss certificate pinning and transport security at interview level.

---

## 1. Mobile networking constraints

Unlike many web apps, mobile clients must assume:

- Intermittent connectivity
- App backgrounding mid-request
- Duplicate taps / double submits
- Expensive radios (batch where sensible)
- Users on poor networks
- OS killing background work

Your answers should show you design for this reality.

---

## 2. HTTP client architecture

### Topics to learn

- [ ] Axios vs fetch wrappers
- [ ] Base URL by environment
- [ ] Request interceptors (attach access token)
- [ ] Response interceptors (401 handling, normalization)
- [ ] Timeouts
- [ ] Request IDs / correlation IDs for support/debugging
- [ ] Cancelation (`AbortController`) when screens unmount

### Recommended layers

```text
UI / hooks (React Query)
  ? api functions (feature level)
    ? http client (shared)
      ? transport (axios/fetch)
```

Keep token logic out of screens.

---

## 3. JWT access + refresh (critical interview topic)

### Topics to learn

- [ ] Short-lived access tokens
- [ ] Longer-lived refresh tokens in secure storage
- [ ] Single-flight refresh (mutex/queue)
- [ ] Retry original requests after refresh
- [ ] Forced logout on refresh failure
- [ ] Avoid infinite 401 loops

### The race condition

Many parallel API calls get 401 simultaneously. Naive code refreshes N times and overwrites tokens chaotically.

### Correct approach (conceptual)

1. First 401 triggers refresh
2. Later 401s wait on the same refresh promise
3. On success: update token, retry queued requests
4. On failure: logout and reject all

### Interview answer

> �I attach access tokens in a request interceptor. On 401, a shared refresh flow runs once; concurrent callers await the same promise. If refresh succeeds, failed requests retry with the new token. If refresh fails, I clear session and force re-auth. Refresh tokens live in secure storage, not AsyncStorage.�

---

## 4. React Query as the data layer

(See also `03-state-management.md` � here focus on networking interplay.)

### Topics to learn

- [ ] Query keys include params that affect response
- [ ] Retries: count + exponential backoff awareness
- [ ] Network-mode / online manager basics
- [ ] Invalidating related resources after writes
- [ ] Prefetching for perceived performance

### Example: after transfer mutation invalidate

- balances
- transactions list
- possibly receipt/details query

---

## 5. Pagination

### Offset/limit

```text
GET /transactions?offset=40&limit=20
```

**Pros:** simple  
**Cons:** can skip/duplicate items if new rows are inserted while scrolling

### Cursor/keyset

```text
GET /transactions?cursor=eyJpZCI6MTIzfQ&limit=20
```

**Pros:** stable for infinite scroll, better for changing datasets  
**Cons:** slightly more backend complexity; hard to jump to arbitrary page numbers

### Mobile preference

For feeds/transactions: **cursor + infinite query** is usually best.

### Interview question

**Q: How do you paginate a transactions list?**

> �I prefer cursor-based pagination with React Query infinite queries. It behaves better as new transactions arrive. Each page key includes account id and cursors. I keep row rendering light and cache pages carefully.�

---

## 6. HTTP caching & ETags (you used this)

### Topics to learn

- [ ] `ETag` / `If-None-Match`
- [ ] `304 Not Modified`
- [ ] Cache-Control basics
- [ ] When ETags help mobile performance
- [ ] Difference between HTTP cache and React Query cache

### Why ETags matter on mobile

If content hasn�t changed, server returns 304 and the client avoids transferring the full payload. That improves:

- network usage
- battery
- perceived refetch speed
- server load

### Interview story (MyCreditInfo)

> �We improved network performance with HTTP caching and ETags alongside lazy loading. React Query handled in-memory app cache, while ETags reduced payloads on revalidation when data hadn�t changed.�

Be ready to distinguish:

- **React Query cache** = app-memory (and optional persistence) strategy
- **HTTP ETag validation** = conditional requests at transport layer

---

## 7. Error modeling

### Topics to learn

- [ ] Normalize errors into a single app error type
- [ ] Distinguish: network down, timeout, 4xx, 5xx, validation
- [ ] Field-level validation errors vs global errors
- [ ] User-safe messages vs internal diagnostic details
- [ ] Mapping 401/403/409/422 specifically

### Suggested shape

```text
AppError {
  code: 'NETWORK' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'VALIDATION' | 'CONFLICT' | 'SERVER' | 'UNKNOWN'
  message: string          // user-facing
  details?: unknown        // field errors, etc
  correlationId?: string
  retriable: boolean
}
```

### UI mapping

- NETWORK ? offline banner / retry
- VALIDATION ? inline field errors
- UNAUTHORIZED ? session reset
- CONFLICT ? explain business conflict (e.g. already submitted)
- SERVER ? generic retry + support code

---

## 8. Retries, timeouts, idempotency

### Retries

- Safe on idempotent GETs
- Dangerous on non-idempotent POSTs unless server supports idempotency keys
- React Query retries should be configured thoughtfully for mutations (often 0)

### Idempotency for fintech

For transfers/payments:

- Client generates idempotency key per user intent
- Server deduplicates by key
- UI disables submit and ties key to the attempt

### Interview answer

> �Retries are not free. I retry transient GETs carefully. For payments I rely on idempotency keys and explicit user-driven retries, not blind automatic POSTs.�

---

## 9. Offline & flaky network UX

### Topics to learn

- [ ] Detecting offline state
- [ ] Queueing non-critical actions vs blocking critical ones
- [ ] Showing cached data with stale indicators
- [ ] What must never be silently queued (payments) without clear UX
- [ ] Conflict resolution awareness

### Practical product stance

- Browse cached transactions offline: usually OK with clear �offline� indicator
- Initiate money movement offline: usually block or require explicit �will send when online� design with care

---

## 10. File uploads / downloads

### Topics to learn

- [ ] Multipart uploads
- [ ] Progress indicators
- [ ] Large file pitfalls on mobile
- [ ] Resume strategies (high level)
- [ ] Downloading to device storage permissions

### Interview points

- Don�t hold giant base64 in JS memory if avoidable
- Cancel uploads on unmount when appropriate
- Surface progress and failure clearly

---

## 11. Realtime: WebSockets vs push (FCM)

### WebSockets / Socket.IO

Best for:

- Active session realtime (delivery status while app open)
- Collaborative / live dashboards
- Bi-directional messaging while connected

### FCM push

Best for:

- Notifying users when app is backgrounded/killed
- Event alerts (payment received, delivery update)
- Re-engagement / actionable taps into screens

### Often used together

Example from Clean House:

- WebSockets for live updates while using the app
- FCM for updates when not in foreground

### Interview answer

> �WebSockets give live in-app updates; push notifications wake or inform users when they�re not actively connected. For delivery tracking I�d use sockets during an active session and FCM for out-of-app updates. I wouldn�t replace push with sockets.�

---

## 12. Security at the network edge (overview)

### Topics to learn

- [ ] TLS everywhere
- [ ] Certificate pinning tradeoffs (security vs ops breakage)
- [ ] No secrets in the bundle
- [ ] Minimal PII in logs
- [ ] Request signing / additional layers when backend requires

Deep dive lives in `13-security.md`; know enough here to connect transport to API design.

---

## 13. Cancelation & screen lifecycle

### Topics to learn

- [ ] AbortController with fetch/axios
- [ ] React Query�s automatic cancelation behaviors
- [ ] Avoid setState after unmount (less common with modern RQ, still conceptual)
- [ ] Dropping stale responses when a newer query key is active

### Interview question

**Q: How do you cancel requests when a screen unmounts?**

> �I rely on React Query/AbortController integration for query cancelation, and I make sure mutations don�t leave dangling UI updates. For manual requests, I pass an abort signal tied to the component lifecycle.�

---

## Interview question bank

1. How do you attach and refresh JWTs on mobile?
2. How do you prevent refresh-token stampedes?
3. Offset vs cursor pagination � which for transactions?
4. What are ETags and how do they help?
5. React Query cache vs HTTP cache?
6. When WebSockets vs FCM?
7. How do you model API errors for UI?
8. Should mutations auto-retry?
9. How do you design idempotent payments from the client?
10. What do you do when the network drops mid-transfer request?
11. How do you secure tokens in transit and at rest? (bridge to security section)
12. How do you version APIs and handle breaking changes on mobile?

---

## Model answers

### Network drop mid-transfer

> �UI is pending with an idempotency key. I do not let the user spam duplicate submits. I re-check transfer status with the server (status endpoint) instead of blindly posting again. Then I show success/failure based on authoritative status.�

### API versioning on mobile

> �Mobile clients lag behind backend deploys. I prefer additive changes, negotiated versioning, and backwards-compatible responses. Breaking changes require coordinated app release and min-version enforcement.�

---

## Hands-on drills

- [ ] Write a sequence diagram for 401 ? refresh ? retry under concurrency.
- [ ] Design transaction infinite pagination keys and API contract.
- [ ] Explain MyCreditInfo ETag improvement in 60 seconds.
- [ ] Decide socket vs push for: chat, payment received, live courier map, marketing blast.
- [ ] Draft an `AppError` mapper from sample HTTP failures.

---

## Green flags / red flags

**Green**

- Single-flight refresh
- Idempotency for payments
- Clear offline product decisions
- Distinguishes transport cache vs app cache

**Red**

- Refresh token in AsyncStorage + no race handling
- Automatic retry on all POSTs
- �We�ll just websocket everything�
- Passing tokens in query strings

---

## Tie to your CV

- Clean House: WebSockets + FCM for delivery updates
- MyCreditInfo: ETags + HTTP caching + performance work
- EasyPay: secure backend APIs, transfers, wallet operations
- VetApp (backend understanding): JWT/RBAC awareness improves client networking answers

---

## Senior-Level Best Practices

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

## Mastery checklist

- [ ] I can whiteboard JWT refresh without races
- [ ] I can design cursor pagination for mobile
- [ ] I can explain ETag conditional requests clearly
- [ ] I can choose realtime tech with product reasoning
- [ ] I can describe payment network failure UX safely
