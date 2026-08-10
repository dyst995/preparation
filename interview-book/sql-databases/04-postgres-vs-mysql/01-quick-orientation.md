# 01. Quick orientation

> Source: `interview-prep/sql-databases/04-postgres-vs-mysql.md`

| | PostgreSQL | MySQL |
|---|---|---|
| Type | Object-relational database, single storage engine | Relational database with pluggable storage engines (InnoDB is the modern default) |
| License | PostgreSQL License (permissive, BSD/MIT-like) | GPL (with a commercial dual-license from Oracle) |
| Known for | Standards compliance, advanced data types, extensibility (extensions like PostGIS) | Simplicity, huge ecosystem/hosting availability, historically fast simple reads |
| Your CV context | General freelance stack listed alongside MySQL | VetApp: rebuilt PHP backend in NestJS while preserving compatibility with an **existing MySQL database** |

Neither is objectively "better" - the honest, senior answer is "it depends on the constraints," and you have a real example of exactly that: on VetApp you didn't choose MySQL, you inherited it, and the job was to work correctly within that constraint.

---
