# `useEffect` in Depth

## What you need to know

`useEffect` synchronizes a component with an **external system**: browser APIs, subscriptions, timers, analytics, network, non-React DOM.

It is **not**:

- a generic “run after render” dumping ground for any logic;
- the place for **user-event** responses (use event handlers — see later section on events vs effects);
- the place to **derive** UI from props/state (compute during render instead).

Timing: **passive** — after paint. Deps: `Object.is` comparison. Always plan **cleanup**. Respect **exhaustive-deps**; don’t silence it casually.

Prerequisites: [render vs commit](../2.%20render-vs-commit/notes.md), [useState](../11.%20usestate/notes.md), [StrictMode](../7.%20strict-mode/notes.md), closures.

---

## What effects are for

| Use `useEffect` | Prefer something else |
| --- | --- |
| Subscribe to a store / WebSocket | — |
| `setInterval` / `addEventListener` | — |
| Fetch when `id` changes (or a data library) | Event-driven fetch on submit often in handler |
| Sync React state → `document.title` | — |
| Transform props → state “because I need useEffect” | Derive in render: `const x = f(props)` |

Mental model: **React state/UI is source of truth inside React; effects keep the outside world matching it** (and bring outside events back in via `setState`).

---

## Timing (preserved sequence)

Per commit that has passive effects:

1. React **commits** DOM mutations.  
2. Browser **paints**.  
3. React runs **cleanup** for the previous effect (if deps changed / unmount), then the **new** effect.

So `useEffect` **does not block paint** — good for fetch/analytics/subscriptions. If you must measure DOM **before** paint, that’s **`useLayoutEffect`** (different unit/timing).

---

## Dependency array semantics

```jsx
useEffect(() => { /* … */ }, [a, b]); // mount + when a or b changes (Object.is)
useEffect(() => { /* … */ });         // every render — rare, usually a smell
useEffect(() => { /* … */ }, []);     // mount once; cleanup on unmount
```

**Rule:** every reactive value from component scope used inside the effect (props, state, functions declared in the component) should appear in the deps array — or you risk a **stale closure**.

Comparisons use **`Object.is`** (same as `useState` bail-out). New object/array/function identities retrigger even if “contents” look equal.

---

## Classic stale closure: interval (preserved)

```jsx
function Timer() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setCount(count + 1); // BUG: count frozen from effect creation (0)
    }, 1000);
    return () => clearInterval(id);
  }, []); // empty → run once; closure forever sees count === 0

  return <div>{count}</div>; // often stuck showing 1 (always setCount(0+1))
}
```

### Fix 1 — functional updater (preferred here)

```jsx
useEffect(() => {
  const id = setInterval(() => {
    setCount((c) => c + 1);
  }, 1000);
  return () => clearInterval(id);
}, []);
```

No need to close over `count`; React supplies latest state to the updater.

### Fix 2 — list `count` in deps

```jsx
useEffect(() => {
  const id = setInterval(() => {
    setCount(count + 1);
  }, 1000);
  return () => clearInterval(id);
}, [count]);
```

Conceptually correct for “effect needs current `count`,” but **recreates the interval every tick** — wasteful for this case; prefer Fix 1.

---

## Cleanup functions

Returned cleanup runs:

1. **Before the effect re-runs** (deps changed) — tear down the previous setup.  
2. **On unmount** — final teardown.  
3. Under **StrictMode** (dev): extra mount → cleanup → remount on initial mount.

```jsx
useEffect(() => {
  const controller = new AbortController();
  fetch(url, { signal: controller.signal })
    .then((res) => res.json())
    .then(setData)
    .catch((err) => {
      if (err.name !== 'AbortError') setError(err);
    });

  return () => controller.abort();
}, [url]);
```

Without abort, fast `url` changes → **races**: older response can overwrite newer data.

Cleanup also: `clearInterval`, `removeEventListener`, unsubscribe, ignore stale `setState` flags.

---

## exhaustive-deps — fix data flow, don’t silence

`eslint-plugin-react-hooks` `exhaustive-deps` flags missing deps.

Healthy responses:

- Add the dependency and handle re-runs;  
- Functional `setState` to avoid needing a value;  
- Move static logic inside the effect;  
- `useCallback` / `useMemo` for stable function/object deps;  
- Split effects;  
- Don’t fetch in an effect if an event handler is the real trigger.

`// eslint-disable-next-line react-hooks/exhaustive-deps` is a common source of **production stale bugs**. Treat disable as last resort with a written reason.

---

## Infinite / constant re-fetch loop (preserved)

```jsx
function Bad({ options }) {
  // parent: <Bad options={{ sort: 'asc' }} />  → new object every render
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchData(options).then(setData);
  }, [options]); // new reference every time → effect → setData → re-render → …
}
```

**Fixes:** `useMemo` options in parent; pass primitives (`sort`); depend on `options.sort` only.

Similar loop: effect always `setState` with a **new object** without guarding → render → effect → …

---

## Effects vs event handlers (preview)

| Effects | Handlers |
| --- | --- |
| Sync with external system because props/state **are** a certain way | Respond to a **specific user action** |
| Run after paint based on deps | Run because click/submit happened |

Don’t replace `onClick` fetch with “effect when `submitted` flag flips” unless you have a strong reason — extra complexity and StrictMode double-fire footguns.

---

## Common mistakes and misconceptions

1. Empty deps + reading state in async callbacks without functional updates.  
2. Omitting deps / disabling exhaustive-deps.  
3. Object/array/function deps recreated every render → effect storms.  
4. Missing cleanup → leaks and fetch races.  
5. Using effects to compute derived state.  
6. Assuming effects run before paint.  
7. Treating StrictMode double effect as a framework bug.

---

## Connections to other concepts

```
commit → paint → useEffect
  vs useLayoutEffect (before paint)

closures + []
  → stale state in timers/subscriptions

setState functional updaters
  → avoid stale reads inside effects

StrictMode remount
  → cleanup must be correct

Object.is deps
  → same identity story as useState bail-out / memo
```

---

## Interview perspective

**Q: Empty-deps `useEffect` + `setInterval` reading state looks stuck. Why? Fix?**

Preserved answer:

> Effect ran once; closure captured `count` from that render permanently. Interval keeps using that stale value. Fix with `setCount(c => c + 1)`, or list `count` in deps (recreates interval — usually worse for timers). Prefer the functional updater here.

Also ready: cleanup/abort races; exhaustive-deps; after-paint timing; object-dep refetch loops.

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
