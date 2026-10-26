# DB01 — SQL and relational foundations

PostgreSQL 16 unless a question says otherwise. Questions DB-001–DB-050.

These questions cover what a statement means: relations, keys, joins, grouping, subqueries, common table expressions, constraints, and nulls. Index structure, MVCC, and isolation levels are later files.

Schemas below are hypothetical. Every result follows from the rows written in that question. A result with no `ORDER BY` is a set of rows; display order is not part of the answer unless the query sorts.

### DB-001 — A SQL table is a bag of rows

**Difficulty:** Intermediate

**Category:** Relational model

**Question:**

What is a relation, and what does a PostgreSQL table actually store?

**Context and Constraints:**

Answer for one session and one statement. Do not appeal to physical row order on disk. Use this table:

```sql
CREATE TABLE reading (
  meter integer,
  value numeric
);

INSERT INTO reading (meter, value) VALUES
  (1, 10),
  (1, 10);
```

**Senior Engineer's Answer:**

A relation is a set of tuples over a set of named attributes. Each attribute has a domain. Set semantics give three consequences: no duplicate tuples, no defined order of tuples, and the attributes are identified by name.

A PostgreSQL table is a bag, also called a multiset. It will store both `reading` rows. `SELECT COUNT(*) FROM reading` returns one row, and that row's count is 2. Nothing in the table definition says those two rows are the same fact, so the database keeps both.

`SELECT meter, value FROM reading UNION SELECT meter, value FROM reading` returns one row, `(1, 10)`, because `UNION` removes duplicates. The same inputs combined with `UNION ALL` return four rows: each side contributes the two stored rows, and duplicates stay. `UNION` is the relational union. The table is not.

Column order is part of the SQL table and not part of the relation. `INSERT INTO reading VALUES (10, 1)` writes `meter = 10` and `value = 1` because values bind by position. `INSERT INTO reading VALUES (1, 10)` writes the opposite assignment. Naming the columns makes the statement follow the attribute, which is the relational idea.

`SELECT value FROM reading` with no `ORDER BY` returns both values, each 10. Their sequence in the client is not a result property. Any order you saw last time can change after an analyze, a rewrite, or a version upgrade, and the statement did not promise it.

Domains show up in SQL as types plus constraints. `numeric` rejects `'Ada'`. It still accepts a negative reading. If a negative reading is not in the domain, that rule is a `CHECK` constraint, not a property of the word "relation."

**Practical Implementation:**

```sql
SELECT COUNT(*) AS stored_rows
FROM reading;

SELECT COUNT(*) AS union_rows
FROM (
  SELECT meter, value FROM reading
  UNION
  SELECT meter, value FROM reading
) AS deduped;

SELECT COUNT(*) AS union_all_rows
FROM (
  SELECT meter, value FROM reading
  UNION ALL
  SELECT meter, value FROM reading
) AS kept;
```

`stored_rows` is 2, `union_rows` is 1, and `union_all_rows` is 4.

**Trade-offs and Alternatives:**

Declare a key when the business fact is unique. `PRIMARY KEY (meter)` would reject the second insert, and the table would then behave like a set for that attribute. Leave the table keyless when the row is an event that may repeat, and use `UNION` only where the query result must be a set.

`SELECT DISTINCT` is the same duplicate removal on one input. It belongs on a query whose meaning is a set. It is a poor patch for a join that multiplied rows; the multiplication is still the meaning of that join.

**Common Mistakes:**

- Treating the order returned by a query without `ORDER BY` as stable.
- Inserting by position after a column is added in the middle of the table.
- Expecting the second identical `INSERT` to be ignored when no key exists.
- Calling `UNION ALL` and `UNION` interchangeable. They differ as soon as a duplicate tuple exists.

**Senior-Level Follow-up:**

If two sessions insert the same `(meter, value)` at the same time, what does the table guarantee?

**Answer:** With no key, both inserts can commit and the bag contains both rows. A primary key or unique constraint makes one of them fail with `unique_violation` (`23505`). Which session fails depends on which statement commits the key first. That scheduling is a transaction topic; the constraint outcome is the one this question owns.

### DB-002 — Superkeys, candidate keys, and the primary key

**Difficulty:** Intermediate

**Category:** Keys

**Question:**

Define superkey, candidate key, primary key, and alternate key for this table. Which declarations match the rules?

**Context and Constraints:**

A room is identified by its building and room number. The display name is also unique and always present. Both rules are given as true for this example.

```sql
CREATE TABLE room (
  building_id integer NOT NULL,
  room_no integer NOT NULL,
  name text NOT NULL,
  PRIMARY KEY (building_id, room_no),
  CONSTRAINT room_name_key UNIQUE (name)
);
```

**Senior Engineer's Answer:**

A superkey is a set of columns whose values identify at most one row. A candidate key is a minimal superkey: drop any column and it is no longer a superkey. The primary key is the one candidate key declared as `PRIMARY KEY`. The other candidate keys are alternate keys, declared `UNIQUE` here.

`(building_id, room_no)` is a candidate key because the pair is unique and neither column alone is. `(name)` is a second candidate key because `name` is unique and not null. `(building_id, room_no, name)` is a superkey and not a candidate key, because `(building_id, room_no)` is already enough.

A primary key forces `NOT NULL` on every column in it. A `UNIQUE` constraint does not. `UNIQUE (name)` plus `name text NOT NULL` is what makes `name` a real alternate key. `UNIQUE` alone would still allow many null names, which is a different rule and is covered on its own later.

The table can have one primary key and many unique constraints. Foreign keys need a primary key or a unique constraint as their target. They can target `room_name_key` or the primary key. They cannot target a bag of columns that is only "usually unique."

**Practical Implementation:**

```sql
INSERT INTO room (building_id, room_no, name) VALUES
  (1, 101, 'East lab'),
  (1, 102, 'West lab');

-- succeeds: same building, different number and name
-- fails: same (building_id, room_no)
INSERT INTO room (building_id, room_no, name) VALUES
  (1, 101, 'North lab');

-- fails: same name, different room
INSERT INTO room (building_id, room_no, name) VALUES
  (2, 101, 'East lab');
```

After the successful insert the table contains exactly `(1, 101, 'East lab')` and `(1, 102, 'West lab')`. Each failed statement stores nothing.

**Trade-offs and Alternatives:**

Pick the primary key as the target other tables should store. Keep the other candidate as `UNIQUE` so the business rule is still enforced. A surrogate key is a third option when both natural keys are awkward to copy around; that choice is the next question.

Naming the constraints (`room_pkey` is PostgreSQL's default for the primary key, and `room_name_key` is named above) makes the `23505` error say which rule failed.

**Common Mistakes:**

- Calling every unique column a primary key. A table has one primary key.
- Declaring `UNIQUE (building_id, room_no, name)` and believing the room pair is protected. Two rows can share `(1, 101)` if their names differ.
- Forgetting `NOT NULL` on an alternate key and then being surprised that two unlabeled rooms are allowed.
- Matching a foreign key to a prefix of the primary key. A foreign key on `(building_id)` does not match `PRIMARY KEY (building_id, room_no)`.

**Senior-Level Follow-up:**

Is `(building_id, name)` a candidate key here?

**Answer:** It is a superkey, because `name` alone is already unique, so the pair cannot repeat. It is not a candidate key, because dropping `building_id` still leaves a superkey. Minimality is the whole difference.

### DB-003 — Choosing the primary key is a contract

**Difficulty:** Staff-Level

**Category:** Keys

**Question:**

The business says email is unique. Should `email` be the primary key of `customer`?

**Context and Constraints:**

Email can be corrected. Customer ids will be stored in URLs, in exported files, and in at least one other database's foreign key. PostgreSQL 16. The table is new, so you can choose the key before any row exists. You are not choosing an index type.

**Senior Engineer's Answer:**

Uniqueness is necessary and not sufficient. The primary key is the identifier other rows store, so the property you need is immutability for as long as those references live.

Email fails that test under the stated rule that a person can correct it. `ON UPDATE CASCADE` can rewrite child foreign keys inside this database. It does not rewrite a URL already sent, a warehouse that copied the key, or a row in another service. Updating the primary key is then a migration across those copies, not an `UPDATE`.

Use a surrogate primary key with no business meaning, and declare email as `NOT NULL UNIQUE`. Correcting the address updates one column. Child rows keep `customer.id`. The unique constraint still rejects two customers with the same email.

`bigint GENERATED ALWAYS AS IDENTITY` is the SQL identity column. On a new table the default starts at 1, so the first committed insert of an email stores id 1. Identity values are not reused when an insert rolls back: the next successful insert can store 2 while one row is visible. That gap is not a missing customer. `GENERATED ALWAYS` rejects an explicit id unless the statement says `OVERRIDING SYSTEM VALUE`. `GENERATED BY DEFAULT` allows an explicit id and still fills the column when the insert omits it.

A natural primary key is the right contract when the identifier is immutable by domain, such as an ISO currency code you do not invent. Email is not that kind of value here.

**Practical Implementation:**

```sql
CREATE TABLE customer (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email text NOT NULL,
  CONSTRAINT customer_email_key UNIQUE (email)
);

INSERT INTO customer (email) VALUES ('ada@ex.com');

-- rejected: identity is GENERATED ALWAYS
INSERT INTO customer (id, email) VALUES (5, 'lin@ex.com');

INSERT INTO customer (id, email)
OVERRIDING SYSTEM VALUE
VALUES (5, 'lin@ex.com');
```

The first insert stores `(1, 'ada@ex.com')` on a new table whose identity has never been advanced. The second insert is rejected. The third stores `(5, 'lin@ex.com')`.

**Trade-offs and Alternatives:**

A natural key makes dumps and joins readable, and it avoids a lookup when the caller already holds that key. The cost is cascade and external coupling when the value changes. A surrogate key is opaque. Callers must join or select `email` to show a person. That extra column in the query is cheaper than re-identifying a customer across systems.

`serial` is an integer column with a sequence default. It is not an identity constraint. Prefer identity on new tables. Either way, do not use the numeric value as a count of customers.

**Common Mistakes:**

- Making a mutable business field the primary key because it is unique today.
- Inferring "email can never change" from `UNIQUE`. The constraint says two rows cannot share the current value. It does not say the value is permanent.
- Inserting identity values from the application and then colliding with `GENERATED ALWAYS`.
- Treating a gap after a rollback as a bug in the insert.

**Senior-Level Follow-up:**

A client asks for `POST /customers` to accept the id they minted offline. What do you allow?

**Answer:** Allow it only as an explicit import path that uses `OVERRIDING SYSTEM VALUE` or `GENERATED BY DEFAULT`, with the unique constraint still enforced. The ordinary create path omits `id` and lets identity assign it. Two writers minting ids without a shared generator will collide, and the constraint will reject one of them. The API should not pretend those client ids are the default contract.

### DB-004 — Comparisons with NULL yield unknown

**Difficulty:** Senior

**Category:** Nulls and three-valued logic

**Question:**

What does `NULL = NULL` return, and which rows does this `WHERE` keep?

**Context and Constraints:**

```sql
SELECT n
FROM (VALUES (1), (2), (NULL::integer)) AS v(n)
WHERE n <> 1;
```

PostgreSQL 16. The application language's `null == null` is not the database rule.

**Senior Engineer's Answer:**

SQL predicates have three results: true, false, and unknown. A comparison with `=` or `<>` is unknown when either side is null. `NULL = NULL` is unknown. `1 = NULL` is unknown. `1 <> NULL` is unknown. `NOT` of unknown is unknown.

`WHERE` keeps a row only when the predicate is true. False and unknown both drop the row. In the query above, `1 <> 1` is false, `2 <> 1` is true, and `NULL <> 1` is unknown. The result contains one row, `2`. The null input is absent. That absence does not mean the comparison was false.

`AND` and `OR` follow the same three values. `FALSE AND unknown` is false. `TRUE AND unknown` is unknown. `TRUE OR unknown` is true. `FALSE OR unknown` is unknown. A filter written as `status <> 'closed' OR status IS NULL` is how you keep the null status on purpose. `status <> 'closed'` alone drops it.

`IS NULL` and `IS NOT NULL` are two-valued. `NULL IS NULL` is true. `IS NOT DISTINCT FROM` is the equality that treats null as a value: `NULL IS NOT DISTINCT FROM NULL` is true, and `1 IS NOT DISTINCT FROM NULL` is false. `IS DISTINCT FROM` is the matching inequality.

String concatenation uses the same null rule. `'paid-' || NULL` is null, so a missing suffix wipes the prefix. `concat('paid-', NULL)` ignores the null argument and returns `paid-`. Pick the one the label requires.

**Practical Implementation:**

```sql
SELECT
  x,
  y,
  (x = y) AS sql_equal,
  (x IS NOT DISTINCT FROM y) AS same_value
FROM (VALUES
  (1, 1),
  (1, 2),
  (1, NULL::integer),
  (NULL::integer, NULL::integer)
) AS pairs(x, y);
```

| x | y | sql_equal | same_value |
|---|---|---|---|
| 1 | 1 | true | true |
| 1 | 2 | false | false |
| 1 | NULL | NULL | false |
| NULL | NULL | NULL | true |

The two `NULL` results in `sql_equal` are unknown, not false.

```sql
SELECT n
FROM (VALUES (1), (2), (NULL::integer)) AS v(n)
WHERE n IS DISTINCT FROM 1;
```

This returns `2` and `NULL`.

**Trade-offs and Alternatives:**

Store a real domain value when "missing" and "not applicable" need different behavior. `NULL` is one marker, and every predicate must say what it does with it. A sentinel such as `0` or `''` avoids three-valued logic and invents a value that can pass a `CHECK`, a join, or a sum. Use it only when that sentinel is a genuine member of the domain.

`COALESCE(status, 'open')` is a display or a deliberate default. Applied inside a filter, it turns unknown into a comparison with the default, which answers a different question.

**Common Mistakes:**

- Telling the interviewer that `NULL <> 1` is false. The result is unknown, and `WHERE` then rejects the row.
- Expecting `NULL = NULL` inside a `JOIN` to match. It does not. Two null foreign keys do not join to each other.
- Writing `WHERE NOT (status = 'closed')` and expecting null statuses to survive. `NOT` unknown is unknown, so they are dropped.
- Building a label with `||` and getting a null label from one null fragment.

**Senior-Level Follow-up:**

What does `CHECK (amount > 0)` do with a null `amount`? Do not write the constraint yet; state the predicate result.

**Answer:** `NULL > 0` is unknown. `CHECK` accepts true and unknown, so the row passes. `WHERE amount > 0` would reject that same row. `NOT NULL` is the constraint that rejects the null. The full constraint question is later in this file; the logic split is this one.

### DB-005 — NOT IN drops the whole result when the subquery yields NULL

**Difficulty:** Advanced

**Category:** Nulls and three-valued logic

**Question:**

Which applicant ids does this query return? Why?

**Context and Constraints:**

```sql
CREATE TABLE applicant (
  id integer PRIMARY KEY,
  email text
);

INSERT INTO applicant (id, email) VALUES
  (1, 'a@ex.com'),
  (2, 'b@ex.com'),
  (3, NULL);

CREATE TABLE blocked (
  email text
);

INSERT INTO blocked (email) VALUES
  ('b@ex.com'),
  (NULL);
```

```sql
SELECT a.id
FROM applicant AS a
WHERE a.email NOT IN (SELECT b.email FROM blocked AS b);
```

`email` is nullable on both tables. No `ORDER BY` is required; name the ids in the result.

**Senior Engineer's Answer:**

The result contains no rows.

`NOT IN` is an `ALL` inequality: `a.email` must be distinct from every selected `blocked.email` under `<>`. Unknown fails that test.

- `'a@ex.com' <> 'b@ex.com'` is true, and `'a@ex.com' <> NULL` is unknown. The row is not kept.
- `'b@ex.com' <> 'b@ex.com'` is false. The row is not kept.
- `NULL <> 'b@ex.com'` and `NULL <> NULL` are both unknown. The row is not kept.

One null inside the subquery is enough to make every outer `NOT IN` unknown, including emails that are not `'b@ex.com'`.

The predicate that matches "no blocked row equals this email" is `NOT EXISTS`. Equality never comes out true for the null pair, so a null blocked email does not count as a match:

```sql
SELECT a.id
FROM applicant AS a
WHERE NOT EXISTS (
  SELECT 1
  FROM blocked AS b
  WHERE b.email = a.email
);
```

On these rows that returns ids 1 and 3. Id 2 is excluded because `'b@ex.com'` matches. Id 3 is kept because a null applicant email is not equal to any blocked email. If the product rule is "must have a real email that is absent from the block list," add `a.email IS NOT NULL` and the result is only id 1.

**Practical Implementation:**

```sql
SELECT a.id
FROM applicant AS a
WHERE NOT EXISTS (
  SELECT 1
  FROM blocked AS b
  WHERE b.email = a.email
)
ORDER BY a.id;
```

Result ids: 1, then 3.

**Trade-offs and Alternatives:**

`NOT EXISTS` and a `LEFT JOIN` anti-join express the same absence check. `NOT IN` is readable when the subquery is a non-null list of values you typed, such as `status NOT IN ('draft', 'void')`. It is the wrong shape when the subquery reads a nullable column.

An empty block list is a different predicate again: `x NOT IN (empty)` is true for every `x`, including null, because `IN` over no rows is false and `NOT` of false is true. The null disaster needs a null inside a non-empty subquery, or a null compared with some actual value.

**Common Mistakes:**

- Reading an empty `NOT IN` result as "every applicant is blocked." Id 1 is not blocked. The predicate never became true.
- Fixing it with `COALESCE(b.email, '')`. That turns a null into a real address and can match or exclude the wrong people.
- Adding `DISTINCT` inside the subquery. Duplicates were never the problem. The null was.

**Senior-Level Follow-up:**

Same applicants. First, `blocked` is empty. Second, `blocked` contains only `'b@ex.com'`. What does the original `NOT IN` return in each case?

**Answer:** With no blocked rows, `NOT IN` returns ids 1, 2, and 3. With only `'b@ex.com'`, it returns id 1. Id 2 is a real match. Id 3 is dropped because `NULL <> 'b@ex.com'` is unknown. The outer null is dropped as soon as there is any inner value to compare with, even when no inner value is null.

### DB-006 — COUNT(*) counts rows; COUNT(column) skips nulls

**Difficulty:** Senior

**Category:** Aggregation

**Question:**

What does each count return?

**Context and Constraints:**

```sql
CREATE TABLE sale (
  id integer PRIMARY KEY,
  region text NOT NULL,
  amount numeric
);

INSERT INTO sale (id, region, amount) VALUES
  (1, 'east', 10),
  (2, 'east', 10),
  (3, 'west', NULL),
  (4, 'west', 5);
```

```sql
SELECT
  COUNT(*) AS n_rows,
  COUNT(amount) AS n_amount,
  COUNT(*) FILTER (WHERE amount IS NOT NULL) AS n_amount_filter,
  COUNT(DISTINCT amount) AS n_distinct_amount,
  COUNT(DISTINCT region) AS n_region
FROM sale;
```

**Senior Engineer's Answer:**

The query returns one row:

| n_rows | n_amount | n_amount_filter | n_distinct_amount | n_region |
|---:|---:|---:|---:|---:|
| 4 | 3 | 3 | 2 | 2 |

`COUNT(*)` counts rows in the input. The null amount is a row, so it counts 4. `COUNT(amount)` counts rows where `amount` is not null, so the west null drops out and the count is 3. `COUNT(*) FILTER (WHERE amount IS NOT NULL)` is the same count of 3. `FILTER` is the general form; `COUNT(column)` is the common case of "the expression is not null."

`COUNT(DISTINCT amount)` counts distinct non-null values. The two 10s collapse, the null is ignored, and 5 remains, so the result is 2. `COUNT(DISTINCT region)` is 2 because the regions are `east` and `west`.

`COUNT(1)` returns the same 4 as `COUNT(*)`. There is no semantic difference. Do not claim one is faster from the text of the query.

With no `GROUP BY`, an aggregate query still returns one row when the input is empty. `COUNT(*)` on zero rows is 0. `SUM(amount)` on zero rows is null, not 0. `COALESCE` around that sum is a product decision that the missing total means zero.

**Practical Implementation:**

Use the `SELECT` in the question. To count priced sales and distinct prices per region without dropping the null row from `COUNT(*)`:

```sql
SELECT
  region,
  COUNT(*) AS n_rows,
  COUNT(amount) AS n_priced,
  COUNT(DISTINCT amount) AS n_prices
FROM sale
GROUP BY region
ORDER BY region;
```

| region | n_rows | n_priced | n_prices |
|---|---:|---:|---:|
| east | 2 | 2 | 1 |
| west | 2 | 1 | 1 |

**Trade-offs and Alternatives:**

`COUNT(*) FILTER (WHERE amount > 5)` counts the east row of 10 only, because `5 > 5` is false and `NULL > 5` is unknown. That is a conditional count, not `COUNT(amount)`. Use `FILTER` when the condition is about the value, and `COUNT(column)` when the only condition is presence.

**Common Mistakes:**

- Hearing "nulls are ignored by aggregates" and applying it to `COUNT(*)`. Row count includes nulls. `SUM`, `AVG`, `COUNT(column)`, and `COUNT(DISTINCT column)` skip nulls.
- Expecting `COUNT(DISTINCT amount)` to count a null as its own distinct value. It does not. `SELECT DISTINCT amount` does return a null row; `COUNT(DISTINCT amount)` does not count it.
- Replacing `SUM(amount)` with 0 in the application whenever the driver shows null, including when the table is empty and zero would be a lie.

**Senior-Level Follow-up:**

`SELECT COUNT(*) FROM sale WHERE amount > 5` returns what?

**Answer:** 2. The stored amounts are 10, 10, null, and 5. Both 10s satisfy `amount > 5`. `5 > 5` is false. `NULL > 5` is unknown, so `WHERE` drops that row. Two rows remain, and `COUNT(*)` counts them.

### DB-007 — An inner join keeps only matched rows

**Difficulty:** Intermediate

**Category:** Joins

**Question:**

Which rows does this inner join return?

**Context and Constraints:**

```sql
CREATE TABLE customer (
  id integer PRIMARY KEY,
  name text NOT NULL
);

CREATE TABLE order_header (
  id integer PRIMARY KEY,
  customer_id integer NOT NULL,
  total numeric NOT NULL
);

INSERT INTO customer (id, name) VALUES
  (10, 'Ada'),
  (20, 'Grace'),
  (40, 'Lin');

INSERT INTO order_header (id, customer_id, total) VALUES
  (1, 10, 50),
  (2, 20, 80),
  (3, 30, 10);
```

```sql
SELECT c.name, o.id AS order_id
FROM customer AS c
JOIN order_header AS o ON o.customer_id = c.id
ORDER BY o.id;
```

`JOIN` with no qualifier means `INNER JOIN`. Customer 30 is not in `customer`. Lin has no order.

**Senior Engineer's Answer:**

The result is:

| name | order_id |
|---|---:|
| Ada | 1 |
| Grace | 2 |

The `ON` predicate is true for order 1 with Ada and order 2 with Grace. Order 3 compares `30 = c.id` against 10, 20, and 40, all false, so it disappears. Lin never finds an order, so she disappears. An inner join returns the intersection.

`ON` uses the same equality as `WHERE`. A null `customer_id` would not match a null `customer.id`, and it would not match a non-null id either. This schema forbids that null with `NOT NULL`, so the only misses are the missing customer and the customer with no order.

The join is many-to-one here only because each listed order matches one customer. If Ada had two orders, Ada's name would appear twice. That duplication is the join working. `DISTINCT` would hide it.

**Practical Implementation:**

The query in the question is the implementation. The matched keys are `customer_id` and `customer.id`. Select the columns you mean and alias `order_header.id`, because both tables have an `id`.

**Trade-offs and Alternatives:**

A comma in `FROM customer AS c, order_header AS o` with a predicate in `WHERE` is an inner join written in the old style. Omit that predicate and PostgreSQL returns the Cartesian product: 3 customers times 3 orders, 9 rows. `FROM customer AS c JOIN order_header AS o` with no `ON` is a syntax error. Prefer the explicit `JOIN` so a missing condition fails at parse time.

`NATURAL JOIN` matches every shared column name. On these two tables the only shared name is `id`, so the condition becomes `c.id = o.id`. None of 10, 20, or 40 equals 1, 2, or 3. The natural join returns no rows. Adding a later column with the same name on both tables would change the condition without a change to the join line.

**Common Mistakes:**

- Explaining Lin's absence as a filter bug. There is no match, so an inner join is the wrong operator if Lin must appear.
- Using `NATURAL JOIN` because the column you care about happens to share a name today.
- Joining `o.id = c.id` out of habit when the foreign key is `customer_id`. On this data that join is empty.
- Quoting a result order without `ORDER BY`. This query sorts by `o.id`, so the order Ada then Grace is part of the result.

**Senior-Level Follow-up:**

How many rows is `FROM customer AS c CROSS JOIN order_header AS o`?

**Answer:** 9. Each of the 3 customers is paired with each of the 3 orders. `CROSS JOIN` is the product you want for a generated grid. An accidental product is the comma form with the condition left out.

### DB-008 — A left join keeps every left row

**Difficulty:** Senior

**Category:** Joins

**Question:**

What does this left join return, and which customers would an inner join have dropped?

**Context and Constraints:**

Same rows as a standalone script:

```sql
CREATE TABLE customer (
  id integer PRIMARY KEY,
  name text NOT NULL
);

CREATE TABLE order_header (
  id integer PRIMARY KEY,
  customer_id integer NOT NULL,
  total numeric NOT NULL
);

INSERT INTO customer (id, name) VALUES
  (10, 'Ada'),
  (20, 'Grace'),
  (40, 'Lin');

INSERT INTO order_header (id, customer_id, total) VALUES
  (1, 10, 50),
  (2, 20, 80),
  (3, 30, 10);
```

```sql
SELECT c.name, o.id AS order_id
FROM customer AS c
LEFT JOIN order_header AS o ON o.customer_id = c.id
ORDER BY c.id, o.id;
```

**Senior Engineer's Answer:**

`LEFT JOIN` preserves every row of the left input. Where the `ON` predicate finds no partner, the right-hand columns are null.

| name | order_id |
|---|---:|
| Ada | 1 |
| Grace | 2 |
| Lin | NULL |

Lin is the preserved unmatched customer. `order_id` is null because that column came from `order_header`, not because Lin's id is null. Order 3 is still absent: a left join from `customer` does not invent a customer for an orphan order.

An inner join on the same `ON` predicate would return only Ada and Grace. The left join is the query you write when the question is "every customer, with an order if they have one."

If Ada had two orders, she would appear twice and Lin once with a null order. Preservation does not mean one output row per left key when the right side matches many times.

**Practical Implementation:**

```sql
SELECT c.id, c.name, o.id AS order_id, o.total
FROM customer AS c
LEFT JOIN order_header AS o ON o.customer_id = c.id
ORDER BY c.id, o.id NULLS LAST;
```

The extra selected columns for Lin are null `order_id` and null `total`. `NULLS LAST` is explicit; it does not change which rows exist.

**Trade-offs and Alternatives:**

Start from the table whose rows must survive. If the question is "every order, even when the customer row is missing," `order_header` is the left input. Preserving both sides is a full outer join.

A later `INNER JOIN` in the same `FROM` list can throw away the preserved rows. Joins associate left to right, so `customer LEFT JOIN order_header JOIN payment` is a left join whose result is then inner-joined to `payment`.

**Common Mistakes:**

- Testing `o.customer_id IS NULL` to find customers with no orders, while `customer_id` is the join key and is also nullable on a different schema. Test the right-hand primary key: `o.id IS NULL`. On this schema both tests happen to agree, because a match implies a non-null `customer_id`. They stop agreeing if you test a nullable payload column such as a note.
- Reading the null `order_id` as "the order id is unknown in the business." It means "this join supplied no order row."
- Dropping Lin in the client by skipping objects with a null `order_id`, which silently turns the left join back into an inner join.

**Senior-Level Follow-up:**

Add `payment (id, invoice_id, amount)` with one row `(100, 1, 50)`. What does this return?

```sql
SELECT c.name
FROM customer AS c
LEFT JOIN order_header AS o ON o.customer_id = c.id
JOIN payment AS p ON p.invoice_id = o.id;
```

**Answer:** It returns one row, `Ada`. The `JOIN payment` is an inner join of the left join's output. Grace's order 2 has no payment. Lin's `o.id` is null, and `p.invoice_id = NULL` is unknown. Both are removed. Parenthesize if the left side must survive:

```sql
SELECT c.name, o.id AS order_id
FROM customer AS c
LEFT JOIN (
  order_header AS o
  JOIN payment AS p ON p.invoice_id = o.id
) ON o.customer_id = c.id
ORDER BY c.id;
```

That returns Ada with order 1, and Grace and Lin with a null `order_id`. The inner join of `order_header` to `payment` yields only order 1. Grace and Lin do not match that row, so the left join keeps them.

### DB-009 — A right join is a left join with the inputs swapped

**Difficulty:** Intermediate

**Category:** Joins

**Question:**

Rewrite this `RIGHT JOIN` as a `LEFT JOIN`. Does the set of `(name, order_id)` rows change?

**Context and Constraints:**

```sql
CREATE TABLE customer (
  id integer PRIMARY KEY,
  name text NOT NULL
);

CREATE TABLE order_header (
  id integer PRIMARY KEY,
  customer_id integer NOT NULL,
  total numeric NOT NULL
);

INSERT INTO customer (id, name) VALUES
  (10, 'Ada'),
  (20, 'Grace'),
  (40, 'Lin');

INSERT INTO order_header (id, customer_id, total) VALUES
  (1, 10, 50),
  (2, 20, 80),
  (3, 30, 10);
```

```sql
SELECT c.name, o.id AS order_id
FROM order_header AS o
RIGHT JOIN customer AS c ON o.customer_id = c.id
ORDER BY c.id, o.id NULLS LAST;
```

**Senior Engineer's Answer:**

A `RIGHT JOIN` preserves the right input and null-extends the left input when `ON` is not true. Here the preserved table is `customer`. The result is Ada with order 1, Grace with order 2, and Lin with a null `order_id`.

The rewrite swaps the inputs and uses `LEFT JOIN`. The preserved table stays `customer`:

```sql
SELECT c.name, o.id AS order_id
FROM customer AS c
LEFT JOIN order_header AS o ON o.customer_id = c.id
ORDER BY c.id, o.id NULLS LAST;
```

The `(name, order_id)` rows are the same three. Changing only the keyword and leaving `order_header` on the left does not preserve `customer`:

```sql
SELECT c.name, o.id AS order_id
FROM order_header AS o
LEFT JOIN customer AS c ON o.customer_id = c.id
ORDER BY o.id;
```

That preserves orders instead. The rows are Ada/1, Grace/2, and a null name with order 3. Lin is gone. The flip is the inputs plus the keyword.

`SELECT *` is a separate difference. A right join lists `order_header`'s columns first. The swapped left join lists `customer`'s columns first. The named select list above hides that. `SELECT *` does not.

PostgreSQL accepts `RIGHT JOIN`. Hand-written SQL is easier to read with the preserved table on the left, because `FROM` then starts with the grain of the report. Generated SQL often emits `RIGHT JOIN` when a query builder appends the preserved table on the right. The optimizer may still reorder the physical join. The written form is what fixes which unmatched rows survive.

**Practical Implementation:**

Use the left-join form in the answer when you control the SQL. Keep the `ON` predicate attached to the same columns.

**Trade-offs and Alternatives:**

`RIGHT JOIN` and `LEFT JOIN` are one outer-join operator with a preserved side. `FULL OUTER JOIN` is not a flipped left join. Flipping a full join changes nothing about which side survives, because both sides survive. A chain of mixed left and right joins is hard to read; rewrite it so every preserved side is the left input, and parenthesize inner joins that must not discard those rows.

**Common Mistakes:**

- Changing `RIGHT` to `LEFT` and leaving the `FROM` order alone.
- Assuming `SELECT *` is identical after the rewrite.
- Using a right join in the middle of a left-join chain and then guessing which customers remain. Rewrite it before you reason about the nulls.

**Senior-Level Follow-up:**

Does `USING` or a column alias change which side is preserved?

**Answer:** No. Preservation is the join type and the input positions. `USING` only merges the join columns into one output column. An alias does not change matching. `ON o.customer_id = c.id` after a correct swap is the same match as before.

### DB-010 — A full outer join keeps unmatched rows from both sides

**Difficulty:** Senior

**Category:** Joins

**Question:**

When is a full outer join the operator that matches the question, and what does it return here?

**Context and Constraints:**

```sql
CREATE TABLE customer (
  id integer PRIMARY KEY,
  name text NOT NULL
);

CREATE TABLE order_header (
  id integer PRIMARY KEY,
  customer_id integer NOT NULL,
  total numeric NOT NULL
);

INSERT INTO customer (id, name) VALUES
  (10, 'Ada'),
  (20, 'Grace'),
  (40, 'Lin');

INSERT INTO order_header (id, customer_id, total) VALUES
  (1, 10, 50),
  (2, 20, 80),
  (3, 30, 10);
```

```sql
SELECT c.name, o.id AS order_id
FROM customer AS c
FULL JOIN order_header AS o ON o.customer_id = c.id
ORDER BY c.id NULLS LAST, o.id NULLS LAST;
```

`FULL JOIN` and `FULL OUTER JOIN` are the same syntax.

**Senior Engineer's Answer:**

Use a full outer join when both inputs can lack a partner and the report must show both kinds of orphan. A left join from `customer` hides order 3. A left join from `order_header` hides Lin. The full join keeps both.

| name | order_id |
|---|---:|
| Ada | 1 |
| Grace | 2 |
| Lin | NULL |
| NULL | 3 |

`ORDER BY c.id NULLS LAST, o.id NULLS LAST` puts the orphan order last. The four rows are the result; the sort only makes the order defined.

If the product rule is "every customer, and ignore orders whose customer row is gone," the full join is the wrong operator. It would surface order 3, which that rule excludes. If the rule is "every order, and ignore customers who never ordered," start from `order_header` and left-join, or inner-join when missing customers should fail the row.

A full join still multiplies. Two orders for Ada would produce two Ada rows plus Lin plus the orphan order. It does not produce one reconciliation row per key unless each side is already one row per key.

**Practical Implementation:**

Orphans only, without the matched pairs:

```sql
SELECT c.name, NULL::integer AS order_id
FROM customer AS c
WHERE NOT EXISTS (
  SELECT 1 FROM order_header AS o WHERE o.customer_id = c.id
)
UNION ALL
SELECT NULL::text, o.id
FROM order_header AS o
WHERE NOT EXISTS (
  SELECT 1 FROM customer AS c WHERE c.id = o.customer_id
);
```

On these rows the result contains `('Lin', NULL)` and `(NULL, 3)`. The casts give the two branches a text column and an integer column. `UNION ALL` is correct because a customer id cannot equal an order id in this predicate; the two branches are disjoint by construction.

**Trade-offs and Alternatives:**

The `UNION ALL` form answers "what failed to match." The full join answers "the whole picture, matched and unmatched." Building the full picture by `UNION ALL` of an inner join plus both anti-joins works and is harder to read than `FULL JOIN`. Use that expansion when you must attach different literals to matches, left orphans, and right orphans.

**Common Mistakes:**

- Using a full join for a customer list and then paging in the application. Orphan orders consume pages.
- Forgetting that both name and order id can be null, and dereferencing both in the client.
- Writing `WHERE c.id IS NOT NULL AND o.id IS NOT NULL` afterward. That deletes both orphan kinds and leaves an inner join.
- Expecting null customer 30 to appear as a customer. No customer attributes exist for that id. The order row is what survives.

**Senior-Level Follow-up:**

Both tables gain a `note text` that is null on every current row. Someone adds `AND c.note IS NOT DISTINCT FROM o.note` to the `ON` clause. What changes?

**Answer:** Nothing on these rows. All notes are null, and `NULL IS NOT DISTINCT FROM NULL` is true, so the extra predicate is true for every pair that already matched on `customer_id`. The four-row result stands. If one Ada order had a non-null note and the customer note stayed null, that pair would stop matching and Ada would show up as an orphan customer beside an orphan order. `IS NOT DISTINCT FROM` is a real condition, not a decoration, the moment any note is present.

### DB-011 — A WHERE on the outer side discards the preserved row

**Difficulty:** Advanced

**Category:** Joins

**Question:**

Compare the two queries. What does each return?

**Context and Constraints:**

```sql
CREATE TABLE customer (
  id integer PRIMARY KEY,
  name text NOT NULL
);

CREATE TABLE order_header (
  id integer PRIMARY KEY,
  customer_id integer NOT NULL,
  total numeric NOT NULL
);

INSERT INTO customer (id, name) VALUES
  (10, 'Ada'),
  (20, 'Grace'),
  (40, 'Lin');

INSERT INTO order_header (id, customer_id, total) VALUES
  (1, 10, 50),
  (2, 20, 80),
  (3, 30, 10);
```

Query A:

```sql
SELECT c.name, o.id AS order_id
FROM customer AS c
LEFT JOIN order_header AS o
  ON o.customer_id = c.id
 AND o.total >= 80
ORDER BY c.id;
```

Query B:

```sql
SELECT c.name, o.id AS order_id
FROM customer AS c
LEFT JOIN order_header AS o ON o.customer_id = c.id
WHERE o.total >= 80
ORDER BY c.id;
```

**Senior Engineer's Answer:**

`ON` decides whether a right-hand row matches. Rows that match nothing are still preserved by the left join, with nulls on the right. `WHERE` runs after the join and keeps only rows whose predicate is true. A null `total` makes `total >= 80` unknown, so the preserved row dies.

Query A returns:

| name | order_id |
|---|---:|
| Ada | NULL |
| Grace | 2 |
| Lin | NULL |

Ada's only order has total 50, so it fails the match condition. Ada remains, with no order columns. Grace matches order 2. Lin has no order. Order 3 never enters, because its customer is not on the left.

Query B returns one row: Grace, order 2. Ada's joined total is 50, and `50 >= 80` is false. Lin's total is null, and the comparison is unknown. Both rows are removed. The left join's preservation does not survive that `WHERE`.

Put a predicate in `ON` when it describes which right-hand rows are eligible and unmatched left rows must remain. Put it in `WHERE` when a failed test should remove the left row too. "Customers who have an order of at least 80" is query B, or an inner join with the same filter. "Customers, and a high-total order if they have one" is query A.

**Practical Implementation:**

Query A is the implementation for the second sentence. The threshold stays in `ON`:

```sql
SELECT c.name, o.id AS order_id, o.total
FROM customer AS c
LEFT JOIN order_header AS o
  ON o.customer_id = c.id
 AND o.total >= 80
ORDER BY c.id;
```

Ada and Lin have null `total` in that result. Grace's total is 80.

**Trade-offs and Alternatives:**

Filtering orders before the join is the same match as query A when the subquery is the right side:

```sql
LEFT JOIN (
  SELECT id, customer_id, total
  FROM order_header
  WHERE total >= 80
) AS o ON o.customer_id = c.id
```

That form is useful when several predicates belong to the order and the `ON` line is getting hard to read. It is still an outer join. Moving those predicates to the outer `WHERE` recreates query B.

**Common Mistakes:**

- Adding `WHERE o.id IS NOT NULL` to "clean up" a left join and then wondering where Lin went.
- Putting `o.total >= 80` in `WHERE` because the style guide says filters do not belong in `ON`. That guide is about inner joins, where `ON` and `WHERE` select the same rows. For outer joins they do not.
- Testing the bug with customers who all have a qualifying order. The two queries agree on that data and the bug stays hidden.

**Senior-Level Follow-up:**

Query A is changed to `ON o.customer_id = c.id AND c.name <> 'Lin'`. Does Lin appear?

**Answer:** Yes, with a null `order_id`. `c.name <> 'Lin'` is false for Lin, so no order matches her, and the left join preserves her. The predicate is on the preserved table, so it can only stop matches; it cannot remove Lin. To drop Lin you filter `customer` in `WHERE` or in a subquery before the join.

### DB-012 — GROUP BY keys define the groups

**Difficulty:** Senior

**Category:** Grouping

**Question:**

Which of these two queries is legal in PostgreSQL 16, and what does the legal one return?

**Context and Constraints:**

```sql
CREATE TABLE customer (
  id integer PRIMARY KEY,
  name text NOT NULL,
  region text NOT NULL
);

INSERT INTO customer (id, name, region) VALUES
  (10, 'Ada', 'east'),
  (20, 'Grace', 'east'),
  (40, 'Lin', 'west');

CREATE TABLE order_header (
  id integer PRIMARY KEY,
  customer_id integer NOT NULL,
  total numeric NOT NULL
);

INSERT INTO order_header (id, customer_id, total) VALUES
  (1, 10, 50),
  (2, 10, 70),
  (3, 20, 80);
```

Query A:

```sql
SELECT c.region, c.name, SUM(o.total) AS total
FROM customer AS c
JOIN order_header AS o ON o.customer_id = c.id
GROUP BY c.region;
```

Query B:

```sql
SELECT c.id, c.name, SUM(o.total) AS total
FROM customer AS c
JOIN order_header AS o ON o.customer_id = c.id
GROUP BY c.id
ORDER BY c.id;
```

**Senior Engineer's Answer:**

Every selected expression is either grouped, aggregated, or functionally dependent on the group key. PostgreSQL treats a primary key as that proof for the other columns of the same table. It does not accept "the application knows `name` is unique" without a key in the `GROUP BY`.

Query A is illegal. `c.name` is not aggregated and is not determined by `region`. Ada and Grace are both `east`. PostgreSQL reports that `c.name` must appear in the `GROUP BY` clause or be used in an aggregate function. The statement returns no result rows.

Query B is legal. `c.id` is the primary key, so `c.name` is determined. The inner join drops Lin, who has no order. Ada's orders are 50 and 70.

| id | name | total |
|---:|---|---:|
| 10 | Ada | 120 |
| 20 | Grace | 80 |

`GROUP BY c.id, c.name` is also legal, because `name` is grouped directly. You do not need the functional-dependency rule for that form. Rely on the primary key when you omit `name`. If the grouped columns are only a non-primary unique constraint, write the extra columns in the `GROUP BY` instead of guessing that PostgreSQL will infer them.

`GROUP BY 1` groups by the first select expression. It breaks as soon as someone inserts a column in front of the list. Group by names.

**Practical Implementation:**

```sql
SELECT c.id, c.name, SUM(o.total) AS total
FROM customer AS c
JOIN order_header AS o ON o.customer_id = c.id
GROUP BY c.id
ORDER BY c.id;
```

**Trade-offs and Alternatives:**

`DISTINCT ON (c.id)` with `ORDER BY c.id, o.total DESC` keeps one whole order row per customer, which `GROUP BY` does not do unless you aggregate every column. That is a PostgreSQL select form for "first row per group," and the `ORDER BY` is what defines first. Without it, the kept row is not defined.

`GROUP BY ROLLUP (region)` adds a grand-total row. On a sale table of east 10, east 30, and west 5, the grouped sums are east 40, west 5, and a null region with 45. `GROUPING(region)` is 0 on the real regions and 1 on the grand total, which is how you tell a rolled-up null from a stored null region. Use that when the report asked for subtotals. Do not fake the total by a second query unless the two statements are allowed to see different committed data.

**Common Mistakes:**

- Selecting `c.name` while grouping only by `region` and wrapping the query in a view so the error appears far from the report.
- Using `MIN(c.name)` to silence the error. That picks a name alphabetically inside the region and presents it as if it were the region's customer.
- Grouping by `o.customer_id` and selecting `c.name` without grouping by `c.id`. The primary-key proof applies to `customer` when `c.id` is a group key.

**Senior-Level Follow-up:**

Query B becomes a left join from `customer`, still `GROUP BY c.id`. What is Lin's sum?

**Answer:** Lin appears, and `SUM(o.total)` is null. The left join supplies one row with a null `total`, and `SUM` of only nulls is null. It is not 0. `COALESCE(SUM(o.total), 0)` is 0 only if the report defines "no orders" as a zero total.

### DB-013 — WHERE filters rows; HAVING filters groups

**Difficulty:** Senior

**Category:** Grouping

**Question:**

What does this query return, and why is the same predicate illegal in `WHERE` when it uses `SUM`?

**Context and Constraints:**

```sql
CREATE TABLE sale (
  id integer PRIMARY KEY,
  region text NOT NULL,
  amount numeric
);

INSERT INTO sale (id, region, amount) VALUES
  (1, 'east', 10),
  (2, 'east', 30),
  (3, 'west', 5),
  (4, 'west', NULL);
```

```sql
SELECT region, SUM(amount) AS total, COUNT(*) AS n
FROM sale
WHERE amount > 5
GROUP BY region
HAVING SUM(amount) >= 30
ORDER BY region;
```

**Senior Engineer's Answer:**

`WHERE` runs before grouping and cannot contain an aggregate. `HAVING` runs after the group aggregate exists. PostgreSQL rejects `WHERE SUM(amount) >= 30` with the error that aggregate functions are not allowed in `WHERE`.

On the legal query, `amount > 5` keeps the east 10 and the east 30. The west 5 fails `5 > 5`. The west null fails because `NULL > 5` is unknown. West has no remaining rows, so no west group is formed. East sums to 40 and has two rows. `40 >= 30` is true.

| region | total | n |
|---|---:|---:|
| east | 40 | 2 |

`HAVING region = 'east'` would be legal and, for a grouped column, would leave the same groups as `WHERE region = 'east'`. Prefer `WHERE` for a raw-column test so the aggregate input is the rows you already decided to keep. The results match for that kind of predicate; the text of `HAVING` is for predicates that need the aggregate.

A query with `HAVING` and no `GROUP BY` treats the whole input as one group. `SELECT COUNT(*) FROM sale HAVING COUNT(*) > 1` returns one row, 4.

**Practical Implementation:**

```sql
SELECT region, SUM(amount) AS total, COUNT(*) AS n
FROM sale
WHERE amount > 5
GROUP BY region
HAVING SUM(amount) >= 30
ORDER BY region;
```

To keep west visible with a priced-row count, drop the `WHERE` and count with `FILTER`:

```sql
SELECT
  region,
  SUM(amount) AS total,
  COUNT(*) FILTER (WHERE amount > 5) AS n_over_5
FROM sale
GROUP BY region
ORDER BY region;
```

That returns east with total 40 and `n_over_5` 2, and west with total 5 and `n_over_5` 0. `SUM` skips the null. This is a different question: groups survive, and the threshold is inside the aggregate.

**Trade-offs and Alternatives:**

A subquery that filters regions after aggregation is `HAVING` written out:

```sql
SELECT region, total, n
FROM (
  SELECT region, SUM(amount) AS total, COUNT(*) AS n
  FROM sale
  WHERE amount > 5
  GROUP BY region
) AS g
WHERE total >= 30;
```

Same one-row result. Use it when the outer query still has joins to do. Do not wrap it again just to avoid the word `HAVING`.

**Common Mistakes:**

- Putting `SUM` in `WHERE` and reading the error as a parser quirk. The aggregate does not exist yet.
- Assuming west is a group with a null sum. After `WHERE amount > 5`, west contributes no row, so `GROUP BY` never sees it.
- Using `HAVING COUNT(*) > 1` to mean "more than one priced amount." `COUNT(*)` counts the null amount row. `HAVING COUNT(amount) > 1` is the priced-row test. On the unfiltered table, east would pass and west would fail.

**Senior-Level Follow-up:**

Delete the `WHERE` clause and keep `HAVING SUM(amount) >= 30`. What remains?

**Answer:** Still only east, total 40, `n` 2. West's sum is 5 because `SUM` ignores null, and `5 >= 30` is false, so the west group is removed by `HAVING`. The `COUNT(*)` for that rejected group would have been 2. You do not see that row in the output. The `WHERE` version never built the west group; this version builds it and then drops it. The visible result happens to match.

### DB-014 — SUM and AVG skip nulls, and a preserved outer row is still a row

**Difficulty:** Senior

**Category:** Aggregation

**Question:**

For each rep, what are `COUNT(*)`, `COUNT(deal.id)`, `COUNT(amount)`, `SUM(amount)`, and `AVG(amount)`?

**Context and Constraints:**

```sql
CREATE TABLE rep (
  id integer PRIMARY KEY,
  name text NOT NULL
);

CREATE TABLE deal (
  id integer PRIMARY KEY,
  rep_id integer NOT NULL,
  amount numeric
);

INSERT INTO rep (id, name) VALUES
  (1, 'Ada'),
  (2, 'Lin');

INSERT INTO deal (id, rep_id, amount) VALUES
  (10, 1, 100),
  (11, 1, NULL),
  (12, 1, 50);
```

```sql
SELECT
  r.name,
  COUNT(*) AS joined_rows,
  COUNT(d.id) AS deals,
  COUNT(d.amount) AS priced,
  SUM(d.amount) AS sum_amount,
  AVG(d.amount) AS avg_amount
FROM rep AS r
LEFT JOIN deal AS d ON d.rep_id = r.id
GROUP BY r.id
ORDER BY r.id;
```

`amount` is numeric. `GROUP BY r.id` is enough for `r.name` because `r.id` is the primary key.

**Senior Engineer's Answer:**

| name | joined_rows | deals | priced | sum_amount | avg_amount |
|---|---:|---:|---:|---:|---:|
| Ada | 3 | 3 | 2 | 150 | 75 |
| Lin | 1 | 0 | 0 | NULL | NULL |

Ada has three deal rows. `COUNT(*)` and `COUNT(d.id)` are both 3. One amount is null, so `COUNT(d.amount)` is 2. `SUM` adds 100 and 50 and skips the null, which is 150. `AVG` divides that sum by the number of non-null amounts, 150 / 2, which is 75. It does not divide by 3.

Lin has no deal. The left join still emits one row so the rep can survive. `COUNT(*)` counts that row: 1. `d.id` and `d.amount` are null, so both column counts are 0. `SUM` of no non-null amounts is null. `AVG` of no non-null amounts is null. `COALESCE(SUM(d.amount), 0)` would show 0 for Lin. Use it only when the metric's definition says a rep with no deals has zero revenue. Otherwise report null or omit the sum, and use `COUNT(d.id)` as the deal count.

**Practical Implementation:**

```sql
SELECT
  r.id,
  r.name,
  COUNT(d.id) AS deals,
  SUM(d.amount) AS sum_amount,
  AVG(d.amount) AS avg_amount
FROM rep AS r
LEFT JOIN deal AS d ON d.rep_id = r.id
GROUP BY r.id
ORDER BY r.id;
```

This drops `COUNT(*)`, which answers "rows after the join" and not "deals."

**Trade-offs and Alternatives:**

Aggregate deals first, then left-join the totals to `rep`, when you also need columns from `deal` at a different grain. Grouping after a join of deals to line items counts the line grain. The next question is that trap. For this schema the left join is already one row per deal, so the sums are at deal grain.

`SUM(d.amount) FILTER (WHERE d.amount > 0)` is how you exclude zeros or negatives without removing Lin. A `WHERE d.amount > 0` on the outer query would remove her.

**Common Mistakes:**

- Dividing `SUM(amount)` by `COUNT(*)` in the client and reporting Ada's average as 50. The null deal is not a zero and is not in the average.
- Using `COUNT(*)` on a left join and telling Lin she has one deal.
- Turning a null average into 0 in a chart and then ranking Lin with the reps who closed zero-value deals.

**Senior-Level Follow-up:**

What do these two queries return?

```sql
SELECT SUM(amount) AS total FROM deal WHERE false;

SELECT rep_id, SUM(amount) AS total
FROM deal
WHERE false
GROUP BY rep_id;
```

**Answer:** The first returns one row whose `total` is null. An aggregate without `GROUP BY` always produces one group, and the sum over no rows is null. `COUNT(*)` in that position would be 0. The second returns no rows. `GROUP BY` creates a group only for keys that survive `WHERE`, and none do. "No groups" and "one group whose sum is null" are different results. Callers that always read `result.rows[0]` are assuming the first shape.

### DB-015 — A join changes the grain before COUNT runs

**Difficulty:** Senior

**Category:** Aggregation

**Question:**

The author says this query returns the number of invoices per account, including accounts with none. What does it return on these rows? Write the query that returns the invoice counts, with zero for an account that has no invoice.

**Context and Constraints:**

```sql
CREATE TABLE account (
  id integer PRIMARY KEY,
  name text NOT NULL
);

CREATE TABLE invoice (
  id integer PRIMARY KEY,
  account_id integer NOT NULL
);

CREATE TABLE line (
  id integer PRIMARY KEY,
  invoice_id integer NOT NULL
);

INSERT INTO account (id, name) VALUES
  (1, 'Ada'),
  (2, 'Lin');

INSERT INTO invoice (id, account_id) VALUES
  (1, 1),
  (2, 1);

INSERT INTO line (id, invoice_id) VALUES
  (1, 1),
  (2, 1),
  (3, 2);
```

```sql
SELECT a.name, COUNT(*) AS n
FROM account AS a
JOIN invoice AS i ON i.account_id = a.id
JOIN line AS l ON l.invoice_id = i.id
GROUP BY a.id
ORDER BY a.id;
```

**Senior Engineer's Answer:**

The query returns one row: Ada, 3. It counted joined line rows. Invoice 1 has two lines and invoice 2 has one, so Ada's join has three rows. Lin never survives the inner joins. The statement is a correct line count for accounts that have a line, and it is not an invoice count.

Ada has 2 invoices. Lin has 0. The query that says so:

```sql
SELECT a.name, COUNT(i.id) AS n_invoices
FROM account AS a
LEFT JOIN invoice AS i ON i.account_id = a.id
GROUP BY a.id
ORDER BY a.id;
```

| name | n_invoices |
|---|---:|
| Ada | 2 |
| Lin | 0 |

`COUNT(i.id)` ignores the null invoice id on Lin's preserved row. `COUNT(*)` on that same left join would report Lin as 1. `COUNT(DISTINCT i.id)` is also 2 for Ada if a later join multiplies lines, because distinct invoice ids collapse the fan-out. Distinct is a repair after the grain changed. Joining only `invoice` never changes the grain, so `COUNT(i.id)` is the direct statement.

**Practical Implementation:**

```sql
SELECT a.id, a.name, COUNT(i.id) AS n_invoices
FROM account AS a
LEFT JOIN invoice AS i ON i.account_id = a.id
GROUP BY a.id
ORDER BY a.id;
```

If the report also needs line counts, aggregate each grain separately and join the aggregates on `account.id`. One join of both child tables has one grain, the product of the children.

**Trade-offs and Alternatives:**

```sql
SELECT a.name, inv.n_invoices
FROM account AS a
LEFT JOIN (
  SELECT account_id, COUNT(*) AS n_invoices
  FROM invoice
  GROUP BY account_id
) AS inv ON inv.account_id = a.id
ORDER BY a.id;
```

This also yields Ada 2. Lin's `n_invoices` is null, because the subquery emits no Lin row and the left join null-extends it. `COALESCE(inv.n_invoices, 0)` makes that 0. The `COUNT(i.id)` form already returns 0 without `COALESCE`. Both are valid. The subquery form is the one you want when `invoice` is joined onward to `line` in the same statement and the invoice count must stay at invoice grain.

**Common Mistakes:**

- Wrapping the original select list in `DISTINCT` and still using `COUNT(*)`. Distinct on the outer query does not change the aggregate that already ran.
- Writing `COUNT(DISTINCT a.id)` per group. Inside `GROUP BY a.id` that count is 1 whenever the group exists, including a group that was multiplied by lines.
- Inner-joining `invoice` and then using `COALESCE(COUNT(*), 0)`. The coalesce never sees Lin, because there is no group to coalesce.

**Senior-Level Follow-up:**

Add a second line on invoice 2. What happens to the author's query, and what happens to `COUNT(DISTINCT i.id)` if it is added beside `COUNT(*)`?

**Answer:** The author's `COUNT(*)` becomes 4 for Ada: lines are now 2 plus 2. `COUNT(DISTINCT i.id)` stays 2. Lin still does not appear. The distinct count is the invoice count only for accounts that survived the joins. It still misses the zero.

### DB-016 — Semi-joins and anti-joins ask about existence

**Difficulty:** Senior

**Category:** Subqueries

**Question:**

Write two queries. The first returns each account that has at least one invoice, once. The second returns each account that has none. Give the results. `invoice.account_id` is nullable.

**Context and Constraints:**

```sql
CREATE TABLE account (
  id integer PRIMARY KEY,
  name text NOT NULL
);

CREATE TABLE invoice (
  id integer PRIMARY KEY,
  account_id integer,
  total numeric NOT NULL
);

INSERT INTO account (id, name) VALUES
  (1, 'Ada'),
  (2, 'Lin'),
  (3, 'Grace');

INSERT INTO invoice (id, account_id, total) VALUES
  (10, 1, 50),
  (11, 1, 70),
  (12, NULL, 15);
```

Invoice 12 is not an invoice for Lin. It has no account.

**Senior Engineer's Answer:**

"At least one" is a semi-join. `EXISTS` is true when the subquery produces a row, and the outer account is not multiplied when Ada has two invoices:

```sql
SELECT a.id, a.name
FROM account AS a
WHERE EXISTS (
  SELECT 1
  FROM invoice AS i
  WHERE i.account_id = a.id
)
ORDER BY a.id;
```

Result: `(1, 'Ada')`. Invoice 12 matches nobody, because `NULL = a.id` is unknown.

An inner join to `invoice` returns Ada twice, once per invoice. That query answers "account-invoice pairs." `SELECT DISTINCT a.id, a.name` can reduce it to Ada once. `EXISTS` says existence without a distinct step.

"None" is an anti-join:

```sql
SELECT a.id, a.name
FROM account AS a
WHERE NOT EXISTS (
  SELECT 1
  FROM invoice AS i
  WHERE i.account_id = a.id
)
ORDER BY a.id;
```

Result: `(2, 'Lin')`, `(3, 'Grace')`.

The same anti-join with a left join:

```sql
SELECT a.id, a.name
FROM account AS a
LEFT JOIN invoice AS i ON i.account_id = a.id
WHERE i.id IS NULL
ORDER BY a.id;
```

Same two rows. Test `i.id`, the right-hand primary key. `WHERE i.total IS NULL` would also be true for a matched invoice whose total was null. This schema makes `total` not null, so the bug is latent. The primary key is the test that means "no row."

`WHERE a.id NOT IN (SELECT account_id FROM invoice)` returns no rows. The subquery yields 1, 1, and null. `NOT IN` with that null is unknown for every account, including Lin and Grace. `NOT EXISTS` is the form that matches the question.

**Practical Implementation:**

Use the `EXISTS` and `NOT EXISTS` queries above. They are the ones to re-implement from memory.

**Trade-offs and Alternatives:**

PostgreSQL may plan `EXISTS`, `IN`, and a join with `DISTINCT` as different trees for the same logical outcome when nulls are impossible. Choose the form that states existence, absence, or paired columns. A rewrite whose only purpose is speed needs a plan you can show, and plan choice is outside this file's scope. Correctness comes first: `NOT IN` on a nullable `account_id` is a different predicate, as this data proves by returning nobody.

`IN (SELECT account_id FROM invoice WHERE account_id IS NOT NULL)` happens to return Ada here. The extra `IS NOT NULL` is an admission that `NOT IN` was the wrong tool. You still have to remember it on the next query.

**Common Mistakes:**

- Using the inner join and shipping duplicate accounts to the API.
- Writing the anti-join as `NOT IN` because the column is "usually filled in." One null invoice changes the whole result to empty.
- Filtering `i.account_id IS NULL` after a left join on `i.account_id = a.id` and believing that catches invoice 12 as if it belonged to an account. Invoice 12 does not join to any account, so it neither creates nor removes Lin. The filter works here only because an unmatched account row also has a null `account_id`. Prefer `i.id IS NULL`, which cannot be confused with a payload null.

**Senior-Level Follow-up:**

The request changes to "accounts whose priced invoice total is at least 100, listed once." Totals are 50 and 70 for Ada. What is the result, and why is a join plus `WHERE i.total >= 100` wrong even after you change the threshold story?

**Answer:** Ada's invoices sum to 120, so Ada qualifies. Lin and Grace do not.

```sql
SELECT a.id, a.name
FROM account AS a
WHERE (
  SELECT COALESCE(SUM(i.total), 0)
  FROM invoice AS i
  WHERE i.account_id = a.id
) >= 100
ORDER BY a.id;
```

`COALESCE` is justified here because the interviewer defined the threshold on a sum and an account with no invoices has sum 0 for this comparison. A join of account to invoice filtered by `i.total >= 100` returns nobody: neither invoice is 100 alone. The threshold is on the group, so it belongs on the aggregate, not on the row.

### DB-017 — A scalar subquery may return only one row

**Difficulty:** Advanced

**Category:** Subqueries

**Question:**

What happens when this statement runs? Write a query that returns the earliest ticket id per agent, and null when the agent has none.

**Context and Constraints:**

```sql
CREATE TABLE agent (
  id integer PRIMARY KEY,
  name text NOT NULL
);

CREATE TABLE ticket (
  id integer PRIMARY KEY,
  agent_id integer,
  opened_on date NOT NULL
);

INSERT INTO agent (id, name) VALUES
  (1, 'Ada'),
  (2, 'Lin');

INSERT INTO ticket (id, agent_id, opened_on) VALUES
  (10, 1, DATE '2026-01-01'),
  (11, 1, DATE '2026-02-01'),
  (12, NULL, DATE '2026-03-01');
```

```sql
SELECT
  a.name,
  (
    SELECT t.id
    FROM ticket AS t
    WHERE t.agent_id = a.id
  ) AS ticket_id
FROM agent AS a;
```

Earliest means the smallest `opened_on`, then the smallest `id`.

**Senior Engineer's Answer:**

The statement fails. A scalar subquery may return zero rows or one row. Zero rows become null. Two rows are a runtime error: more than one row returned by a subquery used as an expression. Ada's subquery would return 10 and 11, so the statement returns no successful result set. It does not return Lin and then fail Ada. The statement fails as a unit.

Lin's subquery would have been the zero-row case, which is a null scalar. You never observe that mixed with a partial Ada result inside this statement.

`LIMIT 1` without `ORDER BY` would silence the error and return an arbitrary one of Ada's ids. The earliest row is defined, so the order is part of the query:

```sql
SELECT a.name, t.id AS ticket_id
FROM agent AS a
LEFT JOIN LATERAL (
  SELECT t.id
  FROM ticket AS t
  WHERE t.agent_id = a.id
  ORDER BY t.opened_on, t.id
  LIMIT 1
) AS t ON true
ORDER BY a.id;
```

| name | ticket_id |
|---|---:|
| Ada | 10 |
| Lin | NULL |

Ticket 12 has a null `agent_id` and matches neither agent. `LATERAL` lets the inner query refer to `a.id`. `LEFT JOIN ... ON true` keeps Lin when the lateral subquery is empty. An inner `JOIN LATERAL` would drop Lin.

A derived table in `FROM` needs an alias. `FROM (SELECT 1 AS n)` is a syntax error in PostgreSQL. `FROM (SELECT 1 AS n) AS s` is legal. The lateral subquery above is aliased as `t`.

**Practical Implementation:**

Use the lateral query in the answer. If the caller needs every ticket, join `ticket` plainly and return multiple rows per agent. Do not hide that cardinality inside a scalar subquery.

**Trade-offs and Alternatives:**

`DISTINCT ON (a.id) ... ORDER BY a.id, t.opened_on, t.id` after a left join also yields Ada/10 and Lin/null. It is PostgreSQL syntax for one row per agent. The lateral form makes the "one ticket" limit local and is easier to extend with more ticket filters. Both need the same `ORDER BY` to define earliest. An unordered pick is not an alternative when the question says earliest.

**Common Mistakes:**

- Catching the error in the application and retrying. The data has two tickets. The SQL must say which one.
- `LIMIT 1` with no order, then building a product rule around whichever id came back in development.
- An inner lateral join that drops agents with no tickets and reporting that as "every agent."
- A scalar subquery that returns `t.id` where you meant `SUM` or `COUNT`. The aggregate form is allowed to return one row even when many tickets match, because the aggregate collapses them. `SELECT SUM(t.id)` would be legal and would mean something you did not ask.

**Senior-Level Follow-up:**

What does this version return, and why is it still a bad "earliest ticket" query?

```sql
SELECT a.name, MIN(t.id) AS ticket_id
FROM agent AS a
LEFT JOIN ticket AS t ON t.agent_id = a.id
GROUP BY a.id
ORDER BY a.id;
```

**Answer:** It returns Ada/10 and Lin/null on this particular data, because the lower id happens to be the earlier date. Insert ticket `(9, 1, DATE '2026-04-01')` and `MIN(t.id)` returns 9, which opened last. Earliest by date is `MIN(t.opened_on)` only if you do not also need the id. The id of the row that holds the minimum date is the ordered lateral query or `DISTINCT ON`, not the minimum of the id.

### DB-018 — A recursive CTE walks a stated edge until the join is empty

**Difficulty:** Intermediate

**Category:** Common table expressions

**Question:**

What is a CTE, and what does this recursive query return?

**Context and Constraints:**

```sql
CREATE TABLE employee (
  id integer PRIMARY KEY,
  name text NOT NULL,
  manager_id integer
);

INSERT INTO employee (id, name, manager_id) VALUES
  (1, 'Ada', NULL),
  (2, 'Grace', 1),
  (3, 'Lin', 1),
  (4, 'Edsger', 2);
```

```sql
WITH RECURSIVE chain AS (
  SELECT id, name, manager_id, 1 AS depth
  FROM employee
  WHERE id = 4

  UNION ALL

  SELECT e.id, e.name, e.manager_id, c.depth + 1
  FROM employee AS e
  JOIN chain AS c ON e.id = c.manager_id
)
SELECT id, name, depth
FROM chain
ORDER BY depth, id;
```

Ada manages Grace and Lin. Grace manages Edsger. The walk starts at Edsger and goes to managers, not to reports.

**Senior Engineer's Answer:**

A common table expression is a named query in the statement, introduced by `WITH`. Later parts of that statement read it by name. It is not a table in the catalog, and it disappears when the statement ends. A non-recursive CTE is one query. A recursive CTE is an anchor plus a recursive term separated by `UNION` or `UNION ALL`. The recursive term refers to the CTE. PostgreSQL runs the anchor, then repeats the recursive term against the rows produced by the previous step, and stops when a step adds nothing.

Anchor: Edsger, manager 2, depth 1.

Next step joins `employee.id` to that manager id and finds Grace, manager 1, depth 2.

Next step finds Ada, manager null, depth 3.

Next step joins `employee.id` to null and finds nobody. The walk stops.

| id | name | depth |
|---:|---|---:|
| 4 | Edsger | 1 |
| 2 | Grace | 2 |
| 1 | Ada | 3 |

Lin is not on the path from Edsger to the root.

The join direction is the walk. `ON e.manager_id = c.id` walks to reports. From Edsger that finds nobody, so the same statement with only that change returns Edsger at depth 1.

`UNION ALL` keeps each step. `UNION` would also return these three rows because the ids do not repeat. `UNION` does not by itself stop a cycle if the recursive select adds a changing depth: the new row is never a duplicate, and the walk continues until a resource limit fails the statement. This tree has no cycle. A cycle needs a stop you wrote, such as a depth cap or PostgreSQL's `CYCLE` clause on the recursive CTE.

**Practical Implementation:**

```sql
WITH RECURSIVE chain AS (
  SELECT id, name, manager_id, 1 AS depth
  FROM employee
  WHERE id = 4
  UNION ALL
  SELECT e.id, e.name, e.manager_id, c.depth + 1
  FROM employee AS e
  JOIN chain AS c ON e.id = c.manager_id
  WHERE c.depth < 10
)
SELECT id, name, depth
FROM chain
ORDER BY depth, id;
```

The depth predicate does not change this result. It bounds a bad edge list. The non-recursive form for "this employee and their manager only" is a self-join, not a CTE. Use the recursive form when the depth is data-dependent.

**Trade-offs and Alternatives:**

A fixed depth of three left joins is shorter and dies on the fourth level. The recursive CTE follows however many managers are stored, up to the guard. An application loop that selects one manager per round trip is the same walk with a network round trip per edge. One statement is the better default when the tree fits a normal query result. A graph with multiple parents is not this foreign key; this CTE assumes `manager_id` points at one employee.

**Common Mistakes:**

- Reversing the join and reporting that Edsger has no chain above him.
- Forgetting `RECURSIVE` and getting a syntax error because the CTE refers to itself.
- Selecting from the CTE twice and assuming a second walk. The name `chain` is one result of the walk described above.
- Omitting a cycle guard on data you do not control, then treating a statement failure as a mystery rather than a loop in `manager_id`.

**Senior-Level Follow-up:**

Change the anchor to `WHERE manager_id IS NULL` and the recursive join to `ON e.manager_id = c.id`. What rows come back, and at what depths?

**Answer:** The anchor is Ada at depth 1. The next step finds employees whose manager is Ada: Grace and Lin at depth 2. The next step finds Edsger, whose manager is Grace, at depth 3. The result ordered by `depth, id` is Ada 1, Grace 2, Lin 2, Edsger 3. This is the whole reporting tree. The earlier query was one path to the root.

### DB-019 — PostgreSQL 16 inlines a CTE only under definite rules

**Difficulty:** Advanced

**Category:** Common table expressions

**Question:**

When does PostgreSQL 16 compute a CTE once as its own result, and when does it fold the CTE into the outer query? What do the two statements below return?

**Context and Constraints:**

PostgreSQL 12 changed CTE planning. PostgreSQL 16 keeps that behavior. Do not quote a runtime or a row estimate.

```sql
CREATE TABLE sale (
  id integer PRIMARY KEY,
  region text NOT NULL,
  amount numeric NOT NULL
);

INSERT INTO sale (id, region, amount) VALUES
  (1, 'east', 10),
  (2, 'east', 30),
  (3, 'west', 5);

CREATE TABLE invoice (
  id integer PRIMARY KEY,
  account_id integer
);

INSERT INTO invoice (id, account_id) VALUES
  (10, 1),
  (11, NULL);
```

Statement 1:

```sql
WITH region_total AS (
  SELECT region, SUM(amount) AS total
  FROM sale
  GROUP BY region
)
SELECT a.region, a.total, b.total AS other_total
FROM region_total AS a
JOIN region_total AS b ON a.region <> b.region
ORDER BY a.region;
```

Statement 2:

```sql
WITH moved AS (
  DELETE FROM invoice
  WHERE account_id IS NULL
  RETURNING id
)
SELECT id
FROM moved
WHERE false;
```

**Senior Engineer's Answer:**

A `WITH` query that is not recursive and does not modify data is inlined when it is referenced once, unless it is marked `MATERIALIZED`. Inlining means the planner folds it into the outer query the way it folds a subquery. A CTE referenced more than once is materialized by default: it is computed once, and each reference reads that result. `AS NOT MATERIALIZED` asks the planner to inline even when there are several references. `AS MATERIALIZED` forces the separate result even for one reference.

Before PostgreSQL 12, a CTE was always an optimization fence. Interview answers that say "CTEs always run first and always block optimization" describe that older rule. PostgreSQL 16 does not.

Statement 1 references `region_total` twice, so PostgreSQL 16 materializes it by default. East's sum is 40. West's sum is 5. The join keeps pairs of different regions:

| region | total | other_total |
|---|---:|---:|
| east | 40 | 5 |
| west | 5 | 40 |

`AS NOT MATERIALIZED` does not change these numbers. `SUM` of these rows is stable. The keyword matters for a volatile function: a twice-referenced `SELECT random() AS x` that is materialized returns the same stored value to both references; inlined, `random()` can be evaluated again and the values can differ. This statement does not include `random()`, so no sample value is part of the answer.

Statement 2 is data-modifying. That CTE is not inlined. It runs to completion even though the outer query keeps none of its output. `RETURNING` yields id 11, the `WHERE false` discards it, and the select result is empty. After the statement, `invoice` contains only `(10, 1)`.

Read that delete through `RETURNING` when the caller needs the id. `SELECT id FROM moved` without `WHERE false` returns one row, 11, and leaves the same table contents.

**Practical Implementation:**

```sql
WITH region_total AS MATERIALIZED (
  SELECT region, SUM(amount) AS total
  FROM sale
  GROUP BY region
)
SELECT region, total
FROM region_total
WHERE total > 10
ORDER BY region;
```

Result: one row, east, 40. The west total is 5 and fails the outer filter. Materializing does not change that result. Use `MATERIALIZED` when you need the CTE's result fixed once, including a single reference that contains a volatile expression you must not re-evaluate. Use `NOT MATERIALIZED` when you want the outer predicate to be planned as part of one query and the CTE is a plain select.

**Trade-offs and Alternatives:**

A subquery in `FROM` is the honest spelling of "inline this." A CTE is the honest spelling of "name this result" and, with `MATERIALIZED` or a data change, "compute this once." A view is the spelling of "keep this name after the statement." None of the three is faster by category. A data-modifying CTE is the wrong place to hide a delete the caller did not notice in the select list: statement 2 returns no id and still deletes invoice 11.

**Common Mistakes:**

- Saying every CTE is an optimization fence on PostgreSQL 16.
- Testing statement 2 by looking at the empty result and concluding the delete did not run.
- Splitting one logical query into many CTEs so each reference is "cleaner," then being surprised that a volatile function or a write ran a different number of times.
- Referencing a data-modifying CTE twice and expecting two deletes. The modification runs once.

**Senior-Level Follow-up:**

You need east's total in two places and you also need the outer query to see a row inserted earlier in the same `WITH`. How do those two CTEs communicate?

**Answer:** They communicate through `RETURNING`, which becomes the CTE result the later clause selects. They do not communicate by having the later clause read the base table and expect to observe the earlier write inside that same statement. Put the inserted rows in `RETURNING` and select that CTE.

### DB-020 — CHECK accepts true and unknown; NOT NULL is separate

**Difficulty:** Senior

**Category:** Constraints

**Question:**

Which inserts succeed, and what is stored? Why does a null amount pass `CHECK (amount > 0)`?

**Context and Constraints:**

Each insert is its own autocommit statement. A failed statement does not remove a row that already committed.

```sql
CREATE TABLE price_row (
  id integer PRIMARY KEY,
  amount numeric CHECK (amount > 0)
);
```

Attempted inserts, in order: `(1, NULL)`, `(2, 0)`, `(3, -1)`, `(4, 10)`.

**Senior Engineer's Answer:**

`CHECK` passes when the expression is true or unknown. It fails only when the expression is false. `NULL > 0` is unknown, so id 1 is stored with a null amount. `0 > 0` is false, and `-1 > 0` is false, so ids 2 and 3 are rejected with `check_violation` (`23514`). `10 > 0` is true, so id 4 is stored.

The table then contains `(1, NULL)` and `(4, 10)`.

`NOT NULL` is a different constraint. It rejects a null with `not_null_violation` (`23502`). A column can have both:

```sql
amount numeric NOT NULL CHECK (amount > 0)
```

That form rejects id 1 and still rejects 0 and -1. `CHECK (amount IS NOT NULL AND amount > 0)` also rejects the null, and the error is a check violation rather than a not-null violation. Application code that branches on `23502` needs the real `NOT NULL` constraint if that branch is the one you want.

A check expression sees the candidate row. It cannot see other rows or other tables. `CHECK (amount > (SELECT 0))` fails at `CREATE TABLE` because a subquery is not allowed in a check constraint. A rule about two different bookings overlapping is outside `CHECK`.

**Practical Implementation:**

```sql
CREATE TABLE price_row (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  amount numeric NOT NULL,
  CONSTRAINT price_row_amount_positive CHECK (amount > 0)
);

INSERT INTO price_row (amount) VALUES (10);
```

Name the check. PostgreSQL's default name for an unnamed column check would be `price_row_amount_check`. A named constraint is the string an API can log. The insert stores a positive amount and an identity id.

For a date range, nulls pass the comparison unless the columns are also required:

```sql
CREATE TABLE booking (
  id integer PRIMARY KEY,
  start_date date NOT NULL,
  end_date date NOT NULL,
  CONSTRAINT booking_dates_ordered CHECK (start_date < end_date)
);
```

`(1, NULL, DATE '2026-05-01')` fails `NOT NULL`. `(2, DATE '2026-05-02', DATE '2026-05-01')` fails the check. `(3, DATE '2026-05-01', DATE '2026-05-02')` succeeds. Without the two `NOT NULL` declarations, the first insert would succeed, because `NULL < DATE '2026-05-01'` is unknown and `CHECK` would accept it.

**Trade-offs and Alternatives:**

A check is immediate, local, and visible in the catalog. A trigger can look at other tables and can drift from the rule the next person expects to find on the column. Prefer `CHECK` for a predicate of the row. Prefer a foreign key for "this id exists in that table." Prefer `NOT NULL` for presence. Splitting presence into the check expression loses the `23502` signal.

**Common Mistakes:**

- Believing `CHECK (amount > 0)` means the column is required.
- Believing `CHECK (start_date < end_date)` means both dates are present.
- Writing a subquery in `CHECK` and moving the rule to the application when `CREATE TABLE` rejects it, leaving the database willing to store violations from the next client.
- Assuming a failed insert inside an explicit transaction leaves the transaction usable. PostgreSQL aborts that transaction until `ROLLBACK`. The row outcomes above are for separate autocommit statements.

**Senior-Level Follow-up:**

`CHECK ((status = 'void') = (voided_on IS NOT NULL))` — which rows pass?

**Answer:** A void row with a `voided_on` date passes. A non-void row with a null `voided_on` passes. A void row with a null date fails, because true is not equal to false. A non-void row with a date fails, because false is not equal to true. The interesting case is a null `status`: `NULL = something` is unknown, and `CHECK` accepts unknown, so a null status passes this check whether or not `voided_on` is set. If status cannot be null, declare `status text NOT NULL` as well. The check enforces the pair of values only when the comparisons are true or false.

### DB-021 — UNIQUE allows many nulls unless NULLS NOT DISTINCT

**Difficulty:** Advanced

**Category:** Constraints

**Question:**

Which inserts succeed? How do you allow only one null email?

**Context and Constraints:**

PostgreSQL 16. The behavior below has been in PostgreSQL for much longer; `NULLS NOT DISTINCT` arrived in PostgreSQL 15.

```sql
CREATE TABLE contact (
  id integer PRIMARY KEY,
  email text UNIQUE
);
```

Inserts, each its own statement: `(1, NULL)`, `(2, NULL)`, `(3, 'a@ex.com')`, `(4, 'a@ex.com')`, `(5, 'A@ex.com')`.

Text comparison uses the column's collation. The default collation is case-sensitive for these literals.

**Senior Engineer's Answer:**

A unique constraint rejects two rows when the compared non-null values are equal. Nulls are not equal under that test, so PostgreSQL stores both null emails. That is PostgreSQL's default, and it is `NULLS DISTINCT`.

`(1, NULL)` succeeds. `(2, NULL)` succeeds. `(3, 'a@ex.com')` succeeds. `(4, 'a@ex.com')` fails with `unique_violation` (`23505`) on `contact_email_key`. `(5, 'A@ex.com')` succeeds, because it is not the same text as `'a@ex.com'` under a case-sensitive collation.

The table contains ids 1, 2, 3, and 5.

A primary key would have rejected the nulls. `PRIMARY KEY` includes `NOT NULL`. `UNIQUE` does not. Declaring the primary key on `email` is the wrong repair if a missing email is allowed for some rows and forbidden to repeat for others; it also forbids every null, and it makes email the identity.

PostgreSQL 15 and 16 accept:

```sql
CREATE TABLE contact_strict (
  id integer PRIMARY KEY,
  email text UNIQUE NULLS NOT DISTINCT
);
```

The second `INSERT` of a null email then fails with `23505`. One null is stored. A second `'a@ex.com'` still fails. `'A@ex.com'` still differs.

`GROUP BY email` and `SELECT DISTINCT email` put all null emails in one group. That is the opposite of the default unique constraint, which stores many nulls. Set operations and grouping treat nulls as matching each other. `UNIQUE NULLS DISTINCT` does not. Say which operator you mean when you say "nulls are equal."

**Practical Implementation:**

```sql
CREATE TABLE contact (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email text,
  CONSTRAINT contact_email_key UNIQUE NULLS NOT DISTINCT (email)
);
```

Use the default `UNIQUE (email)` when many people may have no email on file and that absence is not a shared identity. Use `NULLS NOT DISTINCT` when "no email" itself may occur only once, which is a rare product rule. Most products want many nulls and a case policy they chose on purpose.

**Trade-offs and Alternatives:**

Case-insensitive uniqueness is not `UNIQUE (email)` under the default collation. A common design stores the address already normalized, or enforces uniqueness on a normalized expression. The expression form is an index-backed rule; this question's guarantee is the constraint you can see: `UNIQUE` compares the stored text as the column defines it. `'A@ex.com'` and `'a@ex.com'` both exist in the table above.

A partial unique rule that ignores nulls is the historical pattern for "many nulls, unique when present." The default `UNIQUE` already does that in PostgreSQL. You do not need a special predicate to allow multiple nulls. You need `NULLS NOT DISTINCT` to forbid them.

**Common Mistakes:**

- Claiming `UNIQUE` rejects a second null because "null equals null" in the constraint. It does not, unless `NULLS NOT DISTINCT` is set.
- Testing with one null row and writing the constraint off as correct for a product that later inserts a second incomplete contact.
- Folding case in the application on one screen and inserting `'A@ex.com'` from another screen. The database stored both, which is what the constraint said.
- Expecting `SELECT DISTINCT email` to preserve two null rows because `UNIQUE` would. `DISTINCT` returns one null.

**Senior-Level Follow-up:**

`INSERT INTO contact (id, email) VALUES (6, NULL)` on the original `NULLS DISTINCT` table, after ids 1 and 2 are already null. Then `SELECT email, COUNT(*) FROM contact WHERE email IS NULL GROUP BY email`. What is the count?

**Answer:** The insert succeeds. The select returns one row: a null email with count 3. Three stored nulls, one group. The constraint and the group by are both working.

### DB-022 — Foreign-key actions are a domain rule

**Difficulty:** Staff-Level

**Category:** Foreign keys

**Question:**

A migration adds `ON DELETE CASCADE` from `ledger_line` to `account` so support can delete an account. Do you accept it? What does each referential action do on the rows below?

**Context and Constraints:**

A ledger line is a financial record and must keep its account id. An invoice line has no meaning without its invoice. A note may outlive its author. PostgreSQL's default action, when you write only `REFERENCES`, is `ON DELETE NO ACTION` and `ON UPDATE NO ACTION`.

Account rows for the examples: `(1, 'Ada')`, `(2, 'Lin')`. Each example starts from those accounts and its own child rows. Run the delete as its own statement.

**Senior Engineer's Answer:**

Reject the cascade on the ledger. `ON DELETE CASCADE` tells PostgreSQL to delete the child rows in the same statement as the parent. That is the right lifetime for an invoice line that is part of the invoice. It is the wrong lifetime for a ledger line. Deleting the account would delete financial history, and the `DELETE` would look like it succeeded.

For the ledger, keep `account_id` `NOT NULL` and use `ON DELETE RESTRICT` or the default `NO ACTION`. Closing an account is a status change, not a missing parent. If the account must disappear later, an explicit statement reassigns or archives the lines first, and the foreign key still refuses a dangling id.

`RESTRICT` and `NO ACTION` both fail the delete while a child row references the parent. After `INSERT` of ledger line `(10, 1, 25)` and `DELETE FROM account WHERE id = 1`, the statement errors with `foreign_key_violation` (`23503`). Account 1 and line 10 are still there.

The practical difference: `NO ACTION` can be declared `DEFERRABLE` and checked at transaction end. `RESTRICT` cannot be deferred. `NO ACTION` also waits until the end of the statement, so another cascade in that same statement can remove the referencing row before the check. `RESTRICT` fails while the referencing row is still there. For a single foreign key and an immediate check, the visible result of deleting a referenced account is the same: the delete fails and both rows remain. The default name of `REFERENCES account (id)` on `ledger_line.account_id` is `ledger_line_account_id_fkey`.

`ON DELETE CASCADE` on invoice lines: invoice `(7)` and lines `(1, 7, 'widget')`, `(2, 7, 'gadget')`. `DELETE FROM invoice WHERE id = 7` leaves both tables empty.

`ON DELETE SET NULL` requires the child column to accept null. Notes `(10, 1, 'hello')` and `(11, 2, 'world')`, delete author 1: author 2 remains, note 10 has a null `author_id`, note 11 stays with Lin. If `author_id` is also `NOT NULL`, the delete fails on `23502` and both the author and the note stay. `SET NULL` does not bypass `NOT NULL`.

`ON DELETE SET DEFAULT` writes the column default, then the foreign key must hold. Note `(10, 1, 'hello')` with `DEFAULT 2`, delete author 1: the note's `author_id` becomes 2, and author 2 remains. If the default is 99 and no author 99 exists, the delete fails the foreign key and the original rows remain. The statement does not leave the note pointing at 99.

A foreign key does not mean the column is required. `account_id integer REFERENCES account (id)` still allows null, and a null means "no parent" under the default match rule. A required account is `NOT NULL` plus the foreign key.

The parent columns must be a primary key or a unique constraint. A foreign key cannot target a bag of duplicate ids.

**Practical Implementation:**

```sql
CREATE TABLE account (
  id integer PRIMARY KEY,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  CONSTRAINT account_status_known CHECK (status IN ('open', 'closed'))
);

CREATE TABLE ledger_line (
  id integer PRIMARY KEY,
  account_id integer NOT NULL,
  amount numeric NOT NULL,
  CONSTRAINT ledger_line_amount_nonzero CHECK (amount <> 0),
  CONSTRAINT ledger_line_account_fkey
    FOREIGN KEY (account_id) REFERENCES account (id) ON DELETE RESTRICT
);

CREATE TABLE invoice (
  id integer PRIMARY KEY
);

CREATE TABLE invoice_line (
  id integer PRIMARY KEY,
  invoice_id integer NOT NULL,
  sku text NOT NULL,
  CONSTRAINT invoice_line_invoice_fkey
    FOREIGN KEY (invoice_id) REFERENCES invoice (id) ON DELETE CASCADE
);
```

Close Ada with `UPDATE account SET status = 'closed' WHERE id = 1`. Do not delete her while lines exist.

**Trade-offs and Alternatives:**

`ON UPDATE CASCADE` rewrites child foreign keys when the parent key changes. That is useful for a natural key that can be corrected. It is unused for an identity primary key you never update. Cascading a key change locks and rewrites every child row; that cost is one reason an immutable surrogate is the parent key.

`ON DELETE SET DEFAULT` looks like a soft archive and becomes a silent reassignment to whatever the default row is. Prefer an explicit `UPDATE` the reviewer can see, unless the default parent is a real domain object ("unassigned") and the product wants that reassignment inside the delete.

**Common Mistakes:**

- Treating `CASCADE` as cleanup. It is a lifetime rule.
- Adding `ON DELETE SET NULL` on a `NOT NULL` column and discovering the failure only when the first parent is deleted. Create-time acceptance does not mean the delete will succeed.
- Deleting in the application "parent, then children" under `RESTRICT` and doing the parent first. Delete or reassign the children, then the parent.
- Assuming the default action is cascade because a diagramming tool drew a parent-child line. In PostgreSQL the default is `NO ACTION`.

**Senior-Level Follow-up:**

`employee.manager_id` references `employee(id)`. The rows are Ada `(1, NULL)`, Grace `(2, 1)`, Lin `(3, 1)`, Edsger `(4, 2)`. What remains after `DELETE FROM employee WHERE id = 1` under `ON DELETE CASCADE`, and under `ON DELETE SET NULL`?

**Answer:** `CASCADE` deletes Ada, then the rows that referenced her, and then the rows that referenced those. Grace and Lin reference Ada. Edsger references Grace. The table is empty. `SET NULL` deletes Ada and sets the `manager_id` of Grace and Lin to null. Edsger still has manager 2. Remaining rows: `(2, 'Grace', NULL)`, `(3, 'Lin', NULL)`, `(4, 'Edsger', 2)`. Cascade on a self-reference removes the subtree. Set null keeps the people and clears the direct edge. Neither action is a generic "delete user" feature; pick the one the org chart means.

### DB-023 — MATCH SIMPLE skips a composite key that is partly null

**Difficulty:** Advanced

**Category:** Foreign keys

**Question:**

Which inserts succeed under the default foreign-key match? Which of those change if the foreign key is `MATCH FULL`?

**Context and Constraints:**

```sql
CREATE TABLE room (
  building_id integer NOT NULL,
  room_no integer NOT NULL,
  PRIMARY KEY (building_id, room_no)
);

INSERT INTO room (building_id, room_no) VALUES
  (1, 101),
  (1, 102);

CREATE TABLE booking (
  id integer PRIMARY KEY,
  building_id integer,
  room_no integer,
  FOREIGN KEY (building_id, room_no)
    REFERENCES room (building_id, room_no)
);
```

The foreign key omits `MATCH`, so it is `MATCH SIMPLE`. Inserts:

1. `(1, 1, 101)`
2. `(2, 1, 999)`
3. `(3, 1, NULL)`
4. `(4, NULL, NULL)`

**Senior Engineer's Answer:**

`MATCH SIMPLE` checks the reference when every foreign-key column is non-null. If any of them is null, the row is stored and no parent lookup is required. There is no "match the columns that happen to be filled in." That partial match is `MATCH PARTIAL`, which PostgreSQL rejects at create time. PostgreSQL implements `MATCH SIMPLE` and `MATCH FULL`.

On this table:

1. Succeeds. Room `(1, 101)` exists.
2. Fails with `23503`. Both columns are present and `(1, 999)` is not a room.
3. Succeeds. `room_no` is null, so `MATCH SIMPLE` does not look for a room.
4. Succeeds. Both columns are null.

`MATCH FULL` means either every foreign-key column is null, or every column is non-null and the parent row exists. Insert 1 still succeeds. Insert 2 still fails. Insert 3 fails, because the key is partly null. Insert 4 succeeds.

```sql
FOREIGN KEY (building_id, room_no)
  REFERENCES room (building_id, room_no)
  MATCH FULL
```

The referenced column list must match a primary key or unique constraint, in that column order. `REFERENCES room (room_no, building_id)` does not match `PRIMARY KEY (building_id, room_no)`. A foreign key on `(building_id)` alone does not match it either. PostgreSQL reports that there is no unique constraint matching the referenced columns.

Delete actions apply to the composite key as a unit. `ON DELETE CASCADE` removes bookings whose full key equals the deleted room. It does not give insert 3 a parent to cascade from, because that booking never referenced a room.

**Practical Implementation:**

If a booking either names a real room or is unassigned, use `MATCH FULL` and allow both columns to be null together. If a booking must name a room, do not use nulls:

```sql
CREATE TABLE booking (
  id integer PRIMARY KEY,
  building_id integer NOT NULL,
  room_no integer NOT NULL,
  FOREIGN KEY (building_id, room_no)
    REFERENCES room (building_id, room_no)
);
```

`NOT NULL` on both columns makes `MATCH SIMPLE` and `MATCH FULL` accept the same inserts, because a partial key cannot be written. Inserts 3 and 4 fail `NOT NULL`. Insert 2 still fails the foreign key. Insert 1 succeeds.

**Trade-offs and Alternatives:**

Two nullable columns under `MATCH SIMPLE` allow `(1, NULL)`, which is not a room and is not "unassigned." Reports that count bookings per building by `building_id` will count it. `MATCH FULL` forbids that shape. A single `room_id` surrogate on `room`, referenced by one nullable `booking.room_id`, avoids the composite match rules. Use the composite foreign key when the parent is identified by the composite primary key and you do not want a surrogate. Use one nullable column when "no room" is the only missing state you want.

**Common Mistakes:**

- Expecting insert 3 to fail because building 1 exists and room null "should" be checked. `MATCH SIMPLE` skips the whole key.
- Expecting insert 3 to succeed under `MATCH FULL` because one side is null. `MATCH FULL` allows all-null, not some-null.
- Writing `MATCH PARTIAL` from the SQL standard and spending the review on a feature PostgreSQL does not implement.
- Pointing the foreign key at the columns in a different order from the primary key and reading the error as a type problem.

**Senior-Level Follow-up:**

Room `(1, 101)` is deleted with the default `NO ACTION`, and booking 1 exists. What remains? If booking 3 `(3, 1, NULL)` also exists under `MATCH SIMPLE`, does it block the delete?

**Answer:** The delete of room `(1, 101)` fails because booking 1 references it. Both the room and booking 1 remain. Booking 3 does not reference that room, or any room, so it is not the row that makes the delete fail. If booking 1 were not there, the delete of room `(1, 101)` would succeed and booking 3 would stay as `(3, 1, NULL)`. A partial key is not an edge `NO ACTION` can see.

### DB-024 — A self-join pairs a row with another row in the same table

**Difficulty:** Senior

**Category:** Joins

**Question:**

Write a query that lists every employee and their manager's name. Ada has no manager and must appear. What does it return? What does the inner-join version drop?

**Context and Constraints:**

```sql
CREATE TABLE employee (
  id integer PRIMARY KEY,
  name text NOT NULL,
  manager_id integer,
  CONSTRAINT employee_manager_fkey
    FOREIGN KEY (manager_id) REFERENCES employee (id)
);
```

Rows:

| id | name | manager_id |
|---:|---|---:|
| 1 | Ada | NULL |
| 2 | Grace | 1 |
| 3 | Lin | 1 |
| 4 | Edsger | 2 |

The foreign key uses the default match and the default delete action. This question is the select, not a delete.

**Senior Engineer's Answer:**

A self-join is a join whose two inputs are the same table. Each alias is a separate role. `e` is the employee. `m` is that row's manager. Preserve `e` so a null `manager_id` still produces a row:

```sql
SELECT e.name AS employee, m.name AS manager
FROM employee AS e
LEFT JOIN employee AS m ON m.id = e.manager_id
ORDER BY e.id;
```

| employee | manager |
|---|---|
| Ada | NULL |
| Grace | Ada |
| Lin | Ada |
| Edsger | Grace |

`ON m.id = e.manager_id` looks up the parent. `NULL = m.id` is unknown, so Ada matches no manager and the left join fills `manager` with null. Grace and Lin match Ada. Edsger matches Grace.

The inner join on the same predicate returns Grace/Ada, Lin/Ada, and Edsger/Grace. Ada is dropped. That query answers "employees who have a manager," not "every employee."

The foreign key guarantees that a non-null `manager_id` points at a real employee, so the left join's null manager happens only for a null `manager_id`, not for a dangling id. If the foreign key were absent and Edsger's `manager_id` were 99, the left join would show Edsger with a null manager name. The null would mean "no matching row," which is a broken reference, not "no manager." The constraint is what makes those two readings the same.

**Practical Implementation:**

```sql
SELECT e.id, e.name AS employee, m.id AS manager_id, m.name AS manager
FROM employee AS e
LEFT JOIN employee AS m ON m.id = e.manager_id
ORDER BY e.id;
```

Ada's `manager_id` and `manager` are null. The other rows show ids 1, 1, and 2 with names Ada, Ada, and Grace.

**Trade-offs and Alternatives:**

The recursive CTE in the earlier question walks an unknown number of levels. The self-join answers exactly one level, which is what "their manager's name" asks. Two left joins are the right tool for "manager and the manager's manager," and the second join must stay outer if Ada is in the result: her manager is already null, and an inner join to the grandmanager would drop her and also drop Grace, whose manager has a null `manager_id`.

**Common Mistakes:**

- Joining `e.id = m.manager_id`, which lists reports rather than the manager. Ada would then appear three times in a grouped mess, once for herself if you also preserve her, and the column you called manager would be a report.
- Using an inner join because "everyone has a manager in production." The schema says otherwise, and Ada is the proof.
- Filtering `WHERE m.name IS NOT NULL` in a report titled "all staff."
- Comparing `e.manager_id = m.manager_id` to find "the manager." That pairs coworkers who share a manager, a different question, and it also pairs every top-level null with every other top-level null only if you use `IS NOT DISTINCT FROM`. With `=`, two null manager ids do not match.

**Senior-Level Follow-up:**

Write the query for employees who share a manager, excluding a person paired with themselves, and give the rows. Ada is excluded because her `manager_id` is null.

**Answer:**

```sql
SELECT e.name AS employee, peer.name AS peer
FROM employee AS e
JOIN employee AS peer
  ON peer.manager_id = e.manager_id
 AND peer.id <> e.id
ORDER BY e.id, peer.id;
```

Grace and Lin both have manager 1. Edsger is the only report of manager 2, so he has no peer. Ada's null manager id matches nothing under `=`.

| employee | peer |
|---|---|
| Grace | Lin |
| Lin | Grace |

The pair appears twice, once from each side. That is the join of two people, not a bug. `e.id < peer.id` keeps a single unordered pair, Grace/Lin, when the caller wants each pair once.

### DB-025 — Null-safe equality is IS NOT DISTINCT FROM

**Difficulty:** Senior

**Category:** Nulls and three-valued logic

**Question:**

`stored` and `incoming` should report the ids whose `status` or `note` changed, including a change from null to a value or from a value to null. Why does `<>` miss rows, and what does the null-safe query return? How do `UNION`, `DISTINCT`, and `GROUP BY` treat those nulls?

**Context and Constraints:**

```sql
CREATE TABLE stored (
  id integer PRIMARY KEY,
  status text,
  note text
);

CREATE TABLE incoming (
  id integer PRIMARY KEY,
  status text,
  note text
);

INSERT INTO stored (id, status, note) VALUES
  (1, 'open', NULL),
  (2, 'open', 'a'),
  (3, 'open', 'a');

INSERT INTO incoming (id, status, note) VALUES
  (1, 'open', 'a'),
  (2, NULL, 'a'),
  (3, 'open', 'a');
```

Ids match. There is no extra id on either side.

**Senior Engineer's Answer:**

`<>` is unknown when either side is null. `WHERE` then drops the row. For id 1, status `<>` is false, and `NULL <> 'a'` is unknown. `false OR unknown` is unknown. For id 2, `'open' <> NULL` is unknown and `'a' <> 'a'` is false. `unknown OR false` is unknown. For id 3 both inequalities are false. The `<>` query returns no rows. Two real changes are missing, and the unchanged row is correctly missing for the wrong reason on the other two.

`IS DISTINCT FROM` is true when the values differ, and it treats null as a comparable value. `NULL IS DISTINCT FROM 'a'` is true. `'open' IS DISTINCT FROM NULL` is true. `NULL IS DISTINCT FROM NULL` is false. `IS NOT DISTINCT FROM` is the match.

```sql
SELECT s.id
FROM stored AS s
JOIN incoming AS i ON i.id = s.id
WHERE s.status IS DISTINCT FROM i.status
   OR s.note IS DISTINCT FROM i.note
ORDER BY s.id;
```

Result ids: 1 and 2. Id 3 drops out because neither column is distinct.

The same nulls collapse under set and grouping operators. `SELECT CAST(NULL AS integer) UNION SELECT CAST(NULL AS integer)` returns one row, a null integer. `UNION` removes duplicates, and two nulls are duplicates there. `UNION ALL` of those two selects returns two null rows. `GROUP BY` does the same collapse:

```sql
SELECT amount, COUNT(*) AS n
FROM (VALUES (NULL::integer), (NULL::integer), (1), (1)) AS v(amount)
GROUP BY amount
ORDER BY amount NULLS FIRST;
```

| amount | n |
|---|---:|
| NULL | 2 |
| 1 | 2 |

`SELECT DISTINCT amount` from `(NULL), (NULL), (1)` contains two rows, null and 1, in no defined order. `COUNT(DISTINCT amount)` on that input is 1, because the distinct null is not counted.

A unique constraint on the same column, without `NULLS NOT DISTINCT`, would store both nulls. Saying "nulls are equal in SQL" is too coarse. `=` yields unknown. `IS NOT DISTINCT FROM`, `UNION`, `DISTINCT`, and `GROUP BY` treat nulls as the same. Default `UNIQUE` does not.

**Practical Implementation:**

```sql
SELECT s.id
FROM stored AS s
JOIN incoming AS i ON i.id = s.id
WHERE s.status IS DISTINCT FROM i.status
   OR s.note IS DISTINCT FROM i.note
ORDER BY s.id;
```

For a sync that also inserts ids only on one side, add a full outer join and treat a missing side as a change:

```sql
SELECT COALESCE(s.id, i.id) AS id
FROM stored AS s
FULL JOIN incoming AS i ON i.id = s.id
WHERE s.id IS NULL
   OR i.id IS NULL
   OR s.status IS DISTINCT FROM i.status
   OR s.note IS DISTINCT FROM i.note
ORDER BY id;
```

On the current rows both ids exist for 1, 2, and 3, so this returns the same ids 1 and 2. A stored id 4 with no incoming row would appear. A `<>` version of this full join would still miss ids 1 and 2.

**Trade-offs and Alternatives:**

`COALESCE(s.note, '') IS DISTINCT FROM COALESCE(i.note, '')` turns null and empty string into the same value, so a change from null to `''` disappears. Use it only when the product says those are the same. Otherwise compare with `IS DISTINCT FROM` and leave the nulls as nulls.

`UNION` is the set union: it removes duplicates and can hash or sort to do that. `UNION ALL` appends the bags. Prefer `UNION ALL` when both branches are already disjoint or duplicates are meaningful. Prefer `UNION` when the result must be a set. Neither operator is a license to compare nulls with `=` inside the branch queries.

`EXCEPT` uses the same distinctness as `UNION`. `SELECT CAST(NULL AS integer) EXCEPT SELECT CAST(NULL AS integer)` returns no rows. The null is subtracted. That is a different result from `NOT IN` with a null in the list, which makes every outer row unknown rather than subtracting one distinct null.

**Common Mistakes:**

- Writing change detection with `<>` and testing it on rows where every column is filled. Ids 1 and 2 never appear in that test.
- Using `IS DISTINCT FROM` on the primary key in the `WHERE` clause and also joining on that key. The join already guarantees the ids are equal. The distinct test belongs on the payload columns.
- Expecting `UNION` of two null notes to keep both, by analogy with `UNIQUE`.
- Fixing a null by `COALESCE` inside the comparison and storing the coalesced empty string back into the table. The comparison default and the stored value are separate decisions.

**Senior-Level Follow-up:**

`SELECT 1 WHERE NULL = NULL` and `SELECT 1 WHERE NULL IS NOT DISTINCT FROM NULL`. How many rows does each return? And `SELECT CAST(NULL AS integer) EXCEPT SELECT CAST(NULL AS integer)`?

**Answer:** The `=` form returns no rows, because the predicate is unknown. The `IS NOT DISTINCT FROM` form returns one row, the value 1, because the predicate is true. `EXCEPT` returns no rows: the null integer on the left is distinct-equal to the null integer on the right and is removed. Three operators, three results you can defend from the rows alone.

### DB-026 — UNION returns a set; UNION ALL keeps every row

**Difficulty:** Intermediate

**Category:** Set operations

**Question:**

What does each query return, what are the output column names and types, and which `ORDER BY` clauses are legal on the combined result?

**Context and Constraints:**

PostgreSQL 16. Each statement runs on its own. A result with no `ORDER BY` is a set of rows; the sequences below are claimed only where the query sorts.

```sql
CREATE TABLE current_shift (
  employee_id integer,
  task text
);

CREATE TABLE next_shift (
  employee_id integer,
  task text
);

INSERT INTO current_shift (employee_id, task) VALUES
  (1, 'intake'),
  (1, 'intake'),
  (2, 'lab');

INSERT INTO next_shift (employee_id, task) VALUES
  (2, 'lab'),
  (3, 'rounds');
```

**Senior Engineer's Answer:**

`UNION` returns each distinct row once. `UNION ALL` returns every row from both inputs. Distinct means the whole row: both columns match. The two `(1, 'intake')` rows in `current_shift` are one row under `UNION`. `(2, 'lab')` is in both tables and is still one row under `UNION`.

```sql
SELECT employee_id AS person, task
FROM current_shift
UNION
SELECT employee_id, task
FROM next_shift
ORDER BY person, task;
```

| person | task |
|---:|---|
| 1 | intake |
| 2 | lab |
| 3 | rounds |

The same inputs with `UNION ALL`, ordered the same way, return five rows: `(1, intake)`, `(1, intake)`, `(2, lab)`, `(2, lab)`, `(3, rounds)`. The left input contributes its three stored rows and the right input contributes its two.

Output names come from the left input. The column is `person`, not the right-hand name. `ORDER BY person` is legal. `ORDER BY employee_id` is not, because that name is not an output column of the combined result. An `ORDER BY` on a `UNION`, `INTERSECT`, or `EXCEPT` can use an output name or an output number (`ORDER BY 1, 2`). It cannot use an expression such as `lower(task)`.

Both sides need the same number of columns, and each pair of columns needs a common type. `SELECT employee_id FROM current_shift UNION SELECT employee_id, task FROM next_shift` fails because the counts differ. `SELECT task FROM current_shift UNION SELECT employee_id FROM next_shift` fails because `text` and `integer` do not resolve.

Resolution is pairwise, left to right. `SELECT 1.5 AS n UNION SELECT 1 ORDER BY n` has type `numeric` and the values 1.5 and 1, because `integer` converts to `numeric` and the two numbers are not the same value. `SELECT NULL UNION SELECT NULL UNION SELECT 1` fails with `UNION types text and integer cannot be matched` (`42804`). The first pair is two unknown literals, which resolve as `text`, and `text` then meets `integer`. Cast the left null so the chain starts as `integer`:

```sql
SELECT CAST(NULL AS integer) AS n
UNION
SELECT CAST(NULL AS integer)
UNION
SELECT 1
ORDER BY n NULLS FIRST;
```

That returns two rows, a null integer and 1. The two cast nulls are one row. `UNION DISTINCT` is the same operator as `UNION`. `DISTINCT` is the default for every set operator, which is the opposite default from `SELECT ALL`.

`ORDER BY` and `LIMIT` written after the set operator apply to the combined result. Parentheses attach them to one input: `(SELECT employee_id, task FROM current_shift ORDER BY employee_id LIMIT 1)` limits that input before the union. The combined rows still have no order until an `ORDER BY` follows the set operator.

**Practical Implementation:**

```sql
SELECT employee_id AS person, task
FROM current_shift
UNION ALL
SELECT employee_id, task
FROM next_shift
ORDER BY person, task;
```

Five rows, in the order listed above. Use `UNION` when the caller asked for the set of assignments. Use `UNION ALL` when a repeated assignment is itself a fact, or when the two inputs cannot share a row and the duplicate pass would be wasted work.

**Trade-offs and Alternatives:**

`UNION ALL` plus a later `DISTINCT` or `GROUP BY` pays for the append and then pays again to collapse it. Put `UNION` at the point where the set is the meaning. Keep `UNION ALL` when the inputs are already disjoint, such as one branch for current rows and one branch for archived rows that were moved, not copied.

A column list on an outer query fixes names the left input named badly: `SELECT person AS employee_id, task FROM ( ... UNION ... ) AS u`.

**Common Mistakes:**

- Sorting one branch and expecting the combined client cursor to keep that order.
- Selecting one extra column on the right input.
- Leaving a null literal untyped at the start of a chain that later unions an integer.
- Writing `ORDER BY lower(task)` on the combined result and then wrapping the expression in the left select list, which changes the row identity `UNION` compares.

**Senior-Level Follow-up:**

`SELECT 1 AS n UNION SELECT 1.0 ORDER BY n`. How many rows, and what type?

**Answer:** One row, type `numeric`, value 1. The integer converts to `numeric`, and `1` and `1.0` are the same numeric value, so `UNION` keeps a single row. `UNION ALL` of those two selects returns two numeric rows, both 1.

### DB-027 — INTERSECT and EXCEPT treat null as a matching row

**Difficulty:** Senior

**Category:** Set operations

**Question:**

What do `INTERSECT`, `EXCEPT`, `INTERSECT ALL`, and `EXCEPT ALL` return for these tags? How does `INTERSECT` bind relative to `UNION`?

**Context and Constraints:**

```sql
CREATE TABLE left_tag (label text);
CREATE TABLE right_tag (label text);

INSERT INTO left_tag (label) VALUES
  ('a'), ('a'), ('b'), (NULL), (NULL);

INSERT INTO right_tag (label) VALUES
  ('a'), ('c'), (NULL);
```

Ordered results below use `ORDER BY label NULLS FIRST`. Duplicate removal compares the whole row. A null label matches another null label.

**Senior Engineer's Answer:**

`INTERSECT` returns rows that appear in both inputs, one copy of each. `EXCEPT` returns rows that appear in the left input and not in the right, one copy of each. `ALL` keeps multiplicity: `INTERSECT ALL` returns `min(m, n)` copies, and `EXCEPT ALL` returns `max(m - n, 0)` copies, where `m` is the left count and `n` is the right count.

Left counts: `'a'` 2, `'b'` 1, null 2. Right counts: `'a'` 1, `'c'` 1, null 1.

`INTERSECT` returns null and `'a'`. `'b'` is only on the left. `'c'` is only on the right. The two left nulls and the one right null are the same row for this operator, so one null survives, and the extra left null does not.

`EXCEPT` returns only `'b'`. Both copies of `'a'` are removed because the right side has `'a'`. Both nulls are removed because the right side has a null. `'c'` was never on the left.

`INTERSECT ALL` returns one `'a'` (`min(2, 1)`) and one null (`min(2, 1)`).

`EXCEPT ALL` returns one `'a'` (`2 - 1`), one `'b'` (`1 - 0`), and one null (`2 - 1`).

`INTERSECT` binds more tightly than `UNION` and `EXCEPT`, and those two bind equally, left to right.

```sql
SELECT 'a' AS label
UNION
SELECT 'b'
INTERSECT
SELECT 'b'
ORDER BY label;
```

This is `'a' UNION ('b' INTERSECT 'b')`, so the rows are `'a'` and `'b'`.

```sql
(SELECT 'a' AS label UNION SELECT 'b')
INTERSECT
SELECT 'b'
ORDER BY label;
```

This returns only `'b'`.

```sql
SELECT 'a' AS label
EXCEPT
SELECT 'a'
INTERSECT
SELECT 'a';
```

This is `'a' EXCEPT ('a' INTERSECT 'a')`, which is empty. Parentheses are the way to subtract first and then intersect.

`INTERSECT DISTINCT` and `EXCEPT DISTINCT` are the spelled-out defaults. The inputs still need the same column count and compatible types, and the output names still come from the left input. An untyped `NULL` on one side and a `text` label on the other resolves to `text`. Two untyped nulls unioned before they meet an integer fail the same way a `UNION` chain does.

**Practical Implementation:**

```sql
SELECT label FROM left_tag
EXCEPT ALL
SELECT label FROM right_tag
ORDER BY label NULLS FIRST;
```

| label |
|---|
| NULL |
| a |
| b |

The interview query that means "tags we had and still have" is `INTERSECT`. The query that means "tags to delete because the new set dropped them" is `EXCEPT`. Use `ALL` only when the caller asked for a count of extra copies. A plain `EXCEPT` of two `'a'` rows on the left and one `'a'` on the right drops `'a'` completely, which is the wrong delta if the extra left copy is a second assignment that must remain.

**Trade-offs and Alternatives:**

`EXCEPT` answers absence in the right input. A left anti-join answers "rows whose key failed to match" and can keep columns that were never in the set operator's row. Once the row you compare includes a payload column, a payload mismatch keeps the left row even when the key was on the right. Choose the row shape before choosing the operator.

`INTERSECT` of two large inputs builds a hashed or sorted set. If the right input is a key list you already trust as unique, an inner join on that key returns the same keys and can carry columns from both sides. The set operator is the right tool when the matching rule is "the whole projected row," including a null.

**Common Mistakes:**

- Expecting `EXCEPT` to remove one copy per right-hand row. That is `EXCEPT ALL`. Plain `EXCEPT` removes the value.
- Expecting a null label to survive `EXCEPT` because "nulls are not equal." Under `INTERSECT` and `EXCEPT`, the null matches the other null.
- Reading `A UNION B INTERSECT C` as `(A UNION B) INTERSECT C`.
- Ordering the combined result by a column that only one input selected.

**Senior-Level Follow-up:**

`SELECT CAST(NULL AS integer) EXCEPT SELECT CAST(NULL AS integer)`. How many rows? And `EXCEPT ALL` of two left nulls against one right null?

**Answer:** The plain `EXCEPT` returns no rows. The null integer is a left row that also exists on the right, so it is removed. `EXCEPT ALL` with two left nulls and one right null returns one null integer, because `max(2 - 1, 0)` is 1.

### DB-028 — DISTINCT, GROUP BY, and DISTINCT ON answer different questions

**Difficulty:** Senior

**Category:** Duplicate removal

**Question:**

For these invoices, what does `SELECT DISTINCT` return, what does the grouped sum return, and which single invoice does `DISTINCT ON (customer_id)` keep?

**Context and Constraints:**

```sql
CREATE TABLE invoice (
  id integer PRIMARY KEY,
  customer_id integer NOT NULL,
  total numeric NOT NULL
);

INSERT INTO invoice (id, customer_id, total) VALUES
  (10, 1, 40),
  (11, 1, 15),
  (12, 2, 8),
  (13, 2, 8);
```

"The latest invoice" in this question means the greatest `id` for that `customer_id`.

**Senior Engineer's Answer:**

`SELECT DISTINCT customer_id FROM invoice ORDER BY customer_id` returns 1 and 2. `SELECT customer_id FROM invoice GROUP BY customer_id ORDER BY customer_id` returns the same two values. With no aggregate, both expressions say "one output row per distinct `customer_id`."

`SELECT DISTINCT customer_id, total FROM invoice ORDER BY customer_id, total` compares the pair:

| customer_id | total |
|---:|---:|
| 1 | 15 |
| 1 | 40 |
| 2 | 8 |

Customer 2's two rows are the same pair, so they become one row. Customer 1's totals differ, so both pairs remain. `DISTINCT` does not know that 15 and 40 belong to one customer total. It only collapses equal select-list rows.

The sum is a grouped query:

```sql
SELECT customer_id, SUM(total) AS amount
FROM invoice
GROUP BY customer_id
ORDER BY customer_id;
```

| customer_id | amount |
|---:|---:|
| 1 | 55 |
| 2 | 16 |

`SELECT DISTINCT customer_id, SUM(total) FROM invoice` is rejected. The aggregate needs groups. `DISTINCT` runs after the select list is formed and does not create those groups.

`DISTINCT ON` keeps one input row per key, and the row it keeps is the first row of that key in `ORDER BY`:

```sql
SELECT DISTINCT ON (customer_id) customer_id, id, total
FROM invoice
ORDER BY customer_id, id DESC;
```

| customer_id | id | total |
|---:|---:|---:|
| 1 | 11 | 15 |
| 2 | 13 | 8 |

The `DISTINCT ON` expressions must be the leftmost `ORDER BY` expressions. `ORDER BY id DESC` alone fails: `SELECT DISTINCT ON expressions must match initial ORDER BY expressions`. Without an `ORDER BY` that picks a winner, PostgreSQL still returns one row per `customer_id`, and which invoice survives is not defined.

`DISTINCT` is step 6 of `SELECT` processing, after the select list and after grouping. Two different invoices can still collapse there if the select list omitted `id` and their remaining columns match, which is what happened to the two `(2, 8)` pairs.

**Practical Implementation:**

```sql
SELECT DISTINCT ON (customer_id)
  customer_id, id, total
FROM invoice
ORDER BY customer_id, id DESC;
```

That is the latest invoice per customer for this definition of latest. The sum query above is the customer total. They are not substitutes. The latest row's `total` is 15 for customer 1, while the customer's amount is 55.

**Trade-offs and Alternatives:**

`DISTINCT ON` is a PostgreSQL extension and it keeps columns from the winning row without an extra join. Standard SQL can do the same job with a ranked subquery that filters rank 1, which is easier to move to another engine and easier to extend to "top two." Use `DISTINCT ON` when the ranking rule fits in `ORDER BY` and the query stays on PostgreSQL.

`SELECT DISTINCT` on a join that multiplied rows hides the multiplication in the output and leaves the join wrong. Collapse with `DISTINCT` when the requested result really is a set of values.

**Common Mistakes:**

- Writing `DISTINCT` around `SUM` and expecting one sum per customer.
- Adding `id DESC` to `ORDER BY` without putting `customer_id` first, then "fixing" the error by deleting `DISTINCT ON`.
- Omitting `ORDER BY` and treating whichever row came back as the latest invoice.
- Selecting `customer_id, total` with `DISTINCT` and reporting three rows as three customers.

**Senior-Level Follow-up:**

What does `SELECT DISTINCT ON (customer_id) customer_id, total FROM invoice ORDER BY customer_id, total DESC` return?

**Answer:** Customer 1's greatest `total` is 40, from invoice 10. Customer 2's only distinct total in the sort is 8. The rows are `(1, 40)` and `(2, 8)`. This query never sees `id`. If two invoices shared customer 1 and the total 40, either of those invoices could supply the row, because the `ORDER BY` tie is not broken. The previous query ordered by `id DESC`, so its winner was defined.

### DB-029 — CASE takes the first true branch

**Difficulty:** Intermediate

**Category:** Conditional expressions

**Question:**

What does the simple `CASE` return for each ticket, and what does the searched `CASE` return? Which branch runs when more than one condition is true?

**Context and Constraints:**

```sql
CREATE TABLE ticket (
  id integer PRIMARY KEY,
  priority integer,
  status text NOT NULL
);

INSERT INTO ticket (id, priority, status) VALUES
  (1, NULL, 'open'),
  (2, 1, 'open'),
  (3, 2, 'closed'),
  (4, 9, 'open');
```

**Senior Engineer's Answer:**

A searched `CASE` tests boolean conditions in order and returns the result of the first condition that is true. Later branches are not used. If none is true, the `ELSE` result is returned. With no `ELSE`, the result is null.

A simple `CASE` computes one expression and compares it to each `WHEN` value with `=`. The first equal value wins. `NULL = NULL` is not true, so `WHEN NULL` does not match a null `priority`.

```sql
SELECT id,
  CASE priority
    WHEN 1 THEN 'high'
    WHEN NULL THEN 'missing'
    ELSE 'other'
  END AS simple_label,
  CASE
    WHEN priority IS NULL THEN 'missing'
    WHEN priority = 1 THEN 'high'
    WHEN status = 'closed' THEN 'closed'
    ELSE 'other'
  END AS searched_label
FROM ticket
ORDER BY id;
```

| id | simple_label | searched_label |
|---:|---|---|
| 1 | other | missing |
| 2 | high | high |
| 3 | other | closed |
| 4 | other | other |

Ticket 1 proves the simple form: the null priority matches neither `1` nor `NULL`, so `ELSE` runs. The searched form's first condition is `priority IS NULL`, which is true, so the label is `missing`.

Ticket 2 also has `status = 'open'`. This expression still returns `high` only because `priority IS NULL` is false and `priority = 1` is the next true condition. Put the status test first and the same row returns `still open`:

```sql
CASE
  WHEN status = 'open' THEN 'still open'
  WHEN priority = 1 THEN 'high'
  ELSE 'other'
END
```

Tickets 2 and 4 return `still open`, because `status = 'open'` is already true and the priority test does not run. Ticket 3's status is `closed`, so both tests fail and the result is `other`. Order is the specification.

`CASE WHEN priority = 1 THEN 'high' END` has no `ELSE`. Ticket 2 is `high`. Tickets 1, 3, and 4 are null.

Every `THEN` and the `ELSE` must resolve to one result type. `CASE WHEN true THEN 1 ELSE 2.5 END` is numeric, value 1. `CASE WHEN true THEN 1 ELSE 'a' END` fails because `integer` and `text` do not resolve.

At execution, a branch that is not chosen is not evaluated. A searched `CASE` can guard a division by putting it in the arm that runs only when the denominator is not zero. A constant such as `1/0` written in an arm that would not be chosen is still usually evaluated while the statement is planned, so it can fail before any row is read. The guard belongs on a value that is not a constant failure.

**Practical Implementation:**

```sql
SELECT id,
  CASE
    WHEN priority IS NULL THEN 'missing'
    WHEN priority = 1 THEN 'high'
    WHEN status = 'closed' THEN 'closed'
    ELSE 'other'
  END AS label
FROM ticket
ORDER BY id;
```

The labels are `missing`, `high`, `closed`, and `other`.

**Trade-offs and Alternatives:**

A lookup table joined on `priority` is the better home when the labels are data that product edits. `CASE` is the better home when the rule is "null priority is missing, and a closed ticket says closed even if priority is 2," because that rule is ordered and references two columns. A join has no "first match" unless you write it.

Application `if` statements drift per client. The `CASE` in the query is the rule the report and the API can share.

**Common Mistakes:**

- Writing `WHEN NULL` in a simple `CASE` and testing it only with priority 1, where the bug is invisible.
- Stacking true conditions and assuming they combine. The first true branch returns, and the rest do not run.
- Omitting `ELSE` and then treating a null label as a priority that was stored null. Ticket 4's priority is 9, and the null label means no branch matched.
- Mixing a numeric `THEN` with a text `ELSE`.

**Senior-Level Follow-up:**

What does `CASE priority WHEN 1 THEN 'high' ELSE priority::text END` return for ticket 1?

**Answer:** The simple comparison does not match, so `ELSE` runs and casts `priority` to text. The result is null, because casting a null integer to text is null. It is not the word `missing`. A null result here means the `ELSE` expression was null, which is a different fact from "no `ELSE` clause existed."

### DB-030 — COALESCE returns the first non-null argument

**Difficulty:** Intermediate

**Category:** Conditional expressions

**Question:**

What does `COALESCE(nickname, name)` return for each person? What does an empty string do, and what does a later argument that cannot share a type do?

**Context and Constraints:**

```sql
CREATE TABLE person (
  id integer PRIMARY KEY,
  name text NOT NULL,
  nickname text
);

INSERT INTO person (id, name, nickname) VALUES
  (1, 'Ada', NULL),
  (2, 'Grace', ''),
  (3, 'Lin', 'L');
```

**Senior Engineer's Answer:**

`COALESCE` returns the first argument that is not null. If every argument is null, the result is null. An empty string is not null.

```sql
SELECT id, COALESCE(nickname, name) AS label
FROM person
ORDER BY id;
```

| id | label |
|---:|---|
| 1 | Ada |
| 2 | `''` |
| 3 | L |

Person 2 keeps `''`. The display is blank because the nickname was stored as a blank, and `COALESCE` did not move on to `'Grace'`. Person 1 moves on because the nickname is null. Person 3 stops on `'L'` and does not read `name` for the result.

`COALESCE(NULL::text, NULL::text, 'fallback')` returns `fallback`. Arguments after the first non-null argument are not evaluated at execution. They still have to type-check. `COALESCE(1, 'a')` fails: `integer` and `text` do not resolve to a common type. `COALESCE(nickname, name)` is `text` because both columns are `text`.

`COALESCE` is the compact form of a searched `CASE`:

```sql
CASE
  WHEN nickname IS NOT NULL THEN nickname
  ELSE name
END
```

That expression returns the same three labels. Use the `CASE` form when a later branch depends on a condition other than "the previous value was null," such as "use the nickname only when status is active."

A constant error in a later argument can still fail while the statement is planned, the same planning rule as `CASE`. Do not park `1/0` in the second argument and expect the first non-null argument to save the statement.

**Practical Implementation:**

```sql
SELECT id, COALESCE(nickname, name, '(unnamed)') AS label
FROM person
ORDER BY id;
```

On these rows the third argument is never chosen, because `name` is `NOT NULL`. The labels stay `Ada`, the empty string, and `L`. The fallback matters for a row that has not been inserted here: both nickname and name null. This table rejects that name, so the fallback is dead on `person` and live on a query that outer-joins to `person` and produces a null name.

**Trade-offs and Alternatives:**

If the product treats blank and missing as the same, turn the blank into null before `COALESCE`. `NULLIF(nickname, '')` does that, and the next question owns `NULLIF`. Applying it here, person 2's label becomes `Grace`. That is a product rule, not the definition of `COALESCE`.

`COALESCE` on a column can hide a missing value in a report and leave the table dirty. Fix storage when blank is illegal. Format at the edge when blank is legal input and the screen still wants a placeholder.

**Common Mistakes:**

- Testing person 1 and shipping a label that turns person 2's blank nickname into `Grace`.
- Writing `COALESCE(nickname, name)` to satisfy a `NOT NULL` insert. The expression does not add a constraint. The next insert can store a null nickname again.
- Passing an integer fallback and a text column and reading the error as a data problem.
- Calling `COALESCE` twice on the same column in an attempt to treat both null and `''` as missing. The second call still sees `''` as a value. `NULLIF` is the operation that maps the sentinel to null.

**Senior-Level Follow-up:**

`COALESCE(nickname, NULL, name)` for person 1 and person 2. Any change?

**Answer:** No change. Person 1 skips the null nickname and skips the explicit null, then returns `Ada`. Person 2 returns `''` at the first argument and does not look further. A null in the middle of the list is skipped. A non-null empty string is a result.

### DB-031 — AND and OR are three-valued, and WHERE keeps only true

**Difficulty:** Senior

**Category:** Three-valued logic

**Question:**

For each flag row, what are `active AND archived`, `active OR archived`, and `NOT active`? Which ids does `WHERE` keep for `active`, for `NOT active`, and for `active IS NOT TRUE`?

**Context and Constraints:**

```sql
CREATE TABLE flag (
  id integer PRIMARY KEY,
  active boolean,
  archived boolean
);

INSERT INTO flag (id, active, archived) VALUES
  (1, true, false),
  (2, true, NULL),
  (3, false, NULL),
  (4, NULL, NULL),
  (5, false, false);
```

A `WHERE` clause keeps a row only when its predicate is true.

**Senior Engineer's Answer:**

`AND`, `OR`, and `NOT` operate on true, false, and unknown. A null boolean is unknown.

`false AND` anything is false, including `false AND unknown`. `true AND unknown` is unknown. `unknown AND unknown` is unknown. `true OR` anything is true, including `true OR unknown`. `false OR unknown` is unknown. `NOT unknown` is unknown.

```sql
SELECT id,
  active AND archived AS and_result,
  active OR archived AS or_result,
  NOT active AS not_active
FROM flag
ORDER BY id;
```

| id | and_result | or_result | not_active |
|---:|---|---|---|
| 1 | false | true | false |
| 2 | NULL | true | false |
| 3 | false | NULL | true |
| 4 | NULL | NULL | NULL |
| 5 | false | false | true |

`WHERE active` keeps ids 1 and 2. Ids 3 and 5 are false. Id 4 is unknown. False and unknown both leave the result.

`WHERE active OR archived` keeps ids 1 and 2. Id 2 is true because `true OR unknown` is true. Id 3 is unknown. Id 4 is unknown. Id 5 is false.

`WHERE active AND archived` keeps no rows. Id 1 is false. The other four predicates are false or unknown.

`WHERE NOT active` keeps ids 3 and 5, the rows whose `NOT active` is true. Id 4's `NOT active` is unknown, so the row is dropped.

`IS TRUE`, `IS FALSE`, `IS UNKNOWN`, and their `NOT` forms are predicates that return true or false, never unknown. `NULL IS TRUE` is false. `NULL IS NOT TRUE` is true. `NULL IS UNKNOWN` is true.

`WHERE active IS TRUE` keeps ids 1 and 2, the same rows as `WHERE active`, because unknown fails `IS TRUE`. `WHERE active IS NOT TRUE` keeps ids 3, 4, and 5: false and unknown. That is the predicate that treats "not known to be active" as a hit. `WHERE NOT active` is the predicate that treats "known to be inactive" as a hit.

`AND` and `OR` are not the guard to use around an expression that can fail. A searched `CASE` decides which subexpression runs. A boolean operator's job is the truth table above.

**Practical Implementation:**

```sql
SELECT id
FROM flag
WHERE active IS NOT TRUE
ORDER BY id;
```

The ids are 3, 4, and 5. The report "known inactive" is `WHERE active IS FALSE`, which is ids 3 and 5 and does not include the unknown row. `IS FALSE` and `NOT active` agree on these five rows. They stop agreeing if the expression is `active AND archived` rather than a plain column: id 2's conjunction is unknown, `IS FALSE` rejects it, and a careless reading of "not true" would keep it.

**Trade-offs and Alternatives:**

Store an explicit status text with a check that allows only `active`, `inactive`, and `unknown` when the third state is a business value someone should see. A null boolean is easy to forget in a `WHERE` clause, which these ids demonstrate. Keep the boolean nullable when "not collected" is honestly unknown and every query names `IS NOT TRUE` or `IS FALSE` on purpose.

A generated display label can map the three results once, so clients do not reimplement the truth table.

**Common Mistakes:**

- Reading `WHERE NOT active` as "everyone who is not a known active user." Id 4 disappears.
- Filtering `active AND archived` and concluding that nobody is both. Id 2 is not a no. It is unknown.
- Testing the truth table with id 1 only, where unknown never appears.
- Using `AND false` in front of a risky expression and calling that a guard. Put the risky expression in the `CASE` arm that should run.

**Senior-Level Follow-up:**

Which ids does `WHERE active IS UNKNOWN OR archived IS UNKNOWN` return?

**Answer:** Ids 2, 3, and 4. Id 2 has an unknown `archived`. Id 3 has an unknown `archived`. Id 4 has both unknown. Id 1 and id 5 have two known booleans, so both `IS UNKNOWN` tests are false and `false OR false` is false. `IS UNKNOWN` on a boolean column is the same split as `IS NULL`, and the predicate result is true or false.

### DB-032 — A view is a stored query

**Difficulty:** Senior

**Category:** Views

**Question:**

After these statements, which rows does `open_item` return, which inserts through the view succeed, and which columns does a `SELECT *` view gain when `item` gains a column?

**Context and Constraints:**

The current user owns the tables and views. `reader` has no grants of its own until the statement below. PostgreSQL 16. `security_invoker` is left unset.

```sql
CREATE TABLE item (
  id integer PRIMARY KEY,
  name text NOT NULL
);

INSERT INTO item (id, name) VALUES
  (1, 'gauze'),
  (2, 'tape');

CREATE VIEW open_item AS
SELECT id, name FROM item WHERE name <> 'tape';
```

**Senior Engineer's Answer:**

A view stores a query and runs that query when you read it. It does not store the rows. A materialized view is the exception that stores a result and keeps it until `REFRESH MATERIALIZED VIEW`.

`SELECT id, name FROM open_item ORDER BY id` returns `(1, gauze)`. Tape fails the view's `WHERE`.

```sql
INSERT INTO item (id, name) VALUES (3, 'saline');
```

The same select from `open_item` now returns `(1, gauze)` and `(3, saline)`. Nothing was inserted into the view. The view's query saw the new base row.

`open_item` is auto-updatable: one base table, no distinct, no grouping, no aggregates, no set operator, and the select list is plain columns. An insert through the view writes `item`.

```sql
INSERT INTO open_item (id, name) VALUES (4, 'clip');
```

That succeeds. The view select now includes clip, because `'clip' <> 'tape'`.

```sql
INSERT INTO open_item (id, name) VALUES (5, 'tape');
```

That also succeeds. `item` contains `(5, tape)`. `open_item` does not show it. Without `WITH CHECK OPTION`, an insert or update may create a base row the view's `WHERE` rejects.

```sql
CREATE VIEW open_item_checked AS
SELECT id, name FROM item WHERE name <> 'tape'
WITH CHECK OPTION;

INSERT INTO open_item_checked (id, name) VALUES (6, 'tape');
```

The insert fails with `with_check_option_violation` (`44000`). Id 6 is not stored. `WITH CHECK OPTION` means `CASCADED` when you do not say `LOCAL`. On this single view, the check is the view's own `WHERE`.

`CREATE VIEW item_star AS SELECT * FROM item` copies the column list that exists at creation. The stored query names `id` and `name`. It does not keep the star.

```sql
ALTER TABLE item ADD COLUMN note text;
```

`item_star` still has `id` and `name`. `note` is in `item` and not in the view. `CREATE OR REPLACE VIEW` may add columns at the end of that list. It may not reorder, rename, or retype the columns the view already had.

By default, PostgreSQL checks the base tables with the view owner's rights. `reader` can be granted `SELECT` on `open_item` and still have no `SELECT` on `item`. `SELECT` from the view returns the view's rows. `SELECT` from `item` fails with `insufficient_privilege` (`42501`). `security_invoker = true` changes that check to the invoking user, who then needs rights on the view and on `item`. Functions in the view are a separate rule: `CURRENT_USER` inside the view is the invoking user, and a function runs as its owner only when the function itself is `SECURITY DEFINER`.

**Practical Implementation:**

```sql
CREATE VIEW open_item AS
SELECT id, name
FROM item
WHERE name <> 'tape'
WITH CHECK OPTION;

CREATE ROLE reader;
GRANT SELECT ON open_item TO reader;
```

After the inserts that succeeded above, `open_item` returns gauze, saline, and clip. Tape rows in `item` stay in `item`. `reader` selects the view. The owner keeps `INSERT` on the view if clients should write through it, and the check option rejects a write that would vanish from the view.

**Trade-offs and Alternatives:**

An auto-updatable view is enough for a filter and a column subset. A view that joins, aggregates, or unions is not auto-updatable. `INSTEAD OF` triggers can turn those writes into base-table writes, and they are ordinary trigger code you have to keep aligned with the select. Prefer a base table when the write has its own rules, and a view when the read is a saved query.

`WITH LOCAL CHECK OPTION` checks this view's condition and does not restate conditions of an underlying view unless that underlying view has its own check option. `CASCADED` walks the stack of views. A trigger-updatable view does not receive the cascaded check.

**Common Mistakes:**

- Inserting tape through `open_item`, selecting the view, and concluding the insert failed. The base table has the row.
- Adding `note` to `item` and selecting `item_star` for it. The star was expanded when the view was created.
- Granting `SELECT` on the view and also granting `SELECT` on every base column because the default looked too weak. The owner's rights are the default, and the grant on the view is the gate.
- Replacing the view to "just rename a column" with `CREATE OR REPLACE VIEW`. The existing output names and types have to stay, in order, with new columns only at the end.

**Senior-Level Follow-up:**

`UPDATE open_item SET name = 'tape' WHERE id = 4`, with no check option, and the same update on `open_item_checked`. What remains visible in each view?

**Answer:** The first update succeeds and changes item 4's name to tape. `open_item` no longer returns id 4, and `item` still has it. The checked view rejects the same update with `44000`, and id 4 stays `clip` and stays visible. `UPDATE` and `DELETE` through the unchecked view already see only rows the `WHERE` accepts; the check option is what stops an update from moving a visible row out of the view.

### DB-033 — A generated column is computed on write

**Difficulty:** Senior

**Category:** Generated columns

**Question:**

What is `amount_cents` after the insert and after the update? Which writes the column rejects? PostgreSQL 16 has which kind of generated column?

**Context and Constraints:**

```sql
CREATE TABLE line (
  id integer PRIMARY KEY,
  qty integer NOT NULL,
  unit_cents integer NOT NULL,
  amount_cents integer GENERATED ALWAYS AS (qty * unit_cents) STORED
);
```

`qty` and `unit_cents` are ordinary integers. The product is exact.

**Senior Engineer's Answer:**

PostgreSQL 16 implements stored generated columns. The keyword `STORED` is required. The value is computed when the row is written and stored like any other column. A virtual generated column, computed on read, is not available in this version. Omitting `STORED`, or writing `VIRTUAL`, is a syntax error.

```sql
INSERT INTO line (id, qty, unit_cents) VALUES (1, 3, 50);
```

The stored row is `(1, 3, 50, 150)`.

```sql
UPDATE line SET qty = 4 WHERE id = 1;
```

The stored row is `(1, 4, 50, 200)`. Changing an input recomputes the generated column. The generation expression sees the row after `BEFORE` triggers, so a trigger that changes `qty` changes the amount too. A `BEFORE` trigger cannot read `amount_cents`.

The column cannot be written directly.

```sql
INSERT INTO line (id, qty, unit_cents, amount_cents)
VALUES (2, 1, 10, 10);
```

This fails with `generated_always` (`428C9`): a non-`DEFAULT` value was supplied for a generated column. The keyword `DEFAULT` is allowed and means "compute it":

```sql
INSERT INTO line (id, qty, unit_cents, amount_cents)
VALUES (2, 1, 10, DEFAULT);
```

That stores `(2, 1, 10, 10)`. `UPDATE line SET amount_cents = 0` fails the same way. `UPDATE line SET amount_cents = DEFAULT` is accepted and recomputes from `qty` and `unit_cents`.

The expression may use immutable functions and operators, and it may use columns of this row. It may not call a subquery, reference another table, or reference another generated column. `lower(text)` is stable, not immutable, so `GENERATED ALWAYS AS (lower(email)) STORED` is rejected. A second generated column defined as `amount_cents + 1` is rejected because it reads `amount_cents`.

A default is a different mechanism. A default runs when the insert omits the column, and it may be volatile, but it may not read other columns of the new row. A generated column reads its sibling columns and runs again on later updates. It cannot have a default or an identity of its own.

If `qty` were nullable and an insert stored a null `qty`, `amount_cents` would be null because `NULL * unit_cents` is null. `amount_cents integer NOT NULL` would then reject that insert. In the table above, both inputs are `NOT NULL`, so the product is an integer.

**Practical Implementation:**

```sql
INSERT INTO line (id, qty, unit_cents) VALUES (1, 3, 50);
UPDATE line SET qty = 4 WHERE id = 1;
SELECT id, qty, unit_cents, amount_cents FROM line ORDER BY id;
```

| id | qty | unit_cents | amount_cents |
|---:|---:|---:|---:|
| 1 | 4 | 50 | 200 |

Clients omit `amount_cents` on insert and update. A report reads it. There is no second writer to drift from `qty * unit_cents`.

**Trade-offs and Alternatives:**

Use a generated column when the value is a pure function of the same row and you want it stored for every reader. Use a view when you do not want the value stored, or when the calculation reads another table. Use a trigger when the rule is not an immutable expression, such as a `lower(email)` key. The trigger is code you own; the generated column is a constraint the table enforces by construction.

A generated column may appear in a primary key or a unique constraint because the stored value is just a column. It cannot be part of a partition key in PostgreSQL 16.

**Common Mistakes:**

- Sending `amount_cents` from the client "so the number is explicit." `428C9` is the result, including a value that happens to equal the product.
- Creating the column as `GENERATED ALWAYS AS (qty * unit_cents)` and omitting `STORED`. PostgreSQL 16 rejects the statement.
- Defining the email fold as a generated column and then moving the fold into a trigger without dropping the bad definition. `lower(text)` will not become immutable because the column wants it.
- Reading `amount_cents` from a `BEFORE` trigger to log the new total. The value is not available there. An `AFTER` trigger can read it.

**Senior-Level Follow-up:**

Add `tax_cents integer GENERATED ALWAYS AS (amount_cents / 10) STORED` to this table. What happens, and what expression works for a 10 percent tax rounded with integer arithmetic?

**Answer:** The definition is rejected because `amount_cents` is generated. The expression has to mention base columns: `GENERATED ALWAYS AS ((qty * unit_cents) / 10) STORED`. Integer division truncates, so a 200-cent line stores tax 20, and a 15-cent line stores tax 1. If the tax must follow half-away-from-zero rounding, the expression needs `numeric` arithmetic and an explicit round, still written only in terms of `qty` and `unit_cents`.

### DB-034 — A domain constrains a type; a table CHECK can see the row

**Difficulty:** Senior

**Category:** Domains

**Question:**

Which inserts are stored, which constraint fails the others, and why can the spare-unit rule not be a domain?

**Context and Constraints:**

Each insert is its own autocommit statement.

```sql
CREATE DOMAIN posint AS integer
  CHECK (VALUE > 0);

CREATE TABLE shipment (
  id integer PRIMARY KEY,
  units posint,
  spare posint,
  CONSTRAINT shipment_spare_lte_units CHECK (spare <= units)
);
```

Attempted inserts, in order: `(1, 5, 2)`, `(2, 0, 0)`, `(3, 5, 9)`, `(4, NULL, NULL)`.

**Senior Engineer's Answer:**

A domain is a type: a base type plus constraints that run when a value is converted to that type. `posint` is an `integer` whose check sees only `VALUE`. Both `units` and `spare` use that type, so both reject `0` and both accept a positive integer. `CAST(0 AS posint)` fails. `CAST(4 AS posint)` succeeds and is the integer 4.

A domain `CHECK` succeeds when the expression is true or unknown and fails when it is false, reported as `check_violation` (`23514`) on the domain constraint `posint_check`. Unknown is why a null can be a `posint`. The table above allows that null. A column `NOT NULL` is how you require the value on a particular column. PostgreSQL's own guidance is to leave the domain nullable and put `NOT NULL` on the columns that need it.

`(1, 5, 2)` is stored. Both values are `posint`, and `2 <= 5` is true.

`(2, 0, 0)` is rejected by `posint` before the table check matters. Zero is not greater than zero.

`(3, 5, 9)` passes the domain twice and fails `shipment_spare_lte_units` with `23514`. The spare rule compares two columns. A domain has nothing to say about that, because its expression cannot see a neighboring column and cannot contain a subquery.

`(4, NULL, NULL)` is stored. Each domain check is unknown, and `NULL <= NULL` is unknown, so the table check accepts the row too. After the four attempts the table contains `(1, 5, 2)` and `(4, NULL, NULL)`.

`CAST(-3 AS posint)` fails with the same domain violation. An `integer` column with a separate table check would also reject `-3`, and the rule would exist only on that column. The domain puts the rule on the type, so the next table that declares `posint` gets it without copying the check. `ALTER DOMAIN` changes that shared rule and rechecks stored values when you add a constraint.

A column default overrides a domain default. A domain default overrides the base type's default. None of those defaults is set here, so an omitted `units` is null and then takes the path insert 4 took.

**Practical Implementation:**

```sql
CREATE DOMAIN posint AS integer
  CONSTRAINT posint_positive CHECK (VALUE > 0);

CREATE TABLE shipment (
  id integer PRIMARY KEY,
  units posint NOT NULL,
  spare posint NOT NULL,
  CONSTRAINT shipment_spare_lte_units CHECK (spare <= units)
);
```

Naming the domain check keeps `posint_positive` in the error. `NOT NULL` on the columns rejects insert 4 with `not_null_violation` (`23502`) and leaves the positive rule on the type. Insert 1 still stores `(1, 5, 2)`. Insert 3 still fails the table constraint.

**Trade-offs and Alternatives:**

Use a domain when many columns share one base type and one predicate of that single value: a positive integer, a postal code, an email shape. Use a table `CHECK` when the predicate mentions two columns of the row. Use a foreign key when the legal values are rows in another table.

A domain is a poor place for a rule you will want to relax on one column. Every `posint` column shares it. A table check lives on the table that needs the exception.

**Common Mistakes:**

- Copying `CHECK (VALUE > 0)` onto `units` and `spare` as two table checks and letting the third table drift. The domain is the shared rule. The spare comparison stays on `shipment`.
- Declaring `NOT NULL` on the domain and assuming every outer-join null and every already-typed null is rejected. Conversion to the domain is when the domain check runs.
- Writing `CHECK (spare <= units)` inside `CREATE DOMAIN`. `VALUE` is the only variable, and `CREATE DOMAIN` rejects the other name.
- Seeing `23514` and assuming the table constraint failed. Insert 2 fails `posint_check`. Insert 3 fails `shipment_spare_lte_units`. The constraint name is the difference.

**Senior-Level Follow-up:**

`units` is `required_pos`, defined as `integer NOT NULL CHECK (VALUE > 0)`. What does `INSERT INTO shipment (id, units) VALUES (5, (SELECT units FROM shipment WHERE false))` store?

**Answer:** It stores a null `units`. The empty scalar subquery produces a null that is already typed as the domain, so PostgreSQL does not run the domain's `NOT NULL` again. This is why a domain `NOT NULL` is a weak presence rule. Declare the column `required_pos` only if you accept that hole, or declare `posint NOT NULL` on the column so the column constraint still rejects a null.

### DB-035 — DEFERRABLE moves the check to statement end or commit

**Difficulty:** Staff-Level

**Category:** Constraints

**Question:**

This email constraint is `DEFERRABLE INITIALLY IMMEDIATE`. What do the one-statement swap, the two-statement swap, and a commit in the middle store? What changes if the unique constraint is `NOT DEFERRABLE`?

**Context and Constraints:**

PostgreSQL 16. The primary key stays `NOT DEFERRABLE`. Each scenario starts from the two inserted rows and runs in its own transaction. `NOT NULL` and `CHECK` are not deferrable.

```sql
CREATE TABLE account (
  id integer PRIMARY KEY,
  email text NOT NULL,
  CONSTRAINT account_email_key UNIQUE (email)
    DEFERRABLE INITIALLY IMMEDIATE
);

INSERT INTO account (id, email) VALUES
  (1, 'a@ex.com'),
  (2, 'b@ex.com');
```

**Senior Engineer's Answer:**

A constraint is `NOT DEFERRABLE` (the default), `DEFERRABLE INITIALLY IMMEDIATE`, or `DEFERRABLE INITIALLY DEFERRED`. Only `UNIQUE`, `PRIMARY KEY`, `EXCLUDE`, and foreign keys accept `DEFERRABLE`. `NOT NULL` and `CHECK` are checked as the row is written. `SET CONSTRAINTS` can change a deferrable constraint inside the current transaction. Outside a transaction block it emits a warning and does nothing. `NOT DEFERRABLE` constraints ignore `SET CONSTRAINTS`.

`IMMEDIATE` means the check runs at the end of the statement. `DEFERRED` means it runs at commit. PostgreSQL checks a non-deferrable unique constraint as each row is updated, not at the end of the statement.

From the inserted rows, this statement succeeds and leaves `(1, 'b@ex.com')` and `(2, 'a@ex.com')`:

```sql
UPDATE account
SET email = CASE id
  WHEN 1 THEN 'b@ex.com'
  WHEN 2 THEN 'a@ex.com'
END;
```

The constraint is deferrable and currently immediate, so it sees the table after both assignments. Each email is unique again.

The same statement against `UNIQUE (email)` with no `DEFERRABLE` clause fails with `unique_violation` (`23505`). The check fires while one row has moved onto the other row's email. The statement stores nothing, and the emails stay `a@ex.com` and `b@ex.com`. A failed statement inside an open transaction aborts that transaction until `ROLLBACK`.

The two-statement swap needs the check to wait past the first update:

```sql
BEGIN;
SET CONSTRAINTS account_email_key DEFERRED;
UPDATE account SET email = 'b@ex.com' WHERE id = 1;
UPDATE account SET email = 'a@ex.com' WHERE id = 2;
COMMIT;
```

After commit the rows are `(1, 'b@ex.com')` and `(2, 'a@ex.com')`. The first update made both emails `b@ex.com`, which would fail an immediate check. Commit sees a unique pair.

Commit after only the first update fails with `23505`. The transaction does not commit, and the table still holds `a@ex.com` and `b@ex.com`.

`SET CONSTRAINTS account_email_key IMMEDIATE` while changes are outstanding checks them immediately. If they violate the constraint, `SET CONSTRAINTS` fails and leaves the mode unchanged.

A foreign key can target this primary key because the primary key is not deferrable. It cannot target `account_email_key` while that constraint is deferrable. The referenced columns have to be a non-deferrable unique constraint, a non-deferrable primary key, or a non-partial unique index. Deferrable constraints also cannot be the arbiter of `ON CONFLICT`.

**Practical Implementation:**

```sql
BEGIN;
SET CONSTRAINTS account_email_key DEFERRED;
UPDATE account SET email = 'b@ex.com' WHERE id = 1;
UPDATE account SET email = 'a@ex.com' WHERE id = 2;
COMMIT;
```

Keep the primary key immediate and non-deferrable so other tables can reference `id`. Defer the business key you actually swap. Name it, because `SET CONSTRAINTS` takes that name, and an unqualified name follows `search_path` and applies to every match in the first schema that has one.

**Trade-offs and Alternatives:**

`DEFERRABLE INITIALLY IMMEDIATE` is the swap-in-one-statement setting, and it is slower than a non-deferrable unique constraint because the check cannot stop at the first conflicting row in the same way. Declare it when a statement or a transaction legitimately passes through duplicates. Leave the common unique constraint non-deferrable when writers never swap keys.

A third email, update A to the third value, update B to A's old value, then update A to B's old value, works with a non-deferrable constraint and exposes the temporary address to the rest of the transaction. Deferring the constraint keeps the swap as two assignments and holds the violation until commit.

**Common Mistakes:**

- Declaring the primary key `DEFERRABLE` so it can be swapped, and then failing to reference it from a foreign key.
- Issuing `SET CONSTRAINTS ... DEFERRED` in autocommit, seeing the warning, and running the first email update anyway. The constraint is still immediate, and the update fails.
- Committing after the first of the two updates and looking for a row with both emails equal to `b@ex.com`. The commit failed, so the original rows remain.
- Putting `DEFERRABLE` on a `CHECK`. The clause is not accepted there. The check runs as the row is written.

**Senior-Level Follow-up:**

`best_friend_id` references `person(id)` and the foreign key is `DEFERRABLE INITIALLY DEFERRED`. What does this transaction store?

```sql
BEGIN;
INSERT INTO person (id, best_friend_id) VALUES (1, 2);
INSERT INTO person (id, best_friend_id) VALUES (2, 1);
COMMIT;
```

What if the foreign key is `NOT DEFERRABLE`? What if you commit after only the first insert while it is deferred?

**Answer:** The deferred transaction stores `(1, 2)` and `(2, 1)`. Each insert's primary key is checked immediately and does not conflict. The foreign keys are checked at commit, when both ids exist. A `NOT DEFERRABLE` foreign key rejects the first insert with `foreign_key_violation` (`23503`) because id 2 is not there yet, and nothing is stored. Committing after only `(1, 2)` while the foreign key is deferred fails at commit with `23503`, and the table does not keep that row. The primary key stays non-deferrable so it remains a legal target.

### DB-036 — Explicit casts truncate; assignment to varchar rejects

**Difficulty:** Senior

**Category:** Types and casts

**Question:**

What does each insert store, and what do the integer casts return?

**Context and Constraints:**

PostgreSQL 16. Each statement starts from the empty tables unless it follows a successful insert in the same example. `CAST(x AS t)` and `x::t` are the same explicit cast.

```sql
CREATE TABLE code (
  id integer PRIMARY KEY,
  label varchar(3) NOT NULL
);

CREATE TABLE measure (
  id integer PRIMARY KEY,
  n integer NOT NULL
);
```

**Senior Engineer's Answer:**

An explicit cast to `varchar(n)` or `character(n)` truncates to `n` characters and does not raise. Storing a longer string in a `varchar(n)` or `character(n)` column raises `string_data_right_truncation` (`22001`), unless the extra characters are spaces, in which case those spaces are truncated. That split is what this table demonstrates.

```sql
INSERT INTO code (id, label) VALUES (1, 'abcdef');
```

This stores nothing. `22001`.

```sql
INSERT INTO code (id, label) VALUES (1, CAST('abcdef' AS varchar(3)));
```

This stores `(1, 'abc')`. `CAST('ab' AS varchar(3))` stores `'ab'` with no padding.

```sql
INSERT INTO code (id, label) VALUES (2, 'ab');
```

This stores `(2, 'ab')`. The unknown literal is assigned to `varchar(3)`.

`character(n)` is blank-padded on storage, and trailing spaces are insignificant when two `character` values are compared. `char_length` of `'ok'` stored in `character(4)` is 2. Trailing spaces are significant in `varchar` and `text`, and they matter to `LIKE`. `text` is the type to use unless a length limit is a real rule. There is no speed advantage to `character(n)` in PostgreSQL.

Integer casts:

`CAST('12' AS integer)` is 12. `CAST('12.9' AS integer)` fails with `invalid_text_representation` (`22P02`) because that string is not an integer literal. `CAST(CAST('12.9' AS numeric) AS integer)` is 13. Casting `numeric` to `integer` rounds, and a tie rounds away from zero, so `CAST(2.5 AS integer)` is 3 and `CAST(-2.5 AS integer)` is -3. `CAST(1.9 AS integer)` is 2.

```sql
INSERT INTO measure (id, n) VALUES (1, CAST(1.9 AS integer));
```

This stores `(1, 2)`.

```sql
INSERT INTO measure (id, n) VALUES (2, 1.9);
```

This stores nothing. `1.9` is `numeric`, and there is no assignment cast from `numeric` to `integer`. The error is `datatype_mismatch` (`42804`). The explicit cast is the conversion. The bare numeric literal is a type error, not a rounded insert.

`CAST('true' AS boolean)` is true. `CAST('1' AS boolean)` is true. `CAST(1 AS boolean)` fails: there is no cast from `integer` to `boolean`. `CAST('2026-02-31' AS date)` fails with `invalid_datetime_format` (`22007`).

`1 + 2.5` is `numeric` 3.5. The integer is implicitly cast to `numeric` because a common operator exists. Implicit casts are for expressions the type rules already allow. They are not a general "please coerce this."

**Practical Implementation:**

```sql
INSERT INTO code (id, label)
VALUES (1, CAST('abcdef' AS varchar(3)));

INSERT INTO measure (id, n)
VALUES (1, CAST(1.9 AS integer));
```

`code` contains `(1, 'abc')`. `measure` contains `(1, 2)`. Application code that wants a hard length limit should insert the original string and handle `22001`, or reject the string before the statement. Casting to `varchar(3)` first is a silent trim.

**Trade-offs and Alternatives:**

`text` plus `CHECK (length(label) <= 3)` rejects an over-long value with `23514` and never truncates on a cast to the column type, because the column type itself has no length limit. `varchar(3)` rejects assignment and truncates explicit casts. Pick one behavior and test both the long insert and the explicit cast. They are different statements.

`numeric` is the exact type for quantities that round on a declared scale. `real` and `double precision` are binary floats. The cast question's integers are exact; the next numeric question is where division shows up.

**Common Mistakes:**

- "Validating" a code by casting it to `varchar(3)` and inserting the cast. `'abcdef'` becomes `'abc'` and the insert succeeds.
- Inserting `1.9` into an integer column and expecting 2. PostgreSQL rejects the statement.
- Casting `'12.9'` straight to `integer` and then catching a numeric-out-of-range error. The failure is `22P02`, before any rounding.
- Using `character(3)` for a code because it "always has length 3," then comparing it in a way that ignores the pads and reporting `char_length` 3 for a two-character code. The documented `character(4)` value `'ok'` has `char_length` 2.

**Senior-Level Follow-up:**

`INSERT INTO code (id, label) VALUES (3, 'ab ')` and `INSERT INTO code (id, label) VALUES (4, 'abcd')` where the last character of the second value is a space: `'abc '`. What is stored?

**Answer:** `(3, 'ab ')` is stored, three characters, and the trailing space is significant because the column is `varchar`. `(4, 'abc')` is stored. The value is four characters with a final space, the limit is 3, and the surplus is entirely spaces, so PostgreSQL truncates the spaces instead of raising `22001`. A surplus letter still raises `22001`. The space exception is part of assigning to `varchar(n)`, not a trim of spaces in the middle.

### DB-037 — WHERE cannot see a select-list name

**Difficulty:** Senior

**Category:** Query structure

**Question:**

Which of these queries run, and what do the successful ones return? When a name exists both as an input column and as an output name, which one does `GROUP BY` use, and which one does `ORDER BY` use?

**Context and Constraints:**

```sql
CREATE TABLE payment (
  id integer PRIMARY KEY,
  cents integer NOT NULL
);

INSERT INTO payment (id, cents) VALUES
  (1, 100),
  (2, 250),
  (3, 250);
```

**Senior Engineer's Answer:**

Processing order after any `WITH` queries is: `FROM`, `WHERE`, `GROUP BY` and aggregates, `HAVING`, the `SELECT` list, `DISTINCT`, set operations, `ORDER BY`, then `LIMIT` or `FETCH`. `WHERE` therefore cannot see a name invented in the select list.

```sql
SELECT cents AS amount
FROM payment
WHERE amount > 100;
```

This fails with `undefined_column` (`42703`). `amount` does not exist in `FROM`. The filter is `WHERE cents > 100`.

```sql
SELECT cents AS amount
FROM payment
WHERE cents > 100
ORDER BY amount;
```

This returns two rows, both `amount` 250. `ORDER BY` can use an output name. It can also use an output number or an input expression, including a column the select list did not project, except on the result of `UNION`, `INTERSECT`, or `EXCEPT`, where `ORDER BY` is limited to output names and numbers.

`GROUP BY` may use an output name or an output number. This is processed even though the select list is the next logical step:

```sql
SELECT cents AS amount, COUNT(*) AS n
FROM payment
GROUP BY amount
HAVING COUNT(*) > 1
ORDER BY amount;
```

| amount | n |
|---:|---:|
| 250 | 2 |

`HAVING n > 1` fails with `42703`. Output names are not visible in `HAVING`. The aggregate expression is `HAVING COUNT(*) > 1`. A name in `HAVING` has to be a grouping column or sit inside an aggregate.

If a simple name matches both an input column and an output name, `GROUP BY` chooses the input column and `ORDER BY` chooses the output name.

```sql
SELECT cents AS id, COUNT(*) AS n
FROM payment
GROUP BY id
ORDER BY payment.id;
```

`GROUP BY id` groups by the primary key, one row per payment. `id` in the select list is `cents`, and selecting it is legal because `cents` depends on the primary key. `COUNT(*)` is 1 in every group. `ORDER BY payment.id` sorts by the input. The rows are `(100, 1)`, `(250, 1)`, `(250, 1)`.

`ORDER BY id` on that query sorts by the output name, which is `cents`, so 100 comes first and the two 250s follow. Their mutual order is not fixed, because those output values tie.

`SELECT DISTINCT` runs after the select list, so it sees output expressions, not the pre-projection rows. Set operators run after that, which is why their `ORDER BY` sees only the combined outputs.

**Practical Implementation:**

```sql
SELECT cents AS amount, COUNT(*) AS n
FROM payment
GROUP BY amount
HAVING COUNT(*) > 1
ORDER BY amount;
```

Repeat the expression in `WHERE` and `HAVING`, or filter in an outer query that takes `amount` and `n` as real input columns:

```sql
SELECT amount, n
FROM (
  SELECT cents AS amount, COUNT(*) AS n
  FROM payment
  GROUP BY cents
) AS totals
WHERE n > 1
ORDER BY amount;
```

The outer `WHERE` sees `n` because the subquery already produced it. The result is the same one row, `(250, 2)`.

**Trade-offs and Alternatives:**

Repeating `COUNT(*)` in `HAVING` keeps one query level and stays obvious. The outer query is better when the filter is a long expression you do not want to maintain twice, and when you want `WHERE` rather than `HAVING` in the query people read. PostgreSQL's willingness to `GROUP BY` an output name is an extension. A query you might run on another engine should `GROUP BY` the input expression.

**Common Mistakes:**

- Aliasing `cents AS amount` and filtering `WHERE amount > 100` because the select list is "above" the `WHERE` clause on the screen. Processing runs `WHERE` first.
- Filtering `HAVING n > 1` because `GROUP BY amount` was accepted. `HAVING` does not get the same privilege.
- Assuming `GROUP BY id` and `ORDER BY id` resolve a clash the same way. `GROUP BY` binds to `payment.id`. `ORDER BY` binds to the output named `id`.
- Wrapping the query in `UNION` and then writing `ORDER BY cents`. The combined `ORDER BY` can see `amount`, the output name, not the inner input name.

**Senior-Level Follow-up:**

`SELECT cents AS id FROM payment ORDER BY id`. What is the order, and what does `GROUP BY id` do if you add `COUNT(*)` and still select `cents AS id`?

**Answer:** `ORDER BY id` orders by the output, which is `cents`: 100, then 250, then 250. The two 250s have no further key. `GROUP BY id` groups by `payment.id`, so three groups remain and `COUNT(*)` is 1 on each. The output values are still 100, 250, and 250. Adding `ORDER BY id` to that grouped query sorts those output values, not the primary key. `ORDER BY payment.id` sorts by the key.

### DB-038 — ORDER BY puts nulls last on the way up and first on the way down

**Difficulty:** Intermediate

**Category:** Ordering

**Question:**

What id order does each `ORDER BY` produce? Which sort is rejected?

**Context and Constraints:**

```sql
CREATE TABLE event (
  id integer PRIMARY KEY,
  measured_on date
);

INSERT INTO event (id, measured_on) VALUES
  (1, DATE '2026-01-02'),
  (2, NULL),
  (3, DATE '2026-01-01'),
  (4, DATE '2026-01-01');
```

A tie that the sort keys do not break has no defined mutual order. Every order below is fully specified.

**Senior Engineer's Answer:**

`ORDER BY` is the step that defines order. With no `ORDER BY`, these four ids are a set. PostgreSQL's default null placement treats null as larger than every non-null value: `ASC` implies `NULLS LAST`, and `DESC` implies `NULLS FIRST`. `NULLS FIRST` and `NULLS LAST` override that per key. The modifier applies only to the expression it follows. `ORDER BY measured_on, id DESC` sorts the date ascending and the id descending. It does not sort both descending.

```sql
SELECT id
FROM event
ORDER BY measured_on ASC, id ASC;
```

Ids: 3, 4, 1, 2. January 1 sorts before January 2, the two January 1 rows sort by id, and the null date sorts last.

```sql
SELECT id
FROM event
ORDER BY measured_on DESC, id ASC;
```

Ids: 2, 1, 3, 4. The null sorts first under `DESC`, then January 2, then the two January 1 rows by id.

```sql
SELECT id
FROM event
ORDER BY measured_on ASC NULLS FIRST, id ASC;
```

Ids: 2, 3, 4, 1.

`ORDER BY 1` on `SELECT id, measured_on` orders by `id`. The number is the output position, not the id value. It is useful when two output columns share a name. An explicit name is easier to read.

`SELECT DISTINCT measured_on FROM event ORDER BY id` is rejected. A `DISTINCT` query can order by output expressions only. `id` is not in the select list, so it is not an output expression. `ORDER BY measured_on` is legal, and the distinct values are January 1, January 2, and null. With `ORDER BY measured_on` and the default null placement, the dates sort January 1, January 2, null.

Text sorts by the column's collation. A different collation can change letter order. It does not change this date sort.

**Practical Implementation:**

```sql
SELECT id, measured_on
FROM event
ORDER BY measured_on ASC NULLS LAST, id ASC;
```

The application page that says "undated last, then earliest date, then id" is that sort. Write `NULLS LAST` even though `ASC` implies it, if a later editor might flip the date to `DESC` and silently pull nulls to the front. The modifier you wrote stays put only if you wrote it.

**Trade-offs and Alternatives:**

`ORDER BY measured_on NULLS LAST, id` is the sort. A sentinel date stored instead of null makes "missing" look like a real day and breaks range predicates. Keep the null and name the null placement.

If the client sorts again, it can disagree with PostgreSQL's null default. The contract belongs in the query that produces the payload, not in whichever client rendered last.

**Common Mistakes:**

- Reading a browse page with no `ORDER BY` and filing the id order as a bug when it changes.
- Flipping `ASC` to `DESC` and assuming nulls stay at the bottom. Under the default, they move to the top.
- Writing `ORDER BY measured_on DESC, id DESC` when only the date was meant to flip, or the reverse: writing `ORDER BY measured_on, id DESC` and expecting the date to flip too.
- Using `ORDER BY 2` and then inserting a column at the front of the select list. The number now points at a different expression.

**Senior-Level Follow-up:**

`SELECT id FROM event ORDER BY measured_on DESC NULLS LAST, id ASC`. Where is id 2?

**Answer:** Last. `DESC` would have put the null first, and `NULLS LAST` overrides that. The non-null dates sort January 2, then January 1. Ids: 1, 3, 4, 2. The override is per key, so this does not change a later key's null placement. `measured_on` is the only nullable key here.

### DB-039 — OFFSET and FETCH FIRST need an order to name rows

**Difficulty:** Intermediate

**Category:** Limiting

**Question:**

Which ids do these limited queries return? What does `FETCH FIRST 1 ROW WITH TIES` add?

**Context and Constraints:**

The `event` rows are the four rows from the ordering question: id 1 on 2026-01-02, id 2 with a null date, ids 3 and 4 on 2026-01-01. Each query below includes the `ORDER BY` that makes its result defined. A limit with no `ORDER BY` does not name particular ids.

**Senior Engineer's Answer:**

`LIMIT` and `FETCH FIRST` cap how many rows come back. `OFFSET` skips rows of the ordered result before that cap starts. `OFFSET` is applied first when both are present. `FETCH FIRST` without a count means 1. `ROW` and `ROWS`, and `FIRST` and `NEXT`, are noise words.

```sql
SELECT id
FROM event
ORDER BY id
OFFSET 1
LIMIT 1;
```

The ordered ids are 1, 2, 3, 4. Skip one, take one: id 2.

```sql
SELECT id
FROM event
ORDER BY id
FETCH FIRST 2 ROWS ONLY;
```

Ids 1 and 2. `LIMIT 2` is the same cap. `OFFSET 0` changes nothing. A null limit is `LIMIT ALL`. A null offset is `OFFSET 0`.

```sql
SELECT id
FROM event
ORDER BY measured_on ASC NULLS LAST
FETCH FIRST 1 ROW WITH TIES;
```

The earliest `measured_on` is 2026-01-01, shared by ids 3 and 4. `WITH TIES` returns every row that ties the last place under that `ORDER BY`. The result is ids 3 and 4. Their mutual order is not specified, because the sort key does not separate them. `ORDER BY` is mandatory with `WITH TIES`.

```sql
SELECT id
FROM event
ORDER BY measured_on ASC NULLS LAST, id ASC
FETCH FIRST 1 ROW ONLY;
```

Id 3 only. Adding `id` to the sort removed the tie, and `ONLY` stops at one row. The same `ORDER BY` with `WITH TIES` still returns id 3 only, because no other row matches both sort keys.

`LIMIT` and `OFFSET` without `ORDER BY` ask for some subset, not for a particular subset. Repeating the query can return different ids. Changing the limit can change which unordered rows appear. The result is not a bug in the table. The statement never named an order.

Skipped rows are still produced and then discarded. A large offset is a legal way to express "skip 10,000" and a poor way to walk a long list. Keyset pagination, "rows after this sort key," names the next page without skipping a growing prefix. That predicate is ordinary `WHERE`, not a different limit syntax.

**Practical Implementation:**

```sql
SELECT id, measured_on
FROM event
ORDER BY measured_on ASC NULLS LAST, id ASC
OFFSET 0 ROWS
FETCH FIRST 2 ROWS ONLY;
```

The first page is id 3, then id 4. The next page is `OFFSET 2` with the same order, which returns id 1, then id 2. `FETCH` and `OFFSET` in the SQL standard want the offset first. PostgreSQL also accepts the other order. Prefer the standard order when you write `FETCH`.

**Trade-offs and Alternatives:**

`LIMIT` is the PostgreSQL spelling. `FETCH FIRST` is the SQL spelling and the one that can say `WITH TIES`. Use `WITH TIES` when the page must not split a tie, and accept that the page can be larger than the count. Use `ONLY` plus a unique trailing sort key when the page size must be exact.

An unordered limit is appropriate for "any row" or "exists in this sample," where you will not display the choice as the first row. It is the wrong tool for a user-visible page.

**Common Mistakes:**

- Paging with `OFFSET :n LIMIT 20` and no `ORDER BY`, then reporting missing and duplicate rows as the user clicks Next.
- Expecting `FETCH FIRST 1 ROW WITH TIES` ordered by `measured_on, id` to return both January 1 rows. The id key broke the tie.
- Treating `OFFSET 10000` as a seek to a bookmark. The statement still builds the 10,000 skipped rows.
- Writing `LIMIT` in a branch of a `UNION` without parentheses and limiting the combined result by accident.

**Senior-Level Follow-up:**

`ORDER BY measured_on ASC NULLS LAST, id ASC OFFSET 3 FETCH FIRST 5 ROWS ONLY`. Which ids come back?

**Answer:** One id, 2. The ordered list is 3, 4, 1, 2. Skipping three rows leaves id 2, and the fetch cap of 5 does not invent more rows. The result has one row, not five. A client that allocates a page of five still needs to handle a short page at the end.

### DB-040 — BETWEEN includes both endpoints

**Difficulty:** Senior

**Category:** Predicates

**Question:**

Which stay ids and which ping ids match each predicate?

**Context and Constraints:**

```sql
CREATE TABLE stay (
  id integer PRIMARY KEY,
  night date NOT NULL
);

INSERT INTO stay (id, night) VALUES
  (1, DATE '2026-01-31'),
  (2, DATE '2026-02-01'),
  (3, DATE '2026-02-28'),
  (4, DATE '2026-03-01');

CREATE TABLE ping (
  id integer PRIMARY KEY,
  at_time timestamp NOT NULL
);

INSERT INTO ping (id, at_time) VALUES
  (1, TIMESTAMP '2026-02-01 00:00:00'),
  (2, TIMESTAMP '2026-02-28 15:00:00'),
  (3, TIMESTAMP '2026-03-01 00:00:00');
```

`a BETWEEN x AND y` means `a >= x AND a <= y`.

**Senior Engineer's Answer:**

```sql
SELECT id FROM stay
WHERE night BETWEEN DATE '2026-02-01' AND DATE '2026-02-28'
ORDER BY id;
```

Ids 2 and 3. Both endpoints are in the range. January 31 and March 1 are outside.

```sql
SELECT id FROM stay
WHERE night BETWEEN DATE '2026-02-28' AND DATE '2026-02-01'
ORDER BY id;
```

No rows. The predicate is `night >= 2026-02-28 AND night <= 2026-02-01`. A date cannot be both. `BETWEEN` does not swap the endpoints.

```sql
SELECT id FROM ping
WHERE at_time BETWEEN TIMESTAMP '2026-02-01' AND TIMESTAMP '2026-02-28'
ORDER BY id;
```

Id 1 only. `TIMESTAMP '2026-02-28'` is midnight at the start of February 28. Ping 2 is 15:00 that day, which is after the end point. Ping 3 is March 1. The date-shaped literal on a timestamp column did not mean "the whole of February 28."

The February window on the timestamps, including ping 2 and excluding March 1, is a half-open range:

```sql
SELECT id FROM ping
WHERE at_time >= TIMESTAMP '2026-02-01'
  AND at_time < TIMESTAMP '2026-03-01'
ORDER BY id;
```

Ids 1 and 2. The same shape on `stay.night` returns ids 2 and 3, matching the inclusive date `BETWEEN`, because the next day is March 1 and `night` has no time of day.

A null input makes `BETWEEN` unknown, and `WHERE` drops the row. These columns are `NOT NULL`, so that path does not appear here.

`BETWEEN SYMMETRIC` sorts the two endpoints and then applies inclusive `BETWEEN`. It is the explicit way to accept a pair that might arrive reversed.

**Practical Implementation:**

```sql
SELECT id
FROM ping
WHERE at_time >= TIMESTAMP '2026-02-01'
  AND at_time < TIMESTAMP '2026-03-01'
ORDER BY id;
```

Use that half-open form for timestamps. Use inclusive `BETWEEN` for discrete dates when both named days are in the window, or use the same half-open form on dates so the date query and the timestamp query share a shape: `night >= DATE '2026-02-01' AND night < DATE '2026-03-01'`.

**Trade-offs and Alternatives:**

A `daterange` or `tstzrange` makes the inclusion rules part of the value: `'[2026-02-01, 2026-03-01)'` is half-open and contains ping 2. The operators are worth it when many queries share the window. Two comparisons are worth it when the query is a single report and the endpoints are already columns. Either way, write the endpoint convention next to the column, not only in a client.

`timestamp` has no time zone. `timestamptz` does. A half-open bound built by casting a local date to `timestamptz` uses the session `TimeZone`. That is a cast issue to be explicit about. It does not change the meaning of `BETWEEN` itself: both ends are still inclusive.

**Common Mistakes:**

- Filtering February with `BETWEEN TIMESTAMP '2026-02-01' AND TIMESTAMP '2026-02-28'` and dropping the February 28 afternoon rows.
- Reversing the UI's start and end and returning an empty month instead of swapping or rejecting the input.
- Using inclusive `<=` end-of-month timestamps and then double-counting a ping that lands on the shared endpoint of the next window.
- Writing `BETWEEN NULL AND DATE '2026-02-01'` and expecting the null bound to behave like an open end. The predicate is unknown.

**Senior-Level Follow-up:**

Does `DATE '2026-02-15' BETWEEN SYMMETRIC DATE '2026-02-28' AND DATE '2026-02-01'` succeed, and does ping 2 fall inside `BETWEEN SYMMETRIC TIMESTAMP '2026-02-28' AND TIMESTAMP '2026-02-01'`?

**Answer:** The date predicate is true. `BETWEEN SYMMETRIC` orders the endpoints as February 1 through February 28 and includes both. The ping predicate is false. After the swap the upper bound is still `TIMESTAMP '2026-02-28'`, midnight, and 15:00 is later than that. `SYMMETRIC` fixes reversed ends. It does not extend a timestamp literal through the rest of its calendar day.

### DB-041 — LIKE is case-sensitive and underscore matches one character

**Difficulty:** Intermediate

**Category:** Pattern matching

**Question:**

Which contact ids does each pattern return?

**Context and Constraints:**

```sql
CREATE TABLE contact (
  id integer PRIMARY KEY,
  email text
);

INSERT INTO contact (id, email) VALUES
  (1, 'Ada@Ex.com'),
  (2, 'ada@ex.com'),
  (3, 'ada@other.com'),
  (4, NULL),
  (5, 'a_b@ex.com'),
  (6, 'axb@ex.com');
```

`%` matches any string, including empty. `_` matches one character. A null email makes the predicate unknown, so `WHERE` drops it. There is no default escape character.

**Senior Engineer's Answer:**

```sql
SELECT id FROM contact WHERE email LIKE '%@ex.com' ORDER BY id;
```

Ids 2, 5, and 6. `LIKE` is case-sensitive, so `Ada@Ex.com` does not match `@ex.com`. Id 3's domain is `other.com`. Id 4 is unknown and drops out.

```sql
SELECT id FROM contact WHERE email ILIKE '%@ex.com' ORDER BY id;
```

Ids 1, 2, 5, and 6. `ILIKE` is the PostgreSQL case-insensitive form. It uses the same wildcards. It does not make `_` literal.

```sql
SELECT id FROM contact WHERE email LIKE 'a_b@ex.com' ORDER BY id;
```

Ids 5 and 6. The underscore in the pattern matches the underscore in id 5 and the `x` in id 6. It is not a search for the character `_`.

```sql
SELECT id FROM contact
WHERE email LIKE 'a\_b@ex.com' ESCAPE '\'
ORDER BY id;
```

Id 5 only. `ESCAPE '\'` makes the next character literal, so `\_` is an underscore and the pattern is the address `a_b@ex.com`. Without `ESCAPE`, the backslash is an ordinary character and `_` is still a wildcard, which does not match these six addresses: none of them contains a backslash.

`LIKE 'ada@ex.com'` with no wildcards matches that exact `text` value, case included. It is not a trim. A trailing space in the column fails the match. `LIKE` on `character(n)` follows that type's insignificant trailing spaces; these columns are `text`, so spaces count.

`%` and `_` in the user's input are wildcards if you concatenate them into the pattern. Escape them first when the user asked for a literal substring:

```sql
email LIKE '%' || replace(replace(replace(term, '\', '\\'), '%', '\%'), '_', '\_') || '%'
ESCAPE '\'
```

A null `term` makes that pattern null, and the predicate drops every row. `COALESCE` the term only when an empty search is defined to match everything.

**Practical Implementation:**

```sql
SELECT id, email
FROM contact
WHERE email ILIKE '%@ex.com'
ORDER BY id;
```

That is the case-insensitive domain filter: ids 1, 2, 5, and 6. Use `LIKE` when the local-part case is significant. Use `ESCAPE` whenever the pattern is built from data that can contain `%`, `_`, or the escape character.

**Trade-offs and Alternatives:**

`lower(email) = lower(other)` is an equality comparison, not a pattern. It is the right tool for "same address" if you also decide that the stored value keeps its original case. `ILIKE` is the right tool for a search box. A domain that stores the folded form is a write-time rule; `ILIKE` does not change what is stored.

Regular expressions (`~`, `~*`) are a different language. `.` is one character there, not `_`. Use them when the pattern is actually a regular expression, and do not point `LIKE` at a regex.

**Common Mistakes:**

- Searching for the address that contains an underscore with `LIKE '%a_b%'` and also returning `axb`.
- Adding a backslash in the pattern and forgetting `ESCAPE`, then concluding that underscore cannot be escaped.
- Using `ILIKE '%@ex.com'` as a case-fold of the whole table. Id 3 still does not match. Case folding is not a domain comparison.
- Treating a null email as "does not contain @". The row is absent because the predicate is unknown, which is the same absence you would get for a positive match. `email IS NULL` is the query that sees id 4.

**Senior-Level Follow-up:**

`email LIKE '%'` and `email LIKE '\%' ESCAPE '\'`. Which ids?

**Answer:** `LIKE '%'` matches every non-null email, ids 1, 2, 3, 5, and 6. `%` includes the empty string and every longer string. Id 4 stays out. `LIKE '\%' ESCAPE '\'` matches a one-character email that is a percent sign. None of the stored emails is that value, so the result is empty. The same two characters mean "everything" or "a literal percent" depending on `ESCAPE`.

### DB-042 — NULLIF turns one sentinel into null

**Difficulty:** Senior

**Category:** Conditional expressions

**Question:**

What does `numerator / NULLIF(denominator, 0)` return for each row? What does `NULLIF` return when the first argument is null?

**Context and Constraints:**

```sql
CREATE TABLE ratio (
  id integer PRIMARY KEY,
  numerator integer NOT NULL,
  denominator integer NOT NULL
);

INSERT INTO ratio (id, numerator, denominator) VALUES
  (1, 10, 4),
  (2, 10, 0);
```

Both columns are integers.

**Senior Engineer's Answer:**

`NULLIF(value1, value2)` returns null when `value1 = value2` is true, and otherwise returns `value1`. The comparison is `=`, so a null first argument is not equal to the second argument, and the function returns that first argument, null. `NULLIF(NULL::integer, 0)` is null. `NULLIF(NULL::integer, NULL::integer)` is null. `NULLIF(4, NULL::integer)` is 4.

```sql
SELECT id, numerator / NULLIF(denominator, 0) AS q
FROM ratio
ORDER BY id;
```

| id | q |
|---:|---:|
| 1 | 2 |
| 2 | NULL |

Row 1 is integer division: `10 / 4` is 2, not 2.5. Row 2 divides by null. `10 / NULL` is null, and the statement does not raise division by zero. `NULLIF` mapped the sentinel before the division.

The result type follows the first argument, with the usual `=` promotion. `NULLIF(1, 2.2)` is `numeric`, because the comparison is `numeric = numeric`, and a match would return a numeric null. Here both arguments are integers, so row 2's null is an integer null.

`NULLIF(denominator, 0)` is the searched case `CASE WHEN denominator = 0 THEN NULL ELSE denominator END`. Use a wider `CASE` when zero and null should produce different labels, or when the quotient itself should become a sentinel other than null:

```sql
CASE
  WHEN denominator = 0 THEN NULL
  ELSE numerator / denominator
END
```

That returns the same two results. It also makes the "do not divide" decision obvious in the arm that performs the division.

`COALESCE(numerator / NULLIF(denominator, 0), 0)` turns row 2 into 0. That says "unknown quotient displays as zero," which is a different claim from "the quotient is zero." Row 1 stays 2.

**Practical Implementation:**

```sql
SELECT id,
  numerator::numeric / NULLIF(denominator, 0) AS q
FROM ratio
ORDER BY id;
```

| id | q |
|---:|---:|
| 1 | 2.5 |
| 2 | NULL |

The cast to `numeric` happens on the numerator, so a non-zero denominator yields an exact decimal quotient. The null denominator still yields null. Casting after integer division is too late: ` (numerator / denominator)::numeric ` for row 1 is 2.0.

**Trade-offs and Alternatives:**

`NULLIF` is the right one-sentinel tool: empty string to null, zero denominator to null, a magic -1 to null. A `CASE` is the right tool when several sentinels map to different results. A constraint is the right tool when zero is illegal in the table at all. If `denominator` must be positive, `CHECK (denominator > 0)` rejects the insert and this query never sees row 2. `NULLIF` is for data you already have or for a sentinel that is legal storage.

Do not store the coalesced zero back into `numerator` to "clean" the null quotient. The display default and the stored measurement are separate.

**Common Mistakes:**

- Dividing first and wrapping the whole division in `NULLIF`. `numerator / denominator` on row 2 already raised `division_by_zero` (`22012`) before `NULLIF` could see a result.
- Expecting `10 / NULLIF(4, 0)` to be 2.5 because the function "returns numeric." The arguments are integers, so the division is integer division.
- Using `NULLIF(denominator, NULL)` as a null screen. `denominator = NULL` is not true, so a zero stays zero and a null stays null.
- Coalescing the quotient to 0 in a report titled "measured ratio" and then averaging those zeros as if they were measurements.

**Senior-Level Follow-up:**

`NULLIF('', nickname)` and `NULLIF(nickname, '')` for nickname `''` and for nickname null. What comes back?

**Answer:** When the nickname is `''`, both `NULLIF('', nickname)` and `NULLIF(nickname, '')` are null, because the two arguments are equal. When the nickname is null, `NULLIF(nickname, '')` returns null, the first argument. `NULLIF('', nickname)` returns `''`, because `'' = NULL` is not true and the first argument is kept. The sentinel belongs in the second argument when the goal is to turn that sentinel into null and otherwise keep the first value.

### DB-043 — The || operator yields null if either side is null

**Difficulty:** Senior

**Category:** Strings

**Question:**

What do `||`, `concat`, and `concat_ws` return for each name?

**Context and Constraints:**

```sql
CREATE TABLE name_part (
  id integer PRIMARY KEY,
  first_name text,
  last_name text
);

INSERT INTO name_part (id, first_name, last_name) VALUES
  (1, 'Ada', 'Lovelace'),
  (2, 'Grace', NULL),
  (3, NULL, NULL);
```

**Senior Engineer's Answer:**

`||` is the SQL concatenation operator. If either operand is null, the result is null. `'Grace' || ' ' || NULL` is null because the space-and-null step is null, and then the left part meets null.

`concat` casts its arguments to text and skips null arguments. It keeps every non-null argument, including a space you passed yourself. `concat('Grace', ' ', NULL)` is `'Grace '` with the trailing space. `concat(NULL, ' ', NULL)` is `' '`, the space, because both names were skipped and the space was not.

`concat_ws` takes the separator first and then the parts. Null parts are skipped, and the separator is not inserted around a skipped part. A null separator makes the whole result null. If every part is null and the separator is not, the result is an empty string, not null.

```sql
SELECT id,
  first_name || ' ' || last_name AS piped,
  concat(first_name, ' ', last_name) AS concatenated,
  concat_ws(' ', first_name, last_name) AS joined
FROM name_part
ORDER BY id;
```

| id | piped | concatenated | joined |
|---:|---|---|---|
| 1 | Ada Lovelace | Ada Lovelace | Ada Lovelace |
| 2 | NULL | `Grace ` | Grace |
| 3 | NULL | `' '` | `''` |

Row 2's `concatenated` value is the four letters of Grace, a space, and nothing after it. Row 2's `joined` value is `Grace` with no trailing space. Row 3's `concatenated` value is a single space. Row 3's `joined` value is `''`.

`concat(first_name, last_name)` on row 2 is `Grace` with no space, because the space in the earlier call was an argument, not a feature of `concat`. The function does not know that you wanted a separator. That is what the `_ws` form is for.

A variadic array argument that is itself null makes `concat` and `concat_ws` return null. That is different from a list of null elements. `concat_ws(' ', NULL, NULL)` is `''`. `concat_ws(' ', VARIADIC CAST(NULL AS text[]))` is null. The call shape matters.

**Practical Implementation:**

```sql
SELECT id, concat_ws(' ', first_name, last_name) AS display_name
FROM name_part
ORDER BY id;
```

The display names are `Ada Lovelace`, `Grace`, and the empty string. The empty string is what you sort and what you show for a row with no names. If the screen should say `(unnamed)` for that row, wrap the whole `concat_ws` in a searched `CASE` or `NULLIF` it against `''` and then `COALESCE` a fallback. `COALESCE` on the `||` expression would replace row 2 as well as row 3, which throws away a known first name.

**Trade-offs and Alternatives:**

`||` is the right operator when a null part should null the whole label, because a missing part means "we cannot build this string." `concat_ws` is the right function for a person name, an address line, or any list of optional pieces. `concat` is the right function when you are gluing text and you will supply the separators yourself, knowing that a null piece leaves the separator behind.

`format('%s %s', first_name, last_name)` treats a null argument as an empty string too, and it is easier to read when the template is long. It still does not skip the space. For optional parts, `concat_ws` matches the desired string more closely.

**Common Mistakes:**

- Building a full name with `||` and testing only row 1. Row 2 becomes null in the UI.
- "Fixing" that with `COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')`, which stores a trailing space on row 2 and a single space on row 3. That is the `concat` result, reached the long way.
- Passing the separator last: `concat_ws(first_name, ' ', last_name)` uses the first name as the separator.
- Sorting the `||` expression and treating null labels as empty strings. They sort as nulls, under the `ORDER BY` null rule, not next to `''`.

**Senior-Level Follow-up:**

`concat_ws(NULL, first_name, last_name)` for row 1, and `concat_ws(' ', '', last_name)` for a row whose first name is `''` and whose last name is `Lovelace`. What are the strings?

**Answer:** A null separator makes `concat_ws` return null for row 1, even though both names are present. An empty-string first name is not null, so it is not skipped. The result is a leading space plus `Lovelace`: `' Lovelace'`. `concat_ws` skips nulls. It does not skip blanks. `NULLIF(first_name, '')` before `concat_ws` is the extra step when a blank part should disappear.

### DB-044 — Integer division truncates; numeric division is exact

**Difficulty:** Intermediate

**Category:** Numeric types

**Question:**

What are `cents / parts` and `cents / parts::numeric` for each row? Where does a declared `numeric` scale round?

**Context and Constraints:**

```sql
CREATE TABLE split (
  id integer PRIMARY KEY,
  cents integer NOT NULL,
  parts integer NOT NULL
);

INSERT INTO split (id, cents, parts) VALUES
  (1, 5, 2),
  (2, 10, 4);
```

`numeric` ties round away from zero. `real` and `double precision` are binary floats; on most machines their ties round to nearest even.

**Senior Engineer's Answer:**

Both columns are `integer`, so `cents / parts` is integer division and truncates toward zero. `5 / 2` is 2. `10 / 4` is 2. `(-5) / 2` is -2. The remainder is available as `5 % 2`, which is 1, and the sign of the remainder follows the dividend.

`parts::numeric` makes the division `numeric`. The integer numerator converts to `numeric`, and the result is exact: 2.5 and 2.5.

```sql
SELECT id,
  cents / parts AS int_div,
  cents / parts::numeric AS num_div
FROM split
ORDER BY id;
```

| id | int_div | num_div |
|---:|---:|---:|
| 1 | 2 | 2.5 |
| 2 | 2 | 2.5 |

Casting the integer result does not recover the fraction. `(cents / parts)::numeric` is 2.0 for both rows. The cast has to happen before the division, on at least one operand.

A `numeric(precision, scale)` column rounds on assignment to that scale, then rejects the value if the digits to the left of the decimal point exceed `precision - scale`. `numeric(3, 1)` holds -99.9 through 99.9. `1.25` stored there becomes `1.3`, because the tie rounds away from zero. `-1.25` becomes `-1.3`. `99.96` rounds to `100.0`, which needs three digits to the left of the decimal, and the insert fails. Unconstrained `numeric` does not force a scale.

`round(2.5::numeric)` is 3. `round(-2.5::numeric)` is -3. `round(2.5::double precision)` is 2 on the usual nearest-even rule, and `round(-0.5::double precision)` is -0, while the numeric round of `-0.5` is -1. Money and other exact tenths belong in `numeric`, not in `double precision`. Equality comparisons on floats fail for values that cannot be represented exactly. The integer cents in this table avoid that by staying integers until the division that needs a fraction.

**Practical Implementation:**

```sql
SELECT id,
  ROUND(cents / parts::numeric, 2) AS share
FROM split
ORDER BY id;
```

Both shares are 2.50. Rounding a `numeric` quotient is defined. Rounding an integer quotient of 2 to two places is still 2.00 and was already the wrong quotient.

Store cents as `integer` or as `numeric(12, 2)` on purpose. Divide by a numeric parts count, or multiply by a numeric rate, at the moment the fraction is required. Do not round-trip through `double precision` because a rate looked like `0.1`.

**Trade-offs and Alternatives:**

Integer cents plus an integer division are right when the remainder is allocated by an explicit rule, such as "one extra cent to the first `cents % parts` shares." Numeric division is right when the share itself is a decimal. Mixing them in one expression without a cast is how 2.5 becomes 2.

`numeric` arithmetic is exact and slower than integer arithmetic. That trade is appropriate for money. It is the wrong reason to use `real` for money.

**Common Mistakes:**

- Averaging integer cents with `SUM(cents) / COUNT(*)` and getting an integer average. `COUNT(*)` is `bigint`. Cast one side to `numeric`.
- Casting the finished integer quotient to `numeric` and displaying 2.0 as if the half cent were considered.
- Declaring `numeric(3, 1)` and inserting `1.25` with the belief that the stored value is `1.3` only for positive ties. The negative tie rounds away from zero too, to `-1.3`.
- Using `double precision` for cents because `0.1 + 0.2` "should" be `0.3`. It is not an exact decimal.

**Senior-Level Follow-up:**

`SELECT (5 / 2) * 1.0` and `SELECT 5 * 1.0 / 2`. What are the values and types?

**Answer:** The first expression divides integers first, gets 2, then multiplies by `1.0`. The result is `numeric` 2.0. The second multiplies `5 * 1.0` first, gets `numeric` 5.0, and divides by 2. The result is `numeric` 2.5. The cast or the decimal literal has to enter before the truncating operator, not after a subexpression has already truncated.

### DB-045 — GREATEST and LEAST ignore null arguments

**Difficulty:** Senior

**Category:** Conditional expressions

**Question:**

What do `GREATEST(a, b)` and `LEAST(a, b)` return for each bid? What would a null in either argument mean under the SQL standard?

**Context and Constraints:**

```sql
CREATE TABLE bid (
  id integer PRIMARY KEY,
  a numeric,
  b numeric
);

INSERT INTO bid (id, a, b) VALUES
  (1, 10, 30),
  (2, NULL, 30),
  (3, NULL, NULL),
  (4, 10, 10);
```

**Senior Engineer's Answer:**

In PostgreSQL, `GREATEST` and `LEAST` skip null arguments. The result is null only when every argument is null. The SQL standard returns null if any argument is null. PostgreSQL documents this as a deviation. Some other engines follow the standard.

```sql
SELECT id, GREATEST(a, b) AS hi, LEAST(a, b) AS lo
FROM bid
ORDER BY id;
```

| id | hi | lo |
|---:|---:|---:|
| 1 | 30 | 10 |
| 2 | 30 | 30 |
| 3 | NULL | NULL |
| 4 | 10 | 10 |

Row 2's null offer is ignored, so both functions return 30. That is "the best number we actually have," not "unknown because one side is missing." Row 3 has no number, so both results are null. Row 4's two equal values are that value. Extra arguments follow the same rule: `GREATEST(10, NULL, 30, NULL)` is 30, and `LEAST(10, NULL, 30)` is 10.

The arguments resolve to one common type, the same way `CASE` and `UNION` do. `GREATEST(1, 2.5)` is `numeric` 2.5. `GREATEST(1, 'a')` fails to resolve.

If the product rule is the standard one, write it. `GREATEST` will not do it.

```sql
SELECT id,
  CASE WHEN a IS NULL OR b IS NULL THEN NULL ELSE GREATEST(a, b) END AS hi
FROM bid
ORDER BY id;
```

| id | hi |
|---:|---:|
| 1 | 30 |
| 2 | NULL |
| 3 | NULL |
| 4 | 10 |

Row 2 is now null. The `CASE` is the whole rule: any missing side makes the comparison unknown, so the result is null. A chain of three columns repeats the null test for each column.

`GREATEST` is not an aggregate. `MAX(a)` over the table is one row, the maximum of column `a` among stored rows, and `MAX` skips nulls in its own aggregate sense. `GREATEST(a, b)` stays on one row and compares that row's arguments. On these rows, `MAX(a)` is 10 and `MAX(b)` is 30.

**Practical Implementation:**

```sql
SELECT id, GREATEST(a, b) AS offer
FROM bid
ORDER BY id;
```

Use that when a missing quote means "no quote on that side" and the other side can still win. Use the `CASE` when a missing side means "we cannot score this bid." The table stores both shapes of missingness as null, so the query has to say which meaning it implements. The column definition does not say it.

**Trade-offs and Alternatives:**

Two columns and `GREATEST` fit a fixed pair of offers. A child table of offers plus `MAX(amount)` fits "any number of offers, ignore the ones that were not submitted." The aggregate also skips nulls. It does not return null just because one child amount is null, as long as one child amount is non-null. An empty child set is a different result: the scalar `MAX` of no rows is null.

`num_nulls(a, b)` tells you how many sides were missing if you need to show that next to a PostgreSQL `GREATEST`. It does not change `GREATEST`.

**Common Mistakes:**

- Porting a query from an engine that nulls `GREATEST` on any null and keeping row 2's result of 30 without reading it.
- Using `GREATEST(a, b, 0)` to "default the nulls" and also changing a legitimate negative bid into 0. The 0 is an argument, not a substitute for null. `COALESCE` each side if you meant a default, and then you have chosen a number.
- Calling `GREATEST` over a set of rows. It will not aggregate them. `MAX` will.
- Comparing the result to a threshold with `>` and forgetting that row 3's null comparison drops the row in `WHERE`. `GREATEST` returned null, and `WHERE` keeps only true.

**Senior-Level Follow-up:**

`LEAST(a, b, 0)` for row 1 and row 2. What values come back, and what changed in the meaning?

**Answer:** Row 1 is 0, because 0 is smaller than 10 and 30. Row 2 is 0, because the null is ignored and 0 is smaller than 30. The third argument is a real candidate, not a stand-in for "missing." If 0 was meant as the default for a null side only, row 1 should have stayed 10. That query is `LEAST(COALESCE(a, 0), COALESCE(b, 0))`, which is 0 for row 2 and 10 for row 1.

### DB-046 — DEFAULT fills an omitted column; NULL is a value

**Difficulty:** Intermediate

**Category:** Defaults

**Question:**

Which inserts succeed, and what is stored in `status` and `opened_on`?

**Context and Constraints:**

Each insert is its own autocommit statement. A failed insert stores nothing.

```sql
CREATE TABLE task (
  id integer PRIMARY KEY,
  status text NOT NULL DEFAULT 'open',
  opened_on date DEFAULT DATE '2026-01-01'
);
```

Attempted inserts:

```sql
INSERT INTO task (id) VALUES (1);
INSERT INTO task (id, status) VALUES (2, NULL);
INSERT INTO task (id, status) VALUES (3, DEFAULT);
INSERT INTO task (id, opened_on) VALUES (4, NULL);
INSERT INTO task (id, status, opened_on) VALUES (5, 'done', DATE '2026-02-02');
```

**Senior Engineer's Answer:**

A column default is used when the insert omits the column or writes the keyword `DEFAULT`. A written `NULL` is an ordinary value and does not trigger the default.

Insert 1 omits both defaulted columns. The stored row is `(1, 'open', 2026-01-01)`.

Insert 2 writes null into `status`. `NOT NULL` rejects it with `not_null_violation` (`23502`). No row 2 is stored. The default is not a substitute for an explicit null.

Insert 3 writes `DEFAULT` for `status` and omits `opened_on`. The stored row is `(3, 'open', 2026-01-01)`.

Insert 4 omits `status` and writes null for `opened_on`. `opened_on` allows null. The stored row is `(4, 'open', NULL)`.

Insert 5 supplies both values. The stored row is `(5, 'done', 2026-02-02)`.

The table then contains ids 1, 3, 4, and 5.

`UPDATE task SET status = DEFAULT WHERE id = 5` sets status back to `'open'`. `UPDATE task SET opened_on = DEFAULT WHERE id = 4` sets the date to 2026-01-01. `DEFAULT` in an update is the same expression, evaluated at the update.

A default expression is evaluated per row when it is volatile. Two rows inserted by one `INSERT` with `gen_random_uuid()` as a default get two different uuids. A constant default such as `'open'` is the same value on every row. A default may not refer to other columns of the row being inserted. That restriction is one of the reasons a generated column exists.

If the column list is omitted, `INSERT INTO task VALUES (6, 'done', DATE '2026-03-01')` binds by position. `INSERT INTO task VALUES (7)` fails because `status` has no supplied value in a positional list that is shorter than the table in the way the statement was written: a `VALUES` list must match the target column list, and the default target is every column. Name the columns.

**Practical Implementation:**

```sql
INSERT INTO task (id, status)
VALUES (3, DEFAULT)
RETURNING id, status, opened_on;
```

The returned row is `(3, 'open', 2026-01-01)`. Naming the columns, and writing `DEFAULT` only where you mean the default, keeps a later added column from shifting positional values. The `NOT NULL` on `status` stays. The default does not replace it. The default is what makes an omitted status legal.

**Trade-offs and Alternatives:**

A default is the right tool for "new tasks start open" when every insert path should get that value by omitting the column. A trigger is the right tool when the value depends on another column in the new row or on another table. A domain default applies to every column of that domain unless the column sets its own default, which overrides the domain, which overrides the base type.

Putting the fallback in `COALESCE` at read time leaves the stored column null and makes every reader repeat the fallback. The rows above that omit `status` store `'open'`, so a reader does not have to guess.

**Common Mistakes:**

- Sending JSON `null` for "use the default" and inserting SQL `NULL`. Insert 2 fails, or, on a nullable column, insert 4 stores null.
- Omitting a column from the insert list and also marking it `NOT NULL` without a default. The insert fails. Insert 1 succeeds only because both mechanisms are present on `status`.
- Writing `INSERT INTO task VALUES (1)` and expecting the defaults to fill the other columns. The positional list does not match the table.
- Assuming `DEFAULT now()` and `DEFAULT TIMESTAMP 'now'` are the same kind of constant. One is a function call at write time. The other is fixed when the statement that created the default was parsed. The next question is that difference.

**Senior-Level Follow-up:**

`INSERT INTO task (id, status, opened_on) VALUES (8, DEFAULT, DEFAULT)`. What is stored? Does `opened_on date DEFAULT NULL` change insert 1's date?

**Answer:** Id 8 stores `'open'` and `2026-01-01`, the same two defaults, because `DEFAULT` names them explicitly. A column declared `DEFAULT NULL` stores null when the column is omitted. Insert 1 would then store `(1, 'open', NULL)`. `DEFAULT NULL` is a default whose value is null. It is not the absence of a default in the catalog sense that "no default was declared," but the stored result of omitting the column is still null. An explicit `NULL` in the insert stores null either way.

### DB-047 — now() stays at the start of the transaction

**Difficulty:** Senior

**Category:** Date and time

**Question:**

In this transaction, how do the two `noted_at` values compare, and how do the two `wall_at` values compare? What does a default of `TIMESTAMP 'now'` store?

**Context and Constraints:**

PostgreSQL 16. `now()` and `transaction_timestamp()` and `CURRENT_TIMESTAMP` are the same instant: the start of the current transaction. `statement_timestamp()` is the start of the current statement. `clock_timestamp()` moves during a statement. `pg_sleep` delays the session.

```sql
CREATE TABLE stamp (
  id integer PRIMARY KEY,
  noted_at timestamptz NOT NULL DEFAULT now(),
  wall_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

BEGIN;
INSERT INTO stamp (id) VALUES (1);
SELECT pg_sleep(0.05);
INSERT INTO stamp (id) VALUES (2);
COMMIT;
```

**Senior Engineer's Answer:**

Both inserts run in one transaction, so both defaults of `now()` read the same transaction start. `noted_at` on row 1 equals `noted_at` on row 2. That equality is the point of the function: several writes in one transaction can share a single "current" time.

`clock_timestamp()` reads the clock when it runs. The sleep sits between the two inserts, so row 2's `wall_at` is later than row 1's `wall_at`. Inside a single statement, two calls to `clock_timestamp()` can also differ. Two calls to `now()` in that statement cannot.

`statement_timestamp()` on the first insert equals `noted_at`, because the first statement of the transaction starts at the transaction start. On the second insert it is later than `noted_at`. It stays fixed for the duration of that second statement, while `wall_at` is the clock at the default's evaluation. For these two single-row inserts the visible fact is the one the sleep guarantees: the `now()` values match, and the `clock_timestamp()` values do not.

`CURRENT_TIMESTAMP` matches `noted_at`. `LOCALTIMESTAMP` is the same transaction start as `timestamp without time zone`, with the session time zone used to form the local fields. It does not change the equality between the two rows.

`TIMESTAMP 'now'` written in a `SELECT` is parsed with that statement and matches `now()` for that statement. The same literal used as a column default is parsed when the default is created:

```sql
created_at timestamptz DEFAULT TIMESTAMP 'now'
```

Every later insert stores the timestamp from when that `CREATE TABLE` or `ALTER TABLE` statement was parsed, including inserts in new transactions. The value does not move. `DEFAULT now()` is a function call, so it is evaluated when the row is written and then stays at that transaction's start.

`timeofday()` is the wall clock as `text`, not as `timestamptz`. It is a poor default for a timestamp column because the column would depend on a text cast.

**Practical Implementation:**

```sql
BEGIN;
INSERT INTO stamp (id) VALUES (1);
INSERT INTO stamp (id) VALUES (2);
COMMIT;

SELECT noted_at = (SELECT noted_at FROM stamp WHERE id = 1)
FROM stamp
WHERE id = 2;
```

The comparison is true. Use `DEFAULT now()` for "when this transaction wrote the row." Use `DEFAULT clock_timestamp()` only when two writes in one transaction must record different instants and you accept that a fast pair of statements can still land in the same microsecond. Use `statement_timestamp()` when each statement should stamp its own start and a retry of the statement should move the stamp.

**Trade-offs and Alternatives:**

One transaction-wide timestamp makes an audit of "this checkout" easy to join: every row shares `noted_at`. It makes duration inside the transaction invisible. If you need both, store `now()` in one column and `clock_timestamp()` in another, as this table does, and do not ask one column to answer both questions.

A client-supplied timestamp is right when the event happened on a device before the request. A server default is right when "written to this database" is the event. Mixing a client clock and `now()` in one ordering key mixes two clocks.

**Common Mistakes:**

- Sleeping inside a transaction, inserting the second audit row, and expecting `DEFAULT now()` to show the sleep. Both rows match.
- Declaring `DEFAULT TIMESTAMP 'now'` because it looks like a function. Every row stores the create-time constant.
- Comparing `timestamptz` to `timestamp` by eye in a client that renders the session zone. The equality in the query above is the comparison that matters.
- Calling `timeofday()` for a `timestamptz` column and then casting the text. `clock_timestamp()` already returns `timestamptz`.

**Senior-Level Follow-up:**

The transaction above has committed. A new transaction inserts id 3 with `DEFAULT now()` and does not sleep. How does row 3's `noted_at` compare with row 1's, and how would that change if the column default were `TIMESTAMP 'now'` captured at `CREATE TABLE`?

**Answer:** Row 3's `now()` is the start of the new transaction, so it is later than row 1. It is not equal to row 1 unless the clock did not move at all between the transactions, which is not the rule you write the column for. A default of `TIMESTAMP 'now'` captured when the table was created stores that same old instant on row 3, equal to the value it would have stored on rows 1 and 2. New transactions do not refresh a constant default.

### DB-048 — RETURNING projects the row that was written

**Difficulty:** Senior

**Category:** Data modification

**Question:**

What does each `RETURNING` clause produce, and what is left in the table?

**Context and Constraints:**

PostgreSQL 16. `amount_cents` is the stored generated column `qty * unit_cents`. `RETURNING` on `INSERT` and `UPDATE` sees the new row. This version has no `OLD` or `NEW` qualifier in `RETURNING`.

```sql
CREATE TABLE line (
  id integer PRIMARY KEY,
  qty integer NOT NULL,
  unit_cents integer NOT NULL,
  amount_cents integer GENERATED ALWAYS AS (qty * unit_cents) STORED
);
```

**Senior Engineer's Answer:**

`RETURNING` builds a result set from the rows the statement actually wrote. For `INSERT` and `UPDATE`, the column values are the stored ones: defaults applied, generated columns computed. The result has no guaranteed order unless an outer query sorts it.

```sql
INSERT INTO line (id, qty, unit_cents)
VALUES (1, 3, 50)
RETURNING id, qty, amount_cents;
```

The result is `(1, 3, 150)`. The table holds that row. The statement did not supply `amount_cents`. `RETURNING` still sees 150.

```sql
UPDATE line
SET qty = 4
WHERE id = 1
RETURNING id, qty, amount_cents;
```

The result is `(1, 4, 200)`. `RETURNING` sees the new quantity and the recomputed amount. The previous amount, 150, is not a `RETURNING` column in PostgreSQL 16. A client that needs the old amount reads it before the update or computes it from values it already had.

```sql
DELETE FROM line
WHERE id = 1
RETURNING id, amount_cents;
```

The result is `(1, 200)`. The table is empty. `DELETE ... RETURNING` sees the row that was removed.

A failed statement returns no `RETURNING` rows and stores nothing. `INSERT` of a second row with `qty` null fails `not_null_violation` and does not return a partial line. `UPDATE` that matches no row returns an empty result and reports `UPDATE 0`. That is not an error.

```sql
INSERT INTO line (id, qty, unit_cents) VALUES
  (2, 1, 10),
  (3, 2, 10)
RETURNING id, amount_cents;
```

The result set is `(2, 10)` and `(3, 20)`. Display order is not part of that result. Sort it outside:

```sql
SELECT id, amount_cents
FROM (
  INSERT INTO line (id, qty, unit_cents) VALUES
    (2, 1, 10),
    (3, 2, 10)
  RETURNING id, amount_cents
) AS inserted
ORDER BY id;
```

That ordered form is the one to use when the client treats the first returned row as id 2.

`RETURNING` can be a subset of columns, or `*`. It can compute an expression from the new row: `RETURNING id, amount_cents / 100.0 AS amount`. It cannot see a column the statement did not store. On this table, `amount_cents` is stored, so it can.

**Practical Implementation:**

```sql
INSERT INTO line (id, qty, unit_cents)
VALUES (1, 3, 50)
RETURNING id, qty, unit_cents, amount_cents;
```

Use the returned amount in the API response. A follow-up `SELECT` sees the same row and costs a second round trip. `UPDATE ... RETURNING` is the same pattern when the client needs the recomputed amount after a quantity change. `DELETE ... RETURNING id` is the list of ids that were actually present. Ids in the `WHERE` clause that matched nothing are absent from that list, which is the difference between "I asked to delete 1 and 99" and "I deleted 1."

**Trade-offs and Alternatives:**

`RETURNING` is the row as stored, so it is the right payload for a generated column, a default, or a value another column's constraint might have rejected. A client-side calculation of `qty * unit_cents` can drift from the generation expression. The returned column cannot.

If a trigger replaces the write, `RETURNING` still shows what landed, which may differ from what the statement proposed. That is a reason to return the stored columns rather than echo the request body.

An `UPDATE` that joins other tables can return expressions from those tables as well as the new target row. The target columns are still the new values. The next question is what the join itself is allowed to change.

**Common Mistakes:**

- Ignoring `RETURNING` and `SELECT`ing the line by id, then being surprised that a generated column requires the extra read. It was already in the insert result.
- Assuming the multi-row `RETURNING` list arrives in `VALUES` order. The set is `(2, 10)` and `(3, 20)`. The sequence is defined only after `ORDER BY`.
- Treating `UPDATE 0` with an empty `RETURNING` as a constraint failure. No row matched. The table is unchanged and the transaction is still usable.
- Reading `amount_cents` from `RETURNING` on a PostgreSQL 16 `UPDATE` and calling it the previous amount. The value in the result is 200 after the quantity change to 4.

**Senior-Level Follow-up:**

`UPDATE line SET qty = qty + 1 WHERE id = 99 RETURNING id`. The table holds id 1 only. What is the result, and what does `qty` become?

**Answer:** The result is empty. `qty` on id 1 stays 3 if that was the stored quantity, because the `WHERE` clause did not match it. The command tag is `UPDATE 0`. A client that always reads `rows[0].id` from `RETURNING` needs the empty case. It is not a null id, and it is not an error.

### DB-049 — UPDATE FROM updates each target row at most once

**Difficulty:** Staff-Level

**Category:** Data modification

**Question:**

What does the `FROM` update store, and what does the scalar-subquery update store, starting from the same rows each time? What does the scalar form do with no extra `WHERE` if `contact` is `NOT NULL`?

**Context and Constraints:**

Run each update as its own statement against this starting data, not as two updates in sequence.

```sql
CREATE TABLE account (
  id integer PRIMARY KEY,
  sales_id integer,
  contact text NOT NULL
);

INSERT INTO account (id, sales_id, contact) VALUES
  (1, 10, 'old'),
  (2, 99, 'kept'),
  (3, 10, 'also-old');

CREATE TABLE employee (
  id integer PRIMARY KEY,
  name text NOT NULL
);

INSERT INTO employee (id, name) VALUES
  (10, 'Ada'),
  (11, 'Grace');
```

`employee.id` is unique. Grace has no account. Account 2's `sales_id` matches no employee.

**Senior Engineer's Answer:**

`UPDATE ... FROM` joins the target to the `FROM` items and updates the target row from that join. A target row that joins to no `FROM` row is left alone. A target row that joins to several `FROM` rows is still updated once, and PostgreSQL does not define which joined row supplies the values.

```sql
UPDATE account
SET contact = employee.name
FROM employee
WHERE employee.id = account.sales_id;
```

Account 1 joins Ada and becomes `'Ada'`. Account 3 joins Ada and becomes `'Ada'`. Account 2 joins nobody and stays `'kept'`. Grace is unused. The command updates two rows. The result is determined because `employee.id` matches each of those accounts at most once.

The scalar form assigns the subquery result to every row the `WHERE` allows, and a scalar subquery that returns no row assigns null:

```sql
UPDATE account
SET contact = (
  SELECT employee.name
  FROM employee
  WHERE employee.id = account.sales_id
);
```

There is no `WHERE` on the update. Account 1 becomes `'Ada'`. Account 3 becomes `'Ada'`. Account 2's subquery returns no row, so the assignment is null. `contact` is `NOT NULL`, the statement fails with `not_null_violation` (`23502`), and all three contacts stay at their starting values. A failing update does not leave account 1 already changed.

Restrict the scalar update to accounts that have an employee and it succeeds:

```sql
UPDATE account
SET contact = (
  SELECT employee.name
  FROM employee
  WHERE employee.id = account.sales_id
)
WHERE sales_id IN (SELECT id FROM employee);
```

Stored contacts: account 1 `'Ada'`, account 2 `'kept'`, account 3 `'Ada'`. That matches the `FROM` update on these rows. The two shapes still differ when the match is missing and the column is nullable: the scalar assignment writes null, and `FROM` skips the row. They also differ when the match is not unique: the scalar subquery then returns more than one row and the statement fails, while `FROM` updates the target once from an unspecified matching row.

`FROM` must not repeat the target table unless you intend a self-join and alias it. Other engines that require the target to appear again in `FROM` are not describing this statement. `SET contact = DEFAULT` is unrelated; it uses the column default, and `contact` has none, so it would try to store null and fail `NOT NULL`.

**Practical Implementation:**

```sql
UPDATE account AS a
SET contact = e.name
FROM employee AS e
WHERE e.id = a.sales_id;
```

Ship this when a missing employee means "do not touch the account," which is what account 2 requires. Ship the scalar form with a `WHERE` when you want a missing match to be visible as a null and the column allows it. Either way, the source of `name` has to be unique per target row. `employee.id` is. A join through a non-unique table is the follow-up.

**Trade-offs and Alternatives:**

`FROM` reads naturally when several columns move from one matched row. A scalar subquery makes "no match becomes null" explicit and fails the statement if two source rows match, which is a useful alarm. The alarm is the wrong tool if two source rows are legal and you meant an aggregate. Then the subquery should return one value on purpose, as the follow-up does with `ORDER BY ... LIMIT 1`, or with `MAX`.

Do not "fix" an unspecified multi-match `FROM` update by running it until the tests pass. The row you observed is not the contract.

**Common Mistakes:**

- Using the scalar update with no `WHERE`, catching `23502`, and retrying. Account 1 never kept Ada. The statement failed as a unit.
- Expecting `FROM` to set account 2's contact to null because the join missed. The starting value `'kept'` remains.
- Joining two employees to one account through a non-unique key and treating the stored name as defined.
- Writing the target table again in `FROM` without an alias, the way another engine requires, and updating the wrong rows or rejecting the statement.

**Senior-Level Follow-up:**

`shelf(sku primary key, price numeric not null)` holds `('A', 10)` and `('B', 7)`. `quote(sku, price)` holds `('A', 12)` and `('A', 15)`. What does `UPDATE shelf SET price = quote.price FROM quote WHERE quote.sku = shelf.sku` guarantee? Write the update that stores 15 for A and leaves B at 7.

**Answer:** A is updated once. The stored price is either 12 or 15, and PostgreSQL does not say which. B is not updated and stays 7. The determined statement picks the greatest quote and touches only skus that have one:

```sql
UPDATE shelf AS s
SET price = (
  SELECT q.price
  FROM quote AS q
  WHERE q.sku = s.sku
  ORDER BY q.price DESC
  LIMIT 1
)
WHERE s.sku IN (SELECT sku FROM quote);
```

A stores 15. B stays 7. If two quotes for A shared the winning price, the stored price would still be that price. `LIMIT 1` without `ORDER BY` would make the chosen row unspecified again.

### DB-050 — LATERAL runs a subquery once per left row

**Difficulty:** Senior

**Category:** Derived tables

**Question:**

What does the lateral query return? What happens if the inner `LIMIT 1` is removed? Why is the subquery rejected without `LATERAL`?

**Context and Constraints:**

"Latest" means the greatest `orders.id` for that customer. PostgreSQL 16.

```sql
CREATE TABLE customer (
  id integer PRIMARY KEY,
  name text NOT NULL
);

CREATE TABLE orders (
  id integer PRIMARY KEY,
  customer_id integer NOT NULL,
  total numeric NOT NULL
);

INSERT INTO customer (id, name) VALUES
  (1, 'Ada'),
  (2, 'Grace'),
  (3, 'Lin');

INSERT INTO orders (id, customer_id, total) VALUES
  (10, 1, 40),
  (11, 1, 15),
  (12, 2, 8);
```

Lin has no orders.

**Senior Engineer's Answer:**

A subquery in `FROM` is independent of the other `FROM` items. `LATERAL` lets it read columns from items to its left. For each left row, PostgreSQL runs the lateral item and joins the produced rows as usual. The left side has to be an inner or left join. A right join that lets the lateral item read the right-hand row is rejected, because there is no defined right-hand row yet.

```sql
SELECT c.name, recent.id AS order_id, recent.total
FROM customer AS c
LEFT JOIN LATERAL (
  SELECT o.id, o.total
  FROM orders AS o
  WHERE o.customer_id = c.id
  ORDER BY o.id DESC
  LIMIT 1
) AS recent ON true
ORDER BY c.id;
```

| name | order_id | total |
|---|---:|---:|
| Ada | 11 | 15 |
| Grace | 12 | 8 |
| Lin | NULL | NULL |

Ada's orders are 10 and 11. `ORDER BY o.id DESC LIMIT 1` keeps 11, total 15. Grace's only order is 12. Lin's lateral subquery returns no row, and the left join keeps Lin with nulls. `ON true` accepts every produced lateral row. The filter that depends on the customer is inside the subquery, where `c.id` is visible.

Drop `LATERAL` and the reference to `c.id` is illegal: there is an entry for `c`, and it cannot be referenced from that part of the query. The subquery would otherwise be planned as one independent derived table.

Remove `LIMIT 1` and keep the left join, with `ORDER BY c.id, recent.id DESC NULLS LAST` so the sequence is defined:

| name | order_id | total |
|---|---:|---:|
| Ada | 11 | 15 |
| Ada | 10 | 40 |
| Grace | 12 | 8 |
| Lin | NULL | NULL |

Ada appears twice because the lateral item is a join input and she has two orders. Lin still appears once. The inner `ORDER BY` decides which row `LIMIT 1` keeps. It does not by itself order the outer result. The outer `ORDER BY` does that.

An inner join to the same lateral item drops Lin. The query would then be "customers who have an order, with their latest order," and the rows would be Ada/11/15 and Grace/12/8.

**Practical Implementation:**

```sql
SELECT c.id, c.name, recent.id AS order_id, recent.total
FROM customer AS c
LEFT JOIN LATERAL (
  SELECT o.id, o.total
  FROM orders AS o
  WHERE o.customer_id = c.id
  ORDER BY o.id DESC
  LIMIT 1
) AS recent ON true
ORDER BY c.id;
```

The three-row result is the customer list with a latest order attached. The predicate `o.customer_id = c.id` belongs inside the lateral subquery. Putting it only in `ON` and forgetting it inside would let the subquery see a customer id it is not correlated to, which is exactly what omitting `LATERAL` already forbids. With `LATERAL`, the correlation and the join condition are two different clauses. Here `ON true` is honest because the correlation already selected the rows.

**Trade-offs and Alternatives:**

`LATERAL` is the right shape when each left row needs its own limited subquery: latest order, last three events, the top bid. A plain join to `orders` plus `DISTINCT ON (customer_id)` also returns Ada's invoice 11, Grace's 12, and omits Lin unless you start from `customer` and outer-join. `DISTINCT ON` sorts the joined rows. `LATERAL ... LIMIT 1` asks for one row per customer directly. Prefer the form that states the limit you mean. Neither form is a reason to drop Lin if the report is a customer list. That decision is the left join, and it is visible in the result table above.

A scalar subquery in the select list can return one order id per customer. The lateral item can return `id` and `total` together, and it can return several rows when you remove the limit. Use the select-list subquery for one value. Use `LATERAL` for a row or a small set per left row.

**Common Mistakes:**

- Forgetting `LATERAL` and reading the error as "customer has no column id." The hint is that `c` exists and cannot be referenced from inside that subquery.
- Using an inner join and then adding Lin back in application code. The left join already returned Lin with a null order.
- Removing `LIMIT 1` to "show a bit more" and presenting Ada once. She has two orders, so she has two result rows.
- Putting `ORDER BY o.id DESC` only in the outer query and keeping `LIMIT 1` inside with no inner order. The kept order is then unspecified, and sorting the outer result cannot repair which inner row was discarded.

**Senior-Level Follow-up:**

Add `LEFT JOIN LATERAL (SELECT o.id FROM orders o WHERE o.customer_id = c.id ORDER BY o.id DESC LIMIT 1) older ON older.id < recent.id` beside the existing lateral item, both referring to `customer`. Why is that rejected even with `LATERAL`, and what placement works?

**Answer:** A lateral item may read `FROM` items to its left, not a sibling to its right, and not the other lateral item unless that other item is to its left. `older` referencing `recent` while `recent` is to the right, or while they are not ordered that way in the join, is rejected. Put `recent` first. Then a second `LEFT JOIN LATERAL` may read both `c` and `recent`. In this data `recent` is already the latest order, so a further limit of "an order with a smaller id" is a different question and needs its own ordered subquery, placed after `recent` if it uses `recent.id`.
