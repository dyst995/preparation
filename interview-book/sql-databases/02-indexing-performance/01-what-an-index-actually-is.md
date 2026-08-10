# 01. What an index actually is

> Source: `interview-prep/sql-databases/02-indexing-performance.md`

### Topics to learn
- [ ] B-tree structure (balanced tree, sorted keys, leaf nodes)
- [ ] Why a B-tree gives O(log n) lookups instead of O(n) table scans
- [ ] Index vs table storage (index is a separate, sorted structure pointing back to rows)
- [ ] Primary key index is (usually) automatic
- [ ] Indexes speed up: equality lookups, range scans, ORDER BY, JOIN conditions, uniqueness checks
- [ ] Indexes do NOT automatically speed up: `LIKE '%x%'` (leading wildcard), functions applied to the indexed column without a matching expression index, low-selectivity columns (e.g. a boolean with 90% one value)

### Mental model (B-tree)

Think of a phone book sorted by last name. Without an index, "find everyone named Beroshvili" means reading every single page (a full table scan, O(n)). With a B-tree index on last name, you jump straight to the "Ber..." section in a handful of comparisons (O(log n)), because the tree is balanced and sorted - each level narrows the search dramatically.

A B-tree index stores:
- Sorted key values (the indexed column(s))
- A pointer back to the actual row (in Postgres: a "tuple ID" / ctid-like reference; in MySQL InnoDB secondary indexes: the primary key value)

### Clustered vs secondary indexes (MySQL InnoDB specific, good interview differentiator)

InnoDB (MySQL's default engine) stores the table itself as a B-tree ordered by the primary key - this is called a **clustered index**. Every secondary index (e.g. one you add on `email`) stores the indexed column plus the primary key value, and looking up a row by a secondary index requires a second lookup into the clustered index (the primary key) to get the full row - this is sometimes called a "double lookup."

Postgres, by contrast, does not cluster the table by primary key by default - the table is a heap, and every index (including the primary key's index) points to a physical row location (ctid) directly. Postgres does support `CLUSTER` as a one-time manual reorganization command, but it does not maintain clustering automatically like InnoDB does.

**Practical implication interviewers like to hear:** "In MySQL/InnoDB, choosing a good primary key (small, sequential, e.g. auto-increment) matters more than in Postgres, because every secondary index indirectly depends on it for the final row lookup, and a large/random primary key (like a UUID) causes page fragmentation and slower inserts on the clustered index."

### Model spoken answer

"An index is a separate, sorted data structure - typically a B-tree - that lets the database jump to matching rows in roughly logarithmic time instead of scanning every row. It trades write cost and storage for read speed. In MySQL's InnoDB, the table itself is stored as a B-tree clustered on the primary key, so secondary indexes require an extra lookup back into that clustered index to fetch the full row. Postgres tables are heaps by default, and indexes point directly to a physical row location."

---
