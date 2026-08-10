# 01. SELECT basics and logical query order

> Source: `interview-prep/sql-databases/01-sql-fundamentals.md`

### Topics to learn
- [ ] SELECT list, column aliasing
- [ ] WHERE filtering (comparison, `IN`, `BETWEEN`, `LIKE`, `IS NULL`)
- [ ] ORDER BY (single/multi column, ASC/DESC, NULLS FIRST/LAST awareness)
- [ ] LIMIT/OFFSET (and `FETCH FIRST` awareness for standard SQL / MySQL/Postgres differences)
- [ ] DISTINCT vs GROUP BY for de-duplication
- [ ] The logical order SQL executes in, which is NOT the order you type it in

### The logical order of operations

You write a query top to bottom like this:

```sql
SELECT ...
FROM ...
JOIN ...
WHERE ...
GROUP BY ...
HAVING ...
ORDER BY ...
LIMIT ...
```

But the database logically evaluates it in a different order:

1. `FROM` / `JOIN` - build the working row set
2. `WHERE` - filter rows before grouping
3. `GROUP BY` - collapse rows into groups
4. `HAVING` - filter groups after aggregation
5. `SELECT` - compute the output columns/aliases
6. `DISTINCT` - de-duplicate resulting rows
7. `ORDER BY` - sort the result
8. `LIMIT` / `OFFSET` - cut down the final row count

### Why this matters in interviews

This single fact explains a whole family of "gotcha" questions:
- You cannot use a `SELECT` column alias in `WHERE` (WHERE runs before SELECT is evaluated) but you usually CAN use it in `ORDER BY` (runs after SELECT) - though behavior for `GROUP BY`/`HAVING` aliasing varies by database.
- `WHERE` cannot filter on aggregate results (`WHERE COUNT(*) > 5` is invalid) - that is exactly what `HAVING` is for.
- `LIMIT` is applied last, after sorting, which is why "top N" queries always need an `ORDER BY` to be deterministic.

### Model spoken answer

"SQL reads top-down when you write it, but the engine evaluates it logically as FROM/JOIN, WHERE, GROUP BY, HAVING, SELECT, DISTINCT, ORDER BY, LIMIT. That's why you can't filter on an aggregate in WHERE - the aggregate doesn't exist yet at that stage - you need HAVING. And it's why LIMIT without ORDER BY gives you an arbitrary, non-deterministic 'top N'."

### Example

```sql
SELECT p.name, p.species
FROM pets p
WHERE p.species = 'Dog'
ORDER BY p.birth_date DESC
LIMIT 10;
```

"Get the 10 youngest dogs." Read it as: filter to dogs, sort newest birth date first, take 10.

---
