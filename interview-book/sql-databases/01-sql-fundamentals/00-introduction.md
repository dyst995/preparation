# 01-sql-fundamentals — Introduction

> Source: `interview-prep/sql-databases/01-sql-fundamentals.md`

01 - SQL Fundamentals

Goal: Be able to read, write, and reason about SQL queries live in an interview - SELECT, JOIN, GROUP BY, subqueries, NULL handling, aggregations - at a depth that survives "why" follow-ups, not just "what."

Mark progress with [x] as you master each topic.

---

Learning objectives

By the end of this chapter you should be able to:

1. Write a SELECT query with WHERE, ORDER BY, LIMIT/OFFSET, and explain the logical order of execution.
2. Explain and correctly use INNER, LEFT, RIGHT, FULL OUTER, CROSS, and SELF joins, including when each returns NULLs.
3. Use GROUP BY with aggregate functions and explain the difference between WHERE and HAVING.
4. Explain NULL's three-valued logic and avoid the classic NULL bugs (`<> NULL`, NOT IN with NULLs, COUNT(column) vs COUNT(*)).
5. Write subqueries (scalar, correlated, IN/EXISTS) and know when a JOIN or CTE is a cleaner alternative.
6. Use CTEs (`WITH`) for readability and recursive queries at a high level.
7. Use set operations: UNION, UNION ALL, INTERSECT, EXCEPT.
8. Use window functions (ROW_NUMBER, RANK, DENSE_RANK, PARTITION BY, LAG/LEAD) for "top N per group" and running-total style problems.
9. Approach a live SQL interview question with a repeatable method instead of guessing.

---

## Reference schema used throughout this track

To keep examples concrete and tied to your CV, we will reuse two small schemas everywhere in this track: a **VetApp**-style clinic schema (your real NestJS + TypeORM + MySQL project) and an **EasyPay**-style fintech schema (your real React Native fintech app, imagined with a backing relational database). You do not need to memorize these tables - just recognize the shape so query examples make sense.

VetApp-style schema:

```sql
owners        (id, full_name, phone, email, created_at)
pets          (id, owner_id -> owners.id, name, species, birth_date)
vets          (id, full_name, specialty)
appointments  (id, pet_id -> pets.id, vet_id -> vets.id, scheduled_at, status, notes)
medical_records (id, appointment_id -> appointments.id, diagnosis, treatment, created_at)
payments      (id, appointment_id -> appointments.id, amount, currency, status, paid_at)
```

EasyPay-style schema:

```sql
users         (id, full_name, phone, email, created_at)
wallets       (id, user_id -> users.id, currency, balance)
transactions  (id, wallet_id -> wallets.id, type, amount, status, created_at)
loans         (id, user_id -> users.id, principal, status, created_at)
loan_payments (id, loan_id -> loans.id, amount, paid_at)
```

Keep these two schemas in your head - most interview questions in chapter 05 reuse them.

---
