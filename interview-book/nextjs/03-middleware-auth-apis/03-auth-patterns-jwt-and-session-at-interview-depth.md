# 03. Auth patterns - JWT and session, at interview depth

> Source: `interview-prep/nextjs/03-middleware-auth-apis.md`

### Topics to learn

- [ ] Session-based auth: server issues an opaque session ID, stored server-side (DB/Redis) with the session data; client just holds the ID in a cookie
- [ ] JWT-based auth: server issues a signed token containing claims (user id, role, expiry); client stores it, server verifies the signature on each request without a DB lookup
- [ ] Access token + refresh token pattern: short-lived access token (minutes) for API calls, longer-lived refresh token (days) to mint new access tokens without forcing re-login
- [ ] Where to store tokens: `httpOnly` cookies (not readable by JS, mitigates XSS token theft) vs `localStorage`/client state (readable by JS, vulnerable to XSS, but simpler for pure SPA/mobile-style clients)
- [ ] Cookie flags that matter: `httpOnly`, `secure` (HTTPS only), `sameSite` (`lax`/`strict`/`none`) for CSRF mitigation
- [ ] CSRF risk mostly applies to cookie-based auth (browser auto-attaches cookies); less of a concern for `Authorization: Bearer <token>` headers set explicitly by JS, but that pattern is more exposed to XSS instead - there's a real tradeoff, not a free lunch either way
- [ ] Protecting routes in App Router: Middleware for the coarse redirect, plus checking the session/token again in the actual Server Component/Route Handler/Server Action (defense in depth - never trust that Middleware alone was hit, e.g. someone could hit a Route Handler directly)

### JWT vs session - comparison table

| | Session (server-side) | JWT (stateless) |
|---|---|---|
| Server storage needed | Yes (DB/Redis) | No (self-contained token) - though often still persisted for revocation lists |
| Revocation | Easy - delete the session server-side | Hard - token is valid until expiry unless you maintain a blocklist, defeating some statelessness benefit |
| Scaling across services | Needs shared session store | Easier - any service with the public key/secret can verify |
| Payload visibility | Nothing meaningful in the cookie itself | Claims are base64-encoded, not encrypted - never put secrets in a JWT payload |
| Common pairing | Traditional server-rendered apps, simpler setups | Microservices, mobile + web sharing one backend (fits a NestJS backend serving both a Next.js web app and a React Native app) |

### Interview answer sketch

> "For a setup with a shared NestJS backend serving both a Next.js web app and a React Native mobile app - which matches how I've worked - JWT access/refresh tokens make sense because both clients can use the same stateless verification without the backend needing to know or care which client type is calling. On the web side, I'd store the access token in an `httpOnly`, `secure`, `sameSite=lax` cookie so client-side JS (and therefore XSS) can't read it directly, and use a Route Handler or Server Action as a thin proxy when the browser needs to call the backend, so the token never has to live in client-readable JS state. On mobile, since there's no cookie jar in the same sense, secure storage (Keychain/Keystore) holds the token instead."

**Follow-up:** "How do you handle token refresh without kicking the user out?"
> "Short-lived access token, longer-lived refresh token. When an API call gets a 401, the client (or a Route Handler acting as a proxy) attempts a refresh using the refresh token, retries the original request once, and only redirects to login if the refresh itself fails. I've dealt with the classic race condition of multiple simultaneous requests all trying to refresh at once - the fix is to have only one refresh request in flight and queue the others behind it."

---
