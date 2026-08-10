# 09. Hands-on drills (do these)

> Source: `interview-prep/typescript-javascript/01-javascript-fundamentals.md`

- [ ] Write a `for (var i ...)` loop with `setTimeout` that logs the wrong values, then fix it three ways: `let`, IIFE, and passing `i` as a parameter.
- [ ] Implement a `once(fn)` higher-order function using a closure that ensures `fn` only ever runs one time, caching and returning the first result on subsequent calls.
- [ ] Implement `bind` yourself (`Function.prototype.myBind`) using `apply`/`call` and a closure over the arguments.
- [ ] Build a two-level prototype chain manually with `Object.create` (no `class`, no constructor functions) and verify lookup with `Object.getPrototypeOf`.
- [ ] Convert a small constructor-function + `.prototype.method` example into an ES6 `class` and verify `Object.getPrototypeOf(instance) === ClassName.prototype` still holds.
- [ ] Write down 10 expressions using `==` that you predict wrong on the first try (find them online or invent your own), then verify in a REPL.
- [ ] Create two tiny files demonstrating CommonJS `require` value-copy behavior vs ESM live-binding behavior for an exported counter.

---
