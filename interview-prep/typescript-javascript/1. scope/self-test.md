# Scope — Self-test

## Core recall

1. What determines which binding an identifier resolves to in JavaScript?
2. Name the three common kinds of scope you use day to day, and what creates each.
3. For each of `var`, `let`, and `const`: what kind of scope do they create/use at the declaration site?
4. What is a lexical environment, in one or two sentences useful for explaining lookup?
5. What is shadowing?
6. What is `globalThis`, and why does it exist?
7. What is an implicit global?
8. In an ES module, are top-level `var` / `let` bindings properties of the global object?

## Explain why

1. Why does calling a function from another scope not change which outer variables it can access?
2. Why can lexical scope make closures predictable?
3. Why does `var` inside an `if` remain visible after the `if` finishes (inside the same function)?
4. Why is assigning to an undeclared identifier dangerous in sloppy mode?
5. Why might `globalThis.someName` be `undefined` even though a top-level `let someName` exists in a classic script?
6. Why do two different ES modules not share each other’s top-level `const` bindings the way two classic scripts might share globals?

## Compare and contrast

1. Lexical scope vs dynamic scope.
2. Function scope vs block scope.
3. `var` vs `let` at the top level of a classic browser script (visibility + `window`/`globalThis`).
4. Global scope in a classic script vs top-level scope in an ES module.
5. Shadowing vs reassigning an outer binding.
6. Scope chain (variables) vs call stack (execution) — what question does each answer?
7. Implicit global vs an explicit `globalThis.x = ...` assignment.

## Predict the output

For each snippet: state what happens (log values and/or thrown error) **and explain why**.

1.
```js
const x = 1;
function outer() {
  const x = 2;
  inner();
}
function inner() {
  console.log(x);
}
outer();
```

2.
```js
let a = 'outer';
function f() {
  console.log(a);
  let a = 'inner';
}
f();
```

3.
```js
var x = 1;
{
  var x = 2;
}
console.log(x);
```

4.
```js
let y = 1;
{
  let y = 2;
  console.log(y);
}
console.log(y);
```

5.
```js
function test(flag) {
  if (flag) {
    var a = 10;
  }
  console.log(a);
}
test(false);
test(true);
```

6.
```js
'use strict';
function f() {
  x = 1;
}
f();
```

7.
```js
// classic sloppy script (not a module)
function f() {
  x = 1;
}
f();
console.log(globalThis.x);
```

8.
```js
let value = 'outer';
function one() {
  console.log(value);
}
function two() {
  let value = 'inner';
  one();
}
two();
```

9.
```js
function outer() {
  let count = 0;
  return function inner() {
    count += 1;
    return count;
  };
}
const a = outer();
const b = outer();
console.log(a(), a(), b());
```

## Debugging

1. Diagnose and fix:
```js
function attachHandlers(buttons) {
  for (var i = 0; i < buttons.length; i++) {
    buttons[i].onClick = function () {
      console.log('Clicked button', i);
    };
  }
}
// Every handler logs buttons.length. Why? How would you fix it using scope rules?
```

2. Diagnose:
```js
// app.js loaded as ES module
export const config = { env: 'prod' };

// other classic non-module script
console.log(window.config); // undefined — developer expected the export to appear on window
```
What misconception about scope/modules is involved?

3. Diagnose:
```js
const user = { name: 'Ada' };

function reset() {
  user = { name: 'Anon' }; // crashes or misbehaves depending on context
}
```
The author meant to clear the object’s data for all readers of `user`. What went wrong conceptually (scope/bindings vs mutability)? Propose a correct approach under `const`.

4. Diagnose:
```js
function readConfig() {
  return API_URL;
}

API_URL = 'https://api.example.com'; // set “later” in another file, sloppy mode
console.log(readConfig());
```
Why is this brittle? What scope-related fix would you insist on in review?

## Application

1. Rewrite this so `b` does not leak, without changing the logged result for `a`:
```js
if (true) {
  var a = 1;
  var b = 2;
}
console.log(a);
```

2. Write a function `makePrefixer(prefix)` that returns a function `name => prefix + name`, and explain in one sentence which scope rule makes `prefix` available later.

3. Given a nested function that accidentally shadows an outer `config`, change the code so the inner function reads the outer `config` without renaming the outer binding (show at least one clear approach).

4. Write a small snippet that demonstrates a binding existing in global/module scope but **not** as a property of `globalThis`.

## Interview questions

1. What is lexical scope in JavaScript?  
   **Follow-ups:** How does that differ from dynamic scope? Where does `this` fit in that comparison?

2. What is the difference between function scope and block scope, and why does it matter in practice?  
   **Follow-ups:** Why does `var` in a `for` loop interact badly with async callbacks? What does `let` change mechanically?

3. Walk me through how the engine resolves a free variable inside a nested function.  
   **Follow-ups:** What is stored so this still works after the outer function returns?

4. What are implicit globals? When do they happen? How do you prevent them?  
   **Follow-ups:** What changes in strict mode? In ES modules?

5. Explain `globalThis` and what kinds of declarations appear on it.  
   **Follow-ups:** Classic script vs module top-level `var`/`let`.

6. What is shadowing? Give an example that would fool a junior engineer during debugging.

## Connections

1. How does lexical scope make closures possible?
2. How does `var`’s function scope explain the shared loop variable problem that closures expose?
3. How does module scope change the way you think about “global” configuration compared to classic scripts?
4. How is identifier lookup on the scope chain different from looking up a property on a prototype chain? (High level is enough.)
5. Which mistakes in this unit are actually hoisting/TDZ issues rather than pure scope-boundary issues — and how can you tell?
