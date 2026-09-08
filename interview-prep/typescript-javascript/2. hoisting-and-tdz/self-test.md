# Hoisting and the Temporal Dead Zone — Self-test

## Core recall

1. What does “hoisting” mean if you avoid the phrase “moved to the top”?
2. What value does a `var` binding have after scope entry but before its assignment line?
3. What is the Temporal Dead Zone?
4. Which declaration forms are fully initialized at scope entry so they can be called early?
5. For `const foo = () => {}`, what is hoisted and what is not?
6. Are `class` declarations usable before their declaration line? What error do you get if you try?
7. Does `typeof` ever throw because of hoisting/TDZ rules?

## Explain why

1. Why is “JS moves declarations to the top of the file” a harmful half-truth?
2. Why did `let`/`const` introduce a TDZ instead of behaving like `var`’s early `undefined`?
3. Why can an early `console.log(x)` inside a block throw even if an outer `x` exists?
4. Why does calling a `var`-assigned function expression before its line produce a different error than accessing a `let`-assigned function expression early?
5. Why are function declarations and class declarations treated differently for early use?

## Compare and contrast

1. `var` hoisting vs `let` hoisting.
2. Function declaration vs function expression (regarding early calls).
3. `typeof undeclared` vs `typeof` on a TDZ `let` binding.
4. `ReferenceError` from TDZ vs `ReferenceError` from a truly undeclared identifier — how do you tell them apart in reasoning (and often in the message)?
5. `TypeError: … is not a function` after early access vs TDZ `ReferenceError`.
6. Hoisting (time) vs scope (place) — what question does each answer?

## Predict the output

State the result **and explain why**.

1.
```js
console.log(a);
var a = 1;
```

2.
```js
console.log(b);
let b = 2;
```

3.
```js
console.log(sum(2, 3));
function sum(a, b) {
  return a + b;
}
```

4.
```js
console.log(add(2, 3));
var add = function (a, b) {
  return a + b;
};
```

5.
```js
console.log(typeof foo);
console.log(typeof bar);
var foo = 'a';
let bar = 'b';
```

6.
```js
typeof undeclaredVar;
```

7.
```js
const x = 'outer';
{
  console.log(x);
  const x = 'inner';
}
```

8.
```js
foo();
var foo = function () {
  return 1;
};
```

9.
```js
const a = new Person();
class Person {}
```

10.
```js
function f() {
  console.log(a);
  console.log(b);
  var a = 1;
  let b = 2;
}
f();
```

11.
```js
let x = x;
```

12.
```js
function g() {
  return h();
  function h() {
    return 'ok';
  }
}
console.log(g());
```

## Debugging

1. Diagnose:
```js
function init() {
  if (!config) {
    config = { debug: false };
  }
  var config = { debug: true };
  return config;
}
console.log(init());
```
What goes wrong, and how is hoisting involved?

2. Diagnose why the second log never runs as expected:
```js
console.log(typeof A);
console.log(typeof B);
class A {}
var B = class {};
```
Predict actual behavior and explain.

3. A teammate says: “`let` isn’t hoisted, so this should print the outer value.”
```js
let name = 'outer';
function print() {
  console.log(name);
  let name = 'inner';
}
print();
```
What misconception is that, and what actually happens?

4. Diagnose the error type and root cause:
```js
greet();
var greet = () => console.log('hi');
```

## Application

1. Rewrite this so early calls work **without** relying on function-declaration hoisting (i.e. order the code so initialization is obvious):
```js
start();
function start() {
  helper();
}
function helper() {
  console.log('go');
}
```

2. Write the smallest snippet that shows `typeof` throwing, and a second snippet where `typeof` returns `'undefined'` for a missing name.

3. Convert this early-callable API from a function declaration to a `const` arrow function **and** reorder so behavior stays correct:
```js
export function createId() {
  return Math.random().toString(36).slice(2);
}
console.log(createId());
```
(Show the ordering constraint you introduced.)

4. Given a block that shadows an outer `mode`, write one version that throws due to TDZ and one version that safely reads the outer `mode` before declaring an inner binding (e.g. by restructuring).

## Interview questions

1. What is hoisting in JavaScript?  
   **Follow-ups:** Does `let` hoist? What is the TDZ?

2. What will this print/throw, and why? (Interviewer pastes the `typeof foo` / `typeof bar` example.)  
   **Follow-ups:** Why doesn’t `typeof` save you here?

3. Can I use a class before its declaration in the same scope? Why or why not?  
   **Follow-ups:** How is that different from a function declaration?

4. Explain the difference between a function declaration and a function expression with respect to hoisting.  
   **Follow-ups:** What error do you get if you call each too early?

5. Why does TDZ exist?  
   **Follow-ups:** Show how it interacts with shadowing.

## Connections

1. How do scope rules decide *where* a `var` binding lives, and how do hoisting rules decide *what you see* before its assignment?
2. How does TDZ + shadowing prevent an inner `let x` from accidentally reading an outer `x` before the inner declaration?
3. Which “undefined bugs” in older code are really `var` hoisting issues rather than closure issues?
4. How should you talk about hoisting when the conversation moves to ES modules (strict, `let`/`const`, no sliding `var` habits)?
