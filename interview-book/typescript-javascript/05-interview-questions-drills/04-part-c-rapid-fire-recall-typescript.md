# 04. Part C - Rapid-fire recall (TypeScript)

> Source: `interview-prep/typescript-javascript/05-interview-questions-drills.md`

20. **Structural vs nominal typing - which does TypeScript use?**
    Structural - type compatibility is based on shape, not declared name/relationship.

21. **Do TypeScript types exist at runtime?**
    No, they're fully erased during compilation - `instanceof` against an `interface` is impossible because nothing remains at runtime to check.

22. **Name one thing `interface` can do that `type` cannot, and vice versa.**
    `interface` supports declaration merging (multiple same-name declarations combine). `type` can express unions, tuples, and mapped/conditional types, which `interface` cannot.

23. **What is a discriminated union, and why prefer it over an all-optional-fields object?**
    A union of object shapes sharing a literal "tag" property that TypeScript uses to narrow the whole shape safely; it prevents constructing invalid field combinations that an all-optional object would silently allow.

24. **Name 4 ways to narrow a TypeScript union type.**
    `typeof`, `instanceof`, the `in` operator, and a custom type predicate (`function isX(v): v is X`).

25. **What does `<K extends keyof T>` buy you in a generic function?**
    It restricts `K` to actual property names of `T`, catching typos at compile time, and lets the return type be inferred precisely via indexed access (`T[K]`).

26. **`unknown` vs `any` - core difference?**
    `any` disables type checking entirely and is contagious to anything it touches; `unknown` is type-safe - it can hold anything, but you must narrow it before use.

27. **Why are `catch` clause variables typed as `unknown` in modern TypeScript?**
    A thrown value can genuinely be any type, not just `Error`; typing it `unknown` forces a narrowing check (e.g. `instanceof Error`) before accessing any property, preventing a runtime crash if something unexpected was thrown.

28. **Runtime cost difference between `enum` and a union of string literals?**
    `enum` compiles to a real JS object shipped in the bundle; a union of string literals is fully erased at compile time with zero runtime footprint.

29. **What does `infer` do inside a conditional type?**
    It introduces a new type variable that captures part of a matched type, for reuse in the conditional's result branch - e.g. `ReturnType<F>` uses it to capture a function's return type.

30. **How is `Partial<T>` actually implemented under the hood?**
    As a mapped type: `{ [K in keyof T]?: T[K] }` - it iterates every key of `T` and adds an optional modifier.

31. **Why are NestJS DTOs written as classes rather than interfaces?**
    Validation decorators (`@IsEmail()`, etc.) need a real runtime construct to attach `reflect-metadata` to; interfaces are fully erased at compile time, so there's nothing left at runtime for a decorator to attach to.

32. **What does `strict: true` actually enable?**
    A bundle of roughly 8 individual compiler flags, most impactfully `strictNullChecks` (no silent `null`/`undefined` assignability) and `noImplicitAny` (no silently inferred `any`).

---
