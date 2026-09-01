# Sorting — Common techniques

Code you actually write. Why lives in [notes.md](./notes.md).

**You already call `sort()` in weeks 1–3.** This file is *implementing* a sort, plus “sort then linear pass.”

```ts
nums.sort((a, b) => a - b);
intervals.sort((a, b) => a[0] - b[0]); // by start
intervals.sort((a, b) => a[1] - b[1]); // by end — interval greedy
```

## What to say about each algorithm

| Algo | Time | Extra space | Stable | When you mention it |
|---|---|---|---|---|
| Merge | O(n log n) always | O(n) | yes | guaranteed bound, linked lists |
| Quick | avg O(n log n), worst O(n^2) | O(log n) stack | no | randomize pivot |
| Heap | O(n log n) | O(1) | no | in-place, no extra array |
| Counting | O(n + k) | O(k) | can be | small integer range |
| JS `.sort` | O(n log n) | engine | yes (ES2019+) | always pass a comparator for numbers |

## Merge sort

```ts
function mergeSort(a: number[]): number[] {
  if (a.length <= 1) return a;
  const m = Math.floor(a.length / 2);
  return merge(mergeSort(a.slice(0, m)), mergeSort(a.slice(m)));
}

function merge(L: number[], R: number[]): number[] {
  const out: number[] = [];
  let i = 0, j = 0;
  while (i < L.length && j < R.length) out.push(L[i] <= R[j] ? L[i++] : R[j++]);
  return out.concat(L.slice(i), R.slice(j));
}
```

`<=` keeps it stable.

## Quicksort (random pivot) + quickselect

```ts
function partition(a: number[], lo: number, hi: number): number {
  const p = lo + Math.floor(Math.random() * (hi - lo + 1));
  [a[p], a[hi]] = [a[hi], a[p]];
  const pivot = a[hi];
  let i = lo;
  for (let j = lo; j < hi; j++) if (a[j] < pivot) [a[i++], a[j]] = [a[j], a[i]];
  [a[i], a[hi]] = [a[hi], a[i]];
  return i;
}

function quickSelect(a: number[], kthSmallest: number): number {
  let lo = 0, hi = a.length - 1, t = kthSmallest - 1;
  while (true) {
    const p = partition(a, lo, hi);
    if (p === t) return a[p];
    if (p < t) lo = p + 1;
    else hi = p - 1;
  }
}
```

Average O(n) for kth. Heap of size k is the other interview answer — [09](../09. heap-priority-queue/common-techniques.md).

## Counting / bucket by frequency

Count integers in `[0, k]`, then emit. Or `buckets[freq].push(num)` for top-K without a heap.

## Custom comparator (Largest Number)

`a` vs `b` as strings: compare `a+b` vs `b+a`. Watch the all-zeros case → `"0"`.
