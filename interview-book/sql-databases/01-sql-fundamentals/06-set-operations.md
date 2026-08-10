# 06. Set operations

> Source: `interview-prep/sql-databases/01-sql-fundamentals.md`

### Topics to learn
- [ ] UNION vs UNION ALL (de-duplication cost)
- [ ] INTERSECT
- [ ] EXCEPT (Postgres) / MINUS (Oracle) - MySQL added EXCEPT/INTERSECT in 8.0.31+
- [ ] Column count/type compatibility requirement

### Example

```sql
-- All emails that are either owners or vets (deduplicated)
SELECT email FROM owners
UNION
SELECT email FROM vet_contact_emails;

-- Same, but keep duplicates (cheaper, no implicit sort/dedupe)
SELECT email FROM owners
UNION ALL
SELECT email FROM vet_contact_emails;
```

Rule of thumb: default to `UNION ALL` unless you specifically need de-duplication - `UNION` does an implicit distinct pass, which costs a sort/hash operation you don't always need.

---
