# `async` / `await` — Next-day repetition

## How to use

1. Do **not** open `notes.md` first.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] What does an `async function` always return?
- [ ] Does `await` block the JavaScript thread? What does it pause?
- [ ] What is the accidental sequential await bug? How do you await multiple independent operations concurrently?
- [ ] Why can other timers and handlers run while an `async` function is “stuck” on `await`?
- [ ] Sequential `await` in a loop vs `Promise.all` over a mapped array.
- [ ] Suspending at `await` vs blocking in a sync `while` loop.

## Predict / debug

State the order / outcome **and explain why**. For debug items, diagnose and fix.

- [ ]
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

- [ ]
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

- [ ]
```js
async function f() {
  await Promise.reject(new Error('x'));
  console.log('after');
}
f()
  .then(() => console.log('ok'))
  .catch((e) => console.log('catch', e.message));
```

- [ ] Diagnose and fix:
```js
async function loadDashboard() {
  const user = await fetchUser();
  const settings = await fetchSettings();
  return { user, settings };
}
```
(Independent fetches.)

- [ ] Diagnose:
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

## Say it out loud

- [ ] Explain `async`/`await` in 30–60 seconds as if an interviewer asked.
- [ ] Does `await` block the JavaScript thread?  
  **Follow-ups:** What runs while awaiting? How does resume get scheduled?
- [ ] What’s wrong with awaiting in a `for` loop over independent IDs?  
  **Follow-ups:** Fix? What if you need concurrency limits?
