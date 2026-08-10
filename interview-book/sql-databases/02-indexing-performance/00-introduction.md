# 02-indexing-performance — Introduction

> Source: `interview-prep/sql-databases/02-indexing-performance.md`

02 - Indexing & Performance

Goal: Explain how indexes actually work, read a query plan well enough to spot a missing index or a sequential scan, and diagnose the N+1 problem you are very likely to hit with an ORM like TypeORM - at senior depth.

Mark progress with [x] as you master each topic.

---

Learning objectives

By the end of this chapter you should be able to:

1. Explain what a B-tree index is and why it speeds up lookups and range scans.
2. Explain the difference between a clustered/primary key index and a secondary index (and how this differs between MySQL InnoDB and Postgres).
3. Design composite indexes correctly using the leftmost-prefix rule.
4. Explain covering indexes and index-only scans at a high level.
5. Read the shape of an `EXPLAIN` / `EXPLAIN ANALYZE` output and identify a sequential/full table scan vs an index scan.
6. Explain why indexes are not free (write cost, storage cost, planner cost).
7. Identify and fix the N+1 query problem, including how it shows up specifically with TypeORM relations.
8. Reason out loud about a slow-query scenario using a repeatable method.

---
