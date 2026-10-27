# DB02 — PostgreSQL internals and data storage

PostgreSQL 16. Questions DB-051–DB-100.

Process model, MVCC, heap storage, vacuum and freezing, WAL, buffer cache, planner stats, and pooling. Index layout and isolation anomalies are later files. Schemas are hypothetical; quoted defaults are PostgreSQL 16 settings, not measured values.

### DB-051 — The postmaster is the parent of every other process

**Difficulty:** Intermediate

**Category:** Processes

**Question:**

What does the postmaster do, and which long-lived processes does a normal PostgreSQL 16 primary start? Assume `archive_mode` off and no standby.

**Answer:**

The postmaster is the parent process. It listens for connections, starts the helper processes, and forks a backend for each client. It does not execute SQL itself.

On this primary you should see a checkpointer, a background writer, a WAL writer, the autovacuum launcher, and the logical replication launcher. The launcher is present because `max_logical_replication_workers` defaults above zero, even with no subscriptions. Client backends appear as sessions connect, and a parallel query can add workers. `pg_stat_activity` lists those children by `backend_type`. The postmaster itself is not a row. There is no archiver and no WAL sender in this setup.

**Code:**

```sql
SELECT backend_type, count(*) FROM pg_stat_activity
GROUP BY 1 ORDER BY 1;
```

**Trade-offs:**

One process per connection keeps a fault in one session from corrupting another. The cost is more backends. A pool changes how many clients share backends. It does not remove the helper processes.

**Follow-up:**

A backend segfaults. What happens before new work is accepted?

Answer: The postmaster treats shared memory as unsafe. It stops the other backends, throws that memory away, and recovers from the last checkpoint by replaying WAL. Committed work that was flushed survives. The crashed backend's private memory does not.

### DB-052 — One client session is one backend, plus any parallel workers it starts

**Difficulty:** Intermediate

**Category:** Processes

**Question:**

What is the relationship between a client connection and an OS process? When does one session become more than one process? Use PostgreSQL 16 defaults (`max_connections` 100, parallel workers enabled, no pooler).

**Answer:**

With no pooler, one client connection is one backend process for the life of the session. That process holds the session's state. `max_connections` limits those client backends. The default reserve of three is for superusers, so ordinary roles share the rest. Autovacuum workers sit outside that cap.

A parallel query can add worker processes, up to the per-query and cluster limits. They share the leader's snapshot and exit when that part of the plan finishes. An idle backend still occupies a connection slot. `work_mem` is a ceiling for one sort or hash, not memory reserved up front for the connection.

**Trade-offs:**

Raising `max_connections` enlarges shared structures. It does not make each backend cheaper. A large number of clients belongs behind a pool.

**Follow-up:**

Plan wants 2 parallel workers, but `max_parallel_workers` is exhausted. How many processes run the statement?

Answer: The leader always runs it. The gather may get fewer workers, including zero. It does not wait for a free slot, and it does not take over another session's backend.

### DB-053 — Three processes write, and they do not write the same thing

**Difficulty:** Senior

**Category:** Processes

**Question:**

What does the checkpointer write, what does the background writer write, and what does the WAL writer write? Assume `synchronous_commit` on.

**Answer:**

These three processes write different things. The checkpointer writes dirty shared buffers out to data files, asks the kernel to flush them, and records the redo point where crash recovery will start. A checkpoint is triggered by time or by `max_wal_size`.

The background writer writes some dirty buffers that look likely to be evicted soon. It does not record a recovery point. The WAL writer flushes WAL from memory toward disk. With `synchronous_commit` on, a committing backend still waits until its own commit record is flushed. The heap page can stay dirty after that durable commit.

**Trade-offs:**

Shorter checkpoints mean less WAL to replay and more frequent data writes. A busier background writer keeps backends off eviction writes. It never replaces the checkpoint record.

**Follow-up:**

Clock sweep finds a dirty unpinned buffer the bgwriter has not written. Who writes it? Is that a commit?

Answer: The backend that needs the slot writes the page so it can reuse it. That is eviction, not a commit. Commit durability is a WAL flush on a separate path.

### DB-054 — A checkpoint is the redo point recovery starts from

**Difficulty:** Senior

**Category:** WAL

**Question:**

What does a checkpoint record, and what does crash recovery actually replay? `wal_level` default `replica`, `fsync` on, `full_page_writes` on.

**Answer:**

A checkpoint is a position in the WAL from which the data files plus later WAL can rebuild a consistent cluster. The checkpointer writes dirty buffers, syncs the files, and stores that redo location. On a crash, recovery starts at the last completed checkpoint and applies WAL in order.

A flushed commit is replayed as committed. No flushed commit record means the transaction aborts. `max_wal_size` triggers checkpoints so old segments can be reused. It is not a disk quota. A replication slot or a failing archive command can keep more WAL than that target.

**Trade-offs:**

Time-based checkpoints bound recovery after a quiet period. WAL-volume checkpoints bound recovery under heavy writes. A manual `CHECKPOINT` before a planned restart shortens startup. It is not something to run on every commit.

**Follow-up:**

Checkpoint in progress; a transaction commits; power fails. Is the commit present after restart?

Answer: Yes, if `synchronous_commit` was on and `COMMIT` had returned. Recovery starts from the previous completed checkpoint and replays through that commit. The heap page can be rebuilt from WAL.

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

### DB-056 — The first change to a page after a checkpoint logs the whole page

**Difficulty:** Advanced

**Category:** WAL

**Question:**

Why does PostgreSQL log a full page image, and when during the checkpoint cycle does it do that? Default `full_page_writes` on, 8 kB blocks.

**Answer:**

An 8 kB page can tear if the disk writes a smaller unit. Later WAL records describe only the change, so they need an intact previous image.

With `full_page_writes` on, the first change to a page after a checkpoint logs the whole page. Later changes log only the delta until the next checkpoint. Recovery restores the image, then applies the deltas. That is why WAL volume jumps after a checkpoint. A hint-bit-only update logs a full page only when checksums or `wal_log_hints` are on. The checksum detects a tear. The image rebuilds the page.

**Trade-offs:**

The default costs extra WAL and archive bytes so recovery is safe. `wal_compression` shrinks the images. Longer checkpoint intervals mean fewer images and a longer replay. Turning images off is safe only if an 8 kB write cannot tear.

**Follow-up:**

Page imaged once, then updated ten times; crash before next checkpoint. Which WAL does recovery need?

Answer: That full page image, then the ten change records in order. The deltas alone are unsafe if the page on disk was torn.

### DB-057 — synchronous_commit and fsync fail in different ways

**Difficulty:** Senior

**Category:** WAL

**Question:**

What can a crash lose if `synchronous_commit` is off, and what can it lose if `fsync` is off? Change each alone from default `on`.

**Answer:**

These switches fail differently. `synchronous_commit = off` lets the backend return after placing the commit record in WAL buffers. The WAL writer flushes within about `wal_writer_delay`. A crash can drop commits that the client was already told succeeded. Replay stops at the last flushed commit, and the cluster stays consistent. You lose a short tail of transactions, not a random mix of pages.

`fsync = off` lets PostgreSQL skip forcing WAL and data files onto durable media. Power loss can leave torn or unreplayable files. That is corruption, not a bounded window of lost commits. The two settings are independent.

**Trade-offs:**

`synchronous_commit = off` can fit data you can rebuild, if the loss window is acceptable. `fsync` off has no safe repair in the application. Prefer both on, with group commit and short transactions.

**Follow-up:**

Both on; `COMMIT` returns; power fails before next checkpoint with dirty heap. Why does the row survive?

Answer: The commit record was flushed before `COMMIT` returned, and `fsync` made that flush durable. Recovery rebuilds the heap from WAL. A dirty heap page at the crash is allowed.

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

### DB-061 — A heap page is line pointers and tuple versions

**Difficulty:** Intermediate

**Category:** Heap storage

**Question:**

How is a heap page laid out, and which header fields does visibility read? Default 8 kB blocks.

**Answer:**

A heap page is 8 kB. The header is at the front, line pointers grow forward, and tuple bytes grow backward. Free space is the gap between `pd_lower` and `pd_upper`. A `ctid` is the block number plus a line-pointer slot, not a permanent address for the values.

The tuple header holds `xmin`, `xmax`, a command id, `t_ctid`, and an infomask for hint bits, locks, and HOT. User columns follow. A wide value may be only a TOAST pointer. Setting hint bits can dirty a page on `SELECT`. Without checksums or `wal_log_hints`, that hint-only change may skip WAL.

**Trade-offs:**

Line pointers let vacuum free tuple bytes without rewriting every `ctid`. A row is not one fixed slot for its whole life. A lower `fillfactor` leaves room on the page for a later HOT update.

**Follow-up:**

Hint bits set by `SELECT` not flushed; crash. Is the committed balance visible? Are hints still set?

Answer: The balance is visible, because the commit is in the WAL. The hints may be clear. The next reader recomputes them from the commit log.

### DB-062 — A dead tuple occupies space until something reclaims it

**Difficulty:** Intermediate

**Category:** Heap storage

**Question:**

After insert → update (indexed `status`) → delete all commit, which versions are live/dead, and what still holds their bytes? No other snapshot open.

**Answer:**

Both heap versions are dead to every new snapshot. The inserted version was superseded by the update, and the updated version was deleted. `DELETE` stamps `xmax` and does not store a new row. The bytes and the line pointers remain on the page. Index entries for those versions, including the primary key, also remain until vacuum.

After vacuum or a page prune frees the line pointers, later inserts can reuse the space. The file does not have to shrink. `n_dead_tup` is the counter autovacuum watches, and it can lag the real page contents.

**Trade-offs:**

Leaving dead tuples avoids rewriting the table on every delete. Updating an indexed column that changes often creates that debt on every write. Do not index a column you do not need to search.

**Follow-up:**

Another session still holds a snapshot from when the row was `'open'`. What can vacuum remove?

Answer: Not a version that snapshot still needs. Vacuum removes a tuple only when every snapshot agrees it is dead. The old snapshot holds that horizon until the transaction ends.

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

### DB-066 — VACUUM FULL rewrites the table and blocks everyone

**Difficulty:** Senior

**Category:** Vacuum

**Question:**

What does `VACUUM FULL` do that ordinary `VACUUM` does not, and when is the lock held?

**Answer:**

`VACUUM FULL` builds a new compact copy of the heap and rebuilds the indexes, then swaps them in. That returns space to the operating system, including holes in the middle that ordinary vacuum would only have marked reusable.

It holds `ACCESS EXCLUSIVE` for the rewrite and the swap. Readers and writers wait. Ordinary vacuum has usually already made the space reusable without that lock. Use `VACUUM FULL` when you must shrink the file now. Otherwise leave the free space for new inserts, and reindex only the indexes that are actually bloated.

**Trade-offs:**

`VACUUM FULL` shrinks the files and blocks everyone while it rebuilds the indexes. Ordinary vacuum plus free-space reuse is enough for most insert-heavy tables.

**Follow-up:**

Ordinary vacuum already cleaned indexes and FSM. What does FULL still improve, and what stays locked?

Answer: The file size. Internal holes remain until the rewrite. The exclusive lock is held from the start of the copy until the new heap and indexes are swapped in.

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

### DB-068 — Vacuum's horizon is the oldest snapshot and the oldest running xid

**Difficulty:** Advanced

**Category:** Vacuum

**Question:**

What keeps vacuum from removing a tuple already dead to every new snapshot? Which sessions do that, and which open transactions do not?

**Answer:**

Vacuum's horizon is the oldest snapshot still published (`backend_xmin`) and the oldest real transaction id still running (`backend_xid`). A dead tuple newer than that horizon stays, because some session might still be allowed to see it.

Repeatable Read and Serializable publish `backend_xmin` for the whole transaction. Read Committed publishes it only while a statement runs. A write or a row lock also holds `backend_xid` until the transaction ends. A Read Committed session idle after a plain `SELECT`, with no xid, usually holds neither.

**Follow-up:**

A idle after `SELECT 1`; B idle after `UPDATE` (uncommitted). Who holds the horizon?

Answer: B does, through `backend_xid`, until commit or rollback. A released its statement snapshot and never received a real transaction id.

### DB-069 — Freezing takes a tuple out of xid comparison

**Difficulty:** Senior

**Category:** Freeze and wraparound

**Question:**

What does it mean to freeze a tuple, and when does vacuum do it?

**Answer:**

Transaction ids are compared on a circle. Eventually an old committed id would look like it is in the future. Freezing marks a committed tuple so visibility no longer compares its inserting xid with that moving horizon. The tuple stays visible without depending on the old id.

Vacuum freezes a tuple once its age passes `vacuum_freeze_min_age`, default 50 million. Near `vacuum_freeze_table_age` it visits pages it would otherwise skip, so `relfrozenxid` can move. A fully frozen page can be marked all-frozen, and later vacuums may skip it.

**Follow-up:**

Aggressive vacuum finishes; why is `age(relfrozenxid)` ~50M, not 0?

Answer: Tuples younger than `vacuum_freeze_min_age` are left unfrozen. `relfrozenxid` is the oldest xid still in the table, so it sits near that cutoff, plus anything inserted while vacuum ran.

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

### DB-071 — A page can sit in shared buffers and in the operating-system cache

**Difficulty:** Senior

**Category:** Buffer cache

**Question:**

What does `shared_buffers` hold, what does the OS page cache hold, and what does a buffer miss mean?

**Answer:**

`shared_buffers` is PostgreSQL's pool of 8 kB pages, shared by every backend. A miss means the page was not there. PostgreSQL asks the kernel, which may serve its page cache or read disk, and copies the page into the pool. The same page can live in both caches.

The kernel cache still matters for WAL, cold pages, and anything that does not fit. In `EXPLAIN (ANALYZE, BUFFERS)`, a shared read means "not in `shared_buffers`." It does not by itself mean a disk read.

**Follow-up:**

Second `count(*)` is all shared hits; OS drops its page cache. Do those hits remain?

Answer: Yes, for pages that are still in `shared_buffers`. Dropping the kernel cache does not empty that pool. A page already evicted from the pool can miss and then hit disk.

### DB-072 — effective_cache_size is a cost input, not a cache

**Difficulty:** Advanced

**Category:** Buffer cache

**Question:**

What does `effective_cache_size` change, and what does it leave allocated exactly as before?

**Answer:**

`effective_cache_size` is a planner hint. It says how much RAM is likely to cache pages, counting `shared_buffers` plus the operating-system cache. The planner uses it when it costs random page fetches. A larger value makes an index plan look cheaper. A smaller value favors a sequential scan.

It allocates nothing. `shared_buffers` does not grow, no pages are pinned, and the real hit rate is unchanged. A wrong value can pick a worse plan while the caches underneath stay exactly the same size. Set it near the RAM you expect to be available for PostgreSQL's files, and confirm plans with `EXPLAIN`.

**Follow-up:**

`shared_buffers` 128 MB, host has ~64 GB free for page cache, `effective_cache_size` 4 GB. What does the planner assume vs reality?

Answer: The planner costs as if about 4 GB of cache exists. The kernel can hold a much larger working set. Raise `effective_cache_size` toward the RAM you can actually use. That still does not enlarge the 128 MB pool.

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

### DB-074 — The pool exists so client count and backend count can differ

**Difficulty:** Intermediate

**Category:** Connections

**Question:**

Why put a pool between apps and PostgreSQL? What is pooled, and what is not?

**Answer:**

Each direct session costs one backend, and `max_connections` caps them, with a reserve for superusers. Autovacuum and parallel workers sit outside that cap. A backend has private memory, and an open transaction can hold locks and a snapshot.

A pool keeps fewer backends than client sockets. It lends one for a session or a transaction, then takes it back. You are pooling that process, not SQL correctness and not `shared_buffers`. The checkpointer and the other helpers still run once per cluster.

**Trade-offs:**

Session pooling keeps one backend for the client, so session state survives. Transaction pooling serves more clients per backend and drops that state between transactions.

**Follow-up:**

50 processes × (2 active + 10 idle “just in case”) vs transaction pooling under `max_connections` 100.

Answer: Holding every connection for the session would want about 600 backends, which is over the cap. Transaction pooling needs backends for real concurrency, about 100 if all 50 processes are active at once. Idle clients stay as sockets. Size the pool below `max_connections`.

### DB-075 — Transaction pooling drops session state at COMMIT

**Difficulty:** Advanced

**Category:** Connections

**Question:**

What does PgBouncer transaction pooling guarantee about which backend runs a transaction, and which PostgreSQL features break?

**Answer:**

In transaction pooling, PgBouncer assigns a server connection for one transaction and returns it at `COMMIT` or `ROLLBACK`. The next transaction from the same client may run on a different backend. Anything stored only in that backend's session is gone.

That breaks a session `SET`, a server-side prepared statement, a temporary table, `LISTEN` / `NOTIFY`, a session advisory lock, and a `WITH HOLD` cursor. Session pooling keeps one backend for the client, so those survive. In transaction mode the application must reapply settings on every transaction.

**Follow-up:**

Transaction mode: `LISTEN`, then `COMMIT`. Later `NOTIFY` from elsewhere—why might the client miss it?

Answer: `LISTEN` was registered on the backend that went back to the pool at commit. The next transaction may borrow a backend that is not listening. Session pooling, or a direct connection, keeps the same backend.

### DB-076 — A wide attribute is stored beside the heap, in a TOAST table

**Difficulty:** Intermediate

**Category:** TOAST

**Question:**

Where does PostgreSQL put a value that does not fit in the heap tuple, and what does a query pay to read it back?

**Answer:**

A heap tuple has to fit in one 8 kB page. When a row would be too wide, PostgreSQL compresses a large value and, if needed, moves it to that table's TOAST table. The chunks are about 2 kB. The heap keeps a short pointer, 18 bytes, instead of the value. The TOAST table's oid is `reltoastrelid`. Narrow columns stay in the heap tuple.

Reading the value fetches those chunks and decompresses them. A query that never touches the wide column does not pay that I/O.

**Follow-up:**

`count(*)` vs `count(body)` on non-null toasted `body`—who reads toast?

Answer: `count(*)` does not. `count(body)` only needs to know the column is not null, which is in the heap tuple's null bitmap, so it does not read the chunks. `length(body)` or `SELECT body` does detoast.

### DB-077 — The storage strategy chooses compression and whether the value may leave the page

**Difficulty:** Senior

**Category:** TOAST

**Question:**

What do `PLAIN`, `MAIN`, `EXTERNAL`, and `EXTENDED` change, and when is `EXTERNAL` right for wide `text`?

**Answer:**

The storage strategy decides whether a value may be compressed and whether it may leave the heap page. `PLAIN` does neither, and is for fixed-length types. `EXTENDED`, the default for `text`, `bytea`, and `jsonb`, compresses and then moves the value out of line if the row is still too wide. `MAIN` compresses but prefers to stay in the heap. `EXTERNAL` moves out of line and does not compress.

`ALTER TABLE ... SET STORAGE` affects later writes, not values already stored. Choose `EXTERNAL` when you mostly read a prefix and a few extra chunk reads beat decompressing the whole value.

**Follow-up:**

`body` is `EXTERNAL` out-of-line; `substring(body from 1 for 80)` vs compressed storage?

Answer: Uncompressed TOAST can read just the first chunks. A compressed value has to be fetched and decompressed as a whole before the slice.

### DB-078 — Hint bits cache commit status on the tuple

**Difficulty:** Senior

**Category:** MVCC

**Question:**

What do hint bits record, why can a `SELECT` dirty a heap page, and when is that write WAL-logged?

**Answer:**

Hint bits in the tuple header remember whether `xmin` and `xmax` committed or aborted, so later readers can skip the commit log. `COMMIT` does not set them. The first reader looks the status up, sets the bits, and dirties the buffer. A plain `SELECT` can dirty a page.

If checksums and `wal_log_hints` are off, a hint-only change often skips WAL. A crash may forget the bits. That is safe: they are a cache, and the commit log is the authority. Freezing is a different, WAL-logged write.

**Follow-up:**

Commit done, hints unset, clean page; `SELECT` sets hints; crash before write. Is the row visible?

Answer: Yes. The commit is in WAL and in the commit log. The hints were an unflushed cache. The next reader sets them again.

### DB-079 — pg_xact stores two bits of status for each transaction id

**Difficulty:** Senior

**Category:** MVCC

**Question:**

What does the commit log record, when is it updated relative to the commit WAL record, and when can old segments be removed?

**Answer:**

`pg_xact` is the commit log. It stores two bits for each transaction id: in progress, committed, aborted, or subcommitted. With `synchronous_commit` on, PostgreSQL flushes the commit WAL record before it marks the transaction committed. After a crash, WAL is the authority. Recovery sets the bits from the commit records it replays.

Hint bits on tuples are only a cache of this map. Once every database's `datfrozenxid` is past a range of ids, nothing will look those old bits up again. PostgreSQL can then delete those commit-log segments.

**Follow-up:**

Recovery sees commit record for xid 5000 but `pg_xact` still in progress. What happens?

Answer: Recovery marks 5000 committed. Missing hint bits do not leave it aborted. A later reader can set the hints from the commit log.

### DB-080 — A second locker turns xmax into a multixact id

**Difficulty:** Senior

**Category:** Locks

**Question:**

When does a row’s `xmax` stop being a single transaction id, and what does that id point at?

**Answer:**

A single row lock stores that transaction's id in `xmax`, with lock bits so readers know it is a lock and not a delete. A second lock that is allowed to coexist cannot fit in the same field. PostgreSQL replaces `xmax` with a multixact id and sets `HEAP_XMAX_IS_MULTI`. The members of that multixact live in `pg_multixact`.

`FOR KEY SHARE` plus another compatible lock is the usual case. Foreign keys take `FOR KEY SHARE`. A conflicting update waits instead of joining. Vacuum must keep the multixact until its members finish. A plain `SELECT` never becomes a member.

**Follow-up:**

A holds `FOR KEY SHARE`; B updates the primary key. Join multixact or wait?

Answer: B waits. Changing the key conflicts with `FOR KEY SHARE`. After A finishes, B can take its own lock.

### DB-081 — relfrozenxid advances only when every older page is accounted for

**Difficulty:** Advanced

**Category:** Freeze and wraparound

**Question:**

What does `pg_class.relfrozenxid` mean, and how can `VACUUM` finish, remove dead tuples, and leave `age(relfrozenxid)` unchanged?

**Answer:**

`relfrozenxid` is a promise: every transaction id older than this has been frozen or is otherwise gone from the table. The age of that value, compared with the next xid, is how close this table is to wraparound.

Ordinary vacuum may skip all-visible pages and freezes only tuples old enough to qualify. It can remove dead tuples and still leave an older unfrozen xid on a page it did not visit, so `relfrozenxid` stays put. Moving it takes a pass over every page that might hold an older xid. That is an aggressive or anti-wraparound vacuum.

**Follow-up:**

`age(relfrozenxid)` 80M before and after `VACUUM`; dead tuples dropped. Closer to wraparound?

Answer: No. The age did not change. Cleaning dead tuples is not the same as freezing. The age matters when it approaches the freeze limit or the wraparound stop.

### DB-082 — An idle transaction blocks vacuum while a snapshot or an xid is still registered

**Difficulty:** Senior

**Category:** Vacuum

**Question:**

Which `idle in transaction` session holds vacuum’s horizon, and which one does not?

**Answer:**

`idle in transaction` means the session is between statements and has not committed. That state alone does not tell you whether vacuum is stuck. Look at `backend_xmin` and `backend_xid` in `pg_stat_activity`.

The session holds the horizon when `backend_xmin` is set, meaning a snapshot is still published, or when `backend_xid` is set from a write or a row lock. Repeatable Read, Serializable, and Read Committed after `UPDATE` or `SELECT FOR UPDATE` do this. Read Committed idle after a plain `SELECT`, with no xid, usually holds neither and does not block vacuum.

**Follow-up:**

Same idle RC session ran `UPDATE` instead of `SELECT`. Horizon?

Answer: Yes. The update assigned `backend_xid`, and that id stays until commit or rollback, including while the session waits between statements.

### DB-083 — xact_start, query_start, and state_change measure different intervals

**Difficulty:** Intermediate

**Category:** Processes

**Question:**

On one `pg_stat_activity` row, what do `xact_start`, `query_start`, `state_change`, and `state` each mean?

**Answer:**

These columns answer different questions. `state` is `active`, `idle`, `idle in transaction`, and so on. `xact_start` is when the open transaction began, or null if there is none. `query_start` is when the current or last statement started. `state_change` is when `state` last changed.

An old `xact_start` with a fresh `query_start` is a long transaction on a short statement. An old `query_start` while `active` is a long statement. An old `state_change` while `idle` is a session waiting on its client.

**Follow-up:**

`idle`, null `xact_start`, `query_start` 40m ago, `state_change` 30m ago—what has it been doing?

Answer: Waiting on the client. The last statement started 40 minutes ago, and the session left its transaction 30 minutes ago. A null `xact_start` means it is not holding a transaction open.

### DB-084 — A long transaction limits what VACUUM is allowed to remove and freeze

**Difficulty:** Advanced

**Category:** Vacuum

**Question:**

A transaction has been open a long time. What can `VACUUM` still do, and what must wait until that transaction ends?

**Answer:**

Vacuum can still remove tuples that are dead even to that old snapshot, update the free space map and visibility map on pages it is allowed to visit, and freeze tuples the horizon already permits. It cannot remove a version that snapshot is still allowed to see. It also cannot freeze past the transaction ids that snapshot or running xid still needs.

Dead tuples and bloat can pile up behind that horizon. Ending the transaction does not delete them. It only lets a later vacuum, with a newer horizon, remove and freeze what was stuck.

**Follow-up:**

Long transaction commits; autovacuum has not run. Is `n_dead_tup` already gone?

Answer: No. Commit made those versions removable. Vacuum still has to run before the tuples are removed and the counter drops.

### DB-085 — Heap bloat and index bloat are cleaned by different operations

**Difficulty:** Senior

**Category:** Vacuum

**Question:**

What is left in the heap after updates/deletes, what in an index, and which command shrinks each file?

**Answer:**

The heap keeps dead tuple versions until vacuum or prune marks the space reusable. The file shrinks only if trailing empty pages can be truncated, or if `VACUUM FULL` rewrites it. An index keeps dead entries until vacuum's index cleanup. The index file often stays large because the free space is internal.

Ordinary `VACUUM` makes space reusable. It does not reliably shrink an index file. `REINDEX` builds a compact index. `VACUUM FULL` rewrites the heap and the indexes under an exclusive lock.

**Follow-up:**

`n_dead_tup` 0, heap size stable, one secondary index many× heap. Will next ordinary `VACUUM` shrink the index?

Answer: No. There is nothing dead for vacuum to remove. The index stays large until `REINDEX` or `VACUUM FULL` builds a new one.

### DB-086 — A checkpoint can stall on sync, then the next writes log full page images

**Difficulty:** Advanced

**Category:** WAL

**Question:**

Monitoring shows write stalls on checkpoint cadence, then WAL bytes jump while SQL rate is flat. What are the two mechanisms?

**Answer:**

Two separate checkpoint effects line up on the same clock. Finishing a checkpoint asks the kernel to flush dirty data files. If many buffers are dirty, that sync stalls writers even though the SQL itself did not get heavier.

Once the new redo point exists, `full_page_writes` arms again. The next change to each page logs the whole 8 kB page, not a small delta. WAL bytes jump while the number of row changes stays flat. After a page has its image, later updates in that interval are ordinary small records, until the next checkpoint arms the images again.

**Follow-up:**

Page imaged once early, then updated ten more times before next checkpoint. How many full page images?

Answer: One image for that page in the interval. The ten later updates are normal WAL records. The next checkpoint arms the page again, and the first touch after that logs a new image.

### DB-087 — wal_level chooses how much of a change is logged

**Difficulty:** Senior

**Category:** WAL

**Question:**

What do `minimal`, `replica`, and `logical` include, and what does a default PostgreSQL 16 primary refuse if you set `minimal`?

**Answer:**

`wal_level` chooses how much detail goes into the WAL. `minimal` keeps enough to recover this server after a crash, and it may skip WAL for some bulk loads into a new relation. `replica` is the PostgreSQL 16 default. It logs enough for a physical standby and for archiving. `logical` includes everything `replica` has, plus what logical decoding needs.

A default primary has `max_wal_senders` above zero. Starting with `wal_level = minimal` is refused in that configuration, and `archive_mode` also requires at least `replica`. Changing `wal_level` needs a restart. You cannot switch it for one session.

**Follow-up:**

`wal_level = replica`; large `CREATE TABLE AS SELECT`. Are rows omitted from WAL like at `minimal`?

Answer: No. Skipping WAL for that bulk load is a `minimal` optimization. At `replica`, the statement is logged so a standby and an archive can rebuild the table.

### DB-088 — A sort or hash that crosses its memory limit writes temp files

**Difficulty:** Senior

**Category:** Memory

**Question:**

What does a temp file mean, which setting is the limit, and which tools show the spill without inventing its size?

**Answer:**

`work_mem` is the memory ceiling for one sort or hash, not for the whole query. Each parallel worker has its own. Past that limit, PostgreSQL spills runs or hash batches to temporary files under the data directory. That extra I/O is often why a query becomes slow.

Do not guess the size from a plain plan. `EXPLAIN (ANALYZE)` shows the spill, and `log_temp_files` logs it. `maintenance_work_mem` is separate. Vacuum and index builds use that, not query sorts.

**Follow-up:**

Plain `EXPLAIN` shows Sort. Will it write a temp file?

Answer: You cannot tell. Plain `EXPLAIN` does not run the sort. The spill appears in `EXPLAIN (ANALYZE)` after the statement executes.

### DB-089 — The free space map is how an insert finds a page with room

**Difficulty:** Intermediate

**Category:** Heap storage

**Question:**

What does the free space map record, and why can an insert after `VACUUM` leave `pg_relation_size` unchanged?

**Answer:**

The free space map records free bytes on each heap page. An insert uses it to reuse a page instead of always extending the file. After vacuum removes dead tuples and updates the map, new inserts fill those pages, so `pg_relation_size` stays flat.

The file grows when no tracked page has room. Vacuum can truncate empty pages at the end. It does not return a hole in the middle to the operating system. The map keeps offering that hole to inserts.

**Follow-up:**

Only page 0 empty (in FSM); page 1 has a live tuple. Vacuum with truncation—does the main fork lose a page?

Answer: No. Truncation needs empty pages at the end. Page 0 remains, and the next insert that fits reuses it through the free space map.

### DB-090 — Crash recovery empties an unlogged table

**Difficulty:** Senior

**Category:** WAL

**Question:**

What does `CREATE UNLOGGED TABLE` skip, and what does the table contain after a crash?

**Answer:**

An unlogged table skips WAL for its heap and index changes. Writes are faster, and the contents are not shipped to a standby or an archive. PostgreSQL keeps a small init fork as the empty starting image.

Crash recovery throws away the data fork and resets the table from that init fork. Whatever was inserted before the crash is gone. A clean shutdown does not do this. Use an unlogged table for scratch data you can rebuild. Do not use it for anything that must survive a crash.

**Trade-offs:**

You save WAL and write latency, and you lose the table on a crash. A standby never has the rows. A normal logged table pays for WAL so the data is durable and can be replicated.

**Follow-up:**

After crash empties `scratch`, a later `INSERT` commits with no second crash. Survive clean restart?

Answer: Yes. Only crash recovery resets the table from the init fork. A clean shutdown keeps rows inserted after that recovery.

### DB-091 — A temporary table is private to the session and is not in the WAL

**Difficulty:** Intermediate

**Category:** Heap storage

**Question:**

Who can see a temporary table, where do its pages live, and what removes it?

**Answer:**

A temporary table belongs to the session that created it. Other sessions cannot read it. Its name lives in that backend's temporary schema, and its pages live in temporary files and `temp_buffers`. The rows are not written to WAL, so a standby or an archive never sees them.

The table disappears when the session ends. `ON COMMIT` can delete the rows or drop the table at each commit. `ON COMMIT PRESERVE ROWS` keeps them, still only for that session.

**Follow-up:**

Creator commits (`ON COMMIT PRESERVE ROWS`) and stays connected. Can another session `SELECT`? See rows in WAL?

Answer: No to both. The table is still private to the owner, and those inserts were not WAL-logged for replication or archiving.

### DB-092 — A real transaction id is assigned on the first write

**Difficulty:** Intermediate

**Category:** MVCC

**Question:**

When does a backend get a real transaction id, and what does it have before that?

**Answer:**

`BEGIN` does not take a permanent transaction id. The backend gets a virtual xid, enough for some lock-table entries, and the 32-bit counter does not move. A real xid is assigned on the first `INSERT`, `UPDATE`, `DELETE`, or locking read such as `SELECT FOR UPDATE`.

A plain `SELECT` does not take one, so `backend_xid` stays null. `backend_xmin` can still be set, especially in Repeatable Read or Serializable. Only real xids age the cluster toward wraparound. A long read-only transaction can still hold a snapshot horizon.

**Follow-up:**

RC session runs `SELECT ... FOR UPDATE`, changes no column, goes idle. Real xid?

Answer: Yes. The row lock assigns a real xid. `backend_xid` stays set until commit or rollback, and vacuum treats that transaction as still running.

### DB-093 — A savepoint assigns a subtransaction id

**Difficulty:** Senior

**Category:** MVCC

**Question:**

What does `SAVEPOINT` cost in transaction ids, and why can a PL/pgSQL `EXCEPTION` handler do the same in a loop?

**Answer:**

A savepoint starts a subtransaction. When it needs an id, it gets a subxid, not a new top-level xid. `ROLLBACK TO` aborts that subxid and the parent continues. `RELEASE` keeps the work under the parent. A subcommitted child is resolved through `pg_subtrans` to the parent's status.

A PL/pgSQL `EXCEPTION` handler is a subtransaction. Catching an error on every row of a loop assigns many subxids. PostgreSQL caches about 64 on the backend. Past that, checks go to `pg_subtrans` and get slower. Do not use an exception handler as per-row control flow.

**Follow-up:**

Parent updates note to `parent`; savepoint child sets `child` then `ROLLBACK TO`; parent commits. What does a later `SELECT` see?

Answer: The note is `parent`. The child subxid aborted. The parent xid committed.

### DB-094 — Relation locks use the lock table; row locks live on the tuple

**Difficulty:** Senior

**Category:** Locks

**Question:**

What does `max_locks_per_transaction` limit, and why can a transaction lock every row in `ticket` without exhausting it?

**Answer:**

`max_locks_per_transaction` sizes the shared lock table. Slots are roughly that setting times `max_connections` plus prepared transactions. It is a cluster-wide average, not a hard cap on one session, and raising it needs a restart.

The table holds heavyweight locks: relations, waited-for transaction ids, advisory locks, and similar objects. A granted row lock does not take a slot per row. It lives in `xmax` or a multixact. A waiter does take an entry. Locking hundreds of partitions can exhaust relation-lock slots even when no extra rows are locked.

**Follow-up:**

400 partitions; two sessions lock parent+all partitions with other sessions holding table locks—what setting fails?

Answer: `max_locks_per_transaction`, because each relation needs a lock-table slot. `work_mem` does not size that table.

### DB-095 — pg_wal can outgrow max_wal_size while a consumer still needs the segments

**Difficulty:** Senior

**Category:** WAL

**Question:**

Why is `pg_wal` larger than `max_wal_size`, and which consumers stop recycling segments?

**Answer:**

`max_wal_size` is a target that makes checkpoints happen so old WAL segments can be recycled. It is not a disk quota. A segment stays on disk while anything still needs it.

That includes the redo point of a checkpoint that has not finished, `wal_keep_size`, a replication slot whose `restart_lsn` has not moved, and an `archive_command` that is failing or has not finished. An inactive slot and a broken archive are the common reasons `pg_wal` grows without a matching rise in write rate. `max_slot_wal_keep_size` can limit how far a slot holds WAL. The default, -1, does not limit it.

**Follow-up:**

Archive command failing and an inactive slot with old `restart_lsn`; checkpoint current. Which alone lets checkpoint free the WAL?

Answer: Neither one. Each consumer keeps the segments. Fix the archive and drop or advance the slot. A checkpoint recycles only segments that nobody still needs.

### DB-096 — idle_in_transaction_session_timeout ends a session that is sitting in a transaction

**Difficulty:** Senior

**Category:** Vacuum

**Question:**

Which timeout ends an `idle in transaction` session, and which leave that session alone?

**Answer:**

`idle_in_transaction_session_timeout` ends a session that has been idle inside a transaction for too long. PostgreSQL rolls the transaction back and drops its snapshot, xid, and locks, so vacuum's horizon can move. It does not cancel a statement that is still `active`.

`statement_timeout` cancels the running statement. The session can then sit idle in an aborted transaction until the client ends the block. `idle_session_timeout` targets a session that is `idle` and not in a transaction. Killing the session does not remove dead tuples. Vacuum does that afterward.

**Follow-up:**

RR session killed by this timeout; a newer committed delete is still in the heap. What changed for vacuum?

Answer: The horizon moved, because `backend_xmin` is gone. The next vacuum may remove or freeze what that snapshot was protecting. The tuple stays on disk until vacuum runs.

### DB-097 — The buffer manager flushes WAL through the page LSN before it writes the page

**Difficulty:** Senior

**Category:** WAL

**Question:**

What does the page LSN mean, and what must be flushed before that page is written to its data file?

**Answer:**

Every heap or index page header has an LSN. It is the end of the last WAL record that changed that page. Before the checkpointer, the background writer, or a backend writes the dirty page to its data file, WAL must be flushed at least through that LSN.

That is the write-ahead rule. A data file never gets ahead of durable WAL. If a page is torn, recovery rebuilds it from the full page image and the WAL that follows. A client's `COMMIT` is the same idea applied to the commit record: the record is flushed before success is reported.

**Follow-up:**

Update committed; page dirty; LSN points at the update record; checkpointer about to write the page. What must it do?

Answer: Flush WAL through the page LSN if that has not happened. The commit flush already covered the commit record after the update, so the update's WAL is durable. The rule is still checked before the data file write.

### DB-098 — The wait event says what the backend is blocked on

**Difficulty:** Senior

**Category:** Processes

**Question:**

How do you tell a backend waiting on the client from one waiting on a lock or on a data-file read?

**Answer:**

Read `state` together with `wait_event_type` and `wait_event`. `idle` plus `Client` / `ClientRead` means the backend is waiting for the next command. That is a pooled or idle session, not a lock and not a disk read. `ClientWrite` means it is sending results to the client.

A lock wait shows type `Lock`, often with `transactionid` or `tuple`, while `state` is `active`. A data-file read shows type `IO` and an event such as `DataFileRead`. `pg_blocking_pids` names the session holding the lock. Do not treat every non-null wait event as saturation. Filter out idle `ClientRead` before you count busy backends.

**Follow-up:**

L’s blocker is `idle in transaction`, `ClientRead`, old `xact_start`. What is L waiting for?

Answer: L is waiting for that transaction to commit or roll back. The blocker holds the lock while it waits on its client. Canceling L only removes the waiter. End or kill the blocker to release the lock.

### DB-099 — Statistics counters are not part of the WAL

**Difficulty:** Senior

**Category:** Statistics

**Question:**

Where do `pg_stat_*` counters live, what survives a clean shutdown, and what can a crash lose?

**Answer:**

Since PostgreSQL 15, cumulative statistics live in shared memory. There is no stats-collector process. Backends update the counters, and `pg_stat_*` reads that memory. The counters are not in the WAL, and they are not replayed to a standby.

A periodic flush lets a clean shutdown restore them. A crash can lose increments since the last flush. Tables and commits are still recovered from WAL. A low `xact_commit` after a crash does not mean those transactions disappeared.

**Follow-up:**

After recovery, `xact_commit` is far below pre-crash monitoring, but rows from that window exist. Corrupt?

Answer: No. The heap came back from WAL. The counter lost increments that had not been flushed. Start a fresh monitoring baseline from `stats_reset` or from the post-crash values.

### DB-100 — A checksum detects a damaged page and does not repair it

**Difficulty:** Senior

**Category:** WAL

**Question:**

What does a data checksum prove, what does a mismatch do, and how is that different from `full_page_writes`?

**Answer:**

Data checksums are chosen at `initdb`, or enabled later while the server is shut down. Each page stores a checksum of the bytes PostgreSQL wrote. A mismatch on read raises an invalid-page error. The checksum is not a spare copy, so it cannot rebuild the page.

`full_page_writes` logs a full page image so crash recovery can restore a torn page and apply later WAL. It does not heal a checksum failure on a live primary. That needs a restore or a standby with a good page. Checksums also WAL-log hint-bit updates, the same idea as `wal_log_hints`.

**Follow-up:**

Checksums on, `full_page_writes` on; crash tears a page already imaged this interval. What repairs it at startup?

Answer: Recovery installs the full page image from WAL and applies the records after it. A checksum would reject the torn bytes. It does not supply the replacement. The image does.
