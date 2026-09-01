# Trees — Common techniques

Code you actually write. Why lives in [notes.md](./notes.md).

**Reach for this when:** traversals, height/diameter/balance, BST validate/search/LCA, level-order.

```ts
class TreeNode {
  val: number;
  left: TreeNode | null;
  right: TreeNode | null;
  constructor(val = 0, left: TreeNode | null = null, right: TreeNode | null = null) {
    this.val = val;
    this.left = left;
    this.right = right;
  }
}
```

| Order | Sequence | Use |
|---|---|---|
| Pre | root, L, R | copy / serialize |
| In | L, root, R | BST sorted |
| Post | L, R, root | height, delete, children first |
| Level | BFS | levels, right view, min depth |

## Recursive traversals

```ts
function inorder(root: TreeNode | null, out: number[] = []): number[] {
  if (!root) return out;
  inorder(root.left, out);
  out.push(root.val);
  inorder(root.right, out);
  return out;
}
```

Pre: push, then left, then right. Post: left, right, then push.

## Iterative inorder

```ts
function inorderIter(root: TreeNode | null): number[] {
  const out: number[] = [], st: TreeNode[] = [];
  let cur = root;
  while (cur || st.length) {
    while (cur) { st.push(cur); cur = cur.left; }
    cur = st.pop()!;
    out.push(cur.val);
    cur = cur.right;
  }
  return out;
}
```

## Level-order (do not `shift()`)

```ts
function levelOrder(root: TreeNode | null): number[][] {
  if (!root) return [];
  const q: TreeNode[] = [root];
  let head = 0;
  const res: number[][] = [];
  while (head < q.length) {
    const size = q.length - head;
    const level: number[] = [];
    for (let i = 0; i < size; i++) {
      const n = q[head++];
      level.push(n.val);
      if (n.left) q.push(n.left);
      if (n.right) q.push(n.right);
    }
    res.push(level);
  }
  return res;
}
```

## Return info to parent (diameter / balanced)

```ts
function diameterOfBinaryTree(root: TreeNode | null): number {
  let best = 0;
  function dfs(n: TreeNode | null): number {
    if (!n) return -1; // height in edges
    const L = dfs(n.left), R = dfs(n.right);
    best = Math.max(best, L + R + 2);
    return 1 + Math.max(L, R);
  }
  dfs(root);
  return best;
}
```

One pass. Separate `height()` at every node is O(n^2).

## BST validate (ranges, not just children)

```ts
function isValidBST(root: TreeNode | null, lo = -Infinity, hi = Infinity): boolean {
  if (!root) return true;
  if (root.val <= lo || root.val >= hi) return false;
  return isValidBST(root.left, lo, root.val) && isValidBST(root.right, root.val, hi);
}
```

## LCA

- BST: walk from root until the split (`p` and `q` on different sides, or one is the node).
- Generic tree: recurse; if both sides non-null, this node is LCA.

## Path sum

DFS with running remaining target; backtrack if you push onto a path array.
