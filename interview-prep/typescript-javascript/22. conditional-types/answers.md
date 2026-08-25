# Conditional Types — Answers

## Core recall

1. If `T` is assignable to `U`, the type is `X`; otherwise `Y`. Type-level if/else on assignability.

2. A conditional that, given a union `T`, evaluates **per member** and unions the outcomes (when `T` is a naked type parameter).

3. Distribution happens when the checked type is a bare type parameter like `T`. Wrapping (`[T]`, `T[]`, etc.) typically **disables** distribution.

4. Declares a new type variable inside an `extends` pattern that **captures** the matched piece for use in the true branch.

5. `T extends U ? never : T` (distribute; drop members assignable to `U`).

6. `F extends (...args: any[]) => infer R ? R : never`.

7. `T extends Promise<infer U> ? Awaited<U> : T` — keep unwrapping until not a Promise.

8. Wrap the check, e.g. `[T] extends [U] ? …` (or similar non-naked form).

## Explain why

1. Naked `T` distributes: `string[] | number[]`, not an array of the union.

2. `never` in a union is absorbed — `A | never` → `A` — so “delete member” = map it to `never`.

3. The function already states the return type; `infer` pulls it so aliases stay in sync when the function changes.

4. One unwrap leaves `Promise<string>`; recursion applies until the inner non-Promise type.

5. Built-ins cover most needs; custom conditionals add complexity/checker cost unless they remove real duplication (libs / shared derivations).

6. `[T]` is a single tuple type, not a naked `T`, so the union is tested as one unit → one `T[]`-shaped result.

## Compare and contrast

1. **Conditional types:** compile-time only, erased. **JS ternary:** runtime values.

2. **Distributive:** per union member. **Non-distributive:** whole union at once.

3. **Exclude:** filters union members. **Omit:** removes object keys.

4. **`infer`:** local binding from a matched pattern. **Alias type params:** declared up front on the type (`<T, U>`); `infer` appears inside the `extends` clause when decomposing a shape.

5. **Built-in `ReturnType`:** standard, handles many cases. **One-off conditional:** only when you need a different pattern; usually worse.

6. **Extract:** type-level keep members. **Value narrowing:** runtime checks + CFA — different stage, similar “filter alternatives” idea.

## Predict the output / resulting type

1. **`'no'`.** Left side is the union type `string | number` as a whole (not a naked param distributing). That union is not assignable to `string`.

2. **`'a'[] | 'b'[]`** (i.e. literal array unions) — distribution over `'a' | 'b'`.

3. **`boolean`**

4. **`'x' | 'z'`**

5. **`Promise<number>`** — `infer R` is the declared return type, still a Promise (use `Awaited` to unwrap).

6. **`Promise<string>`** — only one unwrap; inner still Promise.

7. **`'other'`** — `[string | number]` is not assignable to `[string]` (tuple of union vs tuple of string); distribution off.

## Debugging

1. Disable distribution: `type ToArray<T> = [T] extends [any] ? T[] : never` (or `[T] extends [infer _] ? T[] : never` patterns) so result is `(string | number)[]`.

2. Check whether `typeof fn` refers to the right overload/value; simplify with an explicit interface; sometimes annotate the function or use a specific overload signature type.

3. Recursive conditional without a clear base case / always matching Promise-like pattern — ensure false branch bottoms out at non-matching `T`.

4. `T extends { id: infer Id } ? Id : never` captures whatever `id`’s type is (`string` or `number`).

## Application

1.
```ts
type MyNonNullable<T> = T extends null | undefined ? never : T;
```

2.
```ts
type UnwrapArray<T> = T extends (infer U)[] ? U : T;
```

3.
```ts
type PropType<T, K extends string> = T extends { [P in K]: infer V } ? V : never;
// or: K extends keyof T ? T[K] : never
```

4.
```ts
async function fetchUser() {
  return { id: '1' };
}
type User = Awaited<ReturnType<typeof fetchUser>>;
```

5.
```ts
type MyExtract<T, U> = T extends U ? T : never;
type T = MyExtract<'a' | 'b', 'a'>; // 'a'
```

## Interview questions

1. **Spoken:** “`infer` binds a matched part of a type in a conditional. `ReturnType` uses `infer R` on the function’s return. I use `Awaited<ReturnType<typeof service.method>>` so response types track the service.”  
   **Follow-ups:** `Awaited` recurses `Promise<infer U>`; Nest services same pattern.

2. **Spoken:** “Naked `T` in `T extends …` maps over each union member. That’s how `Exclude` works. Wrap as `[T]` to treat the union as one.”

3. **Spoken:** “Recursive `T extends Promise<infer U> ? Awaited<U> : T` until not a Promise — or use built-in `Awaited`.”

4. **Spoken:** “Prefer built-ins; custom when deriving shared library types or removing real duplication — not for one-line DTOs.”

5. **Spoken:** “Assignability: can values of type `T` be used where `U` is expected?”

## Connections

1. Utilities are thin aliases over conditionals/mapped types — this unit is their engine.

2. Distribution = type-level filter/map over union variants (same family as Exclude on status unions).

3. Mapped types often use `T[K] extends … ? …` conditionals for modifiers (e.g. optional only some keys) — next unit.

4. Derive static DTOs from functions; still validate at runtime because of erasure.

5. Generic constraints `T extends Foo` use the same assignability relation as the `?` test in conditionals.
