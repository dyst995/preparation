# 10 - Binary Search (Classic BS, BS on Answer)

## Who this is for

Nika Beroshvili, Software Engineer, 4+ years experience, JS/TS background.
Binary search looks trivial until off-by-one bugs show up under pressure -
this chapter leans on ONE reusable boundary template so you stop
re-deriving the loop condition from scratch every time, and covers
"binary search on the answer," the pattern most JS/TS engineers haven't
internalized because it doesn't look like array search at all.

## Learning Objectives

By the end of this chapter you should be able to:

- Implement classic binary search on a sorted array without off-by-one
  errors.
- Implement the leftmost/rightmost occurrence variants (lower_bound /
  upper_bound) from a single reusable template.
- Recognize and implement "binary search on the answer" for optimization
  problems that don't look like sorted-array search at all.
- Search in rotated sorted arrays and 2D sorted matrices.
- State the invariant your binary search maintains at every step - this is
  the #1 thing interviewers probe.

## Core Concepts

### 1. The core idea

Binary search works on any **monotonic predicate** over an ordered search
space: a function `f(x)` that is false for a prefix of the space and true
for the rest (or vice versa). It's not restricted to "search for a value in
a sorted array" - that's just the simplest case. The general reframing:

> Given a monotonic condition, find the boundary where it flips.

This is what unlocks "binary search on the answer" problems.

### 2. Preconditions

The search space must be sorted, or have a monotonic property (once true,
always true in one direction). Verify monotonicity before reaching for
binary search - trying to binary search an unsorted, non-monotonic space
silently gives a wrong answer instead of erroring.

## Templates

### Classic binary search (find exact value)

```typescript
function binarySearch(nums: number[], target: number): number {
  let lo = 0, hi = nums.length - 1;
  while (lo <= hi) {
    const mid = lo + Math.floor((hi - lo) / 2);
    if (nums[mid] === target) return mid;
    if (nums[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}
```

Invariant: the answer, if it exists, is always within `[lo, hi]`.

### Leftmost/rightmost boundary template (the one to memorize)

This single template generalizes to almost every binary-search-on-answer
problem.

```typescript
// Find the leftmost index in [lo, hi) where predicate(index) is true.
// Assumes predicate is false...false, true...true (monotonic).
function lowerBound(lo: number, hi: number, predicate: (i: number) => boolean): number {
  while (lo < hi) {
    const mid = lo + Math.floor((hi - lo) / 2);
    if (predicate(mid)) hi = mid;      // mid could be the answer, keep it in range
    else lo = mid + 1;                 // mid is definitely not the answer
  }
  return lo; // lo === hi, the boundary
}
```

```typescript
function leftmostOccurrence(nums: number[], target: number): number {
  const idx = lowerBound(0, nums.length, (i) => nums[i] >= target);
  if (idx === nums.length || nums[idx] !== target) return -1;
  return idx;
}

function rightmostOccurrence(nums: number[], target: number): number {
  const idx = lowerBound(0, nums.length, (i) => nums[i] > target);
  if (idx === 0 || nums[idx - 1] !== target) return -1;
  return idx - 1;
}
```

### Binary search on the answer

Use this when the problem asks for a minimum/maximum value satisfying a
condition, and you can write a monotonic checker `canAchieve(x)`.

```typescript
function binarySearchOnAnswer(lo: number, hi: number, canAchieve: (x: number) => boolean): number {
  while (lo < hi) {
    const mid = lo + Math.floor((hi - lo) / 2);
    if (canAchieve(mid)) hi = mid; // mid works, try to do better
    else lo = mid + 1;             // mid doesn't work, need more
  }
  return lo;
}
```

Classic example: **Koko Eating Bananas** - find the minimum eating speed
`k` such that Koko finishes all bananas within `h` hours.

```typescript
function minEatingSpeed(piles: number[], h: number): number {
  function hoursNeeded(speed: number): number {
    let hours = 0;
    for (const pile of piles) hours += Math.ceil(pile / speed);
    return hours;
  }
  let lo = 1, hi = Math.max(...piles);
  while (lo < hi) {
    const mid = lo + Math.floor((hi - lo) / 2);
    if (hoursNeeded(mid) <= h) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}
```

Another classic with the identical skeleton: **Capacity To Ship Packages
Within D Days** - write a `canShip(capacity)` checker, then binary search
over capacity.

### Search in a rotated sorted array

```typescript
function searchRotated(nums: number[], target: number): number {
  let lo = 0, hi = nums.length - 1;
  while (lo <= hi) {
    const mid = lo + Math.floor((hi - lo) / 2);
    if (nums[mid] === target) return mid;

    if (nums[lo] <= nums[mid]) { // left half [lo, mid] is sorted
      if (nums[lo] <= target && target < nums[mid]) hi = mid - 1;
      else lo = mid + 1;
    } else {                     // right half [mid, hi] is sorted
      if (nums[mid] < target && target <= nums[hi]) lo = mid + 1;
      else hi = mid - 1;
    }
  }
  return -1;
}
```

Key idea: at every step, at least one half is properly sorted. Determine
which half, then check whether the target lies within that half's range.

### Find minimum in rotated sorted array

```typescript
function findMin(nums: number[]): number {
  let lo = 0, hi = nums.length - 1;
  while (lo < hi) {
    const mid = lo + Math.floor((hi - lo) / 2);
    if (nums[mid] > nums[hi]) lo = mid + 1; // minimum is to the right of mid
    else hi = mid;                          // mid could be the minimum
  }
  return nums[lo];
}
```

### Search a 2D matrix

If sorted as if flattened (each row's last element `<` next row's first),
treat it as 1D using index math:

```typescript
function searchMatrix(matrix: number[][], target: number): boolean {
  const rows = matrix.length, cols = matrix[0].length;
  let lo = 0, hi = rows * cols - 1;
  while (lo <= hi) {
    const mid = lo + Math.floor((hi - lo) / 2);
    const val = matrix[Math.floor(mid / cols)][mid % cols];
    if (val === target) return true;
    if (val < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return false;
}
```

If rows/columns are independently sorted but not fully flattenable, use
the **staircase search** from the top-right corner (O(rows + cols)):

```typescript
function searchMatrixII(matrix: number[][], target: number): boolean {
  let row = 0, col = matrix[0].length - 1;
  while (row < matrix.length && col >= 0) {
    if (matrix[row][col] === target) return true;
    if (matrix[row][col] > target) col--;
    else row++;
  }
  return false;
}
```

## Key Patterns

| Signal in the problem statement | Likely pattern |
|---|---|
| "Sorted array, find target" | Classic binary search |
| "Find first/last position of target" | Leftmost/rightmost boundary template |
| "Minimize the maximum" / "maximize the minimum" | Binary search on the answer |
| "Find the smallest/largest X such that condition holds" | Binary search on the answer |
| "Rotated sorted array" | Modified binary search, determine sorted half |
| "Search a 2D matrix" | Flatten index trick or staircase search |
| Answer space is huge but a checker runs fast | Binary search on the answer (the tell: brute force too slow, checker exists) |
| "Peak element" | Binary search using slope comparison |
| Scheduling/distance-minimization problems | Binary search on the answer, often disguised |

## Time/Space Complexity Cheat Sheet

| Operation | Time | Space |
|---|---|---|
| Classic binary search | O(log n) | O(1) iterative |
| Leftmost/rightmost boundary search | O(log n) | O(1) |
| Binary search on the answer | O(log(range) * checker cost) | Depends on checker |
| Search in rotated sorted array | O(log n) | O(1) |
| Search 2D matrix (flattened) | O(log(m*n)) | O(1) |
| Staircase search (2D, independently sorted) | O(m + n) | O(1) |

## Common Mistakes / Interview Tips

- **Infinite loops from a wrong midpoint/update pairing.** With
  `while (lo < hi)` and `hi = mid` when the predicate is true, always use
  `mid = lo + Math.floor((hi - lo) / 2)` (floor) so `mid` can equal `lo`
  and `hi` actually shrinks.
- **Mixing loop invariants** - don't combine `lo <= hi` / `hi = mid - 1`
  style with `lo < hi` / `hi = mid` style in the same function.
- **Off-by-one when narrowing the range** - `hi = mid` vs `hi = mid - 1`
  mistakes cause missed answers or infinite loops.
- **Not verifying monotonicity before reaching for binary search** - a
  non-monotonic `canAchieve(x)` gives a silently wrong answer.
- **Not handling duplicates in rotated array search** (LC 81) - requires
  an extra `nums[lo] === nums[mid]` shrink-both-ends check that's easy to
  forget.
- **Confusing "search space" with "input array"** - in binary-search-on-
  answer problems you're searching over possible ANSWERS, not indices.
- **Missing a hidden binary search opportunity** because the problem
  doesn't look like "sorted array" on the surface (Koko Eating Bananas
  looks like a simulation problem at first glance).
- **Wrong direction on boundary movement**, e.g. writing `lo = mid`
  instead of `lo = mid + 1` when the predicate is false - `lo` never
  advances past `mid`, causing an infinite loop.
- **Not testing edge cases**: empty array, single element, target smaller
  or larger than all elements, target absent.

## Hands-on Drills

1. Implement classic binary search iteratively and recursively; verify
   both handle empty and single-element arrays.
2. Implement `lowerBound`/`upperBound` from the boundary template and use
   them to solve "Find First and Last Position of Element in Sorted
   Array".
3. Solve Koko Eating Bananas by first writing and testing the
   `hoursNeeded(speed)` checker in isolation, then wrap it in binary
   search.
4. Implement search in a rotated sorted array; write out by hand which
   half is sorted for 3 different rotation points before coding.
5. Implement `findMin` for a rotated sorted array and explain why
   comparing `nums[mid]` to `nums[hi]` (not `nums[lo]`) is the robust
   choice.
6. Implement the staircase search for a row/column sorted matrix and
   compare its complexity to flattening + binary search.
7. Solve Capacity To Ship Packages Within D Days end to end, including
   deriving the `lo`/`hi` bounds.
8. Time yourself writing the leftmost-boundary template from memory in
   under 3 minutes; repeat daily until automatic.

## Practice

The LeetCode list for this topic is in [problems.md](./problems.md). The interview code to memorize is in [common-techniques.md](./common-techniques.md). Solve **Must** first, then Should, then Optional.

## Mastery Checklist

- [ ] I can write classic binary search with zero off-by-one bugs on the
      first try.
- [ ] I can write the leftmost/rightmost boundary template from memory.
- [ ] I can identify when a problem is secretly "binary search on the
      answer" even when it doesn't mention sorting.
- [ ] I can design a `canAchieve(x)` checker function and argue why it's
      monotonic.
- [ ] I can search a rotated sorted array, including reasoning about
      which half is sorted at each step.
- [ ] I can handle duplicates in a rotated sorted array search.
- [ ] I can search a 2D matrix using both the flattened-index trick and
      the staircase method, and know when each applies.
- [ ] I never mix `lo <= hi`/`hi = mid - 1` style with `lo < hi`/`hi = mid`
      style within the same function.
- [ ] I can state the complexity of a binary-search-on-answer solution as
      O(log(range) * checker cost).
- [ ] I have solved at least 12 of the problems above from scratch, timed.
