# 02. Hoisting and the Temporal Dead Zone

> Source: `interview-prep/typescript-javascript/01-javascript-fundamentals.md`

### Topics to learn
- [ ] What "hoisting" actually means (declarations processed before execution, not literally moved)
- [ ] `var` hoisting: declaration hoisted, initialized to `undefined`
- [ ] Function declaration hoisting: entire function is hoisted, callable before its definition
- [ ] Function expression / arrow function: only the variable binding hoists (per `var`/`let` rules), not the function body
- [ ] `let`/`const` hoisting into the Temporal Dead Zone (TDZ)
- [ ] `class` declarations are hoisted but also live in the TDZ (not initialized)

### Mental model

Hoisting is not "JS moves your code to the top." It's that **the JS engine does a compile pass** before execution that registers all declarations (`var`, `let`, `const`, `function`, `class`) in their scope. What differs is *what value* the binding has before the actual line of code runs:

| Declaration | Hoisted? | Value before the line executes |
|---|---|---|
| `var x` | Yes | `undefined` |
| `let x` / `const x` | Yes (binding exists) | TDZ - accessing throws `ReferenceError` |
| `function foo() {}` | Yes, fully | The function itself - callable |
| `const foo = () => {}` | Binding only | TDZ, then `undefined` isn't relevant - it's a `const`, so reference before assignment throws |
| `class Foo {}` | Binding only | TDZ - `ReferenceError` if referenced before |

```js
console.log(a); // undefined (var hoisted, not yet assigned)
var a = 1;

console.log(b); // ReferenceError: Cannot access 'b' before initialization
let b = 2;

console.log(sum(1, 2)); // 3 - function declarations hoist fully
function sum(a, b) { return a + b; }

console.log(mul); // ReferenceError (TDZ) - mul is a const, hoisted but not initialized
const mul = (a, b) => a * b;
```

### Why the TDZ exists

The Temporal Dead Zone is a deliberate design choice to catch bugs early: with `var`, accidentally reading a variable before its "real" assignment silently gives you `undefined`, which can mask logic errors. `let`/`const` throw instead, forcing you to notice the ordering problem immediately.

### Interview question

**Q: What will this log, and why?**

```js
console.log(typeof foo);
console.log(typeof bar);
var foo = 'a';
let bar = 'b';
```

**Answer:** `"undefined"` then throws `ReferenceError` - actually, careful: `typeof` on a TDZ variable *does* throw (unlike `typeof` on an undeclared variable, which safely returns `"undefined"`). This is a favorite gotcha:

```js
typeof undeclaredVar; // "undefined" - safe, no error
typeof bar;           // ReferenceError - TDZ, bar exists but is not initialized
```

> "The `foo` line logs `'undefined'` because `var` is hoisted and initialized to `undefined` immediately. The `bar` line throws a `ReferenceError` because `let` bindings are hoisted into the Temporal Dead Zone - the binding exists but touching it, even with `typeof`, before its declaration line throws. This is one of the few cases where `typeof` is not a 'safe' operation."

---
