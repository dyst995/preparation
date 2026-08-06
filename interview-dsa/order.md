# Study Schedule (12-Week and 8-Week Plans)

Read `00-complexity-and-patterns.md` first, no matter which schedule you
follow -- it is the map for everything else in this repo.

Full topic list referenced below (see `README.md` for the index with
descriptions):

```text
00 - Complexity and Patterns (master cheat sheet, read first)
01 - Arrays and Strings
02 - Hash Map and Hash Set
03 - Two Pointers
04 - Sliding Window
05 - Stack and Queue (incl. monotonic stack)
06 - Linked Lists
07 - Trees (Binary Trees, BST, Traversals, BFS/DFS)
08 - Graphs (BFS, DFS, Topological Sort, Cycle Detection)
09 - Heap / Priority Queue
10 - Binary Search (Classic BS, BS on Answer)
11 - Sorting
12 - Recursion and Backtracking
13 - Dynamic Programming
14 - Greedy
15 - Bit Manipulation
16 - Intervals
17 - Trie
18 - Union-Find (Disjoint Set)
```

Every file above exists in this repo and follows the same core structure:
a study guide (patterns, templates, pitfalls, interview tips) followed by a
problem table with LeetCode name/number, difficulty, and a Must/Should/
Optional priority.

Every week below follows the same daily rhythm unless noted:

```text
Day 1-2: Read the topic's study guide section, re-derive each template from
         memory (do not just read -- write the code out yourself).
Day 3-5: Solve MUST problems for the topic (add SHOULD as time allows).
Day 6:   Solve 2-3 mixed review problems from PREVIOUS weeks' topics
         (interleaved review beats cramming -- this is critical).
Day 7:   Rest, or catch up on anything unfinished. Optional: 1 timed mock
         interview using a random problem from any topic covered so far.
```

Aim for 90-120 minutes/day on weekdays, more on weekends if possible. If a
problem takes longer than 30-40 minutes without progress, look at the
approach (not the full solution) and finish it, then re-solve it from
scratch 2-3 days later unaided -- this spaced-repetition step matters more
than grinding new problems.

-------------------------------------------------------------------------------

## 12-Week Plan (Recommended Default -- MUST + SHOULD, OPTIONAL if ahead)

| Week | Topic(s)                              | Focus                                          |
|------|-----------------------------------------|--------------------------------------------------|
| 1    | 00, 01 Arrays and Strings                | Complexity foundations, array/string fundamentals |
| 2    | 02 Hash Map/Set, 03 Two Pointers          | Frequency counting, converging pointers            |
| 3    | 04 Sliding Window, 05 Stack and Queue     | Variable/fixed windows, monotonic stack            |
| 4    | 06 Linked Lists                           | Fast/slow pointers, reversal, cycle detection      |
| 5    | 07 Trees                                  | Traversals, BST properties, tree DP intro           |
| 6    | 08 Graphs                                 | BFS/DFS, topological sort, cycle detection          |
| 7    | 09 Heap/Priority Queue, 10 Binary Search   | Top-K patterns, search space reduction             |
| 8    | 11 Sorting, 12 Recursion and Backtracking  | Sorting algorithms, combinatorial search           |
| 9    | 13 Dynamic Programming (1D)               | Recurrence relations, 1D DP mastery                |
| 10   | 13 Dynamic Programming (2D, Knapsack)     | 2D DP, string DP, knapsack family                  |
| 11   | 14 Greedy, 15 Bit Manipulation             | Greedy proofs, XOR tricks, bitmask DP              |
| 12   | 16 Intervals, 17 Trie, 18 Union-Find        | Remaining specialized topics, full review          |

### Week 12 detail (final 3 specialized topics, compressed into 1 week)

Because weeks 1-11 cover the foundational and DP-heavy topics at a
comfortable pace, week 12 is intentionally a "specialized topics sprint":

```text
Day 1: 16-intervals.md             -- read + solve all Must problems
Day 2: 17-trie.md                  -- read + solve all Must problems
Day 3: 18-union-find.md            -- read + solve all Must problems
Day 4: Solve all Should problems across 16-18 (pick based on time)
Day 5: Solve remaining Should/Optional problems in your weakest topic
       from weeks 1-11
Day 6: Full mixed review: 1 problem from each of the 19 topic areas,
       timed 25-35 min each, simulating interview pressure
Day 7: Rest, review notes, revisit any weak topic from the past 12 weeks
```

### After Week 12

- Do 2-3 full mock interviews per week (45 min each, one problem, think
  out loud, use the framework from `00-complexity-and-patterns.md`).
- Revisit OPTIONAL problems in your weakest 2-3 topics.
- Re-solve (from scratch, no notes) 5-10 MUST problems you solved weeks ago
  to confirm retention.

-------------------------------------------------------------------------------

## 8-Week Plan (Accelerated -- MUST Only, SHOULD if Time Allows)

Use this if your interview is coming up soon. Cover two topic files per
week; solve every MUST problem, and as many SHOULD problems as time
allows. Skip OPTIONAL entirely unless a topic is a known focus area for
your target company.

| Week | Topics                                      | Daily rhythm                                  |
|------|-----------------------------------------------|---------------------------------------------------|
| 1    | 00 Complexity/Patterns, 01 Arrays and Strings   | Framework + array/string Must problems             |
| 2    | 02 Hash Map/Set, 03 Two Pointers                  | Must problems both topics, 1 mixed review day       |
| 3    | 04 Sliding Window, 05 Stack and Queue              | Must problems both topics, 1 mixed review day       |
| 4    | 06 Linked Lists, 07 Trees                           | Must problems both topics, 1 mixed review day       |
| 5    | 08 Graphs, 09 Heap/Priority Queue                     | Must problems both topics, 1 mixed review day       |
| 6    | 10 Binary Search, 11 Sorting, 12 Recursion/Backtracking | Must problems across all 3, 1 mixed review day  |
| 7    | 13 Dynamic Programming                                | Must problems only (13 is dense -- prioritize 1D and Knapsack Must first) |
| 8    | 14 Greedy, 15 Bit Manipulation, 16 Intervals, 17 Trie, 18 Union-Find | Must problems only across all 5, 2 full mock interviews |

### Week 6 detail (3 topics compressed -- Must problems only)

```text
Day 1-2: 10-binary-search.md          -- Must problems only
Day 3-4: 11-sorting.md                -- Must problems only
Day 5-6: 12-recursion-backtracking.md -- Must problems only
Day 7:   Mixed review of weeks 1-6
```

### Week 8 detail (5 topics compressed -- Must problems only)

```text
Day 1: 14-greedy.md            -- Must problems only (~7 problems)
Day 2: 15-bit-manipulation.md  -- Must problems only (~6 problems)
Day 3: 16-intervals.md         -- Must problems only (~6 problems)
Day 4: 17-trie.md              -- Must problems only (~3 problems)
Day 5: 18-union-find.md        -- Must problems only (~4 problems)
Day 6: Full mock interview #1 (random topic, 45 min, think out loud)
Day 7: Full mock interview #2 + review whichever topic felt weakest
```

If you finish a week's Must list early, pull SHOULD problems from the same
topic before moving ahead of schedule -- depth on fewer topics beats
shallow coverage of more.

-------------------------------------------------------------------------------

## 4-Week Crash Plan (Emergency Prep, Must Problems Only)

Only use this if your interview is under a month away. Combine 4-5 topics
per week and solve ONLY Must-priority problems. Expect roughly 60-90
problems total across the crash plan.

| Week | Topics                                                        |
|------|-----------------------------------------------------------------|
| 1    | 00 Complexity/Patterns, 01 Arrays and Strings, 02 Hash Map/Set, 03 Two Pointers, 04 Sliding Window |
| 2    | 05 Stack/Queue, 06 Linked Lists, 07 Trees, 08 Graphs, 09 Heap/Priority Queue |
| 3    | 10 Binary Search, 11 Sorting, 12 Recursion/Backtracking, 13 Dynamic Programming |
| 4    | 14 Greedy, 15 Bit Manipulation, 16 Intervals, 17 Trie, 18 Union-Find, then 3-4 mock interviews on remaining days |

-------------------------------------------------------------------------------

## How to Pick a Plan

- 12+ weeks until interview, want deep mastery -> 12-Week Plan.
- 6-10 weeks until interview, solid but not unlimited time -> 8-Week Plan.
- Under 4 weeks until interview -> 4-Week Crash Plan, Must only, then mocks
  every remaining day.
- Already comfortable with fundamentals (01-12) and only need the newer
  advanced topics -> jump straight to weeks covering 13-18 in whichever
  plan above, or spend 1 focused week per file (13-dynamic-programming.md
  deserves 1.5-2x the time of the others given its size).

## Tracking Progress

Keep a simple log (spreadsheet or a `progress.md` you create yourself) with
columns: Date | Problem | Topic File | Priority | Time Taken | Solved
Unaided? (Y/N) | Needs Review?. Revisit anything marked "Needs Review" every
1-2 weeks until you can solve it unaided in a reasonable time.
