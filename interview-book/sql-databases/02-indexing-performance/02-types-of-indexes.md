# 02. Types of indexes

> Source: `interview-prep/sql-databases/02-indexing-performance.md`

### Topics to learn
- [ ] Single-column index
- [ ] Composite (multi-column) index and leftmost-prefix rule
- [ ] Unique index / unique constraint
- [ ] Partial index (Postgres) - index only a subset of rows
- [ ] Covering index / index-only scan
- [ ] Full-text index (awareness)
- [ ] Foreign key columns often need an explicit index (not automatic in every engine/config)

### Composite index and the leftmost-prefix rule

A composite index on `(vet_id, scheduled_at)` is sorted first by `vet_id`, then by `scheduled_at` within each `vet_id`. This index can efficiently serve:
- `WHERE vet_id = ?` (uses the leftmost column)
- `WHERE vet_id = ? AND scheduled_at > ?` (uses both columns, most efficient)
- `WHERE vet_id = ? ORDER BY scheduled_at` (satisfies both filter and sort)

But it will generally NOT efficiently serve:
- `WHERE scheduled_at > ?` alone (skips the leftmost column - the index can't be used the same way; some engines can still do an index skip scan in limited cases, but don't assume it)

**Rule of thumb:** "Put the column used for equality filters first, range/sort columns after, matching your most common query pattern." Column order in a composite index is not arbitrary - it should mirror your actual WHERE/ORDER BY usage.

### Example: composite index for a real VetApp query

"Get all of a vet's upcoming appointments, soonest first."

```sql
SELECT * FROM appointments
WHERE vet_id = 42 AND scheduled_at >= NOW()
ORDER BY scheduled_at ASC;
```

Ideal index:

```sql
CREATE INDEX idx_appointments_vet_scheduled ON appointments (vet_id, scheduled_at);
```

This single index satisfies the equality filter on `vet_id`, the range filter on `scheduled_at`, and the ORDER BY - all in one index traversal, no separate sort step needed.

### Covering index / index-only scan

If an index contains every column the query needs (in the SELECT list, WHERE, and ORDER BY), the database can answer the query by reading only the index - never touching the actual table rows. This is an "index-only scan" (Postgres term) or "covering index" (general term).

```sql
-- If this query only ever needs vet_id, scheduled_at, and status:
SELECT vet_id, scheduled_at, status
FROM appointments
WHERE vet_id = 42 AND scheduled_at >= NOW();

-- A covering index includes status too:
CREATE INDEX idx_appointments_covering
  ON appointments (vet_id, scheduled_at) INCLUDE (status); -- Postgres INCLUDE syntax
```

MySQL doesn't have `INCLUDE`, but you can add extra columns directly into the composite index (`(vet_id, scheduled_at, status)`) to get the same covering effect, at the cost of a larger index.

### Partial index (Postgres)

```sql
-- Only index appointments that are still pending - much smaller, faster index
-- if most rows are eventually completed/cancelled and you mostly query pending ones.
CREATE INDEX idx_pending_appointments ON appointments (scheduled_at)
WHERE status = 'pending';
```

### Model spoken answer

"For composite indexes I follow the leftmost-prefix rule - put equality-filtered columns first, then range or sort columns, matching the actual query pattern. When a query only needs columns that are already in the index, the database can do an index-only scan and skip the table entirely, which is a nice performance win I look for when a hot query is doing a lot of simple filtering and sorting."

---
