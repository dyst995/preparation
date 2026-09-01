# Recursion and Backtracking — Common techniques

Code you actually write. Why lives in [notes.md](./notes.md).

**Reach for this when:** generate all subsets / perms / combinations, N-Queens, word search, “all valid …” JS has **no** TCO — deep recursion can blow the stack.

## Choose → explore → un-choose

```ts
function backtrack<T>(cands: T[]): T[][] {
  const res: T[][] = [];
  const path: T[] = [];

  function go(start: number): void {
    if (/* complete */) {
      res.push([...path]); // copy
      return;
    }
    for (let i = start; i < cands.length; i++) {
      if (/* prune */) continue;
      path.push(cands[i]);
      go(i + 1);           // i     = reuse allowed (combination sum)
                           // i + 1 = no reuse (subsets, combinations)
                           // 0 + used[] = permutations
      path.pop();
    }
  }
  go(0);
  return res;
}
```

## Subsets

```ts
function subsets(nums: number[]): number[][] {
  const res: number[][] = [];
  const path: number[] = [];
  function go(start: number): void {
    res.push([...path]); // every prefix is a subset
    for (let i = start; i < nums.length; i++) {
      path.push(nums[i]);
      go(i + 1);
      path.pop();
    }
  }
  go(0);
  return res;
}
```

Duplicates: sort, then `if (i > start && nums[i] === nums[i - 1]) continue`.

## Permutations

```ts
function permute(nums: number[]): number[][] {
  const res: number[][] = [];
  const path: number[] = [];
  const used = new Array(nums.length).fill(false);
  function go(): void {
    if (path.length === nums.length) { res.push([...path]); return; }
    for (let i = 0; i < nums.length; i++) {
      if (used[i]) continue;
      used[i] = true;
      path.push(nums[i]);
      go();
      path.pop();
      used[i] = false;
    }
  }
  go();
  return res;
}
```

## Combination sum (reuse allowed)

Recurse `go(i)` not `go(i+1)` after pushing `cands[i]`. Prune when remaining < 0.

## Grid DFS (word search)

Mark cell visited, recurse 4 dirs, unmark. Bound check first.

## Recursion vs DP

Same tree of calls with **overlapping** subproblems → memoize / table. That is [13](../13. dynamic-programming/common-techniques.md).
