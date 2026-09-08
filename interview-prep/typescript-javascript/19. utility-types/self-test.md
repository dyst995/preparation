# Utility Types — Self-test

## Core recall

1. What does `Partial<T>` do? `Required<T>`? `Readonly<T>`?
2. Difference between `Pick<T, K>` and `Omit<T, K>`?
3. What is `Record<K, V>`?
4. What do `Exclude` and `Extract` operate on?
5. What does `NonNullable<T>` remove?
6. What are `ReturnType<F>` and `Parameters<F>`?
7. What does `Awaited<T>` unwrap?
8. Are utility types available as runtime helpers?

## Explain why

1. Why derive DTOs with `Omit`/`Partial` instead of copying fields?
2. Why is `Partial` not deep by default?
3. Why compose `Partial<Omit<User, …>>` for PATCH rather than `Partial<User>` alone?
4. Why use `ReturnType<typeof fn>` instead of redeclaring the return interface?
5. Why doesn’t `Omit` remove a union member from `A | B | C`?
6. Why still use class-validator if DTOs are typed with utilities?

## Compare and contrast

1. `Pick` vs `Omit`
2. `Exclude` vs `Omit`
3. `Partial<T>` vs making each field optional manually
4. `Record<string, V>` vs `Record<'a' | 'b', V>`
5. `NonNullable<T>` vs a truthiness guard’s effect on types
6. `Awaited<ReturnType<typeof f>>` vs hand-written resolved type

## Predict the output / checker result

What is the resulting type? Explain briefly.

1.
```ts
type U = { a: number; b: string };
type T = Partial<U>;
```

2.
```ts
type U = { a: number; b: string; c: boolean };
type T = Omit<U, 'b' | 'c'>;
```

3.
```ts
type S = 'a' | 'b' | 'c';
type T = Exclude<S, 'b'>;
```

4.
```ts
type T = NonNullable<string | null | undefined>;
```

5.
```ts
async function load(): Promise<{ id: string }> {
  return { id: '1' };
}
type T = Awaited<ReturnType<typeof load>>;
```

6.
```ts
type T = Record<'x' | 'y', number>;
const ok: T = { x: 1 }; // ?
```

7.
```ts
type User = { id: string; name: string };
type T = Readonly<User>;
const u: T = { id: '1', name: 'a' };
u.name = 'b'; // ?
```

## Debugging

1. PATCH type still allows `id`:
```ts
type Update = Partial<User>;
```

2. Create DTO still has `passwordHash` but needs `password`:
```ts
type Create = Omit<User, 'id' | 'createdAt'>;
```

3. Author writes `Omit<'a' | 'b' | 'c', 'b'>` expecting `'a' | 'c'`. What should they use?

4. `type R = ReturnType<typeof fetchUser>` is `Promise<User>` but they need `User`. Fix.

## Application

1. From `Product { id, name, price, internalCost, createdAt }`, write `ProductResponse`, `CreateProduct`, `UpdateProduct` types.

2. Write `type StatusMap = Record<…>` labeling `'idle' | 'loading' | 'error'`.

3. Given `type Ev = { type: 'click'; x: number } | { type: 'key'; key: string }`, derive only the click variant with a utility.

4. Wrap `function add(a: number, b: number): number` — type a proxy’s parameters with `Parameters` and return with `ReturnType`.

## Interview questions

1. Express a PATCH body for `User` that omits `id`, `createdAt`, `passwordHash` without duplicating fields.  
   **Follow-ups:** What if a new editable field is added to `User`?

2. When do you use `Pick` vs `Omit`?  
   **Follow-ups:** Nest response DTO example?

3. What is `Awaited` for? How do you combine it with `ReturnType`?

4. Difference between `Exclude` and `Omit`?  
   **Follow-ups:** Example of each.

5. Are `Partial` / `Readonly` deep? What does that mean in practice?

## Connections

1. How do utilities build on generics and `keyof`?
2. How does DTO derivation relate to Nest API design and erasure/validation?
3. How do `Exclude`/`Extract` connect to discriminated unions?
4. Why is the “mapped/conditional under the hood” note a bridge to the advanced chapter?
5. When would you hand-write a type instead of composing utilities?
