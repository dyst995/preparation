# DB06 — Scaling & High Availability

PostgreSQL 16. Questions DB-251–DB-300.

Vertical vs horizontal scaling, connection pooling (PgBouncer), read replicas and lag, streaming replication, failover and Patroni, logical replication, partitioning, sharding and Citus, vacuum and bloat at scale, backup and PITR, RPO/RTO, multi-AZ, write amplification, timeouts, load shedding, CQRS read models. Deep indexing is DB03; transactions are DB04.

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

### DB-255 — How do you size `default_pool_size` / `max_connections`?

**Difficulty:** Intermediate

**Category:** Connection pooling

**Question:**

How do you size `default_pool_size` / `max_connections`?

**Answer:**

Start at roughly two to four active server connections per CPU core, then load-test. Running more queries at once than the CPU and disk can handle only makes them queue inside Postgres and raises latency. Cap pools per database and user, and allow many client connections. Budget `max_connections` as the sum of all pool sizes across poolers, plus headroom for admin and superuser connections. Use `reserve_pool` for bursts.

**Follow-up:**

What happens when the pool is exhausted?

Answer: Clients wait in the pooler's queue until `query_wait_timeout`, then get errors. That is better than overloading the database, but the app needs timeouts and retries with jitter. Watch `cl_waiting` and `maxwait` in `SHOW POOLS`.

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

### DB-258 — How do you give users read-your-writes consistency with async replicas?

**Difficulty:** Intermediate

**Category:** Read replicas

**Question:**

How do you give users read-your-writes consistency with async replicas?

**Answer:**

There are a few approaches. Send a user's reads to the primary for a short time after they write. Or record the commit position (`pg_current_wal_lsn()`) after the write, and read from a replica only once its `pg_last_wal_replay_lsn()` has passed it. Sticky sessions also help. Synchronous replication with `remote_apply` works but is costly. Most apps use "primary for N seconds after a write" or the LSN wait.

**Follow-up:**

What are the downsides of the LSN-wait approach?

Answer: It needs plumbing, because the LSN must travel with the user's session or token. It adds waiting time, and needs a fallback to the primary on timeout. Time-based pinning is simpler but less exact.

### DB-259 — How does physical streaming replication work?

**Difficulty:** Intermediate

**Category:** Replication

**Question:**

How does physical streaming replication work?

**Answer:**

The standby connects to a walsender process on the primary and receives WAL records as they are produced. It writes them to its own WAL, and its startup process replays them, producing a byte-for-byte copy of the whole cluster. You set it up from a base backup (`pg_basebackup`), `primary_conninfo`, and a `standby.signal` file. It works at the block level, copies everything, and needs the same major version.

**Follow-up:**

What if the standby falls behind and WAL is recycled?

Answer: The standby can't continue and must be rebuilt, unless a replication slot, `wal_keep_size`, or a WAL archive (`restore_command`) kept the needed WAL. Slots solve this but can fill the primary's disk if the standby disappears.

### DB-260 — Compare sync and async replication. What is the trade-off?

**Difficulty:** Intermediate

**Category:** Replication

**Question:**

Compare sync and async replication. What is the trade-off?

**Answer:**

With async replication, the primary commits without waiting for the standby. That gives low latency and no stall if the standby dies, but a failover can lose recent commits (RPO above zero). With sync replication, commit waits for the standby to acknowledge, so data loss can be near zero, but each commit pays a network round trip, and a failed standby can block writes unless other standbys exist. It is a trade-off between latency and durability.

**Follow-up:**

How do you avoid a single sync standby blocking writes?

Answer: Use quorum commit, for example `synchronous_standby_names = 'ANY 1 (s1, s2, s3)'`, so any one standby can acknowledge. An orchestrator like Patroni can also downgrade a failed sync standby to async.

### DB-261 — Explain the `synchronous_commit` settings.

**Difficulty:** Senior

**Category:** Replication

**Question:**

Explain the `synchronous_commit` settings.

**Answer:**

Each setting decides when the commit is acknowledged. `off`: before the WAL is flushed, so a crash can lose recent commits, but the database stays consistent. `local`: after a flush on the primary only. `remote_write`: the standby has received and written it to the OS. `on`: the standby has flushed it to disk. `remote_apply`: the standby has replayed it, so queries there see it. Each step adds durability or visibility and costs latency. You can set it per transaction.

**Follow-up:**

Where is per-transaction `synchronous_commit = off` appropriate?

Answer: For low-value, high-volume writes like metrics, logs, or click events. A crash can lose commits from roughly the last 200 ms to 600 ms (up to three times `wal_writer_delay`). Keep payments on `on`. Unlike `fsync = off`, it can't corrupt the database.

### DB-262 — Why do queries get cancelled on a hot standby?

**Difficulty:** Senior

**Category:** Replication

**Question:**

Why do queries get cancelled on a hot standby?

**Answer:**

WAL replay sometimes has to remove row versions (from vacuum), drop objects, or take locks that a running standby query still needs. The standby then either delays replay, up to `max_standby_streaming_delay`, or cancels the query with "canceling statement due to conflict with recovery". `hot_standby_feedback = on` tells the primary to keep rows the standby still needs, which reduces cancellations but can cause bloat on the primary.

**Follow-up:**

How do you run long analytics safely on a replica?

Answer: Use a dedicated replica with a large (or `-1`) `max_standby_streaming_delay` and accept the lag, or enable `hot_standby_feedback` and accept the bloat risk. For heavy analytics, a logical replica or a warehouse is often better.

### DB-263 — What do replication slots do and what is the risk?

**Difficulty:** Senior

**Category:** Replication

**Question:**

What do replication slots do and what is the risk?

**Answer:**

A replication slot makes the primary keep WAL (and, for logical slots, catalog data) until the consumer confirms it has received it, so the consumer can't lose its place. The risk is an abandoned or lagging slot: WAL piles up until the disk fills and the primary goes down. Mitigate with `max_slot_wal_keep_size`, monitor `pg_replication_slots` (`restart_lsn`, `wal_status`), and drop dead slots.

**Follow-up:**

What does `max_slot_wal_keep_size` trade off?

Answer: It protects the primary's disk by invalidating slots that fall too far behind, but that consumer must then be rebuilt or resynced. You choose primary survival over replica continuity.

### DB-264 — What is the difference between failover and switchover?

**Difficulty:** Intermediate

**Category:** Failover & HA

**Question:**

What is the difference between failover and switchover?

**Answer:**

Switchover is a planned, graceful role swap, used for maintenance or upgrades. You stop writes, let the standby catch up, promote it, and turn the old primary into a standby, with no data loss. Failover is an unplanned promotion after the primary has failed. It may lose commits that were not yet replicated (with async replication), and the old primary must be fenced and then rebuilt or rewound.

**Follow-up:**

How do you make switchover near-zero-downtime?

Answer: Pause connections at the pooler (PgBouncer `PAUSE`), wait until the replica's LSN matches, promote, repoint the pooler, and `RESUME`. Clients see a short stall instead of errors.

### DB-265 — What happens when you promote a standby?

**Difficulty:** Intermediate

**Category:** Failover & HA

**Question:**

What happens when you promote a standby?

**Answer:**

Running `pg_ctl promote` or `pg_promote()` ends recovery. The standby finishes replaying the WAL it has, starts a new timeline (the timeline ID increases by one), and begins accepting writes. Timelines keep the WAL histories before and after the fork from being confused. Other standbys must follow the new timeline (`recovery_target_timeline` defaults to `latest`), and the old primary can't simply rejoin because its WAL has diverged.

**Follow-up:**

Why can't the old primary just restart as a standby?

Answer: It may contain WAL the new primary never received, so its history has diverged. It must be rewound with `pg_rewind` or rebuilt from a fresh base backup.

### DB-266 — What is `pg_rewind` and when do you use it?

**Difficulty:** Senior

**Category:** Failover & HA

**Question:**

What is `pg_rewind` and when do you use it?

**Answer:**

`pg_rewind` brings a diverged old primary back in sync with the new primary by copying only the blocks that changed since the fork point, instead of taking a full base backup. It needs data checksums or `wal_log_hints = on`, plus the required WAL to be available. It makes rejoining a failed primary after failover quick, even for large databases.

**Follow-up:**

What are the prerequisites?

Answer: Checksums or `wal_log_hints` must have been enabled before the divergence, `full_page_writes` must be on, you need access to the new primary, and the old primary must be stopped. If these aren't met, rebuild the node.

### DB-267 — What is split brain and how is it prevented?

**Difficulty:** Senior

**Category:** Failover & HA

**Question:**

What is split brain and how is it prevented?

**Answer:**

Split brain is when two nodes both act as primary and accept writes, so the data diverges and can't be merged automatically. Prevent it with a single source of truth for leadership, such as a consensus store with a leader lease. The old primary must demote itself when it loses the lease. Add fencing: STONITH, a watchdog, removing the virtual IP or route, or blocking it at the network or storage level. Promotion requires a quorum.

**Follow-up:**

Why is a watchdog useful?

Answer: If the primary's HA agent hangs and can't renew its lease, the watchdog resets the host, so it can't keep serving writes after another node has been promoted.

### DB-268 — What does Patroni do?

**Difficulty:** Intermediate

**Category:** Failover & HA

**Question:**

What does Patroni do?

**Answer:**

Patroni is an HA manager that runs alongside each Postgres node. It uses a distributed configuration store (etcd, Consul, ZooKeeper, or Kubernetes) and elects a leader by holding a leader key with a time limit. It handles automatic failover, creating replicas, configuration, and switchover. It also exposes a REST API (`/primary`, `/replica`) that load balancers use for health checks, and it prefers promoting the replica with the least lag.

**Follow-up:**

What happens if the DCS is unavailable?

Answer: The leader can't renew its lease, so it demotes itself to avoid split brain (unless failsafe mode is configured), and writes stop. That's why the store must itself be highly available, with 3 or 5 nodes.

### DB-269 — Why do HA setups use Raft/etcd-style consensus?

**Difficulty:** Senior

**Category:** Failover & HA

**Question:**

Why do HA setups use Raft/etcd-style consensus?

**Answer:**

They provide reliable agreement on who the leader is, even during failures and network partitions. A majority (2 of 3, or 3 of 5) must agree on every write, so the minority side of a partition can't elect its own leader. A cluster of N nodes tolerates up to (N−1)/2 failures when N is odd. Postgres streaming replication has no built-in consensus, so an external system supplies it.

**Follow-up:**

Why 3 etcd nodes rather than 2?

Answer: Two nodes need both to be up to form a majority, so they tolerate no failures and are less reliable than one node. Three tolerate one failure. Spread them across availability zones.

### DB-270 — How do applications find the current primary after failover?

**Difficulty:** Intermediate

**Category:** Failover & HA

**Question:**

How do applications find the current primary after failover?

**Answer:**

Several ways: a virtual IP or DNS name that moves to the new primary; HAProxy using Patroni's REST health checks; PgBouncer repointed to the new host; a cloud endpoint such as the RDS cluster endpoint; or a libpq multi-host connection string with `target_session_attrs=read-write` (or `prefer-standby` for reads). Applications still need to handle dropped connections with retries.

**Follow-up:**

What's the DNS risk?

Answer: DNS caching, in resolvers and in clients, can keep clients pointed at the old primary. Use low TTLs, or prefer a proxy or virtual IP, and fence the old primary so stale clients can't write to it.

### DB-271 — How does logical replication differ from physical?

**Difficulty:** Intermediate

**Category:** Logical replication

**Question:**

How does logical replication differ from physical?

**Answer:**

Logical replication decodes the WAL into row-level changes (insert, update, delete) for chosen tables. You publish them with `CREATE PUBLICATION` and consume them with `CREATE SUBSCRIPTION`. Subscribers can have different schemas, extra indexes and tables, a different major version, and can accept writes. Physical replication copies the whole cluster byte for byte, and the standby is read-only. Logical needs `wal_level = logical` and a replica identity, usually a primary key, for updates and deletes.

**Follow-up:**

What is replica identity?

Answer: It tells the publisher which columns identify the old row for an update or delete. The default is the primary key; `REPLICA IDENTITY FULL` logs the whole old row (expensive), and `USING INDEX` uses a unique index. Tables without one can't publish updates or deletes.

### DB-272 — When do you choose logical replication?

**Difficulty:** Intermediate

**Category:** Logical replication

**Question:**

When do you choose logical replication?

**Answer:**

Use it for major version upgrades with little downtime, moving between hosts or clouds, replicating only some tables or rows (row filters and column lists, PG15+), feeding a data warehouse or CDC pipeline such as Debezium, and consolidating several databases into one. It is not a good primary HA mechanism, because it doesn't replicate DDL or sequence values.

**Follow-up:**

Why isn't it a drop-in HA replacement?

Answer: It doesn't copy schema changes, sequence values, or large objects, so a promoted subscriber needs manual syncing of those. Failover tooling and lag guarantees are also weaker than with physical replication.

### DB-273 — What are the limitations of logical replication in PG 16?

**Difficulty:** Senior

**Category:** Logical replication

**Question:**

What are the limitations of logical replication in PG 16?

**Answer:**

It doesn't replicate DDL, so schema changes must be applied by hand on both sides. Sequence values aren't synced, so they must be advanced at cutover. Large objects aren't included. Conflicts such as unique violations stop the apply worker until fixed. Tables need a replica identity, and the initial sync copies the full table, which can be heavy. PG16 added logical decoding from standbys, parallel apply of large transactions, and `origin = none` to avoid loops in two-way setups.

**Follow-up:**

How do you handle a subscriber conflict?

Answer: Fix the conflicting row on the subscriber, or as a last resort skip the transaction with `ALTER SUBSCRIPTION … SKIP (lsn = …)` (PG15+). Always find the root cause, or the data may silently diverge.

### DB-274 — Outline a major version upgrade using logical replication versus `pg_upgrade`.

**Difficulty:** Senior

**Category:** Logical replication

**Question:**

Outline a major version upgrade using logical replication versus `pg_upgrade`.

**Answer:**

With logical replication: build the new-version cluster, copy the schema (`pg_dump -s`), create the publication and subscription, and let it sync and catch up. Test it. Then briefly stop writes, wait for zero lag, sync sequences, switch traffic, and keep the old cluster as a fallback. `pg_upgrade` upgrades in place and is faster (`--link` takes seconds to minutes), but it needs a downtime window and has a harder rollback.

**Follow-up:**

What do you check before cutover?

Answer: Zero lag, advanced sequences, matching row counts or checksums, and extension compatibility. Run `ANALYZE` on the new cluster, because planner statistics aren't transferred. Have a rollback plan ready.

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

### DB-276 — When do you use range partitioning?

**Difficulty:** Intermediate

**Category:** Partitioning

**Question:**

When do you use range partitioning?

**Answer:**

Use it for time-series or sequential keys such as `created_at` or ID ranges: `PARTITION BY RANGE (created_at)` with monthly or daily partitions. It suits retention (drop old partitions), time-bounded queries, and archiving to cheaper storage. Create future partitions ahead of time with pg_partman or a scheduled job, and be careful with a `DEFAULT` partition.

**Follow-up:**

What happens if you insert a row with no matching partition?

Answer: It fails with an error unless a `DEFAULT` partition exists. A default partition catches strays, but it can become a dumping ground, and attaching new partitions gets slower because the default must be scanned for conflicting rows.

### DB-277 — When is list partitioning appropriate?

**Difficulty:** Intermediate

**Category:** Partitioning

**Question:**

When is list partitioning appropriate?

**Answer:**

When data falls into a small number of discrete categories such as region, tenant tier, or country: `PARTITION BY LIST (region)`. It fits data locality and per-category lifecycle, and large tenants can get their own partition. It is a poor fit for high-cardinality or unpredictable keys, because you would end up with too many partitions.

**Follow-up:**

How does it help multi-tenant systems?

Answer: A large tenant can sit in its own partition, even on a separate tablespace, and be moved or dropped easily, while small tenants share a default partition. Pruning by `tenant_id` keeps queries narrow.

### DB-278 — When do you use hash partitioning?

**Difficulty:** Intermediate

**Category:** Partitioning

**Question:**

When do you use hash partitioning?

**Answer:**

Use it when there's no natural range or list and you want rows or write load spread evenly by key: `PARTITION BY HASH (user_id)` with `MODULUS N, REMAINDER i`. It keeps indexes and vacuum work smaller per partition and reduces contention on hot structures. The downsides: no range pruning, no easy retention, and changing the partition count means rewriting data.

**Follow-up:**

Pick N how?

Answer: Choose a power of two with some headroom, for example 16 to 64, since it is hard to change later. Avoid hundreds, because more partitions raise planning and metadata cost.

### DB-279 — How does partition pruning work?

**Difficulty:** Intermediate

**Category:** Partitioning

**Question:**

How does partition pruning work?

**Answer:**

The planner skips partitions that can't match the `WHERE` clause, using each partition's bounds. With constant values this happens at plan time. With parameters or values from a nested loop it happens at run time. The setting `enable_partition_pruning` controls it. Check with `EXPLAIN`: only the relevant partitions should appear, or you'll see "Subplans Removed" for run-time pruning.

**Follow-up:**

What defeats pruning?

Answer: Wrapping the key in a function or expression, such as `date_trunc('day', created_at)` with no matching partition expression, type mismatches or casts, or no condition on the partition key at all. Rewrite filters as plain ranges on the key.

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

### DB-281 — How do you manage partition lifecycles?

**Difficulty:** Intermediate

**Category:** Partitioning

**Question:**

How do you manage partition lifecycles?

**Answer:**

Automate creating future partitions with pg_partman or scheduled jobs, and monitor for missing ones so inserts don't fail. Retire old partitions with `DETACH PARTITION … CONCURRENTLY` (PG14+), then archive or `DROP` them. That is nearly instant compared to `DELETE`, with no bloat and no row-by-row WAL.

**Follow-up:**

Why is `DETACH ... CONCURRENTLY` preferred?

Answer: A plain detach takes an `ACCESS EXCLUSIVE` lock on the parent and blocks all queries. The concurrent form uses weaker locks and avoids stalls. It can't run inside a transaction block.

### DB-282 — What are the main approaches to sharding PostgreSQL?

**Difficulty:** Intermediate

**Category:** Sharding

**Question:**

What are the main approaches to sharding PostgreSQL?

**Answer:**

Application-level sharding, where the app routes by shard key to separate databases. A directory service that maps keys to shards. Range-based or hash-based sharding. Tenant or geography-based sharding, where each tenant lives on one shard. And middleware or an extension such as Citus, which distributes tables for you. Use sharding only after simpler options are exhausted, because it adds a lot of operational complexity.

**Follow-up:**

Why is tenant-based sharding popular for SaaS?

Answer: Most queries stay within one tenant, so they hit one shard, with no cross-shard joins or transactions. Large tenants can also be isolated and moved.

### DB-283 — How do you choose a shard key and handle hotspots and resharding?

**Difficulty:** Intermediate

**Category:** Sharding

**Question:**

How do you choose a shard key and handle hotspots and resharding?

**Answer:**

Choose a high-cardinality key that appears in most queries, spreads load evenly, and keeps related data together, such as `tenant_id` or `user_id`. Avoid steadily increasing keys with range sharding, since all new writes hit the newest shard, and avoid low-cardinality keys. To make resharding easier, use many small logical shards (virtual buckets) mapped onto a few physical nodes, so you move buckets instead of rehashing everything.

**Follow-up:**

What is a "celebrity" or hot-tenant problem?

Answer: One key produces far more load than the others and overwhelms its shard. Fixes include a dedicated shard, splitting by a secondary key, adding caching, or using a composite key.

### DB-284 — How do you handle queries and transactions spanning shards?

**Difficulty:** Senior

**Category:** Sharding

**Question:**

How do you handle queries and transactions spanning shards?

**Answer:**

Avoid them through data modeling: keep related data on the same shard key. When you must read across shards, use scatter-gather, whose cost grows with the number of shards. For cross-shard writes, use sagas with compensating actions, an outbox, or two-phase commit (`PREPARE TRANSACTION`), which is fragile and holds locks if the coordinator dies. Global unique IDs should come from an ID scheme such as Snowflake or UUID, not per-shard sequences.

**Follow-up:**

Why is 2PC risky?

Answer: If the coordinator fails, prepared transactions keep their locks and block vacuum until someone resolves them. It is also slow. Many systems prefer eventual consistency with sagas.

### DB-285 — What is Citus and when would you consider it?

**Difficulty:** Senior

**Category:** Sharding

**Question:**

What is Citus and when would you consider it?

**Answer:**

Citus is a Postgres extension that turns a cluster into a distributed database. A coordinator node sends queries to worker nodes. Distributed tables are sharded by a distribution column, small reference tables are copied to every worker, and queries can run in parallel. It fits multi-tenant SaaS (co-locate data by `tenant_id`) and real-time analytics. Queries that filter on the distribution column go to one shard; others fan out. Cross-shard joins and unique keys have restrictions.

**Follow-up:**

What is a reference table?

Answer: A small table, such as countries or plans, replicated in full to every worker, so joins with distributed tables stay local to each shard.

### DB-286 — Why does vacuum matter more as the database grows?

**Difficulty:** Intermediate

**Category:** Vacuum & bloat

**Question:**

Why does vacuum matter more as the database grows?

**Answer:**

MVCC leaves dead tuples behind after updates and deletes. Vacuum makes that space reusable, updates the visibility map (used by index-only scans) and free space map, and freezes old transaction IDs. By default, autovacuum starts when about 20% of a table is dead, which on a huge table is too late and takes long to finish. Falling behind causes bloat, slow queries, and eventually wraparound risk.

**Follow-up:**

Does `VACUUM` shrink the file?

Answer: Mostly no. It marks space inside the file reusable and only trims empty pages at the end. Returning space to the OS needs `VACUUM FULL`, `pg_repack`, or similar.

### DB-287 — How do you tune autovacuum for large hot tables?

**Difficulty:** Intermediate

**Category:** Vacuum & bloat

**Question:**

How do you tune autovacuum for large hot tables?

**Answer:**

Set per-table storage parameters. Lower `autovacuum_vacuum_scale_factor` (for example 0.01 to 0.02), or use a fixed threshold, so vacuum starts sooner. Raise `autovacuum_vacuum_cost_limit` or lower the cost delay so it runs faster. Increase `autovacuum_max_workers` and `maintenance_work_mem`, and use `autovacuum_vacuum_insert_scale_factor` for insert-only tables. Monitor `pg_stat_user_tables` and `pg_stat_progress_vacuum`.

**Follow-up:**

Why not disable autovacuum on a busy table?

Answer: Dead tuples pile up, bloat grows, and statistics go stale. Eventually wraparound forces an emergency anti-wraparound vacuum at the worst time. Tune it instead.

### DB-288 — How do you detect and fix table and index bloat?

**Difficulty:** Senior

**Category:** Vacuum & bloat

**Question:**

How do you detect and fix table and index bloat?

**Answer:**

Detect it with `pgstattuple`, bloat-estimation queries, or by comparing table size with the expected live data. To fix it: tune autovacuum to prevent more; use `REINDEX CONCURRENTLY` for indexes; use `pg_repack` to rebuild tables and indexes online (it needs a brief lock and about double the space); and use `VACUUM FULL` only in a maintenance window, since it takes an `ACCESS EXCLUSIVE` lock. Prevent bloat by avoiding long transactions and designing for HOT updates (`fillfactor`).

**Follow-up:**

Why prefer `pg_repack` over `VACUUM FULL`?

Answer: `VACUUM FULL` blocks all reads and writes during the whole rewrite. `pg_repack` builds a new copy while the table stays live and swaps with a brief lock, though it needs extra disk and a primary key or unique index.

### DB-289 — What is XID wraparound and how do you avoid it?

**Difficulty:** Senior

**Category:** Vacuum & bloat

**Question:**

What is XID wraparound and how do you avoid it?

**Answer:**

Transaction IDs are 32-bit, so the counter eventually wraps around. Vacuum prevents trouble by freezing old rows so they stay visible; autovacuum is forced once a table's age reaches `autovacuum_freeze_max_age` (200 million by default). If freezing falls behind, Postgres warns, then stops accepting writes to avoid data loss. Monitor `age(datfrozenxid)` and `age(relfrozenxid)`, keep autovacuum healthy, and clear blockers such as old prepared transactions and stale replication slots.

**Follow-up:**

What blocks freezing?

Answer: Anything holding back the oldest-visible-transaction horizon: long-running transactions, forgotten prepared transactions, lagging replication slots, and `hot_standby_feedback` from a standby running a long query.

### DB-290 — How do long-running transactions hurt a scaled system?

**Difficulty:** Senior

**Category:** Vacuum & bloat

**Question:**

How do long-running transactions hurt a scaled system?

**Answer:**

A long transaction holds back the oldest-visible-transaction horizon, so vacuum can't remove dead rows newer than its snapshot. That causes bloat across the whole database, not just the tables it touched. It also holds locks, blocks DDL, and when `idle in transaction` it wastes connections. Mitigate with `idle_in_transaction_session_timeout` and `statement_timeout`, and monitor `xact_start` and `state` in `pg_stat_activity`.

**Follow-up:**

Where else can the horizon be held back?

Answer: Replication slots (`xmin` and `catalog_xmin`), hot standby feedback, and prepared transactions. Check all of them, not just `pg_stat_activity`.

### DB-291 — Compare logical and physical backups.

**Difficulty:** Intermediate

**Category:** Backup & DR

**Question:**

Compare logical and physical backups.

**Answer:**

A logical backup (`pg_dump`, `pg_dumpall`) exports SQL or a custom format. It is portable across versions and platforms and good for single tables or small databases, but slow to restore at scale and gives no point-in-time recovery. A physical backup (`pg_basebackup`, pgBackRest, Barman) copies the data files plus WAL. It restores quickly for large databases and supports PITR, but it covers the whole cluster and needs the same major version.

**Follow-up:**

Which one for a 5 TB production DB?

Answer: Physical backups with WAL archiving, for example pgBackRest, using incremental or differential backups, for disaster recovery and PITR. Use logical dumps selectively for specific tables or migrations.

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

### DB-293 — What matters in a backup strategy beyond taking backups?

**Difficulty:** Intermediate

**Category:** Backup & DR

**Question:**

What matters in a backup strategy beyond taking backups?

**Answer:**

Tools like pgBackRest or Barman add parallelism, compression, incremental backups, retention, encryption, and verification. Store backups off the host and in another region, enforce retention, and above all **test restores regularly** and measure how long they take. Verify with `pg_verifybackup` and checksums, and run automated restore drills that finish with a sanity query. An untested backup is not a backup.

**Follow-up:**

What should a restore drill measure?

Answer: The actual RTO (time until a usable database), the achieved RPO (the latest recoverable point), data validity, and whether the runbook is accurate and someone can follow it.

### DB-294 — Define RPO and RTO and how they drive design.

**Difficulty:** Intermediate

**Category:** Backup & DR

**Question:**

Define RPO and RTO and how they drive design.

**Answer:**

RPO is how much data loss is acceptable, measured in time. RTO is how long recovery may take. An RPO near zero needs synchronous replication, usually across availability zones. An RPO of minutes can use async replicas plus WAL archiving. A low RTO needs automated failover to a warm standby; hours of RTO allow restoring from backup. Tighter targets cost more, so derive them from business impact for each service.

**Follow-up:**

Does replication replace backups?

Answer: No. Replication copies mistakes, such as a bad `DELETE` or corruption, to the replicas almost immediately. Backups with PITR protect against logical errors; replication protects against node failure.

### DB-295 — How do multi-AZ and multi-region setups differ?

**Difficulty:** Senior

**Category:** Backup & DR

**Question:**

How do multi-AZ and multi-region setups differ?

**Answer:**

Multi-AZ puts the primary and a standby, often synchronous, in different availability zones of one region. It gives low-latency HA against a zone failure, with near-zero RPO and automatic failover. Multi-region adds disaster recovery against losing a whole region, using cross-region async replicas (RPO of seconds to minutes) and manual or automated promotion. It brings added latency, cost, and consistency trade-offs. Synchronous cross-region replication is rare because of write latency.

**Follow-up:**

Can a multi-AZ standby serve reads?

Answer: It depends. In RDS Multi-AZ instance deployments the standby is hidden, while Multi-AZ cluster deployments and self-managed setups can expose readable standbys. Add separate read replicas if you need more read capacity.

### DB-296 — What is write amplification in Postgres and how do you reduce it?

**Difficulty:** Senior

**Category:** Write amplification

**Question:**

What is write amplification in Postgres and how do you reduce it?

**Answer:**

It means one logical change causes many physical writes: the new heap row, an entry in every index (unless the update is HOT), WAL records, full-page images after checkpoints, copies sent to standbys, and later vacuum work. To reduce it: keep fewer and smaller indexes; enable HOT updates by not updating indexed columns and setting `fillfactor` below 100; lengthen `checkpoint_timeout` and raise `max_wal_size`; use `wal_compression`; batch writes; and avoid rewriting wide rows whose data barely changed.

**Follow-up:**

What's a HOT update?

Answer: Heap-Only Tuple: if no indexed column changes and the new row version fits on the same page, no new index entries are needed. The update is cheaper and the old version is cleaned up quickly.

### DB-297 — Which timeouts should you set and why?

**Difficulty:** Intermediate

**Category:** Overload protection

**Question:**

Which timeouts should you set and why?

**Answer:**

`statement_timeout` stops runaway queries. `lock_timeout` stops a migration from queueing behind locks and blocking others. `idle_in_transaction_session_timeout` releases locks and snapshots held by idle sessions. `idle_session_timeout` (PG14+) closes idle connections. `transaction_timeout` arrived in PG17, so it isn't in PG16. Set defaults per role with `ALTER ROLE … SET`, stricter for the web app and looser for batch or admin roles, and pair them with client timeouts and retries.

**Follow-up:**

Why is `lock_timeout` important for migrations?

Answer: An `ALTER TABLE` waiting for a lock queues behind a long query and then blocks every later query on that table. With a `lock_timeout` of a few seconds, the migration fails fast and can be retried instead of causing an outage.

### DB-298 — How do you protect the database from overload?

**Difficulty:** Intermediate

**Category:** Overload protection

**Question:**

How do you protect the database from overload?

**Answer:**

Limit concurrency with bounded pools and queues at the pooler and in the app, and apply timeouts. Shed low-priority traffic (return 429 or 503, or degrade features) when queues grow. Use circuit breakers, and retries with exponential backoff and jitter so retries don't pile up. Cache hot reads, rate-limit per tenant, and give critical and batch workloads separate pools or roles. Fail fast instead of letting latency spiral.

**Follow-up:**

Why do retries make overload worse?

Answer: Synchronized retries multiply the load on a system that is already struggling, which is called a retry storm. Use bounded retries, jittered backoff, retry budgets, and idempotent operations.

### DB-299 — How can CQRS-style read models help scale reads?

**Difficulty:** Senior

**Category:** CQRS

**Question:**

How can CQRS-style read models help scale reads?

**Answer:**

Keep the normalized OLTP schema as the write model, and build denormalized read models from it: materialized views, summary tables, a search index, or a separate replica database. Keep them updated with triggers, an outbox plus CDC (logical replication), or events. Read queries become cheap and can scale independently. The costs are eventual consistency, extra complexity, and rebuild logic, so use it for heavy read paths only, not everywhere.

**Follow-up:**

Materialized view vs summary table maintained by events?

Answer: `REFRESH MATERIALIZED VIEW` (optionally `CONCURRENTLY`, which needs a unique index) recomputes everything, so it is simple but costly and stale between refreshes. Event-maintained summary tables update incrementally and are fresher, but need more code and careful idempotency.

### DB-300 — Latency rises and the primary is at 90% CPU as traffic doubles. What is your plan?

**Difficulty:** Senior

**Category:** Scenario

**Question:**

Latency rises and the primary is at 90% CPU as traffic doubles. What is your plan?

**Answer:**

First diagnose with `pg_stat_statements`, wait events, `EXPLAIN`, and connection counts. Then fix the top queries and indexes and add pooling. Cache hot reads and move reporting to replicas. Scale up if it's cheap, tune autovacuum to control bloat, and partition large time-based tables. Reduce write work with batching and fewer indexes. Consider sharding or Citus only after that. Add timeouts, load shedding, and monitoring, and test failover and restore throughout. Measure each step against p95/p99 latency and saturation.

**Follow-up:**

How do you know when sharding is truly necessary?

Answer: When write throughput or data size exceeds what one well-tuned, scaled-up primary can handle, for example WAL and disk I/O are saturated or maintenance windows are unmanageable, and cheaper options are exhausted. Sharding is hard to reverse, so make sure the evidence supports it.
