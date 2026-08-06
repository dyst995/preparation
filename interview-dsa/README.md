# DSA Interview Prep

A structured, interview-focused walkthrough of Data Structures and
Algorithms, organized by pattern rather than by data structure alone. Every
topic file follows the same format: a study guide (when to use the pattern,
templates, common pitfalls, interview tips) followed by a problem table
with real LeetCode names/numbers and a Must / Should / Optional priority.

## Start Here

1. Read [00-complexity-and-patterns.md](00-complexity-and-patterns.md)
   first -- it has the Big-O reference, a universal 7-step framework for
   approaching any problem, and a keyword-to-pattern recognition table you
   will come back to constantly.
2. Pick a schedule from [order.md](order.md) (12-week, 8-week, or 4-week
   crash plan) and follow it topic by topic.
3. Track progress on all problems in [PROBLEMS-MASTER-LIST.md](PROBLEMS-MASTER-LIST.md).
4. Within each topic file, solve MUST problems first, then SHOULD, then
   OPTIONAL if you have time or the topic is a known focus of your target
   company.

## Priority System

- **Must**: extremely high interview frequency, or teaches a pattern that
  reappears everywhere. Solve these no matter how little time you have.
- **Should**: common enough to expect at most companies; solve if you have
  a normal prep timeline (8+ weeks).
- **Optional**: depth, mastery, or company-specific value; solve if you have
  extra time.

## Topic Index

| # | Topic | File | What it covers |
|---|-------|------|-----------------|
| 00 | Complexity and Patterns | [00-complexity-and-patterns.md](00-complexity-and-patterns.md) | Big-O cheat sheet, universal problem-solving framework, keyword-to-pattern map, data structure selection guide |
| 01 | Arrays and Strings | [01-arrays-strings.md](01-arrays-strings.md) | Array/string fundamentals, prefix sums, in-place manipulation |
| 02 | Hash Map and Hash Set | [02-hash-map-set.md](02-hash-map-set.md) | Hash map/set patterns, frequency counting, complement lookups |
| 03 | Two Pointers | [03-two-pointers.md](03-two-pointers.md) | Converging pointers, fast/slow, sorted-array pair problems |
| 04 | Sliding Window | [04-sliding-window.md](04-sliding-window.md) | Fixed and variable-size windows, substring/subarray optimization |
| 05 | Stack and Queue | [05-stack-queue.md](05-stack-queue.md) | Monotonic stack, valid parentheses family, queue-based simulation |
| 06 | Linked Lists | [06-linked-lists.md](06-linked-lists.md) | Reversal, fast/slow pointers, cycle detection, merging |
| 07 | Trees | [07-trees.md](07-trees.md) | Traversals (BST, BFS/DFS), tree construction, tree DP |
| 08 | Graphs | [08-graphs.md](08-graphs.md) | BFS/DFS, topological sort, cycle detection |
| 09 | Heap / Priority Queue | [09-heap-priority-queue.md](09-heap-priority-queue.md) | Top-K patterns, two-heap median, k-way merge |
| 10 | Binary Search | [10-binary-search.md](10-binary-search.md) | Classic binary search, binary search on the answer |
| 11 | Sorting | [11-sorting.md](11-sorting.md) | Sorting algorithms and concepts, when sorting unlocks a simpler solution |
| 12 | Recursion and Backtracking | [12-recursion-backtracking.md](12-recursion-backtracking.md) | Recurrence relations, combinatorial search: subsets, permutations, combinations |
| 13 | Dynamic Programming | [13-dynamic-programming.md](13-dynamic-programming.md) | 1D DP, 2D DP (string/grid), 0/1 and unbounded knapsack, state machine DP |
| 14 | Greedy | [14-greedy.md](14-greedy.md) | Sort-then-sweep, exchange argument proofs, interval/heap-based greedy |
| 15 | Bit Manipulation | [15-bit-manipulation.md](15-bit-manipulation.md) | XOR tricks, bitmasks, bitmask DP, binary trie for max XOR |
| 16 | Intervals | [16-intervals.md](16-intervals.md) | Merge/insert intervals, greedy interval selection, sweep line |
| 17 | Trie | [17-trie.md](17-trie.md) | Prefix tree implementation, wildcard search, trie + grid DFS |
| 18 | Union-Find | [18-union-find.md](18-union-find.md) | Disjoint Set Union with path compression and union by size, cycle detection, dynamic connectivity |

Every file listed above exists in this repo and follows the same core
structure: a study guide (patterns, templates, pitfalls, interview tips)
followed by a problem table with LeetCode name/number, difficulty, and a
Must/Should/Optional priority (files `07-12` label the priority column `P`
with `M`/`S`/`O` for brevity; files `00` and `13-18` spell out
Must/Should/Optional in full).

## Study Schedule

See [order.md](order.md) for full week-by-week plans:

- **12-Week Plan**: recommended default, covers Must + Should (+ Optional if
  ahead of schedule).
- **8-Week Plan**: accelerated, Must-only with Should as time allows.
- **4-Week Crash Plan**: emergency prep, Must problems only, heavy on mock
  interviews in the final week.

## File Structure (Template Used by Every Topic File)

Each `NN-topic-name.md` file follows this structure:

```text
# NN. Topic Name

## Overview                        -- what the pattern is, why it matters
## When to Suspect This Pattern    -- keyword/signal recognition
## Pattern 1, 2, 3...              -- named sub-patterns with code templates
## Common Pitfalls                 -- mistakes that cause wrong/slow answers
## Interview Tips                  -- what to say and do during the interview
## Problem List                    -- table: Problem | LeetCode # | Difficulty
                                       | Priority | Notes
```

Code templates are written in Python for brevity and readability, but the
patterns and templates translate directly to Java, C++, JavaScript,
TypeScript, or Go -- the logic, not the syntax, is what interviews test.

## How to Use This Repo Day to Day

1. Read the study guide section of the day's topic; re-derive each code
   template from memory rather than copy-pasting.
2. Solve problems in priority order (Must, then Should, then Optional).
3. If stuck for more than 30-40 minutes, peek at the approach only, finish
   the problem, then re-solve it unaided 2-3 days later (spaced repetition
   beats one-time grinding).
4. Once a week, mix in 2-3 problems from earlier topics so patterns stay
   fresh (interleaved review, not just sequential progress).
5. In the final 2-3 weeks before an interview, replace new problems with
   timed mock interviews using the 7-step framework from
   `00-complexity-and-patterns.md`.
