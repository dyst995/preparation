# Mapped Types — Self-test

## Core recall

1. What is the basic syntax of a mapped type?
2. How do you make every property optional via a mapped type?
3. How do you remove optionality with a mapped modifier?
4. How do you add and remove `readonly` in a mapped type?
5. Rough one-line definitions of `Pick` and `Record` as mapped types?
6. What does key remapping `as` allow?
7. How can remapping to `never` filter keys?
8. Does `readonly` in a mapped type freeze the object at runtime?

## Explain why

1. Why isn’t `Partial` magic — and why does that matter in an interview?
2. Why use `-?` in `Required<T>` instead of only writing `T[K]`?
3. Why is `readonly` only a compile-time guarantee?
4. Why does `Getters` use `string & K` inside `Capitalize`?
5. Why combine mapped types with conditionals for “non-function props”?
6. Why are mapped types erased?

## Compare and contrast

1. Mapped types vs index signatures (`{ [key: string]: V }`)  
2. `Partial<T>` vs deep partial  
3. `Pick<T, K>` vs `Omit<T, K>` (implementation idea)  
4. Value mapping (`T[K]` → `boolean`) vs key remapping (`as …`)  
5. `Readonly<T>` vs `Object.freeze`  
6. Homomorphic map over `keyof T` vs `Record<K, V>` over arbitrary keys  

## Predict the output / resulting type

1.
```ts
type T = { a: string; b?: number };
type R = { [K in keyof T]-?: T[K] };
```

2.
```ts
type T = { a: string };
type R = { readonly [K in keyof T]: T[K] };
```

3.
```ts
type T = { a: number; b: string };
type R = { [K in keyof T]: boolean };
```

4.
```ts
type T = { name: string };
type R = { [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K] };
```

5.
```ts
type T = { a: 1; _h: 2 };
type R = { [K in keyof T as K extends `_${string}` ? never : K]: T[K] };
```

6.
```ts
type R = { [P in 'x' | 'y']: number };
```

## Debugging

1. `type ReadonlyDeep = Readonly<User>` still allows `user.address.city = …` where `address` is an object. Why?

2. Remapping fails to compile on `Capitalize<K>` when `K` can be `symbol`. Fix approach?

3. Author writes `{ [K in T]: V }` where `T` is a union of keys but forgets constraint — what error pattern?

4. Optional fields unexpectedly remain optional after a custom “Required” map missing `-?`.

## Application

1. Implement `MyPartial`, `MyRequired`, `MyReadonly`, `MyPick`.

2. Implement `MyOmit<T, K>` using `Pick` + `Exclude`.

3. Write `Setters<T>` remapping keys to `set${Capitalize<…>}` with `(value: T[K]) => void`.

4. Write `OptionalNullable<T>` that maps each `T[K]` to `T[K] | null` (values only).

5. Sketch `DeepReadonly<T>` recursively for object properties (note array caveat briefly).

## Interview questions

1. How would you implement `Readonly<T>`, and what does `readonly` prevent?  
   **Follow-ups:** Runtime? Nested objects?

2. How are `Partial` and `Required` implemented?  
   **Follow-ups:** What do `?` and `-?` mean?

3. Explain key remapping with `as`.  
   **Follow-ups:** How do you filter keys?

4. How would you implement `Pick`? `Record`?

5. When do you combine mapped types with conditional types?

## Connections

1. How do mapped types explain the utility-types unit “from the inside”?
2. How does `keyof` / indexed access feed mapped types?
3. How do conditionals + `never` keys relate to remapping filters?
4. How might Nest DTO derivation (`Partial<Omit<…>>`) be understood as composing maps?
5. Why doesn’t a mapped type replace runtime validation (erasure)?
