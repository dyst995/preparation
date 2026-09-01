# Promises — Next-day repetition

## How to use

1. Do **not** open `notes.md` first.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] What are the three Promise states, and what does “settled” mean?
- [ ] What does `.then` return? What happens if you `throw` inside an `onFulfilled` callback?
- [ ] Summarize `all`, `allSettled`, `race`, and `any` in one line each.
- [ ] When do Promise handlers run relative to `setTimeout(0)`?
- [ ] Why does `Promise.all` reject even if some inputs already fulfilled?
- [ ] `Promise.all` vs `Promise.allSettled`. `Promise.race` vs `Promise.any`.

## Predict / debug

State what logs / resolves / rejects **and explain why**. For debug items, diagnose and fix.

- [ ]
```js
Promise.resolve()
  .then(() => {
    throw new Error('x');
  })
  .then(() => console.log('ok'))
  .catch((e) => console.log('caught', e.message));
```

- [ ]
```js
Promise.reject(new Error('no'))
  .catch(() => 'fixed')
  .then((v) => console.log(v));
```

- [ ]
```js
Promise.all([Promise.resolve(1), Promise.reject(new Error('e'))])
  .then((v) => console.log('all', v))
  .catch((e) => console.log('all err', e.message));
```

- [ ]
```js
Promise.race([
  new Promise((r) => setTimeout(() => r('slow'), 50)),
  Promise.reject(new Error('fast fail')),
])
  .then((v) => console.log(v))
  .catch((e) => console.log(e.message));
```

- [ ] Diagnose:
```js
getUser()
  .then((u) => getOrders(u.id))
  .then((orders) => console.log(orders))
  .then(() => console.log('done'));
// errors from getUser sometimes become UnhandledPromiseRejection
```
What’s missing?

## Say it out loud

- [ ] Explain Promises in 30–60 seconds as if an interviewer asked.
- [ ] What is a Promise? What are its states?  
  **Follow-ups:** Can it settle twice? What if you resolve with another Promise?
- [ ] Compare `all`, `allSettled`, `race`, and `any`.  
  **Follow-ups:** Partial UI data scenario? Timeout scenario? First mirror success?
