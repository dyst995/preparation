# DB02 — PostgreSQL internals and data storage

PostgreSQL 16. Questions DB-051–DB-100.

These questions cover the process model, MVCC tuple versions, heap storage, vacuum and freezing, WAL and checkpoints, the buffer cache, planner statistics, and the architecture of connections versus pooling. Index page layout and isolation anomalies are later files. Schemas below are hypothetical. A number quoted as a default is the PostgreSQL 16 setting, not a measurement from a running server.

### DB-051 — The postmaster is the parent of every other process

**Difficulty:** Intermediate

**Category:** Processes

**Question:**

What does the postmaster do, and which long-lived processes does a normal PostgreSQL 16 primary start?

**Context and Constraints:**

One primary, already past startup. `archive_mode` is off, so there is no archiver. No standby is connected. The answer is the process tree, not a memory-sizing exercise.

**Senior Engineer's Answer:**

The postmaster is the parent process. It listens for connections, forks a backend for each one, and starts the auxiliary processes. It does not parse SQL, pin buffers, or read heap pages. Those processes are children, and they share memory that the postmaster created.

On this primary the children you should be able to name are:

- The checkpointer, which writes dirty shared buffers at a checkpoint and records the redo point.
- The background writer, which writes some dirty buffers ahead of backends so a backend is less likely to have to write one itself to free a slot.
- The WAL writer, which moves WAL from WAL buffers toward durable storage.
- The autovacuum launcher, which starts autovacuum workers. Workers come and go. They are not a single permanent vacuum process.
- The logical replication launcher, present when logical replication workers are allowed. With the default `max_logical_replication_workers` of 4, that launcher is running even if no subscription exists.
- Client backends, one per current connection, plus parallel workers when a query asked for them.

`pg_stat_activity` lists those children in `backend_type`. The postmaster itself is not a row. An archiver appears only when `archive_mode` is on. A WAL receiver belongs to a standby. A WAL sender appears when something has connected to replicate. Those are absent from the primary described here.

If an auxiliary process exits, the postmaster starts a new one. If a backend crashes in a way that means shared memory can no longer be trusted, the postmaster does not keep serving. It signals the other backends to quit, throws the shared memory away, and runs crash recovery from the last checkpoint before it accepts connections again. A normal client disconnect is not that event. The postmaster reaps that one backend and continues.

**Practical Implementation:**

```sql
SELECT backend_type, count(*) AS processes
FROM pg_stat_activity
GROUP BY backend_type
ORDER BY backend_type;
```

On the primary in the question, the grouped types include `checkpointer`, `background writer`, `walwriter`, `autovacuum launcher`, and `client backend`. `autovacuum worker` appears only while a worker is running. The postmaster is the OS parent of these processes and has no `backend_type`.

**Trade-offs and Alternatives:**

One process per connection keeps a fault in one session from being a thread crash inside a process that also serves other sessions. The cost is the process tree itself: more connections means more backends, and the auxiliary processes are mandatory overhead on top of that. Pooling, covered later, changes how many client sockets become backends. It does not remove the checkpointer, the background writer, the WAL writer, or the autovacuum launcher.

**Common Mistakes:**

- Describing the postmaster as the process that executes `SELECT`.
- Calling the background writer the process that performs checkpoints. That job belongs to the checkpointer. They have been separate processes since long before PostgreSQL 16.
- Expecting a stats-collector process. PostgreSQL 15 moved cumulative statistics into shared memory, and PostgreSQL 16 has no stats-collector process.
- Treating a crashed backend as a single-session failure the postmaster can ignore. Shared memory is shared, so the postmaster recovers the whole cluster.

**Senior-Level Follow-up:**

A backend hits a segmentation fault while executing a query. What do the other sessions observe, and what does the postmaster do before it accepts work again?

**Answer:** The other backends are taken down. Their in-flight transactions roll back during recovery. The postmaster rebuilds shared memory and replays WAL from the last checkpoint's redo point. Committed transactions whose WAL was already flushed are replayed. The data directory is then consistent again, and new connections are accepted. The surviving guarantee is the WAL, not the private memory of the crashed backend.

### DB-052 — One client session is one backend, plus any parallel workers it starts

**Difficulty:** Intermediate

**Category:** Processes

**Question:**

What is the relationship between a client connection and an operating-system process? When does one session become more than one process?

**Context and Constraints:**

PostgreSQL 16 defaults: `max_connections` is 100, `superuser_reserved_connections` is 3, `max_worker_processes` is 8, `max_parallel_workers` is 8, `max_parallel_workers_per_gather` is 2. No pooler sits in front. Parallel query is enabled.

**Senior Engineer's Answer:**

A client connection is served by one backend process, forked by the postmaster and dedicated to that session until the session ends. The backend parses, plans, and executes SQL, and it owns that session's private state: the current database and user, `SET` values, prepared statements, temporary tables, and the open transaction.

The 100 in `max_connections` is a cap on that class of process, not a cap on every process in the tree. Three of those slots are reserved for superusers by `superuser_reserved_connections`. Autovacuum workers do not consume `max_connections`. A non-superuser who arrives when the non-reserved slots are full is rejected. The auxiliary processes keep running.

A parallel query adds processes. The client backend can start parallel workers, each a separate process, bounded by `max_parallel_workers_per_gather` for one gather node and by `max_parallel_workers` and `max_worker_processes` for the cluster. Those workers share the query's snapshot and return rows to the leader. They are not extra client connections, and they disappear when the parallel portion of the plan ends. A session that is idle has no parallel workers.

An idle backend still costs a process slot and the memory that backend has allocated for itself. `work_mem` is not reserved up front for the life of the connection. It is a per-operation ceiling for a sort or a hash, and one statement can run several such operations, each allowed `work_mem`, with parallel workers adding their own. The dangerous product is concurrent operations times `work_mem`, not a flat reservation of `work_mem` at connect time.

**Practical Implementation:**

```sql
SELECT pid,
       backend_type,
       state,
       leader_pid
FROM pg_stat_activity
WHERE backend_type IN ('client backend', 'parallel worker')
ORDER BY COALESCE(leader_pid, pid), pid;
```

A client row has a null `leader_pid`. A parallel worker row's `leader_pid` is the pid of the client backend that started it. After the query finishes, the worker rows are gone and the client row remains, typically `idle` or `idle in transaction`.

**Trade-offs and Alternatives:**

Raising `max_connections` lets more clients connect directly and raises the size of shared structures sized from that parameter, including the lock table. It does not make each backend cheaper. When the client count is far above the number of backends you want executing, the architecture is a pool in front of a smaller `max_connections`, which is a later question. Parallel workers are the other direction: one client deliberately using several processes for one plan.

**Common Mistakes:**

- Multiplying `max_connections` by `work_mem` and calling the product the memory already in use. `work_mem` is spent when a sort or hash runs, and a second time for each additional node or worker that needs one.
- Counting autovacuum workers against `max_connections`.
- Treating `leader_pid` as a second client connection. It is a worker attached to the leader's query.
- Using a superuser application account so that `superuser_reserved_connections` becomes the application pool. Those slots are the way an administrator still gets in when the database is full.

**Senior-Level Follow-up:**

A statement reaches `max_parallel_workers_per_gather` of 2, but `max_parallel_workers` is already fully used by other sessions. How many processes execute the statement?

**Answer:** The leader still executes it. The gather gets fewer workers than the plan preferred, down to zero extra processes. The statement does not wait for a parallel slot and does not borrow another session's client backend. The plan's parallel degree was a ceiling, and the leader is always one of the processes.

### DB-053 — Three processes write, and they do not write the same thing

**Difficulty:** Senior

**Category:** Processes

**Question:**

What does the checkpointer write, what does the background writer write, and what does the WAL writer write?

**Context and Constraints:**

PostgreSQL 16 defaults: `checkpoint_timeout` is 5 minutes, `max_wal_size` is 1 GB, `checkpoint_completion_target` is 0.9, `bgwriter_delay` is 200 ms, `bgwriter_lru_maxpages` is 100, `wal_writer_delay` is 200 ms. `synchronous_commit` is `on`.

**Senior Engineer's Answer:**

All three move bytes toward disk. They own different bytes.

The checkpointer writes dirty shared buffers during a checkpoint, asks the kernel to flush those files, and records a checkpoint in WAL and in the control file. That record is what crash recovery starts from. A checkpoint also begins when WAL volume approaches `max_wal_size`, and on a schedule of `checkpoint_timeout`. `checkpoint_completion_target` of 0.9 tells the checkpointer to spread the buffer writes over most of the interval instead of issuing them in one spike. The checkpointer is the process that can say "every dirty shared buffer as of this redo point has been written."

The background writer writes a limited number of dirty buffers between checkpoints, about `bgwriter_lru_maxpages` per `bgwriter_delay` cycle, chosen from buffers the clock sweep is likely to evict. Its purpose is to keep a free buffer from costing a random write inside a client backend. It does not create a recovery point. After the background writer has run, a crash still replays WAL back to the last checkpoint, because a buffer it wrote is not a substitute for a checkpoint record.

The WAL writer flushes WAL buffers. WAL is the log of changes, not the heap pages. With `synchronous_commit` on, a committing backend still waits until its own commit record has been flushed; the WAL writer does not replace that wait. The WAL writer does flush buffers on its delay, which is what makes `synchronous_commit = off` able to return before a backend's own flush, and it helps group WAL I/O. Heap pages and WAL are separate streams. A committed transaction can be durable in WAL while the heap page is still dirty in `shared_buffers`.

A client backend writes only when it has to. If it needs a buffer slot and the victim is dirty, it writes that victim itself. The background writer and the checkpointer exist so that this path is the exception.

**Practical Implementation:**

```sql
SELECT name, setting, unit
FROM pg_settings
WHERE name IN (
  'checkpoint_timeout',
  'max_wal_size',
  'checkpoint_completion_target',
  'bgwriter_delay',
  'bgwriter_lru_maxpages',
  'wal_writer_delay',
  'synchronous_commit'
)
ORDER BY name;
```

The defaults above are what this query returns on an unedited PostgreSQL 16 cluster. `pg_stat_bgwriter` separates checkpoint activity from background-writer activity: checkpoints have a count and a reason, and buffers written by the background writer are not buffers written by checkpoints.

**Trade-offs and Alternatives:**

A shorter `checkpoint_timeout` or a smaller `max_wal_size` shortens the WAL that recovery might replay, and it writes dirty buffers more often. A longer interval absorbs bursts and writes a hot page once instead of many times, and recovery has more WAL to read. Raising `bgwriter_lru_maxpages` spends I/O earlier to keep query backends off the write path. It never replaces the checkpointer, because recovery needs the checkpoint record.

**Common Mistakes:**

- Saying the WAL writer writes heap pages, or that the checkpointer writes only WAL.
- Turning `synchronous_commit` off and expecting the background writer to provide the commit flush. The background writer does not flush commit records.
- Treating a busy background writer as proof that checkpoints are healthy. The two counters measure different writes.
- Expecting `checkpoint_completion_target` to apply to a manual `CHECKPOINT`. A requested checkpoint runs promptly. The target spreads the automatic ones.

**Senior-Level Follow-up:**

A backend wants a shared buffer, the clock sweep lands on a dirty unpinned buffer, and the background writer has not written it. Who writes it, and does that write commit a transaction?

**Answer:** That backend writes the dirty buffer so it can reuse the slot. The write is buffer eviction, not a commit. The transaction that dirtied the page may already be committed, or it may still be open. Durability of a commit is the WAL flush of its commit record, which is a different process path.

### DB-054 — A checkpoint is the redo point recovery starts from

**Difficulty:** Senior

**Category:** WAL

**Question:**

What does a checkpoint record, and what does crash recovery actually replay?

**Context and Constraints:**

PostgreSQL 16, `wal_level` at its default of `replica`, `fsync` on, `full_page_writes` on. The cluster has crashed and the postmaster is starting it. No human has deleted files under `pg_wal`.

**Senior Engineer's Answer:**

A checkpoint is a point in the WAL from which the heap and index files, plus that WAL, are enough to rebuild a consistent cluster. While the checkpoint runs, ordinary transactions continue. Their commits still flush WAL. The checkpointer writes the shared buffers that were dirty, flushes the data files, and then writes a checkpoint record. The control file stores the redo location. Recovery begins at that redo location, not at the end of the WAL and not at the start of the cluster's life.

Replay installs WAL records in order until the WAL is exhausted. A record describes a change that had already been logged. If the change was also already present in a data file, replay is written so that applying it again matches. If a commit record is in the flushed WAL, that transaction is committed after replay. If a transaction had no flushed commit record, it is not committed, and its partial effects are undone by the replay rules. The crash can lose only transactions that had not yet been told they committed, assuming `synchronous_commit` is on. That interaction is the next question's durability rule; the checkpoint question's rule is where replay starts.

`max_wal_size` of 1 GB is a target for how much WAL may accumulate between checkpoints, not a hard cap the server refuses to pass. WAL keeps being written during the checkpoint itself, so the bytes on disk can be larger than the setting. `min_wal_size` of 80 MB is how much old WAL the server prefers to rename and reuse instead of deleting. WAL is also retained when a replication slot still needs it or when archive mode has not finished shipping it. A checkpoint does not delete WAL that one of those holders still requires.

`log_checkpoints` defaults to on in PostgreSQL 16, so each checkpoint writes a log line with the number of buffers written and the reason: time or WAL volume.

**Practical Implementation:**

```sql
SELECT checkpoint_time,
       redo_wal_file,
       redo_lsn,
       checkpoint_lsn
FROM pg_control_checkpoint();
```

`redo_lsn` is the location recovery will start from after a crash. `checkpoint_time` is when that checkpoint completed. This view reads the control file. It is the on-disk answer, not a statistic that resets when a session disconnects.

**Trade-offs and Alternatives:**

Time-based checkpoints bound recovery even when the workload is quiet. WAL-volume checkpoints bound recovery when the workload is heavy and `checkpoint_timeout` has not elapsed. A manual `CHECKPOINT` forces one before a planned restart when you want the following startup to have little to replay. It is a flush of dirty shared buffers, so it is real I/O. It is the wrong tool to call after every commit. Commit already flushed the WAL record that makes that transaction durable.

**Common Mistakes:**

- Thinking recovery replays from the oldest file still sitting in `pg_wal`. It starts at the redo location stored by the last complete checkpoint.
- Deleting files in `pg_wal` because a checkpoint "finished." Those files are the replay log. Removing them is how a crash becomes unrecoverable.
- Expecting a checkpoint to shrink a table. It writes dirty pages. It does not vacuum them.
- Treating `max_wal_size` as a quota the server will not exceed. It is the target that triggers the next checkpoint.

**Senior-Level Follow-up:**

A checkpoint has started and has not finished. A transaction commits, and then the host loses power. Is that commit present after restart?

**Answer:** Yes, when `synchronous_commit` is on and the commit returned, because the commit waited for its WAL record to be flushed. Recovery starts at the previous complete checkpoint's redo location, because the in-progress checkpoint had not published a new one, and replay includes the flushed commit. The heap page for that row may be rewritten by replay rather than found already in the data file. The commit does not depend on the new checkpoint having finished.

### DB-055 — A commit waits for WAL, and the heap page can stay dirty

**Difficulty:** Senior

**Category:** WAL

**Question:**

Walk through `COMMIT` for an `UPDATE` of one row when `synchronous_commit` is on. What is durable when the command returns, and what can still be only in memory?

**Context and Constraints:**

PostgreSQL 16 defaults: `synchronous_commit` is `on`, `fsync` is `on`, `wal_level` is `replica`. One backend, one row, no replica in the wait. The default isolation level is Read Committed. This question is the durability of the commit, not a write skew example.

Hypothetical table, already created and populated:

```sql
CREATE TABLE ledger (
  id integer PRIMARY KEY,
  balance_cents integer NOT NULL
);

INSERT INTO ledger (id, balance_cents) VALUES (1, 100);
```

The statement under discussion is:

```sql
BEGIN;
UPDATE ledger SET balance_cents = 250 WHERE id = 1;
COMMIT;
```

**Senior Engineer's Answer:**

`UPDATE` creates a new heap tuple version and writes a WAL record that describes that change. The WAL record goes into WAL buffers. The heap page in `shared_buffers` is dirty. Neither of those facts is a commit.

`COMMIT` appends a commit record and flushes WAL at least through that record. `fsync` on means the flush is pushed to durable storage, not merely handed to a kernel write cache that the server is willing to ignore. When `COMMIT` returns, a crash can replay the commit. The new balance is part of the database.

The heap page does not have to be on disk at that moment. It can still be dirty in `shared_buffers`. The checkpoint, the background writer, or a backend that evicts the buffer writes it later. If power fails first, replay installs the change from WAL. That is the write-ahead rule: a data page is not written to disk unless the WAL that describes the change has already been flushed. Commit durability is the same rule seen from the client: the server does not acknowledge the commit until that flush has happened.

Several backends committing at once can share one WAL flush. That group commit is why a burst of small commits can have a better flush cost per transaction than the same commits issued far apart. It does not change the return condition. Each of those commits still becomes durable before its own `COMMIT` returns.

The old tuple version stays in the heap until vacuum. Commit does not remove it. Commit also does not advance `relfrozenxid` or take a checkpoint.

**Practical Implementation:**

```sql
SHOW synchronous_commit;
SHOW fsync;
SHOW wal_level;
```

On this cluster each value is the default named above. After the example transaction, a crash that happens before the next checkpoint still shows `balance_cents = 250` for id 1, because the commit record was flushed. The exercise that proves the heap page was dirty would require a crash injection. The catalog does not have a flag that says "this commit's heap page is still dirty," and inventing one is not the mechanism.

**Trade-offs and Alternatives:**

`synchronous_commit = off` returns at the moment the commit record is in WAL buffers, and the WAL writer flushes soon after. That cuts commit latency and gives up a short window of acknowledged commits on a crash. `fsync = off` is a different switch and is the following question's contrast. Waiting for a remote replica uses `synchronous_commit` values of `remote_write` and `remote_apply`. Those change who else must acknowledge the WAL. They are a replication design, and this primary-only walk-through ends at the local flush.

**Common Mistakes:**

- Telling the client the row is committed because the heap page was updated in `shared_buffers`. The page is volatile until WAL is flushed and, separately, until the page is written. The commit wait covers the WAL.
- Calling `CHECKPOINT` after every transaction to "make commits safe." The commit was already safe. The checkpoint only reduces how much WAL a later crash would replay.
- Confusing the write-ahead flush with vacuum. The old version of the ledger row is still in the heap after `COMMIT`.
- Assuming `wal_level = replica` changes this single-node commit wait. The default level allows a standby to exist. With no synchronous standby configured, the local flush is the wait.

**Senior-Level Follow-up:**

The `UPDATE` has executed, `COMMIT` has not been issued, and the host loses power. What does the next startup show for `balance_cents`?

**Answer:** 100. The new tuple version had WAL for the update, and that WAL may even have been flushed as part of another backend's activity, but there is no commit record for this transaction. Recovery treats the transaction as aborted. The row that a later snapshot sees is the one inserted with balance 100.

### DB-056 — The first change to a page after a checkpoint logs the whole page

**Difficulty:** Advanced

**Category:** WAL

**Question:**

Why does PostgreSQL log a full page image, and when during the checkpoint cycle does it do that?

**Context and Constraints:**

PostgreSQL 16, `full_page_writes` at its default of `on`, default block size 8 kB. Data checksums were not enabled at `initdb`. The storage device can tear a write that is larger than its atomic sector.

**Senior Engineer's Answer:**

A heap or index page is 8 kB with the default block size. A disk's atomic write is often smaller. A crash in the middle of writing a page can leave a mixture of old and new bytes. Replay of ordinary WAL records assumes it is applying a change to a page that contains the previous image. Applied to a torn mixture, those records would build on garbage.

`full_page_writes` closes that hole. The first time a page is modified after a checkpoint, the WAL record includes an image of the whole page. Later modifications to that same page, until the next checkpoint, log only the change. Recovery that finds a torn page restores the image and then applies the later records. The next checkpoint resets the cycle: the following modification of each page logs a full image again. That is why WAL volume jumps immediately after a checkpoint and then settles. The jump is the images, not a second copy of the checkpoint itself.

The image is of the default 8 kB block when that is the compiled block size. It is not a measurement of how much the row changed. A one-integer `UPDATE` can still log the whole page on the first touch after the checkpoint.

With checksums off and `wal_log_hints` off, hint-bit updates are not themselves a reason for a full page image. Hint bits are a separate path. Checksums, if they had been enabled at `initdb`, would force hint-bit changes to be WAL-logged too, because a hint-bit write that tore would fail the checksum. This cluster does not have that extra logging. It still has `full_page_writes` for real tuple changes.

Turning `full_page_writes` off removes the images and removes the protection. It is valid only when the storage stack guarantees that an 8 kB page cannot tear. "The disks are fast" is not that guarantee. Checksums detect a torn page. They do not reconstruct it. Reconstruction is the WAL image.

**Practical Implementation:**

```sql
SHOW full_page_writes;
SHOW wal_log_hints;
SHOW data_checksums;
```

`full_page_writes` is `on`. `wal_log_hints` is `off`. `data_checksums` is `off` on this cluster because `initdb` was not asked for checksums. `pg_stat_wal` increases `wal_bytes` across a checkpoint; the portion that is full page images is the part that repeats every checkpoint cycle even when the logical row changes are small.

**Trade-offs and Alternatives:**

Leaving the default on spends WAL bytes and archive bytes to keep crash recovery correct on ordinary storage. `wal_compression` can compress the images and costs CPU. Stretching the checkpoint interval produces images less often and lengthens recovery. Neither alternative makes a torn page safe when images are disabled.

**Common Mistakes:**

- Saying every `UPDATE` logs a full page image. Only the first modification of that page after a checkpoint does.
- Disabling `full_page_writes` because checksums are on. Checksums will refuse the torn page. They will not repair it.
- Blaming the checkpoint alone for a WAL spike and missing the images that the checkpoint's completion re-arms.
- Treating the image size as the size of the changed column. At the default block size the image is the 8 kB page.

**Senior-Level Follow-up:**

A page was fully imaged at the start of this checkpoint interval, then updated ten more times, then the host crashed before the next checkpoint. Which WAL does recovery need for that page?

**Answer:** The full page image, then the ten later change records, in order. The image resets the page to a known 8 kB state. Each later record applies to that state. The ten records alone are not enough if the on-disk page was torn while one of those updates was being written back.

### DB-057 — synchronous_commit and fsync fail in different ways

**Difficulty:** Senior

**Category:** WAL

**Question:**

What can a crash lose if `synchronous_commit` is off, and what can it lose if `fsync` is off?

**Context and Constraints:**

PostgreSQL 16. Consider each setting changed alone, from its default of `on`, on a single primary. `wal_writer_delay` is 200 ms. There is no standby. The question is the failure mode, not a tuning recommendation for a named production host.

**Senior Engineer's Answer:**

`synchronous_commit = off` changes only the commit wait. The backend puts the commit record in WAL buffers and returns. The WAL writer, or some other backend's flush, writes those buffers out shortly afterward. The documented window is on the order of `wal_writer_delay`, which defaults to 200 ms, and can stretch to a few multiples of that delay. A crash inside the window can drop transactions whose clients already received a successful `COMMIT`. Replay then finishes at the last flushed commit record. The database that comes back is consistent: later records that never reached disk are absent, and earlier flushed commits are present. Pages are not torn by this setting, because `full_page_writes` and `fsync` still work. You lost a suffix of acknowledged transactions. You did not lose the ability to start.

`fsync = off` tells PostgreSQL it may skip forcing writes to durable media. WAL and data pages can sit in a volatile write cache that the server now assumes is safe. A power loss can leave WAL and data files in a combination replay cannot repair: a torn page, a data page written further than the WAL, or a control file that does not match either. That is corruption. The cluster may refuse to start, or it may start with pages the WAL cannot justify. There is no short, bounded window the way there is for `synchronous_commit`. Anything not yet physically durable is at risk, and the write-ahead invariant is no longer enforced by the server.

The two switches are independent. `synchronous_commit = off` with `fsync` on is a latency trade that can lose recent commits. `fsync` off is a durability hole in the storage protocol. Setting `synchronous_commit` off does not imply that `fsync` is off. Setting `fsync` off is not how you speed up commits safely.

`wal_level`, `full_page_writes`, and a replica's acknowledgement are further switches. None of them restores the guarantee that `fsync` off removes.

**Practical Implementation:**

```sql
SELECT name, setting
FROM pg_settings
WHERE name IN ('synchronous_commit', 'fsync', 'wal_writer_delay', 'full_page_writes')
ORDER BY name;
```

A default cluster shows both safety switches `on` and `wal_writer_delay` at 200 ms. If someone has changed one of them, this is the catalog that shows which one. The failure mode follows from that row, not from how fast the last benchmark looked.

**Trade-offs and Alternatives:**

`synchronous_commit = off` is a coherent choice for data you can reconstruct, such as a cache you can refill, when the application records that a commit acknowledgement might be rolled away by a crash. It is a bad choice for a ledger the client has already told a person succeeded. `fsync` off has no comparable application-level repair, because the files themselves can be inconsistent. Group commit and a shorter transaction are the ways to reduce commit cost while leaving both settings on.

**Common Mistakes:**

- Describing `synchronous_commit = off` as "the same as turning fsync off, but milder." One drops recent commits. The other can destroy the recovery invariant.
- Promising that `off` loses at most one transaction. It can lose every commit that had not been flushed yet, from every session, across the WAL writer interval.
- Turning `fsync` off in a container because the orchestrator "has its own disks." The guest's power loss still needs a flush that reaches durable media.
- Reading a successful `COMMIT` under `synchronous_commit = off` as a durable business event. The server deliberately returned early.

**Senior-Level Follow-up:**

Both settings are on. `COMMIT` returns. Power fails before the next checkpoint, and the heap page was still dirty. Which setting is the reason the row survives?

**Answer:** `synchronous_commit` being on is why the commit record was flushed before the return, and `fsync` being on is why that flush was required to reach durable storage. Recovery replays the record onto the heap page. The dirty heap page is allowed. Survival comes from the WAL, which both settings protected in their own step.

### DB-058 — An update adds a tuple version and leaves the old one

**Difficulty:** Intermediate

**Category:** MVCC

**Question:**

What does a committed `UPDATE` store, and what do `xmin` and `xmax` mean on each version?

**Context and Constraints:**

PostgreSQL 16. One session. The default isolation level is Read Committed; this question uses that only to say the next statement takes a new snapshot. No second session is looking yet.

```sql
CREATE TABLE ledger (
  id integer PRIMARY KEY,
  balance_cents integer NOT NULL
);

INSERT INTO ledger (id, balance_cents) VALUES (1, 100);
UPDATE ledger SET balance_cents = 250 WHERE id = 1;
```

Both statements have committed, in that order, as two transactions.

**Senior Engineer's Answer:**

PostgreSQL does not overwrite the balance in place. The `INSERT` stored a heap tuple whose `xmin` is the inserting transaction's id and whose `xmax` is empty. After that transaction committed, a snapshot that sees that xid sees the row with balance 100.

The `UPDATE` stores a second heap tuple. The new tuple's `xmin` is the updating transaction. The old tuple's `xmax` becomes that same transaction id. After the updater commits, a new snapshot sees the new tuple and does not see the old one. The old tuple is still in the heap. It is a dead tuple once no snapshot can see it, and it stays on the page until vacuum or, when the update qualifies, until a heap-only prune. Dead tuples are the storage cost of not updating in place.

`xmin` is "who inserted this version." `xmax` is "who deleted or superseded this version," with one important overload: a row lock also writes `xmax` and sets lock bits in the tuple header, and that `xmax` does not mean the row was deleted. A committed delete is an `xmax` with no newer version. A committed update is an `xmax` on the old version plus a new version whose `xmin` is the updater.

`BEGIN` by itself does not allocate a transaction id. A real xid is allocated when the transaction first needs one, which a write does. A transaction that only reads can finish with no xid at all. The header field is 32 bits. Wrapping that counter is a later question; the fact this question needs is that every version is stamped with those ids rather than edited in place.

The primary key does not collapse the two versions. Both can sit in the heap with the same `id`. Indexes and visibility rules decide which version a statement is allowed to find. The index structure is a later file. The heap fact is two tuples, one live for new snapshots.

**Practical Implementation:**

```sql
SELECT n_live_tup, n_dead_tup, n_tup_ins, n_tup_upd
FROM pg_stat_user_tables
WHERE relname = 'ledger';
```

After the committed update, the live row a new snapshot sees is `(1, 250)`. The stats view is a counter maintained for autovacuum, and under load it can lag, so the exact integer in `n_dead_tup` is not the definition of a dead tuple. The definition is the old heap version whose `xmax` is the committed updater. `VACUUM (VERBOSE) ledger` in a session where no other snapshot remains will report that it removed one dead row version. That output is the storage proof.

**Trade-offs and Alternatives:**

Versioning is why a reader can keep seeing 100 while a writer creates 250, without either taking a lock that blocks the other. The price is heap versions and, when the update cannot be heap-only, extra index entries, until vacuum. Overwriting in place would avoid the dead tuple and would make the reader either block or see a half-written balance. PostgreSQL takes the dead tuple.

An `UPDATE` that changes no indexed column and fits on the same page can avoid a new index entry. That optimization is its own question. It does not change the heap fact: the old version still exists until it is dead to every snapshot and then pruned or vacuumed.

**Common Mistakes:**

- Saying the update changed 100 to 250 inside the same tuple header. The 100 remains in the old tuple. The 250 is a new tuple.
- Reading any non-empty `xmax` as "this row is deleted." A lock uses `xmax` too.
- Expecting `COMMIT` to return the old version's bytes to the operating system. Commit publishes visibility. Vacuum reclaims space.
- Treating `n_dead_tup` as a transactional count of heap versions. It is a statistics counter. The versions are in the heap.

**Senior-Level Follow-up:**

The same session inserts a second row and rolls back instead of committing. Is that row a dead tuple that vacuum must remove?

**Answer:** No. An aborted inserter's `xmin` is never visible to any other transaction. Vacuum may eventually reclaim the space, and the tuple can be pruned as dead, but no snapshot will return it. A rollback does not write a compensating "delete" version. The inserter's xid is marked aborted in the commit log, and visibility fails on `xmin`.

### DB-059 — A snapshot is the set of transaction ids a statement may see

**Difficulty:** Senior

**Category:** MVCC

**Question:**

What is in a snapshot, and how does it decide that a heap tuple is visible? Use the ledger versions from the previous question, and add a transaction that has not committed.

**Context and Constraints:**

PostgreSQL 16. The default isolation level is Read Committed, so each statement takes its own snapshot. Anomalies that follow from that choice are a later file. This question is visibility of one statement.

Committed state before the reader starts:

- Tuple A: balance 100, `xmin` committed, `xmax` set to the committed updater.
- Tuple B: balance 250, `xmin` is that same committed updater, `xmax` empty.

A third transaction has executed, and has not committed:

```sql
UPDATE ledger SET balance_cents = 300 WHERE id = 1;
```

Call its xid U. It has created tuple C with balance 300 and `xmin` U, and it has set tuple B's `xmax` to U.

**Senior Engineer's Answer:**

A statement's snapshot records three things. `xmin` is the oldest transaction that was still running when the snapshot was taken; every xid older than that had already ended. `xmax` is the first xid that had not yet been assigned; every xid at or after that value is invisible to this snapshot. `xip` is the list of xids that were in progress, the ones between `xmin` and `xmax` that had not ended. Committed xids strictly before `xmax` and absent from `xip` are visible as committed. Aborted xids are never visible. The snapshot is a predicate on those ids. It is not a copy of the table.

Tuple A is invisible: its `xmax` is a committed updater that this snapshot sees as committed, so the version has been superseded. Tuple B is visible: its `xmin` is committed and in the snapshot's past, and its `xmax` is U, which is in progress, so the delete-or-update is not yet visible. The reader therefore returns balance 250. Tuple C is invisible because its `xmin` is U, still in progress. If U later commits, a later statement in Read Committed takes a new snapshot and can see 300. The statement that already started does not change its snapshot when U commits.

The same transaction can see its own uncommitted versions. That decision uses the command id stored in the tuple header, not the snapshot of other sessions. A later statement in U sees tuple C. An earlier statement in U does not. Other sessions never use U's command id. They wait until U commits or aborts, and then the commit log answers.

When the commit log must be consulted, the result can be cached in hint bits on the tuple. Hint bits are a physical cache. The visibility rule is still the snapshot plus the commit log. Hint bits are stored with the tuple header, which the heap question covers. They do not change what this reader is allowed to return.

**Practical Implementation:**

```sql
SELECT pid, backend_xid, backend_xmin, state
FROM pg_stat_activity
WHERE backend_xid IS NOT NULL
   OR backend_xmin IS NOT NULL;
```

U's backend shows `backend_xid` once the `UPDATE` has assigned an xid. A reader that has a snapshot shows `backend_xmin`. Those columns are the live inputs to "who is in progress" and "what is the oldest snapshot." They are not a dump of `xip`, and they are not a substitute for the visibility rule above. After U commits and the reader takes a new statement, the row the reader returns is `(1, 300)`.

**Trade-offs and Alternatives:**

A snapshot per statement is why Read Committed sees other sessions' commits between statements and still sees a stable set of versions inside one statement. Holding one snapshot for the whole transaction is what Repeatable Read and Serializable do. That hold is also what keeps `backend_xmin` set for the life of the transaction, which vacuum feels. The anomaly catalog for those levels belongs to the transactions file. The storage fact is the same three snapshot fields.

**Common Mistakes:**

- Describing a snapshot as a private copy of `ledger`. Nothing was copied. The statement reads the same heap and keeps or rejects each version.
- Saying the reader blocks until U commits because it can see U's `xmax` on tuple B. The in-progress `xmax` means "this version is still visible," not "wait."
- Forgetting that tuple A is still on the page. The snapshot skips it. The page contains it.
- Using one snapshot for two successive statements in Read Committed. The second statement takes its own.

**Senior-Level Follow-up:**

U rolls back. The reader has not started a new statement yet. What does the reader's next statement return, and what is left on the page?

**Answer:** The next statement's snapshot sees U as aborted, so tuple C is invisible and tuple B's `xmax` does not hide B. The result is balance 250. Tuple C remains in the heap until vacuum or prune. Its `xmin` is aborted, so no snapshot returns it. Tuple A remains dead. Rollback did not resurrect 100.

### DB-060 — A plain read does not lock the row a writer needs

**Difficulty:** Senior

**Category:** MVCC

**Question:**

Why can a `SELECT` run while another session's `UPDATE` of the same row runs? What does block?

**Context and Constraints:**

PostgreSQL 16. Two sessions. The default isolation level is Read Committed. Do not enumerate isolation anomalies. The row is the committed ledger row with balance 250. Session W runs:

```sql
BEGIN;
UPDATE ledger SET balance_cents = 300 WHERE id = 1;
```

Session R runs, while W is still open:

```sql
SELECT balance_cents FROM ledger WHERE id = 1;
```

A third session, W2, then runs the same `UPDATE` to 400 and has not committed.

**Senior Engineer's Answer:**

Session R's `SELECT` takes an `ACCESS SHARE` lock on the table. Session W's `UPDATE` takes a `ROW EXCLUSIVE` lock on the table. Those two table locks are compatible, so neither waits for the table lock. The `SELECT` also does not write `xmax` and does not take a tuple lock. It builds a snapshot and applies the visibility rule. W's new version is invisible to R because W has not committed, and the previous version is still visible because W's `xmax` is in progress. R returns 250 and finishes. W does not wait for R.

The block appears when W2 updates the same row. W already holds a tuple lock, recorded in `xmax` together with lock bits in the header. That `xmax` means "locked by W," not "deleted by W," for as long as the header says it is a lock. W2 wants the same exclusive tuple lock and waits. If W commits, W2 wakes up, follows the new version, and in Read Committed rechecks its `WHERE` against that version. If the `WHERE` still matches, W2 updates the version W committed. If W rolls back, W2 updates the version that was current before W. Either way, R's plain `SELECT` was never in that wait queue.

`SELECT FOR UPDATE` is not a plain read. It takes the tuple lock, so it waits on W and W waits on it when the order is reversed. `VACUUM FULL`, `TRUNCATE`, and most forms of `ALTER TABLE` take `ACCESS EXCLUSIVE`, which conflicts with `ACCESS SHARE`, so they wait for the `SELECT` and the `SELECT` waits for them. The sentence "readers don't block writers" is about snapshot reads and row writers. It is not a claim that every pair of statements is compatible.

If two sessions lock the same row, and more than one lock must be stored, `xmax` holds a multixact id instead of a single xid, with `HEAP_XMAX_IS_MULTI` set. The members of that multixact live in `pg_multixact`. A plain `SELECT` still does not join that structure.

**Practical Implementation:**

```sql
SELECT pid,
       wait_event_type,
       wait_event,
       state,
       query
FROM pg_stat_activity
WHERE query LIKE 'UPDATE ledger%'
   OR query LIKE 'SELECT balance_cents%';
```

While R is running beside W, R is not waiting on a tuple lock. While W2 is blocked on W, W2's `wait_event_type` is `Lock` and the wait is the tuple, and W2's `state` is `active`. `pg_locks` shows the `transactionid` or `tuple` entry. R's finished `SELECT` leaves no lock behind.

**Trade-offs and Alternatives:**

Snapshot reads are the reason a reporting query can scan `ledger` while payments update it. The cost is tuple versions, which vacuum has to reclaim, and the possibility that R's statement saw 250 after the business had already decided the new balance in W. If the reader must participate in the lock queue, the statement is `SELECT FOR UPDATE` or `SELECT FOR SHARE`, and it will block writers on purpose. That is a locking design. It is not what a plain `SELECT` does.

**Common Mistakes:**

- Adding `FOR UPDATE` to a reporting query "for consistency" and then being surprised that updates pile up behind it.
- Claiming writers never block. Two updates of the same row block on the tuple lock.
- Reading a locked row's `xmax` with a page inspector and calling the row deleted. The infomask distinguishes a lock from a delete.
- Assuming `ACCESS SHARE` conflicts with `ROW EXCLUSIVE`. It does not. `ACCESS EXCLUSIVE` is the table lock that stops a `SELECT`.

**Senior-Level Follow-up:**

W2 has been waiting. W commits balance 300. W2's `UPDATE` said `WHERE id = 1 AND balance_cents = 250`. What does W2 store?

**Answer:** W2 stores nothing from that `UPDATE`. After W commits, Read Committed rechecks the `WHERE` on the new version. `balance_cents` is 300, so `balance_cents = 250` is false, and W2 updates zero rows. The heap keeps W's committed version with balance 300. The recheck is why W2 does not overwrite 300 based on a `WHERE` that was only true of the version it originally queued on.

### DB-061 — A heap page is line pointers and tuple versions

**Difficulty:** Intermediate

**Category:** Heap storage

**Question:**

How is a heap page laid out, and which header fields does visibility read?

**Context and Constraints:**

PostgreSQL 16, default block size 8 kB. One ordinary table, not a TOAST table. Do not describe an index page. The row is small relative to the page.

**Senior Engineer's Answer:**

The default relation block is 8 kB. A heap file is a sequence of those blocks. Inside a page, the header occupies the beginning. Line pointers, also called item identifiers, grow forward from the header. Tuple bytes grow backward from the end. Free space is the gap in the middle. `pd_lower` and `pd_upper` in the page header bound that gap. A line pointer is a small record: an offset to the tuple bytes, a length, and flags. The flags say whether the slot is normal, unused, dead, or a redirect. The tuple's identity on the page is the line pointer's index. `ctid` is the block number plus that index.

The tuple header that visibility cares about holds `xmin`, `xmax`, the command id (`cmin` and `cmax` share one field), `t_ctid`, and the infomask bits. `t_ctid` points at the next version, or at the tuple itself when it is the latest. The infomask stores hint bits: `xmin` committed, `xmin` aborted, `xmax` committed, `xmax` aborted. It also stores whether `xmax` is a lock, whether `xmax` is a multixact, and whether this tuple is a heap-only member of an update chain. The user columns begin after the header and the null bitmap. A large column can be moved to a TOAST table and replaced in the heap tuple by a pointer. The visibility header stays on the heap tuple either way. TOAST is storage for the wide value, not a second versioning system.

Hint bits are filled in when a later reader or writer consults the commit log and finds a definite committed or aborted answer. Setting them dirties the page. A `SELECT` can therefore make a page dirty even though it changed no user column. On a default cluster, data checksums are off and `wal_log_hints` is off, so that hint-bit dirties the page without a WAL record. A crash can lose the hint bits. The next reader recomputes them from `pg_xact`. The user columns are unaffected because their WAL was written when the row was inserted or updated. If checksums had been enabled at `initdb`, hint-bit changes would be WAL-logged so a torn hint update could not fail a checksum.

The commit log, `pg_xact`, stores two bits per xid: in progress, committed, aborted, or subcommitted. The hint bits exist so a steady-state reader does not look those bits up on every row.

**Practical Implementation:**

```sql
SHOW block_size;
SHOW data_checksums;
SHOW wal_log_hints;
```

`block_size` is 8192 on a default build. That is the page these line pointers and tuples share. `data_checksums` and `wal_log_hints` are both `off` unless someone changed them, which is the condition under which a hint-bit update dirties a page and writes no WAL.

**Trade-offs and Alternatives:**

Line pointers let vacuum reclaim a tuple's bytes and leave the slot, or reuse the slot, without shifting every other tuple's `ctid`. The cost is that "the row" is not a single fixed address for its whole life. An update that does not qualify as heap-only allocates a new line pointer, and indexes that pointed at the old one must be cleaned up by vacuum. A heap-only update uses a redirect instead, which is the next question but one.

Packing the page full maximizes rows per 8 kB and leaves no room for a same-page update. `fillfactor` below its heap default of 100 keeps a gap on purpose. That trade is part of the heap-only question.

**Common Mistakes:**

- Treating `ctid` as a primary key an application may store. It identifies a tuple version's current line pointer. Vacuum and updates move that identity.
- Assuming a `SELECT` never writes. Hint-bit updates dirty pages.
- Calling the null bitmap or the user columns the visibility header. Visibility reads `xmin`, `xmax`, the command id, and the infomask.
- Describing the page as a list of rows with no line-pointer array. The free space is in the middle because the two structures grow toward each other.

**Senior-Level Follow-up:**

A page's hint bits were updated by a `SELECT` and the new image was not flushed. The host crashes. After recovery, is the committed balance still visible, and are the hint bits still set?

**Answer:** The committed balance is visible. Its insert or update was WAL-logged and flushed according to the commit rules. The hint bits may be clear, because that update was not WAL-logged on this default cluster. The first reader after recovery consults `pg_xact`, sees the xid committed, and can set the hint bits again.

### DB-062 — A dead tuple occupies space until something reclaims it

**Difficulty:** Intermediate

**Category:** Heap storage

**Question:**

After the following statements commit, which tuple versions are live, which are dead, and what still holds their bytes?

**Context and Constraints:**

PostgreSQL 16. One session, and no other snapshot is open. Hypothetical table:

```sql
CREATE TABLE ticket (
  id integer PRIMARY KEY,
  status text NOT NULL,
  note text NOT NULL
);

CREATE INDEX ticket_status_idx ON ticket (status);

INSERT INTO ticket (id, status, note) VALUES (1, 'open', 'first');
UPDATE ticket SET status = 'closed', note = 'first' WHERE id = 1;
DELETE FROM ticket WHERE id = 1;
```

The primary key indexes `id` only. `ticket_status_idx` indexes `status`, and the `UPDATE` changes that column, so this update is not heap-only. Heap-only updates are the next question.

**Senior Engineer's Answer:**

Two heap tuples have existed, and neither is visible to a new snapshot.

The inserted tuple has `xmin` of the inserter and `xmax` of the updater. The updater committed, so this version is dead. The updated tuple has `xmin` of the updater and `xmax` of the deleter. The deleter committed, so this version is dead too. The `DELETE` does not create a replacement user-visible version. It stamps `xmax` on the latest one. A new snapshot sees zero rows.

All of those dead bytes still sit on the heap page. The line pointers still exist. `ticket_status_idx` has an entry for `'open'` pointing at the first version and an entry for `'closed'` pointing at the second. Both index entries are dead, because no visible tuple remains. The primary-key index likewise has entries for versions that are no longer visible. Dead index entries are removed by vacuum, not by `COMMIT` and not by `DELETE`.

Space returns to the page when vacuum, or a prune that is actually allowed to remove the tuple, marks the line pointer unused and the bytes become part of the page's free gap. That free gap is then available for a later insert into the same page. The file does not have to shrink for the space to be reusable. Ordinary vacuum's relationship to the file size is the vacuum question. This question's fact is that `COMMIT` of the delete left the bytes where they were.

`n_dead_tup` in `pg_stat_user_tables` is the counter autovacuum watches. It is allowed to lag. The heap already contains the dead versions whether or not the counter has caught up.

**Practical Implementation:**

```sql
SELECT n_live_tup,
       n_dead_tup,
       n_tup_upd,
       n_tup_del
FROM pg_stat_user_tables
WHERE relname = 'ticket';
```

`SELECT count(*) FROM ticket` returns 0. The stats row still shows dead tuples until vacuum has run and the counter is refreshed. Then:

```sql
VACUUM (VERBOSE) ticket;
```

With no other snapshot open, verbose vacuum reports that it removed the dead row versions. A following `SELECT count(*)` is still 0. The difference is that the page's free space can be reused and the dead index entries for `status` have been removed.

**Trade-offs and Alternatives:**

Leaving dead tuples in place is what lets the deleter commit without rewriting the page into a smaller file and without waiting for every index to be rebuilt. The debt is paid by vacuum. An application that updates `status` on a hot row pays that debt on every status change, because each change leaves a dead heap tuple and a dead secondary-index entry. If the workload's real change is `note`, indexing `status` makes that update look like this question even when the indexed value is the column you did not mean to churn. Dropping an index you do not need is the storage lever. Changing the index method is a later file.

**Common Mistakes:**

- Expecting `DELETE` to shrink `ticket`'s file before vacuum.
- Expecting `count(*)` to reveal dead tuples. It counts visible versions. The dead ones are invisible on purpose.
- Vacuuming and then being surprised that `count(*)` is unchanged. Vacuum removes versions no statement could see.
- Forgetting the secondary index. The heap can be cleaned and the index can still hold dead entries until the index phase of vacuum runs. One vacuum command does both, in that order: it cannot mark the heap line pointer fully reusable until the index entries that point at it are gone.

**Senior-Level Follow-up:**

A second session still has an open snapshot taken when the row was `'open'`. The first session has committed the delete. What can vacuum remove?

**Answer:** Nothing that the open snapshot can still see. The `'open'` version is live to that snapshot, so it is not removable. Versions the snapshot cannot see can be removed only when every other snapshot agrees. Until the old snapshot ends, vacuum's horizon includes it, and the dead-to-everyone condition is false for the version that snapshot still needs. The horizon question covers how that shows up in `pg_stat_activity`.

### DB-063 — A HOT update does not add an index entry

**Difficulty:** Advanced

**Category:** Heap storage

**Question:**

When is an `UPDATE` a heap-only tuple update, and what does that change for indexes and for vacuum?

**Context and Constraints:**

PostgreSQL 16. Hypothetical table:

```sql
CREATE TABLE ticket (
  id integer PRIMARY KEY,
  status text NOT NULL,
  note text NOT NULL
);

CREATE INDEX ticket_status_idx ON ticket (status);
```

The page that holds the row has room for another tuple version. `fillfactor` is the heap default of 100 unless a statement below changes it. Do not describe index page layout. The only fact needed about indexes is whether a new index entry is created.

**Senior Engineer's Answer:**

A heap-only tuple update, or HOT update, is allowed when two things are both true. First, no indexed column changes. "Indexed" means any column referenced by a non-summarizing index, including a column used only inside an index expression or only inside a partial index's predicate. The comparison is bitwise. A new value that is equal according to the type's `=` operator and different in bytes still counts as a change. Second, the new tuple fits on the same heap page as the old one.

When both are true, PostgreSQL stores the new version on that page, sets the old version's `t_ctid` forward, marks the old tuple `HEAP_HOT_UPDATED`, and marks the new tuple `HEAP_ONLY_TUPLE`. Existing index entries keep pointing at the root line pointer of that chain. No new entry is added to the primary key index or to `ticket_status_idx`. A later reader that finds the root through an index walks the `t_ctid` chain on this one page and applies the snapshot.

`UPDATE ticket SET note = 'second' WHERE id = 1` can be HOT. `id` and `status` are the indexed columns, and neither changed, provided the new tuple fits. `UPDATE ticket SET status = 'closed' WHERE id = 1` cannot be HOT, because `ticket_status_idx` references `status`. That update stores a new version and new index entries. If `note` is so large that the new version does not fit on the page, the note-only update is also not HOT. It goes to another page, and indexes get new entries. PostgreSQL 16 counts that case in `n_tup_newpage_upd`.

The core exception is a summarizing index. PostgreSQL 16's only core summarizing index is BRIN. An update of a column that is indexed only by BRIN can still be HOT. How BRIN summarizes blocks is an indexing question. The heap rule is the one in the release note: BRIN does not, by itself, forbid HOT.

HOT chains can be pruned while a backend is already touching the page, including on a later `SELECT` or `UPDATE`, when the page's prune hint says there is something to reclaim and no snapshot still needs the intermediate versions. Pruning redirects the root line pointer and frees the dead members' bytes. It does not visit indexes, because the indexes never stored those intermediate line pointers. A non-HOT dead tuple cannot be removed that way. Some index still names its exact line pointer, so only vacuum's index phase can clear it.

`fillfactor` lower than 100 reserves free space when a page is filled, so a later HOT update is more likely to fit. The heap default is 100, which fills the page. Lowering it on a table that only inserts wastes space. Lowering it on a table whose updates are not HOT does not make those updates HOT. Changing the setting does not reopen space on pages that are already packed. A later rewrite does. New inserts honor the new value.

**Practical Implementation:**

```sql
SELECT n_tup_upd, n_tup_hot_upd, n_tup_newpage_upd
FROM pg_stat_user_tables
WHERE relname = 'ticket';
```

After a committed note-only update that fit on the page, `n_tup_hot_upd` increases with `n_tup_upd`, and `n_tup_newpage_upd` does not. After a committed `status` update, `n_tup_upd` increases and `n_tup_hot_upd` does not. `n_tup_newpage_upd` was added in PostgreSQL 16 for the updates that landed on a different page.

**Trade-offs and Alternatives:**

HOT is the reason a narrow, unindexed column can be updated cheaply: one new heap version, no index maintenance, and prune can reclaim the chain without a table-wide vacuum. The levers that keep it available are "do not index a column you update" and "leave room on the page." `fillfactor` of 90, for example, leaves a tenth of each newly filled page free. That is a schema choice, not a runtime guess. If the update must change `status`, HOT is the wrong tool to hope for. Vacuum has to clean `ticket_status_idx`, and that is the ordinary dead-tuple path.

**Common Mistakes:**

- Calling every update of a non-primary-key column HOT. `status` is indexed by a second index. Changing it is not HOT.
- Assuming `fillfactor` 100 forbids HOT. It makes HOT less likely once the page is packed. A page that still has a gap can still do HOT.
- Expecting prune to remove a dead tuple left by a `status` change. That tuple is not heap-only, so its index entry has to be vacuumed.
- Indexing a column "in case we filter on it later" on a row that is updated every minute. You have turned a HOT update into index maintenance.

**Senior-Level Follow-up:**

`ticket_status_idx` is partial: `CREATE INDEX ticket_open_idx ON ticket (id) WHERE status = 'open'`. An update changes only `note`, and `status` stays `'open'`. Can it be HOT? What if the update changes `status` from `'open'` to `'closed'` and does not change `id`?

**Answer:** The note-only update can be HOT. `status` did not change, so the partial index's predicate column is bitwise the same, and `id` did not change. The update that changes `status` cannot be HOT. `status` is referenced by the partial predicate even though the index key is `id`. Leaving the partial index is still an indexed-column change. If the new tuple also does not fit on the page, that is a second, independent reason.

### DB-064 — The visibility map is what lets an index-only scan skip the heap

**Difficulty:** Senior

**Category:** Heap storage

**Question:**

What do the visibility map bits mean, and why can a plan named Index Only Scan still read the heap?

**Context and Constraints:**

PostgreSQL 16. Hypothetical table with a covering index. Do not explain how the index finds a key. The question starts at the moment the index entry has already identified a heap `ctid`.

```sql
CREATE TABLE ticket (
  id integer PRIMARY KEY,
  status text NOT NULL,
  note text NOT NULL
);

CREATE INDEX ticket_status_covering_idx
  ON ticket (status) INCLUDE (id);
```

The query is:

```sql
SELECT id FROM ticket WHERE status = 'open';
```

**Senior Engineer's Answer:**

The visibility map has two bits per heap page. All-visible means every tuple on the page is visible to every current and future snapshot: no transaction still needs an older version on that page, and nothing on it is uncommitted. All-frozen means every tuple on the page is frozen, which the freeze question uses so a later vacuum can skip the page. Vacuum sets the bits. An insert, update, or delete on the page clears all-visible, because the page now has something a snapshot might need to look at tuple by tuple.

An index-only scan is allowed when every column the query needs is available from the index. Here `status` is the key and `id` is included, and `note` is not in the target list, so the executor does not need the heap to obtain the output values. It still needs a visibility answer. If the heap page's all-visible bit is set, the tuple is visible and the heap page is not read. If the bit is clear, the executor follows `ctid` into the heap and applies the snapshot. The plan name stays Index Only Scan either way. "Index only" describes where the column values come from when the bit is set. It is not a promise that the heap was untouched.

`EXPLAIN (ANALYZE, BUFFERS)` reports `Heap Fetches`. That counter is how many times the bit was clear and the heap was consulted. A newly loaded table can have a perfect index and a large `Heap Fetches` count, because vacuum has not yet set all-visible. Insert-only tables need vacuum for that reason even when `n_dead_tup` is zero. Autovacuum's insert threshold exists for this, and for freezing.

The bit is page-wide. One dead or recently inserted tuple on an 8 kB page clears all-visible for every row on that page. A covering index does not repair that. Vacuum does, by removing what is dead and then setting the bit on pages that qualify.

**Practical Implementation:**

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT id FROM ticket WHERE status = 'open';
```

Before any vacuum, expect `Heap Fetches` greater than zero on a page that was just written. Then:

```sql
VACUUM ticket;
```

Run the explain again. On pages vacuum marked all-visible, `Heap Fetches` drops. `pg_class.relallvisible` is the count of all-visible pages vacuum last recorded for the relation. It is a catalog number of pages, not a promise about a single `ctid`.

**Trade-offs and Alternatives:**

A covering index makes the index-only plan possible and makes the index wider. If the query selects `note` as well, this index cannot satisfy it, and the heap is required for the column even when the page is all-visible. Vacuum is the other half of the feature. Without it, the covering index still works as an index and still fetches the heap. `INCLUDE (id)` is the right shape when `id` is needed in the output and is not part of the search key. Adding `note` to the index to avoid the heap copies a wide column into every index entry, which is a bad trade when `note` is large or frequently updated, and an update of an included column is an indexed-column change for HOT.

**Common Mistakes:**

- Reading the plan type Index Only Scan and reporting that the heap was not touched. `Heap Fetches` is the check.
- Creating the covering index and skipping vacuum on an insert-mostly table. The map stays dark, so the fetches remain.
- Confusing all-visible with all-frozen. All-visible answers snapshot visibility for index-only scans. All-frozen answers whether freeze vacuum can skip the page.
- Selecting `note` and expecting the covering index on `(status) INCLUDE (id)` to supply it. The value is not in the index, so the heap is mandatory.

**Senior-Level Follow-up:**

Vacuum has set all-visible on the page. A later transaction updates `note` on one row on that page and commits. What happens to index-only scans of other rows on the same page?

**Answer:** The update clears all-visible for the whole page. Until vacuum sets it again, an index-only scan that lands on any `ctid` on that page can heap-fetch, including rows the update did not change. The other rows are still visible. The shortcut is what was lost, and it was lost per page.

### DB-065 — VACUUM reclaims space inside the file

**Difficulty:** Intermediate

**Category:** Vacuum

**Question:**

What does an ordinary `VACUUM` of a table give back, and what does it leave the same?

**Context and Constraints:**

PostgreSQL 16. Ordinary `VACUUM`, not `VACUUM FULL`. The table is `ticket` after the committed insert, indexed status update, and delete from DB-062, and no snapshot still needs those versions. `vacuum_truncate` is at its default of on.

**Senior Engineer's Answer:**

`VACUUM` removes dead tuple versions that no snapshot can see, removes the index entries that point at them, and records the freed space in the free space map. A later `INSERT` or `UPDATE` can use that space for a new tuple on the same page. That is the reclaim. The file's middle is not compacted. A hole on page 3 stays a hole on page 3, available to new tuples, and the file is not rewritten to slide page 4 down into it.

The lock is `SHARE UPDATE EXCLUSIVE`. `SELECT`, `INSERT`, `UPDATE`, and `DELETE` continue. A second `VACUUM` of the same table waits, and so does `CREATE INDEX`, `ALTER TABLE`, and `VACUUM FULL`, because those need locks that conflict. The command does not build a new file and does not rebuild indexes from scratch. It edits the existing heap and visits each index to delete dead entries. Dead line pointers in the heap become reusable only after those index entries are gone. If the list of dead tuple ids does not fit in memory, vacuum does more than one index pass. Manual `VACUUM` uses `maintenance_work_mem`, default 64 MB, for that list. Autovacuum uses `autovacuum_work_mem` when that is set, and is capped at 1 GB for this list even if the setting is higher.

Two cases do change the file size. If the last pages of the heap are empty, vacuum can truncate them and return that tail to the operating system. Truncation needs a brief `ACCESS EXCLUSIVE` lock. If a concurrent statement holds a conflicting lock, truncation is skipped and the empty tail stays. `VACUUM (TRUNCATE false)` skips it on purpose. Holes that are not at the end are never returned this way. And vacuum can freeze old tuples and set visibility-map bits. Those actions do not shrink the file either. They change what later vacuums and index-only scans have to do.

`VACUUM` does not delete live rows, does not advance a sequence, and does not take a checkpoint.

**Practical Implementation:**

```sql
SELECT pg_relation_size('ticket') AS heap_bytes_before;
VACUUM (VERBOSE) ticket;
SELECT pg_relation_size('ticket') AS heap_bytes_after;
```

Verbose output reports the dead versions it removed. `heap_bytes_after` equals `heap_bytes_before` when the dead tuples were not on a trimmable tail, which is the usual case for a page that still holds other live tuples or sits in the middle of the file. The free space map, not the file size, is what changed. A following insert of a similar row can reuse that space, and `pg_relation_size` can stay flat across that insert.

**Trade-offs and Alternatives:**

Ordinary vacuum is the online operation. It trades "the file may stay large" for "readers and writers continue." When the table was much larger and is now permanently smaller, the holes in the middle are not given back, and `VACUUM FULL` is the rewrite that returns them. That costs an `ACCESS EXCLUSIVE` lock for the whole rewrite. `CLUSTER` and a table rewrite from some forms of `ALTER TABLE` also build a new file. They are the same family of trade: exclusive access, a new file, space returned.

**Common Mistakes:**

- Promising that vacuum "frees disk" as in "the filesystem shows a smaller file." It frees space inside the file, and it shrinks the file only by cutting an empty tail.
- Running `VACUUM FULL` every night because ordinary vacuum "doesn't work." Ordinary vacuum worked if the free space map has the space and the next inserts reuse it.
- Measuring success with `count(*)`. The live count does not move. Measure removed dead versions, `n_dead_tup` after the stats refresh, and whether the file size was even the problem.
- Taking an `ACCESS EXCLUSIVE` lock in application DDL on a schedule that constantly cancels ordinary autovacuum. The lock modes conflict, and the dead tuples remain.

**Senior-Level Follow-up:**

Page 0 of `ticket` is empty of tuples after vacuum, and page 1 holds a live row. Does `pg_relation_size` drop by one page?

**Answer:** No. Truncation removes empty pages only from the end of the file. Page 0 is a hole in the middle as long as page 1 exists. Its free space is recorded for reuse. The file loses a page only if the empty pages are a suffix and vacuum gets the short exclusive lock to cut them off.

### DB-066 — VACUUM FULL rewrites the table and blocks everyone

**Difficulty:** Senior

**Category:** Vacuum

**Question:**

What does `VACUUM FULL` do that ordinary `VACUUM` does not, and when is the lock held?

**Context and Constraints:**

PostgreSQL 16. Hypothetical `ticket` table whose heap file contains a large amount of free space in the middle after a bulk delete, all of it already committed, and no snapshot needs the deleted versions. The table has the primary key and `ticket_status_idx`. Ordinary `VACUUM` has already run, so the free space map knows about the holes, and the file did not shrink.

**Senior Engineer's Answer:**

`VACUUM FULL` builds a new heap file, writes only the versions that are still live into it, rebuilds every index, and swaps the new files into place. The free space in the middle of the old file is not copied, so the new file is smaller and the old file's blocks are returned to the operating system when the swap finishes. That is the thing ordinary vacuum does not do.

The lock is `ACCESS EXCLUSIVE` for the rewrite. `SELECT` blocks. `INSERT`, `UPDATE`, and `DELETE` block. Autovacuum blocks. A second session's `ANALYZE` blocks. The lock is held for the whole copy, not for a brief truncation at the end. On a large table the wait is the length of the rewrite, and every index is rebuilt as part of that wait. The new file is written through the normal buffer and WAL machinery, so the operation also generates WAL for the copy.

The result is a packed heap. `ctid` values change, because tuples moved into a new file. Applications must not have stored `ctid`. Sequences, foreign-key values, and primary-key values are copied as data. They are not recomputed.

`VACUUM FULL` is not "a stronger vacuum" in the sense of freezing more aggressively as its purpose. It is a rewrite. Using it to advance `relfrozenxid` is the wrong tool: it takes a heavier lock and writes a second copy of the live table. Ordinary vacuum freezes. `VACUUM FULL` also cannot run usefully in the window where the server is refusing new transaction ids, because the rewrite itself needs an xid. That failure mode belongs to the wraparound question. The storage fact here is the exclusive rewrite.

A table that will refill the same holes does not benefit. The next updates create dead tuples in the new file, and the file grows again. A table that was bulk-deleted and will stay small does benefit, and the cost is a maintenance window equal to the rewrite.

**Practical Implementation:**

```sql
SELECT pg_size_pretty(pg_relation_size('ticket')) AS heap_before,
       pg_size_pretty(pg_indexes_size('ticket')) AS indexes_before;

VACUUM FULL ticket;

SELECT pg_size_pretty(pg_relation_size('ticket')) AS heap_after,
       pg_size_pretty(pg_indexes_size('ticket')) AS indexes_after;
```

`heap_after` is smaller when the old file held free space that the rewrite did not copy. `SELECT count(*) FROM ticket` is unchanged. While the command runs, a second session's `SELECT * FROM ticket` waits on the `ACCESS EXCLUSIVE` lock. That wait is the operational difference from `VACUUM ticket`.

**Trade-offs and Alternatives:**

Ordinary `VACUUM` is the right ongoing operation. `VACUUM FULL` is the right one-time operation when the file is much larger than the live data and the space will not be reused, and when you can take the exclusive lock. `CLUSTER ticket USING ticket_status_idx` also rewrites and also takes `ACCESS EXCLUSIVE`; it packs according to an index order. Some `ALTER TABLE` forms rewrite for the same reason, for example a column type change that cannot be done in place. Adding a nullable column with no default in PostgreSQL 16 does not rewrite. Choosing `VACUUM FULL` when all you needed was that `ALTER TABLE` pays for a second full copy.

**Common Mistakes:**

- Scheduling `VACUUM FULL` in cron because it "cleans better." It blocks the table, and the space comes back only if the bloat was real and permanent.
- Expecting it to finish in the time ordinary vacuum takes. It copies the live table and rebuilds every index.
- Running it to clear wraparound. It wants a transaction id at the moment the server is trying not to spend them, and it locks the table.
- Storing `ctid` in an application table across the rewrite. The values no longer name the same bytes.

**Senior-Level Follow-up:**

Ordinary vacuum already removed the dead index entries and updated the free space map. What is left for `VACUUM FULL` to improve, and what stays locked for the whole statement?

**Answer:** The improvement left is the file size. The holes are reusable already, and they are still inside `ticket`'s file until a rewrite copies only the live tuples out. The `ACCESS EXCLUSIVE` lock is held from the start of that copy until the new heap and its rebuilt indexes are swapped in. A `SELECT` that arrives in the middle waits for the swap, not merely for a short tail truncation.

### DB-067 — Autovacuum schedules itself from dead tuples, inserts, and age

**Difficulty:** Senior

**Category:** Vacuum

**Question:**

When does autovacuum vacuum `ticket`, when does it analyze it, and what is different about a worker that is preventing wraparound?

**Context and Constraints:**

PostgreSQL 16 defaults: `autovacuum` on, `track_counts` on, `autovacuum_vacuum_threshold` 50, `autovacuum_vacuum_scale_factor` 0.2, `autovacuum_analyze_threshold` 50, `autovacuum_analyze_scale_factor` 0.1, `autovacuum_vacuum_insert_threshold` 1000, `autovacuum_vacuum_insert_scale_factor` 0.2, `autovacuum_freeze_max_age` 200 million, `autovacuum_naptime` 1 minute, `autovacuum_max_workers` 3, `log_autovacuum_min_duration` 10 minutes. Hypothetical `pg_class.reltuples` for `ticket` is 100000. That figure is an assumption for the arithmetic, not a measured production table.

**Senior Engineer's Answer:**

The launcher wakes on `autovacuum_naptime` and starts workers, up to `autovacuum_max_workers`. Workers do not count against `max_connections`. A worker vacuums `ticket` when any of these is true.

The dead-tuple threshold is `50 + 0.2 * reltuples`. At 100000 tuples that is 20050. When `n_dead_tup` in the statistics views reaches that, the table is a vacuum candidate. The insert threshold is `1000 + 0.2 * reltuples`, which is 21000 inserts since the last vacuum. Inserts create no dead tuples and still force vacuum, so pages can be marked all-visible and old tuples can be frozen. The age trigger ignores both counters: when `age(relfrozenxid)` passes `autovacuum_freeze_max_age` of 200 million, the table is vacuumed to freeze it. That worker's query text in `pg_stat_activity` ends with `to prevent wraparound`.

Analyze uses a different threshold: `50 + 0.1 * reltuples`, so 10050 inserts, updates, and deletes since the last analyze, compared with `n_mod_since_analyze`. An update-heavy table can be analyzed before it is vacuumed, and an insert-only table can be vacuumed on the insert threshold before the dead-tuple rule would ever fire. The dead-tuple rule would not fire at all if nothing dies.

These counts come from the cumulative statistics system. `track_counts` must stay on. The counts are semi-accurate and can be lost under heavy load, so the trigger is a threshold, not a precise row audit. Per-table storage parameters replace the globals for that table when they are set.

A normal autovacuum worker holds `SHARE UPDATE EXCLUSIVE`. If a session needs a conflicting lock, the worker is interrupted and the lock proceeds. With `log_autovacuum_min_duration` at its default of 10 minutes, a worker that runs at least that long is logged, and a worker that is skipped because of a conflicting lock is logged too, because the setting is not `-1`. A wraparound worker is not interrupted to satisfy that conflicting lock. It runs until the freeze work is done. Disabling `autovacuum` does not disable that anti-wraparound launch. The server still starts those workers.

Temporary tables are invisible to autovacuum. The session that created them runs `VACUUM` and `ANALYZE`. A partitioned parent holds no tuples of its own, so autovacuum does not analyze the parent. It does process each partition. Stale parent statistics are a planner problem the analyze question names.

Autovacuum is also throttled. `autovacuum_vacuum_cost_delay` defaults to 2 ms and `autovacuum_vacuum_cost_limit` defaults to -1, which means the `vacuum_cost_limit` of 200. Manual `VACUUM` has `vacuum_cost_delay` of 0, so it is not throttled unless you set a delay. Several workers share the cost budget unless a table has overridden the cost settings.

**Practical Implementation:**

```sql
SELECT reltuples,
       n_dead_tup,
       n_ins_since_vacuum,
       n_mod_since_analyze,
       last_autovacuum,
       last_autoanalyze
FROM pg_stat_user_tables
WHERE relname = 'ticket';
```

Compare `n_dead_tup` with `50 + 0.2 * reltuples`, `n_ins_since_vacuum` with `1000 + 0.2 * reltuples`, and `n_mod_since_analyze` with `50 + 0.1 * reltuples`. `reltuples` in that expression is the `pg_class` value, which `ANALYZE` and `VACUUM` refresh. A wraparound worker is visible with:

```sql
SELECT pid, query
FROM pg_stat_activity
WHERE query LIKE 'autovacuum:%'
  AND query LIKE '%to prevent wraparound%';
```

**Trade-offs and Alternatives:**

The scale factor of 0.2 means a small table waits until a large fraction of its rows are dead, and a large table waits for a large absolute number. A high-churn table that is also large can collect a lot of dead tuples before 20050 is reached if you only look at a smaller scale, and at 100000 rows the number really is 20050. Lower `autovacuum_vacuum_scale_factor` on that table, often toward 0.02 or a fixed threshold, so vacuum starts after fewer dead tuples. The cost is more frequent vacuum I/O. Raising the thresholds does the opposite and is how a bulk-load table avoids fighting autovacuum during a load. After the load, set them back and analyze. Turning autovacuum off globally is not the bulk-load tool. Wraparound workers still run, and every other table loses ordinary cleanup.

**Common Mistakes:**

- Using one threshold for vacuum and analyze. Analyze fires on modifications at scale factor 0.1. Vacuum's dead-tuple scale factor is 0.2, and inserts have their own rule.
- Believing an insert-only table never needs vacuum. It needs the visibility map and freezing. The insert threshold is why.
- Killing every autovacuum that blocks DDL, including the ones labeled to prevent wraparound. The normal ones step aside. The wraparound ones do not, and cancelling them by force keeps the age climbing.
- Setting `autovacuum` off and assuming the launcher is gone. Anti-wraparound workers still start.

**Senior-Level Follow-up:**

`ticket` has `reltuples` 100, `n_dead_tup` 40, and no inserts worth mentioning. Does the default dead-tuple rule vacuum it?

**Answer:** No. The threshold is `50 + 0.2 * 100`, which is 70. Forty dead tuples is every live row and more, and it is still under 70. Small tables stay bloated under the defaults for exactly this arithmetic. A table-level `autovacuum_vacuum_scale_factor` of 0.05, or a lower threshold, is the fix. Forty is not "too few to matter" to the application. It is too few for this default formula.

### DB-068 — Vacuum's horizon is the oldest snapshot and the oldest running xid

**Difficulty:** Advanced

**Category:** Vacuum

**Question:**

What keeps vacuum from removing a tuple that is already dead to every new snapshot? Which sessions do that, and which open transactions do not?

**Context and Constraints:**

PostgreSQL 16. Read Committed is the default. One committed delete has made a `ticket` version dead to any snapshot taken after the commit. A few other sessions are connected. `max_prepared_transactions` is 0 unless a prepared transaction is mentioned. Replication slots may exist; do not design a replica, only say how a slot holds the horizon.

**Senior Engineer's Answer:**

Vacuum may remove a dead tuple only when no snapshot can still see it and no running transaction is still old enough to need it. The server computes that horizon from registered snapshot `xmin` values, from xids of transactions that are still in progress, from prepared transactions, and from replication slots.

`pg_stat_activity.backend_xmin` is a registered snapshot. `backend_xid` is an assigned transaction id. A tuple whose deleting xid is newer than that horizon, or that a registered snapshot can still see, stays.

A Repeatable Read or Serializable transaction takes one snapshot and keeps it until commit, so `backend_xmin` stays set the whole time, including while the session is `idle in transaction`. That holds the horizon.

A Read Committed transaction takes a snapshot per statement and releases it at the end of the statement. After the statement, an idle Read Committed transaction that has not written can show an empty `backend_xmin`. It is not holding the vacuum horizon. It is still holding any row locks or table locks it took. A Read Committed transaction that has inserted, updated, or deleted has a `backend_xid` until it ends, and that xid holds the horizon even between statements. "Idle in transaction" is therefore not automatically a vacuum blocker. The blocker is a snapshot that is still registered, or an xid that is still in progress. The lock blocker is a separate fact.

A prepared transaction, visible in `pg_prepared_xacts`, stays in progress until `COMMIT PREPARED` or `ROLLBACK PREPARED`. With the default `max_prepared_transactions` of 0 there are none. If the parameter was raised and a prepared transaction was abandoned, it holds the horizon with no client session at all.

A replication slot holds `xmin` or `catalog_xmin` in `pg_replication_slots` for as long as the slot exists, including when the subscriber is gone. Vacuum cannot advance past that. Dropping a slot whose consumer is actually gone releases the horizon. Dropping a slot whose standby is still using it is a replication decision, not a vacuum tweak, and it can force that standby to be rebuilt. The horizon fact is enough here.

Hot-standby feedback and a long-running query on a standby can also publish an xmin the primary honors. That is the same horizon, arriving from a replica. The cure is still "who is advertising an old xmin," read from the slot or from `pg_stat_replication`, not a more aggressive vacuum command. A more aggressive command cannot remove what the horizon still protects.

**Practical Implementation:**

```sql
SELECT pid,
       state,
       backend_xid,
       backend_xmin,
       age(backend_xid) AS xid_age,
       age(backend_xmin) AS xmin_age,
       query
FROM pg_stat_activity
WHERE backend_xid IS NOT NULL
   OR backend_xmin IS NOT NULL
ORDER BY greatest(age(backend_xid), age(backend_xmin)) DESC NULLS LAST;
```

And:

```sql
SELECT slot_name, slot_type, active, age(xmin) AS xmin_age, age(catalog_xmin) AS catalog_age
FROM pg_replication_slots
ORDER BY greatest(age(xmin), age(catalog_xmin)) DESC NULLS LAST;
```

The row with the oldest age is the horizon. A Read Committed session that is `idle in transaction` with both xid columns null is not on this list, and it is not the reason vacuum skipped a tuple.

**Trade-offs and Alternatives:**

Ending the old transaction, finishing the prepared transaction, or dropping a genuinely abandoned slot lets vacuum remove the tuples on its next pass. Raising vacuum cost limits does not. Application-side, a Read Committed transaction should commit before it goes to the client for human time, because a write it already did holds an xid. A Repeatable Read transaction held open across that think time holds a snapshot as well. Both are application bugs that show up as vacuum debt. `idle_in_transaction_session_timeout` closes the idle ones from the server side. It does not close a session that is actively streaming rows, and it does not clear a replication slot.

**Common Mistakes:**

- Killing every `idle in transaction` session. A Read Committed one with no xid and no snapshot is holding locks, which may matter, and it is not holding `backend_xmin`.
- Leaving a Repeatable Read report open all afternoon and blaming autovacuum for table bloat. The report's snapshot is the horizon.
- Dropping a replication slot because `age(xmin)` is large, without checking `active` and whether a standby still needs it.
- Running `VACUUM FULL` to get past the horizon. The rewrite still cannot throw away a version a registered snapshot can see, and it takes `ACCESS EXCLUSIVE`.

**Senior-Level Follow-up:**

Session A is Read Committed, has run `SELECT 1`, and is idle in the transaction. Session B is Read Committed, has run `UPDATE ticket SET note = 'x' WHERE id = 1`, and is idle in the transaction. Which one holds the horizon?

**Answer:** Session B. Its `backend_xid` is in progress until it commits or rolls back. Session A released its statement snapshot and never assigned an xid, so it contributes neither `backend_xmin` nor `backend_xid`. A later vacuum can remove tuples that only A's abandoned snapshot would have cared about. It cannot remove tuples that B's still-running xid makes unsafe to remove.

### DB-069 — Freezing takes a tuple out of xid comparison

**Difficulty:** Senior

**Category:** Freeze and wraparound

**Question:**

What does it mean to freeze a tuple, and when does vacuum do it?

**Context and Constraints:**

PostgreSQL 16 defaults: `vacuum_freeze_min_age` is 50 million, `vacuum_freeze_table_age` is 150 million, `autovacuum_freeze_max_age` is 200 million, `vacuum_failsafe_age` is 1.6 billion. On-disk `xmin` and `xmax` are 32-bit. `FrozenTransactionId` is the special xid 2.

**Senior Engineer's Answer:**

Normal xids are compared on a circle. For any normal xid, about two billion others count as older and about two billion count as newer. That comparison is what makes a snapshot work, and it is only valid while the tuple's `xmin` stays inside the circle relative to current transactions. Freezing replaces that problem for one tuple by marking it frozen: its inserting xid is treated as `FrozenTransactionId`, which is older than every normal xid and does not move when the counter advances. A frozen tuple stays visible to every snapshot until something deletes it. Freezing is not a commit and not a lock. It is a permanent "this insert is in the past."

Vacuum freezes a tuple it is already scanning when the tuple's `xmin` is older than `vacuum_freeze_min_age`, 50 million transactions, and the tuple is visible to every current snapshot. Younger tuples stay unfrozen so that a snapshot still running from before the freeze horizon cannot be contradicted. Freezing writes the tuple header, so it dirties the page and writes WAL.

Whether vacuum looks at a page depends on the visibility map. A normal vacuum skips pages that are all-visible when it is only hunting dead tuples. `relfrozenxid` on `pg_class` cannot move forward unless every page that might still hold an unfrozen xid was scanned. Pages marked all-frozen may be skipped. Vacuum does that full aggressive scan when `age(relfrozenxid)` is older than `vacuum_freeze_table_age` (150 million), when you run `VACUUM (FREEZE)`, or when there is no all-visible page it is allowed to skip. After an aggressive scan, `age(relfrozenxid)` lands a little above `vacuum_freeze_min_age`, not at zero, because tuples newer than the freeze minimum were left unfrozen on purpose.

If `age(relfrozenxid)` reaches `autovacuum_freeze_max_age`, 200 million, autovacuum launches an anti-wraparound vacuum even when ordinary dead-tuple thresholds are not met, and even when `autovacuum` is turned off. Past `vacuum_failsafe_age`, 1.6 billion, that vacuum stops sleeping for cost delay so it can finish. `pg_database.datfrozenxid` is the oldest `relfrozenxid` among the relations in that database. The database is only as frozen as its oldest table, including catalogs.

The all-frozen bit is what lets the next aggressive vacuum skip a page that is already done. An update on that page clears the bit and creates a new unfrozen version. The old frozen bytes, if they are now dead and invisible, can be removed. The new version will need its own freeze later.

**Practical Implementation:**

```sql
SELECT c.relname,
       age(c.relfrozenxid) AS xid_age,
       c.relfrozenxid
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'r'
  AND n.nspname = 'public'
ORDER BY age(c.relfrozenxid) DESC;
```

And for the database:

```sql
SELECT datname, age(datfrozenxid) AS db_age
FROM pg_database
ORDER BY age(datfrozenxid) DESC;
```

A public table whose `xid_age` is far below 150 million has been frozen recently enough that the next vacuum need not be aggressive. A system catalog with a high age is enough to keep `datfrozenxid` old. Vacuuming only the application table does not move the database age if a catalog is older.

**Trade-offs and Alternatives:**

A lower `vacuum_freeze_min_age` freezes tuples sooner, dirties pages sooner, and leaves less unfrozen work for a later aggressive scan. The default of 50 million avoids rewriting a page to freeze a tuple that a long-running snapshot might still be entitled to reason about, and it avoids freezing tuples on pages that are still being updated every minute. On an insert-only log table, a lower per-table `autovacuum_freeze_min_age` lets the insert-triggered vacuum freeze as it goes, so the 200 million anti-wraparound scan has less to do. `VACUUM (FREEZE)` forces the aggressive scan now. It is the tool before a long maintenance window or a major version upgrade, not the tool to run on a timer on a hot table.

**Common Mistakes:**

- Thinking freezing deletes old rows. A frozen row is unconditionally in the past, so it remains visible until a real delete.
- Vacuuming the one large application table and declaring the database safe. `datfrozenxid` follows the oldest relation, catalogs included, which is why a non-superuser vacuum cannot finish the job.
- Setting `vacuum_freeze_min_age` above `vacuum_freeze_table_age`, or above half of `autovacuum_freeze_max_age`. The aggressive scan would be unable to advance `relfrozenxid` enough, and the next one would be forced immediately.
- Confusing all-visible with all-frozen. Index-only scans care about the first. Freeze skipping cares about the second.

**Senior-Level Follow-up:**

An aggressive vacuum finishes on `ticket`. Why is `age(relfrozenxid)` about 50 million rather than 0?

**Answer:** Tuples inserted by transactions newer than `vacuum_freeze_min_age` were not frozen. `relfrozenxid` is the oldest xid still present in the table, so it sits just newer than the freeze minimum, plus the transactions that began while the vacuum itself was running. Zero would mean every live tuple was frozen, which would require a freeze minimum of zero and no concurrent inserts. The default deliberately leaves the recent 50 million unfrozen.

### DB-070 — Wraparound is the server refusing new transaction ids

**Difficulty:** Staff-Level

**Category:** Freeze and wraparound

**Question:**

What fails if `datfrozenxid` is not advanced, at what ages does PostgreSQL 16 warn and stop, and what actually moves the horizon again?

**Context and Constraints:**

PostgreSQL 16. On-disk xids are 32 bits. The circular comparison treats about two billion transactions as "in the past." Defaults from the freeze question apply: anti-wraparound autovacuum at 200 million, warnings within 40 million of the wraparound point, refusal to assign new xids when fewer than 3 million remain. No fictional outage narrative. The behavior below is what the server does at those ages.

**Senior Engineer's Answer:**

If a tuple's real `xmin` stays unfrozen for more than about two billion later transactions, the circle rolls. That `xmin` starts comparing as in the future. The tuple becomes invisible even though it committed. Freezing exists so that this comparison is never asked of an old committed insert. `relfrozenxid` and `datfrozenxid` exist so the server knows the oldest unfrozen xid it still has to protect. The failure is not a slow query. It is visibility collapsing, and PostgreSQL stops issuing xids before that point.

The schedule on a default cluster is fixed. At `autovacuum_freeze_max_age`, 200 million, anti-wraparound autovacuum is forced, and it is not cancelled to let DDL take its lock. If that still does not advance `datfrozenxid`, the server warns when the oldest xid in the database is within 40 million transactions of the wraparound point. The warning names the database and a remaining transaction count. If that is ignored, then once fewer than 3 million transactions remain the server refuses to assign new xids. Transactions already in progress can finish. New sessions can start read-only work. Writes and truncation fail with `database is not accepting commands to avoid wraparound data loss`. The error hint still mentions single-user mode. Current PostgreSQL 16 behavior is that a normal `VACUUM` can still be run without going there, and single-user mode is reserved for the case where you must `DROP` or `TRUNCATE` a table you cannot afford to vacuum.

What moves the number is a vacuum that advances `relfrozenxid` on every relation that is holding `datfrozenxid` back, including catalogs. A superuser has to do that. A non-superuser vacuum skips catalogs, so `datfrozenxid` stays put even if every application table is frozen. Before that vacuum can help, anything still pinning the horizon has to be cleared: prepared transactions in `pg_prepared_xacts` with a large `age(transactionid)`, sessions with a large `age(backend_xid)` or `age(backend_xmin)`, and replication slots with a large `age(xmin)` or `age(catalog_xmin)`. Vacuum cannot freeze past a horizon those are holding.

`VACUUM FULL` in this window is the wrong instrument. It needs an xid, so it fails once the server has stopped issuing them, and before that point it spends an xid and an exclusive lock on a rewrite. `VACUUM (FREEZE)` does more dirtying than the minimum required to advance `relfrozenxid`. A plain database-wide `VACUUM` is the documented repair. Afterward, autovacuum has to be left able to run, because the circle has not gone away. It has only been given a new oldest xid.

Multixact ids wrap on their own circle. They are what `xmax` stores when more than one transaction locks a row, and their members live under `pg_multixact`. `autovacuum_multixact_freeze_max_age` defaults to 400 million. The same 40 million warning and 3 million stop apply to multixact ids. Running out of them blocks the operations that need a new multixact, not every write. Replication slots do not hold the multixact horizon the way they hold the xid horizon. `relminmxid` on `pg_class` is the per-table mark, parallel to `relfrozenxid`.

Xid consumption is not "one per `BEGIN`." Read-only transactions often take none. Writes, row locks, and subtransactions do. A savepoint and a PL/pgSQL `EXCEPTION` block can assign extra xids. A workload that burns xids quickly reaches 200 million sooner. That changes the calendar, not the mechanism.

**Practical Implementation:**

```sql
SELECT datname,
       age(datfrozenxid) AS xid_age,
       mxid_age(datminmxid) AS mxid_age
FROM pg_database
ORDER BY age(datfrozenxid) DESC;
```

The useful comparison is `xid_age` against 200 million, long before 2 billion. The per-relation list from the freeze question shows which table is holding the database age. `pg_prepared_xacts` and `pg_replication_slots` show pins that vacuum cannot clear by itself.

**Trade-offs and Alternatives:**

There is no alternative freezing scheme inside PostgreSQL 16. A bigger `shared_buffers` does not move `datfrozenxid`. A failover to a replica does not either, if that replica is a copy of the same unfrozen tables. The operational alternatives are all about letting anti-wraparound vacuum finish: do not hold old snapshots, do not leave prepared transactions, do not leave abandoned slots, and do not take conflicting locks so often that even the non-wraparound vacuums never complete. On a table that is all frozen and then never touched, the aggressive scan is cheap because the all-frozen map lets it skip pages. That is the payoff of freezing as you go.

**Common Mistakes:**

- Calling wraparound a performance incident. Past the stop limit the database refuses new xids. The earlier symptom is the warning and the anti-wraparound worker, not a slow plan.
- Vacuuming as a non-superuser and expecting `age(datfrozenxid)` to drop. Catalogs were skipped.
- Following the error hint into single-user mode as the first move. The current documentation's repair is to clear the pins and run `VACUUM` while the server is up. Single-user mode disables safeguards and is for dropping a table you will not vacuum.
- Raising `autovacuum_freeze_max_age` toward a billion to silence workers. You have moved the forced vacuum closer to the 40 million warning and left a larger unfrozen backlog.

**Senior-Level Follow-up:**

`age(datfrozenxid)` is 210 million. Autovacuum is off. Writes still succeed. What will the server do, and what will a larger `shared_buffers` change about it?

**Answer:** It will start an anti-wraparound autovacuum anyway, because that launch does not honor `autovacuum = off`. The worker's query ends with `to prevent wraparound`, and it will not step aside for a conflicting lock. Writes continue because 210 million is far from the 40 million warning and the 3 million stop. `shared_buffers` changes none of those thresholds and does not freeze a tuple. The thing that moves `datfrozenxid` is that worker, or a superuser `VACUUM`, completing on the relation that holds the oldest `relfrozenxid`.

### DB-071 — A page can sit in shared buffers and in the operating-system cache

**Difficulty:** Senior

**Category:** Buffer cache

**Question:**

What does `shared_buffers` hold, what does the operating-system page cache hold, and what does a buffer miss mean?

**Context and Constraints:**

PostgreSQL 16. `shared_buffers` defaults to 128 MB. The block size is the default 8 kB. `effective_cache_size` is the next question and is not an allocation. One query reads a heap page. Do not invent a hit rate for a workload.

**Senior Engineer's Answer:**

`shared_buffers` is PostgreSQL's buffer pool, in shared memory, sized in bytes and divided into blocks of the default 8 kB. A backend that needs a heap or index page looks there first. If the page is present and pinned, the backend uses it. If it is absent, the backend asks the kernel to read the file. The kernel may serve that read from its own page cache, in which case no disk transfer happens, or it may read the disk. The page is then copied into a shared buffer. After that, two copies can exist: one in `shared_buffers` and one in the operating-system cache. That double residency is normal. It costs RAM. It is also why the operating-system cache still matters after `shared_buffers` is set: WAL, files that are not hot enough to stay in the pool, and the first fault of a cold page all use it.

A miss in `EXPLAIN (ANALYZE, BUFFERS)` is a `read` (or, in the output's terms, a shared read) counted when the page was not in `shared_buffers`. It is not proof of a disk read. `track_io_timing` must be on before those reads have times attached, and a short time is consistent with the page cache. `pg_stat_io`, added in PostgreSQL 16, breaks reads, hits, and evictions out by backend type and by context. It still counts a read into the pool as a read. It does not label the kernel's cache hit for you.

Eviction inside the pool is a clock sweep. Each buffer has a usage count, raised when the buffer is used, up to 5. The sweep looks for a buffer with usage count 0 that is not pinned. A buffer with a positive count is decremented and skipped for this pass. A dirty victim has to be written before the slot can be reused. The background writer tries to write those victims early. A backend that finds a dirty victim writes it itself.

Large scans do not get to empty the pool. A sequential scan uses a small ring, 256 kB at the default 8 kB block size, and reuses those buffers. `VACUUM` and `ANALYZE` in PostgreSQL 16 use a ring limited by `vacuum_buffer_usage_limit`, default 256 kB, and silently capped at one eighth of `shared_buffers`. Setting that to 0 lets vacuum use the pool without a ring. A bigger ring makes vacuum faster and evicts more of the cache other sessions are using.

A common starting point is to give `shared_buffers` about a quarter of the machine's RAM and leave the rest for the operating-system cache, for backend private memory, and for the kernel. That is a rule of thumb, not a measurement, and it is wrong on a host whose RAM is mostly needed by something else. The setting is not a query hint. It is the actual pool.

**Practical Implementation:**

```sql
SHOW shared_buffers;
SHOW vacuum_buffer_usage_limit;

EXPLAIN (ANALYZE, BUFFERS)
SELECT count(*) FROM ticket;
```

`shared hit` is a page found in the pool. `shared read` is a page copied into the pool from the kernel. Run the explain twice. The second run's `shared read` count drops for pages that stayed in the pool. That drop still does not tell you whether the first read came from the page cache or from the disk. Turn `track_io_timing` on when the time is the question.

**Trade-offs and Alternatives:**

A pool that is a large fraction of RAM reduces pool misses and squeezes the operating-system cache, which then faults more of the rest of the system. A pool at the 128 MB default on a large host turns almost every working set into a kernel read, which is cheap when the page cache holds it and expensive when it does not. Huge pages, `huge_pages` defaults to `try`, reduce TLB pressure when the pool is large. They do not change the hit rule. `effective_cache_size` is the planner's guess about the combined caches and allocates nothing. Setting the pool and setting that guess are two different edits.

**Common Mistakes:**

- Reading `shared read` as "disk read" in an incident report. It means "not in `shared_buffers`."
- Setting `shared_buffers` to most of RAM and leaving the kernel nothing. WAL and the page cache still need memory.
- Assuming a sequential scan of a large table stays resident. The ring is there so it does not.
- Raising `vacuum_buffer_usage_limit` to "speed up vacuum" on a host whose cache is already tight. Vacuum then evicts the pages the application was hitting.

**Senior-Level Follow-up:**

The second `count(*)` shows only shared hits. A moment later the operating system drops its page cache under memory pressure, and PostgreSQL is not restarted. What does the next `count(*)` show, and does it have to read the disk?

**Answer:** It still shows shared hits for every page that remained in `shared_buffers`. Those pages are in PostgreSQL's memory, not only in the kernel cache. The kernel dropping its cache does not evict the pool. A page that had already been evicted from the pool would be a shared read, and that read might now miss the kernel cache and reach the disk. The pool is the copy that made the second and third counts independent of the kernel cache.

### DB-072 — effective_cache_size is a cost input, not a cache

**Difficulty:** Advanced

**Category:** Buffer cache

**Question:**

What does `effective_cache_size` change, and what does it leave allocated exactly as before?

**Context and Constraints:**

PostgreSQL 16. The default is 4 GB. `shared_buffers` is 128 MB unless someone changed it. One planner choice is on the table: an index scan versus a sequential scan of `ticket`. Do not describe the index's internal pages. Do not invent a cost number for a specific plan.

**Senior Engineer's Answer:**

`effective_cache_size` is the planner's assumption about how much RAM is available to cache this query's pages, counting both `shared_buffers` and the operating-system page cache. It is used when the planner estimates the cost of a random page fetch. A larger value means the planner believes a page fetched once is likely still cached when it is fetched again, so an index scan that would touch many scattered heap pages looks cheaper. A smaller value means the planner believes those fetches will mostly miss, so a sequential scan of the heap looks relatively cheaper.

The setting allocates nothing. It does not grow `shared_buffers`, it does not pin a page, and it does not change `EXPLAIN (ANALYZE, BUFFERS)` hit counts. Two clusters with the same data, the same statistics, and different `effective_cache_size` can choose different plans and then experience the same actual cache, because the actual cache is the pool plus the kernel. If the assumption is wildly high, the planner prefers plans that only pay off when pages are cached, and the executor takes the shared reads anyway. If the assumption is wildly low, the planner avoids index scans that would have been cheap on a machine that does have the RAM.

The default of 4 GB is a guess aimed at a modest dedicated host. On a host with much more RAM it is low, and the planner is more pessimistic about caching than the hardware deserves. On a small container it is high. The usual accompanying edit, when `shared_buffers` is raised toward a quarter of RAM, is to set `effective_cache_size` near the RAM you expect to be available for caching, often a large fraction of the machine, still as a guess. It should sit above `shared_buffers`, because the kernel cache is real. Setting the two equal tells the planner the kernel cache does not exist.

Statistics still decide how many pages the planner thinks the query will touch. `effective_cache_size` decides how expensive it believes a repeated random touch will be. A stale `reltuples` sends it to the wrong page count, and no cache setting repairs that. That is the analyze question.

**Practical Implementation:**

```sql
SHOW effective_cache_size;
SHOW shared_buffers;
```

Then:

```sql
EXPLAIN SELECT id FROM ticket WHERE status = 'open';
```

Changing `effective_cache_size` for the session with `SET` and explaining again is the demonstration. If the plan type changes, the cost model moved. `EXPLAIN (ANALYZE, BUFFERS)` on both plans shows the pages actually touched, which the setting did not allocate. If both explains show the same plan, this query's cost was not close enough to the boundary for the guess to matter. That is a real result, not a failed experiment.

**Trade-offs and Alternatives:**

Setting it from the host's RAM is the right kind of input. Setting it from a wish about which plan you want is the wrong kind. If a particular query needs an index scan and the planner refuses for a statistics reason, fix the statistics or the index definition. If the planner refuses because it believes the heap fetches will miss, and the host really does cache that working set, raising `effective_cache_size` is the honest correction. A session-level `SET` is the safe way to test. A postgresql.conf change affects every database on the instance.

**Common Mistakes:**

- Raising `effective_cache_size` and then watching `shared_buffers` in `pg_settings` for a matching increase. The pool size did not move.
- Setting it larger than the machine's RAM. The planner will cost plans as if pages fit, and the kernel will evict them.
- Using it to compensate for a missing index or for `default_statistics_target` that is too coarse. The cost model is multiplying a bad row estimate by a cache assumption.
- Restarting PostgreSQL after changing it. The context allows a reload, and a session can `SET` it. A restart is not what applies the value. `shared_buffers` is the parameter that needs the restart.

**Senior-Level Follow-up:**

`shared_buffers` is 128 MB and the host has 64 GB of RAM, almost all of it free for the page cache. `effective_cache_size` is left at 4 GB. What does the planner assume that is wrong, and what does the executor actually have?

**Answer:** The planner assumes about 4 GB of combined cache when it costs a repeated random fetch. The executor actually has a 128 MB pool plus a large kernel page cache, so a working set of several gigabytes can be resident even though the planner is pricing it as if it would not fit. Raising `effective_cache_size` toward the RAM that is really available for caching corrects the price. It still does not enlarge the 128 MB pool. If the working set is bigger than the pool, `EXPLAIN` will keep showing shared reads that the kernel satisfies from its cache, which is the DB-071 distinction.

### DB-073 — ANALYZE writes the statistics the planner reads

**Difficulty:** Senior

**Category:** Planner statistics

**Question:**

Where do the planner's row estimates come from, and what do `pg_stat_user_tables` and `pg_stats` each contribute?

**Context and Constraints:**

PostgreSQL 16. `default_statistics_target` is 100. Hypothetical table:

```sql
CREATE TABLE ticket (
  id integer PRIMARY KEY,
  status text NOT NULL,
  note text NOT NULL
);

CREATE INDEX ticket_status_idx ON ticket (status);
```

A bulk load has just inserted 100000 rows and committed. Autovacuum has not run yet. The question is the planner's inputs, not a specific plan shape and not an index-structure question.

**Senior Engineer's Answer:**

The planner estimates selectivity from `pg_statistic`, which a user reads through `pg_stats`, and from `pg_class.reltuples` and `relpages`. `ANALYZE` samples the table and writes those rows. For each column it records the null fraction, the average width, `n_distinct`, the most common values and their frequencies, a histogram of the remaining values, and the correlation between the column's order and the heap's physical order. `default_statistics_target` of 100 is the number of most-common-value slots and the number of histogram bins. `n_distinct` is a positive count, or a negative fraction of the table: -1 means "every row is distinct." Correlation near 1 means the heap is in column order, which is an input to how many random pages an index scan would touch. It is not an index.

`pg_stat_user_tables` is a different catalog. `n_live_tup`, `n_dead_tup`, `n_mod_since_analyze`, `n_ins_since_vacuum`, and the scan counters are cumulative activity stats. Autovacuum reads them to decide when to vacuum or analyze. The planner does not read `n_dead_tup` to decide how many rows `status = 'open'` will return. After `ANALYZE`, the planner uses `reltuples` times the frequency `pg_stats` stored for `'open'`. If `'open'` is not in the most-common list, it uses the histogram. If the sample was unlucky on a rare value, the estimate is wrong until the next analyze with a higher statistics target.

Immediately after the bulk load, `reltuples` and `pg_stats` can still describe the empty table or a much smaller sample. The next `SELECT` is then planned with that stale picture. Autovacuum will analyze once `n_mod_since_analyze` crosses `50 + 0.1 * reltuples`, except that `reltuples` itself is stale, so the threshold is computed from the old number. An explicit `ANALYZE ticket` after the load is the reliable step. `VACUUM` also refreshes `reltuples`, and it does not by itself write the per-column histogram the way `ANALYZE` does. `VACUUM (ANALYZE)` does both.

Extended statistics are a second object, created with `CREATE STATISTICS`, for combinations of columns: distinct counts, functional dependencies, and most-common combinations. The planner can use them when a query filters on those columns together and the single-column fractions would be multiplied as if they were independent. They are not collected unless you create them, and `ANALYZE` is what fills them once they exist.

A partitioned parent is not analyzed by autovacuum, because the parent stores no tuples. Partitions are. A query that plans against the parent's statistics needs an explicit `ANALYZE` of the parent when the data distribution changes. Temporary tables are also invisible to autovacuum, so the session analyzes them.

There is no stats-collector process in PostgreSQL 16. The counters live in shared memory. `pg_stat_statements` is an extension. It records executed statements. It is not an input to selectivity.

**Practical Implementation:**

```sql
ANALYZE ticket;

SELECT attname, n_distinct, null_frac, correlation
FROM pg_stats
WHERE schemaname = 'public'
  AND tablename = 'ticket'
ORDER BY attname;
```

After the analyze, `status` has a frequency the planner can use, and `id` shows `n_distinct` of -1 or a value near the row count because the primary key makes it unique. Compare with:

```sql
SELECT n_live_tup, n_mod_since_analyze, last_analyze
FROM pg_stat_user_tables
WHERE relname = 'ticket';
```

`last_analyze` moves when `ANALYZE` runs. `n_live_tup` is the activity counter. A plan's row estimate that matches `reltuples` times a `pg_stats` frequency is using the right catalog. A plan explained as "because `n_live_tup` said so" is using the wrong one.

**Trade-offs and Alternatives:**

A higher `default_statistics_target`, or a per-column `ALTER TABLE ticket ALTER COLUMN status SET STATISTICS 500`, spends more analyze time and more catalog space to estimate skewed or high-distinctness columns better. Leaving the default is right for a column with a handful of statuses. `CREATE STATISTICS` is the right addition when two columns are correlated and queries filter on both. It is not a substitute for analyzing after a load. Autoanalyze is the right steady state. It is the wrong thing to wait for in the transaction that loads and then immediately queries, because the threshold may not have fired and the planner is still holding the old snapshot of statistics for plans it already cached. A new statement plans again and sees the new stats. A prepared plan from before the analyze does not, until it is invalidated.

**Common Mistakes:**

- Reading `pg_stat_user_tables.n_live_tup` as the planner's row count. The planner uses `pg_class.reltuples`, written by `ANALYZE` and `VACUUM`.
- Loading 100000 rows and debugging the index choice before `ANALYZE`. The estimate is about the old table.
- Raising `shared_buffers` because a bulk load planned badly. The cache did not invent a histogram.
- Expecting autovacuum to analyze a partitioned parent or a temporary table. It will not.

**Senior-Level Follow-up:**

`pg_stats` says the most common `status` is `'closed'` with frequency 0.9, and `reltuples` is 100000. The table has just been updated so that every row is `'open'`, and `ANALYZE` has not run. What does the planner think `WHERE status = 'open'` returns, and what does the executor return?

**Answer:** The planner estimates `0.1 * 100000`, or whatever frequency the histogram implies if `'open'` was the uncommon value, on the order of 10000 rows if the old frequency of `'closed'` was 0.9 and `'open'` was the rest. The executor returns 100000 rows. The plan can be a nested loop or an index scan sized for the wrong cardinality. `ANALYZE ticket` replaces the frequency. Until then, no memory setting corrects the estimate.

### DB-074 — The pool exists so client count and backend count can differ

**Difficulty:** Intermediate

**Category:** Connections

**Question:**

Why does a PostgreSQL deployment put a pool between application processes and the database? What is being pooled, and what is not?

**Context and Constraints:**

PostgreSQL 16, `max_connections` 100, `superuser_reserved_connections` 3. Many application processes, each able to open its own database sessions. No particular pooler product yet. That is the next question. No standby and no failover design.

**Senior Engineer's Answer:**

Each direct client session consumes one backend for the life of the session, and `max_connections` caps how many of those backends exist. Three slots are reserved for superusers. Autovacuum workers sit outside the cap. Parallel workers sit outside it too and are bounded by `max_worker_processes`. The cap is there because each backend is a process with private memory, a slot in the shared lock table, and a snapshot horizon when it holds one. A fleet of application instances that each open a private pool of 20 sessions is `20 * instances` backends. Past the cap, new connections are refused. Before the cap, the machine can already be spending its RAM on idle backends.

A pool in front of PostgreSQL holds a smaller set of server backends and a larger set of client sockets. The thing being pooled is the backend, which is expensive and capped. The thing being accepted is the application connection, which is cheap by comparison and numerous. When an application transaction starts, it borrows a backend. When the transaction ends, it returns the backend to the pool, and another application transaction can borrow it. That is transaction-lifetime checkout, and it is the arrangement that lets client count and backend count diverge. Session-lifetime checkout, where one client keeps one backend until the client disconnects, does not diverge. It is a pass-through with extra hops. It still has a use when the client depends on session state. It does not solve `max_connections`.

The pool size is chosen to stay under `max_connections` with room for an administrator in the reserved slots and for jobs that connect directly. Sizing the pool to 100 on a server whose `max_connections` is 100 leaves the superuser reserve as the only headroom and leaves nothing for a second pool. The pool does not vacuum, does not checkpoint, and does not freeze. Those are still the primary's auxiliary processes. The pool also does not make a slow query faster. It makes the number of queries that can run at once a deliberate limit. Queries beyond that limit wait in the pool instead of becoming backends. Waiting in the pool is the point. It is backpressure.

An application-side pool inside one process has the same shape at a smaller scale: that process should not open 100 backends to serve 10 concurrent requests. The external pool matters when there are many processes. One pool, shared, is the architecture. A pool inside each of a thousand processes recreates the multiplication.

**Practical Implementation:**

```sql
SELECT count(*) FILTER (WHERE backend_type = 'client backend') AS client_backends,
       count(*) FILTER (WHERE state = 'active') AS active,
       count(*) FILTER (WHERE state = 'idle') AS idle,
       count(*) FILTER (WHERE state = 'idle in transaction') AS idle_in_xact
FROM pg_stat_activity;
```

If this number is close to `max_connections` and `active` is a small fraction of it, the backends are mostly idle sessions, and a transaction-lifetime pool is what would let those clients exist without that many backends. `idle in transaction` rows are the ones that may hold a xid or a snapshot. The pool does not remove that hold if the application keeps the transaction open while it thinks. It only returns the backend when the transaction ends.

**Trade-offs and Alternatives:**

A larger `max_connections` is the alternative when the clients truly need session state and truly run concurrently, and the host has the RAM. It raises the lock-table size and the worst case of `work_mem` multiplied by concurrent operations. A transaction-lifetime pool is the alternative when most clients are idle or short. The cost of that pool is that session state does not survive the return of the backend, which the next question makes concrete. A statement-lifetime pool, returning the backend after every statement, breaks multi-statement transactions and is not the architecture to pick.

**Common Mistakes:**

- Setting each application instance's private pool to `max_connections`. The product of instances is the backend count.
- Treating idle backends as free. They hold slots, and an idle-in-transaction writer holds the vacuum horizon.
- Expecting the pool to absorb a long `idle in transaction` without holding a backend. The backend is checked out for the whole transaction, including the idle think time.
- Raising `max_connections` into the thousands so a missing pool "just works." The refusal at 100 was the cheap failure. Thousands of backends is the expensive one.

**Senior-Level Follow-up:**

Fifty application processes each run two concurrent transactions, and each process also keeps ten idle sessions "just in case," with session-lifetime connections. How many client backends is that, and what does transaction-lifetime pooling change?

**Answer:** Session-lifetime connections produce `50 * (2 + 10) = 600` backends if all of those sessions are open, which already exceeds `max_connections` of 100, so most of the idle ones fail to connect. Transaction-lifetime pooling, with a pool of about the true concurrency, needs on the order of `50 * 2 = 100` backends only while every process is actually inside two transactions at once, and fewer when they are not. The idle "just in case" sessions stay as client sockets and do not occupy backends. A pool of 100 is still tight against `max_connections` of 100. The pool is sized under the cap, and the concurrency assumption is the input.

### DB-075 — Transaction pooling drops session state at COMMIT

**Difficulty:** Advanced

**Category:** Connections

**Question:**

What does PgBouncer in transaction pooling guarantee about which backend runs a transaction, and which PostgreSQL features break because of that?

**Context and Constraints:**

PostgreSQL 16 behind PgBouncer. `pool_mode` is being chosen per database. The three modes are session, transaction, and statement. One database user. No replica, no failover, and no claim about a specific PgBouncer release's prepared-statement feature. The backend fact is enough: a server connection is one PostgreSQL session, and in transaction mode it is returned to the pool at `COMMIT` or `ROLLBACK`.

**Senior Engineer's Answer:**

PgBouncer sits in front of PostgreSQL and owns the client sockets. In session mode it assigns one server backend to a client for the whole client connection. `SET`, prepared statements, temporary tables, `LISTEN` / `NOTIFY`, advisory locks, and `WITH HOLD` cursors all see the same backend, because the session never changes. The number of server backends stays close to the number of busy client connections. This mode is a multiplexer only in the sense that PgBouncer is the listener. It does not let many concurrent clients share one backend.

In transaction mode PgBouncer assigns a server backend when a transaction starts and returns it when the transaction ends. The next transaction from the same client can run on a different backend. Anything that lives in the backend's session, rather than in the committed tables, is not part of the contract.

That list is concrete. `SET work_mem = '16MB'` changes the backend that ran the transaction, and the client's next transaction may be a different backend that still has the default. The backend that was returned to the pool still has the changed `work_mem`, so the next borrower of that backend inherits it. Transaction mode does not start a new PostgreSQL session between borrowers. Session state leaks forward to whoever borrows the backend, and it is absent for the original client if they borrow a different one. A temporary table is visible only on the backend that created it. A prepared statement is planned and stored on one backend. `LISTEN` is registered on one backend. An advisory lock taken outside a transaction, or held after commit, is a lock on one backend's session. A cursor declared `WITH HOLD` is a session cursor. None of these follow the client to the next transaction.

`SET` inside a transaction that rolled back is undone with the transaction. `SET` that was applied, and a session-level `SET` that autocommit persisted, remains on that backend. `DISCARD ALL` is what clears a backend between unrelated clients. PgBouncer uses a server reset query when a session-pooled client disconnects. Transaction pooling does not give you a fresh session at each `COMMIT`. Application code in this mode uses the default GUCs, commits before it returns to the client, and keeps locks and advisory locks inside the transaction that borrowed the backend.

Statement mode returns the backend after every statement. Two statements of one transaction can run on different backends, so the second statement cannot see the first statement's uncommitted rows. It is not a mode for real transactions.

A pooled server connection is one user and one database. Clients of two databases do not share a backend. PgBouncer does not parse your schema, does not run autovacuum, and does not change WAL, checkpoints, or freezing. A transaction that stays open while the application waits on a person occupies a pooled backend for the whole wait and holds a xid if it has written. The pool cannot return what the client has not released.

**Practical Implementation:**

```sql
BEGIN;
CREATE TEMP TABLE scratch (id integer) ON COMMIT PRESERVE ROWS;
INSERT INTO scratch (id) VALUES (1);
SET work_mem = '16MB';
COMMIT;

SELECT current_setting('work_mem') AS work_mem_now,
       to_regclass('pg_temp.scratch') IS NOT NULL AS scratch_visible;
```

Run through a transaction-mode pool, as two separate client transactions: the block above, then the `SELECT` alone. `scratch_visible` is false when the second transaction borrowed another backend, and it can be true when it happened to borrow the same one. `work_mem_now` is `16MB` only on a backend where that `SET` has run and has not been discarded. Session mode, on one client connection, returns `16MB` and `scratch_visible` true, because both statements used the same backend. That difference is the mode.

**Trade-offs and Alternatives:**

Transaction mode is the mode that makes a few hundred backends serve thousands of short client transactions. The application gives up session state. Features that need it, such as `LISTEN` or a temporary table used as a scratchpad across transactions, belong on a session-mode pool, or on a direct connection, sized as if there were no multiplexing. Mixing them on a transaction-mode database is how a feature works in a test that got lucky with the same backend and fails when the pool has more than one. Statement mode is the alternative to reject for anything that uses a multi-statement transaction.

**Common Mistakes:**

- Using transaction mode and then `SET search_path` in application startup, expecting every later transaction to see it. The `SET` stuck to one backend, or leaked onto another client.
- Creating a temporary table "for this request" and reading it from a second transaction on the same pooled client. The second transaction is a new checkout.
- Holding an advisory lock across `COMMIT` and expecting it to exclude other transactions from the same client. After commit the next checkout is not the session that took the lock, and the lock is still held on the old backend.
- Raising PgBouncer's pool to `max_connections` and also letting administrators connect directly. The pool consumes the slots the reserve was meant to keep.

**Senior-Level Follow-up:**

A client in transaction mode runs `LISTEN ticket_changed` and commits. Another session commits an insert that executes `NOTIFY ticket_changed`. Why does this client not receive it?

**Answer:** `LISTEN` was registered on the backend that ran that transaction. At `COMMIT`, transaction mode returned that backend to the pool. The client's later borrow is another backend that has not executed `LISTEN`, or the same backend after some other borrower, and PgBouncer is not holding the notification channel open for the client. `NOTIFY` delivers to sessions that are currently listening. This client's listening session ended at commit. Session-mode pooling, or a direct connection, keeps the backend that executed `LISTEN` for the life of the client connection, which is the setup `LISTEN` requires.

### DB-076 — A wide attribute is stored beside the heap, in a TOAST table

**Difficulty:** Intermediate

**Category:** TOAST

**Question:**

Where does PostgreSQL put a value that does not fit in the heap tuple, and what does a query pay to read it back?

**Context and Constraints:**

PostgreSQL 16. Default block size 8 kB. The table below is hypothetical. No index discussion: the only fact needed is that the heap tuple cannot span pages.

```sql
CREATE TABLE document (
  id integer PRIMARY KEY,
  title text NOT NULL,
  body text NOT NULL
);
```

`body` is wide enough that the heap row would be larger than the toast threshold. `title` is short.

**Senior Engineer's Answer:**

A heap tuple has to fit on one 8 kB page. PostgreSQL does not split a tuple across pages. When a row to be stored is wider than the toast threshold, normally about 2 kB so that four tuples can sit on a default page, TOAST compresses and, if needed, moves variable-length attributes out of the main tuple. The default target length, `toast_tuple_target`, is 2040 bytes on an 8 kB block. The management code stops once the on-page row is under that target, or once nothing left can be moved.

The out-of-line bytes go to a toast table associated with `document`. Its OID is `pg_class.reltoastrelid`. The toast table has `chunk_id`, `chunk_seq`, and `chunk_data`, and a unique index on `(chunk_id, chunk_seq)`. Each chunk is at most about 2000 bytes, the size that lets four chunk rows fit on a page. The heap tuple keeps an 18-byte toast pointer: which toast table, which `chunk_id`, the uncompressed logical size, the stored size, and the compression method. `title` and `id` stay in the heap tuple.

A table with a toastable column such as `text` gets that toast relation at `CREATE TABLE`, before any wide row exists. A table of only fixed-length integers does not.

Reading `title` does not fetch `body`. The executor detoasts `body` when the value is actually required: selected, compared, or passed to a function. An `UPDATE` that changes `title` and leaves `body` alone keeps the existing toast pointer. Unchanged out-of-line values are not rewritten.

**Practical Implementation:**

```sql
SELECT c.reltoastrelid::regclass AS toast_relation
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = 'document';
```

```sql
SELECT attname, attstorage
FROM pg_attribute
WHERE attrelid = 'document'::regclass
  AND attnum > 0
  AND NOT attisdropped
ORDER BY attnum;
```

`attstorage` is `p` for the integer, and `x` (`extended`) for `title` and `body`, which is the default for `text`. `pg_total_relation_size('document')` includes the toast table. `pg_relation_size('document')` is only the main heap fork, so a table whose bytes are mostly in `body` looks small in the second number and large in the first.

**Trade-offs and Alternatives:**

Out-of-line storage keeps the main heap dense, so more live rows fit in `shared_buffers`, and a query that does not touch `body` does not read those chunks. The cost shows up on the query that does touch `body`: random reads of the toast table, and decompression when the value was compressed. Putting a value you always filter on into a toasted column moves that cost onto the common path. Leaving a large document out of the `SELECT` list is the way to avoid the fetch.

**Common Mistakes:**

- Expecting one heap tuple to continue onto the next page. It will not. The value is chunked into the toast table, or the insert fails if the type cannot be toasted.
- Judging table size with `pg_relation_size` alone. The body may live in the toast relation.
- Assuming every `SELECT *` is as cheap as `SELECT id, title`. The star list detoasts `body`.
- Rewriting `body` in an `UPDATE` that only needed to change `title`. That copies the toast value. Leaving it out of the `SET` list keeps the pointer.

**Senior-Level Follow-up:**

`SELECT count(*) FROM document` and `SELECT count(body) FROM document` both count the same non-null rows. Which one reads the toast table?

**Answer:** `count(*)` does not. It counts heap rows and never detoasts `body`. `count(body)` has to know whether `body` is null. A null is stored in the heap tuple's null bitmap, so a non-null toasted value can be counted from the pointer without reading the chunks. Fetching the characters, as `length(body)` or a client `SELECT body` does, reads and reassembles the toast value.

### DB-077 — The storage strategy chooses compression and whether the value may leave the page

**Difficulty:** Senior

**Category:** TOAST

**Question:**

What do `PLAIN`, `MAIN`, `EXTERNAL`, and `EXTENDED` change, and when is `EXTERNAL` the right choice for a wide `text` column?

**Context and Constraints:**

PostgreSQL 16. Hypothetical `document` table from the toast-pointer question. `default_toast_compression` is the default `pglz`. The column option is set before the wide rows are loaded. Strategies do not rewrite rows already stored.

**Senior Engineer's Answer:**

Each toastable column has a storage strategy. It decides whether PostgreSQL may compress the value and whether it may move the value out of line. The strategy is per column, stored for future writes. `ALTER TABLE ... ALTER COLUMN ... SET STORAGE` does not recompress existing rows.

`PLAIN` forbids both compression and out-of-line storage. Fixed-length types such as `integer` are `PLAIN`. They have no toast strategy to choose.

`EXTENDED` allows both. Compression is tried first. If the row is still too wide, the value is moved out of line. This is the default for `text`, `bytea`, and `jsonb`. The compression method for a column set to `MAIN` or `EXTENDED` is the column's `COMPRESSION` option, or `default_toast_compression` at insert time when the column has no explicit method. The default parameter is `pglz`. `lz4` is available only when the server was built with it.

`EXTERNAL` allows out-of-line storage and forbids compression. Substring and similar slice operations on an uncompressed out-of-line `text` or `bytea` can fetch only the chunks they need. A compressed value has to be detoasted whole before a slice can be taken. `EXTERNAL` spends disk space to keep that slice path.

`MAIN` allows compression and prefers to keep the value in the heap tuple. Out-of-line storage still happens if that is the only way to make the row fit on a page. `MAIN` is a preference, and the page-size rule wins.

The trigger is the row, not a single column's reputation as "large." A row of several medium `text` columns can toast the widest ones once the combined tuple crosses the threshold. A short value stays inline even on an `EXTENDED` column.

**Practical Implementation:**

```sql
ALTER TABLE document ALTER COLUMN body SET STORAGE EXTERNAL;

SELECT attname, attstorage, attcompression
FROM pg_attribute
WHERE attrelid = 'document'::regclass
  AND attname = 'body';
```

`attstorage` becomes `e`. Rows inserted after the change follow `EXTERNAL`. Rows already stored as compressed `EXTENDED` values stay as they are until rewritten. `SHOW default_toast_compression` reports the method used when a column has no compression of its own.

**Trade-offs and Alternatives:**

`EXTENDED` is the right default for a document that is read whole and is compressible. `EXTERNAL` is the right choice when the workload slices a large uncompressed or already-compressed value and the extra stored bytes are acceptable. `MAIN` fits a column that is usually small enough to keep on the page after compression, with out-of-line as the escape when a rare value is huge. `PLAIN` on a wide varlena column is how you discover the page-size limit: the insert fails when the tuple does not fit, because the strategy refused the escape hatch.

**Common Mistakes:**

- Changing `SET STORAGE` and expecting old rows to shrink or change method. Only a later rewrite of those values stores them the new way.
- Using `EXTERNAL` on a column that is always fetched whole, then being surprised the table got larger. You gave up compression on purpose.
- Treating `MAIN` as a guarantee the value stays in the heap. A row that cannot fit is still moved out of line.
- Setting compression on a column whose strategy is `EXTERNAL` or `PLAIN` and expecting it to apply. Compression is used for `MAIN` and `EXTENDED`.

**Senior-Level Follow-up:**

`body` is `EXTERNAL` and out of line. A query runs `substring(body from 1 for 80)`. What does that avoid, compared with the same call on a compressed `EXTENDED` value?

**Answer:** It can read the toast chunks that hold the first 80 characters and stop. The compressed form does not support that slice. PostgreSQL detoasts and decompresses the whole value, then takes the substring. `EXTERNAL` is that trade: more bytes on disk, less work for a slice.

### DB-078 — Hint bits cache commit status on the tuple

**Difficulty:** Senior

**Category:** MVCC

**Question:**

What do hint bits record, why can a `SELECT` dirty a heap page, and when is that write WAL-logged?

**Context and Constraints:**

PostgreSQL 16 defaults: `wal_log_hints` off, `data_checksums` off, `full_page_writes` on. One committed `INSERT` into hypothetical `ticket`. No second writer. The question is the tuple header, not freeze.

**Senior Engineer's Answer:**

`xmin` and `xmax` name transactions. They do not, by themselves, say whether those transactions committed. That status lives in the commit log, `pg_xact`. Looking it up on every row of every scan is expensive, so the tuple header caches the answer in hint bits: inserting transaction known committed, inserting transaction known aborted, deleting transaction known committed, deleting transaction known aborted.

The bits are not set at `COMMIT`. The committing backend would have to revisit every page it touched. The next reader that needs the status consults `pg_xact`, then ORs the matching hint into the tuple. That includes `SELECT`. Setting the bit dirties the shared buffer. A later checkpoint or eviction can write the page out. The data did not change. The cache of a commit decision did.

With `wal_log_hints` off and checksums off, a hint-only change is not WAL-logged and does not move the page LSN. A crash can drop the bits. That is safe. They are a cache. The next reader looks in `pg_xact` again and sets them again. Freeze is a different write. It is WAL-logged and it is not this cache.

If `data_checksums` is on, hint updates are WAL-logged and `wal_log_hints` is ignored. If `wal_log_hints` is on and checksums are off, the first hint update of a page after a checkpoint logs a full page image. Both exist so a torn write of a hint cannot leave a page that a checksum would reject, or a page that recovery cannot rebuild. This cluster has neither switch on, so the `SELECT` can still dirty the buffer and still writes no WAL for that dirtying.

**Practical Implementation:**

```sql
SHOW wal_log_hints;
SHOW data_checksums;
```

Both are off on the cluster in the question. After the insert commits, the first scan of the new row is what sets the committed hint. `pg_stat_database.tup_returned` moving is not proof of a dirty buffer. The mechanism is the hint update. A page inspect with `pageinspect` would show `HEAP_XMIN_COMMITTED` after that scan and not before. That extension is optional; the catalog switches above are what decide whether the hint write is logged.

**Trade-offs and Alternatives:**

Leaving the defaults avoids logging a full page every time a freshly loaded table is read after a checkpoint. The cost is a one-time dirtying of those pages, which the checkpointer writes later. Turning `wal_log_hints` on makes that first read produce WAL, which is the right setting when you want checksum-like torn-page protection without having initialized checksums. It does not change query results.

**Common Mistakes:**

- Saying a read-only transaction never writes. It never assigns a new tuple version. It can still dirty a page by setting hint bits.
- Treating a lost hint bit as lost data. The commit is in `pg_xact` and in WAL. The bit is rebuilt.
- Turning on `wal_log_hints` and expecting it to matter on a cluster that already has checksums. Checksums already force hint-bit WAL, and the parameter is ignored.
- Confusing these four bits with freezing. Freeze is durable and logged. A commit hint is a cache.

**Senior-Level Follow-up:**

The inserting transaction has committed, the hint is not set, and the page is still clean. A `SELECT` sets the hint and the host crashes before any write of that page. What does the next startup return for the row?

**Answer:** The row is visible. The commit record was already durable, and `pg_xact` is updated from WAL during recovery if it needs to be. The hint bit was only a cache on a page that never reached disk. The first reader after startup consults `pg_xact` and sets the bit again.

### DB-079 — pg_xact stores two bits of status for each transaction id

**Difficulty:** Senior

**Category:** MVCC

**Question:**

What does the commit log record, when is it updated relative to the commit WAL record, and when can old segments be removed?

**Context and Constraints:**

PostgreSQL 16. `synchronous_commit` and `fsync` are on. One primary. The directory name on disk is `pg_xact`. Do not describe SLRU page layout past the two-bit status.

**Senior Engineer's Answer:**

The commit log holds the status of each transaction id, two bits per xid. The four values are in progress, committed, aborted, and subcommitted. Subcommitted is the intermediate state of a subtransaction that has committed inside a parent that is not finished yet. A reader that sees subcommitted follows `pg_subtrans` to the parent and uses the parent's status.

`COMMIT` writes a commit record to WAL and flushes it before it returns, because `synchronous_commit` is on. The commit log is marked committed as part of finishing that commit. WAL is the authority. If the process crashes after the commit record is durable and before the commit-log bit is durable, recovery replays the commit record and sets the bit. A transaction with no commit record is aborted. Hint bits on tuples are a cache of this map, not a second source of truth.

Frozen tuples do not consult the commit log for their inserting xid. Once every database's `datfrozenxid` has moved past an old range of xids, nothing unfrozen still needs those bits. The checkpointer can then truncate the old `pg_xact` segments. A long-running snapshot, a prepared transaction, or a replication slot that holds back the freeze horizon also holds back that truncation. The files are small compared with heap, and they are not optional while the xids they describe can still be asked about.

`pg_xact` is cluster-wide. Transaction ids are cluster-wide. One database's commit is recorded in the same map the other databases consult.

**Practical Implementation:**

```sql
SELECT datname, age(datfrozenxid) AS xid_age
FROM pg_database
ORDER BY age(datfrozenxid) DESC;
```

The oldest `datfrozenxid` is the database that still needs the oldest commit-log entries. There is no supported SQL interface that prints one xid's two bits. The on-disk files live in `pg_xact` under the data directory. Their presence is the map. Their growth, past what freeze should have released, means the horizon is stuck. The view above shows which database's age is the reason, and the session and replication-slot checks from the horizon question show what is holding it.

**Trade-offs and Alternatives:**

The map is tiny because two bits is enough for status. Row versions, snapshots, and locks stay elsewhere. Replacing it with a status column on every tuple would make `COMMIT` rewrite every page the transaction touched. The design moves that rewrite to the first reader, as a hint bit, and keeps the durable status in one place recovery can update from the commit record.

**Common Mistakes:**

- Calling the heap tuple the source of truth for whether a transaction committed. The tuple stores the xid. `pg_xact` stores the status. Hint bits remember a status already learned.
- Expecting `COMMIT` to have finished in the commit log before the WAL flush. The flush of the commit record is the durable point. Recovery repairs the bit from that record.
- Deleting files under `pg_xact` to free space. Those bits are how unfrozen tuples stay visible. Truncation is the checkpointer's job after freeze.
- Treating subcommitted as aborted or as fully committed. It means the subtransaction committed and the parent is still the transaction that counts.

**Senior-Level Follow-up:**

Recovery finds a commit record for xid 5000 and the commit-log bits for 5000 still say in progress. What does recovery do, and what would a hint bit on a heap tuple have changed?

**Answer:** Recovery sets xid 5000 to committed in `pg_xact`. The commit record is the authority. A hint bit on a tuple is not required for that repair, and a missing hint bit does not keep the transaction aborted. The next reader can cache the new status on the tuple.

### DB-080 — A second locker turns xmax into a multixact id

**Difficulty:** Senior

**Category:** Locks

**Question:**

When does a row's `xmax` stop being a single transaction id, and what does that id point at?

**Context and Constraints:**

PostgreSQL 16. Hypothetical `ticket` with a primary key on `id`. Two sessions. Session A runs a foreign-key check that takes `FOR KEY SHARE` on one parent row. Session B updates a non-key column of that same row. Neither commits yet. Do not expand this into an isolation-anomaly example. The question is what is stored on the tuple.

**Senior Engineer's Answer:**

A tuple header has room for one `xmax`. A single locker stores its transaction id there, plus infomask bits for the lock strength. `SELECT FOR UPDATE`, `SELECT FOR NO KEY UPDATE`, `SELECT FOR SHARE`, and `SELECT FOR KEY SHARE` are the four strengths. An `UPDATE` that does not change key columns takes `FOR NO KEY UPDATE`. An `UPDATE` that changes a key, and a `DELETE`, take `FOR UPDATE`. A foreign-key check takes `FOR KEY SHARE` so the referenced row cannot disappear or have its key changed while the check runs.

`FOR KEY SHARE` is compatible with `FOR NO KEY UPDATE`. Session B's non-key update is allowed while session A holds the key-share lock. One `xmax` cannot name both transactions, so PostgreSQL allocates a multixact id, stores that id in `xmax`, and sets the hint that `xmax` is a multixact. The multixact's members, each xid and its lock strength, are stored under `pg_multixact`. A later compatible locker joins the same structure. A conflicting locker waits.

A multixact is not "several share locks" only. A member can be a locker or the transaction that updated or deleted the row. Current lockers of one tuple are one multixact, including the case where one of them is the updater.

The id space is separate from transaction ids. `pg_class.relminmxid` is the oldest multixact id that table still needs, the same role `relfrozenxid` plays for transaction ids. Vacuum has to advance it. The wraparound ages for that space are the wraparound question. What matters here is that a workload of foreign keys plus non-key updates creates multixacts as ordinary locking, and those ids have to be frozen too.

Row locks live on the tuple, so the number of locked rows is not capped by the shared lock table. Waiting for a lock does take a lock-manager entry so the waiter can sleep. The granted mode stays on the tuple.

**Practical Implementation:**

```sql
SELECT relname, relminmxid, mxid_age(relminmxid) AS mxid_age
FROM pg_class
WHERE oid = 'ticket'::regclass;
```

A rising `mxid_age` on a table that is updated under foreign keys is the multixact footprint. `pg_locks` shows a waiter blocked on the holder's transaction or multixact. It does not list every granted row lock, because those are on the tuples. The `pgrowlocks` extension reads them from the page when you need the members of one row.

**Trade-offs and Alternatives:**

Storing the lock on the tuple means a `SELECT FOR UPDATE` dirties the page and writes WAL. That is the cost of an unlimited number of row locks. Putting every row lock in shared memory would cap out at `max_locks_per_transaction` and is not the design. Shortening the transaction that holds `FOR KEY SHARE` is how you keep the multixact from being created in the first place: the foreign-key check and the other session's update then fail to overlap.

**Common Mistakes:**

- Reading `xmax` as "the transaction that deleted this row" whenever it is nonzero. During a lock it is a locker, or a multixact of lockers, and the tuple is still live.
- Treating a multixact as corruption because `xmax` does not appear in `pg_stat_activity` as a `backend_xid`. Multixact ids are a different counter. The member xids are the backends.
- Assuming two lockers always block. Key-share and non-key update are compatible and share a multixact. Key-share and a key update conflict, and the second session waits.
- Vacuuming xids and ignoring `relminmxid`. A table can be young in `age(relfrozenxid)` and old in `mxid_age`.

**Senior-Level Follow-up:**

Session A holds `FOR KEY SHARE`. Session B updates the primary-key column of that row. Does B join the multixact, or does B wait?

**Answer:** B waits. Changing the key takes `FOR UPDATE`, which conflicts with `FOR KEY SHARE`. B does not become a second member. When A commits or rolls back, the key-share lock is gone and B can take its own lock. The multixact was the compatible case, the non-key update, not this one.

### DB-081 — relfrozenxid advances only when every older page is accounted for

**Difficulty:** Advanced

**Category:** Freeze and wraparound

**Question:**

What does `pg_class.relfrozenxid` mean, and how can `VACUUM` finish, remove dead tuples, and leave `age(relfrozenxid)` unchanged?

**Context and Constraints:**

PostgreSQL 16 defaults: `vacuum_freeze_min_age` 50 million, `vacuum_freeze_table_age` 150 million, `autovacuum_freeze_max_age` 200 million. Hypothetical `ticket` has `age(relfrozenxid)` of 80 million. That age is an assumed catalog value for this question, not a measurement from a production incident. Ordinary `VACUUM ticket`, not `VACUUM (FREEZE)`. No session is holding back the horizon.

**Senior Engineer's Answer:**

`relfrozenxid` is the oldest transaction id that may still appear unfrozen in that relation. `age(relfrozenxid)` is how far the cluster's current xid counter has moved past it. It is not a timestamp, and it is not the time of the last vacuum. `pg_database.datfrozenxid` is the oldest `relfrozenxid` among relations in that database, catalogs included. The database is only as frozen as that oldest relation.

Vacuum may set a new `relfrozenxid` only after it has considered every page that could still hold an older unfrozen xid. Pages marked all-frozen are known to contain none, so they can be skipped. A normal vacuum is allowed to skip all-visible pages while it hunts dead tuples. An all-visible page is not necessarily all-frozen. If vacuum skips one, it must keep the old `relfrozenxid`, because the skipped page might hold the oldest unfrozen xid. Dead tuples on the pages it did visit can still be removed. Those are different results of the same command. The file gets reusable space. The freeze horizon of the relation does not move.

The scan that does not skip those pages is the aggressive one. It runs when `age(relfrozenxid)` exceeds `vacuum_freeze_table_age` (150 million), when you run `VACUUM (FREEZE)`, or when anti-wraparound vacuum is in progress. Eighty million is under 150 million, so the ordinary vacuum in this question is not required to be aggressive. After an aggressive scan, `age(relfrozenxid)` lands a little above `vacuum_freeze_min_age`, not at zero, because tuples younger than 50 million were left unfrozen on purpose.

A horizon pin changes the outcome even of an aggressive scan. Vacuum cannot freeze a tuple a still-registered snapshot might need, and it cannot move `relfrozenxid` past that snapshot. This question's cluster has no such pin. The reason the age stays at 80 million is the skipped pages.

**Practical Implementation:**

```sql
SELECT c.relname,
       c.relfrozenxid,
       age(c.relfrozenxid) AS xid_age,
       c.relallvisible,
       c.relpages
FROM pg_class c
WHERE c.oid = 'ticket'::regclass;
```

If `xid_age` is unchanged after `VACUUM ticket` and it is still below 150 million, the vacuum was not an aggressive freeze. `VACUUM (FREEZE) ticket` forces the scan that can move `relfrozenxid`. `VACUUM (VERBOSE)` reports how many pages were frozen and whether the scan was aggressive. Compare `xid_age` before and after that command, still with no old snapshot open.

**Trade-offs and Alternatives:**

Ordinary autovacuum is allowed to clean dead tuples without paying for a full freeze scan on every pass. That keeps vacuum cheaper on a table that is nowhere near 150 million. The debt is a later aggressive scan. On a table that grows only by insert, the insert-triggered autovacuum is what sets all-frozen as it goes, so the later scan has pages it may skip. Forcing `VACUUM (FREEZE)` on a hot table dirties every page that still has an unfrozen tuple old enough to freeze, and writes WAL for those hint updates. It is the right tool before a long window where autovacuum will not keep up. It is a poor cron job.

**Common Mistakes:**

- Reading a successful `VACUUM` as "this table is frozen." Success means the dead tuples it was allowed to remove are gone. `relfrozenxid` moves only when the scan was complete enough.
- Treating `relfrozenxid` as wall-clock age. `age()` counts transactions, not seconds.
- Vacuuming the application table and declaring the database young. `datfrozenxid` follows the oldest relation, including catalogs.
- Running `VACUUM FULL` to move `relfrozenxid`. Ordinary aggressive vacuum advances it. The rewrite takes `ACCESS EXCLUSIVE` and still cannot freeze past a snapshot.

**Senior-Level Follow-up:**

`age(relfrozenxid)` is 80 million before and after `VACUUM ticket`. Dead-tuple count dropped. Is wraparound any closer than it was?

**Answer:** No. Wraparound distance is that age, and it did not move. The vacuum did the dead-tuple job and skipped pages it was allowed to skip, so it kept the previous `relfrozenxid`. The age starts to matter at the 150 million aggressive scan and the 200 million anti-wraparound launch. Eighty million is the same distance from those lines as it was before the command.

### DB-082 — An idle transaction blocks vacuum while a snapshot or an xid is still registered

**Difficulty:** Senior

**Category:** Vacuum

**Question:**

Which `idle in transaction` session holds vacuum's horizon, and which one does not?

**Context and Constraints:**

PostgreSQL 16. Read Committed is the default. Two hypothetical sessions are idle inside an open transaction. Neither is running a statement. No prepared transactions, no replication slots.

Session A:

```sql
BEGIN ISOLATION LEVEL REPEATABLE READ;
SELECT count(*) FROM ticket;
-- session is now idle in transaction
```

Session B:

```sql
BEGIN;
SELECT count(*) FROM ticket;
-- session is now idle in transaction
```

Session B never wrote. A third session, if mentioned, has run an `UPDATE` and is idle in that same Read Committed transaction.

**Senior Engineer's Answer:**

The state string `idle in transaction` means the backend is inside a transaction and is waiting for the next command. It does not, by itself, mean a snapshot is registered. Vacuum's horizon moves from registered snapshots and from transaction ids that are still in progress. `pg_stat_activity.backend_xmin` is the snapshot. `backend_xid` is the assigned transaction id.

Session A took one snapshot at its first statement and keeps it until commit or rollback. Repeatable Read works that way, and Serializable does too. While A is idle, `backend_xmin` stays set. Vacuum cannot remove a tuple that snapshot can still see, and it cannot freeze past that xmin. The `SELECT` has finished. The snapshot has not.

Session B is Read Committed. That level takes a snapshot per statement and releases it at the end of the statement. B never wrote, so it never assigned a transaction id. Idle, both `backend_xmin` and `backend_xid` are null. B does not hold the vacuum horizon. If B had taken row locks, it would still hold those locks until the transaction ends. Locks and the horizon are separate.

A Read Committed session that has inserted, updated, deleted, or run `SELECT FOR UPDATE` has a `backend_xid` until it ends. That xid holds the horizon between statements, even with no `backend_xmin`. The third session in the constraints is that case.

What you kill, or commit, is the session whose `backend_xmin` or `backend_xid` is old. Killing every idle-in-transaction session also clears lock holders, which can be what you want for a blocked `ALTER TABLE`. It is more than the vacuum horizon requires.

**Practical Implementation:**

```sql
SELECT pid,
       state,
       backend_xid,
       backend_xmin,
       now() - xact_start AS xact_age,
       now() - state_change AS idle_for,
       left(query, 80) AS last_query
FROM pg_stat_activity
WHERE state LIKE 'idle in transaction%'
ORDER BY xact_start;
```

Session A appears with a non-null `backend_xmin`. Session B appears with both xid columns null. The `query` column is the last statement, the `SELECT`, which is not running. `state` is what says it is finished. `xact_age` is how long the transaction has been open. `idle_for` is how long it has been sitting.

**Trade-offs and Alternatives:**

Commit before the application waits on a person or a remote call. That is the fix for both sessions. Repeatable Read is the right isolation level when the transaction really needs one snapshot across several statements, and those statements should then be short. Holding Read Committed open across the same think time is cheaper for vacuum only when the transaction has not written and has not taken locks you care about. `idle_in_transaction_session_timeout` is the server-side backstop for the sit. It is a later question. It does not change which of these two sessions is the horizon.

**Common Mistakes:**

- Cancelling every `idle in transaction` row to help vacuum, including Read Committed sessions with a null `backend_xmin` and a null `backend_xid`. Those are not the horizon.
- Leaving a Repeatable Read report idle and blaming autovacuum for the dead tuples. The report's `backend_xmin` is the horizon.
- Reading the `query` text as a statement that is still executing. `state` says the backend is idle inside the transaction. The text is the last query.
- Equating "holds locks" with "holds `backend_xmin`." Session B can block `VACUUM`'s lock and still not pin the xid horizon.

**Senior-Level Follow-up:**

Session B, still Read Committed and idle, had run `UPDATE ticket SET note = 'x' WHERE id = 1` instead of `SELECT`. Does it hold the horizon?

**Answer:** Yes. The update assigned a transaction id. `backend_xid` stays set until commit or rollback, including while the session is idle between statements. Vacuum cannot treat that xid as finished. `backend_xmin` may still be null, because the statement snapshot was released. The xid is enough.

### DB-083 — xact_start, query_start, and state_change measure different intervals

**Difficulty:** Intermediate

**Category:** Processes

**Question:**

On one `pg_stat_activity` row, what do `xact_start`, `query_start`, `state_change`, and `state` each mean?

**Context and Constraints:**

PostgreSQL 16. `track_activities` is on. `track_activity_query_size` is the default 1024. Hypothetical client backend, not an autovacuum worker. The row is a snapshot of the view, not a history.

**Senior Engineer's Answer:**

`state` is what the backend is doing now. `active` means it is executing a query. `idle` means it is waiting for a new client command and is not inside a transaction. `idle in transaction` means it is inside a transaction and is not executing a query. `idle in transaction (aborted)` means a statement in that transaction failed, the transaction is still open, and the client has not issued `ROLLBACK` yet. The failed transaction holds its locks and, if it had assigned one, its transaction id, until rollback.

`xact_start` is when the current transaction started. It is null when no transaction is active, so a normal `idle` row has a null `xact_start`. If the current query is the first statement of its transaction, `xact_start` equals `query_start`.

`query_start` is when the current query started if `state` is `active`. In every other state it is when the last query started. It does not move forward when that query finishes. An idle session keeps the `query_start` of the statement that already ended.

`state_change` is when `state` last changed. For `idle` or `idle in transaction`, `now() - state_change` is how long the backend has been in that state. `now() - xact_start` is how long the transaction has been open, which includes the statements and the idle time after them. `now() - query_start` on an idle row is how long ago the last statement started, not how long it ran, and not how long the session has been idle.

`query` follows the same rule as `query_start`. It is the current statement when `active`, and the last statement otherwise, truncated at `track_activity_query_size` (1024 bytes). A truncated predicate is not a full statement. `backend_xid` and `backend_xmin` are the horizon columns. They are not clocks.

**Practical Implementation:**

```sql
SELECT pid,
       state,
       xact_start,
       query_start,
       state_change,
       now() - xact_start AS xact_age,
       now() - state_change AS in_state_for,
       backend_xid,
       backend_xmin,
       left(query, 120) AS query
FROM pg_stat_activity
WHERE backend_type = 'client backend'
  AND pid <> pg_backend_pid()
ORDER BY xact_start NULLS LAST;
```

Exclude your own backend if you are looking for application sessions. A row with `state = 'active'` and an old `query_start` is a statement that is still running. A row with `state = 'idle in transaction'` and an old `xact_start` is an open transaction whose last statement is the `query` text. Use `state_change` for how long it has been sitting.

**Trade-offs and Alternatives:**

The view is a sample. A statement that starts and finishes between two samples never appears. `log_min_duration_statement` is the record of those. Sampling `pg_stat_activity` is still the way to see who is holding a transaction open right now, because a finished transaction has a null `xact_start` and will not be on the idle-in-transaction list. Raising `track_activity_query_size` keeps more of the statement text and costs shared memory. It does not create history.

**Common Mistakes:**

- Sorting idle sessions by `query_start` and calling that "time spent in the query." The query is over. `state_change` is the idle clock. `xact_start` is the transaction clock.
- Treating a null `xact_start` on an `active` row as a bug. A single-statement implicit transaction can show them equal, and a session that is `active` in an early instant can still be the first statement. A null `xact_start` with `state = 'idle'` is the normal pooled connection.
- Reading `idle in transaction (aborted)` as "PostgreSQL already rolled back." The session is waiting for `ROLLBACK`. Locks are still held.
- Using `query` from an idle row as the statement to `pg_cancel_backend`. There is nothing executing. The handle that releases the transaction is `pg_terminate_backend`, or a cancel only if `state` is `active`.

**Senior-Level Follow-up:**

`state` is `idle`, `xact_start` is null, `query_start` is forty minutes ago, and `state_change` is thirty minutes ago. What has that backend been doing for those thirty minutes?

**Answer:** Waiting for the client. The last statement started forty minutes ago and is not running. The session left the transaction and became `idle` thirty minutes ago. It holds no `xact_start`, so it is not pinning vacuum's horizon. The age to act on, if the pool is full of these, is `state_change`, and the tool is pool sizing or `idle_session_timeout`, not vacuum.

### DB-084 — A long transaction limits what VACUUM is allowed to remove and freeze

**Difficulty:** Advanced

**Category:** Vacuum

**Question:**

A transaction has been open for a long time. What does `VACUUM` still do, and what is it not allowed to do until that transaction ends?

**Context and Constraints:**

PostgreSQL 16. Hypothetical session:

```sql
BEGIN ISOLATION LEVEL REPEATABLE READ;
SELECT min(id) FROM ticket;
-- remains idle in transaction; xact_start is old; backend_xmin is set
```

Other sessions have since committed deletes on `ticket` and on other tables. Autovacuum is on. No replication slot is part of this question. The long session has not called `VACUUM`.

**Senior Engineer's Answer:**

Vacuum runs. It does not wait for the long transaction to finish, and it does not error because a snapshot exists. It is not allowed to remove a dead tuple that this snapshot could still see, and it is not allowed to freeze tuples in a way that would move `relfrozenxid` past the snapshot's xmin. `backend_xmin` is that cutoff.

Deletes that committed before the snapshot was taken are already dead to it. Vacuum may remove those versions, update the free space map for the space they occupied, and clean the index entries that pointed at them. Deletes that committed after the snapshot was taken stay in the heap, and their index entries stay, until the snapshot is gone. The table keeps growing with new dead tuples on top of that retained set. That is bloat caused by the horizon, not by autovacuum being turned off.

Freeze uses the same cutoff. An aggressive vacuum still cannot mark a tuple frozen if this snapshot is too old to allow it, so `age(relfrozenxid)` stays high on relations in this database that the old xmin protects. Ordinary tables in this database share that horizon. Vacuum of another table here does not get a newer cutoff because the long statement happened to name `ticket`. User tables in a different database do not. Their dead-tuple horizon is computed from backends connected to that database. Shared catalogs are the exception: backends in every database count toward the horizon for those. A database that cannot advance `datfrozenxid` still holds the cluster's oldest xid, which is what clog truncation and the wraparound stop look at.

`VACUUM FULL` does not bypass the cutoff. It still cannot throw away a version this snapshot can see, and it takes `ACCESS EXCLUSIVE` while it copies the rest. Ending the transaction is what moves the horizon: `COMMIT` or `ROLLBACK` releases the snapshot. The tuples are still on disk. The next vacuum is the one that can remove them and can freeze past the old xmin. Killing the backend rolls the transaction back and has the same effect on the horizon. It does not itself rewrite the table.

A Read Committed writer that is idle with a `backend_xid` and a null `backend_xmin` is a horizon too. The pin is the in-progress xid. The Repeatable Read session here is the snapshot form. Either pin is enough.

**Practical Implementation:**

```sql
SELECT pid,
       datname,
       state,
       now() - xact_start AS xact_age,
       backend_xmin,
       age(backend_xmin) AS xmin_age,
       left(query, 80) AS last_query
FROM pg_stat_activity
WHERE backend_xmin IS NOT NULL
   OR backend_xid IS NOT NULL
ORDER BY xact_start;
```

The oldest `xmin_age` is the cutoff vacuum is using. Then:

```sql
SELECT relname, n_dead_tup, n_live_tup, last_autovacuum
FROM pg_stat_user_tables
WHERE relname = 'ticket';
```

`n_dead_tup` can stay high across `last_autovacuum` when the dead versions are newer than the retained snapshot. That combination, a recent autovacuum and a dead-tuple count that does not fall, is the horizon. It is not evidence that autovacuum skipped the table.

**Trade-offs and Alternatives:**

The snapshot is doing what Repeatable Read asked: later commits stay invisible to it, so vacuum must keep the row versions that implement that promise. The application fix is to close the transaction when the statement finishes. `statement_timeout` bounds a query that is still `active`. It does not fire on this idle session. `idle_in_transaction_session_timeout` does. Raising vacuum cost limits does not remove tuples the horizon protects. A more aggressive freeze setting does not either.

**Common Mistakes:**

- Concluding autovacuum is broken because `n_dead_tup` survived a vacuum. The vacuum ran and was not allowed to remove those versions.
- Running `VACUUM FULL` to get past the snapshot. The rewrite honors the same horizon and blocks readers and writers.
- Thinking only `ticket` is affected because that is the table named in `query`. Other ordinary tables in the same database clean and freeze only up to that same xmin. Another database's user tables are not held by this session. Shared catalogs are.
- Terminating the session and expecting the file to shrink immediately. Termination drops the snapshot. Space comes back on the following vacuum, and only inside the file unless the empty space is a tail the vacuum can truncate.

**Senior-Level Follow-up:**

The long transaction commits. Autovacuum has not run again. Is `n_dead_tup` already gone?

**Answer:** No. Commit made those versions removable. It did not remove them. They leave when a vacuum of `ticket` runs with a horizon that no longer includes the old snapshot. Until that pass, the dead tuples and their index entries still occupy space. `n_dead_tup` drops when the statistics reflect that pass.

### DB-085 — Heap bloat and index bloat are cleaned by different operations

**Difficulty:** Senior

**Category:** Vacuum

**Question:**

What is left behind in the heap after updates and deletes, what is left behind in an index, and which command actually shrinks each file?

**Context and Constraints:**

PostgreSQL 16. Hypothetical `ticket` with a primary key and a secondary index on `status`. The workload is a mix of deletes and updates of `status`. Ordinary `VACUUM` has been running. Do not describe B-tree page layout. The index fact needed here is whether vacuum rebuilds the index file.

**Senior Engineer's Answer:**

Heap bloat is space in the heap file that live tuples do not need. Dead tuple versions stay until vacuum removes them. After vacuum, that space is recorded in the free space map and can be reused by later inserts and updates. The file does not get smaller unless vacuum can cut an empty tail. A heap that was large and is now smaller in live rows keeps its file size. `n_dead_tup` falling means the versions were removed. `pg_relation_size` staying put means the bytes are reusable holes, which is the ordinary outcome.

Index bloat is the index file staying large after the heap has been cleaned. A non-HOT update of `status` adds a new index entry. Vacuum removes index entries that point at dead heap tuples, and later index inserts can reuse space inside the index. Vacuum does not rewrite the index into a packed file. The index can remain much larger than the live keys. A HOT update of an unindexed column does the opposite: the heap grows a tuple version, and the index does not gain an entry. The heap can be the bloated relation while the index is quiet.

The command that returns heap space in the middle of the file to the operating system is a rewrite: `VACUUM FULL`, `CLUSTER`, or a rewriting `ALTER TABLE`. `VACUUM FULL` also rebuilds every index, so both sizes drop in that one exclusive lock. An index-only shrink is `REINDEX`. Plain `REINDEX` blocks writes on the parent table for the rebuild. `REINDEX CONCURRENTLY` does not take a lock that blocks inserts, updates, or deletes for the whole rebuild. It builds a second index, so the disk has to hold both until the swap, and it cannot run inside a transaction block.

Measuring both with one "bloat query" that divides size by `count(*)` hides which of these you have. A high `n_dead_tup` is heap versions vacuum has not removed yet. A low `n_dead_tup` and a large `pg_indexes_size` is an index that vacuum has already cleaned and has not repacked.

**Practical Implementation:**

```sql
SELECT pg_size_pretty(pg_relation_size('ticket')) AS heap,
       pg_size_pretty(pg_indexes_size('ticket')) AS indexes,
       n_live_tup,
       n_dead_tup,
       last_vacuum,
       last_autovacuum
FROM pg_stat_user_tables
WHERE relname = 'ticket';
```

Read the two sizes separately. If `n_dead_tup` is high, the next action is vacuum, after whatever horizon is holding it. If `n_dead_tup` is already low and the index size is the problem, the next action is `REINDEX INDEX CONCURRENTLY` on the large index, not another ordinary vacuum and not a `VACUUM FULL` of the heap.

**Trade-offs and Alternatives:**

Ordinary vacuum is the steady state. It keeps holes reusable and does not block DML. A rewrite is justified when the live data will stay smaller than the file and you can pay the lock, or, for an index, the concurrent rebuild. Rebuilding an index that the workload will immediately fragment again spends the second copy for a temporary dip. Dropping an index you do not need removes its bloat for good. Making the common update HOT, by not indexing the column that changes, keeps the index from collecting those entries.

**Common Mistakes:**

- Running `VACUUM FULL` nightly because both sizes looked large. If the heap holes will be reused, ordinary vacuum was the right tool, and the exclusive rewrite blocks the table to recreate a file the workload fills again.
- Expecting `VACUUM` to shrink `pg_indexes_size` to the live key count. It removes dead entries. A repack is `REINDEX` or `VACUUM FULL`.
- Treating index size and `n_dead_tup` as one number. HOT bloats the heap. A status update bloats the secondary index. They need different fixes.
- Using `REINDEX CONCURRENTLY` without room for the second index. The new index is fully built before the old one is dropped.

**Senior-Level Follow-up:**

`n_dead_tup` is zero, `pg_relation_size('ticket')` is stable across inserts, and one secondary index is many times the heap. Will the next ordinary `VACUUM` shrink that index?

**Answer:** No. Zero dead tuples means vacuum has, or would have, nothing to remove. Inserts reusing heap space explain a stable heap size. The index file stays large until `REINDEX` or `VACUUM FULL` builds a new one. Another ordinary vacuum does not repack it.

### DB-086 — A checkpoint can stall on sync, then the next writes log full page images

**Difficulty:** Advanced

**Category:** WAL

**Question:**

A monitoring chart shows a write stall on a checkpoint cadence, and WAL bytes jump in the minutes after the checkpoint, while the SQL rate stays flat. What are the two mechanisms?

**Context and Constraints:**

PostgreSQL 16 defaults: `checkpoint_timeout` 5 minutes, `max_wal_size` 1 GB, `checkpoint_completion_target` 0.9, `full_page_writes` on, `wal_compression` off. `pg_stat_bgwriter` is the PostgreSQL 16 view for checkpoint counters. There is no `pg_stat_checkpointer` in this version. Do not invent a latency or a byte count. The chart is a shape: a stall at checkpoint, then a WAL rise.

**Senior Engineer's Answer:**

Two different things happen around a checkpoint, and they are not one spike.

During the checkpoint the checkpointer writes dirty shared buffers. `checkpoint_completion_target` of 0.9 spreads that write phase over most of the interval between checkpoints so it is not a single burst. After the writes, the checkpointer syncs the files. `checkpoint_sync_time` in `pg_stat_bgwriter` is the time spent in that sync phase. A large set of dirty files can still stall while the kernel flushes them, even though the buffer writes were spread. That stall is data-file sync. It is not the commit path suddenly writing heap pages. Commits were already waiting on WAL.

A manual `CHECKPOINT` does not spread. It runs promptly, so its write phase and its sync phase are a tighter spike. Checkpoints started because WAL reached `max_wal_size` are counted in `checkpoints_req`. Timed ones are `checkpoints_timed`. A rising `checkpoints_req` means the 5 minute schedule is not the one you are on. The cycle is shorter, the spread has less time, and both spikes repeat more often. `checkpoint_warning` defaults to 30 seconds and logs when checkpoints are closer than that because WAL filled.

The WAL rise after the checkpoint is `full_page_writes`. The first change to each page after the checkpoint logs an image of the whole 8 kB page, so recovery can repair a torn write. Later changes to that page, until the next checkpoint, log only the delta. Flat SQL still produces a jump in `wal_bytes` and `wal_fpi`, because every newly touched page pays the image once per checkpoint interval. The image is the page, not the width of the column that changed.

Turning `full_page_writes` off removes the WAL jump and removes the ability to rebuild a torn page. Checksums would detect the tear. They would not reconstruct it. `wal_compression` compresses the images and spends CPU. It does not change when they are logged.

**Practical Implementation:**

```sql
SELECT checkpoints_timed,
       checkpoints_req,
       checkpoint_write_time,
       checkpoint_sync_time,
       buffers_checkpoint
FROM pg_stat_bgwriter;
```

```sql
SELECT wal_bytes, wal_fpi, stats_reset
FROM pg_stat_wal;
```

Sample `pg_stat_wal` across one checkpoint. `wal_fpi` increasing while the statement rate does not is the full-page-image re-arm. `checkpoint_sync_time` increasing with `checkpoints_timed` or `checkpoints_req` is the sync phase. The two counters move at different moments. Treat them as two measurements.

**Trade-offs and Alternatives:**

A longer `checkpoint_timeout` and a larger `max_wal_size` log full page images less often and spread dirty-buffer writes over a longer interval. Recovery then has more WAL to replay. A shorter timeout does the opposite. Leaving `full_page_writes` on is the correct side of that trade on storage that can tear an 8 kB write. The sync stall is reduced by having less dirty data at once, which is what the spread and a checkpoint that keeps up with WAL are for. It is not reduced by turning fsync off.

**Common Mistakes:**

- Calling the post-checkpoint WAL jump "the checkpoint writing the WAL twice." The checkpoint record is small. The jump is full page images of the pages modified afterward.
- Reading `checkpoints_req` in PostgreSQL 16 from `pg_stat_checkpointer`. That view arrives in PostgreSQL 17. The columns here are `pg_stat_bgwriter`.
- Disabling `full_page_writes` because `wal_fpi` is large. The images are the torn-page repair. The tuning that reduces how often they repeat is the checkpoint interval.
- Blaming commit latency on the sync phase. The sync phase is the checkpointer flushing data files. A commit waits for its own WAL flush.

**Senior-Level Follow-up:**

`full_page_writes` is on. A page was imaged once, early in this interval, and updated ten more times before the next checkpoint. How many full page images does that page contribute in this interval?

**Answer:** One. The first modification after the checkpoint logs the image. The ten later updates log ordinary records. The next checkpoint re-arms the page, and the first modification after that logs another image. The ten updates do not each log an 8 kB image.

### DB-087 — wal_level chooses how much of a change is logged

**Difficulty:** Senior

**Category:** WAL

**Question:**

What do `minimal`, `replica`, and `logical` include, and what does a default PostgreSQL 16 primary refuse to start if you set `minimal`?

**Context and Constraints:**

PostgreSQL 16. The default `wal_level` is `replica`. The default `max_wal_senders` is 10. `archive_mode` is off unless a sentence below turns it on. Changing `wal_level` requires a restart. This question is the contents of the WAL, not a replica setup.

**Senior Engineer's Answer:**

`wal_level` is how much information WAL records, and each level includes the levels below it. It is not the commit wait. `synchronous_commit` is the commit wait. A local commit on this primary still finishes at the local WAL flush when no synchronous standby is configured.

`minimal` logs what crash recovery and immediate shutdown need. It does not log enough for point-in-time recovery, continuous archiving, or streaming replication. In a transaction that creates or rewrites a permanent relation, it can skip logging the new row images. The operations that start that optimization include `CREATE TABLE`, `TRUNCATE`, `CLUSTER`, `REINDEX`, `ALTER TABLE ... SET TABLESPACE`, and `REFRESH MATERIALIZED VIEW` without `CONCURRENTLY`. Data loaded into a relation created or rewritten in that same transaction follows the rule. `wal_skip_threshold` defaults to 2 MB. Below that, the rows are WAL-logged anyway. At or above it, the commit fsyncs the new files instead of logging every row. The server will not start with `wal_level = minimal` while `max_wal_senders` is non-zero. The default 10 has to be set to 0, which also disables `pg_basebackup` and standbys. `archive_mode` requires `replica` or higher.

`replica` is the default. It logs enough for WAL archiving and for a standby, including a standby that runs read-only queries. The names `archive` and `hot_standby` are still accepted and mean `replica`.

`logical` adds what logical decoding needs on top of `replica`. Update and delete decoding needs a replica identity. `REPLICA IDENTITY FULL` records the whole old row and increases WAL volume the most. Publications and subscriptions require `logical`. A physical standby does not.

Moving from `replica` to `minimal` makes existing base backups unusable for point-in-time recovery. Moving up to `logical` does not change the local commit rule. It changes how large the WAL for the same `UPDATE` is, and it requires the restart before a logical subscriber can decode.

**Practical Implementation:**

```sql
SELECT name, setting, context
FROM pg_settings
WHERE name IN ('wal_level', 'max_wal_senders', 'archive_mode', 'wal_skip_threshold')
ORDER BY name;
```

`context` is `postmaster` for `wal_level` and `max_wal_senders`: a reload is not enough. On the default primary this query shows `replica`, `10`, `off`, and `2MB`. `pg_control` also records the `wal_level` the running cluster was started with. If a configuration file says `minimal` and the server is up at `replica`, the restart has not happened, or the start failed and an older process is still running.

**Trade-offs and Alternatives:**

`replica` is the level that keeps a backup story and a standby possible. `minimal` is a narrower crash-recovery setting for a cluster that will never archive and never take a streaming backup, bought by also setting `max_wal_senders` to 0. The WAL you skip on a bulk load comes back as an fsync of the new files at commit, controlled by `wal_skip_threshold`. `logical` is the level you pay for when a subscriber needs row changes. Setting it "in case" on a primary that only has a physical standby logs extra identity data on every update and delete for a consumer that does not exist.

**Common Mistakes:**

- Setting `wal_level = minimal` on a default primary and expecting a reload to succeed. `max_wal_senders` is 10, so the postmaster will not start, and `minimal` is a restart parameter anyway.
- Using `minimal` so `pg_basebackup` "writes less." Base backup needs a WAL sender, which `minimal` forbids.
- Expecting `logical` to make commits wait for a subscriber. Waiting for another node is `synchronous_commit` and `synchronous_standby_names`. `wal_level` only decides whether the WAL contains enough to decode.
- Treating `archive` and `hot_standby` as extra logging. On PostgreSQL 16 they are spellings of `replica`.

**Senior-Level Follow-up:**

`wal_level` is `replica`. You run `CREATE TABLE load_batch AS SELECT ...` for a large result, in one transaction. Are the new rows omitted from WAL the way they could be at `minimal`?

**Answer:** No. The skip of row images applies at `minimal`. At `replica` the create-table-as-select is WAL-logged, which is what makes the new table archivable and present on a standby. `wal_skip_threshold` does not change that. It is consulted for the minimal-level optimization.

### DB-088 — A sort or hash that crosses its memory limit writes temp files

**Difficulty:** Senior

**Category:** Memory

**Question:**

What does a temp file mean, which setting is the limit, and which tools show the spill without you inventing its size?

**Context and Constraints:**

PostgreSQL 16 defaults: `work_mem` 4 MB, `hash_mem_multiplier` 2.0, `maintenance_work_mem` 64 MB, `log_temp_files` -1, `temp_file_limit` -1. Hypothetical query with an `ORDER BY` on `ticket`. No measured spill size is part of the question. Do not supply one.

**Senior Engineer's Answer:**

`work_mem` is the base memory limit for one query operation, not a reservation at connect time and not a per-session pool. A sort uses it for `ORDER BY`, `DISTINCT`, and a merge join. A hash uses it for a hash join, a hash aggregate, and hashed `IN`. Each such node in the plan has its own limit, and each parallel worker running that node has its own. The default base is 4 MB.

A sort that cannot stay within `work_mem` switches to an external sort and writes temp files. A hash node is allowed `work_mem` times `hash_mem_multiplier`. The default multiplier is 2.0, so the default hash ceiling is twice the base `work_mem`, 8 MB, still a setting, not a measurement of a query. Past that ceiling the hash spills. Temp files are also used for some materialised intermediate results. They live under the temporary tablespace, in `pgsql_tmp`, and they are removed when the operation finishes.

Crossing the limit is the whole symptom this answer claims. How many bytes a particular execution wrote is a fact about that execution. `EXPLAIN (ANALYZE)` reports it as the `Disk` figure on an external sort, or as more than one hash batch. `log_temp_files` logs the path and the byte size when the file is deleted. The default -1 logs nothing. Zero logs every temp file. A positive value logs files at least that large, and the parameter unit is kilobytes while the log line's size is bytes. `pg_stat_database.temp_files` and `temp_bytes` are cumulative since the last statistics reset. A delta between two samples is the workload's spill over that interval. An absolute reading is not "the sort."

`maintenance_work_mem` is the limit for `VACUUM`, `CREATE INDEX`, and similar maintenance. Raising `work_mem` does not give `CREATE INDEX` a larger sort. `temp_file_limit` defaults to -1, unlimited. If it is set and a query exceeds it, the statement is cancelled. Leaving it unlimited means a spill consumes disk until the query finishes or the volume fills.

**Practical Implementation:**

```sql
SHOW work_mem;
SHOW hash_mem_multiplier;
SHOW log_temp_files;
SHOW temp_file_limit;
```

```sql
SELECT datname, temp_files, temp_bytes, stats_reset
FROM pg_stat_database
WHERE datname = current_database();
```

Sample `temp_bytes` twice around the workload. An increase means some operation spilled in that window. It does not name the statement. Set `log_temp_files` to 0 for the investigation if you need the statement text and that run's byte size in the log, then set it back. For one query you can already see:

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT id FROM ticket ORDER BY note;
```

If the sort spilled, the plan says the method is external and prints the disk bytes for this execution. Quote that figure from the plan you ran. Do not borrow one from another workload.

**Trade-offs and Alternatives:**

A spill is PostgreSQL staying inside the memory limit. It is slower than an in-memory sort and safer than an unbounded allocation. Raising `work_mem` globally raises the ceiling for every concurrent sort and hash, times workers. The safer change for one report is `SET work_mem` in that session, or on that role. Raising it until spills disappear on a quiet machine understates the concurrent case, where many backends spill or allocate at once. A smaller result, a narrower `SELECT` list, or an index that matches the `ORDER BY` can remove the sort. Those are plan changes. They are not a larger `work_mem`.

**Common Mistakes:**

- Multiplying `work_mem` by `max_connections` and calling it memory in use. Idle sessions allocate none of it. One active statement can allocate several times `work_mem`.
- Treating the default 4 MB as the size of the temp file. It is the sort's ceiling. The file size is whatever that execution wrote, reported by the plan or the log.
- Using `work_mem` to stop `CREATE INDEX` from spilling. That sort is `maintenance_work_mem`.
- Reading `temp_bytes` as a current gauge. It is a counter since `stats_reset`. The signal is the increase.

**Senior-Level Follow-up:**

`EXPLAIN` without `ANALYZE` shows a Sort node. Does that mean the sort will write a temp file?

**Answer:** No. A plain `EXPLAIN` does not run the sort and does not know the spill. The memory estimate can suggest risk. The external method and the disk bytes appear in `EXPLAIN (ANALYZE)`, after the sort has run, or in a `log_temp_files` line if logging is on. The plan shape alone is not a measurement.

### DB-089 — The free space map is how an insert finds a page with room

**Difficulty:** Intermediate

**Category:** Heap storage

**Question:**

What does the free space map record, and why can an insert after `VACUUM` leave `pg_relation_size` unchanged?

**Context and Constraints:**

PostgreSQL 16. Hypothetical `ticket` heap. Ordinary `VACUUM` has removed dead tuples from pages in the middle of the file. The visibility map is a different fork and is not the subject, except to keep the two apart. `vacuum_truncate` is on.

**Senior Engineer's Answer:**

The free space map is a fork beside the main heap file. It records, per heap page, how much free space that page has for a new tuple. Vacuum updates it after it removes dead tuples. An insert or an update that needs a new page consults the map to find a page with enough room, instead of always appending. If the map says page 3 has room for this tuple, the tuple goes on page 3 and the file is not extended. `pg_relation_size`, which is the main fork, stays the same. That is reuse. It is the result you want from ordinary vacuum.

The map is not visibility. It does not say whether the tuples on the page are all-visible or frozen. A page can have free space and a clear visibility bit. The visibility map is the other fork, used by index-only scans and by freeze. `pg_relation_size` ignores both forks. `pg_table_size` includes the heap, the toast table, the free space map, and the visibility map.

Vacuum truncates only empty pages at the end of the file, and only if it gets the brief `ACCESS EXCLUSIVE` lock. Holes in the middle stay holes, tracked by the map, until new tuples fill them or a rewrite builds a new file. If the map has no page with enough room, the insert extends the heap. A tuple larger than a page's remaining hole cannot use that hole. Width matters. A wide row can extend the file while the map still shows space that only a narrow row could use.

The map can be out of date in the sense that a page's real free space is only fully known when the page is visited. Vacuum is what brings the map back in line with the holes it created. Inserts that extend the file while `n_dead_tup` is high are often a map that does not yet show the holes, because vacuum has not run, or a horizon that has not let vacuum create them.

**Practical Implementation:**

```sql
SELECT pg_size_pretty(pg_relation_size('ticket')) AS main_fork,
       pg_size_pretty(pg_table_size('ticket')) AS with_toast_and_maps,
       pg_size_pretty(pg_total_relation_size('ticket')) AS with_indexes;
```

After vacuum removes dead tuples from the middle of `ticket`, `main_fork` is unchanged and a following insert of a similar row can leave it unchanged. The `pg_freespace` function in the `pgfreespace` extension prints the map's recorded free bytes per page when you need to see that the holes exist. Core `pg_relation_size` will not show them, because the file did not shrink.

**Trade-offs and Alternatives:**

Keeping the holes in the file avoids rewriting the heap on every vacuum and lets the next insert avoid an extending write. The operating system does not get the space back. That is acceptable when the table will regrow. When it will not, `VACUUM FULL` builds a packed file and the free space map of the new file starts empty of those holes. Rebuilding just to watch `pg_relation_size` drop, on a table that inserts the same volume every day, spends an `ACCESS EXCLUSIVE` lock to recreate the same steady-state size.

**Common Mistakes:**

- Declaring vacuum a failure because `pg_relation_size` did not drop. The free space map is where the reclaimed bytes were recorded.
- Confusing the free space map with the visibility map. One answers "where can a new tuple fit." The other answers "can an index-only scan skip this page" and "can freeze skip this page."
- Expecting a toasted-width insert to fill a hole left by a narrow delete. The map stores a size. The new tuple has to fit.
- Adding the map forks to a capacity graph as if they were user data. They are small indexes of the heap's holes and visibility. `pg_relation_size` is the heap.

**Senior-Level Follow-up:**

Page 0 has free space recorded, and it is the only empty page. Page 1 holds a live tuple. Vacuum runs with truncation allowed. Does the main fork lose page 0?

**Answer:** No. Truncation cuts empty pages only from the end of the file. Page 1 is past page 0, so page 0 stays. The free space map is what makes the next fitting insert use page 0 instead of extending. The file loses a page only when the empty pages are a suffix and vacuum gets the lock to cut them.

### DB-090 — Crash recovery empties an unlogged table

**Difficulty:** Senior

**Category:** WAL

**Question:**

What does `CREATE UNLOGGED TABLE` skip, and what does the table contain after a crash?

**Context and Constraints:**

PostgreSQL 16. Hypothetical table on a primary. `wal_level` is `replica`. A standby exists and is not the subject of a setup walk-through. The failure is a crash of the primary, then normal recovery. Nobody runs `TRUNCATE`.

```sql
CREATE UNLOGGED TABLE scratch (
  id integer PRIMARY KEY,
  payload text NOT NULL
);

INSERT INTO scratch (id, payload) VALUES (1, 'kept until a crash');
```

**Senior Engineer's Answer:**

An unlogged table is visible to every session on the primary, same as a normal table, until a crash. Changes to it are not written to WAL. That is the speed: bulk loads do not pay WAL for those rows. Indexes on an unlogged table are unlogged as well. The table has an init fork, an empty version of the relation, stored for recovery.

Crash recovery truncates the unlogged table by restoring that init fork over the main fork. After the primary accepts connections, `scratch` exists and has no rows. The insert is gone even though it had committed. There is no WAL to replay it from. A clean shutdown does not do this. The rows are still there after a restart that was not a crash. The loss is the crash path, including a crash that happens on a host PostgreSQL did not get to shut down.

A standby does not receive the rows. Unlogged contents are not in the WAL stream the standby replays. On the standby the relation is empty. Promoting the standby does not reconstruct `scratch`. The application has to be able to rebuild it.

Unlogged tables are still vacuumed and analyzed. They are not session-private, and they are not immune to bloat. They participate in the same heap rules for tuple versions. They do not participate in archive recovery or in a point-in-time restore, except as an empty relation. Using one as the only copy of data you cannot rebuild violates the reason the WAL skip is allowed.

**Practical Implementation:**

```sql
SELECT relpersistence, relfrozenxid
FROM pg_class
WHERE oid = 'scratch'::regclass;
```

`relpersistence` is `u` for unlogged, `p` for a permanent table, and `t` for a temporary table. After a crash and recovery, `SELECT count(*) FROM scratch` is 0. That count is the mechanism. There is no parameter that makes recovery replay unlogged data. If the rows have to survive, the table has to be logged.

**Trade-offs and Alternatives:**

An unlogged table is the right scratch space for a cache, a staging load, or an intermediate result that a job can fill again. A logged table is the right place for the data the job keeps. `CREATE TEMP TABLE` is a different skip: it is also absent from WAL, and it is invisible to other sessions and dropped at session end. Use temp for one backend's scratch and unlogged for scratch that sessions share and that may survive a clean restart. A permanent table plus `TRUNCATE` at the start of the job is the logged version: crash-safe, and you pay WAL for the load unless `wal_level` is `minimal` and the create-or-rewrite optimization applies.

**Common Mistakes:**

- Putting a queue or an audit log in an unlogged table because the inserts were faster. A crash empties it. The speed was the missing WAL.
- Expecting the standby to hold a copy. The standby has the empty relation.
- Confusing a clean restart with a crash. Recovery's truncate of unlogged tables is the crash path. `pg_ctl restart` after a clean shutdown keeps the rows.
- Assuming autovacuum ignores unlogged tables. It ignores temporary tables. Unlogged tables are shared and are vacuumed.

**Senior-Level Follow-up:**

The primary crashes and recovers. A later `INSERT` into `scratch` commits, and there is no second crash. Does that new row survive a clean restart an hour afterward?

**Answer:** Yes. The crash emptied the table once, at recovery. The new insert is stored in the unlogged heap like any later write. A clean shutdown does not restore the init fork. The row is still there when the postmaster starts again. Another crash would empty it again.

### DB-091 — A temporary table is private to the session and is not in the WAL

**Difficulty:** Intermediate

**Category:** Heap storage

**Question:**

Who can see a temporary table, where do its pages live, and what removes it?

**Context and Constraints:**

PostgreSQL 16. `temp_buffers` defaults to 8 MB. Hypothetical session:

```sql
CREATE TEMP TABLE scratch (
  id integer PRIMARY KEY,
  payload text NOT NULL
) ON COMMIT PRESERVE ROWS;

INSERT INTO scratch (id, payload) VALUES (1, 'session only');
```

A second session is connected to the same database. Autovacuum is on.

**Senior Engineer's Answer:**

A temporary table belongs to the session that created it. Other sessions do not see it. It is not WAL-logged. Its buffers come from `temp_buffers`, a backend-local pool, default 8 MB, separate from `shared_buffers`. Pages that do not fit spill to temp files in the session's temporary namespace. A crash throws the table away. A clean disconnect drops it too, unless a pooler is holding the session open, in which case the table is still there because the session is still there.

`ON COMMIT PRESERVE ROWS` keeps the rows across commits inside that session. `ON COMMIT DELETE ROWS` truncates on each commit. `ON COMMIT DROP` drops the table at commit. The default is `PRESERVE ROWS`. None of those options publish the table to another backend.

Autovacuum does not vacuum or analyze it. The owning session runs `VACUUM` and `ANALYZE` if the temporary table needs them. A long session that updates a temporary table and never vacuums it bloats its own temp storage. That bloat does not show up as a cluster-wide autovacuum debt.

`temp_buffers` has to be set before the session first uses a temporary table. A later `SET` in that session does not resize the pool. The memory is private to the backend, so 200 sessions each holding an 8 MB temp pool is 200 times that cost, and a session that never creates a temporary table does not pay it.

Indexes on a temporary table are temporary. They are not in WAL either. `relpersistence` in `pg_class` is `t`, and another session's catalog query does not treat the table as a shared relation it can read.

**Practical Implementation:**

```sql
SHOW temp_buffers;

SELECT relname, relpersistence
FROM pg_class
WHERE relname = 'scratch'
  AND relpersistence = 't';
```

Run the `SELECT` from the creating session: one row, persistence `t`. Run it from the second session: no row. `SELECT * FROM scratch` in the second session fails because the relation is not visible there. After the creating session disconnects, the table is gone from both.

**Trade-offs and Alternatives:**

Use a temporary table for intermediate rows one session will discard. Use an unlogged table when several sessions must see the same scratch and you accept an empty table after a crash. Use a logged table when the rows have to survive both. Raising `temp_buffers` helps a session whose temporary working set is larger than 8 MB and would otherwise thrash temp files. Set it at connect, before the first `CREATE TEMP TABLE`. Do not raise it globally to fix a query sort. Sorts use `work_mem`, not `temp_buffers`.

**Common Mistakes:**

- Creating a temporary table in a pooled session and expecting the next checkout to find it empty. Transaction pooling drops session state at commit. Session pooling keeps the table, and the next borrower can read the previous borrower's rows.
- Waiting for autovacuum to analyze a temporary table the planner is misestimating. The session has to `ANALYZE` it.
- Setting `temp_buffers` after `CREATE TEMP TABLE` and expecting a larger pool. The first use fixed the size for the session.
- Confusing temp-file spills from `work_mem` with temporary tables. A sort's temp file is not a table another statement in the session can `SELECT` from. A temporary table is.

**Senior-Level Follow-up:**

The creating session commits and stays connected. Can the second session `SELECT` from `scratch`? Can it see those rows in the WAL stream?

**Answer:** Neither. Commit with `ON COMMIT PRESERVE ROWS` keeps the rows for the owning session only. The second session cannot see the relation. The insert was not WAL-logged, so a standby and an archive have nothing to replay for it. Disconnect is what drops the table.

### DB-092 — A real transaction id is assigned on the first write

**Difficulty:** Intermediate

**Category:** MVCC

**Question:**

When does a backend get a real transaction id, and what does it have before that?

**Context and Constraints:**

PostgreSQL 16. Read Committed unless the statement says otherwise. Hypothetical session, watching its own `pg_stat_activity` row from a second session. No `SELECT FOR UPDATE` unless the sentence includes it.

**Senior Engineer's Answer:**

`BEGIN` starts a transaction and takes a virtual transaction id: this backend's id plus a local counter. That virtual id is how the lock manager can name the transaction before it has a real xid. It is not an entry in `pg_xact`, and it does not consume the 32-bit xid counter that freezing exists to protect.

A real xid is assigned at the first operation that needs one: `INSERT`, `UPDATE`, `DELETE`, `SELECT FOR UPDATE`, `SELECT FOR SHARE`, and the other row-lock forms. A plain `SELECT` does not assign one. `pg_stat_activity.backend_xid` stays null for a read-only transaction. `backend_xmin` is independent. Repeatable Read and Serializable still publish a snapshot xmin for the life of the transaction even when `backend_xid` is null. Read Committed publishes a snapshot xmin only while a statement is running.

The real xid is what vacuum and freezing have to treat as in progress. Burning xids is what moves `age(datfrozenxid)`. A workload of read-only transactions does not move it. A workload of single-row updates does, one xid per writing transaction, plus more when the transaction uses subtransactions. Assigning the xid at first write is why an idle `BEGIN` that has only read, in Read Committed, is cheap for the horizon, and why the same `BEGIN` after a single `UPDATE` is not.

The xid is cluster-wide. Two databases draw from the same counter. A writing transaction in either one advances it.

**Practical Implementation:**

```sql
SELECT pid, state, backend_xid, backend_xmin, xact_start
FROM pg_stat_activity
WHERE pid = <session pid>;
```

Run that from a second session, with `<session pid>` replaced by the backend under test, so the observation is not itself the transaction. After `BEGIN` and `SELECT 1` in Read Committed, `backend_xid` is null once the statement has finished. After `INSERT` into a scratch table and before `COMMIT`, `backend_xid` is set. After `COMMIT`, it is null again. `pg_locks.virtualxid` can be set for the transaction that does not yet have `transactionid`.

**Trade-offs and Alternatives:**

Delaying the real xid keeps read-only traffic off the wraparound clock. The moment the application writes, the cost is the same as any other writing transaction, and holding that transaction open holds the xid. A read-only role, or a replica for reads, is how you keep reporting off the primary's xid counter entirely. It does not help the primary's own writers. Fewer writer transactions, not a longer `BEGIN` around them, is what slows xid consumption.

**Common Mistakes:**

- Saying every `BEGIN` consumes a transaction id. A read-only transaction often never does. `backend_xid` is the check.
- Saying a null `backend_xid` means the session cannot pin vacuum. A Repeatable Read snapshot pins it through `backend_xmin` with no xid at all.
- Counting client connections as xid burn. Idle pooled connections with a null `xact_start` are not in a transaction and are not assigning xids.
- Looking for the xid in WAL before the first write. There is nothing to commit until the transaction has done something that needs an xid, or until a commit record is required for a transaction that obtained one.

**Senior-Level Follow-up:**

A Read Committed transaction runs `SELECT * FROM ticket WHERE id = 1 FOR UPDATE`, then sits idle. It has changed no column. Does it hold a real xid?

**Answer:** Yes. `FOR UPDATE` is a row lock, and taking it assigns a transaction id. `backend_xid` is set until commit or rollback. The row's `xmax` names that xid or a multixact that contains it. Vacuum's horizon includes this session because the xid is in progress, even though no column was updated.

### DB-093 — A savepoint assigns a subtransaction id

**Difficulty:** Senior

**Category:** MVCC

**Question:**

What does `SAVEPOINT` cost in transaction ids, and why can a PL/pgSQL `EXCEPTION` handler do the same thing in a loop?

**Context and Constraints:**

PostgreSQL 16. One writing transaction on hypothetical `ticket`. The parent transaction has already assigned an xid by running an `UPDATE`. `pg_subtrans` is the parent map. Do not turn this into an isolation-level question.

```sql
BEGIN;
UPDATE ticket SET note = 'parent' WHERE id = 1;
SAVEPOINT s1;
UPDATE ticket SET note = 'child' WHERE id = 1;
ROLLBACK TO SAVEPOINT s1;
COMMIT;
```

**Senior Engineer's Answer:**

A savepoint opens a subtransaction. The subtransaction gets its own transaction id, a subxid, when it does something that needs one. `ROLLBACK TO SAVEPOINT` aborts that subxid. The parent xid stays in progress and later commits. `RELEASE SAVEPOINT` keeps the subtransaction's work and folds it into the parent. The parent's commit is the one that makes the surviving changes durable.

While the subtransaction has committed and the parent has not, the commit log marks the subxid subcommitted. Readers follow `pg_subtrans` from that subxid to the parent and use the parent's status. If the parent aborts, the subcommitted child aborts with it. `pg_subtrans` is the parent pointer. It is not a second commit log.

PL/pgSQL implements a `BEGIN ... EXCEPTION` block as a subtransaction. A function that catches an exception per row, in a loop, can assign a subxid per iteration. Those ids advance the same xid counter freezing is measured against. They also have to fit in the backend's cached list of subxids. That cache holds 64. Past it, snapshots are marked suboverflowed and visibility checks go to `pg_subtrans` instead of trusting a complete in-memory list. A tight loop of exception handlers is how a single `CALL` burns far more than one xid and slows snapshot checks.

`ROLLBACK TO SAVEPOINT` releases locks taken after the savepoint. It does not release locks the parent took before the savepoint. It does not end the parent, so `backend_xid` stays set and the session remains `idle in transaction` if it then waits.

**Practical Implementation:**

```sql
SELECT pid, backend_xid, backend_xmin, state
FROM pg_stat_activity
WHERE pid = <session pid>;
```

Replace `<session pid>` with the writing backend. After the first `UPDATE` and before `COMMIT`, `backend_xid` is the parent and stays the parent across `ROLLBACK TO SAVEPOINT`. The subxid is not a second `backend_xid`. The column is the top-level transaction. The cost shows up as xid consumption: `age(datfrozenxid)` moving faster than the number of `COMMIT`s suggests, on a workload whose functions catch exceptions per row. `pg_subtrans` files on disk growing with that pattern are the same phenomenon.

**Trade-offs and Alternatives:**

A savepoint is the right tool for one logical step you might undo inside a larger transaction, such as trying an insert and handling a unique violation without losing the rest of the transaction. It is the wrong tool inside a loop over a large input. Restructure the function so one subtransaction covers the batch, or so the error is filtered before the write and no exception handler runs per row. Each of those avoids a subxid per row. An application-level retry of the whole transaction uses one xid per attempt and does not leave a chain of subcommitted children inside a single parent.

**Common Mistakes:**

- Treating `ROLLBACK TO SAVEPOINT` as `ROLLBACK`. The parent transaction is still open, still holds its earlier locks, and still pins the horizon through its xid.
- Assuming one business transaction is one xid. A savepoint and an exception block are extra xids. Wraparound math that counts commits undercounts this workload.
- Catching `unique_violation` per row as a control-flow style. It works, and it allocates a subtransaction every iteration, including the iterations that do not raise.
- Looking only at `backend_xid` to count ids a session is using. You see the parent. The children are real xids in `pg_xact` and `pg_subtrans` anyway.

**Senior-Level Follow-up:**

The block above runs through `COMMIT`. Which note does a later `SELECT` return for `ticket.id = 1`, and which xids aborted?

**Answer:** The note is `parent`. `ROLLBACK TO SAVEPOINT` aborted the subtransaction that wrote `child`. The parent's `UPDATE` committed. The subxid ends aborted. The parent xid ends committed. A reader does not see `child`, because that subtransaction did not survive.

### DB-094 — Relation locks use the lock table; row locks live on the tuple

**Difficulty:** Senior

**Category:** Locks

**Question:**

What does `max_locks_per_transaction` limit, and why can a transaction lock every row in `ticket` without exhausting it?

**Context and Constraints:**

PostgreSQL 16 defaults: `max_locks_per_transaction` 64, `max_connections` 100, `max_prepared_transactions` 0. Hypothetical `ticket` is a partitioned table with more partitions than the lock table can hold if each partition is locked. The error under discussion is `out of shared memory`, with a hint about `max_locks_per_transaction`. Row-lock modes are the previous multixact question. This one is where the lock is stored.

**Senior Engineer's Answer:**

The shared lock table holds heavyweight locks: relations, transaction ids a backend is waiting on, advisory locks, and similar objects. Its size is fixed at start from `max_locks_per_transaction` times (`max_connections` plus `max_prepared_transactions`). The default 64 is an average budget per process, not a hard per-transaction cap. One transaction may lock more than 64 objects when other slots are free. When the table is full, the statement fails with `out of shared memory` and a hint to raise `max_locks_per_transaction`. That parameter is a restart. It does not grow on its own.

Row locks are not those slots. A granted row lock is `xmax` and infomask bits on the tuple, or a multixact, so the number of locked rows is not limited by this table. `SELECT FOR UPDATE` across `ticket` dirties the locked pages and writes WAL. It does not take one lock-table entry per row. A backend that has to wait for a row lock does take a lock-table entry while it waits, so the wait shows up in `pg_locks` and so the lock manager can wake waiters fairly. The entry is released when the wait ends. The granted lock remains on the tuple until the holding transaction ends.

What fills the table is many relations in one transaction, or many transactions each holding many relations. A partitioned table is the usual way. Planning or executing a statement that locks every partition takes one relation lock per partition, plus the parent. A few hundred partitions, several sessions at once, and the default table is too small. Foreign keys add locks on the referenced tables. `ALTER TABLE` and vacuum's conflicting locks are relation locks too.

`pg_locks` shows granted and waiting heavyweight locks. A quiet `pg_locks` does not mean no rows are locked. Those locks are on the pages.

**Practical Implementation:**

```sql
SELECT locktype, mode, granted, count(*)
FROM pg_locks
GROUP BY locktype, mode, granted
ORDER BY count(*) DESC;
```

A pile of `relation` locks from one pid, on many partition OIDs, is the pattern that exhausts the table. `tuple` waits are the wait queue, not the set of all locked rows. Raise `max_locks_per_transaction` only after that count shows relation locks, and only with a restart. The hint in the error is aimed at this table. It is the wrong fix for a disk-full error or for `work_mem`.

**Trade-offs and Alternatives:**

A larger lock table uses shared memory that is reserved for the life of the postmaster, about 64 entries times the connection slots by default, more if you raise either factor. Raising it is the right response to a real partition-lock workload. Reducing how many partitions one statement touches, by pruning the plan or by not locking the parent in a way that walks every child, reduces the count without a larger table. Advisory locks share this same pool. An application that takes an advisory lock per row reintroduces the limit row locks were designed to avoid.

**Common Mistakes:**

- Raising `max_locks_per_transaction` because a query locked a million rows. Those locks are on the tuples. The error you hit for rows is bloat, WAL, and dirty pages, not this table.
- Treating 64 as the maximum locks one transaction may hold. It is the average used to size the table. One transaction can hold more while the table has room, and the cluster fails when the table does not.
- Reading `pg_locks` as a list of locked rows. It is the heavyweight lock table. Granted row locks are on the heap pages.
- Changing the parameter and reloading. The lock table is sized at server start.

**Senior-Level Follow-up:**

`ticket` has 400 partitions. One `SELECT` locks the parent and every partition. Two such sessions run together, and other sessions hold ordinary table locks. The statement errors with `out of shared memory`. Which setting is the hint pointing at, and would `work_mem` change it?

**Answer:** `max_locks_per_transaction`. The sessions ran out of relation-lock slots. `work_mem` sizes sorts and hashes. It does not add lock-table entries. The restart-time increase covers the partition fan-out, or the query has to lock fewer relations. Row locks on `ticket`'s tuples are not what filled the table.

### DB-095 — pg_wal can outgrow max_wal_size while a consumer still needs the segments

**Difficulty:** Senior

**Category:** WAL

**Question:**

Why is the `pg_wal` directory larger than `max_wal_size`, and which consumers stop a segment from being recycled?

**Context and Constraints:**

PostgreSQL 16 defaults: `max_wal_size` 1 GB, `min_wal_size` 80 MB, `wal_keep_size` 0, `max_slot_wal_keep_size` -1, `checkpoint_timeout` 5 minutes. WAL segment size is the initdb default, 16 MB. `archive_mode` is off unless a sentence says it is on. No measured directory size is invented here. The question is the rule that allows the directory to pass the setting.

**Senior Engineer's Answer:**

`max_wal_size` is the amount of WAL growth that triggers a checkpoint so old segments can be reused or removed. It is not a filesystem quota. A normal cycle keeps WAL near that target: the checkpointer finishes, segments from before the redo point are recycled, and `min_wal_size` (80 MB) is how much WAL PostgreSQL keeps allocated anyway so it does not delete and recreate files on every cycle. Segment files are 16 MB, fixed at initdb.

A segment is kept while anything still needs it. Crash recovery needs WAL back to the last checkpoint's redo point, so a checkpoint that has not finished cannot recycle the segments it still has to protect. `wal_keep_size` keeps extra WAL on top of that for standbys. The default 0 adds nothing.

A replication slot keeps every segment from its `restart_lsn` forward. An inactive slot whose consumer is gone still keeps them. `max_slot_wal_keep_size` defaults to -1, which means a slot may retain WAL without a PostgreSQL-imposed cap, and the disk is the limit. Setting a cap lets PostgreSQL invalidate a slot that falls too far behind instead of filling the disk. Invalidating a slot a standby still needs means that standby has to be rebuilt. The cap is that decision, made in advance.

`archive_mode` on keeps a segment until the archive command has succeeded. A failing `archive_command` piles segments in `pg_wal` with no help from `max_wal_size`. The checkpoint still runs. It is not allowed to delete a segment the archiver has not finished.

So a directory larger than 1 GB means one of those holders is behind: checkpoint redo, `wal_keep_size`, a slot's `restart_lsn`, or an archive command. The setting did not fail to apply. Recycling was refused for a segment that is still required.

**Practical Implementation:**

```sql
SELECT slot_name,
       slot_type,
       active,
       restart_lsn,
       pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS retained
FROM pg_replication_slots
ORDER BY pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) DESC;
```

```sql
SHOW archive_mode;
SHOW wal_keep_size;
SHOW max_wal_size;
SHOW max_slot_wal_keep_size;
```

The slot with the oldest `restart_lsn` is the WAL the directory cannot drop. `archive_mode` off and `wal_keep_size` 0 remove those two holders. A large `retained` value on an `active = false` slot is an abandoned consumer. Drop it only when nothing still needs that slot.

**Trade-offs and Alternatives:**

Raising `max_wal_size` spaces checkpoints out and lets ordinary WAL peak higher. It does not release a segment a slot is holding. The release is to advance or drop the holder. A `max_slot_wal_keep_size` you chose on purpose prefers "invalidate the slot" over "fill the disk." Leaving the default -1 prefers the opposite: the slot stays valid and the disk grows. `min_wal_size` lower than the default saves a little space on a quiet cluster and spends more creating files when the next burst arrives. It is not the lever for a directory that has already passed `max_wal_size`.

**Common Mistakes:**

- Treating `max_wal_size` as a hard cap and paging on any larger `pg_wal`. Find the holder first. The cap is the checkpoint target.
- Deleting files in `pg_wal` to get under 1 GB. Those segments are the redo the slot, the archiver, or recovery still needs. Removing them breaks that consumer and can make the cluster unable to recover.
- Raising `max_wal_size` because an inactive slot is retaining WAL. The slot's `restart_lsn` is the reason. The checkpoint target is unrelated.
- Assuming `wal_keep_size` 0 means standbys are unprotected. Slots are the precise hold. `wal_keep_size` is extra WAL kept even without a slot. Zero means you are not keeping that extra.

**Senior-Level Follow-up:**

`archive_mode` is on, `archive_command` has been failing, and a slot is also inactive with an old `restart_lsn`. Checkpoint is current. Which of those can you fix by running `CHECKPOINT`?

**Answer:** Neither. A checkpoint recycles segments nothing else needs. The archiver still needs the segments it has not copied. The slot still needs everything from `restart_lsn` forward. Repair the archive command, or drop a slot you have confirmed is abandoned. The checkpoint is already allowed to be current and the files are still required.

### DB-096 — idle_in_transaction_session_timeout ends a session that is sitting in a transaction

**Difficulty:** Senior

**Category:** Vacuum

**Question:**

Which timeout ends an `idle in transaction` session, and which timeouts leave that session alone?

**Context and Constraints:**

PostgreSQL 16 defaults: `idle_in_transaction_session_timeout` 0, `idle_session_timeout` 0, `statement_timeout` 0, `lock_timeout` 0. Zero means the timeout is disabled. Hypothetical: `idle_in_transaction_session_timeout` is set to 30 seconds for this exercise. That 30 seconds is the setting under discussion, not a measured production choice. One Repeatable Read session on `ticket` has `state = 'idle in transaction'`, a non-null `backend_xmin`, and `now() - state_change` greater than 30 seconds. Another session is `active` in a query that has already run for longer than 30 seconds.

**Senior Engineer's Answer:**

`idle_in_transaction_session_timeout` terminates a session that stays idle inside a transaction longer than the setting. The backend is waiting for the client, `state` is `idle in transaction` or `idle in transaction (aborted)`, and `state_change` is the start of that wait. When the timeout fires, PostgreSQL ends the session. The open transaction rolls back. Its snapshot, its xid, and its locks go with it. The next vacuum can then remove and freeze what that horizon was protecting. The timeout does not remove dead tuples itself.

It does not fire on the `active` query. That statement is not idle. `statement_timeout` is what cancels a statement that runs too long. The cancel is an error: the transaction aborts, and the session stays up in `idle in transaction (aborted)` until the client rolls back or disconnects. Locks are held across that wait unless something else ends the session. `statement_timeout` is a statement bound. The idle-in-transaction timeout is a session bound on the sit after a statement.

`idle_session_timeout` terminates a session that is `idle` and not in a transaction. It is the pool-connection case, a null `xact_start`. It does not touch the Repeatable Read session, because that session is inside a transaction. `lock_timeout` cancels a statement that has been waiting too long to acquire a lock. A session that already holds locks and is idle is not waiting for a lock, so `lock_timeout` does not fire on it either.

The default of each of these is 0, disabled. Setting 30 seconds on `idle_in_transaction_session_timeout` is a choice that the application must be able to survive: the client discovers a dead session and has to reconnect and retry. It is the right backstop for a leaked transaction. It is the wrong way to cancel a report that is still computing. That report needs `statement_timeout`, or a plan that finishes.

**Practical Implementation:**

```sql
SELECT name, setting, unit
FROM pg_settings
WHERE name IN (
  'idle_in_transaction_session_timeout',
  'idle_session_timeout',
  'statement_timeout',
  'lock_timeout'
)
ORDER BY name;
```

With the exercise setting applied, the idle Repeatable Read session is terminated once `now() - state_change` passes 30 seconds. The `active` query is still running at that moment. Confirm with `state` before attributing a cancellation to the idle timeout. The log line for the idle timeout names that parameter. A `statement_timeout` error names the statement cancel and leaves a backend.

**Trade-offs and Alternatives:**

A short idle-in-transaction timeout protects vacuum and lock waiters from a client that opened `BEGIN` and went away. It also cuts a legitimate multi-statement transaction that pauses between statements longer than the setting, including an interactive admin session. Put a longer setting on the admin role and a shorter one on the application role. Fixing the application to commit before it waits on a user is the actual repair. The timeout is the bound for the clients that do not. `statement_timeout` on a report role bounds the active work the idle timeout cannot see.

**Common Mistakes:**

- Expecting `statement_timeout` to reap idle-in-transaction sessions. Those sessions have no running statement.
- Expecting `idle_in_transaction_session_timeout` to cancel a long `SELECT`. `state` is `active`. The idle timer is not running.
- Treating the timeout as a vacuum. After it kills the session, dead tuples remain until vacuum runs.
- Leaving the default 0 in place and describing the parameter as if it were already protecting the cluster. Zero is off. The horizon stays until the client commits or an operator terminates the backend.

**Senior-Level Follow-up:**

The Repeatable Read session is terminated by this timeout. A committed delete, newer than the old snapshot, is still in the heap. What has changed for vacuum, and what has not?

**Answer:** The horizon moved. `backend_xmin` is gone because the session is gone, so the next vacuum may remove that dead tuple and may freeze past the old xmin. The tuple is still on the page. Vacuum is the command that removes it. The timeout did the rollback, not the cleanup.

### DB-097 — The buffer manager flushes WAL through the page LSN before it writes the page

**Difficulty:** Senior

**Category:** WAL

**Question:**

What does the page LSN mean, and what has to be flushed before that page can be written to its data file?

**Context and Constraints:**

PostgreSQL 16. `full_page_writes` is on. `synchronous_commit` and `fsync` are on. One WAL-logged `UPDATE` of hypothetical `ticket`. The commit-wait story is background. This question is the rule the buffer manager applies when the dirty page is later written by the checkpointer, the background writer, or a backend evicting the buffer.

**Senior Engineer's Answer:**

Every heap and index page stores, in its header, the LSN of the last WAL record that changed the page. An `UPDATE` appends a WAL record and sets the page's LSN to the end of that record. The page in `shared_buffers` is dirty. The LSN is the point in WAL that describes the bytes now in the buffer.

Before the buffer manager writes that page to the data file, it flushes WAL at least through the page LSN. The checkpointer, the background writer, and a backend writing a victim buffer all follow that rule. The data file therefore never contains a page whose WAL has not already been made durable. If the write of the page tears or the host crashes before the page is written, recovery still has the WAL and can rebuild the page. Recovery's full page image, logged on the first change after a checkpoint, is what rebuilds a torn 8 kB page. The LSN rule is what keeps the WAL from being behind the data file.

`COMMIT` is the same rule from the client's side. The commit record has its own LSN. `synchronous_commit` on means that LSN is flushed before `COMMIT` returns. The heap page can remain dirty, with an LSN that is already covered by flushed WAL, until a later buffer write. The buffer write then finds the flush already done and writes the page.

A hint-bit update that is not WAL-logged does not advance the page LSN. It can dirty the buffer, and the write-ahead flush for that page stays at the previous WAL-logged change. Checksums, or `wal_log_hints`, make the hint update WAL-logged, and then the LSN does move and the flush rule includes it. On the default cluster the hint path does not.

The page LSN is not a row version and not a snapshot. Two tuples on one page share one page LSN, the latest WAL record that touched either of them.

**Practical Implementation:**

```sql
SHOW full_page_writes;
SHOW synchronous_commit;
SHOW fsync;
```

All three are on. There is no core view that prints one heap page's LSN. `pageinspect`'s `page_header` reports `lsn` for a chosen block when that extension is installed. The operational evidence of the rule is recovery: a crash after `COMMIT` and before the next checkpoint still returns the committed row, because WAL past the page LSN was flushed and the page is replayed. You do not prove the rule by watching `pg_relation_size`. The dirty page may not have been written yet, and the row is already durable.

**Trade-offs and Alternatives:**

Flushing WAL before the data page means commit latency is WAL latency, and data-file writes can be batched later by the checkpointer. That is the trade that makes a checkpoint interval useful. Writing the heap page at `COMMIT` would make every commit a random data write and would still require the WAL flush first. `synchronous_commit` off returns before the commit LSN is flushed. The page-LSN rule for a later data write is unchanged: whenever the page is written, WAL through its LSN is flushed first. The early return only drops the client's wait, and a crash can lose that commit.

**Common Mistakes:**

- Writing the dirty heap page at `COMMIT` in the explanation, so the client waits for a data-file fsync. The client waits for the commit record's LSN. The page write happens later and flushes WAL only up to the page LSN, which is already durable.
- Treating the page LSN as the tuple's `xmin`. `xmin` is a transaction id. The LSN is a position in the WAL stream for the whole page.
- Evicting a dirty buffer and skipping the WAL flush because the transaction already committed. The buffer manager still checks the page LSN. Commit having finished means the flush is likely already done, not that the check is skipped.
- Assuming a hint-bit dirty page advanced the LSN. On the default settings it did not. The LSN still names the last WAL-logged change.

**Senior-Level Follow-up:**

The `UPDATE` is committed, the page is dirty, and its LSN points at the update's WAL record. The checkpointer is about to write the page. What does it flush, and what is already true because `COMMIT` returned?

**Answer:** It flushes WAL through the page LSN if that flush has not already happened. `COMMIT` having returned means the commit record, which is after the update record in WAL, was flushed already. The page LSN is therefore already covered. The checkpointer writes the data page. The flush call finds nothing new to wait for. The rule is the same one that would have waited if this write had happened before the commit flush.

### DB-098 — The wait event says what the backend is blocked on

**Difficulty:** Senior

**Category:** Processes

**Question:**

How do you tell a backend waiting on the client from one waiting on a lock or on a data-file read?

**Context and Constraints:**

PostgreSQL 16. `track_activities` is on. Three hypothetical client backends, observed once in `pg_stat_activity`:

- Session I: `state = 'idle'`, `wait_event_type = 'Client'`, `wait_event = 'ClientRead'`.
- Session L: `state = 'active'`, `wait_event_type = 'Lock'`, `wait_event = 'transactionid'`.
- Session R: `state = 'active'`, `wait_event_type = 'IO'`, `wait_event = 'DataFileRead'`.

No claim is made about how long a real incident lasted.

**Senior Engineer's Answer:**

`state` says whether the backend is executing. The wait event says what that execution, or that idle socket, is blocked on. They are read together.

Session I is not in a query and not in a transaction. `Client` / `ClientRead` means the backend is blocked reading the next command from the client socket. That is a pooled connection waiting for work. It is not a lock, and it is not disk. A dashboard that counts every non-null `wait_event` as saturation will count the whole idle pool. Filter it out, or treat `ClientRead` with `state = 'idle'` as "waiting on the application." `ClientWrite` is the other direction: the backend has results to send and the client is not reading. That one can be `active`, and the application is still the other side of the wait.

Session L is executing and cannot proceed until a lock is granted. `transactionid` means it is waiting for another transaction to finish, which is the usual shape of a row-lock wait: the lock on the tuple is the other session's xid, and the waiter sleeps on that xid. `pg_blocking_pids(pid)` returns the blockers. `relation` would mean a table lock. The statement is not slow because the plan is bad. It is waiting. The time to look at is how long this wait has lasted, from `state_change` or from `query_start` while `state` stays `active`, and who `pg_blocking_pids` names.

Session R is executing and reading a relation file. `DataFileRead` is a shared-buffer miss being satisfied from the kernel. It may still be served from the operating-system cache. It is not, by the event name alone, a proof of a physical disk read. It is a proof the page was not in `shared_buffers`. `WALSync` or `WALWrite` would be the commit path or another WAL flush, a different IO event. Fixing session R starts with whether the working set fits, not with killing a lock holder.

A null `wait_event` on an `active` session means the sample caught it running, not blocked in a recorded wait. The next sample may show a wait. One row is not a profile.

**Practical Implementation:**

```sql
SELECT pid,
       state,
       wait_event_type,
       wait_event,
       now() - state_change AS in_state_for,
       pg_blocking_pids(pid) AS blockers,
       left(query, 100) AS query
FROM pg_stat_activity
WHERE backend_type = 'client backend'
  AND pid <> pg_backend_pid()
ORDER BY wait_event_type NULLS LAST, state;
```

Session L is the row whose `blockers` array is interesting. Session I should be a large, boring set on a pooled system. Session R is the one to correlate with `EXPLAIN (ANALYZE, BUFFERS)` and `track_io_timing`, not with `pg_locks`.

**Trade-offs and Alternatives:**

Sampling the view is enough to tell these three apart while they are happening. It misses waits shorter than the sample interval. `log_lock_waits` logs lock waits that outlast `deadlock_timeout` (default 1 second), which is the record for session L after the fact. There is no equivalent one-line log for every `DataFileRead`. IO timing in the plan is the per-statement version. None of these replaces reading `state` and `wait_event_type` together on the live row.

**Common Mistakes:**

- Alerting on `ClientRead`. Idle connections are supposed to be in `ClientRead`. The saturation signal is `active` sessions in `Lock` or `IO`.
- Cancelling session L without looking at `pg_blocking_pids`. The waiter is the victim. The blocker is the session that holds the transaction open.
- Reading `DataFileRead` as "the disks are saturated." It means the page was not in `shared_buffers`. The kernel may have it cached. `track_io_timing` is what puts a time on it.
- Treating `idle in transaction` plus `ClientRead` as the same as session I. The wait event is still the client, and the transaction is open. That row is the horizon problem. Session I has a null `xact_start`.

**Senior-Level Follow-up:**

Session L's `pg_blocking_pids` returns one pid. That pid is `idle in transaction`, `ClientRead`, with an old `xact_start`. What is L actually waiting for?

**Answer:** L is waiting for the idle transaction to commit or roll back. The lock is held by a session that is itself waiting on the client, not by a query that is still computing. Canceling L only removes the waiter. Ending the idle transaction, or letting `idle_in_transaction_session_timeout` end it, is what grants the lock. `ClientRead` on the blocker means the application has the next move.

### DB-099 — Statistics counters are not part of the WAL

**Difficulty:** Senior

**Category:** Statistics

**Question:**

Where do `pg_stat_*` counters live, what survives a clean shutdown, and what can a crash lose?

**Context and Constraints:**

PostgreSQL 16. Cumulative statistics are in shared memory. There is no stats-collector process. Hypothetical crash of the primary after a period of ordinary traffic. The data files and WAL are intact. `pg_stat_statements` is not installed and is not the subject.

**Senior Engineer's Answer:**

The counters behind `pg_stat_activity`'s structural fields, and the cumulative views such as `pg_stat_database`, `pg_stat_user_tables`, `pg_stat_bgwriter`, and `pg_stat_wal`, are maintained in shared memory. PostgreSQL 15 removed the stats-collector process. PostgreSQL 16 has not brought it back. Backends update the shared counters as they run. A reader of the view takes a snapshot of that memory.

Those counters are not WAL-logged. They are not replayed to a standby as part of the heap. A standby has its own stats. On the primary, the server periodically writes the counters out so a clean shutdown can read them back. A crash can lose the updates since the last write. After recovery the tables and the committed rows are there, because WAL was replayed. `n_tup_ins`, `xact_commit`, `blks_hit`, `wal_bytes` can be short, or reset, relative to the pre-crash process. That is a lost counter, not a lost commit.

`stats_reset` on a view is when someone last called `pg_stat_reset` or a more specific reset function, or when the stats were freshly initialized. A crash that drops the on-disk stats copy looks similar: the counters are not a history of the cluster's life. Using `n_tup_upd` since cluster birth as an audit of updates is the mistake. The audit is the data, or a log, or an extension that records what you needed. The view is an operational sample that is allowed to go backwards across a crash.

`pg_stat_activity` is slightly different in kind. It describes backends that exist now. After a crash those backends are gone and the view shows the new ones. There is no counter there to "lose" except the cumulative views around it. `xact_start` on a new session is a new transaction, not a restored one.

Autovacuum's decisions use these counters, including `n_dead_tup` and `n_ins_since_vacuum`. A crash that loses them can delay a vacuum that the lost counts would have triggered, until new activity builds the counts back up. It does not disable the anti-wraparound path, which uses `age(relfrozenxid)` from the catalogs, and those catalogs are WAL-logged.

**Practical Implementation:**

```sql
SELECT datname, xact_commit, tup_inserted, temp_bytes, stats_reset
FROM pg_stat_database
WHERE datname = current_database();
```

Record `stats_reset` with the sample. A comparison across a crash is not a rate if the counters were reinitialized. `pg_stat_reset()` is the explicit wipe, and it updates `stats_reset`. You do not need it to explain a drop after a crash. Recovery already explains it. `pg_class.relfrozenxid` and `pg_class.reltuples` are catalog fields, written by vacuum and analyze through WAL-logged updates. Prefer them over a reset cumulative counter when the question is freeze age or the last analyzed row estimate.

**Trade-offs and Alternatives:**

Keeping stats out of WAL makes every tuple read and every buffer hit cheap. Putting them in WAL would turn monitoring into a write amplification problem. The cost is that a crash, or `pg_stat_reset`, starts a new baseline. External monitoring that stores the samples you scraped keeps the history the server does not promise. Scrape on an interval, store the timestamp, and treat a backwards counter as a reset, not as negative traffic.

**Common Mistakes:**

- Investigating missing rows because `tup_inserted` is lower after recovery. The rows follow WAL. The counter does not.
- Expecting a standby's `pg_stat_user_tables` to match the primary's. The standby counts its own reads and its own applies.
- Calling `pg_stat_reset` during an incident because the numbers looked inconvenient. You erased the baseline you were using.
- Waiting for `n_dead_tup` to remember its pre-crash value before trusting that wraparound vacuum still works. Freeze age is `age(relfrozenxid)`, in the catalog, and it survived.

**Senior-Level Follow-up:**

Recovery finishes. `pg_stat_database.xact_commit` is far below what monitoring scraped five minutes before the crash. Committed rows from that window are in the tables. Which store is wrong?

**Answer:** Neither store is corrupt. The table is the WAL-backed result and has the commits. The counter is a shared-memory statistic that was not flushed, and it lost increments. Start a new baseline from `stats_reset` or from the first sample after recovery. Do not add the missing delta back by hand and call it a repair. The next increments are the new series.

### DB-100 — A checksum detects a damaged page and does not repair it

**Difficulty:** Senior

**Category:** WAL

**Question:**

What does a data checksum prove, what does a mismatch do, and how is that different from `full_page_writes`?

**Context and Constraints:**

PostgreSQL 16. Checksums are chosen at `initdb` or enabled later only while the server is shut down. The hypothetical cluster in the earlier WAL questions was initialized without them, so `data_checksums` is off there. This question says what changes when they are on. Default block size 8 kB. `full_page_writes` is on.

**Senior Engineer's Answer:**

A data checksum is a short value in the page header, computed over the page. When checksums are enabled, a backend that reads a page checks it. A mismatch means the page on disk is not the page PostgreSQL wrote. The read fails with an invalid-page error. PostgreSQL does not reconstruct the page from the checksum. The checksum is a detector. It has none of the original bytes in a form you can put back.

`full_page_writes` is the reconstruction path, and only during WAL replay. The first WAL-logged change to a page after a checkpoint stores an image of the page. Recovery that finds a torn page installs that image and applies later records. That repairs a tear that happened in a crash. It is not an online healer for a page that fails its checksum while the primary is up and serving. A checksum failure on a running primary is a damaged block. The repair is a restore from a backup you trust, or a standby that does not have the damaged page. Vacuum will not rewrite the page into health. `pg_resetwal` does not rebuild a heap page.

Checksums are off unless `initdb` was run with them or `pg_checksums` was run against a shut-down data directory. `SHOW data_checksums` reports the running cluster. There is no `ALTER SYSTEM` that turns them on. Enabling them on a large cluster is an offline copy of every page. Leaving them off is why a torn write can sit unread until something touches the page, and why hint-bit updates are not WAL-logged by default.

When checksums are on, hint-bit updates are WAL-logged, because a torn hint write would change the page and fail the checksum. `wal_log_hints` is ignored in that case. It exists to get the same hint-bit full page images on a cluster that does not have checksums. The two features meet there and nowhere else: checksums detect, full page images in WAL rebuild a torn page at recovery, and hint-bit logging exists so a hint write cannot sneak a tear past a checksum.

**Practical Implementation:**

```sql
SHOW data_checksums;
SHOW full_page_writes;
SHOW wal_log_hints;
```

On the cluster described in the earlier questions, the first is off and `full_page_writes` is on. A backup of that cluster can still be recovered through torn pages because of the images, and it will not raise a checksum error, because there is no checksum to test. After a real `initdb --data-checksums`, `data_checksums` is on and hint-bit WAL follows. `pg_checksums --check` verifies a shut-down data directory. It is not a query you run against a live primary.

**Trade-offs and Alternatives:**

Checksums turn silent torn pages and some classes of storage corruption into a loud read error, and they add CPU on every page write and read plus WAL for hint bits. They are worth it when the storage stack can corrupt a page without PostgreSQL's own tear being the only story, which is most disks. They do not replace backups, and they do not replace `full_page_writes`. Running with checksums on and `full_page_writes` off detects the tear recovery can no longer rebuild. That combination is worse than either default. `wal_log_hints` on, checksums off, is the way to measure the extra WAL before you take the offline conversion.

**Common Mistakes:**

- Turning checksums on to "fix" a suspect table. They only report the next read of a bad page. Enabling them is offline, and a bad page fails the enablement check.
- Disabling `full_page_writes` because checksums will catch a tear. Detection without the WAL image is an error at recovery, not a repaired page.
- Expecting `VACUUM (FULL)` to heal a checksum mismatch. The rewrite reads the pages. The bad page errors when it is read.
- Reading `data_checksums = off` as "the pages have no header." The header is there. The checksum field is not maintained, so a torn write is not named by this mechanism.

**Senior-Level Follow-up:**

Checksums are on, `full_page_writes` is on, and a crash tears a heap page that had already been imaged in WAL this checkpoint interval. Recovery starts. What puts the page back, and what would the checksum alone have done?

**Answer:** Recovery installs the full page image from WAL and applies the later records for that page. The checksum of the torn page is what would have failed a read. It does not supply the bytes. The image supplies the bytes. With `full_page_writes` off, the checksum would still fail and recovery would have no image to install.
