# 06 - Linked Lists

## Who this is for

Nika Beroshvili, Software Engineer, 4+ years experience, JS/TS background.
Linked lists rarely appear in day-to-day JS/TS work (arrays cover most
cases), which is exactly why interviewers use them - they test pointer
manipulation discipline that array-heavy experience doesn't automatically
build. This chapter rebuilds that muscle memory.

## Learning Objectives

- Define and manipulate a singly/doubly linked list node in TypeScript from
  memory.
- Master the dummy-head-node technique to eliminate special-casing the
  first node.
- Implement iterative and recursive reversal, and know the trade-offs of
  each.
- Implement Floyd's fast/slow cycle detection and understand the math
  behind why it works.
- Recognize the recurring "merge," "reorder," "partition," and "detect
  intersection" shapes.

## Core Concepts

### 1. Node definition in TypeScript

```typescript
class ListNode {
  val: number;
  next: ListNode | null;
  constructor(val: number = 0, next: ListNode | null = null) {
    this.val = val;
    this.next = next;
  }
}
```

For a doubly linked list, add a `prev: ListNode | null` field. LeetCode
usually provides this class definition for you - you just need to be
fluent operating on it.

### 2. The dummy head node trick

The single highest-leverage technique for linked-list problems. Any time
the **head of the result might change** (removal of the first node,
merging, reversing, partitioning), create a placeholder node that points to
what will become the real head, so you never need an `if (isFirstNode)`
special case.

```typescript
function removeElements(head: ListNode | null, val: number): ListNode | null {
  const dummy = new ListNode(0, head);
  let current = dummy;

  while (current.next !== null) {
    if (current.next.val === val) {
      current.next = current.next.next; // skip/unlink
    } else {
      current = current.next;
    }
  }
  return dummy.next; // real head, possibly changed
}
```

Without the dummy node, you'd need separate logic for "what if the head
itself needs to be removed" - the dummy node unifies that into the general
case.

### 3. Iterative reversal (three-pointer walk)

The most-asked linked list question. Track `prev`, `current`, and
implicitly `next` (saved before you overwrite the link) as you walk
forward, flipping each `next` pointer to point backward.

```typescript
function reverseList(head: ListNode | null): ListNode | null {
  let prev: ListNode | null = null;
  let current = head;

  while (current !== null) {
    const next = current.next; // save before overwriting
    current.next = prev;       // flip the pointer
    prev = current;             // advance prev
    current = next;             // advance current
  }
  return prev; // new head
}
```

O(n) time, O(1) space. This is the version to default to in interviews.

### 4. Recursive reversal

Elegant, but uses O(n) call-stack space - mention this trade-off if you
choose it.

```typescript
function reverseListRecursive(head: ListNode | null): ListNode | null {
  if (head === null || head.next === null) return head;
  const newHead = reverseListRecursive(head.next);
  head.next.next = head; // make the next node point back to current
  head.next = null;      // break the old forward link
  return newHead;
}
```

### 5. Fast/slow pointers - finding the middle

The fast pointer moves two steps for every one step of the slow pointer;
when fast reaches the end, slow is at the middle. This generalizes the
two-pointer idea from chapter 03 to linked lists, where you can't
random-access an index.

```typescript
function middleNode(head: ListNode | null): ListNode | null {
  let slow = head;
  let fast = head;
  while (fast !== null && fast.next !== null) {
    slow = slow!.next;
    fast = fast.next.next;
  }
  return slow; // middle node (second middle if even length)
}
```

### 6. Floyd's cycle detection (fast/slow meet-up)

If a cycle exists, a fast pointer moving 2x speed will eventually lap and
collide with the slow pointer inside the loop; if there's no cycle, fast
reaches `null` first.

```typescript
function hasCycle(head: ListNode | null): boolean {
  let slow = head;
  let fast = head;
  while (fast !== null && fast.next !== null) {
    slow = slow!.next;
    fast = fast.next.next;
    if (slow === fast) return true;
  }
  return false;
}
```

**Finding the cycle's start node** (a common follow-up): after slow and
fast meet, reset one pointer to `head` and advance both one step at a time
- they meet again exactly at the cycle's entry point. This works because of
the distance math: if the non-cycle prefix has length `a` and the meeting
point is `b` steps into the cycle, resetting one pointer to `head` and
walking both at speed 1 causes them to converge at the cycle start after
exactly `a` more steps - this falls out of the equation `2(a+b) = a + b + n*C`
(where `C` is the cycle length), which simplifies to `a = n*C - b`.

```typescript
function detectCycleStart(head: ListNode | null): ListNode | null {
  let slow = head;
  let fast = head;

  while (fast !== null && fast.next !== null) {
    slow = slow!.next;
    fast = fast.next.next;
    if (slow === fast) {
      let ptr = head;
      while (ptr !== slow) {
        ptr = ptr!.next;
        slow = slow!.next;
      }
      return ptr;
    }
  }
  return null;
}
```

### 7. Merging two sorted lists

Same merge idea as chapter 03, adapted to pointers instead of array
indices; use a dummy head to build the result cleanly.

```typescript
function mergeTwoLists(l1: ListNode | null, l2: ListNode | null): ListNode | null {
  const dummy = new ListNode();
  let tail = dummy;

  while (l1 !== null && l2 !== null) {
    if (l1.val <= l2.val) {
      tail.next = l1;
      l1 = l1.next;
    } else {
      tail.next = l2;
      l2 = l2.next;
    }
    tail = tail.next;
  }
  tail.next = l1 !== null ? l1 : l2; // attach whatever remains
  return dummy.next;
}
```

### 8. Reorder / reverse-second-half pattern

A recurring three-step combo for problems like "reorder list" (L0-Ln-L1-Ln1
...) or "palindrome linked list": (1) find the middle with fast/slow, (2)
reverse the second half, (3) merge/compare the two halves.

### 9. Removing the Nth node from the end

Use two pointers offset by `n` steps: advance a lead pointer `n` steps
first, then move both together until the lead reaches the end - the
trailing pointer is now positioned right before the node to remove. Use a
dummy head so removing the actual head node (when `n` equals the list
length) needs no special case.

```typescript
function removeNthFromEnd(head: ListNode | null, n: number): ListNode | null {
  const dummy = new ListNode(0, head);
  let lead: ListNode | null = dummy;
  let trail: ListNode = dummy;

  for (let i = 0; i < n; i++) lead = lead!.next;
  while (lead!.next !== null) {
    lead = lead!.next;
    trail = trail.next!;
  }
  trail.next = trail.next!.next;
  return dummy.next;
}
```

### 10. Doubly linked lists and LRU cache

A doubly linked list supports O(1) removal of a known node (no need to walk
from the head to find its predecessor, unlike a singly linked list) because
each node already knows its `prev`. This is exactly why LRU Cache is
implemented as a `Map<key, Node>` + doubly linked list: the map gives O(1)
lookup of the node, and the list gives O(1) move-to-front / eviction.

## Key Patterns

| Signal in the problem statement | Likely pattern |
|---|---|
| "head might change", "remove first node" | Dummy head node |
| "reverse a linked list (or sublist)" | Iterative 3-pointer reversal |
| "detect a cycle" | Floyd's fast/slow |
| "find the middle" | Fast/slow (2x speed) pointers |
| "merge two/k sorted lists" | Pointer merge (+ heap for k-way, later topics) |
| "remove Nth node from end" | Two pointers offset by n |
| "palindrome linked list", "reorder list" | Find middle + reverse half + merge/compare |
| "deep copy with random pointers" | Hash map old-node -> new-node |
| "LRU cache" | Map + doubly linked list |
| "intersection of two lists" | Two pointers, switch heads on reaching null |

## Time/Space Complexity Cheat Sheet

| Operation | Time | Space |
|---|---|---|
| Traverse / search | O(n) | O(1) |
| Insert/delete at known node (singly, with prev in hand) | O(1) | O(1) |
| Insert/delete at known node (doubly) | O(1) | O(1) |
| Insert/delete by value (must search first) | O(n) | O(1) |
| Iterative reversal | O(n) | O(1) |
| Recursive reversal | O(n) | O(n) call stack |
| Fast/slow middle-finding | O(n) | O(1) |
| Floyd's cycle detection | O(n) | O(1) |
| Merge two sorted lists | O(n + m) | O(1) (relinking) |
| Remove Nth from end (two-pointer) | O(n), one pass | O(1) |
| Deep copy with random pointers | O(n) | O(n) map |

## Common Mistakes / Interview Tips

- **Losing the reference to the next node before overwriting `.next`** -
  always save `const next = current.next` before mutating `current.next`
  during reversal, or you'll orphan the rest of the list.
- **Forgetting the dummy head**, leading to messy `if (head === null ||
  head.val === target)` special-casing that's easy to get wrong under
  pressure.
- **Off-by-one in fast/slow middle-finding** for even-length lists -
  clarify whether you want the first or second middle node, and know that
  `fast = head, fast.next` as the loop condition gives the **second**
  middle for even-length lists (using `fast.next && fast.next.next` gives
  the first middle instead) - state which one your loop produces.
- **Null-pointer dereference** - forgetting to check `current !== null`
  before accessing `current.next`, especially in fast/slow loops where
  `fast.next.next` needs both `fast !== null` AND `fast.next !== null`
  checked first.
- **Modifying the list while still needing the original for later steps**
  (e.g. in "reorder list," reverse a half only after you've already
  captured where the first half ends).
- **Not returning `dummy.next` at the end** after using a dummy head - a
  surprisingly common slip that returns the dummy node itself instead of
  the real head.
- **Assuming array-style random access** - you cannot do `list[i]` on a
  linked list; index-based logic must be translated into "walk N times."
- **Forgetting to null out a node's `.next`** in recursive reversal, which
  can leave stray forward references (and would create a two-way loop) if
  not cleared.
- **Not stating the O(n) space cost of recursion** when using a recursive
  approach - interviewers will ask "can you do this iteratively in O(1)
  space?" - have that answer ready.

## Hands-on Drills

1. Implement iterative `reverseList`, then implement the recursive version,
   and state out loud the space complexity difference between them.
2. Implement `removeElements` (remove all nodes with a given value) using a
   dummy head; verify it correctly handles removing the original head.
3. Implement `middleNode` using fast/slow pointers; test on both an
   odd-length and an even-length list to see which "middle" you get.
4. Implement `hasCycle`, then extend it to `detectCycleStart` and manually
   verify the meet-and-reset math on a small example (e.g. a 3-node
   non-cycle prefix plus a 4-node cycle).
5. Implement `mergeTwoLists` iteratively with a dummy head.
6. Implement `removeNthFromEnd` using the two-pointer offset-by-n trick in
   one pass.
7. Implement "reorder list": find the middle, reverse the second half, then
   merge the two halves by alternating nodes.
8. Implement a doubly linked list node + an LRU cache combining it with a
   `Map<key, Node>` for O(1) get/put.

## Problem List

| Priority | Problem | LeetCode # | Difficulty | Notes/Pattern |
|---|---|---|---|---|
| Must | Reverse Linked List | 206 | Easy | Iterative 3-pointer reversal |
| Must | Merge Two Sorted Lists | 21 | Easy | Pointer merge + dummy head |
| Must | Linked List Cycle | 141 | Easy | Floyd's fast/slow |
| Must | Middle of the Linked List | 876 | Easy | Fast/slow, 2x speed |
| Must | Remove Nth Node From End of List | 19 | Medium | Two pointers offset by n |
| Must | Remove Linked List Elements | 203 | Easy | Dummy head, unlink matches |
| Must | Palindrome Linked List | 234 | Easy | Find middle + reverse half + compare |
| Must | Reorder List | 143 | Medium | Find middle + reverse half + merge |
| Must | Linked List Cycle II | 142 | Medium | Floyd's + meet-and-reset for cycle start |
| Must | Copy List with Random Pointer | 138 | Medium | Old-node -> new-node hash map |
| Must | Add Two Numbers | 2 | Medium | Digit-by-digit sum with carry, dummy head |
| Should | Intersection of Two Linked Lists | 160 | Easy | Two pointers, switch heads at null |
| Should | Odd Even Linked List | 328 | Medium | Two sublists, relink at the end |
| Should | Swap Nodes in Pairs | 24 | Medium | Iterative pointer rewiring, dummy head |
| Should | Delete Node in a Linked List | 237 | Easy | Copy next node's value, unlink |
| Should | Rotate List | 61 | Medium | Find length, connect as ring, break at new point |
| Should | Partition List | 86 | Medium | Two dummy-headed sublists, merge |
| Should | Reverse Linked List II | 92 | Medium | Reverse a sublist in place between positions |
| Optional | LRU Cache | 146 | Medium | Map + doubly linked list, O(1) get/put |
| Optional | Merge k Sorted Lists | 23 | Hard | Divide-and-conquer merge or min-heap |
| Optional | Flatten a Multilevel Doubly Linked List | 430 | Medium | DFS with stack, relink child/next pointers |

## Mastery Checklist

- [ ] I can define a `ListNode` class in TypeScript from memory.
- [ ] I can implement the dummy-head-node technique without hesitation.
- [ ] I can implement iterative linked-list reversal in under 3 minutes.
- [ ] I can explain the space trade-off between iterative and recursive
      reversal.
- [ ] I can implement Floyd's cycle detection and the cycle-start
      follow-up, including the underlying distance argument.
- [ ] I can implement fast/slow middle-finding and state which "middle" my
      loop condition produces for even-length lists.
- [ ] I can implement merge-two-sorted-lists and remove-nth-from-end
      without off-by-one errors.
- [ ] I can implement an LRU cache using a map + doubly linked list.
- [ ] I have solved at least 12 of the problems above from scratch, timed.
- [ ] I can identify within 30 seconds whether a new linked-list problem
      needs a dummy head, fast/slow pointers, or a reversal step.
