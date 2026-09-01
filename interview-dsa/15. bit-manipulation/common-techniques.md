# Bit Manipulation — Common techniques

Code you actually write. Why lives in [notes.md](./notes.md).

**Reach for this when:** single/missing number, count bits, power of two, subsets with n≤20, per-bit counting across an array.

In JS, numbers are IEEE doubles but bitwise ops use **32-bit signed** ints. Mask with `>>> 0` or `0xFFFFFFFF` when you need unsigned 32-bit (reverse bits).

## XOR cancels pairs

```ts
function singleNumber(nums: number[]): number {
  let x = 0;
  for (const n of nums) x ^= n;
  return x;
}

function missingNumber(nums: number[]): number {
  let x = nums.length;
  for (let i = 0; i < nums.length; i++) x ^= i ^ nums[i];
  return x;
}
```

Two uniques among pairs: XOR all → `diff = xor & -xor` (lowest set bit) → split into two groups, XOR each group.

## Lowest set bit / clear it

```ts
x & -x;       // lowest set bit
x & (x - 1);  // clear lowest set bit
x > 0 && (x & (x - 1)) === 0; // power of two
```

Hamming weight: loop `n &= n - 1` until 0, count steps.

## Counting bits 0..n

```ts
function countBits(n: number): number[] {
  const dp = new Array(n + 1).fill(0);
  for (let i = 1; i <= n; i++) dp[i] = dp[i >> 1] + (i & 1);
  return dp;
}
```

## Subsets as bitmasks (n ≤ ~20)

```ts
function subsets(nums: number[]): number[][] {
  const n = nums.length, out: number[][] = [];
  for (let mask = 0; mask < 1 << n; mask++) {
    const cur: number[] = [];
    for (let i = 0; i < n; i++) if (mask & (1 << i)) cur.push(nums[i]);
    out.push(cur);
  }
  return out;
}
```

Backtracking version: [12](../12. recursion-backtracking/common-techniques.md).

## Per-bit counting

For each bit 0..31, count how many numbers have it set. Useful for total Hamming distance / majority bit.

## Sum without +

```ts
while (b) {
  const carry = (a & b) << 1;
  a = a ^ b;
  b = carry;
}
```
