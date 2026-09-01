# Heap / Priority Queue — Common techniques

Code you actually write. Why lives in [notes.md](./notes.md). JS has **no** built-in heap — write this class in the interview.

**Reach for this when:** top K, kth largest, merge K lists, running median, Dijkstra, “always take the current min/max from a changing set.”

## Indices in the array

Parent `⌊(i-1)/2⌋`, left `2i+1`, right `2i+2`. Complete tree → no pointers.

## MinHeap

```ts
class MinHeap<T = number> {
  private a: T[] = [];
  constructor(private cmp: (x: T, y: T) => number = (x, y) => (x as number) - (y as number)) {}
  size(): number { return this.a.length; }
  peek(): T | undefined { return this.a[0]; }

  push(v: T): void {
    this.a.push(v);
    this.up(this.a.length - 1);
  }

  pop(): T | undefined {
    if (!this.a.length) return undefined;
    const top = this.a[0];
    const last = this.a.pop()!;
    if (this.a.length) {
      this.a[0] = last;
      this.down(0);
    }
    return top;
  }

  private up(i: number): void {
    while (i > 0) {
      const p = Math.floor((i - 1) / 2);
      if (this.cmp(this.a[i], this.a[p]) >= 0) break;
      [this.a[i], this.a[p]] = [this.a[p], this.a[i]];
      i = p;
    }
  }

  private down(i: number): void {
    const n = this.a.length;
    while (true) {
      let s = i;
      const L = 2 * i + 1, R = 2 * i + 2;
      if (L < n && this.cmp(this.a[L], this.a[s]) < 0) s = L;
      if (R < n && this.cmp(this.a[R], this.a[s]) < 0) s = R;
      if (s === i) break;
      [this.a[i], this.a[s]] = [this.a[s], this.a[i]];
      i = s;
    }
  }
}
```

Max-heap: `new MinHeap<number>((a, b) => b - a)`. Tuples: compare `a[0] - b[0]`.

## Top-K / kth largest — min-heap of size K

```ts
function findKthLargest(nums: number[], k: number): number {
  const h = new MinHeap<number>();
  for (const x of nums) {
    h.push(x);
    if (h.size() > k) h.pop();
  }
  return h.peek()!;
}
```

You keep the K largest; the **smallest of those** is the kth largest.

## Two heaps (running median)

Max-heap = lower half, min-heap = upper half. After each insert, move one value so every lower ≤ every upper, and sizes differ by at most 1.

## Merge K sorted lists

Min-heap of current heads `[val, node]`. Pop smallest, push that node’s next.

## Dijkstra

```ts
// h stores [dist, node]
h.push([0, start]);
while (h.size()) {
  const [d, u] = h.pop()!;
  if (d !== dist[u]) continue; // stale
  for (const [v, w] of adj[u]) {
    if (d + w < dist[v]) {
      dist[v] = d + w;
      h.push([dist[v], v]);
    }
  }
}
```
