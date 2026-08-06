# 11 - Sorting (Concepts + When Sorting Helps)

## Who this is for

Nika Beroshvili, Software Engineer, 4+ years experience, JS/TS background.
You already call `.sort()` daily - this chapter is less about "how does
merge sort work" trivia and more about the interview-relevant skill: **spot
when sorting first turns an O(n^2) problem into O(n log n) + O(n)**, and be
ready to implement merge sort/quicksort/quickselect from scratch when asked.

## Learning Objectives

By the end of this chapter you should be able to:

- Implement merge sort and quicksort from scratch, and explain their
  complexity and stability.
- Explain the difference between comparison-based sorts (O(n log n) lower
  bound) and non-comparison sorts (counting sort, bucket sort).
- Know what "stable" means and when it matters.
- Recognize when sorting FIRST turns a hard problem into an easy one - a
  large fraction of interview problems reduce to "sort, then...".
- Implement quickselect for "Kth largest/smallest" as an O(n)-average
  alternative to a heap.
- Know JavaScript's `Array.prototype.sort()` behavior and its pitfalls.

## Core Concepts

### 1. Why sorting is a "swiss army knife" pattern

Sorting imposes order on otherwise unordered data, which unlocks:

- **Two-pointer techniques** (chapter 03) - only correct on sorted data
  (Two Sum II, 3Sum, container with most water).
- **Binary search** (chapter 10) - needs sorted data.
- **Grouping by proximity** - equal/related items become adjacent (merge
  intervals, anagram grouping after sorting each string's characters).
- **Greedy algorithms** - many greedy proofs rely on processing items in
  sorted order (interval scheduling, task assignment).
- **Deduplication** - duplicates become adjacent, trivial to skip.

Rule of thumb: if a brute force is O(n^2) because it needs "for every
element, find some related element," ask whether sorting first reduces it
to O(n log n) + O(n).

### 2. Comparison-based sorting lower bound

Any comparison-based sort (only compares pairs of elements) has an
information-theoretic lower bound of O(n log n). Merge sort, quicksort, and
heapsort can't be beaten asymptotically by another comparison sort. Going
faster (O(n)) requires exploiting structure in the data - that's what
counting sort / radix sort / bucket sort do.

### 3. Stability

A sort is **stable** if elements that compare equal keep their original
relative order. Matters for multi-key sorts (sort by age, then by name,
and same-named people should stay in age order).

| Algorithm | Stable? |
|---|---|
| Merge sort | Yes |
| Insertion sort | Yes |
| Quicksort (typical in-place) | No |
| Heapsort | No |
| Counting sort | Yes (if implemented carefully) |
| `Array.prototype.sort()` (modern engines, ES2019+) | Yes (spec-guaranteed) |

### 4. In-place vs extra space

**In-place** (O(1) extra space, ignoring recursion stack): quicksort,
heapsort, insertion sort. **Not in-place** (O(n) extra space): classic
merge sort, counting sort, radix sort.

## Algorithms Reference

### Merge sort (divide and conquer, stable, O(n log n) guaranteed)

```typescript
function mergeSort(arr: number[]): number[] {
  if (arr.length <= 1) return arr;
  const mid = Math.floor(arr.length / 2);
  const left = mergeSort(arr.slice(0, mid));
  const right = mergeSort(arr.slice(mid));
  return merge(left, right);
}

function merge(left: number[], right: number[]): number[] {
  const result: number[] = [];
  let i = 0, j = 0;
  while (i < left.length && j < right.length) {
    if (left[i] <= right[j]) result.push(left[i++]); // <= keeps it stable
    else result.push(right[j++]);
  }
  return result.concat(left.slice(i)).concat(right.slice(j));
}
```

Guaranteed O(n log n) in ALL cases (best, average, worst) - unlike
quicksort. Also the basis for merge sort on linked lists and counting
inversions (count cross-pairs during merge).

### Quicksort (in-place, fast in practice, O(n^2) worst case)

```typescript
function quickSort(arr: number[], lo = 0, hi = arr.length - 1): number[] {
  if (lo >= hi) return arr;
  const pivotIndex = partition(arr, lo, hi);
  quickSort(arr, lo, pivotIndex - 1);
  quickSort(arr, pivotIndex + 1, hi);
  return arr;
}

function partition(arr: number[], lo: number, hi: number): number {
  const randomIndex = lo + Math.floor(Math.random() * (hi - lo + 1)); // avoid worst case on sorted input
  [arr[randomIndex], arr[hi]] = [arr[hi], arr[randomIndex]];
  const pivot = arr[hi];
  let i = lo;
  for (let j = lo; j < hi; j++) {
    if (arr[j] < pivot) { [arr[i], arr[j]] = [arr[j], arr[i]]; i++; }
  }
  [arr[i], arr[hi]] = [arr[hi], arr[i]];
  return i;
}
```

Average O(n log n), worst case O(n^2) - mitigated in practice by random
pivot selection, worth mentioning explicitly in interviews.

### Quickselect (Kth largest/smallest in average O(n))

Same partitioning as quicksort, but recurse into only the side containing
the target index.

```typescript
function quickSelect(arr: number[], k: number): number {
  let lo = 0, hi = arr.length - 1;
  const targetIndex = k - 1; // kth smallest, 1-indexed
  while (true) {
    const pivotIndex = partition(arr, lo, hi);
    if (pivotIndex === targetIndex) return arr[pivotIndex];
    if (pivotIndex < targetIndex) lo = pivotIndex + 1;
    else hi = pivotIndex - 1;
  }
}
```

Average O(n), worst case O(n^2) (mitigated by random pivot). The classic
alternative to a heap for "Kth largest element" (see chapter 09).

### Counting sort (non-comparison, O(n + k), stable)

Works when values are integers in a known, small range `[0, k]`.

```typescript
function countingSort(arr: number[], maxValue: number): number[] {
  const counts = new Array(maxValue + 1).fill(0);
  for (const num of arr) counts[num]++;
  const result: number[] = [];
  for (let val = 0; val <= maxValue; val++) {
    for (let i = 0; i < counts[val]; i++) result.push(val);
  }
  return result;
}
```

Great for "sort an array of 0s, 1s, and 2s" (Dutch National Flag) or "sort
characters by frequency."

### Bucket sort by frequency (Top K Frequent, O(n))

```typescript
function bucketSortByFrequency(nums: number[]): number[] {
  const freqMap = new Map<number, number>();
  for (const n of nums) freqMap.set(n, (freqMap.get(n) || 0) + 1);

  const buckets: number[][] = Array.from({ length: nums.length + 1 }, () => []);
  for (const [num, freq] of freqMap) buckets[freq].push(num);

  const result: number[] = [];
  for (let freq = buckets.length - 1; freq >= 0; freq--) {
    for (const num of buckets[freq]) result.push(num);
  }
  return result;
}
```

Solves Top K Frequent Elements in O(n) - an alternative to the heap-based
O(n log k) approach from chapter 09.

### Dutch National Flag (3-way partition, single pass)

Sort an array of only 3 distinct values in one pass, O(n) time, O(1) space,
without counting sort's two passes.

```typescript
function sortColors(nums: number[]): void {
  let low = 0, mid = 0, high = nums.length - 1;
  while (mid <= high) {
    if (nums[mid] === 0) { [nums[low], nums[mid]] = [nums[mid], nums[low]]; low++; mid++; }
    else if (nums[mid] === 1) { mid++; }
    else { [nums[mid], nums[high]] = [nums[high], nums[mid]]; high--; } // don't advance mid here
  }
}
```

## JavaScript's Built-in `Array.prototype.sort()`

```typescript
[10, 2, 33, 4].sort();                // [10, 2, 33, 4] -> WRONG, default is lexicographic (string) order
[10, 2, 33, 4].sort((a, b) => a - b); // [2, 4, 10, 33] -> correct numeric ascending
```

The default comparator converts elements to strings - the #1 JS-specific
sorting gotcha. Always pass an explicit comparator for numbers. Modern
engines (V8/Node, spec-mandated since ES2019) use a stable sort (typically
TimSort), O(n log n) worst case. `sort()` mutates in place - use
`[...arr].sort(...)` to preserve the original.

## Patterns: Sort First, Then...

```typescript
// Two pointers after sorting
function twoSumSorted(nums: number[], target: number): [number, number] {
  let lo = 0, hi = nums.length - 1;
  while (lo < hi) {
    const sum = nums[lo] + nums[hi];
    if (sum === target) return [lo, hi];
    if (sum < target) lo++; else hi--;
  }
  return [-1, -1];
}

// Merge intervals: sort by START time first
function mergeIntervals(intervals: number[][]): number[][] {
  intervals.sort((a, b) => a[0] - b[0]);
  const merged: number[][] = [intervals[0]];
  for (let i = 1; i < intervals.length; i++) {
    const last = merged[merged.length - 1];
    const curr = intervals[i];
    if (curr[0] <= last[1]) last[1] = Math.max(last[1], curr[1]);
    else merged.push(curr);
  }
  return merged;
}

// Greedy interval scheduling: sort by END time
function eraseOverlapIntervals(intervals: number[][]): number {
  intervals.sort((a, b) => a[1] - b[1]);
  let removals = 0, lastEnd = -Infinity;
  for (const [start, end] of intervals) {
    if (start >= lastEnd) lastEnd = end;
    else removals++;
  }
  return removals;
}
```

## Key Patterns

| Signal in the problem statement | Likely pattern |
|---|---|
| Need pairs/triples summing to a target | Sort + two pointers |
| "Merge overlapping intervals" | Sort by start time |
| "Maximum non-overlapping intervals" / "minimum removals" | Sort by end time (greedy) |
| "Group anagrams" | Sort each string's characters as a key |
| Values restricted to a small range | Counting sort |
| "Top K frequent" with a linear time constraint | Bucket sort by frequency |
| "Kth largest/smallest," average O(n) desired | Quickselect |
| Need a custom multi-key sort | Comparator returning `a.x - b.x || a.y - b.y`, relies on stability |

## Time/Space Complexity Cheat Sheet

| Algorithm | Best | Average | Worst | Space | Stable |
|---|---|---|---|---|---|
| Insertion sort | O(n) | O(n^2) | O(n^2) | O(1) | Yes |
| Merge sort | O(n log n) | O(n log n) | O(n log n) | O(n) | Yes |
| Quicksort (random pivot) | O(n log n) | O(n log n) | O(n^2) | O(log n) stack | No |
| Heapsort | O(n log n) | O(n log n) | O(n log n) | O(1) | No |
| Counting sort | O(n + k) | O(n + k) | O(n + k) | O(k) | Yes |
| Quickselect (Kth element) | O(n) | O(n) | O(n^2) | O(1) | N/A |
| JS `Array.prototype.sort()` | - | O(n log n) | O(n log n) | O(log n) - O(n) | Yes |

`k` = value range for counting sort.

## Common Mistakes / Interview Tips

- **Using `.sort()` without a comparator on numbers** - `[10, 2, 33].sort()`
  sorts as strings, not numerically. Always pass `(a, b) => a - b`.
- **Calling sort inside a loop**, accidentally creating O(n^2 log n) -
  sort once outside loops when possible.
- **Assuming quicksort's worst case won't happen** - on already-sorted or
  adversarial input, naive last-element-pivot quicksort degrades to
  O(n^2). Use a random pivot.
- **Ignoring stability when it matters** - sorting objects by score while
  expecting original insertion order preserved among ties, then using an
  unstable sort.
- **Applying counting/bucket sort to unbounded or non-integer data** where
  it doesn't apply - these need known, bounded structure.
- **Forgetting `Array.prototype.sort()` mutates the input** - clone first
  with `[...arr]` if the original order is needed elsewhere.
- **Mixing up "sort by end" vs "sort by start"** in interval problems -
  merging needs START order, max-non-overlapping-count needs END order.
- **Recomputing an expensive sort key inside the comparator repeatedly**
  instead of precomputing keys once (decorate-sort-undecorate).
- **Forgetting quickselect's worst-case O(n^2)** without random pivoting.

## Hands-on Drills

1. Implement merge sort from scratch (including `merge`) and verify it's
   stable using an array of `[value, originalIndex]` pairs.
2. Implement quicksort with random pivot selection; test on an
   already-sorted array of 1000 elements and confirm it doesn't blow the
   call stack.
3. Implement quickselect and use it to find the median of an unsorted
   array in average O(n).
4. Implement counting sort for an array of integers in range `[0, 100]`.
5. Solve "Sort Colors" (Dutch National Flag) in a single pass with O(1)
   extra space.
6. Solve "Top K Frequent Elements" using bucket sort by frequency, then
   re-solve using a heap (chapter 09), and compare the two approaches.
7. Write a comparator-based sort for `{name, age}` objects that sorts by
   age ascending, then name ascending for ties.
8. Implement "Merge Intervals" and "Non-overlapping Intervals" back to
   back, explicitly noting which sorts by start vs end and why.

## Problem List

Priority legend (**P** column): **M** = Must (do before any interview),
**S** = Should (do if you have another day or two), **O** = Optional
(nice-to-have breadth).

| P | Problem | LeetCode # | Difficulty | Notes/Pattern |
|---|---|---|---|---|
| M | Sort an Array | 912 | Medium | Implement merge sort or quicksort from scratch |
| M | Merge Intervals | 56 | Medium | Sort by start time, then merge |
| M | Non-overlapping Intervals | 435 | Medium | Sort by end time, greedy |
| M | Sort Colors | 75 | Medium | Dutch National Flag, one-pass 3-way partition |
| M | Kth Largest Element in an Array | 215 | Medium | Quickselect (compare to heap approach) |
| M | Top K Frequent Elements | 347 | Medium | Bucket sort by frequency |
| M | Group Anagrams | 49 | Medium | Sort each string as grouping key |
| M | Merge Sorted Array | 88 | Easy | In-place merge from the back |
| S | Largest Number | 179 | Medium | Custom comparator sort |
| S | Meeting Rooms | 252 (Premium) | Easy | Sort by start time, check overlap |
| S | Meeting Rooms II | 253 (Premium) | Medium | Sort + heap (see chapter 09) |
| S | H-Index | 274 | Medium | Sort descending + linear scan |
| S | Valid Anagram | 242 | Easy | Sort both strings and compare (or frequency map) |
| O | Wiggle Sort II | 324 | Medium | Sort + strategic placement |
| O | Relative Sort Array | 1122 | Easy | Counting sort with custom order |
| O | Maximum Gap | 164 | Hard | Bucket sort / radix sort, O(n) requirement |
| O | Car Pooling | 1094 | Medium | Sort events (pickup/dropoff) + sweep |
| O | Minimum Number of Arrows to Burst Balloons | 452 | Medium | Sort by end coordinate, greedy |
| O | Queue Reconstruction by Height | 406 | Medium | Sort by height desc, then insert by position |

## Mastery Checklist

- [ ] I can implement merge sort from scratch, including the merge step,
      and explain why it's O(n log n) in all cases.
- [ ] I can implement quicksort with randomized pivot selection and
      explain its average vs worst-case complexity.
- [ ] I can implement quickselect for Kth largest/smallest in average
      O(n).
- [ ] I know what "stable" means and can name which common sorts are
      stable vs not.
- [ ] I always pass an explicit numeric comparator to `.sort()`.
- [ ] I can implement counting sort and explain when it beats comparison
      sorts.
- [ ] I can implement the Dutch National Flag one-pass 3-way partition.
- [ ] I recognize "sort by start" vs "sort by end" for interval problems
      and choose correctly every time.
- [ ] I can spot when a problem becomes trivial after sorting within the
      first minute of reading it.
- [ ] I have solved at least 12 of the problems above from scratch, timed.
