# 03. Promises

> Source: `interview-prep/typescript-javascript/02-async-event-loop.md`

### Topics to learn
- [ ] Three states: pending, fulfilled, rejected - and that a settled Promise never changes state again
- [ ] `.then(onFulfilled, onRejected)`, `.catch()`, `.finally()`
- [ ] Promise chaining and value/error propagation through the chain
- [ ] Returning a Promise from `.then()` flattens it (no nested Promises) - this is why chains don't need manual unwrapping
- [ ] `Promise.resolve()` / `Promise.reject()` for wrapping values
- [ ] `Promise.all`, `Promise.allSettled`, `Promise.race`, `Promise.any` - differences and use cases
- [ ] Errors thrown inside a `.then()` callback become a rejection of the resulting Promise, caught by the next `.catch()`

### States and settling

A Promise starts **pending** and can transition exactly once to either **fulfilled** (with a value) or **rejected** (with a reason). Once settled, it's immutable - calling `resolve`/`reject` again does nothing.

### Combinators comparison table

| Method | Resolves when | Rejects when | Result shape | Typical use |
|---|---|---|---|---|
| `Promise.all` | all fulfill | **any one** rejects (fails fast) | array of values, same order | "I need everything, and any failure is fatal" |
| `Promise.allSettled` | always, once all settle | never | array of `{status, value/reason}` | "I need all results, failures are OK / handled individually" |
| `Promise.race` | first one settles (fulfilled or rejected) | first one settles as rejected | the first settled value/reason | timeouts, "whichever finishes first wins" |
| `Promise.any` | first one **fulfills** | only if **all** reject (`AggregateError`) | first fulfilled value | "any success is enough, ignore individual failures" |

### Interview question

**Q: You need to fetch a user's profile and their settings in parallel, and the screen should render if either succeeds, showing partial data if one fails. Which combinator, and why?**

**Strong answer:**
> "`Promise.allSettled` - I need to know the outcome of *both* requests regardless of individual failure, so I can render whichever data actually came back and show a fallback or error state for the other. `Promise.all` would be wrong here because a single rejection would reject the whole thing and I'd lose the successful result. If I only needed 'at least one succeeded, don't care which,' `Promise.any` would fit instead."

### Common bug: swallowed errors mid-chain

```js
fetchUser()
  .then(user => {
    throw new Error('transform failed');
  })
  .then(user => console.log(user)) // skipped - error propagates past .then without onRejected
  .catch(err => console.error(err)); // catches it here
```

A thrown error (or a rejected Promise) skips forward past any `.then()` calls that only supply `onFulfilled`, landing at the next `.catch()` (or a `.then(onFulfilled, onRejected)` with a rejection handler). This propagation is exactly like synchronous `try/catch` skipping to the nearest `catch` block.

---
