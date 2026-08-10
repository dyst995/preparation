# 06. Replication and scaling (awareness level - don't over-invest here)

> Source: `interview-prep/sql-databases/04-postgres-vs-mysql.md`

- **Postgres**: streaming replication (physical, byte-level WAL shipping) for read replicas and HA; logical replication for more selective/table-level replication; extensions like Patroni for HA orchestration.
- **MySQL**: has long-standing binlog-based replication (statement-based, row-based, or mixed), widely supported by managed cloud offerings (RDS, Aurora, Cloud SQL, PlanetScale, etc.), historically very mature multi-region replication tooling due to its age and adoption at companies like Facebook/YouTube.

You don't need deep operational replication expertise for most interviews at your level - just be able to say "both support primary/replica replication for read scaling and HA; the ecosystem tooling differs, and managed cloud services abstract a lot of this away in practice."

---
