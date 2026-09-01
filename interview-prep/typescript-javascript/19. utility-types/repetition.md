# Utility Types — Next-day repetition

## How to use

1. Do **not** open `notes.md` first.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] What does `Partial<T>` do? `Required<T>`? `Readonly<T>`?
- [ ] Difference between `Pick<T, K>` and `Omit<T, K>`? Difference between `Exclude` and `Omit`?
- [ ] What are `ReturnType<F>` and `Parameters<F>`? What does `Awaited<T>` unwrap?
- [ ] Why derive DTOs with `Omit`/`Partial` instead of copying fields? Why is `Partial` not deep by default?
- [ ] Are utility types available as runtime helpers?

## Predict / debug

What is the resulting type? State the result and explain why.

- [ ]
```ts
type U = { a: number; b: string };
type T = Partial<U>;
```

- [ ]
```ts
type S = 'a' | 'b' | 'c';
type T = Exclude<S, 'b'>;
```

- [ ]
```ts
async function load(): Promise<{ id: string }> {
  return { id: '1' };
}
type T = Awaited<ReturnType<typeof load>>;
```

- [ ] PATCH type still allows `id`. Diagnose and fix:
```ts
type Update = Partial<User>;
```

- [ ] Author writes `Omit<'a' | 'b' | 'c', 'b'>` expecting `'a' | 'c'`. What should they use?

## Say it out loud

- [ ] Explain utility types in 30–60 seconds as if an interviewer asked.
- [ ] Express a PATCH body for `User` that omits `id`, `createdAt`, `passwordHash` without duplicating fields. Follow-ups: What if a new editable field is added to `User`?
- [ ] Difference between `Exclude` and `Omit`? Follow-ups: Example of each.
