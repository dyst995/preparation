# 02. Part A - Rapid-fire recall (JavaScript)

> Source: `interview-prep/typescript-javascript/05-interview-questions-drills.md`

1. **What are the 8 falsy values?**
   `false, 0, -0, 0n, '', null, undefined, NaN`.

2. **`var` vs `let` vs `const` - one sentence each.**
   `var`: function-scoped, hoisted and initialized to `undefined`. `let`: block-scoped, hoisted into the TDZ, reassignable. `const`: block-scoped, hoisted into the TDZ, cannot be reassigned (but object contents remain mutable).

3. **What is the Temporal Dead Zone?**
   The period between a `let`/`const`/`class` binding being hoisted and its actual declaration line executing, during which any access throws a `ReferenceError`.

4. **Define a closure.**
   A function combined with references to the variables from its enclosing lexical scope, which remain accessible even after the outer function has returned.

5. **What are the 4 `this`-binding rules, in precedence order?**
   `new` binding > explicit binding (`call`/`apply`/`bind`) > implicit binding (method call) > default binding (bare call, `undefined` in strict mode).

6. **How do arrow functions handle `this`?**
   They have no `this` of their own - they lexically inherit `this` from the enclosing scope at definition time.

7. **Is `class` just syntactic sugar over prototypes?**
   Mostly, but with real differences: always strict mode, TDZ instead of hoisting the body, calling without `new` throws, and methods are non-enumerable by default.

8. **Why avoid `==` in favor of `===`?**
   `==` performs often-surprising implicit type coercion before comparing; `===` never coerces, making behavior predictable. The one broadly accepted exception is `value == null` to check for both `null` and `undefined` at once.

9. **Why is `NaN !== NaN`?**
   Per the IEEE-754 spec, `NaN` is defined to never equal anything, including itself. Use `Number.isNaN(x)` to test for it correctly.

10. **CommonJS vs ES Modules - two real differences.**
    CommonJS resolves `require()` dynamically at runtime and copies exported primitive values; ES Modules are statically analyzable at parse time (enabling tree-shaking) and export live bindings that update when the source variable changes.

---
