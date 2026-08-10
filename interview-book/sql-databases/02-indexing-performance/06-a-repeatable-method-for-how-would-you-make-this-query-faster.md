# 06. A repeatable method for "how would you make this query faster"

> Source: `interview-prep/sql-databases/02-indexing-performance.md`

1. **Ask what "slow" means** - how many rows, how often run, what's an acceptable latency.
2. **Get or imagine the EXPLAIN output** - identify sequential scans, filesort, temp tables, or row-estimate mismatches.
3. **Check for a missing/wrong index** - does the WHERE/JOIN/ORDER BY match an existing index's leftmost columns?
4. **Check for N+1** if this is happening inside application code with a loop.
5. **Check for unnecessary SELECT \*** - fetching columns you don't need prevents covering/index-only scans.
6. **Consider denormalization or caching only after indexing is exhausted** - don't jump straight to caching as the first fix.
7. **State the trade-off** - every index and every denormalization has a write-cost or consistency cost; say so.

---
