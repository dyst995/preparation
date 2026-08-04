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

## Mastery checklist

- [ ] I can explain ACID with a concrete money-movement example.
- [ ] I can name all three read anomalies and the isolation levels that prevent each.
- [ ] I know Postgres's and MySQL's default isolation levels cold.
- [ ] I can explain pessimistic vs optimistic locking and pick the right one for a scenario.
- [ ] I can describe a deadlock and two ways to prevent one.
- [ ] I can write a correct TypeORM transaction with proper rollback handling.
