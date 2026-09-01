# The Event Loop: Call Stack, Task Queue, Microtask Queue — Next-day repetition

## How to use

1. Do **not** open `notes.md` first.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] What are the call stack, macrotask queue, and microtask queue each responsible for?
- [ ] State the event loop priority order from “current sync/macrotask finishes” to “next macrotask.”
- [ ] What is the critical microtask rule that unlocks most predict-the-output questions?
- [ ] What is microtask starvation?
- [ ] Where does `process.nextTick` fit relative to Promise microtasks in Node?
- [ ] Macrotasks vs microtasks.

## Predict / debug

State the order **and explain why**. For debug items, diagnose and fix the scheduling strategy.

- [ ]
```js
console.log('1');
setTimeout(() => console.log('2'), 0);
Promise.resolve().then(() => console.log('3'));
console.log('4');
```

- [ ]
```js
setTimeout(() => console.log('A'), 0);
Promise.resolve()
  .then(() => console.log('B'))
  .then(() => console.log('C'));
console.log('D');
```

- [ ]
```js
console.log('start');
setTimeout(() => {
  console.log('timeout');
  Promise.resolve().then(() => console.log('then inside timeout'));
}, 0);
Promise.resolve().then(() => console.log('then'));
console.log('end');
```

- [ ]
```js
async function x() {
  console.log('x1');
  await Promise.resolve();
  console.log('x2');
}
console.log('a');
x();
console.log('b');
```

- [ ] Diagnose:
```js
function paintSoon() {
  Promise.resolve().then(paintSoon);
}
paintSoon();
// UI frozen; setTimeout logs never appear
```
What’s happening? How do you fix the scheduling strategy?

## Say it out loud

- [ ] Explain the event loop in 30–60 seconds as if an interviewer asked.
- [ ] Explain the JavaScript event loop.  
  **Follow-ups:** Where do Promises fit? Where does `setTimeout` fit?
- [ ] Why does `Promise.then` run before `setTimeout(0)`?  
  **Follow-ups:** What if the `.then` schedules another `.then`?
