# 10. Hands-on drills (do these)

> Source: `interview-prep/typescript-javascript/03-typescript-core.md`

- [ ] Write a discriminated union for a network request state (`idle | loading | success | error`) and a `render` function with exhaustiveness checking via `never`.
- [ ] Write a generic `pluck<T, K extends keyof T>(items: T[], key: K): T[K][]` function and call it against an array of objects.
- [ ] Derive `CreateUserDto`, `UpdateUserDto`, and `UserResponseDto` from a single `User` entity type using `Omit`/`Partial`/`Pick`.
- [ ] Write a custom type predicate `isNonNullable<T>(value: T): value is NonNullable<T>` and use it to filter `null`/`undefined` out of an array with correct resulting type.
- [ ] Take a function typed with `any` parameters and refactor it to use `unknown` plus explicit narrowing.
- [ ] Rewrite an `enum Role { Admin, Editor, Viewer }` as a union-of-string-literals plus an `as const` object, and update all usages.
- [ ] Implement a tiny generic `Result<T, E>` type (`{ ok: true, value: T } | { ok: false, error: E }`) and a function that returns it instead of throwing.

---
