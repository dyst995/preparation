# 05. Senior red flags / green flags (schema design specific)

> Source: `interview-prep/sql-databases/05-interview-questions.md`

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
