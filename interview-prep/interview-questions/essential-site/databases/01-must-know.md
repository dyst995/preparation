# Essential Databases — Must Know

3-day essential set. 40 questions in preparation order. Full handbook remains under `databases/`.

### DB-151 — What does ACID mean, and how does PostgreSQL deliver each property?

**Difficulty:** Intermediate

**Category:** ACID and basics

**Question:**

What does ACID mean, and how does PostgreSQL deliver each property?

**Answer:**

ACID is four guarantees for a transaction. Atomicity: all of its changes commit or none do; rolled-back row versions simply stay invisible. Consistency: constraints such as primary keys, foreign keys, and checks hold at commit, but business rules beyond constraints are your job. Isolation: concurrent transactions don't see each other's uncommitted work, using MVCC snapshots plus locks. Durability: Postgres flushes the write-ahead log (WAL) before `COMMIT` returns, so committed data survives a crash.

**Follow-up:**

What does `synchronous_commit = off` risk?

Answer: After a crash you can lose the last few commits, because their WAL was not yet flushed. The database stays consistent, and no transaction is applied partially.

### DB-156 — Which isolation levels does PostgreSQL implement?

**Difficulty:** Intermediate

**Category:** Isolation levels

**Question:**

Which isolation levels does PostgreSQL implement?

**Answer:**

SQL has four level names, but Postgres implements three distinct behaviours. **Read Committed** is the default. **Repeatable Read** gives you snapshot isolation. **Serializable** uses Serializable Snapshot Isolation (SSI). `READ UNCOMMITTED` is accepted but behaves exactly like Read Committed, so dirty reads never happen in Postgres.

**Follow-up:**

Which anomalies does each level permit in Postgres?

Answer: Read Committed allows non-repeatable reads, phantoms, lost updates, and write skew. Repeatable Read still allows write skew and the read-only anomaly. Serializable allows none of them.

### DB-157 — How does Read Committed behave?

**Difficulty:** Intermediate

**Category:** Isolation levels

**Question:**

How does Read Committed behave?

**Answer:**

Each statement gets a fresh snapshot of everything committed before that statement started, plus your own earlier changes. So two identical `SELECT`s in the same transaction can return different results if someone committed in between. It is the default because it rarely produces serialization errors, so most code works without retry logic.

**Follow-up:**

Does a single statement ever see two different states?

Answer: No, the snapshot is fixed for the whole statement. The exception is that `UPDATE` or `SELECT … FOR UPDATE` may re-read a newer version of a row it had to wait for (see DB-158).

### DB-159 — How does Repeatable Read work in PostgreSQL?

**Difficulty:** Intermediate

**Category:** Isolation levels

**Question:**

How does Repeatable Read work in PostgreSQL?

**Answer:**

The transaction takes one snapshot at its first query and uses it until it ends, so all reads are consistent with each other. Postgres also prevents phantom reads here, which is stronger than the SQL standard requires. If the transaction tries to update, delete, or lock a row that another transaction changed and committed after the snapshot, it fails with `40001 could not serialize access due to concurrent update`, and you retry.

**Follow-up:**

Is the snapshot taken at `BEGIN`?

Answer: No. It is taken at the first query that is not a transaction-control command, so a transaction that sits idle after `BEGIN` still gets a fresh snapshot later.

### DB-164 — What is a lost update, and how do you prevent it?

**Difficulty:** Intermediate

**Category:** Anomalies

**Question:**

What is a lost update, and how do you prevent it?

**Answer:**

A lost update happens when two transactions read the same value, each computes a new one, and the second write overwrites the first. One change disappears. You can prevent it with a single atomic statement such as `SET n = n + 1`, with `SELECT … FOR UPDATE`, or with an optimistic version check. Repeatable Read or Serializable also work, if you retry on `40001`.

**Follow-up:**

Why does Repeatable Read prevent it?

Answer: The second writer finds the row was changed after its snapshot and gets a serialization error instead of silently overwriting. Your code then retries with fresh data.

### DB-169 — What does `SELECT … FOR UPDATE` do?

**Difficulty:** Intermediate

**Category:** Row locks

**Question:**

What does `SELECT … FOR UPDATE` do?

**Answer:**

It locks the rows it returns until the transaction ends, so no one else can update, delete, or lock them in the meantime. Other transactions that try either wait, or fail or skip if they use `NOWAIT` or `SKIP LOCKED`. Plain `SELECT`s are not affected. It is the usual tool for pessimistic read-modify-write: read a row, decide, then update it safely.

**Follow-up:**

Can you use it with `GROUP BY`, `DISTINCT`, or aggregates?

Answer: No, because those results don't map to individual rows. Joins are allowed, and `FOR UPDATE OF table` lets you choose which joined tables to lock.

### DB-101 — What a B-tree index stores

**Difficulty:** Intermediate

**Category:** B-tree

**Question:**

In PostgreSQL 16, what does a default B-tree index on `orders(customer_id)` store in leaf entries, and how does that relate to heap lookups?

**Answer:**

A default B-tree is a separate relation, ordered by the indexed columns. Each leaf entry stores the key, here `customer_id`, and a TID: the heap block number and the line-pointer offset of the row. Internal pages store separator keys so a search can pick a child without reading every leaf.

An index scan walks the matching leaves, then fetches each heap tuple by that TID, unless an index-only scan is allowed to skip the heap. The index does not replace the table. An update that changes `customer_id` must maintain both the heap version and the index entry.

**Follow-up:**

Does the leaf store the full heap row?

Answer: No. It stores the index keys, plus any `INCLUDE` columns, and the TID. Other columns come from the heap. An index-only scan can skip that fetch only when the visibility map says the page is all-visible.

### DB-102 — Why the planner sometimes prefers a sequential scan

**Difficulty:** Intermediate

**Category:** Planner

**Question:**

A selective-looking `WHERE status = 'open'` still chooses Seq Scan on a large table that has an index on `status`. Why might that be correct?

**Answer:**

An index is not automatically cheaper. The planner estimates how many rows match, using `n_distinct`, the most common values, and the histogram from `ANALYZE`. If `open` is most of the table, an index scan would jump to a heap page for almost every row. One sequential read of the heap is cheaper than that random I/O.

Correlation matters too. If matching rows are scattered, each TID is a random fetch. If they sit together, an index range is cheaper. Check the choice with `EXPLAIN (ANALYZE, BUFFERS)` rather than assuming the index should have been used.

**Trade-offs:**

A partial index on a rare status, or rows physically ordered by that column, can change the winner. PostgreSQL has no hint syntax to force an index. Fix the statistics or the predicate.

**Follow-up:**

What command refreshes the stats the planner uses?

Answer: `ANALYZE`, or the analyze pass autovacuum runs. Stale statistics after a bulk load are a common reason for a plan that no longer matches the data.

### DB-103 — Leftmost prefix of a multicolumn index

**Difficulty:** Intermediate

**Category:** Multicolumn

**Question:**

You have `CREATE INDEX ON events (tenant_id, created_at, kind)`. Which of these can use the index efficiently: filter on `tenant_id`; on `created_at` alone; on `tenant_id` and `kind` without `created_at`?

**Answer:**

A B-tree is ordered from the left. A search can use a leading prefix of equality columns, then a range on the next column. `tenant_id = ...` uses this index. `created_at` alone does not, because those values are not contiguous without a tenant. PostgreSQL 16 has no index skip scan to jump from tenant to tenant.

`tenant_id` plus `kind`, with no equality on `created_at`, uses the tenant prefix and then filters `kind`. It cannot treat `kind` as the next ordered column. Put columns you always test with equality first, then the column you range-scan or order by.

**Follow-up:**

Where should `created_at` sit if most queries are `tenant_id = $1 ORDER BY created_at`?

Answer: Second: `(tenant_id, created_at)`. Equality on the tenant, then the order column. Put `kind` later, or in its own index, if those queries do not filter it.

### DB-117 — Reading Index Scan vs Index Only vs Bitmap

**Difficulty:** Intermediate

**Category:** EXPLAIN

**Question:**

In one sentence each: Index Scan, Index Only Scan, Bitmap Heap Scan—what differs for I/O?

**Answer:**

An index scan walks the index in key order and fetches each matching heap tuple by TID, so scattered matches become random I/O. An index-only scan answers from the index when the visibility map says the heap page is all-visible, and otherwise falls back to a heap fetch for that TID. A bitmap heap scan collects TIDs from one or more indexes, then reads the heap in physical page order.

Which one wins depends on how many rows match, how close those rows are on disk, and whether the index contains every column the query needs.

**Follow-up:**

Which number in `EXPLAIN ANALYZE` proves the estimate was wrong?

Answer: Compare estimated rows with actual rows on the same node. A large gap means the statistics, or a correlation the planner cannot see, are off.

### DB-148 — Explaining “Filter” vs “Index Cond”

**Difficulty:** Intermediate

**Category:** EXPLAIN

**Question:**

`EXPLAIN` shows Index Cond and also Filter. What is the difference?

**Answer:**

Index Cond is the part of the predicate pushed into the index search. It limits which leaves are visited. Filter runs after a row is fetched, so it did not narrow the range. That happens when the column is not in the index, or the operator cannot become a range.

A Filter that drops a few rows is normal. A Filter that drops almost every fetched row means you read a lot of heap for a tiny result. Put the selective test into the index, or rewrite it so the index can apply it.

**Follow-up:**

Is a Filter always a problem?

Answer: No. A residual check is normal. It is a problem when the scan fetches far more rows than the query returns.

### DB-007 — An inner join keeps only matched rows

**Difficulty:** Intermediate

**Category:** Joins

**Question:**

Customers Ada/10, Grace/20, Lin/40; orders (1,10,50), (2,20,80), (3,30,10). Which rows does `customer JOIN order_header ON customer_id = id` return?

**Answer:**

An inner join returns only pairs that satisfy the `ON` condition. Here that is Ada with order 1, and Grace with order 2. Order 3 points at customer 30, who is not in the table, so that order disappears. Lin has no order, so Lin disappears too.

A null key would not match under `=`, because the comparison is unknown. If Ada had two orders, her name would appear twice. That is the join repeating the customer for each match, not a bug in the customer table.

**Trade-offs:**

Write `JOIN ... ON` rather than a comma in `FROM` plus a `WHERE` condition. A missing condition then fails at parse time instead of silently returning a cross product. Avoid `NATURAL JOIN`: the only shared name here is `id`, and that would match nothing.

**Follow-up:**

How many rows is `customer CROSS JOIN order_header`?

Answer: 9. Every customer is paired with every order, whether or not the ids match.

### DB-008 — A left join keeps every left row

**Difficulty:** Senior

**Category:** Joins

**Question:**

Same customers/orders as DB-007. What does `customer LEFT JOIN order_header` return, and who would an inner join drop?

**Answer:**

A left join starts from every row of the left table and looks for matches on the right. Ada still pairs with order 1, and Grace with order 2. Lin has no order, so Lin is kept and the order columns are null. Order 3 is still absent, because the join preserves customers, not orders.

An inner join would drop Lin, because Lin has no matching order. The nulls on Lin's order columns mean "no match," not an order whose total happens to be null. Later filters have to respect that difference.

**Trade-offs:**

If you left-join orders and then inner-join payments on the order id, the inner join throws away the unmatched left rows. Lin disappears, and so does a customer whose order has no payment.

**Follow-up:**

After left join to orders, `JOIN payment ON invoice_id = o.id` with one payment for order 1—who remains?

Answer: Only Ada. The inner join to payment filters the output of the left join, so Grace and Lin no longer qualify.

### DB-011 — A WHERE on the outer side discards the preserved row

**Difficulty:** Advanced

**Category:** Joins

**Question:**

Same data. Query A puts `total >= 80` in `ON` of a left join; Query B puts it in `WHERE`. What does each return?

**Answer:**

`ON` decides which right-hand rows match. `WHERE` runs after the join and can throw away a preserved left row. In query A, `total >= 80` only limits matches. Ada's 50 does not match, so Ada stays with null order columns. Grace matches. Lin stays unmatched. The result is Ada/null, Grace/2, Lin/null.

Query B applies `WHERE total >= 80` after the join. Ada's 50 fails, and Lin's null test is unknown, so only Grace/2 remains. Put the test in `ON` to keep unmatched left rows, and in `WHERE` when a match is required.

**Follow-up:**

Query A uses `ON ... AND c.name <> 'Lin'`. Does Lin appear?

Answer: Yes, with a null order id. A false condition on the preserved side only prevents a match. It does not remove Lin.

### DB-015 — A join changes the grain before COUNT runs

**Difficulty:** Senior

**Category:** Aggregation

**Question:**

Accounts Ada/Lin; Ada has invoices 1 (two lines) and 2 (one line). Author’s query inner-joins account→invoice→line and `COUNT(*)` “invoices including none.” What does it return, and what is the correct invoice count query?

**Answer:**

`COUNT(*)` counts the rows that exist after the joins, not the thing named in the comment. Joining through invoice lines changes the grain from accounts to lines. Ada has three lines, so the count is 3. Lin has no invoice, and the inner joins drop Lin entirely. The query is counting lines and missing accounts with no invoices.

Count invoices by left-joining only to `invoice` and using `COUNT(i.id)`. A null invoice id is not counted, so Ada is 2 and Lin is 0. Do not join to line items unless the question is about lines.

**Code:**

```sql
SELECT a.name, COUNT(i.id) AS n_invoices
FROM account a
LEFT JOIN invoice i ON i.account_id = a.id
GROUP BY a.id;
```

**Follow-up:**

Second line on invoice 2—author’s `COUNT(*)` vs `COUNT(DISTINCT i.id)`?

Answer: The author's count becomes 4 for Ada. `COUNT(DISTINCT i.id)` stays 2. Lin is still absent, because the inner joins never produce a Lin row.

### DB-004 — Comparisons with NULL yield unknown

**Difficulty:** Senior

**Category:** Nulls and three-valued logic

**Question:**

What does `NULL = NULL` return, and which rows does `WHERE n <> 1` keep for values 1, 2, and NULL?

**Answer:**

SQL comparisons use three results: true, false, and unknown. `=` or `<>` is unknown when either side is null, so `NULL = NULL` is unknown. `WHERE` keeps a row only when the test is true. False and unknown both drop it.

For 1, 2, and null, `n <> 1` keeps only 2. The null row is not "not equal" to 1. Test nulls with `IS NULL`, or use `IS NOT DISTINCT FROM` when null should count as a match. If a missing status must still appear, write that on purpose: `status <> 'closed' OR status IS NULL`.

**Trade-offs:**

Use a real domain value when "missing" and "not applicable" mean different things. A sentinel such as an empty string avoids three-valued logic, but it can pass checks and joins as if it were real data.

**Follow-up:**

What does `CHECK (amount > 0)` do with a null `amount`?

Answer: `NULL > 0` is unknown. A `CHECK` accepts both true and unknown, so the row is stored. The same test in `WHERE` would drop it. Add `NOT NULL` when null is not allowed.

### DB-013 — WHERE filters rows; HAVING filters groups

**Difficulty:** Senior

**Category:** Grouping

**Question:**

Sales east 10/30, west 5/NULL. Query: `WHERE amount > 5 GROUP BY region HAVING SUM(amount) >= 30`. What returns, and why can’t `SUM` live in `WHERE`?

**Answer:**

`WHERE` filters input rows before groups exist, so it cannot contain an aggregate. `HAVING` filters groups after `SUM` has been computed. `WHERE SUM(...)` is a syntax error.

Here `amount > 5` keeps east 10 and east 30. West's 5 fails, and its null is unknown, so west forms no group at all. East's sum is 40, which passes `HAVING SUM(amount) >= 30`. The result is one row: east, 40, with a row count of 2.

**Follow-up:**

Drop `WHERE`, keep `HAVING SUM(amount) >= 30`?

Answer: Still only east, with sum 40. West's sum is 5 because `SUM` skips the null, and 5 fails the `HAVING`.

### DB-058 — An update adds a tuple version and leaves the old one

**Difficulty:** Intermediate

**Category:** MVCC

**Question:**

What does a committed `UPDATE` store, and what do `xmin` and `xmax` mean on each version?

**Answer:**

PostgreSQL does not overwrite a row in place. An `INSERT` stores a tuple whose `xmin` is the inserter and whose `xmax` is empty. An `UPDATE` adds a tuple with `xmin` set to the updater, and sets the old tuple's `xmax` to that same id. `DELETE` only sets `xmax`.

After commit, a new snapshot sees the new version. The old one stays until no snapshot needs it. `xmin` is who created that version. `xmax` is who deleted or replaced it, or, with lock bits, who holds a row lock. One key can have several heap versions.

**Trade-offs:**

Readers and writers do not block each other, because each keeps its own version. The cost is dead tuples, and often index entries, until vacuum. Overwriting in place would avoid that and would break snapshot reads.

**Follow-up:**

Insert a second row and roll back. Must vacuum remove a “dead” row for visibility?

Answer: No. Another snapshot never sees a tuple whose `xmin` aborted. Vacuum may reclaim the space later. Rollback does not write a compensating delete.

### DB-059 — A snapshot is the set of transaction ids a statement may see

**Difficulty:** Senior

**Category:** MVCC

**Question:**

What is in a snapshot, and how does it decide heap visibility? Ledger has committed 100→250, plus uncommitted updater U creating 300.

**Answer:**

A snapshot says which transactions a statement may see. It holds the oldest still-running id, the next unused id, and the ids that were in progress. A committed id before that horizon, and not in the in-progress set, is visible. An aborted id never is.

Balance 100 is invisible because it was superseded. Balance 250 stays visible because U has not committed. Balance 300 is invisible because its `xmin` is U. Your own uncommitted work uses command ids. Hint bits cache status, but the rule is the snapshot plus the commit log.

**Trade-offs:**

Read Committed takes a new snapshot per statement, so later statements see other commits. Repeatable Read and Serializable keep one snapshot for the transaction. That view stays stable, and it holds the vacuum horizon longer.

**Follow-up:**

U rolls back. What does the reader’s next statement return, and what remains on the page?

Answer: The next statement returns 250. The tuple with balance 300 stays until vacuum or page prune, with an aborted `xmin`. Rollback does not bring 100 back.

### DB-060 — A plain read does not lock the row a writer needs

**Difficulty:** Senior

**Category:** MVCC

**Question:**

Why can a `SELECT` run while another session’s `UPDATE` of the same row runs? What does block? Read Committed.

**Answer:**

A plain `SELECT` takes an `ACCESS SHARE` lock on the table. An `UPDATE` takes `ROW EXCLUSIVE`. Those locks are compatible, so the statements run together. The reader does not lock the tuple. Its snapshot still sees the old version while the writer's transaction is in progress.

A second writer does block. It needs the row lock stored in the first writer's `xmax`. After the first writer commits, Read Committed rechecks the `WHERE` clause against the new version. `SELECT FOR UPDATE` joins that lock queue on purpose. `ACCESS EXCLUSIVE`, used by `VACUUM FULL`, conflicts with readers too.

**Trade-offs:**

Snapshot reads let a report scan while writers update. The report may see a slightly older value. Use `FOR UPDATE` or `FOR SHARE` when the reader must wait for the lock.

**Follow-up:**

W2 waited with `WHERE ... balance_cents = 250`; W commits 300. What does W2 store?

Answer: No row. After W2 wakes up, the recheck sees 300 and the `WHERE` fails. It does not write based on the old predicate.

### DB-176 — Do readers block writers in Postgres?

**Difficulty:** Intermediate

**Category:** Table locks

**Question:**

Do readers block writers in Postgres?

**Answer:**

No. Plain reads take only an `ACCESS SHARE` lock and read from a snapshot, so writers never wait for readers and readers never wait for writers. Writers block only other writers that touch the same row. The exception is DDL that needs a strong table lock, which can block everyone, readers included.

**Follow-up:**

Exceptions?

Answer: Explicit locking reads such as `FOR UPDATE`, `LOCK TABLE`, and DDL that takes `ACCESS EXCLUSIVE`.

### DB-055 — A commit waits for WAL, and the heap page can stay dirty

**Difficulty:** Senior

**Category:** WAL

**Question:**

Walk through `COMMIT` for one-row `UPDATE` when `synchronous_commit` is on. What is durable when it returns, and what may still be only in memory?

**Answer:**

The `UPDATE` writes a new heap version and a WAL record for that change. That is not yet a commit. `COMMIT` appends a commit record and, with `synchronous_commit` and `fsync` on, flushes WAL through that record to durable media. When `COMMIT` returns, recovery can replay the transaction.

The heap page may still be dirty in `shared_buffers`. The checkpointer, the background writer, or a backend evicting the buffer writes it later. A data page is not written until its WAL has been flushed. Group commit can share one flush. Each `COMMIT` still waits until its own record is durable.

**Trade-offs:**

`synchronous_commit = off` returns after the commit record is buffered. The WAL writer flushes soon after. Latency drops, and a crash can lose those last commits. Waiting for a remote replica is a separate setting.

**Follow-up:**

`UPDATE` ran; no `COMMIT`; power fails. What is `balance_cents` after startup?

Answer: The previous committed value. WAL for the update may exist, but without a commit record recovery aborts that transaction.

### DB-177 — How are deadlocks detected and resolved?

**Difficulty:** Senior

**Category:** Deadlocks

**Question:**

How are deadlocks detected and resolved?

**Answer:**

A deadlock is a cycle where each transaction waits for a lock another one holds. When a session has waited longer than `deadlock_timeout` (default 1 second), Postgres checks the wait-for graph for a cycle. If it finds one, it aborts one participant with `40P01 deadlock detected` and the others continue. The aborted transaction must be rolled back, and usually retried.

**Follow-up:**

Why 1 s rather than immediately?

Answer: The check is relatively expensive and most lock waits end quickly on their own. Waiting first avoids running it for harmless waits.

### DB-182 — What are the hazards of long-running transactions?

**Difficulty:** Senior

**Category:** Long transactions and timeouts

**Question:**

What are the hazards of long-running transactions?

**Answer:**

A long transaction holds its locks, which can block DDL and other writers. It also holds back the oldest-visible-transaction horizon, so `VACUUM` can't remove dead rows, causing bloat and slower queries. It can keep WAL around when tied to replication, cause serialization failures at higher isolation levels, and delay schema changes or failover. Watch for old `xact_start` values in `pg_stat_activity`.

**Follow-up:**

Does a long-running read-only query have the same problem?

Answer: Yes for the vacuum horizon, since its snapshot is still open. On a standby it can also conflict with WAL replay and get cancelled.

### DB-202 — Explain 2NF and 3NF with a concrete example.

**Difficulty:** Intermediate

**Category:** Normalization

**Question:**

Explain 2NF and 3NF with a concrete example.

**Answer:**

2NF says no non-key column may depend on only part of a composite key. In `order_items(order_id, product_id, product_name, qty)`, `product_name` depends only on `product_id`, so it belongs in `products`. 3NF says no non-key column may depend on another non-key column. In `employees(id, dept_id, dept_name)`, `dept_name` depends on `dept_id`, so it belongs in `departments`.

**Follow-up:**

What bug does violating 3NF cause?

Answer: Update anomalies. Renaming a department means changing many rows, and missing one leaves inconsistent data. You also get insert and delete anomalies: you can't record a department with no employees, and deleting its last employee erases the department.

### DB-204 — How far should you normalize in a real OLTP application?

**Difficulty:** Intermediate

**Category:** Normalization

**Question:**

How far should you normalize in a real OLTP application?

**Answer:**

Default to 3NF for transactional data. It protects integrity and keeps writes simple. Treat higher normal forms as a checklist for suspicious tables rather than a goal. Normalize first, measure with `EXPLAIN`, and denormalize only specific read paths when you have evidence. Over-normalizing, such as one table per attribute, creates join sprawl and complicated queries for little benefit.

**Follow-up:**

How do you spot a table that needs more normalization?

Answer: Look for repeated values that must change together, columns that are NULL depending on another column's value, and one logical change that updates many rows. These point to a missing entity.

### DB-205 — When is denormalization justified?

**Difficulty:** Intermediate

**Category:** Denormalization

**Question:**

When is denormalization justified?

**Answer:**

When a measured read path is too slow or too complex, and the copied data either changes rarely or can be kept consistent cheaply. Typical cases are read models, precomputed totals and counts, snapshots of values that must not change later (the price at purchase time), and avoiding hot multi-table joins. Always record where the source of truth is and how the copy gets refreshed.

**Follow-up:**

Is copying the product price into `order_items` denormalization?

Answer: Not really. It is a historical snapshot, a different fact from the current `products.price`. The current price can change, but the order must keep what the customer actually paid.

### DB-212 — What does a foreign key guarantee, and what does it not?

**Difficulty:** Intermediate

**Category:** Foreign keys

**Question:**

What does a foreign key guarantee, and what does it not?

**Answer:**

A foreign key guarantees that the referencing value exists in the referenced table's unique or primary key columns (or is NULL), and it defines what happens when the parent row changes. It does not create an index on the referencing column. Without that index, deleting or updating a parent row has to scan the child table, which is slow and can hold locks longer.

**Follow-up:**

Should every FK column be indexed?

Answer: Almost always, for joins and for the checks done when a parent changes. The exceptions are tiny tables, or cases where you have confirmed the parent is never deleted or updated.

### DB-149 — Choosing indexes from slow-query evidence

**Difficulty:** Senior

**Category:** Process

**Question:**

Outline a senior process before adding an index to fix a slow query.

**Answer:**

Start from `EXPLAIN (ANALYZE, BUFFERS)` on realistic data. Compare estimated rows with actual rows. If they disagree, `ANALYZE` or extended statistics come before a new index. If they agree, decide whether the sequential scan is already cheap. A missing index on the referencing side of a foreign key is a common gap.

Design the smallest index that matches the filter and the `ORDER BY`. Build it with `CREATE INDEX CONCURRENTLY`, then explain again. Keep it only if the measured plan got cheaper.

**Follow-up:**

What is a red flag in the plan before you touch indexes?

Answer: A large gap between estimated and actual rows. Refresh statistics, or add extended statistics, before you add an index the planner may still ignore.

### DB-252 — Why are many direct connections a problem in PostgreSQL?

**Difficulty:** Intermediate

**Category:** Connection pooling

**Question:**

Why are many direct connections a problem in PostgreSQL?

**Answer:**

Each connection is its own server process, using several MB of memory plus `work_mem` for each sort or hash step. Thousands of them cause heavy context switching, contention on shared structures such as the process array, and memory pressure. Throughput usually peaks at a small multiple of the CPU core count and then drops. Serverless apps and fleets of services, each with its own pool, can exhaust `max_connections`, so you put a pooler in front.

**Follow-up:**

Why not just raise `max_connections`?

Answer: Higher limits add memory and lock overhead and risk running out of memory, without adding useful concurrency. Most connections are idle anyway. Keep it modest and let a pooler share a few server connections among many clients.

### DB-253 — Explain PgBouncer session, transaction, and statement pooling.

**Difficulty:** Senior

**Category:** Connection pooling

**Question:**

Explain PgBouncer session, transaction, and statement pooling.

**Answer:**

The modes differ in how long a client keeps a server connection. Session mode holds it for the whole client session: safest, but little sharing. Transaction mode assigns one only for the length of a transaction, then takes it back. It is the usual choice, since thousands of clients can share tens of server connections. Statement mode returns it after every statement, so multi-statement transactions don't work, and it is rarely used.

**Follow-up:**

When would you pick session mode?

Answer: When the app relies on session state: `LISTEN/NOTIFY`, session advisory locks, `SET` without `LOCAL`, temp tables, or `WITH HOLD` cursors. Admin and migration tools also fit. You can run a separate session-mode pool for just those clients.

### DB-306 — Walk through cache-aside for a Postgres read.

**Difficulty:** Junior

**Category:** Cache-aside

**Question:**

Walk through cache-aside for a Postgres read.

**Answer:**

The app asks Redis first. On a hit, you return the cached value and never touch Postgres. On a miss, you query Postgres, then `SET` the result in Redis with a TTL, then return it. Writes do not go through Redis first. You commit to Postgres and then delete or replace the key. The cache is filled only because somebody read the row. That keeps the cache smaller than the table, and a missing key is always recoverable by reading the database again.

**Follow-up:**

What do you return if Redis is down during that read?

Answer: You skip the cache and read Postgres, then return that row. A cache outage should degrade latency, not availability, as long as Postgres can absorb the extra reads. Fail the Redis call on a short timeout so threads do not pile up waiting on a dead socket. Do not try to refill Redis on every request while it is flapping. A circuit breaker around the cache client keeps a brief Redis stall from turning into a Postgres stampede of connection timeouts.

### DB-309 — What is a cache stampede, and how do you stop it?

**Difficulty:** Intermediate

**Category:** Stampede

**Question:**

What is a cache stampede, and how do you stop it?

**Answer:**

A stampede happens when a hot key expires or is deleted and many requests miss at once. Every one of them runs the same expensive Postgres query and then writes the same Redis key. The database sees a spike you built the cache to avoid. You prevent it by keeping a single recomputation: an in-process singleflight, a short Redis lock around the rebuild, or probabilistic early refresh so one request replaces the value before it expires. A TTL with random jitter stops a whole key family from expiring on the same millisecond.

**Follow-up:**

What do the requests that did not win the rebuild return while it is in flight?

Answer: If you still have the previous value, return it and mark it slightly stale. Users prefer a moment of staleness to a timeout. If there is no previous value, wait briefly for the winner and then read Redis, or return a fallback such as an empty page with a retry. Do not let every waiter start its own Postgres query when the lock is busy. Cap the wait, and if the winner dies, the lock TTL must expire so a new request can take over.

### DB-196 — What is the transactional outbox pattern?

**Difficulty:** Intermediate

**Category:** Outbox and dual-write

**Question:**

What is the transactional outbox pattern?

**Answer:**

In the same database transaction as the business change, you also insert an event row into an `outbox` table. A separate relay process reads committed outbox rows, publishes them to the message broker, and marks them as sent. Because the change and the event commit together, you never publish an event for a rolled-back change, and you never lose an event for a committed one.

**Follow-up:**

What delivery guarantee results?

Answer: At-least-once. The relay may publish an event and crash before marking it sent, so consumers must handle duplicates.

### DB-197 — Why is dual-write (DB + message broker) unsafe?

**Difficulty:** Senior

**Category:** Outbox and dual-write

**Question:**

Why is dual-write (DB + message broker) unsafe?

**Answer:**

The database and the broker can't commit atomically. If the database commits but the publish fails, the event is lost. If you publish first and the database rolls back, you announced something that never happened. Retries can also reorder events. Safer options are the outbox pattern, change data capture, or two-phase commit, which is rarely practical.

**Follow-up:**

Does wrapping the publish in the transaction fix it?

Answer: No. The broker send isn't part of the database's commit, so one can still succeed while the other fails.

### DB-200 — Optimistic vs pessimistic concurrency: how do you choose?

**Difficulty:** Senior

**Category:** Patterns

**Question:**

Optimistic vs pessimistic concurrency: how do you choose?

**Answer:**

Optimistic concurrency adds a `version` column and updates only if the version still matches. If zero rows are updated, someone else changed the row first, so you reload and retry. It suits low contention and long user think-time. Pessimistic concurrency locks the row with `SELECT … FOR UPDATE` so others wait; it suits high contention and short critical sections. Serializable isolation with retries is a third, declarative option.

**Code:**

```sql
UPDATE items SET qty = $3, version = version + 1
WHERE id = $1 AND version = $2;
```

**Follow-up:**

What breaks optimistic locking?

Answer: Any writer that skips the version check, such as raw SQL scripts or another service. Every writer has to follow the same rule.

### DB-073 — ANALYZE writes the statistics the planner reads

**Difficulty:** Senior

**Category:** Planner statistics

**Question:**

Where do the planner’s row estimates come from, and what do `pg_stat_user_tables` and `pg_stats` each contribute?

**Answer:**

The planner estimates rows from `pg_statistic`, exposed as `pg_stats`, plus `pg_class.reltuples` and `relpages`. `ANALYZE` writes those. For a column you get the null fraction, the average width, `n_distinct`, the most common values, a histogram, and the correlation with physical order. `default_statistics_target` sets how many common values and histogram buckets are kept.

`pg_stat_user_tables` is a different store. Counters such as `n_dead_tup` and `n_mod_since_analyze` tell autovacuum when to vacuum or analyze. They are not the selectivity the planner uses. An estimate for `status = 'open'` is `reltuples` times the stored frequency of that value.

**Follow-up:**

`pg_stats` says `'closed'` frequency 0.9, `reltuples` 100000, but every row is now `'open'`. What does the planner estimate vs return?

Answer: It estimates about 10,000 rows for `'open'`, from the old frequency. The executor returns 100,000. The plan can stay wrong until `ANALYZE` refreshes the frequencies.

### DB-065 — VACUUM reclaims space inside the file

**Difficulty:** Intermediate

**Category:** Vacuum

**Question:**

What does an ordinary `VACUUM` of a table give back, and what does it leave the same?

**Answer:**

Ordinary `VACUUM` removes dead tuple bytes and dead index entries that no snapshot still needs. It updates the free space map and the visibility map, and it can freeze old tuples. Later inserts reuse that free space inside existing pages.

It does not rewrite the table or rebuild each index. The file shrinks only when empty pages form a suffix vacuum can truncate under a short exclusive lock. Holes in the middle stay. Unlike `VACUUM FULL`, ordinary vacuum does not block normal reads and writes for the whole run.

**Follow-up:**

Page 0 empty after vacuum; page 1 still has a live row. Does `pg_relation_size` drop one page?

Answer: No. Truncation removes only a trailing run of empty pages. A hole at the front stays, and the free space map offers it to later inserts.

### DB-251 — Compare vertical and horizontal scaling for PostgreSQL. What do you try first?

**Difficulty:** Intermediate

**Category:** Scaling

**Question:**

Compare vertical and horizontal scaling for PostgreSQL. What do you try first?

**Answer:**

Vertical scaling means a bigger machine: more CPU, RAM, and faster disks. It is simple and needs no app changes, but it has a ceiling, gets expensive, and is still a single point of failure. Horizontal scaling means more nodes: read replicas for reads, partitioning to split big tables, or sharding to spread writes. Try, in order: fix queries, indexes, and pooling; scale up; add replicas; partition; shard last. Postgres has a single writer, so write scaling is the hard part.

**Follow-up:**

Why is "just add replicas" not a write-scaling answer?

Answer: Replicas replay the primary's WAL, so every write still happens on the primary and again on each replica. They offload reads only. To go further you must reduce write work, partition, or shard.

### DB-411 — SQL injection is untrusted text parsed as SQL

**Difficulty:** Junior

**Category:** SQL injection

**Question:**

What is SQL injection in an application that talks to PostgreSQL?

**Answer:**

SQL injection happens when a string from a user is concatenated into a statement and PostgreSQL parses that string as SQL rather than as a value. The attacker changes the query shape: extra predicates, a second statement, or a call that the application role is allowed to run. The reliable defense is a parameterized statement. The SQL text stays constant, and the value is sent out of band as a bound parameter, for example `WHERE email = $1` with the address in the parameter array. Quote-escaping by hand is a backup you will get wrong on encodings and unicode. Least privilege limits the damage. It does not make concatenation safe.

**Follow-up:**

Where do people still concatenate after adopting a driver that supports parameters?

Answer: They concatenate into `ORDER BY`, `LIMIT` fragments, table names, and “optional filters” built as strings. They also pass a finished SQL string into an ORM raw-query helper. Identifiers cannot be bound as values. Keep an allow-list of column names in application code and interpolate only a matched name. Bind every value, including numbers. Review every call that builds SQL with a template literal, `%s`, or string addition. One raw path is enough for an incident.
