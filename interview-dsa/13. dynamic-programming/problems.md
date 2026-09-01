# Dynamic Programming — Problems

Solve in priority order: **Must**, then **Should**, then **Optional**.

Track checkboxes in [PROBLEMS-MASTER-LIST.md](../PROBLEMS-MASTER-LIST.md).

## Problem List

### 1D DP

| Problem                                              | LeetCode # | Difficulty | Priority | Notes                          |
|--------------------------------------------------------|------------|------------|----------|----------------------------------|
| Climbing Stairs                                          | 70         | Easy       | Must     | Fibonacci-style base case         |
| House Robber                                             | 198        | Medium     | Must     | take/skip state                   |
| House Robber II                                          | 213        | Medium     | Must     | circular array, run twice         |
| Maximum Product Subarray                                 | 152        | Medium     | Must     | track running max AND min         |
| Longest Increasing Subsequence                            | 300        | Medium     | Must     | O(n^2) then O(n log n) patience   |
| Word Break                                                | 139        | Medium     | Must     | dp[i] = can segment s[:i]         |
| Decode Ways                                               | 91         | Medium     | Must     | Fibonacci-like with validity check|
| Coin Change                                               | 322        | Medium     | Must     | unbounded knapsack, min coins     |
| Min Cost Climbing Stairs                                  | 746        | Easy       | Should   | warm up variant of climb stairs   |
| Perfect Squares                                            | 279        | Medium     | Should   | unbounded knapsack variant        |
| Delete and Earn                                            | 740        | Medium     | Should   | reduces to House Robber            |
| Longest Palindromic Subsequence                            | 516        | Medium     | Should   | interval DP over one string       |
| Number of Longest Increasing Subsequence                   | 673        | Medium     | Optional | LIS with count tracking            |
| Russian Doll Envelopes                                      | 354        | Hard       | Optional | LIS in 2D after sorting            |
| Fibonacci Number                                            | 509        | Easy       | Optional | pure warm up                       |
| N-th Tribonacci Number                                      | 1137       | Easy       | Optional | 3-term recurrence                  |
| Integer Break                                               | 343        | Medium     | Optional | product maximization DP            |
| Longest Arithmetic Subsequence                              | 1027       | Medium     | Optional | dp keyed by (index, difference)    |

### 2D DP (grids and two-sequence problems)

| Problem                                              | LeetCode # | Difficulty | Priority | Notes                          |
|--------------------------------------------------------|------------|------------|----------|----------------------------------|
| Unique Paths                                              | 62         | Medium     | Must     | classic grid DP                   |
| Unique Paths II                                            | 63         | Medium     | Should   | grid DP with obstacles             |
| Minimum Path Sum                                            | 64         | Medium     | Must     | grid DP min cost                   |
| Longest Common Subsequence                                  | 1143       | Medium     | Must     | foundational two-string DP         |
| Edit Distance                                               | 72         | Medium     | Must     | classic, insert/delete/replace     |
| Longest Palindromic Substring                               | 5          | Medium     | Must     | interval DP or expand-around-center|
| Palindromic Substrings                                       | 647        | Medium     | Should   | count all palindromic substrings   |
| Maximal Square                                               | 221        | Medium     | Should   | dp[i][j] = side length of square   |
| Interleaving String                                          | 97         | Medium     | Should   | two pointers into a 2D dp table    |
| Distinct Subsequences                                        | 115        | Hard       | Should   | counting variant of LCS            |
| Triangle                                                      | 120        | Medium     | Should   | bottom-up min path sum             |
| Minimum Falling Path Sum                                      | 931        | Medium     | Optional | grid DP with 3-way transition      |
| Maximum Length of Repeated Subarray                            | 718        | Medium     | Optional | "longest common substring" variant |
| Delete Operation for Two Strings                                | 583        | Medium     | Optional | reduces to LCS                     |
| Regular Expression Matching                                     | 10         | Hard       | Optional | 2D DP with `*`/`.` handling         |
| Wildcard Matching                                               | 44         | Hard       | Optional | similar to regex matching, `*`/`?`  |
| Burst Balloons                                                  | 312        | Hard       | Optional | interval DP, think last balloon     |
| Cherry Pickup                                                   | 741        | Hard       | Optional | two-agent grid DP                    |
| Super Egg Drop                                                  | 887        | Hard       | Optional | binary-search-optimized DP            |
### Knapsack (0/1, unbounded, counting)

| Problem                                              | LeetCode # | Difficulty | Priority | Notes                          |
|--------------------------------------------------------|------------|------------|----------|----------------------------------|
| Partition Equal Subset Sum                                | 416        | Medium     | Must     | 0/1 knapsack, target = sum/2      |
| Coin Change II                                            | 518        | Medium     | Must     | unbounded, count combinations      |
| Target Sum                                                | 494        | Medium     | Must     | 0/1 knapsack via sign assignment  |
| Ones and Zeroes                                           | 474        | Medium     | Should   | 2D-capacity 0/1 knapsack           |
| Combination Sum IV                                         | 377        | Medium     | Should   | counting permutations, order matters|
| Last Stone Weight II                                        | 1049       | Medium     | Should   | reduces to partition/subset sum    |
| Profitable Schemes                                          | 879        | Hard       | Optional | 0/1 knapsack with 2 constraints    |
| Tallest Billboard                                           | 1420       | Hard       | Optional | knapsack keyed by difference       |

### State machine DP (stock problems)

| Problem                                              | LeetCode # | Difficulty | Priority | Notes                          |
|--------------------------------------------------------|------------|------------|----------|----------------------------------|
| Best Time to Buy and Sell Stock with Cooldown                | 309        | Medium     | Should   | 3-state machine DP                 |
| Best Time to Buy and Sell Stock with Transaction Fee          | 714        | Medium     | Should   | 2-state machine DP with fee         |
| Best Time to Buy and Sell Stock III                          | 123        | Hard       | Optional | at most 2 transactions              |
| Best Time to Buy and Sell Stock IV                           | 188        | Hard       | Optional | at most k transactions              |

### DP on trees / other

| Problem                                              | LeetCode # | Difficulty | Priority | Notes                          |
|--------------------------------------------------------|------------|------------|----------|----------------------------------|
| House Robber III                                            | 337        | Medium     | Should   | DP on a binary tree                |
| Binary Tree Maximum Path Sum                                 | 124        | Hard       | Should   | DP on tree, also see [07. trees](../07. trees/notes.md)        |
| Paint House                                                  | 256        | Medium     | Optional | premium; simple 3-state DP           |
| Stone Game                                                    | 877        | Medium     | Optional | interval/game-theory DP              |
| Predict the Winner                                            | 486        | Medium     | Optional | game-theory DP, minimax recurrence   |

## Related — do not solve twice

These appear in this topic's notes, but their **primary** LeetCode home is another folder. Solve them there.

| Problem | LeetCode # | Primary topic |
|---|---|---|
| Maximum Subarray | 53 | [Arrays and Strings](../01. arrays-strings/problems.md) |
| Jump Game | 55 | [Greedy](../14. greedy/problems.md) |
| Best Time to Buy and Sell Stock | 121 | [Arrays and Strings](../01. arrays-strings/problems.md) |
| Best Time to Buy and Sell Stock II | 122 | [Greedy](../14. greedy/problems.md) |
| Word Break II | 140 | [Recursion and Backtracking](../12. recursion-backtracking/problems.md) |
| Diameter of Binary Tree | 543 | [Trees](../07. trees/problems.md) |
