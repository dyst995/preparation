# 01. ACID

> Source: `interview-prep/sql-databases/03-transactions-consistency.md`

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
