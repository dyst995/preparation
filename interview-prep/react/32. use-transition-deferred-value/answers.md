# useTransition and useDeferredValue — Answers

## Core recall

1. Keep urgent UI (e.g. typing) responsive while expensive updates run at lower priority.  
2. Marks those state updates as low-priority transitions.  
3. Flag that a transition is in progress / UI hasn’t caught up — for pending UX.  
4. A lagged copy of `query` that catches up when React can afford the expensive consumers.  
5. `setQuery` / the controlled input update — urgent.  
6. When you want the expensive child to read a lagged value without wrapping the setter that produces heavy state.  
7. No — it doesn’t coalesce or delay fetches by itself.  
8. Compare `query !== deferredQuery` (or use `isPending` with transitions).

## Explain why

1. One render path does heavy work before/with the input commit → frames drop, input feels stuck.  
2. Newer urgent input / newer transition supersedes stale in-progress render work.  
3. Fast devices wait unnecessarily; slow ones may still overload — not tied to actual frame budget.  
4. Input would show lagged characters — defeats urgency.  
5. Transition schedules work; 10k DOM nodes still expensive — cut cost structurally.  
6. You need fewer HTTP calls; scheduler priority ≠ request throttling.

## Compare and contrast

1. **Transition:** mark updates low priority. **Deferred:** lag a value for heavy readers. Same goal, different API shape.  
2. **Transition:** adaptive render priority. **Debounce:** fixed delay / fewer invocations — great for I/O.  
3. **Deferred:** when to apply a value under load. **Memo:** skip recompute when deps unchanged — caching, not priority.  
4. **Urgent:** must feel immediate. **Transition:** may lag, interruptible.  
5. Spinner signals wait; previous results keep content stable — both need clarity so users aren’t confused.

## Predict / interpret

1. Input instant; results may lag / show pending.  
2. No — under light load deferred often keeps up; lag appears under contention.  
3. Typing feels sluggish — input was deprioritized.  
4. Feels artificially slow — fixed delay with no need; transition would adapt.

## Debugging

1. Move `setQuery` outside `startTransition`; only expensive `setResults` inside.  
2. Fetch still tied to urgent `query` or un-debounced effect — defer/transition don’t throttle network.  
3. Show `isPending` / dim stale list / aria-busy.  
4. Transition only helps React updates — long layout/CSS/WASM still blocks the main thread.

## Application

1. Match preserved `useTransition` search example.  
2.
```jsx
const deferredQuery = useDeferredValue(query);
const stale = deferredQuery !== query;
<ExpensiveList query={deferredQuery} style={{ opacity: stale ? 0.6 : 1 }} />
```

3. Paraphrase preserved interview answer.  
4. Debounce API search; `useTransition` for heavy local highlight/filter of cached results.

## Interview questions

1. **Spoken:** Transition deprioritizes React work adaptively and can supersede stale updates; debounce is a fixed delay — better for reducing network frequency. Prefer transition for expensive renders; debounce for fetch churn. Deferred when lagging a prop/value is cleaner than wrapping setters.  
2. **Spoken:** Communicates that results are catching up — prevents “broken search” confusion.  
3. **Spoken:** No — they schedule; still optimize algorithms / virtualize / memo.  
4. **Spoken:** UI stays interactive while heavy work trails — perceived speed without finishing every keystroke’s full list render.

## Connections

1. Concurrent React can interrupt/prepare low-priority renders; these hooks opt updates into that.  
2. Less work per transition → less pending time; complementary.  
3. Waterfalls are about **when network starts**; transitions are about **render priority** after/alongside state.  
4. Both manage waiting: Suspense for async/missing UI; pending flags for transition lag — different triggers, similar UX need to show “not final yet.”
