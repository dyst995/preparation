# 01 - Arrays & Strings

## Who this is for

Nika Beroshvili, Software Engineer, 4+ years experience, coming from a JS/TS
background, preparing for technical interviews. This guide assumes you already
know how to write code - it focuses on the interview-relevant patterns, not
CS-101 theory.

## Learning Objectives

By the end of this chapter you should be able to:

- Explain how JS arrays and strings are represented under the hood and what
  that means for time complexity of common operations.
- Recognize the 8-10 recurring array/string patterns that cover the vast
  majority of "Easy" and "Medium" interview questions.
- Implement in-place array manipulation without extra space when asked.
- Reason about time/space complexity out loud, unprompted, for any solution
  you propose.
- Avoid the most common off-by-one and mutation bugs under interview pressure.

## Core Concepts

### 1. How arrays actually behave in JS/TS

A JS array is not a fixed-size contiguous block like a C array - it is a
dynamic array (like a growable vector) backed by contiguous memory when it
holds a dense range of same-typed values (V8 uses "packed" representations),
but it degrades to a slower hash-map-like mode if you create holes or mix
types. For interview purposes, treat it as a dynamic array:

- Index access `arr[i]`: O(1)
- `push` / `pop` (end of array): O(1) amortized
- `shift` / `unshift` (start of array): O(n) - every element must shift
- `splice(i, 0, x)` insert in middle: O(n)
- `includes` / `indexOf` / linear `find`: O(n)
- `sort()`: O(n log n), and note - JS sort is stable since ES2019, but it
  sorts by **string comparison by default** unless you pass a comparator:

```typescript
[10, 2, 33, 4].sort();               // [10, 2, 33, 4] -> WRONG numeric order
[10, 2, 33, 4].sort((a, b) => a - b); // [2, 4, 10, 33] -> correct
```

This is a classic interview gotcha - always pass a comparator for numbers.

### 2. Strings are immutable

Every "modification" to a string (`slice`, `+`, `replace`, `split.join`)
creates a brand-new string. Concatenating a string in a loop with `+=` is
O(n) per operation, so building a string of length n character-by-character
in a loop is O(n^2) total. The fix: push characters into an array and
`.join('')` at the end (O(n) total), or use a mutable structure if the
language allows it.

```typescript
// BAD: O(n^2)
let result = '';
for (const ch of chars) result += ch;

// GOOD: O(n)
const parts: string[] = [];
for (const ch of chars) parts.push(ch);
const result2 = parts.join('');
```

### 3. In-place manipulation

"In-place" means O(1) extra space (besides the input/output), commonly
required for array problems like "remove duplicates," "move zeroes," or
"rotate array." The classic technique is the **two-index (read/write)
pointer**:

```typescript
function removeElement(nums: number[], val: number): number {
  let writeIdx = 0;
  for (let readIdx = 0; readIdx < nums.length; readIdx++) {
    if (nums[readIdx] !== val) {
      nums[writeIdx] = nums[readIdx];
      writeIdx++;
    }
  }
  return writeIdx; // new logical length
}
```

### 4. Prefix sums

Precompute cumulative sums so any range-sum query becomes O(1) after O(n)
preprocessing. Extremely common building block for subarray-sum problems.

```typescript
function buildPrefix(nums: number[]): number[] {
  const prefix = new Array(nums.length + 1).fill(0);
  for (let i = 0; i < nums.length; i++) {
    prefix[i + 1] = prefix[i] + nums[i];
  }
  return prefix; // prefix[j] - prefix[i] = sum of nums[i..j-1]
}
```

Combine prefix sums with a hash map (see chapter 02) to solve "subarray sum
equals K" in O(n).

### 5. Rotating / reversing in-place

The "reverse three times" trick rotates an array by k without extra space:

```typescript
function rotate(nums: number[], k: number): void {
  k %= nums.length;
  reverse(nums, 0, nums.length - 1);
  reverse(nums, 0, k - 1);
  reverse(nums, k, nums.length - 1);
}

function reverse(nums: number[], lo: number, hi: number): void {
  while (lo < hi) {
    [nums[lo], nums[hi]] = [nums[hi], nums[lo]];
    lo++; hi--;
  }
}
```

### 6. Kadane's algorithm (maximum subarray)

A dynamic-programming-flavored linear scan that shows up constantly:

```typescript
function maxSubArray(nums: number[]): number {
  let best = nums[0];
  let current = nums[0];
  for (let i = 1; i < nums.length; i++) {
    current = Math.max(nums[i], current + nums[i]);
    best = Math.max(best, current);
  }
  return best;
}
```

Intuition: at each index, decide whether extending the previous subarray
helps or whether it's better to restart from the current element.

### 7. Sorting-based tricks

Many array problems become trivial after sorting (O(n log n)), trading a
little time complexity for a much simpler solution - e.g. merge intervals,
3Sum, meeting rooms. Always ask: "does sorting help here, and can I afford
O(n log n)?"

## Key Patterns (pattern recognition cheat sheet)

| Signal in the problem statement | Likely pattern |
|---|---|
| "contiguous subarray", "max/min sum/length" | Sliding window or Kadane's |
| "sorted array", "pair/triplet that sums to X" | Two pointers |
| "in-place", "O(1) extra space" | Read/write pointer swap |
| "range sum queries", "subarray sum equals k" | Prefix sum (+ hash map) |
| "rotate", "reverse" | Reversal trick / modular index math |
| "merge intervals", "overlapping" | Sort by start, then linear sweep |
| "anagram", "permutation of a string" | Frequency array/map (see ch. 02) |
| "matrix", "spiral", "rotate image" | Layer-by-layer boundary traversal |
| "majority element" | Boyer-Moore voting |
| "next permutation", "lexicographic" | Right-to-left scan + swap + reverse |

## Time/Space Complexity Cheat Sheet

| Operation | Time | Space |
|---|---|---|
| Access by index | O(1) | - |
| Search (unsorted) | O(n) | O(1) |
| Search (sorted, binary search) | O(log n) | O(1) |
| Push/pop at end | O(1) amortized | - |
| Shift/unshift at start | O(n) | - |
| Insert/delete in middle | O(n) | - |
| Sort | O(n log n) | O(n) or O(log n) depending on engine |
| Build prefix sum array | O(n) | O(n) |
| Kadane's max subarray | O(n) | O(1) |
| Reverse array | O(n) | O(1) |
| String concatenation in loop (`+=`) | O(n^2) worst case | O(n) |
| Build string via array + join | O(n) | O(n) |
| Two-pointer scan | O(n) | O(1) |

## Common Mistakes / Interview Tips

- **Forgetting the numeric sort comparator.** `sort()` alone sorts
  lexicographically - always pass `(a, b) => a - b`.
- **Off-by-one on loop bounds.** State the invariant out loud: "`i` points to
  the next slot to overwrite" or "`hi` is inclusive." Say it before coding.
- **Mutating the input array when the interviewer didn't ask for that.**
  Clarify up front: "Can I modify the input in place, or do you need the
  original preserved?"
- **Not clarifying empty-input / single-element edge cases.** Always ask
  about `[]`, one element, all-duplicates, all-negative-numbers (for
  max-subarray-style problems), and negative/zero values in general.
- **Quadratic string building.** If you see yourself doing `str += x` inside
  a loop over large input, switch to an array + `join`.
- **Confusing `slice` (non-mutating, returns copy) with `splice` (mutating,
  edits in place).** Say which one you mean; interviewers listen for this.
- **Assuming array `.includes()` is O(1).** It's O(n) - if you call it inside
  another loop, you likely have accidental O(n^2). Use a Set/Map instead
  (chapter 02).
- **Not verbalizing complexity before coding.** State the target complexity
  first ("I think we can do this in O(n) time, O(1) space using two
  pointers"), then implement it. It shows intent and lets the interviewer
  redirect you early if you're off track.
- **Silence while thinking.** Narrate your approach, trade-offs, and why you
  reject the brute force, even if it feels slow to talk while coding.

## Hands-on Drills

Work through these without looking at solutions first; time-box each to
15-25 minutes before checking yourself.

1. Implement `removeDuplicates` from a sorted array in-place (read/write
   pointer), returning the new length.
2. Implement `rotate(nums, k)` using the reverse-three-times trick, verify it
   against a naive `unshift`-based version for correctness (not
   performance).
3. Implement a prefix-sum-based `subarraySumRange(nums, i, j)` query
   function and test it against a brute-force nested loop.
4. Implement Kadane's algorithm, then extend it to also return the actual
   subarray boundaries (start/end indices), not just the sum.
5. Implement `merge(intervals)`: sort by start time, then sweep and merge
   overlapping intervals.
6. Implement string compression (e.g. `"aabcccccaaa"` -> `"a2b1c5a3"`)
   in-place on a character array using a read/write pointer.
7. Implement matrix rotation (rotate an N x N matrix 90 degrees in place)
   using the transpose + reverse-rows trick.
8. Implement "next permutation" (find the next lexicographically greater
   permutation of an array of numbers), in-place, O(1) extra space.

## Practice

The LeetCode list for this topic is in [problems.md](./problems.md). The interview code to memorize is in [common-techniques.md](./common-techniques.md). Solve **Must** first, then Should, then Optional.

## Mastery Checklist

- [ ] I can explain why `arr.sort()` needs a comparator for numeric sorts.
- [ ] I can implement an in-place read/write pointer solution without
      re-deriving it from scratch each time.
- [ ] I can build and use a prefix-sum array from memory.
- [ ] I can state Kadane's algorithm's recurrence in one sentence.
- [ ] I can solve Two Sum, 3Sum, and Product of Array Except Self without
      hints.
- [ ] I can solve Merge Intervals and explain the sort-then-sweep pattern.
- [ ] I can implement Spiral Matrix or Rotate Image without off-by-one bugs.
- [ ] I always state time/space complexity before and after coding a
      solution.
- [ ] I have solved at least 12 of the problems above from scratch, timed.
- [ ] I can identify, within 30 seconds of reading a new array problem,
      which pattern from the "Key Patterns" table it likely maps to.
