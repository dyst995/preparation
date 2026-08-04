# 05 — Networking & Data

> Goal: Design reliable mobile networking: auth headers, refresh races, caching, pagination, realtime, and offline-tolerant UX — with fintech-grade caution.

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

> “I attach access tokens in a request interceptor. On 401, a shared refresh flow runs once; concurrent callers await the same promise. If refresh succeeds, failed requests retry with the new token. If refresh fails, I clear session and force re-auth. Refresh tokens live in secure storage, not AsyncStorage.”

---

## 4. React Query as the data layer

(See also `03-state-management.md` — here focus on networking interplay.)

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

> “I prefer cursor-based pagination with React Query infinite queries. It behaves better as new transactions arrive. Each page key includes account id and cursors. I keep row rendering light and cache pages carefully.”

---

## 6. HTTP caching & ETags (you used this)

### Topics to learn
- [ ] `ETag` / `If-None-Match`
- [ ] `304 Not Modified`
- [ ] Cache-Control basics
- [ ] When ETags help mobile performance
- [ ] Difference between HTTP cache and React Query cache

### Why ETags matter on mobile

If content hasn’t changed, server returns 304 and the client avoids transferring the full payload. That improves:
- network usage
- battery
- perceived refetch speed
- server load

### Interview story (MyCreditInfo)

> “We improved network performance with HTTP caching and ETags alongside lazy loading. React Query handled in-memory app cache, while ETags reduced payloads on revalidation when data hadn’t changed.”

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

> “Retries are not free. I retry transient GETs carefully. For payments I rely on idempotency keys and explicit user-driven retries, not blind automatic POSTs.”

---

## 9. Offline & flaky network UX

### Topics to learn
- [ ] Detecting offline state
- [ ] Queueing non-critical actions vs blocking critical ones
- [ ] Showing cached data with stale indicators
- [ ] What must never be silently queued (payments) without clear UX
- [ ] Conflict resolution awareness

### Practical product stance

- Browse cached transactions offline: usually OK with clear “offline” indicator
- Initiate money movement offline: usually block or require explicit “will send when online” design with care

---

## 10. File uploads / downloads

### Topics to learn
- [ ] Multipart uploads
- [ ] Progress indicators
- [ ] Large file pitfalls on mobile
- [ ] Resume strategies (high level)
- [ ] Downloading to device storage permissions

### Interview points

- Don’t hold giant base64 in JS memory if avoidable
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

> “WebSockets give live in-app updates; push notifications wake or inform users when they’re not actively connected. For delivery tracking I’d use sockets during an active session and FCM for out-of-app updates. I wouldn’t replace push with sockets.”

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
- [ ] React Query’s automatic cancelation behaviors
- [ ] Avoid setState after unmount (less common with modern RQ, still conceptual)
- [ ] Dropping stale responses when a newer query key is active

### Interview question

**Q: How do you cancel requests when a screen unmounts?**

> “I rely on React Query/AbortController integration for query cancelation, and I make sure mutations don’t leave dangling UI updates. For manual requests, I pass an abort signal tied to the component lifecycle.”

---

## Interview question bank

1. How do you attach and refresh JWTs on mobile?
2. How do you prevent refresh-token stampedes?
3. Offset vs cursor pagination — which for transactions?
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

> “UI is pending with an idempotency key. I do not let the user spam duplicate submits. I re-check transfer status with the server (status endpoint) instead of blindly posting again. Then I show success/failure based on authoritative status.”

### API versioning on mobile

> “Mobile clients lag behind backend deploys. I prefer additive changes, negotiated versioning, and backwards-compatible responses. Breaking changes require coordinated app release and min-version enforcement.”

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
- “We’ll just websocket everything”
- Passing tokens in query strings

---

## Tie to your CV

- Clean House: WebSockets + FCM for delivery updates
- MyCreditInfo: ETags + HTTP caching + performance work
- EasyPay: secure backend APIs, transfers, wallet operations
- VetApp (backend understanding): JWT/RBAC awareness improves client networking answers

---

## Mastery checklist

- [ ] I can whiteboard JWT refresh without races
- [ ] I can design cursor pagination for mobile
- [ ] I can explain ETag conditional requests clearly
- [ ] I can choose realtime tech with product reasoning
- [ ] I can describe payment network failure UX safely
