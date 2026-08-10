# 01. Scope: lexical scope, block scope, function scope

> Source: `interview-prep/typescript-javascript/01-javascript-fundamentals.md`

### Topics to learn
- [ ] Global scope vs function scope vs block scope
- [ ] Lexical (static) scoping - scope determined by where code is written, not where it's called from
- [ ] `var` is function-scoped; `let`/`const` are block-scoped
- [ ] Scope chain and variable lookup
- [ ] Shadowing
- [ ] The global object (`window` / `globalThis`) and implicit globals from unscoped assignment

### Core idea

JavaScript uses **lexical scoping**: a variable's scope is determined by its physical location in the source code at write time, not by the call stack at run time. Every function, when defined, "remembers" the scope it was created in - this is literally the mechanism that makes closures possible (see section 3).

```js
const x = 1;

function outer() {
  const x = 2;
  inner();
}

function inner() {
  console.log(x); // 1, not 2 - inner() is lexically defined at top level
}

outer();
```

`inner` looks up `x` in the scope where it was *defined* (top level), not where it was *called from* (inside `outer`). This is the opposite of dynamic scoping (used by some other languages), and it's why closures are predictable rather than call-site-dependent.

### `var` vs `let`/`const` scoping

| | `var` | `let` / `const` |
|---|---|---|
| Scope | Function (or global) | Block (`{ }`) |
| Redeclaration | Allowed | Error (`SyntaxError`) in same scope |
| Hoisting | Hoisted, initialized to `undefined` | Hoisted, but in TDZ until declaration line |
| Attaches to `window`/`global` (top-level, non-module) | Yes | No |

```js
if (true) {
  var a = 1;
  let b = 2;
}
console.log(a); // 1 - leaked out of the block
console.log(b); // ReferenceError - b is block-scoped
```

This single behavior explains a large class of classic bugs: loop-scoped `var` leaking into closures, accidental global variable creation, and `var` "surviving" conditional blocks unexpectedly.

### Interview question

**Q: What's the difference between function scope and block scope, and why does it matter in practice?**

**Strong answer:**
> "Function scope means a variable declared with `var` is visible everywhere inside the enclosing function, regardless of nested blocks like `if` or `for`. Block scope, which `let` and `const` introduced, confines the variable to the nearest `{ }`. In practice this matters most inside loops and conditionals - `var` counters leak out and get shared across closures, which is the classic 'all my setTimeout callbacks log the same last value' bug. I default to `const`, fall back to `let` when reassignment is needed, and treat `var` as legacy."

---
