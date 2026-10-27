# DB03 — Indexing

PostgreSQL 16. Questions DB-101–DB-150.

B-tree and other index types, planner choice, covering and partial indexes, maintenance, and EXPLAIN patterns. Heap/MVCC internals are DB02; isolation anomalies are a later section.

### DB-101 — What a B-tree index stores

**Difficulty:** Intermediate

**Category:** B-tree

**Question:**

In PostgreSQL 16, what does a default B-tree index on `orders(customer_id)` store in leaf entries, and how does that relate to heap lookups?

**Answer:**

A default B-tree is a separate relation, ordered by the indexed columns. Each leaf entry stores the key, here `customer_id`, and a TID: the heap block number and the line-pointer offset of the row. Internal pages store separator keys so a search can pick a child without reading every leaf.

An index scan walks the matching leaves, then fetches each heap tuple by that TID, unless an index-only scan is allowed to skip the heap. The index does not replace the table. An update that changes `customer_id` must maintain both the heap version and the index entry.

**Follow-up:**

Does the leaf store the full heap row?

Answer: No. It stores the index keys, plus any `INCLUDE` columns, and the TID. Other columns come from the heap. An index-only scan can skip that fetch only when the visibility map says the page is all-visible.

### DB-102 — Why the planner sometimes prefers a sequential scan

**Difficulty:** Intermediate

**Category:** Planner

**Question:**

A selective-looking `WHERE status = 'open'` still chooses Seq Scan on a large table that has an index on `status`. Why might that be correct?

**Answer:**

An index is not automatically cheaper. The planner estimates how many rows match, using `n_distinct`, the most common values, and the histogram from `ANALYZE`. If `open` is most of the table, an index scan would jump to a heap page for almost every row. One sequential read of the heap is cheaper than that random I/O.

Correlation matters too. If matching rows are scattered, each TID is a random fetch. If they sit together, an index range is cheaper. Check the choice with `EXPLAIN (ANALYZE, BUFFERS)` rather than assuming the index should have been used.

**Trade-offs:**

A partial index on a rare status, or rows physically ordered by that column, can change the winner. PostgreSQL has no hint syntax to force an index. Fix the statistics or the predicate.

**Follow-up:**

What command refreshes the stats the planner uses?

Answer: `ANALYZE`, or the analyze pass autovacuum runs. Stale statistics after a bulk load are a common reason for a plan that no longer matches the data.

### DB-103 — Leftmost prefix of a multicolumn index

**Difficulty:** Intermediate

**Category:** Multicolumn

**Question:**

You have `CREATE INDEX ON events (tenant_id, created_at, kind)`. Which of these can use the index efficiently: filter on `tenant_id`; on `created_at` alone; on `tenant_id` and `kind` without `created_at`?

**Answer:**

A B-tree is ordered from the left. A search can use a leading prefix of equality columns, then a range on the next column. `tenant_id = ...` uses this index. `created_at` alone does not, because those values are not contiguous without a tenant. PostgreSQL 16 has no index skip scan to jump from tenant to tenant.

`tenant_id` plus `kind`, with no equality on `created_at`, uses the tenant prefix and then filters `kind`. It cannot treat `kind` as the next ordered column. Put columns you always test with equality first, then the column you range-scan or order by.

**Follow-up:**

Where should `created_at` sit if most queries are `tenant_id = $1 ORDER BY created_at`?

Answer: Second: `(tenant_id, created_at)`. Equality on the tenant, then the order column. Put `kind` later, or in its own index, if those queries do not filter it.

### DB-104 — Index-only scans need the visibility map

**Difficulty:** Senior

**Category:** Index-only

**Question:**

`EXPLAIN` shows Index Only Scan but `EXPLAIN ANALYZE` reports heap fetches. What does that mean?

**Answer:**

The plan is allowed to answer from the index only when every needed column is in the index and the heap page is all-visible. All-visible means every tuple on that page is visible to every transaction, so the scan does not have to check `xmin` and `xmax` in the heap.

If vacuum has not set the bit, or a later update cleared it, the scan still fetches that TID from the heap. Those are the heap fetches in `EXPLAIN ANALYZE`. `INCLUDE` can cover extra columns. It does not skip the visibility check.

**Follow-up:**

How do you add non-search columns without changing sort order of the key?

Answer: `CREATE INDEX ... ON t (a, b) INCLUDE (c, d);` `c` and `d` are stored in the leaf for index-only scans. They are not part of the search key or the sort order.

### DB-105 — Partial indexes match a subset

**Difficulty:** Intermediate

**Category:** Partial indexes

**Question:**

When is `CREATE INDEX ON jobs (id) WHERE state = 'pending'` better than indexing all rows, and what must the query do?

**Answer:**

A partial index stores only rows that match its predicate. If few jobs are pending, the index stays small, and updates that leave a row outside `pending` do not maintain an entry. The planner uses it only when it can prove the query's `WHERE` implies the index predicate. `state = 'pending'` does. A query that might need other states does not, because those rows are absent.

Changing `state` inserts or removes the partial entry. Do not use a partial index as the only index when most queries read every state.

**Trade-offs:**

One partial index on the hot slice is usually the win. A partial index per state multiplies write cost and rarely matches every query.

**Follow-up:**

Can `WHERE state IN ('pending','running')` use an index defined only for `pending`?

Answer: Not for the whole predicate. Running rows are not in the index. Use a predicate that covers both states, or a second index.

### DB-106 — Expression indexes need matching expressions

**Difficulty:** Intermediate

**Category:** Expression indexes

**Question:**

You index `(lower(email))`. Which query uses it, and what must be true of the function?

**Answer:**

An expression index stores the result of an expression, not the raw column. The query has to use that same expression. `WHERE lower(email) = lower($1)` can use the index. `WHERE email = $1` looks at the raw column and generally will not.

The expression must be immutable. PostgreSQL refuses to index a volatile function, and a stable function is not a safe lookup key because its result can change across calls. If every query applies the same transform, you can also store the normalized value on write and index that column directly.

**Code:**

```sql
CREATE INDEX ON users (lower(email));
SELECT * FROM users WHERE lower(email) = lower($1);
```

**Follow-up:**

Why might `WHERE email ILIKE 'x%'` not use `lower(email)`?

Answer: `ILIKE` is not the expression that was indexed. Write `lower(email) LIKE lower('x%')`, or add a trigram index when the pattern is not a simple prefix.

### DB-107 — Unique indexes enforce uniqueness

**Difficulty:** Intermediate

**Category:** Unique

**Question:**

How does a UNIQUE index differ from a UNIQUE table constraint in PostgreSQL 16, and what happens on concurrent inserts of the same key?

**Answer:**

A `UNIQUE` constraint creates a unique index and names that constraint. `CREATE UNIQUE INDEX` can do the same job without a constraint name. Both reject a duplicate key. A foreign key must target the constraint, not a bare unique index.

Two transactions inserting the same key do not both succeed. The second waits if the first inserted the key and has not committed. If the first commits, the waiter fails with `23505`. If the first rolls back, the waiter proceeds. A partial unique index applies only inside its `WHERE`, such as `WHERE deleted_at IS NULL`.

**Follow-up:**

Can two NULLs coexist in a unique B-tree column?

Answer: Yes, unless you ask otherwise. The default unique index treats null as distinct from null. `NULLS NOT DISTINCT`, available since PostgreSQL 15, allows only one null.

### DB-108 — CREATE INDEX CONCURRENTLY

**Difficulty:** Senior

**Category:** Maintenance

**Question:**

Why use `CREATE INDEX CONCURRENTLY`, and what failure mode leaves an INVALID index?

**Answer:**

A normal `CREATE INDEX` takes a `SHARE` lock that blocks writes until the build finishes. Reads can continue. `CREATE INDEX CONCURRENTLY` uses a weaker lock so inserts, updates, and deletes keep running. It builds the index in more than one pass, waits for old snapshots, and then validates. It cannot run inside a transaction block.

If the build fails, PostgreSQL can leave the index behind with `indisvalid` false. Queries ignore an invalid index, but writes still maintain it. Check `\d` or `pg_index.indisvalid` after a concurrent build, and drop the invalid index before you retry.

**Trade-offs:**

A concurrent build takes longer and does more I/O, because it scans twice and waits out other transactions. On a busy production table that cost is why you use it.

**Follow-up:**

How do you remove a failed INVALID index?

Answer: `DROP INDEX CONCURRENTLY` when the table must stay writable. A plain `DROP INDEX` is fine when you can take the stronger lock. Do not leave the invalid index in place.

### DB-109 — GIN for containment and full-text

**Difficulty:** Intermediate

**Category:** Index types

**Question:**

When do you choose GIN over B-tree for `jsonb` or arrays?

**Answer:**

GIN is an inverted index. It maps each element, key, or lexeme to the rows that contain it. That fits containment and membership: `jsonb` `@>` and `?`, array contains, and full-text search on `tsvector`. A B-tree fits equality, range, and ordering on one scalar value. It does not fit "this document contains these keys."

GIN indexes are larger and slower to update, because one row can touch many index entries. They pay off on read-heavy search. A primary-key style lookup of one scalar still belongs on a B-tree.

**Follow-up:**

What operator class helps `jsonb` path queries?

Answer: `jsonb_path_ops` is smaller and is aimed at `@>`. The default `jsonb_ops` supports more operators and takes more space. Pick the one that matches the operators you actually run.

### DB-110 — GiST for ranges and geometry

**Difficulty:** Intermediate

**Category:** Index types

**Question:**

Name two workload types where GiST is the usual choice instead of B-tree.

**Answer:**

GiST is a balanced tree for operators that are not a simple scalar order. Two common cases are range overlap, such as `tstzrange` with `&&`, and geometric search, including nearest-neighbor. Exclusion constraints use it too: `EXCLUDE USING gist` can forbid overlapping bookings. Some full-text setups also use GiST, though GIN is the more common full-text index.

A B-tree answers `=`, `<`, `>`, and `ORDER BY` on a scalar. It has no way to express "these ranges overlap." Choose GiST when the operator family is the point, not when you only need equality.

**Follow-up:**

Can GiST replace B-tree for `integer =` lookups?

Answer: Some operator classes can index equality, but a B-tree is the default and is usually faster for plain equality and range on a scalar.

### DB-111 — BRIN for correlated physical order

**Difficulty:** Senior

**Category:** Index types

**Question:**

When is BRIN a good fit, and when is it useless?

**Answer:**

BRIN stores a small summary for each range of heap blocks, such as the minimum and maximum `created_at` in those pages. The index is tiny and cheap to maintain. It helps when values track physical order, which is typical of a table that only appends in time order. A query for a time range can skip block ranges whose summary cannot match.

If the values are scattered, every summary overlaps the search and BRIN eliminates nothing. You still pay a lossy heap recheck. Use a B-tree when you need a precise lookup and the column is not ordered on disk.

**Trade-offs:**

Random updates destroy the correlation BRIN depends on. A B-tree stays correct for those lookups, at a much larger size.

**Follow-up:**

How do you check correlation?

Answer: Look at `pg_stats.correlation` for the column. Values near 1 or -1 mean the column follows physical order closely enough for BRIN to skip pages.

### DB-112 — Hash indexes are equality-only

**Difficulty:** Intermediate

**Category:** Index types

**Question:**

What can a hash index do in modern PostgreSQL, and what can it not?

**Answer:**

A hash index supports equality only. `WHERE key = $1` can use it. It is WAL-logged, so a crash no longer discards it. It can be smaller than a B-tree when the key is wide and you never need order. It cannot serve a range, an inequality, or `ORDER BY`, because a hash has no sort order.

A B-tree remains the default for a general-purpose column, because the same index answers equality, range, and ordering. Unique hash indexes exist, but a unique B-tree is the usual way to enforce a key.

**Follow-up:**

Why did older advice say “never use hash”?

Answer: Before PostgreSQL 10, hash indexes were not WAL-logged and were unsafe across a crash. That limit is gone. The choice now is which operators you need, and how large the index is.

### DB-113 — Bitmap scans combine indexes

**Difficulty:** Senior

**Category:** Plans

**Question:**

`EXPLAIN` shows Bitmap Index Scan then Bitmap Heap Scan. What happened, and when is AND/OR of bitmaps used?

**Answer:**

A bitmap index scan does not fetch the heap row by row. It records the matching TIDs in a bitmap, often one bit per possible row. A bitmap heap scan then visits those heap pages in physical order. That turns many random fetches into fewer page reads.

PostgreSQL can `BitmapAnd` or `BitmapOr` several index bitmaps before the heap visit, so two different indexes can serve one query. This wins for a moderately selective filter. A single extremely selective index, such as a primary-key equality, is usually cheaper as a plain index scan. Building the bitmap would be pure overhead.

**Follow-up:**

What does “Recheck Cond” mean?

Answer: If `work_mem` is tight, the bitmap becomes lossy and marks whole pages. PostgreSQL fetches those pages and tests the original predicate again, which is the recheck.

### DB-114 — Foreign keys and missing indexes

**Difficulty:** Intermediate

**Category:** Foreign keys

**Question:**

You have `line_items.order_id` referencing `orders(id)`. Which side usually needs an index you might forget?

**Answer:**

The referenced side is already indexed. A foreign key must point at a primary key or a unique constraint, and that constraint has an index. PostgreSQL does not create an index on the referencing column.

`line_items.order_id` is the one people forget. A delete or a key update on `orders` has to find the child rows. Without an index, that is a sequential scan of `line_items`, and it holds a lock while it scans. Add an index on foreign-key columns you join, delete through, or cascade. A composite foreign key needs the leading columns of that index to match the key.

**Follow-up:**

Does PostgreSQL ever auto-create the referencing index?

Answer: No. The constraint creates only the unique index on the referenced columns. The child-side index is yours to add.

### DB-115 — HOT updates skip index maintenance when possible

**Difficulty:** Senior

**Category:** HOT

**Question:**

What is a HOT update, and what kills it?

**Answer:**

A HOT update, short for heap-only tuple, stores the new row version on the same heap page and does not insert a new index entry. It is allowed only when no indexed column changes and the page has room. Indexes keep pointing at the start of the chain, and readers walk the chain on the page.

Changing any indexed column, including an `INCLUDE` column or a partial-index predicate column, forces a normal index update. A full page does too, even when the indexed values did not change. Every extra index is another way to lose HOT.

**Trade-offs:**

Fewer indexes mean more updates stay HOT and writes stay cheaper. More indexes speed particular reads and make more updates pay index maintenance.

**Follow-up:**

How do you observe HOT vs plain updates?

Answer: Compare `n_tup_hot_upd` with `n_tup_upd` in `pg_stat_user_tables`. A low HOT share on a busy table usually means indexed columns are changing, or pages have no free space.

### DB-116 — Fillfactor and index bloat

**Difficulty:** Senior

**Category:** Maintenance

**Question:**

What does `fillfactor` on a B-tree control, and how does bloat show up?

**Answer:**

`fillfactor` is how full PostgreSQL packs index pages when it builds them or splits them. The B-tree default is 90, so about 10 percent of each page is left free for later inserts of nearby keys. A table that only appends can use a higher fillfactor. Heavy random inserts may want a lower one, so splits happen less often.

Bloat is space that remains after deletes and updates. The index file stays large even though many entries are dead. Vacuum can make that space reusable inside the index. Compare index size with a bloat estimate, and `pg_stat_user_indexes`, before you `REINDEX`.

**Follow-up:**

Does `VACUUM` reclaim index page space to the OS?

Answer: It can mark space reusable inside the index. Returning free pages to the operating system usually needs `REINDEX` or `VACUUM FULL`, which take stronger locks.

### DB-117 — Reading Index Scan vs Index Only vs Bitmap

**Difficulty:** Intermediate

**Category:** EXPLAIN

**Question:**

In one sentence each: Index Scan, Index Only Scan, Bitmap Heap Scan—what differs for I/O?

**Answer:**

An index scan walks the index in key order and fetches each matching heap tuple by TID, so scattered matches become random I/O. An index-only scan answers from the index when the visibility map says the heap page is all-visible, and otherwise falls back to a heap fetch for that TID. A bitmap heap scan collects TIDs from one or more indexes, then reads the heap in physical page order.

Which one wins depends on how many rows match, how close those rows are on disk, and whether the index contains every column the query needs.

**Follow-up:**

Which number in `EXPLAIN ANALYZE` proves the estimate was wrong?

Answer: Compare estimated rows with actual rows on the same node. A large gap means the statistics, or a correlation the planner cannot see, are off.

### DB-118 — LIKE and pattern indexes

**Difficulty:** Intermediate

**Category:** Patterns

**Question:**

`WHERE name LIKE 'abc%'` vs `'%abc%'`: which can use a B-tree, and what helps the other?

**Answer:**

`LIKE 'abc%'` is a prefix. A B-tree can turn that into a range if the index order matches pattern order. Under a non-C collation the default text operator class sorts by locale rules, which do not match `LIKE`, so you often need `text_pattern_ops` or `varchar_pattern_ops`. A `C` collation index works too.

`LIKE '%abc%'` has no useful left bound. Every key is a candidate, so an ordinary B-tree cannot narrow the scan. Use a trigram GIN or GiST index (`pg_trgm`), or full-text search when you mean words rather than a substring.

**Code:**

```sql
CREATE INDEX ON items (name text_pattern_ops);
CREATE INDEX ON items USING gin (name gin_trgm_ops);
```

**Follow-up:**

Why might a default B-tree on `name` ignore `LIKE 'abc%'` under a non-C locale?

Answer: Locale ordering and `LIKE` character order are not the same, so the planner will not use that operator class for the pattern. `text_pattern_ops`, or a `C` collation, lines the index up with `LIKE`.

### DB-119 — Satisfying ORDER BY with an index

**Difficulty:** Intermediate

**Category:** Ordering

**Question:**

How can an index eliminate a sort node for `WHERE tenant_id = $1 ORDER BY created_at DESC`?

**Answer:**

A sort node appears when the rows are not already in the requested order. An index on `(tenant_id, created_at DESC)` returns matches in that order: equality on the leading column, then the sort key. A backward scan can supply plain `DESC` only when null placement also matches.

The `ORDER BY` has to agree with the index after the equality columns. A filter that is not a contiguous slice of the index can force a sort of the survivors. `EXPLAIN` shows whether a Sort node remains. If it does, the index order and the query order do not match.

**Follow-up:**

Does `INCLUDE (payload)` help ordering?

Answer: No. `INCLUDE` columns are leaf payload, not part of the sort key. They can make the scan index-only. The order still comes from the key columns.

### DB-120 — Too many indexes hurt writes

**Difficulty:** Intermediate

**Category:** Anti-patterns

**Question:**

A table has twelve overlapping B-tree indexes “just in case.” What is the senior objection?

**Answer:**

Every insert, update, and delete maintains every index that the change touches. Twelve overlapping trees mean extra WAL, a larger cache footprint, and more work for autovacuum. Most of them are unused. `pg_stat_user_indexes.idx_scan` stays at zero through a full traffic cycle.

Add an index because a measured query needs that access path, not because a column might be filtered someday. Leading prefixes often make the narrower copies redundant. Drop the unused ones with `DROP INDEX CONCURRENTLY` after you have checked standbys, because reads may run there rather than on the primary.

**Trade-offs:**

A read-heavy reporting replica can carry indexes the primary should not pay for on the write path. Keep that split deliberate.

**Follow-up:**

How do you find unused indexes safely?

Answer: Watch `idx_scan` on the primary and on replicas for a full business cycle. Keep indexes that enforce uniqueness or support a foreign key. Then `DROP INDEX CONCURRENTLY`.

### DB-121 — Covering indexes with INCLUDE

**Difficulty:** Intermediate

**Category:** Covering

**Question:**

Why use `INCLUDE` instead of adding columns to the key list of a unique index?

**Answer:**

Key columns define uniqueness and the order of the tree. `INCLUDE` columns are stored only in the leaf, so an index-only scan can return them without a heap fetch. They do not participate in uniqueness and they are not a search path.

If you add those columns to the key of a unique index, uniqueness applies to the wider combination. Two rows with the same email and different payloads would both be allowed, which is usually the bug you were trying to avoid. Keep the unique key narrow. Use `INCLUDE` for payload a specific query needs.

**Follow-up:**

Can you `WHERE` on an INCLUDE column using the index as a search key?

Answer: No. An `INCLUDE` column is not a leading or trailing search key. PostgreSQL can return it after the real key matches. It cannot seek by it.

### DB-122 — Statistics targets and bad estimates

**Difficulty:** Senior

**Category:** Statistics

**Question:**

A skewed status column gets terrible row estimates. What knobs help beyond plain `ANALYZE`?

**Answer:**

`ANALYZE` samples the column into a fixed number of most-common values and histogram buckets. The default target is too small for a skewed status, so rare values collapse into "everything else" and the estimate is wrong. Wrong row counts then pick the wrong join or the wrong index.

Raise the detail with `ALTER TABLE ... ALTER COLUMN status SET STATISTICS n`, then `ANALYZE` again. When two columns move together, `CREATE STATISTICS` adds a dependency or n-distinct statistic the planner can use. A bad estimate is often the problem before a missing index is.

**Follow-up:**

Where do you see n_distinct and most common values?

Answer: In `pg_stats`: `n_distinct`, `most_common_vals`, `most_common_freqs`, and `histogram_bounds` for that column.

### DB-123 — Concurrent unique violations during CONCURRENTLY

**Difficulty:** Senior

**Category:** Maintenance

**Question:**

`CREATE UNIQUE INDEX CONCURRENTLY` fails because duplicates exist. What state is the index in?

**Answer:**

A concurrent unique build scans the table, then validates uniqueness in a later pass so it can see rows inserted during the build. If that pass finds duplicates, the command fails. The index can remain in the catalog with `indisvalid` false.

Queries will not use an invalid index, and it does not enforce uniqueness. Writes may still maintain it, so it costs something and protects nothing. Delete or merge the duplicate rows, `DROP INDEX CONCURRENTLY` the invalid index, and build it again. Do not treat the leftover index as a constraint.

**Follow-up:**

Can two concurrent CONCURRENTLY builds on the same table run?

Answer: The second waits. Each needs `ShareUpdateExclusiveLock`, and those locks conflict. Run large concurrent builds one at a time.

### DB-124 — REINDEX vs REINDEX CONCURRENTLY

**Difficulty:** Intermediate

**Category:** Maintenance

**Question:**

When do you `REINDEX` an index, and what does `CONCURRENTLY` change?

**Answer:**

`REINDEX` builds a fresh index and replaces the old one. You do it when the index is bloated after a mass delete, or when it is suspected corrupt. A plain `REINDEX` takes a strong lock and blocks writes to the table for the rebuild.

`REINDEX INDEX CONCURRENTLY`, available since PostgreSQL 12, rebuilds under a weaker lock so reads and writes continue. It takes longer, cannot run inside a transaction block, and a failure can leave an invalid index to drop. Use it on a hot index. `ANALYZE` separately if statistics are stale. Reindex does not refresh them.

**Follow-up:**

Does REINDEX refresh planner statistics?

Answer: No. It rebuilds index pages. If estimates are stale, `ANALYZE` the table. `REINDEX` is not a substitute.

### DB-125 — Index on boolean / low cardinality

**Difficulty:** Intermediate

**Category:** Selectivity

**Question:**

Is a B-tree on a boolean `is_active` usually useful?

**Answer:**

Usually no, if queries ask for both values. When about half the rows match, the planner prefers a sequential scan. Walking the index and then fetching most of the heap is more I/O, not less. A boolean also has almost no ordering value.

A partial index on the rare side is the useful shape: `WHERE is_active`, or `WHERE NOT is_active`, when that side is a small fraction and the query always includes the same predicate. Otherwise put a higher-cardinality column first and let the boolean be a later filter, not its own index.

**Follow-up:**

When is a boolean index still justified?

Answer: When one value is rare and the queries always filter to that value. A partial index on that predicate matches the query and stays small.

### DB-126 — Descending and NULLS FIRST/LAST in indexes

**Difficulty:** Intermediate

**Category:** Ordering

**Question:**

Query wants `ORDER BY score DESC NULLS LAST`. What index definition matches?

**Answer:**

PostgreSQL can avoid a sort only when the index order matches the `ORDER BY`, including where nulls go. The default B-tree is `ASC NULLS LAST`. A backward scan of that index yields `DESC NULLS FIRST`, which is not what this query asks for. Nulls would come out first, and the planner may sort to fix that.

Create the index as `(score DESC NULLS LAST)`. Match `ASC` or `DESC`, and match `NULLS FIRST` or `NULLS LAST`, on every key the query orders by. A mismatch on only the null placement is enough to bring the Sort node back.

**Follow-up:**

Can a backward index scan replace DESC?

Answer: Often, for a plain `DESC` against an `ASC` index. `NULLS FIRST` and `NULLS LAST` still have to agree with the scan direction. If they do not, you still get a sort.

### DB-127 — Expression index vs generated column

**Difficulty:** Intermediate

**Category:** Expression indexes

**Question:**

Compare indexing `lower(email)` vs a stored generated column `email_lower` with a B-tree.

**Answer:**

Both can serve a case-insensitive lookup if the query uses the same value the index stores. An expression index hides the transform inside the index definition. The table does not grow a column, and a query must repeat `lower(email)` to match.

A stored generated column, the only generated form in PostgreSQL 16, writes `email_lower` on every insert and update. You can select it, and a unique constraint or a foreign key can target a real column more directly than an expression. Constraints and ORMs often prefer that. The expression still has to be immutable either way.

**Trade-offs:**

The generated column costs heap space and shows the value in the row. The expression index keeps the table narrower and hides the rule in the index.

**Follow-up:**

Can a unique expression index enforce unique emails case-insensitively?

Answer: Yes. `CREATE UNIQUE INDEX ON users (lower(email));` Two addresses that differ only by case collide. Queries still need to use `lower(email)` to search that index.

### DB-128 — Heap correlation and clustering

**Difficulty:** Senior

**Category:** Clustering

**Question:**

What does `CLUSTER` do, and why is it rarely a standing strategy?

**Answer:**

`CLUSTER` rewrites the heap so rows are physically stored in the order of one index. A later range scan on that index finds its heap pages close together, which is what a high `correlation` statistic is describing. The command takes a strong lock and rewrites the table and its indexes. It is a one-time operation.

New inserts and updates do not preserve that order. The benefit decays. PostgreSQL has no background job that keeps a table clustered. Prefer an append-only order that BRIN can summarize, or accept B-tree fetches, instead of scheduling `CLUSTER` as routine maintenance.

**Follow-up:**

Is there continuous clustering in PostgreSQL?

Answer: Not in core. `CLUSTER` runs once and then order drifts. Keeping order continuously means an extension or a design that inserts in the order you want.

### DB-129 — Duplicate overlapping indexes

**Difficulty:** Intermediate

**Category:** Anti-patterns

**Question:**

You have indexes on `(a)`, `(a,b)`, and `(a,b,c)`. What do you drop first and why?

**Answer:**

A B-tree on `(a, b)` already serves equality on `a`, the leftmost prefix. A separate index on `(a)` is usually redundant, and every write maintains both. Drop `(a)` first, unless it is the primary key or a unique constraint you still need.

Keep `(a, b, c)` when queries filter or order by `c` after `a` and `b`, or when they need `c` covered. A wider key is not free. Drop it only when no query uses the extra column.

**Follow-up:**

When is a separate `(a)` still useful?

Answer: When `(a)` is the primary key or a unique constraint, and it is small and hot, while `(a, b, c)` is large and used by colder queries. The narrow index then stays in cache.

### DB-130 — Indexes and UPSERT conflict targets

**Difficulty:** Intermediate

**Category:** Unique

**Question:**

`INSERT ... ON CONFLICT (email) DO UPDATE` requires what kind of index?

**Answer:**

`ON CONFLICT` has to name a unique way to find the existing row. PostgreSQL infers a unique index or a unique constraint on the conflict columns, or on the same expression if you conflict on an expression. Without that unique index, inference fails and the statement is an error. A non-unique index is not a conflict target, because two rows could match.

A partial unique index is used only when `ON CONFLICT` repeats a matching `WHERE`. The arbiter and the index must describe the same subset of rows. Otherwise that partial index is not the target.

**Code:**

```sql
INSERT INTO users (email, name) VALUES ($1, $2)
ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name;
```

**Follow-up:**

Can you `ON CONFLICT` on a non-unique index?

Answer: No. Inference needs a unique constraint or a unique index. A plain index can speed a lookup, but it cannot decide which row wins a conflict.

### DB-131 — Autovacuum and index-only scans

**Difficulty:** Senior

**Category:** Index-only

**Question:**

Index-only scans degraded after a bulk update wave. What lagged?

**Answer:**

The plan can still say Index Only Scan while most rows visit the heap. A bulk update clears the all-visible bit on every page it touches. Until vacuum sets those bits again, the scan must fetch the heap to check visibility. That is the heap-fetch count going up, not the planner forgetting the index.

Autovacuum catches up once dead-tuple or insert thresholds say so, which can be late after a large update. A manual `VACUUM` in a quiet window sets the visibility map sooner. A lower autovacuum scale factor on that table shortens the next gap.

**Follow-up:**

Does analyzing alone fix heap fetches on index-only scans?

Answer: No. `ANALYZE` refreshes planner statistics. `VACUUM` is what sets the visibility map bits those scans depend on.

### DB-132 — Multicolumn selectivity order

**Difficulty:** Senior

**Category:** Multicolumn

**Question:**

For filters `a =` and `b =` equally often, but `a` has 10 values and `b` has millions, how do you order `(?, ?)`?

**Answer:**

When every important query supplies both equalities, put the more selective column first. Here that is `b`, with millions of distinct values. `(b, a)` narrows to a tiny slice on the first column. `a` has only about ten values, so leading with `a` walks a large portion of the index before `b` helps.

Selectivity is not the only rule. If many queries filter on `a` and omit `b`, `b` must not lead, because PostgreSQL 16 will not skip it. Order columns for the predicates you actually run, and add a second index when both shapes are common.

**Follow-up:**

What if half the queries omit `b`?

Answer: A leading `b` does not serve those queries. Use `(a, b)`, or keep two indexes if both the `a`-only queries and the selective `b` lookups matter.

### DB-133 — GIN pending list and fastupdate

**Difficulty:** Staff

**Category:** Index types

**Question:**

GIN inserts feel fine then sudden slow queries appear. What GIN mechanism is involved?

**Answer:**

GIN's `fastupdate` option, on by default, does not merge every insert into the main tree immediately. It appends new entries to a pending list and flushes that list later. Inserts look cheap. A query must also scan the pending list, and the flush can stall a statement once the list reaches `gin_pending_list_limit` (default 4 MB).

That pattern is fast writes, then a sudden slow read or a slow insert that drew the cleanup. For steadier reads, turn `fastupdate` off or lower the limit.

**Follow-up:**

Where do you see pending list pressure?

Answer: `pageinspect`'s `gin_metapage_info` shows pending pages. Also watch for latency spikes on reads after a burst of writes. The knobs are the index's `fastupdate` and `gin_pending_list_limit`.

### DB-134 — Exclusion constraints need GiST (often)

**Difficulty:** Intermediate

**Category:** Constraints

**Question:**

You must forbid overlapping meeting `tstzrange` per room. What index-backed feature do you use?

**Answer:**

A unique constraint only says two rows cannot share the same values. It cannot say two ranges must not overlap. An exclusion constraint can. For one room and a time range, the usual form is `EXCLUDE USING gist (room_id WITH =, during WITH &&)`. GiST supports both the equality operator and the overlap operator in one index.

PostgreSQL checks the constraint on insert and update, and the same index serves lookups for a room's meetings. A B-tree cannot express `&&`. Some operator families can use SP-GiST instead of GiST. Overlap of ranges is a GiST case.

**Follow-up:**

Can B-tree express `&&` exclusion?

Answer: No. `&&` is not a B-tree operator. Use GiST, or SP-GiST when that type's operator class supports the operators you need.

### DB-135 — Index scan direction and merge joins

**Difficulty:** Senior

**Category:** Plans

**Question:**

How can matching index order help a merge join?

**Answer:**

A merge join walks two inputs ordered on the join key and matches them in one pass. Indexes that already deliver that order let the planner skip a sort. Direction has to agree, including `ASC` versus `DESC`. A leading column that is not fixed to one value breaks that order.

If `EXPLAIN` still shows Sort under the merge, the index order does not match. A hash join is often cheaper when the inputs are large and unsorted, because it does not need order. An index that exists only to avoid a sort is not automatically the winner.

**Follow-up:**

Does `enable_mergejoin` off prove anything in production?

Answer: Only as a session-level experiment. It shows the plan the planner would pick without merge join. Do not leave it off for the whole server.

### DB-136 — Predicate implication for partial indexes

**Difficulty:** Senior

**Category:** Partial indexes

**Question:**

Partial index `WHERE amount > 0`. Query has `WHERE amount >= 10`. Can Postgres use the index?

**Answer:**

Yes. A partial index may be used only when every row the query could return is inside the index. The planner proves that by implication: if the query predicate is true, the index predicate must be true. `amount >= 10` implies `amount > 0`, so every qualifying row was indexed.

The proof works for simple comparisons. A complicated expression, a function the prover does not understand, or a predicate that is wider than the index makes implication fail, and the index is skipped. Keep the partial predicate as simple as the queries that should use it, and confirm with `EXPLAIN`.

**Follow-up:**

What about `amount > 0` query vs index `amount >= 0`?

Answer: The index can be used. Every row with `amount > 0` also has `amount >= 0`, so it is in the index. The extra zeros in the index are simply not returned.

### DB-137 — opclasses and collation

**Difficulty:** Senior

**Category:** B-tree

**Question:**

Why do two text indexes on the same column sometimes both exist—one default, one `text_pattern_ops`?

**Answer:**

An operator class defines how an index compares values. The default text class uses the column's collation, so `ORDER BY name` matches locale order. `LIKE 'abc%'` uses different operators. Under a non-C collation the planner will not use the default class for that pattern.

`text_pattern_ops` compares by character order, which prefix `LIKE` needs, and it is the wrong class for a locale sort. Collation also changes which strings count as equal. That is why both indexes sometimes exist.

**Follow-up:**

Can one index serve both `ORDER BY name` and `LIKE 'a%'` always?

Answer: Not under a non-C collation. Use the default class for locale order and `text_pattern_ops`, or a `C` collation, for the pattern.

### DB-138 — Parallel index builds

**Difficulty:** Intermediate

**Category:** Maintenance

**Question:**

What settings influence parallel `CREATE INDEX` in PostgreSQL 16?

**Answer:**

A large B-tree build can scan and sort with several workers. The limits are `max_parallel_maintenance_workers` (default 2) and the cluster cap `max_parallel_workers`. The table also has to be large enough for the planner to bother. `maintenance_work_mem` is the memory for the build. Too little memory spills the sort to disk and can erase the benefit of extra workers.

Parallelism shortens a big build and competes for CPU and disk with live traffic. On a busy primary, add workers carefully. `CREATE INDEX CONCURRENTLY` is already a heavy operation. The finished index is the same whether the build was parallel or serial.

**Follow-up:**

Does parallel create change the final index structure vs serial?

Answer: No. You get the same B-tree. Only the build method changes. Plans that use the index do not depend on how many workers created it.

### DB-139 — Indexes on JSONB paths

**Difficulty:** Intermediate

**Category:** JSONB

**Question:**

Compare expression B-tree on `((data->>'sku'))` vs GIN on `data`.

**Answer:**

An expression B-tree on `((data->>'sku'))` is a scalar index for equality or range on that one field, and it stays smaller than a general JSON index. The query must repeat the same expression. In PostgreSQL 16 a stored generated column is how you make that field a real column.

GIN on `data` answers containment and existence, `@>` and `?`, across whatever keys appear. Use it when the searched key changes. Do not build GIN when every query is `sku` equality.

**Trade-offs:**

Many expression indexes are a sign the hot paths should be real columns. GIN stays the better fit for open-ended document search.

**Follow-up:**

Which is better for `data @> '{"type":"x"}'`?

Answer: GIN, with `jsonb_ops` or the smaller `jsonb_path_ops`. An expression B-tree on one field does not answer a containment operator.

### DB-140 — Unlogged tables and indexes

**Difficulty:** Intermediate

**Category:** Durability

**Question:**

Do indexes on UNLOGGED tables survive a crash?

**Answer:**

No. An unlogged table skips WAL for its contents. Its indexes are unlogged with it. After a crash or an unclean shutdown, PostgreSQL truncates the table back to empty, and the indexes are reset with it. The speed comes from not logging those writes. Nothing on that table is durable across a crash, and a standby does not receive the rows.

Do not put data you cannot rebuild in an unlogged table, and do not expect its indexes to be a durable copy of the keys. A logged table is the one whose indexes survive recovery.

**Follow-up:**

Can you have a logged index on an unlogged table?

Answer: No. An index has the same permanence as its table. You cannot attach a WAL-logged index to an unlogged heap.

### DB-141 — Covering unique constraints carefully

**Difficulty:** Senior

**Category:** Unique

**Question:**

Why not put five INCLUDE columns on every unique index “for free index-only scans”?

**Answer:**

`INCLUDE` avoids adding those columns to the unique key, but it does not make them free. Wider leaf tuples mean fewer keys per page, a larger index, and more cache pressure. Updating any included column rewrites the leaf entry even though the unique key did not change, so that update cannot be HOT.

Cover the columns a measured index-only scan actually returns. Leave the rest in the heap. A unique index should stay narrow unless you have an `EXPLAIN (ANALYZE)` showing heap fetches you are willing to pay write cost to remove.

**Follow-up:**

Updating an INCLUDE column—does it maintain the index?

Answer: Yes. The leaf payload changed, so PostgreSQL updates that index tuple. The key being unchanged does not make the write free.

### DB-142 — Detecting indexes that are never used

**Difficulty:** Intermediate

**Category:** Operations

**Question:**

Write a diagnostic approach for unused indexes on a primary that also has replicas.

**Answer:**

`pg_stat_user_indexes.idx_scan` counts scans on that server only. A primary can show zero while a replica serves the reads, so check replicas too. Wait through a full business cycle, including monthly jobs, before you call an index unused. A zero since a recent crash is not a long measurement.

Do not drop an index that enforces a primary key, a unique constraint, or supports a foreign key. Drop a truly unused secondary index with `DROP INDEX CONCURRENTLY`.

**Code:**

```sql
SELECT schemaname, relname, indexrelname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan NULLS FIRST, pg_relation_size(indexrelid) DESC;
```

**Follow-up:**

Why might `idx_scan` be zero on primary but the index still needed?

Answer: The selects may run on a standby, or the index exists to enforce uniqueness and is not the access path those queries choose.

### DB-143 — Bitmap vs index scan under high selectivity

**Difficulty:** Senior

**Category:** Plans

**Question:**

Very selective `id = $1` on a PK—why Index Scan, not Bitmap Heap Scan?

**Answer:**

A primary-key equality matches one TID. An index scan fetches that one heap tuple and stops. A bitmap scan would build a bitmap, then visit the heap in page order, to find the same single row. The bitmap machinery costs more than the one fetch it saves.

Bitmaps earn their cost when many TIDs would otherwise be random heap fetches. Sorting those TIDs by page cuts I/O. The planner picks from the estimated row count. If it believes the predicate matches one row, it will not build a bitmap. Trust that shape when the estimate is honest.

**Follow-up:**

If estimates say 1 row but actual is 50k, what happens?

Answer: You can get a nested loop or an index scan that runs tens of thousands of times. Fix the statistics before you add indexes. The shape is wrong because the count was wrong.

### DB-144 — Functional unique indexes for soft delete

**Difficulty:** Intermediate

**Category:** Partial indexes

**Question:**

Enforce one active email while allowing many soft-deleted duplicates. How?

**Answer:**

A plain unique index on `email` would forbid a second row even after the first was soft-deleted. A partial unique index enforces the rule only for live rows.

Rows with `deleted_at` set are absent from the index, so old emails may repeat. Two rows with a null `deleted_at` and the same email still conflict. Login and other lookups should include `deleted_at IS NULL`, both for correctness and so the planner can use this index.

**Code:**

```sql
CREATE UNIQUE INDEX ON users (email) WHERE deleted_at IS NULL;
```

**Follow-up:**

Will `ON CONFLICT (email)` infer that partial unique index?

Answer: Only if you repeat the predicate: `ON CONFLICT (email) WHERE deleted_at IS NULL`. Without that `WHERE`, inference does not choose the partial index.

### DB-145 — Index bloat after mass deletes

**Difficulty:** Intermediate

**Category:** Maintenance

**Question:**

You deleted 80% of rows. Table vacuumed, but index sizes barely shrank. Why?

**Answer:**

`VACUUM` removes dead index entries and marks that space reusable. It does not rewrite the index into a dense tree. Partly empty pages usually stay allocated, so `pg_relation_size` barely moves after a mass delete.

`REINDEX CONCURRENTLY` builds a compact index and swaps it in. That is what returns the space. Vacuum was still useful: the dead entries became reusable. Shrinking the file is a separate step.

**Follow-up:**

Is `VACUUM FULL` required?

Answer: No. `VACUUM FULL` rewrites the heap and every index, and it blocks writers. For index bloat alone, `REINDEX CONCURRENTLY` is the usual fix.

### DB-146 — Combining BRIN and B-tree

**Difficulty:** Senior

**Category:** Index types

**Question:**

A huge time-series table has BRIN on `created_at` and B-tree on `device_id`. How might a query use both?

**Answer:**

The two indexes answer different parts of a predicate. BRIN can reject block ranges whose `created_at` summary misses the time window, while time follows physical order. The B-tree finds TIDs for one `device_id`. The planner may bitmap-AND those results and then visit the heap once.

If `device_id` alone is selective enough, the B-tree may be the whole plan. Build the pair when the filters remove different pages. A bitmap of both is a possibility, not a promise.

**Follow-up:**

Does BRIN help `device_id` equality?

Answer: Only if `device_id` itself follows heap order, which a device id usually does not. Equality on that column belongs on the B-tree.

### DB-147 — Cost of updating indexed columns

**Difficulty:** Intermediate

**Category:** Writes

**Question:**

A counter column is incremented on every request and is also indexed for admin sorts. What is the issue?

**Answer:**

Every increment deletes the old index entry and inserts a new one, and the update cannot be HOT. A counter touched on every request produces a steady stream of index maintenance, for a sort an admin runs rarely.

Keep that counter out of indexes. A small admin list can be a sequential scan. A large one belongs in a separate rollup that is indexed. Index columns you search, not columns that change on every write.

**Trade-offs:**

A materialized rollup, or a counter outside PostgreSQL, avoids indexing a column that changes constantly. The admin query then reads the stable copy.

**Follow-up:**

Would INCLUDE on another index referencing the counter help?

Answer: No. An `INCLUDE` column is still stored in the leaf. Changing the counter rewrites that leaf entry, so the hot column still costs an index update.

### DB-148 — Explaining “Filter” vs “Index Cond”

**Difficulty:** Intermediate

**Category:** EXPLAIN

**Question:**

`EXPLAIN` shows Index Cond and also Filter. What is the difference?

**Answer:**

Index Cond is the part of the predicate pushed into the index search. It limits which leaves are visited. Filter runs after a row is fetched, so it did not narrow the range. That happens when the column is not in the index, or the operator cannot become a range.

A Filter that drops a few rows is normal. A Filter that drops almost every fetched row means you read a lot of heap for a tiny result. Put the selective test into the index, or rewrite it so the index can apply it.

**Follow-up:**

Is a Filter always a problem?

Answer: No. A residual check is normal. It is a problem when the scan fetches far more rows than the query returns.

### DB-149 — Choosing indexes from slow-query evidence

**Difficulty:** Senior

**Category:** Process

**Question:**

Outline a senior process before adding an index to fix a slow query.

**Answer:**

Start from `EXPLAIN (ANALYZE, BUFFERS)` on realistic data. Compare estimated rows with actual rows. If they disagree, `ANALYZE` or extended statistics come before a new index. If they agree, decide whether the sequential scan is already cheap. A missing index on the referencing side of a foreign key is a common gap.

Design the smallest index that matches the filter and the `ORDER BY`. Build it with `CREATE INDEX CONCURRENTLY`, then explain again. Keep it only if the measured plan got cheaper.

**Follow-up:**

What is a red flag in the plan before you touch indexes?

Answer: A large gap between estimated and actual rows. Refresh statistics, or add extended statistics, before you add an index the planner may still ignore.

### DB-150 — Indexing summary for interviews

**Difficulty:** Intermediate

**Category:** Synthesis

**Question:**

State a compact decision guide: B-tree vs GIN vs BRIN vs partial, in four bullets you would say aloud.

**Answer:**

Use a B-tree for equality, range, and ordering on a scalar. That is the default, including unique keys and the column order an `ORDER BY` must match.

Use GIN when the question is containment: `jsonb`, arrays, or full-text lexemes. Expect a heavier write.

Use BRIN on a huge table whose values follow physical order, usually append-only time. It is small, and it is useless when values are scattered.

Use a partial or expression index when a small subset, or one immutable transform, is what queries actually search. Then confirm with `EXPLAIN (ANALYZE, BUFFERS)`, and drop indexes that stay unused.

**Follow-up:**

What single metric suggests an index might be droppable?

Answer: `idx_scan` staying at zero, on the primary and on replicas, across a full traffic cycle. Do not drop an index that enforces uniqueness or backs a foreign key.
