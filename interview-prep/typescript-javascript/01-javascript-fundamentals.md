# 01 - JavaScript Fundamentals

> Goal: Explain scope, hoisting, closures, `this`, prototypes, coercion, equality, and modules with enough precision that a senior interviewer's follow-up questions do not rattle you. This chapter is the foundation every TypeScript and framework answer sits on.

Mark progress with `[x]` as you master each topic.

---

## Learning objectives

By the end of this chapter you should be able to:

1. Explain the difference between lexical scope and dynamic scope, and why JS uses the former.
2. Predict hoisting behavior for `var`, `let`, `const`, function declarations, and function expressions, including the Temporal Dead Zone (TDZ).
3. Write and explain closures, including common bugs (loop variable capture) and their fixes.
4. Determine the value of `this` in any call site: default, implicit, explicit, `new`, and arrow function lexical binding.
5. Explain the prototype chain, `Object.create`, and how ES6 `class` is sugar over prototypes.
6. Predict type coercion outcomes for `==`, `+`, and truthy/falsy checks, and justify `===` as default practice.
7. Contrast CommonJS and ES Modules: syntax, timing (sync vs static analysis), interop pain points, and `this`/top-level behavior.
8. Tie each concept back to a concrete bug pattern you would find in React, React Native, or NestJS code.

---

## 1. Scope: lexical scope, block scope, function scope

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

## 2. Hoisting and the Temporal Dead Zone

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

## 3. Closures

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

## 4. `this` binding

### Topics to learn
- [ ] Default binding (standalone function call - `undefined` in strict mode, global object otherwise)
- [ ] Implicit binding (method call - `obj.method()`)
- [ ] Explicit binding (`call`, `apply`, `bind`)
- [ ] `new` binding (constructor calls)
- [ ] Arrow functions: no own `this` - lexically inherited from enclosing scope
- [ ] Precedence order between the above rules
- [ ] Common React footgun: unbound class method handlers

### The four rules, in precedence order

1. **`new` binding** - `new Foo()` creates a new object, binds `this` to it.
2. **Explicit binding** - `fn.call(obj)`, `fn.apply(obj)`, or a function previously bound with `fn.bind(obj)`.
3. **Implicit binding** - `obj.method()` binds `this` to `obj` (the object left of the dot at call time).
4. **Default binding** - a bare function call `fn()` binds `this` to `undefined` in strict mode (or the global object in sloppy mode).

**Arrow functions follow none of these rules.** They have no `this` of their own - they capture `this` lexically from the enclosing scope at definition time, exactly like closures capture variables.

```js
const obj = {
  name: 'nika',
  regular() { console.log(this.name); },
  arrow: () => console.log(this?.name),
};

obj.regular(); // 'nika' - implicit binding, this = obj
obj.arrow();   // undefined - this is lexical, inherited from module/global scope, not obj

const detached = obj.regular;
detached(); // TypeError or undefined - default binding, this is undefined in strict mode
```

### Interview question

**Q: Why does this React class component bug happen, and what are the fixes?**

```jsx
class Button extends React.Component {
  handleClick() {
    console.log(this.props.label); // TypeError: Cannot read properties of undefined
  }
  render() {
    return <button onClick={this.handleClick}>Click</button>;
  }
}
```

**Strong answer:**
> "`this.handleClick` is passed as a bare reference to `onClick` - React calls it as a plain function, not as `this.handleClick()`, so the implicit binding rule never applies and `this` falls back to `undefined` in strict mode (all ES modules and class bodies are strict by default). Three fixes: bind in the constructor with `this.handleClick = this.handleClick.bind(this)`; use a class field arrow function `handleClick = () => {...}` which lexically captures `this` from the constructor's scope; or pass an inline arrow at the call site, `onClick={() => this.handleClick()}`. Modern codebases mostly sidestep this entirely with function components and hooks, since there's no `this` to bind."

### Quick reference table

| Call form | `this` inside the function |
|---|---|
| `fn()` | `undefined` (strict) / global object (sloppy) |
| `obj.fn()` | `obj` |
| `fn.call(x)` / `fn.apply(x)` | `x` |
| `const bound = fn.bind(x); bound()` | `x`, permanently |
| `new Fn()` | the newly created instance |
| Arrow function | whatever `this` was in the enclosing lexical scope |

---

## 5. Prototypes and classes

### Topics to learn
- [ ] The prototype chain and `[[Prototype]]` (accessible via `Object.getPrototypeOf` / `__proto__`)
- [ ] `Object.create`, `Object.prototype`
- [ ] Constructor functions and `new` (the four steps `new` performs)
- [ ] `class` as syntactic sugar over prototypes (with real differences: TDZ, no hoisting of the body, strict mode always on)
- [ ] Instance methods live on the prototype (shared), instance fields live on the instance (per-object)
- [ ] `instanceof` and prototype chain lookup
- [ ] Inheritance: `extends` / `super`, vs manual `Object.setPrototypeOf`

### Core idea

Every JS object has an internal link to another object called its **prototype**. Property lookup that fails on the object itself walks up this chain until it finds the property or hits `null`. This is *the* mechanism behind method sharing, `instanceof`, and inheritance - there is no separate "class" concept at the engine level, even with ES6 `class` syntax.

```js
function Animal(name) {
  this.name = name;
}
Animal.prototype.speak = function () {
  return `${this.name} makes a sound`;
};

const dog = new Animal('Rex');
dog.speak(); // 'Rex makes a sound' - found on Animal.prototype, not on dog itself
```

What `new Animal('Rex')` does, step by step:

1. Creates a new empty object.
2. Sets that object's `[[Prototype]]` to `Animal.prototype`.
3. Calls `Animal` with `this` bound to the new object.
4. Returns the new object (unless the constructor explicitly returns another object).

### `class` is sugar, with caveats

```js
class Animal {
  constructor(name) { this.name = name; }
  speak() { return `${this.name} makes a sound`; }
}
```

This compiles to essentially the same prototype-based structure as the function version above - `speak` still lives on `Animal.prototype`, shared across all instances, not copied per instance. The real differences from plain functions:

- Class bodies are **always strict mode**.
- Class declarations are hoisted but stay in the **TDZ** (can't reference before definition, unlike hoisted function declarations).
- Calling a class without `new` throws a `TypeError` (constructor functions silently misbehave instead).
- Methods defined in a class body are **non-enumerable** by default (won't show up in `for...in` or `Object.keys`), unlike properties assigned manually to `.prototype`.

### Interview question

**Q: If I define a method inside a class vs. assigning an arrow function as a class field, what's the practical difference?**

```js
class A {
  regular() { return this; }
  arrowField = () => this;
}
```

**Strong answer:**
> "`regular` lives on `A.prototype` - one copy shared by every instance, and its `this` depends on how it's called. `arrowField` is created fresh in the constructor for every single instance, stored as an own property, and its `this` is lexically bound to the instance at construction time because arrow functions don't have their own `this`. That's exactly the pattern used to avoid manual `.bind()` calls for event handlers in older React class components - at the cost of one extra function allocation per instance instead of one shared prototype method."

### Why this matters for NestJS

NestJS is built almost entirely on classes, decorators, and dependency injection via constructor parameters - understanding that decorators are just functions that run at class-definition time (and can read/attach metadata via `Reflect.metadata`) requires a solid prototype/class mental model. If asked "how does Nest know what to inject," the honest answer traces back to constructor parameter types being readable via `reflect-metadata`, which piggybacks on TypeScript emitting design-time type metadata onto the class.

---

## 6. Type coercion and equality

### Topics to learn
- [ ] Falsy values (there are exactly 8: `false, 0, -0, 0n, '', null, undefined, NaN`)
- [ ] `==` (loose equality) coercion rules vs `===` (strict equality, no coercion)
- [ ] `+` operator: string concatenation vs numeric addition, and how it decides
- [ ] `null == undefined` is `true`, but both are `!== ` to everything else and each other's strict check
- [ ] `NaN !== NaN` - use `Number.isNaN` or `Object.is`
- [ ] `Object.is` vs `===` (edge cases: `NaN`, `+0`/`-0`)
- [ ] Array/object truthy behavior (`[]` and `{}` are truthy)

### The 8 falsy values (memorize this)

```
false, 0, -0, 0n, "", null, undefined, NaN
```

Everything else is truthy - notably `[]`, `{}`, `"0"`, and `"false"` are all truthy, which trips people up.

### `==` vs `===`

`===` never coerces types - if the types differ, it's `false`, full stop. `==` coerces one or both operands to a common type before comparing, following the (infamous) abstract equality algorithm.

```js
1 == '1';        // true - string coerced to number
0 == false;      // true - false coerced to 0
null == undefined; // true - special case, only equal to each other
null == 0;       // false - null does NOT coerce to 0 for ==
'' == 0;         // true - both coerce to 0
[] == false;     // true - [] -> '' -> 0, false -> 0
NaN == NaN;      // false - NaN is never equal to anything, including itself
```

**Default practice:** always use `===`/`!==`. The only broadly-accepted exception is `== null` as a deliberate shorthand to check for both `null` and `undefined` at once (`value == null` is `true` for either).

### `+` operator ambiguity

```js
1 + 1;      // 2 (numeric)
'1' + 1;    // '11' (string concatenation - string wins)
1 + '1';    // '11'
1 + {};     // '1[object Object]' - object coerced to string via toString
1 + [];     // '1' - array coerced to '' via toString/join, then concatenated
[] + [];    // '' - both arrays become '', concatenated
[] + {};    // '[object Object]'
```

`+` checks: if either operand is a string (after calling `ToPrimitive` on objects), it does string concatenation; otherwise it coerces both to numbers and adds. `-`, `*`, `/` never do this - they always coerce to numbers, which is why `'5' - 1` is `4` but `'5' + 1` is `'51'`.

### Interview question

**Q: Why is `[] == ![]` true?**

**Strong answer:**
> "`![]` evaluates first: `[]` is truthy, so `![]` is `false`. Now we're comparing `[] == false`. With loose equality, `false` coerces to `0`. `[]` goes through `ToPrimitive`, which calls `.toString()` on the array, giving `''`, which then coerces to `0` as well. So it's `0 == 0`, which is `true`. This is exactly the kind of surprising chain that makes `==` risky and is why `===` is the default in any codebase I write."

### Interview question

**Q: How do you correctly check if a value is `NaN`?**

> "`NaN !== NaN` by IEEE-754 spec, so a naive `x === NaN` check never works. Use `Number.isNaN(x)`, which doesn't coerce first (unlike the older global `isNaN()`, which coerces its argument and gives false positives like `isNaN('foo')` being `true`). For a broader identity check including `NaN` and signed zero distinction, `Object.is(x, NaN)` also works, and `Object.is(-0, 0)` is `false` where `===` would say `true`."

---

## 7. Modules: CommonJS vs ES Modules

### Topics to learn
- [ ] CommonJS: `require`/`module.exports`, synchronous, resolved at runtime
- [ ] ES Modules: `import`/`export`, statically analyzable, resolved at parse time (enables tree-shaking)
- [ ] Live bindings in ESM vs value copies in CommonJS
- [ ] `default` export vs named exports, and interop pain (`esModuleInterop` in TS/Node)
- [ ] Circular dependency behavior differs between the two systems
- [ ] Top-level `this` differs (`undefined` in ESM vs `module.exports` in CJS)
- [ ] `.mjs`/`.cjs`/`"type": "module"` in `package.json`

### Core differences

| | CommonJS | ES Modules |
|---|---|---|
| Syntax | `require()`, `module.exports` | `import`, `export` |
| Resolution timing | Runtime (dynamic, synchronous) | Parse/compile time (static) |
| Tree-shaking | Not possible (dynamic requires) | Possible (bundlers can statically analyze unused exports) |
| Exported values | Copies of values at export time (for primitives) | Live bindings - importer sees updates to the exported variable |
| Async loading | No native support | `import()` returns a Promise (dynamic import) |
| Top-level `this` | `module.exports` (`{}`) | `undefined` |
| Circular deps | Returns partially-populated `exports` object | Live bindings can resolve correctly once fully evaluated, but TDZ-like issues can occur |

### Live bindings example (ESM-specific behavior)

```js
// counter.mjs
export let count = 0;
export function increment() { count++; }

// main.mjs
import { count, increment } from './counter.mjs';
console.log(count); // 0
increment();
console.log(count); // 1 - the import is a live, read-only view, not a snapshot
```

The equivalent in CommonJS would **not** update, because `require` copies the value of `count` at the time of import (unless you re-access via the module object, e.g. `counter.count`).

### Interview question

**Q: Why can't bundlers tree-shake CommonJS as well as ES Modules?**

**Strong answer:**
> "`require()` calls can be conditional, computed with a dynamic string, or wrapped in try/catch - they're just function calls evaluated at runtime, so a bundler can't always know statically which modules are actually used without running the code. `import`/`export` are declarative and must appear at the top level with static specifiers, so a bundler can build a complete dependency and usage graph at build time and safely drop unused exports. That static analyzability is also what enables `import()` dynamic imports to be reliably code-split."

### Practical relevance to your stack

- **NestJS/Node backend**: TypeScript typically compiles to CommonJS for Node unless you've opted into `"type": "module"` + ESM output - worth knowing which your `tsconfig.json`/`package.json` target, since it affects `__dirname`, top-level await, and interop with `import` syntax.
- **React/RN via Metro/webpack/Vite**: you write ESM syntax, but bundlers transform/tree-shake it; understanding static analyzability explains why `import { specificThing } from 'lodash-es'` tree-shakes but `import _ from 'lodash'` often doesn't.

---

## Full interview question bank (with answer targets)

### Scope & hoisting
1. **Lexical vs dynamic scope?** -> JS uses lexical; scope fixed at definition, not call site.
2. **`var` vs `let` vs `const`?** -> function vs block scope, hoisting/TDZ, reassignment rules.
3. **What is the Temporal Dead Zone?** -> gap between hoisting and initialization where access throws.
4. **Does `typeof` ever throw?** -> yes, on a TDZ variable.

### Closures
5. **Define a closure in one sentence.** -> function + its captured lexical scope, alive after outer function returns.
6. **Classic `var` loop bug and its fix?** -> shared binding across iterations; fix with `let` or an IIFE.
7. **Give a real-world use of a closure.** -> debounce/throttle, memoization, private counters/module pattern.

### `this`
8. **Four rules for `this` binding, in precedence order?** -> `new` > explicit (`call`/`apply`/`bind`) > implicit (method call) > default.
9. **How do arrow functions handle `this`?** -> no own `this`; lexically inherited.
10. **Why does a destructured method lose its `this`?** -> it becomes a bare function reference; call-site determines binding, and there's no more `obj.` prefix.

### Prototypes & classes
11. **Explain the prototype chain.** -> failed property lookups walk up `[[Prototype]]` links until `null`.
12. **Is `class` just sugar?** -> mostly, but with real differences (TDZ, strict mode, no-`new` throws, non-enumerable methods).
13. **Where do instance methods live in memory - per instance or shared?** -> shared, on the prototype (unless defined as arrow class fields).

### Coercion & equality
14. **List the 8 falsy values.** -> `false, 0, -0, 0n, '', null, undefined, NaN`.
15. **Why avoid `==`?** -> implicit, sometimes surprising coercion; `===` is predictable.
16. **How do you correctly test for `NaN`?** -> `Number.isNaN(x)`, not `x === NaN`.
17. **What does `1 + '1'` vs `'1' - 1` return, and why?** -> `'11'` (string wins for `+`); `0` (`-` always coerces to number).

### Modules
18. **CommonJS vs ES Modules - name 3 real differences.** -> resolution timing, tree-shaking capability, live bindings vs value copies.
19. **Why does ESM support tree-shaking better?** -> static, declarative import/export graph analyzable at build time.

---

## Hands-on drills (do these)

- [ ] Write a `for (var i ...)` loop with `setTimeout` that logs the wrong values, then fix it three ways: `let`, IIFE, and passing `i` as a parameter.
- [ ] Implement a `once(fn)` higher-order function using a closure that ensures `fn` only ever runs one time, caching and returning the first result on subsequent calls.
- [ ] Implement `bind` yourself (`Function.prototype.myBind`) using `apply`/`call` and a closure over the arguments.
- [ ] Build a two-level prototype chain manually with `Object.create` (no `class`, no constructor functions) and verify lookup with `Object.getPrototypeOf`.
- [ ] Convert a small constructor-function + `.prototype.method` example into an ES6 `class` and verify `Object.getPrototypeOf(instance) === ClassName.prototype` still holds.
- [ ] Write down 10 expressions using `==` that you predict wrong on the first try (find them online or invent your own), then verify in a REPL.
- [ ] Create two tiny files demonstrating CommonJS `require` value-copy behavior vs ESM live-binding behavior for an exported counter.

---

## Senior red flags / green flags

### Green flags interviewers love
- You explain hoisting as "declarations processed at compile time," not "code moves to the top."
- You immediately connect the `var`-in-loop bug to closures, not just memorize the fix.
- You can state the 4 `this`-binding rules with correct precedence, unprompted.
- You describe `class` as "prototypes with syntax and guardrails," not a separate OOP system.
- You default to `===` and explain the *one* accepted exception (`== null`).
- You know ESM tree-shaking is about static analyzability, not just "it's more modern."

### Red flags
- "Closures are when a function returns a function" (incomplete - misses scope capture).
- Cannot explain why `this` is `undefined` in a destructured/passed-as-callback method.
- Believes `class` fields and prototype methods are stored identically in memory.
- Says `==` and `===` are "basically the same, `===` is just stricter" without concrete coercion examples.
- Cannot explain why `NaN !== NaN` or gets flustered by it.

---

## Tie-backs to your experience

- Debugging stale closures in `useEffect`/`useCallback` dependency arrays directly uses this chapter's closure model - you can describe a real bug where a callback captured an old prop/state value.
- NestJS's decorator + DI system leans on prototypes, `Reflect.metadata`, and constructor parameter types - a concrete example ties classes/prototypes knowledge to backend work.
- React Native's Hermes engine is still just a JS engine - the same scope/closure/`this`/coercion rules apply identically to app code running there as they do in a browser or Node.

---

## Mastery checklist

- [ ] I can explain lexical scoping and the scope chain without hesitation.
- [ ] I can predict hoisting/TDZ behavior for any mix of `var`/`let`/`const`/`function`/`class`.
- [ ] I can write a closure-based `debounce` or `once` from memory.
- [ ] I can state the 4 `this` rules with correct precedence and explain arrow function exceptions.
- [ ] I can explain the prototype chain and what `class` really compiles down to.
- [ ] I can predict `==` coercion outcomes for at least 8 tricky examples.
- [ ] I can explain 3 concrete differences between CommonJS and ES Modules.
