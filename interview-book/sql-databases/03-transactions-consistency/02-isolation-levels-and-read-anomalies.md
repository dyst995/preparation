# 02. Isolation levels and read anomalies

> Source: `interview-prep/sql-databases/03-transactions-consistency.md`

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
