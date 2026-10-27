# DB07 — Redis & Caching

Redis 7.x in front of Postgres. Questions DB-301–DB-350. Postgres stays the source of truth unless a question says otherwise.

Data structures, TTL and eviction, cache-aside, write-through, write-behind, stampede and singleflight, invalidation, key design, sessions, pub/sub versus streams, Lua and transactions, RDB and AOF, Cluster versus Sentinel, memory and hot keys, rate limiting, idempotency, and materialized views.

### DB-301 — When would you cache a Postgres row as a Redis string instead of a hash?

**Difficulty:** Junior

**Category:** Data structures

**Question:**

When would you cache a Postgres row as a Redis string instead of a hash?

**Answer:**

You store a string when the app always loads and saves the whole row together. Serialize the JSON, `SET` it with a TTL, and `GET` it in one round trip. A hash is the better fit when callers read or update a few fields, because `HGET` and `HSET` touch one column without rewriting the rest. Small hashes stay compact in Redis 7 listpack encoding. Once every request needs the full entity, the string is the simpler object and usually the smaller one.

**Follow-up:**

How do you keep a hash from drifting when Postgres updates a column you did not `HSET`?

Answer: Treat the hash as a copy of one committed row version, not as a scratch pad of independent fields. On any Postgres update, either rewrite the whole hash from the new row or `UNLINK` the key and let the next read fill it. Partial `HSET` only works if that same statement is the only writer and you also bump a version field. If another column changed in the database and you patch one field, the hash quietly becomes a mix of two generations.

### DB-302 — What are lists, sets, and sorted sets actually for in a cache?

**Difficulty:** Junior

**Category:** Data structures

**Question:**

What are lists, sets, and sorted sets actually for in a cache?

**Answer:**

A list keeps order of insertion, so it fits a recent-items feed: `LPUSH` the id and `LTRIM` to the newest fifty. A set stores unique members with fast `SISMEMBER`, which suits allowlists and “already seen” checks. A sorted set adds a numeric score, so you can rank a leaderboard, page with `ZRANGE`, or drop old rows with `ZREMRANGEBYSCORE`. None of these replace the Postgres table. They hold a derived slice that you can rebuild if Redis restarts.

**Follow-up:**

Why is `SINTER` on two huge sets a risky cache operation?

Answer: `SINTER` runs inside the Redis thread and walks members until the intersection is done. Two million-member sets can stall every other command on that node, including unrelated cache gets. Keep intersections on small sets, precompute the overlap into its own key when the inputs change, or push the heavy join back to Postgres where the planner can use indexes. If you only need a membership test, `SISMEMBER` on one set is the cheap path.

### DB-303 — When would you use a Redis stream instead of a list?

**Difficulty:** Intermediate

**Category:** Data structures

**Question:**

When would you use a Redis stream instead of a list?

**Answer:**

Use a list for a short, loss-tolerant sequence such as the last twenty page ids. Use a stream when a worker must not lose an entry if it crashes. `XADD` appends a durable record, a consumer group tracks who owns it, and the entry stays pending until `XACK`. You can trim with `MAXLEN` so the stream does not grow forever. A list’s `RPOP` deletes the item as you take it, so a crash between pop and Postgres commit drops that message.

**Follow-up:**

What should a cache-invalidation consumer do with a pending entry it never acknowledged?

Answer: Another worker should claim it after the idle time, using `XAUTOCLAIM`, then delete or refresh the Redis key the message names. Until that happens the entry sits in the pending list and the cache can stay stale. Also cap the stream with `MAXLEN` or `MINID`, and alert on `XPENDING` depth. A pending invalidation is not a suggestion. It means some key is still serving the generation you meant to drop.

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

### DB-305 — Which eviction policy do you pick for a general Postgres cache?

**Difficulty:** Intermediate

**Category:** TTL & eviction

**Question:**

Which eviction policy do you pick for a general Postgres cache?

**Answer:**

`allkeys-lru` is the usual default: when memory is full, Redis drops keys that were used least recently, whether or not they have a TTL. `allkeys-lfu` is better when a small set of keys is hot and a one-off scan would otherwise look “recent” and pin cold data. Use a `volatile-*` policy only if some keys must never be evicted and those keys have no TTL. `noeviction` turns Redis into a store that starts rejecting writes, which is a poor fit for a pure cache.

**Follow-up:**

Why can LFU still keep a key that your app no longer needs?

Answer: LFU decays on a timer controlled by `lfu-decay-time`, and the counter is logarithmic, so a key that was extremely hot stays “warm” for a while after traffic moves on. That is what you want for a flash sale, and it is annoying for a key that was hot once during a backfill. Pair LFU with a real TTL so logical staleness does not depend on the frequency counter. Watch `evicted_keys` after you switch policies, because the working set will reshuffle.

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

### DB-307 — How does write-through differ from cache-aside when a row is updated?

**Difficulty:** Intermediate

**Category:** Write patterns

**Question:**

How does write-through differ from cache-aside when a row is updated?

**Answer:**

In write-through, the write path updates Redis and Postgres before it acknowledges the client, so a later read should see the new value already cached. In cache-aside, the write path commits to Postgres and invalidates the key. The next read pays for a miss and refills. Write-through spends latency on every update, including fields nobody is reading. Cache-aside spends latency on the next read. Teams pick write-through when the updated row is almost always read immediately and the extra write latency is acceptable.

**Follow-up:**

Who do you acknowledge first if the cache `SET` and the Postgres commit disagree?

Answer: Acknowledge only after Postgres commits. If Redis was updated and the database rolls back, delete the key before you return the error so you do not serve a value that never committed. If Postgres commits and the cache update fails, delete the key anyway and return success. The next read will rebuild from the row that actually committed. The caller’s success bit follows the database, and Redis is repaired by absence of the key.

### DB-308 — When is write-behind worth the risk in front of Postgres?

**Difficulty:** Senior

**Category:** Write patterns

**Question:**

When is write-behind worth the risk in front of Postgres?

**Answer:**

Write-behind acknowledges the client after Redis accepts the update, then flushes to Postgres asynchronously. It fits high-volume counters, presence, or drafts where losing the last few seconds is tolerable and you can rebuild. It is a bad place for payments, inventory that must not oversell, or anything you cannot replay. Redis is now ahead of the source of truth, so a crash before the flush loses acknowledged work unless you also persist Redis and drain the flush queue. Most product data should stay cache-aside.

**Follow-up:**

How do you drain a write-behind queue without double-applying rows in Postgres?

Answer: Put each flush in an idempotent write. Carry a version or a dedupe key and use an `INSERT ... ON CONFLICT` or an update that only applies when the stored version is older. The worker stores the stream id it has flushed and only `XACK`s after Postgres commits. On restart it re-reads pending and unacked entries. A second apply of the same version becomes a no-op. Without that guard, at-least-once delivery will duplicate likes, balances, or status flips.

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

### DB-310 — How is a thundering herd different from a stampede?

**Difficulty:** Intermediate

**Category:** Stampede

**Question:**

How is a thundering herd different from a stampede?

**Answer:**

A stampede is many clients missing the same key and all recomputing it against Postgres. A thundering herd is many waiters waking at the same moment when a lock, TTL, or blocking pop releases. The herd is the wake-up. The stampede is the duplicate work that follows if every waker hits the database. You can have a herd on a mutex and still avoid a stampede if only one waker rebuilds and the others read the filled key. People mix the names up, so say which layer you mean.

**Follow-up:**

How does TTL jitter break a herd that you created yourself at deploy time?

Answer: If a warm-up script sets ten thousand keys with `EX 3600`, they all expire in the same second an hour later and the herd arrives on schedule. Add a random extra of a few minutes on each TTL so expirations spread out. Do the same when you invalidate a prefix by rewriting keys. Jitter does not replace a lock or singleflight for one extremely hot key. It stops you from lining every key’s deadline up on one clock tick.

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

### DB-313 — How do you choose between TTL-only expiry and delete-on-write?

**Difficulty:** Intermediate

**Category:** Invalidation

**Question:**

How do you choose between TTL-only expiry and delete-on-write?

**Answer:**

TTL-only is simple. You accept staleness up to the TTL and you do not need a hook on every write path. It fits reference data, feature flags, and aggregates that can be minutes old. Delete-on-write is what you want when a user must see their own update on the next request. You still keep a TTL so a missed invalidation heals itself. Many caches do both: explicit delete for correctness of the hot path, and a TTL so a bug in the delete path cannot serve a stale row for days.

**Follow-up:**

A writer updates Postgres and the delete call to Redis times out. What does the user see?

Answer: The next read can still hit the old value until the TTL, so the user who just saved can look at stale data. Retry the delete from the outbox or the request path, and have the write request itself bypass the cache when it re-reads, using the row it just committed. Keep the TTL short enough that a lost delete is an annoyance, not a day-long incident. Measure invalidation failures. A silent timeout is how caches rot.

### DB-314 — How do you design Redis keys so they stay debuggable?

**Difficulty:** Intermediate

**Category:** Key design

**Question:**

How do you design Redis keys so they stay debuggable?

**Answer:**

Use a stable, colon-separated shape such as `cache:{entity}:{id}:v{schema}`. Put the environment or service in the prefix if clusters are shared. The id should be the primary key, not a blob of the whole query. Version the key when the JSON shape changes so old pods and new pods do not read each other’s layout. You should be able to guess the key from a Postgres id during an incident. Opaque hashes of the entire row make `SCAN` and support tickets much harder.

**Follow-up:**

How do hash tags change that pattern once you are on Redis Cluster?

Answer: Only the substring inside `{}` decides the slot. `cache:{user:42}:profile` and `cache:{user:42}:sessions` land on the same shard, so a multi-key script can touch both. If you wrap a popular tenant id, you also pin all of that tenant’s keys to one node. Tag the smallest scope you actually need to be atomic. Leave the rest of the key outside the braces so unrelated entities still spread across the cluster.

### DB-315 — What goes wrong when cache keys include raw user input?

**Difficulty:** Intermediate

**Category:** Key design

**Question:**

What goes wrong when cache keys include raw user input?

**Answer:**

Unbounded query strings create a new key for every combination of filters, sort order, and whitespace. The cache fills with one-hit entries, eviction churns the real hot keys, and memory grows with cardinality rather than with useful data. User input can also produce enormous keys, which Redis stores but your tools cannot scan comfortably. Normalize the input, whitelist sort fields, hash a canonical JSON of the filter if you must, and cap how long that key may live. Prefer caching the entity by id.

**Follow-up:**

How would you cache a search page without caching every distinct URL?

Answer: Cache the entities by id, and cache only the first page of a few popular, canonical filter combinations. Everything else reads Postgres with a proper index. Store the page as a list of ids, then `MGET` the entities, so one product update invalidates one entity key rather than hundreds of query keys. Put a short TTL on the page key. Long-tail searches are cheaper to compute than to remember.

### DB-316 — Why is Redis a common session store, and what do you watch for?

**Difficulty:** Intermediate

**Category:** Sessions

**Question:**

Why is Redis a common session store, and what do you watch for?

**Answer:**

Session reads happen on every authenticated request, and they are key-value lookups, which is the access pattern Redis is fast at. You `SET` `sess:{id}` with a TTL so abandoned sessions disappear without a cleanup job. The risks are operational. If this Redis is the only copy of the session, a flush or a failover with no persistence logs everybody out. Session keys also must not share an `allkeys-*` cache that is allowed to evict them under memory pressure. Keep the payload small.

**Follow-up:**

What happens to in-flight requests during a Sentinel failover of the session store?

Answer: For a few seconds the old primary is read-only or unreachable and writes fail. Clients that discover the new primary through Sentinel retry the `SET`. Requests that cached the old address get connection errors until the client library refreshes topology. Users can see a single failed request, not a data-model bug, if your app retries idempotent session refreshes. Writes that succeeded on the old primary and had not replicated are the ones that vanish, which is why a short TTL session can be recreated by logging in again.

### DB-317 — How do you do a sliding session TTL without a race?

**Difficulty:** Senior

**Category:** Sessions

**Question:**

How do you do a sliding session TTL without a race?

**Answer:**

You want each request to push expiry out by thirty minutes, up to an absolute cap. `GETEX` reads the session and refreshes the TTL in one command, so you do not `GET` and then lose the race before `EXPIRE`. If you only need to bump the TTL when the user is active, `EXPIRE` alone is enough when you already trust the local copy. Store an `issued_at` inside the value and refuse to slide past the absolute lifetime, so a stolen cookie cannot live forever by staying busy.

**Follow-up:**

Why is a sliding TTL on a stolen cookie worse than a fixed one?

Answer: With a fixed TTL the theft window ends even if the attacker keeps using the cookie. With sliding expiry, every request they make extends the session, so the cookie works until you revoke the id. Pair sliding idle timeout with a hard maximum age, rotate the session id on login and on privilege change, and keep a per-user generation in Postgres or Redis that you check so you can kill every session for that user when they hit “log out everywhere.”

### DB-318 — Pub/sub or streams: which one fans out cache invalidation?

**Difficulty:** Senior

**Category:** Pub/sub & streams

**Question:**

Pub/sub or streams: which one fans out cache invalidation?

**Answer:**

Pub/sub delivers a message to subscribers that are connected at that moment. If a pod is restarting, it misses the delete and must wait for the TTL. Streams keep the invalidation on disk until consumers acknowledge it, so a worker can catch up after a deploy. Use pub/sub for best-effort local hints, such as dropping an in-process cache. Use a stream, or the Postgres outbox, when missing an invalidation would serve wrong data for longer than you can stand.

**Follow-up:**

What did Redis 7 sharded pub/sub change for Cluster users?

Answer: Classic cluster pub/sub is broadcast to every node, so a busy invalidation channel wakes shards that do not own the key. Sharded pub/sub (`SPUBLISH` and `SSUBSCRIBE`) sticks the channel to one slot, the same way a key does, and only that shard handles it. You lose the global broadcast, which is what you want for scale. Subscribers must use the sharded commands. A subscriber that is not attached to the owning node will not see those messages.

### DB-319 — When is a Lua script the right tool in Redis?

**Difficulty:** Senior

**Category:** Lua & transactions

**Question:**

When is a Lua script the right tool in Redis?

**Answer:**

Use Lua when several commands must see a consistent key and you need to branch: rate-limit math, compare-and-delete, or “set this hash field only if the version is newer.” `EVAL` runs atomically on the server, and other commands do not slip in mid-script. Redis 7 functions (`FUNCTION LOAD`, `FCALL`) let you load that script once instead of shipping source on every call. Keep scripts short. They block the thread. A script that loops a huge set is an outage.

**Follow-up:**

Why can a Lua script that worked on one node break after you enable Cluster?

Answer: Cluster requires every key the script touches to live in one slot. Keys you pass in must share a hash tag, and a script that discovers extra keys at runtime violates that rule. Declare the keys in the `KEYS` array so the client routes the call to the right node. Do not build key names only inside the script from data Redis has not already pinned to that slot. Test the script against a clustered instance, not only a local single node.

### DB-320 — What atomicity do you actually get from `MULTI`/`EXEC` compared with Lua?

**Difficulty:** Senior

**Category:** Lua & transactions

**Question:**

What atomicity do you actually get from `MULTI`/`EXEC` compared with Lua?

**Answer:**

`MULTI` queues commands and `EXEC` runs that queue with no other client interleaved. There is no rollback. If one command errors, earlier commands in the same transaction stay applied. You cannot branch on a value you just read inside the queue, because the reads happen only at `EXEC`. `WATCH` adds optimistic locking: if a watched key changes, `EXEC` returns nil and you retry. Lua can read, branch, and write in one atomic script. Reach for Lua when the next command depends on the value you just saw.

**Follow-up:**

A `MULTI` updates two keys and the second command gets a `WRONGTYPE` error. What is in Redis now?

Answer: The first command has already been applied. Redis does not undo it. `EXEC` returns an error only for the command that failed, alongside the success of the others. Your app has to notice the partial update and repair it, or you should have checked types before the transaction. This is the main reason money-like invariants do not belong in a Redis transaction. If both writes must succeed or neither should, do that transaction in Postgres.

### DB-321 — What are the real trade-offs between RDB and AOF?

**Difficulty:** Intermediate

**Category:** Persistence

**Question:**

What are the real trade-offs between RDB and AOF?

**Answer:**

RDB is a compact point-in-time snapshot. Restarts are fast, and you can lose every write since the last `BGSAVE`. The cost is a fork, and copy-on-write can spike memory while the snapshot runs. AOF logs each write. `appendfsync everysec` usually loses about a second on a crash. `always` fsyncs each command and is much slower. AOF files are larger and replay takes longer, though Redis 7’s multi-part AOF keeps a base plus incremental files so rewrite is less painful. For a pure cache, either mode is optional.

**Follow-up:**

If both are enabled, which file does Redis load on startup?

Answer: It loads the AOF, because the AOF contains the writes that happened after the last snapshot. The RDB is still useful as a backup you can copy off the box and as the base inside a multi-part AOF. If the AOF is truncated after a crash, Redis can be configured to repair it, and you should treat that repair as a data-loss event. For a cache, a truncated AOF means a cold or partial keyspace, which is acceptable if Postgres is the source of truth.

### DB-322 — When would you turn persistence off entirely for a cache?

**Difficulty:** Senior

**Category:** Persistence

**Question:**

When would you turn persistence off entirely for a cache?

**Answer:**

Turn it off when every key can be rebuilt from Postgres and you would rather have a cold cache than pay for forks and disk. A restart then means a miss storm, so you need jittered TTLs, singleflight, and a Postgres pool that can take the refill. Turn a light RDB back on if the working set is expensive to recompute and you would rather serve slightly old data than thundering-herd the database. Do not disable persistence on a Redis that holds the only copy of sessions, idempotency keys, or write-behind queues.

**Follow-up:**

How do you warm the cache after a flush without melting Postgres?

Answer: Do not loop the whole table into Redis. Preload the keys that were hot, using a saved list of popular ids or the top rows from a Postgres query, and pace the inserts. Let the long tail fill on demand behind singleflight. Stagger application deploys so every pod does not miss at once. Raise cache timeouts only after Redis is accepting writes again. A warm-up job that issues unbounded parallel queries is just a stampede you scheduled.

### DB-323 — What problem does Sentinel solve, and what problem does Cluster solve?

**Difficulty:** Intermediate

**Category:** HA

**Question:**

What problem does Sentinel solve, and what problem does Cluster solve?

**Answer:**

Sentinel watches a single primary and its replicas and promotes a replica when the primary is unreachable. The dataset still has to fit one node’s memory. Your client asks Sentinel who the primary is. Cluster shards the keyspace into 16,384 slots across many primaries, each of which can have replicas. It solves capacity and partial failure, and it makes multi-key commands harder. Sentinel is the smaller operational jump for a cache that fits in RAM. Cluster is what you add when one machine cannot hold the working set or its CPU.

**Follow-up:**

Can Sentinel protect you from a full Redis box during a traffic spike?

Answer: It can fail over if the node dies, and the new primary still holds the same amount of data and the same hot-key CPU problem. Sentinel does not split load. If the spike is QPS on one key, a replica can take reads and the primary still takes every write to that key. If the spike is memory, failover does not add RAM. You need Cluster, a bigger node, or a local cache in front. HA and capacity are different projects.

### DB-324 — What breaks when you move a cache from one Redis node to Cluster?

**Difficulty:** Senior

**Category:** HA

**Question:**

What breaks when you move a cache from one Redis node to Cluster?

**Answer:**

Any command that touches two keys in different slots returns `CROSSSLOT`. `MGET`, `MULTI`, and Lua across `user:1` and `user:2` stop working. You either issue separate commands or force related keys onto one slot with a hash tag. Pipelines still work, but each key is routed to its node, so a naive client that opens one connection will be wrong. Key names you used to rename with `KEYS` must be scanned per shard. Test the real client library against Cluster before the cutover, including publish and blocking pops.

**Follow-up:**

How do you `MGET` fifty entity keys that hash to different slots?

Answer: The cluster client splits the `MGET` into one request per slot and stitches the replies back in order. You still write `MGET` in application code if the library supports it. If it does not, group the ids by slot yourself and issue parallel gets. Do not wrap every id in the same hash tag just to keep one `MGET`, because that puts the entire cache on one node. Parallel per-slot gets are the point of Cluster.

### DB-325 — What is memory fragmentation in Redis, and when does it hurt?

**Difficulty:** Senior

**Category:** Memory

**Question:**

What is memory fragmentation in Redis, and when does it hurt?

**Answer:**

`used_memory` is what Redis thinks the data takes. RSS is what the OS gave the process. Fragmentation ratio is RSS divided by `used_memory`. Allocators hand out fixed-size bins, and deletes do not always return those pages to the OS, so RSS stays high after a traffic spike subsides. It hurts when the host looks full, fork-time copy-on-write has no headroom, and you are nowhere near the logical dataset size. `activedefrag` can compact memory while Redis is running. A ratio a bit above 1 is normal allocator overhead.

**Follow-up:**

You deleted millions of keys and RSS barely moved. What do you check next?

Answer: Check `mem_fragmentation_ratio`, `used_memory_peak`, and whether lazy freeing is still releasing pages. The allocator may be holding bins for a workload that has gone. Enabling active defrag, or a controlled restart in a maintenance window, returns that RAM. Also confirm the deletes actually happened: keys with TTLs can linger until the expire cycle, and a replica or AOF rewrite can keep memory alive. `MEMORY DOCTOR` and `MEMORY STATS` are the first commands, not a guess at the OS.

### DB-326 — How do you find a hot key, and how do you cool it down?

**Difficulty:** Senior

**Category:** Hot keys

**Question:**

How do you find a hot key, and how do you cool it down?

**Answer:**

A hot key pegs one shard’s CPU while the rest of the cluster looks idle. With an LFU policy, `redis-cli --hotkeys` can surface candidates. Latency spikes on a single slot, or a client metric on one key, tell the same story. `MONITOR` will show it and can also take the node down, so use it only as a last resort on a replica. Cool the key by caching it in process for a few hundred milliseconds, spreading reads across replicas, or splitting a counter into several keys and summing them.

**Follow-up:**

Why can a hash tag make a hot key worse?

Answer: A tag such as `{tenant:1}` puts every key for that tenant on one slot. If that tenant is also your largest customer, you have built a private shard for them and called it a cache. The node’s CPU and network cap become their cap. Tag only keys that must be atomic together, and keep popular read-mostly entities untagged so Cluster can spread them. A local cache in each app pod often removes more load than another Redis replica.

### DB-327 — How would you rate-limit an API with Redis?

**Difficulty:** Intermediate

**Category:** Rate limiting

**Question:**

How would you rate-limit an API with Redis?

**Answer:**

Give each user or token a key like `rl:{user}:{route}:{window}`. `INCR` it and, if the new value is 1, set a TTL equal to the window. If the count exceeds the budget, reject with a retry-after based on the key’s remaining TTL. This is a fixed window and it is atomic enough for most APIs because `INCR` is one command. Do the check in Redis rather than in each app’s memory, or a user gets a full budget per pod. Return the remaining count so well-behaved clients back off.

**Follow-up:**

What abuse does the fixed window allow at the boundary?

Answer: A client can spend the full budget in the last second of window N and the full budget in the first second of window N+1. They burst at twice the advertised rate across that instant. If that burst can hurt Postgres, move to a sliding window or a token bucket. If the limit is a coarse abuse control, the fixed window is acceptable and cheaper. Document the burst so the number you publish matches the number you enforce.

### DB-328 — How do fixed window, sliding window, and token bucket differ in Redis?

**Difficulty:** Senior

**Category:** Rate limiting

**Question:**

How do fixed window, sliding window, and token bucket differ in Redis?

**Answer:**

A fixed window counts with `INCR` and an expiry. It is tiny and fast, and it bursts at the boundary. A sliding log stores each hit as a sorted-set member scored by timestamp, trims old scores, and counts what remains. It is accurate and uses memory proportional to traffic. A token bucket keeps tokens and a last-refill time and refills in proportion to elapsed time, which you want in one Lua script so two requests cannot both refill. Pick the bucket when the caller should be allowed a small burst and then a steady rate.

**Follow-up:**

Why is the sliding-log `ZADD` plus `ZCARD` sequence unsafe without Lua?

Answer: Two clients can each trim, each insert, and each count, and both can observe a count under the limit before either insert is visible to the other. You over-admit. The trim, the insert, and the compare have to be one script so the decision and the record appear together. Also `ZREMRANGEBYSCORE` on a huge set is real work on the Redis thread, so a sliding log on a hot key needs a cap or you have traded a rate-limit bug for a hot-key outage.

### DB-329 — How do idempotency keys in Redis protect a Postgres write?

**Difficulty:** Senior

**Category:** Idempotency

**Question:**

How do idempotency keys in Redis protect a Postgres write?

**Answer:**

The client sends a key for “this exact attempt.” You `SET idem:{user}:{key} in-progress NX EX <ttl>`. If the set succeeds, you are the owner and you run the Postgres insert, which should also have a unique constraint on that key. You then overwrite the Redis value with the response status and body. If the set fails, another attempt is in flight or finished, so you return the stored response instead of inserting again. Redis makes the fast path cheap. The unique index is what still saves you if Redis is flushed.

**Follow-up:**

The client reuses the same key with a different request body. What do you do?

Answer: Store a hash of the canonical request next to the response. If the key exists and the hash differs, return a conflict and do not replay the old response as if it were this new operation. Reusing a key for a new payment or a new order is a client bug, and silently returning the first response hides it. If the hash matches, return the stored response, including a stored error, for as long as the TTL says that attempt is still authoritative.

### DB-330 — When should you not use Redis?

**Difficulty:** Staff

**Category:** When not to use Redis

**Question:**

When should you not use Redis?

**Answer:**

Skip Redis when Postgres with an index already meets the latency target and the extra moving part would be the real outage. Skip it for data you query in new ways every week, because Redis is not a join engine. Skip it as the only durable home for money or orders unless you have designed persistence, failover, and repair as carefully as a database, which usually means you wanted Postgres. Skip it when the working set does not fit in RAM and you are not ready to shard. A cache you cannot operate is slower than a query you can.

**Follow-up:**

What is a smell that Redis has become a second database by accident?

Answer: Writers start issuing read-modify-write sequences against Redis that have no matching Postgres transaction. Operators are told never to flush it. Someone proposes a manual restore of an RDB to get a user’s balance back. Reports run from Redis keys because the table was never updated. At that point you have a poorly backed-up database with a single thread. Move the source of truth into Postgres and keep Redis as a rebuildable projection.

### DB-331 — How do you choose a Postgres materialized view versus a Redis cache?

**Difficulty:** Senior

**Category:** Materialized views

**Question:**

How do you choose a Postgres materialized view versus a Redis cache?

**Answer:**

Use a materialized view when the expensive part is a join or an aggregate, the result can be minutes old, and you want it inside Postgres so backups, grants, and SQL still apply. `REFRESH MATERIALIZED VIEW CONCURRENTLY` needs a unique index and does not block readers the way a plain refresh does. Use Redis when the hot path is “give me this key in under a millisecond,” the shape is a row or a small computed blob, and you will invalidate it on write. Many systems use the view to build the blob and Redis to serve it.

**Follow-up:**

Why can refreshing a materialized view still hurt a busy primary?

Answer: Concurrent refresh still scans the underlying tables and writes a new copy of the view. On a large join that I/O and CPU compete with user transactions, and the refresh cannot run inside a transaction block. Schedule it, or refresh on a replica and fail over reads, if the primary is already hot. A Redis cache of the same aggregate moves that read traffic off Postgres entirely, at the cost of another system to invalidate. Pick the pain you can operate.

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

### DB-333 — What is negative caching, and when is it worth doing?

**Difficulty:** Intermediate

**Category:** Invalidation

**Question:**

What is negative caching, and when is it worth doing?

**Answer:**

Negative caching stores “Postgres has no such row” under the same key style, with a short TTL. It protects you from clients that hammer a missing id, a bot walking ids, or a foreign key that is simply absent. Without it, every attempt is a cache miss and a primary-key lookup. Keep the TTL short, on the order of seconds, so a row that appears moments later is not hidden for long. Do not negative-cache errors, timeouts, or permission denials. Those are properties of the call, not of the row.

**Follow-up:**

A row is inserted and the negative entry still has twenty seconds of life. What does the creator see?

Answer: A read through the cache still looks like “missing” until you delete that key. The insert path has to invalidate the negative entry the same way it invalidates a positive one. The response to the create itself should return the new row from the write, not from the cache. Other users might see the absence for the rest of that short TTL if the delete fails, which is why the TTL is seconds and not an hour.

### DB-334 — How do you version cache keys across a schema change?

**Difficulty:** Intermediate

**Category:** Key design

**Question:**

How do you version cache keys across a schema change?

**Answer:**

Put a version in the key, such as `user:{id}:v3`, and bump it when the JSON shape or the meaning of a field changes. Old pods keep reading `v2`. New pods read and write `v3`. You do not have to scan and delete the old generation. Its TTL retires it. This is safer than rewriting values in place while two deploys disagree about fields. Keep the version in one constant the app owns, and include it in metrics so you can see a deploy that is still filling the previous generation.

**Follow-up:**

Both versions are cold right after the deploy. What do you watch?

Answer: Watch Postgres read QPS and Redis hit rate for the new prefix. A version bump is a planned miss storm. Ship it when the database has headroom, keep singleflight on, and avoid combining it with a Redis flush. If the new schema is backward compatible, you can lazy-migrate by reading v2, reshaping, and writing v3, which spreads the load. If it is not compatible, accept the miss and pace the rollout pod by pod.

### DB-335 — What does Redis 7.4 hash-field expiry change for an entity cache?

**Difficulty:** Senior

**Category:** Data structures

**Question:**

What does Redis 7.4 hash-field expiry change for an entity cache?

**Answer:**

Before 7.4, expiry was per key. One TTL covered every field, so a volatile attribute forced you to split keys or refresh the whole hash. `HEXPIRE` and `HTTL` let one field die on its own. That fits a hash that mixes a stable profile with a short-lived token or a one-minute price. When the last field expires, the key can disappear too. Field expiry does not replace invalidation on write. It only lets different columns age at different rates inside one hash.

**Follow-up:**

Would you put every column of a wide table in one hash with its own TTL?

Answer: Only if callers actually fetch those fields independently and the TTLs differ for a real product reason. A wide hash with fifty expiry timers is harder to reason about than one JSON string with one TTL. Each `HGET` is cheap, and a command that touches many fields still costs more round trips unless you `HMGET`. Use field TTL for a couple of mixed lifetimes, not as a general mapping of your table.

### DB-336 — How do you run a leaderboard in a sorted set when rows also need to expire?

**Difficulty:** Intermediate

**Category:** Data structures

**Question:**

How do you run a leaderboard in a sorted set when rows also need to expire?

**Answer:**

Use the score for rank and the member for the user id. `ZADD` updates a score in place, `ZREVRANGE` pages the top, and `ZREVRANK` answers “where am I?” Expiration is not per member. You encode time in the score, or you `ZREMRANGEBYSCORE` on a schedule, or you store a parallel expiry and rebuild. A nightly Postgres query remains the source of the official ranking if the contest matters. The sorted set is the live view. If Redis loses it, you recompute the window from the table.

**Follow-up:**

Two players submit the same score at the same time. Who ranks first?

Answer: Redis orders equal scores lexicographically by member string, which is rarely the business rule you want. Encode a tie-break into the score, such as score multiplied by a large constant minus a timestamp, so the earlier submission sorts higher and the member id stays the user id. Document the order. When you display “tied,” detect equal logical scores in the app instead of trusting raw member order.

### DB-337 — When is a set the wrong structure for “is this user allowed?”

**Difficulty:** Intermediate

**Category:** Data structures

**Question:**

When is a set the wrong structure for “is this user allowed?”

**Answer:**

A set of user ids is excellent while it stays small enough to `SISMEMBER` in memory and you rebuild it from Postgres easily. It is the wrong tool when the allowlist is millions of ids that change rarely, because you are spending RAM to mirror a column that an index already answers quickly. It is also wrong when membership depends on a join, a time range, or a permission calculation. Cache the computed boolean per user with a TTL, or cache the small exception list, and let Postgres answer the long tail.

**Follow-up:**

How do you revoke one user without rebuilding the set?

Answer: `SREM` the id on the revoke path, after the Postgres update commits, and also delete any per-user boolean key you cached. If the set is rebuilt from scratch by a job, that job must read the committed revoke or it will `SADD` the user back. A generation number on the set key, bumped on every revoke, makes a stale rebuild land in an old key that you simply stop reading.

### DB-338 — How do you keep a recent-items list from growing without bound?

**Difficulty:** Intermediate

**Category:** Data structures

**Question:**

How do you keep a recent-items list from growing without bound?

**Answer:**

`LPUSH` the new id onto `recent:{user}` and immediately `LTRIM` it to the length you actually show, often twenty or fifty. Do both in a pipeline or a short Lua script so a crash cannot leave an untrimmed list, and set a TTL on the key so idle users disappear. Store ids, not full rows, and hydrate from entity keys or Postgres. If you need reliable processing of every item, this is the wrong structure. That is a stream. A list here is a display cache.

**Follow-up:**

What does the user see if `LTRIM` keeps ids whose entity cache has expired?

Answer: The list still names those ids, and the hydrate step misses. Drop missing ids from the response or refill them from Postgres by primary key, which is cheap. Do not fail the whole feed because one entity key aged out. If a product was deleted, the list can mention a dead id until it scrolls off the trim window, so the entity read should treat “no row” as “skip,” and the delete path can `LREM` the id when you need it gone immediately.

### DB-339 — What does `noeviction` do to a cache that shares memory with sessions?

**Difficulty:** Senior

**Category:** TTL & eviction

**Question:**

What does `noeviction` do to a cache that shares memory with sessions?

**Answer:**

`noeviction` refuses writes once `maxmemory` is reached, including session refreshes and cache fills, while reads of existing keys still work. If cache keys and session keys share one process, a flood of cache `SET`s can push memory to the cap and then logins and session slides start erroring. Databases inside one Redis process share one memory budget, so `SELECT 1` does not isolate them. Give the cache its own instance with `allkeys-lru`, or use `volatile-*` only with a clear rule about which keys are allowed to die.

**Follow-up:**

You set `allkeys-lru` on a mixed instance to stop the write errors. What did you trade?

Answer: Redis can now evict a live session key to make room for a cache fill. The user is logged out even though the session TTL has not expired. That is usually worse than failing a cache write. Split the workloads onto separate instances, or mark only cache keys as evictable and keep sessions on a `volatile` policy where session TTLs are long and cache TTLs are the ones you are willing to lose. Measure `evicted_keys` by key prefix after the change.

### DB-340 — How does probabilistic early expiration prevent a stampede?

**Difficulty:** Senior

**Category:** Stampede

**Question:**

How does probabilistic early expiration prevent a stampede?

**Answer:**

Before the TTL hits zero, each read may rebuild the value early with a probability that rises as the remaining TTL shrinks. One request pays for Postgres while the key is still being served to everyone else, then it `SET`s a fresh TTL. Callers do not pile up on the expiry instant. The XFetch-style formula uses the last recompute’s latency so a slow query starts refreshing earlier. You still want singleflight around the recompute so two early triggers do not both run the query.

**Follow-up:**

When is early expiration a waste?

Answer: On cold keys that are read once an hour, you do extra Postgres work to refresh a value nobody is waiting on. Use early refresh only for keys whose miss would be painful, and keep a plain TTL for the long tail. If the recompute is cheaper than the bookkeeping, a miss is fine. Early expiration also assumes a stale value is safe to serve during the refresh. If the data must flip at a deadline, expire on time and guard the rebuild with a lock.

### DB-341 — How does a lock-based stampede guard fail in production?

**Difficulty:** Senior

**Category:** Stampede

**Question:**

How does a lock-based stampede guard fail in production?

**Answer:**

You `SET lock:{key} NX PX 5000` and only the holder runs Postgres, then writes the cache and deletes the lock. Everyone else waits or serves stale data. It fails when the holder dies and the lock TTL is longer than users will wait, or so short that two holders overlap a slow query. It also fails open if a bug treats “lock not acquired” as “go query anyway.” A stampede lock on one Redis node is enough here. You are deduplicating work, not electing a leader for money movement.

**Follow-up:**

The holder finishes the Postgres query and crashes before `SET`ting the cache. What do users hit?

Answer: They wait until the lock expires, then another request tries the rebuild. If your waiters were blocked with no stale value, they time out for those few seconds. Prefer serving the previous cache entry the whole time, and treat the lock as permission to refresh in the background. Always set the lock TTL from the worst-case query time, and unlock with a compare-and-delete so a slow holder cannot delete a newer holder’s lock.

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

### DB-343 — How do you design a cache key for a filtered Postgres query?

**Difficulty:** Senior

**Category:** Key design

**Question:**

How do you design a cache key for a filtered Postgres query?

**Answer:**

Canonicalize the filter before you hash it. Sort fields, drop defaults, and reject unknown keys so `status=open&limit=20` and `limit=20&status=open` share one key. Include the tenant id and the schema version. Cache a page of ids and keep the TTL short, because a write that touches the filter has to invalidate keys you may not be able to enumerate. If you cannot name the invalidation set, the filter cache is TTL-only and the TTL has to match how stale a list is allowed to be.

**Follow-up:**

A product’s status flips from open to closed. Which list keys do you delete?

Answer: You rarely know every list that contained it. Delete the entity key, and let list keys expire on a short TTL, or maintain a small set of list keys per entity if the fan-out is bounded. A status change should not require `SCAN` of the keyspace. If the product must vanish from “open” lists immediately, store those page keys under a version you bump for that tenant’s open-list family, and accept that you invalidate more lists than the one that changed.

### DB-344 — What belongs in a Redis session, and what stays in the Postgres user row?

**Difficulty:** Intermediate

**Category:** Sessions

**Question:**

What belongs in a Redis session, and what stays in the Postgres user row?

**Answer:**

Keep the session small: user id, session generation, a short role snapshot, CSRF secret, and maybe the absolute expiry. Those fields are read on every request and must be enough for authorization middleware. The profile, preferences, and billing data stay in Postgres and are cached as ordinary entities if they are hot. A fat session makes every request pay to transfer a document, and it goes stale when an admin changes roles unless you also check a generation. Revoke by bumping the generation, not by editing every session blob.

**Follow-up:**

You cached roles inside the session and an admin demotes the user. When does access change?

Answer: It changes when the session is rewritten or when you compare a role version against Postgres or a tiny Redis generation key on each request. If you never check, the demotion waits for session expiry, which may be days with sliding TTL. Store `role_version` in the session and keep the current version in a key or a column you read cheaply. Mismatch means reload roles or force re-login. Security-sensitive changes should not wait on an idle timeout.

### DB-345 — Why is Redis pub/sub a weak bus for cache invalidation?

**Difficulty:** Senior

**Category:** Pub/sub & streams

**Question:**

Why is Redis pub/sub a weak bus for cache invalidation?

**Answer:**

Pub/sub does not store messages. A subscriber that is deployed, crashed, or just slow past the socket buffer misses the event, and Redis will disconnect a subscriber that does not read fast enough. There is no acknowledgement and no replay. In Cluster, unsharded pub/sub is also a broadcast tax. Use it to nudge in-process caches that can tolerate a miss, and use a stream or an outbox when the invalidation must happen at least once. A TTL still has to cover the misses pub/sub will definitely produce.

**Follow-up:**

A subscriber lags and Redis disconnects it. What is the recovery?

Answer: The client must resubscribe, and it has already lost every message published during the gap. On reconnect, drop the local cache entirely or refresh the keys it cares about from Redis or Postgres. There is no offset to resume from. If that full refresh is too expensive, you are on the wrong primitive. Move the invalidations to a stream, record the last id you applied, and read forward from there after a restart.

### DB-346 — Why would a cache warmer use a stream consumer group?

**Difficulty:** Senior

**Category:** Pub/sub & streams

**Question:**

Why would a cache warmer use a stream consumer group?

**Answer:**

The warmer consumes a stream of “this id changed” or “this id was read,” and it writes the Redis key before user traffic arrives. A consumer group lets several warmer pods split the work, and pending entries survive a pod restart via `XAUTOCLAIM`. You can scale warmers without double-filling the same id more than occasionally. A pub/sub warmer would miss the backlog accumulated during the deploy. Trim the stream so a weekend of ids does not become a second database.

**Follow-up:**

Two consumers both fill the same id because one was slow to ack. Is that a problem?

Answer: It is wasted Postgres reads, not corruption, if both write the same committed row. Make the fill idempotent: last writer wins only if its version is newer, using the compare-and-set script. Tune the claim idle time so you do not steal entries that are still being filled. Alert when the pending list grows, because that means the warmer is behind and user traffic will take the misses the warmer was supposed to absorb.

### DB-347 — When would you use Lua for compare-and-delete on a cache key?

**Difficulty:** Senior

**Category:** Lua & transactions

**Question:**

When would you use Lua for compare-and-delete on a cache key?

**Answer:**

Use it when a stale writer must not drop a newer value. The script loads the stored version, and it `UNLINK`s or `SET`s only if the version it was given is still the one in Redis. A plain `DEL` from a slow invalidation worker can remove a key that a newer request already refilled correctly, forcing a miss, or worse, a later `SET` from that worker writes old JSON over new JSON. One small script turns “delete if this is still the generation I saw” into an atomic check. That is the cache’s compare-and-swap.

**Follow-up:**

Why not `WATCH` plus `MULTI` for that same compare?

Answer: You can. `WATCH` the key, read the version, and `EXEC` a delete only if nobody else touched it. If `EXEC` returns nil, somebody raced you and you retry or give up. That takes a round trip between the read and the exec, and a hot key will abort often. Lua does the read and the conditional delete without yielding. Prefer Lua when contention is high. Prefer `WATCH` when the logic is awkward to put in a script and contention is rare.

### DB-348 — What does the application see during Sentinel failover versus a Cluster slot migration?

**Difficulty:** Senior

**Category:** HA

**Question:**

What does the application see during Sentinel failover versus a Cluster slot migration?

**Answer:**

During Sentinel failover, writes to the old primary fail or land on a primary that is about to be demoted, and clients need the new address from Sentinel. There is one keyspace, so keys do not move. Their values might be a second behind if replication lagged. During a Cluster migration, a slot is briefly in motion. Clients get `ASK` or `MOVED` redirects and must follow the key to the new node. A well-behaved cluster client hides that. A hand-rolled connection pool that ignores redirects serves errors until you fix it.

**Follow-up:**

A write is acknowledged by the old primary and then the primary dies before replication. What is the user-visible result?

Answer: The promoted replica never saw the write, so the key reverts or disappears. For a cache, the next read misses and refills from Postgres, which is fine. For a session or an idempotency key, the user may be logged out or a retry may run the Postgres insert a second time, which is why the database unique constraint still matters. `WAIT` or Redis 7.2 `WAITAOF` can delay the acknowledgement until replicas have the write, at a latency cost you usually skip for a rebuildable cache.

### DB-349 — Why is losing data on a cache restart acceptable, and when does that story fail?

**Difficulty:** Senior

**Category:** Persistence

**Question:**

Why is losing data on a cache restart acceptable, and when does that story fail?

**Answer:**

A cache restart may drop every key if you have no persistence, or lose the last snapshot interval if you use RDB. That is acceptable when Postgres can answer and the miss storm is bounded by singleflight, jitter, and pool limits. The story fails when Redis holds something you cannot rebuild: a write-behind queue, a lock that guards a payment, a session with no server-side fallback, or an idempotency response that is the only record of a completed charge. Those keys need persistence, replication, and a durability story. The rest of the cache does not.

**Follow-up:**

How do you let cache keys die on restart while sessions survive in the same product?

Answer: Put them on different Redis instances. The session instance uses replication and AOF with `everysec`. The cache instance can disable persistence and use `allkeys-lru`. One process cannot apply two durability policies in a way that survives one restart cleanly, because RDB and AOF are server-wide. Splitting also stops cache eviction and cache fork spikes from logging users out. The app already knows which client talks to which role.

### DB-350 — When would you put an in-process cache in front of Redis, and when does that hurt?

**Difficulty:** Staff

**Category:** Local cache

**Question:**

When would you put an in-process cache in front of Redis, and when does that hurt?

**Answer:**

Put a small in-process cache in front of a key that is read thousands of times per second per pod and changes rarely, such as a feature flag or a config blob. You cut network chatter and you cool a hot key. Invalidate it with a short TTL of a few hundred milliseconds, or with pub/sub as a hint. It hurts when every pod holds a large stale copy, when memory is duplicated across thirty processes, or when you needed a security demotion to be visible immediately. Redis remains the shared layer.

**Follow-up:**

How do you compare this setup with skipping Redis and using only a Postgres materialized view?

Answer: A materialized view answers a heavy query inside Postgres and is shared by every app instance with one refresh schedule. An in-process cache plus Redis answers a key lookup without touching Postgres at all, and each pod can be slightly out of date. Use the view when the hard part is computing the result and QPS is modest. Use Redis plus a small local cache when the hard part is read QPS on a value you already know how to invalidate. They solve different bottlenecks.
