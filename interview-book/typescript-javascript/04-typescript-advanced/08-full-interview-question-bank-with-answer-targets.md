# 08. Full interview question bank (with answer targets)

> Source: `interview-prep/typescript-javascript/04-typescript-advanced.md`

### Conditional & mapped types
1. **What does `infer` do?** -> captures part of a matched type inside a conditional type for reuse in the result.
2. **Are conditional types distributive over unions?** -> yes, when the checked type is a bare type parameter.
3. **How is `Partial<T>` actually implemented?** -> a mapped type adding `?` to every key: `{ [K in keyof T]?: T[K] }`.
4. **What does the `as` clause in a mapped type let you do?** -> remap/rename/filter keys programmatically, often with template literal types.

### Declaration merging
5. **How do you add a custom property to Express's `Request` type in a Nest app?** -> global augmentation merging into `interface Request` via `declare global { namespace Express { ... } }`.
6. **Can you augment a `type` alias the way you augment an `interface`?** -> no, only interfaces support declaration merging.

### React typing
7. **Why does `useState('idle')` sometimes need an explicit type parameter?** -> literal widening infers plain `string`, allowing any string value; explicit union locks it down.
8. **How do you type a generic list component?** -> a generic function component `<T>` with `items: T[]`, `renderItem: (item: T) => ReactNode`.
9. **Two `useRef` overloads - what's the difference?** -> DOM-node ref (`RefObject`, read-only `.current` semantics) vs mutable value ref (`MutableRefObject`, freely mutable).

### NestJS typing
10. **Why are DTOs classes, not interfaces, in NestJS?** -> validation decorators need a real runtime target (via reflect-metadata); interfaces are erased.
11. **How do you stop a sensitive field from leaking in an API response, beyond just typing it away with `Omit`?** -> construct an explicit response object/DTO at runtime, plus `class-transformer` `@Exclude()` + serializer interceptor as defense in depth.

### Strict mode
12. **What is `strict: true` really?** -> a bundle enabling ~8 individual compiler flags.
13. **Which strict flag has the biggest real-world impact, and why?** -> `strictNullChecks` - eliminates silent `null`/`undefined` assignability almost everywhere.
14. **What does `strictPropertyInitialization` enforce?** -> class properties must be initialized in the constructor/at declaration, or explicitly marked as possibly undefined.

---
