# DB04 — Transactions

PostgreSQL 16. Questions DB-151–DB-200.

ACID, savepoints, isolation levels and anomalies, row and table locks, deadlocks, advisory locks, timeouts, retry patterns, ORM boundaries, and outbox vs dual-write. Indexing is DB03.

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

### DB-152 — How do BEGIN, COMMIT, and ROLLBACK work, and what is autocommit?

**Difficulty:** Intermediate

**Category:** ACID and basics

**Question:**

How do BEGIN, COMMIT, and ROLLBACK work, and what is autocommit?

**Answer:**

Outside an explicit block, each statement runs in its own transaction and commits automatically. That is autocommit. `BEGIN` (or `START TRANSACTION`) opens a block so several statements succeed or fail together. `COMMIT` makes the changes permanent and visible to others; `ROLLBACK` discards them. The server has no "autocommit off" switch. Client drivers such as psycopg and JDBC fake it by sending `BEGIN` before your first statement.

**Follow-up:**

Why is a driver that silently opens a transaction dangerous?

Answer: If the code forgets to commit or roll back, the connection stays `idle in transaction`. It keeps locks and its snapshot open, which blocks migrations and vacuum.

### DB-153 — What happens when a statement fails inside a transaction?

**Difficulty:** Intermediate

**Category:** ACID and basics

**Question:**

What happens when a statement fails inside a transaction?

**Answer:**

The whole transaction moves into an aborted state. Every later command fails with `25P02 current transaction is aborted, commands ignored until end of transaction block` until you end the block. Calling `COMMIT` on an aborted transaction just performs a rollback. The only way to keep working is to roll back to a savepoint you created earlier, which undoes the failed part without discarding the whole transaction.

**Follow-up:**

How does this differ from MySQL/InnoDB?

Answer: By default InnoDB rolls back only the failing statement and lets the transaction continue. Postgres makes you decide explicitly, using a savepoint.

### DB-154 — What are savepoints, and when would you use them?

**Difficulty:** Intermediate

**Category:** ACID and basics

**Question:**

What are savepoints, and when would you use them?

**Answer:**

A savepoint is a named marker inside a transaction. `SAVEPOINT name` sets it, and `ROLLBACK TO SAVEPOINT name` undoes everything since then while the transaction and the savepoint stay alive. `RELEASE SAVEPOINT` just removes the marker. Use one around an optional step that might fail, such as an insert that could violate a constraint, so a failure doesn't abort the outer transaction. Internally, savepoints are subtransactions.

**Follow-up:**

What is the cost of many savepoints?

Answer: Each savepoint that writes data gets its own subtransaction ID. Once one session has more than 64 open at a time, the per-session cache overflows and other sessions' visibility checks must consult `pg_subtrans`, which slows things down under concurrency.

### DB-155 — Do PL/pgSQL `EXCEPTION` blocks create savepoints? Can a function COMMIT?

**Difficulty:** Intermediate

**Category:** ACID and basics

**Question:**

Do PL/pgSQL `EXCEPTION` blocks create savepoints? Can a function COMMIT?

**Answer:**

Yes. A `BEGIN … EXCEPTION WHEN … END` block runs in a subtransaction, so catching an error undoes only that block's changes. Functions cannot run `COMMIT` or `ROLLBACK`. Procedures called with `CALL` can, since PG 11, as long as `CALL` is not inside an outer transaction block that you started yourself. A procedure cannot commit from inside an exception block either.

**Follow-up:**

Why avoid wrapping every loop iteration in an exception block?

Answer: Each iteration starts a subtransaction, which adds overhead. On big loops that cost adds up, so catch errors at a coarser level when you can.

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

### DB-161 — What is a dirty read, and can it happen in PostgreSQL?

**Difficulty:** Intermediate

**Category:** Anomalies

**Question:**

What is a dirty read, and can it happen in PostgreSQL?

**Answer:**

A dirty read is reading data that another transaction has written but not yet committed. If that transaction rolls back, you acted on data that never existed. It cannot happen in Postgres at any isolation level, because MVCC only shows you committed row versions plus your own changes.

**Follow-up:**

Which standard level is supposed to prevent it?

Answer: Read Committed and above. Postgres treats `READ UNCOMMITTED` as Read Committed, so it is protected there too.

### DB-162 — What is a non-repeatable read?

**Difficulty:** Intermediate

**Category:** Anomalies

**Question:**

What is a non-repeatable read?

**Answer:**

It happens when you read the same row twice in one transaction and get different values, because another transaction committed a change in between. It is possible in Read Committed, since every statement gets a new snapshot. Repeatable Read and Serializable prevent it, because they keep one snapshot for the whole transaction.

**Follow-up:**

When does it matter?

Answer: When several queries must agree with each other, such as a report that computes totals with two separate queries. Run it at Repeatable Read so both see the same data.

### DB-163 — What is a phantom read, and how does Postgres handle it?

**Difficulty:** Intermediate

**Category:** Anomalies

**Question:**

What is a phantom read, and how does Postgres handle it?

**Answer:**

A phantom read is when you repeat a query with the same condition and get a different set of rows, because another transaction inserted or deleted matching rows in between. Read Committed allows it. In Postgres, Repeatable Read prevents it because the snapshot is fixed. The SQL standard would still allow phantoms at that level, so Postgres is stricter.

**Follow-up:**

Does preventing phantom reads prevent write skew?

Answer: No. Write skew is a separate anomaly. Repeatable Read prevents phantoms but still allows write skew.

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

### DB-166 — What is the "read-only transaction anomaly" in snapshot isolation?

**Difficulty:** Staff

**Category:** Anomalies

**Question:**

What is the "read-only transaction anomaly" in snapshot isolation?

**Answer:**

A read-only transaction can see a state that never existed in any one-at-a-time ordering. This happens when its snapshot falls between the commits of two writers that depend on each other. Postgres Serializable can detect this and abort a transaction. Alternatively, `SERIALIZABLE READ ONLY DEFERRABLE` waits until it can take a snapshot that is guaranteed safe, then runs with no risk of being aborted.

**Follow-up:**

When is DEFERRABLE useful?

Answer: For long reports and backups running at Serializable. You accept a short wait at the start in exchange for never being aborted halfway through.

### DB-167 — How do you set a transaction's isolation level, and what are the restrictions?

**Difficulty:** Intermediate

**Category:** Anomalies

**Question:**

How do you set a transaction's isolation level, and what are the restrictions?

**Answer:**

Use `BEGIN ISOLATION LEVEL REPEATABLE READ;`, or run `SET TRANSACTION ISOLATION LEVEL …` as the first statement in the transaction, before any query. The default comes from `default_transaction_isolation`, which can be set per session, role, or database. The level cannot be changed after the first query, and it cannot be set inside a subtransaction.

**Follow-up:**

Can you change level mid-transaction?

Answer: No. Postgres raises `SET TRANSACTION ISOLATION LEVEL must be called before any query`. End the transaction and start a new one.

### DB-168 — How does MVCC provide snapshots?

**Difficulty:** Intermediate

**Category:** MVCC

**Question:**

How does MVCC provide snapshots?

**Answer:**

Every row version records `xmin`, the transaction that created it, and `xmax`, the transaction that deleted or locked it. A snapshot records which transactions were still running when it was taken. A row version is visible if its creator had committed before the snapshot and its deleter had not. So readers never block writers. Old versions stay on disk until `VACUUM` removes them.

**Follow-up:**

What does this imply for `UPDATE`?

Answer: An update writes a new row version and leaves the old one behind. Heavy updates therefore create dead tuples and table bloat that vacuum must clean up.

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

### DB-171 — What does `NOWAIT` do?

**Difficulty:** Intermediate

**Category:** Row locks

**Question:**

What does `NOWAIT` do?

**Answer:**

`SELECT … FOR UPDATE NOWAIT` raises an error immediately, `55P03 could not obtain lock on row`, if any row it wants is already locked, instead of waiting. It suits fail-fast behaviour, such as telling a user "this record is being edited by someone else", rather than leaving the request hanging.

**Follow-up:**

Difference from `lock_timeout`?

Answer: `NOWAIT` never waits at all. `lock_timeout` waits up to a limit you choose, then fails.

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

### DB-173 — Where does Postgres store row locks?

**Difficulty:** Senior

**Category:** Row locks

**Question:**

Where does Postgres store row locks?

**Answer:**

In the row itself: the tuple header holds the locking transaction ID in `xmax` plus some flag bits. Row locks are not kept in shared memory, so locking millions of rows won't overflow a lock table. The cost is that locking a row modifies its page, which dirties the page and generates WAL. When several transactions share-lock the same row, Postgres uses a MultiXact ID to represent the group.

**Follow-up:**

Why is `SELECT … FOR SHARE` on a huge table expensive?

Answer: It writes to every row it touches, so a big scan turns into a big write workload with extra WAL.

### DB-174 — Name the main table-level lock modes.

**Difficulty:** Intermediate

**Category:** Table locks

**Question:**

Name the main table-level lock modes.

**Answer:**

From weakest to strongest: `ACCESS SHARE` (plain `SELECT`), `ROW SHARE` (`FOR UPDATE`/`FOR SHARE`), `ROW EXCLUSIVE` (`INSERT`/`UPDATE`/`DELETE`), `SHARE UPDATE EXCLUSIVE` (`VACUUM`, `CREATE INDEX CONCURRENTLY`), `SHARE` (`CREATE INDEX`), `SHARE ROW EXCLUSIVE`, `EXCLUSIVE`, and `ACCESS EXCLUSIVE` (`DROP`, `TRUNCATE`, `VACUUM FULL`, and most `ALTER TABLE`). Row locks and table locks are separate; a write takes both.

**Follow-up:**

Which lock mode blocks plain SELECT?

Answer: Only `ACCESS EXCLUSIVE`. Every other table lock mode lets ordinary reads proceed.

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

### DB-178 — How do you prevent deadlocks?

**Difficulty:** Senior

**Category:** Deadlocks

**Question:**

How do you prevent deadlocks?

**Answer:**

Make every transaction take locks in the same order, for example by sorting IDs before updating a batch. Keep transactions short, never wait for user input inside one, and lock rows up front with `SELECT … FOR UPDATE ORDER BY id`. Retry on `40P01` anyway, because some cases slip through. Foreign-key and unique-index checks can also take locks in unexpected orders.

**Follow-up:**

Why do bulk `UPDATE`s without `ORDER BY` deadlock?

Answer: Two sessions can visit the same rows in different orders, so each ends up holding a row the other needs.

### DB-179 — How do you diagnose blocking and lock waits?

**Difficulty:** Intermediate

**Category:** Deadlocks

**Question:**

How do you diagnose blocking and lock waits?

**Answer:**

Start with `pg_stat_activity` and look for `wait_event_type = 'Lock'`. Use `pg_blocking_pids(pid)` to see who blocks a session, and `pg_locks` for details on which locks are held and wanted. Turn on `log_lock_waits` to log waits longer than `deadlock_timeout`. To clear a blocker, use `pg_cancel_backend` to cancel its query, or `pg_terminate_backend` to end its session.

**Follow-up:**

How do you find the root blocker?

Answer: Follow `pg_blocking_pids` until you reach a process that is not itself waiting. It is often a session stuck `idle in transaction`.

### DB-180 — What are advisory locks?

**Difficulty:** Intermediate

**Category:** Advisory locks

**Question:**

What are advisory locks?

**Answer:**

Advisory locks are locks your application defines, identified by a bigint (or two int4 values). They aren't tied to any row or table; Postgres just enforces that two holders can't take the same key. Session-level locks (`pg_advisory_lock`) last until unlocked or disconnected. Transaction-level locks (`pg_advisory_xact_lock`) release at commit or rollback. `pg_try_advisory_lock` returns false instead of waiting. Common uses are single-runner cron jobs and per-entity serialization.

**Follow-up:**

Are they affected by rollback?

Answer: Session-level locks are not. They stay held after a rollback until you unlock or disconnect. Transaction-level locks release automatically.

### DB-181 — What are the pitfalls of advisory locks?

**Difficulty:** Senior

**Category:** Advisory locks

**Question:**

What are the pitfalls of advisory locks?

**Answer:**

Session-level locks leak if code forgets to unlock them. They also misbehave behind PgBouncer in transaction mode, because the lock belongs to a server connection you may not get back. Prefer `pg_advisory_xact_lock`. Different features can accidentally pick the same key. The number of locks is also limited by shared memory, governed by `max_locks_per_transaction`.

**Follow-up:**

How do you reduce key collisions?

Answer: Use the two-integer form, with the first integer as a fixed namespace constant per feature and the second as the entity ID.

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

### DB-184 — What does `statement_timeout` do?

**Difficulty:** Intermediate

**Category:** Long transactions and timeouts

**Question:**

What does `statement_timeout` do?

**Answer:**

It cancels any single statement that runs longer than the limit, with `57014 canceling statement due to statement timeout`. The default is 0, meaning disabled. Set it per role or database for web apps, and use `SET LOCAL` for specific transactions. It limits each statement on its own, not the total length of a transaction.

**Follow-up:**

Does it cover time spent waiting for locks?

Answer: Yes. Waiting for a lock counts toward the statement's time.

### DB-185 — What does `lock_timeout` do?

**Difficulty:** Intermediate

**Category:** Long transactions and timeouts

**Question:**

What does `lock_timeout` do?

**Answer:**

It limits how long a statement will wait to acquire any lock, table or row. When the time runs out, it fails with `55P03 lock_not_available`. It is essential for migrations: with `SET lock_timeout = '3s'`, a blocked `ALTER TABLE` gives up quickly instead of stalling every other query queued behind it.

**Follow-up:**

How does it differ from `statement_timeout`?

Answer: It limits only the time spent waiting for locks. Once the statement is running, `lock_timeout` no longer applies.

### DB-186 — How do the timeout settings combine, and is there a transaction-wide timeout in PG 16?

**Difficulty:** Senior

**Category:** Long transactions and timeouts

**Question:**

How do the timeout settings combine, and is there a transaction-wide timeout in PG 16?

**Answer:**

Each setting covers a different problem. `statement_timeout` limits execution time, `lock_timeout` limits lock waits, `idle_in_transaction_session_timeout` ends transactions left idle, and `idle_session_timeout` (PG 14+) closes idle connections. There is no `transaction_timeout` in PG 16; it arrived in PG 17. To bound total transaction time on 16, enforce it in the application or with monitoring.

**Follow-up:**

Where should you set them?

Answer: Use `ALTER ROLE … SET` or `ALTER DATABASE … SET` for defaults, and `SET LOCAL` inside a transaction for exceptions.

### DB-187 — What are prepared transactions (two-phase commit)?

**Difficulty:** Senior

**Category:** Special transactions

**Question:**

What are prepared transactions (two-phase commit)?

**Answer:**

`PREPARE TRANSACTION 'gid'` saves a transaction's state to disk so it survives a crash without being committed. Later, `COMMIT PREPARED 'gid'` or `ROLLBACK PREPARED 'gid'` finishes it, even from another session. External transaction managers use this for XA-style coordination across systems. It needs `max_prepared_transactions` set above its default of 0.

**Follow-up:**

What's the danger?

Answer: An orphaned prepared transaction keeps its locks and holds back vacuum indefinitely. Check `pg_prepared_xacts` regularly.

### DB-188 — What does a read-only transaction give you?

**Difficulty:** Intermediate

**Category:** Special transactions

**Question:**

What does a read-only transaction give you?

**Answer:**

`BEGIN READ ONLY` makes Postgres reject writes to permanent tables, which protects against accidental changes and documents your intent. Postgres assigns a transaction ID only when a transaction first writes, so it isn't a big performance gain on its own. All transactions on a hot standby are read-only anyway. Combined with `SERIALIZABLE DEFERRABLE`, it gives consistent reads that cannot be aborted.

**Follow-up:**

Can a read-only transaction write temp tables?

Answer: Yes. Temporary tables are exempt from the read-only restriction.

### DB-189 — What is snapshot export, and when is it used?

**Difficulty:** Senior

**Category:** Special transactions

**Question:**

What is snapshot export, and when is it used?

**Answer:**

Snapshot export lets several sessions read exactly the same data. One session, normally at Repeatable Read, calls `pg_export_snapshot()` and gets an ID. Other sessions run `SET TRANSACTION SNAPSHOT 'id'` as their first statement and then see that same snapshot. `pg_dump --jobs` uses this for consistent parallel dumps. The exporting transaction must stay open until every importer has started.

**Follow-up:**

Can it be used in Read Committed?

Answer: The importing transaction must already be Repeatable Read or Serializable. A Read Committed transaction can't import a snapshot.

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

### DB-191 — How do you implement a correct retry loop?

**Difficulty:** Senior

**Category:** Retries

**Question:**

How do you implement a correct retry loop?

**Answer:**

Put the entire transaction in one function. Catch `40001` and `40P01` (and optionally connection errors), roll back, wait with exponential backoff plus random jitter, and cap the attempts, for example at 3–5. Each attempt must re-run all its reads, never reuse stale values. Make the work idempotent, and defer side effects such as emails or HTTP calls until after a successful commit.

**Follow-up:**

What if the connection drops during COMMIT?

Answer: Then you don't know whether it committed. Use an idempotency key or a lookup to check the outcome before retrying.

### DB-192 — Which SQLSTATE classes matter for transaction handling?

**Difficulty:** Intermediate

**Category:** Retries

**Question:**

Which SQLSTATE classes matter for transaction handling?

**Answer:**

The common ones: `40001` serialization failure, `40P01` deadlock, `55P03` lock not available (from `NOWAIT` or `lock_timeout`), `57014` query canceled (statement timeout), `25P02` transaction already aborted, and `23505` unique violation. Retry the first two automatically. Treat the others deliberately: surface them to the caller, or handle a specific case, such as a unique violation in a known race.

**Follow-up:**

Should you retry on `23505`?

Answer: Only for known "insert if missing" races, and even then `INSERT … ON CONFLICT` is usually the better fix.

### DB-193 — Where should transaction boundaries live in an ORM-based app?

**Difficulty:** Intermediate

**Category:** ORM and pooling

**Question:**

Where should transaction boundaries live in an ORM-based app?

**Answer:**

At the business-operation level, meaning the service or use case, not on every repository call. One operation is one unit of work with an explicit begin and commit, using `@Transactional`, `transaction.atomic`, `session.begin()`, or `prisma.$transaction`. Nested blocks usually become savepoints. Wrapping the whole HTTP request is not a good default.

**Follow-up:**

Why not "transaction per request" for everything?

Answer: It keeps a connection and locks open during slow non-database work, such as calling another service.

### DB-194 — What ORM transaction pitfalls cause production issues?

**Difficulty:** Intermediate

**Category:** ORM and pooling

**Question:**

What ORM transaction pitfalls cause production issues?

**Answer:**

The usual ones: remote calls inside a transaction; catching an error in a nested block and carrying on with an aborted transaction; lazy loading after the commit; surprise autoflush; Spring proxies bypassed by self-invocation; and N+1 queries inside long transactions. Run side effects after commit with `on_commit` hooks, or use an outbox.

**Follow-up:**

How do you test for it?

Answer: Log `BEGIN` and `COMMIT` with timings, and alert on sessions stuck `idle in transaction`.

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

### DB-199 — Is DDL transactional in PostgreSQL, and what isn't rolled back?

**Difficulty:** Intermediate

**Category:** Patterns

**Question:**

Is DDL transactional in PostgreSQL, and what isn't rolled back?

**Answer:**

Yes. `CREATE`, `ALTER`, and `DROP TABLE` are transactional, so a migration can succeed or fail as a whole. A few commands can't run inside a transaction block, including `CREATE INDEX CONCURRENTLY`, `VACUUM`, and `CREATE DATABASE`. Some effects also ignore rollback: sequence values from `nextval` are not returned, which leaves gaps. `NOTIFY` messages are delivered only if the transaction commits.

**Follow-up:**

Can you rely on gapless IDs from sequences?

Answer: No. If gapless numbering is legally required, such as invoice numbers, use a counter table updated under a row lock in the same transaction, and accept that it serializes writers.

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
