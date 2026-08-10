# 03. MVCC in one paragraph (why Postgres readers don't block writers)

> Source: `interview-prep/sql-databases/03-transactions-consistency.md`

Postgres (and InnoDB, to a large degree) implements Multi-Version Concurrency Control: instead of readers taking locks that block writers, each transaction sees a consistent "snapshot" of the data as of some point in time, while writers create new row versions rather than overwriting in place. Old row versions are cleaned up later (Postgres's `VACUUM`). This is why, in practice, a long-running SELECT usually does not block an UPDATE on the same rows, and vice versa - a very different mental model from naive "everything takes a lock" thinking, and worth stating explicitly if asked "does a SELECT block a write?"

---
