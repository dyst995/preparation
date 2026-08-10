# 07. Full interview question bank (rapid fire)

> Source: `interview-prep/nestjs/05-typeorm-persistence.md`

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
