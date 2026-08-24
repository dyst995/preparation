# `async` / `await`

## What you need to know

`async`/`await` is **syntax over Promises**. It does not add a second thread or a new settlement model. It makes async control flow read like synchronous code while still **yielding** to the event loop at each `await`.

You must be able to:

- State that an `async function` **always returns a Promise**.
- Explain that `await` **does not block the JS thread**.
- Desugar simple `await` to `.then` and place resumptions on the **microtask** queue.
- Use `try/catch/finally` around `await`.
- Spot and fix **accidental sequential awaits** (the #1 performance bug).
- Have awareness of `for await...of` and **top-level await**.

Prerequisites: [Promises](../promises/notes.md), [Event loop](../event-loop/notes.md), [Single-threaded](../single-threaded/notes.md).

---

## What `async` does

### Always returns a Promise

```js
async function ok() {
  return 1;
}
ok(); // Promise<fulfilled: 1>

async function fails() {
  throw new Error('x');
}
fails(); // Promise<rejected: Error('x')>
```

Even with a plain `return`, callers get a Promise. Returning an already-built Promise **adopts** it (same flattening idea as `Promise.resolve`):

```js
async function wrap() {
  return Promise.resolve(2);
}
// callers still get a Promise that fulfills with 2 (not Promise<Promise<number>>)
```

### Forms

```js
async function f() {}
const g = async () => {};
const obj = { async m() {} };
class C {
  async m() {}
}
```

Only `async` functions (and modules with top-level await) may use `await` as a keyword pause point. Using `await` in a non-async function is a syntax error (except special contexts like some REPL/module top-level cases).

---

## What `await` does

### Pauses the async function, not the thread

**Interview answer (preserved):**

> No — `await` does not block the JavaScript thread. It pauses the current `async` function and returns control to the caller / event loop so other code can run. When the awaited Promise settles, the rest of the function is scheduled as a **microtask** and resumes. It looks synchronous in source, but it never blocks like a busy `while` loop.

```js
async function f() {
  console.log('f1');
  await Promise.resolve();
  console.log('f2');
}

console.log('a');
f();
console.log('b');
// a, f1, b, f2
```

Causal chain:

1. `f()` starts; runs sync until `await` → logs `f1`.
2. `await` suspends `f`; `f()` has already returned a Promise to the caller.
3. Sync caller continues → logs `b`.
4. After current stack clears, microtasks run → `f` resumes → logs `f2`.

### `await` on non-Promises

`await x` wraps non-Promises roughly like `Promise.resolve(x)` — you still get an async pause/resume (microtask), even for plain values:

```js
async function f() {
  console.log(1);
  await 0;
  console.log(2);
}
f();
console.log(3);
// 1, 3, 2
```

### Rejection / throw

`await rejectedPromise` throws at the await expression (inside the async function), which rejects the async function’s Promise unless caught.

```js
async function f() {
  await Promise.reject(new Error('no'));
}
f().catch((e) => console.log(e.message)); // 'no'
```

---

## Sugar over Promises (preserved)

```js
async function getUser(id) {
  const res = await fetch(`/users/${id}`);
  const user = await res.json();
  return user;
}

// Roughly desugars to:
function getUser(id) {
  return fetch(`/users/${id}`)
    .then((res) => res.json())
    .then((user) => user);
}
```

Each `await` is a suspension point: the remainder becomes a continuation (like `.then`). That is why readability improves and why **native `try/catch`** works across those steps.

Desugaring is pedagogical — engines optimize — but the observable model (Promise return + microtask resume) is what interviews test.

---

## Error handling with `try` / `catch` / `finally`

```js
async function safeLoad() {
  try {
    const data = await fetchData();
    return data;
  } catch (err) {
    // rejects from await OR sync throws in the try body
    logError(err);
    throw err; // reject safeLoad's Promise if caller must know
  } finally {
    setLoading(false);
  }
}
```

### Why this is the ergonomic win

Multi-step branching with `.then/.catch` gets noisy. `try/catch` keeps one control-flow style for sync and async failures in an `async` function.

### Patterns

| Goal | Pattern |
|---|---|
| Handle and recover | `catch` return fallback |
| Handle and fail outward | `catch` log + `throw` |
| Cleanup always | `finally` |
| Caller handles | omit catch; let async Promise reject |

Unhandled rejection still applies if the returned Promise rejects and nobody `await`s/`.catch`es it.

---

## Sequential vs parallel await (#1 real bug)

### Accidental serialization (preserved)

```js
// BAD — sequential, ~2× slower when independent
async function loadDashboard() {
  const user = await fetchUser();
  const settings = await fetchSettings();
  return { user, settings };
}

// GOOD — both start immediately
async function loadDashboard() {
  const [user, settings] = await Promise.all([fetchUser(), fetchSettings()]);
  return { user, settings };
}
```

Rule: **if B does not need A’s result, do not `await A` before starting B.**

Start work first, then await:

```js
async function loadDashboard() {
  const userP = fetchUser();
  const settingsP = fetchSettings();
  return { user: await userP, settings: await settingsP };
  // or Promise.all as above
}
```

### Loop of awaits (preserved interview)

```js
async function loadAll(ids) {
  const results = [];
  for (const id of ids) {
    const item = await fetchItem(id); // serial
    results.push(item);
  }
  return results;
}
```

**Strong answer (preserved):**

> Each `fetchItem` waits for the previous to finish, so N independent requests take roughly N times longer. Use `await Promise.all(ids.map(fetchItem))`. If you fear overload, use a concurrency-limited pool — not full serial by default, and not always unbounded parallel.

When serial **is** correct: each step needs the previous result (cursor pagination, dependent IDs, rate-limit “one at a time” by policy).

### Combinators still matter

`async/await` does not replace `Promise.all` / `allSettled` / `race` / `any`. It composes with them:

```js
const settled = await Promise.allSettled([fetchA(), fetchB()]);
```

---

## Predicting interleaving (method)

1. Run sync code until an `await` (or function end).
2. At `await`, schedule resume as microtask when the awaited Promise settles; continue the **caller**.
3. After stack empty, drain microtasks (resumes, `.then`, etc.) before next macrotask.

```js
// What happens here?
async function x() {
  console.log('x1');
  await Promise.resolve();
  console.log('x2');
  await Promise.resolve();
  console.log('x3');
}
console.log('s1');
x();
console.log('s2');
// s1, x1, s2, x2, x3
```

Both resumes are microtasks; no macrotask involved here.

```js
async function x() {
  console.log('x1');
  await Promise.resolve();
  console.log('x2');
}
setTimeout(() => console.log('t'), 0);
x();
console.log('s');
// x1, s, x2, t
```

---

## `for await...of` (awareness)

Iterates **async iterables** (objects with `Symbol.asyncIterator`), awaiting each produced Promise/value.

```js
for await (const chunk of asyncStream) {
  process(chunk);
}
```

Use when the source is naturally streaming/async. Do **not** confuse with a normal `for...of` over an array of Promises (that does not await items unless you `await` inside or use `Promise.all`).

```js
// This does NOT wait for fetches:
for (const p of ids.map(fetchItem)) {
  /* p is a Promise */
}

// Serial await each:
for (const id of ids) {
  await fetchItem(id);
}

// Parallel:
await Promise.all(ids.map(fetchItem));
```

---

## Top-level `await` (awareness)

In **ES modules** (supporting environments / bundlers):

```js
// module.mjs
const config = await loadConfig();
export { config };
```

- Module evaluation waits on that await; importers wait on the module graph.
- Not available in classic scripts / plain CJS without wrapping.
- Nest/TS projects: depends on module target and runtime — same caution as the modules unit.

---

## `async` vs returning Promises manually

```js
function getUser(id) {
  return fetch(`/users/${id}`).then((r) => r.json());
}

async function getUser(id) {
  const r = await fetch(`/users/${id}`);
  return r.json();
}
```

Both return Promises. Prefer `async/await` when there is branching, multiple steps, or try/catch clarity. Thin wrappers can stay as `.then` chains.

**Anti-pattern:** `async` function that only returns a Promise with no await — usually needless (harmless but noisy), unless you want automatic wrapping of throws.

---

## Common mistakes and misconceptions

1. **“`await` blocks the thread.”** Suspends only the async function.
2. **Forgetting `async` functions return Promises** — calling without `await`/`.then` races ahead.
3. **Sequential awaits for independent I/O** — silent latency bug.
4. **`for...of` + `await` when parallel was intended.**
5. **Assuming `await Promise.all` cancels peers on first failure** — same as Promises unit; fails fast on the combined Promise only.
6. **Empty catch** that swallows errors and returns `undefined` unintentionally.
7. **Mixing**: sync heavy CPU after `await` still blocks the thread once resumed.
8. **Thinking `for await` parallelizes** — it pulls one at a time from the async iterator.

---

## Connections to other concepts

```
async function
  → always Promise
    → same states / combinators as Promises unit

await
  → suspend function, yield to caller
    → resume as microtask when settled
      → event loop ordering vs setTimeout

try/catch around await
  → rejection becomes throw at await
    → same propagation story as .catch, clearer branches

independent awaits
  → start all then Promise.all
    → overlap host waiting, still one JS thread
```

Closures: variables across `await` points remain the same bindings (live), which is why stale React state in async handlers is still a closure/generation issue, not an await bug.

---

## Interview perspective

You should be able to:

1. Say “sugar over Promises” and show a mini desugar.
2. Prove with a log order that await doesn’t block the thread.
3. Fix sequential dashboard/loop fetches with `Promise.all` and mention concurrency limits.
4. Use try/catch/finally correctly around await.
5. Classify when serial await is required vs accidental.

One-liner:

> `async/await` pauses the function and schedules the rest as a microtask when the Promise settles — readable sync style, same single-threaded event loop.

---

# Self-test

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
