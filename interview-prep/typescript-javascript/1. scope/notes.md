# Scope

## What you need to know

Scope answers: **where is this identifier allowed to be used, and which binding does a name resolve to?**

In JavaScript, that answer is almost always **lexical**: relationships between scopes are fixed by where code is written. Understanding scope is the prerequisite for closures, a large class of loop/`var` bugs, accidental globals, and “why does this log the outer `x`?” interview questions.

Curriculum checklist this unit completes:

- Global vs function vs block scope
- Lexical (static) scoping
- `var` function-scoped; `let`/`const` block-scoped
- Scope chain and variable lookup
- Shadowing
- `globalThis` / global object and implicit globals

---

## Lexical scope

### What it is

**Lexical scope** (also called **static scope**) means a variable’s accessibility is determined by the **nesting of scopes in the source code**, not by where a function is called at runtime.

When the engine parses/compiles your code, it already knows which outer scopes each function can see. Call sites do not rewrite that map.

### Why it matters

- Lookups are predictable: same function, same free variables, every call.
- Closures are possible and stable: a function keeps access to the bindings of the lexical environment where it was created.
- Interviewers contrast this with **dynamic scope**, where free variables would resolve using the **caller’s** environment (JS does not do this for variables).

### How it works

```js
const x = 1;

function outer() {
  const x = 2;
  inner();
}

function inner() {
  console.log(x); // 1, not 2 — inner is defined at top level
}

outer();
```

`inner` is defined in the global/module scope. Its outer lexical environment is that top-level scope. Calling `inner` from inside `outer` does **not** put `outer`’s `x` on `inner`’s scope chain.

If `inner` had been *defined inside* `outer`, it would see `outer`’s `x`:

```js
const x = 1;

function outer() {
  const x = 2;
  function inner() {
    console.log(x); // 2 — defined inside outer
  }
  inner();
}

outer();
```

### Mental model

Write time draws the nesting diagram. Runtime walks that diagram upward to find names. The call stack answers “who called me?”; the scope chain answers “which variables can I see?”

### Interview angle

Expect: “Does JS use lexical or dynamic scope?” → lexical for variables. (Do not confuse this with `this`, which is mostly call-site determined — different mechanism, later chapter.)

---

## Scope kinds: global, function, block

### What they are

| Kind | Created by | Typical bindings |
|---|---|---|
| **Global / module** | Script or module top level | Top-level `var`/`function` (script), `let`/`const`/`class` (script or module), imports (module) |
| **Function** | Entering a function | Parameters, `var`, function declarations inside the function |
| **Block** | `{ ... }` (including `if`/`for`/`while`/`switch` bodies, bare blocks) | `let`, `const`, `class`, and (in modules/strict contexts) some other bindings |

### Why multiple kinds exist

Older JS had essentially **function** and **global** for `var`. ES6 added **block** scope via `let`/`const` so loop counters, temporary values, and conditional bindings stop leaking into the whole function.

### Practical consequences

- A `var` inside an `if` is still visible after the `if` ends (same function).
- A `let` inside an `if` is not.
- Nested functions always create a new function scope for their own `var`/params, regardless of blocks.

```js
function example(flag) {
  if (flag) {
    var a = 1;
    let b = 2;
  }
  console.log(a); // 1 if flag was true; undefined if flag was false (var hoisted)
  // console.log(b); // ReferenceError — b never left the block
}
```

---

## `var` vs `let` / `const` scoping

Preserved comparison (still correct):

| | `var` | `let` / `const` |
|---|---|---|
| Scope | Function (or global) | Block (`{ }`) |
| Redeclaration | Allowed in same scope | `SyntaxError` in same scope |
| Hoisting | Hoisted, initialized to `undefined` | Binding exists early, but **TDZ** until declaration line (see Hoisting unit) |
| Attaches to global object (top-level **classic script**, non-module) | Yes | No |

```js
if (true) {
  var a = 1;
  let b = 2;
}
console.log(a); // 1 — leaked out of the block
console.log(b); // ReferenceError — block-scoped
```

### Extra rules that matter in practice

**`const` vs `let`:** both are block-scoped the same way. Difference is reassignment: `const` binding cannot be reassigned; object/array contents can still mutate.

**Redeclaration:**

```js
var x = 1;
var x = 2; // ok

let y = 1;
// let y = 2; // SyntaxError in same scope
```

**Same name, different scopes:** allowed — that is shadowing (below), not redeclaration.

**`for` loops and `let`:** `for (let i = ...)` creates a **new `i` binding per iteration**. That is why `let` fixes the classic `setTimeout` loop bug; `var` does not. Full treatment lives with Closures; the scope fact is: one shared function-scoped `i` vs per-iteration block bindings.

---

## Lexical environments and how scopes are created

### What a lexical environment is

A useful engine-level mental model (without needing full ECMAScript legalese):

Each scope is backed by a **Lexical Environment**: a place that holds **identifier → binding** mappings for that scope, plus a link to an **outer** environment.

Roughly:

```
EnvironmentRecord (name → value/slot)
+ outer → parent Lexical Environment | null
```

### When environments are created

| Moment | What happens |
|---|---|
| Entering a function | New function environment for params, `var`, inner function decls |
| Entering a block that needs it | New block environment for `let`/`const`/`class` in that block |
| Starting a script/module | Global (or module) environment |
| Evaluating a `catch (err)` | Binding for `err` (block-like) |
| Some special forms | e.g. modules have their own scope; `eval`/`with` are edge cases you mostly avoid |

Scope nesting is established **when the code structure is defined**, not when an arbitrary call happens later. Runtime creates environment *instances* as those scopes are entered, but the *parent links* follow the lexical nesting.

### Why this model helps

Identifier lookup is: look in the current environment’s record; if missing, follow `outer`; repeat until found or fail. That chain **is** the scope chain.

---

## Identifier resolution and the scope chain

### How lookup works

When code reads `x`:

1. Check the current lexical environment.
2. If not found, check the outer environment.
3. Continue until the global/module environment.
4. If still missing → `ReferenceError` (in modern/strict code for bare reads).

Assignment to an **already resolved** binding updates that binding. Assignment to an **unresolvable** name is a different story (implicit globals / strict mode — below).

### Nested scopes example

```js
const globalName = 'g';

function outer() {
  const outerName = 'o';

  function mid() {
    const midName = 'm';

    function inner() {
      console.log(globalName, outerName, midName);
      // resolves: global ← outer ← mid ← inner
    }

    inner();
  }

  mid();
}

outer();
```

`inner` does not copy values eagerly for lookup; it walks the chain when the identifier is evaluated (closures keep the environments alive so that walk still works after `outer` returns — Closures unit).

### Prediction

```js
// What happens here?
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

**Result:** logs `'outer'`. `one` was defined where `value` means the outer binding. `two`’s local `value` is irrelevant to `one`.

---

## Shadowing

### What it is

**Shadowing** means an inner scope declares the same name as an outer scope. Lookup finds the **nearest** binding and stops. The outer binding still exists; inner code just cannot see it under that name until the inner scope ends.

```js
const x = 'outer';

function f() {
  const x = 'inner';
  console.log(x); // 'inner'
}

f();
console.log(x); // 'outer'
```

### Why it matters

- Explains many “wrong variable” bugs: you think you mutated the outer binding; you shadowed it.
- Parameters shadow outer names the same way.
- In loops/callbacks, a new binding can intentionally shadow (or, with `var`, fail to create a new binding when you expected one).

### Edge cases

**Illegal in the same scope:** `let x; let x;` → `SyntaxError`. Shadowing requires a **nested** scope.

**`var` in an inner function** shadows an outer `var`/`let` for that function’s body, because the function has its own environment. A bare block with `var` does **not** create a new `var` binding — `var` ignores block boundaries:

```js
var x = 1;
{
  var x = 2; // same binding (function/global), not a shadow in a new var scope
}
console.log(x); // 2
```

```js
let y = 1;
{
  let y = 2; // real shadow — different block binding
  console.log(y); // 2
}
console.log(y); // 1
```

**Catch parameter** shadows names in the `catch` block only.

---

## Global scope, scripts vs modules, and `globalThis`

### Classic script vs ES module

Top-level behavior depends on **how the file is loaded**:

| | Classic script (`<script>`, non-module) | ES module (`type="module"`, bundler ESM, etc.) |
|---|---|---|
| Top-level scope | Shared **global** environment | **Module** scope (its own environment) |
| Top-level `var` / `function` | Become properties of the global object | Stay module-local (do not become `globalThis` props) |
| Top-level `let` / `const` / `class` | Global bindings, but **not** global-object properties | Module-local |
| Default mode | Sloppy unless `"use strict"` | Always strict |
| Top-level `this` | Global object (usually) | `undefined` |

This is why “I declared `const API_URL` in a module and can’t see it on `window`” is expected, and why two modules do not accidentally share top-level `let` bindings.

### `globalThis`

**`globalThis`** is the standard way to refer to the global object across environments:

- Browser: historically `window` (also `self`, frames nuances)
- Node: historically `global`
- Web Workers: `self`

Prefer `globalThis` in portable code. Remember: **not every global binding is a property of `globalThis`**. Top-level `let`/`const` in scripts are global bindings without becoming `globalThis` properties; module bindings are not global at all.

```js
var fromVar = 1;
let fromLet = 2;

// In a classic browser script:
console.log(globalThis.fromVar); // 1
console.log(globalThis.fromLet); // undefined — binding exists, not an object property
```

### Why the global object still matters

Libraries sometimes attach APIs to the global object; accidental globals pollute it; feature detection and polyfills often touch `globalThis`.

---

## Implicit globals and strict mode

### Unscoped assignment

In **sloppy** (non-strict) mode, assigning to an unresolved identifier creates a property on the global object:

```js
function leak() {
  leaked = 42; // no declaration!
}
leak();
console.log(globalThis.leaked); // 42 in sloppy mode
```

That is an **implicit global**. It is a common source of cross-function bugs and test pollution.

### Strict mode

In **strict mode** (`"use strict"`, ES modules, many class bodies, etc.), the same assignment throws:

```js
'use strict';
function leak() {
  leaked = 42; // ReferenceError
}
```

### Practical rule

Treat undeclared assignment as a bug. Prefer modules (strict by default), linters (`no-undef`), and always declare with `const`/`let`.

### Related: missing declaration vs TDZ

- Reading a never-declared name → `ReferenceError` (or in old sloppy edge cases, weirdness you should not rely on).
- Reading a `let`/`const` before its declaration line → `ReferenceError` due to **TDZ** (binding exists but is uninitialized). Same error name, different cause — Hoisting unit.

---

## Common mistakes and misconceptions

1. **“Scope is determined by the call stack.”** That is dynamic scoping. JS variable scope is lexical. Call site matters for `this`, not for free variable lookup.
2. **“`var` is block-scoped if I put it in `{ }`.”** No. Blocks do not create `var` scopes.
3. **“`let` at the top level is on `window`.”** No. It is a global/module binding without becoming a global-object property (and in modules it is not global).
4. **“Shadowing deletes the outer variable.”** Outer binding remains; inner name just hides it.
5. **“Closures copy values when the function is defined.”** Closures keep environment references; values are read later. Combined with shared `var` loop bindings, this produces the classic identical-`i` bug.
6. **“If it works in a script tag, modules behave the same at the top level.”** Module scope and strictness change globals, `this`, and visibility across files.
7. **“`globalThis.x` is the same as every global `x`.”** Only bindings that are also global-object properties show up that way (`var`/function in classic scripts, explicit `globalThis.x = ...`).

---

## Connections to other concepts

```
lexical nesting
  → lexical environments + outer links
    → scope chain / identifier resolution
      → closures (function retains access to outer bindings after return)

var = function scope
  → one loop binding shared by all iterations
    → closure callbacks see final value

let/const = block scope (+ per-iteration for)
  → separate bindings
    → fixes loop + async callback bug

undeclared assignment (sloppy)
  → implicit global on global object
    → cross-cutting mutable state bugs

modules
  → own scope + strict
    → no accidental script-global sharing of top-level bindings
```

Closures are not a separate magic feature: they are **functions + retained lexical environments**. Hoisting/TDZ describe **when** a binding becomes usable inside a scope you already have. `this` is a different binding rule set and must not be explained as “dynamic scope for variables.”

---

## Interview perspective

You should be able to:

1. Define lexical scope and contrast it with dynamic scope in one crisp sentence plus an example.
2. Draw or narrate a scope chain for a nested function and predict a shadowed name.
3. Explain `var` vs `let`/`const` with a block/`for` consequence, not only a table.
4. Explain why calling a function from another function does not give it the caller’s locals.
5. Mention strict mode’s rejection of implicit globals and that ESM is strict with module scope.
6. Name `globalThis` and qualify what does / does not appear on it.

Strong spoken framing (from your outline, still valid):

> Function scope means a `var` is visible everywhere inside the enclosing function, regardless of nested `if`/`for` blocks. Block scope (`let`/`const`) confines the binding to the nearest `{ }`. That matters most in loops and conditionals: `var` leaks and gets shared across closures — the classic “every `setTimeout` logs the last value” bug. Default to `const`, use `let` when reassignment is needed, treat `var` as legacy.

Add one sentence when they dig deeper: “Lookup follows the lexical scope chain from where the function was defined; the caller doesn’t change that.”

---

# Self-test

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
