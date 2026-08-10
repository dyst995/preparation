# 11. Senior-Level Best Practices

> Source: `interview-prep/sql-databases/02-indexing-performance.md`

### Rapid-fire scenario responses (say these in one breath)
- "Query does a Seq Scan on a 5M row table filtering on `email`." -> Add a B-tree index on `email`; confirm selectivity first, then confirm with EXPLAIN ANALYZE.
- "Composite index `(status, created_at)` exists but a query filtering only on `created_at` is still slow." -> Expected - leftmost-prefix rule means `created_at` alone can't use this index; add a separate index on `created_at` if that access pattern is real.
- "Write throughput dropped after adding 3 new indexes to a hot table." -> Expected trade-off; audit whether all 3 are actually needed, drop any with low `idx_scan` counts.
- "EXPLAIN shows `Using filesort` in MySQL." -> The ORDER BY isn't satisfied by an index; consider extending the composite index to cover the sort column in the right position.
- "A `LIKE '%term%'` query is slow and won't use an index." -> Leading wildcard defeats a B-tree; consider a trigram index (Postgres `pg_trgm`) or full-text search instead.

### Decision framework: should I add this index?
1. Is this column/combination actually in a hot WHERE, JOIN, or ORDER BY clause - not hypothetically, but from real query logs or expected traffic?
2. What's the selectivity - would this index actually narrow the result set to a small fraction of the table?
3. What's the write volume on this table - is it a low-write reference table (index freely) or a high-write hot table (every added index has a real, measurable write cost)?
4. Is there an existing composite index whose leftmost prefix already covers this, making a new single-column index redundant?
5. Would a partial index (Postgres) or a covering index serve this specific query pattern better than a plain index?

### EXPLAIN-driven tuning workflow (a loop, not a one-shot lookup)
1. Run `EXPLAIN ANALYZE` (Postgres) or `EXPLAIN` (MySQL) against realistic data volume, never an empty/tiny dev table.
2. Identify the single most expensive node in the plan (highest actual time/cost, or largest "rows removed by filter").
3. Form a hypothesis: missing index, wrong leading column order, stale statistics, an unnecessary sort, or a bad join strategy.
4. Make ONE change (add an index, reorder composite columns, run ANALYZE to refresh statistics) and re-run EXPLAIN ANALYZE to confirm the change actually helped before making another change.
5. Watch for a plan that looks fine on paper but is wrong in practice: a big gap between estimated and actual rows means the planner's statistics are stale (`ANALYZE`/`ANALYZE TABLE`) - don't just add an index to compensate for bad statistics.

### Production checklist
- [ ] Every foreign key column used in a JOIN or WHERE has an explicit index (never assume the ORM or the FK constraint auto-created one).
- [ ] Composite index column order matches actual query filter/sort order, not alphabetical or "however I typed the CREATE TABLE."
- [ ] New indexes are added via a reviewed migration, and for large tables, added with `CREATE INDEX CONCURRENTLY` (Postgres) to avoid locking writes, or scheduled during a low-traffic window (MySQL, depending on ALTER algorithm/online DDL support).
- [ ] A dashboard or periodic job flags unused indexes (Postgres `pg_stat_user_indexes.idx_scan = 0` over a meaningful time window) so dead weight gets removed, not accumulated forever.
- [ ] N+1 query patterns are caught before merge - via a query-count assertion in tests, or query-logging middleware in staging, not discovered in production after a page "feels slow."
- [ ] Table statistics are refreshed (`ANALYZE`) after any large bulk load/backfill, not left to the next scheduled auto-vacuum cycle.
- [ ] Index-bloat is monitored on high-churn tables (Postgres, due to MVCC) and periodic `REINDEX`/maintenance windows are scheduled rather than discovered as a mystery slowdown.

### Worked scenario: diagnosing "the appointments page got slower over the last month"
1. **Reproduce with EXPLAIN ANALYZE** against the actual production-shaped query the page issues, not a simplified version.
2. **Compare estimated vs actual rows** in the plan - a large gap points to stale statistics rather than a missing index.
3. **Check if data volume grew** - a query that scanned 50k rows a month ago might now scan 5 million; the same plan that was "fine" can degrade purely from growth, with no code change at fault.
4. **Check the existing index's leftmost columns** against the query's actual WHERE/ORDER BY - a recent added filter (e.g. a new `status` parameter) might have silently fallen outside the existing composite index's coverage.
5. **Rule out N+1** by checking whether this is one slow query or hundreds of fast ones firing per page load - very different fixes.
6. **Propose the smallest fix that addresses the actual bottleneck** - re-running ANALYZE, adjusting a composite index's column order, or adding one new index - and validate it with a fresh EXPLAIN ANALYZE before shipping, not just "it feels faster."

### Anti-patterns and failure modes
| Anti-pattern | Failure mode | Fix |
|---|---|---|
| Indexing every column "just in case" | Slower writes, bloated storage, planner has to weigh more options | Index from real query patterns, remove unused indexes |
| Composite index with the range column first | Leftmost-prefix rule defeated for equality lookups | Equality columns first, range/sort columns after |
| Ignoring stale statistics | Planner picks a bad join order or wrong index based on outdated row estimates | Regular ANALYZE/auto-vacuum tuning, especially after bulk loads |
| Adding an index to "fix" N+1 | Doesn't fix the round-trip count, just makes each round trip individually faster | Fix the access pattern (eager load/batch) first, index is secondary |
| Building a giant covering index for one rare report query | Write cost paid on every insert/update for a query that runs once a month | Consider a read replica or scheduled materialized view instead |

### Common production incidents mapped to root cause
| Symptom | Likely root cause | First check |
|---|---|---|
| Query suddenly slower after a schema change | New filter column isn't part of any existing composite index prefix | EXPLAIN, check which index (if any) was used |
| Report page times out only on the busiest customer | Data-volume-dependent plan flip (index scan to seq scan) | Compare EXPLAIN plans across small vs large customer datasets |
| Writes got slower after a "performance improvement" | Too many indexes added defensively | Audit index usage stats, drop unused ones |
| Plan looks fine in staging, terrible in production | Stale statistics or unrepresentative data volume in staging | Run ANALYZE, compare row-count estimates to actual |
| Page slows down linearly as users paginate deeper | OFFSET-based pagination on a large table | Switch to keyset/cursor pagination |

### Observability and metrics to track
- Query latency percentiles per endpoint (p50/p95/p99), not table-wide averages.
- Index hit ratio / buffer cache hit ratio - a sustained drop signals working-set growth outpacing available memory.
- Row-count-examined vs row-count-returned ratio for hot queries, tracked over time to catch slow regressions before users complain.
- Lock wait time and deadlock counters - a rising trend under normal load growth often means a locking/index problem, not just "more traffic."

### Scalability and team practices
- Treat index changes as schema changes: reviewed migrations, not ad-hoc `CREATE INDEX` run manually against production.
- Load-test query changes against a production-sized dataset (or a sampled/anonymized copy) before shipping, not just a 200-row dev seed.
- Make "attach the EXPLAIN plan" a normal part of PR review for any query-touching change on a hot path - normalize showing your work, not just the final query.
- Budget index maintenance time into schema reviews for high-write tables - a 10th index on a table doing 1000 writes/sec is a real, measurable cost, and someone senior should explicitly sign off on that trade-off.

### Senior follow-up Q&A
1. **A query got slower after you added an index that should have helped. Why might that happen?** -> Stale table statistics could make the planner mis-estimate the new index's benefit and skip it; or the new index isn't actually a leftmost-prefix match for the query's filter order; or the table's write volume increased enough that the extra index's maintenance cost now shows up as generally slower throughput. First step: re-run ANALYZE and re-check the actual EXPLAIN plan, don't assume.
2. **How do you decide between adding a covering index and letting the query hit the table?** -> If the query is hot and its column set is stable, a covering index that turns it into an index-only scan is worth the extra storage/write cost. If the query is rare, or the SELECT list changes often (forcing frequent covering-index maintenance), it's often not worth it - measure before committing.
3. **You inherited a table with 40 indexes. How do you decide what to remove?** -> Check index usage stats over a representative time window (a full business cycle, not just a quiet week), cross-reference against actual query logs, drop indexes with zero or near-zero scans, and be conservative about indexes backing UNIQUE constraints or foreign keys even if "unused" for reads, since they may exist for correctness, not performance.
4. **How would you add an index to a 200-million-row table in production without causing an outage?** -> Postgres: `CREATE INDEX CONCURRENTLY` to avoid taking a blocking lock (at the cost of a slower, two-pass build and needing to handle a possible failed/invalid index). MySQL/InnoDB: rely on online DDL (`ALGORITHM=INPLACE`) where supported, and always test the exact ALTER against a staging clone first to know its actual duration and impact.
5. **Query plans look fine in staging but degrade in production under load. What do you check?** -> Data volume and skew differences (staging often has far less data or unrealistic distributions), connection pool exhaustion causing queueing rather than a query problem, lock contention from concurrent writers that staging's lower traffic never exercises, and whether staging's statistics are actually representative (ANALYZE run recently vs staging being stale).
6. **When would you deliberately choose NOT to add an obviously "correct" index?** -> When the table is extremely write-heavy and the query the index would serve is low-priority/rarely run - e.g. an internal admin report run twice a month doesn't justify a permanent tax on every insert to a high-throughput events table; a scheduled batch job or read replica is often the better trade-off.
7. **How would you explain index bloat to someone who's never heard of it, and what do you do about it?** -> In an MVCC database like Postgres, updates/deletes don't overwrite in place - they create new row versions, and indexes accumulate dead entries pointing at old versions until vacuumed. Over time on a high-churn table, this makes indexes physically larger and slightly slower than they need to be. Fix: tuned auto-vacuum settings for hot tables, and an occasional `REINDEX CONCURRENTLY` during a maintenance window if bloat has already accumulated significantly.

---
