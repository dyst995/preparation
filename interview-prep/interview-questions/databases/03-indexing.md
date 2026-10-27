# DB03 — Indexing

PostgreSQL 16. Questions DB-101–DB-150.

B-tree and other index types, planner choice, covering and partial indexes, maintenance, and EXPLAIN patterns. Heap/MVCC internals are DB02; isolation anomalies are a later section.

### DB-101 — What a B-tree index stores

**Difficulty:** Intermediate

**Category:** B-tree

**Question:**

In PostgreSQL 16, what does a default B-tree index on `orders(customer_id)` store in leaf entries, and how does that relate to heap lookups?

**Answer:**

Leaf entries hold indexed key values plus heap TIDs (block, offset). An Index Scan walks matching leaves, then fetches heap tuples by TID (unless an index-only scan applies). Internal pages hold separator keys for navigation. The index is a separate relation; it does not replace the heap. Updates that change indexed columns maintain both structures.

**Follow-up:**

Does the leaf store the full heap row?

Answer: No. Only index keys (and INCLUDE columns if any) plus TID. Non-indexed columns require a heap fetch, or an index-only scan when the visibility map allows skipping the heap.

### DB-102 — Why the planner sometimes prefers a sequential scan

**Difficulty:** Intermediate

**Category:** Planner

**Question:**

A selective-looking `WHERE status = 'open'` still chooses Seq Scan on a large table that has an index on `status`. Why might that be correct?

**Answer:**

If most rows match (`open` is common), random heap fetches via the index can cost more than one sequential read. The planner compares estimated costs using statistics (n_distinct, MCV, histogram). Correlation of the column with physical order also matters. An index is not always cheaper; measure with `EXPLAIN (ANALYZE, BUFFERS)`.

**Trade-offs:**

Partial indexes on rare statuses or better clustering can change the winner. Forcing an index with hints is not a Postgres feature—fix stats or the predicate.

**Follow-up:**

What command refreshes the stats the planner uses?

Answer: `ANALYZE` (or autovacuum’s analyze). Stale stats after bulk loads are a common wrong-plan cause.

### DB-103 — Leftmost prefix of a multicolumn index

**Difficulty:** Intermediate

**Category:** Multicolumn

**Question:**

You have `CREATE INDEX ON events (tenant_id, created_at, kind)`. Which of these can use the index efficiently: filter on `tenant_id`; on `created_at` alone; on `tenant_id` and `kind` without `created_at`?

**Answer:**

`tenant_id` alone uses the leftmost prefix. `created_at` alone generally cannot use this B-tree as a range start (no leading equality). `tenant_id` + `kind` can use `tenant_id`, then filter `kind` (or a skip-scan-like pattern is limited—Postgres uses the leading columns; without `created_at` equality, `kind` is not a contiguous slice). Order columns for equality filters first, then range/order columns.

**Follow-up:**

Where should `created_at` sit if most queries are `tenant_id = $1 ORDER BY created_at`?

Answer: `(tenant_id, created_at)`—equality then ordering column. Put `kind` later or in a separate/partial index if needed.

### DB-104 — Index-only scans need the visibility map

**Difficulty:** Senior

**Category:** Index-only

**Question:**

`EXPLAIN` shows Index Only Scan but `EXPLAIN ANALYZE` reports heap fetches. What does that mean?

**Answer:**

The plan can avoid heap I/O when all needed columns are in the index and the page is all-visible in the visibility map. If VM bits are not set (recent updates, lagging vacuum), Postgres still visits the heap to check visibility—hence heap fetches. Vacuum/analyze that sets all-visible reduces them. INCLUDE columns help coverage; they do not skip visibility checks alone.

**Follow-up:**

How do you add non-search columns without changing sort order of the key?

Answer: `CREATE INDEX ... ON t (a, b) INCLUDE (c, d);` — `c`/`d` are payload for index-only scans, not search keys.

### DB-105 — Partial indexes match a subset

**Difficulty:** Intermediate

**Category:** Partial indexes

**Question:**

When is `CREATE INDEX ON jobs (id) WHERE state = 'pending'` better than indexing all rows, and what must the query do?

**Answer:**

If few rows are pending, the index is small and cheap to maintain on other updates. The query’s `WHERE` must imply the predicate (e.g. `state = 'pending'`) so the planner can use it. Updates that leave the predicate set or clear the partial entry accordingly. Do not use a partial index when most queries need all states.

**Trade-offs:**

Many partial indexes for many states multiply write cost. One partial for the hot slice is the usual win.

**Follow-up:**

Can `WHERE state IN ('pending','running')` use an index defined only for `pending`?

Answer: Only the pending portion—running rows are absent. Usually you need a matching or broader predicate.

### DB-106 — Expression indexes need matching expressions

**Difficulty:** Intermediate

**Category:** Expression indexes

**Question:**

You index `(lower(email))`. Which query uses it, and what must be true of the function?

**Answer:**

`WHERE lower(email) = lower($1)` (or equivalent) can use it; `WHERE email = $1` generally will not. The expression must be immutable for index use. Volatile/stable functions are rejected or unsafe for indexed lookups. Prefer normalizing on write if every query uses the same transform.

**Code:**

```sql
CREATE INDEX ON users (lower(email));
SELECT * FROM users WHERE lower(email) = lower($1);
```

**Follow-up:**

Why might `WHERE email ILIKE 'x%'` not use `lower(email)`?

Answer: `ILIKE` is not the same expression as `lower(email) = …`. Use `lower(email) LIKE 'x%'` or a trigram/pattern index suited to the pattern.

### DB-107 — Unique indexes enforce uniqueness

**Difficulty:** Intermediate

**Category:** Unique

**Question:**

How does a UNIQUE index differ from a UNIQUE table constraint in PostgreSQL 16, and what happens on concurrent inserts of the same key?

**Answer:**

A UNIQUE constraint creates a unique index; you can also create a unique index without a constraint name. Both reject duplicates. Concurrent transactions inserting the same key: one commits, the other fails with unique violation (or waits on the conflicting row’s insert under some timings). Partial unique indexes allow uniqueness within a subset (`WHERE deleted_at IS NULL`).

**Follow-up:**

Can two NULLs coexist in a unique B-tree column?

Answer: Yes—UNIQUE treats NULL as distinct from NULL (unless NULLS NOT DISTINCT in PG15+ when specified).

### DB-108 — CREATE INDEX CONCURRENTLY

**Difficulty:** Senior

**Category:** Maintenance

**Question:**

Why use `CREATE INDEX CONCURRENTLY`, and what failure mode leaves an INVALID index?

**Answer:**

Regular `CREATE INDEX` locks writes (`ShareLock`/`AccessExclusive` phases that block DML longer). `CONCURRENTLY` builds with weaker locks so DML continues, in multiple passes. If it fails mid-way, an INVALID index can remain—it is not used by queries and still costs on writes until dropped. Always check `\d` / `pg_index.indisvalid` after concurrent builds.

**Trade-offs:**

Concurrent builds take longer and use more resources. Prefer them on busy production tables.

**Follow-up:**

How do you remove a failed INVALID index?

Answer: `DROP INDEX CONCURRENTLY` if needed, or `DROP INDEX` when safe. Do not leave INVALID indexes in place.

### DB-109 — GIN for containment and full-text

**Difficulty:** Intermediate

**Category:** Index types

**Question:**

When do you choose GIN over B-tree for `jsonb` or arrays?

**Answer:**

GIN excels at membership/containment (`@>`, `?`, array contains) and full-text (`tsvector`). B-tree is for ordered equality/range on scalars. GIN is larger and slower to update; good for read-heavy JSON/array search. For exact primary-key style lookups, B-tree wins.

**Follow-up:**

What operator class helps `jsonb` path queries?

Answer: `jsonb_path_ops` (smaller, `@>` focused) vs default `jsonb_ops` (more operators, larger).

### DB-110 — GiST for ranges and geometry

**Difficulty:** Intermediate

**Category:** Index types

**Question:**

Name two workload types where GiST is the usual choice instead of B-tree.

**Answer:**

Range types / overlap (`&&`), geometric/search-nearest, some full-text and exclusion constraints. GiST is a balanced tree for generalized searches, not a simple ordered scalar map. Exclusion constraints (`EXCLUDE USING gist`) prevent overlapping ranges.

**Follow-up:**

Can GiST replace B-tree for `integer =` lookups?

Answer: Technically possible with the right opclass, but B-tree is the default and usually faster for plain equality/range on scalars.

### DB-111 — BRIN for correlated physical order

**Difficulty:** Senior

**Category:** Index types

**Question:**

When is BRIN a good fit, and when is it useless?

**Answer:**

BRIN stores summaries per block range—tiny and cheap. It works when column values correlate with heap order (time-series appends). If values are randomly scattered, summaries overlap everything and BRIN does not filter. Prefer B-tree when you need precise selective lookups on unordered data.

**Trade-offs:**

BRIN loses after random updates shuffle correlation; `btree` stays correct but larger.

**Follow-up:**

How do you check correlation?

Answer: `pg_stats.correlation` for the column (near ±1 helps BRIN/clustering assumptions).

### DB-112 — Hash indexes are equality-only

**Difficulty:** Intermediate

**Category:** Index types

**Question:**

What can a hash index do in modern PostgreSQL, and what can it not?

**Answer:**

Hash indexes support equality (`=`), are WAL-logged, and can be useful for large equality-only keys. They do not support ranges, `ORDER BY`, or inequality. B-tree remains the default general-purpose choice. Unique hash indexes exist but are less common than unique B-tree.

**Follow-up:**

Why did older advice say “never use hash”?

Answer: Pre-PG10 hash indexes were not WAL-logged and were crash-unsafe. That limitation is gone; choice is now about operators and size.

### DB-113 — Bitmap scans combine indexes

**Difficulty:** Senior

**Category:** Plans

**Question:**

`EXPLAIN` shows Bitmap Index Scan then Bitmap Heap Scan. What happened, and when is AND/OR of bitmaps used?

**Answer:**

Postgres builds a TID bitmap from the index, then visits heap pages in physical order (better than random Index Scan fetches). Multiple indexes can BitmapAnd/BitmapOr before the heap pass. Good for moderately selective filters; very selective single indexes may still prefer plain Index Scan.

**Follow-up:**

What does “Recheck Cond” mean?

Answer: Lossy bitmaps (memory pressure) mark whole pages; rows are rechecked against the predicate when fetching.

### DB-114 — Foreign keys and missing indexes

**Difficulty:** Intermediate

**Category:** Foreign keys

**Question:**

You have `line_items.order_id` referencing `orders(id)`. Which side usually needs an index you might forget?

**Answer:**

The referenced PK/unique is already indexed. The referencing column `line_items.order_id` is not indexed automatically. Deletes/updates on `orders` must find children—without an index that becomes a sequential scan of `line_items`. Add an index on FK columns used in joins and cascades.

**Follow-up:**

Does PostgreSQL ever auto-create the referencing index?

Answer: No. Only the referenced unique/PK index is required/created by the constraint.

### DB-115 — HOT updates skip index maintenance when possible

**Difficulty:** Senior

**Category:** HOT

**Question:**

What is a HOT update, and what kills it?

**Answer:**

Heap-Only Tuple updates can place a new version on the same page and avoid updating indexes when no indexed column changes and space exists. Changing any indexed column, or lacking page free space, forces index maintenance. Extra indexes increase the chance an update touches an indexed column.

**Trade-offs:**

Fewer indexes → more HOT, cheaper writes. More indexes → faster some reads, more non-HOT updates.

**Follow-up:**

How do you observe HOT vs plain updates?

Answer: `pg_stat_user_tables.n_tup_hot_upd` vs `n_tup_upd`.

### DB-116 — Fillfactor and index bloat

**Difficulty:** Senior

**Category:** Maintenance

**Question:**

What does `fillfactor` on a B-tree control, and how does bloat show up?

**Answer:**

`fillfactor` leaves free space on pages during build/splits for future inserts (default 90 on B-tree). Low churn can use higher fillfactor; heavy random inserts may want lower. Bloat is empty/wasted space after deletes/updates—indexes grow; `pg_stat_user_indexes` plus size vs bloat estimates guide `REINDEX`.

**Follow-up:**

Does `VACUUM` reclaim index page space to the OS?

Answer: Vacuum can mark space reusable inside the index; returning pages to the OS often needs `REINDEX` / `VACUUM FULL` (with locks) depending on fragmentation.

### DB-117 — Reading Index Scan vs Index Only vs Bitmap

**Difficulty:** Intermediate

**Category:** EXPLAIN

**Question:**

In one sentence each: Index Scan, Index Only Scan, Bitmap Heap Scan—what differs for I/O?

**Answer:**

Index Scan: index → per-TID heap fetch (random I/O risk). Index Only Scan: answer from index when VM says all-visible (heap optional). Bitmap Heap Scan: bitmap of TIDs → heap in block order. Choose by selectivity, correlation, and whether columns are covered.

**Follow-up:**

Which number in `EXPLAIN ANALYZE` proves the estimate was wrong?

Answer: Compare estimated rows to actual rows; large gaps mean stats or correlations are off.

### DB-118 — LIKE and pattern indexes

**Difficulty:** Intermediate

**Category:** Patterns

**Question:**

`WHERE name LIKE 'abc%'` vs `'%abc%'`: which can use a B-tree, and what helps the other?

**Answer:**

Prefix `abc%` can use a B-tree (`text_pattern_ops` / `varchar_pattern_ops` in non-C collations often required). Leading-wildcard `%abc%` cannot use ordinary B-tree order—use `pg_trgm` GIN/GiST or full-text. `LIKE` with anchored prefix is the B-tree-friendly case.

**Code:**

```sql
CREATE INDEX ON items (name text_pattern_ops);
CREATE INDEX ON items USING gin (name gin_trgm_ops);
```

**Follow-up:**

Why might a default B-tree on `name` ignore `LIKE 'abc%'` under a non-C locale?

Answer: Locale-aware comparisons may not match pattern semantics; pattern_ops (or `C` collation) aligns with `LIKE`.

### DB-119 — Satisfying ORDER BY with an index

**Difficulty:** Intermediate

**Category:** Ordering

**Question:**

How can an index eliminate a sort node for `WHERE tenant_id = $1 ORDER BY created_at DESC`?

**Answer:**

An index on `(tenant_id, created_at DESC)` (or ASC with backward scan) can return rows already ordered. Leading equality, then the sort keys, must match. Extra filters that break contiguity may force a sort. `EXPLAIN` shows whether a Sort node remains.

**Follow-up:**

Does `INCLUDE (payload)` help ordering?

Answer: No for order—INCLUDE is not part of the sort key. It can enable index-only while order still comes from key columns.

### DB-120 — Too many indexes hurt writes

**Difficulty:** Intermediate

**Category:** Anti-patterns

**Question:**

A table has twelve overlapping B-tree indexes “just in case.” What is the senior objection?

**Answer:**

Every insert/update/delete maintains each index—write amplification, larger cache footprint, longer autovacuum. Overlapping prefixes rarely all get used (`idx_scan = 0` in `pg_stat_user_indexes`). Prefer indexes justified by measured queries; drop unused ones after a full traffic cycle.

**Trade-offs:**

Read-heavy analytics replicas can carry more indexes than the primary write path.

**Follow-up:**

How do you find unused indexes safely?

Answer: Track `idx_scan` over a representative period; confirm replicas/standbys; then `DROP INDEX CONCURRENTLY`.

### DB-121 — Covering indexes with INCLUDE

**Difficulty:** Intermediate

**Category:** Covering

**Question:**

Why use `INCLUDE` instead of adding columns to the key list of a unique index?

**Answer:**

Key columns participate in uniqueness and ordering; INCLUDE columns are stored at the leaf for index-only scans without changing uniqueness. Adding to the key would make uniqueness apply to those columns too and enlarge the search key. Use INCLUDE for payload only.

**Follow-up:**

Can you `WHERE` on an INCLUDE column using the index as a search key?

Answer: No—INCLUDE is not searchable as a leading/trailing key; it is payload after a key match.

### DB-122 — Statistics targets and bad estimates

**Difficulty:** Senior

**Category:** Statistics

**Question:**

A skewed status column gets terrible row estimates. What knobs help beyond plain `ANALYZE`?

**Answer:**

Raise `ALTER TABLE ... ALTER COLUMN ... SET STATISTICS` so histograms/MCV capture skew; create extended statistics (`CREATE STATISTICS`) for correlated columns. Then `ANALYZE`. Wrong estimates drive wrong join/index choices more often than “missing indexes.”

**Follow-up:**

Where do you see n_distinct and most common values?

Answer: `pg_stats` (`n_distinct`, `most_common_vals`, `histogram_bounds`).

### DB-123 — Concurrent unique violations during CONCURRENTLY

**Difficulty:** Senior

**Category:** Maintenance

**Question:**

`CREATE UNIQUE INDEX CONCURRENTLY` fails because duplicates exist. What state is the index in?

**Answer:**

Build aborts; an INVALID index may remain. Unique concurrent builds validate uniqueness in a separate pass—duplicates cause failure. Clean duplicates, drop INVALID, rebuild. Do not rely on an INVALID unique index for enforcement.

**Follow-up:**

Can two concurrent CONCURRENTLY builds on the same table run?

Answer: They can conflict/lock; serialize large concurrent builds in practice.

### DB-124 — REINDEX vs REINDEX CONCURRENTLY

**Difficulty:** Intermediate

**Category:** Maintenance

**Question:**

When do you `REINDEX` an index, and what does `CONCURRENTLY` change?

**Answer:**

REINDEX rebuilds a bloated or corrupted index. Plain REINDEX locks the index/table more strongly. `REINDEX INDEX CONCURRENTLY` rebuilds with weaker locking (PG12+), similar trade-offs to concurrent create (longer, possible INVALID on failure). Prefer concurrent on hot production indexes.

**Follow-up:**

Does REINDEX refresh planner statistics?

Answer: It rebuilds the index; run `ANALYZE` on the table if stats are also stale—REINDEX is not a substitute for ANALYZE.

### DB-125 — Index on boolean / low cardinality

**Difficulty:** Intermediate

**Category:** Selectivity

**Question:**

Is a B-tree on a boolean `is_active` usually useful?

**Answer:**

Often not for both values—half the table makes Seq Scan cheaper. A partial index `WHERE is_active` (or `WHERE NOT is_active`) on the rare side can help. Combine with higher-cardinality leading columns instead of indexing the boolean alone.

**Follow-up:**

When is a boolean index still justified?

Answer: When one value is rare and queries always filter that rare side—partial index matches that case.

### DB-126 — Descending and NULLS FIRST/LAST in indexes

**Difficulty:** Intermediate

**Category:** Ordering

**Question:**

Query wants `ORDER BY score DESC NULLS LAST`. What index definition matches?

**Answer:**

Create the index with the same ordering: `(score DESC NULLS LAST)`. Mismatched null ordering can prevent an index-only ordered scan and introduce a Sort. Match ASC/DESC and NULLS options to the query’s `ORDER BY`.

**Follow-up:**

Can a backward index scan replace DESC?

Answer: Often yes for simple DESC vs ASC indexes; NULLS FIRST/LAST still must align.

### DB-127 — Expression index vs generated column

**Difficulty:** Intermediate

**Category:** Expression indexes

**Question:**

Compare indexing `lower(email)` vs a stored generated column `email_lower` with a B-tree.

**Answer:**

Both support case-insensitive lookup if queries match. Generated columns make the value visible and usable in FK/unique more simply; expression indexes avoid schema width. Constraints and ORMs sometimes prefer real columns. Immutability rules still apply to expressions.

**Trade-offs:**

Generated columns use storage; expression indexes hide the transform in the index definition.

**Follow-up:**

Can a unique expression index enforce unique emails case-insensitively?

Answer: Yes—`UNIQUE INDEX ON (lower(email))`.

### DB-128 — Heap correlation and clustering

**Difficulty:** Senior

**Category:** Clustering

**Question:**

What does `CLUSTER` do, and why is it rarely a standing strategy?

**Answer:**

`CLUSTER` rewrites the table in index order once—improves locality for range scans correlated to that index. It is a full rewrite with strong locks; order decays as new updates arrive. Prefer BRIN/natural append order or accept B-tree random fetches. Not an online maintenance habit.

**Follow-up:**

Is there continuous clustering in PostgreSQL?

Answer: No automatic keep-clustered; `cluster` is one-shot. Some extensions/approaches exist outside core.

### DB-129 — Duplicate overlapping indexes

**Difficulty:** Intermediate

**Category:** Anti-patterns

**Question:**

You have indexes on `(a)`, `(a,b)`, and `(a,b,c)`. What do you drop first and why?

**Answer:**

`(a)` is often redundant if `(a,b)` exists—leftmost prefix covers equality on `a`. Keep the widest index that matches real queries; drop narrower duplicates after checking `idx_scan` and `ORDER BY` needs. `(a,b,c)` may still be needed for covering/order on `c`.

**Follow-up:**

When is a separate `(a)` still useful?

Answer: Rarely—if it is unique/PK, much smaller and hotter for PK lookups while the wide index is cold/large.

### DB-130 — Indexes and UPSERT conflict targets

**Difficulty:** Intermediate

**Category:** Unique

**Question:**

`INSERT ... ON CONFLICT (email) DO UPDATE` requires what kind of index?

**Answer:**

A unique index (or constraint) on the conflict target columns (or inference expression). Without a matching unique index, `ON CONFLICT` inference fails. Partial unique indexes require a matching `WHERE` inference predicate.

**Code:**

```sql
INSERT INTO users (email, name) VALUES ($1, $2)
ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name;
```

**Follow-up:**

Can you `ON CONFLICT` on a non-unique index?

Answer: No—conflict inference needs a unique constraint/index.

### DB-131 — Autovacuum and index-only scans

**Difficulty:** Senior

**Category:** Index-only

**Question:**

Index-only scans degraded after a bulk update wave. What lagged?

**Answer:**

Visibility map bits clear when pages are updated; vacuum must revisit to set all-visible again. Until then, index-only plans still heap-fetch. Tune autovacuum to catch up after bulk writes; consider `VACUUM` on the hot table during a quiet window.

**Follow-up:**

Does analyzing alone fix heap fetches on index-only scans?

Answer: No—ANALYZE refreshes stats; VACUUM maintains the visibility map.

### DB-132 — Multicolumn selectivity order

**Difficulty:** Senior

**Category:** Multicolumn

**Question:**

For filters `a =` and `b =` equally often, but `a` has 10 values and `b` has millions, how do you order `(?, ?)`?

**Answer:**

Usually put the more selective / higher cardinality equality first when both are always present—`(b, a)` can narrow faster. If many queries filter only `a`, leftmost must be `a`. Design for the common query shape, not abstract cardinality alone.

**Follow-up:**

What if half the queries omit `b`?

Answer: Leading `b` fails those queries—use `(a, b)` or two indexes.

### DB-133 — GIN pending list and fastupdate

**Difficulty:** Staff

**Category:** Index types

**Question:**

GIN inserts feel fine then sudden slow queries appear. What GIN mechanism is involved?

**Answer:**

With `fastupdate`, GIN buffers inserts in a pending list flushed later—amortizes writes, can surprise with cleanup cost and temporarily larger scans. Disabling fastupdate or tuning `gin_pending_list_limit` trades write latency for steadier reads. Know this before blaming “random GIN slowness.”

**Follow-up:**

Where do you see pending list pressure?

Answer: Index options / `pg_stat` and GIN-specific pending list size; docs for `fastupdate`.

### DB-134 — Exclusion constraints need GiST (often)

**Difficulty:** Intermediate

**Category:** Constraints

**Question:**

You must forbid overlapping meeting `tstzrange` per room. What index-backed feature do you use?

**Answer:**

`EXCLUDE USING gist (room_id WITH =, during WITH &&)`. GiST supports the overlap operator. A plain UNIQUE cannot express range overlap. This is enforcement plus an index for lookups.

**Follow-up:**

Can B-tree express `&&` exclusion?

Answer: No—use GiST (or SP-GiST in some cases) with the appropriate operators.

### DB-135 — Index scan direction and merge joins

**Difficulty:** Senior

**Category:** Plans

**Question:**

How can matching index order help a merge join?

**Answer:**

Merge join needs ordered inputs. Indexes that deliver both sides in join-key order avoid explicit sorts. If the planner sorts anyway, check mismatched ASC/DESC or incomplete leading keys. Not every join becomes a merge—hash join often wins on large unsorted inputs.

**Follow-up:**

Does `enable_mergejoin` off prove anything in production?

Answer: Only as a session debug knob—do not leave it off globally.

### DB-136 — Predicate implication for partial indexes

**Difficulty:** Senior

**Category:** Partial indexes

**Question:**

Partial index `WHERE amount > 0`. Query has `WHERE amount >= 10`. Can Postgres use the index?

**Answer:**

Yes if the planner proves the query predicate implies the index predicate (`amount >= 10` ⇒ `amount > 0`). Complex expressions may fail implication and skip the index. Keep partial predicates simple and aligned with query style.

**Follow-up:**

What about `amount > 0` query vs index `amount >= 0`?

Answer: Implication may fail (zero excluded by query)—index might still be usable only if planner proves safety; test with EXPLAIN.

### DB-137 — opclasses and collation

**Difficulty:** Senior

**Category:** B-tree

**Question:**

Why do two text indexes on the same column sometimes both exist—one default, one `text_pattern_ops`?

**Answer:**

Default opclass respects locale collation for ordering/comparisons; pattern_ops supports `LIKE 'prefix%'` style pattern matching semantics. Different opclasses serve different query classes. Collation-aware unique constraints also matter for what “equal” means.

**Follow-up:**

Can one index serve both `ORDER BY name` and `LIKE 'a%'` always?

Answer: Not always under non-C collations—hence pattern_ops or `C` collation indexes.

### DB-138 — Parallel index builds

**Difficulty:** Intermediate

**Category:** Maintenance

**Question:**

What settings influence parallel `CREATE INDEX` in PostgreSQL 16?

**Answer:**

`max_parallel_maintenance_workers` and table-level parallel workers, plus `maintenance_work_mem`. Parallel build can speed large indexes but contending I/O/CPU on a busy primary may hurt latency elsewhere. Concurrent builds already stress the system—add parallelism carefully.

**Follow-up:**

Does parallel create change the final index structure vs serial?

Answer: Same B-tree result; build method differs.

### DB-139 — Indexes on JSONB paths

**Difficulty:** Intermediate

**Category:** JSONB

**Question:**

Compare expression B-tree on `((data->>'sku'))` vs GIN on `data`.

**Answer:**

Expression B-tree is great for equality/range on one extracted field. GIN supports broader containment/existence across many keys. Point lookups on one sku → expression/btree (or generated column). Variadic key searches → GIN.

**Trade-offs:**

Many expression indexes recreate “columns.” Normalize hot paths to real columns when stable.

**Follow-up:**

Which is better for `data @> '{"type":"x"}'`?

Answer: GIN (`jsonb_ops` or `jsonb_path_ops`).

### DB-140 — Unlogged tables and indexes

**Difficulty:** Intermediate

**Category:** Durability

**Question:**

Do indexes on UNLOGGED tables survive a crash?

**Answer:**

UNLOGGED table data and its indexes are truncated after crash/unclean shutdown. Indexes are also unlogged with the table—faster writes, not durable. Never use for data you cannot rebuild.

**Follow-up:**

Can you have a logged index on an unlogged table?

Answer: No—indexes follow the table’s permanence.

### DB-141 — Covering unique constraints carefully

**Difficulty:** Senior

**Category:** Unique

**Question:**

Why not put five INCLUDE columns on every unique index “for free index-only scans”?

**Answer:**

Wider leaves mean fewer entries per page, more churn on update of included columns (INCLUDE updates can still force index tuple changes), and larger cache use. Cover what measured queries need. Unique key stays narrow; INCLUDE is selective payload.

**Follow-up:**

Updating an INCLUDE column—does it maintain the index?

Answer: Yes—leaf payload changes require index maintenance even though the key is unchanged.

### DB-142 — Detecting indexes that are never used

**Difficulty:** Intermediate

**Category:** Operations

**Question:**

Write a diagnostic approach for unused indexes on a primary that also has replicas.

**Answer:**

Watch `pg_stat_user_indexes.idx_scan` on primary and replicas (reads may hit standbys). Allow a full business cycle. Exclude unique/PK/FK-supporting indexes even if scans look low. Then drop with `DROP INDEX CONCURRENTLY` in maintenance windows.

**Code:**

```sql
SELECT schemaname, relname, indexrelname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan NULLS FIRST, pg_relation_size(indexrelid) DESC;
```

**Follow-up:**

Why might `idx_scan` be zero on primary but the index still needed?

Answer: Standbys serve the SELECTs, or the index enforces uniqueness without many scans.

### DB-143 — Bitmap vs index scan under high selectivity

**Difficulty:** Senior

**Category:** Plans

**Question:**

Very selective `id = $1` on a PK—why Index Scan, not Bitmap Heap Scan?

**Answer:**

One TID → one heap fetch; bitmap build overhead is pointless. Bitmaps shine with many matches where sorting TIDs by page reduces random I/O. Planner cost model picks based on estimated rows.

**Follow-up:**

If estimates say 1 row but actual is 50k, what happens?

Answer: Wrong plan shape (nested loop/index) and severe slowness—fix statistics.

### DB-144 — Functional unique indexes for soft delete

**Difficulty:** Intermediate

**Category:** Partial indexes

**Question:**

Enforce one active email while allowing many soft-deleted duplicates. How?

**Answer:**

`CREATE UNIQUE INDEX ON users (email) WHERE deleted_at IS NULL;` Inserts with `deleted_at` set skip the unique index. Active rows remain unique. Queries for login should include `deleted_at IS NULL` to use the index.

**Follow-up:**

Will `ON CONFLICT (email)` infer that partial unique index?

Answer: Only with matching inference `WHERE deleted_at IS NULL`.

### DB-145 — Index bloat after mass deletes

**Difficulty:** Intermediate

**Category:** Maintenance

**Question:**

You deleted 80% of rows. Table vacuumed, but index sizes barely shrank. Why?

**Answer:**

Vacuum reclaims space for reuse inside indexes; it often does not densely rewrite them. Pages may stay allocated. `REINDEX` (preferably concurrently) rebuilds compact indexes. Check bloat estimates before/after.

**Follow-up:**

Is `VACUUM FULL` required?

Answer: It rewrites the table+indexes but locks heavily—usually `REINDEX CONCURRENTLY` is enough for index bloat.

### DB-146 — Combining BRIN and B-tree

**Difficulty:** Senior

**Category:** Index types

**Question:**

A huge time-series table has BRIN on `created_at` and B-tree on `device_id`. How might a query use both?

**Answer:**

Planner may BitmapAnd a BRIN range restriction with a B-tree device lookup before heap fetch—when both reduce pages enough. If device_id is ultra-selective alone, B-tree may suffice. Design indexes for complementary filters, not duplicates.

**Follow-up:**

Does BRIN help `device_id` equality?

Answer: Only if `device_id` correlates with physical order—usually it does not; use B-tree for that.

### DB-147 — Cost of updating indexed columns

**Difficulty:** Intermediate

**Category:** Writes

**Question:**

A counter column is incremented on every request and is also indexed for admin sorts. What is the issue?

**Answer:**

Every increment updates the index (and blocks HOT if indexed). Hot counters should rarely be indexed; sort via separate reporting structures or accept Seq Scan on small admin tables. Index stability matters as much as read speed.

**Trade-offs:**

Materialized rollups or Redis counters avoid indexing a rapidly changing column.

**Follow-up:**

Would INCLUDE on another index referencing the counter help?

Answer: No—INCLUDE of a hot column still causes leaf updates when it changes.

### DB-148 — Explaining “Filter” vs “Index Cond”

**Difficulty:** Intermediate

**Category:** EXPLAIN

**Question:**

`EXPLAIN` shows Index Cond and also Filter. What is the difference?

**Answer:**

Index Cond was pushed into the index search (key comparisons). Filter rows are discarded after fetch—they did not constrain the index scan range (non-indexable predicates, or residual checks). High rows removed by Filter means wasted heap fetches—improve index match or predicate shape.

**Follow-up:**

Is a Filter always a problem?

Answer: No—residual checks are normal; problem is large lossy scans with tiny final rows.

### DB-149 — Choosing indexes from slow-query evidence

**Difficulty:** Senior

**Category:** Process

**Question:**

Outline a senior process before adding an index to fix a slow query.

**Answer:**

Capture `EXPLAIN (ANALYZE, BUFFERS)` on production-like data; check estimates vs actual; confirm whether Seq Scan is justified; look for missing FK indexes or stale stats first; design the smallest index matching filter+order; test write impact; add concurrently; remeasure. Do not index from guesswork or ORM defaults alone.

**Follow-up:**

What is a red flag in the plan before you touch indexes?

Answer: Huge estimate/actual mismatch—run ANALYZE / fix extended stats before new indexes.

### DB-150 — Indexing summary for interviews

**Difficulty:** Intermediate

**Category:** Synthesis

**Question:**

State a compact decision guide: B-tree vs GIN vs BRIN vs partial, in four bullets you would say aloud.

**Answer:**

B-tree: equality/range/order on scalars—default. GIN: jsonb/array/FTS containment. BRIN: huge append-only correlated columns. Partial/expression: when a subset or transform dominates queries. Always validate with `EXPLAIN (ANALYZE, BUFFERS)` and watch write cost and unused indexes.

**Follow-up:**

What single metric suggests an index might be droppable?

Answer: Sustained `idx_scan = 0` (or negligible) across primary and replicas, excluding uniqueness/FK support.
