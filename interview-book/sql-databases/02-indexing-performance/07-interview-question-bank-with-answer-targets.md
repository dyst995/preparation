# 07. Interview question bank (with answer targets)

> Source: `interview-prep/sql-databases/02-indexing-performance.md`

1. **What is a B-tree index and why does it speed up lookups?** -> sorted, balanced tree structure enabling O(log n) lookups and efficient range scans vs O(n) full scans.
2. **Clustered vs non-clustered/secondary index - how does MySQL InnoDB differ from Postgres?** -> InnoDB clusters the table by primary key; Postgres tables are heaps with all indexes pointing to a physical row location.
3. **What is the leftmost-prefix rule for composite indexes?** -> a composite index can serve queries filtering on a prefix of its columns, in order; skipping the first column mostly defeats it.
4. **What is a covering index / index-only scan?** -> when the index alone contains every column the query needs, avoiding a trip to the table.
5. **Why isn't it a good idea to index every column?** -> write cost, storage cost, low-selectivity columns rarely benefit, planner overhead.
6. **How do you diagnose a slow query?** -> EXPLAIN / EXPLAIN ANALYZE, look for seq scans, filesort, temp tables, estimate-vs-actual mismatches.
7. **What is the N+1 problem? How do you spot it in an ORM-based codebase?** -> one query for a list plus one query per row for relations; spot it via query logs showing repeated near-identical queries in a loop.
8. **How do you fix N+1 in TypeORM specifically?** -> `relations` option or `leftJoinAndSelect` for JOIN-based eager loading; batched `IN` queries for wide fan-out cases.
9. **Does a foreign key column get indexed automatically?** -> not always - depends on engine/ORM defaults; explicitly index foreign key columns used in JOINs/WHERE, since unindexed FKs are a very common real-world slow-query cause.
10. **What's the difference between EXPLAIN and EXPLAIN ANALYZE?** -> planned estimate only vs actual execution with real timings/row counts.

---
