# 09 - Heap / Priority Queue

## Who this is for

Nika Beroshvili, Software Engineer, 4+ years experience, JS/TS background.
JavaScript has **no built-in heap or priority queue** (unlike Python's
`heapq` or Java's `PriorityQueue`), so this chapter treats "implement a
MinHeap class from scratch under time pressure" as a first-class skill, not
an afterthought.

## Learning Objectives

By the end of this chapter you should be able to:

- Explain what a binary heap is and why it's stored efficiently in a plain
  array.
- Implement a min-heap (and derive a max-heap from it) in TypeScript:
  push, pop, peek, and O(n) heapify.
- Recognize "top-K", "kth largest/smallest", "merge K sorted", and "median
  of a stream" as heap problems.
- Use a heap to implement Dijkstra's algorithm (chapter 08).
- Compare heap-based approaches to sorting-based and quickselect-based
  approaches, and justify the complexity trade-offs.

## Core Concepts

### 1. What is a heap?

A **binary heap** is a **complete binary tree** (every level full except
possibly the last, filled left to right) satisfying the heap property:

- **Min-heap**: every parent's value is `<=` its children's values - the
  minimum is always at the root.
- **Max-heap**: every parent's value is `>=` its children's values - the
  maximum is always at the root.

Because the tree is always complete, it's stored compactly in an array with
no pointers:

- Parent of index `i`: `Math.floor((i - 1) / 2)`
- Left child of index `i`: `2 * i + 1`
- Right child of index `i`: `2 * i + 2`

### 2. Heap vs sorted array vs BST

| Structure | Insert | Get min/max | Remove min/max |
|---|---|---|---|
| Heap | O(log n) | O(1) peek | O(log n) |
| Sorted array | O(n) | O(1) | O(n) |
| Balanced BST | O(log n) | O(log n) | O(log n) |
| Unsorted array | O(1) | O(n) | O(n) |

Heaps win whenever the underlying set changes over time and you repeatedly
need the current extreme value.

### 3. Priority queue

A **priority queue (PQ)** is the abstract data type "always give me the
highest-priority item next." A binary heap is the standard concrete
implementation, and the two terms are often used interchangeably in
interviews.

## Implementation

### MinHeap from scratch (works for max-heap and tuples via a custom comparator)

```typescript
class MinHeap<T = number> {
  private data: T[] = [];
  constructor(private compare: (a: T, b: T) => number = (a, b) => (a as unknown as number) - (b as unknown as number)) {}

  size(): number { return this.data.length; }
  isEmpty(): boolean { return this.data.length === 0; }
  peek(): T | undefined { return this.data[0]; }

  push(value: T): void {
    this.data.push(value);
    this.bubbleUp(this.data.length - 1);
  }

  pop(): T | undefined {
    if (this.data.length === 0) return undefined;
    const top = this.data[0];
    const last = this.data.pop()!;
    if (this.data.length > 0) {
      this.data[0] = last;
      this.bubbleDown(0);
    }
    return top;
  }

  private bubbleUp(i: number): void {
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (this.compare(this.data[i], this.data[parent]) < 0) {
        [this.data[i], this.data[parent]] = [this.data[parent], this.data[i]];
        i = parent;
      } else break;
    }
  }

  private bubbleDown(i: number): void {
    const n = this.data.length;
    while (true) {
      let smallest = i;
      const left = 2 * i + 1, right = 2 * i + 2;
      if (left < n && this.compare(this.data[left], this.data[smallest]) < 0) smallest = left;
      if (right < n && this.compare(this.data[right], this.data[smallest]) < 0) smallest = right;
      if (smallest === i) break;
      [this.data[i], this.data[smallest]] = [this.data[smallest], this.data[i]];
      i = smallest;
    }
  }
}
```

For a **max-heap**, negate the comparator: `new MinHeap<number>((a, b) => b - a)`.
This single class also works for tuples/objects: `new MinHeap<[number, number]>((a, b) => a[0] - b[0])`.

### Heapify an array in O(n), not O(n log n)

Pushing `n` elements one at a time is O(n log n). Building bottom-up from
an existing array is O(n):

```typescript
function heapify(arr: number[]): number[] {
  const n = arr.length;
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
    bubbleDownInPlace(arr, i, n);
  }
  return arr;
}

function bubbleDownInPlace(arr: number[], i: number, n: number): void {
  while (true) {
    let smallest = i;
    const left = 2 * i + 1, right = 2 * i + 2;
    if (left < n && arr[left] < arr[smallest]) smallest = left;
    if (right < n && arr[right] < arr[smallest]) smallest = right;
    if (smallest === i) break;
    [arr[i], arr[smallest]] = [arr[smallest], arr[i]];
    i = smallest;
  }
}
```

### Top-K pattern (the single most common heap interview pattern)

Kth largest: use a **min-heap of size K**. Push each element; if the heap
grows beyond K, pop the smallest. At the end, the root is the Kth largest.

```typescript
function findKthLargest(nums: number[], k: number): number {
  const heap = new MinHeap<number>();
  for (const num of nums) {
    heap.push(num);
    if (heap.size() > k) heap.pop();
  }
  return heap.peek()!;
}
```

Why a min-heap for "largest" (counter-intuitive at first): you want to
efficiently discard the smallest elements as they become irrelevant,
keeping only the top-K candidates - peeking the min of that small set gives
the Kth largest overall. Symmetric logic applies for Kth smallest with a
max-heap of size K.

### Two-heap pattern (running median)

```typescript
class MedianFinder {
  private lowerHalf = new MinHeap<number>((a, b) => b - a); // max-heap: largest of the lower half on top
  private upperHalf = new MinHeap<number>((a, b) => a - b);  // min-heap: smallest of the upper half on top

  addNum(num: number): void {
    this.lowerHalf.push(num);
    this.upperHalf.push(this.lowerHalf.pop()!); // keep every lower <= every upper
    if (this.upperHalf.size() > this.lowerHalf.size()) {
      this.lowerHalf.push(this.upperHalf.pop()!);
    }
  }

  findMedian(): number {
    if (this.lowerHalf.size() > this.upperHalf.size()) return this.lowerHalf.peek()!;
    return (this.lowerHalf.peek()! + this.upperHalf.peek()!) / 2;
  }
}
```

### Merge K sorted lists

```typescript
function mergeKLists(lists: number[][]): number[] {
  const heap = new MinHeap<[number, number, number]>((a, b) => a[0] - b[0]); // [value, listIdx, elIdx]
  for (let i = 0; i < lists.length; i++) if (lists[i].length > 0) heap.push([lists[i][0], i, 0]);

  const result: number[] = [];
  while (!heap.isEmpty()) {
    const [val, listIdx, elIdx] = heap.pop()!;
    result.push(val);
    if (elIdx + 1 < lists[listIdx].length) heap.push([lists[listIdx][elIdx + 1], listIdx, elIdx + 1]);
  }
  return result;
}
```

## Key Patterns

| Signal in the problem statement | Likely pattern |
|---|---|
| "Kth largest/smallest" | Min-heap of size K (largest) or max-heap of size K (smallest) |
| "Top K frequent elements" | Heap of size K on frequency counts (or bucket sort, chapter 11) |
| "Merge K sorted lists/arrays" | Min-heap seeded with one element per list |
| "Median of a data stream" | Two heaps (max-heap lower half, min-heap upper half) |
| "Closest K points to origin" | Max-heap of size K by distance |
| Dijkstra / cheapest path, non-negative weights | Min-heap of `[cost, node]` (chapter 08) |
| "Reorganize string / task scheduler" | Max-heap by frequency, greedy pop |
| "Meeting rooms II", minimum platforms | Min-heap of end times |
| Repeated access to current min/max while the set changes | Any heap |

## Time/Space Complexity Cheat Sheet

| Operation | Time | Notes |
|---|---|---|
| Push / pop | O(log n) | Bubble up / bubble down |
| Peek | O(1) | Root of array |
| Build heap from array (heapify) | O(n) | Not O(n log n) - bottom-up amortized bound |
| Kth largest via size-K heap | O(n log k) | Beats sorting (O(n log n)) when k << n |
| Merge K sorted lists (N total elements) | O(N log k) | k = number of lists |
| Two-heap running median | O(log n) insert, O(1) query | |
| Dijkstra with binary heap | O((V + E) log V) | See chapter 08 |

## Common Mistakes / Interview Tips

- **Assuming JS has a built-in heap.** It doesn't - re-sorting the whole
  array on every insert is O(n log n) repeated, far too slow for a real
  priority queue workload.
- **Using a max-heap when "Kth largest" needs a min-heap of size K (or
  vice versa).** Remember: keep a small heap of "candidates so far" and
  evict the least useful one, which sits at the root.
- **Off-by-one in parent/child index math** - double-check
  `2*i+1`/`2*i+2`/`floor((i-1)/2)`.
- **Forgetting a custom comparator for objects/tuples** - naive numeric
  comparison doesn't work on arrays or objects.
- **Not moving the last element to the root before bubbling down on
  `pop()`** - a common bug is bubbling down with the old root still there.
- **Forgetting heaps are not fully sorted** - only the root is guaranteed
  to be the min (or max).
- **Not rebalancing the two heaps in the median-finder pattern**, letting
  their sizes diverge and breaking the median calculation.
- **Ignoring that heap-based Top-K is O(n log k), not O(n log n)** - be
  ready to justify why the heap approach beats full sorting.

## Hands-on Drills

1. Implement `MinHeap` (push, pop, peek, size) entirely from scratch, then
   derive a max-heap by flipping the comparator. Aim for under 10 minutes.
2. Implement `heapify(arr)` in O(n) and hand-trace the bubble-down calls
   on a small array.
3. Solve "Kth Largest Element in an Array" using a size-K min-heap, then
   re-solve with quickselect (chapter 11) and compare average complexity.
4. Implement `MedianFinder` using the two-heap pattern; test with a stream
   of at least 7 numbers.
5. Implement "Merge K Sorted Arrays" using a min-heap seeded with the
   first element of each array.
6. Implement a min-heap of `[distance, node]` tuples and use it to run
   Dijkstra's algorithm on a small hand-built graph (chapter 08).
7. Trace by hand what happens to the heap array when pushing `[5, 3, 8, 1, 4]`
   one at a time into an empty min-heap.

## Practice

The LeetCode list for this topic is in [problems.md](./problems.md). The interview code to memorize is in [common-techniques.md](./common-techniques.md). Solve **Must** first, then Should, then Optional.

## Mastery Checklist

- [ ] I can implement a `MinHeap` class (push/pop/peek) from scratch
      without references.
- [ ] I know the parent/child index formulas cold.
- [ ] I understand why heapify from an array is O(n), not O(n log n).
- [ ] I correctly decide min-heap vs max-heap for "Kth largest" vs "Kth
      smallest" without hesitating.
- [ ] I can implement the size-K heap pattern for top-K problems.
- [ ] I can implement the two-heap running median pattern.
- [ ] I can use a heap with a custom comparator for tuples/objects.
- [ ] I can explain when a heap beats sorting (O(n log k) vs O(n log n))
      and when it doesn't.
- [ ] I know JavaScript has no built-in heap and can build one under
      interview time pressure.
- [ ] I have solved at least 10 of the problems above from scratch, timed.
