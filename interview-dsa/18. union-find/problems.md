# Union-Find — Problems

Solve in priority order: **Must**, then **Should**, then **Optional**.

Track checkboxes in [PROBLEMS-MASTER-LIST.md](../PROBLEMS-MASTER-LIST.md).

## Problem List

| Problem                                                    | LeetCode # | Difficulty | Priority | Notes                                |
|----------------------------------------------------------------|------------|------------|----------|------------------------------------------|
| Number of Provinces                                              | 547        | Medium     | Must     | classic union over adjacency matrix       |
| Redundant Connection                                              | 684        | Medium     | Must     | cycle detection, union returns False       |
| Accounts Merge                                                    | 721        | Medium     | Must     | group by transitive email relationship     |
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

## Related — do not solve twice

These appear in this topic's notes, but their **primary** LeetCode home is another folder. Solve them there.

| Problem | LeetCode # | Primary topic |
|---|---|---|
| Number of Islands | 200 | [Graphs](../08. graphs/problems.md) |
