# `async` / `await` — Self-test

## Core recall

1. What does an `async function` always return?
2. Does `await` block the JavaScript thread? What does it pause?
3. When the awaited Promise settles, how does the rest of the function get scheduled?
4. What kinds of failures does `try/catch` around `await` catch?
5. What is the accidental sequential await bug?
6. How do you await multiple independent operations concurrently?
7. What is `for await...of` for (one sentence)?
8. Where is top-level `await` allowed?

## Explain why

1. Why can other timers and handlers run while an `async` function is “stuck” on `await`?
2. Why does `console.log` after calling an async function often run before lines after that function’s `await`?
3. Why is `await fetchA(); await fetchB();` slower than `Promise.all` when A and B are independent?
4. Why does `try/catch` work naturally with `await` but feel awkward with long `.then` chains?
5. Why does returning a Promise from an `async` function not create `Promise<Promise<T>>` for the caller?
6. Why can code after an `await` still freeze the UI if it does heavy sync work?

## Compare and contrast

1. `async/await` vs raw `.then` chains (readability, errors, identical runtime model?).
2. Sequential `await` in a loop vs `Promise.all` over a mapped array.
3. `await promise` vs `promise.then(...)` for a single continuation.
4. `for await...of` vs `for...of` over an array of Promises.
5. Top-level `await` in ESM vs wrapping `async` main in CJS/scripts.
6. Suspending at `await` vs blocking in a sync `while` loop.

## Predict the output

State the order / outcome **and explain why**.

1.
```js
async function f() {
  return 1;
}
console.log(f());
```

2.
```js
async function f() {
  console.log('1');
  await Promise.resolve();
  console.log('2');
}
console.log('a');
f();
console.log('b');
```

3.
```js
async function f() {
  console.log('1');
  await 0;
  console.log('2');
}
f();
console.log('3');
```

4.
```js
async function f() {
  await Promise.reject(new Error('x'));
  console.log('after');
}
f()
  .then(() => console.log('ok'))
  .catch((e) => console.log('catch', e.message));
```

5.
```js
async function f() {
  try {
    await Promise.reject(new Error('x'));
  } catch (e) {
    console.log('caught');
  }
  console.log('continue');
}
f();
```

6.
```js
setTimeout(() => console.log('t'), 0);
async function f() {
  console.log('f1');
  await Promise.resolve();
  console.log('f2');
}
f();
console.log('s');
```

7.
```js
async function load() {
  const a = await Promise.resolve('A');
  const b = await Promise.resolve('B');
  return a + b;
}
load().then(console.log);
```

8.
```js
async function load() {
  const ap = Promise.resolve('A');
  const bp = Promise.resolve('B');
  return (await ap) + (await bp);
}
// Compared to sequential awaits that *start* late — what work is already running here?
load().then(console.log);
```

## Debugging

1. Diagnose and fix:
```js
async function loadDashboard() {
  const user = await fetchUser();
  const settings = await fetchSettings();
  return { user, settings };
}
```
(Independent fetches.)

2. Diagnose:
```js
async function loadAll(ids) {
  const results = [];
  for (const id of ids) {
    results.push(await fetchItem(id));
  }
  return results;
}
```
When is this correct? When not? Show the parallel fix.

3. Diagnose:
```js
async function save() {
  try {
    await api.save(data);
  } catch (e) {
    console.log(e);
  }
}
save();
toast('Saved!'); // always runs immediately after calling save
```
Why is the toast wrong? Fix ordering.

4. Diagnose:
```js
button.onclick = async () => {
  await submit();
};
// errors show as UnhandledPromiseRejection / noisy console
```
How should errors be handled at the edge?

## Application

1. Rewrite this `.then` chain as `async/await` with `try/catch`:
```js
function load(id) {
  return fetchUser(id)
    .then((u) => fetchOrders(u.id).then((o) => ({ u, o })))
    .catch((e) => {
      log(e);
      throw e;
    });
}
```

2. Write `loadDashboard` three ways: sequential awaits (bad), `Promise.all`, and “start both then await” without `all`.

3. Implement `mapPool(items, limit, worker)` sketch (even pseudocode) that keeps at most `limit` concurrent awaits — explain when you’d use it instead of bare `Promise.all`.

4. Write a small async iterable consumer with `for await...of` (can be fake async generator) and contrast with `Promise.all` on a fixed array.

## Interview questions

1. Does `await` block the JavaScript thread?  
   **Follow-ups:** What runs while awaiting? How does resume get scheduled?

2. What’s wrong with awaiting in a `for` loop over independent IDs?  
   **Follow-ups:** Fix? What if you need concurrency limits?

3. How does `async/await` relate to Promises?  
   **Follow-ups:** Desugar a two-await function. What does `async` return on `throw`?

4. How do you handle errors with `async/await`?  
   **Follow-ups:** `finally`? Compare to `.catch`.

5. When is sequential await correct?  
   **Follow-ups:** Dependent pagination example.

## Connections

1. How does `await` resume connect to the microtask queue in the event-loop unit?
2. How do `Promise.all` / `allSettled` from the Promises unit compose with `async` functions?
3. How does “await doesn’t block” still allow blocking after resume (single-threaded unit)?
4. Why can stale closures in an `async` React handler still show old state after `await`?
5. When Nest service methods `await` multiple repos one-by-one, which unit’s bug is that — and what’s the fix pattern?
