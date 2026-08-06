# 04 - Sliding Window

## Who this is for

Nika Beroshvili, Software Engineer, 4+ years experience, JS/TS background.
Sliding window is the go-to technique any time a problem asks about the
"best contiguous subarray/substring" - it turns an O(n^2) or O(n^3) brute
force into O(n) by never re-scanning data you've already examined.

## Learning Objectives

- Recognize the two sliding-window shapes: **fixed-size** and
  **variable-size (expand/shrink)**.
- Implement the "expand right, shrink left while invalid" loop confidently
  and without off-by-one errors.
- Know how to track window state incrementally (running sum, frequency map,
  distinct-count) rather than recomputing it from scratch each time.
- Distinguish "at most K" style counting from "exactly K" style counting
  (a common interview trap solved via subtraction of two "at most" windows).
- Apply sliding window to strings just as fluently as to numeric arrays.

## Core Concepts

### 1. Fixed-size window

The window size `k` is constant. Slide it one step at a time: add the
incoming element, remove the outgoing element, update the running
aggregate in O(1) per step instead of recomputing the whole window.

```typescript
function maxSumFixedWindow(nums: number[], k: number): number {
  let windowSum = 0;
  for (let i = 0; i < k; i++) windowSum += nums[i];

  let best = windowSum;
  for (let right = k; right < nums.length; right++) {
    windowSum += nums[right] - nums[right - k]; // add incoming, drop outgoing
    best = Math.max(best, windowSum);
  }
  return best;
}
```

### 2. Variable-size window: "expand right, shrink left while invalid"

This is the workhorse template for most sliding-window interview problems.
`right` always moves forward every iteration; `left` only moves forward
when the window becomes invalid (or when you want to minimize its size).

```typescript
function lengthOfLongestSubstring(s: string): number {
  const lastSeenIndex = new Map<string, number>();
  let left = 0;
  let best = 0;

  for (let right = 0; right < s.length; right++) {
    const ch = s[right];
    if (lastSeenIndex.has(ch) && lastSeenIndex.get(ch)! >= left) {
      left = lastSeenIndex.get(ch)! + 1; // jump left past the duplicate
    }
    lastSeenIndex.set(ch, right);
    best = Math.max(best, right - left + 1);
  }
  return best;
}
```

Generic template to internalize:

```typescript
function slidingWindowTemplate(input: unknown[]): number {
  let left = 0;
  let best = 0; // or Infinity if minimizing
  // windowState: running sum, frequency map, distinct count, etc.

  for (let right = 0; right < input.length; right++) {
    // 1. include input[right] into windowState

    while (/* windowState violates the constraint */ false) {
      // 2. exclude input[left] from windowState
      left++;
    }

    // 3. window [left, right] is now valid - update the answer
    best = Math.max(best, right - left + 1);
  }
  return best;
}
```

### 3. Minimizing vs maximizing windows

- **Maximize** window size (e.g. "longest substring without repeats"):
  shrink only when invalid, record the size every time the window is valid.
- **Minimize** window size (e.g. "minimum window substring", "smallest
  subarray with sum >= target"): grow until valid, then shrink as much as
  possible while it stays valid, recording the smallest size found.

```typescript
function minSubArrayLen(target: number, nums: number[]): number {
  let left = 0;
  let sum = 0;
  let best = Infinity;

  for (let right = 0; right < nums.length; right++) {
    sum += nums[right];
    while (sum >= target) {
      best = Math.min(best, right - left + 1);
      sum -= nums[left];
      left++;
    }
  }
  return best === Infinity ? 0 : best;
}
```

### 4. Tracking window state incrementally

Never recompute the window's sum/frequency map from scratch inside the
loop - that reintroduces an O(n) (or worse) cost per step, defeating the
purpose. Always maintain a running aggregate and update it by O(1) deltas
as the window moves.

Common state to track incrementally:

- Running numeric sum/product (add on expand, subtract/divide on shrink).
- A frequency `Map<char, number>` for character counts, plus a separate
  `distinctCount` variable so you don't call `.size` repeatedly (still O(1)
  in JS, but tracking a matched-count integer is the standard idiom for
  "minimum window substring"-style problems).
- A count of "how many characters currently satisfy some condition" so the
  while-loop condition check itself is O(1).

### 5. Minimum Window Substring - the hardest common variant

Combines a target-frequency map with a "how many required characters are
currently satisfied" counter, so the validity check inside the while loop
is O(1) instead of O(26) or O(distinct chars):

```typescript
function minWindow(s: string, t: string): string {
  if (t.length > s.length) return '';

  const need = new Map<string, number>();
  for (const ch of t) need.set(ch, (need.get(ch) ?? 0) + 1);

  const window = new Map<string, number>();
  let have = 0;
  const needCount = need.size;

  let left = 0;
  let bestLen = Infinity;
  let bestStart = 0;

  for (let right = 0; right < s.length; right++) {
    const ch = s[right];
    if (need.has(ch)) {
      window.set(ch, (window.get(ch) ?? 0) + 1);
      if (window.get(ch) === need.get(ch)) have++;
    }

    while (have === needCount) {
      if (right - left + 1 < bestLen) {
        bestLen = right - left + 1;
        bestStart = left;
      }
      const leftCh = s[left];
      if (need.has(leftCh)) {
        if (window.get(leftCh) === need.get(leftCh)) have--;
        window.set(leftCh, window.get(leftCh)! - 1);
      }
      left++;
    }
  }
  return bestLen === Infinity ? '' : s.slice(bestStart, bestStart + bestLen);
}
```

### 6. The "at most K" trick for "exactly K" problems

Counting subarrays with **exactly** K distinct elements (or exactly K odd
numbers, etc.) is awkward with a direct sliding window because shrinking
logic for "exactly" is not monotonic in the usual sense. The standard trick:

```
exactly(K) = atMost(K) - atMost(K - 1)
```

Implement `atMost(K)` with a straightforward sliding window (easy, because
"at most" is monotonic - the window only ever needs to shrink), then
subtract.

## Key Patterns

| Signal in the problem statement | Likely pattern |
|---|---|
| "subarray of size k" | Fixed-size window |
| "longest/shortest contiguous substring/subarray satisfying X" | Variable-size window |
| "without repeating characters" | Variable window + last-seen-index map |
| "minimum window containing all characters of T" | Variable window + need/have frequency maps |
| "at most K distinct" | Variable window, shrink when distinct count exceeds K |
| "exactly K distinct/odd/etc." | atMost(K) - atMost(K-1) trick |
| "maximum sum/average of subarray length k" | Fixed-size window with running sum |
| "smallest subarray with sum >= target" | Variable window, minimize |

## Time/Space Complexity Cheat Sheet

| Technique | Time | Space |
|---|---|---|
| Fixed-size window | O(n) | O(1) (or O(k) if tracking a k-sized structure) |
| Variable-size window (expand/shrink) | O(n) - each index enters/leaves window once | O(1) to O(alphabet size) |
| Minimum window substring | O(n + m) (m = pattern length) | O(m) for need map |
| "at most K" / "exactly K" via subtraction | O(n) (two window passes) | O(k) |
| Naive brute force (all subarrays) | O(n^2) or O(n^3) | O(1) |

## Common Mistakes / Interview Tips

- **Recomputing the window sum/frequency from scratch on every slide**
  instead of updating incrementally - silently reintroduces O(n) per step
  and turns your "O(n) solution" into O(n^2).
- **Off-by-one on window length** - the length of `[left, right]` inclusive
  is `right - left + 1`, not `right - left`. Say this formula out loud
  before using it.
- **Forgetting `left` can never move backward.** If your logic ever seems to
  need `left` to decrease, you've mismodeled the problem - sliding window
  requires monotonic pointers.
- **Confusing "at most" and "exactly"** - jumping straight to a variable
  window for "exactly K" problems without realizing you need the
  atMost(K) - atMost(K-1) trick.
- **Not resetting/updating the "have" counter correctly** when shrinking in
  minimum-window-substring-style problems - a very common subtle bug: only
  decrement `have` when a character's count *drops below* what's needed,
  not just because it's being removed from the window.
- **Using `.size` or recomputing distinct-count on a Map every iteration**
  instead of tracking a running integer counter - unnecessary overhead and
  a sign you haven't fully internalized the incremental-state pattern.
- **Not clarifying whether the window is over characters, words, or
  indices** for string problems - ask if Unicode/multi-byte characters
  matter (usually not for interview-level problems, but worth a quick
  mention).
- **Jumping `left` forward incorrectly in the "duplicate character" pattern**
  - must take `Math.max(left, lastSeenIndex[ch] + 1)`, not just
  `lastSeenIndex[ch] + 1`, otherwise `left` can move backward if the
  duplicate was seen before the current window started.

## Hands-on Drills

1. Implement the fixed-size max-sum-subarray-of-size-k, then convert it to
   return the max **average** instead of max sum.
2. Implement `lengthOfLongestSubstring` (longest substring without
   repeating characters) using the last-seen-index map technique; trace it
   by hand on `"abba"` to make sure `left` never moves backward.
3. Implement `minSubArrayLen` (smallest subarray with sum >= target),
   minimizing correctly.
4. Implement `minWindow` (minimum window substring) fully from memory,
   including the `have`/`needCount` matching counters.
5. Implement `atMostKDistinct(nums, k)` (count subarrays with at most k
   distinct values), then derive `exactlyKDistinct` via subtraction.
6. Implement "longest repeating character replacement" (longest substring
   where you can replace at most k characters to make all characters the
   same) using a window + max-frequency-character tracking.
7. Implement "find all anagrams in a string" using a fixed-size window plus
   frequency-map comparison.
8. Time yourself solving 3 variable-window problems back to back without
   referring to notes; check for the recurring bugs listed above.

## Problem List

| Priority | Problem | LeetCode # | Difficulty | Notes/Pattern |
|---|---|---|---|---|
| Must | Maximum Average Subarray I | 643 | Easy | Fixed-size window |
| Must | Longest Substring Without Repeating Characters | 3 | Medium | Variable window + last-seen map |
| Must | Minimum Size Subarray Sum | 209 | Medium | Variable window, minimize |
| Must | Longest Repeating Character Replacement | 424 | Medium | Window + max-frequency tracking |
| Must | Find All Anagrams in a String | 438 | Medium | Fixed window + frequency comparison |
| Must | Permutation in String | 567 | Medium | Fixed window + frequency comparison |
| Must | Minimum Window Substring | 76 | Hard | Variable window + need/have maps |
| Must | Fruit Into Baskets | 904 | Medium | At-most-2-distinct sliding window |
| Must | Longest Substring with At Most K Distinct Characters | 340 | Medium | Variable window + distinct count map |
| Should | Contains Duplicate II | 219 | Easy | Fixed window + Set membership |
| Should | Max Consecutive Ones III | 1004 | Medium | Variable window, allow k zero-flips |
| Should | Subarrays with K Different Integers | 992 | Hard | atMost(K) - atMost(K-1) trick |
| Should | Sliding Window Maximum | 239 | Hard | Monotonic deque (bridges to ch. 05) |
| Should | Grumpy Bookstore Owner | 1052 | Medium | Fixed window, maximize gained customers |
| Should | Get Equal Substrings Within Budget | 1208 | Medium | Variable window, cost budget |
| Optional | Longest Subarray of 1's After Deleting One Element | 1493 | Medium | Variable window, allow one zero |
| Optional | Frequency of the Most Frequent Element | 1838 | Medium | Sorted array + window with running sum |
| Optional | Count Number of Nice Subarrays | 1248 | Medium | atMost(K) - atMost(K-1) on odd-count |

## Mastery Checklist

- [ ] I can write the generic "expand right, shrink left while invalid"
      template from memory.
- [ ] I know the difference between maximizing and minimizing window
      problems and how the shrink condition differs.
- [ ] I can implement Longest Substring Without Repeating Characters
      without the `left` pointer ever moving backward.
- [ ] I can implement Minimum Window Substring including the have/needCount
      matching logic.
- [ ] I can explain and apply the atMost(K) - atMost(K-1) trick for
      "exactly K" problems.
- [ ] I always track window state incrementally, never recomputing from
      scratch inside the loop.
- [ ] I can clearly explain when to use sliding window vs plain two
      pointers.
- [ ] I have solved at least 12 of the problems above from scratch, timed.
- [ ] I can identify within 30 seconds whether a new problem needs
      fixed-size or variable-size window.
