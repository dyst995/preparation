# `type` vs `interface` — Self-test

## Core recall

1. Name three capabilities `type` has that `interface` does not.
2. What is declaration merging?
3. Can `type` aliases declaration-merge?
4. How do you compose object shapes with `interface`? With `type`?
5. Do excess property checks apply only to `interface`?
6. Can a class `implements` a `type` alias of an object shape?
7. Give one real-world reason to prefer `interface` over `type`.
8. Give one real-world reason to prefer `type` over `interface`.

## Explain why

1. Why does declaration merging exist, and who benefits?
2. Why can’t you express `A | B` as an `interface` name?
3. Why is “interfaces are faster” a weak primary interview answer?
4. Why might Nest auth typing use an interface merge on `Request` instead of casting `req as any`?
5. Why are `interface` and `type` interchangeable for many plain DTOs?
6. Why does redeclaring `type Foo = …` twice fail while two `interface Foo` blocks succeed?

## Compare and contrast

1. `interface extends` vs `type` intersection (`&`).
2. Declaration merging vs intersecting two type aliases manually.
3. Choosing `interface` vs `type` for a React props object vs for a `Success | Error` result.
4. `implements Interface` vs `implements ObjectTypeAlias`.
5. Augmenting a library interface vs wrapping it in your own `type MyRequest = Request & { user: User }`.

## Predict the output / checker result

Does it compile? What is the resulting type? Explain why.

1.
```ts
interface A {
  x: number;
}
interface A {
  y: string;
}
const v: A = { x: 1, y: 'a' };
```

2.
```ts
type A = { x: number };
type A = { y: string };
```

3.
```ts
type Id = string;
interface Id {
  value: string;
}
```

4.
```ts
interface Point {
  x: number;
  y: number;
}
const f = (p: Point) => {};
f({ x: 1, y: 2, z: 3 });
```

5.
```ts
type Point = { x: number; y: number };
const f = (p: Point) => {};
f({ x: 1, y: 2, z: 3 });
```

6.
```ts
type Result = { ok: true } | { ok: false };
interface Result {
  ok: boolean;
}
```

## Debugging

1. Diagnose:
```ts
type Request = { headers: Headers };
type Request = { user: User }; // author wanted to add user
```

2. Teammate insists on `interface Status = 'on' | 'off'`. What’s wrong? Fix.

3. Diagnose augmentation that “does nothing”:
```ts
// in a random .ts file
interface Request {
  user: User;
}
// Express req.user still errors
```

4. Diagnose:
```ts
interface A {
  x: number;
}
interface B extends A {
  x: string; // ?
}
```

## Application

1. Model `ApiResult<T>` as either success with `data: T` or failure with `error: string` — choose `type` or `interface` and justify.

2. Write a sketch of Express/Nest `Request` augmentation adding `user: { id: string }`.

3. Convert an `interface` hierarchy (`Animal` → `Dog`) into `type` + `&` form.

4. Given a need for `Readonly<Partial<T>>`-style mapping, explain why that forces `type` (or utility types based on `type`).

## Interview questions

1. Give a concrete reason to prefer `interface` over `type`, beyond convention.  
   **Follow-ups:** Nest/Express example? Can `type` do the same?

2. When do you choose `type` instead?  
   **Follow-ups:** Unions? Mapped types?

3. What is declaration merging?  
   **Follow-ups:** Global vs module augmentation?

4. Are `interface` and `type` the same for object shapes?  
   **Follow-ups:** Excess property checks? `implements`?

5. What’s your default in a new Nest or React codebase, and why?

## Connections

1. How does this unit sit on structural typing from the previous unit?
2. How does erasure still apply equally to `interface` and `type`?
3. How does declaration merging relate to adapting third-party JS libraries to TypeScript?
4. When would wrapping `Request & { user: User }` be preferable to merging, and what do you lose?
5. How do utility types (`Partial`, `Pick`, …) push you toward `type` aliases even if DTOs are interfaces?
