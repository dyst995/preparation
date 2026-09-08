# useTransition and useDeferredValue — Keeping UI Responsive Under Load

## What you need to know

Some updates are **urgent** (keystrokes in a controlled input must feel instant). Others are **expensive but non-urgent** (re-filtering a huge list from that input). If both run as one blocking render, typing stutters.

**`useTransition`** and **`useDeferredValue`** tell React’s concurrent scheduler to treat the expensive part as **lower priority**: keep showing responsive urgent UI, interrupt or deprioritize stale expensive work, adapt to device speed.

They are **not** a replacement for debouncing **network** calls, and they don’t make a slow algorithm asymptotically faster — they change **scheduling / priority** of React updates.

Prerequisites: [batching](../6.%20batching/notes.md), [React.memo](../25.%20react-memo/notes.md) / expensive lists, concurrent rendering awareness from Fiber notes.

---

## The problem (preserved)

```text
Same event handler:
  setQuery(next)           → must update input NOW
  setResults(expensive(next)) → heavy render

Without priority split:
  one render does both → input waits on list work → jank
```

Split urgency from cost.

---

## `useTransition` (preserved)

```jsx
function SearchPage() {
  const [query, setQuery] = useState('');
  const [isPending, startTransition] = useTransition();
  const [results, setResults] = useState([]);

  function handleChange(e) {
    setQuery(e.target.value); // urgent
    startTransition(() => {
      setResults(computeExpensiveResults(e.target.value)); // low priority
    });
  }

  return (
    <>
      <input value={query} onChange={handleChange} />
      {isPending && <Spinner />}
      <ResultsList results={results} />
    </>
  );
}
```

| Piece | Role |
| --- | --- |
| `startTransition(fn)` | State updates **inside** `fn` are marked as transitions (lower priority) |
| `isPending` | `true` while that transition’s UI hasn’t caught up yet — show pending affordance |

Mental model:

- Urgent `setQuery` commits quickly → input stays snappy.  
- Transition `setResults` can be **interrupted** if the user types again (newer urgent work / newer transition supersedes stale work).  
- Results may briefly show **previous** data while `isPending` — often dim list or spinner.

Also used for **non-input** navigations: wrap tab/ coarse filter changes that remount heavy trees so clicks stay responsive.

`startTransition` does **not** delay arbitrary side effects (fetch); it prioritizes **React state updates / rendering**. For fetch frequency, debounce/throttle or RQ still matter.

---

## `useDeferredValue` (preserved)

```jsx
function SearchPage() {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query); // lags under load

  return (
    <>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <ExpensiveResultsList query={deferredQuery} />
    </>
  );
}
```

Instead of wrapping setters, you keep one source of truth (`query`) and pass a **deferred mirror** into the expensive subtree.

Under load:

- `query` updates immediately (input).  
- `deferredQuery` **lags**, then catches up when React has bandwidth.  
- Expensive child re-renders against the deferred value at lower priority.

Useful when you don’t control the expensive child’s internals (or want a single state variable).

Detect pending visually: `query !== deferredQuery` (stale results showing) — similar role to `isPending`.

---

## Choosing between them

| Prefer | When |
| --- | --- |
| **`useTransition`** | You own the expensive **state update** (`setResults`, switching selected tab state that causes heavy UI) |
| **`useDeferredValue`** | Expensive work is driven by an **already-updated value** passed as props; you want that value to lag for heavy consumers |

Same goal: urgent UI stays current; heavy UI may show previous output briefly.

Often either works for search-box → heavy list; pick the shape that matches your state.

---

## vs debouncing (preserved)

| | Debounce | `useTransition` / `useDeferredValue` |
| --- | --- | --- |
| Mechanism | Fixed **timer** before running work | React **scheduler** priority |
| Adapts to device? | No — 300ms everywhere | Yes — slower devices lag more naturally |
| Stale work | Timer may still fire old work unless canceled carefully | Transitions can be **interrupted / superseded** |
| Best for | Reducing **frequency** of external I/O (API calls) | Deprioritizing **React render/compute** |

Interview line (preserved intent):

- Transition/deferred → expensive **render** you want React to schedule.  
- Debounce → fewer **network** (or other external) calls; transition alone doesn’t coalesce fetches.

You can combine: debounce the API, use transition for local filtering of already-loaded data.

---

## Concurrent features — light internals

React 18+ can prepare updates in the background and **interrupt** render work. Marking an update as a transition opts that update into “okay to lag / interrupt.” Urgent updates (typing, clicks) stay high priority.

This is **perceived performance**: the app feels responsive even if the heavy list isn’t finished every keystroke.

Not a substitute for virtualizing 10k DOM rows — still do the right structural fix; then use transitions so remaining work doesn’t block input.

---

## Interview answer (preserved)

**Q: When would you use `useTransition` over just debouncing an input?**

> “Debouncing delays the expensive work by a fixed timer regardless of the device’s actual capacity — it’s a blunt instrument. `useTransition` tells React the update is lower priority, so React can interleave it with more urgent work like continued typing, and can genuinely abandon a stale transition if a newer one supersedes it, adapting to real rendering cost rather than a guessed delay. I’d reach for it when the expensive work is a React render/computation I want React’s scheduler to deprioritize, and reach for debouncing more when I want to reduce the *frequency* of an external effect, like network requests, which `useTransition` doesn’t address by itself.”

---

## Common mistakes and misconceptions

1. Wrapping fetches in `startTransition` and expecting request coalescing like debounce.  
2. Putting the **input** state update inside the transition → typing feels lagged (wrong priority).  
3. Using transitions instead of virtualizing / memoizing a pathological list.  
4. Forgetting pending UI (`isPending` / `query !== deferredQuery`) → confusing stale results.  
5. Assuming deferred value always differs — on fast devices it may keep up almost always.  
6. Confusing with `useMemo` (cache) — different lever (priority vs recompute skip).

---

## Connections to other concepts

```
urgent input state
  + expensive derived UI
  → useTransition / useDeferredValue

debounce
  → API frequency
  → complementary, not identical

memo / virtualize
  → reduce cost of the expensive path
  → transition makes remaining cost non-blocking for input

Suspense / concurrent
  → same generation of interruptible rendering features
```

---

## Interview perspective

Be ready to:

1. Urgent vs non-urgent updates.  
2. `startTransition` + `isPending` vs `useDeferredValue`.  
3. Why not only debounce for render jank.  
4. When debounce still wins (network).  
5. Pending/stale UI patterns.  
6. Pair with structural perf (virtualize), don’t replace it.

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
