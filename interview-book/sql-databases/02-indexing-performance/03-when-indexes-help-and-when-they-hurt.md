# 03. When indexes help and when they hurt

> Source: `interview-prep/sql-databases/02-indexing-performance.md`

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
