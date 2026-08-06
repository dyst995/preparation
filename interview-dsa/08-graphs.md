# 08 - Graphs (BFS, DFS, Topological Sort, Cycle Detection)

## Who this is for

Nika Beroshvili, Software Engineer, 4+ years experience, JS/TS background.
Graph problems are the topic most likely to show up "in disguise" - a grid,
a dependency list, a word-transformation problem - so this chapter leans
heavily on pattern recognition in addition to the core algorithms.

## Learning Objectives

By the end of this chapter you should be able to:

- Represent a graph with an adjacency list in TypeScript, and know when an
  adjacency matrix is preferable.
- Implement BFS and DFS on a graph, both recursively and iteratively.
- Detect cycles in directed and undirected graphs, and explain why the two
  cases need different logic.
- Perform topological sort using both Kahn's algorithm (BFS/in-degree) and
  DFS-based postorder.
- Solve grid-based flood-fill and multi-source BFS problems confidently.
- Recognize when a problem is secretly a graph problem.

## Core Concepts

### 1. Representations

**Adjacency list** (most common in interviews, O(V + E) space):

```typescript
function buildAdjList(n: number, edges: number[][], directed = false): Map<number, number[]> {
  const adj = new Map<number, number[]>();
  for (let i = 0; i < n; i++) adj.set(i, []);
  for (const [u, v] of edges) {
    adj.get(u)!.push(v);
    if (!directed) adj.get(v)!.push(u);
  }
  return adj;
}
```

**Adjacency matrix** (O(V^2) space, O(1) edge lookup) suits dense graphs or
frequent "is there an edge between u and v" queries.

**Implicit graph**: a 2D grid where each cell is a node and neighbors are
up/down/left/right. A very common disguise for graph problems (Number of
Islands, Rotting Oranges, Word Search).

### 2. Directed vs undirected, weighted vs unweighted

- **Directed**: `u -> v` does not imply `v -> u`.
- **Undirected**: edges are bidirectional.
- **Weighted**: edges carry a cost; shortest path needs Dijkstra or
  Bellman-Ford, not plain BFS.
- **Unweighted**: BFS gives the shortest path in terms of number of edges.

### 3. Visited tracking

Always track visited nodes to avoid infinite loops and redundant work.
Common choices: a `Set<number>` / `boolean[]`, or mutating the input grid
in place (marking a visited land cell as water) when the interviewer allows
it.

### 4. Cycle detection

- **Undirected graph**: a cycle exists if DFS reaches a visited node that
  is **not the immediate parent**.
- **Directed graph**: a cycle exists if DFS reaches a node that is
  currently **on the recursion stack** (a "gray" node), not just any
  visited node - revisiting an already fully-processed node in a directed
  graph is normal (multiple paths can reach it) and is not a cycle.

### 5. Topological sort

Only defined for **Directed Acyclic Graphs (DAGs)**. Produces a linear
ordering such that for every edge `u -> v`, `u` comes before `v`. Two
standard approaches: Kahn's algorithm (repeatedly remove in-degree-0
nodes) and DFS-based (push to a stack on finish, then reverse). If the
result can't include all nodes, the graph has a cycle.

## Templates

### BFS (shortest path in an unweighted graph)

```typescript
function bfs(start: number, adj: Map<number, number[]>): Map<number, number> {
  const visited = new Set<number>([start]);
  const queue: number[] = [start];
  const distance = new Map<number, number>([[start, 0]]);
  let head = 0;
  while (head < queue.length) {
    const node = queue[head++];
    for (const neighbor of adj.get(node)!) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor); // mark visited on ENQUEUE, not dequeue
        distance.set(neighbor, distance.get(node)! + 1);
        queue.push(neighbor);
      }
    }
  }
  return distance;
}
```

### DFS (recursive and iterative)

```typescript
function dfsRecursive(node: number, adj: Map<number, number[]>, visited = new Set<number>()): Set<number> {
  if (visited.has(node)) return visited;
  visited.add(node);
  for (const neighbor of adj.get(node)!) dfsRecursive(neighbor, adj, visited);
  return visited;
}

function dfsIterative(start: number, adj: Map<number, number[]>): number[] {
  const visited = new Set<number>();
  const stack = [start];
  const order: number[] = [];
  while (stack.length) {
    const node = stack.pop()!;
    if (visited.has(node)) continue;
    visited.add(node);
    order.push(node);
    for (const neighbor of adj.get(node)!) if (!visited.has(neighbor)) stack.push(neighbor);
  }
  return order;
}
```

### Number of islands (grid DFS, connected components)

```typescript
function numIslands(grid: string[][]): number {
  const rows = grid.length, cols = grid[0].length;
  let count = 0;

  function dfs(r: number, c: number): void {
    if (r < 0 || r >= rows || c < 0 || c >= cols || grid[r][c] !== '1') return;
    grid[r][c] = '0'; // sink the visited cell
    dfs(r + 1, c); dfs(r - 1, c); dfs(r, c + 1); dfs(r, c - 1);
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === '1') { count++; dfs(r, c); }
    }
  }
  return count;
}
```

### Multi-source BFS (Rotting Oranges)

Seed the queue with ALL sources before the first loop iteration; this
naturally computes "distance from the nearest source" for every node.

```typescript
function orangesRotting(grid: number[][]): number {
  const rows = grid.length, cols = grid[0].length;
  let queue: number[][] = [];
  let fresh = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === 2) queue.push([r, c]);
      else if (grid[r][c] === 1) fresh++;
    }
  }
  let minutes = 0;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  while (queue.length && fresh > 0) {
    const next: number[][] = [];
    for (const [r, c] of queue) {
      for (const [dr, dc] of dirs) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] === 1) {
          grid[nr][nc] = 2; fresh--; next.push([nr, nc]);
        }
      }
    }
    queue = next;
    minutes++;
  }
  return fresh === 0 ? minutes : -1;
}
```

### Cycle detection: undirected vs directed

```typescript
function hasCycleUndirected(n: number, adj: Map<number, number[]>): boolean {
  const visited = new Set<number>();
  function dfs(node: number, parent: number): boolean {
    visited.add(node);
    for (const neighbor of adj.get(node)!) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor, node)) return true;
      } else if (neighbor !== parent) {
        return true; // visited node that isn't where we came from
      }
    }
    return false;
  }
  for (let i = 0; i < n; i++) if (!visited.has(i) && dfs(i, -1)) return true;
  return false;
}

function hasCycleDirected(n: number, adj: number[][]): boolean {
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Array(n).fill(WHITE);

  function dfs(node: number): boolean {
    color[node] = GRAY; // on the current recursion stack
    for (const neighbor of adj[node]) {
      if (color[neighbor] === GRAY) return true; // back edge -> cycle
      if (color[neighbor] === WHITE && dfs(neighbor)) return true;
    }
    color[node] = BLACK;
    return false;
  }

  for (let i = 0; i < n; i++) if (color[i] === WHITE && dfs(i)) return true;
  return false;
}
```

### Topological sort: Kahn's algorithm (BFS + in-degree)

```typescript
function topoSortKahn(n: number, edges: number[][]): number[] {
  const adj: number[][] = Array.from({ length: n }, () => []);
  const inDegree = new Array(n).fill(0);
  for (const [u, v] of edges) { adj[u].push(v); inDegree[v]++; }

  const queue: number[] = [];
  for (let i = 0; i < n; i++) if (inDegree[i] === 0) queue.push(i);

  const order: number[] = [];
  let head = 0;
  while (head < queue.length) {
    const node = queue[head++];
    order.push(node);
    for (const neighbor of adj[node]) {
      inDegree[neighbor]--;
      if (inDegree[neighbor] === 0) queue.push(neighbor);
    }
  }
  return order.length === n ? order : []; // empty means the graph has a cycle
}
```

### Topological sort: DFS-based (postorder + reverse)

```typescript
function topoSortDFS(n: number, adj: number[][]): number[] {
  const visited = new Array(n).fill(false);
  const stack: number[] = [];

  function dfs(node: number): void {
    visited[node] = true;
    for (const neighbor of adj[node]) if (!visited[neighbor]) dfs(neighbor);
    stack.push(node); // pushed AFTER all descendants are visited
  }

  for (let i = 0; i < n; i++) if (!visited[i]) dfs(i);
  return stack.reverse();
}
```

### Dijkstra's algorithm (weighted shortest path, non-negative weights)

See chapter 09 for the min-heap implementation this relies on. Conceptually:
Dijkstra is "BFS with a priority queue instead of a plain queue," always
expanding the currently-closest unvisited node.

```typescript
function dijkstra(n: number, adjWithWeights: [number, number][][], src: number): number[] {
  const dist = new Array(n).fill(Infinity);
  dist[src] = 0;
  const pq = new MinHeap<[number, number]>((a, b) => a[0] - b[0]); // [distance, node]
  pq.push([0, src]);

  while (!pq.isEmpty()) {
    const [d, node] = pq.pop()!;
    if (d > dist[node]) continue; // stale entry
    for (const [neighbor, weight] of adjWithWeights[node]) {
      const nd = d + weight;
      if (nd < dist[neighbor]) { dist[neighbor] = nd; pq.push([nd, neighbor]); }
    }
  }
  return dist;
}
```

## Key Patterns

| Signal in the problem statement | Likely pattern |
|---|---|
| Grid with '1'/'0' or land/water, count regions | DFS/BFS flood fill, connected components |
| "Shortest path", unweighted / all edges equal cost | Plain BFS |
| "Shortest path", weighted, non-negative | Dijkstra (min-heap) |
| "Can task A happen before task B", "prerequisites" | Topological sort |
| "Detect a cycle", "is this schedule valid" | Cycle detection (directed 3-color / undirected parent-tracking) |
| "Spread over time" from multiple starting points | Multi-source BFS |
| "Clone a graph" | DFS/BFS + hashmap from original node to clone |
| "Minimum operations to transform A to B" | BFS over implicit states (e.g. word ladder) |
| "Connected components", "friend circles" | DFS/BFS or Union-Find (chapter 18) |
| "Is graph bipartite" | BFS/DFS 2-coloring |

## Time/Space Complexity Cheat Sheet

| Algorithm | Time | Space |
|---|---|---|
| BFS / DFS (adjacency list) | O(V + E) | O(V) |
| BFS / DFS (adjacency matrix) | O(V^2) | O(V^2) |
| Cycle detection (directed or undirected) | O(V + E) | O(V) |
| Topological sort (Kahn's or DFS) | O(V + E) | O(V + E) |
| Dijkstra (binary heap) | O((V + E) log V) | O(V) |
| Bellman-Ford (handles negative weights) | O(V * E) | O(V) |
| Union-Find (path compression + union by rank) | ~O(1) amortized per op | O(V) |
| Number of Islands (m x n grid) | O(m * n) | O(m * n) worst-case recursion stack |

## Common Mistakes / Interview Tips

- **Marking visited on dequeue instead of enqueue** in BFS - causes
  duplicate work and can produce wrong shortest-distance values.
- **Confusing directed and undirected cycle detection.** Using the
  "visited node that's not the parent" check on a directed graph flags
  non-cycles as cycles (e.g. a diamond `A->B, A->C, B->D, C->D`).
- **Forgetting grid boundary checks** before indexing.
- **Not handling disconnected graphs** - loop over ALL nodes and skip
  already-visited ones, rather than starting from a single node.
- **Assuming BFS gives shortest path on a weighted graph** - it only
  guarantees fewest edges, not lowest total weight.
- **Forgetting to mark a grid cell visited immediately** (before
  recursing) - can cause infinite recursion or double counting.
- **Not checking `order.length === n` after Kahn's algorithm** - silently
  returning a partial/wrong order when the graph has a cycle.
- **Using recursion for DFS on very deep/large graphs** and hitting a
  stack overflow - know the iterative stack-based version as backup.

## Hands-on Drills

1. Build an adjacency list from an edge list for both directed and
   undirected graphs, from scratch, in under 3 minutes.
2. Implement BFS and DFS for graph traversal without looking at
   references.
3. Implement `numIslands` using DFS, then re-implement it using BFS.
4. Implement both cycle-detection algorithms and write a comment
   explaining why they differ.
5. Implement Kahn's algorithm, then the DFS-based topo sort, and verify
   they can produce different (but both valid) orderings on the same
   graph.
6. Implement a bipartite check using 2-coloring BFS.
7. Implement Union-Find with path compression and union by rank; use it
   to detect a cycle while adding edges one by one.
8. Trace Dijkstra's algorithm by hand on a 5-node weighted graph before
   coding it.

## Problem List

Priority legend (**P** column): **M** = Must (do before any interview),
**S** = Should (do if you have another day or two), **O** = Optional
(nice-to-have breadth).

| P | Problem | LeetCode # | Difficulty | Notes/Pattern |
|---|---|---|---|---|
| M | Number of Islands | 200 | Medium | Grid DFS/BFS, connected components |
| M | Flood Fill | 733 | Easy | Grid DFS/BFS basics |
| M | Clone Graph | 133 | Medium | DFS/BFS + hashmap for clones |
| M | Course Schedule | 207 | Medium | Cycle detection (directed) / topo sort |
| M | Course Schedule II | 210 | Medium | Topological sort (Kahn's or DFS) |
| M | Rotting Oranges | 994 | Medium | Multi-source BFS |
| M | Is Graph Bipartite? | 785 | Medium | BFS/DFS 2-coloring |
| M | Pacific Atlantic Water Flow | 417 | Medium | Multi-source DFS/BFS from two borders |
| M | Number of Connected Components in an Undirected Graph | 323 (Premium) | Medium | DFS/BFS or Union-Find |
| S | Max Area of Island | 695 | Medium | Grid DFS with size tracking |
| S | Word Ladder | 127 | Hard | BFS over implicit word-graph |
| S | Redundant Connection | 684 | Medium | Union-Find cycle detection |
| S | Network Delay Time | 743 | Medium | Dijkstra's algorithm |
| S | Surrounded Regions | 130 | Medium | Border-first DFS/BFS marking |
| S | Graph Valid Tree | 261 (Premium) | Medium | Cycle detection + connectivity check |
| O | Cheapest Flights Within K Stops | 787 | Medium | Modified Bellman-Ford / constrained BFS |
| O | Walls and Gates | 286 (Premium) | Medium | Multi-source BFS |
| O | Alien Dictionary | 269 (Premium) | Hard | Build graph from constraints + topo sort |
| O | Minimum Height Trees | 310 | Medium | Topological "peeling" of leaves |
| O | Reconstruct Itinerary | 332 | Hard | Eulerian path (DFS with edge removal) |

## Mastery Checklist

- [ ] I can build an adjacency list from raw edges for directed and
      undirected graphs.
- [ ] I can implement BFS and DFS (recursive and iterative) from memory.
- [ ] I know why marking visited at enqueue time (not dequeue time)
      matters in BFS.
- [ ] I can detect a cycle in an undirected graph using parent-tracking
      DFS.
- [ ] I can detect a cycle in a directed graph using the 3-color
      technique, and explain why undirected/directed need different logic.
- [ ] I can implement topological sort via both Kahn's algorithm and DFS
      postorder + reverse.
- [ ] I can solve grid-based flood-fill and multi-source BFS problems
      confidently.
- [ ] I understand when BFS gives shortest path and when I need Dijkstra
      instead.
- [ ] I have solved at least 12 of the problems above from scratch, timed.
- [ ] I can identify a "disguised" graph problem (grids, word
      transformations, dependency lists) within the first minute of
      reading it.
