# Closures — Self-test

## Core recall

1. What is a closure?
2. Do closures capture bindings or snapshot values? What does that imply for later reads?
3. After `makeCounter()` returns, why is `count` still accessible to `increment`?
4. In the classic `for (var i = 0; i < 3; i++) setTimeout(...)` example, how many `i` bindings exist?
5. What does `for (let i = ...)` change about bindings across iterations?
6. Name three practical use cases for closures.
7. Why can closures contribute to memory leaks?

## Explain why

1. Why does returning an inner function still allow access to the outer function’s locals?
2. Why do all timeouts in the `var` loop log the same final value?
3. Why does an IIFE-with-parameter fix the loop bug even if you keep `var i`?
4. Why do `const a = makeCounter(); const b = makeCounter();` not share counts?
5. Why can two functions returned from the **same** outer call share state?
6. Why is “closures copy variables when the function is defined” a dangerous misconception for async code?

## Compare and contrast

1. Closing over a binding vs passing a primitive argument into a new function call.
2. `for (var i …)` + async callbacks vs `for (let i …)` + async callbacks.
3. IIFE fix vs `let` fix — same goal, different mechanism surface.
4. Closure variable capture vs `this` binding rules (high level).
5. Module pattern privacy via closures vs ES module file privacy / `#private` fields (what problem each solves).
6. Stale closure (wrong generation of captured state) vs shared mutable binding (one binding, many readers) — how the failure modes differ.

## Predict the output

State the result **and explain why**.

1.
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

2.
```js
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}
```

3.
```js
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}
```

4.
```js
function outer() {
  let x = 1;
  function inc() {
    x += 1;
  }
  function read() {
    return x;
  }
  return { inc, read };
}
const o = outer();
o.inc();
console.log(o.read());
```

5.
```js
const a = makeCounter();
const b = makeCounter();
console.log(a(), b(), a());
```
(assume `makeCounter` from the core example)

6.
```js
for (var i = 0; i < 3; i++) {
  (function (j) {
    setTimeout(() => console.log(j), 0);
  })(i);
}
```

7.
```js
function wrap(obj) {
  return () => obj.value;
}
const state = { value: 1 };
const get = wrap(state);
state.value = 9;
console.log(get());
```

8.
```js
function build() {
  const fns = [];
  for (var i = 0; i < 3; i++) {
    fns.push(() => i);
  }
  return fns;
}
console.log(build().map((f) => f()));
```

9.
```js
function buildLet() {
  const fns = [];
  for (let i = 0; i < 3; i++) {
    fns.push(() => i);
  }
  return fns;
}
console.log(buildLet().map((f) => f()));
```

10.
```js
let x = 0;
function bump() {
  x += 1;
}
function makeReader() {
  return () => x;
}
const read = makeReader();
bump();
console.log(read());
```

## Debugging

1. Diagnose and fix so logs are `0, 1, 2`:
```js
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100);
}
```

2. Diagnose:
```js
function createHandlers(items) {
  const handlers = [];
  for (var i = 0; i < items.length; i++) {
    handlers.push(function () {
      return items[i];
    });
  }
  return handlers;
}
const hs = createHandlers(['a', 'b', 'c']);
console.log(hs[0](), hs[1](), hs[2]());
```
What is printed and why? Fix it two different ways.

3. Diagnose the stale behavior (conceptual React):
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

4. Diagnose a possible leak:
```js
function attach(el) {
  const huge = readHugeFileIntoMemory();
  el.addEventListener('click', () => {
    console.log('clicked', huge.size);
  });
}
```
What keeps `huge` alive? How would you redesign if the handler only needs `huge.size`?

## Application

1. Implement `makeAdder(n)` returning a function that adds `n` to its argument. State which binding is closed over.

2. Implement a tiny `createStore(initial)` with `get` and `set` that hide the value in a closure (no `this` required).

3. Write `memoize(fn)` for unary string/number keys using a closed-over `Map`.

4. Rewrite a `var`-based loop scheduling three timeouts so it logs `0, 1, 2` **without** using `let`/`const` in the `for` head (use IIFE or a helper).

5. Write two functions returned from one outer scope that intentionally share a `history` array, and a second design where each returned function gets an isolated history.

## Interview questions

1. What is a closure in JavaScript?  
   **Follow-ups:** Do they capture by value or by reference? Prove it.

2. What does this log, and how do you fix it to log `0, 1, 2`? (classic `var` + `setTimeout` loop)  
   **Follow-ups:** Explain the IIFE fix. Why does `let` work?

3. Give real examples of closures in production code.  
   **Follow-ups:** Any downside? Memory?

4. How can two functions share private state without putting it on a public object?  
   **Follow-ups:** How is that different from an ES module’s top-level `let`?

5. What is a stale closure? Where do engineers hit it in React?  
   **Follow-ups:** How is that still “correct” lexical behavior?

## Connections

1. How does lexical scope make closures possible?
2. How does `var`’s function scope + live closure reads produce the loop bug?
3. How is the `let` per-iteration rule a *scope* fact that closures then expose?
4. How do closures relate to debounce/throttle state without using classes?
5. When debugging “wrong value in a callback,” how do you decide whether you’re looking at a shared binding issue, a snapshotting need, or a stale React generation issue?
