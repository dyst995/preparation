# 11. Senior red flags / green flags

> Source: `interview-prep/sql-databases/01-sql-fundamentals.md`

### Green flags interviewers love
- Narrating the join-then-filter mental model instead of guessing syntax.
- Catching the ON-vs-WHERE outer join trap unprompted.
- Distinguishing COUNT(*) from COUNT(DISTINCT ...) without being asked.
- Reaching for window functions instead of a convoluted self-join for "top N per group."
- Saying "I'd check the query plan" when asked about performance, instead of guessing blindly.

### Red flags
- Using `SELECT *` in a query meant to demonstrate precision.
- Not knowing why `= NULL` fails.
- Writing `NOT IN` against a possibly-NULL subquery without flagging the risk.
- Confusing WHERE and HAVING under pressure.
- Treating every problem as needing a subquery when a JOIN is simpler.

---
