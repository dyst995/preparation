# 05. Transactions

> Source: `interview-prep/nestjs/05-typeorm-persistence.md`

### Topics to learn
- [ ] ACID basics (brief) and why some multi-step writes must be atomic
- [ ] `QueryRunner` manual transaction pattern (`startTransaction`, `commitTransaction`, `rollbackTransaction`, `release`)
- [ ] `DataSource.transaction(async (manager) => {...})` convenience wrapper
- [ ] Isolation levels (READ COMMITTED, REPEATABLE READ, SERIALIZABLE) - high-level awareness, MySQL default (REPEATABLE READ) vs Postgres default (READ COMMITTED)
- [ ] Deadlocks: causes (inconsistent lock ordering) and mitigation (consistent ordering, retries, shorter transactions)
- [ ] VetApp example: appointment creation + payment authorization must succeed or fail together

### Manual transaction with `QueryRunner`

```typescript
async createAppointmentWithPayment(dto: CreateAppointmentDto): Promise<Appointment> {
  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const appointment = await queryRunner.manager.save(Appointment, {
      vetId: dto.vetId,
      ownerId: dto.ownerId,
      scheduledAt: dto.scheduledAt,
      status: AppointmentStatus.PENDING,
    });

    const payment = await this.paymentGateway.authorize(dto.amount); // external call - see note below
    await queryRunner.manager.save(Payment, {
      appointmentId: appointment.id,
      amount: dto.amount,
      externalRef: payment.id,
      status: 'authorized',
    });

    await queryRunner.commitTransaction();
    return appointment;
  } catch (err) {
    await queryRunner.rollbackTransaction();
    throw err;
  } finally {
    await queryRunner.release();
  }
}
```

**Important nuance interviewers love to probe:** calling an *external* payment gateway (like Bank of Georgia's API) **inside** a DB transaction is a real trade-off - it holds DB locks/connections open for the duration of a network call, which can hurt throughput and risks leaving a transaction open if the external call hangs. A more robust pattern for VetApp-style flows: authorize payment *before* opening the DB transaction (or immediately after, outside it), persist the result, and reconcile any inconsistency (e.g. payment succeeded but DB write failed) via an idempotent background job or webhook rather than relying purely on the DB transaction to cover an external system.

### `DataSource.transaction()` convenience wrapper

```typescript
await this.dataSource.transaction(async (manager) => {
  await manager.save(Appointment, appointmentData);
  await manager.save(Payment, paymentData);
});
// rollback is automatic if the callback throws
```

### Interview questions

**Q: Why not just wrap a payment gateway call and two DB writes all in one transaction?**
> "Because the payment gateway call is a network call to an external system, not something the DB transaction can roll back if it half-fails - and holding a DB transaction open across a slow/hanging external call ties up a connection and locks for that whole duration. I'd rather authorize the payment first (outside or before the transaction), then persist the outcome in a short, fast local transaction, and handle any edge case where the payment succeeded but the local write failed via reconciliation - an idempotent webhook handler or a background job that checks pending payments against the gateway's actual status."

**Q: What causes a deadlock and how do you avoid it?**
> "Two transactions each holding a lock the other needs, in opposite acquisition order - classic case is transaction A locks row 1 then wants row 2, while transaction B locks row 2 then wants row 1. I avoid it by always acquiring locks/updating rows in a consistent order across the codebase (e.g. always by ascending primary key), keeping transactions short, and having the DB layer retry on serialization/deadlock errors where it's safe to do so idempotently."

---
