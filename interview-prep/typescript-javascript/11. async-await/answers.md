# `async` / `await` — Answers

## Core recall

1. **Always a Promise** — even for a plain `return` or a throw (rejected Promise).

2. **No.** It pauses only the current `async` function and yields to the caller/event loop. The JS thread is not blocked.

3. **As a microtask continuation** when the awaited Promise settles — the remainder of the function resumes after the current stack clears (microtask drain).

4. **Rejected awaited Promises (thrown at `await`) and sync throws inside the `try` body.**

5. **Awaiting independent I/O one after another** so the second doesn’t start until the first finishes — unnecessary latency.

6. **Start all work, then `await Promise.all([...])`** (or start Promises first, then await each / `all`).

7. **Iterate an async iterable, awaiting each yielded value/Promise in turn.**

8. **ES modules** in supporting environments/bundlers — not classic scripts / plain CJS without wrapping.

---

## Explain why

1. **`await` suspends that function and returns control**; timers, other handlers, and microtasks can run on the same thread while the function is paused waiting for settlement.

2. **Calling `async f()` runs only until the first `await`, then returns a Promise immediately.** Sync code after the call continues; lines after `await` run later as a microtask resume.

3. **Sequential awaits start B only after A finishes**, so wall time ≈ sum. `Promise.all` starts both immediately — overlap host waiting; wall time ≈ max.

4. **`await` turns rejection into a throw at that expression**, so one `try/catch` covers multi-step async like sync code. Long `.then/.catch` chains need explicit handlers at each composition point and get noisy with branches.

5. **Returning a Promise adopts/flattens** (same idea as `Promise.resolve`) — callers see one Promise that settles with the inner value, not `Promise<Promise<T>>`.

6. **After resume, sync code runs on the JS thread again.** Heavy CPU after `await` still blocks the loop/UI until it finishes — await only paused waiting, it doesn’t move CPU off-thread.

---

## Compare and contrast

1. **Same runtime model (Promises + microtasks).** `async/await` wins on readability and `try/catch` across steps; raw `.then` is fine for thin pipelines. Prefer whichever keeps control flow clear.

2. **Loop + `await`:** serial, N× latency for independent work; correct when each step needs the previous. **`Promise.all(map)`:** all start together; use when independent (or add a concurrency pool if unbounded parallel is too heavy).

3. **`await`:** linear style inside `async`; rejection throws locally. **`.then`:** continuation style; compose without `async`. Observably both schedule continuations as microtasks on settlement.

4. **`for await...of`:** consumes an async iterable one value at a time. **`for...of` over Promises:** iterates Promise objects without awaiting unless you `await` inside — does not wait for fetches by itself.

5. **Top-level await (ESM):** module evaluation waits; importers wait on the graph. **CJS/scripts:** wrap in `async function main(){...}; main()` (and catch) — no bare top-level `await`.

6. **`await`:** cooperative pause; other JS can run. **`while` busy-loop:** occupies the stack/thread until done — freezes timers, handlers, UI.

---

## Predict the output

1. **Logs a Promise** (fulfilled with `1`, not the number `1`). `async` always wraps the return in a Promise.

2. **`a`, `1`, `b`, `2`.** Sync until first await logs `1`; caller continues (`b`); resume microtask logs `2`.

3. **`1`, `3`, `2`.** `await 0` still schedules an async pause/resume (like `Promise.resolve`); sync `3` runs before resume.

4. **Logs `catch x`.** Awaited rejection throws; rejects `f()`’s Promise; no `'after'` or `'ok'`.

5. **`caught` then `continue`.** `try/catch` handles the await throw; function continues; `f()` fulfills (implicit `undefined` unless returned).

6. **`f1`, `s`, `f2`, `t`.** Sync/`f` until await; stack clears; microtask resume `f2` before macrotask `t`.

7. **Logs `AB`.** Two sequential awaits on already-resolved Promises still chain microtask resumes; result concatenates.

8. **Also logs `AB`, but both Promises are created/started before either await.** Compared to `await fetchA(); await fetchB()` that *starts* late: here work is already in flight (for real I/O, both overlap). With `Promise.resolve`, settlement is immediate — the teaching point is “start then await,” not extra wall-clock vs sequential resolved awaits.

---

## Debugging

1. **Accidental sequential awaits** — settings wait for user. **Fix:**
```js
const [user, settings] = await Promise.all([fetchUser(), fetchSettings()]);
```
or start both then await.

2. **Correct** when each `fetchItem` needs the previous result (pagination, dependent IDs, intentional one-at-a-time). **Wrong** for independent IDs (N× slower). **Parallel fix:** `return Promise.all(ids.map(fetchItem));` (or a limited pool).

3. **`save()` returns a Promise; toast doesn’t await it** — toast runs immediately. **Fix:** `await save()` (in an async caller) or `save().then(() => toast('Saved!')).catch(...)`, and only toast on success.

4. **Async event handler rejection is often unhandled** — nothing catches the returned Promise. **Fix:** `try/catch` inside the handler (show UI error) or `.catch` on the call; never leave edge async bare.

---

## Application

1.
```js
async function load(id) {
  try {
    const u = await fetchUser(id);
    const o = await fetchOrders(u.id);
    return { u, o };
  } catch (e) {
    log(e);
    throw e;
  }
}
```

2.
```js
// sequential (bad if independent)
async function loadDashboard() {
  const user = await fetchUser();
  const settings = await fetchSettings();
  return { user, settings };
}

// Promise.all
async function loadDashboard() {
  const [user, settings] = await Promise.all([fetchUser(), fetchSettings()]);
  return { user, settings };
}

// start both, then await
async function loadDashboard() {
  const userP = fetchUser();
  const settingsP = fetchSettings();
  return { user: await userP, settings: await settingsP };
}
```

3. **Sketch:** keep a pool of at most `limit` running workers; when one finishes, start the next item until done; `await` until the queue drains. **Use vs bare `all`:** many items / rate limits / avoid stampeding the server or memory — bounded concurrency instead of unbounded parallel or full serial.

4.
```js
async function* fakeStream() {
  yield await Promise.resolve(1);
  yield await Promise.resolve(2);
}
for await (const chunk of fakeStream()) {
  process(chunk); // serial pull from async iterable
}
// vs fixed array: await Promise.all(items.map(worker)) — all in flight at once
```

---

## Interview questions

1. **Spoken:** No — `await` pauses the async function and yields to the event loop; other code can run. Resume is scheduled as a microtask when the Promise settles.  
   **Follow-ups:** Timers/handlers/other microtasks run while awaiting. Resume = microtask after settlement, not a blocking wait.

2. **Spoken:** Each iteration waits for the previous fetch — serial latency.  
   **Follow-ups:** `await Promise.all(ids.map(fetchItem))`. Need limits → concurrency pool, not default full serial or always unbounded parallel.

3. **Spoken:** Sugar over Promises — `async` always returns a Promise; `await` is suspension + `.then`-like continuation.  
   **Follow-ups:** Desugar two awaits to chained `.then`. `throw` / rejected await → async function’s Promise rejects.

4. **Spoken:** `try/catch/finally` around `await`; or let the Promise reject for the caller.  
   **Follow-ups:** `finally` for cleanup (loading flags). Same outcomes as `.catch`, clearer multi-step branches.

5. **Spoken:** When step N needs step N−1’s result (cursor pagination, dependent IDs, policy one-at-a-time).  
   **Follow-ups:** e.g. `let cursor; while (cursor) { page = await fetchPage(cursor); cursor = page.next; }`.

---

## Connections

1. **After settlement, the engine queues the async function’s continuation as a microtask** — same queue family as Promise `.then`, before the next macrotask.

2. **`await Promise.all` / `allSettled` / `race` / `any`** — combinators still define multi-Promise policy; `async` just awaits the combined Promise.

3. **Await doesn’t block waiting, but resumed sync work does.** Single-threaded: CPU after resume freezes other JS until done.

4. **`await` doesn’t snapshot closed-over bindings.** A React handler that closed over old `state`/`props` still sees those bindings after resume — classic stale closure / missing generation, not an await bug.

5. **Accidental sequential await (async/await unit).** Fix: start independent repo calls together with `Promise.all` (or start-then-await), unless order/dependence requires serial.
