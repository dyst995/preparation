# 04. async/await

> Source: `interview-prep/typescript-javascript/02-async-event-loop.md`

### Topics to learn
- [ ] `async function` always returns a Promise, even if you `return` a plain value
- [ ] `await` pauses the `async` function's execution and yields control back to the caller - it does NOT block the thread
- [ ] Under the hood, `await` is sugar over `.then()` - the rest of the function becomes a microtask callback
- [ ] `try/catch` around `await` catches rejected Promises the same way it catches thrown synchronous errors
- [ ] Sequential vs parallel `await` - the #1 real-world performance bug
- [ ] `for await...of` for async iterables (awareness level)
- [ ] Top-level `await` (module-level, awareness of environment support)

### `async`/`await` is sugar over Promises

```js
async function getUser(id) {
  const res = await fetch(`/users/${id}`);
  const user = await res.json();
  return user;
}

// Roughly desugars to:
function getUser(id) {
  return fetch(`/users/${id}`)
    .then(res => res.json())
    .then(user => user);
}
```

Every `await` point is a place where the function suspends and control returns to the event loop; when the awaited Promise settles, the rest of the function body resumes as a **microtask**. This is why `async/await` doesn't block other code from running - it's just chained `.then()` calls with better readability and native `try/catch` support.

### The #1 real bug: accidental sequential awaits

```js
// BAD - sequential, ~2x slower than necessary
async function loadDashboard() {
  const user = await fetchUser();       // waits fully...
  const settings = await fetchSettings(); // ...before even starting this one
  return { user, settings };
}

// GOOD - parallel, both requests start immediately
async function loadDashboard() {
  const [user, settings] = await Promise.all([fetchUser(), fetchSettings()]);
  return { user, settings };
}
```

If the second request doesn't depend on the first request's result, awaiting them one at a time serializes two independent network calls for no reason. This is a frequent, easy-to-miss performance issue in real codebases (React data-fetching, NestJS service methods that call multiple independent repositories/APIs).

### Error handling with `async/await`

```js
async function safeLoad() {
  try {
    const data = await fetchData();
    return data;
  } catch (err) {
    // catches: fetch() rejecting, OR any synchronous throw in this try block
    logError(err);
    throw err; // re-throw if the caller needs to know
  } finally {
    setLoading(false); // always runs, success or failure
  }
}
```

`try/catch` around `await` works exactly like synchronous error handling, which is the main ergonomic win over raw `.then()/.catch()` chains for multi-step logic with branching.

### Interview question

**Q: Does `await` block the JavaScript thread while waiting?**

**Strong answer:**
> "No. `await` pauses execution of the current `async` function and immediately returns control to the caller / event loop - other code, other timers, other event handlers can run in the meantime. When the awaited Promise settles, the remainder of the function is scheduled as a microtask and resumes from where it left off. It *looks* synchronous in the code, but it never blocks the thread the way a synchronous loop would."

### Interview question

**Q: What's wrong with this, and how would you fix it?**

```js
async function loadAll(ids) {
  const results = [];
  for (const id of ids) {
    const item = await fetchItem(id);
    results.push(item);
  }
  return results;
}
```

**Strong answer:**
> "Each `fetchItem` call waits for the previous one to fully finish before starting the next, so N independent requests take N times as long as they need to. Since the fetches don't depend on each other, I'd map to an array of Promises and `Promise.all` them: `const results = await Promise.all(ids.map(fetchItem));`. If there were a concern about overwhelming the server with too many concurrent requests, I'd consider a concurrency-limited batch approach instead of full sequential or full parallel."

---
