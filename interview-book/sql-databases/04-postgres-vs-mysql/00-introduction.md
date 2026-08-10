# Generate a migration from entity changes (compares current schema to entities) — Introduction

> Source: `interview-prep/sql-databases/04-postgres-vs-mysql.md`

04 - Postgres vs MySQL (Practical Differences)

Goal: Answer "which database would you choose, and why" and "what differences have you run into between Postgres and MySQL" with concrete, practical answers grounded in your own projects (VetApp on MySQL, freelance work spanning both), plus know how these differences show up in TypeORM configuration.

Mark progress with [x] as you master each topic.

---

Learning objectives

By the end of this chapter you should be able to:

1. Explain the licensing/history context briefly (both open source, different governance) without getting lost in trivia.
2. Compare core data types side by side (auto-increment, JSON, arrays, enums, booleans).
3. Explain storage engine concepts: MySQL's pluggable engines (InnoDB) vs Postgres's single unified engine with extensions.
4. Compare case sensitivity, string comparison, and identifier quoting defaults.
5. Compare indexing and full-text search capabilities at a high level.
6. Explain replication/high-availability at an awareness level for both.
7. Explain how TypeORM configuration and decorators differ (or don't) between the two, and what "synchronize" and migrations mean in practice.
8. Give a reasoned, opinionated answer to "which would you pick for a new project" without being dogmatic.

---
