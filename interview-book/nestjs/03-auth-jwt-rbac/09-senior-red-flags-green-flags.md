# 09. Senior red flags / green flags

> Source: `interview-prep/nestjs/03-auth-jwt-rbac.md`

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
