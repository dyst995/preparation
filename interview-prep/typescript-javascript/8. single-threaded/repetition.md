# JavaScript Is Single-Threaded — Next-day repetition

## How to use

1. Do **not** open `notes.md` first.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] What does it mean that JavaScript is single-threaded (precise version)?
- [ ] If async isn’t multi-threaded JS, what is it?
- [ ] Why doesn’t `setTimeout(fn, 0)` run `fn` immediately?
- [ ] Why can many `fetch` requests be in flight at once if JS is single-threaded?
- [ ] Concurrent host I/O vs parallel JS execution.
- [ ] Non-blocking I/O vs non-blocking CPU (are they the same?).

## Predict / debug

State the result **and explain why**. For debug items, diagnose the misconception.

- [ ]
```js
console.log('A');
setTimeout(() => console.log('B'), 0);
console.log('C');
```

- [ ]
```js
setTimeout(() => console.log('timeout'), 0);
Promise.resolve().then(() => console.log('then'));
console.log('sync');
```

- [ ]
```js
function block(ms) {
  const t = Date.now() + ms;
  while (Date.now() < t) {}
}
setTimeout(() => console.log('done'), 50);
block(200);
console.log('after block');
```

- [ ] A teammate says: “We used `async/await`, so this CPU-heavy parse won’t block the event loop.”
```js
async function handle() {
  const text = await fetch(url).then((r) => r.text());
  const data = JSON.parse(hugeText); // huge sync parse
  return data;
}
```
What is right/wrong in their statement?

## Say it out loud

- [ ] Explain that JavaScript is single-threaded in 30–60 seconds as if an interviewer asked.
- [ ] JavaScript is single-threaded — what does that actually mean?  
  **Follow-ups:** Then how does async work? Where is the concurrency?
- [ ] Do `async` functions run on a different thread?  
  **Follow-ups:** What does `await` do to the call stack?
