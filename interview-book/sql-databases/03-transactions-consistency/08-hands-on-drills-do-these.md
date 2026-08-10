# 08. Hands-on drills (do these)

> Source: `interview-prep/sql-databases/03-transactions-consistency.md`

- [ ] Explain ACID out loud using the wallet transfer example, without notes.
- [ ] Write the SQL for an atomic, race-safe balance debit that doesn't even need `FOR UPDATE` (hint: conditional UPDATE with balance check in the WHERE clause) - and explain why this is sometimes even better than SELECT FOR UPDATE for simple cases.
- [ ] Write a TypeORM `dataSource.transaction()` block for creating an appointment plus its initial payment record atomically.
- [ ] Describe, from memory, the deadlock scenario between two wallet transfers going in opposite directions, and the fix.
- [ ] State Postgres's and MySQL's default isolation levels without looking them up.

---
