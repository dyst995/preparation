# Fiber: The Unit of Work

## What you need to know

**Fiber** is two things at once:

1. **A data structure** — a persistent, linked tree of JS objects (one fiber per component instance / host node), richer and longer-lived than the throwaway element objects from JSX/`createElement`.
2. **The reconciler architecture** (React 16+) that makes rendering **incremental and interruptible**, replacing the old synchronous recursive **stack reconciler**.

Interview bar: explain the **jank problem**, how **linked-list traversal + yield** fixes it, **current vs work-in-progress** double buffering, and that **Fiber ≠ concurrent mode** (Fiber enables it).

Prerequisites: [virtual DOM / elements](../1.%20virtual-dom/notes.md) (if present), [render vs commit](../2.%20render-vs-commit/notes.md).

---

## What a fiber node holds (preserved sketch)

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
  alternate: otherFiberOrNull, // counterpart in the other tree
}
```

### Mental model

| Field idea | Role |
| --- | --- |
| `child` / `sibling` / `return` | Walk the tree as a **linked list of units of work**, not a deep call stack |
| `stateNode` | Real DOM node or class instance |
| `memoizedProps` / `memoizedState` | What was committed last time (hooks state on function components) |
| `pendingProps` | Props for the update being processed |
| effect flags | What commit must do (place/update/delete) |
| `alternate` | Link between **current** and **WIP** fiber for the same logical UI node |

You don’t memorize every internal field name for interviews — know **unit of work**, **links**, **hooks live on the fiber**, **alternate = other tree**.

---

## Elements vs fibers

```
JSX → React elements (cheap, often recreated every render)
         ↓
      Fiber tree (persistent instances React reconciles against)
         ↓
      Host DOM (after commit)
```

- **Element:** “describe this UI node” (type, props, key) — immutable-ish snapshot for this render.  
- **Fiber:** “this is the ongoing instance / work unit” — survives across renders, points at DOM, holds hooks state.

Saying “virtual DOM” in casual talk often conflates elements + fibers; precision: **elements describe; fibers are the reconciler’s bookkeeping.**

---

## Why Fiber exists (the problem)

**Stack reconciler (≤ React 15):** reconciliation was a **synchronous recursive walk**. Once started, it ran to completion on the main thread. Large trees → long tasks → browser can’t paint or handle input → **jank**.

**Fiber:** same logical tree walk, but restructured so React processes **one fiber (unit of work) at a time**, can **pause**, let the browser run (input, paint), then **resume** — or **abandon** WIP work if a higher-priority update supersedes it.

That scheduling model is what makes **concurrent features** possible: `useTransition`, prioritized updates, Suspense-oriented work that shouldn’t block urgent input.

---

## Incremental work: linked list, not deep recursion

Recursive tree walk ≈ “call stack depth = tree depth”; hard to pause mid-walk without losing place.

Fiber links (`child` → `sibling` → `return`) let React keep an explicit **pointer to the next unit of work**. Algorithm sketch:

1. Pick next fiber.  
2. Do work for that fiber (begin/complete).  
3. If time slice exhausted / higher priority pending → **yield**.  
4. Later continue from the saved next fiber.  
5. When the WIP tree is complete → **commit** (not interruptible like render).

This is why [render vs commit](../2.%20render-vs-commit/notes.md) said render can be paused/discarded but commit runs through.

---

## Double buffering: current vs work-in-progress

React keeps **two fiber trees**:

| Tree | Meaning |
| --- | --- |
| **current** | Matches what’s on screen (last committed) |
| **work-in-progress (WIP)** | Being built during the render phase for the next update |

Each fiber’s **`alternate`** points to its twin in the other tree.

When WIP finishes and **commits**, React **swaps**: WIP becomes the new `current`. The old current is reused as scratch space for the next WIP (“double buffering”) so React isn’t always allocating an entirely new tree from scratch.

```
current (on screen)
     ↕ alternate
WIP (render phase building…)
        ↓ commit / swap
current' (was WIP)
```

If WIP is **abandoned** (higher-priority update), React can throw away that in-progress work without having mutated the on-screen current tree mid-flight (commit is when DOM catches up).

---

## Fiber vs concurrent features

Preserved distinction:

> **Fiber** = architecture (data structure + interruptible unit-of-work reconciler).  
> **Concurrent features** = product APIs/behaviors (`startTransition`, concurrent rendering, Suspense prioritization) **built on** Fiber’s pause/resume/abandon.

Fiber shipped years before “concurrent mode” branding matured; today concurrent rendering is how you *use* that capability. **Fiber ≠ concurrent mode**, but concurrency **requires** something like Fiber.

---

## Practical consequences (what you feel as an app author)

- You rarely touch fibers directly — DevTools “components” map to fiber instances.  
- **Hooks state** is tied to fiber identity/order — that’s why hook order rules exist (state is a list on `memoizedState`).  
- **Purity in render** matters more because work can restart.  
- Urgent updates (typing) can interrupt non-urgent rendering (`startTransition` marks updates lower priority).  
- Still one **commit** that applies DOM for a finished tree — users don’t see a half-reconciled Fiber tree.

---

## Common mistakes and misconceptions

1. “Fiber is concurrent mode.” — Architecture vs features.  
2. “Fiber replaced the virtual DOM.” — Elements still exist; Fiber is how React reconciles/persists work.  
3. “React always yields every fiber.” — Scheduling is heuristic; small updates may finish in one go.  
4. Memorizing every internal field instead of the unit-of-work + double-buffer story.  
5. Thinking interruptible render means interruptible **commit** / half-visible DOM from Fiber pause — pause is before commit.

---

## Connections to other concepts

```
elements (per render)
  → reconciled onto fibers (persistent)
    → unit-of-work loop (can yield)
      → commit → DOM

stack reconciler (blocking)
  → Fiber (interruptible)
    → concurrent APIs (transitions, etc.)

render phase purity
  → safe to pause/restart fiber work

hooks
  → state linked on the fiber
```

---

## Interview perspective

**Q: What problem does Fiber solve that the old stack reconciler didn’t?**

Preserved answer:

> Old reconciler: synchronous recursive walk — couldn’t pause — large trees blocked input/paint. Fiber: linked units of work, pause/resume, enables scheduling so React can yield for high-priority work (e.g. keystrokes) and continue later; enables transitions/Suspense-style prioritization.

**Follow-up: Is Fiber the same as concurrent mode?**

> No — Fiber is the underlying architecture that makes concurrency possible. Concurrent features are built on pause/resume/abandon; Fiber itself is the tree + unit-of-work model.

Also ready: current vs WIP + `alternate` + swap on commit.

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
