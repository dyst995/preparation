# Utility Types

## What you need to know

TypeScript’s **utility types** are built-in generic types that transform other types: make fields optional, pick keys, unwrap Promises, etc. They keep a **single source of truth** (entity/DTO) and derive variants instead of duplicating 15 fields by hand.

Under the hood they are mostly **mapped and conditional types** (advanced chapter). This unit focuses on **fluent use** and Nest-style DTO derivation.

Prerequisite: [Generics](../18.%20generics/notes.md) (`keyof`, `T[K]`).

Curriculum checklist:

- `Partial` / `Required` / `Readonly`
- `Pick` / `Omit` / `Record`
- `Exclude` / `Extract` / `NonNullable`
- `ReturnType` / `Parameters` / `Awaited`
- Awareness they are mapped/conditional under the hood

---

## Why utility types exist

Without them you’d rewrite shapes for every API variant (create vs update vs response). With them:

```ts
type UpdateUserDto = Partial<Omit<User, 'id' | 'createdAt' | 'passwordHash'>>;
```

Add a field to `User` → derived DTOs pick it up (unless you omitted it).

---

## Quick reference (preserved)

| Utility | What it does | Typical use |
|---|---|---|
| `Partial<T>` | all properties optional | PATCH bodies, partial forms |
| `Required<T>` | all properties required | fully filled config |
| `Readonly<T>` | all properties `readonly` | immutable state shapes |
| `Pick<T, K>` | keep only keys `K` | form subset of a DTO |
| `Omit<T, K>` | drop keys `K` | strip `id` / secrets |
| `Record<K, V>` | keys `K`, values `V` | dictionaries / maps |
| `Exclude<T, U>` | union minus members assignable to `U` | strip a variant |
| `Extract<T, U>` | union keeping members assignable to `U` | pull a variant |
| `NonNullable<T>` | remove `null` \| `undefined` | after a guard |
| `ReturnType<F>` | return type of function type `F` | derive from existing fn |
| `Parameters<F>` | parameter tuple of `F` | wrappers / proxies |
| `Awaited<T>` | unwrap Promise (nested) | async fn resolved type |

---

## Object transformers

### `Partial<T>` / `Required<T>`

```ts
type User = { id: string; name: string };
type UserPatch = Partial<User>; // { id?: string; name?: string }
type Full = Required<{ a?: string; b?: number }>; // { a: string; b: number }
```

`Partial` is shallow — nested objects are not deeply optional. Deep partial needs a custom mapped type (advanced).

### `Readonly<T>`

```ts
type ImmutableUser = Readonly<User>;
// ImmutableUser has readonly id, readonly name
```

Also shallow. Prevents reassignment of properties on that type (not deep immutability at runtime — still erasure).

### `Pick<T, K>` / `Omit<T, K>`

```ts
type NameOnly = Pick<User, 'name'>;
type WithoutId = Omit<User, 'id'>;
```

`K` must be (or extend) `keyof T` for `Pick`. `Omit` is the practical “everything except…”.

**Prefer `Omit` for “entity minus server fields”; prefer `Pick` when the allowlist is short and explicit.**

### `Record<K, V>`

```ts
type UserMap = Record<string, User>;
type StatusLabel = Record<'loading' | 'success' | 'error', string>;
```

Keys become a required property set when `K` is a literal union — good for exhaustive maps (pair with satisfies/`Record` + discriminant unions).

---

## Union transformers

### `Exclude<T, U>` / `Extract<T, U>`

Work on **unions** (distribute over members):

```ts
type Status = 'idle' | 'loading' | 'error';
type Active = Exclude<Status, 'idle'>; // 'loading' | 'error'
type OnlyIdle = Extract<Status, 'idle'>; // 'idle'
```

Also used on object unions with `Extract<Event, { type: 'click' }>`.

### `NonNullable<T>`

```ts
type T = string | null | undefined;
type U = NonNullable<T>; // string
```

Equivalent idea: `Exclude<T, null | undefined>`.

---

## Function / Promise transformers

### `ReturnType<F>` / `Parameters<F>`

```ts
function createUser(name: string, age: number) {
  return { name, age, id: crypto.randomUUID() };
}

type Created = ReturnType<typeof createUser>;
type Args = Parameters<typeof createUser>; // [string, number]
```

`F` must be a **function type** (often `typeof someFn`). Avoid duplicating the return interface by hand when a function already defines it.

### `Awaited<T>`

```ts
type User = Awaited<Promise<Promise<{ id: string }>>>; // { id: string }
type FromAsync = Awaited<ReturnType<typeof fetchUser>>;
```

Unwraps nested Promises; useful with `ReturnType` of `async` functions (`Promise<…>` → inner).

---

## Nest DTO derivation pattern (preserved)

```ts
interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

type UserResponseDto = Omit<User, 'passwordHash'>;

type CreateUserDto = Omit<User, 'id' | 'createdAt' | 'passwordHash'> & {
  password: string;
};

type UpdateUserDto = Partial<Omit<User, 'id' | 'createdAt' | 'passwordHash'>>;
```

**Interview answer (preserved):**

> `Partial<Omit<User, 'id' | 'createdAt' | 'passwordHash'>>` — `Omit` removes non-client-settable fields; `Partial` makes the rest optional for PATCH. New `User` fields flow into the DTO automatically.

Compose with `&` when you need to **add** fields (`password`) after omitting secrets.

**Runtime reminder:** these utilities are **types only**. Nest still needs `class-validator` / Zod for runtime validation — same erasure story.

---

## Composition tips

| Goal | Pattern |
|---|---|
| PATCH body | `Partial<Omit<Entity, LockedKeys>>` |
| Public response | `Omit<Entity, SecretKeys>` or `Pick<…>` |
| Create body | `Omit<Entity, ServerKeys>` `& { password: string }` |
| Resolve async fn | `Awaited<ReturnType<typeof fn>>` |
| Strip nullish | `NonNullable<T>` |
| Drop union member | `Exclude<Union, Member>` |

Order matters for readability: usually **Omit/Pick first**, then **Partial/Readonly**, then **`&` additions**.

---

## Under the hood (bridge to advanced)

Sketch only — don’t memorize full definitions yet:

```ts
type Partial<T> = { [K in keyof T]?: T[K] };
type Pick<T, K extends keyof T> = { [P in K]: T[P] };
type Exclude<T, U> = T extends U ? never : T;
```

Knowing this explains why utilities compose with `keyof` and unions, and why you’ll learn mapped/conditional types next.

---

## Common mistakes and misconceptions

1. **Expecting deep `Partial`** — nested objects stay as-is.  
2. **Thinking utilities exist at runtime** — erased; no `Partial(value)`.  
3. **`Omit` then forgetting `&` for replacement fields** (password vs passwordHash).  
4. **`Record<string, V>`** allowing any key — weaker than `Record<SpecificUnion, V>`.  
5. **`ReturnType` on an overloaded function** — may pick an unexpected overload signature.  
6. Duplicating DTOs by hand “because utilities are scary.”  
7. Confusing `Exclude` (unions) with `Omit` (object keys).

---

## Connections to other concepts

```
single entity type
  → Omit / Pick / Partial
    → create / update / response DTOs

keyof + mapped types
  → implementation of Partial/Pick
    → advanced chapter

Exclude/Extract
  → union algebra
    → pairs with discriminated unions

ReturnType / Awaited
  → derive types from functions/promises
    → less drift from implementation

erasure
  → still validate at runtime in Nest
```

---

## Interview perspective

You should be able to:

1. Name and describe the table of common utilities.  
2. Derive PATCH/create/response DTOs from one entity.  
3. Contrast `Omit` vs `Exclude`, `Partial` vs optional hand-writing.  
4. Use `ReturnType` / `Awaited` to avoid duplicate types.  
5. Admit utilities are shallow and type-only.

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
