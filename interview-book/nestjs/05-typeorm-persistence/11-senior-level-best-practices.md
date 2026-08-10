# 11. Senior-Level Best Practices

> Source: `interview-prep/nestjs/05-typeorm-persistence.md`

### Decision framework: preventing N+1 before it happens, not just fixing it after

N+1 is usually diagnosed reactively (a slow endpoint gets profiled). The senior move is designing to prevent it structurally:

1. **Default every list-returning query to load exactly the relations its known consumers need, explicitly, at the point of the query** - not eagerly on the entity, not lazily discovered by whatever the template/serializer happens to touch. If a new consumer needs an additional relation, that's a new, explicit `relations`/join addition to that specific query, not a reason to make the relation eager globally.
2. **Ban (via code review convention, and ideally a lint rule) accessing a relation property inside a loop without having explicitly verified it was eagerly loaded for that query.** This single habit prevents the vast majority of N+1 bugs before they ship, because the bug is almost always "someone looped over a list and touched `.relation.field`" without checking whether that relation was joined.
3. **Turn on query logging in every non-production environment by default**, not just when actively debugging - a query count that scales with row count is far easier to notice during normal development/QA than to diagnose after a production complaint.
4. **Write a lightweight integration test convention**: for any new list endpoint with relations, assert the query count stays constant as the seeded row count increases (e.g., assert exactly N queries against both a 5-row and a 50-row seed) - this turns N+1 from a manual-review concern into an automatically-enforced one.

### N+1 beyond the basic loop example

- **N+1 through a serializer/DTO mapper, not just a raw loop.** `class-transformer` or a manual `toDto()` mapping function that accesses `entity.relation.field` for every item in a list has exactly the same effect as an explicit `for` loop - it's just less visually obvious in a code review. Audit response-shaping code the same way you'd audit business logic for this.
- **N+1 hiding behind a "count" query.** Fetching a list, then separately looping to call `.countRelatedThing()` per item (e.g., "number of appointments per vet" computed by looping vets and querying appointments per vet) is N+1 in a different shape - the fix is a single query with `GROUP BY` and a `COUNT`, not N separate count queries.
- **N+1 that only appears at a specific data shape.** A query might look fine with a small, flat dataset in dev but explode once a relation is itself a collection with its own nested relations (appointments -> vet -> clinic -> address) three levels deep - each additional nesting level that isn't explicitly joined multiplies the problem. Test against realistic, nested seed data, not just flat single-relation fixtures.
- **The GraphQL-adjacent DataLoader pattern is worth knowing even in a REST context** - batching and caching lookups by key within a single request lifecycle is a generally useful pattern anytime you can't avoid per-item lookups structurally (e.g., calling an external, non-joinable service per item) and want to at least batch/dedupe them instead of firing one call per item serially.

### Migration workflow at production scale

- **Large-table schema changes need staged rollout, not a single blocking migration.** Adding a `NOT NULL` column with no default to a multi-million-row table can lock the table or fail outright depending on engine/version - the safe pattern is: add nullable, backfill in batches (off-peak, rate-limited to avoid replication lag/lock contention), verify completeness, then add the `NOT NULL` constraint in a follow-up migration once backfill is confirmed done.
- **Migrations run as an explicit deploy step, never as app-boot-time auto-sync**, and ideally run *before* the new application code that depends on the new schema is live - so there's never a window where new code is running against an old schema. For a rollback-safe sequence: migrate forward (additive only) -> deploy new code -> only after it's proven -> a later migration removes anything now-unused.
- **Every migration's `down()` should actually be tested, not just written to satisfy the interface.** A `down()` that doesn't actually work is discovered exactly when you need it most - mid-incident, trying to roll back a bad migration - which is the worst possible time to find out.
- **Data migrations (backfills) are operationally different from schema migrations** and deserve separate tooling/discipline: batch size limits, progress logging, resumability if interrupted, and ideally a dry-run mode - a naive single-query `UPDATE` across millions of rows can itself cause the incident it was meant to avoid (long lock, replication lag, connection pool exhaustion).
- **For a legacy-schema-constrained rewrite (VetApp-style), migrations for genuinely new changes should be reviewed with extra scrutiny for whether they could break the still-running legacy system**, if any cutover is incremental rather than a clean break - a column the legacy PHP code silently depends on being nullable, for instance.

### Anti-patterns and failure modes

| Anti-pattern | Why it hurts | Fix |
|---|---|---|
| `eager: true` on a relation "for convenience" | Joined on every query against that entity forever, even ones that don't need it | Explicit `relations`/`leftJoinAndSelect` per query that actually needs it |
| Looping and calling a per-item count/lookup query | Query count scales linearly with row count | Single aggregate query (`GROUP BY`/`COUNT`) or a JOIN |
| `synchronize: true` left on in staging/production | Unreviewed automatic schema changes, no rollback plan | `synchronize: false` outside local prototyping; explicit migrations everywhere else |
| Adding `NOT NULL` with no default to a huge table in one migration | Long lock or outright failure at deploy time | Nullable first, batched backfill, `NOT NULL` in a follow-up migration |
| External API call (payment gateway) inside a long-held DB transaction | Holds locks/connections for the duration of a slow network call; can't be rolled back by the DB anyway | Call external services outside/around the transaction; reconcile inconsistency asynchronously |
| Untested `down()` migrations | Rollback fails exactly when you need it most, mid-incident | Test both `up()` and `down()` in CI or a staging run before merging |
| No query count tests on list endpoints with relations | N+1 regressions ship silently until they're slow enough to notice in production | Assert constant query count regardless of seeded row count in integration tests |

### Observability for persistence

- **Slow query logging** (both DB-native slow query logs and ORM-level logging above a threshold) as a standing production concern, not something turned on only when already investigating a specific complaint.
- **Query count per request as a tracked metric**, not just query duration - a request making 200 fast queries can still be slower and more DB-load-intensive than one making 3 slower queries, and duration-only monitoring can miss this entirely.
- **Connection pool utilization** - a pool that's frequently near its max size under normal load is an early warning of either genuine growth outpacing capacity, or a leak (connections not being released, often from an unhandled error path skipping cleanup).
- **Migration run logs kept and reviewable** - which migration ran when, how long it took, whether it succeeded - so "did migration X actually run in production" has a definitive answer during an incident instead of guesswork.
- **Deadlock/lock-wait-timeout rates** as a tracked metric, since a rising trend often precedes a full incident and is a signal to revisit transaction scope/lock ordering before it gets worse under higher load.

### Team/scalability practices

- Establish a team convention for who reviews migrations that touch large/critical tables (a second, more DB-focused reviewer) separate from general code review - schema mistakes are expensive and hard to reverse compared to application code mistakes.
- Keep a runbook for "how do we backfill a large table safely" (batch size defaults, off-peak scheduling, monitoring during the run) so this isn't reinvented under pressure each time it's needed.
- As the team and dataset grow, revisit whether `find()`-options-based queries that were fine at a small data volume still perform acceptably - a query pattern that was invisible at 10k rows can become the slowest endpoint in the app at 10M rows without any code change, purely from data growth; periodic query-performance review (not just reactive firefighting) catches this earlier.

### Harder senior follow-up Q&A

**Q: A list endpoint with relations passes your N+1 query-count test in CI, but a production incident shows it making hundreds of queries under real traffic. What's the gap?**
> "The query-count test almost certainly only covers the happy-path relation depth I explicitly seeded - if production data has a deeper or wider relation shape than the test fixture (more nested relations, a one-to-many that's much larger in production, a conditional code path that touches a different, untested relation), the test wouldn't catch it. I'd extend the test to cover the actual production data shape more faithfully, and also add query-count monitoring in production itself (not just CI) as a second line of defense, since tests can only cover shapes someone thought to write a fixture for."

**Q: You need to backfill a new `status` column for 5 million existing rows without causing a production incident. Walk through your actual plan.**
> "I'd add the column as nullable with no default first, in its own quick migration - that's a fast, low-risk schema change. Then I'd write a separate backfill script (not a blocking migration) that processes rows in batches - say, 5,000 at a time - with a short pause between batches to avoid sustained lock/replication pressure, logging progress so it's resumable if interrupted, and ideally running during a lower-traffic window. Only after confirming the backfill is 100% complete (a count query verifying no NULLs remain) would I ship a follow-up migration adding the `NOT NULL` constraint - and I'd test that migration's `down()` too, even though rolling back a completed backfill+constraint is rarely simple, so at minimum I know exactly what rolling back would and wouldn't undo."

**Q: How do you decide between fixing an N+1 with eager-loaded relations on that one query versus restructuring the data access pattern entirely (e.g., a dedicated read-optimized view or a denormalized field)?**
> "If the fix is a straightforward join that returns a reasonable, bounded payload size, explicit `relations`/`leftJoinAndSelect` on that specific query is the right first move - it's simple, and it doesn't add a maintenance burden like a materialized view or a denormalized column that now needs to stay in sync with the source data. I'd escalate to something heavier - a database view, a denormalized/cached count column updated via triggers or application logic, a read replica for reporting-style queries - only once the join itself becomes the bottleneck (e.g., large fan-out joins on a hot path at high traffic), because those approaches add real complexity and a new class of staleness/consistency bugs that a straightforward join doesn't have."

**Q: Your `DataSource.transaction()` wrapper is used for a multi-step write, but one of the steps calls another service method that itself opens its own separate transaction. What's wrong here, and what would you check?**
> "That's a classic nested-transaction footgun - depending on the driver/ORM behavior, a 'nested' transaction might silently be a no-op (the inner call just participates in the outer transaction, which is often fine but easy to get wrong) or, worse, some setups treat it as a genuinely separate transaction/connection, meaning the inner write can commit independently of the outer transaction's eventual commit or rollback - defeating the atomicity you thought you had. I'd check whether the called service method accepts an optional `EntityManager`/`QueryRunner` parameter so it can participate in an already-open transaction when one is passed in, rather than always starting its own - a pattern worth establishing as a convention for any service method that might be called both standalone and as part of a larger transactional flow."

**Q: MySQL's default isolation level is REPEATABLE READ, Postgres's is READ COMMITTED - concretely, what bug could this difference cause if code is moved between them without review?**
> "A transaction that reads a row, does some other work, then reads the same row again expecting to possibly see a concurrent update from another transaction would behave differently: under REPEATABLE READ (MySQL default), it would see the same snapshot both times within that transaction (a concurrent committed change from elsewhere wouldn't be visible until the transaction ends), while under READ COMMITTED (Postgres default) it could see the updated value on the second read if another transaction committed in between. Code that implicitly relies on 'my transaction sees a stable snapshot throughout' - a common assumption when writing MySQL-first code - can behave subtly differently on Postgres unless isolation level is set explicitly or the logic is written to not depend on that assumption at all."

**Q: How do you decide whether a uniqueness rule (e.g., 'a vet can't have two appointments at the same time') should be a DB-level unique constraint, an application-level check, or both?**
> "Both, for different reasons. The application-level check gives a fast, friendly error before hitting the database, and can express more nuanced logic than a simple unique constraint (e.g., checking a time *range* overlap, not just an exact match). The DB-level constraint is the actual guarantee under concurrency - two simultaneous requests can both pass the application-level check before either commits, and only a DB-level constraint (or explicit row locking) closes that race reliably. I treat the application check as UX, and the DB constraint as the real correctness guarantee."

**Q: A senior colleague suggests replacing a slow `QueryBuilder` query with a raw SQL fragment for a specific report endpoint. When is that a reasonable call, and what do you watch for?**
> "Reasonable when the ORM's declarative layer genuinely can't express something efficiently - a vendor-specific function, a complex window function, or a query plan the ORM generates poorly for a particular engine. What I'd watch for: raw SQL loses some of TypeORM's portability and type safety, so I'd keep it isolated in one clearly-named repository method (not scattered inline), parameterize it properly against SQL injection exactly like any other query, and add a comment explaining *why* it's raw SQL so a future engineer doesn't 'clean it up' back into a slow QueryBuilder version without understanding the tradeoff."

---
