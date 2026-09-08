# Generics — Self-test

## Core recall

1. What problem do generics solve that `any` does not?
2. What is a type parameter? Where does inference usually come from?
3. What does `T extends Foo` mean?
4. What is `keyof T`?
5. What is an indexed access type `T[K]`?
6. What is a default type parameter?
7. Can you `instanceof T` inside a generic function?
8. In `getProp`, what do `K extends keyof T` and `T[K]` buy you?

## Explain why

1. Why is `firstElement<T>(arr: T[]): T | undefined` better than returning `any`?
2. Why does constraining `T extends { name: string }` allow reading `.name`?
3. Why prefer returning `T` under a constraint instead of typing the parameter only as `{ name: string }`?
4. Why must a factory take `Ctor: new () => T` instead of only `<T>`?
5. Why does `useAsync(() => fetchUser())` type `data` as `User` on success?
6. Why can’t Nest “inject `Repository<T>`” with `T` unbound?

## Compare and contrast

1. Generics vs `any`
2. Generics vs function overloads
3. `T extends Foo` vs parameter typed as `Foo`
4. Explicit type argument vs inference
5. Generic interface vs generic type alias (when you’d use each — high level)
6. `key: string` + `any` return vs `K extends keyof T` + `T[K]`

## Predict the output / checker result

Inferred types / errors? Explain why.

1.
```ts
function first<T>(arr: T[]): T | undefined {
  return arr[0];
}
const a = first([1, 2]);
const b = first(['x']);
```

2.
```ts
function getProp<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}
getProp({ x: 1 }, 'y');
```

3.
```ts
function label<T>(x: T) {
  return x.name;
}
```

4.
```ts
function label<T extends { name: string }>(x: T) {
  return x.name;
}
label({ name: 'a', age: 1 });
```

5.
```ts
type Box<T = string> = { value: T };
type A = Box;
type B = Box<number>;
```

6.
```ts
function identity<T>(x: T): T {
  return x;
}
const n = identity(Math.random() > 0.5 ? 1 : 'a');
```

## Debugging

1. Diagnose:
```ts
function pair(a: any, b: any) {
  return [a, b];
}
const p = pair(1, 'a');
p[0].toFixed(1); // author thought p[0] was number
```

2. Diagnose inference fail / error:
```ts
function emptyArr<T>() {
  return [] as T[];
}
const xs = emptyArr();
xs.push(1); // ?
```

3. Diagnose:
```ts
function create<T>() {
  return new T();
}
```

4. React: `useAsync` always types `data` as `unknown` even when `fn` returns `Promise<User>`. What likely went wrong in the hook signature?

## Application

1. Write `lastElement<T>(arr: readonly T[]): T | undefined`.

2. Write `pluck<T, K extends keyof T>(rows: T[], key: K): T[K][]`.

3. Write a generic `Result<T, E = Error>` discriminated union and a `map` helper `map<T, U, E>(r: Result<T, E>, f: (t: T) => U): Result<U, E>`.

4. Sketch `function Select<T extends { id: string }>(props: { items: T[]; onSelect: (item: T) => void })`.

5. Implement `Repository<T, ID>` methods’ signatures for an in-memory fake (signatures enough; bodies optional).

## Interview questions

1. Why is `getProp<T, K extends keyof T>` better than `(obj: any, key: string) => any`?  
   **Follow-ups:** What are `keyof` and `T[K]`?

2. What are generics and when do you use them?  
   **Follow-ups:** Inference? Constraints?

3. How would you type a reusable async React hook that loads data?  
   **Follow-ups:** Where does `T` appear in state?

4. Explain a generic repository in Nest/TypeORM style.  
   **Follow-ups:** What exists at runtime for DI?

5. What can’t you do with `T` at runtime because of erasure?

## Connections

1. How do generics preserve information that structural typing then checks at each call site?
2. How does `useAsync<T>` combine generics with discriminated unions?
3. How does `K extends keyof T` relate to narrowing’s goal of “don’t allow illegal property access”?
4. Why are utility types like `Partial<T>` / `Pick<T, K>` natural next steps after this unit?
5. How does erasure link generics to the same “pass a runtime token” pattern as class constructors?
