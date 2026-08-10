# 09. Senior red flags / green flags

> Source: `interview-prep/nestjs/05-typeorm-persistence.md`

### Green flags
- Defaults to explicit relation loading, treats `eager: true` as a deliberate, rare choice.
- Can describe N+1 with a concrete before/after code example, not just the term.
- Knows exactly why `synchronize: true` is banned outside local dev.
- Has a real opinion on keeping external calls (payment gateways) out of DB transactions.
- Can name specific MySQL vs Postgres differences from actual project experience, not textbook trivia.

### Red flags
- "TypeORM handles all of that for me" with no understanding of what "that" is.
- Doesn't know what N+1 means or has never had to fix one.
- Uses `synchronize: true` in a shared/staging/production environment.
- Wraps slow external API calls inside long-held DB transactions without acknowledging the trade-off.
- No specific migration workflow beyond "TypeORM generates it."

---
