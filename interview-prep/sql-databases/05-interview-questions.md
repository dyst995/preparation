05 - Interview Question Bank & Schema Design Drills

Goal: A single, dense practice chapter you can drill against repeatedly - a big SQL question bank plus schema design exercises for EasyPay (fintech) and VetApp (clinic) style domains, since those map directly to your CV and are the most likely "design a schema" prompts you'll get.

Mark progress with [x] as you master each topic.

---

Learning objectives

By the end of this chapter you should be able to:

1. Design a normalized relational schema from a verbal product description within 10-15 minutes on a whiteboard/doc.
2. Identify primary keys, foreign keys, and the right cardinality (one-to-many, many-to-many) for a domain.
3. Justify normalization decisions and know when limited denormalization is reasonable.
4. Write correct SQL for 20+ common interview query patterns from memory.
5. Handle "what would you change if this table gets huge" follow-ups.

---

## Part A - Schema Design Drills

### How to run a schema design interview on yourself

1. Restate entities and relationships in your own words.
2. List core entities (nouns): who/what does the system track?
3. For each entity, list the columns that clearly belong to it alone.
4. Identify relationships and their cardinality (one-to-one, one-to-many, many-to-many).
5. For many-to-many, introduce a join table.
6. Add the "boring but essential" columns: `id`, `created_at`, `updated_at`, soft-delete flag if relevant.
7. Add constraints: NOT NULL, UNIQUE, FOREIGN KEY, CHECK where the business logic demands it.
8. State your indexing plan for the 2-3 most likely queries.
9. Call out one deliberate denormalization or trade-off, if any, and why.

---

### Drill 1: Design a schema for VetApp (veterinary clinic management)

**Prompt you might get:** "Design a database schema for a veterinary clinic app. Pet owners can register pets, book appointments with vets, and vets record diagnoses. Payments happen per appointment."

**Model schema:**

```sql
CREATE TABLE owners (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(50),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE pets (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  owner_id BIGINT NOT NULL,
  name VARCHAR(255) NOT NULL,
  species VARCHAR(50) NOT NULL,
  birth_date DATE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES owners(id)
);

CREATE TABLE vets (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  full_name VARCHAR(255) NOT NULL,
  specialty VARCHAR(100),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE appointments (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  pet_id BIGINT NOT NULL,
  vet_id BIGINT NOT NULL,
  scheduled_at DATETIME NOT NULL,
  status ENUM('pending', 'confirmed', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pet_id) REFERENCES pets(id),
  FOREIGN KEY (vet_id) REFERENCES vets(id),
  INDEX idx_vet_scheduled (vet_id, scheduled_at),
  INDEX idx_pet_scheduled (pet_id, scheduled_at)
);

CREATE TABLE medical_records (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  appointment_id BIGINT NOT NULL UNIQUE, -- one record per appointment (1:1) in this simplified model
  diagnosis TEXT,
  treatment TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (appointment_id) REFERENCES appointments(id)
);

CREATE TABLE payments (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  appointment_id BIGINT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'GEL',
  status ENUM('pending', 'succeeded', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (appointment_id) REFERENCES appointments(id),
  INDEX idx_appointment (appointment_id)
);
```

**Design decisions to be ready to defend:**
- `medical_records.appointment_id` is UNIQUE because this simplified model assumes one diagnosis record per appointment (1:1). Point out that a real system might allow multiple entries (follow-ups) - a 1:many relationship instead - and that you'd relax the UNIQUE constraint if so.
- `payments` is a separate table from `appointments` (not a `paid` boolean on appointments) because an appointment could have multiple payment attempts (failed retries, partial refunds) - a classic "don't cram history into a status flag" decision.
- `DECIMAL(10,2)` for money, never `FLOAT`/`DOUBLE` - floating point rounding errors are unacceptable for currency. This is a very high-signal thing to say unprompted.
- Composite index `(vet_id, scheduled_at)` supports the most common query: "this vet's upcoming appointments."

---

### Drill 2: Design a schema for EasyPay (fintech: wallets, transfers, loans)

**Prompt you might get:** "Design a schema for a mobile wallet app. Users have wallets, can transfer money to each other, and can apply for loans that they repay over time."

**Model schema:**

```sql
CREATE TABLE users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(255) UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE wallets (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'GEL',
  balance DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE (user_id, currency), -- one wallet per currency per user
  CHECK (balance >= 0)
);

-- A transfer is modeled as TWO transaction rows (debit + credit) sharing a transfer_id,
-- rather than one row with "from/to" columns - this makes the ledger symmetric and
-- makes "get all activity for this wallet" a single simple WHERE wallet_id = ? query.
CREATE TABLE transfers (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  idempotency_key VARCHAR(100) NOT NULL UNIQUE, -- prevents duplicate transfers on client retry
  from_wallet_id BIGINT NOT NULL,
  to_wallet_id BIGINT NOT NULL,
  amount DECIMAL(14, 2) NOT NULL,
  status ENUM('pending', 'succeeded', 'failed') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (from_wallet_id) REFERENCES wallets(id),
  FOREIGN KEY (to_wallet_id) REFERENCES wallets(id),
  CHECK (from_wallet_id <> to_wallet_id),
  CHECK (amount > 0)
);

CREATE TABLE transactions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  wallet_id BIGINT NOT NULL,
  transfer_id BIGINT NULL, -- nullable: not every transaction is a transfer (e.g. top-ups)
  type ENUM('debit', 'credit') NOT NULL,
  amount DECIMAL(14, 2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (wallet_id) REFERENCES wallets(id),
  FOREIGN KEY (transfer_id) REFERENCES transfers(id),
  INDEX idx_wallet_created (wallet_id, created_at)
);

CREATE TABLE loans (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  principal DECIMAL(14, 2) NOT NULL,
  status ENUM('pending', 'approved', 'rejected', 'active', 'closed') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE loan_payments (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  loan_id BIGINT NOT NULL,
  amount DECIMAL(14, 2) NOT NULL,
  paid_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (loan_id) REFERENCES loans(id),
  INDEX idx_loan (loan_id)
);
```

**Design decisions to be ready to defend:**
- `idempotency_key` on transfers: a mobile client can safely retry a transfer request on network failure without risking a duplicate transfer, since the unique constraint rejects a second insert with the same key. This is a real, senior-level fintech design point that ties directly to your EasyPay QR payments / money transfers experience.
- Double-entry-style `transactions` table (a debit row and a credit row per transfer) is a deliberate ledger pattern: it makes "wallet history" a trivial single-table query and makes the system auditable - you can always reconstruct a balance from the transaction history, not just trust the `wallets.balance` column blindly.
- `CHECK (balance >= 0)` at the database level as a last line of defense, in addition to application-level validation before debiting.
- `DECIMAL`, never float, for the same reason as above.
- Separate `loans` and `loan_payments` because a loan is repaid incrementally over time - a classic one-to-many relationship, and you need the individual payment history for reconciliation and any partial-payment / late-payment logic.

**Common follow-up: "How do you keep `wallets.balance` in sync with the transaction ledger?"**

> "Either update `balance` transactionally in the same DB transaction as inserting the debit/credit rows (simplest, needs correct locking as covered in chapter 03), or treat `balance` as a derived/cached value recomputed periodically from the transaction sum as a reconciliation job, catching drift. In practice I'd do both: update balance atomically on the hot path, and run a periodic reconciliation job that recomputes from the ledger and alerts on mismatches, since the ledger is the source of truth."

---

## Part B - SQL Query Bank (write these from memory, using the schemas above)

### Basic

1. List all pets belonging to owner with email `'jane@example.com'`.

```sql
SELECT p.* FROM pets p
JOIN owners o ON o.id = p.owner_id
WHERE o.email = 'jane@example.com';
```

2. Count appointments per status.

```sql
SELECT status, COUNT(*) FROM appointments GROUP BY status;
```

3. List the 5 most recent transfers.

```sql
SELECT * FROM transfers ORDER BY created_at DESC LIMIT 5;
```

### Joins & NULL handling

4. List every vet along with their total completed appointment count, including vets with zero.

```sql
SELECT v.full_name, COUNT(a.id) AS completed_count
FROM vets v
LEFT JOIN appointments a ON a.vet_id = v.id AND a.status = 'completed'
GROUP BY v.id, v.full_name;
```

5. Find users who have never made a transfer.

```sql
SELECT u.* FROM users u
JOIN wallets w ON w.user_id = u.id
WHERE NOT EXISTS (
  SELECT 1 FROM transfers t WHERE t.from_wallet_id = w.id
);
```

6. Find pets that have never had an appointment.

```sql
SELECT p.* FROM pets p
LEFT JOIN appointments a ON a.pet_id = p.id
WHERE a.id IS NULL;
```

### Aggregation & HAVING

7. Find vets who completed more than 10 appointments in the last 30 days.

```sql
SELECT v.full_name, COUNT(*) AS completed
FROM appointments a
JOIN vets v ON v.id = a.vet_id
WHERE a.status = 'completed' AND a.scheduled_at >= NOW() - INTERVAL 30 DAY
GROUP BY v.id, v.full_name
HAVING COUNT(*) > 10;
```

8. Find the total amount transferred per day for the last 7 days.

```sql
SELECT DATE(created_at) AS day, SUM(amount) AS total
FROM transfers
WHERE status = 'succeeded' AND created_at >= NOW() - INTERVAL 7 DAY
GROUP BY DATE(created_at)
ORDER BY day;
```

9. Find wallets with a balance that doesn't match the sum of their transactions (a reconciliation query).

```sql
SELECT w.id, w.balance,
  COALESCE(SUM(CASE WHEN t.type = 'credit' THEN t.amount ELSE -t.amount END), 0) AS computed_balance
FROM wallets w
LEFT JOIN transactions t ON t.wallet_id = w.id
GROUP BY w.id, w.balance
HAVING w.balance <> COALESCE(SUM(CASE WHEN t.type = 'credit' THEN t.amount ELSE -t.amount END), 0);
```

### Subqueries, CTEs, EXISTS

10. Find the owner with the most pets.

```sql
SELECT o.full_name, COUNT(*) AS pet_count
FROM owners o
JOIN pets p ON p.owner_id = o.id
GROUP BY o.id, o.full_name
ORDER BY pet_count DESC
LIMIT 1;
```

11. Find loans that are active but have had no payment in the last 30 days (delinquency check).

```sql
SELECT l.*
FROM loans l
WHERE l.status = 'active'
AND NOT EXISTS (
  SELECT 1 FROM loan_payments lp
  WHERE lp.loan_id = l.id AND lp.paid_at >= NOW() - INTERVAL 30 DAY
);
```

12. Using a CTE, find each user's total outstanding loan principal minus payments made.

```sql
WITH loan_paid AS (
  SELECT loan_id, SUM(amount) AS total_paid
  FROM loan_payments
  GROUP BY loan_id
)
SELECT u.full_name, l.id AS loan_id,
  l.principal - COALESCE(lp.total_paid, 0) AS outstanding
FROM loans l
JOIN users u ON u.id = l.user_id
LEFT JOIN loan_paid lp ON lp.loan_id = l.id
WHERE l.status = 'active';
```

### Window functions

13. For each wallet, show every transaction with a running balance.

```sql
SELECT wallet_id, created_at, type, amount,
  SUM(CASE WHEN type = 'credit' THEN amount ELSE -amount END)
    OVER (PARTITION BY wallet_id ORDER BY created_at
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_balance
FROM transactions
ORDER BY wallet_id, created_at;
```

14. Find each vet's single most recent appointment.

```sql
SELECT * FROM (
  SELECT a.*, ROW_NUMBER() OVER (PARTITION BY vet_id ORDER BY scheduled_at DESC) AS rn
  FROM appointments a
) t WHERE rn = 1;
```

15. Rank users by total amount transferred (sent) this month, showing ties correctly.

```sql
SELECT u.full_name, SUM(t.amount) AS total_sent,
  RANK() OVER (ORDER BY SUM(t.amount) DESC) AS rnk
FROM transfers t
JOIN wallets w ON w.id = t.from_wallet_id
JOIN users u ON u.id = w.user_id
WHERE t.status = 'succeeded' AND t.created_at >= DATE_TRUNC('month', NOW())
GROUP BY u.id, u.full_name;
```

### Tricky / classic "gotcha" questions

16. Find duplicate phone numbers among users (data quality check).

```sql
SELECT phone, COUNT(*) FROM users GROUP BY phone HAVING COUNT(*) > 1;
```

17. Find the second highest loan principal.

```sql
SELECT principal FROM (
  SELECT principal, DENSE_RANK() OVER (ORDER BY principal DESC) AS rnk FROM loans
) t WHERE rnk = 2;
```

18. Find consecutive days a user made at least one transfer (a "gaps and islands" style problem, awareness level).

```sql
-- Idea: number each active day sequentially, subtract a row_number to find
-- contiguous groups ("islands") of consecutive dates - a classic pattern
-- worth recognizing by name even if you'd look up exact syntax under pressure.
WITH active_days AS (
  SELECT DISTINCT DATE(t.created_at) AS activity_date, u.id AS user_id
  FROM transfers t
  JOIN wallets w ON w.id = t.from_wallet_id
  JOIN users u ON u.id = w.user_id
),
grouped AS (
  SELECT user_id, activity_date,
    activity_date - (ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY activity_date))::int AS grp
  FROM active_days
)
SELECT user_id, MIN(activity_date) AS streak_start, MAX(activity_date) AS streak_end, COUNT(*) AS streak_len
FROM grouped
GROUP BY user_id, grp
ORDER BY user_id, streak_start;
```

19. Prevent a wallet balance from going negative under concurrent debits, in one atomic statement (no explicit lock needed).

```sql
UPDATE wallets
SET balance = balance - 100
WHERE id = 1 AND balance >= 100;
-- check the affected row count in application code; 0 rows = insufficient funds, reject the transfer
```

20. Write a query that would clearly benefit from a covering index, and state which index.

```sql
SELECT vet_id, scheduled_at, status
FROM appointments
WHERE vet_id = 42 AND scheduled_at >= NOW();
-- Covering index: (vet_id, scheduled_at, status) [MySQL] or
-- (vet_id, scheduled_at) INCLUDE (status) [Postgres]
```

---

## Part C - Rapid-fire concept Q&A (say the answer in one breath)

1. WHERE vs HAVING? -> row filter before grouping vs group filter after.
2. INNER vs LEFT JOIN? -> matched only vs all-left-plus-NULL-fill.
3. Why NOT IN can break with NULLs? -> UNKNOWN comparisons poison the whole list; use NOT EXISTS.
4. COUNT(*) vs COUNT(DISTINCT col)? -> all rows vs unique non-NULL values.
5. What's a B-tree index for? -> O(log n) lookups/range scans instead of full scans.
6. Leftmost-prefix rule? -> composite index usable only via a prefix of its columns, in order.
7. N+1 problem? -> 1 query + N per-row queries for relations; fix with JOIN eager load or batched IN queries.
8. ACID? -> Atomicity, Consistency, Isolation, Durability.
9. Postgres vs MySQL default isolation level? -> Read Committed vs Repeatable Read.
10. Pessimistic vs optimistic locking? -> lock now (high contention) vs check version at write time (low contention).
11. What causes a deadlock, and the fix? -> circular lock wait; consistent lock ordering + short transactions.
12. Why DECIMAL over FLOAT for money? -> exact base-10 representation, no floating-point rounding error.
13. Why an idempotency key on a transfer? -> safe client retries without duplicate money movement.
14. synchronize: true in TypeORM - why avoid in production? -> risk of silent destructive schema changes, no reviewable history.
15. JSONB vs MySQL JSON? -> Postgres JSONB has mature GIN indexing; MySQL JSON usually needs generated columns for indexed queries.

---

## Hands-on drills (do these under time pressure)

- [ ] Design the VetApp schema from scratch on a blank page in 15 minutes, no peeking, then compare to the model above.
- [ ] Design the EasyPay schema from scratch in 15 minutes, including the idempotency key and double-entry transactions idea, before checking the model above.
- [ ] Pick 5 random questions from Part B and write the SQL from memory, then check.
- [ ] Explain the "gaps and islands" pattern by name and what problem shape it solves, even if you can't write it perfectly from memory.
- [ ] Do a full mock: have someone (or yourself, out loud) ask you "design a schema for X" for a domain NOT in this file (e.g. a food delivery app) and apply the same 9-step method from Part A.

---

## Senior red flags / green flags (schema design specific)

### Green flags
- Using DECIMAL for money without being asked.
- Proactively mentioning idempotency for a payment/transfer endpoint.
- Choosing a ledger/transaction-history table over a single mutable balance column, and explaining why.
- Adding indexes based on the queries you just said you'd run, not generically.
- Calling out a deliberate trade-off ("I'd denormalize X here because...") instead of pretending everything is perfectly normalized with no cost.

### Red flags
- Using FLOAT/DOUBLE for currency amounts.
- No unique/idempotency protection on a "create transfer" endpoint.
- Forgetting foreign keys entirely "for simplicity."
- Jumping straight to NoSQL/denormalization for a clearly relational, constraint-heavy domain like payments without justification.
- Not asking any clarifying questions before diving into DDL.

---

## Tie-backs to your experience

- The VetApp schema in this chapter is essentially the real shape of what you built: appointment scheduling, veterinary records, payment processing, all backed by relational tables with foreign keys under NestJS + TypeORM + MySQL.
- The EasyPay schema translates your real product knowledge (QR payments, money transfers, wallet management, loans management, biometric auth) into a backend data model - even if you didn't personally own that schema, you can speak to it with real product context that most candidates faking this domain would not have.
- Payment integration experience (Bank of Georgia on VetApp, Flitt on Wizer) gives you genuine grounding for "how would you model a payment/webhook status update" follow-ups - status fields with a small enum plus a timestamp, updated by a webhook handler that should be idempotent.

---

## Senior-Level Best Practices

### Rapid-fire scenario responses (say these in one breath, cross-chapter)
- "Query does a full table scan on a large table." -> Check EXPLAIN, check leftmost-prefix match, check statistics freshness before adding an index blindly.
- "Two concurrent requests could double-book the same resource." -> A UNIQUE constraint plus catching the violation, or SELECT FOR UPDATE if the check is more complex than uniqueness alone.
- "A report query returns wrong totals after adding a join." -> Suspect fan-out from a one-to-many join before an aggregate; pre-aggregate the many side in a CTE.
- "A NOT IN query mysteriously returns zero rows." -> The subquery likely contains a NULL; switch to NOT EXISTS.
- "Migrating a live table's column with zero downtime." -> Add-new, dual-write, backfill, cutover, remove-old - never a single blocking change.
- "Choosing between Postgres and MySQL for a new project with no strong constraint." -> Lean Postgres for JSONB/arrays/extensibility, but say explicitly you'd defer to team familiarity or an existing system if one exists.
- "Interviewer asks what you'd change about your own model schema if given unlimited time." -> Name a concrete improvement (e.g. a lookup table instead of an ENUM for extensibility, or an explicit audit-log table) rather than claiming the first draft is already perfect.

### Decision framework: picking the right tool live in an interview
When an interviewer says "how would you speed this up / make this safer," run through this order out loud: (1) is the query even hitting an index correctly - check EXPLAIN; (2) is there unnecessary row fan-out from a join before an aggregate; (3) is this a concurrency/locking problem (double-spend, double-booking) rather than a pure query problem; (4) is this a schema/normalization problem (missing ledger table, boolean flag standing in for history); (5) only then consider caching or denormalization. Naming this order out loud, even briefly, is itself a strong senior signal.

### Cross-chapter trade-offs table (good for "compare X and Y" questions)
| Choice A | Choice B | Pick A when | Pick B when |
|---|---|---|---|
| Plain index | Composite index | Single-column filter dominates | Multi-column filter/sort pattern is stable and common |
| Pessimistic lock (FOR UPDATE) | Optimistic lock (version column) | High contention, money/booking | Low contention, general CRUD edits |
| JOIN | Batched `IN` queries | Result set fan-out is small/bounded | Multiple one-to-many relations would multiply row count badly |
| Read Committed | Serializable | Default, most business logic | Rare, complex multi-row invariant a targeted lock can't express |
| Postgres | MySQL | Greenfield, need JSONB/arrays/PostGIS | Existing MySQL system, or team's deep operational MySQL expertise |

### Common production incidents mapped to root cause (good closing material for any track-summary question)
| Symptom | Likely root cause | First check |
|---|---|---|
| Page got slower as a list grew | N+1 queries from a lazy ORM relation in a loop | Query-log the endpoint, count queries per request |
| Report totals doubled after a schema change | Join fan-out before an aggregate | Pre-aggregate the many side in a CTE before joining |
| "Not in this list" filter silently returns nothing | NOT IN against a NULL-containing subquery | Switch to NOT EXISTS |
| Two users booked the same slot | Missing uniqueness constraint, check-then-act race | Add a DB-level UNIQUE constraint, handle the conflict in code |
| Migration took the site down for a minute | Blocking ALTER on a large, hot table | Additive migration pattern, tested against a realistic clone |

### Production checklist for a schema-design interview answer (say it as a checklist, not just SQL)
- [ ] Primary keys and foreign keys on every relationship, stated explicitly, not "for simplicity I'll skip constraints."
- [ ] DECIMAL for money, never FLOAT.
- [ ] A ledger/history table for anything with money or status transitions, not a single mutable column with no audit trail.
- [ ] An idempotency key on any "create a transfer/payment" style endpoint.
- [ ] At least one composite index named for the single most likely hot query.
- [ ] One deliberate trade-off called out unprompted (a denormalization, a chosen isolation level, a partial index) with the reasoning stated.
- [ ] A brief note on how you'd verify the design under real concurrent load, not just that it looks correct on paper.
- [ ] An honest statement of what you'd change if the interviewer said "now imagine this at 100x scale," rather than treating the first draft as final.

### Worked scenario: a live "design + query + defend" combo prompt
**Prompt:** "Design a table for tracking loan repayments, write a query for delinquent loans, and tell me what would break at 100x scale."
1. **Schema first** - `loan_payments(id, loan_id FK, amount DECIMAL, paid_at TIMESTAMP)`, separate from `loans` because repayments are one-to-many and need individual history for reconciliation.
2. **Query second** - delinquency via `NOT EXISTS` against a 30-day window (see chapter 05's Drill 2), narrated as you write it.
3. **Index it** - `loan_payments(loan_id, paid_at)` to make the correlated NOT EXISTS check fast per loan.
4. **Scale question** - at 100x, the `NOT EXISTS` per-loan check over millions of loans nightly might be better served by a materialized/precomputed `last_payment_at` column on `loans`, updated on write, trading a small write-time cost for a much cheaper delinquency scan.
5. **Close the loop** - state explicitly that you'd only introduce that denormalization once the plain query is measured to be a real bottleneck, not preemptively.

### Anti-patterns interviewers are trained to notice
- Silence when asked "what would you check first" - not having a repeatable method is a bigger red flag than getting one detail wrong.
- Jumping straight to "add a cache" before ruling out an indexing or query-shape fix.
- Presenting a schema with zero constraints "to keep it simple" - constraints ARE the design, not decoration.
- Not asking a single clarifying question before writing DDL for an ambiguous prompt.
- Reciting definitions (ACID, normal forms) without ever connecting them to a concrete failure mode or a decision you'd actually make differently as a result.

### Harder senior follow-up Q&A (drill these until fluent)
1. **"Your database CPU is pinned at 100% and the app is timing out. Walk me through your first five minutes."** -> Check currently running queries (`pg_stat_activity` / `SHOW PROCESSLIST`) for anything obviously long-running or blocked; check for a recent deploy correlating with the spike; check if it's one hot query (look at query-level CPU/time stats) versus general load growth; if one query is the culprit, get its EXPLAIN plan immediately rather than guessing; if it's a lock pileup, identify the blocking transaction and decide whether to kill it. State this out loud as an ordered method, not a list of things you'd check in no particular order.
2. **"We need to migrate a 'status' column from a MySQL ENUM to something more flexible, on a live table with millions of rows and constant writes. How?"** -> Add a new column (e.g. a foreign key to a `statuses` lookup table, or a TEXT column with a CHECK constraint), dual-write both columns from the application for a transition period, backfill the new column from the old in batches, cut reads over to the new column, then drop the old column in a later, separate deploy once nothing references it - never a single blocking schema change on a hot table.
3. **"Design a rate-limiting or idempotency-key table for a payments API. What does the schema look like, and what's the tricky part?"** -> A table keyed by the idempotency key (unique constraint) storing the request hash, response payload, and status, with a short TTL/cleanup job. The tricky part is the race between two near-simultaneous requests with the same key: the insert of the key must be atomic (`INSERT ... ON CONFLICT DO NOTHING` / `INSERT ... ON DUPLICATE KEY`) so only one request actually processes the payment while the other waits for or reads the stored result, rather than both checking "does this key exist" and both proceeding.
4. **"How would you detect and fix N+1 queries you don't already know about, in an existing large codebase?"** -> Turn on query logging (or an APM tool) in staging under realistic traffic, look for the same near-identical query repeated many times in a short window, correlate it back to the code path (often a loop over a list calling a lazy relation), and fix with eager loading or batching - then add a regression guard (a test asserting query count for that endpoint) so it doesn't silently come back.
5. **"A teammate wants Serializable isolation everywhere 'to be safe.' How do you respond?"** -> Explain the throughput cost - Serializable transactions can fail with serialization errors under concurrent load and require application-level retry logic, so applying it globally trades a vague sense of safety for a concrete, measurable increase in contention and complexity. Ask what specific anomaly they're worried about, and show that a targeted fix (a lock, a conditional UPDATE, a unique constraint) usually solves the real problem more precisely and cheaply.
6. **"Explain, as if to a new hire, why we always pre-aggregate before joining a one-to-many relationship in a report query."** -> Give the concrete fan-out example: if an order has 3 line items, joining orders to line_items multiplies each order row by 3 before any aggregation happens, so a naive `SUM(orders.total)` after that join overcounts every order threefold. Pre-aggregating the many side (line items summed per order) in a CTE first, then joining that single summarized row per order, avoids the multiplication entirely.
7. **"You're given an ambiguous prompt: 'design a schema for a food delivery app.' What do you ask before writing any DDL?"** -> Clarify scope up front: are restaurants and menus multi-tenant (many restaurants, each with their own menu items)? Can an order span multiple restaurants or just one? Is delivery tracking (driver location history) in scope, or just order status? Is payment a separate concern or part of this schema? A senior candidate spends 60-90 seconds narrowing scope before touching a whiteboard, rather than guessing and re-deriving the schema mid-answer.

---

## Mastery checklist

- [ ] I can design the VetApp schema from memory in under 15 minutes.
- [ ] I can design the EasyPay schema from memory in under 15 minutes, including idempotency and ledger design.
- [ ] I can answer at least 15 of the 20 SQL query bank questions without looking at the answer first.
- [ ] I can rapid-fire answer all 15 concept questions in Part C without hesitation.
- [ ] I can explain 3 deliberate schema design trade-offs I made, unprompted.
