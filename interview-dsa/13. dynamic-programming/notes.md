# 13. Dynamic Programming

## Overview

Dynamic Programming (DP) solves problems by breaking them into overlapping
subproblems, solving each subproblem once, and reusing the result. It is the
single most feared topic in interviews, but it always reduces to answering
five questions:

1. What does a "state" represent? (usually an index, or a pair of indices,
   or a remaining capacity/target)
2. What is the recurrence -- how do I compute `dp[state]` from smaller
   states?
3. What are the base cases?
4. What order do I fill states in (so dependencies are ready)?
5. Where is the final answer stored?

DP is recursion with memory. If you can write a correct (even if slow)
recursive brute force, you can almost always turn it into DP by adding a
memo (top-down) or by inverting it into an iterative table fill
(bottom-up).

## When to Suspect DP

- The problem asks for the number of ways to do something.
- The problem asks for the min/max value achievable under constraints.
- The problem asks "can we reach/partition/form X" (yes/no reachability).
- Brute force is naturally recursive with repeated subproblems (you can draw
  a recursion tree with duplicate nodes).
- Constraints are small-to-medium (n <= few thousand, or n*capacity <= ~1e7),
  hinting an O(n^2) or O(n * target) table is intended.

## The Universal DP Framework

```text
1. Define dp[...] in plain English first, e.g.:
     "dp[i] = length of the longest increasing subsequence ending at i"
     "dp[i][j] = min edit distance to convert word1[:i] to word2[:j]"
2. Write the recurrence: dp[state] = f(dp[smaller states])
3. Identify base case(s): dp[0] = ?, dp[i][0] = ?
4. Decide iteration order: does dp[i] depend on dp[i-1] (1D forward),
   dp[i][j] depend on dp[i-1][j-1] (2D diagonal fill), etc.
5. Decide the answer location: dp[n], dp[n][m], max(dp), etc.
6. (Optional) Compress space: if dp[i] only depends on dp[i-1] (or a fixed
   window), drop the extra dimension and keep only the last row/O(1) vars.
```

Always solve top-down (recursion + memo dict/array) first if the recurrence
is not obvious -- it is easier to get correct. Convert to bottom-up
(iterative table) afterward for the follow-up "can you do it without
recursion / with less space?"

-------------------------------------------------------------------------------

## Pattern 1: 1D DP (Linear Sequence DP)

State is usually `dp[i]` = best answer considering the first `i` elements
(or ending exactly at index `i`).

### Template: Fibonacci-style (dp[i] depends on a fixed window of previous states)

```python
def climb_stairs(n):
    if n <= 2:
        return n
    prev2, prev1 = 1, 2
    for i in range(3, n + 1):
        prev2, prev1 = prev1, prev2 + prev1
    return prev1
```

### Template: "ending at i" with a scan back or a running best

```python
def house_robber(nums):
    take, skip = 0, 0  # take = best if we rob nums[i], skip = best if we don't
    for num in nums:
        take, skip = skip + num, max(take, skip)
    return max(take, skip)
```

### Template: Longest Increasing Subsequence (O(n^2) then O(n log n))

```python
# O(n^2): dp[i] = length of LIS ending at i
def length_of_lis_n2(nums):
    dp = [1] * len(nums)
    for i in range(len(nums)):
        for j in range(i):
            if nums[j] < nums[i]:
                dp[i] = max(dp[i], dp[j] + 1)
    return max(dp) if dp else 0

# O(n log n): maintain the smallest possible tail for each subsequence length
import bisect
def length_of_lis_nlogn(nums):
    tails = []
    for x in nums:
        pos = bisect.bisect_left(tails, x)
        if pos == len(tails):
            tails.append(x)
        else:
            tails[pos] = x
    return len(tails)
```

Key 1D DP ideas to recognize:
- Kadane's algorithm (max subarray) is a 1-state DP:
  `dp[i] = max(nums[i], dp[i-1] + nums[i])`.
- "Ending at i" vs "considering first i elements" are subtly different --
  pick the one that makes the recurrence clean and take the max/answer over
  all i at the end if using "ending at i".
- State machine DP (see Stock problems) models a finite set of states per
  index (e.g. holding stock / not holding / in cooldown) and transitions
  between them each step.

-------------------------------------------------------------------------------

## Pattern 2: 2D DP (Two Sequences / Grid)

State is `dp[i][j]`, typically indexing into two strings, or into a grid's
rows and columns.

### Template: Grid paths

```python
def unique_paths(m, n):
    dp = [[1] * n for _ in range(m)]
    for i in range(1, m):
        for j in range(1, n):
            dp[i][j] = dp[i - 1][j] + dp[i][j - 1]
    return dp[m - 1][n - 1]
```

### Template: Two strings (LCS family -- LCS, Edit Distance, Interleaving)

```python
def longest_common_subsequence(text1, text2):
    m, n = len(text1), len(text2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if text1[i - 1] == text2[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    return dp[m][n]

def edit_distance(word1, word2):
    m, n = len(word1), len(word2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(m + 1):
        dp[i][0] = i
    for j in range(n + 1):
        dp[0][j] = j
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if word1[i - 1] == word2[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]
            else:
                dp[i][j] = 1 + min(
                    dp[i - 1][j],      # delete
                    dp[i][j - 1],      # insert
                    dp[i - 1][j - 1],  # replace
                )
    return dp[m][n]
```

### Template: Palindrome DP (interval / single-string 2D)

```python
def longest_palindromic_substring(s):
    n = len(s)
    dp = [[False] * n for _ in range(n)]
    start, max_len = 0, 1
    for i in range(n):
        dp[i][i] = True
    for length in range(2, n + 1):
        for i in range(n - length + 1):
            j = i + length - 1
            if s[i] == s[j] and (length == 2 or dp[i + 1][j - 1]):
                dp[i][j] = True
                if length > max_len:
                    start, max_len = i, length
    return s[start:start + max_len]
```

Key 2D DP ideas to recognize:
- Two strings almost always means `dp[i][j]` = answer using `s1[:i]` and
  `s2[:j]`, with base cases `dp[0][*]` and `dp[*][0]` for "empty prefix".
- Interval DP (`dp[i][j]` over a single string/array range, e.g. Burst
  Balloons, Palindrome Partitioning) fills by increasing interval length.
- Space can almost always be compressed from O(m*n) to O(n) or O(min(m,n))
  since row `i` only depends on row `i-1`.

-------------------------------------------------------------------------------

## Pattern 3: Knapsack DP

The most important DP family for interviews after 1D/2D string DP. Three
flavors, distinguished by how many times each item can be used and how the
inner loop is ordered.

### 3.1 0/1 Knapsack (each item used at most once)

State: `dp[i][cap]` = best value using first `i` items with capacity `cap`.
Iterate the capacity loop BACKWARD when space-compressing to 1D so each item
is only counted once.

```python
def can_partition(nums):  # Partition Equal Subset Sum, LC 416
    total = sum(nums)
    if total % 2:
        return False
    target = total // 2
    dp = [False] * (target + 1)
    dp[0] = True
    for num in nums:
        for cap in range(target, num - 1, -1):  # backward!
            dp[cap] = dp[cap] or dp[cap - num]
    return dp[target]
```

### 3.2 Unbounded Knapsack (each item usable unlimited times)

Iterate the capacity loop FORWARD so an item can be reused within the same
pass.

```python
def coin_change(coins, amount):  # LC 322
    dp = [0] + [float('inf')] * amount
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a:
                dp[a] = min(dp[a], dp[a - c] + 1)
    return dp[amount] if dp[amount] != float('inf') else -1
```

### 3.3 Counting-ways Knapsack (order matters vs. does not)

- Combinations (order does NOT matter, e.g. Coin Change II, LC 518): loop
  items on the OUTER loop, amount on the INNER loop.
- Permutations (order DOES matter, e.g. Combination Sum IV, LC 377): loop
  amount on the OUTER loop, items on the INNER loop.

```python
def change(amount, coins):  # LC 518, combinations
    dp = [1] + [0] * amount
    for c in coins:            # outer: item
        for a in range(c, amount + 1):  # inner: amount
            dp[a] += dp[a - c]
    return dp[amount]

def combination_sum_4(nums, target):  # LC 377, permutations
    dp = [1] + [0] * target
    for a in range(1, target + 1):     # outer: amount
        for num in nums:               # inner: item
            if num <= a:
                dp[a] += dp[a - num]
    return dp[target]
```

Knapsack recognition cheat sheet:

| Clue                                                        | Variant                    |
|----------------------------------------------------------------|------------------------------|
| "each item used at most once", subset sum / partition            | 0/1 knapsack                  |
| "unlimited supply", coins/rods that can repeat                    | Unbounded knapsack            |
| "number of ways", combination (set) semantics                    | Counting, outer=item          |
| "number of ways", sequence/permutation semantics                  | Counting, outer=target        |
| "two subsets with min difference"                                 | 0/1 knapsack on total/2        |

-------------------------------------------------------------------------------

## Pattern 4: State Machine DP (Stock Problems)

Model a small, fixed number of named states at each index and transition
between them. Extremely common as a follow-up escalation (Stock I -> II ->
III -> IV -> with cooldown -> with fee).

```python
def max_profit_with_cooldown(prices):  # LC 309
    if not prices:
        return 0
    hold, sold, rest = float('-inf'), 0, 0
    for p in prices:
        prev_sold = sold
        sold = hold + p
        hold = max(hold, rest - p)
        rest = max(rest, prev_sold)
    return max(sold, rest)
```

-------------------------------------------------------------------------------

## Common Pitfalls

- Off-by-one on dp array sizing: use size `n+1` when `dp[0]` represents the
  "empty" base case (common in string/knapsack DP).
- 0/1 knapsack space-compression bug: iterating capacity forward instead of
  backward silently turns it into unbounded knapsack.
- Forgetting to initialize `dp[0][j]` / `dp[i][0]` boundary rows/columns in
  2D DP.
- Using `float('inf')` as a sentinel without checking it never leaks into
  the final answer unmodified (means "unreachable").
- Confusing "subsequence" (can skip elements, order preserved) with
  "substring/subarray" (must be contiguous) -- this changes the recurrence
  entirely.
- Not recognizing that a DP problem can be memoized top-down first if the
  bottom-up fill order isn't obvious.

## Interview Tips

- Always state the recurrence in words before writing code.
- Draw a small 2D grid on the whiteboard/paper for 2D DP -- filling it by
  hand for a tiny example prevents off-by-one bugs.
- Mention space optimization proactively after a working solution: "we can
  reduce this from O(n*m) to O(m) since we only ever look at the previous
  row."
- If truly stuck, fall back to brute-force recursion first, verify
  correctness on the example, THEN add memoization -- this is a safe,
  methodical path to a working DP solution under pressure.

-------------------------------------------------------------------------------

## Practice

The LeetCode list for this topic is in [problems.md](./problems.md). The interview code to memorize is in [common-techniques.md](./common-techniques.md). Solve **Must** first, then Should, then Optional.
