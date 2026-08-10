# 03 - TypeScript Core — Introduction

> Source: `interview-prep/typescript-javascript/03-typescript-core.md`

> Goal: Explain the TypeScript type system's core building blocks - types vs interfaces, unions/intersections, narrowing, generics, utility types, `unknown` vs `any`, type guards, and enums vs unions - with the precision of someone who reads the compiler's reasoning, not just someone who silences red squiggles.

Mark progress with `[x]` as you master each topic.

---

## Learning objectives

By the end of this chapter you should be able to:

1. Explain what TypeScript's type system actually is (structural, erased at compile time) and why that matters for design decisions.
2. Choose between `type` and `interface` deliberately, citing real differences, not folklore.
3. Use union and intersection types correctly, and explain discriminated unions as a design pattern.
4. Narrow types using `typeof`, `instanceof`, `in`, discriminant properties, and custom type predicates.
5. Write and reason about generic functions, generic constraints, and generic components/hooks.
6. Use the built-in utility types (`Partial`, `Pick`, `Omit`, `Record`, `Readonly`, `ReturnType`, etc.) fluently and know when hand-writing a type is clearer.
7. Explain why `unknown` is safer than `any`, and use it correctly at API/library boundaries.
8. Contrast `enum` with union-of-string-literals and justify a default preference.

---
