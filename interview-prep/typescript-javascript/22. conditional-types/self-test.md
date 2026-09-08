# Conditional Types — Self-test

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
