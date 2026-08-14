# Hoisting and the Temporal Dead Zone

## What you need to know

Hoisting answers: **when does a binding exist in its scope, and what can you legally do with it before its declaration line runs?**

It is not a separate “feature” floating above the language. It is what you observe because the engine **creates bindings for a scope before that scope’s code runs**, then initializes those bindings according to different rules for `var`, `let`/`const`, `function`, and `class`.

Curriculum checklist this unit completes:

- What “hoisting” actually means (declarations registered before execution, not literally moved)
- `var` hoisting → initialized to `undefined`
- Function declaration hoisting → fully initialized, callable early
- Function expression / arrow → only the variable binding follows `var`/`let`/`const` rules
- `let`/`const` and the Temporal Dead Zone (TDZ)
- `class` declarations also live in the TDZ until initialized

Prerequisite: you already know **scope** (where a binding lives). Hoisting/TDZ is about **time** inside that scope.

---

## What hoisting actually is

### The wrong mental model

People say “JavaScript moves declarations to the top.” That metaphor predicts some outcomes, but it is misleading:

- The source text is not rewritten for you to read.
- Initialization rules differ by declaration kind — “moved to the top” does not explain TDZ.
- Function bodies are not “moved”; only how bindings are created/initialized changes.

### The useful mental model

For each scope, before the engine runs the statements in that scope, it performs an **instantiation / creation** phase:

1. Find declarations that belong to this scope (`var`, `let`, `const`, `function`, `class`, parameters, etc.).
2. Create bindings for them in the scope’s environment.
3. Initialize each binding according to its kind (or leave it uninitialized → TDZ).
4. Then run the code **in source order**.

So “hoisted” means: **the binding exists from the start of the scope’s execution**, not that your assignment ran early.

```js
console.log(a); // undefined — binding exists; assignment has not run
var a = 1;      // this line still runs here; it assigns 1
```

Equivalent intuition (not literal engine code):

```js
var a;          // created & set to undefined at scope entry
console.log(a);
a = 1;          // original assignment line
```

For `let`/`const`, step 3 does **not** put a usable value in place — the binding exists but is uninitialized until the declaration line runs.

---

## `var` hoisting

### What happens

- Binding is created for the **function** scope (or global script scope).
- At scope entry it is initialized to `undefined`.
- The assignment in `var a = 1` runs later, in place.

```js
function f() {
  console.log(x); // undefined
  var x = 10;
  console.log(x); // 10
}
f();
```

### Why it matters

Reading a `var` “too early” does not throw. You get `undefined`, which can **hide ordering bugs** (conditionals, early returns, circular init).

```js
function loadConfig() {
  if (!ready) {
    return defaults; // looks fine…
  }
  var ready = true;
  var defaults = { theme: 'dark' };
}
// ready is undefined here, so !ready is true, defaults is also undefined → returns undefined
```

### Edge details worth knowing

**Multiple `var` of the same name** in one function share one binding:

```js
function f() {
  var x = 1;
  var x = 2;
  console.log(x); // 2
}
```

**`var` ignores blocks** (scope unit): the binding still belongs to the function, and it is still created at function entry:

```js
function f(flag) {
  console.log(a); // undefined — already created
  if (flag) {
    var a = 1;
  }
  console.log(a); // 1 or undefined depending on flag
}
```

---

## Function declaration hoisting

### What happens

A `function foo() { ... }` declaration is hoisted **fully**: at scope entry the binding exists **and** holds the function object. You can call it before its line in the source.

```js
console.log(sum(1, 2)); // 3
function sum(a, b) {
  return a + b;
}
```

### Why it exists / why it matters

It lets mutually recursive helpers and “main at the bottom” styles work in scripts. Interviewers use it to contrast with function expressions.

### Important qualifications

**Same-scope duplicate function declarations:** later one wins (in sloppy scripts this historically got messy; treat duplicate decls as a smell).

**Block-level function declarations:** behavior historically differed across browsers and between sloppy/strict mode. In modern practice:

- Prefer not to rely on `function` declarations inside blocks.
- Prefer `const fn = () => {}` / `function` at function/module top level.
- In **strict mode** / modules, block-level functions are block-scoped (closer to `let`), but this is still a footgun in interviews if you overclaim without caveats.

```js
'use strict';
if (true) {
  function local() {
    return 1;
  }
}
// local may be out of scope here in strict/module — do not depend on calling it outside
```

---

## Function expressions and arrow functions

### What happens

```js
foo(); // depends on how foo is declared — usually fails for expressions
const foo = function () {};
// or
const foo = () => {};
```

Only the **variable binding** is subject to hoisting rules of `var`/`let`/`const`. The function value is created when the assignment runs.

| Form | Before the assignment line |
|---|---|
| `var foo = function () {}` | `foo` is `undefined` → calling throws `TypeError` |
| `let foo = function () {}` | TDZ → touching `foo` throws `ReferenceError` |
| `const foo = () => {}` | TDZ → `ReferenceError` |
| `function foo() {}` | Callable |

```js
console.log(typeof a); // 'undefined'
a();                   // TypeError: a is not a function
var a = function () {};

b();                   // ReferenceError (TDZ)
let b = function () {};
```

### Why the distinction matters

Interview prompt: “Can I call this before it’s defined?” Answer depends on **declaration kind**, not on “it’s a function.”

Named function expressions (`const f = function g() {}`) still assign on that line; the inner name `g` is local to the function body and is not a hoisted outer binding you can call early.

---

## `let`, `const`, and the Temporal Dead Zone

### What the TDZ is

From the start of the scope until the declaration line finishes initializing the binding, a `let`/`const`/`class` binding is in the **Temporal Dead Zone**:

- The binding **exists** (so it can shadow outer names).
- Any access (read, write, `typeof`) throws `ReferenceError`.

```js
console.log(b); // ReferenceError: Cannot access 'b' before initialization
let b = 2;
```

“Temporal” means it is about **time in the execution of that scope**, not about a special place in memory.

### Why TDZ exists

With `var`, early access silently yields `undefined` and masks bugs. TDZ makes accidental use-before-init a **loud failure**. It also makes shadowing safer to reason about: an inner `let x` is not accidentally reading the outer `x` before the inner declaration runs — that access is still TDZ for the inner binding.

```js
const x = 'outer';
{
  // console.log(x); // ReferenceError — inner x is in TDZ, does not fall through to outer
  const x = 'inner';
  console.log(x); // 'inner'
}
```

### `const` specifics

- `const` must be initialized on the declaration line: `const x;` → `SyntaxError`.
- After init, the **binding** cannot be reassigned; object contents can still mutate.
- Early access is still TDZ (`ReferenceError`), same as `let`.

### Access patterns that throw

Anything that evaluates the binding before init:

```js
let x = x;     // ReferenceError — RHS reads x while still in TDZ
typeof x;      // ReferenceError if x is in TDZ in this scope
let y = 1;
```

### Famous `typeof` gotcha (preserve + clarify)

`typeof` is usually safe for **undeclared** identifiers. It is **not** safe for TDZ bindings.

```js
typeof undeclaredVar; // 'undefined' — no binding in scope
typeof bar;           // ReferenceError — bar exists in TDZ
let bar = 'b';
```

Interview classic:

```js
console.log(typeof foo);
console.log(typeof bar);
var foo = 'a';
let bar = 'b';
```

- First line: `'undefined'` (`var foo` exists as `undefined`).
- Second line: throws `ReferenceError` (TDZ).

Spoken framing:

> The `foo` line logs `'undefined'` because `var` is created and initialized to `undefined` at scope entry. The `bar` line throws because `let` is hoisted into the TDZ — the binding exists but is uninitialized, and even `typeof` is not safe there.

---

## `class` declarations and TDZ

### What happens

`class Foo {}` creates a binding that is **hoisted into the TDZ**, like `let`. You cannot use the class before its declaration line.

```js
const x = new Foo(); // ReferenceError
class Foo {}
```

Unlike `function` declarations, classes are **not** fully initialized early.

```js
const a = new A(); // works
function A() {}

const b = new B(); // ReferenceError
class B {}
```

### Why

Classes have heritage/`extends` evaluation and stricter initialization semantics. Treating them like `let` avoids using a half-ready constructor. Class **expressions** (`const C = class {}`) follow the `const`/`let` binding that holds them.

### Edge

Methods inside the class body are not “available early” via the class binding either — the whole class value appears when initialization completes.

---

## Declaration comparison table

Preserved and tightened:

| Declaration | Binding created at scope entry? | Value before declaration line | Call / `new` before line? |
|---|---|---|---|
| `var x` | Yes | `undefined` | N/A (not a function) |
| `let x` / `const x` | Yes | TDZ → `ReferenceError` on access | N/A |
| `function foo() {}` | Yes | Function object | Yes |
| `var foo = function () {}` | Yes | `undefined` | `TypeError` if called |
| `const foo = () => {}` | Yes | TDZ | `ReferenceError` if accessed |
| `class Foo {}` | Yes | TDZ | `ReferenceError` |

```js
console.log(a); // undefined
var a = 1;

console.log(b); // ReferenceError
let b = 2;

console.log(sum(1, 2)); // 3
function sum(a, b) {
  return a + b;
}

console.log(mul); // ReferenceError
const mul = (a, b) => a * b;
```

---

## Order of initialization inside a scope

Useful causal picture when several declarations coexist:

1. Scope entered.
2. Instantiation creates bindings; `var` → `undefined`; `function` declarations installed; `let`/`const`/`class` uninitialized (TDZ).
3. Statements run top to bottom.
4. Each `let`/`const`/`class` declaration line **initializes** that binding and ends its TDZ.
5. Assignments to `var`/writable bindings run when those statements execute.

```js
// What happens here?
foo();        // 'function body' — declaration already initialized
console.log(x); // undefined
var x = 1;
// console.log(y); // would throw — TDZ
let y = 2;
foo();        // still works

function foo() {
  return 'function body';
}
```

---

## Common mistakes and misconceptions

1. **“Hoisting moves code to the top.”** Bindings are created early; assignments still run in place. TDZ proves the metaphor is incomplete.
2. **“`let`/`const` are not hoisted.”** They are hoisted as bindings; they are not initialized early. Saying “not hoisted” fails the `typeof` / shadowing TDZ questions.
3. **“`typeof` never throws.”** It throws on TDZ bindings.
4. **“All functions hoist.”** Only `function` **declarations** fully hoist. Expressions follow their variable rules.
5. **“Classes hoist like functions.”** Classes are TDZ’d like `let`.
6. **Confusing `ReferenceError` causes:** undeclared identifier vs TDZ vs (later) missing export — same error name, different story. TDZ message often includes “before initialization.”
7. **Confusing `TypeError` vs `ReferenceError`:** `var fn = function(){}` called early → `TypeError` (`undefined` is not a function). `let fn = function(){}` accessed early → `ReferenceError`.
8. **Thinking TDZ is about blocks only.** TDZ is from the start of the binding’s scope until init — for a function-scoped mental mix-up, remember `let` is block-scoped, so its TDZ starts at block entry.

---

## Connections to other concepts

```
scope (where binding lives)
  → scope entry / instantiation (when binding is created)
    → initialization rules
      → var: undefined early
      → function decl: value early
      → let/const/class: TDZ until declaration line

TDZ + shadowing
  → inner let x hides outer x immediately at block entry
    → early read does not “see through” to outer x

var function scope + early undefined
  → silent bugs
    → motivates let/const TDZ

function decl vs expression
  → same “callable thing” at runtime after init
    → different before-the-line behavior
```

Closures use bindings that **already exist** in outer environments; hoisting/TDZ explain whether those bindings are usable yet **inside** their own scope. Modules are strict and prefer `let`/`const`/exports — you still get TDZ inside a module scope.

---

## Interview perspective

You should be able to:

1. Reject the “code is moved upward” story and replace it with create-then-initialize.
2. Fill a table for `var` / `let` / `function` / `const fn = …` / `class` for early access.
3. Predict `typeof` on undeclared vs TDZ identifiers.
4. Explain why TDZ exists (fail loud vs `undefined` masking).
5. Show a shadowing + TDZ example where outer values are *not* read.
6. Distinguish `ReferenceError` (TDZ) from `TypeError` (early `var` function expression call).

Strong short answer to “What is hoisting?”:

> Before a scope runs, JS registers its declarations in that scope’s environment. `var` starts as `undefined`, function declarations are fully initialized, and `let`/`const`/`class` exist but stay uninitialized until their line — that’s the TDZ. Assignments still happen in source order.

---

# Self-test

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
