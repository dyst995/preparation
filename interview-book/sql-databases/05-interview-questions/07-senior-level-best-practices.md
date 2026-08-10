# 07. Senior-Level Best Practices

> Source: `interview-prep/sql-databases/05-interview-questions.md`

### Rapid-fire scenario responses (say these in one breath, cross-chapter)
- "Query does a full table scan on a large table." -> Check EXPLAIN, check leftmost-prefix match, check statistics freshness before adding an index blindly.
- "Two concurrent requests could double-book the same resource." -> A UNIQUE constraint plus catching the violation, or SELECT FOR UPDATE if the check is more complex than uniqueness alone.
- "A report query returns wrong totals after adding a join." -> Suspect fan-out from a one-to-many join before an aggregate; pre-aggregate the many side in a CTE.
- "A NOT IN query mysteriously returns zero rows." -> The subquery likely contains a NULL; switch to NOT EXISTS.
- "Migrating a live table's column with zero downtime." -> Add-new, dual-write, backfill, cutover, remove-old - never a single blocking change.
- "Choosing between Postgres and MySQL for a new project with no strong constraint." -> Lean Postgres for JSONB/arrays/extensibility, but say explicitly you'd defer to team familiarity or an existing system if one exists.
- "Interviewer asks what you'd change about your own model schema if given unlimited time." -> Name a concrete improvement (e.g. a lookup table instead of an ENUM for extensibility, or an explicit audit-log table) rather than claiming the first draft is already perfect.

### Decision framework: picking the right tool live in an interview
When an interviewer says "how would you speed this up / make this safer," run through this order out loud: (1) is the query even hitting an index correctly - check EXPLAIN; (2) is there unnecessary row fan-out from a join before an aggregate; (3) is this a concurrency/locking problem (double-spend, double-booking) rather than a pure query problem; (4) is this a schema/normalization problem (missing ledger table, boolean flag standing in for history); (5) only then consider caching or denormalization. Naming this order out loud, even briefly, is itself a strong senior signal.

### Cross-chapter trade-offs table (good for "compare X and Y" questions)
| Choice A | Choice B | Pick A when | Pick B when |
|---|---|---|---|
| Plain index | Composite index | Single-column filter dominates | Multi-column filter/sort pattern is stable and common |
| Pessimistic lock (FOR UPDATE) | Optimistic lock (version column) | High contention, money/booking | Low contention, general CRUD edits |
| JOIN | Batched `IN` queries | Result set fan-out is small/bounded | Multiple one-to-many relations would multiply row count badly |
| Read Committed | Serializable | Default, most business logic | Rare, complex multi-row invariant a targeted lock can't express |
| Postgres | MySQL | Greenfield, need JSONB/arrays/PostGIS | Existing MySQL system, or team's deep operational MySQL expertise |

### Common production incidents mapped to root cause (good closing material for any track-summary question)
| Symptom | Likely root cause | First check |
|---|---|---|
| Page got slower as a list grew | N+1 queries from a lazy ORM relation in a loop | Query-log the endpoint, count queries per request |
| Report totals doubled after a schema change | Join fan-out before an aggregate | Pre-aggregate the many side in a CTE before joining |
| "Not in this list" filter silently returns nothing | NOT IN against a NULL-containing subquery | Switch to NOT EXISTS |
| Two users booked the same slot | Missing uniqueness constraint, check-then-act race | Add a DB-level UNIQUE constraint, handle the conflict in code |
| Migration took the site down for a minute | Blocking ALTER on a large, hot table | Additive migration pattern, tested against a realistic clone |

### Production checklist for a schema-design interview answer (say it as a checklist, not just SQL)
- [ ] Primary keys and foreign keys on every relationship, stated explicitly, not "for simplicity I'll skip constraints."
- [ ] DECIMAL for money, never FLOAT.
- [ ] A ledger/history table for anything with money or status transitions, not a single mutable column with no audit trail.
- [ ] An idempotency key on any "create a transfer/payment" style endpoint.
- [ ] At least one composite index named for the single most likely hot query.
- [ ] One deliberate trade-off called out unprompted (a denormalization, a chosen isolation level, a partial index) with the reasoning stated.
- [ ] A brief note on how you'd verify the design under real concurrent load, not just that it looks correct on paper.
- [ ] An honest statement of what you'd change if the interviewer said "now imagine this at 100x scale," rather than treating the first draft as final.

### Worked scenario: a live "design + query + defend" combo prompt
**Prompt:** "Design a table for tracking loan repayments, write a query for delinquent loans, and tell me what would break at 100x scale."
1. **Schema first** - `loan_payments(id, loan_id FK, amount DECIMAL, paid_at TIMESTAMP)`, separate from `loans` because repayments are one-to-many and need individual history for reconciliation.
2. **Query second** - delinquency via `NOT EXISTS` against a 30-day window (see chapter 05's Drill 2), narrated as you write it.
3. **Index it** - `loan_payments(loan_id, paid_at)` to make the correlated NOT EXISTS check fast per loan.
4. **Scale question** - at 100x, the `NOT EXISTS` per-loan check over millions of loans nightly might be better served by a materialized/precomputed `last_payment_at` column on `loans`, updated on write, trading a small write-time cost for a much cheaper delinquency scan.
5. **Close the loop** - state explicitly that you'd only introduce that denormalization once the plain query is measured to be a real bottleneck, not preemptively.

### Anti-patterns interviewers are trained to notice
- Silence when asked "what would you check first" - not having a repeatable method is a bigger red flag than getting one detail wrong.
- Jumping straight to "add a cache" before ruling out an indexing or query-shape fix.
- Presenting a schema with zero constraints "to keep it simple" - constraints ARE the design, not decoration.
- Not asking a single clarifying question before writing DDL for an ambiguous prompt.
- Reciting definitions (ACID, normal forms) without ever connecting them to a concrete failure mode or a decision you'd actually make differently as a result.

### Harder senior follow-up Q&A (drill these until fluent)
1. **"Your database CPU is pinned at 100% and the app is timing out. Walk me through your first five minutes."** -> Check currently running queries (`pg_stat_activity` / `SHOW PROCESSLIST`) for anything obviously long-running or blocked; check for a recent deploy correlating with the spike; check if it's one hot query (look at query-level CPU/time stats) versus general load growth; if one query is the culprit, get its EXPLAIN plan immediately rather than guessing; if it's a lock pileup, identify the blocking transaction and decide whether to kill it. State this out loud as an ordered method, not a list of things you'd check in no particular order.
2. **"We need to migrate a 'status' column from a MySQL ENUM to something more flexible, on a live table with millions of rows and constant writes. How?"** -> Add a new column (e.g. a foreign key to a `statuses` lookup table, or a TEXT column with a CHECK constraint), dual-write both columns from the application for a transition period, backfill the new column from the old in batches, cut reads over to the new column, then drop the old column in a later, separate deploy once nothing references it - never a single blocking schema change on a hot table.
3. **"Design a rate-limiting or idempotency-key table for a payments API. What does the schema look like, and what's the tricky part?"** -> A table keyed by the idempotency key (unique constraint) storing the request hash, response payload, and status, with a short TTL/cleanup job. The tricky part is the race between two near-simultaneous requests with the same key: the insert of the key must be atomic (`INSERT ... ON CONFLICT DO NOTHING` / `INSERT ... ON DUPLICATE KEY`) so only one request actually processes the payment while the other waits for or reads the stored result, rather than both checking "does this key exist" and both proceeding.
4. **"How would you detect and fix N+1 queries you don't already know about, in an existing large codebase?"** -> Turn on query logging (or an APM tool) in staging under realistic traffic, look for the same near-identical query repeated many times in a short window, correlate it back to the code path (often a loop over a list calling a lazy relation), and fix with eager loading or batching - then add a regression guard (a test asserting query count for that endpoint) so it doesn't silently come back.
5. **"A teammate wants Serializable isolation everywhere 'to be safe.' How do you respond?"** -> Explain the throughput cost - Serializable transactions can fail with serialization errors under concurrent load and require application-level retry logic, so applying it globally trades a vague sense of safety for a concrete, measurable increase in contention and complexity. Ask what specific anomaly they're worried about, and show that a targeted fix (a lock, a conditional UPDATE, a unique constraint) usually solves the real problem more precisely and cheaply.
6. **"Explain, as if to a new hire, why we always pre-aggregate before joining a one-to-many relationship in a report query."** -> Give the concrete fan-out example: if an order has 3 line items, joining orders to line_items multiplies each order row by 3 before any aggregation happens, so a naive `SUM(orders.total)` after that join overcounts every order threefold. Pre-aggregating the many side (line items summed per order) in a CTE first, then joining that single summarized row per order, avoids the multiplication entirely.
7. **"You're given an ambiguous prompt: 'design a schema for a food delivery app.' What do you ask before writing any DDL?"** -> Clarify scope up front: are restaurants and menus multi-tenant (many restaurants, each with their own menu items)? Can an order span multiple restaurants or just one? Is delivery tracking (driver location history) in scope, or just order status? Is payment a separate concern or part of this schema? A senior candidate spends 60-90 seconds narrowing scope before touching a whiteboard, rather than guessing and re-deriving the schema mid-answer.

---
