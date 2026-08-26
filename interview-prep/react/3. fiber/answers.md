# Fiber: The Unit of Work — Answers

## Core recall

1. **Data structure** (linked tree of work units) and **reconciler architecture** (interruptible rendering since React 16).
2. **Element:** per-render description (type/props/key). **Fiber:** persistent instance/work unit with links, DOM pointer, hooks state, effect flags.
3. **Synchronous recursive** reconciliation that **couldn’t pause** — large updates blocked input/paint (jank).
4. Process the tree as **units of work** with explicit next pointers; **yield** to the browser and **resume** (or abandon WIP).
5. **Current** = last committed / on screen. **WIP** = tree being built in the render phase.
6. Points each fiber at its twin in the **other** tree (current ↔ WIP).
7. On the fiber — conceptually the **`memoizedState`** linked list for function components.
8. **No** — Fiber enables concurrency; concurrent features are built on top.

## Explain why

1. Pause mid-recursion loses stack position; hard to resume cleanly or interleave other work.
2. Explicit links store “what’s next” without relying on the JS call stack — enables incremental traversal.
3. So abandoned or in-progress work doesn’t corrupt what’s painted; commit swaps when WIP is ready.
4. Concurrency needs pause/resume/abandon of render work — stack reconciler couldn’t do that.
5. Render may restart; impure render would duplicate or leave effects from discarded work.
6. DOM updates happen in **commit** after a finished WIP tree — pause is in the pure render phase.

## Compare and contrast

1. **Stack:** blocking recursive walk. **Fiber:** incremental, schedulable units of work.
2. **Element:** disposable description. **Fiber:** long-lived reconciler node.
3. **Current:** committed UI. **WIP:** next UI being prepared.
4. **Fiber:** engine. **`useTransition` / concurrent rendering:** APIs/behavior using the engine’s priorities.
5. **Pause render:** discardable calculation. **Commit:** apply host updates to completion for that tree.
6. Casual “VDOM” ≈ elements + diff idea. **Fiber** = persistent work graph + interruptible reconciler.

## Predict / reason about behavior

1. React can **yield** low-priority render, handle the urgent update (keep input responsive), then continue or redo work — scheduling enabled by Fiber.
2. **Yes** — current still describes the last commit; abandoned WIP never became current.
3. The former **WIP**, now swapped to **current**.
4. Elements/VDOM descriptions still exist; Fiber is how React reconciles and schedules work onto a persistent tree.

## Debugging / misconceptions

1. Missing: **jank/blocking**, **unit of work**, **pause/resume**, **enables scheduling/concurrency** — not a vague “faster.”
2. `startTransition` is a **concurrent feature** that *uses* Fiber’s priority/interruptibility; Fiber is the architecture underneath.
3. State is stored on the fiber for that component identity; changing type/key means different fiber → hooks don’t continue as the “same” instance.
4. Partial Fiber progress isn’t committed to DOM; users see last current until a commit lands.

## Application

1. Example bullets: Fiber = persistent linked tree; replaced blocking stack reconciler; work per fiber can yield; current vs WIP; enables concurrent APIs; hooks live on fibers.
2. `current.alternate → WIP`; on commit, WIP becomes current (old current reused as next WIP scratch).
3. Examples: `child`/`sibling`/`return` (traversal); `memoizedState` (hooks); `alternate` (double buffer); `stateNode` (DOM).
4. “Fiber is the interruptible reconciler architecture; concurrent features are the user-facing behaviors built on it.”

## Interview questions

1. **Spoken:** Stack reconciler blocked the main thread on big sync walks. Fiber processes linked units of work that can pause/resume so React can yield to input and schedule updates — foundation for transitions/Suspense prioritization.  
   **Follow-ups:** Not the same as concurrent mode; double buffer = current vs WIP + alternate + swap on commit.

2. **Spoken:** JS object per UI node with type, props/state, child/sibling/return links, DOM pointer, effect flags, alternate.

3. **Spoken:** Current is on screen; WIP is built in render; commit swaps WIP to current.

4. **Spoken:** `useTransition` marks updates lower priority so Fiber can interrupt that render for urgent updates — feature on top of Fiber scheduling.

5. **Spoken:** Hook state is a list on the fiber instance; stable fiber identity + call order preserve state across renders.

## Connections

1. Render phase *is* walking/updating fibers in units that can yield; commit applies the finished WIP.
2. Each render’s elements are reconciled onto matching fibers (by position/type/key — next units).
3. Incremental work stops before commit; commit applies the host updates for a complete tree so the DOM isn’t half-Fiber-applied.
4. Keys/type decide whether the same fiber is reused or replaced — identity of the unit of work.
5. Yielding returns control so the event loop can process input/paint — same main-thread cooperative scheduling idea as not blocking forever in JS.
