# 08. Full interview question bank (with answer targets)

> Source: `interview-prep/typescript-javascript/01-javascript-fundamentals.md`

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
