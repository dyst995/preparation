# 05. Part D - "Predict the output" drills

> Source: `interview-prep/typescript-javascript/05-interview-questions-drills.md`

Write down your predicted output before checking the answer.

### D1
```js
console.log('a');
setTimeout(() => console.log('b'), 0);
Promise.resolve().then(() => console.log('c'));
console.log('d');
```
**Answer:** `a, d, c, b` - sync code first, then the full microtask queue, then the macrotask.

### D2
```js
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}
```
**Answer:** `3, 3, 3` - `var` is function-scoped; all three closures share the same `i`, which is `3` once the loop finishes and the callbacks finally run.

### D3
```js
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}
```
**Answer:** `0, 1, 2` - `let` creates a fresh binding per iteration, so each closure captures its own distinct `i`.

### D4
```js
console.log(typeof undeclaredVar);
console.log(typeof letVar);
let letVar = 1;
```
**Answer:** `"undefined"` then throws `ReferenceError` - `typeof` on a truly undeclared variable is safe, but `typeof` on a variable in the TDZ still throws.

### D5
```js
const obj = {
  name: 'nika',
  greet() { console.log(this.name); },
};
const fn = obj.greet;
fn();
```
**Answer:** Throws (or logs `undefined` in sloppy mode) - `fn` is called as a bare function, so default binding applies and `this` is `undefined` in strict mode (ES modules/class bodies are strict by default), not `obj`.

### D6
```js
console.log(1 + '1');
console.log('5' - 1);
console.log([] + []);
console.log([] + {});
```
**Answer:** `'11'`, `4`, `''`, `'[object Object]'` - `+` prefers string concatenation if either side is/becomes a string; `-` always coerces both sides to numbers.

### D7
```js
async function f() {
  console.log('1');
  await null;
  console.log('2');
}
console.log('start');
f();
console.log('end');
```
**Answer:** `start, 1, end, 2` - `f()` runs synchronously up to the first `await`, then yields control back to the caller; `console.log('end')` runs before the microtask resuming `f` after `await null`.

### D8
```js
Promise.resolve()
  .then(() => { throw new Error('boom'); })
  .then(() => console.log('never runs'))
  .catch(err => console.log('caught:', err.message));
```
**Answer:** `caught: boom` - a thrown error inside a `.then()` skips forward past subsequent `.then()`s with no rejection handler, landing at the next `.catch()`.

### D9
```ts
function isString(x: unknown): x is string {
  return typeof x === 'string';
}
function process(x: unknown) {
  if (isString(x)) {
    console.log(x.toUpperCase());
  }
}
```
**Answer:** Compiles and runs fine - `isString` is a type predicate; inside the `if` block, `x` is narrowed from `unknown` to `string`, so `.toUpperCase()` is safe and type-checked.

### D10
```js
items.forEach(async (item) => {
  await save(item);
});
console.log('done');
```
**Answer:** `'done'` logs immediately, before any `save(item)` call has actually resolved - `forEach` fires all the `async` callbacks but never awaits their returned Promises.

---
