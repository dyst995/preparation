# 06. MySQL vs PostgreSQL notes (from real project exposure)

> Source: `interview-prep/nestjs/05-typeorm-persistence.md`

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
