# 03. Storage engines and transactions

> Source: `interview-prep/sql-databases/04-postgres-vs-mysql.md`

- **MySQL** historically supported multiple storage engines (MyISAM, InnoDB, others); **InnoDB is the modern default** and is what gives MySQL ACID transactions, foreign keys, and row-level locking. It's worth knowing that MyISAM (the old default) did NOT support transactions or foreign keys at all - if you ever see MyISAM mentioned, flag that as a legacy/limited engine.
- **Postgres** has one unified storage/transaction engine (no engine choice to make) built around MVCC from the ground up, plus a rich extension system (PostGIS for geospatial, pg_trgm for fuzzy text search, TimescaleDB for time-series, etc.).

### Model spoken answer

"MySQL's transactional guarantees depend on using InnoDB - the modern default, but historically you could accidentally end up on MyISAM, which has no transactions or foreign keys at all, so checking the engine matters for legacy MySQL databases. Postgres doesn't have that engine-choice question; it has one engine with strong extensibility instead, which is part of why people reach for it when they need things like geospatial queries via PostGIS."

---
