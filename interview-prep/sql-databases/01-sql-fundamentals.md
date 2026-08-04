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

## 1. SELECT basics and logical query order

### Topics to learn
- [ ] SELECT list, column aliasing
- [ ] WHERE filtering (comparison, `IN`, `BETWEEN`, `LIKE`, `IS NULL`)
- [ ] ORDER BY (single/multi column, ASC/DESC, NULLS FIRST/LAST awareness)
- [ ] LIMIT/OFFSET (and `FETCH FIRST` awareness for standard SQL / MySQL/Postgres differences)
- [ ] DISTINCT vs GROUP BY for de-duplication
- [ ] The logical order SQL executes in, which is NOT the order you type it in

### The logical order of operations

You write a query top to bottom like this:

```sql
SELECT ...
FROM ...
JOIN ...
WHERE ...
GROUP BY ...
HAVING ...
ORDER BY ...
LIMIT ...
```

But the database logically evaluates it in a different order:

1. `FROM` / `JOIN` - build the working row set
2. `WHERE` - filter rows before grouping
3. `GROUP BY` - collapse rows into groups
4. `HAVING` - filter groups after aggregation
5. `SELECT` - compute the output columns/aliases
6. `DISTINCT` - de-duplicate resulting rows
7. `ORDER BY` - sort the result
8. `LIMIT` / `OFFSET` - cut down the final row count

### Why this matters in interviews

This single fact explains a whole family of "gotcha" questions:
- You cannot use a `SELECT` column alias in `WHERE` (WHERE runs before SELECT is evaluated) but you usually CAN use it in `ORDER BY` (runs after SELECT) - though behavior for `GROUP BY`/`HAVING` aliasing varies by database.
- `WHERE` cannot filter on aggregate results (`WHERE COUNT(*) > 5` is invalid) - that is exactly what `HAVING` is for.
- `LIMIT` is applied last, after sorting, which is why "top N" queries always need an `ORDER BY` to be deterministic.

### Model spoken answer

"SQL reads top-down when you write it, but the engine evaluates it logically as FROM/JOIN, WHERE, GROUP BY, HAVING, SELECT, DISTINCT, ORDER BY, LIMIT. That's why you can't filter on an aggregate in WHERE - the aggregate doesn't exist yet at that stage - you need HAVING. And it's why LIMIT without ORDER BY gives you an arbitrary, non-deterministic 'top N'."

### Example

```sql
SELECT p.name, p.species
FROM pets p
WHERE p.species = 'Dog'
ORDER BY p.birth_date DESC
LIMIT 10;
```

"Get the 10 youngest dogs." Read it as: filter to dogs, sort newest birth date first, take 10.

---

## 2. JOIN types

### Topics to learn
- [ ] INNER JOIN
- [ ] LEFT (OUTER) JOIN / RIGHT (OUTER) JOIN
- [ ] FULL OUTER JOIN (Postgres yes, MySQL: emulate with UNION of LEFT + RIGHT)
- [ ] CROSS JOIN
- [ ] SELF JOIN
- [ ] Multi-table joins and join order intuition
- [ ] Filtering in ON vs WHERE for outer joins (a classic trap)

### Mental model

Think of a join as: take every row from the left table, try to find matching row(s) in the right table using the ON condition, then decide what to do when there is no match.

| Join type | Unmatched left rows | Unmatched right rows |
|---|---|---|
| INNER JOIN | dropped | dropped |
| LEFT JOIN | kept, right columns NULL | dropped |
| RIGHT JOIN | dropped | kept, left columns NULL |
| FULL OUTER JOIN | kept, right columns NULL | kept, left columns NULL |
| CROSS JOIN | every row x every row (Cartesian product) | every row x every row |

### Example: INNER JOIN

"List every appointment with the pet's name and the vet's name."

```sql
SELECT a.id, p.name AS pet_name, v.full_name AS vet_name, a.scheduled_at
FROM appointments a
INNER JOIN pets p ON p.id = a.pet_id
INNER JOIN vets v ON v.id = a.vet_id;
```

Only appointments that have both a valid pet and a valid vet appear. If a pet was deleted (and the FK allowed it), that appointment silently disappears from this result - a common bug source.

### Example: LEFT JOIN

"List every pet, and their most recent appointment if they have one - including pets with none."

```sql
SELECT p.name, a.scheduled_at
FROM pets p
LEFT JOIN appointments a ON a.pet_id = p.id;
```

Pets with zero appointments still show up, with `a.scheduled_at` as NULL.

### The classic outer join trap: ON vs WHERE

```sql
-- BUG: this silently turns the LEFT JOIN into an INNER JOIN
SELECT p.name, a.scheduled_at
FROM pets p
LEFT JOIN appointments a ON a.pet_id = p.id
WHERE a.status = 'completed';
```

Because `WHERE a.status = 'completed'` runs after the join and NULL never equals `'completed'`, every pet with no appointments gets filtered out entirely - defeating the purpose of the LEFT JOIN. The fix is to move the condition into the ON clause:

```sql
SELECT p.name, a.scheduled_at
FROM pets p
LEFT JOIN appointments a
  ON a.pet_id = p.id AND a.status = 'completed';
```

This is one of the highest-signal "do you actually understand joins" interview traps. Know it cold.

### SELF JOIN example

"Find pairs of appointments for the same pet on the same day (double-booking check)."

```sql
SELECT a1.id AS appointment_1, a2.id AS appointment_2, a1.pet_id
FROM appointments a1
JOIN appointments a2
  ON a1.pet_id = a2.pet_id
  AND a1.id < a2.id
  AND DATE(a1.scheduled_at) = DATE(a2.scheduled_at);
```

The `a1.id < a2.id` trick avoids matching a row with itself and avoids duplicate mirrored pairs.

### Model spoken answer

"INNER JOIN only keeps rows with a match on both sides. LEFT JOIN keeps every row from the left table even without a match, filling the right side with NULLs. A very common bug is putting a filter on the right table's column in WHERE instead of ON for an outer join - that silently converts it back into an inner join because WHERE runs after the join and NULL fails any equality comparison. I always put the right-table filter condition inside the ON clause when I want to preserve unmatched left rows."

---

## 3. GROUP BY, aggregation, and HAVING

### Topics to learn
- [ ] Aggregate functions: COUNT, SUM, AVG, MIN, MAX
- [ ] COUNT(*) vs COUNT(column) vs COUNT(DISTINCT column)
- [ ] GROUP BY with multiple columns
- [ ] HAVING vs WHERE
- [ ] Every non-aggregated SELECT column must appear in GROUP BY (strict SQL mode)
- [ ] GROUP BY with JOIN (fan-out risk before aggregating)

### WHERE vs HAVING

| | WHERE | HAVING |
|---|---|---|
| Runs | before grouping | after grouping |
| Filters | individual rows | groups (post-aggregation) |
| Can reference aggregates? | no | yes |
| Typical use | `WHERE status = 'active'` | `HAVING COUNT(*) > 3` |

### Example

"Which vets have handled more than 20 completed appointments?"

```sql
SELECT v.full_name, COUNT(*) AS completed_count
FROM appointments a
JOIN vets v ON v.id = a.vet_id
WHERE a.status = 'completed'
GROUP BY v.id, v.full_name
HAVING COUNT(*) > 20
ORDER BY completed_count DESC;
```

Walk through it out loud: filter rows to completed appointments first (WHERE, cheap, before aggregation), group by vet, count rows per group, then keep only groups with more than 20 (HAVING, after aggregation), then sort.

### COUNT gotchas

```sql
COUNT(*)              -- counts all rows, including NULLs in any column
COUNT(some_column)    -- counts rows where some_column IS NOT NULL
COUNT(DISTINCT col)   -- counts unique non-NULL values of col
```

Interview trap: "how many pets have had at least one appointment" is NOT `SELECT COUNT(*) FROM appointments` (that counts appointments, not distinct pets, and double counts pets with multiple visits). It is:

```sql
SELECT COUNT(DISTINCT pet_id) FROM appointments;
```

### The join-before-aggregate fan-out trap

If you join `appointments` to `payments` (one appointment can have multiple payment rows, e.g. partial payments) and then try to SUM something from `appointments` in the same query, the join fan-out inflates the row count and the sum will be wrong. Fix: aggregate one side first (as a subquery or CTE) before joining, or aggregate carefully with DISTINCT-aware logic.

```sql
-- WRONG-ish: if a pet has 3 appointments and 2 payments each,
-- naive joins can double count if you are not careful with what you aggregate.

-- SAFER: pre-aggregate payments per appointment first.
WITH appointment_totals AS (
  SELECT appointment_id, SUM(amount) AS total_paid
  FROM payments
  WHERE status = 'succeeded'
  GROUP BY appointment_id
)
SELECT a.id, a.scheduled_at, COALESCE(t.total_paid, 0) AS total_paid
FROM appointments a
LEFT JOIN appointment_totals t ON t.appointment_id = a.id;
```

### Model spoken answer

"WHERE filters rows before grouping, HAVING filters groups after aggregation - so if my condition involves an aggregate function like COUNT or SUM, it has to go in HAVING. I'm also careful about COUNT(*) versus COUNT(DISTINCT column) - they answer different questions - and about join fan-out: if I join a one-to-many relationship before aggregating, I can silently inflate a SUM, so I usually pre-aggregate the many side in a CTE before joining it back."

---

## 4. NULL semantics (three-valued logic)

### Topics to learn
- [ ] NULL means "unknown," not "empty" or "zero"
- [ ] Any arithmetic or comparison with NULL yields NULL (which is treated as not-true in WHERE)
- [ ] `= NULL` and `<> NULL` never match anything - must use `IS NULL` / `IS NOT NULL`
- [ ] `NOT IN (subquery containing NULL)` returns zero rows - a very common bug
- [ ] `COALESCE(a, b, c)` - first non-NULL value
- [ ] `NULLIF(a, b)` - NULL if a = b, else a (useful for avoiding divide-by-zero)
- [ ] NULLs are excluded from most aggregate calculations except COUNT(*)
- [ ] Sorting NULLs (`NULLS FIRST` / `NULLS LAST` in Postgres; MySQL sorts NULL as smallest by default)

### Three-valued logic

SQL has TRUE, FALSE, and UNKNOWN. Any comparison involving NULL evaluates to UNKNOWN, and WHERE only keeps rows where the condition is TRUE (UNKNOWN is treated like FALSE for filtering purposes).

```sql
NULL = NULL       -- UNKNOWN (not TRUE!)
NULL <> 5         -- UNKNOWN
NOT UNKNOWN       -- still UNKNOWN
```

### The NOT IN + NULL trap (very high interview signal)

```sql
-- Intent: find owners who have never had an appointment
SELECT * FROM owners
WHERE id NOT IN (
  SELECT owner_id FROM pets WHERE owner_id IS NULL OR TRUE -- imagine this subquery can return a NULL
);
```

If the subquery used by `NOT IN` returns even one NULL value, the entire `NOT IN` expression returns zero rows for every outer row - because `x <> NULL` is UNKNOWN, and `UNKNOWN AND ... AND UNKNOWN` can never be TRUE across a list that includes NULL. This silently breaks "find things NOT in this list" queries.

Fix: use `NOT EXISTS` instead, which handles NULLs correctly:

```sql
SELECT o.* FROM owners o
WHERE NOT EXISTS (
  SELECT 1 FROM pets p WHERE p.owner_id = o.id
);
```

**Rule of thumb interviewers love to hear:** "I avoid `NOT IN` with subqueries that could contain NULL - I use `NOT EXISTS` instead, since it's NULL-safe and often has a better query plan anyway."

### COALESCE and NULLIF in practice

```sql
-- Default a missing phone to 'N/A'
SELECT full_name, COALESCE(phone, 'N/A') AS phone FROM owners;

-- Safe division: avoid divide-by-zero when total appointments is 0
SELECT vet_id, SUM(amount) / NULLIF(COUNT(*), 0) AS avg_amount
FROM payments GROUP BY vet_id;
```

### Model spoken answer

"NULL represents unknown, not zero or empty string, and SQL uses three-valued logic - TRUE, FALSE, UNKNOWN. Any comparison with NULL is UNKNOWN, which WHERE treats as not-a-match, so you always use IS NULL / IS NOT NULL rather than `= NULL`. The trap I actively watch for is NOT IN against a subquery that might return NULL - if it does, the whole NOT IN silently returns no rows. I prefer NOT EXISTS for 'not in this set' logic because it's NULL-safe."

---

## 5. Subqueries: scalar, correlated, IN/EXISTS, and CTEs

### Topics to learn
- [ ] Scalar subquery (returns one value, used like a column)
- [ ] Correlated subquery (references the outer query's row)
- [ ] IN vs EXISTS vs JOIN, and when to prefer each
- [ ] Common Table Expressions (`WITH ... AS (...)`) for readability
- [ ] Recursive CTEs at a high level (hierarchies, org charts)
- [ ] When a subquery should really be a JOIN

### Scalar subquery example

```sql
SELECT p.name,
  (SELECT COUNT(*) FROM appointments a WHERE a.pet_id = p.id) AS visit_count
FROM pets p;
```

This runs once per outer row conceptually (correlated) - fine for small data, but can be slower than an equivalent JOIN + GROUP BY for large tables since many engines execute it per-row rather than set-based, though modern optimizers often rewrite it.

### Same query as a JOIN (usually preferred at scale)

```sql
SELECT p.name, COUNT(a.id) AS visit_count
FROM pets p
LEFT JOIN appointments a ON a.pet_id = p.id
GROUP BY p.id, p.name;
```

### EXISTS vs IN

```sql
-- IN: good when the subquery returns a small, NULL-free set
SELECT * FROM pets WHERE owner_id IN (SELECT id FROM owners WHERE full_name LIKE 'A%');

-- EXISTS: good default for "related row exists" checks, NULL-safe, often better optimized
SELECT * FROM pets p WHERE EXISTS (
  SELECT 1 FROM appointments a WHERE a.pet_id = p.id AND a.status = 'completed'
);
```

`EXISTS` only cares whether at least one row is returned - it does not materialize or compare actual values - which is why it tends to short-circuit efficiently and why it is NULL-safe compared to `NOT IN`.

### CTEs for readability

```sql
WITH completed_appointments AS (
  SELECT * FROM appointments WHERE status = 'completed'
),
vet_totals AS (
  SELECT vet_id, COUNT(*) AS total
  FROM completed_appointments
  GROUP BY vet_id
)
SELECT v.full_name, t.total
FROM vet_totals t
JOIN vets v ON v.id = t.vet_id
ORDER BY t.total DESC;
```

CTEs are named, readable building blocks. They do not always guarantee a performance benefit (in Postgres, versions before 12 always materialized CTEs as an optimization fence; 12+ can inline them) - but they are a huge win for interview communication: they let you narrate your query step by step.

### Recursive CTE (awareness level)

```sql
-- Example: an org chart / category tree pattern (not in VetApp schema, generic)
WITH RECURSIVE org_chart AS (
  SELECT id, name, manager_id, 1 AS depth
  FROM employees
  WHERE manager_id IS NULL
  UNION ALL
  SELECT e.id, e.name, e.manager_id, oc.depth + 1
  FROM employees e
  JOIN org_chart oc ON e.manager_id = oc.id
)
SELECT * FROM org_chart ORDER BY depth;
```

You do not need to be a recursive CTE expert, but you should be able to say what it is for: walking hierarchical/tree-shaped data (categories, org charts, comment threads) that a normal GROUP BY cannot express.

### Model spoken answer

"I reach for a JOIN by default because it's set-based and usually the most efficient and readable option. I use EXISTS for 'does a related row exist' checks because it's NULL-safe and short-circuits. I avoid NOT IN with subqueries for the NULL reason. I use CTEs to break a complex query into named, readable steps, especially when I'm going to explain the query out loud or when later steps depend on an intermediate aggregation."

---

## 6. Set operations

### Topics to learn
- [ ] UNION vs UNION ALL (de-duplication cost)
- [ ] INTERSECT
- [ ] EXCEPT (Postgres) / MINUS (Oracle) - MySQL added EXCEPT/INTERSECT in 8.0.31+
- [ ] Column count/type compatibility requirement

### Example

```sql
-- All emails that are either owners or vets (deduplicated)
SELECT email FROM owners
UNION
SELECT email FROM vet_contact_emails;

-- Same, but keep duplicates (cheaper, no implicit sort/dedupe)
SELECT email FROM owners
UNION ALL
SELECT email FROM vet_contact_emails;
```

Rule of thumb: default to `UNION ALL` unless you specifically need de-duplication - `UNION` does an implicit distinct pass, which costs a sort/hash operation you don't always need.

---

## 7. Window functions (high-value, often underused by mid-level candidates)

### Topics to learn
- [ ] `OVER (PARTITION BY ... ORDER BY ...)`
- [ ] ROW_NUMBER() vs RANK() vs DENSE_RANK()
- [ ] LAG() / LEAD() for comparing to previous/next row
- [ ] Running totals with SUM() OVER (...)
- [ ] "Top N per group" pattern

### Why window functions matter here

Window functions let you compute aggregates without collapsing rows - each input row stays, but gets an extra computed column. This is the cleanest way to answer "top N per group" and "running total" questions that a GROUP BY alone cannot express in one pass.

### Top N per group example

"Find each vet's 3 most recent appointments."

```sql
SELECT *
FROM (
  SELECT a.*,
    ROW_NUMBER() OVER (PARTITION BY a.vet_id ORDER BY a.scheduled_at DESC) AS rn
  FROM appointments a
) ranked
WHERE rn <= 3;
```

`PARTITION BY vet_id` restarts the numbering for each vet; `ORDER BY scheduled_at DESC` numbers the newest appointment 1 within each vet's partition.

### RANK vs DENSE_RANK vs ROW_NUMBER

| Function | Ties behavior | Example ranks for [100, 90, 90, 80] |
|---|---|---|
| ROW_NUMBER() | always unique, arbitrary tie-break | 1, 2, 3, 4 |
| RANK() | ties share rank, gap after | 1, 2, 2, 4 |
| DENSE_RANK() | ties share rank, no gap | 1, 2, 2, 3 |

### Running total example

"Show each wallet's transactions with a running balance."

```sql
SELECT wallet_id, created_at, amount,
  SUM(amount) OVER (PARTITION BY wallet_id ORDER BY created_at
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_balance
FROM transactions
ORDER BY wallet_id, created_at;
```

### Model spoken answer

"When I need 'top N per group' or a running total without collapsing rows, I reach for window functions - ROW_NUMBER with PARTITION BY for top-N-per-group, and SUM() OVER (... ORDER BY ...) for running totals. Compared to a self-join or correlated subquery, they're usually more readable and let the engine compute everything in one pass."

---

## 8. A repeatable method for live SQL interview questions

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

## Interview question bank (with answer targets)

### Core syntax
1. **What is the logical order of SQL clause execution?** -> FROM/JOIN, WHERE, GROUP BY, HAVING, SELECT, DISTINCT, ORDER BY, LIMIT.
2. **Difference between WHERE and HAVING?** -> row filter before grouping vs group filter after aggregation.
3. **Difference between INNER and LEFT JOIN?** -> matched-only vs all-left-rows-with-NULL-fill.
4. **Why does putting a right-table filter in WHERE break a LEFT JOIN?** -> WHERE runs after the join; NULL fails the comparison, silently dropping unmatched left rows.
5. **COUNT(*) vs COUNT(column) vs COUNT(DISTINCT column)?** -> all rows vs non-NULL values vs unique non-NULL values.

### NULL handling
6. **Why doesn't `column <> NULL` work?** -> three-valued logic; use IS NOT NULL.
7. **Why can NOT IN silently return zero rows?** -> if the subquery contains a NULL, every comparison becomes UNKNOWN; use NOT EXISTS instead.
8. **What does COALESCE do? NULLIF?** -> first non-NULL value; NULL-if-equal (handy for safe division).

### Joins & subqueries
9. **When would you use EXISTS instead of IN?** -> existence checks, NULL-safety, short-circuiting.
10. **When would you use a CTE instead of a subquery?** -> readability, reusing an intermediate result multiple times, narrating multi-step logic.
11. **What is a self join, and give an example use case.** -> comparing rows in the same table, e.g. double-booking detection, org hierarchy one level at a time.
12. **How do you find duplicate rows in a table?**

```sql
SELECT email, COUNT(*)
FROM owners
GROUP BY email
HAVING COUNT(*) > 1;
```

13. **How do you find the second-highest value (e.g. second highest payment amount)?**

```sql
SELECT MAX(amount) FROM payments
WHERE amount < (SELECT MAX(amount) FROM payments);

-- or, more general (Nth highest), with window functions:
SELECT amount FROM (
  SELECT amount, DENSE_RANK() OVER (ORDER BY amount DESC) AS rnk
  FROM payments
) t WHERE rnk = 2;
```

14. **How would you find owners who have never booked an appointment?**

```sql
SELECT o.* FROM owners o
LEFT JOIN pets p ON p.owner_id = o.id
LEFT JOIN appointments a ON a.pet_id = p.id
WHERE a.id IS NULL;
```

### Window functions
15. **RANK vs DENSE_RANK vs ROW_NUMBER?** -> see table above.
16. **How do you get the top 3 most recent appointments per vet?** -> ROW_NUMBER() with PARTITION BY, filtered in an outer query.
17. **How do you compute a running total?** -> SUM() OVER (PARTITION BY ... ORDER BY ... ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW).

### Set operations
18. **UNION vs UNION ALL?** -> de-duplicated (costs a sort/hash) vs raw concatenation (cheaper).

---

## Hands-on drills (do these, do not just read them)

- [ ] Write the LEFT JOIN + WHERE bug on paper, then fix it by moving the condition to ON. Say out loud why it was wrong.
- [ ] Write a query to find the 3 pets with the most appointments (GROUP BY + ORDER BY + LIMIT).
- [ ] Rewrite the same "top 3 pets" query using RANK() so ties are handled explicitly - discuss the difference from LIMIT.
- [ ] Write a query using NOT EXISTS to find vets who have never had a completed appointment.
- [ ] Write a CTE-based query that computes total paid per appointment, then joins it back to show appointments with less than full payment.
- [ ] Write a running-balance query for a wallet's transactions using a window function.
- [ ] Explain, without looking, why `NOT IN` with a NULL-containing subquery breaks.

---

## Senior red flags / green flags

### Green flags interviewers love
- Narrating the join-then-filter mental model instead of guessing syntax.
- Catching the ON-vs-WHERE outer join trap unprompted.
- Distinguishing COUNT(*) from COUNT(DISTINCT ...) without being asked.
- Reaching for window functions instead of a convoluted self-join for "top N per group."
- Saying "I'd check the query plan" when asked about performance, instead of guessing blindly.

### Red flags
- Using `SELECT *` in a query meant to demonstrate precision.
- Not knowing why `= NULL` fails.
- Writing `NOT IN` against a possibly-NULL subquery without flagging the risk.
- Confusing WHERE and HAVING under pressure.
- Treating every problem as needing a subquery when a JOIN is simpler.

---

## Tie-backs to your experience (use in answers)

- On VetApp you wrote REST APIs backed by a real MySQL database with related entities (owners, pets, vets, appointments, medical records, payments) - almost identical in shape to the examples in this chapter. You can honestly say "I wrote queries very close to this shape in production for appointment scheduling and payment records."
- Preserving compatibility with an existing MySQL database while rebuilding the backend in NestJS meant you had to read and reason about an existing schema, not just design one from scratch - a very real, very senior skill interviewers respect.
- Payment processing (Bank of Georgia integration) means you have real context for "what happens with a payment status field and how do you query it safely" type questions.

---

## Senior-Level Best Practices

### Decision framework: when to reach for a JOIN vs a subquery vs a CTE vs a window function
- Need every input row preserved with an extra computed value (ranking, running total, comparison to neighboring rows)? -> window function.
- Need to combine rows from two tables into one result set, row-for-row? -> JOIN.
- Need a named, reusable intermediate result to make a multi-step query readable, or to avoid repeating the same aggregation? -> CTE.
- Need a yes/no existence check, ideally NULL-safe? -> EXISTS.
- Reach for a subquery only when a JOIN or CTE would not clearly be simpler - "can I write this as a JOIN" is a good default sanity check before reaching for a nested SELECT.
- Need set-difference logic ("in A but not in B")? -> NOT EXISTS by default, LEFT JOIN ... WHERE right.id IS NULL as a common readable alternative; avoid NOT IN unless the right-hand set is provably NULL-free.

### Production checklist for hand-written queries going into a live codebase
- [ ] No SELECT * in production code paths - name columns explicitly so the query stays a covering-index candidate and doesn't silently break when the table gains a column.
- [ ] Every LIMIT is paired with an ORDER BY - an unordered LIMIT is non-deterministic and will eventually produce a support ticket ("why did page 2 show me a row from page 1").
- [ ] Any NOT IN against a subquery has been reviewed and replaced with NOT EXISTS unless the subquery is provably NULL-free.
- [ ] Money/quantity columns are DECIMAL/NUMERIC, never FLOAT/DOUBLE.
- [ ] Any join across a one-to-many relationship followed by an aggregate has been checked for fan-out - pre-aggregate the many side in a CTE first.
- [ ] Pagination for anything user-facing uses keyset pagination (`WHERE id > :lastId ORDER BY id LIMIT n`) once OFFSET gets past a few thousand rows, since OFFSET still has to scan and discard every skipped row.
- [ ] Every query that filters on a date/timestamp range uses half-open bounds (`>= start AND < end`) instead of `BETWEEN`, avoiding off-by-one-day bugs at range boundaries.
- [ ] Column and table names are consistent (singular vs plural, snake_case) across the schema - a small thing that compounds into real confusion once a schema has 40+ tables.

### Anti-patterns and failure modes
| Anti-pattern | Why it fails in production | Fix |
|---|---|---|
| Implicit cross join (comma-separated FROM with no ON) | Silent Cartesian product, correct-looking on small test data, catastrophic on real data | Always use explicit JOIN ... ON |
| Business logic encoded as magic string comparisons (`status = 'A'`) | Unreadable, easy to typo, no single source of truth | Enum/lookup table plus named constants in application code |
| Deep OFFSET pagination on a hot endpoint | O(offset) cost per page; page 500 is dramatically slower than page 1 | Keyset/cursor pagination |
| Filtering rows in application code after fetching with no WHERE clause | Pulls the whole table over the network just to discard most of it | Push the filter into SQL |
| Trusting `LIMIT 1` without `ORDER BY` to mean "the latest" | Arbitrary row, not the latest one | Always pair with an explicit ORDER BY on a timestamp/id |
| Using `BETWEEN` for datetime ranges | Silently excludes/includes boundary timestamps depending on precision | Half-open range: `>= start AND < end` |
| Concatenating user input directly into SQL strings | SQL injection | Parameterized queries / prepared statements / ORM query builder, always |

### Observability for query-level issues
- Log slow queries (Postgres `log_min_duration_statement`, MySQL slow query log) and review them weekly, not just when something breaks.
- Track p95/p99 query latency per endpoint, not just averages - a single slow outlier query can be masked by a fast average across many cached hits.
- Alert on a sudden spike in rows examined vs rows returned (a proxy for "something just started doing a full scan").
- Track the ratio of queries that hit a cache/read replica vs the primary, so a sudden shift toward the primary is visible before it becomes a capacity incident.
- Correlate slow-query spikes with recent deploys/migrations in your dashboards - most regressions in query shape trace back to a specific code change, not gradual drift.

### Scalability and team practices
- Put query intent in a comment when the SQL itself can't express *why* (e.g. "intentionally UNION ALL, duplicates are expected here because...") - the "what" is in the SQL, the "why" belongs in a comment or PR description.
- Review raw SQL and query-builder code in PRs with the same scrutiny as application logic - a bad JOIN is a production incident waiting to happen, not a style nit.
- Establish a house style early (e.g. "always EXISTS over IN for subqueries," "always alias every table") so reviews focus on logic, not bikeshedding syntax.
- Keep a living "query patterns" doc per major domain (payments, scheduling) so new team members reuse proven, reviewed query shapes instead of re-deriving fan-out/NULL bugs from scratch.

### Worked scenario: reviewing a "find inactive customers" query in a PR
A teammate submits this for review: "customers who haven't ordered in the last 90 days":

```sql
SELECT * FROM customers
WHERE id NOT IN (SELECT customer_id FROM orders WHERE created_at >= NOW() - INTERVAL '90 days');
```

Walk through the review out loud, step by step:
1. **Selectivity/output check** - `SELECT *` should become an explicit column list; ask what the caller actually needs.
2. **NULL risk** - is `orders.customer_id` ever NULL (e.g. a guest checkout order)? If it can be, this `NOT IN` silently returns zero rows for every customer. Flag it immediately.
3. **Propose the fix** - rewrite as `NOT EXISTS` so NULLs can't poison the result:
```sql
SELECT c.id, c.full_name, c.email FROM customers c
WHERE NOT EXISTS (
  SELECT 1 FROM orders o
  WHERE o.customer_id = c.id AND o.created_at >= NOW() - INTERVAL '90 days'
);
```
4. **Index check** - confirm `orders(customer_id, created_at)` exists, since the correlated subquery needs to seek this efficiently per customer.
5. **Scale check** - ask how many customers/orders this runs against and how often; a nightly batch job tolerates a slower plan that a live API endpoint would not.
6. **Alternative framing** - if this needs to run frequently and fast, consider whether a `last_ordered_at` column maintained on write (denormalized) would serve the hot path better than recomputing it from `orders` every time, and say so as a deliberate trade-off, not a default.
7. **Sign off with a comment explaining why**, not just "changed to NOT EXISTS" - the "why" is what actually teaches the author something for next time.

### Senior follow-up Q&A
1. **A junior engineer's PR has `SELECT * FROM orders o, customers c WHERE o.customer_id = c.id`. What do you say in review?** -> Ask them to rewrite it as an explicit `INNER JOIN ... ON`, name the exact columns needed instead of `*`, and explain that comma-join syntax with a missing WHERE condition is exactly how accidental Cartesian products happen - it's not wrong here because the WHERE is present, but the implicit style invites future mistakes and hides intent.
2. **How would you paginate a "load more" feed for a table with tens of millions of rows, and why not just use OFFSET?** -> Use keyset pagination: order by a stable, indexed column (id or created_at+id tiebreaker), and filter `WHERE (created_at, id) < (:lastSeenCreatedAt, :lastSeenId)`. OFFSET-based pagination degrades linearly because the database still has to walk and discard every skipped row even with an index, so deep pages get progressively slower; keyset pagination's cost stays roughly constant regardless of page depth.
3. **Someone wants to add a `NOT IN (SELECT ...)` to a report query. How do you push back?** -> Ask whether the subquery's column could ever be NULL. If there's any doubt, insist on NOT EXISTS instead, since a single NULL in the NOT IN subquery silently returns zero rows for the entire outer query - a bug that's easy to miss in testing (test data rarely has that NULL) and painful to diagnose in production (the query "just returns nothing" with no error).
4. **How do you review a query for "will this get slow as the table grows" before it ever ships?** -> Ask for the expected row count in a year, check the WHERE/JOIN/ORDER BY columns against existing indexes, mentally simulate the leftmost-prefix rule, and if in doubt, ask for an EXPLAIN against a realistic data volume (or a production-like staging copy) rather than trusting how fast it feels against a nearly-empty dev database.
5. **What's your policy on writing raw SQL vs using an ORM's query builder for something like a monthly reporting query?** -> For read-heavy analytical queries with joins/aggregations that need to be reasoned about precisely (correctness, index usage), I prefer raw SQL or a query builder's raw-escape hatch over heavy ORM abstractions, since ORMs can generate subtly inefficient SQL for complex aggregations, and a raw query is easier to hand to EXPLAIN and reason about directly.
6. **How would you teach a mid-level engineer to "think in sets" instead of "think in loops" when writing SQL?** -> Give them a concrete before/after: show the loop-per-row version (fetch a list, then query per item for related data) next to the single-JOIN or single-aggregate version, and have them count round trips for each as data grows from 10 rows to 10,000. The visceral "1 query vs 10,001 queries" comparison teaches the set-based mindset faster than any abstract explanation of relational theory.

---

## Mastery checklist

- [ ] I can explain logical query execution order without hesitating.
- [ ] I can explain and demonstrate the outer-join ON-vs-WHERE trap.
- [ ] I can explain why NOT IN breaks with NULLs and default to NOT EXISTS.
- [ ] I can write a GROUP BY + HAVING query live without looking anything up.
- [ ] I can write a top-N-per-group query using a window function.
- [ ] I can narrate my query-writing process out loud in a structured way.
