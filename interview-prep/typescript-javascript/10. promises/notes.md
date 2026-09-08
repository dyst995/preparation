# Promises

## What you need to know

A **Promise** is an object representing the eventual success value or failure reason of an async operation. It lets you attach handlers that run later (as **microtasks**) instead of nesting callbacks.

You must be able to:

- Explain **pending → fulfilled | rejected** (settle once).
- Chain with `.then` / `.catch` / `.finally` and predict value/error flow.
- Choose among `all` / `allSettled` / `race` / `any`.
- Connect reactions to the **microtask queue** (event-loop unit).

Curriculum checklist this unit completes:

- Three states; settled Promises never change
- `.then` / `.catch` / `.finally`
- Chaining, propagation, flattening
- `Promise.resolve` / `Promise.reject`
- Combinators: `all`, `allSettled`, `race`, `any`
- Throws inside handlers become rejections

---

## What a Promise is

### Why Promises exist

Callback-style async:

```js
getUser(id, (err, user) => {
  if (err) return handle(err);
  getOrders(user.id, (err, orders) => { /* pyramid */ });
});
```

Problems: nesting, awkward error paths, no standard composition.

Promises give:

- A single object for “not done yet / ok / failed”
- Chainable handlers
- Standard combinators
- Integration with `async/await` (next unit)

### Mental model

```
pending ──fulfill(value)──► fulfilled
   │
   └──reject(reason)──────► rejected
```

Exactly **one** transition out of `pending`. After that, further `resolve`/`reject` calls are ignored.

---

## Creating and settling

### Executor

```js
const p = new Promise((resolve, reject) => {
  // runs synchronously when Promise is constructed
  doWork((err, value) => {
    if (err) reject(err);
    else resolve(value);
  });
});
```

- `resolve(x)` → fulfill with `x`, **or** adopt state if `x` is thenable/Promise (flatten).
- `reject(r)` → reject with reason `r`.
- Throw inside the executor → rejection.

```js
new Promise(() => {
  throw new Error('boom');
}).catch((e) => console.log(e.message)); // 'boom'
```

### `Promise.resolve` / `Promise.reject`

```js
Promise.resolve(1);           // already fulfilled with 1
Promise.resolve(otherPromise); // adopts otherPromise (flatten)
Promise.reject(new Error('x')); // already rejected
```

Use to wrap values or normalize “maybe Promise” APIs into a real Promise.

### Immutability of settlement (preserved)

Once fulfilled or rejected, the Promise is **immutable** in outcome. You cannot “re-resolve” to a new value. Handlers attached later still run (with the settled result), scheduled as microtasks.

---

## `.then`, `.catch`, `.finally`

### `.then(onFulfilled, onRejected)`

- Returns a **new** Promise (this is what makes chaining work).
- If the source fulfills, `onFulfilled` runs (microtask).
- If the source rejects and `onRejected` is provided, that runs instead.
- Missing handlers pass the outcome through to the returned Promise.

```js
p.then(
  (value) => {
    /* success */
  },
  (reason) => {
    /* failure — optional second arg */
  }
);
```

### `.catch(onRejected)`

Equivalent to `.then(undefined, onRejected)`. Prefer `.catch` for readability when you only handle errors.

### `.finally(onFinally)`

Runs on **either** fulfillment or rejection (for cleanup). The downstream Promise:

- Still fulfills with the **original** value if `onFinally` succeeds and doesn’t return a rejecting Promise.
- Rejects with the **original** reason if the source rejected (unless `onFinally` throws/rejects, which can override).

```js
fetch(url)
  .then(process)
  .finally(() => hideSpinner());
```

---

## Chaining, flattening, and propagation

### Values flow forward

```js
Promise.resolve(1)
  .then((n) => n + 1)
  .then((n) => n * 2)
  .then((n) => console.log(n)); // 4
```

Whatever you **return** from `onFulfilled` becomes the fulfillment value of the Promise returned by that `.then` (unless you return a Promise/thenable — see flattening).

### Returning a Promise flattens (preserved idea)

```js
Promise.resolve(1)
  .then((n) => {
    return Promise.resolve(n + 1); // flattened — next then gets 2, not a Promise
  })
  .then((n) => console.log(n)); // 2
```

You do **not** get nested `Promise<Promise<T>>` in the handler chain. Adoption waits for the inner Promise.

### Errors propagate like `try/catch` (preserved)

```js
fetchUser()
  .then((user) => {
    throw new Error('transform failed');
  })
  .then((user) => console.log(user)) // skipped — only onFulfilled
  .catch((err) => console.error(err)); // lands here
```

Rules:

- `throw` in a handler → returned Promise **rejects** with that error.
- Returning `Promise.reject(err)` → same.
- Rejection skips `.then` handlers that omit `onRejected`, until a `.catch` or `.then(..., onRejected)`.
- A handling `.catch` that recovers (returns a value) **fulfills** the next link — errors stop propagating.

```js
Promise.reject(new Error('x'))
  .catch(() => 'recovered')
  .then((v) => console.log(v)); // 'recovered'
```

### Sync throw vs async reject

Both become rejections of the chain. The difference is timing/source; handlers still see a rejection.

---

## Microtasks (connection, not a full event-loop redo)

Promise reactions (`.then` / `.catch` / `.finally` callbacks) run as **microtasks** after the current call stack clears, before the next macrotask (`setTimeout`, etc.).

```js
Promise.resolve().then(() => console.log('micro'));
setTimeout(() => console.log('macro'), 0);
console.log('sync');
// sync, micro, macro
```

Settlement is often async from the consumer’s point of view even when you `Promise.resolve(1)` — handlers still don’t run inline; they queue.

---

## Combinators

### Comparison table (preserved)

| Method | Resolves when | Rejects when | Result shape | Typical use |
|---|---|---|---|---|
| `Promise.all` | all fulfill | **any one** rejects (fails fast) | array of values, same order | “I need everything; any failure is fatal” |
| `Promise.allSettled` | always, once all settle | never (the allSettled Promise fulfills) | array of `{status, value/reason}` | “I need every outcome; handle failures myself” |
| `Promise.race` | first one **settles** (fulfill or reject) | first settlement is a rejection | that first value/reason | timeouts; first result wins |
| `Promise.any` | first one **fulfills** | **all** reject → `AggregateError` | first fulfilled value | “any success is enough” |

### `Promise.all`

```js
const [user, orders] = await Promise.all([fetchUser(), fetchOrders()]);
```

- Input empty array → fulfills immediately with `[]`.
- Fail-fast: one rejection rejects the whole `all` (other in-flight work may still continue; `all` just ignores their outcomes unless you cancel separately).

### `Promise.allSettled`

```js
const results = await Promise.allSettled([fetchA(), fetchB()]);
// { status: 'fulfilled', value } | { status: 'rejected', reason }
```

Never rejects solely because a child rejected. Ideal for partial UI data.

### Interview scenario (preserved)

**Q: Fetch profile and settings in parallel; render if either succeeds; show partial data if one fails. Which combinator?**

> `Promise.allSettled` — you need both outcomes regardless of individual failure, so you can render what arrived and fallback the rest. `Promise.all` would drop the successful result on one rejection. `Promise.any` is for “at least one success, don’t need all outcomes.”

### `Promise.race`

```js
function withTimeout(promise, ms) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('timeout')), ms)
  );
  return Promise.race([promise, timeout]);
}
```

First settlement wins — **including rejection**. A fast failure beats a slow success.

### `Promise.any`

```js
const data = await Promise.any([mirror1(), mirror2(), mirror3()]);
// first success; AggregateError only if all fail
```

Opposite “mood” from `all`: success-biased vs all-must-succeed.

---

## Error-handling patterns

### Always end chains that can reject

Unhandled rejections: settled rejected Promise with no rejection handler yet (runtime warnings / hard fails depending on environment).

```js
doWork(); // bad if doWork returns a rejecting Promise and nobody catches
doWork().catch(handle); // ok
```

### Prefer recovery points you intend

```js
load()
  .then(transform)
  .catch(showError) // handles load OR transform failures
  .then(maybeContinue); // runs after catch unless catch rethrows
```

Know whether `.catch` mid-chain **swallows** and continues.

### `finally` for cleanup, not business results

Hide spinners, release locks — don’t put primary result logic only in `finally`.

---

## Thenables (brief)

Anything with a `.then` method can be adopted by `resolve` / `Promise.resolve`. Real-world: some libraries return thenables. You rarely implement them; know that “flattening” applies to thenables, not only `instanceof Promise`.

---

## Common mistakes and misconceptions

1. **Thinking `.then` mutates the original Promise.** It returns a new one.
2. **Assuming `Promise.all` cancels siblings on failure.** It rejects; siblings may still finish unless you abort.
3. **Using `race` when you meant `any`.** `race` can reject on the first failure; `any` waits for a success.
4. **Forgetting that `throw` in `then` rejects the next Promise** — and that a later `then` without `onRejected` is skipped.
5. **Expecting `.then` to run synchronously** after `Promise.resolve`. Still microtask.
6. **Nesting instead of returning Promises** — breaks flattening/readability (`then(() => { getX().then(...) })` vs `then(() => getX())`).
7. **Ignoring `AggregateError` from `any`.**
8. **Using `all` for partial UI data** — loses successful branches.

---

## Connections to other concepts

```
async work completes in host
  → Promise settles
    → .then/.catch scheduled as microtasks
      → event loop drains them before next macrotask

return value / throw in handler
  → next Promise in chain fulfills or rejects
    → like try/catch control flow across async turns

combinators
  → compose many Promises into one settlement policy
    → all vs allSettled vs race vs any

async/await (next)
  → syntax over Promises
    → same settlement + microtask continuations
```

Closures still capture bindings used inside handlers. Single-threading still means handlers don’t run in parallel JS — combinators overlap **waiting**, not parallel CPU on one stack.

---

## Interview perspective

You should be able to:

1. Define states and “settle once.”
2. Explain chaining, flattening, and error propagation with a short example.
3. Fill the combinator table from memory and pick for scenarios.
4. Spot swallowed vs recovered errors mid-chain.
5. Tie `.then` to microtasks vs `setTimeout`.

Strong combinator line: match **failure policy** (fail fast / collect all / first settle / first success) to the product requirement.

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
