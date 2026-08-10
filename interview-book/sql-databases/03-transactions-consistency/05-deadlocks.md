# 05. Deadlocks

> Source: `interview-prep/sql-databases/03-transactions-consistency.md`

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
