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

## Mastery checklist

- [ ] I can design the VetApp schema from memory in under 15 minutes.
- [ ] I can design the EasyPay schema from memory in under 15 minutes, including idempotency and ledger design.
- [ ] I can answer at least 15 of the 20 SQL query bank questions without looking at the answer first.
- [ ] I can rapid-fire answer all 15 concept questions in Part C without hesitation.
- [ ] I can explain 3 deliberate schema design trade-offs I made, unprompted.
