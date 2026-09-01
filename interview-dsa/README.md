# DSA Interview Prep

A structured, interview-focused walkthrough of Data Structures and
Algorithms, organized by pattern rather than by data structure alone.

Each topic lives in its own folder:

```text
NN. topic-name/
  notes.md              -- study guide (when to use the pattern, pitfalls)
  common-techniques.md  -- the code you actually write in an interview
  problems.md           -- LeetCode list only (Must / Should / Optional)
```

`00. complexity-and-patterns` has `notes.md` + `common-techniques.md`
(the 7-step loop) and no `problems.md`.

## Start Here

1. Read [00. complexity-and-patterns/notes.md](00. complexity-and-patterns/notes.md)
   first -- Big-O, the 7-step interview framework, and the keyword-to-pattern map.
2. Pick a schedule from [order.md](./order.md) (12-week, 8-week, or 4-week
   crash plan) and follow it topic by topic. The **week order is not the
   same as the folder numbers** -- see [Curriculum notes](#curriculum-notes).
3. Track progress in [PROBLEMS-MASTER-LIST.md](PROBLEMS-MASTER-LIST.md).
4. Within each topic, solve MUST problems first, then SHOULD, then OPTIONAL.

## Priority System

- **Must**: extremely high interview frequency, or teaches a pattern that
  reappears everywhere. Solve these no matter how little time you have.
- **Should**: common enough to expect at most companies; solve if you have
  a normal prep timeline (8+ weeks).
- **Optional**: depth, mastery, or company-specific value; solve if you have
  extra time.

Each LeetCode number has **one primary home**. If the same problem teaches
two patterns, the other topic's `problems.md` lists it under **Related --
do not solve twice**.

## Topic Index

| # | Topic | Folder | What it covers |
|---|---|---|---|
| 00 | Complexity and Patterns | [00. complexity-and-patterns](00. complexity-and-patterns/notes.md) | Big-O, 7-step framework, keyword-to-pattern map |
| 01 | Arrays and Strings | [01. arrays-strings](01. arrays-strings/notes.md) | Prefix sums, in-place pointers, Kadane, matrix walks |
| 02 | Hash Map and Hash Set | [02. hash-map-set](02. hash-map-set/notes.md) | Frequency counting, complement lookups, prefix+map |
| 03 | Two Pointers | [03. two-pointers](03. two-pointers/notes.md) | Converging / same-direction pointers, sorted pairs |
| 04 | Sliding Window | [04. sliding-window](04. sliding-window/notes.md) | Fixed and variable windows, substring/subarray |
| 05 | Stack and Queue | [05. stack-queue](05. stack-queue/notes.md) | Monotonic stack, parentheses, deque |
| 06 | Linked Lists | [06. linked-lists](06. linked-lists/notes.md) | Reversal, fast/slow, cycle detection, merging |
| 07 | Trees | [07. trees](07. trees/notes.md) | Traversals, BST, BFS/DFS, tree DP intro |
| 08 | Graphs | [08. graphs](08. graphs/notes.md) | BFS/DFS, topological sort, cycle detection |
| 09 | Heap / Priority Queue | [09. heap-priority-queue](09. heap-priority-queue/notes.md) | Top-K, two-heap median, k-way merge |
| 10 | Binary Search | [10. binary-search](10. binary-search/notes.md) | Classic BS, search on the answer |
| 11 | Sorting | [11. sorting](11. sorting/notes.md) | Implement merge/quick sort; when sorting unlocks a solution |
| 12 | Recursion and Backtracking | [12. recursion-backtracking](12. recursion-backtracking/notes.md) | Subsets, permutations, combinations |
| 13 | Dynamic Programming | [13. dynamic-programming](13. dynamic-programming/notes.md) | 1D / 2D / knapsack / state machine |
| 14 | Greedy | [14. greedy](14. greedy/notes.md) | Exchange argument, jump-game, sort-then-pass |
| 15 | Bit Manipulation | [15. bit-manipulation](15. bit-manipulation/notes.md) | XOR, bitmasks, per-bit counting |
| 16 | Intervals | [16. intervals](16. intervals/notes.md) | Merge/insert, sweep line, interval greedy |
| 17 | Trie | [17. trie](17. trie/notes.md) | Prefix tree, wildcard search, trie + grid DFS |
| 18 | Union-Find | [18. union-find](18. union-find/notes.md) | DSU, connectivity, cycle detection |

## Curriculum notes

What was wrong, and what to follow now:

**Folder numbers stay 00-18** so chapter references inside the notes
("see chapter 09") stay stable. **The week-by-week plan in `order.md`
is the real study order.**

1. **High-frequency array patterns first (01-05) is correct.** Hash,
   two pointers, sliding window, and stack are what interviews hit first.
2. **Calling `sort()` is not chapter 11.** Arrays, two pointers, and
   intervals all sort in week 1-3. Chapter 11 is *implementing* merge sort /
   quicksort / quickselect. Do not wait for it before sorting an input.
3. **Heap before graphs in the schedule.** Dijkstra needs a min-heap.
   Trees (week 5) already taught BFS with a queue; heap is the next tool;
   then graphs can use both.
4. **Union-Find immediately after graphs**, not in a week-12 dump. It is
   a connectivity tool, not a "special topic at the end."
5. **Intervals + greedy in the same week.** They overlap (merge vs
   non-overlapping vs arrows). Keeping intervals at folder 16 and greedy
   at 14 is fine; studying them together is not.
6. **Binary search after heap in the same week is fine.** Classic BS only
   needs a sorted array; BS-on-answer is the harder half and can wait until
   you have the early patterns down.
7. **Backtracking after trees/graphs is correct.** You already used
   recursion for DFS. Chapter 12 is combinatorial search, not "what is a
   recursive call."
8. **DP still gets two weeks.** It is the dense chapter. Do not compress it.
9. **The old master list stopped at topic 12.** Topics 13-18 are now on
   the same checklist.

Duplicates that used to be Must in two folders (Two Sum, 3Sum, Merge
Intervals, Top K, Number of Islands, etc.) now have one primary home.

## Study Schedule

See [order.md](./order.md):

- **12-Week Plan**: recommended default, Must + Should (+ Optional if ahead).
- **8-Week Plan**: Must-only, Should as time allows.
- **4-Week Crash Plan**: Must only, mocks in the final week.

## How to Use This Repo Day to Day

1. Read `notes.md` for the day's topic.
2. Re-derive every snippet in `common-techniques.md` from memory (that is the
   interview muscle).
3. Open `problems.md` and solve Must, then Should, then Optional.
4. If stuck for more than 30-40 minutes, peek at the approach only, finish
   the problem, then re-solve it unaided 2-3 days later.
5. Once a week, mix in 2-3 problems from earlier topics (interleaved review).
6. In the final 2-3 weeks before an interview, replace new problems with
   timed mocks using the 7-step framework from
   `00. complexity-and-patterns/notes.md`.

`common-techniques.md` is TypeScript — the code you should be able to write
in an interview. `notes.md` still has longer explanations (some examples in
Python). Interviews test the pattern, not the syntax.
