# JavaScript Is Single-Threaded — Self-test

## Core recall

1. What does it mean that JavaScript is single-threaded (precise version)?
2. What is the call stack’s role in async behavior?
3. If async isn’t multi-threaded JS, what is it?
4. Where does concurrent waiting / some heavy host work actually happen in browsers and in Node?
5. Why can a long `while` loop freeze the UI even if timers and fetches are “already done”?
6. Why doesn’t `setTimeout(fn, 0)` run `fn` immediately?
7. How do Web Workers / `worker_threads` change the story without making main-thread JS multi-threaded?

## Explain why

1. Why can many `fetch` requests be in flight at once if JS is single-threaded?
2. Why does `'end'` log before `'timeout'` in the classic `start` / `setTimeout(0)` / `end` example?
3. Why is “Promises run in parallel on another thread” wrong?
4. Why does sync file I/O on a Node server hurt more than async file I/O under load?
5. Why can’t a due timer callback interrupt a function that is mid-loop on the main thread?

## Compare and contrast

1. Concurrent host I/O vs parallel JS execution.
2. Main-thread JS vs a Worker’s JS.
3. Non-blocking I/O vs non-blocking CPU (are they the same?).
4. `setTimeout(fn, 0)` vs “run this as the very next line of sync code.”
5. Handing work to Web APIs/libuv vs spawning a JS thread yourself.

## Predict the output

State the result **and explain why**.

1.
```js
console.log('A');
setTimeout(() => console.log('B'), 0);
console.log('C');
```

2.
```js
setTimeout(() => console.log('timeout'), 0);
Promise.resolve().then(() => console.log('then'));
console.log('sync');
```

3.
```js
console.log('start');
setTimeout(() => console.log('timer'), 0);
for (let i = 0; i < 1e8; i++) {}
console.log('end');
```
(Describe ordering; you need not estimate duration.)

4.
```js
function block(ms) {
  const t = Date.now() + ms;
  while (Date.now() < t) {}
}
setTimeout(() => console.log('done'), 50);
block(200);
console.log('after block');
```

5.
```js
async function f() {
  console.log('1');
  await null;
  console.log('2');
}
console.log('0');
f();
console.log('3');
```
(Use only the single-thread + “await postpones continuation” idea; full microtask detail can be approximate if you state assumptions.)

## Debugging

1. Diagnose:
```js
button.onclick = () => {
  const t = Date.now() + 5000;
  while (Date.now() < t) {}
  console.log('finished');
};
```
The page ignores clicks and animations during the handler. Why? What directions could you take?

2. Diagnose a Node API:
```js
app.get('/report', (req, res) => {
  const data = fs.readFileSync(hugePath, 'utf8'); // intentional for the bug
  res.send(summarize(data));
});
```
Under concurrent traffic, latency spikes for unrelated routes. Mechanism?

3. A teammate says: “We used `async/await`, so this CPU-heavy parse won’t block the event loop.”
```js
async function handle() {
  const text = await fetch(url).then((r) => r.text());
  const data = JSON.parse(hugeText); // huge sync parse
  return data;
}
```
What is right/wrong in their statement?

4. Diagnose:
```js
setTimeout(() => console.log('scheduled'), 0);
console.log('now');
// Teammate expected: scheduled, now
```
Correct their model.

## Application

1. Rewrite a demo that uses a busy `while` loop so a `setTimeout(0)` log can run sooner **without** Workers — by chunking work across turns (`setTimeout`/`queueMicrotask`/`requestAnimationFrame` — pick one and justify).

2. Write a short comment block you could put above a Nest handler explaining why `bcrypt.compareSync` on large batches is dangerous on the request thread.

3. Sketch (bullets or tiny code) how you’d move a heavy image encode off the browser main thread using a Worker: what stays on main, what messages you send.

4. Given three operations — timer 0ms, sync CPU 2s, `fetch` — describe which can overlap in wall-clock time and which JS callbacks still cannot overlap on the main thread.

## Interview questions

1. JavaScript is single-threaded — what does that actually mean?  
   **Follow-ups:** Then how does async work? Where is the concurrency?

2. Why doesn’t `setTimeout(fn, 0)` run immediately?  
   **Follow-ups:** What runs before it? How do Promises fit?

3. Why does a long loop freeze the browser?  
   **Follow-ups:** How would you fix CPU-bound work in production?

4. Do `async` functions run on a different thread?  
   **Follow-ups:** What does `await` do to the call stack?

5. How are Web Workers different from `setTimeout`?  
   **Follow-ups:** Is code inside a Worker multi-threaded?

## Connections

1. How does this unit set up the event loop’s “stack must be empty” rule?
2. How do closures interact with single-threading when many callbacks finally run in order?
3. How does “await doesn’t block the thread” still leave room for blocking sync code after an await?
4. How would you connect main-thread blocking to React input lag or Nest request latency in one sentence each?
5. When predicting output, how do you separate “host finished early” from “JS was allowed to run the callback”?
