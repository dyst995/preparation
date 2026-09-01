# Concurrency Pitfalls in Real Apps — Next-day repetition

## How to use

1. Do **not** open `notes.md` first.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] What is an async response race in a single-threaded UI app? Name two fix patterns for stale search responses.
- [ ] Why doesn’t `forEach` + `async` wait for async work?
- [ ] Debounce vs throttle — one sentence each, with a typical use case.
- [ ] Why can an earlier fetch overwrite a later one even though JS has one call stack?
- [ ] Ignore-stale (generation id) vs `AbortController`.
- [ ] `forEach(async fn)` vs `for...of` + `await` vs `Promise.all(map)`.

## Predict / debug

Explain what goes wrong or what logs **and why**. For debug items, diagnose and propose fixes.

- [ ]
```js
let n = 0;
function search(q) {
  const id = ++n;
  fetchResults(q).then((r) => {
    console.log('apply', q, 'id', id, 'latest', n);
  });
}
search('a');
search('ab');
// Assume "ab" returns before "a". What gets applied if there is no id check?
// What if the then body only applies when id === n?
```

- [ ]
```js
items.forEach(async (item) => {
  await save(item);
  console.log('saved', item);
});
console.log('done');
```

- [ ]
```js
const c1 = new AbortController();
fetch(url, { signal: c1.signal }).catch((e) => console.log(e.name));
c1.abort();
```

- [ ] Diagnose:
```js
useEffect(() => {
  fetchUser(id).then(setUser);
}, [id]);
// Fast id changes show wrong user briefly / warnings on unmounted setState
```

- [ ] Diagnose Nest-ish:
```js
app.post('/import', async (req, res) => {
  items.forEach(async (item) => {
    await importOne(item);
  });
  res.send({ ok: true });
});
```

## Say it out loud

- [ ] Explain concurrency pitfalls in real apps in 30–60 seconds as if an interviewer asked.
- [ ] Search box shows stale results after fast typing — what’s wrong and how do you fix it?  
  **Follow-ups:** Abort vs ignore-stale? What do React Query / SWR do?
- [ ] Why is `array.forEach(async ...)` a bug?  
  **Follow-ups:** Fixes for serial vs parallel? Error handling?
