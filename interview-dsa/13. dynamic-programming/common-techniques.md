# Dynamic Programming — Common techniques

Code you actually write. Why lives in [notes.md](./notes.md).

**Reach for this when:** “number of ways”, “best score on first i items”, two strings (LCS/edit), knapsack/capacity, stock states. First write the **recurrence in words**, then the table.

Loop: brute recursion → memo → bottom-up → squeeze space if they ask.

## 1D — Fibonacci / climb stairs

```ts
function climbStairs(n: number): number {
  if (n <= 2) return n;
  let a = 1, b = 2;
  for (let i = 3; i <= n; i++) [a, b] = [b, a + b];
  return b;
}
```

## 1D — take / skip (house robber)

```ts
function rob(nums: number[]): number {
  let take = 0, skip = 0;
  for (const x of nums) {
    const newTake = skip + x;
    skip = Math.max(take, skip);
    take = newTake;
  }
  return Math.max(take, skip);
}
```

## Kadane is 1-state DP

`cur = max(nums[i], cur + nums[i])` — already in [01](../01. arrays-strings/common-techniques.md).

## LIS

```ts
function lengthOfLIS(nums: number[]): number {
  const dp = new Array(nums.length).fill(1);
  for (let i = 0; i < nums.length; i++)
    for (let j = 0; j < i; j++)
      if (nums[j] < nums[i]) dp[i] = Math.max(dp[i], dp[j] + 1);
  return Math.max(...dp);
}
```

O(n log n): `tails` array + binary search for the first tail ≥ x.

## Grid paths

```ts
function uniquePaths(m: number, n: number): number {
  const dp = Array.from({ length: m }, () => new Array(n).fill(1));
  for (let i = 1; i < m; i++)
    for (let j = 1; j < n; j++)
      dp[i][j] = dp[i - 1][j] + dp[i][j - 1];
  return dp[m - 1][n - 1];
}
```

## Two strings (LCS)

```ts
function longestCommonSubsequence(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
  return dp[m][n];
}
```

Edit distance: if equal, `dp[i-1][j-1]`; else `1 + min(delete, insert, replace)`.

## 0/1 knapsack (subset sum / partition)

```ts
function canPartition(nums: number[]): boolean {
  const sum = nums.reduce((a, b) => a + b, 0);
  if (sum % 2) return false;
  const t = sum / 2;
  const ok = new Array(t + 1).fill(false);
  ok[0] = true;
  for (const x of nums)
    for (let s = t; s >= x; s--) ok[s] ||= ok[s - x]; // walk backward so each item is used once
  return ok[t];
}
```

Unbounded (coin change): inner loop **forward**.

## Stock state machine

Track `hold` / `cash` (and `cooldown` if needed). One pass. Unlimited transactions = greedy sum of positive deltas → [14](../14. greedy/common-techniques.md).

## What to say

“State is ___. Transition is ___. Order of loops is ___ so we don’t reuse a cell too early. Answer is `dp[n]` / `max(dp)`.”
