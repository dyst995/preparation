# Node, NestJS, and React Native Async Notes — Next-day repetition

## How to use

1. Do **not** open `notes.md` first.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] Relative to Promise `.then`, when does `process.nextTick` run?
- [ ] Does RN’s JS thread use a different Promise/microtask model than the browser? What is different about RN async if the JS loop is the same?
- [ ] When Nest runs an `async` controller method, what does Nest do with the returned Promise?
- [ ] What still can crash or destabilize a Nest/Node process despite Nest exception filters?
- [ ] `process.nextTick` vs `queueMicrotask` / Promise microtasks.
- [ ] RN JS thread vs RN native UI thread.

## Predict / debug

State the order **and explain why** (Node unless noted). For debug items, diagnose the failure path.

- [ ]
```js
console.log('s');
process.nextTick(() => console.log('n'));
Promise.resolve().then(() => console.log('p'));
```

- [ ]
```js
setTimeout(() => console.log('t'), 0);
process.nextTick(() => console.log('n'));
Promise.resolve().then(() => console.log('p'));
console.log('s');
```

- [ ]
```js
// Conceptual Nest handler — what is dangerous?
async function create(dto) {
  this.repo.save(dto); // forgot await; returns Promise
  return { ok: true };
}
```

- [ ] Nest endpoint returns 201 but the process logs `UnhandledPromiseRejection` from analytics. Walk the failure path.

- [ ] Teammate says: “RN is multi-threaded so our JS `await` won’t block the UI thread.” What is confused? What *can* still jank?

## Say it out loud

- [ ] Explain Node, NestJS, and React Native async differences in 30–60 seconds as if an interviewer asked.
- [ ] Does React Native have a different event loop than the browser?  
  **Follow-ups:** Then why do people talk about the UI thread / bridge?
- [ ] What is `process.nextTick` and how does it relate to Promises?  
  **Follow-ups:** Why can it be dangerous? What would you use instead in app code?
