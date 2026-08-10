# 07. Full interview question bank (rapid fire)

> Source: `interview-prep/nestjs/03-auth-jwt-rbac.md`

1. **What's actually inside a JWT, and is it encrypted?** -> header/payload/signature, base64url, not encrypted.
2. **Why access + refresh tokens instead of one token?** -> blast radius vs UX trade-off; only refresh is revocable.
3. **What does `validate()` do in a Passport strategy?** -> shapes `request.user` after crypto verification already happened.
4. **How do you protect a route with both auth and RBAC?** -> `@UseGuards(JwtAuthGuard, RolesGuard)` with `@Roles()`, correct order.
5. **RBAC vs ownership checks - where does each live?** -> guard for role; service for data-dependent ownership.
6. **How do you revoke a stolen refresh token?** -> hashed storage + rotation + reuse detection -> revoke all on mismatch.
7. **Why hash refresh tokens like passwords?** -> DB leak shouldn't hand out valid sessions.
8. **Why not SHA-256 for passwords?** -> too fast, no built-in salting, cheap to brute-force at scale.
9. **How do you prevent user enumeration on login?** -> generic error message + consistent timing regardless of failure reason.
10. **What's a `@Public()` decorator for, and why deny-by-default globally?** -> fail-safe default; explicit opt-out for unauthenticated routes.
11. **How do you rate-limit login attempts?** -> `@nestjs/throttler` and/or per-account lockout counters.
12. **How would you force-logout a user from all devices?** -> delete/invalidate all stored refresh tokens for that user.

---
