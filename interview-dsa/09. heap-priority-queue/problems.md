# Heap / Priority Queue — Problems

Solve in priority order: **Must**, then **Should**, then **Optional**.

Track checkboxes in [PROBLEMS-MASTER-LIST.md](../PROBLEMS-MASTER-LIST.md).

## Problem List

Priority legend (**P** column): **M** = Must (do before any interview),
**S** = Should (do if you have another day or two), **O** = Optional
(nice-to-have breadth).

| P | Problem | LeetCode # | Difficulty | Notes/Pattern |
|---|---|---|---|---|
| M | Kth Largest Element in an Array | 215 | Medium | Min-heap of size K |
| M | Last Stone Weight | 1046 | Easy | Max-heap, repeated pop-pop-push |
| M | Top K Frequent Elements | 347 | Medium | Heap of size K on frequency map |
| M | K Closest Points to Origin | 973 | Medium | Max-heap of size K by distance |
| M | Merge K Sorted Lists | 23 | Hard | Min-heap seeded with list heads |
| M | Find Median from Data Stream | 295 | Hard | Two-heap pattern |
| M | Kth Largest Element in a Stream | 703 | Easy | Persistent min-heap of size K |
| S | Kth Smallest Element in a Sorted Matrix | 378 | Medium | Min-heap over candidate cells |
| S | Task Scheduler | 621 | Medium | Max-heap by frequency, greedy |
| S | Reorganize String | 767 | Medium | Max-heap by frequency, greedy |
| S | The Skyline Problem | 218 | Hard | Max-heap of active building heights |
| O | Ugly Number II | 264 | Medium | Min-heap (or DP alternative) |
| O | Design Twitter | 355 | Medium | Min-heap merging K user feeds |
| O | IPO | 502 | Hard | Two heaps: min-heap by capital, max-heap by profit |
| O | Smallest Range Covering Elements from K Lists | 632 | Hard | Min-heap across K lists |
| O | Single-Threaded CPU | 1834 | Medium | Min-heap by (processing time, index) |

## Related — do not solve twice

These appear in this topic's notes, but their **primary** LeetCode home is another folder. Solve them there.

| Problem | LeetCode # | Primary topic |
|---|---|---|
| Meeting Rooms II | 253 | [Intervals](../16. intervals/problems.md) |
