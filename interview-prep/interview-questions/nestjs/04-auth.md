# NEST04 — Authentication and authorization

NestJS 10, Express adapter unless noted. Questions NEST-151–NEST-200.

Passport strategies, `AuthGuard`, JWT access/refresh, sessions vs JWT, cookies and CSRF, roles/permissions guards with `Reflector`, CASL and policies, password hashing, login/logout/refresh flows, API keys, OAuth2/OIDC, `@Public`, multi-tenant hints, WebSocket auth, testing guards, securing Swagger, revocation trade-offs, and module boundaries. Provider scopes, DI mechanics, and pipeline order are NEST02–NEST03.

### NEST-151 — Authentication vs authorization in Nest

**Difficulty:** Junior

**Category:** Architecture

**Question:**

What is the difference between authentication and authorization, and where does each live in a Nest app?

**Answer:**

Authentication (authn) answers "who are you?" and produces an identity on `req.user`. Authorization (authz) answers "what may you do?" and consumes that identity. In Nest, authn is typically a Passport strategy plus `AuthGuard`; authz is a separate guard (roles, permissions, policies) plus service-level ownership checks.

**Follow-up:**

Why shouldn't the authn guard also check roles?

Answer: Mixing them couples "how we log in" to "what rules apply". Separate guards let you swap JWT for sessions or an IdP without touching permission logic, and let public-but-role-less routes skip authz cleanly.

### NEST-152 — How `@nestjs/passport` works

**Difficulty:** Junior

**Category:** Passport

**Question:**

How does `@nestjs/passport` integrate Passport into Nest?

**Answer:**

Passport is Express-style middleware. `@nestjs/passport` wraps it: you extend `PassportStrategy(Strategy)`, register the class as a provider, and the wrapper registers the strategy with Passport under a name. `AuthGuard('name')` calls `passport.authenticate` inside `canActivate`, so it runs in Nest's guard pipeline with DI. Whatever `validate()` returns is attached to `req.user`.

**Follow-up:**

What happens if the strategy class is never added to a module's `providers`?

Answer: It is never instantiated, so Passport never registers it, and `AuthGuard('jwt')` fails at request time with an "Unknown authentication strategy" error.

### NEST-153 — The local strategy

**Difficulty:** Junior

**Category:** Passport

**Question:**

How does the local (username/password) strategy work, and where is it used?

**Answer:**

`LocalStrategy extends PassportStrategy(Strategy)` and implements `validate(username, password)`, usually calling `AuthService.validateUser`. A returned user becomes `req.user`; throwing or returning a falsy value gives 401. Rename fields with `super({ usernameField: 'email' })`. It is applied only on the login route, which then issues a token or session.

**Follow-up:**

Why use the local strategy only on `POST /login`?

Answer: Passwords should travel only once per login. Every other route should use a token or session, so the password isn't sent, parsed, and hashed on each request.

### NEST-154 — `AuthGuard` and `handleRequest`

**Difficulty:** Intermediate

**Category:** Passport

**Question:**

What does `AuthGuard('jwt')` do, and what is `handleRequest` for?

**Answer:**

It runs the named strategy and, on success, assigns the result to `req.user`. `handleRequest(err, user, info, context)` decides the outcome; by default it throws `UnauthorizedException` if there is an error or no user. Override it to customize errors, inspect `info` (such as `TokenExpiredError`), or allow optional authentication by returning `null`.

**Follow-up:**

How would you build an optionally authenticated endpoint?

Answer: Subclass the guard, override `handleRequest` to return `user ?? null` instead of throwing, and apply it to that route; the handler then branches on whether `req.user` exists.

### NEST-155 — Configuring `JwtStrategy`

**Difficulty:** Intermediate

**Category:** JWT

**Question:**

How do you configure `JwtStrategy` with `passport-jwt`, and what does `validate` receive?

**Answer:**

Call `super({ jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), ignoreExpiration: false, secretOrKey: config.get('JWT_ACCESS_SECRET') })`. Passport verifies signature and `exp` first; `validate(payload)` then runs with the decoded payload and maps it to the object for `req.user`, e.g. `{ userId: payload.sub, roles: payload.roles }`.

**Follow-up:**

Should `validate` hit the database on every request?

Answer: Only if you need up-to-date state such as "is this user still active". It adds latency per request but catches deactivated users immediately; otherwise trust the signed payload and rely on short expiry.

### NEST-156 — `JwtModule` setup

**Difficulty:** Intermediate

**Category:** JWT

**Question:**

How do you set up `JwtModule`, and when do you need `registerAsync`?

**Answer:**

`JwtModule.register({ secret, signOptions: { expiresIn: '15m' } })` is fine for static values. Use `registerAsync` with `useFactory` and `inject: [ConfigService]` when the secret comes from configuration resolved at runtime. Then inject `JwtService` and use `signAsync` / `verifyAsync`.

**Follow-up:**

How do you use different secrets for access and refresh tokens with one `JwtService`?

Answer: Pass options per call: `jwt.signAsync(payload, { secret: refreshSecret, expiresIn: '7d' })` and `verifyAsync(token, { secret })`, overriding the module defaults.

### NEST-157 — Access and refresh tokens

**Difficulty:** Intermediate

**Category:** JWT

**Question:**

Explain the access token + refresh token pattern.

**Answer:**

The access token is short-lived (5–15 minutes), sent on every request, and verified statelessly. The refresh token is long-lived (days), used only at `/auth/refresh` to mint a new access token. This limits the damage of a stolen access token without forcing frequent logins. Refresh tokens are stored server-side (hashed) so they can be revoked.

**Follow-up:**

Why not issue one JWT valid for 30 days?

Answer: A leaked token would be usable for 30 days and cannot be revoked without extra state. Splitting the roles keeps the frequently transmitted token short-lived.

### NEST-158 — Refresh token rotation

**Difficulty:** Senior

**Category:** JWT

**Question:**

What is refresh token rotation, and how does reuse detection work?

**Answer:**

Each refresh issues a new refresh token and invalidates the old one. If an already-used token shows up again, either an attacker or the real user is replaying it, so the server revokes the whole token family (all tokens from that login) and forces re-authentication. Implement with a `family` id and `revokedAt`/`usedAt` fields per token record.

**Trade-offs:**

Rotation limits the value of a stolen refresh token but adds a write per refresh and makes flaky networks or parallel tabs able to trigger false positives.

**Follow-up:**

How do you handle two parallel refresh calls from the same legitimate client?

Answer: Serialize refresh on the client (a single in-flight promise), and/or allow a short grace window on the server where the just-rotated token is still accepted once.

### NEST-159 — Storing refresh tokens

**Difficulty:** Senior

**Category:** JWT

**Question:**

How should refresh tokens be stored server-side?

**Answer:**

Store a hash, never the raw token, with `userId`, `family`, `expiresAt`, device metadata, and `revokedAt`. On refresh, hash the incoming value and look it up. Redis with a TTL or a DB table both work. A DB leak then does not expose usable tokens.

**Follow-up:**

Why can SHA-256 be fine for refresh tokens but not for passwords?

Answer: Refresh tokens are long random values with high entropy, so brute force is infeasible even with a fast hash. Passwords have low entropy and need a slow, salted hash.

### NEST-160 — localStorage vs httpOnly cookies

**Difficulty:** Intermediate

**Category:** Cookies

**Question:**

Where should a browser SPA keep tokens: localStorage or httpOnly cookies?

**Answer:**

localStorage is readable by any script on the page, so an XSS bug leaks the token. An `httpOnly` cookie cannot be read by JS, but browsers attach it automatically, which brings CSRF. A common compromise: access token in memory, refresh token in an `httpOnly; Secure; SameSite` cookie scoped to the refresh path.

**Follow-up:**

Does `httpOnly` fully protect against XSS?

Answer: No. It stops token theft, but injected script can still send authenticated requests from the victim's browser while the page is open.

### NEST-161 — Cookie flags and setting cookies in Nest

**Difficulty:** Intermediate

**Category:** Cookies

**Question:**

Which cookie flags matter, and how do you set and read cookies in Nest?

**Answer:**

`httpOnly` (no JS access), `Secure` (HTTPS only), `SameSite` (`Lax`/`Strict`/`None`), `path`, `domain`, `maxAge`. Register `cookie-parser` with `app.use(cookieParser())` to read `req.cookies`. To write: inject `@Res({ passthrough: true }) res: Response` and call `res.cookie('rt', token, { httpOnly: true, secure: true, sameSite: 'strict', path: '/auth/refresh' })`.

**Follow-up:**

What breaks if you inject `@Res()` without `passthrough: true`?

Answer: Nest switches to library-specific mode: you must send the response yourself, and returned values, interceptors that map the response, and serialization no longer apply.

### NEST-162 — Sessions vs JWT

**Difficulty:** Senior

**Category:** Sessions vs JWT

**Question:**

How do you choose between server-side sessions and JWTs?

**Answer:**

Sessions keep state on the server and send an opaque id in a cookie: instant revocation and a private payload, but they need shared storage when scaling. JWTs are self-contained and verified without a lookup, which suits horizontal scaling and service-to-service calls, but are hard to revoke and easy to bloat. For a classic web app with one backend, sessions are often simpler and safer; for APIs used by many clients and services, JWT with refresh fits better.

**Trade-offs:**

Sessions trade scalability simplicity for revocation and control; JWTs trade revocation for stateless verification.

**Follow-up:**

Is "JWT is stateless" still true once you add a revocation list?

Answer: Not fully. A denylist or per-user version check reintroduces a lookup per request, so you keep JWT's format but lose part of its statelessness.

### NEST-163 — `express-session` in Nest

**Difficulty:** Intermediate

**Category:** Sessions vs JWT

**Question:**

How do you use `express-session` with Passport in Nest, and which store belongs in production?

**Answer:**

In `main.ts`, register `session({ secret, resave: false, saveUninitialized: false, cookie: { httpOnly: true, secure: true, sameSite: 'lax' } })`, then `passport.initialize()` and `passport.session()`, in that order. Implement `serializeUser/deserializeUser` in a `PassportSerializer` provider. The default `MemoryStore` leaks memory and doesn't share across instances, so use Redis (`connect-redis`) or a DB store.

**Follow-up:**

What does `saveUninitialized: false` protect you from?

Answer: It avoids creating and storing empty sessions (and setting cookies) for anonymous visitors, which saves storage and reduces fingerprinting and session-flooding.

### NEST-164 — CSRF with cookie auth

**Difficulty:** Senior

**Category:** CSRF

**Question:**

When is CSRF a risk, and how do you mitigate it in Nest?

**Answer:**

CSRF applies when the browser attaches credentials automatically, i.e. cookie-based auth. Bearer tokens in an `Authorization` header are not auto-attached, so they are not CSRF-prone. Mitigate with `SameSite=Lax/Strict`, CSRF tokens (double-submit cookie or synchronizer token, e.g. `csrf-csrf`; `csurf` is deprecated), `Origin`/`Referer` checks, or a required custom header. Never change state in GET handlers.

**Follow-up:**

Does `SameSite=Lax` alone make a cookie-authenticated API CSRF-safe?

Answer: It blocks most cross-site POSTs, but not same-site attacks (e.g. from a sibling subdomain), old browsers, or unsafe GET handlers; use it as defense in depth with tokens.

### NEST-165 — CORS with credentials

**Difficulty:** Intermediate

**Category:** CSRF

**Question:**

How does CORS interact with cookie-based auth in Nest?

**Answer:**

Credentialed requests need `Access-Control-Allow-Credentials: true` and a specific allowed origin, and the client must use `credentials: 'include'`. In Nest: `app.enableCors({ origin: ['https://app.example.com'], credentials: true })`. CORS is a browser rule, not server-side access control; non-browser clients ignore it.

**Follow-up:**

Why can't you use `origin: '*'` with `credentials: true`?

Answer: The CORS spec forbids a wildcard with credentials, and browsers reject such responses, because it would let any site make authenticated requests and read the result.

### NEST-166 — bcrypt vs argon2

**Difficulty:** Intermediate

**Category:** Password hashing

**Question:**

How do bcrypt and argon2 compare for password hashing, and how do you use them safely?

**Answer:**

Both are slow, salted, adaptive hashes. bcrypt is battle-tested and CPU-hard, with a 72-byte input limit. Argon2id (current OWASP recommendation) is memory-hard, which resists GPU/ASIC attacks, with tunable memory/time/parallelism. Both embed the salt and parameters in the output, so `compare` needs no separate salt. Tune cost to roughly 100–300 ms per hash, rehash on login when parameters are outdated, and use the library compare (constant-time), never `===`.

**Follow-up:**

What is a pepper, and where would you store it?

Answer: A secret value mixed in (e.g. HMAC) before hashing, stored outside the database (secrets manager or env). A DB-only leak then isn't enough to crack hashes offline.

### NEST-167 — Full login flow

**Difficulty:** Intermediate

**Category:** Flows

**Question:**

Walk through a complete login flow in Nest with access and refresh tokens.

**Answer:**

`POST /auth/login` → `LocalAuthGuard` validates credentials → controller calls `authService.login(user)` → service signs an access token and a refresh token and stores the refresh token's hash → controller returns the access token in the body and sets the refresh token as an httpOnly cookie. Later requests use `JwtAuthGuard`. Return the same error for "unknown user" and "wrong password" to avoid user enumeration.

**Follow-up:**

How do you avoid timing differences that reveal whether an email exists?

Answer: Always run a hash comparison, using a dummy hash when the user is not found, so both paths take about the same time.

### NEST-168 — Logout with JWTs

**Difficulty:** Intermediate

**Category:** Flows

**Question:**

How does logout work when you use JWTs?

**Answer:**

A stateless JWT can't be deleted server-side; the client just drops it. Real logout means revoking the refresh token record, clearing the cookie, and optionally denylisting the access token's `jti` until it expires. With short access TTLs, revoking the refresh token is usually enough. With sessions, `req.session.destroy()` is immediate.

**Follow-up:**

How does "logout from all devices" work?

Answer: Revoke every refresh token for the user (delete the rows or bump a per-user `tokenVersion`), so no device can obtain new access tokens.

### NEST-169 — Revocation and blacklist trade-offs

**Difficulty:** Senior

**Category:** Revocation

**Question:**

What are the trade-offs of a token blacklist versus other revocation strategies?

**Answer:**

A denylist (Redis set of `jti` with TTL equal to the remaining lifetime) gives immediate revocation but adds a lookup per request. Alternatives: very short access TTLs, a per-user `tokenVersion` or "valid after" timestamp checked on requests, or token introspection. Most apps revoke only refresh tokens and accept the short access-token window.

**Trade-offs:**

Immediate revocation costs a store lookup and a failure dependency on every request; short TTLs cost more refresh traffic.

**Follow-up:**

Why is a per-user `tokenVersion` often cheaper than a per-token blacklist?

Answer: It is one small value per user (cacheable) that invalidates all tokens at once, instead of storing an entry for every revoked token.

### NEST-170 — JWT claims

**Difficulty:** Intermediate

**Category:** JWT

**Question:**

Which JWT claims matter, and what must never go into the payload?

**Answer:**

Standard claims: `sub`, `exp`, `iat`, `nbf`, `iss`, `aud`, `jti`. Add minimal custom claims such as roles or tenant id. A JWT is signed, not encrypted: anyone can base64-decode it. Never include passwords, secrets, or sensitive PII, and avoid large permission trees; claims go stale until the token expires.

**Follow-up:**

What do `iss` and `aud` protect against when you validate them?

Answer: Tokens minted for another issuer or another service. Without them, a valid token from a different app that shares a key could be accepted by yours.

### NEST-171 — HS256 vs RS256

**Difficulty:** Senior

**Category:** JWT

**Question:**

HS256 vs RS256: when do you choose asymmetric signing?

**Answer:**

HS256 uses one shared secret to sign and verify, so every verifier can also forge tokens. RS256/ES256 signs with a private key and verifies with a public key, so many services can verify while only the auth service signs; keys can be published via JWKS and rotated with `kid`. In `JwtModule`, set `privateKey`, `publicKey`, and `signOptions.algorithm`. Always pin allowed `algorithms` on verification.

**Follow-up:**

What is algorithm confusion and how do you prevent it?

Answer: An attacker changes `alg` (to `none`, or to HS256 using the public key as the secret). Prevent it by restricting accepted algorithms in verification options and never choosing the algorithm from the token header.

### NEST-172 — Custom guard with `CanActivate`

**Difficulty:** Junior

**Category:** Guards

**Question:**

How do you write a custom guard, and what do return values and exceptions mean?

**Answer:**

Implement `canActivate(context: ExecutionContext)` on an `@Injectable()` class, read the request through `context.switchToHttp().getRequest()`, and return `true`/`false` (sync, `Promise`, or `Observable`). `false` yields 403; throwing yields that exception's status, e.g. `UnauthorizedException` → 401. `ExecutionContext` adds `getHandler()` and `getClass()` for reading metadata.

**Follow-up:**

Why does returning `false` give 403 instead of 401?

Answer: Nest throws a `ForbiddenException` for denied guards by default. Throw `UnauthorizedException` yourself when the failure is missing or invalid credentials.

### NEST-173 — Guard vs middleware vs interceptor

**Difficulty:** Intermediate

**Category:** Guards

**Question:**

Why are guards the right place for auth, rather than middleware or interceptors?

**Answer:**

Middleware runs before routing and has no `ExecutionContext` or handler metadata, so it can't tell which route is public or needs a role. Guards run after middleware knowing exactly which handler will run, so they can read decorators. Interceptors run after guards and wrap the handler for cross-cutting work (logging, mapping), not access control.

**Follow-up:**

Is any auth-related work reasonable in middleware?

Answer: Yes: cheap, route-agnostic work like parsing cookies, attaching a request id, or loosely decoding a token. The accept/deny decision still belongs in a guard.

### NEST-174 — Global guards with `APP_GUARD`

**Difficulty:** Intermediate

**Category:** Guards

**Question:**

How do you apply an auth guard globally, and why prefer `APP_GUARD` over `useGlobalGuards`?

**Answer:**

`app.useGlobalGuards(new JwtAuthGuard())` creates the guard outside the DI container, so it cannot inject `Reflector` or `ConfigService`. Registering `{ provide: APP_GUARD, useClass: JwtAuthGuard }` in a module makes it a normal provider with full DI. A global guard plus an explicit `@Public()` opt-out is "secure by default".

**Follow-up:**

Does a global `APP_GUARD` apply to microservice transports in a hybrid app?

Answer: Not automatically. Global enhancers registered via `useGlobalGuards` skip microservice contexts unless `inheritAppConfig` is enabled; `APP_GUARD` providers do apply to them, so guards must handle non-HTTP contexts.

### NEST-175 — The `@Public()` decorator

**Difficulty:** Intermediate

**Category:** Guards

**Question:**

How do you implement `@Public()` to opt a route out of the global auth guard?

**Answer:**

`export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);`. In the global guard's `canActivate`, call `reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()])`; if truthy return `true`, otherwise `super.canActivate(context)`. Use it on login, register, health, and webhook routes.

**Follow-up:**

How do you make a `@Public()` route still populate `req.user` when a token is sent?

Answer: For public routes, still try to authenticate but swallow failures: call `super.canActivate` in a try/catch (or override `handleRequest` to return `null`) and always return `true`.

### NEST-176 — `getAllAndOverride` vs `getAllAndMerge`

**Difficulty:** Intermediate

**Category:** Guards

**Question:**

What is the difference between `Reflector.getAllAndOverride` and `getAllAndMerge`?

**Answer:**

`getAllAndOverride` returns the first defined value in the target order (handler, then class), so method-level metadata wins. `getAllAndMerge` combines arrays or objects from all targets. Use override for flags like `@Public()`; use merge when class-level and method-level values should accumulate.

**Follow-up:**

With `@Roles('admin')` on the class and `@Roles('editor')` on a method, which do you want?

Answer: It depends on intent: override means only `editor` is allowed on that method; merge means `admin` or `editor`. Pick override to narrow or replace access, merge to widen it, and document the choice.

### NEST-177 — `@Roles()` and `RolesGuard`

**Difficulty:** Intermediate

**Category:** Authorization

**Question:**

How do you build a `@Roles()` decorator and `RolesGuard`?

**Answer:**

`export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);`. `RolesGuard` reads `reflector.getAllAndOverride<Role[]>('roles', [handler, class])`; with no metadata it allows the request, otherwise it checks `req.user.roles.some(r => required.includes(r))`. It must run after the authn guard so `req.user` exists.

**Follow-up:**

What should the guard do when `req.user` is missing?

Answer: Deny (throw `UnauthorizedException`/return false) rather than crash on `undefined`; a missing user on a role-protected route means authn did not run or failed.

### NEST-178 — Guard execution order

**Difficulty:** Intermediate

**Category:** Guards

**Question:**

In what order do guards run, and how do you ensure authn runs before authz?

**Answer:**

Global guards first, then controller-level, then route-level; within `@UseGuards(A, B)` left to right. Multiple global `APP_GUARD` providers run in registration order. The first to throw or return `false` stops the chain.

**Follow-up:**

How do you guarantee `JwtAuthGuard` runs before `RolesGuard` when both are `APP_GUARD`?

Answer: Declare them in the same providers array in that order, or make `RolesGuard` apply only through `@UseGuards` after the global authn guard. Add an e2e test to lock the order down.

### NEST-179 — RBAC, ABAC, permissions

**Difficulty:** Senior

**Category:** Authorization

**Question:**

Compare RBAC, permission-based, and ABAC authorization.

**Answer:**

RBAC maps users to roles to actions: simple but coarse, prone to role explosion. Permission-based assigns fine-grained strings (`post:update`) to roles or users. ABAC evaluates attributes of user, resource, and context (owner, department, time): most flexible but harder to audit. Many apps use roles for coarse gates plus attribute/ownership checks for resources.

**Follow-up:**

When does RBAC alone stop being enough?

Answer: When rules depend on the resource instance or context ("only edit own posts", "only during business hours", "only within the same tenant").

### NEST-180 — CASL in Nest

**Difficulty:** Senior

**Category:** CASL and policies

**Question:**

How does CASL fit into Nest authorization?

**Answer:**

CASL defines abilities with `can(action, subject, conditions)` and `cannot`. An injectable `CaslAbilityFactory` builds an `Ability` for the current user; code then checks `ability.can('update', article)` in a guard or service. It covers role-level and instance-level rules (`{ authorId: user.id }`) in one model, and rules can be shared with the front end. Don't adopt it for a simple admin/user split.

**Follow-up:**

How do you check instance conditions when the guard runs before the entity is loaded?

Answer: Do a type-level check in the guard (`can('update', 'Article')`) and the instance check in the service after loading, or use `accessibleBy` to build a query filter.

### NEST-181 — Policy handler guards

**Difficulty:** Senior

**Category:** CASL and policies

**Question:**

What is a policy handler guard?

**Answer:**

A `PoliciesGuard` reads metadata from `@CheckPolicies(...)` (functions or classes with `handle(ability)`), builds the user's ability, and runs every handler. Controllers then declare authorization declaratively: `@CheckPolicies(ab => ab.can(Action.Read, Article))`. Class-based handlers can use DI through `ModuleRef`.

**Follow-up:**

What are the downsides of declarative policies for rules that need the loaded entity?

Answer: The guard runs before the handler loads the entity, so instance-level rules can't be evaluated there; they must move into the service, splitting authorization across two places.

### NEST-182 — Ownership checks

**Difficulty:** Senior

**Category:** Authorization

**Question:**

Where should resource-ownership checks live: in a guard or in the service?

**Answer:**

Guards run before the handler and don't have the entity; loading it there duplicates queries. Instance checks ("is this my order?") belong in the service after loading, or directly in the query (`where: { id, userId }`), which also avoids revealing existence. Keep guards for coarse checks such as role, permission, or tenant membership.

**Follow-up:**

Should a resource that exists but isn't yours return 404 or 403?

Answer: Often 404, to avoid disclosing that the id exists; use 403 when the resource is known to the caller and the distinction helps them (e.g. shared resources).

### NEST-183 — `@CurrentUser()` and typing `req.user`

**Difficulty:** Junior

**Category:** Passport

**Question:**

How do you create a `@CurrentUser()` decorator and type `req.user`?

**Answer:**

`createParamDecorator((data: keyof AuthUser | undefined, ctx: ExecutionContext) => { const user = ctx.switchToHttp().getRequest().user; return data ? user?.[data] : user; })`. Type it with an `AuthUser` interface and either `interface AuthenticatedRequest extends Request { user: AuthUser }` or an Express `Request` module augmentation.

**Follow-up:**

Why is a param decorator better than injecting `REQUEST` into services?

Answer: `REQUEST` injection makes the service request-scoped, which bubbles scope up the chain and costs performance. A param decorator passes the user explicitly and keeps services singletons that are easy to test.

### NEST-184 — 401 vs 403

**Difficulty:** Junior

**Category:** Guards

**Question:**

When do you use 401 and when 403, and which Nest exceptions map to them?

**Answer:**

`UnauthorizedException` (401): credentials missing, invalid, or expired; the client should authenticate. `ForbiddenException` (403): authenticated but not allowed. A guard returning `false` gives 403 by default, so throw 401 yourself for authn failures. Keep messages generic to avoid leaking whether a user or resource exists.

**Follow-up:**

What header should accompany a 401?

Answer: `WWW-Authenticate` (e.g. `Bearer`) per HTTP semantics; many APIs omit it, but it's correct for standards-compliant clients.

### NEST-185 — API key authentication

**Difficulty:** Intermediate

**Category:** API keys

**Question:**

How would you implement API key authentication in Nest?

**Answer:**

Clients send `X-API-Key`. Use a custom guard or `passport-headerapikey`: read the header, look up the record (by non-secret prefix), compare the hashed secret, check status, expiry, and scopes, then attach a principal like `{ type: 'apiKey', clientId, scopes }` to the request. API keys identify applications or machines, not end users.

**Follow-up:**

Why attach a "principal" rather than assume `req.user` is always a human user?

Answer: Routes may accept both users and API clients; a typed principal lets guards and services branch on `type` and scopes instead of misreading a client as a person.

### NEST-186 — API key storage, scopes, rotation

**Difficulty:** Senior

**Category:** API keys

**Question:**

How should API keys be generated, stored, scoped, and rotated?

**Answer:**

Generate with a CSPRNG, show the full key once, and store only a hash plus a non-secret prefix/id for lookup. Attach scopes and optional expiry, IP allowlist, and rate limits. Allow multiple active keys per client so rotation has no downtime, record `lastUsedAt`, and compare in constant time.

**Follow-up:**

Why can a fast hash such as SHA-256 be acceptable for API keys?

Answer: Generated keys have high entropy, so offline brute force is infeasible; a slow hash would only add latency to every request.

### NEST-187 — OAuth2 authorization code with PKCE

**Difficulty:** Senior

**Category:** OAuth2

**Question:**

Explain the OAuth2 authorization code flow with PKCE at a high level.

**Answer:**

The client redirects the user to the authorization server with a `code_challenge`; the user logs in and consents; the server redirects back with a short-lived `code`; the client exchanges `code` plus `code_verifier` at the token endpoint for access (and refresh) tokens. PKCE prevents code interception, so it is required for public clients (SPA, mobile) and recommended for all. In Nest you are usually the client (a callback route) or the resource server validating tokens.

**Follow-up:**

Why is the implicit flow deprecated?

Answer: It returns tokens in the URL fragment, exposing them to browser history, referrers, and scripts, and has no client authentication; code flow with PKCE replaces it.

### NEST-188 — Social login and account linking

**Difficulty:** Senior

**Category:** OAuth2

**Question:**

How do you add social login (Google/GitHub) and handle account linking?

**Answer:**

Use `passport-google-oauth20` or similar: configure `clientID`, `clientSecret`, `callbackURL`, `scope`, and in `validate(accessToken, refreshToken, profile)` find or create the local user. Then issue your own tokens or session; don't use the provider's token as your session. Link by provider id, or by email only when the provider confirms it is verified, or require the user to log in first and then connect.

**Follow-up:**

Why is auto-linking by unverified email dangerous?

Answer: An attacker can register at the provider with the victim's email unverified and take over the victim's local account.

### NEST-189 — OIDC and delegating to an IdP

**Difficulty:** Senior

**Category:** OAuth2

**Question:**

What is the difference between OAuth2 and OIDC, and when would you delegate to an IdP such as Auth0 or Keycloak?

**Answer:**

OAuth2 is delegated authorization (access tokens); OpenID Connect adds identity (ID token, `userinfo`, standard claims). An IdP gives you MFA, SSO, social login, and password policies without building them. Your Nest API becomes a resource server: validate JWTs with the IdP's JWKS (`passport-jwt` + `jwks-rsa`), check `iss` and `aud`, and map claims/scopes to roles. Build in-house only when needs are simple or highly custom.

**Follow-up:**

What must your API handle when the IdP rotates signing keys?

Answer: Fetch and cache the JWKS, pick the key by `kid`, and refetch when an unknown `kid` appears, with rate limiting so bad tokens can't trigger floods of fetches.

### NEST-190 — Resolving the tenant

**Difficulty:** Senior

**Category:** Multi-tenant

**Question:**

How do you resolve the tenant in a multi-tenant API, and how do you keep it trustworthy?

**Answer:**

Sources: a JWT claim (`tenantId`), subdomain, or `X-Tenant-ID` header. Prefer the signed claim; if the tenant comes from the client, verify the authenticated user is a member. Resolve in a guard or middleware that attaches `req.tenantId`, exposed through a param decorator. Users in several tenants need a switch flow that issues a new token.

**Follow-up:**

What is the risk of trusting a client-supplied tenant header without a membership check?

Answer: Any user could read or modify other tenants' data just by changing the header (broken access control / IDOR across tenants).

### NEST-191 — Tenant isolation below the auth layer

**Difficulty:** Staff

**Category:** Multi-tenant

**Question:**

How do you enforce tenant isolation beyond the auth layer?

**Answer:**

Enforce at the data layer: always scope queries by `tenantId` (a base repository or ORM global filters), or use Postgres Row-Level Security with `SET LOCAL app.tenant_id` per transaction. Request-scoped providers can carry the tenant, but scope bubbles up the dependency chain; `AsyncLocalStorage` (e.g. `nestjs-cls`) is lighter. Add tests that attempt cross-tenant access.

**Trade-offs:**

Application-level filtering is easy but one forgotten `where` leaks data; RLS is safer but adds DB complexity and connection/transaction handling.

**Follow-up:**

What are the performance implications of request-scoped providers carrying the tenant?

Answer: Each request re-instantiates the scoped provider and every consumer up the chain, adding allocation and GC cost and disabling singleton behavior (and lifecycle hooks) for those providers.

### NEST-192 — WebSocket authentication

**Difficulty:** Senior

**Category:** WebSockets

**Question:**

How do you authenticate WebSocket connections in a Nest gateway?

**Answer:**

Authenticate during the handshake, not per message: read the token from `handshake.auth.token`, a header, or a cookie in `handleConnection` or an adapter middleware, verify with `JwtService`, store the user on `client.data.user`, and disconnect on failure. Guards also work in gateways (`@UseGuards(WsJwtGuard)`) via `context.switchToWs().getClient()`, throwing `WsException`. Avoid tokens in query strings since they end up in logs.

**Follow-up:**

What happens to a long-lived socket when the access token expires?

Answer: Nothing automatically: the connection stays authenticated. Track `exp` and disconnect, or require the client to re-authenticate with a fresh token over the socket.

### NEST-193 — Auth across microservices

**Difficulty:** Staff

**Category:** Architecture

**Question:**

How should authentication and authorization work across microservices?

**Answer:**

Authenticate once at the edge (API gateway or BFF), verify the JWT there, and propagate identity downstream via a signed token or trusted metadata over an mTLS internal network. Each service still authorizes within its own domain. Use asymmetric signing so services verify with a public key, and give service-to-service calls their own credentials (client credentials or mTLS) instead of blindly forwarding user tokens.

**Follow-up:**

Why is "internal network equals trusted" a weak assumption?

Answer: One compromised service or misconfigured route gives lateral access to everything; zero-trust means each hop authenticates and authorizes.

### NEST-194 — Brute-force protection

**Difficulty:** Intermediate

**Category:** Hardening

**Question:**

How do you protect login and refresh endpoints from brute force?

**Answer:**

Use `@nestjs/throttler` with strict limits on `/auth/login`, `/auth/refresh`, and password reset (`@Throttle({ default: { limit: 5, ttl: 60000 } })`), keyed by IP and/or account, with Redis storage for multi-instance deployments. Add progressive delays, CAPTCHA after failures, and alerting. Account lockout can be abused to lock out a victim, so prefer delays or per-IP-plus-account keys.

**Follow-up:**

Why can pure IP-based throttling be insufficient?

Answer: Attackers distribute attempts across many IPs (botnets, proxies), and users behind a shared NAT can be blocked together; combine with per-account limits.

### NEST-195 — Reset, verification, and 2FA

**Difficulty:** Senior

**Category:** Flows

**Question:**

How do password reset, email verification, and 2FA fit into the auth architecture?

**Answer:**

Reset and verification: generate a single-use random token, store its hash with an expiry, email a link, and invalidate on use and after password change; respond identically whether or not the email exists. 2FA (TOTP): after the password step issue a short-lived "partial" state, require the code, then issue full tokens; store the secret encrypted and provide recovery codes. Keep these in dedicated services behind `AuthService`.

**Follow-up:**

Why revoke existing sessions and refresh tokens after a password reset?

Answer: The reset often happens because of suspected compromise; leaving old sessions alive would let an attacker keep access after the password changes.

### NEST-196 — Unit testing a guard

**Difficulty:** Intermediate

**Category:** Testing

**Question:**

How do you unit test an auth guard?

**Answer:**

Instantiate the guard with a mocked `Reflector` and a fake `ExecutionContext` (`createMock` from `@golevelup/ts-jest`, or a hand-built object with `switchToHttp`, `getHandler`, `getClass`). Assert: public route passes, missing role denied, correct role allowed, and exceptions have the right type. Test the metadata logic in isolation rather than booting the app.

**Follow-up:**

How would you test that a method-level `@Public()` overrides class-level protection?

Answer: Use a real `Reflector` with a small test controller (or mock `getAllAndOverride` to return `true`) and assert the guard allows it without calling the underlying JWT check.

### NEST-197 — E2E testing protected endpoints

**Difficulty:** Senior

**Category:** Testing

**Question:**

How do you write e2e tests for protected endpoints?

**Answer:**

Build the app with `Test.createTestingModule({ imports: [AppModule] })` and use `supertest`. Either log in as a test user, or sign a token with `JwtService`. To bypass authn in non-auth tests use `.overrideGuard(JwtAuthGuard).useValue({ canActivate: ctx => { ctx.switchToHttp().getRequest().user = fakeUser; return true; } })`. Keep dedicated tests for 401 without a token and 403 with the wrong role.

**Follow-up:**

Why is overriding the guard in every e2e test a coverage risk?

Answer: It hides real wiring bugs (missing `@Public`, wrong guard order, strategy misconfiguration), so keep some tests using the real guards and tokens.

### NEST-198 — Mocking `JwtService` and strategies

**Difficulty:** Intermediate

**Category:** Testing

**Question:**

How do you mock `JwtService` and test Passport strategies?

**Answer:**

For services, provide `{ provide: JwtService, useValue: { signAsync: jest.fn(), verifyAsync: jest.fn() } }` and test payloads and error paths. For strategy classes, call `validate()` directly as a plain method. Don't test Passport internals; test your payload-to-user mapping, and guard behavior through e2e. Use fixed secrets, short expirations, and fake timers for expiry.

**Follow-up:**

How do you test that an expired token returns 401 without waiting?

Answer: Sign a token with a negative or tiny `expiresIn` (or set `iat`/`exp` in the past), or advance Jest fake timers, then call the endpoint and assert 401.

### NEST-199 — Securing Swagger

**Difficulty:** Intermediate

**Category:** Swagger

**Question:**

How do you document auth in Swagger and protect the docs themselves?

**Answer:**

Document with `new DocumentBuilder().addBearerAuth()` (or `addCookieAuth`, `addApiKey`) and mark routes with `@ApiBearerAuth()` so the Authorize button works. To protect the docs: disable Swagger in production, or serve `/docs` behind basic auth (`express-basic-auth`) middleware, a VPN, an IP allowlist, or admin-only access. Apply the protection as middleware before `SwaggerModule.setup`, since those routes live on the HTTP adapter outside normal guard handling.

**Follow-up:**

What risk does a public OpenAPI JSON create in production?

Answer: It hands attackers a complete map of endpoints, parameters, and schemas, including internal or admin routes, which eases reconnaissance.

### NEST-200 — Auth module boundaries

**Difficulty:** Staff

**Category:** Architecture

**Question:**

Where should auth logic live, and what are good module boundaries?

**Answer:**

`AuthModule` owns credentials, token issuing, strategies, and guards, and exports `AuthService` and the guards/decorators others need. `UsersModule` owns user data and exports `UsersService`; `AuthModule` imports it, giving a one-way dependency. Authorization rules (policies, abilities) can live in an `AuthzModule` or next to each domain. Controllers stay thin: guards and decorators plus service calls. Use `@Global()` only for truly cross-cutting pieces.

**Trade-offs:**

Centralizing auth keeps rules consistent but can make one module a bottleneck; domain-local policies are flexible but risk inconsistent enforcement.

**Follow-up:**

How do you avoid a circular dependency between `AuthModule` and `UsersModule`?

Answer: Keep the dependency one-way (`Auth` → `Users`); if users need auth events, use an event emitter or move shared logic to a third module instead of `forwardRef`.
