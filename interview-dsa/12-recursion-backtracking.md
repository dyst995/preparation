# 12 - Recursion & Backtracking

## Who this is for

Nika Beroshvili, Software Engineer, 4+ years experience, JS/TS background.
Day-to-day JS/TS rarely demands hand-rolled exhaustive search, so
backtracking often feels unfamiliar even to experienced engineers. This
chapter drills the single reusable "choose, explore, un-choose" template
until it's automatic, since nearly every backtracking problem is a small
variation on it.

## Learning Objectives

By the end of this chapter you should be able to:

- Identify the base case and recursive case for a new problem quickly.
- Explain recursion in terms of the call stack and trace through a few
  levels by hand.
- Write the standard backtracking template (choose, explore, un-choose)
  and apply it to combinations, permutations, subsets, and
  constraint-satisfaction problems (N-Queens, Sudoku).
- Add pruning to backtracking to cut off invalid branches early.
- Recognize the difference between recursion that just restates a formula
  (factorial, Fibonacci) and recursion used for exhaustive search
  (backtracking).
- Convert simple recursion to memoized recursion when overlapping
  subproblems appear - the bridge to chapter 13 (Dynamic Programming).

## Core Concepts

### 1. What recursion actually is

A recursive function solves a problem via a **base case** (the simplest
input, answered directly) and a **recursive case** (express the solution
to a bigger input using the solution to smaller input(s), plus some work to
combine them). Each call pushes a stack frame; when the base case is hit,
frames pop and return values back up the chain.

```typescript
function factorial(n: number): number {
  if (n <= 1) return 1;        // base case
  return n * factorial(n - 1); // recursive case
}
```

### 2. Recursion vs iteration in JS/TS

Anything recursive can be rewritten iteratively with an explicit stack, and
vice versa. Prefer recursion for naturally tree-like/nested structures and
exhaustive search. **Do not rely on tail-call optimization in JS** - despite
being in the ES6 spec, most engines (V8/Node/Chrome) don't implement it, so
deep "tail recursive" functions can still overflow the stack.

### 3. Backtracking: recursion plus undo

**Backtracking** is DFS over a decision tree of choices:

1. **Choose** an option (add it to the current partial solution).
2. **Explore** further with that choice in place (recurse).
3. **Un-choose** (remove it) before trying the next option - this restores
   shared state so sibling branches start clean.

This "undo" step is what distinguishes backtracking from plain
recursion/DFS - you mutate and restore shared state rather than passing
fresh copies at every level.

### 4. Pruning

**Pruning** means stopping early on a branch that can't lead to a valid
solution, checked BEFORE recursing rather than after. In N-Queens, don't
try placing a queen in a column/diagonal already under attack - check
first. Good pruning is often the difference between a solution that times
out and one that runs comfortably within limits.

## Templates

### The core backtracking template

```typescript
function backtrackTemplate<T>(candidates: T[]): T[][] {
  const results: T[][] = [];
  const path: T[] = [];

  function backtrack(startIndex: number): void {
    if (isComplete(path)) {
      results.push([...path]); // copy, don't push the live array reference
      return;
    }
    for (let i = startIndex; i < candidates.length; i++) {
      if (!isValidChoice(candidates[i], path)) continue; // pruning

      path.push(candidates[i]);   // choose
      backtrack(i + 1);           // explore
      path.pop();                 // un-choose (backtrack)
    }
  }

  backtrack(0);
  return results;

  function isComplete(p: T[]): boolean { return false; } // placeholder
  function isValidChoice(c: T, p: T[]): boolean { return true; } // placeholder
}
```

The three things that change between problems: what counts as a complete
solution, what the pruning condition is, and whether you recurse with `i`
(allow reuse), `i + 1` (no reuse), or `0` with a separate "used" tracker
(permutations, order matters).

### Subsets (power set)

```typescript
function subsets(nums: number[]): number[][] {
  const results: number[][] = [];
  const path: number[] = [];

  function backtrack(start: number): void {
    results.push([...path]); // every path is a valid subset, including empty
    for (let i = start; i < nums.length; i++) {
      path.push(nums[i]);
      backtrack(i + 1);
      path.pop();
    }
  }

  backtrack(0);
  return results;
}
```

### Subsets with duplicates (skip same-level duplicates)

```typescript
function subsetsWithDup(nums: number[]): number[][] {
  nums.sort((a, b) => a - b); // duplicates must be adjacent
  const results: number[][] = [];
  const path: number[] = [];

  function backtrack(start: number): void {
    results.push([...path]);
    for (let i = start; i < nums.length; i++) {
      if (i > start && nums[i] === nums[i - 1]) continue; // skip duplicate at THIS level
      path.push(nums[i]);
      backtrack(i + 1);
      path.pop();
    }
  }

  backtrack(0);
  return results;
}
```

### Permutations (order matters, track "used")

```typescript
function permute(nums: number[]): number[][] {
  const results: number[][] = [];
  const path: number[] = [];
  const used = new Array(nums.length).fill(false);

  function backtrack(): void {
    if (path.length === nums.length) { results.push([...path]); return; }
    for (let i = 0; i < nums.length; i++) {
      if (used[i]) continue;
      used[i] = true;
      path.push(nums[i]);
      backtrack();
      path.pop();
      used[i] = false;
    }
  }

  backtrack();
  return results;
}
```

### Combination Sum (reuse allowed, target-based pruning)

```typescript
function combinationSum(candidates: number[], target: number): number[][] {
  const results: number[][] = [];
  const path: number[] = [];

  function backtrack(start: number, remaining: number): void {
    if (remaining === 0) { results.push([...path]); return; }
    if (remaining < 0) return; // prune: overshoot

    for (let i = start; i < candidates.length; i++) {
      path.push(candidates[i]);
      backtrack(i, remaining - candidates[i]); // `i`, not `i+1` - reuse allowed
      path.pop();
    }
  }

  backtrack(0, target);
  return results;
}
```

### N-Queens (constraint satisfaction with pruning via sets)

```typescript
function solveNQueens(n: number): string[][] {
  const results: string[][] = [];
  const cols = new Set<number>();
  const diag1 = new Set<number>(); // row - col constant along a "/" diagonal
  const diag2 = new Set<number>(); // row + col constant along a "\" diagonal
  const placement: number[] = [];

  function backtrack(row: number): void {
    if (row === n) { results.push(buildBoard(placement, n)); return; }
    for (let col = 0; col < n; col++) {
      if (cols.has(col) || diag1.has(row - col) || diag2.has(row + col)) continue; // prune

      cols.add(col); diag1.add(row - col); diag2.add(row + col);
      placement.push(col);

      backtrack(row + 1);

      cols.delete(col); diag1.delete(row - col); diag2.delete(row + col);
      placement.pop();
    }
  }

  function buildBoard(placement: number[], n: number): string[] {
    return placement.map((col) => '.'.repeat(col) + 'Q' + '.'.repeat(n - col - 1));
  }

  backtrack(0);
  return results;
}
```

This is the canonical "check constraints BEFORE recursing" pruning pattern
- far more efficient than placing a queen anywhere and validating only at
the end.

### Word Search (grid backtracking with visited marking)

```typescript
function exist(board: string[][], word: string): boolean {
  const rows = board.length, cols = board[0].length;

  function backtrack(r: number, c: number, idx: number): boolean {
    if (idx === word.length) return true;
    if (r < 0 || r >= rows || c < 0 || c >= cols || board[r][c] !== word[idx]) return false;

    const temp = board[r][c];
    board[r][c] = '#'; // mark visited in place

    const found =
      backtrack(r + 1, c, idx + 1) ||
      backtrack(r - 1, c, idx + 1) ||
      backtrack(r, c + 1, idx + 1) ||
      backtrack(r, c - 1, idx + 1);

    board[r][c] = temp; // restore (backtrack!)
    return found;
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (backtrack(r, c, 0)) return true;
    }
  }
  return false;
}
```

### Memoization: bridge to Dynamic Programming (chapter 13)

When recursive calls repeat the same subproblem, cache results.

```typescript
function fibNaive(n: number): number { // O(2^n)
  if (n <= 1) return n;
  return fibNaive(n - 1) + fibNaive(n - 2);
}

function fibMemo(n: number, memo = new Map<number, number>()): number { // O(n)
  if (n <= 1) return n;
  if (memo.has(n)) return memo.get(n)!;
  const result = fibMemo(n - 1, memo) + fibMemo(n - 2, memo);
  memo.set(n, result);
  return result;
}
```

Only add memoization when the SAME state is recomputed across different
call paths - draw the recursion tree for a small input to check first.

## Key Patterns

| Signal in the problem statement | Likely pattern |
|---|---|
| "Generate all subsets/combinations/permutations" | Backtracking, choose/explore/un-choose |
| "Generate all valid ways to..." (parentheses, IP addresses, palindrome partitions) | Backtracking with a validity check per step |
| Grid + "does a path exist matching a pattern" | Backtracking DFS on grid with visited marking/restoring |
| N-Queens, Sudoku, graph coloring | Constraint satisfaction backtracking with pruning sets |
| Nested/recursive data structure | Natural recursion, no backtracking undo needed |
| Same subproblem computed multiple times in the recursion tree | Add memoization - bridge to DP (chapter 13) |
| "All possible" / "every combination" wording | Strong signal for backtracking, expect exponential branches |

## Time/Space Complexity Cheat Sheet

| Problem type | Typical time complexity | Notes |
|---|---|---|
| Subsets of n elements | O(2^n * n) | 2^n subsets, O(n) to copy each |
| Permutations of n elements | O(n! * n) | n! permutations, O(n) to copy each |
| Combinations choose k of n | O(C(n,k) * k) | Binomial coefficient count |
| Combination Sum (reuse allowed) | Exponential, bounded by target/min(candidate) | Pruning on `remaining < 0` is essential |
| N-Queens | Much less than O(n!) in practice with pruning | Constraint propagation cuts real branches |
| Word Search on m x n grid | O(m * n * 4^L) | L = word length |
| Naive recursive Fibonacci | O(2^n) | Exponential from repeated subproblems |
| Memoized recursive Fibonacci | O(n) | Each state computed once |
| Recursion call stack space | O(depth) | Can hit engine stack limits (~10-15k frames in Node) |

## Common Mistakes / Interview Tips

- **Missing or wrong base case** - causes infinite recursion and a stack
  overflow (`RangeError: Maximum call stack size exceeded`).
- **Pushing the live `path` array into results instead of a copy** - since
  `path` keeps mutating, all saved references end up reflecting the final
  state, not the state at capture time.
- **Forgetting to backtrack (undo) the choice** - forgetting `path.pop()`
  or forgetting to reset `used[i]`/restore a grid cell corrupts sibling
  branches.
- **Mixing up `i` vs `i+1` vs `0` when recursing** - "no reuse" (`i+1`),
  "reuse allowed" (`i`), "permutations" (`0` + a used-tracker) are the
  most common source of subtly wrong output.
- **Not sorting before skipping duplicates** - the `nums[i] === nums[i-1]`
  duplicate-skip trick only works if duplicates are adjacent.
- **Checking validity only at the end instead of pruning early** - the
  difference between an instant N-Queens solution and one that times out.
- **Adding memoization to recursion without overlapping subproblems**
  (e.g. plain subset generation) - adds complexity with no benefit.
- **Relying on JS tail-call optimization** for deep "tail recursive"
  functions - rewrite as a loop if depth could be large.
- **Not accounting for the exponential nature of backtracking** when
  reasoning about time limits given `n` in the problem statement.

## Hands-on Drills

1. Write `factorial(n)` and `fibNaive(n)` from scratch, then draw the
   recursion tree for `fibNaive(5)` by hand to see the repeated
   subproblems.
2. Convert `fibNaive` to `fibMemo` using a `Map`, and separately implement
   a bottom-up iterative version - compare all three.
3. Implement the `subsets` backtracking template from memory, then modify
   it minimally to solve `combinationSum` (identify exactly which lines
   change).
4. Implement `permute` using the `used[]` array approach, then re-implement
   it by swapping elements in place instead, and compare.
5. Solve "Generate Parentheses" by tracking `openCount`/`closeCount` as
   pruning conditions.
6. Implement N-Queens with the column/diagonal `Set` pruning; verify by
   hand that `n=4` has exactly 2 solutions.
7. Implement Word Search on a small 3x3 grid; deliberately introduce the
   "forget to restore the cell" bug, observe the wrong output, then fix
   it.
8. Time yourself writing the choose/explore/un-choose backtracking
   skeleton from a blank file in under 2 minutes.

## Problem List

Priority legend (**P** column): **M** = Must (do before any interview),
**S** = Should (do if you have another day or two), **O** = Optional
(nice-to-have breadth).

| P | Problem | LeetCode # | Difficulty | Notes/Pattern |
|---|---|---|---|---|
| M | Subsets | 78 | Medium | Backtracking, no reuse, every path is valid |
| M | Permutations | 46 | Medium | Backtracking with `used[]` tracker |
| M | Combination Sum | 39 | Medium | Reuse allowed, target-based pruning |
| M | Generate Parentheses | 22 | Medium | Backtracking with open/close count constraints |
| M | Letter Combinations of a Phone Number | 17 | Medium | Backtracking over digit-to-letter mapping |
| M | Word Search | 79 | Medium | Grid DFS backtracking with visited marking |
| M | Subsets II | 90 | Medium | Backtracking + duplicate skip (sort first) |
| M | N-Queens | 51 | Hard | Constraint satisfaction with column/diagonal sets |
| S | Permutations II | 47 | Medium | Permutations + duplicate skip |
| S | Combinations | 77 | Medium | Choose k of n, with pruning |
| S | Combination Sum II | 40 | Medium | No reuse + duplicate skip |
| S | Palindrome Partitioning | 131 | Medium | Backtracking + palindrome check per substring |
| S | Restore IP Addresses | 93 | Medium | Backtracking with segment-length constraints |
| S | Fibonacci Number | 509 | Easy | Naive vs memoized recursion, foundational drill |
| O | N-Queens II | 52 | Hard | Same as N-Queens, count only |
| O | Sudoku Solver | 37 | Hard | Constraint satisfaction backtracking on a grid |
| O | Combination Sum III | 216 | Medium | Fixed count + target sum backtracking |
| O | Beautiful Arrangement | 526 | Medium | Backtracking with divisibility constraint pruning |
| O | Word Break II | 140 | Hard | Backtracking + memoization (bridge to DP) |

## Mastery Checklist

- [ ] I can identify the base case and recursive case for a new problem
      within the first minute.
- [ ] I can write the choose/explore/un-choose backtracking template from
      memory.
- [ ] I can solve subsets, permutations, and combinations, and understand
      exactly why each uses `i`, `i+1`, or a `used[]` tracker.
- [ ] I know how to skip duplicates correctly in backtracking (sort first,
      skip same-level adjacent duplicates).
- [ ] I add pruning BEFORE recursing whenever possible, not just validity
      checks after generating a full candidate.
- [ ] I always copy the path array before pushing it into results.
- [ ] I always undo (backtrack) any mutation to shared state before trying
      the next branch.
- [ ] I can recognize overlapping subproblems in a recursion tree and add
      memoization when it actually helps.
- [ ] I know JS does not reliably optimize tail calls and avoid relying on
      it for deep recursion.
- [ ] I have solved at least 12 of the problems above from scratch, timed.
