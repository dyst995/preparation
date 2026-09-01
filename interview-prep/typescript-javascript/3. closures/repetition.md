# Closures — Next-day repetition

## How to use

1. Do **not** open `notes.md` first.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] What is a closure?
- [ ] Do closures capture bindings or snapshot values? What does that imply for later reads?
- [ ] After `makeCounter()` returns, why is `count` still accessible to `increment`?
- [ ] In the classic `for (var i = 0; i < 3; i++) setTimeout(...)` example, how many `i` bindings exist?
- [ ] Why do all timeouts in the `var` loop log the same final value?
- [ ] Stale closure (wrong generation of captured state) vs shared mutable binding (one binding, many readers) — how the failure modes differ.

## Predict / debug

State the result **and explain why**. For debug items, diagnose and fix.

- [ ]
```js
function makeCounter() {
  let count = 0;
  return function () {
    count += 1;
    return count;
  };
}
const c = makeCounter();
console.log(c(), c());
```

- [ ]
```js
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}
```

- [ ]
```js
function wrap(obj) {
  return () => obj.value;
}
const state = { value: 1 };
const get = wrap(state);
state.value = 9;
console.log(get());
```

- [ ] Diagnose and fix so logs are `0, 1, 2`:
```js
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100);
}
```

- [ ] Diagnose the stale behavior (conceptual React):
```js
function Component() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      console.log(count);
    }, 1000);
    return () => clearInterval(id);
  }, []);
  // count increases on button clicks…
}
```
Why does the interval keep logging `0`? What closure idea explains it?

## Say it out loud

- [ ] Explain closures in 30–60 seconds as if an interviewer asked.
- [ ] What is a closure in JavaScript?  
  **Follow-ups:** Do they capture by value or by reference? Prove it.
- [ ] What is a stale closure? Where do engineers hit it in React?  
  **Follow-ups:** How is that still “correct” lexical behavior?
