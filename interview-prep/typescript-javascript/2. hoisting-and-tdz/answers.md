# Hoisting and the Temporal Dead Zone — Answers

## Core recall

1. Before a scope’s statements run, the engine **creates bindings** for that scope’s declarations and initializes them by kind. Assignments still run in **source order**. “Hoisted” means the binding exists from scope entry — not that source text was rewritten.

2. **`undefined`.**

3. From scope entry until the `let`/`const`/`class` declaration line finishes initializing, the binding **exists but is uninitialized**. Any access throws `ReferenceError`.

4. **`function` declarations** (fully initialized with the function object at scope entry). Not function expressions/arrows; not `class`.

5. The **`const foo` binding** is created at scope entry (in TDZ). The **arrow function value** is created only when the assignment/declaration line runs — that value is not “hoisted.”

6. **No.** Classes are TDZ’d like `let`. Early `new Person()` / access → **`ReferenceError`** (typically “before initialization”).

7. **Yes.** `typeof` on a TDZ `let`/`const`/`class` binding throws `ReferenceError`. `typeof` on a truly undeclared name returns `'undefined'`.

## Explain why

1. It predicts some `var` outcomes but fails on TDZ, different init rules, and the fact that **assignments stay in place**. Interviewers want create-then-initialize, not “code moved upward.”

2. Early `undefined` from `var` **masks ordering bugs**. TDZ fails **loudly** on use-before-init. It also makes shadowing safer: an inner `let x` is not accidentally read as outer `x` before the inner line.

3. At block entry the **inner** `let`/`const x` already shadows outer `x` and sits in TDZ. Lookup finds the inner binding and throws — it does **not** fall through to the outer value.

4. **`var fn = function(){}`:** binding exists as `undefined` → call → **`TypeError`** (not a function). **`let fn = function(){}`:** binding in TDZ → access → **`ReferenceError`**. Same “early call” idea; different initialization rules → different errors.

5. Function declarations are **fully initialized** early (historical/mutual-recursion convenience). Classes need heritage/`extends` evaluation and stricter init — treated like **`let` (TDZ)** so you can’t use a half-ready constructor.

## Compare and contrast

1. Both create bindings at scope entry. **`var`:** initialized to `undefined`, early read is silent. **`let`:** uninitialized (TDZ) until its line; early access throws.

2. **Declaration `function foo(){}`:** callable before its line. **Expression `var/let/const foo = function…` / arrow:** only the variable follows `var`/`let`/`const` rules; the function value appears at assignment — early call fails (`TypeError` or `ReferenceError`).

3. **`typeof undeclared`:** `'undefined'` (no binding). **`typeof` TDZ `let`:** throws `ReferenceError` (binding exists, uninitialized).

4. **TDZ:** binding is in this scope but not initialized yet — message often “Cannot access 'x' before initialization.” **Undeclared:** no binding on the chain — “x is not defined.” Same error type name; different cause.

5. **`TypeError` (not a function):** you successfully read a binding whose value is `undefined` (classic early `var` function expression). **TDZ `ReferenceError`:** you never got a value — access was illegal before init.

6. **Scope (place):** where is this binding allowed / which environment owns it? **Hoisting/TDZ (time):** within that scope, when does the binding exist and when is it usable?

## Predict the output

1. **Logs `undefined`.** `var a` created and set to `undefined` at scope entry; assignment `a = 1` has not run yet.

2. **`ReferenceError` (TDZ).** `let b` exists but is uninitialized until its line.

3. **Logs `5`.** Function declaration `sum` is fully hoisted and callable early.

4. **`TypeError`:** `add` is `undefined` (var-hoisted), then `undefined(2, 3)` is not a function.

5. **First log `'undefined'`; second throws `ReferenceError`.** `var foo` → early `typeof` sees `undefined`. `let bar` in TDZ → even `typeof` throws. (If both ran: you’d never reach assigning either.)

6. **`'undefined'`** (expression result). No binding named `undeclaredVar`; `typeof` is safe for missing names.

7. **`ReferenceError`.** Inner `const x` shadows from block entry and is in TDZ at `console.log(x)` — does not read outer `'outer'`.

8. **`TypeError`.** `var foo` is `undefined` at call time; function value assigned later.

9. **`ReferenceError`.** `class Person` is in TDZ until its declaration line; unlike `function` decls.

10. **Logs `undefined`, then `ReferenceError`.** `var a` → `undefined`; `let b` → TDZ on second log (function never finishes cleanly).

11. **`ReferenceError`.** RHS of `let x = x` reads `x` while still in TDZ.

12. **Logs `'ok'`.** Inner `function h` is hoisted within `g`, so `return h()` works before `h`’s line in the source.

## Debugging

1. **Diagnosis:** `var config` is created as `undefined` at function entry, so `!config` is always true on entry — the “missing config” branch runs even though a declaration exists later. Then `var config = { debug: true }` overwrites and `init()` returns `{ debug: true }`. Authors often think `config` is undeclared until that line; hoisting makes the guard lie.  
   **Fix:** initialize first (`let config = { debug: true }; return config`), or use `let`/`const` in source order so use-before-init fails loudly instead of looking like a missing value.

2. **`typeof A` throws `ReferenceError` (TDZ on `class A`)** — second log never runs. If order were reversed conceptually: `typeof B` would be `'undefined'` because `var B` exists as `undefined` before `B = class {}`. Actual: dies on first line.

3. **Misconception:** “`let` isn’t hoisted ⇒ early read sees outer.” **Reality:** inner `let name` **is** hoisted into the function’s TDZ and shadows immediately → **`ReferenceError`**, not `'outer'`.

4. **`TypeError`** (not `ReferenceError`): `var greet` is `undefined`; calling it fails because `undefined` is not a function. Root cause: function **expression** / arrow assigned to `var`, not a function declaration.

## Application

1.
```js
function helper() {
  console.log('go');
}
function start() {
  helper();
}
start();
```
Initialization is obvious top-to-bottom; no reliance on declaration hoisting for call order.

2.
```js
// throws
typeof x;
let x = 1;

// safe missing name
typeof totallyMissing; // 'undefined'
```

3.
```js
export const createId = () => Math.random().toString(36).slice(2);
console.log(createId()); // must come AFTER the const init
```
**Constraint:** with `const`/arrow, the call cannot appear above the declaration (TDZ); reorder so init precedes use.

4.
```js
const mode = 'outer';
// throws — TDZ + shadow
{
  console.log(mode);
  const mode = 'inner';
}
// safe — read outer before introducing inner binding
{
  console.log(mode); // 'outer'
}
{
  const mode = 'inner';
  console.log(mode); // 'inner'
}
```

## Interview questions

1. **Spoken:** “Before a scope runs, JS registers its declarations. `var` starts as `undefined`, function declarations are fully ready, and `let`/`const`/`class` exist but stay uninitialized until their line — that’s the TDZ. Assignments still happen in source order.”  
   **Follow-ups:** Yes, `let` hoists as a binding but not as a usable value. TDZ = time from scope entry until init when access throws.

2. **Spoken:** “`typeof foo` logs `'undefined'` because `var foo` exists as `undefined`. `typeof bar` throws because `let bar` is in the TDZ.”  
   **Follow-ups:** `typeof` only soft-fails for *undeclared* names; TDZ bindings are declared-but-uninitialized, so access is illegal.

3. **Spoken:** “No — class declarations are TDZ’d like `let`. You get a ReferenceError if you `new` them early.”  
   **Follow-ups:** Function declarations are fully initialized at scope entry and *can* be called early; classes are not.

4. **Spoken:** “A function declaration installs the function object at scope entry. A function expression only assigns when that line runs — the variable follows `var`/`let`/`const` rules.”  
   **Follow-ups:** Early `function foo(){}` call works. Early `var foo = function(){}` → TypeError. Early `let foo = function(){}` → ReferenceError.

5. **Spoken:** “TDZ makes use-before-init a loud failure instead of silent `undefined`, and stops shadowed inner bindings from accidentally reading outer values before init.”  
   **Follow-ups:** Show block with outer `const x` and early `console.log(x)` before inner `const x` → throws, doesn’t print outer.

## Connections

1. **Scope** places the `var` on the function/global environment. **Hoisting** means that binding is created as `undefined` at entry, so early reads see `undefined` until the assignment line runs.

2. At block/function entry the inner `let x` is already the nearest binding and is uninitialized — so an early read hits TDZ instead of “seeing through” to outer `x`.

3. Early returns/`if (!flag)` that read a `var` declared later often return `undefined` or take the wrong branch — **ordering + `var` init**, not closures. Closures are about retained outer environments after escape.

4. Modules are strict and favor `let`/`const`/exports: talk create-then-initialize and TDZ, not “slide `var` to the top.” You still get TDZ inside module scope; you just avoid classic-script `var` footguns more often.
