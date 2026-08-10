# 05. Concurrency pitfalls in real apps

> Source: `interview-prep/typescript-javascript/02-async-event-loop.md`

### Topics to learn
- [ ] Race conditions from out-of-order async responses (stale response overwriting fresh state)
- [ ] Unhandled Promise rejections and why they matter (process crash in Node with strict flags, silent failures in browsers/RN)
- [ ] Cancellation: `AbortController` for `fetch`, manual "ignore stale response" flags in React effects
- [ ] Debounce vs throttle as concurrency-shaping tools, not just "performance tricks"
- [ ] Why `.forEach` cannot `await` correctly (it ignores returned Promises entirely)

### Race condition: stale response wins

```js
// BUG: if the user types "a" then quickly "ab", the "a" response might arrive
// AFTER the "ab" response, overwriting the correct result with stale data.
function onSearchChange(query) {
  fetchResults(query).then(results => setResults(results));
}
```

Fix patterns:
- **Ignore-stale-response flag**: capture a request id/ref, only apply the response if it matches the latest request.
- **`AbortController`**: cancel the previous in-flight request when a new one starts.

```js
let currentController;

async function onSearchChange(query) {
  currentController?.abort();
  currentController = new AbortController();
  try {
    const res = await fetch(`/search?q=${query}`, { signal: currentController.signal });
    setResults(await res.json());
  } catch (err) {
    if (err.name !== 'AbortError') throw err;
  }
}
```

This exact pattern is what React Query / SWR / RTK Query automate for you - knowing the manual version proves you understand *why* those libraries exist, not just that you can install them.

### `.forEach` does not await

```js
// BUG: forEach doesn't wait for the async callback's Promise - it fires all
// callbacks immediately and ignores the returned Promises entirely.
items.forEach(async (item) => {
  await save(item);
});
console.log('done'); // logs before any save() actually resolves
```

Fix: use a `for...of` loop with `await` inside (sequential), or `Promise.all(items.map(save))` (parallel), depending on whether order/concurrency matters.

### Unhandled rejections

```js
async function risky() {
  throw new Error('boom');
}
risky(); // no .catch(), no try/catch around a caller await
// -> "UnhandledPromiseRejection" - silently swallowed in some environments,
//    can crash a Node process depending on version/flags, and is a top source
//    of "it fails silently in production" bugs.
```

**Rule of thumb:** every Promise you create or call should end up either `await`-ed inside a `try/catch`, or have an explicit `.catch()` attached - "fire and forget" async calls are a code smell unless deliberately and visibly chosen (and even then, attach a `.catch(logError)`).

### Interview question

**Q: A user types quickly in a search box and occasionally sees results for an earlier, shorter query flash in after the correct results. What's happening and how do you fix it?**

**Strong answer:**
> "That's a classic race condition - multiple requests are in flight, and network timing doesn't guarantee they resolve in the order they were sent, so an older request's response can arrive after a newer one and overwrite it. I'd fix it either by tracking a request id or ref and only committing a response if it matches the latest request issued, or more cleanly with `AbortController`, cancelling the previous in-flight fetch whenever a new search starts. This is exactly the problem libraries like React Query solve automatically via query keys and cancellation."

---
