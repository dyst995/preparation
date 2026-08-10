# 08. A repeatable method for live SQL interview questions

> Source: `interview-prep/sql-databases/01-sql-fundamentals.md`

When an interviewer gives you a schema and asks you to write a query, use this method out loud:

1. **Restate the question** in your own words ("So you want, for each vet, the count of completed appointments in the last 30 days, right?").
2. **Identify the tables involved** and how they relate (foreign keys).
3. **Decide the join type** - do you need to keep rows with no match (LEFT JOIN) or only matched rows (INNER JOIN)?
4. **Decide filter vs aggregate filter** - does this belong in WHERE (row-level) or HAVING (group-level)?
5. **Write it incrementally** - start with the FROM/JOIN, run it mentally, add WHERE, then GROUP BY, then SELECT list, then ORDER BY/LIMIT last.
6. **Sanity check NULLs and duplicates** - could a join fan out rows? Could NULL break a NOT IN or a WHERE filter?
7. **State the Big-O / index angle briefly** if asked - "this would benefit from an index on appointments(vet_id, scheduled_at)."

This narrated process is often worth more than a perfect query - it shows you think like an engineer, not someone who memorized syntax.

---
