# Promises — Self-test

## Core recall

1. What are the three Promise states, and what does “settled” mean?
2. Can a fulfilled Promise become rejected later?
3. What does `.then` return?
4. What happens if you `throw` inside an `onFulfilled` callback?
5. What does it mean that returning a Promise from `.then` “flattens”?
6. Summarize `all`, `allSettled`, `race`, and `any` in one line each.
7. What is `.finally` for?
8. When do Promise handlers run relative to `setTimeout(0)`?

## Explain why

1. Why do Promises help more than nested callbacks for error handling?
2. Why does `Promise.all` reject even if some inputs already fulfilled?
3. Why is `allSettled` the right tool for partial UI data from parallel fetches?
4. Why can `Promise.race` be dangerous as a “first success” tool?
5. Why does attaching `.then` after a Promise already fulfilled still work?
6. Why does a `.catch` that returns a value allow a later `.then` to run?

## Compare and contrast

1. `Promise.all` vs `Promise.allSettled`
2. `Promise.race` vs `Promise.any`
3. `.then(onFulfilled, onRejected)` vs `.then(onFulfilled).catch(onRejected)` (error handling subtlety mid-chain)
4. `Promise.resolve(value)` vs `new Promise(r => r(value))` (practical sameness / adoption)
5. Rejection reason vs thrown exception in a handler (outcome vs how it looks in code)
6. Combinator “overlap waiting” vs multi-threaded parallel JS

## Predict the output

State what logs / resolves / rejects **and explain why**.

1.
```js
Promise.resolve(1)
  .then((n) => n + 1)
  .then((n) => console.log(n));
```

2.
```js
Promise.resolve()
  .then(() => {
    throw new Error('x');
  })
  .then(() => console.log('ok'))
  .catch((e) => console.log('caught', e.message));
```

3.
```js
Promise.reject(new Error('no'))
  .catch(() => 'fixed')
  .then((v) => console.log(v));
```

4.
```js
Promise.resolve(1)
  .then((n) => Promise.resolve(n + 1))
  .then((n) => console.log(n));
```

5.
```js
Promise.all([Promise.resolve(1), Promise.reject(new Error('e'))])
  .then((v) => console.log('all', v))
  .catch((e) => console.log('all err', e.message));
```

6.
```js
Promise.allSettled([Promise.resolve(1), Promise.reject(new Error('e'))]).then(
  (r) => console.log(r.map((x) => x.status))
);
```

7.
```js
Promise.race([
  new Promise((r) => setTimeout(() => r('slow'), 50)),
  Promise.reject(new Error('fast fail')),
])
  .then((v) => console.log(v))
  .catch((e) => console.log(e.message));
```

8.
```js
Promise.any([Promise.reject(new Error('a')), Promise.resolve('b')]).then((v) =>
  console.log(v)
);
```

9.
```js
console.log('A');
Promise.resolve().then(() => console.log('B'));
console.log('C');
```

10.
```js
Promise.resolve('x')
  .finally(() => console.log('F'))
  .then((v) => console.log(v));
```

## Debugging

1. Diagnose:
```js
getUser()
  .then((u) => getOrders(u.id))
  .then((orders) => console.log(orders))
  .then(() => console.log('done'));
// errors from getUser sometimes become UnhandledPromiseRejection
```
What’s missing?

2. Diagnose wrong combinator:
```js
const data = await Promise.all([fetchProfile(), fetchSettings()]);
// product wants to show profile even if settings 500
```

3. Diagnose:
```js
Promise.resolve(1).then(() => {
  getThing().then((t) => console.log(t));
});
// later code assumes the outer chain waits for getThing
```
What’s the bug pattern? Fix it with flattening.

4. Diagnose timeout helper:
```js
Promise.race([fetch(url), delay(1000).then(() => 'timeout')]);
// treats timeout string as success; fetch errors vs timeout confused
```
How would you redesign settlement semantics?

## Application

1. Implement `delay(ms)` that returns a Promise fulfilled after `ms`.

2. Implement `withTimeout(promise, ms)` that rejects with a clear error on timeout using `race`.

3. Write a function `loadDashboard()` that fetches `user` and `settings` in parallel and returns `{ user, settings }` where either may be `null` on failure (`allSettled`).

4. Rewrite nested callbacks into a Promise chain:
```js
getUser(id, (err, user) => {
  if (err) return cb(err);
  getOrders(user.id, (err, orders) => {
    if (err) return cb(err);
    cb(null, { user, orders });
  });
});
```
(Assume promisified `getUser` / `getOrders`.)

5. Write a tiny `mapInParallel(urls, fetchFn)` using `Promise.all` and explain when you’d switch to `allSettled`.

## Interview questions

1. What is a Promise? What are its states?  
   **Follow-ups:** Can it settle twice? What if you resolve with another Promise?

2. Explain Promise chaining and error propagation.  
   **Follow-ups:** Show how `throw` in `then` interacts with `catch`.

3. Compare `all`, `allSettled`, `race`, and `any`.  
   **Follow-ups:** Partial UI data scenario? Timeout scenario? First mirror success?

4. What does `.finally` guarantee about the chain’s value?  
   **Follow-ups:** What if `finally` throws?

5. When do `.then` callbacks run relative to the event loop?  
   **Follow-ups:** Predict sync vs Promise vs setTimeout order.

## Connections

1. How do Promise reactions depend on the microtask queue from the event-loop unit?
2. How is rejection propagation analogous to `try/catch` across async turns?
3. How will `async/await` reuse the same settlement model without new runtime states?
4. Why doesn’t `Promise.all` mean “parallel JS threads”?
5. When debugging “then never ran,” how do you separate “Promise still pending,” “rejected without catch,” and “handler scheduled but stack/macrotask confusion”?
