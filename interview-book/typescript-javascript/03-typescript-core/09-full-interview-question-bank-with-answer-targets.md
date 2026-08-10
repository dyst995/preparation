# 09. Full interview question bank (with answer targets)

> Source: `interview-prep/typescript-javascript/03-typescript-core.md`

### Type system basics
1. **Is TypeScript's type system structural or nominal?** -> structural (shape-based compatibility).
2. **Do TypeScript types exist at runtime?** -> no, fully erased during compilation.
3. **Can you `instanceof` check against an interface?** -> no, only against classes (which have a runtime prototype).

### `type` vs `interface`
4. **Name a capability `interface` has that `type` doesn't.** -> declaration merging.
5. **Name a capability `type` has that `interface` doesn't.** -> unions, tuples, mapped/conditional types, primitive aliases.

### Unions & narrowing
6. **What is a discriminated union, and why use one?** -> shared literal tag property enabling safe, exhaustive narrowing; prevents invalid field combinations.
7. **How does exhaustiveness checking with `never` work?** -> unhandled union member in a `default` branch fails to compile-check against a `never`-typed parameter.
8. **Name 4 ways to narrow a union type.** -> `typeof`, `instanceof`, `in`, custom type predicate (`x is T`).

### Generics
9. **Why use a generic instead of `any` for a reusable function?** -> preserves per-call-site type accuracy instead of discarding all type information.
10. **What does `<K extends keyof T>` buy you?** -> restricts `K` to actual property names of `T`, with precise indexed-access return types.

### Utility types
11. **How would you derive a PATCH DTO from a full entity type?** -> `Partial<Omit<Entity, 'serverManagedFields'>>`.
12. **What does `Awaited<T>` do?** -> unwraps the resolved value type from a (possibly nested) Promise type.

### `unknown` vs `any`
13. **Core difference between `unknown` and `any`?** -> `unknown` requires narrowing before use; `any` disables checking entirely and is contagious.
14. **Why type `catch` variables as `unknown`?** -> a thrown value can be any type; forces safe narrowing before property access.

### Enums vs unions
15. **Runtime cost difference between `enum` and a union of string literals?** -> enums generate a real JS object; literal unions are fully erased.
16. **What's the numeric enum reverse-mapping quirk?** -> `Enum[0]` maps back to the member name string, doubling the generated object's keys.

---
