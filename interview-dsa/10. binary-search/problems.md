# Binary Search — Problems

Solve in priority order: **Must**, then **Should**, then **Optional**.

Track checkboxes in [PROBLEMS-MASTER-LIST.md](../PROBLEMS-MASTER-LIST.md).

## Problem List

Priority legend (**P** column): **M** = Must (do before any interview),
**S** = Should (do if you have another day or two), **O** = Optional
(nice-to-have breadth).

| P | Problem | LeetCode # | Difficulty | Notes/Pattern |
|---|---|---|---|---|
| M | Binary Search | 704 | Easy | Classic binary search |
| M | Search Insert Position | 35 | Easy | Leftmost boundary (lower_bound) |
| M | Find First and Last Position of Element in Sorted Array | 34 | Medium | Leftmost + rightmost boundary |
| M | Search in Rotated Sorted Array | 33 | Medium | Modified BS, determine sorted half |
| M | Find Minimum in Rotated Sorted Array | 153 | Medium | BS using `nums[mid]` vs `nums[hi]` |
| M | Koko Eating Bananas | 875 | Medium | Binary search on the answer |
| M | Capacity To Ship Packages Within D Days | 1011 | Medium | Binary search on the answer |
| M | Search a 2D Matrix | 74 | Medium | Flattened index binary search |
| M | Sqrt(x) | 69 | Easy | Binary search on the answer |
| S | Search in Rotated Sorted Array II | 81 | Medium | Same as above + duplicate handling |
| S | Find Peak Element | 162 | Medium | BS using slope comparison |
| S | Split Array Largest Sum | 410 | Hard | Binary search on the answer |
| S | Search a 2D Matrix II | 240 | Medium | Staircase search |
| S | Time Based Key-Value Store | 981 | Medium | Binary search on timestamps |
| O | Median of Two Sorted Arrays | 4 | Hard | Binary search on partition point |
| O | Minimum Number of Days to Make m Bouquets | 1482 | Medium | Binary search on the answer |
| O | Magnetic Force Between Two Balls | 1552 | Medium | Binary search on the answer (maximize minimum) |
| O | Find K Closest Elements | 658 | Medium | Binary search on window start |

## Related — do not solve twice

These appear in this topic's notes, but their **primary** LeetCode home is another folder. Solve them there.

| Problem | LeetCode # | Primary topic |
|---|---|---|
| Kth Smallest Element in a Sorted Matrix | 378 | [Heap / Priority Queue](../09. heap-priority-queue/problems.md) |
