# Union-Find — Common techniques

Code you actually write. Why lives in [notes.md](./notes.md). First-time “number of islands” is grid DFS in [08](../08. graphs/common-techniques.md). Use DSU when relations **arrive over time** or you need “already connected?” while adding edges.

**Reach for this when:** provinces, redundant connection, accounts merge, valid tree, Kruskal.

With path compression + union by size, `find`/`union` are ~O(1) amortized.

## The class

```ts
class UnionFind {
  parent: number[];
  size: number[];
  count: number;

  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.size = new Array(n).fill(1);
    this.count = n;
  }

  find(x: number): number {
    while (this.parent[x] !== x) {
      this.parent[x] = this.parent[this.parent[x]]; // path halving
      x = this.parent[x];
    }
    return x;
  }

  union(a: number, b: number): boolean {
    let x = this.find(a), y = this.find(b);
    if (x === y) return false; // already connected → this edge is a cycle
    if (this.size[x] < this.size[y]) [x, y] = [y, x];
    this.parent[y] = x;
    this.size[x] += this.size[y];
    this.count--;
    return true;
  }

  connected(a: number, b: number): boolean {
    return this.find(a) === this.find(b);
  }
}
```

Recursive find: `if (parent[x] !== x) parent[x] = find(parent[x]); return parent[x];`

## Cycle on undirected edges

```ts
function findRedundantConnection(edges: number[][]): number[] {
  const uf = new UnionFind(edges.length + 1);
  for (const [u, v] of edges) if (!uf.union(u, v)) return [u, v];
  return [];
}
```

## Count components

Start `count = n`. Decrement on every **successful** union. Final `count` is the answer (provinces, graph valid tree needs `count === 1` and `n - 1` edges).

## Transitive grouping (accounts merge)

Map email → first account id. If the email is already owned, `union` the two account ids. Then group emails by `find(id)`.

## Weighted / ratio UF

Store `ratio[x]` = value of `x` relative to `parent[x]`. Update during `find` so `x / root` stays consistent (Evaluate Division).

## Grid

Map `(r, c) → r * cols + c`. Union a cell with its 4-neighbors that are land. Useful when land is added **online** (Number of Islands II).
