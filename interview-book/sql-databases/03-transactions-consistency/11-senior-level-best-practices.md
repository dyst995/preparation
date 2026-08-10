# 11. Senior-Level Best Practices

> Source: `interview-prep/sql-databases/03-transactions-consistency.md`

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
