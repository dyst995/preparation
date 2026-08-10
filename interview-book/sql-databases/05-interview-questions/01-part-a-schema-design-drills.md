# 01. Part A - Schema Design Drills

> Source: `interview-prep/sql-databases/05-interview-questions.md`

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
