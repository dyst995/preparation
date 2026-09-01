# Linked Lists — Problems

Solve in priority order: **Must**, then **Should**, then **Optional**.

Track checkboxes in [PROBLEMS-MASTER-LIST.md](../PROBLEMS-MASTER-LIST.md).

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
| Optional | Flatten a Multilevel Doubly Linked List | 430 | Medium | DFS with stack, relink child/next pointers |

## Related — do not solve twice

These appear in this topic's notes, but their **primary** LeetCode home is another folder. Solve them there.

| Problem | LeetCode # | Primary topic |
|---|---|---|
| Merge k Sorted Lists | 23 | [Heap / Priority Queue](../09. heap-priority-queue/problems.md) |
