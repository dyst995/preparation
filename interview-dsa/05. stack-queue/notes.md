# 05 - Stack & Queue

## Who this is for

Nika Beroshvili, Software Engineer, 4+ years experience, JS/TS background.
Stacks and queues are simple structures, but interviewers love them because
recognizing "this is secretly a stack problem" (matching pairs, monotonic
sequences, nested structure evaluation) is a skill you either have or don't.
This chapter builds that recognition.

## Learning Objectives

- Implement a stack and a queue efficiently in JS/TS, knowing which native
  structures are actually O(1) for the operations you need.
- Recognize "matching/nesting" problems as stack problems instantly.
- Understand and implement the monotonic stack/queue pattern.
- Implement a queue using two stacks and a stack using two queues (a classic
  interview ask to test structural understanding).
- Know when a problem needs a stack (LIFO) vs a queue (FIFO) vs a deque
  (both ends).

## Core Concepts

### 1. Stack basics and JS implementation

A stack is LIFO (last in, first out). In JS/TS, a plain array is a perfectly
good stack: `push`/`pop` operate on the end in O(1).

```typescript
const stack: number[] = [];
stack.push(1);
stack.push(2);
const top = stack[stack.length - 1]; // peek, O(1)
stack.pop(); // O(1)
```

**Do not use `unshift`/`shift` on an array as a stack's push/pop** - that
would operate on the front, which is O(n) per call, and is semantically a
queue operation, not a stack operation.

### 2. Queue basics and the JS array trap

A queue is FIFO (first in, first out). The naive approach -
`arr.push(x)` to enqueue, `arr.shift()` to dequeue - works correctly but
`shift()` is **O(n)** because every remaining element must be re-indexed.
For interview-scale inputs this is usually fine, but you should know the
correct answer when asked "how do you make this O(1) amortized":

- Use two pointers (a "virtual queue" backed by a fixed array or a head
  index into a normal array) if you're implementing a queue with bounded
  known throughput.
- Use a doubly linked list (see chapter 06) for a true O(1) enqueue/dequeue
  in both directions.
- Simulate with **two stacks**: push everything to `inStack`, and when you
  need to dequeue, if `outStack` is empty, pop everything from `inStack`
  onto `outStack` (reversing order), then pop from `outStack`. Each element
  moves between stacks at most once, giving amortized O(1) dequeue.

```typescript
class QueueViaStacks<T> {
  private inStack: T[] = [];
  private outStack: T[] = [];

  enqueue(value: T): void {
    this.inStack.push(value);
  }

  dequeue(): T | undefined {
    if (this.outStack.length === 0) {
      while (this.inStack.length > 0) {
        this.outStack.push(this.inStack.pop()!);
      }
    }
    return this.outStack.pop();
  }
}
```

### 3. Matching / nesting pattern (the #1 stack use case)

Any time a problem involves matched pairs, nested scopes, or "does this
closing thing match the most recent opening thing," a stack is the answer.
Push openers; on a closer, check the stack top matches, pop if so, fail
otherwise.

```typescript
function isValid(s: string): boolean {
  const closerToOpener: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
  const stack: string[] = [];

  for (const ch of s) {
    if (ch === '(' || ch === '[' || ch === '{') {
      stack.push(ch);
    } else {
      if (stack.pop() !== closerToOpener[ch]) return false;
    }
  }
  return stack.length === 0; // no unmatched openers left
}
```

This same shape solves: valid parentheses, basic calculator (with numbers
pushed too), decode string, remove adjacent duplicates, and asteroid
collision.

### 4. Monotonic stack

A stack that is kept strictly increasing or strictly decreasing from bottom
to top by popping elements that violate the order before pushing the new
one. Used to answer "next greater/smaller element" style questions in O(n)
total, because each element is pushed and popped at most once.

```typescript
function dailyTemperatures(temps: number[]): number[] {
  const answer = new Array(temps.length).fill(0);
  const stack: number[] = []; // indices, temps values decreasing bottom-to-top

  for (let i = 0; i < temps.length; i++) {
    while (stack.length > 0 && temps[i] > temps[stack[stack.length - 1]]) {
      const prevIndex = stack.pop()!;
      answer[prevIndex] = i - prevIndex;
    }
    stack.push(i);
  }
  return answer;
}
```

Recognize this pattern whenever you see: "next greater element," "next
smaller element," "daily temperatures," "largest rectangle in histogram,"
or "stock span."

### 5. Monotonic deque (sliding window maximum)

Combines sliding window (chapter 04) with a monotonic structure, but needs
removal from **both ends**, so a deque (double-ended queue) is required
instead of a plain stack. Keep indices in the deque with strictly
decreasing values front-to-back; the front is always the current window's
maximum.

```typescript
function maxSlidingWindow(nums: number[], k: number): number[] {
  const deque: number[] = []; // indices, values decreasing front-to-back
  const result: number[] = [];

  for (let i = 0; i < nums.length; i++) {
    while (deque.length > 0 && nums[deque[deque.length - 1]] < nums[i]) {
      deque.pop(); // remove smaller values from the back, they're useless now
    }
    deque.push(i);

    if (deque[0] <= i - k) deque.shift(); // front fell out of window

    if (i >= k - 1) result.push(nums[deque[0]]);
  }
  return result;
}
```

In JS, `deque.shift()` here is technically O(n) worst case since arrays
aren't true deques, but each element is only ever removed once overall, so
total work is still bounded; for a true O(1) front-removal, back this with
a proper doubly linked list or an index-based ring buffer if pressed on it.

### 6. Stack for expression evaluation

Calculator-style problems (basic calculator, evaluate RPN) use a stack to
hold operands (and sometimes pending signs), popping to apply operators in
the correct order.

```typescript
function evalRPN(tokens: string[]): number {
  const stack: number[] = [];
  const ops = new Set(['+', '-', '*', '/']);

  for (const token of tokens) {
    if (ops.has(token)) {
      const b = stack.pop()!;
      const a = stack.pop()!;
      let result = 0;
      if (token === '+') result = a + b;
      else if (token === '-') result = a - b;
      else if (token === '*') result = a * b;
      else result = Math.trunc(a / b); // truncate toward zero
      stack.push(result);
    } else {
      stack.push(Number(token));
    }
  }
  return stack[0];
}
```

### 7. Implementing a stack using two queues (the mirror-image ask)

Less common than queue-via-stacks, but occasionally asked to check you
understand both structures symmetrically: keep one queue as the "active"
one; on push, enqueue to a fresh queue then drain the old queue into it so
the newest element ends up at the front.

## Key Patterns

| Signal in the problem statement | Likely pattern |
|---|---|
| "valid parentheses", "matching brackets" | Stack, match closer against top |
| "nested", "scopes", "decode string" | Stack of partial results per nesting level |
| "next greater/smaller element" | Monotonic stack |
| "daily temperatures", "stock span" | Monotonic stack (indices) |
| "largest rectangle in histogram" | Monotonic stack (heights) |
| "sliding window maximum/minimum" | Monotonic deque |
| "evaluate expression", "calculator", "RPN" | Stack of operands (+ operators) |
| "undo/redo", "browser history" | Two stacks |
| "implement queue with O(1) ops" | Two-stack queue, or linked list |
| "BFS traversal" | Plain queue (FIFO) |
| "DFS traversal (iterative)" | Explicit stack (LIFO) |

## Time/Space Complexity Cheat Sheet

| Operation | Time | Space |
|---|---|---|
| Array-backed stack push/pop/peek | O(1) | O(n) |
| Array-backed queue enqueue (push) | O(1) | O(n) |
| Array-backed queue dequeue (`shift`) | O(n) naive | - |
| Two-stack queue dequeue | O(1) amortized | O(n) |
| Monotonic stack (next greater/smaller) | O(n) total (each element pushed/popped once) | O(n) |
| Monotonic deque (sliding window max) | O(n) total | O(k) |
| Valid parentheses / matching | O(n) | O(n) worst case |
| Expression evaluation (RPN/calculator) | O(n) | O(n) |

## Common Mistakes / Interview Tips

- **Using `unshift`/`shift` for stack operations.** Stack push/pop should
  always be at the array's end; using the front is both semantically wrong
  and O(n).
- **Forgetting the "empty stack" edge case** when popping to check a match
  - popping an empty array in JS returns `undefined`, which won't strictly
  equal any expected character, but explicitly guard against underflow so
  the intent is clear and doesn't silently misbehave in other languages.
- **Believing a monotonic stack solution is O(n^2)** because of the nested
  while loop - it's actually O(n) amortized because each element is pushed
  and popped **at most once** across the entire run. Be ready to explain
  this "each element does O(1) amortized work" argument explicitly.
- **Reaching for a stack when the problem is actually FIFO** (or vice
  versa) - re-read for "first," "order encountered," "level by level" (=
  queue/BFS) vs "most recent," "innermost," "undo" (= stack/DFS).
- **Not clarifying the direction of "next greater"** (to the right? circular
  array wraparound? ties allowed?) before coding a monotonic stack
  solution.
- **Off-by-one when converting indices to distances** (e.g. Daily
  Temperatures: distance is `i - prevIndex`, not `prevIndex - i`).
- **Forgetting to check the final stack is empty** at the end of a matching
  problem (unmatched leftover openers = invalid, easy to forget).
- **Using a plain array as a deque and calling `.shift()` naively believing
  it's O(1)** - call this out if asked about true worst-case complexity.

## Hands-on Drills

1. Implement `isValid` (valid parentheses) for three bracket types,
   including the "stack must be empty at the end" check.
2. Implement a queue using two stacks; write a few enqueue/dequeue calls by
   hand and trace which stack holds what at each step.
3. Implement `dailyTemperatures` using a monotonic stack of indices, then
   explain out loud why it's O(n) despite the nested loop.
4. Implement `maxSlidingWindow` using a monotonic deque of indices.
5. Implement `evalRPN` (evaluate reverse polish notation).
6. Implement "decode string" (e.g. `"3[a2[c]]"` -> `"accaccacc"`) using a
   stack of `(count, partialString)` pairs.
7. Implement iterative DFS and BFS on a small graph/tree using an explicit
   stack and an explicit queue respectively, and compare the traversal
   order.
8. Implement "min stack" (a stack that supports `push`, `pop`, `top`, and
   `getMin` all in O(1)) using an auxiliary stack that tracks running
   minimums.

## Practice

The LeetCode list for this topic is in [problems.md](./problems.md). The interview code to memorize is in [common-techniques.md](./common-techniques.md). Solve **Must** first, then Should, then Optional.

## Mastery Checklist

- [ ] I know when to use a stack (LIFO) vs a queue (FIFO) vs a deque (both
      ends) just from the problem description.
- [ ] I can implement valid-parentheses-style matching without looking it
      up.
- [ ] I can implement a queue using two stacks and explain the amortized
      O(1) argument.
- [ ] I can implement a monotonic stack for "next greater element" and
      explain why it's O(n) despite the nested loop.
- [ ] I can implement a monotonic deque for sliding window maximum.
- [ ] I can implement Min Stack with O(1) `getMin`.
- [ ] I can implement RPN evaluation and basic calculator patterns using a
      stack.
- [ ] I have solved at least 12 of the problems above from scratch, timed.
- [ ] I can identify within 30 seconds whether a new problem is
      stack-shaped, queue-shaped, or monotonic-structure-shaped.
