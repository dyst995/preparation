# 03. Closures

> Source: `interview-prep/typescript-javascript/01-javascript-fundamentals.md`

### Topics to learn
- [ ] Definition: a function bundled with references to its surrounding lexical scope
- [ ] Closures capture variables by reference, not by value snapshot
- [ ] The classic loop + `var` + `setTimeout` bug, and the three fixes (`let`, IIFE, explicit param)
- [ ] Practical uses: memoization, private state, currying, debounce/throttle, module pattern
- [ ] Memory implications: closures keep referenced variables alive (relevant to leak discussions)

### Core idea

A closure is what happens automatically in JS whenever a function is defined inside another function (or scope) - the inner function keeps a live reference to the variables in its enclosing scope, even after the outer function has returned.

```js
function makeCounter() {
  let count = 0;
  return function increment() {
    count += 1;
    return count;
  };
}

const counter = makeCounter();
counter(); // 1
counter(); // 2
```

`count` is not copied into `increment` - `increment` holds a live reference to the same `count` variable in `makeCounter`'s scope. This is why closures are described as capturing **by reference**, not by value.

### The classic loop bug

```js
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}
// logs: 3, 3, 3
```

All three callbacks close over the *same* `i`, because `var` is function-scoped - there's only one `i` for the entire loop. By the time the callbacks run (after the loop finishes), `i` is `3`.

```js
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}
// logs: 0, 1, 2
```

`let` creates a **new binding per iteration**, so each closure captures a distinct `i`. This is a language-level guarantee for `for` loops specifically, and it's the cleanest fix. Pre-`let` fixes used an IIFE to force a new scope per iteration, or passed `i` as a parameter to a function factory - both are worth knowing for legacy code review.

### Practical uses in your stack

- **React**: every render creates new closures over that render's props/state - this is *why* stale closures happen in `useEffect`/`useCallback` when dependency arrays are wrong (the callback "remembers" old state).
- **Debounce/throttle utilities**: rely on a closure-held timer id/timestamp that persists across calls.
- **Module pattern / private state**: before ES2022 private class fields, closures were the standard way to hide implementation details.

### Interview question

**Q: What does this log, and how would you fix it to log 0, 1, 2?**

```js
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100);
}
```

**Strong answer:**
> "It logs `3, 3, 3`. `var` is function-scoped, so there's a single `i` shared by all three closures, and by the time the timeouts fire the loop has already finished with `i` equal to 3. The cleanest fix is switching to `let`, which creates a fresh binding per iteration so each closure captures its own value. Alternatively, wrap the body in an IIFE that takes `i` as a parameter, which was the pre-ES6 idiom."

---
