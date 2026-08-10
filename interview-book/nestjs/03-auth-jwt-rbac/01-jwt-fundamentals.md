# 01. JWT fundamentals

> Source: `interview-prep/nestjs/03-auth-jwt-rbac.md`

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
