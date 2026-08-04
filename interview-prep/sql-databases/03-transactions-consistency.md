03 - Transactions & Consistency

Goal: Explain ACID properties, isolation levels, locking, and deadlocks with enough precision to survive senior follow-ups, and connect them to real code you'd write with TypeORM around payments and appointment booking - domains where getting this wrong causes real money or scheduling bugs.

Mark progress with [x] as you master each topic.

---

Learning objectives

By the end of this chapter you should be able to:

1. Explain ACID (Atomicity, Consistency, Isolation, Durability) with a concrete example for each.
2. Name the four standard isolation levels and the anomaly each one prevents or allows.
3. Explain dirty reads, non-repeatable reads, and phantom reads with examples.
4. State the default isolation level for Postgres and for MySQL/InnoDB, and how MySQL's default differs in behavior from the SQL standard's expectation.
5. Explain pessimistic vs optimistic locking and when to use each.
6. Explain what a deadlock is, why it happens, and how databases resolve it.
7. Write a transaction using TypeORM (QueryRunner-based and decorator/manager-based) correctly, including rollback on error.

---

## 1. ACID

### Topics to learn
- [ ] Atomicity - all or nothing
- [ ] Consistency - valid state to valid state (constraints hold)
- [ ] Isolation - concurrent transactions don't corrupt each other's view
- [ ] Durability - once committed, survives a crash

### Definitions with a payments example (ties to EasyPay/VetApp)

Imagine transferring money between two wallets: debit wallet A, credit wallet B.

| Property | What it guarantees | If violated |
|---|---|---|
| **Atomicity** | Both the debit and the credit happen, or neither does | Money vanishes (debited but never credited) if the process crashes mid-way without atomicity |
| **Consistency** | Database-level constraints (foreign keys, checks, e.g. balance >= 0) still hold after the transaction | A negative balance could be written if a CHECK constraint was skipped |
| **Isolation** | A concurrent transaction reading wallet A's balance doesn't see a half-finished transfer | Another request could read a stale or partially-updated balance and make a bad decision (e.g. approve a second withdrawal that shouldn't be allowed) |
| **Durability** | Once you get a "success" response, the transfer survives a server crash/power loss | You tell the user "payment successful" and then lose the record on a crash |

### Model spoken answer

"ACID is the contract a transaction gives you. Atomicity means a multi-step operation, like debiting one wallet and crediting another, either fully happens or fully doesn't - no half-done transfers. Consistency means the database's constraints, like a balance never going negative, still hold before and after. Isolation controls what concurrent transactions can see of each other's in-progress changes. Durability means once the database says committed, it survives a crash. I think about all four whenever I'm touching money movement or anything with strict business invariants."

---

## 2. Isolation levels and read anomalies

### Topics to learn
- [ ] Dirty read
- [ ] Non-repeatable read
- [ ] Phantom read
- [ ] Read Uncommitted
- [ ] Read Committed
- [ ] Repeatable Read
- [ ] Serializable
- [ ] Default isolation level: Postgres = Read Committed; MySQL/InnoDB = Repeatable Read
- [ ] MDVCC / snapshot-based isolation (Postgres uses MVCC to implement Read Committed/Repeatable Read without blocking readers)

### The three classic anomalies

| Anomaly | What happens | Example |
|---|---|---|
| **Dirty read** | Transaction A reads data that transaction B has written but not yet committed. If B rolls back, A read data that "never existed." | A reads a wallet balance mid-transfer before B commits or rolls back |
| **Non-repeatable read** | Transaction A reads the same row twice and gets different values because B committed an update in between. | A reads appointment status as 'pending', then reads it again later in the same transaction and it's now 'cancelled' because B committed a change |
| **Phantom read** | Transaction A re-runs the same range query twice and gets a different set of rows because B inserted/deleted matching rows in between. | A counts appointments for tomorrow, B inserts a new one and commits, A re-counts and gets a different total within the "same" transaction |

### Isolation level table

| Level | Dirty read | Non-repeatable read | Phantom read |
|---|---|---|---|
| Read Uncommitted | Possible | Possible | Possible |
| Read Committed | Prevented | Possible | Possible |
| Repeatable Read | Prevented | Prevented | Possible (standard SQL); in practice, Postgres's Repeatable Read also prevents phantoms via MVCC snapshots |
| Serializable | Prevented | Prevented | Prevented |

Note the asterisk: the SQL standard's table says Repeatable Read can still allow phantoms, but Postgres's actual implementation of Repeatable Read (snapshot isolation via MVCC) prevents phantoms too, going beyond the standard's minimum guarantee for that level. MySQL/InnoDB's Repeatable Read also largely prevents phantoms for locking reads via next-key locking, though plain non-locking reads rely on its own snapshot mechanism. This nuance ("the standard defines minimums, real engines often do more") is a great thing to mention if asked.

### Default isolation levels - a very common interview question

- **PostgreSQL default: Read Committed.**
- **MySQL (InnoDB) default: Repeatable Read.**

This is a genuinely useful, concrete fact to have memorized cold, since "what's the default isolation level in X" is asked very literally in interviews.

### Model spoken answer

"There are three classic anomalies: dirty reads, where you see uncommitted data that might get rolled back; non-repeatable reads, where re-reading the same row within a transaction gives a different value because someone else committed a change; and phantom reads, where re-running the same range query returns a different set of rows. The four standard isolation levels - Read Uncommitted, Read Committed, Repeatable Read, Serializable - progressively prevent more of these, at the cost of more locking or more transaction retries. Postgres defaults to Read Committed; MySQL's InnoDB defaults to Repeatable Read. I choose a stricter level only when the business logic actually needs it, because stricter isolation generally means more contention or more retried transactions."

---

## 3. MVCC in one paragraph (why Postgres readers don't block writers)

Postgres (and InnoDB, to a large degree) implements Multi-Version Concurrency Control: instead of readers taking locks that block writers, each transaction sees a consistent "snapshot" of the data as of some point in time, while writers create new row versions rather than overwriting in place. Old row versions are cleaned up later (Postgres's `VACUUM`). This is why, in practice, a long-running SELECT usually does not block an UPDATE on the same rows, and vice versa - a very different mental model from naive "everything takes a lock" thinking, and worth stating explicitly if asked "does a SELECT block a write?"

---

## 4. Locking: pessimistic vs optimistic

### Topics to learn
- [ ] Row-level locks (`SELECT ... FOR UPDATE`, `SELECT ... FOR SHARE`)
- [ ] Pessimistic locking - lock now, assume conflict is likely
- [ ] Optimistic locking - assume conflict is rare, check a version column at write time
- [ ] Table-level locks (rare in app code, more common for schema migrations)
- [ ] Advisory locks (Postgres) - application-level locks, high-level awareness

### Pessimistic locking example

"Prevent two concurrent requests from double-spending the same wallet balance."

```sql
BEGIN;
SELECT balance FROM wallets WHERE id = 1 FOR UPDATE; -- locks this row until COMMIT/ROLLBACK
-- application checks balance >= amount, then:
UPDATE wallets SET balance = balance - 100 WHERE id = 1;
COMMIT;
```

`FOR UPDATE` locks the selected row(s), so any other transaction trying to `SELECT ... FOR UPDATE` (or write) the same row must wait until this transaction commits or rolls back. This directly prevents a race where two concurrent withdrawal requests both read balance = 500 and both proceed, overdrawing the wallet.

### TypeORM equivalent

```typescript
await dataSource.transaction(async (manager) => {
  const wallet = await manager.findOne(Wallet, {
    where: { id: walletId },
    lock: { mode: 'pessimistic_write' }, // emits SELECT ... FOR UPDATE
  });

  if (wallet.balance < amount) {
    throw new Error('Insufficient balance');
  }

  wallet.balance -= amount;
  await manager.save(wallet);
});
```

### Optimistic locking example

Instead of locking rows up front, add a `version` column and check it at write time - fail and retry if someone else changed the row first.

```sql
UPDATE appointments
SET status = 'confirmed', version = version + 1
WHERE id = 10 AND version = 3; -- fails to match (0 rows updated) if someone else already updated it
```

If the `UPDATE` affects 0 rows, the application knows a concurrent update happened and can retry, merge, or surface a conflict to the user.

```typescript
@Entity()
class Appointment {
  @VersionColumn()
  version: number; // TypeORM automatically increments and checks this on save
}
```

TypeORM's `@VersionColumn()` implements optimistic locking automatically: it throws `OptimisticLockVersionMismatchError` if the row was changed since it was loaded.

### When to use which

| | Pessimistic | Optimistic |
|---|---|---|
| Best when | Conflicts are frequent / cost of retry is high (e.g. money movement) | Conflicts are rare (e.g. editing a profile, most collaborative editing scenarios) |
| Cost | Locks reduce concurrency, risk of contention/deadlock | No locks held, but requires retry logic on conflict |
| Example use case | Wallet balance debit, seat/slot booking | Updating an appointment's notes field, user profile edits |

### Model spoken answer

"For money movement or booking a limited resource - like a wallet balance or an appointment slot - I use pessimistic locking with SELECT FOR UPDATE, because conflicts are likely and correctness matters more than raw throughput. For lower-contention updates, like editing an appointment's notes, I'd rather use optimistic locking with a version column, since most of the time there's no conflict at all, and I only pay the retry cost on the rare occasion two people update the same row simultaneously."

---

## 5. Deadlocks

### Topics to learn
- [ ] What a deadlock is: two transactions each hold a lock the other needs
- [ ] Why lock ordering matters
- [ ] How databases detect and resolve deadlocks (kill one transaction, return an error to retry)
- [ ] How to avoid them: consistent lock ordering, shorter transactions, lower isolation when safe

### Classic deadlock example

```
Transaction A: locks wallet 1, then tries to lock wallet 2
Transaction B: locks wallet 2, then tries to lock wallet 1
```

Both wait forever for each other - a deadlock. The database detects this cycle and aborts one transaction (returning a deadlock error), letting the other proceed. The aborted transaction's application code should catch this and retry.

### How to avoid deadlocks in code

- **Always lock resources in a consistent global order** (e.g. always lock the wallet with the smaller ID first) so two transactions can never form a lock cycle.
- **Keep transactions short** - lock, do the minimal necessary work, commit quickly; don't do slow network calls or unrelated work while holding a lock.
- **Catch deadlock errors and retry** with backoff - treat them as an expected, recoverable condition in high-concurrency code, not a fatal bug.

```typescript
// Consistent lock ordering example for a transfer between two wallets
const [firstId, secondId] = [walletAId, walletBId].sort((a, b) => a - b);

await dataSource.transaction(async (manager) => {
  const first = await manager.findOne(Wallet, { where: { id: firstId }, lock: { mode: 'pessimistic_write' } });
  const second = await manager.findOne(Wallet, { where: { id: secondId }, lock: { mode: 'pessimistic_write' } });
  // proceed with transfer logic using `first`/`second` mapped back to A/B
});
```

### Model spoken answer

"A deadlock happens when two transactions each hold a lock the other one needs, so neither can proceed. The database detects the cycle and kills one transaction with a deadlock error so the other can continue. I avoid deadlocks by always locking resources in a consistent order - for example, always locking the lower ID wallet first in a transfer - and by keeping transactions short so locks aren't held any longer than necessary. I also treat a deadlock error in application code as expected and retryable, not as a bug to panic over."

---

## 6. Transactions in TypeORM: two patterns

### Pattern 1: `DataSource.transaction()` (simplest, recommended default)

```typescript
await dataSource.transaction(async (manager) => {
  const wallet = await manager.findOne(Wallet, { where: { id: walletId } });
  wallet.balance -= amount;
  await manager.save(wallet);

  const txn = manager.create(Transaction, { walletId, amount, type: 'debit' });
  await manager.save(txn);

  // if any line above throws, the whole callback's changes are rolled back automatically
});
```

Everything done through `manager` inside the callback runs in the same transaction. If the callback throws, TypeORM automatically rolls back; if it resolves, TypeORM commits.

### Pattern 2: `QueryRunner` (manual control, needed for more complex flows)

```typescript
const queryRunner = dataSource.createQueryRunner();
await queryRunner.connect();
await queryRunner.startTransaction();

try {
  const wallet = await queryRunner.manager.findOne(Wallet, { where: { id: walletId } });
  wallet.balance -= amount;
  await queryRunner.manager.save(wallet);

  await queryRunner.commitTransaction();
} catch (err) {
  await queryRunner.rollbackTransaction();
  throw err;
} finally {
  await queryRunner.release(); // always release the connection back to the pool
}
```

Use `QueryRunner` when you need transaction control across multiple service methods/calls that can't be neatly wrapped in one callback, or when you need fine-grained control (e.g. savepoints).

### Model spoken answer

"For most cases I use `dataSource.transaction()` with a callback - TypeORM commits automatically on success and rolls back automatically if anything throws, which keeps the code simple and safe by default. When I need transaction control spread across multiple functions or need explicit commit/rollback timing, I use QueryRunner directly, always wrapping it in try/catch/finally so the connection gets released back to the pool even on failure."

---

## Interview question bank (with answer targets)

1. **What does ACID stand for? Give an example of each with a payments scenario.** -> see section 1.
2. **What is a dirty read? A non-repeatable read? A phantom read?** -> uncommitted data seen; same row changes between reads; same range query returns different rows.
3. **What is Postgres's default isolation level? MySQL's?** -> Read Committed; Repeatable Read.
4. **Does a SELECT block a concurrent UPDATE in Postgres?** -> generally no, due to MVCC snapshot isolation - readers don't block writers and vice versa in the common case.
5. **Pessimistic vs optimistic locking - when would you use each?** -> pessimistic for high-contention/high-stakes resources (money, booking slots); optimistic for low-contention edits (profile fields).
6. **How would you prevent double-spending a wallet balance under concurrent requests?** -> SELECT ... FOR UPDATE inside a transaction, or an atomic conditional UPDATE (`UPDATE wallets SET balance = balance - :amt WHERE id = :id AND balance >= :amt`).
7. **What is a deadlock, and how do databases resolve it?** -> circular lock wait; the database detects the cycle and aborts one transaction, which the application should catch and retry.
8. **How do you avoid deadlocks proactively?** -> consistent lock ordering across resources, short transactions, retry logic.
9. **How do you implement optimistic locking in TypeORM?** -> `@VersionColumn()`, catch `OptimisticLockVersionMismatchError` and retry/report conflict.
10. **What happens if an exception is thrown inside `dataSource.transaction(async manager => {...})`?** -> TypeORM automatically rolls back the transaction and rethrows.

---

## Hands-on drills (do these)

- [ ] Explain ACID out loud using the wallet transfer example, without notes.
- [ ] Write the SQL for an atomic, race-safe balance debit that doesn't even need `FOR UPDATE` (hint: conditional UPDATE with balance check in the WHERE clause) - and explain why this is sometimes even better than SELECT FOR UPDATE for simple cases.
- [ ] Write a TypeORM `dataSource.transaction()` block for creating an appointment plus its initial payment record atomically.
- [ ] Describe, from memory, the deadlock scenario between two wallet transfers going in opposite directions, and the fix.
- [ ] State Postgres's and MySQL's default isolation levels without looking them up.

---

## Senior red flags / green flags

### Green flags
- Giving a concrete example (money, booking) instead of reciting definitions.
- Knowing the two engines' default isolation levels cold.
- Mentioning MVCC when asked "does a read block a write."
- Proposing lock ordering as a deadlock-prevention strategy, not just "catch and retry."
- Knowing that a simple conditional UPDATE can sometimes replace SELECT FOR UPDATE entirely for a balance check.

### Red flags
- Confusing isolation levels with locking mechanisms as if they're the same thing.
- Not knowing what a phantom read is.
- Treating "just wrap it in a transaction" as sufficient without discussing concurrency/locking for a money scenario.
- Panicking about deadlocks instead of describing them as an expected, handleable condition at scale.

---

## Tie-backs to your experience

- VetApp's payment processing (Bank of Georgia integration) is exactly the kind of feature where atomicity and isolation matter: recording a payment and updating an appointment/invoice status need to happen together, and you should be ready to describe how you'd wrap that in a transaction.
- Background jobs for asynchronous processing (also on VetApp) often need idempotency and careful transaction boundaries - a natural follow-up question is "what if the job runs twice," which ties directly into designing safe, transactional writes.
- EasyPay's wallet management, money transfers, and loans management are the canonical "concurrency and correctness matter" domain - you can speak to this even if the backend wasn't yours directly, by reasoning about how you'd build the API safely from the client side (e.g. idempotency keys on transfer requests) and from a backend design perspective.

---

## Senior-Level Best Practices

### Rapid-fire scenario responses (say these in one breath)
- "Two withdrawal requests hit the same wallet within milliseconds." -> Atomic conditional UPDATE or SELECT FOR UPDATE inside a transaction; never check-then-write unprotected.
- "A transfer needs to lock two different wallets." -> Lock both in a consistent, deterministic order (e.g. lower id first) to avoid a deadlock cycle.
- "A payment webhook might be delivered twice by the provider." -> Unique constraint on the provider's event id, idempotent handler, second delivery no-ops.
- "A report needs a consistent snapshot across five queries in the same request." -> Wrap them in one transaction so all five see the same MVCC snapshot, rather than five independent reads that could each see a different point in time.
- "An application-level retry loop keeps hitting deadlock errors." -> Expected and handleable; confirm consistent lock ordering across all code paths that touch the same resources, not just the one that's failing.

### Decision framework: choosing an isolation level and locking strategy
- Default to the database's default (Read Committed in Postgres, Repeatable Read in MySQL/InnoDB) unless a specific anomaly is a real business risk - stricter isolation isn't free, it means more blocking or more transaction retries under contention.
- Ask: "if two of these ran at the exact same millisecond, what's the worst thing that could happen?" If the answer touches money, inventory, or a limited resource (a slot, a seat), lean toward pessimistic locking (`SELECT ... FOR UPDATE`) or an atomic conditional UPDATE rather than raising the isolation level globally.
- Prefer a narrowly-scoped fix (lock one row, or use a conditional UPDATE) over a blanket Serializable isolation level, which can cause serialization-failure errors application code must be ready to retry, and generally hurts throughput more than a well-placed row lock.
- When in doubt between two options, prototype the concurrent-load test rather than debating it in the abstract - a quick script firing N concurrent requests settles most "which locking approach do we need" arguments faster than a meeting.
- Reserve Serializable for genuinely complex multi-row invariants that a single conditional UPDATE or FOR UPDATE can't express cleanly (e.g. an invariant spanning several tables checked at commit time).

### Production checklist for money/ledger code
- [ ] Every balance-affecting write is inside a transaction that also writes an immutable ledger row (debit/credit) - never mutate a balance column as the only record of what happened.
- [ ] Balance decrements use either `SELECT ... FOR UPDATE` before checking/updating, or a single atomic conditional UPDATE (`WHERE balance >= amount`) - never a read-then-write in application code without a lock.
- [ ] Every money-moving API endpoint accepts and enforces an idempotency key, so client retries after a timeout can't double-charge or double-transfer.
- [ ] Multi-resource locking (e.g. transferring between two wallets) always locks in a consistent, deterministic order (e.g. lower id first) to prevent deadlocks.
- [ ] A periodic reconciliation job recomputes balances from the ledger and alerts on any drift - the ledger is the source of truth, the cached balance column is a performance optimization, not the other way around.
- [ ] Deadlock errors are caught and retried with backoff in application code, logged with enough context (which rows/resources) to spot a systemic ordering bug, not just silently swallowed.
- [ ] Any code path with a "read then conditionally write" shape on a shared resource has been reviewed specifically for the race window between the read and the write.
- [ ] Transaction boundaries are documented for any flow spanning multiple service methods, so it's clear from reading the code where a transaction starts and ends, not inferred from context.

### Worked scenario: designing a "book an appointment slot" flow safely
1. **Identify the invariant** - two patients must never be booked into the same vet/timeslot; this is a uniqueness constraint under concurrency, not just an application-level check.
2. **Enforce it at the database level first** - a UNIQUE constraint on `(vet_id, scheduled_at)` means even a buggy or racy application layer can't create a double-booking; the database is the last line of defense, not the only one.
3. **Handle the race in application code** - attempt the INSERT, catch the unique-violation error, and return a friendly "slot no longer available" response rather than pre-checking availability and then inserting (check-then-act is exactly the race window that causes double bookings).
4. **Decide on retry/alternative-suggestion UX** - if the slot is taken, suggest the next available slot rather than just failing, since the constraint caught a real race, not a client bug.
5. **State the trade-off out loud**: this design intentionally lets the database reject a rare conflict rather than pessimistically locking a "slot availability" table for every booking attempt, since conflicts are rare and a hard constraint is simpler and just as correct.

### Anti-patterns and failure modes
| Anti-pattern | Failure mode | Fix |
|---|---|---|
| Read balance, check in app code, write balance (no lock) | Race condition: two concurrent debits both read the same balance and both succeed, overdrawing | `SELECT ... FOR UPDATE` or atomic conditional UPDATE |
| No idempotency key on a payment/transfer endpoint | Client retry on timeout causes a duplicate charge/transfer | Idempotency key unique constraint, checked before processing |
| Locking resources in inconsistent order across code paths | Deadlocks that only appear under real concurrent load, hard to reproduce locally | Always lock in a single, deterministic global order |
| Holding a transaction open across a slow external call (payment gateway, email send) | Long-held locks block unrelated requests, timeouts cascade | Do the external call outside the transaction; use a saga/outbox pattern |
| Treating `balance` column as the only source of truth | Any missed write or bug silently corrupts money with no audit trail | Ledger-first design; balance is derived/cached |

### Common production incidents mapped to root cause
| Symptom | Likely root cause | First check |
|---|---|---|
| Wallet balance briefly negative under load | Missing lock/atomic UPDATE on debit | Confirm whether debits use FOR UPDATE or a conditional UPDATE |
| Sudden spike in deadlock errors | Inconsistent lock ordering introduced by a new code path | Grep for all places that lock more than one resource, check ordering |
| Duplicate transfer for one user action | Missing or unchecked idempotency key | Confirm the endpoint enforces a unique constraint on the key |
| Reconciliation job reports growing drift | A code path bypasses the transactional debit/credit pattern | Audit every write path that touches `balance` directly |
| Long transaction holding locks for seconds | An external API call left inside the DB transaction | Move the external call outside the transaction boundary |

### Observability for transactional correctness
- Track deadlock rate over time (`SHOW ENGINE INNODB STATUS` deadlock section in MySQL, `pg_stat_database.deadlocks` in Postgres) - a rising trend under flat traffic is a real signal, not noise.
- Alert on reconciliation job drift (ledger sum vs cached balance) above a small threshold - this is often the earliest signal of a real correctness bug, well before a customer complaint.
- Track transaction duration distribution - a long tail of slow transactions is exactly what causes lock contention and deadlocks under load, so this metric is a leading indicator, not just a curiosity.
- Log every idempotency-key collision (a legitimate retry being deduplicated) - a sudden spike suggests upstream client/network issues, not a database problem, but you'll only know if you're watching for it.

### Scalability and team practices
- Keep the "critical section" (the code between BEGIN and COMMIT) as small as possible - do validation and non-DB work before opening the transaction, not inside it.
- Document the locking order convention for multi-resource operations somewhere the whole team can find it (a README or ADR), since a new engineer unaware of the convention is exactly how deadlock bugs get reintroduced.
- Load-test money-movement endpoints specifically for concurrency correctness (e.g. fire N concurrent debit requests against a small balance and assert the final balance is never negative and the row count matches), not just for raw throughput.
- Treat "what happens if this job/request runs twice" as a mandatory question in design review for anything touching money, not an edge case to consider later.

### Senior follow-up Q&A
1. **Why might you choose an atomic conditional UPDATE over SELECT ... FOR UPDATE for a simple balance debit?** -> A conditional UPDATE (`UPDATE wallets SET balance = balance - :amt WHERE id = :id AND balance >= :amt`) does the check-and-write in one round trip and one implicit lock, with no window between reading and writing where another transaction could interleave, and no need to hold an explicit lock across multiple statements. FOR UPDATE is still needed when the business logic between the read and the write is too complex to express in a single UPDATE's WHERE clause.
2. **How would you design a webhook handler for a payment provider (e.g. Bank of Georgia, Flitt) to be safe against duplicate delivery?** -> Store the provider's event/transaction id with a unique constraint, check-and-insert that id before processing any side effects, and make the whole handler idempotent - if the same webhook arrives twice, the second attempt should detect the existing record and no-op rather than re-applying the payment.
3. **Two services need to debit a wallet and call an external fraud-check API as part of the same "transaction." How do you structure this without holding a DB lock across the external call?** -> Don't hold the DB transaction open across the external call. Either do the fraud check first (outside any DB transaction) and then perform the debit in a short, separate transaction, or use an outbox/saga pattern: record the intent transactionally, commit, then process the external call asynchronously and update status in a second transaction - never block a row lock on network latency to a third party.
4. **What's a realistic way to catch a `balance` column drifting from the transaction ledger before a customer notices?** -> A scheduled reconciliation job that recomputes each wallet's balance from summed ledger entries, compares against the cached `balance` column, and alerts (not just logs) on any mismatch above a tiny rounding tolerance - run frequently enough that drift is caught in hours, not months.
5. **Under Postgres's default Read Committed isolation, can a SELECT followed by an UPDATE in the same transaction still race with another transaction?** -> Yes - Read Committed re-reads a fresh snapshot for each statement, so a plain SELECT then UPDATE (without FOR UPDATE) can act on stale data if another transaction committed a change in between. This is exactly why the debit logic needs either FOR UPDATE or a single atomic conditional UPDATE, not "check then act" as two separate unprotected statements.
6. **How do you explain to a non-technical stakeholder why "just add more isolation" isn't a free fix for a concurrency bug?** -> Frame it in terms of throughput: stricter isolation levels mean more transactions wait on each other or get aborted and retried under concurrent load, which shows up as slower response times or failed requests at peak traffic - the fix needs to be scoped precisely (lock the specific resource, not the whole system) rather than turned into a blunt global setting.
7. **Why prefer a UNIQUE constraint over an application-level "check if taken, then book" flow for a limited resource like an appointment slot?** -> A UNIQUE constraint is enforced atomically by the database regardless of how many concurrent requests race to insert - there's no window where two requests can both pass a check before either commits. An application-level check-then-act has exactly that window, and it's a load-dependent bug: fine in testing with one user, broken under real concurrent traffic.

---

## Mastery checklist

- [ ] I can explain ACID with a concrete money-movement example.
- [ ] I can name all three read anomalies and the isolation levels that prevent each.
- [ ] I know Postgres's and MySQL's default isolation levels cold.
- [ ] I can explain pessimistic vs optimistic locking and pick the right one for a scenario.
- [ ] I can describe a deadlock and two ways to prevent one.
- [ ] I can write a correct TypeORM transaction with proper rollback handling.
