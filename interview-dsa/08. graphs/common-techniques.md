# Graphs — Common techniques

Code you actually write. Why lives in [notes.md](./notes.md).

**Reach for this when:** islands, clone graph, course schedule, rotting oranges, bipartite, shortest **unweighted**. Weighted shortest: heap + Dijkstra. Connectivity while edges arrive: [18](../18. union-find/common-techniques.md).

## Adjacency list

```ts
function buildAdj(n: number, edges: number[][], directed = false): Map<number, number[]> {
  const adj = new Map<number, number[]>();
  for (let i = 0; i < n; i++) adj.set(i, []);
  for (const [u, v] of edges) {
    adj.get(u)!.push(v);
    if (!directed) adj.get(v)!.push(u);
  }
  return adj;
}
```

Mark visited **on enqueue** (BFS) so you do not queue the same node twice.

## BFS (unweighted shortest)

```ts
function bfs(start: number, adj: Map<number, number[]>): Map<number, number> {
  const dist = new Map([[start, 0]]);
  const q = [start];
  let head = 0;
  while (head < q.length) {
    const u = q[head++];
    for (const v of adj.get(u) ?? []) {
      if (!dist.has(v)) {
        dist.set(v, dist.get(u)! + 1);
        q.push(v);
      }
    }
  }
  return dist;
}
```

## DFS

```ts
function dfs(u: number, adj: Map<number, number[]>, seen = new Set<number>()): void {
  if (seen.has(u)) return;
  seen.add(u);
  for (const v of adj.get(u) ?? []) dfs(v, adj, seen);
}
```

## Grid islands (sink visited cells)

```ts
function numIslands(grid: string[][]): number {
  const R = grid.length, C = grid[0].length;
  const dfs = (r: number, c: number) => {
    if (r < 0 || r >= R || c < 0 || c >= C || grid[r][c] !== '1') return;
    grid[r][c] = '0';
    dfs(r + 1, c); dfs(r - 1, c); dfs(r, c + 1); dfs(r, c - 1);
  };
  let n = 0;
  for (let r = 0; r < R; r++)
    for (let c = 0; c < C; c++)
      if (grid[r][c] === '1') { n++; dfs(r, c); }
  return n;
}
```

## Multi-source BFS

Seed the queue with **all** sources first (all rotten oranges). Then each round is +1 minute. Same idea as “distance to nearest 0.”

## Cycle

- **Undirected:** DFS hits a visited node that is not the parent.
- **Directed:** DFS hits a node still **on the recursion stack** (gray), not merely visited.

## Kahn topological sort

```ts
function topo(n: number, edges: number[][]): number[] {
  const adj = buildAdj(n, edges, true);
  const indeg = new Array(n).fill(0);
  for (const [u, v] of edges) indeg[v]++;
  const q: number[] = [];
  for (let i = 0; i < n; i++) if (indeg[i] === 0) q.push(i);
  const order: number[] = [];
  let head = 0;
  while (head < q.length) {
    const u = q[head++];
    order.push(u);
    for (const v of adj.get(u)!) {
      if (--indeg[v] === 0) q.push(v);
    }
  }
  return order.length === n ? order : []; // empty → cycle
}
```

Course Schedule is this: can you topo-sort?

## Dijkstra (after you have a heap)

Min-heap of `[dist, node]`. Skip stale heap entries. Non-negative weights only.
