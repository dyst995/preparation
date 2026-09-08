# Concurrency Pitfalls in Real Apps

## What you need to know

Single-threaded JS still has **concurrency**: many async operations can be **in flight** at once. Pitfalls come from **completion order**, **forgotten error handlers**, **missing cancellation**, and **APIs that look async-friendly but aren’t** (`.forEach`).

This unit is about bugs you ship in React/RN/Nest — not about inventing threads.

Curriculum checklist this unit completes:

- Race conditions: stale response overwrites fresh state
- Unhandled Promise rejections
- Cancellation: `AbortController`, ignore-stale flags / request ids
- Debounce vs throttle as concurrency shaping
- Why `.forEach` cannot `await` correctly

Prerequisites: [Promises](../promises/notes.md), [async/await](../async-await/notes.md), [Event loop](../event-loop/notes.md). Closures matter for “latest request” refs.

---

## What “race” means here

### Not multi-threaded memory races

In typical app JS, the danger is usually:

> Two async operations were started; the **older** one finishes **after** the newer one and still updates UI/state.

Network latency does not preserve send order. Your event loop runs whichever callback becomes ready first.

### Classic search box (preserved)

```js
// BUG: "a" then quickly "ab" — response for "a" may arrive after "ab"
function onSearchChange(query) {
  fetchResults(query).then((results) => setResults(results));
}
```

Timeline:

```
type "a"  → request A starts
type "ab" → request B starts
B returns → setResults(ab)  ✓
A returns → setResults(a)   ✗ stale wins
```

Same pattern: tab switching, rapid filter changes, React effect re-runs without cleanup, double-clicked submit, Nest handler using shared mutable cache without versioning.

---

## Fix 1: Ignore stale responses (request id / flag)

Keep a monotonically increasing **generation** (or “latest query”) and only commit if it still matches.

```js
let latest = 0;

async function onSearchChange(query) {
  const id = ++latest;
  const results = await fetchResults(query);
  if (id !== latest) return; // stale
  setResults(results);
}
```

React effect variant:

```js
useEffect(() => {
  let cancelled = false;
  fetchResults(query).then((results) => {
    if (!cancelled) setResults(results);
  });
  return () => {
    cancelled = true; // ignore when effect re-runs or unmounts
  };
}, [query]);
```

**What this does:** stops **applying** stale data.  
**What it doesn’t do:** stop the network work (unless paired with abort). Wasted bandwidth/CPU may continue.

---

## Fix 2: `AbortController` (cancel in flight)

```js
let currentController;

async function onSearchChange(query) {
  currentController?.abort();
  currentController = new AbortController();
  try {
    const res = await fetch(`/search?q=${query}`, {
      signal: currentController.signal,
    });
    setResults(await res.json());
  } catch (err) {
    if (err.name === 'AbortError') return; // expected
    throw err;
  }
}
```

### How it works

- `abort()` signals all consumers of that `signal`.
- `fetch` (and many modern APIs) reject with `AbortError` / `DOMException`.
- Treat abort as control flow, not a user-facing failure.

### Why libraries exist (preserved point)

React Query / SWR / RTK Query automate **query keys + cancellation / ignore stale**. Knowing the manual pattern proves you understand *why* they exist.

### Abort + ignore-stale together

Abort reduces waste; a generation check still helps if some APIs can’t abort or if multiple code paths can set state.

---

## Interview framing (preserved)

**Q: User types quickly; older shorter-query results flash after correct results. What’s happening and how do you fix it?**

> Classic race: multiple requests in flight; completion order ≠ send order; older response overwrites newer state. Fix with a request id/ref that only commits the latest, and/or `AbortController` to cancel the previous fetch when a new search starts. Libraries like React Query solve this with query keys and cancellation.

---

## Unhandled Promise rejections

### What they are

A Promise **rejects** and nothing handles it in time — no `.catch`, no `await` inside `try/catch` on a caller that actually waits.

```js
async function risky() {
  throw new Error('boom');
}
risky(); // fire-and-forget — unhandled rejection risk
```

### Why they matter

| Environment | Typical pain |
|---|---|
| Node | Warnings; can **crash** process depending on version / `--unhandled-rejections` strictness |
| Browsers / RN | Easy to miss; “silent” failed features; noisy console in dev |
| Production | “Works on my machine” empty catches elsewhere; ops only see partial symptoms |

**Rule of thumb (preserved):** every Promise you create or call should be `await`ed in `try/catch`, or have an explicit `.catch()`. Fire-and-forget only when deliberate and visible — still prefer `.catch(logError)`.

```js
void saveDraft(data).catch(logError); // intentional background save
```

### Event handlers are a common leak

```js
button.onclick = async () => {
  await submit(); // rejection becomes unhandled unless try/catch inside
};
```

Edge handlers must catch or route errors to UI.

---

## `.forEach` does not await (preserved)

```js
items.forEach(async (item) => {
  await save(item);
});
console.log('done'); // runs before saves finish — forEach ignores returned Promises
```

### Why

`forEach` expects a sync visitor. It does not inspect or await a returned Promise. All async visitors are started; their Promises float away (often **unhandled** if `save` rejects).

### Fixes

| Goal | Pattern |
|---|---|
| Sequential | `for (const item of items) await save(item);` |
| Parallel | `await Promise.all(items.map((item) => save(item)));` |
| Partial OK | `await Promise.allSettled(...)` |
| Limited concurrency | pool / batch helper |

Also avoid: `array.map(async ...)` **without** `await Promise.all` if you need completion — `map` returns an array of Promises you must combine.

---

## Debounce vs throttle (concurrency shaping)

These are not only “perf micro-optimizations.” They **reduce how many async operations you start**, which reduces races and server load.

### Debounce

Run after activity **settles** (e.g. search: wait until typing pauses).

```js
// conceptual
onInput → reset timer → after 300ms quiet → fetch once
```

Fewer in-flight requests; pairs well with AbortController on the single latest call.

### Throttle

Run at most once per **interval** while activity continues (e.g. scroll handlers, resize, some tracking).

```js
// conceptual
onScroll → allow one handler per 100ms; drop or coalesce extras
```

### Compare

| | Debounce | Throttle |
|---|---|---|
| When it fires | After quiet period | Regularly during continuous events |
| Typical UX | Search autocomplete | Scroll position sync |
| Race pressure | Strongly reduces starts | Caps rate of starts |

Neither replaces abort/ignore-stale alone if a slow response can still outrun a later one — but fewer flights make races rarer.

---

## Related pitfalls (same family)

### React Strict Mode / effect re-run

Effects may mount→cleanup→mount in dev. Without cleanup (`cancelled = true` / abort), you double-fetch and risk races.

### Double submit

Two clicks → two POSTs. Disable button, or idempotency keys, or in-flight guard:

```js
if (inFlight) return;
inFlight = true;
try {
  await submit();
} finally {
  inFlight = false;
}
```

### Shared mutable state in Nest

Concurrent requests on one Node process share module-level variables. A request-scoped “latest” flag on a singleton service can cross wires — prefer per-request locals, not globals, for cancellation tokens.

### Sequential vs parallel (async/await unit)

Opposite failure mode: awaiting too serially. Here the failure is **too much overlap without coordination**.

---

## Choosing a defense

| Situation | Prefer |
|---|---|
| Search / typeahead | Debounce + AbortController (+ ignore-stale) |
| Effect load by id | Abort or cancelled flag in cleanup |
| Must apply only latest, can’t abort | Generation / request id |
| Must not lose errors | Never bare fire-and-forget |
| Bulk save | `all` / `allSettled` / pool — not `forEach`+`async` |

---

## Common mistakes and misconceptions

1. **“JS is single-threaded so races can’t happen.”** Completion-order races still happen.
2. **Ignore-stale without understanding abort** — UI safe, network still busy.
3. **Catching `AbortError` as a real failure** — noisy toasts on every keystroke.
4. **`forEach(async ...)` and assuming serialization or completion.**
5. **Unhandled rejection because the `async` onclick has no try/catch.**
6. **Debouncing UI setState but still launching fetch on every keypress** — debounce the async start, not only the render.
7. **Relying only on library magic** without being able to explain query keys / cancel.

---

## Connections to other concepts

```
many in-flight Promises
  → settle in unpredictable order
    → stale handler closes over/setState wrong generation
      → race bug

AbortController / cancelled flag
  → stop apply (and maybe stop I/O)
    → same problem React Query automates

async forEach
  → returned Promises ignored
    → early "done" + unhandled rejects

await in for...of / Promise.all
  → intentional serial or parallel completion

debounce/throttle
  → fewer concurrent starts
    → less race surface + less load

unhandled rejection
  → Promise error path with no catch/await
    → Node crash risk / silent UX failure
```

Event loop explains **when** callbacks run; this unit explains **which completion is still valid** when several are queued.

---

## Interview perspective

You should be able to:

1. Narrate the search-box race with a timeline.
2. Implement ignore-stale and AbortController fixes and contrast them.
3. Explain unhandled rejections and the “every Promise has a home” rule.
4. Fix `forEach(async)` with `for...of` or `Promise.all`.
5. Position debounce/throttle as concurrency control.
6. Name what React Query automates without hand-waving.

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
