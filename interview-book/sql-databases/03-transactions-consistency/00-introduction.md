# 03-transactions-consistency — Introduction

> Source: `interview-prep/sql-databases/03-transactions-consistency.md`

03 - Transactions & Consistency

Goal: Explain ACID properties, isolation levels, locking, and deadlocks with enough precision to survive senior follow-ups, and connect them to real code you'd write with TypeORM around payments and appointment booking - domains where getting this wrong causes real money or scheduling bugs.

Mark progress with [x] as you master each topic.

---

Learning objectives

By the end of this chapter you should be able to:

1. Explain ACID (Atomicity, Consistency, Isolation, Durability) with a concrete example for each.
2. Name the four standard isolation levels and the anomaly each one prevents or allows.
3. Explain dirty reads, non-repeatable reads, and phantom reads with examples.
4. State the default isolation level for Postgres and for MySQL/InnoDB, and how MySQL's default differs in behavior from the SQL standard's expectation.
5. Explain pessimistic vs optimistic locking and when to use each.
6. Explain what a deadlock is, why it happens, and how databases resolve it.
7. Write a transaction using TypeORM (QueryRunner-based and decorator/manager-based) correctly, including rollback on error.

---
