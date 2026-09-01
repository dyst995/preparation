# Graphs — Problems

Solve in priority order: **Must**, then **Should**, then **Optional**.

Track checkboxes in [PROBLEMS-MASTER-LIST.md](../PROBLEMS-MASTER-LIST.md).

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
| S | Network Delay Time | 743 | Medium | Dijkstra's algorithm |
| S | Surrounded Regions | 130 | Medium | Border-first DFS/BFS marking |
| O | Cheapest Flights Within K Stops | 787 | Medium | Modified Bellman-Ford / constrained BFS |
| O | Walls and Gates | 286 (Premium) | Medium | Multi-source BFS |
| O | Alien Dictionary | 269 (Premium) | Hard | Build graph from constraints + topo sort |
| O | Minimum Height Trees | 310 | Medium | Topological "peeling" of leaves |
| O | Reconstruct Itinerary | 332 | Hard | Eulerian path (DFS with edge removal) |

## Related — do not solve twice

These appear in this topic's notes, but their **primary** LeetCode home is another folder. Solve them there.

| Problem | LeetCode # | Primary topic |
|---|---|---|
| Graph Valid Tree | 261 | [Union-Find](../18. union-find/problems.md) |
| Redundant Connection | 684 | [Union-Find](../18. union-find/problems.md) |
