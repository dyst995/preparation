# 03 - Auth: JWT Access/Refresh, Guards, Passport Strategies, RBAC

> Goal: design and defend a full authentication + authorization system end to end - the kind of system you actually built for VetApp - at a depth that survives senior security follow-ups.

Mark progress with `[x]` as you master each topic.

---

## Learning objectives

By the end of this section you should be able to:

1. Explain JWT structure, signing, and why access + refresh tokens exist as a pair.
2. Implement and explain Passport strategies (`local`, `jwt`) inside Nest.
3. Explain guards end to end: `CanActivate`, `ExecutionContext`, custom guards.
4. Design and implement RBAC with custom decorators + a `RolesGuard` (VetApp: admin/vet/receptionist).
5. Design a secure refresh-token rotation and revocation flow.
6. Explain password security at a high level (hashing, salting, rate limiting) without needing to reinvent crypto.
7. Tell a clear, confident VetApp auth/RBAC story for behavioral rounds.

---

## 1. JWT fundamentals

### Topics to learn
- [ ] Structure: header.payload.signature, base64url encoded (NOT encrypted - visible to anyone)
- [ ] Signing algorithms: HMAC (`HS256`, shared secret) vs asymmetric (`RS256`, public/private key pair)
- [ ] Standard claims: `sub`, `iat`, `exp`, `iss`, `aud`
- [ ] Stateless verification - server doesn't need a DB hit to verify signature/expiry
- [ ] Why you still need statefulness for revocation (JWTs can't be "deleted" once issued)
- [ ] Access token vs refresh token: different lifetimes, different purposes, different storage

### JWT is not encryption

A very common interview trap: **JWTs are signed, not encrypted** (unless you specifically use JWE). Anyone can base64-decode the payload and read it. The signature only proves it wasn't tampered with (assuming the secret/key is safe). **Never put secrets (passwords, raw card numbers) in a JWT payload.**

### Access vs refresh token

| | Access token | Refresh token |
|---|---|---|
| Purpose | Authorize API requests | Obtain a new access token |
| Lifetime | Short (5-15 min typical) | Long (days-weeks) |
| Sent on | Every API request (`Authorization: Bearer`) | Only to the refresh endpoint |
| Storage (mobile/web) | Memory / short-lived storage | Secure storage (httpOnly cookie on web, Keychain/Keystore on mobile) |
| Server-side tracking | Usually none (stateless) | Usually tracked (hashed, per-device, revocable) |

**Why two tokens instead of one long-lived token:** a short access token limits the blast radius if it leaks (stolen token is useless in minutes), while a refresh token lets the user stay logged in without re-entering credentials, and *can* be revoked server-side because it's checked against a stored record.

### Interview questions

**Q: Is a JWT secure just because it's signed?**
> "Signing guarantees integrity - the token wasn't tampered with - and authenticity if the secret/key is protected. It says nothing about confidentiality; the payload is plainly readable by anyone with the token. So I never put sensitive data in the payload, I keep expiry short, and I always verify signature *and* expiry server-side on every request rather than trusting client-side decoding."

**Q: Why not just use one long-lived token and skip the refresh flow?**
> "A single long-lived token is either short (bad UX - constant re-login) or long (bad security - a leaked token stays valid for a long time and, being stateless, is very hard to revoke). The access/refresh pair gets both: short-lived, low-risk access tokens for every request, and a longer-lived refresh token that's tracked server-side so it *can* be revoked on logout, password change, or suspected compromise."

---

## 2. Passport strategies in NestJS

### Topics to learn
- [ ] `@nestjs/passport` + `passport-jwt` + `passport-local`
- [ ] `LocalStrategy` for username/password login (validates credentials, returns user)
- [ ] `JwtStrategy` for bearer token verification (validates signature/expiry, returns `req.user`)
- [ ] `ExtractJwt.fromAuthHeaderAsBearerToken()`
- [ ] `validate()` method contract - what you return becomes `request.user`
- [ ] `AuthGuard('jwt')` / `AuthGuard('local')` tying a strategy to a guard
- [ ] Multiple strategies (e.g. separate `jwt-refresh` strategy validating the refresh token specifically)

### LocalStrategy (login step)

```typescript
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: 'email' });
  }

  async validate(email: string, password: string): Promise<AuthUser> {
    const user = await this.authService.validateCredentials(email, password);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    return user; // becomes request.user inside the login route
  }
}
```

### JwtStrategy (protecting routes)

```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    // payload signature+expiry already verified by Passport at this point
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
```

```typescript
@UseGuards(AuthGuard('jwt'))
@Get('me')
getProfile(@CurrentUser() user: AuthUser) {
  return user;
}
```

**Key point interviewers check:** `validate()` in `JwtStrategy` runs *after* Passport has already verified the signature and expiry - it's not re-checking those. Its job is to shape/enrich what becomes `request.user` (and optionally do an extra check, e.g. "is this user still active / not banned").

### Separate refresh strategy

Verifying refresh tokens with their own strategy (different secret, and typically checking against a stored hash in the DB) keeps access and refresh verification cleanly separated - a leaked access-token secret shouldn't be usable to forge refresh tokens and vice versa.

### Interview question

**Q: What's the point of `validate()` if Passport already checked the signature?**
> "Passport's strategy handles cryptographic verification - signature and expiry. `validate()` is where I decide what identity actually gets attached to the request, and it's a natural place to add a cheap extra check, like confirming the user hasn't been deactivated since the token was issued, without hitting the DB on every single field of every request."

---

## 3. Guards

### Topics to learn
- [ ] `CanActivate` interface, returns `boolean | Promise<boolean> | Observable<boolean>`
- [ ] `ExecutionContext` - accessing the request, route handler, and controller class
- [ ] `Reflector` - reading metadata set by custom decorators (`@Roles()`, `@Public()`)
- [ ] Guard execution order: global -> controller -> route-level
- [ ] Composing guards (`@UseGuards(AuthGuard('jwt'), RolesGuard)`)
- [ ] `@Public()` pattern to opt specific routes out of a global auth guard

### Global JWT guard + opt-out pattern

```typescript
// Applied globally via APP_GUARD, so every route requires auth by default
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) { super(); }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context); // delegates to Passport's jwt strategy
  }
}
```

```typescript
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

```typescript
@Public()
@Post('login')
login(@Body() dto: LoginDto) { /* ... */ }
```

Registering "deny by default, opt in to public" as the global posture is a strong senior signal - it means a developer forgetting to guard a new endpoint fails *safe* (401) instead of accidentally shipping an unauthenticated endpoint.

### Interview questions

**Q: Would you rather guard every route explicitly, or deny-by-default globally with opt-outs?**
> "Deny-by-default globally, with an explicit `@Public()` opt-out for the few routes that need it - login, register, health checks. That way a new endpoint someone forgets to annotate is safe by default (returns 401) instead of silently public, which is the failure mode that actually causes security incidents."

**Q: How does a guard read custom metadata like `@Roles('admin')`?**
> "Custom decorators like `@Roles()` just call `SetMetadata(key, value)` under the hood, attaching metadata to the route handler/class. The guard uses `Reflector.getAllAndOverride()` to read that metadata off `context.getHandler()`/`context.getClass()` at runtime and decide whether to allow the request."

---

## 4. RBAC (Role-Based Access Control) - VetApp

### Topics to learn
- [ ] Roles decorator + `RolesGuard` pattern
- [ ] Role hierarchy vs flat roles (admin > vet > receptionist, or fully flat with explicit permission sets)
- [ ] Role-based vs permission-based (fine-grained) access control - trade-offs
- [ ] Combining authentication guard + RBAC guard (order matters: authenticate first, then authorize)
- [ ] Resource ownership checks that RBAC alone can't express (e.g. "a vet can only edit *their own* appointments")
- [ ] Where ownership checks should live: guard vs service layer

### VetApp roles (concrete example to use in interviews)

| Role | Can do |
|---|---|
| `admin` | Full access: manage users/roles, view all clinics' data, financial reports |
| `vet` | View/manage their own appointments and patient records, write medical notes |
| `receptionist` | Schedule/reschedule appointments, manage owner/pet records, cannot access medical notes or payments admin |

### `@Roles()` decorator + `RolesGuard`

```typescript
export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
```

```typescript
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true; // no @Roles() = no restriction beyond auth

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.role === role);
  }
}
```

```typescript
@Roles('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Delete('users/:id')
deleteUser(@Param('id') id: number) { /* ... */ }
```

**Guard ordering matters:** `JwtAuthGuard` must run before `RolesGuard` - you can't authorize a role for a request you haven't authenticated yet. Nest runs guards in the array order given to `@UseGuards()`.

### Ownership checks (RBAC isn't enough alone)

RBAC answers "can this *role* do this *type* of action." It doesn't answer "can *this specific vet* edit *this specific appointment*, which belongs to a different vet." That's an ownership/ABAC-style check, usually done in the service layer (or a dedicated guard reading the route param):

```typescript
async update(id: number, dto: UpdateAppointmentDto, user: AuthUser) {
  const appointment = await this.repo.findOneByOrFail({ id });
  if (user.role === 'vet' && appointment.vetId !== user.id) {
    throw new ForbiddenException('You can only modify your own appointments');
  }
  return this.repo.save({ ...appointment, ...dto });
}
```

### Role-based vs permission-based

| | Role-based (RBAC) | Permission-based |
|---|---|---|
| Model | User has one (or few) roles; role implies a fixed set of allowed actions | User has explicit granular permissions, possibly composed from multiple roles |
| Simplicity | Simple to reason about, easy to implement | More flexible but more moving parts |
| Fits VetApp | Yes - small, well-defined role set (admin/vet/receptionist) | Overkill unless requirements get much more granular |
| When to switch | - | When you need things like "vet A can view but not edit," or per-clinic scoping in a multi-tenant system |

### Interview questions

**Q: Walk me through how you implemented RBAC on VetApp.**
> "I modeled three roles - admin, vet, receptionist - each with a clear set of allowed actions. I built a `@Roles()` decorator using `SetMetadata`, and a `RolesGuard` that reads that metadata via `Reflector` and compares it against the authenticated user's role, which was already attached to the request by a preceding JWT auth guard. For anything RBAC alone couldn't express - like a vet only editing their own patients' records - I added an explicit ownership check in the service layer, because that's data-dependent, not just role-dependent."

**Q: Why put the ownership check in the service instead of the guard?**
> "The guard has cheap access to route params and the authenticated user, but checking 'does this appointment belong to this vet' usually requires a DB lookup of the resource itself - which the service is about to do anyway to perform the action. Duplicating that lookup in a guard means either two DB round-trips or awkward request-object caching between guard and service. I keep RBAC (role-level) in the guard, and ownership (data-level) in the service, right where the resource is already being fetched."

**Q: What's the security risk of trusting a role claim baked into an old JWT?**
> "If a user's role changes (promoted, demoted, deactivated) mid-token-lifetime, a stateless JWT won't reflect that until it expires. I mitigate this by keeping access token lifetimes short, and for sensitive role changes (e.g. admin revokes someone), I invalidate their refresh tokens immediately so they can't silently get a new access token with the old role past that point."

---

## 5. Refresh token flow, rotation & revocation

### Topics to learn
- [ ] Why refresh tokens must be tracked server-side (hashed, per-device)
- [ ] Refresh token rotation: issue a new refresh token on every use, invalidate the old one
- [ ] Detecting refresh token reuse (a classic sign of token theft)
- [ ] Logout = delete/invalidate the stored refresh token(s)
- [ ] "Logout everywhere" = invalidate all refresh tokens for a user
- [ ] Storing refresh tokens hashed (like passwords) so a DB leak doesn't hand out valid tokens
- [ ] Race conditions on refresh (two concurrent refresh calls - ties to mobile networking chapter)

### Storage: never store raw refresh tokens

```typescript
async storeRefreshToken(userId: number, token: string, deviceId: string) {
  const hash = await bcrypt.hash(token, 10);
  await this.refreshTokenRepo.save({ userId, deviceId, tokenHash: hash, expiresAt: addDays(new Date(), 30) });
}

async validateRefreshToken(userId: number, deviceId: string, token: string): Promise<boolean> {
  const record = await this.refreshTokenRepo.findOneBy({ userId, deviceId });
  if (!record || record.expiresAt < new Date()) return false;
  return bcrypt.compare(token, record.tokenHash);
}
```

### Rotation on every refresh

```typescript
async refresh(userId: number, deviceId: string, oldToken: string) {
  const valid = await this.validateRefreshToken(userId, deviceId, oldToken);
  if (!valid) {
    // Reuse of an already-rotated/invalid token: possible theft - revoke everything for this user
    await this.revokeAllRefreshTokens(userId);
    throw new UnauthorizedException('Refresh token invalid - please log in again');
  }
  const newAccessToken = this.issueAccessToken(userId);
  const newRefreshToken = this.issueRefreshToken();
  await this.storeRefreshToken(userId, newRefreshToken, deviceId); // overwrites/rotates
  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}
```

Rotation means every refresh call invalidates the previous refresh token and issues a new one. If an attacker steals a refresh token and uses it, and *then* the legitimate client also tries to use the (now-rotated-away) old token, that mismatch is a strong signal of theft - revoking all tokens for that user at that point is the standard defensive response.

### Logout

```typescript
async logout(userId: number, deviceId: string) {
  await this.refreshTokenRepo.delete({ userId, deviceId }); // this device only
}

async logoutEverywhere(userId: number) {
  await this.refreshTokenRepo.delete({ userId }); // all devices
}
```

### Interview questions

**Q: Why hash refresh tokens in the database instead of storing them as-is?**
> "Same reasoning as passwords - if the database ever leaks, raw refresh tokens would let an attacker impersonate every user indefinitely (or until expiry). Hashing them means a DB leak alone isn't enough; the attacker would still need the original token value, which never touches the DB in plaintext."

**Q: What does refresh token rotation protect against, specifically?**
> "It limits the value of a stolen refresh token to a single use before detection. If a token is stolen and used, and the legitimate client later tries the same (now stale) token, I can detect that mismatch as reuse of an invalidated token and immediately revoke the whole session/device, rather than letting a single leaked long-lived token remain valid for its entire lifetime."

**Q: How do you handle two simultaneous refresh requests racing each other from a mobile client?**
> "That's a classic race - two requests both present the same still-valid refresh token before either rotation completes. I'd either make refresh idempotent for a short grace window (accept the immediately-prior token once, to tolerate one retry), or serialize refreshes per-device with a short-lived lock, so I don't legitimately lock out a client that just had a retried request from a flaky network - which is exactly the kind of thing that bit me in mobile apps like EasyPay, where I had to be careful two near-simultaneous 401-triggered refresh calls didn't both fire and end up racing."

---

## 6. Password security (high level)

### Topics to learn
- [ ] Never store plaintext passwords
- [ ] Hashing algorithms built for passwords: bcrypt, argon2 (NOT plain SHA-256/MD5 - too fast, brute-forceable)
- [ ] Salting is built into bcrypt/argon2 automatically
- [ ] Cost factor / work factor tuning (bcrypt rounds) - trade-off between security and latency
- [ ] Password reset flow: single-use, short-lived, signed/random token sent via email, never the password itself
- [ ] Rate limiting login attempts (brute-force protection) - `@nestjs/throttler` or a dedicated lockout counter
- [ ] Generic error messages on login failure ("invalid credentials", not "user not found" vs "wrong password" - avoid user enumeration)

### Password hashing

```typescript
async hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12); // cost factor 12 - tune based on measured latency budget
}

async verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
```

**Why not SHA-256 for passwords:** it's *designed* to be fast, which is exactly wrong for password hashing - fast hashing means an attacker with a leaked hash table can brute-force billions of guesses per second on commodity GPUs. bcrypt/argon2 are deliberately slow and tunable (cost factor) to make brute-forcing impractical, and they handle salting for you automatically so identical passwords don't produce identical hashes.

### Rate limiting logins

```typescript
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 5, ttl: 60_000 } })
@Post('login')
login(@Body() dto: LoginDto) { /* ... */ }
```

For a more targeted brute-force defense, track failed attempts per account/IP and apply an escalating lockout or CAPTCHA rather than relying purely on a global rate limiter.

### Avoiding user enumeration

Return the same generic message and timing profile whether the email doesn't exist or the password is wrong:

```typescript
if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
  throw new UnauthorizedException('Invalid credentials');
}
```

### Interview questions

**Q: Why bcrypt/argon2 instead of just hashing with SHA-256?**
> "SHA-256 is fast by design, which is great for checksums but terrible for password storage - it makes brute-force/dictionary attacks on a leaked hash cheap at scale. bcrypt and argon2 are deliberately slow, tunable via a cost factor, and handle per-password salting automatically, so even identical passwords produce different hashes and cracking is computationally expensive per guess."

**Q: How do you design a password reset flow securely?**
> "Generate a random, single-use, short-lived token (not derived from the password), store only its hash server-side tied to the user and an expiry, email a link containing the raw token, and on submission verify the hash and expiry before allowing a new password to be set. The token is invalidated immediately after use or after expiry, and I don't reveal whether a given email exists in the system through response differences."

---

## 7. Full interview question bank (rapid fire)

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

## Hands-on drills

- [ ] Implement `LocalStrategy` + `JwtStrategy` + login endpoint issuing an access+refresh pair.
- [ ] Implement a global `JwtAuthGuard` with a `@Public()` opt-out decorator.
- [ ] Implement `@Roles()` + `RolesGuard` with three roles (admin/vet/receptionist) and one endpoint per role restriction.
- [ ] Implement an ownership check in a service method (a "vet" can only edit their own resource) and write the 403 case.
- [ ] Implement refresh token rotation with hashed storage, and simulate a reuse-detection revocation.
- [ ] Write a password reset flow end to end: token generation, hashed storage, expiry, single-use enforcement.
- [ ] Rehearse the VetApp RBAC story out loud in under 90 seconds, including one follow-up answer (ownership checks).

---

## Senior red flags / green flags

### Green flags
- Clearly separates "authenticated" (401) from "authorized" (403) in every answer.
- Knows JWTs are signed, not encrypted, and never puts sensitive data in claims.
- Has a real opinion on refresh token rotation and reuse detection, not just "we use JWT."
- Distinguishes role-based checks (guard) from ownership/data checks (service).
- Knows why bcrypt/argon2 exist instead of hand-waving "we hash passwords."
- Designs for fail-safe defaults (deny-by-default guards, generic error messages).

### Red flags
- "We store the JWT in the database to check it" (misunderstands stateless verification).
- Thinks RBAC alone is sufficient for "vet can only see their own patients."
- Stores plaintext or reversibly-encrypted passwords.
- No plan for revoking a compromised token before natural expiry.
- Returns different error messages for "wrong password" vs "user not found."

---

## Tie-backs to your experience

- **VetApp**: the primary story. JWT auth, RBAC for admin/vet/receptionist, built during a full backend rewrite - rehearse this as your flagship auth answer.
- **Wizer**: backend administration features implied auth/authorization for admin users distinct from the mobile app's end-user auth - good for "different user classes, different auth needs" framing.
- **EasyPay (mobile side)**: biometric auth + secure backend APIs + refresh-token races under flaky networks - useful cross-reference if asked about the *client* side of the same problem.

---

## Senior-Level Best Practices

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

## Mastery checklist

- [ ] I can explain JWT structure and access/refresh token trade-offs without notes.
- [ ] I can implement Passport local + jwt strategies and explain what `validate()` does.
- [ ] I can implement a deny-by-default global guard with a `@Public()` opt-out.
- [ ] I can implement RBAC with a custom decorator + guard, and explain ownership checks separately.
- [ ] I can design refresh token rotation and reuse detection from memory.
- [ ] I can explain password hashing choices and a secure reset flow.
- [ ] I have a rehearsed 60-90 second VetApp RBAC/auth STAR story.
