# 09. Senior red flags / green flags

> Source: `interview-prep/sql-databases/03-transactions-consistency.md`

### Green flags
- Giving a concrete example (money, booking) instead of reciting definitions.
- Knowing the two engines' default isolation levels cold.
- Mentioning MVCC when asked "does a read block a write."
- Proposing lock ordering as a deadlock-prevention strategy, not just "catch and retry."
- Knowing that a simple conditional UPDATE can sometimes replace SELECT FOR UPDATE entirely for a balance check.

### Red flags
- Confusing isolation levels with locking mechanisms as if they're the same thing.
- Not knowing what a phantom read is.
- Treating "just wrap it in a transaction" as sufficient without discussing concurrency/locking for a money scenario.
- Panicking about deadlocks instead of describing them as an expected, handleable condition at scale.

---
