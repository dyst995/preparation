# Greedy — Problems

Solve in priority order: **Must**, then **Should**, then **Optional**.

Track checkboxes in [PROBLEMS-MASTER-LIST.md](../PROBLEMS-MASTER-LIST.md).

## Problem List

| Problem                                                    | LeetCode # | Difficulty | Priority | Notes                                |
|----------------------------------------------------------------|------------|------------|----------|------------------------------------------|
| Jump Game                                                        | 55         | Medium     | Must     | greedy reachability, track farthest        |
| Jump Game II                                                      | 45         | Medium     | Must     | greedy min jumps, BFS-level intuition      |
| Gas Station                                                       | 134        | Medium     | Must     | reset start on negative running tank        |
| Best Time to Buy and Sell Stock II                                 | 122        | Medium     | Must     | sum all positive deltas                    |
| Partition Labels                                                    | 763        | Medium     | Must     | track last-seen index per char             |
| Candy                                                                | 135        | Hard       | Should   | two-pass greedy, left-to-right + right-to-left|
| Assign Cookies                                                        | 455        | Easy       | Should   | two pointers on sorted arrays              |
| Lemonade Change                                                       | 860        | Easy       | Should   | greedy change-making, track $5/$10 counts   |
| Boats to Save People                                                  | 881        | Medium     | Should   | two pointers, pair heaviest with lightest   |
| Queue Reconstruction by Height                                         | 406        | Medium     | Should   | sort then greedy insert by position         |
| Two City Scheduling                                                     | 1029       | Medium     | Should   | sort by cost difference                    |
| Remove Duplicate Letters                                                | 316        | Medium     | Should   | greedy + monotonic stack, see [05. stack-queue](../05. stack-queue/notes.md) |
| Minimum Add to Make Parentheses Valid                                   | 921        | Easy       | Should   | greedy counter for unmatched parens         |
| Valid Parenthesis String                                                | 678        | Medium     | Should   | greedy min/max open-count range             |
| Maximum Units on a Truck                                                | 1710       | Easy       | Optional | sort by units per box descending           |
| Minimum Number of Taps to Open to Water a Garden                        | 1326       | Hard       | Optional | greedy interval covering (jump-game style) |
| Video Stitching                                                           | 1024       | Medium     | Optional | jump-game-style interval covering           |
| Split Array into Consecutive Subsequences                                  | 659        | Medium     | Optional | greedy with frequency and tail-length maps  |

## Related — do not solve twice

These appear in this topic's notes, but their **primary** LeetCode home is another folder. Solve them there.

| Problem | LeetCode # | Primary topic |
|---|---|---|
| Merge Intervals | 56 | [Intervals](../16. intervals/problems.md) |
| Meeting Rooms | 252 | [Intervals](../16. intervals/problems.md) |
| Meeting Rooms II | 253 | [Intervals](../16. intervals/problems.md) |
| Non-overlapping Intervals | 435 | [Intervals](../16. intervals/problems.md) |
| Minimum Number of Arrows to Burst Balloons | 452 | [Intervals](../16. intervals/problems.md) |
| Task Scheduler | 621 | [Heap / Priority Queue](../09. heap-priority-queue/problems.md) |
| Reorganize String | 767 | [Heap / Priority Queue](../09. heap-priority-queue/problems.md) |
| Car Pooling | 1094 | [Intervals](../16. intervals/problems.md) |
