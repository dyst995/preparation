# 15. Bit Manipulation

## Overview

Bit manipulation problems test whether you know the handful of core bitwise
identities and can apply them cleverly. They are usually short to code
(a few lines) but easy to get wrong without knowing the tricks. This topic
shows up less often than arrays/DP/graphs, but when it does, interviewers
expect O(1) or O(log(value)) solutions using bit tricks, not naive
string-conversion approaches.

## When to Suspect Bit Manipulation

- The problem mentions XOR, AND, OR, or "without using +/-/extra space".
- "Every element appears twice except one" (or similar frequency puzzles).
- "Count the number of 1 bits", "is power of two/four".
- Subsets/combinations where n <= ~20 (bitmask enumeration or bitmask DP).
- "Find the missing number" without using extra space.
- Anything about binary representation directly (reverse bits, add binary).

-------------------------------------------------------------------------------

## Core Bitwise Identities (Know These Cold)

```text
x ^ 0 = x                    XOR with 0 is identity
x ^ x = 0                    XOR of a number with itself is 0
x ^ -1 = ~x                  XOR with all-ones flips all bits
x & (x - 1)                  clears the lowest set bit
x & (-x)                     isolates the lowest set bit
x | (x + 1)                  sets the lowest unset bit
x & 1                        checks if x is odd (last bit)
x >> 1                       divide by 2 (integer, arithmetic shift)
x << 1                       multiply by 2
x & (x - 1) == 0             checks if x is a power of two (x != 0)
a + b = (a ^ b) + 2*(a & b)  sum via XOR (sum without carry) and AND (carry)
```

### Common tricks

```python
def count_set_bits(x):
    count = 0
    while x:
        x &= x - 1          # clears lowest set bit each time -> O(popcount)
        count += 1
    return count

def is_power_of_two(x):
    return x > 0 and (x & (x - 1)) == 0

def lowest_set_bit(x):
    return x & (-x)

def get_bit(x, i):
    return (x >> i) & 1

def set_bit(x, i):
    return x | (1 << i)

def clear_bit(x, i):
    return x & ~(1 << i)

def toggle_bit(x, i):
    return x ^ (1 << i)
```

-------------------------------------------------------------------------------

## Pattern 1: XOR Tricks for "Find the Unique/Missing Element"

XOR cancels out pairs, so a running XOR isolates whatever does not have a
pair.

```python
def single_number(nums):  # LC 136, exactly one element appears once, rest twice
    result = 0
    for n in nums:
        result ^= n
    return result

def missing_number(nums):  # LC 268
    n = len(nums)
    result = n
    for i, num in enumerate(nums):
        result ^= i ^ num
    return result
```

### Single Number II / III (appear 3x, or two uniques among pairs)

```python
def single_number_ii(nums):  # LC 137, every other element appears 3 times
    ones = twos = 0
    for n in nums:
        ones = (ones ^ n) & ~twos
        twos = (twos ^ n) & ~ones
    return ones

def single_number_iii(nums):  # LC 260, exactly two elements appear once
    xor_all = 0
    for n in nums:
        xor_all ^= n
    diff_bit = xor_all & (-xor_all)  # a bit where the two uniques differ
    a = 0
    for n in nums:
        if n & diff_bit:
            a ^= n
    b = xor_all ^ a
    return [a, b]
```

## Pattern 2: Bitmask for Subsets / Bitmask DP

When n <= ~20, represent a subset of `{0, ..., n-1}` as an integer bitmask.
Iterate `mask` from `0` to `2^n - 1` to enumerate all subsets, or use
bitmask DP where `dp[mask]` = best answer for the subset of items in `mask`.

```python
def all_subsets(nums):
    n = len(nums)
    result = []
    for mask in range(1 << n):
        subset = [nums[i] for i in range(n) if mask & (1 << i)]
        result.append(subset)
    return result

def traveling_salesman_bitmask_dp(dist):  # classic bitmask DP shape
    n = len(dist)
    dp = [[float('inf')] * n for _ in range(1 << n)]
    dp[1][0] = 0
    for mask in range(1 << n):
        for u in range(n):
            if not (mask & (1 << u)) or dp[mask][u] == float('inf'):
                continue
            for v in range(n):
                if mask & (1 << v):
                    continue
                new_mask = mask | (1 << v)
                dp[new_mask][v] = min(dp[new_mask][v], dp[mask][u] + dist[u][v])
    return min(dp[(1 << n) - 1][u] + dist[u][0] for u in range(1, n))
```

## Pattern 3: Bit-by-bit Counting (Digit DP on Bits)

Count contributions bit by bit across an array, useful for sum-of-XOR-style
or "counting bits" problems.

```python
def counting_bits(n):  # LC 338
    dp = [0] * (n + 1)
    for i in range(1, n + 1):
        dp[i] = dp[i >> 1] + (i & 1)
    return dp
```

## Pattern 4: Binary Trie for Maximum XOR Pair

For "maximum XOR of two numbers in an array" style problems, insert numbers
bit-by-bit (MSB first) into a binary trie, then greedily walk the opposite
bit at each level to maximize XOR. (See file 17, Trie, for the structure.)

```python
class TrieNode:
    def __init__(self):
        self.children = {}

def find_maximum_xor(nums):  # LC 421
    root = TrieNode()
    max_bit = max(nums).bit_length()
    for num in nums:
        node = root
        for i in range(max_bit, -1, -1):
            bit = (num >> i) & 1
            if bit not in node.children:
                node.children[bit] = TrieNode()
            node = node.children[bit]

    result = 0
    for num in nums:
        node = root
        curr_xor = 0
        for i in range(max_bit, -1, -1):
            bit = (num >> i) & 1
            toggled = 1 - bit
            if toggled in node.children:
                curr_xor |= (1 << i)
                node = node.children[toggled]
            else:
                node = node.children[bit]
        result = max(result, curr_xor)
    return result
```

-------------------------------------------------------------------------------

## Common Pitfalls

- Language-specific negative number handling: Python integers have
  arbitrary precision and no fixed bit width, so `~x` and left/right shifts
  on negative numbers behave differently than in Java/C++ (which use fixed
  32/64-bit two's complement). When solving "Reverse Bits" or "Sum of Two
  Integers" in Python, mask with `0xFFFFFFFF` and handle the sign manually.
- Off-by-one in bit indexing: decide up front whether bit 0 is the least or
  most significant bit and stay consistent.
- Forgetting operator precedence: `&` and `|` bind looser than `==` and
  arithmetic in many languages -- always parenthesize, e.g. `(x & 1) == 0`.
- Using `^` (XOR) when you meant `**` (power) -- a classic Python typo.
- Assuming XOR tricks generalize to non-power-of-2 multiplicities without
  adjusting the technique (Single Number II/III need different logic than
  Single Number I).

## Interview Tips

- If the array size is small (n <= ~20) and the problem screams "try all
  subsets," say "bitmask" out loud immediately -- it signals experience.
  On this large numbers 2^20 = ~1e6 so brute is fine.
- For "appears once, rest appear k times" problems, mention that XOR-only
  works for k=2; for general k you need per-bit counting mod k.
  This shows depth even if the given problem is just the k=2 case.
  For general k, count bit i in all numbers and set that bit if
  count % k != 0.
- Practice deriving `x & (x - 1)` and `x & (-x)` from first principles (two's
  complement) so you can explain WHY they work, not just recite them.

-------------------------------------------------------------------------------

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
| Maximum XOR of Two Numbers in an Array                            | 421        | Medium     | Optional | binary trie greedy walk                 |
| Total Hamming Distance                                            | 477        | Medium     | Optional | per-bit counting across array           |
| Subsets                                                            | 78         | Medium     | Optional | bitmask enumeration alternative         |
| Gray Code                                                          | 89         | Medium     | Optional | i ^ (i >> 1) formula                    |
| UTF-8 Validation                                                    | 393        | Medium     | Optional | bitmask parsing of byte headers          |
| Complement of Base 10 Integer                                        | 476        | Easy       | Optional | flip bits within bit_length mask         |
| XOR Queries of a Subarray                                            | 1310       | Medium     | Optional | prefix XOR array technique               |
| Minimum Flips to Make a OR b Equal to c                               | 1318       | Medium     | Optional | per-bit comparison of a, b, c            |
