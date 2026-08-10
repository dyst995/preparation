# 05. LIMIT/OFFSET, string functions, and other small but real differences

> Source: `interview-prep/sql-databases/04-postgres-vs-mysql.md`

| Feature | Postgres | MySQL |
|---|---|---|
| Limit/offset | `LIMIT n OFFSET m` (also standard `FETCH FIRST n ROWS ONLY`) | `LIMIT n OFFSET m` (also `LIMIT m, n` shorthand - reversed argument order, easy to misread) |
| String concatenation | `\|\|` operator (`'a' \|\| 'b'`) | `CONCAT('a', 'b')` function (`\|\|` means logical OR in MySQL by default unless PIPES_AS_CONCAT mode is set) |
| Auto-increment retrieval | `RETURNING id` clause on INSERT | `LAST_INSERT_ID()` function after INSERT |
| Upsert | `INSERT ... ON CONFLICT (...) DO UPDATE ...` | `INSERT ... ON DUPLICATE KEY UPDATE ...` |
| Full text search | Built-in `tsvector`/`tsquery` with GIN indexes, quite powerful | `FULLTEXT` indexes, functional but generally less flexible |
| Regex | `~`, `~*` operators plus standard functions | `REGEXP` / `RLIKE` |

The `INSERT ... RETURNING` clause is a genuinely nice Postgres feature worth mentioning: you can insert a row and get generated columns (like the new id, or a default timestamp) back in the same round trip, without a second `SELECT LAST_INSERT_ID()`-style call.

```sql
-- Postgres
INSERT INTO appointments (pet_id, vet_id, scheduled_at)
VALUES (1, 2, NOW())
RETURNING id, created_at;

-- MySQL equivalent requires two statements
INSERT INTO appointments (pet_id, vet_id, scheduled_at) VALUES (1, 2, NOW());
SELECT LAST_INSERT_ID();
```

---
