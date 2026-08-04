02 - Indexing & Performance

Goal: Explain how indexes actually work, read a query plan well enough to spot a missing index or a sequential scan, and diagnose the N+1 problem you are very likely to hit with an ORM like TypeORM - at senior depth.

Mark progress with [x] as you master each topic.

---

Learning objectives

By the end of this chapter you should be able to:

1. Explain what a B-tree index is and why it speeds up lookups and range scans.
2. Explain the difference between a clustered/primary key index and a secondary index (and how this differs between MySQL InnoDB and Postgres).
3. Design composite indexes correctly using the leftmost-prefix rule.
4. Explain covering indexes and index-only scans at a high level.
5. Read the shape of an `EXPLAIN` / `EXPLAIN ANALYZE` output and identify a sequential/full table scan vs an index scan.
6. Explain why indexes are not free (write cost, storage cost, planner cost).
7. Identify and fix the N+1 query problem, including how it shows up specifically with TypeORM relations.
8. Reason out loud about a slow-query scenario using a repeatable method.

---

## 1. What an index actually is

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

## 2. Types of indexes

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

## 3. When indexes help and when they hurt

### Topics to learn
- [ ] Every index adds write cost (INSERT/UPDATE/DELETE must maintain it)
- [ ] Every index adds storage cost
- [ ] Low-selectivity columns (few distinct values) often don't benefit much from a plain index
- [ ] Over-indexing is a real anti-pattern, not just under-indexing
- [ ] The query planner may ignore an index if it estimates a full scan is cheaper (e.g. when the filter matches a large fraction of the table)

### The trade-off table

| Aspect | More indexes |
|---|---|
| SELECT with a matching filter | Faster |
| INSERT / UPDATE / DELETE | Slower (every index must be updated) |
| Storage | Larger |
| Query planner complexity | More plans to consider |

### Selectivity intuition

An index on a `status` column with only 3 possible values (`pending`, `completed`, `cancelled`) across a million rows is often not very useful on its own, because any single value might still match hundreds of thousands of rows - the planner may correctly decide a full scan is cheaper than jumping around via an index and then fetching that many rows individually. Indexes shine most on high-selectivity columns (e.g. email, id, a timestamp range) where a lookup narrows the result set to a small fraction of the table.

### Model spoken answer

"Indexes aren't free - every write has to update every index on that table, and each index costs storage. I don't index everything defensively; I index based on actual query patterns, prioritizing high-selectivity columns and the columns in my hottest WHERE/JOIN/ORDER BY clauses. For low-selectivity columns like a 3-value status enum, a plain index often isn't worth it unless combined with other columns in a composite index, or unless I use a partial index for a specific skewed subset."

---

## 4. Reading EXPLAIN / EXPLAIN ANALYZE

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

## 5. The N+1 query problem (and TypeORM specifically)

### Topics to learn
- [ ] What N+1 means: 1 query to get a list, then N more queries, one per row, for related data
- [ ] Why lazy-loaded ORM relations are the most common source of N+1
- [ ] How to fix it: eager loading via JOIN, batching, or DataLoader-style batching
- [ ] TypeORM specifics: `relations` option, `leftJoinAndSelect`, lazy relations, `QueryBuilder`
- [ ] N+1 isn't just an ORM problem - it can happen with hand-written code too (a loop that queries per item)

### The problem illustrated

```typescript
// Naive: 1 query for appointments, then N queries - one per appointment - for its pet
const appointments = await appointmentRepository.find(); // 1 query
for (const appt of appointments) {
  const pet = await petRepository.findOne({ where: { id: appt.petId } }); // N queries!
  console.log(pet.name);
}
```

If there are 500 appointments, that's 501 round trips to the database instead of 1 or 2. This is one of the most common real-world performance bugs, and interviewers ask about it constantly because it is so easy to introduce by accident with an ORM's convenience APIs.

### How it sneaks in with TypeORM specifically

```typescript
// If Appointment.pet is a lazy relation, or if you access .pet after
// fetching without eager loading, TypeORM issues a separate query per access.
@Entity()
class Appointment {
  @ManyToOne(() => Pet)
  pet: Pet; // if not eager-loaded, accessing appointment.pet can trigger extra queries
}

const appointments = await appointmentRepository.find();
for (const appt of appointments) {
  console.log((await appt.pet).name); // N+1 if `pet` is a lazy relation
}
```

### The fix: eager load with a JOIN

```typescript
// Option 1: relations option (TypeORM builds the JOIN for you)
const appointments = await appointmentRepository.find({
  relations: ['pet', 'vet'],
});

// Option 2: QueryBuilder with explicit joins - more control, especially with filtering
const appointments = await appointmentRepository
  .createQueryBuilder('appointment')
  .leftJoinAndSelect('appointment.pet', 'pet')
  .leftJoinAndSelect('appointment.vet', 'vet')
  .where('appointment.status = :status', { status: 'completed' })
  .getMany();
```

Both approaches turn N+1 queries into a single query with JOINs, at the cost of a wider result set (some data duplicated across joined rows) - almost always a good trade for read performance.

### When JOIN isn't ideal: batching / DataLoader pattern

If you're loading multiple different one-to-many relations and a single mega-JOIN would cause row fan-out multiplying result size badly (e.g. an appointment with many medical records AND many payments joined at once), a better fix is often to issue a small, fixed number of batched queries - one per relation, using `WHERE id IN (...)` - and stitch the results together in application code. This is the same idea behind GraphQL's DataLoader: instead of N queries, do 1 query per relation type using an `IN` clause, keeping the total query count constant regardless of N.

```typescript
const appointments = await appointmentRepository.find();
const ids = appointments.map(a => a.id);

// 1 query for all medical records across all appointments, not one per appointment
const records = await medicalRecordRepository.find({ where: { appointmentId: In(ids) } });
```

### Model spoken answer

"N+1 happens when you fetch a list with one query, then trigger a separate query per row to get related data - very easy to introduce accidentally with ORM lazy relations. With TypeORM I fix it by eager loading with `relations` or `leftJoinAndSelect` in QueryBuilder so it becomes a single JOIN query. When a JOIN would cause too much row fan-out across multiple one-to-many relations, I batch instead - one `WHERE id IN (...)` query per relation type, so the query count stays constant regardless of list size, which is the same idea as GraphQL's DataLoader pattern."

---

## 6. A repeatable method for "how would you make this query faster"

1. **Ask what "slow" means** - how many rows, how often run, what's an acceptable latency.
2. **Get or imagine the EXPLAIN output** - identify sequential scans, filesort, temp tables, or row-estimate mismatches.
3. **Check for a missing/wrong index** - does the WHERE/JOIN/ORDER BY match an existing index's leftmost columns?
4. **Check for N+1** if this is happening inside application code with a loop.
5. **Check for unnecessary SELECT \*** - fetching columns you don't need prevents covering/index-only scans.
6. **Consider denormalization or caching only after indexing is exhausted** - don't jump straight to caching as the first fix.
7. **State the trade-off** - every index and every denormalization has a write-cost or consistency cost; say so.

---

## Interview question bank (with answer targets)

1. **What is a B-tree index and why does it speed up lookups?** -> sorted, balanced tree structure enabling O(log n) lookups and efficient range scans vs O(n) full scans.
2. **Clustered vs non-clustered/secondary index - how does MySQL InnoDB differ from Postgres?** -> InnoDB clusters the table by primary key; Postgres tables are heaps with all indexes pointing to a physical row location.
3. **What is the leftmost-prefix rule for composite indexes?** -> a composite index can serve queries filtering on a prefix of its columns, in order; skipping the first column mostly defeats it.
4. **What is a covering index / index-only scan?** -> when the index alone contains every column the query needs, avoiding a trip to the table.
5. **Why isn't it a good idea to index every column?** -> write cost, storage cost, low-selectivity columns rarely benefit, planner overhead.
6. **How do you diagnose a slow query?** -> EXPLAIN / EXPLAIN ANALYZE, look for seq scans, filesort, temp tables, estimate-vs-actual mismatches.
7. **What is the N+1 problem? How do you spot it in an ORM-based codebase?** -> one query for a list plus one query per row for relations; spot it via query logs showing repeated near-identical queries in a loop.
8. **How do you fix N+1 in TypeORM specifically?** -> `relations` option or `leftJoinAndSelect` for JOIN-based eager loading; batched `IN` queries for wide fan-out cases.
9. **Does a foreign key column get indexed automatically?** -> not always - depends on engine/ORM defaults; explicitly index foreign key columns used in JOINs/WHERE, since unindexed FKs are a very common real-world slow-query cause.
10. **What's the difference between EXPLAIN and EXPLAIN ANALYZE?** -> planned estimate only vs actual execution with real timings/row counts.

---

## Hands-on drills (do these)

- [ ] Take a table you've worked with (or the VetApp appointments table) and write the ideal composite index for its single most common query.
- [ ] Write out, from memory, the difference between `type: ALL` and `type: ref` in a MySQL EXPLAIN.
- [ ] Find (or recall) one place in a past project where you might have had N+1 without eager loading - describe how you'd verify it via query logs and how you'd fix it in TypeORM.
- [ ] Explain out loud why a large random primary key (UUID) can hurt InnoDB insert performance more than in Postgres.
- [ ] Practice reading a Seq Scan EXPLAIN ANALYZE output and stating in one sentence what index you'd add.

---

## Senior red flags / green flags

### Green flags
- Talking about trade-offs (write cost, storage) instead of "just add an index."
- Recognizing N+1 from a symptom description ("the page got slower as the list grew") without being shown code.
- Knowing to check `EXPLAIN` before guessing at a fix.
- Mentioning that unindexed foreign keys are a common real cause of slow JOINs.

### Red flags
- "Just add an index to everything."
- Not knowing what a sequential scan is.
- Fixing N+1 by "just adding more caching" without addressing the query pattern.
- Confusing an index with a constraint (they're related but distinct: a UNIQUE constraint typically creates a unique index, but not every index implies a constraint).

---

## Tie-backs to your experience

- On VetApp, appointment scheduling and payment queries are exactly the shape of "filter by vet/date range, join to related entities" that benefit from the composite index patterns in this chapter.
- Using TypeORM in a real backend means you have almost certainly hit lazy-relation-driven N+1 (or narrowly avoided it) - be ready to describe how you structured `relations`/`leftJoinAndSelect` for the appointment or payment endpoints.
- You also improved network/rendering performance on the mobile side (MyCreditInfo: lazy loading, HTTP caching with ETags) - you can bridge that story to backend performance thinking: "I already think about avoiding redundant round trips on the client; the same instinct applies to avoiding N+1 round trips to the database."

---

## Mastery checklist

- [ ] I can explain a B-tree index without hand-waving.
- [ ] I can design a correct composite index for a given query pattern.
- [ ] I can read a Postgres EXPLAIN ANALYZE and a MySQL EXPLAIN and spot a full scan.
- [ ] I can explain N+1 and fix it two ways (JOIN eager load, batched IN queries) in TypeORM terms.
- [ ] I can explain why indexing is a trade-off, not a free win.
