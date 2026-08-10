# 11. Senior red flags / green flags

> Source: `interview-prep/nestjs/01-nestjs-architecture.md`

### Green flags
- Explains DI in terms of *testability and decoupling*, not just "Nest does it automatically."
- Knows the exact request pipeline order without hand-waving.
- Has a real opinion on feature-based vs layer-based structure, backed by a project.
- Knows `enableShutdownHooks()` is required - a classic "gotcha" that separates people who've run this in production from people who haven't.
- Ties module boundaries to business domains, not files.

### Red flags
- "Modules are just folders."
- Can't explain the difference between a guard and an interceptor.
- Thinks `REQUEST` scope has no downside.
- Puts business logic and persistence access directly in controllers.
- No opinion on how they'd structure a legacy rewrite.

---
