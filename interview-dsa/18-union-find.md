# 18. Union-Find (Disjoint Set Union)

## Overview

Union-Find (a.k.a. Disjoint Set Union, DSU) maintains a collection of
disjoint sets and supports two operations extremely fast:

- `find(x)`: which set does `x` belong to? (returns a representative/root)
- `union(x, y)`: merge the sets containing `x` and `y`.

With two optimizations -- **path compression** (flatten the tree during
`find`) and **union by rank/size** (attach the smaller tree under the
bigger one) -- both operations run in amortized O(alpha(n)) time, where
alpha is the inverse Ackermann function, effectively constant for all
practical input sizes. This makes Union-Find the go-to tool for dynamic
connectivity problems that BFS/DFS would otherwise need to recompute from
scratch.

## When to Suspect Union-Find

- "Number of connected components," "are these two nodes connected,"
  "group items that are transitively related."
- Detecting a cycle in an UNDIRECTED graph while building it edge by edge.
- Problems where edges/relations arrive incrementally and you need
  connectivity queries interleaved with updates (online connectivity).
- "Accounts merge," "friend circles," "provinces," "redundant connection."
- Kruskal's Minimum Spanning Tree algorithm (sort edges by weight, union if
  they connect different components).
- Grid problems where you union adjacent cells to count/merge regions
  (alternative to BFS/DFS flood fill, especially useful when merges/queries
  are interleaved, e.g. "Number of Islands II").

-------------------------------------------------------------------------------

## Core Implementation (Path Compression + Union by Size)

```python
class UnionFind:
    def __init__(self, n):
        self.parent = list(range(n))
        self.size = [1] * n
        self.count = n  # number of distinct components

    def find(self, x):
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]  # path halving
            x = self.parent[x]
        return x

    def union(self, x, y):
        root_x, root_y = self.find(x), self.find(y)
        if root_x == root_y:
            return False  # already connected -> this edge creates a cycle
        if self.size[root_x] < self.size[root_y]:
            root_x, root_y = root_y, root_x
        self.parent[root_y] = root_x
        self.size[root_x] += self.size[root_y]
        self.count -= 1
        return True

    def connected(self, x, y):
        return self.find(x) == self.find(y)
```

Full path compression (recursive, slightly more intuitive, marginally more
stack overhead):

```python
def find(self, x):
    if self.parent[x] != x:
        self.parent[x] = self.find(self.parent[x])
    return self.parent[x]
```

-------------------------------------------------------------------------------

## Pattern 1: Cycle Detection in an Undirected Graph

If `union(u, v)` returns `False`, then `u` and `v` were already connected
before adding this edge, meaning this edge closes a cycle.

```python
def find_redundant_connection(edges):  # LC 684
    n = len(edges)
    uf = UnionFind(n + 1)
    for u, v in edges:
        if not uf.union(u, v):
            return [u, v]
    return []
```

## Pattern 2: Counting Connected Components

Initialize `count = n`, decrement on every successful union; the final
`count` is the number of components.

```python
def count_components(n, edges):  # similar to LC 323 (premium) / 547
    uf = UnionFind(n)
    for u, v in edges:
        uf.union(u, v)
    return uf.count
```

```python
def find_circle_num(is_connected):  # Number of Provinces, LC 547
    n = len(is_connected)
    uf = UnionFind(n)
    for i in range(n):
        for j in range(i + 1, n):
            if is_connected[i][j] == 1:
                uf.union(i, j)
    return uf.count
```

## Pattern 3: Grouping / Merging Items by Transitive Relation

Union-Find shines when "belongs to the same group" is transitive (accounts
with shared emails, equations that must hold via `==`).

```python
def accounts_merge(accounts):  # LC 721
    email_to_id = {}
    email_to_name = {}
    uf = UnionFind(len(accounts))
    for i, account in enumerate(accounts):
        name = account[0]
        for email in account[1:]:
            email_to_name[email] = name
            if email in email_to_id:
                uf.union(i, email_to_id[email])
            else:
                email_to_id[email] = i

    groups = {}
    for email, idx in email_to_id.items():
        root = uf.find(idx)
        groups.setdefault(root, []).append(email)

    return [[email_to_name[emails[0]]] + sorted(emails)
            for emails in groups.values()]
```

## Pattern 4: Weighted Union-Find (Union-Find with Relationships/Ratios)

Store an extra "relationship to parent" value (e.g. a ratio) alongside each
node, updating it during path compression to maintain the transitive
relationship.

```python
def calc_equation(equations, values, queries):  # Evaluate Division, LC 399
    parent = {}
    ratio = {}

    def find(x):
        if x not in parent:
            parent[x] = x
            ratio[x] = 1.0
        if parent[x] != x:
            root = find(parent[x])
            ratio[x] *= ratio[parent[x]]
            parent[x] = root
        return parent[x]

    def union(a, b, val):
        root_a, root_b = find(a), find(b)
        if root_a != root_b:
            parent[root_a] = root_b
            ratio[root_a] = val * ratio[b] / ratio[a]

    for (a, b), val in zip(equations, values):
        union(a, b, val)

    result = []
    for a, b in queries:
        if a not in parent or b not in parent or find(a) != find(b):
            result.append(-1.0)
        else:
            result.append(ratio[a] / ratio[b])
    return result
```

## Pattern 5: Union-Find on a Grid

Map each cell `(r, c)` to a single integer id `r * cols + c`, then union
adjacent cells that satisfy the merge condition (same land, same color,
etc). Especially useful over BFS/DFS flood fill when unions/queries are
interleaved (e.g. islands are added one at a time).

```python
def num_islands_2(m, n, positions):  # LC 305, premium
    uf = UnionFind(m * n)
    grid = [[0] * n for _ in range(m)]
    result = []
    land_count = 0
    for r, c in positions:
        if grid[r][c] == 1:
            result.append(land_count)
            continue
        grid[r][c] = 1
        land_count += 1
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nr, nc = r + dr, c + dc
            if 0 <= nr < m and 0 <= nc < n and grid[nr][nc] == 1:
                if uf.union(r * n + c, nr * n + nc):
                    land_count -= 1
        result.append(land_count)
    return result
```

-------------------------------------------------------------------------------

## Union-Find vs BFS/DFS: When to Prefer Which

| Signal                                                          | Prefer      |
|-------------------------------------------------------------------|--------------|
| Static graph, one-time "find all components" query                  | BFS/DFS      |
| Edges/unions arrive incrementally, interleaved with queries           | Union-Find   |
| Need to detect a cycle while building an undirected graph edge-by-edge | Union-Find  |
| Building an MST (Kruskal's algorithm)                                | Union-Find   |
| Need shortest path / path length, not just connectivity               | BFS/DFS      |
| Need to know exact traversal order / path itself                       | BFS/DFS      |
| Simple grid island counting (single pass, no incremental updates)      | BFS/DFS (simpler) or Union-Find (equally valid) |

-------------------------------------------------------------------------------

## Common Pitfalls

- Forgetting path compression or union by size/rank -- without both,
  worst-case `find` degrades to O(n) per call (a long chain), making the
  whole algorithm O(n^2) instead of near O(n).
- Off-by-one when mapping grid cells to ids (`r * cols + c` vs
  `r * rows + c` -- always use the number of COLUMNS as the multiplier).
  the number of COLUMNS as the multiplier.
- Forgetting to decrement the component `count` only on a SUCCESSFUL union
  (when the two roots were different) -- double counting merges is a common
  bug.
- Not initializing a node lazily when the node set is not `0..n-1` but
  arbitrary values/strings (use a dict-based parent map instead of a list,
  as in the Evaluate Division example above).
- Mixing up `find(x) == find(y)` (correct connectivity check) with
  `parent[x] == parent[y]` (incorrect -- parent may not be the root before
  path compression fully resolves).

## Interview Tips

- Always mention BOTH optimizations by name: "I'll use path compression and
  union by size/rank to get near O(1) amortized operations" -- this is a
  strong signal of CS fundamentals knowledge.
- If asked for complexity, say "O(alpha(n)) amortized per operation, which
  is effectively constant for all realistic n" -- know this term even if you
  do not need to derive it.
- For cycle detection, explicitly state: "if `union` returns false, the two
  nodes were already connected, so this edge would create a cycle."
  Interviewers appreciate hearing the invariant, not just the code.
- If the interviewer asks "could you also do this with BFS/DFS?" -- yes, say
  so, and explain the trade-off (Union-Find is better for incremental/online
  updates; BFS/DFS is simpler and sufficient for one-shot static queries).

-------------------------------------------------------------------------------

## Problem List

| Problem                                                    | LeetCode # | Difficulty | Priority | Notes                                |
|----------------------------------------------------------------|------------|------------|----------|------------------------------------------|
| Number of Provinces                                              | 547        | Medium     | Must     | classic union over adjacency matrix       |
| Redundant Connection                                              | 684        | Medium     | Must     | cycle detection, union returns False       |
| Accounts Merge                                                    | 721        | Medium     | Must     | group by transitive email relationship     |
| Number of Islands                                                  | 200        | Medium     | Must     | can solve via union-find or BFS/DFS        |
| Graph Valid Tree                                                    | 261        | Medium     | Should   | premium; n-1 edges + fully connected       |
| Redundant Connection II                                              | 685        | Hard       | Should   | directed graph variant, trickier cases      |
| Most Stones Removed with Same Row or Column                            | 947        | Medium     | Should   | components; answer = stones - components   |
| Satisfiability of Equality Equations                                    | 990        | Medium     | Should   | union `==` pairs, then check `!=` pairs    |
| Evaluate Division                                                        | 399        | Medium     | Should   | weighted union-find with ratios            |
| Smallest String With Swaps                                                | 1202       | Medium     | Should   | union indices, sort chars within component |
| Number of Operations to Make Network Connected                            | 1319       | Medium     | Should   | need >= (components - 1) extra edges       |
| Number of Islands II                                                        | 305        | Hard       | Optional | premium; online union-find on a grid       |
| Making A Large Island                                                        | 827        | Hard       | Optional | union-find or DFS with component sizes      |
| Regions Cut By Slashes                                                        | 959        | Medium     | Optional | subdivide each cell into 4 triangles         |
| Minimize Malware Spread                                                        | 924        | Hard       | Optional | components + careful counting per node       |
| The Earliest Moment When Everyone Become Friends                                | 1101       | Medium     | Optional | premium; sort by time, union until count==1  |
| Swim in Rising Water                                                            | 778        | Hard       | Optional | union-find with edges sorted by weight        |
| Path with Minimum Effort                                                        | 1631       | Medium     | Optional | binary search + union-find, or Dijkstra       |
| Optimize Water Distribution in a Village                                          | 1168       | Hard       | Optional | premium; MST via Kruskal's with virtual node  |
