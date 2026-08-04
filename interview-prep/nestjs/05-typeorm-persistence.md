# 05 - TypeORM & Persistence: Entities, Relations, Migrations, N+1, Transactions

> Goal: model a real domain (appointments, vets, owners, payments) correctly with TypeORM, avoid the classic N+1 trap, run transactions safely, and speak credibly about MySQL vs PostgreSQL trade-offs from real project exposure.

Mark progress with `[x]` as you master each topic.

---

## Learning objectives

By the end of this section you should be able to:

1. Model entities and relations correctly, including eager/lazy trade-offs.
2. Use the repository pattern and `QueryBuilder` appropriately, and know when to reach for each.
3. Explain the migration workflow and why `synchronize: true` is dangerous in production.
4. Detect and fix the N+1 query problem with concrete before/after examples.
5. Implement transactions correctly, including isolation-level awareness.
6. Speak to MySQL vs PostgreSQL differences you actually hit (VetApp = MySQL legacy, freelance work spans both).

---

## 1. Entities & decorators

### Topics to learn
- [ ] `@Entity()`, `@PrimaryGeneratedColumn()`, `@Column()` with type/length/nullable options
- [ ] `@CreateDateColumn`, `@UpdateDateColumn`, `@DeleteDateColumn` (soft deletes)
- [ ] Relations: `@OneToMany`, `@ManyToOne`, `@ManyToMany` (+ join table), `@OneToOne` (+ `@JoinColumn`)
- [ ] Eager vs lazy relations - and why eager is usually a footgun at scale
- [ ] Enums as columns (`type: 'enum'`) - MySQL vs Postgres representation differences
- [ ] Indexes (`@Index()`) and unique constraints (`@Unique()`, `unique: true` on column)

### VetApp-style entities

```typescript
@Entity('vets')
export class Vet {
  @PrimaryGeneratedColumn() id: number;

  @Column() name: string;

  @Column({ unique: true }) email: string;

  @OneToMany(() => Appointment, (appointment) => appointment.vet)
  appointments: Appointment[];

  @CreateDateColumn() createdAt: Date;
}

@Entity('appointments')
export class Appointment {
  @PrimaryGeneratedColumn() id: number;

  @ManyToOne(() => Vet, (vet) => vet.appointments, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'vet_id' })
  vet: Vet;

  @ManyToOne(() => Owner, (owner) => owner.appointments)
  @JoinColumn({ name: 'owner_id' })
  owner: Owner;

  @Column({ type: 'enum', enum: AppointmentStatus, default: AppointmentStatus.PENDING })
  status: AppointmentStatus;

  @Column({ type: 'datetime' }) // 'timestamptz' on Postgres
  scheduledAt: Date;

  @OneToMany(() => VetRecord, (record) => record.appointment)
  records: VetRecord[];

  @DeleteDateColumn() deletedAt?: Date; // soft delete
}
```

### Eager vs lazy

```typescript
@ManyToOne(() => Vet, { eager: true }) vet: Vet; // always joined, every query
```

**Eager relations are convenient but dangerous by default** - they get pulled in on *every* query against that entity, even ones that don't need the relation, silently adding joins and payload everywhere. Prefer explicit loading (`relations: [...]` or `QueryBuilder` joins) so each query loads exactly what it needs; reserve `eager: true` for genuinely always-needed, cheap relations.

### Interview questions

**Q: When would you use `eager: true` vs explicit `relations` on a query?**
> "Almost always explicit. `eager: true` means that relation gets joined on *every* find, including places that don't need it, which silently grows query cost as the app evolves. I only use it for a relation that's genuinely needed everywhere and cheap to join - and even then I'd rather be explicit and let each query author decide what it actually needs."

**Q: How do soft deletes work in TypeORM and why use them?**
> "`@DeleteDateColumn()` marks a column TypeORM uses for `softRemove()`/`softDelete()` - instead of a real `DELETE`, it sets that timestamp, and default `find()` queries automatically exclude soft-deleted rows. It's useful for VetApp-style records where you legally/operationally can't lose veterinary history or payment records even if a client 'deletes' them from their view - you keep an audit trail and can restore if needed."

---

## 2. Repository pattern & QueryBuilder

### Topics to learn
- [ ] `@InjectRepository(Entity)` and the standard `Repository<T>` API (`find`, `findOne`, `save`, `create`, `delete`, `softDelete`)
- [ ] Custom repositories (extending base repository logic for domain-specific queries)
- [ ] `find()` options (`where`, `relations`, `order`, `take`/`skip`) vs `QueryBuilder` - when each is appropriate
- [ ] `QueryBuilder` for complex joins, conditional filters, aggregations, raw SQL fallback when needed
- [ ] `save()` vs `insert()`/`update()` - `save` does an upsert-like check (extra query) vs `insert`/`update` being more direct

### `find()` options vs QueryBuilder

```typescript
// Simple - find() options are enough
const appointments = await this.repo.find({
  where: { status: AppointmentStatus.CONFIRMED },
  relations: { vet: true, owner: true },
  order: { scheduledAt: 'ASC' },
  take: 20,
  skip: 0,
});

// Complex - QueryBuilder gives full control
const results = await this.repo
  .createQueryBuilder('appointment')
  .leftJoinAndSelect('appointment.vet', 'vet')
  .leftJoinAndSelect('appointment.owner', 'owner')
  .where('appointment.status = :status', { status: 'confirmed' })
  .andWhere('vet.clinicId = :clinicId', { clinicId })
  .andWhere(new Brackets((qb) => {
    qb.where('owner.name LIKE :search', { search: `%${search}%` })
      .orWhere('owner.phone LIKE :search', { search: `%${search}%` });
  }))
  .orderBy('appointment.scheduledAt', 'ASC')
  .take(20)
  .getMany();
```

**Rule of thumb:** reach for `find()` options while they're readable; switch to `QueryBuilder` once you need dynamic conditions, complex joins, aggregations (`COUNT`, `GROUP BY`), or raw SQL fragments the declarative API can't express cleanly.

### `save()` vs `insert()`

`save()` checks whether the entity has a primary key already set to decide insert vs update, runs lifecycle hooks/cascades, and can be slightly slower due to that extra logic. `insert()`/`update()` are more direct/performant for bulk or simple operations where you don't need cascades or entity-level hooks.

### Interview question

**Q: When do you drop down to `QueryBuilder` instead of the repository's `find()`?**
> "Once I need dynamic filtering built from multiple optional query params, joins with conditions beyond a simple relation load, aggregate functions, or raw SQL for something the ORM's declarative layer doesn't express well - like a full-text search fallback or a vendor-specific function. For straightforward CRUD with static shape, `find()` options are more readable and I don't reach for `QueryBuilder` prematurely."

---

## 3. Migrations

### Topics to learn
- [ ] Why `synchronize: true` must never be used in production
- [ ] Migration generation (`typeorm migration:generate`) vs hand-written migrations
- [ ] `up()`/`down()` methods, running and reverting
- [ ] Migration workflow in CI/CD (run migrations as a deploy step, not app-boot-time auto-sync)
- [ ] Reviewing generated migrations before committing (generated SQL isn't always exactly what you want)
- [ ] Data migrations vs schema migrations (backfilling data safely, in batches for large tables)

### Why `synchronize: true` is a production landmine

`synchronize: true` makes TypeORM compare your entities to the live schema and auto-apply changes on every boot. It's convenient in early local dev, but in production it can:
- Drop/alter columns unexpectedly based on entity changes, with **no review step**.
- Run at application startup, meaning a bad entity change breaks the schema the instant a new pod boots - no rollback plan, no down migration.
- Behave differently across environments if entities drift from what's actually deployed.

**Always:** `synchronize: false` in any shared/staging/production environment, with explicit, reviewed, version-controlled migrations instead.

### Migration example

```typescript
export class AddStatusToAppointments1699999999999 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE appointments
      ADD COLUMN status ENUM('pending','confirmed','completed','cancelled') NOT NULL DEFAULT 'pending'
    `);
    await queryRunner.query(`CREATE INDEX idx_appointments_status ON appointments (status)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX idx_appointments_status ON appointments`);
    await queryRunner.query(`ALTER TABLE appointments DROP COLUMN status`);
  }
}
```

### VetApp-specific migration reality

On VetApp, migrations weren't a greenfield exercise - the schema already existed from the PHP application. The practical workflow was:
1. Introduce entities that **map onto the existing MySQL schema exactly** (column names, types, nullability) rather than letting TypeORM dictate schema.
2. For any *new* NestJS-driven changes, write explicit migrations rather than `synchronize`, so schema evolution stayed reviewable and reversible.
3. Treat the legacy schema's quirks (naming conventions, nullable columns that "shouldn't" be nullable, `datetime` vs proper foreign keys) as constraints to respect, not things to "fix" silently - a schema change could break the parts of the PHP app not yet migrated, if any cutover was incremental.

### Interview questions

**Q: Why is `synchronize: true` dangerous in production?**
> "It applies schema changes automatically at boot based on entity diffs, with no review, no down migration, and no controlled rollout - a bad or unintended entity change can alter or drop production columns the moment a new instance starts. I always disable it outside of quick local prototyping and use explicit, version-controlled migrations with `up`/`down` for anything shared."

**Q: How did you handle schema compatibility rewriting VetApp's backend while keeping the existing MySQL database?**
> "I modeled entities to match the existing schema exactly - column names, types, constraints - rather than redesigning the schema to be 'ORM-idiomatic,' because the goal was zero-downtime compatibility, not a data migration project. Any new schema needs introduced during the rewrite went through explicit, reviewed migrations, never `synchronize`, since the existing data and (during transition) potentially still-running legacy code both depended on that schema staying predictable."

---

## 4. The N+1 problem

### Topics to learn
- [ ] What N+1 actually is: 1 query for a list + N queries for each item's relation
- [ ] How lazy-loaded/unloaded relations trigger it (especially if code loops and accesses a relation per item)
- [ ] Fixing it with eager joins (`relations` option or `leftJoinAndSelect`) in a single query
- [ ] `DataLoader`-style batching as an alternative pattern (more common in GraphQL, but useful concept)
- [ ] Detecting it: query logging (`logging: true`), APM tools, or just counting queries in a test

### The bug, concretely

```typescript
// BAD: N+1 - one query for appointments, then one more query PER appointment for its vet
const appointments = await this.repo.find(); // 1 query
for (const appt of appointments) {
  console.log(appt.vet.name); // triggers a lazy load per iteration -> N queries
}
```

```typescript
// GOOD: single query with a join
const appointments = await this.repo.find({ relations: { vet: true } });
// or
const appointments = await this.repo
  .createQueryBuilder('appointment')
  .leftJoinAndSelect('appointment.vet', 'vet')
  .getMany();
```

### Detecting it

```typescript
TypeOrmModule.forRoot({ ..., logging: ['query'] }); // watch query count in dev logs
```

In practice: if a list endpoint's query count scales linearly with the number of returned rows, that's the smoking gun.

### Interview questions

**Q: How would you detect an N+1 problem in a NestJS + TypeORM app you didn't write?**
> "Turn on query logging in a non-prod environment and hit a list endpoint that touches relations - if the number of queries scales with the number of returned rows instead of staying constant, that's N+1. An APM tool or just counting queries in an integration test against a seeded dataset of, say, 50 rows works too - constant query count regardless of row count is the target."

**Q: Fix this: a list of 100 appointments each lazily accessing `.vet.name` in a loop.**
> "Load the relation eagerly for that specific query - either `relations: { vet: true }` on `find()`, or `leftJoinAndSelect('appointment.vet', 'vet')` with QueryBuilder - turning it into a single query with a join instead of 1+N round trips. I wouldn't reach for `eager: true` on the entity itself, since that would force the join on every query against `Appointment`, not just this one."

---

## 5. Transactions

### Topics to learn
- [ ] ACID basics (brief) and why some multi-step writes must be atomic
- [ ] `QueryRunner` manual transaction pattern (`startTransaction`, `commitTransaction`, `rollbackTransaction`, `release`)
- [ ] `DataSource.transaction(async (manager) => {...})` convenience wrapper
- [ ] Isolation levels (READ COMMITTED, REPEATABLE READ, SERIALIZABLE) - high-level awareness, MySQL default (REPEATABLE READ) vs Postgres default (READ COMMITTED)
- [ ] Deadlocks: causes (inconsistent lock ordering) and mitigation (consistent ordering, retries, shorter transactions)
- [ ] VetApp example: appointment creation + payment authorization must succeed or fail together

### Manual transaction with `QueryRunner`

```typescript
async createAppointmentWithPayment(dto: CreateAppointmentDto): Promise<Appointment> {
  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const appointment = await queryRunner.manager.save(Appointment, {
      vetId: dto.vetId,
      ownerId: dto.ownerId,
      scheduledAt: dto.scheduledAt,
      status: AppointmentStatus.PENDING,
    });

    const payment = await this.paymentGateway.authorize(dto.amount); // external call - see note below
    await queryRunner.manager.save(Payment, {
      appointmentId: appointment.id,
      amount: dto.amount,
      externalRef: payment.id,
      status: 'authorized',
    });

    await queryRunner.commitTransaction();
    return appointment;
  } catch (err) {
    await queryRunner.rollbackTransaction();
    throw err;
  } finally {
    await queryRunner.release();
  }
}
```

**Important nuance interviewers love to probe:** calling an *external* payment gateway (like Bank of Georgia's API) **inside** a DB transaction is a real trade-off - it holds DB locks/connections open for the duration of a network call, which can hurt throughput and risks leaving a transaction open if the external call hangs. A more robust pattern for VetApp-style flows: authorize payment *before* opening the DB transaction (or immediately after, outside it), persist the result, and reconcile any inconsistency (e.g. payment succeeded but DB write failed) via an idempotent background job or webhook rather than relying purely on the DB transaction to cover an external system.

### `DataSource.transaction()` convenience wrapper

```typescript
await this.dataSource.transaction(async (manager) => {
  await manager.save(Appointment, appointmentData);
  await manager.save(Payment, paymentData);
});
// rollback is automatic if the callback throws
```

### Interview questions

**Q: Why not just wrap a payment gateway call and two DB writes all in one transaction?**
> "Because the payment gateway call is a network call to an external system, not something the DB transaction can roll back if it half-fails - and holding a DB transaction open across a slow/hanging external call ties up a connection and locks for that whole duration. I'd rather authorize the payment first (outside or before the transaction), then persist the outcome in a short, fast local transaction, and handle any edge case where the payment succeeded but the local write failed via reconciliation - an idempotent webhook handler or a background job that checks pending payments against the gateway's actual status."

**Q: What causes a deadlock and how do you avoid it?**
> "Two transactions each holding a lock the other needs, in opposite acquisition order - classic case is transaction A locks row 1 then wants row 2, while transaction B locks row 2 then wants row 1. I avoid it by always acquiring locks/updating rows in a consistent order across the codebase (e.g. always by ascending primary key), keeping transactions short, and having the DB layer retry on serialization/deadlock errors where it's safe to do so idempotently."

---

## 6. MySQL vs PostgreSQL notes (from real project exposure)

### Topics to learn
- [ ] Auto-increment (`AUTO_INCREMENT`) vs sequences (`SERIAL`/`IDENTITY`)
- [ ] Enum representation: MySQL native `ENUM` type vs Postgres `CHECK`/custom enum type (TypeORM abstracts this, but generated SQL differs)
- [ ] Case sensitivity: MySQL string comparisons often case-insensitive by default (collation-dependent), Postgres is case-sensitive by default
- [ ] JSON columns: both support JSON, Postgres's `jsonb` is indexed/queryable more efficiently than MySQL's JSON type
- [ ] Default isolation level differs (MySQL: REPEATABLE READ, Postgres: READ COMMITTED)
- [ ] `LIMIT`/`OFFSET` syntax is actually shared, but full-text search and some functions differ significantly
- [ ] Why VetApp had to work with MySQL specifically (legacy constraint) vs greenfield projects where Postgres was chosen freely

### Quick comparison table

| | MySQL | PostgreSQL |
|---|---|---|
| Default isolation | REPEATABLE READ | READ COMMITTED |
| JSON support | JSON type, less efficient indexing | `jsonb`, binary + indexable (GIN indexes) |
| Enums | Native `ENUM` column type | Custom type or `CHECK` constraint (TypeORM often uses a custom type) |
| Case sensitivity (string compare) | Often case-insensitive (collation-dependent) | Case-sensitive by default |
| Full text search | Basic (`FULLTEXT` index, MyISAM/InnoDB support varies) | Much richer (`tsvector`/`tsquery`, extensions like `pg_trgm`) |
| Common use in your CV | VetApp (legacy constraint) | Freelance projects, greenfield choices |

### Interview questions

**Q: You've worked with both MySQL and PostgreSQL - when would you actively choose one over the other for a new project?**
> "For a greenfield project I lean Postgres by default - richer JSON (`jsonb`) support, stronger full-text search, and generally more standards-compliant SQL semantics. MySQL is still a perfectly solid choice, especially if the team/ops tooling is already built around it, or - like VetApp - the constraint isn't really a choice at all: the existing production database was MySQL, so the rewrite target was defined by compatibility requirements, not a fresh preference."

**Q: What's a gotcha you'd watch for moving an app between MySQL and Postgres?**
> "Case sensitivity in string comparisons is a classic one - a query relying on MySQL's typically case-insensitive `LIKE`/`=` behavior can silently return different results on Postgres, which is case-sensitive by default. Enum handling and JSON querying also differ enough that I'd review both entity definitions and any raw SQL/QueryBuilder fragments rather than assume portability."

---

## Full interview question bank (rapid fire)

1. **Eager vs lazy relations - which do you default to and why?** -> explicit/lazy by default; eager only for cheap, always-needed relations.
2. **What is the N+1 problem and how do you fix it?** -> 1+N queries from unloaded relations accessed in a loop; fix with joins/`relations`.
3. **Why is `synchronize: true` dangerous?** -> unreviewed auto schema changes at boot, no rollback plan.
4. **`find()` vs `QueryBuilder` - when do you switch?** -> once conditions/joins/aggregations get dynamic or complex.
5. **How do you run a multi-step write atomically?** -> `DataSource.transaction()` or manual `QueryRunner` with commit/rollback.
6. **Why is calling an external payment API inside a DB transaction risky?** -> holds locks/connections during a slow network call; can't be rolled back by the DB anyway.
7. **What causes deadlocks and how do you prevent them?** -> inconsistent lock ordering; fix with consistent ordering + short transactions.
8. **Name two concrete MySQL vs Postgres differences you've hit.** -> isolation level default, JSON/enum handling, case sensitivity.
9. **How do soft deletes work in TypeORM?** -> `@DeleteDateColumn`, `softDelete()`/`softRemove()`, excluded from default finds.
10. **How did you keep the VetApp rewrite schema-compatible with the legacy PHP app's MySQL database?** -> entities mapped to the existing schema exactly, explicit migrations only for genuinely new changes.

---

## Hands-on drills

- [ ] Model `Vet`, `Owner`, `Appointment`, `Payment`, `VetRecord` entities with correct relations and at least one enum column.
- [ ] Write a query that reproduces N+1 (loop + lazy relation access), turn on query logging, count queries, then fix it and re-count.
- [ ] Write one migration by hand with a correct `down()` that fully reverses the `up()`.
- [ ] Implement `createAppointmentWithPayment` using both the manual `QueryRunner` pattern and the `DataSource.transaction()` convenience wrapper; compare readability.
- [ ] Write out the MySQL vs Postgres comparison table from memory, then check it against this chapter.
- [ ] Rehearse the "VetApp schema compatibility" story out loud in under 90 seconds.

---

## Senior red flags / green flags

### Green flags
- Defaults to explicit relation loading, treats `eager: true` as a deliberate, rare choice.
- Can describe N+1 with a concrete before/after code example, not just the term.
- Knows exactly why `synchronize: true` is banned outside local dev.
- Has a real opinion on keeping external calls (payment gateways) out of DB transactions.
- Can name specific MySQL vs Postgres differences from actual project experience, not textbook trivia.

### Red flags
- "TypeORM handles all of that for me" with no understanding of what "that" is.
- Doesn't know what N+1 means or has never had to fix one.
- Uses `synchronize: true` in a shared/staging/production environment.
- Wraps slow external API calls inside long-held DB transactions without acknowledging the trade-off.
- No specific migration workflow beyond "TypeORM generates it."

---

## Tie-backs to your experience

- **VetApp**: the standout story - TypeORM entities modeled against an *existing* legacy MySQL schema, appointments/records/payments domain modeling, and (per chapter 06) background jobs for async processing around payments.
- **Freelance**: explicit PostgreSQL and MySQL both listed - use this to answer "have you worked with both" confidently with real examples instead of hypotheticals.
- **Travel2Georgia**: full database design from scratch - good story for "designing a schema with no legacy constraints," a nice contrast to VetApp's constrained rewrite.

---

## Senior-Level Best Practices

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

## Mastery checklist

- [ ] I can model entities and relations correctly, including deciding eager vs lazy per case.
- [ ] I can explain and demonstrate fixing an N+1 query.
- [ ] I can explain why `synchronize: true` is unsafe and describe a real migration workflow.
- [ ] I can implement a transaction correctly and explain the external-call-inside-transaction trade-off.
- [ ] I can speak to at least 3 concrete MySQL vs PostgreSQL differences from real project exposure.
- [ ] I have a rehearsed VetApp schema-compatibility STAR story.
