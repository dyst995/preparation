# Render Phase vs Commit Phase — Answers

## Core recall

1. **Render:** run components, build/diff the tree, plan updates. **Commit:** apply DOM changes and run effects.
2. **Render** (with concurrent features).
3. **Render: no.** **Commit: yes** (DOM + effects).
4. **`useLayoutEffect` → paint → `useEffect`.**
5. **After** layout effects, **before** passive `useEffect`s.
6. **No** — reconciliation may skip DOM writes if nothing host-visible changed.
7. Render should only compute UI from props/state — no external writes that aren’t safe to redo/discard.
8. **StrictMode** double-invoke in dev; **concurrent** render restart/discard after pause.

## Explain why

1. Render may re-run or be thrown away; impure work would duplicate or apply to abandoned work.
2. Host tree must stay consistent — half-applied DOM for a commit would be visible corruption; commit finishes the planned mutations.
3. So measurements/sync DOM updates happen **before** the user sees a frame — prevents flicker.
4. So the browser can paint first; non-urgent work doesn’t block first paint.
5. Double render (and effect exercise) reveals impure render and missing cleanups before production concurrent timing does.
6. Discarding impure render would leave subscriptions, fetches, or mutations that shouldn’t exist; pure render leaves nothing to undo in the outside world.

## Compare and contrast

1. **Render:** pure calculation, interruptible. **Commit:** apply + effects, not interruptible like render.
2. **`useLayoutEffect`:** sync, before paint. **`useEffect`:** after paint, async relative to paint.
3. **Re-render:** component function ran. **DOM update:** commit mutated the document.
4. **In render:** unsafe / may multiply. **In handler:** runs in response to an event, once per event (then schedules update).
5. **`setState`:** schedules work. **Commit:** flushes planned host updates for that finished render.
6. **Pure:** safe to redo. **Effects:** intentional, once-per-commit-lifecycle side effects with cleanups.

## Predict the behavior

1. **`fetch` can run twice** (or more) in dev StrictMode — impure render.
2. **`layout` before paint; `effect` after paint** — so user may see paint between them.
3. **Child function often runs** when parent re-renders (unless memo). **DOM for that span may not update** if text/props unchanged.
4. Style write can run for discarded/extra renders — flicker, wrong timing, hard-to-reproduce bugs.

## Debugging

1. Side effect in **render**; StrictMode double-invoke — move `track` to `useEffect` or a deliberate event.
2. Use **`useLayoutEffect`** (or measure before paint) so adjustment isn’t a second visible frame.
3. Subscribe in **`useEffect`**, return unsubscribe cleanup; never subscribe in render body.
4. Render/reconcile may run and decide **no DOM ops**; saying “commit didn’t run” is sloppy — better: “no host mutations for that subtree” / commit still handles effects when applicable. Clarify re-render vs DOM.
5. Layout read/write in **`useEffect`** happens **after** paint — first paint wrong, then jump; prefer layout effect for sync before paint.

## Application

1. Click → `setCount` → schedule → render (components, diff) → commit DOM → `useLayoutEffect` → paint → `useEffect`.
2.
```tsx
function Title({ text }) {
  useEffect(() => {
    document.title = text;
  }, [text]);
  return null;
}
```
3. (a) `useEffect` (b) `useLayoutEffect` (c) `useEffect` with cleanup removing listener.
4. Example: “Render pure-calculates the next UI and can be redone; commit applies DOM and runs effects once for that update.”

## Interview questions

1. **Spoken:** Render can re-run or be discarded (StrictMode, concurrent). Side effects would duplicate or stick after abandoned work. Put them in effects/handlers.  
   **Follow-ups:** Dev double-render; concurrent pause → resume/discard.

2. **Spoken:** Schedule → render/diff → commit DOM → layout effects → paint → useEffect.

3. **Spoken:** Render = compute/diff (pure, interruptible). Commit = mutate DOM + effects (complete, side-effectful).

4. **Spoken:** When you must read/write layout before the user sees a frame to avoid flicker.

5. **Spoken:** No — re-running a component doesn’t mean commit changes nodes if output matches for that host subtree.

## Connections

1. Render **produces** the element tree (VDOM description) and diffs it; commit **materializes** it in the DOM.
2. Fiber splits render into units of work so the pure phase can pause — commit still lands atomically for a finished tree.
3. Effect hooks are scheduled/flushed around commit; deps decide whether the effect re-runs after a commit.
4. Batching merges updates so you pay render→commit less often for a burst of `setState`s.
5. Same purity idea: compute next state/UI without smuggling in external mutations mid-calculation.
