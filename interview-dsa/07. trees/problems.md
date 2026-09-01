# Trees — Problems

Solve in priority order: **Must**, then **Should**, then **Optional**.

Track checkboxes in [PROBLEMS-MASTER-LIST.md](../PROBLEMS-MASTER-LIST.md).

## Problem List

Priority legend (**P** column): **M** = Must (do before any interview),
**S** = Should (do if you have another day or two), **O** = Optional
(nice-to-have breadth).

| P | Problem | LeetCode # | Difficulty | Notes/Pattern |
|---|---|---|---|---|
| M | Binary Tree Inorder Traversal | 94 | Easy | Recursive + iterative traversal |
| M | Binary Tree Level Order Traversal | 102 | Medium | BFS with queue |
| M | Maximum Depth of Binary Tree | 104 | Easy | DFS height |
| M | Balanced Binary Tree | 110 | Easy | Bottom-up height, early exit |
| M | Diameter of Binary Tree | 543 | Easy | Bottom-up height, track global best |
| M | Invert Binary Tree | 226 | Easy | Simple recursive swap |
| M | Symmetric Tree | 101 | Easy | Simultaneous recursion on mirrored pairs |
| M | Path Sum | 112 | Easy | DFS with running sum |
| M | Validate Binary Search Tree | 98 | Medium | Range bounds or inorder |
| M | Kth Smallest Element in a BST | 230 | Medium | Inorder traversal, early stop |
| M | Lowest Common Ancestor of a BST | 235 | Medium | BST ordering shortcut |
| M | Lowest Common Ancestor of a Binary Tree | 236 | Medium | Generic split-point recursion |
| S | Minimum Depth of Binary Tree | 111 | Easy | BFS (avoid DFS pitfall with one-sided nodes) |
| S | Same Tree | 100 | Easy | Simultaneous recursion |
| S | Path Sum II | 113 | Medium | DFS + backtracking, collect paths |
| S | Construct Binary Tree from Preorder and Inorder Traversal | 105 | Medium | Divide and conquer on array indices |
| S | Binary Tree Right Side View | 199 | Medium | BFS, take last of each level |
| S | Binary Tree Zigzag Level Order Traversal | 103 | Medium | BFS + direction flag |
| O | Binary Tree Preorder Traversal | 144 | Easy | Recursive + iterative traversal |
| O | Serialize and Deserialize Binary Tree | 297 | Hard | Preorder + null markers |
