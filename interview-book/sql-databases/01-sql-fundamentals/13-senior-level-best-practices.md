# 13. Senior-Level Best Practices

> Source: `interview-prep/sql-databases/01-sql-fundamentals.md`

### Decision framework: when to reach for a JOIN vs a subquery vs a CTE vs a window function
- Need every input row preserved with an extra computed value (ranking, running total, comparison to neighboring rows)? -> window function.
- Need to combine rows from two tables into one result set, row-for-row? -> JOIN.
- Need a named, reusable intermediate result to make a multi-step query readable, or to avoid repeating the same aggregation? -> CTE.
- Need a yes/no existence check, ideally NULL-safe? -> EXISTS.
- Reach for a subquery only when a JOIN or CTE would not clearly be simpler - "can I write this as a JOIN" is a good default sanity check before reaching for a nested SELECT.
- Need set-difference logic ("in A but not in B")? -> NOT EXISTS by default, LEFT JOIN ... WHERE right.id IS NULL as a common readable alternative; avoid NOT IN unless the right-hand set is provably NULL-free.

### Production checklist for hand-written queries going into a live codebase
- [ ] No SELECT * in production code paths - name columns explicitly so the query stays a covering-index candidate and doesn't silently break when the table gains a column.
- [ ] Every LIMIT is paired with an ORDER BY - an unordered LIMIT is non-deterministic and will eventually produce a support ticket ("why did page 2 show me a row from page 1").
- [ ] Any NOT IN against a subquery has been reviewed and replaced with NOT EXISTS unless the subquery is provably NULL-free.
- [ ] Money/quantity columns are DECIMAL/NUMERIC, never FLOAT/DOUBLE.
- [ ] Any join across a one-to-many relationship followed by an aggregate has been checked for fan-out - pre-aggregate the many side in a CTE first.
- [ ] Pagination for anything user-facing uses keyset pagination (`WHERE id > :lastId ORDER BY id LIMIT n`) once OFFSET gets past a few thousand rows, since OFFSET still has to scan and discard every skipped row.
- [ ] Every query that filters on a date/timestamp range uses half-open bounds (`>= start AND < end`) instead of `BETWEEN`, avoiding off-by-one-day bugs at range boundaries.
- [ ] Column and table names are consistent (singular vs plural, snake_case) across the schema - a small thing that compounds into real confusion once a schema has 40+ tables.

### Anti-patterns and failure modes
| Anti-pattern | Why it fails in production | Fix |
|---|---|---|
| Implicit cross join (comma-separated FROM with no ON) | Silent Cartesian product, correct-looking on small test data, catastrophic on real data | Always use explicit JOIN ... ON |
| Business logic encoded as magic string comparisons (`status = 'A'`) | Unreadable, easy to typo, no single source of truth | Enum/lookup table plus named constants in application code |
| Deep OFFSET pagination on a hot endpoint | O(offset) cost per page; page 500 is dramatically slower than page 1 | Keyset/cursor pagination |
| Filtering rows in application code after fetching with no WHERE clause | Pulls the whole table over the network just to discard most of it | Push the filter into SQL |
| Trusting `LIMIT 1` without `ORDER BY` to mean "the latest" | Arbitrary row, not the latest one | Always pair with an explicit ORDER BY on a timestamp/id |
| Using `BETWEEN` for datetime ranges | Silently excludes/includes boundary timestamps depending on precision | Half-open range: `>= start AND < end` |
| Concatenating user input directly into SQL strings | SQL injection | Parameterized queries / prepared statements / ORM query builder, always |

### Observability for query-level issues
- Log slow queries (Postgres `log_min_duration_statement`, MySQL slow query log) and review them weekly, not just when something breaks.
- Track p95/p99 query latency per endpoint, not just averages - a single slow outlier query can be masked by a fast average across many cached hits.
- Alert on a sudden spike in rows examined vs rows returned (a proxy for "something just started doing a full scan").
- Track the ratio of queries that hit a cache/read replica vs the primary, so a sudden shift toward the primary is visible before it becomes a capacity incident.
- Correlate slow-query spikes with recent deploys/migrations in your dashboards - most regressions in query shape trace back to a specific code change, not gradual drift.

### Scalability and team practices
- Put query intent in a comment when the SQL itself can't express *why* (e.g. "intentionally UNION ALL, duplicates are expected here because...") - the "what" is in the SQL, the "why" belongs in a comment or PR description.
- Review raw SQL and query-builder code in PRs with the same scrutiny as application logic - a bad JOIN is a production incident waiting to happen, not a style nit.
- Establish a house style early (e.g. "always EXISTS over IN for subqueries," "always alias every table") so reviews focus on logic, not bikeshedding syntax.
- Keep a living "query patterns" doc per major domain (payments, scheduling) so new team members reuse proven, reviewed query shapes instead of re-deriving fan-out/NULL bugs from scratch.

### Worked scenario: reviewing a "find inactive customers" query in a PR
A teammate submits this for review: "customers who haven't ordered in the last 90 days":

```sql
SELECT * FROM customers
WHERE id NOT IN (SELECT customer_id FROM orders WHERE created_at >= NOW() - INTERVAL '90 days');
```

Walk through the review out loud, step by step:
1. **Selectivity/output check** - `SELECT *` should become an explicit column list; ask what the caller actually needs.
2. **NULL risk** - is `orders.customer_id` ever NULL (e.g. a guest checkout order)? If it can be, this `NOT IN` silently returns zero rows for every customer. Flag it immediately.
3. **Propose the fix** - rewrite as `NOT EXISTS` so NULLs can't poison the result:
```sql
SELECT c.id, c.full_name, c.email FROM customers c
WHERE NOT EXISTS (
  SELECT 1 FROM orders o
  WHERE o.customer_id = c.id AND o.created_at >= NOW() - INTERVAL '90 days'
);
```
4. **Index check** - confirm `orders(customer_id, created_at)` exists, since the correlated subquery needs to seek this efficiently per customer.
5. **Scale check** - ask how many customers/orders this runs against and how often; a nightly batch job tolerates a slower plan that a live API endpoint would not.
6. **Alternative framing** - if this needs to run frequently and fast, consider whether a `last_ordered_at` column maintained on write (denormalized) would serve the hot path better than recomputing it from `orders` every time, and say so as a deliberate trade-off, not a default.
7. **Sign off with a comment explaining why**, not just "changed to NOT EXISTS" - the "why" is what actually teaches the author something for next time.

### Senior follow-up Q&A
1. **A junior engineer's PR has `SELECT * FROM orders o, customers c WHERE o.customer_id = c.id`. What do you say in review?** -> Ask them to rewrite it as an explicit `INNER JOIN ... ON`, name the exact columns needed instead of `*`, and explain that comma-join syntax with a missing WHERE condition is exactly how accidental Cartesian products happen - it's not wrong here because the WHERE is present, but the implicit style invites future mistakes and hides intent.
2. **How would you paginate a "load more" feed for a table with tens of millions of rows, and why not just use OFFSET?** -> Use keyset pagination: order by a stable, indexed column (id or created_at+id tiebreaker), and filter `WHERE (created_at, id) < (:lastSeenCreatedAt, :lastSeenId)`. OFFSET-based pagination degrades linearly because the database still has to walk and discard every skipped row even with an index, so deep pages get progressively slower; keyset pagination's cost stays roughly constant regardless of page depth.
3. **Someone wants to add a `NOT IN (SELECT ...)` to a report query. How do you push back?** -> Ask whether the subquery's column could ever be NULL. If there's any doubt, insist on NOT EXISTS instead, since a single NULL in the NOT IN subquery silently returns zero rows for the entire outer query - a bug that's easy to miss in testing (test data rarely has that NULL) and painful to diagnose in production (the query "just returns nothing" with no error).
4. **How do you review a query for "will this get slow as the table grows" before it ever ships?** -> Ask for the expected row count in a year, check the WHERE/JOIN/ORDER BY columns against existing indexes, mentally simulate the leftmost-prefix rule, and if in doubt, ask for an EXPLAIN against a realistic data volume (or a production-like staging copy) rather than trusting how fast it feels against a nearly-empty dev database.
5. **What's your policy on writing raw SQL vs using an ORM's query builder for something like a monthly reporting query?** -> For read-heavy analytical queries with joins/aggregations that need to be reasoned about precisely (correctness, index usage), I prefer raw SQL or a query builder's raw-escape hatch over heavy ORM abstractions, since ORMs can generate subtly inefficient SQL for complex aggregations, and a raw query is easier to hand to EXPLAIN and reason about directly.
6. **How would you teach a mid-level engineer to "think in sets" instead of "think in loops" when writing SQL?** -> Give them a concrete before/after: show the loop-per-row version (fetch a list, then query per item for related data) next to the single-JOIN or single-aggregate version, and have them count round trips for each as data grows from 10 rows to 10,000. The visceral "1 query vs 10,001 queries" comparison teaches the set-based mindset faster than any abstract explanation of relational theory.

---
