# Concurrency Pitfalls — Answers

## Core recall

1. **Multiple in-flight async ops; an older one finishes after a newer one and still updates UI/state** — completion order ≠ send order. Not a multi-threaded memory race.

2. **Ignore-stale (generation / request id / cancelled flag)** and **`AbortController` cancel previous fetch** (often both).

3. **`abort()` signals the `fetch` (and other signal consumers)** so the request can be cancelled; `fetch` typically rejects with `AbortError`.

4. **A Promise rejects with no handler in time** — no `.catch`, no `await` in `try/catch` on a waiter. Runtime warning / Node crash risk / silent feature failure.

5. **`forEach` ignores return values.** Async callbacks’ Promises are not awaited; visitors start and float away.

6. **Parallel:** `await Promise.all(items.map(save))` (or `allSettled`). **Sequential:** `for (const item of items) await save(item)`.

7. **Debounce:** run after a quiet period (search autocomplete). **Throttle:** run at most once per interval while events continue (scroll sync).

8. **Automate query identity + ignore-stale / cancellation** so rapid refetches don’t apply wrong data or leak work — the manual patterns you’d otherwise write.

---

## Explain why

1. **One stack runs whichever callback becomes ready first.** Network latency doesn’t preserve start order — later-started request can settle first; earlier callback can still `setState` afterward.

2. **Cancelled flag only skips applying results** after the Promise settles. The network/CPU work may still finish unless you also abort.

3. **The handler’s returned Promise is usually nobody’s responsibility.** Rejection becomes unhandled — failed UX with no catch path; Node may crash under strict unhandledRejection policy.

4. **`forEach` returns immediately after starting all visitors.** It never waits on returned Promises, so `"done"` logs before saves finish.

5. **Fewer overlapping requests** — you often fire once after typing pauses instead of per keystroke, shrinking the race window and server load.

6. **Abort is expected control flow**, not a user-facing failure. Treating it like a real error causes toasts/noise on every cancelled keystroke/navigation.

---

## Compare and contrast

1. **Ignore-stale:** cheap; stops bad UI commits; work may continue. **AbortController:** cancels in-flight I/O (less waste); still handle `AbortError`; pair with ignore-stale when abort isn’t universal.

2. **Debounce:** after quiet — fewer starts, good for search. **Throttle:** periodic during continuous input — caps rate for scroll/resize. Both shape concurrency; neither alone guarantees correct latest-wins without abort/id.

3. **`forEach(async)`:** fire-and-forget Promises; early “done”; easy unhandled rejects. **`for...of` + `await`:** serial completion. **`Promise.all(map)`:** parallel completion; combine/handle errors explicitly.

4. **Unhandled:** rejection with no home → warning/crash/silent fail. **Caught mid-chain + recover:** returns a value, chain continues fulfilled — intentional recovery, not an unhandled rejection.

5. **Sequential awaits:** too little overlap → latency. **Uncontrolled parallel:** too much overlap without latest-wins/cancel → races/stale UI / overload. Opposite failure modes of concurrency.

6. **Effect cleanup flag:** scoped to that effect instance; reset on re-run/unmount — React-safe. **Global `let latest`:** works in simple modules; dangerous if shared across concurrent Nest requests or multiple components without care — prefer per-request / per-hook locals.

---

## Predict the output / behavior

1. **No id check:** whichever returns last applies — if `"a"` returns after `"ab"`, stale `"a"` overwrites. **With `id === n`:** only the latest generation applies — when `"a"` returns, `id !== n`, skip; `"ab"` applies.

2. **Logs `done` first** (sync), then `'saved'` as each save finishes (order depends on save timing). Saves are not sequenced by `forEach`; rejections may be unhandled.

3. **Click → thrown Error rejects the async handler’s Promise → typically UnhandledPromiseRejection** (unless the host wraps it). No UI catch path.

4. **Logs `AbortError`** (name may be `AbortError`). Abort rejects the fetch; catch prints the abort error name.

5. **Ideally one fetch** after ~300ms quiet following the last key (`help`) — intermediate letters are coalesced by debounce.

---

## Debugging

1. **Race: older response overwrites newer state.** **Fixes:** generation/id or effect cancelled flag; **`AbortController`** abort previous on new query; often debounce + both.

2. **Effect re-runs / unmount without cleanup** — stale response `setUser` / setState on unmounted. **Fix:** cleanup `cancelled = true` or abort; only setState if still current `id`.

3. **`forEach(async)` doesn’t await; `res.send` runs immediately** — client gets ok while imports still run; failures become unhandled. **Fix:** `await Promise.all(items.map(importOne))` (or `allSettled` / queue) before `res.send`.

4. **Fire-and-forget Promise with no `.catch`.** **Fix:** `autosave(doc).catch(log)` or supervised background job; never leave rejection homeless.

5. **Add AbortController (cancel prior)** and/or ignore-stale; optionally throttle/limit concurrency — debounce alone doesn’t cancel a slow in-flight request that can still finish late.

---

## Application

1.
```js
function createLatestOnlySearcher(fetchFn) {
  let latest = 0;
  return async (query) => {
    const id = ++latest;
    const results = await fetchFn(query);
    if (id !== latest) return; // stale
    return results; // or setState(results)
  };
}
```

2.
```js
function createAbortingSearcher(fetchFn) {
  let controller;
  return async (query) => {
    controller?.abort();
    controller = new AbortController();
    try {
      return await fetchFn(query, controller.signal);
    } catch (err) {
      if (err.name === 'AbortError') return;
      throw err;
    }
  };
}
```

3.
```js
// (a) sequential
for (const item of items) await save(item);

// (b) parallel
await Promise.all(items.map((item) => save(item)));
```

4.
```js
function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
const onSearchChange = debounce((q) => fetchResults(q).then(setResults), 300);
// Prefer also abort/ignore-stale inside the debounced fetch.
```

5.
```js
useEffect(() => {
  const c = new AbortController();
  fetchUser(userId, { signal: c.signal })
    .then(setUser)
    .catch((e) => {
      if (e.name === 'AbortError') return;
      /* handle */
    });
  return () => c.abort();
}, [userId]);
```

---

## Interview questions

1. **Spoken:** Classic race — multiple fetches; older response arrives last and overwrites. Fix with latest-only id/flag and/or AbortController; libraries use query keys + cancel.  
   **Follow-ups:** Abort stops I/O; ignore-stale stops apply. React Query/SWR automate keys, caching, stale ignore, cancellation.

2. **Spoken:** `forEach` doesn’t await returned Promises — early done, floating rejects.  
   **Follow-ups:** Serial `for...of` + await; parallel `Promise.all`/`allSettled`; always handle errors on the combined Promise.

3. **Spoken:** Rejected Promise with no handler — Node can warn/crash; apps fail silently.  
   **Follow-ups:** `try/catch` in async handlers or `.catch`; intentional background work still gets `.catch(log)`.

4. **Spoken:** Debounce after quiet (search); throttle during continuous events (scroll) — reduce concurrent starts.  
   **Follow-ups:** They reduce races but don’t replace abort/ignore-stale for slow late responses.

5. **Spoken:** Pass `AbortController.signal` to `fetch`; call `abort()` on new search/unmount.  
   **Follow-ups:** Awaited fetch rejects with `AbortError`; catch and ignore abort; function can return/continue without treating it as failure.

---

## Connections

1. **Many Promises settle as host work completes; event loop runs handlers in ready order.** Without a “still current?” check, a late microtask/macrotask from an old request mutates state after a newer one.

2. **A `let id` / ref closed over by the async continuation** still refers to the same binding after `await` — compare to `latest` / ref updated by newer calls to decide whether to commit.

3. **Async/await unit:** too serial → slow. **This unit:** too much uncoordinated overlap → stale UI / overload. Same tools (`all`, await), different coordination need (start together vs latest-wins/cancel).

4. **Effect cleanup sets cancelled/aborts** so when deps change, the previous generation’s result is ignored or I/O stopped — same “only latest is valid” idea as AbortController on search.

5. **You didn’t await/combine the Promises before responding** — fire-and-forget from `forEach(async)`; settlement and errors unbound from the request lifecycle (unhandled rejection + premature success response).
