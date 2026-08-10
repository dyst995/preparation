# 01 - JavaScript Fundamentals — Introduction

> Source: `interview-prep/typescript-javascript/01-javascript-fundamentals.md`

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
