# Sliding Window — Problems

Solve in priority order: **Must**, then **Should**, then **Optional**.

Track checkboxes in [PROBLEMS-MASTER-LIST.md](../PROBLEMS-MASTER-LIST.md).

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
| Should | Grumpy Bookstore Owner | 1052 | Medium | Fixed window, maximize gained customers |
| Should | Get Equal Substrings Within Budget | 1208 | Medium | Variable window, cost budget |
| Optional | Longest Subarray of 1's After Deleting One Element | 1493 | Medium | Variable window, allow one zero |
| Optional | Frequency of the Most Frequent Element | 1838 | Medium | Sorted array + window with running sum |
| Optional | Count Number of Nice Subarrays | 1248 | Medium | atMost(K) - atMost(K-1) on odd-count |

## Related — do not solve twice

These appear in this topic's notes, but their **primary** LeetCode home is another folder. Solve them there.

| Problem | LeetCode # | Primary topic |
|---|---|---|
| Sliding Window Maximum | 239 | [Stack and Queue](../05. stack-queue/problems.md) |
