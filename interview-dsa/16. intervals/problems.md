# Intervals — Problems

Solve in priority order: **Must**, then **Should**, then **Optional**.

Track checkboxes in [PROBLEMS-MASTER-LIST.md](../PROBLEMS-MASTER-LIST.md).

## Problem List

| Problem                                              | LeetCode # | Difficulty | Priority | Notes                              |
|----------------------------------------------------------|------------|------------|----------|----------------------------------------|
| Merge Intervals                                            | 56         | Medium     | Must     | sort by start, linear sweep             |
| Insert Interval                                             | 57         | Medium     | Must     | 3-phase scan                            |
| Non-overlapping Intervals                                    | 435        | Medium     | Must     | sort by end, greedy count removals      |
| Meeting Rooms                                                | 252        | Easy       | Must     | premium; sort by start, check overlap    |
| Meeting Rooms II                                              | 253        | Medium     | Must     | premium; sweep line or heap of ends      |
| Minimum Number of Arrows to Burst Balloons                    | 452        | Medium     | Must     | sort by end, greedy sweep               |
| Interval List Intersections                                    | 986        | Medium     | Should   | two pointers on sorted lists            |
| My Calendar I                                                   | 729        | Medium     | Should   | dynamic insert + conflict check          |
| My Calendar II                                                  | 731        | Medium     | Should   | track double-booked overlaps            |
| My Calendar III                                                  | 732        | Hard       | Should   | sweep line, max concurrent bookings      |
| Car Pooling                                                       | 1094       | Medium     | Should   | sweep line with capacity delta            |
| Remove Covered Intervals                                          | 1288       | Medium     | Should   | sort by start asc, end desc              |
| Minimum Interval to Include Each Query                            | 1851       | Hard       | Optional | offline queries + heap                    |
| Employee Free Time                                                | 759        | Hard       | Optional | premium; merge all then find gaps         |
| Video Stitching                                                    | 1024       | Medium     | Optional | interval covering, see [14. greedy](../14. greedy/notes.md)            |
| Range Module                                                       | 715        | Hard       | Optional | design a dynamic interval container       |
| Data Stream as Disjoint Intervals                                    | 352        | Hard       | Optional | maintain merged intervals incrementally   |

## Related — do not solve twice

These appear in this topic's notes, but their **primary** LeetCode home is another folder. Solve them there.

| Problem | LeetCode # | Primary topic |
|---|---|---|
| The Skyline Problem | 218 | [Heap / Priority Queue](../09. heap-priority-queue/problems.md) |
| Partition Labels | 763 | [Greedy](../14. greedy/problems.md) |
