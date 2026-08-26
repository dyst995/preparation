# Batching: How Many Renders Does One Event Trigger? — Answers

## Core recall

1. Grouping multiple state updates so React re-renders **once** with all of them applied together.
2. **Batched:** React event handlers. **Often not:** `setTimeout`, promises, native listeners, much async code.
3. Batching applies **in those async/native contexts too** (with `createRoot`).
4. **`createRoot`** (React 18).
5. Update is **scheduled**; the variable is from the **current render’s closure** — not updated in place.
6. Value form → typically **+1**; functional → **+2**.
7. Forces React to **flush** updates synchronously (DOM updated before continuing) — opt out of batching for that scope.
8. **No** — batching only merges updates into fewer renders; reads stay async until the next render.

## Explain why

1. Less render/commit work; avoids flashing intermediate states where only some updates applied.
2. Both calculations use the same closed-over `count`, scheduling the same next value twice.
3. Updaters chain: each sees the pending result of the previous.
4. People expected one render; got two → extra work, possible inconsistent intermediate UI, confusing mental model.
5. Sync flushes are more expensive and can defeat React’s scheduling; only for real sync DOM needs.
6. `count` is a **const from that render**; `setCount` schedules a future render with a new `count` binding.

## Compare and contrast

1. **17:** batch mainly in React handlers. **18 + createRoot:** batch in timeouts/promises/native too.
2. **Value:** replace with computed value from this render. **Functional:** compute from latest pending state.
3. **Batching:** defer and merge. **`flushSync`:** apply now before next lines run.
4. **One click / one batch:** one render with both. **Two clicks:** two separate updates/renders (each click its own turn).
5. **Schedule:** queue intent. **Re-render:** apply and produce new UI/closures.
6. **Batching:** how many updates share a render. **Transitions:** priority of updates (can defer non-urgent work) — not the same knob.

## Predict the behavior

1. **One** re-render (automatic batching).
2. **Two** re-renders (typically, legacy unbatched async).
3. **1** (if started at 0).
4. **2**.
5. **`0`** logs — still old closure value.

## Debugging

1. Use `setCount(c => c + 1)` twice (or once with +2).
2. On React 18 `createRoot`, those two should **batch into one** render automatically.
3. Don’t sync-flush for logging — log in `useEffect` or accept async updates; `flushSync` is for rare DOM sync needs.
4. `flushSync` then read DOM, or read in `useLayoutEffect` after the update — don’t expect sync mutation from normal `setState`.
5. Updates are **async/scheduled** even in handlers; handlers only **batched** them (17) / still don’t assign state variables sync.

## Application

1.
```jsx
function onClick() {
  setCount((c) => c + 1);
  setCount((c) => c + 1);
}
```

2.
```jsx
setTimeout(() => {
  setCount((c) => c + 1);
  setFlag((f) => !f);
}, 0); // one render on React 18 createRoot
```

3. Need layout immediately: `flushSync(() => setOpen(true)); el.getBoundingClientRect();`

4. “setState schedules a re-render; your log still sees this render’s state. Check after render via effect or the next render’s UI.”

## Interview questions

1. **Spoken:** Scheduled/batched update; `state` in scope is from current render until re-render.  
2. **Spoken:** Value form uses stale `count` twice → +1; functional chains → +2.  
3. **Spoken:** 17 batched mainly in React events; 18 `createRoot` batches in async/timeouts/native too.  
4. **Spoken:** Multiple `setState`s in one context collapse to one re-render by default in React 18.  
5. **Spoken:** Rare — force sync DOM update before subsequent code (measure layout, etc.).

## Connections

1. One batch ⇒ one trip through render/diff/commit instead of many.
2. Same stale-closure idea: handler closes over render N’s `count`.
3. Batching changes **how often** you re-render; each re-render still might skip some DOM if nothing host-visible changed.
4. Queued updates need a way to depend on each other → functional updaters.
5. StrictMode may double-invoke **render**; a single click still typically queues state once per user action — don’t confuse with double `setState` in the handler.
