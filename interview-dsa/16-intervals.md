# 16. Intervals

## Overview

Interval problems represent data as `[start, end]` ranges and ask you to
merge, insert, count overlaps, or schedule them. They are almost always
solved by SORTING first (by start or by end, depending on the question) and
then doing a single linear sweep. The hard part is picking the right sort
key and correctly defining what counts as "overlapping" (`<` vs `<=` at the
boundary).

## When to Suspect Intervals

- Input is a list of `[start, end]` pairs (meetings, bookings, ranges).
- Keywords: "merge", "overlap", "insert", "meeting rooms", "free time",
  "minimum number of platforms/rooms", "conflicting events."
- The problem can be visualized as bars on a timeline.
- "Minimum number of arrows/removals to eliminate overlaps" (interval
  scheduling, greedy -- see file 14 too).

-------------------------------------------------------------------------------

## Core Definitions

- Two intervals `[a, b]` and `[c, d]` overlap if `a <= d and c <= b`.
- "Touching" intervals like `[1,2]` and `[2,3]` may or may not count as
  overlapping depending on the problem -- always clarify with the
  interviewer whether the interval is inclusive/exclusive at the boundary.
- Sort by start when you build up merged ranges left to right.
- Sort by end when you are doing greedy interval SELECTION (max number of
  non-overlapping intervals, min arrows) because ending earliest leaves the
  most room for future intervals.

-------------------------------------------------------------------------------

## Pattern 1: Merge Overlapping Intervals

Sort by start. Keep a running "current merged interval"; extend its end if
the next interval overlaps, otherwise close it out and start a new one.

```python
def merge(intervals):  # LC 56
    intervals.sort(key=lambda x: x[0])
    merged = [intervals[0]]
    for start, end in intervals[1:]:
        last_end = merged[-1][1]
        if start <= last_end:
            merged[-1][1] = max(last_end, end)
        else:
            merged.append([start, end])
    return merged
```

## Pattern 2: Insert a New Interval into a Sorted, Non-overlapping List

Three phases: add all intervals strictly before the new one, merge all
overlapping intervals into the new one, then add all intervals strictly
after.

```python
def insert(intervals, new_interval):  # LC 57
    result = []
    i, n = 0, len(intervals)
    while i < n and intervals[i][1] < new_interval[0]:
        result.append(intervals[i])
        i += 1
    while i < n and intervals[i][0] <= new_interval[1]:
        new_interval[0] = min(new_interval[0], intervals[i][0])
        new_interval[1] = max(new_interval[1], intervals[i][1])
        i += 1
    result.append(new_interval)
    while i < n:
        result.append(intervals[i])
        i += 1
    return result
```

## Pattern 3: Greedy Interval Selection (Sort by END)

Maximize the number of non-overlapping intervals you can keep, or minimize
the number to remove. Always sort by END time -- greedily keep an interval
if its start is >= the end of the last kept interval.

```python
def erase_overlap_intervals(intervals):  # LC 435
    intervals.sort(key=lambda x: x[1])
    count, prev_end = 0, float('-inf')
    for start, end in intervals:
        if start >= prev_end:
            prev_end = end
        else:
            count += 1  # remove this interval
    return count

def find_min_arrow_shots(points):  # LC 452
    if not points:
        return 0
    points.sort(key=lambda x: x[1])
    arrows, end = 1, points[0][1]
    for start, e in points[1:]:
        if start > end:
            arrows += 1
            end = e
    return arrows
```

## Pattern 4: Sweep Line for Counting Overlaps (Meeting Rooms II style)

Turn every interval into two events: `+1` at start, `-1` at end. Sort all
events by time and sweep, tracking the running count -- the maximum running
count is the answer (e.g. minimum meeting rooms needed).

```python
def min_meeting_rooms(intervals):  # LC 253
    starts = sorted(i[0] for i in intervals)
    ends = sorted(i[1] for i in intervals)
    rooms = max_rooms = 0
    s = e = 0
    while s < len(starts):
        if starts[s] < ends[e]:
            rooms += 1
            s += 1
        else:
            rooms -= 1
            e += 1
        max_rooms = max(max_rooms, rooms)
    return max_rooms
```

Alternative with a heap of end times (also very common to present):

```python
import heapq

def min_meeting_rooms_heap(intervals):
    if not intervals:
        return 0
    intervals.sort(key=lambda x: x[0])
    heap = []  # stores end times of rooms in use
    for start, end in intervals:
        if heap and heap[0] <= start:
            heapq.heapreplace(heap, end)
        else:
            heapq.heappush(heap, end)
    return len(heap)
```

## Pattern 5: Interval Intersection (Two Sorted Lists)

Two pointers, one per list; compute the overlap of the current pair, then
advance whichever interval ends first.

```python
def interval_intersection(first_list, second_list):  # LC 986
    result = []
    i = j = 0
    while i < len(first_list) and j < len(second_list):
        start = max(first_list[i][0], second_list[j][0])
        end = min(first_list[i][1], second_list[j][1])
        if start <= end:
            result.append([start, end])
        if first_list[i][1] < second_list[j][1]:
            i += 1
        else:
            j += 1
    return result
```

## Pattern 6: Data Structure That Supports Dynamic Interval Insertion

When intervals arrive one at a time and you must repeatedly check for
conflicts (My Calendar family), maintain a sorted container (e.g. a
balanced structure, sorted list with binary search, or a simple list scan
for small n) and binary-search for overlap on each insert.

```python
import bisect

class MyCalendar:  # LC 729
    def __init__(self):
        self.starts = []
        self.bookings = []

    def book(self, start, end):
        idx = bisect.bisect_right(self.starts, start)
        if idx > 0 and self.bookings[idx - 1][1] > start:
            return False
        if idx < len(self.bookings) and self.bookings[idx][0] < end:
            return False
        self.starts.insert(idx, start)
        self.bookings.insert(idx, (start, end))
        return True
```

-------------------------------------------------------------------------------

## Interval Pattern Decision Table

| Goal                                                          | Sort key       | Technique                     |
|-------------------------------------------------------------------|-----------------|----------------------------------|
| Merge all overlapping ranges                                        | start            | linear sweep, extend/close       |
| Insert one new interval into sorted list                             | (already sorted) | 3-phase scan                     |
| Max intervals you can keep without overlap                            | end              | greedy keep-if-start>=prev_end   |
| Min removals to eliminate all overlaps                                | end              | greedy, same as above            |
| Min arrows/points to cover all intervals                              | end              | greedy sweep                     |
| Min rooms/resources needed at peak overlap                            | start and end separately, or heap | sweep line / heap of end times |
| Intersection of two interval lists                                    | (already sorted) | two pointers                     |
| Repeated dynamic insert-with-conflict-check                            | maintain sorted  | binary search on insert          |

-------------------------------------------------------------------------------

## Common Pitfalls

- Boundary ambiguity: `[1,2]` and `[2,3]` -- decide if touching counts as
  overlapping and be consistent (usually `start <= end` means overlap,
  `start < end` means no overlap at a shared boundary point).
- Sorting by the wrong key: sorting by start when the greedy selection
  problem actually requires sorting by end (very common mistake).
  Sorting by start does NOT give the correct greedy answer for max
  non-overlapping selection.
- Forgetting to handle the empty input case (`return 0` or `return []`
  early).
- Mutating the input list while iterating over it (build a new result list
  instead).
- Using `intervals[i][1] < intervals[i-1][1]` instead of properly tracking
  the running max end when merging (a later interval can be a strict subset
  of an earlier one).

## Interview Tips

- Always say "I'll sort by X because..." out loud -- this is the crux of
  almost every interval problem and shows you understand WHY, not just
  memorized code.
- Draw the intervals as horizontal bars on a number line -- this makes
  merge/overlap logic and off-by-one boundary decisions much clearer for
  both you and the interviewer.
- If a problem seems like intervals but has a "how many rooms/resources at
  once" flavor, immediately think sweep line or heap of end times.
- Clarify inclusive vs exclusive endpoints early -- it changes `<` vs `<=`
  throughout your solution.

-------------------------------------------------------------------------------

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
| Partition Labels                                                  | 763        | Medium     | Optional | interval-merge framing, see file 14       |
| Video Stitching                                                    | 1024       | Medium     | Optional | interval covering, see file 14            |
| Range Module                                                       | 715        | Hard       | Optional | design a dynamic interval container       |
| Data Stream as Disjoint Intervals                                    | 352        | Hard       | Optional | maintain merged intervals incrementally   |
| The Skyline Problem                                                  | 218        | Hard       | Optional | sweep line with heap, classic hard        |
