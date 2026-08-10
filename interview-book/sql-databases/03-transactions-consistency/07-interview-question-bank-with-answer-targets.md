# 07. Interview question bank (with answer targets)

> Source: `interview-prep/sql-databases/03-transactions-consistency.md`

1. **What does ACID stand for? Give an example of each with a payments scenario.** -> see section 1.
2. **What is a dirty read? A non-repeatable read? A phantom read?** -> uncommitted data seen; same row changes between reads; same range query returns different rows.
3. **What is Postgres's default isolation level? MySQL's?** -> Read Committed; Repeatable Read.
4. **Does a SELECT block a concurrent UPDATE in Postgres?** -> generally no, due to MVCC snapshot isolation - readers don't block writers and vice versa in the common case.
5. **Pessimistic vs optimistic locking - when would you use each?** -> pessimistic for high-contention/high-stakes resources (money, booking slots); optimistic for low-contention edits (profile fields).
6. **How would you prevent double-spending a wallet balance under concurrent requests?** -> SELECT ... FOR UPDATE inside a transaction, or an atomic conditional UPDATE (`UPDATE wallets SET balance = balance - :amt WHERE id = :id AND balance >= :amt`).
7. **What is a deadlock, and how do databases resolve it?** -> circular lock wait; the database detects the cycle and aborts one transaction, which the application should catch and retry.
8. **How do you avoid deadlocks proactively?** -> consistent lock ordering across resources, short transactions, retry logic.
9. **How do you implement optimistic locking in TypeORM?** -> `@VersionColumn()`, catch `OptimisticLockVersionMismatchError` and retry/report conflict.
10. **What happens if an exception is thrown inside `dataSource.transaction(async manager => {...})`?** -> TypeORM automatically rolls back the transaction and rethrows.

---
