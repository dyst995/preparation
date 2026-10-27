# Essential Databases — Advanced

3-day essential set. 20 questions in preparation order. Full handbook remains under `databases/`.

### DB-160 — What is Serializable in PostgreSQL (SSI)?

**Difficulty:** Staff

**Category:** Isolation levels

**Question:**

What is Serializable in PostgreSQL (SSI)?

**Answer:**

Serializable Snapshot Isolation works like Repeatable Read but also tracks which transactions read data that others wrote. It uses predicate (SIREAD) locks for this tracking. If it finds a dangerous pattern that could not match any one-at-a-time order, it aborts a transaction with `40001 could not serialize access due to read/write dependencies`. These locks never block anyone. Because detection is conservative, some aborts are false positives, so retries are mandatory.

**Follow-up:**

How do indexes affect false positives?

Answer: With an index scan, Postgres can lock only the index range it read. Without one, it falls back to coarser page or whole-table locks, which conflict more often and cause more aborts.

### DB-165 — What is write skew? Show an example.

**Difficulty:** Senior

**Category:** Anomalies

**Question:**

What is write skew? Show an example.

**Answer:**

Write skew is when two transactions read overlapping data, then write to different rows based on what they read, and together break a rule. Example: a hospital requires at least one doctor on call. Two doctors each check that two are on call, then each removes themselves, leaving nobody. Repeatable Read allows this; Serializable detects it. You can also lock the rows you read with `FOR UPDATE`, use a constraint, or serialize with an advisory lock.

**Follow-up:**

Why doesn't Repeatable Read's concurrent-update check catch it?

Answer: That check only fires when two transactions write the same row. Here each doctor updates a different row, so there is no direct write conflict.

### DB-170 — What are the four row-lock strengths?

**Difficulty:** Senior

**Category:** Row locks

**Question:**

What are the four row-lock strengths?

**Answer:**

From strongest to weakest: `FOR UPDATE`, `FOR NO KEY UPDATE`, `FOR SHARE`, `FOR KEY SHARE`. `DELETE` and updates that change key columns take `FOR UPDATE`. Ordinary updates that leave key columns alone take `FOR NO KEY UPDATE`. Foreign-key checks take `FOR KEY SHARE` on the parent row. `KEY SHARE` conflicts only with `FOR UPDATE`, so inserting child rows does not block ordinary updates of the parent.

**Follow-up:**

Why does that matter?

Answer: It avoids needless blocking between child inserts and parent updates, which would otherwise be a common source of contention on tables with foreign keys.

### DB-063 — A HOT update does not add an index entry

**Difficulty:** Advanced

**Category:** Heap storage

**Question:**

When is an `UPDATE` a heap-only tuple (HOT) update, and what does that change for indexes and vacuum?

**Answer:**

A HOT update stores a new tuple version without adding index entries. No indexed column may change, including one used only by an expression or partial index, and the new version must fit on the same page.

Indexes keep pointing at the chain root. A reader follows `t_ctid` on that page. A same-page prune can drop dead HOT versions without visiting indexes. A non-HOT update needs vacuum's index cleanup. A lower `fillfactor` leaves room for a later update. It does not rewrite pages that are already full. BRIN alone does not prevent HOT.

**Trade-offs:**

HOT makes a small update cheap when the changed columns are not indexed. The levers are simple: do not index columns that change on every update, and leave free space on the page. Changing an indexed `status` cannot be HOT.

**Follow-up:**

Partial index `WHERE status = 'open'` on `id`. Note-only update vs status change—which can be HOT?

Answer: A note-only update can be HOT, because `status` is unchanged. Changing `status` cannot. The column in the predicate counts as indexed. The new version must still fit on the page.

### DB-064 — The visibility map is what lets an index-only scan skip the heap

**Difficulty:** Senior

**Category:** Heap storage

**Question:**

What do the visibility map bits mean, and why can an Index Only Scan still read the heap?

**Answer:**

The visibility map has one entry per heap page. All-visible means every tuple there is visible to every transaction. A second bit means the page is all-frozen. An index-only scan can return the index entry without the heap when the page is all-visible and the needed columns are in the index.

If the bit is clear, PostgreSQL fetches that `ctid` to check visibility. Vacuum sets the bit. Any later update clears it for the whole page. An Index Only Scan can still report heap fetches when the bit is unset or a needed column is missing from the index.

**Follow-up:**

Vacuum set all-visible; one row’s `note` updates. Effect on index-only scans of other rows on that page?

Answer: All-visible is cleared for the page. Until vacuum sets it again, an index-only scan may fetch the heap for every `ctid` on that page, including rows that did not change.

### DB-070 — Wraparound is the server refusing new transaction ids

**Difficulty:** Staff-Level

**Category:** Freeze and wraparound

**Question:**

What fails if `datfrozenxid` is not advanced, at what ages does PostgreSQL 16 warn and stop, and what moves the horizon again?

**Answer:**

Transaction ids are 32-bit values compared modulo 2^31. If old committed ids are never frozen, they eventually look like they are in the future, and visibility is wrong. PostgreSQL normally starts anti-wraparound vacuum at `autovacuum_freeze_max_age`, default 200 million, long before that happens.

If freezing still does not advance, PostgreSQL warns when the cluster is about 40 million transactions from the stop point. It refuses to assign new transaction ids about 3 million transactions before wraparound. What moves the horizon is vacuum finishing on the relations that hold the oldest `relfrozenxid`, which advances `datfrozenxid`. A larger `shared_buffers` does not freeze anything.

**Follow-up:**

`age(datfrozenxid)` 210M; `autovacuum = off`; writes still work. What happens? Does larger `shared_buffers` help?

Answer: Anti-wraparound autovacuum still starts. It ignores `autovacuum = off`, and it will not step aside for an ordinary lock conflict. Writes continue until the hard stop. More `shared_buffers` does not advance the freeze horizon.

### DB-035 — DEFERRABLE moves the check to statement end or commit

**Difficulty:** Staff-Level

**Category:** Constraints

**Question:**

`UNIQUE (email) DEFERRABLE INITIALLY IMMEDIATE`. One-statement email swap, two-statement swap, commit after first update—outcomes? If `NOT DEFERRABLE`?

**Answer:**

A deferrable constraint can wait until the end of the statement, or until commit if you run `SET CONSTRAINTS ... DEFERRED`. A unique constraint that is not deferrable is checked per row, so a swap can fail on a temporary duplicate.

One `UPDATE` that swaps two emails succeeds when the constraint is deferrable. It fails when it is not. Two statements need the check deferred, and committing after only the first update fails. `NOT NULL` and `CHECK` cannot be deferred. A foreign key cannot target a deferrable unique constraint.

**Follow-up:**

Deferred FK cycle inserts `(1,2)` then `(2,1)`?

Answer: Commit succeeds when the foreign keys are deferred. A non-deferrable foreign key rejects the first insert. Committing after only the first deferred insert fails.

### DB-198 — How do you build the outbox relay on PostgreSQL?

**Difficulty:** Staff

**Category:** Outbox and dual-write

**Question:**

How do you build the outbox relay on PostgreSQL?

**Answer:**

Option 1 is polling: select unsent rows with `FOR UPDATE SKIP LOCKED`, publish them, and mark them sent in the same transaction. Option 2 is change data capture, such as Debezium reading the WAL through logical decoding, which avoids polling. Be careful with a "last seen id" cursor: sequence values can commit out of order, so you may skip rows. Use a `sent_at` flag or CDC, and clean up old rows or partition the table.

**Follow-up:**

How do consumers handle duplicates?

Answer: They record processed event IDs in an inbox table, or make their operations idempotent so that repeating them has no extra effect.

### DB-246 — Multi-tenancy: database-per-tenant vs schema-per-tenant vs shared tables with `tenant_id`?

**Difficulty:** Staff

**Category:** Multi-tenancy

**Question:**

Multi-tenancy: database-per-tenant vs schema-per-tenant vs shared tables with `tenant_id`?

**Answer:**

Database-per-tenant gives the strongest isolation and easy per-tenant backup and restore, but costs more to operate and uses many connections. Schema-per-tenant is a middle ground, but thousands of schemas bloat the catalog and complicate migrations. Shared tables with a `tenant_id` column are cheapest and scale to many small tenants, but isolation depends on discipline. Choose by tenant count, size differences, and compliance needs.

**Follow-up:**

How do you reduce cross-tenant leaks in the shared model?

Answer: Make `tenant_id` part of primary and composite foreign keys, such as `(tenant_id, id)`, and index it first. Enable Row-Level Security with policies that read a session variable like `current_setting('app.tenant_id')`. RLS is a safety net on top of correct queries, not a replacement.

### DB-248 — Which DDL operations are risky on large tables in PG16, and how do you mitigate them?

**Difficulty:** Staff

**Category:** Migrations

**Question:**

Which DDL operations are risky on large tables in PG16, and how do you mitigate them?

**Answer:**

Risky operations hold a strong lock for a long time: adding a column with a volatile default, most column type changes (which rewrite the table), `SET NOT NULL` (which scans the table), adding validated foreign keys or checks, and plain `CREATE INDEX`. Mitigate with `lock_timeout`, adding constraints as `NOT VALID` then `VALIDATE`, `CREATE INDEX CONCURRENTLY`, and a validated `CHECK (col IS NOT NULL)` before `SET NOT NULL` so Postgres can skip the scan. For type changes, add a new column and backfill.

**Follow-up:**

Why set `lock_timeout` for migrations?

Answer: A DDL statement waiting for a lock queues behind a long query, and then blocks every later query on that table. A short `lock_timeout` makes it fail fast so you can retry, instead of causing an outage.

### DB-280 — What are the common problems with partitioned tables?

**Difficulty:** Senior

**Category:** Partitioning

**Question:**

What are the common problems with partitioned tables?

**Answer:**

Primary and unique keys must include the partition key, and there are no global unique indexes. Foreign keys to partitioned tables work (PG12+) but add complexity. Thousands of partitions slow planning and use memory. Queries without the partition key hit every partition. Migrating an existing large table to partitioning needs a careful plan.

**Follow-up:**

How do you partition an existing large table online?

Answer: Create the partitioned table and attach the old table as a partition, adding a matching `CHECK` constraint first so attaching skips the validation scan. Add new partitions for future data, or backfill in batches and swap names under a short lock. Test lock behavior first.

### DB-311 — What does singleflight mean, and where do you put it?

**Difficulty:** Senior

**Category:** Stampede

**Question:**

What does singleflight mean, and where do you put it?

**Answer:**

Singleflight means concurrent callers for the same key share one in-flight load. The first request queries Postgres. The others wait on that same promise and reuse the result. You usually implement it in the app process, as Go’s `singleflight` does, or with a small per-key map of futures. It removes duplicate work inside one instance. It does nothing for the twenty other pods that missed at the same time. Cross-instance coalescing needs a Redis lock or a stale-while-revalidate scheme on top.

**Follow-up:**

What bug appears if the shared future caches an error forever?

Answer: A brief Postgres timeout becomes the answer for every waiter, and if you store that failure in the map with no expiry, later requests never try again. Share the in-flight call only while it is running. When it finishes, drop the future. Cache a negative result in Redis with a short TTL if you want to dampen missing rows, and do not cache transport errors at all. The next caller should be allowed to try the database again.

### DB-332 — How do you lose read-your-writes with cache-aside, and how do you close the hole?

**Difficulty:** Senior

**Category:** Invalidation

**Question:**

How do you lose read-your-writes with cache-aside, and how do you close the hole?

**Answer:**

One request reads Postgres, gets version 1, and is slow. Another request commits version 2 and deletes the key. The slow request then `SET`s version 1 back into Redis. Readers now see a stale row until the TTL. Close the hole by storing a version and using a Lua compare that refuses to `SET` an older version, or by letting only the lock holder fill the cache. The writer can also pass the new row back to its own UI so that user does not depend on the cache for the response to their own save.

**Follow-up:**

Does setting the cache inside the Postgres transaction fix that race?

Answer: It makes the race worse. If you `SET` Redis before the commit, concurrent readers can observe a value that later rolls back, and a long transaction holds a cache entry that is not yet true. If you delete inside the transaction, a concurrent miss refills the old row before you commit. Change the cache after commit, and make the refill compare versions. The database commit order is the order that matters.

### DB-342 — Redis accepts the new value and Postgres then rolls back. What should the user observe?

**Difficulty:** Senior

**Category:** Write patterns

**Question:**

Redis accepts the new value and Postgres then rolls back. What should the user observe?

**Answer:**

The user should observe the rollback. Postgres is the source of truth, so the request returns the database error and you delete the key you just wrote. If you leave the Redis value in place, later reads show a world that never committed, and delete-on-write will not fire because no successful write happened. This is the standard write-through failure. Order the success response on the commit, and make the compensating cache delete part of the error path, with a retry, because a failed compensation is a stale read.

**Follow-up:**

Postgres committed and the process died before talking to Redis. Is the data wrong?

Answer: The data in Postgres is right, and the cache is simply old or empty. The next read misses or, if you had set the value earlier, might still be stale until TTL or a later delete. That is why the outbox row has to be in the same commit as the data. A worker will invalidate even if the web process died. Until then, readers can be stale, which you already accepted up to the TTL. The user who wrote can be shown their own committed row without reading Redis.

### DB-354 — When to keep Postgres as the source of truth

**Difficulty:** Intermediate

**Category:** Data modeling

**Question:**

Which workloads should stay on Postgres even if the team is willing to run MongoDB?

**Answer:**

Stay on Postgres when the important operation updates several entities together, or recombines them in many ways. A transfer that debits one account and credits another is a local transaction with constraints. MongoDB can run a multi-document transaction, and a ledger-shaped product is still a poor match for documents.

Foreign keys and unpredictable admin filters belong in tables too. A second database adds a backup story and a consistency boundary. Add one when the access pattern requires it.

**Follow-up:**

The team already runs MongoDB, and a booking must not double-sell a seat. What do you add?

Answer: Put seats and payments in Postgres, where a unique constraint and a short transaction reject the double sell. Keep MongoDB for aggregates it already serves, such as the event page. One store owns each fact, and the other may hold a lagging copy from a stream or a job.

### DB-373 — CAP during a partition

**Difficulty:** Senior

**Category:** Distributed systems

**Question:**

What does the CAP theorem claim, and how should you answer whether MongoDB is CP or AP?

**Answer:**

During a partition you cannot have both linearizable consistency and an answer from every side. Networks do split, so partition tolerance is the situation, not a feature you turn off. You refuse some operations so copies do not diverge, or you accept both sides and repair later. CAP does not grade latency on a healthy day.

With majority writes, MongoDB's minority side cannot elect, so it cannot take writes. Clients who reach the majority continue. Stale secondary reads are a preference, and Cassandra at a low level can still accept writes on a split side. Name the setting.

**Follow-up:**

Can a system be consistent and available by assuming partitions will not happen?

Answer: Only if you assume a single node, or a network that never splits. If both sides of a dead link accept writes, you can split brain. If only one side accepts them, the other side is unavailable, so say what this deployment does when the link fails and rehearse it.

### DB-400 — Choosing a store in a system-design interview

**Difficulty:** Senior

**Category:** Architecture

**Question:**

In a system design interview, how do you choose among Postgres, MongoDB, Cassandra, and a NewSQL system?

**Answer:**

Name the hot path first: the lookup key, the write, what must be atomic, and how fresh the read must be. Postgres is the default when invariants cross rows and one primary can take the writes. Mention JSONB when one attribute is flexible.

Choose MongoDB for one aggregate whose indexes you can name, and state majority writes. Name a shard key before you shard. Choose Cassandra when every query is known, and say the consistency level. Choose NewSQL when SQL transactions must cross nodes. End with the fact that would change your mind.

**Follow-up:**

The interviewer says "just use Mongo" for checkout with assigned seats. How do you answer?

Answer: Two buyers must not get the same seat, which is a uniqueness rule and a short transaction Postgres states directly. I would keep MongoDB for the event page if that content is a real aggregate. Forced onto MongoDB, I would use one document per seat with a conditional update, and I would name the constraints I am giving up.

### DB-463 — Saga vs 2PC

**Difficulty:** Senior

**Category:** distributed workflows

**Question:**

How does a saga differ from two-phase commit for cross-service workflows?

**Answer:**

A saga is a sequence of local transactions with compensating actions if a later step fails—reserve inventory, charge payment, then ship; on failure, release or refund. 2PC tries to lock all participants until a global commit, which holds resources, couples availability, and is rare across modern services and heterogeneous stores. Prefer sagas with idempotent steps and clear compensations; use a single Postgres transaction only when everything lives in one database.

**Follow-up:**

Why is 2PC uncommon in product architectures?

Answer: Coordinator failure and long locks hurt availability; cloud services rarely expose a shared XA transaction manager.

### DB-484 — Consistency for checkout vs feed

**Difficulty:** Staff

**Category:** consistency choices

**Question:**

How do you choose consistency differently for checkout versus a social feed?

**Answer:**

Checkout needs strong invariants—inventory, payment capture, and order durability—in one Postgres transaction or a carefully designed saga with compensations; stale reads here mean oversell or double charge. A feed can be eventually consistent: fan-out projections, caches, and approximate rankings improve latency and cost. Staff-level judgment is matching consistency to user harm, not applying “always strong” or “always eventual” everywhere.

**Follow-up:**

What happens if you force strong consistency on the feed?

Answer: You pay with latency, fan-out bottlenecks, and write amplification for little user value.

### DB-485 — Idempotent order pipeline

**Difficulty:** Staff

**Category:** order systems

**Question:**

Design an idempotent order placement pipeline for a busy storefront.

**Answer:**

Clients send an `Idempotency-Key`; the API persists the key with the request hash in Postgres before side effects. Retries return the same order id. Payment intents and inventory reservations key off that id; consumers use an inbox. Outbox events carry the order id as the partition key. At-least-once everything, exactly-once effect via unique constraints. Result first: duplicate clicks never create two paid orders.

**Follow-up:**

What if the same key is reused with a different body?

Answer: Reject with a conflict—idempotency binds key to payload fingerprint.
