# 03. Migrations

> Source: `interview-prep/nestjs/05-typeorm-persistence.md`

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
