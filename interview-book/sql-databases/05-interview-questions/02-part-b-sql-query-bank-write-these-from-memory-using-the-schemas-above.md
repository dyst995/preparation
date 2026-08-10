# 02. Part B - SQL Query Bank (write these from memory, using the schemas above)

> Source: `interview-prep/sql-databases/05-interview-questions.md`

### Basic

1. List all pets belonging to owner with email `'jane@example.com'`.

```sql
SELECT p.* FROM pets p
JOIN owners o ON o.id = p.owner_id
WHERE o.email = 'jane@example.com';
```

2. Count appointments per status.

```sql
SELECT status, COUNT(*) FROM appointments GROUP BY status;
```

3. List the 5 most recent transfers.

```sql
SELECT * FROM transfers ORDER BY created_at DESC LIMIT 5;
```

### Joins & NULL handling

4. List every vet along with their total completed appointment count, including vets with zero.

```sql
SELECT v.full_name, COUNT(a.id) AS completed_count
FROM vets v
LEFT JOIN appointments a ON a.vet_id = v.id AND a.status = 'completed'
GROUP BY v.id, v.full_name;
```

5. Find users who have never made a transfer.

```sql
SELECT u.* FROM users u
JOIN wallets w ON w.user_id = u.id
WHERE NOT EXISTS (
  SELECT 1 FROM transfers t WHERE t.from_wallet_id = w.id
);
```

6. Find pets that have never had an appointment.

```sql
SELECT p.* FROM pets p
LEFT JOIN appointments a ON a.pet_id = p.id
WHERE a.id IS NULL;
```

### Aggregation & HAVING

7. Find vets who completed more than 10 appointments in the last 30 days.

```sql
SELECT v.full_name, COUNT(*) AS completed
FROM appointments a
JOIN vets v ON v.id = a.vet_id
WHERE a.status = 'completed' AND a.scheduled_at >= NOW() - INTERVAL 30 DAY
GROUP BY v.id, v.full_name
HAVING COUNT(*) > 10;
```

8. Find the total amount transferred per day for the last 7 days.

```sql
SELECT DATE(created_at) AS day, SUM(amount) AS total
FROM transfers
WHERE status = 'succeeded' AND created_at >= NOW() - INTERVAL 7 DAY
GROUP BY DATE(created_at)
ORDER BY day;
```

9. Find wallets with a balance that doesn't match the sum of their transactions (a reconciliation query).

```sql
SELECT w.id, w.balance,
  COALESCE(SUM(CASE WHEN t.type = 'credit' THEN t.amount ELSE -t.amount END), 0) AS computed_balance
FROM wallets w
LEFT JOIN transactions t ON t.wallet_id = w.id
GROUP BY w.id, w.balance
HAVING w.balance <> COALESCE(SUM(CASE WHEN t.type = 'credit' THEN t.amount ELSE -t.amount END), 0);
```

### Subqueries, CTEs, EXISTS

10. Find the owner with the most pets.

```sql
SELECT o.full_name, COUNT(*) AS pet_count
FROM owners o
JOIN pets p ON p.owner_id = o.id
GROUP BY o.id, o.full_name
ORDER BY pet_count DESC
LIMIT 1;
```

11. Find loans that are active but have had no payment in the last 30 days (delinquency check).

```sql
SELECT l.*
FROM loans l
WHERE l.status = 'active'
AND NOT EXISTS (
  SELECT 1 FROM loan_payments lp
  WHERE lp.loan_id = l.id AND lp.paid_at >= NOW() - INTERVAL 30 DAY
);
```

12. Using a CTE, find each user's total outstanding loan principal minus payments made.

```sql
WITH loan_paid AS (
  SELECT loan_id, SUM(amount) AS total_paid
  FROM loan_payments
  GROUP BY loan_id
)
SELECT u.full_name, l.id AS loan_id,
  l.principal - COALESCE(lp.total_paid, 0) AS outstanding
FROM loans l
JOIN users u ON u.id = l.user_id
LEFT JOIN loan_paid lp ON lp.loan_id = l.id
WHERE l.status = 'active';
```

### Window functions

13. For each wallet, show every transaction with a running balance.

```sql
SELECT wallet_id, created_at, type, amount,
  SUM(CASE WHEN type = 'credit' THEN amount ELSE -amount END)
    OVER (PARTITION BY wallet_id ORDER BY created_at
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_balance
FROM transactions
ORDER BY wallet_id, created_at;
```

14. Find each vet's single most recent appointment.

```sql
SELECT * FROM (
  SELECT a.*, ROW_NUMBER() OVER (PARTITION BY vet_id ORDER BY scheduled_at DESC) AS rn
  FROM appointments a
) t WHERE rn = 1;
```

15. Rank users by total amount transferred (sent) this month, showing ties correctly.

```sql
SELECT u.full_name, SUM(t.amount) AS total_sent,
  RANK() OVER (ORDER BY SUM(t.amount) DESC) AS rnk
FROM transfers t
JOIN wallets w ON w.id = t.from_wallet_id
JOIN users u ON u.id = w.user_id
WHERE t.status = 'succeeded' AND t.created_at >= DATE_TRUNC('month', NOW())
GROUP BY u.id, u.full_name;
```

### Tricky / classic "gotcha" questions

16. Find duplicate phone numbers among users (data quality check).

```sql
SELECT phone, COUNT(*) FROM users GROUP BY phone HAVING COUNT(*) > 1;
```

17. Find the second highest loan principal.

```sql
SELECT principal FROM (
  SELECT principal, DENSE_RANK() OVER (ORDER BY principal DESC) AS rnk FROM loans
) t WHERE rnk = 2;
```

18. Find consecutive days a user made at least one transfer (a "gaps and islands" style problem, awareness level).

```sql
-- Idea: number each active day sequentially, subtract a row_number to find
-- contiguous groups ("islands") of consecutive dates - a classic pattern
-- worth recognizing by name even if you'd look up exact syntax under pressure.
WITH active_days AS (
  SELECT DISTINCT DATE(t.created_at) AS activity_date, u.id AS user_id
  FROM transfers t
  JOIN wallets w ON w.id = t.from_wallet_id
  JOIN users u ON u.id = w.user_id
),
grouped AS (
  SELECT user_id, activity_date,
    activity_date - (ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY activity_date))::int AS grp
  FROM active_days
)
SELECT user_id, MIN(activity_date) AS streak_start, MAX(activity_date) AS streak_end, COUNT(*) AS streak_len
FROM grouped
GROUP BY user_id, grp
ORDER BY user_id, streak_start;
```

19. Prevent a wallet balance from going negative under concurrent debits, in one atomic statement (no explicit lock needed).

```sql
UPDATE wallets
SET balance = balance - 100
WHERE id = 1 AND balance >= 100;
-- check the affected row count in application code; 0 rows = insufficient funds, reject the transfer
```

20. Write a query that would clearly benefit from a covering index, and state which index.

```sql
SELECT vet_id, scheduled_at, status
FROM appointments
WHERE vet_id = 42 AND scheduled_at >= NOW();
-- Covering index: (vet_id, scheduled_at, status) [MySQL] or
-- (vet_id, scheduled_at) INCLUDE (status) [Postgres]
```

---
