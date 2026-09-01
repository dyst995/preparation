# Arrays and Strings — Common techniques

Code you actually write. Why lives in [notes.md](./notes.md).

**Reach for this when:** in-place edit, prefix/range sum, max subarray, rotate/reverse, matrix walk. Pair-sum and anagrams are [02](../02. hash-map-set/common-techniques.md).

## Numeric sort (JS gotcha)

```ts
nums.sort((a, b) => a - b); // without comparator, 10 sorts before 2
```

## Build a string in O(n)

```ts
const parts: string[] = [];
for (const ch of chars) parts.push(ch);
const s = parts.join(''); // never += in a loop
```

## Read/write pointer (in-place filter)

```ts
function removeElement(nums: number[], val: number): number {
  let w = 0;
  for (let r = 0; r < nums.length; r++) {
    if (nums[r] !== val) nums[w++] = nums[r];
  }
  return w;
}
```

## Prefix sums

```ts
function buildPrefix(nums: number[]): number[] {
  const p = new Array(nums.length + 1).fill(0);
  for (let i = 0; i < nums.length; i++) p[i + 1] = p[i] + nums[i];
  return p; // sum nums[i..j-1] === p[j] - p[i]
}
```

Subarray sum equals k: add a map → [02](../02. hash-map-set/common-techniques.md).

## Reverse / rotate in place

```ts
function reverse(a: number[], lo: number, hi: number): void {
  while (lo < hi) {
    [a[lo], a[hi]] = [a[hi], a[lo]];
    lo++; hi--;
  }
}

function rotate(nums: number[], k: number): void {
  const n = nums.length;
  k %= n;
  reverse(nums, 0, n - 1);
  reverse(nums, 0, k - 1);
  reverse(nums, k, n - 1);
}
```

## Kadane (max subarray)

```ts
function maxSubArray(nums: number[]): number {
  let best = nums[0], cur = nums[0];
  for (let i = 1; i < nums.length; i++) {
    cur = Math.max(nums[i], cur + nums[i]);
    best = Math.max(best, cur);
  }
  return best;
}
```

At each index: extend previous run, or restart here.

## Matrix: first row/col as markers (set zeroes)

Use `row0` / `col0` flags; walk from the inside so you do not wipe markers early.

## Pattern sniff

| Prompt | Technique |
|---|---|
| in-place, O(1) extra | read/write pointer |
| range / subarray sum | prefix |
| max contiguous sum | Kadane |
| rotate k | reverse three times |
| after sort the problem dies | sort, then another chapter’s pass |
