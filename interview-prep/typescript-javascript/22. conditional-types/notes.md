# Conditional Types

## What you need to know

A **conditional type** chooses between two types with a type-level test:

```ts
T extends U ? X : Y
```

Read `extends` as **“is assignable to”**, not class inheritance.

This machinery powers `Exclude`, `Extract`, `NonNullable`, `ReturnType`, `Parameters`, `Awaited`, and custom “unwrap / branch on shape” helpers.

Curriculum checklist:

- Basic `T extends U ? X : Y`
- Distributive conditionals over unions
- `infer` to capture matched pieces
- How key built-ins are implemented
- When custom conditionals are overkill vs justified

Prerequisites: [Generics](../18.%20generics/notes.md), [Utility types](../19.%20utility-types/notes.md).

---

## Basic syntax

```ts
type IsString<T> = T extends string ? true : false;

type A = IsString<'hello'>; // true
type B = IsString<42>; // false
```

### Why it exists

Generics alone parameterize; conditionals **branch** on relationships between types — filter unions, unwrap wrappers, pick APIs based on input shape.

```ts
type IdOf<T> = T extends { id: infer Id } ? Id : never;
```

---

## Distributive conditional types

### The rule

When the type being checked is a **naked type parameter** (just `T`, not wrapped in a tuple/array/etc.), and `T` is a **union**, the conditional runs **once per member**, then unions the results:

```ts
type ToArray<T> = T extends any ? T[] : never;

type Result = ToArray<string | number>;
// string[] | number[]
// NOT (string | number)[]
```

Evaluation sketch:

```ts
ToArray<string> | ToArray<number>
→ string[] | number[]
```

This is why `Exclude` / `Extract` work on unions.

### `Exclude` / `Extract` (library shape)

```ts
type MyExclude<T, U> = T extends U ? never : T;
type MyExtract<T, U> = T extends U ? T : never;

type S = 'a' | 'b' | 'c';
type WithoutB = MyExclude<S, 'b'>; // 'a' | 'c'
type OnlyB = MyExtract<S, 'b'>; // 'b'
```

`never` disappears from unions — filtering by replacing rejected members with `never`.

### Turning distribution off

Wrap the parameter so it’s not “naked”:

```ts
type ToArrayNonDist<T> = [T] extends [any] ? T[] : never;
type Result = ToArrayNonDist<string | number>; // (string | number)[]
```

Use this when you want to treat the union as **one** unit.

---

## `infer` — capture a piece of a match

### What it does

Inside an `extends` clause, `infer Name` introduces a **new type variable** bound to whatever matched that position, usable in the true branch.

```ts
type ElementType<T> = T extends (infer U)[] ? U : never;

type A = ElementType<string[]>; // string
type B = ElementType<number[]>; // number
type C = ElementType<string>; // never
```

### `ReturnType` / `Parameters` style (preserved)

```ts
type MyReturnType<F> = F extends (...args: any[]) => infer R ? R : never;

function getUser() {
  return { id: '1', name: 'nika' };
}
type User = MyReturnType<typeof getUser>;
```

```ts
type MyParameters<F> = F extends (...args: infer P) => any ? P : never;
```

### Recursive unwrap — `Awaited` style (preserved)

```ts
type MyAwaited<T> = T extends Promise<infer U> ? MyAwaited<U> : T;

type A = MyAwaited<Promise<Promise<string>>>; // string
```

**Interview answer (preserved):**

> `infer` captures a matched piece of a type in a conditional and reuses it in the result. `ReturnType` is roughly `F extends (...args: any[]) => infer R ? R : never`. Practically: `type UserDto = Awaited<ReturnType<typeof userService.findById>>` so DTOs don’t drift from the service.

### Multiple `infer`s

```ts
type FirstArg<F> = F extends (first: infer A, ...rest: any[]) => any ? A : never;
```

If the pattern doesn’t match, the false branch runs (`never` in many helpers).

---

## Practical patterns (when custom is worth it)

| Goal | Approach |
|---|---|
| Filter union | `Exclude` / `Extract` (don’t reinvent) |
| Unwrap Promise | `Awaited` |
| Function I/O types | `ReturnType` / `Parameters` |
| Property type if present | `T extends { x: infer X } ? X : never` |
| Flatten one level of array | `T extends (infer U)[] ? U : T` |

Nest/React examples:

```ts
type ServiceResult<T> = Awaited<ReturnType<T extends (...args: any) => any ? T : never>>;
// usually just: Awaited<ReturnType<typeof service.method>>
```

Prefer built-ins first; custom conditionals when derivation removes real duplication.

---

## When conditional types are overkill (preserved)

Day-to-day app code rarely needs hand-rolled conditionals. Most value is **using** built-ins. Write a custom one when:

- You’re deriving from an existing function/API shape and duplication would drift  
- You’re building a shared library/util type  

Explaining *how* `Exclude`/`ReturnType` work proves depth beyond memorizing names.

---

## Edge cases worth knowing

1. **`never` distributes:** `never extends X ? A : B` can behave surprisingly because `never` is an empty union — distribution yields `never`.  
2. **Order of `extends` checks** matters for overlapping patterns — put more specific patterns first (like overload order).  
3. **`any` in checks:** `any extends X` often takes both branches in odd ways — avoid baking `any` into conditional logic.  
4. Distribution only for **naked** type params in the checked position.

---

## Common mistakes and misconceptions

1. Reading `extends` as inheritance-only.  
2. Expecting `ToArray<string | number>` → `(string | number)[]` without disabling distribution.  
3. Using `infer` outside an `extends` clause.  
4. Reimplementing `ReturnType` poorly instead of using the built-in.  
5. Writing deep recursive conditionals for one-off app DTOs (overkill / slow checker).  
6. Forgetting `never` members vanish from unions (the filter trick).

---

## Connections to other concepts

```
T extends U ?
  → type-level if
    → distribute over unions
      → Exclude / Extract

infer R
  → bind matched piece
    → ReturnType / Parameters / ElementType

Promise<infer U>
  → recursive Awaited

utility types chapter
  → consumers of this machinery

mapped types (next)
  → transform keys/properties; often combined with conditionals
```

---

## Interview perspective

You should be able to:

1. Read `T extends U ? X : Y` as assignability branching.  
2. Explain distribution with `string[] | number[]` vs `(string | number)[]`.  
3. Define `infer` and implement sketch `ReturnType`.  
4. Sketch recursive `Awaited`.  
5. Say when to stop at built-ins vs write custom.

---

# Self-test

## Core recall

1. What does `T extends U ? X : Y` mean?
2. What is a distributive conditional type?
3. What does “naked type parameter” matter for?
4. What does `infer` do?
5. Rough definition of `Exclude<T, U>` using a conditional?
6. Rough definition of `ReturnType<F>` using `infer`?
7. How does a simplified recursive `Awaited` work?
8. How do you prevent a conditional from distributing over a union?

## Explain why

1. Why does `ToArray<string | number>` become `string[] | number[]`?
2. Why does replacing a union member with `never` remove it from the union?
3. Why is `infer` useful for `ReturnType` instead of forcing users to duplicate return interfaces?
4. Why recurse in `Awaited` instead of unwrapping once?
5. Why are hand-rolled conditionals often overkill in Nest/React app code?
6. Why wrap `T` as `[T]` to disable distribution?

## Compare and contrast

1. Conditional types vs JS ternary at runtime  
2. Distributive vs non-distributive conditionals  
3. `Exclude` vs `Omit`  
4. `infer` vs generic type parameters on the type alias itself  
5. Using `ReturnType` vs writing a custom conditional that only works for one function  
6. `Extract` vs discriminated-union narrowing at the value level  

## Predict the output / resulting type

Explain why.

1.
```ts
type T = string | number extends string ? 'yes' : 'no';
```

2.
```ts
type ToArray<T> = T extends any ? T[] : never;
type R = ToArray<'a' | 'b'>;
```

3.
```ts
type Elem<T> = T extends (infer U)[] ? U : never;
type R = Elem<boolean[]>;
```

4.
```ts
type Excl<T, U> = T extends U ? never : T;
type R = Excl<'x' | 'y' | 'z', 'y'>;
```

5.
```ts
type Ret<F> = F extends (...args: any[]) => infer R ? R : never;
type R = Ret<() => Promise<number>>;
```

6.
```ts
type Await1<T> = T extends Promise<infer U> ? U : T;
type R = Await1<Promise<Promise<string>>>;
```

7.
```ts
type Box<T> = [T] extends [string] ? 'str' : 'other';
type R = Box<string | number>;
```

## Debugging

1. Author expected `(string | number)[]` but got `string[] | number[]` from `T extends any ? T[] : never`. Fix intent.

2. `type R = ReturnType<typeof fn>` errors because `fn` is overloaded / generic in a tricky way — what do you check first?

3. Custom `Flatten` infinite recursion on the type checker — what pattern usually causes that?

4. `type Id<T> = T extends { id: string } ? T['id'] : never` fails to capture `number` ids — improve with `infer`.

## Application

1. Implement `MyNonNullable<T>` with a conditional (distribute away nullish).

2. Implement `UnwrapArray<T>` that gets element type or `T` if not an array.

3. Write `PropType<T, K extends string>` that is `T[K]` if `T` has `K`, else `never`, using `infer` or `extends`.

4. Derive `type User = Awaited<ReturnType<typeof fetchUser>>` style alias from a fake async function you define.

5. Implement `MyExtract<T, U>` and test on a string literal union.

## Interview questions

1. What does `infer` do, and give a built-in example?  
   **Follow-ups:** `Awaited`? Practical Nest/service use?

2. Explain distributive conditional types.  
   **Follow-ups:** How do `Exclude`/`Extract` use that? How to disable?

3. How would you unwrap `Promise<Promise<T>>` at the type level?

4. When should you write a custom conditional vs use a utility?

5. What does `extends` mean in `T extends U ? …`?

## Connections

1. How do conditional types implement utilities from the utility-types unit?
2. How does distribution relate to union modeling / filtering variants?
3. How will mapped types combine with conditionals (e.g. optional keys)?
4. How does `ReturnType` + `Awaited` reduce drift vs hand-written DTOs (erasure still needs runtime validation)?
5. Why is assignability (`extends`) the same concept used in generic constraints?
