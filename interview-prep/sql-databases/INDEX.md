Index

SQL / Databases Interview Prep - Index

Detailed study guides split by topic. Built around your CV stack: PostgreSQL, MySQL, TypeORM, and the backend work you did on VetApp (NestJS + TypeORM rebuilding a PHP backend on top of an existing MySQL database), plus general full-stack freelance work using PostgreSQL and MySQL.

Total: 5 chapters, deep study-guide depth (not outlines).

Mark progress in each file with [ ] -> [x].

---

Chapters

| # | File | Focus |
|---|---|---|
| 01 | 01-sql-fundamentals.md | SELECT, JOIN types, GROUP BY, HAVING, NULL semantics, aggregations, subqueries, CTEs, set operations, window functions, writing queries interview-style |
| 02 | 02-indexing-performance.md | B-tree indexes, composite index order, covering indexes, EXPLAIN / EXPLAIN ANALYZE, N+1 problem with ORMs, query tuning mindset |
| 03 | 03-transactions-consistency.md | ACID, isolation levels, dirty/non-repeatable/phantom reads, locking, deadlocks, TypeORM transactions |
| 04 | 04-postgres-vs-mysql.md | Practical Postgres vs MySQL differences, data types, TypeORM mapping notes, engine-specific gotchas |
| 05 | 05-interview-questions.md | SQL question bank + schema design drills for EasyPay (fintech) and VetApp (clinic) style domains |

---

Why this track matters for you

Your CV lists SQL (PostgreSQL, MySQL) as a core language skill, and your backend project (VetApp) required you to:
- Rebuild a PHP backend in NestJS while preserving compatibility with an existing MySQL database (schema archaeology, not greenfield design).
- Design REST APIs with NestJS, TypeORM, JWT, and Swagger.
- Implement appointment scheduling, veterinary records, file uploads, and payment processing (Bank of Georgia integration) - all of which are relational-data-heavy features with real constraints (foreign keys, transactions, status fields, timestamps).

Interviewers will assume: if you touched a real production MySQL database and shipped a payments-adjacent feature, you should be comfortable with joins, transactions, indexing basics, and explaining trade-offs - not just "I used an ORM and it worked."

---

Suggested study order (any day)

1. 01 Fundamentals - the bread and butter; most interviews start here with a live query or two.
2. 05 Interview Questions - do the schema design + query drills early so you know your gaps, then go back to the theory chapters.
3. 02 Indexing & Performance - the most common "how would you make this faster" senior follow-up.
4. 03 Transactions & Consistency - ACID / isolation levels are a classic "do you actually understand databases" filter.
5. 04 Postgres vs MySQL - polish chapter; great for "which database would you choose and why" questions.

---

Daily drill (any day)

1. Pick one chapter.
2. Read the topics and check off what you can already teach out loud.
3. Answer 5 interview questions with no notes, ideally saying them out loud.
4. Write one SQL query from memory against the VetApp or EasyPay schema (see chapter 05).
5. Write down weak spots for the next pass.

---

How to use each chapter

1. Read explanations.
2. Check off `[ ]` topics you can already teach.
3. Answer the interview questions without notes.
4. Do the drills - actually type the SQL, do not just read it.
5. Rehearse the "model spoken answer" out loud until it sounds natural, not memorized.

---

Progress tracker

- [ ] 01 SQL Fundamentals
- [ ] 02 Indexing & Performance
- [ ] 03 Transactions & Consistency
- [ ] 04 Postgres vs MySQL
- [ ] 05 Interview Questions
