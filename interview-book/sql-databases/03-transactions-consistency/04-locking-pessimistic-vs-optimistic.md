# 04. Locking: pessimistic vs optimistic

> Source: `interview-prep/sql-databases/03-transactions-consistency.md`

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
