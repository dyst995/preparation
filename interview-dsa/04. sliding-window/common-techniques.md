# Sliding Window — Common techniques

Code you actually write. Why lives in [notes.md](./notes.md).

**Reach for this when:** longest/shortest **contiguous** subarray or substring. Sorted pairs are [03](../03. two-pointers/common-techniques.md).

## Fixed size k

```ts
function maxSumFixed(nums: number[], k: number): number {
  let sum = 0;
  for (let i = 0; i < k; i++) sum += nums[i];
  let best = sum;
  for (let r = k; r < nums.length; r++) {
    sum += nums[r] - nums[r - k];
    best = Math.max(best, sum);
  }
  return best;
}
```

## Variable: expand right, shrink left while invalid

```ts
function slidingWindowTemplate(a: number[]): number {
  let left = 0, best = 0;
  // maintain windowState with O(1) updates
  for (let right = 0; right < a.length; right++) {
    // include a[right]
    while (false /* invalid */) {
      // exclude a[left]
      left++;
    }
    best = Math.max(best, right - left + 1);
  }
  return best;
}
```

`right` always advances. `left` only advances. Each index enters/leaves at most once → O(n).

## Maximize (longest without repeat)

```ts
function lengthOfLongestSubstring(s: string): number {
  const last = new Map<string, number>();
  let left = 0, best = 0;
  for (let right = 0; right < s.length; right++) {
    const ch = s[right];
    if (last.has(ch) && last.get(ch)! >= left) left = last.get(ch)! + 1;
    last.set(ch, right);
    best = Math.max(best, right - left + 1);
  }
  return best;
}
```

## Minimize (smallest subarray with sum ≥ target)

```ts
function minSubArrayLen(target: number, nums: number[]): number {
  let left = 0, sum = 0, best = Infinity;
  for (let right = 0; right < nums.length; right++) {
    sum += nums[right];
    while (sum >= target) {
      best = Math.min(best, right - left + 1);
      sum -= nums[left++];
    }
  }
  return best === Infinity ? 0 : best;
}
```

Grow until valid, then shrink as far as it stays valid.

## Need / have (minimum window substring)

Keep `have === need.size` as the O(1) “window covers T” check. Shrink while it still covers; record best.

## Exactly K = atMost(K) − atMost(K − 1)

“Exactly K distinct” is not a clean shrink rule. Count `atMost` (monotonic) twice and subtract.

## Pattern sniff

| Prompt | Technique |
|---|---|
| subarray of size k | fixed window |
| longest/shortest contiguous … | variable window |
| no repeating chars | last-seen index |
| smallest window covering T | need/have maps |
| exactly K distinct | atMost trick |
