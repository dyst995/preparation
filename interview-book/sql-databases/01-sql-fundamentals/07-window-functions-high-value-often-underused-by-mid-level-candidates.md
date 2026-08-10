# 07. Window functions (high-value, often underused by mid-level candidates)

> Source: `interview-prep/sql-databases/01-sql-fundamentals.md`

### Topics to learn
- [ ] `OVER (PARTITION BY ... ORDER BY ...)`
- [ ] ROW_NUMBER() vs RANK() vs DENSE_RANK()
- [ ] LAG() / LEAD() for comparing to previous/next row
- [ ] Running totals with SUM() OVER (...)
- [ ] "Top N per group" pattern

### Why window functions matter here

Window functions let you compute aggregates without collapsing rows - each input row stays, but gets an extra computed column. This is the cleanest way to answer "top N per group" and "running total" questions that a GROUP BY alone cannot express in one pass.

### Top N per group example

"Find each vet's 3 most recent appointments."

```sql
SELECT *
FROM (
  SELECT a.*,
    ROW_NUMBER() OVER (PARTITION BY a.vet_id ORDER BY a.scheduled_at DESC) AS rn
  FROM appointments a
) ranked
WHERE rn <= 3;
```

`PARTITION BY vet_id` restarts the numbering for each vet; `ORDER BY scheduled_at DESC` numbers the newest appointment 1 within each vet's partition.

### RANK vs DENSE_RANK vs ROW_NUMBER

| Function | Ties behavior | Example ranks for [100, 90, 90, 80] |
|---|---|---|
| ROW_NUMBER() | always unique, arbitrary tie-break | 1, 2, 3, 4 |
| RANK() | ties share rank, gap after | 1, 2, 2, 4 |
| DENSE_RANK() | ties share rank, no gap | 1, 2, 2, 3 |

### Running total example

"Show each wallet's transactions with a running balance."

```sql
SELECT wallet_id, created_at, amount,
  SUM(amount) OVER (PARTITION BY wallet_id ORDER BY created_at
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_balance
FROM transactions
ORDER BY wallet_id, created_at;
```

### Model spoken answer

"When I need 'top N per group' or a running total without collapsing rows, I reach for window functions - ROW_NUMBER with PARTITION BY for top-N-per-group, and SUM() OVER (... ORDER BY ...) for running totals. Compared to a self-join or correlated subquery, they're usually more readable and let the engine compute everything in one pass."

---
