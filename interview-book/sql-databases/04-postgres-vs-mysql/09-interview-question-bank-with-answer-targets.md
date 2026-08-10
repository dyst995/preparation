# 09. Interview question bank (with answer targets)

> Source: `interview-prep/sql-databases/04-postgres-vs-mysql.md`

1. **Postgres vs MySQL - what are the practical differences you've run into?** -> see sections 2-5; lead with JSONB/arrays, case sensitivity, and RETURNING vs LAST_INSERT_ID as concrete, specific examples.
2. **What storage engine does MySQL use for transactions, and why does it matter?** -> InnoDB; MyISAM (legacy) had no transactions/FKs.
3. **How does Postgres implement MVCC vs how does MySQL/InnoDB?** -> both use MVCC concepts; Postgres tables are heaps with row versions, InnoDB clusters by primary key and uses undo logs for old versions.
4. **What's `synchronize: true` in TypeORM, and why avoid it in production?** -> auto-syncs schema to entities on startup; risks silent data loss, no reviewable history, team drift; use migrations instead.
5. **How do you generate and run a TypeORM migration?** -> `migration:generate` then `migration:run` against a configured DataSource.
6. **What's a practical case-sensitivity gotcha between the two databases?** -> MySQL's default collation is often case-insensitive for string comparisons; Postgres is case-sensitive by default.
7. **When would you specifically prefer Postgres's JSONB over a MySQL JSON column?** -> when you need indexed, queryable semi-structured data (GIN indexes on JSONB) without extra generated columns.
8. **You inherited an existing MySQL database on VetApp - what did that constrain, and how did you handle it?** -> personal story: schema archaeology, mapping TypeORM entities to existing tables/types, no `synchronize`, careful migrations for any additive changes, preserving compatibility with existing PHP-era data.

---
