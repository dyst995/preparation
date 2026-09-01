# 03 - Two Pointers

## Who this is for

Nika Beroshvili, Software Engineer, 4+ years experience, JS/TS background.
Two pointers is one of the highest-ROI patterns in interviews: it converts a
huge chunk of O(n^2) brute-force problems into O(n), with almost no extra
memory.

## Learning Objectives

- Recognize the difference between the three main two-pointer shapes:
  opposite-ends (converging), same-direction (fast/slow), and multi-array
  merge.
- Know exactly when two pointers requires a **sorted** input and when it
  does not.
- Implement the "fix one, two-pointer the rest" extension used in 3Sum/4Sum.
- Confidently handle duplicate-skipping logic without infinite loops or
  missed cases.
- Distinguish two pointers from sliding window (they're related but not
  identical - covered explicitly at the end of this chapter).

## Core Concepts

### 1. Opposite-ends (converging) pointers

Two indices start at the two ends of a **sorted** array (or a palindrome
check) and move toward each other based on a comparison, eliminating one
side per step.

```typescript
function twoSumSorted(nums: number[], target: number): [number, number] {
  let lo = 0;
  let hi = nums.length - 1;
  while (lo < hi) {
    const sum = nums[lo] + nums[hi];
    if (sum === target) return [lo, hi];
    if (sum < target) lo++;   // need a bigger sum -> move lo right
    else hi--;                // need a smaller sum -> move hi left
  }
  return [-1, -1];
}
```

Why this works: since the array is sorted, moving `lo` right only increases
the sum and moving `hi` left only decreases it - each step provably
eliminates one index from ever being part of a valid answer, giving O(n)
instead of O(n^2).

### 2. Same-direction (fast/slow) pointers

Both pointers move forward, but at different rates or under different
conditions. This is the shape used for in-place array editing (read/write
pointer, chapter 01) and cycle detection in linked lists (chapter 06).

```typescript
function removeDuplicatesSorted(nums: number[]): number {
  if (nums.length === 0) return 0;
  let slow = 0; // last index of the unique region
  for (let fast = 1; fast < nums.length; fast++) {
    if (nums[fast] !== nums[slow]) {
      slow++;
      nums[slow] = nums[fast];
    }
  }
  return slow + 1;
}
```

### 3. Extending to triplets: fix one, two-pointer the rest (3Sum)

Sort first, then for each index `i`, run the opposite-ends two-pointer scan
on the remaining subarray to find pairs that complete the target sum. This
turns an O(n^3) brute force into O(n^2).

```typescript
function threeSum(nums: number[]): number[][] {
  nums.sort((a, b) => a - b);
  const result: number[][] = [];

  for (let i = 0; i < nums.length - 2; i++) {
    if (i > 0 && nums[i] === nums[i - 1]) continue; // skip duplicate anchors

    let lo = i + 1;
    let hi = nums.length - 1;
    while (lo < hi) {
      const sum = nums[i] + nums[lo] + nums[hi];
      if (sum === 0) {
        result.push([nums[i], nums[lo], nums[hi]]);
        lo++; hi--;
        while (lo < hi && nums[lo] === nums[lo - 1]) lo++; // skip dup lo
        while (lo < hi && nums[hi] === nums[hi + 1]) hi--; // skip dup hi
      } else if (sum < 0) {
        lo++;
      } else {
        hi--;
      }
    }
  }
  return result;
}
```

The duplicate-skipping lines are the part people forget under pressure -
practice writing them from memory.

### 4. Merging two sorted structures

Walk two pointers, one per array/list, always advancing whichever points to
the smaller current element. Used in Merge Sorted Array, Merge Two Sorted
Lists, and as the merge step of merge sort.

```typescript
function merge(nums1: number[], m: number, nums2: number[], n: number): void {
  let i = m - 1;      // last real element in nums1
  let j = n - 1;      // last element in nums2
  let write = m + n - 1; // last writable slot in nums1

  while (j >= 0) {
    if (i >= 0 && nums1[i] > nums2[j]) {
      nums1[write--] = nums1[i--];
    } else {
      nums1[write--] = nums2[j--];
    }
  }
}
```

Note this merges **from the back** to avoid overwriting values in `nums1`
that haven't been read yet - a classic in-place merge trick.

### 5. Container / area problems

Opposite-ends pointers also solve "maximize area between two lines"
problems: always move the pointer at the **shorter** line inward, because
keeping the shorter line can never produce a better answer than moving past
it.

```typescript
function maxArea(height: number[]): number {
  let lo = 0;
  let hi = height.length - 1;
  let best = 0;
  while (lo < hi) {
    const width = hi - lo;
    const area = width * Math.min(height[lo], height[hi]);
    best = Math.max(best, area);
    if (height[lo] < height[hi]) lo++;
    else hi--;
  }
  return best;
}
```

### 6. Two pointers vs sliding window - what's the actual difference?

They overlap conceptually but are distinct tools:

- **Two pointers** typically operates on a **sorted** array/string (or a
  structure with a monotonic property) and the pointers often move toward
  each other or independently forward, frequently with **no explicit
  "window"** being tracked - you're comparing two positions, not a
  contiguous range's aggregate.
- **Sliding window** (chapter 04) always maintains a **contiguous range**
  `[left, right]` and tracks some aggregate over that range (sum, count,
  distinct characters), expanding/shrinking based on a condition. Sliding
  window pointers almost always move in the **same direction** (both only
  ever increase).

Rule of thumb: if the array must be sorted and you're looking for
pairs/triplets by value, it's two pointers. If you're looking for the
best/longest/shortest contiguous subarray/substring, it's sliding window.

## Key Patterns

| Signal in the problem statement | Likely pattern |
|---|---|
| "sorted array", "pair/triplet sums to target" | Opposite-ends two pointers |
| "palindrome check" | Opposite-ends, compare and converge |
| "remove duplicates in-place (sorted)" | Fast/slow same-direction pointers |
| "merge two sorted X" | Two pointers, one per structure |
| "container with most water", "trapping rain water" | Opposite-ends, move the limiting side |
| "3Sum"/"4Sum" style | Sort + fix k-2 indices + two-pointer the rest |
| "reverse in place" | Opposite-ends swap-and-converge |
| "cycle detection in a list" | Fast/slow (Floyd's), see chapter 06 |

## Time/Space Complexity Cheat Sheet

| Technique | Time | Space |
|---|---|---|
| Opposite-ends pair search (sorted) | O(n) | O(1) |
| 3Sum (sort + two pointers) | O(n^2) | O(1) extra (O(n) or O(log n) for sort) |
| 4Sum (nested fix + two pointers) | O(n^3) | O(1) extra |
| Merge two sorted arrays/lists | O(n + m) | O(1) if merging in place / O(n+m) if new output |
| Fast/slow in-place dedup | O(n) | O(1) |
| Container with most water | O(n) | O(1) |
| Brute force pair/triplet search (no sort, nested loops) | O(n^2) / O(n^3) | O(1) |

## Common Mistakes / Interview Tips

- **Forgetting to sort first** when the two-pointer approach depends on
  monotonicity - if the input isn't sorted and sorting doesn't break the
  problem's requirements (e.g. you still need original indices), sort a
  copy or sort index pairs, not the raw values.
- **Losing original indices after sorting.** If the answer requires
  original indices (like Two Sum on an unsorted array), either don't sort,
  or sort an array of `[value, originalIndex]` pairs.
- **Infinite loops from forgetting to move a pointer** in every branch of
  the while loop - always double check each `if`/`else if`/`else` branch
  moves at least one pointer.
- **Missing duplicate-skip logic in 3Sum/4Sum**, causing duplicate triplets
  in the output. Practice the skip-forward-while-equal idiom until it's
  automatic.
- **Off-by-one with `lo < hi` vs `lo <= hi`.** For pair-finding, use
  `lo < hi` (distinct indices) unless the problem allows using the same
  element twice.
- **Not handling the empty array or single-element edge cases** before
  initializing `hi = nums.length - 1` (could be -1 for empty arrays).
- **Merging in place from the front instead of the back** - overwrites
  unread values. Always merge in-place backward when writing into one of
  the source arrays.
- **Confusing this pattern with sliding window** and trying to track a
  window sum when you actually just need two independent comparison
  points - re-read the problem for "contiguous subarray" language, which
  signals sliding window instead.

## Hands-on Drills

1. Implement two-pointer Two Sum on a sorted array; then adapt it to return
   original indices when the input is unsorted (sort `[value, index]`
   pairs).
2. Implement `isPalindrome` on a string, ignoring non-alphanumeric
   characters and case, using opposite-ends pointers (no extra string
   allocation).
3. Implement 3Sum from scratch, including duplicate skipping, and manually
   trace it on `[-1, 0, 1, 2, -1, -4]`.
4. Implement 4Sum by adding one more fixed outer loop around the 3Sum
   pattern.
5. Implement `maxArea` (container with most water) and explain out loud why
   moving the shorter line's pointer is always safe.
6. Implement in-place merge of two sorted arrays (`nums1` has trailing
   zero-padding space), merging from the back.
7. Implement "move zeroes to the end while preserving relative order" using
   fast/slow same-direction pointers.
8. Implement "trapping rain water" using two pointers with running
   `leftMax`/`rightMax` (no extra arrays).

## Practice

The LeetCode list for this topic is in [problems.md](./problems.md). The interview code to memorize is in [common-techniques.md](./common-techniques.md). Solve **Must** first, then Should, then Optional.

## Mastery Checklist

- [ ] I can explain, in one sentence each, the difference between
      opposite-ends and same-direction two-pointer techniques.
- [ ] I can implement opposite-ends pair search on a sorted array from
      memory in under 3 minutes.
- [ ] I can implement 3Sum including correct duplicate-skipping without
      looking it up.
- [ ] I can implement in-place backward merging of two sorted arrays.
- [ ] I can explain why moving the shorter line's pointer is safe in
      Container With Most Water.
- [ ] I can clearly articulate the difference between two pointers and
      sliding window when asked.
- [ ] I have solved at least 12 of the problems above from scratch, timed.
- [ ] I can identify within 30 seconds whether a new problem needs sorting
      first for two pointers to apply.
