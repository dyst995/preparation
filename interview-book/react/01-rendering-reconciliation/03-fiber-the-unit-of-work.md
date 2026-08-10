# 03. Fiber: the unit of work

> Source: `interview-prep/react/01-rendering-reconciliation.md`

### What Fiber is

Fiber is both:
1. **A data structure** - a linked-list-like tree of JS objects, one per component instance/host node, that mirrors your element tree but persists across renders (unlike the throwaway element tree from `createElement`).
2. **A reimplementation of the reconciler** (since React 16) that makes rendering **incremental and interruptible**, replacing the old synchronous, recursive "stack reconciler."

Each fiber node roughly holds:

```javascript
{
  type: 'div',              // or component function/class
  key: null,
  stateNode: domNodeOrInstance,
  child: fiberOrNull,       // first child
  sibling: fiberOrNull,     // next sibling
  return: parentFiberOrNull,
  pendingProps: {...},
  memoizedProps: {...},
  memoizedState: {...},     // hooks list lives here for function components
  effectTag: 'Placement' | 'Update' | 'Deletion' | ...,
  alternate: otherFiberOrNull, // the "other" tree (current vs work-in-progress)
}
```

### Why Fiber exists (the problem it solves)

Before Fiber (React <=15), reconciliation was a **synchronous recursive walk** of the tree - once started, it ran to completion, blocking the main thread. For large trees this could cause visible jank: the browser couldn't process input or paint until the whole diff was done.

Fiber restructures this recursive walk into a **linked list traversal** that can be paused after processing each fiber node, yielding control back to the browser (e.g., to handle a high-priority input event), and resumed later. This is what makes concurrent features (like `useTransition`, `Suspense` prioritization) possible.

### Double buffering: current tree vs work-in-progress tree

React keeps **two fiber trees**:
- **current** - what's on screen right now.
- **work-in-progress (WIP)** - being built during the render phase for the next update.

Each fiber has an `alternate` pointer to its counterpart in the other tree. When the WIP tree finishes and commits, it becomes the new `current` tree ("tree swap"), and the old `current` becomes the next WIP scratch tree. This avoids allocating a whole new tree on every render.

### Interview question

**Q: What problem does Fiber solve that the old stack reconciler didn't?**

> "The old reconciler did a synchronous recursive tree walk that couldn't be paused - a big tree meant a big blocking chunk of main-thread work, causing dropped frames and unresponsive input. Fiber turns the tree into a linked structure that can be processed unit-by-unit and paused/resumed, which enables scheduling: React can yield to the browser for high-priority work (like a keystroke) and continue rendering later, and it enables concurrent features like transitions and Suspense-based prioritization."

**Follow-up: Is Fiber the same as concurrent mode?**
> "No - Fiber is the underlying architecture that *makes concurrency possible*. Concurrent features (`startTransition`, concurrent rendering, Suspense for data) are built on top of Fiber's ability to pause/resume/abandon work, but Fiber itself just describes the tree and unit-of-work model."

---
