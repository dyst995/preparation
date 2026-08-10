# 11. Senior red flags / green flags

> Source: `interview-prep/sql-databases/04-postgres-vs-mysql.md`

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
