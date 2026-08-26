# Profiling with React DevTools — Answers

## Core recall

1. React commits during a recording — which components rendered and how long (plus why, if enabled).  
2. A component that rendered in that commit (duration ≈ bar size/intensity).  
3. That component did **not** re-render in that commit (bailed out / not in update path).  
4. Props changed, state changed, hooks changed, parent re-rendered (context changed also possible).  
5. Flame = structure/cascade; ranked = slowest components first.  
6. Move/colocate the input state down so unrelated siblings don’t subscribe via parent render.  
7. `useMemo` expensive work and/or virtualize huge lists; inspect that component’s render path.  
8. When React bars are short but UI still janks — layout, paint, long non-React JS tasks.

## Explain why

1. Isolates the slow path; long sessions mix unrelated commits and drown the signal.  
2. Duration says *cost*; reason says *mechanism* → correct fix class.  
3. State in a high parent re-renders the whole subtree unless bailouts exist.  
4. Separate updates (async boundaries, multiple sources, older non-batched paths) → multiple commits.  
5. Confirm bailouts (gray) and shorter commits — memo can fail with unstable props.  
6. Bottleneck may be CSS layout, network, images, main-thread work outside React render.

## Compare and contrast

1. **React Profiler:** component render causality/cost. **Chrome:** broader timeline (scripting, style, layout, FPS).  
2. **Count:** fan-out / state placement / missing memo. **Duration:** heavy compute or large DOM in one component.  
3. **Colocate:** stops the parent from re-rendering siblings. **Memo:** lets parent re-render but children bail out — prefer colocate when state simply shouldn’t be shared.  
4. Flame = who dragged whom; ranked = who’s slowest.  
5. **Parent re-rendered:** no child bailout. **Props changed:** child saw unequal props (often new references).

## Predict / interpret

1. Search state (or derived updates) live too high — shared parent of all three.  
2. Good colocation or effective memo boundaries — grid skipped.  
3. Optimize/memoize `HeavyChart` work or isolate it from parent updates (`memo` + stable props / split state).  
4. Are updates batched? Multiple stores/effects? Intentional separate transitions?

## Debugging

1. Unstable function prop defeats memo / marks props changed — `useCallback` or restructure.  
2. Unstable props, context, or state still above the memo wall; or memo not on the right boundary.  
3. Chrome Performance — scrolling/layout/paint; maybe huge DOM not showing as React “render” cost the way you expect.  
4. Strict Mode / dev double-invoke can inflate counts — use patterns + production builds for absolute timings; still trust relative “this subtree shouldn’t light up.”

## Application

1. Example: reproduce toggle → record → inspect flame for that commit → note why-rendered on hot components → fix (colocate/memo/compute) → re-record compare.  
2. Keystroke siblings → colocate; leaf cascade → memo+stable props; one fat bar → useMemo/virtualize; many commits → batching/consolidate.  
3. Paraphrase preserved interview answer.  
4. Move `query` state into `SearchBox` (or a small search feature parent); grid reads data via RQ/props not tied to keystrokes.

## Interview questions

1. **Spoken:** Reproduce with Profiler → flame/ranked → who rendered, how long, why → if cascade from unrelated state, colocate or memo+stable props → if one slow component, inspect compute/list → if React looks fine, Chrome Performance. Re-measure after. Non-React: layout/long tasks. Memo helped: gray bailouts / shorter commits on re-profile.  
2. **Spoken:** Many components lighting up = count/cascade problem; one wide bar = duration/compute problem.  
3. **Spoken:** Didn’t re-render that commit — proves bailout or out-of-subtree; validates memo/colocation.  
4. **Spoken:** Search state in page shell re-rendering a data-heavy grid — move state into search UI instead of memoizing the entire grid first.

## Connections

1. Profiler supplies evidence before `memo`/`useMemo` decisions.  
2. “Props changed” every time often means inline objects/functions — stabilize with those hooks.  
3. Same lesson as local state default: over-lifted state creates broad re-renders visible in the flame graph.  
4. Unexpected multi-commit sequences → verify automatic batching and where updates are scheduled.
