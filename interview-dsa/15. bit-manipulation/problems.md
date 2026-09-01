# Bit Manipulation — Problems

Solve in priority order: **Must**, then **Should**, then **Optional**.

Track checkboxes in [PROBLEMS-MASTER-LIST.md](../PROBLEMS-MASTER-LIST.md).

## Problem List

| Problem                                              | LeetCode # | Difficulty | Priority | Notes                              |
|----------------------------------------------------------|------------|------------|----------|----------------------------------------|
| Single Number                                              | 136        | Easy       | Must     | XOR cancels pairs                       |
| Number of 1 Bits                                            | 191        | Easy       | Must     | `x & (x-1)` clears lowest set bit        |
| Counting Bits                                               | 338        | Easy       | Must     | dp[i] = dp[i>>1] + (i&1)                |
| Missing Number                                              | 268        | Easy       | Must     | XOR indices and values                  |
| Power of Two                                                | 231        | Easy       | Must     | `x > 0 and x & (x-1) == 0`               |
| Sum of Two Integers                                          | 371        | Medium     | Must     | XOR for sum, AND+shift for carry        |
| Reverse Bits                                                 | 190        | Easy       | Should   | build result bit by bit                 |
| Single Number II                                              | 137        | Medium     | Should   | ones/twos state machine, appears 3x     |
| Single Number III                                              | 260        | Medium     | Should   | isolate diff bit, split into two groups |
| Bitwise AND of Numbers Range                                    | 201        | Medium     | Should   | find common prefix via right shift      |
| Power of Four                                                   | 342        | Easy       | Should   | power of two + bit in even position     |
| Divide Two Integers                                              | 29         | Medium     | Should   | bit-shift doubling for division         |
| Find the Difference                                              | 389        | Easy       | Should   | XOR of two strings' char codes          |
| Total Hamming Distance                                            | 477        | Medium     | Optional | per-bit counting across array           |
| Gray Code                                                          | 89         | Medium     | Optional | i ^ (i >> 1) formula                    |
| UTF-8 Validation                                                    | 393        | Medium     | Optional | bitmask parsing of byte headers          |
| Complement of Base 10 Integer                                        | 476        | Easy       | Optional | flip bits within bit_length mask         |
| XOR Queries of a Subarray                                            | 1310       | Medium     | Optional | prefix XOR array technique               |
| Minimum Flips to Make a OR b Equal to c                               | 1318       | Medium     | Optional | per-bit comparison of a, b, c            |

## Related — do not solve twice

These appear in this topic's notes, but their **primary** LeetCode home is another folder. Solve them there.

| Problem | LeetCode # | Primary topic |
|---|---|---|
| Subsets | 78 | [Recursion and Backtracking](../12. recursion-backtracking/problems.md) |
| Maximum XOR of Two Numbers in an Array | 421 | [Trie](../17. trie/problems.md) |
