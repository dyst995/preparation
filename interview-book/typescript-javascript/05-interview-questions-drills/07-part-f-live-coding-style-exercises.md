# 07. Part F - Live-coding-style exercises

> Source: `interview-prep/typescript-javascript/05-interview-questions-drills.md`

Do these in a real editor/REPL, out loud, narrating your reasoning as you would in an interview.

1. **Implement `debounce(fn, delay)`** using closures, so rapid calls only trigger `fn` once, `delay` ms after the last call.
2. **Implement `Function.prototype.myBind`** using `apply`/`call` and a closure over the bound arguments.
3. **Implement a `once(fn)` higher-order function** that runs `fn` at most once, caching and returning the first result on subsequent calls.
4. **Implement a concurrency-limited async batch runner**: `runLimited(tasks: (() => Promise<T>)[], limit: number): Promise<T[]>`.
5. **Implement a typed `Result<T, E>` type** (`{ ok: true, value: T } | { ok: false, error: E }`) and a `safeParseJson<T>(input: string): Result<T, Error>` function that never throws.
6. **Implement a generic `groupBy<T, K extends string | number>(items: T[], keyFn: (item: T) => K): Record<K, T[]>`.**
7. **Implement a small `useAsync<T>` React hook** returning a discriminated-union state (`idle | loading | success | error`) plus a `run()` function, with race-condition protection (ignore stale responses).
8. **Write `CreateUserDto`/`UpdateUserDto`/`UserResponseDto`** for a `User` entity using utility types and `class-validator` decorators, and explain out loud why each is shaped the way it is.
9. **Implement `DeepReadonly<T>`** as a recursive mapped type, and verify it against a 2-level nested object.
10. **Reproduce and then fix a stale-response race condition** in a small search-as-you-type function using `AbortController`.

---
