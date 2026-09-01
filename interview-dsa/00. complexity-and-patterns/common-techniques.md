# Complexity and Patterns — Common techniques

This folder has no LeetCode list. The technique is **how you start every problem**. Open this before coding.

`notes.md` is the full framework. This page is the version you speak out loud.

## The 7-step loop (say it, then do it)

1. **Clarify** — restate; ask n, duplicates, negatives, sorted?, in-place?, index vs value.
2. **Example** — walk theirs, then a tiny edge case you invent.
3. **Brute force** — name it and its complexity even if you will not code it.
4. **Pattern** — what did brute recompute? nested loop → hash/two pointers; contiguous range → window; “min X that works” → binary search on answer.
5. **Approach + complexity first** — get a nod, then code.
6. **Code** — signature and empty/n=1 first; talk while typing.
7. **Test + complexity** — trace one example; empty; off-by-one at loop ends; state time/space.

## Complexity you must say cold

| Class | Typical trigger |
|---|---|
| O(1) | index, hash get/set (average) |
| O(log n) | binary search, heap push/pop, balanced BST |
| O(n) | one pass, two pointers, sliding window (each index moves once) |
| O(n log n) | sort, or n binary searches |
| O(n^2) | nested loops, DP table n×n |
| O(2^n) | subsets, n ≤ ~20 |

Input-size gut check: n ~ 1e5 needs O(n) or O(n log n). n ~ 20 can be 2^n.

## Which pattern (scan the prompt)

| You hear | You reach for | Folder |
|---|---|---|
| pair/sum/seen before/anagram | hash map/set | 02 |
| sorted pair/palindrome/in-place unique | two pointers | 03 |
| longest/shortest **contiguous** | sliding window | 04 |
| next greater / parentheses / nested | stack | 05 |
| reverse list / cycle / middle | linked list | 06 |
| tree height / BST / level order | trees | 07 |
| islands / course schedule / shortest unweighted | graphs | 08 |
| top K / kth / merge k / stream median | heap | 09 |
| sorted find / min speed that works | binary search | 10 |
| generate all subsets/perms | backtracking | 12 |
| number of ways / optimal on prefixes | DP | 13 |
| jump / gas / “always take best now” | greedy | 14 |
| merge/overlap/meeting rooms | intervals | 16 |
| prefix dictionary / autocomplete | trie | 17 |
| components while edges arrive | union-find | 18 |

## Space vs time line you can reuse

“I can do this in O(n^2) extra-space-free, or O(n) time with O(n) space using a map. Given n, I’d take the linear pass.”
