# 14. Greedy Algorithms

## Overview

A greedy algorithm builds a solution incrementally, always making the choice
that looks best "right now," without reconsidering past choices. Greedy is
much faster to code than DP (usually O(n) or O(n log n) after a sort) but it
ONLY works when the problem has two properties:

1. Greedy choice property: a locally optimal choice leads to a globally
   optimal solution.
2. Optimal substructure: an optimal solution to the problem contains optimal
   solutions to subproblems.

The hard part of greedy problems is not the code -- it is PROVING (at least
informally, out loud) that the greedy choice is safe. Interviewers will
often ask "why does this greedy strategy work?" -- always have an exchange
argument or proof-by-contradiction sketch ready.

## When to Suspect Greedy

- The problem involves scheduling, intervals, or resource allocation with an
  "assign/select the best available option" flavor.
- Sorting the input by some key (start time, ratio, size) makes the correct
  choice obvious at each step.
- The problem says "minimum number of X" or "maximum number of Y" for
  selection-type problems (not counting-ways, which is usually DP).
- A DP solution exists but the transition always picks the same "obviously
  best" branch -- that is a signal the DP can collapse into a greedy pass.
- Local, irrevocable decisions (once you pick, you never need to undo it).

## How to Prove a Greedy Algorithm Is Correct (Interview-Ready Techniques)

1. **Exchange argument**: Assume an optimal solution differs from the greedy
   choice at some point. Show you can swap/exchange elements to match the
   greedy choice without making the solution worse. This proves greedy is at
   least as good as any optimal solution.
2. **Proof by contradiction**: Assume the greedy solution is NOT optimal,
   derive a contradiction from the greedy choice property.
3. **Matroid / structural argument** (advanced, rarely needed explicitly):
   if the problem's feasible solutions form a matroid, greedy on weight
   order is provably optimal (e.g. why Kruskal's MST works).

In an interview, a short exchange-argument sentence is usually enough:
"if we picked a different first item, we could always swap it for the
greedy choice without making things worse, so greedy is safe."

-------------------------------------------------------------------------------

## Pattern 1: Sort Then Sweep

Sort by a key that reveals the correct greedy order, then make one linear
pass, tracking minimal state (a running value, a heap, or a count).

```python
def can_attend_all_meetings(intervals):  # Meeting Rooms, LC 252
    intervals.sort(key=lambda x: x[0])
    for i in range(1, len(intervals)):
        if intervals[i][0] < intervals[i - 1][1]:
            return False
    return True
```

```python
def min_arrows_to_burst_balloons(points):  # LC 452
    if not points:
        return 0
    points.sort(key=lambda p: p[1])
    arrows = 1
    end = points[0][1]
    for start, e in points[1:]:
        if start > end:
            arrows += 1
            end = e
    return arrows
```

## Pattern 2: Greedy with a Running Feasibility Check

Track the minimal amount of "reach," "capacity," or "balance" needed so far;
bail out early if it ever goes infeasible.

```python
def can_jump(nums):  # LC 55
    reach = 0
    for i, n in enumerate(nums):
        if i > reach:
            return False
        reach = max(reach, i + n)
    return True

def jump_min_steps(nums):  # LC 45, min jumps to reach the end
    jumps = current_end = farthest = 0
    for i in range(len(nums) - 1):
        farthest = max(farthest, i + nums[i])
        if i == current_end:
            jumps += 1
            current_end = farthest
    return jumps

def can_complete_circuit(gas, cost):  # Gas Station, LC 134
    total, tank, start = 0, 0, 0
    for i in range(len(gas)):
        diff = gas[i] - cost[i]
        total += diff
        tank += diff
        if tank < 0:
            start = i + 1
            tank = 0
    return start if total >= 0 else -1
```

## Pattern 3: Greedy with a Heap (Best Available Choice)

When "the best choice right now" requires a min/max over a dynamic set, use
a heap instead of re-scanning.

```python
import heapq

def task_scheduler(tasks, n):  # LC 621
    from collections import Counter
    counts = list(Counter(tasks).values())
    max_heap = [-c for c in counts]
    heapq.heapify(max_heap)
    time = 0
    while max_heap:
        cycle, temp = [], []
        for _ in range(n + 1):
            if max_heap:
                cnt = -heapq.heappop(max_heap)
                if cnt > 1:
                    temp.append(cnt - 1)
            cycle.append(1)
        for c in temp:
            heapq.heappush(max_heap, -c)
        time += len(cycle) if max_heap else len(temp) and n + 1 or len(cycle)
    return time
```

(Task Scheduler has a well-known closed-form formula too; see the problem
notes -- both the heap simulation and the formula are worth knowing.)

## Pattern 4: Two-Pointer / Interval Greedy

Greedy frequently pairs with two pointers on sorted arrays (see file 02) or
with interval processing (see file 16). Classic example: assign the fewest
resources or maximize matched pairs.

```python
def find_content_children(g, s):  # Assign Cookies, LC 455
    g.sort()
    s.sort()
    child = cookie = 0
    while child < len(g) and cookie < len(s):
        if s[cookie] >= g[child]:
            child += 1
        cookie += 1
    return child
```

-------------------------------------------------------------------------------

## Greedy vs DP: How to Decide

| Signal                                                          | Lean toward |
|---------------------------------------------------------------------|---------------|
| "minimum/maximum number of ways" (counting)                          | DP            |
| Choices interact in complex, non-monotonic ways                        | DP            |
| Sorting by one key makes the right choice locally obvious               | Greedy        |
| You can prove an exchange argument in one sentence                      | Greedy        |
| A DP transition always takes the same branch regardless of other state  | Greedy (simplify)|
| Counterexample exists when you try small greedy examples by hand        | DP            |

Always stress-test your greedy idea on a small adversarial example (3-5
elements) by hand before committing to it in an interview -- this is the
fastest way to catch a broken greedy strategy.

## Common Pitfalls

- Applying greedy when the problem actually requires DP (e.g. 0/1 Knapsack
  looks similar to Fractional Knapsack, but only the fractional version is
  greedy-correct; 0/1 needs DP).
- Sorting by the wrong key (e.g. sorting intervals by start when you need to
  sort by end for the "minimum removals" pattern).
- Forgetting to handle ties in the sort comparator (e.g. Non-overlapping
  Intervals needs ties broken consistently).
- Not verifying the greedy choice with a proof sketch -- leads to silently
  wrong code that passes only some test cases.
- Off-by-one when tracking "current reach" vs "next index to check" in
  jump-game style problems.

## Interview Tips

- State the greedy strategy in one sentence and give a one-sentence exchange
  argument before coding: this preempts the interviewer's "why does this
  work?" question.
- If you are not sure greedy is safe, say so explicitly: "let me test this
  greedy idea on a small example to make sure there's no counterexample."
- Many greedy problems reduce to "sort, then single linear pass" -- look for
  the right sort key first; the rest is usually simple.
- Some problems that look greedy are secretly interval-scheduling in
  disguise -- check file 16 (Intervals) if the greedy angle is not clicking.

-------------------------------------------------------------------------------

## Problem List

| Problem                                                    | LeetCode # | Difficulty | Priority | Notes                                |
|----------------------------------------------------------------|------------|------------|----------|------------------------------------------|
| Jump Game                                                        | 55         | Medium     | Must     | greedy reachability, track farthest        |
| Jump Game II                                                      | 45         | Medium     | Must     | greedy min jumps, BFS-level intuition      |
| Gas Station                                                       | 134        | Medium     | Must     | reset start on negative running tank        |
| Best Time to Buy and Sell Stock II                                 | 122        | Medium     | Must     | sum all positive deltas                    |
| Merge Intervals                                                    | 56         | Medium     | Must     | sort by start, merge overlaps (see file 16)|
| Non-overlapping Intervals                                           | 435        | Medium     | Must     | sort by end, count removals                |
| Minimum Number of Arrows to Burst Balloons                          | 452        | Medium     | Must     | sort by end, greedy sweep                  |
| Partition Labels                                                    | 763        | Medium     | Must     | track last-seen index per char             |
| Task Scheduler                                                       | 621        | Medium     | Should   | heap simulation or closed-form formula     |
| Candy                                                                | 135        | Hard       | Should   | two-pass greedy, left-to-right + right-to-left|
| Assign Cookies                                                        | 455        | Easy       | Should   | two pointers on sorted arrays              |
| Lemonade Change                                                       | 860        | Easy       | Should   | greedy change-making, track $5/$10 counts   |
| Boats to Save People                                                  | 881        | Medium     | Should   | two pointers, pair heaviest with lightest   |
| Queue Reconstruction by Height                                         | 406        | Medium     | Should   | sort then greedy insert by position         |
| Two City Scheduling                                                     | 1029       | Medium     | Should   | sort by cost difference                    |
| Remove Duplicate Letters                                                | 316        | Medium     | Should   | greedy + monotonic stack, see file 05       |
| Minimum Add to Make Parentheses Valid                                   | 921        | Easy       | Should   | greedy counter for unmatched parens         |
| Valid Parenthesis String                                                | 678        | Medium     | Should   | greedy min/max open-count range             |
| Maximum Units on a Truck                                                | 1710       | Easy       | Optional | sort by units per box descending           |
| Minimum Number of Taps to Open to Water a Garden                        | 1326       | Hard       | Optional | greedy interval covering (jump-game style) |
| Car Pooling                                                             | 1094       | Medium     | Optional | sweep line with capacity check (see file 16)|
| Reorganize String                                                       | 767        | Medium     | Optional | heap-based greedy frequency placement       |
| Meeting Rooms                                                            | 252        | Easy       | Optional | premium; sort + overlap check               |
| Meeting Rooms II                                                          | 253        | Medium     | Optional | premium; heap of end times (see file 16)   |
| Video Stitching                                                           | 1024       | Medium     | Optional | jump-game-style interval covering           |
| Split Array into Consecutive Subsequences                                  | 659        | Medium     | Optional | greedy with frequency and tail-length maps  |
