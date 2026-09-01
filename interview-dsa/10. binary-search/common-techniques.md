# Binary Search — Common techniques

Code you actually write. Why lives in [notes.md](./notes.md).

**Reach for this when:** sorted array find, first/last occurrence, rotated sorted, **minimum X such that `can(X)` is true** (Koko, ship packages).

Always: `mid = lo + Math.floor((hi - lo) / 2)` — not `(lo+hi)/2` overflow habit, and integer divide.

## Classic (exact value)

```ts
function binarySearch(nums: number[], target: number): number {
  let lo = 0, hi = nums.length - 1;
  while (lo <= hi) {
    const mid = lo + Math.floor((hi - lo) / 2);
    if (nums[mid] === target) return mid;
    if (nums[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}
```

Invariant: answer, if it exists, stays in `[lo, hi]`.

## Lower bound (the template to memorize)

Predicate is `false…false, true…true`. Find first `true`.

```ts
function lowerBound(lo: number, hi: number, pred: (i: number) => boolean): number {
  while (lo < hi) {
    const mid = lo + Math.floor((hi - lo) / 2);
    if (pred(mid)) hi = mid;      // mid might be the answer
    else lo = mid + 1;            // mid is not
  }
  return lo; // lo === hi
}
```

```ts
function leftmost(nums: number[], t: number): number {
  const i = lowerBound(0, nums.length, (j) => nums[j] >= t);
  return i < nums.length && nums[i] === t ? i : -1;
}

function rightmost(nums: number[], t: number): number {
  const i = lowerBound(0, nums.length, (j) => nums[j] > t);
  return i > 0 && nums[i - 1] === t ? i - 1 : -1;
}
```

## Binary search on the answer

```ts
function minEatingSpeed(piles: number[], h: number): number {
  const can = (speed: number) => {
    let hours = 0;
    for (const p of piles) hours += Math.ceil(p / speed);
    return hours <= h;
  };
  let lo = 1, hi = Math.max(...piles);
  while (lo < hi) {
    const mid = lo + Math.floor((hi - lo) / 2);
    if (can(mid)) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}
```

Name `can(x)` out loud. Confirm it is monotonic before you binary search.

## Rotated sorted array

If `nums[lo] <= nums[mid]`, left half is sorted — see if target sits in it; else search the other half. Same idea for “find min in rotated.”

## 2D matrix

Treat as a sorted 1D array of length `m*n`, or binary search row then column.
