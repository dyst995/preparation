# `React.StrictMode` — What It Actually Does

## What you need to know

`StrictMode` is a **development-only** wrapper that stress-tests your tree for impure renders, missing effect cleanups, and legacy APIs. It does **not** run those extra checks in **production** and has **zero production runtime cost** from the double-invoke behavior.

In React 18+ dev, the headline behaviors:

1. **Double-invoke** render (and some initializers) to catch impure render.  
2. **Mount → effect → cleanup → remount → effect** on **initial mount** to catch incomplete effect cleanup.  
3. **Warnings** for unsafe class lifecycles, legacy string refs, legacy context API.

Interview bar: explain **why effects fire twice in dev**, that it’s **not a production bug**, and that breakage means **your cleanup is wrong**.

Prerequisites: [pure components](../5.%20pure-components/notes.md), [render vs commit](../2.%20render-vs-commit/notes.md), effects conceptually.

---

## What StrictMode is

```jsx
import { StrictMode } from 'react';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

It’s a component that enables **extra development checks** for its descendants. It doesn’t render visible UI of its own.

**Production:** the wrapper is effectively a no-op regarding double-rendering/double-effects — users don’t pay the double mount tax.

---

## What it does in development (checklist)

| Behavior | Catches |
| --- | --- |
| Double-invoke **function component bodies** (render) | Side effects / non-idempotent logic in render |
| Double-invoke **`useState` / `useMemo` / `useReducer` initializers`** | Initializers with side effects |
| React 18+: **effect setup → cleanup → setup** on first mount | Missing/incorrect cleanup (subscriptions, timers, fetches without abort) |
| Warn on **`componentWillMount`** etc. | Unsafe legacy class lifecycles |
| Warn on **string refs** / **legacy context** | Deprecated patterns |

Not every React version double-invoked effects the same way — **React 18 StrictMode** is the usual interview story for “effects run twice.”

---

## Why effects “fire twice” in React 18 StrictMode (preserved)

On **initial mount** of a StrictMode tree, React deliberately:

```text
mount
  → run effects (setup)
  → simulate unmount (run cleanups)
  → remount
  → run effects (setup again)
```

This simulates components being **torn down and rebuilt** (Suspense, Fast Refresh, concurrent scenarios, future features) so you write effects where **cleanup undoes setup**.

**If double-fire causes a real bug** (duplicate POST, leaked listener, two sockets): **cleanup is incomplete** — StrictMode found a bug; don’t “fix” by removing StrictMode as the first move.

```jsx
// Fragile under StrictMode remount
useEffect(() => {
  const id = setInterval(() => tick(), 1000);
  // missing: return () => clearInterval(id);
}, []);

// Resilient
useEffect(() => {
  const id = setInterval(() => tick(), 1000);
  return () => clearInterval(id);
}, []);
```

For fetches: abort in cleanup (`AbortController`) or ignore stale results so the “extra” setup doesn’t corrupt state after remount.

---

## Double-invoking render (not the same as double effects)

StrictMode also runs **render twice** in development (and re-runs some initializers). That surfaces:

```jsx
function Bad() {
  fetch('/api/log'); // runs twice in dev — belongs in useEffect
  return <Page />;
}
```

Same purity story: render must be safe to redo. Connecting units: [pure components](../5.%20pure-components/notes.md), [render vs commit](../2.%20render-vs-commit/notes.md).

**Don’t** “fix” double render by memoizing away intentional StrictMode checks or by putting side effects behind a module flag that breaks remount resilience.

---

## What StrictMode is not

- Not a performance mode.  
- Not enabled in production double-mount sense.  
- Not proof that React is “broken” when effects run twice in dev.  
- Not a substitute for tests — it’s a **runtime lint** for specific classes of bugs.  
- Not the same as TypeScript `strict` — different product, similar “catch mistakes early” vibe only.

---

## Practical responses when something double-fires

1. Confirm **dev + StrictMode** (not production).  
2. If **render** doubles a side effect → move effect out of render.  
3. If **`useEffect`** doubles → ensure **cleanup** cancels subscriptions/timers/requests; make setup idempotent under remount.  
4. For analytics “page view once”: use patterns that tolerate remount (send in cleanup-safe way, or dedupe with ref/session rules) — don’t disable StrictMode silently without understanding.  
5. Keep StrictMode on in apps that use concurrent features — it mirrors harder teardown cases.

---

## Common mistakes and misconceptions

1. “StrictMode causes production double effects.” — **No.**  
2. Removing StrictMode to hide missing cleanup.  
3. Treating double `useEffect` as a React bug.  
4. Confusing double **render** with double **effect** (related but different mechanisms).  
5. Putting `fetch` in render and blaming StrictMode for duplicate calls.  
6. Assuming every double log is StrictMode (could be remount from key/type change, parent structure, Fast Refresh).

---

## Connections to other concepts

```
pure render
  ← StrictMode double-render probes this

useEffect cleanup
  ← StrictMode mount/cleanup/remount probes this

concurrent / Suspense remounts
  ← same resilience StrictMode simulates

Fiber interruptible render
  ← impure render unsafe; StrictMode makes that visible early
```

---

## Interview perspective

**Q: Why does my `useEffect` run twice in development, and should I worry in production?**

Preserved strong answer:

> React 18 `StrictMode` intentionally mounts, runs effects, cleans up, and remounts once in development to verify cleanup — simulating teardown/rebuild under concurrent-style scenarios. It does **not** happen in production and has no production cost. If double-fire causes duplicate network calls or leaks, the cleanup isn’t undoing setup — a real bug StrictMode surfaced, not something to suppress blindly.

Also ready: list other StrictMode checks; distinguish render double-invoke vs effect remount cycle.

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
