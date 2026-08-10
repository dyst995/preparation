# 11. Senior-Level Best Practices

> Source: `interview-prep/nestjs/03-auth-jwt-rbac.md`

### Auth threat model - walk it systematically, not ad hoc

A senior-level auth answer names the actual threats and the specific mitigation for each, in a structured way (a lightweight STRIDE-style pass), rather than describing the happy-path flow and stopping:

| Threat category | Concrete example in this system | Mitigation |
|---|---|---|
| **Spoofing** identity | Attacker forges a JWT or steals credentials | Strong signing (HS256/RS256 with a properly protected secret/key), bcrypt/argon2 password hashing, rate-limited login |
| **Tampering** with tokens/requests | Attacker modifies a JWT payload (role, user id) | Signature verification rejects any tampering; never trust claims without verifying the signature server-side on every request |
| **Repudiation** (denying an action happened) | A user disputes making a request | Audit logging of sensitive actions (who, what, when) tied to the authenticated user id, not just IP |
| **Information disclosure** | JWT payload readable by anyone (it's signed, not encrypted); verbose error messages reveal whether an email exists | Never put secrets in JWT claims; generic "invalid credentials" errors regardless of failure reason |
| **Denial of service** | Repeated login attempts exhaust bcrypt's deliberately-slow hashing, or a public refresh endpoint gets hammered | Rate limiting (`@nestjs/throttler`), account lockout after N failed attempts, separate rate limits for auth endpoints vs general API |
| **Elevation of privilege** | A demoted/deactivated user's still-valid access token keeps working; RBAC checked but ownership isn't | Short access token lifetime bounds the privilege-escalation window; explicit ownership checks in the service layer alongside RBAC |

Walking through a threat model like this - even briefly - is a much stronger signal than reciting "we use JWT with bcrypt" and stopping.

### Decision framework: how paranoid should this specific auth decision be

Not every endpoint or every project needs the same level of defense - calibrate deliberately:

1. **What's actually at risk if this is compromised?** VetApp's medical records and payment data justify strict RBAC, ownership checks, and short token lifetimes. A read-only public listing endpoint doesn't need the same ceremony.
2. **Who are the realistic attackers?** An internal admin tool behind a VPN has a very different threat model than a public-facing API accepting anonymous signups - calibrate rate limiting, CAPTCHA, and monitoring accordingly.
3. **What's the cost of a false positive (locking out a legitimate user) vs a false negative (letting an attacker through)?** Aggressive lockout policies reduce brute-force risk but increase legitimate-user friction and support burden - this is a real product tradeoff, not just a security checkbox.
4. **Is this a one-off decision or a pattern that will be copied?** The first guard/RBAC pattern in a codebase becomes the template every future endpoint copies - get the default posture (deny-by-default, explicit opt-out) right early, because fixing it later means auditing every endpoint that copied the wrong pattern.

### Production checklist for an auth system

- [ ] Deny-by-default global guard with an explicit `@Public()` opt-out - a forgotten annotation fails safe (401), not open.
- [ ] Access tokens short-lived (minutes), refresh tokens tracked server-side, hashed at rest, with rotation and reuse detection.
- [ ] Passwords hashed with bcrypt/argon2 with a tuned cost factor - never SHA-256/MD5, never reversible encryption.
- [ ] Generic, timing-consistent error messages on login failure - no user enumeration via "email not found" vs "wrong password."
- [ ] Rate limiting on login, refresh, and password-reset endpoints specifically, separate from general API rate limits.
- [ ] RBAC (role-level) and ownership checks (data-level) both present, and understood as two separate concerns living in different layers (guard vs service).
- [ ] "Logout everywhere" capability exists (invalidate all refresh tokens for a user) - needed for a compromised-account response, not just a nice-to-have.
- [ ] Sensitive role changes (promotion/demotion/deactivation) invalidate existing refresh tokens immediately, not just future logins.
- [ ] No secrets (JWT signing keys, DB credentials) committed to source control; rotation procedure documented and tested at least once, not just theoretical.
- [ ] Audit log for sensitive actions (role changes, payment operations, data exports) tied to an authenticated identity.

### Anti-patterns and failure modes

| Anti-pattern | Why it hurts | Fix |
|---|---|---|
| Trusting a role claim in an old JWT without a short expiry | Demoted/deactivated user keeps elevated access until natural token expiry | Short access token lifetime; revoke refresh tokens immediately on sensitive role changes |
| RBAC guard alone, no ownership check | "Vet can edit appointments" incorrectly allows editing *any* vet's appointments | Explicit ownership check in the service layer, next to the resource fetch |
| Different error messages for "user not found" vs "wrong password" | Enables user enumeration attacks | One generic message, consistent timing, regardless of failure reason |
| Storing refresh tokens in plaintext in the database | A DB leak hands out valid sessions for every user | Hash refresh tokens like passwords before storing |
| No reuse detection on refresh token rotation | A stolen-and-used refresh token isn't detected as theft | Detect old-token reuse after rotation; revoke all sessions for that user on mismatch |
| Global rate limiter only, no per-account lockout | An attacker can distribute a brute-force attempt across IPs/accounts to stay under a global limit | Combine global rate limiting with per-account failed-attempt tracking |
| Verbose 500 errors on auth failures in production | Leaks stack traces, library versions, sometimes internal identifiers | Global exception filter sanitizes all outbound error responses |

### Observability for auth systems

- **Failed login rate per account and per IP**, alerting on spikes - the earliest signal of a credential-stuffing or brute-force attempt, often visible well before any single account is actually compromised.
- **Refresh token reuse-detection events logged and alerted on individually** - each one is a real (if often low-confidence) signal of token theft and deserves a look, not just silent automatic revocation.
- **Token refresh failure rate as a first-class metric** - a spike here silently logs out a growing fraction of active users over the following minutes to hours and is easy to miss without a dedicated alert, since each individual failure looks unremarkable.
- **RBAC/403 denial rate per endpoint** - an unexpected spike can indicate either a legitimate permissions bug (a role's allowed actions changed unintentionally in a deploy) or reconnaissance activity probing for accessible endpoints.
- **Audit trail for privilege changes** (who promoted/demoted whom, when) - both a security control and, practically, the first thing you need when investigating "why does this user have admin access."

### Team/scalability practices

- Document the RBAC role/permission matrix in one place both engineers and product/support can reference - "what can a receptionist actually do" should never require reading guard code to answer.
- Treat any change to the global auth guard, the RBAC guard, or the JWT strategy as requiring extra review scrutiny regardless of how small the diff looks - this is the highest-blast-radius code in the application, and a subtle bug here (an inverted condition, a missing `await`) can silently disable security checks for everyone.
- As the system adds more nuanced authorization needs (per-clinic tenancy, fine-grained permissions beyond three roles), plan the migration from pure RBAC to permission-based or attribute-based access control deliberately, rather than bolting ad-hoc special cases onto the existing `RolesGuard` one at a time until it's unreadable.

### Harder senior follow-up Q&A

**Q: An attacker gets read access to your database (but not your JWT signing secret). What can they actually do, and what can't they do, with what they find?**
> "They can read hashed passwords and hashed refresh tokens, but bcrypt/argon2 hashes aren't reversible, so they can't directly log in as anyone without additionally brute-forcing individual hashes, which is exactly what the cost factor is designed to make impractical at scale. They cannot forge new valid JWTs, because that requires the signing secret/private key, which - if I've done this right - isn't in the same database at all (ideally in a secrets manager, not a DB table). The real risk is any already-issued, still-valid access tokens continuing to work until natural expiry, and any refresh tokens they can crack the hash for before I rotate/revoke - which is exactly why short access token lifetimes and prompt incident response (force-revoke all refresh tokens) matter even when the core secret wasn't compromised."

**Q: How would you detect that an attacker is using a legitimately-issued but stolen access token, as opposed to a normal user?**
> "Stateless JWT verification alone can't distinguish this - the token is valid until it expires, full stop. Detection has to come from behavioral/contextual signals layered on top: a sudden IP/geolocation change mid-session, a device fingerprint mismatch, unusual request patterns (accessing many other users' resources in RBAC-permitted but atypical ways), or a burst of activity inconsistent with the account's normal usage. None of these are perfect signals individually, which is part of why short access token lifetimes matter - they bound how long a stolen token stays useful even if detection is imperfect or delayed."

**Q: Your RBAC model has three roles today. Product now wants 'a vet who's also a part-time receptionist at a different clinic' - how does your design need to change?**
> "That breaks the assumption baked into a single `user.role` field - I'd need to move toward either multiple roles per user (with union or most-permissive-wins semantics defined explicitly) or a proper permission-based model where roles are just named bundles of permissions, and a user can hold more than one bundle. I'd also need to introduce the clinic-scoping dimension explicitly, since 'vet at clinic A, receptionist at clinic B' means authorization now depends on role *and* which clinic the resource belongs to - RBAC alone was never going to express that; it needs to become RBAC plus tenant scoping as two composed checks."

**Q: Someone on your team wants to skip refresh token rotation because 'it adds complexity and we've never had an incident.' How do you respond?**
> "I'd frame it as bounding blast radius, not preventing a hypothetical - rotation with reuse detection means a stolen refresh token is useful for at most one silent use before it's detectable, versus being valid and usable for its entire multi-day/week lifetime otherwise. 'We've never had an incident' is survivorship bias for something that, by design, wouldn't necessarily be visible without the detection mechanism in place to notice it. That said, I'd weigh the actual complexity cost against the project's risk profile - for a low-stakes internal tool, simpler token handling might genuinely be an acceptable tradeoff; for something handling payments or medical records like VetApp, I wouldn't skip it."

**Q: How do you handle authorization for a background job (e.g., a cron reconciliation job) that needs to perform actions normally gated by user-level RBAC, but has no logged-in user?**
> "I don't reuse the user-facing RBAC guard at all for this - a background job runs as the system itself, not as any particular user, so I give it its own explicit, narrowly-scoped service-level permission (sometimes modeled as a dedicated 'system' principal, sometimes just by calling internal service methods directly that bypass the HTTP-layer guards entirely, since those guards are an HTTP concern). What I don't do is fake a fake JWT or impersonate an admin user to satisfy the normal guard chain - that conflates a legitimate system process with a real user identity and makes auditing and reasoning about 'who did this' much harder later."

---
