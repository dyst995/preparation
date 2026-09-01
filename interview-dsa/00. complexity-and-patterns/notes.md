# 00. Complexity and Patterns (Master Cheat Sheet)

This file is the front door to the whole DSA prep repo. Read it first and
come back to it whenever you are stuck deciding "what technique should I even
try here?" It covers:

1. Big-O you must know cold
2. A universal framework for approaching ANY interview problem
3. A keyword-to-pattern recognition map
4. Data structure selection cheat sheet
5. How the Must / Should / Optional priority system works

-------------------------------------------------------------------------------

## 1. Big-O You Must Know Cold

### 1.1 Complexity classes, best to worst

| Notation      | Name          | Example                                    |
|---------------|---------------|---------------------------------------------|
| O(1)          | Constant      | array index access, hash map get/set        |
| O(log n)      | Logarithmic   | binary search, balanced BST ops             |
| O(sqrt n)     | Root          | trial division primality check              |
| O(n)          | Linear        | single pass over array                      |
| O(n log n)    | Linearithmic  | comparison sort, divide and conquer         |
| O(n^2)        | Quadratic     | nested loops, naive pair comparison         |
| O(n^3)        | Cubic         | triple nested loops, naive matrix multiply  |
| O(2^n)        | Exponential   | subsets, naive recursion without memo       |
| O(n!)         | Factorial     | permutations, brute force TSP               |

Rule of thumb for input size n and a ~1e8 operations/sec budget (typical
1-2 second time limit):

- n <= 10-12          -> O(n!) or O(2^n * n) might be fine
- n <= 20-25           -> O(2^n) acceptable (bitmask DP, subsets)
- n <= 500              -> O(n^3) acceptable
- n <= 5,000            -> O(n^2) acceptable
- n <= 1e5 - 1e6         -> O(n log n) or O(n) needed
- n <= 1e8+              -> O(n) or O(log n) only, watch constant factors

Always state the input size assumption out loud in an interview -- it signals
you think about complexity before coding.

### 1.2 How to compute complexity fast

- Count nested loops: two nested loops over n => O(n^2) unless one loop
  shrinks (two pointers converging is still O(n), not O(n^2)).
- Recursion: use the recurrence relation. T(n) = a*T(n/b) + O(n^d)
  (Master Theorem):
  - if d < log_b(a): T(n) = O(n^(log_b a))
  - if d == log_b(a): T(n) = O(n^d log n)
  - if d > log_b(a): T(n) = O(n^d)
  - Example: merge sort T(n) = 2T(n/2) + O(n) => O(n log n)
- Memoized recursion: complexity ~= (number of unique states) * (work per
  state). This is the fastest way to estimate DP complexity: count the size
  of the memo table times the transition cost.
- Amortized analysis: a single operation might be O(n) worst case but O(1)
  amortized over many calls (e.g. dynamic array push, two-pointer sliding
  window where each element is added/removed at most once).

### 1.3 Space complexity gotchas

- Recursion uses O(depth) stack space even with no extra data structures.
  Deep recursion (e.g. on a skewed tree or n = 1e5 linked list) can stack
  overflow -- consider converting to iterative with an explicit stack.
- "In-place" usually means O(1) extra space, not O(n). Watch out for
  solutions that claim in-place but still allocate a result array.
- Hash sets/maps for "have I seen this" checks cost O(n) space to save time;
  that is almost always the correct trade in interviews.

-------------------------------------------------------------------------------

## 2. Universal Framework: How to Approach ANY Problem

Use this checklist verbatim in every interview. It signals process, not just
a correct answer, and it prevents rushing into a broken brute force.

### Step 1: Clarify (30-60 sec)
- Restate the problem in your own words.
- Ask about input size (n), value ranges, duplicates, negative numbers.
- Ask about edge cases: empty input, single element, all same values.
- Confirm the expected output format (index vs value, in-place vs new array).
- Ask if input is sorted, if there can be multiple valid answers, etc.

### Step 2: Examples (1-2 min)
- Walk through the given example by hand.
- Construct your own small example, including at least one edge case.
- If the problem is graph/tree based, draw it.

### Step 3: Brute force (1-2 min)
- State the naive solution and its complexity out loud, even if you will not
  code it. This anchors the interviewer and gives you a fallback.
- Common brute forces: try all pairs O(n^2), try all subsets O(2^n), try all
  permutations O(n!), recompute from scratch each step.

### Step 4: Identify the pattern (2-3 min)
- Use the keyword map in section 3 below.
- Ask: "What is changing as I go from brute force to optimal? Am I avoiding
  recomputation (DP/memo), avoiding a nested loop (two pointers/hashing),
  or avoiding a sort (heap/counting)?"
- State your intended approach and complexity BEFORE coding. Get a nod from
  the interviewer.

### Step 5: Code (10-20 min)
- Write function signature and handle edge cases first (empty input, n=0/1).
- Use meaningful variable names (left/right, slow/fast, i/j) not just x/y.
- Build incrementally: get a rough pass working, then refine.
- Talk while you type -- narrate what each block does.

### Step 6: Test (3-5 min)
- Trace through your own example from Step 2 line by line.
- Test edge cases: empty, single element, all duplicates, negative numbers,
  already sorted, reverse sorted.
- Check off-by-one errors at loop boundaries explicitly.

### Step 7: Analyze and improve
- State final time and space complexity.
- Mention any further optimization if asked ("we could trade space for time
  by...").

-------------------------------------------------------------------------------

## 3. Keyword to Pattern Recognition Map

This is the single most useful table in the whole repo. When you read a
problem, scan for these signals.

| Signal / Keyword in Problem                                   | Likely Pattern                          | See File |
|-----------------------------------------------------------------|------------------------------------------|----------|
| "contiguous subarray/substring", "longest/shortest window"      | Sliding window                            | 03        |
| "sorted array", "pair that sums to", "palindrome check"          | Two pointers                              | 02        |
| "find in sorted", "minimize/maximize the answer that satisfies X"| Binary search / binary search on answer   | 07        |
| "next greater/smaller element", "valid parentheses"              | Monotonic stack                           | 05        |
| "top K", "K largest/smallest", "median of stream"                | Heap / priority queue                     | 09        |
| "count frequency", "seen before", "two sum", "anagram"           | Hash map / hash set                       | 04        |
| "connected components", "shortest path unweighted"               | BFS / graph                               | 10        |
| "all paths", "shortest path weighted"                            | DFS / Dijkstra                            | 10        |
| "all combinations/permutations/subsets", "generate all valid"    | Backtracking                              | 11        |
| "in-place reverse", "detect cycle", "middle of list"             | Linked list fast/slow pointers            | 06        |
| "minimum/maximum number of ways", "can we reach/partition"       | Dynamic programming                       | 13        |
| "0/1 choice per item", "subset sums to target", "capacity"        | Knapsack DP                               | 13        |
| "two strings, edit/match/subsequence"                            | 2D DP (LCS/edit distance family)          | 13        |
| "activity selection", "interval scheduling", "min resources"     | Greedy or intervals                       | 14, 16    |
| "merge/overlap intervals", "meeting rooms", "insert interval"    | Intervals                                 | 16        |
| "XOR", "single number", "power of two", "count set bits"         | Bit manipulation                          | 15        |
| "prefix of word", "autocomplete", "dictionary of words"           | Trie                                      | 17        |
| "group connected items", "detect cycle in undirected graph"      | Union-Find (DSU)                          | 18        |
| "divide and conquer", "merge sort variant", "count inversions"    | Divide and conquer                        | 12        |
| "recursion with repeated subproblems"                            | Memoization / DP                          | 13        |
| "greedy exchange works", "local optimal leads to global optimal" | Greedy                                    | 14        |

### 3.1 Data structure selection cheat sheet

| Need                                                | Use                                    |
|------------------------------------------------------|------------------------------------------|
| O(1) lookup by key                                    | Hash map (dict)                           |
| O(1) membership test                                  | Hash set                                  |
| Maintain sorted order with insert/delete              | Balanced BST / TreeMap, or sorted list    |
| Repeatedly get min or max                             | Heap (priority queue)                     |
| LIFO access                                           | Stack (array or linked list)              |
| FIFO access                                           | Queue (deque)                             |
| Sliding window min/max                                | Monotonic deque                           |
| Next greater/smaller element                          | Monotonic stack                           |
| Prefix queries on strings                             | Trie                                      |
| Union / connectivity queries                          | Union-Find (DSU)                          |
| Range sum/min queries with updates                    | Segment tree / Fenwick tree (BIT)         |
| Graph traversal, shortest path unweighted             | BFS with adjacency list                   |
| Graph shortest path weighted, no negative edges       | Dijkstra (heap)                           |
| Graph shortest path with negative edges               | Bellman-Ford                              |
| All-pairs shortest path, small graph                  | Floyd-Warshall                            |

-------------------------------------------------------------------------------

## 4. Priority System: Must / Should / Optional

Every problem in every topic file is tagged:

- MUST: Extremely high frequency at FAANG/top tech interviews, or teaches a
  pattern that reappears everywhere. If you only have limited time, solve
  every MUST problem across all files first. These are essentially a
  superset of the "Blind 75" / core "NeetCode 150" problems.
- SHOULD: Common enough that you should recognize the pattern instantly, and
  worth solving if you have a normal (8-12 week) prep timeline.
- OPTIONAL: Good for depth, less common companies, or if you have extra
  time / want mastery of a topic (or the topic is a known focus of your
  target company).

Suggested usage:
- 4-6 week crash prep: MUST only.
- 8 week prep: MUST + SHOULD.
- 12+ week prep or FAANG-level target: MUST + SHOULD + as much OPTIONAL as
  time allows.

See `order.md` for a full week-by-week schedule using this system, and
`README.md` for the full topic index.

-------------------------------------------------------------------------------

## 5. General Interview Etiquette Reminders

- Never go silent for more than ~20-30 seconds. Narrate your thinking.
- If stuck, state the brute force and start coding it rather than freezing.
- Ask clarifying questions before assuming constraints.
- It is fine to ask "can I use extra space to speed this up?" -- interviewers
  expect the classic time/space trade-off discussion.
- When you finish, always state complexity and proactively look for bugs
  before the interviewer points them out.
- Practice explaining your solution OUT LOUD, not just typing quietly.
  Interviews are as much about communication as correctness.

-------------------------------------------------------------------------------

## Practice

This chapter has no LeetCode list. Memorize the 7-step loop in [common-techniques.md](./common-techniques.md), then start solving in [01. arrays-strings/problems.md](../01. arrays-strings/problems.md).
