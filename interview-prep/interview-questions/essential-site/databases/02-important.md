# Essential Databases — Important

3-day essential set. 30 questions in preparation order. Full handbook remains under `databases/`.

### DB-016 — Semi-joins and anti-joins ask about existence

**Difficulty:** Senior

**Category:** Subqueries

**Question:**

Accounts Ada, Lin, Grace; invoices for Ada twice plus one with null `account_id`. Write queries for accounts with ≥1 invoice (once) and with none. Results?

**Answer:**

A semi-join asks whether a match exists, and it returns the left row once. `EXISTS` does that: Ada appears once, even though Ada has two invoices. The invoice with a null `account_id` equals nobody, so it does not attach to an account.

An anti-join asks whether no match exists. `NOT EXISTS` returns Lin and Grace. An inner join answers a different question: it repeats Ada once per invoice. `DISTINCT` can hide that repetition, but it is still starting from pairs rather than from existence.

**Code:**

```sql
SELECT a.* FROM account a
WHERE EXISTS (SELECT 1 FROM invoice i WHERE i.account_id = a.id);
```

**Trade-offs:**

Use `EXISTS` or `NOT EXISTS`, or a left join that keeps only null matches, when you mean presence or absence. That shape stays correct when the foreign key is nullable.

**Follow-up:**

Accounts whose invoice totals sum to ≥100?

Answer: Ada, if the invoices are 50 and 70. Sum in a grouped subquery and filter with `HAVING`. `WHERE i.total >= 100` on a join filters individual invoices, not the account's total.

### DB-005 — NOT IN drops the whole result when the subquery yields NULL

**Difficulty:** Advanced

**Category:** Nulls and three-valued logic

**Question:**

Applicants: `(1,'a@ex.com')`, `(2,'b@ex.com')`, `(3,NULL)`. Blocked: `'b@ex.com'`, NULL. Which ids does `WHERE email NOT IN (SELECT email FROM blocked)` return, and why?

**Answer:**

It returns no ids. `NOT IN` means the outer value must be not-equal to every value in the subquery. One null in `blocked` makes `email <> NULL` unknown for every applicant, and `WHERE` drops unknown. Even `'a@ex.com'` disappears, although it is not the blocked address.

`NOT EXISTS` asks a different question: is there a row where the emails are equal? Equality is never true for a null pair, so the null applicant is not blocked. That query returns ids 1 and 3. Add `email IS NOT NULL` if a null applicant must be excluded too.

**Code:**

```sql
SELECT a.id FROM applicant a
WHERE NOT EXISTS (SELECT 1 FROM blocked b WHERE b.email = a.email);
```

**Trade-offs:**

`NOT IN` is fine for a list you control that cannot contain null, such as `status NOT IN ('draft', 'void')`. Do not use it on a subquery column that is nullable.

**Follow-up:**

Same applicants: empty `blocked`, then only `'b@ex.com'`. What does `NOT IN` return?

Answer: An empty list excludes nobody, so ids 1, 2, and 3 all return. With only `'b@ex.com'`, id 1 returns. Id 3 drops because `NULL <> 'b@ex.com'` is unknown.

### DB-104 — Index-only scans need the visibility map

**Difficulty:** Senior

**Category:** Index-only

**Question:**

`EXPLAIN` shows Index Only Scan but `EXPLAIN ANALYZE` reports heap fetches. What does that mean?

**Answer:**

The plan is allowed to answer from the index only when every needed column is in the index and the heap page is all-visible. All-visible means every tuple on that page is visible to every transaction, so the scan does not have to check `xmin` and `xmax` in the heap.

If vacuum has not set the bit, or a later update cleared it, the scan still fetches that TID from the heap. Those are the heap fetches in `EXPLAIN ANALYZE`. `INCLUDE` can cover extra columns. It does not skip the visibility check.

**Follow-up:**

How do you add non-search columns without changing sort order of the key?

Answer: `CREATE INDEX ... ON t (a, b) INCLUDE (c, d);` `c` and `d` are stored in the leaf for index-only scans. They are not part of the search key or the sort order.

### DB-105 — Partial indexes match a subset

**Difficulty:** Intermediate

**Category:** Partial indexes

**Question:**

When is `CREATE INDEX ON jobs (id) WHERE state = 'pending'` better than indexing all rows, and what must the query do?

**Answer:**

A partial index stores only rows that match its predicate. If few jobs are pending, the index stays small, and updates that leave a row outside `pending` do not maintain an entry. The planner uses it only when it can prove the query's `WHERE` implies the index predicate. `state = 'pending'` does. A query that might need other states does not, because those rows are absent.

Changing `state` inserts or removes the partial entry. Do not use a partial index as the only index when most queries read every state.

**Trade-offs:**

One partial index on the hot slice is usually the win. A partial index per state multiplies write cost and rarely matches every query.

**Follow-up:**

Can `WHERE state IN ('pending','running')` use an index defined only for `pending`?

Answer: Not for the whole predicate. Running rows are not in the index. Use a predicate that covers both states, or a second index.

### DB-106 — Expression indexes need matching expressions

**Difficulty:** Intermediate

**Category:** Expression indexes

**Question:**

You index `(lower(email))`. Which query uses it, and what must be true of the function?

**Answer:**

An expression index stores the result of an expression, not the raw column. The query has to use that same expression. `WHERE lower(email) = lower($1)` can use the index. `WHERE email = $1` looks at the raw column and generally will not.

The expression must be immutable. PostgreSQL refuses to index a volatile function, and a stable function is not a safe lookup key because its result can change across calls. If every query applies the same transform, you can also store the normalized value on write and index that column directly.

**Code:**

```sql
CREATE INDEX ON users (lower(email));
SELECT * FROM users WHERE lower(email) = lower($1);
```

**Follow-up:**

Why might `WHERE email ILIKE 'x%'` not use `lower(email)`?

Answer: `ILIKE` is not the expression that was indexed. Write `lower(email) LIKE lower('x%')`, or add a trigram index when the pattern is not a simple prefix.

### DB-108 — CREATE INDEX CONCURRENTLY

**Difficulty:** Senior

**Category:** Maintenance

**Question:**

Why use `CREATE INDEX CONCURRENTLY`, and what failure mode leaves an INVALID index?

**Answer:**

A normal `CREATE INDEX` takes a `SHARE` lock that blocks writes until the build finishes. Reads can continue. `CREATE INDEX CONCURRENTLY` uses a weaker lock so inserts, updates, and deletes keep running. It builds the index in more than one pass, waits for old snapshots, and then validates. It cannot run inside a transaction block.

If the build fails, PostgreSQL can leave the index behind with `indisvalid` false. Queries ignore an invalid index, but writes still maintain it. Check `\d` or `pg_index.indisvalid` after a concurrent build, and drop the invalid index before you retry.

**Trade-offs:**

A concurrent build takes longer and does more I/O, because it scans twice and waits out other transactions. On a busy production table that cost is why you use it.

**Follow-up:**

How do you remove a failed INVALID index?

Answer: `DROP INDEX CONCURRENTLY` when the table must stay writable. A plain `DROP INDEX` is fine when you can take the stronger lock. Do not leave the invalid index in place.

### DB-114 — Foreign keys and missing indexes

**Difficulty:** Intermediate

**Category:** Foreign keys

**Question:**

You have `line_items.order_id` referencing `orders(id)`. Which side usually needs an index you might forget?

**Answer:**

The referenced side is already indexed. A foreign key must point at a primary key or a unique constraint, and that constraint has an index. PostgreSQL does not create an index on the referencing column.

`line_items.order_id` is the one people forget. A delete or a key update on `orders` has to find the child rows. Without an index, that is a sequential scan of `line_items`, and it holds a lock while it scans. Add an index on foreign-key columns you join, delete through, or cascade. A composite foreign key needs the leading columns of that index to match the key.

**Follow-up:**

Does PostgreSQL ever auto-create the referencing index?

Answer: No. The constraint creates only the unique index on the referenced columns. The child-side index is yours to add.

### DB-120 — Too many indexes hurt writes

**Difficulty:** Intermediate

**Category:** Anti-patterns

**Question:**

A table has twelve overlapping B-tree indexes “just in case.” What is the senior objection?

**Answer:**

Every insert, update, and delete maintains every index that the change touches. Twelve overlapping trees mean extra WAL, a larger cache footprint, and more work for autovacuum. Most of them are unused. `pg_stat_user_indexes.idx_scan` stays at zero through a full traffic cycle.

Add an index because a measured query needs that access path, not because a column might be filtered someday. Leading prefixes often make the narrower copies redundant. Drop the unused ones with `DROP INDEX CONCURRENTLY` after you have checked standbys, because reads may run there rather than on the primary.

**Trade-offs:**

A read-heavy reporting replica can carry indexes the primary should not pay for on the write path. Keep that split deliberate.

**Follow-up:**

How do you find unused indexes safely?

Answer: Watch `idx_scan` on the primary and on replicas for a full business cycle. Keep indexes that enforce uniqueness or support a foreign key. Then `DROP INDEX CONCURRENTLY`.

### DB-158 — In Read Committed, what happens when an `UPDATE` hits a row concurrently updated by another transaction?

**Difficulty:** Senior

**Category:** Isolation levels

**Question:**

In Read Committed, what happens when an `UPDATE` hits a row concurrently updated by another transaction?

**Answer:**

It waits for the other transaction to finish. If that one rolls back, the update proceeds normally. If it commits, Postgres fetches the newest version of the row and re-checks the `WHERE` clause against it (called EvalPlanQual). If the row still matches, it is updated; otherwise it is skipped. That is why `UPDATE accounts SET bal = bal - 10 WHERE id = 1 AND bal >= 10` is safe without explicit locking.

**Follow-up:**

Why can `SELECT` then `UPDATE` in application code still lose updates?

Answer: The value you read may already be stale when the `UPDATE` runs, and you write a result computed from it. The single atomic statement avoids that, because it re-checks the latest row.

### DB-172 — What is `SKIP LOCKED`, and when is it appropriate?

**Difficulty:** Intermediate

**Category:** Row locks

**Question:**

What is `SKIP LOCKED`, and when is it appropriate?

**Answer:**

`SKIP LOCKED` makes a locking query ignore rows that another transaction has locked, instead of waiting for them. Several workers can then each claim different rows at the same time. That makes it ideal for job queues. It deliberately returns an incomplete view of the table, so don't use it for ordinary reads or reports.

**Code:**

```sql
UPDATE jobs SET status = 'running'
WHERE id = (SELECT id FROM jobs WHERE status = 'queued'
            ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 1)
RETURNING *;
```

**Follow-up:**

What happens if a worker crashes mid-job?

Answer: Its lock disappears when the transaction rolls back. If you already committed `status = 'running'`, the job is stuck, so add a visibility timeout or heartbeat to re-queue stale jobs.

### DB-175 — Why can a quick `ALTER TABLE` cause an outage?

**Difficulty:** Senior

**Category:** Table locks

**Question:**

Why can a quick `ALTER TABLE` cause an outage?

**Answer:**

Many `ALTER TABLE` forms need an `ACCESS EXCLUSIVE` lock. If a long transaction is already using the table, the `ALTER` waits behind it. Every new query on that table then queues behind the waiting `ALTER`, so the table appears frozen. Set `lock_timeout` (for example `2s`) and retry, avoid long transactions, and prefer safe patterns: add a nullable column, add constraints as `NOT VALID` then `VALIDATE`, and use `CREATE INDEX CONCURRENTLY`.

**Follow-up:**

Does adding a column with a constant default rewrite the table?

Answer: Not since PG 11. It is a metadata-only change. A volatile default, such as `random()`, still rewrites the table.

### DB-183 — What is "idle in transaction" and why is it harmful?

**Difficulty:** Intermediate

**Category:** Long transactions and timeouts

**Question:**

What is "idle in transaction" and why is it harmful?

**Answer:**

It is a session that started a transaction, maybe ran some queries, and is now waiting for the client without committing. Its locks and snapshot stay open the whole time. That is the classic cause of blocked migrations and table bloat. Set `idle_in_transaction_session_timeout` so Postgres terminates such sessions automatically.

**Follow-up:**

Common causes?

Answer: A missing commit in application code, an ORM session left open during an HTTP call, or a crashed client whose pooled connection was never cleaned up.

### DB-190 — What is SQLSTATE `40001` and how should an application react?

**Difficulty:** Intermediate

**Category:** Retries

**Question:**

What is SQLSTATE `40001` and how should an application react?

**Answer:**

`40001` means `serialization_failure`: Postgres aborted the transaction because it conflicted with a concurrent one, mainly at Repeatable Read and Serializable. This is expected behaviour, not a bug. Your code must roll back and retry the whole transaction from `BEGIN`, not just the failed statement. A retry takes a new snapshot and normally succeeds.

**Follow-up:**

Can `COMMIT` itself raise 40001?

Answer: Yes, at Serializable. Some conflicts are only detected at commit, so wrap `COMMIT` in the retry logic too.

### DB-195 — How does connection pooling interact with transactions?

**Difficulty:** Senior

**Category:** ORM and pooling

**Question:**

How does connection pooling interact with transactions?

**Answer:**

In PgBouncer transaction mode, a client gets a server connection only for the length of one transaction. Session state like `SET`, session advisory locks, `LISTEN`, and temp tables therefore isn't safe. Use `SET LOCAL` and `pg_advisory_xact_lock` instead. Session mode keeps one connection per client, which is safer but pools less efficiently. A leaked open transaction ties up a pooled connection.

**Follow-up:**

Do prepared statements work through PgBouncer?

Answer: In transaction mode only on PgBouncer 1.21 or newer, which tracks protocol-level prepared statements. On older versions, turn off named server-side prepares in the driver.

### DB-207 — UUID vs identity bigint as primary key: how do you choose?

**Difficulty:** Intermediate

**Category:** Primary keys

**Question:**

UUID vs identity bigint as primary key: how do you choose?

**Answer:**

A `bigint GENERATED … AS IDENTITY` key is small at 8 bytes, increases steadily, and is fast to index and join. A UUID takes 16 bytes but can be generated by clients, merged across systems, and hides record counts. Random UUIDv4 values scatter inserts across the index and make it bigger. Use bigint for internal tables in one database, and UUID when IDs must be created outside the database or exposed publicly.

**Follow-up:**

Can you use both?

Answer: Yes. Use a bigint primary key for joins and foreign keys, plus a unique `public_id uuid` for external APIs. It costs one extra column and index, but separates internal performance from public identifiers.

### DB-218 — How do you model a many-to-many relationship?

**Difficulty:** Intermediate

**Category:** Relationships

**Question:**

How do you model a many-to-many relationship?

**Answer:**

Use a junction (association) table with two foreign keys, such as `student_courses(student_id, course_id)`. Put a composite primary key or unique constraint on the pair so duplicates are impossible. The foreign keys usually use `ON DELETE CASCADE`, because the row means nothing without both sides. Add an index on the second column if you also query from that side.

**Follow-up:**

Why not store an array of IDs in one column?

Answer: Arrays can't enforce referential integrity, and checking or changing membership is awkward. They are acceptable only for opaque lists that need no integrity and are rarely joined.

### DB-244 — Why use `timestamptz` instead of `timestamp`?

**Difficulty:** Intermediate

**Category:** Time zones

**Question:**

Why use `timestamptz` instead of `timestamp`?

**Answer:**

`timestamptz` stores an exact instant in time (UTC internally) and converts it to the session's `TimeZone` when displayed. `timestamp` stores a wall-clock reading with no zone and does no conversion. For things that happened at a moment, like `created_at` or payments, `timestamptz` avoids ambiguity and daylight saving bugs. Neither type remembers the original time zone.

**Follow-up:**

Does `timestamptz` save the user's timezone?

Answer: No. If you need the user's zone, for local display or recurring rules, store an IANA name like `'Europe/Tbilisi'` in a separate `text` column.

### DB-247 — What are the main strategies for schema migrations without downtime?

**Difficulty:** Staff

**Category:** Migrations

**Question:**

What are the main strategies for schema migrations without downtime?

**Answer:**

Keep versioned migrations in source control and use the expand/contract pattern. Expand: add new nullable columns or tables in a compatible way. Deploy code that writes to both old and new. Backfill existing rows in batches. Switch reads to the new structure. Contract: drop the old structures. Keep each deploy compatible with the previous app version, and never rename or drop a column in the same release that stops using it.

**Follow-up:**

Why backfill in batches?

Answer: One huge `UPDATE` holds locks, produces a lot of WAL, bloats the table, and keeps a long transaction that blocks vacuum. Batches commit incrementally and can be throttled.

### DB-067 — Autovacuum schedules itself from dead tuples, inserts, and age

**Difficulty:** Senior

**Category:** Vacuum

**Question:**

When does autovacuum vacuum `ticket`, when does it analyze it, and what is different about a wraparound worker?

**Answer:**

The autovacuum launcher starts workers. They are not permanent processes. A worker vacuums a table when dead tuples exceed `autovacuum_vacuum_threshold + autovacuum_vacuum_scale_factor * reltuples`. The defaults are 50 plus 20 percent. A separate insert threshold can vacuum a table that has grown by inserts even with few dead tuples.

Analyze uses its own threshold and scale factor, counted from modifications since the last analyze. An anti-wraparound worker is different. It still runs if `autovacuum` is off, its job is to advance the freeze horizon, and it does not yield to ordinary lock conflicts the way a normal vacuum does.

**Follow-up:**

`reltuples` 100, `n_dead_tup` 40. Does the default dead-tuple rule vacuum it?

Answer: No. The threshold is `50 + 0.2 * 100`, which is 70. Forty is below that, so a small table can stay bloated. Lower the scale factor or the threshold on that table if it matters.

### DB-254 — What breaks under PgBouncer transaction pooling?

**Difficulty:** Senior

**Category:** Connection pooling

**Question:**

What breaks under PgBouncer transaction pooling?

**Answer:**

Anything that assumes the same server connection across transactions: session-level `SET`, `LISTEN`, session advisory locks, temp tables, `WITH HOLD` cursors, and SQL-level `PREPARE`. PgBouncer 1.21 and newer can track protocol-level prepared statements through `max_prepared_statements`. On older versions, disable named prepared statements in your driver. Use `SET LOCAL` and `pg_advisory_xact_lock` as safe alternatives.

**Follow-up:**

How does a leaked `SET` show up as a bug?

Answer: A `search_path` or `statement_timeout` set by one client sticks to the pooled server connection and affects the next client, causing intermittent wrong-schema or timeout errors. Use `SET LOCAL` to prevent it.

### DB-256 — What are read replicas good for, and what are their limits?

**Difficulty:** Intermediate

**Category:** Read replicas

**Question:**

What are read replicas good for, and what are their limits?

**Answer:**

Replicas take read-heavy traffic, reporting, analytics, and backups off the primary, and they can serve as failover candidates. The limits: replication lag means reads can be stale, they can't accept writes, and they cost money. The app or a proxy must route queries between primary and replicas. Long queries on a hot standby can also conflict with WAL replay.

**Follow-up:**

Which queries should stay on the primary?

Answer: Anything needing read-your-writes: a read right after a write, login and session checks, balance or stock checks before a write, and anything inside a read-write transaction. Feeds, search, and dashboards can tolerate staleness and go to replicas.

### DB-257 — What causes replication lag and how do you measure it?

**Difficulty:** Senior

**Category:** Read replicas

**Question:**

What causes replication lag and how do you measure it?

**Answer:**

Common causes: bursts of writes, a slow standby disk or CPU, WAL replay running in a single process, limited network bandwidth, long standby queries that conflict with replay, and large transactions or bulk loads. On the primary, read `pg_stat_replication` (`write_lag`, `flush_lag`, `replay_lag`) or compare LSNs with `pg_wal_lsn_diff`. On a standby, use `now() - pg_last_xact_replay_timestamp()`, but note that it keeps growing when the primary is idle.

**Follow-up:**

Why can `pg_last_xact_replay_timestamp` mislead?

Answer: It is the commit time of the last replayed transaction. With no new writes on the primary, it keeps growing even though the standby is fully caught up. Compare LSNs for the true gap.

### DB-275 — When should you partition a table, and what do you gain?

**Difficulty:** Intermediate

**Category:** Partitioning

**Question:**

When should you partition a table, and what do you gain?

**Answer:**

Partition when a table is very large (typically hundreds of GB, or tens of millions of rows per period) and most queries filter on the partition key. You gain partition pruning, faster maintenance (vacuum and indexes work per partition), cheap retention (`DROP` or `DETACH` a partition instead of a mass `DELETE`), and better cache use for hot recent data. It is not a magic speedup: queries without the key still scan every partition.

**Follow-up:**

Does partitioning replace indexing?

Answer: No. Each partition still needs indexes for its queries. Partitioning narrows the data considered, and indexes make lookups within it fast.

### DB-292 — How does point-in-time recovery work?

**Difficulty:** Senior

**Category:** Backup & DR

**Question:**

How does point-in-time recovery work?

**Answer:**

Take a base backup and continuously archive WAL (`archive_mode = on` with `archive_command` or `archive_library`). To recover, restore the base backup, set `restore_command`, choose a target (`recovery_target_time`, `_lsn`, `_xid`, or `_name`), and create `recovery.signal`. Postgres replays archived WAL up to the target and then opens for use. It lets you recover from mistakes such as an accidental `DROP TABLE` or a bad deploy.

**Follow-up:**

What happens if `archive_command` keeps failing?

Answer: WAL accumulates in `pg_wal` and can fill the disk, which crashes the primary. Alert on `pg_stat_archiver.failed_count` and on archive lag.

### DB-304 — How do TTLs and eviction interact when Redis is near `maxmemory`?

**Difficulty:** Intermediate

**Category:** TTL & eviction

**Question:**

How do TTLs and eviction interact when Redis is near `maxmemory`?

**Answer:**

A TTL says when a key becomes logically stale. Eviction says which key is removed because the process is out of its memory budget. They are different levers. Expired keys are dropped lazily on access and by a background cycle that samples the keyspace, so under heavy load an expired key can sit in RAM a little while. If memory is still over the cap, Redis evicts according to `maxmemory-policy` even if the TTL has not fired. A cache needs both a TTL and an eviction policy.

**Follow-up:**

What happens if you set a TTL but leave `maxmemory` unset?

Answer: Redis will keep allocating until the machine is exhausted, because the default is no memory cap. TTLs still expire keys, but only on the lazy and active cycles, which do not guarantee you stay under RAM. The OS can then swap or kill the process, and a swap-backed Redis is slower than the Postgres you were trying to protect. Set `maxmemory` to a fraction of the host, leaving room for replication output buffers, client buffers, and copy-on-write during a fork.

### DB-312 — How do you invalidate Redis when a Postgres transaction commits?

**Difficulty:** Senior

**Category:** Invalidation

**Question:**

How do you invalidate Redis when a Postgres transaction commits?

**Answer:**

Delete or update the key only after the transaction commits. Doing it before the commit lets other requests refill from the old row, and a rollback leaves you with a hole for data you did not change. A reliable pattern is an outbox row inserted in the same transaction as the data change. A worker reads the outbox and deletes the Redis keys. A TTL remains the safety net for a missed message. `LISTEN/NOTIFY` is fine as a hint, and it is not a durable queue.

**Follow-up:**

Why is deleting the key safer than setting the new value from the outbox worker?

Answer: The worker might be slow, and a newer commit might already have happened. If it `SET`s the payload it read from the first event, it can overwrite a fresher cache entry with an older row. `UNLINK` only removes the key if you also guard it with a version check. A plain delete forces the next read to load the latest committed row. If you do write the value, write it only when its version is greater than or equal to the version already stored.

### DB-375 — Eventual consistency, stated precisely

**Difficulty:** Junior

**Category:** Consistency

**Question:**

What does eventual consistency mean, and what does the phrase not promise?

**Answer:**

If writes stop and replicas can still exchange messages, they converge on the same value. Reads during the lag may be old. Nothing in the word "eventual" sets a deadline. You add a deadline only by measuring one.

The term also does not say the newest business update wins. Last-write-wins can drop one of two conflicting edits and still converge. A disconnected replica can lag for minutes. MongoDB secondary reads are eventual relative to the primary. Writes through one primary already have an order. Say who may be stale, and what you do if two updates conflicted.

**Follow-up:**

Someone says "make it eventual" so the feature can be faster. What do you ask before you agree?

Answer: Ask which read may be stale, by how much, and what happens if a user acts on the old value. A search facet can lag, and a balance used to approve a debit cannot. If they want "under a second," measure replica lag instead of renaming the requirement eventual.

### DB-406 — Row-level security adds a hidden filter

**Difficulty:** Junior

**Category:** Row-level security

**Question:**

What does enabling row-level security do to a table?

**Answer:**

Row-level security, RLS, adds a policy filter so a role only sees and writes rows the policy allows. Turn it on with `ALTER TABLE invoices ENABLE ROW LEVEL SECURITY`. If RLS is enabled and no policy matches the current command, PostgreSQL denies the rows for every role that is subject to RLS. That default-deny is the safe outcome. A policy such as `CREATE POLICY tenant_iso ON invoices USING (tenant_id = current_setting('app.tenant_id')::uuid)` keeps tenant A from reading tenant B inside the same table. RLS is a second layer under grants. A role with no `SELECT` grant still cannot read the table. A role with `SELECT` reads only the rows the policy returns.

**Follow-up:**

What happens to rows that already exist when you enable RLS and forget the policy?

Answer: Roles that are subject to RLS suddenly see zero rows, and inserts fail the policy check. The table owner still sees every row unless you also `FORCE ROW LEVEL SECURITY`. Ship the policy in the same migration as `ENABLE ROW LEVEL SECURITY`, and include a `WITH CHECK` expression for writes. Roll forward in a transaction on a quiet table, or deploy the setting `app.tenant_id` in the application before you enable RLS, so production does not turn into an empty table for the app.

### DB-477 — Expand/contract migrations

**Difficulty:** Intermediate

**Category:** schema change

**Question:**

How does the expand/contract pattern enable zero-downtime schema changes?

**Answer:**

Expand first: add nullable columns, new tables, or dual-write paths while old code still runs. Migrate and backfill data. Deploy readers that understand both shapes, then writers that only use the new shape. Contract last: remove old columns and dual-write once traffic is clean. Never expand and contract in one deploy that requires a long lock on a hot table.

**Follow-up:**

Why avoid renaming a busy column in one step?

Answer: Renames and type changes can lock and break in-flight app versions; add a new column and dual-read instead.

### DB-021 — UNIQUE allows many nulls unless NULLS NOT DISTINCT

**Difficulty:** Advanced

**Category:** Constraints

**Question:**

`email text UNIQUE`. Inserts NULL, NULL, `'a@ex.com'`, `'a@ex.com'`, `'A@ex.com'`—which succeed? How allow only one null?

**Answer:**

By default a unique index is `NULLS DISTINCT`: null is not equal to null, so each null is allowed. Both null inserts succeed. The second `'a@ex.com'` collides with the first and fails with `23505`. The default collation is case-sensitive, so `'A@ex.com'` is a different value and succeeds too.

To allow only one null, declare `UNIQUE NULLS NOT DISTINCT (email)`. That form has existed since PostgreSQL 15, so it is available in 16. Nulls then compare as equal for this constraint. Case-insensitive uniqueness is a separate choice, such as a unique index on `lower(email)`.

**Follow-up:**

Third null insert, then `GROUP BY email` counting nulls?

Answer: The third null succeeds under the default unique rule. `GROUP BY email` puts all nulls in one group, so that group has count 3.
