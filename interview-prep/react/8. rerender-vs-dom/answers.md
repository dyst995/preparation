# Does a Re-render Always Touch the DOM? — Answers

## Core recall

1. **No.**
2. React **ran the component function** (render phase) and computed a new element tree.
3. **Yes** — by default descendants re-render when the parent does.
4. **No DOM mutations** for that unchanged subtree (typically).
5. **Calling the function** and **diffing** the result.
6. **`memo`** can skip the **function call** (and that work); identical output only skips **DOM writes** after work already ran.
7. Yes — e.g. `setState` with `Object.is`-same primitive as current state.
8. **No** — it means the component function was evaluated (or recorded as rendered), not that host nodes changed.

## Explain why

1. Default rule: rendering a parent re-renders children; React doesn’t auto-skip static-looking children without bailouts.
2. JS execution + reconciliation still cost CPU even if commit is a no-op for that subtree.
3. They conflate re-render with layout/paint cost; many re-renders are cheap if DOM doesn’t churn.
4. Without stable/shallow-equal props, memo never bails out — child keeps running.
5. Reconciliation updates only what changed (button text); sibling subtree diffs equal → no writes there.
6. Bailout: no update scheduled if new state is identical by `Object.is`.

## Compare and contrast

1. **Re-render:** JS/component work. **DOM mutation:** commit changed the document.
2. **Diff equal:** work happened, no host write. **`memo`:** may skip work entirely.
3. **Cascade:** parent render walks children. **Child setState:** starts from that child downward.
4. Cheap function calls often cheaper than layout-triggering DOM ops — but expensive children flip that.
5. **Render count:** function ran. **Visual/DOM:** need commit/paint or DOM inspection.
6. **Same output:** may skip DOM. **New prop references:** can force child render even if UI looks same; memo fails.

## Predict the behavior

1. **Function ran: yes. DOM text change: no** (still `"Hi"`).
2. **Usually no** — props shallow-equal (none) → memo bailout.
3. **Yes, DOM updates** — output differs every render (`Math.random()`).
4. **Typically no** re-render scheduled.

## Debugging

1. Check Profiler/DOM: re-render ≠ mutation; ask if output/props actually changed; measure cost before memoizing.
2. New function identity each time → memo props not equal → child renders.
3. Likely render-phase work without heavy commit — optimize only if those renders are expensive.
4. DOM wasn’t the problem; memo’s job is skipping **render**, and a tiny span rarely needs it.

## Application

1. Parent state update re-renders Parent and StaticChild; StaticChild’s identical output ⇒ no DOM change for its nodes; button DOM updates.
2. `memo(StaticChild)` skips StaticChild on Parent clicks while props stay shallow-equal (e.g. no props / stable props).
3. `memo` can skip (1) and thus (2) for that component; (3) already skipped if nothing changed.
4. “Re-render = function ran; DOM update = commit changed the document — not the same.”

## Interview questions

1. **Spoken:** Not necessarily — equivalent trees ⇒ no DOM mutations. Without memo the function may still run; memo can skip the call when props match.  
   **Follow-ups:** Default child re-render; Profiler vs DOM.

2. **Spoken:** No DOM change after diff ≠ skipped render. `memo` skips the render call when props shallow-equal.

3. **Spoken:** Rendering the parent includes rendering its children unless a bailout (`memo`, etc.) applies.

4. **Spoken:** React DevTools Profiler (what rendered) plus inspecting whether host attributes/text changed; don’t assume from render count alone.

5. **Spoken:** When the child is expensive to render and often receives unchanged props — verified with Profiler, not by reflex.

## Connections

1. Render computes trees; commit applies DOM — this unit names when commit is a no-op.
2. Same type + same props/text ⇒ reuse fiber, no host update instructions.
3. Re-running children must be side-effect-free so “extra” renders are safe.
4. Fewer state flushes ⇒ fewer parent cascades ⇒ fewer child re-renders.
5. Performance work starts from “is the cost render JS or DOM?” then memo/state placement — built on this vocabulary.
