# 12. Senior-Level Best Practices

> Source: `interview-prep/nestjs/02-rest-validation-swagger.md`

### Decision framework: API versioning strategy

Versioning is one of those topics where "we'll deal with it when we need it" is a decision that gets more expensive the longer it's deferred. Work through this before the first breaking change is needed, not after:

1. **How many external/uncontrolled consumers exist?** An internal-only API consumed solely by a frontend you also deploy in lockstep can often get away with no formal versioning - deploy both sides together. The moment a mobile app, a third party, or any client with an independent release cycle depends on the API, versioning stops being optional.
2. **URI (`/v1/...`) vs header vs media-type versioning - which fits the consumers?** URI versioning is the pragmatic default: cache/proxy-friendly, trivially explorable/debuggable (you can see the version in any log line or curl command), and what most consumers expect. Header versioning is "more correct" REST purism but harder to debug and easy for a client to get wrong silently (forgetting a header defaults to some version, possibly not the one they meant).
3. **What's the deprecation policy?** Decide and publish it before you need it: how long does `/v1` stay live after `/v2` ships, what's the communication channel to consumers, and what's the actual mechanism (a `Deprecation`/`Sunset` HTTP header, a changelog, direct outreach for known consumers like a mobile app team).
4. **Can this specific change be additive instead of breaking?** Adding an optional field, a new endpoint, or a new enum value is almost never worth a version bump. Removing/renaming a field, changing a field's type or meaning, or changing status code semantics is. Bias hard toward additive changes to avoid needing a version bump at all.

### API versioning in practice

```typescript
app.enableVersioning({
  type: VersioningType.URI,
  defaultVersion: '1',
});

@Controller({ path: 'appointments', version: '1' })
export class AppointmentsControllerV1 { /* ... */ }

@Controller({ path: 'appointments', version: '2' })
export class AppointmentsControllerV2 { /* ... */ }
```

- Keep `v1` and `v2` controllers thin and delegate to a shared service where the underlying logic hasn't actually changed - don't duplicate business logic across version boundaries just because the controller/DTO shape changed. Version the contract, not necessarily the whole implementation.
- A version bump is a good forcing function to also revisit whether old fields/endpoints can finally be removed from the *previous* version once its deprecation window has passed - track this explicitly (a ticket, a changelog entry with a removal date) rather than letting old versions live forever by default.
- For a mobile client specifically (relevant given Clean House/Wizer/EasyPay-style apps in this CV), version compatibility windows need to account for **users who don't update immediately** - app store review delays, users who disable auto-update, users on old OS versions that can't run the latest app build. A backend deprecation timeline should be measured in months for mobile-consumed APIs, not weeks.

### REST/validation anti-patterns beyond the basics

- **Returning 200 with an error payload instead of the correct status code** ("soft errors") - breaks HTTP semantics, breaks generic client error-handling (retry logic, monitoring that keys off status codes), and is a very common legacy-API smell worth calling out and fixing during a rewrite.
- **Validating on the way in but never re-validating business invariants at the point of persistence.** DTO validation catches shape/type errors; it doesn't catch "this would create a double-booking" - that check has to happen in the service, often inside the same transaction as the write, or a race condition slips through.
- **Swagger docs that drift from reality because `@ApiProperty` metadata (example values, descriptions) isn't kept current**, even though the underlying validation shape can't drift (same DTO). Treat inaccurate examples/descriptions as a real bug, not cosmetic - they actively mislead consumers building against the docs.
- **Pagination without a stated upper bound on `limit`.** A client (or an attacker) requesting `?limit=1000000` against an unguarded endpoint is a straightforward, easy-to-miss denial-of-service vector - always clamp/validate `limit` server-side regardless of what the client asks for.
- **Exposing internal error details (stack traces, ORM error messages, SQL fragments) in production error responses** - a classic and severe leak of implementation detail that also often leaks column/table names useful to an attacker.

### Observability for a REST API surface

- **Structured, consistent error logging at the exception filter level** - log the full internal error server-side (stack trace, request context) while returning a sanitized response to the client; without this, production 500s are unstressed guesswork.
- **Per-endpoint latency and status-code-rate dashboards**, not just an aggregate - a single slow or error-prone endpoint can hide in an aggregate p95 that looks fine overall.
- **Track validation failure rates (400s) per endpoint over time** - a sudden spike after a client-side deploy (web or mobile) often indicates a contract mismatch between what the client sends and what the API now expects, especially valuable to catch early in a multi-client setup.
- **Version usage metrics** (how much traffic is still hitting `/v1` vs `/v2`) - the actual data needed to decide when it's safe to sunset an old version, rather than guessing.

### Team/scalability practices

- Maintain a single source of truth for the API contract that both the backend team and any consuming teams (frontend, mobile) can reference - Swagger/OpenAPI generated from the real DTOs, published somewhere accessible, ideally with generated client types consumed by the frontend/mobile codebases so contract drift becomes a compile-time error instead of a runtime surprise.
- Establish a lightweight review gate for anything that changes an existing endpoint's request/response shape - even a "harmless-looking" field rename can break a mobile client that's already in app-store review and can't be hotfixed for days.
- Decide, as a team convention, the default error response shape and status-code-to-error-type mapping once, and enforce it via the global exception filter - inconsistent ad-hoc error shapes across endpoints (some `{error: string}`, others `{message: string}`) is a common, avoidable source of client-side bugs.

### Harder senior follow-up Q&A

**Q: You need to remove a field from an API response that's used by both a web frontend and a mobile app you don't control the release cadence of. Walk through how you'd actually do this safely.**
> "I wouldn't remove it outright. First I'd confirm nothing actually reads it anymore on the side(s) I control (the web frontend), and reach out to whoever owns the mobile client to confirm the same, since I can't grep their codebase directly. I'd stop the field from being *required* or relied upon first - keep sending it, deprecated, for a window long enough to cover slow-to-update mobile users (often months, not weeks, given app store review and users who delay updates), track whether it's still being read via API analytics if that's feasible, and only remove it once I'm confident, or once it's covered by a version bump that mobile has explicitly migrated to."

**Q: How would you design an idempotent `POST /appointments` endpoint so retrying a request due to a network timeout doesn't create a duplicate appointment?**
> "Accept an idempotency key from the client - either generated client-side per attempt or derived deterministically from the request's meaningful content - and store it alongside the created resource. On a retry with the same key, look up whether that key has already been processed and return the original result instead of creating a second resource. This matters a lot for mobile clients specifically, where a request can time out client-side while it actually succeeded server-side, and a naive retry would otherwise double-book."

**Q: A client says your paginated endpoint returns inconsistent results - items appear twice or get skipped between pages - during periods of frequent writes. What's happening and how do you fix it?**
> "That's the classic offset-pagination-under-writes problem: if rows are inserted or deleted between page requests, the same `LIMIT/OFFSET` window can now point at different rows than it did on the previous request, causing skips or duplicates. The fix is cursor-based pagination - paginate by a stable, monotonically ordered value (like `id` or `createdAt` plus `id` as a tiebreaker) rather than a positional offset, so a cursor always points at 'everything after this specific row' regardless of what's been inserted or deleted elsewhere in the set."

**Q: How do you handle a breaking change that only affects one specific client's edge case, not the general contract - is that still a version bump?**
> "Not necessarily. If the change genuinely only affects behavior that one client depends on in a way no other client should reasonably rely on (an undocumented quirk being relied upon), I'd treat that as a bug in the client's assumption, communicate directly with that team, and fix the API to be correct rather than permanently version-locking the whole API around one client's workaround. A version bump is for a deliberate, intentional contract change affecting the general consumer base - not a tool for avoiding an awkward conversation about a client depending on unspecified behavior."

**Q: How would you design a rate limit that's fair across a small number of very active API consumers without punishing everyone else?**
> "Per-key (per API client/user, not just global or per-IP) rate limiting, with limits proportional to the consumer's actual tier/contract rather than one blanket number - a mobile app making many small requests per user session has a different reasonable ceiling than an admin dashboard used by a handful of internal staff. I'd also return the standard `429` with `Retry-After` and rate-limit headers (`X-RateLimit-Remaining`, etc.) so well-behaved clients can back off gracefully instead of hammering the endpoint on every rejection."

### Quick reference: status code and layer decisions

| Situation | Status code | Layer that decides |
|---|---|---|
| No token / expired token | 401 | Guard |
| Valid token, wrong role/ownership | 403 (or 404 to hide existence, context-dependent) | Guard (role) / Service (ownership) |
| Malformed request body | 400 | Pipe (`ValidationPipe`) |
| Resource doesn't exist | 404 | Service / Controller |
| Unique constraint violation | 409 | Exception filter mapping a DB error |
| Rate limit exceeded | 429 | Guard (`ThrottlerGuard`) |
| Unhandled exception | 500 | Global exception filter (sanitized) |

---
