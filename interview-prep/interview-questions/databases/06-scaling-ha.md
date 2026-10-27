# DB06 — Scaling & High Availability

PostgreSQL 16. Questions DB-251–DB-300.

Vertical vs horizontal scaling, connection pooling (PgBouncer), read replicas and lag, streaming replication, failover and Patroni, logical replication, partitioning, sharding and Citus, vacuum and bloat at scale, backup and PITR, RPO/RTO, multi-AZ, write amplification, timeouts, load shedding, CQRS read models. Deep indexing is DB03; transactions are DB04.

### DB-251 — Compare vertical and horizontal scaling for PostgreSQL. What do you try first?

**Difficulty:** Intermediate

**Category:** Scaling

**Question:**

Compare vertical and horizontal scaling for PostgreSQL. What do you try first?

**Answer:**

Vertical = bigger box (CPU, RAM, NVMe, IOPS). It is simple, keeps ACID and joins local, and has no app changes, but it has a ceiling, gets expensive, and is still a single point of failure. Horizontal = more nodes: read replicas (reads only), partitioning (one node, smaller tables), or sharding (writes spread across nodes). Order: fix queries/indexes and pooling, scale up, add read replicas, partition, then shard last. Postgres has a single writer, so write scaling is the hard part.

**Follow-up:**

Why is "just add replicas" not a write-scaling answer?

Answer: Replicas replay the primary's WAL, so every write still happens on the primary and again on each replica. Replicas offload reads only. Write throughput is bounded by the primary's WAL/IO/CPU. Past that you need less write work (batching, fewer indexes), partitioning for locality, or sharding.

### DB-252 — Why are many direct connections a problem in PostgreSQL?

**Difficulty:** Intermediate

**Category:** Connection pooling

**Question:**

Why are many direct connections a problem in PostgreSQL?

**Answer:**

Each connection is a dedicated backend process (about 5–10 MB or more, plus `work_mem` per sort/hash node). Thousands of them mean heavy context switching, snapshot and lock-table contention (`ProcArray`), and memory pressure. Throughput usually peaks at a few multiples of core count and then drops. Serverless and microservice fleets with per-instance pools can easily exhaust `max_connections`, so you need a pooler in front.

**Follow-up:**

Why not just raise `max_connections`?

Answer: It increases shared memory and lock/snapshot overhead and risks OOM, and it doesn't increase useful concurrency. Most connections sit idle while a few run. Keep it modest and multiplex client connections onto few server connections with a pooler.

### DB-253 — Explain PgBouncer session, transaction, and statement pooling.

**Difficulty:** Senior

**Category:** Connection pooling

**Question:**

Explain PgBouncer session, transaction, and statement pooling.

**Answer:**

*Session:* a server connection is held for the client's whole session, which is safest but gives little multiplexing. *Transaction:* a server connection is assigned only for the duration of a transaction, then returned. This is the usual choice and gives high multiplexing. *Statement:* it is returned after each statement, so multi-statement transactions are not allowed and it is rarely used. Transaction mode lets thousands of clients share tens of server connections.

**Follow-up:**

When would you pick session mode?

Answer: When the app relies on session state: `LISTEN/NOTIFY`, session-level advisory locks, `SET` without `LOCAL`, temp tables, WITH HOLD cursors, or session-level prepared statements on older PgBouncer. Also for admin or migration tooling. Alternatively, run a separate session-mode pool for those clients.

### DB-254 — What breaks under PgBouncer transaction pooling?

**Difficulty:** Senior

**Category:** Connection pooling

**Question:**

What breaks under PgBouncer transaction pooling?

**Answer:**

Anything that assumes the same backend across transactions: session `SET`/`RESET`, `LISTEN`, session advisory locks, temp tables, `DECLARE ... WITH HOLD` cursors, and server-side prepared statements. Recent PgBouncer (1.21+) tracks protocol-level prepared statements via `max_prepared_statements`, but SQL-level `PREPARE` is still unsafe. Use `SET LOCAL`, transaction-scoped advisory locks (`pg_advisory_xact_lock`), and driver settings that disable named prepared statements if the version is older.

**Follow-up:**

How does a leaked `SET` show up as a bug?

Answer: A `search_path` or `statement_timeout` set by one client sticks to the pooled server connection and affects a different client's next transaction, giving intermittent wrong-schema or timeout behavior. `server_reset_query` can reset it (session mode) or you can use `SET LOCAL`.

### DB-255 — How do you size `default_pool_size` / `max_connections`?

**Difficulty:** Intermediate

**Category:** Connection pooling

**Question:**

How do you size `default_pool_size` / `max_connections`?

**Answer:**

Start near `cores × 2–4` active server connections for the database, then load-test. More concurrent queries than the CPU and IO can serve just queue inside Postgres, making latency worse. Cap per-database/user pools, set `max_client_conn` high for clients, and budget `max_connections` as total pool sizes across all poolers and replicas, plus admin headroom and superuser reserved connections. Use `reserve_pool` for bursts.

**Follow-up:**

What happens when the pool is exhausted?

Answer: Clients wait in the pooler queue until `query_wait_timeout`, then they get errors. That is better than collapsing the DB, but it needs app-side timeouts and retries with jitter. Monitor `cl_waiting` and `maxwait` in PgBouncer `SHOW POOLS`.

### DB-256 — What are read replicas good for, and what are their limits?

**Difficulty:** Intermediate

**Category:** Read replicas

**Question:**

What are read replicas good for, and what are their limits?

**Answer:**

They offload read-heavy traffic, reporting, analytics, and backups, and they double as failover candidates. Limits: replication lag causes stale reads, they cannot take writes, and they add cost. The app or proxy must route queries (read/write split). Long queries on a hot standby can conflict with replay.

**Follow-up:**

Which queries should stay on the primary?

Answer: Anything needing read-your-writes, such as the read right after a write, auth/session checks, inventory or balance checks before a write, and anything inside a read-write transaction. Staleness-tolerant ones (feeds, search, dashboards) go to replicas.

### DB-257 — What causes replication lag and how do you measure it?

**Difficulty:** Senior

**Category:** Read replicas

**Question:**

What causes replication lag and how do you measure it?

**Answer:**

Causes: heavy write bursts, slow standby disk or CPU, single-threaded WAL replay, network limits, long-running standby queries that cause replay conflicts and delays, and big transactions or bulk loads. Measure on the primary with `pg_stat_replication` (`write_lag`, `flush_lag`, `replay_lag`, or LSN differences via `pg_wal_lsn_diff`). On the standby use `now() - pg_last_xact_replay_timestamp()`. Note that this timestamp value grows when the primary is idle.

**Follow-up:**

Why can `pg_last_xact_replay_timestamp` mislead?

Answer: It is the commit time of the last replayed transaction. If the primary has no writes, it keeps growing even though the standby is fully caught up. Compare LSNs (`pg_last_wal_receive_lsn` vs `pg_last_wal_replay_lsn` and the primary's current LSN) for the true gap.

### DB-258 — How do you give users read-your-writes consistency with async replicas?

**Difficulty:** Intermediate

**Category:** Read replicas

**Question:**

How do you give users read-your-writes consistency with async replicas?

**Answer:**

Options: route a user's reads to the primary for a short window after their write; track the commit LSN (`pg_current_wal_lsn()` after write) and read from a replica only once `pg_last_wal_replay_lsn()` has passed it; sticky sessions; or use synchronous replication with `remote_apply` (costly). Most apps use the "primary after write for N seconds" or LSN-wait approach.

**Follow-up:**

What are the downsides of the LSN-wait approach?

Answer: It needs extra plumbing, because the LSN must travel with the user session or token. It adds latency while waiting, and it needs a fallback to the primary on timeout. Time-based pinning is simpler but less exact.

### DB-259 — How does physical streaming replication work?

**Difficulty:** Intermediate

**Category:** Replication

**Question:**

How does physical streaming replication work?

**Answer:**

The standby connects to the primary's walsender via the replication protocol, streams WAL records as they are generated, writes and flushes them to its own WAL, and the startup process replays them to produce a byte-identical copy of the whole cluster. It is set up from a base backup (`pg_basebackup`) plus `primary_conninfo`, and the standby is marked by `standby.signal`. Replication is block-level and all-or-nothing, with the same major version required.

**Follow-up:**

What if the standby falls behind and WAL is recycled?

Answer: The standby cannot continue and must be rebuilt, unless a replication slot, `wal_keep_size`, or a WAL archive (`restore_command`) retains the needed WAL. Slots avoid the problem but can fill the primary's disk if the standby is gone.

### DB-260 — Compare sync and async replication. What is the trade-off?

**Difficulty:** Intermediate

**Category:** Replication

**Question:**

Compare sync and async replication. What is the trade-off?

**Answer:**

Async: the primary commits without waiting for the standby, giving low latency and no write stall if the standby dies, but failover can lose recent commits (RPO > 0). Sync: commit waits for the standby's acknowledgement, so RPO can be ~0, but commit latency includes a network round trip and a failed standby can block writes unless a quorum or other standbys exist. It is a latency vs durability trade-off.

**Follow-up:**

How do you avoid a single sync standby blocking writes?

Answer: Use quorum commit: `synchronous_standby_names = 'ANY 1 (s1, s2, s3)'`, so any one of several standbys can ack. An external orchestrator (Patroni) can also demote a failed standby from sync to async.

### DB-261 — Explain the `synchronous_commit` settings.

**Difficulty:** Senior

**Category:** Replication

**Question:**

Explain the `synchronous_commit` settings.

**Answer:**

`off`: ack before WAL flush, so a crash can lose a few recent commits but the database stays consistent. `local`: flush on the primary only. `remote_write`: the standby has received and written it (OS cache). `on`: the standby has flushed to disk. `remote_apply`: the standby has replayed it, so it is visible to standby reads. Each step increases durability or visibility at the cost of latency. It can be set per transaction.

**Follow-up:**

Where is per-transaction `synchronous_commit = off` appropriate?

Answer: For low-value, high-volume writes like metrics, logs, or click events, where losing the last ~200 ms on a crash is acceptable. Critical writes (payments) keep `on`. Unlike `fsync = off`, it cannot corrupt the database.

### DB-262 — Why do queries get cancelled on a hot standby?

**Difficulty:** Senior

**Category:** Replication

**Question:**

Why do queries get cancelled on a hot standby?

**Answer:**

WAL replay may need to remove row versions (vacuum cleanup), drop objects, or take locks that a running standby query still depends on. The standby then either delays replay up to `max_standby_streaming_delay` or cancels the query ("canceling statement due to conflict with recovery"). `hot_standby_feedback = on` tells the primary not to remove rows the standby needs, which reduces cancellations but can cause bloat on the primary.

**Follow-up:**

How do you run long analytics safely on a replica?

Answer: Use a dedicated replica with a large (or -1) `max_standby_streaming_delay` and accept lag, or enable `hot_standby_feedback` knowing the bloat risk. Or use a logical replica or warehouse for heavy analytics.

### DB-263 — What do replication slots do and what is the risk?

**Difficulty:** Senior

**Category:** Replication

**Question:**

What do replication slots do and what is the risk?

**Answer:**

A slot makes the primary retain WAL (physical) or WAL plus catalog data (logical) until the consumer confirms receipt, so the consumer cannot lose its place. The risk: an abandoned or lagging slot makes WAL pile up until the disk fills, and a primary outage follows. Mitigate with `max_slot_wal_keep_size`, monitoring `pg_replication_slots` (`restart_lsn`, `wal_status`), and dropping dead slots.

**Follow-up:**

What does `max_slot_wal_keep_size` trade off?

Answer: It protects the primary's disk by invalidating slots that fall too far behind, but the consumer then has to be rebuilt or resynced. It chooses primary survival over replica continuity.

### DB-264 — What is the difference between failover and switchover?

**Difficulty:** Intermediate

**Category:** Failover & HA

**Question:**

What is the difference between failover and switchover?

**Answer:**

Switchover is a planned, graceful role swap (maintenance, upgrades): stop writes, let the standby catch up, promote, and re-point the old primary as a standby, with no data loss. Failover is an unplanned promotion after the primary has failed, which may lose unreplicated commits (async) and needs the old primary fenced and rebuilt or rewound.

**Follow-up:**

How do you make switchover near-zero-downtime?

Answer: Pause or queue connections at the pooler (PgBouncer `PAUSE`), wait for replica LSN to match, promote, repoint, and `RESUME`. Clients see a short stall rather than errors.

### DB-265 — What happens when you promote a standby?

**Difficulty:** Intermediate

**Category:** Failover & HA

**Question:**

What happens when you promote a standby?

**Answer:**

`pg_ctl promote` or `pg_promote()` ends recovery, the standby finishes replaying available WAL, starts a new **timeline** (the timeline ID increments), and begins accepting writes. Timelines prevent confusion between WAL histories before and after the fork. Other standbys must follow the new timeline (`recovery_target_timeline = latest`), and the old primary can't rejoin unchanged because its WAL diverged.

**Follow-up:**

Why can't the old primary just restart as a standby?

Answer: It may have WAL the new primary never received, so its timeline has diverged. It must be rewound with `pg_rewind` or rebuilt from a fresh base backup.

### DB-266 — What is `pg_rewind` and when do you use it?

**Difficulty:** Senior

**Category:** Failover & HA

**Question:**

What is `pg_rewind` and when do you use it?

**Answer:**

It resynchronizes a diverged old primary with the new primary by copying only the changed blocks since the fork point, rather than a full base backup. It needs `wal_log_hints = on` or data checksums, plus the required WAL available. It makes the rejoin of a failed primary after failover quick, even on large databases.

**Follow-up:**

What are the prerequisites?

Answer: Checksums or `wal_log_hints` enabled before the divergence, `full_page_writes = on`, access to the new primary, and the old primary cleanly shut down. If the prerequisites aren't met, you must rebuild the node.

### DB-267 — What is split brain and how is it prevented?

**Difficulty:** Senior

**Category:** Failover & HA

**Question:**

What is split brain and how is it prevented?

**Answer:**

Two nodes both act as primary and accept writes, so the data diverges and can't be merged. It's prevented by a single source of truth for leadership (consensus store with leader lease), demotion of the old primary when it loses the lease, and fencing: STONITH, a watchdog, removing the VIP/route, or blocking at the network or storage level. A quorum is needed to promote.

**Follow-up:**

Why is a watchdog useful?

Answer: If the primary's HA agent hangs and can't update its lease, the watchdog hard-resets the host so it can't keep serving writes after another node has been promoted.

### DB-268 — What does Patroni do?

**Difficulty:** Intermediate

**Category:** Failover & HA

**Question:**

What does Patroni do?

**Answer:**

Patroni is an HA manager that runs next to each Postgres node and uses a distributed configuration store (etcd, Consul, ZooKeeper, or Kubernetes) to elect a leader by holding a leader key with a TTL. It handles automatic failover, replica creation, config management, switchover, and exposes a REST API for health checks (`/primary`, `/replica`) used by load balancers. It prefers the replica with the least lag.

**Follow-up:**

What happens if the DCS is unavailable?

Answer: The leader can't renew its lease and demotes itself to avoid split brain (unless in a special failsafe mode), so writes stop. That's why the DCS must itself be highly available (3 or 5 nodes).

### DB-269 — Why do HA setups use Raft/etcd-style consensus?

**Difficulty:** Senior

**Category:** Failover & HA

**Question:**

Why do HA setups use Raft/etcd-style consensus?

**Answer:**

To get a reliable agreement on "who is the leader" even with failures and partitions. A majority quorum (2 of 3, 3 of 5) must agree on writes to the store, so the minority side of a partition can't elect a leader. Odd numbers of nodes tolerate (N−1)/2 failures. Postgres itself doesn't do consensus for its streaming replication, so an external system provides it.

**Follow-up:**

Why 3 etcd nodes rather than 2?

Answer: Two nodes need both up to form a majority, so they tolerate zero failures and are less reliable than one node. Three tolerates one failure. Spread them across failure domains (AZs).

### DB-270 — How do applications find the current primary after failover?

**Difficulty:** Intermediate

**Category:** Failover & HA

**Question:**

How do applications find the current primary after failover?

**Answer:**

Options: a virtual IP or DNS name that moves, HAProxy/Patroni REST health checks (`/primary` for writes, `/replica` for reads), PgBouncer repointing, cloud endpoints (RDS cluster endpoint), or the libpq multi-host URL with `target_session_attrs=read-write` (and `prefer-standby` for reads). Apps must also handle dropped connections with retries.

**Follow-up:**

What's the DNS risk?

Answer: TTL caching and client-side DNS caching can keep clients pointed at the old primary. Use low TTLs, or prefer a proxy or VIP, and make sure the old primary is fenced so stale clients can't write to it.

### DB-271 — How does logical replication differ from physical?

**Difficulty:** Intermediate

**Category:** Logical replication

**Question:**

How does logical replication differ from physical?

**Answer:**

It decodes WAL into row-level changes (INSERT/UPDATE/DELETE) per table, published with `CREATE PUBLICATION` and consumed with `CREATE SUBSCRIPTION`. Subscribers can have different schemas, indexes, extra tables, and different major versions or platforms, and can be writable. Physical replication copies the whole cluster byte for byte and the standby is read-only. Logical requires `wal_level = logical` and replica identity (usually a primary key) for UPDATE/DELETE.

**Follow-up:**

What is replica identity?

Answer: It tells the publisher which columns identify the old row for UPDATE/DELETE. Default is the primary key; `REPLICA IDENTITY FULL` logs the whole old row (expensive), and `USING INDEX` uses a unique index. Tables with none can't publish updates or deletes.

### DB-272 — When do you choose logical replication?

**Difficulty:** Intermediate

**Category:** Logical replication

**Question:**

When do you choose logical replication?

**Answer:**

Zero-downtime major version upgrades, migrating between hosts or clouds, replicating a subset of tables or rows (row filters and column lists, PG15+), feeding a data warehouse or other systems (CDC with Debezium via logical decoding), consolidating many databases into one, and cross-version setups. Not suited as the primary HA mechanism because it doesn't replicate DDL or sequences.

**Follow-up:**

Why isn't it a drop-in HA replacement?

Answer: It doesn't copy schema changes, sequence values, or large objects, so a promoted subscriber needs manual sync of those. Failover tooling and lag guarantees are weaker than physical replication.

### DB-273 — What are the limitations of logical replication in PG 16?

**Difficulty:** Senior

**Category:** Logical replication

**Question:**

What are the limitations of logical replication in PG 16?

**Answer:**

No DDL replication, sequences aren't synced (the value must be advanced manually at cutover), no large objects, conflicts (unique violations) stop the apply worker until resolved, tables need replica identity, and initial sync copies the table (it can be heavy). PG16 added logical decoding from standbys, parallel apply for large streamed transactions, and the `origin = none` option to avoid loops in bidirectional setups.

**Follow-up:**

How do you handle a subscriber conflict?

Answer: Fix the conflicting row on the subscriber, or skip the transaction with `ALTER SUBSCRIPTION ... SKIP (lsn = ...)` (PG15+) as a last resort. Always find the root cause so the data doesn't silently diverge.

### DB-274 — Outline a major version upgrade using logical replication versus `pg_upgrade`.

**Difficulty:** Senior

**Category:** Logical replication

**Question:**

Outline a major version upgrade using logical replication versus `pg_upgrade`.

**Answer:**

Logical: build the new-version cluster, copy the schema (`pg_dump -s`), create the publication and subscription, let it sync and catch up, test, then briefly stop writes, wait for zero lag, sync sequences, switch traffic, and keep the old cluster as a fallback. `pg_upgrade` is faster in-place (use `--link` for seconds to minutes of downtime) but needs a downtime window and has a harder rollback.

**Follow-up:**

What do you check before cutover?

Answer: Zero lag, sequences advanced, row counts or checksums compared, extension compatibility, and run `ANALYZE` on the new cluster since stats aren't transferred by logical replication. Have a rollback plan.

### DB-275 — When should you partition a table, and what do you gain?

**Difficulty:** Intermediate

**Category:** Partitioning

**Question:**

When should you partition a table, and what do you gain?

**Answer:**

Partition when a single table is very large (typically hundreds of GB or tens of millions of rows per period) and queries filter on the partition key. Benefits: partition pruning, faster maintenance (vacuum/index per partition), cheap retention (`DROP`/`DETACH` a partition instead of mass `DELETE`), and better cache locality for hot recent data. It isn't a magic speedup: without the key in the filter, every partition is scanned.

**Follow-up:**

Does partitioning replace indexing?

Answer: No. Each partition still needs indexes for its queries. Partitioning reduces the data set considered, while indexes make lookups in it fast.

### DB-276 — When do you use range partitioning?

**Difficulty:** Intermediate

**Category:** Partitioning

**Question:**

When do you use range partitioning?

**Answer:**

For time-series or sequential keys (`created_at`, id ranges): `PARTITION BY RANGE (created_at)` with monthly or daily partitions. It suits retention (drop old partitions), time-bounded queries, and archiving to cheaper storage. Create future partitions ahead of time (pg_partman or a cron job) and keep a `DEFAULT` partition cautiously.

**Follow-up:**

What happens if you insert a row with no matching partition?

Answer: It errors unless a `DEFAULT` partition exists. A default partition catches strays but can become a dumping ground and slows attaching new partitions, since it must be scanned for conflicting rows.

### DB-277 — When is list partitioning appropriate?

**Difficulty:** Intermediate

**Category:** Partitioning

**Question:**

When is list partitioning appropriate?

**Answer:**

When data divides into discrete categories such as region, tenant tier, or country: `PARTITION BY LIST (region)`. It fits data locality and per-category lifecycle, and large tenants can get their own partition. It's poor for high-cardinality or unpredictable keys, as partitions would multiply.

**Follow-up:**

How does it help multi-tenant systems?

Answer: A big tenant can sit in a dedicated partition (even on a separate tablespace) and be dropped or moved easily, while small tenants share a default partition. Pruning by `tenant_id` keeps queries narrow.

### DB-278 — When do you use hash partitioning?

**Difficulty:** Intermediate

**Category:** Partitioning

**Question:**

When do you use hash partitioning?

**Answer:**

When there's no natural range or list, and you want an even spread of rows or write load by key: `PARTITION BY HASH (user_id)` with `MODULUS N, REMAINDER i`. It reduces index and vacuum size per partition and contention on hot structures. No range pruning and no easy retention. Changing the partition count means rewriting data.

**Follow-up:**

Pick N how?

Answer: Choose a power of two with headroom (for example 16–64) since it's hard to change later, but avoid hundreds, since more partitions increase planning and metadata cost.

### DB-279 — How does partition pruning work?

**Difficulty:** Intermediate

**Category:** Partitioning

**Question:**

How does partition pruning work?

**Answer:**

The planner excludes partitions that can't match the `WHERE` clause using the partition bounds (plan-time pruning for constants, and run-time pruning for parameters and nested-loop values, controlled by `enable_partition_pruning`). Verify with `EXPLAIN`: only relevant partitions should appear, or show "Subplans Removed" for run-time pruning.

**Follow-up:**

What defeats pruning?

Answer: Filtering on a function or expression of the key (such as `date_trunc('day', created_at)` without a matching key expression), type mismatches or casts, or no predicate on the partition key. Rewrite as sargable ranges.

### DB-280 — What are the common problems with partitioned tables?

**Difficulty:** Senior

**Category:** Partitioning

**Question:**

What are the common problems with partitioned tables?

**Answer:**

Primary and unique keys must include the partition key; foreign keys *to* partitioned tables work (PG12+) but add complexity; too many partitions (thousands) slow planning and use memory; queries without the key hit all partitions; global unique indexes don't exist; and migrating an existing big table needs a careful plan.

**Follow-up:**

How do you partition an existing large table online?

Answer: Create the partitioned table, attach the old table as a partition with a `CHECK` constraint (to skip validation scanning), then add new partitions, or backfill in batches and swap with a rename in a short lock. Test lock behavior first.

### DB-281 — How do you manage partition lifecycles?

**Difficulty:** Intermediate

**Category:** Partitioning

**Question:**

How do you manage partition lifecycles?

**Answer:**

Automate creating future partitions (pg_partman or scheduled jobs), and retire old ones with `DETACH PARTITION ... CONCURRENTLY` (PG14+) then archive or `DROP`, which is instant compared to `DELETE` (no bloat, no WAL for row deletes). Monitor for missing partitions to avoid insert failures.

**Follow-up:**

Why is `DETACH ... CONCURRENTLY` preferred?

Answer: A plain detach takes an `ACCESS EXCLUSIVE` lock on the parent, blocking all queries. The concurrent form uses weaker locks, so it avoids stalls. It can't run inside a transaction block.

### DB-282 — What are the main approaches to sharding PostgreSQL?

**Difficulty:** Intermediate

**Category:** Sharding

**Question:**

What are the main approaches to sharding PostgreSQL?

**Answer:**

Application-level sharding (the app routes by shard key to separate databases), a directory/lookup service mapping keys to shards, range- or hash-based sharding, geo/tenant-based sharding (a tenant lives on one shard), and a middleware or extension such as Citus that distributes tables transparently. Pick it only after exhausting simpler options: it adds operational complexity.

**Follow-up:**

Why is tenant-based sharding popular for SaaS?

Answer: Most queries are within one tenant, so they hit one shard, with no cross-shard joins or transactions. Large tenants can be isolated and moved.

### DB-283 — How do you choose a shard key and handle hotspots and resharding?

**Difficulty:** Intermediate

**Category:** Sharding

**Question:**

How do you choose a shard key and handle hotspots and resharding?

**Answer:**

Pick a high-cardinality key present in most queries that spreads load evenly and keeps related data together (`tenant_id`, `user_id`). Avoid monotonic keys on range sharding (all writes hit the newest shard) and low-cardinality keys. Reduce resharding pain with many logical shards (virtual buckets) mapped to few physical nodes, so you move buckets rather than rehash everything.

**Follow-up:**

What is a "celebrity" or hot-tenant problem?

Answer: One key generates disproportionate load, overwhelming its shard. Solutions: dedicate a shard, split by a secondary key, add caching, or use a composite key.

### DB-284 — How do you handle queries and transactions spanning shards?

**Difficulty:** Senior

**Category:** Sharding

**Question:**

How do you handle queries and transactions spanning shards?

**Answer:**

Avoid them via data modeling (co-locate related data on the same key). Scatter-gather for reads when necessary (cost and latency scale with shard count). For writes: sagas/compensating actions, an outbox pattern, or two-phase commit (`PREPARE TRANSACTION`, which is fragile and holds locks if the coordinator dies). Global unique constraints need an ID scheme (Snowflake/UUID) rather than DB sequences.

**Follow-up:**

Why is 2PC risky?

Answer: A coordinator failure leaves prepared transactions holding locks and blocking vacuum until resolved. It's also slow. Many systems prefer eventual consistency with sagas.

### DB-285 — What is Citus and when would you consider it?

**Difficulty:** Senior

**Category:** Sharding

**Question:**

What is Citus and when would you consider it?

**Answer:**

Citus is a Postgres extension that turns a cluster into a distributed database: a coordinator plus worker nodes, with distributed tables sharded by a distribution column, reference tables replicated everywhere, and parallel distributed queries. It fits multi-tenant SaaS (co-locate by `tenant_id`) and real-time analytics. Queries filtering by the distribution column route to one shard, while others fan out. Constraints on cross-shard joins and unique keys apply.

**Follow-up:**

What is a reference table?

Answer: A small table (such as countries or plans) replicated in full to every worker, so joins with distributed tables stay local to each shard.

### DB-286 — Why does vacuum matter more as the database grows?

**Difficulty:** Intermediate

**Category:** Vacuum & bloat

**Question:**

Why does vacuum matter more as the database grows?

**Answer:**

MVCC leaves dead tuples after UPDATE/DELETE. Vacuum reclaims them for reuse, updates the visibility map (for index-only scans), updates the free space map, and freezes old XIDs. On large, write-heavy tables the default thresholds (20% dead rows) mean vacuum starts too late and runs a long time; falling behind causes bloat, slow queries, and wraparound risk.

**Follow-up:**

Does `VACUUM` shrink the file?

Answer: Mostly no: it marks space reusable inside the file and only truncates trailing empty pages. Returning space to the OS needs `VACUUM FULL`, `pg_repack`, or similar.

### DB-287 — How do you tune autovacuum for large hot tables?

**Difficulty:** Intermediate

**Category:** Vacuum & bloat

**Question:**

How do you tune autovacuum for large hot tables?

**Answer:**

Set per-table storage parameters: lower `autovacuum_vacuum_scale_factor` (such as 0.01 or 0.02) or use a fixed `autovacuum_vacuum_threshold`, raise `autovacuum_vacuum_cost_limit` (or lower `cost_delay`) so it runs faster, increase `autovacuum_max_workers` and `maintenance_work_mem`, and use `autovacuum_vacuum_insert_scale_factor` for insert-only tables. Monitor `pg_stat_user_tables` (`n_dead_tup`, `last_autovacuum`) and `pg_stat_progress_vacuum`.

**Follow-up:**

Why not disable autovacuum on a busy table?

Answer: Dead tuples accumulate, bloat grows, stats go stale, and wraparound eventually forces an emergency anti-wraparound vacuum at the worst time. Tune it instead.

### DB-288 — How do you detect and fix table and index bloat?

**Difficulty:** Senior

**Category:** Vacuum & bloat

**Question:**

How do you detect and fix table and index bloat?

**Answer:**

Detect with `pgstattuple`, bloat estimation queries, or comparing table size with expected live data. Fixes: tune autovacuum to prevent it; `REINDEX CONCURRENTLY` for indexes; `pg_repack` for online table and index rebuilds (needs a short lock and temporary 2× space); `VACUUM FULL` only in a maintenance window (`ACCESS EXCLUSIVE` lock). Prevent it by avoiding long transactions and using HOT-friendly design (`fillfactor`).

**Follow-up:**

Why prefer `pg_repack` over `VACUUM FULL`?

Answer: `VACUUM FULL` blocks all reads and writes for the whole rewrite. `pg_repack` rebuilds into a new table while the old is live and swaps with a brief lock, though it needs extra disk and a primary key or unique index.

### DB-289 — What is XID wraparound and how do you avoid it?

**Difficulty:** Senior

**Category:** Vacuum & bloat

**Question:**

What is XID wraparound and how do you avoid it?

**Answer:**

XIDs are 32-bit, so the counter wraps around. Vacuum freezes old tuples (`vacuum_freeze_min_age`, `autovacuum_freeze_max_age` of 200M by default) so they stay visible. If freezing falls behind, Postgres emits warnings and eventually stops accepting writes to prevent data loss. Monitor `age(datfrozenxid)` and `age(relfrozenxid)`, keep autovacuum healthy, and clear blockers like old prepared transactions and stale replication slots.

**Follow-up:**

What blocks freezing?

Answer: Anything holding back the xmin horizon: long-running transactions, abandoned prepared transactions, lagging replication slots, and `hot_standby_feedback` from a standby with a long query.

### DB-290 — How do long-running transactions hurt a scaled system?

**Difficulty:** Senior

**Category:** Vacuum & bloat

**Question:**

How do long-running transactions hurt a scaled system?

**Answer:**

They hold back the xmin horizon, so vacuum can't remove dead rows newer than their snapshot, causing table and index bloat across the whole database. They also hold locks, block DDL, and in `idle in transaction` state waste connections. Mitigate with `idle_in_transaction_session_timeout`, `statement_timeout`, and monitoring `pg_stat_activity` (`xact_start`, `state`).

**Follow-up:**

Where else can the horizon be held back?

Answer: Replication slots (`xmin`/`catalog_xmin`), hot standby feedback, and prepared transactions. Check all of them, not just `pg_stat_activity`.

### DB-291 — Compare logical and physical backups.

**Difficulty:** Intermediate

**Category:** Backup & DR

**Question:**

Compare logical and physical backups.

**Answer:**

Logical (`pg_dump`/`pg_dumpall`): SQL or custom-format export, portable across versions and platforms, good for single tables or small DBs, but slow to restore at scale and with no PITR. Physical (`pg_basebackup`, pgBackRest, Barman): a copy of data files plus WAL, fast to restore for big databases, supports PITR, but is same-major-version and whole-cluster.

**Follow-up:**

Which one for a 5 TB production DB?

Answer: Physical with WAL archiving (pgBackRest, for example) for disaster recovery and PITR, with incremental/differential backups. Use logical dumps selectively for specific tables or migrations.

### DB-292 — How does point-in-time recovery work?

**Difficulty:** Senior

**Category:** Backup & DR

**Question:**

How does point-in-time recovery work?

**Answer:**

Take a base backup, continuously archive WAL (`archive_mode = on`, `archive_command` or `archive_library`). To recover, restore the base backup, set `restore_command`, set a target (`recovery_target_time`, `_lsn`, `_xid`, or `_name`) and create `recovery.signal`. Postgres replays archived WAL up to the target, then promotes. It allows recovery from mistakes such as an accidental `DROP TABLE` or bad deploy.

**Follow-up:**

What happens if `archive_command` keeps failing?

Answer: WAL accumulates in `pg_wal` and can fill the disk, which crashes the primary. Alert on `pg_stat_archiver.failed_count` and archive lag.

### DB-293 — What matters in a backup strategy beyond taking backups?

**Difficulty:** Intermediate

**Category:** Backup & DR

**Question:**

What matters in a backup strategy beyond taking backups?

**Answer:**

Tools like pgBackRest or Barman give parallelism, compression, incremental backups, retention, encryption, and verification. Store off-host and cross-region, enforce retention, and, crucially, **test restores regularly** and measure time to restore. Verify with `pg_verifybackup` and checksums, and run automated restore drills with a sanity query. An untested backup is not a backup.

**Follow-up:**

What should a restore drill measure?

Answer: Actual RTO (time to a usable DB), the achieved RPO (the latest recoverable point), data validity, and the runbook's accuracy and who executes it.

### DB-294 — Define RPO and RTO and how they drive design.

**Difficulty:** Intermediate

**Category:** Backup & DR

**Question:**

Define RPO and RTO and how they drive design.

**Answer:**

RPO = how much data loss is acceptable (time); RTO = how long recovery may take. RPO ≈ 0 needs synchronous replication (and multi-AZ); minutes need async replicas plus WAL archiving. A low RTO needs automated failover with warm standbys; hours allow restoring from backup. Tighter targets cost more, so derive them from business impact per service.

**Follow-up:**

Does replication replace backups?

Answer: No. Replication copies mistakes (a bad `DELETE`, corruption) to the replicas immediately. Backups with PITR protect against logical errors; replication protects against node failure.

### DB-295 — How do multi-AZ and multi-region setups differ?

**Difficulty:** Senior

**Category:** Backup & DR

**Question:**

How do multi-AZ and multi-region setups differ?

**Answer:**

Multi-AZ puts the primary and a standby (often sync or semi-sync) in different availability zones in one region, which gives low-latency HA against zone failure with RPO near 0 and automatic failover. Multi-region adds disaster recovery against region loss with cross-region async replicas (RPO of seconds to minutes) and a manual or automated promotion; it comes with latency, cost, and consistency trade-offs. Write latency makes synchronous cross-region replication rare.

**Follow-up:**

Can a multi-AZ standby serve reads?

Answer: It depends: managed services like RDS Multi-AZ instance deployments keep it as a hidden standby, while Multi-AZ cluster deployments and self-managed setups can expose readable standbys. Add separate read replicas if you need more read capacity.

### DB-296 — What is write amplification in Postgres and how do you reduce it?

**Difficulty:** Senior

**Category:** Write amplification

**Question:**

What is write amplification in Postgres and how do you reduce it?

**Answer:**

One logical change causes many physical writes: heap tuple, every index entry (no HOT), WAL records, full-page writes after checkpoints (`full_page_writes`), replication to the standbys, and later vacuum. Mitigate: fewer and smaller indexes, HOT updates (don't update indexed columns, and set `fillfactor` below 100), longer `checkpoint_timeout` and a bigger `max_wal_size` to reduce full-page images, `wal_compression`, batch writes, and avoid wide-row updates of mostly unchanged data.

**Follow-up:**

What's a HOT update?

Answer: Heap-Only Tuple: if no indexed column changes and the new version fits on the same page, no new index entries are needed, so the update is cheaper and pruned quickly.

### DB-297 — Which timeouts should you set and why?

**Difficulty:** Intermediate

**Category:** Overload protection

**Question:**

Which timeouts should you set and why?

**Answer:**

`statement_timeout` (stops runaway queries), `lock_timeout` (stops a migration from queueing behind locks and blocking others), `idle_in_transaction_session_timeout` (releases held snapshots and locks), `idle_session_timeout` (PG14+), and `transaction_timeout` (PG17, not in 16). Set defaults per role (`ALTER ROLE ... SET`) with stricter values for the web app and looser ones for batch or admin roles. Pair them with client timeouts and retries.

**Follow-up:**

Why is `lock_timeout` important for migrations?

Answer: `ALTER TABLE` waiting for a lock queues behind a long query and then blocks all subsequent queries on that table. With `lock_timeout` of a few seconds, the migration fails fast and can be retried instead of causing an outage.

### DB-298 — How do you protect the database from overload?

**Difficulty:** Intermediate

**Category:** Overload protection

**Question:**

How do you protect the database from overload?

**Answer:**

Limit concurrency at the pooler and app (bounded pools and queues), apply timeouts, shed low-priority traffic (return 429/503, degrade features) when the queue grows, use circuit breakers and retries with exponential backoff and jitter to avoid retry storms, cache hot reads, rate-limit per tenant, and separate pools or roles for critical vs batch workloads. Fail fast rather than letting latency spiral.

**Follow-up:**

Why do retries make overload worse?

Answer: Synchronized retries multiply load on an already struggling system (retry storm). Use bounded retries, jittered backoff, retry budgets, and idempotent operations.

### DB-299 — How can CQRS-style read models help scale reads?

**Difficulty:** Senior

**Category:** CQRS

**Question:**

How can CQRS-style read models help scale reads?

**Answer:**

Keep the normalized OLTP schema as the write model and build denormalized read models (materialized views, summary tables, a search index, or a replica database) updated by triggers, an outbox plus CDC (logical replication), or events. Read queries become cheap and independently scalable. The costs: eventual consistency, extra complexity, and rebuild logic. Use it selectively for heavy read paths, not as a blanket pattern.

**Follow-up:**

Materialized view vs summary table maintained by events?

Answer: `REFRESH MATERIALIZED VIEW` (optionally `CONCURRENTLY`, which needs a unique index) recomputes everything, so it's simple but costly and stale between refreshes. Event-maintained summary tables update incrementally and are fresher, but need more code and careful idempotency.

### DB-300 — Latency rises and the primary is at 90% CPU as traffic doubles. What is your plan?

**Difficulty:** Senior

**Category:** Scenario

**Question:**

Latency rises and the primary is at 90% CPU as traffic doubles. What is your plan?

**Answer:**

(1) Diagnose: `pg_stat_statements`, wait events, `EXPLAIN`, connection counts. (2) Fix the top queries and indexes, and add pooling. (3) Cache hot reads and move reporting to replicas. (4) Scale up if cheap. (5) Tune autovacuum and bloat. (6) Partition big, time-based tables. (7) Reduce write work (batching, fewer indexes). (8) Only then consider sharding or Citus. Add timeouts, load shedding, and monitoring and test failover and restore throughout. Each step is measured against p95/p99 and saturation.

**Follow-up:**

How do you know when sharding is truly necessary?

Answer: When write throughput or data size exceeds what one well-tuned, scaled-up primary can handle (WAL/IO saturated, storage or maintenance windows unmanageable) and cheaper options are exhausted. Sharding is hard to reverse, so be sure the evidence says so.
