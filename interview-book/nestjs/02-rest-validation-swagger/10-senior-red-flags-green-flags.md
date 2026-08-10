# 10. Senior red flags / green flags

> Source: `interview-prep/nestjs/02-rest-validation-swagger.md`

### Green flags
- Distinguishes 401 vs 403 correctly and consistently, without prompting.
- Knows exactly why `whitelist`/`forbidNonWhitelisted`/`transform` each exist, not just "I turn on ValidationPipe."
- Can explain why DTOs != entities with a concrete leak scenario.
- Knows guards run before pipes/interceptors, and *why* that ordering is deliberate (cheap rejection first).
- Ties Swagger docs directly to the DTOs that drive real validation, not a hand-maintained spec.

### Red flags
- Uses entities directly as request bodies "to save time."
- Can't explain the difference between a guard and an interceptor.
- Doesn't know what `ValidationPipe` options actually do beyond "it validates."
- Returns raw stack traces / internal error messages to API clients.
- No opinion on pagination strategy beyond "we send everything back."

---
