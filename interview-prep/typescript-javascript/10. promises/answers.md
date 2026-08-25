# Promises — Answers

## Core recall

1. **Pending, fulfilled, rejected.** Settled = fulfilled or rejected (outcome fixed; left `pending`).

2. **No.** Settlement is one-way and immutable; further `resolve`/`reject` are ignored.

3. **A new Promise.** That return value is what enables chaining.

4. **The Promise returned by that `.then` rejects** with the thrown value. Downstream fulfillment handlers are skipped until a rejection handler.

5. **The outer chain adopts the inner Promise’s settlement.** The next `.then` gets the inner fulfillment value (or rejection), not a nested `Promise`.

6. **`all`:** all fulfill → values array; any reject → fail fast. **`allSettled`:** always fulfills with every outcome. **`race`:** first settlement (fulfill or reject) wins. **`any`:** first fulfill wins; all reject → `AggregateError`.

7. **Cleanup on either outcome** (spinner, lock). Passes original value/reason through unless `finally` itself throws/rejects.

8. **Handlers are microtasks; `setTimeout(0)` is a macrotask.** After the current stack: drain microtasks (Promise reactions) before the timer callback.

---

## Explain why

1. **One rejection path propagates down the chain** instead of every nested callback checking `err`. Composition (`all`, etc.) and recovery mid-chain are standardized.

2. **`all`’s contract is “everything succeeded.”** One failure means the combined result is invalid for that policy, even if siblings already fulfilled — fail-fast matches “all or nothing.”

3. **You need every outcome, success or failure**, to render what arrived and fallback the rest. `all` would discard successful branches when one rejects.

4. **`race` takes the first settlement, including rejection.** A fast failure beats a slow success — not “first success.” Use `any` for success-biased racing.

5. **Handlers attached later still schedule as microtasks** with the already-settled result. Settlement is immutable; reaction attachment is not “too late.”

6. **A `.catch` that returns a value fulfills the next link** — it recovered. Error propagation stops; later `.then(onFulfilled)` runs with that value.

---

## Compare and contrast

1. **`all`:** fail-fast on first rejection; result is values or one error. **`allSettled`:** never rejects for child failure; array of `{status, value|reason}` so you handle partial failure yourself.

2. **`race`:** first settle wins (fulfill *or* reject). **`any`:** first fulfill wins; ignores rejections until all fail (`AggregateError`).

3. **Two-arg `.then(f, r)`:** rejection of the *source* goes to `r`; if `f` throws, that rejection is **not** handled by the same `.then`’s `r`. **`.then(f).catch(r)`:** `catch` also handles throws/rejections from `f`. Prefer separate `.catch` when you want mid-chain errors from the success path covered.

4. **Both end up fulfilled with `value` (or adopt if thenable).** `Promise.resolve` is the short path and always flattens thenables the same way; `new Promise(r => r(value))` is more verbose with the same adoption rules when you `resolve` a thenable.

5. **Same chain outcome: rejection.** Difference is source syntax — `throw` in a handler vs returning/`reject`ing. Handlers see a rejected Promise either way.

6. **Combinators overlap host waiting** (network, timers) on one JS thread. They do not run JS callbacks in parallel CPU threads — reactions still serialize on the event loop.

---

## Predict the output

1. **Logs `2`.** `1 → 1+1 → 2`; last `.then` logs fulfillment value.

2. **Logs `caught x`.** Throw rejects the next Promise; the middle `.then` is skipped; `.catch` handles it.

3. **Logs `fixed`.** `.catch` recovers by returning a string → next `.then` fulfills with that value.

4. **Logs `2`.** Returning `Promise.resolve(n+1)` flattens; next handler gets `2`, not a Promise.

5. **Logs `all err e`.** `Promise.all` fail-fast: one rejection rejects the whole `all`.

6. **Logs `['fulfilled', 'rejected']` (order preserved).** `allSettled` waits for both and reports statuses; does not reject.

7. **Logs `fast fail`.** Rejected Promise settles immediately; `race` takes that rejection before the slow timer fulfills.

8. **Logs `b`.** `any` ignores the rejection and takes the first fulfillment.

9. **`A`, `C`, then `B`.** Sync logs first; `.then` is a microtask after the stack clears.

10. **`F` then `x`.** `finally` runs for cleanup; original fulfillment value `x` still flows to `.then` (assuming `finally` doesn’t throw/reject).

---

## Debugging

1. **Missing rejection handler.** If `getUser` (or `getOrders`) rejects and nothing `.catch`es / second-arg handles it, you get `UnhandledPromiseRejection`. **Fix:** end with `.catch(handle)` (or try/catch via async/await).

2. **Wrong combinator: `all` drops success on one failure.** **Fix:** `Promise.allSettled([fetchProfile(), fetchSettings()])`, then map fulfilled → data / rejected → fallback so profile can still render.

3. **Nested `.then` without return — outer chain doesn’t wait / flatten.** Inner `getThing()` Promise is orphaned from the outer chain. **Fix:** `return getThing()` (or `return getThing().then(...)`) so flattening ties them together.

4. **Timeout path fulfills with `'timeout'` string** — looks like success; fetch rejection vs timeout are hard to tell apart. **Redesign:** timeout branch should `reject(new Error('timeout'))` (or a typed error), and optionally distinguish `AbortError` / timeout vs network errors in `catch`.

---

## Application

1.
```js
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```
Why: executor schedules macrotask; Promise fulfills when timer fires.

2.
```js
function withTimeout(promise, ms) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('timeout')), ms)
  );
  return Promise.race([promise, timeout]);
}
```
Why: first settlement wins; timeout rejects so callers see failure, not a fake success value.

3.
```js
async function loadDashboard() {
  const [u, s] = await Promise.allSettled([fetchUser(), fetchSettings()]);
  return {
    user: u.status === 'fulfilled' ? u.value : null,
    settings: s.status === 'fulfilled' ? s.value : null,
  };
}
```
Why: need both outcomes for partial UI; `all` would lose the good branch.

4.
```js
function loadUserOrders(id) {
  return getUser(id).then((user) =>
    getOrders(user.id).then((orders) => ({ user, orders }))
  );
}
// or: getUser(id).then(async (user) => ({ user, orders: await getOrders(user.id) }))
```
Why: return inner Promises so errors propagate and nesting flattens.

5.
```js
function mapInParallel(urls, fetchFn) {
  return Promise.all(urls.map((url) => fetchFn(url)));
}
```
Use **`allSettled`** when any failure shouldn’t discard siblings (partial dashboards, best-effort batch). Use **`all`** when one failure invalidates the whole result.

---

## Interview questions

1. **Spoken:** A Promise is an object for eventual success or failure of async work. States: pending → fulfilled or rejected (settled once).  
   **Follow-ups:** Cannot settle twice — later resolve/reject ignored. Resolving with another Promise/thenable **adopts** that Promise (flatten).

2. **Spoken:** Each `.then`/`.catch` returns a new Promise; returned values fulfill the next link; `throw` or returned rejection propagates like try/catch until a handler recovers.  
   **Follow-ups:** `p.then(() => { throw new Error('x') }).catch(e => …)` — throw rejects the `.then`’s Promise; `catch` runs.

3. **Spoken:** Match failure policy: `all` all-must-succeed fail-fast; `allSettled` collect all outcomes; `race` first settle; `any` first success.  
   **Follow-ups:** Partial UI → `allSettled`. Timeout → `race` with rejecting timer. First mirror → `any`.

4. **Spoken:** If `finally` succeeds, original fulfillment value or rejection reason continues.  
   **Follow-ups:** If `finally` throws/rejects, that overrides and the chain rejects with the `finally` error.

5. **Spoken:** Promise reactions are microtasks — after current stack, before next macrotask like `setTimeout`.  
   **Follow-ups:** Typical order: sync → Promise `.then` → `setTimeout(0)`.

---

## Connections

1. **Settlement schedules `.then`/`.catch`/`.finally` on the microtask queue.** Event loop drains microtasks before the next macrotask — that is why they beat `setTimeout(0)`.

2. **Rejection skips fulfillment-only links until a catch/recover**, like an exception skipping to `catch`. Recovering (return a value) resumes the “happy” path; rethrowing continues failure.

3. **`async/await` is syntax over the same Promises** — same states, combinators, and microtask resumes. No new runtime settlement model.

4. **`all` starts overlapping host waits; callbacks still run one-at-a-time on one JS stack.** Parallelism is I/O wait overlap, not multi-threaded JS execution.

5. **Pending:** never settled — wait/instrument. **Rejected without catch:** unhandled rejection — add `.catch`/await. **Scheduled but “wrong order”:** microtask vs macrotask confusion — check sync/`then`/`setTimeout` ordering, not “then broken.”
