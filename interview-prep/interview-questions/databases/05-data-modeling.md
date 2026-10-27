# DB05 — Data Modeling

PostgreSQL 16. Questions DB-201–DB-250.

Normalization 1NF–BCNF, denormalization, primary key choice, FK design, many-to-many and 1:1, inheritance, enums, constraints, soft delete, audit and temporal data, money and time types, multi-tenancy, migrations, EAV and JSONB. Indexing is DB03; transactions are DB04.

### DB-201 — What does First Normal Form (1NF) require in practice?

**Difficulty:** Intermediate

**Category:** Normalization

**Question:**

What does First Normal Form (1NF) require in practice?

**Answer:**

1NF means each column holds one atomic value, each row can be uniquely identified, and there are no repeating groups such as `phone1`, `phone2`, `phone3` or comma-separated lists in a single column. In Postgres, arrays and `jsonb` can bend the spirit of 1NF. They are fine when you choose them deliberately, but not as a shortcut to avoid creating a child table.

**Follow-up:**

Is a `text[]` column of tags a 1NF violation?

Answer: Strictly, yes, because it is not atomic. It is a reasonable choice when tags are plain labels read and written together, with no per-tag data or foreign keys. Once you need integrity, counts per tag, or tag metadata, use a `tags` table plus a junction table.

### DB-202 — Explain 2NF and 3NF with a concrete example.

**Difficulty:** Intermediate

**Category:** Normalization

**Question:**

Explain 2NF and 3NF with a concrete example.

**Answer:**

2NF says no non-key column may depend on only part of a composite key. In `order_items(order_id, product_id, product_name, qty)`, `product_name` depends only on `product_id`, so it belongs in `products`. 3NF says no non-key column may depend on another non-key column. In `employees(id, dept_id, dept_name)`, `dept_name` depends on `dept_id`, so it belongs in `departments`.

**Follow-up:**

What bug does violating 3NF cause?

Answer: Update anomalies. Renaming a department means changing many rows, and missing one leaves inconsistent data. You also get insert and delete anomalies: you can't record a department with no employees, and deleting its last employee erases the department.

### DB-203 — How does BCNF differ from 3NF, and does it matter?

**Difficulty:** Senior

**Category:** Normalization

**Question:**

How does BCNF differ from 3NF, and does it matter?

**Answer:**

BCNF requires that the left side of every functional dependency be a candidate key. 3NF is slightly looser: it allows a dependency `X → A` if `A` is part of some candidate key. The two differ only when a table has overlapping composite candidate keys, which is rare. Example: in `(student, course, teacher)` where each teacher teaches one course, `teacher → course` holds, but `teacher` is not a key.

**Follow-up:**

Can BCNF decomposition lose a dependency?

Answer: Yes. Some BCNF splits can't enforce every original dependency with a simple constraint, so you'd need a trigger or cross-table check. That is why many teams stop at 3NF when the BCNF split is awkward.

### DB-204 — How far should you normalize in a real OLTP application?

**Difficulty:** Intermediate

**Category:** Normalization

**Question:**

How far should you normalize in a real OLTP application?

**Answer:**

Default to 3NF for transactional data. It protects integrity and keeps writes simple. Treat higher normal forms as a checklist for suspicious tables rather than a goal. Normalize first, measure with `EXPLAIN`, and denormalize only specific read paths when you have evidence. Over-normalizing, such as one table per attribute, creates join sprawl and complicated queries for little benefit.

**Follow-up:**

How do you spot a table that needs more normalization?

Answer: Look for repeated values that must change together, columns that are NULL depending on another column's value, and one logical change that updates many rows. These point to a missing entity.

### DB-205 — When is denormalization justified?

**Difficulty:** Intermediate

**Category:** Denormalization

**Question:**

When is denormalization justified?

**Answer:**

When a measured read path is too slow or too complex, and the copied data either changes rarely or can be kept consistent cheaply. Typical cases are read models, precomputed totals and counts, snapshots of values that must not change later (the price at purchase time), and avoiding hot multi-table joins. Always record where the source of truth is and how the copy gets refreshed.

**Follow-up:**

Is copying the product price into `order_items` denormalization?

Answer: Not really. It is a historical snapshot, a different fact from the current `products.price`. The current price can change, but the order must keep what the customer actually paid.

### DB-206 — What mechanisms keep denormalized data consistent in PostgreSQL?

**Difficulty:** Senior

**Category:** Denormalization

**Question:**

What mechanisms keep denormalized data consistent in PostgreSQL?

**Answer:**

You have four main options. Generated columns (`GENERATED ALWAYS AS (...) STORED`) handle values derived from the same row. Triggers maintain data across rows, such as counters and totals. Materialized views are refreshed on a schedule, or with `REFRESH MATERIALIZED VIEW CONCURRENTLY`. Or the application updates both copies in one transaction. Choose the simplest option that gives the freshness you need.

**Follow-up:**

What is the downside of trigger-maintained counters?

Answer: Write contention. Many concurrent inserts update the same counter row, so they queue on its row lock. You can batch the updates, keep several counter rows per key, or accept approximate counts.

### DB-207 — UUID vs identity bigint as primary key: how do you choose?

**Difficulty:** Intermediate

**Category:** Primary keys

**Question:**

UUID vs identity bigint as primary key: how do you choose?

**Answer:**

A `bigint GENERATED … AS IDENTITY` key is small at 8 bytes, increases steadily, and is fast to index and join. A UUID takes 16 bytes but can be generated by clients, merged across systems, and hides record counts. Random UUIDv4 values scatter inserts across the index and make it bigger. Use bigint for internal tables in one database, and UUID when IDs must be created outside the database or exposed publicly.

**Follow-up:**

Can you use both?

Answer: Yes. Use a bigint primary key for joins and foreign keys, plus a unique `public_id uuid` for external APIs. It costs one extra column and index, but separates internal performance from public identifiers.

### DB-208 — What is wrong with random UUIDv4 as a clustered-style key, and what are the alternatives in PG16?

**Difficulty:** Senior

**Category:** Primary keys

**Question:**

What is wrong with random UUIDv4 as a clustered-style key, and what are the alternatives in PG16?

**Answer:**

Postgres tables are not physically ordered by primary key, but the key's index is still a B-tree. Random values land all over it, causing page splits, poor cache locality, and more WAL, since each first touch of a page after a checkpoint writes a full-page image. PG16 has `gen_random_uuid()` (v4) built in but no native UUIDv7. Time-ordered IDs (UUIDv7, ULID) can come from the application, an extension, or a SQL function.

**Follow-up:**

Does a time-ordered UUID leak information?

Answer: Yes, it embeds the creation time. That is usually fine for internal IDs, but it may matter for public identifiers if creation time or volume is sensitive.

### DB-209 — `serial` vs `GENERATED ... AS IDENTITY`?

**Difficulty:** Intermediate

**Category:** Primary keys

**Question:**

`serial` vs `GENERATED ... AS IDENTITY`?

**Answer:**

`serial` is an older shorthand: an integer column whose default calls `nextval()` on a sequence, with a loose link between column and sequence. `GENERATED ALWAYS AS IDENTITY` is the SQL standard way, ties the sequence to the column, and blocks accidental manual inserts unless you add `OVERRIDING SYSTEM VALUE`. Prefer identity columns for new tables.

**Follow-up:**

Do sequences guarantee gap-free values?

Answer: No. Rollbacks, crashes, and cached values all leave gaps. If you need gap-free numbers, such as invoices, use a counter table updated in the same transaction and accept that writers queue on it.

### DB-210 — Natural keys vs surrogate keys?

**Difficulty:** Intermediate

**Category:** Primary keys

**Question:**

Natural keys vs surrogate keys?

**Answer:**

A natural key is a real-world attribute like an email, an ISO country code, or a SKU. A surrogate key is a generated ID with no meaning. Surrogates stay stable and small even when business values change, which keeps foreign keys cheap. Natural keys suit stable, standardized codes such as `country_code char(2)`. A common rule: use a surrogate primary key and enforce the natural key with a `UNIQUE` constraint.

**Follow-up:**

Why is email a bad primary key?

Answer: Emails change, are effectively case-insensitive, and would have to cascade through every foreign key. Use a surrogate key plus a unique index on `lower(email)`, or a `citext` column.

### DB-211 — When should you use a composite primary key?

**Difficulty:** Intermediate

**Category:** Primary keys

**Question:**

When should you use a composite primary key?

**Answer:**

Use it for junction tables such as `(user_id, role_id)`, and for entities naturally identified by a combination, like `(tenant_id, id)` in multi-tenant schemas. It enforces uniqueness without an extra column, and its index serves lookups on the leading column. For ordinary entities that many tables reference, a single-column surrogate key keeps foreign keys simpler.

**Follow-up:**

Does column order in a composite PK matter?

Answer: Yes. The index is efficient for lookups on its leading columns, so put the most-filtered column first. For `(user_id, role_id)`, lookups by `role_id` alone need a separate index.

### DB-212 — What does a foreign key guarantee, and what does it not?

**Difficulty:** Intermediate

**Category:** Foreign keys

**Question:**

What does a foreign key guarantee, and what does it not?

**Answer:**

A foreign key guarantees that the referencing value exists in the referenced table's unique or primary key columns (or is NULL), and it defines what happens when the parent row changes. It does not create an index on the referencing column. Without that index, deleting or updating a parent row has to scan the child table, which is slow and can hold locks longer.

**Follow-up:**

Should every FK column be indexed?

Answer: Almost always, for joins and for the checks done when a parent changes. The exceptions are tiny tables, or cases where you have confirmed the parent is never deleted or updated.

### DB-213 — Explain the `ON DELETE` options and when to use each.

**Difficulty:** Intermediate

**Category:** Foreign keys

**Question:**

Explain the `ON DELETE` options and when to use each.

**Answer:**

`NO ACTION` (the default) and `RESTRICT` both reject the delete if children exist. `RESTRICT` checks immediately and can't be deferred. `CASCADE` deletes the children too, which fits true ownership, such as order and order items. `SET NULL` and `SET DEFAULT` detach children, which fits optional references like `assigned_to`. Choose by lifecycle: owned data cascades, shared or valuable data restricts.

**Follow-up:**

Why is `CASCADE` risky on core entities?

Answer: One delete can silently remove a large tree of data, take many locks, and bypass application audit logic. For `users` or `accounts`, prefer `RESTRICT` plus an explicit, logged deletion process, or soft delete.

### DB-214 — When does `ON UPDATE CASCADE` make sense?

**Difficulty:** Intermediate

**Category:** Foreign keys

**Question:**

When does `ON UPDATE CASCADE` make sense?

**Answer:**

Only when the referenced key can actually change. With immutable surrogate keys you don't need it. It helps with natural keys that occasionally change, such as a renamed status code in a lookup table, because the change propagates automatically. If you find yourself needing it often, the key itself may be a poor choice.

**Follow-up:**

What is the cost of cascading an update on a widely referenced key?

Answer: Every referencing row is rewritten, which creates new row versions, index updates, and WAL, and takes many locks on big child tables. That is another argument for immutable surrogate keys.

### DB-215 — What are deferrable constraints and when are they needed?

**Difficulty:** Senior

**Category:** Foreign keys

**Question:**

What are deferrable constraints and when are they needed?

**Answer:**

A `DEFERRABLE` constraint can be checked at commit, or at `SET CONSTRAINTS`, instead of after every statement. Use it for circular references where two tables point at each other, for swapping unique values between rows, and for bulk loads where the order is awkward. Only foreign key, unique, primary key, and exclusion constraints can be deferred; `CHECK` and `NOT NULL` cannot.

**Follow-up:**

What is the trade-off?

Answer: Errors show up at commit, far from the statement that caused them, which makes debugging harder. Deferrable unique constraints also can't be used with `ON CONFLICT`. Use them sparingly.

### DB-216 — How do nullable FK columns and `MATCH SIMPLE` behave?

**Difficulty:** Senior

**Category:** Foreign keys

**Question:**

How do nullable FK columns and `MATCH SIMPLE` behave?

**Answer:**

A single nullable foreign key column means an optional relationship: NULL skips the check. For composite keys, the default `MATCH SIMPLE` skips the check if any column is NULL, so a partly-NULL key passes silently. `MATCH FULL` requires the columns to be all NULL or all non-NULL. If the relationship is mandatory, add `NOT NULL` or a `CHECK`.

**Follow-up:**

How do you enforce "exactly one of two FKs is set"?

Answer: Use `CHECK (num_nonnulls(a_id, b_id) = 1)`. It reads more clearly than a boolean expression, though a design with separate tables is often cleaner.

### DB-217 — What changed with `ON DELETE SET NULL (columns)` in recent Postgres?

**Difficulty:** Senior

**Category:** Foreign keys

**Question:**

What changed with `ON DELETE SET NULL (columns)` in recent Postgres?

**Answer:**

Since PG15 you can list which columns to null: `FOREIGN KEY (tenant_id, user_id) REFERENCES users ON DELETE SET NULL (user_id)`. This matters for composite foreign keys where one column, such as `tenant_id`, must stay non-null. Before PG15, `SET NULL` tried to null every key column and failed on the `NOT NULL` one.

**Follow-up:**

Where does this matter most?

Answer: In multi-tenant schemas with composite keys like `(tenant_id, id)`. You can detach a reference while keeping `tenant_id` intact, which preserves tenant isolation.

### DB-218 — How do you model a many-to-many relationship?

**Difficulty:** Intermediate

**Category:** Relationships

**Question:**

How do you model a many-to-many relationship?

**Answer:**

Use a junction (association) table with two foreign keys, such as `student_courses(student_id, course_id)`. Put a composite primary key or unique constraint on the pair so duplicates are impossible. The foreign keys usually use `ON DELETE CASCADE`, because the row means nothing without both sides. Add an index on the second column if you also query from that side.

**Follow-up:**

Why not store an array of IDs in one column?

Answer: Arrays can't enforce referential integrity, and checking or changing membership is awkward. They are acceptable only for opaque lists that need no integrity and are rarely joined.

### DB-219 — How do you model attributes of a relationship (e.g., enrollment date, role)?

**Difficulty:** Intermediate

**Category:** Relationships

**Question:**

How do you model attributes of a relationship (e.g., enrollment date, role)?

**Answer:**

Put them in the junction table, which then becomes a real entity, for example `memberships(user_id, org_id, role, joined_at)`. If the same pair can relate more than once, such as a rehired employee, add a surrogate primary key or include a time period in the key. Then use an exclusion constraint to prevent overlapping periods.

**Follow-up:**

When does a junction table deserve its own surrogate PK?

Answer: When other tables reference it (for example `membership_invites`), when the same pair can repeat over time, or when APIs and ORMs need a single ID for the relationship.

### DB-220 — Adjacency list vs other models for hierarchies?

**Difficulty:** Senior

**Category:** Relationships

**Question:**

Adjacency list vs other models for hierarchies?

**Answer:**

An adjacency list stores a `parent_id` self-reference. It is the simplest and cheapest to write, and you read subtrees with a recursive CTE (`WITH RECURSIVE`). Alternatives: `ltree` stores a path and gives fast subtree queries but costly moves. Nested sets read fast but write slowly. Closure tables answer ancestor and descendant queries quickly but add extra rows. Start with an adjacency list unless subtree reads dominate.

**Follow-up:**

How do you prevent cycles in an adjacency list?

Answer: A plain constraint can't. Use a trigger that walks the ancestor chain with a recursive query, or check in application code inside the transaction. Closure tables and `ltree` make this check easier.

### DB-221 — What patterns exist for one-to-one relationships?

**Difficulty:** Intermediate

**Category:** Relationships

**Question:**

What patterns exist for one-to-one relationships?

**Answer:**

There are two. In the shared-key pattern, the child's primary key is also a foreign key to the parent: `user_profiles.user_id PRIMARY KEY REFERENCES users`. In the other, the child has a separate foreign key column with a `UNIQUE` constraint. Shared-key is the strongest guarantee. A 1:1 split is useful for rarely used or large columns, separate permissions, or optional subtype data.

**Follow-up:**

Why not just add the columns to the parent?

Answer: Often you should. Split only for wide or large data, different security needs, columns that would mostly be NULL, or different update rates that would bloat a hot table.

### DB-222 — How do you enforce that a 1:1 relationship is mandatory on both sides?

**Difficulty:** Senior

**Category:** Relationships

**Question:**

How do you enforce that a 1:1 relationship is mandatory on both sides?

**Answer:**

Simple constraints can't guarantee "every user has a profile," because one row must exist before the other. Your options are a `DEFERRABLE INITIALLY DEFERRED` foreign key checked at commit in one direction, a trigger, or merging the tables. Most designs enforce only one direction in the database and handle the other in the application or with a creation function.

**Follow-up:**

What is the simplest reliable way?

Answer: Create both rows in one transaction through a single function or service method. Add a deferred foreign key if you need database-level assurance, or merge the tables if that is too heavy.

### DB-223 — What is single-table inheritance and when does it work?

**Difficulty:** Intermediate

**Category:** Inheritance and polymorphism

**Question:**

What is single-table inheritance and when does it work?

**Answer:**

All subtypes live in one table, with a `type` discriminator column and nullable columns for subtype-specific fields. It is simple and avoids joins, and works well when the subtypes share most columns. The downsides are many NULLs, weak constraints unless you add type-conditional `CHECK`s, and a table that grows unwieldy as subtypes diverge.

**Follow-up:**

How do you enforce per-type required columns?

Answer: Add a check per subtype, such as `CHECK (type <> 'card' OR card_last4 IS NOT NULL)`. These get unwieldy as subtypes grow, which signals it is time to move to table-per-type.

### DB-224 — What is table-per-type (class table inheritance) and its trade-offs?

**Difficulty:** Senior

**Category:** Inheritance and polymorphism

**Question:**

What is table-per-type (class table inheritance) and its trade-offs?

**Answer:**

A base table holds the shared columns, and each subtype has its own table keyed by the base primary key, for example `payments` plus `card_payments` and `bank_payments`. Constraints are precise, with real `NOT NULL`, and the model stays normalized. The costs are joins or unions to read everything, more tables, and logic to keep base and subtype rows in sync.

**Follow-up:**

How do you ensure a base row has exactly one subtype row?

Answer: Add a `type` column to the base table and a unique key on `(id, type)`. Each subtype table references `(id, type)` and has a `CHECK (type = 'card')`, so one payment cannot appear in two subtype tables.

### DB-225 — Table-per-type vs a JSONB column for subtype attributes?

**Difficulty:** Senior

**Category:** Inheritance and polymorphism

**Question:**

Table-per-type vs a JSONB column for subtype attributes?

**Answer:**

Use table-per-type, or single-table, when the subtype attributes are known and you query, constrain, and join on them. Use `jsonb` when attributes are sparse, user-defined, or vary widely, and you mostly read them as a whole. A hybrid is common: typed columns for shared and frequently queried fields, and `jsonb` for the long tail.

**Follow-up:**

What do you lose with JSONB?

Answer: Column types, `NOT NULL`, foreign keys, and good planner statistics for inner fields. You can recover some of this with `CHECK` constraints and expression or GIN indexes, but it takes more effort.

### DB-226 — Does PostgreSQL native table inheritance (`INHERITS`) solve ORM-style inheritance?

**Difficulty:** Intermediate

**Category:** Inheritance and polymorphism

**Question:**

Does PostgreSQL native table inheritance (`INHERITS`) solve ORM-style inheritance?

**Answer:**

Mostly no. Child tables inherit columns, but primary keys, unique constraints, and foreign keys are not shared across the hierarchy. You can't have a globally unique ID or a foreign key pointing at "any subtype." Declarative partitioning has replaced the main legitimate use of `INHERITS`, so it is rarely a good choice for application modeling.

**Follow-up:**

What is `INHERITS` still used for?

Answer: Mainly legacy partitioning setups and a few niche cases. For new designs, use declarative partitioning or explicit table-per-type. If you only want shared columns, `CREATE TABLE … (LIKE …)` does that without inheritance.

### DB-227 — Why are polymorphic associations (`target_type`, `target_id`) an anti-pattern?

**Difficulty:** Senior

**Category:** Inheritance and polymorphism

**Question:**

Why are polymorphic associations (`target_type`, `target_id`) an anti-pattern?

**Answer:**

A pair of columns that points to different tables can't have a real foreign key, so the database can't prevent orphaned references. Better options: several nullable foreign keys with a `CHECK` that exactly one is set, a shared supertype table that all targets reference, or a separate junction table for each target type.

**Follow-up:**

When might you accept polymorphic references anyway?

Answer: For loosely coupled, append-only data like comments or activity logs across many entity types, where integrity is secondary. Document the trade-off and consider periodic orphan checks.

### DB-228 — Native enum type vs lookup table for statuses?

**Difficulty:** Intermediate

**Category:** Enums and domains

**Question:**

Native enum type vs lookup table for statuses?

**Answer:**

`CREATE TYPE … AS ENUM` is compact at 4 bytes, ordered, and validates values automatically. Adding a value is easy with `ALTER TYPE … ADD VALUE`, and renaming works with `RENAME VALUE`, but you can't remove a value, and values can't carry extra data. A lookup table with a foreign key lets you add a label, sort order, or active flag, and change values with ordinary DML. Use enums for small, stable sets and lookup tables for evolving ones.

**Follow-up:**

Any enum gotchas in migrations?

Answer: Before PG12, `ADD VALUE` couldn't run inside a transaction block. Since PG12 it can, but you can't use the new value until that transaction commits. Removing a value means creating a new type and rewriting the column.

### DB-229 — `CHECK (status IN (...))` vs enum vs lookup table?

**Difficulty:** Intermediate

**Category:** Enums and domains

**Question:**

`CHECK (status IN (...))` vs enum vs lookup table?

**Answer:**

A `text` column with a `CHECK` is easy to change, since you drop and re-add the constraint, and values stay human-readable. But it stores the string in every row and scatters the allowed list across constraints. An enum is compact and typed. A lookup table centralizes the values and supports extra data. For slow-changing lists, `CHECK` or enum is fine; for lists that admins manage, use a lookup table.

**Follow-up:**

How do you change a CHECK on a large table safely?

Answer: Add the new constraint as `NOT VALID`, which skips the full-table scan. Then run `VALIDATE CONSTRAINT`, which takes a weaker lock, and finally drop the old constraint. This avoids a long `ACCESS EXCLUSIVE` lock.

### DB-230 — What are domains and when do they help?

**Difficulty:** Intermediate

**Category:** Enums and domains

**Question:**

What are domains and when do they help?

**Answer:**

A domain is a reusable type with its own constraints and defaults. For example, `CREATE DOMAIN email AS text CHECK (VALUE ~* '^[^@]+@[^@]+$')`, or a `positive_money` domain over `numeric`. Domains put a rule in one place, apply it to every column that uses the type, and make the schema easier to read.

**Follow-up:**

What is the downside?

Answer: Changing a domain constraint affects every column using it, and existing data must be validated. Some tools also show only the base type. Keep domains simple and stable.

### DB-231 — What should `CHECK` constraints be used for?

**Difficulty:** Intermediate

**Category:** Constraints

**Question:**

What should `CHECK` constraints be used for?

**Answer:**

Use them for rules that depend only on the values in the same row: amounts must be positive, `end_at > start_at`, allowed combinations of status fields, or `num_nonnulls` rules. The expression should be immutable, and subqueries are not allowed. Rules that span rows or tables need unique or exclusion constraints, foreign keys, or triggers.

**Follow-up:**

Do `CHECK` constraints pass when the expression is NULL?

Answer: Yes. A `CHECK` fails only when the expression is `FALSE`, so `NULL` passes. Combine it with `NOT NULL`, or write the expression to handle NULLs explicitly.

### DB-232 — How should `NOT NULL` and `DEFAULT` be used in modeling?

**Difficulty:** Intermediate

**Category:** Constraints

**Question:**

How should `NOT NULL` and `DEFAULT` be used in modeling?

**Answer:**

Make columns `NOT NULL` unless "no value" is a meaningful state. It simplifies queries, since you avoid three-valued logic, and gives the planner better information. Use defaults for stable values like `now()`, `false`, or `'pending'`. Don't use sentinel values such as `''` or `0` to mean "unknown"; NULL, or an explicit status, is clearer.

**Follow-up:**

Is adding a `NOT NULL DEFAULT` column expensive in PG16?

Answer: Not with a constant default. Since PG11 that is a metadata-only change with no table rewrite. A volatile default, such as `random()`, still rewrites the table.

### DB-233 — How do `UNIQUE` constraints treat NULLs, and what did PG15 add?

**Difficulty:** Senior

**Category:** Constraints

**Question:**

How do `UNIQUE` constraints treat NULLs, and what did PG15 add?

**Answer:**

By default, NULLs are considered distinct from each other, so a unique column can contain many NULLs. PG15 added `UNIQUE NULLS NOT DISTINCT`, which treats NULLs as equal, so only one is allowed. That matters for composite unique keys with optional columns, such as `(user_id, deleted_at)` or `(tenant_id, external_ref)`.

**Follow-up:**

How did people handle this before PG15?

Answer: With two partial unique indexes (`WHERE col IS NULL` and `WHERE col IS NOT NULL`), or an expression index using `COALESCE`. `NULLS NOT DISTINCT` is cleaner.

### DB-234 — What is an exclusion constraint and what problem does it solve?

**Difficulty:** Senior

**Category:** Constraints

**Question:**

What is an exclusion constraint and what problem does it solve?

**Answer:**

An exclusion constraint, `EXCLUDE USING gist (...)`, generalizes uniqueness to operators other than equality. The classic use is preventing overlapping bookings: `EXCLUDE USING gist (room_id WITH =, during WITH &&)` over a `tstzrange` column. Equality on plain scalar columns needs the `btree_gist` extension. The database enforces it atomically, even with concurrent writers.

**Follow-up:**

Why is this better than checking in application code?

Answer: A check-then-insert in the app races when two requests run at once, unless you add explicit locking or Serializable isolation. The constraint is enforced for every writer.

### DB-235 — When do partial unique indexes help in modeling?

**Difficulty:** Intermediate

**Category:** Constraints

**Question:**

When do partial unique indexes help in modeling?

**Answer:**

They enforce uniqueness for only a subset of rows. Examples: one active subscription per user (`UNIQUE (user_id) WHERE status = 'active'`), unique emails among non-deleted users, or one primary address per customer. They express conditional business rules that an ordinary unique constraint cannot.

**Follow-up:**

Can a partial unique index be an FK target?

Answer: No. A foreign key needs a full unique constraint or primary key on the referenced columns. A partial index guarantees uniqueness only for some rows.

### DB-236 — How do you model soft deletes?

**Difficulty:** Intermediate

**Category:** Soft delete

**Question:**

How do you model soft deletes?

**Answer:**

Add a `deleted_at timestamptz NULL` column, which is better than a boolean because it records when. Filter with `WHERE deleted_at IS NULL`, ideally through a view or an ORM default scope. Make uniqueness conditional with partial unique indexes, such as `WHERE deleted_at IS NULL`. Also decide how foreign keys behave, since child rows usually should be hidden or restricted too.

**Follow-up:**

Why `deleted_at` over `is_deleted`?

Answer: It carries more information, supports retention rules and undelete windows, and works naturally in partial indexes. You can still derive a boolean from it.

### DB-237 — What are the problems with soft delete and what are the alternatives?

**Difficulty:** Intermediate

**Category:** Soft delete

**Question:**

What are the problems with soft delete and what are the alternatives?

**Answer:**

The problems: every query must remember the filter, unique constraints and foreign keys get more complicated, tables keep growing with dead data, and it does not satisfy GDPR-style erasure. Alternatives are moving deleted rows to an archive table (by trigger or `DELETE … RETURNING` into the archive), keeping an event or audit log, or hard-deleting and relying on backups and audit trails. Choose soft delete when undelete or history is a real requirement.

**Follow-up:**

How do you reduce the risk of forgetting the filter?

Answer: Query through views such as `active_users`, use row-level security policies, or use ORM default scopes. For high-risk tables, revoke direct table access from application roles.

### DB-238 — Which audit columns should most tables have?

**Difficulty:** Intermediate

**Category:** Audit and temporal

**Question:**

Which audit columns should most tables have?

**Answer:**

At minimum `created_at timestamptz NOT NULL DEFAULT now()` and `updated_at timestamptz NOT NULL DEFAULT now()`, with `updated_at` maintained by a trigger or the app. Optionally add `created_by` and `updated_by` referencing users. Keep their meaning consistent across tables. They are cheap and give you basic history and debugging information.

**Follow-up:**

Why use a trigger for `updated_at`?

Answer: A trigger works no matter which client or script updates the row. Application-only maintenance misses ad-hoc SQL and other services.

### DB-239 — How do you build a full audit log of changes?

**Difficulty:** Senior

**Category:** Audit and temporal

**Question:**

How do you build a full audit log of changes?

**Answer:**

Create a generic table such as `audit_log(table_name, row_pk, action, old_data jsonb, new_data jsonb, changed_by, changed_at)`. Fill it with `AFTER INSERT/UPDATE/DELETE` triggers that store `to_jsonb(OLD)` and `to_jsonb(NEW)`. Capture the acting user with `SET LOCAL app.user_id` and read it with `current_setting`. Partition the log by time, and restrict write access to prevent tampering.

**Follow-up:**

What is the cost?

Answer: Every change causes extra writes, storage grows, and triggers slow hot tables. Audit only tables that need it, and for wide rows log only the changed columns.

### DB-240 — How do you model history / temporal data briefly?

**Difficulty:** Senior

**Category:** Audit and temporal

**Question:**

How do you model history / temporal data briefly?

**Answer:**

Three common approaches. First, a history table that receives the old row on every update or delete, usually via trigger. Second, valid-time columns on the main table (`valid_from` and `valid_to`, or a `tstzrange`) with an exclusion constraint to prevent overlaps. Third, an append-only event table. Postgres has no built-in system-versioned tables, so you build these yourself or use an extension.

**Follow-up:**

What is the difference between valid time and transaction time?

Answer: Valid time is when a fact is true in the real world. Transaction time is when the database recorded it. Bitemporal models track both, which helps with corrections and audits but is much more complex.

### DB-241 — Why use range types for temporal modeling?

**Difficulty:** Senior

**Category:** Audit and temporal

**Question:**

Why use range types for temporal modeling?

**Answer:**

Types like `tstzrange` and `daterange` store an interval as one value. They come with operators for overlap (`&&`), containment (`@>`), and adjacency (`-|-`), and support GiST indexes. They remove off-by-one mistakes with separate start and end columns, and pair with `EXCLUDE` to forbid overlaps. Prefer half-open ranges `[start, end)` so adjacent periods don't overlap.

**Follow-up:**

How do you represent "currently valid, no end date"?

Answer: Leave the upper bound unbounded, like `tstzrange(start, NULL)`. Ranges handle open ends natively, while a NULL `valid_to` column needs special handling in every query.

### DB-242 — What type should you use for money?

**Difficulty:** Intermediate

**Category:** Money and numeric

**Question:**

What type should you use for money?

**Answer:**

Use `numeric(p, s)`, such as `numeric(12,2)`, for exact decimal arithmetic. Or store whole minor units, like cents in a `bigint`, with a `currency char(3)` column. Avoid the built-in `money` type, which depends on locale formatting and has fixed precision, and avoid floating-point types. Pick the scale the business needs: most currencies use 2 decimals, some use 0 or 3, and exchange rates need more.

**Follow-up:**

`numeric` vs integer cents: which is better?

Answer: Integer cents are faster and unambiguous, but awkward for fractions such as tax, FX, or unit prices, and need currency exponent handling. `numeric` is exact and flexible but larger and slower. Either works if you apply it consistently.

### DB-243 — Why are `float`/`double precision` unsafe for money, and what other money pitfalls exist?

**Difficulty:** Intermediate

**Category:** Money and numeric

**Question:**

Why are `float`/`double precision` unsafe for money, and what other money pitfalls exist?

**Answer:**

Binary floating point can't represent values like 0.1 exactly, so sums drift: `0.1 + 0.2` is not exactly `0.3`. Other pitfalls are storing an amount without its currency, rounding repeatedly instead of at defined points, summing across currencies, and using `numeric` with no constraints. Store the currency next to the amount and add `CHECK` rules.

**Follow-up:**

How should you store exchange rates?

Answer: As `numeric` with generous precision, for example `numeric(18,8)`, together with the rate's timestamp and source. Also store the converted amount you actually used, so it doesn't change when rates change.

### DB-244 — Why use `timestamptz` instead of `timestamp`?

**Difficulty:** Intermediate

**Category:** Time zones

**Question:**

Why use `timestamptz` instead of `timestamp`?

**Answer:**

`timestamptz` stores an exact instant in time (UTC internally) and converts it to the session's `TimeZone` when displayed. `timestamp` stores a wall-clock reading with no zone and does no conversion. For things that happened at a moment, like `created_at` or payments, `timestamptz` avoids ambiguity and daylight saving bugs. Neither type remembers the original time zone.

**Follow-up:**

Does `timestamptz` save the user's timezone?

Answer: No. If you need the user's zone, for local display or recurring rules, store an IANA name like `'Europe/Tbilisi'` in a separate `text` column.

### DB-245 — How do you model future local-time events (e.g., a meeting at 09:00 local) correctly?

**Difficulty:** Senior

**Category:** Time zones

**Question:**

How do you model future local-time events (e.g., a meeting at 09:00 local) correctly?

**Answer:**

Store the local date and time (`timestamp`, or `date` plus `time`) together with the IANA zone name, and compute the exact instant when you need it. Time zone rules, such as daylight saving or government changes, can shift the UTC instant between scheduling and the event, so a precomputed UTC value may become wrong. For past events, `timestamptz` is right; for future wall-clock plans, keep local time and zone.

**Follow-up:**

How do you convert in SQL?

Answer: `local_ts AT TIME ZONE zone_name` turns a `timestamp` into a `timestamptz`, and applying `AT TIME ZONE` to a `timestamptz` gives local `timestamp`. Handle ambiguous or nonexistent local times around daylight saving changes explicitly.

### DB-246 — Multi-tenancy: database-per-tenant vs schema-per-tenant vs shared tables with `tenant_id`?

**Difficulty:** Staff

**Category:** Multi-tenancy

**Question:**

Multi-tenancy: database-per-tenant vs schema-per-tenant vs shared tables with `tenant_id`?

**Answer:**

Database-per-tenant gives the strongest isolation and easy per-tenant backup and restore, but costs more to operate and uses many connections. Schema-per-tenant is a middle ground, but thousands of schemas bloat the catalog and complicate migrations. Shared tables with a `tenant_id` column are cheapest and scale to many small tenants, but isolation depends on discipline. Choose by tenant count, size differences, and compliance needs.

**Follow-up:**

How do you reduce cross-tenant leaks in the shared model?

Answer: Make `tenant_id` part of primary and composite foreign keys, such as `(tenant_id, id)`, and index it first. Enable Row-Level Security with policies that read a session variable like `current_setting('app.tenant_id')`. RLS is a safety net on top of correct queries, not a replacement.

### DB-247 — What are the main strategies for schema migrations without downtime?

**Difficulty:** Staff

**Category:** Migrations

**Question:**

What are the main strategies for schema migrations without downtime?

**Answer:**

Keep versioned migrations in source control and use the expand/contract pattern. Expand: add new nullable columns or tables in a compatible way. Deploy code that writes to both old and new. Backfill existing rows in batches. Switch reads to the new structure. Contract: drop the old structures. Keep each deploy compatible with the previous app version, and never rename or drop a column in the same release that stops using it.

**Follow-up:**

Why backfill in batches?

Answer: One huge `UPDATE` holds locks, produces a lot of WAL, bloats the table, and keeps a long transaction that blocks vacuum. Batches commit incrementally and can be throttled.

### DB-248 — Which DDL operations are risky on large tables in PG16, and how do you mitigate them?

**Difficulty:** Staff

**Category:** Migrations

**Question:**

Which DDL operations are risky on large tables in PG16, and how do you mitigate them?

**Answer:**

Risky operations hold a strong lock for a long time: adding a column with a volatile default, most column type changes (which rewrite the table), `SET NOT NULL` (which scans the table), adding validated foreign keys or checks, and plain `CREATE INDEX`. Mitigate with `lock_timeout`, adding constraints as `NOT VALID` then `VALIDATE`, `CREATE INDEX CONCURRENTLY`, and a validated `CHECK (col IS NOT NULL)` before `SET NOT NULL` so Postgres can skip the scan. For type changes, add a new column and backfill.

**Follow-up:**

Why set `lock_timeout` for migrations?

Answer: A DDL statement waiting for a lock queues behind a long query, and then blocks every later query on that table. A short `lock_timeout` makes it fail fast so you can retry, instead of causing an outage.

### DB-249 — What is the EAV anti-pattern and why is it discouraged?

**Difficulty:** Intermediate

**Category:** EAV and JSONB

**Question:**

What is the EAV anti-pattern and why is it discouraged?

**Answer:**

Entity-Attribute-Value stores data as rows of `(entity_id, attribute, value)`. It is infinitely flexible, but you lose column types, `NOT NULL`, foreign keys, and simple constraints. Values usually end up as text, queries need many self-joins or pivots, and the planner has poor statistics. Reporting becomes painful and performance degrades.

**Follow-up:**

What do you use instead for variable attributes?

Answer: Typed columns for known attributes, a `jsonb` column for the sparse or dynamic part (with validation and targeted indexes), or subtype tables. Use EAV only for truly user-defined schemas where nothing else fits.

### DB-250 — When is document-in-JSONB justified, and how do you keep it manageable?

**Difficulty:** Intermediate

**Category:** EAV and JSONB

**Question:**

When is document-in-JSONB justified, and how do you keep it manageable?

**Answer:**

It fits sparse or user-defined attributes, third-party payloads stored as received, settings and feature flags, and data that is read and written as a whole. Keep core relational fields, such as IDs, foreign keys, status, and timestamps, as real columns. Add `CHECK (jsonb_typeof(data) = 'object')`, validate the shape in the app or with a check function, and add GIN or expression indexes only for proven queries. Don't put data you join, aggregate, or constrain into JSONB.

**Follow-up:**

What are the performance considerations for large JSONB values?

Answer: Values over about 2 KB are TOASTed, meaning compressed and stored out of line. Reading one key may need to load the whole document, and updating one key rewrites the whole value. For large, frequently updated documents, move the hot fields into real columns.
