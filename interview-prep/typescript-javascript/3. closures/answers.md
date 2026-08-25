# Closures — Answers

## Core recall

1. A **function plus a lasting link to the lexical environment(s)** where it was created, so it can read/update outer bindings even when run outside those scopes (e.g. after the outer function returns).

2. They capture **bindings (by reference / live)**, not value snapshots. Later reads see the **current** value; writes update the **same** slot. Async callbacks see whatever the binding holds **when they run**.

3. `increment` still references `makeCounter`’s environment, so that environment (and `count`) stay reachable instead of being GC’d when the call frame ends.

4. **One** — a single function-scoped `var i` shared by the loop and all callbacks.

5. It creates a **new `i` binding per iteration**. Each callback closes over a different binding that keeps that iteration’s value.

6. Any three of: **private state / module pattern**, **memoization**, **currying / partial application**, **debounce/throttle**, factory APIs, React callbacks (with stale-closure caveats).

7. While a function is reachable, environments it still needs stay reachable. Long-lived listeners/intervals/caches can keep large closed-over data alive forever → leak-shaped retention.

## Explain why

1. The returned function keeps a reference to the outer **lexical environment**. Identifier lookup still walks that chain; the call frame can go away, but the environment remains as long as the function does.

2. All timeouts close over the **same** `var i`. The loop finishes synchronously with `i === 3`; when callbacks run later, each reads that live binding → `3, 3, 3`.

3. Each IIFE call creates a **new parameter binding `j`** holding that iteration’s number. The timeout closes over `j`, not the shared `i` — same idea as per-iteration bindings, done manually.

4. Each `makeCounter()` call creates a **new** environment with its own `count`. Separate calls → separate bindings → independent counters.

5. Both functions’ `[[Environment]]` (mental model) point at the **same** outer environment record, so they read/write the same bindings (e.g. one `count` or shared `history`).

6. Async code runs **later**. If you think you “copied” `i` at definition time, you’ll expect `0,1,2` while a shared live binding still shows the final value. Correct model: live binding unless you create a distinct binding (param, `let` per iteration, local copy).

## Compare and contrast

1. **Closing over a binding:** later reads see updates to that slot. **Passing a primitive into a new call:** the parameter is a **new binding** initialized to that value (a copy of the primitive); mutating the outer later does not change the parameter.

2. **`var`:** one shared `i` → async callbacks all see the final value. **`let` in `for`:** per-iteration `i` → each callback sees its iteration’s value (`0,1,2`).

3. **Same goal:** a distinct binding per iteration for the callback to close over. **`let`:** language provides per-iteration bindings. **IIFE:** you create a per-call parameter binding yourself (works with legacy `var`).

4. **Closures:** lexical variable environments from where the function was **defined**. **`this`:** mostly determined by **how** the function is called (or arrow’s lexical `this`). Different mechanisms; don’t conflate them.

5. **Module pattern:** hide data in a function scope; only returned methods see it (works in one file/factory). **ES module top-level `let`:** file-private by module scope without a factory. **`#private` fields:** per-instance encapsulation on a class. Same privacy *idea*, different packaging.

6. **Stale closure:** function correctly retains an **old** environment (e.g. first React render’s `count`) while you wanted a newer one. **Shared mutable binding:** one binding, many readers — all see the same current value (often “all see the last”). Failure modes: outdated vs everyone-synced-to-final.

## Predict the output

1. **Logs `1`, then `2`.** Same closed-over `count`; each call increments the live binding.

2. **Logs `3`, `3`, `3` (async, after the loop).** One shared `var i`; loop ends at `3`; timeouts read it later.

3. **Logs `0`, `1`, `2` (async).** Per-iteration `let i`; each timeout closes over a different binding.

4. **Logs `2`.** `inc` and `read` share the same `x`; `inc` mutates it; `read` sees the update.

5. **Logs `1`, `1`, `2`.** `a` and `b` are independent counters; second `a()` continues `a`’s count.

6. **Logs `0`, `1`, `2` (async).** IIFE parameter `j` is a fresh binding per iteration; callbacks close over `j`.

7. **Logs `9`.** Closure holds the **object binding**; mutating `state.value` is visible through the same object reference.

8. **Logs `[3, 3, 3]`.** All arrows close over one `var i`; after the loop `i === 3`.

9. **Logs `[0, 1, 2]`.** Each iteration’s `let i` is a distinct binding closed over by that arrow.

10. **Logs `1`.** `read` closes over the outer `x` binding; `bump` updates that same binding before `read()` runs.

## Debugging

1. **Diagnosis:** shared `var i` → all timeouts see `3`.  
   **Fix:** `for (let i = 0; …)`, or IIFE `(function (j) { setTimeout(() => console.log(j), 100); })(i)`, or `scheduleLog(i)` helper with a parameter.

2. **Printed:** `undefined`, `undefined`, `undefined` (after loop `i === 3`; `items[3]` is undefined).  
   **Fixes:** (a) `for (let i = …)`; (b) IIFE/helper capturing `i` or `items[i]`; (c) `items.map((item) => () => item)` — close over the element binding.

3. **Why `0` forever:** effect ran once (`[]` deps) and the interval callback closed over **`count` from that first render** (`0`). Later renders update state but don’t recreate that callback.  
   **Idea:** stale closure — correct lexical capture of an **old** render environment. Fix via deps / functional updates / refs (React mechanics), still grounded in which environment the function points at.

4. **What keeps `huge` alive:** the click listener (long-lived while `el` lives) closes over `huge`.  
   **Redesign:** close over only what’s needed, e.g. `const size = huge.size;` then log `size`, or don’t retain the whole structure in the handler scope.

## Application

1.
```js
function makeAdder(n) {
  return (x) => n + x;
}
```
Closes over **`n`** (the parameter binding from `makeAdder`).

2.
```js
function createStore(initial) {
  let value = initial;
  return {
    get: () => value,
    set: (next) => {
      value = next;
      return value;
    },
  };
}
```
`value` is private to the closed-over environment.

3.
```js
function memoize(fn) {
  const cache = new Map();
  return function (key) {
    if (cache.has(key)) return cache.get(key);
    const value = fn(key);
    cache.set(key, value);
    return value;
  };
}
```
Returned function and `cache` share one lifetime via closure.

4.
```js
for (var i = 0; i < 3; i++) {
  (function (j) {
    setTimeout(() => console.log(j), 0);
  })(i);
}
// or: function schedule(j) { setTimeout(() => console.log(j), 0); }
// for (var i = 0; i < 3; i++) schedule(i);
```

5.
```js
// shared history
function makeShared() {
  const history = [];
  return {
    push: (x) => (history.push(x), history.slice()),
    read: () => history.slice(),
  };
}

// isolated histories
function makeIsolated() {
  return {
    a: (() => {
      const history = [];
      return (x) => (history.push(x), history.slice());
    })(),
    b: (() => {
      const history = [];
      return (x) => (history.push(x), history.slice());
    })(),
  };
}
```
Shared = one outer binding; isolated = separate environments per function.

## Interview questions

1. **Spoken:** “A closure is a function that retains access to variables from its enclosing lexical scopes even when run outside them — mechanically, it keeps a link to those environments and reads live bindings, not photocopied values.”  
   **Follow-ups:** By reference/live binding. Prove with two methods sharing `count`, or `a` reading after `b` increments.

2. **Spoken:** “It logs `3,3,3` because `var i` is one shared binding and timeouts run after the loop. Fix with `let` for per-iteration bindings, or an IIFE/helper parameter.”  
   **Follow-ups:** IIFE creates a per-call `j`. `let` in `for` creates a new `i` each iteration — each closure’s binding stays at that index.

3. **Spoken:** “Factories with private state, memoization caches, debounce timers, partial application — anything that returns or registers a function that still needs outer config/state.”  
   **Follow-ups:** Downside — retained memory while the function is reachable; unbounded caches and forgotten listeners leak.

4. **Spoken:** “Return methods from a factory that close over a `let` in the outer scope — no public field exposes it.”  
   **Follow-ups:** Module top-level `let` is privacy at **file** boundary (import surface). Factory closures give privacy per **instance/call** inside a file or across returned objects.

5. **Spoken:** “A stale closure is a function still pointing at an older lexical environment than the one you mentally expect — in React, an effect/interval created on an early render keeps logging that render’s `count`.”  
   **Follow-ups:** Lexically it’s correct for the environment it was created with; the bug is which generation of function you kept running.

## Connections

1. Lexical scope fixes which outer bindings a function can see **by definition site**. Closures are those functions retaining links to those environments so lookup still works after escape.

2. `var` gives **one** loop binding; closures capture it live; event-loop timing runs callbacks **after** the loop → everyone reads the final `i`.

3. `for (let i …)` is a **scope** rule (per-iteration bindings). Closures don’t invent that — they expose it when each callback keeps its own `i`.

4. Debounce/throttle keep `timer` / last-run state in closed-over bindings so every invocation shares one scheduler without a class instance.

5. **Shared binding:** many callbacks, one `var i` / one object slot → all see the same current value (often final). **Need a snapshot:** copy into a per-iteration param/`const` if you must freeze a primitive at schedule time. **Stale React generation:** function from an old render still correct for *that* environment — recreate via deps, or use functional updates/refs so you don’t rely on an outdated closed-over value.
