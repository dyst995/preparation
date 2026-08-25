# Generics — Answers

## Core recall

1. **Reuse one implementation while keeping call-site-specific types** — unlike `any`, which erases those relationships.

2. A placeholder type (e.g. `T`) declared on a function/type/class. Inference usually comes from **argument types** at the call site.

3. **`T` must be assignable to `Foo`** — you may use `Foo`’s members inside the generic, and callers must pass compatible values.

4. The union of `T`’s property names (as string/number/symbol literal types as applicable), e.g. `'name' | 'age'`.

5. The type of the property `K` on `T` — e.g. if `K` is `'age'`, `T[K]` might be `number`.

6. A type parameter with a fallback when not specified/inferred, e.g. `<T = string>`.

7. **No** — `T` is erased; there is no runtime value named `T` to test.

8. **`K extends keyof T`:** only real keys allowed. **`T[K]`:** return type is that property’s type, not `any`.

## Explain why

1. Callers get `number | undefined` vs `string | undefined` automatically; with `any`, every use is unchecked.

2. The constraint promises `.name: string` exists, so the body can legally read it.

3. Returning `T` keeps extra properties (e.g. `age`) for the caller; typing as only `{ name: string }` **widens** and loses them.

4. Construction needs a **runtime** constructor function. The type parameter alone doesn’t exist at runtime to `new`.

5. `fn` returns `Promise<User>`, so `T` is inferred as `User`; success state’s `data: T` becomes `User`.

6. DI resolves **runtime tokens/classes**. An unbound `T` isn’t a token; you inject concrete `UserRepository` (or a concrete factory), not “open” `Repository<T>`.

## Compare and contrast

1. **Generics:** preserve relationships. **`any`:** opts out of checking.

2. **Generics:** one implementation, infinite types. **Overloads:** fixed list of signatures; verbose, doesn’t scale.

3. **`T extends Foo` + return `T`:** keeps specific type. **Param `Foo`:** accepts Foo-shaped values but often types them only as `Foo`.

4. **Explicit `<User>`:** when inference can’t see enough. **Inference:** preferred when args carry the type.

5. **Interface:** extendable/mergeable object APIs (`Repository<T>`). **Type alias:** unions/mapped wrappers (`ApiResponse<T> = …`). Both can be generic.

6. **`string`/`any`:** typos allowed, return useless. **`keyof`/`T[K]`:** typos fail; return precise.

## Predict the output / checker result

1. **`a`:** `number | undefined`. **`b`:** `string | undefined`. `T` inferred from element type.

2. **Compile error** — `'y'` not in `keyof { x: number }`.

3. **Compile error** — unconstrained `T` has no `.name`.

4. **OK** — returns `string`; argument still accepted with extra `age` (structural).

5. **`A`** is `{ value: string }` (default). **`B`** is `{ value: number }`.

6. **`n`** is `1 | 'a'` or `number | string` depending on widening — generally a **union** of the two branches’ types as `T`.

## Debugging

1. **`any` destroyed element types.** Use `<A, B>(a: A, b: B): [A, B]` or `as const` tuple typing via generics.

2. **No inferrence source** — `T` often becomes `unknown` (or errors depending on settings). Pass `emptyArr<number>()` or seed from a value.

3. **`T` isn’t a runtime constructor.** Take `Ctor: new () => T` and `new Ctor()`.

4. Likely signature didn’t tie `T` to `fn`’s return — e.g. `useAsync(fn: () => Promise<unknown>)` or missing `<T>` on the hook / state. Fix: `useAsync<T>(fn: () => Promise<T>)` and `data: T` in success.

## Application

1.
```ts
function lastElement<T>(arr: readonly T[]): T | undefined {
  return arr[arr.length - 1];
}
```

2.
```ts
function pluck<T, K extends keyof T>(rows: T[], key: K): T[K][] {
  return rows.map((r) => r[key]);
}
```

3.
```ts
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

function map<T, U, E>(r: Result<T, E>, f: (t: T) => U): Result<U, E> {
  return r.ok ? { ok: true, value: f(r.value) } : r;
}
```

4.
```ts
function Select<T extends { id: string }>(props: {
  items: T[];
  onSelect: (item: T) => void;
}) {
  /* map items, call onSelect(item) — item stays T */
}
```

5. Signatures:
```ts
interface Repository<T, ID> {
  findById(id: ID): Promise<T | null>;
  save(entity: T): Promise<T>;
}
```

## Interview questions

1. **Spoken:** “Keys must be real properties of `obj`, and the return type is exactly that field’s type — not `any`. Typos and misuse fail at compile time.”  
   **Follow-ups:** `keyof T` is key union; `T[K]` indexes that property type.

2. **Spoken:** “Type parameters for reusable functions/types that stay specific per call — lists, repos, hooks — with inference and `extends` constraints when you need members.”

3. **Spoken:** “`useAsync<T>(fn: () => Promise<T>)` with a discriminated state where success holds `data: T` — `T` inferred from `fn`.”  
   **Follow-ups:** `T` appears in success variant and in `setState` payloads.

4. **Spoken:** “`Repository<T, ID>` abstracts CRUD; `UserRepository` binds `T=User`, `ID=string`. Runtime DI uses the concrete class.”

5. **Spoken:** “No `new T`, no `instanceof T`, no reflecting on `T` — pass constructors or tokens as values.”

## Connections

1. Each instantiation produces a concrete structural type that assignability still checks as usual.

2. `T` parameterizes the **success** branch’s `data`; the tag union models async status.

3. Both prevent illegal property access — narrowing at values, `keyof` at type-level keys.

4. `Partial`/`Pick` are generic mapped types built on `keyof` / `T[K]` ideas — next step in expressiveness.

5. Same as classes: type-world `T` vs value-world constructor/token you actually `new` or inject.
