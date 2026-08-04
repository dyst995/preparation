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

## Mastery checklist

- [ ] I can model entities and relations correctly, including deciding eager vs lazy per case.
- [ ] I can explain and demonstrate fixing an N+1 query.
- [ ] I can explain why `synchronize: true` is unsafe and describe a real migration workflow.
- [ ] I can implement a transaction correctly and explain the external-call-inside-transaction trade-off.
- [ ] I can speak to at least 3 concrete MySQL vs PostgreSQL differences from real project exposure.
- [ ] I have a rehearsed VetApp schema-compatibility STAR story.
