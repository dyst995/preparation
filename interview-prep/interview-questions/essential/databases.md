# Databases — Essential (3-day)

Selected 90 of 500. Ordered by preparation priority within each tier.
Postgres-first; Redis/caching and consistency patterns included; niche NoSQL trivia cut.

## Must Know (40)

1. [DB-151](../databases/04-transactions.md#db-151) — What does ACID mean, and how does PostgreSQL deliver each property?
   Why: ACID is the interview entry point for every transaction and concurrency follow-up. Score: 4.90
2. [DB-156](../databases/04-transactions.md#db-156) — Which isolation levels does PostgreSQL implement?
   Why: You must name what Postgres actually implements before debating anomalies. Score: 4.85
3. [DB-157](../databases/04-transactions.md#db-157) — How does Read Committed behave?
   Why: Default isolation; most production bugs and race questions start here. Score: 4.80
4. [DB-159](../databases/04-transactions.md#db-159) — How does Repeatable Read work in PostgreSQL?
   Why: Snapshot isolation and serialization failures are core senior concurrency talk. Score: 4.75
5. [DB-164](../databases/04-transactions.md#db-164) — What is a lost update, and how do you prevent it?
   Why: Lost updates are the concurrency failure interviewers expect you to prevent. Score: 4.72
6. [DB-169](../databases/04-transactions.md#db-169) — What does `SELECT … FOR UPDATE` do?
   Why: Pessimistic locking is the practical tool for safe read-modify-write. Score: 4.70
7. [DB-101](../databases/03-indexing.md#db-101) — What a B-tree index stores
   Why: B-tree leaf/TID model is the base for every index and EXPLAIN discussion. Score: 4.68
8. [DB-102](../databases/03-indexing.md#db-102) — Why the planner sometimes prefers a sequential scan
   Why: Explains why 'add an index' is often the wrong first answer. Score: 4.65
9. [DB-103](../databases/03-indexing.md#db-103) — Leftmost prefix of a multicolumn index
   Why: Multicolumn leftmost-prefix rules show up constantly in query tuning. Score: 4.62
10. [DB-117](../databases/03-indexing.md#db-117) — Reading Index Scan vs Index Only vs Bitmap
   Why: Reading Index / Index Only / Bitmap plans is day-one EXPLAIN fluency. Score: 4.60
11. [DB-148](../databases/03-indexing.md#db-148) — Explaining “Filter” vs “Index Cond”
   Why: Filter vs Index Cond separates usable indexes from fake wins. Score: 4.55
12. [DB-007](../databases/01-sql-foundations.md#db-007) — An inner join keeps only matched rows
   Why: Inner join semantics and unmatched-row loss are baseline SQL. Score: 4.52
13. [DB-008](../databases/01-sql-foundations.md#db-008) — A left join keeps every left row
   Why: Left join preservation is required for correct reporting queries. Score: 4.50
14. [DB-011](../databases/01-sql-foundations.md#db-011) — A WHERE on the outer side discards the preserved row
   Why: Classic ON vs WHERE trap that silently turns outer joins into inner. Score: 4.48
15. [DB-015](../databases/01-sql-foundations.md#db-015) — A join changes the grain before COUNT runs
   Why: Join-grain mistakes before COUNT are a top production SQL bug. Score: 4.48
16. [DB-004](../databases/01-sql-foundations.md#db-004) — Comparisons with NULL yield unknown
   Why: Three-valued NULL logic breaks WHERE/CHECK reasoning without exception. Score: 4.45
17. [DB-013](../databases/01-sql-foundations.md#db-013) — WHERE filters rows; HAVING filters groups
   Why: WHERE vs HAVING is the grouping filter distinction interviewers probe. Score: 4.42
18. [DB-058](../databases/02-postgres-internals.md#db-058) — An update adds a tuple version and leaves the old one
   Why: MVCC update-as-new-version explains locking, vacuum, and bloat. Score: 4.40
19. [DB-059](../databases/02-postgres-internals.md#db-059) — A snapshot is the set of transaction ids a statement may see
   Why: Snapshots are how Postgres isolation is actually delivered. Score: 4.38
20. [DB-060](../databases/02-postgres-internals.md#db-060) — A plain read does not lock the row a writer needs
   Why: Readers not blocking writers is the key Postgres concurrency claim. Score: 4.35
21. [DB-176](../databases/04-transactions.md#db-176) — Do readers block writers in Postgres?
   Why: Direct answer to 'do readers block writers?' with table-lock nuance. Score: 4.32
22. [DB-055](../databases/02-postgres-internals.md#db-055) — A commit waits for WAL, and the heap page can stay dirty
   Why: WAL-before-commit is the durability mechanism behind ACID D. Score: 4.30
23. [DB-177](../databases/04-transactions.md#db-177) — How are deadlocks detected and resolved?
   Why: Deadlock detection/resolution is expected senior production knowledge. Score: 4.28
24. [DB-182](../databases/04-transactions.md#db-182) — What are the hazards of long-running transactions?
   Why: Long transactions cause vacuum, lock, and replica pain in real systems. Score: 4.25
25. [DB-202](../databases/05-data-modeling.md#db-202) — Explain 2NF and 3NF with a concrete example.
   Why: 2NF/3NF with an example is the core design interview ask. Score: 4.22
26. [DB-204](../databases/05-data-modeling.md#db-204) — How far should you normalize in a real OLTP application?
   Why: Practical normalize-vs-stop judgment for OLTP schemas. Score: 4.20
27. [DB-205](../databases/05-data-modeling.md#db-205) — When is denormalization justified?
   Why: When denormalization is justified—and how to stay honest about cost. Score: 4.18
28. [DB-212](../databases/05-data-modeling.md#db-212) — What does a foreign key guarantee, and what does it not?
   Why: FK guarantees and non-guarantees frame integrity vs application rules. Score: 4.15
29. [DB-149](../databases/03-indexing.md#db-149) — Choosing indexes from slow-query evidence
   Why: Evidence-first indexing process beats checklist indexes. Score: 4.12
30. [DB-252](../databases/06-scaling-ha.md#db-252) — Why are many direct connections a problem in PostgreSQL?
   Why: Connection explosion is the first scaling failure mode for Postgres. Score: 4.10
31. [DB-253](../databases/06-scaling-ha.md#db-253) — Explain PgBouncer session, transaction, and statement pooling.
   Why: PgBouncer modes are required knowledge for app-to-DB scaling. Score: 4.08
32. [DB-306](../databases/07-redis-caching.md#db-306) — Walk through cache-aside for a Postgres read.
   Why: Cache-aside is the default Redis+Postgres pattern in interviews. Score: 4.05
33. [DB-309](../databases/07-redis-caching.md#db-309) — What is a cache stampede, and how do you stop it?
   Why: Stampede control is the production failure mode of naive caching. Score: 4.02
34. [DB-196](../databases/04-transactions.md#db-196) — What is the transactional outbox pattern?
   Why: Transactional outbox is the standard dual-write fix. Score: 4.00
35. [DB-197](../databases/04-transactions.md#db-197) — Why is dual-write (DB + message broker) unsafe?
   Why: Why DB+broker dual writes fail—and what 'eventually consistent' really costs. Score: 3.98
36. [DB-200](../databases/04-transactions.md#db-200) — Optimistic vs pessimistic concurrency: how do you choose?
   Why: Optimistic vs pessimistic choice ties locks, versions, and retries together. Score: 3.95
37. [DB-073](../databases/02-postgres-internals.md#db-073) — ANALYZE writes the statistics the planner reads
   Why: ANALYZE/stats are why plans go wrong after data-shape changes. Score: 3.92
38. [DB-065](../databases/02-postgres-internals.md#db-065) — VACUUM reclaims space inside the file
   Why: VACUUM reclaim is the operational half of MVCC. Score: 3.90
39. [DB-251](../databases/06-scaling-ha.md#db-251) — Compare vertical and horizontal scaling for PostgreSQL. What do you try first?
   Why: Scale-up vs scale-out order of attack for Postgres systems. Score: 3.88
40. [DB-411](../databases/09-security-reliability.md#db-411) — SQL injection is untrusted text parsed as SQL
   Why: SQL injection remains a hard security floor for any DB interview. Score: 3.85

## Important (30)

1. [DB-016](../databases/01-sql-foundations.md#db-016) — Semi-joins and anti-joins ask about existence
   Why: EXISTS/NOT EXISTS semi- and anti-joins beat fragile NOT IN patterns. Score: 3.80
2. [DB-005](../databases/01-sql-foundations.md#db-005) — NOT IN drops the whole result when the subquery yields NULL
   Why: NOT IN + NULL is a high-frequency SQL footgun. Score: 3.75
3. [DB-104](../databases/03-indexing.md#db-104) — Index-only scans need the visibility map
   Why: Index-only scans need the visibility map—ties indexing to MVCC. Score: 3.72
4. [DB-105](../databases/03-indexing.md#db-105) — Partial indexes match a subset
   Why: Partial indexes are the selective-status/soft-delete win pattern. Score: 3.70
5. [DB-106](../databases/03-indexing.md#db-106) — Expression indexes need matching expressions
   Why: Expression indexes require matching predicates—common tuning miss. Score: 3.68
6. [DB-108](../databases/03-indexing.md#db-108) — CREATE INDEX CONCURRENTLY
   Why: CONCURRENTLY is how you add indexes without locking production. Score: 3.65
7. [DB-114](../databases/03-indexing.md#db-114) — Foreign keys and missing indexes
   Why: Missing FK indexes cause delete/update storms under load. Score: 3.62
8. [DB-120](../databases/03-indexing.md#db-120) — Too many indexes hurt writes
   Why: Write amplification from too many indexes is a senior trade-off. Score: 3.60
9. [DB-158](../databases/04-transactions.md#db-158) — In Read Committed, what happens when an `UPDATE` hits a row concurrently updated by another transaction?
   Why: Read Committed re-read-on-conflict behavior on concurrent UPDATE. Score: 3.58
10. [DB-172](../databases/04-transactions.md#db-172) — What is `SKIP LOCKED`, and when is it appropriate?
   Why: SKIP LOCKED is the worker-queue pattern on Postgres. Score: 3.55
11. [DB-175](../databases/04-transactions.md#db-175) — Why can a quick `ALTER TABLE` cause an outage?
   Why: Quick ALTER TABLE can still outage via lock queues. Score: 3.52
12. [DB-183](../databases/04-transactions.md#db-183) — What is "idle in transaction" and why is it harmful?
   Why: Idle-in-transaction is the #1 ops smell behind bloat and locks. Score: 3.50
13. [DB-190](../databases/04-transactions.md#db-190) — What is SQLSTATE `40001` and how should an application react?
   Why: 40001 serialization failure handling is required with SSI/RR. Score: 3.48
14. [DB-195](../databases/04-transactions.md#db-195) — How does connection pooling interact with transactions?
   Why: Pooling × transaction boundaries cause subtle production bugs. Score: 3.45
15. [DB-207](../databases/05-data-modeling.md#db-207) — UUID vs identity bigint as primary key: how do you choose?
   Why: UUID vs identity bigint is a recurring PK design debate. Score: 3.42
16. [DB-218](../databases/05-data-modeling.md#db-218) — How do you model a many-to-many relationship?
   Why: Many-to-many junction modeling is baseline relational design. Score: 3.38
17. [DB-244](../databases/05-data-modeling.md#db-244) — Why use `timestamptz` instead of `timestamp`?
   Why: timestamptz vs timestamp is a classic modeling correctness ask. Score: 3.35
18. [DB-247](../databases/05-data-modeling.md#db-247) — What are the main strategies for schema migrations without downtime?
   Why: Zero-downtime migration strategies every senior ships. Score: 3.32
19. [DB-067](../databases/02-postgres-internals.md#db-067) — Autovacuum schedules itself from dead tuples, inserts, and age
   Why: Autovacuum triggers and tuning for hot tables. Score: 3.28
20. [DB-254](../databases/06-scaling-ha.md#db-254) — What breaks under PgBouncer transaction pooling?
   Why: What breaks under transaction pooling—session-state landmines. Score: 3.25
21. [DB-256](../databases/06-scaling-ha.md#db-256) — What are read replicas good for, and what are their limits?
   Why: Read replica uses and hard limits (not write scaling). Score: 3.22
22. [DB-257](../databases/06-scaling-ha.md#db-257) — What causes replication lag and how do you measure it?
   Why: Lag causes and measurement for replica-backed reads. Score: 3.20
23. [DB-275](../databases/06-scaling-ha.md#db-275) — When should you partition a table, and what do you gain?
   Why: When partitioning helps—and what it does not buy you. Score: 3.18
24. [DB-292](../databases/06-scaling-ha.md#db-292) — How does point-in-time recovery work?
   Why: PITR is the durability/ops counterpart to WAL knowledge. Score: 3.15
25. [DB-304](../databases/07-redis-caching.md#db-304) — How do TTLs and eviction interact when Redis is near `maxmemory`?
   Why: TTL and eviction interaction near maxmemory. Score: 3.12
26. [DB-312](../databases/07-redis-caching.md#db-312) — How do you invalidate Redis when a Postgres transaction commits?
   Why: Invalidate Redis only after Postgres commit—consistency boundary. Score: 3.10
27. [DB-375](../databases/08-nosql-distributed.md#db-375) — Eventual consistency, stated precisely
   Why: Precise eventual consistency language for distributed answers. Score: 3.08
28. [DB-406](../databases/09-security-reliability.md#db-406) — Row-level security adds a hidden filter
   Why: RLS as the DB-side multi-tenant filter mechanism. Score: 3.05
29. [DB-477](../databases/10-real-world-architecture.md#db-477) — Expand/contract migrations
   Why: Expand/contract migrations are the safe schema-change pattern. Score: 3.02
30. [DB-021](../databases/01-sql-foundations.md#db-021) — UNIQUE allows many nulls unless NULLS NOT DISTINCT
   Why: UNIQUE + NULL semantics and NULLS NOT DISTINCT in PG15+. Score: 3.00

## Advanced (20)

1. [DB-160](../databases/04-transactions.md#db-160) — What is Serializable in PostgreSQL (SSI)?
   Why: SSI Serializable—when and how Postgres prevents write skew. Score: 2.95
2. [DB-165](../databases/04-transactions.md#db-165) — What is write skew? Show an example.
   Why: Write skew example separates snapshot isolation from true serializability. Score: 2.92
3. [DB-170](../databases/04-transactions.md#db-170) — What are the four row-lock strengths?
   Why: Four row-lock strengths matter for FOR SHARE / KEY SHARE designs. Score: 2.88
4. [DB-063](../databases/02-postgres-internals.md#db-063) — A HOT update does not add an index entry
   Why: HOT updates explain why some UPDATEs stay cheap. Score: 2.85
5. [DB-064](../databases/02-postgres-internals.md#db-064) — The visibility map is what lets an index-only scan skip the heap
   Why: Visibility map is the mechanism behind index-only scans. Score: 2.82
6. [DB-070](../databases/02-postgres-internals.md#db-070) — Wraparound is the server refusing new transaction ids
   Why: XID wraparound is the existential vacuum failure mode. Score: 2.80
7. [DB-035](../databases/01-sql-foundations.md#db-035) — DEFERRABLE moves the check to statement end or commit
   Why: DEFERRABLE constraints enable multi-row invariant updates safely. Score: 2.75
8. [DB-198](../databases/04-transactions.md#db-198) — How do you build the outbox relay on PostgreSQL?
   Why: Building the outbox relay on Postgres (SKIP LOCKED / polling). Score: 2.72
9. [DB-246](../databases/05-data-modeling.md#db-246) — Multi-tenancy: database-per-tenant vs schema-per-tenant vs shared tables with `tenant_id`?
   Why: Database/schema/shared-table tenancy trade-offs at staff depth. Score: 2.68
10. [DB-248](../databases/05-data-modeling.md#db-248) — Which DDL operations are risky on large tables in PG16, and how do you mitigate them?
   Why: Risky DDL on large PG16 tables and online mitigations. Score: 2.65
11. [DB-280](../databases/06-scaling-ha.md#db-280) — What are the common problems with partitioned tables?
   Why: Partitioning footguns: pruning, unique keys, and planning traps. Score: 2.62
12. [DB-311](../databases/07-redis-caching.md#db-311) — What does singleflight mean, and where do you put it?
   Why: Singleflight placement for stampede control at scale. Score: 2.58
13. [DB-332](../databases/07-redis-caching.md#db-332) — How do you lose read-your-writes with cache-aside, and how do you close the hole?
   Why: Cache-aside read-your-writes holes and how to close them. Score: 2.55
14. [DB-342](../databases/07-redis-caching.md#db-342) — Redis accepts the new value and Postgres then rolls back. What should the user observe?
   Why: Redis write then Postgres rollback—correct user-visible behavior. Score: 2.52
15. [DB-354](../databases/08-nosql-distributed.md#db-354) — When to keep Postgres as the source of truth
   Why: When Postgres must remain source of truth in polyglot designs. Score: 2.48
16. [DB-373](../databases/08-nosql-distributed.md#db-373) — CAP during a partition
   Why: CAP during partition—precise language for store-choice interviews. Score: 2.45
17. [DB-400](../databases/08-nosql-distributed.md#db-400) — Choosing a store in a system-design interview
   Why: Choosing a store in system design without cargo-cult NoSQL. Score: 2.42
18. [DB-463](../databases/10-real-world-architecture.md#db-463) — Saga vs 2PC
   Why: Saga vs 2PC for cross-service workflows. Score: 2.38
19. [DB-484](../databases/10-real-world-architecture.md#db-484) — Consistency for checkout vs feed
   Why: Consistency budget: checkout strictness vs feed freshness. Score: 2.35
20. [DB-485](../databases/10-real-world-architecture.md#db-485) — Idempotent order pipeline
   Why: Idempotent order pipeline across retries and consumers. Score: 2.32
