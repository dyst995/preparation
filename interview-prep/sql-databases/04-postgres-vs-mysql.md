04 - Postgres vs MySQL (Practical Differences)

Goal: Answer "which database would you choose, and why" and "what differences have you run into between Postgres and MySQL" with concrete, practical answers grounded in your own projects (VetApp on MySQL, freelance work spanning both), plus know how these differences show up in TypeORM configuration.

Mark progress with [x] as you master each topic.

---

Learning objectives

By the end of this chapter you should be able to:

1. Explain the licensing/history context briefly (both open source, different governance) without getting lost in trivia.
2. Compare core data types side by side (auto-increment, JSON, arrays, enums, booleans).
3. Explain storage engine concepts: MySQL's pluggable engines (InnoDB) vs Postgres's single unified engine with extensions.
4. Compare case sensitivity, string comparison, and identifier quoting defaults.
5. Compare indexing and full-text search capabilities at a high level.
6. Explain replication/high-availability at an awareness level for both.
7. Explain how TypeORM configuration and decorators differ (or don't) between the two, and what "synchronize" and migrations mean in practice.
8. Give a reasoned, opinionated answer to "which would you pick for a new project" without being dogmatic.

---

## 1. Quick orientation

| | PostgreSQL | MySQL |
|---|---|---|
| Type | Object-relational database, single storage engine | Relational database with pluggable storage engines (InnoDB is the modern default) |
| License | PostgreSQL License (permissive, BSD/MIT-like) | GPL (with a commercial dual-license from Oracle) |
| Known for | Standards compliance, advanced data types, extensibility (extensions like PostGIS) | Simplicity, huge ecosystem/hosting availability, historically fast simple reads |
| Your CV context | General freelance stack listed alongside MySQL | VetApp: rebuilt PHP backend in NestJS while preserving compatibility with an **existing MySQL database** |

Neither is objectively "better" - the honest, senior answer is "it depends on the constraints," and you have a real example of exactly that: on VetApp you didn't choose MySQL, you inherited it, and the job was to work correctly within that constraint.

---

## 2. Data types: practical differences

### Auto-incrementing primary keys

```sql
-- Postgres (modern, preferred way)
CREATE TABLE pets (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  -- older style still seen: id SERIAL PRIMARY KEY
  name TEXT NOT NULL
);

-- MySQL
CREATE TABLE pets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL
);
```

### JSON support

```sql
-- Postgres: JSONB is binary, indexed, and queryable efficiently - the strong recommendation
CREATE TABLE appointments (
  id INT PRIMARY KEY,
  metadata JSONB
);
SELECT * FROM appointments WHERE metadata->>'source' = 'mobile_app';
CREATE INDEX idx_metadata_gin ON appointments USING GIN (metadata); -- fast containment queries

-- MySQL: JSON type exists (since 5.7), stored as a validated text-like format,
-- with generated/virtual columns needed to index into JSON fields efficiently
ALTER TABLE appointments ADD COLUMN metadata JSON;
SELECT * FROM appointments WHERE metadata->>'$.source' = 'mobile_app';
```

**Key talking point:** Postgres's JSONB with GIN indexes is generally considered more mature for "semi-structured data queried directly in SQL" than MySQL's JSON type, which usually needs generated columns to get comparable indexed query performance.

### Arrays

Postgres has native array types (`TEXT[]`, `INTEGER[]`) as first-class citizens. MySQL has no native array type - you'd typically model this as a JSON array column or a separate join table. This is a real, practical difference: modeling "a pet can have multiple tags/allergies" is a one-liner in Postgres (`allergies TEXT[]`) but needs a join table or JSON column in MySQL.

### ENUM

Both support ENUM-like behavior, but differently:
- **MySQL**: `ENUM('pending', 'completed', 'cancelled')` is a genuine column type, stored efficiently, validated at the column level.
- **Postgres**: has a real `CREATE TYPE ... AS ENUM (...)` construct too, but altering it (especially reordering/removing values) is more awkward than in MySQL; many Postgres teams prefer a plain `TEXT` column with a `CHECK` constraint or a foreign key to a lookup table for flexibility.

### Boolean

- **Postgres**: native `BOOLEAN` type (`TRUE`/`FALSE`).
- **MySQL**: no true native boolean - `BOOLEAN`/`BOOL` are aliases for `TINYINT(1)`, so `TRUE`/`FALSE` are really `1`/`0` under the hood. This occasionally surprises developers debugging unexpected type coercion.

### Model spoken answer

"The type systems diverge more than people expect. Postgres has real arrays, a mature JSONB type with GIN indexing, and a real boolean type. MySQL's JSON support is newer and generally needs generated columns for indexed queries, has no native array type, and its boolean is really just a TINYINT(1) alias. None of these are dealbreakers, but they do change how I'd model something like a pet's list of allergies - a native array column in Postgres versus a join table or JSON blob in MySQL."

---

## 3. Storage engines and transactions

- **MySQL** historically supported multiple storage engines (MyISAM, InnoDB, others); **InnoDB is the modern default** and is what gives MySQL ACID transactions, foreign keys, and row-level locking. It's worth knowing that MyISAM (the old default) did NOT support transactions or foreign keys at all - if you ever see MyISAM mentioned, flag that as a legacy/limited engine.
- **Postgres** has one unified storage/transaction engine (no engine choice to make) built around MVCC from the ground up, plus a rich extension system (PostGIS for geospatial, pg_trgm for fuzzy text search, TimescaleDB for time-series, etc.).

### Model spoken answer

"MySQL's transactional guarantees depend on using InnoDB - the modern default, but historically you could accidentally end up on MyISAM, which has no transactions or foreign keys at all, so checking the engine matters for legacy MySQL databases. Postgres doesn't have that engine-choice question; it has one engine with strong extensibility instead, which is part of why people reach for it when they need things like geospatial queries via PostGIS."

---

## 4. Case sensitivity and identifiers

- **MySQL**: identifier (table/column name) case sensitivity depends on the OS and a server variable (`lower_case_table_names`) - notoriously inconsistent between Linux (case-sensitive by default) and Windows/macOS (often case-insensitive), a real source of "works on my machine" bugs when a team develops on macOS and deploys on Linux.
- **Postgres**: unquoted identifiers are automatically folded to lowercase, and are case-insensitive as a result; quoted identifiers (`"MyTable"`) are case-sensitive and preserved exactly - a common gotcha for developers moving from a tool that auto-quotes identifiers.
- **String comparison collation**: MySQL's default collation (e.g. `utf8mb4_general_ci` or newer `utf8mb4_0900_ai_ci`) is case-insensitive by default for string comparisons (`'abc' = 'ABC'` can be true); Postgres string comparison is case-sensitive by default unless you use `ILIKE` or a case-insensitive collation.

### Model spoken answer

"One practical gotcha: MySQL's default collation makes string equality case-insensitive out of the box, so `'Vet' = 'vet'` can be true, while Postgres is case-sensitive by default and you'd need ILIKE or a citext/case-insensitive collation for the same behavior. I always check this explicitly when writing lookup queries like matching an email during login, especially if the codebase moved between the two."

---

## 5. LIMIT/OFFSET, string functions, and other small but real differences

| Feature | Postgres | MySQL |
|---|---|---|
| Limit/offset | `LIMIT n OFFSET m` (also standard `FETCH FIRST n ROWS ONLY`) | `LIMIT n OFFSET m` (also `LIMIT m, n` shorthand - reversed argument order, easy to misread) |
| String concatenation | `\|\|` operator (`'a' \|\| 'b'`) | `CONCAT('a', 'b')` function (`\|\|` means logical OR in MySQL by default unless PIPES_AS_CONCAT mode is set) |
| Auto-increment retrieval | `RETURNING id` clause on INSERT | `LAST_INSERT_ID()` function after INSERT |
| Upsert | `INSERT ... ON CONFLICT (...) DO UPDATE ...` | `INSERT ... ON DUPLICATE KEY UPDATE ...` |
| Full text search | Built-in `tsvector`/`tsquery` with GIN indexes, quite powerful | `FULLTEXT` indexes, functional but generally less flexible |
| Regex | `~`, `~*` operators plus standard functions | `REGEXP` / `RLIKE` |

The `INSERT ... RETURNING` clause is a genuinely nice Postgres feature worth mentioning: you can insert a row and get generated columns (like the new id, or a default timestamp) back in the same round trip, without a second `SELECT LAST_INSERT_ID()`-style call.

```sql
-- Postgres
INSERT INTO appointments (pet_id, vet_id, scheduled_at)
VALUES (1, 2, NOW())
RETURNING id, created_at;

-- MySQL equivalent requires two statements
INSERT INTO appointments (pet_id, vet_id, scheduled_at) VALUES (1, 2, NOW());
SELECT LAST_INSERT_ID();
```

---

## 6. Replication and scaling (awareness level - don't over-invest here)

- **Postgres**: streaming replication (physical, byte-level WAL shipping) for read replicas and HA; logical replication for more selective/table-level replication; extensions like Patroni for HA orchestration.
- **MySQL**: has long-standing binlog-based replication (statement-based, row-based, or mixed), widely supported by managed cloud offerings (RDS, Aurora, Cloud SQL, PlanetScale, etc.), historically very mature multi-region replication tooling due to its age and adoption at companies like Facebook/YouTube.

You don't need deep operational replication expertise for most interviews at your level - just be able to say "both support primary/replica replication for read scaling and HA; the ecosystem tooling differs, and managed cloud services abstract a lot of this away in practice."

---

## 7. TypeORM configuration and mapping notes

### Connecting to each

```typescript
// Postgres
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: 5432,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  synchronize: false, // NEVER true in production - see below
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
});

// MySQL - mostly identical shape, different `type` and default port
export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST,
  port: 3306,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  synchronize: false,
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
});
```

The entity/decorator layer (`@Entity()`, `@Column()`, `@ManyToOne()`, etc.) is almost entirely database-agnostic - this is the whole point of an ORM. The differences that leak through are mostly in **column type mapping** and **migration SQL**.

### Column type mapping gotchas

```typescript
@Entity()
class Appointment {
  @PrimaryGeneratedColumn() // maps to SERIAL/IDENTITY in Postgres, AUTO_INCREMENT in MySQL
  id: number;

  @Column({ type: 'jsonb', nullable: true }) // 'jsonb' is Postgres-only; use 'json' for MySQL portability
  metadata: Record<string, unknown>;

  @Column({ type: 'enum', enum: AppointmentStatus }) // generates a native ENUM type in both, but ALTER behavior differs
  status: AppointmentStatus;

  @Column({ type: 'timestamp' }) // Postgres 'timestamp' has no timezone by default; use 'timestamptz' for UTC-safety
  scheduledAt: Date;
}
```

**Practical, senior-sounding point:** if you write `type: 'jsonb'` on a column, that entity file is no longer portable to MySQL without changes - worth knowing if a codebase needs to support both, though in practice most real projects commit to one database and don't try to stay portable across both simultaneously.

### `synchronize: true` vs migrations

`synchronize: true` tells TypeORM to auto-generate and apply schema changes based on your entities every time the app starts. It's convenient for local development and prototyping, but is a well-known production anti-pattern:
- It can silently drop columns/data if an entity changes in a way TypeORM interprets as destructive.
- It gives you no reviewable, versioned history of schema changes.
- It's non-deterministic in a team setting - different developers' local schemas can drift.

The correct production approach is explicit **migrations**: generate a migration file describing the schema diff, review it like code, and run it explicitly as a deploy step.

```bash
# Generate a migration from entity changes (compares current schema to entities)
npx typeorm migration:generate ./src/migrations/AddStatusToAppointments -d ./src/data-source.ts

# Apply pending migrations
npx typeorm migration:run -d ./src/data-source.ts

# Roll back the last migration
npx typeorm migration:revert -d ./src/data-source.ts
```

This applies identically regardless of Postgres or MySQL - the workflow is the same, only the generated SQL dialect differs under the hood.

### Model spoken answer

"With TypeORM, the entity and decorator layer is mostly database-agnostic - `@Entity`, `@Column`, relations all look the same whichever database you point at. The differences leak in at the column-type level, like `jsonb` being Postgres-only, and at the SQL generated by migrations. On VetApp I was working against an existing MySQL schema, so I had to map TypeORM entities carefully onto tables and types that already existed rather than letting TypeORM define the schema - which is also exactly why I never use `synchronize: true` against a real database; I always use explicit, reviewed migrations."

---

## 8. "Which would you choose for a new project" - a good, non-dogmatic answer

There's no universally correct answer, and pretending there is one is itself a red flag. A strong answer sounds like:

> "For a greenfield project without a specific reason to do otherwise, I lean Postgres, mainly for JSONB, native arrays, stronger full-text search, and its extension ecosystem if there's any chance of needing geospatial or advanced querying later. But if the team already has deep MySQL operational expertise, or we're integrating with an existing MySQL system - like I did on VetApp, where I had to preserve compatibility with an existing production database - I'd stick with MySQL rather than introduce a second database technology for no strong reason. Constraints and existing infrastructure usually matter more than a slight technical edge either way."

This answer is strong because it: (1) has an actual opinion, (2) explains why, (3) shows you'd adapt to real constraints, and (4) ties to a real, verifiable project of yours.

---

## Interview question bank (with answer targets)

1. **Postgres vs MySQL - what are the practical differences you've run into?** -> see sections 2-5; lead with JSONB/arrays, case sensitivity, and RETURNING vs LAST_INSERT_ID as concrete, specific examples.
2. **What storage engine does MySQL use for transactions, and why does it matter?** -> InnoDB; MyISAM (legacy) had no transactions/FKs.
3. **How does Postgres implement MVCC vs how does MySQL/InnoDB?** -> both use MVCC concepts; Postgres tables are heaps with row versions, InnoDB clusters by primary key and uses undo logs for old versions.
4. **What's `synchronize: true` in TypeORM, and why avoid it in production?** -> auto-syncs schema to entities on startup; risks silent data loss, no reviewable history, team drift; use migrations instead.
5. **How do you generate and run a TypeORM migration?** -> `migration:generate` then `migration:run` against a configured DataSource.
6. **What's a practical case-sensitivity gotcha between the two databases?** -> MySQL's default collation is often case-insensitive for string comparisons; Postgres is case-sensitive by default.
7. **When would you specifically prefer Postgres's JSONB over a MySQL JSON column?** -> when you need indexed, queryable semi-structured data (GIN indexes on JSONB) without extra generated columns.
8. **You inherited an existing MySQL database on VetApp - what did that constrain, and how did you handle it?** -> personal story: schema archaeology, mapping TypeORM entities to existing tables/types, no `synchronize`, careful migrations for any additive changes, preserving compatibility with existing PHP-era data.

---

## Hands-on drills (do these)

- [ ] Write the same "insert and get the new id back" operation both ways (Postgres `RETURNING`, MySQL `LAST_INSERT_ID()`).
- [ ] Write a TypeORM entity column definition using `jsonb` and explain in one sentence why it isn't portable to MySQL as-is.
- [ ] Explain, without notes, why `synchronize: true` is dangerous in production.
- [ ] Describe your VetApp MySQL migration experience as a 60-second story: what you inherited, what constraint it created, and how you worked within it using NestJS + TypeORM.
- [ ] State one concrete reason you might pick Postgres and one concrete reason you might stick with MySQL, without hedging into "it depends" as your entire answer.

---

## Senior red flags / green flags

### Green flags
- Giving specific, technical differences (JSONB/GIN, case sensitivity, RETURNING) instead of "Postgres is more advanced."
- Knowing that MySQL's engine choice (InnoDB vs legacy MyISAM) actually matters for transactions.
- Having an actual, defensible preference while acknowledging constraints matter more.
- Tying the answer back to a real project (VetApp) instead of purely theoretical knowledge.

### Red flags
- "They're basically the same, doesn't matter."
- Not knowing what `synchronize: true` does or why it's risky.
- Claiming MySQL "doesn't support transactions" without qualifying that this only applies to legacy MyISAM, not InnoDB.
- Overclaiming deep replication/HA operational expertise you haven't actually practiced.

---

## Tie-backs to your experience

- VetApp: rebuilding a PHP backend in NestJS while preserving compatibility with an existing MySQL database is your strongest, most specific story for this entire chapter - use it whenever asked about real-world database work, not just theory.
- Freelance work explicitly lists both PostgreSQL and MySQL - you can honestly say you've worked with both, and can compare them from direct experience rather than just reading about it.
- Travel2Georgia's backend services and database design (architecture + database design mentioned explicitly in your CV) is a good second story if asked about greenfield schema design choices.

---

## Senior-Level Best Practices

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

## Mastery checklist

- [ ] I can list at least 4 concrete practical differences between Postgres and MySQL without hesitating.
- [ ] I know MySQL's default engine story (InnoDB vs legacy MyISAM) and why it matters.
- [ ] I can explain why `synchronize: true` is unsafe in production and what to use instead.
- [ ] I have a confident, non-dogmatic answer to "which would you choose."
- [ ] I can tell the VetApp MySQL story fluently in under a minute.
