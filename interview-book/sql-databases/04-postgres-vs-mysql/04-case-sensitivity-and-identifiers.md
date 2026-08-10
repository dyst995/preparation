# 04. Case sensitivity and identifiers

> Source: `interview-prep/sql-databases/04-postgres-vs-mysql.md`

- **MySQL**: identifier (table/column name) case sensitivity depends on the OS and a server variable (`lower_case_table_names`) - notoriously inconsistent between Linux (case-sensitive by default) and Windows/macOS (often case-insensitive), a real source of "works on my machine" bugs when a team develops on macOS and deploys on Linux.
- **Postgres**: unquoted identifiers are automatically folded to lowercase, and are case-insensitive as a result; quoted identifiers (`"MyTable"`) are case-sensitive and preserved exactly - a common gotcha for developers moving from a tool that auto-quotes identifiers.
- **String comparison collation**: MySQL's default collation (e.g. `utf8mb4_general_ci` or newer `utf8mb4_0900_ai_ci`) is case-insensitive by default for string comparisons (`'abc' = 'ABC'` can be true); Postgres string comparison is case-sensitive by default unless you use `ILIKE` or a case-insensitive collation.

### Model spoken answer

"One practical gotcha: MySQL's default collation makes string equality case-insensitive out of the box, so `'Vet' = 'vet'` can be true, while Postgres is case-sensitive by default and you'd need ILIKE or a citext/case-insensitive collation for the same behavior. I always check this explicitly when writing lookup queries like matching an email during login, especially if the codebase moved between the two."

---
