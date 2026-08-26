# `useEffect` in Depth — Answers

## Core recall

1. Synchronizing with an **external system** (subscriptions, timers, network, browser APIs, etc.).
2. **Asynchronously after paint** (passive effects).
3. **`[]`:** mount (+ unmount cleanup). **`[a]`:** mount + when `a` changes. **Omitted:** every render.
4. Before re-running the effect (deps change) and on unmount (and StrictMode’s simulated remount).
5. Cancel in-flight work so an **older response can’t overwrite newer** data (races).
6. List real dependencies or **restructure** so the effect isn’t stale — not casually disable the rule.
7. **New reference every parent render** → dep always “changed” → effect re-runs constantly.
8. **`setCount(c => c + 1)`**, or put **`count` in deps** (recreate interval).

## Explain why

1. User should see UI first; fetch/subscribe work can finish afterward without delaying paint.
2. Effect created once; closure forever sees initial `count` (0); `setCount(0+1)` repeatedly → stuck at 1.
3. Functional form doesn’t need a fresh closure of `count`; avoids tearing down/recreating the interval every tick.
4. Hidden stale closures → production bugs that only show after timing/navigation.
5. Previous setup’s timer/listener/request must be torn down so you don’t stack duplicates or race.
6. Clicks are discrete events — handlers are the direct, correct control flow; effects are for syncing to state/props over time.

## Compare and contrast

1. **`useEffect`:** after paint. **`useLayoutEffect`:** before paint (sync after DOM update).
2. **Effect:** “given these deps, keep outside world aligned.” **Handler:** “user did X.”
3. **`[]`:** one setup; risk stale reads. **`[state]`:** fresh values; more re-runs.
4. **Missing:** leaks/races. **Present:** teardown matches setup.
5. **Stale closure:** old value stuck. **New identity:** effect runs too often with “same” logical data.
6. **Derive in render:** pure, no effect. **Effect sync:** only when external store/API involved.

## Predict the behavior

1. Often **stuck at 1**.  
2. Increments **1, 2, 3, …**.  
3. **Every parent re-render** (new object identity).  
4. **A can win the race** and set stale `data` after B.  
5. **Setup → cleanup → setup** (extra cycle in React 18 StrictMode).

## Debugging

1. Stale `count` in `[]` — use functional updater (or deps).  
2. Fetch race — abort/ignore stale in cleanup.  
3. Wrap in `useCallback`, move function inside effect, or inline fetch; don’t leave unstable fn out of deps silently.  
4. Depend on primitives / memoize `filters` in parent.  
5. Disabled exhaustive-deps left a stale closure — fix deps/data flow.

## Application

1.
```jsx
useEffect(() => {
  const prev = document.title;
  document.title = 'New';
  return () => {
    document.title = prev;
  };
}, []);
```

2.
```jsx
useEffect(() => {
  const id = setInterval(() => setCount((c) => c + 1), 1000);
  return () => clearInterval(id);
}, []);
```

3.
```jsx
useEffect(() => {
  const ac = new AbortController();
  fetch(url, { signal: ac.signal })
    .then((r) => r.json())
    .then(setData)
    .catch((e) => {
      if (e.name !== 'AbortError') setError(e);
    });
  return () => ac.abort();
}, [url]);
```

4. `useEffect(..., [options.sort])` or parent `useMemo` / pass `sort` prop.

5. `async function onSubmit() { await post(form); }` — no `submitted` flag effect required for the POST itself.

## Interview questions

1. **Spoken:** Empty deps froze `count` in the closure; interval always used that value. Prefer `setCount(c => c + 1)`; or `[count]` with interval recreate.  
2. **Spoken:** Before re-run and on unmount — abort/unsubscribe so you don’t leak or race.  
3. **Spoken:** Deps decide when to re-sync; omitting values used inside → stale closure.  
4. **Spoken:** Add deps or restructure (functional updates, useCallback, split); avoid disable.  
5. **Spoken:** A dep’s identity changes every render (inline object/fn) even if logical value didn’t.

## Connections

1. Passive DOM → paint → passive effects — same timeline as render/commit notes.  
2. Functional updaters read latest state without putting state in the effect closure.  
3. StrictMode remount requires cleanup to undo setup.  
4. Deps and bail-outs both use reference/`Object.is` identity.  
5. Inline objects defeat memo **and** churn effects — stabilize or pass primitives.
