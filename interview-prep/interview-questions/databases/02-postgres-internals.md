# DB02 — PostgreSQL internals and data storage

PostgreSQL 16. Questions DB-051–DB-100.

Process model, MVCC, heap storage, vacuum and freezing, WAL, buffer cache, planner stats, and pooling. Index layout and isolation anomalies are later files. Schemas are hypothetical; quoted defaults are PostgreSQL 16 settings, not measured values.

### DB-051 — The postmaster is the parent of every other process

**Difficulty:** Intermediate

**Category:** Processes

**Question:**

What does the postmaster do, and which long-lived processes does a normal PostgreSQL 16 primary start? Assume `archive_mode` off and no standby.

**Answer:**

The postmaster listens, forks backends, and starts auxiliaries; it does not run SQL. On this primary: checkpointer, background writer, WAL writer, autovacuum launcher, logical replication launcher (default workers allowed), plus client backends and any parallel workers. `pg_stat_activity` lists children by `backend_type`; the postmaster is not a row. If shared memory is unsafe after a backend crash, the postmaster stops peers, discards shared memory, and recovers from the last checkpoint.

**Code:**

```sql
SELECT backend_type, count(*) FROM pg_stat_activity
GROUP BY 1 ORDER BY 1;
```

**Trade-offs:**

One process per connection isolates faults; cost is more backends. Pooling changes client-to-backend ratio, not the auxiliaries.

**Follow-up:**

A backend segfaults. What happens before new work is accepted?

Answer: Other backends are stopped; open work rolls back in recovery. Postmaster rebuilds shared memory and replays WAL from the last checkpoint redo. Flushed commits survive; the crashed backend’s private memory does not.

### DB-052 — One client session is one backend, plus any parallel workers it starts

**Difficulty:** Intermediate

**Category:** Processes

**Question:**

What is the relationship between a client connection and an OS process? When does one session become more than one process? Use PostgreSQL 16 defaults (`max_connections` 100, parallel workers enabled, no pooler).

**Answer:**

One client connection is one backend until disconnect; it owns session state. `max_connections` caps client backends (3 reserved for superusers); autovacuum workers are outside that cap. A parallel query can add workers (per-gather and cluster limits); they share the leader’s snapshot and exit when the parallel part ends. Idle backends still occupy a slot. `work_mem` is a per-operation ceiling, not a connection reservation.

**Trade-offs:**

Higher `max_connections` grows shared structures; it does not cheapen backends. Heavy client counts need a pool in front.

**Follow-up:**

Plan wants 2 parallel workers, but `max_parallel_workers` is exhausted. How many processes run the statement?

Answer: The leader always runs it. Gather may get fewer workers, down to zero. It does not wait for a slot or steal another client backend.

### DB-053 — Three processes write, and they do not write the same thing

**Difficulty:** Senior

**Category:** Processes

**Question:**

What does the checkpointer write, what does the background writer write, and what does the WAL writer write? Assume `synchronous_commit` on.

**Answer:**

Checkpointer writes dirty shared buffers at a checkpoint, syncs data files, and records the redo point (time or `max_wal_size`). Background writer writes a limited number of likely-evicted dirty buffers between checkpoints; it does not create a recovery point. WAL writer flushes WAL buffers. With `synchronous_commit` on, the committing backend still waits for its own commit flush. Heap may stay dirty after a durable commit.

**Trade-offs:**

Shorter checkpoints cut recovery WAL but write more often. Raising bgwriter pages keeps backends off eviction writes; it never replaces the checkpoint record.

**Follow-up:**

Clock sweep finds a dirty unpinned buffer the bgwriter has not written. Who writes it? Is that a commit?

Answer: The needing backend writes it to reuse the slot—eviction, not commit. Commit durability is flushing the commit WAL record on a different path.

### DB-054 — A checkpoint is the redo point recovery starts from

**Difficulty:** Senior

**Category:** WAL

**Question:**

What does a checkpoint record, and what does crash recovery actually replay? `wal_level` default `replica`, `fsync` on, `full_page_writes` on.

**Answer:**

A checkpoint is a WAL point from which data files plus WAL rebuild a consistent cluster. The checkpointer writes dirty buffers, syncs, then records the redo LSN in the control file. Recovery starts there and applies WAL in order. Flushed commits replay as committed; no flushed commit means aborted. `max_wal_size` is a checkpoint trigger target, not a hard disk quota; slots and archiving can retain more WAL.

**Trade-offs:**

Time-based checkpoints bound quiet recovery; WAL-volume checkpoints bound heavy load. Manual `CHECKPOINT` before a planned restart cuts startup replay; it is not for every commit.

**Follow-up:**

Checkpoint in progress; a transaction commits; power fails. Is the commit present after restart?

Answer: Yes if `synchronous_commit` was on and `COMMIT` returned—the commit WAL was flushed. Recovery uses the previous completed checkpoint’s redo and replays through that commit. Heap may be rebuilt from WAL.

### DB-055 — A commit waits for WAL, and the heap page can stay dirty

**Difficulty:** Senior

**Category:** WAL

**Question:**

Walk through `COMMIT` for one-row `UPDATE` when `synchronous_commit` is on. What is durable when it returns, and what may still be only in memory?

**Answer:**

`UPDATE` creates a new heap version and WAL for the change; that is not a commit. `COMMIT` appends a commit record and flushes WAL through it (`fsync` on means durable media). When it returns, that commit can be replayed. The heap page may still be dirty in `shared_buffers`; checkpoint, bgwriter, or eviction writes it later. Write-ahead: data pages are not written until their WAL is flushed. Group commit can share one flush; each `COMMIT` still waits for its durability.

**Trade-offs:**

`synchronous_commit = off` returns after buffering the commit; WAL writer flushes soon—lower latency, short loss window on crash. Remote sync levels wait on replicas.

**Follow-up:**

`UPDATE` ran; no `COMMIT`; power fails. What is `balance_cents` after startup?

Answer: The prior committed value (e.g. 100). Update WAL may exist, but without a commit record recovery aborts the transaction.

### DB-056 — The first change to a page after a checkpoint logs the whole page

**Difficulty:** Advanced

**Category:** WAL

**Question:**

Why does PostgreSQL log a full page image, and when during the checkpoint cycle does it do that? Default `full_page_writes` on, 8 kB blocks.

**Answer:**

An 8 kB page write can tear on smaller atomic sectors. Incremental WAL assumes a correct prior page image. With `full_page_writes`, the first modification after a checkpoint logs the whole page; later changes log deltas until the next checkpoint. Recovery restores the image, then applies later records. That is why WAL volume spikes after checkpoints. Hint-bit-only updates need images only with checksums/`wal_log_hints` on. Checksums detect tears; images reconstruct them.

**Trade-offs:**

Default on costs WAL/archive bytes for safe recovery. `wal_compression` shrinks images. Longer checkpoints mean fewer images and longer recovery. Off is safe only if 8 kB writes cannot tear.

**Follow-up:**

Page imaged once, then updated ten times; crash before next checkpoint. Which WAL does recovery need?

Answer: The full page image, then the ten change records in order. Deltas alone are unsafe if the on-disk page was torn.

### DB-057 — synchronous_commit and fsync fail in different ways

**Difficulty:** Senior

**Category:** WAL

**Question:**

What can a crash lose if `synchronous_commit` is off, and what can it lose if `fsync` is off? Change each alone from default `on`.

**Answer:**

`synchronous_commit = off`: backend returns after putting the commit in WAL buffers; flush follows within roughly `wal_writer_delay`. Crash can drop recently acknowledged commits. Replay stops at last flushed commit; the cluster stays consistent. `fsync = off`: server may skip forcing WAL and data to durable media. Power loss can leave torn or unreplayable files—corruption, not a bounded commit window. The switches are independent.

**Trade-offs:**

`synchronous_commit = off` fits reconstructible data with known loss risk. `fsync` off has no safe app-level repair. Prefer group commit and shorter transactions with both settings on.

**Follow-up:**

Both on; `COMMIT` returns; power fails before next checkpoint with dirty heap. Why does the row survive?

Answer: `synchronous_commit` flushed the commit record before return; `fsync` made that flush durable. Replay rebuilds the heap. Dirty heap at crash is allowed.

### DB-058 — An update adds a tuple version and leaves the old one

**Difficulty:** Intermediate

**Category:** MVCC

**Question:**

What does a committed `UPDATE` store, and what do `xmin` and `xmax` mean on each version?

**Answer:**

PostgreSQL does not overwrite in place. `INSERT` stores a tuple with `xmin` = inserter and empty `xmax`. `UPDATE` adds a new tuple (`xmin` = updater) and sets the old tuple’s `xmax` to that updater. After commit, new snapshots see the new version; the old stays until no snapshot needs it (vacuum/prune). `xmin` = who created the version; `xmax` = who deleted/superseded it (or a row lock with lock bits—not a delete). Same key can have multiple heap versions.

**Trade-offs:**

Versioning lets readers and writers proceed without blocking each other; cost is dead tuples (and often index entries) until vacuum. In-place overwrite would avoid that debt and break concurrent snapshot reads.

**Follow-up:**

Insert a second row and roll back. Must vacuum remove a “dead” row for visibility?

Answer: No other snapshot ever sees an aborted `xmin`. Vacuum may reclaim space later; rollback does not write a compensating delete—visibility fails on aborted `xmin`.

### DB-059 — A snapshot is the set of transaction ids a statement may see

**Difficulty:** Senior

**Category:** MVCC

**Question:**

What is in a snapshot, and how does it decide heap visibility? Ledger has committed 100→250, plus uncommitted updater U creating 300.

**Answer:**

A snapshot has oldest still-running xid (`xmin`), next unused xid (`xmax`), and in-progress xids (`xip`). Committed xids before `xmax` and not in `xip` are visible; aborted never are. Superseded 100 is invisible; 250 is visible because U’s `xmax` is in progress; 300’s `xmin` U is invisible. Own uncommitted work uses command ids. Hint bits cache commit status; the rule is still snapshot + `pg_xact`.

**Trade-offs:**

Per-statement snapshots (Read Committed) see other commits between statements. Holding one snapshot for the transaction (RR/Serializable) stabilizes the view and holds `backend_xmin` longer for vacuum.

**Follow-up:**

U rolls back. What does the reader’s next statement return, and what remains on the page?

Answer: Balance 250. Tuple C stays until vacuum/prune with aborted `xmin`. Rollback does not resurrect 100.

### DB-060 — A plain read does not lock the row a writer needs

**Difficulty:** Senior

**Category:** MVCC

**Question:**

Why can a `SELECT` run while another session’s `UPDATE` of the same row runs? What does block? Read Committed.

**Answer:**

Plain `SELECT` takes `ACCESS SHARE`; `UPDATE` takes `ROW EXCLUSIVE`—compatible. The reader takes no tuple lock; it uses a snapshot and sees the prior version while the writer’s xid is in progress. A second writer blocks on the first’s tuple lock in `xmax`. After the first commits, Read Committed rechecks `WHERE` on the new version. `SELECT FOR UPDATE` does wait. `ACCESS EXCLUSIVE` (e.g. `VACUUM FULL`) conflicts with readers.

**Trade-offs:**

Snapshot reads let reports scan while writers update; readers may see older values. Use `FOR UPDATE`/`FOR SHARE` when the reader must join the lock queue.

**Follow-up:**

W2 waited with `WHERE ... balance_cents = 250`; W commits 300. What does W2 store?

Answer: Zero rows. After wake-up, recheck fails on 300. No overwrite based on the obsolete `WHERE`.

### DB-061 — A heap page is line pointers and tuple versions

**Difficulty:** Intermediate

**Category:** Heap storage

**Question:**

How is a heap page laid out, and which header fields does visibility read? Default 8 kB blocks.

**Answer:**

Header at the start; line pointers grow forward; tuple bytes grow backward; free space is the middle (`pd_lower`/`pd_upper`). `ctid` is block + line pointer. Tuple header holds `xmin`/`xmax`, command id, `t_ctid`, and infomask (hint bits, lock/multixact/HOT flags). User columns follow; wide values may be TOAST pointers. Hint bits cache `pg_xact`; setting them can dirty a page on `SELECT`. Without checksums/`wal_log_hints`, that dirty may not be WAL-logged.

**Trade-offs:**

Line pointers let vacuum free bytes without rewriting every `ctid`. “The row” is not a fixed address for life. Low `fillfactor` leaves room for same-page HOT updates.

**Follow-up:**

Hint bits set by `SELECT` not flushed; crash. Is the committed balance visible? Are hints still set?

Answer: Balance yes (WAL-backed). Hints may be clear and are recomputed from `pg_xact` on the next read.

### DB-062 — A dead tuple occupies space until something reclaims it

**Difficulty:** Intermediate

**Category:** Heap storage

**Question:**

After insert → update (indexed `status`) → delete all commit, which versions are live/dead, and what still holds their bytes? No other snapshot open.

**Answer:**

Both heap versions are dead to new snapshots: insert superseded by update, update deleted. `DELETE` stamps `xmax`; no replacement row. Bytes and line pointers remain; secondary and PK index entries for those versions stay until vacuum. Space becomes reusable after vacuum/prune frees line pointers—file size need not shrink. `n_dead_tup` tracks this for autovacuum and may lag.

**Trade-offs:**

Leaving dead tuples avoids rewrite-on-delete. Hot updates of indexed columns pay vacuum debt every change; avoid indexing churn columns you do not query.

**Follow-up:**

Another session still holds a snapshot from when the row was `'open'`. What can vacuum remove?

Answer: Not versions that snapshot still needs. Removable only when every snapshot agrees they are dead; horizon includes the old snapshot until it ends.

### DB-063 — A HOT update does not add an index entry

**Difficulty:** Advanced

**Category:** Heap storage

**Question:**

When is an `UPDATE` a heap-only tuple (HOT) update, and what does that change for indexes and vacuum?

**Answer:**

HOT needs (1) no indexed column change—including expression/partial-index columns, bitwise—and (2) new version fits on the same page. Then indexes keep pointing at the chain root; no new index entries. Readers walk `t_ctid` on-page. Non-HOT needs vacuum’s index cleanup. Same-page prune can reclaim HOT dead members without index visits. Core BRIN alone does not forbid HOT. Lower `fillfactor` helps future HOT fit; it does not rewrite packed pages.

**Trade-offs:**

HOT makes narrow unindexed updates cheap. Levers: do not index hot columns; leave page free space. Indexed `status` changes cannot be HOT.

**Follow-up:**

Partial index `WHERE status = 'open'` on `id`. Note-only update vs status change—which can be HOT?

Answer: Note-only can (status bitwise unchanged). Status change cannot—predicate column counts as indexed. Fitting on-page is a separate requirement.

### DB-064 — The visibility map is what lets an index-only scan skip the heap

**Difficulty:** Senior

**Category:** Heap storage

**Question:**

What do the visibility map bits mean, and why can an Index Only Scan still read the heap?

**Answer:**

The visibility map marks pages all-visible (every tuple visible to all transactions) and, separately, all-frozen. An index-only scan can return the index key without a heap fetch when the page is all-visible. Otherwise it heap-fetches that `ctid`. Vacuum sets all-visible; an update clears it for the whole page. Plans named Index Only Scan still show heap fetches when the map bit is clear or the column is not in the index.

**Follow-up:**

Vacuum set all-visible; one row’s `note` updates. Effect on index-only scans of other rows on that page?

Answer: All-visible clears for the page. Until vacuum resets it, index-only hits on any `ctid` there may heap-fetch, including unchanged rows.

### DB-065 — VACUUM reclaims space inside the file

**Difficulty:** Intermediate

**Category:** Vacuum

**Question:**

What does an ordinary `VACUUM` of a table give back, and what does it leave the same?

**Answer:**

Ordinary `VACUUM` removes dead tuple bytes and dead index entries that no snapshot needs, updates the free space map and visibility map, and can freeze. Free space is reused by later inserts into those pages. It does not rewrite the table or rebuild indexes as a whole. File size shrinks only by truncating empty pages at the end under a short exclusive lock—not holes in the middle. It does not block ordinary reads/writes the way `VACUUM FULL` does.

**Follow-up:**

Page 0 empty after vacuum; page 1 still has a live row. Does `pg_relation_size` drop one page?

Answer: No. Truncation only cuts a trailing empty suffix. Middle empty pages stay and are reused via the free space map.

### DB-066 — VACUUM FULL rewrites the table and blocks everyone

**Difficulty:** Senior

**Category:** Vacuum

**Question:**

What does `VACUUM FULL` do that ordinary `VACUUM` does not, and when is the lock held?

**Answer:**

`VACUUM FULL` rewrites the heap compactly and rebuilds indexes, reclaiming file size ordinary vacuum left as internal free space. It takes `ACCESS EXCLUSIVE` for the rewrite and swap—readers and writers wait. Ordinary vacuum already made space reusable without that lock. Prefer ordinary vacuum + targeted `REINDEX` unless you must shrink the file now.

**Trade-offs:**

FULL shrinks files at the cost of blocking everyone and rebuilding indexes. Ordinary vacuum + FSM reuse is usually enough for insert-heavy workloads.

**Follow-up:**

Ordinary vacuum already cleaned indexes and FSM. What does FULL still improve, and what stays locked?

Answer: File size—holes stay inside the relation until rewrite. Exclusive lock held from copy start until new heap/indexes are swapped in.

### DB-067 — Autovacuum schedules itself from dead tuples, inserts, and age

**Difficulty:** Senior

**Category:** Vacuum

**Question:**

When does autovacuum vacuum `ticket`, when does it analyze it, and what is different about a wraparound worker?

**Answer:**

Autovacuum vacuum when dead tuples exceed `autovacuum_vacuum_threshold + scale_factor * reltuples` (defaults 50 + 0.2×), or insert thresholds trigger insert-vacuum. Analyze uses its own threshold/scale on modifications since analyze. Workers are launched by the launcher; they are not permanent. Anti-wraparound workers ignore `autovacuum = off`, aim to advance freeze horizons, and do not yield for ordinary lock conflicts the same way.

**Follow-up:**

`reltuples` 100, `n_dead_tup` 40. Does the default dead-tuple rule vacuum it?

Answer: No. Threshold is `50 + 0.2*100 = 70`. Forty is under that—small tables stay bloated under defaults. Lower scale/threshold per table if needed.

### DB-068 — Vacuum's horizon is the oldest snapshot and the oldest running xid

**Difficulty:** Advanced

**Category:** Vacuum

**Question:**

What keeps vacuum from removing a tuple already dead to every new snapshot? Which sessions do that, and which open transactions do not?

**Answer:**

Vacuum’s horizon is the oldest `backend_xmin` (snapshot) and oldest `backend_xid` still running. Dead tuples newer than that horizon stay. A session holding a snapshot (RR/Serializable for the xact, or an in-flight Read Committed statement) contributes `backend_xmin`. A writing transaction’s `backend_xid` also blocks removal past that xid. A Read Committed session idle after a plain `SELECT` with no xid often holds neither—its statement snapshot is gone.

**Follow-up:**

A idle after `SELECT 1`; B idle after `UPDATE` (uncommitted). Who holds the horizon?

Answer: B—`backend_xid` until commit/rollback. A released its statement snapshot and never took an xid.

### DB-069 — Freezing takes a tuple out of xid comparison

**Difficulty:** Senior

**Category:** Freeze and wraparound

**Question:**

What does it mean to freeze a tuple, and when does vacuum do it?

**Answer:**

Freezing marks a committed tuple so visibility no longer compares its inserting xid against the wraparound counter—safe forever relative to old xids. Vacuum freezes when tuple age exceeds `vacuum_freeze_min_age` (default 50M), more aggressively near `vacuum_freeze_table_age`. Aggressive vacuum visits more pages to advance `relfrozenxid`. Frozen pages can be marked all-frozen in the visibility map so later vacuums skip them.

**Follow-up:**

Aggressive vacuum finishes; why is `age(relfrozenxid)` ~50M, not 0?

Answer: Tuples newer than `vacuum_freeze_min_age` stay unfrozen. `relfrozenxid` is the oldest xid still present—just past that floor, plus concurrent inserts during vacuum.

### DB-070 — Wraparound is the server refusing new transaction ids

**Difficulty:** Staff-Level

**Category:** Freeze and wraparound

**Question:**

What fails if `datfrozenxid` is not advanced, at what ages does PostgreSQL 16 warn and stop, and what moves the horizon again?

**Answer:**

Xids are 32-bit; without freezing, old committed xids wrap and look “in the future,” breaking visibility. PostgreSQL warns near 40M transactions before wrap (`autovacuum_freeze_max_age` related alerting), and stops assigning new xids ~3M before wraparound until freeze advances. Advancing `datfrozenxid` means vacuum/freeze completing on relations holding the oldest `relfrozenxid` (anti-wraparound autovacuum or manual `VACUUM`). More `shared_buffers` does not freeze tuples.

**Follow-up:**

`age(datfrozenxid)` 210M; `autovacuum = off`; writes still work. What happens? Does larger `shared_buffers` help?

Answer: Anti-wraparound autovacuum still launches (ignores off). It will not step aside for ordinary conflicts. Writes continue until the hard stop. Larger buffers change nothing about freeze progress.

### DB-071 — A page can sit in shared buffers and in the operating-system cache

**Difficulty:** Senior

**Category:** Buffer cache

**Question:**

What does `shared_buffers` hold, what does the OS page cache hold, and what does a buffer miss mean?

**Answer:**

`shared_buffers` is PostgreSQL’s shared pool of 8 kB pages. A miss loads from the kernel; the kernel may serve its page cache or disk, then the page is copied into a shared buffer—so two copies can exist. OS cache still matters for WAL, cold pages, and anything not pinned in the pool. `EXPLAIN (ANALYZE, BUFFERS)` shared reads mean “not in `shared_buffers`,” not necessarily disk I/O.

**Follow-up:**

Second `count(*)` is all shared hits; OS drops its page cache. Do those hits remain?

Answer: Yes for pages still in `shared_buffers`. Kernel drop does not empty the pool. Pages already evicted from the pool become shared reads that may now hit disk.

### DB-072 — effective_cache_size is a cost input, not a cache

**Difficulty:** Advanced

**Category:** Buffer cache

**Question:**

What does `effective_cache_size` change, and what does it leave allocated exactly as before?

**Answer:**

It tells the planner how much RAM (shared buffers + OS cache) likely holds pages for costing random fetches. Larger values make index-heavy plans look cheaper; smaller favor seq scans. It allocates nothing: no growth of `shared_buffers`, no pins, no change to real buffer hit counts. Wrong assumption → wrong plan, same physical cache.

**Follow-up:**

`shared_buffers` 128 MB, host has ~64 GB free for page cache, `effective_cache_size` 4 GB. What does the planner assume vs reality?

Answer: Planner costs as if ~4 GB total cache. Reality can hold multi-GB working sets in the kernel cache. Raise `effective_cache_size` toward usable RAM; it still does not enlarge the 128 MB pool.

### DB-073 — ANALYZE writes the statistics the planner reads

**Difficulty:** Senior

**Category:** Planner statistics

**Question:**

Where do the planner’s row estimates come from, and what do `pg_stat_user_tables` and `pg_stats` each contribute?

**Answer:**

Planner uses `pg_statistic` (via `pg_stats`) plus `pg_class.reltuples`/`relpages` from `ANALYZE`: null fraction, width, `n_distinct`, MCVs, histogram, correlation. `default_statistics_target` sizes MCV/histogram slots. `pg_stat_user_tables` counters (`n_dead_tup`, `n_mod_since_analyze`, …) drive autovacuum/analyze scheduling—not selectivity. Estimate for `status = 'open'` is `reltuples` × stored frequency, not live activity counters.

**Follow-up:**

`pg_stats` says `'closed'` frequency 0.9, `reltuples` 100000, but every row is now `'open'`. What does the planner estimate vs return?

Answer: Estimates ~10k for `'open'` (old uncommon freq) while the executor returns 100k. Plan can be wrong until `ANALYZE` refreshes frequencies.

### DB-074 — The pool exists so client count and backend count can differ

**Difficulty:** Intermediate

**Category:** Connections

**Question:**

Why put a pool between apps and PostgreSQL? What is pooled, and what is not?

**Answer:**

Each direct session costs one backend under `max_connections` (superuser reserve; autovacuum/parallel outside). Backends are processes with private memory and lock/snapshot cost. A pool holds fewer server backends and many client sockets: borrow a backend for work, return it when done (session or transaction lifetime). You pool expensive capped backends, not SQL correctness or shared buffers. Auxiliaries still run once per cluster.

**Trade-offs:**

Session pooling preserves session state; fewer backends shared. Transaction pooling multiplies concurrency per backend but drops session features—see next question.

**Follow-up:**

50 processes × (2 active + 10 idle “just in case”) vs transaction pooling under `max_connections` 100.

Answer: Session-lifetime needs up to 600 backends—over cap. Transaction pooling needs ~true concurrency (~100 at peak two×50), with idle clients as sockets only. Size the pool under `max_connections`.

### DB-075 — Transaction pooling drops session state at COMMIT

**Difficulty:** Advanced

**Category:** Connections

**Question:**

What does PgBouncer transaction pooling guarantee about which backend runs a transaction, and which PostgreSQL features break?

**Answer:**

Transaction mode assigns a server connection for a transaction and returns it at end; the next transaction may be another backend. Broken or unsafe: session `SET`, prepared statements on the server, temp tables, `LISTEN`/`NOTIFY`, session advisory locks, `WITH HOLD` cursors. Session mode keeps one backend for the client connection and preserves those. Named prepared statements and session GUCs belong in session mode or the app must re-apply state each transaction.

**Follow-up:**

Transaction mode: `LISTEN`, then `COMMIT`. Later `NOTIFY` from elsewhere—why might the client miss it?

Answer: `LISTEN` lived on the backend returned at commit. Later borrows may not be listening. Session mode or a direct connection keeps the listening backend.

### DB-076 — A wide attribute is stored beside the heap, in a TOAST table

**Difficulty:** Intermediate

**Category:** TOAST

**Question:**

Where does PostgreSQL put a value that does not fit in the heap tuple, and what does a query pay to read it back?

**Answer:**

A heap tuple must fit one page. Values past the toast threshold (~2 kB target) are compressed and/or moved to the relation’s toast table (`reltoastrelid`) in ~2 kB chunks. The heap keeps an 18-byte pointer. Narrow columns stay inline. Fetching the value detoasts (read/reassemble chunks, decompress). Queries that never touch the column avoid that I/O.

**Follow-up:**

`count(*)` vs `count(body)` on non-null toasted `body`—who reads toast?

Answer: `count(*)` does not. `count(body)` only needs nullness from the heap null bitmap for non-null toasted values—no chunk read. Reading characters (`length`, `SELECT body`) detoasts.

### DB-077 — The storage strategy chooses compression and whether the value may leave the page

**Difficulty:** Senior

**Category:** TOAST

**Question:**

What do `PLAIN`, `MAIN`, `EXTERNAL`, and `EXTENDED` change, and when is `EXTERNAL` right for wide `text`?

**Answer:**

Strategies control compress + out-of-line. `PLAIN`: neither (fixed types). `EXTENDED` (default for `text`/`bytea`/`jsonb`): compress then out-of-line. `MAIN`: compress, prefer in-line. `EXTERNAL`: out-of-line, no compress—substring can fetch needed chunks without full decompress. `ALTER ... SET STORAGE` affects future writes only. Prefer `EXTERNAL` when slice/prefix reads dominate and disk beats CPU decompress.

**Follow-up:**

`body` is `EXTERNAL` out-of-line; `substring(body from 1 for 80)` vs compressed storage?

Answer: Uncompressed toast can read only the first chunks. Compressed values must detoast/decompress wholly, then slice.

### DB-078 — Hint bits cache commit status on the tuple

**Difficulty:** Senior

**Category:** MVCC

**Question:**

What do hint bits record, why can a `SELECT` dirty a heap page, and when is that write WAL-logged?

**Answer:**

Hint bits cache whether `xmin`/`xmax` committed or aborted so scans avoid `pg_xact` every time. They are not set at `COMMIT`; the next reader looks up status and sets bits, dirtying the buffer—even on `SELECT`. Without checksums/`wal_log_hints`, hint-only dirties often skip WAL; crash can lose bits safely (cache). Freeze is a different, WAL-logged write.

**Follow-up:**

Commit done, hints unset, clean page; `SELECT` sets hints; crash before write. Is the row visible?

Answer: Yes—commit is in WAL/`pg_xact`. Hints were an unflushed cache; next reader sets them again.

### DB-079 — pg_xact stores two bits of status for each transaction id

**Difficulty:** Senior

**Category:** MVCC

**Question:**

What does the commit log record, when is it updated relative to the commit WAL record, and when can old segments be removed?

**Answer:**

`pg_xact` stores two bits per xid: in progress, committed, aborted, subcommitted. `COMMIT` WAL-flushes the commit record first (with `synchronous_commit` on); status is marked as commit finishes. WAL is authority—recovery sets bits from commit records. Hint bits cache this map. Once every DB’s `datfrozenxid` is past a range, those old bits are unneeded and segments can be trimmed.

**Follow-up:**

Recovery sees commit record for xid 5000 but `pg_xact` still in progress. What happens?

Answer: Recovery marks 5000 committed. Hint bits are not required; missing hints do not keep it aborted. Later readers can set hints.

### DB-080 — A second locker turns xmax into a multixact id

**Difficulty:** Senior

**Category:** Locks

**Question:**

When does a row’s `xmax` stop being a single transaction id, and what does that id point at?

**Answer:**

One locker stores its xid in `xmax` with lock bits. A second concurrent lock that must coexist (e.g. `FOR KEY SHARE` + another share) replaces `xmax` with a multixact id (`HEAP_XMAX_IS_MULTI`); members live in `pg_multixact`. Exclusive updaters that conflict wait rather than join. Vacuum must treat multixacts carefully until members finish. Plain `SELECT` never joins a multixact.

**Follow-up:**

A holds `FOR KEY SHARE`; B updates the primary key. Join multixact or wait?

Answer: B waits. Key change needs `FOR UPDATE`, which conflicts with `FOR KEY SHARE`. After A ends, B takes its lock.

### DB-081 — relfrozenxid advances only when every older page is accounted for

**Difficulty:** Advanced

**Category:** Freeze and wraparound

**Question:**

What does `pg_class.relfrozenxid` mean, and how can `VACUUM` finish, remove dead tuples, and leave `age(relfrozenxid)` unchanged?

**Answer:**

`relfrozenxid` is the oldest xid that may still appear unfrozen in the relation; age vs next xid is wraparound distance for that table. Ordinary vacuum can skip all-visible pages and freeze only old enough tuples, reclaiming dead space without visiting every page—so `relfrozenxid` may not move. Advancing it needs a pass that accounts for every page older than the new horizon (aggressive/anti-wraparound freeze).

**Follow-up:**

`age(relfrozenxid)` 80M before and after `VACUUM`; dead tuples dropped. Closer to wraparound?

Answer: No—age unchanged. Dead-tuple cleanup ≠ freeze progress. Age matters when it nears freeze_max_age / wraparound stops.

### DB-082 — An idle transaction blocks vacuum while a snapshot or an xid is still registered

**Difficulty:** Senior

**Category:** Vacuum

**Question:**

Which `idle in transaction` session holds vacuum’s horizon, and which one does not?

**Answer:**

Idle-in-transaction holds the horizon if `backend_xmin` (still-published snapshot) or `backend_xid` (assigned write/row lock) is set—typical for RR/Serializable, or RC after a write/`FOR UPDATE`. A Read Committed session idle after a finished plain `SELECT` with no xid usually holds neither and does not pin vacuum. Check `pg_stat_activity` for those columns, not `state` alone.

**Follow-up:**

Same idle RC session ran `UPDATE` instead of `SELECT`. Horizon?

Answer: Yes—update assigned `backend_xid`, which stays until commit/rollback even while idle between statements.

### DB-083 — xact_start, query_start, and state_change measure different intervals

**Difficulty:** Intermediate

**Category:** Processes

**Question:**

On one `pg_stat_activity` row, what do `xact_start`, `query_start`, `state_change`, and `state` each mean?

**Answer:**

`state` is current execution mode (`active`, `idle`, `idle in transaction`, …). `xact_start` is when the open transaction began (null if not in a transaction). `query_start` is when the current or last statement started. `state_change` is when `state` last changed. Together they separate “in a long transaction,” “running a long query,” and “idle waiting on the client.”

**Follow-up:**

`idle`, null `xact_start`, `query_start` 40m ago, `state_change` 30m ago—what has it been doing?

Answer: Waiting on the client. Last statement finished; left any transaction 30m ago; holds no transaction horizon from `xact_start`.

### DB-084 — A long transaction limits what VACUUM is allowed to remove and freeze

**Difficulty:** Advanced

**Category:** Vacuum

**Question:**

A transaction has been open a long time. What can `VACUUM` still do, and what must wait until that transaction ends?

**Answer:**

Vacuum can still clean tuples dead to everyone including that snapshot/xid, update FSM/VM on visitable pages, and freeze only what the horizon allows. It cannot remove versions still visible to the old snapshot or freeze past xids that snapshot/xid still needs. Dead-tuple counts and bloat can grow while the horizon sits. Ending the transaction does not delete tuples—only a later vacuum with a newer horizon does.

**Follow-up:**

Long transaction commits; autovacuum has not run. Is `n_dead_tup` already gone?

Answer: No. Commit made versions removable; vacuum must still run to remove them and drop the counter.

### DB-085 — Heap bloat and index bloat are cleaned by different operations

**Difficulty:** Senior

**Category:** Vacuum

**Question:**

What is left in the heap after updates/deletes, what in an index, and which command shrinks each file?

**Answer:**

Heap keeps dead tuple versions until vacuum/prune frees space for reuse; file shrink needs truncation of trailing empty pages or `VACUUM FULL` rewrite. Indexes keep dead entries until vacuum’s index cleanup; index *file* bloat often needs `REINDEX` or `VACUUM FULL`. Ordinary vacuum reclaims for reuse; it does not always shrink index files to match the heap.

**Follow-up:**

`n_dead_tup` 0, heap size stable, one secondary index many× heap. Will next ordinary `VACUUM` shrink the index?

Answer: No. Nothing dead to remove. Index stays large until `REINDEX`/`VACUUM FULL` builds a compact index.

### DB-086 — A checkpoint can stall on sync, then the next writes log full page images

**Difficulty:** Advanced

**Category:** WAL

**Question:**

Monitoring shows write stalls on checkpoint cadence, then WAL bytes jump while SQL rate is flat. What are the two mechanisms?

**Answer:**

Checkpoint finish syncs dirty data files—latency spikes under heavy dirty buffers. After the new redo point, each page’s first modification logs a full page image (`full_page_writes`), so WAL volume jumps even if row change rate is unchanged. Later updates in the interval log small records until the next checkpoint re-arms images.

**Follow-up:**

Page imaged once early, then updated ten more times before next checkpoint. How many full page images?

Answer: One for that interval. Ten later updates are ordinary records. Next checkpoint re-arms; the following first touch logs another image.

### DB-087 — wal_level chooses how much of a change is logged

**Difficulty:** Senior

**Category:** WAL

**Question:**

What do `minimal`, `replica`, and `logical` include, and what does a default PostgreSQL 16 primary refuse if you set `minimal`?

**Answer:**

`minimal`: crash recovery only; can skip some bulk WAL (e.g. CTAS/COPY into new relations under rules). `replica` (default): enough for physical replication and archiving. `logical`: replica plus enough for logical decoding. A primary that needs replication/archiving cannot usefully run at `minimal`; replica/standby and `archive_mode` require at least `replica`. Changing `wal_level` needs a restart.

**Follow-up:**

`wal_level = replica`; large `CREATE TABLE AS SELECT`. Are rows omitted from WAL like at `minimal`?

Answer: No. Row-image skip is a `minimal` optimization. At `replica`, CTAS is logged so standbys/archives see the table.

### DB-088 — A sort or hash that crosses its memory limit writes temp files

**Difficulty:** Senior

**Category:** Memory

**Question:**

What does a temp file mean, which setting is the limit, and which tools show the spill without inventing its size?

**Answer:**

When a sort/hash exceeds `work_mem` (per operation; parallel workers each get their own), PostgreSQL spills to temporary files under the data directory’s temp area. That is disk I/O and often the latency clue. Prove it with `EXPLAIN (ANALYZE)` (external merge / disk bytes), `log_temp_files`, or temp-file monitoring—not by guessing from plan estimates alone. `maintenance_work_mem` is for vacuum/index builds, not query sorts.

**Follow-up:**

Plain `EXPLAIN` shows Sort. Will it write a temp file?

Answer: Unknown—`EXPLAIN` does not run the sort. Spill shows in `EXPLAIN (ANALYZE)` after execution.

### DB-089 — The free space map is how an insert finds a page with room

**Difficulty:** Intermediate

**Category:** Heap storage

**Question:**

What does the free space map record, and why can an insert after `VACUUM` leave `pg_relation_size` unchanged?

**Answer:**

The FSM tracks free bytes per heap page so inserts can reuse space instead of always extending the file. After vacuum frees dead tuples, new inserts fill those pages; relation size stays flat while reuse works. Size grows when no suitable page has room. Truncation only removes empty pages at the end—not middle holes the FSM still advertises.

**Follow-up:**

Only page 0 empty (in FSM); page 1 has a live tuple. Vacuum with truncation—does the main fork lose a page?

Answer: No. Truncation needs a trailing empty suffix. Page 0 stays; next fitting insert reuses it via FSM.

### DB-090 — Crash recovery empties an unlogged table

**Difficulty:** Senior

**Category:** WAL

**Question:**

What does `CREATE UNLOGGED TABLE` skip, and what does the table contain after a crash?

**Answer:**

Unlogged tables skip WAL for heap changes (faster, not replicated). After crash recovery the table is emptied/reset from its init fork—prior rows are gone. Truncate-on-recovery is the durability contract. Use for rebuildable scratch data, never for truth that must survive a crash.

**Trade-offs:**

Speed and less WAL vs total loss on crash and no standby contents. Logged tables pay WAL for durability and replication.

**Follow-up:**

After crash empties `scratch`, a later `INSERT` commits with no second crash. Survive clean restart?

Answer: Yes. Only crash recovery resets from the init fork. Clean shutdown keeps post-recovery inserts.

### DB-091 — A temporary table is private to the session and is not in the WAL

**Difficulty:** Intermediate

**Category:** Heap storage

**Question:**

Who can see a temporary table, where do its pages live, and what removes it?

**Answer:**

Temp tables are visible only to the creating session (separate temp namespace). Data lives in that backend’s temporary files/buffers (`temp_buffers`), not shared heap WAL—so not on standbys/archives. Dropped at session end, or per `ON COMMIT` (preserve/delete/drop rows). Other sessions cannot query it by name as a shared table.

**Follow-up:**

Creator commits (`ON COMMIT PRESERVE ROWS`) and stays connected. Can another session `SELECT`? See rows in WAL?

Answer: Neither—still private to the owner; inserts were not WAL-logged for replication/archive.

### DB-092 — A real transaction id is assigned on the first write

**Difficulty:** Intermediate

**Category:** MVCC

**Question:**

When does a backend get a real transaction id, and what does it have before that?

**Answer:**

`BEGIN` takes a virtual xid for locking without consuming the 32-bit xid counter. A real xid is assigned on first write or row lock (`INSERT`/`UPDATE`/`DELETE`/`SELECT FOR UPDATE`/share forms). Plain `SELECT` does not. `backend_xid` stays null for read-only xacts; `backend_xmin` can still be set (especially RR/Serializable). Only real xids burn wraparound age.

**Follow-up:**

RC session runs `SELECT ... FOR UPDATE`, changes no column, goes idle. Real xid?

Answer: Yes—row lock assigns an xid. `backend_xid` remains until commit/rollback; vacuum treats it as in progress.

### DB-093 — A savepoint assigns a subtransaction id

**Difficulty:** Senior

**Category:** MVCC

**Question:**

What does `SAVEPOINT` cost in transaction ids, and why can a PL/pgSQL `EXCEPTION` handler do the same in a loop?

**Answer:**

A savepoint starts a subtransaction; it gets a subxid when it needs one. `ROLLBACK TO` aborts that subxid; parent continues. `RELEASE` keeps work under the parent. Subcommitted children follow `pg_subtrans` to the parent’s status. PL/pgSQL `BEGIN...EXCEPTION` is a subtransaction—per-row catch in a loop can burn many subxids (and overflow the ~64 cached subxid list into slower `pg_subtrans` checks).

**Follow-up:**

Parent updates note to `parent`; savepoint child sets `child` then `ROLLBACK TO`; parent commits. What does a later `SELECT` see?

Answer: Note `parent`. Child subxid aborted; parent xid committed.

### DB-094 — Relation locks use the lock table; row locks live on the tuple

**Difficulty:** Senior

**Category:** Locks

**Question:**

What does `max_locks_per_transaction` limit, and why can a transaction lock every row in `ticket` without exhausting it?

**Answer:**

Shared lock table size ≈ `max_locks_per_transaction` × (`max_connections` + prepared). It holds heavyweight locks (relations, wait-for xids, advisory, …)—an average budget, restart to raise. Granted row locks live in tuple `xmax`/multixact, not one lock-table slot per row. Waiters take a lock-table entry while waiting. Partitioned queries lock many relations and can exhaust the table.

**Follow-up:**

400 partitions; two sessions lock parent+all partitions with other sessions holding table locks—what setting fails?

Answer: `max_locks_per_transaction` (relation lock slots). `work_mem` does not size the lock table.

### DB-095 — pg_wal can outgrow max_wal_size while a consumer still needs the segments

**Difficulty:** Senior

**Category:** WAL

**Question:**

Why is `pg_wal` larger than `max_wal_size`, and which consumers stop recycling segments?

**Answer:**

`max_wal_size` triggers checkpoints so old segments can recycle; it is not a disk quota. Segments stay while needed for: incomplete checkpoint redo, `wal_keep_size`, replication slots (`restart_lsn`), or failed/incomplete `archive_command`. Inactive slots and broken archiving are common disk growers. `max_slot_wal_keep_size` can cap slots (−1 = uncapped).

**Follow-up:**

Archive command failing and an inactive slot with old `restart_lsn`; checkpoint current. Which alone lets checkpoint free the WAL?

Answer: Neither. Both retain segments. Fix archiving and drop/advance the slot; checkpoint only recycles unneeded segments.

### DB-096 — idle_in_transaction_session_timeout ends a session that is sitting in a transaction

**Difficulty:** Senior

**Category:** Vacuum

**Question:**

Which timeout ends an `idle in transaction` session, and which leave that session alone?

**Answer:**

`idle_in_transaction_session_timeout` kills sessions idle inside a transaction too long—rolls back, drops snapshot/xid/locks so vacuum’s horizon can move. It does not cancel an `active` query (`statement_timeout` does; session may remain aborted-idle until client ends it). `idle_session_timeout` targets `idle` not in a transaction. Ending the session does not itself remove dead tuples—vacuum does.

**Follow-up:**

RR session killed by this timeout; a newer committed delete is still in the heap. What changed for vacuum?

Answer: Horizon moved (`backend_xmin` gone). Next vacuum may remove/freeze what that snapshot blocked. Tuple still on disk until vacuum runs.

### DB-097 — The buffer manager flushes WAL through the page LSN before it writes the page

**Difficulty:** Senior

**Category:** WAL

**Question:**

What does the page LSN mean, and what must be flushed before that page is written to its data file?

**Answer:**

Page header LSN is the end of the last WAL record that modified the page. Before checkpointer, bgwriter, or a backend writes the dirty buffer to the data file, WAL must be flushed through that LSN. Data files never get ahead of durable WAL. Torn pages are rebuilt from full page images + later WAL. Client `COMMIT` is the same write-ahead idea for the commit record.

**Follow-up:**

Update committed; page dirty; LSN points at the update record; checkpointer about to write the page. What must it do?

Answer: Flush WAL through the page LSN if not already. Commit flush already covered the commit record after the update, so the update WAL is durable; the rule still applies before the data write.

### DB-098 — The wait event says what the backend is blocked on

**Difficulty:** Senior

**Category:** Processes

**Question:**

How do you tell a backend waiting on the client from one waiting on a lock or on a data-file read?

**Answer:**

Read `state` with `wait_event_type`/`wait_event`. `idle` + `Client`/`ClientRead` = waiting for the next client command (pool idle)—not lock or disk. `ClientWrite` = sending results. Lock waits show `Lock` / `transactionid` / `tuple` while `active`. I/O waits show `IO` / `DataFileRead` (etc.). `pg_blocking_pids` names the holder for lock waits. Do not treat every non-null wait as saturation—filter idle `ClientRead`.

**Follow-up:**

L’s blocker is `idle in transaction`, `ClientRead`, old `xact_start`. What is L waiting for?

Answer: The idle transaction to commit/rollback (holding the lock while waiting on its client). Canceling L only drops the waiter; end or kill the blocker to release the lock.

### DB-099 — Statistics counters are not part of the WAL

**Difficulty:** Senior

**Category:** Statistics

**Question:**

Where do `pg_stat_*` counters live, what survives a clean shutdown, and what can a crash lose?

**Answer:**

Cumulative stats live in shared memory (no stats-collector process since PG15). Backends update them; views read that memory. They are not WAL-logged or replayed to standbys. Periodic flush lets clean shutdown restore them. A crash can lose increments since the last flush—tables/commits remain correct via WAL replay; counters can look low or reset. Do not treat post-crash `xact_commit` gaps as missing commits.

**Follow-up:**

After recovery, `xact_commit` is far below pre-crash monitoring, but rows from that window exist. Corrupt?

Answer: Neither store is wrong for its job. Heap is WAL-backed; counters lost unflushed increments. Re-baseline monitoring from `stats_reset`/post-crash values.

### DB-100 — A checksum detects a damaged page and does not repair it

**Difficulty:** Senior

**Category:** WAL

**Question:**

What does a data checksum prove, what does a mismatch do, and how is that different from `full_page_writes`?

**Answer:**

Checksums (enabled at `initdb`/tools) verify a page matches what PostgreSQL wrote. Mismatch → invalid-page error; no reconstruction from the checksum. `full_page_writes` supplies recovery images to rebuild torn pages during WAL replay after a crash—not an online healer for checksum failures on a live primary. Live damage needs restore/standby without the bad page. Checksums also force hint-bit changes to be WAL-logged (`wal_log_hints` behavior).

**Follow-up:**

Checksums on, `full_page_writes` on; crash tears a page already imaged this interval. What repairs it at startup?

Answer: Recovery installs the WAL full page image and applies later records. The checksum would fail a read of the torn bytes; it does not supply replacement data—the image does.
