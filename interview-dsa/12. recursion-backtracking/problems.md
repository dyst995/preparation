# Recursion and Backtracking — Problems

Solve in priority order: **Must**, then **Should**, then **Optional**.

Track checkboxes in [PROBLEMS-MASTER-LIST.md](../PROBLEMS-MASTER-LIST.md).

## Problem List

Priority legend (**P** column): **M** = Must (do before any interview),
**S** = Should (do if you have another day or two), **O** = Optional
(nice-to-have breadth).

| P | Problem | LeetCode # | Difficulty | Notes/Pattern |
|---|---|---|---|---|
| M | Subsets | 78 | Medium | Backtracking, no reuse, every path is valid |
| M | Permutations | 46 | Medium | Backtracking with `used[]` tracker |
| M | Combination Sum | 39 | Medium | Reuse allowed, target-based pruning |
| M | Generate Parentheses | 22 | Medium | Backtracking with open/close count constraints |
| M | Letter Combinations of a Phone Number | 17 | Medium | Backtracking over digit-to-letter mapping |
| M | Word Search | 79 | Medium | Grid DFS backtracking with visited marking |
| M | Subsets II | 90 | Medium | Backtracking + duplicate skip (sort first) |
| M | N-Queens | 51 | Hard | Constraint satisfaction with column/diagonal sets |
| S | Permutations II | 47 | Medium | Permutations + duplicate skip |
| S | Combinations | 77 | Medium | Choose k of n, with pruning |
| S | Combination Sum II | 40 | Medium | No reuse + duplicate skip |
| S | Palindrome Partitioning | 131 | Medium | Backtracking + palindrome check per substring |
| S | Restore IP Addresses | 93 | Medium | Backtracking with segment-length constraints |
| O | N-Queens II | 52 | Hard | Same as N-Queens, count only |
| O | Sudoku Solver | 37 | Hard | Constraint satisfaction backtracking on a grid |
| O | Combination Sum III | 216 | Medium | Fixed count + target sum backtracking |
| O | Beautiful Arrangement | 526 | Medium | Backtracking with divisibility constraint pruning |
| O | Word Break II | 140 | Hard | Backtracking + memoization (bridge to DP) |

## Related — do not solve twice

These appear in this topic's notes, but their **primary** LeetCode home is another folder. Solve them there.

| Problem | LeetCode # | Primary topic |
|---|---|---|
| Fibonacci Number | 509 | [Dynamic Programming](../13. dynamic-programming/problems.md) |
