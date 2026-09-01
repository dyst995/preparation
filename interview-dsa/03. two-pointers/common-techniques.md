# Two Pointers — Common techniques

Code you actually write. Why lives in [notes.md](./notes.md).

**Reach for this when:** sorted pair/triplet, palindrome, in-place on sorted array, merge two sorted, max area. Contiguous “best window” is [04](../04. sliding-window/common-techniques.md).

## Opposite ends (sorted two-sum)

```ts
function twoSumSorted(nums: number[], target: number): [number, number] {
  let lo = 0, hi = nums.length - 1;
  while (lo < hi) {
    const sum = nums[lo] + nums[hi];
    if (sum === target) return [lo, hi];
    if (sum < target) lo++;
    else hi--;
  }
  return [-1, -1];
}
```

Moving `lo` only increases the sum; moving `hi` only decreases it.

## Fast / slow (in-place unique on sorted)

```ts
function removeDuplicates(nums: number[]): number {
  if (nums.length === 0) return 0;
  let slow = 0;
  for (let fast = 1; fast < nums.length; fast++) {
    if (nums[fast] !== nums[slow]) nums[++slow] = nums[fast];
  }
  return slow + 1;
}
```

## 3Sum (fix one, two-pointer the rest)

```ts
function threeSum(nums: number[]): number[][] {
  nums.sort((a, b) => a - b);
  const out: number[][] = [];
  for (let i = 0; i < nums.length - 2; i++) {
    if (i > 0 && nums[i] === nums[i - 1]) continue;
    let lo = i + 1, hi = nums.length - 1;
    while (lo < hi) {
      const sum = nums[i] + nums[lo] + nums[hi];
      if (sum === 0) {
        out.push([nums[i], nums[lo], nums[hi]]);
        lo++; hi--;
        while (lo < hi && nums[lo] === nums[lo - 1]) lo++;
        while (lo < hi && nums[hi] === nums[hi + 1]) hi--;
      } else if (sum < 0) lo++;
      else hi--;
    }
  }
  return out;
}
```

Duplicate skips are the part people drop under pressure.

## Merge sorted arrays from the back

```ts
function merge(nums1: number[], m: number, nums2: number[], n: number): void {
  let i = m - 1, j = n - 1, w = m + n - 1;
  while (j >= 0) {
    nums1[w--] = i >= 0 && nums1[i] > nums2[j] ? nums1[i--] : nums2[j--];
  }
}
```

## Max area (move the shorter wall)

```ts
function maxArea(height: number[]): number {
  let lo = 0, hi = height.length - 1, best = 0;
  while (lo < hi) {
    best = Math.max(best, (hi - lo) * Math.min(height[lo], height[hi]));
    if (height[lo] < height[hi]) lo++;
    else hi--;
  }
  return best;
}
```

## Dutch flag (0/1/2)

```ts
function sortColors(nums: number[]): void {
  let lo = 0, mid = 0, hi = nums.length - 1;
  while (mid <= hi) {
    if (nums[mid] === 0) [nums[lo++], nums[mid++]] = [nums[mid], nums[lo]];
    else if (nums[mid] === 1) mid++;
    else [nums[mid], nums[hi--]] = [nums[hi], nums[mid]];
  }
}
```

## vs sliding window

Sorted values / two positions → two pointers. Contiguous range + running aggregate → window.
