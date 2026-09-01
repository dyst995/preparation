# Stack and Queue — Problems

Solve in priority order: **Must**, then **Should**, then **Optional**.

Track checkboxes in [PROBLEMS-MASTER-LIST.md](../PROBLEMS-MASTER-LIST.md).

## Problem List

| Priority | Problem | LeetCode # | Difficulty | Notes/Pattern |
|---|---|---|---|---|
| Must | Valid Parentheses | 20 | Easy | Stack, match closer against top |
| Must | Min Stack | 155 | Medium | Auxiliary stack tracking running min |
| Must | Implement Queue using Stacks | 232 | Easy | Two-stack amortized O(1) dequeue |
| Must | Daily Temperatures | 739 | Medium | Monotonic stack of indices |
| Must | Next Greater Element I | 496 | Easy | Monotonic stack + map lookup |
| Must | Evaluate Reverse Polish Notation | 150 | Medium | Stack of operands |
| Must | Sliding Window Maximum | 239 | Hard | Monotonic deque |
| Must | Asteroid Collision | 735 | Medium | Stack, simulate collisions |
| Must | Remove All Adjacent Duplicates In String | 1047 | Easy | Stack, pop on match |
| Should | Implement Stack using Queues | 225 | Easy | Two-queue rotation trick |
| Should | Decode String | 394 | Medium | Stack of (count, partial string) |
| Should | Largest Rectangle in Histogram | 84 | Hard | Monotonic stack of bar heights |
| Should | Next Greater Element II | 503 | Medium | Monotonic stack, circular array |
| Should | Basic Calculator II | 227 | Medium | Stack of operands + last operator |
| Should | Backspace String Compare | 844 | Easy | Stack simulation of typing |
| Should | Design Circular Queue | 622 | Medium | Fixed-array ring buffer |
| Optional | Simplify Path | 71 | Medium | Stack, split on "/" and process tokens |
| Optional | Online Stock Span | 901 | Medium | Monotonic stack, streaming variant |

## Related — do not solve twice

These appear in this topic's notes, but their **primary** LeetCode home is another folder. Solve them there.

| Problem | LeetCode # | Primary topic |
|---|---|---|
| Trapping Rain Water | 42 | [Two Pointers](../03. two-pointers/problems.md) |
