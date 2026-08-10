# 06. Utility types

> Source: `interview-prep/typescript-javascript/03-typescript-core.md`

### Topics to learn
- [ ] `Partial<T>`, `Required<T>`
- [ ] `Readonly<T>`
- [ ] `Pick<T, K>`, `Omit<T, K>`
- [ ] `Record<K, V>`
- [ ] `Exclude<T, U>`, `Extract<T, U>`
- [ ] `NonNullable<T>`
- [ ] `ReturnType<F>`, `Parameters<F>`
- [ ] `Awaited<T>`
- [ ] Knowing these are built with mapped/conditional types under the hood (bridges to chapter 4)

### Quick reference

| Utility | What it does | Typical use |
|---|---|---|
| `Partial<T>` | all properties optional | PATCH endpoint bodies, partial form updates |
| `Required<T>` | all properties required | ensuring a config object is fully filled in |
| `Readonly<T>` | all properties `readonly` | immutable state shapes, Redux-style state |
| `Pick<T, K>` | keep only keys `K` | narrow a large DTO down to a form's fields |
| `Omit<T, K>` | drop keys `K` | DTO minus server-generated fields (`id`, `createdAt`) |
| `Record<K, V>` | object type with keys `K`, values `V` | lookup maps, e.g. `Record<UserId, User>` |
| `Exclude<T, U>` | remove union members assignable to `U` | strip one variant out of a union |
| `Extract<T, U>` | keep only union members assignable to `U` | pull one variant out of a union |
| `NonNullable<T>` | remove `null`/`undefined` from `T` | after a guard, express "definitely has a value" |
| `ReturnType<F>` | the return type of function type `F` | derive a type from an existing function instead of duplicating it |
| `Parameters<F>` | tuple of a function's parameter types | wrapping/proxying functions generically |
| `Awaited<T>` | unwraps nested Promise types | getting the resolved value type of an async function |

### Practical example - DTO derivation (ties directly to NestJS)

```ts
interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

// API response should never leak the password hash
type UserResponseDto = Omit<User, 'passwordHash'>;

// Creating a user - id and createdAt are server-generated
type CreateUserDto = Omit<User, 'id' | 'createdAt' | 'passwordHash'> & { password: string };

// Updating a user - everything optional except we still forbid changing certain fields
type UpdateUserDto = Partial<Omit<User, 'id' | 'createdAt' | 'passwordHash'>>;
```

This pattern - deriving request/response DTOs from a single source-of-truth entity type using `Omit`/`Partial`/`Pick` - is exactly what shows up in real NestJS codebases and is a strong thing to bring up unprompted when discussing API design.

### Interview question

**Q: You have a `User` entity type with 15 fields. You need a type for a PATCH endpoint body where any subset of user-editable fields can be updated, but `id`, `createdAt`, and `passwordHash` should never be settable. How do you express that without duplicating the 15 fields?**

**Strong answer:**
> "`type UpdatableUserFields = Partial<Omit<User, 'id' | 'createdAt' | 'passwordHash'>>`. `Omit` removes the fields that should never be client-settable, and `Partial` then makes every remaining field optional so a PATCH body can include any subset. This keeps a single source of truth - if a new field is added to `User`, this derived type picks it up automatically instead of needing to be maintained in two places."

---
