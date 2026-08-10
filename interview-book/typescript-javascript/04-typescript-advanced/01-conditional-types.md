# 01. Conditional types

> Source: `interview-prep/typescript-javascript/04-typescript-advanced.md`

### Topics to learn
- [ ] Basic syntax: `T extends U ? X : Y`
- [ ] Distributive conditional types (conditional types distribute over union types automatically)
- [ ] `infer` keyword - extracting a type from within another type
- [ ] Practical built-ins implemented with conditional types: `Exclude`, `Extract`, `ReturnType`, `Awaited`
- [ ] When to reach for a conditional type vs when it's overkill

### Basic syntax

A conditional type picks between two types based on a type-level `extends` check - read `extends` here as "is assignable to," not class inheritance.

```ts
type IsString<T> = T extends string ? true : false;

type A = IsString<'hello'>; // true
type B = IsString<42>;      // false
```

### Distributive behavior over unions

When the checked type is a "naked" type parameter, conditional types automatically distribute over each member of a union:

```ts
type ToArray<T> = T extends any ? T[] : never;

type Result = ToArray<string | number>; // string[] | number[], NOT (string | number)[]
```

TypeScript evaluates the conditional once per union member and unions the results back together - this distributive behavior is what makes `Exclude`/`Extract` work correctly on unions without special-casing.

### `infer` - extracting a type mid-expression

`infer` lets you introduce a new type variable inside the `extends` clause, capturing part of a matched type for use in the result:

```ts
type ElementType<T> = T extends (infer U)[] ? U : never;

type A = ElementType<string[]>; // string
type B = ElementType<number[]>; // number
```

This is exactly how `ReturnType` and `Parameters` are actually implemented in TypeScript's standard library:

```ts
type MyReturnType<F> = F extends (...args: any[]) => infer R ? R : never;

function getUser() { return { id: '1', name: 'nika' }; }
type User = MyReturnType<typeof getUser>; // { id: string; name: string }
```

And `Awaited`, handling nested Promises:

```ts
type MyAwaited<T> = T extends Promise<infer U> ? MyAwaited<U> : T;

type A = MyAwaited<Promise<Promise<string>>>; // string - recursively unwraps
```

### Interview question

**Q: What does `infer` do, and can you give a real built-in example that uses it?**

**Strong answer:**
> "`infer` lets you capture a piece of a type you're pattern-matching against inside a conditional type, and reuse that captured piece in the result branch. The clearest real example is `ReturnType<F>`, which is defined roughly as `F extends (...args: any[]) => infer R ? R : never` - it matches any function type and captures whatever its return type is into `R`, then returns `R`. I've used this in practice to derive a response DTO type directly from an existing service method's return type, so the two never drift out of sync - `type UserDto = Awaited<ReturnType<typeof userService.findById>>`."

### When conditional types are overkill

For day-to-day application code, hand-writing a conditional type from scratch is relatively rare - most of the value comes from *using* the built-ins (`Exclude`, `Extract`, `ReturnType`, `Awaited`, `NonNullable`) that are already built this way, or occasionally reaching for a small custom one when deriving a type from an existing function/API shape saves real duplication. Being able to explain how they work, though, is what proves depth versus "memorized the utility type names."

---
