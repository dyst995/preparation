# 05 - TypeORM & Persistence: Entities, Relations, Migrations, N+1, Transactions — Introduction

> Source: `interview-prep/nestjs/05-typeorm-persistence.md`

> Goal: model a real domain (appointments, vets, owners, payments) correctly with TypeORM, avoid the classic N+1 trap, run transactions safely, and speak credibly about MySQL vs PostgreSQL trade-offs from real project exposure.

Mark progress with `[x]` as you master each topic.

---

## Learning objectives

By the end of this section you should be able to:

1. Model entities and relations correctly, including eager/lazy trade-offs.
2. Use the repository pattern and `QueryBuilder` appropriately, and know when to reach for each.
3. Explain the migration workflow and why `synchronize: true` is dangerous in production.
4. Detect and fix the N+1 query problem with concrete before/after examples.
5. Implement transactions correctly, including isolation-level awareness.
6. Speak to MySQL vs PostgreSQL differences you actually hit (VetApp = MySQL legacy, freelance work spans both).

---
