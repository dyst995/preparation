# DB04 — Transactions

PostgreSQL 16. Questions DB-151–DB-200.

ACID, savepoints, isolation levels and anomalies, row and table locks, deadlocks, advisory locks, timeouts, retry patterns, ORM boundaries, and outbox vs dual-write. Indexing is DB03.

### DB-151 — What does ACID mean, and how does PostgreSQL deliver each property?

**Difficulty:** Intermediate

**Category:** ACID and basics

**Question:**

What does ACID mean, and how does PostgreSQL deliver each property?

**Answer:**

**Atomicity:** all statements in a transaction commit or none do (undo is implicit: rolled-back row versions are simply invisible to MVCC). **Consistency:** constraints (PK, FK, CHECK, UNIQUE) hold at commit; business invariants beyond constraints are your job. **Isolation:** concurrent transactions don't see each other's uncommitted work, implemented with MVCC snapshots plus locks. **Durability:** committed data survives a crash because WAL is flushed before COMMIT returns (with `synchronous_commit = on`).

**Follow-up:**

What does `synchronous_commit = off` risk?

Answer: Losing the last few ms of commits on crash, but no corruption or partial transactions.

### DB-152 — How do BEGIN, COMMIT, and ROLLBACK work, and what is autocommit?

**Difficulty:** Intermediate

**Category:** ACID and basics

**Question:**

How do BEGIN, COMMIT, and ROLLBACK work, and what is autocommit?

**Answer:**

Outside an explicit block, every statement runs in its own implicit transaction and commits automatically. `BEGIN` (or `START TRANSACTION`) opens a block; `COMMIT` makes changes durable and visible; `ROLLBACK` discards them. Postgres has no server-side "autocommit off" setting — client drivers (psycopg, JDBC) emulate it by sending `BEGIN` implicitly before the first statement.

**Follow-up:**

Why is a driver that silently opens a transaction dangerous?

Answer: Forgotten commit → connection left `idle in transaction`.

### DB-153 — What happens when a statement fails inside a transaction?

**Difficulty:** Intermediate

**Category:** ACID and basics

**Question:**

What happens when a statement fails inside a transaction?

**Answer:**

The whole transaction enters an aborted state; every later command fails with `25P02 current transaction is aborted, commands ignored until end of transaction block` until `ROLLBACK` (a `COMMIT` on an aborted transaction performs a rollback). Only a savepoint rollback can recover without discarding everything.

**Follow-up:**

How does this differ from MySQL/InnoDB?

Answer: InnoDB rolls back only the failing statement by default.

### DB-154 — What are savepoints, and when would you use them?

**Difficulty:** Intermediate

**Category:** ACID and basics

**Question:**

What are savepoints, and when would you use them?

**Answer:**

`SAVEPOINT name` marks a point; `ROLLBACK TO SAVEPOINT name` undoes work since then and keeps the transaction (and the savepoint) alive; `RELEASE SAVEPOINT` discards the marker. Use them to try an optional step (e.g. an insert that may violate a constraint) without aborting the outer transaction. They are implemented as subtransactions.

**Follow-up:**

What is the cost of many savepoints?

Answer: Each assigns a subxid once it writes; beyond 64 per backend the subxid cache overflows and visibility checks hit `pg_subtrans`, hurting performance under concurrency.

### DB-155 — Do PL/pgSQL `EXCEPTION` blocks create savepoints? Can a function COMMIT?

**Difficulty:** Intermediate

**Category:** ACID and basics

**Question:**

Do PL/pgSQL `EXCEPTION` blocks create savepoints? Can a function COMMIT?

**Answer:**

Yes: a `BEGIN … EXCEPTION WHEN … END` block runs in a subtransaction, so catching an error rolls back only that block's effects. Functions cannot `COMMIT`/`ROLLBACK`; procedures invoked with `CALL` can (since PG 11), provided `CALL` isn't itself inside an outer transaction block.

**Follow-up:**

Why avoid wrapping every loop iteration in an exception block?

Answer: Subtransaction overhead per iteration.

### DB-156 — Which isolation levels does PostgreSQL implement?

**Difficulty:** Intermediate

**Category:** Isolation levels

**Question:**

Which isolation levels does PostgreSQL implement?

**Answer:**

Three distinct behaviours behind four syntax names: **Read Committed** (default), **Repeatable Read** (snapshot isolation), **Serializable** (SSI). `READ UNCOMMITTED` is accepted but behaves as Read Committed — dirty reads never happen.

**Follow-up:**

Which anomalies does each level permit in Postgres?

Answer: RC: non-repeatable reads, phantoms, lost updates, write skew; RR: write skew and read-only anomaly; Serializable: none.

### DB-157 — How does Read Committed behave?

**Difficulty:** Intermediate

**Category:** Isolation levels

**Question:**

How does Read Committed behave?

**Answer:**

Each **statement** sees a fresh snapshot of data committed before that statement began (plus its own earlier changes). Two identical `SELECT`s in one transaction can return different results. It is the default because it has the fewest serialization errors and needs no retries.

**Follow-up:**

Does a single statement ever see two different states?

Answer: No — snapshot is fixed for that statement, though a `FOR UPDATE`/`UPDATE` may re-read newer row versions, see DB-158.

### DB-158 — In Read Committed, what happens when an `UPDATE` hits a row concurrently updated by another transaction?

**Difficulty:** Senior

**Category:** Isolation levels

**Question:**

In Read Committed, what happens when an `UPDATE` hits a row concurrently updated by another transaction?

**Answer:**

It waits for the other transaction. If that one rolls back, it proceeds. If it commits, Postgres re-reads the latest row version and **re-evaluates the WHERE clause** on it (EvalPlanQual); if it still matches, it updates that version, otherwise it skips the row. This makes `UPDATE accounts SET bal = bal - 10 WHERE id = 1 AND bal >= 10` safe without explicit locking.

**Follow-up:**

Why can `SELECT` then `UPDATE` in application code still lose updates?

Answer: The SELECT's value is stale by the time the UPDATE runs.

### DB-159 — How does Repeatable Read work in PostgreSQL?

**Difficulty:** Intermediate

**Category:** Isolation levels

**Question:**

How does Repeatable Read work in PostgreSQL?

**Answer:**

The snapshot is taken at the first non-transaction-control statement and held for the whole transaction, so all reads are consistent. Phantoms are also prevented (stronger than the SQL standard). If it tries to update/delete/lock a row changed by a transaction committed after its snapshot, it fails with `40001 could not serialize access due to concurrent update`.

**Follow-up:**

Is the snapshot taken at `BEGIN`?

Answer: No — at the first query.

### DB-160 — What is Serializable in PostgreSQL (SSI)?

**Difficulty:** Staff

**Category:** Isolation levels

**Question:**

What is Serializable in PostgreSQL (SSI)?

**Answer:**

Serializable Snapshot Isolation: runs like Repeatable Read but also tracks read/write dependencies using predicate (SIREAD) locks, and aborts a transaction when a dangerous cycle that could break serial equivalence is detected (`40001 could not serialize access due to read/write dependencies`). Predicate locks never block; they only detect. False positives are possible, so retries are mandatory.

**Follow-up:**

How do indexes affect false positives?

Answer: Without index scans, predicate locks fall back to coarser page/relation granularity, increasing aborts.

### DB-161 — What is a dirty read, and can it happen in PostgreSQL?

**Difficulty:** Intermediate

**Category:** Anomalies

**Question:**

What is a dirty read, and can it happen in PostgreSQL?

**Answer:**

Reading data written by another transaction that has not committed. Postgres never allows it at any level, because MVCC only shows committed row versions (and your own).

**Follow-up:**

Which standard level is supposed to prevent it?

Answer: Read Committed and above.

### DB-162 — What is a non-repeatable read?

**Difficulty:** Intermediate

**Category:** Anomalies

**Question:**

What is a non-repeatable read?

**Answer:**

Re-reading the same row in one transaction returns different values because another transaction committed a change in between. Possible in Read Committed; prevented in Repeatable Read and Serializable via the fixed snapshot.

**Follow-up:**

When does it matter?

Answer: A report computing totals from two queries that must agree.

### DB-163 — What is a phantom read, and how does Postgres handle it?

**Difficulty:** Intermediate

**Category:** Anomalies

**Question:**

What is a phantom read, and how does Postgres handle it?

**Answer:**

A repeated query with the same predicate returns a different set of rows because another transaction inserted/deleted matching rows. Allowed in Read Committed; prevented in Postgres Repeatable Read by the snapshot (unlike the standard, which allows it).

**Follow-up:**

Does preventing phantom reads prevent write skew?

Answer: No — write skew is a different anomaly.

### DB-164 — What is a lost update, and how do you prevent it?

**Difficulty:** Intermediate

**Category:** Anomalies

**Question:**

What is a lost update, and how do you prevent it?

**Answer:**

Two transactions read the same value, both compute a new one, and the second write overwrites the first. Prevent with an atomic statement (`SET n = n + 1`), `SELECT … FOR UPDATE`, optimistic version checks, or Repeatable Read/Serializable plus retry on `40001`.

**Follow-up:**

Why does Repeatable Read prevent it?

Answer: The second writer errors with a concurrent-update failure instead of overwriting.

### DB-165 — What is write skew? Show an example.

**Difficulty:** Senior

**Category:** Anomalies

**Question:**

What is write skew? Show an example.

**Answer:**

Two transactions read overlapping data, make disjoint writes based on it, and together violate an invariant. Example: two on-call doctors each check "at least 2 on call", then each removes themselves → zero on call. Snapshot isolation (RR) allows this; Serializable detects it. Alternatives: lock the rows read (`FOR UPDATE`), use a constraint or exclusion constraint, or serialize via an advisory lock.

**Follow-up:**

Why doesn't RR's concurrent-update check catch it?

Answer: They update different rows.

### DB-166 — What is the "read-only transaction anomaly" in snapshot isolation?

**Difficulty:** Staff

**Category:** Anomalies

**Question:**

What is the "read-only transaction anomaly" in snapshot isolation?

**Answer:**

A read-only transaction can observe a state that never existed in any serial order, because it sees a snapshot between two interdependent writers' commits. Postgres Serializable detects and may abort it; `SERIALIZABLE READ ONLY DEFERRABLE` instead waits for a safe snapshot and then runs with no abort risk.

**Follow-up:**

When is DEFERRABLE useful?

Answer: Long reports/backups at Serializable.

### DB-167 — How do you set a transaction's isolation level, and what are the restrictions?

**Difficulty:** Intermediate

**Category:** Anomalies

**Question:**

How do you set a transaction's isolation level, and what are the restrictions?

**Answer:**

`BEGIN ISOLATION LEVEL REPEATABLE READ;` or `SET TRANSACTION ISOLATION LEVEL …` as the first statement (before any query). Defaults come from `default_transaction_isolation` (per session, role, or database). It cannot be changed after the first query, and not inside a subtransaction.

**Follow-up:**

Can you change level mid-transaction?

Answer: No: `SET TRANSACTION ISOLATION LEVEL must be called before any query`.

### DB-168 — How does MVCC provide snapshots?

**Difficulty:** Intermediate

**Category:** MVCC

**Question:**

How does MVCC provide snapshots?

**Answer:**

Every row version carries `xmin` (creating xid) and `xmax` (deleting/locking xid). A snapshot records the oldest active xid, the next xid, and in-progress xids; a tuple is visible if its creator committed before the snapshot and its deleter hadn't. Readers never block writers; old versions stay until `VACUUM`.

**Follow-up:**

What does this imply for `UPDATE`?

Answer: It writes a new row version, so heavy updates produce dead tuples and bloat.

### DB-169 — What does `SELECT … FOR UPDATE` do?

**Difficulty:** Intermediate

**Category:** Row locks

**Question:**

What does `SELECT … FOR UPDATE` do?

**Answer:**

It locks the returned rows against concurrent `UPDATE`, `DELETE`, and other `FOR …` locks until the transaction ends. Others block (or fail/skip with `NOWAIT`/`SKIP LOCKED`). Plain `SELECT`s are unaffected. Used for pessimistic read-modify-write.

**Follow-up:**

Can you use it with `GROUP BY`, `DISTINCT`, or aggregates?

Answer: No. With joins it is allowed; restrict the locked tables with `FOR UPDATE OF table`.

### DB-170 — What are the four row-lock strengths?

**Difficulty:** Senior

**Category:** Row locks

**Question:**

What are the four row-lock strengths?

**Answer:**

From strongest: `FOR UPDATE`, `FOR NO KEY UPDATE`, `FOR SHARE`, `FOR KEY SHARE`. A normal `UPDATE` not touching key columns takes `NO KEY UPDATE`; `DELETE` and key updates take `FOR UPDATE`; foreign-key checks take `KEY SHARE` on the parent row. `KEY SHARE` conflicts only with `FOR UPDATE`, so FK inserts don't block non-key updates of the parent.

**Follow-up:**

Why does that matter?

Answer: It avoids needless blocking between child inserts and parent updates.

### DB-171 — What does `NOWAIT` do?

**Difficulty:** Intermediate

**Category:** Row locks

**Question:**

What does `NOWAIT` do?

**Answer:**

`FOR UPDATE NOWAIT` errors immediately (`55P03 could not obtain lock on row`) if a row is already locked, instead of waiting. Good for fail-fast UX ("this record is being edited").

**Follow-up:**

Difference from `lock_timeout`?

Answer: NOWAIT never waits; the timeout waits up to a limit.

### DB-172 — What is `SKIP LOCKED`, and when is it appropriate?

**Difficulty:** Intermediate

**Category:** Row locks

**Question:**

What is `SKIP LOCKED`, and when is it appropriate?

**Answer:**

Rows locked by others are skipped rather than waited on, so workers can claim different rows concurrently. Ideal for job queues:
`UPDATE jobs SET status='running' WHERE id = (SELECT id FROM jobs WHERE status='queued' ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING *;`
It gives an intentionally inconsistent view, so don't use it for general reads.

**Follow-up:**

What happens if a worker crashes mid-job?

Answer: Lock vanishes on rollback; with a status update you need a visibility timeout/heartbeat.

### DB-173 — Where does Postgres store row locks?

**Difficulty:** Senior

**Category:** Row locks

**Question:**

Where does Postgres store row locks?

**Answer:**

In the tuple header (`xmax` plus infomask bits), not in shared memory, so locking many rows doesn't exhaust a lock table. Consequences: locking a row dirties the page and generates WAL. When several transactions share-lock a row, a MultiXact ID is used.

**Follow-up:**

Why is `SELECT … FOR SHARE` on a huge table expensive?

Answer: It writes to every row touched.

### DB-174 — Name the main table-level lock modes.

**Difficulty:** Intermediate

**Category:** Table locks

**Question:**

Name the main table-level lock modes.

**Answer:**

From weakest: `ACCESS SHARE` (SELECT), `ROW SHARE` (FOR UPDATE/SHARE), `ROW EXCLUSIVE` (INSERT/UPDATE/DELETE), `SHARE UPDATE EXCLUSIVE` (VACUUM, `CREATE INDEX CONCURRENTLY`), `SHARE` (`CREATE INDEX`), `SHARE ROW EXCLUSIVE`, `EXCLUSIVE`, `ACCESS EXCLUSIVE` (most `ALTER TABLE`, `DROP`, `TRUNCATE`, `VACUUM FULL`; blocks even SELECT). Row locks and table locks are separate; DML takes both.

**Follow-up:**

Which lock mode blocks plain SELECT?

Answer: Only `ACCESS EXCLUSIVE`.

### DB-175 — Why can a quick `ALTER TABLE` cause an outage?

**Difficulty:** Senior

**Category:** Table locks

**Question:**

Why can a quick `ALTER TABLE` cause an outage?

**Answer:**

It requests `ACCESS EXCLUSIVE`, which queues behind any long-running transaction touching the table; every new query then queues behind the ALTER. Mitigate with `SET lock_timeout = '2s'` and retry, avoid long transactions, and use safe patterns (add nullable column, `NOT VALID` constraints then `VALIDATE`, `CREATE INDEX CONCURRENTLY`).

**Follow-up:**

Does adding a column with a constant default rewrite the table?

Answer: Not since PG 11 — it's metadata-only.

### DB-176 — Do readers block writers in Postgres?

**Difficulty:** Intermediate

**Category:** Table locks

**Question:**

Do readers block writers in Postgres?

**Answer:**

No. Plain reads take only `ACCESS SHARE` and use snapshots; writers don't wait for readers and readers don't wait for writers. Writers block only other writers on the same row, and DDL needing stronger table locks can block everyone.

**Follow-up:**

Exceptions?

Answer: Explicit locking reads, `LOCK TABLE`, and `ACCESS EXCLUSIVE` DDL.

### DB-177 — How are deadlocks detected and resolved?

**Difficulty:** Senior

**Category:** Deadlocks

**Question:**

How are deadlocks detected and resolved?

**Answer:**

When a session waits on a lock longer than `deadlock_timeout` (default 1 s), Postgres runs deadlock detection on the wait-for graph. If a cycle exists, it aborts one participant with `40P01 deadlock detected`; the others proceed. The victim's transaction must be rolled back and typically retried.

**Follow-up:**

Why 1 s rather than immediately?

Answer: Detection is costly and most waits resolve on their own.

### DB-178 — How do you prevent deadlocks?

**Difficulty:** Senior

**Category:** Deadlocks

**Question:**

How do you prevent deadlocks?

**Answer:**

Acquire locks in a consistent order (e.g. sort IDs before updating batches), keep transactions short, lock up-front with `SELECT … FOR UPDATE ORDER BY id`, avoid user interaction inside transactions, and retry on `40P01`. Foreign-key and unique-index checks can also create unexpected lock orders.

**Follow-up:**

Why do bulk `UPDATE`s without `ORDER BY` deadlock?

Answer: Row visit order may differ between sessions.

### DB-179 — How do you diagnose blocking and lock waits?

**Difficulty:** Intermediate

**Category:** Deadlocks

**Question:**

How do you diagnose blocking and lock waits?

**Answer:**

`pg_stat_activity` (`wait_event_type = 'Lock'`), `pg_blocking_pids(pid)`, and `pg_locks` (join to find holder and waiter). Enable `log_lock_waits` to log waits beyond `deadlock_timeout`. Resolve with `pg_cancel_backend` (query) or `pg_terminate_backend` (session).

**Follow-up:**

How do you find the root blocker?

Answer: Follow `pg_blocking_pids` until a pid that isn't itself waiting — often an idle-in-transaction session.

### DB-180 — What are advisory locks?

**Difficulty:** Intermediate

**Category:** Advisory locks

**Question:**

What are advisory locks?

**Answer:**

Application-defined locks identified by a bigint (or two int4) key, not tied to rows or tables. Session-level (`pg_advisory_lock`) persist until unlock or disconnect; transaction-level (`pg_advisory_xact_lock`) release at commit/rollback. `pg_try_advisory_lock` returns false instead of waiting. Typical uses: single-runner cron jobs, per-entity serialization, migration guards.

**Follow-up:**

Are they affected by rollback?

Answer: Session-level ones are not — they stay held after rollback.

### DB-181 — What are the pitfalls of advisory locks?

**Difficulty:** Senior

**Category:** Advisory locks

**Question:**

What are the pitfalls of advisory locks?

**Answer:**

Session-level locks leak if code forgets to unlock, and break with transaction-mode PgBouncer (the lock sticks to a server connection you may not get back). Prefer `pg_advisory_xact_lock`. Key collisions between features are possible, and the lock count is limited by shared memory (`max_locks_per_transaction`).

**Follow-up:**

How do you reduce key collisions?

Answer: Use the two-int form with a namespace constant.

### DB-182 — What are the hazards of long-running transactions?

**Difficulty:** Senior

**Category:** Long transactions and timeouts

**Question:**

What are the hazards of long-running transactions?

**Answer:**

They hold locks (blocking DDL and writers), pin the xmin horizon so `VACUUM` can't remove dead tuples (bloat, slow queries), retain WAL if tied to replication, cause serialization failures at RR/Serializable, and delay failover or schema changes. Monitor `pg_stat_activity.xact_start`.

**Follow-up:**

Does a long-running read-only query have the same problem?

Answer: Yes for vacuum horizon; and on standbys it can cause replay conflicts.

### DB-183 — What is "idle in transaction" and why is it harmful?

**Difficulty:** Intermediate

**Category:** Long transactions and timeouts

**Question:**

What is "idle in transaction" and why is it harmful?

**Answer:**

A session that ran `BEGIN` (and maybe queries) and is waiting for the client without committing. It keeps locks and its snapshot open — the classic cause of blocked migrations and bloat. Set `idle_in_transaction_session_timeout` to terminate such sessions.

**Follow-up:**

Common causes?

Answer: Missing commit in app code, ORM session left open during an HTTP call, crashed clients with pooled connections.

### DB-184 — What does `statement_timeout` do?

**Difficulty:** Intermediate

**Category:** Long transactions and timeouts

**Question:**

What does `statement_timeout` do?

**Answer:**

Aborts any single statement running longer than the limit with `57014 canceling statement due to statement timeout`. Default is 0 (disabled). Set per role/database for web apps, and use `SET LOCAL` for specific transactions. It limits each statement, not the whole transaction.

**Follow-up:**

Does it cover time spent waiting for locks?

Answer: Yes — waiting counts toward statement time.

### DB-185 — What does `lock_timeout` do?

**Difficulty:** Intermediate

**Category:** Long transactions and timeouts

**Question:**

What does `lock_timeout` do?

**Answer:**

Limits how long a statement waits to acquire any lock (table or row); on expiry it raises `55P03 lock_not_available`. Essential for migrations: `SET lock_timeout = '3s'` so a blocked `ALTER TABLE` gives up instead of stalling the queue.

**Follow-up:**

How does it differ from `statement_timeout`?

Answer: It limits only lock waiting, not execution.

### DB-186 — How do the timeout settings combine, and is there a transaction-wide timeout in PG 16?

**Difficulty:** Senior

**Category:** Long transactions and timeouts

**Question:**

How do the timeout settings combine, and is there a transaction-wide timeout in PG 16?

**Answer:**

Use `statement_timeout` (execution), `lock_timeout` (lock waits), `idle_in_transaction_session_timeout` (idle open transactions), and `idle_session_timeout` (PG 14+, idle connections). There is no `transaction_timeout` in PG 16 (added in PG 17); bound total transaction time in the app or with monitoring.

**Follow-up:**

Where should you set them?

Answer: `ALTER ROLE/DATABASE … SET`, or `SET LOCAL` in the transaction.

### DB-187 — What are prepared transactions (two-phase commit)?

**Difficulty:** Senior

**Category:** Special transactions

**Question:**

What are prepared transactions (two-phase commit)?

**Answer:**

`PREPARE TRANSACTION 'gid'` persists a transaction's state so it survives crashes without committing; later `COMMIT PREPARED 'gid'` or `ROLLBACK PREPARED 'gid'` finishes it, possibly from another session. Used by external transaction managers for XA-style coordination. Requires `max_prepared_transactions > 0` (default 0).

**Follow-up:**

What's the danger?

Answer: Orphaned prepared transactions keep locks and block vacuum; check `pg_prepared_xacts`.

### DB-188 — What does a read-only transaction give you?

**Difficulty:** Intermediate

**Category:** Special transactions

**Question:**

What does a read-only transaction give you?

**Answer:**

`BEGIN READ ONLY` rejects writes to permanent tables, protecting against accidental changes and documenting intent; no xid is assigned, so it's cheaper. It works on hot standbys, where all transactions are effectively read-only. Combined with `SERIALIZABLE DEFERRABLE`, it provides abort-free consistent reads.

**Follow-up:**

Can a read-only transaction write temp tables?

Answer: Yes.

### DB-189 — What is snapshot export, and when is it used?

**Difficulty:** Senior

**Category:** Special transactions

**Question:**

What is snapshot export, and when is it used?

**Answer:**

`SELECT pg_export_snapshot()` inside a Repeatable Read/Serializable transaction returns an ID; other sessions run `SET TRANSACTION SNAPSHOT 'id'` as their first statement to see the same data. `pg_dump --jobs` uses it for consistent parallel dumps. The exporter must stay open until importers start.

**Follow-up:**

Can it be used in Read Committed?

Answer: The importing transaction must be RR or Serializable.

### DB-190 — What is SQLSTATE `40001` and how should an application react?

**Difficulty:** Intermediate

**Category:** Retries

**Question:**

What is SQLSTATE `40001` and how should an application react?

**Answer:**

`serialization_failure`: the transaction conflicted with another at RR/Serializable (and rarely elsewhere). Your code must **roll back and retry the entire transaction** from `BEGIN`, not just the failing statement. Retrying with a new snapshot normally succeeds.

**Follow-up:**

Can `COMMIT` itself raise 40001?

Answer: Yes, at Serializable.

### DB-191 — How do you implement a correct retry loop?

**Difficulty:** Senior

**Category:** Retries

**Question:**

How do you implement a correct retry loop?

**Answer:**

Wrap the whole transaction in a function; catch `40001` and `40P01` (and optionally connection-level errors); roll back; sleep with exponential backoff plus jitter; cap attempts (e.g. 3–5); re-run all reads (don't reuse stale data). Keep the transaction idempotent and defer side effects (emails, HTTP) until after commit.

**Follow-up:**

What if the connection drops during COMMIT?

Answer: Outcome is unknown; use an idempotency key to check before retrying.

### DB-192 — Which SQLSTATE classes matter for transaction handling?

**Difficulty:** Intermediate

**Category:** Retries

**Question:**

Which SQLSTATE classes matter for transaction handling?

**Answer:**

`40001` serialization failure, `40P01` deadlock, `55P03` lock not available (NOWAIT/lock_timeout), `57014` query canceled (statement timeout), `25P02` in failed transaction, `23505` unique violation (can be retried in some races). Retry the first two; surface or handle the others deliberately.

**Follow-up:**

Should you retry on `23505`?

Answer: Only for known "insert-or-get" races, ideally replaced by `ON CONFLICT`.

### DB-193 — Where should transaction boundaries live in an ORM-based app?

**Difficulty:** Intermediate

**Category:** ORM and pooling

**Question:**

Where should transaction boundaries live in an ORM-based app?

**Answer:**

At the business-operation (service/use-case) level, not per repository call and not per HTTP request by default. One request = one unit of work with explicit begin/commit, using `@Transactional`, `transaction.atomic`, `session.begin()`, or `prisma.$transaction`. Nested blocks usually map to savepoints.

**Follow-up:**

Why not "transaction per request" for everything?

Answer: It holds connections/locks during slow non-DB work.

### DB-194 — What ORM transaction pitfalls cause production issues?

**Difficulty:** Intermediate

**Category:** ORM and pooling

**Question:**

What ORM transaction pitfalls cause production issues?

**Answer:**

Remote calls inside a transaction, swallowing an exception in a nested block and continuing on an aborted transaction, lazy loading after commit, autoflush surprises, framework proxies skipped by self-invocation (Spring), and N+1 inside long transactions. Run side effects via `on_commit` hooks or an outbox.

**Follow-up:**

How do you test for it?

Answer: Log `BEGIN`/`COMMIT` with timings and alert on `idle in transaction`.

### DB-195 — How does connection pooling interact with transactions?

**Difficulty:** Senior

**Category:** ORM and pooling

**Question:**

How does connection pooling interact with transactions?

**Answer:**

In PgBouncer transaction mode a server connection is assigned per transaction, so session state (`SET`, session advisory locks, `LISTEN`, temp tables) isn't safe; use `SET LOCAL` and `pg_advisory_xact_lock`. Session mode keeps one connection per client but pools less efficiently. A leaked open transaction ties up a pooled connection.

**Follow-up:**

Do prepared statements work through PgBouncer?

Answer: Only in recent versions that track them in transaction mode; otherwise disable server-side prepares.

### DB-196 — What is the transactional outbox pattern?

**Difficulty:** Intermediate

**Category:** Outbox and dual-write

**Question:**

What is the transactional outbox pattern?

**Answer:**

Within the same DB transaction as the business change, insert an event row into an `outbox` table. A separate relay reads committed outbox rows and publishes to the broker, then marks them sent. Because change and event commit atomically, you never publish an event for a rolled-back change or lose an event for a committed one.

**Follow-up:**

What delivery guarantee results?

Answer: At-least-once, so consumers must be idempotent.

### DB-197 — Why is dual-write (DB + message broker) unsafe?

**Difficulty:** Senior

**Category:** Outbox and dual-write

**Question:**

Why is dual-write (DB + message broker) unsafe?

**Answer:**

Two systems can't commit atomically: if the DB commits and publish fails, the event is lost; if you publish first and the DB rolls back, you've announced something that didn't happen; ordering can also be inconsistent under retries. Fixes: outbox, change data capture, or 2PC (rarely practical).

**Follow-up:**

Does wrapping the publish in the transaction fix it?

Answer: No — broker send isn't part of the DB's commit.

### DB-198 — How do you build the outbox relay on PostgreSQL?

**Difficulty:** Staff

**Category:** Outbox and dual-write

**Question:**

How do you build the outbox relay on PostgreSQL?

**Answer:**

Option 1: poll with `SELECT … FROM outbox WHERE sent_at IS NULL ORDER BY id LIMIT n FOR UPDATE SKIP LOCKED`, publish, then mark sent in the same transaction. Option 2: logical decoding/CDC (e.g. Debezium) reading the WAL, avoiding polling. Beware: sequence IDs can commit out of order, so a naive "id > last_seen" cursor can skip rows; prefer a sent flag or CDC. Periodically delete or partition old rows.

**Follow-up:**

How do consumers handle duplicates?

Answer: Dedupe by event ID in an inbox table or idempotent operations.

### DB-199 — Is DDL transactional in PostgreSQL, and what isn't rolled back?

**Difficulty:** Intermediate

**Category:** Patterns

**Question:**

Is DDL transactional in PostgreSQL, and what isn't rolled back?

**Answer:**

Yes: `CREATE/ALTER/DROP TABLE` are transactional, so migrations can be atomic. Exceptions: `CREATE INDEX CONCURRENTLY`, `VACUUM`, `CREATE DATABASE`, and similar can't run in a transaction block. Sequence values (`nextval`) are not rolled back, so rollbacks leave gaps; `NOTIFY` is delivered only on commit.

**Follow-up:**

Can you rely on gapless IDs from sequences?

Answer: No; use a counter table with locking if legally required.

### DB-200 — Optimistic vs pessimistic concurrency: how do you choose?

**Difficulty:** Senior

**Category:** Patterns

**Question:**

Optimistic vs pessimistic concurrency: how do you choose?

**Answer:**

Optimistic: add a `version` column and `UPDATE … SET …, version = version + 1 WHERE id = $1 AND version = $2`; zero rows updated means conflict → reload/retry. Best for low contention and long user think-time. Pessimistic: `SELECT … FOR UPDATE` serializes access; best for high contention or short critical sections. Serializable + retry is a third, declarative option.

**Follow-up:**

What breaks optimistic locking?

Answer: Updates that bypass the version check, e.g. raw SQL or other services.
