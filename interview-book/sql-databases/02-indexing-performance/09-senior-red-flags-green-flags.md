# 09. Senior red flags / green flags

> Source: `interview-prep/sql-databases/02-indexing-performance.md`

### Green flags
- Talking about trade-offs (write cost, storage) instead of "just add an index."
- Recognizing N+1 from a symptom description ("the page got slower as the list grew") without being shown code.
- Knowing to check `EXPLAIN` before guessing at a fix.
- Mentioning that unindexed foreign keys are a common real cause of slow JOINs.

### Red flags
- "Just add an index to everything."
- Not knowing what a sequential scan is.
- Fixing N+1 by "just adding more caching" without addressing the query pattern.
- Confusing an index with a constraint (they're related but distinct: a UNIQUE constraint typically creates a unique index, but not every index implies a constraint).

---
