# 07 - Trees (BST, Traversals, BFS/DFS)

## Who this is for

Nika Beroshvili, Software Engineer, 4+ years experience, JS/TS background.
Trees rarely show up directly in day-to-day frontend/backend JS/TS work (the
DOM and some ORMs are trees, but you rarely hand-roll traversals), which is
exactly why interviewers lean on them - they test recursive thinking and
careful base-case handling. This chapter rebuilds that muscle memory.

## Learning Objectives

By the end of this chapter you should be able to:

- Build and manipulate a binary tree / binary search tree (BST) node
  structure in TypeScript from memory.
- Implement all four traversal orders (preorder, inorder, postorder,
  level-order), both recursively and iteratively.
- Explain what inorder traversal of a BST gives you, and why.
- Solve height/depth, diameter, balance, and path-sum style problems using
  the bottom-up "return info to parent" pattern.
- Recognize when a problem calls for tree DFS vs tree BFS vs exploiting the
  BST ordering property.
- Reconstruct a tree from traversal arrays and serialize/deserialize a tree.

## Core Concepts

### 1. Node shape

```typescript
class TreeNode {
  val: number;
  left: TreeNode | null;
  right: TreeNode | null;
  constructor(val: number = 0, left: TreeNode | null = null, right: TreeNode | null = null) {
    this.val = val;
    this.left = left;
    this.right = right;
  }
}
```

LeetCode usually provides this class definition for you - you just need to
be fluent operating on it.

### 2. Binary tree vs Binary Search Tree (BST)

- **Binary tree**: each node has at most two children, no ordering
  guarantee.
- **BST**: for every node, all values in the left subtree are `<` the
  node's value, and all values in the right subtree are `>` the node's
  value (assume no duplicates unless stated). This invariant is what makes
  search/insert/delete `O(h)`, where `h` is the tree's height.
- A **balanced** BST keeps `h = O(log n)`. Inserting already-sorted data
  into a naive BST degrades it to a linked list, `h = O(n)`.

### 3. Key tree metrics

- **Height** of a node: number of edges on the longest downward path to a
  leaf (empty tree = -1 by one common convention - state your convention
  out loud).
- **Depth** of a node: number of edges from the root to that node.
- **Diameter**: longest path between any two nodes, measured in edges
  unless the problem says otherwise.
- **Balanced tree**: for every node, `|height(left) - height(right)| <= 1`.
- **Complete tree**: every level full except possibly the last, filled left
  to right - this is the shape a binary heap relies on (see chapter 09).

### 4. The four traversals

| Traversal | Order | Typical use |
|---|---|---|
| Preorder | root, left, right | Copy/serialize a tree |
| Inorder | left, root, right | Gives **sorted order** for a BST |
| Postorder | left, right, root | "Process children before parent" - height, subtree sums, delete tree |
| Level-order (BFS) | level by level | Level-based aggregation, min depth, right-side view |

```typescript
function preorder(root: TreeNode | null, out: number[] = []): number[] {
  if (root === null) return out;
  out.push(root.val);
  preorder(root.left, out);
  preorder(root.right, out);
  return out;
}

function inorder(root: TreeNode | null, out: number[] = []): number[] {
  if (root === null) return out;
  inorder(root.left, out);
  out.push(root.val);
  inorder(root.right, out);
  return out;
}

function postorder(root: TreeNode | null, out: number[] = []): number[] {
  if (root === null) return out;
  postorder(root.left, out);
  postorder(root.right, out);
  out.push(root.val);
  return out;
}
```

### 5. Iterative traversals (explicit stack)

```typescript
function preorderIterative(root: TreeNode | null): number[] {
  const out: number[] = [];
  if (!root) return out;
  const stack: TreeNode[] = [root];
  while (stack.length) {
    const node = stack.pop()!;
    out.push(node.val);
    if (node.right) stack.push(node.right); // push right first so left pops first
    if (node.left) stack.push(node.left);
  }
  return out;
}

function inorderIterative(root: TreeNode | null): number[] {
  const out: number[] = [];
  const stack: TreeNode[] = [];
  let curr = root;
  while (curr || stack.length) {
    while (curr) {
      stack.push(curr);
      curr = curr.left;
    }
    curr = stack.pop()!;
    out.push(curr.val);
    curr = curr.right;
  }
  return out;
}
```

### 6. Level-order (BFS) with a queue

```typescript
function levelOrder(root: TreeNode | null): number[][] {
  const result: number[][] = [];
  if (!root) return result;
  let queue: TreeNode[] = [root];
  let head = 0;
  while (head < queue.length) {
    const levelSize = queue.length - head;
    const level: number[] = [];
    for (let i = 0; i < levelSize; i++) {
      const node = queue[head++];
      level.push(node.val);
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
    result.push(level);
  }
  return result;
}
```

Use an index pointer (`head`) instead of `Array.prototype.shift()` for the
queue - `shift()` is O(n) per call, which silently turns BFS into O(n^2) on
large inputs.

### 7. The "return info to the parent" pattern (bottom-up aggregation)

Used for height, diameter, balanced check, subtree sum, max path sum: write
a helper that returns whatever the parent needs, computed bottom-up in a
single pass.

```typescript
function diameterOfBinaryTree(root: TreeNode | null): number {
  let best = 0;
  function dfs(node: TreeNode | null): number {
    if (!node) return -1;
    const leftHeight = dfs(node.left);
    const rightHeight = dfs(node.right);
    best = Math.max(best, leftHeight + rightHeight + 2); // path through this node, in edges
    return 1 + Math.max(leftHeight, rightHeight);
  }
  dfs(root);
  return best;
}

function isBalanced(root: TreeNode | null): boolean {
  function dfs(node: TreeNode | null): number {
    if (!node) return 0;
    const lh = dfs(node.left);
    if (lh === -1) return -1; // already unbalanced below, short-circuit
    const rh = dfs(node.right);
    if (rh === -1 || Math.abs(lh - rh) > 1) return -1;
    return 1 + Math.max(lh, rh);
  }
  return dfs(root) !== -1;
}
```

A naive `isBalanced` that calls a separate `height()` at every node is
O(n^2); this single-pass version is O(n).

### 8. BST search / insert / validate

```typescript
function searchBST(root: TreeNode | null, val: number): TreeNode | null {
  let curr = root;
  while (curr) {
    if (curr.val === val) return curr;
    curr = val < curr.val ? curr.left : curr.right;
  }
  return null;
}

// Validate using a (low, high) RANGE, not just the immediate children
function isValidBST(root: TreeNode | null, low = -Infinity, high = Infinity): boolean {
  if (!root) return true;
  if (root.val <= low || root.val >= high) return false;
  return isValidBST(root.left, low, root.val) && isValidBST(root.right, root.val, high);
}
```

### 9. Lowest Common Ancestor (LCA)

```typescript
// Generic binary tree LCA (no BST property): O(n)
function lowestCommonAncestor(root: TreeNode | null, p: TreeNode, q: TreeNode): TreeNode | null {
  if (!root || root === p || root === q) return root;
  const left = lowestCommonAncestor(root.left, p, q);
  const right = lowestCommonAncestor(root.right, p, q);
  if (left && right) return root; // p and q found in different subtrees -> split point
  return left || right;
}

// BST LCA: exploit ordering to avoid exploring both sides, O(h)
function lowestCommonAncestorBST(root: TreeNode, p: TreeNode, q: TreeNode): TreeNode {
  let curr = root;
  while (true) {
    if (p.val < curr.val && q.val < curr.val) curr = curr.left!;
    else if (p.val > curr.val && q.val > curr.val) curr = curr.right!;
    else return curr;
  }
}
```

### 10. Root-to-leaf path patterns (backtracking flavor)

```typescript
function pathSumAll(root: TreeNode | null, target: number): number[][] {
  const results: number[][] = [];
  const path: number[] = [];

  function dfs(node: TreeNode | null, remaining: number): void {
    if (!node) return;
    path.push(node.val);
    remaining -= node.val;
    if (!node.left && !node.right && remaining === 0) {
      results.push([...path]); // copy - path keeps mutating after this
    } else {
      dfs(node.left, remaining);
      dfs(node.right, remaining);
    }
    path.pop(); // backtrack
  }

  dfs(root, target);
  return results;
}
```

## Key Patterns

| Signal in the problem statement | Likely pattern |
|---|---|
| "sorted order", "kth smallest", BST mentioned | Inorder traversal |
| "level", "zigzag", "right side view", "min depth" | BFS / level-order |
| "path from root to leaf", "sum equals target" | DFS + backtracking, running sum |
| "height", "diameter", "balanced", "is symmetric" | Bottom-up single-pass DFS, return info to parent |
| "serialize/deserialize", "construct tree from arrays" | Preorder + index tracking, or divide and conquer on array bounds |
| "lowest common ancestor" | Split-point recursion (or BST ordering shortcut) |
| "flatten", "invert", "mirror" | Simple recursive restructuring |
| Two trees compared | Simultaneous recursion on both roots |

## Time/Space Complexity Cheat Sheet

| Operation | Balanced BST | Unbalanced BST (worst case) | Generic traversal |
|---|---|---|---|
| Search / insert / delete | O(log n) | O(n) | - |
| Any traversal (pre/in/post/level) | O(n) time | O(n) time | O(n) time |
| Recursion stack space | O(log n) | O(n) | O(h), worst O(n) |
| BFS queue space | O(n) worst case (last level) | O(n) | O(n) |

Any traversal touching every node is O(n) no matter what - the interesting
discussion is almost always about **extra space** (recursion depth = tree
height, queue size = tree width).

## Common Mistakes / Interview Tips

- **Missing the base case** (`if (!root) return ...`) - crashes on the very
  common case of a null child at a leaf.
- **Comparing only immediate children when validating a BST** instead of
  tracking a valid `(low, high)` range - a node can violate an ancestor's
  constraint without violating its direct parent's.
- **Mutating a shared path array without copying** before pushing to
  results, then continuing to mutate it - a classic backtracking bug.
- **Forgetting to backtrack** (pop from the path) after recursing into a
  branch.
- **Mixing height conventions** - decide once whether an empty tree has
  height -1 or 0, and stay consistent across height/diameter/balance code.
- **Using `Array.shift()` in BFS on large inputs** without realizing it's
  O(n) per call - mention the index-pointer optimization if asked about
  true worst-case complexity.
- **Recomputing height repeatedly** (naive `isBalanced` calling `height()`
  at every node = O(n^2)) instead of the combined single-pass O(n) version.
- **Not exploiting the BST property** - doing a full O(n) traversal to
  find/insert/delete when O(h) is possible.
- **Ignoring duplicate values in a BST** - clarify with the interviewer
  whether duplicates are allowed and which side they go to.

## Hands-on Drills

1. Implement all four traversals (pre/in/post/level), both recursively and
   iteratively, from memory, in under 15 minutes total.
2. Write `height(root)` and `countNodes(root)` from scratch.
3. Write a function that checks whether two trees are structurally
   identical with identical values.
4. Implement `kthSmallest(root, k)` two ways: full inorder into an array
   then index, and an early-stopping iterative inorder with a counter.
5. Implement `closestValue(root, target)` for a BST in O(h).
6. Implement `flatten(root)` that turns a binary tree into a "linked list"
   following preorder, using only `right` pointers, in place.
7. Time yourself solving Diameter of Binary Tree using the single-pass
   bottom-up trick in under 10 minutes.
8. Implement serialize/deserialize for a binary tree using preorder plus
   null markers.

## Practice

The LeetCode list for this topic is in [problems.md](./problems.md). The interview code to memorize is in [common-techniques.md](./common-techniques.md). Solve **Must** first, then Should, then Optional.

## Mastery Checklist

- [ ] I can write recursive preorder/inorder/postorder from memory without
      hesitation.
- [ ] I can write iterative preorder and inorder using an explicit stack.
- [ ] I can write BFS level-order traversal, including the per-level array
      variant.
- [ ] I understand why inorder traversal of a BST is sorted.
- [ ] I can validate a BST correctly using range bounds, not parent/child
      comparisons.
- [ ] I can compute height, diameter, and balance in a single bottom-up
      pass.
- [ ] I can find the LCA both for a generic binary tree and by exploiting
      BST ordering.
- [ ] I can solve root-to-leaf path problems using DFS + backtracking,
      correctly copying arrays before pushing to results.
- [ ] I have solved at least 12 of the problems above from scratch, timed.
- [ ] I can identify within 30 seconds whether a new tree problem needs DFS
      or BFS.
