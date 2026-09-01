# Study Schedule (12-Week and 8-Week Plans)

Read [00. complexity-and-patterns/notes.md](00. complexity-and-patterns/notes.md)
first, no matter which schedule you follow.

Folder numbers (`01` ... `18`) are labels, not the week order. Follow the
tables below. Why the week order differs from the folder numbers is in
[README.md](./README.md#curriculum-notes).

Every week below follows the same daily rhythm unless noted:

```text
Day 1-2: Read notes.md, then rewrite common-techniques.md from memory
         (do not copy-paste).
Day 3-5: Solve MUST problems from problems.md (add SHOULD as time allows).
Day 6:   Solve 2-3 mixed review problems from PREVIOUS weeks
         (interleaved review beats cramming -- this is critical).
Day 7:   Rest, or catch up. Optional: 1 timed mock from any topic so far.
```

Aim for 90-120 minutes/day on weekdays, more on weekends if possible. If a
problem takes longer than 30-40 minutes without progress, look at the
approach (not the full solution) and finish it, then re-solve it from
scratch 2-3 days later unaided.

-------------------------------------------------------------------------------

## 12-Week Plan (Recommended Default -- MUST + SHOULD)

| Week | Topic(s) | Focus |
|------|----------|--------|
| 1 | 00, 01 Arrays and Strings | Complexity framework, prefix/Kadane/in-place/matrix |
| 2 | 02 Hash Map/Set, 03 Two Pointers | Frequency maps, converging pointers |
| 3 | 04 Sliding Window, 05 Stack and Queue | Windows, monotonic stack |
| 4 | 06 Linked Lists | Fast/slow, reversal, cycles |
| 5 | 07 Trees | Traversals, BST, tree BFS/DFS |
| 6 | 09 Heap, 10 Binary Search | Top-K and heap tool, then search / search-on-answer |
| 7 | 08 Graphs, 18 Union-Find | BFS/DFS/topo (heap already learned for Dijkstra), then DSU |
| 8 | 11 Sorting, 12 Recursion and Backtracking | Implement sorts; combinatorial search |
| 9 | 13 Dynamic Programming (1D) | Recurrence, memo, 1D DP |
| 10 | 13 Dynamic Programming (2D, Knapsack) | Grid/string DP, knapsack family |
| 11 | 16 Intervals, 14 Greedy | Sweep/merge together with greedy proofs |
| 12 | 15 Bit Manipulation, 17 Trie, mixed review | Remaining specialized topics + mocks |

You already **call** `sort()` in weeks 1-3. Week 8 is for writing merge sort
/ quicksort / quickselect, not for discovering that sorting exists.

### Week 6 detail (tools before graphs)

```text
Day 1-3: 09. heap-priority-queue  -- notes + Must
Day 4-6: 10. binary-search        -- notes + Must
Day 7:   mixed review of weeks 1-5
```

### Week 7 detail (graphs + union-find)

```text
Day 1-4: 08. graphs        -- notes + Must (Dijkstra can use the heap from week 6)
Day 5-6: 18. union-find    -- notes + Must
Day 7:   mixed review
```

### Week 11 detail (intervals + greedy)

```text
Day 1-3: 16. intervals  -- merge/insert/sweep Must
Day 4-6: 14. greedy     -- jump game, gas station, partition labels
Day 7:   mixed review; interval-greedy overlap problems if any felt fuzzy
```

### Week 12 detail

```text
Day 1-2: 15. bit-manipulation -- notes + Must
Day 3:   17. trie             -- notes + Must
Day 4:   Should problems from 15-17, or weakest topic from weeks 1-11
Day 5:   remaining Should in your weakest topic
Day 6:   mixed review: 1 problem from several earlier weeks, 25-35 min each
Day 7:   rest, notes, revisit weak topics
```

### After Week 12

- 2-3 full mock interviews per week (45 min, think out loud, 7-step framework).
- Revisit OPTIONAL in your weakest 2-3 topics.
- Re-solve 5-10 MUST problems from weeks ago with no notes.

-------------------------------------------------------------------------------

## 8-Week Plan (Accelerated -- MUST Only, SHOULD if Time Allows)

| Week | Topics | Daily rhythm |
|------|--------|----------------|
| 1 | 00, 01 Arrays, 02 Hash | Framework + Must |
| 2 | 03 Two Pointers, 04 Sliding Window, 05 Stack | Must both, 1 mixed review day |
| 3 | 06 Linked Lists, 07 Trees | Must both, 1 mixed review day |
| 4 | 09 Heap, 10 Binary Search | Must both, 1 mixed review day |
| 5 | 08 Graphs, 18 Union-Find | Must both, 1 mixed review day |
| 6 | 11 Sorting, 12 Recursion, start 13 DP | Must; DP continues next week |
| 7 | 13 Dynamic Programming | Must only (1D + knapsack first) |
| 8 | 16 Intervals, 14 Greedy, 15 Bit, 17 Trie | Must only, then 2 mocks |

Skip OPTIONAL unless a topic is a known company focus.

### Week 8 detail

```text
Day 1: 16. intervals           -- Must
Day 2: 14. greedy              -- Must
Day 3: 15. bit-manipulation    -- Must
Day 4: 17. trie                -- Must
Day 5: catch up / weakest Must leftover
Day 6: mock interview #1
Day 7: mock interview #2 + review the weakest topic
```

If you finish a week's Must list early, pull SHOULD from the same topic
before moving ahead -- depth on fewer topics beats shallow coverage of more.

-------------------------------------------------------------------------------

## 4-Week Crash Plan (Emergency Prep, Must Problems Only)

Only use this if the interview is under a month away. Combine topics and
solve ONLY Must problems.

| Week | Topics |
|------|--------|
| 1 | 00, 01 Arrays, 02 Hash, 03 Two Pointers, 04 Sliding Window |
| 2 | 05 Stack, 06 Linked Lists, 07 Trees, 09 Heap, 10 Binary Search |
| 3 | 08 Graphs, 18 Union-Find, 12 Recursion, 13 DP |
| 4 | 16 Intervals, 14 Greedy, 15 Bit, 17 Trie, 11 Sorting if time, then 3-4 mocks |

Sorting (11) is last in the crash plan because you can already *use* sort;
implementing it is lower frequency than graphs/DP.

-------------------------------------------------------------------------------

## How to Pick a Plan

- 12+ weeks until interview, want depth -> 12-Week Plan.
- 6-10 weeks until interview -> 8-Week Plan.
- Under 4 weeks -> 4-Week Crash Plan, Must only, then mocks every remaining day.
- Already comfortable with 01-12 and only need 13-18 -> jump to the weeks
  that cover those folders. DP (`13`) still deserves 1.5-2x the time of
  the others.

## Tracking Progress

Use [PROBLEMS-MASTER-LIST.md](./PROBLEMS-MASTER-LIST.md), or a simple log
with: Date | Problem | Topic folder | Priority | Time | Solved unaided? |
Needs review?. Revisit "Needs review" every 1-2 weeks until it is unaided.
