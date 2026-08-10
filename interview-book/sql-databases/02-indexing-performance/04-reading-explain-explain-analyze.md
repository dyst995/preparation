# 04. Reading EXPLAIN / EXPLAIN ANALYZE

> Source: `interview-prep/sql-databases/02-indexing-performance.md`

### Topics to learn
- [ ] `EXPLAIN` shows the planned execution strategy without running the query
- [ ] `EXPLAIN ANALYZE` (Postgres) actually runs the query and shows real timings/row counts
- [ ] Sequential scan (`Seq Scan` in Postgres, `type: ALL` in MySQL) vs index scan (`Index Scan` / `type: ref` or `range`)
- [ ] Estimated rows vs actual rows (big mismatch = stale statistics or bad estimate)
- [ ] Join strategies: nested loop, hash join, merge join (Postgres); similar concepts in MySQL's optimizer trace
- [ ] `cost` numbers are relative units, not milliseconds

### Postgres example

```sql
EXPLAIN ANALYZE
SELECT * FROM appointments WHERE vet_id = 42 AND scheduled_at >= NOW();
```

Two very different outputs to recognize:

```
Seq Scan on appointments  (cost=0.00..18334.00 rows=1 width=64) (actual time=42.113..88.220 rows=12 loops=1)
  Filter: (vet_id = 42 AND scheduled_at >= now())
  Rows Removed by Filter: 999988
```

This is bad: a sequential scan read essentially the whole table (removed ~999,988 rows via a filter) to find 12 matching rows. This screams "missing index on vet_id/scheduled_at."

```
Index Scan using idx_appointments_vet_scheduled on appointments
  (cost=0.43..8.52 rows=12 width=64) (actual time=0.031..0.045 rows=12 loops=1)
  Index Cond: (vet_id = 42 AND scheduled_at >= now())
```

This is good: the index scan went almost directly to the 12 matching rows, with cost and time orders of magnitude lower.

### MySQL EXPLAIN example

```sql
EXPLAIN SELECT * FROM appointments WHERE vet_id = 42 AND scheduled_at >= NOW();
```

Key columns to read:
- `type`: `ALL` = full table scan (bad for large tables); `ref`/`range`/`const` = using an index (good)
- `key`: which index was actually used (NULL means none)
- `rows`: estimated rows examined
- `Extra`: watch for `Using filesort` (expensive sort not satisfied by an index) and `Using temporary` (temp table needed, often from GROUP BY/DISTINCT without a supporting index)

### Model spoken answer

"I start with EXPLAIN to see the planned strategy, and EXPLAIN ANALYZE in Postgres when I want real timings and row counts, not just estimates. The main thing I look for is a sequential/full table scan on a large table where I expected an index scan, and a big gap between estimated and actual row counts, which usually means stale statistics. In MySQL I check the `type` and `key` columns specifically - `type: ALL` with `key: NULL` is my signal to add or fix an index."

---
