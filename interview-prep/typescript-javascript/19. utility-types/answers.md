# Utility Types — Answers

## Core recall

1. **`Partial`:** every property optional. **`Required`:** every property required. **`Readonly`:** every property `readonly`.

2. **`Pick`:** keep only listed keys. **`Omit`:** drop listed keys, keep the rest.

3. An object type whose keys are `K` and whose property type is `V` — e.g. a dictionary / exhaustive label map.

4. **Unions** — they keep or remove union members by assignability, not object keys.

5. **`null` and `undefined`** from the type.

6. **`ReturnType`:** function’s return type. **`Parameters`:** tuple of parameter types.

7. Nested **`Promise`** wrappers until the resolved value type.

8. **No** — they exist only in the type system (erased at emit).

## Explain why

1. One entity definition; variants stay in sync when fields change; less copy-paste drift.

2. Mapped `Partial` only adds `?` on top-level keys; nested object types are left unchanged unless you write a deep mapped type.

3. `Partial<User>` still allows patching `id` / secrets. **`Omit` first** removes forbidden keys, then **`Partial`** makes the rest optional.

4. The function already defines the shape; `ReturnType` tracks changes automatically and avoids a second hand-maintained interface.

5. **`Omit` is for object keys.** Union members aren’t keys — use **`Exclude`** (or `Extract`) on unions.

6. Utilities don’t run at runtime. HTTP JSON still needs **validators**; types only check typed code paths.

## Compare and contrast

1. **Pick** = allowlist. **Omit** = denylist. Use Pick for small subsets; Omit for “all but a few.”

2. **Exclude** = filter union members. **Omit** = remove properties from an object type.

3. **Partial** is one expression and stays tied to `T`. Manual optionals duplicate and drift.

4. **`Record<string, V>`:** open-ended keys. **`Record<'a' \| 'b', V>`:** required specific keys (exhaustiveness-friendly).

5. **`NonNullable`:** type-level removal of nullish. **Truthiness guard:** runtime + CFA narrowing (also drops falsy values if you use `if (x)`).

6. **Combined utilities** track the async function. Hand-written types can diverge when the function changes.

## Predict the output / checker result

1. `{ a?: number; b?: string }`

2. `{ a: number }`

3. `'a' | 'c'`

4. `string`

5. `{ id: string }`

6. **Error** — `y` is required on `Record<'x' | 'y', number>`; missing `y`.

7. **Error** — `name` is `readonly` on `T`; cannot assign.

## Debugging

1. Use `Partial<Omit<User, 'id' | …>>` so `id` isn’t in the patch type.

2. `Omit<User, 'id' | 'createdAt' | 'passwordHash'> & { password: string }` — drop hash, add plain password.

3. Use **`Exclude<'a' | 'b' | 'c', 'b'>`**, not `Omit`.

4. `type R = Awaited<ReturnType<typeof fetchUser>>` (or `ReturnType` if they meant the Promise and nested unwrap).

## Application

1. Example:
```ts
type ProductResponse = Omit<Product, 'internalCost'>;
type CreateProduct = Omit<Product, 'id' | 'createdAt' | 'internalCost'>;
type UpdateProduct = Partial<CreateProduct>;
```

2. Example: `type StatusMap = Record<'idle' | 'loading' | 'error', string>;`

3. `type Click = Extract<Ev, { type: 'click' }>;`

4. Example:
```ts
type AddArgs = Parameters<typeof add>;
type AddReturn = ReturnType<typeof add>;
function proxy(...args: AddArgs): AddReturn {
  return add(...args);
}
```

## Interview questions

1. **Spoken:** “`Partial<Omit<User, 'id' | 'createdAt' | 'passwordHash'>>`. Omit locks server/secret fields; Partial makes the rest optional for PATCH. New editable fields on `User` flow in automatically.”  
   **Follow-ups:** Adding `nickname` to `User` updates the PATCH type without editing the alias body.

2. **Spoken:** “Pick when naming a small allowlist; Omit when subtracting a few fields from a large type — e.g. `Omit<User, 'passwordHash'>` for responses.”

3. **Spoken:** “Unwraps Promise types, including nested. `Awaited<ReturnType<typeof load>>` is the resolved value of an async function.”

4. **Spoken:** “Exclude filters unions; Omit removes object keys. `Exclude<Status, 'idle'>` vs `Omit<User, 'id'>`.”

5. **Spoken:** “No — only top-level. Nested objects aren’t recursively Partial/Readonly; need custom deep helpers if required. Runtime objects aren’t frozen by the type alone.”

## Connections

1. They’re generic aliases using **`keyof` / mapped / conditional** patterns from the generics foundation.

2. Derive Nest create/update/response types from one entity; still validate at runtime because of erasure.

3. `Extract`/`Exclude` pull or drop variants — same union algebra as tagged state machines.

4. Reading `type Partial<T> = { [K in keyof T]?: T[K] }` motivates learning mapped types formally in advanced TS.

5. Hand-write when the derived form is misleading, needs branding, deep transforms utilities don’t provide, or documentation clarity beats clever composition.
