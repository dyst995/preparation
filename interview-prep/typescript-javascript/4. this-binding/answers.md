# `this` Binding — Answers

## Core recall

1. **Answer:** The **call site** — how the function is invoked — primarily determines `this` for ordinary functions.  
   **Why:** `this` is not looked up on the scope chain like a variable (unless the function is an arrow). Binding rules key off `new`, `call`/`apply`/`bind`, member-expression calls, or bare default calls.

2. **Answer (highest → lowest):** `new` → explicit (`call` / `apply` / `bind`) → implicit (`obj.method()`) → default (bare `fn()`).  
   **Why:** Spec/call semantics prefer construction, then programmer-set receivers, then the call’s base object, then the fallback.

3. **Answer:** Strict: `undefined`. Sloppy: the global object (`globalThis` / `window`).  
   **Why:** Strict mode refuses to invent a receiver; sloppy mode historically coerced bare calls to the global object. Modules and class bodies are always strict.

4. **Answer:** `obj` — the object left of the final property access (the receiver).  
   **Why:** Implicit binding: a member-expression call `receiver.fn(...)` sets `this` to that receiver.

5. **Answer:** `call` — invoke immediately with given `thisArg` and listed args. `apply` — same, but args as an array/array-like. `bind` — return a **new** function permanently tied to `thisArg` (optional partial args).  
   **Why:** Explicit binding lets you set the receiver when the eventual call site would otherwise be bare.

6. **Answer:** The newly created instance (unless the constructor returns another object).  
   **Why:** `new` creates an object, links `[[Prototype]]`, then calls the function with `this` bound to that object.

7. **Answer:** Lexically — from the enclosing scope’s `this`. They have no own `this` binding and ignore call-site rules for `this`.  
   **Why:** Arrows treat `this` like a captured outer value, not a call-site slot.

8. **Answer:** `this.handleClick` is a bare function reference; React later calls it as a plain callback, not as `component.handleClick()`, so implicit binding never applies and `this` is `undefined` (classes are strict).  
   **Why:** Detaching the method turns an implicit call into a default call.

---

## Explain why

1. **Answer:** `const fn = obj.method` copies the function reference; `fn()` is a bare call → default binding, not `obj`.  
   **Why:** Implicit binding requires the call shape `obj.method()`, not a free-standing invoke of the same function value.

2. **Answer:** Object-literal arrows do not capture the literal as `this`. They capture whatever `this` was in the enclosing lexical scope (often `undefined` in ES modules).  
   **Why:** The object literal does not create a `this` binding for the arrow to close over; call site is ignored for arrows.

3. **Answer:** `setTimeout` stores and later bare-calls the function (no receiver). Implicit binding is lost → default `this`.  
   **Why:** Timers invoke callbacks as standalone functions unless you bind or wrap them.

4. **Answer:** A class field arrow is created per instance in a context where `this` is already the instance, so the arrow lexically captures that instance forever — including when React bare-calls the handler.  
   **Why:** Lexical `this` survives detachment; a prototype method’s `this` does not.

5. **Answer:** Construction defines a new receiver; `new Bound()` still constructs with that new instance as `this`, overriding the `thisArg` stored by `bind`.  
   **Why:** Among the four ordinary rules, `new` has highest precedence (`new` > bind).

6. **Answer:** Only arrows (and similar lexical-`this` forms) get lexical `this`. Ordinary functions get call-site `this`. Saying “`this` is lexical” erases the four binding rules that interviews test.  
   **Why:** The accurate sentence is: variables are lexical; ordinary `this` is call-site; arrows make `this` lexical.

---

## Compare and contrast

1. **Implicit vs default:** Implicit needs `receiver.fn()` → `this === receiver`. Default is bare `fn()` → `undefined` (strict) or global (sloppy). Detaching a method converts implicit → default.

2. **`call`/`apply` vs `bind`:** `call`/`apply` invoke **now** with a chosen `thisArg`. `bind` returns a **new** function whose `this` (and optional partial args) stay fixed for later calls. Bound `this` generally sticks against later rebinding attempts.

3. **Ordinary vs arrow `this`:** Ordinary → four call-site rules. Arrow → no own `this`; resolves like enclosing lexical `this`; call shape does not change it; cannot be used as `new` constructors.

4. **Closures vs ordinary `this`:** Closures capture **variable bindings** from lexical scope. Ordinary `this` answers “which **receiver**?” from the call site. Same function can close over `x` lexically while still getting a different `this` each call.

5. **React fixes — tradeoffs:**  
   - Constructor `bind`: one bound function per instance, explicit, classic.  
   - Class field arrow: lexical stability, per-instance allocation, clean syntax.  
   - Inline render arrow: restores call shape, new function each render (memo/`PureComponent`/`React.memo` child concern).  
   Function components avoid the issue (no `this`).

6. **Nested receiver:** `obj.nested.fn()` sets `this` to `obj.nested` — the **last** link before the call — not the outermost `obj`.

---

## Predict the output

1. **`undefined`.** Strict bare call → default binding is `undefined`.

2. **`1`, then failure/`undefined` access.** `obj.read()` → implicit `this === obj` → `1`. `r()` is bare → default `this` (`undefined` in strict/module) → reading `.x` throws or yields nonsense depending on mode/runtime; in browsers without strict, may read global `x`.

3. **Typically `undefined` (module / outer `this`).** Arrow ignores `obj.a()` call shape; captures enclosing lexical `this`, not `obj`.

4. **`'Ada'`.** `greet.call(p)` explicitly sets `this` to `p`.

5. **`'Bea'`.** `new` creates an instance, binds `this` to it, assigns `this.name`.

6. **`'obj'`.** `regular()` runs with `this === obj`; returned arrow lexically captures that `this`, so `g()` still sees `obj`.

7. **`undefined` (optional chaining → `undefined`).** Inner ordinary function is bare-called → default `this`; `this?.name` is `undefined` in strict/module.

8. **When the timer fires: default binding.** `setTimeout` bare-calls `read` → `this` is `undefined` (strict); reading `this.n` would throw if logged. Timer does not preserve `obj` as receiver.

9. **`true`, `true`.** `bound()` keeps bind’s `thisArg` (`o`). `o.f()` uses implicit binding → `o`.

10. **`'nest'`.** Receiver is `outer.nest`, not `outer`.

---

## Debugging

1. **Diagnosis:** Passing `this.onSelect` detaches the method; React bare-calls it → `this` is `undefined` → `setState` throws.  
   **Fixes:**  
   - Constructor: `this.onSelect = this.onSelect.bind(this)`  
   - Field arrow: `onSelect = () => { this.setState({ open: false }); }`  
   - Inline: `onClick={() => this.onSelect()}`  
   Prefer function components long-term.

2. **Diagnosis:** `fn = calculator[methodName]` then `fn(5)` is a bare call → `this` is not `calculator`, so `this.value += 5` misses the object (throws in strict or mutates wrong target). Value stays `0`.  
   **Fix (no object arrow):** `fn.call(calculator, 5)` / `fn.apply(calculator, [5])` / `calculator[methodName](5)` / `fn.bind(calculator)(5)`.

3. **Diagnosis:** `forEach`’s callback is an ordinary function bare-called (default `this`), so `this.name` is wrong/`undefined`.  
   **Arrow fix:** `this.friends.forEach((f) => { console.log(this.name + ' knows ' + f); });` — arrow captures `printFriends`’s `this` (`person`).  
   **thisArg fix:** `this.friends.forEach(function (f) { ... }, this);`

4. **Diagnosis:** Destructuring `{ inc } = c` detaches the prototype method; `inc()` → default `this` → cannot increment instance `n` (throws or no-ops wrongly).  
   **Fix:** `c.inc()`, `inc.call(c)`, or `inc = c.inc.bind(c)`, or make `inc` an arrow field if you need detachable handlers.

---

## Application

1.
```js
function bindAll(obj, methodNames) {
  for (const name of methodNames) {
    if (typeof obj[name] === 'function') {
      obj[name] = obj[name].bind(obj);
    }
  }
  return obj;
}
```
**Why:** Replaces each method with a bound function so later bare calls keep `obj` as `this`.

2.
```js
const sayHi = intro.bind({ name: 'Ada' });
sayHi('Hello'); // 'Hello Ada'
```
**Why:** `bind` fixes `this` and returns a reusable function; greeting stays a free argument.

3. **Arrow version:**
```js
const obj = {
  label: 'tick',
  start() {
    setTimeout(() => {
      console.log(this.label); // this === obj
    }, 0);
  },
};
```
**Bind version:**
```js
start() {
  setTimeout(
    function () {
      console.log(this.label);
    }.bind(this),
    0,
  );
}
```
**Why:** Arrow captures `start`’s `this`; `bind` forces the callback’s `this` to the same receiver.

4.
```js
function Point(x, y) {
  this.x = x;
  this.y = y;
}
const p = new Point(1, 2); // { x: 1, y: 2 }

'use strict';
Point(3, 4); // TypeError: Cannot set properties of undefined (setting 'x')
```
**Why:** Without `new`, default `this` is `undefined` in strict mode, so assigning `this.x` throws. With `new`, `this` is the new instance.

---

## Interview questions

1. **Spoken:** “For ordinary functions, `this` is determined by the call site: `new`, then `call`/`apply`/`bind`, then `obj.fn()`, else default (`undefined` in strict). Arrow functions skip that ladder and use lexical `this` from the enclosing scope.”  
   **Follow-ups:** Precedence is `new > explicit > implicit > default`. Arrows sit outside those four rules.

2. **Spoken:** “Passing a method passes the function value without the call’s receiver. The API bare-calls it later, so implicit binding never applies and you get default `this`.”  
   **Follow-ups:** `bind` freezes `thisArg` on a new function; an arrow captures the outer `this` lexically so call site no longer matters.

3. **Spoken:** “`onClick={this.handleClick}` stores a detached reference. React calls it as a plain function, classes are strict, `this` is `undefined`, and `this.props`/`setState` blow up.”  
   **Follow-ups:** Fixes — constructor bind, class field arrow, inline arrow. Function components have no `this` to lose.

4. **Spoken:** “`call` and `apply` invoke immediately with a chosen `this` (args listed vs array). `bind` returns a permanently this-bound function for later.”  
   **Follow-ups:** You generally cannot re-bind a bound function’s `this` with later `call` the way beginners expect — the bound `this` sticks (`new` is the special high-precedence case).

5. **Spoken:** “No — an arrow’s `this` does not depend on how you call it; it always uses the enclosing lexical `this`.”  
   **Follow-ups:** In an ES module object literal, that outer `this` is typically `undefined`, so `obj.arrow()` still won’t see `obj`.

---

## Connections

1. **Answer:** Lexical scope/closures answer which **variable binding** is visible from where the function was written. Ordinary `this` answers which **receiver object** the call used. Same function can close over lexicals while `this` still changes per call.  
   **Why:** Different lookup mechanisms — scope chain vs call-site binding rules.

2. **Answer:** Arrows have no own `this` slot, so evaluating `this` walks outward like capturing an outer binding — the same “closed over” intuition as variables, applied to `this`.  
   **Why:** That is why nested timer arrows keep the outer method’s receiver.

3. **Answer:** In modules/classes (strict), lost `this` becomes `undefined` and usually throws on property access — loud failures. In sloppy scripts, bare calls hit the global object and can silently pollute or read globals — quieter, nastier bugs. Modern React/TS/ESM makes the strict failure the common case.  
   **Why:** Strictness changes the default-binding outcome, not the fact that detachment loses implicit binding.

4. **Answer:** Lost-`this`: wrong/missing receiver at call time (often `undefined`). Stale closure: correct lexical capture of an **old variable value** (e.g. props/state from a previous render). Different mechanisms, similar “handler looks wrong” symptoms.  
   **Why:** One is call-site binding; the other is closed-over bindings that didn’t update.

5. **Answer:** Prototype/`class` methods live as shared functions on `Ctor.prototype`; when you call `instance.method()`, lookup finds the function on the chain, then **`this` binding** still decides the receiver from the call site. Detaching the method is still a `this` bug, not a “method disappeared from the prototype” bug.  
   **Why:** Prototypes answer *where the function is found*; `this` answers *who it was called on*.
