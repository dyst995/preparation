# 13. Senior-Level Best Practices

> Source: `interview-prep/sql-databases/04-postgres-vs-mysql.md`

### Rapid-fire scenario responses (say these in one breath)
- "New greenfield service, no constraints, might need geospatial later." -> Lean Postgres for PostGIS and JSONB headroom.
- "Existing MySQL production database, team knows it well." -> Stay on MySQL; migration cost/risk outweighs a marginal feature edge.
- "A junior dev left `synchronize: true` on in the staging TypeORM config." -> Flag it immediately in review; staging schema drift from entities is exactly how "works on staging, breaks in prod" bugs happen.
- "An entity needs a `jsonb` column but the team might move to MySQL later." -> Either accept the lock-in explicitly and document it, or model it as `json`/a normalized table if true portability matters.
- "A migration needs to add a NOT NULL column to a huge, high-traffic table." -> Nullable column first, backfill in batches, NOT NULL constraint last, never all three in one migration.

### Decision framework: choosing (or migrating) a database for a real project
- Inherited/existing database (like VetApp's MySQL) -> don't migrate without a very strong, quantified reason; the cost and risk of a database migration is almost always higher than living with a "good enough" existing choice.
- Greenfield, no strong constraint -> lean Postgres for JSONB/arrays/extensibility, but explicitly weigh team familiarity and hosting/ops maturity - "the team already knows MySQL operationally" is a legitimate, senior-sounding reason to stay, not a cop-out.
- Heavy geospatial, full-text, or semi-structured querying needs -> Postgres's extension ecosystem (PostGIS, native JSONB+GIN) is a real, concrete differentiator, not just a preference.
- Cost-sensitive managed hosting at massive read scale -> check what your cloud provider's managed offering actually optimizes for (e.g. Aurora's MySQL/Postgres-compatible engines have different scaling characteristics) rather than assuming the open-source engine's raw feature set is the deciding factor.
- Team is small and will stay small -> operational simplicity (fewer moving parts to patch/monitor/back up) can outweigh a marginal feature advantage either engine offers on paper.

### Migration safety checklist (schema changes against a live database)
- [ ] Every migration is additive-first when possible: add a new nullable column, backfill in a background job, THEN add the NOT NULL/constraint in a later migration - never do all three in one blocking migration on a large table.
- [ ] Destructive changes (dropping a column/table) happen only after the application code no longer references it AND has been deployed and stable for a safety window - never in the same deploy that removes the code reference.
- [ ] Long-running migrations (backfills, large ALTERs) are tested against a production-sized clone for actual duration and lock behavior before running against production.
- [ ] Every migration has a tested, working `down`/revert path - "we'll figure out rollback if it breaks" is not a plan.
- [ ] Renaming a column/table is done as add-new + dual-write + backfill + cut-over + remove-old, not a single blocking `RENAME`, for anything with meaningful traffic.
- [ ] `synchronize: true` (TypeORM) or any framework's "auto-sync schema" equivalent is disabled in every environment that touches real data, including staging, not just production.
- [ ] Migration files are reviewed by someone other than the author for anything touching a table above an agreed size/traffic threshold.
- [ ] A staging environment's schema is kept in sync with production via the same migration history, not manually patched to "just match" periodically.

### TypeORM-specific pitfalls to watch for in review
| Pitfall | Why it bites | Fix |
|---|---|---|
| `synchronize: true` left on in staging | Silent destructive auto-migrations, "works on staging, breaks on prod" schema drift | Always explicit migrations, every environment |
| `jsonb` column type on an entity meant to be portable | Breaks silently if ever pointed at MySQL | Document the DB dependency explicitly, or use `json` if portability matters |
| Lazy relations accessed in a loop | N+1 queries that don't show up until real data volume | Eager load via `relations`/`leftJoinAndSelect`, or batch |
| Auto-generated migration blindly committed without reading the SQL | Generated migration can include unintended drops/renames when entity refactors are ambiguous to the diff tool | Always read the generated SQL diff before committing a migration |
| `@Column({ type: 'timestamp' })` used for UTC-sensitive data on Postgres | Postgres's plain `timestamp` has no timezone; silent local-time bugs | Use `timestamptz` explicitly when UTC-correctness matters |

### Anti-patterns and failure modes
- Running `migration:generate` against a database that already has manual, undocumented schema drift - the diff tool will "fix" real production reality in ways nobody asked for.
- Treating a migration as done once it runs successfully in CI against an empty test database - CI success says nothing about lock duration or behavior against real production data volume.
- Two services/teams both auto-generating migrations against the same shared database without coordination, producing conflicting or duplicate schema changes.
- Assuming a MySQL `ALTER TABLE` is always instant like adding a nullable Postgres column can be - many MySQL ALTERs still rewrite the whole table depending on version/storage engine/operation, and need the same "test against a realistic clone" discipline.

### Worked scenario: safely renaming a column TypeORM entities reference in production
1. **Add the new column** alongside the old one via a migration (e.g. `customer_email` alongside the legacy `email`), both present and both populated.
2. **Dual-write from the application** - update both columns on every write for a transition period, so neither one goes stale.
3. **Backfill historical rows** in batches from the old column into the new one, throttled to avoid saturating the database during business hours.
4. **Cut reads over to the new column** in application code, deployed and verified stable.
5. **Drop the old column** in a final, separate migration once nothing references it - never combine this with the earlier steps in one deploy.
6. **Never rename the TypeORM entity property and column in one step** for a live table - that's exactly the pattern that produces an unintended drop+add in an auto-generated migration.

### Common production incidents mapped to root cause
| Symptom | Likely root cause | First check |
|---|---|---|
| "Works on my machine" schema mismatch | `synchronize: true` left on in a dev/staging environment | Confirm every environment uses explicit migrations only |
| Migration locks a table for minutes | A blocking ALTER on a large table run directly, no batching | Test the exact migration against a production-sized clone first |
| Auto-generated migration drops a column unexpectedly | Diff tool misread a rename as drop+add | Always read the generated SQL before committing |
| Case-sensitive login lookup fails after a MySQL-to-Postgres move | Postgres string comparison is case-sensitive by default | Use ILIKE or a case-insensitive collation explicitly |
| Timestamp off by several hours after a Postgres migration | Plain `timestamp` used instead of `timestamptz` | Audit all UTC-sensitive columns for the correct type |

### Observability and team practices
- Track migration duration in CI/CD logs over time - a migration that took 2 seconds against last month's data volume might take 2 minutes against this month's; watch the trend, not just pass/fail.
- Require a second reviewer specifically for any migration touching a table above a size/traffic threshold you define as a team (e.g. "any migration touching `orders` or `payments` needs a second approval").
- Keep a runbook for "a migration is stuck/locking production" - know how to safely cancel it (and what state that leaves things in) before you need it at 2am.
- Practice migrations against an anonymized production-sized snapshot in staging as a standing habit, not a one-off when something once went wrong.

### Senior follow-up Q&A
1. **You need to add a NOT NULL column to a 50-million-row `orders` table with zero downtime. Walk me through it.** -> Add the column as nullable first (fast, metadata-only in most engines for a nullable column with no default, or check if a default triggers a rewrite). Backfill the value in batches via a background job to avoid one giant blocking UPDATE. Once backfilled, add the NOT NULL constraint (and any CHECK) in a follow-up migration - in Postgres, adding a NOT NULL constraint can be done more cheaply using a `NOT VALID` CHECK constraint validated separately, avoiding a full table lock for validation.
2. **Someone auto-generates a TypeORM migration and it includes a column drop no one intended. What happened, and how do you catch this before it merges?** -> The diff tool compared entities to the database and interpreted a rename or type change as a drop+add because it couldn't recognize the rename intent. Catch it by always reading the generated migration's actual SQL before committing - never trust the generator blindly - and consider hand-writing the migration for anything involving a rename.
3. **What's your rollback plan if a migration partially succeeds against production?** -> Migrations should be wrapped in a transaction where the database supports transactional DDL (Postgres does for most operations; MySQL's DDL is often non-transactional and can partially apply) - know your engine's guarantees specifically. Always have a tested `down` migration, and for anything non-transactional/risky, have a documented manual recovery runbook, not an assumption that "it'll roll back cleanly."
4. **Why is `synchronize: true` particularly dangerous in a team setting even outside of production?** -> Different developers' local schemas can silently drift from each other and from what migrations would actually produce, so a bug that "only happens on my machine" can be a schema drift issue rather than a code issue, and nobody has a reviewable record of what changed or why.
5. **When would you actually justify migrating an existing MySQL database to Postgres (or vice versa), given the cost?** -> Only with a concrete, quantified driver - e.g. a hard requirement for advanced geospatial querying, a specific JSONB-dependent feature that's core to the roadmap, or a managed-hosting cost/reliability problem that's actually been measured, not "Postgres is nicer." I'd also want a real migration plan (dual-write period, data validation, rollback plan) before ever proposing it, since the switching cost and risk window are substantial.
6. **How do you handle a TypeORM entity change that needs to rename a column on a live, high-traffic table?** -> Never a direct rename in one migration. Add the new column, dual-write from the app, backfill in batches, cut reads over, then drop the old column in a later deploy - the same add/dual-write/backfill/cutover/remove pattern used for any live schema change, applied specifically because a straight `RENAME COLUMN` combined with an entity change is exactly what produces surprise drops in auto-generated migrations.

---
