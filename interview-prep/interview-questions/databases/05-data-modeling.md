# DB05 — Data Modeling

PostgreSQL 16. Questions DB-201–DB-250.

Normalization 1NF–BCNF, denormalization, primary key choice, FK design, many-to-many and 1:1, inheritance, enums, constraints, soft delete, audit and temporal data, money and time types, multi-tenancy, migrations, EAV and JSONB. Indexing is DB03; transactions are DB04.

### DB-201 — What does First Normal Form (1NF) require in practice?

**Difficulty:** Intermediate

**Category:** Normalization

**Question:**

What does First Normal Form (1NF) require in practice?

**Answer:**

Each column holds one atomic value, each row is uniquely identifiable, and there are no repeating groups (`phone1`, `phone2`, `phone3`) or comma-separated lists in a column. In Postgres, arrays and `jsonb` can technically violate the spirit of 1NF; use them deliberately, not to dodge a child table.

**Follow-up:**

Is a `text[]` column of tags a 1NF violation?

Answer: Strictly it is non-atomic, but it is a pragmatic choice when tags are just labels you read and write as a unit, with no per-tag attributes or referential integrity. Once you need FKs, counts per tag, or tag metadata, move to a `tags` table plus a junction table.

### DB-202 — Explain 2NF and 3NF with a concrete example.

**Difficulty:** Intermediate

**Category:** Normalization

**Question:**

Explain 2NF and 3NF with a concrete example.

**Answer:**

2NF: no non-key column depends on only part of a composite key. In `order_items(order_id, product_id, product_name, qty)`, `product_name` depends only on `product_id`, so it moves to `products`. 3NF: no non-key column depends on another non-key column (transitive dependency). In `employees(id, dept_id, dept_name)`, `dept_name` depends on `dept_id`, so it belongs in `departments`.

**Follow-up:**

What bug does violating 3NF cause?

Answer: Update anomalies: renaming a department requires updating many rows, and missing one leaves inconsistent data. There are also insert and delete anomalies (you cannot record a department with no employees, and deleting the last employee loses the department).

### DB-203 — How does BCNF differ from 3NF, and does it matter?

**Difficulty:** Senior

**Category:** Normalization

**Question:**

How does BCNF differ from 3NF, and does it matter?

**Answer:**

BCNF requires that every determinant (the left side of any functional dependency) be a candidate key. 3NF allows a dependency `X → A` if `A` is part of some candidate key; BCNF does not. Differences appear only with overlapping composite candidate keys, which is rare. Example: `(student, course, teacher)` where each teacher teaches one course gives `teacher → course` with `teacher` not a key.

**Follow-up:**

Can BCNF decomposition lose a dependency?

Answer: Yes. Some BCNF decompositions cannot preserve every functional dependency as a simple constraint, so you may need a trigger or an exclusion/unique constraint across tables. That is why many teams stop at 3NF when the BCNF split is awkward.

### DB-204 — How far should you normalize in a real OLTP application?

**Difficulty:** Intermediate

**Category:** Normalization

**Question:**

How far should you normalize in a real OLTP application?

**Answer:**

Default to 3NF for transactional data: it protects integrity and keeps writes simple. Treat higher normal forms as a checklist for suspicious tables, not a goal. Normalize first, measure with `EXPLAIN`, and denormalize only specific read paths with evidence. Over-normalizing (a table per attribute) causes join sprawl and complex queries with little benefit.

**Follow-up:**

How do you spot a table that needs more normalization?

Answer: Look for repeated values that must change together, columns that are null depending on another column's value, and updates that touch many rows for one logical change. Those are dependency smells pointing to a missing entity.

### DB-205 — When is denormalization justified?

**Difficulty:** Intermediate

**Category:** Denormalization

**Question:**

When is denormalization justified?

**Answer:**

When a measured read path is too slow or too complex and the data changes rarely or can be kept consistent cheaply. Typical cases: reporting/read models, precomputed aggregates (counts, totals), snapshots of values that must not change retroactively (price at purchase time), and avoiding hot multi-way joins. Always record the source of truth and how the copy is refreshed.

**Follow-up:**

Is copying the product price into `order_items` denormalization?

Answer: It is a historical snapshot, not a redundant copy. The current price can change, but the order must keep what the customer paid. It is correct modeling, and the normalized `products.price` is a different fact.

### DB-206 — What mechanisms keep denormalized data consistent in PostgreSQL?

**Difficulty:** Senior

**Category:** Denormalization

**Question:**

What mechanisms keep denormalized data consistent in PostgreSQL?

**Answer:**

Options: generated columns (`GENERATED ALWAYS AS (...) STORED`) for same-row derivations; triggers for cross-row maintenance (counters, totals); materialized views refreshed on a schedule or with `REFRESH MATERIALIZED VIEW CONCURRENTLY`; and application-level writes in one transaction. Prefer the simplest option that gives the freshness you need.

**Follow-up:**

What is the downside of trigger-maintained counters?

Answer: Write contention: many concurrent inserts update the same counter row and serialize on its row lock. Mitigate with batched or async aggregation, per-shard counters, or accepting approximate counts.

### DB-207 — UUID vs identity bigint as primary key: how do you choose?

**Difficulty:** Intermediate

**Category:** Primary keys

**Question:**

UUID vs identity bigint as primary key: how do you choose?

**Answer:**

`bigint GENERATED ... AS IDENTITY` is small (8 bytes), ordered, index-friendly, and fast to join. UUID (16 bytes) allows client/offline ID generation, merging across systems, and hides record counts and ordering, but random UUIDv4 values scatter inserts across the B-tree and bloat indexes. Choose bigint for single-database internal tables, UUID when IDs must be generated outside the DB or exposed publicly.

**Follow-up:**

Can you use both?

Answer: Yes: a bigint internal PK for joins and FKs, plus a unique `public_id uuid` for external APIs. This costs an extra index and column but separates internal performance concerns from public identifiers.

### DB-208 — What is wrong with random UUIDv4 as a clustered-style key, and what are the alternatives in PG16?

**Difficulty:** Senior

**Category:** Primary keys

**Question:**

What is wrong with random UUIDv4 as a clustered-style key, and what are the alternatives in PG16?

**Answer:**

Postgres heaps are not clustered by PK, but the PK index is still a B-tree, so random values cause page splits, poor cache locality, and larger WAL (full-page writes after checkpoints). PG16 has `gen_random_uuid()` (v4) built in but no native UUIDv7. Time-ordered UUIDs (UUIDv7, ULID) can be generated in the app or via an extension or SQL function to get better locality.

**Follow-up:**

Does a time-ordered UUID leak information?

Answer: Yes, the creation timestamp is embedded. That is usually acceptable for internal IDs but may matter for public identifiers where creation time or rate is sensitive.

### DB-209 — `serial` vs `GENERATED ... AS IDENTITY`?

**Difficulty:** Intermediate

**Category:** Primary keys

**Question:**

`serial` vs `GENERATED ... AS IDENTITY`?

**Answer:**

`serial` is legacy shorthand for an integer column with a default `nextval()` on an owned sequence; the link and permissions are loose. `GENERATED ALWAYS AS IDENTITY` is SQL-standard, ties the sequence to the column, and `ALWAYS` blocks accidental manual inserts (override needs `OVERRIDING SYSTEM VALUE`). Prefer identity for new tables.

**Follow-up:**

Do sequences guarantee gap-free values?

Answer: No. Rolled-back transactions, crashes, and cached sequence values leave gaps. If you need gap-free numbers (invoice numbering), use a dedicated counter table updated in the same transaction, accepting the serialization cost.

### DB-210 — Natural keys vs surrogate keys?

**Difficulty:** Intermediate

**Category:** Primary keys

**Question:**

Natural keys vs surrogate keys?

**Answer:**

A natural key is a real-world attribute (email, ISO country code, SKU). Surrogate keys are meaningless generated IDs. Surrogates are stable, small, and keep FKs cheap when business values change. Natural keys work for stable, standardized codes (`country_code char(2)`) and avoid joins for lookups. A common rule: use a surrogate PK and enforce the natural key with a `UNIQUE` constraint.

**Follow-up:**

Why is email a bad primary key?

Answer: Emails change, are case-insensitive in practice, and would have to cascade through every FK. Use a surrogate PK and a unique index on `lower(email)` or a `citext` column.

### DB-211 — When should you use a composite primary key?

**Difficulty:** Intermediate

**Category:** Primary keys

**Question:**

When should you use a composite primary key?

**Answer:**

For junction tables (`(user_id, role_id)`) and entities identified naturally by a combination of columns, such as `(tenant_id, id)` in multi-tenant schemas. It enforces uniqueness without an extra column and the index serves lookups by the leading column. For regular entities referenced by many tables, a single-column surrogate PK keeps FKs simpler.

**Follow-up:**

Does column order in a composite PK matter?

Answer: Yes. The B-tree supports efficient lookups on leading columns, so put the column you filter by most often first. For `(user_id, role_id)`, lookups by `role_id` alone need a separate index.

### DB-212 — What does a foreign key guarantee, and what does it not?

**Difficulty:** Intermediate

**Category:** Foreign keys

**Question:**

What does a foreign key guarantee, and what does it not?

**Answer:**

It guarantees that a referencing row's value exists in the referenced table's unique/PK columns (or is NULL), and it controls what happens when the parent changes. It does not create an index on the referencing column. Without that index, parent deletes and updates scan the child table and can hold locks longer.

**Follow-up:**

Should every FK column be indexed?

Answer: Almost always, yes, for join performance and cascade checks. Exceptions are tiny tables or FK columns on rarely-modified parents where you have confirmed no scans or deletes occur.

### DB-213 — Explain the `ON DELETE` options and when to use each.

**Difficulty:** Intermediate

**Category:** Foreign keys

**Question:**

Explain the `ON DELETE` options and when to use each.

**Answer:**

`NO ACTION` (default) and `RESTRICT` reject the delete (`RESTRICT` checks immediately and cannot be deferred). `CASCADE` deletes children, suited to true ownership (order → order_items). `SET NULL` / `SET DEFAULT` detach children, suited to optional references (assigned_to). Choose by lifecycle: owned data cascades, shared or valuable data restricts.

**Follow-up:**

Why is `CASCADE` risky on core entities?

Answer: One delete can silently remove large trees of data, take many locks, and bypass application-level audit. For `users` or `accounts`, prefer `RESTRICT` plus an explicit, logged deletion process or soft delete.

### DB-214 — When does `ON UPDATE CASCADE` make sense?

**Difficulty:** Intermediate

**Category:** Foreign keys

**Question:**

When does `ON UPDATE CASCADE` make sense?

**Answer:**

Only when the referenced key can change. With immutable surrogate keys it is unnecessary. It is useful with natural keys that occasionally change (a renamed status code in a lookup table) so the change propagates automatically. Treat the need for it as a hint that the key might be wrong.

**Follow-up:**

What is the cost of cascading an update on a widely referenced key?

Answer: Every referencing row is rewritten (new tuple versions, index updates, WAL), which is expensive and lock-heavy on big child tables. That is another argument for immutable surrogates.

### DB-215 — What are deferrable constraints and when are they needed?

**Difficulty:** Senior

**Category:** Foreign keys

**Question:**

What are deferrable constraints and when are they needed?

**Answer:**

`DEFERRABLE INITIALLY IMMEDIATE/DEFERRED` lets FK or unique constraint checks run at commit (or on `SET CONSTRAINTS`) instead of per statement. Use cases: inserting circular references (two tables pointing at each other), swapping unique values between rows, and bulk loads where order is awkward. Only FK, unique, and exclusion constraints can be deferred (not `CHECK`).

**Follow-up:**

What is the trade-off?

Answer: Errors surface at commit, far from the offending statement, which makes debugging harder. Deferrable unique constraints also cannot be used as FK targets in some cases and may prevent certain optimizations. Use sparingly.

### DB-216 — How do nullable FK columns and `MATCH SIMPLE` behave?

**Difficulty:** Senior

**Category:** Foreign keys

**Question:**

How do nullable FK columns and `MATCH SIMPLE` behave?

**Answer:**

The default `MATCH SIMPLE` skips the check if any column of a composite FK is NULL, so a partially-null composite FK silently passes. A single nullable FK means "optional relationship". `MATCH FULL` requires all columns be NULL or all non-NULL. Add `NOT NULL` or a `CHECK` if the relationship is mandatory.

**Follow-up:**

How do you enforce "exactly one of two FKs is set"?

Answer: Use a `CHECK (num_nonnulls(a_id, b_id) = 1)` constraint. It is more readable than boolean expressions, though a polymorphic design with separate tables is often cleaner.

### DB-217 — What changed with `ON DELETE SET NULL (columns)` in recent Postgres?

**Difficulty:** Senior

**Category:** Foreign keys

**Question:**

What changed with `ON DELETE SET NULL (columns)` in recent Postgres?

**Answer:**

Since PG15 you can specify a column list: `FOREIGN KEY (tenant_id, user_id) REFERENCES users ON DELETE SET NULL (user_id)`. This is important in composite FKs where one column (like `tenant_id`) must stay non-null; before, `SET NULL` tried to null all FK columns and failed on `NOT NULL`.

**Follow-up:**

Where does this matter most?

Answer: Multi-tenant schemas with composite FKs `(tenant_id, id)`, where you want to detach a reference but keep the tenant column intact to preserve row-level isolation.

### DB-218 — How do you model a many-to-many relationship?

**Difficulty:** Intermediate

**Category:** Relationships

**Question:**

How do you model a many-to-many relationship?

**Answer:**

With a junction (association) table holding two FKs, such as `student_courses(student_id, course_id)`, with a composite PK or unique constraint on the pair to prevent duplicates. FKs usually use `ON DELETE CASCADE` since the row has no meaning without both sides. Add an index on the second column if you query from that side.

**Follow-up:**

Why not store an array of IDs in one column?

Answer: Arrays cannot enforce referential integrity, and queries and updates on membership are awkward. Arrays are acceptable only for opaque lists with no integrity needs and rare joins.

### DB-219 — How do you model attributes of a relationship (e.g., enrollment date, role)?

**Difficulty:** Intermediate

**Category:** Relationships

**Question:**

How do you model attributes of a relationship (e.g., enrollment date, role)?

**Answer:**

Put them in the junction table, which then becomes a first-class entity (`memberships(user_id, org_id, role, joined_at)`). If the same pair can relate multiple times (rehired employee), add a surrogate PK or include a time component in the key and enforce non-overlap with an exclusion constraint.

**Follow-up:**

When does a junction table deserve its own surrogate PK?

Answer: When other tables reference it (e.g., `membership_invites` pointing at a membership), when the pair is not unique over time, or when ORMs and APIs need a single identifier for the relationship.

### DB-220 — Adjacency list vs other models for hierarchies?

**Difficulty:** Senior

**Category:** Relationships

**Question:**

Adjacency list vs other models for hierarchies?

**Answer:**

Adjacency list (`parent_id` self-FK) is simplest and cheap to write; read subtrees with recursive CTEs (`WITH RECURSIVE`). Alternatives: `ltree` extension (materialized path with GiST/B-tree indexes, fast subtree queries, costly moves), nested sets (fast reads, expensive writes), and closure tables (fast ancestor/descendant queries, extra rows). Start with adjacency list unless subtree reads dominate.

**Follow-up:**

How do you prevent cycles in an adjacency list?

Answer: A plain constraint cannot; use a trigger that checks the ancestor chain with a recursive query, or enforce it in application logic inside a transaction. Closure tables and `ltree` make validation easier.

### DB-221 — What patterns exist for one-to-one relationships?

**Difficulty:** Intermediate

**Category:** Relationships

**Question:**

What patterns exist for one-to-one relationships?

**Answer:**

Two main ones: the child table uses the parent's PK as its own PK and FK (`user_profiles.user_id PRIMARY KEY REFERENCES users`), or a separate FK column with a `UNIQUE` constraint. Shared-PK is the strongest guarantee. Use 1:1 splits to isolate rarely-used or large columns, separate permissions, or optional subtype data.

**Follow-up:**

Why not just add the columns to the parent?

Answer: Often you should. Splitting makes sense for wide/TOAST-heavy data, different security needs, optional data that would be mostly NULL, or different update frequencies that create bloat in a hot table.

### DB-222 — How do you enforce that a 1:1 relationship is mandatory on both sides?

**Difficulty:** Senior

**Category:** Relationships

**Question:**

How do you enforce that a 1:1 relationship is mandatory on both sides?

**Answer:**

Postgres cannot enforce "every user has a profile" with simple constraints because one row must exist before the other. Options: a `DEFERRABLE INITIALLY DEFERRED` FK checked at commit in one direction plus the PK/UNIQUE in the other, a trigger, or merging the tables. Most designs enforce one direction only and handle the other in the application or with a creation function.

**Follow-up:**

What is the simplest reliable way?

Answer: Create both rows in one transaction through a single function or service method, and use a deferred FK if you need DB-level assurance. If that is too heavy, merge the tables.

### DB-223 — What is single-table inheritance and when does it work?

**Difficulty:** Intermediate

**Category:** Inheritance and polymorphism

**Question:**

What is single-table inheritance and when does it work?

**Answer:**

All subtypes share one table with a `type` discriminator and nullable subtype-specific columns. It is simple, avoids joins, and works well when subtypes share most columns and have few differences. Downsides: many NULLs, weak constraints (needs `CHECK` conditional on type), and growth as subtypes diversify.

**Follow-up:**

How do you enforce per-type required columns?

Answer: With `CHECK ((type <> 'card' OR card_last4 IS NOT NULL))` style constraints for each subtype. They work but get unwieldy as subtypes grow, which is a signal to switch to table-per-type.

### DB-224 — What is table-per-type (class table inheritance) and its trade-offs?

**Difficulty:** Senior

**Category:** Inheritance and polymorphism

**Question:**

What is table-per-type (class table inheritance) and its trade-offs?

**Answer:**

A base table holds common columns, and each subtype has its own table keyed by the base PK (`payments` plus `card_payments`, `bank_payments`). Constraints are precise (real `NOT NULL`) and the model is normalized. Costs: joins or unions for full reads, more tables, and application logic to keep base and subtype rows in sync.

**Follow-up:**

How do you ensure a base row has exactly one subtype row?

Answer: Add a `type` column on the base table, include it in a unique key `(id, type)`, and have each subtype table FK to `(id, type)` with a `CHECK (type = 'card')`. That prevents a payment from appearing in two subtype tables.

### DB-225 — Table-per-type vs a JSONB column for subtype attributes?

**Difficulty:** Senior

**Category:** Inheritance and polymorphism

**Question:**

Table-per-type vs a JSONB column for subtype attributes?

**Answer:**

Use table-per-type (or single-table) when subtype attributes are known, queried, constrained, and joined. Use `jsonb` when attributes are sparse, user-defined, or vary widely and you mostly read them as a blob. A hybrid is common: typed columns for shared/queried fields, `jsonb` for the long tail.

**Follow-up:**

What do you lose with JSONB?

Answer: Column-level types, `NOT NULL`, FKs, and accurate planner statistics for inner fields. You can partially recover with `CHECK` constraints and expression/GIN indexes, but it takes more effort.

### DB-226 — Does PostgreSQL native table inheritance (`INHERITS`) solve ORM-style inheritance?

**Difficulty:** Intermediate

**Category:** Inheritance and polymorphism

**Question:**

Does PostgreSQL native table inheritance (`INHERITS`) solve ORM-style inheritance?

**Answer:**

Mostly no. Child tables inherit columns, but PKs, unique constraints, and FKs are not inherited across the hierarchy, so you cannot have a global unique ID or FK to "any subtype". Today declarative partitioning replaced the main legitimate use. `INHERITS` is rarely a good choice for application modeling.

**Follow-up:**

What is `INHERITS` still used for?

Answer: Legacy partitioning setups and some niche cases such as shared audit columns via `LIKE` or inheritance in extensions. For new designs, prefer partitioning or explicit table-per-type.

### DB-227 — Why are polymorphic associations (`target_type`, `target_id`) an anti-pattern?

**Difficulty:** Senior

**Category:** Inheritance and polymorphism

**Question:**

Why are polymorphic associations (`target_type`, `target_id`) an anti-pattern?

**Answer:**

A column pair that points to different tables cannot have a real FK, so referential integrity is lost and orphans appear. Alternatives: separate nullable FKs with a `CHECK` that exactly one is set, a shared supertype table that all targets reference, or separate junction tables per target type.

**Follow-up:**

When might you accept polymorphic references anyway?

Answer: For loosely coupled data like comments or activity logs across many entity types where integrity is secondary and the table is append-only. Document the trade-off and consider periodic orphan checks.

### DB-228 — Native enum type vs lookup table for statuses?

**Difficulty:** Intermediate

**Category:** Enums and domains

**Question:**

Native enum type vs lookup table for statuses?

**Answer:**

`CREATE TYPE ... AS ENUM` is compact (4 bytes), ordered, and self-validating. Adding values is easy (`ALTER TYPE ... ADD VALUE`), but removing or renaming is hard, and values cannot carry metadata. A lookup table with an FK allows extra columns (label, sort order, active flag), runtime changes through plain DML, and shows up in joins. Use enums for small, stable sets and lookup tables for evolving or metadata-rich sets.

**Follow-up:**

Any enum gotchas in migrations?

Answer: `ADD VALUE` used to be unusable inside a transaction block before PG12, and a newly added value cannot be used in the same transaction in some cases. Removing values requires creating a new type and rewriting the column.

### DB-229 — `CHECK (status IN (...))` vs enum vs lookup table?

**Difficulty:** Intermediate

**Category:** Enums and domains

**Question:**

`CHECK (status IN (...))` vs enum vs lookup table?

**Answer:**

A `text` column with a `CHECK` is easy to alter (drop and re-add the constraint) and keeps values human-readable, but it stores the string in every row and scatters the allowed list in constraints. Enum is compact and typed. A lookup table centralizes values and supports metadata. For low-churn lists, `CHECK` or enum is fine; for admin-managed lists, use a lookup table.

**Follow-up:**

How do you change a CHECK on a large table safely?

Answer: Add the new constraint with `NOT VALID` (no full scan under heavy lock), then `VALIDATE CONSTRAINT` (lighter lock), then drop the old one. This avoids a long `ACCESS EXCLUSIVE` lock.

### DB-230 — What are domains and when do they help?

**Difficulty:** Intermediate

**Category:** Enums and domains

**Question:**

What are domains and when do they help?

**Answer:**

`CREATE DOMAIN` defines a reusable type with constraints and defaults, e.g. `CREATE DOMAIN email AS text CHECK (VALUE ~* '^[^@]+@[^@]+$')`, or `positive_money` over numeric. They centralize rules across tables and make schemas self-documenting.

**Follow-up:**

What is the downside?

Answer: Changing a domain constraint requires altering it everywhere it is used and validating existing data, and some tools show only the base type. Keep domains simple and stable.

### DB-231 — What should `CHECK` constraints be used for?

**Difficulty:** Intermediate

**Category:** Constraints

**Question:**

What should `CHECK` constraints be used for?

**Answer:**

Row-level invariants that depend only on that row's columns: positive amounts, `end_at > start_at`, valid status combinations, `num_nonnulls` rules. They must be immutable and cannot reference other tables or subqueries in a reliable way. Cross-row or cross-table rules need unique/exclusion constraints, FKs, or triggers.

**Follow-up:**

Do `CHECK` constraints pass when the expression is NULL?

Answer: Yes: a `CHECK` fails only when the expression is `FALSE`; `NULL` passes. Combine with `NOT NULL` or write the expression to handle nulls explicitly.

### DB-232 — How should `NOT NULL` and `DEFAULT` be used in modeling?

**Difficulty:** Intermediate

**Category:** Constraints

**Question:**

How should `NOT NULL` and `DEFAULT` be used in modeling?

**Answer:**

Make columns `NOT NULL` unless absence is a meaningful state; it simplifies queries (three-valued logic) and gives the planner better information. Use defaults for stable values (`now()`, `false`, `'pending'`). Avoid using sentinel values like `''` or `0` to mean "unknown"; NULL (or a separate state) is clearer.

**Follow-up:**

Is adding a `NOT NULL DEFAULT` column expensive in PG16?

Answer: Since PG11, adding a column with a non-volatile default is a metadata-only change and does not rewrite the table. A volatile default (like `random()`) still rewrites.

### DB-233 — How do `UNIQUE` constraints treat NULLs, and what did PG15 add?

**Difficulty:** Senior

**Category:** Constraints

**Question:**

How do `UNIQUE` constraints treat NULLs, and what did PG15 add?

**Answer:**

By default, NULLs are distinct, so multiple rows with NULL in a unique column are allowed. PG15 added `UNIQUE NULLS NOT DISTINCT`, which treats NULLs as equal. This matters for composite unique keys with optional columns, like `(user_id, deleted_at)` or `(tenant_id, external_ref)`.

**Follow-up:**

How did people handle this before PG15?

Answer: With partial unique indexes (`WHERE col IS NULL` and `WHERE col IS NOT NULL`) or by using `COALESCE` in an expression index. `NULLS NOT DISTINCT` is cleaner.

### DB-234 — What is an exclusion constraint and what problem does it solve?

**Difficulty:** Senior

**Category:** Constraints

**Question:**

What is an exclusion constraint and what problem does it solve?

**Answer:**

`EXCLUDE USING gist (...)` generalizes uniqueness to operators other than equality. The classic use is preventing overlapping bookings: `EXCLUDE USING gist (room_id WITH =, during WITH &&)` with a `tstzrange` column. Equality on scalar columns needs the `btree_gist` extension. It enforces the rule atomically, even under concurrency.

**Follow-up:**

Why is this better than checking in application code?

Answer: App-level check-then-insert races under concurrent requests unless you add explicit locking or serializable isolation. The constraint is enforced by the database for every writer.

### DB-235 — When do partial unique indexes help in modeling?

**Difficulty:** Intermediate

**Category:** Constraints

**Question:**

When do partial unique indexes help in modeling?

**Answer:**

They enforce uniqueness for a subset: one active subscription per user (`UNIQUE (user_id) WHERE status = 'active'`), unique emails among non-deleted users, or one primary address per customer. They express conditional business rules that a normal unique constraint cannot.

**Follow-up:**

Can a partial unique index be an FK target?

Answer: No. FKs require a full unique constraint or PK on the referenced columns. A partial unique index only enforces uniqueness, not referenceability.

### DB-236 — How do you model soft deletes?

**Difficulty:** Intermediate

**Category:** Soft delete

**Question:**

How do you model soft deletes?

**Answer:**

Add `deleted_at timestamptz NULL` (preferred over a boolean because it records when). Filter with `WHERE deleted_at IS NULL`, ideally through a view or ORM default scope. Make uniqueness conditional with partial unique indexes (`WHERE deleted_at IS NULL`). Decide how FKs behave: children usually should also be hidden or restricted.

**Follow-up:**

Why `deleted_at` over `is_deleted`?

Answer: It carries more information (when), supports retention policies and undelete windows, and works naturally with partial indexes. A boolean can be derived from it.

### DB-237 — What are the problems with soft delete and what are the alternatives?

**Difficulty:** Intermediate

**Category:** Soft delete

**Question:**

What are the problems with soft delete and what are the alternatives?

**Answer:**

Problems: every query must remember the filter, unique constraints and FKs get complicated, tables grow with dead data, and GDPR "erasure" is not satisfied. Alternatives: move deleted rows to an archive table (via trigger or `DELETE ... RETURNING` into archive), use event/audit logs, or hard delete with backups and audit trails. Pick soft delete when undelete or referential history is a real requirement.

**Follow-up:**

How do you reduce the risk of forgetting the filter?

Answer: Query through views (`active_users`), use row-level security policies, or ORM default scopes. Revoke direct table access from app roles if the risk is high.

### DB-238 — Which audit columns should most tables have?

**Difficulty:** Intermediate

**Category:** Audit and temporal

**Question:**

Which audit columns should most tables have?

**Answer:**

`created_at timestamptz NOT NULL DEFAULT now()`, `updated_at timestamptz NOT NULL DEFAULT now()` maintained by a trigger or the app, and optionally `created_by` / `updated_by` referencing users. Keep their meaning consistent across tables. They are cheap and provide basic provenance and debugging information.

**Follow-up:**

Why use a trigger for `updated_at`?

Answer: It guarantees correctness regardless of which client or script updates the row. Application-only maintenance misses ad-hoc SQL and other services.

### DB-239 — How do you build a full audit log of changes?

**Difficulty:** Senior

**Category:** Audit and temporal

**Question:**

How do you build a full audit log of changes?

**Answer:**

A generic `audit_log(table_name, row_pk, action, old_data jsonb, new_data jsonb, changed_by, changed_at)` populated by `AFTER INSERT/UPDATE/DELETE` triggers using `to_jsonb(OLD/NEW)`. Capture the actor via `SET LOCAL app.user_id` or `current_setting`. Partition by time and restrict write access to prevent tampering.

**Follow-up:**

What is the cost?

Answer: Extra write amplification on every change, storage growth, and trigger overhead on hot tables. Audit only tables that need it, and log only changed columns for wide rows.

### DB-240 — How do you model history / temporal data briefly?

**Difficulty:** Senior

**Category:** Audit and temporal

**Question:**

How do you model history / temporal data briefly?

**Answer:**

Common approaches: (1) a history table receiving the old row on update/delete (trigger-based); (2) valid-time columns on the main table (`valid_from`, `valid_to` or a `tstzrange`) with an exclusion constraint preventing overlap; (3) an append-only event table. Postgres has no built-in system-versioned tables, so you build these yourself or use an extension.

**Follow-up:**

What is the difference between valid time and transaction time?

Answer: Valid time is when a fact is true in the real world; transaction time is when the database recorded it. Bitemporal models track both, which is useful for corrections and audits but significantly more complex.

### DB-241 — Why use range types for temporal modeling?

**Difficulty:** Senior

**Category:** Audit and temporal

**Question:**

Why use range types for temporal modeling?

**Answer:**

`tstzrange` / `daterange` represent intervals as one value, with operators for overlap (`&&`), containment (`@>`), and adjacency (`-|-`), plus GiST indexing. They remove off-by-one errors in `start`/`end` pairs and combine with `EXCLUDE` to forbid overlaps. Prefer half-open ranges `[start, end)` so adjacent periods do not overlap.

**Follow-up:**

How do you represent "currently valid, no end date"?

Answer: Use an unbounded upper bound: `tstzrange(start, NULL)` or `'infinity'`. Ranges handle open ends natively, whereas a NULL `valid_to` column needs special handling in every query.

### DB-242 — What type should you use for money?

**Difficulty:** Intermediate

**Category:** Money and numeric

**Question:**

What type should you use for money?

**Answer:**

`numeric(p, s)` (for example `numeric(12,2)`) for exact decimal arithmetic, or integers in minor units (`bigint` cents) with a `currency char(3)` column. Avoid `money` (locale-dependent formatting, fixed precision) and floating-point types. Choose the scale for the business need: many currencies use 2 decimals but some use 0 or 3, and crypto or FX rates need more.

**Follow-up:**

`numeric` vs integer cents: which is better?

Answer: Integer cents are faster and unambiguous but make fractional values (tax, FX, unit prices) awkward and need currency exponent handling. `numeric` is flexible and exact but slower and larger. Either is fine if applied consistently.

### DB-243 — Why are `float`/`double precision` unsafe for money, and what other money pitfalls exist?

**Difficulty:** Intermediate

**Category:** Money and numeric

**Question:**

Why are `float`/`double precision` unsafe for money, and what other money pitfalls exist?

**Answer:**

Binary floating point cannot represent values like 0.1 exactly, so sums drift (`0.1 + 0.2 <> 0.3`). Other pitfalls: storing amounts without currency, rounding at the wrong step (round at defined boundaries, not repeatedly), mixing currencies in a sum, and using `numeric` without constraints. Add `CHECK` rules and store the currency alongside the amount.

**Follow-up:**

How should you store exchange rates?

Answer: As `numeric` with generous precision (e.g., `numeric(18,8)`), stored with the rate's timestamp and source. Persist the converted amount used in a transaction so it does not change when rates change.

### DB-244 — Why use `timestamptz` instead of `timestamp`?

**Difficulty:** Intermediate

**Category:** Time zones

**Question:**

Why use `timestamptz` instead of `timestamp`?

**Answer:**

`timestamptz` stores an absolute instant (UTC internally) and converts to the session `TimeZone` on output; `timestamp` stores a wall-clock reading with no zone and no conversion. For events that happened at a point in time (created_at, payments), `timestamptz` avoids ambiguity and DST bugs. Neither type stores the original zone.

**Follow-up:**

Does `timestamptz` save the user's timezone?

Answer: No. If you need the user's zone (to render local time or recurring rules), store an IANA name such as `'Europe/Tbilisi'` in a separate `text` column.

### DB-245 — How do you model future local-time events (e.g., a meeting at 09:00 local) correctly?

**Difficulty:** Senior

**Category:** Time zones

**Question:**

How do you model future local-time events (e.g., a meeting at 09:00 local) correctly?

**Answer:**

Store local date/time (`timestamp` or `date` + `time`) plus the IANA zone name, and compute the instant when needed. Timezone rules (DST, government changes) may shift the UTC instant between scheduling and the event, so a pre-computed UTC value can become wrong. For past events, `timestamptz` is correct; for future wall-clock intentions, keep local time and zone.

**Follow-up:**

How do you convert in SQL?

Answer: `local_ts AT TIME ZONE zone_name` converts a `timestamp` to `timestamptz`, and `ts AT TIME ZONE zone_name` on a `timestamptz` yields local `timestamp`. Handle ambiguous or nonexistent local times around DST transitions explicitly.

### DB-246 — Multi-tenancy: database-per-tenant vs schema-per-tenant vs shared tables with `tenant_id`?

**Difficulty:** Staff

**Category:** Multi-tenancy

**Question:**

Multi-tenancy: database-per-tenant vs schema-per-tenant vs shared tables with `tenant_id`?

**Answer:**

Database-per-tenant: strongest isolation and easy per-tenant backup/restore, but high operational overhead and connection cost. Schema-per-tenant: moderate isolation, but thousands of schemas bloat the catalog and complicate migrations. Shared tables with a `tenant_id` column: cheapest and scales to many small tenants, but isolation depends on discipline. Choose by tenant count, size variance, and compliance needs.

**Follow-up:**

How do you reduce cross-tenant leaks in the shared model?

Answer: Make `tenant_id` part of PKs and composite FKs (`(tenant_id, id)`), index it as the leading column, and enable Row-Level Security with policies using a session variable like `current_setting('app.tenant_id')`. RLS is a safety net on top of correct queries, not a replacement.

### DB-247 — What are the main strategies for schema migrations without downtime?

**Difficulty:** Staff

**Category:** Migrations

**Question:**

What are the main strategies for schema migrations without downtime?

**Answer:**

Use versioned migrations in source control and the expand/contract pattern: (1) expand by adding new nullable columns or tables compatibly, (2) deploy code that writes both, (3) backfill in batches, (4) switch reads, (5) contract by dropping old structures. Keep each deploy backward-compatible with the previous app version. Never rename or drop columns in the same release that stops using them.

**Follow-up:**

Why backfill in batches?

Answer: A single huge `UPDATE` holds locks, generates massive WAL, bloats the table, and risks long transactions that block vacuum. Batches commit incrementally and let you throttle.

### DB-248 — Which DDL operations are risky on large tables in PG16, and how do you mitigate them?

**Difficulty:** Staff

**Category:** Migrations

**Question:**

Which DDL operations are risky on large tables in PG16, and how do you mitigate them?

**Answer:**

Risky: operations needing `ACCESS EXCLUSIVE` for long periods: adding a column with a volatile default, changing a column type (rewrite), `SET NOT NULL` (scans), adding validated FKs/CHECKs, and non-concurrent index creation. Mitigate: set `lock_timeout`, add constraints `NOT VALID` then `VALIDATE`, use `CREATE INDEX CONCURRENTLY`, use a CHECK-then-`SET NOT NULL` trick, and use add-new-column-and-backfill instead of type rewrites.

**Follow-up:**

Why set `lock_timeout` for migrations?

Answer: A DDL waiting for a lock queues behind a long query and then blocks all later queries on that table. A short `lock_timeout` makes the migration fail fast and retry instead of causing an outage.

### DB-249 — What is the EAV anti-pattern and why is it discouraged?

**Difficulty:** Intermediate

**Category:** EAV and JSONB

**Question:**

What is the EAV anti-pattern and why is it discouraged?

**Answer:**

Entity-Attribute-Value stores data as rows of `(entity_id, attribute, value)`. It gives unlimited flexibility but loses types, `NOT NULL`, FKs, and simple constraints; values end up as text, queries need many self-joins or pivots, and the planner has poor statistics. Reporting becomes painful and performance degrades.

**Follow-up:**

What do you use instead for variable attributes?

Answer: Typed columns for known attributes, a `jsonb` column for the sparse/dynamic portion with validation and targeted indexes, or subtype tables. Use EAV only for truly user-defined schemas where nothing else fits.

### DB-250 — When is document-in-JSONB justified, and how do you keep it manageable?

**Difficulty:** Intermediate

**Category:** EAV and JSONB

**Question:**

When is document-in-JSONB justified, and how do you keep it manageable?

**Answer:**

Justified for sparse or user-defined attributes, third-party payloads stored as received, feature flags/settings, and data read and written as a whole. Keep core relational fields (IDs, FKs, status, timestamps) as columns. Add `CHECK (jsonb_typeof(data) = 'object')`, validate shape in the app or with a schema-check function, and add GIN or expression indexes only for proven queries. Avoid putting data you join, aggregate, or constrain into JSONB.

**Follow-up:**

What are the performance considerations for large JSONB values?

Answer: Values over about 2 KB get TOASTed (compressed, stored out of line), so reading one key may detoast the whole document, and updating one key rewrites the whole value. Large, frequently updated documents cause bloat; split hot fields into columns.
