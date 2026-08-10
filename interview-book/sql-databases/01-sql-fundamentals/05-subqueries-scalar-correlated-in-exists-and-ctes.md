# 05. Subqueries: scalar, correlated, IN/EXISTS, and CTEs

> Source: `interview-prep/sql-databases/01-sql-fundamentals.md`

### Topics to learn
- [ ] Scalar subquery (returns one value, used like a column)
- [ ] Correlated subquery (references the outer query's row)
- [ ] IN vs EXISTS vs JOIN, and when to prefer each
- [ ] Common Table Expressions (`WITH ... AS (...)`) for readability
- [ ] Recursive CTEs at a high level (hierarchies, org charts)
- [ ] When a subquery should really be a JOIN

### Scalar subquery example

```sql
SELECT p.name,
  (SELECT COUNT(*) FROM appointments a WHERE a.pet_id = p.id) AS visit_count
FROM pets p;
```

This runs once per outer row conceptually (correlated) - fine for small data, but can be slower than an equivalent JOIN + GROUP BY for large tables since many engines execute it per-row rather than set-based, though modern optimizers often rewrite it.

### Same query as a JOIN (usually preferred at scale)

```sql
SELECT p.name, COUNT(a.id) AS visit_count
FROM pets p
LEFT JOIN appointments a ON a.pet_id = p.id
GROUP BY p.id, p.name;
```

### EXISTS vs IN

```sql
-- IN: good when the subquery returns a small, NULL-free set
SELECT * FROM pets WHERE owner_id IN (SELECT id FROM owners WHERE full_name LIKE 'A%');

-- EXISTS: good default for "related row exists" checks, NULL-safe, often better optimized
SELECT * FROM pets p WHERE EXISTS (
  SELECT 1 FROM appointments a WHERE a.pet_id = p.id AND a.status = 'completed'
);
```

`EXISTS` only cares whether at least one row is returned - it does not materialize or compare actual values - which is why it tends to short-circuit efficiently and why it is NULL-safe compared to `NOT IN`.

### CTEs for readability

```sql
WITH completed_appointments AS (
  SELECT * FROM appointments WHERE status = 'completed'
),
vet_totals AS (
  SELECT vet_id, COUNT(*) AS total
  FROM completed_appointments
  GROUP BY vet_id
)
SELECT v.full_name, t.total
FROM vet_totals t
JOIN vets v ON v.id = t.vet_id
ORDER BY t.total DESC;
```

CTEs are named, readable building blocks. They do not always guarantee a performance benefit (in Postgres, versions before 12 always materialized CTEs as an optimization fence; 12+ can inline them) - but they are a huge win for interview communication: they let you narrate your query step by step.

### Recursive CTE (awareness level)

```sql
-- Example: an org chart / category tree pattern (not in VetApp schema, generic)
WITH RECURSIVE org_chart AS (
  SELECT id, name, manager_id, 1 AS depth
  FROM employees
  WHERE manager_id IS NULL
  UNION ALL
  SELECT e.id, e.name, e.manager_id, oc.depth + 1
  FROM employees e
  JOIN org_chart oc ON e.manager_id = oc.id
)
SELECT * FROM org_chart ORDER BY depth;
```

You do not need to be a recursive CTE expert, but you should be able to say what it is for: walking hierarchical/tree-shaped data (categories, org charts, comment threads) that a normal GROUP BY cannot express.

### Model spoken answer

"I reach for a JOIN by default because it's set-based and usually the most efficient and readable option. I use EXISTS for 'does a related row exist' checks because it's NULL-safe and short-circuits. I avoid NOT IN with subqueries for the NULL reason. I use CTEs to break a complex query into named, readable steps, especially when I'm going to explain the query out loud or when later steps depend on an intermediate aggregation."

---
