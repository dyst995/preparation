# 03. GROUP BY, aggregation, and HAVING

> Source: `interview-prep/sql-databases/01-sql-fundamentals.md`

### Topics to learn
- [ ] Aggregate functions: COUNT, SUM, AVG, MIN, MAX
- [ ] COUNT(*) vs COUNT(column) vs COUNT(DISTINCT column)
- [ ] GROUP BY with multiple columns
- [ ] HAVING vs WHERE
- [ ] Every non-aggregated SELECT column must appear in GROUP BY (strict SQL mode)
- [ ] GROUP BY with JOIN (fan-out risk before aggregating)

### WHERE vs HAVING

| | WHERE | HAVING |
|---|---|---|
| Runs | before grouping | after grouping |
| Filters | individual rows | groups (post-aggregation) |
| Can reference aggregates? | no | yes |
| Typical use | `WHERE status = 'active'` | `HAVING COUNT(*) > 3` |

### Example

"Which vets have handled more than 20 completed appointments?"

```sql
SELECT v.full_name, COUNT(*) AS completed_count
FROM appointments a
JOIN vets v ON v.id = a.vet_id
WHERE a.status = 'completed'
GROUP BY v.id, v.full_name
HAVING COUNT(*) > 20
ORDER BY completed_count DESC;
```

Walk through it out loud: filter rows to completed appointments first (WHERE, cheap, before aggregation), group by vet, count rows per group, then keep only groups with more than 20 (HAVING, after aggregation), then sort.

### COUNT gotchas

```sql
COUNT(*)              -- counts all rows, including NULLs in any column
COUNT(some_column)    -- counts rows where some_column IS NOT NULL
COUNT(DISTINCT col)   -- counts unique non-NULL values of col
```

Interview trap: "how many pets have had at least one appointment" is NOT `SELECT COUNT(*) FROM appointments` (that counts appointments, not distinct pets, and double counts pets with multiple visits). It is:

```sql
SELECT COUNT(DISTINCT pet_id) FROM appointments;
```

### The join-before-aggregate fan-out trap

If you join `appointments` to `payments` (one appointment can have multiple payment rows, e.g. partial payments) and then try to SUM something from `appointments` in the same query, the join fan-out inflates the row count and the sum will be wrong. Fix: aggregate one side first (as a subquery or CTE) before joining, or aggregate carefully with DISTINCT-aware logic.

```sql
-- WRONG-ish: if a pet has 3 appointments and 2 payments each,
-- naive joins can double count if you are not careful with what you aggregate.

-- SAFER: pre-aggregate payments per appointment first.
WITH appointment_totals AS (
  SELECT appointment_id, SUM(amount) AS total_paid
  FROM payments
  WHERE status = 'succeeded'
  GROUP BY appointment_id
)
SELECT a.id, a.scheduled_at, COALESCE(t.total_paid, 0) AS total_paid
FROM appointments a
LEFT JOIN appointment_totals t ON t.appointment_id = a.id;
```

### Model spoken answer

"WHERE filters rows before grouping, HAVING filters groups after aggregation - so if my condition involves an aggregate function like COUNT or SUM, it has to go in HAVING. I'm also careful about COUNT(*) versus COUNT(DISTINCT column) - they answer different questions - and about join fan-out: if I join a one-to-many relationship before aggregating, I can silently inflate a SUM, so I usually pre-aggregate the many side in a CTE before joining it back."

---
