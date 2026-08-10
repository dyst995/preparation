# 06. Transactions in TypeORM: two patterns

> Source: `interview-prep/sql-databases/03-transactions-consistency.md`

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
