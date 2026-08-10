# 02. JOIN types

> Source: `interview-prep/sql-databases/01-sql-fundamentals.md`

### Topics to learn
- [ ] INNER JOIN
- [ ] LEFT (OUTER) JOIN / RIGHT (OUTER) JOIN
- [ ] FULL OUTER JOIN (Postgres yes, MySQL: emulate with UNION of LEFT + RIGHT)
- [ ] CROSS JOIN
- [ ] SELF JOIN
- [ ] Multi-table joins and join order intuition
- [ ] Filtering in ON vs WHERE for outer joins (a classic trap)

### Mental model

Think of a join as: take every row from the left table, try to find matching row(s) in the right table using the ON condition, then decide what to do when there is no match.

| Join type | Unmatched left rows | Unmatched right rows |
|---|---|---|
| INNER JOIN | dropped | dropped |
| LEFT JOIN | kept, right columns NULL | dropped |
| RIGHT JOIN | dropped | kept, left columns NULL |
| FULL OUTER JOIN | kept, right columns NULL | kept, left columns NULL |
| CROSS JOIN | every row x every row (Cartesian product) | every row x every row |

### Example: INNER JOIN

"List every appointment with the pet's name and the vet's name."

```sql
SELECT a.id, p.name AS pet_name, v.full_name AS vet_name, a.scheduled_at
FROM appointments a
INNER JOIN pets p ON p.id = a.pet_id
INNER JOIN vets v ON v.id = a.vet_id;
```

Only appointments that have both a valid pet and a valid vet appear. If a pet was deleted (and the FK allowed it), that appointment silently disappears from this result - a common bug source.

### Example: LEFT JOIN

"List every pet, and their most recent appointment if they have one - including pets with none."

```sql
SELECT p.name, a.scheduled_at
FROM pets p
LEFT JOIN appointments a ON a.pet_id = p.id;
```

Pets with zero appointments still show up, with `a.scheduled_at` as NULL.

### The classic outer join trap: ON vs WHERE

```sql
-- BUG: this silently turns the LEFT JOIN into an INNER JOIN
SELECT p.name, a.scheduled_at
FROM pets p
LEFT JOIN appointments a ON a.pet_id = p.id
WHERE a.status = 'completed';
```

Because `WHERE a.status = 'completed'` runs after the join and NULL never equals `'completed'`, every pet with no appointments gets filtered out entirely - defeating the purpose of the LEFT JOIN. The fix is to move the condition into the ON clause:

```sql
SELECT p.name, a.scheduled_at
FROM pets p
LEFT JOIN appointments a
  ON a.pet_id = p.id AND a.status = 'completed';
```

This is one of the highest-signal "do you actually understand joins" interview traps. Know it cold.

### SELF JOIN example

"Find pairs of appointments for the same pet on the same day (double-booking check)."

```sql
SELECT a1.id AS appointment_1, a2.id AS appointment_2, a1.pet_id
FROM appointments a1
JOIN appointments a2
  ON a1.pet_id = a2.pet_id
  AND a1.id < a2.id
  AND DATE(a1.scheduled_at) = DATE(a2.scheduled_at);
```

The `a1.id < a2.id` trick avoids matching a row with itself and avoids duplicate mirrored pairs.

### Model spoken answer

"INNER JOIN only keeps rows with a match on both sides. LEFT JOIN keeps every row from the left table even without a match, filling the right side with NULLs. A very common bug is putting a filter on the right table's column in WHERE instead of ON for an outer join - that silently converts it back into an inner join because WHERE runs after the join and NULL fails any equality comparison. I always put the right-table filter condition inside the ON clause when I want to preserve unmatched left rows."

---
