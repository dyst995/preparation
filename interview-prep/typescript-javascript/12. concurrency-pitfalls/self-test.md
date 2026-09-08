# Concurrency Pitfalls in Real Apps — Self-test

## Core recall

1. What is an async response race in a single-threaded UI app?
2. Name two fix patterns for stale search responses.
3. What does `AbortController` do for `fetch`?
4. What is an unhandled Promise rejection?
5. Why doesn’t `forEach` + `async` wait for async work?
6. How do you wait for all item saves in parallel? Sequentially?
7. Debounce vs throttle — one sentence each, with a typical use case.
8. Why do data-fetching libraries bother with cancellation / query keys?

## Explain why

1. Why can an earlier fetch overwrite a later one even though JS has one call stack?
2. Why is a cancelled-flag fix not the same as aborting the request?
3. Why is fire-and-forget `async` in an event handler dangerous?
4. Why does `items.forEach(async ...)` log `"done"` too early?
5. Why does debouncing search input reduce race likelihood?
6. Why must `AbortError` often be special-cased in `catch`?

## Compare and contrast

1. Ignore-stale (generation id) vs `AbortController`.
2. Debounce vs throttle for shaping async starts.
3. `forEach(async fn)` vs `for...of` + `await` vs `Promise.all(map)`.
4. Unhandled rejection vs a rejection caught mid-chain and recovered.
5. Accidental sequential awaits (perf) vs uncontrolled parallel requests (races) — different bugs, both concurrency-related.
6. Effect cleanup cancel flag vs global `let latest` outside React.

## Predict the output / behavior

Explain what goes wrong or what logs **and why**.

1.
```js
let n = 0;
function search(q) {
  const id = ++n;
  fetchResults(q).then((r) => {
    console.log('apply', q, 'id', id, 'latest', n);
  });
}
search('a');
search('ab');
// Assume "ab" returns before "a". What gets applied if there is no id check?
// What if the then body only applies when id === n?
```

2.
```js
items.forEach(async (item) => {
  await save(item);
  console.log('saved', item);
});
console.log('done');
```

3.
```js
async function onClick() {
  throw new Error('fail');
}
button.onclick = onClick; // no try/catch wrapper
```

4.
```js
const c1 = new AbortController();
fetch(url, { signal: c1.signal }).catch((e) => console.log(e.name));
c1.abort();
```

5.
```js
// Debounced search: user types "h","he","hel","help" within 100ms; debounce 300ms
// How many fetches ideally start?
```

## Debugging

1. Diagnose the flash of old results (search). Propose two fixes.

2. Diagnose:
```js
useEffect(() => {
  fetchUser(id).then(setUser);
}, [id]);
// Fast id changes show wrong user briefly / warnings on unmounted setState
```

3. Diagnose Nest-ish:
```js
app.post('/import', async (req, res) => {
  items.forEach(async (item) => {
    await importOne(item);
  });
  res.send({ ok: true });
});
```

4. Diagnose:
```js
autosave(doc); // returns Promise, no catch
// process crashed overnight with unhandledRejection
```

5. Product wants search to feel snappy but server rate-limits. Debounce alone still storms on slow networks. What else do you add?

## Application

1. Implement `createLatestOnlySearcher(fetchFn)` that uses a generation counter (no abort).

2. Implement the same with `AbortController`, ignoring `AbortError`.

3. Rewrite `forEach` saves to (a) sequential and (b) parallel forms.

4. Write a minimal `debounce(fn, ms)` and show how you’d debounce `onSearchChange` so fetches start only after quiet time.

5. Sketch React `useEffect` loading `userId` with cleanup that aborts fetch.

## Interview questions

1. Search box shows stale results after fast typing — what’s wrong and how do you fix it?  
   **Follow-ups:** Abort vs ignore-stale? What do React Query / SWR do?

2. Why is `array.forEach(async ...)` a bug?  
   **Follow-ups:** Fixes for serial vs parallel? Error handling?

3. What is an unhandled Promise rejection and why do Node teams care?  
   **Follow-ups:** How do you structure event-handler async code?

4. Debounce vs throttle — when for async concurrency?  
   **Follow-ups:** Do they replace cancellation?

5. How do you cancel an in-flight `fetch`?  
   **Follow-ups:** What happens to the awaiting `async` function?

## Connections

1. How do Promise settlement order and the event loop combine to create UI races?
2. How do closures/refs carry “latest request id” across awaits?
3. How does this unit’s uncontrolled parallelism differ from the accidental sequential-await bug in the async/await unit?
4. Why does effect cleanup connect to the same “ignore stale” idea as AbortController?
5. When a Nest handler returns before `forEach` async work finishes, which Promise rules did you violate?
