# 02. Section A - Rendering & Reconciliation

> Source: `interview-prep/react/06-interview-questions.md`

**A1. What is the virtual DOM, and why does React use it?**
> A lightweight in-memory tree of plain JS objects describing the intended UI. React diffs the new tree against the previous one (reconciliation) and applies only the minimal real DOM mutations needed. The value is a declarative programming model plus batched, efficient updates - not "always faster than the DOM" in every case.

**A2. What's the difference between render phase and commit phase?**
> Render phase calls component functions and computes the diff; it must be pure and can be paused/discarded/redone. Commit phase applies DOM mutations and runs effects (`useLayoutEffect` synchronously before paint, `useEffect` asynchronously after); it runs to completion once started.

**A3. What is Fiber?**
> Both a persistent linked-list data structure mirroring the component tree, and the reconciler algorithm built on it. It made rendering interruptible - React can pause after each fiber node and yield to more urgent work (like input handling), unlike the old synchronous recursive stack reconciler.

**A4. Why does React need `key` on list items?**
> Keys give stable identity across renders so React can correctly match items during reordering/insertion/deletion, rather than falling back to position-based matching, which can misattribute component state and uncontrolled DOM values (focus, input values) to the wrong logical item.

**A5. What's the failure mode of using array index as key?**
> When the list reorders or has items inserted/removed anywhere but the end, index-based matching treats the item at a given position as "the same" even though its underlying data changed - causing state or uncontrolled input values to appear attached to the wrong row.

**A6. What makes a component "pure," and why does React care?**
> Same props/state always produce the same output, with no observable side effects during render. React may call render functions more than once (StrictMode dev double-invoke, concurrent rendering pausing/resuming), so impure renders produce inconsistent results or duplicated side effects. Purity is also the precondition for `memo`/`useMemo` to safely skip work.

**A7. What is automatic batching in React 18?**
> Multiple `setState` calls occurring in the same tick - across event handlers, promises, timeouts, and other async contexts - are batched into a single re-render by default, unlike React 17 where only React event handler contexts batched automatically.

**A8. Why does `console.log` right after `setState` show the old value?**
> State updates are scheduled, not synchronous; the log reads the current render's closure, which still holds the pre-update value until the component re-renders with fresh state.

**A9. What does `React.StrictMode` do, and why do effects fire twice in dev?**
> Dev-only helper that double-invokes render functions and mount/cleanup/mount of effects on initial mount, to surface impure renders and effects with incomplete cleanup - simulating future unmount/remount scenarios. No production cost or behavior change.

**A10. If a `<div>` becomes a `<span>` at the same tree position, what happens?**
> React sees a type mismatch at that position and doesn't diff children - it unmounts the entire old subtree (destroying state, running cleanup) and mounts a fresh one for the new type.

---
