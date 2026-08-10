# 04. NULL semantics (three-valued logic)

> Source: `interview-prep/sql-databases/01-sql-fundamentals.md`

### Topics to learn
- [ ] NULL means "unknown," not "empty" or "zero"
- [ ] Any arithmetic or comparison with NULL yields NULL (which is treated as not-true in WHERE)
- [ ] `= NULL` and `<> NULL` never match anything - must use `IS NULL` / `IS NOT NULL`
- [ ] `NOT IN (subquery containing NULL)` returns zero rows - a very common bug
- [ ] `COALESCE(a, b, c)` - first non-NULL value
- [ ] `NULLIF(a, b)` - NULL if a = b, else a (useful for avoiding divide-by-zero)
- [ ] NULLs are excluded from most aggregate calculations except COUNT(*)
- [ ] Sorting NULLs (`NULLS FIRST` / `NULLS LAST` in Postgres; MySQL sorts NULL as smallest by default)

### Three-valued logic

SQL has TRUE, FALSE, and UNKNOWN. Any comparison involving NULL evaluates to UNKNOWN, and WHERE only keeps rows where the condition is TRUE (UNKNOWN is treated like FALSE for filtering purposes).

```sql
NULL = NULL       -- UNKNOWN (not TRUE!)
NULL <> 5         -- UNKNOWN
NOT UNKNOWN       -- still UNKNOWN
```

### The NOT IN + NULL trap (very high interview signal)

```sql
-- Intent: find owners who have never had an appointment
SELECT * FROM owners
WHERE id NOT IN (
  SELECT owner_id FROM pets WHERE owner_id IS NULL OR TRUE -- imagine this subquery can return a NULL
);
```

If the subquery used by `NOT IN` returns even one NULL value, the entire `NOT IN` expression returns zero rows for every outer row - because `x <> NULL` is UNKNOWN, and `UNKNOWN AND ... AND UNKNOWN` can never be TRUE across a list that includes NULL. This silently breaks "find things NOT in this list" queries.

Fix: use `NOT EXISTS` instead, which handles NULLs correctly:

```sql
SELECT o.* FROM owners o
WHERE NOT EXISTS (
  SELECT 1 FROM pets p WHERE p.owner_id = o.id
);
```

**Rule of thumb interviewers love to hear:** "I avoid `NOT IN` with subqueries that could contain NULL - I use `NOT EXISTS` instead, since it's NULL-safe and often has a better query plan anyway."

### COALESCE and NULLIF in practice

```sql
-- Default a missing phone to 'N/A'
SELECT full_name, COALESCE(phone, 'N/A') AS phone FROM owners;

-- Safe division: avoid divide-by-zero when total appointments is 0
SELECT vet_id, SUM(amount) / NULLIF(COUNT(*), 0) AS avg_amount
FROM payments GROUP BY vet_id;
```

### Model spoken answer

"NULL represents unknown, not zero or empty string, and SQL uses three-valued logic - TRUE, FALSE, UNKNOWN. Any comparison with NULL is UNKNOWN, which WHERE treats as not-a-match, so you always use IS NULL / IS NOT NULL rather than `= NULL`. The trap I actively watch for is NOT IN against a subquery that might return NULL - if it does, the whole NOT IN silently returns no rows. I prefer NOT EXISTS for 'not in this set' logic because it's NULL-safe."

---
