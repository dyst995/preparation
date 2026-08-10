# 02. Data types: practical differences

> Source: `interview-prep/sql-databases/04-postgres-vs-mysql.md`

### Auto-incrementing primary keys

```sql
-- Postgres (modern, preferred way)
CREATE TABLE pets (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  -- older style still seen: id SERIAL PRIMARY KEY
  name TEXT NOT NULL
);

-- MySQL
CREATE TABLE pets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL
);
```

### JSON support

```sql
-- Postgres: JSONB is binary, indexed, and queryable efficiently - the strong recommendation
CREATE TABLE appointments (
  id INT PRIMARY KEY,
  metadata JSONB
);
SELECT * FROM appointments WHERE metadata->>'source' = 'mobile_app';
CREATE INDEX idx_metadata_gin ON appointments USING GIN (metadata); -- fast containment queries

-- MySQL: JSON type exists (since 5.7), stored as a validated text-like format,
-- with generated/virtual columns needed to index into JSON fields efficiently
ALTER TABLE appointments ADD COLUMN metadata JSON;
SELECT * FROM appointments WHERE metadata->>'$.source' = 'mobile_app';
```

**Key talking point:** Postgres's JSONB with GIN indexes is generally considered more mature for "semi-structured data queried directly in SQL" than MySQL's JSON type, which usually needs generated columns to get comparable indexed query performance.

### Arrays

Postgres has native array types (`TEXT[]`, `INTEGER[]`) as first-class citizens. MySQL has no native array type - you'd typically model this as a JSON array column or a separate join table. This is a real, practical difference: modeling "a pet can have multiple tags/allergies" is a one-liner in Postgres (`allergies TEXT[]`) but needs a join table or JSON column in MySQL.

### ENUM

Both support ENUM-like behavior, but differently:
- **MySQL**: `ENUM('pending', 'completed', 'cancelled')` is a genuine column type, stored efficiently, validated at the column level.
- **Postgres**: has a real `CREATE TYPE ... AS ENUM (...)` construct too, but altering it (especially reordering/removing values) is more awkward than in MySQL; many Postgres teams prefer a plain `TEXT` column with a `CHECK` constraint or a foreign key to a lookup table for flexibility.

### Boolean

- **Postgres**: native `BOOLEAN` type (`TRUE`/`FALSE`).
- **MySQL**: no true native boolean - `BOOLEAN`/`BOOL` are aliases for `TINYINT(1)`, so `TRUE`/`FALSE` are really `1`/`0` under the hood. This occasionally surprises developers debugging unexpected type coercion.

### Model spoken answer

"The type systems diverge more than people expect. Postgres has real arrays, a mature JSONB type with GIN indexing, and a real boolean type. MySQL's JSON support is newer and generally needs generated columns for indexed queries, has no native array type, and its boolean is really just a TINYINT(1) alias. None of these are dealbreakers, but they do change how I'd model something like a pet's list of allergies - a native array column in Postgres versus a join table or JSON blob in MySQL."

---
