# 03. Part C - Rapid-fire concept Q&A (say the answer in one breath)

> Source: `interview-prep/sql-databases/05-interview-questions.md`

1. WHERE vs HAVING? -> row filter before grouping vs group filter after.
2. INNER vs LEFT JOIN? -> matched only vs all-left-plus-NULL-fill.
3. Why NOT IN can break with NULLs? -> UNKNOWN comparisons poison the whole list; use NOT EXISTS.
4. COUNT(*) vs COUNT(DISTINCT col)? -> all rows vs unique non-NULL values.
5. What's a B-tree index for? -> O(log n) lookups/range scans instead of full scans.
6. Leftmost-prefix rule? -> composite index usable only via a prefix of its columns, in order.
7. N+1 problem? -> 1 query + N per-row queries for relations; fix with JOIN eager load or batched IN queries.
8. ACID? -> Atomicity, Consistency, Isolation, Durability.
9. Postgres vs MySQL default isolation level? -> Read Committed vs Repeatable Read.
10. Pessimistic vs optimistic locking? -> lock now (high contention) vs check version at write time (low contention).
11. What causes a deadlock, and the fix? -> circular lock wait; consistent lock ordering + short transactions.
12. Why DECIMAL over FLOAT for money? -> exact base-10 representation, no floating-point rounding error.
13. Why an idempotency key on a transfer? -> safe client retries without duplicate money movement.
14. synchronize: true in TypeORM - why avoid in production? -> risk of silent destructive schema changes, no reviewable history.
15. JSONB vs MySQL JSON? -> Postgres JSONB has mature GIN indexing; MySQL JSON usually needs generated columns for indexed queries.

---
