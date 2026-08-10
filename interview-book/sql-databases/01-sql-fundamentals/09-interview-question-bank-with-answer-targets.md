# 09. Interview question bank (with answer targets)

> Source: `interview-prep/sql-databases/01-sql-fundamentals.md`

### Core syntax
1. **What is the logical order of SQL clause execution?** -> FROM/JOIN, WHERE, GROUP BY, HAVING, SELECT, DISTINCT, ORDER BY, LIMIT.
2. **Difference between WHERE and HAVING?** -> row filter before grouping vs group filter after aggregation.
3. **Difference between INNER and LEFT JOIN?** -> matched-only vs all-left-rows-with-NULL-fill.
4. **Why does putting a right-table filter in WHERE break a LEFT JOIN?** -> WHERE runs after the join; NULL fails the comparison, silently dropping unmatched left rows.
5. **COUNT(*) vs COUNT(column) vs COUNT(DISTINCT column)?** -> all rows vs non-NULL values vs unique non-NULL values.

### NULL handling
6. **Why doesn't `column <> NULL` work?** -> three-valued logic; use IS NOT NULL.
7. **Why can NOT IN silently return zero rows?** -> if the subquery contains a NULL, every comparison becomes UNKNOWN; use NOT EXISTS instead.
8. **What does COALESCE do? NULLIF?** -> first non-NULL value; NULL-if-equal (handy for safe division).

### Joins & subqueries
9. **When would you use EXISTS instead of IN?** -> existence checks, NULL-safety, short-circuiting.
10. **When would you use a CTE instead of a subquery?** -> readability, reusing an intermediate result multiple times, narrating multi-step logic.
11. **What is a self join, and give an example use case.** -> comparing rows in the same table, e.g. double-booking detection, org hierarchy one level at a time.
12. **How do you find duplicate rows in a table?**

```sql
SELECT email, COUNT(*)
FROM owners
GROUP BY email
HAVING COUNT(*) > 1;
```

13. **How do you find the second-highest value (e.g. second highest payment amount)?**

```sql
SELECT MAX(amount) FROM payments
WHERE amount < (SELECT MAX(amount) FROM payments);

-- or, more general (Nth highest), with window functions:
SELECT amount FROM (
  SELECT amount, DENSE_RANK() OVER (ORDER BY amount DESC) AS rnk
  FROM payments
) t WHERE rnk = 2;
```

14. **How would you find owners who have never booked an appointment?**

```sql
SELECT o.* FROM owners o
LEFT JOIN pets p ON p.owner_id = o.id
LEFT JOIN appointments a ON a.pet_id = p.id
WHERE a.id IS NULL;
```

### Window functions
15. **RANK vs DENSE_RANK vs ROW_NUMBER?** -> see table above.
16. **How do you get the top 3 most recent appointments per vet?** -> ROW_NUMBER() with PARTITION BY, filtered in an outer query.
17. **How do you compute a running total?** -> SUM() OVER (PARTITION BY ... ORDER BY ... ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW).

### Set operations
18. **UNION vs UNION ALL?** -> de-duplicated (costs a sort/hash) vs raw concatenation (cheaper).

---
